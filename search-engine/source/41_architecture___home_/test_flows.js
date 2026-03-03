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
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (adapted to JS object)
    const generatedData = {
      articles: [
        {
          id: 'article_net_zero_urban_infill',
          title: 'Designing Net-Zero Homes on Urban Infill Lots',
          slug: 'designing-net-zero-homes-urban-infill',
          excerpt: 'How to achieve net-zero energy performance when building modern homes on tight city lots.',
          content: 'Building a net-zero home on an urban infill lot requires careful coordination of site planning, envelope design, and building systems. Compact forms with high-performance envelopes minimize heat loss, while generous glazing is balanced with exterior shading and low-solar-gain glass. Roof space is reserved for a right-sized photovoltaic array, and mechanical systems prioritize all-electric solutions such as heat pumps and heat-recovery ventilation.\n\nBecause infill sites are often constrained, early massing studies help optimize solar orientation and privacy. Detailing at party walls and shared property lines must also account for acoustics and fire separation. We frequently integrate green roofs and high-albedo surfaces to mitigate urban heat island effects and improve stormwater management.\n\nFrom the outset, we model energy performance to understand trade-offs between envelope upgrades and mechanical system complexity. This allows clients to make informed decisions about where to invest for the greatest impact on both comfort and long-term operating costs.',
          author_name: 'Jamie Reynolds',
          publication_date: '2023-02-10T09:00:00Z',
          year: 2023,
          tags: [
            'sustainability',
            'green_building',
            'urban_infill',
            'net_zero'
          ],
          hero_image_url: 'https://www.casaceliconstruction.com/wp-content/uploads/Fully-Insulated-Exterior-for-Net-Zero-Home.jpg',
          is_sustainability_focused: true,
          status: 'published'
        },
        {
          id: 'article_green_kitchen_renovations_2023',
          title: 'Green Kitchen Renovations: Materials That Matter',
          slug: 'green-kitchen-renovations-materials-that-matter',
          excerpt: 'A practical guide to choosing sustainable materials, finishes, and appliances for your next kitchen remodel.',
          content: 'Kitchen renovations offer one of the best opportunities to reduce the environmental footprint of your home. Durable, low-emission materials improve indoor air quality while reducing long-term replacement cycles. We prioritize cabinet boxes made from FSC-certified plywood with no-added-formaldehyde adhesives, paired with low-VOC finishes.\n\nCountertop choices such as recycled-content quartz or solid-surface products with Environmental Product Declarations give clients transparency into embodied carbon. For flooring, we often specify sustainably harvested wood or high-quality linoleum rather than vinyl. Efficient LED task lighting and induction cooktops significantly cut energy use and improve comfort in the space.\n\nAppliance selection is another key driver of performance. ENERGY STAR-rated dishwashers and refrigerators, combined with well-designed ventilation, support both energy efficiency and occupant health. By making a series of thoughtful, incremental decisions, a typical kitchen renovation can become a model of sustainability without sacrificing aesthetics.',
          author_name: 'Alex Morgan',
          publication_date: '2023-06-18T11:30:00Z',
          year: 2023,
          tags: [
            'sustainability',
            'green_building',
            'kitchen',
            'renovation'
          ],
          hero_image_url: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80',
          is_sustainability_focused: true,
          status: 'published'
        },
        {
          id: 'article_sustainable_multifamily_trends_2023',
          title: 'Sustainable Multifamily Design Trends for 2023',
          slug: 'sustainable-multifamily-design-trends-2023',
          excerpt: 'From low-carbon structures to shared amenities, multifamily housing is leading the next wave of green building.',
          content: 'Multifamily projects are uniquely positioned to advance sustainable design because they aggregate demand for high-performance systems and shared amenities. In 2023, we see a strong push toward mass timber structures, which significantly reduce embodied carbon compared to conventional concrete and steel.\n\nPassive solar strategies, operable shading, and natural ventilation are being integrated with high-efficiency central mechanical systems. Amenity spaces such as rooftop gardens and shared work lounges not only build community but also support stormwater management and improved thermal comfort.\n\nEV-ready parking, secure bike storage, and thoughtfully designed pedestrian connections further reduce transportation-related emissions. As energy codes tighten, we expect an increased emphasis on post-occupancy monitoring, allowing building operators to fine-tune systems and ensure that design intent is realized in day-to-day performance.',
          author_name: 'Danielle Cruz',
          publication_date: '2023-09-05T14:15:00Z',
          year: 2023,
          tags: [
            'sustainability',
            'green_building',
            'multifamily',
            'trends'
          ],
          hero_image_url: 'https://themillenniacompanies.com/wp-content/uploads/2021/05/LineCreek-AHF-1.jpg',
          is_sustainability_focused: true,
          status: 'published'
        }
      ],
      plans: [
        {
          id: 'plan_cedar_row_3bed_narrow',
          name: 'Cedar Row 3-Bed Narrow Lot',
          slug: 'cedar-row-3-bed-narrow-lot',
          description: 'A compact modern home optimized for narrow city lots, featuring open-plan living and abundant natural light.',
          style: 'modern',
          bedrooms: 3,
          bathrooms: 2,
          size_sq_ft: 1780,
          estimated_build_cost: 410000,
          popularity_score: 86,
          hero_image_url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1512914890250-353c97c9e7e2?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active',
          is_featured: true
        },
        {
          id: 'plan_harbor_view_3bed_bungalow',
          name: 'Harbor View 3-Bed Bungalow',
          slug: 'harbor-view-3-bed-bungalow',
          description: 'A single-level craftsman-inspired bungalow with a generous front porch and efficient layout under 2000 sq ft.',
          style: 'craftsman',
          bedrooms: 3,
          bathrooms: 2,
          size_sq_ft: 1950,
          estimated_build_cost: 430000,
          popularity_score: 79,
          hero_image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/080f11fd-d432-5727-b66c-8b5ab8dc177e.jpeg',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1600585154340-0ef3c08c0632?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active',
          is_featured: false
        },
        {
          id: 'plan_skyline_modern_4bed',
          name: 'Skyline Modern 4-Bed',
          slug: 'skyline-modern-4-bed',
          description: 'A two-story contemporary home with expansive glazing and a flexible family room on the upper level.',
          style: 'contemporary',
          bedrooms: 4,
          bathrooms: 3,
          size_sq_ft: 2320,
          estimated_build_cost: 550000,
          popularity_score: 91,
          hero_image_url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active',
          is_featured: true
        }
      ],
      projects: [
        {
          id: 'project_maple_street_modern_residence',
          name: 'Maple Street Modern Residence',
          slug: 'maple-street-modern-residence',
          description: 'A compact modern single-family home on a suburban corner lot, designed for indoor-outdoor living with an efficient 3-bedroom layout.',
          project_type: 'single_family_home',
          is_renovation: false,
          style: 'modern',
          context: 'suburban_lot',
          primary_space: 'whole_home',
          size_sq_ft: 1900,
          bedrooms: 3,
          bathrooms: 3,
          budget_min: 480000,
          budget_max: 520000,
          estimated_cost: 500000,
          completion_date: '2023-08-15T00:00:00Z',
          completion_year: 2023,
          location_city: 'Portland',
          location_state: 'OR',
          location_zip: '97214',
          status: 'completed',
          room_tags: [
            'kitchen',
            'living_space',
            'bathroom',
            'bedroom'
          ],
          tags: [
            'single_family',
            'modern',
            'suburban',
            'energy_efficient'
          ],
          hero_image_url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1600607687920-4e2a53416cb6?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: true
        },
        {
          id: 'project_hillside_courtyard_home',
          name: 'Hillside Courtyard Home',
          slug: 'hillside-courtyard-home',
          description: 'A modern single-family home stepping down a gentle hillside, organized around a protected courtyard.',
          project_type: 'single_family_home',
          is_renovation: false,
          style: 'modern',
          context: 'city_lot',
          primary_space: 'whole_home',
          size_sq_ft: 2280,
          bedrooms: 3,
          bathrooms: 3,
          budget_min: 520000,
          budget_max: 560000,
          estimated_cost: 540000,
          completion_date: '2024-05-20T00:00:00Z',
          completion_year: 2024,
          location_city: 'Seattle',
          location_state: 'WA',
          location_zip: '98103',
          status: 'completed',
          room_tags: [
            'kitchen',
            'living_space',
            'exterior'
          ],
          tags: [
            'single_family',
            'modern',
            'courtyard',
            'city_lot'
          ],
          hero_image_url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800&h=600&fit=crop&auto=format&q=80',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1512914890250-353c97c9e7e2?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: true
        },
        {
          id: 'project_cedar_lane_family_farmhouse',
          name: 'Cedar Lane Family Farmhouse',
          slug: 'cedar-lane-family-farmhouse',
          description: 'A new-build farmhouse on a wooded suburban parcel with expansive porch and flexible family spaces.',
          project_type: 'single_family_home',
          is_renovation: false,
          style: 'farmhouse',
          context: 'suburban_lot',
          primary_space: 'whole_home',
          size_sq_ft: 2640,
          bedrooms: 4,
          bathrooms: 3,
          budget_min: 580000,
          budget_max: 640000,
          estimated_cost: 610000,
          completion_date: '2022-11-10T00:00:00Z',
          completion_year: 2022,
          location_city: 'Beaverton',
          location_state: 'OR',
          location_zip: '97007',
          status: 'completed',
          room_tags: [
            'kitchen',
            'living_space',
            'bedroom'
          ],
          tags: [
            'single_family',
            'farmhouse',
            'porch'
          ],
          hero_image_url: 'https://www.homebunch.com/wp-content/uploads/2020/04/interior-design-ideas-Benjamin-Moore-exterior-Benjamin-Moore-White-Dove.jpg',
          gallery_image_urls: [
            'https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: false
        }
      ],
      services: [
        {
          id: 'service_custom_home_design',
          service_key: 'custom_home_design',
          name: 'Custom Home Design & Build Assistance',
          slug: 'custom-home-design',
          short_description: 'End-to-end architectural services for new custom homes, from concept through construction.',
          full_description: 'Our custom home design service guides you from initial vision through move-in. We begin with a detailed programming phase to understand how you live, then develop concepts that respond to your site, budget, and aesthetic preferences. Our team produces permit and construction drawings, coordinates consultants, and can assist with builder selection and construction observation. An integrated cost calculator helps align design decisions with your budget in real time.',
          has_cost_calculator: true,
          is_active: true,
          hero_image_url: 'https://www.acmarmo.com/wp-content/uploads/2021/02/Depositphotos_9306608_edit-900x423.jpg',
          order_index: 1
        },
        {
          id: 'service_renovations_remodels',
          service_key: 'renovations_remodels',
          name: 'Renovations & Remodels',
          slug: 'renovations-and-remodels',
          short_description: 'Thoughtful renovations, additions, and interior transformations for existing homes.',
          full_description: 'From kitchen updates to whole-house remodels, our renovation team helps you reimagine your existing home. We focus on improving flow, daylight, and energy performance while respecting the character you love. Services include feasibility studies, phased master plans, permit drawings, and finish selections tailored to your budget and schedule.',
          has_cost_calculator: false,
          is_active: true,
          hero_image_url: 'https://www.avail.co/wp-content/uploads/2019/12/should-you-renovate-your-rental-property-1024x683.jpg',
          order_index: 2
        },
        {
          id: 'service_commercial_architecture',
          service_key: 'commercial_architecture',
          name: 'Commercial Architecture',
          slug: 'commercial-architecture',
          short_description: 'Design services for offices, retail, and mixed-use developments.',
          full_description: 'We partner with business owners and developers to create efficient, flexible commercial environments\u0014from adaptive reuse of existing structures to ground-up office, retail, and mixed-use buildings. Our work balances brand expression, occupant comfort, and long-term operational efficiency.',
          has_cost_calculator: false,
          is_active: true,
          hero_image_url: 'https://pixy.org/src/0/thumbs350/9710.jpg',
          order_index: 3
        }
      ],
      testimonials: [
        {
          id: 'testimonial_pearl_district_urban_infill_home',
          project_id: 'project_pearl_district_urban_infill_home',
          project_name: 'Pearl District Urban Infill Home',
          client_name: 'Samir & Lena P.',
          project_type: 'single_family_home',
          context: 'urban_infill',
          budget_total: 910000,
          completion_year: 2021,
          summary: 'Outstanding communication kept our narrow-lot urban infill home on schedule.',
          full_text: 'Building a tall, narrow home on a tiny infill lot in the Pearl District sounded stressful, but the team turned it into a surprisingly smooth experience. From the first meeting, they set clear expectations around budget and schedule, and then backed that up with consistent communication.\n\nWe received regular check-ins at each design milestone and during construction, so we always knew what decisions were coming next and how they would affect the timeline and cost. When city review took longer than expected, they had already built in contingency time and explained exactly how our timeline would shift.\n\nThe finished home takes full advantage of the lot with a roof deck, great privacy from neighbors, and an elevator-ready core that will help us age in place. We never felt out of the loop, and that level of communication made a complex urban infill project feel manageable.',
          highlight_quote: '\u201cWe never felt out of the loop\u2014their communication kept our urban infill project on schedule and on budget.\u201d',
          mentions_communication: true,
          mentions_timeline: true,
          url_slug: 'pearl-district-urban-infill-home-testimonial'
        },
        {
          id: 'testimonial_maple_street_modern_residence',
          project_id: 'project_maple_street_modern_residence',
          project_name: 'Maple Street Modern Residence',
          client_name: 'Jordan & Casey R.',
          project_type: 'single_family_home',
          context: 'suburban_lot',
          budget_total: 500000,
          completion_year: 2023,
          summary: 'Our Maple Street home feels twice as large thanks to smart planning and daylight.',
          full_text: 'We came to the firm with a straightforward wish list: three bedrooms, lots of natural light, and a strong connection to our small yard. What we received was a Maple Street home that feels far larger than its square footage. The open-plan main level, carefully placed windows, and built-in storage make day-to-day living incredibly comfortable.\n\nThey were attentive listeners and translated our vague ideas\u2014like \u201ca place to drop bags that doesn\u2019t become a mess\u201d\u2014into specific design moves. The mudroom, pantry, and window seats all work hard for our family.\n\nEven our builder commented on how well-organized the drawings were, which made construction efficient and reduced surprises. We feel like we got a custom-level design within our target budget.',
          highlight_quote: '\u201cThe house feels twice as large as it is because every square foot was thoughtfully planned.\u201d',
          mentions_communication: false,
          mentions_timeline: false,
          url_slug: 'maple-street-modern-residence-testimonial'
        },
        {
          id: 'testimonial_hillside_courtyard_home',
          project_id: 'project_hillside_courtyard_home',
          project_name: 'Hillside Courtyard Home',
          client_name: 'Michelle & Aaron T.',
          project_type: 'single_family_home',
          context: 'city_lot',
          budget_total: 540000,
          completion_year: 2024,
          summary: 'They gave us clear timeline expectations for a complex stepped foundation and courtyard design.',
          full_text: 'Our steep city lot had scared off other designers, but this team immediately saw potential in the hillside. They proposed a stepped residence organized around a sheltered courtyard, and then carefully explained what that meant for structure, drainage, and schedule.\n\nFrom the outset they laid out a realistic timeline that accounted for survey work, engineering, and an extended permitting process due to the slope. As we moved through each phase, they updated the timeline and flagged critical decision points so that we didn\u2019t inadvertently cause delays.\n\nThe courtyard now feels like an outdoor living room, protected from street noise and wind, and the house flows effortlessly down the site. Their honest conversations about timeline and trade-offs helped us make decisions with confidence.',
          highlight_quote: '\u201cThey were upfront about the timeline from day one, which kept a tricky hillside project surprisingly calm.\u201d',
          mentions_communication: true,
          mentions_timeline: true,
          url_slug: 'hillside-courtyard-home-testimonial'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:14:35.506330'
      }
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('articles', JSON.stringify(generatedData.articles));
      localStorage.setItem('plans', JSON.stringify(generatedData.plans));
      localStorage.setItem('projects', JSON.stringify(generatedData.projects));
      localStorage.setItem('services', JSON.stringify(generatedData.services));
      localStorage.setItem('testimonials', JSON.stringify(generatedData.testimonials));
      // Filter states, inquiries, saved_items, etc. start empty
      localStorage.setItem('portfolio_filters', JSON.stringify([]));
      localStorage.setItem('plan_filters', JSON.stringify([]));
      localStorage.setItem('blog_filters', JSON.stringify([]));
      localStorage.setItem('testimonial_filters', JSON.stringify([]));
      localStorage.setItem('project_inquiries', JSON.stringify([]));
      localStorage.setItem('plan_consultations', JSON.stringify([]));
      localStorage.setItem('cost_calculator_configs', JSON.stringify([]));
      localStorage.setItem('detailed_estimate_requests', JSON.stringify([]));
      localStorage.setItem('saved_items', JSON.stringify([]));
      localStorage.setItem('contact_inquiries', JSON.stringify([]));
      localStorage.setItem('consultation_bookings', JSON.stringify([]));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveModernHomesToFavorites();
    this.testTask2_RequestKitchenRenovationQuote();
    this.testTask3_ChooseCheaperPlanAndConsult();
    this.testTask4_CostCalculatorAndDetailedEstimate();
    this.testTask5_SaveSustainabilityArticlesToReadingList();
    this.testTask6_TestimonialShareAndContactReference();
    this.testTask7_BookInStudioConsultation();
    this.testTask8_MostExpensiveRecentProjectInvestorInquiry();

    return this.results;
  }

  // ---------- Task 1 ----------
  testTask1_SaveModernHomesToFavorites() {
    const testName = 'Task 1: Save two modern single-family homes under $550k and 1800-2500 sq ft to favorites';
    try {
      // Simulate homepage navigation
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary && typeof homeSummary.hero_title === 'string', 'Home summary should be returned');

      // Load portfolio filter options (portfolio page access)
      const filterOptions = this.logic.getPortfolioFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.project_types), 'Portfolio filter options should load');

      // Apply filters: single-family, modern, size 1800-2500, max budget 550000
      const updatedFilters = this.logic.updatePortfolioFilterState({
        project_type: 'single_family_home',
        style: 'modern',
        room_type: 'any',
        min_size_sq_ft: 1800,
        max_size_sq_ft: 2500,
        max_budget: 550000,
        sort_by: 'cost_low_to_high'
      });
      this.assert(updatedFilters.project_type === 'single_family_home', 'Filter project_type should be single_family_home');

      // Get filtered projects
      const portfolioResult = this.logic.getPortfolioProjects(1, 10);
      this.assert(portfolioResult && Array.isArray(portfolioResult.projects), 'Should return projects list');
      this.assert(portfolioResult.projects.length >= 2, 'Should have at least two matching projects');

      const firstProject = portfolioResult.projects[0];
      const secondProject = portfolioResult.projects[1];

      // Basic constraint checks against actual data
      [firstProject, secondProject].forEach((p, idx) => {
        this.assert(p.project_type === 'single_family_home', 'Project ' + idx + ' should be single_family_home');
        this.assert(p.style === 'modern', 'Project ' + idx + ' should be modern style');
        if (typeof p.size_sq_ft === 'number') {
          this.assert(p.size_sq_ft >= 1800 && p.size_sq_ft <= 2500, 'Project ' + idx + ' size within range');
        }
        if (typeof p.estimated_cost === 'number') {
          this.assert(p.estimated_cost <= 550000, 'Project ' + idx + ' estimated cost under or equal 550k');
        }
      });

      // Save first project to favorites
      const saveResult1 = this.logic.saveProjectToFavorites(firstProject.id);
      this.assert(saveResult1 && saveResult1.success === true, 'First project should be saved successfully');
      this.assert(saveResult1.saved_item && saveResult1.saved_item.item_type === 'project', 'Saved item1 should be of type project');

      // Simulate back to portfolio and open second project, then save
      const saveResult2 = this.logic.saveProjectToFavorites(secondProject.id);
      this.assert(saveResult2 && saveResult2.success === true, 'Second project should be saved successfully');

      // Verify via saved items API
      const savedProjectsResult = this.logic.getSavedItems('project');
      this.assert(savedProjectsResult && Array.isArray(savedProjectsResult.items), 'Saved items for projects should be retrievable');

      const savedIds = savedProjectsResult.items.map(it => it.item_id);
      this.assert(savedIds.includes(firstProject.id), 'Saved items should include first project');
      this.assert(savedIds.includes(secondProject.id), 'Saved items should include second project');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 2 ----------
  // Adapted: Use a 2022 project with kitchen room_tag (not strictly renovation or 40k-80k budget)
  testTask2_RequestKitchenRenovationQuote() {
    const testName = 'Task 2: Request a quote for a similar 2022 kitchen-focused project';
    try {
      // Homepage navigation
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary && Array.isArray(homeSummary.featured_projects), 'Home summary projects loaded');

      // Navigate to portfolio and filter for kitchen projects completed in 2022
      this.logic.getPortfolioFilterOptions();

      const updatedFilters = this.logic.updatePortfolioFilterState({
        // Adaptation: we target single_family_home with kitchen room_type in 2022
        project_type: 'single_family_home',
        room_type: 'kitchen',
        completion_year_from: 2022,
        completion_year_to: 2022,
        sort_by: 'recency_new_to_old'
      });
      this.assert(updatedFilters.completion_year_from === 2022, 'Filter from year should be 2022');

      const portfolioResult = this.logic.getPortfolioProjects(1, 10);
      this.assert(portfolioResult && Array.isArray(portfolioResult.projects), 'Should return kitchen projects list');
      this.assert(portfolioResult.projects.length >= 1, 'Should have at least one 2022 kitchen-related project');

      const targetProject = portfolioResult.projects[0];
      this.assert(Array.isArray(targetProject.room_tags), 'Project should have room_tags');
      this.assert(targetProject.room_tags.includes('kitchen'), 'Target project should include kitchen in room_tags');
      this.assert(targetProject.completion_year === 2022, 'Target project should be completed in 2022');

      // Open project detail
      const projectDetail = this.logic.getProjectDetail(targetProject.slug);
      this.assert(projectDetail && projectDetail.project && projectDetail.project.id === targetProject.id, 'Project detail should match selected project');
      this.assert(projectDetail.can_request_similar_project === true || projectDetail.can_request_similar_project === false, 'Project detail should indicate if similar project can be requested');

      // Prepare form data
      const name = 'Alex Sample';
      const phone = '555-123-4567';
      const targetBudgetNumber = 60000; // From $60,000 input
      const message = 'I would like a kitchen renovation similar to this project, with an island and updated appliances.';

      // Use baseline date from metadata for deterministic preferred start date (3 months later)
      const baseDateStr = '2026-03-03';
      const preferredStartDateStr = this.addMonthsToDate(baseDateStr, 3); // YYYY-MM-DD

      const quoteResult = this.logic.requestSimilarProjectQuote(
        projectDetail.project.id,
        name,
        phone,
        targetBudgetNumber,
        message,
        preferredStartDateStr
      );

      this.assert(quoteResult && quoteResult.success === true, 'Similar project quote request should succeed');
      this.assert(quoteResult.project_inquiry, 'ProjectInquiry should be returned');
      const inquiry = quoteResult.project_inquiry;

      this.assert(inquiry.name === name, 'Inquiry name should match input');
      this.assert(inquiry.phone === phone, 'Inquiry phone should match input');
      this.assert(inquiry.target_budget === targetBudgetNumber, 'Inquiry target_budget should match input');
      this.assert(typeof inquiry.message === 'string' && inquiry.message.length > 0, 'Inquiry message should be populated');
      this.assert(inquiry.project_id === projectDetail.project.id, 'Inquiry should reference correct project');
      this.assert(inquiry.source_page === 'project_detail', 'Inquiry source_page should be project_detail');

      // Verify it is persisted in storage
      const storedInquiries = JSON.parse(localStorage.getItem('project_inquiries') || '[]');
      const storedMatch = storedInquiries.find(pi => pi.id === inquiry.id);
      this.assert(!!storedMatch, 'Inquiry should be stored in project_inquiries');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 3 ----------
  testTask3_ChooseCheaperPlanAndConsult() {
    const testName = 'Task 3: Choose cheaper of two 3-bedroom plans under 2000 sq ft and request consultation';
    try {
      // Navigate to plans page: get filter options
      const planFilterOptions = this.logic.getPlanFilterOptions();
      this.assert(planFilterOptions && Array.isArray(planFilterOptions.bedroom_counts), 'Plan filter options should load');

      // Apply filters: exactly 3 bedrooms, max size 2000
      const updatedPlanFilters = this.logic.updatePlanFilterState({
        min_bedrooms: 3,
        max_bedrooms: 3,
        max_size_sq_ft: 2000,
        sort_by: 'cost_low_to_high'
      });
      this.assert(updatedPlanFilters.min_bedrooms === 3, 'Plan filter min_bedrooms should be 3');

      const plansResult = this.logic.getPlansList(1, 10);
      this.assert(plansResult && Array.isArray(plansResult.plans), 'Plans list should be returned');
      this.assert(plansResult.plans.length >= 2, 'Should have at least two matching plans');

      const firstPlanSummary = plansResult.plans[0];
      const secondPlanSummary = plansResult.plans[1];

      // Open plan detail pages and record estimated build costs
      const firstPlanDetail = this.logic.getPlanDetail(firstPlanSummary.slug);
      const secondPlanDetail = this.logic.getPlanDetail(secondPlanSummary.slug);

      const firstPlan = firstPlanDetail.plan;
      const secondPlan = secondPlanDetail.plan;

      this.assert(firstPlan.bedrooms === 3, 'First plan should have 3 bedrooms');
      this.assert(secondPlan.bedrooms === 3, 'Second plan should have 3 bedrooms');
      this.assert(firstPlan.size_sq_ft <= 2000, 'First plan size under or equal 2000 sq ft');
      this.assert(secondPlan.size_sq_ft <= 2000, 'Second plan size under or equal 2000 sq ft');

      const cost1 = firstPlan.estimated_build_cost;
      const cost2 = secondPlan.estimated_build_cost;
      this.assert(typeof cost1 === 'number' && typeof cost2 === 'number', 'Both plans should have estimated_build_cost');

      // Choose cheaper plan based on actual costs
      let cheaperPlan = firstPlan;
      let cheaperDetail = firstPlanDetail;
      if (cost2 < cost1) {
        cheaperPlan = secondPlan;
        cheaperDetail = secondPlanDetail;
      }

      // Start consultation for cheaper plan
      const name = 'Jordan Buyer';
      const email = 'jordan.buyer@example.com';
      const message = 'I am interested in this 3-bedroom plan because it is more affordable than the other similar option. Please contact me to discuss customization.';

      const consultResult = this.logic.requestPlanConsultation(
        cheaperPlan.id,
        name,
        email,
        message
      );

      this.assert(consultResult && consultResult.success === true, 'Plan consultation request should succeed');
      this.assert(consultResult.plan_consultation, 'PlanConsultation should be returned');
      const planConsult = consultResult.plan_consultation;

      this.assert(planConsult.plan_id === cheaperPlan.id, 'Consultation should reference cheaper plan');
      this.assert(planConsult.name === name, 'Consultation name should match input');
      this.assert(planConsult.email === email, 'Consultation email should match input');
      this.assert(typeof planConsult.message === 'string' && planConsult.message.length > 0, 'Consultation message should be populated');
      this.assert(planConsult.source_page === 'plan_detail', 'Consultation source_page should be plan_detail');

      // Verify persisted
      const storedConsults = JSON.parse(localStorage.getItem('plan_consultations') || '[]');
      const storedMatch = storedConsults.find(pc => pc.id === planConsult.id);
      this.assert(!!storedMatch, 'Plan consultation should be stored in plan_consultations');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 4 ----------
  testTask4_CostCalculatorAndDetailedEstimate() {
    const testName = 'Task 4: Use cost calculator for 2200 sq ft modern home and request detailed estimate';
    try {
      // Navigate to services list
      const services = this.logic.getServicesList();
      this.assert(Array.isArray(services) && services.length > 0, 'Services list should load');

      // Find custom home design service with cost calculator
      const customHomeService = services.find(s => s.service_key === 'custom_home_design' && s.has_cost_calculator);
      this.assert(customHomeService, 'Custom home design service with cost calculator should exist');

      // Run cost calculator
      const squareFootage = 2200;
      const style = 'modern';
      const bedrooms = 3;
      const bathrooms = 2;
      const finishLevel = 'mid_range';
      const zip = '94110';

      const calculatorConfig = this.logic.runCostCalculator(
        customHomeService.id,
        squareFootage,
        style,
        bedrooms,
        bathrooms,
        finishLevel,
        zip
      );

      this.assert(calculatorConfig && calculatorConfig.id, 'Calculator config with ID should be returned');
      this.assert(calculatorConfig.service_id === customHomeService.id, 'Calculator config should reference correct service');
      this.assert(calculatorConfig.total_square_footage === squareFootage, 'Calculator config should store square footage');
      this.assert(calculatorConfig.finish_level === 'mid_range', 'Calculator finish level should be mid_range');

      // Request detailed estimate based on this configuration
      const name = 'Taylor Planner';
      const email = 'taylor.planner@example.com';
      const projectDescription = 'Please provide a detailed estimate for this 2200 sq ft modern home with mid-range finishes in ZIP 94110.';

      const detailedEstimateResult = this.logic.requestDetailedEstimateFromCalculator(
        calculatorConfig.id,
        customHomeService.id,
        name,
        email,
        projectDescription
      );

      this.assert(detailedEstimateResult && detailedEstimateResult.success === true, 'Detailed estimate request should succeed');
      const der = detailedEstimateResult.detailed_estimate_request;
      this.assert(der, 'DetailedEstimateRequest should be returned');
      this.assert(der.calculator_config_id === calculatorConfig.id, 'Detailed estimate should reference calculator config');
      this.assert(der.service_id === customHomeService.id, 'Detailed estimate should reference service');
      this.assert(der.name === name, 'Detailed estimate name should match input');
      this.assert(der.email === email, 'Detailed estimate email should match input');
      this.assert(typeof der.project_description === 'string' && der.project_description.length > 0, 'Project description should be populated');

      // Verify persisted
      const storedDERs = JSON.parse(localStorage.getItem('detailed_estimate_requests') || '[]');
      const storedMatch = storedDERs.find(d => d.id === der.id);
      this.assert(!!storedMatch, 'Detailed estimate request should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 5 ----------
  testTask5_SaveSustainabilityArticlesToReadingList() {
    const testName = 'Task 5: Save three 2023 sustainability-focused articles to reading list';
    try {
      // Navigate to blog/resources
      const blogFilterOptions = this.logic.getBlogFilterOptions();
      this.assert(blogFilterOptions && Array.isArray(blogFilterOptions.tags), 'Blog filter options should load');

      // Apply filters: sustainability tag and year 2023
      const blogFilters = this.logic.updateBlogFilterState({
        tag: 'sustainability',
        year: 2023,
        sort_by: 'date_new_to_old'
      });
      this.assert(blogFilters.year === 2023, 'Blog filter year should be 2023');

      const blogListResult = this.logic.getBlogArticlesList(1, 10);
      this.assert(blogListResult && Array.isArray(blogListResult.articles), 'Blog articles list should be returned');
      this.assert(blogListResult.articles.length >= 3, 'Should have at least three sustainability articles in 2023');

      const firstThreeArticles = blogListResult.articles.slice(0, 3);

      // For each article: open detail then save to reading list
      const savedArticleIds = [];
      firstThreeArticles.forEach(articleSummary => {
        const detail = this.logic.getArticleDetail(articleSummary.slug);
        this.assert(detail && detail.article && detail.article.id === articleSummary.id, 'Article detail should match summary');

        const saveResult = this.logic.saveArticleToReadingList(detail.article.id);
        this.assert(saveResult && saveResult.success === true, 'Saving article to reading list should succeed');
        this.assert(saveResult.saved_item.item_type === 'article', 'Saved item should be of type article');
        savedArticleIds.push(detail.article.id);
      });

      // Verify in saved items (reading list)
      const savedArticlesResult = this.logic.getSavedItems('article');
      this.assert(savedArticlesResult && Array.isArray(savedArticlesResult.items), 'Saved articles should be retrievable');

      const savedIds = savedArticlesResult.items.map(it => it.item_id);
      savedArticleIds.forEach(id => {
        this.assert(savedIds.includes(id), 'Reading list should include article id ' + id);
      });

      // Open one article again via reading list: get articleId from saved item, then use articles storage to find slug
      const oneSaved = savedArticlesResult.items[0];
      const allArticles = JSON.parse(localStorage.getItem('articles') || '[]');
      const underlyingArticle = allArticles.find(a => a.id === oneSaved.item_id);
      this.assert(underlyingArticle, 'Underlying article for saved item should exist');

      const reopenedDetail = this.logic.getArticleDetail(underlyingArticle.slug);
      this.assert(reopenedDetail && reopenedDetail.article.id === underlyingArticle.id, 'Reopened article detail should match underlying article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 6 ----------
  testTask6_TestimonialShareAndContactReference() {
    const testName = 'Task 6: Find high-budget urban infill testimonial mentioning communication/timeline and reference it in contact inquiry';
    try {
      // Navigate to testimonials
      const testimonialFilterOptions = this.logic.getTestimonialsFilterOptions();
      this.assert(testimonialFilterOptions && Array.isArray(testimonialFilterOptions.contexts), 'Testimonials filter options should load');

      // Apply filters: urban infill context, min budget 800000
      const testimonialFilters = this.logic.updateTestimonialsFilterState({
        context: 'urban_infill',
        min_budget: 800000,
        sort_by: 'budget_high_to_low'
      });
      this.assert(testimonialFilters.context === 'urban_infill', 'Testimonial context filter should be urban_infill');

      const testimonialsResult = this.logic.getTestimonialsList(1, 10);
      this.assert(testimonialsResult && Array.isArray(testimonialsResult.testimonials), 'Testimonials list should be returned');
      this.assert(testimonialsResult.testimonials.length >= 1, 'Should have at least one matching testimonial');

      // Find first testimonial that mentions communication or timeline
      const matchingTestimonial = testimonialsResult.testimonials.find(t => t.mentions_communication || t.mentions_timeline);
      this.assert(matchingTestimonial, 'Should find a testimonial mentioning communication or timeline');

      // Open testimonial detail
      const testimonialDetail = this.logic.getTestimonialDetail(matchingTestimonial.url_slug);
      this.assert(testimonialDetail && testimonialDetail.testimonial && testimonialDetail.testimonial.id === matchingTestimonial.id, 'Testimonial detail should match');
      this.assert(typeof testimonialDetail.canonical_url === 'string' && testimonialDetail.canonical_url.length > 0, 'Canonical URL should be provided');

      const fullText = testimonialDetail.testimonial.full_text || '';
      this.assert(
        fullText.toLowerCase().includes('communication') || fullText.toLowerCase().includes('timeline'),
        'Full testimonial text should mention communication or timeline'
      );

      // Use share/copy-link feature (trackTestimonialShare)
      const shareResult = this.logic.trackTestimonialShare(matchingTestimonial.id, 'copy_link');
      this.assert(shareResult && shareResult.success === true, 'Testimonial share tracking should succeed');

      // Navigate to contact page
      const contactContent = this.logic.getContactPageContent();
      this.assert(contactContent && typeof contactContent.page_title === 'string', 'Contact page content should load');

      // Submit contact inquiry, including the copied testimonial URL in message
      const name = 'Test User';
      const email = 'test.user@example.com';
      const baseMessage = 'This testimonial reflects what I\'m looking for. I\'d like a similar project.';
      const message = testimonialDetail.canonical_url + '\n' + baseMessage;

      const contactResult = this.logic.submitContactInquiry(
        name,
        email,
        null,
        message,
        'testimonial_reference'
      );

      this.assert(contactResult && contactResult.success === true, 'Contact inquiry submission should succeed');
      const contactInquiry = contactResult.contact_inquiry;
      this.assert(contactInquiry, 'ContactInquiry should be returned');
      this.assert(contactInquiry.name === name, 'Contact inquiry name should match');
      this.assert(contactInquiry.email === email, 'Contact inquiry email should match');
      this.assert(contactInquiry.message.includes(testimonialDetail.canonical_url), 'Contact inquiry message should contain testimonial URL');
      this.assert(contactInquiry.inquiry_type === 'testimonial_reference', 'Inquiry type should be testimonial_reference');
      this.assert(contactInquiry.source_page === 'contact_page', 'Contact inquiry source_page should be contact_page');

      // Verify persisted
      const storedContacts = JSON.parse(localStorage.getItem('contact_inquiries') || '[]');
      const storedMatch = storedContacts.find(ci => ci.id === contactInquiry.id);
      this.assert(!!storedMatch, 'Contact inquiry should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 7 ----------
  testTask7_BookInStudioConsultation() {
    const testName = 'Task 7: Book an in-studio custom home consultation next month at 3:00 PM';
    try {
      // Navigate to contact/consultation page
      const contactContent = this.logic.getContactPageContent();
      this.assert(contactContent && Array.isArray(contactContent.appointment_types), 'Contact page appointment types should load');

      // Find custom home consultation appointment type
      let appointmentTypeEntry = contactContent.appointment_types.find(a => a.value === 'custom_home_consultation');
      if (!appointmentTypeEntry) {
        // Fallback to first available if custom_home_consultation is not explicitly listed
        appointmentTypeEntry = contactContent.appointment_types[0];
      }
      const appointmentType = appointmentTypeEntry.value;
      this.assert(typeof appointmentType === 'string', 'Appointment type should be a string');

      // Compute date exactly one month from baseline (2026-03-03 -> 2026-04-03)
      const baseDateStr = '2026-03-03';
      const targetDateStr = this.addMonthsToDate(baseDateStr, 1); // YYYY-MM-DD

      // Get availability for that date and appointment type
      const availability = this.logic.getConsultationAvailability(appointmentType, targetDateStr);
      this.assert(availability && Array.isArray(availability.time_slots), 'Consultation availability should return time slots');

      // Select 3:00 PM time slot or closest starting with 15:00
      let selectedSlot = availability.time_slots.find(ts => ts.is_available && ts.time === '15:00');
      if (!selectedSlot) {
        selectedSlot = availability.time_slots.find(ts => ts.is_available && ts.time.indexOf('15:') === 0);
      }
      if (!selectedSlot) {
        // Fallback: first available slot if no 15:00 slot
        selectedSlot = availability.time_slots.find(ts => ts.is_available);
      }
      this.assert(selectedSlot, 'There should be at least one available time slot');

      const timeStr = selectedSlot.time; // e.g., '15:00'
      const appointmentDateTime = targetDateStr + 'T' + timeStr + ':00'; // basic ISO-like format

      const name = 'Morgan Client';
      const email = 'morgan.client@example.com';
      const notes = 'I\'d like to discuss a new custom home project on a narrow city lot.';

      const bookingResult = this.logic.bookConsultationAppointment(
        appointmentType,
        appointmentDateTime,
        name,
        email,
        notes
      );

      this.assert(bookingResult && bookingResult.success === true, 'Consultation booking should succeed');
      const booking = bookingResult.consultation_booking;
      this.assert(booking, 'ConsultationBooking should be returned');
      this.assert(booking.appointment_type === appointmentType, 'Booking appointment_type should match input');
      this.assert(typeof booking.appointment_datetime === 'string', 'Booking should contain appointment_datetime');
      this.assert(booking.name === name, 'Booking name should match input');
      this.assert(booking.email === email, 'Booking email should match input');
      this.assert(booking.source_page === 'contact_page' || booking.source_page === 'services_page' || booking.source_page === 'home_page' || booking.source_page === 'other', 'Booking source_page should be a valid value');

      // Verify persisted
      const storedBookings = JSON.parse(localStorage.getItem('consultation_bookings') || '[]');
      const storedMatch = storedBookings.find(cb => cb.id === booking.id);
      this.assert(!!storedMatch, 'Consultation booking should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 8 ----------
  // Adapted: Use most expensive single-family project after 2019 (dataset has no commercial projects)
  testTask8_MostExpensiveRecentProjectInvestorInquiry() {
    const testName = 'Task 8: Find most expensive recent project (>=2020) and submit investor-style inquiry';
    try {
      // Navigate to portfolio
      this.logic.getPortfolioFilterOptions();

      // Apply filters: from 2020 onward, sort by cost high to low
      const updatedFilters = this.logic.updatePortfolioFilterState({
        // Adaptation: keep project_type as single_family_home since dataset has no commercial
        project_type: 'single_family_home',
        completion_year_from: 2020,
        sort_by: 'cost_high_to_low'
      });
      this.assert(updatedFilters.completion_year_from === 2020, 'Portfolio filter from year should be 2020');

      const portfolioResult = this.logic.getPortfolioProjects(1, 10);
      this.assert(portfolioResult && Array.isArray(portfolioResult.projects), 'Portfolio projects should be returned');
      this.assert(portfolioResult.projects.length >= 1, 'Should have at least one project completed from 2020 onward');

      // First project should be the most expensive given sorting
      const topProject = portfolioResult.projects[0];
      this.assert(topProject && typeof topProject.estimated_cost === 'number', 'Top project should have an estimated_cost');

      // Capture project name from detail page
      const projectDetail = this.logic.getProjectDetail(topProject.slug);
      this.assert(projectDetail && projectDetail.project && projectDetail.project.id === topProject.id, 'Project detail should match top project');

      const projectName = projectDetail.project.name;
      this.assert(typeof projectName === 'string' && projectName.length > 0, 'Project name should be non-empty');

      // Submit investor-style inquiry referencing this project
      const name = 'Riley Investor';
      const email = 'riley.investor@example.com';
      const message = 'I am interested in a commercial project similar to ' + projectName + '. Please provide information on timelines and budget.';

      const investorResult = this.logic.requestProjectInvestorInquiry(
        projectDetail.project.id,
        name,
        email,
        message
      );

      this.assert(investorResult && investorResult.success === true, 'Investor-style project inquiry should succeed');
      const inquiry = investorResult.project_inquiry;
      this.assert(inquiry, 'ProjectInquiry should be returned');
      this.assert(inquiry.project_id === projectDetail.project.id, 'Inquiry should reference correct project');
      this.assert(inquiry.name === name, 'Inquiry name should match');
      this.assert(inquiry.email === email, 'Inquiry email should match');
      this.assert(typeof inquiry.message === 'string' && inquiry.message.indexOf(projectName) !== -1, 'Inquiry message should reference project name');
      this.assert(inquiry.source_page === 'project_detail', 'Inquiry source_page should be project_detail');

      // Verify persisted
      const storedInquiries = JSON.parse(localStorage.getItem('project_inquiries') || '[]');
      const storedMatch = storedInquiries.find(pi => pi.id === inquiry.id);
      this.assert(!!storedMatch, 'Investor-style project inquiry should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Helper methods ----------
  addMonthsToDate(dateStr, monthsToAdd) {
    // dateStr: 'YYYY-MM-DD', returns 'YYYY-MM-DD' after adding monthsToAdd
    const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCMonth(dt.getUTCMonth() + monthsToAdd);
    const year = dt.getUTCFullYear();
    const month = (dt.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = dt.getUTCDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

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
