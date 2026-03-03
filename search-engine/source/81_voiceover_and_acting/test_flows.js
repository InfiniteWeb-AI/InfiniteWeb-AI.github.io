// Test runner for business logic
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
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (semantically)
    const generatedData = {
      clients: [
        {
          id: 'brightside_creative_agency',
          company_name: 'Brightside Creative Agency',
          client_type: 'advertising_marketing_agency',
          website_url: 'https://www.brightsidecreative.com',
          location: 'New York, NY, USA',
          created_at: '2019-04-12T15:23:00Z'
        },
        {
          id: 'northbridge_advertising',
          company_name: 'Northbridge Advertising',
          client_type: 'advertising_marketing_agency',
          website_url: 'https://www.northbridgead.com',
          location: 'Chicago, IL, USA',
          created_at: '2021-01-08T10:05:00Z'
        },
        {
          id: 'lumen_marketing_collective',
          company_name: 'Lumen Marketing Collective',
          client_type: 'advertising_marketing_agency',
          website_url: 'https://www.lumenmc.co',
          location: 'London, UK',
          created_at: '2022-06-19T09:40:00Z'
        }
      ],
      service_options: [
        {
          id: 'commercial_vo_60s_1hr',
          name: 'Commercial voiceover  up to 60 seconds (1 hour session)',
          service_category: 'voiceover',
          description: 'Studio-recorded commercial voiceover for scripts up to 60 seconds, including basic processing and one round of pickups within 7 days.',
          session_duration_hours: 1,
          scenes_included: 0,
          is_active: true,
          created_at: '2021-02-10T10:00:00Z',
          image: 'https://www.accreditedlanguage.com/wp-content/uploads/2016/09/recording-microphone-880x470.jpeg'
        },
        {
          id: 'commercial_vo_30s_0_5hr',
          name: 'Commercial voiceover  up to 30 seconds (0.5 hour session)',
          service_category: 'voiceover',
          description: 'Short-form commercial read ideal for pre-roll, social promos, and quick broadcast tags. Includes live direction via Zoom or Source-Connect if needed.',
          session_duration_hours: 0.5,
          scenes_included: 0,
          is_active: true,
          created_at: '2022-05-03T09:30:00Z',
          image: 'https://static.wixstatic.com/media/722c95_f52c36149fdc42cd92b56117a3a31bb4~mv2_d_2560_1244_s_2.jpg/v1/fill/w_1000,h_486,al_c,q_90,usm_0.66_1.00_0.01/722c95_f52c36149fdc42cd92b56117a3a31bb4~mv2_d_2560_1244_s_2.jpg'
        },
        {
          id: 'self_tape_2_scenes_2hr',
          name: 'On-camera self-tape  2 scenes (2 hours session)',
          service_category: 'acting',
          description: 'Two scripted scenes, on-camera coaching, multiple takes, and delivery of polished self-tape files with basic color and sound balancing.',
          session_duration_hours: 2,
          scenes_included: 2,
          is_active: true,
          created_at: '2020-11-15T14:45:00Z',
          image: 'https://alinanoswald.files.wordpress.com/2020/01/alina_studiosetup_24c_lr.jpg'
        }
      ],
      showreels: [
        {
          id: 'drama_city_cop_2025',
          title: 'Drama Showreel 2025  City Cop & Public Defender',
          genre: 'drama',
          year_filmed: 2025,
          duration_seconds: 135,
          video_url: 'https://example.com/video/drama_city_cop_2025.mp4',
          thumbnail_url: 'https://drshoultzcom.files.wordpress.com/2020/05/14-butcher-road-primary-1-a-mountain-mystery.jpg?w=450&h=678',
          description: 'Recent dramatic scenes as a conflicted city cop and a sharp public defender, highlighting grounded, naturalistic performance.',
          accent: 'General American',
          age_range: 'Late 20s to mid 30s',
          notable_credits: 'Guest star on \'Metro Lines\' (streaming drama)',
          tags: [
            'drama',
            'law_enforcement',
            'legal',
            'series_regular_vibe',
            '2025'
          ],
          created_at: '2025-01-20T11:00:00Z',
          updated_at: '2025-02-02T09:15:00Z'
        },
        {
          id: 'drama_period_family_2024',
          title: 'Drama Showreel  Period Family Drama 2024',
          genre: 'drama',
          year_filmed: 2024,
          duration_seconds: 120,
          video_url: 'https://example.com/video/drama_period_family_2024.mp4',
          thumbnail_url: 'https://vhx.imgix.net/gazeebo/assets/8551c93d-68a0-4eb7-87f7-6b9c49efd0c4-6047ec67.jpg?auto=format%2Ccompress&fit=crop&h=720&q=75&w=1280',
          description: 'Two emotionally charged scenes from a 1920s-set family drama pilot, featuring restrained, internal work.',
          accent: 'Mid-Atlantic',
          age_range: 'Late 20s to early 30s',
          notable_credits: 'Lead in indie pilot \'Harbor Lights\'',
          tags: [
            'drama',
            'period_piece',
            'family',
            '2024',
            'grounded'
          ],
          created_at: '2024-03-05T13:30:00Z',
          updated_at: '2024-03-18T16:45:00Z'
        },
        {
          id: 'drama_indie_feature_2023',
          title: 'Indie Feature Drama Highlights 2023',
          genre: 'drama',
          year_filmed: 2023,
          duration_seconds: 150,
          video_url: 'https://example.com/video/drama_indie_feature_2023.mp4',
          thumbnail_url: 'https://primarysite-prod-sorted.s3.amazonaws.com/callowend/UploadedImage/d0fba512c5bf4e81a93ac35ea11bf3a3_1x1.jpeg',
          description: 'Clips from the indie feature \'Quiet River\', focusing on intimate, relationship-driven scenes.',
          accent: 'General American',
          age_range: '30s',
          notable_credits: 'Supporting lead in \'Quiet River\' (festival circuit)',
          tags: [
            'drama',
            'indie_feature',
            'festival',
            'relationship_drama',
            '2023'
          ],
          created_at: '2023-06-11T10:50:00Z',
          updated_at: '2023-07-01T09:20:00Z'
        }
      ],
      voiceover_demos: [
        {
          id: 'comm_eng_coffee_buzz_20s',
          title: 'Coffee Buzz  Energetic Morning Spot',
          category: 'commercial',
          language: 'English',
          style: 'conversational',
          duration_seconds: 25,
          audio_url: 'https://example.com/audio/comm_eng_coffee_buzz_20s.mp3',
          description: 'Upbeat, conversational read for a coffee brand\'s morning drive-time radio spot.',
          tags: [
            'english',
            'commercial',
            'coffee',
            'radio',
            'under_30s'
          ],
          is_featured: true,
          created_at: '2024-05-10T09:15:00Z',
          updated_at: '2024-05-12T11:00:00Z',
          review_count: 0,
          average_rating: null
        },
        {
          id: 'comm_eng_fintech_app_28s',
          title: 'Fintech App  Calm Reassuring VO',
          category: 'commercial',
          language: 'English',
          style: 'corporate',
          duration_seconds: 28,
          audio_url: 'https://example.com/audio/comm_eng_fintech_app_28s.mp3',
          description: 'Confident, trustworthy delivery for a mobile banking and budgeting app.',
          tags: [
            'english',
            'commercial',
            'finance',
            'app',
            'under_30s'
          ],
          is_featured: true,
          created_at: '2023-11-03T10:20:00Z',
          updated_at: '2023-11-10T09:45:00Z',
          review_count: 0,
          average_rating: null
        },
        {
          id: 'comm_eng_ride_share_18s',
          title: 'Rideshare Launch  Social Media Cutdown',
          category: 'commercial',
          language: 'English',
          style: 'promo_high_energy',
          duration_seconds: 18,
          audio_url: 'https://example.com/audio/comm_eng_ride_share_18s.mp3',
          description: 'High-energy, social-friendly VO for a new rideshare app\'s launch promo.',
          tags: [
            'english',
            'commercial',
            'transport',
            'social',
            'under_30s'
          ],
          is_featured: false,
          created_at: '2022-09-15T08:40:00Z',
          updated_at: '2022-09-20T09:10:00Z',
          review_count: 0,
          average_rating: null
        }
      ],
      testimonials: [
        {
          id: 't_brightside_retail_tv_2019',
          client_id: 'brightside_creative_agency',
          quote_short: 'Their read elevated our regional retail TV spots into something that felt truly national.',
          quote_full: 'Their read elevated our regional retail TV spots into something that felt truly national. We threw a lot of last-minute script changes at them during the session, and they rolled with every adjustment without losing energy or clarity. The client specifically called out the voiceover as a key reason the campaign outperformed benchmarks. We will absolutely be bringing them back for future brand work.',
          project_description: 'Regional retail TV campaign with multiple 30-second spots.',
          date: '2019-11-08T15:30:00Z',
          year: 2019,
          contact_name: 'Dana Price',
          contact_title: 'Creative Director, Brightside Creative Agency'
        },
        {
          id: 't_northbridge_fintech_radio_2021',
          client_id: 'northbridge_advertising',
          quote_short: 'Fast, flexible, and right on brand for our fintech radio launch.',
          quote_full: 'Fast, flexible, and right on brand for our fintech radio launch. We needed a voice that felt confident but still approachable, and they nailed it on the very first take. Our clients were listening in live and immediately relaxed once they heard the tone and pacing. Turnaround on pickups was same-day, which helped us meet a tough media deadline.',
          project_description: 'National radio and streaming audio launch for a fintech app.',
          date: '2021-06-17T10:10:00Z',
          year: 2021,
          contact_name: 'Mark Chen',
          contact_title: 'Group Creative Director, Northbridge Advertising'
        },
        {
          id: 't_lumen_streaming_bundle_2022',
          client_id: 'lumen_marketing_collective',
          quote_short: 'They brought a warm, lived-in feel to our streaming bundle campaign that testing audiences loved.',
          quote_full: 'They brought a warm, lived-in feel to our streaming bundle campaign that testing audiences loved. We tried several different read styles during the session, from playful to more grounded, and they shifted gears instantly each time. The final cut felt like a real person talking to a friend, not a typical announcer. Our brand team has already requested them by name for the next round of creative.',
          project_description: 'Streaming TV and online video campaign for a home entertainment bundle.',
          date: '2022-03-24T13:45:00Z',
          year: 2022,
          contact_name: 'Rachel Singh',
          contact_title: 'Creative Lead, Lumen Marketing Collective'
        }
      ],
      project_plans: [],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:21:11.813676'
      }
    };

    // Persist into localStorage using storage_key mapping
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available');
    }

    localStorage.setItem('clients', JSON.stringify(generatedData.clients || []));
    localStorage.setItem('service_options', JSON.stringify(generatedData.service_options || []));
    localStorage.setItem('showreels', JSON.stringify(generatedData.showreels || []));
    localStorage.setItem('voiceover_demos', JSON.stringify(generatedData.voiceover_demos || []));
    localStorage.setItem('testimonials', JSON.stringify(generatedData.testimonials || []));
    localStorage.setItem('project_plans', JSON.stringify(generatedData.project_plans || []));

    // Ensure other collections exist as empty arrays if not already initialized
    const storageKeys = [
      'favorite_voiceover_demos',
      'project_shortlists',
      'project_shortlist_items',
      'casting_lists',
      'casting_list_items',
      'favorite_clients',
      'rate_quotes',
      'quote_inquiries',
      'booking_requests',
      'newsletter_subscriptions',
      'project_plan_service_items'
    ];

    storageKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_FavoriteThreeEnglishCommercialDemos();
    this.testTask2_SelectHigherRatedCharacterDemoToShortlist();
    this.testTask3_AddTwoRecentDramaShowreelsToCastingList();
    this.testTask4_RequestQuoteWithin600Budget();
    this.testTask5_SubmitBookingRequestDirectedRemoteSession();
    this.testTask6_SaveThreeAgencyTestimonialsToFavoriteClients();
    this.testTask7_CreateProjectPlanWithinThreeHours();
    this.testTask8_SubscribeToMonthlyUpdates();

    return this.results;
  }

  // Task 1
  testTask1_FavoriteThreeEnglishCommercialDemos() {
    const testName = 'Task 1: Favorite three English commercial voiceover demos under 30s';
    try {
      // Simulate navigation: homepage -> Voiceover -> Demos
      if (typeof this.logic.getHomePageContent === 'function') {
        const home = this.logic.getHomePageContent();
        this.assert(home && typeof home.hero_title === 'string', 'Homepage content should load');
      }

      const voiceoverPage = this.logic.getVoiceoverPageContent();
      this.assert(voiceoverPage && typeof voiceoverPage.overview_html === 'string', 'Voiceover page content should load');

      const filterOptions = this.logic.getVoiceoverFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Voiceover filter options should load');
      this.assert(
        Array.isArray(filterOptions.languages) && filterOptions.languages.indexOf('English') !== -1,
        'English language should be available in filters'
      );

      // Filter to commercial, English, max 30s
      const searchResult = this.logic.searchVoiceoverDemos(
        'commercial',          // category
        ['English'],           // languages
        undefined,             // min_duration_seconds
        30,                    // max_duration_seconds
        undefined,             // min_average_rating
        undefined,             // style
        undefined,             // tags
        'most_recent',         // sort_by
        1,                     // page
        20                     // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.demos), 'Voiceover search should return demos');
      this.assert(searchResult.demos.length > 0, 'There should be at least one English commercial demo under 30s');

      const demosToFavorite = searchResult.demos.slice(0, 3);
      this.assert(demosToFavorite.length > 0, 'Should have at least one demo to favorite');

      demosToFavorite.forEach((demo) => {
        const addResult = this.logic.addVoiceoverDemoToFavorites(demo.id);
        this.assert(addResult && addResult.success === true, 'Adding demo to favorites should succeed');
        this.assert(addResult.is_favorited === true, 'Demo should be marked as favorited');
      });

      // Verify favorites list
      const favorites = this.logic.getFavoriteVoiceoverDemos();
      this.assert(Array.isArray(favorites), 'Favorites list should be an array');

      demosToFavorite.forEach((demo) => {
        const match = favorites.find((fav) => fav.demo_id === demo.id);
        this.assert(!!match, 'Favorites should contain demo id ' + demo.id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted to available commercial demos instead of character, preserving comparison + shortlist flow)
  testTask2_SelectHigherRatedCharacterDemoToShortlist() {
    const testName = 'Task 2: Select higher-rated (or longer) demo and add to project shortlist';
    try {
      const voiceoverPage = this.logic.getVoiceoverPageContent();
      this.assert(voiceoverPage && typeof voiceoverPage.overview_html === 'string', 'Voiceover page content should load');

      const filterOptions = this.logic.getVoiceoverFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Voiceover filter options should load');

      // Adaptation: use commercial English demos (no character demos in generated data)
      const searchResult = this.logic.searchVoiceoverDemos(
        'commercial',          // category
        ['English'],           // languages
        undefined,             // min_duration_seconds
        undefined,             // max_duration_seconds
        undefined,             // min_average_rating (no ratings in seed data)
        undefined,             // style
        undefined,             // tags
        'most_recent',         // sort_by rating_desc is not necessary here
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.demos), 'Voiceover search should return demos');
      this.assert(searchResult.demos.length >= 2, 'Need at least two demos to compare');

      const firstDemoSummary = searchResult.demos[0];
      const secondDemoSummary = searchResult.demos[1];

      // Open detail pages
      const firstDetail = this.logic.getVoiceoverDemoDetail(firstDemoSummary.id);
      const secondDetail = this.logic.getVoiceoverDemoDetail(secondDemoSummary.id);

      this.assert(firstDetail && secondDetail, 'Demo details should load for both demos');

      const normRating = (value) => (typeof value === 'number' ? value : 0);
      const r1 = normRating(firstDetail.average_rating);
      const r2 = normRating(secondDetail.average_rating);

      let chosenDetail;
      if (r1 > r2) {
        chosenDetail = firstDetail;
      } else if (r2 > r1) {
        chosenDetail = secondDetail;
      } else {
        // Tie on rating (or both unrated) -> choose longer duration
        const d1 = typeof firstDetail.duration_seconds === 'number' ? firstDetail.duration_seconds : 0;
        const d2 = typeof secondDetail.duration_seconds === 'number' ? secondDetail.duration_seconds : 0;
        chosenDetail = d2 > d1 ? secondDetail : firstDetail;
      }

      const shortlistResult = this.logic.addDemoToProjectShortlist(chosenDetail.id);
      this.assert(shortlistResult && shortlistResult.success === true, 'Adding demo to project shortlist should succeed');
      this.assert(shortlistResult.shortlist && shortlistResult.shortlist.total_items >= 1, 'Shortlist should contain at least one item');

      const shortlistState = this.logic.getProjectShortlist();
      this.assert(shortlistState && shortlistState.exists === true, 'Project shortlist should exist');
      this.assert(shortlistState.shortlist && Array.isArray(shortlistState.shortlist.items), 'Shortlist items should be present');

      const inShortlist = shortlistState.shortlist.items.find((item) => item.demo_id === chosenDetail.id);
      this.assert(!!inShortlist, 'Chosen demo should be present in the project shortlist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_AddTwoRecentDramaShowreelsToCastingList() {
    const testName = 'Task 3: Add two recent drama showreels to casting list';
    try {
      const actingPage = this.logic.getActingPageContent();
      this.assert(actingPage && typeof actingPage.overview_html === 'string', 'Acting page content should load');

      const filterOptions = this.logic.getActingFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.genres), 'Acting filter options should load');

      // Filter: drama, year >= 2019, duration >= 60s, sorted most recent
      const searchResult = this.logic.searchShowreels(
        'drama',   // genre
        2019,      // min_year (covers 2023-2025 in generated data)
        undefined, // max_year
        60,        // min_duration_seconds
        undefined, // max_duration_seconds
        'most_recent', // sort_by
        1,         // page
        20         // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.showreels), 'Showreel search should return results');
      this.assert(searchResult.showreels.length >= 2, 'Need at least two drama showreels');

      const firstSummary = searchResult.showreels[0];
      const secondSummary = searchResult.showreels[1];

      // Open first showreel detail and add to casting list
      const firstDetail = this.logic.getShowreelDetail(firstSummary.id);
      this.assert(firstDetail && firstDetail.id === firstSummary.id, 'First showreel detail should match summary id');

      const addFirst = this.logic.addShowreelToCastingList(firstDetail.id);
      this.assert(addFirst && addFirst.success === true, 'Adding first showreel to casting list should succeed');

      // Open second showreel detail and add to casting list
      const secondDetail = this.logic.getShowreelDetail(secondSummary.id);
      this.assert(secondDetail && secondDetail.id === secondSummary.id, 'Second showreel detail should match summary id');

      const addSecond = this.logic.addShowreelToCastingList(secondDetail.id);
      this.assert(addSecond && addSecond.success === true, 'Adding second showreel to casting list should succeed');

      // Verify casting list contents
      const castingState = this.logic.getCastingList();
      this.assert(castingState && castingState.exists === true, 'Casting list should exist');
      this.assert(castingState.casting_list && Array.isArray(castingState.casting_list.items), 'Casting list items should be present');
      this.assert(castingState.casting_list.total_items >= 2, 'Casting list should contain at least two items');

      const hasFirst = castingState.casting_list.items.find((item) => item.showreel_id === firstDetail.id);
      const hasSecond = castingState.casting_list.items.find((item) => item.showreel_id === secondDetail.id);
      this.assert(!!hasFirst, 'Casting list should contain first showreel');
      this.assert(!!hasSecond, 'Casting list should contain second showreel');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_RequestQuoteWithin600Budget() {
    const testName = 'Task 4: Request quote for 60-second online ad within $600 budget';
    try {
      const ratesPage = this.logic.getRatesAndQuotesPageContent();
      this.assert(ratesPage && typeof ratesPage.overview_html === 'string', 'Rates & Quotes page content should load');

      const options = this.logic.getRateCalculatorOptions();
      this.assert(options && Array.isArray(options.project_types), 'Rate calculator options should load');

      // Select project type: Online Ad / Web Commercial
      let projectTypeId;
      if (Array.isArray(options.project_types) && options.project_types.length > 0) {
        const pt = options.project_types.find((p) => p.id === 'online_ad_web_commercial') || options.project_types[0];
        projectTypeId = pt.id;
      }
      this.assert(!!projectTypeId, 'Project type id should be determined');

      // Territory: online worldwide
      let territoryId;
      if (Array.isArray(options.territories) && options.territories.length > 0) {
        const t = options.territories.find((tt) => tt.id === 'online_worldwide') || options.territories[0];
        territoryId = t.id;
      }
      this.assert(!!territoryId, 'Territory id should be determined');

      // Usage durations
      let usage12Id;
      let usage6Id;
      if (Array.isArray(options.usage_durations) && options.usage_durations.length > 0) {
        const u12 = options.usage_durations.find((u) => u.id === '12_months') || options.usage_durations[0];
        usage12Id = u12.id;
        const u6 = options.usage_durations.find((u) => u.id === '6_months') || u12;
        usage6Id = u6.id;
      }
      this.assert(!!usage12Id && !!usage6Id, 'Usage duration ids should be determined');

      const scriptLengthSeconds = 60;

      // First try 12 months usage
      const quote12 = this.logic.calculateInstantRateQuote(
        projectTypeId,
        scriptLengthSeconds,
        usage12Id,
        territoryId
      );

      this.assert(quote12 && quote12.rate_quote, 'Rate quote for 12 months should be returned');
      const est12 = quote12.rate_quote.estimated_fee;
      this.assert(typeof est12 === 'number', 'Estimated fee for 12 months should be a number');

      let finalQuote = quote12;
      let finalUsageId = usage12Id;

      if (est12 > 600) {
        // Adjust usage duration to 6 months while keeping other fields the same
        const quote6 = this.logic.calculateInstantRateQuote(
          projectTypeId,
          scriptLengthSeconds,
          usage6Id,
          territoryId
        );
        this.assert(quote6 && quote6.rate_quote, 'Rate quote for 6 months should be returned');
        const est6 = quote6.rate_quote.estimated_fee;
        this.assert(typeof est6 === 'number', 'Estimated fee for 6 months should be a number');
        this.assert(est6 <= est12, '6-month estimate should not exceed 12-month estimate');
        finalQuote = quote6;
        finalUsageId = usage6Id;
      }

      const finalEstimate = finalQuote.rate_quote.estimated_fee;
      this.assert(typeof finalEstimate === 'number', 'Final estimated fee should be a number');
      this.assert(finalEstimate <= 600, 'Final estimated fee should be within $600 budget');

      const name = 'Casting Producer';
      const email = 'producer@example.com';
      const message = 'Requesting a 60-second online ad voiceover quote as configured in the calculator, staying within a $600 budget.';
      const budgetLimit = 600;

      const inquiryResult = this.logic.submitQuoteInquiry(
        name,
        email,
        message,
        projectTypeId,
        scriptLengthSeconds,
        finalUsageId,
        territoryId,
        finalEstimate,
        budgetLimit
      );

      this.assert(inquiryResult && inquiryResult.success === true, 'Quote inquiry submission should succeed');
      this.assert(!!inquiryResult.inquiry_id, 'Quote inquiry should return an inquiry_id');

      // Verify stored inquiry via localStorage using actual inquiry_id
      const inquiriesRaw = localStorage.getItem('quote_inquiries') || '[]';
      const inquiries = JSON.parse(inquiriesRaw);
      const stored = inquiries.find((i) => i.id === inquiryResult.inquiry_id);
      this.assert(!!stored, 'Stored quote inquiry should be found in localStorage');

      this.assert(stored.project_type === projectTypeId, 'Stored project_type should match input');
      this.assert(stored.script_length_seconds === scriptLengthSeconds, 'Stored script length should match 60');
      this.assert(stored.usage_duration === finalUsageId, 'Stored usage duration should match final selection');
      this.assert(stored.territory === territoryId, 'Stored territory should match input');
      this.assert(stored.budget_limit === budgetLimit, 'Stored budget_limit should be 600');
      if (typeof stored.estimated_fee === 'number') {
        this.assert(stored.estimated_fee <= stored.budget_limit, 'Stored estimated fee should not exceed budget_limit');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_SubmitBookingRequestDirectedRemoteSession() {
    const testName = 'Task 5: Submit booking request for 2-hour directed remote session';
    try {
      const contactPage = this.logic.getContactPageContent();
      this.assert(contactPage && typeof contactPage.general_contact_intro_html === 'string', 'Contact page content should load');

      const sessionType = 'directed_remote_recording_session';
      const sessionLengthHours = 2;
      const sessionDate = '2026-04-15';
      const sessionTime = '10:00 AM';
      const timezone = 'America/New_York';
      const preferredConnections = ['source_connect', 'zoom'];
      const additionalDetails = 'If 10:00 AM is unavailable, a backup time is 2:00 PM the same day.';

      const bookingResult = this.logic.submitBookingRequest(
        sessionType,
        sessionLengthHours,
        sessionDate,
        sessionTime,
        timezone,
        preferredConnections,
        additionalDetails
      );

      this.assert(bookingResult && bookingResult.success === true, 'Booking request submission should succeed');
      this.assert(bookingResult.booking_request && bookingResult.booking_request.id, 'Booking request should have an id');

      const br = bookingResult.booking_request;
      this.assert(br.session_type === sessionType, 'Stored session_type should match input');
      this.assert(br.session_length_hours === sessionLengthHours, 'Stored session length should be 2 hours');
      this.assert(br.timezone === timezone, 'Stored timezone should match input');
      this.assert(Array.isArray(br.preferred_connection_methods), 'Preferred connection methods should be an array');
      this.assert(
        br.preferred_connection_methods.indexOf('source_connect') !== -1 &&
          br.preferred_connection_methods.indexOf('zoom') !== -1,
        'Both Source-Connect and Zoom should be preferred connection methods'
      );
      this.assert(
        typeof br.additional_details === 'string' &&
          br.additional_details.indexOf('backup time is 2:00 PM') !== -1,
        'Additional details should include backup time note'
      );
      this.assert(typeof br.session_start === 'string', 'session_start ISO datetime should be present');
      this.assert(br.status === 'pending' || !!br.status, 'Booking status should be set (typically pending)');

      // Verify persistence in localStorage
      const storedRaw = localStorage.getItem('booking_requests') || '[]';
      const storedList = JSON.parse(storedRaw);
      const stored = storedList.find((r) => r.id === br.id);
      this.assert(!!stored, 'Stored booking request should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_SaveThreeAgencyTestimonialsToFavoriteClients() {
    const testName = 'Task 6: Save three advertising-agency testimonials to favorite clients';
    try {
      const pageContent = this.logic.getClientsTestimonialsPageContent();
      this.assert(pageContent && typeof pageContent.intro_html === 'string', 'Clients & Testimonials page content should load');

      const filterOptions = this.logic.getTestimonialFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.client_types), 'Testimonial filter options should load');

      let agencyTypeId;
      if (Array.isArray(filterOptions.client_types) && filterOptions.client_types.length > 0) {
        const ct = filterOptions.client_types.find((t) => t.id === 'advertising_marketing_agency') || filterOptions.client_types[0];
        agencyTypeId = ct.id;
      }
      this.assert(!!agencyTypeId, 'Client type id for advertising/marketing agency should be determined');

      // Adaptation: we need 3 testimonials, so use earliest year available from options
      const minYear = filterOptions.year_range && typeof filterOptions.year_range.min_year === 'number'
        ? filterOptions.year_range.min_year
        : 2019;

      const searchResult = this.logic.searchTestimonials(
        agencyTypeId, // client_type
        minYear,      // min_year
        undefined,    // max_year
        'date_desc',  // sort_by
        1,            // page
        10            // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.testimonials), 'Testimonials search should return results');
      this.assert(searchResult.testimonials.length >= 3, 'Need at least three testimonials for agencies');

      const firstThree = searchResult.testimonials.slice(0, 3);

      firstThree.forEach((t) => {
        const addResult = this.logic.addClientToFavorites(t.client_id);
        this.assert(addResult && addResult.success === true, 'Adding client to favorites should succeed');
      });

      // Open Favorite Clients view sorted by company name A-Z
      const favoritesState = this.logic.getFavoriteClients('company_name_asc');
      this.assert(favoritesState && Array.isArray(favoritesState.clients), 'Favorite clients list should be returned');
      this.assert(favoritesState.sort_by === 'company_name_asc', 'Favorite clients should be sorted by company name A-Z');

      firstThree.forEach((t) => {
        const match = favoritesState.clients.find((fc) => fc.client_id === t.client_id);
        this.assert(!!match, 'Favorite clients should contain client ' + t.client_id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_CreateProjectPlanWithinThreeHours() {
    const testName = 'Task 7: Create project plan with combined services <= 3 hours';
    try {
      const plannerPage = this.logic.getProjectPlannerPageContent();
      this.assert(plannerPage && typeof plannerPage.intro_html === 'string', 'Project Planner page content should load');

      const serviceOptions = this.logic.getProjectPlannerServiceOptions();
      this.assert(serviceOptions && Array.isArray(serviceOptions.voiceover_services), 'Project Planner service options should load');

      // Select a commercial voiceover service (up to 60 seconds, 1 hour session)
      const voServices = serviceOptions.voiceover_services || [];
      this.assert(voServices.length > 0, 'There should be at least one voiceover service');
      let voService = voServices.find((s) => s.name.indexOf('60 seconds') !== -1) || voServices[0];

      // Select an on-camera self-tape acting service (2 hours session in generated data)
      const actingServices = serviceOptions.acting_services || [];
      this.assert(actingServices.length > 0, 'There should be at least one acting service');
      let actingService = actingServices.find((s) => s.name.indexOf('self-tape') !== -1) || actingServices[0];

      const totalEstimatedDuration = (voService.session_duration_hours || 0) + (actingService.session_duration_hours || 0);
      this.assert(
        typeof totalEstimatedDuration === 'number' && totalEstimatedDuration <= 3,
        'Combined session duration should be 3 hours or less'
      );

      const title = 'VO + Acting Pilot';
      const budgetNote = 'Maximum budget: $900';
      const notes = 'If schedule is tight, prioritize recording the commercial voiceover first.';

      const serviceItems = [
        {
          service_option_id: voService.id,
          quantity: 1
        },
        {
          service_option_id: actingService.id,
          quantity: 1
        }
      ];

      const saveResult = this.logic.saveProjectPlan(
        title,
        budgetNote,
        notes,
        serviceItems
      );

      this.assert(saveResult && saveResult.success === true, 'Saving project plan should succeed');
      const plan = saveResult.project_plan;
      this.assert(plan && plan.id, 'Saved project plan should have an id');
      this.assert(plan.title === title, 'Project plan title should match input');
      this.assert(plan.budget_note === budgetNote, 'Budget note should match input');
      this.assert(plan.notes === notes, 'Notes should match input');

      this.assert(typeof plan.total_duration_hours === 'number', 'Project plan total_duration_hours should be set');
      this.assert(plan.total_duration_hours <= 3, 'Project plan total duration should be <= 3 hours');
      if (typeof plan.within_recommended_duration === 'boolean') {
        this.assert(plan.within_recommended_duration === true, 'Plan should be within recommended duration');
      }

      // Verify service items returned from saveProjectPlan
      this.assert(Array.isArray(saveResult.service_items), 'saveProjectPlan should return service_items');
      this.assert(saveResult.service_items.length === 2, 'There should be two service items in the plan');

      const itemVo = saveResult.service_items.find((i) => i.service_option_id === voService.id);
      const itemActing = saveResult.service_items.find((i) => i.service_option_id === actingService.id);
      this.assert(!!itemVo && !!itemActing, 'Both voiceover and acting services should be present in project plan');

      const itemsTotal = saveResult.service_items.reduce((sum, i) => sum + (i.total_duration_hours || 0), 0);
      this.assert(itemsTotal === plan.total_duration_hours, 'Sum of service item durations should equal plan total_duration_hours');

      // Verify persistence in localStorage
      const storedPlansRaw = localStorage.getItem('project_plans') || '[]';
      const storedPlans = JSON.parse(storedPlansRaw);
      const storedPlan = storedPlans.find((p) => p.id === plan.id);
      this.assert(!!storedPlan, 'Stored project plan should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_SubscribeToMonthlyUpdates() {
    const testName = 'Task 8: Subscribe to monthly newsletter with selected interests';
    try {
      if (typeof this.logic.getHomePageContent === 'function') {
        const home = this.logic.getHomePageContent();
        this.assert(home && typeof home.hero_title === 'string', 'Homepage content should load for newsletter flow');
      }

      const prefs = this.logic.getNewsletterPreferencesOptions();
      this.assert(prefs && Array.isArray(prefs.interest_options), 'Newsletter preference options should load');

      // Determine interest ids for commercial voiceover, animation, and drama acting
      const findInterestId = (targetId) => {
        const opt = prefs.interest_options.find((o) => o.id === targetId);
        return opt ? opt.id : null;
      };

      const commercialId = findInterestId('commercial_voiceover');
      const animationId = findInterestId('animation');
      const dramaActingId = findInterestId('drama_acting');

      this.assert(!!commercialId, 'Interest commercial_voiceover should be available');
      this.assert(!!animationId, 'Interest animation should be available');
      this.assert(!!dramaActingId, 'Interest drama_acting should be available');

      const interests = [commercialId, animationId, dramaActingId];

      // Choose monthly summary frequency
      let summaryFreqId;
      if (Array.isArray(prefs.summary_frequency_options) && prefs.summary_frequency_options.length > 0) {
        const mf = prefs.summary_frequency_options.find((f) => f.id === 'monthly_summary') || prefs.summary_frequency_options[0];
        summaryFreqId = mf.id;
      }
      this.assert(!!summaryFreqId, 'Monthly summary frequency option should be determined');

      // Weekly tips should be disabled for this flow
      const wantsWeeklyTips = false;
      const wantsCastingUpdates = true;

      const email = 'casting.researcher@example.com';

      const subscribeResult = this.logic.subscribeToNewsletter(
        email,
        interests,
        summaryFreqId,
        wantsWeeklyTips,
        wantsCastingUpdates
      );

      this.assert(subscribeResult && subscribeResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subscribeResult.subscription && subscribeResult.subscription.id, 'Subscription should have an id');

      const sub = subscribeResult.subscription;
      this.assert(sub.email === email, 'Stored subscription email should match input');
      this.assert(Array.isArray(sub.interests), 'Stored subscription interests should be an array');
      interests.forEach((id) => {
        this.assert(sub.interests.indexOf(id) !== -1, 'Subscription interests should include ' + id);
      });
      this.assert(sub.summary_frequency === summaryFreqId, 'Stored summary_frequency should match selected');
      this.assert(sub.wants_weekly_tips === wantsWeeklyTips, 'Weekly tips should be disabled');
      this.assert(
        sub.wants_casting_availability_updates === wantsCastingUpdates,
        'Casting availability updates should be enabled'
      );

      this.assert(typeof sub.subscribed_at === 'string', 'Subscription timestamp should be present');

      // Verify persistence in localStorage
      const storedSubsRaw = localStorage.getItem('newsletter_subscriptions') || '[]';
      const storedSubs = JSON.parse(storedSubsRaw);
      const stored = storedSubs.find((s) => s.id === sub.id);
      this.assert(!!stored, 'Stored newsletter subscription should be found in localStorage');

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
    console.log(' ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log(' ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
