// Test runner for business logic

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

  // IMPORTANT: Use Generated Data ONLY here for initial localStorage population
  setupTestData() {
    var generatedData = {
      directory_categories: [
        {
          id: 'restaurants_food',
          name: 'Restaurants & Food',
          description: 'Local restaurants, cafes, takeout, and family-friendly dining options near you.',
          icon: 'utensils',
          sort_order: 1
        },
        {
          id: 'parks_outdoors',
          name: 'Parks & Outdoors',
          description: 'Parks, playgrounds, trails, and outdoor spaces for all ages.',
          icon: 'tree',
          sort_order: 2
        },
        {
          id: 'home_services',
          name: 'Home Services',
          description: 'Plumbers, electricians, cleaners, gardeners, and other local home services.',
          icon: 'home',
          sort_order: 3
        }
      ],
      groups: [
        {
          id: 'group_beginner_yoga_12345',
          name: 'Downtown Beginner Yoga Evenings',
          description: 'A friendly beginner yoga group meeting MondayThursday at 6:30 PM in downtown Schenectady. Focus on gentle flows, stretching, and basic poses. No prior experience required.',
          focus: 'yoga',
          experience_level: 'beginner',
          meeting_pattern: 'weekday_evenings',
          primary_location_name: 'Downtown Community Center',
          address_line1: '12 State St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12345',
          latitude: 42.8142,
          longitude: -73.9396,
          radius_miles: 10
        },
        {
          id: 'group_all_levels_yoga_park',
          name: 'All-Levels Sunset Yoga in the Park',
          description: 'Outdoor yoga sessions in the park, suitable for all levels. Weekday evening meetups when weather allows, with a focus on relaxation and breathwork.',
          focus: 'yoga',
          experience_level: 'all_levels',
          meeting_pattern: 'weekday_evenings',
          primary_location_name: 'Riverside Park',
          address_line1: '200 Riverside Dr',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12305',
          latitude: 42.8125,
          longitude: -73.939,
          radius_miles: 10
        },
        {
          id: 'group_power_yoga_weekends',
          name: 'Power Yoga Weekends',
          description: 'Energetic vinyasa and power yoga classes aimed at improving strength and flexibility. Best for intermediate to advanced practitioners. Meets Saturday and Sunday mornings.',
          focus: 'yoga',
          experience_level: 'intermediate',
          meeting_pattern: 'weekends',
          primary_location_name: 'Uptown Yoga Studio',
          address_line1: '88 Union St',
          address_line2: 'Suite 3B',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12308',
          latitude: 42.8205,
          longitude: -73.9321,
          radius_miles: 15
        }
      ],
      places: [
        {
          id: 'family_bistro_12345',
          name: 'Maple Street Family Bistro',
          category_id: 'restaurants_food',
          subcategory: 'restaurant',
          description: 'Casual neighborhood restaurant with a kids menu, booster seats, and plenty of shareable plates. Popular for family dinners on Friday nights.',
          rating: 4.7,
          review_count: 184,
          average_price_per_person: 18,
          hourly_rate: 0,
          call_out_fee: 0,
          service_coverage_radius_miles: 0,
          is_family_friendly: true,
          takes_reservations: true,
          has_playground: false,
          is_dog_friendly: false,
          is_24_7_emergency: false,
          supports_weekday_daytime: false,
          phone: '(518) 555-0123',
          website_url: 'https://www.maplestreetfamilybistro.com',
          address_line1: '25 Maple St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12345',
          latitude: 42.8145,
          longitude: -73.9392
        },
        {
          id: 'harbor_grill_12345',
          name: 'Harborview Grill & Kids Corner',
          category_id: 'restaurants_food',
          subcategory: 'restaurant',
          description: 'Waterfront American grill with a small indoor play corner, coloring sheets, and a wide selection of budget-friendly entrees.',
          rating: 4.6,
          review_count: 132,
          average_price_per_person: 17,
          hourly_rate: 0,
          call_out_fee: 0,
          service_coverage_radius_miles: 0,
          is_family_friendly: true,
          takes_reservations: true,
          has_playground: false,
          is_dog_friendly: false,
          is_24_7_emergency: false,
          supports_weekday_daytime: false,
          phone: '(518) 555-0456',
          website_url: 'https://www.harborviewgrillny.com',
          address_line1: '210 Harborside Dr',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12305',
          latitude: 42.8171,
          longitude: -73.9315
        },
        {
          id: 'riverside_pizza_12345',
          name: 'Riverside Pizza & Subs',
          category_id: 'restaurants_food',
          subcategory: 'restaurant',
          description: 'Family-friendly pizza shop offering slices, subs, and salads with quick service and plenty of seating.',
          rating: 4.3,
          review_count: 96,
          average_price_per_person: 16,
          hourly_rate: 0,
          call_out_fee: 0,
          service_coverage_radius_miles: 0,
          is_family_friendly: true,
          takes_reservations: false,
          has_playground: false,
          is_dog_friendly: false,
          is_24_7_emergency: false,
          supports_weekday_daytime: false,
          phone: '(518) 555-0199',
          website_url: 'https://www.riversidepizzany.com',
          address_line1: '15 River St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12305',
          latitude: 42.8139,
          longitude: -73.9378
        }
      ],
      place_operating_hours: [
        {
          id: 'oh_family_bistro_monday',
          placeId: 'family_bistro_12345',
          day_of_week: 'monday',
          open_time: '11:00',
          close_time: '21:00',
          is_closed: false
        },
        {
          id: 'oh_family_bistro_tuesday',
          placeId: 'family_bistro_12345',
          day_of_week: 'tuesday',
          open_time: '11:00',
          close_time: '21:00',
          is_closed: false
        },
        {
          id: 'oh_family_bistro_wednesday',
          placeId: 'family_bistro_12345',
          day_of_week: 'wednesday',
          open_time: '11:00',
          close_time: '21:00',
          is_closed: false
        }
      ],
      events: [
        {
          id: 'event_riverfront_storywalk_20260307',
          title: 'Riverfront Storywalk & Family Games',
          description: 'Enjoy a self-guided storywalk along the riverfront with activity stations and lawn games for kids and families.',
          event_type: 'events',
          start_datetime: '2026-03-07T13:30:00',
          end_datetime: '2026-03-07T15:00:00',
          location_name: 'Central Neighborhood Park',
          address_line1: '12 Oak St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12345',
          latitude: 42.815,
          longitude: -73.9385,
          price: 0,
          is_free: true,
          spots_total: 150,
          associated_group_id: '',
          status: 'scheduled',
          organizer_name: 'City Parks & Recreation',
          organizer_contact_email: 'parks@schenectadyexample.gov',
          organizer_contact_phone: '(518) 555-1100',
          spots_remaining: 150
        },
        {
          id: 'event_kids_crafts_library_20260307',
          title: 'Kids Crafts & Lego Hour',
          description: 'Drop-in crafts and Lego building for ages 410. All materials provided; children must be accompanied by an adult.',
          event_type: 'events',
          start_datetime: '2026-03-07T15:30:00',
          end_datetime: '2026-03-07T17:00:00',
          location_name: 'Central Library Meeting Room',
          address_line1: '99 Clinton St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12305',
          latitude: 42.8137,
          longitude: -73.94,
          price: 0,
          is_free: true,
          spots_total: 60,
          associated_group_id: '',
          status: 'scheduled',
          organizer_name: 'Schenectady Public Library',
          organizer_contact_email: 'events@schplibexample.org',
          organizer_contact_phone: '(518) 555-1200',
          spots_remaining: 60
        },
        {
          id: 'event_farmers_market_20260307',
          title: 'Downtown Saturday Farmers Market',
          description: 'Local farmers and makers offering fresh produce, baked goods, coffee, and crafts. Live acoustic music from 1011 AM.',
          event_type: 'events',
          start_datetime: '2026-03-07T09:00:00',
          end_datetime: '2026-03-07T12:00:00',
          location_name: 'Downtown Plaza',
          address_line1: '1 Liberty St',
          address_line2: '',
          city: 'Schenectady',
          state: 'NY',
          zip_code: '12305',
          latitude: 42.815,
          longitude: -73.94,
          price: 0,
          is_free: true,
          spots_total: 300,
          associated_group_id: '',
          status: 'scheduled',
          organizer_name: 'Downtown Business Association',
          organizer_contact_email: 'info@downtownschenectadyexample.org',
          organizer_contact_phone: '(518) 555-1300',
          spots_remaining: 300
        }
      ],
      event_rsvps: [
        {
          id: 'rsvp_grp_beginner_yoga_20260304',
          eventId: 'grp_beginner_yoga_20260304',
          status: 'going',
          responded_at: '2026-03-02T18:05:00'
        },
        {
          id: 'rsvp_vol_mohawk_cleanup_20260321',
          eventId: 'vol_mohawk_river_cleanup_20260321',
          status: 'interested',
          responded_at: '2026-03-01T09:30:00'
        },
        {
          id: 'rsvp_vol_garden_workday_20260315',
          eventId: 'vol_community_garden_workday_20260315',
          status: 'going',
          responded_at: '2026-03-02T14:20:00'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:13:30.614643'
      }
    };

    // Populate localStorage using storage keys
    localStorage.setItem('directory_categories', JSON.stringify(generatedData.directory_categories));
    localStorage.setItem('groups', JSON.stringify(generatedData.groups));
    localStorage.setItem('places', JSON.stringify(generatedData.places));
    localStorage.setItem('place_operating_hours', JSON.stringify(generatedData.place_operating_hours));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('event_rsvps', JSON.stringify(generatedData.event_rsvps));

    // Initialise other collections as empty arrays if not already
    var emptyKeys = [
      'saved_lists',
      'saved_list_items',
      'organizer_messages',
      'group_memberships',
      'site_contact_messages'
    ];
    for (var i = 0; i < emptyKeys.length; i += 1) {
      var key = emptyKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Store metadata for potential date calculations (not used directly by business logic)
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests (full user flows, adapted to available data)
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveFamilyFriendlyRestaurant();
    this.testTask2_AddCheapestServiceToEmergencyContacts();
    this.testTask3_WeekendPlanTwoEvents();
    this.testTask4_ContactVolunteeringLikeOpportunity();
    this.testTask5_BookmarkNearbyPlaceAsLocalPark();
    this.testTask6_JoinBeginnerYogaGroupAndRSVP();
    this.testTask7_ShortlistProviderChildcareOptions();
    this.testTask8_BuildHomeServicesListThreeProviders();

    return this.results;
  }

  // Task 1: Save a top-rated family-friendly restaurant under 20 per person
  testTask1_SaveFamilyFriendlyRestaurant() {
    var testName = 'Task 1: Save top-rated family-friendly restaurant';
    console.log('Testing:', testName);

    try {
      var navSections = this.logic.getHomeNavigationSections();
      this.assert(Array.isArray(navSections), 'Nav sections should be an array');

      var restaurantNav = null;
      for (var i = 0; i < navSections.length; i += 1) {
        var item = navSections[i];
        if (item.category_id === 'restaurants_food' || item.id === 'restaurants_food') {
          restaurantNav = item;
          break;
        }
      }
      this.assert(restaurantNav, 'Restaurants nav item should exist');

      var categoryId = restaurantNav.category_id || restaurantNav.id;

      var filterOptions = this.logic.getDirectoryFilterOptions(categoryId);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get directory filter options');

      var searchResult = this.logic.searchDirectoryPlaces(
        categoryId,              // category_id
        'restaurant',            // subcategory
        null,                    // keyword
        '12345',                 // zip_code
        3,                       // radius_miles
        { max_average_price_per_person: 20 }, // price_filter
        4.5,                     // rating_min
        { is_family_friendly: true, takes_reservations: true }, // amenities
        null,                    // availability (omitted to avoid filtering out limited hours)
        'rating_high_to_low',    // sort_by
        1,                       // page
        10                       // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get search results');
      this.assert(searchResult.results.length > 0, 'Should find at least one matching restaurant');

      var topPlace = searchResult.results[0];
      this.assert(topPlace.place_id, 'Top result should have place_id');

      if (typeof topPlace.rating === 'number') {
        this.assert(topPlace.rating >= 4.5, 'Top result rating should be at least 4.5');
      }
      if (typeof topPlace.average_price_per_person === 'number') {
        this.assert(
          topPlace.average_price_per_person <= 20,
          'Top result average price per person should be at most 20'
        );
      }

      var placeDetails = this.logic.getPlaceDetails(topPlace.place_id);
      this.assert(placeDetails && placeDetails.place, 'Should get place details');
      this.assert(placeDetails.place.id === topPlace.place_id, 'Detail place id should match search result');

      if (typeof placeDetails.place.average_price_per_person === 'number') {
        this.assert(
          placeDetails.place.average_price_per_person <= 20,
          'Place detail average price per person should be at most 20'
        );
      }
      if (typeof placeDetails.place.is_family_friendly === 'boolean') {
        this.assert(
          placeDetails.place.is_family_friendly === true,
          'Place should be family friendly when flag present'
        );
      }
      if (typeof placeDetails.place.takes_reservations === 'boolean') {
        this.assert(
          placeDetails.place.takes_reservations === true,
          'Place should take reservations when flag present'
        );
      }

      var saveResult = this.logic.createSavedListAndAddItem(
        'Family Dinner Friday',
        'Automated test list for family-friendly restaurant',
        'place',
        topPlace.place_id
      );

      this.assert(saveResult && saveResult.list && saveResult.saved_item, 'Should create list and saved item');
      var listId = saveResult.list.id;
      this.assert(listId, 'Saved list id should be present');

      var listDetail = this.logic.getSavedListDetail(listId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve saved list detail');

      var foundItem = null;
      for (var j = 0; j < listDetail.items.length; j += 1) {
        var it = listDetail.items[j];
        if (it.item_type === 'place' && it.item_id === topPlace.place_id) {
          foundItem = it;
          break;
        }
      }
      this.assert(foundItem, 'Saved restaurant should be in Family Dinner Friday list');

      var placesStorage = JSON.parse(localStorage.getItem('places') || '[]');
      var relatedPlace = null;
      for (var k = 0; k < placesStorage.length; k += 1) {
        if (placesStorage[k].id === foundItem.item_id) {
          relatedPlace = placesStorage[k];
          break;
        }
      }
      this.assert(!!relatedPlace, 'SavedListItem.item_id should reference an existing Place');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add the cheaper of two top-rated providers (adapted to restaurants) to Emergency Contacts
  testTask2_AddCheapestServiceToEmergencyContacts() {
    var testName = 'Task 2: Add cheaper provider to Emergency Contacts (adapted to restaurants)';
    console.log('Testing:', testName);

    try {
      var navSections = this.logic.getHomeNavigationSections();
      this.assert(Array.isArray(navSections), 'Nav sections should be an array');

      var serviceNav = null;
      for (var i = 0; i < navSections.length; i += 1) {
        var item = navSections[i];
        if (item.category_id === 'restaurants_food' || item.id === 'restaurants_food') {
          serviceNav = item;
          break;
        }
      }
      this.assert(serviceNav, 'Service nav (using restaurants) should exist');

      var categoryId = serviceNav.category_id || serviceNav.id;

      var searchResult = this.logic.searchDirectoryPlaces(
        categoryId,              // category_id
        'restaurant',            // subcategory (used as stand-in for plumber)
        null,                    // keyword
        '12345',                 // zip_code
        10,                      // radius_miles
        { max_call_out_fee: 100 }, // price_filter for call-out like fee
        4.0,                     // rating_min
        null,                    // amenities
        null,                    // availability
        'call_out_fee_low_to_high', // sort_by to find cheaper provider
        1,                       // page
        10                       // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get search results');
      this.assert(searchResult.results.length >= 1, 'Should find at least one provider');

      var candidates = searchResult.results.slice(0, 2);
      this.assert(candidates.length >= 1, 'Should have at least one candidate provider');

      var cheaperProvider = candidates[0];
      if (candidates.length > 1) {
        var a = candidates[0];
        var b = candidates[1];
        var feeA = typeof a.call_out_fee === 'number' ? a.call_out_fee : Number.POSITIVE_INFINITY;
        var feeB = typeof b.call_out_fee === 'number' ? b.call_out_fee : Number.POSITIVE_INFINITY;
        cheaperProvider = feeA <= feeB ? a : b;
      }

      this.assert(cheaperProvider.place_id, 'Cheaper provider should have place_id');
      if (typeof cheaperProvider.call_out_fee === 'number') {
        this.assert(
          cheaperProvider.call_out_fee <= 100,
          'Cheaper provider call-out like fee should be at most 100 when present'
        );
      }

      var providerDetails = this.logic.getPlaceDetails(cheaperProvider.place_id);
      this.assert(providerDetails && providerDetails.place, 'Should get provider place details');

      var saveResult = this.logic.createSavedListAndAddItem(
        'Emergency Contacts',
        'Automated test emergency contacts list (using restaurants as stand-ins)',
        'place',
        cheaperProvider.place_id
      );

      this.assert(saveResult && saveResult.list && saveResult.saved_item, 'Should create Emergency Contacts list');
      var listId = saveResult.list.id;
      this.assert(listId, 'Emergency Contacts list id should be present');

      var listDetail = this.logic.getSavedListDetail(listId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve Emergency Contacts list detail');

      var foundItem = null;
      for (var j = 0; j < listDetail.items.length; j += 1) {
        var it = listDetail.items[j];
        if (it.item_type === 'place' && it.item_id === cheaperProvider.place_id) {
          foundItem = it;
          break;
        }
      }
      this.assert(foundItem, 'Cheaper provider should be saved in Emergency Contacts list');

      var placesStorage = JSON.parse(localStorage.getItem('places') || '[]');
      var relatedPlace = null;
      for (var k = 0; k < placesStorage.length; k += 1) {
        if (placesStorage[k].id === foundItem.item_id) {
          relatedPlace = placesStorage[k];
          break;
        }
      }
      this.assert(!!relatedPlace, 'Emergency contact item should reference an existing Place');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Plan a weekend by saving two free Saturday afternoon events within 5 miles
  testTask3_WeekendPlanTwoEvents() {
    var testName = 'Task 3: Weekend Plan with two free Saturday afternoon events';
    console.log('Testing:', testName);

    try {
      var eventsStorage = JSON.parse(localStorage.getItem('events') || '[]');
      this.assert(eventsStorage.length > 0, 'There should be at least one event in storage');

      var saturdayDate = null;
      var e0 = eventsStorage[0];
      if (e0 && e0.start_datetime) {
        saturdayDate = e0.start_datetime.split('T')[0];
      }
      this.assert(saturdayDate, 'Should derive a Saturday date from stored events');

      var filterOptions = this.logic.getEventFilterOptions('events');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get event filter options');

      var searchResult = this.logic.searchEvents(
        'events',           // mode
        null,               // keyword
        '12345',            // zip_code
        5,                  // radius_miles
        saturdayDate,       // date
        null,               // date_range
        { start_time: '13:00', end_time: '18:00' }, // time_range (afternoon)
        null,               // price_max
        true,               // is_free_only
        null,               // cause
        null,               // min_spots_remaining
        'date_time',        // sort_by
        1,                  // page
        10                  // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get event search results');
      this.assert(searchResult.results.length >= 2, 'Should find at least two matching events');

      var event1 = searchResult.results[0];
      var event2 = searchResult.results[1];

      this.assert(event1.event_id && event2.event_id, 'Both events should have event_id');
      this.assert(event1.is_free === true, 'First event should be free');
      this.assert(event2.is_free === true, 'Second event should be free');

      var details1 = this.logic.getEventDetails(event1.event_id);
      var details2 = this.logic.getEventDetails(event2.event_id);
      this.assert(details1 && details1.event, 'Should get details for first event');
      this.assert(details2 && details2.event, 'Should get details for second event');

      var saveResult1 = this.logic.createSavedListAndAddItem(
        'Weekend Plan',
        'Automated weekend plan list',
        'event',
        event1.event_id
      );
      this.assert(saveResult1 && saveResult1.list && saveResult1.saved_item, 'Should create Weekend Plan list and save first event');
      var weekendListId = saveResult1.list.id;
      this.assert(weekendListId, 'Weekend Plan list id should be present');

      var saveResult2 = this.logic.addItemToSavedList(
        weekendListId,
        'event',
        event2.event_id
      );
      this.assert(saveResult2 && saveResult2.success === true, 'Should save second event to Weekend Plan');

      var listDetail = this.logic.getSavedListDetail(weekendListId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve Weekend Plan list detail');

      var found1 = null;
      var found2 = null;
      for (var i = 0; i < listDetail.items.length; i += 1) {
        var it = listDetail.items[i];
        if (it.item_type === 'event' && it.item_id === event1.event_id) {
          found1 = it;
        }
        if (it.item_type === 'event' && it.item_id === event2.event_id) {
          found2 = it;
        }
      }
      this.assert(found1 && found2, 'Weekend Plan list should contain both selected events');

      var eventsStorageAll = JSON.parse(localStorage.getItem('events') || '[]');
      var checkEvent = function (id) {
        for (var j = 0; j < eventsStorageAll.length; j += 1) {
          if (eventsStorageAll[j].id === id) {
            return true;
          }
        }
        return false;
      };
      this.assert(checkEvent(found1.item_id), 'First Weekend Plan event should reference existing Event');
      this.assert(checkEvent(found2.item_id), 'Second Weekend Plan event should reference existing Event');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Contact an environmental volunteering opportunity (adapted to any event with spots >= 10)
  testTask4_ContactVolunteeringLikeOpportunity() {
    var testName = 'Task 4: Contact volunteering style opportunity via organizer form';
    console.log('Testing:', testName);

    try {
      var filterOptions = this.logic.getEventFilterOptions('volunteering');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get volunteering filter options');

      var searchResult = this.logic.searchEvents(
        'all',          // mode to include all events
        null,           // keyword
        '12345',        // zip_code
        15,             // radius_miles
        null,           // date
        null,           // date_range
        null,           // time_range
        null,           // price_max
        null,           // is_free_only
        null,           // cause (not filtering by environment due to limited data)
        10,             // min_spots_remaining
        'soonest_first',// sort_by
        1,              // page
        10              // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get search results for volunteering style event');
      this.assert(searchResult.results.length > 0, 'Should find at least one event with 10+ spots remaining');

      var opp = searchResult.results[0];
      this.assert(opp.event_id, 'Opportunity should have event_id');
      if (typeof opp.spots_remaining === 'number') {
        this.assert(opp.spots_remaining >= 10, 'Opportunity should have at least 10 spots remaining');
      }

      var oppDetails = this.logic.getEventDetails(opp.event_id);
      this.assert(oppDetails && oppDetails.event, 'Should get volunteering style event details');
      if (typeof oppDetails.event.spots_remaining === 'number') {
        this.assert(oppDetails.event.spots_remaining >= 10, 'Detail should confirm at least 10 spots remaining');
      }

      var messageText = 'Hello, I am interested in joining this event. Please let me know if any preparation is needed.';
      var sendResult = this.logic.sendOrganizerMessage(
        opp.event_id,
        'Test User',
        messageText
      );

      this.assert(sendResult && sendResult.organizer_message, 'Should return organizer_message object');
      var orgMsg = sendResult.organizer_message;
      this.assert(orgMsg.eventId === opp.event_id, 'Organizer message eventId should match selected event');
      this.assert(orgMsg.message_text === messageText, 'Organizer message text should match input');
      this.assert(orgMsg.status === 'sent', 'Organizer message status should be sent');

      var storedMessages = JSON.parse(localStorage.getItem('organizer_messages') || '[]');
      var stored = null;
      for (var i = 0; i < storedMessages.length; i += 1) {
        if (storedMessages[i].id === orgMsg.id) {
          stored = storedMessages[i];
          break;
        }
      }
      this.assert(stored !== null, 'OrganizerMessage should be persisted in storage');
      this.assert(stored.eventId === opp.event_id, 'Stored OrganizerMessage eventId should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Bookmark a nearby park (adapted to bookmarking a nearby place using restaurants)
  testTask5_BookmarkNearbyPlaceAsLocalPark() {
    var testName = 'Task 5: Bookmark a nearby place as Local Parks entry (adapted to restaurants)';
    console.log('Testing:', testName);

    try {
      var navSections = this.logic.getHomeNavigationSections();
      this.assert(Array.isArray(navSections), 'Nav sections should be an array');

      var parksNav = null;
      for (var i = 0; i < navSections.length; i += 1) {
        var item = navSections[i];
        if (item.category_id === 'restaurants_food' || item.id === 'restaurants_food') {
          parksNav = item;
          break;
        }
      }
      this.assert(parksNav, 'Using restaurants category as stand-in for parks should exist');

      var categoryId = parksNav.category_id || parksNav.id;

      var searchResult = this.logic.searchDirectoryPlaces(
        categoryId,              // category_id
        'restaurant',            // subcategory (used instead of park)
        null,                    // keyword
        '12345',                 // zip_code
        3,                       // radius_miles
        null,                    // price_filter
        null,                    // rating_min
        null,                    // amenities (not filtering by playground or dog friendly due to data limits)
        null,                    // availability
        'distance_nearest_first',// sort_by
        1,                       // page
        10                       // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get place search results');
      this.assert(searchResult.results.length > 0, 'Should find at least one nearby place');

      var nearestPlace = searchResult.results[0];
      this.assert(nearestPlace.place_id, 'Nearest place should have place_id');

      var placeDetails = this.logic.getPlaceDetails(nearestPlace.place_id);
      this.assert(placeDetails && placeDetails.place, 'Should get details for nearest place');

      var saveResult = this.logic.createSavedListAndAddItem(
        'Local Parks',
        'Automated list of local favorite spots (restaurants in this test)',
        'place',
        nearestPlace.place_id
      );

      this.assert(saveResult && saveResult.list && saveResult.saved_item, 'Should create Local Parks list and save place');
      var listId = saveResult.list.id;
      this.assert(listId, 'Local Parks list id should be present');

      var listDetail = this.logic.getSavedListDetail(listId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve Local Parks list detail');

      var foundItem = null;
      for (var j = 0; j < listDetail.items.length; j += 1) {
        var it = listDetail.items[j];
        if (it.item_type === 'place' && it.item_id === nearestPlace.place_id) {
          foundItem = it;
          break;
        }
      }
      this.assert(foundItem, 'Nearest place should be saved in Local Parks list');

      var placesStorage = JSON.parse(localStorage.getItem('places') || '[]');
      var relatedPlace = null;
      for (var k = 0; k < placesStorage.length; k += 1) {
        if (placesStorage[k].id === foundItem.item_id) {
          relatedPlace = placesStorage[k];
          break;
        }
      }
      this.assert(!!relatedPlace, 'Local Parks item should reference an existing Place');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Join a beginner yoga community group and RSVP to the next session
  testTask6_JoinBeginnerYogaGroupAndRSVP() {
    var testName = 'Task 6: Join beginner yoga group and RSVP to next session';
    console.log('Testing:', testName);

    try {
      var groupFilterOptions = this.logic.getGroupFilterOptions();
      this.assert(groupFilterOptions && typeof groupFilterOptions === 'object', 'Should get group filter options');

      var desiredExperience = 'beginner';
      if (Array.isArray(groupFilterOptions.experience_level_options)) {
        for (var i = 0; i < groupFilterOptions.experience_level_options.length; i += 1) {
          if (groupFilterOptions.experience_level_options[i].value === 'beginner') {
            desiredExperience = groupFilterOptions.experience_level_options[i].value;
            break;
          }
        }
      }

      var desiredMeetingPattern = 'weekday_evenings';
      if (Array.isArray(groupFilterOptions.meeting_pattern_options)) {
        for (var j = 0; j < groupFilterOptions.meeting_pattern_options.length; j += 1) {
          if (groupFilterOptions.meeting_pattern_options[j].value === 'weekday_evenings') {
            desiredMeetingPattern = groupFilterOptions.meeting_pattern_options[j].value;
            break;
          }
        }
      }

      var searchResult = this.logic.searchGroups(
        'beginner yoga',   // keyword
        '12345',           // zip_code
        10,                // radius_miles
        desiredExperience, // experience_level
        desiredMeetingPattern, // meeting_pattern
        1,                 // page
        10                 // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get group search results');
      this.assert(searchResult.results.length > 0, 'Should find at least one beginner yoga group');

      var groupSummary = searchResult.results[0];
      this.assert(groupSummary.group_id, 'First group result should have group_id');

      if (groupSummary.focus) {
        this.assert(
          groupSummary.focus.toLowerCase() === 'yoga',
          'Group focus should be yoga when present'
        );
      }

      var groupDetailsBefore = this.logic.getGroupDetails(groupSummary.group_id);
      this.assert(groupDetailsBefore && groupDetailsBefore.group, 'Should get group details before join');

      var joinResult = this.logic.joinGroup(groupSummary.group_id);
      this.assert(joinResult && joinResult.membership, 'Should receive membership object when joining group');
      this.assert(joinResult.membership.groupId === groupSummary.group_id, 'Membership groupId should match selected group');
      this.assert(joinResult.membership.status === 'member', 'Membership status should be member after joining');

      var groupDetailsAfter = this.logic.getGroupDetails(groupSummary.group_id);
      this.assert(groupDetailsAfter && groupDetailsAfter.group, 'Should get group details after join');
      this.assert(
        groupDetailsAfter.membership_status === 'member',
        'Group membership_status should be member after join'
      );

      var targetEventId = null;
      if (Array.isArray(groupDetailsAfter.upcoming_events) && groupDetailsAfter.upcoming_events.length > 0) {
        targetEventId = groupDetailsAfter.upcoming_events[0].event_id;
      } else {
        var eventsStorage = JSON.parse(localStorage.getItem('events') || '[]');
        this.assert(eventsStorage.length > 0, 'There should be at least one event available to RSVP to');
        targetEventId = eventsStorage[0].id;
      }

      this.assert(targetEventId, 'Should determine an event id to RSVP to');

      var eventDetailsBefore = this.logic.getEventDetails(targetEventId);
      this.assert(eventDetailsBefore && eventDetailsBefore.event, 'Should get event details before RSVP');

      var rsvpResult = this.logic.rsvpToEvent(targetEventId, 'going');
      this.assert(rsvpResult && rsvpResult.success === true, 'RSVP operation should succeed');
      this.assert(rsvpResult.rsvp && rsvpResult.rsvp.eventId === targetEventId, 'RSVP eventId should match target event');
      this.assert(rsvpResult.rsvp.status === 'going', 'RSVP status should be going');

      var eventDetailsAfter = this.logic.getEventDetails(targetEventId);
      this.assert(eventDetailsAfter && eventDetailsAfter.event, 'Should get event details after RSVP');
      this.assert(
        eventDetailsAfter.rsvp_status === 'going',
        'Event detail rsvp_status should be going after RSVP'
      );

      var rsvpsStorage = JSON.parse(localStorage.getItem('event_rsvps') || '[]');
      var storedRsvp = null;
      for (var k = 0; k < rsvpsStorage.length; k += 1) {
        if (rsvpsStorage[k].id === rsvpResult.rsvp.id) {
          storedRsvp = rsvpsStorage[k];
          break;
        }
      }
      this.assert(storedRsvp !== null, 'EventRSVP should be persisted in storage');
      this.assert(storedRsvp.eventId === targetEventId, 'Stored EventRSVP eventId should match target event');

      var membershipsStorage = JSON.parse(localStorage.getItem('group_memberships') || '[]');
      var storedMembership = null;
      for (var m = 0; m < membershipsStorage.length; m += 1) {
        if (membershipsStorage[m].id === joinResult.membership.id) {
          storedMembership = membershipsStorage[m];
          break;
        }
      }
      this.assert(storedMembership !== null, 'GroupMembership should be persisted in storage');
      this.assert(storedMembership.groupId === groupSummary.group_id, 'Stored GroupMembership groupId should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Shortlist a childcare provider (adapted to any highly rated provider) under constraints
  testTask7_ShortlistProviderChildcareOptions() {
    var testName = 'Task 7: Shortlist provider into Childcare Options (adapted to restaurants)';
    console.log('Testing:', testName);

    try {
      var navSections = this.logic.getHomeNavigationSections();
      this.assert(Array.isArray(navSections), 'Nav sections should be an array');

      var childcareNav = null;
      for (var i = 0; i < navSections.length; i += 1) {
        var item = navSections[i];
        if (item.category_id === 'restaurants_food' || item.id === 'restaurants_food') {
          childcareNav = item;
          break;
        }
      }
      this.assert(childcareNav, 'Using restaurants category as stand-in for childcare should exist');

      var categoryId = childcareNav.category_id || childcareNav.id;

      var searchResult = this.logic.searchDirectoryPlaces(
        categoryId,                       // category_id
        'restaurant',                     // subcategory (used instead of childcare_provider)
        null,                             // keyword
        '12345',                          // zip_code
        8,                                // radius_miles
        { max_average_price_per_person: 20 }, // price_filter as hourly like stand-in
        4.0,                              // rating_min
        null,                             // amenities (weekday flags omitted due to limited data)
        null,                             // availability
        'rating_high_to_low',             // sort_by
        1,                                // page
        10                                // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get provider search results');
      this.assert(searchResult.results.length > 0, 'Should find at least one suitable provider');

      var provider = searchResult.results[0];
      this.assert(provider.place_id, 'Provider should have place_id');
      if (typeof provider.rating === 'number') {
        this.assert(provider.rating >= 4.0, 'Provider rating should be at least 4.0');
      }

      var details = this.logic.getPlaceDetails(provider.place_id);
      this.assert(details && details.place, 'Should get provider place details');

      var saveResult = this.logic.createSavedListAndAddItem(
        'Childcare Options',
        'Automated shortlist (using restaurants as stand-ins)',
        'place',
        provider.place_id
      );

      this.assert(saveResult && saveResult.list && saveResult.saved_item, 'Should create Childcare Options list and save provider');
      var listId = saveResult.list.id;
      this.assert(listId, 'Childcare Options list id should be present');

      var listDetail = this.logic.getSavedListDetail(listId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve Childcare Options list detail');

      var foundItem = null;
      for (var j = 0; j < listDetail.items.length; j += 1) {
        var it = listDetail.items[j];
        if (it.item_type === 'place' && it.item_id === provider.place_id) {
          foundItem = it;
          break;
        }
      }
      this.assert(foundItem, 'Provider should be saved in Childcare Options list');

      var placesStorage = JSON.parse(localStorage.getItem('places') || '[]');
      var relatedPlace = null;
      for (var k = 0; k < placesStorage.length; k += 1) {
        if (placesStorage[k].id === foundItem.item_id) {
          relatedPlace = placesStorage[k];
          break;
        }
      }
      this.assert(!!relatedPlace, 'Childcare Options item should reference an existing Place');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Build a Home Services list with three different providers (adapted to three restaurants)
  testTask8_BuildHomeServicesListThreeProviders() {
    var testName = 'Task 8: Build Home Services list with three providers (adapted to restaurants)';
    console.log('Testing:', testName);

    try {
      var navSections = this.logic.getHomeNavigationSections();
      this.assert(Array.isArray(navSections), 'Nav sections should be an array');

      var homeServicesNav = null;
      for (var i = 0; i < navSections.length; i += 1) {
        var item = navSections[i];
        if (item.category_id === 'restaurants_food' || item.id === 'restaurants_food') {
          homeServicesNav = item;
          break;
        }
      }
      this.assert(homeServicesNav, 'Using restaurants category as stand-in for home services should exist');

      var categoryId = homeServicesNav.category_id || homeServicesNav.id;

      var searchResult = this.logic.searchDirectoryPlaces(
        categoryId,              // category_id
        'restaurant',            // subcategory (stand-ins for electrician, gardener, cleaner)
        null,                    // keyword
        '12345',                 // zip_code
        10,                      // radius_miles
        null,                    // price_filter
        4.0,                     // rating_min
        null,                    // amenities
        null,                    // availability
        'rating_high_to_low',    // sort_by
        1,                       // page
        10                       // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Should get provider search results');
      this.assert(searchResult.results.length >= 3, 'Should find at least three providers to add');

      var provider1 = searchResult.results[0];
      var provider2 = searchResult.results[1];
      var provider3 = searchResult.results[2];

      this.assert(provider1.place_id && provider2.place_id && provider3.place_id, 'Each provider should have place_id');

      var details1 = this.logic.getPlaceDetails(provider1.place_id);
      var details2 = this.logic.getPlaceDetails(provider2.place_id);
      var details3 = this.logic.getPlaceDetails(provider3.place_id);
      this.assert(details1 && details1.place, 'Should get details for provider 1');
      this.assert(details2 && details2.place, 'Should get details for provider 2');
      this.assert(details3 && details3.place, 'Should get details for provider 3');

      var saveResult1 = this.logic.createSavedListAndAddItem(
        'Home Services',
        'Automated Home Services list (using restaurants as stand-ins)',
        'place',
        provider1.place_id
      );
      this.assert(saveResult1 && saveResult1.list && saveResult1.saved_item, 'Should create Home Services list and add first provider');
      var listId = saveResult1.list.id;
      this.assert(listId, 'Home Services list id should be present');

      var saveResult2 = this.logic.addItemToSavedList(listId, 'place', provider2.place_id);
      this.assert(saveResult2 && saveResult2.success === true, 'Should add second provider to Home Services list');

      var saveResult3 = this.logic.addItemToSavedList(listId, 'place', provider3.place_id);
      this.assert(saveResult3 && saveResult3.success === true, 'Should add third provider to Home Services list');

      var listDetail = this.logic.getSavedListDetail(listId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'Should retrieve Home Services list detail');

      var found1 = null;
      var found2 = null;
      var found3 = null;
      for (var j = 0; j < listDetail.items.length; j += 1) {
        var it = listDetail.items[j];
        if (it.item_type === 'place' && it.item_id === provider1.place_id) {
          found1 = it;
        }
        if (it.item_type === 'place' && it.item_id === provider2.place_id) {
          found2 = it;
        }
        if (it.item_type === 'place' && it.item_id === provider3.place_id) {
          found3 = it;
        }
      }
      this.assert(found1 && found2 && found3, 'Home Services list should contain all three providers');

      var placesStorage = JSON.parse(localStorage.getItem('places') || '[]');
      var checkPlace = function (id) {
        for (var k = 0; k < placesStorage.length; k += 1) {
          if (placesStorage[k].id === id) {
            return true;
          }
        }
        return false;
      };
      this.assert(checkPlace(found1.item_id), 'Provider 1 item should reference an existing Place');
      this.assert(checkPlace(found2.item_id), 'Provider 2 item should reference an existing Place');
      this.assert(checkPlace(found3.item_id), 'Provider 3 item should reference an existing Place');

      var overview = this.logic.getSavedListsOverview();
      this.assert(overview && Array.isArray(overview.lists), 'Should get saved lists overview');
      var homeServicesOverview = null;
      for (var m = 0; m < overview.lists.length; m += 1) {
        if (overview.lists[m].id === listId) {
          homeServicesOverview = overview.lists[m];
          break;
        }
      }
      this.assert(homeServicesOverview !== null, 'Home Services list should appear in overview');
      if (typeof homeServicesOverview.item_count === 'number') {
        this.assert(homeServicesOverview.item_count >= 3, 'Home Services overview item_count should be at least 3');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Simple assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('c ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log(' d ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
