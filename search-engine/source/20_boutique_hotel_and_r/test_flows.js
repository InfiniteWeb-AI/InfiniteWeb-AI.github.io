/*
 * Flow-based integration tests for boutique hotel & restaurant business logic
 *
 * Requirements:
 * - Node.js environment
 * - Uses CommonJS export (module.exports = TestRunner)
 * - Uses localStorage (assumed to be provided / polyfilled)
 * - Uses only positional arguments when calling business logic interfaces
 */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.baselineDate = null; // set in setupTestData()

    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }

    // Reinitialize storage structure in business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data from prompt (used ONLY here)
    const generatedData = {
      gift_card_types: [
        {
          id: 'restaurant_dining',
          name: 'Restaurant Dining Gift Card',
          code: 'restaurant',
          description: 'Digital or physical gift card redeemable for food and beverages at the hotel restaurant and bar.',
          minAmount: 25,
          maxAmount: 500,
          isActive: true,
          allowedDeliveryMethods: ['email', 'print_at_home', 'postal_mail']
        },
        {
          id: 'hotel_stay_credit',
          name: 'Hotel Stay Credit',
          code: 'hotel',
          description: 'Credit applied toward room nights, taxes, and incidentals during a hotel stay.',
          minAmount: 50,
          maxAmount: 1000,
          isActive: true,
          allowedDeliveryMethods: ['email', 'print_at_home', 'postal_mail']
        },
        {
          id: 'spa_indulgence',
          name: 'Spa Indulgence Gift Card',
          code: 'spa',
          description: 'Perfect for massages, facials, and spa treatments at the hotel spa.',
          minAmount: 75,
          maxAmount: 600,
          isActive: true,
          allowedDeliveryMethods: ['email', 'print_at_home']
        }
      ],
      meeting_amenities: [
        {
          id: 'projector',
          code: 'projector',
          name: 'LCD Projector',
          description: 'Ceiling-mounted LCD projector with HDMI and wireless presentation support.',
          isActive: true
        },
        {
          id: 'screen',
          code: 'screen',
          name: 'Projection Screen',
          description: 'Pull-down projection screen sized appropriately for the meeting room.',
          isActive: true
        },
        {
          id: 'coffee_break',
          code: 'coffee_break',
          name: 'Coffee Break Service',
          description: 'Freshly brewed coffee, tea, and water with a selection of light pastries.',
          isActive: true
        }
      ],
      menu_items: [
        {
          id: 'starter_heirloom_burrata',
          name: 'Heirloom Tomato & Burrata Salad',
          description: 'Local heirloom tomatoes, creamy burrata, basil pesto, and aged balsamic.',
          courseType: 'appetizer',
          mealType: 'dinner',
          price: 14,
          currency: 'usd',
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: true,
          dietaryTags: ['lacto_vegetarian', 'nut_free'],
          isActive: true,
          sortOrder: 1
        },
        {
          id: 'starter_soup_du_jour',
          name: 'Soup du Jour',
          description: 'Chef\u2019s daily soup, often featuring seasonal vegetables and house-made stock.',
          courseType: 'appetizer',
          mealType: 'dinner',
          price: 13,
          currency: 'usd',
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          dietaryTags: [],
          isActive: true,
          sortOrder: 2
        },
        {
          id: 'starter_grilled_octopus',
          name: 'Charred Mediterranean Octopus',
          description: 'Grilled octopus with smoked paprika aioli, fingerling potatoes, and olives.',
          courseType: 'appetizer',
          mealType: 'dinner',
          price: 17,
          currency: 'usd',
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          dietaryTags: ['seafood'],
          isActive: true,
          sortOrder: 3
        }
      ],
      offers: [
        {
          id: 'spa_escape_package',
          name: 'Three-Night Spa Escape Package',
          shortTitle: 'Spa Escape',
          description: 'Unwind with daily spa access, one 60-minute massage per guest, late checkout, and daily breakfast for two.',
          type: 'spa_package',
          nightlyRate: 350,
          currency: 'usd',
          includesSpaAccess: true,
          includesLateCheckout: true,
          otherInclusions: ['daily_breakfast', 'welcome_champagne', 'spa_credit_100'],
          tags: ['spa_escape', 'wellness_retreat', 'couples'],
          minNights: 2,
          maxNights: 5,
          maxOccupancy: 2,
          guestRating: 4.9,
          isActive: true,
          validFrom: '2026-01-01T00:00:00Z',
          validTo: '2026-12-31T23:59:59Z',
          imageUrls: [
            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'urban_wellness_retreat',
          name: 'Urban Wellness Retreat',
          shortTitle: 'Wellness Retreat',
          description: 'Two-night stay including spa access, yoga class, late checkout, and healthy breakfast each morning.',
          type: 'spa_package',
          nightlyRate: 320,
          currency: 'usd',
          includesSpaAccess: true,
          includesLateCheckout: true,
          otherInclusions: ['daily_breakfast', 'yoga_class', 'parking_included'],
          tags: ['wellness_retreat', 'spa_weekend'],
          minNights: 2,
          maxNights: 4,
          maxOccupancy: 2,
          guestRating: 4.7,
          isActive: true,
          validFrom: '2026-02-01T00:00:00Z',
          validTo: '2026-11-30T23:59:59Z',
          imageUrls: [
            'https://images.unsplash.com/photo-1551300334-4e24b8c6c9e0?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'spa_saver_nights',
          name: 'Spa Saver Weeknights',
          shortTitle: 'Spa Saver',
          description: 'Midweek spa package with access to hydrotherapy circuit, late checkout, and a glass of prosecco on arrival.',
          type: 'spa_package',
          nightlyRate: 260,
          currency: 'usd',
          includesSpaAccess: true,
          includesLateCheckout: true,
          otherInclusions: ['welcome_drink', 'gym_access'],
          tags: ['spa_escape', 'midweek_offer'],
          minNights: 1,
          maxNights: 3,
          maxOccupancy: 2,
          guestRating: 4.5,
          isActive: true,
          validFrom: '2026-01-15T00:00:00Z',
          validTo: '2026-09-30T23:59:59Z',
          imageUrls: [
            'https://images.unsplash.com/photo-1544168190-79c17527004f?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        }
      ],
      rooms: [
        {
          id: 'cozy_single_city',
          name: 'Cozy Single Room - City View',
          slug: 'cozy-single-city',
          description: 'Compact yet comfortable room ideal for solo travelers, with a plush single bed and dedicated workspace.',
          viewType: 'city_view',
          bedType: 'single',
          maxOccupancyAdults: 1,
          maxOccupancyChildren: 0,
          basePricePerNight: 180,
          currency: 'usd',
          guestRating: 4.2,
          roomSizeSqM: 16,
          amenities: ['wifi', 'desk', 'smart_tv'],
          hasWorkspace: true,
          isActive: true,
          images: [
            'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1501117716987-c8e1ecb2108a?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'business_queen_city',
          name: 'Business Queen Room - City View',
          slug: 'business-queen-city',
          description: 'Bright city-view room with queen bed, ergonomic desk, and high-speed Wi-Fi for business stays.',
          viewType: 'city_view',
          bedType: 'queen',
          maxOccupancyAdults: 2,
          maxOccupancyChildren: 0,
          basePricePerNight: 220,
          currency: 'usd',
          guestRating: 4.4,
          roomSizeSqM: 22,
          amenities: ['wifi', 'desk', 'coffee_machine', 'late_checkout'],
          hasWorkspace: true,
          isActive: true,
          images: [
            'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1560448075-bb485b067938?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'executive_king_city',
          name: 'Executive King Room - City View',
          slug: 'executive-king-city',
          description: 'Spacious king room with panoramic city views, lounge chair, and generous workstation.',
          viewType: 'city_view',
          bedType: 'king',
          maxOccupancyAdults: 2,
          maxOccupancyChildren: 0,
          basePricePerNight: 245,
          currency: 'usd',
          guestRating: 4.6,
          roomSizeSqM: 28,
          amenities: ['wifi', 'desk', 'coffee_machine', 'late_checkout'],
          hasWorkspace: true,
          isActive: true,
          images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1501117716987-c8e1ecb2108a?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        }
      ],
      offer_rooms: [
        {
          id: 'offerroom_spa_escape_garden_suite_king',
          offerId: 'spa_escape_package',
          roomId: 'garden_suite_king',
          isDefaultRoom: true
        },
        {
          id: 'offerroom_spa_escape_courtyard_king_spa',
          offerId: 'spa_escape_package',
          roomId: 'courtyard_king_spa',
          isDefaultRoom: false
        },
        {
          id: 'offerroom_urban_wellness_courtyard_king_spa',
          offerId: 'urban_wellness_retreat',
          roomId: 'courtyard_king_spa',
          isDefaultRoom: true
        }
      ],
      rate_plans: [
        {
          id: 'rp_cozy_single_ap_room_only',
          roomId: 'cozy_single_city',
          name: 'Advance Purchase - Room Only',
          description: 'Save 10% with full prepayment. No changes or refunds.',
          includesBreakfast: false,
          includesSpaAccess: false,
          includesLateCheckout: false,
          nightlyPrice: 165,
          currency: 'usd',
          refundable: false,
          cancellationPolicy: 'Non-refundable. Full prepayment required at booking; no changes or cancellations allowed.',
          minStayNights: 1,
          maxStayNights: 0,
          isActive: true,
          availableStartDate: '2026-01-01T00:00:00Z',
          availableEndDate: '2026-12-31T23:59:59Z',
          rateCode: 'APRO_COZY_SINGLE'
        },
        {
          id: 'rp_cozy_single_flex_bfast',
          roomId: 'cozy_single_city',
          name: 'Flexible Rate with Breakfast',
          description: 'Best available flexible rate including continental breakfast.',
          includesBreakfast: true,
          includesSpaAccess: false,
          includesLateCheckout: false,
          nightlyPrice: 185,
          currency: 'usd',
          refundable: true,
          cancellationPolicy: 'Free cancellation up to 24 hours before arrival. One night charged for late cancellation or no-show.',
          minStayNights: 1,
          maxStayNights: 0,
          isActive: true,
          availableStartDate: '2026-01-01T00:00:00Z',
          availableEndDate: '2026-12-31T23:59:59Z',
          rateCode: 'FBB_COZY_SINGLE'
        },
        {
          id: 'rp_business_queen_business_saver',
          roomId: 'business_queen_city',
          name: 'Business Saver - Room Only',
          description: 'Discounted weekday rate for business travelers, room only.',
          includesBreakfast: false,
          includesSpaAccess: false,
          includesLateCheckout: false,
          nightlyPrice: 205,
          currency: 'usd',
          refundable: false,
          cancellationPolicy: 'Non-refundable rate. Date changes not permitted.',
          minStayNights: 1,
          maxStayNights: 5,
          isActive: true,
          availableStartDate: '2026-01-01T00:00:00Z',
          availableEndDate: '2026-12-31T23:59:59Z',
          rateCode: 'BUSSAVER_QN'
        }
      ],
      restaurant_time_slots: [
        {
          id: 'ts_2026-03-17_1800_indoor',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '18:00',
          seatingArea: 'indoor',
          maxCapacity: 40,
          isAvailable: true,
          availableCapacity: 38
        },
        {
          id: 'ts_2026-03-17_1830_indoor',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '18:30',
          seatingArea: 'indoor',
          maxCapacity: 40,
          isAvailable: true,
          availableCapacity: 37
        },
        {
          id: 'ts_2026-03-17_1900_indoor',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '19:00',
          seatingArea: 'indoor',
          maxCapacity: 40,
          isAvailable: false,
          availableCapacity: 36
        }
      ],
      restaurant_reservations: [
        {
          id: 'res_2026-03-17_1800_indoor_smith',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '18:00',
          partySize: 2,
          seatingArea: 'indoor',
          tableLocationPreference: 'quiet_corner',
          guestName: 'Laura Smith',
          guestEmail: 'laura.smith@example.com',
          guestPhone: '5551112233',
          specialRequests: 'Celebrating a birthday; a small candle on dessert if possible.',
          status: 'confirmed',
          timeSlotId: 'ts_2026-03-17_1800_indoor',
          createdAt: '2026-02-28T09:30:00Z'
        },
        {
          id: 'res_2026-03-17_1830_indoor_chen',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '18:30',
          partySize: 3,
          seatingArea: 'indoor',
          tableLocationPreference: 'center_of_room',
          guestName: 'David Chen',
          guestEmail: 'david.chen@example.com',
          guestPhone: '5553334455',
          specialRequests: 'High chair needed for one toddler.',
          status: 'confirmed',
          timeSlotId: 'ts_2026-03-17_1830_indoor',
          createdAt: '2026-03-01T14:10:00Z'
        },
        {
          id: 'res_2026-03-17_1900_indoor_garcia',
          reservationDate: '2026-03-17T00:00:00Z',
          reservationTime: '19:00',
          partySize: 4,
          seatingArea: 'indoor',
          tableLocationPreference: 'center_of_room',
          guestName: 'Maria Garcia',
          guestEmail: 'maria.garcia@example.com',
          guestPhone: '5557778899',
          specialRequests: 'One guest is gluten-free.',
          status: 'confirmed',
          timeSlotId: 'ts_2026-03-17_1900_indoor',
          createdAt: '2026-02-25T11:45:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:25.486066'
      }
    };

    // Use baseline date from generated metadata if available
    if (generatedData._metadata && generatedData._metadata.baselineDate) {
      this.baselineDate = new Date(generatedData._metadata.baselineDate + 'T00:00:00Z');
    } else {
      this.baselineDate = new Date();
    }

    // Populate localStorage using storage keys from mapping
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }

    localStorage.setItem('gift_card_types', JSON.stringify(generatedData.gift_card_types || []));
    localStorage.setItem('meeting_amenities', JSON.stringify(generatedData.meeting_amenities || []));
    localStorage.setItem('menu_items', JSON.stringify(generatedData.menu_items || []));
    localStorage.setItem('offers', JSON.stringify(generatedData.offers || []));
    localStorage.setItem('rooms', JSON.stringify(generatedData.rooms || []));
    localStorage.setItem('offer_rooms', JSON.stringify(generatedData.offer_rooms || []));
    localStorage.setItem('rate_plans', JSON.stringify(generatedData.rate_plans || []));
    localStorage.setItem('restaurant_time_slots', JSON.stringify(generatedData.restaurant_time_slots || []));
    localStorage.setItem('restaurant_reservations', JSON.stringify(generatedData.restaurant_reservations || []));

    // Ensure other collections exist as empty arrays if not already
    const storageKeys = [
      'bookings',
      'dinner_plans',
      'dinner_plan_items',
      'carts',
      'cart_items',
      'meeting_event_inquiries',
      'newsletter_subscriptions',
      'room_comparisons'
    ];
    for (let i = 0; i < storageKeys.length; i++) {
      const key = storageKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  }

  // Helper: simple assertion
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

  // Helper: format Date -> 'YYYY-MM-DD'
  formatDate(date) {
    const d = new Date(date.getTime());
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // Helper: add days
  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_StartBookingCheapestBreakfastRoom();
    this.testTask2_MakeDinnerReservationForFour();
    this.testTask3_StartBookingHighestRatedSpaPackage();
    this.testTask4_PurchaseRestaurantGiftCard();
    this.testTask5_SubmitCorporateMeetingInquiry();
    this.testTask6_BuildVegetarianDinnerPlan();
    this.testTask7_ChooseLargestBedUnderBudget();
    this.testTask8_SignUpForNewsletter();

    return this.results;
  }

  // Task 1: Start booking the cheapest room with breakfast for a June weekend stay
  testTask1_StartBookingCheapestBreakfastRoom() {
    const testName = 'Task 1: Start booking cheapest breakfast room for June weekend';
    try {
      // Adaptation: use 1 adult so that Cozy Single (with breakfast rate) is eligible
      const checkInDate = '2026-06-12'; // Friday
      const checkOutDate = '2026-06-14'; // Sunday
      const adults = 1;
      const children = 0;

      // Step: search available rooms sorted by price low to high
      const roomResults = this.logic.searchAvailableRooms(
        checkInDate,
        checkOutDate,
        adults,
        children,
        undefined, // no additional filters so we don't exclude limited test data
        'price_asc'
      );

      this.assert(Array.isArray(roomResults) && roomResults.length > 0, 'Room search should return at least one result');

      // Select the first (cheapest) room from results
      const cheapestRoomResult = roomResults[0];
      const chosenRoom = cheapestRoomResult.room;
      this.assert(chosenRoom && chosenRoom.id, 'Chosen room should have an ID');

      // Step: get room rates for the chosen room
      const roomRates = this.logic.getRoomRates(chosenRoom.id, checkInDate, checkOutDate, adults, children);
      this.assert(Array.isArray(roomRates) && roomRates.length > 0, 'Room should have available rate plans');

      // Filter to rates that include breakfast
      const breakfastRates = roomRates.filter(function (r) {
        return r.ratePlan && r.ratePlan.includesBreakfast === true;
      });

      this.assert(breakfastRates.length > 0, 'Should have at least one breakfast-included rate');

      // Choose the breakfast rate with the lowest total price for the stay
      let selectedRate = breakfastRates[0];
      for (let i = 1; i < breakfastRates.length; i++) {
        if (breakfastRates[i].totalPrice < selectedRate.totalPrice) {
          selectedRate = breakfastRates[i];
        }
      }
      const selectedRatePlan = selectedRate.ratePlan;
      this.assert(selectedRatePlan && selectedRatePlan.id, 'Selected rate plan should have an ID');

      // Step: start booking with selected room and rate plan
      const startBookingResult = this.logic.startRoomBooking(
        chosenRoom.id,
        selectedRatePlan.id,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      const booking = startBookingResult && startBookingResult.booking;
      this.assert(booking && booking.id, 'Booking should be created with an ID');
      this.assert(booking.roomId === chosenRoom.id, 'Booking roomId should match chosen room');
      this.assert(booking.ratePlanId === selectedRatePlan.id, 'Booking ratePlanId should match selected rate plan');
      this.assert(booking.totalPrice > 0, 'Booking total price should be positive');

      // Step: fetch booking details
      const bookingDetails = this.logic.getBookingDetails(booking.id);
      this.assert(bookingDetails && bookingDetails.booking && bookingDetails.room && bookingDetails.ratePlan, 'Booking details should include booking, room, and ratePlan');

      // Step: update guest details
      const guestFirstName = 'Jamie';
      const guestLastName = 'Taylor';
      const guestEmail = 'jamie.taylor@example.com';
      const guestPhone = '5551234567';
      const arrivalTime = '15:00';

      const updatedResult = this.logic.updateBookingGuestDetails(
        booking.id,
        guestFirstName,
        guestLastName,
        guestEmail,
        guestPhone,
        arrivalTime,
        '' // no special requests
      );

      const updatedBooking = updatedResult && updatedResult.booking;
      this.assert(updatedBooking && updatedBooking.id === booking.id, 'Updated booking should have same ID');
      this.assert(updatedBooking.guestFirstName === guestFirstName, 'Guest first name should be saved');
      this.assert(updatedBooking.guestLastName === guestLastName, 'Guest last name should be saved');
      this.assert(updatedBooking.guestEmail === guestEmail, 'Guest email should be saved');
      this.assert(updatedBooking.guestPhone === guestPhone, 'Guest phone should be saved');
      this.assert(updatedBooking.arrivalTime === arrivalTime, 'Arrival time should be saved');

      // Step: proceed booking to payment step
      const proceedResult = this.logic.proceedBookingToPayment(booking.id);
      this.assert(proceedResult && proceedResult.success === true, 'Proceed to payment should succeed');
      this.assert(proceedResult.redirectToCheckout === true, 'Should redirect to checkout');

      const bookingAfterProceed = proceedResult.booking;
      this.assert(bookingAfterProceed && bookingAfterProceed.id === booking.id, 'Booking after proceed should match original booking');

      // Step: get booking payment summary
      const paymentSummary = this.logic.getBookingPaymentSummary(booking.id);
      this.assert(paymentSummary && paymentSummary.booking && paymentSummary.booking.id === booking.id, 'Payment summary should reference the booking');
      this.assert(paymentSummary.totalAmount === paymentSummary.booking.totalPrice, 'Payment summary total should match booking total');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Make a dinner reservation for four at the earliest available time between ~7:00-8:00 PM
  testTask2_MakeDinnerReservationForFour() {
    const testName = 'Task 2: Create restaurant reservation for four at earliest available evening time';
    try {
      // Use baseline date from generated metadata as "today"
      const today = this.baselineDate || new Date();
      const targetDate = this.addDays(today, 14); // two weeks from today (expected 2026-03-17)
      const reservationDateStr = this.formatDate(targetDate);

      // Get reservation configuration (seating areas, table preferences)
      const config = this.logic.getRestaurantReservationConfig();
      const seatingAreas = (config && config.seatingAreas) || [];

      // Choose 'indoor' seating if available, otherwise first available
      let seatingAreaValue = 'indoor';
      const indoorOption = seatingAreas.find(function (s) { return s.value === 'indoor'; });
      if (!indoorOption && seatingAreas.length > 0) {
        seatingAreaValue = seatingAreas[0].value;
      }

      // Get table location preferences and prefer 'window_table' if present
      const tableLocationOptions = (config && config.tableLocationPreferences) || [];
      let tablePrefValue = 'no_preference';
      const windowPref = tableLocationOptions.find(function (p) { return p.value === 'window_table'; });
      if (windowPref) {
        tablePrefValue = windowPref.value;
      } else if (tableLocationOptions.length > 0) {
        tablePrefValue = tableLocationOptions[0].value;
      }

      const partySize = 4;

      // Request available slots between 18:00 and 20:00, then prefer earliest between 19:00-20:00
      const slots = this.logic.getRestaurantAvailableTimeSlots(
        reservationDateStr,
        partySize,
        seatingAreaValue,
        '18:00',
        '20:00'
      );

      this.assert(Array.isArray(slots), 'Available time slots response should be an array');
      this.assert(slots.length > 0, 'There should be at least one available time slot for the evening window');

      // Sort by time ascending
      slots.sort(function (a, b) {
        return a.reservationTime.localeCompare(b.reservationTime);
      });

      // Prefer earliest slot between 19:00 and 20:00; if none, fallback to earliest overall
      let chosenSlot = null;
      for (let i = 0; i < slots.length; i++) {
        const t = slots[i].reservationTime;
        if (t >= '19:00' && t < '20:00') {
          chosenSlot = slots[i];
          break;
        }
      }
      if (!chosenSlot) {
        chosenSlot = slots[0];
      }

      this.assert(chosenSlot && chosenSlot.timeSlotId, 'Chosen time slot should have an ID');

      // Create reservation
      const guestName = 'Morgan Lee';
      const guestEmail = 'morgan.lee@example.com';
      const guestPhone = '5559876543';
      const specialRequests = 'One vegetarian guest; please seat away from the kitchen door.';

      const createResult = this.logic.createRestaurantReservation(
        chosenSlot.timeSlotId,
        partySize,
        seatingAreaValue,
        tablePrefValue,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests
      );

      const reservation = createResult && createResult.reservation;
      this.assert(reservation && reservation.id, 'Reservation should be created with an ID');
      this.assert(reservation.partySize === partySize, 'Reservation party size should match');
      this.assert(reservation.guestName === guestName, 'Reservation should store guest name');
      this.assert(reservation.guestEmail === guestEmail, 'Reservation should store guest email');
      this.assert(reservation.timeSlotId === chosenSlot.timeSlotId, 'Reservation should reference chosen time slot');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Start booking the highest-rated spa package under $400 per night for a 2-night stay
  testTask3_StartBookingHighestRatedSpaPackage() {
    const testName = 'Task 3: Start booking highest-rated spa package under $400/night';
    try {
      // Step: search spa offers with spa access, late checkout, and nightly rate <= 400
      const filters = {
        includesSpaAccess: true,
        includesLateCheckout: true,
        minNightlyRate: undefined,
        maxNightlyRate: 400,
        types: ['spa_package']
      };

      const offerResults = this.logic.searchOffers(filters, 'guest_rating_desc');
      this.assert(Array.isArray(offerResults) && offerResults.length > 0, 'Should find at least one spa package under $400');

      // Choose the first offer (highest rating due to sort)
      const topOfferWrapper = offerResults[0];
      const topOffer = topOfferWrapper.offer;
      this.assert(topOffer && topOffer.id, 'Selected offer should have an ID');
      this.assert(topOffer.nightlyRate <= 400, 'Selected offer nightly rate should be <= 400');
      this.assert(topOffer.includesSpaAccess === true, 'Selected offer should include spa access');
      this.assert(topOffer.includesLateCheckout === true, 'Selected offer should include late checkout');

      // Step: choose a 2-night stay starting on a Friday next month (use example dates within validity)
      // Using explicit example dates within 2026 validity
      const checkInDate = '2026-04-10'; // Friday
      const checkOutDate = '2026-04-12'; // Sunday (2 nights)
      const adults = 2;
      const children = 0;

      // Step: get offer availability (rooms associated with this package)
      const availability = this.logic.getOfferAvailability(
        topOffer.id,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      this.assert(availability && availability.offer && availability.offer.id === topOffer.id, 'Offer availability should reference the selected offer');

      let roomIdForPackage = null;
      if (availability.rooms && availability.rooms.length > 0) {
        // Prefer first available room returned for this offer
        roomIdForPackage = availability.rooms[0].room.id;
      } else {
        // Fallback: use first room from rooms storage that can host 2 adults
        const storedRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        const suitableRoom = storedRooms.find(function (r) { return r.maxOccupancyAdults >= adults; });
        this.assert(suitableRoom, 'Should have at least one room that can host 2 adults for package booking');
        roomIdForPackage = suitableRoom.id;
      }

      this.assert(roomIdForPackage, 'Room ID for package booking should be determined');

      // Step: start offer booking
      const startBookingResult = this.logic.startOfferBooking(
        topOffer.id,
        roomIdForPackage,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      const booking = startBookingResult && startBookingResult.booking;
      this.assert(booking && booking.id, 'Offer booking should be created with an ID');
      this.assert(booking.offerId === topOffer.id, 'Booking.offerId should match selected offer');
      this.assert(booking.roomId === roomIdForPackage, 'Booking.roomId should match selected room');
      this.assert(booking.totalPrice > 0, 'Package booking total price should be positive');

      // Step: get booking details
      const details = this.logic.getBookingDetails(booking.id);
      this.assert(details && details.booking && details.offer, 'Booking details should include offer');

      // Step: update guest details
      const guestFirstName = 'Alex';
      const guestLastName = 'Rivera';
      const guestEmail = 'alex.rivera@example.com';
      const guestPhone = '5554446677';

      const updated = this.logic.updateBookingGuestDetails(
        booking.id,
        guestFirstName,
        guestLastName,
        guestEmail,
        guestPhone,
        '16:00',
        'Spa weekend package booking'
      );

      const updatedBooking = updated && updated.booking;
      this.assert(updatedBooking && updatedBooking.id === booking.id, 'Updated booking should keep same ID');
      this.assert(updatedBooking.guestFirstName === guestFirstName, 'Guest first name should be updated');

      // Step: proceed to payment (do not process actual payment)
      const proceedResult = this.logic.proceedBookingToPayment(booking.id);
      this.assert(proceedResult && proceedResult.success === true, 'Proceed to payment for offer booking should succeed');

      const paymentSummary = this.logic.getBookingPaymentSummary(booking.id);
      this.assert(paymentSummary && paymentSummary.booking && paymentSummary.booking.id === booking.id, 'Payment summary should reference offer booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Purchase a $150 restaurant gift card for email delivery to a friend
  testTask4_PurchaseRestaurantGiftCard() {
    const testName = 'Task 4: Purchase $150 restaurant gift card for email delivery';
    try {
      // Step: get available gift card types
      const giftCardTypes = this.logic.getGiftCardTypes();
      this.assert(Array.isArray(giftCardTypes) && giftCardTypes.length > 0, 'Should have at least one gift card type');

      // Find restaurant gift card type by code
      let restaurantType = giftCardTypes.find(function (t) { return t.code === 'restaurant'; });
      if (!restaurantType) {
        restaurantType = giftCardTypes[0]; // fallback if restaurant-specific type not found
      }

      this.assert(restaurantType && restaurantType.id, 'Restaurant/dining gift card type should have an ID');

      const amount = 150;
      this.assert(
        (!restaurantType.minAmount || amount >= restaurantType.minAmount) &&
          (!restaurantType.maxAmount || amount <= restaurantType.maxAmount),
        'Gift card amount should be within allowed range for selected type'
      );

      const deliveryMethod = 'email';
      if (restaurantType.allowedDeliveryMethods && restaurantType.allowedDeliveryMethods.length > 0) {
        this.assert(
          restaurantType.allowedDeliveryMethods.indexOf(deliveryMethod) !== -1,
          'Email delivery should be allowed for selected gift card type'
        );
      }

      const recipientName = 'Alex Green';
      const recipientEmail = 'alex.green@example.com';

      // Send date: one week from baseline date
      const base = this.baselineDate || new Date();
      const sendDate = this.addDays(base, 7);
      const sendDateIso = this.formatDate(sendDate); // YYYY-MM-DD

      const personalMessage = 'Enjoy a special dinner on me at this hotel restaurant. Happy Birthday!';
      const purchaserName = 'Taylor Brooks';
      const purchaserEmail = 'taylor.brooks@example.com';

      // Assume hotel uses currency based on gift card type or default to 'usd'
      const currency = restaurantType.currency || 'usd';

      // Step: add gift card to cart
      const addResult = this.logic.addGiftCardToCart(
        restaurantType.id,
        amount,
        currency,
        deliveryMethod,
        recipientName,
        recipientEmail,
        sendDateIso,
        personalMessage,
        purchaserName,
        purchaserEmail,
        1 // quantity
      );

      this.assert(addResult && addResult.success === true, 'Adding gift card to cart should succeed');
      const cart = addResult.cart;
      const cartItem = addResult.cartItem;
      this.assert(cart && cart.id, 'Cart should be returned with an ID');
      this.assert(cartItem && cartItem.id, 'Cart item should be returned with an ID');

      // Step: verify cart summary includes the added item
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && cartSummary.cart.id === cart.id, 'Cart summary should reference current cart');
      const items = cartSummary.items || [];
      const foundItem = items.find(function (it) { return it.id === cartItem.id; });
      this.assert(foundItem, 'Cart summary should include the added gift card item');

      // Step: simulate proceeding to checkout (no payment processing)
      const checkoutSummary = this.logic.getCartCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart && checkoutSummary.cart.id === cart.id, 'Checkout summary should reference the cart');
      this.assert(checkoutSummary.totalAmount >= amount, 'Checkout total should be at least the gift card amount');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Submit an inquiry for a corporate meeting for 20 people with specific amenities
  testTask5_SubmitCorporateMeetingInquiry() {
    const testName = 'Task 5: Submit corporate meeting inquiry for 20 attendees';
    try {
      // Step: get available meeting amenities
      const amenityOptions = this.logic.getMeetingAmenityOptions();
      this.assert(Array.isArray(amenityOptions), 'Meeting amenity options should be an array');

      const amenityCodesAvailable = amenityOptions.map(function (a) { return a.code; });
      const desiredCodes = ['projector', 'screen'];

      // Prefer coffee_break, else refreshments, if available
      if (amenityCodesAvailable.indexOf('coffee_break') !== -1) {
        desiredCodes.push('coffee_break');
      } else if (amenityCodesAvailable.indexOf('refreshments') !== -1) {
        desiredCodes.push('refreshments');
      }

      const selectedAmenityCodes = desiredCodes.filter(function (code) {
        return amenityCodesAvailable.indexOf(code) !== -1;
      });

      this.assert(selectedAmenityCodes.length >= 2, 'Should select at least projector and screen amenities');

      // Event date: exactly one month from baseline date
      const base = this.baselineDate || new Date();
      const eventDate = new Date(base.getTime());
      eventDate.setUTCMonth(eventDate.getUTCMonth() + 1);
      const eventDateIso = this.formatDate(eventDate);

      const attendeeCount = 20;
      const startTime = '09:00';
      const endTime = '13:00';

      const companyName = 'North Shore Consulting';
      const contactName = 'Jordan Smith';
      const contactEmail = 'jordan.smith@example.com';
      const contactPhone = '5552223344';
      const additionalDetails = 'Please include pricing for a light vegetarian snack option and Wi-Fi access for all 20 attendees.';

      // Step: submit meeting/event inquiry
      const submitResult = this.logic.submitMeetingEventInquiry(
        'corporate_meeting',
        attendeeCount,
        eventDateIso,
        startTime,
        endTime,
        selectedAmenityCodes,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        additionalDetails
      );

      const inquiry = submitResult && submitResult.inquiry;
      this.assert(inquiry && inquiry.id, 'Meeting inquiry should be created with an ID');
      this.assert(inquiry.attendeeCount === attendeeCount, 'Inquiry attendee count should match');
      this.assert(inquiry.companyName === companyName, 'Inquiry company name should be saved');
      this.assert(Array.isArray(inquiry.amenities), 'Inquiry amenities should be an array');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Build a vegetarian dinner plan with 1 appetizer, 2 mains, and 1 dessert under price limits
  testTask6_BuildVegetarianDinnerPlan() {
    const testName = 'Task 6: Build vegetarian dinner plan (1 appetizer, 2 mains, 1 dessert)';
    try {
      // Step: get vegetarian dinner menu items
      const menuItems = this.logic.getMenuItems('dinner', { isVegetarian: true }, 'course_then_sort_order');
      this.assert(Array.isArray(menuItems) && menuItems.length > 0, 'Should return vegetarian dinner menu items');

      const appetizers = [];
      const mains = [];
      const desserts = [];

      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i].menuItem;
        if (!item || item.isVegetarian !== true) continue;

        if (item.courseType === 'appetizer' && item.price < 15) {
          appetizers.push(item);
        } else if (item.courseType === 'main' && item.price < 30) {
          mains.push(item);
        } else if (item.courseType === 'dessert' && item.price < 12) {
          desserts.push(item);
        }
      }

      this.assert(appetizers.length >= 1, 'Should have at least one vegetarian appetizer under $15');
      this.assert(mains.length >= 2, 'Should have at least two vegetarian mains under $30');
      this.assert(desserts.length >= 1, 'Should have at least one vegetarian dessert under $12');

      const selectedAppetizer = appetizers[0];
      const selectedMain1 = mains[0];
      const selectedMain2 = mains[1];
      const selectedDessert = desserts[0];

      // Step: add items to dinner plan
      let planResult = this.logic.addMenuItemToDinnerPlan(selectedAppetizer.id, 1);
      this.assert(planResult && planResult.dinnerPlan && Array.isArray(planResult.items), 'Dinner plan should be created/updated after adding appetizer');

      planResult = this.logic.addMenuItemToDinnerPlan(selectedMain1.id, 1);
      planResult = this.logic.addMenuItemToDinnerPlan(selectedMain2.id, 1);
      planResult = this.logic.addMenuItemToDinnerPlan(selectedDessert.id, 1);

      // Step: verify current dinner plan contents
      const currentPlan = this.logic.getCurrentDinnerPlan();
      this.assert(currentPlan && currentPlan.dinnerPlan && Array.isArray(currentPlan.items), 'Current dinner plan should be retrievable');

      const items = currentPlan.items;
      this.assert(items.length === 4, 'Dinner plan should contain exactly 4 items');

      // Verify course type counts from actual items
      let appetizerCount = 0;
      let mainCount = 0;
      let dessertCount = 0;
      for (let j = 0; j < items.length; j++) {
        const menuItem = items[j].menuItem;
        if (!menuItem) continue;
        if (menuItem.courseType === 'appetizer') appetizerCount++;
        if (menuItem.courseType === 'main') mainCount++;
        if (menuItem.courseType === 'dessert') dessertCount++;
      }
      this.assert(appetizerCount === 1, 'Plan should contain exactly 1 appetizer');
      this.assert(mainCount === 2, 'Plan should contain exactly 2 mains');
      this.assert(dessertCount === 1, 'Plan should contain exactly 1 dessert');

      // Step: save dinner plan
      const saveResult = this.logic.saveDinnerPlan('Vegetarian Dinner Plan', '1 appetizer, 2 mains, 1 dessert under price limits');
      this.assert(saveResult && saveResult.success === true, 'Saving dinner plan should succeed');
      this.assert(saveResult.dinnerPlan && saveResult.dinnerPlan.id, 'Saved dinner plan should have an ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Choose a room with the largest bed under $250 per night for a solo business stay
  testTask7_ChooseLargestBedUnderBudget() {
    const testName = 'Task 7: Choose room with largest bed under $250/night for solo business stay';
    try {
      // Clear any existing room comparison state
      this.logic.clearRoomComparison();

      // Use explicit weekday example dates within 2026 (Monday to Thursday)
      const checkInDate = '2026-05-04'; // Monday
      const checkOutDate = '2026-05-07'; // Thursday (3 nights)
      const adults = 1;
      const children = 0;

      // Step: search rooms under $250/night
      const filters = {
        minPricePerNight: undefined,
        maxPricePerNight: 250
      };

      const roomResults = this.logic.searchAvailableRooms(
        checkInDate,
        checkOutDate,
        adults,
        children,
        filters,
        'price_asc'
      );

      this.assert(Array.isArray(roomResults) && roomResults.length > 0, 'Should find at least one room under $250/night');

      // Select up to first three rooms for comparison
      const roomsForComparison = roomResults.slice(0, 3);
      for (let i = 0; i < roomsForComparison.length; i++) {
        const r = roomsForComparison[i].room;
        this.assert(r && r.id, 'Room result should have an ID for comparison');
        this.logic.addRoomToComparison(r.id);
      }

      // Step: get comparison view for these dates
      const comparisonView = this.logic.getRoomComparisonView(checkInDate, checkOutDate, adults, children);
      this.assert(comparisonView && Array.isArray(comparisonView.rooms), 'Room comparison view should include rooms array');

      const comparedRooms = comparisonView.rooms;
      this.assert(comparedRooms.length > 0, 'Comparison should contain at least one room');

      // Determine room with largest bed type; if tie, choose lower price
      const bedRank = {
        king_plus_sofa_bed: 6,
        king: 5,
        queen: 4,
        double: 3,
        twin: 2,
        single: 1,
        sofa_bed: 0
      };

      let best = comparedRooms[0];
      for (let j = 1; j < comparedRooms.length; j++) {
        const current = comparedRooms[j];
        const bestBedRank = bedRank[best.room.bedType] || 0;
        const currentBedRank = bedRank[current.room.bedType] || 0;
        if (currentBedRank > bestBedRank) {
          best = current;
        } else if (currentBedRank === bestBedRank) {
          // Tie-breaker: lower base price or computed price
          const bestPrice = best.computedAverageNightlyPrice || best.basePricePerNight || Number.MAX_VALUE;
          const currentPrice = current.computedAverageNightlyPrice || current.basePricePerNight || Number.MAX_VALUE;
          if (currentPrice < bestPrice) {
            best = current;
          }
        }
      }

      const chosenRoom = best.room;
      this.assert(chosenRoom && chosenRoom.id, 'Chosen largest-bed room should have an ID');

      // Step: view room details
      const roomDetails = this.logic.getRoomDetails(chosenRoom.id);
      this.assert(roomDetails && roomDetails.room && roomDetails.room.id === chosenRoom.id, 'Room details should match chosen room');

      // Step: get rates and start booking the chosen room
      const roomRates = this.logic.getRoomRates(chosenRoom.id, checkInDate, checkOutDate, adults, children);
      this.assert(Array.isArray(roomRates) && roomRates.length > 0, 'Chosen room should have available rate plans');

      // Choose the cheapest rate plan for this stay
      let cheapest = roomRates[0];
      for (let k = 1; k < roomRates.length; k++) {
        if (roomRates[k].totalPrice < cheapest.totalPrice) {
          cheapest = roomRates[k];
        }
      }

      const selectedRatePlan = cheapest.ratePlan;
      this.assert(selectedRatePlan && selectedRatePlan.id, 'Selected rate plan for chosen room should have an ID');

      const startBookingResult = this.logic.startRoomBooking(
        chosenRoom.id,
        selectedRatePlan.id,
        checkInDate,
        checkOutDate,
        adults,
        children
      );

      const booking = startBookingResult && startBookingResult.booking;
      this.assert(booking && booking.id, 'Booking for largest-bed room should be created with an ID');
      this.assert(booking.roomId === chosenRoom.id, 'Booking roomId should match chosen room');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Sign up for the hotel newsletter with specific interest preferences and monthly frequency
  testTask8_SignUpForNewsletter() {
    const testName = 'Task 8: Sign up for newsletter with room & restaurant interests (monthly)';
    try {
      // Optional: get teaser content (simulates accessing newsletter section)
      const teaser = this.logic.getNewsletterTeaserContent();
      this.assert(teaser && typeof teaser.headline === 'string', 'Newsletter teaser content should be available');

      const email = 'guest.subscriber@example.com';
      const name = 'Guest Subscriber';
      const interestRoomOffers = true;
      const interestRestaurantEvents = true;
      const interestSpaOffers = false;
      const interestMeetingOffers = false;
      const interestGeneralNews = false;
      const frequency = 'monthly';
      const consentMarketing = true;

      const result = this.logic.createNewsletterSubscription(
        email,
        name,
        interestRoomOffers,
        interestRestaurantEvents,
        interestSpaOffers,
        interestMeetingOffers,
        interestGeneralNews,
        frequency,
        consentMarketing
      );

      this.assert(result && result.success === true, 'Newsletter subscription should succeed');
      const subscription = result.subscription;
      this.assert(subscription && subscription.id, 'Subscription should have an ID');
      this.assert(subscription.email === email, 'Subscription email should match');
      this.assert(subscription.interestRoomOffers === true, 'Subscription should record interest in room offers');
      this.assert(subscription.interestRestaurantEvents === true, 'Subscription should record interest in restaurant events');
      this.assert(subscription.frequency === frequency, 'Subscription frequency should match');
      this.assert(subscription.consentMarketing === true, 'Subscription should record marketing consent');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
