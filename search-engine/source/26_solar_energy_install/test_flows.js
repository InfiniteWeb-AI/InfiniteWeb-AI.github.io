/*
 * Test runner for business logic - solar energy installation services website
 * Flows cover tasks 1-8 using the provided interfaces and data models.
 */

class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is expected to be provided by the environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure in business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      articles: [
        {
          id: 'article_fed_itc_2026_update',
          title: '2026 Federal Solar Tax Credit Guide: What Homeowners Need to Know',
          slug: '2026-federal-solar-tax-credit-guide',
          summary:
            'A up-to-date overview of the federal solar Investment Tax Credit (ITC) for 2026, including eligibility, credit amounts, and how to claim it.',
          content:
            'The Federal Solar Investment Tax Credit (ITC) remains one of the most powerful incentives for homeowners considering solar in 2026. In this guide, we cover who qualifies, how the percentage credit works, how it interacts with state incentives, and what documentation you need when filing your federal tax return. We also discuss timelines, including when projects must begin construction and be placed in service to qualify for a given tax year...',
          category: 'incentives',
          tags: [
            'federal solar tax credit',
            'itc',
            'residential solar',
            'incentives 2026',
            'policy'
          ],
          published_at: '2026-02-10T10:00:00Z',
          is_published: true,
          url: 'blog/federal-solar-tax-credit-2026-guide.html'
        },
        {
          id: 'article_fed_itc_2025_changes',
          title: 'Federal Solar Tax Credit Changes in 2025: Timeline and Phaseouts',
          slug: 'federal-solar-tax-credit-2025-changes',
          summary:
            'Learn how the federal solar tax credit is scheduled to change through 2025 and what that means for your installation timeline.',
          content:
            'The federal solar tax credit has a defined schedule set by recent legislation. In 2025, certain step-downs take effect for some project types while residential projects maintain a stable percentage. In this article we outline the official IRS guidance, project start and completion rules, and how commercial, residential, and nonprofit projects are each affected...',
          category: 'incentives',
          tags: ['federal solar tax credit', 'itc', 'timeline', 'incentives 2025'],
          published_at: '2025-11-05T15:30:00Z',
          is_published: true,
          url: 'blog/federal-solar-tax-credit-2025-changes.html'
        },
        {
          id: 'article_itc_step_by_step',
          title: 'How to Claim the Federal Solar Tax Credit Step by Step',
          slug: 'how-to-claim-federal-solar-tax-credit',
          summary:
            'A practical walkthrough of the forms and documentation needed to claim the federal solar tax credit on your tax return.',
          content:
            'Claiming the federal solar tax credit requires a few key forms and documents. We break down Form 5695, how to calculate your credit amount, what qualifies as eligible costs, and how carryovers work if your tax liability is lower than the credit in the first year...',
          category: 'incentives',
          tags: ['federal solar tax credit', 'tax filing', 'itc', 'residential solar'],
          published_at: '2025-08-22T09:15:00Z',
          is_published: true,
          url: 'blog/how-to-claim-federal-solar-tax-credit.html'
        }
      ],
      battery_options: [
        {
          id: 'battery_10_kwh_lfp_dc',
          name: 'HomeReserve 10 kWh LFP (DC-Coupled)',
          capacity_kwh: 10,
          chemistry: 'Lithium iron phosphate (LFP)',
          is_dc_coupled: true,
          warranty_years: 10,
          status: 'active'
        },
        {
          id: 'battery_13_5_kwh_nmc_ac',
          name: 'PowerHub 13.5 kWh NMC (AC-Coupled)',
          capacity_kwh: 13.5,
          chemistry: 'Lithium nickel manganese cobalt (NMC)',
          is_dc_coupled: false,
          warranty_years: 10,
          status: 'active'
        },
        {
          id: 'battery_5_kwh_entry',
          name: 'EcoStore 5 kWh Entry Battery',
          capacity_kwh: 5,
          chemistry: 'Lithium iron phosphate (LFP)',
          is_dc_coupled: true,
          warranty_years: 7,
          status: 'active'
        }
      ],
      consultation_slots: [
        {
          id: 'slot_2026_03_02_virtual_1000',
          consultation_type: 'virtual',
          start_datetime: '2026-03-02T10:00:00Z',
          end_datetime: '2026-03-02T10:30:00Z',
          is_weekday: true,
          is_available: false,
          notes: 'Fully booked'
        },
        {
          id: 'slot_2026_03_03_virtual_0900',
          consultation_type: 'virtual',
          start_datetime: '2026-03-03T09:00:00Z',
          end_datetime: '2026-03-03T09:30:00Z',
          is_weekday: true,
          is_available: false,
          notes: 'Held for internal training'
        },
        {
          id: 'slot_2026_03_04_virtual_1000',
          consultation_type: 'virtual',
          start_datetime: '2026-03-04T10:00:00Z',
          end_datetime: '2026-03-04T10:30:00Z',
          is_weekday: true,
          is_available: true,
          notes: 'Standard residential virtual consultation slot'
        }
      ],
      financing_options: [
        {
          id: 'finance_solar_loan_15y_3_5',
          name: 'BrightHome 15-Year Solar Loan',
          provider_name: 'Sunrise Capital',
          financing_type: 'loan',
          apr: 3.5,
          term_years: 15,
          min_project_cost: 5000,
          max_project_cost: 80000,
          min_credit_score: 670,
          max_credit_score: 850,
          requires_upfront_payment: true,
          typical_upfront_percent: 10,
          notes: 'Designed for residential systems; no prepayment penalties.',
          is_active: true
        },
        {
          id: 'finance_solar_loan_15y_4_2_lowdown',
          name: 'EcoSaver 15-Year Low-Down Loan',
          provider_name: 'GreenLeaf Financing',
          financing_type: 'loan',
          apr: 4.2,
          term_years: 15,
          min_project_cost: 10000,
          max_project_cost: 60000,
          min_credit_score: 660,
          max_credit_score: 820,
          requires_upfront_payment: true,
          typical_upfront_percent: 5,
          notes: 'Lower upfront out-of-pocket with slightly higher APR.',
          is_active: true
        },
        {
          id: 'finance_solar_loan_20y_4_5_zero_down',
          name: 'SolarFlex 20-Year Zero-Down Loan',
          provider_name: 'Helio Finance',
          financing_type: 'loan',
          apr: 4.5,
          term_years: 20,
          min_project_cost: 12000,
          max_project_cost: 100000,
          min_credit_score: 680,
          max_credit_score: 840,
          requires_upfront_payment: false,
          typical_upfront_percent: 0,
          notes: 'Zero-down option with extended term for lower monthly payments.',
          is_active: true
        }
      ],
      installers: [
        {
          id: 'installer_sunrise_solar_atl',
          name: 'Sunrise Solar & Roofing Atlanta',
          overall_rating: 4.9,
          review_count: 164,
          distance_miles: 8.5,
          primary_zip: '30303',
          service_radius_miles: 60,
          phone: '404-555-0172',
          email: 'info@sunrisesolaratl.com',
          website_url: 'https://www.sunrisesolaratl.com',
          certifications: [
            'NABCEP PV Installation Professional',
            'Licensed Electrical Contractor GA'
          ],
          years_in_business: 11,
          is_active: true
        },
        {
          id: 'installer_peachtree_renewables',
          name: 'Peachtree Renewables',
          overall_rating: 4.8,
          review_count: 102,
          distance_miles: 12.3,
          primary_zip: '30312',
          service_radius_miles: 50,
          phone: '404-555-0284',
          email: 'hello@peachtreerenewables.com',
          website_url: 'https://www.peachtreerenewables.com',
          certifications: ['NABCEP PV Technical Sales', 'Enphase Gold Installer'],
          years_in_business: 8,
          is_active: true
        },
        {
          id: 'installer_metro_solar_solutions',
          name: 'Metro Solar Solutions',
          overall_rating: 4.6,
          review_count: 53,
          distance_miles: 24.9,
          primary_zip: '30339',
          service_radius_miles: 40,
          phone: '770-555-0933',
          email: 'projects@metrosolarsolutions.com',
          website_url: 'https://www.metrosolarsolutions.com',
          certifications: ['NABCEP PV Installation Professional'],
          years_in_business: 6,
          is_active: true
        }
      ],
      panel_models: [
        {
          id: 'panel_400w_premium_mono',
          name: '400W Premium Mono',
          manufacturer: 'HelioTech',
          wattage: 400,
          efficiency_percent: 21.2,
          warranty_years: 25,
          is_premium: true,
          status: 'active'
        },
        {
          id: 'panel_400w_value_mono',
          name: '400W Value Mono',
          manufacturer: 'SunPeak',
          wattage: 400,
          efficiency_percent: 20.1,
          warranty_years: 20,
          is_premium: false,
          status: 'active'
        },
        {
          id: 'panel_350w_poly_basic',
          name: '350W Poly Basic',
          manufacturer: 'BrightCell',
          wattage: 350,
          efficiency_percent: 18.4,
          warranty_years: 20,
          is_premium: false,
          status: 'active'
        }
      ],
      solar_packages: [
        {
          id: 'pkg_res_4_starter_350w',
          name: '4.2 kW Starter Residential Package (350W Poly)',
          description:
            'Entry-level 4.2 kW system using reliable 350W polycrystalline panels, ideal for smaller homes with modest usage.',
          system_type: 'residential',
          system_size_kw: 4.2,
          total_price: 8800,
          panel_warranty_years: 20,
          inverter_type: 'string_inverter',
          included_battery: false,
          battery_capacity_kwh: 0,
          panel_model_id: 'panel_350w_poly_basic',
          panel_count: 12,
          status: 'active',
          created_at: '2024-05-15T10:00:00Z'
        },
        {
          id: 'pkg_res_5_economy_400w_value',
          name: '5.2 kW Economy Residential Package (400W Value)',
          description:
            'Cost-effective 5.2 kW package using 400W value monocrystalline panels, great for households with $100\u0011$150 monthly bills.',
          system_type: 'residential',
          system_size_kw: 5.2,
          total_price: 10500,
          panel_warranty_years: 20,
          inverter_type: 'string_inverter',
          included_battery: false,
          battery_capacity_kwh: 0,
          panel_model_id: 'panel_400w_value_mono',
          panel_count: 13,
          status: 'active',
          created_at: '2024-07-01T09:30:00Z'
        },
        {
          id: 'pkg_res_6_value_400w',
          name: '6.0 kW Value Residential Package (400W Mono)',
          description:
            'Popular 6.0 kW residential system with 400W value monocrystalline panels and a high-efficiency string inverter. Optimized for homes with roughly $130\u0011$180 monthly electric bills.',
          system_type: 'residential',
          system_size_kw: 6,
          total_price: 12950,
          panel_warranty_years: 20,
          inverter_type: 'string_inverter',
          included_battery: false,
          battery_capacity_kwh: 0,
          panel_model_id: 'panel_400w_value_mono',
          panel_count: 15,
          status: 'active',
          created_at: '2024-09-10T14:20:00Z'
        }
      ]
    };

    if (typeof localStorage === 'undefined' || !localStorage.setItem) {
      throw new Error('localStorage is not available in this environment');
    }

    // Populate localStorage using storage keys from Storage Key Mapping
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('battery_options', JSON.stringify(generatedData.battery_options));
    localStorage.setItem('consultation_slots', JSON.stringify(generatedData.consultation_slots));
    localStorage.setItem('financing_options', JSON.stringify(generatedData.financing_options));
    localStorage.setItem('installers', JSON.stringify(generatedData.installers));
    localStorage.setItem('panel_models', JSON.stringify(generatedData.panel_models));
    localStorage.setItem('solar_packages', JSON.stringify(generatedData.solar_packages));

    // Initialize empty collections for entities that will be created during flows
    const emptyCollections = [
      'quote_requests',
      'quote_plans',
      'saved_quotes',
      'consultation_appointments',
      'saved_articles',
      'savings_scenarios',
      'installer_contacts',
      'system_designs',
      'financing_comparisons',
      'financing_quote_results',
      'financing_pre_applications'
    ];

    emptyCollections.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_Get5kWQuoteUnder120AndSave();
    this.testTask2_SelectResidentialPackageUnder15000Warranty20();
    this.testTask3_BookEarliestWeekday10amVirtualConsultation();
    this.testTask4_SaveMostRecentFederalTaxCreditArticle();
    this.testTask5_CreateSavingsScenarioWith1500PlusAnnualSavings();
    this.testTask6_ContactTopRatedInstallerWithin25Miles();
    this.testTask7_DesignResidentialSystem16x400WWithBattery();
    this.testTask8_ChooseFinancingOptionAndSavePreApplication();

    return this.results;
  }

  // Task 1: Get a 5kW residential quote with monthly payment under $120 and save it
  testTask1_Get5kWQuoteUnder120AndSave() {
    const testName = 'Task 1: Get 5kW residential quote under $120/month and save it';
    console.log('Running:', testName);

    try {
      // Simulate navigating to homepage and opening quote form
      if (typeof this.logic.getHomePageContent === 'function') {
        const home = this.logic.getHomePageContent();
        this.assert(home && home.primaryActions, 'Homepage content should be available');
      }

      // Get quote form options (property types, system size options)
      const formOptions = this.logic.getQuoteFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.propertyTypeOptions), 'Quote form options should include property types');

      const residentialOption = formOptions.propertyTypeOptions.find((opt) => opt.value === 'residential');
      this.assert(!!residentialOption, 'Residential property type option should exist');

      // Create QuoteRequest and generate plans
      const zipCode = '94110';
      const propertyType = 'residential';
      const roofAreaSqft = 1200;
      const averageMonthlyBill = 150;
      const desiredSystemSizeKw = 5;

      const result = this.logic.createQuoteRequestAndGeneratePlans(
        zipCode,
        propertyType,
        roofAreaSqft,
        averageMonthlyBill,
        desiredSystemSizeKw,
        null
      );

      this.assert(result && result.quoteRequest, 'Quote request should be created');
      this.assert(Array.isArray(result.plans), 'Quote plans should be returned');

      const quoteRequest = result.quoteRequest;
      const initialPlans = result.plans;

      this.assert(quoteRequest.zip_code === zipCode, 'QuoteRequest zip code should match input');
      this.assert(quoteRequest.property_type === propertyType, 'QuoteRequest property_type should match input');

      // Fetch plans again with explicit sort by monthly payment ascending
      const plansResponse = this.logic.getQuotePlansForRequest(
        quoteRequest.id,
        'monthly_payment',
        'asc'
      );

      this.assert(plansResponse && Array.isArray(plansResponse.plans), 'Sorted plans should be returned');
      const plans = plansResponse.plans;
      this.assert(plans.length > 0, 'At least one plan should be generated');

      // Verify sort direction by monthly payment
      for (let i = 1; i < plans.length; i++) {
        this.assert(
          plans[i].estimated_monthly_payment >= plans[i - 1].estimated_monthly_payment,
          'Plans should be sorted by monthly payment ascending'
        );
      }

      // Choose first plan with estimated monthly payment under $120
      const targetPlan = plans.find((p) => p.estimated_monthly_payment < 120);
      this.assert(targetPlan, 'There should be a plan with monthly payment under $120');

      // Get plan detail
      const planDetail = this.logic.getQuotePlanDetail(targetPlan.id);
      this.assert(planDetail && planDetail.plan, 'QuotePlan detail should be returned');
      this.assert(planDetail.plan.id === targetPlan.id, 'Plan detail ID should match selected plan');
      if (planDetail.quoteRequest) {
        this.assert(
          planDetail.quoteRequest.id === quoteRequest.id,
          'Plan detail should reference originating QuoteRequest'
        );
      }

      // Save the selected quote plan to list
      const nickname = '5kW under $120';
      const saveResult = this.logic.saveQuotePlanToList(targetPlan.id, nickname);
      this.assert(saveResult && saveResult.savedQuote, 'Saving quote should return SavedQuote');

      const savedQuote = saveResult.savedQuote;
      this.assert(savedQuote.quote_plan_id === targetPlan.id, 'SavedQuote should reference correct QuotePlan');
      this.assert(savedQuote.source_type === 'quote_tool', 'SavedQuote source_type should be quote_tool');
      if (savedQuote.quote_request_id) {
        this.assert(
          savedQuote.quote_request_id === quoteRequest.id,
          'SavedQuote quote_request_id should match QuoteRequest'
        );
      }

      // Verify SavedQuote persisted to localStorage
      const savedQuotesRaw = localStorage.getItem('saved_quotes') || '[]';
      const savedQuotes = JSON.parse(savedQuotesRaw);
      const stored = savedQuotes.find((sq) => sq.id === savedQuote.id);
      this.assert(!!stored, 'SavedQuote should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Select a 6–8 kW residential package under $15,000 with at least 20-year warranty and add to quote
  testTask2_SelectResidentialPackageUnder15000Warranty20() {
    const testName = 'Task 2: Select 6-8kW residential package under $15k with 20y warranty and add to quote';
    console.log('Running:', testName);

    try {
      // Get filter options to simulate opening Solar Packages page
      const filterOptions = this.logic.getSolarPackageFilterOptions();
      this.assert(filterOptions && filterOptions.systemTypeOptions, 'Solar package filter options should be available');

      // Search for residential packages in 6–8 kW range, sorted by total price low to high
      const searchResult = this.logic.searchSolarPackages(
        'residential', // systemType
        6, // minSystemSizeKw
        8, // maxSystemSizeKw
        undefined, // maxTotalPrice
        undefined, // minPanelWarrantyYears
        'total_price', // sortBy
        'asc' // sortDirection
      );

      this.assert(searchResult && Array.isArray(searchResult.packages), 'searchSolarPackages should return packages');
      const packages = searchResult.packages;
      this.assert(packages.length > 0, 'There should be at least one 6-8kW residential package');

      // Take first two packages (or fewer if less available)
      const candidates = packages.slice(0, 2);
      this.assert(candidates.length > 0, 'At least one candidate package should exist');

      // Load detail for each candidate and determine which meets criteria (<$15k, warranty >=20y)
      const detailedCandidates = candidates.map((pkg) => {
        const detail = this.logic.getSolarPackageDetail(pkg.id);
        this.assert(detail && detail.package, 'SolarPackage detail should be returned');
        this.assert(detail.package.id === pkg.id, 'Detail package ID should match');
        return detail;
      });

      const qualifying = detailedCandidates.filter((d) => {
        const p = d.package;
        return p.total_price < 15000 && p.panel_warranty_years >= 20;
      });

      // If neither of the first two qualified, broaden to all results while keeping the same criteria
      let chosenDetail;
      if (qualifying.length === 0) {
        const allDetailed = packages.map((pkg) => this.logic.getSolarPackageDetail(pkg.id));
        const allQualifying = allDetailed.filter((d) => {
          const p = d.package;
          return p.total_price < 15000 && p.panel_warranty_years >= 20;
        });
        this.assert(allQualifying.length > 0, 'At least one package should meet price and warranty criteria');
        // Choose cheapest among qualifying
        allQualifying.sort((a, b) => a.package.total_price - b.package.total_price);
        chosenDetail = allQualifying[0];
      } else if (qualifying.length === 1) {
        chosenDetail = qualifying[0];
      } else {
        // If both first two qualify, choose cheaper one
        qualifying.sort((a, b) => a.package.total_price - b.package.total_price);
        chosenDetail = qualifying[0];
      }

      const chosenPackage = chosenDetail.package;
      this.assert(chosenPackage.system_size_kw >= 6 && chosenPackage.system_size_kw <= 8, 'Chosen package size should be within 6-8kW');
      this.assert(chosenPackage.total_price < 15000, 'Chosen package total price should be under $15,000');
      this.assert(chosenPackage.panel_warranty_years >= 20, 'Chosen package warranty should be at least 20 years');

      // Add chosen package to quote list (generates QuotePlan and SavedQuote)
      const nickname = 'Selected 6-8kW package';
      const addResult = this.logic.addPackageToQuoteList(chosenPackage.id, nickname);
      this.assert(addResult && addResult.generatedPlan && addResult.savedQuote, 'addPackageToQuoteList should return generated plan and saved quote');

      const generatedPlan = addResult.generatedPlan;
      const savedQuote = addResult.savedQuote;

      this.assert(savedQuote.quote_plan_id === generatedPlan.id, 'SavedQuote should reference generated QuotePlan');
      this.assert(savedQuote.source_type === 'solar_package', 'SavedQuote source_type should be solar_package');
      this.assert(savedQuote.source_reference_id === chosenPackage.id, 'SavedQuote source_reference_id should be chosen package ID');

      // Verify QuotePlan fields are consistent with package
      this.assert(
        generatedPlan.system_size_kw === chosenPackage.system_size_kw,
        'Generated QuotePlan system size should match package size'
      );

      // Verify SavedQuote persisted
      const savedQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
      const stored = savedQuotes.find((sq) => sq.id === savedQuote.id);
      this.assert(!!stored, 'SavedQuote from package should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Book the earliest weekday 10:00 AM virtual consultation for ZIP 78704
  testTask3_BookEarliestWeekday10amVirtualConsultation() {
    const testName = 'Task 3: Book earliest weekday 10:00 AM virtual consultation for ZIP 78704';
    console.log('Running:', testName);

    try {
      // Simulate opening consultation booking page
      const bookingOptions = this.logic.getConsultationBookingOptions();
      this.assert(bookingOptions && bookingOptions.consultationTypeOptions, 'Consultation booking options should be available');

      const virtualOption = bookingOptions.consultationTypeOptions.find((opt) => opt.value === 'virtual');
      this.assert(!!virtualOption, 'Virtual consultation type should be available');

      // Get available virtual consultation slots (use a date range that covers pre-generated slots)
      const availability = this.logic.getConsultationAvailabilitySlots(
        'virtual',
        '2026-03-01',
        '2026-03-31'
      );

      this.assert(availability && Array.isArray(availability.slots), 'Consultation slots should be returned');

      // Filter to weekday, available, and 10:00 AM slots, then pick earliest
      const candidateSlots = availability.slots.filter((slot) => {
        if (!slot.is_weekday || !slot.is_available) return false;
        const dt = new Date(slot.start_datetime);
        const hours = dt.getUTCHours();
        const minutes = dt.getUTCMinutes();
        // Treat 10:00 in local time; since we only have sample data at 10:00Z, use 10:00Z for test
        return hours === 10 && minutes === 0;
      });

      this.assert(candidateSlots.length > 0, 'There should be at least one available weekday 10:00 AM slot');

      candidateSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const earliestSlot = candidateSlots[0];

      // Book the consultation using the selected slot
      const appointment = this.logic.bookConsultationAppointment(
        earliestSlot.id, // slotId
        null, // appointmentDatetime
        'virtual', // consultationType
        'residential', // propertyType (Home/Residential)
        '78704', // zipCode
        'Alex Rivera', // contactName
        '555-222-3344', // contactPhone
        'alex@example.com', // contactEmail
        null // notes
      );

      this.assert(appointment && appointment.id, 'Consultation appointment should be created');
      this.assert(appointment.consultation_type === 'virtual', 'Appointment consultation_type should be virtual');
      this.assert(appointment.property_type === 'residential', 'Appointment property_type should be residential');
      this.assert(appointment.zip_code === '78704', 'Appointment ZIP should be 78704');
      this.assert(appointment.slot_id === earliestSlot.id, 'Appointment slot_id should reference chosen slot');

      // Verify appointment persisted
      const appointments = JSON.parse(localStorage.getItem('consultation_appointments') || '[]');
      const storedAppointment = appointments.find((a) => a.id === appointment.id);
      this.assert(!!storedAppointment, 'ConsultationAppointment should be stored in localStorage');

      // Verify that the slot is no longer available, if logic updates slots
      const slotsAfter = JSON.parse(localStorage.getItem('consultation_slots') || '[]');
      const storedSlot = slotsAfter.find((s) => s.id === earliestSlot.id);
      if (storedSlot) {
        this.assert(storedSlot.is_available === false, 'Booked slot should be marked unavailable (if updated)');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Save the most recent federal solar tax credit article from the last 12 months
  testTask4_SaveMostRecentFederalTaxCreditArticle() {
    const testName = 'Task 4: Save most recent federal solar tax credit article from last 12 months';
    console.log('Running:', testName);

    try {
      // Simulate navigating to blog and viewing search options
      const searchFilterOptions = this.logic.getArticleSearchFilterOptions();
      this.assert(searchFilterOptions && searchFilterOptions.dateRangeOptions, 'Article search filter options should be available');

      // Search articles for federal solar tax credit, last 12 months, most recent first
      const searchResult = this.logic.searchArticles(
        'federal solar tax credit', // query
        'last_12_months', // dateRange
        undefined, // startDate
        undefined, // endDate
        undefined, // category
        'published_at', // sortBy
        'desc' // sortDirection
      );

      this.assert(searchResult && Array.isArray(searchResult.articles), 'searchArticles should return articles');
      const articles = searchResult.articles;
      this.assert(articles.length > 0, 'There should be at least one matching article');

      // Choose the first article whose title references the federal solar tax credit or tax credit
      const taxCreditArticle = articles.find((a) => {
        const titleLower = (a.title || '').toLowerCase();
        return (
          titleLower.includes('federal solar tax credit') ||
          titleLower.includes('solar tax credit') ||
          titleLower.includes('tax credit')
        );
      });

      this.assert(taxCreditArticle, 'Should find an article referencing the federal solar tax credit');

      // Load article detail
      const articleDetail = this.logic.getArticleDetail(taxCreditArticle.id);
      this.assert(articleDetail && articleDetail.id === taxCreditArticle.id, 'Article detail should match selected article');
      this.assert(articleDetail.is_published === true, 'Article should be published');

      // Save article to reading list with tag 'Incentives 2024'
      const saved = this.logic.saveArticleToReadingList(taxCreditArticle.id, ['Incentives 2024'], null);
      this.assert(saved && saved.id, 'SavedArticle should be returned');
      this.assert(saved.article_id === taxCreditArticle.id, 'SavedArticle article_id should match');
      if (saved.tags) {
        this.assert(
          saved.tags.includes('Incentives 2024'),
          'SavedArticle should include tag "Incentives 2024"'
        );
      }

      // Verify SavedArticle persisted
      const savedArticles = JSON.parse(localStorage.getItem('saved_articles') || '[]');
      const stored = savedArticles.find((sa) => sa.id === saved.id);
      this.assert(!!stored, 'SavedArticle should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Create a savings scenario with at least $1,500 estimated annual savings and save it
  testTask5_CreateSavingsScenarioWith1500PlusAnnualSavings() {
    const testName = 'Task 5: Create savings scenario with >= $1,500 estimated annual savings and save it';
    console.log('Running:', testName);

    try {
      // Simulate navigating to savings calculator
      const defaults = this.logic.getSavingsCalculatorDefaults();
      this.assert(defaults && defaults.roofOrientationOptions, 'Savings calculator defaults should be available');

      const zipCode = '85001';
      const monthlyBill = 200;
      const roofOrientation = 'south_facing';
      const shadingLevel = 'low_0_25';
      let systemSizeKw = 6;

      // Use calculator to find a system size that yields at least $1,500 annual savings
      const sizeRange = defaults.systemSizeRangeKw || { min: 1, max: 20, step: 1 };
      const maxSystemSize = sizeRange.max || 20;
      let estimatedAnnualSavings = 0;
      let estimateResult = null;

      while (systemSizeKw <= maxSystemSize) {
        estimateResult = this.logic.calculateSavingsEstimate(
          zipCode,
          monthlyBill,
          roofOrientation,
          shadingLevel,
          systemSizeKw
        );

        this.assert(
          estimateResult && typeof estimateResult.estimatedAnnualSavings === 'number',
          'Savings estimate should return estimatedAnnualSavings'
        );

        estimatedAnnualSavings = estimateResult.estimatedAnnualSavings;
        if (estimatedAnnualSavings >= 1500) {
          break;
        }
        systemSizeKw += 1;
      }

      this.assert(
        estimatedAnnualSavings >= 1500,
        'No system size up to max range produced >= $1,500 annual savings'
      );

      // Save the scenario with the name 'Target $1500+ savings'
      const scenarioName = 'Target $1500+ savings';
      const savedScenario = this.logic.saveSavingsScenario(
        scenarioName,
        zipCode,
        monthlyBill,
        roofOrientation,
        shadingLevel,
        systemSizeKw
      );

      this.assert(savedScenario && savedScenario.id, 'SavingsScenario should be created');
      this.assert(savedScenario.name === scenarioName, 'SavingsScenario name should match');
      this.assert(savedScenario.zip_code === zipCode, 'SavingsScenario ZIP should match input');
      this.assert(savedScenario.system_size_kw === systemSizeKw, 'SavingsScenario system size should match input');
      this.assert(
        typeof savedScenario.estimated_annual_savings === 'number',
        'SavingsScenario should have estimated_annual_savings'
      );
      this.assert(
        savedScenario.estimated_annual_savings >= 1500,
        'Saved SavingsScenario annual savings should be at least $1,500'
      );

      // Verify scenario appears in list of saved scenarios
      const scenarios = this.logic.getSavedSavingsScenarios();
      this.assert(Array.isArray(scenarios), 'getSavedSavingsScenarios should return an array');
      const stored = scenarios.find((s) => s.id === savedScenario.id);
      this.assert(!!stored, 'Saved SavingsScenario should be in saved scenarios list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Contact a top-rated installer within 25 miles of ZIP 30301 with 4.5+ stars and 50+ reviews
  testTask6_ContactTopRatedInstallerWithin25Miles() {
    const testName = 'Task 6: Contact top-rated installer within 25 miles of 30301 with 4.5+ stars and 50+ reviews';
    console.log('Running:', testName);

    try {
      // Simulate opening installer search page
      const filterOptions = this.logic.getInstallerSearchFilterOptions();
      this.assert(filterOptions && filterOptions.distanceOptionsMiles, 'Installer search filter options should be available');

      // Search installers near 30301 with given filters, sorted by rating high to low
      const searchResult = this.logic.searchInstallers(
        '30301', // zipCode
        25, // distanceMiles
        4.5, // minOverallRating
        50, // minReviewCount
        'rating', // sortBy
        'desc' // sortDirection
      );

      this.assert(searchResult && Array.isArray(searchResult.installers), 'searchInstallers should return installers');
      const installers = searchResult.installers;
      this.assert(installers.length > 0, 'There should be at least one installer matching filters');

      // Choose the first installer (highest rated after sorting)
      const chosenInstaller = installers[0];
      this.assert(
        chosenInstaller.overall_rating >= 4.5,
        'Chosen installer should have rating >= 4.5'
      );
      this.assert(
        chosenInstaller.review_count >= 50,
        'Chosen installer should have at least 50 reviews'
      );
      this.assert(
        chosenInstaller.distance_miles <= 25,
        'Chosen installer should be within 25 miles'
      );

      // Optionally load installer profile to simulate opening profile page
      const profile = this.logic.getInstallerProfile(chosenInstaller.id);
      this.assert(profile && profile.installer, 'Installer profile should be returned');
      this.assert(profile.installer.id === chosenInstaller.id, 'Profile installer ID should match');

      // Contact the installer
      const contactRequest = this.logic.contactInstaller(
        chosenInstaller.id,
        'Jordan Lee', // name
        '555-123-7890', // phone
        null, // email (optional)
        'phone', // preferredContactMethod
        'Interested in a 7 kW residential solar installation in the next 3 months' // message
      );

      this.assert(contactRequest && contactRequest.id, 'InstallerContactRequest should be created');
      this.assert(
        contactRequest.installer_id === chosenInstaller.id,
        'Contact request should reference chosen installer'
      );
      this.assert(contactRequest.name === 'Jordan Lee', 'Contact name should match');
      this.assert(contactRequest.phone === '555-123-7890', 'Contact phone should match');
      this.assert(
        contactRequest.preferred_contact_method === 'phone',
        'Preferred contact method should be phone'
      );

      // Verify InstallerContactRequest persisted
      const contacts = JSON.parse(localStorage.getItem('installer_contacts') || '[]');
      const stored = contacts.find((c) => c.id === contactRequest.id);
      this.assert(!!stored, 'InstallerContactRequest should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Design a residential system with 16×400W panels and at least 10 kWh battery storage
  testTask7_DesignResidentialSystem16x400WWithBattery() {
    const testName = 'Task 7: Design residential system with 16x400W panels and >=10 kWh battery, view summary, save quote';
    console.log('Running:', testName);

    try {
      // Open system builder options for residential systems
      const options = this.logic.getSystemBuilderOptions('residential');
      this.assert(options && options.panelModels && options.batteryOptions, 'System builder options should be available');

      // Select a 400W panel model (prefer premium if available)
      const fourHundredWPanels = options.panelModels.filter((pm) => pm.wattage === 400 && pm.status === 'active');
      this.assert(fourHundredWPanels.length > 0, 'There should be at least one active 400W panel model');

      let selectedPanelModel = fourHundredWPanels.find((pm) => pm.is_premium);
      if (!selectedPanelModel) {
        selectedPanelModel = fourHundredWPanels[0];
      }

      // Select a battery option with capacity >= 10 kWh (choose smallest that meets this)
      const eligibleBatteries = options.batteryOptions.filter(
        (b) => b.status === 'active' && b.capacity_kwh >= 10
      );
      this.assert(eligibleBatteries.length > 0, 'There should be at least one battery option with capacity >= 10 kWh');
      eligibleBatteries.sort((a, b) => a.capacity_kwh - b.capacity_kwh);
      const selectedBattery = eligibleBatteries[0];

      // Create system design: Residential, asphalt shingle, medium pitch, 16 panels, include battery, string inverter
      const systemType = 'residential';
      const roofType = 'asphalt_shingle';
      const roofPitch = 'medium_25_35';
      const panelQuantity = 16;
      const includeBattery = true;
      const inverterType = 'string_inverter';

      const design = this.logic.createOrUpdateSystemDesign(
        null, // designId (new)
        systemType,
        roofType,
        roofPitch,
        selectedPanelModel.id,
        panelQuantity,
        includeBattery,
        selectedBattery.id,
        inverterType,
        null // notes
      );

      this.assert(design && design.id, 'SystemDesign should be created');
      this.assert(design.system_type === systemType, 'SystemDesign system_type should be residential');
      this.assert(design.roof_type === roofType, 'SystemDesign roof_type should be asphalt_shingle');
      this.assert(design.panel_model_id === selectedPanelModel.id, 'SystemDesign panel_model_id should match selected panel');
      this.assert(design.panel_quantity === panelQuantity, 'SystemDesign panel_quantity should be 16');
      this.assert(design.include_battery === true, 'SystemDesign should include battery');
      this.assert(design.battery_option_id === selectedBattery.id, 'SystemDesign battery_option_id should match selected battery');

      // View system summary
      const summary = this.logic.getSystemDesignSummary(design.id);
      this.assert(summary && summary.design && summary.derived, 'SystemDesign summary should be returned');
      this.assert(summary.design.id === design.id, 'Summary design id should match created design');
      this.assert(
        typeof summary.derived.totalDcCapacityKw === 'number',
        'Summary should include totalDcCapacityKw'
      );

      // Convert design to a quote and save it
      const saveResult = this.logic.saveSystemDesignAsQuote(design.id, '16x400W w/ battery');
      this.assert(saveResult && saveResult.quotePlan && saveResult.savedQuote, 'saveSystemDesignAsQuote should return QuotePlan and SavedQuote');

      const quotePlan = saveResult.quotePlan;
      const savedQuote = saveResult.savedQuote;

      this.assert(savedQuote.quote_plan_id === quotePlan.id, 'SavedQuote should reference QuotePlan');
      this.assert(savedQuote.source_type === 'system_design', 'SavedQuote source_type should be system_design');
      this.assert(savedQuote.source_reference_id === design.id, 'SavedQuote source_reference_id should be SystemDesign ID');

      // Plan should reflect design characteristics
      this.assert(quotePlan.panel_count === panelQuantity, 'QuotePlan panel_count should match design panel quantity');
      if (typeof quotePlan.battery_included === 'boolean') {
        this.assert(quotePlan.battery_included === true, 'QuotePlan should indicate battery included');
      }
      if (typeof quotePlan.battery_capacity_kwh === 'number') {
        this.assert(
          quotePlan.battery_capacity_kwh >= 10,
          'QuotePlan battery capacity should be at least 10 kWh if provided'
        );
      }

      // Verify SavedQuote persisted
      const savedQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
      const stored = savedQuotes.find((sq) => sq.id === savedQuote.id);
      this.assert(!!stored, 'SystemDesign SavedQuote should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose a financing option with under $3,000 upfront and under $150/month and save a pre-application
  testTask8_ChooseFinancingOptionAndSavePreApplication() {
    const testName = 'Task 8: Choose financing option (<$3k upfront, <$150/month, lowest APR) and save pre-application';
    console.log('Running:', testName);

    try {
      // Simulate visiting financing overview page
      const overview = this.logic.getFinancingOverviewContent();
      this.assert(overview && overview.sections, 'Financing overview content should be available');

      const projectCost = 18000;
      const zipCode = '60601';
      const creditScoreRange = '680_719';

      // Start financing comparison
      const comparisonResult = this.logic.startFinancingComparison(
        projectCost,
        zipCode,
        creditScoreRange
      );

      this.assert(comparisonResult && comparisonResult.comparison, 'FinancingComparison should be created');
      const comparison = comparisonResult.comparison;
      this.assert(comparison.project_cost === projectCost, 'FinancingComparison project_cost should match input');
      this.assert(comparison.zip_code === zipCode, 'FinancingComparison ZIP should match input');

      // Get comparison results filtered by max upfront and monthly payment, sorted by APR low to high
      const filteredResultsResponse = this.logic.getFinancingComparisonResults(
        comparison.id,
        3000, // maxUpfrontPayment
        150, // maxMonthlyPayment
        'apr', // sortBy
        'asc' // sortDirection
      );

      this.assert(
        filteredResultsResponse && Array.isArray(filteredResultsResponse.results),
        'getFinancingComparisonResults should return results'
      );
      const results = filteredResultsResponse.results;
      this.assert(results.length > 0, 'There should be at least one financing result meeting upfront and monthly constraints');

      // Ensure results are sorted by APR ascending
      for (let i = 1; i < results.length; i++) {
        this.assert(results[i].apr >= results[i - 1].apr, 'Financing results should be sorted by APR ascending');
      }

      // Choose the first result (lowest APR among filtered options)
      const chosenResult = results[0];
      this.assert(
        chosenResult.estimated_upfront_payment <= 3000,
        'Chosen financing result upfront payment should be <= $3,000'
      );
      this.assert(
        chosenResult.estimated_monthly_payment <= 150,
        'Chosen financing result monthly payment should be <= $150'
      );

      const chosenFinancingOptionId = chosenResult.financing_option_id;
      const termYears = chosenResult.term_years;

      // Load financing option detail to simulate user inspecting it
      const optionDetail = this.logic.getFinancingOptionDetail(chosenFinancingOptionId);
      this.assert(optionDetail && optionDetail.id === chosenFinancingOptionId, 'FinancingOption detail should match chosen option');

      // Create and save a financing pre-application with the chosen option
      const preApplication = this.logic.createFinancingPreApplication(
        chosenFinancingOptionId,
        projectCost, // loanAmount
        termYears, // termYears (use the term from the result to stay consistent)
        projectCost,
        zipCode,
        creditScoreRange
      );

      this.assert(preApplication && preApplication.id, 'FinancingPreApplication should be created');
      this.assert(
        preApplication.financing_option_id === chosenFinancingOptionId,
        'Pre-application should reference chosen financing option'
      );
      this.assert(preApplication.loan_amount === projectCost, 'Pre-application loan amount should match input');
      this.assert(preApplication.term_years === termYears, 'Pre-application term should match selected term');

      // Verify pre-application persisted
      const preApps = JSON.parse(localStorage.getItem('financing_pre_applications') || '[]');
      const stored = preApps.find((pa) => pa.id === preApplication.id);
      this.assert(!!stored, 'FinancingPreApplication should be stored in localStorage');

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

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
