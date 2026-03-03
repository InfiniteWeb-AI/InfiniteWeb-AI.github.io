/* Test runner for municipal nursery & daycare business logic */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
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
    // Generated Data from prompt (used ONLY here)
    const generatedData = {
      activity_centers: [
        {
          id: 'central_family_center',
          name: 'Central Family Activity Center',
          district: 'central',
          address: '10 Civic Plaza, Central District',
          isNurseryCenter: false,
          description: 'A municipal family hub offering afternoon play sessions, parenting workshops, and summer activities for children aged 0–6.'
        },
        {
          id: 'downtown_early_learning_hub',
          name: 'Downtown Early Learning Hub',
          district: 'downtown',
          address: '220 Market Street, Downtown',
          isNurseryCenter: true,
          description: 'A combined nursery and activity hub with themed holiday programs, language workshops, and arts activities for toddlers and preschoolers.'
        },
        {
          id: 'north_play_and_learn_center',
          name: 'North Play & Learn Center',
          district: 'north',
          address: '85 Pine Ridge Road, North District',
          isNurseryCenter: true,
          description: 'A neighborhood nursery center that also hosts afternoon creative clubs, outdoor play sessions, and school‑holiday programs.'
        }
      ],
      calendar_days: [
        {
          id: 'cal_2025-07-01',
          date: '2025-07-01T00:00:00Z',
          status: 'closed',
          note: 'Municipal holiday: Summer Opening Day – nurseries closed.'
        },
        {
          id: 'cal_2025-07-02',
          date: '2025-07-02T00:00:00Z',
          status: 'open',
          note: 'Regular service.'
        },
        {
          id: 'cal_2025-07-03',
          date: '2025-07-03T00:00:00Z',
          status: 'open',
          note: 'Regular service.'
        }
      ],
      home_locations: [
        {
          id: 'home_default',
          address: '125 Maple Street, Central District',
          latitude: 40.7128,
          longitude: -74.006,
          createdAt: '2025-01-15T09:30:00Z'
        }
      ],
      activities: [
        {
          id: 'act_north_art_afternoon_2025-07-08',
          centerId: 'north_play_and_learn_center',
          name: 'Creative Art Club (4–5 years)',
          description: 'Small-group arts and crafts session focusing on painting, collage, and fine-motor skills for preschoolers.',
          date: '2025-07-08T00:00:00Z',
          startTime: '15:30',
          endTime: '17:30',
          timeOfDay: 'afternoon',
          pricePerSession: 18,
          currency: 'EUR',
          ageMinYears: 4,
          ageMaxYears: 5
        },
        {
          id: 'act_north_sports_afternoon_2025-07-15',
          centerId: 'north_play_and_learn_center',
          name: 'Outdoor Games & Sports (4–5 years)',
          description: 'Active outdoor play with simple team games, obstacle courses, and ball skills in the center playground.',
          date: '2025-07-15T00:00:00Z',
          startTime: '16:00',
          endTime: '18:00',
          timeOfDay: 'afternoon',
          pricePerSession: 20,
          currency: 'EUR',
          ageMinYears: 4,
          ageMaxYears: 5
        },
        {
          id: 'act_central_stem_afternoon_2025-07-10',
          centerId: 'central_family_center',
          name: 'STEM Explorers (4–5 years)',
          description: 'Hands-on science and building activities with magnets, simple circuits, and block structures.',
          date: '2025-07-10T00:00:00Z',
          startTime: '15:15',
          endTime: '17:15',
          timeOfDay: 'afternoon',
          pricePerSession: 28,
          currency: 'EUR',
          ageMinYears: 4,
          ageMaxYears: 5
        }
      ],
      nurseries: [
        {
          id: 'central_maple_nursery',
          name: 'Maple Street Central Nursery',
          district: 'central',
          address: '130 Maple Street, Central District',
          latitude: 40.7137,
          longitude: -74.0055,
          ratingAverage: 4.3,
          ratingCount: 87,
          opensByTimeWeekday: '07:00',
          hasFullDayCare: true,
          hasHalfDayCare: true,
          acceptedAgeMinMonths: 6,
          acceptedAgeMaxMonths: 60,
          baseMonthlyFee: 590,
          currency: 'EUR',
          hasLargeOutdoorPlayground: false,
          hasNutFreeMenu: true,
          hasLactoseFreeOptions: true,
          mealsDescription: 'We provide a seasonal rotating menu prepared in a central municipal kitchen. All meals are nut-free, and lactose-free alternatives (plant-based milks and yogurts) are available on request.',
          facilitiesDescription: 'Bright classrooms, indoor soft-play corner, reading nook, and access to a shared courtyard play area.',
          openingHoursDescription: 'Open Monday–Friday, 07:00–18:00. Closed weekends and public holidays.',
          distanceFromHomeKm: 0.10858654305129194
        },
        {
          id: 'central_budget_nursery',
          name: 'Central Budget-Friendly Nursery',
          district: 'central',
          address: '22 Oak Lane, Central District',
          latitude: 40.7115,
          longitude: -74.004,
          ratingAverage: 4,
          ratingCount: 54,
          opensByTimeWeekday: '07:30',
          hasFullDayCare: true,
          hasHalfDayCare: false,
          acceptedAgeMinMonths: 12,
          acceptedAgeMaxMonths: 60,
          baseMonthlyFee: 480,
          currency: 'EUR',
          hasLargeOutdoorPlayground: false,
          hasNutFreeMenu: true,
          hasLactoseFreeOptions: false,
          mealsDescription: 'Simple, nutritious lunches and snacks with a standard nut-free policy. Dairy is included in the regular menu.',
          facilitiesDescription: 'Two age-group rooms, indoor mini-gym area, and a small shaded courtyard.',
          openingHoursDescription: 'Open Monday–Friday, 07:30–17:30. Closed weekends and municipal holidays.',
          distanceFromHomeKm: 0.22206247592646064
        },
        {
          id: 'central_green_park_nursery',
          name: 'Green Park Central Nursery',
          district: 'central',
          address: '5 Parkside Way, Central District',
          latitude: 40.7145,
          longitude: -74.0075,
          ratingAverage: 4.8,
          ratingCount: 132,
          opensByTimeWeekday: '07:15',
          hasFullDayCare: true,
          hasHalfDayCare: true,
          acceptedAgeMinMonths: 6,
          acceptedAgeMaxMonths: 72,
          baseMonthlyFee: 540,
          currency: 'EUR',
          hasLargeOutdoorPlayground: true,
          hasNutFreeMenu: true,
          hasLactoseFreeOptions: true,
          mealsDescription: 'Freshly prepared lunches emphasizing vegetables and whole grains. All meals are nut-free, with lactose-free dairy alternatives available for children with documented intolerance.',
          facilitiesDescription: 'Large fenced outdoor playground with climbing frames and sandbox, indoor movement room, and art studio corner.',
          openingHoursDescription: 'Open Monday–Friday, 07:15–18:00. Reduced hours (08:00–16:00) during some school holidays.',
          distanceFromHomeKm: 0.2274119003134863
        }
      ],
      nursery_fee_schedules: [
        {
          id: 'fee_central_maple_full_2025',
          nurseryId: 'central_maple_nursery',
          careType: 'full_day_8h_plus',
          ageMinMonths: 6,
          ageMaxMonths: 60,
          monthlyFee: 590,
          currency: 'EUR',
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z'
        },
        {
          id: 'fee_central_budget_full_2025',
          nurseryId: 'central_budget_nursery',
          careType: 'full_day_8h_plus',
          ageMinMonths: 12,
          ageMaxMonths: 60,
          monthlyFee: 480,
          currency: 'EUR',
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z'
        },
        {
          id: 'fee_central_green_park_full_2025',
          nurseryId: 'central_green_park_nursery',
          careType: 'full_day_8h_plus',
          ageMinMonths: 6,
          ageMaxMonths: 72,
          monthlyFee: 540,
          currency: 'EUR',
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z'
        }
      ],
      nursery_opening_hours: [
        {
          id: 'oh_downtown_early_learning_monday',
          nurseryId: 'downtown_early_learning_hub_nursery',
          dayOfWeek: 'monday',
          openTime: '06:30',
          closeTime: '18:30',
          isClosed: false
        },
        {
          id: 'oh_downtown_early_learning_tuesday',
          nurseryId: 'downtown_early_learning_hub_nursery',
          dayOfWeek: 'tuesday',
          openTime: '06:30',
          closeTime: '18:30',
          isClosed: false
        },
        {
          id: 'oh_downtown_early_learning_wednesday',
          nurseryId: 'downtown_early_learning_hub_nursery',
          dayOfWeek: 'wednesday',
          openTime: '06:30',
          closeTime: '18:30',
          isClosed: false
        }
      ],
      visit_slots: [
        {
          id: 'vs_central_green_park_2026-03-04_0900',
          nurseryId: 'central_green_park_nursery',
          date: '2026-03-04T00:00:00Z',
          startTime: '09:00',
          endTime: '10:00',
          isBooked: false
        },
        {
          id: 'vs_central_green_park_2026-03-04_1000',
          nurseryId: 'central_green_park_nursery',
          date: '2026-03-04T00:00:00Z',
          startTime: '10:00',
          endTime: '11:00',
          isBooked: false
        },
        {
          id: 'vs_central_green_park_2026-03-04_1400',
          nurseryId: 'central_green_park_nursery',
          date: '2026-03-04T00:00:00Z',
          startTime: '14:00',
          endTime: '15:00',
          isBooked: false
        }
      ],
      visit_bookings: [
        {
          id: 'vb_2026_001',
          nurseryId: 'downtown_early_learning_hub_nursery',
          visitSlotId: 'vs_downtown_early_learning_2026-03-04_0900',
          visitDateTime: '2026-03-04T09:00:00Z',
          endTime: '10:00',
          parentName: 'Emily Stone',
          parentPhone: '555-100-2000',
          reminderMethod: 'email',
          createdAt: '2026-02-20T14:32:00Z',
          status: 'confirmed'
        },
        {
          id: 'vb_2026_002',
          nurseryId: 'downtown_sunrise_nursery',
          visitSlotId: 'vs_downtown_sunrise_2026-03-04_0900',
          visitDateTime: '2026-03-04T09:00:00Z',
          endTime: '09:45',
          parentName: 'Luis Hernandez',
          parentPhone: '555-300-4455',
          reminderMethod: 'sms',
          createdAt: '2026-02-25T09:10:00Z',
          status: 'pending'
        },
        {
          id: 'vb_2026_003',
          nurseryId: 'north_hilltop_nursery',
          visitSlotId: 'vs_north_hilltop_2026-03-04_0930',
          visitDateTime: '2026-03-04T09:30:00Z',
          endTime: '10:30',
          parentName: 'Anna Keller',
          parentPhone: '555-410-7788',
          reminderMethod: 'sms',
          createdAt: '2026-02-18T16:05:00Z',
          status: 'confirmed'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:23:42.634614'
      }
    };

    // Populate localStorage with generated data using correct storage keys
    localStorage.setItem('activity_centers', JSON.stringify(generatedData.activity_centers || []));
    localStorage.setItem('calendar_days', JSON.stringify(generatedData.calendar_days || []));
    localStorage.setItem('home_locations', JSON.stringify(generatedData.home_locations || []));
    localStorage.setItem('activities', JSON.stringify(generatedData.activities || []));
    localStorage.setItem('nurseries', JSON.stringify(generatedData.nurseries || []));
    localStorage.setItem('nursery_fee_schedules', JSON.stringify(generatedData.nursery_fee_schedules || []));
    localStorage.setItem('nursery_opening_hours', JSON.stringify(generatedData.nursery_opening_hours || []));
    localStorage.setItem('visit_slots', JSON.stringify(generatedData.visit_slots || []));
    localStorage.setItem('visit_bookings', JSON.stringify(generatedData.visit_bookings || []));

    // Ensure all other storages exist as arrays if _initStorage did not already
    const storageKeys = [
      'favorite_nurseries',
      'visit_bookings',
      'applications',
      'application_nursery_preferences',
      'activity_registration_lists',
      'activity_registration_items',
      'fee_plans',
      'contact_inquiries'
    ];
    for (const key of storageKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_ApplyForCheapestFullDayNursery();
    this.testTask2_SaveEarliestOpeningHighlyRatedNurseryToFavorites();
    this.testTask3_BookMorningVisitAtPlaygroundNursery();
    this.testTask4_RegisterTwoAfternoonActivitiesSameCenter();
    this.testTask5_CompareFeePlansAndSaveCheaper();
    this.testTask6_CreateRankedApplicationWithThreeNurseries();
    this.testTask7_AllergyFriendlyNurseryMealsInquiry();
    this.testTask8_StartApplicationFromFirstOpenCalendarDay();

    return this.results;
  }

  // Task 1: Apply for the cheapest full-day nursery within 3 km for a 3-year-old
  testTask1_ApplyForCheapestFullDayNursery() {
    const testName = 'Task 1: Apply for cheapest full-day nursery within 3km';
    console.log('Testing:', testName);

    try {
      const childAgeYears = 3;
      const desiredStartDate = '2025-09-01';
      const maxDistanceKm = 3;
      const careType = 'full_day_8h_plus';
      const maxMonthlyFee = 600;
      const sortBy = 'monthly_fee_asc';

      // Search nurseries according to filters
      const searchResults = this.logic.searchNurseries(
        childAgeYears,
        desiredStartDate,
        maxDistanceKm,
        null, // district (adapted: any district)
        careType,
        maxMonthlyFee,
        null, // minRating
        null, // opensByTimeWeekday
        null, // hasNutFreeMenu
        null, // hasLactoseFreeOptions
        null, // hasLargeOutdoorPlayground
        sortBy
      );

      this.assert(Array.isArray(searchResults) && searchResults.length > 0, 'Task 1: search should return at least one nursery');

      const cheapestNurseryCard = searchResults[0];
      this.assert(!!cheapestNurseryCard.nurseryId, 'Task 1: cheapest result should have nurseryId');

      // Start application with selected nursery (source: nursery_search)
      const startResult = this.logic.startApplicationWithNurseries(
        [cheapestNurseryCard.nurseryId],
        desiredStartDate,
        careType,
        'full_day_5_days', // scheduleType approximating Monday–Friday full-day
        'nursery_search',
        cheapestNurseryCard.district
      );

      const application = startResult.application;
      this.assert(application && application.id, 'Task 1: application should be created');
      const appId = application.id;

      // Update application details with child and parent info
      const updatedResult = this.logic.updateApplicationDetails(
        appId,
        desiredStartDate,
        careType,
        'full_day_5_days',
        'Alex Rivera',
        '2022-06-15',
        null,
        '555-123-7890',
        'parent@example.com',
        null
      );

      this.assert(updatedResult.application.childName === 'Alex Rivera', 'Task 1: child name should be stored');

      // Submit the application
      const submitResult = this.logic.submitApplication(appId);
      this.assert(submitResult.application && submitResult.application.status === 'submitted', 'Task 1: application status should be submitted');

      // Verify preferences and relationships
      const state = this.logic.getApplicationState(appId);
      this.assert(Array.isArray(state.nurseryPreferences), 'Task 1: application should have nursery preferences array');
      this.assert(state.nurseryPreferences.length === 1, 'Task 1: application should have exactly one nursery preference');

      const pref = state.nurseryPreferences[0];
      this.assert(pref.preference.nurseryId === cheapestNurseryCard.nurseryId, 'Task 1: preference nurseryId should match selected cheapest nursery');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Save the earliest-opening highly rated nursery to favorites (adapted to available central nurseries)
  testTask2_SaveEarliestOpeningHighlyRatedNurseryToFavorites() {
    const testName = 'Task 2: Save earliest-opening highly rated nursery to favorites';
    console.log('Testing:', testName);

    try {
      // Adapted filters: minRating 4.5, opens by 07:30 to include top-rated Green Park
      const minRating = 4.5;
      const opensByTime = '07:30';
      const sortBy = 'opening_time_asc';

      const searchResults = this.logic.searchNurseries(
        null, // childAgeYears
        null, // desiredStartDate
        null, // maxDistanceKm
        null, // district (no downtown nurseries in generated data)
        null, // careType
        null, // maxMonthlyFee
        minRating,
        opensByTime,
        null,
        null,
        null,
        sortBy
      );

      this.assert(Array.isArray(searchResults) && searchResults.length > 0, 'Task 2: search should return at least one nursery');

      // Earliest-opening among highly rated results
      const earliest = searchResults[0];
      this.assert(!!earliest.nurseryId, 'Task 2: earliest nursery should have nurseryId');
      this.assert(typeof earliest.opensByTimeWeekday === 'string', 'Task 2: earliest nursery should have opening time');
      this.assert(typeof earliest.ratingAverage === 'number' && earliest.ratingAverage >= minRating, 'Task 2: earliest nursery should meet rating filter');

      // Add to favorites explicitly in add mode
      const favResult = this.logic.toggleNurseryFavorite(earliest.nurseryId, 'add');
      this.assert(favResult.success === true, 'Task 2: toggleNurseryFavorite should succeed');
      this.assert(favResult.isFavorite === true, 'Task 2: nursery should be marked as favorite');

      // Verify via favorites list
      const favorites = this.logic.getFavoriteNurseries();
      this.assert(Array.isArray(favorites), 'Task 2: getFavoriteNurseries should return array');

      const inFavorites = favorites.find(f => f.nurseryId === earliest.nurseryId);
      this.assert(!!inFavorites, 'Task 2: selected nursery should appear in favorites list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Book a morning visit next Wednesday at a nearby nursery with playground under 550 monthly fee
  // Adapted to use available visit slots for central_green_park_nursery and a date range covering those slots
  testTask3_BookMorningVisitAtPlaygroundNursery() {
    const testName = 'Task 3: Book morning visit at nearby playground nursery';
    console.log('Testing:', testName);

    try {
      const childAgeYears = 2;
      const maxDistanceKm = 2;
      const hasLargeOutdoorPlayground = true;
      const maxMonthlyFee = 550;

      // Search nurseries suitable for visit
      const visitSearchResults = this.logic.searchNurseriesForVisit(
        childAgeYears,
        maxDistanceKm,
        hasLargeOutdoorPlayground,
        maxMonthlyFee,
        null, // minRating
        'rating_desc'
      );

      this.assert(Array.isArray(visitSearchResults) && visitSearchResults.length > 0, 'Task 3: visit search should return at least one nursery');

      const topNursery = visitSearchResults[0];
      this.assert(topNursery.hasLargeOutdoorPlayground === true, 'Task 3: selected nursery should have large outdoor playground');
      this.assert(typeof topNursery.baseMonthlyFee === 'number' && topNursery.baseMonthlyFee <= maxMonthlyFee, 'Task 3: selected nursery should meet fee filter');

      const nurseryId = topNursery.nurseryId;

      // Get visit availability over a range that includes the generated slots
      const availability = this.logic.getVisitAvailability(
        nurseryId,
        '2026-03-01',
        '2026-03-31'
      );

      this.assert(availability && Array.isArray(availability.availableSlots), 'Task 3: availability should include availableSlots array');

      const slots = availability.availableSlots.filter(s => s.isBooked === false);
      this.assert(slots.length > 0, 'Task 3: there should be at least one unbooked slot');

      // Filter to morning-ish slots between 09:00 and 11:00
      const morningSlots = slots.filter(s => s.startTime >= '09:00' && s.endTime <= '11:00');
      this.assert(morningSlots.length > 0, 'Task 3: there should be at least one morning slot between 09:00 and 11:00');

      // Pick the earliest morning slot by date and startTime
      morningSlots.sort((a, b) => {
        const da = a.date;
        const db = b.date;
        if (da < db) return -1;
        if (da > db) return 1;
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      });
      const chosenSlot = morningSlots[0];
      this.assert(!!chosenSlot.id, 'Task 3: chosen slot should have id');

      // Create visit booking using the chosen slot
      const bookingResult = this.logic.createVisitBooking(
        nurseryId,
        chosenSlot.id,
        null, // visitDate (not needed because we pass visitSlotId)
        null, // startTime
        null, // endTime
        'Jordan Lee',
        '555-987-6543',
        'sms'
      );

      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Task 3: booking should be created with id');
      this.assert(booking.nurseryId === nurseryId, 'Task 3: booking nurseryId should match selected nursery');
      this.assert(booking.visitSlotId === chosenSlot.id, 'Task 3: booking visitSlotId should match chosen slot');
      this.assert(booking.parentName === 'Jordan Lee', 'Task 3: booking should store parent name');
      this.assert(booking.reminderMethod === 'sms', 'Task 3: booking should store reminder method sms');

      // Fetch booking summary to verify relationship with nursery
      const summary = this.logic.getVisitBookingSummary(booking.id);
      this.assert(summary && summary.booking && summary.nursery, 'Task 3: booking summary should include booking and nursery');
      this.assert(summary.booking.id === booking.id, 'Task 3: summary booking id should match original booking');
      this.assert(summary.nursery.id === nurseryId, 'Task 3: summary nursery id should match selected nursery');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register a 4–5-year-old for two different July afternoon activities under 30 at the same center
  testTask4_RegisterTwoAfternoonActivitiesSameCenter() {
    const testName = 'Task 4: Register 4–5yo for two July afternoon activities at same center';
    console.log('Testing:', testName);

    try {
      const ageMinYears = 4;
      const ageMaxYears = 5;
      const month = '2025-07';
      const timeOfDay = 'afternoon';
      const maxPricePerSession = 30;

      const activities = this.logic.searchActivities(
        ageMinYears,
        ageMaxYears,
        month,
        null,
        null,
        timeOfDay,
        maxPricePerSession
      );

      this.assert(Array.isArray(activities) && activities.length > 0, 'Task 4: searchActivities should return results');

      // Group by centerId to find a center with at least two activities
      const byCenter = {};
      for (const act of activities) {
        if (!byCenter[act.centerId]) {
          byCenter[act.centerId] = [];
        }
        byCenter[act.centerId].push(act);
      }

      let selectedCenterId = null;
      let selectedActivities = [];
      for (const centerId in byCenter) {
        if (byCenter[centerId].length >= 2) {
          selectedCenterId = centerId;
          selectedActivities = byCenter[centerId];
          break;
        }
      }

      this.assert(!!selectedCenterId, 'Task 4: should find a center with at least two activities');
      this.assert(selectedActivities.length >= 2, 'Task 4: selected center should have at least two activities');

      const firstActivityCard = selectedActivities[0];
      const secondActivityCard = selectedActivities[1];

      // Simulate opening first activity detail
      const firstDetails = this.logic.getActivityDetails(firstActivityCard.activityId);
      this.assert(firstDetails && firstDetails.activity && firstDetails.center, 'Task 4: getActivityDetails should return activity and center');
      this.assert(firstDetails.center.id === selectedCenterId, 'Task 4: detail center should match selected center');

      // Register first activity, creating a registration list with child details
      const regResult1 = this.logic.addActivityToRegistrationList(
        firstActivityCard.activityId,
        'Mia Carter',
        1
      );

      const regList1 = regResult1.registrationList;
      this.assert(regList1 && regList1.id, 'Task 4: registration list should be created');
      this.assert(regList1.childName === 'Mia Carter', 'Task 4: registration list should store child name');
      this.assert(regList1.numChildren === 1, 'Task 4: registration list should store numChildren = 1');
      this.assert(regResult1.totalItems === 1, 'Task 4: registration list should contain one item after first add');

      // Add second activity from same center
      const regResult2 = this.logic.addActivityToRegistrationList(
        secondActivityCard.activityId,
        null,
        null
      );

      this.assert(regResult2.registrationList.id === regList1.id, 'Task 4: second activity should be added to same registration list');
      this.assert(regResult2.totalItems === 2, 'Task 4: registration list should contain two items after second add');

      // Verify registration summary groups both under same center
      const summary = this.logic.getActivityRegistrationSummary();
      this.assert(summary && summary.registrationList && Array.isArray(summary.activitiesByCenter), 'Task 4: summary should contain activitiesByCenter');

      const centerGroup = summary.activitiesByCenter.find(group => group.center && group.center.id === selectedCenterId);
      this.assert(centerGroup && Array.isArray(centerGroup.items), 'Task 4: summary should contain group for selected center');

      const activityIdsInGroup = centerGroup.items.map(item => item.activity.id);
      this.assert(activityIdsInGroup.includes(firstActivityCard.activityId), 'Task 4: group should include first activity');
      this.assert(activityIdsInGroup.includes(secondActivityCard.activityId), 'Task 4: group should include second activity');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Use fee calculator to compare half-day vs full-day costs and save the cheaper plan
  testTask5_CompareFeePlansAndSaveCheaper() {
    const testName = 'Task 5: Compare half-day vs full-day fee plans and save cheaper';
    console.log('Testing:', testName);

    try {
      const income = 3200;
      const childAgeYears = 2;

      // Half-day estimate
      const halfEstimate = this.logic.calculateFeeEstimate(
        income,
        childAgeYears,
        'half_day_5_days'
      );
      this.assert(typeof halfEstimate.estimatedMonthlyFee === 'number', 'Task 5: half-day estimatedMonthlyFee should be a number');

      // Full-day estimate
      const fullEstimate = this.logic.calculateFeeEstimate(
        income,
        childAgeYears,
        'full_day_5_days'
      );
      this.assert(typeof fullEstimate.estimatedMonthlyFee === 'number', 'Task 5: full-day estimatedMonthlyFee should be a number');

      // Determine cheaper plan based on returned values
      let cheaperScheduleType;
      let cheaperFee;
      if (halfEstimate.estimatedMonthlyFee <= fullEstimate.estimatedMonthlyFee) {
        cheaperScheduleType = 'half_day_5_days';
        cheaperFee = halfEstimate.estimatedMonthlyFee;
      } else {
        cheaperScheduleType = 'full_day_5_days';
        cheaperFee = fullEstimate.estimatedMonthlyFee;
      }

      // Save cheaper plan as preferred plan
      const planName = 'My chosen schedule';
      const saveResult = this.logic.saveFeePlan(
        planName,
        income,
        childAgeYears,
        cheaperScheduleType,
        cheaperFee
      );

      const savedPlan = saveResult.feePlan;
      this.assert(savedPlan && savedPlan.id, 'Task 5: fee plan should be saved with id');
      this.assert(savedPlan.name === planName, 'Task 5: saved fee plan name should match input');
      this.assert(savedPlan.scheduleType === cheaperScheduleType, 'Task 5: saved plan scheduleType should match cheaper plan');
      this.assert(savedPlan.estimatedMonthlyFee === cheaperFee, 'Task 5: saved plan fee should match cheaper fee');

      // Verify via getSavedFeePlans
      const allPlans = this.logic.getSavedFeePlans();
      this.assert(Array.isArray(allPlans) && allPlans.length > 0, 'Task 5: getSavedFeePlans should return at least one plan');

      const found = allPlans.find(p => p.id === savedPlan.id);
      this.assert(!!found, 'Task 5: saved fee plan should be present in saved plans list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Create a ranked application with three full-day nurseries ordered by rating
  // Adapted to use central district nurseries (since no north nurseries are in generated data)
  testTask6_CreateRankedApplicationWithThreeNurseries() {
    const testName = 'Task 6: Create ranked application with three full-day nurseries';
    console.log('Testing:', testName);

    try {
      const childAgeYears = 1;
      const desiredStartDate = '2025-09-01';
      const careType = 'full_day_8h_plus';

      const searchResults = this.logic.searchNurseries(
        childAgeYears,
        desiredStartDate,
        null, // maxDistanceKm
        'central', // adapted district
        careType,
        null, // maxMonthlyFee
        null, // minRating
        null, // opensByTimeWeekday
        null,
        null,
        null,
        'rating_desc'
      );

      this.assert(Array.isArray(searchResults) && searchResults.length >= 3, 'Task 6: search should return at least three nurseries');

      const topThree = searchResults.slice(0, 3);
      const nurseryIds = topThree.map(n => n.nurseryId);

      // Start application with selected nurseries
      const startResult = this.logic.startApplicationWithNurseries(
        nurseryIds,
        desiredStartDate,
        careType,
        'full_day_5_days',
        'nursery_search',
        'central'
      );

      const application = startResult.application;
      this.assert(application && application.id, 'Task 6: application should be created');
      const appId = application.id;

      // Arrange preferences so that highest-rated (first in list) is preference 1
      const preferences = topThree.map((card, index) => ({
        nurseryId: card.nurseryId,
        preferenceOrder: index + 1
      }));

      const prefResult = this.logic.setApplicationNurseryPreferences(
        appId,
        preferences
      );

      this.assert(Array.isArray(prefResult.nurseryPreferences) && prefResult.nurseryPreferences.length === 3, 'Task 6: application should have three preferences');

      // Update child details
      const updateResult = this.logic.updateApplicationDetails(
        appId,
        desiredStartDate,
        careType,
        'full_day_5_days',
        'Noah Kim',
        '2024-01-10',
        null,
        null,
        null,
        null
      );

      this.assert(updateResult.application.childName === 'Noah Kim', 'Task 6: child name should be stored on application');

      // Verify application state and preference ordering
      const state = this.logic.getApplicationState(appId);
      this.assert(state && state.application && Array.isArray(state.nurseryPreferences), 'Task 6: getApplicationState should return application with preferences');
      this.assert(state.nurseryPreferences.length === 3, 'Task 6: state should contain three preferences');

      // Build a map from nurseryId to expected order
      const expectedOrderMap = {};
      preferences.forEach(p => { expectedOrderMap[p.nurseryId] = p.preferenceOrder; });

      for (const pref of state.nurseryPreferences) {
        const nid = pref.preference.nurseryId;
        this.assert(expectedOrderMap[nid] === pref.preference.preferenceOrder, 'Task 6: preferenceOrder should match expected order for nursery ' + nid);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Find an allergy-friendly nursery and send a meals inquiry via the contact form
  testTask7_AllergyFriendlyNurseryMealsInquiry() {
    const testName = 'Task 7: Allergy-friendly nursery meals inquiry';
    console.log('Testing:', testName);

    try {
      const maxDistanceKm = 4;

      // Search nurseries with nut-free and lactose-free options within 4 km
      const searchResults = this.logic.searchNurseries(
        3, // childAgeYears
        null, // desiredStartDate
        maxDistanceKm,
        null, // district
        null, // careType
        null, // maxMonthlyFee
        null, // minRating
        null, // opensByTimeWeekday
        true, // hasNutFreeMenu
        true, // hasLactoseFreeOptions
        null, // hasLargeOutdoorPlayground
        'distance_asc'
      );

      this.assert(Array.isArray(searchResults) && searchResults.length > 0, 'Task 7: search should return at least one allergy-friendly nursery');

      const selectedCard = searchResults[0];
      const nurseryId = selectedCard.nurseryId;
      this.assert(!!nurseryId, 'Task 7: selected nursery should have nurseryId');

      // Get nursery details (including meals description)
      const details = this.logic.getNurseryDetails(nurseryId);
      this.assert(details && details.nursery, 'Task 7: getNurseryDetails should return nursery');

      const nurseryName = details.nursery.name;

      // Get contact subjects and ensure meals/allergies subject exists
      const subjects = this.logic.getContactSubjects();
      this.assert(Array.isArray(subjects) && subjects.length > 0, 'Task 7: getContactSubjects should return subjects');

      const mealsSubject = subjects.find(s => s.value === 'meals_allergies');
      this.assert(!!mealsSubject, 'Task 7: meals_allergies subject should be available');

      const message = 'I would like to confirm how you handle nut and lactose allergies at ' + nurseryName + ' for a 3-year-old child.';

      const inquiryResult = this.logic.submitContactInquiry(
        mealsSubject.value,
        message,
        'Sara Patel',
        'sara.patel@example.com',
        '555-222-3344',
        nurseryId
      );

      const inquiry = inquiryResult.inquiry;
      this.assert(inquiry && inquiry.id, 'Task 7: inquiry should be created with id');
      this.assert(inquiry.subject === 'meals_allergies', 'Task 7: inquiry subject should be meals_allergies');
      this.assert(inquiry.nurseryId === nurseryId, 'Task 7: inquiry nurseryId should match selected nursery');
      this.assert(inquiry.parentName === 'Sara Patel', 'Task 7: inquiry should store parent name');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose the first open day after a given date from the closure calendar and start an application with that date
  // Adapted: use first open day after 2025-07-01, which is present in generated calendar_days
  testTask8_StartApplicationFromFirstOpenCalendarDay() {
    const testName = 'Task 8: Start application from first open calendar day';
    console.log('Testing:', testName);

    try {
      // Use helper to find first open day after 2025-07-01
      const firstOpen = this.logic.getFirstOpenDayAfter('2025-07-01');
      this.assert(firstOpen && typeof firstOpen.date === 'string' && firstOpen.date.length > 0, 'Task 8: getFirstOpenDayAfter should return a date');

      const startDate = firstOpen.date; // e.g., '2025-07-02'

      // Start application from this calendar date
      const startResult = this.logic.startApplicationFromCalendarDate(startDate);
      const application = startResult.application;
      this.assert(application && application.id, 'Task 8: application should be created from calendar date');
      const appId = application.id;

      // Update application with desired start date, care type, schedule, and child details
      const careType = 'full_day_8h_plus';
      const updateResult = this.logic.updateApplicationDetails(
        appId,
        startDate,
        careType,
        'full_day_5_days',
        'Lena Ortiz',
        '2023-04-02',
        null,
        null,
        null,
        'central' // adapted district filter (since we only have central nurseries)
      );

      this.assert(updateResult.application.childName === 'Lena Ortiz', 'Task 8: child name should be stored on application');

      // Search nurseries in the selected district to add as primary choice
      const nurseryCards = this.logic.searchNurseries(
        2, // childAgeYears
        startDate,
        null, // maxDistanceKm
        'central', // district
        careType,
        null, // maxMonthlyFee
        null, // minRating
        null, // opensByTimeWeekday
        null,
        null,
        null,
        'distance_asc'
      );

      this.assert(Array.isArray(nurseryCards) && nurseryCards.length > 0, 'Task 8: nursery search should return at least one nursery in central district');

      const primaryNursery = nurseryCards[0];
      const primaryNurseryId = primaryNursery.nurseryId;
      this.assert(!!primaryNurseryId, 'Task 8: primary nursery should have nurseryId');

      // Add nursery to application as a preference
      const addResult = this.logic.addNurseryToApplication(appId, primaryNurseryId);
      this.assert(addResult.preference && addResult.preference.preference, 'Task 8: addNurseryToApplication should return a preference');
      this.assert(addResult.preference.preference.nurseryId === primaryNurseryId, 'Task 8: preference nurseryId should match added nursery');

      // Verify application state and that selected nursery is in preferences
      const state = this.logic.getApplicationState(appId);
      this.assert(state && Array.isArray(state.nurseryPreferences), 'Task 8: application state should include nursery preferences');

      const hasPrimary = state.nurseryPreferences.some(p => p.preference.nurseryId === primaryNurseryId);
      this.assert(hasPrimary, 'Task 8: application preferences should contain the primary nursery');

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
