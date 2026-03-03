class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data from prompt - used ONLY here to seed storage
    const generatedData = {
      program_polls: [
        {
          id: 'poll_nova_yield_7d_invest',
          program_id: 'nova_yield_7d',
          question: 'Would you consider investing in NovaYield 7D this week?',
          created_at: '2026-03-01T09:15:00Z',
          has_user_voted: false
        },
        {
          id: 'poll_cryptomax_300_confidence',
          program_id: 'cryptomax_300',
          question: 'How confident are you that CryptoMax 300% will keep paying reliably for the next 30 days?',
          created_at: '2026-02-20T16:40:00Z',
          has_user_voted: true,
          user_selected_option_id: 'pollopt_crypto_conf_3'
        },
        {
          id: 'poll_stable_bit_18_reinvest',
          program_id: 'stable_bit_1_8',
          question: 'Will you reinvest your profits from StableBit 1.8% Daily or just withdraw?',
          created_at: '2026-02-10T11:05:00Z',
          has_user_voted: true,
          user_selected_option_id: 'pollopt_stablebit_reinvest_no'
        }
      ],
      poll_options: [
        {
          id: 'pollopt_novayield_yes_small',
          poll_id: 'poll_nova_yield_7d_invest',
          text: 'Yes, with a small test deposit',
          vote_count: 42
        },
        {
          id: 'pollopt_novayield_yes_big',
          poll_id: 'poll_nova_yield_7d_invest',
          text: 'Yes, with a larger deposit',
          vote_count: 18
        },
        {
          id: 'pollopt_novayield_no',
          poll_id: 'poll_nova_yield_7d_invest',
          text: 'No, I will stay away',
          vote_count: 37
        }
      ],
      programs: [
        {
          id: 'nova_yield_7d',
          name: 'NovaYield 7D',
          slug: 'novayield-7d',
          status: 'paying',
          is_problematic: false,
          payment_methods: ['bitcoin', 'usdt', 'ethereum'],
          base_currency: 'usdt',
          min_deposit_base: 10,
          min_deposit_usd: 10,
          daily_roi_percent: 2.4,
          total_return_30d_percent: 72,
          running_days: 5,
          start_date: '2026-02-27T08:00:00Z',
          risk_level: 'medium',
          is_featured: true,
          created_at: '2026-02-26T10:00:00Z',
          updated_at: '2026-03-02T09:30:00Z',
          comment_count: 1,
          payout_rating_value: 5.0,
          has_active_poll: true
        },
        {
          id: 'cryptomax_300',
          name: 'CryptoMax 300%',
          slug: 'cryptomax-300',
          status: 'paying',
          is_problematic: false,
          payment_methods: ['bitcoin', 'usdt', 'litecoin'],
          base_currency: 'usd',
          min_deposit_base: 25,
          min_deposit_usd: 25,
          daily_roi_percent: 10.0,
          total_return_30d_percent: 300,
          running_days: 38,
          start_date: '2026-01-25T10:00:00Z',
          risk_level: 'high',
          is_featured: true,
          created_at: '2026-01-24T12:00:00Z',
          updated_at: '2026-03-02T16:20:00Z',
          comment_count: 3,
          payout_rating_value: 3.6666666666666665,
          has_active_poll: true
        },
        {
          id: 'stable_bit_1_8',
          name: 'StableBit 1.8% Daily',
          slug: 'stablebit-1-8-daily',
          status: 'paying',
          is_problematic: false,
          payment_methods: ['bitcoin', 'usdt', 'perfect_money'],
          base_currency: 'usd',
          min_deposit_base: 20,
          min_deposit_usd: 20,
          daily_roi_percent: 1.8,
          total_return_30d_percent: 54,
          running_days: 63,
          start_date: '2025-12-31T09:00:00Z',
          risk_level: 'low',
          is_featured: false,
          created_at: '2025-12-30T15:00:00Z',
          updated_at: '2026-03-01T11:10:00Z',
          comment_count: 1,
          payout_rating_value: 5.0,
          has_active_poll: true
        }
      ],
      program_plans: [
        {
          id: 'plan_novayield_basic_7d',
          program_id: 'nova_yield_7d',
          name: 'Basic 7-Day Plan',
          plan_type: 'daily_roi',
          daily_roi_percent: 2.4,
          duration_days: 7,
          total_return_percent: 16.8,
          min_deposit: 10,
          max_deposit: 500,
          currency: 'usdt',
          principal_returned: true,
          description: '2.4% daily for 7 days, principal returned at end'
        },
        {
          id: 'plan_novayield_pro_7d',
          program_id: 'nova_yield_7d',
          name: 'Pro 7-Day Plan',
          plan_type: 'daily_roi',
          daily_roi_percent: 2.8,
          duration_days: 7,
          total_return_percent: 19.6,
          min_deposit: 100,
          max_deposit: 5000,
          currency: 'usdt',
          principal_returned: true,
          description: '2.8% daily for 7 days for deposits from $100 to $5,000'
        },
        {
          id: 'plan_cryptomax_300_30d',
          program_id: 'cryptomax_300',
          name: '300% After 30 Days',
          plan_type: 'after_maturity',
          daily_roi_percent: 10.0,
          duration_days: 30,
          total_return_percent: 300,
          min_deposit: 25,
          max_deposit: 10000,
          currency: 'usd',
          principal_returned: false,
          description: '300% after 30 days, principal included in total payout'
        }
      ],
      program_comments: [
        {
          id: 'cmt_cryptomax_001',
          program_id: 'cryptomax_300',
          author_username: 'YieldChaser',
          body: 'First payout received to my BTC wallet in under 3 hours. The 300% after 30 days plan looks insane though, so I\'m keeping my deposit small for now.',
          rating_stars: 4,
          is_review: true,
          created_at: '2026-02-10T13:25:00Z',
          edited_at: '2026-02-10T14:00:00Z'
        },
        {
          id: 'cmt_cryptomax_002',
          program_id: 'cryptomax_300',
          author_username: 'risk_alert',
          body: 'Got two payouts so far, no issues. But with 300% after 30 days this screams classic high-risk HYIP. Don\'t put in anything you can\'t afford to lose.',
          rating_stars: 3,
          is_review: true,
          created_at: '2026-02-18T09:10:00Z'
        },
        {
          id: 'cmt_cryptomax_003',
          program_id: 'cryptomax_300',
          author_username: 'BTCStacker',
          body: 'Withdrawal processed in about 20 minutes today. Support also answered my ticket quickly. Still, I doubt this can sustain 10% daily for long.',
          rating_stars: 4,
          is_review: true,
          created_at: '2026-03-01T17:45:00Z'
        }
      ],
      community_profiles: [
        {
          id: 'profile_yieldchaser',
          username: 'YieldChaser',
          join_date: '2025-06-12T10:15:00Z',
          avatar_url: 'https://www.eliteesthetics.co.za/wp-content/uploads/2021/01/istockphoto-1273297923-612x612-1.jpg',
          bio: 'Chasing yield across crypto HYIPs since 2020. I usually start with small test deposits.',
          last_active_at: '2026-03-02T18:20:00Z',
          total_comments: 1,
          total_threads: 0
        },
        {
          id: 'profile_risk_alert',
          username: 'risk_alert',
          join_date: '2024-11-03T08:40:00Z',
          avatar_url: 'https://www.eliteesthetics.co.za/wp-content/uploads/2021/01/istockphoto-1273297923-612x612-1.jpg',
          bio: 'Focusing on risk management and early warning signs in HYIP space.',
          last_active_at: '2026-03-01T21:05:00Z',
          total_comments: 1,
          total_threads: 0
        },
        {
          id: 'profile_btcstacker',
          username: 'BTCStacker',
          join_date: '2025-02-19T14:05:00Z',
          avatar_url: 'https://www.eliteesthetics.co.za/wp-content/uploads/2021/01/istockphoto-1273297923-612x612-1.jpg',
          bio: 'Mostly Bitcoin deposits, small positions across multiple programs.',
          last_active_at: '2026-03-01T18:10:00Z',
          total_comments: 0,
          total_threads: 0
        }
      ],
      forum_posts: [
        {
          id: 'post_announcements_001',
          thread_id: 'thread_announcements_rules',
          author_profile_id: 'profile_forumadmin',
          author_username: 'ForumAdmin',
          body: 'Welcome to the HYIP forum. Please remember that all programs listed here are high risk. Do your own research, never invest money you cannot afford to lose, and clearly state whether a program is paying, waiting, or not paying in your reports.',
          is_first_post: true,
          created_at: '2025-12-01T10:00:00Z'
        },
        {
          id: 'post_announcements_002',
          thread_id: 'thread_announcements_rules',
          author_profile_id: 'profile_mod_hyipwatch',
          author_username: 'Mod_HYIPWatch',
          body: 'Moderation note: when reporting a SCAM or NOT PAYING program, please include the program name, a link to the listing, your last successful payout date, and screenshots if possible. This helps us mark programs correctly in the Problematic Programs section.',
          is_first_post: false,
          created_at: '2026-01-05T14:20:00Z'
        },
        {
          id: 'post_novayield_001',
          thread_id: 'thread_newhyip_novayield_7d',
          author_profile_id: 'profile_forumadmin',
          author_username: 'ForumAdmin',
          body: 'New HYIP: NovaYield 7D\n\nStart Date: 27 February 2026\nMinimum Deposit: $10 USDT\nPayment Methods: Bitcoin, USDT, Ethereum\nPlan: 2.4% daily for 7 days (principal returned), higher rate Pro plan from $100.\n\nThis thread is for NovaYield 7D discussion and payment reports. Remember this is a high-risk HYIP, not an investment recommendation.',
          is_first_post: true,
          created_at: '2026-02-27T09:10:00Z'
        }
      ],
      forum_categories: [
        {
          id: 'cat_new_hyips',
          name: 'New HYIPs',
          slug: 'new-hyips',
          description: 'Announcements and discussion threads for newly launched HYIP programs.',
          category_type: 'new_hyips',
          last_activity_at: '2026-03-01T08:30:00Z',
          thread_count: 5,
          post_count: 6
        },
        {
          id: 'cat_scam_reports',
          name: 'Scam & Problematic Programs',
          slug: 'scam-reports',
          description: 'Reports and evidence for HYIPs that are not paying, delayed, or confirmed scams.',
          category_type: 'scam_reports',
          last_activity_at: '2026-03-01T09:05:00Z',
          thread_count: 3,
          post_count: 4
        },
        {
          id: 'cat_general_discussion',
          name: 'General HYIP Discussion',
          slug: 'general-discussion',
          description: 'Strategies, risk management, and general questions about HYIP investing.',
          category_type: 'general_discussion',
          last_activity_at: '2026-02-22T18:00:00Z',
          thread_count: 3,
          post_count: 3
        }
      ],
      forum_threads: [
        {
          id: 'thread_announcements_rules',
          category_id: 'cat_site_announcements',
          author_profile_id: 'profile_forumadmin',
          author_username: 'ForumAdmin',
          title: 'Forum Rules, Risk Disclaimer & How to Report Programs',
          prefix: 'announcement',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2026-01-05T14:20:00Z',
          last_post_at: '2026-01-05T14:20:00Z',
          is_locked: false,
          is_subscribed: true,
          reply_count: 1
        },
        {
          id: 'thread_newhyip_novayield_7d',
          category_id: 'cat_new_hyips',
          author_profile_id: 'profile_forumadmin',
          author_username: 'ForumAdmin',
          title: 'New HYIP: NovaYield 7D',
          prefix: 'new',
          created_at: '2026-02-27T09:10:00Z',
          updated_at: '2026-03-01T08:30:00Z',
          last_post_at: '2026-03-01T08:30:00Z',
          is_locked: false,
          is_subscribed: false,
          reply_count: 2
        },
        {
          id: 'thread_newhyip_cryptomax_300',
          category_id: 'cat_new_hyips',
          author_profile_id: 'profile_forumadmin',
          author_username: 'ForumAdmin',
          title: 'New HYIP: CryptoMax 300%',
          prefix: 'high_risk',
          created_at: '2026-01-25T11:00:00Z',
          updated_at: '2026-02-02T09:50:00Z',
          last_post_at: '2026-02-02T09:50:00Z',
          is_locked: false,
          is_subscribed: false,
          reply_count: 2
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:32.293063'
      }
    };

    // Persist generated data using correct storage keys
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('programs', JSON.stringify(generatedData.programs || []));
      localStorage.setItem('program_plans', JSON.stringify(generatedData.program_plans || []));
      localStorage.setItem('program_comments', JSON.stringify(generatedData.program_comments || []));
      localStorage.setItem('community_profiles', JSON.stringify(generatedData.community_profiles || []));
      localStorage.setItem('forum_posts', JSON.stringify(generatedData.forum_posts || []));
      localStorage.setItem('forum_categories', JSON.stringify(generatedData.forum_categories || []));
      localStorage.setItem('forum_threads', JSON.stringify(generatedData.forum_threads || []));
      localStorage.setItem('program_polls', JSON.stringify(generatedData.program_polls || []));
      localStorage.setItem('poll_options', JSON.stringify(generatedData.poll_options || []));
      // Other storages will be initialized empty by business logic (_initStorage)
    }
  }

  // Run all tests / flows
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddPayingBitcoinProgramsToWatchlist();
    this.testTask2_BookmarkBetterPayingProgramBy30dReturn();
    this.testTask3_PostFourStarReviewOnCryptoMax();
    this.testTask4_CreateAlphaGrowthThread();
    this.testTask5_BlacklistProgramsAndSubscribeScamAlerts();
    this.testTask6_VoteInPollForNewFiveStarProgram();
    this.testTask7_ConfigureDashboardAndRiskAlerts();
    this.testTask8_SendPrivateMessageToLatestCommenter();

    return this.results;
  }

  // Task 1: Add 3 paying Bitcoin programs with ROI >= 1.5% and min deposit <= $25 to watchlist
  testTask1_AddPayingBitcoinProgramsToWatchlist() {
    const testName = 'Task 1: Add paying Bitcoin programs to watchlist';
    console.log('Testing:', testName);

    try {
      // Get filter options (simulates opening HYIP Listings filters UI)
      const filterOptions = this.logic.getProgramListingFilterOptions();
      this.assert(filterOptions && filterOptions.status_options, 'Should return filter options');

      // Apply filters: paying, Bitcoin, ROI >= 1.5%, min deposit <= 25 (adapted to sample data)
      const minDailyRoi = 1.5;
      const maxMinDepositUsd = 25;

      const listResult = this.logic.getProgramsList(
        'all_programs',
        {
          status_filter: ['paying'],
          payment_method_filter: ['bitcoin'],
          min_daily_roi_percent: minDailyRoi,
          max_min_deposit_usd: maxMinDepositUsd
        },
        'rating_desc',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Program list should return items');
      this.assert(listResult.items.length >= 3, 'Should have at least 3 matching programs to add');

      // Take first 3 programs
      const selectedItems = listResult.items.slice(0, 3);
      const selectedProgramIds = [];

      selectedItems.forEach((item) => {
        const program = item.program;
        this.assert(program.status === 'paying', 'Program should be paying');
        this.assert(
          (program.payment_methods || []).includes('bitcoin'),
          'Program should accept Bitcoin'
        );
        this.assert(
          typeof program.daily_roi_percent === 'number' && program.daily_roi_percent >= minDailyRoi,
          'Program daily ROI should be >= filter minimum'
        );
        this.assert(
          typeof program.min_deposit_usd === 'number' && program.min_deposit_usd <= maxMinDepositUsd,
          'Program min deposit should be <= filter maximum'
        );

        // Open detail view (simulates opening program detail page)
        const detail = this.logic.getProgramDetailView(program.id);
        this.assert(detail && detail.program && detail.stats_display, 'Program detail should be returned');

        // Add to watchlist
        const saveResult = this.logic.saveProgram(program.id, 'watchlist');
        this.assert(saveResult && saveResult.success === true, 'saveProgram should succeed');
        this.assert(
          saveResult.saved_program && saveResult.saved_program.save_type === 'watchlist',
          'Saved program should be watchlist type'
        );

        selectedProgramIds.push(program.id);
      });

      // Verify via getSavedPrograms
      const saved = this.logic.getSavedPrograms('watchlist');
      this.assert(saved && Array.isArray(saved.watchlist), 'getSavedPrograms should return watchlist array');
      this.assert(
        saved.watchlist.length >= selectedProgramIds.length,
        'Watchlist should contain at least the programs we added'
      );

      const watchlistIds = saved.watchlist.map((wp) => wp.program.id);
      selectedProgramIds.forEach((id) => {
        this.assert(watchlistIds.includes(id), 'Watchlist should contain program: ' + id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Bookmark better-paying HYIP among two based on 30-day total return
  testTask2_BookmarkBetterPayingProgramBy30dReturn() {
    const testName = 'Task 2: Bookmark better-paying program by 30d return';
    console.log('Testing:', testName);

    try {
      // List paying programs (simulates applying status filter Paying)
      const listResult = this.logic.getProgramsList(
        'all_programs',
        { status_filter: ['paying'] },
        'start_date_newest',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Program list should return items');
      this.assert(listResult.items.length >= 2, 'Need at least 2 paying programs');

      const firstTwo = listResult.items.slice(0, 2);
      const programAId = firstTwo[0].program.id;
      const programBId = firstTwo[1].program.id;

      // Get detail for both to read 30-day total return
      const detailA = this.logic.getProgramDetailView(programAId);
      const detailB = this.logic.getProgramDetailView(programBId);
      this.assert(detailA && detailB, 'Detail views for both programs should be available');

      const retA = typeof detailA.program.total_return_30d_percent === 'number'
        ? detailA.program.total_return_30d_percent
        : 0;
      const retB = typeof detailB.program.total_return_30d_percent === 'number'
        ? detailB.program.total_return_30d_percent
        : 0;

      let chosenId = programAId;
      let otherId = programBId;
      if (retB > retA) {
        chosenId = programBId;
        otherId = programAId;
      }

      // Bookmark the better one
      const saveResult = this.logic.saveProgram(chosenId, 'bookmark');
      this.assert(saveResult && saveResult.success === true, 'Bookmark saveProgram should succeed');
      this.assert(
        saveResult.saved_program && saveResult.saved_program.save_type === 'bookmark',
        'Saved program should be bookmark type'
      );

      // Verify only this one is bookmarked (adapted: ensure otherId is not bookmarked)
      const saved = this.logic.getSavedPrograms('bookmark');
      this.assert(saved && Array.isArray(saved.bookmarks), 'getSavedPrograms should return bookmarks array');

      const bookmarkedIds = saved.bookmarks.map((bp) => bp.program.id);
      this.assert(bookmarkedIds.includes(chosenId), 'Chosen program should be bookmarked');

      const otherIsBookmarked = bookmarkedIds.includes(otherId);
      this.assert(!otherIsBookmarked, 'Other program among the two should not be bookmarked');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Post a 4-star review with 2+ sentences on CryptoMax 300%
  testTask3_PostFourStarReviewOnCryptoMax() {
    const testName = 'Task 3: Post 4-star review on CryptoMax 300%';
    console.log('Testing:', testName);

    try {
      // Search for CryptoMax 300% (simulates using search bar)
      const searchResult = this.logic.searchSite('CryptoMax 300%', 'programs', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.program_results), 'searchSite should return program_results');

      const cryptoMax = searchResult.program_results.find((p) => p.name === 'CryptoMax 300%')
        || searchResult.program_results[0];
      this.assert(cryptoMax, 'Should find at least one program from search');

      const programId = cryptoMax.id;

      // Open detail (simulates opening program page)
      const detail = this.logic.getProgramDetailView(programId);
      this.assert(detail && detail.program, 'Program detail should be available');

      // Compose 4-star review with 2+ sentences including positive & risk
      const reviewBody = 'I received my payout from CryptoMax 300% within a few hours, which was a pleasant surprise and shows fast processing so far. However, the promised 300% return in 30 days looks extremely high risk, so I would only invest what I can afford to lose.';

      const postResult = this.logic.postProgramReview(programId, 4, reviewBody, true);
      this.assert(postResult && postResult.success === true, 'postProgramReview should succeed');
      this.assert(postResult.comment, 'postProgramReview should return the created comment');

      const newComment = postResult.comment;
      this.assert(newComment.program_id === programId, 'Review should be attached to correct program');
      this.assert(newComment.rating_stars === 4, 'Review rating should be 4 stars');
      this.assert(newComment.is_review === true, 'Comment should be marked as review');
      this.assert(typeof newComment.body === 'string' && newComment.body.length >= reviewBody.length, 'Review body should be stored');

      // Verify via discussion listing (sorted newest first)
      const discussion = this.logic.getProgramDiscussion(programId, 'newest', 1, 20);
      this.assert(discussion && Array.isArray(discussion.comments), 'getProgramDiscussion should return comments');

      const found = discussion.comments.find((c) => c.id === newComment.id);
      this.assert(found, 'Newly created review should appear in discussion');
      this.assert(found.rating_stars === 4, 'Found review should have 4 stars');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Create a new forum thread announcing a hypothetical HYIP
  testTask4_CreateAlphaGrowthThread() {
    const testName = 'Task 4: Create AlphaGrowth 5% Daily forum thread';
    console.log('Testing:', testName);

    try {
      // Open forum index
      const index = this.logic.getForumIndex();
      this.assert(index && Array.isArray(index.categories), 'getForumIndex should return categories');

      // Find New HYIPs category
      const newHyipsCat = index.categories.find((c) => c.category_type === 'new_hyips');
      this.assert(newHyipsCat, 'Should find New HYIPs forum category');

      const categoryId = newHyipsCat.id;
      const title = 'New HYIP: AlphaGrowth 5% Daily';
      const prefix = 'high_risk';
      const body = [
        'Start Date: 15 March 2026',
        'Minimum Deposit: $10',
        'Payment Methods: Bitcoin, USDT',
        'Plan: 5% daily for 30 days',
        'This is a hypothetical example for discussion purposes only.'
      ].join('\n');

      const createResult = this.logic.createForumThread(categoryId, title, prefix, body, true);
      this.assert(createResult && createResult.success === true, 'createForumThread should succeed');
      this.assert(createResult.thread && createResult.first_post, 'Should return thread and first_post');

      const thread = createResult.thread;
      const firstPost = createResult.first_post;

      this.assert(thread.category_id === categoryId, 'Thread should be in New HYIPs category');
      this.assert(thread.title === title, 'Thread title should match');
      this.assert(thread.prefix === prefix, 'Thread prefix should match');

      this.assert(firstPost.thread_id === thread.id, 'First post should belong to created thread');
      this.assert(firstPost.is_first_post === true, 'First post should be marked as first_post');
      this.assert(firstPost.body.indexOf('AlphaGrowth 5% Daily') !== -1, 'Post body should mention AlphaGrowth');

      // Verify thread appears in category listing
      const catThreads = this.logic.getForumCategoryThreads(categoryId, 'newest', 1, 20);
      this.assert(catThreads && Array.isArray(catThreads.threads), 'getForumCategoryThreads should return threads');
      const found = catThreads.threads.find((t) => t.id === thread.id);
      this.assert(found, 'New AlphaGrowth thread should appear in New HYIPs category listing');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Add 2 programs to blacklist and subscribe to scam alerts (adapted: use available programs)
  testTask5_BlacklistProgramsAndSubscribeScamAlerts() {
    const testName = 'Task 5: Blacklist 2 programs and subscribe to scam alerts';
    console.log('Testing:', testName);

    try {
      // List programs (simulates visiting Problematic/Scam tab; adapted to all programs due to sample data)
      const listResult = this.logic.getProgramsList('all_programs', {}, 'rating_desc', 1, 20);
      this.assert(listResult && Array.isArray(listResult.items), 'Program list should return items');
      this.assert(listResult.items.length >= 2, 'Need at least 2 programs to blacklist');

      const toBlacklist = listResult.items.slice(0, 2).map((item) => item.program.id);

      toBlacklist.forEach((id) => {
        const saveResult = this.logic.saveProgram(id, 'blacklist');
        this.assert(saveResult && saveResult.success === true, 'saveProgram to blacklist should succeed');
        this.assert(
          saveResult.saved_program && saveResult.saved_program.save_type === 'blacklist',
          'Saved program should be blacklist type'
        );
      });

      // Verify via getSavedPrograms
      const saved = this.logic.getSavedPrograms('blacklist');
      this.assert(saved && Array.isArray(saved.blacklist), 'getSavedPrograms should return blacklist array');
      const blacklistedIds = saved.blacklist.map((bp) => bp.program.id);

      toBlacklist.forEach((id) => {
        this.assert(blacklistedIds.includes(id), 'Blacklist should contain program: ' + id);
      });

      // Subscribe to scam alerts
      const subResult = this.logic.toggleScamAlertsSubscription(true);
      this.assert(subResult && subResult.success === true, 'toggleScamAlertsSubscription should succeed');
      this.assert(
        subResult.notifications_scam_alerts_in_site === true,
        'Scam alerts in-site notifications should be enabled'
      );

      // Confirm setting via getAccountSettings
      const settings = this.logic.getAccountSettings();
      this.assert(settings, 'getAccountSettings should return settings');
      this.assert(
        settings.notifications_scam_alerts_in_site === true,
        'Account settings should reflect scam alerts subscription'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Vote in a poll for newly started 5-star paying HYIP (adapted to available data)
  testTask6_VoteInPollForNewFiveStarProgram() {
    const testName = 'Task 6: Vote in poll for 5-star paying program';
    console.log('Testing:', testName);

    try {
      // Filter paying programs with max payout rating (approximate 5/5)
      const listResult = this.logic.getProgramsList(
        'all_programs',
        {
          status_filter: ['paying'],
          min_payout_rating_value: 5
        },
        'start_date_newest',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Program list should return items');
      this.assert(listResult.items.length > 0, 'Should have at least one paying 5-star program');

      // Choose the first one that has an active poll
      const candidateItem = listResult.items.find((item) => item.program.has_active_poll) || listResult.items[0];
      const programId = candidateItem.program.id;

      const detail = this.logic.getProgramDetailView(programId);
      this.assert(detail && detail.program, 'Program detail should be available');
      this.assert(detail.program.status === 'paying', 'Program should be paying');
      this.assert(
        detail.program.payout_rating_value >= 5,
        'Program should have max payout rating (>=5)'
      );
      this.assert(
        detail.poll_summary && detail.poll_summary.has_active_poll === true,
        'Program should have an active poll'
      );

      // Load poll and options
      const pollData = this.logic.getProgramPoll(programId);
      this.assert(pollData && pollData.poll && Array.isArray(pollData.options), 'getProgramPoll should return poll and options');

      const poll = pollData.poll;
      const options = pollData.options;

      this.assert(options.length > 0, 'Poll should have options');

      // Choose the most cautious option if available (e.g., contains 'No')
      let chosenOption = options.find((opt) => /no/i.test(opt.text)) || options[0];

      // Cast vote
      const voteResult = this.logic.castProgramPollVote(poll.id, chosenOption.id);
      this.assert(voteResult && voteResult.success === true, 'castProgramPollVote should succeed');
      this.assert(voteResult.poll, 'Vote result should include poll');

      const updatedPoll = voteResult.poll;
      this.assert(updatedPoll.has_user_voted === true, 'Poll should reflect that user has voted');
      if (updatedPoll.user_selected_option_id) {
        this.assert(
          updatedPoll.user_selected_option_id === chosenOption.id,
          'Poll should record selected option id'
        );
      }

      // Cross-check via detail view
      const detailAfterVote = this.logic.getProgramDetailView(programId);
      this.assert(
        detailAfterVote.poll_summary && detailAfterVote.poll_summary.has_user_voted === true,
        'Program detail poll_summary should show user has voted'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Configure dashboard to show only active programs with >=1.5% ROI in USD and enable risk alerts
  testTask7_ConfigureDashboardAndRiskAlerts() {
    const testName = 'Task 7: Configure dashboard and enable watchlist risk alerts';
    console.log('Testing:', testName);

    try {
      // Load current settings snapshot
      const currentSettings = this.logic.getAccountSettings();
      this.assert(currentSettings, 'getAccountSettings should return settings');

      const updateResult = this.logic.updateAccountSettings({
        default_currency: 'usd',
        dashboard_min_daily_roi_percent: 1.5,
        dashboard_show_closed_programs: false,
        dashboard_status_filter: ['paying'],
        notifications_watchlist_risk_in_site: true
      });

      this.assert(updateResult && updateResult.success === true, 'updateAccountSettings should succeed');
      const newSettings = updateResult.settings;
      this.assert(newSettings, 'Updated settings should be returned');

      this.assert(newSettings.default_currency === 'usd', 'Default currency should be USD');
      this.assert(
        newSettings.dashboard_min_daily_roi_percent === 1.5,
        'Dashboard min ROI should be 1.5'
      );
      this.assert(
        newSettings.dashboard_show_closed_programs === false,
        'Closed programs should be hidden on dashboard'
      );
      this.assert(
        Array.isArray(newSettings.dashboard_status_filter) &&
          newSettings.dashboard_status_filter.indexOf('paying') !== -1,
        'Dashboard should filter to include paying programs'
      );
      this.assert(
        newSettings.notifications_watchlist_risk_in_site === true,
        'Watchlist risk in-site notifications should be enabled'
      );

      // Verify via dashboard overview
      const dashboard = this.logic.getDashboardOverview();
      this.assert(dashboard && dashboard.settings_snapshot, 'getDashboardOverview should return settings_snapshot');

      const snapshot = dashboard.settings_snapshot;
      this.assert(snapshot.default_currency === 'usd', 'Dashboard snapshot should use USD');
      this.assert(
        snapshot.dashboard_min_daily_roi_percent === 1.5,
        'Dashboard snapshot min ROI should be 1.5'
      );

      // Verify active_saved_programs adhere to filters
      if (Array.isArray(dashboard.active_saved_programs)) {
        dashboard.active_saved_programs.forEach((item) => {
          const program = item.program;
          this.assert(program.status !== 'closed', 'Dashboard program should not be closed');
          this.assert(
            typeof program.daily_roi_percent === 'number' &&
              program.daily_roi_percent >= snapshot.dashboard_min_daily_roi_percent,
            'Dashboard program ROI should be >= configured minimum'
          );
        });
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Send a private message to the latest commenter asking about payout experience
  testTask8_SendPrivateMessageToLatestCommenter() {
    const testName = 'Task 8: Send private message to latest commenter';
    console.log('Testing:', testName);

    try {
      // Use stored program_comments to determine latest existing comment
      const storedCommentsJson = typeof localStorage !== 'undefined'
        ? localStorage.getItem('program_comments')
        : null;
      const storedComments = storedCommentsJson ? JSON.parse(storedCommentsJson) : [];
      this.assert(storedComments.length > 0, 'There should be pre-generated program comments');

      // Find latest by created_at
      let latestStored = storedComments[0];
      for (let i = 1; i < storedComments.length; i++) {
        const candidate = storedComments[i];
        if (new Date(candidate.created_at) > new Date(latestStored.created_at)) {
          latestStored = candidate;
        }
      }

      const programId = latestStored.program_id;
      const commentId = latestStored.id;
      const authorUsername = latestStored.author_username;

      // Open program discussion sorted newest (simulates viewing discussion tab)
      const discussion = this.logic.getProgramDiscussion(programId, 'newest', 1, 20);
      this.assert(discussion && Array.isArray(discussion.comments), 'getProgramDiscussion should return comments');

      const commentInView = discussion.comments.find((c) => c.id === commentId);
      this.assert(commentInView, 'Latest stored comment should appear in current discussion view');

      // Resolve commenter profile via community_profiles
      const profilesJson = typeof localStorage !== 'undefined'
        ? localStorage.getItem('community_profiles')
        : null;
      const profiles = profilesJson ? JSON.parse(profilesJson) : [];
      const recipientProfile = profiles.find((p) => p.username === authorUsername);
      this.assert(recipientProfile, 'Should find CommunityProfile for comment author');

      const recipientProfileId = recipientProfile.id;

      // (Optional) verify profile via API
      const profileView = this.logic.getCommunityProfile(recipientProfileId);
      this.assert(profileView && profileView.profile, 'getCommunityProfile should return profile');
      this.assert(profileView.profile.username === authorUsername, 'Profile username should match comment author');

      // Compose message with at least two specific questions
      const subject = 'Question about your HYIP payout experience';
      const body = 'Hi, I saw your recent comment about this HYIP and wanted to ask a couple of questions. How long do your withdrawals usually take to reach your wallet, and what approximate deposit size have you been using so far?';

      const sendResult = this.logic.sendPrivateMessage(
        recipientProfileId,
        subject,
        body,
        programId,
        commentId
      );

      this.assert(sendResult && sendResult.success === true, 'sendPrivateMessage should succeed');
      this.assert(sendResult.message_record, 'Message record should be returned');

      const msg = sendResult.message_record;
      this.assert(msg.recipient_profile_id === recipientProfileId, 'Message recipient_profile_id should match');
      this.assert(msg.subject === subject, 'Message subject should match');
      this.assert(typeof msg.body === 'string' && msg.body.length >= body.length, 'Message body should be stored');
      this.assert(msg.related_program_id === programId, 'Message should reference related program');
      this.assert(msg.related_comment_id === commentId, 'Message should reference related comment');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
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

module.exports = TestRunner;
