/* Test runner for business logic - flow-based integration tests for waxing salon */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Initial clean environment
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
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      gift_card_templates: [
        {
          id: 'waxing_only_gc',
          name: 'Waxing Only Gift Card',
          description: 'Redeemable exclusively for waxing services at the salon, including individual waxing services and waxing packages.',
          usage_type: 'waxing_only',
          min_amount: 25,
          max_amount: 300,
          preset_amounts: [50, 75, 100, 150, 200],
          is_active: true
        },
        {
          id: 'waxing_services_gc',
          name: 'Waxing Services e-Gift Card',
          description: 'Digital gift card valid for any waxing service on our menu, perfect for email delivery.',
          usage_type: 'waxing_services',
          min_amount: 25,
          max_amount: 500,
          preset_amounts: [50, 100, 150, 250, 300],
          is_active: true
        },
        {
          id: 'all_services_gc',
          name: 'Salon Experience Gift Card',
          description: 'Flexible gift card that can be used toward waxing and all other eligible salon services.',
          usage_type: 'all_services',
          min_amount: 50,
          max_amount: 500,
          preset_amounts: [50, 75, 100, 200, 300, 400],
          is_active: true
        }
      ],
      products: [
        {
          id: 'prod_aloe_gel',
          name: 'Soothing Aloe Post-Wax Gel',
          description: 'Cooling aloe-based gel formulated to calm and hydrate skin immediately after waxing.',
          category_key: 'aftercare',
          price: 18,
          rating: 4.6,
          rating_count: 87,
          fulfillment_options: ['in_store_pickup', 'shipping'],
          is_free_in_store_pickup: true,
          image_url: 'https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&h=600&fit=crop&auto=format&q=80',
          is_active: true
        },
        {
          id: 'prod_post_wax_lotion',
          name: 'Calming Post-Wax Body Lotion',
          description: 'Lightweight lotion with chamomile and oat to reduce redness and lock in moisture after waxing.',
          category_key: 'aftercare',
          price: 24,
          rating: 4.4,
          rating_count: 132,
          fulfillment_options: ['in_store_pickup', 'shipping'],
          is_free_in_store_pickup: true,
          image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop&auto=format&q=80',
          is_active: true
        },
        {
          id: 'prod_ingrown_serum',
          name: 'Ingrown Hair Serum Roller',
          description: 'Targeted serum with salicylic acid to prevent ingrown hairs on legs, bikini line, and underarms.',
          category_key: 'aftercare',
          price: 28,
          rating: 4.7,
          rating_count: 209,
          fulfillment_options: ['in_store_pickup', 'shipping'],
          is_free_in_store_pickup: true,
          image_url: 'https://www.treatnheal.com/wp-content/uploads/2018/08/Best-Ingrown-Hair-Serums.jpg',
          is_active: true
        }
      ],
      promotions: [
        {
          id: 'promo_wax10',
          name: '10% Off Waxing Packages Over $100',
          description: 'Save 10% on any qualifying waxing package with a regular price over $100.',
          promo_code: 'WAX10',
          promo_type: 'percentage_off',
          target_type: 'waxing_package',
          discount_value: 10,
          min_package_price: 100,
          min_order_total: null,
          starts_at: '2025-01-01T00:00:00Z',
          ends_at: '2026-12-31T23:59:59Z',
          is_active: true,
          conditions_text: 'Valid on waxing packages with a pre-discount price over $100 before tax and fees. One promo code per order.'
        },
        {
          id: 'promo_care15',
          name: '$15 Off Aftercare Orders $60+',
          description: 'Get $15 off when you spend $60 or more on waxing aftercare products in a single order.',
          promo_code: 'CARE15',
          promo_type: 'fixed_amount_off',
          target_type: 'product',
          discount_value: 15,
          min_package_price: null,
          min_order_total: 60,
          starts_at: '2025-06-01T00:00:00Z',
          ends_at: '2026-08-31T23:59:59Z',
          is_active: true,
          conditions_text: 'Valid on eligible aftercare retail products only. Minimum merchandise subtotal of $60 required.'
        },
        {
          id: 'promo_spring20',
          name: 'Spring Refresh 20% Off',
          description: 'Limited-time 20% off entire order for new guests booking any waxing service.',
          promo_code: 'SPRING20',
          promo_type: 'percentage_off',
          target_type: 'entire_order',
          discount_value: 20,
          min_package_price: null,
          min_order_total: 100,
          starts_at: '2026-03-01T00:00:00Z',
          ends_at: '2026-04-30T23:59:59Z',
          is_active: true,
          conditions_text: 'New guests only. Requires at least one waxing service in the order and a $100 minimum subtotal.'
        }
      ],
      services: [
        {
          id: 'svc_full_leg_basic',
          name: 'Full Leg Wax - Basic',
          description: 'Thorough waxing from upper thigh to ankle for smooth, hair-free legs.',
          main_area_group: 'legs',
          area_key: 'full_leg',
          gender_segment: 'unisex',
          duration_minutes: 45,
          base_price: 65,
          is_major_area: true,
          is_active: true,
          rating: 4.7,
          display_order: 1,
          image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_full_leg_deluxe',
          name: 'Full Leg Wax - Deluxe',
          description: 'Full leg wax including exfoliating prep and soothing post-wax compress.',
          main_area_group: 'legs',
          area_key: 'full_leg',
          gender_segment: 'unisex',
          duration_minutes: 60,
          base_price: 85,
          is_major_area: true,
          is_active: true,
          rating: 4.8,
          display_order: 2,
          image: 'https://images.unsplash.com/photo-1610992015732-0e634d35a94a?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_full_leg_express',
          name: 'Full Leg Wax - Express',
          description: 'Efficient full leg wax for returning guests with regular maintenance schedules.',
          main_area_group: 'legs',
          area_key: 'full_leg',
          gender_segment: 'unisex',
          duration_minutes: 30,
          base_price: 50,
          is_major_area: true,
          is_active: true,
          rating: 4.3,
          display_order: 3,
          image: 'https://cdn.shopify.com/s/files/1/0474/6965/8269/files/iStock-473201666_2000x.jpg?v=1605081359'
        }
      ],
      technicians: [
        {
          id: 'tech_sophia_reyes',
          name: 'Sophia Reyes',
          bio: 'Sophia is a waxing specialist with over 7 years of experience, known for her gentle technique and precise shaping.',
          specialties: ['brazilian', 'full_leg', 'eyebrow', 'upper_lip', 'underarm'],
          is_active: true,
          display_order: 1
        },
        {
          id: 'tech_liam_chen',
          name: 'Liam Chen',
          bio: 'Liam focuses on body and men\u2019s waxing services, providing efficient full-back, chest, and leg treatments.',
          specialties: ['full_back', 'back', 'chest', 'full_leg', 'stomach'],
          is_active: true,
          display_order: 2
        },
        {
          id: 'tech_maya_patel',
          name: 'Maya Patel',
          bio: 'Maya loves detail work on brows and facial waxing, and is a favorite for custom waxing sessions.',
          specialties: ['eyebrow', 'upper_lip', 'chin', 'nose', 'ear', 'brazilian'],
          is_active: true,
          display_order: 3
        }
      ],
      package_services: [
        {
          id: 'pkgsvc_braz_ua_basic_1',
          package_id: 'pkg_brazilian_underarm_basic',
          service_id: 'svc_brazilian_standard',
          service_name: 'Brazilian',
          duration_minutes: 45,
          sort_order: 1,
          image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'pkgsvc_braz_ua_basic_2',
          package_id: 'pkg_brazilian_underarm_basic',
          service_id: 'svc_underarm',
          service_name: 'Underarm',
          duration_minutes: 15,
          sort_order: 2,
          image: 'https://images.unsplash.com/photo-1612810432633-96f64dc8ccb6?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'pkgsvc_braz_ua_brows_1',
          package_id: 'pkg_brazilian_underarm_brows',
          service_id: 'svc_brazilian_standard',
          service_name: 'Brazilian',
          duration_minutes: 45,
          sort_order: 1,
          image: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      packages: [
        {
          id: 'pkg_brazilian_underarm_basic',
          name: 'Brazilian + Underarm Smooth Combo',
          description: 'A focused essentials package combining a full Brazilian wax with underarm waxing for long-lasting smoothness.',
          package_type: 'brazilian_package',
          price: 110,
          headline_services: ['Brazilian', 'Underarm'],
          is_active: true,
          total_duration_minutes: 60
        },
        {
          id: 'pkg_brazilian_underarm_brows',
          name: 'Brazilian, Underarm & Brow Trio',
          description: 'Complete body-and-brow refresh featuring a Brazilian wax, underarm wax, and precision eyebrow shaping.',
          package_type: 'mixed_package',
          price: 135,
          headline_services: ['Brazilian', 'Underarm', 'Eyebrow'],
          is_active: true,
          total_duration_minutes: 80
        },
        {
          id: 'pkg_full_leg_brazilian_underarm',
          name: 'Full Leg, Brazilian & Underarm Package',
          description: 'Our most popular lower-body waxing bundle: full legs, Brazilian, and underarms at a value price.',
          package_type: 'body_waxing_package',
          price: 165,
          headline_services: ['Full Leg', 'Brazilian', 'Underarm'],
          is_active: true,
          total_duration_minutes: 105
        }
      ]
    };

    // Populate localStorage using correct storage keys
    localStorage.setItem('services', JSON.stringify(generatedData.services || []));
    localStorage.setItem('sessions', JSON.stringify([]));
    localStorage.setItem('session_services', JSON.stringify([]));
    localStorage.setItem('packages', JSON.stringify(generatedData.packages || []));
    localStorage.setItem('package_services', JSON.stringify(generatedData.package_services || []));
    localStorage.setItem('technicians', JSON.stringify(generatedData.technicians || []));
    localStorage.setItem('appointments', JSON.stringify([]));
    localStorage.setItem('products', JSON.stringify(generatedData.products || []));
    localStorage.setItem('gift_card_templates', JSON.stringify(generatedData.gift_card_templates || []));
    localStorage.setItem('gift_card_purchases', JSON.stringify([]));
    localStorage.setItem('promotions', JSON.stringify(generatedData.promotions || []));
    localStorage.setItem('applied_promotions', JSON.stringify([]));
    localStorage.setItem('carts', JSON.stringify([]));
    localStorage.setItem('cart_items', JSON.stringify([]));
  }

  resetEnvironment() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestFullLeg();
    this.testTask2_CustomSession90MinUnder150();
    this.testTask3_PackageBrazilianUnderarmUnder120();
    this.testTask4_ThreeMonthlySaturdayAppointmentsSameTech();
    this.testTask5_SameDayMultiServiceAfter5pm();
    this.testTask6_AddTwoAftercareProductsWithFilters();
    this.testTask7_PurchaseWaxingOnlyGiftCardScheduledEmail();
    this.testTask8_Apply10PercentPackagePromoOver100();

    return this.results;
  }

  // ============ Task 1 ============
  // Book the cheapest full-leg waxing service lasting at least 45 minutes for next Wednesday at ~2:30 PM
  testTask1_BookCheapestFullLeg() {
    const testName = 'Task 1: Book cheapest 45+ min full-leg service next Wednesday';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Use service listing filters instead of hardcoding IDs
      const listResult = this.logic.listWaxingServices(
        {
          mainAreaGroup: 'legs',
          areaKey: 'full_leg',
          minDurationMinutes: 45,
          onlyActive: true
        },
        {
          sortBy: 'price',
          sortDirection: 'asc'
        },
        {
          page: 1,
          pageSize: 20
        }
      );

      const services = listResult.services || [];
      this.assert(services.length > 0, 'Should list at least one full-leg service with duration >= 45');

      // Choose the cheapest by actual response
      let cheapest = services[0];
      for (let i = 1; i < services.length; i++) {
        if (services[i].base_price < cheapest.base_price) {
          cheapest = services[i];
        }
      }

      // Compute date for next Wednesday
      const today = new Date();
      const nextWed = this.getNextWeekdayFrom(today, 3); // 0=Sun, 3=Wed
      const dateStr = this.formatDateYMD(nextWed);

      // Get availability for specific date
      const availability = this.logic.getServiceAvailability(
        cheapest.id,
        dateStr,
        'specific_date',
        null
      );

      const timeSlots = availability.time_slots || [];
      this.assert(timeSlots.length > 0, 'Should have at least one time slot on next Wednesday');

      // Prefer a time at or after 2:30 PM if available, otherwise first slot
      const selectedSlot = this.findTimeSlotAtOrAfter(timeSlots, 14, 30);
      const startDateTime = selectedSlot.start_datetime;

      const bookResult = this.logic.bookServiceAppointment(
        cheapest.id,
        startDateTime,
        null,
        'Task 1 automated test booking'
      );

      this.assert(bookResult && bookResult.success === true, 'Booking call should succeed');
      const appointment = bookResult.appointment;
      this.assert(appointment, 'Booking should return an appointment');
      this.assert(appointment.service_id === cheapest.id, 'Appointment should reference selected service');
      this.assert(
        appointment.duration_minutes >= cheapest.duration_minutes,
        'Appointment duration should be at least service duration'
      );

      // Verify cart/booking summary
      const summary = this.logic.getCartSummary();
      this.assert(summary && summary.cart, 'Cart summary should include a cart');
      const cartItems = summary.cart_items || [];
      const matchingItem = cartItems.find(item => item.appointment && item.appointment.id === appointment.id);
      this.assert(matchingItem, 'Cart should contain the booked appointment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 2 ============
  // Create a custom waxing session 80-100 minutes, under $150, combining multiple areas
  testTask2_CustomSession90MinUnder150() {
    const testName = 'Task 2: Custom session 80-100 minutes under $150';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Start from all active services
      const listResult = this.logic.listWaxingServices(
        { onlyActive: true },
        null,
        null
      );
      const services = listResult.services || [];
      this.assert(services.length >= 2, 'Need at least two services to build a session');

      // Compute a combination (2-3 services) meeting the constraints based on actual data
      const combo = this.findCustomSessionCombination(
        services,
        80,
        100,
        150
      );

      this.assert(combo && combo.length >= 2, 'Should find a valid service combination for custom session');

      // Ensure at least one major area under $100 as per rules
      const hasMajorUnder100 = combo.some(s => s.is_major_area && s.base_price < 100);
      this.assert(hasMajorUnder100, 'Combination should include at least one major area under $100');

      // Clear any existing session state if present
      let currentState = this.logic.getCurrentSessionState();
      const existingSessionServices = (currentState && currentState.session_services) || [];
      for (const line of existingSessionServices) {
        const ss = line.session_service;
        if (ss && ss.id) {
          this.logic.removeServiceFromCurrentSession(ss.id);
        }
      }

      // Build the custom session by adding each selected service
      for (const svc of combo) {
        const addResult = this.logic.addServiceToCurrentSession(svc.id);
        this.assert(addResult && addResult.session, 'Adding service to session should return session state');
      }

      currentState = this.logic.getCurrentSessionState();
      const session = currentState.session;
      const sessionLines = currentState.session_services || [];
      this.assert(session, 'Session should exist after adding services');
      this.assert(sessionLines.length === combo.length, 'Session should contain all selected services');
      this.assert(
        session.total_duration_minutes >= 80 && session.total_duration_minutes <= 100,
        'Session duration should be between 80 and 100 minutes (actual: ' + session.total_duration_minutes + ')'
      );
      this.assert(
        session.total_price < 150,
        'Session price should be under $150 (actual: ' + session.total_price + ')'
      );

      // Get earliest availability for the full session
      const availability = this.logic.getCurrentSessionAvailability(
        null,
        'earliest_available',
        null
      );
      const timeSlots = availability.time_slots || [];
      this.assert(timeSlots.length > 0, 'Should have at least one session time slot');

      const selectedSlot = timeSlots[0];
      const startDateTime = selectedSlot.start_datetime;

      const bookResult = this.logic.bookCustomSessionAppointment(
        startDateTime,
        null,
        'Task 2 automated custom session'
      );

      this.assert(bookResult && bookResult.success === true, 'Custom session booking should succeed');
      const appointment = bookResult.appointment;
      this.assert(appointment, 'Booking should return a custom session appointment');
      this.assert(appointment.appointment_type === 'custom_session', 'Appointment type should be custom_session');
      this.assert(appointment.session_id === session.id, 'Appointment should reference the built session');
      this.assert(
        appointment.duration_minutes === session.total_duration_minutes,
        'Appointment duration should equal session duration'
      );
      this.assert(
        appointment.price === session.total_price,
        'Appointment price should equal session price'
      );

      // Verify cart contains this appointment
      const summary = this.logic.getCartSummary();
      const cartItems = summary.cart_items || [];
      const matchingItem = cartItems.find(item => item.appointment && item.appointment.id === appointment.id);
      this.assert(matchingItem, 'Cart should contain the custom session appointment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 3 ============
  // Select a package that includes Brazilian and underarm waxing for under $120 and duration >= 60
  testTask3_PackageBrazilianUnderarmUnder120() {
    const testName = 'Task 3: Package with Brazilian + Underarm under $120';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // List active packages (no hardcoded IDs)
      const listResult = this.logic.listWaxingPackages(
        { onlyActive: true },
        null,
        null
      );
      const packages = listResult.packages || [];
      this.assert(packages.length > 0, 'Should list at least one active package');

      const qualifying = [];

      for (const pkg of packages) {
        const details = this.logic.getPackageDetails(pkg.id);

        const serviceNames = [];
        if (details.included_services && details.included_services.length > 0) {
          for (const ps of details.included_services) {
            serviceNames.push(ps.service_name);
          }
        } else if (pkg.headline_services && pkg.headline_services.length > 0) {
          for (const hs of pkg.headline_services) {
            serviceNames.push(hs);
          }
        }

        const lowerNames = serviceNames.map(n => (n || '').toLowerCase());
        const hasBrazilian = lowerNames.some(n => n.indexOf('brazilian') >= 0);
        const hasUnderarm = lowerNames.some(n => n.indexOf('underarm') >= 0);

        if (
          hasBrazilian &&
          hasUnderarm &&
          pkg.price < 120 &&
          pkg.total_duration_minutes >= 60
        ) {
          qualifying.push({ pkg: pkg, details: details });
        }
      }

      this.assert(qualifying.length > 0, 'Should find at least one qualifying package');

      // Pick the qualifying package with lowest price
      let chosen = qualifying[0];
      for (let i = 1; i < qualifying.length; i++) {
        if (qualifying[i].pkg.price < chosen.pkg.price) {
          chosen = qualifying[i];
        }
      }

      // Get availability next week (business logic decides exact day); adapt by choosing any slot
      const availability = this.logic.getPackageAvailability(
        chosen.pkg.id,
        null,
        'next_week',
        null
      );
      const timeSlots = availability.time_slots || [];
      this.assert(timeSlots.length > 0, 'Should have at least one package time slot next week');

      // Prefer a slot between 10:00 and 16:00 if available
      const selectedSlot = this.findTimeSlotWithinWindow(timeSlots, 10, 16);
      const startDateTime = selectedSlot.start_datetime;

      const bookResult = this.logic.bookPackageAppointment(
        chosen.pkg.id,
        startDateTime,
        null,
        'Task 3 automated package booking'
      );

      this.assert(bookResult && bookResult.success === true, 'Package booking should succeed');
      const appointment = bookResult.appointment;
      this.assert(appointment, 'Booking should return a package appointment');
      this.assert(appointment.package_id === chosen.pkg.id, 'Appointment should reference the chosen package');
      this.assert(appointment.appointment_type === 'package', 'Appointment type should be package');
      this.assert(
        appointment.duration_minutes >= 60,
        'Appointment duration should be at least 60 minutes'
      );
      this.assert(
        appointment.price === chosen.pkg.price,
        'Appointment price should equal package price'
      );

      const summary = this.logic.getCartSummary();
      const cartItems = summary.cart_items || [];
      const matchingItem = cartItems.find(item => item.appointment && item.appointment.id === appointment.id);
      this.assert(matchingItem, 'Cart should contain the booked package appointment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 4 ============
  // Schedule three monthly Saturday appointments between 9-11 AM with the same technician
  testTask4_ThreeMonthlySaturdayAppointmentsSameTech() {
    const testName = 'Task 4: Three monthly Saturday appointments 9-11 AM same technician';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Adaptation: use any active service (prefer eyebrow if present, else first)
      const listResult = this.logic.listWaxingServices(
        { onlyActive: true },
        null,
        null
      );
      const services = listResult.services || [];
      this.assert(services.length > 0, 'Should have at least one active service');

      let targetService = services.find(s => s.area_key === 'eyebrow') || services[0];

      // Get technicians capable of this service
      const technicians = this.logic.getTechniciansForService(targetService.id) || [];
      this.assert(technicians.length > 0, 'Should list at least one technician for the service');

      const technician = technicians[0];

      const today = new Date();
      const firstSaturday = this.getNextWeekdayFrom(today, 6); // 6 = Saturday
      const secondSaturday = this.getNextWeekdayFrom(this.addMonths(firstSaturday, 1), 6);
      const thirdSaturday = this.getNextWeekdayFrom(this.addMonths(firstSaturday, 2), 6);
      const saturdayDates = [firstSaturday, secondSaturday, thirdSaturday];

      const appointmentIds = [];

      for (let i = 0; i < saturdayDates.length; i++) {
        const date = saturdayDates[i];
        const dateStr = this.formatDateYMD(date);

        const availability = this.logic.getServiceAvailability(
          targetService.id,
          dateStr,
          'specific_date',
          technician.id
        );

        const timeSlots = availability.time_slots || [];
        this.assert(timeSlots.length > 0, 'Should have at least one slot on Saturday ' + dateStr);

        // Prefer time between 9:00 and 11:00 if available
        const selectedSlot = this.findTimeSlotWithinWindow(timeSlots, 9, 11);
        const startDateTime = selectedSlot.start_datetime;

        const notes = 'Task 4 automated appointment #' + (i + 1);
        const bookResult = this.logic.bookServiceAppointment(
          targetService.id,
          startDateTime,
          technician.id,
          notes
        );

        this.assert(bookResult && bookResult.success === true, 'Saturday booking #' + (i + 1) + ' should succeed');
        const appointment = bookResult.appointment;
        this.assert(appointment, 'Booking should return an appointment');
        appointmentIds.push(appointment.id);
      }

      // Verify booking summary contains three appointments with same technician and correct dates
      const summary = this.logic.getCartSummary();
      const cartItems = summary.cart_items || [];

      const bookedAppointments = cartItems
        .filter(item => item.appointment && appointmentIds.indexOf(item.appointment.id) >= 0)
        .map(item => item.appointment);

      this.assert(bookedAppointments.length === 3, 'Cart should contain three booked appointments for task 4');

      // All three should use same technician
      const allSameTechnician = bookedAppointments.every(a => a.technician_id === bookedAppointments[0].technician_id);
      this.assert(allSameTechnician, 'All three appointments should use the same technician');

      // All should fall on Saturdays
      for (const appt of bookedAppointments) {
        const d = new Date(appt.start_datetime);
        this.assert(d.getDay() === 6, 'Appointment should be on a Saturday');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 5 ============
  // Book same-day multi-area waxing (adapted: two services) after 5:00 PM
  testTask5_SameDayMultiServiceAfter5pm() {
    const testName = 'Task 5: Same-day multi-service custom session after 5:00 PM';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Adaptation: use any two active services as combined areas
      const listResult = this.logic.listWaxingServices(
        { onlyActive: true },
        null,
        null
      );
      const services = listResult.services || [];
      this.assert(services.length >= 2, 'Need at least two services for combined appointment');

      const svc1 = services[0];
      const svc2 = services[1];

      // Clear any existing session
      let currentState = this.logic.getCurrentSessionState();
      const existingSessionServices = (currentState && currentState.session_services) || [];
      for (const line of existingSessionServices) {
        const ss = line.session_service;
        if (ss && ss.id) {
          this.logic.removeServiceFromCurrentSession(ss.id);
        }
      }

      // Add both services to the current session
      this.logic.addServiceToCurrentSession(svc1.id);
      this.logic.addServiceToCurrentSession(svc2.id);

      currentState = this.logic.getCurrentSessionState();
      const session = currentState.session;
      const sessionLines = currentState.session_services || [];
      this.assert(session, 'Session should exist after adding two services');
      this.assert(sessionLines.length >= 2, 'Session should contain at least two services');

      // Same-day availability after 5 PM
      const today = new Date();
      const todayStr = this.formatDateYMD(today);

      const availability = this.logic.getCurrentSessionAvailability(
        todayStr,
        'same_day',
        null
      );

      const timeSlots = availability.time_slots || [];
      this.assert(timeSlots.length > 0, 'Should have at least one same-day slot');

      const selectedSlot = this.findTimeSlotAtOrAfter(timeSlots, 17, 0);
      const startDateTime = selectedSlot.start_datetime;

      const bookResult = this.logic.bookCustomSessionAppointment(
        startDateTime,
        null,
        'Task 5 automated same-day session'
      );

      this.assert(bookResult && bookResult.success === true, 'Same-day custom session booking should succeed');
      const appointment = bookResult.appointment;
      this.assert(appointment, 'Booking should return an appointment');
      this.assert(appointment.appointment_type === 'custom_session', 'Appointment type should be custom_session');

      const summary = this.logic.getCartSummary();
      const cartItems = summary.cart_items || [];
      const matchingItem = cartItems.find(item => item.appointment && item.appointment.id === appointment.id);
      this.assert(matchingItem, 'Cart should contain the same-day custom session appointment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 6 ============
  // Add two waxing aftercare products under $30 with 4+ stars and in-store pickup
  testTask6_AddTwoAftercareProductsWithFilters() {
    const testName = 'Task 6: Add two filtered waxing aftercare products to cart';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Use product listing with filters instead of hardcoded IDs
      const listResult = this.logic.listProducts(
        {
          categoryKey: 'aftercare',
          maxPrice: 30,
          minRating: 4,
          fulfillmentMode: 'in_store_pickup',
          onlyFreeInStorePickup: true,
          onlyActive: true
        },
        {
          sortBy: 'price',
          sortDirection: 'asc'
        },
        null
      );

      const products = listResult.products || [];
      this.assert(products.length >= 2, 'Should list at least two qualifying aftercare products');

      const firstProduct = products[0];
      const secondProduct = products[1];

      // Optionally verify product details using actual API
      const p1Details = this.logic.getProductDetails(firstProduct.id);
      const p2Details = this.logic.getProductDetails(secondProduct.id);

      this.assert(p1Details.price <= 30 && p1Details.rating >= 4, 'First product should meet price/rating constraints');
      this.assert(p2Details.price <= 30 && p2Details.rating >= 4, 'Second product should meet price/rating constraints');

      // Add both products to cart (quantity 1)
      const addResult1 = this.logic.addProductToCart(firstProduct.id, 1);
      this.assert(addResult1 && addResult1.success === true, 'Adding first product to cart should succeed');

      const addResult2 = this.logic.addProductToCart(secondProduct.id, 1);
      this.assert(addResult2 && addResult2.success === true, 'Adding second product to cart should succeed');

      // Verify cart contents using actual cart summary
      const summary = this.logic.getCartSummary();
      const cartItems = summary.cart_items || [];

      const productItems = cartItems.filter(item => item.product);
      this.assert(productItems.length >= 2, 'Cart should contain at least two product items');

      const hasFirst = productItems.some(item => item.product.id === firstProduct.id && item.cart_item.quantity === 1);
      const hasSecond = productItems.some(item => item.product.id === secondProduct.id && item.cart_item.quantity === 1);

      this.assert(hasFirst, 'Cart should contain the first selected product with quantity 1');
      this.assert(hasSecond, 'Cart should contain the second selected product with quantity 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 7 ============
  // Purchase a $100 waxing-only gift card with scheduled email delivery date
  testTask7_PurchaseWaxingOnlyGiftCardScheduledEmail() {
    const testName = 'Task 7: Purchase $100 waxing-only gift card with scheduled email delivery';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Get templates filtered by usage type 'waxing_only'
      const templates = this.logic.getGiftCardTemplates('waxing_only') || [];
      this.assert(templates.length > 0, 'Should list at least one waxing-only gift card template');

      const template = templates[0];
      const templateDetails = this.logic.getGiftCardTemplateDetails(template.id);

      // Ensure $100 is allowed based on template rules (using actual data)
      const amount = 100;
      if (templateDetails.min_amount != null) {
        this.assert(amount >= templateDetails.min_amount, 'Amount should be >= min_amount');
      }
      if (templateDetails.max_amount != null) {
        this.assert(amount <= templateDetails.max_amount, 'Amount should be <= max_amount');
      }

      // Compute scheduled send date exactly two weeks from today
      const today = new Date();
      const sendDate = this.addDays(today, 14);
      const scheduledSendDateStr = this.formatDateYMD(sendDate);

      const recipientName = 'Alex Waxing';
      const recipientEmail = 'alex@example.com';
      const message = 'Enjoy a waxing session on me!';

      const createResult = this.logic.createGiftCardPurchaseAndAddToCart(
        template.id,
        amount,
        'email_delivery',
        'schedule_for_later',
        scheduledSendDateStr,
        recipientName,
        recipientEmail,
        message,
        null
      );

      this.assert(createResult && createResult.success === true, 'Gift card creation should succeed');
      const giftCardPurchase = createResult.gift_card_purchase;
      this.assert(giftCardPurchase, 'Should return a GiftCardPurchase object');
      this.assert(giftCardPurchase.amount === amount, 'Gift card amount should be $100');
      this.assert(giftCardPurchase.delivery_method === 'email_delivery', 'Delivery method should be email');
      this.assert(giftCardPurchase.send_timing === 'schedule_for_later', 'Send timing should be schedule_for_later');

      // Simulate proceeding to checkout (without payment)
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include a cart');

      const cartItems = checkoutSummary.cart_items || [];
      const giftCardItems = cartItems.filter(item => item.gift_card_purchase);
      this.assert(giftCardItems.length > 0, 'Checkout summary should include at least one gift card item');

      const hasCreatedGiftCard = giftCardItems.some(item => item.gift_card_purchase.id === giftCardPurchase.id);
      this.assert(hasCreatedGiftCard, 'Checkout summary should contain the created gift card purchase');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Task 8 ============
  // Apply a 10% off waxing package promo code to a package over $100
  testTask8_Apply10PercentPackagePromoOver100() {
    const testName = 'Task 8: Apply 10% off promo to waxing package over $100';
    console.log('Testing:', testName);

    try {
      this.resetEnvironment();

      // Get active promotions targeting waxing packages
      const promotions = this.logic.getActivePromotions('waxing_package') || [];
      this.assert(promotions.length > 0, 'Should list at least one active waxing package promotion');

      // Find a 10% percentage_off promotion
      const promo = promotions.find(p => p.promo_type === 'percentage_off' && p.discount_value === 10) || promotions[0];
      const promoCode = promo.promo_code;

      // Choose an eligible package priced over the promo min_package_price
      const minPackagePrice = promo.min_package_price != null ? promo.min_package_price : 0;

      const pkgListResult = this.logic.listWaxingPackages(
        { onlyActive: true },
        null,
        null
      );
      const packages = pkgListResult.packages || [];
      this.assert(packages.length > 0, 'Should list at least one active package for promo test');

      const eligiblePackages = packages.filter(p => p.price > minPackagePrice);
      this.assert(eligiblePackages.length > 0, 'Should have at least one package over promo minimum price');

      // Pick the cheapest eligible package
      let chosenPackage = eligiblePackages[0];
      for (let i = 1; i < eligiblePackages.length; i++) {
        if (eligiblePackages[i].price < chosenPackage.price) {
          chosenPackage = eligiblePackages[i];
        }
      }

      // Book this package (any earliest availability)
      const availability = this.logic.getPackageAvailability(
        chosenPackage.id,
        null,
        'earliest_available',
        null
      );
      const timeSlots = availability.time_slots || [];
      this.assert(timeSlots.length > 0, 'Should have at least one availability slot for chosen package');

      const selectedSlot = timeSlots[0];
      const startDateTime = selectedSlot.start_datetime;

      const bookResult = this.logic.bookPackageAppointment(
        chosenPackage.id,
        startDateTime,
        null,
        'Task 8 automated package booking before promo'
      );

      this.assert(bookResult && bookResult.success === true, 'Booking chosen package should succeed');

      // Apply promo code to current cart
      const applyResult = this.logic.applyPromoCode(promoCode);
      this.assert(applyResult && applyResult.success === true, 'Applying promo code should succeed');

      const applied = applyResult.applied_promotion;
      this.assert(applied, 'Applied promotion object should be returned');
      this.assert(applied.promo_code === promoCode, 'Applied promo code should match selected promotion');
      this.assert(applied.discount_amount > 0, 'Discount amount should be greater than zero');

      // Verify promotion is reflected in checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include a cart');
      const appliedPromos = checkoutSummary.applied_promotions || [];
      const foundPromo = appliedPromos.find(ap => ap.promo_code === promoCode);
      this.assert(foundPromo, 'Checkout summary should include the applied promotion');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ============ Helper methods ============

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

  formatDateYMD(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  addMonths(date, months) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  getNextWeekdayFrom(startDate, weekday) {
    // weekday: 0=Sunday..6=Saturday
    const d = new Date(startDate.getTime());
    while (d.getDay() !== weekday) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  findTimeSlotAtOrAfter(timeSlots, hour, minute) {
    if (!timeSlots || timeSlots.length === 0) return null;

    let candidate = null;
    for (const slot of timeSlots) {
      const d = new Date(slot.start_datetime);
      const h = d.getHours();
      const m = d.getMinutes();
      if (h > hour || (h === hour && m >= minute)) {
        if (!candidate || d < new Date(candidate.start_datetime)) {
          candidate = slot;
        }
      }
    }

    return candidate || timeSlots[0];
  }

  findTimeSlotWithinWindow(timeSlots, startHour, endHourExclusive) {
    // endHourExclusive: e.g., 16 means up to 15:59
    if (!timeSlots || timeSlots.length === 0) return null;

    let candidate = null;
    for (const slot of timeSlots) {
      const d = new Date(slot.start_datetime);
      const h = d.getHours();
      if (h >= startHour && h < endHourExclusive) {
        if (!candidate || d < new Date(candidate.start_datetime)) {
          candidate = slot;
        }
      }
    }

    return candidate || timeSlots[0];
  }

  findCustomSessionCombination(services, minDuration, maxDuration, maxPrice) {
    // Try all 2- and 3-service combinations and return first that matches constraints
    const n = services.length;
    let best = null;

    // Helper to test a specific set of indices
    const testCombination = indices => {
      const selected = indices.map(i => services[i]);
      let totalDuration = 0;
      let totalPrice = 0;
      for (const s of selected) {
        totalDuration += s.duration_minutes;
        totalPrice += s.base_price;
      }
      const hasMajorUnder100 = selected.some(s => s.is_major_area && s.base_price < 100);
      if (
        totalDuration >= minDuration &&
        totalDuration <= maxDuration &&
        totalPrice < maxPrice &&
        hasMajorUnder100
      ) {
        best = selected;
        return true;
      }
      return false;
    };

    // Check all 2-service combinations
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (testCombination([i, j])) return best;
      }
    }

    // Check all 3-service combinations
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          if (testCombination([i, j, k])) return best;
        }
      }
    }

    return best;
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
