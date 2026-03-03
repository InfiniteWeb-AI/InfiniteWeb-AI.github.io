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
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (same IDs/values)
    const generatedData = {
      gallery_items: [
        {
          id: 'gal_matte_black_suv_1',
          title: 'Matte Black SUV Full Wrap',
          description: 'Complete matte black full-body color change on a mid-size SUV with blacked-out trim.',
          image_url: 'https://images.unsplash.com/photo-1515923164501-1a93c7263a9f?w=800&h=600&fit=crop&auto=format&q=80',
          finish_type: 'matte',
          dominant_colors: ['black'],
          vehicle_type: 'suv',
          service_category: 'full_body_color_change',
          created_at: '2025-11-18T10:15:00Z'
        },
        {
          id: 'gal_matte_gray_coupe_1',
          title: 'Charcoal Matte Coupe Repaint',
          description: 'Two-door coupe resprayed in charcoal matte with subtle shadow accents.',
          image_url: 'https://cdn.shopify.com/s/files/1/0269/5109/0276/products/TLS-TheSubtle-Gray_Adult_530x@2x.jpg?v=1593551304',
          finish_type: 'matte',
          dominant_colors: ['gray', 'black'],
          vehicle_type: '2_door_coupe',
          service_category: 'full_body_repaint',
          created_at: '2025-10-05T14:42:00Z'
        },
        {
          id: 'gal_matte_black_truck_1',
          title: 'Work Truck Stealth Matte',
          description: 'Shop truck converted to a stealth matte black finish for a rugged look.',
          image_url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop&auto=format&q=80',
          finish_type: 'matte',
          dominant_colors: ['black'],
          vehicle_type: 'truck',
          service_category: 'custom_paint',
          created_at: '2025-09-12T09:30:00Z'
        }
      ],
      locations: [
        {
          id: 'loc_la_south_main',
          name: 'LA South Custom Paint Center',
          address_line1: '1240 E Slauson Ave',
          address_line2: '',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90001',
          country: 'USA',
          phone: '+1-323-555-0142',
          email: 'lasouth@chromacraftauto.com',
          latitude: 33.9731,
          longitude: -118.2479,
          services_offered: [
            'full_body_color_change',
            'full_body_repaint',
            'custom_racing_stripes',
            'custom_paint',
            'other_service'
          ],
          business_hours: [
            { day: 'monday', open: '08:00', close: '18:00' },
            { day: 'tuesday', open: '08:00', close: '18:00' },
            { day: 'wednesday', open: '08:00', close: '18:00' },
            { day: 'thursday', open: '08:00', close: '18:00' },
            { day: 'friday', open: '08:00', close: '18:00' },
            { day: 'saturday', open: '09:00', close: '15:00' },
            { day: 'sunday', open: 'closed', close: 'closed' }
          ],
          is_active: true,
          map_link_url: 'https://www.google.com/maps?q=1240+E+Slauson+Ave+Los+Angeles+CA+90001'
        },
        {
          id: 'loc_la_downtown',
          name: 'Downtown LA Color Lab',
          address_line1: '715 S Alameda St',
          address_line2: 'Suite 200',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90021',
          country: 'USA',
          phone: '+1-213-555-0198',
          email: 'dtla@chromacraftauto.com',
          latitude: 34.0326,
          longitude: -118.2409,
          services_offered: [
            'full_body_color_change',
            'full_body_repaint',
            'custom_paint',
            'custom_racing_stripes'
          ],
          business_hours: [
            { day: 'monday', open: '09:00', close: '19:00' },
            { day: 'tuesday', open: '09:00', close: '19:00' },
            { day: 'wednesday', open: '09:00', close: '19:00' },
            { day: 'thursday', open: '09:00', close: '19:00' },
            { day: 'friday', open: '09:00', close: '19:00' },
            { day: 'saturday', open: '09:00', close: '14:00' },
            { day: 'sunday', open: 'closed', close: 'closed' }
          ],
          is_active: true,
          map_link_url: 'https://www.google.com/maps?q=715+S+Alameda+St+Los+Angeles+CA+90021'
        },
        {
          id: 'loc_inglewood',
          name: 'Inglewood Performance Finishes',
          address_line1: '3320 W Manchester Blvd',
          address_line2: '',
          city: 'Inglewood',
          state: 'CA',
          postal_code: '90305',
          country: 'USA',
          phone: '+1-310-555-4432',
          email: 'inglewood@chromacraftauto.com',
          latitude: 33.9595,
          longitude: -118.3336,
          services_offered: [
            'full_body_color_change',
            'full_body_repaint',
            'custom_racing_stripes',
            'other_service'
          ],
          business_hours: [
            { day: 'monday', open: '08:30', close: '17:30' },
            { day: 'tuesday', open: '08:30', close: '17:30' },
            { day: 'wednesday', open: '08:30', close: '17:30' },
            { day: 'thursday', open: '08:30', close: '17:30' },
            { day: 'friday', open: '08:30', close: '17:30' },
            { day: 'saturday', open: '09:00', close: '13:00' },
            { day: 'sunday', open: 'closed', close: 'closed' }
          ],
          is_active: true,
          map_link_url: 'https://www.google.com/maps?q=3320+W+Manchester+Blvd+Inglewood+CA+90305'
        }
      ],
      service_packages: [
        {
          id: 'fbcc_suv_budget',
          name: 'Budget Full Color Change - SUV',
          category: 'full_body_color_change',
          short_label: 'Budget SUV Color Change',
          description: 'Entry-level full-body color change for SUVs using high-quality single-stage paint.',
          base_price: 1599,
          current_price: 1299,
          currency: 'USD',
          vehicle_types: ['suv'],
          clear_coat_type: 'standard_clear_coat',
          default_finish_type: 'gloss',
          available_finish_types: ['matte', 'gloss', 'satin'],
          warranty_months: 12,
          warranty_description: '12-month warranty against peeling and major defects.',
          image_url: 'https://i.pinimg.com/originals/8b/78/d4/8b78d480541d755ee38c39b93e6874d5.jpg',
          features: [
            'Factory-matched or new color options',
            'Door jambs optional add-on',
            'Standard clear coat protection'
          ],
          estimated_duration_hours: 30,
          allow_online_booking: true,
          location_specific: false,
          eligible_for_promos: true
        },
        {
          id: 'fbcc_suv_value',
          name: 'Value Full Color Change - SUV',
          category: 'full_body_color_change',
          short_label: 'Value SUV Color Change',
          description: 'Complete SUV color change including visible door jambs and basic trim removal.',
          base_price: 1899,
          current_price: 1599,
          currency: 'USD',
          vehicle_types: ['suv'],
          clear_coat_type: 'standard_clear_coat',
          default_finish_type: 'gloss',
          available_finish_types: ['matte', 'gloss', 'satin'],
          warranty_months: 24,
          warranty_description: '24-month finish and adhesion warranty.',
          image_url: 'https://offroadingpro.com/wp-content/uploads/2021/03/off-road-black-suv-in-the-forest.jpg',
          features: [
            'Full exterior repaint including door edges',
            'Light dent correction included',
            'Choice of matte, satin, or gloss finish'
          ],
          estimated_duration_hours: 36,
          allow_online_booking: true,
          location_specific: false,
          eligible_for_promos: true
        },
        {
          id: 'fbcc_suv_premium',
          name: 'Premium Ceramic Full Color Change - SUV',
          category: 'full_body_color_change',
          short_label: 'Premium SUV Color Change',
          description: 'Show-quality SUV color change with multi-stage paint and ceramic clear coat.',
          base_price: 2599,
          current_price: 2399,
          currency: 'USD',
          vehicle_types: ['suv'],
          clear_coat_type: 'ceramic_clear_coat',
          default_finish_type: 'gloss',
          available_finish_types: ['gloss', 'satin'],
          warranty_months: 48,
          warranty_description: '4-year ceramic clear coat warranty.',
          image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop&auto=format&q=80',
          features: [
            'Multi-stage paint for deep color and clarity',
            'Ceramic clear coat for extreme gloss and protection',
            'Complete disassembly of badges and trim'
          ],
          estimated_duration_hours: 48,
          allow_online_booking: true,
          location_specific: false,
          eligible_for_promos: true
        }
      ],
      appointment_slots: [
        {
          id: 'slot_lasouth_stripes_20260307_0900',
          location_id: 'loc_la_south_main',
          package_id: 'stripes_coupe_basic',
          start_datetime: '2026-03-07T09:00:00Z',
          end_datetime: '2026-03-07T10:00:00Z',
          is_available: true,
          max_vehicles: 1,
          notes: 'Racing stripes bay - coupe only'
        },
        {
          id: 'slot_lasouth_stripes_20260307_1000',
          location_id: 'loc_la_south_main',
          package_id: 'stripes_coupe_basic',
          start_datetime: '2026-03-07T10:00:00Z',
          end_datetime: '2026-03-07T11:00:00Z',
          is_available: true,
          max_vehicles: 1,
          notes: 'Racing stripes bay - coupe only'
        },
        {
          id: 'slot_lasouth_stripes_20260307_0830',
          location_id: 'loc_la_south_main',
          package_id: 'stripes_coupe_basic',
          start_datetime: '2026-03-07T08:30:00Z',
          end_datetime: '2026-03-07T09:30:00Z',
          is_available: true,
          max_vehicles: 1,
          notes: 'Early bird stripes slot'
        }
      ],
      paint_configurations: [
        {
          id: 'pc_2tone_coupe_red_black_basic_1399',
          package_id: 'config_two_tone_coupe_basic',
          name: 'Red Body / Black Roof - Gloss (Saver)',
          vehicle_type: '2_door_coupe',
          primary_color: 'red',
          secondary_color: 'black',
          primary_finish: 'gloss',
          secondary_finish: 'gloss',
          is_two_tone: true,
          price: 1399,
          image_url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'pc_2tone_coupe_red_black_basic_1499',
          package_id: 'config_two_tone_coupe_basic',
          name: 'Gloss Red with Gloss Black Roof & Mirrors',
          vehicle_type: '2_door_coupe',
          primary_color: 'red',
          secondary_color: 'black',
          primary_finish: 'gloss',
          secondary_finish: 'gloss',
          is_two_tone: true,
          price: 1499,
          image_url: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'pc_2tone_coupe_red_black_plus_1750',
          package_id: 'config_two_tone_coupe_plus',
          name: 'Red Gloss Body / Black Gloss Roof & Stripes',
          vehicle_type: '2_door_coupe',
          primary_color: 'red',
          secondary_color: 'black',
          primary_finish: 'gloss',
          secondary_finish: 'gloss',
          is_two_tone: true,
          price: 1750,
          image_url: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      special_offers: [
        {
          id: 'offer_fbcc_over_1200',
          title: 'Full Body Color Change Savings',
          description: 'Save on qualifying full body color change packages priced $1200 or more.',
          promo_code: 'FULLBODY120',
          status: 'active',
          start_date: '2026-02-15T00:00:00Z',
          end_date: '2026-04-30T23:59:59Z',
          min_order_amount: 1200,
          applicable_categories: ['full_body_color_change'],
          applicable_package_ids: [
            'fbcc_suv_budget',
            'fbcc_suv_value',
            'fbcc_suv_premium',
            'fbcc_sedan_standard',
            'fbcc_truck_work',
            'fbcc_coupe_sport'
          ],
          terms: 'Valid on qualifying full body color change packages with a pre-discount price of $1200 or more. One promo code per vehicle. Cannot be combined with other offers.'
        },
        {
          id: 'offer_stripes_15off',
          title: '15% Off Custom Racing Stripes',
          description: 'Take 15% off custom racing stripes packages for coupes booked online.',
          promo_code: 'STRIPES15',
          status: 'active',
          start_date: '2026-01-10T00:00:00Z',
          end_date: '2026-06-30T23:59:59Z',
          min_order_amount: 300,
          applicable_categories: ['custom_racing_stripes'],
          applicable_package_ids: ['stripes_coupe_basic', 'stripes_coupe_premium'],
          terms: 'Online bookings only. Discount applies to labor for racing stripes packages on eligible coupes. Not valid on previously completed work.'
        },
        {
          id: 'offer_newyear2025',
          title: 'New Year Repaint Event 2025',
          description: 'Expired offer for archival reference: discounts on full-body repaints at the start of 2025.',
          promo_code: 'NEWYEAR25',
          status: 'expired',
          start_date: '2025-01-01T00:00:00Z',
          end_date: '2025-02-15T23:59:59Z',
          min_order_amount: 1500,
          applicable_categories: ['full_body_repaint'],
          applicable_package_ids: [
            'fb_repaint_standard_sedan',
            'fb_repaint_standard_any',
            'fb_repaint_ceramic_any'
          ],
          terms: 'Promotion ended February 15, 2025. No longer valid.'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:21:26.933451'
      }
    };

    // Helper to merge generated arrays into existing storage arrays
    const mergeArray = (storageKey, newItems) => {
      const existingRaw = localStorage.getItem(storageKey);
      let existing;
      try {
        existing = existingRaw ? JSON.parse(existingRaw) : [];
      } catch (e) {
        existing = [];
      }
      if (!Array.isArray(existing)) existing = [];
      const merged = existing.concat(newItems);
      localStorage.setItem(storageKey, JSON.stringify(merged));
    };

    mergeArray('gallery_items', generatedData.gallery_items);
    mergeArray('locations', generatedData.locations);
    mergeArray('service_packages', generatedData.service_packages);
    mergeArray('appointment_slots', generatedData.appointment_slots);
    mergeArray('paint_configurations', generatedData.paint_configurations);
    mergeArray('special_offers', generatedData.special_offers);

    // Store metadata for deterministic date-based logic if needed
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CheapestSuvFullBodyColorChange();
    this.testTask2_EarliestSaturdayRacingStripesBooking();
    this.testTask3_TwoToneRedBlackGlossConfigAndSave();
    this.testTask4_ApplyFullBodyColorChangePromoOver1200();
    this.testTask5_CompareClearCoatAndSelectLongestWarranty();
    this.testTask6_HighestRatedLocationWithin20Miles();
    this.testTask7_SubmitFleetColorMatchingInquiry();
    this.testTask8_SaveMatteBlackGrayGalleryFavorites();

    return this.results;
  }

  // Task 1: Select and start booking the cheapest full-body color change for an SUV under $2000
  testTask1_CheapestSuvFullBodyColorChange() {
    const testName = 'Task 1: Cheapest SUV full-body color change under $2000';
    console.log('Testing:', testName);

    try {
      // Simulate homepage navigation
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage.hero_title === 'string', 'Homepage content should load');

      // Get service categories (simulating clicking Services)
      const categories = this.logic.getServiceCategories();
      this.assert(Array.isArray(categories), 'Service categories should be an array');

      // Find full body color change category id (should be 'full_body_color_change')
      const fbccCategory = categories.find(c => c.category === 'full_body_color_change');
      this.assert(fbccCategory, 'Full body color change category should exist');

      // Get SUV packages under $2000, sorted by price low to high
      const filters = {
        category: fbccCategory.category,
        vehicleType: 'suv',
        maxPrice: 2000,
        allowOnlineBooking: true
      };
      const pkgResult = this.logic.getServicePackages(filters, 'price_low_to_high');
      this.assert(pkgResult && Array.isArray(pkgResult.packages), 'Service packages result should contain packages array');
      this.assert(pkgResult.packages.length > 0, 'There should be at least one qualifying SUV package under $2000');

      const packages = pkgResult.packages;

      // Verify sort order ascending by current_price
      for (let i = 1; i < packages.length; i++) {
        const prev = packages[i - 1];
        const curr = packages[i];
        if (typeof prev.current_price === 'number' && typeof curr.current_price === 'number') {
          this.assert(prev.current_price <= curr.current_price, 'Packages should be sorted by price low to high');
        }
      }

      const cheapestPackage = packages[0];
      this.assert(cheapestPackage.current_price <= 2000, 'Cheapest package should be within budget');
      this.assert(
        Array.isArray(cheapestPackage.vehicle_types) &&
          cheapestPackage.vehicle_types.indexOf('suv') !== -1,
        'Cheapest package should support SUVs'
      );

      // View package details (simulating clicking the package card)
      const details = this.logic.getServicePackageDetails(cheapestPackage.id);
      this.assert(details && details.package && details.package.id === cheapestPackage.id, 'Package details should load for selected package');

      // Add to cart (start booking)
      const vehicleTypeForCart = cheapestPackage.vehicle_types[0] || 'suv';
      const addResult = this.logic.addPackageToCart(cheapestPackage.id, vehicleTypeForCart, null, 1);
      this.assert(addResult && addResult.success === true, 'Package should be added to cart successfully');
      this.assert(addResult.cart && Array.isArray(addResult.cart.items), 'Cart with items should be returned');

      const addedItem = addResult.cart.items.find(item => item.package_id === cheapestPackage.id);
      this.assert(!!addedItem, 'Cart should contain the selected cheapest SUV package');
      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Book earliest available Saturday morning appointment for custom racing stripes on a coupe
  testTask2_EarliestSaturdayRacingStripesBooking() {
    const testName = 'Task 2: Earliest Saturday 9-11 AM racing stripes booking for coupe';
    console.log('Testing:', testName);

    try {
      // Simulate homepage navigation
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage.hero_title === 'string', 'Homepage content should load');

      // Use appointment_slots data from storage to identify a suitable Saturday morning stripes slot
      const slotsRaw = localStorage.getItem('appointment_slots');
      const allSlots = slotsRaw ? JSON.parse(slotsRaw) : [];
      this.assert(Array.isArray(allSlots) && allSlots.length > 0, 'Appointment slots should exist in storage');

      // Find earliest available Saturday slot between 9:00 and 11:00 (time-window core logic)
      const saturdayMorningSlots = allSlots
        .filter(s => s.is_available)
        .filter(s => {
          const d = new Date(s.start_datetime);
          const day = d.getUTCDay(); // 6 = Saturday in UTC; this is sufficient for relative ordering
          const hours = d.getUTCHours();
          return day === 6 && hours >= 9 && hours < 11;
        })
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

      this.assert(saturdayMorningSlots.length > 0, 'There should be at least one Saturday morning slot between 9:00 and 11:00');

      const targetSlot = saturdayMorningSlots[0];
      const targetDateStr = targetSlot.start_datetime.slice(0, 10); // YYYY-MM-DD
      const packageId = targetSlot.package_id;
      const locationIdFromSlot = targetSlot.location_id;

      // Simulate selecting Custom Racing Stripes service via packages search
      const filters = {
        category: 'custom_racing_stripes',
        vehicleType: 'coupe',
        allowOnlineBooking: true
      };
      const stripesPkgsResult = this.logic.getServicePackages(filters, 'price_low_to_high');
      this.assert(stripesPkgsResult && Array.isArray(stripesPkgsResult.packages), 'Custom racing stripes packages result should have packages array');
      this.assert(stripesPkgsResult.packages.length > 0, 'At least one custom racing stripes package should be available');

      // Prefer a package whose id matches the slot package_id if present
      let selectedStripesPackage = stripesPkgsResult.packages.find(p => p.id === packageId);
      if (!selectedStripesPackage) {
        selectedStripesPackage = stripesPkgsResult.packages[0];
      }

      // Booking page data for that package
      const bookingPageData = this.logic.getBookingPageData(selectedStripesPackage.id, null);
      this.assert(bookingPageData && bookingPageData.package_summary, 'Booking page data should load for stripes package');

      const locationOptions = bookingPageData.location_options || [];
      this.assert(Array.isArray(locationOptions) && locationOptions.length > 0, 'There should be location options for booking');

      // Choose location that matches the slot, if present, otherwise first one
      let chosenLocation = locationOptions.find(l => l.id === locationIdFromSlot) || locationOptions[0];
      const chosenLocationId = chosenLocation.id;

      // Ensure coupe is an allowed vehicle type, otherwise fall back to first
      const allowedVehicles = bookingPageData.allowed_vehicle_types || [];
      let chosenVehicleType = 'coupe';
      if (!allowedVehicles.some(v => v.value === 'coupe')) {
        if (allowedVehicles.length > 0) {
          chosenVehicleType = allowedVehicles[0].value;
        }
      }

      // Request available slots for that date between 09:00 and 11:00
      const availableSlots = this.logic.getAvailableAppointmentSlots(
        chosenLocationId,
        selectedStripesPackage.id,
        targetDateStr,
        '09:00',
        '11:00'
      );

      this.assert(Array.isArray(availableSlots) && availableSlots.length > 0, 'Should return available slots for the chosen Saturday morning');

      // Pick earliest by start_datetime
      availableSlots.sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
      const earliestSlot = availableSlots[0];

      // Verify each returned slot falls within the requested window
      availableSlots.forEach(s => {
        const d = new Date(s.start_datetime);
        const hours = d.getUTCHours();
        this.assert(hours >= 9 && hours < 11, 'Slot should be between 9:00 and 11:00 (inclusive of 9, exclusive of 11)');
        this.assert(s.is_available === true, 'Slot should be available');
      });

      // Determine appointment type: prefer drop_off if available
      const appointmentTypeOptions = bookingPageData.appointment_type_options || [];
      let appointmentType = null;
      const dropOffOption = appointmentTypeOptions.find(o => o.value === 'drop_off');
      if (dropOffOption) {
        appointmentType = dropOffOption.value;
      } else if (appointmentTypeOptions.length > 0) {
        appointmentType = appointmentTypeOptions[0].value;
      }

      // Place booking using earliest slot
      const contactName = 'Stripe Test User';
      const contactEmail = 'stripe.test@example.com';
      const contactPhone = '5551234567';

      const bookingResult = this.logic.placeBooking(
        selectedStripesPackage.id,
        null,
        chosenVehicleType,
        chosenLocationId,
        earliestSlot.id,
        appointmentType,
        contactName,
        contactEmail,
        contactPhone,
        null
      );

      this.assert(bookingResult && bookingResult.success === true, 'Booking should be placed successfully');
      this.assert(bookingResult.booking && bookingResult.booking.id, 'Booking response should include booking id');

      const booking = bookingResult.booking;
      this.assert(booking.package_id === selectedStripesPackage.id, 'Booking should reference the selected stripes package');
      this.assert(booking.location_id === chosenLocationId, 'Booking should reference the chosen location');
      this.assert(
        booking.appointment_start &&
          new Date(booking.appointment_start).getTime() === new Date(earliestSlot.start_datetime).getTime(),
        'Booking start time should match earliest slot start time'
      );

      // Fetch booking confirmation details
      const bookingDetails = this.logic.getBookingDetails(booking.id);
      this.assert(bookingDetails && bookingDetails.booking && bookingDetails.booking.id === booking.id, 'Booking details should load for placed booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Configure two-tone red/black gloss for 2-door coupe under $1800 and save
  testTask3_TwoToneRedBlackGlossConfigAndSave() {
    const testName = 'Task 3: Two-tone red/black gloss configuration under $1800 and save';
    console.log('Testing:', testName);

    try {
      // Simulate opening configurator
      const initData = this.logic.getConfiguratorInitData();
      this.assert(initData && Array.isArray(initData.vehicle_types), 'Configurator init data should load');

      // Build filters for 2-door coupe, two-tone, red primary, black secondary, gloss finishes, price <= 1800
      const filters = {
        vehicleType: '2_door_coupe',
        primaryColor: 'red',
        secondaryColor: 'black',
        primaryFinish: 'gloss',
        secondaryFinish: 'gloss',
        isTwoTone: true,
        maxPrice: 1800
      };

      const configsResult = this.logic.getPaintConfigurations(filters, 'price_low_to_high');
      this.assert(configsResult && Array.isArray(configsResult.configurations), 'Paint configurations result should include configurations array');
      this.assert(configsResult.configurations.length > 0, 'At least one qualifying two-tone configuration should exist');

      const configs = configsResult.configurations;

      // Verify all configurations match filters and are <= 1800, and sorted by price
      configs.forEach(cfg => {
        this.assert(cfg.vehicle_type === '2_door_coupe', 'Configuration should be for 2-door coupe');
        this.assert(cfg.is_two_tone === true, 'Configuration should be two-tone');
        this.assert(cfg.primary_color === 'red', 'Primary color should be red');
        this.assert(cfg.secondary_color === 'black', 'Secondary color should be black');
        this.assert(cfg.primary_finish === 'gloss', 'Primary finish should be gloss');
        this.assert(cfg.secondary_finish === 'gloss', 'Secondary finish should be gloss');
        this.assert(cfg.price <= 1800, 'Configuration price should be within budget');
      });

      for (let i = 1; i < configs.length; i++) {
        const prev = configs[i - 1];
        const curr = configs[i];
        if (typeof prev.price === 'number' && typeof curr.price === 'number') {
          this.assert(prev.price <= curr.price, 'Configurations should be sorted by price low to high');
        }
      }

      const cheapestConfig = configs[0];

      // View configuration details
      const configDetails = this.logic.getPaintConfigurationDetails(cheapestConfig.id);
      this.assert(configDetails && configDetails.configuration && configDetails.configuration.id === cheapestConfig.id, 'Configuration details should load');

      // Save configuration
      const saveResult = this.logic.savePaintConfiguration(cheapestConfig.id, 'Test Two-Tone Red/Black');
      this.assert(saveResult && saveResult.success === true, 'Configuration should be saved successfully');
      this.assert(saveResult.saved_configuration && saveResult.saved_configuration.configuration_id === cheapestConfig.id, 'Saved configuration should reference the correct configuration id');

      const savedList = this.logic.getSavedConfigurations();
      this.assert(Array.isArray(savedList), 'Saved configurations list should be an array');
      const savedMatch = savedList.find(sc => sc.configuration && sc.configuration.id === cheapestConfig.id);
      this.assert(!!savedMatch, 'Saved configurations should include the saved two-tone configuration');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Apply full-body color change promo code to qualifying service over $1200
  testTask4_ApplyFullBodyColorChangePromoOver1200() {
    const testName = 'Task 4: Apply full-body color change promo code over $1200';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to Special Offers
      const offers = this.logic.getActiveSpecialOffers('full_body_color_change');
      this.assert(Array.isArray(offers) && offers.length > 0, 'There should be active special offers for full body color change');

      // Choose an offer applicable to full_body_color_change
      const fbccOffer = offers.find(o =>
        Array.isArray(o.applicable_categories) &&
        o.applicable_categories.indexOf('full_body_color_change') !== -1
      ) || offers[0];

      this.assert(fbccOffer && typeof fbccOffer.promo_code === 'string', 'Selected offer should have a promo code');

      const promoCode = fbccOffer.promo_code;
      const minAmount = typeof fbccOffer.min_order_amount === 'number' ? fbccOffer.min_order_amount : 0;

      // Find qualifying full body color change packages priced over or equal to minAmount
      const filters = {
        category: 'full_body_color_change',
        minPrice: minAmount
      };
      const pkgResult = this.logic.getServicePackages(filters, 'price_low_to_high');
      this.assert(pkgResult && Array.isArray(pkgResult.packages), 'Service packages result should contain packages array');
      this.assert(pkgResult.packages.length > 0, 'There should be at least one qualifying full body color change package');

      const qualifyingPackage = pkgResult.packages[0];
      this.assert(
        typeof qualifyingPackage.current_price === 'number' && qualifyingPackage.current_price >= minAmount,
        'Selected package should meet the minimum order amount requirement'
      );

      // Add package to cart
      const vehicleTypeForCart = (qualifyingPackage.vehicle_types && qualifyingPackage.vehicle_types[0]) || 'suv';
      const addResult = this.logic.addPackageToCart(qualifyingPackage.id, vehicleTypeForCart, null, 1);
      this.assert(addResult && addResult.success === true, 'Package should be added to cart successfully');

      // Verify cart summary before promo
      const cartSummaryBefore = this.logic.getCartSummary();
      this.assert(cartSummaryBefore && cartSummaryBefore.has_cart === true, 'Cart summary should indicate a cart exists');
      const cartBefore = cartSummaryBefore.cart;
      this.assert(cartBefore && typeof cartBefore.subtotal === 'number', 'Cart subtotal should be numeric');

      // Apply promo code
      const promoResult = this.logic.applyPromoCodeToCart(promoCode);
      this.assert(promoResult && typeof promoResult.success === 'boolean', 'Promo application should return a result');
      this.assert(promoResult.success === true, 'Promo code should be applied successfully');

      const updatedCart = promoResult.cart;
      this.assert(updatedCart && updatedCart.promo_code === promoCode, 'Cart should store the applied promo code');
      this.assert(typeof updatedCart.discount_amount === 'number', 'Discount amount should be numeric');
      this.assert(updatedCart.discount_amount > 0, 'Discount amount should be greater than zero');
      this.assert(
        typeof updatedCart.total === 'number' && updatedCart.total === updatedCart.subtotal - updatedCart.discount_amount,
        'Cart total should reflect subtotal minus discount'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Compare ceramic vs standard clear coat and select option with longest warranty
  testTask5_CompareClearCoatAndSelectLongestWarranty() {
    const testName = 'Task 5: Compare standard vs ceramic clear coat and choose longest warranty';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to Full Body packages (using full body color change as available data)
      const standardFilters = {
        category: 'full_body_color_change',
        clearCoatType: 'standard_clear_coat'
      };
      const standardResult = this.logic.getServicePackages(standardFilters, 'warranty_high_to_low');
      this.assert(standardResult && Array.isArray(standardResult.packages), 'Standard clear coat packages should be returned');
      this.assert(standardResult.packages.length > 0, 'There should be at least one standard clear coat package');

      const standardPackage = standardResult.packages[0];
      this.assert(standardPackage.clear_coat_type === 'standard_clear_coat', 'Selected standard package should have standard clear coat type');

      const ceramicFilters = {
        category: 'full_body_color_change',
        clearCoatType: 'ceramic_clear_coat'
      };
      const ceramicResult = this.logic.getServicePackages(ceramicFilters, 'warranty_high_to_low');
      this.assert(ceramicResult && Array.isArray(ceramicResult.packages), 'Ceramic clear coat packages should be returned');
      this.assert(ceramicResult.packages.length > 0, 'There should be at least one ceramic clear coat package');

      const ceramicPackage = ceramicResult.packages[0];
      this.assert(ceramicPackage.clear_coat_type === 'ceramic_clear_coat', 'Selected ceramic package should have ceramic clear coat type');

      // Add both to comparison list
      const addStdCompare = this.logic.addPackageToComparison(standardPackage.id);
      this.assert(addStdCompare && addStdCompare.success === true, 'Standard package should be added to comparison list');

      const addCeramicCompare = this.logic.addPackageToComparison(ceramicPackage.id);
      this.assert(addCeramicCompare && addCeramicCompare.success === true, 'Ceramic package should be added to comparison list');

      // Load comparison details
      const comparisonDetails = this.logic.getComparisonListDetails();
      this.assert(comparisonDetails && Array.isArray(comparisonDetails.packages), 'Comparison details should include a packages array');

      const compPackages = comparisonDetails.packages;
      this.assert(compPackages.length >= 2, 'Comparison list should contain at least two packages');

      // Determine package with longest warranty
      let bestPackage = compPackages[0];
      compPackages.forEach(p => {
        if (typeof p.warranty_months === 'number' && typeof bestPackage.warranty_months === 'number') {
          if (p.warranty_months > bestPackage.warranty_months) {
            bestPackage = p;
          }
        }
      });

      this.assert(typeof bestPackage.warranty_months === 'number', 'Best package should have a numeric warranty');

      // View details for the best package
      const bestDetails = this.logic.getServicePackageDetails(bestPackage.id);
      this.assert(bestDetails && bestDetails.package && bestDetails.package.id === bestPackage.id, 'Best warranty package details should load');

      // Add best package to cart / start booking
      const vehicleTypeForCart = (bestDetails.package.vehicle_types && bestDetails.package.vehicle_types[0]) || 'suv';
      const addResult = this.logic.addPackageToCart(bestPackage.id, vehicleTypeForCart, null, 1);
      this.assert(addResult && addResult.success === true, 'Best warranty package should be added to cart');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.has_cart === true, 'Cart should exist after adding best package');

      const cart = cartSummary.cart;
      const lineItem = cart.items.find(i => i.package_id === bestPackage.id);
      this.assert(!!lineItem, 'Cart should contain the best warranty package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Find highest-rated shop location within 20 miles of ZIP 90001 and open its details
  testTask6_HighestRatedLocationWithin20Miles() {
    const testName = 'Task 6: Highest-rated location within 20 miles of ZIP 90001';
    console.log('Testing:', testName);

    try {
      const locations = this.logic.searchLocations('90001', 20, 'rating_high_to_low');
      this.assert(Array.isArray(locations) && locations.length > 0, 'Location search should return at least one location');

      // Verify sorting by rating high to low where ratings are defined
      for (let i = 1; i < locations.length; i++) {
        const prev = locations[i - 1];
        const curr = locations[i];
        if (typeof prev.rating === 'number' && typeof curr.rating === 'number') {
          this.assert(prev.rating >= curr.rating, 'Locations should be sorted by rating high to low');
        }
      }

      const topLocation = locations[0];
      this.assert(topLocation && topLocation.id, 'Top location should have an id');

      const details = this.logic.getLocationDetails(topLocation.id);
      this.assert(details && details.location && details.location.id === topLocation.id, 'Location details should load for top location');

      const loc = details.location;
      this.assert(Array.isArray(loc.business_hours), 'Location should have business hours defined');
      this.assert(typeof loc.map_link_url === 'string' && loc.map_link_url.length > 0, 'Location should have a map link URL');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Submit a contact form request about color-matching for a fleet of 5+ vehicles
  testTask7_SubmitFleetColorMatchingInquiry() {
    const testName = 'Task 7: Submit fleet color-matching contact inquiry (5+ vehicles)';
    console.log('Testing:', testName);

    try {
      const formOptions = this.logic.getContactFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.inquiry_types), 'Contact form options should include inquiry_types');

      // Choose appropriate inquiry type: prefer fleet_commercial or business_services
      const inquiryTypes = formOptions.inquiry_types;
      let chosenInquiryType = inquiryTypes.find(t => t.value === 'fleet_commercial');
      if (!chosenInquiryType) {
        chosenInquiryType = inquiryTypes.find(t => t.value === 'business_services') || inquiryTypes[0];
      }

      this.assert(chosenInquiryType && chosenInquiryType.value, 'Chosen inquiry type should have a value');

      // Preferred contact method: choose phone if available
      const pcm = formOptions.preferred_contact_methods || [];
      let chosenPcm = pcm.find(m => m.value === 'phone') || pcm[0];
      const preferredContactMethod = chosenPcm ? chosenPcm.value : 'phone';

      const name = 'Alex Johnson';
      const email = 'alex@example.com';
      const phone = '5551234567';
      const fleetSize = 8;
      const message = 'We have a fleet of 8 vans that need consistent custom color-matching across all vehicles for our new branding.';

      this.assert(message.length >= 50, 'Message should be at least 50 characters long');

      const submitResult = this.logic.submitContactInquiry(
        chosenInquiryType.value,
        name,
        email,
        phone,
        preferredContactMethod,
        message,
        fleetSize
      );

      this.assert(submitResult && submitResult.success === true, 'Contact inquiry should be submitted successfully');
      this.assert(submitResult.inquiry_id, 'Submit result should include inquiry_id');

      // Verify persisted state in contact_inquiries storage
      const storedRaw = localStorage.getItem('contact_inquiries');
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      this.assert(Array.isArray(stored), 'Stored contact_inquiries should be an array');

      const storedInquiry = stored.find(i => i.id === submitResult.inquiry_id);
      this.assert(!!storedInquiry, 'Stored inquiries should contain the newly created inquiry');
      this.assert(storedInquiry.message && storedInquiry.message.indexOf('fleet') !== -1, 'Stored inquiry message should mention fleet');
      if (typeof storedInquiry.fleet_size === 'number') {
        this.assert(storedInquiry.fleet_size >= 5, 'Stored fleet size should be at least 5');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Save five matte black or gray paint jobs from the gallery to favorites (adapted to available 3)
  testTask8_SaveMatteBlackGrayGalleryFavorites() {
    const testName = 'Task 8: Save matte black/gray gallery items to favorites';
    console.log('Testing:', testName);

    try {
      // Get gallery filter options
      const filterOptions = this.logic.getGalleryFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.finish_types), 'Gallery filter options should include finish_types');

      // Ensure matte finish is available
      const matteFinish = filterOptions.finish_types.find(f => f.value === 'matte') || filterOptions.finish_types[0];
      this.assert(matteFinish && matteFinish.value, 'Should have a matte finish filter option');

      // Choose black and gray color options
      const colorOptions = filterOptions.color_options || [];
      let hasBlack = colorOptions.some(c => c.value === 'black');
      let hasGray = colorOptions.some(c => c.value === 'gray');

      const colorsFilter = [];
      if (hasBlack) colorsFilter.push('black');
      if (hasGray) colorsFilter.push('gray');
      // Fallback: if none matched, just use whatever first two options exist
      if (colorsFilter.length === 0 && colorOptions.length > 0) {
        colorsFilter.push(colorOptions[0].value);
      }

      // Get gallery items filtered by matte and black/gray
      const filters = {
        finishTypes: [matteFinish.value],
        colors: colorsFilter
      };
      const galleryResult = this.logic.getGalleryItems(filters, 'newest_first', 1, 20);
      this.assert(galleryResult && Array.isArray(galleryResult.items), 'Gallery items result should include items array');
      this.assert(galleryResult.items.length > 0, 'At least one matte black/gray gallery item should be returned');

      const items = galleryResult.items;
      const numToFavorite = Math.min(5, items.length); // adapt to available data
      const toFavorite = items.slice(0, numToFavorite);

      // Favorite each selected item
      const favoritedIds = [];
      toFavorite.forEach(item => {
        this.assert(item.finish_type === 'matte', 'Item should have matte finish');
        if (Array.isArray(item.dominant_colors)) {
          this.assert(
            item.dominant_colors.indexOf('black') !== -1 ||
              item.dominant_colors.indexOf('gray') !== -1,
            'Item dominant colors should include black or gray'
          );
        }

        const favResult = this.logic.addFavoriteGalleryItem(item.id);
        this.assert(favResult && favResult.success === true, 'Gallery item should be favorited successfully');
        favoritedIds.push(item.id);
      });

      // Load favorites and verify
      const favorites = this.logic.getFavoriteGalleryItems();
      this.assert(Array.isArray(favorites), 'Favorite gallery items should be an array');

      const matchedFavorites = favorites.filter(f => favoritedIds.indexOf(f.gallery_item.id) !== -1);
      this.assert(
        matchedFavorites.length === favoritedIds.length,
        'All selected gallery items should appear in favorites'
      );

      matchedFavorites.forEach(f => {
        this.assert(f.gallery_item.finish_type === 'matte', 'Favorited item should have matte finish');
        if (Array.isArray(f.gallery_item.dominant_colors)) {
          this.assert(
            f.gallery_item.dominant_colors.indexOf('black') !== -1 ||
              f.gallery_item.dominant_colors.indexOf('gray') !== -1,
            'Favorited item should be black or gray tone'
          );
        }
      });

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
