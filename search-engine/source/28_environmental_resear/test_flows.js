// Test runner for business logic flows
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
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      datasets: [
        {
          id: "ds_defor_seasia_2025_alerts",
          title: "Southeast Asia Near-Real-Time Deforestation Alerts (2015–2025)",
          description:
            "Daily forest loss alerts for Southeast Asia derived from satellite imagery and machine learning, aggregated to 1 km grid cells.",
          topic: "deforestation",
          region: "southeast_asia",
          license: "cc_by",
          file_formats: ["csv", "geojson"],
          file_format_enum: "csv",
          primary_format: "csv",
          last_updated: "2026-02-14T10:30:00Z",
          size_mb: 850.2,
          download_url:
            "https://data.example.org/datasets/deforestation/seasia-alerts-2015-2025.csv",
          created_at: "2025-12-01T09:15:00Z",
        },
        {
          id: "ds_defor_seasia_2024_cover",
          title: "Southeast Asia Forest Cover Change Tiles (2000–2024)",
          description:
            "Annual forest cover and loss statistics for Southeast Asia at 30 m resolution, tiled by subregion.",
          topic: "deforestation",
          region: "southeast_asia",
          license: "cc0",
          file_formats: ["csv", "shapefile"],
          file_format_enum: "csv",
          primary_format: "csv",
          last_updated: "2026-01-20T09:00:00Z",
          size_mb: 1920.5,
          download_url:
            "https://data.example.org/datasets/deforestation/seasia-forest-cover-2000-2024.csv",
          created_at: "2025-10-11T14:05:00Z",
        },
        {
          id: "ds_defor_global_2001_2023",
          title: "Global Annual Deforestation Rates (2001–2023)",
          description:
            "Country-level annual deforestation estimates compiled from multiple remote sensing products.",
          topic: "deforestation",
          region: "global",
          license: "cc_by_sa",
          file_formats: ["csv"],
          file_format_enum: "csv",
          primary_format: "csv",
          last_updated: "2025-11-02T16:40:00Z",
          size_mb: 45.7,
          download_url:
            "https://data.example.org/datasets/deforestation/global-annual-2001-2023.csv",
          created_at: "2023-12-15T10:00:00Z",
        },
      ],
      events: [
        {
          id: "ev_ca_webinar_2025_01",
          title: "Resilient Cities: Climate Adaptation Webinar Series – Session 1",
          description:
            "An interactive webinar on climate adaptation strategies for urban heat, flooding, and water stress.",
          event_type: "webinar",
          topic: "climate_adaptation",
          region: "global",
          start_datetime: "2025-01-22T15:00:00Z",
          end_datetime: "2025-01-22T16:30:00Z",
          time_zone: "UTC",
          speakers: ["Dr. Lina Moretti", "Prof. Samuel Osei"],
          location: "Online (Zoom)",
          registration_url:
            "https://events.example.org/register/resilient-cities-session1",
          is_registration_required: true,
          created_at: "2024-11-10T09:00:00Z",
          updated_at: "2024-12-05T12:30:00Z",
        },
        {
          id: "ev_ca_webinar_2025_03",
          title: "Resilient Cities: Climate Adaptation Webinar Series – Session 2",
          description:
            "Focus on nature-based solutions for climate adaptation in coastal and riverine cities.",
          event_type: "webinar",
          topic: "climate_adaptation",
          region: "global",
          start_datetime: "2025-03-10T14:00:00Z",
          end_datetime: "2025-03-10T15:30:00Z",
          time_zone: "UTC",
          speakers: ["Dr. Lina Moretti", "Eng. Carlos Dominguez"],
          location: "Online (Zoom)",
          registration_url:
            "https://events.example.org/register/resilient-cities-session2",
          is_registration_required: true,
          created_at: "2024-11-10T09:05:00Z",
          updated_at: "2025-01-15T10:10:00Z",
        },
        {
          id: "ev_ca_webinar_2025_09",
          title: "Designing Climate-Resilient Water Systems",
          description:
            "A webinar on integrating climate projections into urban water infrastructure planning.",
          event_type: "webinar",
          topic: "climate_adaptation",
          region: "europe",
          start_datetime: "2025-09-15T09:00:00Z",
          end_datetime: "2025-09-15T11:00:00Z",
          time_zone: "Europe/Berlin",
          speakers: ["Prof. Jelena Kovac", "Dr. Ahmed El-Sayed"],
          location: "Online (Teams)",
          registration_url:
            "https://events.example.org/register/climate-resilient-water-systems",
          is_registration_required: true,
          created_at: "2025-04-02T08:30:00Z",
          updated_at: "2025-06-20T13:45:00Z",
        },
      ],
      projects: [
        {
          id: "proj_fresh_africa_2018_lvb",
          title: "Lake Victoria Basin Freshwater Biodiversity Resilience Initiative",
          short_title: "LVB Freshwater Resilience",
          description:
            "Long-term monitoring and conservation planning for freshwater biodiversity in the Lake Victoria Basin across Kenya, Uganda, and Tanzania.",
          topic: "freshwater_biodiversity",
          region: "africa",
          status: "ongoing",
          risk_level: "medium",
          components_tags: [
            "Monitoring",
            "Freshwater biodiversity",
            "Hydrological modeling",
          ],
          has_community_engagement: false,
          start_date: "2018-03-01T00:00:00Z",
          end_date: null,
          start_year: 2018,
          end_year: null,
          fieldwork_years: [
            2018,
            2019,
            2020,
            2021,
            2022,
            2023,
            2024,
          ],
          total_funding: 1200000,
          funding_currency: "usd",
          team_size: 14,
          next_milestone_date: "2026-05-15T00:00:00Z",
          duration_months: 96,
          objectives:
            "Assess spatial and temporal patterns of freshwater biodiversity and identify priority areas for conservation interventions.",
          methods:
            "Combine field surveys, environmental DNA sampling, and remote sensing of land use to model species distributions.",
          key_outcomes:
            "New biodiversity baselines and conservation priority maps for Lake Victoria Basin.",
          location: "Lake Victoria Basin, East Africa",
          latitude: -1.0,
          longitude: 33.0,
          primary_investigator_name: "Dr. Grace Nanyonga",
          primary_investigator_email: "grace.nanyonga@lvb-univ.org",
          primary_investigator_affiliation: "Lake Victoria Basin University",
          created_at: "2018-01-10T09:00:00Z",
          updated_at: "2025-11-20T12:30:00Z",
        },
        {
          id: "proj_fresh_africa_2019_congo",
          title: "Congo Basin Freshwater Biodiversity Sentinel Network",
          short_title: "Congo Freshwater Sentinel",
          description:
            "Establishing a network of freshwater biodiversity sentinel sites across the Congo Basin to track climate and land-use impacts.",
          topic: "freshwater_biodiversity",
          region: "africa",
          status: "ongoing",
          risk_level: "medium",
          components_tags: ["Freshwater biodiversity", "Long-term observatories"],
          has_community_engagement: false,
          start_date: "2019-02-15T00:00:00Z",
          end_date: null,
          start_year: 2019,
          end_year: null,
          fieldwork_years: [2019, 2020, 2021, 2022, 2023, 2024],
          total_funding: 2500000,
          funding_currency: "usd",
          team_size: 22,
          next_milestone_date: "2026-09-01T00:00:00Z",
          duration_months: 84,
          objectives:
            "Create a representative network of freshwater monitoring sites across key tributaries of the Congo Basin.",
          methods:
            "Standardized sampling of fish and macroinvertebrates, water chemistry, and remote sensing of catchment land cover.",
          key_outcomes:
            "Harmonized datasets and indicators for freshwater ecosystem health in the Congo Basin.",
          location: "Congo Basin, Central Africa",
          latitude: -1.5,
          longitude: 16.0,
          primary_investigator_name: "Prof. Michel Banza",
          primary_investigator_email: "michel.banza@univ-kinshasa.cd",
          primary_investigator_affiliation: "University of Kinshasa",
          created_at: "2019-01-05T10:20:00Z",
          updated_at: "2025-10-12T11:40:00Z",
        },
        {
          id: "proj_fresh_africa_2020_okavango",
          title:
            "Okavango Delta Freshwater Biodiversity and Livelihoods Program",
          short_title: "Okavango Freshwater-Livelihoods",
          description:
            "Integrated assessment of freshwater biodiversity and community dependence on wetlands in the Okavango Delta.",
          topic: "freshwater_biodiversity",
          region: "africa",
          status: "ongoing",
          risk_level: "low",
          components_tags: [
            "Freshwater biodiversity",
            "Livelihoods",
            "Ecosystem services",
          ],
          has_community_engagement: true,
          start_date: "2020-01-10T00:00:00Z",
          end_date: null,
          start_year: 2020,
          end_year: null,
          fieldwork_years: [2020, 2021, 2022, 2023, 2024],
          total_funding: 3000000,
          funding_currency: "usd",
          team_size: 18,
          next_milestone_date: "2026-07-20T00:00:00Z",
          duration_months: 72,
          objectives:
            "Quantify the links between freshwater biodiversity, ecosystem services, and local livelihoods.",
          methods:
            "Biodiversity surveys, participatory mapping, and socio-economic household surveys.",
          key_outcomes:
            "Policy recommendations for wetland management balancing conservation and livelihoods.",
          location: "Okavango Delta, Botswana",
          latitude: -19.5,
          longitude: 22.5,
          primary_investigator_name: "Dr. Naledi Kgobe",
          primary_investigator_email: "naledi.kgobe@botswana-uni.bw",
          primary_investigator_affiliation: "University of Botswana",
          created_at: "2019-11-30T09:30:00Z",
          updated_at: "2025-09-05T14:20:00Z",
        },
      ],
      publications: [
        {
          id: "pub_pm25_urban_2019_global_trends",
          title: "Global Trends in Urban PM2.5 Concentrations from 2000 to 2018",
          abstract:
            "We compile satellite-derived and ground-based PM2.5 estimates to analyze global trends in urban air quality and identify regions with the largest health gains.",
          publication_year: 2019,
          publication_date: "2019-06-15T00:00:00Z",
          type: "peer_reviewed_article",
          topic: "urban air quality; PM2.5; global trends",
          citation_count: 450,
          authors: [
            "Sarah L. Johnson",
            "Arun Gupta",
            "Maria C. Perez",
          ],
          journal: "Environmental Science & Technology",
          doi: "10.1021/acs.est.9b01234",
          url: "https://doi.org/10.1021/acs.est.9b01234",
          is_peer_reviewed: true,
          created_at: "2019-05-01T10:00:00Z",
        },
        {
          id: "pub_pm25_urban_2020_lowcost_sensors",
          title:
            "Evaluating Low-Cost PM2.5 Sensors for Urban Air Quality Monitoring Networks",
          abstract:
            "This study evaluates the performance of several low-cost PM2.5 sensors in an urban environment and provides guidance for network design and calibration.",
          publication_year: 2020,
          publication_date: "2020-03-20T00:00:00Z",
          type: "peer_reviewed_article",
          topic: "PM2.5; urban air quality; low-cost sensors",
          citation_count: 320,
          authors: ["Ananya Rao", "Michael T. Lee"],
          journal: "Atmospheric Environment",
          doi: "10.1016/j.atmosenv.2020.117543",
          url: "https://doi.org/10.1016/j.atmosenv.2020.117543",
          is_peer_reviewed: true,
          created_at: "2020-02-01T09:30:00Z",
        },
        {
          id: "pub_pm25_urban_2021_health_impacts",
          title:
            "Short-Term Health Impacts of PM2.5 Spikes in Megacities: Evidence from Emergency Admissions",
          abstract:
            "We link high-resolution PM2.5 data to emergency hospital admissions in three megacities to quantify short-term health risks.",
          publication_year: 2021,
          publication_date: "2021-09-10T00:00:00Z",
          type: "peer_reviewed_article",
          topic: "PM2.5; urban health; time-series analysis",
          citation_count: 280,
          authors: ["Jae-Min Park", "Luisa Fernandez", "Omar Khalid"],
          journal: "The Lancet Planetary Health",
          doi: "10.1016/S2542-5196(21)00123-4",
          url: "https://doi.org/10.1016/S2542-5196(21)00123-4",
          is_peer_reviewed: true,
          created_at: "2021-07-15T11:45:00Z",
        },
      ],
    };

    // Use storage keys from Storage Key Mapping
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('datasets', JSON.stringify(generatedData.datasets));
      localStorage.setItem('events', JSON.stringify(generatedData.events));
      localStorage.setItem('projects', JSON.stringify(generatedData.projects));
      localStorage.setItem(
        'publications',
        JSON.stringify(generatedData.publications)
      );

      // Initialize other collections as empty arrays/objects where appropriate
      const emptyArrays = [
        'project_lists',
        'project_list_items',
        'project_update_subscriptions',
        'contact_messages',
        'notes',
        'briefings',
        'compare_sessions',
        'reading_lists',
        'reading_list_items',
        'event_registrations',
        'download_queue_items',
      ];
      emptyArrays.forEach((key) => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify([]));
        }
      });

      // DownloadQueue is a single object or null; let business logic manage it,
      // but ensure key exists with null if not set.
      if (!localStorage.getItem('download_queue')) {
        localStorage.setItem('download_queue', 'null');
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveTop3FreshwaterProjectsToList();
    this.testTask2_SubscribeToFreshwaterProjectUpdates();
    this.testTask3_CreateUrbanAirQualityReadingList();
    this.testTask4_RegisterClimateAdaptationWebinarsAndSchedule();
    this.testTask5_QueueDeforestationDatasetsForDownload();
    this.testTask6_ContactCommunityEngagementProject();
    this.testTask7_SavePIContactToCollaborationNote();
    this.testTask8_CompareProjectsAndCreateBriefing();

    return this.results;
  }

  // Task 1: Save the 3 highest-funded African freshwater biodiversity projects (2018–2022) to a comparison list
  testTask1_SaveTop3FreshwaterProjectsToList() {
    const testName =
      'Task 1: Save top funded African freshwater biodiversity projects to list';
    console.log('Testing:', testName);

    try {
      const query = 'freshwater biodiversity';
      const filters = {
        topic: 'freshwater_biodiversity',
        region: 'africa',
        status: 'ongoing',
        start_year_min: 2018,
        start_year_max: 2022,
        funding_min: 1000000,
      };
      const sort = {
        sort_by: 'funding',
        sort_direction: 'desc',
      };

      const searchResult = this.logic.searchProjects(
        query,
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.projects),
        'searchProjects should return projects array'
      );

      const projectCards = searchResult.projects;
      const expectedToSave = Math.min(3, projectCards.length);
      this.assert(
        expectedToSave > 0,
        'There should be at least one matching freshwater project'
      );

      const listName = 'Africa Freshwater 2018-22';
      const savedProjectIds = [];

      // Save first project to a new list
      const firstProjectId = projectCards[0].project.id;
      savedProjectIds.push(firstProjectId);

      const saveResult1 = this.logic.saveProjectToList(firstProjectId, {
        mode: 'new',
        new_list_name: listName,
        list_type: 'comparison',
      });

      this.assert(
        saveResult1 && saveResult1.success === true,
        'First saveProjectToList call should succeed'
      );
      this.assert(
        saveResult1.project_list && saveResult1.project_list.id,
        'saveProjectToList should return a project_list with id'
      );

      const listId = saveResult1.project_list.id;

      // Save next projects to the existing list
      for (let i = 1; i < expectedToSave; i++) {
        const projectId = projectCards[i].project.id;
        savedProjectIds.push(projectId);
        const saveResult = this.logic.saveProjectToList(projectId, {
          mode: 'existing',
          project_list_id: listId,
          list_type: 'comparison',
        });
        this.assert(
          saveResult && saveResult.success === true,
          'Subsequent saveProjectToList call should succeed for project index ' + i
        );
      }

      // Verify via getProjectLists
      const listsSummary = this.logic.getProjectLists();
      this.assert(
        Array.isArray(listsSummary),
        'getProjectLists should return an array'
      );

      const targetListSummary = listsSummary.find(
        (entry) => entry.list && entry.list.id === listId
      );
      this.assert(
        targetListSummary,
        'Created list should appear in getProjectLists results'
      );

      const expectedCount = savedProjectIds.length;
      this.assert(
        targetListSummary.item_count === expectedCount,
        'List should contain ' + expectedCount + ' projects; actual: ' +
          targetListSummary.item_count
      );

      // Optional: verify underlying ProjectListItem relationships from storage
      if (typeof localStorage !== 'undefined') {
        const rawItems = localStorage.getItem('project_list_items') || '[]';
        const listItems = JSON.parse(rawItems);
        const itemsForList = listItems.filter(
          (item) => item.project_list_id === listId
        );
        this.assert(
          itemsForList.length === expectedCount,
          'Underlying project_list_items should match expected count'
        );
        savedProjectIds.forEach((pid) => {
          const found = itemsForList.some((it) => it.project_id === pid);
          this.assert(
            found,
            'Each saved project id should be present in ProjectListItem records'
          );
        });
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Subscribe to updates for a 2024-fieldwork African freshwater project
  testTask2_SubscribeToFreshwaterProjectUpdates() {
    const testName =
      'Task 2: Subscribe to updates for 2024-fieldwork African freshwater project';
    console.log('Testing:', testName);

    try {
      // Adapted filters: freshwater biodiversity projects in Africa with fieldwork in 2024
      const filters = {
        topic: 'freshwater_biodiversity',
        region: 'africa',
        fieldwork_year: 2024,
      };
      const sort = {
        sort_by: 'next_milestone',
        sort_direction: 'asc',
      };

      const searchResult = this.logic.searchProjects(
        '',
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.projects),
        'searchProjects should return projects array'
      );
      this.assert(
        searchResult.projects.length > 0,
        'There should be at least one project with fieldwork in 2024'
      );

      const firstProjectCard = searchResult.projects[0];
      const projectId = firstProjectCard.project.id;

      // Simulate opening project detail
      const projectDetail = this.logic.getProjectDetail(projectId);
      this.assert(
        projectDetail && projectDetail.project && projectDetail.project.id === projectId,
        'getProjectDetail should return the selected project'
      );

      const email = 'coastal.observer@example.org';
      const subResult = this.logic.subscribeToProjectUpdates(
        projectId,
        email,
        true
      );

      this.assert(
        subResult && subResult.success === true,
        'subscribeToProjectUpdates should succeed'
      );
      this.assert(
        subResult.subscription && subResult.subscription.id,
        'Subscription response should contain a subscription with id'
      );

      const subscription = subResult.subscription;
      this.assert(
        subscription.project_id === projectId,
        'Subscription.project_id should match selected project'
      );
      this.assert(
        subscription.email === email,
        'Subscription email should equal provided email'
      );
      this.assert(
        subscription.email_updates_enabled === true,
        'email_updates_enabled should be true after subscribing'
      );

      // Verify quick actions state reflects the subscription
      const quickState = this.logic.getProjectQuickActionsState(projectId);
      this.assert(
        quickState && quickState.has_update_subscription === true,
        'Quick actions state should show has_update_subscription = true'
      );

      // Verify storage linkage
      if (typeof localStorage !== 'undefined') {
        const rawSubs =
          localStorage.getItem('project_update_subscriptions') || '[]';
        const subs = JSON.parse(rawSubs);
        const storedSub = subs.find(
          (s) => s.id === subscription.id && s.project_id === projectId
        );
        this.assert(
          !!storedSub,
          'Subscription should be persisted in project_update_subscriptions'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create an "Urban Air Quality" reading list with PM2.5 articles (2019–2023)
  testTask3_CreateUrbanAirQualityReadingList() {
    const testName =
      'Task 3: Create Urban Air Quality reading list with PM2.5 articles';
    console.log('Testing:', testName);

    try {
      const query = 'PM2.5 urban air quality';
      const filters = {
        type: 'peer_reviewed_article',
        is_peer_reviewed: true,
        publication_year_min: 2019,
        publication_year_max: 2023,
      };
      const sort = {
        sort_by: 'citations',
        sort_direction: 'desc',
      };

      const searchResult = this.logic.searchPublications(
        query,
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.publications),
        'searchPublications should return publications array'
      );

      const pubCards = searchResult.publications;
      const toAddCount = Math.min(5, pubCards.length);
      this.assert(
        toAddCount > 0,
        'There should be at least one matching PM2.5 publication'
      );

      const listName = 'Urban Air Quality';
      const addedPublicationIds = [];

      // Add first publication: create new list
      const firstPubId = pubCards[0].publication.id;
      addedPublicationIds.push(firstPubId);

      const addResult1 = this.logic.addPublicationToReadingList(firstPubId, {
        mode: 'new',
        new_list_name: listName,
      });

      this.assert(
        addResult1 && addResult1.success === true,
        'First addPublicationToReadingList should succeed'
      );
      this.assert(
        addResult1.reading_list && addResult1.reading_list.id,
        'Reading list should be returned with an id'
      );

      const readingListId = addResult1.reading_list.id;

      // Add remaining publications to existing list
      for (let i = 1; i < toAddCount; i++) {
        const pubId = pubCards[i].publication.id;
        addedPublicationIds.push(pubId);
        const addResult = this.logic.addPublicationToReadingList(pubId, {
          mode: 'existing',
          reading_list_id: readingListId,
        });
        this.assert(
          addResult && addResult.success === true,
          'addPublicationToReadingList should succeed for publication index ' + i
        );
      }

      // Open Reading Lists summary
      const rlSummary = this.logic.getReadingListsSummary();
      this.assert(
        Array.isArray(rlSummary),
        'getReadingListsSummary should return an array'
      );

      const targetSummary = rlSummary.find(
        (entry) => entry.reading_list && entry.reading_list.id === readingListId
      );
      this.assert(
        targetSummary,
        'Created reading list should appear in summary results'
      );
      this.assert(
        targetSummary.item_count === addedPublicationIds.length,
        'Reading list should contain ' +
          addedPublicationIds.length +
          ' items; actual: ' +
          targetSummary.item_count
      );

      // Open the specific Reading List detail
      const rlDetail = this.logic.getReadingListDetail(readingListId);
      this.assert(
        rlDetail && rlDetail.reading_list && rlDetail.reading_list.id === readingListId,
        'getReadingListDetail should return the created list'
      );
      this.assert(
        Array.isArray(rlDetail.items),
        'Reading list detail should contain items array'
      );
      this.assert(
        rlDetail.items.length === addedPublicationIds.length,
        'Reading list detail item count should match added publications'
      );

      // Verify each added publication is present
      addedPublicationIds.forEach((pid) => {
        const found = rlDetail.items.some(
          (it) => it.publication && it.publication.id === pid
        );
        this.assert(
          found,
          'Each added publication should appear in the reading list detail'
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register for 2 climate adaptation webinars in the first half of 2025 and add them to My Schedule
  testTask4_RegisterClimateAdaptationWebinarsAndSchedule() {
    const testName =
      'Task 4: Register for 2 climate adaptation webinars and add to My Schedule';
    console.log('Testing:', testName);

    try {
      const filters = {
        event_type: 'webinar',
        topic: 'climate_adaptation',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
      };
      const sort = {
        sort_by: 'date',
        sort_direction: 'asc',
      };

      const searchResult = this.logic.searchEvents(
        '',
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.events),
        'searchEvents should return events array'
      );

      const events = searchResult.events;
      this.assert(
        events.length >= 2,
        'There should be at least 2 climate adaptation webinars in H1 2025'
      );

      const registrantName = 'Alex Rivera';
      const registrantEmail = 'alex.rivera@example.org';
      const scheduledEventIds = [];

      // Register and add first two events to schedule
      for (let i = 0; i < 2; i++) {
        const eventCard = events[i];
        const eventId = eventCard.event.id;

        // Open event detail
        const eventDetail = this.logic.getEventDetail(eventId);
        this.assert(
          eventDetail && eventDetail.event && eventDetail.event.id === eventId,
          'getEventDetail should return selected event for index ' + i
        );

        // Register for event
        const regResult = this.logic.registerForEvent(
          eventId,
          registrantName,
          registrantEmail
        );
        this.assert(
          regResult && regResult.success === true,
          'registerForEvent should succeed for event index ' + i
        );
        this.assert(
          regResult.event_registration && regResult.event_registration.id,
          'registerForEvent should return an event_registration with id'
        );

        const registration = regResult.event_registration;
        this.assert(
          registration.event_id === eventId,
          'Event registration event_id should match event id'
        );
        this.assert(
          registration.registrant_name === registrantName,
          'Registrant name should match provided name'
        );
        this.assert(
          registration.registrant_email === registrantEmail,
          'Registrant email should match provided email'
        );

        // Add to My Schedule
        const schedResult = this.logic.addEventToMySchedule(eventId);
        this.assert(
          schedResult && schedResult.success === true,
          'addEventToMySchedule should succeed for event index ' + i
        );
        this.assert(
          schedResult.event_registration &&
            schedResult.event_registration.added_to_schedule === true,
          'Event registration should be marked added_to_schedule'
        );

        scheduledEventIds.push(eventId);
      }

      // Verify My Schedule contains both events
      const schedule = this.logic.getMySchedule();
      this.assert(
        Array.isArray(schedule),
        'getMySchedule should return an array'
      );

      const scheduled = schedule.filter((entry) =>
        scheduledEventIds.includes(entry.event.id)
      );
      this.assert(
        scheduled.length === scheduledEventIds.length,
        'My Schedule should contain all registered events'
      );

      scheduled.forEach((entry) => {
        this.assert(
          entry.event_registration.added_to_schedule === true,
          'Each scheduled entry should have added_to_schedule = true'
        );
        this.assert(
          entry.event_registration.registrant_name === registrantName,
          'Scheduled registration name should match'
        );
        this.assert(
          entry.event_registration.registrant_email === registrantEmail,
          'Scheduled registration email should match'
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Queue 2 open-license deforestation datasets from Southeast Asia for download
  testTask5_QueueDeforestationDatasetsForDownload() {
    const testName =
      'Task 5: Queue 2 Southeast Asia deforestation datasets for ZIP download';
    console.log('Testing:', testName);

    try {
      const query = 'deforestation';
      const filters = {
        region: 'southeast_asia',
        license: ['cc_by', 'cc0'],
        file_format: 'csv',
      };
      const sort = {
        sort_by: 'last_updated',
        sort_direction: 'desc',
      };

      const searchResult = this.logic.searchDatasets(
        query,
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.datasets),
        'searchDatasets should return datasets array'
      );

      const dsCards = searchResult.datasets;
      this.assert(
        dsCards.length >= 2,
        'There should be at least 2 matching Southeast Asia deforestation datasets'
      );

      const queuedDatasetIds = [];

      // Add first two datasets to download queue
      for (let i = 0; i < 2; i++) {
        const datasetId = dsCards[i].dataset.id;
        queuedDatasetIds.push(datasetId);

        const addResult = this.logic.addDatasetToDownloadQueue(datasetId);
        this.assert(
          addResult && addResult.success === true,
          'addDatasetToDownloadQueue should succeed for dataset index ' + i
        );
        this.assert(
          addResult.download_queue && addResult.download_queue.id,
          'download_queue should be returned with id'
        );
      }

      // Verify queue contents
      const queueDetail = this.logic.getDownloadQueueDetail();
      this.assert(
        queueDetail && queueDetail.download_queue && Array.isArray(queueDetail.items),
        'getDownloadQueueDetail should return queue and items'
      );

      const items = queueDetail.items;
      this.assert(
        items.length === queuedDatasetIds.length,
        'Download queue should contain ' + queuedDatasetIds.length + ' items'
      );

      items.forEach((entry) => {
        const ds = entry.dataset;
        this.assert(
          queuedDatasetIds.includes(ds.id),
          'Each queued dataset should be one of the selected dataset ids'
        );
        this.assert(
          ds.primary_format === 'csv',
          'Queued dataset primary_format should be csv'
        );
        this.assert(
          ds.region === 'southeast_asia',
          'Queued dataset region should be southeast_asia'
        );
        this.assert(
          ds.license === 'cc_by' || ds.license === 'cc0',
          'Queued dataset license should be CC-BY or CC0'
        );
      });

      // Prepare ZIP download
      const zipResult = this.logic.downloadQueueAsZip();
      this.assert(
        zipResult && zipResult.success === true,
        'downloadQueueAsZip should succeed'
      );
      this.assert(
        typeof zipResult.download_url === 'string' &&
          zipResult.download_url.length > 0,
        'ZIP download_url should be a non-empty string'
      );
      this.assert(
        zipResult.file_count === items.length,
        'ZIP file_count should match number of items in queue'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6 (adapted): Contact a water-related community engagement project to join its mailing list
  testTask6_ContactCommunityEngagementProject() {
    const testName =
      'Task 6: Contact freshwater community engagement project via contact form';
    console.log('Testing:', testName);

    try {
      // Adapted filters: freshwater biodiversity projects with community engagement and low risk
      const filters = {
        topic: 'freshwater_biodiversity',
        has_community_engagement: true,
        risk_level: 'low',
      };
      const sort = {
        sort_by: 'start_date',
        sort_direction: 'desc',
      };

      const searchResult = this.logic.searchProjects(
        '',
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.projects),
        'searchProjects should return projects array'
      );
      this.assert(
        searchResult.projects.length > 0,
        'There should be at least one community engagement freshwater project'
      );

      const projectCard = searchResult.projects[0];
      const projectId = projectCard.project.id;

      // Open project detail
      const projectDetail = this.logic.getProjectDetail(projectId);
      this.assert(
        projectDetail && projectDetail.project && projectDetail.project.id === projectId,
        'getProjectDetail should return the selected community engagement project'
      );

      // Send contact message
      const senderName = 'Jordan Lee';
      const senderEmail = 'jordan.lee@example.net';
      const messageBody =
        'I am interested in joining the volunteer mailing list for this project, ' +
        'especially for activities planned between June and December. Please add me to any community outreach announcements.';

      const contactResult = this.logic.sendProjectContactMessage(
        projectId,
        senderName,
        senderEmail,
        messageBody
      );

      this.assert(
        contactResult && contactResult.success === true,
        'sendProjectContactMessage should succeed'
      );
      this.assert(
        contactResult.contact_message && contactResult.contact_message.id,
        'Contact message should be returned with id'
      );

      const msg = contactResult.contact_message;
      this.assert(
        msg.project_id === projectId,
        'ContactMessage.project_id should match selected project'
      );
      this.assert(
        msg.sender_name === senderName,
        'ContactMessage sender_name should match provided name'
      );
      this.assert(
        msg.sender_email === senderEmail,
        'ContactMessage sender_email should match provided email'
      );
      this.assert(
        msg.message_body === messageBody,
        'ContactMessage message_body should match provided body'
      );
      this.assert(
        msg.status === 'sent',
        'ContactMessage status should be "sent" after sending'
      );

      // Verify persistence in contact_messages storage
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('contact_messages') || '[]';
        const messages = JSON.parse(raw);
        const stored = messages.find((m) => m.id === msg.id);
        this.assert(
          !!stored,
          'Contact message should be persisted in contact_messages'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7 (adapted): Save PI contact for an ongoing freshwater project with budget/team filters to a "Collaboration ideas" note
  testTask7_SavePIContactToCollaborationNote() {
    const testName =
      'Task 7: Save PI contact for filtered freshwater project into Collaboration ideas note';
    console.log('Testing:', testName);

    try {
      // Step 1: pick a candidate ongoing project to derive realistic filters (e.g., newest ongoing)
      const initialSearch = this.logic.searchProjects(
        '',
        { status: 'ongoing' },
        { sort_by: 'start_date', sort_direction: 'desc' },
        1,
        10
      );

      this.assert(
        initialSearch && Array.isArray(initialSearch.projects),
        'Initial searchProjects should return projects array'
      );
      this.assert(
        initialSearch.projects.length > 0,
        'There should be at least one ongoing project to use as candidate'
      );

      const candidateCard = initialSearch.projects[0];
      const candidateProject = candidateCard.project;
      const candidateTeamSize = candidateProject.team_size;
      const candidateFunding = candidateProject.total_funding;
      const candidateProjectId = candidateProject.id;

      // Step 2: fetch team size buckets and select bucket covering the candidate's team size
      const filterOptions = this.logic.getProjectFilterOptions();
      this.assert(
        filterOptions && Array.isArray(filterOptions.team_size_buckets),
        'getProjectFilterOptions should provide team_size_buckets'
      );

      const bucket = filterOptions.team_size_buckets.find((b) => {
        const min = typeof b.min_size === 'number' ? b.min_size : 0;
        const max = typeof b.max_size === 'number' ? b.max_size : Number.MAX_SAFE_INTEGER;
        return candidateTeamSize >= min && candidateTeamSize <= max;
      });

      this.assert(
        bucket && bucket.id,
        'Should find a team size bucket that includes the candidate project'
      );

      const teamSizeBucketId = bucket.id;

      // Step 3: search with constraints similar to original task (status, funding_max, team_size_bucket)
      const filters = {
        status: 'ongoing',
        funding_max: candidateFunding,
        team_size_bucket_id: teamSizeBucketId,
      };
      const sort = {
        sort_by: 'start_date',
        sort_direction: 'desc',
      };

      const constrainedSearch = this.logic.searchProjects(
        '',
        filters,
        sort,
        1,
        10
      );

      this.assert(
        constrainedSearch && Array.isArray(constrainedSearch.projects),
        'Constrained searchProjects should return projects array'
      );
      this.assert(
        constrainedSearch.projects.length > 0,
        'Constrained search should still return at least one project'
      );

      // Find the candidate project within constrained results
      const finalCard = constrainedSearch.projects.find(
        (card) => card.project.id === candidateProjectId
      ) || constrainedSearch.projects[0];

      const projectId = finalCard.project.id;

      // Fetch detail to get PI info
      const projectDetail = this.logic.getProjectDetail(projectId);
      this.assert(
        projectDetail && projectDetail.project && projectDetail.project.id === projectId,
        'getProjectDetail should return chosen project'
      );

      const piName = projectDetail.project.primary_investigator_name;
      const piEmail = projectDetail.project.primary_investigator_email;

      const noteTitle = 'Collaboration ideas';
      const noteBody =
        'Follow up with this PI about potential collaboration on microplastics research methods.';

      const noteResult = this.logic.savePIContactToNote(
        projectId,
        noteTitle,
        noteBody
      );

      this.assert(
        noteResult && noteResult.success === true,
        'savePIContactToNote should succeed'
      );
      this.assert(
        noteResult.note && noteResult.note.id,
        'savePIContactToNote should return a note with id'
      );

      const note = noteResult.note;
      this.assert(
        note.title === noteTitle,
        'Note title should match provided title'
      );
      this.assert(
        note.body === noteBody,
        'Note body should match provided body'
      );
      this.assert(
        note.related_project_id === projectId,
        'Note.related_project_id should link back to the project'
      );
      if (piName) {
        this.assert(
          note.related_pi_name === piName,
          'Note.related_pi_name should match project PI name when available'
        );
      }
      if (piEmail) {
        this.assert(
          note.related_pi_email === piEmail,
          'Note.related_pi_email should match project PI email when available'
        );
      }

      // Verify the note appears in notes summary with project title
      const notesSummary = this.logic.getNotesSummary();
      this.assert(
        Array.isArray(notesSummary),
        'getNotesSummary should return an array'
      );
      const summaryEntry = notesSummary.find(
        (entry) => entry.note && entry.note.id === note.id
      );
      this.assert(
        summaryEntry,
        'Saved note should appear in notes summary'
      );
      if (summaryEntry.related_project_title) {
        this.assert(
          summaryEntry.related_project_title === projectDetail.project.title,
          'related_project_title in notes summary should match project title'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Compare two freshwater projects and add the longer-duration one to a briefing with 3 sections
  testTask8_CompareProjectsAndCreateBriefing() {
    const testName =
      'Task 8: Compare freshwater projects and create briefing for longer-duration project';
    console.log('Testing:', testName);

    try {
      // Filter ongoing freshwater projects in Africa
      const filters = {
        topic: 'freshwater_biodiversity',
        region: 'africa',
        status: 'ongoing',
      };
      const sort = {
        sort_by: 'end_date', // as in original task (even though end_date may be null)
        sort_direction: 'desc',
      };

      const searchResult = this.logic.searchProjects(
        '',
        filters,
        sort,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.projects),
        'searchProjects should return projects array'
      );
      this.assert(
        searchResult.projects.length >= 2,
        'There should be at least 2 freshwater projects to compare'
      );

      const firstTwo = searchResult.projects.slice(0, 2);

      // Add first two projects to compare session
      firstTwo.forEach((card, index) => {
        const projectId = card.project.id;
        const addResult = this.logic.addProjectToCompare(projectId);
        this.assert(
          addResult && addResult.compare_session && Array.isArray(addResult.compare_session.project_ids),
          'addProjectToCompare should return a compare_session for project index ' + index
        );
      });

      // Get comparison summary
      const compareSummary = this.logic.getCompareSessionSummary();
      this.assert(
        compareSummary && compareSummary.compare_session,
        'getCompareSessionSummary should return a compare_session'
      );
      this.assert(
        Array.isArray(compareSummary.projects),
        'Comparison summary should include projects array'
      );
      this.assert(
        compareSummary.projects.length >= 2,
        'Comparison summary should include at least 2 projects'
      );

      const cmpProjects = compareSummary.projects;

      // Choose project with longer duration (or first if equal), using either
      // is_longest_duration flag or duration_months values.
      let chosen = cmpProjects[0];
      for (let i = 0; i < cmpProjects.length; i++) {
        const item = cmpProjects[i];
        if (item.is_longest_duration) {
          chosen = item;
          break;
        }
        if (
          typeof item.duration_months === 'number' &&
          typeof chosen.duration_months === 'number' &&
          item.duration_months > chosen.duration_months
        ) {
          chosen = item;
        }
      }

      const chosenProjectId = chosen.project.id;

      // Fetch project detail to access objectives/methods/key outcomes
      const projectDetail = this.logic.getProjectDetail(chosenProjectId);
      this.assert(
        projectDetail && projectDetail.project && projectDetail.project.id === chosenProjectId,
        'getProjectDetail should return chosen comparison project'
      );

      const briefingTitle =
        'Briefing for longest-duration freshwater project: ' +
        projectDetail.project.title;
      const includedSections = ['objectives', 'methods', 'key_outcomes'];

      const briefingResult = this.logic.createBriefingFromProject(
        chosenProjectId,
        briefingTitle,
        includedSections
      );

      this.assert(
        briefingResult && briefingResult.success === true,
        'createBriefingFromProject should succeed'
      );
      this.assert(
        briefingResult.briefing && briefingResult.briefing.id,
        'Briefing should be returned with id'
      );

      const briefing = briefingResult.briefing;
      this.assert(
        briefing.project_id === chosenProjectId,
        'Briefing.project_id should match chosen project id'
      );
      this.assert(
        Array.isArray(briefing.included_sections),
        'Briefing.included_sections should be an array'
      );
      includedSections.forEach((sec) => {
        this.assert(
          briefing.included_sections.indexOf(sec) !== -1,
          'Briefing should include section ' + sec
        );
      });

      // Verify that briefing texts (where available) are populated from project data
      if (projectDetail.project.objectives) {
        this.assert(
          briefing.objectives_text === projectDetail.project.objectives,
          'briefing.objectives_text should mirror project objectives'
        );
      }
      if (projectDetail.project.methods) {
        this.assert(
          briefing.methods_text === projectDetail.project.methods,
          'briefing.methods_text should mirror project methods'
        );
      }
      if (projectDetail.project.key_outcomes) {
        this.assert(
          briefing.key_outcomes_text === projectDetail.project.key_outcomes,
          'briefing.key_outcomes_text should mirror project key_outcomes'
        );
      }

      // Confirm briefing appears in summary and detail
      const briefingsSummary = this.logic.getBriefingsSummary();
      this.assert(
        Array.isArray(briefingsSummary),
        'getBriefingsSummary should return an array'
      );
      const summaryItem = briefingsSummary.find(
        (entry) => entry.briefing && entry.briefing.id === briefing.id
      );
      this.assert(
        summaryItem,
        'Created briefing should appear in briefings summary'
      );

      const briefingDetail = this.logic.getBriefingDetail(briefing.id);
      this.assert(
        briefingDetail && briefingDetail.id === briefing.id,
        'getBriefingDetail should return the created briefing'
      );

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
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
