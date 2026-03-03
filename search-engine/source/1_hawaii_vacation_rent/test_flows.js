// Test runner for business logic (Hawaii vacation rental booking site)

class TestRunner {
  constructor(businessLogic) {
    // businessLogic is expected to expose the interfaces described in the prompt
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
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (adapted to JS object literal)
    const generatedData = {
      destinations: [
        {
          id: 'oahu',
          name: 'Oahu',
          type: 'island',
          slug: 'oahu',
          synonyms: ['Oahu, Hawaii', 'Oahu Island', 'Island of Oahu'],
          parent_destination_id: null,
          center_lat: 21.4389,
          center_lng: -158.0001,
          default_zoom_level: 9
        },
        {
          id: 'maui',
          name: 'Maui',
          type: 'island',
          slug: 'maui',
          synonyms: ['Maui, Hawaii', 'Maui Island'],
          parent_destination_id: null,
          center_lat: 20.7984,
          center_lng: -156.3319,
          default_zoom_level: 9
        },
        {
          id: 'kauai',
          name: 'Kauai',
          type: 'island',
          slug: 'kauai',
          synonyms: ['Kauai, Hawaii', 'Kauai Island', 'Garden Island'],
          parent_destination_id: null,
          center_lat: 22.0964,
          center_lng: -159.5261,
          default_zoom_level: 9
        }
      ],
      promo_codes: [
        {
          id: 'aloha10',
          code: 'ALOHA10',
          description: '10% off select Hawaii stays for bookings made during the promotional period.',
          discount_type: 'percentage',
          discount_value: 10,
          currency: 'usd',
          min_nights: 2,
          active: true,
          valid_from: '2025-01-01T00:00:00Z',
          valid_to: '2027-12-31T23:59:59Z',
          applicable_destination_ids: []
        },
        {
          id: 'maui_longstay_15',
          code: 'MAUILONG15',
          description: '15% off Maui stays of 7 nights or longer.',
          discount_type: 'percentage',
          discount_value: 15,
          currency: 'usd',
          min_nights: 7,
          active: true,
          valid_from: '2025-06-01T00:00:00Z',
          valid_to: '2027-06-01T23:59:59Z',
          applicable_destination_ids: ['maui']
        },
        {
          id: 'kauai_fix_150',
          code: 'KAUAI150',
          description: '$150 off long Kauai stays of 14 nights or more.',
          discount_type: 'fixed_amount',
          discount_value: 150,
          currency: 'usd',
          min_nights: 14,
          active: true,
          valid_from: '2025-11-01T00:00:00Z',
          valid_to: '2027-11-01T23:59:59Z',
          applicable_destination_ids: ['kauai']
        }
      ],
      rental_properties: [
        {
          id: 'oahu_oceanfront_1br_budget',
          title: 'Budget Oceanfront 1BR Condo in Makaha',
          description: 'Relax in this affordable 1-bedroom oceanfront condo on Oahu\'s west side with a private lanai overlooking the water, shared pool, and free parking. Ideal for couples looking for a quiet getaway.',
          destination_id: 'oahu',
          location_label: 'Makaha, Oahu',
          latitude: 21.4745,
          longitude: -158.222,
          distance_to_waikiki_beach_miles: 28.5,
          property_type: 'condo',
          bedrooms_count: 1,
          bathrooms_count: 1,
          max_guests: 3,
          is_oceanfront: true,
          has_pool: true,
          has_wifi: true,
          has_kitchen: true,
          is_pet_friendly: false,
          has_free_parking: true,
          has_outdoor_space: true,
          yard_is_fully_fenced: false,
          amenities: ['oceanfront', 'pool', 'wifi', 'kitchen', 'free_parking', 'outdoor_space'],
          base_nightly_rate: 215,
          cleaning_fee: 120,
          service_fee: 60,
          other_fees: 0,
          currency: 'usd',
          has_long_stay_discount: false,
          long_stay_discount_min_nights: 0,
          long_stay_discount_percent: 0,
          rating: 4.4,
          review_count: 132,
          cancellation_policy_type: 'moderate',
          free_cancellation_min_days_before_checkin: 0,
          supports_free_cancellation: false,
          max_pets: 0,
          pet_fee: 0,
          supports_split_payment_50_50: true,
          supports_instant_booking: true,
          supports_promo_codes: true,
          photos: [
            'https://images.unsplash.com/photo-1501117716987-c8e1ecb2108a?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1501117716987-c8e1ecb2108a?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1518509562904-4736cbe2f454?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          primary_photo: 'https://images.unsplash.com/photo-1501117716987-c8e1ecb2108a?w=800&h=600&fit=crop&auto=format&q=80',
          host_name: 'Kai Rentals',
          host_contact_allowed: true
        },
        {
          id: 'oahu_oceanfront_1br_premium',
          title: 'Premium Oceanfront 1BR Condo with Resort Amenities',
          description: 'Upgraded oceanfront 1-bedroom condo in Ko Olina with resort pools, beach lagoons, and sunset views from your lanai. Perfect for a romantic stay on Oahu.',
          destination_id: 'oahu',
          location_label: 'Ko Olina, Oahu',
          latitude: 21.3396,
          longitude: -158.1203,
          distance_to_waikiki_beach_miles: 23,
          property_type: 'condo',
          bedrooms_count: 1,
          bathrooms_count: 1,
          max_guests: 3,
          is_oceanfront: true,
          has_pool: true,
          has_wifi: true,
          has_kitchen: true,
          is_pet_friendly: false,
          has_free_parking: true,
          has_outdoor_space: true,
          yard_is_fully_fenced: false,
          amenities: ['oceanfront', 'pool', 'wifi', 'kitchen', 'free_parking', 'outdoor_space'],
          base_nightly_rate: 245,
          cleaning_fee: 140,
          service_fee: 75,
          other_fees: 25,
          currency: 'usd',
          has_long_stay_discount: false,
          long_stay_discount_min_nights: 0,
          long_stay_discount_percent: 0,
          rating: 4.8,
          review_count: 204,
          cancellation_policy_type: 'moderate',
          free_cancellation_min_days_before_checkin: 0,
          supports_free_cancellation: false,
          max_pets: 0,
          pet_fee: 0,
          supports_split_payment_50_50: true,
          supports_instant_booking: true,
          supports_promo_codes: true,
          photos: [
            'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1512914890250-353c97c9e7e2?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          primary_photo: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80',
          host_name: 'Ko Olina Stays',
          host_contact_allowed: true
        },
        {
          id: 'oahu_pet_yard_under200',
          title: 'Pet-Friendly Kailua Cottage with Fenced Yard',
          description: 'Charming 1-bedroom cottage in Kailua with a fully fenced yard, ideal for dogs. Walk or bike to Kailua Beach, enjoy outdoor seating, BBQ, and fast Wi-Fi.',
          destination_id: 'oahu',
          location_label: 'Kailua, Oahu',
          latitude: 21.4022,
          longitude: -157.7394,
          distance_to_waikiki_beach_miles: 11.5,
          property_type: 'entire_home',
          bedrooms_count: 1,
          bathrooms_count: 1,
          max_guests: 4,
          is_oceanfront: false,
          has_pool: false,
          has_wifi: true,
          has_kitchen: true,
          is_pet_friendly: true,
          has_free_parking: true,
          has_outdoor_space: true,
          yard_is_fully_fenced: true,
          amenities: ['wifi', 'kitchen', 'pet_friendly', 'free_parking', 'outdoor_space'],
          base_nightly_rate: 185,
          cleaning_fee: 90,
          service_fee: 55,
          other_fees: 0,
          currency: 'usd',
          has_long_stay_discount: false,
          long_stay_discount_min_nights: 0,
          long_stay_discount_percent: 0,
          rating: 4.6,
          review_count: 87,
          cancellation_policy_type: 'flexible',
          free_cancellation_min_days_before_checkin: 5,
          supports_free_cancellation: true,
          max_pets: 2,
          pet_fee: 50,
          supports_split_payment_50_50: false,
          supports_instant_booking: true,
          supports_promo_codes: true,
          photos: [
            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          primary_photo: 'https://i.insider.com/60d496f8df1db80018f39f6c?format=jpeg',
          host_name: 'Aloha Cottages',
          host_contact_allowed: true
        }
      ],
      wishlists: [
        {
          id: 'favorites',
          name: 'Favorites',
          description: 'Default favorites list for quickly saving Maui, Oahu, Kauai, and Big Island rentals.',
          cover_image: 'https://media.architecturaldigest.com/photos/5ca25bf0409e48e778729cfa/master/w_1600%2Cc_limit/Grace%252520Hotel%252520Santorini%252520-%252520Infinity%252520Pool%252520Sunset%2525201.jpg',
          is_default: true,
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-03-02T09:30:00Z',
          rental_count: 3
        },
        {
          id: 'honolulu_trip',
          name: 'Honolulu Trip',
          description: 'Saved Waikiki and Honolulu-area stays for an upcoming Oahu getaway.',
          cover_image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/bd1bc966-0013-5d0d-b5a6-0d2076fad184.jpeg',
          is_default: false,
          created_at: '2026-03-02T12:15:00Z',
          updated_at: '2026-03-02T12:20:00Z',
          rental_count: 1
        },
        {
          id: 'summer_2026',
          name: 'Summer 2026',
          description: 'Handpicked Maui and Oahu rentals under specific nightly budgets for a Summer 2026 Hawaii vacation.',
          cover_image: 'https://yourkeytoburgundy.com/wp-content/uploads/2015/02/vacation-rental-1.jpg',
          is_default: false,
          created_at: '2026-03-02T13:00:00Z',
          updated_at: '2026-03-02T13:05:00Z',
          rental_count: 2
        }
      ],
      wishlist_items: [
        {
          id: 'wi_fav_kona_pool_home',
          wishlist_id: 'favorites',
          rental_property_id: 'bigisland_3br_pool_kona_home',
          added_at: '2026-03-02T09:31:00Z'
        },
        {
          id: 'wi_fav_pet_kailua',
          wishlist_id: 'favorites',
          rental_property_id: 'oahu_pet_yard_under200',
          added_at: '2026-03-02T09:32:30Z'
        },
        {
          id: 'wi_honolulu_waikiki_parking',
          wishlist_id: 'honolulu_trip',
          rental_property_id: 'waikiki_free_parking_oceanview',
          added_at: '2026-03-02T12:18:00Z'
        }
      ]
    };

    const mergeArrayById = (storageKey, items) => {
      if (!items || !items.length) return;
      const existingJson = localStorage.getItem(storageKey);
      const existing = existingJson ? JSON.parse(existingJson) : [];
      items.forEach((item) => {
        if (!existing.some((e) => e.id === item.id)) {
          existing.push(item);
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(existing));
    };

    mergeArrayById('destinations', generatedData.destinations);
    mergeArrayById('promo_codes', generatedData.promo_codes);
    mergeArrayById('rental_properties', generatedData.rental_properties);
    mergeArrayById('wishlists', generatedData.wishlists);
    mergeArrayById('wishlist_items', generatedData.wishlist_items);

    // Ensure other storage keys exist as empty arrays/objects
    if (!localStorage.getItem('bookings')) localStorage.setItem('bookings', JSON.stringify([]));
    if (!localStorage.getItem('profile')) localStorage.setItem('profile', JSON.stringify(null));
    if (!localStorage.getItem('host_messages')) localStorage.setItem('host_messages', JSON.stringify([]));
    if (!localStorage.getItem('search_contexts')) localStorage.setItem('search_contexts', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CheapestOceanfrontCondo();
    this.testTask2_CompareCleaningFeesAndFavoriteLower();
    this.testTask3_SetupBookingAndProceedToPayment();
    this.testTask4_MapViewAndHonoluluWishlist();
    this.testTask5_ApplyPromoCodeALOHA10();
    this.testTask6_LongStaySplitPaymentPlan();
    this.testTask7_PetFriendlyOutdoorSpaceAndMessageHost();
    this.testTask8_CreateAccountAndSummer2026Wishlist();

    return this.results;
  }

  // Helper: simple assertion
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

  // --- Task 1 ---
  // Book the cheapest oceanfront 1-bedroom condo on Oahu for 4 nights under $250/night
  testTask1_CheapestOceanfrontCondo() {
    console.log('Testing: Task 1 - Book cheapest oceanfront 1BR condo on Oahu');
    const testName = 'Task 1: Cheapest oceanfront 1BR Oahu condo booking start';

    try {
      // Destination selection via typeahead
      const suggestions = this.logic.getDestinationSuggestions('Oahu, Hawaii');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Oahu destination suggestions should not be empty');
      const oahuDest = suggestions[0];
      this.assert(!!oahuDest.id, 'Oahu destination should have an id');

      // Start search for given dates and guests
      const startResult = this.logic.startNewSearch(
        oahuDest.id,
        '2026-08-10',
        '2026-08-14',
        2, // adults
        0, // children
        0  // pets
      );
      const searchContext = startResult.searchContext;
      this.assert(!!searchContext, 'startNewSearch should return a searchContext');
      this.assert(searchContext.destination_id === oahuDest.id, 'SearchContext destination_id should match Oahu id');

      // Apply filters: condo, 1+ bedroom, oceanfront, max $250/night, sort by price low to high
      const updateResult = this.logic.updateSearchFiltersAndSort(
        'condo',       // propertyType
        1,             // minBedrooms
        250,           // maxPricePerNight
        null,          // minRating
        ['oceanfront'],// amenities
        null,          // cancellationFreeMinDaysBefore
        false,         // requireLongStayDiscount
        'price_low_to_high' // sortOption
      );
      const filteredContext = updateResult.searchContext;
      const filteredResults = updateResult.results;

      this.assert(!!filteredContext, 'updateSearchFiltersAndSort should return updated searchContext');
      this.assert(filteredContext.property_type_filter === 'condo', 'Property type filter should be condo');
      this.assert(Array.isArray(filteredResults) && filteredResults.length > 0, 'Filtered results should not be empty for oceanfront condos under $250');

      const firstListing = filteredResults[0];
      this.assert(firstListing.property_type === 'condo', 'First listing should be a condo');
      this.assert(firstListing.is_oceanfront === true, 'First listing should be oceanfront');
      this.assert(firstListing.bedrooms_count >= 1, 'First listing should have at least 1 bedroom');
      if (typeof firstListing.base_nightly_rate === 'number') {
        this.assert(firstListing.base_nightly_rate <= 250, 'First listing nightly rate should be <= 250, actual: ' + firstListing.base_nightly_rate);
      }

      // Start booking from current search
      const bookingStart = this.logic.startBookingFromCurrentSearch(firstListing.id);
      const booking = bookingStart.booking;
      const rental = bookingStart.rental;

      this.assert(!!booking, 'startBookingFromCurrentSearch should return a booking');
      this.assert(!!rental && rental.id === firstListing.id, 'Returned rental should match selected listing');
      this.assert(booking.rental_property_id === firstListing.id, 'Booking.rental_property_id should match selected listing id');

      const expectedNights = (new Date('2026-08-14') - new Date('2026-08-10')) / (1000 * 60 * 60 * 24);
      if (typeof booking.nights === 'number') {
        this.assert(booking.nights === expectedNights, 'Booking nights should equal date difference, got: ' + booking.nights);
      }
      this.assert(
        booking.status === 'in_progress' || booking.status === 'pending_payment',
        'Booking status should be in_progress or pending_payment, got: ' + booking.status
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 2 ---
  // Adapted: Compare two highly rated Oahu rentals and favorite the one with lower cleaning fee
  testTask2_CompareCleaningFeesAndFavoriteLower() {
    console.log('Testing: Task 2 - Compare cleaning fees and favorite lower-fee rental');
    const testName = 'Task 2: Compare cleaning fees and save lower to favorites';

    try {
      // Use Oahu as destination (adapting from Maui/Kauai to available data)
      const suggestions = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Destination suggestions for Oahu should not be empty');
      const dest = suggestions[0];

      // Start search for group of 4 (like two couples)
      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-10-10',
        '2026-10-15',
        4, // adults
        0, // children
        0  // pets
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'Search context should be returned');

      // Filters: min 1 bedroom, rating >= 4.5, sort by rating high to low
      const filterResult = this.logic.updateSearchFiltersAndSort(
        null,   // propertyType (any)
        1,      // minBedrooms
        null,   // maxPricePerNight
        4.5,    // minRating
        null,   // amenities
        null,   // cancellationFreeMinDaysBefore
        false,  // requireLongStayDiscount
        'rating_high_to_low'
      );

      const results = filterResult.results;
      this.assert(Array.isArray(results) && results.length >= 2, 'Should have at least two highly rated listings to compare');

      const firstListing = results[0];
      const secondListing = results[1];

      // Get price quotes (including cleaning fees) for both listings
      const quote1 = this.logic.getStayPriceQuote(
        firstListing.id,
        ctx.check_in,
        ctx.check_out,
        ctx.adults_count,
        ctx.children_count,
        ctx.pets_count
      );
      const quote2 = this.logic.getStayPriceQuote(
        secondListing.id,
        ctx.check_in,
        ctx.check_out,
        ctx.adults_count,
        ctx.children_count,
        ctx.pets_count
      );

      this.assert(typeof quote1.priceCleaningFee === 'number', 'First listing should have numeric cleaning fee');
      this.assert(typeof quote2.priceCleaningFee === 'number', 'Second listing should have numeric cleaning fee');

      // Decide which has lower cleaning fee
      let chosenListing = firstListing;
      let chosenCleaningFee = quote1.priceCleaningFee;

      if (quote2.priceCleaningFee < quote1.priceCleaningFee) {
        chosenListing = secondListing;
        chosenCleaningFee = quote2.priceCleaningFee;
      }

      this.assert(!!chosenListing.id, 'Chosen listing should have an id');
      this.assert(typeof chosenCleaningFee === 'number', 'Chosen cleaning fee should be numeric');

      // Save chosen listing to default wishlist (Favorites)
      const saveResult = this.logic.saveRentalToWishlist(chosenListing.id);
      this.assert(saveResult.success === true, 'saveRentalToWishlist should succeed');
      this.assert(!!saveResult.wishlist, 'saveRentalToWishlist should return wishlist');
      this.assert(!!saveResult.wishlistItem, 'saveRentalToWishlist should return wishlistItem');
      this.assert(
        saveResult.wishlistItem.rental_property_id === chosenListing.id,
        'WishlistItem.rental_property_id should match chosen listing id'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 3 ---
  // Adapted: Set up a booking for a filtered Oahu condo and proceed to payment step without entering payment
  testTask3_SetupBookingAndProceedToPayment() {
    console.log('Testing: Task 3 - Setup booking and proceed to payment step');
    const testName = 'Task 3: Booking flow to payment step (no payment details)';

    try {
      // Use Oahu as destination, 5-night stay
      const suggestions = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Oahu suggestions should not be empty');
      const dest = suggestions[0];

      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-06-01',
        '2026-06-06',
        2, // adults (adapted from 6 guests to match available data)
        0, // children
        0  // pets
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'SearchContext should be returned');

      // Filters adapted: entire condos with pool and Wi-Fi under $450, sort by price
      const filterResult = this.logic.updateSearchFiltersAndSort(
        'condo',         // propertyType
        1,               // minBedrooms
        450,             // maxPricePerNight
        null,            // minRating
        ['pool', 'wifi'],// amenities
        null,            // cancellationFreeMinDaysBefore
        false,           // requireLongStayDiscount
        'price_low_to_high'
      );
      const results = filterResult.results;
      this.assert(Array.isArray(results) && results.length > 0, 'Filtered condo results should not be empty');

      const selected = results[0];
      this.assert(selected.property_type === 'condo', 'Selected listing should be a condo');
      this.assert(selected.has_pool === true, 'Selected listing should have pool');
      this.assert(selected.has_wifi === true, 'Selected listing should have Wi-Fi');
      if (typeof selected.base_nightly_rate === 'number') {
        this.assert(selected.base_nightly_rate <= 450, 'Nightly rate should be <= 450');
      }

      // Start booking
      const bookingStart = this.logic.startBookingFromCurrentSearch(selected.id);
      let booking = bookingStart.booking;
      this.assert(!!booking, 'Booking should be created');

      const expectedNights = (new Date(ctx.check_out) - new Date(ctx.check_in)) / (1000 * 60 * 60 * 24);
      if (typeof booking.nights === 'number') {
        this.assert(booking.nights === expectedNights, 'Booking nights should match search nights');
      }

      // Fill guest info
      const guestUpdate = this.logic.updateActiveBookingGuestInfo(
        'Test',
        'Family',
        'family@example.com',
        '555-123-4567'
      );
      this.assert(guestUpdate.success === true, 'Guest info update should succeed');
      booking = guestUpdate.booking;
      this.assert(booking.guest_first_name === 'Test', 'Guest first name should be set');
      this.assert(booking.guest_last_name === 'Family', 'Guest last name should be set');
      this.assert(booking.guest_email === 'family@example.com', 'Guest email should be set');

      // Proceed to payment step without entering payment details
      const proceedResult = this.logic.proceedToPaymentStep();
      this.assert(proceedResult.success === true, 'Proceed to payment step should succeed');
      const updatedBooking = proceedResult.booking;
      this.assert(!!updatedBooking, 'Updated booking should be returned');
      this.assert(proceedResult.nextStep === 'payment_details', 'Next step should be payment_details');
      this.assert(updatedBooking.is_payment_details_entered === false, 'Payment details should not yet be entered');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 4 ---
  // Adapted: Use map view to find Oahu rental closest to Waikiki with free parking and save it to a new wishlist
  testTask4_MapViewAndHonoluluWishlist() {
    console.log('Testing: Task 4 - Map view search and saving to Honolulu wishlist');
    const testName = 'Task 4: Map view search and wishlist save';

    try {
      // Use Oahu as stand-in for Honolulu-area search
      const suggestions = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Oahu suggestions should not be empty');
      const dest = suggestions[0];

      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-03-15',
        '2026-03-18',
        2, // adults
        0, // children
        0  // pets
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'SearchContext should be returned');

      // Switch to map view
      const viewResult = this.logic.setSearchViewMode('map');
      const mapCtx = viewResult.searchContext;
      this.assert(!!mapCtx, 'SearchContext should be returned after switching view mode');
      this.assert(mapCtx.view_mode === 'map', 'View mode should be map');

      // Build map bounds around destination center
      const centerLat = dest.center_lat || 21.5;
      const centerLng = dest.center_lng || -158.0;
      const bounds = {
        north: centerLat + 1,
        south: centerLat - 1,
        east: centerLng + 1,
        west: centerLng - 1
      };

      const mapResults = this.logic.getSearchResultsMapData(bounds);
      this.assert(Array.isArray(mapResults) && mapResults.length > 0, 'Map results should not be empty');

      // Filter to rentals with free parking
      const withParking = mapResults.filter((r) => r.has_free_parking === true);
      this.assert(withParking.length > 0, 'There should be rentals with free parking');

      // Choose rental with smallest distance_to_waikiki_beach_miles (closest to Waikiki)
      let chosen = withParking[0];
      let bestDistance = typeof chosen.distance_to_waikiki_beach_miles === 'number'
        ? chosen.distance_to_waikiki_beach_miles
        : Number.POSITIVE_INFINITY;

      withParking.forEach((r) => {
        const d = typeof r.distance_to_waikiki_beach_miles === 'number'
          ? r.distance_to_waikiki_beach_miles
          : Number.POSITIVE_INFINITY;
        if (d < bestDistance) {
          bestDistance = d;
          chosen = r;
        }
      });

      this.assert(!!chosen.id, 'Chosen map rental should have id');
      this.assert(chosen.has_free_parking === true, 'Chosen rental should have free parking');

      // Fetch full rental details (simulating opening listing page)
      const rentalDetails = this.logic.getRentalDetails(chosen.id);
      this.assert(!!rentalDetails && rentalDetails.id === chosen.id, 'Rental details should match chosen rental');

      // Create a new wishlist for this trip
      const newWishlist = this.logic.createWishlist('Honolulu Trip Test', 'Wishlist created from map view selection', false);
      this.assert(!!newWishlist && !!newWishlist.id, 'New wishlist should be created with id');

      // Save rental to this wishlist
      const saveResult = this.logic.saveRentalToWishlist(chosen.id, newWishlist.id);
      this.assert(saveResult.success === true, 'Saving rental to new wishlist should succeed');
      this.assert(saveResult.wishlist.id === newWishlist.id, 'Returned wishlist should match created wishlist');
      this.assert(saveResult.wishlistItem.rental_property_id === chosen.id, 'Wishlist item rental id should match chosen rental');

      // Verify via wishlist details
      const wlDetails = this.logic.getWishlistDetails(newWishlist.id);
      this.assert(!!wlDetails.wishlist && wlDetails.wishlist.id === newWishlist.id, 'Wishlist details should return correct wishlist');
      const items = wlDetails.items || [];
      this.assert(items.length > 0, 'Wishlist should contain at least one item');
      const found = items.some((i) => i.rental && i.rental.id === chosen.id);
      this.assert(found, 'Wishlist items should include chosen rental');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 5 ---
  // Adapted: Apply promo code ALOHA10 to an Oahu stay with free cancellation at least 5 days before check-in
  testTask5_ApplyPromoCodeALOHA10() {
    console.log('Testing: Task 5 - Apply promo code ALOHA10');
    const testName = 'Task 5: Apply ALOHA10 promo code to eligible booking';

    try {
      // Use Oahu destination
      const suggestions = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Oahu suggestions should not be empty');
      const dest = suggestions[0];

      // 5-night September stay (Friday start loosely approximated)
      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-09-04', // a Friday
        '2026-09-09',
        2,
        0,
        0
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'SearchContext should be returned');

      // Filters: rating >= 4.5, free cancellation with at least 5 days before check-in
      const filterResult = this.logic.updateSearchFiltersAndSort(
        null,  // propertyType
        1,     // minBedrooms
        null,  // maxPricePerNight
        4.5,   // minRating
        null,  // amenities
        5,     // cancellationFreeMinDaysBefore (adapted from 7 to available data)
        false, // requireLongStayDiscount
        'rating_high_to_low'
      );

      const results = filterResult.results;
      this.assert(Array.isArray(results) && results.length > 0, 'Filtered results for free cancellation should not be empty');

      const selected = results[0];
      this.assert(selected.supports_free_cancellation === true, 'Selected listing should support free cancellation');
      this.assert(selected.supports_promo_codes === true, 'Selected listing should support promo codes');

      // Start booking
      const bookingStart = this.logic.startBookingFromCurrentSearch(selected.id);
      const initialBookingSummary = this.logic.getActiveBookingSummary();
      this.assert(initialBookingSummary.hasActiveBooking === true, 'There should be an active booking');
      const bookingBefore = initialBookingSummary.booking;
      this.assert(!!bookingBefore, 'Active booking should be present before applying promo');

      const totalBefore = bookingBefore.price_total_before_taxes;

      // Apply promo code ALOHA10
      const promoResult = this.logic.applyPromoCodeToActiveBooking('ALOHA10');
      this.assert(promoResult.success === true, 'Applying ALOHA10 should succeed');
      const bookingAfter = promoResult.booking;
      this.assert(bookingAfter.promo_code_applied === true, 'Booking should indicate promo_code_applied');
      this.assert(!!bookingAfter.promo_code_id, 'Booking should have promo_code_id set');

      // Ensure discount amount is positive and total decreases
      const discountAmount = bookingAfter.price_promo_discount_amount;
      if (typeof discountAmount === 'number') {
        this.assert(discountAmount > 0, 'Promo discount amount should be positive');
      }
      if (typeof totalBefore === 'number' && typeof bookingAfter.price_total_before_taxes === 'number') {
        this.assert(
          bookingAfter.price_total_before_taxes < totalBefore,
          'Total before taxes should decrease after applying promo code'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 6 ---
  // Adapted: Book a 21-night Oahu stay with kitchen and select a 50/50 split payment plan
  testTask6_LongStaySplitPaymentPlan() {
    console.log('Testing: Task 6 - Long stay with split payment plan');
    const testName = 'Task 6: 21-night stay with kitchen and 50/50 split payment';

    try {
      // Prefer Kauai as in original task, but fall back to Oahu if needed
      let destSuggestions = this.logic.getDestinationSuggestions('Kauai');
      if (!Array.isArray(destSuggestions) || destSuggestions.length === 0) {
        destSuggestions = this.logic.getDestinationSuggestions('Oahu');
      }
      this.assert(Array.isArray(destSuggestions) && destSuggestions.length > 0, 'Destination suggestions for long stay should not be empty');
      const dest = destSuggestions[0];

      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-01-03',
        '2026-01-24',
        2,
        0,
        0
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'SearchContext should be returned');

      const expectedNights = (new Date(ctx.check_out) - new Date(ctx.check_in)) / (1000 * 60 * 60 * 24);
      this.assert(expectedNights === 21, 'Date range should represent 21 nights');

      // Filters: require kitchen, sort by total price low to high if available
      const sortOption = 'total_price_low_to_high';
      const filterResult = this.logic.updateSearchFiltersAndSort(
        null,           // propertyType
        1,              // minBedrooms
        null,           // maxPricePerNight
        null,           // minRating
        ['kitchen'],    // amenities
        null,           // cancellationFreeMinDaysBefore
        false,          // requireLongStayDiscount (adapted, because generated data has none)
        sortOption
      );

      const results = filterResult.results;
      this.assert(Array.isArray(results) && results.length > 0, 'Long-stay kitchen results should not be empty');

      // Find first rental supporting 50/50 split payment
      let selected = null;
      for (let i = 0; i < results.length; i++) {
        if (results[i].supports_split_payment_50_50) {
          selected = results[i];
          break;
        }
      }
      if (!selected) {
        // Fall back to first if none explicitly support split (but generated data has such rentals)
        selected = results[0];
      }

      this.assert(!!selected.id, 'Selected rental for long stay should have id');
      this.assert(selected.has_kitchen === true, 'Selected rental should have kitchen');

      // Optional: check that total price is computed for 21 nights
      const quote = this.logic.getStayPriceQuote(
        selected.id,
        ctx.check_in,
        ctx.check_out,
        ctx.adults_count,
        ctx.children_count,
        ctx.pets_count
      );
      this.assert(quote.nights === expectedNights, 'Price quote nights should equal search nights');

      // Start booking, fill guest info, and choose 50/50 payment
      const bookingStart = this.logic.startBookingFromCurrentSearch(selected.id);
      this.assert(!!bookingStart.booking, 'Booking should be created for long stay');

      const guestUpdate = this.logic.updateActiveBookingGuestInfo(
        'Test',
        'Guest',
        'guest@example.com',
        '555-000-0000'
      );
      this.assert(guestUpdate.success === true, 'Guest info update should succeed for long stay');

      // Set payment option to 50/50 split
      const paymentResult = this.logic.setPaymentOptionForActiveBooking('pay_50_now_50_later');
      this.assert(paymentResult.success === true, 'Setting split payment option should succeed');
      const booking = paymentResult.booking;
      this.assert(booking.payment_option === 'pay_50_now_50_later', 'Booking payment_option should be pay_50_now_50_later');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 7 ---
  // Find a pet-friendly Oahu rental under $200/night with outdoor space and message the host about a fenced yard
  testTask7_PetFriendlyOutdoorSpaceAndMessageHost() {
    console.log('Testing: Task 7 - Pet-friendly rental and message host');
    const testName = 'Task 7: Pet-friendly Oahu rental and host message about fenced yard';

    try {
      const suggestions = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(suggestions) && suggestions.length > 0, 'Oahu suggestions should not be empty');
      const dest = suggestions[0];

      const startResult = this.logic.startNewSearch(
        dest.id,
        '2026-05-09',
        '2026-05-11',
        2, // adults
        0, // children
        1  // pets
      );
      const ctx = startResult.searchContext;
      this.assert(!!ctx, 'SearchContext should be returned');

      // Filters: max $200, pet-friendly, outdoor space, sort by price low to high
      const filterResult = this.logic.updateSearchFiltersAndSort(
        null, // propertyType
        1,    // minBedrooms
        200,  // maxPricePerNight
        null, // minRating
        ['pet_friendly', 'outdoor_space'], // amenities
        null, // cancellationFreeMinDaysBefore
        false,
        'price_low_to_high'
      );

      const results = filterResult.results;
      this.assert(Array.isArray(results) && results.length > 0, 'Pet-friendly outdoor-space results should not be empty');

      const selected = results[0];
      this.assert(selected.is_pet_friendly === true, 'Selected listing should be pet-friendly');
      this.assert(selected.has_outdoor_space === true, 'Selected listing should have outdoor space');
      if (typeof selected.base_nightly_rate === 'number') {
        this.assert(selected.base_nightly_rate <= 200, 'Selected listing nightly rate should be <= 200');
      }
      this.assert(selected.host_contact_allowed === true, 'Host should allow contact');

      const rentalDetails = this.logic.getRentalDetails(selected.id);
      this.assert(!!rentalDetails && rentalDetails.id === selected.id, 'Rental details should match selected listing');

      // Send message to host
      const messageText = 'Hello, we are traveling with one dog. Is the outdoor area fully fenced for pets?';
      const hostMessage = this.logic.sendHostMessageForRental(selected.id, messageText, null);
      this.assert(!!hostMessage && !!hostMessage.id, 'Host message should be created');
      this.assert(hostMessage.rental_property_id === selected.id, 'HostMessage.rental_property_id should match selected rental');
      this.assert(hostMessage.message_text === messageText, 'HostMessage.message_text should match the sent text');
      this.assert(hostMessage.direction === 'outbound', 'HostMessage.direction should be outbound');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --- Task 8 ---
  // Create an account and build a 'Summer 2026' wishlist with one Maui-like and one Oahu rental
  testTask8_CreateAccountAndSummer2026Wishlist() {
    console.log('Testing: Task 8 - Create account and Summer 2026 wishlist');
    const testName = 'Task 8: Account creation and Summer 2026 wishlist with two rentals';

    try {
      // Create or update profile with Hawaii as preferred destination
      // Choose a structured preferred destination if suggestions are available
      let prefDestId = null;
      const hawaiiSuggestions = this.logic.getDestinationSuggestions('Hawaii');
      if (Array.isArray(hawaiiSuggestions) && hawaiiSuggestions.length > 0) {
        prefDestId = hawaiiSuggestions[0].id;
      }

      const profile = this.logic.createOrUpdateProfile(
        'Test User',
        'tester@example.com',
        'TestPass123!',
        null,
        'Hawaii',
        prefDestId
      );
      this.assert(!!profile && !!profile.id, 'Profile should be created or updated');
      this.assert(profile.name === 'Test User', 'Profile name should be Test User');
      this.assert(profile.email === 'tester@example.com', 'Profile email should be tester@example.com');

      // Confirm profile retrieval
      const profileResult = this.logic.getProfile();
      this.assert(profileResult.hasProfile === true, 'hasProfile should be true');
      this.assert(!!profileResult.profile && profileResult.profile.email === 'tester@example.com', 'getProfile should return created profile');

      // First search: attempt Maui, fall back to Oahu if no results (adapting to available data)
      let destSuggestions = this.logic.getDestinationSuggestions('Maui');
      if (!Array.isArray(destSuggestions) || destSuggestions.length === 0) {
        destSuggestions = this.logic.getDestinationSuggestions('Oahu');
      }
      this.assert(Array.isArray(destSuggestions) && destSuggestions.length > 0, 'Destination suggestions for first Summer 2026 search should not be empty');
      let dest = destSuggestions[0];

      let startResult = this.logic.startNewSearch(
        dest.id,
        '2026-07-10',
        '2026-07-15',
        2,
        0,
        0
      );
      let ctx = startResult.searchContext;

      // Filters: max $300/night, rating >= 4.5
      let filterResult = this.logic.updateSearchFiltersAndSort(
        null,
        1,
        300,
        4.5,
        null,
        null,
        false,
        'price_low_to_high'
      );
      let results = filterResult.results;

      // If no results (e.g., Maui empty), retry with Oahu
      if (!Array.isArray(results) || results.length === 0) {
        const oahuSuggestions = this.logic.getDestinationSuggestions('Oahu');
        this.assert(Array.isArray(oahuSuggestions) && oahuSuggestions.length > 0, 'Oahu suggestions should not be empty for fallback');
        dest = oahuSuggestions[0];
        startResult = this.logic.startNewSearch(
          dest.id,
          '2026-07-10',
          '2026-07-15',
          2,
          0,
          0
        );
        ctx = startResult.searchContext;
        filterResult = this.logic.updateSearchFiltersAndSort(
          null,
          1,
          300,
          4.5,
          null,
          null,
          false,
          'price_low_to_high'
        );
        results = filterResult.results;
      }

      this.assert(Array.isArray(results) && results.length > 0, 'First Summer 2026 search results should not be empty after fallback');
      const firstRental = results[0];
      this.assert(typeof firstRental.base_nightly_rate === 'number', 'First rental should have base_nightly_rate');
      this.assert(firstRental.base_nightly_rate <= 300, 'First rental nightly rate should be <= 300');
      this.assert(firstRental.rating >= 4.5, 'First rental rating should be >= 4.5');

      // Create (or re-create) Summer 2026 wishlist
      const summerWishlist = this.logic.createWishlist('Summer 2026', 'Summer 2026 Hawaii vacation picks', false);
      this.assert(!!summerWishlist && !!summerWishlist.id, 'Summer 2026 wishlist should be created');

      // Save first rental to Summer 2026 wishlist
      const saveFirst = this.logic.saveRentalToWishlist(firstRental.id, summerWishlist.id);
      this.assert(saveFirst.success === true, 'Saving first rental to Summer 2026 wishlist should succeed');
      this.assert(saveFirst.wishlist.id === summerWishlist.id, 'Wishlist id in response should match Summer 2026 wishlist id');

      // Second search: Oahu with tighter price cap (<= $220) and rating >= 4.5
      const oahuSuggestions2 = this.logic.getDestinationSuggestions('Oahu');
      this.assert(Array.isArray(oahuSuggestions2) && oahuSuggestions2.length > 0, 'Oahu suggestions should not be empty for second search');
      const oahuDest = oahuSuggestions2[0];

      const startResult2 = this.logic.startNewSearch(
        oahuDest.id,
        ctx.check_in,
        ctx.check_out,
        ctx.adults_count,
        ctx.children_count,
        ctx.pets_count
      );
      const ctx2 = startResult2.searchContext;

      const filterResult2 = this.logic.updateSearchFiltersAndSort(
        null,
        1,
        220,
        4.5,
        null,
        null,
        false,
        'price_low_to_high'
      );
      const results2 = filterResult2.results;
      this.assert(Array.isArray(results2) && results2.length > 0, 'Second Summer 2026 search results should not be empty');

      const secondRental = results2[0];
      this.assert(typeof secondRental.base_nightly_rate === 'number', 'Second rental should have base_nightly_rate');
      this.assert(secondRental.base_nightly_rate <= 220, 'Second rental nightly rate should be <= 220');
      this.assert(secondRental.rating >= 4.5, 'Second rental rating should be >= 4.5');

      // Save second rental to same Summer 2026 wishlist
      const saveSecond = this.logic.saveRentalToWishlist(secondRental.id, summerWishlist.id);
      this.assert(saveSecond.success === true, 'Saving second rental to Summer 2026 wishlist should succeed');
      this.assert(saveSecond.wishlist.id === summerWishlist.id, 'Wishlist id should match Summer 2026 wishlist id');

      // Verify wishlist now has at least two items including both rentals
      const wlDetails = this.logic.getWishlistDetails(summerWishlist.id);
      const items = wlDetails.items || [];
      this.assert(items.length >= 2, 'Summer 2026 wishlist should contain at least two items');
      const hasFirst = items.some((i) => i.rental && i.rental.id === firstRental.id);
      const hasSecond = items.some((i) => i.rental && i.rental.id === secondRental.id);
      this.assert(hasFirst, 'Summer 2026 wishlist should contain first rental');
      this.assert(hasSecond, 'Summer 2026 wishlist should contain second rental');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
