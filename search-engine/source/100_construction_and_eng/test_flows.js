// Test runner for business logic (construction & engineering services site)
// NOTE: Designed for Node.js, CommonJS export only.

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
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided

    const generatedData = {
      branches: [
        {
          id: 'sf_bay_area',
          name: 'San Francisco Bay Area Branch',
          address_line1: '250 King St',
          address_line2: 'Suite 300',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94107',
          country: 'USA',
          phone_number: '+1 (415) 555-0101',
          email: 'sf@acmeconstruct.com',
          latitude: 37.7764,
          longitude: -122.3949,
          service_coverage_description: 'Serving San Francisco, Oakland, and surrounding Bay Area within 50 km.',
          is_active: true
        },
        {
          id: 'oakland_east_bay',
          name: 'Oakland East Bay Branch',
          address_line1: '1800 Broadway',
          address_line2: 'Floor 5',
          city: 'Oakland',
          state: 'CA',
          postal_code: '94612',
          country: 'USA',
          phone_number: '+1 (510) 555-0120',
          email: 'oakland@acmeconstruct.com',
          latitude: 37.8044,
          longitude: -122.2711,
          service_coverage_description: 'East Bay commercial, industrial, and public projects.',
          is_active: true
        },
        {
          id: 'south_bay_san_jose',
          name: 'South Bay / San Jose Branch',
          address_line1: '99 W San Fernando St',
          address_line2: 'Suite 450',
          city: 'San Jose',
          state: 'CA',
          postal_code: '95113',
          country: 'USA',
          phone_number: '+1 (408) 555-0134',
          email: 'sanjose@acmeconstruct.com',
          latitude: 37.3382,
          longitude: -121.8863,
          service_coverage_description: 'Covering Silicon Valley industrial and commercial facilities.',
          is_active: true
        }
      ],
      budget_range_options: [
        {
          id: 'db_500k_800k',
          label: '$500,000–$800,000',
          min_amount: 500000,
          max_amount: 800000,
          applies_to: 'contact_design_build',
          is_default: false
        },
        {
          id: 'db_800k_1500k',
          label: '$800,000–$1,500,000',
          min_amount: 800000,
          max_amount: 1500000,
          applies_to: 'contact_design_build',
          is_default: false
        },
        {
          id: 'db_1500k_5000k',
          label: '$1,500,000–$5,000,000',
          min_amount: 1500000,
          max_amount: 5000000,
          applies_to: 'contact_design_build',
          is_default: false
        }
      ],
      equipment_categories: [
        {
          id: 'earthmoving',
          name: 'Earthmoving',
          code: 'earthmoving',
          description: 'Excavators, bulldozers, loaders, and other earthmoving equipment.',
          is_active: true
        },
        {
          id: 'concrete_equipment',
          name: 'Concrete Equipment',
          code: 'concrete_equipment',
          description: 'Concrete mixers, pumps, vibrators, and finishing tools.',
          is_active: true
        },
        {
          id: 'lifting',
          name: 'Lifting Equipment',
          code: 'lifting',
          description: 'Cranes, telehandlers, forklifts, and material hoists.',
          is_active: true
        }
      ],
      maintenance_programs: [
        {
          id: 'ind_fast_plus',
          name: 'Industrial Rapid Response Plus',
          facility_type: 'industrial',
          description: 'Comprehensive maintenance for heavy industrial facilities with 24/7 dispatch and extended equipment warranty.',
          monthly_fee: 1400,
          emergency_response_time: 'up_to_2_hours',
          warranty_length_months: 120,
          min_contract_term_months: 36,
          includes_parts: true,
          includes_labor: true,
          is_active: true
        },
        {
          id: 'ind_fast_standard',
          name: 'Industrial Rapid Response Standard',
          facility_type: 'industrial',
          description: 'Core mechanical, electrical, and HVAC coverage with 2-hour emergency response during business hours.',
          monthly_fee: 1100,
          emergency_response_time: 'up_to_2_hours',
          warranty_length_months: 72,
          min_contract_term_months: 24,
          includes_parts: true,
          includes_labor: true,
          is_active: true
        },
        {
          id: 'ind_fast_basic',
          name: 'Industrial Essential Care',
          facility_type: 'industrial',
          description: 'Preventive maintenance for critical systems with priority 2-hour response for covered equipment.',
          monthly_fee: 900,
          emergency_response_time: 'up_to_2_hours',
          warranty_length_months: 48,
          min_contract_term_months: 12,
          includes_parts: false,
          includes_labor: true,
          is_active: true
        }
      ],
      project_case_studies: [
        {
          id: 'tx_hospital_2024',
          name: 'North Texas Medical Pavilion Expansion',
          sector: 'healthcare',
          project_type: 'hospital',
          description: 'Design-build expansion of a regional medical pavilion including a new surgical tower, imaging suites, and centralized mechanical plant.',
          location_city: 'Dallas',
          location_state: 'TX',
          location_country: 'USA',
          completion_year: 2024,
          completion_date: '2024-08-20T00:00:00Z',
          budget: 98000000,
          size_sq_ft: 420000,
          client_name: 'North Texas Health System',
          is_featured: true,
          image_urls: [
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'tx_hospital_2023',
          name: 'Lone Star Regional Medical Center Expansion',
          sector: 'healthcare',
          project_type: 'hospital',
          description: 'Multi-phase expansion of an urban medical campus including emergency department upgrades and new patient tower.',
          location_city: 'Houston',
          location_state: 'TX',
          location_country: 'USA',
          completion_year: 2023,
          completion_date: '2023-10-15T00:00:00Z',
          budget: 125000000,
          size_sq_ft: 550000,
          client_name: 'Lone Star Regional Health',
          is_featured: true,
          image_urls: [
            'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        },
        {
          id: 'tx_hospital_2021',
          name: 'Hill Country Community Hospital Modernization',
          sector: 'healthcare',
          project_type: 'hospital',
          description: 'Complete modernization of a community hospital with new ICU, imaging, and support spaces.',
          location_city: 'Austin',
          location_state: 'TX',
          location_country: 'USA',
          completion_year: 2021,
          completion_date: '2021-05-30T00:00:00Z',
          budget: 62000000,
          size_sq_ft: 260000,
          client_name: 'Hill Country Health Network',
          is_featured: false,
          image_urls: [
            'https://images.unsplash.com/photo-1587377839824-9d5e3c1a9b36?w=800&h=600&fit=crop&auto=format&q=80'
          ]
        }
      ],
      rental_extras: [
        {
          id: 'extra_standard_damage_waiver',
          name: 'Standard Damage Waiver Insurance',
          code: 'standard_damage_waiver',
          description: 'Limits your financial responsibility for accidental damage to rented equipment, subject to terms and conditions.',
          daily_price: 35,
          is_default: true,
          applicable_equipment_types: [
            'excavator',
            'concrete_mixer',
            'loader',
            'bulldozer'
          ]
        },
        {
          id: 'extra_premium_damage_waiver',
          name: 'Premium Damage Waiver Insurance',
          code: 'premium_damage_waiver',
          description: 'Enhanced protection covering a broader range of accidental damage scenarios with lower deductibles.',
          daily_price: 55,
          is_default: false,
          applicable_equipment_types: [
            'excavator',
            'concrete_mixer',
            'scissor_lift',
            'boom_lift'
          ]
        },
        {
          id: 'extra_loss_damage_waiver',
          name: 'Loss & Theft Waiver',
          code: 'loss_damage_waiver',
          description: 'Reduces your liability in case of theft or unrecoverable loss of the equipment.',
          daily_price: 28,
          is_default: false,
          applicable_equipment_types: [
            'excavator',
            'skid_steer',
            'forklift',
            'generator'
          ]
        }
      ],
      services: [
        {
          id: 'svc_office_3_5_story',
          name: '3–5 Story Office Buildings',
          category: 'commercial_buildings',
          slug: '3-5-story-office-buildings',
          description: 'Design and construction of mid-rise office buildings optimized for tenant flexibility and fast delivery.',
          min_floors: 3,
          max_floors: 5,
          typical_budget_min: 8000000,
          typical_budget_max: 45000000,
          typical_timeline_summary: 'Core and shell delivery typically in 9–12 months; full interior build-out in 12–16 months depending on complexity.',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_office_highrise',
          name: 'High-Rise Office Towers',
          category: 'commercial_buildings',
          slug: 'high-rise-office-towers',
          description: 'Complex high-rise office towers with advanced structural and MEP systems for urban central business districts.',
          min_floors: 10,
          max_floors: 50,
          typical_budget_min: 75000000,
          typical_timeline_summary: 'Multi-year phasing, typically 30–48 months from groundbreaking to occupancy.',
          typical_budget_max: 500000000,
          is_active: true,
          image: 'https://images.unsplash.com/photo-1461716837689-26c37e376909?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_warehouse_logistics',
          name: 'Warehouses & Logistics Centers',
          category: 'industrial_facilities',
          slug: 'warehouses-logistics-centers',
          description: 'Greenfield and renovation services for distribution warehouses, fulfillment centers, and cold storage.',
          min_floors: 1,
          max_floors: 3,
          typical_budget_min: 5000000,
          typical_budget_max: 120000000,
          typical_timeline_summary: 'Typical delivery in 7–14 months depending on size and site complexity.',
          is_active: true,
          image: 'https://images.unsplash.com/photo-1586521995568-39b00fc6c3f0?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      training_courses: [
        {
          id: 'tc_construction_safety_2d',
          title: 'Construction Safety Fundamentals (2-Day)',
          slug: 'construction-safety-fundamentals-2-day',
          category: 'safety_compliance',
          description: 'Foundational course covering core construction safety principles, PPE, fall protection, and hazard communication.',
          duration_days: 2,
          base_price_per_participant: 450,
          tags: ['construction safety', 'osha', 'fundamentals'],
          is_active: true
        },
        {
          id: 'tc_construction_safety_3d',
          title: 'Advanced Construction Safety Management (3-Day)',
          slug: 'advanced-construction-safety-management-3-day',
          category: 'safety_compliance',
          description: 'In-depth program for supervisors focusing on safety leadership, incident investigation, and regulatory compliance.',
          duration_days: 3,
          base_price_per_participant: 620,
          tags: ['construction safety', 'management', 'supervisors'],
          is_active: true
        },
        {
          id: 'tc_site_safety_5d',
          title: 'Comprehensive Site Safety Certification (5-Day)',
          slug: 'comprehensive-site-safety-certification-5-day',
          category: 'safety_compliance',
          description: 'Intensive certification course aligned with industry best practices and advanced risk management techniques.',
          duration_days: 5,
          base_price_per_participant: 980,
          tags: ['certification', 'risk management', 'construction safety'],
          is_active: true
        }
      ],
      branch_time_slots: [
        {
          id: 'sf_2026-08-15_0900',
          branchId: 'sf_bay_area',
          start_datetime: '2026-08-15T09:00:00Z',
          end_datetime: '2026-08-15T10:00:00Z',
          is_available: true,
          is_morning_slot: true
        },
        {
          id: 'sf_2026-08-15_1030',
          branchId: 'sf_bay_area',
          start_datetime: '2026-08-15T10:30:00Z',
          end_datetime: '2026-08-15T11:30:00Z',
          is_available: true,
          is_morning_slot: true
        },
        {
          id: 'sf_2026-08-15_1300',
          branchId: 'sf_bay_area',
          start_datetime: '2026-08-15T13:00:00Z',
          end_datetime: '2026-08-15T14:00:00Z',
          is_available: true,
          is_morning_slot: false
        }
      ],
      equipment_items: [
        {
          id: 'exc_18t_economy',
          categoryId: 'earthmoving',
          name: '18T Crawler Excavator - Economy',
          equipment_type: 'excavator',
          description: 'Versatile 18-ton class excavator ideal for general earthmoving and utility trenching.',
          operating_weight_tons: 18.2,
          capacity_cu_ft: null,
          power_source: 'diesel',
          daily_rate: 560,
          weekly_rate: 2100,
          monthly_rate: 7900,
          min_rental_days: 1,
          customer_rating: 4.4,
          rating_count: 87,
          is_available: true,
          image_urls: [
            'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          specs: [
            'Operating weight: 18.2 tons',
            'Engine power: 140 hp',
            'Bucket capacity: 0.9 cu yd',
            'Max dig depth: 21 ft'
          ],
          locationBranchId: 'sf_bay_area'
        },
        {
          id: 'exc_22t_value',
          categoryId: 'earthmoving',
          name: '22T Crawler Excavator - Value',
          equipment_type: 'excavator',
          description: '22-ton excavator with long stick configuration for deeper utility work.',
          operating_weight_tons: 22.0,
          capacity_cu_ft: null,
          power_source: 'diesel',
          daily_rate: 640,
          weekly_rate: 2400,
          monthly_rate: 8900,
          min_rental_days: 1,
          customer_rating: 4.6,
          rating_count: 65,
          is_available: true,
          image_urls: [
            'https://images.unsplash.com/photo-1503387762-82266cfa0f23?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          specs: [
            'Operating weight: 22 tons',
            'Engine power: 165 hp',
            'Bucket capacity: 1.1 cu yd',
            'Max dig depth: 23 ft'
          ],
          locationBranchId: 'sf_bay_area'
        },
        {
          id: 'exc_30t_premium',
          categoryId: 'earthmoving',
          name: '30T Crawler Excavator - Premium',
          equipment_type: 'excavator',
          description: 'Heavy-duty 30-ton excavator for high-production excavation and demolition work.',
          operating_weight_tons: 30.5,
          capacity_cu_ft: null,
          power_source: 'diesel',
          daily_rate: 840,
          weekly_rate: 3120,
          monthly_rate: 11600,
          min_rental_days: 2,
          customer_rating: 4.8,
          rating_count: 54,
          is_available: true,
          image_urls: [
            'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          specs: [
            'Operating weight: 30.5 tons',
            'Engine power: 220 hp',
            'Reinforced boom and stick',
            'Hydraulic quick coupler ready'
          ],
          locationBranchId: 'oakland_east_bay'
        }
      ],
      service_timeline_options: [
        {
          id: 'timeline_office3_6_9',
          serviceId: 'svc_office_3_5_story',
          label: '6–9 months',
          min_months: 6,
          max_months: 9,
          is_default: false,
          image: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'timeline_office3_9_12',
          serviceId: 'svc_office_3_5_story',
          label: '9–12 months',
          min_months: 9,
          max_months: 12,
          is_default: true,
          image: 'https://a.travel-assets.com/findyours-php/viewfinder/images/res70/32000/32585-Sky-Tower.jpg?impolicy=fcrop&w=1040&h=580&q=mediumHigh'
        },
        {
          id: 'timeline_office3_12_16',
          serviceId: 'svc_office_3_5_story',
          label: '12–16 months',
          min_months: 12,
          max_months: 16,
          is_default: false,
          image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      course_registrations: [
        {
          id: 'reg_001',
          courseId: 'tc_construction_safety_2d',
          sessionId: 'sess_cs2d_2026-04-06_sf',
          number_of_participants: 3,
          participant_name: 'Erin Walker',
          participant_email: 'erin.walker@example.com',
          created_at: '2026-02-15T14:22:00Z',
          status: 'confirmed',
          total_price: 1260.0
        },
        {
          id: 'reg_002',
          courseId: 'tc_construction_safety_3d',
          sessionId: 'sess_cs3d_2026-05-11_den',
          number_of_participants: 1,
          participant_name: 'Miguel Alvarez',
          participant_email: 'miguel.alvarez@example.com',
          created_at: '2026-02-20T09:10:00Z',
          status: 'pending',
          total_price: 640.0
        },
        {
          id: 'reg_003',
          courseId: 'tc_site_safety_5d',
          sessionId: 'sess_css5d_2026-03-02_chi',
          number_of_participants: 5,
          participant_name: 'Dana Patel',
          participant_email: 'dana.patel@example.com',
          created_at: '2026-01-28T16:45:00Z',
          status: 'confirmed',
          total_price: 4900.0
        }
      ],
      training_sessions: [
        {
          id: 'sess_cs2d_2026-04-06_sf',
          courseId: 'tc_construction_safety_2d',
          start_date: '2026-04-06T08:00:00Z',
          end_date: '2026-04-07T17:00:00Z',
          location_city: 'San Francisco',
          location_state: 'CA',
          max_participants: 24,
          price_per_participant: 420,
          status: 'scheduled',
          remaining_seats: 21
        },
        {
          id: 'sess_cs2d_2026-06-10_den',
          courseId: 'tc_construction_safety_2d',
          start_date: '2026-06-10T08:00:00Z',
          end_date: '2026-06-11T17:00:00Z',
          location_city: 'Denver',
          location_state: 'CO',
          max_participants: 20,
          price_per_participant: 430,
          status: 'scheduled',
          remaining_seats: 20
        },
        {
          id: 'sess_cs3d_2026-05-11_den',
          courseId: 'tc_construction_safety_3d',
          start_date: '2026-05-11T08:00:00Z',
          end_date: '2026-05-13T17:00:00Z',
          location_city: 'Denver',
          location_state: 'CO',
          max_participants: 22,
          price_per_participant: 640,
          status: 'scheduled',
          remaining_seats: 21
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:08.025196'
      }
    };

    // Populate localStorage using storage keys
    localStorage.setItem('branches', JSON.stringify(generatedData.branches));
    localStorage.setItem('budget_range_options', JSON.stringify(generatedData.budget_range_options));
    localStorage.setItem('equipment_categories', JSON.stringify(generatedData.equipment_categories));
    localStorage.setItem('maintenance_programs', JSON.stringify(generatedData.maintenance_programs));
    localStorage.setItem('project_case_studies', JSON.stringify(generatedData.project_case_studies));
    localStorage.setItem('rental_extras', JSON.stringify(generatedData.rental_extras));
    localStorage.setItem('services', JSON.stringify(generatedData.services));
    localStorage.setItem('training_courses', JSON.stringify(generatedData.training_courses));
    localStorage.setItem('branch_time_slots', JSON.stringify(generatedData.branch_time_slots));
    localStorage.setItem('equipment_items', JSON.stringify(generatedData.equipment_items));
    localStorage.setItem('service_timeline_options', JSON.stringify(generatedData.service_timeline_options));
    localStorage.setItem('course_registrations', JSON.stringify(generatedData.course_registrations));
    localStorage.setItem('training_sessions', JSON.stringify(generatedData.training_sessions));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestOfficeBuildingQuote();
    this.testTask2_FindAndCompareHospitalCaseStudy();
    this.testTask3_ScheduleWarehouseSiteVisit();
    this.testTask4_RentEquipmentWithExtras();
    this.testTask5_SelectIndustrialMaintenancePlan();
    this.testTask6_RegisterConstructionSafetyCourse();
    this.testTask7_GenerateAndSendWarehouseEstimate();
    this.testTask8_SubmitDesignBuildInquiry();

    return this.results;
  }

  // Task 1: Request a quote for a 3-story office building with shortest timeline <= 12 months
  testTask1_RequestOfficeBuildingQuote() {
    const testName = 'Task 1: Request quote for 3-story office building';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to Services overview and selecting 3–5 Story Office Buildings
      const servicesOverview = this.logic.getServicesOverview();
      this.assert(Array.isArray(servicesOverview) && servicesOverview.length > 0, 'Services overview should return categories');

      const commercialCategory = servicesOverview.find(c => c.category_code === 'commercial_buildings');
      this.assert(!!commercialCategory, 'Should find commercial_buildings category');

      const officeServiceCard = (commercialCategory.services || []).find(s =>
        s.service_slug === '3-5-story-office-buildings' || s.service_name.indexOf('3–5 Story Office Buildings') !== -1
      );
      this.assert(!!officeServiceCard, 'Should find 3–5 Story Office Buildings service card');

      const serviceId = officeServiceCard.service_id;
      this.assert(!!serviceId, 'Service ID should be present');

      // Load service detail and timeline options
      const serviceDetail = this.logic.getServiceDetail(serviceId);
      this.assert(serviceDetail && serviceDetail.timeline_options, 'Service detail should include timeline options');

      const timelines = serviceDetail.timeline_options || [];
      this.assert(timelines.length > 0, 'There should be at least one timeline option');

      // Choose the shortest available option with max_months <= 12
      const suitable = timelines.filter(t => typeof t.max_months === 'number' && t.max_months <= 12);
      this.assert(suitable.length > 0, 'Should have a timeline option with max_months <= 12');

      suitable.sort((a, b) => {
        const aMin = typeof a.min_months === 'number' ? a.min_months : Number.MAX_SAFE_INTEGER;
        const bMin = typeof b.min_months === 'number' ? b.min_months : Number.MAX_SAFE_INTEGER;
        return aMin - bMin;
      });
      const chosenTimeline = suitable[0];
      this.assert(!!chosenTimeline.timeline_option_id, 'Chosen timeline should have an ID');

      // Submit quote request
      const projectName = '3-story office building';
      const projectLocation = 'Denver, CO';
      const budget = 2000000;
      const floors = 3;

      const quoteResult = this.logic.submitServiceQuoteRequest(
        serviceId,
        chosenTimeline.timeline_option_id,
        projectName,
        projectLocation,
        budget,
        floors,
        chosenTimeline.label,
        'Jordan Smith',
        'jordan.smith@example.com',
        '3035550182',
        undefined
      );

      this.assert(quoteResult && quoteResult.success === true, 'Quote request should succeed');
      this.assert(!!quoteResult.quote_request_id, 'Quote request should return an ID');

      // Verify persistence via localStorage
      const stored = JSON.parse(localStorage.getItem('service_quote_requests') || '[]');
      const saved = stored.find(q => q.id === quoteResult.quote_request_id);
      this.assert(!!saved, 'Saved ServiceQuoteRequest should exist');

      this.assert(saved.serviceId === serviceId, 'Saved request should reference correct serviceId');
      this.assert(saved.project_name === projectName, 'Project name should match input');
      this.assert(saved.project_location === projectLocation, 'Project location should match input');
      this.assert(saved.estimated_budget === budget, 'Estimated budget should match input');
      this.assert(saved.number_of_floors === floors, 'Number of floors should match input');
      this.assert(saved.timelineOptionId === chosenTimeline.timeline_option_id, 'Timeline option ID should be linked');
      this.assert(saved.desired_completion_timeline_text === chosenTimeline.label, 'Timeline label should be stored');
      this.assert(saved.contact_full_name === 'Jordan Smith', 'Contact full name should match');
      this.assert(saved.contact_email === 'jordan.smith@example.com', 'Contact email should match');
      this.assert(saved.contact_phone === '3035550182', 'Contact phone should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Find and add to comparison a large hospital project case study in Texas after 2020
  testTask2_FindAndCompareHospitalCaseStudy() {
    const testName = 'Task 2: Find and compare Texas hospital case study';
    console.log('Testing:', testName);

    try {
      // Get filter options (like user opening Projects page)
      const filterOptions = this.logic.getProjectFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.sectors), 'Project filter options should include sectors');

      // Ensure Texas is a selectable state
      const hasTX = (filterOptions.states || []).some(s => s.state_code === 'TX');
      this.assert(hasTX, 'Filter options should include Texas');

      // Search for healthcare hospital projects in TX, >=2021, budget >= 50M, sorted by newest completion date
      const projects = this.logic.searchProjectCaseStudies(
        'healthcare',      // sector
        'TX',              // location_state
        'USA',             // location_country
        'hospital',        // project_type
        2021,              // min_completion_year
        undefined,         // max_completion_year
        50000000,          // min_budget
        undefined,         // max_budget
        undefined,         // search_query
        'completion_date_newest_first' // sort_by
      );

      this.assert(Array.isArray(projects) && projects.length > 0, 'Search should return at least one matching project');

      // Validate filters on results
      projects.forEach(p => {
        this.assert(p.sector === 'healthcare', 'Project sector should be healthcare');
        this.assert(p.location_state === 'TX', 'Project should be in Texas');
        this.assert(p.completion_year >= 2021, 'Completion year should be >= 2021');
        this.assert(p.budget >= 50000000, 'Project budget should be >= 50M');
      });

      // Verify sorting by newest completion date (first item is newest)
      if (projects.length > 1) {
        const firstDate = new Date(projects[0].completion_date || projects[0].completion_year + '-01-01');
        for (let i = 1; i < projects.length; i++) {
          const d = new Date(projects[i].completion_date || projects[i].completion_year + '-01-01');
          this.assert(firstDate >= d, 'First project should be >= others by completion date');
        }
      }

      const selectedProject = projects[0];
      this.assert(!!selectedProject.project_id, 'Selected project should have an ID');

      // Open project detail page
      const detail = this.logic.getProjectCaseStudyDetail(selectedProject.project_id);
      this.assert(detail && detail.project, 'Project detail should be returned');
      this.assert(detail.project.id === selectedProject.project_id, 'Detail ID should match selected project');

      // Add project to comparison list
      const addResult = this.logic.addProjectToComparison(selectedProject.project_id);
      this.assert(addResult && addResult.success === true, 'Adding project to comparison should succeed');
      this.assert(!!addResult.comparison_list_id, 'Comparison list ID should be returned');

      const inList = (addResult.projects || []).some(p => p.project_id === selectedProject.project_id);
      this.assert(inList, 'Added project should appear in returned comparison list');

      // Verify via getProjectComparisonList
      const comparison = this.logic.getProjectComparisonList();
      this.assert(comparison && comparison.comparison_list_id === addResult.comparison_list_id, 'Comparison list ids should match');

      const inCurrentList = (comparison.projects || []).some(p => p.project_id === selectedProject.project_id);
      this.assert(inCurrentList, 'Project should be present in current comparison list');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Schedule a warehouse site visit at the nearest branch within 50 km
  testTask3_ScheduleWarehouseSiteVisit() {
    const testName = 'Task 3: Schedule warehouse site visit near 94107';
    console.log('Testing:', testName);

    try {
      // Find nearby branches by postal code, within 50 km, nearest first
      const branches = this.logic.searchBranchesByPostalCode('94107', 'US', 50, 'distance_nearest_first');
      this.assert(Array.isArray(branches) && branches.length > 0, 'Branch search should return at least one branch');

      // Ensure all returned branches are within 50 km
      branches.forEach(b => {
        this.assert(typeof b.distance_km === 'number', 'Branch should include distance_km');
        this.assert(b.distance_km <= 50, 'Branch distance should be <= 50 km');
      });

      // Take the first (nearest) branch
      const nearest = branches[0];
      this.assert(!!nearest.branch_id, 'Nearest branch should have an ID');

      // Load branch detail (simulating opening branch detail page)
      const branchDetail = this.logic.getBranchDetail(nearest.branch_id);
      this.assert(branchDetail && branchDetail.branch, 'Branch detail should be returned');
      this.assert(branchDetail.branch.id === nearest.branch_id, 'Branch detail ID should match');

      // Get available morning time slots for 2026-08-15 for warehouse/industrial
      const slots = this.logic.getBranchAvailableTimeSlots(
        nearest.branch_id,
        '2026-08-15',
        'warehouse_industrial',
        true
      );
      this.assert(Array.isArray(slots) && slots.length > 0, 'Should return available morning time slots');

      const availableMorningSlots = slots.filter(s => s.is_available && s.is_morning_slot);
      this.assert(availableMorningSlots.length > 0, 'There should be at least one available morning slot');

      // Pick earliest available morning slot by start_datetime
      availableMorningSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const chosenSlot = availableMorningSlots[0];
      this.assert(!!chosenSlot.time_slot_id, 'Chosen slot should have an ID');

      // Book site visit appointment
      const appointmentResult = this.logic.submitSiteVisitAppointment(
        nearest.branch_id,
        'warehouse_industrial',
        '100 Industrial St, San Francisco, CA',
        '2026-08-15',
        chosenSlot.time_slot_id,
        'Riley Chen',
        'riley.chen@example.com',
        '4155550199',
        undefined
      );

      this.assert(appointmentResult && appointmentResult.success === true, 'Site visit appointment should succeed');
      this.assert(!!appointmentResult.appointment_id, 'Appointment ID should be returned');

      // Verify appointment storage
      const appointments = JSON.parse(localStorage.getItem('site_visit_appointments') || '[]');
      const saved = appointments.find(a => a.id === appointmentResult.appointment_id);
      this.assert(!!saved, 'Saved SiteVisitAppointment should exist');

      this.assert(saved.branchId === nearest.branch_id, 'Appointment should reference correct branch');
      this.assert(saved.project_type === 'warehouse_industrial', 'Project type should match input');
      this.assert(saved.project_address === '100 Industrial St, San Francisco, CA', 'Project address should match input');
      this.assert(saved.timeSlotId === chosenSlot.time_slot_id, 'Time slot ID should match selected slot');
      this.assert(typeof saved.preferred_date === 'string' || !!saved.preferred_date, 'Preferred date should be stored');
      this.assert(saved.contact_name === 'Riley Chen', 'Contact name should match');
      this.assert(saved.contact_email === 'riley.chen@example.com', 'Contact email should match');
      this.assert(saved.contact_phone === '4155550199', 'Contact phone should match');

      // Ensure referenced time slot exists
      const allSlots = JSON.parse(localStorage.getItem('branch_time_slots') || '[]');
      const slotRecord = allSlots.find(s => s.id === saved.timeSlotId);
      this.assert(!!slotRecord, 'Referenced BranchTimeSlot should exist in storage');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Rent an excavator and concrete mixer (adapted: two excavators) with insurance and proceed to summary
  testTask4_RentEquipmentWithExtras() {
    const testName = 'Task 4: Rent equipment with insurance and view summary';
    console.log('Testing:', testName);

    try {
      // Get equipment categories (simulating Equipment Rental page)
      const categories = this.logic.getEquipmentCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Equipment categories should be returned');

      const earthmovingCategory = categories.find(c => c.code === 'earthmoving');
      this.assert(!!earthmovingCategory, 'Earthmoving category should exist');

      // Search for excavators >=18 tons, max daily rate 700, available, cheapest first
      const excavators = this.logic.searchEquipmentItems(
        earthmovingCategory.category_id, // categoryId
        'excavator',                     // search_keyword
        'excavator',                     // equipment_type
        18,                              // min_operating_weight_tons
        undefined,                       // min_capacity_cu_ft
        700,                             // max_daily_rate
        undefined,                       // min_customer_rating
        true,                            // only_available
        'price_low_to_high'              // sort_by
      );

      this.assert(Array.isArray(excavators) && excavators.length > 0, 'Excavator search should return results');

      excavators.forEach(e => {
        if (typeof e.operating_weight_tons === 'number') {
          this.assert(e.operating_weight_tons >= 18, 'Excavator should meet min operating weight filter');
        }
        this.assert(e.daily_rate <= 700, 'Excavator should meet max daily rate filter');
        this.assert(e.is_available === true, 'Excavator should be available');
      });

      // First excavator should be the cheapest due to sorting
      const firstExcavator = excavators[0];
      this.assert(!!firstExcavator.equipment_id, 'First excavator should have an ID');

      // Load equipment detail to get available extras
      const firstDetail = this.logic.getEquipmentDetail(firstExcavator.equipment_id);
      this.assert(firstDetail && firstDetail.equipment, 'Equipment detail should be returned');

      const extras1 = firstDetail.available_extras || [];
      const standardExtra1 = extras1.find(x => x.code === 'standard_damage_waiver');
      this.assert(!!standardExtra1, 'Standard damage waiver extra should be available for excavator');

      // Add first excavator to rental cart for June 1–5, 2026
      const addFirst = this.logic.addEquipmentToRentalCart(
        firstExcavator.equipment_id,
        '2026-06-01',
        '2026-06-05',
        1,
        [standardExtra1.extra_id]
      );

      this.assert(addFirst && addFirst.success === true, 'Adding first equipment to cart should succeed');
      this.assert(!!addFirst.cart_id, 'Cart ID should be returned when adding first item');

      // Choose a second equipment item (adapted: another excavator) with same constraints
      const secondExcavator = excavators.find(e => e.equipment_id !== firstExcavator.equipment_id) || firstExcavator;
      const secondDetail = this.logic.getEquipmentDetail(secondExcavator.equipment_id);
      this.assert(secondDetail && secondDetail.equipment, 'Second equipment detail should be returned');

      const extras2 = secondDetail.available_extras || [];
      const standardExtra2 = extras2.find(x => x.code === 'standard_damage_waiver');
      this.assert(!!standardExtra2, 'Standard damage waiver should be available for second equipment');

      const addSecond = this.logic.addEquipmentToRentalCart(
        secondExcavator.equipment_id,
        '2026-06-01',
        '2026-06-05',
        1,
        [standardExtra2.extra_id]
      );

      this.assert(addSecond && addSecond.success === true, 'Adding second equipment to cart should succeed');
      this.assert(addSecond.cart_id === addFirst.cart_id, 'Both items should be in the same cart');

      // Verify cart contents and totals
      const cart = this.logic.getRentalCart();
      this.assert(cart && Array.isArray(cart.items), 'Rental cart should return items array');
      this.assert(cart.items.length >= 2, 'Rental cart should contain at least two items');

      const item1 = cart.items.find(i => i.equipment_id === firstExcavator.equipment_id);
      const item2 = cart.items.find(i => i.equipment_id === secondExcavator.equipment_id);
      this.assert(!!item1, 'First equipment should be present in cart');
      this.assert(!!item2, 'Second equipment should be present in cart');

      // Verify extras are attached
      const item1HasStd = (item1.selected_extras || []).some(x => x.code === 'standard_damage_waiver');
      const item2HasStd = (item2.selected_extras || []).some(x => x.code === 'standard_damage_waiver');
      this.assert(item1HasStd, 'First item should include standard damage waiver');
      this.assert(item2HasStd, 'Second item should include standard damage waiver');

      // Totals consistency: total_estimated_cost equals sum of line_subtotals
      const sumLines = cart.items.reduce((sum, i) => sum + (i.line_subtotal || 0), 0);
      const totals = cart.totals || {};
      this.assert(typeof totals.total_estimated_cost === 'number', 'Cart total_estimated_cost should be numeric');
      this.assert(Math.abs(totals.total_estimated_cost - sumLines) < 0.0001, 'Cart total should equal sum of line subtotals');

      // Proceed to rental summary (no submission in this task)
      const summary = this.logic.getRentalSummary();
      this.assert(summary && Array.isArray(summary.items), 'Rental summary should include items');
      this.assert(summary.items.length === cart.items.length, 'Summary should list same number of items as cart');

      const summaryTotal = (summary.totals && summary.totals.total_estimated_cost) || 0;
      this.assert(Math.abs(summaryTotal - totals.total_estimated_cost) < 0.0001, 'Summary total should match cart total');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Select an industrial maintenance plan with fast response under $1,500/month
  testTask5_SelectIndustrialMaintenancePlan() {
    const testName = 'Task 5: Select industrial maintenance plan and request quote';
    console.log('Testing:', testName);

    try {
      // Get maintenance filter options (simulating Maintenance Programs page)
      const options = this.logic.getMaintenanceFilterOptions();
      this.assert(options && Array.isArray(options.facility_types), 'Maintenance filter options should include facility types');

      const hasIndustrial = options.facility_types.some(f => f.value === 'industrial');
      this.assert(hasIndustrial, 'Industrial facility type should be available');

      // Search for industrial programs, emergency response up_to_2_hours, max monthly fee 1500, sort by longest warranty
      const programs = this.logic.searchMaintenancePrograms(
        'industrial',               // facility_type
        'up_to_2_hours',            // emergency_response_time
        1500,                       // max_monthly_fee
        'warranty_length_longest_first' // sort_by
      );

      this.assert(Array.isArray(programs) && programs.length > 0, 'Maintenance program search should return results');

      programs.forEach(p => {
        this.assert(p.facility_type === 'industrial', 'Program facility_type should be industrial');
        this.assert(p.emergency_response_time === 'up_to_2_hours', 'Program emergency response time should be up_to_2_hours');
        this.assert(p.monthly_fee <= 1500, 'Program monthly fee should be <= 1500');
      });

      // Verify sorting by warranty_length_months descending
      if (programs.length > 1) {
        for (let i = 1; i < programs.length; i++) {
          this.assert(
            programs[i - 1].warranty_length_months >= programs[i].warranty_length_months,
            'Programs should be sorted by warranty length (longest first)'
          );
        }
      }

      const selectedProgram = programs[0];
      this.assert(!!selectedProgram.maintenance_program_id, 'Selected maintenance program should have an ID');

      // Load program detail
      const detail = this.logic.getMaintenanceProgramDetail(selectedProgram.maintenance_program_id);
      this.assert(detail && detail.program, 'Maintenance program detail should be returned');
      this.assert(detail.program.id === selectedProgram.maintenance_program_id, 'Detail ID should match selected program');

      // Submit quote request for the selected plan
      const quoteResult = this.logic.submitMaintenanceQuoteRequest(
        selectedProgram.maintenance_program_id,
        'Taylor Lee',
        'taylor.lee@example.com',
        'existing_facility',
        undefined
      );

      this.assert(quoteResult && quoteResult.success === true, 'Maintenance quote request should succeed');
      this.assert(!!quoteResult.quote_request_id, 'Quote request ID should be returned');

      // Verify persistence
      const stored = JSON.parse(localStorage.getItem('maintenance_quote_requests') || '[]');
      const saved = stored.find(q => q.id === quoteResult.quote_request_id);
      this.assert(!!saved, 'Saved MaintenanceQuoteRequest should exist');

      this.assert(saved.maintenanceProgramId === selectedProgram.maintenance_program_id, 'Saved request should reference correct program');
      this.assert(saved.contact_name === 'Taylor Lee', 'Contact name should match');
      this.assert(saved.contact_email === 'taylor.lee@example.com', 'Contact email should match');
      this.assert(saved.facility_status === 'existing_facility', 'Facility status should match input');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Register for the cheapest 2+ day construction safety course starting in April 2026
  testTask6_RegisterConstructionSafetyCourse() {
    const testName = 'Task 6: Register for cheapest construction safety course in April 2026';
    console.log('Testing:', testName);

    try {
      // Get training filter options (simulating Training & Certifications page)
      const filterOptions = this.logic.getTrainingFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Training filter options should include categories');

      const hasSafety = filterOptions.categories.some(c => c.value === 'safety_compliance');
      this.assert(hasSafety, 'Safety & Compliance category should be available');

      // Search for construction safety courses in Safety & Compliance, duration >=2 days, starting in April 2026, sorted by price
      const courses = this.logic.searchTrainingCourses(
        'Construction Safety',     // query
        'safety_compliance',       // category
        2,                         // min_duration_days
        '2026-04-01',              // start_date_from
        '2026-04-30',              // start_date_to
        'price_low_to_high'        // sort_by
      );

      this.assert(Array.isArray(courses) && courses.length > 0, 'Training course search should return results');

      courses.forEach(c => {
        this.assert(c.category === 'safety_compliance', 'Course category should be safety_compliance');
        this.assert(c.duration_days >= 2, 'Course duration should be at least 2 days');
        this.assert(typeof c.starting_from_price === 'number', 'Course should have starting_from_price');
      });

      // First course should be the cheapest due to sorting
      const selectedCourse = courses[0];
      this.assert(!!selectedCourse.course_id, 'Selected course should have an ID');

      // Load course detail and sessions
      const detail = this.logic.getTrainingCourseDetail(selectedCourse.course_id);
      this.assert(detail && detail.course && Array.isArray(detail.sessions), 'Course detail and sessions should be returned');

      // Find first available session in April 2026
      const aprilSessions = detail.sessions.filter(s => {
        if (s.status !== 'scheduled') return false;
        const startStr = s.start_date || '';
        return startStr.startsWith('2026-04-');
      });

      this.assert(aprilSessions.length > 0, 'There should be at least one scheduled April 2026 session');

      aprilSessions.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      const chosenSession = aprilSessions[0];
      this.assert(!!chosenSession.session_id, 'Chosen session should have an ID');

      // Submit registration for 1 participant
      const regResult = this.logic.submitCourseRegistration(
        detail.course.id,
        chosenSession.session_id,
        1,
        'Alex Morgan',
        'alex.morgan@example.com'
      );

      this.assert(regResult && regResult.success === true, 'Course registration should succeed');
      this.assert(!!regResult.registration_id, 'Registration ID should be returned');
      this.assert(typeof regResult.total_price === 'number' && regResult.total_price > 0, 'Total price should be positive');

      // Verify persistence
      const regs = JSON.parse(localStorage.getItem('course_registrations') || '[]');
      const saved = regs.find(r => r.id === regResult.registration_id);
      this.assert(!!saved, 'Saved CourseRegistration should exist');

      this.assert(saved.courseId === detail.course.id, 'Saved registration should reference correct course');
      this.assert(saved.sessionId === chosenSession.session_id, 'Saved registration should reference correct session');
      this.assert(saved.number_of_participants === 1, 'Number of participants should be 1');
      this.assert(saved.participant_name === 'Alex Morgan', 'Participant name should match');
      this.assert(saved.participant_email === 'alex.morgan@example.com', 'Participant email should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Generate and send a cost estimate for a 10,000 sq ft warehouse renovation in Chicago
  testTask7_GenerateAndSendWarehouseEstimate() {
    const testName = 'Task 7: Generate and send warehouse renovation cost estimate';
    console.log('Testing:', testName);

    try {
      // Get cost calculator options (simulating Cost Calculator page)
      const options = this.logic.getCostCalculatorOptions();
      this.assert(options && Array.isArray(options.project_types), 'Cost calculator options should include project types');
      this.assert(Array.isArray(options.hvac_efficiency_levels), 'Cost calculator options should include HVAC efficiency levels');

      const hasWarehouseRenovation = options.project_types.some(p => p.value === 'warehouse_renovation');
      this.assert(hasWarehouseRenovation, 'Project types should include warehouse_renovation');

      const hasHighEfficiency = options.hvac_efficiency_levels.some(h => h.value === 'high_efficiency');
      this.assert(hasHighEfficiency, 'HVAC efficiency options should include high_efficiency');

      // Calculate estimate for 10,000 sq ft warehouse renovation in Chicago with high-efficiency HVAC and 15%+ savings
      const estimate = this.logic.calculateCostEstimate(
        'warehouse_renovation',
        'Chicago',
        'IL',
        10000,
        'high_efficiency',
        15
      );

      this.assert(estimate && !!estimate.cost_estimate_id, 'Cost estimate should return an ID');
      this.assert(estimate.project_type === 'warehouse_renovation', 'Estimate project_type should match input');
      this.assert(estimate.location_city === 'Chicago', 'Estimate city should be Chicago');
      this.assert(estimate.location_state === 'IL', 'Estimate state should be IL');
      this.assert(estimate.floor_area_sq_ft === 10000, 'Estimate floor area should be 10,000 sq ft');
      this.assert(estimate.hvac_efficiency_level === 'high_efficiency', 'HVAC efficiency level should match');
      this.assert(estimate.target_energy_savings_percent >= 15, 'Target energy savings should be >= 15%');
      this.assert(typeof estimate.estimated_cost === 'number' && estimate.estimated_cost > 0, 'Estimated cost should be positive');

      // Verify estimate persisted
      const estimates = JSON.parse(localStorage.getItem('cost_estimates') || '[]');
      const savedEstimate = estimates.find(e => e.id === estimate.cost_estimate_id);
      this.assert(!!savedEstimate, 'Saved CostEstimate should exist');

      // Submit an estimate request (like "Request Detailed Quote")
      const requestResult = this.logic.submitEstimateRequest(
        estimate.cost_estimate_id,
        'Morgan Ellis',
        'morgan.ellis@example.com',
        'warehouse_industrial',
        'request_detailed_quote',
        undefined
      );

      this.assert(requestResult && requestResult.success === true, 'Estimate request should succeed');
      this.assert(!!requestResult.estimate_request_id, 'Estimate request ID should be returned');

      // Verify persistence
      const requests = JSON.parse(localStorage.getItem('estimate_requests') || '[]');
      const savedRequest = requests.find(r => r.id === requestResult.estimate_request_id);
      this.assert(!!savedRequest, 'Saved EstimateRequest should exist');

      this.assert(savedRequest.costEstimateId === estimate.cost_estimate_id, 'Estimate request should reference correct CostEstimate');
      this.assert(savedRequest.name === 'Morgan Ellis', 'Request name should match');
      this.assert(savedRequest.email === 'morgan.ellis@example.com', 'Request email should match');
      this.assert(savedRequest.facility_type === 'warehouse_industrial', 'Facility type should match input');
      this.assert(savedRequest.submitted_via === 'request_detailed_quote', 'submitted_via should match input');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Submit a design-build inquiry for a mid-sized retail store with specific budget and contact preferences
  testTask8_SubmitDesignBuildInquiry() {
    const testName = 'Task 8: Submit design-build inquiry for retail store';
    console.log('Testing:', testName);

    try {
      // Load Contact page configuration
      const config = this.logic.getContactPageConfig();
      this.assert(config && Array.isArray(config.inquiry_types), 'Contact page config should include inquiry types');

      const designBuildType = config.inquiry_types.find(t => t.value === 'design_build_project');
      this.assert(!!designBuildType, 'Design-Build Project inquiry type should exist');

      // Find budget range option "$500,000–$800,000"
      const budgetOptions = config.budget_range_options || [];
      this.assert(budgetOptions.length > 0, 'Contact page should provide budget range options');

      const chosenBudget = budgetOptions.find(b => b.label === '$500,000–$800,000');
      this.assert(!!chosenBudget, 'Should find budget range $500,000–$800,000');

      // Find referral source "Online Search"
      const referralSources = config.referral_sources || [];
      const onlineSearch = referralSources.find(r => r.value === 'online_search');
      this.assert(!!onlineSearch, 'Referral source online_search should exist');

      // Preferred contact method "Phone"
      const methods = config.preferred_contact_methods || [];
      const phoneMethod = methods.find(m => m.value === 'phone');
      this.assert(!!phoneMethod, 'Preferred contact method phone should exist');

      // Preferred time window "2 PM – 4 PM" (afternoon_2_4)
      const timeWindows = config.preferred_time_windows || [];
      const afternoon24 = timeWindows.find(w => w.value === 'afternoon_2_4');
      this.assert(!!afternoon24, 'Preferred time window afternoon_2_4 should exist');

      // Submit inquiry
      const submitResult = this.logic.submitInquiry(
        'design_build_project',       // inquiry_type
        'retail_store',               // project_type
        8000,                         // project_size_sq_ft
        chosenBudget.budget_range_option_id, // budgetRangeOptionId
        chosenBudget.label,           // budget_range_label
        chosenBudget.min_amount,      // budget_min_amount
        chosenBudget.max_amount,      // budget_max_amount
        '2026-10-10',                 // desired_start_date
        'online_search',              // referral_source
        'phone',                      // preferred_contact_method
        'afternoon_2_4',              // preferred_contact_time_window
        'Jamie Rivera',               // contact_full_name
        'jamie.rivera@example.com',   // contact_email
        '5559870143',                 // contact_phone
        undefined                     // message
      );

      this.assert(submitResult && submitResult.success === true, 'Inquiry submission should succeed');
      this.assert(!!submitResult.inquiry_id, 'Inquiry ID should be returned');

      // Verify persistence
      const inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]');
      const saved = inquiries.find(i => i.id === submitResult.inquiry_id);
      this.assert(!!saved, 'Saved Inquiry should exist');

      this.assert(saved.inquiry_type === 'design_build_project', 'Inquiry type should match');
      this.assert(saved.project_type === 'retail_store', 'Project type should match');
      this.assert(saved.project_size_sq_ft === 8000, 'Project size should match');
      this.assert(saved.budgetRangeOptionId === chosenBudget.budget_range_option_id, 'budgetRangeOptionId should match selected option');
      this.assert(saved.budget_range_label === chosenBudget.label, 'Budget label should match');
      this.assert(saved.budget_min_amount === chosenBudget.min_amount, 'Budget min amount should match');
      this.assert(saved.budget_max_amount === chosenBudget.max_amount, 'Budget max amount should match');
      this.assert(saved.referral_source === 'online_search', 'Referral source should match');
      this.assert(saved.preferred_contact_method === 'phone', 'Preferred contact method should match');
      this.assert(saved.preferred_contact_time_window === 'afternoon_2_4', 'Preferred contact time window should match');
      this.assert(saved.contact_full_name === 'Jamie Rivera', 'Contact full name should match');
      this.assert(saved.contact_email === 'jamie.rivera@example.com', 'Contact email should match');
      this.assert(saved.contact_phone === '5559870143', 'Contact phone should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('✓', testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗', testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
