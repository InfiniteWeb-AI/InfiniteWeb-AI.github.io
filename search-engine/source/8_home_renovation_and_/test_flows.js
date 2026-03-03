// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is expected to be available in the Node.js environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear and initialise storage
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided, mapped to storage keys
    const generatedData = {
      articles: [
        {
          id: 'art_planning_permits_extensions_2024',
          title: 'Planning Permits for Rear and Side Extensions in 2024: Step-by-Step Guide',
          slug: 'planning-permits-rear-side-extensions-2024',
          content: 'Extending your home usually triggers local planning and building rules. This 2024 guide walks through when you need a planning permit, when a building permit is enough, and how rear and side extensions are assessed.\n\nWe cover:\n- How to check your zoning and overlays\n- Typical rear extension setbacks and height limits\n- How shadowing, overlooking and site coverage are assessed\n- What documents you need for a planning permit application\n- How long permits usually take and common reasons for delays\n\nPlanning permit vs building permit\nA planning permit deals with how your extension affects the streetscape, neighbours and neighbourhood character. A building permit confirms that the proposed work complies with the Building Code and structural safety requirements.\n\nWhen is a planning permit required for an extension?\nYou typically need a planning permit if:\n- Your property is in a zone or overlay that controls development intensity or heritage\n- You are increasing site coverage beyond local thresholds\n- The rear extension exceeds height or setback limits\n\nWorking with a registered builder who understands planning permit extension requirements will minimise delays. A good builder will coordinate with your designer, prepare the documentation and communicate with council on your behalf.',
          excerpt: 'Learn exactly when you need a planning permit for rear or side extensions in 2024, what councils look for, and how to avoid common delays.',
          published_at: '2024-02-10T08:30:00Z',
          year: 2024,
          categories: ['permits', 'extensions'],
          tags: [
            'planning permit extension',
            'planning permits',
            'rear extension',
            'side extension',
            'council approval'
          ],
          featured_image: 'https://images.unsplash.com/photo-1600585154340-0ef3c08c0632?w=800&h=600&fit=crop&auto=format&q=80',
          is_published: true
        },
        {
          id: 'art_planning_permits_extensions_2020',
          title: 'Do I Need a Planning Permit for a Rear Extension? (2020 Rules)',
          slug: 'planning-permit-rear-extension-2020',
          content: 'This article explains the 2020-era rules for rear extensions, including when planning permits were required, how private open space and overlooking rules were applied, and what exemptions existed for small additions.',
          excerpt: 'A look back at the 2020 requirements for planning permits on rear extensions.',
          published_at: '2020-06-15T10:00:00Z',
          year: 2020,
          categories: ['permits', 'extensions'],
          tags: [
            'planning permits',
            'rear extension',
            'town planning'
          ],
          featured_image: 'https://i.pinimg.com/originals/01/6a/91/016a911052f96bbd54996ad20783e68c.jpg',
          is_published: true
        },
        {
          id: 'art_kitchen_budget_renovation_2023',
          title: 'Designing a Kitchen Renovation on a $35,000 Budget',
          slug: 'kitchen-renovation-35000-budget',
          content: 'A $35,000 budget can deliver a high-impact kitchen renovation when you prioritise layout, storage and lighting. This guide breaks down where to spend and where to save, including joinery choices, benchtop materials and appliance packages.',
          excerpt: 'Practical tips for planning a stylish kitchen renovation on a $35k budget.',
          published_at: '2023-03-22T09:15:00Z',
          year: 2023,
          categories: ['kitchen', 'budgeting'],
          tags: [
            'kitchen renovation',
            'budget',
            'planning',
            'costs'
          ],
          featured_image: 'https://www.freshpalace.com/wp-content/uploads/2013/08/Kitchen-Dining-Open-Plan-Extension-in-Melbourne-Australia.jpg',
          is_published: true
        }
      ],
      faq_items: [
        {
          id: 'faq_bathroom_renovation_warranty',
          question: 'What warranty do you offer on premium bathroom renovations?',
          answer: 'All premium bathroom renovations come with a comprehensive warranty package. This includes:\n\n- 10-year structural warranty on framing and substrates\n- 7-year waterproofing warranty on membranes and wet area detailing\n- 7-year warranty on workmanship\n- Manufacturer warranties on fixtures and fittings as specified in your contract\n\nYour warranty is valid provided that the bathroom is used and maintained in line with the care instructions we provide at handover. If you notice any defects or concerns, contact our team as soon as possible so we can assess and, where required, carry out warranty works.',
          slug: 'bathroom-renovation-warranty',
          category: 'warranty',
          keywords: [
            'bathroom warranty',
            'bathroom renovation warranty',
            'waterproofing warranty',
            'warranty period'
          ],
          has_contact_link: true,
          sort_order: 1
        },
        {
          id: 'faq_kitchen_renovation_warranty',
          question: 'What warranty is included with kitchen renovations?',
          answer: 'Our kitchen renovations include a 7-year workmanship warranty and structural warranty in line with Victorian regulations. Hardware such as hinges, runners and appliances are covered by manufacturer warranties, which we pass on to you at handover.',
          slug: 'kitchen-renovation-warranty',
          category: 'warranty',
          keywords: [
            'kitchen warranty',
            'appliance warranty',
            'renovation warranty'
          ],
          has_contact_link: false,
          sort_order: 2
        },
        {
          id: 'faq_extensions_structural_warranty',
          question: 'Is structural work on extensions covered by warranty?',
          answer: 'Yes. All structural work on extensions, including new footings, framing and roof structures, is covered by our 10-year structural warranty, subject to normal use and maintenance.',
          slug: 'extensions-structural-warranty',
          category: 'extensions',
          keywords: [
            'structural warranty',
            'extension warranty',
            'rear extension'
          ],
          has_contact_link: false,
          sort_order: 3
        }
      ],
      packages: [
        {
          id: 'pkg_ext_rear_eco_20sqm',
          name: 'Eco Rear Extension 20 sqm',
          slug: 'eco-rear-extension-20-sqm',
          category_id: 'extensions',
          project_type: 'rear_extension',
          extension_type: 'rear_extension',
          price: 62000,
          size_sqm: 20,
          added_floor_area_sqm: 20,
          description: 'Compact 20 sqm rear extension ideal for adding a light-filled dining nook or study. Includes slab, framing, plaster, windows and external cladding.',
          inclusions: [
            '20 sqm slab and timber frame',
            'Double-glazed aluminium windows',
            'Insulation to current energy standards',
            'Plasterboard and painting to new areas',
            'Connection to existing electrical circuit'
          ],
          images: [
            'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          rating: 4.5,
          is_featured: true,
          is_active: true
        },
        {
          id: 'pkg_ext_rear_standard_25sqm',
          name: 'Standard Rear Extension 25 sqm',
          slug: 'standard-rear-extension-25-sqm',
          category_id: 'extensions',
          project_type: 'rear_extension',
          extension_type: 'rear_extension',
          price: 72000,
          size_sqm: 25,
          added_floor_area_sqm: 25,
          description: 'Versatile 25 sqm rear extension suited to open-plan living with space for a meals area and flexible lounge.',
          inclusions: [
            'Engineered slab and framing',
            'Stacker door to backyard',
            'R5.0 ceiling insulation and R2.5 walls',
            'Floating timber-look flooring',
            'LED downlights and power points'
          ],
          images: [
            'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          rating: 4.7,
          is_featured: true,
          is_active: true
        },
        {
          id: 'pkg_ext_rear_value_30sqm',
          name: 'Value Rear Extension 30 sqm',
          slug: 'value-rear-extension-30-sqm',
          category_id: 'extensions',
          project_type: 'rear_extension',
          extension_type: 'rear_extension',
          price: 79000,
          size_sqm: 30,
          added_floor_area_sqm: 30,
          description: 'A 30 sqm rear extension designed for an open-plan kitchen and living upgrade, ready for your preferred joinery and appliance selections.',
          inclusions: [
            'Full structural shell and lock-up',
            'Roofing tied into existing structure',
            'Plumbing rough-in for future kitchen',
            'Electrical rough-in for appliances and lighting',
            'Plaster and painting to new walls and ceilings'
          ],
          images: [
            'https://images.unsplash.com/photo-1600585154316-7134a3a9c4d7?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          rating: 4.6,
          is_featured: false,
          is_active: true
        }
      ],
      projects: [
        {
          id: 'proj_loft_northcote_2023',
          title: 'Northcote Loft Conversion with Ensuite',
          slug: 'northcote-loft-conversion-ensuite',
          project_type: 'loft_conversion',
          completion_year: 2023,
          completion_date: '2023-08-15T00:00:00Z',
          rating: 4.7,
          location: 'Northcote, VIC',
          floor_area_sqm: 30,
          description: 'Conversion of unused roof space into a spacious master bedroom with walk-in robe and ensuite, featuring Velux skylights and engineered oak flooring.',
          images: [
            'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: true
        },
        {
          id: 'proj_loft_brunswick_2024',
          title: 'Brunswick Terrace Loft Conversion',
          slug: 'brunswick-terrace-loft-conversion',
          project_type: 'loft_conversion',
          completion_year: 2024,
          completion_date: '2024-03-22T00:00:00Z',
          rating: 4.9,
          location: 'Brunswick, VIC',
          floor_area_sqm: 28,
          description: 'Loft conversion in a narrow terrace house, adding two children\'s bedrooms and a shared study nook under a new dormer roof.',
          images: [
            'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: true
        },
        {
          id: 'proj_loft_richmond_2025',
          title: 'Richmond Warehouse Loft Conversion',
          slug: 'richmond-warehouse-loft-conversion',
          project_type: 'loft_conversion',
          completion_year: 2025,
          completion_date: '2025-01-30T00:00:00Z',
          rating: 4.6,
          location: 'Richmond, VIC',
          floor_area_sqm: 35,
          description: 'Industrial-inspired loft conversion within a converted warehouse, featuring exposed beams, steel balustrades and a new home office mezzanine.',
          images: [
            'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_featured: false
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:13:32.779882'
      }
    };

    // Populate localStorage with generated data using correct storage keys
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('faq_items', JSON.stringify(generatedData.faq_items));
    localStorage.setItem('packages', JSON.stringify(generatedData.packages));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects));

    // Ensure all other collections are initialised as empty arrays
    const otherKeys = [
      'package_shortlists',
      'package_shortlist_items',
      'package_compare_sets',
      'package_compare_items',
      'quote_requests',
      'consultation_bookings',
      'ideas_lists',
      'ideas_list_items',
      'cost_estimates',
      'cost_estimate_emails',
      'reading_lists',
      'reading_list_items',
      'contact_messages',
      'renovation_plans',
      'renovation_plan_projects'
    ];

    otherKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests (all tasks)
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestQuoteCheapestRearExtension();
    this.testTask2_BookWeekdayAfternoonConsultationCheapestPackage();
    this.testTask3_ChooseLargerFloorAreaExtensionAndShortlist();
    this.testTask4_SaveThreeLoftConversionsToIdeas();
    this.testTask5_GenerateCostEstimateAndEmailSummary();
    this.testTask6_SaveAndReopenPlanningPermitArticle();
    this.testTask7_FindBathroomWarrantyFaqAndSendFollowUp();
    this.testTask8_CreateMultiProjectRenovationPlan();

    return this.results;
  }

  // Task 1: Request a quote for the cheapest 20–30 sqm rear extension under $80,000
  testTask1_RequestQuoteCheapestRearExtension() {
    const testName = 'Task 1: Quote request for cheapest 20-30 sqm rear extension under 80k';
    try {
      // Simulate landing on homepage
      const homepage = this.logic.getHomepageOverview();
      this.assert(homepage && typeof homepage === 'object', 'Homepage overview should return an object');

      // Get filter options for extensions (simulating UI filter controls)
      const filterOptions = this.logic.getPackageFilterOptions('extensions');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get package filter options for extensions');

      // List rear extension packages 20–30 sqm under 80k, sorted by price asc
      const listResult = this.logic.listPackages(
        'extensions',
        {
          extension_type: 'rear_extension',
          min_size_sqm: 20,
          max_size_sqm: 30,
          max_price: 80000
        },
        'price_asc',
        1,
        20
      );

      this.assert(Array.isArray(listResult.items), 'listPackages should return items array');
      this.assert(listResult.items.length > 0, 'There should be at least one rear extension package matching filters');

      // Verify all returned items meet the filter constraints using actual data
      listResult.items.forEach((pkg) => {
        this.assert(pkg.extension_type === 'rear_extension', 'Package should be a rear extension');
        this.assert(pkg.size_sqm >= 20 && pkg.size_sqm <= 30, 'Package size should be within 20-30 sqm');
        this.assert(pkg.price <= 80000, 'Package price should be <= 80000');
      });

      // Select the cheapest package (first in price_asc list)
      const cheapest = listResult.items[0];
      this.assert(!!cheapest.id, 'Cheapest package should have an id');

      // Simulate opening package detail page
      const pkgDetails = this.logic.getPackageDetails(cheapest.id);
      this.assert(pkgDetails && pkgDetails.package && pkgDetails.package.id === cheapest.id, 'Should load correct package details');

      // Submit quote request with specified details
      const quoteResult = this.logic.submitQuoteRequest(
        cheapest.id,
        'Test User',
        'user@example.com',
        '0400000000',
        '3000',
        80000,
        '25 sqm rear extension with open-plan kitchen'
      );

      this.assert(quoteResult && quoteResult.success === true, 'Quote request should succeed');
      this.assert(quoteResult.quote_request, 'Quote request payload should be returned');

      const qr = quoteResult.quote_request;
      this.assert(qr.package_id === cheapest.id, 'QuoteRequest.package_id should match selected package');
      this.assert(qr.postcode === '3000', 'QuoteRequest.postcode should match submitted postcode');
      this.assert(qr.budget === 80000, 'QuoteRequest.budget should match submitted budget');
      this.assert(
        typeof qr.note === 'string' && qr.note.indexOf('open-plan kitchen') !== -1,
        'QuoteRequest.note should contain the custom note text'
      );

      // Verify persistence in storage using actual returned id
      const storedQuotes = JSON.parse(localStorage.getItem('quote_requests') || '[]');
      this.assert(Array.isArray(storedQuotes), 'quote_requests in storage should be an array');
      const storedQr = storedQuotes.find((q) => q.id === qr.id);
      this.assert(!!storedQr, 'Stored quote_requests should contain the created quote');
      this.assert(storedQr.package_id === cheapest.id, 'Stored QuoteRequest should reference the correct package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Book a weekday afternoon consultation for the cheapest available package
  // Note: Generated data has only extension packages, so we adapt to use the cheapest extension package
  testTask2_BookWeekdayAfternoonConsultationCheapestPackage() {
    const testName = 'Task 2: Book weekday afternoon consultation for cheapest package';
    try {
      // List all extension packages and sort by price ascending
      const listResult = this.logic.listPackages('extensions', {}, 'price_asc', 1, 20);
      this.assert(Array.isArray(listResult.items), 'listPackages should return items array');
      this.assert(listResult.items.length > 0, 'There should be at least one package to book consultation for');

      const cheapest = listResult.items[0];
      this.assert(!!cheapest.id, 'Cheapest package should have an id');

      // Determine a date range for availability (generic future month range)
      const fromDate = '2026-03-01';
      const toDate = '2026-03-31';

      // Use the actual project_type from the package when checking availability
      const availability = this.logic.getConsultationAvailability(
        cheapest.id,
        cheapest.project_type,
        fromDate,
        toDate
      );

      this.assert(availability && Array.isArray(availability.slots), 'Availability should return slots array');

      // Pick the first available weekday afternoon slot
      const afternoonWeekdaySlot = availability.slots.find((slot) => {
        return (
          slot.is_available === true &&
          slot.is_weekday === true &&
          slot.time_of_day === 'afternoon'
        );
      });

      this.assert(!!afternoonWeekdaySlot, 'There should be at least one available weekday afternoon slot');

      // Book consultation using the selected slot
      const bookingResult = this.logic.submitConsultationBooking(
        cheapest.id,
        cheapest.project_type,
        afternoonWeekdaySlot.date,
        afternoonWeekdaySlot.time_slot_label,
        afternoonWeekdaySlot.time_of_day,
        'Test User',
        'user@example.com',
        '0400000000'
      );

      this.assert(bookingResult && bookingResult.success === true, 'Consultation booking should succeed');
      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Booking object with id should be returned');
      this.assert(booking.package_id === cheapest.id, 'Booking.package_id should match selected package');
      this.assert(booking.time_of_day === 'afternoon', 'Booking should be in the afternoon');

      // Verify booking persisted in storage
      const storedBookings = JSON.parse(localStorage.getItem('consultation_bookings') || '[]');
      this.assert(Array.isArray(storedBookings), 'consultation_bookings in storage should be an array');
      const storedBooking = storedBookings.find((b) => b.id === booking.id);
      this.assert(!!storedBooking, 'Stored consultation_bookings should contain the created booking');
      this.assert(storedBooking.package_id === cheapest.id, 'Stored booking should reference the correct package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Choose the larger floor-area extension package under $120,000 and save to shortlist
  testTask3_ChooseLargerFloorAreaExtensionAndShortlist() {
    const testName = 'Task 3: Compare two extensions and shortlist larger floor area';
    try {
      // Filter extensions under 120k
      const listResult = this.logic.listPackages(
        'extensions',
        { max_price: 120000 },
        'price_asc',
        1,
        20
      );

      this.assert(Array.isArray(listResult.items), 'listPackages should return items array');
      const eligible = listResult.items.filter((pkg) => pkg.price <= 120000);
      this.assert(eligible.length >= 2, 'Need at least two extension packages under 120k for comparison');

      const firstTwo = eligible.slice(0, 2);

      // Add first two to compare set
      firstTwo.forEach((pkg) => {
        const compareResult = this.logic.addPackageToCompare(pkg.id);
        this.assert(compareResult && compareResult.success === true, 'addPackageToCompare should succeed');
        this.assert(Array.isArray(compareResult.items), 'Compare set items should be an array');
      });

      // Get active compare set and its items
      const activeCompare = this.logic.getActiveCompareSet();
      this.assert(activeCompare && Array.isArray(activeCompare.items), 'Active compare set should have items array');
      this.assert(activeCompare.items.length === 2, 'Compare set should contain exactly two items');

      const comparedPackages = activeCompare.items;
      comparedPackages.forEach((pkg) => {
        this.assert(
          typeof pkg.added_floor_area_sqm === 'number',
          'Compared packages should have added_floor_area_sqm defined'
        );
      });

      // Choose the package with the larger added floor area
      const largerFloorAreaPackage = comparedPackages.reduce((prev, curr) => {
        return curr.added_floor_area_sqm > prev.added_floor_area_sqm ? curr : prev;
      });

      // Open detail view for the chosen package
      const pkgDetails = this.logic.getPackageDetails(largerFloorAreaPackage.id);
      this.assert(pkgDetails && pkgDetails.package.id === largerFloorAreaPackage.id, 'Should load details for larger floor area package');

      // Save that package to shortlist
      const shortlistResult = this.logic.addPackageToShortlist(largerFloorAreaPackage.id);
      this.assert(shortlistResult && shortlistResult.success === true, 'addPackageToShortlist should succeed');
      this.assert(Array.isArray(shortlistResult.shortlist), 'Shortlist response should contain items array');

      // Verify via getPackageShortlist
      const shortlistDisplay = this.logic.getPackageShortlist();
      this.assert(shortlistDisplay && Array.isArray(shortlistDisplay.items), 'getPackageShortlist should return items array');
      const shortlisted = shortlistDisplay.items.find((pkg) => pkg.id === largerFloorAreaPackage.id);
      this.assert(!!shortlisted, 'Shortlist should include the larger floor area package');

      // Verify persistence and relationships in storage
      const shortlistEntities = JSON.parse(localStorage.getItem('package_shortlists') || '[]');
      const shortlistItems = JSON.parse(localStorage.getItem('package_shortlist_items') || '[]');
      this.assert(Array.isArray(shortlistEntities), 'package_shortlists should be an array');
      this.assert(Array.isArray(shortlistItems), 'package_shortlist_items should be an array');
      this.assert(shortlistEntities.length >= 1, 'At least one PackageShortlist entity should exist');

      const shortlistEntity = shortlistEntities[0];
      const relatedItems = shortlistItems.filter((it) => it.shortlist_id === shortlistEntity.id);
      this.assert(relatedItems.length >= 1, 'Shortlist should have at least one related item');
      const relatedItem = relatedItems.find((it) => it.package_id === largerFloorAreaPackage.id);
      this.assert(!!relatedItem, 'Shortlist items should reference the chosen package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Save three highly rated loft conversion projects (4.5+ stars, 2023+) to Ideas list
  testTask4_SaveThreeLoftConversionsToIdeas() {
    const testName = 'Task 4: Save three loft conversion projects to Ideas list';
    try {
      // Get gallery filter options (simulating UI)
      const galleryFilters = this.logic.getProjectFilterOptions();
      this.assert(galleryFilters && typeof galleryFilters === 'object', 'Should get project filter options');

      // Filter loft conversions, completion_year >= 2023, rating >= 4.5
      const listResult = this.logic.listProjects(
        {
          project_type: 'loft_conversion',
          min_completion_year: 2023,
          min_rating: 4.5
        },
        'year_desc',
        1,
        20
      );

      this.assert(Array.isArray(listResult.items), 'listProjects should return items array');
      this.assert(listResult.items.length >= 3, 'There should be at least three loft conversion projects matching filters');

      const selectedProjects = listResult.items.slice(0, 3);

      // For each of the first three projects: open details and add to Ideas
      selectedProjects.forEach((project) => {
        const projectDetails = this.logic.getProjectDetails(project.id);
        this.assert(projectDetails && projectDetails.project.id === project.id, 'Should load correct project details');

        const addResult = this.logic.addProjectToIdeas(project.id);
        this.assert(addResult && addResult.success === true, 'addProjectToIdeas should succeed');
        this.assert(Array.isArray(addResult.ideas), 'Ideas list in response should be an array');
      });

      // Verify via getIdeasList
      const ideasDisplay = this.logic.getIdeasList();
      this.assert(ideasDisplay && Array.isArray(ideasDisplay.items), 'getIdeasList should return items array');
      selectedProjects.forEach((project) => {
        const found = ideasDisplay.items.find((p) => p.id === project.id);
        this.assert(!!found, 'Ideas list should include project ' + project.id);
      });

      // Verify IdeasList and IdeasListItem in storage
      const ideasLists = JSON.parse(localStorage.getItem('ideas_lists') || '[]');
      const ideasItems = JSON.parse(localStorage.getItem('ideas_list_items') || '[]');
      this.assert(Array.isArray(ideasLists), 'ideas_lists should be an array');
      this.assert(Array.isArray(ideasItems), 'ideas_list_items should be an array');
      this.assert(ideasLists.length >= 1, 'At least one IdeasList should exist');

      const ideasList = ideasLists[0];
      const relatedItems = ideasItems.filter((it) => it.ideas_list_id === ideasList.id);
      this.assert(relatedItems.length >= 3, 'Ideas list should contain at least three items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Generate cost estimate for 3-bed, 2-bath full home renovation and email summary
  testTask5_GenerateCostEstimateAndEmailSummary() {
    const testName = 'Task 5: Generate cost estimate and email summary';
    try {
      // Load calculator configuration
      const options = this.logic.getCostCalculatorOptions();
      this.assert(options && typeof options === 'object', 'Should get cost calculator options');
      this.assert(Array.isArray(options.project_types), 'Calculator project_types should be an array');

      // Create cost estimate based on task specifics
      const estimateResult = this.logic.createCostEstimate(
        'full_home_renovation',
        3,
        2,
        'mid_range',
        180000
      );

      this.assert(estimateResult && estimateResult.estimate, 'createCostEstimate should return an estimate');
      const estimate = estimateResult.estimate;

      this.assert(estimate.project_type === 'full_home_renovation', 'Estimate project_type should match input');
      this.assert(estimate.bedrooms === 3, 'Estimate bedrooms should match input');
      this.assert(estimate.bathrooms === 2, 'Estimate bathrooms should match input');
      this.assert(estimate.finish_level === 'mid_range', 'Estimate finish_level should match input');
      this.assert(estimate.budget === 180000, 'Estimate budget should match input');
      this.assert(
        typeof estimate.estimated_cost === 'number' && estimate.estimated_cost > 0,
        'Estimate should have a positive estimated_cost'
      );

      // Send estimate summary via email
      const emailResult = this.logic.sendCostEstimateSummary(
        estimate.id,
        'Test User',
        'user@example.com'
      );

      this.assert(emailResult && emailResult.success === true, 'sendCostEstimateSummary should succeed');
      const emailRecord = emailResult.email_record;
      this.assert(emailRecord && emailRecord.id, 'Email record with id should be returned');
      this.assert(emailRecord.estimate_id === estimate.id, 'Email record should reference the estimate');
      this.assert(emailRecord.recipient_email === 'user@example.com', 'Recipient email should match input');

      // Verify persistence in storage
      const storedEstimates = JSON.parse(localStorage.getItem('cost_estimates') || '[]');
      const storedEmails = JSON.parse(localStorage.getItem('cost_estimate_emails') || '[]');
      this.assert(Array.isArray(storedEstimates), 'cost_estimates should be an array');
      this.assert(Array.isArray(storedEmails), 'cost_estimate_emails should be an array');

      const storedEstimate = storedEstimates.find((e) => e.id === estimate.id);
      this.assert(!!storedEstimate, 'Stored cost_estimates should contain the created estimate');

      const storedEmail = storedEmails.find((e) => e.id === emailRecord.id);
      this.assert(!!storedEmail, 'Stored cost_estimate_emails should contain the created email record');
      this.assert(storedEmail.estimate_id === estimate.id, 'Stored email record should reference the correct estimate');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Save and reopen a 2023+ blog article about planning permits for extensions
  testTask6_SaveAndReopenPlanningPermitArticle() {
    const testName = 'Task 6: Save and reopen planning permits article from reading list';
    try {
      // Get blog filter options
      const blogFilters = this.logic.getBlogFilterOptions();
      this.assert(blogFilters && typeof blogFilters === 'object', 'Should get blog filter options');

      // Search for articles about planning permits for extensions, year >= 2023
      const searchResult = this.logic.searchBlogArticles(
        'planning permit extension',
        { min_year: 2023 },
        1,
        10
      );

      this.assert(Array.isArray(searchResult.items), 'searchBlogArticles should return items array');
      this.assert(searchResult.items.length > 0, 'There should be at least one matching blog article');

      const firstArticle = searchResult.items[0];
      this.assert(!!firstArticle.id, 'First article should have an id');

      // Open article details
      const articleDetails = this.logic.getArticleDetails(firstArticle.id);
      this.assert(articleDetails && articleDetails.article.id === firstArticle.id, 'Should load correct article details');

      // Add article to reading list
      const addResult = this.logic.addArticleToReadingList(firstArticle.id);
      this.assert(addResult && addResult.success === true, 'addArticleToReadingList should succeed');
      this.assert(Array.isArray(addResult.reading_list), 'Reading list in response should be an array');

      // Open reading list and find the article
      const readingListDisplay = this.logic.getReadingList();
      this.assert(readingListDisplay && Array.isArray(readingListDisplay.items), 'getReadingList should return items array');
      const savedArticle = readingListDisplay.items.find((a) => a.id === firstArticle.id);
      this.assert(!!savedArticle, 'Reading list should contain the saved article');

      // Reopen article from reading list (simulate by loading details again via id)
      const reopenedDetails = this.logic.getArticleDetails(savedArticle.id);
      this.assert(reopenedDetails && reopenedDetails.article.id === savedArticle.id, 'Should reopen the same article from reading list');

      // Verify ReadingList and ReadingListItem entities in storage
      const readingLists = JSON.parse(localStorage.getItem('reading_lists') || '[]');
      const readingListItems = JSON.parse(localStorage.getItem('reading_list_items') || '[]');
      this.assert(Array.isArray(readingLists), 'reading_lists should be an array');
      this.assert(Array.isArray(readingListItems), 'reading_list_items should be an array');
      this.assert(readingLists.length >= 1, 'At least one ReadingList should exist');

      const readingList = readingLists[0];
      const relatedItems = readingListItems.filter((it) => it.reading_list_id === readingList.id);
      this.assert(relatedItems.length >= 1, 'Reading list should have at least one item');
      const relatedItem = relatedItems.find((it) => it.article_id === firstArticle.id);
      this.assert(!!relatedItem, 'ReadingListItem should reference the saved article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Find bathroom renovation warranty FAQ and send follow-up question via contact form
  testTask7_FindBathroomWarrantyFaqAndSendFollowUp() {
    const testName = 'Task 7: Bathroom renovation warranty FAQ follow-up contact message';
    try {
      // Get FAQ categories (simulating navigating to FAQ page)
      const faqCategories = this.logic.getFaqCategories();
      this.assert(Array.isArray(faqCategories), 'getFaqCategories should return an array');

      // Search FAQs for bathroom warranty within warranty-related category
      const faqSearchResult = this.logic.searchFaqs(
        'bathroom warranty',
        'warranty',
        1,
        20
      );

      this.assert(Array.isArray(faqSearchResult.items), 'searchFaqs should return items array');
      this.assert(faqSearchResult.items.length > 0, 'FAQ search should return at least one result');

      // Find the FAQ entry related to bathroom renovations using actual question text
      let bathroomFaq = faqSearchResult.items.find((item) => /bathroom/i.test(item.question));
      if (!bathroomFaq) {
        // Fallback: use first result if specific match not found
        bathroomFaq = faqSearchResult.items[0];
      }

      this.assert(!!bathroomFaq.id, 'Selected FAQ should have an id');

      // Load full FAQ details
      const faqDetails = this.logic.getFaqItemDetails(bathroomFaq.id);
      this.assert(faqDetails && faqDetails.faq.id === bathroomFaq.id, 'Should load correct FAQ details');

      // Submit contact message as a follow-up question, linked to this FAQ
      const messageText = 'I would like to confirm the warranty details for premium bathroom renovations.';
      const contactResult = this.logic.submitContactMessage(
        'bathroom_renovation',
        messageText,
        'Test User',
        'user@example.com',
        '0400000000',
        'faq_page',
        bathroomFaq.id
      );

      this.assert(contactResult && contactResult.success === true, 'submitContactMessage should succeed');
      const contactMessage = contactResult.contact_message;
      this.assert(contactMessage && contactMessage.id, 'ContactMessage with id should be returned');
      this.assert(contactMessage.subject_type === 'bathroom_renovation', 'ContactMessage.subject_type should match input');
      this.assert(contactMessage.message === messageText, 'ContactMessage.message should match input');
      this.assert(contactMessage.related_faq_id === bathroomFaq.id, 'ContactMessage.related_faq_id should link to FAQ');

      // Verify persistence in storage
      const storedMessages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      this.assert(Array.isArray(storedMessages), 'contact_messages should be an array');
      const storedMsg = storedMessages.find((m) => m.id === contactMessage.id);
      this.assert(!!storedMsg, 'Stored contact_messages should contain the created message');
      this.assert(storedMsg.related_faq_id === bathroomFaq.id, 'Stored message should reference the FAQ item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Create multi-project renovation plan (20k bathroom + 25k deck) and submit
  testTask8_CreateMultiProjectRenovationPlan() {
    const testName = 'Task 8: Create and submit multi-project renovation plan';
    try {
      // Get (or create) current renovation plan draft
      const draftResult = this.logic.getRenovationPlanDraft();
      this.assert(draftResult && typeof draftResult === 'object', 'getRenovationPlanDraft should return object');

      // Step 1: Add bathroom renovation project with 20k budget, apartment property type
      const addBathResult = this.logic.addProjectToRenovationPlan(
        'bathroom_renovation',
        20000,
        'apartment',
        'Bathroom renovation project - apartment'
      );

      this.assert(addBathResult && addBathResult.success === true, 'Adding bathroom project should succeed');
      this.assert(addBathResult.plan && addBathResult.plan.id, 'RenovationPlan should exist after adding first project');
      this.assert(Array.isArray(addBathResult.projects), 'Projects array should be returned after adding first project');

      const planAfterBath = addBathResult.plan;

      // Step 2: Add deck extension project with 25k budget, house property type
      const addDeckResult = this.logic.addProjectToRenovationPlan(
        'deck_extension',
        25000,
        'house',
        'Deck extension project - house'
      );

      this.assert(addDeckResult && addDeckResult.success === true, 'Adding deck project should succeed');
      const planAfterDeck = addDeckResult.plan;
      const projectsAfterDeck = addDeckResult.projects;

      this.assert(planAfterDeck.id === planAfterBath.id, 'Both projects should belong to the same renovation plan');
      this.assert(Array.isArray(projectsAfterDeck) && projectsAfterDeck.length >= 2, 'Plan should now contain at least two projects');

      const hasBathroomProject = projectsAfterDeck.some(
        (p) => p.project_type === 'bathroom_renovation' && p.budget === 20000
      );
      const hasDeckProject = projectsAfterDeck.some(
        (p) => p.project_type === 'deck_extension' && p.budget === 25000
      );

      this.assert(hasBathroomProject, 'Plan should contain a bathroom renovation project with 20k budget');
      this.assert(hasDeckProject, 'Plan should contain a deck extension project with 25k budget');

      // Step 3: Fill in personal details
      const updateDetailsResult = this.logic.updateRenovationPlanDetails(
        'Test User',
        'user@example.com',
        '0400000000',
        '3000'
      );

      this.assert(updateDetailsResult && updateDetailsResult.success === true, 'updateRenovationPlanDetails should succeed');
      const updatedPlan = updateDetailsResult.plan;
      this.assert(updatedPlan && updatedPlan.id === planAfterDeck.id, 'Updated plan should have same id');
      this.assert(updatedPlan.name === 'Test User', 'Plan.name should match input');
      this.assert(updatedPlan.email === 'user@example.com', 'Plan.email should match input');

      // Step 4: Submit renovation plan
      const submitResult = this.logic.submitRenovationPlan();
      this.assert(submitResult && submitResult.success === true, 'submitRenovationPlan should succeed');
      const submittedPlan = submitResult.plan;

      this.assert(submittedPlan && submittedPlan.id === updatedPlan.id, 'Submitted plan should be the same plan');
      this.assert(!!submittedPlan.submitted_at, 'Submitted plan should have submitted_at timestamp');

      // Verify persistence and relationships in storage
      const storedPlans = JSON.parse(localStorage.getItem('renovation_plans') || '[]');
      const storedPlanProjects = JSON.parse(localStorage.getItem('renovation_plan_projects') || '[]');
      this.assert(Array.isArray(storedPlans), 'renovation_plans should be an array');
      this.assert(Array.isArray(storedPlanProjects), 'renovation_plan_projects should be an array');

      const storedPlan = storedPlans.find((p) => p.id === submittedPlan.id);
      this.assert(!!storedPlan, 'Stored renovation_plans should contain the submitted plan');

      const planProjects = storedPlanProjects.filter((p) => p.plan_id === submittedPlan.id);
      this.assert(planProjects.length >= 2, 'Stored plan should have at least two associated projects');

      const storedBathroomProject = planProjects.find(
        (p) => p.project_type === 'bathroom_renovation' && p.budget === 20000
      );
      const storedDeckProject = planProjects.find(
        (p) => p.project_type === 'deck_extension' && p.budget === 25000
      );

      this.assert(!!storedBathroomProject, 'Stored projects should include the bathroom renovation project');
      this.assert(!!storedDeckProject, 'Stored projects should include the deck extension project');

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
    console.error('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
