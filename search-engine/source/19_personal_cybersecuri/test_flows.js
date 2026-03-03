// Test runner for business logic flows for all tasks
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
    // Reinitialize storage structure via business logic helper
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      categories: [
        {
          id: 'beginner',
          name: 'Beginner',
          description: 'Introductory cybersecurity content, focusing on fundamentals like Wi-Fi security, password hygiene, and safe browsing for newcomers.',
          sort_order: 1
        },
        {
          id: 'threats',
          name: 'Threats',
          description: 'Articles covering real-world threats such as phishing, malware, scams, and threat intelligence breakdowns.',
          sort_order: 2
        },
        {
          id: 'tools',
          name: 'Tools',
          description: 'Guides, walkthroughs, and reviews of security tools including VPNs, password managers, OSINT utilities, and more.',
          sort_order: 3
        }
      ],
      collections: [
        {
          id: 'reading_list_default',
          name: 'Reading List',
          description: 'Your default reading list for bookmarked articles across the site.',
          is_default_reading_list: true,
          created_at: '2023-01-15T10:00:00Z'
        },
        {
          id: 'practice_later',
          name: 'Practice Later',
          description: 'Guides, labs, and write-ups you want to come back to for hands-on practice.',
          is_default_reading_list: false,
          created_at: '2023-03-02T14:30:00Z'
        },
        {
          id: 'research',
          name: 'Research',
          description: 'Deeper analysis pieces, tool comparisons, and long-form articles you’re researching.',
          is_default_reading_list: false,
          created_at: '2023-05-20T09:15:00Z'
        }
      ],
      feedback_reasons: [
        {
          id: 'reason_very_helpful',
          code: 'very_helpful',
          label: 'Very helpful',
          description: 'The article was clear, accurate, and directly useful.'
        },
        {
          id: 'reason_clear_but_missing_examples',
          code: 'clear_but_missing_examples',
          label: 'Clear but missing examples',
          description: 'Concepts were explained well but needed more concrete examples or demos.'
        },
        {
          id: 'reason_too_short',
          code: 'too_short',
          label: 'Too short',
          description: 'The article ended too quickly or skipped important details.'
        }
      ],
      notification_settings: [
        {
          id: 'notif_osint',
          topic: 'osint',
          display_name: 'OSINT',
          delivery_type: 'email',
          frequency: 'daily',
          created_at: '2023-02-10T08:00:00Z',
          updated_at: '2023-02-10T08:00:00Z'
        },
        {
          id: 'notif_malware',
          topic: 'malware',
          display_name: 'Malware',
          delivery_type: 'email',
          frequency: 'daily',
          created_at: '2023-02-10T08:05:00Z',
          updated_at: '2023-02-10T08:05:00Z'
        },
        {
          id: 'notif_wifi_security',
          topic: 'wifi_security',
          display_name: 'Wi-Fi Security',
          delivery_type: 'on_site_alerts',
          frequency: 'instant',
          created_at: '2023-02-11T09:10:00Z',
          updated_at: '2023-02-11T09:10:00Z'
        }
      ],
      tags: [
        {
          id: 'tag_wifi_security',
          slug: 'wifi_security',
          name: 'Wi-Fi Security',
          description: 'Securing home and public Wi-Fi networks, routers, and wireless traffic.',
          created_at: '2023-01-05T09:00:00Z'
        },
        {
          id: 'tag_phishing',
          slug: 'phishing',
          name: 'Phishing',
          description: 'Detecting and defending against phishing emails, websites, and scams.',
          created_at: '2023-01-06T10:15:00Z'
        },
        {
          id: 'tag_osint',
          slug: 'osint',
          name: 'OSINT',
          description: 'Open-source intelligence techniques, tools, and workflows.',
          created_at: '2023-01-07T11:20:00Z'
        }
      ],
      article_feedback: [],
      series: [
        {
          id: 'web_app_pentest',
          title: 'Web App Penetration Testing',
          slug: 'web-app-penetration-testing',
          description: 'A step-by-step series that walks you through building a Web App penetration testing workflow, from prerequisites and lab setup to exploiting common vulnerabilities and reporting findings.',
          topic: 'web_application_security',
          created_at: '2023-04-10T09:00:00Z',
          updated_at: '2025-11-15T12:30:00Z',
          total_parts: 4,
          estimated_total_time_minutes: 90.0,
          popularity_score: 0.0
        },
        {
          id: 'wifi_security_basics',
          title: 'Wi-Fi Security from Zero to Secure',
          slug: 'wifi-security-from-zero-to-secure',
          description: 'Beginner-friendly series covering home router hardening, WPA2/WPA3 basics, guest networks, and defending against common Wi-Fi attacks.',
          topic: 'network_security',
          created_at: '2023-06-05T10:15:00Z',
          updated_at: '2024-09-21T16:45:00Z',
          total_parts: 0,
          estimated_total_time_minutes: 0.0,
          popularity_score: 0.0
        },
        {
          id: 'osint_for_beginners',
          title: 'OSINT for Beginners',
          slug: 'osint-for-beginners',
          description: 'An introductory OSINT series focused on safe collection, documentation, and analysis techniques using free tools and browser workflows.',
          topic: 'osint',
          created_at: '2022-11-20T14:00:00Z',
          updated_at: '2025-03-02T18:20:00Z',
          total_parts: 0,
          estimated_total_time_minutes: 0.0,
          popularity_score: 0.0
        }
      ],
      articles: [
        {
          id: 'art_wifi_home_lockdown',
          title: 'Lock Down Your Home WiFi in 10 Minutes (Beginner Guide)',
          slug: 'lock-down-home-wifi-10-minutes-beginner',
          category_id: 'beginner',
          content_type: 'guides_how_tos',
          summary: 'Step-by-step checklist to secure your home router, change default passwords, and enable strong WiFi encryption in under 10 minutes.',
          content_html: '# Lock Down Your Home Wi\u0011Fi in 10 Minutes\n\nSecuring your home Wi\u0011Fi is one of the highest\u0011impact things you can do as a beginner.\n\n## Steps\n\n1. **Change the default admin password** on your router.\n2. **Enable WPA2 or WPA3** and disable WEP.\n3. **Update router firmware** to the latest version.\n4. **Turn off WPS** if you don\'t need it.\n\n## Next steps\n\nIf you want to go deeper, check out the follow\u0011up guides linked at the end of this article.',
          published_at: '2025-06-01T10:00:00Z',
          updated_at: '2025-06-01T10:00:00Z',
          reading_time_minutes: 7,
          upvotes: 34,
          difficulty: 'beginner',
          reading_status: 'not_started',
          comment_count: 0,
          rating_count: 0,
          average_rating: null
        },
        {
          id: 'art_wifi_public_checklist',
          title: 'Beginner’s Checklist for Staying Safe on Public WiFi',
          slug: 'beginners-checklist-safe-public-wifi',
          category_id: 'beginner',
          content_type: 'articles',
          summary: 'A beginner-friendly checklist to keep your accounts and data safe when using coffee shop and airport WiFi networks.',
          content_html: '# Beginner’s Checklist for Staying Safe on Public Wi\u0011Fi\n\nPublic Wi\u0011Fi is convenient, but it comes with real risks.\n\n## Key rules\n\n- Avoid logging into sensitive accounts.\n- Prefer **HTTPS** sites.\n- Use a **VPN** if you have one.\n\n## Quick actions\n\nRun through this checklist before you connect to any open network.',
          published_at: '2024-11-02T09:30:00Z',
          updated_at: '2024-11-02T09:30:00Z',
          reading_time_minutes: 5,
          upvotes: 27,
          difficulty: 'beginner',
          reading_status: 'not_started',
          comment_count: 0,
          rating_count: 0,
          average_rating: null
        },
        {
          id: 'art_wifi_quick_wins',
          title: '5 Quick Wins to Upgrade Your WiFi Security Today',
          slug: '5-quick-wins-upgrade-wifi-security',
          category_id: 'beginner',
          content_type: 'articles',
          summary: 'Five simple WiFi security tweaks any beginner can apply in under an hour, with screenshots and clear explanations.',
          content_html: '# 5 Quick Wins to Upgrade Your Wi\u0011Fi Security Today\n\nYou don’t need to be a hacker to make your Wi\u0011Fi harder to attack.\n\n## Quick wins\n\n1. Rename your SSID to something non\u0011identifying.\n2. Use a **unique, strong Wi\u0011Fi password**.\n3. Separate guest devices onto a guest network.\n4. Disable remote administration.\n5. Schedule regular firmware checks.',
          published_at: '2023-08-15T15:45:00Z',
          updated_at: '2023-08-15T15:45:00Z',
          reading_time_minutes: 6,
          upvotes: 19,
          difficulty: 'beginner',
          reading_status: 'not_started',
          comment_count: 0,
          rating_count: 0,
          average_rating: null
        }
      ],
      article_comments: [
        {
          id: 'cmt_001',
          article_id: 'art_vpn_setup_beginners',
          content: 'This was the first VPN guide that didn’t confuse me, great screenshots and pacing.',
          created_at: '2024-04-13T09:15:00Z',
          updated_at: '2024-04-13T09:15:00Z',
          is_deleted: false,
          upvotes: 5
        },
        {
          id: 'cmt_002',
          article_id: 'art_vpn_setup_beginners',
          content: 'Followed this on both my laptop and phone and everything worked exactly as described.',
          created_at: '2024-04-15T18:40:00Z',
          updated_at: '2024-04-15T18:40:00Z',
          is_deleted: false,
          upvotes: 3
        },
        {
          id: 'cmt_003',
          article_id: 'art_vpn_setup_beginners',
          content: 'Really appreciated the explanation of what a VPN does before diving into steps.',
          created_at: '2024-05-02T12:05:00Z',
          updated_at: '2024-05-02T12:05:00Z',
          is_deleted: false,
          upvotes: 2
        }
      ],
      article_tags: [
        {
          id: 'at_001',
          article_id: 'art_wifi_home_lockdown',
          tag_id: 'tag_wifi_security'
        },
        {
          id: 'at_002',
          article_id: 'art_wifi_public_checklist',
          tag_id: 'tag_wifi_security'
        },
        {
          id: 'at_003',
          article_id: 'art_wifi_quick_wins',
          tag_id: 'tag_wifi_security'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:18:39.706628'
      }
    };

    // Persist to localStorage using storage keys from mapping
    localStorage.setItem('categories', JSON.stringify(generatedData.categories));
    localStorage.setItem('collections', JSON.stringify(generatedData.collections));
    localStorage.setItem('feedback_reasons', JSON.stringify(generatedData.feedback_reasons));
    localStorage.setItem('notification_settings', JSON.stringify(generatedData.notification_settings));
    localStorage.setItem('tags', JSON.stringify(generatedData.tags));
    localStorage.setItem('series', JSON.stringify(generatedData.series));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('article_tags', JSON.stringify(generatedData.article_tags));
    localStorage.setItem('article_comments', JSON.stringify(generatedData.article_comments));
    localStorage.setItem('article_feedback', JSON.stringify(generatedData.article_feedback));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
    // Other storages are initialized empty by _initStorage (e.g., collection_items, article_feedback_reason_selections)
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveThreeRecentWifiArticlesToReadingList();
    this.testTask2_BookmarkMostCommentedSearchResultToPracticeLater();
    this.testTask3_SaveArticleWithMostToolsToResearch();
    this.testTask4_CommentOnShortPopularWifiArticleAndCopyLink();
    this.testTask5_ConfigureNotificationSettings();
    this.testTask6_CreateWeekendPracticeAndMarkInProgress();
    this.testTask7_OpenFirstPartsOfWebAppPentestSeries();
    this.testTask8_RateTopBeginnerArticleAndSubmitFeedback();

    return this.results;
  }

  // Task 1: Save three recent beginner Wi-Fi security articles under 8 minutes to Reading List
  testTask1_SaveThreeRecentWifiArticlesToReadingList() {
    const testName = 'Task 1: Save three recent beginner Wi-Fi security articles to Reading List';
    console.log('Testing:', testName);

    try {
      // Step: navigate to homepage
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent != null, 'Home content should be returned');

      // Step: main navigation categories
      const categories = this.logic.getCategoriesForNavigation();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Categories should be available');
      const beginnerCategory = categories.find(c => c.id === 'beginner');
      this.assert(beginnerCategory, 'Beginner category should exist');

      // Step: get category filter options for Beginner
      const beginnerFilters = this.logic.getCategoryFilterOptions('beginner');
      this.assert(beginnerFilters && Array.isArray(beginnerFilters.availableTags), 'Beginner filters should include tags');
      const wifiTag = beginnerFilters.availableTags.find(t => t.slug === 'wifi_security');
      this.assert(wifiTag, 'Wi-Fi Security tag should be available for Beginner');

      // Step: list Beginner articles tagged Wi-Fi Security, from 2023-01-01, reading time <= 8, newest first
      const dateFrom = '2023-01-01';
      const dateTo = null;
      const readingTimeMax = 8;
      const difficulty = null;
      const minUpvotes = null;
      const challengeYearFrom = null;
      const challengeYearTo = null;
      const sort = 'newest_first';
      const page = 1;
      const pageSize = 10;

      const listResult = this.logic.getCategoryArticles(
        'beginner',
        ['wifi_security'],
        dateFrom,
        dateTo,
        readingTimeMax,
        difficulty,
        minUpvotes,
        challengeYearFrom,
        challengeYearTo,
        sort,
        page,
        pageSize
      );

      this.assert(listResult && Array.isArray(listResult.articles), 'Category articles should be returned');
      this.assert(listResult.articles.length >= 3, 'Should have at least three matching Wi-Fi articles');

      const firstThree = listResult.articles.slice(0, 3);

      // Verify filter constraints using actual data
      firstThree.forEach(a => {
        this.assert(a.readingTimeMinutes <= 8, 'Article reading time should be <= 8 minutes');
        this.assert(new Date(a.publishedAt) >= new Date(dateFrom), 'Article should be published on or after dateFrom');
        const hasWifiTag = (a.tags || []).some(t => t.slug === 'wifi_security');
        this.assert(hasWifiTag, 'Article should have Wi-Fi Security tag');
      });

      // Step: bookmark first three articles to default Reading List
      const bookmarkedArticleIds = [];
      let readingListCollectionId = null;

      firstThree.forEach(article => {
        const toggleResult = this.logic.toggleBookmarkDefaultReadingList(article.articleId);
        this.assert(toggleResult && toggleResult.success === true, 'Bookmarking should succeed');
        this.assert(toggleResult.isBookmarked === true, 'Article should be bookmarked');
        this.assert(toggleResult.collectionId, 'Bookmark response should include collectionId');
        readingListCollectionId = toggleResult.collectionId;
        bookmarkedArticleIds.push(article.articleId);
      });

      // Step: open Reading List page
      const readingList = this.logic.getReadingListArticles();
      this.assert(readingList && readingList.collectionId, 'Reading List should be returned');
      this.assert(readingList.collectionId === readingListCollectionId, 'Reading List collectionId should match bookmark response');
      this.assert(Array.isArray(readingList.items), 'Reading List items should be an array');

      bookmarkedArticleIds.forEach(id => {
        const item = readingList.items.find(i => i.articleId === id);
        this.assert(item, 'Reading List should contain bookmarked article ' + id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Search Wi-Fi content, compare top two by comments, bookmark the one with more comments into Practice Later
  testTask2_BookmarkMostCommentedSearchResultToPracticeLater() {
    const testName = 'Task 2: Bookmark search result with more comments into Practice Later';
    console.log('Testing:', testName);

    try {
      // Start from homepage
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent != null, 'Home content should be returned');

      // Get search filter options
      const searchFilters = this.logic.getSearchFilterOptions();
      this.assert(searchFilters && Array.isArray(searchFilters.contentTypeOptions), 'Search filter options should be available');

      // Search for Wi-Fi content (adapted from VPN setup to available data)
      const query = 'Wi-Fi';
      const contentTypes = ['guides_how_tos', 'articles'];
      const tagSlugs = null;
      const sort = 'most_commented';
      const page = 1;
      const pageSize = 10;

      const searchResult = this.logic.searchArticles(query, contentTypes, tagSlugs, sort, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be returned');
      this.assert(searchResult.results.length >= 2, 'Search should return at least two results');

      const first = searchResult.results[0];
      const second = searchResult.results[1];

      // Use actual comment counts from results
      const firstComments = typeof first.commentCount === 'number' ? first.commentCount : 0;
      const secondComments = typeof second.commentCount === 'number' ? second.commentCount : 0;

      // Identify article with more (or equal) comments
      const winner = secondComments > firstComments ? second : first;

      // Optionally verify via article details that comment counts are consistent
      const winnerDetails = this.logic.getArticleDetails(winner.articleId);
      this.assert(winnerDetails && typeof winnerDetails.commentCount === 'number', 'Winner article details should include comment count');

      // Find Practice Later collection dynamically
      const collectionsOverview = this.logic.getCollectionsOverview();
      this.assert(Array.isArray(collectionsOverview), 'Collections overview should be available');
      const practiceCollection = collectionsOverview.find(c => c.name === 'Practice Later');
      this.assert(practiceCollection, 'Practice Later collection should exist');

      // Bookmark the winner into Practice Later
      const addResult = this.logic.addArticleToCollection(winner.articleId, practiceCollection.collectionId);
      this.assert(addResult && addResult.success === true, 'Adding article to Practice Later should succeed');
      this.assert(addResult.collectionId === practiceCollection.collectionId, 'addArticleToCollection should return correct collectionId');

      // Verify article is now in Practice Later
      const practiceItems = this.logic.getCollectionItems(practiceCollection.collectionId);
      this.assert(practiceItems && Array.isArray(practiceItems.items), 'Practice Later items should be returned');
      const saved = practiceItems.items.find(i => i.articleId === winner.articleId);
      this.assert(saved, 'Winner article should be present in Practice Later collection');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3 (adapted): Use search, compare recommendedTools counts, save max to Research
  testTask3_SaveArticleWithMostToolsToResearch() {
    const testName = 'Task 3: Save article with most recommended tools to Research collection';
    console.log('Testing:', testName);

    try {
      // Search for Wi-Fi content (adapted from password manager reviews)
      const query = 'Wi-Fi';
      const contentTypes = ['guides_how_tos', 'articles'];
      const tagSlugs = null;
      const sort = 'relevance';
      const page = 1;
      const pageSize = 10;

      const searchResult = this.logic.searchArticles(query, contentTypes, tagSlugs, sort, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be returned');
      this.assert(searchResult.results.length >= 1, 'Search should return at least one result');

      const selected = searchResult.results.slice(0, 3);

      // For each selected article, inspect recommendedTools from details
      let bestArticleId = null;
      let bestToolCount = -1;

      selected.forEach(r => {
        const details = this.logic.getArticleDetails(r.articleId);
        this.assert(details != null, 'Article details should be returned');
        const tools = Array.isArray(details.recommendedTools) ? details.recommendedTools : [];
        const count = tools.length;
        if (count > bestToolCount) {
          bestToolCount = count;
          bestArticleId = r.articleId;
        }
      });

      this.assert(bestArticleId != null, 'There should be a best article by recommended tools count');

      // Find Research collection dynamically
      const collectionsOverview = this.logic.getCollectionsOverview();
      this.assert(Array.isArray(collectionsOverview), 'Collections overview should be available');
      const researchCollection = collectionsOverview.find(c => c.name === 'Research');
      this.assert(researchCollection, 'Research collection should exist');

      // Add winning article to Research
      const addResult = this.logic.addArticleToCollection(bestArticleId, researchCollection.collectionId);
      this.assert(addResult && addResult.success === true, 'Adding article to Research should succeed');

      // Verify via collection items
      const researchItems = this.logic.getCollectionItems(researchCollection.collectionId);
      this.assert(researchItems && Array.isArray(researchItems.items), 'Research collection items should be returned');
      const saved = researchItems.items.find(i => i.articleId === bestArticleId);
      this.assert(saved, 'Best article should be present in Research collection');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4 (adapted): Filter Wi-Fi articles, open shortest with enough upvotes, copy link, post comment
  testTask4_CommentOnShortPopularWifiArticleAndCopyLink() {
    const testName = 'Task 4: Comment on short, popular Wi-Fi article and copy its link';
    console.log('Testing:', testName);

    try {
      // Use Beginner category (adapted from Threats/Phishing to available Wi-Fi data)
      const categories = this.logic.getCategoriesForNavigation();
      this.assert(Array.isArray(categories), 'Categories should be available');
      const beginnerCategory = categories.find(c => c.id === 'beginner');
      this.assert(beginnerCategory, 'Beginner category should exist');

      const filters = this.logic.getCategoryFilterOptions('beginner');
      this.assert(filters && Array.isArray(filters.availableTags), 'Beginner filters should be available');
      const wifiTag = filters.availableTags.find(t => t.slug === 'wifi_security');
      this.assert(wifiTag, 'Wi-Fi Security tag should exist');

      // Filter: Wi-Fi Security, reading time <= 10, min upvotes 10, sort by shortest_reading_time
      const dateFrom = null;
      const dateTo = null;
      const readingTimeMax = 10;
      const difficulty = null;
      const minUpvotes = 10;
      const challengeYearFrom = null;
      const challengeYearTo = null;
      const sort = 'shortest_reading_time';
      const page = 1;
      const pageSize = 10;

      const listResult = this.logic.getCategoryArticles(
        'beginner',
        ['wifi_security'],
        dateFrom,
        dateTo,
        readingTimeMax,
        difficulty,
        minUpvotes,
        challengeYearFrom,
        challengeYearTo,
        sort,
        page,
        pageSize
      );

      this.assert(listResult && Array.isArray(listResult.articles), 'Filtered articles should be returned');
      this.assert(listResult.articles.length > 0, 'There should be at least one matching article');

      const article = listResult.articles[0];
      const articleId = article.articleId;

      // Copy article link via share toolbar
      const copyResult = this.logic.copyArticleLinkToClipboard(articleId);
      this.assert(copyResult && copyResult.success === true, 'Copying article link should succeed');

      // Post a comment of at least 15 characters
      const commentContent = 'Really helpful Wi-Fi article!';
      this.assert(commentContent.length >= 15, 'Comment content should meet minimum length requirement');

      const postResult = this.logic.postArticleComment(articleId, commentContent);
      this.assert(postResult && postResult.success === true, 'Posting comment should succeed');
      this.assert(postResult.comment && postResult.comment.commentId, 'Posted comment should have an ID');
      const newCount = postResult.newTotalCommentCount;

      // Verify comments list reflects new comment and updated count
      const commentsPage = this.logic.getArticleComments(articleId, 1, 20);
      this.assert(commentsPage && Array.isArray(commentsPage.comments), 'Comments should be returned');
      this.assert(typeof commentsPage.totalCount === 'number', 'Comments totalCount should be a number');
      this.assert(commentsPage.totalCount === newCount, 'Comments totalCount should match newTotalCommentCount');
      const found = commentsPage.comments.find(c => c.content === commentContent && c.isDeleted === false);
      this.assert(found, 'Newly posted comment should appear in comments list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Configure weekly on-site OSINT notifications and disable Malware notifications
  testTask5_ConfigureNotificationSettings() {
    const testName = 'Task 5: Configure OSINT weekly on-site and disable Malware notifications';
    console.log('Testing:', testName);

    try {
      // Log in with provided account
      const loginResult = this.logic.login('testuser', 'Password123!');
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isAuthenticated === true, 'User should be authenticated after login');

      // Retrieve current notification settings
      const currentSettings = this.logic.getNotificationSettings();
      this.assert(Array.isArray(currentSettings) && currentSettings.length > 0, 'Notification settings should be returned');

      const osintSetting = currentSettings.find(s => s.topic === 'osint');
      const malwareSetting = currentSettings.find(s => s.topic === 'malware');
      this.assert(osintSetting, 'OSINT notification setting should exist');
      this.assert(malwareSetting, 'Malware notification setting should exist');

      // Prepare updated settings
      const updatedSettingsPayload = [
        {
          topic: 'osint',
          deliveryType: 'on_site_alerts',
          frequency: 'weekly'
        },
        {
          topic: 'malware',
          deliveryType: 'disabled',
          frequency: 'none'
        }
      ];

      const updateResult = this.logic.updateNotificationSettings(updatedSettingsPayload);
      this.assert(updateResult && updateResult.success === true, 'Updating notification settings should succeed');
      this.assert(Array.isArray(updateResult.updatedSettings), 'Updated settings should be returned');

      const updatedOsint = updateResult.updatedSettings.find(s => s.topic === 'osint');
      const updatedMalware = updateResult.updatedSettings.find(s => s.topic === 'malware');
      this.assert(updatedOsint, 'Updated OSINT setting should be present in response');
      this.assert(updatedMalware, 'Updated Malware setting should be present in response');

      this.assert(updatedOsint.delivery_type === 'on_site_alerts', 'OSINT delivery_type should be on_site_alerts');
      this.assert(updatedOsint.frequency === 'weekly', 'OSINT frequency should be weekly');
      this.assert(updatedMalware.delivery_type === 'disabled', 'Malware delivery_type should be disabled');
      this.assert(updatedMalware.frequency === 'none', 'Malware frequency should be none');

      // Re-fetch settings from storage to verify persistence
      const newSettings = this.logic.getNotificationSettings();
      const persistedOsint = newSettings.find(s => s.topic === 'osint');
      const persistedMalware = newSettings.find(s => s.topic === 'malware');
      this.assert(persistedOsint.delivery_type === 'on_site_alerts', 'Persisted OSINT delivery_type should be on_site_alerts');
      this.assert(persistedOsint.frequency === 'weekly', 'Persisted OSINT frequency should be weekly');
      this.assert(persistedMalware.delivery_type === 'disabled', 'Persisted Malware delivery_type should be disabled');
      this.assert(persistedMalware.frequency === 'none', 'Persisted Malware frequency should be none');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6 (adapted): Filter beginner articles, create Weekend Practice collection, mark article In progress
  testTask6_CreateWeekendPracticeAndMarkInProgress() {
    const testName = 'Task 6: Add filtered article to Weekend Practice and mark In progress';
    console.log('Testing:', testName);

    try {
      // Use Beginner category (adapted from CTF & Practice / intermediate CTF write-ups)
      const categories = this.logic.getCategoriesForNavigation();
      this.assert(Array.isArray(categories), 'Categories should be available');
      const beginnerCategory = categories.find(c => c.id === 'beginner');
      this.assert(beginnerCategory, 'Beginner category should exist');

      const filters = this.logic.getCategoryFilterOptions('beginner');
      this.assert(filters, 'Beginner filter options should be available');

      // Filter: beginner difficulty, date range 2023-01-01 to 2026-12-31, min upvotes 5, newest first
      const dateFrom = '2023-01-01';
      const dateTo = '2026-12-31';
      const readingTimeMax = null;
      const difficulty = 'beginner';
      const minUpvotes = 5;
      const challengeYearFrom = null;
      const challengeYearTo = null;
      const sort = 'newest_first';
      const page = 1;
      const pageSize = 10;

      const listResult = this.logic.getCategoryArticles(
        'beginner',
        null,
        dateFrom,
        dateTo,
        readingTimeMax,
        difficulty,
        minUpvotes,
        challengeYearFrom,
        challengeYearTo,
        sort,
        page,
        pageSize
      );

      this.assert(listResult && Array.isArray(listResult.articles), 'Filtered Beginner articles should be returned');
      this.assert(listResult.articles.length > 0, 'There should be at least one matching article');

      const newestArticle = listResult.articles[0];
      const articleId = newestArticle.articleId;

      // Create new collection "Weekend Practice" and add article in one step
      const createResult = this.logic.createCollectionAndAddArticle(
        articleId,
        'Weekend Practice',
        'Weekend practice articles derived from Beginner content.'
      );
      this.assert(createResult && createResult.success === true, 'Creating Weekend Practice collection should succeed');
      this.assert(createResult.collection && createResult.collection.collectionId, 'New collection should have an ID');
      this.assert(createResult.articleAdded === true, 'Article should be added to the new collection');

      const weekendCollectionId = createResult.collection.collectionId;

      // Verify new collection appears in overview
      const collectionsOverview = this.logic.getCollectionsOverview();
      this.assert(Array.isArray(collectionsOverview), 'Collections overview should be returned');
      const weekendCollection = collectionsOverview.find(c => c.collectionId === weekendCollectionId);
      this.assert(weekendCollection && weekendCollection.name === 'Weekend Practice', 'Weekend Practice collection should be listed in overview');

      // Verify article is in Weekend Practice collection
      const weekendItems = this.logic.getCollectionItems(weekendCollectionId);
      this.assert(weekendItems && Array.isArray(weekendItems.items), 'Weekend Practice items should be returned');
      const saved = weekendItems.items.find(i => i.articleId === articleId);
      this.assert(saved, 'Selected article should be in Weekend Practice collection');

      // Set reading status to In progress
      const statusResult = this.logic.setArticleReadingStatus(articleId, 'in_progress');
      this.assert(statusResult && statusResult.success === true, 'Setting reading status should succeed');
      this.assert(statusResult.readingStatus === 'in_progress', 'Reading status should be in_progress');

      // Verify reading status via article details
      const details = this.logic.getArticleDetails(articleId);
      this.assert(details && details.readingStatus === 'in_progress', 'Article details should reflect in_progress reading status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Open the first parts of Web App Penetration Testing series
  testTask7_OpenFirstPartsOfWebAppPentestSeries() {
    const testName = 'Task 7: Open first parts of Web App Penetration Testing series';
    console.log('Testing:', testName);

    try {
      // Navigate to Series page: get filter options
      const seriesFilters = this.logic.getSeriesFilterOptions();
      this.assert(seriesFilters && Array.isArray(seriesFilters.topicOptions), 'Series topic options should be available');

      // Filter by Web Application Security topic and sort by most_popular
      const topic = 'web_application_security';
      const sort = 'most_popular';
      const page = 1;
      const pageSize = 10;

      const seriesListResult = this.logic.getSeriesList(topic, sort, page, pageSize);
      this.assert(seriesListResult && Array.isArray(seriesListResult.series), 'Series list should be returned');
      this.assert(seriesListResult.series.length > 0, 'At least one series should be available for Web Application Security');

      const webAppSeries = seriesListResult.series.find(s => s.title.indexOf('Web App Penetration Testing') !== -1);
      this.assert(webAppSeries, 'Web App Penetration Testing series should be in the list');

      // Get series details (overview + ordered list of parts)
      const seriesDetails = this.logic.getSeriesDetails(webAppSeries.id);
      this.assert(seriesDetails && Array.isArray(seriesDetails.parts), 'Series details should include parts');
      this.assert(seriesDetails.parts.length > 0, 'Series should have at least one part');

      // Determine how many parts to test (up to 4, or whatever is available)
      const partsToOpen = seriesDetails.parts
        .slice()
        .sort((a, b) => a.seriesPartNumber - b.seriesPartNumber)
        .slice(0, 4);

      this.assert(partsToOpen.length > 0, 'There should be at least one part to open');

      // "Open" each part by fetching article details
      partsToOpen.forEach(part => {
        const partDetails = this.logic.getArticleDetails(part.articleId);
        this.assert(partDetails && partDetails.articleId === part.articleId, 'Series part article details should be retrievable');
      });

      // Specifically simulate opening Part 1 and "scrolling" to prerequisites by at least loading content
      const part1 = partsToOpen[0];
      const part1Details = this.logic.getArticleDetails(part1.articleId);
      this.assert(part1Details && typeof part1Details.contentHtml === 'string', 'Part 1 content should be available');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Rate a top Beginner article 4 stars and submit detailed feedback
  testTask8_RateTopBeginnerArticleAndSubmitFeedback() {
    const testName = 'Task 8: Rate top Beginner article 4 stars and submit feedback';
    console.log('Testing:', testName);

    try {
      // Use Beginner category instead of Tools (adapted to available data)
      const filters = this.logic.getCategoryFilterOptions('beginner');
      this.assert(filters, 'Beginner category filters should be available');

      const dateFrom = null;
      const dateTo = null;
      const readingTimeMax = null;
      const difficulty = null;
      const minUpvotes = null;
      const challengeYearFrom = null;
      const challengeYearTo = null;
      const sort = 'highest_rated';
      const page = 1;
      const pageSize = 10;

      const listResult = this.logic.getCategoryArticles(
        'beginner',
        null,
        dateFrom,
        dateTo,
        readingTimeMax,
        difficulty,
        minUpvotes,
        challengeYearFrom,
        challengeYearTo,
        sort,
        page,
        pageSize
      );

      this.assert(listResult && Array.isArray(listResult.articles), 'Beginner articles list should be returned');
      this.assert(listResult.articles.length > 0, 'There should be at least one Beginner article to rate');

      const topArticle = listResult.articles[0];
      const articleId = topArticle.articleId;

      const articleDetailsBefore = this.logic.getArticleDetails(articleId);
      this.assert(articleDetailsBefore, 'Article details should be available before feedback');
      const prevRatingCount = typeof articleDetailsBefore.ratingCount === 'number' ? articleDetailsBefore.ratingCount : 0;

      // Get predefined feedback reasons
      const reasons = this.logic.getFeedbackReasons();
      this.assert(Array.isArray(reasons) && reasons.length >= 2, 'There should be at least two feedback reasons');

      const reasonCodes = [reasons[0].code, reasons[1].code];

      // Submit 4-star feedback with at least 20 characters of text
      const ratingStars = 4;
      const comment = 'Very useful article, but I would love to see more real-world examples.';
      this.assert(comment.length >= 20, 'Feedback comment should be at least 20 characters');

      const feedbackResult = this.logic.submitArticleFeedback(articleId, ratingStars, reasonCodes, comment);
      this.assert(feedbackResult && feedbackResult.success === true, 'Submitting article feedback should succeed');
      this.assert(feedbackResult.feedbackId, 'Feedback result should include feedbackId');

      // Verify rating aggregates updated on article
      const articleDetailsAfter = this.logic.getArticleDetails(articleId);
      this.assert(articleDetailsAfter, 'Article details should be available after feedback');
      this.assert(typeof articleDetailsAfter.ratingCount === 'number', 'ratingCount should be a number');
      this.assert(articleDetailsAfter.ratingCount === prevRatingCount + 1 || articleDetailsAfter.ratingCount > prevRatingCount,
        'ratingCount should increase after feedback');
      if (typeof articleDetailsAfter.averageRating === 'number') {
        this.assert(articleDetailsAfter.averageRating >= 1 && articleDetailsAfter.averageRating <= 5,
          'averageRating should be between 1 and 5');
      }

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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
