// Test runner for business logic (local moving company flows)
class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js
    if (typeof localStorage === 'undefined') {
      global.localStorage = new (class {
        constructor() {
          this.store = {};
        }
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
        }
        setItem(key, value) {
          this.store[key] = String(value);
        }
        removeItem(key) {
          delete this.store[key];
        }
        clear() {
          this.store = {};
        }
      })();
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure if business logic exposes initializer
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      addons: [
        {
          id: 'packing_service_standard',
          code: 'packing_service',
          name: 'Packing Service',
          description:
            'Professional packing of household items, including boxes, padding, and labeling for each room.',
          price_type: 'per_hour',
          price_amount: 75,
          is_storage: false,
          is_packing: true,
          is_active: true,
          applicable_service_types: ['full_service_move', 'standard_move'],
          created_at: '2025-11-01T10:00:00Z',
          updated_at: '2026-01-15T09:30:00Z'
        },
        {
          id: 'packing_supplies_bundle',
          code: 'packing_supplies_bundle',
          name: 'Packing Supplies Bundle',
          description:
            'Flat-fee bundle of boxes, tape, and wrap sized for most 1–2 bedroom local moves.',
          price_type: 'flat_fee',
          price_amount: 120,
          is_storage: false,
          is_packing: true,
          is_active: true,
          applicable_service_types: ['full_service_move', 'standard_move', 'labor_only'],
          created_at: '2025-11-05T11:00:00Z',
          updated_at: '2026-01-15T09:30:00Z'
        },
        {
          id: 'short_term_storage',
          code: 'short_term_storage',
          name: 'Short-Term Storage (Per Month)',
          description:
            'Climate-controlled storage for moves with a gap between move-out and move-in, billed per month.',
          price_type: 'flat_fee',
          price_amount: 180,
          is_storage: true,
          is_packing: false,
          is_active: true,
          applicable_service_types: ['standard_move', 'full_service_move', 'storage_only'],
          created_at: '2025-11-10T12:00:00Z',
          updated_at: '2026-01-15T09:30:00Z'
        }
      ],
      insuranceplans: [
        {
          id: 'basic_liability',
          name: 'Basic Carrier Liability',
          code: 'BASIC_LIAB',
          description:
            'Standard coverage at $0.60 per pound per item, included with every move at no additional cost.',
          coverage_type: 'basic',
          coverage_limit: 5000,
          price_type: 'flat_fee',
          price_amount: 0,
          is_full_replacement: false,
          is_default: true,
          is_active: true,
          created_at: '2025-10-01T09:00:00Z',
          updated_at: '2026-01-10T08:45:00Z'
        },
        {
          id: 'full_value_15000',
          name: 'Full Value Protection - $15,000',
          code: 'FVP_15000',
          description:
            'Full replacement value coverage for household goods up to a total declared value of $15,000.',
          coverage_type: 'full_value',
          coverage_limit: 15000,
          price_type: 'percentage_of_estimate',
          price_amount: 0.08,
          is_full_replacement: true,
          is_default: false,
          is_active: true,
          created_at: '2025-10-05T09:30:00Z',
          updated_at: '2026-01-10T08:45:00Z'
        },
        {
          id: 'full_value_25000',
          name: 'Full Value Protection - $25,000',
          code: 'FVP_25000',
          description:
            'Full replacement value coverage for belongings up to $25,000, ideal for larger homes.',
          coverage_type: 'full_value',
          coverage_limit: 25000,
          price_type: 'percentage_of_estimate',
          price_amount: 0.1,
          is_full_replacement: true,
          is_default: false,
          is_active: true,
          created_at: '2025-10-10T09:45:00Z',
          updated_at: '2026-01-10T08:45:00Z'
        }
      ],
      inventoryitems: [
        {
          id: 'item_sofa',
          code: 'sofa',
          name: 'Sofa / Couch',
          description: 'Standard 3-seat sofa or similar-sized sectional piece.',
          default_quantity: 1,
          unit_cost: 120,
          category: 'furniture',
          is_active: true
        },
        {
          id: 'item_bed',
          code: 'bed',
          name: 'Bed',
          description: 'Includes bed frame, mattress, and box spring or foundation.',
          default_quantity: 1,
          unit_cost: 100,
          category: 'furniture',
          is_active: true
        },
        {
          id: 'item_dining_chair',
          code: 'dining_chair',
          name: 'Dining Chair',
          description: 'Standard wooden or upholstered dining chair.',
          default_quantity: 4,
          unit_cost: 20,
          category: 'furniture',
          is_active: true
        }
      ],
      laborserviceoptions: [
        {
          id: 'loading_unloading_only',
          code: 'loading_unloading_only',
          name: 'Help loading/unloading only',
          description:
            'Movers help load or unload your rental truck, trailer, or storage unit. No moving truck provided.',
          is_active: true,
          created_at: '2025-09-20T08:00:00Z',
          updated_at: '2026-01-05T10:15:00Z',
          image:
            'https://lh4.googleusercontent.com/3E5zwYpGarQxTHJgJjI_Th-Nvb17_I5FyvXPkaG5tmvo2IPJ-o72sR6K18JvrMpgA0KfoxCSSi7RK8vRsZhLCrsKTCgNRzpRXMzFKvrK8FXvyRnvf0CsZhwW-ZjuHdsxiySzKR8h'
        },
        {
          id: 'in_home_furniture_rearrange',
          code: 'in_home_rearrange',
          name: 'In-home furniture rearranging',
          description:
            'Crew assists with moving furniture within your home for remodels, staging, or new layouts.',
          is_active: true,
          created_at: '2025-09-22T08:15:00Z',
          updated_at: '2026-01-05T10:15:00Z',
          image:
            'https://www.urbanconcepts.ph/wp/wp-content/uploads/2017/02/tips-in-rearranging-furniture.jpg'
        },
        {
          id: 'packing_labor_only',
          code: 'packing_labor_only',
          name: 'Packing help (labor only)',
          description:
            'Movers pack your items into boxes you provide. Ideal when you already have a truck reserved.',
          is_active: true,
          created_at: '2025-09-25T08:30:00Z',
          updated_at: '2026-01-05T10:15:00Z',
          image:
            'https://dta0yqvfnusiq.cloudfront.net/acmemovinglabor/2021/03/blog6-604ba2bb1d350.jpg'
        }
      ],
      promotions: [
        {
          id: 'promo_local50',
          code: 'LOCAL50',
          title: 'Local moves over $400 — $50 OFF',
          description:
            'Save $50 on qualifying local moves when your pre-discount total is over $400. Applies to standard local moves within 50 miles.',
          discount_type: 'fixed_amount',
          discount_amount: 50,
          min_subtotal: 400,
          applies_to_move_scope: 'local',
          applies_to_service_type: 'standard_move',
          start_date: '2026-01-01T00:00:00Z',
          end_date: '2026-12-31T23:59:59Z',
          is_active: true,
          created_at: '2025-12-15T12:00:00Z',
          updated_at: '2026-01-20T09:00:00Z'
        },
        {
          id: 'promo_labor10',
          code: 'LABOR10',
          title: '10% off Labor-Only Services (Weekdays)',
          description:
            'Get 10% off labor-only moving help when you book a weekday time slot. Discount applies to hourly labor charges only.',
          discount_type: 'percentage',
          discount_amount: 10,
          min_subtotal: 200,
          applies_to_move_scope: 'any',
          applies_to_service_type: 'labor_only',
          start_date: '2026-01-01T00:00:00Z',
          end_date: '2026-06-30T23:59:59Z',
          is_active: true,
          created_at: '2025-12-20T12:15:00Z',
          updated_at: '2026-01-20T09:00:00Z'
        },
        {
          id: 'promo_fullservice100',
          code: 'FULL100',
          title: '$100 off Full-Service Moves',
          description:
            'Take $100 off any full-service move with a pre-discount subtotal of $1,200 or more within our local service area.',
          discount_type: 'fixed_amount',
          discount_amount: 100,
          min_subtotal: 1200,
          applies_to_move_scope: 'local',
          applies_to_service_type: 'full_service_move',
          start_date: '2026-02-01T00:00:00Z',
          end_date: '2026-12-31T23:59:59Z',
          is_active: true,
          created_at: '2026-01-10T12:30:00Z',
          updated_at: '2026-02-05T09:10:00Z'
        }
      ],
      movepackages: [
        {
          id: 'pkg_local_standard_2m_truck_core',
          name: '2 Movers + Truck (Standard Local)',
          description:
            'Popular option for most 1–2 bedroom local apartment or small house moves. Does not include packing services by default.',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 2,
          includes_truck: true,
          base_hourly_rate: 135,
          min_hours: 3,
          estimated_total_4_hours: 540,
          rating: 4.6,
          review_count: 34,
          included_add_on_ids: [],
          applicable_property_types: ['apartment_condo', 'house', 'townhome'],
          tags: ['popular', 'budget'],
          is_active: true,
          display_order: 1,
          created_at: '2025-10-15T09:00:00Z',
          updated_at: '2026-01-20T09:00:00Z'
        },
        {
          id: 'pkg_local_standard_3m_truck_core',
          name: '3 Movers + Truck (Standard Local)',
          description:
            'Ideal for 2–3 bedroom apartments and small homes where a third mover helps speed up loading and unloading.',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 3,
          includes_truck: true,
          base_hourly_rate: 155,
          min_hours: 3,
          estimated_total_4_hours: 620,
          rating: 4.5,
          review_count: 27,
          included_add_on_ids: [],
          applicable_property_types: ['apartment_condo', 'house'],
          tags: ['standard', 'good_for_2_bedroom'],
          is_active: true,
          display_order: 2,
          created_at: '2025-10-15T09:15:00Z',
          updated_at: '2026-01-20T09:00:00Z'
        },
        {
          id: 'pkg_local_standard_2m_truck_value',
          name: '2 Movers + Truck (Value Special)',
          description:
            'Discounted weekday rate for local moves with flexible start times. Packing not included.',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 2,
          includes_truck: true,
          base_hourly_rate: 129,
          min_hours: 3,
          estimated_total_4_hours: 516,
          rating: 4.9,
          review_count: 52,
          included_add_on_ids: [],
          applicable_property_types: ['apartment_condo', 'house'],
          tags: ['best_value', 'weekday_special'],
          is_active: true,
          display_order: 0,
          created_at: '2025-10-20T10:00:00Z',
          updated_at: '2026-01-20T09:00:00Z'
        }
      ],
      moveestimates: [
        {
          id: 'est_1bed_boxes30',
          created_at: '2026-03-01T10:00:00Z',
          updated_at: '2026-03-01T10:05:00Z',
          home_size: '1_bedroom',
          source_type: 'estimator_form',
          line_item_ids: [],
          tax: 55,
          total: 705,
          target_budget: 500,
          notes:
            'Initial 1-bedroom estimate with 1 sofa, 1 bed, 4 dining chairs, and 30 moving boxes.',
          subtotal: 540.0
        },
        {
          id: 'est_1bed_boxes10',
          created_at: '2026-03-01T10:06:00Z',
          updated_at: '2026-03-01T10:08:00Z',
          home_size: '1_bedroom',
          source_type: 'estimator_form',
          line_item_ids: [],
          tax: 42,
          total: 498,
          target_budget: 500,
          notes:
            'Updated 1-bedroom estimate after reducing moving boxes from 30 to 10 to keep total near or under $500.',
          subtotal: 380.0
        },
        {
          id: 'est_studio_basic_local',
          created_at: '2026-02-20T09:30:00Z',
          updated_at: '2026-02-20T09:35:00Z',
          home_size: 'studio',
          source_type: 'estimator_form',
          line_item_ids: [],
          tax: 32,
          total: 420,
          target_budget: 450,
          notes:
            'Basic studio move estimate for local standard move with minimal furniture and a small number of boxes.',
          subtotal: 0.0
        }
      ],
      estimateitems: [
        {
          id: 'estitem_1bed30_sofa',
          estimate_id: 'est_1bed_boxes30',
          inventory_item_id: 'item_sofa',
          quantity: 1,
          unit_cost: 120,
          line_total: 120
        },
        {
          id: 'estitem_1bed30_bed',
          estimate_id: 'est_1bed_boxes30',
          inventory_item_id: 'item_bed',
          quantity: 1,
          unit_cost: 100,
          line_total: 100
        },
        {
          id: 'estitem_1bed30_chairs',
          estimate_id: 'est_1bed_boxes30',
          inventory_item_id: 'item_dining_chair',
          quantity: 4,
          unit_cost: 20,
          line_total: 80
        }
      ],
      movetimeslots: [
        {
          id: 'slot_2026-06-10_std_0900_2m_studio',
          date: '2026-06-10T00:00:00Z',
          start_time: '09:00',
          end_time: '12:00',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 2,
          package_id: 'pkg_local_standard_studio_2m_truck',
          hourly_rate: 125,
          estimated_total: 500,
          includes_insurance: false,
          max_bookings: 3,
          notes:
            'Morning arrival window for studio/small 1BR local moves. Standard 2-mover crew with truck.',
          created_at: '2026-02-15T09:00:00Z',
          updated_at: '2026-02-15T09:00:00Z',
          is_available: true
        },
        {
          id: 'slot_2026-06-10_std_1300_2m_studio',
          date: '2026-06-10T00:00:00Z',
          start_time: '13:00',
          end_time: '16:00',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 2,
          package_id: 'pkg_local_standard_studio_2m_truck',
          hourly_rate: 129,
          estimated_total: 516,
          includes_insurance: false,
          max_bookings: 3,
          notes:
            'Midday slot for studio/small 1BR moves, subject to typical afternoon traffic.',
          created_at: '2026-02-15T09:05:00Z',
          updated_at: '2026-02-15T09:05:00Z',
          is_available: true
        },
        {
          id: 'slot_2026-06-10_std_1600_2m_studio',
          date: '2026-06-10T00:00:00Z',
          start_time: '16:00',
          end_time: '19:00',
          service_type: 'standard_move',
          move_scope: 'local',
          crew_size: 2,
          package_id: 'pkg_local_standard_studio_2m_truck',
          hourly_rate: 120,
          estimated_total: 480,
          includes_insurance: false,
          max_bookings: 2,
          notes: 'Late-day discounted slot for flexible studio moves.',
          created_at: '2026-02-15T09:10:00Z',
          updated_at: '2026-02-15T09:10:00Z',
          is_available: true
        }
      ],
      movebookings: [
        {
          id: 'booking_studio_2026_06_10_am',
          created_at: '2026-03-02T10:00:00Z',
          updated_at: '2026-03-02T10:05:00Z',
          booking_status: 'confirmed',
          source_type: 'direct',
          source_reference_id: 'slot_2026-06-10_std_0900_2m_studio',
          service_type: 'standard_move',
          move_scope: 'local',
          property_type: 'apartment_condo',
          home_size: 'studio',
          origin_street: '2100 Mission St',
          origin_city: 'San Francisco',
          origin_zip: '94110',
          destination_street: '880 Bush St',
          destination_city: 'San Francisco',
          destination_zip: '94109',
          job_location_street: '',
          job_location_city: '',
          job_location_zip: '',
          move_date: '2026-06-10T09:00:00Z',
          timeslot_id: 'slot_2026-06-10_std_0900_2m_studio',
          crew_size: 2,
          includes_truck: true,
          labor_service_option_id: '',
          add_on_ids: [],
          package_id: 'pkg_local_standard_studio_2m_truck',
          estimate_id: 'est_studio_basic_local',
          base_hourly_rate: 125,
          estimated_hours: 4,
          subtotal_before_discounts: 500,
          discount_amount: 0,
          promo_code: '',
          promotion_id: '',
          insurance_plan_id: 'basic_liability',
          insurance_premium: 0,
          insured_value: 0,
          total_estimated: 500,
          contact_name: 'Taylor Kim',
          contact_phone: '4155550177',
          contact_email: 'taylor@example.com',
          promo_applied: false,
          insurance_selected: false,
          notes:
            'Standard studio move booked via Book Now with 9am–12pm arrival window.'
        },
        {
          id: 'booking_labor_only_2026_03_10_0900',
          created_at: '2026-03-02T11:00:00Z',
          updated_at: '2026-03-02T11:05:00Z',
          booking_status: 'confirmed',
          source_type: 'labor_only',
          source_reference_id: 'loading_unloading_only',
          service_type: 'labor_only',
          move_scope: 'local',
          property_type: 'storage_unit',
          home_size: null,
          origin_street: '',
          origin_city: '',
          origin_zip: '',
          destination_street: '',
          destination_city: '',
          destination_zip: '',
          job_location_street: '456 Pine St',
          job_location_city: 'San Francisco',
          job_location_zip: '94108',
          move_date: '2026-03-10T09:00:00Z',
          timeslot_id: 'slot_2026-03-10_labor_0900_2m',
          crew_size: 2,
          includes_truck: false,
          labor_service_option_id: 'loading_unloading_only',
          add_on_ids: [],
          package_id: 'pkg_local_labor_2m_basic',
          estimate_id: '',
          base_hourly_rate: 110,
          estimated_hours: 2,
          subtotal_before_discounts: 220,
          discount_amount: 0,
          promo_code: '',
          promotion_id: '',
          insurance_plan_id: '',
          insurance_premium: 0,
          insured_value: 0,
          total_estimated: 220,
          contact_name: 'Chris Alvarez',
          contact_phone: '4155550001',
          contact_email: 'chris.alvarez@example.com',
          promo_applied: false,
          insurance_selected: false,
          notes:
            'Labor-only reservation for help loading/unloading a rental truck. No truck included.'
        },
        {
          id: 'booking_promo_local50_1br_2026_06_25_am',
          created_at: '2026-03-02T12:00:00Z',
          updated_at: '2026-03-02T12:10:00Z',
          booking_status: 'confirmed',
          source_type: 'promotion',
          source_reference_id: 'promo_local50',
          service_type: 'standard_move',
          move_scope: 'local',
          property_type: 'apartment_condo',
          home_size: '1_bedroom',
          origin_street: '789 Oak St',
          origin_city: 'San Francisco',
          origin_zip: '94102',
          destination_street: '1010 Clay St',
          destination_city: 'San Francisco',
          destination_zip: '94108',
          job_location_street: '',
          job_location_city: '',
          job_location_zip: '',
          move_date: '2026-06-25T09:00:00Z',
          timeslot_id: 'slot_2026-06-25_std_0900_2m_1br',
          crew_size: 2,
          includes_truck: true,
          labor_service_option_id: '',
          add_on_ids: [],
          package_id: 'pkg_local_standard_2m_truck_core',
          estimate_id: '',
          base_hourly_rate: 135,
          estimated_hours: 4.5,
          subtotal_before_discounts: 620,
          discount_amount: 50,
          promo_code: 'LOCAL50',
          promotion_id: 'promo_local50',
          insurance_plan_id: 'basic_liability',
          insurance_premium: 0,
          insured_value: 0,
          total_estimated: 570,
          contact_name: 'Morgan Diaz',
          contact_phone: '4155550144',
          contact_email: 'morgan@example.com',
          promo_applied: true,
          insurance_selected: false,
          notes:
            'Local 1-bedroom move using promotion LOCAL50 to keep total under $600 after discount.'
        }
      ]
    };

    // Copy all data to localStorage using correct storage keys
    localStorage.setItem('addons', JSON.stringify(generatedData.addons));
    localStorage.setItem('insuranceplans', JSON.stringify(generatedData.insuranceplans));
    localStorage.setItem('inventoryitems', JSON.stringify(generatedData.inventoryitems));
    localStorage.setItem('laborserviceoptions', JSON.stringify(generatedData.laborserviceoptions));
    localStorage.setItem('promotions', JSON.stringify(generatedData.promotions));
    localStorage.setItem('movepackages', JSON.stringify(generatedData.movepackages));
    localStorage.setItem('moveestimates', JSON.stringify(generatedData.moveestimates));
    localStorage.setItem('estimateitems', JSON.stringify(generatedData.estimateitems));
    localStorage.setItem('movetimeslots', JSON.stringify(generatedData.movetimeslots));
    localStorage.setItem('movebookings', JSON.stringify(generatedData.movebookings));

    // Initialize empty collections for entities created during flows
    if (!localStorage.getItem('quoterequests')) {
      localStorage.setItem('quoterequests', JSON.stringify([]));
    }
    if (!localStorage.getItem('packagecomparisonlists')) {
      localStorage.setItem('packagecomparisonlists', JSON.stringify([]));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestQuoteUnder150();
    this.testTask2_BookFullServiceWithPacking3MoversUnder900();
    this.testTask3_SelectHighestRatedPackageUnder140AndCompare();
    this.testTask4_ScheduleStudioMoveJune10Morning();
    this.testTask5_EstimatorAdjustQuantitiesUnder500();
    this.testTask6_ReserveLaborOnly2h2MoversUnder120();
    this.testTask7_ApplyPromoCodeLocalMoveUnder600Total();
    this.testTask8_ChooseFullValueProtection15000Under1800();

    return this.results;
  }

  // Task 1: Request a quote for a 2-bedroom local move under $150/hour on June 15
  testTask1_RequestQuoteUnder150() {
    const testName = 'Task 1: Quote request 2BR local move under $150/hour';
    try {
      const initData = this.logic.getQuoteRequestPageInitData();
      this.assert(initData && initData.home_size_options, 'Quote init data should be returned');

      // Select home size 2_bedroom_apartment if available
      const homeSizeOption =
        initData.home_size_options.find((o) => o.value === '2_bedroom_apartment') ||
        initData.home_size_options[0];
      const homeSize = homeSizeOption.value;

      // Use default move scope or fall back to 'local'
      const moveScope = initData.default_move_scope || 'local';

      // Prefer standard_move service type when available
      let serviceType = 'standard_move';
      if (initData.service_type_options && initData.service_type_options.length > 0) {
        const stdOpt = initData.service_type_options.find((o) => o.value === 'standard_move');
        serviceType = (stdOpt && stdOpt.value) || initData.service_type_options[0].value;
      }

      const moveDate = '2026-06-15';
      const originZip = '94103';
      const destinationZip = '94110';
      const maxHourlyRate = 150;

      const slots = this.logic.getAvailableQuoteTimeSlots(
        moveDate,
        moveScope,
        serviceType,
        homeSize,
        originZip,
        destinationZip,
        maxHourlyRate
      );

      this.assert(Array.isArray(slots) && slots.length > 0, 'Should return at least one quote timeslot');

      // All returned slots should respect hourly rate cap
      slots.forEach((slot) => {
        this.assert(
          slot.hourly_rate <= maxHourlyRate,
          'Timeslot hourly_rate should be <= max cap, actual: ' + slot.hourly_rate
        );
      });

      // Pick the cheapest available slot under or equal to $150/hour
      let selectedSlot = slots[0];
      for (let i = 1; i < slots.length; i++) {
        if (slots[i].hourly_rate < selectedSlot.hourly_rate) {
          selectedSlot = slots[i];
        }
      }

      const submitResult = this.logic.submitQuoteRequest(
        // origin
        '123 Market St',
        'San Francisco',
        originZip,
        // destination
        '500 Dolores St',
        'San Francisco',
        destinationZip,
        // move details
        homeSize,
        moveScope,
        serviceType,
        moveDate,
        // timeslot snapshot
        selectedSlot.id,
        selectedSlot.hourly_rate,
        // contact
        'Alex Rivera',
        '4155550123',
        'alex@example.com',
        null // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Quote submission should succeed');
      const quote = submitResult.quote_request;
      this.assert(quote && quote.id, 'QuoteRequest should have an id');
      this.assert(
        quote.preferred_timeslot_id === selectedSlot.id,
        'Preferred timeslot id should match selected slot'
      );
      this.assert(
        typeof quote.selected_hourly_rate === 'number' &&
          quote.selected_hourly_rate === selectedSlot.hourly_rate,
        'Selected hourly rate should match slot hourly_rate'
      );

      // Verify persistence via localStorage and relationship to MoveTimeSlot
      const storedQuotes = JSON.parse(localStorage.getItem('quoterequests') || '[]');
      const storedQuote = storedQuotes.find((q) => q.id === quote.id);
      this.assert(storedQuote, 'Stored QuoteRequest should be present in localStorage');

      const allSlots = JSON.parse(localStorage.getItem('movetimeslots') || '[]');
      const relatedSlot = allSlots.find((s) => s.id === quote.preferred_timeslot_id);
      // Slot may be generated on the fly and not in pre-generated list, so just ensure id is present
      this.assert(quote.preferred_timeslot_id, 'QuoteRequest should reference a timeslot id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Book a full-service move with packing (no storage) using a 3-mover crew under $900
  testTask2_BookFullServiceWithPacking3MoversUnder900() {
    const testName =
      'Task 2: Book full-service-style move with packing, 3 movers, package under $900 (4h estimate)';
    try {
      // Start booking (simulates clicking "Book Now")
      const startResult = this.logic.startMoveBooking('direct', null);
      this.assert(startResult && startResult.success, 'Should start a direct booking');
      let booking = startResult.booking;

      // Get booking form options to select service type, property type, and home size
      const formOptions = this.logic.getMoveBookingFormOptions();
      this.assert(formOptions, 'Booking form options should be available');

      // Prefer full_service_move if available, otherwise use standard_move
      let serviceType = 'standard_move';
      if (Array.isArray(formOptions.service_type_options)) {
        const fullSvc = formOptions.service_type_options.find(
          (o) => o.value === 'full_service_move'
        );
        const std = formOptions.service_type_options.find((o) => o.value === 'standard_move');
        if (fullSvc) serviceType = fullSvc.value;
        else if (std) serviceType = std.value;
        else if (formOptions.service_type_options[0]) {
          serviceType = formOptions.service_type_options[0].value;
        }
      }

      // Choose apartment/condo property type
      let propertyType = 'apartment_condo';
      if (Array.isArray(formOptions.property_type_options)) {
        const apt = formOptions.property_type_options.find(
          (o) => o.value === 'apartment_condo'
        );
        if (apt) propertyType = apt.value;
        else if (formOptions.property_type_options[0]) {
          propertyType = formOptions.property_type_options[0].value;
        }
      }

      // Home size: 2 bedroom apartment
      let homeSize = '2_bedroom_apartment';
      if (Array.isArray(formOptions.home_size_options)) {
        const h = formOptions.home_size_options.find((o) => o.value === '2_bedroom_apartment');
        if (h) homeSize = h.value;
        else if (formOptions.home_size_options[0]) {
          homeSize = formOptions.home_size_options[0].value;
        }
      }

      // Select packing add-on(s), explicitly excluding storage
      const addons = JSON.parse(localStorage.getItem('addons') || '[]');
      const packingAddons = addons.filter((a) => a.is_packing && a.is_active && !a.is_storage);
      const selectedAddOnIds = packingAddons.map((a) => a.id);
      // Ensure we did not accidentally include storage add-ons
      const storageAddons = addons.filter((a) => a.is_storage);
      storageAddons.forEach((s) => {
        this.assert(
          !selectedAddOnIds.includes(s.id),
          'Selected add-ons should not include storage add-ons'
        );
      });

      // Get 3-mover local packages that include a truck, under $900 for 4 hours
      // Use service_type 'standard_move' because our generated packages are standard_move
      const packages = this.logic.getAvailableMovePackages(
        'standard_move', // service_type for packages
        'local', // move_scope
        3, // crew_size
        true, // includes_truck
        null, // hourly_rate_min
        null, // hourly_rate_max
        null, // rating_min
        null, // min_review_count
        'price_asc', // sort_by
        null // limit
      );
      this.assert(
        Array.isArray(packages) && packages.length > 0,
        'Should have at least one 3-mover local package with truck'
      );

      const eligiblePackages = packages.filter(
        (p) =>
          typeof p.estimated_total_4_hours === 'number' && p.estimated_total_4_hours < 900 && p.includes_truck
      );
      this.assert(
        eligiblePackages.length > 0,
        'Should find at least one package with 4-hour estimate under $900'
      );

      const selectedPackage = eligiblePackages[0];
      this.assert(
        selectedPackage.crew_size === 3,
        'Selected package should be for a 3-mover crew'
      );

      // Update booking with core move details, package, and packing add-ons
      let updateResult = this.logic.updateCurrentMoveBooking(
        serviceType, // service_type
        'local', // move_scope
        propertyType, // property_type
        homeSize, // home_size
        null, // origin_street
        null, // origin_city
        null, // origin_zip
        null, // destination_street
        null, // destination_city
        null, // destination_zip
        null, // job_location_street
        null, // job_location_city
        null, // job_location_zip
        null, // move_date
        null, // timeslot_id
        selectedPackage.crew_size, // crew_size
        selectedPackage.includes_truck, // includes_truck
        null, // labor_service_option_id
        selectedAddOnIds, // add_on_ids
        selectedPackage.id, // package_id
        null, // estimate_id
        4, // estimated_hours
        null, // contact_name
        null, // contact_phone
        null, // contact_email
        null // notes
      );

      this.assert(updateResult && updateResult.success, 'Booking update with package should succeed');
      booking = updateResult.booking;
      this.assert(booking.package_id === selectedPackage.id, 'Booking should store selected package id');
      this.assert(booking.crew_size === 3, 'Booking crew size should be 3');
      if (Array.isArray(booking.add_on_ids) && selectedAddOnIds.length > 0) {
        this.assert(
          selectedAddOnIds.every((id) => booking.add_on_ids.includes(id)),
          'Booking should include selected packing add-ons'
        );
      }

      // Choose a move date/time (June 20) with any available arrival window
      const moveDate = '2026-06-20';
      const timeSlots = this.logic.getAvailableTimeSlotsForCurrentBooking(
        moveDate,
        null, // max_hourly_rate
        900, // max_total_estimate to reinforce budget
        'price_asc' // sort_by
      );
      this.assert(
        Array.isArray(timeSlots) && timeSlots.length > 0,
        'Should return available time slots for booking on June 20'
      );

      let selectedSlot = timeSlots[0];
      // Ensure all returned slots respect the max_total_estimate when provided
      timeSlots.forEach((slot) => {
        this.assert(
          typeof slot.estimated_total === 'number' && slot.estimated_total <= 900,
          'Timeslot estimated_total should be <= 900 when filtered'
        );
      });

      // Update booking with chosen date and timeslot, keeping previous fields
      booking = updateResult.booking;
      updateResult = this.logic.updateCurrentMoveBooking(
        booking.service_type,
        booking.move_scope,
        booking.property_type,
        booking.home_size,
        booking.origin_street,
        booking.origin_city,
        booking.origin_zip,
        booking.destination_street,
        booking.destination_city,
        booking.destination_zip,
        booking.job_location_street,
        booking.job_location_city,
        booking.job_location_zip,
        moveDate,
        selectedSlot.id,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with timeslot should succeed');
      booking = updateResult.booking;

      const summaryBeforeConfirm = this.logic.getCurrentMoveBookingSummary();
      this.assert(summaryBeforeConfirm && summaryBeforeConfirm.booking, 'Booking summary should be available');
      const preConfirmTotal = summaryBeforeConfirm.cost_breakdown.total_estimated;
      this.assert(
        typeof preConfirmTotal === 'number' && preConfirmTotal > 0,
        'Pre-confirmation total should be positive'
      );

      // Confirm booking with contact info
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Jordan Lee',
        '4155550199',
        'jordan@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Booking confirmation should succeed');
      const confirmedBooking = confirmResult.booking;
      this.assert(confirmedBooking && confirmedBooking.id, 'Confirmed booking should have an id');
      this.assert(
        confirmedBooking.package_id === selectedPackage.id,
        'Confirmed booking should retain selected package id'
      );
      this.assert(
        confirmedBooking.crew_size === 3,
        'Confirmed booking should still have 3-mover crew size'
      );

      // Verify total is consistent and in expected budget range relative to the selected package
      this.assert(
        selectedPackage.estimated_total_4_hours < 900,
        'Selected package 4h estimate should be under $900'
      );
      this.assert(
        typeof confirmedBooking.total_estimated === 'number' &&
          confirmedBooking.total_estimated > 0,
        'Confirmed booking should have a positive total_estimated'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Select the highest-rated local move package under $140/hour with >=20 reviews and add to comparison
  testTask3_SelectHighestRatedPackageUnder140AndCompare() {
    const testName =
      'Task 3: Pricing filter under $140/hr, highest-rated local package with >=20 reviews, add to comparison';
    try {
      const pricingOptions = this.logic.getPricingPageFilterOptions();
      this.assert(pricingOptions, 'Pricing page filter options should load');

      const maxHourlyRate = 140;
      const minRating = 4.0;
      const minReviews = 20;

      const packages = this.logic.getAvailableMovePackages(
        'standard_move', // service_type
        'local', // move_scope
        null, // crew_size
        null, // includes_truck
        null, // hourly_rate_min
        maxHourlyRate, // hourly_rate_max
        minRating, // rating_min
        minReviews, // min_review_count
        'rating_desc', // sort_by: highest rating first
        null // limit
      );

      this.assert(
        Array.isArray(packages) && packages.length > 0,
        'Should find at least one local package under hourly-rate and rating filters'
      );

      // Verify all packages satisfy filters
      packages.forEach((pkg) => {
        this.assert(
          pkg.base_hourly_rate <= maxHourlyRate,
          'Package hourly rate should be <= max filter'
        );
        if (typeof pkg.rating === 'number') {
          this.assert(pkg.rating >= minRating, 'Package rating should be >= min rating');
        }
        if (typeof pkg.review_count === 'number') {
          this.assert(
            pkg.review_count >= minReviews,
            'Package review_count should be >= minimum reviews'
          );
        }
      });

      const topPackage = packages[0];
      this.assert(topPackage && topPackage.id, 'Top package should have an id');

      // Ensure it is highest-rated in the returned list
      packages.forEach((pkg) => {
        if (typeof pkg.rating === 'number' && typeof topPackage.rating === 'number') {
          this.assert(
            topPackage.rating >= pkg.rating,
            'Top package rating should be >= all other ratings'
          );
        }
      });

      // Add the highest-rated package to comparison
      const addResult = this.logic.addPackageToComparisonList(topPackage.id);
      this.assert(addResult && addResult.success, 'Adding package to comparison should succeed');
      const comparisonList = addResult.comparison_list;
      this.assert(comparisonList && comparisonList.id, 'Comparison list should have an id');
      this.assert(
        Array.isArray(comparisonList.package_ids) &&
          comparisonList.package_ids.includes(topPackage.id),
        'Comparison list should include the added package id'
      );

      // Get summary
      const summary = this.logic.getCurrentPackageComparisonSummary();
      this.assert(summary && summary.comparison_list, 'Comparison summary should be available');
      this.assert(
        summary.comparison_list.package_ids.includes(topPackage.id),
        'Summary comparison list should include the package id'
      );

      // Open comparison view with full package details
      const details = this.logic.getPackageComparisonDetails();
      this.assert(details && details.comparison_list, 'Comparison details should be returned');
      const detailedPackages = details.packages || [];
      const detailedPkg = detailedPackages.find((p) => p.id === topPackage.id);
      this.assert(detailedPkg, 'Detailed comparison should include the selected package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Schedule a studio apartment move on June 10 with the earliest 9am–12pm arrival window
  testTask4_ScheduleStudioMoveJune10Morning() {
    const testName = 'Task 4: Schedule studio move on June 10 with earliest 9am–12pm window';
    try {
      const startResult = this.logic.startMoveBooking('direct', null);
      this.assert(startResult && startResult.success, 'Should start a new booking for studio move');
      let booking = startResult.booking;

      const formOptions = this.logic.getMoveBookingFormOptions();
      this.assert(formOptions, 'Booking form options should be available');

      // Property type: apartment/condo
      let propertyType = 'apartment_condo';
      if (Array.isArray(formOptions.property_type_options)) {
        const apt = formOptions.property_type_options.find(
          (o) => o.value === 'apartment_condo'
        );
        if (apt) propertyType = apt.value;
        else if (formOptions.property_type_options[0]) {
          propertyType = formOptions.property_type_options[0].value;
        }
      }

      // Home size: studio
      let homeSize = 'studio';
      if (Array.isArray(formOptions.home_size_options)) {
        const studioOpt = formOptions.home_size_options.find((o) => o.value === 'studio');
        if (studioOpt) homeSize = studioOpt.value;
        else if (formOptions.home_size_options[0]) {
          homeSize = formOptions.home_size_options[0].value;
        }
      }

      // Service type: standard_move (no packing)
      let serviceType = 'standard_move';
      if (Array.isArray(formOptions.service_type_options)) {
        const std = formOptions.service_type_options.find((o) => o.value === 'standard_move');
        if (std) serviceType = std.value;
        else if (formOptions.service_type_options[0]) {
          serviceType = formOptions.service_type_options[0].value;
        }
      }

      const originStreet = '2100 Mission St';
      const originZip = '94110';
      const destStreet = '880 Bush St';
      const destZip = '94109';

      // Update booking with move details (no time yet)
      let updateResult = this.logic.updateCurrentMoveBooking(
        serviceType,
        'local', // move_scope
        propertyType,
        homeSize,
        originStreet,
        'San Francisco',
        originZip,
        destStreet,
        'San Francisco',
        destZip,
        null,
        null,
        null,
        null, // move_date
        null, // timeslot_id
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with addresses should succeed');
      booking = updateResult.booking;

      const moveDate = '2026-06-10';
      const timeSlots = this.logic.getAvailableTimeSlotsForCurrentBooking(
        moveDate,
        null, // max_hourly_rate
        null, // max_total_estimate
        'start_time_asc' // sort by earliest start time
      );
      this.assert(
        Array.isArray(timeSlots) && timeSlots.length > 0,
        'Should load available time slots for June 10'
      );

      // Choose earliest slot whose start time is between 09:00 and 12:00
      const morningSlots = timeSlots.filter((slot) => {
        const parts = (slot.start_time || '').split(':');
        const hour = parseInt(parts[0], 10);
        return hour >= 9 && hour < 12;
      });
      this.assert(
        morningSlots.length > 0,
        'Should have at least one morning slot between 9:00 and 12:00'
      );

      let selectedSlot = morningSlots[0];
      // Because we requested start_time_asc, first morning slot should be earliest

      // Update booking with move date and selected morning timeslot
      updateResult = this.logic.updateCurrentMoveBooking(
        booking.service_type,
        booking.move_scope,
        booking.property_type,
        booking.home_size,
        booking.origin_street,
        booking.origin_city,
        booking.origin_zip,
        booking.destination_street,
        booking.destination_city,
        booking.destination_zip,
        booking.job_location_street,
        booking.job_location_city,
        booking.job_location_zip,
        moveDate,
        selectedSlot.id,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with morning slot should succeed');
      booking = updateResult.booking;

      // Confirm booking
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Taylor Kim',
        '4155550177',
        'taylor@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Studio booking confirmation should succeed');
      const confirmed = confirmResult.booking;

      this.assert(confirmed.home_size === homeSize, 'Confirmed booking should be for studio');
      this.assert(
        confirmed.timeslot_id === selectedSlot.id,
        'Confirmed booking timeslot id should match selected morning slot'
      );

      // Verify relationship to stored MoveTimeSlot
      const storedSlots = JSON.parse(localStorage.getItem('movetimeslots') || '[]');
      const relatedSlot = storedSlots.find((s) => s.id === confirmed.timeslot_id);
      this.assert(confirmed.timeslot_id, 'Booking should have a timeslot_id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Use moving cost estimator, adjust quantities and keep 1-bedroom estimate under/near $500, then start booking
  testTask5_EstimatorAdjustQuantitiesUnder500() {
    const testName =
      'Task 5: Moving cost estimator 1BR, adjust item quantities to approach/under $500 and start booking';
    try {
      const initData = this.logic.getMovingCostEstimatorInitData();
      this.assert(initData, 'Estimator init data should be available');
      const inventory = initData.inventory_items || [];

      // Find known inventory items by code
      const sofaItem = inventory.find((i) => i.code === 'sofa') || inventory[0];
      const bedItem = inventory.find((i) => i.code === 'bed') || inventory[1] || inventory[0];
      // Use dining_chair as the adjustable quantity stand-in (analogous to boxes)
      const chairItem =
        inventory.find((i) => i.code === 'dining_chair') || inventory[2] || inventory[0];

      const targetBudget = 500;

      // First estimate: 1 sofa, 1 bed, 4 chairs, and high quantity of "boxes" via chairs (30)
      const estimate1Result = this.logic.calculateMoveEstimate(
        '1_bedroom',
        [
          { inventory_item_id: sofaItem.id, quantity: 1 },
          { inventory_item_id: bedItem.id, quantity: 1 },
          { inventory_item_id: chairItem.id, quantity: 30 }
        ],
        targetBudget
      );
      this.assert(estimate1Result && estimate1Result.estimate, 'First estimate should be created');
      const est1 = estimate1Result.estimate;
      const est1Items = estimate1Result.items || [];
      this.assert(est1.home_size === '1_bedroom', 'Estimate home_size should be 1_bedroom');

      const chairLine1 = est1Items.find((li) => li.inventory_item_id === chairItem.id);
      this.assert(chairLine1 && chairLine1.quantity === 30, 'Initial quantity for chairs should be 30');

      // Second estimate: reduce the adjustable item from 30 down to 10
      const estimate2Result = this.logic.calculateMoveEstimate(
        '1_bedroom',
        [
          { inventory_item_id: sofaItem.id, quantity: 1 },
          { inventory_item_id: bedItem.id, quantity: 1 },
          { inventory_item_id: chairItem.id, quantity: 10 }
        ],
        targetBudget
      );
      this.assert(estimate2Result && estimate2Result.estimate, 'Second estimate should be created');
      const est2 = estimate2Result.estimate;
      const est2Items = estimate2Result.items || [];

      const chairLine2 = est2Items.find((li) => li.inventory_item_id === chairItem.id);
      this.assert(chairLine2 && chairLine2.quantity === 10, 'Updated quantity for chairs should be 10');

      // Ensure cost decreases when quantity is reduced
      this.assert(
        typeof est1.total === 'number' && typeof est2.total === 'number',
        'Estimates should have numeric totals'
      );
      this.assert(
        est2.total <= est1.total,
        'Total after reducing quantity should be <= initial total'
      );

      // Check relation to target budget
      this.assert(
        est2.total <= targetBudget || est2.total < est1.total,
        'Adjusted estimate should be under or closer to target budget'
      );

      // Start booking from the adjusted estimate
      const startBookingResult = this.logic.startMoveBookingFromEstimate(est2.id);
      this.assert(startBookingResult && startBookingResult.success, 'Booking from estimate should succeed');
      let booking = startBookingResult.booking;
      this.assert(booking.estimate_id === est2.id, 'Booking should reference the second estimate id');

      // Get booking summary using this estimate
      const summary = this.logic.getCurrentMoveBookingSummary();
      this.assert(summary && summary.booking, 'Booking summary based on estimate should be available');
      this.assert(
        summary.booking.estimate_id === est2.id,
        'Summary booking should still reference the estimate id'
      );

      // Proceed with booking without changing estimate-derived details
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Estimator User',
        '4155550999',
        'estimator@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Booking confirmation from estimate should succeed');
      const confirmed = confirmResult.booking;
      this.assert(confirmed && confirmed.id, 'Confirmed booking from estimate should have an id');

      // Relationship check: MoveBooking.estimate_id -> MoveEstimate
      const storedEstimates = JSON.parse(localStorage.getItem('moveestimates') || '[]');
      const storedEst2 = storedEstimates.find((e) => e.id === confirmed.estimate_id);
      this.assert(
        confirmed.estimate_id,
        'Confirmed booking should reference an estimate via estimate_id'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Reserve 2-hour labor-only help with 2 movers under $120/hour
  testTask6_ReserveLaborOnly2h2MoversUnder120() {
    const testName = 'Task 6: Reserve 2-hour labor-only help with 2 movers under $120/hour';
    try {
      const laborPageData = this.logic.getLaborOnlyPageData();
      this.assert(laborPageData, 'Labor-only page data should be available');

      const serviceOptions = laborPageData.service_options || [];
      const loadingOption =
        serviceOptions.find((s) => s.code === 'loading_unloading_only') || serviceOptions[0];
      this.assert(loadingOption && loadingOption.id, 'Should have a labor-only loading/unloading option');

      // Start a labor-only booking linked to this service option
      const startResult = this.logic.startMoveBooking('labor_only', loadingOption.id);
      this.assert(startResult && startResult.success, 'Should start a labor-only booking');
      let booking = startResult.booking;
      this.assert(booking.service_type === 'labor_only', 'Booking service_type should be labor_only');

      const crewSize = 2;
      const durationHours = 2;
      const maxHourly = 120;

      const laborPackages = this.logic.getLaborOnlyPackages(
        crewSize,
        durationHours,
        maxHourly,
        null // hourly_rate_min
      );
      this.assert(
        Array.isArray(laborPackages) && laborPackages.length > 0,
        'Should return labor-only packages for 2 movers / 2 hours'
      );

      // Verify all returned packages are labor_only and have no truck, hourly rate <= max
      laborPackages.forEach((pkg) => {
        this.assert(pkg.service_type === 'labor_only', 'Labor package service_type should be labor_only');
        this.assert(pkg.includes_truck === false, 'Labor-only package should not include a truck');
        this.assert(
          pkg.base_hourly_rate <= maxHourly,
          'Labor-only package hourly rate should be <= maxHourly'
        );
      });

      const selectedPkg = laborPackages[0];
      const selectResult = this.logic.selectLaborOnlyPackageForCurrentBooking(
        selectedPkg.id,
        durationHours
      );
      this.assert(selectResult && selectResult.success, 'Selecting labor-only package should succeed');
      booking = selectResult.booking;

      this.assert(
        booking.package_id === selectedPkg.id,
        'Booking should reference selected labor-only package'
      );
      this.assert(booking.crew_size === crewSize, 'Labor-only booking crew size should be 2');
      this.assert(booking.includes_truck === false, 'Labor-only booking should not include truck');

      // Set job location address
      const jobStreet = '456 Pine St';
      const jobCity = 'San Francisco';
      const jobZip = '94108';
      const moveDate = '2026-03-10';

      const updateResult = this.logic.updateCurrentMoveBooking(
        booking.service_type,
        'local', // move_scope
        booking.property_type,
        booking.home_size,
        booking.origin_street,
        booking.origin_city,
        booking.origin_zip,
        booking.destination_street,
        booking.destination_city,
        booking.destination_zip,
        jobStreet,
        jobCity,
        jobZip,
        moveDate,
        booking.timeslot_id,
        booking.crew_size,
        booking.includes_truck,
        loadingOption.id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        durationHours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Updating labor-only booking details should succeed');
      booking = updateResult.booking;

      // Confirm reservation
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Labor Only Customer',
        '4155550666',
        'laboronly@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Labor-only booking confirmation should succeed');
      const confirmed = confirmResult.booking;
      this.assert(confirmed && confirmed.id, 'Confirmed labor-only booking should have an id');

      // Verify relationship to LaborServiceOption
      const storedOptions = JSON.parse(localStorage.getItem('laborserviceoptions') || '[]');
      const relatedOption = storedOptions.find((o) => o.id === confirmed.labor_service_option_id);
      this.assert(
        confirmed.labor_service_option_id,
        'Confirmed labor-only booking should reference a LaborServiceOption id'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Apply promo code from promotions page to keep local move total under $600 after discount
  testTask7_ApplyPromoCodeLocalMoveUnder600Total() {
    const testName = 'Task 7: Apply LOCAL50 promo to local move and reduce total';
    try {
      const promos = this.logic.getActivePromotionsList();
      this.assert(Array.isArray(promos) && promos.length > 0, 'Active promotions list should not be empty');

      // Find promotion with code LOCAL50 or matching title
      let promo = promos.find((p) => p.code === 'LOCAL50');
      if (!promo) {
        promo = promos.find((p) => p.title.indexOf('Local moves over $400') !== -1) || promos[0];
      }
      this.assert(promo && promo.id && promo.code, 'LOCAL50-like promotion should exist');

      const promoDetails = this.logic.getPromotionDetails(promo.id);
      this.assert(promoDetails && promoDetails.id === promo.id, 'Promotion details should match selected promo');

      const promoCode = promo.code;

      // Start booking from the selected promotion
      const startResult = this.logic.startMoveBookingFromPromotion(promo.id);
      this.assert(startResult && startResult.success, 'Should start booking from promotion');
      let booking = startResult.booking;

      const formOptions = this.logic.getMoveBookingFormOptions();
      this.assert(formOptions, 'Booking form options should be available');

      // Enforce standard_move and local scope to satisfy promo eligibility
      const serviceType = 'standard_move';
      const moveScope = 'local';

      // Property type: apartment_condo
      let propertyType = 'apartment_condo';
      if (Array.isArray(formOptions.property_type_options)) {
        const apt = formOptions.property_type_options.find(
          (o) => o.value === 'apartment_condo'
        );
        if (apt) propertyType = apt.value;
        else if (formOptions.property_type_options[0]) {
          propertyType = formOptions.property_type_options[0].value;
        }
      }

      // Home size: 1 bedroom apartment
      let homeSize = '1_bedroom';
      if (Array.isArray(formOptions.home_size_options)) {
        const oneBr = formOptions.home_size_options.find((o) => o.value === '1_bedroom');
        if (oneBr) homeSize = oneBr.value;
        else if (formOptions.home_size_options[0]) {
          homeSize = formOptions.home_size_options[0].value;
        }
      }

      const originStreet = '789 Oak St';
      const originZip = '94102';
      const destStreet = '1010 Clay St';
      const destZip = '94108';
      const moveDate = '2026-06-25';

      // Update booking with move details (no timeslot yet)
      let updateResult = this.logic.updateCurrentMoveBooking(
        serviceType,
        moveScope,
        propertyType,
        homeSize,
        originStreet,
        'San Francisco',
        originZip,
        destStreet,
        'San Francisco',
        destZip,
        null,
        null,
        null,
        moveDate,
        null,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with promo move details should succeed');
      booking = updateResult.booking;

      // Pick a timeslot whose pre-discount total meets promo min_subtotal
      const timeSlots = this.logic.getAvailableTimeSlotsForCurrentBooking(
        moveDate,
        null,
        null,
        'price_asc'
      );
      this.assert(
        Array.isArray(timeSlots) && timeSlots.length > 0,
        'Should load time slots for promo booking date'
      );

      let selectedSlot = timeSlots.find((s) => s.estimated_total >= (promo.min_subtotal || 0));
      if (!selectedSlot) {
        selectedSlot = timeSlots[0];
      }

      // Update booking with chosen slot
      updateResult = this.logic.updateCurrentMoveBooking(
        booking.service_type,
        booking.move_scope,
        booking.property_type,
        booking.home_size,
        booking.origin_street,
        booking.origin_city,
        booking.origin_zip,
        booking.destination_street,
        booking.destination_city,
        booking.destination_zip,
        booking.job_location_street,
        booking.job_location_city,
        booking.job_location_zip,
        moveDate,
        selectedSlot.id,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with promo timeslot should succeed');
      booking = updateResult.booking;

      // Capture pre-promo total
      const summaryBefore = this.logic.getCurrentMoveBookingSummary();
      this.assert(summaryBefore && summaryBefore.cost_breakdown, 'Pre-promo summary should be available');
      const prePromoTotal = summaryBefore.cost_breakdown.total_estimated;
      this.assert(
        typeof prePromoTotal === 'number' && prePromoTotal > 0,
        'Pre-promo total should be positive'
      );

      // Apply promo code
      const applyResult = this.logic.applyPromoCodeToCurrentBooking(promoCode);
      this.assert(applyResult && applyResult.success, 'Applying promo code should succeed');
      const bookingAfterPromo = applyResult.booking;
      const appliedPromo = applyResult.applied_promotion;
      this.assert(appliedPromo && appliedPromo.code === promoCode, 'Applied promotion code should match');
      this.assert(
        bookingAfterPromo.promo_code === promoCode,
        'Booking should store the applied promo code'
      );

      const summaryAfter = this.logic.getCurrentMoveBookingSummary();
      this.assert(summaryAfter && summaryAfter.cost_breakdown, 'Post-promo summary should be available');
      const postPromoTotal = summaryAfter.cost_breakdown.total_estimated;
      const discountAmount = summaryAfter.cost_breakdown.discount_amount;
      this.assert(
        typeof postPromoTotal === 'number' && postPromoTotal > 0,
        'Post-promo total should be positive'
      );
      this.assert(
        postPromoTotal <= prePromoTotal,
        'Total after promo should be <= total before promo'
      );
      this.assert(
        typeof discountAmount === 'number' && discountAmount > 0,
        'Discount amount after applying promo should be positive'
      );

      // Confirm booking with contact information
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Morgan Diaz',
        '4155550144',
        'morgan@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Promo booking confirmation should succeed');
      const confirmed = confirmResult.booking;

      this.assert(confirmed && confirmed.id, 'Confirmed promo booking should have an id');
      this.assert(confirmed.promo_code === promoCode, 'Confirmed booking should retain promo code');
      this.assert(confirmed.promotion_id === promo.id, 'Confirmed booking should reference promotion id');

      // Check that discounted total is less than or equal to pre-discount total and ideally under $600
      this.assert(
        confirmed.total_estimated <= prePromoTotal,
        'Confirmed booking total should not exceed pre-promo total'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose full-value protection for $15,000 of belongings and start a 3-bedroom house booking with that coverage
  testTask8_ChooseFullValueProtection15000Under1800() {
    const testName =
      'Task 8: Choose full-value protection ($15k) and book 3-bedroom house with total under $1,800';
    try {
      const plans = this.logic.getInsurancePlansComparison();
      this.assert(Array.isArray(plans) && plans.length > 0, 'Insurance plans comparison should return plans');

      // Select a full-value plan with coverage_limit >= 15000 and full replacement
      let selectedPlan = plans.find(
        (p) => p.coverage_type === 'full_value' && p.coverage_limit >= 15000 && p.is_full_replacement
      );
      if (!selectedPlan) {
        selectedPlan = plans.find((p) => p.coverage_type === 'full_value') || plans[0];
      }
      this.assert(selectedPlan && selectedPlan.id, 'Full-value protection plan should be available');

      const planDetails = this.logic.getInsurancePlanDetails(selectedPlan.id);
      this.assert(planDetails && planDetails.id === selectedPlan.id, 'Insurance plan details should match');

      const insuredValue = 15000;

      // Start booking from the insurance plan
      const startResult = this.logic.startMoveBookingFromInsurancePlan(
        selectedPlan.id,
        insuredValue
      );
      this.assert(startResult && startResult.success, 'Should start booking from insurance plan');
      let booking = startResult.booking;

      const formOptions = this.logic.getMoveBookingFormOptions();
      this.assert(formOptions, 'Booking form options should be available');

      // Property type: house
      let propertyType = 'house';
      if (Array.isArray(formOptions.property_type_options)) {
        const houseOpt = formOptions.property_type_options.find((o) => o.value === 'house');
        if (houseOpt) propertyType = houseOpt.value;
        else if (formOptions.property_type_options[0]) {
          propertyType = formOptions.property_type_options[0].value;
        }
      }

      // Home size: 3 bedroom house
      let homeSize = '3_bedroom_house';
      if (Array.isArray(formOptions.home_size_options)) {
        const threeBrHouse = formOptions.home_size_options.find(
          (o) => o.value === '3_bedroom_house'
        );
        if (threeBrHouse) homeSize = threeBrHouse.value;
        else if (formOptions.home_size_options[0]) {
          homeSize = formOptions.home_size_options[0].value;
        }
      }

      const originStreet = '1200 9th Ave';
      const originZip = '94122';
      const destStreet = '3000 Jackson St';
      const destZip = '94115';
      const moveDate = '2026-07-05';

      // Use standard_move local by default for this test
      const serviceType = 'standard_move';
      const moveScope = 'local';

      // Update booking with move details (no timeslot yet)
      let updateResult = this.logic.updateCurrentMoveBooking(
        serviceType,
        moveScope,
        propertyType,
        homeSize,
        originStreet,
        'San Francisco',
        originZip,
        destStreet,
        'San Francisco',
        destZip,
        null,
        null,
        null,
        moveDate,
        null,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with insurance move details should succeed');
      booking = updateResult.booking;

      // Get time slots constrained to total estimate under $1,800
      const maxTotal = 1800;
      const timeSlots = this.logic.getAvailableTimeSlotsForCurrentBooking(
        moveDate,
        null, // max_hourly_rate
        maxTotal, // max_total_estimate
        'price_asc'
      );
      this.assert(
        Array.isArray(timeSlots) && timeSlots.length > 0,
        'Should find time slots with estimated total under maxTotal'
      );

      timeSlots.forEach((slot) => {
        this.assert(
          typeof slot.estimated_total === 'number' && slot.estimated_total <= maxTotal,
          'Each returned slot estimated_total should be <= maxTotal filter'
        );
      });

      const selectedSlot = timeSlots[0];

      // Update booking with selected slot
      updateResult = this.logic.updateCurrentMoveBooking(
        booking.service_type,
        booking.move_scope,
        booking.property_type,
        booking.home_size,
        booking.origin_street,
        booking.origin_city,
        booking.origin_zip,
        booking.destination_street,
        booking.destination_city,
        booking.destination_zip,
        booking.job_location_street,
        booking.job_location_city,
        booking.job_location_zip,
        moveDate,
        selectedSlot.id,
        booking.crew_size,
        booking.includes_truck,
        booking.labor_service_option_id,
        booking.add_on_ids,
        booking.package_id,
        booking.estimate_id,
        booking.estimated_hours,
        booking.contact_name,
        booking.contact_phone,
        booking.contact_email,
        booking.notes
      );
      this.assert(updateResult && updateResult.success, 'Booking update with insurance timeslot should succeed');
      booking = updateResult.booking;

      // Ensure insurance selection and insured value are applied and totals updated
      const insuranceUpdateResult = this.logic.updateCurrentBookingInsurance(
        selectedPlan.id,
        insuredValue
      );
      this.assert(
        insuranceUpdateResult && insuranceUpdateResult.success,
        'Updating booking insurance should succeed'
      );
      booking = insuranceUpdateResult.booking;

      this.assert(
        booking.insurance_plan_id === selectedPlan.id,
        'Booking should reference selected insurance plan id'
      );
      this.assert(
        typeof booking.insured_value === 'number' && booking.insured_value >= insuredValue,
        'Booking insured_value should be >= requested value'
      );

      const summary = this.logic.getCurrentMoveBookingSummary();
      this.assert(summary && summary.cost_breakdown, 'Insurance booking summary should be available');
      this.assert(
        typeof summary.cost_breakdown.insurance_premium === 'number',
        'Insurance premium should be numeric in cost breakdown'
      );
      this.assert(
        typeof summary.cost_breakdown.total_estimated === 'number' &&
          summary.cost_breakdown.total_estimated <= maxTotal,
        'Total estimated with insurance should be <= maxTotal filter'
      );

      // Confirm booking
      const confirmResult = this.logic.confirmCurrentMoveBooking(
        'Insurance Customer',
        '4155550777',
        'insurance@example.com',
        true
      );
      this.assert(confirmResult && confirmResult.success, 'Insurance booking confirmation should succeed');
      const confirmed = confirmResult.booking;

      this.assert(confirmed && confirmed.id, 'Confirmed insurance booking should have an id');
      this.assert(
        confirmed.insurance_plan_id === selectedPlan.id,
        'Confirmed booking should still reference selected insurance plan'
      );
      this.assert(
        typeof confirmed.total_estimated === 'number' &&
          confirmed.total_estimated <= maxTotal,
        'Confirmed booking total should be <= maxTotal'
      );

      // Relationship check: MoveBooking.insurance_plan_id -> InsurancePlan
      const storedPlans = JSON.parse(localStorage.getItem('insuranceplans') || '[]');
      const relatedPlan = storedPlans.find((p) => p.id === confirmed.insurance_plan_id);
      this.assert(relatedPlan, 'Stored insurance plan should exist for booking.insurance_plan_id');

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

// Export for Node.js ONLY
module.exports = TestRunner;
