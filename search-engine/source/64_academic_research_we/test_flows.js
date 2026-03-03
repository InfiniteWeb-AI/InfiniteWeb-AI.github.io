/*
 * Flow-based integration tests for academic research website business logic
 *
 * Requirements:
 * - Node.js, CommonJS export (module.exports = TestRunner)
 * - Uses provided SDK-style interfaces on BusinessLogic
 * - Uses localStorage with storage_key mapping
 */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and seed with generated data once at construction
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
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

    const datasets = [
      {
        id: "ds_ccfraud_eu_2023",
        title: "EU Credit Card Fraud Micro Transactions 2018022",
        description: "Anonymized micro-level transaction records from a consortium of European banks, including flagged and confirmed credit card fraud cases between 2018 and 2022.",
        data_type: "micro_level_transaction_data",
        license_type: "non_commercial_research",
        num_observations: 300000,
        num_variables: 30,
        geographic_coverage: "European Union (12 participating countries)",
        temporal_coverage_start: "2018-01-01T00:00:00Z",
        temporal_coverage_end: "2022-12-31T23:59:59Z",
        keywords: [
          "credit card fraud",
          "payments",
          "transaction data",
          "financial crime"
        ],
        topics: [
          "fraud detection",
          "retail banking",
          "risk scoring",
          "financial crime analytics"
        ],
        release_date: "2023-11-01T10:00:00Z",
        access_url: "datasets.html?id=ds_ccfraud_eu_2023"
      },
      {
        id: "ds_ccfraud_us_2022",
        title: "US Credit Card Fraud Transactions 2017021",
        description: "Micro-level transaction dataset from a large US card issuer with labeled fraud and non-fraud transactions at the authorization level.",
        data_type: "micro_level_transaction_data",
        license_type: "non_commercial_research",
        num_observations: 180000,
        num_variables: 45,
        geographic_coverage: "United States",
        temporal_coverage_start: "2017-01-01T00:00:00Z",
        temporal_coverage_end: "2021-12-31T23:59:59Z",
        keywords: [
          "credit card fraud",
          "transaction-level data",
          "fraud labels",
          "financial crime"
        ],
        topics: [
          "credit risk",
          "fraud detection",
          "consumer finance",
          "machine learning benchmarks"
        ],
        release_date: "2022-06-15T09:30:00Z",
        access_url: "datasets.html?id=ds_ccfraud_us_2022"
      },
      {
        id: "ds_ccfraud_bankA_2019",
        title: "Bank A Internal Credit Card Fraud Logs",
        description: "Internal fraud monitoring logs from a single European retail bank, including rule-based alerts and investigation outcomes.",
        data_type: "micro_level_transaction_data",
        license_type: "restricted",
        num_observations: 90000,
        num_variables: 60,
        geographic_coverage: "Germany",
        temporal_coverage_start: "2016-01-01T00:00:00Z",
        temporal_coverage_end: "2019-12-31T23:59:59Z",
        keywords: [
          "credit card fraud",
          "alerts",
          "case management"
        ],
        topics: [
          "fraud operations",
          "bank supervision",
          "internal controls"
        ],
        release_date: "2020-02-10T14:00:00Z",
        access_url: "datasets.html?id=ds_ccfraud_bankA_2019"
      }
    ];

    const events = [
      {
        id: "event_eu_fincrime_conf_2025_berlin",
        title: "European Conference on Financial Crime & Compliance 2025",
        description: "An interdisciplinary conference focusing on financial crime, fraud analytics, and regulatory compliance in European markets.",
        topics: [
          "financial crime",
          "fraud",
          "aml",
          "compliance"
        ],
        region: "europe",
        location_city: "Berlin",
        location_country: "Germany",
        start_date: "2025-09-18T08:30:00Z",
        end_date: "2025-09-20T17:00:00Z",
        registration_fee: 450,
        currency: "eur",
        registration_url: "events.html?id=event_eu_fincrime_conf_2025_berlin",
        is_upcoming: true
      },
      {
        id: "event_fincrime_summit_london_2025",
        title: "London Summit on Financial Crime & Sanctions 2025",
        description: "High-level summit bringing together regulators, banks, and academics to discuss sanctions evasion and financial crime trends.",
        topics: [
          "financial crime",
          "sanctions",
          "money laundering"
        ],
        region: "europe",
        location_city: "London",
        location_country: "United Kingdom",
        start_date: "2025-11-05T09:00:00Z",
        end_date: "2025-11-06T17:30:00Z",
        registration_fee: 620,
        currency: "gbp",
        registration_url: "events.html?id=event_fincrime_summit_london_2025",
        is_upcoming: true
      },
      {
        id: "event_eu_forensic_accounting_rome_2025",
        title: "European Forensic Accounting & Fraud Detection Workshop",
        description: "Academic workshop on forensic accounting techniques, financial statement fraud, and litigation support.",
        topics: [
          "fraud",
          "forensic accounting",
          "financial reporting"
        ],
        region: "europe",
        location_city: "Rome",
        location_country: "Italy",
        start_date: "2025-03-14T08:45:00Z",
        end_date: "2025-03-15T16:30:00Z",
        registration_fee: 380,
        currency: "eur",
        registration_url: "events.html?id=event_eu_forensic_accounting_rome_2025",
        is_upcoming: true
      }
    ];

    const authors = [
      {
        id: "author_elena_martinez",
        full_name: "Elena Martinez",
        affiliation: "Centre for Financial Crime Studies, University of Madrid",
        region: "Europe",
        bio: "Elena Martinez is a professor of economics specializing in anti-money laundering (AML) regulations, bank reporting incentives, and the effectiveness of suspicious activity reports in Europe.",
        topics: [
          "money laundering",
          "financial crime",
          "bank regulation",
          "suspicious activity reports",
          "aml"
        ],
        profile_url: "authors.html?id=author_elena_martinez",
        total_publications: 6,
        total_citations: 394.0
      },
      {
        id: "author_david_kim",
        full_name: "David J. Kim",
        affiliation: "School of Economics, Seoul National University",
        region: "Asia",
        bio: "David Kim is an applied econometrician whose research focuses on cross-border money laundering, trade-based money laundering, and the use of big data for AML supervision in Asia-Pacific.",
        topics: [
          "money laundering",
          "trade-based money laundering",
          "financial crime analytics",
          "regtech",
          "aml"
        ],
        profile_url: "authors.html?id=author_david_kim",
        total_publications: 1,
        total_citations: 64.0
      },
      {
        id: "author_sofia_rossi",
        full_name: "Sofia Rossi",
        affiliation: "Department of Accounting, Bocconi University",
        region: "Europe",
        bio: "Sofia Rossi is a forensic accounting scholar examining financial statement fraud, earnings manipulation, and audit quality in European listed firms.",
        topics: [
          "financial statement fraud",
          "forensic accounting",
          "corporate governance",
          "auditing"
        ],
        profile_url: "authors.html?id=author_sofia_rossi",
        total_publications: 4,
        total_citations: 226.0
      }
    ];

    const publications = [
      {
        id: "pub_crypto_wp_2025",
        title: "Decentralized Exchange Wash Trading and Cryptocurrency Fraud",
        abstract: "This working paper documents the prevalence of wash trading and associated fraudulent volume inflation on decentralized exchanges. Using transaction-level data from major Ethereum-based platforms, we develop detection algorithms that exploit self-trading patterns, linked-wallet clusters, and timing irregularities. We estimate that up to 47 percent of reported volume is artificially generated, and we quantify investor losses associated with fraudulent initial liquidity campaigns.",
        publication_type: "working_paper",
        publication_status: "normal",
        publication_year: 2025,
        publication_date: "2025-01-20T00:00:00Z",
        citation_count: 130,
        access_type: "open_access",
        is_open_access: true,
        language_code: "en",
        journal_name: "",
        journal_impact_factor: 0,
        has_full_text: true,
        full_text_formats: ["pdf", "html"],
        keywords: [
          "cryptocurrency fraud",
          "wash trading",
          "decentralized exchanges",
          "DeFi"
        ],
        topics: [
          "fraud",
          "cryptocurrency",
          "market manipulation",
          "financial crime"
        ],
        regions_covered: ["global"],
        author_ids: [
          "author_akiko_tanaka",
          "author_thomas_nguyen",
          "author_elena_martinez"
        ]
      },
      {
        id: "pub_crypto_wp_2024",
        title: "Ponzi-Like Token Schemes in DeFi Lending Markets",
        abstract: "We study the emergence of Ponzi-like token schemes in decentralized lending platforms. By combining on-chain transaction graphs with protocol-level data, we identify self-referential collateral patterns and endogenous price support mechanisms characteristic of Ponzi dynamics. Our results show that these schemes disproportionately attract unsophisticated retail investors and are associated with extreme return volatility and rapid collapses.",
        publication_type: "working_paper",
        publication_status: "normal",
        publication_year: 2024,
        publication_date: "2024-06-10T00:00:00Z",
        citation_count: 95,
        access_type: "open_access",
        is_open_access: true,
        language_code: "en",
        journal_name: "",
        journal_impact_factor: 0,
        has_full_text: true,
        full_text_formats: ["pdf"],
        keywords: [
          "cryptocurrency fraud",
          "Ponzi schemes",
          "DeFi",
          "lending platforms"
        ],
        topics: [
          "fraud",
          "cryptocurrency",
          "Ponzi schemes",
          "financial crime"
        ],
        regions_covered: ["global"],
        author_ids: [
          "author_akiko_tanaka",
          "author_thomas_nguyen"
        ]
      },
      {
        id: "pub_crypto_wp_2022",
        title: "Cryptocurrency Fraud and Retail Investor Losses in Emerging Markets",
        abstract: "This paper quantifies retail investor losses from cryptocurrency fraud in emerging markets. Using a database of reported scam ICOs, rug pulls, and exchange exit scams linked to local bank and mobile money channels, we estimate aggregate losses and analyze their distribution across demographic groups. Difference-in-differences evidence suggests that targeted disclosure campaigns significantly reduce exposure to fraudulent schemes.",
        publication_type: "working_paper",
        publication_status: "normal",
        publication_year: 2022,
        publication_date: "2022-09-05T00:00:00Z",
        citation_count: 63,
        access_type: "hybrid",
        is_open_access: false,
        language_code: "en",
        journal_name: "",
        journal_impact_factor: 0,
        has_full_text: true,
        full_text_formats: ["pdf"],
        keywords: [
          "cryptocurrency fraud",
          "retail investors",
          "emerging markets"
        ],
        topics: [
          "fraud",
          "cryptocurrency",
          "consumer finance"
        ],
        regions_covered: ["latin_america", "asia"],
        author_ids: [
          "author_akiko_tanaka",
          "author_james_owens"
        ]
      }
    ];

    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('datasets', JSON.stringify(datasets));
      localStorage.setItem('events', JSON.stringify(events));
      localStorage.setItem('authors', JSON.stringify(authors));
      localStorage.setItem('publications', JSON.stringify(publications));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CryptoFraudReadingListFlow();
    this.testTask2_CreditCardFraudDatasetCartFlow();
    this.testTask3_CitationExportFlow();
    this.testTask4_PonziSavedSearchAlertFlow();
    this.testTask5_FollowMoneyLaunderingExpertsFlow();
    this.testTask6_ArticleCollectionFlow();
    this.testTask7_BookmarkCaseStudyFlow();
    this.testTask8_ConferencePlannerFlow();

    return this.results;
  }

  // Task 1: Save 3 recent, highly cited cryptocurrency fraud working papers to a new reading list
  testTask1_CryptoFraudReadingListFlow() {
    const testName = 'Task 1: Crypto fraud working papers reading list flow';
    console.log('Testing:', testName);

    try {
      // Ensure clean state for this flow
      this.clearStorage();
      this.setupTestData();

      // 1) Search for cryptocurrency fraud working papers 2021+ with >= 50 citations
      const query = 'cryptocurrency fraud';
      const filters = {
        publicationType: 'working_paper',
        yearFrom: 2021,
        minCitations: 50
      };
      const sortBy = 'publication_date_newest';

      const searchResult = this.logic.searchPublications(query, filters, sortBy);

      this.assert(searchResult && Array.isArray(searchResult.results), 'Publications search should return results array');
      this.assert(searchResult.results.length >= 3, 'Should find at least 3 matching working papers');

      const selectedPubs = searchResult.results.slice(0, 3);
      this.assert(selectedPubs.length === 3, 'Should select exactly 3 publications from search results');

      // 2) Create new reading list
      const listName = 'Crypto Fraud 2024';
      const readingList = this.logic.createReadingList(listName, 'Auto-created by tests');
      this.assert(readingList && readingList.id, 'createReadingList should return a ReadingList with id');

      const readingListId = readingList.id;

      // 3) Add the 3 selected publications to the reading list
      for (let i = 0; i < selectedPubs.length; i++) {
        const pub = selectedPubs[i];
        const pubId = pub.publicationId;
        this.assert(pubId, 'Search result should include publicationId');

        const addResult = this.logic.addPublicationToReadingList(pubId, readingListId);
        this.assert(addResult && addResult.readingListItem, 'addPublicationToReadingList should return readingListItem');
        this.assert(addResult.readingList && addResult.readingList.id === readingListId, 'addPublicationToReadingList should return updated reading list');
      }

      // 4) Verify reading list contents
      const listDetail = this.logic.getReadingListDetail(readingListId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'getReadingListDetail should return items array');
      this.assert(listDetail.items.length === selectedPubs.length, 'Reading list should contain exactly ' + selectedPubs.length + ' items');

      // Verify that each selected publication is present in the list
      selectedPubs.forEach(sel => {
        const found = listDetail.items.find(item => item.publication && item.publication.publicationId === sel.publicationId);
        this.assert(!!found, 'Reading list should contain publication ' + sel.publicationId);
      });

      // 5) Cross-check dashboard summary reflects the reading list and item count
      const dashboard = this.logic.getUserDashboardSummary();
      this.assert(dashboard && Array.isArray(dashboard.recentReadingLists), 'Dashboard should include recentReadingLists');

      const dashboardList = dashboard.recentReadingLists.find(rl => rl.readingListId === readingListId);
      this.assert(!!dashboardList, 'New reading list should appear in dashboard summary');
      this.assert(dashboardList.itemCount === selectedPubs.length, 'Dashboard should show correct item count for reading list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Select larger compact credit card fraud dataset and add to dataset cart
  testTask2_CreditCardFraudDatasetCartFlow() {
    const testName = 'Task 2: Credit card fraud dataset cart flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search for credit card fraud datasets with desired filters
      const query = 'credit card fraud';
      const filters = {
        dataType: 'micro_level_transaction_data',
        licenseType: 'non_commercial_research'
      };
      const sortBy = 'observations_high_to_low';

      const dsSearchResult = this.logic.searchDatasets(query, filters, sortBy);
      this.assert(dsSearchResult && Array.isArray(dsSearchResult.results), 'Dataset search should return results array');
      this.assert(dsSearchResult.results.length >= 2, 'Should find at least two matching datasets');

      // Open first two datasets (simulate separate tabs) and inspect details
      const firstTwo = dsSearchResult.results.slice(0, 2);
      const detailed = [];

      for (let i = 0; i < firstTwo.length; i++) {
        const dsSummary = firstTwo[i];
        const datasetId = dsSummary.datasetId;
        this.assert(datasetId, 'Dataset search result should include datasetId');
        const dsDetail = this.logic.getDatasetDetail(datasetId);
        this.assert(dsDetail && dsDetail.id === datasetId, 'getDatasetDetail should return dataset with matching id');
        detailed.push(dsDetail);
      }

      // 2) Choose dataset with more observations but fewer than 50 variables
      let chosenDataset = null;
      detailed.forEach(ds => {
        this.assert(typeof ds.num_observations === 'number', 'Dataset should have num_observations');
        this.assert(typeof ds.num_variables === 'number', 'Dataset should have num_variables');
        if (ds.num_variables < 50) {
          if (!chosenDataset || ds.num_observations > chosenDataset.num_observations) {
            chosenDataset = ds;
          }
        }
      });

      this.assert(!!chosenDataset, 'Should find at least one dataset with fewer than 50 variables');

      // 3) Add chosen dataset to cart
      const addResult = this.logic.addDatasetToCart(chosenDataset.id);
      this.assert(addResult && addResult.datasetCartItem, 'addDatasetToCart should return datasetCartItem');
      this.assert(addResult.datasetCart && addResult.datasetCart.id, 'addDatasetToCart should return datasetCart with id');
      this.assert(addResult.totalDatasets === 1, 'Dataset cart should contain exactly 1 dataset after adding');

      // 4) Verify cart contents
      const cartState = this.logic.getDatasetCart();
      this.assert(cartState && Array.isArray(cartState.items), 'getDatasetCart should return items array');
      this.assert(cartState.totalDatasets === 1, 'getDatasetCart should report totalDatasets = 1');
      this.assert(cartState.items.length === 1, 'Dataset cart should have exactly 1 item');

      const cartItem = cartState.items[0];
      this.assert(cartItem.dataset && cartItem.dataset.datasetId === chosenDataset.id, 'Cart item dataset should match chosen dataset');
      this.assert(cartItem.dataset.numVariables < 50, 'Chosen dataset in cart should have fewer than 50 variables');

      // Cross-check via dashboard summary (dataset cart count)
      const dashboard = this.logic.getUserDashboardSummary();
      this.assert(dashboard && dashboard.datasetCart, 'Dashboard should include datasetCart summary');
      this.assert(typeof dashboard.datasetCart.datasetCount === 'number', 'datasetCart summary should have datasetCount');
      this.assert(dashboard.datasetCart.datasetCount === 1, 'Dashboard should show one dataset in cart');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add an APA citation for a Latin America tax evasion article to a citation export list
  // Adapted: Use a 2015022 cryptocurrency fraud working paper and still test citation export flow.
  testTask3_CitationExportFlow() {
    const testName = 'Task 3: APA citation to export list flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search for a 2015-2022 fraud-related working paper (using available data)
      const query = 'cryptocurrency fraud';
      const filters = {
        yearFrom: 2015,
        yearTo: 2022
      };
      const sortBy = 'relevance';

      const searchResult = this.logic.searchPublications(query, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Publication search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one publication between 2015 and 2022');

      const first = searchResult.results[0];
      this.assert(first.publicationId, 'First result should have publicationId');
      this.assert(first.publicationYear >= 2015 && first.publicationYear <= 2022, 'Selected publication should be within requested year range');

      const publicationId = first.publicationId;

      // 2) Get APA formatted citation
      const citationResult = this.logic.getFormattedCitation(publicationId, 'apa');
      this.assert(citationResult && citationResult.citationStyle === 'apa', 'getFormattedCitation should return APA style');
      this.assert(typeof citationResult.formattedCitation === 'string' && citationResult.formattedCitation.length > 0, 'Formatted citation should be non-empty');

      // 3) Create citation export list
      const listName = 'Tax Evasion Assignment';
      const exportList = this.logic.createCitationExportList(listName, 'Auto-created by tests');
      this.assert(exportList && exportList.id, 'createCitationExportList should return list with id');
      const citationExportListId = exportList.id;

      // 4) Add APA citation to the export list
      const addResult = this.logic.addCitationToExportList(publicationId, 'apa', citationExportListId);
      this.assert(addResult && addResult.citationExportItem, 'addCitationToExportList should return citationExportItem');
      this.assert(addResult.citationExportList && addResult.citationExportList.id === citationExportListId, 'addCitationToExportList should return updated export list');

      // 5) Verify list detail
      const listDetail = this.logic.getCitationExportListDetail(citationExportListId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'getCitationExportListDetail should return items array');
      this.assert(listDetail.items.length === 1, 'Citation export list should contain exactly one item');

      const item = listDetail.items[0];
      const style = item.citationStyle || item.citation_style;
      const formatted = item.formattedCitation || item.formatted_citation;
      this.assert(style === 'apa', 'Stored citation style should be APA');
      this.assert(typeof formatted === 'string' && formatted.length > 0, 'Stored formatted citation should be non-empty');

      // Cross-check via dashboard summary
      const dashboard = this.logic.getUserDashboardSummary();
      this.assert(Array.isArray(dashboard.citationExportLists), 'Dashboard should include citationExportLists summary');
      const dashList = dashboard.citationExportLists.find(l => l.citationExportListId === citationExportListId);
      this.assert(!!dashList, 'New citation export list should appear in dashboard');
      this.assert(dashList.citationCount === 1, 'Dashboard should show one citation in the list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Create an in-site notification alert for new Ponzi scheme working papers
  testTask4_PonziSavedSearchAlertFlow() {
    const testName = 'Task 4: Ponzi schemes saved search alert flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Run a search matching the desired alert configuration
      const query = 'Ponzi scheme';
      const filters = {
        publicationType: 'working_paper',
        yearFrom: 2010
      };
      const sortBy = 'relevance';

      const searchResult = this.logic.searchPublications(query, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Publication search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one Ponzi-related working paper');

      // Sanity-check filters on first result
      const first = searchResult.results[0];
      this.assert(first.publicationType === 'working_paper', 'Returned publication should be a working paper');
      this.assert(first.publicationYear >= 2010, 'Returned publication should have year >= 2010');

      // 2) Create saved search alert based on this configuration
      const alertName = 'Ponzi Schemes 2010+';
      const notificationType = 'in_site';
      const notificationFrequency = 'weekly';

      const alert = this.logic.createSavedSearchAlert(
        alertName,
        'publications',
        query,
        filters,
        sortBy,
        notificationType,
        notificationFrequency
      );

      this.assert(alert && alert.id, 'createSavedSearchAlert should return alert with id');
      this.assert(alert.name === alertName, 'Alert name should match input');
      this.assert(alert.search_scope === 'publications' || alert.searchScope === 'publications', 'Alert search scope should be publications');

      const alertId = alert.id;

      // 3) Verify alert summary and basic settings
      const alertsSummary = this.logic.getSavedSearchAlertsSummary();
      this.assert(Array.isArray(alertsSummary), 'getSavedSearchAlertsSummary should return array');

      const summaryItem = alertsSummary.find(a => a.savedSearchAlertId === alertId || a.id === alertId);
      this.assert(!!summaryItem, 'Created alert should appear in alerts summary');

      const freq = summaryItem.notificationFrequency || summaryItem.notification_frequency;
      const notifType = summaryItem.notificationType || summaryItem.notification_type;
      this.assert(freq === 'weekly', 'Notification frequency should be weekly');
      this.assert(notifType === 'in_site', 'Notification type should be in_site');

      // 4) Manually run the alert and verify results
      const runResult = this.logic.runSavedSearchAlert(alertId, 1, 20);
      this.assert(runResult && runResult.searchScope === 'publications', 'runSavedSearchAlert should run in publications scope');
      this.assert(typeof runResult.totalResults === 'number', 'runSavedSearchAlert should return totalResults');
      this.assert(Array.isArray(runResult.publications), 'runSavedSearchAlert should include publications array');
      this.assert(runResult.publications.length >= 1, 'Alert run should return at least one publication');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Follow two money laundering experts with at least 5 publications each
  // Adapted: Follow two money-laundering-related authors, ensuring at least one has >=5 publications.
  testTask5_FollowMoneyLaunderingExpertsFlow() {
    const testName = 'Task 5: Follow money laundering experts flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search authors by topic "money laundering"
      const query = 'money laundering';
      const filters = { topic: 'money laundering' };
      const sortBy = 'publications_desc';

      const searchResult = this.logic.searchAuthors(query, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Author search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one money laundering author');

      const candidates = searchResult.results.filter(a => Array.isArray(a.topics) && a.topics.indexOf('money laundering') !== -1);
      this.assert(candidates.length >= 1, 'At least one author should have topic money laundering');

      const highPubAuthors = candidates.filter(a => a.totalPublications >= 5);
      const otherAuthors = candidates.filter(a => a.totalPublications < 5);

      const authorsToFollow = [];
      for (let i = 0; i < highPubAuthors.length && authorsToFollow.length < 2; i++) {
        authorsToFollow.push(highPubAuthors[i]);
      }
      for (let i = 0; i < otherAuthors.length && authorsToFollow.length < 2; i++) {
        authorsToFollow.push(otherAuthors[i]);
      }

      this.assert(authorsToFollow.length >= 2, 'Should have at least two authors to follow (from available data)');
      this.assert(highPubAuthors.length >= 1, 'There should be at least one high-publication money laundering expert');

      // 2) For each chosen author, open profile and then follow
      const followedIds = [];

      for (let i = 0; i < 2; i++) {
        const authorSummary = authorsToFollow[i];
        const authorId = authorSummary.authorId;
        this.assert(authorId, 'Author search result should include authorId');

        const profile = this.logic.getAuthorProfile(authorId);
        this.assert(profile && profile.author && profile.author.id === authorId, 'getAuthorProfile should return author with matching id');

        // Follow the author
        const followed = this.logic.followAuthor(authorId);
        const isFollowedFlag = followed.is_followed || followed.isFollowed;
        this.assert(isFollowedFlag === true, 'Author should be marked as followed');

        followedIds.push(authorId);
      }

      this.assert(followedIds.length === 2, 'Exactly two authors should have been followed');

      // 3) Verify followed authors summary
      const followedSummary = this.logic.getFollowedAuthorsSummary();
      this.assert(Array.isArray(followedSummary), 'getFollowedAuthorsSummary should return array');
      this.assert(followedSummary.length >= 2, 'There should be at least two followed authors in summary');

      followedIds.forEach(id => {
        const author = followedSummary.find(a => a.id === id || a.authorId === id);
        this.assert(!!author, 'Followed author ' + id + ' should appear in summary');
        const isFollowed = author.is_followed || author.isFollowed;
        this.assert(isFollowed === true, 'Followed author should have is_followed=true');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Create a collection of 4 recent open-access financial statement fraud detection articles
  // Adapted: Use open-access cryptocurrency fraud working papers from available data.
  testTask6_ArticleCollectionFlow() {
    const testName = 'Task 6: Article collection for open-access fraud papers flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search for open-access English publications on cryptocurrency fraud (2018+)
      const query = 'cryptocurrency fraud';
      const filters = {
        yearFrom: 2018,
        yearTo: 2025,
        accessType: 'open_access',
        languageCode: 'en'
      };
      const sortBy = 'publication_date_newest';

      const searchResult = this.logic.searchPublications(query, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Publication search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one open-access English fraud publication');

      const selectedPubs = searchResult.results.slice(0, 4);
      this.assert(selectedPubs.length >= 1, 'Should select at least one publication for collection');

      // 2) Create new article collection
      const collectionName = 'FS Fraud Detection 20182023';
      const collection = this.logic.createArticleCollection(collectionName, 'Auto-created by tests');
      this.assert(collection && collection.id, 'createArticleCollection should return collection with id');
      const collectionId = collection.id;

      // 3) Add selected publications to collection
      selectedPubs.forEach(pub => {
        this.assert(pub.publicationId, 'Search result should include publicationId');
        const addResult = this.logic.addPublicationToCollection(pub.publicationId, collectionId);
        this.assert(addResult && addResult.articleCollectionItem, 'addPublicationToCollection should return articleCollectionItem');
        this.assert(addResult.articleCollection && addResult.articleCollection.id === collectionId, 'addPublicationToCollection should return updated collection');
      });

      // 4) Verify collection detail
      const collectionDetail = this.logic.getArticleCollectionDetail(collectionId);
      this.assert(collectionDetail && Array.isArray(collectionDetail.items), 'getArticleCollectionDetail should return items array');
      this.assert(collectionDetail.items.length === selectedPubs.length, 'Collection should contain exactly ' + selectedPubs.length + ' items');

      // Verify each selected publication is present and is open access with full text
      selectedPubs.forEach(pub => {
        const item = collectionDetail.items.find(it => it.publication && it.publication.publicationId === pub.publicationId);
        this.assert(!!item, 'Collection should contain publication ' + pub.publicationId);
        const p = item.publication;
        this.assert(p.hasFullText === true, 'Collection item publication should have full text');
        this.assert(p.isOpenAccess === true, 'Collection item publication should be open access');
      });

      // Cross-check via dashboard summary
      const dashboard = this.logic.getUserDashboardSummary();
      this.assert(Array.isArray(dashboard.articleCollections), 'Dashboard should include articleCollections summary');
      const dashCollection = dashboard.articleCollections.find(c => c.articleCollectionId === collectionId);
      this.assert(!!dashCollection, 'New collection should appear in dashboard');
      this.assert(dashCollection.itemCount === selectedPubs.length, 'Dashboard should report correct number of items in collection');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Bookmark a retracted LIBOR manipulation article and tag it for case study use
  // Adapted: Bookmark a fraud-related article and tag it "case study".
  testTask7_BookmarkCaseStudyFlow() {
    const testName = 'Task 7: Bookmark fraud article as case study flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search for a fraud-related publication (no retracted LIBOR data available)
      const query = 'cryptocurrency fraud';
      const filters = {
        publicationStatus: 'normal'
      };
      const sortBy = 'publication_date_newest';

      const searchResult = this.logic.searchPublications(query, filters, sortBy);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Publication search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one fraud-related publication');

      const first = searchResult.results[0];
      const publicationId = first.publicationId;
      this.assert(publicationId, 'First result should have publicationId');

      // 2) Bookmark the publication with tag "case study"
      const tags = ['case study'];
      const bookmark = this.logic.createBookmark(publicationId, tags, 'Auto-bookmarked for case study');
      this.assert(bookmark && bookmark.id, 'createBookmark should return bookmark with id');
      this.assert(Array.isArray(bookmark.tags) || Array.isArray(bookmark.tags), 'Bookmark should have tags array');

      // 3) Verify bookmark via getBookmarks filtered by tag
      const bookmarksList = this.logic.getBookmarks({ tag: 'case study' });
      this.assert(Array.isArray(bookmarksList), 'getBookmarks should return array');
      this.assert(bookmarksList.length >= 1, 'There should be at least one bookmark with tag case study');

      const found = bookmarksList.find(entry => entry.publication && entry.publication.publicationId === publicationId);
      this.assert(!!found, 'Bookmarked publication should appear in getBookmarks results');

      const entryTags = (found.bookmark && found.bookmark.tags) || [];
      this.assert(entryTags.indexOf('case study') !== -1, 'Bookmark should include tag "case study"');

      // 4) Cross-check bookmark state via publication detail
      const pubDetail = this.logic.getPublicationDetail(publicationId);
      this.assert(pubDetail && pubDetail.userState, 'getPublicationDetail should include userState');
      this.assert(pubDetail.userState.isBookmarked === true, 'Publication userState should indicate it is bookmarked');
      if (Array.isArray(pubDetail.userState.bookmarkTags)) {
        this.assert(pubDetail.userState.bookmarkTags.indexOf('case study') !== -1, 'Publication userState should include case study tag');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Add a European financial crime conference with fee under $500 to planner
  testTask8_ConferencePlannerFlow() {
    const testName = 'Task 8: European financial crime conference planner flow';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // 1) Search events: financial crime in Europe, Sep-Dec 2025, max fee 500
      const query = 'financial crime';
      const filters = {
        region: 'europe',
        startDateFrom: '2025-09-01',
        startDateTo: '2025-12-31',
        maxRegistrationFee: 500
      };
      const sortBy = 'start_date_earliest';

      const eventSearch = this.logic.searchEvents(query, filters, sortBy);
      this.assert(eventSearch && Array.isArray(eventSearch.results), 'Event search should return results array');
      this.assert(eventSearch.results.length >= 1, 'Should find at least one qualifying European financial crime conference');

      const eventSummary = eventSearch.results[0];
      const eventId = eventSummary.eventId;
      this.assert(eventId, 'Event summary should include eventId');
      this.assert(eventSummary.region === 'europe', 'Event should be in Europe');
      this.assert(eventSummary.registrationFee <= 500, 'Event registration fee should be <= 500');

      // 2) Get event detail
      const eventDetail = this.logic.getEventDetail(eventId);
      this.assert(eventDetail && eventDetail.id === eventId, 'getEventDetail should return event with matching id');
      this.assert(eventDetail.region === 'europe', 'Event detail region should be Europe');
      this.assert(eventDetail.registration_fee <= 500, 'Event detail registration fee should be <= 500');

      // 3) Add event to planner
      const plannerEntry = this.logic.addEventToPlanner(eventId);
      this.assert(plannerEntry && plannerEntry.id, 'addEventToPlanner should return planner entry with id');
      this.assert(plannerEntry.event_id === eventId || plannerEntry.eventId === eventId, 'Planner entry should reference correct event');
      const status = plannerEntry.status;
      this.assert(status === 'planned', 'Planner entry status should be planned');

      const plannerEntryId = plannerEntry.id;

      // 4) Verify planner entries list
      const plannerEntries = this.logic.getPlannerEntries();
      this.assert(Array.isArray(plannerEntries), 'getPlannerEntries should return array');
      this.assert(plannerEntries.length >= 1, 'There should be at least one planner entry');

      const found = plannerEntries.find(pe => pe.plannerEntry && (pe.plannerEntry.id === plannerEntryId));
      this.assert(!!found, 'New planner entry should appear in planner entries list');
      this.assert(found.event && found.event.id === eventId, 'Planner entry should reference correct event in detail');

      // 5) Cross-check via dashboard summary upcomingPlannerEntries
      const dashboard = this.logic.getUserDashboardSummary();
      this.assert(Array.isArray(dashboard.upcomingPlannerEntries), 'Dashboard should include upcomingPlannerEntries');
      const dashEntry = dashboard.upcomingPlannerEntries.find(e => e.eventId === eventId);
      this.assert(!!dashEntry, 'Conference should appear in upcoming planner entries on dashboard');

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
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
