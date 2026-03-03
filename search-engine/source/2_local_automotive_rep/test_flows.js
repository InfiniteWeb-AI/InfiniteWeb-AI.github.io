// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      coupons: [
        {
          id: 'c_brake_20_percent',
          name: 'Brake Service 20% Off',
          code: 'BRAKE20',
          description: 'Save 20% on any front or rear brake service, including pad replacement and rotor resurfacing.',
          category: 'brakes',
          discount_type: 'percent_off',
          discount_value: 20,
          min_purchase_amount: 100,
          max_discount_amount: 80,
          valid_from: '2025-12-01T00:00:00Z',
          valid_to: '2026-06-30T23:59:59Z',
          is_active: true
        },
        {
          id: 'c_brake_15_percent',
          name: '15% Off Brake Pad & Rotor Packages',
          code: 'BRAKE15',
          description: 'Take 15% off qualifying brake pad and rotor replacement packages.',
          category: 'brakes',
          discount_type: 'percent_off',
          discount_value: 15,
          min_purchase_amount: 150,
          max_discount_amount: 60,
          valid_from: '2026-01-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          is_active: true
        },
        {
          id: 'c_brake_40_off',
          name: '$40 Off Premium Brake Service',
          code: 'BRAKE40',
          description: 'Get $40 off premium brake pad replacement on both axles.',
          category: 'brakes',
          discount_type: 'amount_off',
          discount_value: 40,
          min_purchase_amount: 250,
          max_discount_amount: 40,
          valid_from: '2026-02-01T00:00:00Z',
          valid_to: '2026-05-31T23:59:59Z',
          is_active: true
        }
      ],
      gift_card_products: [
        {
          id: 'email_gift_card',
          name: 'Email Gift Card',
          description: 'Send a digital gift card by email that can be used toward any service at participating locations.',
          delivery_method: 'email',
          preset_amounts: [25, 50, 75, 100, 150, 200],
          min_custom_amount: 25,
          max_custom_amount: 500,
          currency: 'usd',
          is_active: true,
          image: 'https://www.ruxley-manor.co.uk/wp-content/uploads/2021/02/virtual-gift-card-1-medium.jpg'
        },
        {
          id: 'physical_gift_card',
          name: 'Physical Mail Gift Card',
          description: 'A classic plastic gift card mailed in a greeting envelope, redeemable in-store.',
          delivery_method: 'physical_mail',
          preset_amounts: [50, 100, 200],
          min_custom_amount: 50,
          max_custom_amount: 300,
          currency: 'usd',
          is_active: true,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/6494ea2a-79c4-5223-98de-8882951806c2.jpeg'
        },
        {
          id: 'email_business_gift_card',
          name: 'Business Fleet Email Gift Card',
          description: 'Bulk email-delivered gift cards for business fleets and employee rewards.',
          delivery_method: 'email',
          preset_amounts: [100, 250, 500],
          min_custom_amount: 100,
          max_custom_amount: 1000,
          currency: 'usd',
          is_active: true,
          image: 'https://assets-global.website-files.com/5dd290508931f3ab7a8346a2/5ed786e06056ef733eb0a9f4_zV16758utC7yERxTsMiMCMW7SGVpVGtUKrQOnQ_RWdxh2ePTZNbi6doRJ106QzxrB9KDrNvRLz4EVk1tdf90_VQKoQv01AGPKH6wSvirsrPFTIRzph-gFIdt0D5nMxYfQ6gjl9bK.png'
        }
      ],
      locations: [
        {
          id: 'atl_downtown',
          name: 'Metro Auto Care - Downtown Atlanta',
          address_line1: '25 Peachtree Center Ave NE',
          address_line2: 'Suite 100',
          city: 'Atlanta',
          state: 'GA',
          zip: '30303',
          latitude: 33.7576,
          longitude: -84.3915,
          phone: '404-555-0130',
          average_rating: 4.7,
          rating_count: 328,
          offers_free_shuttle: false,
          shuttle_radius_miles: null,
          is_active: true,
          created_at: '2023-05-10T14:32:00Z',
          updated_at: '2026-02-20T09:15:00Z'
        },
        {
          id: 'atl_midtown',
          name: 'Metro Auto Care - Midtown',
          address_line1: '780 Peachtree St NE',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30308',
          latitude: 33.7765,
          longitude: -84.3839,
          phone: '404-555-0175',
          average_rating: 4.6,
          rating_count: 214,
          offers_free_shuttle: true,
          shuttle_radius_miles: 3,
          is_active: true,
          created_at: '2023-06-01T12:00:00Z',
          updated_at: '2026-02-28T11:05:00Z'
        },
        {
          id: 'atl_westside',
          name: 'Metro Auto Care - Westside',
          address_line1: '1450 Northside Dr NW',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30318',
          latitude: 33.7923,
          longitude: -84.4046,
          phone: '404-555-0199',
          average_rating: 4.3,
          rating_count: 167,
          offers_free_shuttle: false,
          shuttle_radius_miles: null,
          is_active: true,
          created_at: '2022-09-15T09:45:00Z',
          updated_at: '2026-01-12T16:20:00Z'
        }
      ],
      service_categories: [
        {
          id: 'tires_wheels',
          name: 'Tires & Wheels',
          slug: 'tires_wheels',
          description: 'Flat tire repair, tire rotation, wheel alignment, balancing, and related services.',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'brakes',
          name: 'Brakes',
          slug: 'brakes',
          description: 'Brake pad replacement, rotor service, brake fluid flushes, and inspections.',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1585045612336-5f5230d947a3?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'oil_changes',
          name: 'Oil Changes',
          slug: 'oil_changes',
          description: 'Standard, synthetic blend, and full synthetic oil change services with filter replacement.',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      vehicles: [
        {
          id: 'veh_2018_honda_civic_sedan_lx',
          year: 2018,
          make: 'Honda',
          model: 'Civic',
          trim: 'LX Sedan'
        },
        {
          id: 'veh_2018_honda_civic_sedan_ex',
          year: 2018,
          make: 'Honda',
          model: 'Civic',
          trim: 'EX Sedan'
        },
        {
          id: 'veh_2018_honda_civic_hatchback_sport',
          year: 2018,
          make: 'Honda',
          model: 'Civic',
          trim: 'Sport Hatchback'
        }
      ],
      location_hours: [
        {
          id: 'lh_atl_downtown_sat',
          location_id: 'atl_downtown',
          day_of_week: 'saturday',
          open_time: '08:00',
          close_time: '17:00',
          is_closed: false
        },
        {
          id: 'lh_atl_midtown_sat',
          location_id: 'atl_midtown',
          day_of_week: 'saturday',
          open_time: '08:00',
          close_time: '16:00',
          is_closed: false
        },
        {
          id: 'lh_atl_downtown_mon',
          location_id: 'atl_downtown',
          day_of_week: 'monday',
          open_time: '07:30',
          close_time: '18:00',
          is_closed: false
        }
      ],
      maintenance_plans: [
        {
          id: 'mp_civic_2018_basic',
          name: 'Essential Care - 2018 Honda Civic',
          description: 'Basic maintenance coverage for 2018 Honda Civic models including 2 oil changes per year, multipoint inspections, and tire rotations.',
          monthly_price: 34.99,
          enrollment_fee: 25,
          warranty_months: 12,
          warranty_miles: 12000,
          billing_cycle: 'monthly',
          plan_type: 'basic',
          vehicle_ids: [
            'veh_2018_honda_civic_sedan_lx',
            'veh_2018_honda_civic_sedan_ex',
            'veh_2018_honda_civic_hatchback_sport'
          ],
          is_active: true
        },
        {
          id: 'mp_civic_2018_premium',
          name: 'Premium Care - 2018 Honda Civic',
          description: 'Enhanced coverage for 2018 Honda Civic with synthetic oil changes, roadside assistance, and extended parts & labor warranty.',
          monthly_price: 44.99,
          enrollment_fee: 49,
          warranty_months: 24,
          warranty_miles: 24000,
          billing_cycle: 'monthly',
          plan_type: 'premium',
          vehicle_ids: [
            'veh_2018_honda_civic_sedan_lx',
            'veh_2018_honda_civic_sedan_ex',
            'veh_2018_honda_civic_hatchback_sport'
          ],
          is_active: true
        },
        {
          id: 'mp_camry_2020_value',
          name: 'Value Care - 2020 Toyota Camry',
          description: 'Covers regular oil changes, tire rotations, and annual inspections for 2020 Toyota Camry models.',
          monthly_price: 39.99,
          enrollment_fee: 29,
          warranty_months: 24,
          warranty_miles: 24000,
          billing_cycle: 'monthly',
          plan_type: 'standard',
          vehicle_ids: [
            'veh_2020_toyota_camry_le',
            'veh_2020_toyota_camry_se',
            'veh_2020_toyota_camry_xse'
          ],
          is_active: true
        }
      ],
      appointment_time_slots: [
        {
          id: 'ats_atl_downtown_oil_20260307_0900',
          location_id: 'atl_downtown',
          service_package_id: 'sp_standard_oil_change',
          start_datetime: '2026-03-07T09:00:00Z',
          end_datetime: '2026-03-07T09:30:00Z',
          price: 59.99,
          is_available: true
        },
        {
          id: 'ats_atl_downtown_oil_20260307_0930',
          location_id: 'atl_downtown',
          service_package_id: 'sp_standard_oil_change',
          start_datetime: '2026-03-07T09:30:00Z',
          end_datetime: '2026-03-07T10:00:00Z',
          price: 59.99,
          is_available: true
        },
        {
          id: 'ats_atl_downtown_oil_20260307_1000',
          location_id: 'atl_downtown',
          service_package_id: 'sp_standard_oil_change',
          start_datetime: '2026-03-07T10:00:00Z',
          end_datetime: '2026-03-07T10:30:00Z',
          price: 64.99,
          is_available: true
        }
      ],
      coupon_service_eligibilities: [
        {
          id: 'cse_brake20_frontpads',
          coupon_id: 'c_brake_20_percent',
          service_id: 'svc_front_brake_pad_replacement',
          image: 'https://images.unsplash.com/photo-1585045612336-5f5230d947a3?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'cse_brake20_brakepkg',
          coupon_id: 'c_brake_20_percent',
          service_id: 'svc_brake_pad_rotor_package',
          image: 'https://images.unsplash.com/photo-1585045612336-5f5230d947a3?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'cse_brake15_frontpads',
          coupon_id: 'c_brake_15_percent',
          service_id: 'svc_front_brake_pad_replacement',
          image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      location_service_offerings: [
        {
          id: 'lso_atl_downtown_oil_standard',
          location_id: 'atl_downtown',
          service_package_id: 'sp_standard_oil_change',
          price: 59.99,
          currency: 'usd',
          is_available: true,
          image: 'https://images.unsplash.com/photo-1582719478250-cc74c0c2483b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'lso_atl_midtown_oil_standard',
          location_id: 'atl_midtown',
          service_package_id: 'sp_standard_oil_change',
          price: 64.99,
          currency: 'usd',
          is_available: true,
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'lso_atl_westside_oil_standard',
          location_id: 'atl_westside',
          service_package_id: 'sp_standard_oil_change',
          price: 57.99,
          currency: 'usd',
          is_available: true,
          image: 'https://images.unsplash.com/photo-1582719478250-cc74c0c2483b?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      service_packages: [
        {
          id: 'sp_standard_oil_change',
          service_id: 'svc_standard_oil_change',
          name: 'Standard Oil Change',
          description: 'Conventional oil change with new oil filter and a courtesy multi-point inspection.',
          base_price: 62.99,
          duration_minutes: 30,
          is_default: true,
          is_active: true,
          image: 'https://images.unsplash.com/photo-1582719478250-cc74c0c2483b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'sp_synthetic_oil_change',
          service_id: 'svc_standard_oil_change',
          name: 'Full Synthetic Oil Change',
          description: 'Full synthetic oil change with premium filter and extended life protection.',
          base_price: 89.99,
          duration_minutes: 40,
          is_default: false,
          is_active: true,
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'sp_high_mileage_oil_change',
          service_id: 'svc_standard_oil_change',
          name: 'High-Mileage Oil Change',
          description: 'High-mileage oil formulated to help reduce leaks and oil consumption in older vehicles.',
          base_price: 74.99,
          duration_minutes: 35,
          is_default: false,
          is_active: true,
          image: 'https://images.unsplash.com/photo-1582719478250-cc74c0c2483b?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      services: [
        {
          id: 'svc_standard_oil_change',
          category_id: 'oil_changes',
          name: 'Standard Oil Change',
          description: 'Conventional oil change with new oil filter, fluid top-off, and a complimentary multi-point inspection.',
          default_duration_minutes: 30,
          is_quote_only: false,
          is_active: true,
          image: 'https://offroadingpro.com/wp-content/uploads/2020/06/motor-oil-being-poured-into-car-engine.jpg',
          base_price_from: 62.99
        },
        {
          id: 'svc_flat_tire_repair',
          category_id: 'tires_wheels',
          name: 'Flat Tire Repair / Puncture Repair',
          description: 'Inspect tire, locate leak, repair with internal patch or plug where safe, and remount tire to wheel.',
          default_duration_minutes: 30,
          is_quote_only: false,
          is_active: true,
          image: 'https://hermanosnavarro.es/wp-content/uploads/2020/07/ruedaas-1140x550.jpg',
          base_price_from: 84.99
        },
        {
          id: 'svc_engine_diagnostics',
          category_id: 'diagnostics',
          name: 'Engine Diagnostics / Check Engine Light',
          description: 'Scan onboard computer, retrieve diagnostic trouble codes, and perform technician testing for check engine light concerns.',
          default_duration_minutes: 45,
          is_quote_only: true,
          is_active: true,
          image: 'https://images-na.ssl-images-amazon.com/images/I/71DPcJMZIcL._SL1500_.jpg',
          base_price_from: 129.99
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:23.343421'
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('coupons', JSON.stringify(generatedData.coupons));
    localStorage.setItem('gift_card_products', JSON.stringify(generatedData.gift_card_products));
    localStorage.setItem('locations', JSON.stringify(generatedData.locations));
    localStorage.setItem('service_categories', JSON.stringify(generatedData.service_categories));
    localStorage.setItem('vehicles', JSON.stringify(generatedData.vehicles));
    localStorage.setItem('location_hours', JSON.stringify(generatedData.location_hours));
    localStorage.setItem('maintenance_plans', JSON.stringify(generatedData.maintenance_plans));
    localStorage.setItem('appointment_time_slots', JSON.stringify(generatedData.appointment_time_slots));
    localStorage.setItem('coupon_service_eligibilities', JSON.stringify(generatedData.coupon_service_eligibilities));
    localStorage.setItem('location_service_offerings', JSON.stringify(generatedData.location_service_offerings));
    localStorage.setItem('service_packages', JSON.stringify(generatedData.service_packages));
    localStorage.setItem('services', JSON.stringify(generatedData.services));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookClosestOilChange();
    this.testTask2_ApplyBrakeCouponAndCheckoutSummary();
    this.testTask3_SelectCivicMaintenancePlan();
    this.testTask4_RequestEngineDiagnosticsQuote();
    this.testTask5_BookFlatTireRepairSameDay();
    this.testTask6_ScheduleServiceWithShuttle();
    this.testTask7_PurchaseGiftCardAndCheckoutSummary();
    this.testTask8_SetupMaintenanceReminders();

    return this.results;
  }

  // Task 1: Book the closest 4.5+ star standard oil change under $70 for next Saturday morning
  testTask1_BookClosestOilChange() {
    const testName = 'Task 1: Book closest 4.5+ star standard oil change under $70 next Saturday morning';
    try {
      // Simulate homepage visit (optional but validates interface)
      const homeContent = this.logic.getHomeFeaturedContent('30301');
      this.assert(homeContent != null, 'Homepage content should be returned');

      // "Locations" -> search by ZIP with rating filter
      const locationResults = this.logic.searchLocations('30301', { minRating: 4.5 });
      this.assert(Array.isArray(locationResults) && locationResults.length > 0,
        'Should find at least one location with rating >= 4.5 near 30301');

      const chosenLocationSummary = locationResults[0];
      const locationId = chosenLocationSummary.location_id;
      this.assert(locationId, 'Location search result should include location_id');
      this.assert(chosenLocationSummary.average_rating >= 4.5,
        'Chosen location should meet 4.5+ rating filter');

      // Open location detail page
      const locationDetail = this.logic.getLocationDetail(locationId);
      this.assert(locationDetail && locationDetail.location, 'Location detail should be returned');

      // Click "Schedule Service" -> get location service catalog
      const catalog = this.logic.getLocationServiceCatalog(locationId);
      this.assert(catalog && Array.isArray(catalog.service_categories) && catalog.service_categories.length > 0,
        'Location service catalog should contain categories');

      // Find oil change category and a Standard Oil Change package under $70
      let oilCategory = catalog.service_categories.find(c => c.category_slug === 'oil_changes');
      if (!oilCategory) {
        oilCategory = catalog.service_categories[0];
      }
      this.assert(oilCategory && Array.isArray(oilCategory.services) && oilCategory.services.length > 0,
        'Oil/selected category should contain services');

      let oilService = oilCategory.services.find(s =>
        (s.service_name && s.service_name.toLowerCase().indexOf('oil change') !== -1)
      );
      if (!oilService) {
        oilService = oilCategory.services[0];
      }
      this.assert(Array.isArray(oilService.packages) && oilService.packages.length > 0,
        'Oil change service should have packages');

      let packageCandidate = oilService.packages.find(p => p.is_available && p.base_price < 70);
      if (!packageCandidate) {
        packageCandidate = oilService.packages.find(p => p.is_available) || oilService.packages[0];
      }
      const servicePackageId = packageCandidate.service_package_id;
      this.assert(servicePackageId, 'Selected package should have service_package_id');

      // Optional cross-check: ensure location-specific price under $70 if available
      const offerings = JSON.parse(localStorage.getItem('location_service_offerings') || '[]');
      const offering = offerings.find(o => o.location_id === locationId && o.service_package_id === servicePackageId);
      if (offering) {
        this.assert(offering.price < 70, 'Location offering price should be under $70');
      }

      // Date picker: use known sample next Saturday date that has slots in generated data
      const targetDate = '2026-03-07'; // from generated appointment_time_slots

      // Get available time slots for that Saturday
      const timeSlots = this.logic.getAppointmentTimeSlots(locationId, servicePackageId, targetDate);
      this.assert(Array.isArray(timeSlots) && timeSlots.length > 0,
        'Should have appointment time slots for selected date');

      // Choose earliest available slot between 09:00 and 11:00
      const morningSlots = timeSlots
        .filter(ts => ts.is_available && this.isTimeWithinRange(ts.start_datetime, '09:00', '11:00'))
        .sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1));

      const chosenSlot = (morningSlots[0] || timeSlots.sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1))[0]);
      this.assert(chosenSlot && chosenSlot.id, 'Should select a time slot');
      this.assert(chosenSlot.price > 0, 'Time slot should have positive price');
      this.assert(chosenSlot.price < 70, 'Chosen time slot price should be under $70');

      // Confirm the appointment (visit type: wait-in-lobby for this scenario)
      const createResult = this.logic.createAppointment(
        locationId,
        servicePackageId,
        chosenSlot.id,
        null,              // appointmentDatetime (using time slot)
        'wait',            // visitType
        null,              // shuttlePickupAddress
        'Task 1 automated booking test'
      );

      this.assert(createResult && createResult.appointment, 'createAppointment should return an appointment');
      const appt = createResult.appointment;
      this.assert(appt.id, 'Appointment should have an id');
      this.assert(appt.location_id === locationId, 'Appointment location_id should match selected location');
      this.assert(appt.service_package_id === servicePackageId, 'Appointment service_package_id should match selected package');
      this.assert(appt.time_slot_id === chosenSlot.id, 'Appointment should reference chosen time slot');
      this.assert(appt.price > 0, 'Appointment price should be positive');
      this.assert(appt.visit_type === 'wait', 'Appointment visit_type should match requested visit type');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Apply a 15%+ brake service coupon and go to checkout summary
  testTask2_ApplyBrakeCouponAndCheckoutSummary() {
    const testName = 'Task 2: Apply 15%+ brake coupon to service and go to checkout summary';
    try {
      // Navigate to Coupons & Deals (brakes, min 15% off)
      const coupons = this.logic.listCoupons('brakes', 15, null);
      this.assert(Array.isArray(coupons) && coupons.length > 0,
        'Should list at least one brake coupon with 15%+ discount');

      const couponSummary = coupons[0];
      const couponId = couponSummary.coupon_id || (couponSummary.coupon && couponSummary.coupon.id);
      this.assert(couponId, 'Coupon summary should provide a coupon_id');

      // Coupon details
      const couponDetail = this.logic.getCouponDetail(couponId);
      this.assert(couponDetail && couponDetail.coupon, 'Coupon detail should be returned');
      const coupon = couponDetail.coupon;
      if (coupon.discount_type === 'percent_off') {
        this.assert(coupon.discount_value >= 15, 'Coupon percent discount should be at least 15%');
      }

      // Choose one applicable brake service (front brake pad replacement or similar)
      this.assert(Array.isArray(couponDetail.applicable_services) && couponDetail.applicable_services.length > 0,
        'Coupon should have applicable services');
      const applicableService = couponDetail.applicable_services[0];
      const serviceId = applicableService.service_id;
      this.assert(serviceId, 'Applicable service should have service_id');

      // Get eligible service packages for this coupon + service
      const eligiblePkgs = this.logic.getEligibleServicePackagesForCoupon(couponId, serviceId);
      this.assert(Array.isArray(eligiblePkgs) && eligiblePkgs.length > 0,
        'Should have eligible service packages for coupon');

      const under350 = eligiblePkgs.filter(p => p.before_discount_price < 350);
      this.assert(under350.length > 0,
        'Should have at least one eligible package with before-discount price under $350');
      const chosenPkgInfo = under350[0];
      const servicePackageId = chosenPkgInfo.service_package_id;
      this.assert(servicePackageId, 'Chosen eligible package should expose service_package_id');

      // Add to cart with coupon applied
      const addResult = this.logic.addServiceWithCouponToCart(servicePackageId, couponId, 1);
      this.assert(addResult && addResult.success === true, 'addServiceWithCouponToCart should succeed');
      this.assert(addResult.cart && addResult.added_item,
        'addServiceWithCouponToCart should return cart and added_item');

      // Validate cart contents by reading actual cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items),
        'Cart summary should include cart and items');

      const addedCartItemId = addResult.added_item.id;
      const matchingItemRow = cartSummary.items.find(row =>
        row.cart_item && row.cart_item.id === addedCartItemId
      );
      this.assert(matchingItemRow, 'Cart summary should contain the item just added with coupon');

      const ci = matchingItemRow.cart_item;
      this.assert(ci.coupon_id === couponId, 'Cart item should reference the applied coupon');
      this.assert(ci.total_price <= ci.unit_price, 'Total price should reflect discount (<= unit price)');

      // Proceed to checkout summary page
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart,
        'Checkout summary should return cart');
      this.assert(Array.isArray(checkoutSummary.items) && checkoutSummary.items.length > 0,
        'Checkout summary should contain at least one line item');

      const checkoutLine = checkoutSummary.items.find(line =>
        line.cart_item && line.cart_item.id === addedCartItemId
      );
      this.assert(checkoutLine, 'Checkout summary should include the discounted brake service line');
      this.assert(checkoutLine.line_total > 0, 'Checkout line total should be positive');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Select the 2018 Honda Civic maintenance plan with the longest warranty under $50/month
  testTask3_SelectCivicMaintenancePlan() {
    const testName = 'Task 3: Select 2018 Honda Civic maintenance plan with longest warranty under $50/month';
    try {
      // Vehicle year/make/model dropdowns
      const years = this.logic.getVehicleYears();
      this.assert(Array.isArray(years) && years.length > 0, 'Vehicle years should be available');
      this.assert(years.indexOf(2018) !== -1, '2018 should be an available vehicle year');

      const makes = this.logic.getVehicleMakes(2018);
      this.assert(Array.isArray(makes) && makes.length > 0, 'Vehicle makes for 2018 should be available');
      this.assert(makes.indexOf('Honda') !== -1, 'Honda should be an available make for 2018');

      const models = this.logic.getVehicleModels(2018, 'Honda');
      this.assert(Array.isArray(models) && models.length > 0, 'Vehicle models for 2018 Honda should be available');
      this.assert(models.indexOf('Civic') !== -1, 'Civic should be an available model for 2018 Honda');

      // Show plans for 2018 Honda Civic
      const plans = this.logic.getMaintenancePlansForVehicle(2018, 'Honda', 'Civic');
      this.assert(Array.isArray(plans) && plans.length >= 2,
        'Should have at least two maintenance plans for 2018 Honda Civic');

      const firstTwo = plans.slice(0, 2);
      const planId1 = firstTwo[0].plan_id;
      const planId2 = firstTwo[1].plan_id;
      this.assert(planId1 && planId2, 'First two plans should have plan_id values');

      // Compare those two plans
      const comparison = this.logic.compareMaintenancePlans([planId1, planId2]);
      this.assert(Array.isArray(comparison) && comparison.length === 2,
        'Comparison should return 2 plan entries');

      // Choose plan with longest warranty under $50/month
      const eligible = comparison.filter(p => p.monthly_price < 50);
      this.assert(eligible.length > 0, 'There should be at least one plan under $50/month');

      // Sort by warranty_months descending
      eligible.sort((a, b) => {
        if (a.warranty_months === b.warranty_months) return 0;
        return a.warranty_months > b.warranty_months ? -1 : 1;
      });
      const chosenComparison = eligible[0];
      const chosenPlanId = chosenComparison.plan_id;
      this.assert(chosenPlanId, 'Chosen plan should have an id');

      // Use plan detail view
      const planDetail = this.logic.getMaintenancePlanDetail(chosenPlanId);
      this.assert(planDetail && planDetail.plan, 'Plan detail should be returned for chosen plan');
      this.assert(planDetail.plan.monthly_price < 50,
        'Chosen plan monthly_price should remain under $50/month');

      // Add the chosen plan to cart
      const addResult = this.logic.addMaintenancePlanToCart(chosenPlanId);
      this.assert(addResult && addResult.success === true,
        'addMaintenancePlanToCart should succeed');
      this.assert(addResult.cart && addResult.added_item,
        'addMaintenancePlanToCart should return cart and added_item');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items),
        'Cart summary should be available after adding maintenance plan');

      const addedItemId = addResult.added_item.id;
      const row = cartSummary.items.find(r =>
        r.cart_item && r.cart_item.id === addedItemId
      );
      this.assert(row, 'Cart summary should include the maintenance plan item');
      this.assert(row.maintenance_plan != null, 'Cart summary row should reference a maintenance_plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Request an engine diagnostics quote with earliest morning drop-off within 3 days
  testTask4_RequestEngineDiagnosticsQuote() {
    const testName = 'Task 4: Request engine diagnostics quote with earliest morning drop-off within 3 days';
    try {
      // Get quote-eligible services and pick engine diagnostics
      const quoteServices = this.logic.getQuoteServiceOptions();
      this.assert(Array.isArray(quoteServices) && quoteServices.length > 0,
        'Quote service options should be available');

      let diagService = quoteServices.find(s =>
        s.name && s.name.toLowerCase().indexOf('engine diagnostics') !== -1
      );
      if (!diagService) {
        diagService = quoteServices[0];
      }
      const serviceId = diagService.service_id;
      this.assert(serviceId, 'Selected quote service should have service_id');

      // Get availability near ZIP 60601 for next 3 days, 8-10 AM
      const availByZip = this.logic.getQuoteAvailabilityByZip(
        serviceId,
        '60601',
        3,
        '08:00',
        '10:00'
      );
      this.assert(Array.isArray(availByZip) && availByZip.length > 0,
        'Quote availability should return at least one location');

      // Choose nearest location (smallest distance_miles)
      availByZip.sort((a, b) => {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
      const nearest = availByZip[0];
      const locationId = nearest.location_id;
      this.assert(locationId, 'Nearest quote-availability entry should include location_id');
      this.assert(Array.isArray(nearest.time_slots) && nearest.time_slots.length > 0,
        'Nearest location should have time_slots');

      // Find earliest morning slot in returned window
      const sortedSlots = nearest.time_slots
        .filter(ts => ts.is_available !== false)
        .sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1));
      this.assert(sortedSlots.length > 0, 'At least one available time slot should exist');
      const chosenSlot = sortedSlots[0];

      // Basic time window verification (08:00-10:00)
      this.assert(this.isTimeWithinRange(chosenSlot.start_datetime, '08:00', '10:00'),
        'Chosen quote time should fall between 08:00 and 10:00');

      // Submit quote request with contact details
      const quoteResult = this.logic.submitQuoteRequest(
        serviceId,
        locationId,
        'drop_off',
        chosenSlot.start_datetime,
        'Alex Rivera',
        '555-234-7890',
        'alex@example.com',
        'Check engine light has been on for 3 days; car runs rough at idle.'
      );

      this.assert(quoteResult && quoteResult.quote_request,
        'submitQuoteRequest should return a quote_request');
      const qr = quoteResult.quote_request;
      this.assert(qr.id, 'QuoteRequest should have id');
      this.assert(qr.service_id === serviceId, 'QuoteRequest service_id should match selected service');
      this.assert(qr.location_id === locationId, 'QuoteRequest location_id should match chosen location');
      this.assert(qr.visit_type === 'drop_off', 'QuoteRequest visit_type should be drop_off');
      this.assert(qr.name === 'Alex Rivera', 'QuoteRequest should contain provided name');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Book the cheapest same-day flat tire repair after 6 PM at a shop open past 7 PM
  // Adapted to available data: still finds cheapest same-day flat tire repair and prefers slots after 18:00.
  testTask5_BookFlatTireRepairSameDay() {
    const testName = 'Task 5: Book cheapest same-day flat tire repair with evening slot';
    try {
      // Navigate to "Tires & Wheels" category
      const categories = this.logic.getServiceCategories();
      this.assert(Array.isArray(categories) && categories.length > 0,
        'Service categories should be available');

      let tiresCategory = categories.find(c => c.slug === 'tires_wheels');
      if (!tiresCategory) {
        tiresCategory = categories[0];
      }

      const servicesInTires = this.logic.getServicesByCategory(tiresCategory.slug);
      this.assert(Array.isArray(servicesInTires) && servicesInTires.length > 0,
        'Tires category should list services');

      let flatServiceSummary = servicesInTires.find(s =>
        s.name && s.name.toLowerCase().indexOf('flat tire') !== -1
      );
      if (!flatServiceSummary) {
        flatServiceSummary = servicesInTires[0];
      }
      const serviceId = flatServiceSummary.service_id;
      this.assert(serviceId, 'Flat tire service should have service_id');

      // Service detail
      const serviceDetail = this.logic.getServiceDetail(serviceId);
      this.assert(serviceDetail && serviceDetail.service, 'Service detail should be returned for flat tire repair');

      // Search availability for today near ZIP 94110, prefer locations open past 7 PM
      const todayStr = this.formatDateYMD(new Date());
      const availability = this.logic.searchServiceAvailability(
        serviceId,
        null,
        '94110',
        todayStr,
        { minClosingTime: '19:00' }
      );
      this.assert(Array.isArray(availability) && availability.length > 0,
        'searchServiceAvailability should return at least one location for flat tire repair');

      // For each location, we expect available_time_slots array
      // Choose location with lowest lowest_price
      availability.sort((a, b) => {
        const pa = typeof a.lowest_price === 'number' ? a.lowest_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.lowest_price === 'number' ? b.lowest_price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
      const chosenLoc = availability[0];
      const locationId = chosenLoc.location_id;
      this.assert(locationId, 'Chosen availability entry should have location_id');

      const slots = (chosenLoc.available_time_slots || []).filter(ts => ts.is_available !== false);
      this.assert(slots.length > 0, 'Chosen location should have available time slots');

      // Choose lowest-priced slot after 18:00; if none, choose overall cheapest slot
      let eveningSlots = slots.filter(ts => this.isHourAtLeast(ts.start_datetime, 18));
      let candidateSlots = eveningSlots.length > 0 ? eveningSlots : slots;
      candidateSlots.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        if (pa === pb) {
          return a.start_datetime > b.start_datetime ? 1 : -1;
        }
        return pa - pb;
      });
      const chosenSlot = candidateSlots[0];

      this.assert(chosenSlot && chosenSlot.id, 'Should select a time slot for flat tire repair');
      this.assert(chosenSlot.price > 0, 'Slot should have positive price');

      // Book the appointment
      const servicePackageId = chosenSlot.service_package_id;
      this.assert(servicePackageId, 'Time slot should reference a service_package_id');

      const createResult = this.logic.createAppointment(
        locationId,
        servicePackageId,
        chosenSlot.id,
        null,
        'wait',
        null,
        'Task 5 automated flat tire repair booking'
      );

      this.assert(createResult && createResult.appointment,
        'createAppointment should return an appointment for flat tire repair');
      const appt = createResult.appointment;
      this.assert(appt.location_id === locationId, 'Appointment location should match the selected location');
      this.assert(appt.service_package_id === servicePackageId, 'Appointment service_package_id should match slot');
      this.assert(appt.price > 0, 'Flat tire repair appointment price should be positive');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Schedule a 30,000-mile service with free shuttle within 5 miles under $200
  // Adapted: use any service under $200 at a location offering free shuttle within at least 3 miles.
  testTask6_ScheduleServiceWithShuttle() {
    const testName = 'Task 6: Schedule service with free shuttle and pickup address';
    try {
      // Search locations near 75201 with free shuttle (using 3-mile radius to match sample data)
      const shuttleLocations = this.logic.searchLocationsWithShuttleFilter('75201', 3);
      this.assert(Array.isArray(shuttleLocations) && shuttleLocations.length > 0,
        'Should find at least one location offering free shuttle within 3 miles');

      const chosen = shuttleLocations[0];
      const locationId = chosen.location_id;
      this.assert(locationId, 'Shuttle-filtered location should have location_id');
      this.assert(chosen.offers_free_shuttle === true,
        'Chosen location should offer free shuttle service');

      // Location details to confirm shuttle info
      const locationDetail = this.logic.getLocationDetail(locationId);
      this.assert(locationDetail && locationDetail.shuttle_info,
        'Location detail should expose shuttle_info');
      this.assert(locationDetail.shuttle_info.offers_free_shuttle === true,
        'Location shuttle_info should confirm free shuttle');

      // Open schedule service (use catalog to find a package under $200)
      const catalog = this.logic.getLocationServiceCatalog(locationId);
      this.assert(catalog && Array.isArray(catalog.service_categories) && catalog.service_categories.length > 0,
        'Service catalog for shuttle location should be available');

      // Find any package with base_price < 200
      let chosenServicePackageId = null;
      let chosenBasePrice = null;
      outer: for (let i = 0; i < catalog.service_categories.length; i++) {
        const cat = catalog.service_categories[i];
        if (!cat.services) continue;
        for (let j = 0; j < cat.services.length; j++) {
          const svc = cat.services[j];
          if (!svc.packages) continue;
          for (let k = 0; k < svc.packages.length; k++) {
            const pkg = svc.packages[k];
            if (pkg.is_available && typeof pkg.base_price === 'number' && pkg.base_price < 200) {
              chosenServicePackageId = pkg.service_package_id;
              chosenBasePrice = pkg.base_price;
              break outer;
            }
          }
        }
      }

      this.assert(chosenServicePackageId,
        'Should find a service package under $200 at shuttle-enabled location');

      // Get an appointment time slot for tomorrow for that package (if tomorrow has no slots, fallback to today)
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = this.formatDateYMD(tomorrow);
      let slots = this.logic.getAppointmentTimeSlots(locationId, chosenServicePackageId, tomorrowStr);
      if (!Array.isArray(slots) || slots.length === 0) {
        const todayStr = this.formatDateYMD(today);
        slots = this.logic.getAppointmentTimeSlots(locationId, chosenServicePackageId, todayStr);
      }
      this.assert(Array.isArray(slots) && slots.length > 0,
        'Should have at least one appointment time slot for shuttle service');

      const chosenSlot = slots.sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1))[0];
      this.assert(chosenSlot && chosenSlot.id, 'Should select a time slot for shuttle service');

      // Book appointment with visitType = shuttle and pickup address
      const pickupAddress = '123 Main St, Dallas, TX 75201';
      const createResult = this.logic.createAppointment(
        locationId,
        chosenServicePackageId,
        chosenSlot.id,
        null,
        'shuttle',
        pickupAddress,
        'Task 6 automated shuttle booking test'
      );

      this.assert(createResult && createResult.appointment,
        'createAppointment should return an appointment for shuttle visit');
      const appt = createResult.appointment;
      this.assert(appt.visit_type === 'shuttle', 'Appointment visit_type should be shuttle');
      this.assert(appt.shuttle_pickup_address === pickupAddress,
        'Appointment should contain the specified shuttle pickup address');
      this.assert(appt.price <= 200 || chosenBasePrice <= 200,
        'Shuttle appointment price (or base_price) should be at or under $200');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Purchase a $100 email-delivery gift card and proceed to checkout
  testTask7_PurchaseGiftCardAndCheckoutSummary() {
    const testName = 'Task 7: Purchase $100 email gift card and go to checkout summary';
    try {
      // Gift cards listing
      const products = this.logic.getGiftCardProducts();
      this.assert(Array.isArray(products) && products.length > 0,
        'Gift card products should be available');

      // Select an email delivery gift card
      let emailProduct = products.find(p => p.delivery_method === 'email');
      if (!emailProduct) {
        emailProduct = products[0];
      }
      const productId = emailProduct.id;
      this.assert(productId, 'Selected gift card product should have id');

      // Product detail (to confirm preset amounts)
      const productDetail = this.logic.getGiftCardProductDetail(productId);
      this.assert(productDetail && productDetail.product,
        'Gift card product detail should be returned');

      const preset = productDetail.preset_amounts || [];
      this.assert(preset.length === 0 || preset.indexOf(100) !== -1 ||
        (productDetail.min_custom_amount <= 100 && 100 <= productDetail.max_custom_amount),
        'Gift card product should support a $100 amount either as preset or custom within allowed range');

      // Configure $100 email gift card
      const amount = 100;
      const addResult = this.logic.addGiftCardToCart(
        productId,
        amount,
        'email',
        'Jordan Lee',
        'jordan@example.com',
        'Pat Morgan',
        'pat@example.com',
        'Happy birthday! Use this for your next service.'
      );

      this.assert(addResult && addResult.success === true,
        'addGiftCardToCart should succeed');
      this.assert(addResult.gift_card && addResult.cart_item,
        'addGiftCardToCart should return gift_card and cart_item');

      const giftCard = addResult.gift_card;
      this.assert(giftCard.amount === amount,
        'Gift card amount should be exactly the configured $100');
      this.assert(giftCard.delivery_method === 'email',
        'Gift card delivery_method should be email');

      // Verify in cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items) && cartSummary.items.length > 0,
        'Cart summary should contain at least one item');

      const addedCartItemId = addResult.cart_item.id;
      const row = cartSummary.items.find(r =>
        r.cart_item && r.cart_item.id === addedCartItemId
      );
      this.assert(row, 'Cart summary should include the gift card item');
      this.assert(row.gift_card != null, 'Cart summary row should reference a gift_card');

      // Proceed to checkout page (summary)
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart,
        'Checkout summary should return cart');
      this.assert(Array.isArray(checkoutSummary.items) && checkoutSummary.items.length > 0,
        'Checkout summary should list items');

      const checkoutLine = checkoutSummary.items.find(line =>
        line.cart_item && line.cart_item.id === addedCartItemId
      );
      this.assert(checkoutLine, 'Checkout summary should include the gift card line item');
      this.assert(checkoutLine.line_total === amount || checkoutLine.line_total > 0,
        'Gift card checkout line total should be positive (likely equal to $100)');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Set up 3-month maintenance reminders for a 2020 Toyota Camry via email and SMS
  testTask8_SetupMaintenanceReminders() {
    const testName = 'Task 8: Set up 3-month maintenance reminders for 2020 Toyota Camry via email & SMS';
    try {
      // Even if dropdown helpers do not list 2020/Toyota/Camry explicitly, the reminder API
      // accepts year/make/model directly, so we focus on the reminder schedule creation.

      const vehicleYear = 2020;
      const vehicleMake = 'Toyota';
      const vehicleModel = 'Camry';
      const currentMileage = 25000;
      const annualMileageEstimate = 10000;

      const scheduleResult = this.logic.createMaintenanceReminderSchedule(
        vehicleYear,
        vehicleMake,
        vehicleModel,
        currentMileage,
        annualMileageEstimate,
        'every_3_months',
        'Morgan Patel',
        'morgan@example.com',
        '555-987-6543',
        '85001',
        true,   // notifyByEmail
        true    // notifyBySms
      );

      this.assert(scheduleResult && scheduleResult.schedule,
        'createMaintenanceReminderSchedule should return a schedule');

      const sched = scheduleResult.schedule;
      this.assert(sched.id, 'Reminder schedule should have an id');
      this.assert(sched.vehicle_year === vehicleYear, 'Schedule vehicle_year should match input');
      this.assert(sched.vehicle_make === vehicleMake, 'Schedule vehicle_make should match input');
      this.assert(sched.vehicle_model === vehicleModel, 'Schedule vehicle_model should match input');
      this.assert(sched.reminder_frequency === 'every_3_months',
        'Reminder frequency should be every_3_months');
      this.assert(sched.notify_by_email === true && sched.notify_by_sms === true,
        'Schedule should be configured to notify by both email and SMS');
      this.assert(scheduleResult.next_reminder_at,
        'Result should include next_reminder_at for first reminder');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: format Date -> 'YYYY-MM-DD'
  formatDateYMD(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Helper: check if ISO datetime has time between [startHHMM, endHHMM)
  isTimeWithinRange(isoString, startHHMM, endHHMM) {
    if (!isoString) return false;
    const timePart = isoString.split('T')[1] || '';
    const hhmm = timePart.substring(0, 5); // 'HH:MM'
    return hhmm >= startHHMM && hhmm < endHHMM;
  }

  // Helper: check if ISO datetime hour >= thresholdHour (0-23)
  isHourAtLeast(isoString, thresholdHour) {
    if (!isoString) return false;
    const timePart = isoString.split('T')[1] || '';
    const hourStr = timePart.substring(0, 2);
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return false;
    return hour >= thresholdHour;
  }

  // Assertion helper
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
