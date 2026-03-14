// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and init
    this.clearStorage();
    // Populate initial test data
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
      case_studies: [
        {
          id: 'cs_aero_sat_bracket_7d',
          title: 'Aerospace Satellite Bracket Delivered in 7 Days',
          slug: 'aerospace-satellite-bracket-7-days',
          industry: 'aerospace',
          summary: '5-axis CNC machined 7075 aluminum satellite mounting bracket delivered in 7 days including anodizing and CMM inspection.',
          part_type: 'satellite mounting bracket',
          processes_used: [
            'five_axis_cnc_machining',
            'anodizing',
            'cmm_inspection'
          ],
          materials: [
            'aluminum_7075'
          ],
          tolerance_achieved_mm: 0.01,
          tolerance_achieved_in: 0.0004,
          delivery_time_days: 7,
          lead_time_tag: 'le_10_days',
          results_highlights: 'Reduced part weight by 18% while holding ±0.01 mm on all critical bores and meeting an aggressive 7-day schedule.',
          is_featured: true,
          createdAt: '2025-11-10T09:30:00Z'
        },
        {
          id: 'cs_aero_valve_body_5d',
          title: 'Aerospace Fuel Valve Body Turnaround in 5 Days',
          slug: 'aerospace-fuel-valve-body-5-days',
          industry: 'aerospace',
          summary: 'Precision-milled stainless steel fuel valve body produced and delivered in just 5 days for a ground-test application.',
          part_type: 'fuel valve body',
          processes_used: [
            'three_axis_cnc_milling',
            'cmm_inspection'
          ],
          materials: [
            'stainless_steel_316l'
          ],
          tolerance_achieved_mm: 0.015,
          tolerance_achieved_in: 0.0006,
          delivery_time_days: 5,
          lead_time_tag: 'le_5_days',
          results_highlights: 'Met urgent test schedule with 100% on-time delivery and zero nonconformances on 36 inspected dimensions.',
          is_featured: true,
          createdAt: '2025-08-22T14:05:00Z'
        },
        {
          id: 'cs_med_spinal_implant_14d',
          title: 'Titanium Spinal Implant with Mirror Finish',
          slug: 'titanium-spinal-implant-14-days',
          industry: 'medical',
          summary: 'Complex titanium Grade 5 spinal implant machined with fine surface finish and validated in 14 days.',
          part_type: 'spinal fusion implant',
          processes_used: [
            'five_axis_cnc_machining',
            'cmm_inspection'
          ],
          materials: [
            'titanium_grade_5'
          ],
          tolerance_achieved_mm: 0.008,
          tolerance_achieved_in: 0.0003,
          delivery_time_days: 14,
          lead_time_tag: 'le_15_days',
          results_highlights: 'Achieved Ra 0.4 µm on articulating surfaces and passed full dimensional and visual inspection on first article.',
          is_featured: true,
          createdAt: '2024-12-03T11:20:00Z'
        }
      ],
      machines: [
        {
          id: 'mach_haas_umc500',
          name: 'Haas UMC-500 5-Axis Mill',
          model_number: 'UMC-500',
          manufacturer: 'Haas Automation',
          machine_type: 'five_axis_mill',
          axes: 5,
          max_part_length_mm: 600,
          max_part_width_mm: 500,
          max_part_height_mm: 450,
          max_part_diameter_mm: 500,
          min_surface_roughness_ra_um: 0.4,
          min_tolerance_mm: 0.005,
          min_tolerance_in: 0.0002,
          is_active: true,
          commission_date: '2023-04-15T00:00:00Z',
          createdAt: '2023-04-20T10:00:00Z'
        },
        {
          id: 'mach_dmgedm_dmu65',
          name: 'DMG Mori DMU 65 monoBLOCK',
          model_number: 'DMU 65',
          manufacturer: 'DMG Mori',
          machine_type: 'five_axis_mill',
          axes: 5,
          max_part_length_mm: 800,
          max_part_width_mm: 650,
          max_part_height_mm: 550,
          max_part_diameter_mm: 650,
          min_surface_roughness_ra_um: 0.6,
          min_tolerance_mm: 0.004,
          min_tolerance_in: 0.00016,
          is_active: true,
          commission_date: '2022-09-10T00:00:00Z',
          createdAt: '2022-09-18T09:30:00Z'
        },
        {
          id: 'mach_okuma_genos_l3000',
          name: 'Okuma Genos L3000-E Turning Center',
          model_number: 'Genos L3000-E',
          manufacturer: 'Okuma',
          machine_type: 'cnc_turning_center',
          axes: 2,
          max_part_length_mm: 800,
          max_part_width_mm: null,
          max_part_height_mm: null,
          max_part_diameter_mm: 300,
          min_surface_roughness_ra_um: 1.6,
          min_tolerance_mm: 0.01,
          min_tolerance_in: 0.0004,
          is_active: true,
          commission_date: '2021-06-01T00:00:00Z',
          createdAt: '2021-06-05T08:45:00Z'
        }
      ],
      products: [
        {
          id: 'prod_turn_ss304_shaft_20x120',
          name: 'Stainless 304 Precision Shaft 20 x 120 mm',
          sku: 'T-S304-20X120',
          category: 'cnc_turning_parts',
          description: 'Precision-turned stainless steel 304 shaft, 20 mm diameter x 120 mm length, chamfered ends.',
          material: 'stainless_steel_304',
          length_mm: 120,
          width_mm: null,
          height_mm: null,
          diameter_mm: 20,
          surface_finish: 'ra_1_6_um_fine',
          tolerance_mm: 0.02,
          price: 48.5,
          currency: 'usd',
          image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop&auto=format&q=80',
          is_active: true,
          createdAt: '2025-10-01T09:00:00Z'
        },
        {
          id: 'prod_turn_ss316l_shaft_25x150',
          name: '316L Corrosion-Resistant Shaft 25 x 150 mm',
          sku: 'T-S316L-25X150',
          category: 'cnc_turning_parts',
          description: 'Stainless steel 316L shaft for corrosive environments, 25 mm diameter x 150 mm length.',
          material: 'stainless_steel_316l',
          length_mm: 150,
          width_mm: null,
          height_mm: null,
          diameter_mm: 25,
          surface_finish: 'ra_1_6_um_fine',
          tolerance_mm: 0.02,
          price: 62.0,
          currency: 'usd',
          image_url: 'https://images.unsplash.com/photo-1514790193030-c89d266d5a9d?w=800&h=600&fit=crop&auto=format&q=80',
          is_active: true,
          createdAt: '2025-09-18T11:20:00Z'
        },
        {
          id: 'prod_turn_al6061_spacer_15x40',
          name: 'Aluminum 6061 Spacer 15 x 40 mm',
          sku: 'T-A6061-15X40',
          category: 'cnc_turning_parts',
          description: 'Lightweight aluminum 6061 spacer, 15 mm OD, 8 mm ID, 40 mm length.',
          material: 'aluminum_6061',
          length_mm: 40,
          width_mm: null,
          height_mm: null,
          diameter_mm: 15,
          surface_finish: 'ra_3_2_um_standard',
          tolerance_mm: 0.05,
          price: 12.75,
          currency: 'usd',
          image_url: 'https://sc01.alicdn.com/kf/HTB1fhRgKpXXXXbkaXXXq6xXFXXX6/200561810/HTB1fhRgKpXXXXbkaXXXq6xXFXXX6.jpg',
          is_active: true,
          createdAt: '2024-08-05T08:45:00Z'
        }
      ],
      services: [
        {
          id: 'svc_cnc_turning_shafts_pins',
          name: 'CNC Turning – Shafts & Pins',
          slug: 'cnc-turning-shafts-pins',
          process_type: 'cnc_turning',
          description: 'Precision CNC turning for straight and stepped shafts, pins, and rollers in steels, stainless steels, aluminum, and plastics. Optimized for concentricity and tight runout over medium-to-long lengths.',
          axes: 2,
          supported_industries: [
            'industrial',
            'automotive',
            'aerospace',
            'medical'
          ],
          industry_values_definition: 'industrial',
          max_part_length_mm: 800,
          max_part_width_mm: 0,
          max_part_height_mm: 0,
          max_part_diameter_mm: 120,
          min_tolerance_mm: 0.01,
          min_tolerance_in: 0.0004,
          best_surface_finish_ra_um: 0.8,
          typical_lead_time_days_min: 7,
          typical_lead_time_days_max: 15,
          example_applications: [
            'pump shafts for industrial equipment',
            'drive pins and dowel pins',
            'linear guide shafts',
            'stepped shafts with bearing seats'
          ],
          related_case_study_ids: [
            'cs_industrial_pump_shaft_12d',
            'cs_auto_shock_piston_10d',
            'cs_med_endoscope_tube_4d'
          ],
          is_active: true,
          createdAt: '2024-03-05T09:00:00Z',
          image: 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_cnc_turning_stainless_shafts',
          name: 'CNC Turning – Stainless Shafts & Rollers',
          slug: 'cnc-turning-stainless-shafts-rollers',
          process_type: 'cnc_turning',
          description: 'Dedicated CNC turning service for stainless steel shafts, rollers, and pins where corrosion resistance and tight dimensional control are critical. Ideal for 304, 316L, and 303 stainless grades.',
          axes: 3,
          supported_industries: [
            'industrial',
            'energy',
            'medical',
            'other'
          ],
          industry_values_definition: 'industrial',
          max_part_length_mm: 700,
          max_part_width_mm: 0,
          max_part_height_mm: 0,
          max_part_diameter_mm: 150,
          min_tolerance_mm: 0.01,
          min_tolerance_in: 0.0004,
          best_surface_finish_ra_um: 0.8,
          typical_lead_time_days_min: 10,
          typical_lead_time_days_max: 15,
          example_applications: [
            'stainless guide shafts and rollers',
            'corrosion-resistant drive shafts',
            'precision medical instrument shafts',
            'food and pharma processing rollers'
          ],
          related_case_study_ids: [
            'cs_industrial_pump_shaft_12d',
            'cs_med_surgical_handle_9d'
          ],
          is_active: true,
          createdAt: '2024-06-12T10:15:00Z',
          image: 'http://bsg-i.nbxc.com/product/53/2b/00/7a6df483f5764ec7118c630f15.jpg'
        },
        {
          id: 'svc_cnc_turning_high_volume',
          name: 'CNC Turning – High-Volume Production',
          slug: 'cnc-turning-high-volume-production',
          process_type: 'cnc_turning',
          description: 'Bar-fed CNC turning for high-volume production of rotational parts with automated inspection options. Optimized cycle times for automotive and industrial components.',
          axes: 3,
          supported_industries: [
            'automotive',
            'industrial',
            'electronics'
          ],
          industry_values_definition: 'automotive',
          max_part_length_mm: 300,
          max_part_width_mm: 0,
          max_part_height_mm: 0,
          max_part_diameter_mm: 80,
          min_tolerance_mm: 0.015,
          min_tolerance_in: 0.0006,
          best_surface_finish_ra_um: 1.6,
          typical_lead_time_days_min: 12,
          typical_lead_time_days_max: 20,
          example_applications: [
            'automotive shock pistons and valve components',
            'hydraulic and pneumatic fittings',
            'bushings and sleeves',
            'sensor housings and spacers'
          ],
          related_case_study_ids: [
            'cs_auto_shock_piston_10d',
            'cs_industrial_manifold_8d'
          ],
          is_active: true,
          createdAt: '2023-11-03T14:30:00Z',
          image: 'https://images.unsplash.com/photo-1580894906475-403276d3945f?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      service_material_specs: [
        {
          id: 'sms_turn_shafts_pins_carbon_steel',
          service_id: 'svc_cnc_turning_shafts_pins',
          material: 'carbon_steel',
          min_tolerance_mm: 0.012,
          min_tolerance_in: 0.00047,
          best_surface_finish_ra_um: 0.8,
          image: 'http://www.tuofamachining.com/photo/pl32537199-metal_stainless_steel_ra3_2_cnc_turned_components_lathe_machining_service.jpg'
        },
        {
          id: 'sms_turn_shafts_pins_ss304',
          service_id: 'svc_cnc_turning_shafts_pins',
          material: 'stainless_steel_304',
          min_tolerance_mm: 0.01,
          min_tolerance_in: 0.00039,
          best_surface_finish_ra_um: 0.8,
          image: 'https://www.anebonmetal.com/uploads/Precision-Cnc-Turning-Shaft.jpg'
        },
        {
          id: 'sms_turn_shafts_pins_ss316l',
          service_id: 'svc_cnc_turning_shafts_pins',
          material: 'stainless_steel_316l',
          min_tolerance_mm: 0.012,
          min_tolerance_in: 0.00047,
          best_surface_finish_ra_um: 1.0,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/93053b5a-104b-5136-ad4e-8a327e8331c0.jpeg'
        }
      ]
    };

    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies || []));
      localStorage.setItem('machines', JSON.stringify(generatedData.machines || []));
      localStorage.setItem('products', JSON.stringify(generatedData.products || []));
      localStorage.setItem('services', JSON.stringify(generatedData.services || []));
      localStorage.setItem('service_material_specs', JSON.stringify(generatedData.service_material_specs || []));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RFQStainlessShaft();
    this.testTask2_ServiceInquiryTightTolerance();
    this.testTask3_CostEstimatorAndPreferredQuote();
    this.testTask4_AerospaceCaseStudySimilarProject();
    this.testTask5_EquipmentComparison();
    this.testTask6_PlantTourNextMonthWeekday();
    this.testTask7_CartWithStandardParts();
    this.testTask8_LeadTimeCalculator();

    return this.results;
  }

  // Task 1: Submit an RFQ for a stainless steel shaft with tight tolerance and <=15 business days standard lead time
  testTask1_RFQStainlessShaft() {
    const testName = 'Task 1: RFQ for stainless shaft with tight tolerance and <=15-day standard lead time';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to homepage
      const homeOverview = this.logic.getHomeOverview();
      this.assert(homeOverview && typeof homeOverview === 'object', 'Home overview should return an object');

      // Open Request a Quote form
      const rfqConfig = this.logic.getRequestQuoteFormConfig();
      this.assert(rfqConfig && Array.isArray(rfqConfig.machining_types), 'RFQ config should include machining_types');

      // Select machining type: prefer cnc_turning
      let machiningTypeOption = rfqConfig.machining_types.find(mt => mt.value === 'cnc_turning') || rfqConfig.machining_types[0];
      this.assert(machiningTypeOption, 'Machining type option should be available');
      const machiningType = machiningTypeOption.value;

      // Select material: prefer stainless_steel_304
      this.assert(Array.isArray(rfqConfig.materials) && rfqConfig.materials.length > 0, 'RFQ config should include materials');
      let materialOption = rfqConfig.materials.find(m => m.value === 'stainless_steel_304') || rfqConfig.materials[0];
      const material = materialOption.value;

      // Select tightest available tolerance up to 0.02 mm if possible
      const toleranceOptions = rfqConfig.tolerance_options || [];
      this.assert(toleranceOptions.length > 0, 'Tolerance options should be available');
      let chosenTolerance = null;
      const tightOptions = toleranceOptions.filter(o => typeof o.value_mm === 'number' && o.value_mm <= 0.02);
      if (tightOptions.length > 0) {
        tightOptions.sort((a, b) => a.value_mm - b.value_mm);
        chosenTolerance = tightOptions[0];
      } else {
        chosenTolerance = toleranceOptions[0];
      }

      // Select fastest standard lead time <=15 business days if possible
      const leadTimeOptions = rfqConfig.lead_time_options || [];
      this.assert(leadTimeOptions.length > 0, 'Lead time options should be available');
      let chosenLead = null;
      const stdUnder15 = leadTimeOptions.filter(o => o.type === 'standard' && typeof o.business_days_max === 'number' && o.business_days_max <= 15);
      if (stdUnder15.length > 0) {
        stdUnder15.sort((a, b) => a.business_days_max - b.business_days_max);
        chosenLead = stdUnder15[0];
      } else {
        chosenLead = leadTimeOptions.find(o => o.type === 'standard') || leadTimeOptions[0];
      }

      const length_mm = 120;
      const diameter_mm = 20;
      const quantity = 250;
      const contactName = 'Alex Taylor';
      const contactEmail = 'alex.taylor@example.com';
      const leadDays = typeof chosenLead.business_days_min === 'number' ? chosenLead.business_days_min : chosenLead.business_days_max;

      const submitResult = this.logic.submitRequestQuote(
        machiningType,
        material,
        length_mm,
        undefined,
        undefined,
        diameter_mm,
        quantity,
        chosenTolerance.label,
        chosenTolerance.value_mm,
        chosenTolerance.value_in,
        chosenTolerance.tolerance_class,
        chosenLead.type,
        leadDays,
        undefined,
        undefined,
        false,
        false,
        undefined,
        contactName,
        contactEmail,
        undefined,
        undefined
      );

      this.assert(submitResult && submitResult.success === true, 'RFQ submission should succeed');
      this.assert(!!submitResult.quote_id, 'RFQ submission should return quote_id');

      const allQuotes = JSON.parse(localStorage.getItem('request_quotes') || '[]');
      const savedQuote = allQuotes.find(q => q.id === submitResult.quote_id);
      this.assert(savedQuote, 'Saved RFQ should exist in storage');
      this.assert(savedQuote.machining_type === machiningType, 'Saved RFQ machining_type should match selection');
      this.assert(savedQuote.material === material, 'Saved RFQ material should match selection');
      this.assert(savedQuote.quantity === quantity, 'Saved RFQ quantity should be 250');
      this.assert(savedQuote.length_mm === length_mm, 'Saved RFQ length should be 120 mm');
      this.assert(savedQuote.diameter_mm === diameter_mm, 'Saved RFQ diameter should be 20 mm');
      this.assert(savedQuote.contact_name === contactName, 'Saved RFQ contact_name should match');
      this.assert(savedQuote.contact_email === contactEmail, 'Saved RFQ contact_email should match');

      if (chosenLead.type === 'standard' && typeof chosenLead.business_days_max === 'number') {
        this.assert(savedQuote.lead_time_type === 'standard', 'Lead time type should be standard when selected');
        this.assert(savedQuote.lead_time_business_days <= chosenLead.business_days_max, 'Saved lead time should be <= configured max for selected standard option');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Identify tight-tolerance service and request sample project info (adapted to available cnc_turning services)
  testTask2_ServiceInquiryTightTolerance() {
    const testName = 'Task 2: Service search by process/material/tolerance and submit service inquiry';
    console.log('Testing:', testName);

    try {
      // Navigate to Capabilities/Services
      const filterOptions = this.logic.getCapabilitiesFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Capabilities filter options should load');

      // Use filters: cnc_turning, stainless_steel_304, max_tolerance_in 0.005
      const filters = {
        process_type: 'cnc_turning',
        material: 'stainless_steel_304',
        max_tolerance_in: 0.005,
        axes_min: 2,
        is_active_only: true
      };

      const searchResult = this.logic.searchServices(filters, 'tolerance_tightest', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.services), 'searchServices should return services array');
      this.assert(searchResult.services.length > 0, 'At least one service should match filters');

      const topService = searchResult.services[0];
      this.assert(topService && topService.id, 'Top service should have an id');

      // Verify material spec for stainless_steel_304 meets requested tolerance
      if (Array.isArray(topService.material_specs) && topService.material_specs.length > 0) {
        const matSpec = topService.material_specs.find(ms => ms.material === 'stainless_steel_304');
        this.assert(!!matSpec, 'Top service should have material spec for stainless_steel_304');
        if (typeof matSpec.min_tolerance_in === 'number') {
          this.assert(matSpec.min_tolerance_in <= 0.005, 'Service material spec tolerance should be <= 0.005 in');
        }
      }

      // Open service detail page
      const detail = this.logic.getServiceDetail(topService.id);
      this.assert(detail && detail.service && detail.service.id === topService.id, 'Service detail should load for selected service');

      // Open service inquiry form
      const inquiryConfig = this.logic.getServiceInquiryFormConfig(topService.id);
      this.assert(inquiryConfig && inquiryConfig.service && inquiryConfig.service.id === topService.id, 'Inquiry form config should reference selected service');
      this.assert(Array.isArray(inquiryConfig.required_fields), 'Inquiry config should include required_fields');

      const subject = 'Request for sample project using service: ' + topService.name;
      const message = 'Request for sample high-precision stainless shaft project using service "' + topService.name + '". Please share a sample project using this service.';
      const contactName = 'Jordan Lee';
      const contactEmail = 'jordan.lee@example.com';

      const inquiryResult = this.logic.submitServiceInquiry(
        topService.id,
        subject,
        message,
        contactName,
        contactEmail,
        undefined,
        undefined
      );

      this.assert(inquiryResult && inquiryResult.success === true, 'Service inquiry submission should succeed');
      this.assert(!!inquiryResult.inquiry_id, 'Service inquiry should return an inquiry_id');

      const allInquiries = JSON.parse(localStorage.getItem('service_inquiries') || '[]');
      const savedInquiry = allInquiries.find(i => i.id === inquiryResult.inquiry_id);
      this.assert(savedInquiry, 'Saved ServiceInquiry should exist in storage');
      this.assert(savedInquiry.service_id === topService.id, 'ServiceInquiry.service_id should match selected service');
      this.assert(savedInquiry.subject === subject, 'ServiceInquiry.subject should match submission');
      this.assert(savedInquiry.message.indexOf(topService.name) !== -1, 'ServiceInquiry.message should reference the service name');
      this.assert(savedInquiry.contact_name === contactName, 'ServiceInquiry.contact_name should match');
      this.assert(savedInquiry.contact_email === contactEmail, 'ServiceInquiry.contact_email should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Compare titanium vs stainless using cost estimator, set preferred, then proceed to quote
  testTask3_CostEstimatorAndPreferredQuote() {
    const testName = 'Task 3: Cost estimator comparison and RFQ with preferred material';
    console.log('Testing:', testName);

    try {
      const config = this.logic.getCostEstimatorFormConfig();
      this.assert(config && Array.isArray(config.part_types), 'Cost estimator config should include part_types');

      const partTypeOption = config.part_types.find(p => p.value === 'medical_implant_component') || config.part_types[0];
      this.assert(partTypeOption, 'A part type option should be available');

      const finishOption = (config.surface_finishes || []).find(f => f.value === 'ra_0_8_um_fine') || (config.surface_finishes || [])[0];
      this.assert(finishOption, 'A surface finish option should be available');

      const quantity = 100;

      // Calculate titanium estimate
      const tiEstimate = this.logic.calculateCostEstimate(
        partTypeOption.value,
        quantity,
        'titanium_grade_5',
        finishOption.value
      );
      this.assert(tiEstimate && tiEstimate.id, 'Titanium cost estimate should be created');

      // Calculate stainless 316L estimate
      const ssEstimate = this.logic.calculateCostEstimate(
        partTypeOption.value,
        quantity,
        'stainless_steel_316l',
        finishOption.value
      );
      this.assert(ssEstimate && ssEstimate.id, 'Stainless cost estimate should be created');

      // Choose cheaper option; if both under $40, still choose cheaper; if only one under $40, prefer that; otherwise choose cheaper anyway
      const tiUnder40 = tiEstimate.estimated_cost_per_unit <= 40;
      const ssUnder40 = ssEstimate.estimated_cost_per_unit <= 40;

      let preferredEst = null;
      if (tiUnder40 && !ssUnder40) {
        preferredEst = tiEstimate;
      } else if (!tiUnder40 && ssUnder40) {
        preferredEst = ssEstimate;
      } else {
        preferredEst = tiEstimate.estimated_cost_per_unit <= ssEstimate.estimated_cost_per_unit ? tiEstimate : ssEstimate;
      }

      // Mark chosen estimate as preferred
      const setPrefResult = this.logic.setPreferredCostEstimate(preferredEst.id);
      this.assert(setPrefResult && setPrefResult.success === true, 'setPreferredCostEstimate should succeed');
      this.assert(setPrefResult.updated_cost_estimate && setPrefResult.updated_cost_estimate.id === preferredEst.id, 'Updated preferred estimate should match chosen estimate');
      this.assert(setPrefResult.updated_cost_estimate.is_preferred === true, 'Updated estimate should be marked as preferred');

      // Verify preferred via API
      const preferredWrapper = this.logic.getPreferredCostEstimate();
      this.assert(preferredWrapper && preferredWrapper.cost_estimate, 'getPreferredCostEstimate should return a cost_estimate');
      this.assert(preferredWrapper.cost_estimate.id === preferredEst.id, 'Preferred cost estimate id should match chosen estimate');

      // Verify preferred in storage
      const allEstimates = JSON.parse(localStorage.getItem('cost_estimates') || '[]');
      const storedPreferred = allEstimates.find(e => e.id === preferredEst.id);
      this.assert(storedPreferred && storedPreferred.is_preferred === true, 'Stored preferred estimate should be marked is_preferred=true');

      // Proceed to RFQ with preferred cost estimate
      const rfqConfig = this.logic.getRequestQuoteFormConfig(preferredEst.id);
      this.assert(rfqConfig && rfqConfig.prefill, 'RFQ config with preferred estimate should include prefill');
      this.assert(rfqConfig.prefill.preferred_cost_estimate_id === preferredEst.id, 'RFQ prefill should reference preferred cost estimate');
      this.assert(rfqConfig.prefill.material === preferredEst.material, 'RFQ prefill material should match preferred estimate');
      this.assert(rfqConfig.prefill.quantity === preferredEst.quantity, 'RFQ prefill quantity should match preferred estimate');

      const machiningTypeOption = rfqConfig.machining_types.find(mt => mt.value === 'five_axis_cnc_machining') || rfqConfig.machining_types[0];
      const machiningType = machiningTypeOption.value;

      const toleranceOptions = rfqConfig.tolerance_options || [];
      this.assert(toleranceOptions.length > 0, 'RFQ tolerance options should be available');
      const chosenTolerance = toleranceOptions[0];

      const leadTimeOptions = rfqConfig.lead_time_options || [];
      this.assert(leadTimeOptions.length > 0, 'RFQ lead time options should be available');
      const chosenLead = leadTimeOptions[0];
      const leadDays = typeof chosenLead.business_days_min === 'number' ? chosenLead.business_days_min : chosenLead.business_days_max;

      const contactName = 'Cost Estimator User';
      const contactEmail = 'cost.estimator@example.com';

      const quoteResult = this.logic.submitRequestQuote(
        machiningType,
        rfqConfig.prefill.material,
        undefined,
        undefined,
        undefined,
        undefined,
        rfqConfig.prefill.quantity,
        chosenTolerance.label,
        chosenTolerance.value_mm,
        chosenTolerance.value_in,
        chosenTolerance.tolerance_class,
        chosenLead.type,
        leadDays,
        undefined,
        undefined,
        false,
        false,
        preferredEst.id,
        contactName,
        contactEmail,
        undefined,
        undefined
      );

      this.assert(quoteResult && quoteResult.success === true, 'RFQ submission from preferred cost estimate should succeed');
      this.assert(!!quoteResult.quote_id, 'RFQ from preferred cost estimate should return quote_id');

      const allQuotes = JSON.parse(localStorage.getItem('request_quotes') || '[]');
      const savedQuote = allQuotes.find(q => q.id === quoteResult.quote_id);
      this.assert(savedQuote, 'Saved RFQ (from cost estimator) should exist');
      this.assert(savedQuote.preferred_cost_estimate_id === preferredEst.id, 'RFQ should reference preferred CostEstimate id');
      this.assert(savedQuote.material === preferredEst.material, 'RFQ material should match preferred estimate material');
      this.assert(savedQuote.quantity === preferredEst.quantity, 'RFQ quantity should match preferred estimate quantity');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Find aerospace case study with <=10 days and start similar project request
  testTask4_AerospaceCaseStudySimilarProject() {
    const testName = 'Task 4: Aerospace case study <=10 days and Start a Similar Project';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getCaseStudyFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.industries), 'Case study filter options should include industries');

      const filters = {
        industry: 'aerospace',
        lead_time_tag: 'le_10_days'
      };

      const listResult = this.logic.listCaseStudies(filters, 'fastest_delivery', 1, 10);
      this.assert(listResult && Array.isArray(listResult.case_studies), 'listCaseStudies should return case_studies array');
      this.assert(listResult.case_studies.length > 0, 'At least one aerospace case study with <=10 days should be returned');

      let selectedCase = listResult.case_studies.find(cs => cs.delivery_time_days <= 10) || listResult.case_studies[0];
      this.assert(selectedCase && selectedCase.id, 'Selected case study should have an id');

      const detail = this.logic.getCaseStudyDetail(selectedCase.id);
      this.assert(detail && detail.case_study && detail.case_study.id === selectedCase.id, 'Case study detail should load for selected case');

      const similarConfig = this.logic.getSimilarProjectFormConfig(selectedCase.id);
      this.assert(similarConfig && similarConfig.case_study && similarConfig.case_study.id === selectedCase.id, 'Similar project form config should reference selected case study');

      const projectName = 'Aerospace project similar to ' + selectedCase.title;
      const description = 'We would like a project similar to "' + selectedCase.title + '" and are aiming for delivery in 10 days or less.';
      const targetDeliveryDays = 10;
      const contactName = 'Morgan Rivera';
      const contactEmail = 'morgan.rivera@example.com';

      const submitResult = this.logic.submitSimilarProjectRequest(
        selectedCase.id,
        projectName,
        description,
        targetDeliveryDays,
        contactName,
        contactEmail
      );

      this.assert(submitResult && submitResult.success === true, 'Similar project request submission should succeed');
      this.assert(!!submitResult.similar_project_request_id, 'Similar project request should return an id');

      const allRequests = JSON.parse(localStorage.getItem('similar_project_requests') || '[]');
      const savedRequest = allRequests.find(r => r.id === submitResult.similar_project_request_id);
      this.assert(savedRequest, 'Saved SimilarProjectRequest should exist in storage');
      this.assert(savedRequest.case_study_id === selectedCase.id, 'SimilarProjectRequest.case_study_id should match selected case');
      this.assert(savedRequest.project_name === projectName, 'SimilarProjectRequest.project_name should match');
      this.assert(savedRequest.description.indexOf(selectedCase.title) !== -1, 'SimilarProjectRequest.description should reference case study title');
      this.assert(savedRequest.target_delivery_days === targetDeliveryDays, 'SimilarProjectRequest.target_delivery_days should be 10');
      this.assert(savedRequest.contact_name === contactName, 'SimilarProjectRequest.contact_name should match');
      this.assert(savedRequest.contact_email === contactEmail, 'SimilarProjectRequest.contact_email should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Build comparison of three machines with part length >=500 mm and surface finish <= Ra 1.6 µm
  testTask5_EquipmentComparison() {
    const testName = 'Task 5: Equipment search and comparison of three capable machines';
    console.log('Testing:', testName);

    try {
      const eqFilterOptions = this.logic.getEquipmentFilterOptions();
      this.assert(eqFilterOptions && typeof eqFilterOptions === 'object', 'Equipment filter options should load');

      const filters = {
        min_part_length_mm: 500,
        max_surface_roughness_ra_um: 1.6,
        is_active_only: true
      };

      const searchResult = this.logic.searchMachines(filters, 'most_capable_first', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.machines), 'searchMachines should return machines array');
      this.assert(searchResult.machines.length >= 3, 'At least three machines should meet length and surface requirements');

      const machinesToCompare = searchResult.machines.slice(0, 3);

      let comparisonId = null;
      machinesToCompare.forEach((m, index) => {
        const addResult = this.logic.addMachineToComparison(m.id);
        this.assert(addResult && addResult.success === true, 'addMachineToComparison should succeed for machine index ' + index);
        this.assert(Array.isArray(addResult.selected_machine_ids), 'addMachineToComparison should return selected_machine_ids');
        comparisonId = addResult.comparison_id || comparisonId;
      });

      this.assert(!!comparisonId, 'A comparison_id should be established after adding machines');

      const summary = this.logic.getCurrentEquipmentComparisonSummary();
      this.assert(summary && Array.isArray(summary.machine_ids), 'Equipment comparison summary should include machine_ids');
      this.assert(summary.machine_ids.length >= 3, 'Equipment comparison should include at least three machines');

      // Ensure selected machines include the three we chose
      machinesToCompare.forEach(m => {
        this.assert(summary.machine_ids.indexOf(m.id) !== -1, 'Comparison should include machine id ' + m.id);
      });

      // Load comparison details
      const details = this.logic.getEquipmentComparisonDetails(summary.comparison_id);
      this.assert(details && Array.isArray(details.machines), 'Equipment comparison details should include machines array');
      this.assert(details.machines.length >= 3, 'Comparison details should show at least three machines');

      // Verify each compared machine meets filter constraints
      details.machines.forEach(m => {
        if (typeof m.max_part_length_mm === 'number') {
          this.assert(m.max_part_length_mm >= 500, 'Compared machine ' + m.id + ' should support part length >= 500 mm');
        }
        if (typeof m.min_surface_roughness_ra_um === 'number') {
          this.assert(m.min_surface_roughness_ra_um <= 1.6, 'Compared machine ' + m.id + ' should support Ra <= 1.6 µm');
        }
      });

      // Save and email comparison (if email is sent, it should go to provided address)
      const email = 'machine.compare@example.com';
      const saveResult = this.logic.saveAndEmailEquipmentComparison(summary.comparison_id, 'Test comparison - three machines', email);
      this.assert(saveResult && saveResult.success === true, 'saveAndEmailEquipmentComparison should succeed');
      this.assert(saveResult.comparison_id === summary.comparison_id, 'saveAndEmailEquipmentComparison should return same comparison_id');
      if (saveResult.email_sent) {
        this.assert(saveResult.emailed_to === email, 'Comparison email should be sent to the provided address when email_sent=true');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Schedule a plant tour on a weekday morning next month
  testTask6_PlantTourNextMonthWeekday() {
    const testName = 'Task 6: Plant tour scheduling for weekday morning next month';
    console.log('Testing:', testName);

    try {
      // Navigate via About/Visit content
      const aboutContent = this.logic.getAboutUsContent();
      this.assert(aboutContent && typeof aboutContent === 'object', 'About Us content should load');

      const visitContent = this.logic.getVisitPageContent();
      this.assert(visitContent && typeof visitContent === 'object', 'Visit page content should load');

      const formConfig = this.logic.getPlantTourFormConfig();
      this.assert(formConfig && Array.isArray(formConfig.available_time_slots), 'Plant tour form config should include time slots');

      // Choose morning time slot if available
      const timeSlotObj = formConfig.available_time_slots.find(ts => ts.value === 'morning') || formConfig.available_time_slots[0];
      this.assert(timeSlotObj, 'At least one time slot should be available');

      const minDate = new Date(formConfig.min_selectable_date);
      const maxDate = new Date(formConfig.max_selectable_date);
      this.assert(!isNaN(minDate.getTime()), 'min_selectable_date should be a valid date');
      this.assert(!isNaN(maxDate.getTime()), 'max_selectable_date should be a valid date');

      // Compute a date in the next calendar month relative to min_selectable_date, within allowed range
      let candidate = new Date(minDate.getTime());
      const originalDay = candidate.getDate();
      candidate.setMonth(candidate.getMonth() + 1);
      // Guard against month overflow by clamping day
      if (candidate.getDate() !== originalDay) {
        candidate.setDate(1);
      }

      if (candidate > maxDate) {
        // Fallback: just use minDate within range
        candidate = new Date(minDate.getTime());
      }

      // Adjust to weekday if required
      if (formConfig.weekday_only) {
        let safetyCounter = 0;
        while ((candidate.getDay() === 0 || candidate.getDay() === 6) && candidate <= maxDate && safetyCounter < 14) {
          candidate.setDate(candidate.getDate() + 1);
          safetyCounter += 1;
        }
      }

      const visitDateIso = candidate.toISOString();

      const attendees = 3;
      const notes = 'We would like a general tour focused on CNC machining capabilities.';
      const contactName = 'Taylor Morgan';
      const contactEmail = 'taylor.morgan@example.com';
      const contactPhone = '555-123-4567';

      const submitResult = this.logic.submitPlantTourRequest(
        visitDateIso,
        timeSlotObj.value,
        attendees,
        notes,
        contactName,
        contactEmail,
        contactPhone
      );

      this.assert(submitResult && submitResult.success === true, 'Plant tour request submission should succeed');
      this.assert(!!submitResult.plant_tour_request_id, 'Plant tour request should return an id');

      const allTours = JSON.parse(localStorage.getItem('plant_tour_requests') || '[]');
      const savedTour = allTours.find(t => t.id === submitResult.plant_tour_request_id);
      this.assert(savedTour, 'Saved PlantTourRequest should exist in storage');
      this.assert(savedTour.attendees_count === attendees, 'PlantTourRequest.attendees_count should be 3');
      this.assert(savedTour.time_slot === timeSlotObj.value, 'PlantTourRequest.time_slot should match selected slot');
      this.assert(savedTour.contact_name === contactName, 'PlantTourRequest.contact_name should match');
      this.assert(savedTour.contact_email === contactEmail, 'PlantTourRequest.contact_email should match');
      if (savedTour.visit_date) {
        this.assert(!isNaN(new Date(savedTour.visit_date).getTime()), 'PlantTourRequest.visit_date should be a valid date');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Create cart with multiple standard parts under $150
  testTask7_CartWithStandardParts() {
    const testName = 'Task 7: Cart with 3 standard parts under $150 (2+ turning, 1 milling or fallback)';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getProductFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Product filter options should include categories');

      // Turning parts under $150
      const turningFilters = {
        category: 'cnc_turning_parts',
        max_price: 150,
        is_active_only: true
      };
      const turningResult = this.logic.listProducts(turningFilters, 'price_asc', 1, 10);
      this.assert(turningResult && Array.isArray(turningResult.products), 'listProducts for turning parts should return products');
      this.assert(turningResult.products.length >= 2, 'At least two turning parts under $150 should be available');

      const turningProducts = turningResult.products;
      const turning1 = turningProducts[0];
      const turning2 = turningProducts[1];

      // Add two turning parts
      let addResult1 = this.logic.addToCart(turning1.id, 1);
      this.assert(addResult1 && addResult1.success === true, 'First turning part should be added to cart');
      let addResult2 = this.logic.addToCart(turning2.id, 1);
      this.assert(addResult2 && addResult2.success === true, 'Second turning part should be added to cart');

      // Milling parts under $150 (may not exist in generated data; fallback to third turning part)
      const millingFilters = {
        category: 'cnc_milling_parts',
        max_price: 150,
        is_active_only: true
      };
      const millingResult = this.logic.listProducts(millingFilters, 'price_asc', 1, 10);
      this.assert(millingResult && Array.isArray(millingResult.products), 'listProducts for milling parts should return products array (possibly empty)');

      let thirdProduct = null;
      if (millingResult.products.length > 0) {
        thirdProduct = millingResult.products[0];
      } else {
        // Fallback: use third distinct turning part if available
        this.assert(turningProducts.length >= 3, 'A third turning part should be available for fallback');
        thirdProduct = turningProducts[2];
      }

      const addResult3 = this.logic.addToCart(thirdProduct.id, 1);
      this.assert(addResult3 && addResult3.success === true, 'Third product should be added to cart');

      // View cart
      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');
      this.assert(cart.items.length >= 3, 'Cart should contain at least three line items');

      // Validate each item price < $150 and count turning vs milling
      let turningCount = 0;
      let millingCount = 0;
      cart.items.forEach(item => {
        this.assert(item.unit_price < 150, 'Cart item unit_price should be < 150, got ' + item.unit_price);
        if (item.category === 'cnc_turning_parts') turningCount += 1;
        if (item.category === 'cnc_milling_parts') millingCount += 1;
      });

      this.assert(turningCount >= 2, 'Cart should contain at least two turning part line items');
      // We do not assert millingCount >= 1 because milling parts may not exist in generated data, but we exercised the category filter

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Use lead-time calculator to choose shipping option delivering 500 anodized parts within 12 business days
  testTask8_LeadTimeCalculator() {
    const testName = 'Task 8: Lead-time calculation for 500 anodized & inspected parts with <=12-day option';
    console.log('Testing:', testName);

    try {
      const config = this.logic.getLeadTimeCalculatorConfig();
      this.assert(config && Array.isArray(config.process_options), 'Lead time calculator config should include process options');

      // Ensure anodizing and dimensional_inspection options exist or at least proceed with those values
      const processes = ['anodizing', 'dimensional_inspection'];

      const quantity = 500;
      const calcResult = this.logic.calculateLeadTimeOptions(quantity, processes);
      this.assert(calcResult && Array.isArray(calcResult.options), 'calculateLeadTimeOptions should return options array');
      this.assert(!!calcResult.calculation_id, 'Lead time calculation should return calculation_id');

      // Choose option with total_lead_time_days <= 12 and lowest cost; if none, choose option with minimum total_lead_time_days
      const qualifying = calcResult.options.filter(o => o.total_lead_time_days <= 12);
      let chosenOption = null;
      if (qualifying.length > 0) {
        qualifying.sort((a, b) => {
          if (a.estimated_shipping_cost === b.estimated_shipping_cost) {
            return a.total_lead_time_days - b.total_lead_time_days;
          }
          return a.estimated_shipping_cost - b.estimated_shipping_cost;
        });
        chosenOption = qualifying[0];
      } else {
        calcResult.options.sort((a, b) => a.total_lead_time_days - b.total_lead_time_days);
        chosenOption = calcResult.options[0];
      }

      this.assert(chosenOption && chosenOption.option_id, 'A lead-time option should be chosen');

      const selectResult = this.logic.selectLeadTimeOption(chosenOption.option_id);
      this.assert(selectResult && selectResult.success === true, 'selectLeadTimeOption should succeed');
      this.assert(selectResult.selected_option && selectResult.selected_option.option_id === chosenOption.option_id, 'Selected option should match chosen option');

      const summary = this.logic.getLeadTimeSummary(selectResult.calculation_id);
      this.assert(summary && summary.calculation_id === selectResult.calculation_id, 'Lead time summary should reference the same calculation');
      this.assert(summary.quantity === quantity, 'Lead time summary quantity should be 500');
      this.assert(Array.isArray(summary.processes), 'Lead time summary should include processes array');
      processes.forEach(p => {
        this.assert(summary.processes.indexOf(p) !== -1, 'Lead time summary processes should include ' + p);
      });
      this.assert(summary.selected_option && summary.selected_option.option_id === chosenOption.option_id, 'Lead time summary selected_option should match chosen option');

      // Verify relationships in storage: LeadTimeCalculation and LeadTimeOption
      const allCalcs = JSON.parse(localStorage.getItem('lead_time_calculations') || '[]');
      const savedCalc = allCalcs.find(c => c.id === summary.calculation_id);
      this.assert(savedCalc, 'LeadTimeCalculation should exist in storage for calculation_id');
      this.assert(savedCalc.quantity === quantity, 'LeadTimeCalculation.quantity should be 500');

      const allOptions = JSON.parse(localStorage.getItem('lead_time_options') || '[]');
      const optionsForCalc = allOptions.filter(o => o.calculation_id === summary.calculation_id);
      this.assert(optionsForCalc.length > 0, 'LeadTimeOptions should exist for calculation');
      const selectedStored = optionsForCalc.find(o => o.id === chosenOption.option_id);
      this.assert(selectedStored && selectedStored.is_selected === true, 'One LeadTimeOption should be marked is_selected=true for the calculation');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper methods
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
