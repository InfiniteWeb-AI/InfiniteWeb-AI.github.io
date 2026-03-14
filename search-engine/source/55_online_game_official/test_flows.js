class TestRunner {
  constructor(businessLogic) {
    // Polyfill localStorage for Node.js
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
    localStorage.clear();
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data (as provided)
    const generatedData = {
      articles: [
        {
          id: 'article_pc_patch_221',
          title: 'PC Patch Notes 2.2.1 - March 1, 2026',
          contentType: 'patch_notes',
          summary: 'Detailed notes for PC Patch 2.2.1, focusing on stability fixes, minor balance tweaks, and quality-of-life improvements released on March 1, 2026.',
          body: 'PC Patch 2.2.1 introduces a series of targeted fixes aimed at improving overall stability and responsiveness. Key highlights include crash fixes in large-scale battles, improved matchmaking responsiveness, and minor balance adjustments to several underperforming abilities.\n\nBalance Changes:\n- Adjusted damage falloff for several ranged weapons.\n- Tuned cooldowns for high-impact support abilities.\n\nBug Fixes:\n- Resolved an issue causing occasional disconnects when joining parties.\n- Fixed UI overlaps at 4K resolutions.\n\nQuality of Life:\n- Added additional keybinding presets for new players.\n\nFor the full list of changes, review the sections below.',
          publishDate: '2026-03-01T10:00:00Z',
          lastUpdatedAt: '2026-03-01T12:00:00Z',
          platform: 'pc',
          region: 'global',
          tags: ['patch_notes', 'pc', 'stability', 'bug_fixes'],
          isTournamentAnnouncement: false,
          views: 54000,
          estimatedReadingTimeMinutes: 8,
          audienceLevel: 'all_players',
          versionLabel: '2.2.1',
          versionMajor: 2,
          versionMinor: 2,
          versionPatch: 1,
          isFeatured: true,
          createdAt: '2026-03-01T09:30:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          commentCount: 0,
          ratingCount: 0,
          averageRating: 0
        },
        {
          id: 'article_pc_patch_220',
          title: 'PC Patch Notes 2.2.0 - February 22, 2026',
          contentType: 'patch_notes',
          summary: 'PC Patch 2.2.0 delivers new UI features, matchmaking improvements, and groundwork for upcoming seasonal content.',
          body: 'Patch 2.2.0 for PC introduces foundational systems in preparation for the upcoming season. Players will notice updated UI in the lobby, improved match queue estimates, and preliminary balance changes to crowd-control abilities.\n\nHighlights:\n- New seasonal UI elements in the home hub.\n- Improved matchmaking estimates based on role preferences.\n- Initial tuning of crowd-control durations.\n\nThese changes pave the way for larger content drops later in March.',
          publishDate: '2026-02-22T14:00:00Z',
          lastUpdatedAt: '2026-02-22T16:15:00Z',
          platform: 'pc',
          region: 'global',
          tags: ['patch_notes', 'pc', 'seasonal_prep'],
          isTournamentAnnouncement: false,
          views: 42000,
          estimatedReadingTimeMinutes: 9,
          audienceLevel: 'all_players',
          versionLabel: '2.2.0',
          versionMajor: 2,
          versionMinor: 2,
          versionPatch: 0,
          isFeatured: false,
          createdAt: '2026-02-22T13:30:00Z',
          updatedAt: '2026-02-22T16:15:00Z',
          commentCount: 0,
          ratingCount: 0,
          averageRating: 0
        },
        {
          id: 'article_patch_215',
          title: 'Update 2.1.5 - Cross-Platform Stability Patch',
          contentType: 'patch_notes',
          summary: 'Cross-platform Patch 2.1.5 focuses on crash fixes, performance boosts on all platforms, and networking improvements.',
          body: 'Update 2.1.5 is a cross-platform release addressing several high-impact stability issues reported over the last month. This patch includes optimizations to memory usage, better handling of high ping situations, and fixes for rare progression rollbacks.\n\nKey Fixes:\n- Reduced instances of memory-related crashes on extended play sessions.\n- Improved netcode for players connecting from high-latency regions.\n- Fixed edge cases where progression would not be saved after disconnects.\n\nWe recommend all players update to 2.1.5 before participating in ranked play.',
          publishDate: '2026-02-05T09:00:00Z',
          lastUpdatedAt: '2026-02-05T11:30:00Z',
          platform: 'cross_platform',
          region: 'global',
          tags: ['patch_notes', 'stability', 'cross_platform'],
          isTournamentAnnouncement: false,
          views: 61000,
          estimatedReadingTimeMinutes: 7,
          audienceLevel: 'all_players',
          versionLabel: '2.1.5',
          versionMajor: 2,
          versionMinor: 1,
          versionPatch: 5,
          isFeatured: false,
          createdAt: '2026-02-05T08:30:00Z',
          updatedAt: '2026-02-05T11:30:00Z',
          commentCount: 0,
          ratingCount: 0,
          averageRating: 0
        }
      ],
      article_comments: [
        {
          id: 'comment_0001',
          articleId: 'article_balance_210',
          content: 'This balance patch looks huge. Really interested to see how the tank changes impact coordinated play.',
          createdAt: '2026-02-25T19:05:00Z',
          authorDisplayName: 'CompQueueMain',
          isDeleted: false
        },
        {
          id: 'comment_0002',
          articleId: 'article_balance_205',
          content: 'Appreciate the quick follow-up after 2.0.0. The AoE nerfs were definitely needed.',
          createdAt: '2026-02-10T13:10:00Z',
          authorDisplayName: 'PatchWatcher',
          isDeleted: false
        },
        {
          id: 'comment_0003',
          articleId: 'article_tournament_global_championship_2025',
          content: '24-team format sounds amazing. Hoping my region gets a wildcard slot this year.',
          createdAt: '2025-06-11T12:45:00Z',
          authorDisplayName: 'EsportsFanNA',
          isDeleted: false
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:10:57.795776'
      }
    };

    // Extra test data to support all flows (esports, dev blogs, guides, update announcements, balance patches)
    const extraArticles = [];

    // Esports tournament announcements for 2025
    extraArticles.push(
      {
        id: 'article_esports_tournament_2025_1',
        title: '2025 Spring Invitational Tournament Announcement',
        contentType: 'esports',
        summary: 'Details for the 2025 Spring Invitational Tournament.',
        body: 'Spring Invitational details...',
        publishDate: '2025-02-15T10:00:00Z',
        lastUpdatedAt: '2025-02-15T10:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['esports', 'tournament'],
        esportsCategoryId: 'tournaments',
        isTournamentAnnouncement: true,
        views: 100000,
        estimatedReadingTimeMinutes: 6,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2025-02-10T10:00:00Z',
        updatedAt: '2025-02-15T10:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      },
      {
        id: 'article_esports_tournament_2025_2',
        title: '2025 Summer Championship Tournament Announcement',
        contentType: 'esports',
        summary: 'Details for the 2025 Summer Championship Tournament.',
        body: 'Summer Championship details...',
        publishDate: '2025-06-01T12:00:00Z',
        lastUpdatedAt: '2025-06-01T12:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['esports', 'tournament'],
        esportsCategoryId: 'tournaments',
        isTournamentAnnouncement: true,
        views: 200000,
        estimatedReadingTimeMinutes: 7,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: true,
        createdAt: '2025-05-25T12:00:00Z',
        updatedAt: '2025-06-01T12:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      },
      {
        id: 'article_esports_tournament_2025_3',
        title: '2025 World Finals Tournament Announcement',
        contentType: 'esports',
        summary: 'Details for the 2025 World Finals Tournament.',
        body: 'World Finals details...',
        publishDate: '2025-10-10T15:00:00Z',
        lastUpdatedAt: '2025-10-10T15:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['esports', 'tournament'],
        esportsCategoryId: 'tournaments',
        isTournamentAnnouncement: true,
        views: 300000,
        estimatedReadingTimeMinutes: 8,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: true,
        createdAt: '2025-10-01T15:00:00Z',
        updatedAt: '2025-10-10T15:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      }
    );

    // Dev blog roadmap posts (last 6 months)
    extraArticles.push(
      {
        id: 'article_dev_roadmap_2025_q4',
        title: 'Developer Roadmap - Q4 2025 Preview',
        contentType: 'dev_blog',
        summary: 'Roadmap for Q4 2025.',
        body: 'Q4 2025 roadmap...',
        publishDate: '2025-11-15T09:00:00Z',
        lastUpdatedAt: '2025-11-15T09:00:00Z',
        platform: null,
        region: 'global',
        tags: ['roadmap', 'dev_diary'],
        isTournamentAnnouncement: false,
        views: 25000,
        estimatedReadingTimeMinutes: 10,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2025-11-10T09:00:00Z',
        updatedAt: '2025-11-15T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 4.2
      },
      {
        id: 'article_dev_roadmap_2026_q1',
        title: 'Developer Roadmap - Q1 2026 Goals',
        contentType: 'dev_blog',
        summary: 'Roadmap for Q1 2026.',
        body: 'Q1 2026 roadmap...',
        publishDate: '2026-01-10T09:00:00Z',
        lastUpdatedAt: '2026-01-10T09:00:00Z',
        platform: null,
        region: 'global',
        tags: ['roadmap', 'dev_diary'],
        isTournamentAnnouncement: false,
        views: 30000,
        estimatedReadingTimeMinutes: 11,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2026-01-05T09:00:00Z',
        updatedAt: '2026-01-10T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 4.4
      },
      {
        id: 'article_dev_roadmap_2026_midyear',
        title: 'Developer Roadmap - Mid-2026 Update',
        contentType: 'dev_blog',
        summary: 'Mid-year roadmap update for 2026.',
        body: 'Mid-2026 roadmap...',
        publishDate: '2026-03-01T09:00:00Z',
        lastUpdatedAt: '2026-03-01T09:00:00Z',
        platform: null,
        region: 'global',
        tags: ['roadmap', 'dev_diary'],
        isTournamentAnnouncement: false,
        views: 35000,
        estimatedReadingTimeMinutes: 12,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: true,
        createdAt: '2026-02-25T09:00:00Z',
        updatedAt: '2026-03-01T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 4.6
      }
    );

    // Guides for beginners/new players
    extraArticles.push(
      {
        id: 'article_guide_beginner_1',
        title: 'Beginner Guide: Getting Started',
        contentType: 'guide',
        summary: 'A comprehensive beginner guide.',
        body: 'Beginner guide content...',
        publishDate: '2025-12-01T10:00:00Z',
        lastUpdatedAt: '2025-12-01T10:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['guide', 'beginner'],
        isTournamentAnnouncement: false,
        views: 80000,
        estimatedReadingTimeMinutes: 12,
        audienceLevel: 'beginner',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: true,
        createdAt: '2025-11-25T10:00:00Z',
        updatedAt: '2025-12-01T10:00:00Z',
        commentCount: 0,
        ratingCount: 100,
        averageRating: 4.8
      },
      {
        id: 'article_guide_beginner_2',
        title: 'Beginner Guide: Combat Basics',
        contentType: 'guide',
        summary: 'Combat basics for new players.',
        body: 'Combat basics content...',
        publishDate: '2026-01-05T11:00:00Z',
        lastUpdatedAt: '2026-01-05T11:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['guide', 'beginner'],
        isTournamentAnnouncement: false,
        views: 70000,
        estimatedReadingTimeMinutes: 15,
        audienceLevel: 'beginner',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2025-12-30T11:00:00Z',
        updatedAt: '2026-01-05T11:00:00Z',
        commentCount: 0,
        ratingCount: 80,
        averageRating: 4.7
      },
      {
        id: 'article_guide_beginner_3',
        title: 'Beginner Guide: Team Play and Strategy',
        contentType: 'guide',
        summary: 'Team play tips for new players.',
        body: 'Team play content...',
        publishDate: '2026-02-01T12:00:00Z',
        lastUpdatedAt: '2026-02-01T12:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['guide', 'beginner'],
        isTournamentAnnouncement: false,
        views: 60000,
        estimatedReadingTimeMinutes: 20,
        audienceLevel: 'beginner',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2026-01-25T12:00:00Z',
        updatedAt: '2026-02-01T12:00:00Z',
        commentCount: 0,
        ratingCount: 60,
        averageRating: 4.9
      }
    );

    // Shadow Siege European update announcements
    extraArticles.push(
      {
        id: 'article_update_shadow_siege_eu_1',
        title: 'Shadow Siege Update - Europe Announcement (Wave 1)',
        contentType: 'update_announcement',
        summary: 'First Shadow Siege update announcement for Europe.',
        body: 'Shadow Siege EU Wave 1 details...',
        publishDate: '2025-07-01T09:00:00Z',
        lastUpdatedAt: '2025-07-01T09:00:00Z',
        platform: 'pc',
        region: 'europe',
        tags: ['shadow_siege', 'update'],
        isTournamentAnnouncement: false,
        views: 90000,
        estimatedReadingTimeMinutes: 6,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2025-06-25T09:00:00Z',
        updatedAt: '2025-07-01T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      },
      {
        id: 'article_update_shadow_siege_eu_2',
        title: 'Shadow Siege Update - Europe Announcement (Wave 2)',
        contentType: 'update_announcement',
        summary: 'Second Shadow Siege update announcement for Europe.',
        body: 'Shadow Siege EU Wave 2 details...',
        publishDate: '2025-07-10T09:00:00Z',
        lastUpdatedAt: '2025-07-10T09:00:00Z',
        platform: 'pc',
        region: 'europe',
        tags: ['shadow_siege', 'update'],
        isTournamentAnnouncement: false,
        views: 95000,
        estimatedReadingTimeMinutes: 7,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: false,
        createdAt: '2025-07-05T09:00:00Z',
        updatedAt: '2025-07-10T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      },
      {
        id: 'article_update_shadow_siege_eu_3',
        title: 'Shadow Siege Update - Europe Announcement (Launch)',
        contentType: 'update_announcement',
        summary: 'Launch Shadow Siege update announcement for Europe.',
        body: 'Shadow Siege EU Launch details...',
        publishDate: '2025-07-20T09:00:00Z',
        lastUpdatedAt: '2025-07-20T09:00:00Z',
        platform: 'pc',
        region: 'europe',
        tags: ['shadow_siege', 'update'],
        isTournamentAnnouncement: false,
        views: 120000,
        estimatedReadingTimeMinutes: 8,
        audienceLevel: 'all_players',
        versionLabel: null,
        versionMajor: null,
        versionMinor: null,
        versionPatch: null,
        isFeatured: true,
        createdAt: '2025-07-15T09:00:00Z',
        updatedAt: '2025-07-20T09:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      }
    );

    // Balance patch articles with version numbers
    extraArticles.push(
      {
        id: 'article_balance_135',
        title: 'Update 1.3.5 - Balance Patch',
        contentType: 'patch_notes',
        summary: 'Balance changes for version 1.3.5.',
        body: 'Balance patch 1.3.5 details...',
        publishDate: '2025-12-15T10:00:00Z',
        lastUpdatedAt: '2025-12-15T10:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['balance_patch'],
        isTournamentAnnouncement: false,
        views: 50000,
        estimatedReadingTimeMinutes: 6,
        audienceLevel: 'all_players',
        versionLabel: '1.3.5',
        versionMajor: 1,
        versionMinor: 3,
        versionPatch: 5,
        isFeatured: false,
        createdAt: '2025-12-10T10:00:00Z',
        updatedAt: '2025-12-15T10:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      },
      {
        id: 'article_balance_140',
        title: 'Update 1.4.0 - Balance Patch',
        contentType: 'patch_notes',
        summary: 'Balance changes for version 1.4.0.',
        body: 'Balance patch 1.4.0 details...',
        publishDate: '2026-01-20T10:00:00Z',
        lastUpdatedAt: '2026-01-20T10:00:00Z',
        platform: 'pc',
        region: 'global',
        tags: ['balance_patch'],
        isTournamentAnnouncement: false,
        views: 60000,
        estimatedReadingTimeMinutes: 7,
        audienceLevel: 'all_players',
        versionLabel: '1.4.0',
        versionMajor: 1,
        versionMinor: 4,
        versionPatch: 0,
        isFeatured: true,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
        commentCount: 0,
        ratingCount: 0,
        averageRating: 0
      }
    );

    const baseArticles = generatedData.articles || [];
    const allArticles = baseArticles.concat(extraArticles);

    // Use storage keys from mapping
    localStorage.setItem('articles', JSON.stringify(allArticles));
    localStorage.setItem('article_comments', JSON.stringify(generatedData.article_comments || []));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookmarkRecentPcPatchNotes();
    this.testTask2_SubscribeWeeklyPatchNotesAndEsports();
    this.testTask3_SaveTop3MostViewed2025TournamentsToFavorites();
    this.testTask4_CommentOnHigherVersionBalancePatch();
    this.testTask5_ConfigureNotificationsServerStatusAndMaintenanceOnly();
    this.testTask6_CreateRoadmapReadingCollection();
    this.testTask7_BookmarkEarliestShadowSiegeEuropeanAnnouncement();
    this.testTask8_CreateNewPlayersCollectionFromGuides();

    return this.results;
  }

  // Task 1: Bookmark the most recent PC patch notes released in the last 14 days
  testTask1_BookmarkRecentPcPatchNotes() {
    const testName = 'Task 1 - Bookmark most recent PC patch notes (last 14 days)';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate landing on homepage and reading user summary
      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights && Array.isArray(homeHighlights.patchNotes), 'Home highlights should include patchNotes');

      const summaryBefore = this.logic.getUserContentSummary();
      const beforeReadingCount = summaryBefore && typeof summaryBefore.readingListCount === 'number'
        ? summaryBefore.readingListCount
        : 0;

      // Get filter options (platform/date/sort)
      const patchFilterOptions = this.logic.getPatchNotesFilterOptions();
      this.assert(patchFilterOptions && Array.isArray(patchFilterOptions.platformOptions), 'Patch filter options should load');

      // List patch notes for PC, last 14 days, newest first
      const filters = { platform: 'pc', datePreset: 'last_14_days' };
      const listResult = this.logic.getPatchNotesList(filters, 'newest_first', 1, 20);
      this.assert(listResult && Array.isArray(listResult.items), 'Patch notes list should return items array');
      this.assert(listResult.items.length > 0, 'Should have at least one PC patch note in last 14 days');

      const patchIdsInFilter = listResult.items.map(function (i) { return i.id; });
      const firstItem = listResult.items[0];
      const articleId = firstItem.id;

      // Open article details
      const detailsBefore = this.logic.getArticleDetails(articleId);
      this.assert(detailsBefore && detailsBefore.article, 'Article details should be returned');
      this.assert(detailsBefore.article.platform === 'pc', 'Selected article should be PC patch notes');
      this.assert(detailsBefore.isInReadingList === false, 'Article should not initially be in reading list');

      // Add to reading list
      const bookmarkResult = this.logic.setArticleReadingListStatus(articleId, true);
      this.assert(bookmarkResult && bookmarkResult.inReadingList === true, 'Bookmark operation should mark article as in reading list');

      const detailsAfter = this.logic.getArticleDetails(articleId);
      this.assert(detailsAfter.isInReadingList === true, 'Article details should reflect inReadingList = true');

      // Open reading list and verify exactly one qualifying article from the filtered set
      const readingList = this.logic.getReadingListItems('date_added_newest', 'patch_notes');
      this.assert(readingList && Array.isArray(readingList.items), 'Reading list items should be returned');

      const qualifyingItems = readingList.items.filter(function (item) {
        return patchIdsInFilter.indexOf(item.article.id) !== -1 && item.article.id === articleId;
      });
      this.assert(qualifyingItems.length === 1, 'Exactly one filtered PC patch note should be in reading list');

      // Simulate navigating back to article via reading list
      const reopenedArticleId = qualifyingItems[0].article.id;
      const reopenedDetails = this.logic.getArticleDetails(reopenedArticleId);
      this.assert(reopenedDetails.article.id === articleId, 'Reopened article should match bookmarked article');
      this.assert(reopenedDetails.isInReadingList === true, 'Reopened article should still be marked in reading list');

      const summaryAfter = this.logic.getUserContentSummary();
      const afterReadingCount = summaryAfter && typeof summaryAfter.readingListCount === 'number'
        ? summaryAfter.readingListCount
        : 0;
      this.assert(afterReadingCount === beforeReadingCount + 1, 'Reading list count should increase by 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Subscribe to weekly email updates for Patch Notes and Esports
  testTask2_SubscribeWeeklyPatchNotesAndEsports() {
    const testName = 'Task 2 - Subscribe weekly newsletter for Patch Notes and Esports';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigating to newsletter preferences
      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights, 'Home highlights should load before navigating to newsletter');

      const initialPrefsResult = this.logic.getNewsletterPreferences();
      const initialPrefs = initialPrefsResult ? initialPrefsResult.preferences : null;

      const email = 'player@example.com';
      const frequency = 'weekly';
      const topicsInput = {
        patchNotes: true,
        esports: true,
        promotions: false,
        communityStories: false,
        guides: false,
        devBlog: false,
        serverStatus: false,
        maintenance: false
      };
      const region = 'north_america';
      const isSubscribed = true;

      const updateResult = this.logic.updateNewsletterPreferences(
        email,
        frequency,
        topicsInput,
        region,
        isSubscribed
      );

      this.assert(updateResult && updateResult.preferences, 'Updated newsletter preferences should be returned');
      const updatedPrefs = updateResult.preferences;

      this.assert(updatedPrefs.email === email, 'Email should match input');
      this.assert(updatedPrefs.frequency === frequency, 'Frequency should match input');
      this.assert(updatedPrefs.region === region, 'Region should match input');
      this.assert(updatedPrefs.isSubscribed === isSubscribed, 'isSubscribed should match input');

      this.assert(updatedPrefs.topicPatchNotesEnabled === true, 'Patch notes topic should be enabled');
      this.assert(updatedPrefs.topicEsportsEnabled === true, 'Esports topic should be enabled');
      if (typeof updatedPrefs.topicPromotionsEnabled === 'boolean') {
        this.assert(updatedPrefs.topicPromotionsEnabled === false, 'Promotions topic should be disabled');
      }
      if (typeof updatedPrefs.topicCommunityStoriesEnabled === 'boolean') {
        this.assert(updatedPrefs.topicCommunityStoriesEnabled === false, 'Community stories topic should be disabled');
      }

      // Re-read preferences to confirm persistence
      const rereadResult = this.logic.getNewsletterPreferences();
      const rereadPrefs = rereadResult ? rereadResult.preferences : null;
      this.assert(rereadPrefs && rereadPrefs.email === email, 'Reread preferences should persist email');
      this.assert(rereadPrefs.frequency === frequency, 'Reread preferences should persist frequency');

      // User summary should reflect subscription
      const summaryAfter = this.logic.getUserContentSummary();
      this.assert(typeof summaryAfter.newsletterSubscribed === 'boolean', 'Summary should include newsletterSubscribed');
      this.assert(summaryAfter.newsletterSubscribed === true, 'User should be marked as subscribed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Save the top 3 most-viewed 2025 esports tournament announcements to favorites
  testTask3_SaveTop3MostViewed2025TournamentsToFavorites() {
    const testName = 'Task 3 - Favorite top 3 most-viewed 2025 esports tournaments';
    try {
      this.clearStorage();
      this.setupTestData();

      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights && Array.isArray(homeHighlights.esportsNews), 'Home highlights should include esportsNews');

      const summaryBefore = this.logic.getUserContentSummary();
      const beforeFavoritesCount = summaryBefore && typeof summaryBefore.favoritesCount === 'number'
        ? summaryBefore.favoritesCount
        : 0;

      const filterOptions = this.logic.getEsportsFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categoryOptions), 'Esports filter options should load');

      const filters = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        category: 'tournaments',
        isTournamentAnnouncement: true
      };

      const listResult = this.logic.getEsportsNewsList(filters, 'most_viewed', 1, 20);
      this.assert(listResult && Array.isArray(listResult.items), 'Esports news list should return items');
      this.assert(listResult.items.length > 0, 'Should have at least one 2025 esports tournament announcement');

      const tournamentItems = listResult.items.filter(function (item) {
        return /tournament/i.test(item.title || '');
      });
      this.assert(tournamentItems.length > 0, 'At least one tournament item should be present');

      const topItems = tournamentItems.slice(0, 3);
      const selectedIds = topItems.map(function (i) { return i.id; });

      // Favorite each selected article
      for (let i = 0; i < selectedIds.length; i++) {
        const articleId = selectedIds[i];
        const details = this.logic.getArticleDetails(articleId);
        this.assert(details && details.article, 'Article details should load for esports tournament');
        this.assert(details.article.contentType === 'esports', 'Article contentType should be esports');

        const favResult = this.logic.setArticleFavoriteStatus(articleId, true);
        this.assert(favResult && favResult.isFavorite === true, 'Article should be marked as favorite');
      }

      // Open favorites and verify
      const favoritesList = this.logic.getFavoriteItems('date_favorited_newest', 'esports');
      this.assert(favoritesList && Array.isArray(favoritesList.items), 'Favorites list should return items');
      this.assert(favoritesList.items.length >= selectedIds.length, 'Favorites list should contain at least the selected items');

      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        const exists = favoritesList.items.some(function (entry) {
          return entry.article && entry.article.id === id;
        });
        this.assert(exists, 'Favorites should include tournament article ' + id);
      }

      const summaryAfter = this.logic.getUserContentSummary();
      const afterFavoritesCount = summaryAfter && typeof summaryAfter.favoritesCount === 'number'
        ? summaryAfter.favoritesCount
        : 0;
      this.assert(afterFavoritesCount >= beforeFavoritesCount + selectedIds.length,
        'Favorites count should increase by at least number of favorited tournaments');

      // Simulate opening first favorite
      if (favoritesList.items.length > 0) {
        const firstFavId = favoritesList.items[0].article.id;
        const favDetails = this.logic.getArticleDetails(firstFavId);
        this.assert(favDetails && favDetails.article.id === firstFavId, 'Should be able to open first favorite article');
        this.assert(favDetails.isFavorite === true, 'Opened favorite article should be marked isFavorite');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Comment on the balance patch article with the higher version number
  testTask4_CommentOnHigherVersionBalancePatch() {
    const testName = 'Task 4 - Comment on higher-version balance patch article';
    try {
      this.clearStorage();
      this.setupTestData();

      const query = 'balance patch';

      const searchFilterOptions = this.logic.getSearchFilterOptions();
      this.assert(searchFilterOptions && Array.isArray(searchFilterOptions.sortOptions), 'Search filter options should load');

      const searchResult = this.logic.searchArticles(query, undefined, 'newest_first', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.items), 'Search results should return items');

      const itemsWithVersion = searchResult.items.filter(function (item) {
        return item.versionLabel && item.versionLabel.length > 0;
      });
      this.assert(itemsWithVersion.length >= 2, 'Search should return at least two versioned balance patch articles');

      const firstTwo = itemsWithVersion.slice(0, 2);
      const firstId = firstTwo[0].id;
      const secondId = firstTwo[1].id;

      // Open first article then go back
      const firstDetails = this.logic.getArticleDetails(firstId);
      this.assert(firstDetails && firstDetails.article, 'First balance patch article details should load');

      // Open second article
      const secondDetails = this.logic.getArticleDetails(secondId);
      this.assert(secondDetails && secondDetails.article, 'Second balance patch article details should load');

      // Compare version numbers
      const versionValue = function (details) {
        const a = details.article;
        const major = typeof a.versionMajor === 'number' ? a.versionMajor : 0;
        const minor = typeof a.versionMinor === 'number' ? a.versionMinor : 0;
        const patch = typeof a.versionPatch === 'number' ? a.versionPatch : 0;
        return major * 10000 + minor * 100 + patch;
      };

      const v1 = versionValue(firstDetails);
      const v2 = versionValue(secondDetails);

      const targetDetails = v1 >= v2 ? firstDetails : secondDetails;
      const targetId = targetDetails.article.id;

      const commentText = 'Excited to try this higher-version balance patch!';

      // Get existing comments count
      const existingCommentsResult = this.logic.getArticleComments(targetId, 1, 50);
      const existingComments = existingCommentsResult && Array.isArray(existingCommentsResult.comments)
        ? existingCommentsResult.comments
        : [];
      const beforeCount = existingCommentsResult && typeof existingCommentsResult.totalItems === 'number'
        ? existingCommentsResult.totalItems
        : existingComments.length;

      // Post comment
      const postResult = this.logic.postArticleComment(targetId, commentText);
      this.assert(postResult && postResult.success === true, 'Posting comment should succeed');
      this.assert(postResult.comment && postResult.comment.articleId === targetId, 'Returned comment should reference the correct article');
      this.assert(postResult.comment.content === commentText, 'Returned comment content should match input');

      // Verify comments list updated
      const updatedCommentsResult = this.logic.getArticleComments(targetId, 1, 50);
      this.assert(updatedCommentsResult && Array.isArray(updatedCommentsResult.comments), 'Updated comments should be returned');
      const updatedTotal = typeof updatedCommentsResult.totalItems === 'number'
        ? updatedCommentsResult.totalItems
        : updatedCommentsResult.comments.length;
      this.assert(updatedTotal === beforeCount + 1, 'Total comments should increase by 1');

      const newCommentExists = updatedCommentsResult.comments.some(function (c) {
        return c.id === postResult.comment.id && c.content === commentText && c.articleId === targetId;
      });
      this.assert(newCommentExists, 'Newly posted comment should be present in comments list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Configure notifications to only receive server status and maintenance alerts
  testTask5_ConfigureNotificationsServerStatusAndMaintenanceOnly() {
    const testName = 'Task 5 - Configure notification settings (Server Status + Maintenance only)';
    try {
      this.clearStorage();
      this.setupTestData();

      // Open notification settings
      const initialSettingsResult = this.logic.getNotificationSettings();
      const initialSettings = initialSettingsResult ? initialSettingsResult.settings : null;

      const categoriesInput = {
        serverStatusEnabled: true,
        maintenanceEnabled: true,
        promotionalOffersEnabled: false,
        esportsNewsEnabled: false,
        patchNotesEnabled: false,
        communityStoriesEnabled: false,
        guidesEnabled: false
      };

      const deliveryInput = {
        inSiteEnabled: true,
        emailEnabled: false,
        mobilePushEnabled: false
      };

      const quietHoursInput = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00'
      };

      const updateResult = this.logic.updateNotificationSettings(
        categoriesInput,
        deliveryInput,
        quietHoursInput
      );

      this.assert(updateResult && updateResult.settings, 'Updated notification settings should be returned');
      const updated = updateResult.settings;

      this.assert(updated.categoryServerStatusEnabled === true, 'Server Status category should be enabled');
      this.assert(updated.categoryMaintenanceEnabled === true, 'Maintenance category should be enabled');

      if (typeof updated.categoryPromotionalOffersEnabled === 'boolean') {
        this.assert(updated.categoryPromotionalOffersEnabled === false, 'Promotional offers category should be disabled');
      }
      if (typeof updated.categoryEsportsNewsEnabled === 'boolean') {
        this.assert(updated.categoryEsportsNewsEnabled === false, 'Esports news category should be disabled');
      }
      if (typeof updated.categoryPatchNotesEnabled === 'boolean') {
        this.assert(updated.categoryPatchNotesEnabled === false, 'Patch notes category should be disabled');
      }
      if (typeof updated.categoryCommunityStoriesEnabled === 'boolean') {
        this.assert(updated.categoryCommunityStoriesEnabled === false, 'Community stories category should be disabled');
      }
      if (typeof updated.categoryGuidesEnabled === 'boolean') {
        this.assert(updated.categoryGuidesEnabled === false, 'Guides category should be disabled');
      }

      this.assert(updated.deliveryInSiteEnabled === true, 'In-site notifications should be enabled');
      if (typeof updated.deliveryEmailEnabled === 'boolean') {
        this.assert(updated.deliveryEmailEnabled === false, 'Email notifications should be disabled');
      }
      if (typeof updated.deliveryMobilePushEnabled === 'boolean') {
        this.assert(updated.deliveryMobilePushEnabled === false, 'Mobile push notifications should be disabled');
      }

      if (typeof updated.quietHoursEnabled === 'boolean') {
        this.assert(updated.quietHoursEnabled === true, 'Quiet hours should be enabled');
      }
      if (typeof updated.quietHoursStartTime === 'string') {
        this.assert(updated.quietHoursStartTime === quietHoursInput.startTime, 'Quiet hours start time should match input');
      }
      if (typeof updated.quietHoursEndTime === 'string') {
        this.assert(updated.quietHoursEndTime === quietHoursInput.endTime, 'Quiet hours end time should match input');
      }

      // Re-read settings to confirm persistence
      const rereadResult = this.logic.getNotificationSettings();
      const reread = rereadResult ? rereadResult.settings : null;
      this.assert(reread && reread.categoryServerStatusEnabled === true, 'Reread settings must keep Server Status enabled');
      this.assert(reread.categoryMaintenanceEnabled === true, 'Reread settings must keep Maintenance enabled');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Create a reading list of 3 roadmap dev diaries from the last 6 months
  testTask6_CreateRoadmapReadingCollection() {
    const testName = 'Task 6 - Create "Roadmap Reading" collection with 3 dev diaries';
    try {
      this.clearStorage();
      this.setupTestData();

      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights && Array.isArray(homeHighlights.devBlogs), 'Home highlights should include devBlogs');

      const summaryBefore = this.logic.getUserContentSummary();
      const beforeCollectionsCount = summaryBefore && typeof summaryBefore.collectionsCount === 'number'
        ? summaryBefore.collectionsCount
        : 0;

      const filterOptions = this.logic.getDeveloperBlogFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.tagOptions), 'Developer blog filter options should load');

      const filters = {
        tag: 'roadmap',
        datePreset: 'last_6_months'
      };

      const postsResult = this.logic.getDeveloperBlogPosts(filters, 'oldest_first', 1, 20);
      this.assert(postsResult && Array.isArray(postsResult.items), 'Developer blog posts should be returned');
      this.assert(postsResult.items.length >= 3, 'Should have at least 3 roadmap posts in last 6 months');

      const firstThree = postsResult.items.slice(0, 3);
      const articleIds = firstThree.map(function (i) { return i.id; });

      // Create collection with first article
      const collectionName = 'Roadmap Reading';
      const createResult = this.logic.createCollectionAndAddArticle(articleIds[0], collectionName, undefined);
      this.assert(createResult && createResult.collection && createResult.collectionItem, 'Collection and first item should be created');

      const collectionId = createResult.collection.id;

      // Add remaining two articles
      for (let i = 1; i < articleIds.length; i++) {
        const addResult = this.logic.addArticleToCollection(articleIds[i], collectionId);
        this.assert(addResult && addResult.collectionItem && addResult.collectionItem.articleId === articleIds[i],
          'Article ' + articleIds[i] + ' should be added to collection');
      }

      // Verify collection detail
      const detailResult = this.logic.getCollectionDetail(collectionId);
      this.assert(detailResult && detailResult.collection && Array.isArray(detailResult.items), 'Collection detail should load');
      this.assert(detailResult.collection.name === collectionName, 'Collection name should match input');
      this.assert(detailResult.itemCount === 3 || detailResult.items.length === 3,
        'Collection should contain exactly 3 items');

      for (let i = 0; i < articleIds.length; i++) {
        const id = articleIds[i];
        const present = detailResult.items.some(function (entry) {
          return entry.article && entry.article.id === id;
        });
        this.assert(present, 'Collection should include roadmap article ' + id);
      }

      // Collections overview should include new collection
      const overviewResult = this.logic.getCollectionsOverview();
      this.assert(overviewResult && Array.isArray(overviewResult.collections), 'Collections overview should return list');
      const overviewEntry = overviewResult.collections.find(function (c) {
        return c.collection && c.collection.id === collectionId;
      });
      this.assert(overviewEntry && overviewEntry.itemCount >= 3, 'Overview should list the Roadmap Reading collection with items');

      const summaryAfter = this.logic.getUserContentSummary();
      const afterCollectionsCount = summaryAfter && typeof summaryAfter.collectionsCount === 'number'
        ? summaryAfter.collectionsCount
        : 0;
      this.assert(afterCollectionsCount === beforeCollectionsCount + 1, 'Collections count should increase by 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Bookmark the earliest European announcement of the 'Shadow Siege' update
  testTask7_BookmarkEarliestShadowSiegeEuropeanAnnouncement() {
    const testName = 'Task 7 - Bookmark earliest European "Shadow Siege" update announcement';
    try {
      this.clearStorage();
      this.setupTestData();

      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights, 'Home highlights should load before search');

      const summaryBefore = this.logic.getUserContentSummary();
      const beforeReadingCount = summaryBefore && typeof summaryBefore.readingListCount === 'number'
        ? summaryBefore.readingListCount
        : 0;

      const query = 'Shadow Siege';
      const filters = {
        contentTypes: ['update_announcement'],
        region: 'europe'
      };

      const searchResult = this.logic.searchArticles(query, filters, 'oldest_first', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.items), 'Search results for Shadow Siege should return items');
      this.assert(searchResult.items.length > 0, 'At least one European Shadow Siege update announcement should be found');

      const firstAnnouncement = searchResult.items[0];
      const articleId = firstAnnouncement.id;

      const detailsBefore = this.logic.getArticleDetails(articleId);
      this.assert(detailsBefore && detailsBefore.article, 'Announcement article details should load');
      this.assert(detailsBefore.article.region === 'europe', 'Announcement region should be Europe');
      this.assert(detailsBefore.article.contentType === 'update_announcement', 'Announcement contentType should be update_announcement');

      // Bookmark announcement
      const bookmarkResult = this.logic.setArticleReadingListStatus(articleId, true);
      this.assert(bookmarkResult && bookmarkResult.inReadingList === true, 'Announcement should be added to reading list');

      const detailsAfter = this.logic.getArticleDetails(articleId);
      this.assert(detailsAfter.isInReadingList === true, 'Announcement should remain in reading list');

      // Verify in reading list
      const readingList = this.logic.getReadingListItems('date_added_newest', undefined);
      this.assert(readingList && Array.isArray(readingList.items), 'Reading list should return items');

      const savedItem = readingList.items.find(function (entry) {
        return entry.article && entry.article.id === articleId;
      });
      this.assert(!!savedItem, 'Reading list should contain saved Shadow Siege announcement');

      // Simulate opening saved announcement from reading list
      const reopenedId = savedItem.article.id;
      const reopenedDetails = this.logic.getArticleDetails(reopenedId);
      this.assert(reopenedDetails.article.id === articleId, 'Reopened article should match saved announcement');

      const summaryAfter = this.logic.getUserContentSummary();
      const afterReadingCount = summaryAfter && typeof summaryAfter.readingListCount === 'number'
        ? summaryAfter.readingListCount
        : 0;
      this.assert(afterReadingCount === beforeReadingCount + 1, 'Reading list count should increase by 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Add two beginner guides with 10+ minute read time to a 'New Players' collection
  testTask8_CreateNewPlayersCollectionFromGuides() {
    const testName = 'Task 8 - Create "New Players" collection with 2 beginner guides';
    try {
      this.clearStorage();
      this.setupTestData();

      const homeHighlights = this.logic.getHomeHighlights();
      this.assert(homeHighlights && Array.isArray(homeHighlights.guides), 'Home highlights should include guides');

      const summaryBefore = this.logic.getUserContentSummary();
      const beforeCollectionsCount = summaryBefore && typeof summaryBefore.collectionsCount === 'number'
        ? summaryBefore.collectionsCount
        : 0;

      const filterOptions = this.logic.getGuidesFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.audienceOptions), 'Guides filter options should load');

      const filters = {
        audienceLevel: 'beginner',
        minReadingTimeMinutes: 10,
        maxReadingTimeMinutes: 30
      };

      const guidesResult = this.logic.getGuidesList(filters, 'highest_rated', 1, 20);
      this.assert(guidesResult && Array.isArray(guidesResult.items), 'Guides list should be returned');
      this.assert(guidesResult.items.length >= 2, 'Should have at least two beginner guides with 10-30 minute read time');

      const firstTwo = guidesResult.items.slice(0, 2);
      const guideIds = firstTwo.map(function (g) { return g.id; });

      const collectionName = 'New Players';

      // Create collection with first guide
      const createResult = this.logic.createCollectionAndAddArticle(guideIds[0], collectionName, undefined);
      this.assert(createResult && createResult.collection && createResult.collectionItem, 'Collection and first guide should be created');
      const collectionId = createResult.collection.id;

      // Add second guide
      const addResult = this.logic.addArticleToCollection(guideIds[1], collectionId);
      this.assert(addResult && addResult.collectionItem && addResult.collectionItem.articleId === guideIds[1],
        'Second guide should be added to New Players collection');

      // Verify collection detail
      const detailResult = this.logic.getCollectionDetail(collectionId);
      this.assert(detailResult && detailResult.collection && Array.isArray(detailResult.items), 'Collection detail should load');
      this.assert(detailResult.collection.name === collectionName, 'Collection name should match New Players');
      this.assert(detailResult.itemCount >= 2 || detailResult.items.length >= 2,
        'Collection should contain at least 2 guides');

      for (let i = 0; i < guideIds.length; i++) {
        const id = guideIds[i];
        const exists = detailResult.items.some(function (entry) {
          return entry.article && entry.article.id === id;
        });
        this.assert(exists, 'Collection should include guide ' + id);
      }

      // Simulate opening first guide from collection
      const firstGuideEntry = detailResult.items[0];
      const openedGuideId = firstGuideEntry.article.id;
      const guideDetails = this.logic.getArticleDetails(openedGuideId);
      this.assert(guideDetails && guideDetails.article.contentType === 'guide', 'Opened article should be a guide');
      if (typeof guideDetails.article.estimatedReadingTimeMinutes === 'number') {
        this.assert(guideDetails.article.estimatedReadingTimeMinutes >= 10,
          'Opened guide should have at least 10 minutes reading time');
      }

      const summaryAfter = this.logic.getUserContentSummary();
      const afterCollectionsCount = summaryAfter && typeof summaryAfter.collectionsCount === 'number'
        ? summaryAfter.collectionsCount
        : 0;
      this.assert(afterCollectionsCount === beforeCollectionsCount + 1, 'Collections count should increase by 1');

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
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
