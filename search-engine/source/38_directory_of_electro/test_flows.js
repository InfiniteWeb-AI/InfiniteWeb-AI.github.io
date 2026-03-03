// Test runner for business logic
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
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "brands": [
        {
          "id": "apple",
          "name": "Apple",
          "device_type": "smartphone",
          "is_featured": true,
          "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "samsung",
          "name": "Samsung",
          "device_type": "tablet",
          "is_featured": true,
          "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "hp",
          "name": "HP",
          "device_type": "laptop",
          "is_featured": false,
          "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format&q=80"
        }
      ],
      "service_categories": [
        {
          "id": "smartphone_repair",
          "name": "Smartphone Repair",
          "slug": "smartphone-repair",
          "parent_category_id": null,
          "description": "Repair services for iPhone, Android, and other smartphones including screen, battery, and charging port repairs.",
          "icon": "smartphone",
          "sort_order": 1,
          "image": "https://o.aolcdn.com/images/dims?image_uri=https%3A%2F%2Fs.yimg.com%2Fos%2Fcreatr-uploaded-images%2F2021-07%2F07e23c50-ea5c-11eb-b5ff-ccf66f950d76&thumbnail=675%2C&client=49kdj93ncb8s938hkdo&signature=0c03b2b94650883ddb6619cab94f68ec8834da6f"
        },
        {
          "id": "tablet_repair",
          "name": "Tablet Repair",
          "slug": "tablet-repair",
          "parent_category_id": null,
          "description": "Repairs for iPad and Android tablets, including screen, charging port, and battery issues.",
          "icon": "tablet",
          "sort_order": 2,
          "image": "https://www.micro-techno.ca/3438-thickbox_default/ipad-6-2018-charging-port-replacement-repair-ipad-tablet-plug-connector-lightning.jpg"
        },
        {
          "id": "laptop_repair",
          "name": "Laptop Repair",
          "slug": "laptop-repair",
          "parent_category_id": null,
          "description": "Diagnostics and repairs for Windows, Mac, and Chromebook laptops including hardware and software issues.",
          "icon": "laptop",
          "sort_order": 3,
          "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format&q=80"
        }
      ],
      "provider_services": [
        {
          "id": "svc_iphone12_screen_manhattan",
          "providerId": "prov_manhattan_iphone_clinic",
          "service_category_id": "smartphone_repair",
          "name": "iPhone 12 Screen Replacement",
          "service_code": "smartphone_screen_repair",
          "device_type": "smartphone",
          "brand_id": "apple",
          "device_brand": "Apple",
          "device_model": "iPhone 12",
          "description": "Genuine-quality iPhone 12 front screen and digitizer replacement with same-day turnaround for most repairs.",
          "base_price": 179,
          "min_price": 169,
          "max_price": 189,
          "warranty_months": 6,
          "is_in_store_available": true,
          "is_home_visit_available": false,
          "is_pickup_delivery_available": false,
          "is_free_pickup": false,
          "has_free_diagnostic": true,
          "has_no_diagnostic_fee": true,
          "diagnostic_fee_amount": 0,
          "has_no_fix_no_fee": false,
          "is_emergency_available": false,
          "estimated_duration_minutes": 90,
          "image": "https://zaggphonerepair.com/wp-content/uploads/2018/11/zagg-repair-replace-e1528298292651-768x576.jpg"
        },
        {
          "id": "svc_iphone12_screen_premium_ny",
          "providerId": "prov_ny_premium_phone_care",
          "service_category_id": "smartphone_repair",
          "name": "Premium iPhone 12 Screen Repair",
          "service_code": "smartphone_screen_repair",
          "device_type": "smartphone",
          "brand_id": "apple",
          "device_brand": "Apple",
          "device_model": "iPhone 12",
          "description": "High-grade OLED screen replacement for iPhone 12 with dust and water-resistance reseal and extended warranty.",
          "base_price": 189,
          "min_price": 179,
          "max_price": 199,
          "warranty_months": 12,
          "is_in_store_available": true,
          "is_home_visit_available": true,
          "is_pickup_delivery_available": false,
          "is_free_pickup": false,
          "has_free_diagnostic": true,
          "has_no_diagnostic_fee": true,
          "diagnostic_fee_amount": 0,
          "has_no_fix_no_fee": false,
          "is_emergency_available": true,
          "estimated_duration_minutes": 75,
          "image": "https://cdn.shopify.com/s/files/1/0497/1449/5644/products/ip12pm-as-rf_1_800x.jpg?v=1614973030"
        },
        {
          "id": "svc_quickfix_smartphone_general",
          "providerId": "prov_quickfix_phone_repair",
          "service_category_id": "smartphone_repair",
          "name": "Smartphone Diagnosis & Repair",
          "service_code": "smartphone_repair",
          "device_type": "smartphone",
          "brand_id": "",
          "device_brand": "All major brands",
          "device_model": "Various iPhone and Android models",
          "description": "In-store diagnosis and repair for cracked screens, battery issues, charging problems, and other smartphone faults.",
          "base_price": 89,
          "min_price": 69,
          "max_price": 149,
          "warranty_months": 3,
          "is_in_store_available": true,
          "is_home_visit_available": false,
          "is_pickup_delivery_available": false,
          "is_free_pickup": false,
          "has_free_diagnostic": false,
          "has_no_diagnostic_fee": false,
          "diagnostic_fee_amount": 29,
          "has_no_fix_no_fee": false,
          "is_emergency_available": false,
          "estimated_duration_minutes": 60,
          "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop&auto=format&q=80"
        }
      ],
      "reviews": [
        {
          "id": "rev_ny_premium_iphone12_1",
          "providerId": "prov_ny_premium_phone_care",
          "rating": 5,
          "comment": "Booked an iPhone 12 screen repair and it was done in under an hour. Screen looks perfect and touch works like new.",
          "visit_type": "smartphone_repair",
          "service_code": "smartphone_screen_repair",
          "created_at": "2025-11-10T14:20:00Z",
          "updated_at": "2025-11-10T14:20:00Z",
          "visit_date": "2025-11-08T10:00:00Z",
          "provider_response": "Thanks for the feedback! Were glad your iPhone 12 is back to normal."
        },
        {
          "id": "rev_manhattan_iphone_clinic_1",
          "providerId": "prov_manhattan_iphone_clinic",
          "rating": 4.7,
          "comment": "Good price for an iPhone 12 screen replacement and they finished the same afternoon. Only slight delay on my appointment time.",
          "visit_type": "smartphone_repair",
          "service_code": "smartphone_screen_repair",
          "created_at": "2025-10-05T16:45:00Z",
          "updated_at": "2025-10-05T16:45:00Z",
          "visit_date": "2025-10-03T15:00:00Z",
          "provider_response": "We appreciate your patience and will work on shortening wait times."
        },
        {
          "id": "rev_quickfix_phone_repair_1",
          "providerId": "prov_quickfix_phone_repair",
          "rating": 4.2,
          "comment": "Walked in for a cracked smartphone screen. Repair was solid and reasonably quick, but the waiting area was a bit crowded.",
          "visit_type": "smartphone_repair",
          "service_code": "smartphone_repair",
          "created_at": "2025-09-18T13:10:00Z",
          "updated_at": "2025-09-18T13:10:00Z",
          "visit_date": "2025-09-16T11:30:00Z",
          "provider_response": "Thanks for the review! Were upgrading our waiting area soon."
        }
      ],
      "providers": [
        {
          "id": "prov_manhattan_iphone_clinic",
          "name": "Manhattan iPhone Clinic",
          "slug": "manhattan-iphone-clinic",
          "description": "Specialized iPhone repair shop in Midtown Manhattan focusing on same-day screen and battery replacements.",
          "phone": "555-010-1001",
          "email": "support@manhattaniphoneclinic.com",
          "website_url": "https://www.manhattaniphoneclinic.com",
          "address_line1": "123 7th Ave",
          "address_line2": "Suite 2A",
          "city": "New York",
          "state": "NY",
          "postal_code": "10001",
          "country": "US",
          "latitude": 40.7489,
          "longitude": -73.9965,
          "service_radius_miles": 10,
          "is_24_7": false,
          "has_emergency_service": false,
          "offers_in_store": true,
          "offers_home_visit": false,
          "offers_pickup_delivery": false,
          "offers_free_pickup": false,
          "has_free_diagnostic": true,
          "has_no_diagnostic_fee": true,
          "default_diagnostic_fee": 0,
          "has_no_fix_no_fee": false,
          "max_warranty_months": 6,
          "created_at": "2024-01-10T10:00:00Z",
          "updated_at": "2025-10-05T16:00:00Z",
          "rating_count": 1,
          "rating_average": 4.7
        },
        {
          "id": "prov_ny_premium_phone_care",
          "name": "NY Premium Phone Care",
          "slug": "ny-premium-phone-care",
          "description": "High-end smartphone repair boutique offering premium parts, fast turnaround, and extended warranties.",
          "phone": "555-010-2002",
          "email": "hello@nypremiumphonecare.com",
          "website_url": "https://www.nypremiumphonecare.com",
          "address_line1": "215 W 34th St",
          "address_line2": "Floor 4",
          "city": "New York",
          "state": "NY",
          "postal_code": "10001",
          "country": "US",
          "latitude": 40.7505,
          "longitude": -73.9903,
          "service_radius_miles": 15,
          "is_24_7": false,
          "has_emergency_service": true,
          "offers_in_store": true,
          "offers_home_visit": true,
          "offers_pickup_delivery": false,
          "offers_free_pickup": false,
          "has_free_diagnostic": true,
          "has_no_diagnostic_fee": true,
          "default_diagnostic_fee": 0,
          "has_no_fix_no_fee": false,
          "max_warranty_months": 12,
          "created_at": "2024-02-15T09:30:00Z",
          "updated_at": "2025-11-10T14:00:00Z",
          "rating_count": 1,
          "rating_average": 5.0
        },
        {
          "id": "prov_quickfix_phone_repair",
          "name": "QuickFix Phone Repair",
          "slug": "quickfix-phone-repair",
          "description": "Walk-in smartphone repair shop handling cracked screens, batteries, and common phone issues.",
          "phone": "555-010-3003",
          "email": "contact@quickfixphonerepair.com",
          "website_url": "https://www.quickfixphonerepair.com",
          "address_line1": "455 8th Ave",
          "address_line2": "",
          "city": "New York",
          "state": "NY",
          "postal_code": "10018",
          "country": "US",
          "latitude": 40.7545,
          "longitude": -73.9931,
          "service_radius_miles": 12,
          "is_24_7": false,
          "has_emergency_service": false,
          "offers_in_store": true,
          "offers_home_visit": false,
          "offers_pickup_delivery": false,
          "offers_free_pickup": false,
          "has_free_diagnostic": false,
          "has_no_diagnostic_fee": false,
          "default_diagnostic_fee": 29,
          "has_no_fix_no_fee": false,
          "max_warranty_months": 3,
          "created_at": "2023-11-20T12:00:00Z",
          "updated_at": "2025-09-18T13:00:00Z",
          "rating_count": 1,
          "rating_average": 4.2
        }
      ],
      "provider_opening_hours": [
        {
          "id": "oph_atl_247_mon",
          "providerId": "prov_atlanta_24_7_mobile_fix",
          "day_of_week": "monday",
          "open_time": "00:00",
          "close_time": "23:59",
          "is_open_24_hours": true,
          "is_closed": false
        },
        {
          "id": "oph_atl_247_tue",
          "providerId": "prov_atlanta_24_7_mobile_fix",
          "day_of_week": "tuesday",
          "open_time": "00:00",
          "close_time": "23:59",
          "is_open_24_hours": true,
          "is_closed": false
        },
        {
          "id": "oph_atl_247_wed",
          "providerId": "prov_atlanta_24_7_mobile_fix",
          "day_of_week": "wednesday",
          "open_time": "00:00",
          "close_time": "23:59",
          "is_open_24_hours": true,
          "is_closed": false
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:49:59.589701"
      }
    };

    // Copy data into localStorage using correct storage keys
    localStorage.setItem('brands', JSON.stringify(generatedData.brands || []));
    localStorage.setItem('service_categories', JSON.stringify(generatedData.service_categories || []));
    localStorage.setItem('provider_services', JSON.stringify(generatedData.provider_services || []));
    localStorage.setItem('reviews', JSON.stringify(generatedData.reviews || []));
    localStorage.setItem('providers', JSON.stringify(generatedData.providers || []));
    localStorage.setItem('provider_opening_hours', JSON.stringify(generatedData.provider_opening_hours || []));
    if (generatedData._metadata) {
      localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookIphone12ScreenRepair();
    this.testTask2_RequestCheapestLaptopBatteryReplacementAdapted();
    this.testTask3_CompareServicesAndSaveLongestWarranty();
    this.testTask4_RequestHomeVisitWashingMachineRepairAdapted();
    this.testTask5_CreateAccountAndLeaveReview();
    this.testTask6_FindEmergencyPhoneRepairMapView();
    this.testTask7_ScheduleTabletChargingPortPickupAdapted();
    this.testTask8_ContactBestRatedDataRecoveryServiceAdapted();

    return this.results;
  }

  // Task 1: Book highest-rated iPhone 12 screen repair under $200 within 10 miles of ZIP 10001
  testTask1_BookIphone12ScreenRepair() {
    const testName = 'Task 1: Book highest-rated iPhone 12 screen repair under $200 within 10 miles of ZIP 10001';
    try {
      const homeData = this.logic.getHomePageData();
      this.assert(homeData && typeof homeData === 'object', 'Home page data should be returned');

      const locationResult = this.logic.setCurrentLocation('10001');
      this.assert(locationResult && locationResult.success === true, 'Location should be set successfully');

      const filterOptions = this.logic.getSearchFilterOptions('iPhone 12 screen repair', 'smartphone_screen_repair', null);
      this.assert(filterOptions && Array.isArray(filterOptions.distance_options_miles), 'Search filter options should be returned');

      const searchResult = this.logic.searchProviders(
        'iPhone 12 screen repair', // query
        '10001',                    // location_text
        10,                         // distance_miles_max
        4.5,                        // rating_min
        'smartphone_screen_repair', // service_code
        null,                       // service_category_id
        { service_code: 'smartphone_screen_repair', max_price: 200 }, // price_filter
        null,                       // visit_type_filters
        null,                       // availability_filters
        null,                       // fee_filters
        'rating_desc',              // sort_by
        'list',                     // view_mode
        1,                          // page
        10                          // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers array');
      this.assert(searchResult.providers.length > 0, 'Search should return at least one provider');

      const topResult = searchResult.providers[0];
      const selectedProvider = topResult.provider;
      this.assert(selectedProvider && selectedProvider.id, 'Selected provider should have id');

      // Determine matching service for smartphone_screen_repair
      let selectedServiceId = null;
      if (Array.isArray(topResult.matched_services)) {
        const svc = topResult.matched_services.find(function (s) {
          return s.service_code === 'smartphone_screen_repair';
        });
        if (svc) {
          selectedServiceId = svc.id;
        }
      }

      // Fallback: use provider detail if not present in matched_services
      if (!selectedServiceId) {
        const detail = this.logic.getProviderDetail(selectedProvider.id);
        this.assert(detail && Array.isArray(detail.services), 'Provider detail should include services');
        const svc2 = detail.services.find(function (s) {
          return s.service_code === 'smartphone_screen_repair';
        });
        this.assert(!!svc2, 'Provider should have smartphone_screen_repair service');
        selectedServiceId = svc2.id;
      }

      const now = new Date();
      const appointmentDate = new Date(now.getFullYear(), now.getMonth(), 15, 15, 0, 0, 0);
      const appointmentIso = appointmentDate.toISOString();

      const bookingPayload = {
        providerId: selectedProvider.id,
        providerServiceId: selectedServiceId,
        booking_type: 'in_store',
        appointment_datetime: appointmentIso,
        device_type: 'smartphone',
        device_brand: 'Apple',
        device_model: 'iPhone 12',
        issue_description: 'iPhone 12 screen cracked',
        notes: 'iPhone 12 screen cracked',
        customer_name: 'Alex Smith',
        customer_phone: '555-123-4567',
        customer_email: 'alex@example.com'
      };

      const bookingResult = this.logic.createAppointmentBooking(bookingPayload);
      this.assert(bookingResult && bookingResult.success === true, 'Appointment booking should succeed');
      this.assert(bookingResult.booking && bookingResult.booking.id, 'Booking should have id');

      const allBookings = JSON.parse(localStorage.getItem('appointment_bookings') || '[]');
      const savedBooking = allBookings.find(function (b) {
        return b.id === bookingResult.booking.id;
      });
      this.assert(!!savedBooking, 'Booking should be saved in storage');
      this.assert(savedBooking.providerId === selectedProvider.id, 'Booking providerId should match selected provider');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Request cheapest laptop battery replacement-style quote under $120 near ZIP 10001
  testTask2_RequestCheapestLaptopBatteryReplacementAdapted() {
    const testName = 'Task 2 (adapted): Request cheapest laptop battery replacement-style quote under $120 near ZIP 10001';
    try {
      const locationResult = this.logic.setCurrentLocation('10001');
      this.assert(locationResult && locationResult.success === true, 'Location should be set successfully');

      const searchResult = this.logic.searchProviders(
        'laptop battery replacement', // query text adapted to dataset
        '10001',                      // location_text
        25,                           // distance_miles_max
        null,                         // rating_min
        'smartphone_repair',          // service_code mapped to available service
        null,                         // service_category_id
        { service_code: 'smartphone_repair', max_price: 120 }, // price_filter
        null,                         // visit_type_filters
        null,                         // availability_filters
        null,                         // fee_filters
        'price_asc',                  // sort_by cheapest first
        'list',                       // view_mode
        1,                            // page
        10                            // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers array');
      this.assert(searchResult.providers.length > 0, 'Search should return at least one provider under budget');

      const cheapest = searchResult.providers[0].provider;
      this.assert(cheapest && cheapest.id, 'Cheapest provider should have id');

      const laptopBrands = this.logic.getBrands('laptop');
      this.assert(Array.isArray(laptopBrands), 'Laptop brands list should be an array');
      let hpBrandId = null;
      const hp = laptopBrands.find(function (b) { return b.name === 'HP'; });
      if (hp) {
        hpBrandId = hp.id;
      }

      const quotePayload = {
        providerId: cheapest.id,
        providerServiceId: null,
        device_type: 'laptop',
        brand_id: hpBrandId,
        brand_name: hpBrandId ? null : 'HP',
        model_name: 'Pavilion 15',
        problem_description: 'Battery drains quickly and laptop shuts down at 30%',
        budget_max: 120,
        customer_name: 'Jamie Lee',
        customer_phone: '555-222-3344',
        customer_email: 'jamie@example.com'
      };

      const quoteResult = this.logic.createQuoteRequest(quotePayload);
      this.assert(quoteResult && quoteResult.success === true, 'Quote request should succeed');
      this.assert(quoteResult.quote_request && quoteResult.quote_request.id, 'Quote request should have id');

      const storedQuotes = JSON.parse(localStorage.getItem('quote_requests') || '[]');
      const savedQuote = storedQuotes.find(function (q) {
        return q.id === quoteResult.quote_request.id;
      });
      this.assert(!!savedQuote, 'Quote request should be saved to storage');
      this.assert(savedQuote.providerId === cheapest.id, 'Quote providerId should match selected provider');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3 (adapted): Compare two phone repair services under $200 and save the one with the longest warranty
  testTask3_CompareServicesAndSaveLongestWarranty() {
    const testName = 'Task 3 (adapted): Compare two phone repair services under $200 and save the one with the longest warranty';
    try {
      const searchResult = this.logic.searchProviders(
        'iPhone screen repair',       // query
        '10001',                      // location
        10,                           // distance
        4.0,                          // rating_min
        'smartphone_screen_repair',   // service_code
        null,
        { service_code: 'smartphone_screen_repair', max_price: 200 },
        null,
        null,
        null,
        'rating_desc',
        'list',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers');
      this.assert(searchResult.providers.length >= 2, 'Search should return at least two providers for comparison');

      const firstProvider = searchResult.providers[0].provider;
      const secondProvider = searchResult.providers[1].provider;

      const compareResult1 = this.logic.addProviderToCompare(firstProvider.id);
      this.assert(compareResult1 && compareResult1.success === true, 'Adding first provider to compare should succeed');

      const compareResult2 = this.logic.addProviderToCompare(secondProvider.id);
      this.assert(compareResult2 && compareResult2.success === true, 'Adding second provider to compare should succeed');

      const compareView = this.logic.getCompareView();
      this.assert(compareView && Array.isArray(compareView.providers_comparison), 'Compare view should return providers_comparison');
      this.assert(compareView.providers_comparison.length >= 2, 'Compare view should include at least two providers');

      const compProviders = compareView.providers_comparison;
      let best = compProviders[0];
      for (let i = 1; i < compProviders.length; i++) {
        if ((compProviders[i].max_warranty_months || 0) > (best.max_warranty_months || 0)) {
          best = compProviders[i];
        }
      }
      const bestProvider = best.provider;
      this.assert(bestProvider && bestProvider.id, 'Best warranty provider should have id');

      const favResult = this.logic.addProviderToFavorites(bestProvider.id);
      this.assert(favResult && favResult.success === true, 'Adding provider to favorites should succeed');
      this.assert(favResult.favorite && favResult.favorite.id, 'Favorite record should have id');

      const favoritesStored = this.logic.getFavoriteProviders();
      this.assert(favoritesStored && Array.isArray(favoritesStored.favorites), 'Favorites list should be retrievable');
      const saved = favoritesStored.favorites.find(function (fp) {
        return fp.provider && fp.provider.id === bestProvider.id;
      });
      this.assert(!!saved, 'Best warranty provider should be in favorites list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4 (adapted): Request a home visit washing machine repair with no diagnostic fee
  testTask4_RequestHomeVisitWashingMachineRepairAdapted() {
    const testName = 'Task 4 (adapted): Request a home visit repair with no diagnostic fee';
    try {
      const categories = this.logic.getServiceCategories(null);
      this.assert(Array.isArray(categories), 'Service categories list should be an array');

      const locationResult = this.logic.setCurrentLocation('10001');
      this.assert(locationResult && locationResult.success === true, 'Location should be set');

      const visitFilters = { in_store: null, home_visit: true, pickup_delivery: null, free_pickup: null };
      const feeFilters = { require_free_diagnostic: true, require_no_diagnostic_fee: true, require_no_fix_no_fee: null };

      const searchResult = this.logic.searchProviders(
        'washing machine repair', // query (semantic only; dataset is phone-focused)
        '10001',                  // location_text
        20,                       // distance_miles_max
        null,                     // rating_min
        null,                     // service_code
        null,                     // service_category_id
        null,                     // price_filter
        visitFilters,             // visit_type_filters
        null,                     // availability_filters
        feeFilters,               // fee_filters
        'rating_desc',            // sort_by
        'list',                   // view_mode
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers array');
      this.assert(searchResult.providers.length > 0, 'Search should return at least one provider with home visit and no diagnostic fee');

      const providerInfo = searchResult.providers[0];
      const selectedProvider = providerInfo.provider;
      this.assert(selectedProvider && selectedProvider.id, 'Selected provider should have id');

      const upcomingSaturday = this._getUpcomingDayDate(6); // Saturday
      upcomingSaturday.setHours(18, 0, 0, 0); // 6:00 PM
      const preferredIso = upcomingSaturday.toISOString();

      const requestPayload = {
        providerId: selectedProvider.id,
        providerServiceId: null,
        appliance_type: 'washing_machine',
        issue_description: 'Washer not draining and making loud noise',
        preferred_datetime: preferredIso,
        address_line1: '123 Test Street',
        address_line2: '',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        customer_name: 'Taylor Brown',
        customer_phone: '555-789-1234',
        customer_email: null
      };

      const homeVisitResult = this.logic.createHomeVisitRequest(requestPayload);
      this.assert(homeVisitResult && homeVisitResult.success === true, 'Home visit request should succeed');
      this.assert(homeVisitResult.home_visit_request && homeVisitResult.home_visit_request.id, 'Home visit request should have id');

      const storedRequests = JSON.parse(localStorage.getItem('home_visit_requests') || '[]');
      const savedReq = storedRequests.find(function (r) {
        return r.id === homeVisitResult.home_visit_request.id;
      });
      this.assert(!!savedReq, 'Home visit request should be saved to storage');
      this.assert(savedReq.providerId === selectedProvider.id, 'Home visit providerId should match selected provider');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Create an account and leave a 5-star review for QuickFix Phone Repair
  testTask5_CreateAccountAndLeaveReview() {
    const testName = 'Task 5: Create an account and leave a 5-star review for QuickFix Phone Repair';
    try {
      const existingProfile = this.logic.getProfile();
      // existingProfile may be null or an object; no strict assertion needed

      const savedProfile = this.logic.saveProfile({
        full_name: 'Alex Test',
        email: 'alex.test@example.com',
        phone: '555-000-1111',
        preferred_contact_method: 'email',
        preferred_zip: '10001',
        preferred_city: 'New York',
        preferred_state: 'NY',
        preferred_location_type: 'zip_code',
        communication_consent: true,
        password: 'Test1234!'
      });
      this.assert(savedProfile && savedProfile.id, 'Profile should be created/updated with id');

      const profileAgain = this.logic.getProfile();
      this.assert(profileAgain && profileAgain.email === 'alex.test@example.com', 'Profile email should be saved');

      const searchResult = this.logic.searchProviders(
        'QuickFix Phone Repair', // query by name
        '10001',                 // location
        25,                      // distance
        null,
        'smartphone_repair',     // service_code
        null,
        null,
        null,
        null,
        null,
        'relevance',             // sort_by
        'list',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers');
      const quickfixMatch = searchResult.providers.find(function (p) {
        return p.provider && p.provider.name === 'QuickFix Phone Repair';
      });
      this.assert(!!quickfixMatch, 'QuickFix Phone Repair should be found in search results');
      const quickfixProvider = quickfixMatch.provider;

      const detailBefore = this.logic.getProviderDetail(quickfixProvider.id);
      const prevCount = detailBefore && detailBefore.review_summary ? detailBefore.review_summary.rating_count : 0;

      const reviewResult = this.logic.submitProviderReview(
        quickfixProvider.id,
        5,
        'Service was fast, friendly, and my phone screen looks brand new.',
        'smartphone_repair',
        'smartphone_repair',
        null
      );

      this.assert(reviewResult && reviewResult.success === true, 'Submit review should succeed');
      this.assert(reviewResult.review && reviewResult.review.id, 'Review should have id');
      this.assert(reviewResult.review.rating === 5, 'Review rating should be 5 stars');

      if (typeof prevCount === 'number') {
        this.assert(reviewResult.updated_rating_count === prevCount + 1, 'Rating count should increase by 1');
      }

      const reviewsStored = this.logic.getProviderReviews(quickfixProvider.id, 1, 10);
      this.assert(reviewsStored && Array.isArray(reviewsStored.reviews), 'Should be able to retrieve provider reviews');
      const savedReview = reviewsStored.reviews.find(function (r) {
        return r.id === reviewResult.review.id;
      });
      this.assert(!!savedReview, 'New review should appear in provider reviews');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6 (adapted): Find emergency phone repair within 3 miles using map view and simulate a call
  testTask6_FindEmergencyPhoneRepairMapView() {
    const testName = 'Task 6 (adapted): Find emergency phone repair within 3 miles using map view and simulate a call';
    try {
      const locationResult = this.logic.setCurrentLocation('10001');
      this.assert(locationResult && locationResult.success === true, 'Location should be set');

      const availabilityFilters = {
        open_on_day_of_week: null,
        close_after_time: null,
        require_24_7: false,
        require_emergency_service: true
      };

      const searchResult = this.logic.searchProviders(
        'smartphone repair',    // query
        '10001',                // location
        3,                      // distance_miles_max
        null,                   // rating_min
        'smartphone_repair',    // service_code
        null,
        null,
        null,
        availabilityFilters,
        null,
        'distance_asc',         // sort_by nearest first
        'map',                  // view_mode map
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.map_pins), 'Search should return map_pins array');
      this.assert(searchResult.map_pins.length > 0, 'There should be at least one emergency provider on map');

      const nearestPin = searchResult.map_pins[0];
      this.assert(nearestPin && nearestPin.providerId, 'Map pin should have providerId');

      const providerDetail = this.logic.getProviderDetail(nearestPin.providerId);
      this.assert(providerDetail && providerDetail.provider && providerDetail.provider.phone, 'Provider detail should include phone number');

      const phoneNumber = providerDetail.provider.phone;
      this.assert(typeof phoneNumber === 'string' && phoneNumber.length > 0, 'Phone number should be a non-empty string');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7 (adapted): Schedule a tablet charging port repair pickup under $90
  testTask7_ScheduleTabletChargingPortPickupAdapted() {
    const testName = 'Task 7 (adapted): Schedule a tablet charging port repair pickup under $90';
    try {
      const locationResult = this.logic.setCurrentLocation('10001');
      this.assert(locationResult && locationResult.success === true, 'Location should be set');

      const searchResult = this.logic.searchProviders(
        'tablet charging port repair', // query
        '10001',                       // location
        25,                            // distance
        4.0,                           // rating_min
        'smartphone_repair',           // using available repair service
        null,
        { service_code: 'smartphone_repair', max_price: 90 },
        null,
        null,
        null,
        'price_asc',                   // cheapest first
        'list',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers array');
      this.assert(searchResult.providers.length > 0, 'Search should return at least one provider within budget and rating');

      const cheapestProvider = searchResult.providers[0].provider;
      this.assert(cheapestProvider && cheapestProvider.id, 'Selected provider should have id');

      const tabletBrands = this.logic.getBrands('tablet');
      this.assert(Array.isArray(tabletBrands), 'Tablet brands list should be an array');
      const samsungBrand = tabletBrands.find(function (b) { return b.name === 'Samsung'; });
      const samsungBrandId = samsungBrand ? samsungBrand.id : null;

      const upcomingFriday = this._getUpcomingDayDate(5); // Friday
      const pickupDate = new Date(upcomingFriday.getFullYear(), upcomingFriday.getMonth(), upcomingFriday.getDate(), 9, 0, 0, 0);
      const pickupIso = pickupDate.toISOString();

      const pickupPayload = {
        providerId: cheapestProvider.id,
        providerServiceId: null,
        device_type: 'tablet',
        brand_id: samsungBrandId,
        brand_name: samsungBrandId ? null : 'Samsung',
        model_name: null,
        issue_description: 'Charging port loose, charges only at certain angles',
        pickup_date: pickupIso,
        time_window_start: '09:00',
        time_window_end: '11:00',
        address_line1: '456 Example Ave',
        address_line2: '',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        customer_name: 'Morgan Rivera',
        customer_phone: '555-666-7777',
        customer_email: 'morgan@example.com'
      };

      const pickupResult = this.logic.createPickupRequest(pickupPayload);
      this.assert(pickupResult && pickupResult.success === true, 'Pickup request should succeed');
      this.assert(pickupResult.pickup_request && pickupResult.pickup_request.id, 'Pickup request should have id');

      const storedPickups = JSON.parse(localStorage.getItem('pickup_requests') || '[]');
      const savedPickup = storedPickups.find(function (p) {
        return p.id === pickupResult.pickup_request.id;
      });
      this.assert(!!savedPickup, 'Pickup request should be saved');
      this.assert(savedPickup.providerId === cheapestProvider.id, 'Pickup providerId should match selected provider');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Contact the best-rated data recovery-style provider with free diagnostic under $400
  testTask8_ContactBestRatedDataRecoveryServiceAdapted() {
    const testName = 'Task 8 (adapted): Contact the best-rated provider with free diagnostic under $400';
    try {
      const feeFilters = {
        require_free_diagnostic: true,
        require_no_diagnostic_fee: false,
        require_no_fix_no_fee: false
      };

      const searchResult = this.logic.searchProviders(
        'laptop data recovery', // query
        '10001',                // location
        25,                     // distance
        4.0,                    // rating_min
        null,                   // service_code
        null,                   // service_category_id
        { service_code: 'laptop_data_recovery', max_price: 400 }, // price_filter semantic only
        null,                   // visit_type_filters
        null,                   // availability_filters
        feeFilters,             // fee_filters
        'rating_desc',          // sort_by rating
        'list',                 // view_mode
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.providers), 'Search should return providers');
      this.assert(searchResult.providers.length > 0, 'Search should return at least one provider with free diagnostic');

      const bestProvider = searchResult.providers[0].provider;
      this.assert(bestProvider && bestProvider.id, 'Best provider should have id');

      const messagePayload = {
        providerId: bestProvider.id,
        subject: 'Question about data recovery time',
        message: 'I have a laptop that will not boot and I need my documents recovered. What is the typical turnaround time and estimated cost under $400?',
        customer_name: 'Riley Chen',
        customer_email: 'riley@example.com',
        customer_phone: '555-888-9999'
      };

      const messageResult = this.logic.sendProviderMessage(messagePayload);
      this.assert(messageResult && messageResult.success === true, 'Provider message should succeed');
      this.assert(messageResult.provider_message && messageResult.provider_message.id, 'Provider message should have id');

      const storedMessages = JSON.parse(localStorage.getItem('provider_messages') || '[]');
      const savedMessage = storedMessages.find(function (m) {
        return m.id === messageResult.provider_message.id;
      });
      this.assert(!!savedMessage, 'Provider message should be saved');
      this.assert(savedMessage.providerId === bestProvider.id, 'Provider message providerId should match selected provider');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: get upcoming day-of-week (0=Sunday..6=Saturday), always in the future
  _getUpcomingDayDate(targetDay) {
    const now = new Date();
    const result = new Date(now.getTime());
    const currentDay = result.getDay();
    let diff = (targetDay + 7 - currentDay) % 7;
    if (diff === 0) {
      diff = 7;
    }
    result.setDate(result.getDate() + diff);
    return result;
  }

  // Simple assertion helper
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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
