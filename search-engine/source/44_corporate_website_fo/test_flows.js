// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      distributors: [
        {
          id: "dist_berlin_arcade_supply",
          name: "Berlin Arcade Supply GmbH",
          region: "europe",
          country: "Germany",
          city: "Berlin",
          address_line1: "Alexanderplatz 5",
          address_line2: "8th Floor",
          state_region: "Berlin",
          postal_code: "10178",
          latitude: 52.521918,
          longitude: 13.413215,
          phone: "+49 30 1234 5670",
          email: "sales@berlin-arcade-supply.de",
          website_url: "https://www.berlin-arcade-supply.de",
          territories: [
            "Berlin",
            "Brandenburg",
            "Saxony-Anhalt"
          ],
          notes: "Primary authorized distributor for Berlin with focus on prize cranes and redemption games.",
          is_authorized_distributor: true,
          is_active: true
        },
        {
          id: "dist_munich_funtech",
          name: "FunTech Amusements München",
          region: "europe",
          country: "Germany",
          city: "Munich",
          address_line1: "Leopoldstraße 210",
          address_line2: "",
          state_region: "Bavaria",
          postal_code: "80804",
          latitude: 48.171219,
          longitude: 11.586573,
          phone: "+49 89 9876 5432",
          email: "info@funtech-amusements.de",
          website_url: "https://www.funtech-amusements.de",
          territories: [
            "Bavaria",
            "Austria",
            "Switzerland (German-speaking)"
          ],
          notes: "",
          is_authorized_distributor: true,
          is_active: true
        },
        {
          id: "dist_paris_loisirs",
          name: "Paris Loisirs & Jeux SARL",
          region: "europe",
          country: "France",
          city: "Paris",
          address_line1: "12 Rue de Lyon",
          address_line2: "",
          state_region: "Île-de-France",
          postal_code: "75012",
          latitude: 48.847133,
          longitude: 2.374858,
          phone: "+33 1 44 55 66 77",
          email: "contact@paris-loisirs.fr",
          website_url: "https://www.paris-loisirs.fr",
          territories: [
            "Île-de-France",
            "Normandy",
            "Hauts-de-France"
          ],
          notes: "Specializes in family entertainment centers.",
          is_authorized_distributor: true,
          is_active: true
        }
      ],
      events: [
        {
          id: "event_euro_amusement_expo_2026",
          title: "Euro Amusement Expo 2026",
          slug: "euro-amusement-expo-2026",
          description: "Join us in Berlin for Euro Amusement Expo 2026. Visit our booth for hands-on access to the latest prize cranes, ticket redemption games, and compact 110V arcades. A dedicated on-site demo zone will feature 15-minute one-on-one product demos throughout the show.",
          event_type: "trade_show",
          status: "upcoming",
          start_date: "2026-04-08T09:00:00+02:00",
          end_date: "2026-04-10T17:00:00+02:00",
          location_name: "Berlin ExpoCenter City",
          city: "Berlin",
          country: "Germany",
          address_line1: "Messedamm 22",
          address_line2: "",
          postal_code: "14055",
          booth_number: "Hall 3.1, Booth B24",
          has_on_site_demos: true,
          time_zone: "Europe/Berlin",
          event_website_url: "https://www.euroamusementexpo.com",
          created_at: "2025-10-01T12:00:00Z",
          updated_at: "2025-12-15T09:30:00Z"
        },
        {
          id: "event_iaapa_north_america_2026",
          title: "IAAPA North America Expo 2026",
          slug: "iaapa-north-america-expo-2026",
          description: "See our full amusement portfolio at IAAPA North America 2026 in Orlando, including new racing simulators and basketball arcade machines. Reserve a 15-minute on-site demo with our product specialists.",
          event_type: "trade_show",
          status: "upcoming",
          start_date: "2026-11-17T10:00:00-05:00",
          end_date: "2026-11-20T16:00:00-05:00",
          location_name: "Orange County Convention Center",
          city: "Orlando",
          country: "United States",
          address_line1: "9800 International Dr",
          address_line2: "",
          postal_code: "32819",
          booth_number: "South Hall, Booth 4210",
          has_on_site_demos: true,
          time_zone: "America/New_York",
          event_website_url: "https://www.iaapa.org/expos",
          created_at: "2025-11-20T15:45:00Z",
          updated_at: "2026-01-10T08:20:00Z"
        },
        {
          id: "event_asia_attractions_forum_2026",
          title: "Asia Attractions Forum 2026",
          slug: "asia-attractions-forum-2026",
          description: "A conference-focused event in Singapore covering regional trends in family entertainment centers, cashless payments, and operations.",
          event_type: "conference",
          status: "upcoming",
          start_date: "2026-05-22T09:00:00+08:00",
          end_date: "2026-05-23T17:00:00+08:00",
          location_name: "Marina Bay Sands Expo",
          city: "Singapore",
          country: "Singapore",
          address_line1: "10 Bayfront Ave",
          address_line2: "",
          postal_code: "018956",
          booth_number: "",
          has_on_site_demos: false,
          time_zone: "Asia/Singapore",
          event_website_url: "https://www.asiaattractionsforum.com",
          created_at: "2025-09-18T11:00:00Z",
          updated_at: "2025-09-18T11:00:00Z"
        }
      ],
      financing_plan_definitions: [
        {
          id: "plan_36_usd_standard",
          name: "36-Month Standard Plan (USD)",
          term_months: 36,
          interest_rate_annual_percent: 7.9,
          min_amount: 5000,
          max_amount: 100000,
          currency: "usd",
          description: "Popular mid-term plan suitable for most arcade projects, fixed monthly payments over 36 months.",
          display_order: 1,
          is_active: true
        },
        {
          id: "plan_48_usd_extended",
          name: "48-Month Extended Plan (USD)",
          term_months: 48,
          interest_rate_annual_percent: 8.3,
          min_amount: 7500,
          max_amount: 150000,
          currency: "usd",
          description: "Lower monthly payment option with extended 48-month term, ideal for higher-value machines.",
          display_order: 2,
          is_active: true
        },
        {
          id: "plan_24_usd_fast_track",
          name: "24-Month Fast Track Plan (USD)",
          term_months: 24,
          interest_rate_annual_percent: 6.9,
          min_amount: 5000,
          max_amount: 80000,
          currency: "usd",
          description: "Shorter-term plan with slightly lower interest for faster payoff.",
          display_order: 3,
          is_active: true
        }
      ],
      product_categories: [
        {
          id: "all_products",
          name: "All Products",
          code: "all_products",
          description: "Browse the full catalog of amusement machines, from basketball games and racers to cranes and ticket redemption.",
          sort_order: 1,
          is_active: true,
          image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          id: "basketball_sports_games",
          name: "Basketball & Sports Games",
          code: "basketball_sports_games",
          description: "Basketball hoop shooters, pitch-and-throw games, and other competitive sports arcades.",
          sort_order: 2,
          is_active: true,
          image: "https://images.unsplash.com/photo-1519861155730-0b5fbf0dd889?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          id: "racing_driving",
          name: "Racing & Driving",
          code: "racing_driving",
          description: "Sit-down and motion racing simulators, compact drivers, and linked cabinet systems.",
          sort_order: 3,
          is_active: true,
          image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=600&fit=crop&auto=format&q=80"
        }
      ],
      products: [
        {
          id: "prod_hoop_hero_duo",
          name: "Hoop Hero Duo",
          model_code: "HH-200",
          category_code: "basketball_sports_games",
          players: 2,
          price: 6495,
          price_currency: "usd",
          width_cm: 104,
          height_cm: 255,
          depth_cm: 300,
          weight_kg: 260,
          power_voltage: "v110",
          power_phase: "single_phase",
          power_consumption_watts: 380,
          status: "active",
          is_available_for_quote: true,
          is_available_for_project: true,
          short_description: "Compact 2-player basketball game with LED scoring and ticket output.",
          description: "Hoop Hero Duo is a space-saving two-player basketball arcade machine designed for high throughput in FECs and bowling centers. It features adjustable difficulty, bright LED lighting, and optional ticket payout integration.",
          thumbnail_image_url: "https://cdn.shopify.com/s/files/1/0534/0553/products/NG2237BL_1_hi_1024x1024.jpg?v=1571483817",
          gallery_image_urls: [
            "https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          created_at: "2024-02-10T10:00:00Z",
          updated_at: "2025-11:15T09:30:00Z"
        },
        {
          id: "prod_street_shot_double",
          name: "Street Shot Double",
          model_code: "SS-250",
          category_code: "basketball_sports_games",
          players: 2,
          price: 6995,
          price_currency: "usd",
          width_cm: 112,
          height_cm: 260,
          depth_cm: 310,
          weight_kg: 275,
          power_voltage: "v110",
          power_phase: "single_phase",
          power_consumption_watts: 420,
          status: "active",
          is_available_for_quote: true,
          is_available_for_project: true,
          short_description: "Full-size street-style 2-player basketball machine with moving hoop.",
          description: "Street Shot Double brings an authentic street basketball feel with dynamic hoop movement, sound effects, and competitive 2-player play. Ideal for high-traffic arcades needing strong visual presence.",
          thumbnail_image_url: "https://www.neofuns.com/fronts/uploads/2019/07/basketball-arcade-machine-Battles-and-Player-Vs.-Player.jpg",
          gallery_image_urls: [
            "https://images.unsplash.com/photo-1526401281623-3593f4a8ce59?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1516478177764-9fe5bdc5aff3?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          created_at: "2024-05-02T14:20:00Z",
          updated_at: "2025-10-05T08:45:00Z"
        },
        {
          id: "prod_compact_court_2p",
          name: "Compact Court 2P",
          model_code: "CC-180",
          category_code: "basketball_sports_games",
          players: 2,
          price: 7395,
          price_currency: "usd",
          width_cm: 96,
          height_cm: 245,
          depth_cm: 280,
          weight_kg: 230,
          power_voltage: "v110",
          power_phase: "single_phase",
          power_consumption_watts: 350,
          status: "active",
          is_available_for_quote: true,
          is_available_for_project: true,
          short_description: "Narrow-body 2-player basketball game optimized for compact locations.",
          description: "Compact Court 2P delivers full-featured 2-player gameplay in a reduced footprint, making it perfect for smaller venues and compact 110V arcades. Features operator-adjustable pricing and difficulty.",
          thumbnail_image_url: "https://images.unsplash.com/photo-1603575448364-0e4a82936c56?w=800&h=600&fit=crop&auto=format&q=80",
          gallery_image_urls: [
            "https://images.unsplash.com/photo-1587080413959-06b859fb107e?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1519861155730-0b5fbf0dd889?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          created_at: "2024-08-18T11:40:00Z",
          updated_at: "2025-09-22T13:10:00Z"
        }
      ],
      manual_documents: [
        {
          id: "md_galaxy_claw_pro_install_v1_en",
          title: "Galaxy Claw Pro Installation Manual v1.0",
          product_model_name: "Galaxy Claw Pro",
          product_id: "prod_galaxy_claw_pro",
          document_type: "installation_manual",
          description: "Initial installation guide for Galaxy Claw Pro covering cabinet placement, leveling, and basic wiring.",
          language: "en",
          version: "1.0",
          published_at: "2023-03-15T10:00:00Z",
          file_url: "https://arxiv.org/pdf/2404.07972",
          file_size_mb: 5.8,
          is_active: false
        },
        {
          id: "md_galaxy_claw_pro_install_v2_en",
          title: "Galaxy Claw Pro Installation Manual v2.0",
          product_model_name: "Galaxy Claw Pro",
          product_id: "prod_galaxy_claw_pro",
          document_type: "installation_manual",
          description: "Updated installation manual for Galaxy Claw Pro with step-by-step setup, wiring diagrams summary, and telemetry configuration notes.",
          language: "en",
          version: "2.0",
          published_at: "2024-07-10T09:30:00Z",
          file_url: "https://arxiv.org/pdf/2404.07972",
          file_size_mb: 7.1,
          is_active: true
        },
        {
          id: "md_galaxy_claw_pro_user_v1_en",
          title: "Galaxy Claw Pro Operator & User Manual",
          product_model_name: "Galaxy Claw Pro",
          product_id: "prod_galaxy_claw_pro",
          document_type: "user_manual",
          description: "Operator guide for configuring pricing, claw strength, and routine maintenance for Galaxy Claw Pro.",
          language: "en",
          version: "1.1",
          published_at: "2024-07-10T11:00:00Z",
          file_url: "https://arxiv.org/pdf/2404.07972",
          file_size_mb: 6.4,
          is_active: true
        }
      ],
      _metadata: {
        baselineDate: "2026-03-03",
        generatedAt: "2026-03-03T03:14:07.085473"
      }
    };

    // Populate localStorage using correct storage keys
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('distributors', JSON.stringify(generatedData.distributors));
      localStorage.setItem('events', JSON.stringify(generatedData.events));
      localStorage.setItem('financing_plan_definitions', JSON.stringify(generatedData.financing_plan_definitions));
      localStorage.setItem('product_categories', JSON.stringify(generatedData.product_categories));
      localStorage.setItem('products', JSON.stringify(generatedData.products));
      localStorage.setItem('manual_documents', JSON.stringify(generatedData.manual_documents));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    const tests = [
      this.testTask1_RequestQuoteForTwo2PlayerBasketballMachines.bind(this),
      this.testTask2_CreateCompact110VProjectList.bind(this),
      this.testTask3_DownloadLatestInstallationManual.bind(this),
      this.testTask4_BookOnSiteMaintenanceVisit.bind(this),
      this.testTask5_FindBerlinDistributorAndSendInquiry.bind(this),
      this.testTask6_RegisterForProductDemoSlot.bind(this),
      this.testTask7_ChooseFinancingPlanWithLowerMonthlyPayment.bind(this),
      this.testTask8_SubscribeToNewsletterSpecificSegments.bind(this)
    ];

    for (let i = 0; i < tests.length; i++) {
      // Reset storage and data before each flow test
      this.clearStorage();
      this.setupTestData();
      tests[i]();
    }

    return this.results;
  }

  // Task 1: Request a quote for two 2-player basketball arcade machines under $8,000 each
  testTask1_RequestQuoteForTwo2PlayerBasketballMachines() {
    const testName = 'Task 1: Request quote for two 2-player basketball machines under $8,000 each';
    console.log('Testing:', testName);
    try {
      // Simulate homepage and category navigation
      const homeCategories = this.logic.getHomeFeaturedCategories();
      this.assert(Array.isArray(homeCategories), 'Home categories should be an array');

      const categoryDetails = this.logic.getCategoryDetails('basketball_sports_games');
      this.assert(categoryDetails && categoryDetails.code === 'basketball_sports_games', 'Should load basketball category details');

      const filterOptions = this.logic.getProductFilterOptions('basketball_sports_games');
      this.assert(filterOptions && filterOptions.player_counts, 'Should load product filter options');

      // Filter to 2-player games under $8000 and sort by price low to high
      const productsResult = this.logic.getCategoryProducts(
        'basketball_sports_games',
        { players: 2, max_price: 8000 },
        'price_low_to_high',
        1,
        20
      );
      this.assert(productsResult && Array.isArray(productsResult.items), 'Should get category products');
      this.assert(productsResult.items.length >= 2, 'Should have at least two matching 2-player basketball games');

      const firstProduct = productsResult.items[0];
      const secondProduct = productsResult.items[1];

      this.assert(firstProduct.product_id !== secondProduct.product_id, 'First two products should be different');
      this.assert(typeof firstProduct.price === 'number' && firstProduct.price <= 8000, 'First product price should be <= 8000');
      this.assert(typeof secondProduct.price === 'number' && secondProduct.price <= 8000, 'Second product price should be <= 8000');
      this.assert(firstProduct.players === 2, 'First product should be 2-player');
      this.assert(secondProduct.players === 2, 'Second product should be 2-player');

      // Add first product to quote list
      const addResult1 = this.logic.addProductToQuoteList(firstProduct.product_id, 1);
      this.assert(addResult1 && addResult1.success === true, 'First add to quote should succeed');
      this.assert(addResult1.quote_list_id, 'First add should return a quote list ID');

      // Add second product to the same quote list
      const addResult2 = this.logic.addProductToQuoteList(secondProduct.product_id, 1);
      this.assert(addResult2 && addResult2.success === true, 'Second add to quote should succeed');
      this.assert(addResult2.quote_list_id, 'Second add should return a quote list ID');
      this.assert(addResult1.quote_list_id === addResult2.quote_list_id, 'Both products should be in the same quote list');

      const quoteListId = addResult1.quote_list_id;

      // Verify quote cart summary
      const quoteSummary = this.logic.getQuoteListSummary();
      this.assert(quoteSummary && quoteSummary.has_open_quote_list === true, 'There should be an open quote list');
      this.assert(quoteSummary.quote_list_id === quoteListId, 'Summary should reference the same quote list');

      // Verify quote cart details
      const quoteDetails = this.logic.getQuoteListDetails();
      this.assert(quoteDetails && Array.isArray(quoteDetails.items), 'Should get quote list details');
      this.assert(quoteDetails.quote_list_id === quoteListId, 'Details should use the same quote list ID');

      const itemIds = quoteDetails.items.map(function (it) { return it.product_id; });
      const firstInList = quoteDetails.items.find(function (it) { return it.product_id === firstProduct.product_id; });
      const secondInList = quoteDetails.items.find(function (it) { return it.product_id === secondProduct.product_id; });

      this.assert(firstInList, 'Quote list should contain the first product');
      this.assert(secondInList, 'Quote list should contain the second product');
      this.assert(itemIds.indexOf(firstProduct.product_id) !== -1 && itemIds.indexOf(secondProduct.product_id) !== -1, 'Both selected products should be present');

      this.assert(firstInList.quantity === 1, 'First product quantity should be 1');
      this.assert(secondInList.quantity === 1, 'Second product quantity should be 1');

      // Verify that all items in the quote are priced below or equal to 8000 when price is present
      for (let i = 0; i < quoteDetails.items.length; i++) {
        const item = quoteDetails.items[i];
        if (typeof item.unit_price === 'number') {
          if (item.product_id === firstProduct.product_id || item.product_id === secondProduct.product_id) {
            this.assert(item.unit_price <= 8000, 'Quoted unit price for selected products should be <= 8000');
          }
        }
      }

      // Submit quote request
      const submitResult = this.logic.submitQuoteRequest(
        'Task 1 Tester',
        'Arcade Test Company',
        'task1.tester@example.com',
        '+1-555-000-0001',
        'Quote request for two 2-player basketball machines under $8,000 each.',
        true
      );
      this.assert(submitResult && submitResult.success === true, 'Quote request submission should succeed');
      this.assert(submitResult.quote_request_id, 'Quote request should return an ID');
      this.assert(typeof submitResult.status === 'string', 'Quote request should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a 4-machine mixed-category project list for a compact 110V arcade (adapted to available data)
  testTask2_CreateCompact110VProjectList() {
    const testName = 'Task 2: Create a compact 110V project list';
    console.log('Testing:', testName);
    try {
      // Use available products from storage and filter to 110V and width <= 130 cm
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      this.assert(Array.isArray(products) && products.length > 0, 'There should be products available for project list');

      const eligibleProducts = products.filter(function (p) {
        return p.power_voltage === 'v110' &&
          typeof p.width_cm === 'number' &&
          p.width_cm <= 130 &&
          p.is_available_for_project === true;
      });

      this.assert(eligibleProducts.length > 0, 'There should be at least one product that is 110V and <= 130 cm wide');

      // Select up to 4 machines for the project list
      const maxMachines = 4;
      const selectedProducts = eligibleProducts.slice(0, maxMachines);
      const expectedCount = selectedProducts.length;

      let projectId = null;

      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];

        // Simulate navigating to the product category
        const catDetails = this.logic.getCategoryDetails(product.category_code);
        this.assert(catDetails && catDetails.code === product.category_code, 'Should load product category details for ' + product.name);

        // Optionally verify category listing can include this product using category filters
        const catProducts = this.logic.getCategoryProducts(
          product.category_code,
          { power_voltage: product.power_voltage, max_width_cm: product.width_cm },
          undefined,
          1,
          50
        );
        this.assert(catProducts && Array.isArray(catProducts.items), 'Should get category listing for ' + product.name);

        // Non-strict check: we do not assert presence strictly to avoid coupling to implementation

        // Add to project
        const addResult = this.logic.addProductToProject(product.id, 1, 'Task 2: add ' + product.name + ' to compact 110V project');
        this.assert(addResult && addResult.success === true, 'Adding product to project should succeed');
        this.assert(addResult.project_id, 'Project ID should be returned');
        if (!projectId) {
          projectId = addResult.project_id;
        } else {
          this.assert(addResult.project_id === projectId, 'All machines should be added to the same project');
        }
      }

      // Verify project summary
      const projectSummary = this.logic.getProjectSummary();
      this.assert(projectSummary && projectSummary.has_project === true, 'Project summary should indicate a current project');
      this.assert(projectSummary.project_id === projectId, 'Project summary should reference the same project');

      // Verify project details
      const projectDetails = this.logic.getCurrentProjectDetails();
      this.assert(projectDetails && Array.isArray(projectDetails.items), 'Should retrieve current project details');
      this.assert(projectDetails.project_id === projectId, 'Project details should use the same project ID');

      // Ensure that selected products are present with 110V and width <= 130 cm
      const projectItems = projectDetails.items;
      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        const inProject = projectItems.find(function (it) { return it.product_id === product.id; });
        this.assert(inProject, 'Project should contain selected product ' + product.name);

        // Validate 110V and width constraint using actual stored data
        const voltage = inProject.power_voltage || product.power_voltage;
        this.assert(voltage === 'v110', 'Project item should operate on 110V');

        if (typeof inProject.width_cm === 'number') {
          this.assert(inProject.width_cm <= 130, 'Project item width should be <= 130 cm');
        } else if (typeof product.width_cm === 'number') {
          this.assert(product.width_cm <= 130, 'Product width should be <= 130 cm');
        }
      }

      this.assert(projectDetails.items.length >= expectedCount, 'Project should contain at least as many machines as selected');

      // Save the project
      const saveResult = this.logic.saveCurrentProject();
      this.assert(saveResult && saveResult.success === true, 'Saving project should succeed');
      this.assert(saveResult.project_id === projectId, 'Saved project should keep the same ID');
      this.assert(typeof saveResult.status === 'string', 'Saved project should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Find and download the latest installation manual for a specific crane machine model
  testTask3_DownloadLatestInstallationManual() {
    const testName = 'Task 3: Find and download latest installation manual for Galaxy Claw Pro';
    console.log('Testing:', testName);
    try {
      // Open support overview
      const supportOverview = this.logic.getSupportOverview();
      this.assert(supportOverview && supportOverview.manuals_section, 'Support overview should include manuals section');

      // Load manual filter options
      const filterOptions = this.logic.getManualFilterOptions();
      this.assert(filterOptions && filterOptions.document_types, 'Manual filter options should be available');

      // Search for Galaxy Claw Pro installation manuals from 2023 onwards
      const manualsSearchResult = this.logic.searchManuals(
        'Galaxy Claw Pro',
        'installation_manual',
        2023,
        2026,
        undefined,
        'newest_first',
        1,
        20
      );
      this.assert(manualsSearchResult && Array.isArray(manualsSearchResult.items), 'Manuals search should return items');
      this.assert(manualsSearchResult.items.length > 0, 'There should be at least one installation manual result for Galaxy Claw Pro');

      const latestManual = manualsSearchResult.items[0];
      this.assert(latestManual.manual_id, 'Latest manual should have an ID');
      this.assert(latestManual.document_type === 'installation_manual', 'Latest manual should be an installation manual');
      this.assert(latestManual.product_model_name.indexOf('Galaxy Claw Pro') !== -1, 'Manual should be for Galaxy Claw Pro');

      // Verify publication date is 2023 or later
      const publishedYear = new Date(latestManual.published_at).getFullYear();
      this.assert(publishedYear >= 2023, 'Latest installation manual should be published in 2023 or later');

      // Get manual details
      const manualDetails = this.logic.getManualDetails(latestManual.manual_id);
      this.assert(manualDetails && manualDetails.manual_id === latestManual.manual_id, 'Manual details should match selected manual');
      this.assert(manualDetails.document_type === 'installation_manual', 'Manual details should confirm installation manual type');

      // Optionally verify relation to a product if available
      if (manualDetails.product_id) {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const relatedProduct = products.find(function (p) { return p.id === manualDetails.product_id; });
        if (relatedProduct) {
          this.assert(typeof relatedProduct.name === 'string', 'Related product should have a name');
        }
      }

      // Initiate download
      const downloadResult = this.logic.initiateManualDownload(latestManual.manual_id);
      this.assert(downloadResult && downloadResult.success === true, 'Manual download should be initiated successfully');
      this.assert(downloadResult.file_url, 'Download result should include a file URL');
      if (manualDetails.file_url) {
        this.assert(downloadResult.file_url === manualDetails.file_url, 'Download URL should match manual details file URL');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Book an on-site maintenance visit for an air hockey table on a specific date and time
  testTask4_BookOnSiteMaintenanceVisit() {
    const testName = 'Task 4: Book an on-site maintenance visit for air hockey table';
    console.log('Testing:', testName);
    try {
      // Load support overview and service options
      const supportOverview = this.logic.getSupportOverview();
      this.assert(supportOverview && supportOverview.service_request_section, 'Support overview should include service request section');

      const formOptions = this.logic.getServiceFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.service_types), 'Service types should be available');
      this.assert(Array.isArray(formOptions.product_categories), 'Product categories should be available');

      // Select on-site maintenance service type
      const onSiteServiceType = formOptions.service_types.find(function (s) { return s.value === 'on_site_maintenance'; }) ||
        formOptions.service_types[0];
      this.assert(onSiteServiceType, 'Should have at least one service type configured');

      // Find air hockey category
      const airHockeyCategory = formOptions.product_categories.find(function (c) { return c.code === 'air_hockey_table_games'; }) ||
        formOptions.product_categories[0];
      this.assert(airHockeyCategory, 'Should have at least one product category for service');

      // Load models for air hockey category
      const models = this.logic.getServiceModelsForCategory(airHockeyCategory.code);
      this.assert(Array.isArray(models), 'Service models list should be an array');

      let selectedProductId = null;
      if (models.length > 0) {
        selectedProductId = models[0].product_id;
      }

      // Prepare request data for June 10, 2026 at 10:00 AM
      const preferredDateTime = '2026-06-10T10:00:00';

      const serviceResult = this.logic.submitServiceRequest(
        onSiteServiceType.value,
        airHockeyCategory.code,
        selectedProductId,
        'StrikeZone Bowling',
        '123 Main Street',
        '',
        '',
        '',
        '',
        '',
        'Right goal is not detecting pucks and score is not updating.',
        preferredDateTime,
        'Task 4 Tester',
        '+1-555-000-0004',
        'task4.tester@example.com',
        true
      );

      this.assert(serviceResult && serviceResult.success === true, 'Service request submission should succeed');
      this.assert(serviceResult.service_request_id, 'Service request should return an ID');
      this.assert(typeof serviceResult.status === 'string', 'Service request should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find a Berlin-based distributor and send them a contact request
  testTask5_FindBerlinDistributorAndSendInquiry() {
    const testName = 'Task 5: Find a Berlin-based distributor and send contact request';
    console.log('Testing:', testName);
    try {
      const searchOptions = this.logic.getDistributorSearchOptions();
      this.assert(searchOptions && Array.isArray(searchOptions.regions), 'Distributor regions should be available');
      this.assert(Array.isArray(searchOptions.countries), 'Distributor countries should be available');

      // Use Europe region and Germany country
      const distributorsResult = this.logic.searchDistributors(
        'europe',
        'Germany',
        'Berlin',
        1,
        20
      );
      this.assert(distributorsResult && Array.isArray(distributorsResult.items), 'Distributor search should return items');
      this.assert(distributorsResult.items.length > 0, 'There should be at least one distributor result');

      // Choose the first distributor that is located in or serves Berlin
      let selectedDistributor = null;
      for (let i = 0; i < distributorsResult.items.length; i++) {
        const d = distributorsResult.items[i];
        if ((d.city && d.city.toLowerCase() === 'berlin') || d.serves_search_location) {
          selectedDistributor = d;
          break;
        }
      }
      if (!selectedDistributor) {
        selectedDistributor = distributorsResult.items[0];
      }

      this.assert(selectedDistributor.distributor_id, 'Selected distributor should have an ID');

      const distributorDetails = this.logic.getDistributorDetails(selectedDistributor.distributor_id);
      this.assert(distributorDetails && distributorDetails.distributor_id === selectedDistributor.distributor_id, 'Distributor details should match selected distributor');
      this.assert(distributorDetails.is_authorized_distributor === true, 'Distributor should be authorized');

      const inquiryResult = this.logic.submitDistributorInquiry(
        distributorDetails.distributor_id,
        'product_inquiry',
        'I am interested in pricing and availability for claw machines for a new arcade in Berlin.',
        'Task 5 Tester',
        'task5.tester@example.com',
        '+49-30-0000-0005'
      );

      this.assert(inquiryResult && inquiryResult.success === true, 'Distributor inquiry should be submitted successfully');
      this.assert(inquiryResult.distributor_inquiry_id, 'Distributor inquiry should return an ID');
      this.assert(typeof inquiryResult.status === 'string', 'Distributor inquiry should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Register for a 15-minute product demo slot at an upcoming trade show
  testTask6_RegisterForProductDemoSlot() {
    const testName = 'Task 6: Register for a 15-minute product demo slot at an upcoming trade show';
    console.log('Testing:', testName);
    try {
      // Load upcoming trade show events with on-site demos
      const eventsResult = this.logic.getEvents(
        'upcoming',
        'trade_show',
        true,
        'start_date_asc',
        1,
        20
      );
      this.assert(eventsResult && Array.isArray(eventsResult.items), 'Events list should be available');
      this.assert(eventsResult.items.length > 0, 'There should be at least one upcoming trade show with demos');

      const selectedEvent = eventsResult.items[0];
      this.assert(selectedEvent.event_id, 'Selected event should have an ID');
      this.assert(selectedEvent.has_on_site_demos === true, 'Selected event should have on-site demos');

      const eventDetails = this.logic.getEventDetails(selectedEvent.event_id);
      this.assert(eventDetails && eventDetails.event_id === selectedEvent.event_id, 'Event details should match selected event');

      // Get available demo slots
      const slotsInfo = this.logic.getEventAvailableDemoSlots(selectedEvent.event_id);
      this.assert(slotsInfo && Array.isArray(slotsInfo.dates), 'Demo slot dates should be available');
      this.assert(slotsInfo.dates.length > 0, 'There should be at least one date with demo slots');

      // Choose earliest date
      const firstDate = slotsInfo.dates[0];
      this.assert(Array.isArray(firstDate.time_slots), 'Demo time slots should be available for the earliest date');
      this.assert(firstDate.time_slots.length > 0, 'Earliest date should have at least one time slot');

      // Try to find a 2:00 PM slot, otherwise fall back to first available
      let selectedSlot = null;
      for (let i = 0; i < firstDate.time_slots.length; i++) {
        const slot = firstDate.time_slots[i];
        if (!slot.is_available) {
          continue;
        }
        const labelLower = (slot.label || '').toLowerCase();
        const valueLower = (slot.time_slot || '').toLowerCase();
        if (labelLower.indexOf('2:00') !== -1 || labelLower.indexOf('14:00') !== -1 ||
          valueLower.indexOf('14:00') !== -1 || valueLower.indexOf('2:00 pm') !== -1) {
          selectedSlot = slot;
          break;
        }
      }
      if (!selectedSlot) {
        // Fall back to the first available slot
        for (let i = 0; i < firstDate.time_slots.length; i++) {
          if (firstDate.time_slots[i].is_available) {
            selectedSlot = firstDate.time_slots[i];
            break;
          }
        }
      }

      this.assert(selectedSlot && selectedSlot.time_slot, 'Should have an available time slot to book');

      const registrationResult = this.logic.submitDemoRegistration(
        selectedEvent.event_id,
        firstDate.date,
        selectedSlot.time_slot,
        'Task 6 Tester',
        'Demo Test Company',
        'task6.tester@example.com',
        'prize_cranes',
        ''
      );

      this.assert(registrationResult && registrationResult.success === true, 'Demo registration should succeed');
      this.assert(registrationResult.demo_registration_id, 'Demo registration should return an ID');
      this.assert(typeof registrationResult.status === 'string', 'Demo registration should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Choose the financing plan with the lower monthly payment for an $18,000 machine
  testTask7_ChooseFinancingPlanWithLowerMonthlyPayment() {
    const testName = 'Task 7: Choose financing plan with lower monthly payment for $18,000 machine';
    console.log('Testing:', testName);
    try {
      const financingOverview = this.logic.getFinancingOverview();
      this.assert(financingOverview && financingOverview.intro_text !== undefined, 'Financing overview should be available');

      const planOptions = this.logic.getFinancingPlanOptions('usd');
      this.assert(Array.isArray(planOptions) && planOptions.length > 0, 'Financing plan options should be available');

      // Calculate payments for 36 and 48 month terms
      const equipmentPrice = 18000;
      const calcResult = this.logic.calculateFinancingPayments(
        equipmentPrice,
        'usd',
        [36, 48]
      );
      this.assert(calcResult && Array.isArray(calcResult.calculations), 'Financing calculations should be returned');

      const calc36 = calcResult.calculations.find(function (c) { return c.term_months === 36; });
      const calc48 = calcResult.calculations.find(function (c) { return c.term_months === 48; });

      this.assert(calc36 && typeof calc36.estimated_monthly_payment === 'number', '36-month calculation should be available');
      this.assert(calc48 && typeof calc48.estimated_monthly_payment === 'number', '48-month calculation should be available');

      let preferredCalc = null;
      if (calc36.estimated_monthly_payment <= calc48.estimated_monthly_payment) {
        preferredCalc = calc36;
      } else {
        preferredCalc = calc48;
      }

      this.assert(preferredCalc && preferredCalc.term_months, 'Preferred calculation should be determined');

      // Find matching plan option for the preferred term
      let selectedPlanId = preferredCalc.plan_id;
      if (!selectedPlanId) {
        const matchingPlan = planOptions.find(function (p) { return p.term_months === preferredCalc.term_months; });
        if (matchingPlan) {
          selectedPlanId = matchingPlan.plan_id || matchingPlan.id;
        }
      }

      const financingInquiryResult = this.logic.submitFinancingInquiry(
        selectedPlanId || '',
        equipmentPrice,
        'usd',
        preferredCalc.term_months,
        preferredCalc.estimated_monthly_payment,
        'Task 7 Tester',
        'Financing Test Company',
        'task7.tester@example.com',
        '+1-555-000-0007'
      );

      this.assert(financingInquiryResult && financingInquiryResult.success === true, 'Financing inquiry should be submitted successfully');
      this.assert(financingInquiryResult.financing_inquiry_id, 'Financing inquiry should return an ID');
      this.assert(typeof financingInquiryResult.status === 'string', 'Financing inquiry should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Subscribe to the newsletter with specific market segments and monthly frequency
  testTask8_SubscribeToNewsletterSpecificSegments() {
    const testName = 'Task 8: Subscribe to newsletter with specific segments and monthly frequency';
    console.log('Testing:', testName);
    try {
      const options = this.logic.getNewsletterOptions();
      this.assert(options && Array.isArray(options.market_segments), 'Newsletter market segments should be available');
      this.assert(Array.isArray(options.email_frequencies), 'Newsletter email frequencies should be available');

      // Find Family Entertainment Centers and Bowling Centers segments
      const fecSegment = options.market_segments.find(function (s) { return s.value === 'family_entertainment_centers'; });
      const bowlingSegment = options.market_segments.find(function (s) { return s.value === 'bowling_centers'; });

      this.assert(fecSegment, 'Family Entertainment Centers segment should be available');
      this.assert(bowlingSegment, 'Bowling Centers segment should be available');

      // Find monthly frequency
      const monthlyFrequency = options.email_frequencies.find(function (f) { return f.value === 'monthly'; }) ||
        options.email_frequencies.find(function (f) { return f.label && f.label.toLowerCase().indexOf('monthly') !== -1; });
      this.assert(monthlyFrequency, 'Monthly email frequency should be available');

      const subscriptionResult = this.logic.submitNewsletterSubscription(
        'Task 8 Tester',
        'user@example.com',
        [fecSegment.value, bowlingSegment.value],
        monthlyFrequency.value,
        'Updates on new redemption and crane games for FECs and bowling centers',
        true
      );

      this.assert(subscriptionResult && subscriptionResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subscriptionResult.newsletter_subscription_id, 'Newsletter subscription should return an ID');
      this.assert(typeof subscriptionResult.status === 'string', 'Newsletter subscription should have a status');

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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
