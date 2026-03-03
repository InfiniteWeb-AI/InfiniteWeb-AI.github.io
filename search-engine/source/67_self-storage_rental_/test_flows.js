// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    const generatedData = {
      help_articles: [
        {
          id: 'ha_vehicle_storage_access_hours',
          title: 'Vehicle storage access hours and gate times',
          slug: 'vehicle-storage-access-hours',
          category: 'vehicle_storage',
          summary: 'Learn when you can access your stored vehicle, how gate hours work, and where 24-hour access is available.',
          content: 'You can access vehicle storage spaces during posted gate access hours at each facility. Gate access hours may differ from office hours.\n\nMost locations offer gate access between 6:00 AM and 10:00 PM, 7 days a week. Some facilities provide extended or 24-hour access upon request and approval.\n\n24-HOUR ACCESS\n- 24-hour access is not available at all facilities.\n- Where available, it may be limited to vehicle storage customers or certain unit types.\n- Additional verification and an access agreement may be required.\n\nHOW TO CHECK ACCESS HOURS FOR A SPECIFIC LOCATION\n1. Visit the location details page on our website.\n2. Look for the "Access Hours" section near the top of the page.\n3. If 24-hour access is available, it will be clearly labeled.\n4. If it is not listed, contact the facility directly using the phone number or contact form on the location page.\n\nVEHICLE STORAGE-SPECIFIC RULES\n- Vehicles must be operable, insured, and registered in the renter’s name (or with written authorization).\n- Overnight occupancy or living in a vehicle on-site is strictly prohibited.\n- After-hours access, where offered, is for quick visits to drop off or pick up your vehicle only.\n\nIf you have questions about 24-hour access or after-hours vehicle access fees at a specific facility, please contact that location directly or use the contact form in our Help Center.',
          keywords: [
            'vehicle storage',
            'vehicle storage access hours',
            'gate access hours',
            '24-hour access',
            'vehicle storage rules'
          ],
          is_featured: true,
          created_at: '2025-01-10T14:30:00Z',
          updated_at: '2025-11-05T09:15:00Z'
        },
        {
          id: 'ha_vehicle_storage_overview',
          title: 'Vehicle storage options: cars, RVs, boats, and trailers',
          slug: 'vehicle-storage-options',
          category: 'vehicle_storage',
          summary: 'Overview of available vehicle storage types, size suggestions, and basic requirements.',
          content: 'We offer several types of vehicle storage to fit different needs:\n\nTYPES OF VEHICLE STORAGE\n1. Outdoor uncovered parking\n   - Most common and budget-friendly option.\n   - Available in sizes such as 10x20, 10x25, and 12x40.\n2. Outdoor covered parking\n   - Offers shelter from sun and precipitation.\n   - Ideal for RVs, boats, and trailers.\n3. Enclosed drive-up units\n   - Fully enclosed storage similar to a garage.\n   - Available for smaller vehicles, motorcycles, and compact cars.\n\nTYPICAL SIZE GUIDELINES\n- Compact car: 10x15 or 10x20\n- Sedan or small SUV: 10x20\n- Large truck/SUV: 10x25\n- Class C RV or boat with trailer: 12x30\n- Large RV or bus: 12x35 or larger\n\nBASIC REQUIREMENTS\n- Current registration and proof of ownership.\n- Valid government-issued ID.\n- Proof of insurance where required by local regulations.\n- Vehicle must be in good working condition (no major leaks).\n\nBefore reserving, review the specific facility details to confirm that vehicle storage is available and that your vehicle will fit the space.',
          keywords: [
            'vehicle storage',
            'car storage',
            'rv storage',
            'boat storage',
            'trailer storage sizes'
          ],
          is_featured: false,
          created_at: '2024-09-01T10:00:00Z',
          updated_at: '2025-06-20T16:45:00Z'
        },
        {
          id: 'ha_access_hours_vs_office_hours',
          title: 'Access hours vs. office hours',
          slug: 'access-hours-vs-office-hours',
          category: 'access_hours',
          summary: 'Understand the difference between gate access hours and on-site office hours.',
          content: 'Each facility lists both gate access hours and office hours.\n\nACCESS HOURS (GATE HOURS)\n- Times when renters can enter the property using a gate code or access card.\n- Often 6:00 AM–10:00 PM, 7 days a week, but this varies by location.\n- Some facilities offer 24-hour gate access for approved customers.\n\nOFFICE HOURS\n- Times when staff are physically on-site and available to assist.\n- Usually within standard business hours (for example, 9:30 AM–6:00 PM on weekdays).\n- Office hours may be shorter on weekends or holidays.\n\nHOW TO CHECK HOURS\n- On the location details page, access hours and office hours appear near the top.\n- Holiday hours and special closures may be listed in the notes section.\n\nIf you need after-hours access or have questions about 24/7 availability, contact your facility directly or submit a request through our Help Center.',
          keywords: [
            'access hours',
            'office hours',
            'gate times',
            '24-hour access'
          ],
          is_featured: true,
          created_at: '2023-11-18T09:00:00Z',
          updated_at: '2025-03-03T12:00:00Z'
        }
      ],
      insurance_plans: [
        {
          id: 'ip_basic_1000',
          name: 'Basic Protection - 1,000 Coverage',
          description: 'Entry-level protection for smaller storage needs with 1,000 in coverage.',
          plan_type: 'protection_plan',
          coverage_amount: 1000,
          coverage_level_code: '1_000_coverage',
          monthly_premium: 9.0,
          provider_name: 'SecureStore Protection',
          is_default: false,
          is_active: true,
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2025-09-01T09:30:00Z'
        },
        {
          id: 'ip_value_3000_a',
          name: 'Value Insurance - 3,000 Coverage',
          description: 'Affordable insurance for most apartment-size storage needs, covering up to 3,000.',
          plan_type: 'insurance',
          coverage_amount: 3000,
          coverage_level_code: '3_000_coverage',
          monthly_premium: 13.0,
          provider_name: 'Allied Storage Insurance',
          is_default: true,
          is_active: true,
          created_at: '2024-01-10T10:05:00Z',
          updated_at: '2025-10-15T11:45:00Z'
        },
        {
          id: 'ip_value_3000_b',
          name: 'Preferred Protection - 3,000 Coverage',
          description: 'Facility-backed protection plan with 3,000 coverage and simple monthly billing.',
          plan_type: 'protection_plan',
          coverage_amount: 3000,
          coverage_level_code: '3_000_coverage',
          monthly_premium: 12.0,
          provider_name: 'SecureStore Protection',
          is_default: false,
          is_active: true,
          created_at: '2024-03-02T12:15:00Z',
          updated_at: '2025-11-20T08:10:00Z'
        }
      ],
      supplies_categories: [
        {
          id: 'boxes_packs',
          name: 'Boxes & Packs',
          slug: 'boxes_packs',
          description: 'Individual moving boxes, multi-pack bundles, and specialty carton kits.',
          sort_order: 1
        },
        {
          id: 'packing_supplies',
          name: 'Packing Supplies',
          slug: 'packing_supplies',
          description: 'Bubble wrap, packing paper, tape, and protective materials for fragile items.',
          sort_order: 2
        },
        {
          id: 'locks_security',
          name: 'Locks & Security',
          slug: 'locks_security',
          description: 'Disk locks, cylinder locks, and other security accessories for your unit.',
          sort_order: 3
        }
      ],
      unit_sizes: [
        {
          id: '5x5',
          label: '5x5',
          width_feet: 5,
          length_feet: 5,
          height_feet: 8,
          area_sq_ft: 25,
          size_category: 'small',
          description: 'Small closet-sized space ideal for boxes, seasonal items, or small furniture.',
          typical_contents: 'Several medium boxes, small bookshelf, seasonal décor, or sports gear.',
          sort_order: 1
        },
        {
          id: '5x10',
          label: '5x10',
          width_feet: 5,
          length_feet: 10,
          height_feet: 8,
          area_sq_ft: 50,
          size_category: 'small',
          description: 'Walk-in closet or small walk-in storage, great for a studio or 1-bedroom worth of items.',
          typical_contents: 'Mattress set, small sofa, dresser, TV stand, and several boxes.',
          sort_order: 2
        },
        {
          id: '5x15',
          label: '5x15',
          width_feet: 5,
          length_feet: 15,
          height_feet: 8,
          area_sq_ft: 75,
          size_category: 'small',
          description: 'Narrow but deeper space, ideal for long furniture pieces or narrow household loads.',
          typical_contents: 'Couch, dining set, bookcases, and 10–15 medium boxes.',
          sort_order: 3
        }
      ],
      size_guide_rules: [
        {
          id: 'sgr_studio_light',
          property_type: 'studio_apartment',
          required_items: [
            'twin_mattress',
            'small_sofa',
            'coffee_table',
            'tv_stand',
            'boxes_medium_10'
          ],
          recommended_unit_size_id: '5x10',
          notes: 'Typical studio with basic furniture and about 10 medium boxes. A 5x10 is usually sufficient if furniture can be stacked vertically.'
        },
        {
          id: 'sgr_1bedroom_standard',
          property_type: '1_bedroom_apartment',
          required_items: [
            'queen_mattress',
            'sofa',
            'dining_table',
            'tv_stand',
            'boxes_medium_5'
          ],
          recommended_unit_size_id: '5x10',
          notes: 'Standard 1-bedroom with a queen bed, small sofa, dining table, TV stand, and a few boxes. Consider the next larger size if you have bulky furniture or want extra aisle space.'
        },
        {
          id: 'sgr_1bedroom_full',
          property_type: '1_bedroom_apartment',
          required_items: [
            'queen_mattress',
            'sofa',
            'dining_table',
            'dresser',
            'nightstands_2',
            'boxes_medium_15'
          ],
          recommended_unit_size_id: '10x10',
          notes: 'Fully furnished 1-bedroom with dressers and 10–15 medium boxes. A 10x10 allows easier access and space for additional items.'
        }
      ],
      supplies_products: [
        {
          id: 'sp_box_med_bundle_10',
          category_id: 'boxes_packs',
          name: 'Medium Moving Box Bundle (10-Pack)',
          sku: 'BX-MED-B10',
          description: 'Ten medium cardboard boxes ideal for kitchen items, linens, toys, and small appliances.',
          product_type: 'box_bundle_medium',
          price: 24.0,
          original_price: 27.5,
          is_bundle: true,
          bundle_size: 10,
          dimensions: '18" x 18" x 16"',
          image_url: 'https://www.windermere.com/files/2021/06/boxes.jpg',
          is_active: true,
          created_at: '2024-09-01T10:00:00Z',
          updated_at: '2025-11-01T09:30:00Z'
        },
        {
          id: 'sp_box_small_single',
          category_id: 'boxes_packs',
          name: 'Small Moving Box',
          sku: 'BX-SML-S01',
          description: 'Single small box, great for books, canned goods, and heavy items.',
          product_type: 'box_single',
          price: 2.25,
          original_price: 2.25,
          is_bundle: false,
          bundle_size: 1,
          dimensions: '16" x 12" x 12"',
          image_url: 'https://i5.walmartimages.com/asr/131613ed-005c-40b9-8f19-bb44a5304f0f.eb892184bfc957662817e090b0660e26.jpeg?odnWidth=612u0026odnHeight=612u0026odnBg=ffffff',
          is_active: true,
          created_at: '2024-09-01T10:05:00Z',
          updated_at: '2025-08-15T14:10:00Z'
        },
        {
          id: 'sp_box_large_bundle_5',
          category_id: 'boxes_packs',
          name: 'Large Moving Box Bundle (5-Pack)',
          sku: 'BX-LRG-B05',
          description: 'Pack of five large boxes for bulky but lightweight items like bedding and pillows.',
          product_type: 'box_bundle_large',
          price: 22.0,
          original_price: 24.99,
          is_bundle: true,
          bundle_size: 5,
          dimensions: '24" x 18" x 18"',
          image_url: 'https://verifiedmovers.com/wp-content/uploads/2020/11/pexels-ketut-subiyanto-4246059-1-e1604838327749.jpg',
          is_active: true,
          created_at: '2024-09-01T10:10:00Z',
          updated_at: '2025-10-02T11:20:00Z'
        }
      ],
      units: [
        {
          id: 'unit_sf_mission_5x5_driveup',
          location_id: 'loc_sf_mission_24th',
          unit_size_id: '5x5',
          name: 'Drive-up 5x5',
          floor_level: 1,
          is_climate_controlled: false,
          has_drive_up_access: true,
          is_indoor: false,
          is_outdoor: true,
          suitable_for_vehicle_storage: false,
          door_type: 'roll_up',
          access_type: 'standard',
          monthly_rate: 55.0,
          standard_monthly_rate: 65.0,
          promotion_type: 'discounted_rate',
          promotion_description: 'Online special drive-up rate on select 5x5 units.',
          is_available: true,
          min_rental_term_months: 1,
          refundable_deposit_amount: 0,
          online_only_price: true,
          created_at: '2024-08-15T10:00:00Z',
          updated_at: '2025-11-10T09:30:00Z'
        },
        {
          id: 'unit_sf_mission_5x10_driveup',
          location_id: 'loc_sf_mission_24th',
          unit_size_id: '5x10',
          name: 'Drive-up 5x10',
          floor_level: 1,
          is_climate_controlled: false,
          has_drive_up_access: true,
          is_indoor: false,
          is_outdoor: true,
          suitable_for_vehicle_storage: false,
          door_type: 'roll_up',
          access_type: 'standard',
          monthly_rate: 75.0,
          standard_monthly_rate: 95.0,
          promotion_type: 'discounted_rate',
          promotion_description: 'Limited-time discounted rate on 5x10 drive-up storage.',
          is_available: true,
          min_rental_term_months: 1,
          refundable_deposit_amount: 0,
          online_only_price: true,
          created_at: '2024-08-15T10:05:00Z',
          updated_at: '2025-11-10T09:35:00Z'
        },
        {
          id: 'unit_sf_mission_10x10_cc',
          location_id: 'loc_sf_mission_24th',
          unit_size_id: '10x10',
          name: 'Indoor Climate-Controlled 10x10',
          floor_level: 2,
          is_climate_controlled: true,
          has_drive_up_access: false,
          is_indoor: true,
          is_outdoor: false,
          suitable_for_vehicle_storage: false,
          door_type: 'roll_up',
          access_type: 'standard',
          monthly_rate: 165.0,
          standard_monthly_rate: 185.0,
          promotion_type: 'online_price',
          promotion_description: 'Lower online rate when you reserve a 10x10 climate-controlled unit.',
          is_available: true,
          min_rental_term_months: 1,
          refundable_deposit_amount: 25.0,
          online_only_price: true,
          created_at: '2024-08-20T14:10:00Z',
          updated_at: '2025-10-02T16:20:00Z'
        }
      ],
      locations: [
        {
          id: 'loc_sf_mission_24th',
          name: 'Mission 24th Street Storage',
          slug: 'mission-24th-street-storage-san-francisco-94110',
          address_line1: '2600 Mission St',
          address_line2: '',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94110',
          country: 'US',
          latitude: 37.7524,
          longitude: -122.4184,
          phone: '(415) 555-0124',
          rating: 4.4,
          rating_count: 210,
          offers_24_hour_access: false,
          office_hours_description: 'Office: Mon–Fri 9:30am–6:00pm; Sat–Sun 9:00am–5:00pm',
          access_hours_description: 'Gate access: Daily 6:00am–10:00pm',
          primary_promotions_summary: 'Online-only rates on select drive-up units',
          distance_miles_from_search: 0.3,
          created_at: '2023-11-15T10:00:00Z',
          updated_at: '2025-11-05T09:30:00Z',
          has_climate_controlled_units: true,
          offers_vehicle_storage: false,
          has_promotions: true
        },
        {
          id: 'loc_nyc_chelsea_10001',
          name: 'Chelsea Storage - 28th & 8th',
          slug: 'chelsea-storage-28th-8th-new-york-10001',
          address_line1: '305 W 28th St',
          address_line2: '',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
          latitude: 40.7487,
          longitude: -73.9972,
          phone: '(212) 555-0188',
          rating: 4.8,
          rating_count: 340,
          offers_24_hour_access: false,
          office_hours_description: 'Office: Mon–Fri 9:00am–6:30pm; Sat–Sun 9:00am–5:00pm',
          access_hours_description: 'Gate access: Daily 6:00am–10:00pm',
          primary_promotions_summary: 'Climate controlled • Online specials available',
          distance_miles_from_search: 0.4,
          created_at: '2023-10-20T09:15:00Z',
          updated_at: '2025-10-12T14:05:00Z',
          has_climate_controlled_units: true,
          offers_vehicle_storage: false,
          has_promotions: true
        },
        {
          id: 'loc_atl_midtown_30309',
          name: 'Midtown Atlanta Storage',
          slug: 'midtown-atlanta-storage-30309',
          address_line1: '1200 Peachtree St NE',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30309',
          country: 'US',
          latitude: 33.7925,
          longitude: -84.3875,
          phone: '(404) 555-0142',
          rating: 4.5,
          rating_count: 185,
          offers_24_hour_access: false,
          office_hours_description: 'Office: Mon–Fri 9:30am–6:00pm; Sat 9:00am–5:30pm; Sun 10:00am–4:00pm',
          access_hours_description: 'Gate access: Daily 6:00am–10:00pm',
          primary_promotions_summary: 'Drive-up deals on 10x10 & 5x15 units',
          distance_miles_from_search: 0.2,
          created_at: '2024-01-05T13:00:00Z',
          updated_at: '2025-09-28T11:40:00Z',
          has_climate_controlled_units: true,
          offers_vehicle_storage: false,
          has_promotions: true
        }
      ],
      tour_slots: [
        {
          id: 'ts_sea_queen_20260510_1100_inperson',
          location_id: 'loc_seattle_queen_anne',
          start_time: '2026-05-10T11:00:00Z',
          end_time: '2026-05-10T11:30:00Z',
          visit_type: 'in_person_tour',
          is_booked: true
        },
        {
          id: 'ts_sea_queen_20260510_1300_virtual',
          location_id: 'loc_seattle_queen_anne',
          start_time: '2026-05-10T13:00:00Z',
          end_time: '2026-05-10T13:30:00Z',
          visit_type: 'virtual_tour',
          is_booked: false
        },
        {
          id: 'ts_sea_queen_20260510_1400_inperson',
          location_id: 'loc_seattle_queen_anne',
          start_time: '2026-05-10T14:00:00Z',
          end_time: '2026-05-10T14:30:00Z',
          visit_type: 'in_person_tour',
          is_booked: false
        }
      ],
      tour_appointments: [
        {
          id: 'ta_sea_queen_20260510_1100_j_smith',
          location_id: 'loc_seattle_queen_anne',
          tour_slot_id: 'ts_sea_queen_20260510_1100_inperson',
          visit_type: 'in_person_tour',
          visitor_name: 'Jordan Smith',
          visitor_phone: '555-201-4433',
          visitor_email: 'jordan.smith@example.com',
          status: 'scheduled',
          notes: 'Wants to see 5x10 and 10x10 climate-controlled units.',
          created_at: '2026-03-01T15:20:00Z'
        },
        {
          id: 'ta_sea_lake_20260510_1000_a_nguyen',
          location_id: 'loc_seattle_lake_union',
          tour_slot_id: 'ts_sea_lake_20260510_1000_inperson',
          visit_type: 'in_person_tour',
          visitor_name: 'Alex Nguyen',
          visitor_phone: '555-310-7789',
          visitor_email: 'alex.nguyen@example.com',
          status: 'scheduled',
          notes: 'Comparing rates with Ballard location.',
          created_at: '2026-02-25T18:05:00Z'
        },
        {
          id: 'ta_austin_dt_20260510_1100_r_garcia',
          location_id: 'loc_austin_downtown',
          tour_slot_id: 'ts_austin_dt_20260510_1100_inperson',
          visit_type: 'in_person_tour',
          visitor_name: 'Riley Garcia',
          visitor_phone: '555-442-1188',
          visitor_email: 'riley.garcia@example.com',
          status: 'scheduled',
          notes: 'Interested in vehicle parking and 10x20 drive-up units.',
          created_at: '2026-02-28T14:40:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:58.674320'
      }
    };

    if (typeof localStorage === 'undefined' || !localStorage || typeof localStorage.setItem !== 'function') {
      throw new Error('localStorage is not available');
    }

    localStorage.setItem('help_articles', JSON.stringify(generatedData.help_articles || []));
    localStorage.setItem('insurance_plans', JSON.stringify(generatedData.insurance_plans || []));
    localStorage.setItem('supplies_categories', JSON.stringify(generatedData.supplies_categories || []));
    localStorage.setItem('unit_sizes', JSON.stringify(generatedData.unit_sizes || []));
    localStorage.setItem('size_guide_rules', JSON.stringify(generatedData.size_guide_rules || []));
    localStorage.setItem('supplies_products', JSON.stringify(generatedData.supplies_products || []));
    localStorage.setItem('units', JSON.stringify(generatedData.units || []));
    localStorage.setItem('locations', JSON.stringify(generatedData.locations || []));
    localStorage.setItem('tour_slots', JSON.stringify(generatedData.tour_slots || []));
    localStorage.setItem('tour_appointments', JSON.stringify(generatedData.tour_appointments || []));

    // Initialize empty collections for entities without pre-generated data
    if (!localStorage.getItem('reservations')) {
      localStorage.setItem('reservations', JSON.stringify([]));
    }
    if (!localStorage.getItem('reservation_insurance_selections')) {
      localStorage.setItem('reservation_insurance_selections', JSON.stringify([]));
    }
    if (!localStorage.getItem('preferred_locations')) {
      localStorage.setItem('preferred_locations', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart')) {
      // Let business logic create cart structure as needed
      localStorage.setItem('cart', JSON.stringify(null));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_messages')) {
      localStorage.setItem('contact_messages', JSON.stringify([]));
    }
  }

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_ReserveCheapestSmallDriveUpUnit();
    this.testTask2_SetBestRatedPreferredLocation();
    this.testTask3_SizeGuideNextLargerUnitUnder150();
    this.testTask4_ReserveClimateControlledPromoUnitUnder180();
    this.testTask5_AddLowestCost3000CoverageInsurance();
    this.testTask6_AddMovingSuppliesUnder60();
    this.testTask7_SubmitContactFormVehicleStorageAccess();
    this.testTask8_BookInPersonTourAfternoonSlot();

    return this.results;
  }

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

  // Task 1: Reserve the cheapest small drive-up unit under $80/month near ZIP 94110
  testTask1_ReserveCheapestSmallDriveUpUnit() {
    const testName = 'Task 1: Reserve cheapest small drive-up unit under max rate';
    try {
      this.clearStorage();
      this.setupTestData();

      const searchTerm = '94110';
      const filters = {
        sizeCategory: 'small',
        hasDriveUpAccess: true,
        onlyAvailable: true,
        maxMonthlyRate: 80
      };
      const sortBy = 'price_low_to_high';

      const searchResult = this.logic.searchUnitsNearby(searchTerm, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchUnitsNearby should return results array');

      const eligibleUnits = searchResult.results.filter(function (u) {
        return u.is_available && u.has_drive_up_access && u.size_category === 'small' && typeof u.monthly_rate === 'number' && u.monthly_rate <= 80;
      });

      this.assert(eligibleUnits.length > 0, 'Should have at least one eligible small drive-up unit under max rate');

      const chosenUnit = eligibleUnits[0];

      const startRes = this.logic.startReservationForUnit(chosenUnit.unit_id);
      this.assert(startRes && startRes.reservation_id, 'startReservationForUnit should return reservation_id');
      const reservationId = startRes.reservation_id;

      this.assert(startRes.unit_summary && startRes.unit_summary.unit_id === chosenUnit.unit_id, 'Reservation unit should match selected unit');
      this.assert(startRes.location_summary && startRes.location_summary.location_id === chosenUnit.location_id, 'Reservation location should match selected unit location');

      const moveInDate = '2026-04-15';
      const contactName = 'Task1 User';
      const contactPhone = '555-000-0001';
      const contactEmail = 'task1.user@example.com';
      const paymentOption = 'pay_at_move_in';

      const updateRes = this.logic.updateReservationDetails(
        reservationId,
        moveInDate,
        contactName,
        contactPhone,
        contactEmail,
        paymentOption
      );

      this.assert(updateRes && updateRes.reservation_id === reservationId, 'updateReservationDetails should return same reservation_id');
      this.assert(updateRes.move_in_date === moveInDate, 'Move-in date should be set as requested');
      this.assert(updateRes.payment_option === paymentOption, 'Payment option should match selection');

      const finalizeRes = this.logic.finalizeReservation(reservationId);
      this.assert(finalizeRes && finalizeRes.success === true, 'Reservation should finalize successfully');
      this.assert(finalizeRes.status === 'confirmed', 'Finalized reservation status should be confirmed');
      this.assert(typeof finalizeRes.confirmation_number === 'string' && finalizeRes.confirmation_number.length > 0, 'Confirmation number should be present');

      const summary = this.logic.getReservationSummary(reservationId);
      this.assert(summary && summary.reservation_id === reservationId, 'getReservationSummary should return same reservation');
      this.assert(summary.status === 'confirmed', 'Reservation summary status should be confirmed');
      this.assert(summary.move_in_date === moveInDate, 'Reservation summary move-in date should match');
      this.assert(summary.payment_option === paymentOption, 'Reservation summary payment option should match');

      this.assert(summary.unit_summary && typeof summary.unit_summary.monthly_rate_at_booking === 'number', 'Reservation summary should include monthly_rate_at_booking');
      this.assert(summary.unit_summary.monthly_rate_at_booking <= 80, 'Booked monthly rate should be under or equal to max');

      this.assert(
        summary.location_summary && summary.location_summary.location_id === chosenUnit.location_id,
        'Reservation location in summary should match chosen unit location'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Set the best-rated nearby location as preferred
  testTask2_SetBestRatedPreferredLocation() {
    const testName = 'Task 2: Set best-rated nearby location as preferred';
    try {
      this.clearStorage();
      this.setupTestData();

      const searchTerm = '10001';
      const maxDistanceMiles = 10;
      const filters = {
        hasClimateControlledUnits: true,
        minRating: 4.5
      };
      const sortBy = 'rating_high_to_low';

      const locSearch = this.logic.searchLocationsNearby(searchTerm, maxDistanceMiles, filters, sortBy);
      this.assert(locSearch && Array.isArray(locSearch.results), 'searchLocationsNearby should return results array');
      this.assert(locSearch.results.length > 0, 'Should return at least one qualifying location for 10001');

      const topLocation = locSearch.results[0];
      this.assert(typeof topLocation.rating === 'number', 'Top location should have a rating');
      this.assert(topLocation.rating >= 4.5, 'Top location rating should be at least 4.5');
      this.assert(topLocation.has_climate_controlled_units === true, 'Top location should have climate-controlled units');

      const locDetails = this.logic.getLocationDetails(topLocation.location_id);
      this.assert(locDetails && locDetails.location_id === topLocation.location_id, 'getLocationDetails should return matching location');
      this.assert(locDetails.rating === topLocation.rating, 'Location details rating should match search result');

      const setPref = this.logic.setPreferredLocation(topLocation.location_id);
      this.assert(setPref && setPref.preferred_location_id === topLocation.location_id, 'Preferred location id should match chosen location');

      const currentPref = this.logic.getPreferredLocation();
      this.assert(currentPref && currentPref.has_preferred_location === true, 'Preferred location should be set');
      this.assert(currentPref.preferred_location && currentPref.preferred_location.location_id === topLocation.location_id, 'Preferred location record should match chosen location');

      const prefSummary = this.logic.getPreferredLocationSummary();
      this.assert(prefSummary && prefSummary.has_preferred_location === true, 'Preferred location summary should indicate preferred location');
      this.assert(prefSummary.location_id === topLocation.location_id, 'Preferred location summary id should match chosen location');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Use size guide to reserve next larger unit under $150/month
  testTask3_SizeGuideNextLargerUnitUnder150() {
    const testName = 'Task 3: Size guide next larger unit under 150';
    try {
      this.clearStorage();
      this.setupTestData();

      const propertyType = '1_bedroom_apartment';
      const selectedItems = [
        'queen_mattress',
        'sofa',
        'dining_table',
        'tv_stand',
        'boxes_medium_5'
      ];

      const recommendation = this.logic.calculateRecommendedUnitSize(propertyType, selectedItems);
      this.assert(recommendation && recommendation.recommended_size, 'Should return a recommended size');
      const recommendedSize = recommendation.recommended_size;
      const surrounding = Array.isArray(recommendation.surrounding_sizes) ? recommendation.surrounding_sizes : [];

      let nextLarger = null;
      for (let i = 0; i < surrounding.length; i += 1) {
        if (surrounding[i].is_next_larger_than_recommended) {
          nextLarger = surrounding[i];
          break;
        }
      }
      if (!nextLarger) {
        nextLarger = recommendedSize;
      }

      const searchZip = '30309';
      let sizeForSearch = nextLarger;
      let locSearch = this.logic.searchLocationsForUnitSize(searchZip, sizeForSearch.unit_size_id, undefined, 'distance');

      if (!locSearch || !Array.isArray(locSearch.results) || locSearch.results.length === 0) {
        sizeForSearch = recommendedSize;
        locSearch = this.logic.searchLocationsForUnitSize(searchZip, sizeForSearch.unit_size_id, undefined, 'distance');
      }

      this.assert(locSearch && Array.isArray(locSearch.results) && locSearch.results.length > 0, 'Should find at least one location offering selected size');

      const chosenLocation = locSearch.results[0];
      const locationId = chosenLocation.location_id;
      const sizeLabel = sizeForSearch.label;

      const unitFilters = {
        unitSizeLabels: [sizeLabel],
        onlyAvailable: true,
        maxMonthlyRate: 150
      };

      const unitsResult = this.logic.getLocationUnits(locationId, unitFilters, 'price_low_to_high');
      this.assert(unitsResult && Array.isArray(unitsResult.units), 'getLocationUnits should return units array');

      const affordableUnits = unitsResult.units.filter(function (u) {
        return u.is_available && typeof u.monthly_rate === 'number' && u.monthly_rate <= 150;
      });

      this.assert(affordableUnits.length > 0, 'Should find at least one available unit under or equal to 150 for chosen size');

      const chosenUnit = affordableUnits[0];

      const startRes = this.logic.startReservationForUnit(chosenUnit.unit_id);
      this.assert(startRes && startRes.reservation_id, 'startReservationForUnit should create reservation');
      const reservationId = startRes.reservation_id;

      this.assert(startRes.unit_summary && startRes.unit_summary.unit_size_label === chosenUnit.unit_size_label, 'Reservation unit size label should match chosen unit');
      this.assert(startRes.unit_summary.monthly_rate === chosenUnit.monthly_rate, 'Reservation unit monthly rate should match chosen unit monthly rate');

      const summary = this.logic.getReservationSummary(reservationId);
      this.assert(summary && summary.status === 'pending', 'New reservation from size guide should be pending');
      this.assert(summary.unit_summary.monthly_rate_at_booking <= 150, 'Monthly rate at booking should be under or equal to 150');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Reserve a climate-controlled 10x10+ unit with promotion under $180/month (adapted to available data)
  testTask4_ReserveClimateControlledPromoUnitUnder180() {
    const testName = 'Task 4: Reserve climate-controlled promo unit under 180';
    try {
      this.clearStorage();
      this.setupTestData();

      const searchTerm = '94110';
      const filters = {
        isClimateControlled: true,
        onlyAvailable: true,
        promotionTypes: ['online_price'],
        maxMonthlyRate: 180
      };
      const sortBy = 'price_low_to_high';

      const searchResult = this.logic.searchUnitsNearby(searchTerm, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchUnitsNearby should return results array');

      const qualifyingUnits = searchResult.results.filter(function (u) {
        return u.is_available && u.is_climate_controlled && typeof u.monthly_rate === 'number' && u.monthly_rate <= 180;
      });

      this.assert(qualifyingUnits.length > 0, 'Should find at least one climate-controlled promotional unit under max rate');

      const chosenUnit = qualifyingUnits[0];

      const startRes = this.logic.startReservationForUnit(chosenUnit.unit_id);
      this.assert(startRes && startRes.reservation_id, 'startReservationForUnit should return reservation_id');
      const reservationId = startRes.reservation_id;

      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const nextMonthIndex = (month + 1) % 12;
      const nextMonthYear = month === 11 ? year + 1 : year;
      const monthStr = (nextMonthIndex + 1).toString().padStart(2, '0');
      const moveInDate = nextMonthYear.toString() + '-' + monthStr + '-01';

      const contactName = 'Task4 User';
      const contactPhone = '555-000-0004';
      const contactEmail = 'task4.user@example.com';
      const paymentOption = 'pay_at_move_in';

      const updateRes = this.logic.updateReservationDetails(
        reservationId,
        moveInDate,
        contactName,
        contactPhone,
        contactEmail,
        paymentOption
      );

      this.assert(updateRes && updateRes.reservation_id === reservationId, 'updateReservationDetails should return same reservation_id');
      this.assert(updateRes.move_in_date === moveInDate, 'Move-in date should be 1st of next month');

      const finalizeRes = this.logic.finalizeReservation(reservationId);
      this.assert(finalizeRes && finalizeRes.success === true, 'Reservation finalization should succeed');
      this.assert(finalizeRes.status === 'confirmed', 'Reservation status should be confirmed');

      const summary = this.logic.getReservationSummary(reservationId);
      this.assert(summary && summary.status === 'confirmed', 'Reservation summary should be confirmed');
      this.assert(summary.move_in_date === moveInDate, 'Summary move-in date should match selected');
      this.assert(summary.unit_summary && typeof summary.unit_summary.monthly_rate_at_booking === 'number', 'Summary must include monthly_rate_at_booking');
      this.assert(summary.unit_summary.monthly_rate_at_booking <= 180, 'Booked climate-controlled unit rate should be under or equal to max');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Add the lowest-cost $3,000 coverage insurance plan to a new reservation
  testTask5_AddLowestCost3000CoverageInsurance() {
    const testName = 'Task 5: Add lowest-cost 3000 coverage insurance plan';
    try {
      this.clearStorage();
      this.setupTestData();

      const searchTerm = '10001';
      const maxDistanceMiles = 10;
      const locSearch = this.logic.searchLocationsNearby(searchTerm, maxDistanceMiles, undefined, 'distance');
      this.assert(locSearch && Array.isArray(locSearch.results) && locSearch.results.length > 0, 'Should find at least one location near ZIP');

      const chosenLocation = locSearch.results[0];
      const locationId = chosenLocation.location_id;

      const unitFilters = {
        onlyAvailable: true
      };
      const unitsResult = this.logic.getLocationUnits(locationId, unitFilters, 'price_low_to_high');
      this.assert(unitsResult && Array.isArray(unitsResult.units) && unitsResult.units.length > 0, 'Chosen location should have units');

      const chosenUnit = unitsResult.units[0];

      const startRes = this.logic.startReservationForUnit(chosenUnit.unit_id);
      this.assert(startRes && startRes.reservation_id, 'startReservationForUnit should create reservation');
      const reservationId = startRes.reservation_id;

      const plansResult = this.logic.getAvailableInsurancePlansForReservation(reservationId);
      this.assert(plansResult && Array.isArray(plansResult.plans), 'Should return list of insurance plans');
      this.assert(plansResult.plans.length > 0, 'There should be at least one insurance plan');

      const coverage3000Plans = plansResult.plans.filter(function (p) {
        return p.coverage_level_code === '3_000_coverage' || p.coverage_amount === 3000;
      });
      this.assert(coverage3000Plans.length > 0, 'Should have at least one 3000 coverage plan');

      let cheapestPlan = coverage3000Plans[0];
      for (let i = 1; i < coverage3000Plans.length; i += 1) {
        if (coverage3000Plans[i].monthly_premium < cheapestPlan.monthly_premium) {
          cheapestPlan = coverage3000Plans[i];
        }
      }

      const selectRes = this.logic.selectReservationInsurancePlan(reservationId, cheapestPlan.insurance_plan_id);
      this.assert(selectRes && selectRes.reservation_id === reservationId, 'selectReservationInsurancePlan should return same reservation_id');
      this.assert(selectRes.has_insurance === true, 'Reservation should indicate insurance selected');
      this.assert(selectRes.selected_insurance && selectRes.selected_insurance.coverage_amount === cheapestPlan.coverage_amount, 'Selected insurance coverage amount should match chosen plan');
      this.assert(selectRes.selected_insurance.monthly_premium === cheapestPlan.monthly_premium, 'Selected insurance premium should match cheapest plan premium');

      const summary = this.logic.getReservationSummary(reservationId);
      this.assert(summary && summary.has_insurance === true, 'Reservation summary should show insurance selected');
      this.assert(summary.selected_insurance && summary.selected_insurance.coverage_amount === cheapestPlan.coverage_amount, 'Summary coverage amount should match chosen plan');
      this.assert(summary.selected_insurance.monthly_premium === cheapestPlan.monthly_premium, 'Summary monthly premium should match chosen plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Add specific moving supplies to cart while keeping total under $60 (adapted to available products)
  testTask6_AddMovingSuppliesUnder60() {
    const testName = 'Task 6: Add moving supplies to cart under total limit';
    try {
      this.clearStorage();
      this.setupTestData();

      const categoriesOverview = this.logic.getSuppliesCategoriesWithHighlights();
      this.assert(categoriesOverview && Array.isArray(categoriesOverview.categories), 'Should return supplies categories');

      const boxesCategory = categoriesOverview.categories.find(function (c) {
        return c.slug === 'boxes_packs';
      });
      this.assert(boxesCategory, 'Boxes & Packs category should exist');
      const boxesCategoryId = boxesCategory.category_id || boxesCategory.id || 'boxes_packs';

      const mediumBoxesResult = this.logic.getSuppliesProducts(boxesCategoryId, { maxPrice: 25, productTypes: ['box_bundle_medium'] }, 'price_low_to_high');
      this.assert(mediumBoxesResult && Array.isArray(mediumBoxesResult.products) && mediumBoxesResult.products.length > 0, 'Should find at least one medium box bundle under or equal to 25');
      const mediumBundle = mediumBoxesResult.products[0];

      const cheapBoxesResult = this.logic.getSuppliesProducts(boxesCategoryId, { maxPrice: 10 }, 'price_low_to_high');
      this.assert(cheapBoxesResult && Array.isArray(cheapBoxesResult.products) && cheapBoxesResult.products.length > 0, 'Should find at least one low-cost boxes product under or equal to 10');
      const bubbleAnalog = cheapBoxesResult.products[0];

      const allBoxes = this.logic.getSuppliesProducts(boxesCategoryId, undefined, 'price_low_to_high');
      this.assert(allBoxes && Array.isArray(allBoxes.products) && allBoxes.products.length > 0, 'Should be able to list all boxes products');
      const thirdProduct = allBoxes.products.find(function (p) {
        return p.product_id !== mediumBundle.product_id && p.product_id !== bubbleAnalog.product_id;
      }) || allBoxes.products[0];

      const add1 = this.logic.addSuppliesProductToCart(mediumBundle.product_id, 1);
      this.assert(add1 && add1.success === true, 'Adding medium bundle to cart should succeed');

      const add2 = this.logic.addSuppliesProductToCart(bubbleAnalog.product_id, 1);
      this.assert(add2 && add2.success === true, 'Adding bubble-wrap-analog product to cart should succeed');

      const add3 = this.logic.addSuppliesProductToCart(thirdProduct.product_id, 1);
      this.assert(add3 && add3.success === true, 'Adding third product to cart should succeed');

      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && Array.isArray(cartDetails.items), 'Cart details should include items array');
      this.assert(cartDetails.items.length >= 3, 'Cart should contain at least three line items');

      const subtotal = cartDetails.subtotal;
      this.assert(typeof subtotal === 'number', 'Cart subtotal should be numeric');
      this.assert(subtotal < 60, 'Combined cart total should remain under 60');

      const productIdsInCart = cartDetails.items.map(function (i) { return i.product_id; });
      this.assert(productIdsInCart.indexOf(mediumBundle.product_id) !== -1, 'Cart should contain medium box bundle');
      this.assert(productIdsInCart.indexOf(bubbleAnalog.product_id) !== -1, 'Cart should contain bubble-wrap-analog product');
      this.assert(productIdsInCart.indexOf(thirdProduct.product_id) !== -1, 'Cart should contain third product');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Submit a contact form question about 24-hour vehicle storage access at a specific location
  testTask7_SubmitContactFormVehicleStorageAccess() {
    const testName = 'Task 7: Submit contact form about vehicle storage access';
    try {
      this.clearStorage();
      this.setupTestData();

      const query = 'vehicle storage access hours';
      const searchResult = this.logic.searchHelpArticles(query, undefined);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchHelpArticles should return results array');
      this.assert(searchResult.results.length > 0, 'Help search should return at least one article');

      const article = searchResult.results.find(function (a) {
        return typeof a.title === 'string' && a.title.toLowerCase().indexOf('vehicle storage') !== -1;
      }) || searchResult.results[0];

      const articleDetails = this.logic.getHelpArticleDetails(article.article_id);
      this.assert(articleDetails && articleDetails.article_id === article.article_id, 'getHelpArticleDetails should return full article');

      const topic = 'access_hours_and_security';
      const message = 'Hi, I would like to know whether 24-hour access is available for vehicle storage at the Dallas, TX Main Street location, and whether there are any extra fees for after-hours access.';
      const name = 'Jordan Lee';
      const email = 'jordan.lee@example.com';
      const relatedLocationName = 'Dallas, TX Main Street';

      const submitRes = this.logic.submitContactMessage(topic, message, name, email, relatedLocationName);
      this.assert(submitRes && typeof submitRes.contact_message_id === 'string', 'submitContactMessage should return contact_message_id');
      this.assert(submitRes.status === 'new', 'New contact message should have status new');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Book an in-person facility tour at afternoon time slot
  testTask8_BookInPersonTourAfternoonSlot() {
    const testName = 'Task 8: Book in-person tour afternoon slot';
    try {
      this.clearStorage();
      this.setupTestData();

      const tourSlotsRaw = localStorage.getItem('tour_slots');
      const tourSlots = tourSlotsRaw ? JSON.parse(tourSlotsRaw) : [];
      this.assert(Array.isArray(tourSlots) && tourSlots.length > 0, 'Pre-generated tour slots should exist');

      const targetDateString = '2026-05-10';
      const locationId = tourSlots[0].location_id;

      const availability = this.logic.getTourAvailability(locationId, targetDateString, 'in_person_tour');
      this.assert(availability && Array.isArray(availability.available_slots), 'getTourAvailability should return available_slots array');

      const availableAfternoon = availability.available_slots.filter(function (slot) {
        if (slot.is_booked) {
          return false;
        }
        const d = new Date(slot.start_time);
        const hour = d.getUTCHours();
        return hour >= 14 && hour <= 17;
      });

      this.assert(availableAfternoon.length > 0, 'There should be at least one unbooked in-person slot between 2pm and 5pm');

      availableAfternoon.sort(function (a, b) {
        const ta = new Date(a.start_time).getTime();
        const tb = new Date(b.start_time).getTime();
        return ta - tb;
      });

      const chosenSlot = availableAfternoon[0];

      const visitorName = 'Alex Morgan';
      const visitorPhone = '555-123-4567';
      const visitorEmail = 'alex.morgan@example.com';

      const bookRes = this.logic.bookTourAppointment(chosenSlot.tour_slot_id, visitorName, visitorPhone, visitorEmail);
      this.assert(bookRes && bookRes.success === true, 'bookTourAppointment should succeed');
      this.assert(bookRes.status === 'scheduled', 'Booked tour appointment should be scheduled');
      this.assert(bookRes.location_id === locationId, 'Booked appointment location should match slot location');
      this.assert(bookRes.start_time === chosenSlot.start_time, 'Appointment start time should match chosen slot');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

module.exports = TestRunner;
