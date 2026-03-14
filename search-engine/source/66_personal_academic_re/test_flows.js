class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem: function (key, value) {
          this._data[key] = String(value);
        },
        getItem: function (key) {
          return Object.prototype.hasOwnProperty.call(this._data, key)
            ? this._data[key]
            : null;
        },
        removeItem: function (key) {
          delete this._data[key];
        },
        clear: function () {
          this._data = {};
        }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure in business logic (if available)
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage using the Generated Data
    const generatedData = {
      availability_slots: [
        {
          id: 'slot_2026-03-04_10-00',
          startDateTime: '2026-03-04T10:00:00Z',
          endDateTime: '2026-03-04T10:30:00Z',
          dayOfWeek: 'wednesday',
          isAvailable: true,
          notes: 'Office hours for prospective PhD students'
        },
        {
          id: 'slot_2026-03-04_10-30',
          startDateTime: '2026-03-04T10:30:00Z',
          endDateTime: '2026-03-04T11:00:00Z',
          dayOfWeek: 'wednesday',
          isAvailable: true,
          notes: ''
        },
        {
          id: 'slot_2026-03-04_11-30',
          startDateTime: '2026-03-04T11:30:00Z',
          endDateTime: '2026-03-04T12:00:00Z',
          dayOfWeek: 'wednesday',
          isAvailable: false,
          notes: 'Reserved for group meeting'
        }
      ],
      courses: [
        {
          id: 'course_ml_510',
          courseCode: 'CS 510',
          courseNumber: 510,
          title: 'Foundations of Machine Learning',
          termLabel: 'Spring 2025',
          termSeason: 'spring',
          termYear: 2025,
          level: 'graduate',
          credits: 3,
          description:
            'Core graduate introduction to supervised and unsupervised learning, with emphasis on theoretical foundations and practical implementation.'
        },
        {
          id: 'course_rl_520',
          courseCode: 'CS 520',
          courseNumber: 520,
          title: 'Reinforcement Learning',
          termLabel: 'Spring 2025',
          termSeason: 'spring',
          termYear: 2025,
          level: 'graduate',
          credits: 3,
          description:
            'Graduate-level course covering Markov decision processes, dynamic programming, temporal-difference learning, policy gradients, and deep reinforcement learning.'
        },
        {
          id: 'course_pgm_530',
          courseCode: 'CS 530',
          courseNumber: 530,
          title: 'Probabilistic Graphical Models',
          termLabel: 'Spring 2025',
          termSeason: 'spring',
          termYear: 2025,
          level: 'graduate',
          credits: 4,
          description:
            'Graphical models, inference, and learning with applications to scientific modeling and causal discovery.'
        }
      ],
      events: [
        {
          id: 'event_online_gnn_tutorial_2026_03_10',
          title: 'Online Tutorial: Introduction to Graph Neural Networks',
          description:
            'A two-hour tutorial on the basics of graph neural network models and their applications in scientific domains.',
          abstract:
            'We introduce the fundamentals of graph neural networks, including message passing, pooling, and training strategies, with examples from chemistry and climate science.',
          startDateTime: '2026-03-10T15:00:00Z',
          endDateTime: '2026-03-10T17:00:00Z',
          locationName: 'Online',
          locationCity: '',
          locationCountry: '',
          locationType: 'online',
          accessType: 'public',
          isCanceled: false,
          relatedProjectIds: [],
          relatedPublicationIds: []
        },
        {
          id: 'event_private_colloq_ny_2026_03_10',
          title: 'Department Colloquium: Causal Inference for Scientific Discovery',
          description:
            'Internal department colloquium on causal modeling in scientific applications.',
          abstract: '',
          startDateTime: '2026-03-10T19:00:00Z',
          endDateTime: '2026-03-10T20:00:00Z',
          locationName: 'Computer Science Building',
          locationCity: 'New York',
          locationCountry: 'USA',
          locationType: 'in_person',
          accessType: 'private',
          isCanceled: false,
          relatedProjectIds: [],
          relatedPublicationIds: []
        },
        {
          id: 'event_online_rl_colloq_2026_03_18',
          title: 'Online Colloquium: Robust Causal Reinforcement Learning',
          description:
            'Public colloquium discussing recent advances in robust and causal reinforcement learning.',
          abstract: '',
          startDateTime: '2026-03-18T16:00:00Z',
          endDateTime: '2026-03-18T17:00:00Z',
          locationName: 'Online',
          locationCity: '',
          locationCountry: '',
          locationType: 'online',
          accessType: 'public',
          isCanceled: false,
          relatedProjectIds: [],
          relatedPublicationIds: []
        }
      ],
      publications: [
        {
          id: 'pub_rl_journal_2019_safe_exploration',
          title: 'Safe Exploration in Reinforcement Learning for Scientific Discovery',
          abstract:
            'We propose a framework for safe exploration in reinforcement learning tailored to automated scientific experimentation.',
          year: 2019,
          publicationType: 'journal_article',
          venueName: 'Journal of Machine Learning Research',
          citationCount: 185,
          keywords: [
            'reinforcement learning',
            'safe exploration',
            'scientific discovery'
          ],
          topics: ['machine learning', 'reinforcement learning', 'safety'],
          authors: ['Alexandra Müller', 'David K. Nguyen', 'Priya S. Rao'],
          doi: '10.5555/jmlr.2019.123456',
          isFeatured: false,
          apaCitation:
            'Müller, A., Nguyen, D. K., & Rao, P. S. (2019). Safe exploration in reinforcement learning for scientific discovery. Journal of Machine Learning Research, 20(115), 1–35. https://doi.org/10.5555/jmlr.2019.123456',
          createdAt: '2019-07-10T10:00:00Z'
        },
        {
          id: 'pub_rl_journal_2020_model_based',
          title: 'Model-based Reinforcement Learning for Automated Experiment Design',
          abstract:
            'This paper introduces a model-based RL approach to designing informative experiments in physical sciences.',
          year: 2020,
          publicationType: 'journal_article',
          venueName: 'Nature Machine Intelligence',
          citationCount: 220,
          keywords: [
            'reinforcement learning',
            'model-based rl',
            'experiment design'
          ],
          topics: [
            'machine learning',
            'reinforcement learning',
            'experimental design'
          ],
          authors: ['Alexandra Müller', 'Michael Chen'],
          doi: '10.1038/s42256-020-01234-x',
          isFeatured: false,
          apaCitation:
            'Müller, A., & Chen, M. (2020). Model-based reinforcement learning for automated experiment design. Nature Machine Intelligence, 2(8), 600–609. https://doi.org/10.1038/s42256-020-01234-x',
          createdAt: '2020-08-15T09:30:00Z'
        },
        {
          id: 'pub_rl_journal_2021_offline',
          title: 'Offline Reinforcement Learning for Data-efficient Scientific Discovery',
          abstract:
            'We study offline RL algorithms in low-data regimes typical for scientific laboratories.',
          year: 2021,
          publicationType: 'journal_article',
          venueName: 'Proceedings of the National Academy of Sciences',
          citationCount: 150,
          keywords: [
            'reinforcement learning',
            'offline rl',
            'scientific discovery'
          ],
          topics: ['machine learning', 'reinforcement learning'],
          authors: ['Alexandra Müller', 'Sara Patel', 'Lin Wang'],
          doi: '10.1073/pnas.2101234118',
          isFeatured: false,
          apaCitation:
            'Müller, A., Patel, S., & Wang, L. (2021). Offline reinforcement learning for data-efficient scientific discovery. Proceedings of the National Academy of Sciences, 118(42), e2101234118. https://doi.org/10.1073/pnas.2101234118',
          createdAt: '2021-10-01T11:15:00Z'
        }
      ],
      team_members: [
        {
          id: 'tm_elena_rossi',
          fullName: 'Dr. Elena Rossi',
          role: 'Principal Investigator',
          affiliation: 'Department of Computer Science, Columbia University',
          email: 'elena.rossi@columbia.edu'
        },
        {
          id: 'tm_michael_chen',
          fullName: 'Dr. Michael Chen',
          role: 'Senior Research Scientist',
          affiliation: 'Department of Computer Science, Columbia University',
          email: 'michael.chen@columbia.edu'
        },
        {
          id: 'tm_sara_patel',
          fullName: 'Sara Patel',
          role: 'PhD Student',
          affiliation: 'Department of Computer Science, Columbia University',
          email: 'sara.patel@columbia.edu'
        }
      ],
      projects: [
        {
          id: 'project_climate_gnn_multiscale',
          title: 'Graph Neural Networks for Multi-scale Climate Modeling',
          shortTitle: 'GNNs for Multi-scale Climate Modeling',
          description:
            'Develops graph neural network architectures to represent multi-scale processes in the climate system, integrating observational data and simulations for improved climate modeling and prediction.',
          topicKeywords: [
            'graph neural networks',
            'climate modeling',
            'multi-scale dynamics',
            'climate prediction'
          ],
          status: 'active',
          fundingAmount: 1200000,
          fundingCurrency: 'USD',
          fundingSource: 'National Science Foundation (NSF)',
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2027-12-31T00:00:00Z',
          climateRelated: true,
          teamMemberCount: 5
        },
        {
          id: 'project_climate_prob_policy',
          title: 'Probabilistic Climate Modeling for Policy Decisions',
          shortTitle: 'Probabilistic Climate Modeling for Policy',
          description:
            'Builds probabilistic climate modeling tools that quantify uncertainty in future climate outcomes to support evidence-based climate policy and risk management.',
          topicKeywords: [
            'probabilistic modeling',
            'climate modeling',
            'uncertainty quantification',
            'climate policy'
          ],
          status: 'active',
          fundingAmount: 900000,
          fundingCurrency: 'USD',
          fundingSource: 'U.S. Department of Energy (DOE)',
          startDate: '2023-06-01T00:00:00Z',
          endDate: '2026-05-31T00:00:00Z',
          climateRelated: true,
          teamMemberCount: 3
        },
        {
          id: 'project_climate_bayesian_calibration',
          title: 'Bayesian Calibration of Earth System Models',
          shortTitle: 'Bayesian Climate Model Calibration',
          description:
            'Applies Bayesian inference and advanced MCMC methods to calibrate complex Earth system models against heterogeneous climate observations.',
          topicKeywords: [
            'bayesian inference',
            'earth system models',
            'uncertainty quantification'
          ],
          status: 'completed',
          fundingAmount: 600000,
          fundingCurrency: 'USD',
          fundingSource: 'European Research Council (ERC)',
          startDate: '2019-01-01T00:00:00Z',
          endDate: '2022-12-31T00:00:00Z',
          climateRelated: true,
          teamMemberCount: 3
        }
      ],
      project_team_members: [
        {
          id: 'ptm_1',
          projectId: 'project_climate_gnn_multiscale',
          teamMemberId: 'tm_elena_rossi',
          role: 'Principal Investigator'
        },
        {
          id: 'ptm_2',
          projectId: 'project_climate_gnn_multiscale',
          teamMemberId: 'tm_michael_chen',
          role: 'Co-Principal Investigator'
        },
        {
          id: 'ptm_3',
          projectId: 'project_climate_gnn_multiscale',
          teamMemberId: 'tm_lin_wang',
          role: 'Postdoctoral Researcher'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:12:29.877270'
      }
    };

    // Populate localStorage using the correct storage keys
    localStorage.setItem('availability_slots', JSON.stringify(generatedData.availability_slots));
    localStorage.setItem('courses', JSON.stringify(generatedData.courses));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('publications', JSON.stringify(generatedData.publications));
    localStorage.setItem('team_members', JSON.stringify(generatedData.team_members));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects));
    localStorage.setItem('project_team_members', JSON.stringify(generatedData.project_team_members));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CreateThesisSourcesReadingList();
    this.testTask2_SaveApaCitationOfLatestRLPaper();
    this.testTask3_BookmarkHigherFundedClimateProject();
    this.testTask4_CreateCoursesToTake2025List();
    this.testTask5_AddEarliestUpcomingTalkToAttendList();
    this.testTask6_SubmitSupervisionRequestWithEarliestWednesdaySlot();
    this.testTask7_UpdateProfileTaglineAndKeywords();
    this.testTask8_LimitPublicationsAndFeatureOnePaper();

    return this.results;
  }

  // Task 1: Create a reading list with 3 RL journal articles (2019–2023, >=50 citations)
  testTask1_CreateThesisSourcesReadingList() {
    const testName = 'Task 1: Create Thesis Sources reading list';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getPublicationFilterOptions();
      this.assert(
        filterOptions && Array.isArray(filterOptions.publicationTypes),
        'Publication filter options should be available'
      );

      const searchResult = this.logic.searchPublications(
        'reinforcement learning',
        {
          publicationTypes: ['journal_article'],
          minYear: 2019,
          maxYear: 2023,
          minCitationCount: 50
        },
        'citations_high_to_low',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPublications should return results');
      this.assert(
        searchResult.results.length >= 3,
        'Should have at least 3 reinforcement learning journal articles with >= 50 citations in 2019–2023'
      );

      const selected = searchResult.results.slice(0, 3);
      const publicationIds = selected.map(function (p) {
        return p.id;
      });

      const saveResult = this.logic.savePublicationsToReadingList(
        null,
        'Thesis Sources',
        'Reading list for thesis sources',
        publicationIds
      );

      this.assert(saveResult && saveResult.success === true, 'savePublicationsToReadingList should succeed');
      this.assert(saveResult.list && saveResult.list.id, 'Result should include the created reading list with id');
      this.assert(saveResult.addedItemCount === 3, 'Should add exactly 3 publications to the new list');
      this.assert(saveResult.totalItemsInList === 3, 'New list should contain exactly 3 items');

      const listId = saveResult.list.id;
      const listDetails = this.logic.getSavedListDetails(listId);
      this.assert(listDetails && listDetails.list, 'getSavedListDetails should return list metadata');
      this.assert(Array.isArray(listDetails.items), 'getSavedListDetails.items should be an array');
      this.assert(listDetails.items.length === 3, 'Saved list should contain 3 items');

      // Cross-validate each SavedListItem against Publication records in storage
      const allPublications = JSON.parse(localStorage.getItem('publications') || '[]');

      for (let i = 0; i < listDetails.items.length; i++) {
        const wrapper = listDetails.items[i];
        const savedItem = wrapper.savedListItem;
        this.assert(savedItem, 'Each list entry should contain a SavedListItem');
        this.assert(savedItem.itemType === 'publication', 'SavedListItem.itemType should be "publication"');

        const pub = allPublications.find(function (p) {
          return p.id === savedItem.itemId;
        });
        this.assert(!!pub, 'Publication should exist in storage for each saved item');
        this.assert(pub.year >= 2019 && pub.year <= 2023, 'Publication year should be between 2019 and 2023');
        this.assert(pub.publicationType === 'journal_article', 'Publication type should be journal_article');
        this.assert(pub.citationCount >= 50, 'Publication should have at least 50 citations');

        const hasRLKeyword = (pub.keywords || []).some(function (k) {
          return String(k).toLowerCase().indexOf('reinforcement learning') !== -1;
        }) || (pub.topics || []).some(function (t) {
          return String(t).toLowerCase().indexOf('reinforcement learning') !== -1;
        });
        this.assert(hasRLKeyword, 'Publication should be related to reinforcement learning');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Save APA citation of the most recent RL journal article into a note
  testTask2_SaveApaCitationOfLatestRLPaper() {
    const testName = 'Task 2: Save APA citation of latest RL journal article as note';
    console.log('Testing:', testName);

    try {
      // Search for reinforcement learning journal articles, newest first
      const searchResult = this.logic.searchPublications(
        'reinforcement learning',
        {
          publicationTypes: ['journal_article']
        },
        'year_newest_first',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPublications should return results');
      this.assert(searchResult.results.length > 0, 'There should be at least one RL journal article');

      const latestPubSummary = searchResult.results[0];
      const publicationId = latestPubSummary.id;

      const detailResult = this.logic.getPublicationDetail(publicationId);
      this.assert(detailResult && detailResult.publication, 'getPublicationDetail should return a publication');

      const citationResult = this.logic.getPublicationCitation(publicationId, 'apa');
      this.assert(citationResult && citationResult.style === 'apa', 'Citation style should be APA');
      this.assert(citationResult.citationText, 'APA citation text should be non-empty');

      // Save citation text into a note (clipboard-like)
      const noteTitle = 'Latest RL journal article (APA citation)';
      const noteContent = citationResult.citationText;

      const createdNote = this.logic.createNote(noteTitle, noteContent, publicationId);
      this.assert(createdNote && createdNote.id, 'createNote should return created note with id');
      this.assert(createdNote.title === noteTitle, 'Note title should match the provided title');
      this.assert(createdNote.content === noteContent, 'Note content should equal the APA citation text');
      this.assert(
        createdNote.relatedPublicationId === publicationId,
        'Note.relatedPublicationId should reference the chosen publication'
      );

      // Verify via getNotesList that the note is persisted
      const notes = this.logic.getNotesList();
      this.assert(Array.isArray(notes), 'getNotesList should return an array');
      const found = notes.find(function (n) {
        return n.id === createdNote.id;
      });
      this.assert(!!found, 'Created note should be present in notes list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Bookmark the higher-funded climate modeling project with at least 4 team members
  testTask3_BookmarkHigherFundedClimateProject() {
    const testName = 'Task 3: Bookmark higher-funded climate modeling project with >=4 team members';
    console.log('Testing:', testName);

    try {
      const searchResult = this.logic.searchProjects(
        'climate modeling',
        {
          climateRelated: true
        },
        null,
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchProjects should return results');
      this.assert(searchResult.results.length >= 2, 'Should have at least two climate-related projects');

      const firstTwo = searchResult.results.slice(0, 2);
      const p1 = firstTwo[0];
      const p2 = firstTwo[1];

      // Select the project with higher funding among the first two, with teamMemberCount >= 4
      let candidate = null;
      const projectsToConsider = [p1, p2];

      for (let i = 0; i < projectsToConsider.length; i++) {
        const proj = projectsToConsider[i];
        if (typeof proj.teamMemberCount === 'number' && proj.teamMemberCount >= 4) {
          if (!candidate || proj.fundingAmount > candidate.fundingAmount) {
            candidate = proj;
          }
        }
      }

      this.assert(
        !!candidate,
        'At least one of the first two climate modeling projects should have teamMemberCount >= 4'
      );

      const chosenProjectId = candidate.id;
      const chosenFunding = candidate.fundingAmount;
      const chosenTeamSize = candidate.teamMemberCount;

      this.assert(chosenTeamSize >= 4, 'Chosen project should have team size >= 4');

      // Bookmark the chosen project into a Potential collaborations folder
      const existingFolders = this.logic.getBookmarkFolders();
      this.assert(Array.isArray(existingFolders), 'getBookmarkFolders should return an array');

      let collabFolder = existingFolders.find(function (f) {
        return f.name === 'Potential collaborations';
      });

      let bookmarkResult;
      if (collabFolder) {
        bookmarkResult = this.logic.saveProjectBookmark(chosenProjectId, collabFolder.id, null);
      } else {
        bookmarkResult = this.logic.saveProjectBookmark(chosenProjectId, null, 'Potential collaborations');
      }

      this.assert(bookmarkResult && bookmarkResult.success === true, 'saveProjectBookmark should succeed');
      this.assert(bookmarkResult.bookmark && bookmarkResult.bookmark.id, 'Bookmark should be returned with id');

      collabFolder = bookmarkResult.folder || collabFolder;
      this.assert(collabFolder && collabFolder.id, 'Folder should be available after bookmarking');
      this.assert(
        collabFolder.name === 'Potential collaborations',
        'Bookmark folder name should be "Potential collaborations"'
      );

      // Verify via overview
      const overview = this.logic.getBookmarkOverview();
      this.assert(Array.isArray(overview), 'getBookmarkOverview should return an array');

      const folderEntry = overview.find(function (entry) {
        return entry.folder && entry.folder.id === collabFolder.id;
      });
      this.assert(folderEntry && Array.isArray(folderEntry.bookmarks), 'Folder entry with bookmarks should exist');

      const projectBookmarks = folderEntry.bookmarks.filter(function (b) {
        return b.bookmark && b.bookmark.itemType === 'project';
      });

      this.assert(projectBookmarks.length === 1, 'Folder should contain exactly one project bookmark in this test run');
      this.assert(
        projectBookmarks[0].bookmark.itemId === chosenProjectId,
        'Bookmarked project id should match the chosen project'
      );

      // Sanity-check chosen project still has higher funding among the two considered
      const maxFunding = Math.max(p1.fundingAmount, p2.fundingAmount);
      this.assert(
        chosenFunding === maxFunding,
        'Chosen project should have the highest funding among the first two climate modeling projects'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Create a "Courses to Take 2025" list with 2 graduate Spring 2025 courses (>=3 credits)
  testTask4_CreateCoursesToTake2025List() {
    const testName = 'Task 4: Create Courses to Take 2025 list';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getCourseFilterOptions();
      this.assert(filterOptions !== undefined && filterOptions !== null, 'Course filter options should be available');

      const searchResult = this.logic.searchCourses(
        {
          termLabel: 'Spring 2025',
          level: 'graduate',
          minCredits: 3
        },
        'course_number_low_to_high',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchCourses should return results');
      this.assert(searchResult.results.length >= 2, 'There should be at least two matching courses');

      const selectedCourses = searchResult.results.slice(0, 2);
      const courseIds = selectedCourses.map(function (c) {
        return c.id;
      });

      const saveResult = this.logic.saveCoursesToCourseList(
        null,
        'Courses to Take 2025',
        courseIds
      );

      this.assert(saveResult && saveResult.success === true, 'saveCoursesToCourseList should succeed');
      this.assert(saveResult.list && saveResult.list.id, 'Result should include course list with id');
      this.assert(saveResult.addedItemCount === 2, 'Should add exactly 2 courses to the list');
      this.assert(saveResult.totalItemsInList === 2, 'List should contain exactly 2 items');

      const listId = saveResult.list.id;
      const listDetails = this.logic.getSavedListDetails(listId);
      this.assert(listDetails && listDetails.list, 'getSavedListDetails should return list');
      this.assert(Array.isArray(listDetails.items), 'List items should be an array');
      this.assert(listDetails.items.length === 2, 'Saved course list should have 2 items');

      const allCourses = JSON.parse(localStorage.getItem('courses') || '[]');

      for (let i = 0; i < listDetails.items.length; i++) {
        const wrapper = listDetails.items[i];
        const savedItem = wrapper.savedListItem;
        this.assert(savedItem, 'SavedListItem should exist');
        this.assert(savedItem.itemType === 'course', 'SavedListItem.itemType should be "course"');

        const course = allCourses.find(function (c) {
          return c.id === savedItem.itemId;
        });
        this.assert(!!course, 'Course should exist in storage for each list item');
        this.assert(course.termLabel === 'Spring 2025', 'Course term should be Spring 2025');
        this.assert(course.level === 'graduate', 'Course level should be graduate');
        this.assert(course.credits >= 3, 'Course should be worth at least 3 credits');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Add earliest upcoming public talk (NY or Online, next 6 months) to Attend list with 3-day reminder
  testTask5_AddEarliestUpcomingTalkToAttendList() {
    const testName = 'Task 5: Add earliest upcoming eligible event to Attend list with 3-day reminder';
    console.log('Testing:', testName);

    try {
      // Use baseline date from metadata to define the 6-month window
      const metadata = JSON.parse(localStorage.getItem('_metadata') || '{}');
      const baselineDateStr = metadata.baselineDate || '2026-03-03';
      const baselineDate = new Date(baselineDateStr + 'T00:00:00Z');

      const startDateTime = baselineDate.toISOString();
      const endDate = new Date(baselineDate.getTime() + 180 * 24 * 60 * 60 * 1000);
      const endDateTime = endDate.toISOString();

      const searchResult = this.logic.searchEvents(
        {
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          locationCities: ['New York'],
          includeOnline: true,
          accessTypes: ['public'],
          hideCanceled: true
        },
        'date_soonest_first',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchEvents should return results');
      this.assert(searchResult.results.length > 0, 'There should be at least one matching upcoming public event');

      const earliestEvent = searchResult.results[0];
      const eventId = earliestEvent.id;

      // Save to an Attend list (create if needed)
      const attendSaveResult = this.logic.saveEventToAttendList(eventId, null, 'Attend');
      this.assert(attendSaveResult && attendSaveResult.success === true, 'saveEventToAttendList should succeed');
      this.assert(attendSaveResult.list && attendSaveResult.list.id, 'Attend list should be returned');

      const attendListId = attendSaveResult.list.id;

      // Set a 3-day-before reminder
      const reminder = this.logic.setEventReminder(eventId, attendListId, 3);
      this.assert(reminder && reminder.id, 'setEventReminder should return a reminder with id');
      this.assert(reminder.eventId === eventId, 'Reminder.eventId should match the event id');
      this.assert(reminder.reminderOffsetDays === 3, 'Reminder offset should be 3 days');

      // Verify via event detail
      const detail = this.logic.getEventDetail(eventId);
      this.assert(detail && detail.event, 'getEventDetail should return event');
      this.assert(detail.isInAttendList === true, 'Event should be marked as in an Attend list');
      this.assert(Array.isArray(detail.reminders), 'Event detail reminders should be an array');

      const matchingReminder = detail.reminders.find(function (r) {
        return r.id === reminder.id;
      });
      this.assert(!!matchingReminder, 'Reminder set should appear in event detail');
      this.assert(
        matchingReminder.reminderOffsetDays === 3,
        'Reminder in event detail should have offset of 3 days'
      );

      // Verify Attend list contents
      const listDetails = this.logic.getSavedListDetails(attendListId);
      this.assert(listDetails && listDetails.list, 'Attend list details should be returned');
      this.assert(Array.isArray(listDetails.items), 'Attend list items should be an array');
      this.assert(listDetails.items.length === 1, 'Attend list should contain exactly one event in this flow');

      const savedItem = listDetails.items[0].savedListItem;
      this.assert(savedItem.itemType === 'event', 'SavedListItem.itemType should be "event"');
      this.assert(savedItem.itemId === eventId, 'Saved event id should match earliest event id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Submit a supervision request with earliest available Wednesday 10:00–12:00 slot
  testTask6_SubmitSupervisionRequestWithEarliestWednesdaySlot() {
    const testName = 'Task 6: Submit supervision request with earliest Wednesday 10:00–12:00 slot';
    console.log('Testing:', testName);

    try {
      const config = this.logic.getContactFormConfig();
      this.assert(config && Array.isArray(config.reasonOptions), 'Contact form config and reasons should be available');

      // Choose Prospective PhD student reason if available
      let reasonValue = null;
      const reasonOption = config.reasonOptions.find(function (r) {
        return r.value === 'prospective_phd_student';
      });
      if (reasonOption) {
        reasonValue = reasonOption.value;
      } else {
        reasonValue = config.defaultReason || 'prospective_phd_student';
      }

      const schedulerConfig = config.schedulerConfig || {};
      const startDate = schedulerConfig.minDate || '2026-03-01';
      const endDate = schedulerConfig.maxDate || '2026-03-31';

      const slots = this.logic.getAvailabilitySlots(startDate, endDate);
      this.assert(Array.isArray(slots), 'getAvailabilitySlots should return an array');

      // Filter for available Wednesday slots fully between 10:00 and 12:00
      const candidateSlots = slots.filter(function (slot) {
        if (!slot.isAvailable || slot.dayOfWeek !== 'wednesday') {
          return false;
        }
        const start = new Date(slot.startDateTime);
        const end = new Date(slot.endDateTime);
        const startHour = start.getUTCHours() + start.getUTCMinutes() / 60;
        const endHour = end.getUTCHours() + end.getUTCMinutes() / 60;
        return startHour >= 10 && endHour <= 12;
      });

      this.assert(candidateSlots.length > 0, 'There should be at least one available Wednesday slot between 10:00 and 12:00');

      candidateSlots.sort(function (a, b) {
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      });

      const earliestSlot = candidateSlots[0];
      this.assert(earliestSlot && earliestSlot.id, 'Earliest slot should have an id');

      const name = 'Alex Rivera';
      const email = 'alex.rivera@example.edu';
      const subject = 'PhD Supervision Inquiry for Fall 2026';
      const message =
        'I am interested in machine learning and would like to discuss potential PhD supervision opportunities for Fall 2026.';

      const contactRequest = this.logic.submitContactRequest(
        name,
        email,
        subject,
        reasonValue,
        message,
        earliestSlot.id
      );

      this.assert(contactRequest && contactRequest.id, 'submitContactRequest should return a ContactRequest with id');
      this.assert(contactRequest.name === name, 'ContactRequest.name should match submitted name');
      this.assert(contactRequest.email === email, 'ContactRequest.email should match submitted email');
      this.assert(contactRequest.subject === subject, 'ContactRequest.subject should match submitted subject');
      this.assert(contactRequest.reason === reasonValue, 'ContactRequest.reason should match selected reason');
      this.assert(
        contactRequest.preferredSlotId === earliestSlot.id,
        'ContactRequest.preferredSlotId should match chosen slot id'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Update profile tagline and set exactly three primary research keywords
  testTask7_UpdateProfileTaglineAndKeywords() {
    const testName = 'Task 7: Update profile tagline and primary research keywords';
    console.log('Testing:', testName);

    try {
      const initial = this.logic.getProfileSettings();
      this.assert(initial && initial.settings !== undefined, 'Initial profile settings should be retrievable');

      const newTagline =
        'I study how machine learning can make scientific discovery faster and more reliable.';
      const keywords = ['reinforcement learning', 'causal inference', 'scientific discovery'];

      const updateResult = this.logic.updateProfileTaglineAndKeywords(newTagline, keywords);
      this.assert(updateResult && updateResult.success === true, 'updateProfileTaglineAndKeywords should succeed');
      this.assert(updateResult.settings, 'Updated settings should be returned');

      const updatedSettings = updateResult.settings;
      this.assert(updatedSettings.tagline === newTagline, 'Tagline should match the new tagline');
      this.assert(
        Array.isArray(updatedSettings.primaryResearchKeywords),
        'primaryResearchKeywords should be an array'
      );
      this.assert(
        updatedSettings.primaryResearchKeywords.length === 3,
        'There should be exactly three primaryResearchKeywords'
      );

      // Verify persistence through a fresh getProfileSettings call
      const after = this.logic.getProfileSettings();
      this.assert(after && after.settings, 'Profile settings should still be retrievable');
      this.assert(after.settings.tagline === newTagline, 'Tagline should persist in settings');
      this.assert(
        Array.isArray(after.settings.primaryResearchKeywords) &&
          after.settings.primaryResearchKeywords.length === 3,
        'Exactly three primaryResearchKeywords should persist'
      );

      // Verify that homepage overview reflects the new tagline and keywords
      const overview = this.logic.getHomePageOverview();
      this.assert(overview && typeof overview.tagline === 'string', 'Home page overview should return a tagline');
      this.assert(overview.tagline === newTagline, 'Home page tagline should match updated tagline');
      this.assert(
        Array.isArray(overview.primaryResearchKeywords) && overview.primaryResearchKeywords.length === 3,
        'Home page should show three primary research keywords'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Limit public publications to top 5 by citations and feature one recent paper
  testTask8_LimitPublicationsAndFeatureOnePaper() {
    const testName = 'Task 8: Limit public publications to 5 most-cited and feature one paper';
    console.log('Testing:', testName);

    try {
      // Update display preferences to show 5 publications sorted by citations high to low
      const updateDisplayResult = this.logic.updatePublicationsDisplayPreferences(5, 'citations_high_to_low');
      this.assert(
        updateDisplayResult && updateDisplayResult.success === true,
        'updatePublicationsDisplayPreferences should succeed'
      );
      this.assert(updateDisplayResult.settings, 'Updated profile settings should be returned');

      const settingsAfterDisplay = updateDisplayResult.settings;
      this.assert(
        settingsAfterDisplay.publicationsDisplayCount === 5,
        'publicationsDisplayCount should be set to 5'
      );
      this.assert(
        settingsAfterDisplay.publicationsSortOrder === 'citations_high_to_low',
        'publicationsSortOrder should be citations_high_to_low'
      );

      // Select the most recent publication (since generated data contains up to 2021)
      const searchResult = this.logic.searchPublications(
        null,
        null,
        'year_newest_first',
        1,
        10
      );
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPublications should return results');
      this.assert(searchResult.results.length > 0, 'There should be at least one publication to feature');

      const candidate = searchResult.results[0];
      const candidateId = candidate.id;

      const featureResult = this.logic.setFeaturedPublication(candidateId);
      this.assert(featureResult && featureResult.success === true, 'setFeaturedPublication should succeed');
      this.assert(featureResult.settings, 'Updated settings should be returned from setFeaturedPublication');
      this.assert(
        featureResult.settings.featuredPublicationId === candidateId,
        'featuredPublicationId in settings should match the chosen publication id'
      );
      this.assert(
        featureResult.featuredPublication && featureResult.featuredPublication.id === candidateId,
        'featuredPublication object should correspond to the chosen publication'
      );

      // Ensure exactly one publication is featured in search results
      const postFeatureSearch = this.logic.searchPublications(
        null,
        null,
        'year_newest_first',
        1,
        50
      );
      this.assert(
        postFeatureSearch && Array.isArray(postFeatureSearch.results),
        'Post-feature searchPublications should return results'
      );

      let featuredCount = 0;
      for (let i = 0; i < postFeatureSearch.results.length; i++) {
        const pub = postFeatureSearch.results[i];
        if (pub.isFeatured) {
          featuredCount += 1;
          this.assert(pub.id === candidateId, 'Only the chosen publication should be marked as featured');
        }
      }
      this.assert(featuredCount <= 1, 'At most one publication should be marked as featured');

      // Verify via profile settings and homepage overview
      const finalSettingsWrapper = this.logic.getProfileSettings();
      this.assert(finalSettingsWrapper && finalSettingsWrapper.settings, 'Profile settings should be retrievable');
      this.assert(
        finalSettingsWrapper.settings.publicationsDisplayCount === 5,
        'Final settings should keep publicationsDisplayCount at 5'
      );
      this.assert(
        finalSettingsWrapper.settings.publicationsSortOrder === 'citations_high_to_low',
        'Final settings should keep publicationsSortOrder as citations_high_to_low'
      );
      this.assert(
        finalSettingsWrapper.settings.featuredPublicationId === candidateId,
        'Final settings featuredPublicationId should match the chosen publication'
      );

      const overview = this.logic.getHomePageOverview();
      this.assert(overview && overview.featuredPublication, 'Home page overview should have featuredPublication');
      this.assert(
        overview.featuredPublication.publication &&
          overview.featuredPublication.publication.id === candidateId,
        'Home page featured publication should match the chosen publication'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording methods
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
    const msg = error && error.message ? error.message : String(error);
    this.results.push({ test: testName, success: false, error: msg });
    console.log('✗ ' + testName + ': ' + msg);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
