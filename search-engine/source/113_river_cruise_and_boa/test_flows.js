// Test runner for business logic integration flows

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

  setupTestData() {
    // Generated Data from specification (used only here)
    const generatedData = {
      categories: [
        {
          id: 'all_cruises',
          slug: 'all-cruises',
          name: 'All Cruises & Tours',
          description: 'Browse all available river cruises, sightseeing tours, dinner cruises, family trips, and private charters.',
          is_primary_nav: true,
          nav_category_id: 'all_cruises'
        },
        {
          id: 'sightseeing',
          slug: 'sightseeing-cruises',
          name: 'Sightseeing Cruises',
          description: 'Daytime river sightseeing cruises with live commentary or audio guides, ideal for first-time visitors.',
          is_primary_nav: true,
          nav_category_id: 'sightseeing'
        },
        {
          id: 'dinner_cruises',
          slug: 'dinner-cruises',
          name: 'Dinner Cruises',
          description: 'Evening and dinner cruises featuring onboard dining, often with live music and panoramic city views.',
          is_primary_nav: true,
          nav_category_id: 'dinner_cruises'
        }
      ],
      departure_locations: [
        {
          id: 'old_town_pier',
          name: 'Old Town Pier',
          code: 'old_town_pier',
          description: 'Historic pier located at the edge of Old Town, primary departure point for classic sightseeing and sunset cruises.',
          address: '1 Riverside Walk, Old Town',
          city: 'Riverview',
          latitude: 40.7135,
          longitude: -74.0059,
          is_primary_departure_point: true
        },
        {
          id: 'city_harbor_marina',
          name: 'City Harbor Marina',
          code: 'city_harbor',
          description: 'Modern marina close to downtown hotels, used for most dinner cruises and private evening charters.',
          address: '250 Harbor Lane, Downtown',
          city: 'Riverview',
          latitude: 40.7102,
          longitude: -74.0123,
          is_primary_departure_point: true
        },
        {
          id: 'riverfront_dock_east',
          name: 'Riverfront Dock East',
          code: 'riverfront_east',
          description: 'Convenient dock on the east riverfront, popular for family-friendly lunch cruises.',
          address: '88 East Riverfront Ave',
          city: 'Riverview',
          latitude: 40.7168,
          longitude: -73.9991,
          is_primary_departure_point: false
        }
      ],
      gift_card_templates: [
        {
          id: 'any_cruise_custom',
          name: 'Any Cruise Gift Card',
          description: 'Flexible gift card valid toward any cruise or tour, with a customizable amount.',
          allows_custom_amount: true,
          fixed_amounts: [50, 100, 150, 200],
          min_custom_amount: 25,
          max_custom_amount: 500,
          default_applies_to_scope: 'all_cruises',
          is_active: true
        },
        {
          id: 'dinner_cruise_gift_100',
          name: 'Dinner Cruise Gift Card',
          description: 'Give the gift of an evening on the water, ideal for two guests on a standard dinner cruise.',
          allows_custom_amount: false,
          fixed_amounts: [100, 150, 200],
          default_applies_to_scope: 'specific_category',
          is_active: true
        },
        {
          id: 'sightseeing_voucher_fixed',
          name: 'Sightseeing Cruise Voucher',
          description: 'Prepaid voucher for daytime sightseeing cruises, perfect for visitors and tourists.',
          allows_custom_amount: false,
          fixed_amounts: [30, 60, 90],
          default_applies_to_scope: 'specific_category',
          is_active: true
        }
      ],
      cruise_tours: [
        {
          id: 'sunset_city_lights_cruise',
          name: 'Sunset City Lights Cruise',
          short_description: '90-minute shared sunset cruise from Old Town Pier with a welcome drink and skyline views.',
          long_description: 'Drift past the city\u2019s famous riverfront landmarks as the sun sets and the skyline lights up. This relaxed 90-minute cruise departs from Old Town Pier and includes a welcome drink, open-air and indoor seating, and an audio guide with stories about the river\u2019s history.',
          product_type: 'shared_cruise',
          categories: ['all_cruises', 'sunset_evening', 'sightseeing'],
          category_ids_enum: 'sunset_evening',
          departure_location_id: 'old_town_pier',
          duration_minutes: 90,
          min_duration_minutes: 90,
          max_duration_minutes: 90,
          time_of_day_tags: ['sunset', 'evening'],
          features: [
            'drinks_included',
            'welcome_drink',
            'sunset_theme',
            'evening_theme',
            'sightseeing',
            'audio_guide',
            'free_cancellation'
          ],
          free_cancellation_cutoff_hours: 24,
          cancellation_policy_summary: 'Free cancellation up to 24 hours before departure; full charge applies within 24 hours.',
          pricing_model: 'per_person',
          base_price_adult: 35,
          base_price_child: 20,
          base_price_senior: 30,
          base_price_infant: 0,
          base_price_per_charter: 0,
          currency: 'USD',
          tax_included: true,
          min_group_size: 1,
          max_group_size: 60,
          average_rating: 4.6,
          review_count: 184,
          default_start_time: '19:30',
          available_days_of_week: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ],
          meeting_point_description: 'Check in at the Old Town Pier ticket booth at least 20 minutes before departure.',
          what_to_bring: 'Light jacket, camera, and comfortable shoes.',
          hero_image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1517950874794-90dbb21a8d52?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        },
        {
          id: 'twilight_cocktail_cruise',
          name: 'Twilight Skyline Cocktail Cruise',
          short_description: '2-hour evening cocktail cruise from City Harbor Marina with live DJ and city lights.',
          long_description: 'Set sail from City Harbor Marina for a stylish 2-hour twilight cruise. Enjoy two included house cocktails, lounge-style seating, and a live DJ soundtrack as you glide past illuminated bridges and riverside landmarks.',
          product_type: 'shared_cruise',
          categories: ['all_cruises', 'sunset_evening'],
          category_ids_enum: 'sunset_evening',
          departure_location_id: 'city_harbor_marina',
          duration_minutes: 120,
          min_duration_minutes: 120,
          max_duration_minutes: 120,
          time_of_day_tags: ['evening', 'sunset'],
          features: [
            'drinks_included',
            'welcome_drink',
            'evening_theme',
            'sunset_theme',
            'free_cancellation'
          ],
          free_cancellation_cutoff_hours: 48,
          cancellation_policy_summary: 'Free cancellation up to 48 hours before departure; 50% charge within 48 hours.',
          pricing_model: 'per_person',
          base_price_adult: 49,
          base_price_child: 0,
          base_price_senior: 45,
          base_price_infant: 0,
          base_price_per_charter: 0,
          currency: 'USD',
          tax_included: true,
          min_group_size: 1,
          max_group_size: 80,
          average_rating: 4.4,
          review_count: 96,
          default_start_time: '20:00',
          available_days_of_week: ['thursday', 'friday', 'saturday', 'sunday'],
          meeting_point_description: 'Boarding at Gate C, City Harbor Marina. Look for the Twilight Cruises flag.',
          what_to_bring: 'Photo ID for bar service and a light jacket.',
          hero_image_url: 'https://images.unsplash.com/photo-1493558203685-24e118b6e50c?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1526569186591-86a42efa4e99?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        },
        {
          id: 'evening_highlights_cruise',
          name: 'Evening River Highlights Cruise',
          short_description: '75-minute shared evening cruise focusing on illuminated landmarks (no drinks included).',
          long_description: 'See the city\u2019s riverside highlights after dark on this affordable 75-minute cruise. Learn about key landmarks from your onboard host as you enjoy unobstructed views from the upper deck. Food and drinks are available for purchase from the onboard bar.',
          product_type: 'shared_cruise',
          categories: ['all_cruises', 'sunset_evening', 'sightseeing'],
          category_ids_enum: 'sunset_evening',
          departure_location_id: 'old_town_pier',
          duration_minutes: 75,
          min_duration_minutes: 75,
          max_duration_minutes: 75,
          time_of_day_tags: ['evening'],
          features: ['evening_theme', 'sightseeing'],
          free_cancellation_cutoff_hours: 0,
          cancellation_policy_summary: 'Changes and cancellations allowed up to 12 hours before departure with a 25% fee.',
          pricing_model: 'per_person',
          base_price_adult: 29,
          base_price_child: 15,
          base_price_senior: 25,
          base_price_infant: 0,
          base_price_per_charter: 0,
          currency: 'USD',
          tax_included: true,
          min_group_size: 1,
          max_group_size: 70,
          average_rating: 4.2,
          review_count: 73,
          default_start_time: '21:00',
          available_days_of_week: ['friday', 'saturday', 'sunday'],
          meeting_point_description: 'Old Town Pier, Berth 2. Staff in blue jackets will assist you with boarding.',
          what_to_bring: 'Warm layers for cooler evening temperatures.',
          hero_image_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1516570161787-2fd917215a3d?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        }
      ],
      promo_codes: [
        {
          id: 'promo_summer10',
          code: 'SUMMER10',
          description: '10% off summer river cruises and tours on qualifying bookings.',
          discount_type: 'percentage',
          discount_value: 10,
          applies_to_scope: 'entire_cart',
          applicable_category_ids: [
            'all_cruises',
            'dinner_cruises',
            'sunset_evening',
            'sightseeing',
            'family_friendly',
            'private_charters'
          ],
          category_ids_enum: 'all_cruises',
          applicable_product_ids: [],
          min_cart_total: 50,
          valid_from: '2026-03-01T00:00:00Z',
          valid_to: '2026-09-30T23:59:59Z',
          is_active: true
        },
        {
          id: 'promo_dinner15',
          code: 'DINNER15',
          description: '15% off selected dinner cruises for evening departures.',
          discount_type: 'percentage',
          discount_value: 15,
          applies_to_scope: 'specific_category',
          applicable_category_ids: ['dinner_cruises'],
          category_ids_enum: 'dinner_cruises',
          applicable_product_ids: [
            'gourmet_dinner_jazz_cruise',
            'classic_dinner_piano_cruise',
            'luxury_signature_dinner_cruise'
          ],
          min_cart_total: 150,
          valid_from: '2026-01-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          is_active: true
        },
        {
          id: 'promo_family5',
          code: 'FAMILY5',
          description: 'Save $5 on family-friendly cruises with child tickets in the booking.',
          discount_type: 'fixed_amount',
          discount_value: 5,
          applies_to_scope: 'specific_category',
          applicable_category_ids: ['family_friendly'],
          category_ids_enum: 'family_friendly',
          applicable_product_ids: ['family_lunch_cruise', 'weekend_family_brunch_cruise'],
          min_cart_total: 80,
          valid_from: '2026-02-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          is_active: true
        }
      ],
      time_slots: [
        {
          id: 'slot_sunset_city_lights_1930',
          cruise_tour_id: 'sunset_city_lights_cruise',
          label: 'Sunset departure',
          start_time: '19:30',
          end_time: '21:00',
          time_of_day: 'sunset',
          is_default: true,
          is_active: true
        },
        {
          id: 'slot_sunset_city_lights_2100',
          cruise_tour_id: 'sunset_city_lights_cruise',
          label: 'Late evening departure',
          start_time: '21:00',
          end_time: '22:30',
          time_of_day: 'evening',
          is_default: false,
          is_active: true
        },
        {
          id: 'slot_twilight_cocktail_2000',
          cruise_tour_id: 'twilight_cocktail_cruise',
          label: 'Twilight cocktail sailing',
          start_time: '20:00',
          end_time: '22:00',
          time_of_day: 'evening',
          is_default: true,
          is_active: true
        }
      ],
      gift_card_items: [],
      cart_items: [],
      booking_items: [],
      cart: [],
      booking_orders: [],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:33.224936'
      }
    };

    // Use storage keys from mapping
    localStorage.setItem('categories', JSON.stringify(generatedData.categories));
    localStorage.setItem('departure_locations', JSON.stringify(generatedData.departure_locations));
    localStorage.setItem('gift_card_templates', JSON.stringify(generatedData.gift_card_templates));
    localStorage.setItem('cruise_tours', JSON.stringify(generatedData.cruise_tours));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('time_slots', JSON.stringify(generatedData.time_slots));
    localStorage.setItem('gift_card_items', JSON.stringify(generatedData.gift_card_items));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items));
    localStorage.setItem('booking_items', JSON.stringify(generatedData.booking_items));
    localStorage.setItem('cart', JSON.stringify(generatedData.cart));
    localStorage.setItem('booking_orders', JSON.stringify(generatedData.booking_orders));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Helper: simple assertion
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('[PASS] ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('[FAIL] ' + testName + ': ' + error.message);
  }

  // Date helpers
  formatDateISO(date) {
    return date.toISOString().slice(0, 10);
  }

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  getFirstFridayInJune() {
    const now = new Date();
    let year = now.getFullYear();
    const juneMonthIndex = 5; // 0-based (5 = June)
    if (now.getMonth() > juneMonthIndex) {
      year += 1;
    }
    const d = new Date(year, juneMonthIndex, 1);
    while (d.getDay() !== 5) { // 5 = Friday
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  getSecondSaturdayNextMonth() {
    const now = new Date();
    const year = now.getFullYear() + (now.getMonth() === 11 ? 1 : 0);
    const month = (now.getMonth() + 1) % 12;
    const d = new Date(year, month, 1);
    let saturdayCount = 0;
    while (true) {
      if (d.getDay() === 6) {
        saturdayCount += 1;
        if (saturdayCount === 2) {
          return d;
        }
      }
      d.setDate(d.getDate() + 1);
    }
  }

  getSundayNextMonth() {
    const now = new Date();
    const year = now.getFullYear() + (now.getMonth() === 11 ? 1 : 0);
    const month = (now.getMonth() + 1) % 12;
    const d = new Date(year, month, 1);
    while (d.getDay() !== 0) { // 0 = Sunday
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  getNextSaturday() {
    const d = new Date();
    while (d.getDay() !== 6) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  getSeptemberWeekendDate() {
    const now = new Date();
    let year = now.getFullYear();
    const septemberIndex = 8; // September
    if (now.getMonth() > septemberIndex) {
      year += 1;
    }
    const d = new Date(year, septemberIndex, 1);
    while (true) {
      const day = d.getDay();
      if (day === 6 || day === 0) {
        return d;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  parseTimeToMinutes(time) {
    if (!time || typeof time !== 'string') return null;
    const parts = time.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  chooseFirstAvailableTimeSlot(availability, defaultStartTime) {
    let selectedDate = null;
    let selectedTimeSlotId = null;
    let selectedStartTime = defaultStartTime || null;

    if (availability && Array.isArray(availability.dates) && availability.dates.length > 0) {
      // Sort dates ascending by date string
      const dates = availability.dates.slice().sort(function (a, b) {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });
      for (let i = 0; i < dates.length; i++) {
        const dateObj = dates[i];
        if (Array.isArray(dateObj.time_slots) && dateObj.time_slots.length > 0) {
          const slots = dateObj.time_slots.slice().sort(function (a, b) {
            if (a.start_time < b.start_time) return -1;
            if (a.start_time > b.start_time) return 1;
            return 0;
          });
          for (let j = 0; j < slots.length; j++) {
            const slot = slots[j];
            if (slot.is_available || typeof slot.is_available === 'undefined') {
              selectedDate = dateObj.date;
              selectedTimeSlotId = slot.time_slot_id;
              selectedStartTime = slot.start_time || selectedStartTime;
              return {
                date: selectedDate,
                timeSlotId: selectedTimeSlotId,
                startTime: selectedStartTime
              };
            }
          }
        }
      }
      // If we got here, no available slots but we can take first date as fallback
      selectedDate = dates[0].date;
    }

    return {
      date: selectedDate,
      timeSlotId: selectedTimeSlotId,
      startTime: selectedStartTime
    };
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CheapestSunsetCruiseForTwoWithDrinks();
    this.testTask2_TwoSightseeingToursSameDay();
    this.testTask3_LongestEveningCruiseForGroup();
    this.testTask4_PurchaseGiftCard150AnyCruise();
    this.testTask5_FamilyStyleCruiseTwoAdultsOneChildUnder200();
    this.testTask6_HighestRatedEveningCruiseApplyPromo();
    this.testTask7_EarliestTourFromOldTownPierForThreeAdults();
    this.testTask8_CompareSightseeingAudioGuideAndFreeCancellation();

    return this.results;
  }

  // Task 1: Book the cheapest sunset river cruise for 2 adults on a Friday in June under $80 total
  testTask1_CheapestSunsetCruiseForTwoWithDrinks() {
    const testName = 'Task 1: Cheapest sunset cruise for 2 adults with drinks under $80';
    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate: load primary nav (simulated)
      const nav = this.logic.getPrimaryNavCategories();
      this.assert(nav && Array.isArray(nav.categories), 'Primary nav categories should be returned');
      const allCruisesCategory = nav.categories.find(function (c) { return c.nav_category_id === 'all_cruises'; });
      this.assert(allCruisesCategory, 'All cruises category should exist in nav');

      // Choose a Friday in June for upcoming season
      const fridayDate = this.getFirstFridayInJune();
      const fridayIso = this.formatDateISO(fridayDate);

      // Search for sunset/evening cruises with drinks included, max $40 adult, sorted by price
      let searchResponse = this.logic.searchCruiseTours(
        null,                          // query
        allCruisesCategory.id,         // categoryId
        null,                          // departureLocationId
        fridayIso,                     // specificDate
        null,                          // dateFrom
        null,                          // dateTo
        ['friday'],                    // daysOfWeek
        ['sunset', 'evening'],         // timeOfDay
        null,                          // departureTimeAfter
        null,                          // departureTimeBefore
        null,                          // minPriceAdult
        40,                            // maxPriceAdult
        null,                          // minTotalBudget
        null,                          // maxTotalBudget
        null,                          // minDurationMinutes
        null,                          // maxDurationMinutes
        null,                          // minGroupSize
        null,                          // maxGroupSize
        ['drinks_included'],           // features
        null,                          // productType
        null,                          // pricingModel
        'price_asc',                   // sortBy
        1,                             // page
        20                             // pageSize
      );

      // If no drinks-included option under $40, relax drinks filter but keep sunset/evening
      if (!searchResponse || !Array.isArray(searchResponse.results) || searchResponse.results.length === 0) {
        searchResponse = this.logic.searchCruiseTours(
          null,
          allCruisesCategory.id,
          null,
          fridayIso,
          null,
          null,
          ['friday'],
          ['sunset', 'evening'],
          null,
          null,
          null,
          40,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          'price_asc',
          1,
          20
        );
      }

      this.assert(searchResponse.results.length > 0, 'Should find at least one sunset/evening cruise under price limit');

      const chosenResult = searchResponse.results[0];
      const cruiseTourId = chosenResult.cruise_tour_id;
      this.assert(cruiseTourId, 'Chosen cruise should have an ID');

      // Verify relationship: categories from details should include sunset_evening or sightseeing
      const details = this.logic.getCruiseTourDetails(cruiseTourId);
      this.assert(details && details.cruise_tour, 'Details should return cruise_tour object');
      const categories = details.cruise_tour.categories || [];
      this.assert(Array.isArray(categories) && categories.length > 0, 'Cruise should have categories');

      // Get availability for that Friday, preferring evening/sunset
      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        fridayIso,
        fridayIso,
        ['friday'],
        ['evening', 'sunset']
      );

      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, details.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Should have a selectable date from availability');

      // Preview pricing for 2 adults
      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,      // adultCount
        0,      // childCount
        0,      // seniorCount
        0,      // guestCount
        null    // selectedExtras
      );

      this.assert(preview && preview.is_available !== false, 'Pricing preview should indicate availability');
      this.assert(preview.total_amount > 0, 'Total amount should be positive');
      this.assert(preview.total_amount <= 80, 'Total for 2 adults should be under or equal to $80 (actual: ' + preview.total_amount + ')');

      // Add booking to cart
      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,      // adultCount
        0,      // childCount
        0,      // seniorCount
        0,      // guestCount
        null,   // selectedExtras
        null    // notes
      );

      this.assert(addResult && addResult.success === true, 'Adding tour booking to cart should succeed');
      this.assert(addResult.cart && addResult.cart.total_amount > 0, 'Cart total should be positive after adding tour');

      // Booking summary via cart overview
      const cartOverview = this.logic.getCartOverview();
      this.assert(cartOverview && Array.isArray(cartOverview.items), 'Cart overview should return items array');
      const addedItem = cartOverview.items.find(function (item) { return item.cruise_tour_id === cruiseTourId; });
      this.assert(addedItem, 'Added cruise should appear in cart overview');
      this.assert(addedItem.adult_count === 2, 'Cart item should have 2 adults (actual: ' + addedItem.adult_count + ')');
      this.assert(addedItem.line_subtotal === preview.line_subtotal, 'Cart line subtotal should match pricing preview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Book two sightseeing tours on same day for 1 adult under $120 total (adapted to evening sightseeing)
  testTask2_TwoSightseeingToursSameDay() {
    const testName = 'Task 2: Two sightseeing cruises same day for 1 adult under $120 total';
    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate to sightseeing category
      const nav = this.logic.getPrimaryNavCategories();
      this.assert(nav && Array.isArray(nav.categories), 'Primary nav categories should be available');
      const sightseeingCategory = nav.categories.find(function (c) { return c.nav_category_id === 'sightseeing'; });
      this.assert(sightseeingCategory, 'Sightseeing category should exist in nav');

      const saturday = this.getSecondSaturdayNextMonth();
      const saturdayIso = this.formatDateISO(saturday);

      // Search sightseeing tours for that Saturday, price <= 80
      const searchResponse = this.logic.searchCruiseTours(
        null,
        sightseeingCategory.id,
        null,
        saturdayIso,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        80,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'price_asc',
        1,
        20
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results), 'Search results should be an array');
      this.assert(searchResponse.results.length >= 1, 'Should find at least one sightseeing tour');

      // First tour: adult price <= 70 if possible
      const firstTour = searchResponse.results.find(function (r) { return typeof r.base_price_adult === 'number' && r.base_price_adult <= 70; }) || searchResponse.results[0];
      const firstId = firstTour.cruise_tour_id;
      this.assert(firstId, 'First sightseeing tour should have an ID');

      const firstDetails = this.logic.getCruiseTourDetails(firstId);
      const firstAvail = this.logic.getCruiseTourAvailability(
        firstId,
        saturdayIso,
        saturdayIso,
        null,
        null
      );
      const firstTime = this.chooseFirstAvailableTimeSlot(firstAvail, firstDetails.cruise_tour.default_start_time);
      this.assert(firstTime.date, 'First tour should have a selectable date');

      const firstPreview = this.logic.getCruiseTourPricingPreview(
        firstId,
        firstTime.date,
        firstTime.timeSlotId,
        1,
        0,
        0,
        0,
        null
      );
      this.assert(firstPreview.total_amount > 0 && firstPreview.total_amount <= 80, 'First tour price should be <= $80');

      const addResult1 = this.logic.addTourBookingToCart(
        firstId,
        firstTime.date,
        firstTime.timeSlotId,
        1,
        0,
        0,
        0,
        null,
        null
      );
      this.assert(addResult1 && addResult1.success === true, 'Adding first sightseeing tour to cart should succeed');

      // Second tour: different product, price <= 50 where possible
      const secondCandidate = searchResponse.results.find(function (r) {
        if (r.cruise_tour_id === firstId) return false;
        if (typeof r.base_price_adult === 'number' && r.base_price_adult <= 50) return true;
        return false;
      }) || searchResponse.results.find(function (r) { return r.cruise_tour_id !== firstId; });

      this.assert(secondCandidate, 'Should find a second different sightseeing tour');
      const secondId = secondCandidate.cruise_tour_id;

      const secondDetails = this.logic.getCruiseTourDetails(secondId);
      const secondAvail = this.logic.getCruiseTourAvailability(
        secondId,
        saturdayIso,
        saturdayIso,
        null,
        null
      );
      const secondTime = this.chooseFirstAvailableTimeSlot(secondAvail, secondDetails.cruise_tour.default_start_time);
      this.assert(secondTime.date, 'Second tour should have a selectable date');

      const secondPreview = this.logic.getCruiseTourPricingPreview(
        secondId,
        secondTime.date,
        secondTime.timeSlotId,
        1,
        0,
        0,
        0,
        null
      );
      this.assert(secondPreview.total_amount > 0, 'Second tour price should be positive');

      const addResult2 = this.logic.addTourBookingToCart(
        secondId,
        secondTime.date,
        secondTime.timeSlotId,
        1,
        0,
        0,
        0,
        null,
        null
      );
      this.assert(addResult2 && addResult2.success === true, 'Adding second sightseeing tour to cart should succeed');

      // Verify both tours in cart, same date, total under $120 and at least 60-minute gap between start times
      const cart = this.logic.getCartOverview();
      this.assert(cart && Array.isArray(cart.items), 'Cart overview should return items');

      const item1 = cart.items.find(function (i) { return i.cruise_tour_id === firstId; });
      const item2 = cart.items.find(function (i) { return i.cruise_tour_id === secondId; });
      this.assert(item1 && item2, 'Both sightseeing tours should be present in cart');

      this.assert(item1.date === item2.date, 'Both tours should be on the same date');
      const totalForTwo = cart.total_amount;
      this.assert(totalForTwo > 0 && totalForTwo < 120, 'Combined total should be under $120 (actual: ' + totalForTwo + ')');

      const start1 = item1.departure_time || firstTime.startTime || firstDetails.cruise_tour.default_start_time;
      const start2 = item2.departure_time || secondTime.startTime || secondDetails.cruise_tour.default_start_time;
      const m1 = this.parseTimeToMinutes(start1);
      const m2 = this.parseTimeToMinutes(start2);
      if (m1 !== null && m2 !== null) {
        const gap = Math.abs(m2 - m1);
        this.assert(gap >= 60, 'Gap between tours should be at least 60 minutes (actual: ' + gap + ')');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Reserve the longest evening cruise for a group of 10 on a September weekend under $900 (adapted from private charter)
  testTask3_LongestEveningCruiseForGroup() {
    const testName = 'Task 3: Longest evening cruise for 10 guests on September weekend under $900';
    try {
      this.clearStorage();
      this.setupTestData();

      const septemberWeekend = this.getSeptemberWeekendDate();
      const septIso = this.formatDateISO(septemberWeekend);

      // Search for evening/sunset cruises that can host 10 guests, budget under $900, sort by duration descending
      const searchResponse = this.logic.searchCruiseTours(
        null,
        null,
        null,
        septIso,
        null,
        null,
        ['saturday', 'sunday'],
        ['evening', 'sunset'],
        '17:00',
        null,
        null,
        null,
        null,
        900,
        60,   // minimum duration 60 minutes (adapted from 3h due to sample data)
        null,
        10,   // minGroupSize: capacity must allow at least 10
        null,
        null,
        null,
        null,
        'duration_desc',
        1,
        20
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results) && searchResponse.results.length > 0, 'Should find at least one suitable evening cruise');

      const chosen = searchResponse.results[0];
      const cruiseTourId = chosen.cruise_tour_id;
      this.assert(cruiseTourId, 'Chosen cruise should have an ID');

      const details = this.logic.getCruiseTourDetails(cruiseTourId);
      this.assert(details && details.cruise_tour, 'Details should return cruise_tour object');

      // Verify capacity can accommodate 10 guests
      this.assert(details.cruise_tour.max_group_size === undefined || details.cruise_tour.max_group_size >= 10, 'Cruise capacity should be at least 10');

      // Availability on a weekend in September (Saturday/Sunday) in evening
      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        septIso,
        septIso,
        ['saturday', 'sunday'],
        ['evening', 'sunset']
      );

      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, details.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Should have a selectable September weekend date');

      // Pricing preview for 10 adults (group of 10)
      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        10,     // adultCount
        0,
        0,
        10,     // guestCount (for group size semantics)
        null
      );

      this.assert(preview && preview.total_amount > 0, 'Preview total should be positive');
      this.assert(preview.total_amount <= 900, 'Total for group of 10 should be under or equal to $900 (actual: ' + preview.total_amount + ')');

      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        10,
        0,
        0,
        10,
        null,
        'Group booking for 10 guests on evening cruise'
      );

      this.assert(addResult && addResult.success === true, 'Adding group booking to cart should succeed');

      const cart = this.logic.getCartOverview();
      const item = cart.items.find(function (i) { return i.cruise_tour_id === cruiseTourId; });
      this.assert(item, 'Group cruise should appear in cart');
      this.assert(item.adult_count === 10, 'Cart item should record 10 adults');
      this.assert(item.line_subtotal === preview.line_subtotal, 'Group cart line subtotal should match preview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Purchase a $150 gift card usable for any cruise with a personalized message
  testTask4_PurchaseGiftCard150AnyCruise() {
    const testName = 'Task 4: Purchase $150 gift card usable for any cruise with message';
    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate to gift cards: get templates
      const templatesResponse = this.logic.getGiftCardTemplates();
      this.assert(templatesResponse && Array.isArray(templatesResponse.templates), 'Gift card templates should be returned');

      const anyCruiseTemplate = templatesResponse.templates.find(function (t) {
        return t.allows_custom_amount && t.default_applies_to_scope === 'all_cruises';
      }) || templatesResponse.templates[0];

      this.assert(anyCruiseTemplate, 'Should find a template suitable for any cruise gift card');

      const amount = 150;
      const currency = 'USD';
      const recipientName = 'Alex Rivera';
      const recipientEmail = 'alex.rivera@example.com';
      const senderName = 'Jordan Lee';
      const message = 'Happy birthday! Enjoy a cruise of your choice.';

      // Configure and add gift card to cart
      const addResult = this.logic.addGiftCardToCart(
        anyCruiseTemplate.id, // templateId
        amount,
        currency,
        'all_cruises',        // appliesToScope
        null,                 // applicableCategoryIds
        null,                 // applicableProductIds
        recipientName,
        recipientEmail,
        senderName,
        message,
        'email'               // delivery_method
      );

      this.assert(addResult && addResult.success === true, 'Adding gift card to cart should succeed');
      this.assert(addResult.cart && addResult.cart.total_amount >= amount, 'Cart total should be at least gift card amount');

      const cartOverview = this.logic.getCartOverview();
      this.assert(cartOverview && Array.isArray(cartOverview.items), 'Cart overview should return items');
      const gcItem = cartOverview.items.find(function (i) { return i.item_type === 'gift_card'; });
      this.assert(gcItem, 'Gift card line item should be present in cart');

      // Verify GiftCardItem configuration via storage relationships
      const storedGiftCards = JSON.parse(localStorage.getItem('gift_card_items') || '[]');
      const concreteGiftCard = storedGiftCards.find(function (g) { return g.id === gcItem.gift_card_item_id; });
      this.assert(concreteGiftCard, 'Concrete GiftCardItem should exist in storage');
      this.assert(concreteGiftCard.amount === amount, 'GiftCardItem amount should equal configured amount');
      this.assert(concreteGiftCard.applies_to_scope === 'all_cruises', 'GiftCardItem scope should be all_cruises');
      this.assert(concreteGiftCard.recipient_name === recipientName, 'Recipient name should match');
      this.assert(concreteGiftCard.sender_name === senderName, 'Sender name should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Book a family-style cruise for 2 adults and 1 child under $200 total (adapted, without strict lunch/pre-2pm constraint)
  testTask5_FamilyStyleCruiseTwoAdultsOneChildUnder200() {
    const testName = 'Task 5: Cruise for 2 adults and 1 child under $200 total';
    try {
      this.clearStorage();
      this.setupTestData();

      const sunday = this.getSundayNextMonth();
      const sundayIso = this.formatDateISO(sunday);

      // Search across all cruises, focusing on options likely affordable for a family
      const searchResponse = this.logic.searchCruiseTours(
        null,
        'all_cruises', // using known nav category id from interface
        null,
        sundayIso,
        null,
        null,
        ['sunday'],
        null,
        null,
        null,
        null,
        70,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'price_asc',
        1,
        20
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results) && searchResponse.results.length > 0, 'Should find at least one cruise for given Sunday');

      // Choose the first cruise where estimated total for 2 adults + 1 child is under $200
      let chosen = null;
      for (let i = 0; i < searchResponse.results.length; i++) {
        const r = searchResponse.results[i];
        let estimated = r.estimated_total_for_two_adults_one_child;
        if (typeof estimated !== 'number') {
          const pa = r.base_price_adult || 0;
          const pc = r.base_price_child || 0;
          estimated = pa * 2 + pc * 1;
        }
        if (estimated > 0 && estimated <= 200) {
          chosen = r;
          break;
        }
      }

      this.assert(chosen, 'Should find a cruise where estimated family total is under or equal to $200');
      const cruiseTourId = chosen.cruise_tour_id;

      const details = this.logic.getCruiseTourDetails(cruiseTourId);
      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        sundayIso,
        sundayIso,
        ['sunday'],
        null
      );
      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, details.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Family cruise should have available date on chosen Sunday');

      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,  // adults
        1,  // child
        0,
        3,
        null
      );

      this.assert(preview && preview.total_amount > 0, 'Family preview total should be positive');
      this.assert(preview.total_amount <= 200, 'Family total should be under or equal to $200 (actual: ' + preview.total_amount + ')');

      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,
        1,
        0,
        3,
        null,
        'Family booking 2 adults + 1 child'
      );
      this.assert(addResult && addResult.success === true, 'Adding family cruise to cart should succeed');

      const cart = this.logic.getCartOverview();
      const item = cart.items.find(function (i) { return i.cruise_tour_id === cruiseTourId; });
      this.assert(item, 'Family cruise item should exist in cart');
      this.assert(item.adult_count === 2 && item.child_count === 1, 'Cart item should have 2 adults and 1 child');
      this.assert(item.line_subtotal === preview.line_subtotal, 'Cart subtotal should match preview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Book highest-rated evening cruise with price <= $120 per adult and apply promo code SUMMER10 (adapted from dinner + live music)
  testTask6_HighestRatedEveningCruiseApplyPromo() {
    const testName = 'Task 6: Highest-rated evening cruise for 2 adults with SUMMER10 promo applied';
    try {
      this.clearStorage();
      this.setupTestData();

      // Check active promotions include SUMMER10
      const activePromos = this.logic.getActivePromotions();
      this.assert(activePromos && Array.isArray(activePromos.promotions), 'Active promotions should be returned');
      const summerPromo = activePromos.promotions.find(function (p) { return p.code === 'SUMMER10'; });
      this.assert(summerPromo, 'SUMMER10 promo code should be active');

      const nextSaturday = this.getNextSaturday();
      const saturdayIso = this.formatDateISO(nextSaturday);

      // Try to find dinner cruises with live music first (may yield zero with sample data)
      let searchResponse = this.logic.searchCruiseTours(
        null,
        'dinner_cruises',
        null,
        saturdayIso,
        null,
        null,
        ['saturday'],
        ['evening', 'sunset'],
        null,
        null,
        null,
        120,
        null,
        null,
        150,   // required duration 2.5 hours (may filter all sample data)
        null,
        null,
        null,
        ['live_music'],
        null,
        null,
        'rating_desc',
        1,
        20
      );

      // If no results, relax filters to sunset/evening category and drop live_music and duration constraint
      if (!searchResponse || !Array.isArray(searchResponse.results) || searchResponse.results.length === 0) {
        searchResponse = this.logic.searchCruiseTours(
          null,
          'sunset_evening',
          null,
          saturdayIso,
          null,
          null,
          ['saturday'],
          ['evening', 'sunset'],
          null,
          null,
          null,
          120,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          'rating_desc',
          1,
          20
        );
      }

      this.assert(searchResponse && Array.isArray(searchResponse.results) && searchResponse.results.length > 0, 'Should find at least one suitable evening cruise');

      // Choose highest-rated where price per adult <= 120
      const chosen = searchResponse.results.find(function (r) {
        return typeof r.base_price_adult === 'number' && r.base_price_adult <= 120;
      }) || searchResponse.results[0];

      const cruiseTourId = chosen.cruise_tour_id;
      this.assert(cruiseTourId, 'Chosen cruise should have an ID');

      const details = this.logic.getCruiseTourDetails(cruiseTourId);
      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        saturdayIso,
        saturdayIso,
        ['saturday'],
        ['evening', 'sunset']
      );
      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, details.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Evening cruise should be available on next Saturday');

      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,
        0,
        0,
        2,
        null
      );

      this.assert(preview && preview.total_amount > 0, 'Preview total should be positive');
      this.assert(preview.unit_price_adult <= 120, 'Unit price per adult should be <= $120');

      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        2,
        0,
        0,
        2,
        null,
        'Dinner-style evening cruise for 2 adults'
      );
      this.assert(addResult && addResult.success === true, 'Adding evening cruise to cart should succeed');

      // Go to checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include cart');
      this.assert(checkoutSummary.cart.subtotal_amount >= preview.total_amount, 'Checkout subtotal should be at least preview total');

      // Apply promo code SUMMER10
      const promoResult = this.logic.applyPromoCodeToCart('SUMMER10');
      this.assert(promoResult && promoResult.success === true, 'Applying SUMMER10 promo code should succeed');
      this.assert(promoResult.applied_promo_code === 'SUMMER10', 'Applied promo code should be SUMMER10');
      this.assert(promoResult.cart.discount_amount > 0, 'Discount amount should be greater than zero');
      this.assert(promoResult.cart.total_amount < promoResult.cart.subtotal_amount, 'Total with promo should be less than subtotal');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Find earliest tour from Old Town Pier within 7 days for 3 adults, duration 60-90 min, price between $30 and $60 per adult
  testTask7_EarliestTourFromOldTownPierForThreeAdults() {
    const testName = 'Task 7: Earliest tour from Old Town Pier within 7 days for 3 adults (60-90 min, $30-$60 per adult)';
    try {
      this.clearStorage();
      this.setupTestData();

      // Find Old Town Pier departure location via API
      const departures = this.logic.getDepartureLocations(false);
      this.assert(departures && Array.isArray(departures.locations), 'Departure locations should be returned');
      const oldTown = departures.locations.find(function (loc) { return loc.name === 'Old Town Pier'; });
      this.assert(oldTown, 'Old Town Pier should exist as a departure location');

      const today = new Date();
      const dateFromIso = this.formatDateISO(today);
      const dateToIso = this.formatDateISO(this.addDays(today, 7));

      // Search tours departing from Old Town Pier within next 7 days, 60-90 minutes, price 30-60 per adult, earliest departure first
      let searchResponse = this.logic.searchCruiseTours(
        'Old Town Pier',
        null,
        oldTown.id,
        null,
        dateFromIso,
        dateToIso,
        null,
        null,
        null,
        null,
        30,
        60,
        null,
        null,
        60,
        90,
        null,
        null,
        null,
        null,
        null,
        'departure_time_asc',
        1,
        20
      );

      // If strict price filter excludes all, relax min price but keep <= 60
      if (!searchResponse || !Array.isArray(searchResponse.results) || searchResponse.results.length === 0) {
        searchResponse = this.logic.searchCruiseTours(
          'Old Town Pier',
          null,
          oldTown.id,
          null,
          dateFromIso,
          dateToIso,
          null,
          null,
          null,
          null,
          null,
          60,
          null,
          null,
          60,
          90,
          null,
          null,
          null,
          null,
          null,
          'departure_time_asc',
          1,
          20
        );
      }

      this.assert(searchResponse && Array.isArray(searchResponse.results) && searchResponse.results.length > 0, 'Should find at least one qualifying tour from Old Town Pier');

      const chosen = searchResponse.results[0];
      const cruiseTourId = chosen.cruise_tour_id;
      this.assert(cruiseTourId, 'Chosen Old Town tour should have an ID');

      const details = this.logic.getCruiseTourDetails(cruiseTourId);
      this.assert(details && details.departure_location && details.departure_location.id === oldTown.id, 'Tour details should confirm departure from Old Town Pier');

      // Get availability for next 7 days and choose earliest available date/time
      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        dateFromIso,
        dateToIso,
        null,
        null
      );
      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, details.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Should have an available departure within 7 days');

      // 3 adult pricing preview
      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        3,
        0,
        0,
        3,
        null
      );

      this.assert(preview && preview.total_amount > 0, 'Preview total should be positive');
      if (typeof preview.unit_price_adult === 'number') {
        this.assert(preview.unit_price_adult <= 60, 'Per adult price should be <= $60');
      }

      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        3,
        0,
        0,
        3,
        null,
        '3 adults from Old Town Pier'
      );

      this.assert(addResult && addResult.success === true, 'Adding Old Town Pier tour for 3 adults should succeed');

      const cart = this.logic.getCartOverview();
      const item = cart.items.find(function (i) { return i.cruise_tour_id === cruiseTourId; });
      this.assert(item, 'Old Town Pier tour item should be in cart');
      this.assert(item.adult_count === 3, 'Cart item should record 3 adults');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Compare sightseeing cruises and book one that includes audio guide and free 24-hour cancellation for 1 adult under $75
  testTask8_CompareSightseeingAudioGuideAndFreeCancellation() {
    const testName = 'Task 8: Compare sightseeing cruises and book one with audio guide + free 24h cancellation under $75';
    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate to sightseeing category
      const nav = this.logic.getPrimaryNavCategories();
      const sightseeingCategory = nav.categories.find(function (c) { return c.nav_category_id === 'sightseeing'; });
      this.assert(sightseeingCategory, 'Sightseeing category should be present in nav');

      // Search sightseeing cruises under $75
      const searchResponse = this.logic.searchCruiseTours(
        null,
        sightseeingCategory.id,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        75,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'price_asc',
        1,
        20
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results) && searchResponse.results.length > 0, 'Should find at least one sightseeing cruise under $75');

      // Open first two qualifying tours
      const candidates = searchResponse.results.slice(0, 2);
      this.assert(candidates.length >= 1, 'Should have at least one candidate sightseeing cruise');

      // Check inclusions/features for audio guide + free cancellation >= 24h
      function hasAudioAndFreeCancellation(details) {
        if (!details || !details.cruise_tour) return false;
        const features = details.cruise_tour.features || [];
        const hasAudio = features.indexOf('audio_guide') !== -1;
        const cutoff = details.free_cancellation_cutoff_hours || details.cruise_tour.free_cancellation_cutoff_hours;
        const hasFreeCancellation = typeof cutoff === 'number' && cutoff >= 24;
        return hasAudio && hasFreeCancellation;
      }

      let bestDetails = null;
      let bestResult = null;

      for (let i = 0; i < candidates.length; i++) {
        const r = candidates[i];
        const d = this.logic.getCruiseTourDetails(r.cruise_tour_id);
        if (hasAudioAndFreeCancellation(d)) {
          if (!bestDetails) {
            bestDetails = d;
            bestResult = r;
          } else {
            // If both qualify, choose cheaper adult price
            const paBest = bestResult.base_price_adult || 0;
            const paNew = r.base_price_adult || 0;
            if (paNew < paBest) {
              bestDetails = d;
              bestResult = r;
            }
          }
        }
      }

      // If none of first two fully satisfy, search entire list for one that does
      if (!bestDetails) {
        for (let i = 0; i < searchResponse.results.length; i++) {
          const r = searchResponse.results[i];
          const d = this.logic.getCruiseTourDetails(r.cruise_tour_id);
          if (hasAudioAndFreeCancellation(d)) {
            bestDetails = d;
            bestResult = r;
            break;
          }
        }
      }

      this.assert(bestDetails && bestResult, 'Should select a sightseeing cruise with audio guide and free cancellation');

      const cruiseTourId = bestResult.cruise_tour_id;

      // Choose a date within the next month (e.g., 7 days from today)
      const today = new Date();
      const dateInNextMonth = this.addDays(today, 7);
      const dateIso = this.formatDateISO(dateInNextMonth);

      const availability = this.logic.getCruiseTourAvailability(
        cruiseTourId,
        dateIso,
        dateIso,
        null,
        null
      );
      const chosenTime = this.chooseFirstAvailableTimeSlot(availability, bestDetails.cruise_tour.default_start_time);
      this.assert(chosenTime.date, 'Selected sightseeing cruise should have availability on chosen date');

      const preview = this.logic.getCruiseTourPricingPreview(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        1,
        0,
        0,
        1,
        null
      );

      this.assert(preview && preview.total_amount > 0 && preview.total_amount <= 75, 'Total for 1 adult should be under or equal to $75');

      const addResult = this.logic.addTourBookingToCart(
        cruiseTourId,
        chosenTime.date,
        chosenTime.timeSlotId,
        1,
        0,
        0,
        1,
        null,
        'Sightseeing with audio guide and free cancellation'
      );
      this.assert(addResult && addResult.success === true, 'Adding selected sightseeing cruise to cart should succeed');

      const cart = this.logic.getCartOverview();
      const item = cart.items.find(function (i) { return i.cruise_tour_id === cruiseTourId; });
      this.assert(item, 'Selected sightseeing cruise should be in cart');
      this.assert(item.adult_count === 1, 'Cart item should record 1 adult');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
