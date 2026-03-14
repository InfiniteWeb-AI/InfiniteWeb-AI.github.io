class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Ensure localStorage exists (Node.js polyfill if needed)
    if (typeof localStorage === 'undefined' || !localStorage) {
      global.localStorage = {
        _data: {},
        setItem(key, value) {
          this._data[key] = String(value);
        },
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._data, key)
            ? this._data[key]
            : null;
        },
        removeItem(key) {
          delete this._data[key];
        },
        clear() {
          this._data = {};
        }
      };
    } else {
      localStorage.clear();
    }

    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data: used ONLY here to seed localStorage
    const generatedData = {
      consulting_services: [
        {
          id: 'slope_stability_retaining_walls',
          name: 'Slope Stability & Retaining Walls',
          slug: 'slope-stability-retaining-walls',
          pageFilename: 'service_slope_stability.html',
          primaryDiscipline: 'geotechnical_engineering',
          summary:
            'Advanced slope stability assessment, landslide remediation, and retaining wall design for transportation, infrastructure, and site development projects.',
          description:
            'Our slope stability and retaining wall team provides end\u2011to\u2011end support from preliminary screening through detailed numerical modeling and construction support. Services include limit\u2011equilibrium and finite element stability analyses, retaining wall type selection and design, landslide and embankment remediation concepts, seismic stability evaluations, and independent design reviews.',
          isFeatured: true,
          image:
            'https://images.unsplash.com/photo-1529420705456-9dcd8e335f5b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'subsurface_investigation',
          name: 'Subsurface Investigation',
          slug: 'subsurface-investigation',
          pageFilename: 'service_subsurface_investigation.html',
          primaryDiscipline: 'geotechnical_engineering',
          summary:
            'Drilling, in\u2011situ testing, and laboratory programs tailored to support foundation, earthworks, and infrastructure design.',
          description:
            'We scope and execute subsurface investigation programs ranging from small building sites to regional transportation corridors. Our capabilities include rotary wash drilling, hollow\u2011stem auger borings, CPT soundings, pressuremeter testing, geophysics, and comprehensive laboratory testing. We emphasize investigation programs targeted to specific design decisions and risk levels.',
          isFeatured: true,
          image:
            'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'deep_foundations',
          name: 'Deep Foundations & Piling',
          slug: 'deep-foundations-piling',
          pageFilename: 'service_deep_foundations.html',
          primaryDiscipline: 'geotechnical_engineering',
          summary:
            'Design and testing of pile foundations, drilled shafts, and ground anchors for heavy structures.',
          description:
            'We provide feasibility studies, preliminary sizing, and detailed design for driven piles, drilled shafts, micropiles, and ground anchors. Our engineers routinely support static and dynamic load testing, PDA monitoring, integrity testing, and construction phase troubleshooting for complex deep foundation systems.',
          isFeatured: false,
          image:
            'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      investigation_packages: [
        {
          id: 'pkg_bldg_standard_borings',
          name: 'Standard Building Foundation Borings',
          slug: 'standard-building-foundation-borings',
          description:
            'Baseline subsurface investigation for low\u2011 to mid\u2011rise building foundations using soil borings and SPT testing.',
          projectType: 'building_foundations',
          price: 7500,
          currency: 'usd',
          features: [
            'Up to 4 soil borings to 15 m depth',
            'Standard Penetration Test (SPT) at 1.5 m intervals',
            'Groundwater level observations',
            'Basic index testing (moisture content, Atterberg limits)',
            'Summary geotechnical recommendations memo'
          ],
          includesCptSoundings: false,
          includesConsolidationTesting: false,
          estimatedDurationDays: 10,
          notes:
            'Suitable for small commercial or light industrial buildings on relatively uniform soils.',
          isActive: true
        },
        {
          id: 'pkg_bldg_cpt_consol_compact',
          name: 'Building Foundation CPT & Consolidation Package',
          slug: 'building-foundation-cpt-consolidation-package',
          description:
            'Integrated investigation for building foundations combining CPT soundings with targeted borings and consolidation testing.',
          projectType: 'building_foundations',
          price: 11500,
          currency: 'usd',
          features: [
            'Up to 3 CPT soundings to 20 m depth',
            '2 soil borings with SPT sampling',
            'CPT soundings',
            'Consolidation (oedometer) testing',
            'Grain size distribution and Atterberg limits',
            'Preliminary bearing capacity and settlement assessment',
            'Geotechnical data summary and foundation design letter'
          ],
          includesCptSoundings: true,
          includesConsolidationTesting: true,
          estimatedDurationDays: 14,
          notes:
            'Optimized for mid\u2011rise commercial or institutional buildings where settlement performance is critical.',
          isActive: true
        },
        {
          id: 'pkg_bldg_premium_cpt_lab',
          name: 'Premium High\u2011Rise Foundation Investigation',
          slug: 'premium-high-rise-foundation-investigation',
          description:
            'Comprehensive investigation for high\u2011rise and heavily loaded structures, including advanced in\u2011situ testing and an extended lab program.',
          projectType: 'building_foundations',
          price: 16500,
          currency: 'usd',
          features: [
            'Up to 5 CPT soundings to 30 m depth',
            '3 deep borings with continuous sampling in critical strata',
            'CPT soundings',
            'Consolidation (oedometer) testing',
            'Triaxial shear and modulus testing',
            'Pressuremeter or dilatometer testing (where feasible)',
            'Detailed foundation design parameters report'
          ],
          includesCptSoundings: true,
          includesConsolidationTesting: true,
          estimatedDurationDays: 21,
          notes:
            'Recommended for high\u2011value projects or sites with complex stratigraphy and compressible soils.',
          isActive: true
        }
      ],
      project_case_studies: [
        {
          id: 'cs_commercial_pile_12m_hq',
          title: 'Downtown Corporate HQ on Driven Piles',
          slug: 'downtown-corporate-hq-driven-piles',
          sector: 'commercial_buildings',
          foundationType: 'pile_foundations',
          locationCity: 'Seattle',
          locationState: 'WA',
          locationCountry: 'USA',
          projectValueUsd: 12000000,
          projectValueDisplay: '$12M',
          summary:
            'Design and construction support for a 14\u2011story corporate headquarters founded on driven steel H\u2011piles over soft alluvial deposits.',
          content:
            'The project involved a new steel\u2011framed office tower in downtown Seattle with column loads exceeding 40 MN. Subsurface conditions consisted of recent alluvial sands and silts over dense glacial till. We completed a focused CPT and boring program, followed by static and dynamic load testing on test piles. Final design used 310 mm H\u2011piles driven to practical refusal in the till layer. Services included axial and lateral pile group design, seismic downdrag assessment, and construction monitoring during pile installation.',
          completionDate: '2023-11-15T00:00:00Z',
          mainImage:
            'https://i0.hippopx.com/photos/455/401/242/night-downtown-towers-skyline-preview.jpg',
          isFeatured: true
        },
        {
          id: 'cs_commercial_pile_8m_mixeduse',
          title: 'Waterfront Mixed\u2011Use Development with Pile Foundations',
          slug: 'waterfront-mixed-use-pile-foundations',
          sector: 'commercial_buildings',
          foundationType: 'pile_foundations',
          locationCity: 'Oakland',
          locationState: 'CA',
          locationCountry: 'USA',
          projectValueUsd: 8000000,
          projectValueDisplay: '$8M',
          summary:
            'Pile foundation system for a mixed\u2011use waterfront project on variable fill and soft Bay mud.',
          content:
            'This project comprised retail space with two levels of structured parking built over historic waterfront fill. Geotechnical challenges included variable thickness of compressible Bay mud and seismic lateral spreading potential. We recommended precast concrete piles driven to dense sand beneath the mud layer, with pile groups detailed for liquefaction\u2011induced lateral displacement. Our team provided design parameters, reviewed contractor submittals, and observed production pile driving to verify capacity.',
          completionDate: '2022-06-30T00:00:00Z',
          mainImage:
            'https://www.wildnatureimages.com/images/640/090721-088-Vancouver-Canada.jpg',
          isFeatured: false
        },
        {
          id: 'cs_commercial_pile_5_5m_medical',
          title: 'Medical Office Building on Drilled Shafts',
          slug: 'medical-office-building-drilled-shafts',
          sector: 'commercial_buildings',
          foundationType: 'pile_foundations',
          locationCity: 'Denver',
          locationState: 'CO',
          locationCountry: 'USA',
          projectValueUsd: 5500000,
          projectValueDisplay: '$5.5M',
          summary:
            'Design of drilled shaft foundations for a 6\u2011story medical office building over overconsolidated claystone.',
          content:
            'The medical office building required strict settlement and vibration performance criteria for imaging equipment. Our investigation identified weathered claystone over competent bedrock at moderate depth. Drilled shaft foundations were selected to bypass weak surficial soils. We provided axial and lateral capacity evaluation, rock socket design, and construction recommendations for slurry\u2011supported shafts. The final design optimized shaft diameters and lengths to control movements while maintaining construction economy.',
          completionDate: '2021-09-10T00:00:00Z',
          mainImage:
            'https://1a5b7906713f504440cf-28a51c774f7cca5c682125807ec0c582.ssl.cf1.rackcdn.com/IMG_6678.jpg',
          isFeatured: false
        }
      ],
      resources: [
        {
          id: 'res_retaining_checklist_2021_basic',
          title: 'Retaining Wall Design Checklist \u2013 Introductory Edition (2021)',
          slug: 'retaining-wall-design-checklist-intro-2021',
          resourceType: 'guides_checklists',
          topic: 'retaining_walls',
          level: 'beginner',
          publishedDate: '2021-06-15T00:00:00Z',
          summary:
            'A step\u2011by\u2011step checklist covering basic gravity and cantilever retaining wall design considerations for junior engineers.',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          fileSizeMb: 2.3,
          downloadCount: 1840,
          isChecklist: true
        },
        {
          id: 'res_retaining_checklist_2023_intermediate',
          title: 'Intermediate Retaining Wall Design Checklist (2023 Edition)',
          slug: 'intermediate-retaining-wall-design-checklist-2023',
          resourceType: 'guides_checklists',
          topic: 'retaining_walls',
          level: 'intermediate',
          publishedDate: '2023-05-10T00:00:00Z',
          summary:
            'An expanded retaining wall design checklist covering internal and external stability checks for MSE, cantilever, and gravity walls.',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          fileSizeMb: 3.1,
          downloadCount: 920,
          isChecklist: true
        },
        {
          id: 'res_retaining_checklist_2025_intermediate',
          title: 'Intermediate Retaining Wall Design Checklist (2025 Update)',
          slug: 'intermediate-retaining-wall-design-checklist-2025',
          resourceType: 'guides_checklists',
          topic: 'retaining_walls',
          level: 'intermediate',
          publishedDate: '2025-02-18T00:00:00Z',
          summary:
            'The latest intermediate\u2011level retaining wall design checklist incorporating current code references and seismic design considerations.',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          fileSizeMb: 3.6,
          downloadCount: 210,
          isChecklist: true
        }
      ],
      team_members: [
        {
          id: 'tm_emma_chen',
          name: 'Emma Chen, P.E.',
          jobTitle: 'Principal Geotechnical Engineer',
          region: 'west',
          discipline: 'geotechnical_engineering',
          yearsOfExperience: 14,
          experienceSummary:
            '14+ years of geotechnical engineering experience on transportation and infrastructure projects.',
          keySkills: [
            'slope stability',
            'landslide analysis',
            'retaining wall design',
            'seismic site response',
            'deep foundations'
          ],
          bio:
            'Emma specializes in slope stability and retaining structure design for complex transportation corridors in mountainous terrain. She has led geotechnical design for major highway realignments, rockfall mitigation programs, and large MSE wall systems throughout the western U.S.',
          profileImage:
            'http://www.glynngroup.com/wp-content/uploads/2012/09/Glynn_Lockport_Offices-1024x680.jpg',
          officeLocation: 'Seattle, WA',
          isAvailableForProjects: true
        },
        {
          id: 'tm_miguel_santos',
          name: 'Miguel Santos, Ph.D., P.E.',
          jobTitle: 'Senior Geotechnical Consultant',
          region: 'west',
          discipline: 'geotechnical_engineering',
          yearsOfExperience: 18,
          experienceSummary:
            '18+ years focusing on landslide remediation, embankment design, and performance monitoring.',
          keySkills: [
            'slope stability',
            'landslide analysis',
            'embankment design',
            'numerical modeling',
            'ground improvement'
          ],
          bio:
            'Miguel leads complex landslide and embankment projects across the Western U.S., combining field investigation, instrumentation, and advanced numerical modeling to develop robust stabilization solutions.',
          profileImage:
            'http://www.glynngroup.com/wp-content/uploads/2012/09/Glynn_Lockport_Offices-1024x680.jpg',
          officeLocation: 'Denver, CO',
          isAvailableForProjects: true
        },
        {
          id: 'tm_sophia_lee',
          name: 'Sophia Lee, P.E., G.E.',
          jobTitle: 'Geotechnical Practice Lead \u2013 West Region',
          region: 'west',
          discipline: 'geotechnical_engineering',
          yearsOfExperience: 12,
          experienceSummary:
            '12+ years delivering geotechnical solutions for slopes, foundations, and earth retention systems.',
          keySkills: [
            'slope stability',
            'retaining wall design',
            'landslide analysis',
            'deep foundations',
            'earthquake engineering'
          ],
          bio:
            'Sophia oversees the firm\'s western region geotechnical practice, with a portfolio that includes major rail cut slope stabilizations, urban retaining wall systems, and deep foundation projects in high\u2011seismic areas.',
          profileImage:
            'https://pd12m.s3.us-west-2.amazonaws.com/images/abae34a0-66c4-547c-9bd3-0efe513730fb.jpeg',
          officeLocation: 'Oakland, CA',
          isAvailableForProjects: true
        }
      ],
      tools: [
        {
          id: 'bearing_capacity_calculator',
          name: 'Bearing Capacity Calculator',
          slug: 'bearing-capacity-calculator',
          description:
            'Compute ultimate and allowable bearing capacity for shallow foundations using classical bearing capacity equations with user\u2011defined soil parameters.',
          toolType: 'calculator',
          url: 'bearing_capacity_calculator.html',
          isFeatured: true,
          displayOrder: 1
        },
        {
          id: 'slope_stability_calculator',
          name: 'Slope Stability Factor of Safety Calculator',
          slug: 'slope-stability-factor-of-safety-calculator',
          description:
            'Estimate factors of safety for simple slope geometries using limit\u2011equilibrium methods and user\u2011entered soil strength parameters.',
          toolType: 'calculator',
          url: 'tool_slope_stability_calculator.html',
          isFeatured: true,
          displayOrder: 2
        },
        {
          id: 'settlement_estimator',
          name: 'Shallow Foundation Settlement Estimator',
          slug: 'shallow-foundation-settlement-estimator',
          description:
            'Approximate immediate and consolidation settlement for spread footings and mats based on soil compressibility data.',
          toolType: 'estimator',
          url: 'tool_settlement_estimator.html',
          isFeatured: false,
          displayOrder: 3
        }
      ],
      service_level_options: [
        {
          id: 'slope_basic_screening',
          serviceType: 'slope_stability_embankments',
          name: 'Basic Embankment Screening',
          description:
            'Desktop review of alignment, published geology, and existing geotechnical reports to flag sections with elevated risk. Includes simple factor of safety estimates for representative cross-sections but does not include full stability modeling for every location.',
          includesStabilityModeling: false,
          price: 6200,
          currency: 'usd',
          deliveryTimeframe: '2\u20113 weeks after notice to proceed',
          isDefault: false,
          image:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'slope_standard_modeling',
          serviceType: 'slope_stability_embankments',
          name: 'Standard Embankment Stability Modeling',
          description:
            'Field reconnaissance, review of available subsurface data, and 2D limit-equilibrium stability modeling for up to three critical highway embankment sections. This level includes full stability modeling under static loading and construction staging scenarios, with a concise recommendations memo.',
          includesStabilityModeling: true,
          price: 9500,
          currency: 'usd',
          deliveryTimeframe: '3\u20114 weeks after receipt of data',
          isDefault: true,
          image:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'slope_advanced_modeling_instrumentation',
          serviceType: 'slope_stability_embankments',
          name: 'Advanced Stability Modeling & Instrumentation Plan',
          description:
            'Detailed subsurface interpretation and 2D/2.5D stability modeling for up to five embankment sections, including rapid drawdown and seismic cases. Scope includes stability modeling sensitivity studies on shear strength and pore pressure assumptions plus a preliminary instrumentation and monitoring plan.',
          includesStabilityModeling: true,
          price: 14200,
          currency: 'usd',
          deliveryTimeframe: '5\u20116 weeks after notice to proceed',
          isDefault: false,
          image:
            'https://matthewtrader.com/wp-content/uploads/2021/03/Roscoe-Wind-Farm-006.jpg'
        }
      ],
      consultation_availability_slots: [
        {
          id: 'slot_2025_03_18_1000_fd_vm',
          startDateTime: '2025-03-18T10:00:00Z',
          endDateTime: '2025-03-18T10:30:00Z',
          meetingType: 'virtual_meeting',
          specialty: 'foundation_design',
          notes:
            'Standard 30-minute virtual consultation for concept or early design foundation questions.',
          isBooked: true
        },
        {
          id: 'slot_2025_03_18_1030_fd_vm',
          startDateTime: '2025-03-18T10:30:00Z',
          endDateTime: '2025-03-18T11:00:00Z',
          meetingType: 'virtual_meeting',
          specialty: 'foundation_design',
          notes:
            'Follow-up virtual consultation slot for foundation design discussions.',
          isBooked: false
        },
        {
          id: 'slot_2025_03_18_0930_fd_vm',
          startDateTime: '2025-03-18T09:30:00Z',
          endDateTime: '2025-03-18T10:00:00Z',
          meetingType: 'virtual_meeting',
          specialty: 'foundation_design',
          notes:
            'Suitable for quick feasibility checks on footing and mat options.',
          isBooked: false
        }
      ],
      consultation_bookings: [
        {
          id: 'booking_2025_03_18_1000_fd_alex',
          meetingType: 'virtual_meeting',
          specialty: 'foundation_design',
          projectStage: 'concept_early_design',
          date: '2025-03-18T00:00:00Z',
          startDateTime: '2025-03-18T10:00:00Z',
          endDateTime: '2025-03-18T10:30:00Z',
          availabilitySlotId: 'slot_2025_03_18_1000_fd_vm',
          name: 'Alex Martinez',
          email: 'alex.martinez@example.com',
          projectName: 'Concept high-rise foundation review',
          status: 'confirmed',
          createdAt: '2025-02-28T15:42:00Z'
        },
        {
          id: 'booking_2025_03_19_1000_fd_design',
          meetingType: 'virtual_meeting',
          specialty: 'foundation_design',
          projectStage: 'detailed_design',
          date: '2025-03-19T00:00:00Z',
          startDateTime: '2025-03-19T10:00:00Z',
          endDateTime: '2025-03-19T10:30:00Z',
          availabilitySlotId: 'slot_2025_03_19_1000_fd_vm',
          name: 'Jordan Lee',
          email: 'jordan.lee@clientfirm.com',
          projectName: 'Parking structure foundation redesign',
          status: 'pending',
          createdAt: '2025-03-05T09:18:00Z'
        },
        {
          id: 'booking_2025_03_25_1030_ss_review',
          meetingType: 'virtual_meeting',
          specialty: 'slope_stability',
          projectStage: 'forensic_review',
          date: '2025-03-25T00:00:00Z',
          startDateTime: '2025-03-25T10:30:00Z',
          endDateTime: '2025-03-25T11:00:00Z',
          availabilitySlotId: 'slot_2025_03_25_1030_ss_vm',
          name: 'Priya Desai',
          email: 'priya.desai@dot.state.us',
          projectName: 'Embankment distress investigation \u0013 MP 47',
          status: 'confirmed',
          createdAt: '2025-03-10T13:05:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:20:26.700491'
      }
    };

    // Populate localStorage using storage keys
    localStorage.setItem(
      'consulting_services',
      JSON.stringify(generatedData.consulting_services || [])
    );
    localStorage.setItem(
      'investigation_packages',
      JSON.stringify(generatedData.investigation_packages || [])
    );
    localStorage.setItem(
      'project_case_studies',
      JSON.stringify(generatedData.project_case_studies || [])
    );
    localStorage.setItem('resources', JSON.stringify(generatedData.resources || []));
    localStorage.setItem('tools', JSON.stringify(generatedData.tools || []));
    localStorage.setItem(
      'service_level_options',
      JSON.stringify(generatedData.service_level_options || [])
    );
    localStorage.setItem(
      'consultation_availability_slots',
      JSON.stringify(generatedData.consultation_availability_slots || [])
    );
    localStorage.setItem(
      'consultation_bookings',
      JSON.stringify(generatedData.consultation_bookings || [])
    );
    localStorage.setItem(
      'team_members',
      JSON.stringify(generatedData.team_members || [])
    );

    // Initialize empty collections for entities without pre-generated data
    const emptyKeys = [
      'quote_requests',
      'saved_investigation_plans',
      'bearing_capacity_results',
      'newsletter_subscriptions',
      'project_team_shortlist'
    ];
    emptyKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Store metadata if needed
    if (generatedData._metadata) {
      localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestCheapestSlopeStabilityQuote();
    this.testTask2_SelectInvestigationPackageAndSavePlan();
    this.testTask3_OpenPileFoundationCaseStudyOver5M();
    this.testTask4_DownloadLatestIntermediateRetainingChecklist();
    this.testTask5_BookVirtualConsultationFoundationDesign();
    this.testTask6_BearingCapacityCalculatorSaveResult();
    this.testTask7_SubscribeToNewsletterWithTopics();
    this.testTask8_BuildSeniorGeotechShortlistWest();

    return this.results;
  }

  // Task 1: Request the cheapest slope stability quote option under $15,000
  testTask1_RequestCheapestSlopeStabilityQuote() {
    const testName = 'Task 1: Request cheapest slope stability quote under $15k with modeling';
    try {
      // Simulate navigation from homepage
      const homepage = this.logic.getHomepageOverview();
      this.assert(
        homepage && typeof homepage.heroTitle === 'string',
        'Homepage overview should return heroTitle'
      );

      // Open quote form options with preferred service type
      const preferredServiceType = 'slope_stability_embankments';
      const quoteOptions = this.logic.getQuoteFormOptions(preferredServiceType);
      this.assert(
        Array.isArray(quoteOptions.serviceTypes),
        'Quote form options should include serviceTypes array'
      );

      // Get service level options for slope stability embankments within budget
      const maxBudget = 15000;
      const serviceLevels = this.logic.getServiceLevelOptions(
        preferredServiceType,
        maxBudget
      );
      this.assert(
        Array.isArray(serviceLevels) && serviceLevels.length > 0,
        'Should return service level options for slope stability embankments'
      );

      // Filter for options that include stability modeling and are within budget
      const modelingOptions = serviceLevels.filter(
        (opt) =>
          opt &&
          opt.includesStabilityModeling === true &&
          typeof opt.price === 'number' &&
          opt.price <= maxBudget
      );
      this.assert(
        modelingOptions.length > 0,
        'Should have at least one service level with stability modeling within budget'
      );

      // Select the cheapest option among those
      let selectedServiceLevel = modelingOptions[0];
      modelingOptions.forEach((opt) => {
        if (opt.price < selectedServiceLevel.price) {
          selectedServiceLevel = opt;
        }
      });
      const selectedServiceLevelId = selectedServiceLevel.id;
      this.assert(selectedServiceLevelId, 'Selected service level should have an id');

      // Submit quote request for highway embankment in Denver
      const anticipatedDateIso = '2025-06-15';
      const submitResult = this.logic.submitQuoteRequest(
        preferredServiceType, // serviceType
        'highway_roadway', // projectType
        null, // projectName
        'Denver', // locationCity
        null, // locationState
        '80202', // locationZip
        'USA', // locationCountry
        anticipatedDateIso, // anticipatedConstructionStartDate (ISO string)
        selectedServiceLevelId, // selectedServiceLevelId
        maxBudget, // maxBudgetUsd
        'Automated test: highway embankment quote with stability modeling' // notes
      );

      this.assert(
        submitResult && submitResult.success === true,
        'Quote request submission should succeed'
      );
      const qr = submitResult.quoteRequest;
      this.assert(qr && qr.id, 'QuoteRequest should include an id');
      this.assert(
        qr.serviceType === preferredServiceType,
        'QuoteRequest serviceType should match input'
      );
      this.assert(
        qr.projectType === 'highway_roadway',
        'QuoteRequest projectType should be highway_roadway'
      );
      this.assert(qr.locationCity === 'Denver', 'Location city should be Denver');
      this.assert(qr.locationZip === '80202', 'Location ZIP should be 80202');
      this.assert(
        qr.selectedServiceLevelId === selectedServiceLevelId,
        'selectedServiceLevelId should echo the chosen option'
      );
      this.assert(
        typeof qr.maxBudgetUsd === 'number' && qr.maxBudgetUsd <= maxBudget,
        'Max budget should be numeric and not exceed requested budget'
      );
      if (qr.anticipatedConstructionStartDate) {
        this.assert(
          qr.anticipatedConstructionStartDate.indexOf('2025-06-15') !== -1,
          'Construction start date should contain 2025-06-15'
        );
      }

      // Verify that quote request was persisted in storage
      const storedQuoteRequests = JSON.parse(
        localStorage.getItem('quote_requests') || '[]'
      );
      const storedQuote = storedQuoteRequests.find((q) => q.id === qr.id);
      this.assert(
        !!storedQuote,
        'Stored quote_requests should contain the submitted quote'
      );

      // Verify relationship to ServiceLevelOption using actual stored data
      const storedServiceLevels = JSON.parse(
        localStorage.getItem('service_level_options') || '[]'
      );
      const relatedOption = storedServiceLevels.find(
        (opt) => opt.id === qr.selectedServiceLevelId
      );
      this.assert(
        !!relatedOption,
        'Related ServiceLevelOption should exist for the selectedServiceLevelId'
      );
      this.assert(
        relatedOption.includesStabilityModeling === true,
        'Related ServiceLevelOption should include stability modeling'
      );
      this.assert(
        typeof relatedOption.price === 'number' && relatedOption.price <= maxBudget,
        'Related ServiceLevelOption price should be within budget'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Select foundation investigation package with CPT + consolidation under $12k and save plan
  testTask2_SelectInvestigationPackageAndSavePlan() {
    const testName =
      'Task 2: Select building foundations investigation package with CPT & consolidation under $12k and save plan';
    try {
      // Navigate to Subsurface Investigation service page
      const servicePage = this.logic.getSubsurfaceInvestigationServicePage();
      this.assert(
        servicePage && servicePage.service && servicePage.service.id,
        'Subsurface Investigation service page should return a service definition'
      );

      // Get filter options
      const filterOptions = this.logic.getInvestigationPackagesFilterOptions();
      this.assert(
        filterOptions && Array.isArray(filterOptions.projectTypes),
        'Investigation packages filter options should include projectTypes'
      );

      // Filter packages: projectType = building_foundations, maxPrice = 12000
      const maxPrice = 12000;
      const packages = this.logic.getInvestigationPackages(
        'building_foundations',
        maxPrice,
        undefined,
        true
      );
      this.assert(
        Array.isArray(packages) && packages.length > 0,
        'Should return building foundation investigation packages within price range'
      );

      // Find first package including both CPT soundings and consolidation testing
      const matchingPackage = packages.find(
        (pkg) =>
          pkg &&
          pkg.includesCptSoundings === true &&
          pkg.includesConsolidationTesting === true &&
          typeof pkg.price === 'number' &&
          pkg.price <= maxPrice
      );
      this.assert(
        !!matchingPackage,
        'Should find a package that includes CPT soundings and consolidation testing within budget'
      );

      const packageId = matchingPackage.id;
      this.assert(packageId, 'Selected investigation package should have an id');

      // Open package detail
      const detailResult = this.logic.getInvestigationPackageDetail(packageId);
      const pkgDetail = detailResult && detailResult.package;
      this.assert(pkgDetail && pkgDetail.id === packageId, 'Package detail should match id');
      this.assert(
        pkgDetail.includesCptSoundings === true,
        'Package detail should indicate includesCptSoundings = true'
      );
      this.assert(
        pkgDetail.includesConsolidationTesting === true,
        'Package detail should indicate includesConsolidationTesting = true'
      );

      // Save to project plan
      const projectName = 'Headquarters foundation study';
      const saveResult = this.logic.saveInvestigationPackageToPlan(
        packageId,
        projectName,
        'Automated test plan for HQ foundation study'
      );
      this.assert(
        saveResult && saveResult.success === true,
        'Saving investigation package to plan should succeed'
      );
      const savedPlan = saveResult.savedPlan;
      this.assert(savedPlan && savedPlan.id, 'Saved plan should include id');
      this.assert(
        savedPlan.investigationPackageId === packageId,
        'Saved plan should reference the correct investigationPackageId'
      );
      this.assert(
        savedPlan.projectName === projectName,
        'Saved plan projectName should match input'
      );

      // Verify persistence via localStorage
      const storedPlans = JSON.parse(
        localStorage.getItem('saved_investigation_plans') || '[]'
      );
      const storedPlan = storedPlans.find((p) => p.id === savedPlan.id);
      this.assert(
        !!storedPlan,
        'saved_investigation_plans should contain the saved plan'
      );

      // Verify appearance in My Plans overview using actual IDs
      const myPlans = this.logic.getMyPlansOverview();
      this.assert(
        myPlans && Array.isArray(myPlans.savedInvestigationPlans),
        'My Plans overview should include savedInvestigationPlans array'
      );
      const overviewPlan = myPlans.savedInvestigationPlans.find(
        (p) =>
          p.projectName === projectName &&
          p.investigationPackageId === packageId
      );
      this.assert(
        !!overviewPlan,
        'My Plans overview should list the saved investigation plan'
      );
      this.assert(
        overviewPlan.includesCptSoundings === true &&
          overviewPlan.includesConsolidationTesting === true,
        'Overview plan should indicate CPT and consolidation testing are included'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Find pile foundation commercial building case study > $5M and open details
  testTask3_OpenPileFoundationCaseStudyOver5M() {
    const testName =
      'Task 3: Open commercial building pile foundation case study with value > $5M';
    try {
      // Get filter options for projects
      const projectFilterOptions = this.logic.getProjectsFilterOptions();
      this.assert(
        projectFilterOptions && Array.isArray(projectFilterOptions.sectors),
        'Projects filter options should include sectors'
      );

      // Filter for commercial_buildings with pile_foundations and min value $5M
      const filters = {
        sector: 'commercial_buildings',
        foundationType: 'pile_foundations',
        minProjectValueUsd: 5000000
      };
      const projects = this.logic.getProjects(filters, 'project_value_high_to_low', 10, 0);
      this.assert(
        Array.isArray(projects) && projects.length > 0,
        'Should return commercial building pile foundation projects over $5M'
      );

      // Choose the first project with projectValueUsd > 5M
      const selectedProject = projects.find(
        (p) => typeof p.projectValueUsd === 'number' && p.projectValueUsd > 5000000
      );
      this.assert(
        !!selectedProject,
        'Should find at least one project with value greater than $5M'
      );

      const projectId = selectedProject.id;
      this.assert(projectId, 'Selected project should have an id');

      // Open project case study detail
      const detailResult = this.logic.getProjectCaseStudyDetail(projectId);
      const projectDetail = detailResult && detailResult.project;
      this.assert(
        projectDetail && projectDetail.id === projectId,
        'Project detail should match the selected id'
      );
      this.assert(
        typeof projectDetail.content === 'string' &&
          projectDetail.content.length > 0,
        'Project detail should include main case study content'
      );
      this.assert(
        typeof projectDetail.projectValueUsd === 'number' &&
          projectDetail.projectValueUsd > 5000000,
        'Project value in detail view should be greater than $5M'
      );

      // Verify it exists in storage
      const storedProjects = JSON.parse(
        localStorage.getItem('project_case_studies') || '[]'
      );
      const storedProject = storedProjects.find((p) => p.id === projectId);
      this.assert(
        !!storedProject,
        'project_case_studies storage should contain the selected project'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Download the latest intermediate retaining wall design checklist published after 2022
  testTask4_DownloadLatestIntermediateRetainingChecklist() {
    const testName =
      'Task 4: Download latest intermediate retaining wall design checklist (>= 2022)';
    try {
      // Navigate to Resources / Knowledge Center
      const resourceFilterOptions = this.logic.getResourceFilterOptions();
      this.assert(
        resourceFilterOptions &&
          Array.isArray(resourceFilterOptions.resourceTypes),
        'Resource filter options should include resourceTypes'
      );

      // Filter: guides & checklists, topic retaining_walls, level intermediate, date >= 2022-01-01, checklist only
      const filters = {
        resourceType: 'guides_checklists',
        topic: 'retaining_walls',
        level: 'intermediate',
        publishedDateStart: '2022-01-01',
        publishedDateEnd: undefined,
        isChecklist: true
      };
      const resources = this.logic.getResources(
        filters,
        'published_date_newest',
        10,
        0
      );
      this.assert(
        Array.isArray(resources) && resources.length > 0,
        'Should return intermediate retaining wall checklists published on/after 2022-01-01'
      );

      // Find the first item whose title includes 'retaining wall design checklist'
      const selectedResource = resources.find((r) => {
        const title = (r.title || '').toLowerCase();
        return title.indexOf('retaining wall design checklist') !== -1;
      });
      this.assert(
        !!selectedResource,
        'Should find a resource whose title includes "Retaining wall design checklist"'
      );

      const resourceId = selectedResource.id;
      this.assert(resourceId, 'Selected resource should have an id');

      // Open resource detail
      const detailResult = this.logic.getResourceDetail(resourceId);
      const resourceDetail = detailResult && detailResult.resource;
      this.assert(
        resourceDetail && resourceDetail.id === resourceId,
        'Resource detail should match selected id'
      );
      this.assert(
        resourceDetail.level === 'intermediate',
        'Resource level should be intermediate'
      );
      this.assert(
        resourceDetail.topic === 'retaining_walls',
        'Resource topic should be retaining_walls'
      );

      // Check published date is >= 2022-01-01 using actual returned value
      const publishedDate = new Date(resourceDetail.publishedDate);
      const cutoff = new Date('2022-01-01T00:00:00Z');
      this.assert(
        !isNaN(publishedDate.getTime()) && publishedDate >= cutoff,
        'Resource publishedDate should be on or after 2022-01-01'
      );

      // Download PDF
      const downloadResult = this.logic.downloadResourcePdf(resourceId);
      this.assert(
        downloadResult && downloadResult.success === true,
        'PDF download should succeed'
      );
      this.assert(
        typeof downloadResult.pdfUrl === 'string' &&
          downloadResult.pdfUrl.length > 0,
        'Download result should include pdfUrl'
      );

      // pdfUrl in download should match detail pdfUrl when present
      if (resourceDetail.pdfUrl) {
        this.assert(
          downloadResult.pdfUrl === resourceDetail.pdfUrl,
          'Download pdfUrl should match resource detail pdfUrl'
        );
      }
      if (typeof downloadResult.fileSizeMb === 'number') {
        this.assert(
          downloadResult.fileSizeMb > 0,
          'Downloaded file size should be positive when provided'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Book a 30-minute virtual consultation with foundation design specialist between 10:00 and 11:00
  testTask5_BookVirtualConsultationFoundationDesign() {
    const testName =
      'Task 5: Book 30-minute virtual foundation design consultation between 10:00 and 11:00';
    try {
      // Simulate clicking Book a Consultation: load form options
      const formOptions = this.logic.getConsultationFormOptions();
      this.assert(
        formOptions && Array.isArray(formOptions.meetingTypes),
        'Consultation form options should include meetingTypes'
      );

      // Use meetingType = virtual_meeting, specialty = foundation_design
      const meetingType = 'virtual_meeting';
      const specialty = 'foundation_design';
      const projectStage = 'concept_early_design';

      // Choose specific date 2025-03-18
      const dateStr = '2025-03-18';
      const availability = this.logic.getConsultationAvailability(
        meetingType,
        specialty,
        dateStr
      );
      this.assert(
        availability && Array.isArray(availability.slots),
        'Consultation availability should include slots array'
      );

      // Find an unbooked 30-minute slot starting between 10:00 and 11:00 (UTC-based string check)
      const candidateSlot = availability.slots.find((s) => {
        if (!s || s.isBooked) return false;
        const start = s.startDateTime || '';
        // Look for hour 10 (T10:)
        return start.indexOf('T10:') !== -1;
      });
      this.assert(
        !!candidateSlot,
        'Should find an available virtual foundation design slot starting between 10:00 and 11:00'
      );

      const slotId = candidateSlot.id;
      this.assert(slotId, 'Selected availability slot should have an id');

      // Book consultation with user details
      const name = 'Alex Martinez';
      const email = 'alex.martinez@example.com';
      const projectName = 'Concept-stage foundation design consultation';

      const bookingResult = this.logic.bookConsultation(
        meetingType,
        specialty,
        projectStage,
        slotId,
        name,
        email,
        projectName
      );

      this.assert(
        bookingResult && bookingResult.success === true,
        'Consultation booking should succeed'
      );
      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Booking should include an id');
      this.assert(
        booking.meetingType === meetingType,
        'Booking meetingType should match input'
      );
      this.assert(
        booking.specialty === specialty,
        'Booking specialty should match input'
      );
      this.assert(
        booking.projectStage === projectStage,
        'Booking projectStage should match input'
      );
      this.assert(booking.name === name, 'Booking name should match input');
      this.assert(booking.email === email, 'Booking email should match input');
      this.assert(
        booking.availabilitySlotId === slotId,
        'Booking should reference the selected availability slot id'
      );

      // Verify booking persisted
      const storedBookings = JSON.parse(
        localStorage.getItem('consultation_bookings') || '[]'
      );
      const storedBooking = storedBookings.find((b) => b.id === booking.id);
      this.assert(
        !!storedBooking,
        'consultation_bookings storage should contain the new booking'
      );

      // Verify that the availability slot is now marked as booked
      const storedSlots = JSON.parse(
        localStorage.getItem('consultation_availability_slots') || '[]'
      );
      const updatedSlot = storedSlots.find((s) => s.id === slotId);
      this.assert(
        !!updatedSlot,
        'consultation_availability_slots should contain the selected slot'
      );
      this.assert(
        updatedSlot.isBooked === true,
        'Selected availability slot should be marked as booked after booking'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Use bearing capacity calculator and save result to project 'Office Tower A'
  testTask6_BearingCapacityCalculatorSaveResult() {
    const testName =
      "Task 6: Run bearing capacity calculation for medium dense sand footing and save as 'Office Tower A'";
    try {
      // Navigate to tools overview (simulate user finding the calculator)
      const tools = this.logic.getToolsOverview();
      this.assert(
        Array.isArray(tools) && tools.length > 0,
        'Tools overview should return at least one tool'
      );

      // Load calculator configuration
      const config = this.logic.getBearingCapacityCalculatorConfig();
      this.assert(
        config && Array.isArray(config.soilTypes),
        'Bearing capacity calculator config should include soilTypes'
      );

      const defaultWidthUnit =
        (config.defaultValues && config.defaultValues.footingWidthUnit) || 'm';
      const defaultDepthUnit =
        (config.defaultValues && config.defaultValues.footingDepthUnit) || 'm';
      const defaultMethod =
        config.defaultValues && config.defaultValues.method
          ? config.defaultValues.method
          : undefined;

      // Input values per task description
      const soilType = 'medium_dense_sand';
      const footingWidth = 2.0;
      const footingDepth = 1.5;
      const factorOfSafety = 3;
      const projectLocation = 'Chicago';

      const calcResult = this.logic.calculateBearingCapacity(
        soilType,
        footingWidth,
        defaultWidthUnit,
        footingDepth,
        defaultDepthUnit,
        factorOfSafety,
        projectLocation,
        defaultMethod
      );

      this.assert(
        calcResult && calcResult.success === true,
        'Bearing capacity calculation should succeed'
      );
      this.assert(
        typeof calcResult.calculationId === 'string' &&
          calcResult.calculationId.length > 0,
        'Calculation result should include calculationId'
      );
      this.assert(
        typeof calcResult.ultimateBearingCapacity === 'number' &&
          calcResult.ultimateBearingCapacity > 0,
        'Ultimate bearing capacity should be positive'
      );
      this.assert(
        typeof calcResult.allowableBearingCapacity === 'number' &&
          calcResult.allowableBearingCapacity > 0,
        'Allowable bearing capacity should be positive'
      );

      const calculationId = calcResult.calculationId;

      // Save result under project name 'Office Tower A'
      const projectName = 'Office Tower A';
      const saveResult = this.logic.saveBearingCapacityResult(
        calculationId,
        projectName
      );

      this.assert(
        saveResult && saveResult.success === true,
        'Saving bearing capacity result should succeed'
      );
      const saved = saveResult.savedResult;
      this.assert(saved && saved.id, 'Saved bearing capacity result should have id');
      this.assert(
        saved.projectName === projectName,
        'Saved result projectName should match input'
      );
      this.assert(
        saved.soilType === soilType,
        'Saved result soilType should match input'
      );
      this.assert(
        saved.footingWidth === footingWidth &&
          saved.footingDepth === footingDepth,
        'Saved result footing geometry should match inputs'
      );
      this.assert(
        saved.factorOfSafety === factorOfSafety,
        'Saved result factorOfSafety should match input'
      );

      // Verify storage in bearing_capacity_results
      const storedResults = JSON.parse(
        localStorage.getItem('bearing_capacity_results') || '[]'
      );
      const storedResult = storedResults.find((r) => r.id === saved.id);
      this.assert(
        !!storedResult,
        'bearing_capacity_results storage should contain the saved result'
      );

      // Verify appearance in My Plans overview
      const myPlans = this.logic.getMyPlansOverview();
      this.assert(
        myPlans && Array.isArray(myPlans.savedBearingCapacityResults),
        'My Plans overview should include savedBearingCapacityResults'
      );
      const overviewResult = myPlans.savedBearingCapacityResults.find(
        (r) => r.projectName === projectName
      );
      this.assert(
        !!overviewResult,
        'My Plans overview should list the saved bearing capacity result'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Subscribe to the newsletter with specific geotechnical topics and monthly frequency
  testTask7_SubscribeToNewsletterWithTopics() {
    const testName =
      'Task 7: Subscribe to newsletter with slope stability & deep foundations, monthly frequency';
    try {
      const email = 'client.geotech@example.com';
      const topics = ['slope_stability', 'deep_foundations'];
      const emailFrequency = 'monthly';
      const professionalRole = 'consulting_engineer';

      const subscribeResult = this.logic.subscribeToNewsletter(
        email,
        topics,
        emailFrequency,
        professionalRole
      );

      this.assert(
        subscribeResult && subscribeResult.success === true,
        'Newsletter subscription should succeed'
      );
      const subscription = subscribeResult.subscription;
      this.assert(
        subscription && subscription.id,
        'Subscription should include an id'
      );
      this.assert(subscription.email === email, 'Subscription email should match');
      this.assert(
        Array.isArray(subscription.topics),
        'Subscription should include topics array'
      );

      // Verify topics include slope_stability and deep_foundations, and do not include ground_improvement
      this.assert(
        subscription.topics.indexOf('slope_stability') !== -1,
        'Subscription topics should include slope_stability'
      );
      this.assert(
        subscription.topics.indexOf('deep_foundations') !== -1,
        'Subscription topics should include deep_foundations'
      );
      this.assert(
        subscription.topics.indexOf('ground_improvement') === -1,
        'Subscription topics should not include ground_improvement'
      );
      this.assert(
        subscription.emailFrequency === emailFrequency,
        'Subscription emailFrequency should be monthly'
      );
      this.assert(
        subscription.professionalRole === professionalRole,
        'Subscription professionalRole should be consulting_engineer'
      );

      // Verify storage in newsletter_subscriptions
      const storedSubscriptions = JSON.parse(
        localStorage.getItem('newsletter_subscriptions') || '[]'
      );
      const storedSub = storedSubscriptions.find(
        (s) => s.id === subscription.id
      );
      this.assert(
        !!storedSub,
        'newsletter_subscriptions storage should contain the new subscription'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Build shortlist of three senior geotechnical experts for West region slope stability project
  testTask8_BuildSeniorGeotechShortlistWest() {
    const testName =
      'Task 8: Build shortlist of three West region senior geotechnical slope stability experts';
    try {
      // Get team filter options
      const teamFilterOptions = this.logic.getTeamFilterOptions();
      this.assert(
        teamFilterOptions && Array.isArray(teamFilterOptions.regions),
        'Team filter options should include regions'
      );

      // Filter team members: region=west, discipline=geotechnical_engineering, minYears=10, skill contains 'slope stability', available
      const filters = {
        region: 'west',
        discipline: 'geotechnical_engineering',
        minYearsOfExperience: 10,
        hasSkillKeyword: 'slope stability',
        isAvailableForProjects: true
      };
      const teamMembers = this.logic.getTeamMembers(
        filters,
        'experience_high_to_low',
        undefined,
        0
      );
      this.assert(
        Array.isArray(teamMembers) && teamMembers.length > 0,
        'Should return West region geotechnical engineers with slope stability skills'
      );

      const shortlistedIds = [];

      for (let i = 0; i < teamMembers.length && shortlistedIds.length < 3; i++) {
        const member = teamMembers[i];
        if (!member || !member.id) continue;

        // Open profile detail
        const detailResult = this.logic.getTeamMemberDetail(member.id);
        const detail = detailResult && detailResult.teamMember;
        this.assert(
          detail && detail.id === member.id,
          'Team member detail should match id from listing'
        );

        // Check experience and skills
        const years = detail.yearsOfExperience || 0;
        const skills = Array.isArray(detail.keySkills) ? detail.keySkills : [];
        const hasSlopeOrLandslide = skills.some((s) => {
          const skillLower = (s || '').toLowerCase();
          return (
            skillLower.indexOf('slope stability') !== -1 ||
            skillLower.indexOf('landslide analysis') !== -1
          );
        });

        if (years >= 10 && hasSlopeOrLandslide) {
          // Add to shortlist
          const addResult = this.logic.addTeamMemberToShortlist(
            detail.id,
            'west_region_slope_stability_project',
            'Automated shortlist selection for West region slope stability project'
          );
          this.assert(
            addResult && addResult.success === true,
            'Adding team member to shortlist should succeed'
          );
          const shortlistItem = addResult.shortlistItem;
          this.assert(
            shortlistItem && shortlistItem.id,
            'Shortlist item should include id'
          );
          this.assert(
            shortlistItem.teamMemberId === detail.id,
            'Shortlist item should reference correct teamMemberId'
          );
          shortlistedIds.push(detail.id);
        }
      }

      this.assert(
        shortlistedIds.length === 3,
        'Should shortlist exactly three qualifying experts'
      );

      // View project team shortlist via dedicated API
      const shortlistView = this.logic.getProjectTeamShortlist();
      this.assert(
        Array.isArray(shortlistView) && shortlistView.length >= 3,
        'Project team shortlist should contain at least three entries'
      );

      shortlistedIds.forEach((id) => {
        const item = shortlistView.find((i) => i.teamMemberId === id);
        this.assert(
          !!item,
          'Shortlist view should include each shortlisted team member'
        );
        this.assert(
          item.region === 'west',
          'Shortlisted team member should be in West region'
        );
        this.assert(
          item.discipline === 'geotechnical_engineering',
          'Shortlisted team member should be a geotechnical engineer'
        );
        this.assert(
          typeof item.yearsOfExperience === 'number' &&
            item.yearsOfExperience >= 10,
          'Shortlisted team member should have at least 10 years of experience'
        );
        const skills = Array.isArray(item.keySkills) ? item.keySkills : [];
        const hasSlopeOrLandslide = skills.some((s) => {
          const skillLower = (s || '').toLowerCase();
          return (
            skillLower.indexOf('slope stability') !== -1 ||
            skillLower.indexOf('landslide analysis') !== -1
          );
        });
        this.assert(
          hasSlopeOrLandslide,
          'Shortlisted team member should list slope stability or landslide analysis as a key skill'
        );
      });

      // Verify shortlist also appears in My Plans overview
      const myPlans = this.logic.getMyPlansOverview();
      this.assert(
        myPlans && Array.isArray(myPlans.projectTeamShortlist),
        'My Plans overview should include projectTeamShortlist'
      );
      shortlistedIds.forEach((id) => {
        const item = myPlans.projectTeamShortlist.find(
          (i) => i.teamMemberId === id
        );
        this.assert(
          !!item,
          'My Plans projectTeamShortlist should include each shortlisted team member'
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  // Result recording helpers
  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
