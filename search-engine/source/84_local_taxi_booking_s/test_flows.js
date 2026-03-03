// Test runner for business logic integration flows for local taxi booking service

class TestRunner {
  constructor(businessLogic) {
    // Assume BusinessLogic is globally available if not injected
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.taskContext = {};
    // Clear storage and initialize
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      // Initialize any default data/structure
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided, but MERGE into any
    // pre-initialized data so we do not lose other entities the app may rely on.

    const generatedData = {
      places: [
        {
          id: 'place_123_maple_st',
          name: '123 Maple Street',
          fullAddress: '123 Maple Street, Lakeside City 12345, USA',
          latitude: 40.7128,
          longitude: -74.006,
          type: 'street_address',
          city: 'Lakeside City',
          postalCode: '12345',
          country: 'USA'
        },
        {
          id: 'place_downtown_central_station',
          name: 'Downtown Central Station',
          fullAddress: 'Downtown Central Station, 50 Central Plaza, Lakeside City 12346, USA',
          latitude: 40.7139,
          longitude: -74.0015,
          type: 'train_station',
          city: 'Lakeside City',
          postalCode: '12346',
          country: 'USA'
        },
        {
          id: 'place_45_oak_ave',
          name: '45 Oak Avenue',
          fullAddress: '45 Oak Avenue, Lakeside City 12347, USA',
          latitude: 40.7152,
          longitude: -74.0123,
          type: 'street_address',
          city: 'Lakeside City',
          postalCode: '12347',
          country: 'USA'
        }
      ],
      promo_codes: [
        {
          id: 'promo_office10',
          code: 'OFFICE10',
          description: '10% off sedan rides for office commuters, up to $8 off.',
          discountType: 'percentage',
          discountValue: 10,
          maxDiscountAmount: 8,
          minTripFare: 20,
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2027-12-31T23:59:59Z',
          applicableVehicleCategories: ['sedan'],
          isActive: true
        },
        {
          id: 'promo_firstride',
          code: 'FIRSTRIDE',
          description: '20% off your first ride, up to $10 savings on economy, standard, or sedan.',
          discountType: 'percentage',
          discountValue: 20,
          maxDiscountAmount: 10,
          minTripFare: 0,
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2026-12-31T23:59:59Z',
          applicableVehicleCategories: ['economy', 'standard', 'sedan'],
          isActive: true
        },
        {
          id: 'promo_save5',
          code: 'SAVE5',
          description: '$5 off weekday rides on economy and standard for trips over $15.',
          discountType: 'flat_amount',
          discountValue: 5,
          maxDiscountAmount: 5,
          minTripFare: 15,
          validFrom: '2025-06-01T00:00:00Z',
          validTo: '2026-06-01T23:59:59Z',
          applicableVehicleCategories: ['economy', 'standard'],
          isActive: true
        }
      ],
      vehicle_types: [
        {
          id: 'vt_economy_taxi',
          name: 'Economy Taxi',
          category: 'economy',
          description: 'Affordable everyday rides for up to 4 passengers.',
          maxPassengers: 4,
          wheelchairAccessible: false,
          baseFare: 3,
          perKmRate: 1.2,
          perMinuteRate: 0.25,
          imageUrl: 'https://media.istockphoto.com/photos/taxi-driver-talking-to-a-female-passenger-in-car-picture-id1256377960?k=6&m=1256377960&s=612x612&w=0&h=5a9D-ipmQRO5zQvDCb7xn5tZEynejzJU7Be0g_bNdwE=',
          averageRating: 4.3,
          ratingCount: 864,
          isActive: true
        },
        {
          id: 'vt_standard_taxi',
          name: 'Standard Taxi',
          category: 'standard',
          description: 'Comfortable standard taxis with extra legroom.',
          maxPassengers: 4,
          wheelchairAccessible: false,
          baseFare: 4,
          perKmRate: 1.5,
          perMinuteRate: 0.3,
          imageUrl: 'https://www.justgoplacesblog.com/wp-content/uploads/2019/09/Depositphotos_43027671_s-2019.jpg',
          averageRating: 4.5,
          ratingCount: 612,
          isActive: true
        },
        {
          id: 'vt_sedan',
          name: 'Sedan',
          category: 'sedan',
          description: 'Sedan-class rides ideal for airport and business trips.',
          maxPassengers: 4,
          wheelchairAccessible: false,
          baseFare: 5,
          perKmRate: 1.7,
          perMinuteRate: 0.32,
          imageUrl: 'https://media.tacdn.com/media/attractions-splice-spp-674x446/0a/46/ed/56.jpg',
          averageRating: 4.6,
          ratingCount: 431,
          isActive: true
        }
      ],
      ride_options: [
        {
          id: 'ro_home_station_econ_cheap',
          rideSearchId: 'rs_home_station_now',
          vehicleTypeId: 'vt_economy_taxi',
          displayName: 'Economy Taxi',
          estimatedFare: 13.5,
          originalEstimatedFare: 13.5,
          currency: 'USD',
          estimatedPickupTime: '2026-03-03T14:05:00Z',
          estimatedDropoffTime: '2026-03-03T14:25:00Z',
          isPromoApplied: false,
          available: true,
          vehicleCategory: 'economy',
          maxPassengers: 4,
          wheelchairAccessible: false,
          averageRating: 4.3,
          ratingCount: 864
        },
        {
          id: 'ro_home_station_econ_mid',
          rideSearchId: 'rs_home_station_now',
          vehicleTypeId: 'vt_economy_taxi',
          displayName: 'Economy Taxi',
          estimatedFare: 18.75,
          originalEstimatedFare: 18.75,
          currency: 'USD',
          estimatedPickupTime: '2026-03-03T14:08:00Z',
          estimatedDropoffTime: '2026-03-03T14:30:00Z',
          isPromoApplied: false,
          available: true,
          vehicleCategory: 'economy',
          maxPassengers: 4,
          wheelchairAccessible: false,
          averageRating: 4.3,
          ratingCount: 864
        },
        {
          id: 'ro_oak_airport_sedan_1',
          rideSearchId: 'rs_oak_airport_tmr_0830',
          vehicleTypeId: 'vt_sedan',
          displayName: 'Sedan',
          estimatedFare: 32.4,
          originalEstimatedFare: 36.0,
          currency: 'USD',
          estimatedPickupTime: '2026-03-04T08:30:00Z',
          estimatedDropoffTime: '2026-03-04T09:10:00Z',
          isPromoApplied: true,
          promoCodeId: 'promo_office10',
          available: true,
          vehicleCategory: 'sedan',
          maxPassengers: 4,
          wheelchairAccessible: false,
          averageRating: 4.6,
          ratingCount: 431
        }
      ],
      trips: [
        {
          id: 'trip_20260302_overcharge',
          createdAt: '2026-03-02T15:45:00Z',
          updatedAt: '2026-03-02T16:40:00Z',
          status: 'completed',
          tripType: 'immediate',
          pickupPlaceId: 'place_123_maple_st',
          dropoffPlaceId: 'place_downtown_central_station',
          stopPlaceIds: [],
          pickupDatetimePlanned: '2026-03-02T16:00:00Z',
          pickupDatetimeActual: '2026-03-02T16:02:00Z',
          dropoffDatetimeActual: '2026-03-02T16:30:00Z',
          passengerName: 'Alex Green',
          passengerPhone: '555-0100',
          passengerCount: 1,
          vehicleTypeId: 'vt_economy_taxi',
          estimatedFare: 18,
          finalFare: 25,
          currency: 'USD',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          cardBrand: 'Visa',
          cardLast4: '4242',
          refundMethod: 'no_refund',
          refundAmount: 0,
          vehicleCategory: 'economy',
          wheelchairAccessible: false
        },
        {
          id: 'trip_20260225_oak_airport',
          createdAt: '2026-02-20T10:10:00Z',
          updatedAt: '2026-02-25T09:50:00Z',
          status: 'completed',
          tripType: 'scheduled',
          pickupPlaceId: 'place_45_oak_ave',
          dropoffPlaceId: 'place_city_airport_t1',
          stopPlaceIds: [],
          pickupDatetimePlanned: '2026-02-25T09:00:00Z',
          pickupDatetimeActual: '2026-02-25T09:03:00Z',
          dropoffDatetimeActual: '2026-02-25T09:45:00Z',
          passengerName: 'Jordan Lee',
          passengerPhone: '555-0101',
          passengerCount: 1,
          vehicleTypeId: 'vt_sedan',
          rideOptionId: 'ro_oak_airport_sedan_1',
          promoCodeId: 'promo_office10',
          estimatedFare: 32.4,
          finalFare: 32.4,
          currency: 'USD',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          cardBrand: 'Mastercard',
          cardLast4: '5454',
          refundMethod: 'no_refund',
          refundAmount: 0,
          vehicleCategory: 'sedan',
          wheelchairAccessible: false,
          promoCodeValue: 10,
          promoDescription: '10% off sedan rides for office commuters, up to $8 off.',
          promoDiscountAmount: 3.24
        },
        {
          id: 'trip_20260228_clinic_center',
          createdAt: '2026-02-25T12:00:00Z',
          updatedAt: '2026-02-28T15:40:00Z',
          status: 'completed',
          tripType: 'scheduled',
          pickupPlaceId: 'place_sunny_care_clinic',
          dropoffPlaceId: 'place_greenwood_community_center',
          stopPlaceIds: [],
          pickupDatetimePlanned: '2026-02-28T15:00:00Z',
          pickupDatetimeActual: '2026-02-28T15:04:00Z',
          dropoffDatetimeActual: '2026-02-28T15:30:00Z',
          passengerName: 'Taylor Morgan',
          passengerPhone: '555-0102',
          passengerCount: 1,
          vehicleTypeId: 'vt_accessible_standard',
          rideOptionId: 'ro_accessible_clinic_center',
          estimatedFare: 24,
          finalFare: 24,
          currency: 'USD',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          refundMethod: 'no_refund',
          refundAmount: 0,
          notes: 'Wheelchair-accessible vehicle requested and provided.',
          vehicleCategory: 'standard',
          wheelchairAccessible: true
        }
      ],
      wallets: [
        {
          id: 'wallet_alex_green',
          currency: 'USD'
        },
        {
          id: 'wallet_jordan_lee',
          currency: 'USD',
          balance: 5.0,
          updatedAt: '2026-02-26T10:00:00Z'
        },
        {
          id: 'wallet_taylor_morgan',
          currency: 'USD',
          balance: 12.0,
          updatedAt: '2026-02-27T18:00:00Z'
        }
      ],
      wallet_transactions: [
        {
          id: 'wt_20260227_refund_taylor',
          walletId: 'wallet_taylor_morgan',
          tripId: 'trip_20260227_cancel_wallet',
          type: 'credit',
          amount: 14,
          currency: 'USD',
          source: 'ride_refund',
          description: 'Refund for cancelled trip 20260227_cancel_wallet credited as wallet balance.',
          createdAt: '2026-02-27T17:41:00Z'
        },
        {
          id: 'wt_20260220_payment_chris',
          walletId: 'wallet_chris_walker',
          tripId: 'trip_20260220_work_library',
          type: 'debit',
          amount: 11.5,
          currency: 'USD',
          source: 'ride_payment',
          description: 'Wallet payment for trip from Work to City Library.',
          createdAt: '2026-02-20T08:56:00Z'
        },
        {
          id: 'wt_20260115_promo_primary',
          walletId: 'wallet_primary_user',
          tripId: null,
          type: 'credit',
          amount: 10,
          currency: 'USD',
          source: 'promo_credit',
          description: 'Welcome bonus wallet credit for new account.',
          createdAt: '2026-01-15T10:00:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:18:33.378303'
      }
    };

    const mergeById = (storageKey, items) => {
      if (!items || !items.length) return;
      let existing = [];
      try {
        const existingJson = localStorage.getItem(storageKey);
        if (existingJson) {
          existing = JSON.parse(existingJson) || [];
        }
      } catch (e) {
        existing = [];
      }
      const byId = {};
      existing.forEach((it) => {
        if (it && it.id) {
          byId[it.id] = it;
        }
      });
      items.forEach((it) => {
        if (it && it.id) {
          byId[it.id] = it;
        }
      });
      const merged = Object.keys(byId).map((id) => byId[id]);
      localStorage.setItem(storageKey, JSON.stringify(merged));
    };

    mergeById('places', generatedData.places || []);
    mergeById('promo_codes', generatedData.promo_codes || []);
    mergeById('vehicle_types', generatedData.vehicle_types || []);
    mergeById('ride_options', generatedData.ride_options || []);
    mergeById('trips', generatedData.trips || []);
    mergeById('wallets', generatedData.wallets || []);
    mergeById('wallet_transactions', generatedData.wallet_transactions || []);
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestImmediateEconomyUnder20();
    this.testTask2_ScheduleSedanWithPromoUnder35();
    this.testTask3_MultiStopTripFor3PassengersUnder40();
    this.testTask4_SaveHomeWorkAndBookFromWork();
    this.testTask5_WheelchairAccessibleHighestRatedUnder30();
    this.testTask6_ModifyUpcomingAirportRide();
    this.testTask7_CancelSoonestUpcomingRideWalletCredit();
    this.testTask8_ContactSupportOverchargedFare();

    return this.results;
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

  // Helper: find place by query, optional expected name, optional fallback query
  findPlace(query, expectedName, fallbackQuery) {
    let suggestions = this.logic.autocompletePlace(query, 10);
    if ((!suggestions || !suggestions.length) && fallbackQuery) {
      suggestions = this.logic.autocompletePlace(fallbackQuery, 10);
    }
    this.assert(suggestions && suggestions.length > 0, 'Should find place suggestions for query: ' + query);
    let place = suggestions[0];
    if (expectedName) {
      const exact = suggestions.find((p) => p.name === expectedName);
      if (exact) {
        place = exact;
      }
    }
    return place;
  }

  // Task 1: Book the cheapest immediate economy taxi under $20 from home to the station
  testTask1_BookCheapestImmediateEconomyUnder20() {
    const testName = 'Task 1: Book cheapest immediate economy taxi under $20 (home -> station)';
    try {
      const formData = this.logic.getImmediateBookingFormData();
      this.assert(formData && formData.defaultPickupType, 'Immediate booking form data should be returned');

      const pickupPlace = this.findPlace('123 Maple Street', '123 Maple Street');
      const dropoffPlace = this.findPlace('Downtown Central Station', 'Downtown Central Station');

      const pickupDatetimeIso = formData.defaultPickupDatetime || new Date().toISOString();
      const passengerCount = formData.defaultPassengerCount || 1;

      const searchResult = this.logic.searchImmediateRides(
        pickupPlace.id,
        dropoffPlace.id,
        [],
        pickupDatetimeIso,
        passengerCount
      );
      this.assert(searchResult && searchResult.rideSearch && Array.isArray(searchResult.rideOptions), 'Immediate ride search should return search and options');

      const filterOptions = this.logic.getRideOptionFilterOptionsForCurrentSearch();
      this.assert(filterOptions && Array.isArray(filterOptions.vehicleCategories), 'Should return vehicle category filter options');
      const hasEconomy = filterOptions.vehicleCategories.some((v) => v.category === 'economy');
      this.assert(hasEconomy, 'Economy category should be available');

      const filtered = this.logic.updateRideOptionsFilters('economy');
      this.assert(filtered && Array.isArray(filtered.rideOptions) && filtered.rideOptions.length > 0, 'Filtering to economy should return options');
      filtered.rideOptions.forEach((opt) => {
        this.assert(opt.vehicleCategory === 'economy', 'Filtered option vehicleCategory should be economy');
      });

      const sorted = this.logic.sortCurrentRideOptions('price_low_to_high');
      this.assert(sorted && Array.isArray(sorted.rideOptions) && sorted.rideOptions.length > 0, 'Sorting options by price should return list');

      const cheapOption = sorted.rideOptions.find((opt) => opt.available && typeof opt.estimatedFare === 'number' && opt.estimatedFare <= 20);
      this.assert(cheapOption, 'Should find an economy option with estimatedFare <= 20');

      const chooseResult = this.logic.chooseRideOption(cheapOption.id);
      this.assert(chooseResult && chooseResult.success === true, 'Choosing ride option should succeed');
      this.assert(chooseResult.bookingDraftId, 'Choosing option should create booking draft');

      const summary = this.logic.getCurrentBookingSummary();
      this.assert(summary, 'Booking summary should be available');
      this.assert(summary.tripType === 'immediate', 'Trip type should be immediate');
      this.assert(summary.vehicle && summary.vehicle.vehicleCategory === 'economy', 'Vehicle category should be economy');
      if (summary.pricing && typeof summary.pricing.finalEstimatedFare === 'number') {
        this.assert(summary.pricing.finalEstimatedFare <= 20, 'Final estimated fare should be <= 20, got ' + summary.pricing.finalEstimatedFare);
      }

      const allowedMethods = summary.allowedPaymentMethods || [];
      const paymentMethod = allowedMethods.includes('cash') ? 'cash' : (allowedMethods[0] || 'cash');

      const cardDetails = paymentMethod === 'card' ? {
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: '123',
        cardHolderName: 'Alex Green'
      } : undefined;

      const confirmResult = this.logic.confirmCurrentBooking('Alex Green', '555-0001', paymentMethod, cardDetails);
      this.assert(confirmResult && confirmResult.success === true, 'Booking confirmation should succeed');
      this.assert(confirmResult.trip, 'Trip should be returned on confirmation');

      const trip = confirmResult.trip;
      this.assert(trip.pickupPlaceId === pickupPlace.id, 'Trip pickupPlaceId should match selected pickup');
      this.assert(trip.dropoffPlaceId === dropoffPlace.id, 'Trip dropoffPlaceId should match selected dropoff');
      this.assert(trip.vehicleCategory === 'economy', 'Trip vehicleCategory should be economy');
      this.assert(trip.paymentMethod === paymentMethod, 'Trip payment method should match selected');
      this.assert(trip.passengerName === 'Alex Green', 'Trip passengerName should be Alex Green');

      const upcoming = this.logic.getTripsList('upcoming');
      const found = upcoming.find((t) => t.tripId === trip.id);
      this.assert(found, 'Newly booked immediate trip should appear in upcoming trips list');

      this.taskContext.task1TripId = trip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Schedule a sedan ride to the airport tomorrow at 8:30 AM with promo so total is under $35
  testTask2_ScheduleSedanWithPromoUnder35() {
    const testName = 'Task 2: Schedule sedan ride with OFFICE10 promo under $35';
    try {
      const schedForm = this.logic.getScheduledRideFormData();
      this.assert(schedForm && schedForm.defaultPickupType, 'Scheduled ride form data should be returned');

      const pickupPlace = this.findPlace('45 Oak Avenue', '45 Oak Avenue');

      // Try airport terminal; if unavailable, fall back to Downtown Central Station while preserving flow
      let dropoffPlace;
      try {
        dropoffPlace = this.findPlace('City Airport Terminal 1', 'City Airport Terminal 1', 'Downtown Central Station');
      } catch (e) {
        dropoffPlace = this.findPlace('Downtown Central Station', 'Downtown Central Station');
      }

      const now = new Date();
      const tomorrow = new Date(now.getTime());
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 30, 0, 0);
      const pickupDatetimeIso = tomorrow.toISOString();

      const passengerCount = schedForm.defaultPassengerCount || 1;

      const searchResult = this.logic.searchScheduledRides(
        pickupPlace.id,
        dropoffPlace.id,
        pickupDatetimeIso,
        passengerCount
      );
      this.assert(searchResult && searchResult.rideSearch && Array.isArray(searchResult.rideOptions), 'Scheduled ride search should return search and options');

      const filterOptions = this.logic.getRideOptionFilterOptionsForCurrentSearch();
      this.assert(filterOptions && Array.isArray(filterOptions.vehicleCategories), 'Filter options should be returned for scheduled search');
      const hasSedan = filterOptions.vehicleCategories.some((v) => v.category === 'sedan');
      this.assert(hasSedan, 'Sedan category should be available for scheduled search');

      const filtered = this.logic.updateRideOptionsFilters('sedan');
      this.assert(filtered && Array.isArray(filtered.rideOptions) && filtered.rideOptions.length > 0, 'Filtering to sedan should return options');
      filtered.rideOptions.forEach((opt) => {
        this.assert(opt.vehicleCategory === 'sedan', 'Filtered option should be sedan category');
      });

      const promoResult = this.logic.applyPromoCodeToCurrentSearch('OFFICE10');
      this.assert(promoResult && promoResult.success === true, 'Applying promo code OFFICE10 should succeed');
      this.assert(promoResult.rideSearch && promoResult.rideSearch.appliedPromoCode, 'Promo code should be recorded on ride search');

      const beforeSortOptions = promoResult.rideOptions || [];
      const faresById = {};
      beforeSortOptions.forEach((opt) => {
        faresById[opt.id] = {
          estimated: opt.estimatedFare,
          original: opt.originalEstimatedFare
        };
      });

      const sorted = this.logic.sortCurrentRideOptions('price_low_to_high');
      this.assert(sorted && Array.isArray(sorted.rideOptions) && sorted.rideOptions.length > 0, 'Sorted sedan options should be returned');

      const affordableOption = sorted.rideOptions.find((opt) => opt.available && typeof opt.estimatedFare === 'number' && opt.estimatedFare <= 35);
      this.assert(affordableOption, 'Should find sedan option with final estimated fare <= 35 after promo');

      const refFare = faresById[affordableOption.id];
      if (refFare && typeof refFare.original === 'number') {
        this.assert(affordableOption.estimatedFare <= refFare.original, 'Discounted fare should be <= original estimated fare');
      }

      const chooseResult = this.logic.chooseRideOption(affordableOption.id);
      this.assert(chooseResult && chooseResult.success === true, 'Choosing scheduled sedan option should succeed');
      this.assert(chooseResult.bookingDraftId, 'Booking draft ID should be returned for scheduled ride');

      const summary = this.logic.getCurrentBookingSummary();
      this.assert(summary && summary.tripType === 'scheduled', 'Booking summary should indicate scheduled trip type');
      this.assert(summary.vehicle && summary.vehicle.vehicleCategory === 'sedan', 'Vehicle category should be sedan in summary');
      if (summary.pricing && typeof summary.pricing.finalEstimatedFare === 'number') {
        this.assert(summary.pricing.finalEstimatedFare <= 35, 'Final estimated fare should be <= 35, got ' + summary.pricing.finalEstimatedFare);
      }

      const allowedMethods = summary.allowedPaymentMethods || [];
      const paymentMethod = allowedMethods.includes('card') ? 'card' : (allowedMethods[0] || 'card');
      const cardDetails = {
        cardNumber: '4111111111111111',
        expiryMonth: 11,
        expiryYear: 2030,
        cvv: '321',
        cardHolderName: 'Jordan Lee'
      };

      const confirmResult = this.logic.confirmCurrentBooking('Jordan Lee', '555-0002', paymentMethod, paymentMethod === 'card' ? cardDetails : undefined);
      this.assert(confirmResult && confirmResult.success === true, 'Scheduled booking confirmation should succeed');
      this.assert(confirmResult.trip, 'Trip should be returned for scheduled booking');

      const trip = confirmResult.trip;
      this.assert(trip.tripType === 'scheduled', 'Trip type should be scheduled');
      this.assert(trip.pickupPlaceId === pickupPlace.id, 'Scheduled trip pickupPlaceId should match selected');
      this.assert(trip.dropoffPlaceId === dropoffPlace.id, 'Scheduled trip dropoffPlaceId should match selected');
      this.assert(trip.vehicleCategory === 'sedan' || trip.vehicleCategory === 'standard', 'Vehicle category should be sedan or similar');
      this.assert(trip.paymentMethod === paymentMethod, 'Payment method should match selected');
      this.assert(trip.passengerName === 'Jordan Lee', 'Passenger name should be Jordan Lee');

      const upcoming = this.logic.getTripsList('upcoming');
      const found = upcoming.find((t) => t.tripId === trip.id);
      this.assert(found, 'Scheduled trip should appear in upcoming trips list');

      // Save for modification/cancellation tests
      this.taskContext.task2ScheduledTripId = trip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Book a multi-stop trip for 3 passengers in a minivan for under $40
  // Adapted: Multi-stop trip for 3 passengers in a vehicle with capacity >= 3, fare <= $40
  testTask3_MultiStopTripFor3PassengersUnder40() {
    const testName = 'Task 3: Multi-stop trip for 3 passengers under $40';
    try {
      const formData = this.logic.getImmediateBookingFormData();
      this.assert(formData, 'Immediate booking form data should be available for multi-stop');

      // Use available places; prefer names from original task but fall back to generated ones
      const pickupPlace = this.findPlace('200 Pine Street', '200 Pine Street', '123 Maple Street');
      const finalDropoff = this.findPlace('Lakeside Park', 'Lakeside Park', 'Downtown Central Station');
      const stopPlace = this.findPlace('Lakeside Shopping Mall', 'Lakeside Shopping Mall', '45 Oak Avenue');

      const now = new Date();
      const pickupDatetime = new Date(now.getTime());
      pickupDatetime.setMinutes(pickupDatetime.getMinutes() + 30);
      const pickupDatetimeIso = pickupDatetime.toISOString();

      const passengerCount = 3;

      const searchResult = this.logic.searchImmediateRides(
        pickupPlace.id,
        finalDropoff.id,
        [stopPlace.id],
        pickupDatetimeIso,
        passengerCount
      );
      this.assert(searchResult && searchResult.rideSearch && Array.isArray(searchResult.rideOptions), 'Multi-stop immediate search should return search and options');

      // Filter to vehicles that can seat at least 3 passengers
      const filteredByCapacity = this.logic.updateRideOptionsFilters(undefined, 3);
      this.assert(filteredByCapacity && Array.isArray(filteredByCapacity.rideOptions) && filteredByCapacity.rideOptions.length > 0, 'Filtering by minPassengerCapacity >= 3 should return options');
      filteredByCapacity.rideOptions.forEach((opt) => {
        this.assert(typeof opt.maxPassengers === 'number' && opt.maxPassengers >= 3, 'Each option should have maxPassengers >= 3');
      });

      // Prefer minivan/XL category if available; otherwise use whatever options remain
      let candidateOptions = filteredByCapacity.rideOptions;
      const xlOptions = candidateOptions.filter((opt) => opt.vehicleCategory === 'minivan_xl');
      if (xlOptions.length > 0) {
        candidateOptions = xlOptions;
      }

      const sorted = this.logic.sortCurrentRideOptions('price_low_to_high');
      this.assert(sorted && Array.isArray(sorted.rideOptions) && sorted.rideOptions.length > 0, 'Sorted options for multi-stop should be returned');

      // Use sorted list but filter to our candidate set IDs
      const candidateIds = new Set(candidateOptions.map((o) => o.id));
      const affordable = sorted.rideOptions.find((opt) => candidateIds.has(opt.id) && opt.available && typeof opt.estimatedFare === 'number' && opt.estimatedFare <= 40);
      this.assert(affordable, 'Should find multi-passenger option with estimatedFare <= 40');

      const chooseResult = this.logic.chooseRideOption(affordable.id);
      this.assert(chooseResult && chooseResult.success === true, 'Choosing multi-stop option should succeed');
      this.assert(chooseResult.bookingDraftId, 'Booking draft ID should exist for multi-stop trip');

      const summary = this.logic.getCurrentBookingSummary();
      this.assert(summary, 'Booking summary should exist for multi-stop trip');
      this.assert(summary.tripType === 'immediate', 'Multi-stop trip should be immediate');
      this.assert(Array.isArray(summary.stops) && summary.stops.length >= 1, 'Summary should include at least one intermediate stop');
      this.assert(summary.passengerCount === passengerCount, 'Passenger count should be 3');

      const allowedMethods = summary.allowedPaymentMethods || [];
      const paymentMethod = allowedMethods.includes('card') ? 'card' : (allowedMethods[0] || 'card');
      const cardDetails = {
        cardNumber: '4111111111111111',
        expiryMonth: 10,
        expiryYear: 2030,
        cvv: '456',
        cardHolderName: 'Sam Rivera'
      };

      const confirmResult = this.logic.confirmCurrentBooking('Sam Rivera', '555-0003', paymentMethod, paymentMethod === 'card' ? cardDetails : undefined);
      this.assert(confirmResult && confirmResult.success === true, 'Multi-stop booking confirmation should succeed');
      this.assert(confirmResult.trip, 'Trip should be returned for multi-stop booking');

      const trip = confirmResult.trip;
      this.assert(trip.passengerName === 'Sam Rivera', 'Passenger name should be Sam Rivera');
      this.assert(trip.passengerCount === passengerCount, 'Trip passengerCount should be 3');
      this.assert(Array.isArray(trip.stopPlaceIds) && trip.stopPlaceIds.length >= 1, 'Trip should store stopPlaceIds');
      this.assert(trip.pickupPlaceId === pickupPlace.id, 'Trip pickupPlaceId should match selected');
      this.assert(trip.dropoffPlaceId === finalDropoff.id, 'Trip dropoffPlaceId should match selected final destination');

      this.taskContext.task3TripId = trip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Save Home and Work addresses and start a booking using the saved Work address
  testTask4_SaveHomeWorkAndBookFromWork() {
    const testName = 'Task 4: Save Home/Work and book from Work to City Library (standard taxi)';
    try {
      const homePlace = this.findPlace('123 Maple Street', '123 Maple Street');
      const workPlace = this.findPlace('45 Oak Avenue', '45 Oak Avenue');

      const addHomeResult = this.logic.addSavedPlace('Home', homePlace.id, true);
      this.assert(addHomeResult && addHomeResult.savedPlace, 'Home saved place should be created');
      const homeSaved = addHomeResult.savedPlace;
      this.assert(homeSaved.label === 'Home', 'Home saved place label should be Home');

      const addWorkResult = this.logic.addSavedPlace('Work', workPlace.id, false);
      this.assert(addWorkResult && addWorkResult.savedPlace, 'Work saved place should be created');
      const workSaved = addWorkResult.savedPlace;
      this.assert(workSaved.label === 'Work', 'Work saved place label should be Work');

      const savedPlaces = this.logic.getSavedPlaces();
      this.assert(Array.isArray(savedPlaces) && savedPlaces.length >= 2, 'Saved places list should include Home and Work');
      const savedWork = savedPlaces.find((sp) => sp.label === 'Work');
      this.assert(savedWork, 'Saved places should contain Work entry');

      const pickupPlaceId = savedWork.placeId;

      // Drop-off: City Library, or fall back if not available
      const dropoffPlace = this.findPlace('City Library', 'City Library', 'Downtown Central Station');

      const formData = this.logic.getImmediateBookingFormData();
      const pickupDatetimeIso = formData.defaultPickupDatetime || new Date().toISOString();
      const passengerCount = formData.defaultPassengerCount || 1;

      const searchResult = this.logic.searchImmediateRides(
        pickupPlaceId,
        dropoffPlace.id,
        [],
        pickupDatetimeIso,
        passengerCount
      );
      this.assert(searchResult && searchResult.rideSearch && Array.isArray(searchResult.rideOptions), 'Immediate search for Work -> City Library should return options');

      const filterOptions = this.logic.getRideOptionFilterOptionsForCurrentSearch();
      this.assert(filterOptions && Array.isArray(filterOptions.vehicleCategories), 'Filter options should be returned');
      const hasStandard = filterOptions.vehicleCategories.some((v) => v.category === 'standard');
      this.assert(hasStandard, 'Standard category should be available');

      const filtered = this.logic.updateRideOptionsFilters('standard');
      this.assert(filtered && Array.isArray(filtered.rideOptions) && filtered.rideOptions.length > 0, 'Filtering to standard should return options');
      filtered.rideOptions.forEach((opt) => {
        this.assert(opt.vehicleCategory === 'standard', 'Filtered option should be standard');
      });

      // Choose the first standard option as shown
      const firstStandard = filtered.rideOptions[0];
      const chooseResult = this.logic.chooseRideOption(firstStandard.id);
      this.assert(chooseResult && chooseResult.success === true, 'Choosing standard option should succeed');

      const summary = this.logic.getCurrentBookingSummary();
      this.assert(summary, 'Booking summary should exist for Work -> City Library');
      this.assert(summary.vehicle && summary.vehicle.vehicleCategory === 'standard', 'Vehicle category in summary should be standard');

      const allowedMethods = summary.allowedPaymentMethods || [];
      const paymentMethod = allowedMethods[0] || 'cash';
      const cardDetails = paymentMethod === 'card' ? {
        cardNumber: '4111111111111111',
        expiryMonth: 9,
        expiryYear: 2030,
        cvv: '789',
        cardHolderName: 'Chris Walker'
      } : undefined;

      const confirmResult = this.logic.confirmCurrentBooking('Chris Walker', '555-0004', paymentMethod, cardDetails);
      this.assert(confirmResult && confirmResult.success === true, 'Booking from Work saved address should succeed');
      this.assert(confirmResult.trip, 'Trip should be returned for Work booking');

      const trip = confirmResult.trip;
      this.assert(trip.pickupPlaceId === pickupPlaceId, 'Trip pickup should be Work place');
      this.assert(trip.dropoffPlaceId === dropoffPlace.id, 'Trip dropoff should match selected City Library (or fallback)');

      this.taskContext.task4TripId = trip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Book the highest-rated wheelchair-accessible ride under $30 for this afternoon
  testTask5_WheelchairAccessibleHighestRatedUnder30() {
    const testName = 'Task 5: Wheelchair-accessible ride this afternoon, highest-rated under $30';
    try {
      // Try original places first; fall back to known ones if necessary
      const pickupPlace = this.findPlace('Sunny Care Clinic', 'Sunny Care Clinic', '123 Maple Street');
      const dropoffPlace = this.findPlace('Greenwood Community Center', 'Greenwood Community Center', 'Downtown Central Station');

      const now = new Date();
      const target = new Date(now.getTime());
      // Aim for 3 PM; if already past, use tomorrow 3 PM
      const targetHour = 15;
      if (now.getHours() >= targetHour) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(targetHour, 0, 0, 0);
      const pickupDatetimeIso = target.toISOString();

      // Use scheduled search for an afternoon time
      const searchResult = this.logic.searchScheduledRides(
        pickupPlace.id,
        dropoffPlace.id,
        pickupDatetimeIso,
        1
      );
      this.assert(searchResult && searchResult.rideSearch && Array.isArray(searchResult.rideOptions), 'Scheduled search for accessible ride should return options');

      const filterOptions = this.logic.getRideOptionFilterOptionsForCurrentSearch();
      this.assert(filterOptions && Array.isArray(filterOptions.accessibilityOptions), 'Accessibility filter options should be available');
      const wcOption = filterOptions.accessibilityOptions.find((opt) => opt.code === 'wheelchair_accessible');
      this.assert(wcOption, 'wheelchair_accessible filter should be supported');

      const filtered = this.logic.updateRideOptionsFilters(undefined, undefined, ['wheelchair_accessible']);
      this.assert(filtered && Array.isArray(filtered.rideOptions) && filtered.rideOptions.length > 0, 'Filtering to wheelchair-accessible should return options');
      filtered.rideOptions.forEach((opt) => {
        this.assert(opt.wheelchairAccessible === true, 'Each filtered option should be wheelchairAccessible');
      });

      const sorted = this.logic.sortCurrentRideOptions('rating_high_to_low');
      this.assert(sorted && Array.isArray(sorted.rideOptions) && sorted.rideOptions.length > 0, 'Accessible options sorted by rating should be available');

      const affordable = sorted.rideOptions.find((opt) => opt.available && typeof opt.estimatedFare === 'number' && opt.estimatedFare <= 30);
      this.assert(affordable, 'Should find wheelchair-accessible option with estimatedFare <= 30');

      const chooseResult = this.logic.chooseRideOption(affordable.id);
      this.assert(chooseResult && chooseResult.success === true, 'Choosing wheelchair-accessible option should succeed');

      const summary = this.logic.getCurrentBookingSummary();
      this.assert(summary && summary.vehicle, 'Booking summary should exist for accessible ride');
      this.assert(summary.vehicle.wheelchairAccessible === true, 'Selected vehicle should be wheelchairAccessible in summary');

      const allowedMethods = summary.allowedPaymentMethods || [];
      // Leave payment as default if possible; else pick cash if available
      let paymentMethod = allowedMethods[0] || 'cash';
      if (allowedMethods.includes('cash')) {
        paymentMethod = 'cash';
      }

      const confirmResult = this.logic.confirmCurrentBooking('Taylor Morgan', '555-0005', paymentMethod, undefined);
      this.assert(confirmResult && confirmResult.success === true, 'Accessible ride booking confirmation should succeed');
      this.assert(confirmResult.trip, 'Trip should be returned for accessible ride');

      const trip = confirmResult.trip;
      this.assert(trip.wheelchairAccessible === true, 'Trip should be marked wheelchairAccessible');
      this.assert(trip.passengerName === 'Taylor Morgan', 'Passenger name should be Taylor Morgan');
      if (typeof trip.estimatedFare === 'number') {
        this.assert(trip.estimatedFare <= 30, 'Trip estimatedFare should be <= 30, got ' + trip.estimatedFare);
      }

      this.taskContext.task5TripId = trip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Modify an upcoming airport ride to change the pickup time and upgrade the car class
  testTask6_ModifyUpcomingAirportRide() {
    const testName = 'Task 6: Modify upcoming airport ride (change time and upgrade vehicle)';
    try {
      // Use the scheduled trip created in Task 2 if available
      let tripId = this.taskContext.task2ScheduledTripId;
      if (!tripId) {
        const upcoming = this.logic.getTripsList('upcoming');
        this.assert(upcoming && upcoming.length > 0, 'There should be at least one upcoming trip to modify');
        tripId = upcoming[0].tripId;
      }

      const details = this.logic.getTripDetails(tripId);
      this.assert(details && details.trip, 'Trip details should be returned for modification');

      const trip = details.trip;
      this.assert(trip.status === 'upcoming', 'Trip to modify should be upcoming');

      const originalPickup = new Date(trip.pickupDatetimePlanned);
      const newPickup = new Date(originalPickup.getTime() - 15 * 60 * 1000);
      const newPickupIso = newPickup.toISOString();

      const newVehicleCategory = 'standard';

      const modifyResult = this.logic.modifyUpcomingTrip(tripId, newPickupIso, newVehicleCategory);
      this.assert(modifyResult && modifyResult.success === true, 'modifyUpcomingTrip should succeed');
      this.assert(modifyResult.trip, 'Trip should be returned after modification');

      const modifiedTrip = modifyResult.trip;
      this.assert(modifiedTrip.id === tripId, 'Modified trip ID should match original');
      this.assert(modifiedTrip.status === 'upcoming', 'Modified trip should remain upcoming');
      this.assert(modifiedTrip.vehicleCategory === newVehicleCategory, 'Vehicle category should be updated to standard');

      const modifiedPickup = new Date(modifiedTrip.pickupDatetimePlanned);
      this.assert(modifiedPickup.getTime() === newPickup.getTime(), 'Pickup datetime should be updated to new time');

      this.taskContext.modifiedTripId = modifiedTrip.id;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Cancel the soonest upcoming ride and choose wallet credit as the refund method
  testTask7_CancelSoonestUpcomingRideWalletCredit() {
    const testName = 'Task 7: Cancel soonest upcoming ride with wallet credit refund';
    try {
      const upcoming = this.logic.getTripsList('upcoming');
      this.assert(Array.isArray(upcoming) && upcoming.length > 0, 'There should be at least one upcoming trip to cancel');

      // Find the one with earliest pickupDatetimePlanned
      let soonest = upcoming[0];
      upcoming.forEach((t) => {
        const tTime = new Date(t.pickupDatetimePlanned).getTime();
        const sTime = new Date(soonest.pickupDatetimePlanned).getTime();
        if (tTime < sTime) {
          soonest = t;
        }
      });

      const tripId = soonest.tripId;

      // Capture wallet balance before cancellation, if any
      let beforeBalance = 0;
      try {
        const walletSummaryBefore = this.logic.getWalletSummary();
        if (walletSummaryBefore && walletSummaryBefore.wallet && typeof walletSummaryBefore.wallet.balance === 'number') {
          beforeBalance = walletSummaryBefore.wallet.balance;
        }
      } catch (e) {
        // Wallet may not exist yet; that's fine
        beforeBalance = 0;
      }

      const cancelResult = this.logic.cancelUpcomingTrip(tripId, 'change_of_plans', undefined, 'wallet_credit');
      this.assert(cancelResult && cancelResult.success === true, 'cancelUpcomingTrip should succeed');
      this.assert(cancelResult.trip, 'Trip should be returned after cancellation');

      const trip = cancelResult.trip;
      this.assert(trip.id === tripId, 'Cancelled trip ID should match selected');
      this.assert(trip.status === 'cancelled', 'Trip status should be cancelled');
      this.assert(trip.refundMethod === 'wallet_credit', 'Refund method should be wallet_credit');

      if (cancelResult.walletTransaction && cancelResult.walletTransaction.transaction) {
        const wt = cancelResult.walletTransaction.transaction;
        const newBalance = cancelResult.walletTransaction.newWalletBalance;
        this.assert(wt.type === 'credit', 'Wallet transaction should be a credit');
        this.assert(wt.source === 'ride_refund', 'Wallet transaction source should be ride_refund');
        if (typeof newBalance === 'number') {
          this.assert(Math.abs(newBalance - (beforeBalance + wt.amount)) < 0.0001, 'New wallet balance should equal previous balance plus refund amount');
        }
      }

      const upcomingAfter = this.logic.getTripsList('upcoming');
      const stillThere = upcomingAfter.find((t) => t.tripId === tripId);
      this.assert(!stillThere, 'Cancelled trip should no longer appear in upcoming trips');

      const pastTrips = this.logic.getTripsList('past');
      const inPast = pastTrips.find((t) => t.tripId === tripId && t.status === 'cancelled');
      this.assert(inPast, 'Cancelled trip should appear in past trips as cancelled');

      this.taskContext.cancelledTripId = tripId;

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Contact support about an overcharged fare on the most recent completed trip
  testTask8_ContactSupportOverchargedFare() {
    const testName = 'Task 8: Contact support about overcharged fare on most recent completed trip';
    try {
      const recentTrips = this.logic.getRecentTripsForSupport(10);
      this.assert(Array.isArray(recentTrips) && recentTrips.length > 0, 'Recent trips for support should be returned');

      // Most recent completed trip by pickupDatetimePlanned
      const completedTrips = recentTrips.filter((t) => t.status === 'completed');
      this.assert(completedTrips.length > 0, 'There should be at least one completed trip for support');

      let latest = completedTrips[0];
      completedTrips.forEach((t) => {
        const tTime = new Date(t.pickupDatetimePlanned).getTime();
        const lTime = new Date(latest.pickupDatetimePlanned).getTime();
        if (tTime > lTime) {
          latest = t;
        }
      });

      const tripId = latest.tripId;

      const topics = this.logic.getSupportTopicsAndIssues();
      this.assert(topics && Array.isArray(topics.topics), 'Support topics should be returned');
      const billingTopic = topics.topics.find((t) => t.topic === 'billing_issues');
      this.assert(billingTopic, 'billing_issues topic should exist');
      const fareHigherIssue = billingTopic.issueTypes.find((it) => it.issueType === 'fare_higher_than_expected');
      this.assert(fareHigherIssue, 'fare_higher_than_expected issue type should exist');

      const description = 'The app showed an estimated fare of $18, but I was charged $25.';
      const contactMethod = 'in_app_chat';

      const ticketResult = this.logic.createSupportTicketForTrip(
        tripId,
        'billing_issues',
        'fare_higher_than_expected',
        description,
        contactMethod
      );
      this.assert(ticketResult && ticketResult.ticket, 'Support ticket should be created');

      const ticket = ticketResult.ticket;
      this.assert(ticket.tripId === tripId, 'Support ticket should be associated with selected trip');
      this.assert(ticket.topic === 'billing_issues', 'Ticket topic should be billing_issues');
      this.assert(ticket.issueType === 'fare_higher_than_expected', 'Ticket issueType should be fare_higher_than_expected');
      this.assert(ticket.status === 'open' || ticket.status === 'in_progress', 'Ticket should be open or in_progress initially');

      const ticketDetails = this.logic.getSupportTicketDetails(ticket.id);
      this.assert(ticketDetails && ticketDetails.ticket, 'Support ticket details should be retrievable');
      if (ticketDetails.trip) {
        this.assert(ticketDetails.trip.tripId === tripId, 'Ticket details should include correct trip summary');
      }

      // Send a follow-up message using in-app chat/message
      const sendResult = this.logic.sendSupportMessage(ticket.id, 'Additional details: please review and adjust the fare.');
      this.assert(sendResult && sendResult.message, 'Support message should be sent');
      const sentMessage = sendResult.message;
      this.assert(sentMessage.ticketId === ticket.id, 'Sent message should be linked to the correct ticket');
      this.assert(sentMessage.senderType === 'user', 'Message senderType should be user');

      const messages = this.logic.getSupportMessages(ticket.id);
      this.assert(Array.isArray(messages) && messages.length > 0, 'Support messages history should contain at least one message');
      const foundSent = messages.find((m) => m.id === sentMessage.id);
      this.assert(foundSent, 'Sent support message should appear in message history');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
