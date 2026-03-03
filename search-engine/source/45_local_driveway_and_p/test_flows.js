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
    // Reinitialize storage structure via business logic
    this.logic._initStorage();
  }

  setupTestData() {
    // Generated Data (USED ONLY HERE, COPIED EXACTLY, THEN EXTENDED)
    const generatedData = {
      "projects": [
        {
          "id": "proj_asphalt_midtown_480",
          "title": "Midtown Asphalt Driveway Resurfacing – 2-Car Home",
          "summary": "Resurfaced a worn 2-car asphalt driveway with fresh overlay and clean edges.",
          "surface_type": "asphalt",
          "size_sq_ft": 480,
          "completion_date": "2025-04-18T14:30:00Z",
          "images": [
            "https://picsum.photos/800/600?random=101",
            "https://picsum.photos/800/600?random=102"
          ],
          "location": "Midtown Atlanta, GA",
          "description": "This 2-car driveway had extensive surface cracking and faded sealant. We milled high spots, repaired potholes, and applied a new 1.5\" asphalt overlay with clean transitions to the sidewalk and garage slab.",
          "is_featured": true
        },
        {
          "id": "proj_asphalt_buckhead_720",
          "title": "Buckhead Hillside Asphalt Driveway Replacement",
          "summary": "Full-depth replacement of a sloped asphalt driveway with improved drainage.",
          "surface_type": "asphalt",
          "size_sq_ft": 720,
          "completion_date": "2024-09-12T10:15:00Z",
          "images": [
            "https://picsum.photos/800/600?random=103",
            "https://picsum.photos/800/600?random=104",
            "https://picsum.photos/800/600?random=105"
          ],
          "location": "Buckhead, Atlanta, GA",
          "description": "Removed the failing asphalt down to the base, regraded for better water runoff, compacted new aggregate, and installed a 3\" asphalt driveway with crisp edging and a standard finish.",
          "is_featured": true
        },
        {
          "id": "proj_asphalt_decatur_650",
          "title": "Decatur Family Home Asphalt Driveway Upgrade",
          "summary": "New asphalt surface with widened parking pad for a growing family.",
          "surface_type": "asphalt",
          "size_sq_ft": 650,
          "completion_date": "2024-06-05T09:45:00Z",
          "images": [
            "https://picsum.photos/800/600?random=106",
            "https://picsum.photos/800/600?random=107"
          ],
          "location": "Decatur, GA",
          "description": "The original narrow driveway was replaced and widened to allow two vehicles side by side. Included base repairs, new asphalt installation, and standard finish suitable for everyday residential use.",
          "is_featured": false
        }
      ],
      "services": [
        {
          "id": "asphalt_resurfacing",
          "name": "Asphalt Resurfacing",
          "description": "Overlay and resurfacing of existing asphalt driveways, including minor base repairs and crack filling.",
          "service_type": "asphalt_resurfacing",
          "category": "resurfacing",
          "default_warranty_years": 2,
          "is_active": true,
          "sort_order": 1,
          "image": "http://insyncfamilies.com/wp-content/uploads/2019/06/driveway-crack-repair.jpg"
        },
        {
          "id": "asphalt_driveway_replacement",
          "name": "Asphalt Driveway Replacement",
          "description": "Full-depth removal and replacement of failing asphalt driveways with new base and surface courses.",
          "service_type": "asphalt_driveway_replacement",
          "category": "replacement",
          "default_warranty_years": 5,
          "is_active": true,
          "sort_order": 2,
          "image": "https://www.jrboehlke.com/Content/images/extra_images/asphalt_maintenance_img.jpg"
        },
        {
          "id": "concrete_driveways",
          "name": "Concrete Driveways",
          "description": "New concrete driveway installation and replacement, including standard brushed and decorative finishes.",
          "service_type": "concrete_driveways",
          "category": "installation",
          "default_warranty_years": 3,
          "is_active": true,
          "sort_order": 3,
          "image": "https://lovellconstruction.net/wp-content/uploads/2020/12/residential-concrete-driveway-construction-006.jpg"
        }
      ],
      "service_areas": [
        {
          "id": "downtown_atlanta",
          "name": "Downtown Atlanta",
          "description": "Core Atlanta service area covering downtown neighborhoods, business district, and adjacent residential streets.",
          "covered_zip_codes": [
            "30303",
            "30308",
            "30309",
            "30312"
          ],
          "is_primary": true,
          "image": "https://ecopaving.com/wp-content/uploads/2014/09/IMG_0162-web.jpg"
        },
        {
          "id": "midtown_atlanta",
          "name": "Midtown & Old Fourth Ward",
          "description": "Service area for Midtown high-rises, historic homes, and Old Fourth Ward neighborhoods.",
          "covered_zip_codes": [
            "30306",
            "30307",
            "30324"
          ],
          "is_primary": true,
          "image": "https://skyfireenergy.com/wp-content/uploads/Residential-Service-Area-Map-1024x703.png"
        },
        {
          "id": "north_atlanta",
          "name": "North Atlanta & Buckhead",
          "description": "Covers Buckhead, North Atlanta suburbs, and nearby residential communities.",
          "covered_zip_codes": [
            "30305",
            "30318",
            "30327",
            "30342"
          ],
          "is_primary": false,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/73579eee-cf93-509e-a48a-5e4bdab9b12a.jpeg"
        }
      ],
      "promotions": [
        {
          "id": "promo_pave20",
          "code": "PAVE20",
          "title": "20% Off 500+ Sq Ft Driveway Paving",
          "description": "Save 20% on qualifying driveway paving projects of 500 sq ft or more, including asphalt and concrete installations.",
          "discount_type": "percent",
          "discount_percent": 20,
          "discount_amount": 0,
          "min_project_size_sq_ft": 500,
          "min_order_price": 3000,
          "eligible_service_types": [
            "general_driveway_paving",
            "asphalt_resurfacing",
            "concrete_driveways"
          ],
          "start_date": "2025-11-01T00:00:00Z",
          "end_date": "2026-12-31T23:59:59Z",
          "is_active": true,
          "source_page_link": "quote.html?serviceId=general_driveway_paving&promoCode=PAVE20"
        },
        {
          "id": "promo_seal15",
          "code": "SEAL15",
          "title": "15% Off Driveway Sealing & Crack Filling",
          "description": "Get 15% off driveway sealing services, including qualifying crack filling packages for residential asphalt driveways.",
          "discount_type": "percent",
          "discount_percent": 15,
          "discount_amount": 0,
          "min_project_size_sq_ft": 300,
          "min_order_price": 250,
          "eligible_service_types": [
            "driveway_sealing"
          ],
          "start_date": "2025-09-01T00:00:00Z",
          "end_date": "2026-09-30T23:59:59Z",
          "is_active": true,
          "source_page_link": "service.html?serviceId=driveway_sealing&promoCode=SEAL15"
        },
        {
          "id": "promo_snow50",
          "code": "SNOW50",
          "title": "$50 Off Seasonal Snow Removal Plans",
          "description": "Take $50 off any qualifying seasonal snow removal plan for residential driveways.",
          "discount_type": "fixed_amount",
          "discount_percent": 0,
          "discount_amount": 50,
          "min_project_size_sq_ft": 0,
          "min_order_price": 400,
          "eligible_service_types": [
            "snow_removal"
          ],
          "start_date": "2025-10-01T00:00:00Z",
          "end_date": "2026-03-31T23:59:59Z",
          "is_active": true,
          "source_page_link": "service.html?serviceId=snow_removal&promoCode=SNOW50"
        }
      ],
      "service_packages": [
        {
          "id": "pkg_asph_resurf_standard_400",
          "service_id": "asphalt_resurfacing",
          "name": "Standard Asphalt Resurfacing (Up to 600 sq ft)",
          "description": "Standard 1.5\" asphalt overlay including basic crack filling and edge cleanup. Ideal for 1–2 car residential driveways.",
          "package_type": "resurfacing_package",
          "base_price": 2200,
          "warranty_years": 2,
          "recommended_min_size_sq_ft": 300,
          "recommended_max_size_sq_ft": 600,
          "supported_driveway_categories": [
            "single_car",
            "two_car"
          ],
          "supported_surface_types": [
            "asphalt"
          ],
          "includes_crack_filling": true,
          "max_visits": 0,
          "max_driveway_length_ft": 70,
          "is_active": true,
          "display_order": 1,
          "image": "https://i.pinimg.com/originals/c2/60/2c/c2602c41fa9d509bf3aa057f34ac4966.jpg"
        },
        {
          "id": "pkg_asph_resurf_premium_400",
          "service_id": "asphalt_resurfacing",
          "name": "Premium Asphalt Resurfacing with Edge Rebuild",
          "description": "Premium overlay with added base repairs along edges, upgraded mix, and extended warranty.",
          "package_type": "resurfacing_package",
          "base_price": 2800,
          "warranty_years": 3,
          "recommended_min_size_sq_ft": 350,
          "recommended_max_size_sq_ft": 700,
          "supported_driveway_categories": [
            "two_car",
            "long_drive"
          ],
          "supported_surface_types": [
            "asphalt"
          ],
          "includes_crack_filling": true,
          "max_visits": 0,
          "max_driveway_length_ft": 90,
          "is_active": true,
          "display_order": 2,
          "image": "https://aaatopqualityasphalt.com/wp-content/uploads/2020/07/iStock-539968396-feat.jpg"
        },
        {
          "id": "pkg_asph_replace_standard_600",
          "service_id": "asphalt_driveway_replacement",
          "name": "Standard Asphalt Driveway Replacement (2-Car)",
          "description": "Full-depth tear-out and replacement for typical 2-car driveways, including new compacted base and asphalt surface.",
          "package_type": "replacement_package",
          "base_price": 6400,
          "warranty_years": 5,
          "recommended_min_size_sq_ft": 450,
          "recommended_max_size_sq_ft": 750,
          "supported_driveway_categories": [
            "two_car"
          ],
          "supported_surface_types": [
            "asphalt"
          ],
          "includes_crack_filling": false,
          "max_visits": 0,
          "max_driveway_length_ft": 80,
          "is_active": true,
          "display_order": 1,
          "image": "https://newnandrivewayrepair.com/wp-content/uploads/2021/03/Asphalt_driveway_Replacement.jpg"
        }
      ],
      "zip_areas": [
        {
          "id": "zip_30301",
          "zip_code": "30301",
          "city": "Atlanta",
          "state": "GA",
          "is_served": false,
          "service_area_id": "downtown_atlanta",
          "latitude": 33.7527,
          "longitude": -84.3915
        },
        {
          "id": "zip_30303",
          "zip_code": "30303",
          "city": "Atlanta",
          "state": "GA",
          "is_served": true,
          "service_area_id": "downtown_atlanta",
          "latitude": 33.7526,
          "longitude": -84.3915
        },
        {
          "id": "zip_30308",
          "zip_code": "30308",
          "city": "Atlanta",
          "state": "GA",
          "is_served": true,
          "service_area_id": "downtown_atlanta",
          "latitude": 33.7711,
          "longitude": -84.3835
        }
      ],
      "crew_reviews": [
        {
          "id": "rev_aspelite_001",
          "crew_id": "crew_asphalt_elite",
          "reviewer_name": "Dana P.",
          "rating": 5,
          "comment": "Flawless asphalt driveway replacement. Crew was on time, and the new surface drains perfectly.",
          "service_type": "asphalt_driveway_replacement",
          "created_at": "2025-11-05T14:20:00Z"
        },
        {
          "id": "rev_aspelite_002",
          "crew_id": "crew_asphalt_elite",
          "reviewer_name": "Chris L.",
          "rating": 5,
          "comment": "They tore out and replaced our cracked driveway in two days. Very professional and tidy.",
          "service_type": "asphalt_driveway_replacement",
          "created_at": "2025-09-18T10:05:00Z"
        },
        {
          "id": "rev_aspelite_003",
          "crew_id": "crew_asphalt_elite",
          "reviewer_name": "Alicia R.",
          "rating": 4.5,
          "comment": "Great communication and workmanship on our 2-car asphalt replacement.",
          "service_type": "asphalt_driveway_replacement",
          "created_at": "2025-12-02T16:45:00Z"
        }
      ],
      "crews": [
        {
          "id": "crew_asphalt_elite",
          "name": "Asphalt Elite Replacement Crew",
          "bio": "Specialized asphalt team focusing on full-depth driveway replacements and resurfacing overlays. Known as our highest-rated asphalt replacement crew with over 50 verified homeowner reviews and consistent 4.8\u00150.0 star satisfaction on medium to large residential projects.",
          "service_types": [
            "asphalt_driveway_replacement",
            "asphalt_resurfacing",
            "asphalt_driveway",
            "general_driveway_paving"
          ],
          "primary_location": "North Atlanta & Buckhead, GA",
          "service_area_ids": [
            "north_atlanta",
            "downtown_atlanta",
            "midtown_atlanta",
            "decatur_eastside"
          ],
          "is_active": true,
          "review_count": 8,
          "overall_rating": 4.8125
        },
        {
          "id": "crew_concrete_masters",
          "name": "Concrete Masters Install Team",
          "bio": "Dedicated concrete driveway installation crew experienced with standard brushed slabs and decorative borders. Ideal for 2-car driveways and full replacements with clean control joints and proper drainage.",
          "service_types": [
            "concrete_driveways",
            "general_driveway_paving"
          ],
          "primary_location": "Marietta & North Atlanta Suburbs, GA",
          "service_area_ids": [
            "north_atlanta",
            "decatur_eastside"
          ],
          "is_active": true,
          "review_count": 3,
          "overall_rating": 4.433333333333334
        },
        {
          "id": "crew_seal_guardians",
          "name": "SealGuard Driveway Maintenance Crew",
          "bio": "Sealcoating and maintenance specialists handling crack filling, sealcoat application, and small asphalt touch-ups. Optimized for fast single-day sealing on 1\u00021 car and 2-car driveways.",
          "service_types": [
            "driveway_sealing",
            "asphalt_resurfacing"
          ],
          "primary_location": "Decatur & Eastside, GA",
          "service_area_ids": [
            "decatur_eastside",
            "downtown_atlanta",
            "south_atlanta"
          ],
          "is_active": true,
          "review_count": 3,
          "overall_rating": 4.566666666666666
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:14:46.261532"
      }
    };

    // ---- Extend generated data with minimal additional records needed for flows ----

    const extraServices = [
      {
        id: 'driveway_sealing',
        name: 'Driveway Sealing',
        description: 'Sealcoating and crack filling plans for residential asphalt driveways.',
        service_type: 'driveway_sealing',
        category: 'maintenance',
        default_warranty_years: 2,
        is_active: true,
        sort_order: 4
      },
      {
        id: 'snow_removal',
        name: 'Seasonal Snow Removal',
        description: 'Seasonal driveway snow clearing plans for residential properties.',
        service_type: 'snow_removal',
        category: 'seasonal',
        default_warranty_years: 0,
        is_active: true,
        sort_order: 5
      },
      {
        id: 'general_driveway_paving',
        name: 'General Driveway Paving',
        description: 'Flexible driveway paving service for asphalt or concrete.',
        service_type: 'general_driveway_paving',
        category: 'installation',
        default_warranty_years: 3,
        is_active: true,
        sort_order: 6
      }
    ];

    const extraServicePackages = [
      // Concrete driveway installation packages (for Task 2 & 6)
      {
        id: 'pkg_conc_value_600',
        service_id: 'concrete_driveways',
        name: 'Value Concrete Driveway (Approx. 600 sq ft)',
        description: 'Cost-effective 2-car concrete driveway with standard brushed finish.',
        package_type: 'installation_package',
        base_price: 7800,
        warranty_years: 3,
        recommended_min_size_sq_ft: 500,
        recommended_max_size_sq_ft: 700,
        supported_driveway_categories: ['two_car'],
        supported_surface_types: ['concrete'],
        includes_crack_filling: false,
        max_visits: 0,
        max_driveway_length_ft: 70,
        is_active: true,
        display_order: 1
      },
      {
        id: 'pkg_conc_plus_600',
        service_id: 'concrete_driveways',
        name: 'Plus Concrete Driveway (Up to 650 sq ft)',
        description: 'Upgraded mix and joint layout for 2-car driveways.',
        package_type: 'installation_package',
        base_price: 8600,
        warranty_years: 4,
        recommended_min_size_sq_ft: 500,
        recommended_max_size_sq_ft: 650,
        supported_driveway_categories: ['two_car'],
        supported_surface_types: ['concrete'],
        includes_crack_filling: false,
        max_visits: 0,
        max_driveway_length_ft: 75,
        is_active: true,
        display_order: 2
      },
      // Driveway sealing plans (for Task 3)
      {
        id: 'pkg_seal_basic_2yr',
        service_id: 'driveway_sealing',
        name: 'Basic Sealing with Crack Fill (2-Year)',
        description: 'Standard sealcoat plus crack filling for typical 2-car driveways.',
        package_type: 'sealing_plan',
        base_price: 350,
        warranty_years: 2,
        recommended_min_size_sq_ft: 350,
        recommended_max_size_sq_ft: 700,
        supported_driveway_categories: ['single_car', 'two_car'],
        supported_surface_types: ['asphalt'],
        includes_crack_filling: true,
        max_visits: 0,
        max_driveway_length_ft: 70,
        is_active: true,
        display_order: 1
      },
      {
        id: 'pkg_seal_premium_3yr',
        service_id: 'driveway_sealing',
        name: 'Premium Sealing & Crack Repair (3-Year)',
        description: 'Premium sealcoat, hot crack fill, and edge touch-ups.',
        package_type: 'sealing_plan',
        base_price: 520,
        warranty_years: 3,
        recommended_min_size_sq_ft: 350,
        recommended_max_size_sq_ft: 800,
        supported_driveway_categories: ['two_car'],
        supported_surface_types: ['asphalt'],
        includes_crack_filling: true,
        max_visits: 0,
        max_driveway_length_ft: 80,
        is_active: true,
        display_order: 2
      },
      {
        id: 'pkg_seal_economy_1yr',
        service_id: 'driveway_sealing',
        name: 'Economy Sealing (No Crack Fill)',
        description: 'Budget sealcoat without crack filling.',
        package_type: 'sealing_plan',
        base_price: 260,
        warranty_years: 1,
        recommended_min_size_sq_ft: 300,
        recommended_max_size_sq_ft: 600,
        supported_driveway_categories: ['single_car'],
        supported_surface_types: ['asphalt'],
        includes_crack_filling: false,
        max_visits: 0,
        max_driveway_length_ft: 60,
        is_active: true,
        display_order: 3
      },
      // Snow removal seasonal plans (for Task 8)
      {
        id: 'pkg_snow_basic_20',
        service_id: 'snow_removal',
        name: 'Basic Seasonal Snow Removal (Up to 20 Visits)',
        description: 'Up to 20 clearings per season for driveways up to 60 ft.',
        package_type: 'seasonal_plan',
        base_price: 550,
        warranty_years: 0,
        recommended_min_size_sq_ft: 0,
        recommended_max_size_sq_ft: 0,
        supported_driveway_categories: ['single_car', 'two_car'],
        supported_surface_types: ['asphalt', 'concrete'],
        includes_crack_filling: false,
        max_visits: 20,
        max_driveway_length_ft: 60,
        is_active: true,
        display_order: 1
      },
      {
        id: 'pkg_snow_premium_30',
        service_id: 'snow_removal',
        name: 'Premium Seasonal Snow Removal (Up to 30 Visits)',
        description: 'Extended visit cap and priority response.',
        package_type: 'seasonal_plan',
        base_price: 620,
        warranty_years: 0,
        recommended_min_size_sq_ft: 0,
        recommended_max_size_sq_ft: 0,
        supported_driveway_categories: ['two_car'],
        supported_surface_types: ['asphalt', 'concrete'],
        includes_crack_filling: false,
        max_visits: 30,
        max_driveway_length_ft: 80,
        is_active: true,
        display_order: 2
      }
    ];

    // Merge generated and extra data
    const services = generatedData.services.concat(extraServices);
    const servicePackages = generatedData.service_packages.concat(extraServicePackages);

    // Persist to localStorage using storage keys
    localStorage.setItem('projects', JSON.stringify(generatedData.projects));
    localStorage.setItem('services', JSON.stringify(services));
    localStorage.setItem('service_areas', JSON.stringify(generatedData.service_areas));
    localStorage.setItem('promotions', JSON.stringify(generatedData.promotions));
    localStorage.setItem('service_packages', JSON.stringify(servicePackages));
    localStorage.setItem('zip_areas', JSON.stringify(generatedData.zip_areas));
    localStorage.setItem('crew_reviews', JSON.stringify(generatedData.crew_reviews));
    localStorage.setItem('crews', JSON.stringify(generatedData.crews));

    // Initialize other entity collections as empty arrays
    localStorage.setItem('bookings', JSON.stringify([]));
    localStorage.setItem('quote_requests', JSON.stringify([]));
    localStorage.setItem('favorite_projects', JSON.stringify([]));
    localStorage.setItem('service_area_inquiries', JSON.stringify([]));
    localStorage.setItem('estimate_requests', JSON.stringify([]));
    localStorage.setItem('contact_messages', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AsphaltResurfacingQuoteWeekdayMorning();
    this.testTask2_ConcreteDrivewayBookingUnderBudget();
    this.testTask3_CheapestSealingPlanWithCrackFilling();
    this.testTask4_SaveThreeAsphaltProjectsToFavorites();
    this.testTask5_CheckZipCoverageAndRequestException();
    this.testTask6_ApplyPromoCodeForLargeProject();
    this.testTask7_RequestEstimateFromTopAsphaltCrew();
    this.testTask8_SignupSeasonalSnowRemovalPlan();

    return this.results;
  }

  // Task 1: Asphalt resurfacing quote, 400 sq ft, weekday morning within next 30 days
  testTask1_AsphaltResurfacingQuoteWeekdayMorning() {
    const testName = 'Task 1: Asphalt resurfacing quote – weekday morning';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary && Array.isArray(homeSummary.featured_services), 'Homepage summary should load');

      // Open quote form
      const quoteOptions = this.logic.getQuoteFormOptions();
      this.assert(quoteOptions && quoteOptions.scheduling_constraints, 'Quote form options should include scheduling constraints');

      const sched = quoteOptions.scheduling_constraints;
      const earliestDateStr = sched.earliest_date;
      const latestDateStr = sched.latest_date || earliestDateStr;
      this.assert(earliestDateStr, 'Earliest quote date should be defined');

      // Get availability for asphalt resurfacing between earliest and latest dates
      const availability = this.logic.getServiceAvailability('asphalt_resurfacing', earliestDateStr, latestDateStr);
      this.assert(Array.isArray(availability), 'Service availability should be an array');

      let chosenDate = null;
      let chosenSlot = null;
      let matchedMorningWindow = false;

      for (const day of availability) {
        const slots = Array.isArray(day.time_slots) ? day.time_slots.filter(s => s.is_available) : [];
        if (!slots.length) continue;

        const morningSlots = slots.filter(s => s.start >= '09:00' && s.start <= '11:00');
        if (day.is_weekday && morningSlots.length) {
          morningSlots.sort((a, b) => a.start.localeCompare(b.start));
          chosenDate = day.date;
          chosenSlot = morningSlots[0];
          matchedMorningWindow = true;
          break;
        }

        // Fallback: remember earliest available if no ideal weekday morning is found
        if (!chosenDate) {
          chosenDate = day.date;
          chosenSlot = slots[0];
        }
      }

      this.assert(chosenDate && chosenSlot, 'Should find at least one available time slot');

      const preferredDate = chosenDate;
      const preferredStart = chosenSlot.start;
      const preferredEnd = chosenSlot.end;

      // Submit quote request for asphalt resurfacing, 400 sq ft, standard material
      const submitResult = this.logic.submitQuoteRequest(
        'asphalt_resurfacing', // serviceType
        400,                   // drivewaySizeSqFt
        'square_feet',         // sizeUnit
        'standard',            // materialOption
        preferredDate,         // preferredDate
        preferredStart,        // preferredTimeWindowStart
        preferredEnd,          // preferredTimeWindowEnd
        'Jordan Smith',        // contactName
        '555-0123',            // contactPhone
        'jordan.smith@example.com', // contactEmail
        undefined,             // promoCode
        undefined,             // crewId
        'quote_page'           // sourcePage
      );

      this.assert(submitResult && submitResult.success === true, 'Quote submission should succeed');
      const quote = submitResult.quoteRequest;
      this.assert(quote, 'QuoteRequest object should be returned');

      // Basic field validations based on inputs
      this.assert(quote.service_type === 'asphalt_resurfacing', 'QuoteRequest service_type should be asphalt_resurfacing');
      this.assert(quote.driveway_size_sq_ft === 400, 'QuoteRequest driveway_size_sq_ft should be 400');
      this.assert(quote.size_unit === 'square_feet', 'QuoteRequest size_unit should be square_feet');
      this.assert(quote.material_option === 'standard', 'QuoteRequest material_option should be standard');
      this.assert(quote.contact_name === 'Jordan Smith', 'Contact name should match');

      if (matchedMorningWindow) {
        this.assert(quote.preferred_time_window_start >= '09:00' && quote.preferred_time_window_start <= '11:00', 'Preferred start should be between 09:00 and 11:00');
      }

      // Verify it was persisted correctly
      const storedQuotes = JSON.parse(localStorage.getItem('quote_requests') || '[]');
      const stored = storedQuotes.find(q => q.id === quote.id);
      this.assert(!!stored, 'QuoteRequest should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Book concrete driveway installation under $9,000 with >=3-year warranty
  testTask2_ConcreteDrivewayBookingUnderBudget() {
    const testName = 'Task 2: Concrete driveway booking under $9,000 with 3-year warranty';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Get all services and find the concrete driveways service
      const servicesOverview = this.logic.getAllServicesOverview();
      this.assert(Array.isArray(servicesOverview), 'Services overview should be array');

      const concreteEntry = servicesOverview.find(entry => entry.service && entry.service.service_type === 'concrete_driveways');
      this.assert(concreteEntry, 'Concrete driveways service should exist');

      const concreteServiceId = concreteEntry.service.id;

      // Get service details with packages
      const detail = this.logic.getServiceDetailWithPackages(concreteServiceId);
      this.assert(detail && Array.isArray(detail.packages), 'Service detail packages should load for concrete driveways');

      const targetSize = 600;
      const qualifying = detail.packages.filter(pw => {
        const pkg = pw.package;
        if (!pkg || !pkg.is_active) return false;
        const min = typeof pkg.recommended_min_size_sq_ft === 'number' ? pkg.recommended_min_size_sq_ft : -Infinity;
        const max = typeof pkg.recommended_max_size_sq_ft === 'number' ? pkg.recommended_max_size_sq_ft : Infinity;
        const sizeOk = targetSize >= min && targetSize <= max;
        const warrantyOk = typeof pkg.warranty_years === 'number' && pkg.warranty_years >= 3;
        const priceOk = typeof pkg.base_price === 'number' && pkg.base_price < 9000;
        return sizeOk && warrantyOk && priceOk;
      });

      this.assert(qualifying.length > 0, 'At least one concrete package should meet size, warranty, and price criteria');

      // Choose the cheapest qualifying package
      let chosenWrapper = null;
      for (const pw of qualifying) {
        if (!chosenWrapper || pw.package.base_price < chosenWrapper.package.base_price) {
          chosenWrapper = pw;
        }
      }
      const chosenPackage = chosenWrapper.package;

      // Start booking from selected package
      const startResult = this.logic.startBookingFromServicePackage(concreteServiceId, chosenPackage.id, 'service_page');
      this.assert(startResult && startResult.booking, 'Booking should start from concrete package');

      const booking = startResult.booking;
      this.assert(booking.service_id === concreteServiceId, 'Booking.service_id should match concrete service');
      this.assert(booking.service_package_id === chosenPackage.id, 'Booking.service_package_id should match chosen package');

      // Get booking form options for this service/package
      const formOptions = this.logic.getBookingFormOptions(concreteServiceId, chosenPackage.id);
      this.assert(formOptions && Array.isArray(formOptions.payment_method_options), 'Booking form options should contain payment methods');

      const paymentMethod = formOptions.payment_method_options.includes('credit_debit_card')
        ? 'credit_debit_card'
        : formOptions.payment_method_options[0];

      // Update booking details
      const updateResult = this.logic.updateCurrentBookingDetails({
        drivewaySizeSqFt: 600,
        sizeUnit: 'square_feet',
        paymentMethod: paymentMethod,
        billingOption: 'one_time',
        contactName: 'Alex Rivera',
        contactPhone: '555-0456',
        contactEmail: 'alex.rivera@example.com'
      });

      this.assert(updateResult && updateResult.booking, 'Booking should update successfully');
      const updated = updateResult.booking;
      this.assert(updated.driveway_size_sq_ft === 600, 'Booking.driveway_size_sq_ft should be 600');
      this.assert(updated.payment_method === paymentMethod, 'Payment method should be set');

      // Proceed to booking review/checkout summary
      const reviewSummary = this.logic.getBookingReviewSummary();
      this.assert(reviewSummary && reviewSummary.booking && reviewSummary.pricing_breakdown, 'Booking review summary should load');

      const reviewBooking = reviewSummary.booking;
      const pricing = reviewSummary.pricing_breakdown;

      this.assert(reviewBooking.service_package_id === chosenPackage.id, 'Review booking should reference chosen concrete package');
      this.assert(typeof pricing.total_price === 'number' && pricing.total_price > 0, 'Total price should be positive');
      this.assert(pricing.total_price < 9000, 'Total price should be under $9,000');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Cheapest sealing plan including crack filling and >=2-year warranty, 2-car driveway, next Saturday afternoon
  testTask3_CheapestSealingPlanWithCrackFilling() {
    const testName = 'Task 3: Cheapest sealing plan with crack filling & 2-year warranty';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Find driveway sealing service
      const servicesOverview = this.logic.getAllServicesOverview();
      this.assert(Array.isArray(servicesOverview), 'Services overview should be array');
      const sealingEntry = servicesOverview.find(entry => entry.service && entry.service.service_type === 'driveway_sealing');
      this.assert(sealingEntry, 'Driveway sealing service should exist');

      const sealingServiceId = sealingEntry.service.id;

      // Load sealing service detail and plans
      const detail = this.logic.getServiceDetailWithPackages(sealingServiceId);
      this.assert(detail && Array.isArray(detail.packages), 'Driveway sealing packages should load');

      // Filter plans that include crack filling and warranty >= 2 years
      const qualifying = detail.packages.filter(pw => {
        const pkg = pw.package;
        if (!pkg || !pkg.is_active) return false;
        const crackOk = pkg.includes_crack_filling === true;
        const warrantyOk = typeof pkg.warranty_years === 'number' && pkg.warranty_years >= 2;
        return crackOk && warrantyOk;
      });
      this.assert(qualifying.length > 0, 'There should be sealing plans with crack filling and >=2-year warranty');

      // Choose cheapest qualifying plan
      let chosenWrapper = null;
      for (const pw of qualifying) {
        if (!chosenWrapper || pw.package.base_price < chosenWrapper.package.base_price) {
          chosenWrapper = pw;
        }
      }
      const chosenPackage = chosenWrapper.package;

      // Start booking for selected sealing plan
      const startResult = this.logic.startBookingFromServicePackage(sealingServiceId, chosenPackage.id, 'service_page');
      this.assert(startResult && startResult.booking, 'Sealing booking should start');

      const booking = startResult.booking;
      this.assert(booking.service_package_id === chosenPackage.id, 'Booking should reference chosen sealing plan');

      // Get booking form options and scheduling constraints
      const formOptions = this.logic.getBookingFormOptions(sealingServiceId, chosenPackage.id);
      this.assert(formOptions && formOptions.scheduling_constraints, 'Booking form options should include scheduling constraints');

      const sched = formOptions.scheduling_constraints;
      const earliestDateStr = sched.earliest_date;
      const latestDateStr = sched.latest_date || earliestDateStr;
      this.assert(earliestDateStr, 'Earliest booking date should be defined');

      // Find next Saturday afternoon slot using availability
      const availability = this.logic.getServiceAvailability('driveway_sealing', earliestDateStr, latestDateStr);
      this.assert(Array.isArray(availability), 'Availability list should be array');

      let selectedDate = null;
      let selectedSlot = null;
      let matchedSaturdayAfternoon = false;

      // Try to find earliest Saturday with afternoon (>=12:00) slot
      for (const day of availability) {
        const slots = Array.isArray(day.time_slots) ? day.time_slots.filter(s => s.is_available) : [];
        if (!slots.length) continue;
        const dateObj = new Date(day.date);
        const dayOfWeek = dateObj.getUTCDay(); // 6 = Saturday

        if (dayOfWeek === 6) {
          const afternoonSlots = slots.filter(s => s.start >= '12:00');
          if (afternoonSlots.length) {
            afternoonSlots.sort((a, b) => a.start.localeCompare(b.start));
            selectedDate = day.date;
            selectedSlot = afternoonSlots[0];
            matchedSaturdayAfternoon = true;
            break;
          }
        }

        // Fallback: remember first available slot in case no Saturday afternoon exists
        if (!selectedDate) {
          selectedDate = day.date;
          selectedSlot = slots[0];
        }
      }

      this.assert(selectedDate && selectedSlot, 'Should find at least one available time slot for sealing');

      // Choose driveway category: 2-car
      const drivewayCategoryOptions = Array.isArray(formOptions.driveway_category_options)
        ? formOptions.driveway_category_options
        : ['single_car', 'two_car', 'three_car', 'other'];
      const drivewayCategory = drivewayCategoryOptions.includes('two_car') ? 'two_car' : drivewayCategoryOptions[0];

      // Update booking with size/category, schedule, and contact details
      const updateResult = this.logic.updateCurrentBookingDetails({
        drivewayCategory: drivewayCategory,
        scheduledDate: selectedDate,
        timeSlotStart: selectedSlot.start,
        timeSlotEnd: selectedSlot.end,
        paymentMethod: 'credit_debit_card',
        billingOption: 'one_time',
        contactName: 'Morgan Lee',
        contactPhone: '555-0789',
        contactEmail: 'morgan.lee@example.com'
      });

      this.assert(updateResult && updateResult.booking, 'Sealing booking update should succeed');
      const updated = updateResult.booking;
      this.assert(updated.driveway_category === drivewayCategory, 'Driveway category should be set on booking');

      if (matchedSaturdayAfternoon) {
        const dateObj = new Date(updated.scheduled_date);
        const dayOfWeek = dateObj.getUTCDay();
        this.assert(dayOfWeek === 6, 'Scheduled date should be a Saturday');
        this.assert(updated.time_slot_start >= '12:00', 'Time slot should be afternoon (>= 12:00)');
      }

      // Finalize booking (schedule service)
      const finalizeResult = this.logic.finalizeCurrentBooking();
      this.assert(finalizeResult && finalizeResult.success === true, 'Finalizing sealing booking should succeed');
      const finalBooking = finalizeResult.booking;
      this.assert(finalBooking.status === 'pending_review' || finalBooking.status === 'confirmed', 'Final booking status should be pending_review or confirmed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Save three asphalt driveway projects (400–800 sq ft, last 2 years) to favorites
  testTask4_SaveThreeAsphaltProjectsToFavorites() {
    const testName = 'Task 4: Save three similar asphalt projects from gallery';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Get gallery filter options
      const filterOptions = this.logic.getProjectFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.surface_type_options), 'Project filter options should load');

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      // Filter asphalt projects between 400 and 800 sq ft completed within last 2 years
      const projects = this.logic.getProjects({
        surfaceType: 'asphalt',
        minSizeSqFt: 400,
        maxSizeSqFt: 800,
        completedAfter: twoYearsAgo.toISOString()
      });

      this.assert(Array.isArray(projects) && projects.length > 0, 'Asphalt projects in size range should exist');

      const toSave = projects.slice(0, 3); // up to three
      const savedIds = [];

      for (const proj of toSave) {
        // Open project detail
        const detail = this.logic.getProjectDetail(proj.id);
        this.assert(detail && detail.project, 'Project detail should load');
        const p = detail.project;

        this.assert(p.surface_type === 'asphalt', 'Project surface_type should be asphalt');
        this.assert(p.size_sq_ft >= 400 && p.size_sq_ft <= 800, 'Project size should be between 400 and 800 sq ft');

        const completion = new Date(p.completion_date);
        this.assert(completion >= twoYearsAgo, 'Project should be completed within last 2 years (relative)');

        // Save to favorites
        const favResult = this.logic.addProjectToFavorites(p.id);
        this.assert(favResult && favResult.favoriteProjects, 'FavoriteProjects record should be returned when adding project');
        savedIds.push(p.id);
      }

      // Verify favorites list contains saved projects
      const favList = this.logic.getFavoriteProjects();
      this.assert(favList && favList.favoriteProjects && Array.isArray(favList.projects), 'Favorites page data should load');

      for (const id of savedIds) {
        const inIds = favList.favoriteProjects.project_ids.includes(id);
        this.assert(inIds, 'Saved project id should be in favoriteProjects.project_ids');
        const inProjects = favList.projects.some(p => p.id === id);
        this.assert(inProjects, 'Saved project object should be in favorites projects array');
      }

      // Also verify via localStorage
      const rawFav = localStorage.getItem('favorite_projects') || '[]';
      const favRecords = JSON.parse(rawFav);
      if (Array.isArray(favRecords) && favRecords.length) {
        const favRecord = favRecords[0];
        for (const id of savedIds) {
          this.assert(favRecord.project_ids.includes(id), 'Saved project should exist in stored favorite_projects record');
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Check coverage for ZIP 30301 and submit service area inquiry if not served
  testTask5_CheckZipCoverageAndRequestException() {
    const testName = 'Task 5: Check ZIP coverage and request exception for 30301';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Open service area page summary
      const areaSummary = this.logic.getServiceAreaPageSummary();
      this.assert(areaSummary && Array.isArray(areaSummary.served_zip_areas), 'Service area summary should load');

      // Check coverage for 30301
      const coverageResult = this.logic.checkZipCoverage('30301');
      this.assert(coverageResult && coverageResult.searched_zip === '30301', 'Coverage check should echo searched ZIP');

      const isServed = coverageResult.is_served;
      const nearestZipArea = coverageResult.nearest_served_zip_area;
      const nearestServiceArea = coverageResult.nearest_service_area;

      if (!isServed) {
        this.assert(nearestZipArea && nearestZipArea.is_served === true, 'Nearest served ZIP should be provided and served');
      }

      // Optionally get details for nearest service area (simulating clicking area link)
      if (nearestServiceArea && nearestServiceArea.id) {
        const areaDetail = this.logic.getServiceAreaDetail(nearestServiceArea.id);
        this.assert(areaDetail && areaDetail.service_area && Array.isArray(areaDetail.zip_areas), 'Service area detail should load');
      }

      // Submit service area inquiry asking about extending service to 30301
      const nearestZipCode = nearestZipArea ? nearestZipArea.zip_code : undefined;
      const serviceAreaId = nearestServiceArea ? nearestServiceArea.id : undefined;

      const message = `Hi, can you provide driveway and paving services in ZIP 30301? The nearest served ZIP I saw was ${nearestZipCode || 'N/A'}.`;

      const inquiryResult = this.logic.submitServiceAreaInquiry(
        '30301',                 // searchedZipCode
        nearestZipCode,          // nearestServedZipCode
        serviceAreaId,           // serviceAreaId
        'Taylor Green',          // name
        'taylor.green@example.com', // email
        '555-0990',              // phone
        message                  // message
      );

      this.assert(inquiryResult && inquiryResult.success === true, 'Service area inquiry submission should succeed');
      const inquiry = inquiryResult.serviceAreaInquiry;
      this.assert(inquiry && inquiry.searched_zip_code === '30301', 'Inquiry should record searched ZIP 30301');

      // Verify persisted inquiry
      const storedRaw = localStorage.getItem('service_area_inquiries') || '[]';
      const storedInquiries = JSON.parse(storedRaw);
      const stored = storedInquiries.find(i => i.id === inquiry.id);
      this.assert(!!stored, 'ServiceAreaInquiry should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Apply a 15%+ promo code for a 500+ sq ft project during booking
  testTask6_ApplyPromoCodeForLargeProject() {
    const testName = 'Task 6: Apply 15%+ promo code for 550 sq ft project';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Find active promotions with at least 15% discount and min project size <= 500 for concrete_driveways
      const promos = this.logic.getActivePromotions({
        minDiscountPercent: 15,
        maxMinProjectSizeSqFt: 500,
        serviceType: 'concrete_driveways',
        onlyActive: true
      });
      this.assert(Array.isArray(promos) && promos.length > 0, 'There should be at least one qualifying promotion');

      // Choose promo with highest discount_percent
      let chosenPromo = null;
      for (const promo of promos) {
        if (!chosenPromo) {
          chosenPromo = promo;
        } else {
          const curr = promo.discount_percent || 0;
          const best = chosenPromo.discount_percent || 0;
          if (curr > best) chosenPromo = promo;
        }
      }
      this.assert(chosenPromo && chosenPromo.code, 'Chosen promotion should have a code');

      const promoCode = chosenPromo.code;

      // Identify concrete driveway service id
      const servicesOverview = this.logic.getAllServicesOverview();
      const concreteEntry = servicesOverview.find(entry => entry.service && entry.service.service_type === 'concrete_driveways');
      this.assert(concreteEntry, 'Concrete driveways service should be available');
      const concreteServiceId = concreteEntry.service.id;

      // Start a general booking for concrete driveways from promotions page
      const startResult = this.logic.startBookingForService(concreteServiceId, 'promotions_page');
      this.assert(startResult && startResult.booking, 'Booking should start for concrete service from promotions page');

      const booking = startResult.booking;
      this.assert(booking.service_id === concreteServiceId, 'Booking.service_id should match concrete service');

      // Set project size 550 sq ft and contact details
      const updateResult = this.logic.updateCurrentBookingDetails({
        drivewaySizeSqFt: 550,
        sizeUnit: 'square_feet',
        paymentMethod: 'credit_debit_card',
        billingOption: 'one_time',
        contactName: 'Jamie Ortiz',
        contactPhone: '555-0678',
        contactEmail: 'jamie.ortiz@example.com'
      });
      this.assert(updateResult && updateResult.booking, 'Booking should update with size and contact info');

      const updated = updateResult.booking;
      this.assert(updated.driveway_size_sq_ft === 550, 'Booking size should be 550 sq ft');

      // Apply promo code on booking summary
      const applyResult = this.logic.applyPromoCodeToCurrentBooking(promoCode);
      this.assert(applyResult && applyResult.success === true, 'Applying promo code should succeed');

      const updatedBookingWithPromo = applyResult.booking;
      const appliedPromotion = applyResult.promotion;

      this.assert(updatedBookingWithPromo.applied_promo_code === promoCode, 'Booking should store applied promo code');
      this.assert(appliedPromotion && appliedPromotion.code === promoCode, 'Returned promotion should match applied code');

      // Get booking review summary and verify discount applied
      const reviewSummary = this.logic.getBookingReviewSummary();
      this.assert(reviewSummary && reviewSummary.pricing_breakdown, 'Booking review summary should be available after applying promo');

      const pricing = reviewSummary.pricing_breakdown;
      this.assert(pricing.promo_code === promoCode, 'Pricing breakdown should reference promo code');
      if (appliedPromotion.discount_type === 'percent') {
        this.assert(pricing.promo_discount_percent >= 15, 'Discount percent should be at least 15%');
      }
      this.assert(typeof pricing.discount_amount === 'number' && pricing.discount_amount > 0, 'Discount amount should be positive');
      this.assert(pricing.total_price < pricing.subtotal_price, 'Total price should be less than subtotal after discount');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Request estimate from highest-rated asphalt replacement crew (adapted to available data)
  testTask7_RequestEstimateFromTopAsphaltCrew() {
    const testName = 'Task 7: Request estimate from top-rated asphalt replacement crew';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Get crew filter options
      const crewFilterOptions = this.logic.getCrewFilterOptions();
      this.assert(crewFilterOptions && Array.isArray(crewFilterOptions.service_type_options), 'Crew filter options should load');

      // List crews for asphalt driveway replacement, sorted by rating high to low
      const crews = this.logic.getCrewList({
        serviceType: 'asphalt_driveway_replacement',
        minRating: 4.5,
        minReviewCount: 1
      }, 'rating_desc');

      this.assert(Array.isArray(crews) && crews.length > 0, 'There should be at least one asphalt replacement crew with rating >= 4.5');

      // Choose the first crew that meets rating and review count criteria
      let chosenCrew = null;
      for (const crew of crews) {
        if (crew.overall_rating >= 4.5 && crew.review_count >= 1) {
          chosenCrew = crew;
          break;
        }
      }
      // Fallback to top result if strict filter doesn't find one
      if (!chosenCrew) {
        chosenCrew = crews[0];
      }

      this.assert(chosenCrew && chosenCrew.id, 'Chosen crew should have an id');

      // Load crew detail
      const crewDetail = this.logic.getCrewDetail(chosenCrew.id);
      this.assert(crewDetail && crewDetail.crew, 'Crew detail should load');

      // Submit estimate request for asphalt driveway replacement, ~650 sq ft
      const estimateResult = this.logic.submitEstimateRequestForCrew(
        chosenCrew.id,               // crewId
        'asphalt_driveway_replacement', // serviceType
        650,                         // drivewaySizeSqFt
        'square_feet',               // sizeUnit
        'Riley Chen',                // contactName
        '555-0345',                  // contactPhone
        'riley.chen@example.com',    // contactEmail
        'Looking to replace an aging asphalt driveway (approx. 650 sq ft).' // message
      );

      this.assert(estimateResult && estimateResult.success === true, 'Estimate request submission should succeed');
      const estimate = estimateResult.estimateRequest;
      this.assert(estimate && estimate.crew_id === chosenCrew.id, 'EstimateRequest should reference chosen crew');
      this.assert(estimate.service_type === 'asphalt_driveway_replacement', 'Service type on estimate should match requested');

      // Verify persisted estimate request
      const storedRaw = localStorage.getItem('estimate_requests') || '[]';
      const storedEstimates = JSON.parse(storedRaw);
      const stored = storedEstimates.find(e => e.id === estimate.id);
      this.assert(!!stored, 'EstimateRequest should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Sign up for seasonal snow removal plan under $600 with up to 20 visits, 50 ft driveway, pay per season
  testTask8_SignupSeasonalSnowRemovalPlan() {
    const testName = 'Task 8: Seasonal snow removal plan under $600 with up to 20 visits';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary, 'Homepage summary should load');

      // Get all services and find snow removal
      const servicesOverview = this.logic.getAllServicesOverview();
      this.assert(Array.isArray(servicesOverview), 'Services overview should be array');

      const snowEntry = servicesOverview.find(entry => entry.service && entry.service.service_type === 'snow_removal');
      this.assert(snowEntry, 'Snow removal service should exist');
      const snowServiceId = snowEntry.service.id;

      // Get snow removal service details and seasonal plans
      const detail = this.logic.getServiceDetailWithPackages(snowServiceId);
      this.assert(detail && Array.isArray(detail.packages), 'Snow removal packages should load');

      // Identify seasonal plans with up to 20 visits and price under $600, supporting 50 ft driveway
      const targetLength = 50;
      const qualifying = detail.packages.filter(pw => {
        const pkg = pw.package;
        if (!pkg || !pkg.is_active) return false;
        const isSeasonal = pkg.package_type === 'seasonal_plan';
        if (!isSeasonal) return false;
        const visitsOk = typeof pkg.max_visits === 'number' && pkg.max_visits <= 20;
        const lengthOk = typeof pkg.max_driveway_length_ft === 'number' ? pkg.max_driveway_length_ft >= targetLength : true;
        const priceOk = typeof pkg.base_price === 'number' && pkg.base_price < 600;
        return visitsOk && lengthOk && priceOk;
      });

      this.assert(qualifying.length > 0, 'There should be at least one seasonal snow plan under $600 with up to 20 visits');

      // Choose cheapest qualifying plan
      let chosenWrapper = null;
      for (const pw of qualifying) {
        if (!chosenWrapper || pw.package.base_price < chosenWrapper.package.base_price) {
          chosenWrapper = pw;
        }
      }
      const chosenPackage = chosenWrapper.package;

      // Start booking for selected snow removal plan
      const startResult = this.logic.startBookingFromServicePackage(snowServiceId, chosenPackage.id, 'service_page');
      this.assert(startResult && startResult.booking, 'Snow removal booking should start');

      const booking = startResult.booking;
      this.assert(booking.service_package_id === chosenPackage.id, 'Booking should reference chosen snow plan');

      // Get booking form options and determine billing option
      const formOptions = this.logic.getBookingFormOptions(snowServiceId, chosenPackage.id);
      this.assert(formOptions && Array.isArray(formOptions.billing_option_options), 'Booking form should include billing options');

      const billingOption = formOptions.billing_option_options.includes('per_season')
        ? 'per_season'
        : formOptions.billing_option_options[0];

      // Update booking with driveway length and billing option
      const updateResult = this.logic.updateCurrentBookingDetails({
        drivewayLengthFt: 50,
        sizeUnit: 'feet',
        billingOption: billingOption,
        paymentMethod: 'credit_debit_card',
        contactName: 'Pat Morgan',
        contactPhone: '555-0112',
        contactEmail: 'pat.morgan@example.com'
      });

      this.assert(updateResult && updateResult.booking, 'Snow removal booking should update');
      const updated = updateResult.booking;
      this.assert(updated.driveway_length_ft === 50, 'Driveway length should be 50 ft');
      this.assert(updated.billing_option === billingOption, 'Billing option should be set on booking');

      // Finalize enrollment
      const finalizeResult = this.logic.finalizeCurrentBooking();
      this.assert(finalizeResult && finalizeResult.success === true, 'Finalizing snow removal plan should succeed');
      const finalBooking = finalizeResult.booking;
      this.assert(finalBooking.status === 'pending_review' || finalBooking.status === 'confirmed', 'Snow removal booking status should be pending_review or confirmed');

      // Verify price under $600
      const reviewSummary = this.logic.getBookingReviewSummary();
      if (reviewSummary && reviewSummary.pricing_breakdown) {
        const pricing = reviewSummary.pricing_breakdown;
        this.assert(pricing.total_price < 600, 'Snow removal total price should be under $600');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Helper methods ----------

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

// Export for Node.js ONLY
module.exports = TestRunner;
