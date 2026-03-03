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
    localStorage.clear();
    // Reinitialize storage structure
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "conferences": [
        {
          "id": "conf_ai_ds_europe_2025",
          "title": "AI & Data Science Summit Europe 2025",
          "subtitle": "Trustworthy Artificial Intelligence for Science and Society",
          "description": "The AI & Data Science Summit Europe 2025 brings together researchers, practitioners, and policymakers to discuss advances in artificial intelligence, machine learning, and data science with a focus on real-world impact in healthcare, climate, and public services.",
          "status": "upcoming",
          "startDate": "2025-10-14T08:00:00Z",
          "endDate": "2025-10-17T18:00:00Z",
          "region": "europe",
          "city": "Berlin",
          "country": "Germany",
          "venue": "Berlin Congress Center",
          "isOnline": false,
          "isHybrid": true,
          "topics": [
            "artificial intelligence",
            "machine learning",
            "data science",
            "ai ethics",
            "healthcare",
            "public policy"
          ],
          "websiteUrl": "https://example.org/conferences/ai-data-science-europe-2025",
          "isInternational": true,
          "defaultCurrency": "eur",
          "createdAt": "2024-11-15T10:00:00Z",
          "updatedAt": "2025-01-20T14:30:00Z"
        },
        {
          "id": "conf_climate_policy_2025",
          "title": "Global Climate Policy and Energy Transition Summit 2025",
          "subtitle": "From Ambition to Implementation",
          "description": "An interdisciplinary summit focusing on climate change mitigation, adaptation strategies, and renewable energy policy, emphasizing just and equitable transitions in both the Global North and South.",
          "status": "upcoming",
          "startDate": "2025-11-05T09:00:00Z",
          "endDate": "2025-11-08T17:30:00Z",
          "region": "europe",
          "city": "Brussels",
          "country": "Belgium",
          "venue": "European Policy Centre",
          "isOnline": false,
          "isHybrid": true,
          "topics": [
            "climate change",
            "climate policy",
            "renewable energy",
            "energy transition",
            "carbon pricing",
            "adaptation"
          ],
          "websiteUrl": "https://example.org/conferences/climate-policy-2025",
          "isInternational": true,
          "defaultCurrency": "eur",
          "createdAt": "2024-10-10T09:30:00Z",
          "updatedAt": "2025-01-05T16:45:00Z"
        },
        {
          "id": "conf_climate_adaptation_2026",
          "title": "International Conference on Climate Change Adaptation 2026",
          "subtitle": "Resilience, Risk, and Governance",
          "description": "A research-driven conference exploring climate risk assessment, adaptation planning, and the governance of climate resilience in cities, rural regions, and coastal zones.",
          "status": "upcoming",
          "startDate": "2026-04-20T08:30:00Z",
          "endDate": "2026-04-22T18:00:00Z",
          "region": "global",
          "city": "Copenhagen",
          "country": "Denmark",
          "venue": "Nordic Climate Centre",
          "isOnline": true,
          "isHybrid": true,
          "topics": [
            "climate change",
            "adaptation",
            "risk governance",
            "climate finance",
            "urban resilience"
          ],
          "websiteUrl": "https://example.org/conferences/climate-adaptation-2026",
          "isInternational": true,
          "defaultCurrency": "eur",
          "createdAt": "2025-06-01T11:00:00Z",
          "updatedAt": "2026-01-12T09:15:00Z"
        }
      ],
      "donation_programs": [
        {
          "id": "prog_early_career",
          "code": "early_career_research_grants",
          "name": "Early Career Research Grants",
          "description": "Supports early career researchers with seed funding for independent research projects, pilot studies, and data collection.",
          "isActive": true
        },
        {
          "id": "prog_general_research",
          "code": "general_research_fund",
          "name": "General Research Fund",
          "description": "Provides flexible support for high-priority research initiatives, infrastructure, and cross-cutting programs.",
          "isActive": true
        },
        {
          "id": "prog_travel_grants",
          "code": "travel_grants",
          "name": "Conference and Fieldwork Travel Grants",
          "description": "Helps researchers and students cover travel costs for conferences, workshops, and essential fieldwork.",
          "isActive": true
        }
      ],
      "events": [
        {
          "id": "event_dataviz_intro_2026",
          "title": "Hands-on Data Visualization with Open-Source Tools",
          "description": "A practical half-day workshop introducing core principles of data visualization using open-source tools such as Python, R, and web-based libraries.",
          "eventType": "workshop",
          "topics": [
            "data visualization",
            "python",
            "r",
            "open source",
            "science communication"
          ],
          "startDate": "2026-04-15T09:00:00Z",
          "endDate": "2026-04-15T12:30:00Z",
          "durationType": "half_day",
          "baseFeeAmount": 95,
          "baseFeeCurrency": "usd",
          "locationType": "online",
          "city": "",
          "country": "",
          "organizer": "Global Research Methods Lab"
        },
        {
          "id": "event_dataviz_climate_dashboards_2026",
          "title": "Designing Interactive Dashboards for Climate Data",
          "description": "Learn to build intuitive and effective dashboards for communicating climate and energy data to policymakers and the public.",
          "eventType": "workshop",
          "topics": [
            "data visualization",
            "climate change",
            "dashboards",
            "energy data"
          ],
          "startDate": "2026-05-10T08:30:00Z",
          "endDate": "2026-05-10T12:30:00Z",
          "durationType": "half_day",
          "baseFeeAmount": 120,
          "baseFeeCurrency": "usd",
          "locationType": "in_person",
          "city": "Boston",
          "country": "United States",
          "organizer": "Center for Climate Analytics"
        },
        {
          "id": "event_dataviz_advanced_2026",
          "title": "Advanced Data Visualization for Multidimensional Data",
          "description": "An advanced full-day workshop on visualizing high-dimensional and longitudinal datasets using interactive techniques.",
          "eventType": "workshop",
          "topics": [
            "data visualization",
            "high-dimensional data",
            "interactive graphics"
          ],
          "startDate": "2026-06-20T09:00:00Z",
          "endDate": "2026-06-20T17:30:00Z",
          "durationType": "full_day",
          "baseFeeAmount": 260,
          "baseFeeCurrency": "usd",
          "locationType": "hybrid",
          "city": "London",
          "country": "United Kingdom",
          "organizer": "European Data Science Network"
        }
      ],
      "journals": [
        {
          "id": "journal_energy_policy",
          "name": "Energy Policy",
          "issn": "0301-4215",
          "publisher": "Elsevier",
          "impactFactor": 8.5,
          "disciplines": [
            "energy policy",
            "renewable energy",
            "environmental economics"
          ]
        },
        {
          "id": "journal_climate_policy",
          "name": "Climate Policy",
          "issn": "1469-3062",
          "publisher": "Taylor & Francis",
          "impactFactor": 6.1,
          "disciplines": [
            "climate policy",
            "environmental policy",
            "international relations"
          ]
        },
        {
          "id": "journal_global_environmental_change",
          "name": "Global Environmental Change",
          "issn": "0959-3780",
          "publisher": "Elsevier",
          "impactFactor": 10.2,
          "disciplines": [
            "climate change",
            "environmental science",
            "sustainability"
          ]
        }
      ],
      "membership_plans": [
        {
          "id": "plan_student",
          "name": "Student Membership",
          "planType": "student",
          "description": "Discounted membership for full-time students, providing access to core member benefits and opportunities tailored to early career researchers.",
          "annualPriceAmount": 60,
          "annualPriceCurrency": "usd",
          "benefits": [
            "access to member-only webinars",
            "discounted conference fees",
            "access to online resource library",
            "eligibility for student travel grants",
            "newsletter with curated opportunities"
          ],
          "includesMemberWebinars": true,
          "includesDiscountedConferenceFees": true,
          "isActive": true
        },
        {
          "id": "plan_professional",
          "name": "Professional Membership",
          "planType": "professional",
          "description": "Full membership for academics and practitioners, offering comprehensive benefits including leadership opportunities and priority access to programs.",
          "annualPriceAmount": 140,
          "annualPriceCurrency": "usd",
          "benefits": [
            "access to member-only webinars",
            "discounted conference fees",
            "priority access to workshops and training",
            "eligibility for research grants",
            "voting rights in governance elections"
          ],
          "includesMemberWebinars": true,
          "includesDiscountedConferenceFees": true,
          "isActive": true
        },
        {
          "id": "plan_institutional",
          "name": "Institutional Partner Membership",
          "planType": "other",
          "description": "Membership for universities, research institutes, and organizations seeking organization-wide benefits and visibility.",
          "annualPriceAmount": 500,
          "annualPriceCurrency": "usd",
          "benefits": [
            "institution-wide access to member-only webinars",
            "bulk discounted conference fees",
            "co-branding opportunities on selected events",
            "eligibility to host co-sponsored conferences",
            "early access to policy briefs and reports"
          ],
          "includesMemberWebinars": true,
          "includesDiscountedConferenceFees": true,
          "isActive": true
        }
      ],
      "newsletter_topics": [
        {
          "id": "nl_ai_ethics",
          "code": "ai_ethics",
          "name": "AI Ethics",
          "description": "News, events, and new research on the ethics and governance of artificial intelligence.",
          "defaultFrequency": "monthly",
          "isActive": true
        },
        {
          "id": "nl_climate_policy",
          "code": "climate_policy",
          "name": "Climate Policy",
          "description": "Updates on climate policy research, renewable energy governance, and related events.",
          "defaultFrequency": "monthly",
          "isActive": true
        }
      ],
      "researchers": [
        {
          "id": "researcher_amelia_khan",
          "fullName": "Amelia Khan",
          "givenName": "Amelia",
          "familyName": "Khan",
          "affiliation": "Department of Computer Science, University of Toronto",
          "affiliationDepartment": "Department of Computer Science",
          "affiliationInstitution": "University of Toronto",
          "affiliationCountry": "Canada",
          "country": "Canada",
          "biography": "Amelia Khan is an associate professor of computer science at the University of Toronto. Her work focuses on machine learning for healthcare, with an emphasis on clinical risk prediction, algorithmic fairness, and deployment of decision support systems in hospitals.",
          "expertiseKeywords": [
            "machine learning",
            "healthcare",
            "machine learning for healthcare",
            "clinical prediction",
            "electronic health records",
            "algorithmic fairness"
          ],
          "primaryResearchAreas": [
            "artificial intelligence",
            "health informatics"
          ],
          "websiteUrl": "https://cs.toronto.edu/~akhan",
          "email": "amelia.khan@example.edu",
          "hIndex": 42,
          "citationCount": 7800,
          "profileImage": "https://static.manitobacooperator.ca/wp-content/uploads/2019/08/uw_research_plants_cmyk-660x420.jpg"
        },
        {
          "id": "researcher_lucas_martinez",
          "fullName": "Lucas Martínez",
          "givenName": "Lucas",
          "familyName": "Martínez",
          "affiliation": "Institute for Environmental Studies, Vrije Universiteit Amsterdam",
          "affiliationDepartment": "Institute for Environmental Studies",
          "affiliationInstitution": "Vrije Universiteit Amsterdam",
          "affiliationCountry": "Netherlands",
          "country": "Netherlands",
          "biography": "Lucas Martínez is a climate policy researcher working on the political economy of energy transitions and the design of carbon pricing instruments in Europe and Latin America.",
          "expertiseKeywords": [
            "climate policy",
            "carbon pricing",
            "renewable energy",
            "energy transition",
            "environmental economics"
          ],
          "primaryResearchAreas": [
            "environmental policy",
            "political economy"
          ],
          "websiteUrl": "https://example.org/researchers/lucas-martinez",
          "email": "lucas.martinez@example.org",
          "hIndex": 29,
          "citationCount": 4100,
          "profileImage": "https://cnnespanol.cnn.com/wp-content/uploads/2021/02/210226154030-cnne-dinero-renewable-energy-latam-02262021-full-169.jpg?quality=100&strip=info&w=1024"
        },
        {
          "id": "researcher_priya_narayanan",
          "fullName": "Priya Narayanan",
          "givenName": "Priya",
          "familyName": "Narayanan",
          "affiliation": "Department of Information Systems, National University of Singapore",
          "affiliationDepartment": "Department of Information Systems",
          "affiliationInstitution": "National University of Singapore",
          "affiliationCountry": "Singapore",
          "country": "Singapore",
          "biography": "Priya Narayanan studies the ethics and governance of AI systems, with a focus on transparency, accountability, and impacts on social welfare systems in Asia.",
          "expertiseKeywords": [
            "ai ethics",
            "artificial intelligence",
            "algorithmic accountability",
            "technology policy"
          ],
          "primaryResearchAreas": [
            "technology policy",
            "information systems"
          ],
          "websiteUrl": "https://example.org/researchers/priya-narayanan",
          "email": "priya.narayanan@example.org",
          "hIndex": 35,
          "citationCount": 5200,
          "profileImage": "https://www.actuaries.digital/wp-content/uploads/2014/07/iStock-531173386-1600x750.jpg"
        }
      ],
      "conference_fees": [
        {
          "id": "fee_ai2025_student_early",
          "conferenceId": "conf_ai_ds_europe_2025",
          "attendeeType": "student",
          "currency": "eur",
          "amount": 150,
          "description": "Student early-bird (onsite or virtual access)",
          "isEarlyBird": true,
          "validFrom": "2025-01-01T00:00:00Z",
          "validTo": "2025-06-30T23:59:59Z"
        },
        {
          "id": "fee_ai2025_student_regular",
          "conferenceId": "conf_ai_ds_europe_2025",
          "attendeeType": "student",
          "currency": "eur",
          "amount": 190,
          "description": "Regular student registration",
          "isEarlyBird": false,
          "validFrom": "2025-07-01T00:00:00Z",
          "validTo": "2025-10-13T23:59:59Z"
        },
        {
          "id": "fee_ai2025_member_early",
          "conferenceId": "conf_ai_ds_europe_2025",
          "attendeeType": "member",
          "currency": "eur",
          "amount": 340,
          "description": "Early-bird member registration",
          "isEarlyBird": true,
          "validFrom": "2025-01-01T00:00:00Z",
          "validTo": "2025-06-30T23:59:59Z"
        }
      ],
      "conference_tracks": [
        {
          "id": "track_climate2025_mitigation",
          "conferenceId": "conf_climate_policy_2025",
          "name": "Mitigation & Carbon Pricing",
          "code": "MITIGATION",
          "description": "Design and evaluation of climate mitigation policies, including carbon taxes, emissions trading, and sectoral targets.",
          "keywords": [
            "climate",
            "mitigation",
            "carbon pricing",
            "emissions trading",
            "policy instruments"
          ],
          "colorHex": "#0EA5E9"
        },
        {
          "id": "track_climate2025_renewables",
          "conferenceId": "conf_climate_policy_2025",
          "name": "Renewable Energy Policy & Markets",
          "code": "RENEWABLES",
          "description": "Policies, regulations, and market designs that accelerate renewable energy deployment.",
          "keywords": [
            "climate",
            "renewable energy",
            "renewable energy policy",
            "energy markets"
          ],
          "colorHex": "#22C55E"
        },
        {
          "id": "track_climate2025_adaptation",
          "conferenceId": "conf_climate_policy_2025",
          "name": "Adaptation & Resilience",
          "code": "ADAPTATION",
          "description": "Climate adaptation strategies, resilience planning, and risk governance in diverse regions.",
          "keywords": [
            "climate change",
            "adaptation",
            "resilience",
            "risk governance"
          ],
          "colorHex": "#A855F7"
        }
      ],
      "event_time_slots": [
        {
          "id": "slot_dataviz_intro_morning",
          "eventId": "event_dataviz_intro_2026",
          "label": "Morning session (online)",
          "startDateTime": "2026-04-15T09:00:00Z",
          "endDateTime": "2026-04-15T12:30:00Z",
          "capacity": 80
        },
        {
          "id": "slot_dataviz_intro_afternoon",
          "eventId": "event_dataviz_intro_2026",
          "label": "Afternoon session (online)",
          "startDateTime": "2026-04-15T13:30:00Z",
          "endDateTime": "2026-04-15T17:00:00Z",
          "capacity": 80
        },
        {
          "id": "slot_dataviz_climate_morning",
          "eventId": "event_dataviz_climate_dashboards_2026",
          "label": "Morning session",
          "startDateTime": "2026-05-10T08:30:00Z",
          "endDateTime": "2026-05-10T12:30:00Z",
          "capacity": 50
        }
      ],
      "publications": [
        {
          "id": "pub_re_subsidies_eu_2024",
          "title": "Designing Just Renewable Energy Subsidies: Evidence from the European Union",
          "abstract": "This article evaluates the distributional impacts of renewable energy subsidy schemes in the European Union and proposes design principles for more equitable policy instruments.",
          "year": 2024,
          "keywords": [
            "renewable energy policy",
            "subsidies",
            "energy justice",
            "european union"
          ],
          "journalId": "journal_energy_policy",
          "accessType": "open_access",
          "isOpenAccess": true,
          "doi": "10.1016/j.enpol.2024.112345",
          "authors": [
            "Lucas Martínez",
            "Daniel Schmidt",
            "Anna Rossi"
          ],
          "url": "https://doi.org/10.1016/j.enpol.2024.112345",
          "createdAt": "2024-02-10T10:15:00Z",
          "journalName": "Energy Policy",
          "journalImpactFactor": 8.5
        },
        {
          "id": "pub_re_policy_emerging_2023",
          "title": "Renewable Energy Policy Mixes in Emerging Economies: Comparative Lessons from Brazil, India, and South Africa",
          "abstract": "The paper compares combinations of feed-in tariffs, auctions, and net metering in three emerging economies and assesses their effectiveness in driving renewable capacity additions.",
          "year": 2023,
          "keywords": [
            "renewable energy policy",
            "emerging economies",
            "auctions",
            "feed-in tariffs"
          ],
          "journalId": "journal_climate_policy",
          "accessType": "open_access",
          "isOpenAccess": true,
          "doi": "10.1080/14693062.2023.2234567",
          "authors": [
            "Carla Pereira",
            "Vikram Desai",
            "Nomsa Dlamini"
          ],
          "url": "https://doi.org/10.1080/14693062.2023.2234567",
          "createdAt": "2023-07-05T09:30:00Z",
          "journalName": "Climate Policy",
          "journalImpactFactor": 6.1
        },
        {
          "id": "pub_net_zero_policy_interactions_2022",
          "title": "Net-zero Pathways and Renewable Energy Policy Interactions",
          "abstract": "Using integrated assessment modeling, this study explores how different renewable energy policy packages interact with economy-wide net-zero targets.",
          "year": 2022,
          "keywords": [
            "renewable energy policy",
            "net-zero",
            "integrated assessment models",
            "climate mitigation"
          ],
          "journalId": "journal_global_environmental_change",
          "accessType": "open_access",
          "isOpenAccess": true,
          "doi": "10.1016/j.gloenvcha.2022.102567",
          "authors": [
            "Maria López",
            "Thomas Berger"
          ],
          "url": "https://doi.org/10.1016/j.gloenvcha.2022.102567",
          "createdAt": "2022-03-18T11:45:00Z",
          "journalName": "Global Environmental Change",
          "journalImpactFactor": 10.2
        }
      ],
      "conference_sessions": [
        {
          "id": "sess_climate2025_keynote_opening",
          "conferenceId": "conf_climate_policy_2025",
          "trackId": "track_climate2025_mitigation",
          "title": "Opening Keynote: Global Stocktake and Climate Policy",
          "abstract": "A high-level keynote reviewing progress under the Paris Agreement, recent IPCC findings, and implications for national climate policy design.",
          "room": "Plenary Hall",
          "startDateTime": "2025-11-05T09:00:00Z",
          "endDateTime": "2025-11-05T10:30:00Z",
          "sessionType": "keynote",
          "keywords": [
            "climate",
            "climate policy",
            "paris agreement",
            "global stocktake"
          ],
          "isClimateRelated": true,
          "dayIndex": 1
        },
        {
          "id": "sess_climate2025_panel_carbon_pricing",
          "conferenceId": "conf_climate_policy_2025",
          "trackId": "track_climate2025_mitigation",
          "title": "Panel: Designing Effective Carbon Taxes and Emissions Trading Systems",
          "abstract": "Panelists compare recent reforms to carbon taxes and ETSs, focusing on price stability, distributional impacts, and political feasibility.",
          "room": "Room A",
          "startDateTime": "2025-11-05T11:00:00Z",
          "endDateTime": "2025-11-05T12:30:00Z",
          "sessionType": "panel",
          "keywords": [
            "climate",
            "carbon pricing",
            "emissions trading",
            "climate policy"
          ],
          "isClimateRelated": true,
          "dayIndex": 1
        },
        {
          "id": "sess_climate2025_parallel_auctions",
          "conferenceId": "conf_climate_policy_2025",
          "trackId": "track_climate2025_renewables",
          "title": "Parallel Session: Renewable Energy Auctions for Net-zero",
          "abstract": "Research presentations on the design and performance of renewable energy auctions in Europe, Latin America, and Africa.",
          "room": "Room B",
          "startDateTime": "2025-11-05T14:00:00Z",
          "endDateTime": "2025-11-05T15:30:00Z",
          "sessionType": "talk",
          "keywords": [
            "climate",
            "renewable energy policy",
            "auctions",
            "net-zero"
          ],
          "isClimateRelated": true,
          "dayIndex": 1
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:16:44.061734"
      }
    };

    // Copy data to localStorage using correct storage keys
    localStorage.setItem('conferences', JSON.stringify(generatedData.conferences));
    localStorage.setItem('donation_programs', JSON.stringify(generatedData.donation_programs));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('journals', JSON.stringify(generatedData.journals));
    localStorage.setItem('membership_plans', JSON.stringify(generatedData.membership_plans));
    localStorage.setItem('newsletter_topics', JSON.stringify(generatedData.newsletter_topics));
    localStorage.setItem('researchers', JSON.stringify(generatedData.researchers));
    localStorage.setItem('conference_fees', JSON.stringify(generatedData.conference_fees));
    localStorage.setItem('conference_tracks', JSON.stringify(generatedData.conference_tracks));
    localStorage.setItem('event_time_slots', JSON.stringify(generatedData.event_time_slots));
    localStorage.setItem('publications', JSON.stringify(generatedData.publications));
    localStorage.setItem('conference_sessions', JSON.stringify(generatedData.conference_sessions));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookmarkAffordableAIConference();
    this.testTask2_CreateClimateScheduleAcrossTracks();
    this.testTask3_FollowMLHealthcareResearcherFromCanada();
    this.testTask4_AddRenewableEnergyPolicyPapersToReadingList();
    this.testTask5_PreRegisterForHalfDayDatavizWorkshop();
    this.testTask6_SubscribeToAIEthicsAndClimatePolicyNewsletters();
    this.testTask7_CreateAnonymousDonationDraftForEarlyCareerProgram();
    this.testTask8_ChooseEconomicalMembershipPlanAndStartApplication();

    return this.results;
  }

  // Task 1: Bookmark an affordable AI conference in Europe for late 2025
  testTask1_BookmarkAffordableAIConference() {
    const testName = 'Task 1: Bookmark affordable AI conference in Europe (late 2025)';
    console.log('Testing:', testName);

    try {
      // 1. Navigate to homepage
      const homepageContent = this.logic.getHomepageContent();
      this.assert(!!homepageContent, 'Homepage content should be returned');

      // 2. Open conferences search options (simulating Conferences page)
      const confOptions = this.logic.getConferenceSearchOptions();
      this.assert(Array.isArray(confOptions.regions), 'Conference regions options should be an array');

      // 3. Search conferences in Europe, late 2025, AI topic, student fee <= 250
      const filters = {
        region: 'europe',
        startDateFrom: '2025-09-01',
        startDateTo: '2025-12-31',
        topicKeyword: 'artificial intelligence',
        attendeeType: 'student',
        maxRegistrationFeeAmount: 250,
        maxRegistrationFeeCurrency: 'eur',
        isInternational: true
      };
      const searchResult = this.logic.searchConferences(null, filters, 'start_date_asc', 1, 20);

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchConferences should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one matching AI conference');

      // Verify each result matches core filters
      for (let i = 0; i < searchResult.results.length; i++) {
        const item = searchResult.results[i];
        const conf = item.conference;
        this.assert(conf.region === 'europe', 'Conference region should be Europe');
        const start = new Date(conf.startDate);
        const from = new Date('2025-09-01T00:00:00Z');
        const to = new Date('2025-12-31T23:59:59Z');
        this.assert(start >= from && start <= to, 'Conference start date should be in late 2025 range');
        if (item.cheapestFeeForSelectedAttendeeType) {
          this.assert(item.cheapestFeeForSelectedAttendeeType.amount <= 250, 'Cheapest student fee should be <= 250');
        }
      }

      // 4. Pick the first conference from the list
      const selected = searchResult.results[0];
      const selectedConferenceId = selected.conference.id;

      // 5. Open conference detail
      const detail = this.logic.getConferenceDetail(selectedConferenceId);
      this.assert(detail && detail.conference && detail.conference.id === selectedConferenceId, 'getConferenceDetail should return the selected conference');

      // 6. Bookmark the conference
      const bookmarkResult = this.logic.bookmarkConference(selectedConferenceId, 'Bookmark from Task 1');
      this.assert(bookmarkResult && bookmarkResult.bookmark, 'bookmarkConference should return bookmark object');
      this.assert(bookmarkResult.bookmark.conferenceId === selectedConferenceId, 'Bookmark should reference the selected conference');

      // 7. Verify via My Account bookmarks list
      const bookmarkedList = this.logic.getBookmarkedConferences();
      this.assert(Array.isArray(bookmarkedList.bookmarks), 'getBookmarkedConferences should return bookmarks array');
      const found = bookmarkedList.bookmarks.find(b => b.conference && b.conference.id === selectedConferenceId);
      this.assert(!!found, 'Bookmarked conferences list should include the selected conference');

      // Also cross-check via consolidated account details
      const accountDetails = this.logic.getMyAccountDetails();
      this.assert(Array.isArray(accountDetails.bookmarkedConferences), 'My account bookmarkedConferences should be an array');
      const foundInAccount = accountDetails.bookmarkedConferences.find(b => b.conference && b.conference.id === selectedConferenceId);
      this.assert(!!foundInAccount, 'My account should include the bookmarked conference');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create one-day schedule with three climate sessions across multiple tracks
  testTask2_CreateClimateScheduleAcrossTracks() {
    const testName = 'Task 2: Create one-day climate schedule with 3 sessions across tracks';
    console.log('Testing:', testName);

    try {
      // 1. Simulate starting from homepage and opening Conferences
      const homepageContent = this.logic.getHomepageContent();
      this.assert(!!homepageContent, 'Homepage content should be available');

      // Search for European conferences (we will later pick one with climate-related sessions)
      const confSearch = this.logic.searchConferences(null, { region: 'europe' }, 'start_date_asc', 1, 20);
      this.assert(confSearch && Array.isArray(confSearch.results) && confSearch.results.length > 0, 'Should find upcoming conferences in Europe');

      // Determine which conference has climate-related sessions using actual session data from storage
      const sessionsData = JSON.parse(localStorage.getItem('conference_sessions') || '[]');
      const climateSessions = sessionsData.filter(s => s.isClimateRelated);
      this.assert(climateSessions.length > 0, 'There should be climate-related sessions in test data');
      const climateConferenceIds = Array.from(new Set(climateSessions.map(s => s.conferenceId)));

      let selectedConferenceId = null;
      for (let i = 0; i < confSearch.results.length; i++) {
        const confId = confSearch.results[i].conference.id;
        if (climateConferenceIds.indexOf(confId) !== -1) {
          selectedConferenceId = confId;
          break;
        }
      }
      this.assert(!!selectedConferenceId, 'Should find a conference that has climate-related sessions');

      // 2. Open conference detail
      const confDetail = this.logic.getConferenceDetail(selectedConferenceId);
      this.assert(confDetail && confDetail.conference && confDetail.conference.id === selectedConferenceId, 'Conference detail should load correctly');

      // 3. Open Program/Schedule tab via getConferenceProgram
      const program = this.logic.getConferenceProgram(selectedConferenceId);
      this.assert(program && Array.isArray(program.days) && program.days.length > 0, 'Conference program should have at least one day');

      // Pick a single full conference day (use the first day)
      const dayIndex = program.days[0].dayIndex;
      this.assert(typeof dayIndex === 'number', 'Day index should be a number');

      // 4 & 5. Filter sessions on that day for climate between 09:00 and 17:00
      const sessionFilters = {
        dayIndex: dayIndex,
        keyword: 'climate',
        startTimeFrom: '09:00',
        endTimeTo: '17:00'
      };
      const sessionsResult = this.logic.getConferenceSessions(selectedConferenceId, sessionFilters);
      this.assert(sessionsResult && Array.isArray(sessionsResult.sessions), 'getConferenceSessions should return sessions array');
      this.assert(sessionsResult.sessions.length >= 3, 'Should have at least 3 climate-related sessions between 09:00 and 17:00 on that day');

      const sessions = sessionsResult.sessions;

      // Helper to ensure time window condition using actual dates
      function isWithinNineToSeventeen(sessionObj) {
        const s = new Date(sessionObj.startDateTime);
        const e = new Date(sessionObj.endDateTime);
        const sHour = s.getUTCHours();
        const eHour = e.getUTCHours();
        return sHour >= 9 && eHour <= 17;
      }

      // Verify time window for returned sessions (should already be filtered)
      for (let i = 0; i < sessions.length; i++) {
        const sess = sessions[i].session;
        this.assert(isWithinNineToSeventeen(sess), 'Session should be within 09:00-17:00 window');
      }

      // 6. Add first climate session that meets criteria
      const firstWrapper = sessions[0];
      const firstSessionId = firstWrapper.session.id;
      const firstTrackId = firstWrapper.track ? firstWrapper.track.id : null;
      const addResult1 = this.logic.addSessionToPersonalSchedule(firstSessionId, 'Added from Task 2 - first session');
      this.assert(addResult1 && addResult1.item && addResult1.item.sessionId === firstSessionId, 'First session should be added to personal schedule');

      // 7. Choose second session from a different track if possible
      let secondWrapper = null;
      for (let i = 0; i < sessions.length; i++) {
        const w = sessions[i];
        const trackId = w.track ? w.track.id : null;
        if (w.session.id !== firstSessionId && trackId && firstTrackId && trackId !== firstTrackId) {
          secondWrapper = w;
          break;
        }
      }
      // Fallback: if none with different track, just use another session (but in our data there is one)
      if (!secondWrapper) {
        secondWrapper = sessions.find(w => w.session.id !== firstSessionId) || sessions[1];
      }
      const secondSessionId = secondWrapper.session.id;
      const secondTrackId = secondWrapper.track ? secondWrapper.track.id : null;
      const addResult2 = this.logic.addSessionToPersonalSchedule(secondSessionId, 'Added from Task 2 - second session');
      this.assert(addResult2 && addResult2.item && addResult2.item.sessionId === secondSessionId, 'Second session should be added to personal schedule');

      // 8. Select third climate-related session still between 09:00 and 17:00
      let thirdWrapper = null;
      for (let i = 0; i < sessions.length; i++) {
        const w = sessions[i];
        if (w.session.id !== firstSessionId && w.session.id !== secondSessionId) {
          thirdWrapper = w;
          break;
        }
      }
      this.assert(!!thirdWrapper, 'Should find a third distinct climate-related session between 09:00 and 17:00');
      const thirdSessionId = thirdWrapper.session.id;
      const addResult3 = this.logic.addSessionToPersonalSchedule(thirdSessionId, 'Added from Task 2 - third session');
      this.assert(addResult3 && addResult3.item && addResult3.item.sessionId === thirdSessionId, 'Third session should be added to personal schedule');

      const selectedSessionIds = [firstSessionId, secondSessionId, thirdSessionId];

      // 9. View My Schedule for that conference and verify
      const personalSchedule = this.logic.getPersonalSchedule({ conferenceId: selectedConferenceId });
      this.assert(personalSchedule && Array.isArray(personalSchedule.items), 'getPersonalSchedule should return items array');

      const itemsForConference = personalSchedule.items.filter(i => i.conference && i.conference.id === selectedConferenceId);
      // Should at least contain the 3 sessions we added
      for (let i = 0; i < selectedSessionIds.length; i++) {
        const sid = selectedSessionIds[i];
        const foundItem = itemsForConference.find(it => it.session && it.session.id === sid);
        this.assert(!!foundItem, 'My Schedule should contain session ' + sid);
      }

      // Ensure at least 3 sessions are present for that day/conference
      this.assert(itemsForConference.length >= 3, 'My Schedule should list at least 3 sessions for the conference');

      // Ensure at least 2 different tracks among the selected sessions
      const selectedItems = itemsForConference.filter(it => selectedSessionIds.indexOf(it.session.id) !== -1);
      const distinctTrackIds = Array.from(new Set(selectedItems.map(it => it.track ? it.track.id : null).filter(Boolean)));
      this.assert(distinctTrackIds.length >= 2, 'Selected sessions should cover at least 2 different tracks');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Follow a mid-career researcher in machine learning for healthcare from Canada
  testTask3_FollowMLHealthcareResearcherFromCanada() {
    const testName = 'Task 3: Follow ML-for-healthcare researcher from Canada';
    console.log('Testing:', testName);

    try {
      // 1. Navigate to Researchers directory
      const searchOptions = this.logic.getResearcherSearchOptions();
      this.assert(searchOptions && Array.isArray(searchOptions.countries), 'Researcher search options should include countries');

      // 2-5. Search and filter for machine learning healthcare, Canada, h-index 30-60
      const filters = {
        country: 'Canada',
        hIndexMin: 30,
        hIndexMax: 60,
        expertiseKeywords: ['machine learning for healthcare']
      };
      const searchResult = this.logic.searchResearchers('machine learning healthcare', filters, 'relevance', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchResearchers should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one ML-for-healthcare researcher in Canada');

      // 6. Pick first researcher whose expertise mentions healthcare-related ML
      let selectedResearcher = null;
      for (let i = 0; i < searchResult.results.length; i++) {
        const r = searchResult.results[i].researcher;
        const expertise = r.expertiseKeywords || [];
        const match = expertise.some(kw => (
          typeof kw === 'string' &&
          kw.toLowerCase().indexOf('machine learning') !== -1 &&
          kw.toLowerCase().indexOf('healthcare') !== -1
        ));
        if (r.country === 'Canada' && r.hIndex >= 30 && r.hIndex <= 60 && match) {
          selectedResearcher = r;
          break;
        }
      }
      this.assert(!!selectedResearcher, 'Should identify a researcher matching ML-for-healthcare in Canada with h-index 30-60');

      const researcherId = selectedResearcher.id;

      // 7. Open researcher profile and follow
      const profile = this.logic.getResearcherProfile(researcherId);
      this.assert(profile && profile.researcher && profile.researcher.id === researcherId, 'getResearcherProfile should return the selected researcher');

      const followResult = this.logic.followResearcher(researcherId, 'Followed from Task 3');
      this.assert(followResult && followResult.followed && followResult.followed.researcherId === researcherId, 'followResearcher should create follow record for the selected researcher');

      // 8. Verify in Followed Researchers list and My Account
      const followedList = this.logic.getFollowedResearchers();
      this.assert(followedList && Array.isArray(followedList.items), 'getFollowedResearchers should return items array');
      const found = followedList.items.find(it => it.researcher && it.researcher.id === researcherId);
      this.assert(!!found, 'Followed researchers list should include the selected researcher');

      const accountDetails = this.logic.getMyAccountDetails();
      this.assert(Array.isArray(accountDetails.followedResearchers), 'My account followedResearchers should be array');
      const foundInAccount = accountDetails.followedResearchers.find(it => it.researcher && it.researcher.id === researcherId);
      this.assert(!!foundInAccount, 'My account should list the followed researcher');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Add three recent open-access renewable energy policy papers to a reading list
  testTask4_AddRenewableEnergyPolicyPapersToReadingList() {
    const testName = 'Task 4: Add 3 open-access renewable energy policy papers (2021–2024, IF>5) to reading list';
    console.log('Testing:', testName);

    try {
      // 1. Open Publications page (options)
      const pubOptions = this.logic.getPublicationSearchOptions();
      this.assert(pubOptions && pubOptions.yearRange && pubOptions.impactFactorRange, 'Publication search options should include year and impact factor ranges');

      // 2-6. Search and filter for renewable energy policy, 2021-2024, open access, IF>=5
      const filters = {
        yearFrom: 2021,
        yearTo: 2024,
        accessType: 'open_access',
        minJournalImpactFactor: 5
      };
      const searchResult = this.logic.searchPublications('renewable energy policy', filters, 'year_desc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPublications should return results array');
      this.assert(searchResult.results.length >= 3, 'Should find at least 3 matching renewable energy policy publications');

      const selectedPublicationIds = [];

      // 7-9. Add first three matching results to reading list
      for (let i = 0; i < 3; i++) {
        const item = searchResult.results[i];
        const pub = item.publication;
        const detail = this.logic.getPublicationDetail(pub.id);
        this.assert(detail && detail.publication && detail.publication.id === pub.id, 'getPublicationDetail should load publication ' + pub.id);

        const addResult = this.logic.addPublicationToReadingList(pub.id, 'Added from Task 4 index ' + i);
        this.assert(addResult && addResult.item && addResult.item.publicationId === pub.id, 'addPublicationToReadingList should add publication ' + pub.id);
        selectedPublicationIds.push(pub.id);
      }

      // 10. Verify My Reading List contains the three publications and that they match constraints
      const readingList = this.logic.getReadingList();
      this.assert(readingList && Array.isArray(readingList.items), 'getReadingList should return items array');

      for (let i = 0; i < selectedPublicationIds.length; i++) {
        const pid = selectedPublicationIds[i];
        const found = readingList.items.find(it => it.publication && it.publication.id === pid);
        this.assert(!!found, 'Reading list should contain publication ' + pid);
        const pub = found.publication;
        this.assert(pub.year >= 2021 && pub.year <= 2024, 'Publication should be between 2021 and 2024');
        this.assert(pub.accessType === 'open_access' || pub.isOpenAccess === true, 'Publication should be open access');
        if (typeof pub.journalImpactFactor === 'number') {
          this.assert(pub.journalImpactFactor >= 5, 'Publication journal impact factor should be >= 5');
        }
      }

      const accountDetails = this.logic.getMyAccountDetails();
      this.assert(Array.isArray(accountDetails.readingList), 'My account readingList should be array');
      for (let i = 0; i < selectedPublicationIds.length; i++) {
        const pid = selectedPublicationIds[i];
        const found = accountDetails.readingList.find(it => it.publication && it.publication.id === pid);
        this.assert(!!found, 'My account should list saved publication ' + pid);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Pre-register as a guest for an affordable half-day data visualization workshop
  testTask5_PreRegisterForHalfDayDatavizWorkshop() {
    const testName = 'Task 5: Pre-register as guest for half-day data visualization workshop (<$150, morning)';
    console.log('Testing:', testName);

    try {
      // 1. Open Events/Workshops page (get search options)
      const eventOptions = this.logic.getEventSearchOptions();
      this.assert(eventOptions && Array.isArray(eventOptions.eventTypes), 'Event search options should include event types');

      // 2-5. Search for data visualization workshops, half-day, fee <= 150 USD
      const filters = {
        eventType: 'workshop',
        durationType: 'half_day',
        dateFrom: null,
        dateTo: null,
        maxFeeAmount: 150,
        maxFeeCurrency: 'usd'
      };
      const searchResult = this.logic.searchEvents('data visualization', filters, 'fee_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchEvents should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one matching half-day data visualization workshop');

      // Choose first workshop whose base fee is <= 150
      let selectedEvent = null;
      for (let i = 0; i < searchResult.results.length; i++) {
        const ev = searchResult.results[i].event;
        if (typeof ev.baseFeeAmount === 'number' && ev.baseFeeAmount <= 150) {
          selectedEvent = ev;
          break;
        }
      }
      this.assert(!!selectedEvent, 'Should select an affordable half-day data visualization workshop');

      const eventId = selectedEvent.id;

      // 6. Open event detail, including time slots & registration options
      const detail = this.logic.getEventDetail(eventId);
      this.assert(detail && detail.event && detail.event.id === eventId, 'getEventDetail should load selected event');
      this.assert(Array.isArray(detail.timeSlots) && detail.timeSlots.length > 0, 'Event should have at least one time slot');
      this.assert(detail.registrationInfo && Array.isArray(detail.registrationInfo.availablePaymentOptions), 'Event registrationInfo should include availablePaymentOptions');

      // 7. Ensure guest registration is allowed (happy path assumption)
      this.assert(detail.registrationInfo.canRegisterAsGuest === true || detail.registrationInfo.canRegisterAsGuest === undefined || detail.registrationInfo.canRegisterAsGuest === null,
        'Event should allow or default to guest registration');

      // 8. Select morning time slot: choose slot with earliest startDateTime
      let morningSlot = detail.timeSlots[0];
      for (let i = 1; i < detail.timeSlots.length; i++) {
        const slot = detail.timeSlots[i];
        if (new Date(slot.startDateTime) < new Date(morningSlot.startDateTime)) {
          morningSlot = slot;
        }
      }
      const timeSlotId = morningSlot.id;
      this.assert(!!timeSlotId, 'Morning time slot id should be available');

      // 9. Choose payment option preferring pay_on_site or invoice_later
      const availablePaymentOptions = detail.registrationInfo.availablePaymentOptions;
      let paymentOption = null;
      if (availablePaymentOptions.indexOf('pay_on_site') !== -1) {
        paymentOption = 'pay_on_site';
      } else if (availablePaymentOptions.indexOf('invoice_later') !== -1) {
        paymentOption = 'invoice_later';
      } else {
        // As a last resort, use the first available option (still respects actual API response)
        paymentOption = availablePaymentOptions[0];
      }
      this.assert(!!paymentOption, 'A payment option should be selected');

      const fullName = 'Alex Guest';
      const email = 'alex.guest@example.com';
      const affiliation = 'Independent';

      // 10. Submit guest pre-registration
      const registrationResult = this.logic.submitEventRegistration(
        eventId,
        timeSlotId,
        'guest',
        fullName,
        email,
        affiliation,
        paymentOption,
        true
      );

      this.assert(registrationResult && registrationResult.registration, 'submitEventRegistration should return registration object');
      const reg = registrationResult.registration;
      this.assert(reg.eventId === eventId, 'Registration should reference the selected event');
      this.assert(reg.timeSlotId === timeSlotId, 'Registration should reference the selected morning time slot');
      this.assert(reg.registrationType === 'guest', 'Registration type should be guest');
      this.assert(reg.fullName === fullName, 'Registration full name should match input');
      this.assert(reg.email === email, 'Registration email should match input');
      this.assert(reg.paymentOption === paymentOption, 'Registration payment option should match selected option');
      this.assert(reg.isPreRegistration === true || reg.isPreRegistration === undefined, 'Registration should be treated as pre-registration');
      this.assert(reg.status === 'pending' || reg.status === 'confirmed', 'Registration status should be pending or confirmed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Subscribe to weekly AI ethics and climate policy newsletters with HTML format
  testTask6_SubscribeToAIEthicsAndClimatePolicyNewsletters() {
    const testName = 'Task 6: Subscribe to weekly AI Ethics and Climate Policy newsletters (HTML)';
    console.log('Testing:', testName);

    try {
      // 1. Open newsletter subscriptions page
      const topicsResult = this.logic.getNewsletterTopics();
      this.assert(topicsResult && Array.isArray(topicsResult.topics), 'getNewsletterTopics should return topics array');

      const topicCodes = topicsResult.topics.map(t => t.code);
      this.assert(topicCodes.indexOf('ai_ethics') !== -1, 'AI Ethics topic should be available');
      this.assert(topicCodes.indexOf('climate_policy') !== -1, 'Climate Policy topic should be available');

      // 2. Enter email address
      const email = 'research.subscriber@example.com';

      // 3-6. Configure subscriptions for AI Ethics and Climate Policy, weekly, HTML
      const subscriptionsToSet = [
        {
          topic: 'ai_ethics',
          frequency: 'weekly',
          format: 'html',
          isActive: true
        },
        {
          topic: 'climate_policy',
          frequency: 'weekly',
          format: 'html',
          isActive: true
        }
      ];

      const updateResult = this.logic.updateNewsletterSubscriptions(email, subscriptionsToSet);
      this.assert(updateResult && Array.isArray(updateResult.updatedSubscriptions), 'updateNewsletterSubscriptions should return updatedSubscriptions array');

      const updatedSubs = updateResult.updatedSubscriptions;
      // Ensure we have at least the two topics set correctly
      const aiEthicsSub = updatedSubs.find(s => s.topic === 'ai_ethics');
      const climatePolicySub = updatedSubs.find(s => s.topic === 'climate_policy');

      this.assert(!!aiEthicsSub, 'AI Ethics subscription should be created/updated');
      this.assert(!!climatePolicySub, 'Climate Policy subscription should be created/updated');
      this.assert(aiEthicsSub.frequency === 'weekly', 'AI Ethics frequency should be weekly');
      this.assert(climatePolicySub.frequency === 'weekly', 'Climate Policy frequency should be weekly');
      this.assert(aiEthicsSub.format === 'html', 'AI Ethics format should be HTML');
      this.assert(climatePolicySub.format === 'html', 'Climate Policy format should be HTML');
      this.assert(aiEthicsSub.isActive === true, 'AI Ethics subscription should be active');
      this.assert(climatePolicySub.isActive === true, 'Climate Policy subscription should be active');

      // Verify via lookup for email
      const lookupResult = this.logic.getNewsletterSubscriptionsForEmail(email);
      this.assert(lookupResult && Array.isArray(lookupResult.subscriptions), 'getNewsletterSubscriptionsForEmail should return subscriptions array');
      const aiEthicsLookup = lookupResult.subscriptions.find(s => s.topic === 'ai_ethics');
      const climatePolicyLookup = lookupResult.subscriptions.find(s => s.topic === 'climate_policy');
      this.assert(!!aiEthicsLookup, 'Lookup should include AI Ethics subscription');
      this.assert(!!climatePolicyLookup, 'Lookup should include Climate Policy subscription');
      this.assert(aiEthicsLookup.frequency === 'weekly', 'Lookup AI Ethics frequency should be weekly');
      this.assert(climatePolicyLookup.frequency === 'weekly', 'Lookup Climate Policy frequency should be weekly');
      this.assert(aiEthicsLookup.format === 'html', 'Lookup AI Ethics format should be HTML');
      this.assert(climatePolicyLookup.format === 'html', 'Lookup Climate Policy format should be HTML');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Make an anonymous $75 donation to the Early Career Research Grants program (draft only)
  testTask7_CreateAnonymousDonationDraftForEarlyCareerProgram() {
    const testName = 'Task 7: Create anonymous one-time $75 donation draft for Early Career Research Grants';
    console.log('Testing:', testName);

    try {
      // 1. Open donations page (get donation programs and supported currencies)
      const donationOptions = this.logic.getDonationPrograms();
      this.assert(donationOptions && Array.isArray(donationOptions.programs), 'getDonationPrograms should return programs array');

      // 4. Find Early Career Research Grants program
      const earlyCareerProgram = donationOptions.programs.find(p => p.code === 'early_career_research_grants' || p.name.toLowerCase().indexOf('early career research grants') !== -1);
      this.assert(!!earlyCareerProgram, 'Early Career Research Grants program should exist');

      const donationType = 'one_time';
      const amount = 75;
      const currency = 'usd';
      const programId = earlyCareerProgram.id;
      const isAnonymous = true;
      // Opt-out of physical mail: choose 'no_postal_mail' to indicate no postal mail
      const communicationPreference = 'no_postal_mail';
      const donorName = 'Jordan Donor';
      const donorEmail = 'jordan.donor@example.com';

      // 2-7. Create donation draft (no payment)
      const draftResult = this.logic.createDonationDraft(
        donationType,
        amount,
        currency,
        programId,
        isAnonymous,
        communicationPreference,
        donorName,
        donorEmail,
        ''
      );

      this.assert(draftResult && draftResult.donation, 'createDonationDraft should return donation object');
      const donation = draftResult.donation;
      this.assert(donation.donationType === donationType, 'Donation type should be one_time');
      this.assert(donation.amount === amount, 'Donation amount should be 75');
      this.assert(donation.currency === currency, 'Donation currency should be USD');
      this.assert(donation.programId === programId, 'Donation programId should reference Early Career program');
      this.assert(donation.isAnonymous === true, 'Donation should be marked anonymous');
      this.assert(donation.communicationPreference === communicationPreference, 'Donation communication preference should opt out of postal mail');
      this.assert(donation.donorName === donorName, 'Donation donorName should match input');
      this.assert(donation.donorEmail === donorEmail, 'Donation donorEmail should match input');
      this.assert(donation.status === 'draft' || donation.status === 'pending_payment', 'Donation status should be draft or pending_payment before payment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose most economical membership plan that still includes key benefits and begin application
  testTask8_ChooseEconomicalMembershipPlanAndStartApplication() {
    const testName = 'Task 8: Choose economical membership plan (webinars + conference discounts) and start application';
    console.log('Testing:', testName);

    try {
      // 1. Open Membership overview
      const membershipResult = this.logic.getMembershipPlans();
      this.assert(membershipResult && Array.isArray(membershipResult.plans), 'getMembershipPlans should return plans array');

      const plans = membershipResult.plans;
      const studentPlan = plans.find(p => p.planType === 'student');
      const professionalPlan = plans.find(p => p.planType === 'professional');
      this.assert(!!studentPlan, 'Student plan should be available');
      this.assert(!!professionalPlan, 'Professional plan should be available');

      // 3-4. Compare plans, choose lower annual cost that includes both key benefits
      function includesKeyBenefits(plan) {
        return plan.includesMemberWebinars === true && plan.includesDiscountedConferenceFees === true;
      }

      this.assert(includesKeyBenefits(studentPlan) || includesKeyBenefits(professionalPlan), 'At least one of the plans should include key benefits');

      const candidatePlans = [studentPlan, professionalPlan].filter(includesKeyBenefits);
      this.assert(candidatePlans.length > 0, 'There should be at least one candidate plan with key benefits');

      let chosenPlan = candidatePlans[0];
      for (let i = 1; i < candidatePlans.length; i++) {
        if (candidatePlans[i].annualPriceAmount < chosenPlan.annualPriceAmount) {
          chosenPlan = candidatePlans[i];
        }
      }

      // Ensure chosen plan indeed has lower or equal price and the benefits
      if (chosenPlan.id === studentPlan.id) {
        this.assert(studentPlan.annualPriceAmount <= professionalPlan.annualPriceAmount, 'Student plan should be cheaper or equal to Professional plan');
      } else if (chosenPlan.id === professionalPlan.id) {
        this.assert(professionalPlan.annualPriceAmount <= studentPlan.annualPriceAmount, 'Professional plan should be cheaper or equal to Student plan');
      }
      this.assert(includesKeyBenefits(chosenPlan), 'Chosen plan should include member webinars and discounted conference fees');

      // 5-8. Begin application for chosen plan
      const fullName = 'Taylor Member';
      const email = 'taylor.member@example.com';
      const country = 'United States';
      const roleOrStatus = chosenPlan.planType; // e.g., 'student' or 'professional'

      const appResult = this.logic.startMembershipApplication(
        chosenPlan.id,
        fullName,
        email,
        country,
        roleOrStatus
      );

      this.assert(appResult && appResult.application, 'startMembershipApplication should return application object');
      const app = appResult.application;
      this.assert(app.planId === chosenPlan.id, 'Application planId should match chosen plan');
      this.assert(app.fullName === fullName, 'Application fullName should match input');
      this.assert(app.email === email, 'Application email should match input');
      this.assert(app.country === country, 'Application country should match input');
      if (roleOrStatus) {
        this.assert(app.roleOrStatus === roleOrStatus, 'Application roleOrStatus should match selected value');
      }
      this.assert(app.status === 'in_progress' || app.status === 'submitted', 'Application status should be in_progress or submitted at initial step');

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
