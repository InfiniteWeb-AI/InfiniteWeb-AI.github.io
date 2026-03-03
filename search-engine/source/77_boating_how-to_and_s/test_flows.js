class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Initial data based on Generated Data (ids, slugs, enums preserved)
    const generatedData = {
      articles: [
        {
          id: 'art_safety_beginner_lifejackets',
          title: 'Beginner Guide to Life Jackets and PFDs',
          slug: 'beginners-guide-life-jackets-pfds',
          category: 'safety_basics',
          category_tab: 'other',
          summary: 'How to choose and maintain life jackets.',
          content: 'Life jacket basics content.',
          read_time_minutes: 6,
          rating: 4.7,
          rating_count: 148,
          difficulty_level: 'beginner',
          tags: ['Beginner', 'Safety Gear', 'Life Jackets', 'PFD'],
          boat_size_category: 'all_sizes',
          publish_date: '2023-03-02T10:00:00Z',
          is_featured: true
        },
        {
          id: 'art_safety_beginner_right_of_way',
          title: '7 Essential Right-of-Way Rules for New Boaters',
          slug: 'essential-right-of-way-rules-new-boaters',
          category: 'safety_basics',
          category_tab: 'other',
          summary: 'Understand who goes first on the water.',
          content: 'Right of way rules content.',
          read_time_minutes: 7,
          rating: 4.6,
          rating_count: 201,
          difficulty_level: 'beginner',
          tags: ['Beginner', 'Navigation Rules', 'Safety Basics'],
          boat_size_category: 'all_sizes',
          publish_date: '2022-05-10T15:30:00Z',
          is_featured: true
        },
        {
          id: 'art_safety_beginner_docking',
          title: 'Docking Without Drama: Basic Dock Maneuvers for Beginners',
          slug: 'docking-without-drama-basic-maneuvers',
          category: 'safety_basics',
          category_tab: 'other',
          summary: 'Docking tips for new boaters.',
          content: 'Docking basics content.',
          read_time_minutes: 5,
          rating: 4.5,
          rating_count: 173,
          difficulty_level: 'beginner',
          tags: ['Beginner', 'Docking', 'Boat Handling'],
          boat_size_category: 'up_to_26_ft',
          publish_date: '2023-06-18T09:45:00Z',
          is_featured: false
        }
      ],
      checklists: [
        {
          id: 'chk_pontoon_day_trip_safety',
          title: 'Pontoon Day Trip Safety Checklist',
          slug: 'pontoon-day-trip-safety-checklist',
          description: 'Safety checklist for a 4 to 8 hour pontoon outing.',
          boat_type: 'pontoon',
          trip_length: 'day_trip_4_8_hours',
          passenger_range: 'passengers_4_6',
          is_recommended: true
        },
        {
          id: 'chk_open_motorboat_half_day_fishing',
          title: 'Open Motorboat Half-Day Fishing Checklist',
          slug: 'open-motorboat-half-day-fishing-checklist',
          description: 'Checklist for a short fishing trip.',
          boat_type: 'open_motorboat',
          trip_length: 'half_day_under_4_hours',
          passenger_range: 'passengers_1_3',
          is_recommended: true
        },
        {
          id: 'chk_open_motorboat_day_trip_family',
          title: 'Family Day Trip Checklist for Open Motorboats',
          slug: 'family-day-trip-checklist-open-motorboats',
          description: 'Checklist for a full day outing with family.',
          boat_type: 'open_motorboat',
          trip_length: 'day_trip_4_8_hours',
          passenger_range: 'passengers_4_6',
          is_recommended: true
        }
      ],
      courses: [
        {
          id: 'crs_basic_safety_lakeside_45',
          title: 'Lakeside Basic Boating Safety',
          slug: 'lakeside-basic-boating-safety',
          type: 'basic_boating_safety',
          price: 45.0,
          level: 'beginner',
          distance_miles: 12.0,
          rating: 4.7,
          provider_name: 'Lakeside Boating School',
          location: 'Lakeside Marina Training Center',
          soonest_start_date: '2024-06-05T09:00:00Z',
          description: 'One day in person basic boating safety class.'
        },
        {
          id: 'crs_basic_safety_harborview_60',
          title: 'Harborview Basic Boating Safety Course',
          slug: 'harborview-basic-boating-safety-course',
          type: 'basic_boating_safety',
          price: 60.0,
          level: 'beginner',
          distance_miles: 8.0,
          rating: 4.6,
          provider_name: 'Harborview Community College',
          location: 'Harborview Waterfront Campus',
          soonest_start_date: '2024-05-20T18:00:00Z',
          description: 'Evening classroom basic boating safety course.'
        },
        {
          id: 'crs_basic_safety_online_75',
          title: 'Online Basic Boating Safety (State Approved)',
          slug: 'online-basic-boating-safety-state-approved',
          type: 'basic_boating_safety',
          price: 75.0,
          level: 'beginner',
          distance_miles: 0.0,
          rating: 4.5,
          provider_name: 'SafeWater Online Training',
          location: 'Online',
          soonest_start_date: '2024-04-15T00:00:00Z',
          description: 'Self paced online basic boating safety course.'
        }
      ],
      glossary_terms: [
        {
          id: 'gl_mayday',
          term: 'Mayday',
          slug: 'mayday',
          definition: 'International radio distress signal for grave and imminent danger.',
          category: 'radio_distress_calls',
          synonyms: ['distress call', 'emergency call']
        },
        {
          id: 'gl_pan_pan',
          term: 'Pan-Pan',
          slug: 'pan_pan',
          definition: 'Radio urgency signal for serious problems that are not life threatening.',
          category: 'radio_distress_calls',
          synonyms: ['Pan Pan', 'urgency call']
        },
        {
          id: 'gl_securite',
          term: 'Securite',
          slug: 'securite',
          definition: 'Radio safety signal for important safety information such as weather warnings.',
          category: 'radio_distress_calls',
          synonyms: ['Securite', 'safety message']
        }
      ],
      pages: [
        {
          id: 'index.html',
          name: 'Home',
          filename: 'index.html',
          description: 'Homepage with featured safety content.',
          primary_functions: [
            'show_featured_safety_articles',
            'provide_quick_links_to_tools_checklists_courses',
            'offer_global_search_entry_point'
          ]
        },
        {
          id: 'safety_basics.html',
          name: 'Safety Basics',
          filename: 'safety_basics.html',
          description: 'Core boating safety articles with filters.',
          primary_functions: [
            'list_safety_basics_articles',
            'filter_articles_by_difficulty_and_tags',
            'filter_articles_by_read_time_and_rating',
            'filter_articles_by_boat_size_category'
          ]
        },
        {
          id: 'how_to_guides.html',
          name: 'How-To Guides',
          filename: 'how_to_guides.html',
          description: 'Step by step boating how to content.',
          primary_functions: [
            'list_how_to_articles_by_category_tab',
            'allow_adding_articles_to_learning_path'
          ]
        }
      ],
      navigation_links: [
        {
          id: 'nav_header_home',
          text: 'Home',
          url: 'index.html',
          description: 'Homepage link',
          location: 'header',
          page_id: 'index.html',
          order: 1
        },
        {
          id: 'nav_header_safety_basics',
          text: 'Safety Basics',
          url: 'safety_basics.html',
          description: 'Safety articles and guides with filters',
          location: 'header',
          page_id: 'safety_basics.html',
          order: 2
        },
        {
          id: 'nav_header_how_to_guides',
          text: 'How-To Guides',
          url: 'how_to_guides.html',
          description: 'How to content by category',
          location: 'header',
          page_id: 'how_to_guides.html',
          order: 3
        }
      ],
      tools: [
        {
          id: 'tool_boat_capacity_calculator',
          name: 'Boat Capacity Calculator',
          slug: 'boat_capacity_calculator',
          description: 'Calculator for safe maximum passenger capacity.',
          page_id: 'tools.html',
          is_featured: true
        },
        {
          id: 'tool_engine_maintenance_scheduler',
          name: 'Engine Maintenance Scheduler',
          slug: 'engine_maintenance_scheduler',
          description: 'Tool for creating recurring engine maintenance schedules.',
          page_id: 'tools.html',
          is_featured: true
        },
        {
          id: 'tool_trip_plan_organizer',
          name: 'Trip Plan Organizer',
          slug: 'other_tool',
          description: 'Planner for organizing trip details.',
          page_id: 'tools.html',
          is_featured: false
        }
      ],
      checklist_sections: [
        {
          id: 'chksec_pontoon_day_trip_before_dock',
          checklist_id: 'chk_pontoon_day_trip_safety',
          title: 'Before You Leave Dock',
          order: 1
        },
        {
          id: 'chksec_pontoon_day_trip_on_water',
          checklist_id: 'chk_pontoon_day_trip_safety',
          title: 'On the Water',
          order: 2
        },
        {
          id: 'chksec_pontoon_day_trip_before_home',
          checklist_id: 'chk_pontoon_day_trip_safety',
          title: 'Before You Head Home',
          order: 3
        }
      ],
      checklist_items: [
        {
          id: 'chkitem_pontoon_day_before_1',
          checklist_id: 'chk_pontoon_day_trip_safety',
          section_id: 'chksec_pontoon_day_trip_before_dock',
          text: 'Check detailed weather forecast and thunderstorm risk for the day.',
          order: 1
        },
        {
          id: 'chkitem_pontoon_day_before_2',
          checklist_id: 'chk_pontoon_day_trip_safety',
          section_id: 'chksec_pontoon_day_trip_before_dock',
          text: 'Confirm passenger count and verify it does not exceed capacity plate.',
          order: 2
        },
        {
          id: 'chkitem_pontoon_day_before_3',
          checklist_id: 'chk_pontoon_day_trip_safety',
          section_id: 'chksec_pontoon_day_trip_before_dock',
          text: 'Ensure a properly sized life jacket is available for each passenger.',
          order: 3
        }
      ]
    };

    // Populate localStorage using storage keys
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('checklists', JSON.stringify(generatedData.checklists || []));
    localStorage.setItem('courses', JSON.stringify(generatedData.courses || []));
    localStorage.setItem('glossary_terms', JSON.stringify(generatedData.glossary_terms || []));
    localStorage.setItem('pages', JSON.stringify(generatedData.pages || []));
    localStorage.setItem('navigation_links', JSON.stringify(generatedData.navigation_links || []));
    localStorage.setItem('tools', JSON.stringify(generatedData.tools || []));
    localStorage.setItem('checklist_sections', JSON.stringify(generatedData.checklist_sections || []));
    localStorage.setItem('checklist_items', JSON.stringify(generatedData.checklist_items || []));

    // Ensure empty collections exist for other entity types used in flows
    const emptyCollections = [
      'favorite_articles',
      'checklist_progress',
      'trip_plans',
      'engine_maintenance_schedules',
      'engine_maintenance_tasks',
      'training_plan_entries',
      'learning_paths',
      'learning_path_items',
      'study_list_items'
    ];
    for (let i = 0; i < emptyCollections.length; i++) {
      const key = emptyCollections[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    }
  }

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveBeginnerSafetyArticlesToFavorites();
    this.testTask2_CompleteAndSavePontoonChecklist();
    this.testTask3_UseBoatCapacityCalculatorAndSaveTripPlan();
    this.testTask4_SearchArticleAndOpenPrintView();
    this.testTask5_AddCheapestCourseToTrainingPlan();
    this.testTask6_SetupMonthlyMaintenanceSchedule();
    this.testTask7_BuildNightBoatingLearningPath();
    this.testTask8_CreateStudyListFromGlossaryTerms();

    return this.results;
  }

  // Task 1: Save three beginner safety articles under 8 minutes to Favorites
  testTask1_SaveBeginnerSafetyArticlesToFavorites() {
    const testName = 'Task 1: Save beginner safety articles under 8 minutes to Favorites';
    try {
      // Simulate landing on home page
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && typeof homeContent === 'object', 'Home page content should load');

      // Get Safety Basics filter options
      const filterOptions = this.logic.getSafetyBasicsFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.rating_options), 'Safety Basics filter options should be available');

      // Apply filters: beginner, read time <= 8, rating >= 4.0, sort highest rated
      const filters = {
        difficulty_levels: ['beginner'],
        max_read_time_minutes: 8,
        min_rating: 4.0
      };
      const listing = this.logic.listSafetyBasicsArticles(filters, 'highest_rated', 1, 10);
      this.assert(listing && Array.isArray(listing.articles), 'Should list Safety Basics articles with filters applied');
      const cards = listing.articles;
      this.assert(cards.length >= 1, 'Should have at least one matching beginner safety article');

      const toFavoriteCount = Math.min(3, cards.length);
      const favoritedIds = [];

      for (let i = 0; i < toFavoriteCount; i++) {
        const articleCard = cards[i];
        const articleId = articleCard.article.id;
        const addResult = this.logic.addArticleToFavorites(articleId);
        this.assert(addResult && addResult.success === true, 'Adding article to favorites should succeed');
        this.assert(addResult.favorite && addResult.favorite.article_id === articleId, 'Favorite should reference correct article id');
        this.assert(typeof addResult.total_favorites === 'number', 'Favorite response should include total_favorites');
        favoritedIds.push(articleId);
      }

      // Verify favorite state via listing API
      const listingAfter = this.logic.listSafetyBasicsArticles(filters, 'highest_rated', 1, 10);
      this.assert(listingAfter && Array.isArray(listingAfter.articles), 'Should list Safety Basics articles after favoriting');
      const cardsAfter = listingAfter.articles;

      for (let j = 0; j < favoritedIds.length; j++) {
        const id = favoritedIds[j];
        const found = cardsAfter.find(c => c.article.id === id);
        this.assert(!!found, 'Favorited article should still appear in filtered list: ' + id);
        this.assert(found.is_favorited === true, 'Favorited article should be marked is_favorited: ' + id);
      }

      // Verify favorites persisted in storage
      const storedFavorites = JSON.parse(localStorage.getItem('favorite_articles') || '[]');
      for (let k = 0; k < favoritedIds.length; k++) {
        const id = favoritedIds[k];
        const favRecord = storedFavorites.find(f => f.article_id === id);
        this.assert(!!favRecord, 'Favorite record should exist in localStorage for article ' + id);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Complete and save a pontoon day trip safety checklist
  testTask2_CompleteAndSavePontoonChecklist() {
    const testName = 'Task 2: Complete and save pontoon day trip safety checklist';
    try {
      // Get checklist filter options
      const options = this.logic.getChecklistsFilterOptions();
      this.assert(options && Array.isArray(options.boat_types), 'Checklist filter options should be available');

      // Filter for pontoon, day trip, 4-6 passengers
      const filters = {
        boat_type: 'pontoon',
        trip_length: 'day_trip_4_8_hours',
        passenger_range: 'passengers_4_6'
      };
      const listResult = this.logic.listChecklists(filters, 1, 10);
      this.assert(listResult && Array.isArray(listResult.checklists), 'Should list filtered checklists');
      this.assert(listResult.checklists.length >= 1, 'Should find at least one pontoon day trip checklist');

      const checklist = listResult.checklists[0];
      const checklistId = checklist.id;

      // Load checklist detail with progress
      const detail = this.logic.getChecklistDetailWithProgress(checklistId);
      this.assert(detail && detail.checklist && detail.checklist.id === checklistId, 'Checklist detail should match selected checklist');
      this.assert(Array.isArray(detail.sections), 'Checklist detail should include sections');

      // Determine first up to 5 items across sections (adapted to available data)
      const allItemsWrapped = [];
      for (let i = 0; i < detail.sections.length; i++) {
        const sectionWrap = detail.sections[i];
        const items = sectionWrap.items || [];
        for (let j = 0; j < items.length; j++) {
          allItemsWrapped.push(items[j]);
        }
      }
      this.assert(allItemsWrapped.length >= 1, 'Checklist should contain at least one item');
      allItemsWrapped.sort((a, b) => {
        const ao = a.item && typeof a.item.order === 'number' ? a.item.order : 0;
        const bo = b.item && typeof b.item.order === 'number' ? b.item.order : 0;
        return ao - bo;
      });
      const itemsToComplete = allItemsWrapped.slice(0, Math.min(5, allItemsWrapped.length));
      const completedIds = itemsToComplete.map(w => w.item.id);

      // Save progress
      const saveResult = this.logic.saveChecklistProgress(checklistId, completedIds);
      this.assert(saveResult && saveResult.success === true, 'Saving checklist progress should succeed');
      this.assert(saveResult.checklist_progress && saveResult.checklist_progress.checklist_id === checklistId, 'Checklist progress should reference correct checklist');

      const savedCompleted = saveResult.checklist_progress.completed_item_ids || [];
      for (let k = 0; k < completedIds.length; k++) {
        const id = completedIds[k];
        this.assert(savedCompleted.indexOf(id) !== -1, 'Completed item id should be stored in progress: ' + id);
      }

      // Reload detail to verify is_completed flags
      const detailAfter = this.logic.getChecklistDetailWithProgress(checklistId);
      this.assert(detailAfter && Array.isArray(detailAfter.sections), 'Checklist detail after save should include sections');
      const completedSet = {};
      for (let m = 0; m < completedIds.length; m++) {
        completedSet[completedIds[m]] = true;
      }
      let completedSeenCount = 0;
      for (let s = 0; s < detailAfter.sections.length; s++) {
        const sectionWrap = detailAfter.sections[s];
        const items = sectionWrap.items || [];
        for (let t = 0; t < items.length; t++) {
          const iw = items[t];
          const itemId = iw.item.id;
          if (completedSet[itemId]) {
            this.assert(iw.is_completed === true, 'Completed item should be marked is_completed: ' + itemId);
            completedSeenCount++;
          }
        }
      }
      this.assert(completedSeenCount === completedIds.length, 'All completed items should be marked as completed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Use the boat capacity calculator and save a trip plan for 6 passengers
  testTask3_UseBoatCapacityCalculatorAndSaveTripPlan() {
    const testName = 'Task 3: Use boat capacity calculator and save trip plan';
    try {
      // List tools and confirm boat capacity calculator exists
      const tools = this.logic.listTools();
      this.assert(Array.isArray(tools), 'Tools list should be an array');
      const capacityTool = tools.find(t => t.slug === 'boat_capacity_calculator');
      this.assert(!!capacityTool, 'Boat Capacity Calculator tool should be available');

      // Calculate capacity with given dimensions and settings
      const boatLength = 18;
      const boatWidth = 7;
      const calcResult = this.logic.calculateBoatCapacity(boatLength, boatWidth, 'open_motorboat', 'inland_lake_river');
      this.assert(calcResult && typeof calcResult.calculated_max_passengers === 'number', 'Capacity calculation should return a numeric max passengers');
      this.assert(calcResult.calculated_max_passengers > 0, 'Calculated max passengers should be greater than zero');

      // Save calculation into a trip plan for 6 passengers
      const tripName = 'Weekend Lake Trip for 6';
      const plannedPassengers = 6;
      const addResult = this.logic.addCurrentCapacityToTripPlan(tripName, plannedPassengers);
      this.assert(addResult && addResult.success === true, 'Adding current capacity to trip plan should succeed');
      this.assert(addResult.trip_plan && addResult.trip_plan.name === tripName, 'Trip plan name should match input');

      const tripPlan = addResult.trip_plan;
      this.assert(tripPlan.boat_length_ft === boatLength, 'Trip plan should store boat length from calculation');
      this.assert(tripPlan.boat_width_ft === boatWidth, 'Trip plan should store boat width from calculation');
      this.assert(typeof tripPlan.calculated_max_passengers === 'number', 'Trip plan should include calculated_max_passengers');
      this.assert(tripPlan.calculated_max_passengers === calcResult.calculated_max_passengers, 'Trip plan max passengers should match calculation result');
      if (typeof tripPlan.planned_passenger_count === 'number') {
        this.assert(tripPlan.planned_passenger_count === plannedPassengers, 'Planned passenger count should match input if stored');
      }

      // Verify persistence in localStorage
      const storedPlans = JSON.parse(localStorage.getItem('trip_plans') || '[]');
      const storedPlan = storedPlans.find(p => p.id === tripPlan.id);
      this.assert(!!storedPlan, 'Trip plan should be persisted in localStorage');
      this.assert(storedPlan.name === tripName, 'Stored trip plan name should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4 (adapted): Search for an emergency related guide and open print view
  testTask4_SearchArticleAndOpenPrintView() {
    const testName = 'Task 4: Search filtered article and open print friendly view';
    try {
      // Adaptation: search for docking article with boat size up to 26 ft
      const query = 'docking';
      const filters = {
        category: 'safety_basics',
        boat_size_category: 'up_to_26_ft',
        published_from: '2022-01-01',
        published_to: undefined,
        min_rating: 0
      };
      const searchResult = this.logic.searchArticles(query, filters, 'newest_first', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.total_results >= 1, 'Search should return at least one result for docking articles');

      const firstResult = searchResult.results[0];
      const article = firstResult.article;
      this.assert(article && article.id, 'First search result should include an article with id');

      // Load article detail
      const detail = this.logic.getArticleDetail(article.id);
      this.assert(detail && detail.article && detail.article.id === article.id, 'Article detail should match the selected article');

      // Open print friendly view
      const printView = this.logic.getArticlePrintView(article.id);
      this.assert(printView && typeof printView.article_title === 'string', 'Print view should include article_title');
      this.assert(typeof printView.print_body_html === 'string', 'Print view should include print_body_html');
      this.assert(printView.article_title === detail.article.title, 'Print view article_title should match article detail title');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Add the cheapest basic boating safety course under 100 within 25 miles to training plan
  testTask5_AddCheapestCourseToTrainingPlan() {
    const testName = 'Task 5: Add cheapest basic boating safety course to training plan';
    try {
      // Get filter options
      const options = this.logic.getCoursesFilterOptions();
      this.assert(options && Array.isArray(options.course_types), 'Course filter options should be available');

      // List basic boating safety courses under 100 within 25 miles, sorted by price low to high
      const filters = {
        course_type: 'basic_boating_safety',
        max_distance_miles: 25,
        max_price: 100,
        level: 'beginner'
      };
      const listResult = this.logic.listCourses(filters, 'price_low_to_high', 1, 10);
      this.assert(listResult && Array.isArray(listResult.courses), 'Courses list should be returned');
      this.assert(listResult.courses.length >= 1, 'Should find at least one qualifying basic boating safety course');

      const firstCourse = listResult.courses[0];
      const courseId = firstCourse.id;
      this.assert(firstCourse.price <= 100, 'First course price should be at or under 100');
      this.assert(firstCourse.level === 'beginner', 'First course level should be beginner');

      // Load course detail
      const detail = this.logic.getCourseDetail(courseId);
      this.assert(detail && detail.course && detail.course.id === courseId, 'Course detail should match selected course');

      // Add to training plan with June 2024 start month
      const monthLabel = 'June 2024';
      const monthDate = '2024-06-01';
      const addResult = this.logic.addCourseToTrainingPlan(courseId, monthLabel, monthDate);
      this.assert(addResult && addResult.success === true, 'Adding course to training plan should succeed');
      this.assert(addResult.training_plan_entry && addResult.training_plan_entry.course_id === courseId, 'Training plan entry should reference course id');
      this.assert(addResult.training_plan_entry.planned_start_month_label === monthLabel, 'Training plan start month label should match');

      // Verify via training plan entries
      const planEntries = this.logic.getTrainingPlanEntries();
      this.assert(Array.isArray(planEntries), 'Training plan entries should be an array');
      const entryMatch = planEntries.find(e => e.entry.id === addResult.training_plan_entry.id);
      this.assert(!!entryMatch, 'New training plan entry should appear in plan entries');
      this.assert(entryMatch.course.id === courseId, 'Training plan entry should include course details');

      // Verify persistence in localStorage
      const storedEntries = JSON.parse(localStorage.getItem('training_plan_entries') || '[]');
      const stored = storedEntries.find(e => e.id === addResult.training_plan_entry.id);
      this.assert(!!stored, 'Training plan entry should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Set up a monthly maintenance schedule for a 2-stroke engine in saltwater
  testTask6_SetupMonthlyMaintenanceSchedule() {
    const testName = 'Task 6: Set up monthly maintenance schedule for 2-stroke engine in saltwater';
    try {
      // Confirm tools list includes engine maintenance scheduler
      const tools = this.logic.listTools();
      this.assert(Array.isArray(tools), 'Tools list should be an array');
      const schedulerTool = tools.find(t => t.slug === 'engine_maintenance_scheduler');
      this.assert(!!schedulerTool, 'Engine Maintenance Scheduler tool should be available');

      // Generate schedule for 2-stroke outboard used monthly in saltwater
      const engineType = 'two_stroke_outboard';
      const usageFrequency = 'used_monthly';
      const waterType = 'saltwater';
      const startDate = '2024-07-01';
      const reminderFrequency = 'every_1_month';

      const preview = this.logic.generateEngineMaintenanceSchedule(
        engineType,
        usageFrequency,
        waterType,
        startDate,
        reminderFrequency
      );
      this.assert(preview && preview.preview_schedule, 'Preview schedule should be returned');
      const previewSchedule = preview.preview_schedule;
      this.assert(previewSchedule.engine_type === engineType, 'Preview schedule engine_type should match input');
      this.assert(previewSchedule.usage_frequency === usageFrequency, 'Preview schedule usage_frequency should match input');
      this.assert(previewSchedule.water_type === waterType, 'Preview schedule water_type should match input');
      this.assert(typeof previewSchedule.start_date === 'string', 'Preview schedule should include start_date');
      this.assert(Array.isArray(preview.tasks), 'Preview tasks should be an array');

      // Save generated schedule
      const notes = 'Monthly saltwater 2-stroke schedule created by test.';
      const saveResult = this.logic.saveGeneratedMaintenanceSchedule(notes);
      this.assert(saveResult && saveResult.success === true, 'Saving generated maintenance schedule should succeed');
      this.assert(saveResult.schedule && saveResult.schedule.id, 'Saved schedule should include id');
      this.assert(saveResult.schedule.engine_type === engineType, 'Saved schedule engine_type should match input');
      this.assert(Array.isArray(saveResult.tasks), 'Saved schedule should include tasks array');

      // Verify persistence in localStorage
      const storedSchedules = JSON.parse(localStorage.getItem('engine_maintenance_schedules') || '[]');
      const storedSchedule = storedSchedules.find(s => s.id === saveResult.schedule.id);
      this.assert(!!storedSchedule, 'Saved maintenance schedule should be persisted');

      const storedTasks = JSON.parse(localStorage.getItem('engine_maintenance_tasks') || '[]');
      const tasksForSchedule = storedTasks.filter(t => t.schedule_id === saveResult.schedule.id);
      this.assert(tasksForSchedule.length === saveResult.tasks.length, 'All saved tasks should be persisted for schedule');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Build a three-step night boating learning path from different categories
  testTask7_BuildNightBoatingLearningPath() {
    const testName = 'Task 7: Build three-step learning path from different categories';
    try {
      // Get how-to guide categories
      const categories = this.logic.getHowToGuideCategories();
      this.assert(Array.isArray(categories) && categories.length >= 1, 'How-To categories should be available');

      // Helper to pick distinct categories preferring specific keys
      const usedCategoryKeys = {};
      const pickCategory = preferredKey => {
        let cat = null;
        if (preferredKey) {
          cat = categories.find(c => c.key === preferredKey && !usedCategoryKeys[c.key]);
        }
        if (!cat) {
          cat = categories.find(c => !usedCategoryKeys[c.key]);
        }
        if (!cat) {
          cat = categories[0];
        }
        usedCategoryKeys[cat.key] = true;
        return cat.key;
      };

      const navKey = pickCategory('navigation');
      const anchorKey = pickCategory('anchoring_mooring');
      const commKey = pickCategory('communication_electronics');

      const addedArticleIds = [];

      // Step 1: night navigation article
      const navList = this.logic.listHowToArticles(navKey, 1, 20);
      this.assert(navList && Array.isArray(navList.articles), 'Navigation category articles should load');
      this.assert(navList.total_results >= 1, 'Navigation category should have at least one article');
      let nightArticleCard = navList.articles.find(a => {
        const title = (a.article.title || '').toLowerCase();
        return title.indexOf('night') !== -1 || title.indexOf('after dark') !== -1;
      });
      if (!nightArticleCard) {
        nightArticleCard = navList.articles[0];
      }
      const nightArticleId = nightArticleCard.article.id;
      const addNight = this.logic.addArticleToLearningPath(nightArticleId);
      this.assert(addNight && addNight.success === true, 'Adding night navigation article to learning path should succeed');
      this.assert(addNight.learning_path_item && addNight.learning_path_item.article_id === nightArticleId, 'Learning path item should reference night article');
      addedArticleIds.push(nightArticleId);

      // Step 2: beginner anchoring article
      const anchorList = this.logic.listHowToArticles(anchorKey, 1, 20);
      this.assert(anchorList && Array.isArray(anchorList.articles), 'Anchoring category articles should load');
      this.assert(anchorList.total_results >= 1, 'Anchoring category should have at least one article');
      let anchorCard = anchorList.articles.find(a => a.article.difficulty_level === 'beginner');
      if (!anchorCard) {
        anchorCard = anchorList.articles[0];
      }
      const anchorArticleId = anchorCard.article.id;
      const addAnchor = this.logic.addArticleToLearningPath(anchorArticleId);
      this.assert(addAnchor && addAnchor.success === true, 'Adding anchoring article to learning path should succeed');
      this.assert(addAnchor.learning_path_item && addAnchor.learning_path_item.article_id === anchorArticleId, 'Learning path item should reference anchoring article');
      addedArticleIds.push(anchorArticleId);

      // Step 3: VHF radio article
      const commList = this.logic.listHowToArticles(commKey, 1, 20);
      this.assert(commList && Array.isArray(commList.articles), 'Communication category articles should load');
      this.assert(commList.total_results >= 1, 'Communication category should have at least one article');
      let commCard = commList.articles.find(a => {
        const title = (a.article.title || '').toLowerCase();
        return title.indexOf('vhf') !== -1;
      });
      if (!commCard) {
        commCard = commList.articles[0];
      }
      const commArticleId = commCard.article.id;
      const addComm = this.logic.addArticleToLearningPath(commArticleId);
      this.assert(addComm && addComm.success === true, 'Adding VHF article to learning path should succeed');
      this.assert(addComm.learning_path_item && addComm.learning_path_item.article_id === commArticleId, 'Learning path item should reference VHF article');
      addedArticleIds.push(commArticleId);

      // Open My Learning Path
      const pathData = this.logic.getLearningPath();
      this.assert(pathData && pathData.learning_path, 'Learning path data should be returned');
      this.assert(Array.isArray(pathData.items), 'Learning path items should be an array');
      this.assert(pathData.items.length >= addedArticleIds.length, 'Learning path should contain at least the three added steps');

      const pathArticleIds = pathData.items.map(x => x.article.id);
      for (let i = 0; i < addedArticleIds.length; i++) {
        const id = addedArticleIds[i];
        this.assert(pathArticleIds.indexOf(id) !== -1, 'Learning path should include article id ' + id);
      }

      // Verify that each item has step_number and category_tab
      for (let j = 0; j < pathData.items.length; j++) {
        const itemWrap = pathData.items[j];
        this.assert(typeof itemWrap.step_number === 'number', 'Each learning path item should include step_number');
        this.assert(typeof itemWrap.category_tab === 'string', 'Each learning path item should include category_tab');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Create a study list with three radio distress call terms from the glossary
  testTask8_CreateStudyListFromGlossaryTerms() {
    const testName = 'Task 8: Create study list with radio distress call terms';
    try {
      // Search and add Mayday
      const maydaySearch = this.logic.searchGlossaryTerms('mayday');
      this.assert(maydaySearch && Array.isArray(maydaySearch.terms), 'Mayday search should return terms array');
      this.assert(maydaySearch.total_results >= 1, 'Mayday search should find at least one term');
      const maydayTerm = maydaySearch.terms.find(t => (t.term || '').toLowerCase().indexOf('mayday') !== -1) || maydaySearch.terms[0];
      const addMayday = this.logic.addTermToStudyList(maydayTerm.id);
      this.assert(addMayday && addMayday.success === true, 'Adding Mayday to study list should succeed');

      // Search and add Pan-Pan
      const panSearch = this.logic.searchGlossaryTerms('pan-pan');
      this.assert(panSearch && Array.isArray(panSearch.terms), 'Pan-Pan search should return terms array');
      this.assert(panSearch.total_results >= 1, 'Pan-Pan search should find at least one term');
      const panTerm = panSearch.terms.find(t => (t.term || '').toLowerCase().indexOf('pan') !== -1) || panSearch.terms[0];
      const addPan = this.logic.addTermToStudyList(panTerm.id);
      this.assert(addPan && addPan.success === true, 'Adding Pan-Pan to study list should succeed');

      // Search and add Securite (with or without accent)
      const secSearch = this.logic.searchGlossaryTerms('securite');
      this.assert(secSearch && Array.isArray(secSearch.terms), 'Securite search should return terms array');
      this.assert(secSearch.total_results >= 1, 'Securite search should find at least one term');
      const secTerm = secSearch.terms.find(t => {
        const termLower = (t.term || '').toLowerCase();
        const slugLower = (t.slug || '').toLowerCase();
        return termLower.indexOf('securite') !== -1 || slugLower.indexOf('securite') !== -1;
      }) || secSearch.terms[0];
      const addSec = this.logic.addTermToStudyList(secTerm.id);
      this.assert(addSec && addSec.success === true, 'Adding Securite to study list should succeed');

      // Open My Study List
      const studyList = this.logic.getStudyListTerms();
      this.assert(studyList && Array.isArray(studyList.terms), 'Study list terms should be returned as array');
      this.assert(studyList.terms.length >= 3, 'Study list should contain at least three terms');

      const termNames = studyList.terms.map(x => (x.term.term || '').toLowerCase());
      this.assert(termNames.some(n => n.indexOf('mayday') !== -1), 'Study list should include Mayday term');
      this.assert(termNames.some(n => n.indexOf('pan') !== -1), 'Study list should include Pan-Pan term');
      this.assert(termNames.some(n => n.indexOf('securite') !== -1), 'Study list should include Securite term');

      // Verify persistence in localStorage
      const storedStudyItems = JSON.parse(localStorage.getItem('study_list_items') || '[]');
      this.assert(storedStudyItems.length >= 3, 'Study list items should be persisted in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording
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

module.exports = TestRunner;
