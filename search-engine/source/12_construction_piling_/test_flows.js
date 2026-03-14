// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is expected to be available in the environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear and init storage, then seed with generated data
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
    // IMPORTANT: Use the Generated Data exactly as provided, but only here
    const generatedData = {
      branches: [
        {
          id: 'melbourne_hq',
          name: 'Melbourne Head Office & Yard',
          code: 'MEL-HQ',
          address_line1: '42 Quarry Road',
          address_line2: 'Dandenong South',
          city: 'Melbourne',
          state: 'VIC',
          postcode: '3175',
          region: 'vic',
          phone: '+61 3 9123 4500',
          email: 'melbourne@groundcorepiling.com.au',
          latitude: -38.006,
          longitude: 145.221,
          service_radius_km: 150,
          is_primary: true,
          is_active: true,
          createdAt: '2015-03-01T09:00:00+11:00',
          updatedAt: '2025-11-15T10:30:00+11:00'
        },
        {
          id: 'sydney_branch',
          name: 'Sydney Piling & Earthworks Branch',
          code: 'SYD-01',
          address_line1: '15 Bourke Road',
          address_line2: 'Closest branch for Sydney CBD (2000)',
          city: 'Alexandria',
          state: 'NSW',
          postcode: '2015',
          region: 'nsw',
          phone: '+61 2 8015 7200',
          email: 'sydney@groundcorepiling.com.au',
          latitude: -33.907,
          longitude: 151.196,
          service_radius_km: 120,
          is_primary: false,
          is_active: true,
          createdAt: '2018-07-10T08:30:00+10:00',
          updatedAt: '2025-10-20T14:15:00+11:00'
        },
        {
          id: 'brisbane_branch',
          name: 'Brisbane Earthworks Branch',
          code: 'BNE-01',
          address_line1: '8 Quarryside Place',
          address_line2: 'Trade Coast Industrial Park',
          city: 'Hemmant',
          state: 'QLD',
          postcode: '4174',
          region: 'qld',
          phone: '+61 7 3096 8800',
          email: 'brisbane@groundcorepiling.com.au',
          latitude: -27.444,
          longitude: 153.128,
          service_radius_km: 130,
          is_primary: false,
          is_active: true,
          createdAt: '2020-02-05T10:00:00+10:00',
          updatedAt: '2025-09-01T09:45:00+10:00'
        }
      ],
      certifications: [
        {
          id: 'iso_45001',
          name: 'ISO 45001 Occupational Health and Safety Management Systems',
          code: 'ISO 45001',
          type: 'safety',
          description: 'Certification for occupational health and safety management systems, demonstrating proactive risk management and worker consultation.',
          issuing_body: 'International Organization for Standardization via accredited certification body',
          certificate_number: 'OHS-45001-2023-GC01',
          valid_from: '2023-05-12T00:00:00+10:00',
          valid_to: '2026-05-11T23:59:59+10:00',
          is_active: true,
          details_url: 'https://www.aacertification.com/hs-fs/hubfs/AA_Certification_July2019/Image/aa-creditation-health-safety-header%20(2).jpg?width=850&name=aa-creditation-health-safety-header%20(2).jpg'
        },
        {
          id: 'iso_9001',
          name: 'ISO 9001 Quality Management Systems',
          code: 'ISO 9001',
          type: 'quality',
          description: 'Quality management certification covering design and delivery of piling, ground improvement and earthworks services.',
          issuing_body: 'International Organization for Standardization via accredited certification body',
          certificate_number: 'QM-9001-2022-GC01',
          valid_from: '2022-03-01T00:00:00+11:00',
          valid_to: '2025-02-28T23:59:59+11:00',
          is_active: true,
          details_url: 'https://static.wixstatic.com/media/458dfd_4058835d3ce6429faf71ae8258284808~mv2.jpg/v1/fill/w_764,h_1080,al_c,q_90,usm_3.50_0.58_0.00/458dfd_4058835d3ce6429faf71ae8258284808~mv2.jpg'
        },
        {
          id: 'iso_14001',
          name: 'ISO 14001 Environmental Management Systems',
          code: 'ISO 14001',
          type: 'environmental',
          description: 'Environmental management certification for construction activities including excavation, piling and spoil management.',
          issuing_body: 'International Organization for Standardization via accredited certification body',
          certificate_number: 'ENV-14001-2022-GC01',
          valid_from: '2022-03-01T00:00:00+11:00',
          valid_to: '2025-02-28T23:59:59+11:00',
          is_active: true,
          details_url: 'https://reverteminerals.es/wp-content/uploads/2018/11/Certificado-ISO-14001-gestion-medioambiental-720x515.jpg'
        }
      ],
      projects: [
        {
          id: 'proj_basement_melb_2020_clarendon',
          title: 'Clarendon Street Two-Level Basement Excavation',
          slug: 'clarendon-street-two-level-basement-excavation',
          project_type: 'basement_excavation',
          location_city: 'South Melbourne',
          location_region: 'melbourne',
          completion_year: 2020,
          summary: 'Bulk excavation and retention for a two-level basement car park beneath a mixed-use development.',
          description: 'GroundCore delivered detailed basement excavation for a two-level underground car park on Clarendon Street, including temporary propping, shotcrete walls and dewatering. Tight access and heritage facades required staged excavation and continuous monitoring to maintain adjoining building stability.',
          featured_image_url: 'https://images.unsplash.com/photo-1522764725576-4ca9801c029c?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          client_name: 'Clarendon Developments Pty Ltd',
          createdAt: '2020-11-20T14:10:00+11:00'
        },
        {
          id: 'proj_basement_melb_2021_bourke',
          title: 'Bourke Street CBD Basement Excavation',
          slug: 'bourke-street-cbd-basement-excavation',
          project_type: 'basement_excavation',
          location_city: 'Melbourne',
          location_region: 'melbourne',
          completion_year: 2021,
          summary: 'Deep basement excavation for a 3-level basement in Melbourne CBD with strict vibration limits.',
          description: 'This CBD project involved excavation to 11 metres below street level for three basement levels. GroundCore managed a complex retention system of soldier piles and shotcrete, real-time vibration monitoring, and night-time spoil haulage to minimise CBD disruption.',
          featured_image_url: 'https://kalispell.com/ImageRepository/Document?documentID=1003',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1566321344343-0605c914246d?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          client_name: 'CBD Towers Consortium',
          createdAt: '2021-09-05T09:45:00+10:00'
        },
        {
          id: 'proj_basement_melb_2022_stkilda',
          title: 'St Kilda Road Residential Basement',
          slug: 'st-kilda-road-residential-basement',
          project_type: 'basement_excavation',
          location_city: 'Melbourne',
          location_region: 'melbourne',
          completion_year: 2022,
          summary: 'Basement excavation for a premium residential tower with constrained access on St Kilda Road.',
          description: 'GroundCore completed detailed excavation and base slab preparation for a single-level basement beneath a high-end residential tower. Works included underpinning adjacent properties, managing high groundwater and coordinating with piling crews under a compressed program.',
          featured_image_url: 'https://elebia.com/wp-content/uploads/2019/10/construction-cranes.jpg',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1541976590-713941681591?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          client_name: 'St Kilda Residences Pty Ltd',
          createdAt: '2022-06-22T13:05:00+10:00'
        }
      ],
      resource_articles: [
        {
          id: 'faq_subdivision_earthworks_duration',
          title: 'How long do earthworks take for a 10-lot subdivision?',
          slug: 'how-long-earthworks-10-lot-subdivision',
          category: 'faq',
          topics: [
            'subdivision earthworks',
            '10-lot subdivision',
            'project timelines',
            'bulk earthworks'
          ],
          summary: 'Typical duration ranges for completing bulk and detailed earthworks on a 10-lot residential subdivision.',
          content: 'For a typical 10-lot greenfield residential subdivision with average site conditions, bulk and detailed earthworks usually take between 3 and 5 weeks once access is available. This timeframe covers topsoil stripping, cut-to-fill, road boxing, lot trimming and primary compaction.\n\nOn straightforward sites with dry weather and good access, we often complete 10-lot packages in around 15 120 working days. Where there are complex services relocations, retaining walls or significant wet weather impacts, the program can extend towards 25 working days.\n\nThese durations assume that design is finalised, survey control is established and there are no unexpected contamination or rock conditions. For infill subdivisions or steep sites, we will provide a site-specific program after reviewing your plans and geotechnical report.',
          related_service_type: 'earthworks',
          typical_duration_description: 'On a typical greenfield 10-lot residential subdivision, earthworks (topsoil strip, bulk cut-to-fill, road boxing, lot trimming and compaction) usually take 3 5 weeks, or roughly 15 25 working days, in normal weather conditions.',
          publishedAt: '2023-07-10T09:00:00+10:00',
          updatedAt: '2024-02-18T11:15:00+11:00',
          is_featured: true
        },
        {
          id: 'faq_pile_estimator_how_to_use',
          title: 'How to use the Pile Estimator for your project',
          slug: 'how-to-use-the-pile-estimator',
          category: 'faq',
          topics: [
            'pile estimator',
            'piling calculator',
            'warehouse design',
            'cost planning'
          ],
          summary: 'Step-by-step instructions for entering building dimensions, soil type and load category into the Pile Estimator.',
          content: 'Our online Pile Estimator is designed for early-stage cost planning. To use it:\n\n1. Enter the overall building length and width in metres. For example, a 30m x 20m warehouse has a footprint of 600m b2.\n2. Select the soil type that best matches your geotechnical information (e.g. firm clay, stiff clay, sand, or rock).\n3. Choose the building use or load category, such as  18Light industrial / warehouse 19,  18Residential slab 19 or  18Heavy industrial 19.\n4. Click Calculate. The tool will recommend an indicative pile spacing, estimate the number of piles and apply a typical unit rate to give you a budget cost.\n\nThe results are indicative only and do not replace a project-specific design. Once you are happy with the estimate, click  18Request Detailed Quote 19 to send the inputs to our design team.',
          related_service_type: 'piling',
          typical_duration_description: '',
          publishedAt: '2022-11-05T10:30:00+11:00',
          updatedAt: '2024-01-12T15:45:00+11:00',
          is_featured: true
        },
        {
          id: 'guide_residential_screw_piles_vs_bored_piers',
          title: 'Residential screw piles vs bored piers for extensions',
          slug: 'residential-screw-piles-vs-bored-piers-extensions',
          category: 'guide',
          topics: [
            'screw piles',
            'bored piers',
            'residential extensions',
            'foundations'
          ],
          summary: 'Compare screw piles and bored piers for residential extensions, including depth capability and site disruption.',
          content: 'When extending an existing home, the choice between screw piles and bored piers is often driven by access, vibration limits and required founding depth.\n\nScrew piles are ideal for constrained rear-lot extensions because they can be installed with compact hydraulic heads and produce minimal spoil. They can easily achieve depths of 8 1010m in typical Melbourne and Brisbane clays.\n\nBored piers are well suited to open, greenfield sites where larger rigs and spoil management are feasible. However, bored piers can be more disruptive near existing structures and are more sensitive to groundwater.\n\nFor two-storey extensions, screw piles typically provide a cleaner, faster solution with immediate load capacity, allowing builders to proceed with sub-floor framing as soon as pile installation is complete.',
          related_service_type: 'piling',
          typical_duration_description: '',
          publishedAt: '2023-03-22T08:50:00+11:00',
          updatedAt: '2024-05-03T09:10:00+10:00',
          is_featured: false
        }
      ],
      equipment: [
        {
          id: 'rig_10t_compact_melbourne',
          name: '10t Compact Screw & Bored Piling Rig',
          category: 'piling_rigs',
          slug: '10t-compact-screw-bored-piling-rig-melbourne',
          description: 'Compact 10-tonne class piling rig ideal for residential screw piling, bored piers and small retaining walls on constrained Melbourne sites.',
          daily_rate: 780,
          currency: 'AUD',
          average_rating: 4.7,
          rating_count: 36,
          is_available: true,
          min_hire_days: 1,
          max_hire_days: 14,
          image_url: 'https://www.splk.co.rw/wp-content/uploads/2020/07/PilingRig.jpg',
          specifications: 'Operating weight: 10t; Max torque: 55 kNm; Max pile depth (screw): 10m; Mast height: 6.0m; Power: 120 kW; Ideal for screw piles up to 350mm and bored piers up to 450mm.',
          stored_at_branch_id: 'melbourne_hq',
          createdAt: '2024-08-14T09:00:00+10:00',
          updatedAt: '2025-11-10T15:20:00+11:00'
        },
        {
          id: 'rig_12t_compact_brisbane',
          name: '12t Compact Multi-Purpose Piling Rig',
          category: 'piling_rigs',
          slug: '12t-compact-multi-purpose-piling-rig-brisbane',
          description: 'Versatile 12t rig for screw piling and CFA work on residential and light commercial projects in Southeast Queensland.',
          daily_rate: 820,
          currency: 'AUD',
          average_rating: 4.3,
          rating_count: 24,
          is_available: true,
          min_hire_days: 1,
          max_hire_days: 10,
          image_url: 'https://kalispell.com/ImageRepository/Document?documentID=1003',
          specifications: 'Operating weight: 12t; Max torque: 65 kNm; Max depth: 12m (screw/CFA); Mast height: 7.0m; Track width: 2.5m; Suitable for inner-suburban sites with moderate access.',
          stored_at_branch_id: 'brisbane_branch',
          createdAt: '2023-05-02T10:30:00+10:00',
          updatedAt: '2025-09-21T11:45:00+10:00'
        },
        {
          id: 'rig_18t_multi_melbourne',
          name: '18t Multi-Function CFA & Screw Piling Rig',
          category: 'piling_rigs',
          slug: '18t-multi-function-cfa-screw-piling-rig-melbourne',
          description: 'Mid-size piling rig for CFA piles, screw piles and displacement piles on commercial slabs and retaining walls.',
          daily_rate: 980,
          currency: 'AUD',
          average_rating: 4.1,
          rating_count: 19,
          is_available: true,
          min_hire_days: 2,
          max_hire_days: 21,
          image_url: 'https://d3r4tb575cotg3.cloudfront.net/static/Peters%20Earthmoving%20Excavator%20and%20tipper%20comobo%20on%20site.jpg',
          specifications: 'Operating weight: 18t; Max torque: 90 kNm; CFA diameter: up to 600mm; Screw piles: up to 450mm to 14m; Mast height: 8.5m; Suited to warehouse slabs and medium retaining walls.',
          stored_at_branch_id: 'melbourne_hq',
          createdAt: '2022-02-18T08:40:00+11:00',
          updatedAt: '2025-10-05T13:10:00+11:00'
        }
      ],
      services: [
        {
          id: 'svc_res_screw_piles_extensions',
          name: 'Residential Screw Piling for Extensions (up to 10m)',
          category_id: 'piling_foundations',
          service_type: 'piling',
          slug: 'residential-screw-piling-for-extensions-up-to-10m',
          short_description: 'Low-vibration screw piling for single and two-storey residential extensions with depths up to 10m.',
          full_description: 'This service provides engineered screw piles for new and extended residential structures, including rear house extensions, upper-storey additions and decks.\n\nUsing compact hydraulic drive heads, we can access tight rear yards and laneways with minimal disturbance to neighbours. Screw piles are torque-monitored during installation to verify capacity and can be loaded immediately, allowing builders to proceed with steel or timber sub-floor framing as soon as piling is complete.\n\nTypical applications include 1 112 storey extensions, garage slabs and lightweight structures. The system is suitable for foundations up to 10m deep in most Melbourne and Brisbane soils, including sandy soils overlying clays.',
          project_types: ['residential'],
          pile_type: 'screw_piles',
          max_recommended_depth_m: 10,
          min_recommended_depth_m: 2,
          suitable_soil_types: [
            'sandy_soil',
            'firm_clay',
            'stiff_clay',
            'alluvial_soils',
            'mixed_fill'
          ],
          typical_applications: 'Two-storey rear extensions, garages, decks, lightweight residential structures on soft or variable ground.',
          typical_duration_description: 'Most 2 113 bedroom house extensions require 1 working day on site for screw piling, with 2 114 days for larger or complex extensions.',
          is_featured: true,
          is_active: true,
          createdAt: '2023-03-24T09:10:00+11:00',
          updatedAt: '2025-12-05T11:20:00+11:00',
          image: 'https://www.martinahayes.com.au/wp-content/uploads/open-plan-dining-room-mosman-1024x683.jpg'
        },
        {
          id: 'svc_industrial_screw_piles_warehouses',
          name: 'Industrial Screw Piling for Warehouses & Light Industrial',
          category_id: 'piling_foundations',
          service_type: 'piling',
          slug: 'industrial-screw-piling-for-warehouses-light-industrial',
          short_description: 'High-capacity screw piles for warehouse slabs, racking legs and light industrial buildings.',
          full_description: 'Engineered screw piling solutions for warehouse slabs, racking legs, tilt-panel footings and light industrial structures. Screw piles are particularly effective where access is limited, vibration must be controlled or founding depths exceed conventional pad footings.\n\nWe design pile layouts to suit slab joints, column grids and racking layouts. Installation is carried out with mid-size rigs capable of production rates that keep pace with large floor plates.\n\nSuitable for new industrial estates and brownfield upgrades, including projects where floor loading requirements are uncertain and future-proofing is important.',
          project_types: ['industrial', 'commercial'],
          pile_type: 'screw_piles',
          max_recommended_depth_m: 12,
          min_recommended_depth_m: 3,
          suitable_soil_types: ['firm_clay', 'stiff_clay', 'sandy_soil', 'alluvial_soils'],
          typical_applications: 'Distribution warehouses, cold stores, light industrial factories, racking legs, tilt-panel footings.',
          typical_duration_description: 'For a typical 30m x 20m warehouse grid, screw piling is usually completed in 2 114 working days, depending on pile numbers and access.',
          is_featured: false,
          is_active: true,
          createdAt: '2022-06-10T10:00:00+10:00',
          updatedAt: '2025-09-19T09:30:00+10:00',
          image: 'https://sc01.alicdn.com/kf/HTB1xmXeOpXXXXXYXFXXq6xXFXXXu/221472029/HTB1xmXeOpXXXXXYXFXXq6xXFXXXu.jpg'
        },
        {
          id: 'svc_res_bored_piers_slabs',
          name: 'Residential Bored Piers for Slabs & Beams',
          category_id: 'piling_foundations',
          service_type: 'piling',
          slug: 'residential-bored-piers-for-slabs-beams',
          short_description: 'Conventional bored pier foundations for new house slabs, edge beams and garages.',
          full_description: 'Supply and installation of bored concrete piers for conventional residential slabs, edge beams, garages and small retaining walls. Suitable for greenfield sites and knock-down/rebuild projects with good access.\n\nWe coordinate with your builder and concrete contractor to set out, drill and clean pier holes to design depth and diameter, place reinforcement cages and concrete, and provide as-built records where required.',
          project_types: ['residential'],
          pile_type: 'bored_piles',
          max_recommended_depth_m: 3,
          min_recommended_depth_m: 1,
          suitable_soil_types: ['firm_clay', 'stiff_clay', 'rock', 'mixed_fill'],
          typical_applications: 'New house slabs, garage slabs, verandas and small retaining walls on standard lots.',
          typical_duration_description: 'Most standard house slab pier packages are completed in 1 working day, with larger or sloping sites requiring up to 2 days.',
          is_featured: false,
          is_active: true,
          createdAt: '2021-11-02T08:40:00+11:00',
          updatedAt: '2025-07-18T14:05:00+10:00',
          image: 'http://s.alicdn.com/@sc01/kf/H9454bffd27eb40849b6b140737211dfa9.jpg'
        }
      ],
      service_categories: [
        {
          id: 'piling_foundations',
          name: 'Piling Foundations',
          code: 'piling',
          description: 'Design and installation of screw piles, bored piers and other piling solutions for residential, commercial and industrial foundations.',
          display_order: 1,
          is_active: true,
          image: 'http://hindi.pilingrigmachine.com/photo/pl18990719-tysim_kr50a_small_rotary_piling_rig_drilling_rig_attachment_for_foundation_construction.jpg'
        },
        {
          id: 'earthworks_general',
          name: 'Earthworks & Excavation',
          code: 'earthworks',
          description: 'Bulk and detailed earthworks for basements, subdivisions, pads and general site preparation, including excavation, haulage and compaction.',
          display_order: 2,
          is_active: true,
          image: 'https://static.wixstatic.com/media/7ec3ac_9ec1e7060f774512a0f9b3dd557e16bf~mv2.jpg/v1/fill/w_660,h_440,al_c,q_80,usm_0.66_1.00_0.01/7ec3ac_9ec1e7060f774512a0f9b3dd557e16bf~mv2.jpg'
        },
        {
          id: 'retaining_wall_solutions',
          name: 'Retaining Wall Solutions',
          code: 'retaining_walls',
          description: 'Engineered retaining wall piling systems for residential and commercial boundaries, driveway cuts and benched pads.',
          display_order: 3,
          is_active: true,
          image: 'https://i.pinimg.com/originals/37/f7/da/37f7da1250b4568733ae03d47b3c4bb9.jpg'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:14:25.511859'
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('branches', JSON.stringify(generatedData.branches));
    localStorage.setItem('certifications', JSON.stringify(generatedData.certifications));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects));
    localStorage.setItem('resource_articles', JSON.stringify(generatedData.resource_articles));
    localStorage.setItem('equipment', JSON.stringify(generatedData.equipment));
    localStorage.setItem('services', JSON.stringify(generatedData.services));
    localStorage.setItem('service_categories', JSON.stringify(generatedData.service_categories));
    // Other collections start empty and will be created by business logic as needed
  }

  resetEnvironment() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestResidentialScrewPilingQuote();
    this.testTask2_PileEstimateWarehouseUnderBudget();
    this.testTask3_BookCheapestPilingRig3Days();
    this.testTask4_ShortlistThreeBasementProjects();
    this.testTask5_SafetyCertificationISO45001Enquiry();
    this.testTask6_SubdivisionEarthworksDurationAndCallback();
    this.testTask7_SiteInspectionRetainingWallPilingNear2000();
    this.testTask8_EarthworksPackageUnder40HoursUnderBudget();

    return this.results;
  }

  // Task 1
  testTask1_RequestResidentialScrewPilingQuote() {
    const testName = 'Task 1: Request residential screw piling quote for 2-storey extension';
    try {
      this.resetEnvironment();

      // Simulate navigating to Services and selecting Piling category
      const categories = this.logic.getServiceCategoriesForOverview();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Should return service categories');
      const pilingCategory = categories.find(c => c.code === 'piling');
      this.assert(pilingCategory, 'Should contain piling category');

      // Get piling service filter options (project types, pile types etc.)
      const pilingFilterOptions = this.logic.getPilingServiceFilterOptions();
      this.assert(pilingFilterOptions && Array.isArray(pilingFilterOptions.project_types), 'Should return piling filter options');

      // List piling services filtered by residential and screw piles, searching for screw piles
      const listResult = this.logic.listPilingServices(
        'residential',
        'screw_piles',
        null,
        'screw piles',
        1,
        20
      );
      this.assert(listResult && Array.isArray(listResult.services), 'Should list piling services');

      const matchingService = listResult.services.find(s =>
        s.pile_type === 'screw_piles' &&
        typeof s.max_recommended_depth_m === 'number' &&
        s.max_recommended_depth_m >= 8 &&
        Array.isArray(s.project_types) &&
        s.project_types.includes('residential')
      );
      this.assert(matchingService, 'Should find a residential screw piling service suitable to at least 8m depth');

      // Load service detail
      const serviceDetail = this.logic.getServiceDetail(matchingService.id);
      this.assert(serviceDetail && serviceDetail.id === matchingService.id, 'Should load correct service detail');
      this.assert(serviceDetail.max_recommended_depth_m >= 8, 'Service detail depth should be at least 8m');

      // Submit quote request from service detail
      const projectDescription = '2-storey rear house extension';
      const sitePostcode = '3000';
      const projectType = 'residential';
      const soilType = 'sandy_soil';
      const timeframe = 'within_3_months';
      const contactName = 'Test Homeowner';
      const contactEmail = 'homeowner@example.com';
      const contactPhone = '0400000000';

      const quoteResponse = this.logic.submitServiceQuoteRequest(
        serviceDetail.id,
        projectDescription,
        sitePostcode,
        projectType,
        soilType,
        timeframe,
        contactName,
        contactEmail,
        contactPhone,
        undefined
      );

      this.assert(quoteResponse && quoteResponse.success === true, 'Service quote request should succeed');
      this.assert(quoteResponse.quote_request_id, 'Quote response should include quote_request_id');

      // Verify quote request persisted correctly
      const quoteRequestsRaw = localStorage.getItem('quote_requests') || '[]';
      const quoteRequests = JSON.parse(quoteRequestsRaw);
      const savedQuote = quoteRequests.find(q => q.id === quoteResponse.quote_request_id);
      this.assert(savedQuote, 'Saved quote request should exist in storage');

      this.assert(savedQuote.related_service_id === serviceDetail.id, 'Quote should reference correct service');
      this.assert(savedQuote.project_description === projectDescription, 'Quote should preserve project description');
      this.assert(savedQuote.site_postcode === sitePostcode, 'Quote should preserve postcode');
      this.assert(savedQuote.project_type === projectType, 'Quote should preserve project type');
      this.assert(savedQuote.soil_type === soilType, 'Quote should preserve soil type');
      this.assert(savedQuote.project_start_timeframe === timeframe, 'Quote should preserve timeframe');
      this.assert(!!savedQuote.status, 'Quote should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_PileEstimateWarehouseUnderBudget() {
    const testName = 'Task 2: Pile quantity and cost estimate for warehouse under 60000 and quote request';
    try {
      this.resetEnvironment();

      // Use pile estimator for 30m x 20m warehouse on firm clay
      const buildingLength = 30;
      const buildingWidth = 20;
      const soilType = 'firm_clay';
      const buildingUseType = 'light_industrial_warehouse';
      const projectType = 'industrial';
      const budgetThreshold = 60000;

      const estimate = this.logic.calculatePileEstimate(
        buildingLength,
        buildingWidth,
        soilType,
        buildingUseType,
        projectType,
        budgetThreshold
      );

      this.assert(estimate && estimate.estimate_id, 'Pile estimate should return an estimate_id');
      this.assert(typeof estimate.estimated_total_cost === 'number', 'Estimated total cost should be numeric');
      this.assert(estimate.budget_threshold === budgetThreshold, 'Budget threshold should echo input');
      this.assert(estimate.is_under_budget_threshold === true, 'Estimate should be under budget threshold');
      this.assert(estimate.estimated_total_cost <= budgetThreshold, 'Estimated cost should be <= budget threshold');

      // Verify estimate persisted
      const pileEstimatesRaw = localStorage.getItem('pile_estimates') || '[]';
      const pileEstimates = JSON.parse(pileEstimatesRaw);
      const storedEstimate = pileEstimates.find(e => e.id === estimate.estimate_id);
      this.assert(storedEstimate, 'Pile estimate should be persisted in storage');
      this.assert(storedEstimate.building_length_m === buildingLength, 'Stored estimate length should match input');
      this.assert(storedEstimate.building_width_m === buildingWidth, 'Stored estimate width should match input');

      // Request detailed quote based on this estimate
      const projectName = '30m x 20m warehouse';
      const sitePostcode = '5000';
      const contactEmail = 'client@example.com';
      const contactPhone = '0400123456';
      const contactName = 'Warehouse Client';

      const quoteResponse = this.logic.submitPileEstimatorQuoteRequest(
        estimate.estimate_id,
        projectName,
        sitePostcode,
        projectType,
        contactEmail,
        contactPhone,
        contactName,
        undefined
      );

      this.assert(quoteResponse && quoteResponse.success === true, 'Pile estimator quote request should succeed');
      this.assert(quoteResponse.quote_request_id, 'Quote response should include quote_request_id');

      // Verify quote is linked to estimate and values preserved
      const quoteRequestsRaw = localStorage.getItem('quote_requests') || '[]';
      const quoteRequests = JSON.parse(quoteRequestsRaw);
      const savedQuote = quoteRequests.find(q => q.id === quoteResponse.quote_request_id);
      this.assert(savedQuote, 'Saved quote request should exist');
      this.assert(savedQuote.related_pile_estimate_id === estimate.estimate_id, 'Quote should reference pile estimate');
      this.assert(savedQuote.project_name === projectName, 'Quote should preserve project name');
      this.assert(savedQuote.site_postcode === sitePostcode, 'Quote should preserve postcode');
      this.assert(savedQuote.project_type === projectType, 'Quote should preserve project type');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_BookCheapestPilingRig3Days() {
    const testName = 'Task 3: Book cheapest piling rig with rating >=4 under 1000 per day for 3 days';
    try {
      this.resetEnvironment();

      // Get equipment filter options
      const filterOptions = this.logic.getEquipmentFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Should return equipment filter options');

      // List piling rigs with rating >=4 and max daily rate 1000, sorted by price ascending
      const listResult = this.logic.listEquipment(
        'piling_rigs',
        4,
        1000,
        true,
        'price_asc',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.equipment), 'Should list equipment');
      this.assert(listResult.equipment.length > 0, 'Should have at least one piling rig available');

      // Identify cheapest rig that meets rating and price criteria from sorted list
      const candidateRigs = listResult.equipment.filter(eq =>
        eq.category === 'piling_rigs' &&
        typeof eq.daily_rate === 'number' &&
        eq.daily_rate < 1000 &&
        typeof eq.average_rating === 'number' &&
        eq.average_rating >= 4
      );
      this.assert(candidateRigs.length > 0, 'Should have at least one rig meeting rating and price criteria');
      const chosenRig = candidateRigs[0];

      // Verify equipment detail
      const rigDetail = this.logic.getEquipmentDetail(chosenRig.id);
      this.assert(rigDetail && rigDetail.id === chosenRig.id, 'Should load chosen rig detail');
      this.assert(rigDetail.is_available === true, 'Chosen rig should be available');

      // Add rig to hire booking for 3 days
      const hireDays = 3;
      const addResult = this.logic.addEquipmentToHireBooking(chosenRig.id, hireDays);
      this.assert(addResult && addResult.booking_id, 'Adding equipment should create or update a hire booking');
      this.assert(Array.isArray(addResult.items) && addResult.items.length > 0, 'Booking should contain items');

      const bookingItem = addResult.items.find(i => i.equipment_id === chosenRig.id);
      this.assert(bookingItem, 'Booking should contain chosen rig as item');
      this.assert(bookingItem.hire_days === hireDays, 'Hire days for chosen rig should be 3');

      // Retrieve booking summary (simulating Review Booking)
      const bookingSummary = this.logic.getHireBookingSummary();
      this.assert(bookingSummary && bookingSummary.booking_id === addResult.booking_id, 'Summary should correspond to current booking');
      this.assert(Array.isArray(bookingSummary.items) && bookingSummary.items.length > 0, 'Summary should list items');

      // Submit hire booking with site postcode and contact details
      const sitePostcode = '4000';
      const contactName = 'Site Supervisor';
      const contactEmail = 'hire@example.com';
      const contactPhone = '0400000000';

      const submitResult = this.logic.submitHireBooking(
        sitePostcode,
        contactName,
        contactEmail,
        contactPhone
      );

      this.assert(submitResult && submitResult.success === true, 'Hire booking submission should succeed');
      this.assert(submitResult.booking_id === bookingSummary.booking_id, 'Submitted booking id should match summary');

      // Verify booking persisted
      const bookingsRaw = localStorage.getItem('hire_bookings') || '[]';
      const bookings = JSON.parse(bookingsRaw);
      const storedBooking = bookings.find(b => b.id === submitResult.booking_id);
      this.assert(storedBooking, 'Stored hire booking should exist');
      this.assert(storedBooking.site_postcode === sitePostcode, 'Booking should preserve site postcode');
      this.assert(storedBooking.contact_name === contactName, 'Booking should preserve contact name');
      this.assert(storedBooking.contact_email === contactEmail, 'Booking should preserve contact email');
      this.assert(storedBooking.contact_phone === contactPhone, 'Booking should preserve contact phone');
      this.assert(typeof storedBooking.total_days === 'number', 'Booking should have total_days numeric');
      this.assert(typeof storedBooking.total_cost === 'number', 'Booking should have total_cost numeric');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_ShortlistThreeBasementProjects() {
    const testName = 'Task 4: Shortlist 3 Melbourne basement excavation projects completed 2020–2023';
    try {
      this.resetEnvironment();

      // Get project filter options
      const filterOptions = this.logic.getProjectFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.project_types), 'Should return project filter options');

      // List basement excavation projects in Melbourne between 2020 and 2023
      const listResult = this.logic.listProjects(
        'basement_excavation',
        'melbourne',
        2020,
        2023,
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.projects), 'Should list projects');
      this.assert(listResult.projects.length >= 3, 'Should have at least 3 matching basement projects');

      const selectedProjects = listResult.projects.slice(0, 3);
      selectedProjects.forEach(p => {
        this.assert(p.project_type === 'basement_excavation', 'Project should be basement excavation');
        this.assert(p.location_region === 'melbourne', 'Project should be in Melbourne region');
        this.assert(p.completion_year >= 2020 && p.completion_year <= 2023, 'Project completion year should be between 2020 and 2023');
      });

      // Add each project to shortlist
      let shortlistId = null;
      for (let i = 0; i < selectedProjects.length; i++) {
        const proj = selectedProjects[i];
        const addResult = this.logic.addProjectToShortlist(proj.id);
        this.assert(addResult && addResult.shortlist_id, 'Adding project to shortlist should return shortlist id');
        shortlistId = addResult.shortlist_id;
        this.assert(Array.isArray(addResult.project_ids), 'Shortlist project_ids should be an array');
        this.assert(addResult.project_ids.includes(proj.id), 'Shortlist should contain added project id');
      }

      // View shortlist details
      const shortlistDetails = this.logic.getProjectShortlistDetails();
      this.assert(shortlistDetails && shortlistDetails.shortlist_id === shortlistId, 'Shortlist details should correspond to shortlist id');
      this.assert(Array.isArray(shortlistDetails.projects), 'Shortlist details should include projects array');
      this.assert(shortlistDetails.projects.length === 3, 'Shortlist should contain exactly 3 projects');

      shortlistDetails.projects.forEach(p => {
        this.assert(p.project_type === 'basement_excavation', 'Shortlisted project should be basement excavation');
        this.assert(p.location_region === 'melbourne', 'Shortlisted project should be in Melbourne region');
        this.assert(p.completion_year >= 2020 && p.completion_year <= 2023, 'Shortlisted project completion year should be between 2020 and 2023');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_SafetyCertificationISO45001Enquiry() {
    const testName = 'Task 5: Locate ISO 45001 certification and submit safety compliance enquiry referencing it';
    try {
      this.resetEnvironment();

      // List certifications
      const certifications = this.logic.listCertifications();
      this.assert(Array.isArray(certifications) && certifications.length > 0, 'Should list certifications');

      const iso45001 = certifications.find(c => c.code === 'ISO 45001');
      this.assert(iso45001, 'Should find ISO 45001 certification');

      const referenceCode = iso45001.code;
      const subject = 'Safety compliance enquiry';
      const message = 'Hello, I would like to understand your safety management practices in relation to ISO 45001 and how they apply on active piling and earthworks sites.';

      const contactName = 'Safety Manager';
      const contactEmail = 'safety.manager@example.com';
      const contactPhone = '0400123123';

      const enquiryResponse = this.logic.submitContactEnquiry(
        'safety_compliance',
        subject,
        message,
        contactName,
        contactEmail,
        contactPhone,
        referenceCode
      );

      this.assert(enquiryResponse && enquiryResponse.success === true, 'Safety compliance enquiry should succeed');
      this.assert(enquiryResponse.enquiry_id, 'Enquiry response should include enquiry_id');

      // Verify enquiry persisted with reference to ISO 45001
      const enquiriesRaw = localStorage.getItem('contact_enquiries') || '[]';
      const enquiries = JSON.parse(enquiriesRaw);
      const savedEnquiry = enquiries.find(e => e.id === enquiryResponse.enquiry_id);
      this.assert(savedEnquiry, 'Saved enquiry should exist in storage');

      this.assert(savedEnquiry.enquiry_type === 'safety_compliance', 'Enquiry type should be safety_compliance');
      this.assert(savedEnquiry.related_certification_code === referenceCode, 'Enquiry should reference ISO 45001 by code');
      this.assert(savedEnquiry.message.indexOf('ISO 45001') !== -1, 'Enquiry message should contain ISO 45001 text');
      this.assert(savedEnquiry.contact_email === contactEmail, 'Enquiry should preserve contact email');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_SubdivisionEarthworksDurationAndCallback() {
    const testName = 'Task 6: Find typical 10-lot subdivision earthworks duration and request morning callback';
    try {
      this.resetEnvironment();

      // Search resources for subdivision earthworks
      const searchResult = this.logic.searchResources(
        'subdivision earthworks',
        'faq',
        'subdivision earthworks',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.articles), 'Should list resource articles');
      const subdivisionArticle = searchResult.articles.find(a =>
        a.id === 'faq_subdivision_earthworks_duration' ||
        (Array.isArray(a.topics) && a.topics.indexOf('10-lot subdivision') !== -1)
      );
      this.assert(subdivisionArticle, 'Should find FAQ about 10-lot subdivision earthworks duration');

      // Load full article detail and confirm it has a typical duration description
      const articleDetail = this.logic.getResourceArticleDetail(subdivisionArticle.id);
      this.assert(articleDetail && articleDetail.id === subdivisionArticle.id, 'Should load article detail');
      this.assert(
        typeof articleDetail.typical_duration_description === 'string' &&
          articleDetail.typical_duration_description.length > 0,
        'Article should provide typical duration description'
      );

      // Submit callback request with morning time window
      const name = 'Subdivision Developer';
      const phone = '0400555123';
      const email = 'subdivision.client@example.com';
      const projectDescription = '10-lot subdivision earthworks schedule enquiry';
      const preferredTimeWindow = '9:30–10:30 AM';

      const callbackResponse = this.logic.submitCallbackRequest(
        name,
        phone,
        email,
        projectDescription,
        preferredTimeWindow,
        ''
      );

      this.assert(callbackResponse && callbackResponse.success === true, 'Callback request should succeed');
      this.assert(callbackResponse.callback_request_id, 'Callback response should include callback_request_id');

      // Verify callback request persisted
      const callbacksRaw = localStorage.getItem('callback_requests') || '[]';
      const callbacks = JSON.parse(callbacksRaw);
      const savedCallback = callbacks.find(c => c.id === callbackResponse.callback_request_id);
      this.assert(savedCallback, 'Saved callback request should exist');

      this.assert(savedCallback.name === name, 'Callback should preserve name');
      this.assert(savedCallback.phone === phone, 'Callback should preserve phone');
      this.assert(savedCallback.project_description === projectDescription, 'Callback should preserve project description');
      this.assert(savedCallback.preferred_contact_time_window === preferredTimeWindow, 'Callback should preserve time window');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_SiteInspectionRetainingWallPilingNear2000() {
    const testName = 'Task 7: Schedule site inspection for retaining wall piling at nearest branch to 2000 on 15th next month';
    try {
      this.resetEnvironment();

      const sitePostcode = '2000';

      // Get nearest branches to postcode 2000
      const branches = this.logic.getNearestBranches(sitePostcode);
      this.assert(Array.isArray(branches) && branches.length > 0, 'Should return list of nearest branches');

      const nearestBranch = branches[0];
      this.assert(nearestBranch && nearestBranch.id, 'Nearest branch should have id');

      // Fetch site inspection service types and select retaining wall piling
      const serviceTypes = this.logic.getSiteInspectionServiceTypes();
      this.assert(Array.isArray(serviceTypes) && serviceTypes.length > 0, 'Should list site inspection service types');

      let retainingService = serviceTypes.find(s => s.value === 'retaining_wall_piling');
      if (!retainingService) {
        // Fallback to first type if exact value is not present
        retainingService = serviceTypes[0];
      }
      const serviceTypeValue = retainingService.value;

      // Determine date: 15th of next month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-based
      const nextMonthIndex = (month + 1) % 12;
      const yearForNextMonth = month === 11 ? year + 1 : year;
      const inspectionDateObj = new Date(yearForNextMonth, nextMonthIndex, 15);
      const dateString = inspectionDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

      // Get available time slots for that branch, service and date
      const timeSlots = this.logic.getAvailableInspectionTimeSlots(
        nearestBranch.id,
        serviceTypeValue,
        dateString
      );

      this.assert(Array.isArray(timeSlots), 'Time slots response should be an array');
      const availableSlot = timeSlots.find(ts => ts.is_available);
      this.assert(availableSlot, 'Should have at least one available time slot for chosen day');
      const timeSlotLabel = availableSlot.time_slot;

      // Create site inspection booking
      const contactName = 'Boundary Owner';
      const contactPhone = '0400000000';
      const contactEmail = 'inspection@example.com';
      const notes = 'Retaining wall along rear boundary';
      const inspectionDateTime = dateString + 'T' + '10:00:00';

      const bookingResponse = this.logic.createSiteInspectionBooking(
        sitePostcode,
        nearestBranch.id,
        serviceTypeValue,
        inspectionDateTime,
        timeSlotLabel,
        contactName,
        contactPhone,
        contactEmail,
        notes
      );

      this.assert(bookingResponse && bookingResponse.success === true, 'Site inspection booking should succeed');
      this.assert(bookingResponse.booking_id, 'Booking response should include booking_id');

      // Verify booking persisted
      const bookingsRaw = localStorage.getItem('site_inspection_bookings') || '[]';
      const bookings = JSON.parse(bookingsRaw);
      const storedBooking = bookings.find(b => b.id === bookingResponse.booking_id);
      this.assert(storedBooking, 'Stored site inspection booking should exist');

      this.assert(storedBooking.site_postcode === sitePostcode, 'Booking should preserve site postcode');
      this.assert(storedBooking.branch_id === nearestBranch.id, 'Booking should reference nearest branch');
      this.assert(storedBooking.service_type === serviceTypeValue, 'Booking should preserve service type');
      this.assert(storedBooking.time_slot === timeSlotLabel, 'Booking should preserve time slot');
      this.assert(storedBooking.contact_name === contactName, 'Booking should preserve contact name');
      this.assert(storedBooking.contact_phone === contactPhone, 'Booking should preserve contact phone');
      this.assert(storedBooking.notes === notes, 'Booking should preserve notes');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_EarthworksPackageUnder40HoursUnderBudget() {
    const testName = 'Task 8: Configure earthworks package under 40 hours and 20000 budget and request quote';
    try {
      this.resetEnvironment();

      // Define package items (excavation, haulage, compaction)
      const items = [
        {
          item_type: 'excavation',
          label: 'Excavation',
          machine_hours: 16,
          rate_per_hour: 300
        },
        {
          item_type: 'haulage_truck_hire',
          label: 'Haulage',
          machine_hours: 12,
          rate_per_hour: 250
        },
        {
          item_type: 'compaction_roller_hire',
          label: 'Compaction',
          machine_hours: 8,
          rate_per_hour: 200
        }
      ];
      const hoursLimit = 40;
      const budgetLimit = 20000;

      // Preview package configuration
      const preview = this.logic.previewEarthworksPackageConfiguration(
        items,
        hoursLimit,
        budgetLimit
      );

      this.assert(preview && typeof preview.total_machine_hours === 'number', 'Preview should return total machine hours');
      this.assert(preview.total_machine_hours <= hoursLimit, 'Total machine hours should be within hours limit');
      this.assert(preview.is_within_hours_limit === true, 'is_within_hours_limit should be true');
      this.assert(typeof preview.estimated_total_cost === 'number', 'Preview should return estimated total cost');
      this.assert(preview.estimated_total_cost <= budgetLimit, 'Estimated total cost should be under budget limit');
      this.assert(preview.is_within_budget_limit === true, 'is_within_budget_limit should be true');

      // Submit quote request for configured package
      const configurationName = '3-service package';
      const projectName = 'Custom 3-service earthworks package';
      const projectDescription = '3-lot infill development';
      const sitePostcode = '4217';
      const projectType = 'subdivision';
      const contactName = 'Developer Client';
      const contactEmail = 'developer@example.com';
      const contactPhone = '0411111111';
      const budgetCap = budgetLimit;

      const submitResult = this.logic.submitEarthworksPackageQuoteRequest(
        configurationName,
        items,
        hoursLimit,
        budgetLimit,
        projectName,
        projectDescription,
        sitePostcode,
        projectType,
        contactName,
        contactEmail,
        contactPhone,
        budgetCap
      );

      this.assert(submitResult && submitResult.success === true, 'Earthworks package quote request should succeed');
      this.assert(submitResult.package_configuration && submitResult.package_configuration.id, 'Response should include package configuration with id');
      this.assert(submitResult.quote_request_id, 'Response should include quote_request_id');

      const pkg = submitResult.package_configuration;
      this.assert(pkg.total_machine_hours <= hoursLimit, 'Stored package total hours should remain within limit');
      this.assert(pkg.is_within_hours_limit === true, 'Stored package is_within_hours_limit should be true');
      this.assert(pkg.estimated_total_cost <= budgetLimit, 'Stored package cost should remain under budget limit');
      this.assert(pkg.is_within_budget_limit === true, 'Stored package is_within_budget_limit should be true');

      // Verify earthworks package record persisted
      const packagesRaw = localStorage.getItem('earthworks_packages') || '[]';
      const packages = JSON.parse(packagesRaw);
      const storedPackage = packages.find(p => p.id === pkg.id);
      this.assert(storedPackage, 'Stored earthworks package should exist');
      this.assert(storedPackage.total_machine_hours === pkg.total_machine_hours, 'Stored package hours should match response');
      this.assert(storedPackage.estimated_total_cost === pkg.estimated_total_cost, 'Stored package cost should match response');

      // Verify related quote request persisted and linked to package
      const quotesRaw = localStorage.getItem('quote_requests') || '[]';
      const quotes = JSON.parse(quotesRaw);
      const savedQuote = quotes.find(q => q.id === submitResult.quote_request_id);
      this.assert(savedQuote, 'Saved quote request should exist for earthworks package');
      this.assert(savedQuote.related_earthworks_package_id === pkg.id, 'Quote should reference earthworks package id');
      this.assert(savedQuote.project_name === projectName, 'Quote should preserve project name');
      this.assert(savedQuote.project_description === projectDescription, 'Quote should preserve project description');
      this.assert(savedQuote.site_postcode === sitePostcode, 'Quote should preserve site postcode');
      this.assert(savedQuote.project_type === projectType, 'Quote should preserve project type');

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
