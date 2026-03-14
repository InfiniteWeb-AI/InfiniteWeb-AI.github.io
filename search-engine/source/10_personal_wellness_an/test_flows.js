/* Test runner for business logic flows for the wellness/spirituality site */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear and init storage, then seed with generated data
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
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      affirmations: [
        {
          id: 'aff_001',
          text: 'I offer myself the same kindness I would offer a dear friend.',
          tags: ['Self-Compassion'],
          created_at: '2025-11-01T08:15:00Z',
          is_favorite: true
        },
        {
          id: 'aff_002',
          text: 'It is okay to be imperfect; I am learning and growing every day.',
          tags: ['Self-Compassion'],
          created_at: '2025-11-03T07:30:00Z',
          is_favorite: false
        },
        {
          id: 'aff_003',
          text: 'My worth is not defined by my productivity today.',
          tags: ['Self-Compassion'],
          created_at: '2025-12-10T06:45:00Z',
          is_favorite: true
        }
      ],
      articles: [
        {
          id: 'art_001',
          title: 'Mindfulness in Five Minutes: A Beginner’s Breathing Practice',
          slug: 'mindfulness-in-five-minutes-beginners-breathing-practice',
          summary: 'A short, approachable breathing exercise to introduce you to daily mindfulness.',
          body: 'Mindfulness doesn’t have to be a 30-minute session. In this beginner-friendly guide, you’ll learn a simple five-minute breathing practice you can do anytime during your day...\n\n1. Find a comfortable position...\n2. Gently close your eyes...\n3. Bring your awareness to your breath...',
          content_type: 'article',
          topics: ['Mindfulness Basics'],
          tags: ['mindfulness', 'breathwork', 'beginner'],
          author_name: 'Maya Rivers',
          reading_time_minutes: 5,
          published_at: '2026-02-10T09:00:00Z',
          hero_image_url: 'https://betterme.world/articles/wp-content/uploads/2020/12/shutterstock_1704156160.jpg',
          is_featured: true
        },
        {
          id: 'art_002',
          title: 'Noticing the Now: A 7-Minute Mindful Senses Check-In',
          slug: 'noticing-the-now-7-minute-mindful-senses-check-in',
          summary: 'Use your five senses to ground yourself in the present moment in just seven minutes.',
          body: 'This senses-based check-in is designed for busy beginners. Over the next seven minutes, you will move through sight, sound, smell, taste, and touch to gently anchor yourself in the present...\n\nStep 1: Pause and notice what you see...\nStep 2: Shift to the sounds around you...',
          content_type: 'article',
          topics: ['Mindfulness Basics'],
          tags: ['mindfulness', 'grounding', 'beginner'],
          author_name: 'Maya Rivers',
          reading_time_minutes: 7,
          published_at: '2026-01-22T14:30:00Z',
          hero_image_url: 'https://ysmtherapyomaha.com/wp-content/uploads/2020/04/senses-blog2-1080x629.jpg',
          is_featured: true
        },
        {
          id: 'art_003',
          title: 'How to Start a 10-Minute Morning Mindfulness Ritual',
          slug: '10-minute-morning-mindfulness-ritual',
          summary: 'Create a simple 10-minute ritual to begin your day with clarity and calm.',
          body: 'A short morning ritual can shift the tone of your entire day. This 10-minute practice weaves together breath, intention-setting, and gentle body awareness...\n\nMinute 1–2: Arrive in your body...\nMinute 3–5: Follow your natural breath...',
          content_type: 'article',
          topics: ['Mindfulness Basics', 'Morning Rituals'],
          tags: ['mindfulness', 'routine', 'morning'],
          author_name: 'Jonah Lee',
          reading_time_minutes: 10,
          published_at: '2025-12-05T07:45:00Z',
          hero_image_url: 'https://cdn.shopify.com/s/files/1/1543/8719/products/Printfresh_Velvet_Journal_Morning_Pink_1_1000x1000.jpg?v=1585162697',
          is_featured: false
        }
      ],
      meditation_tracks: [
        {
          id: 'med_001',
          title: 'Evening Sleep Drift: 12-Minute Body Relaxation',
          slug: 'evening-sleep-drift-12-minute-body-relaxation',
          description: 'A short, guided body relaxation to ease you into sleep on busy nights.',
          category: 'sleep',
          duration_minutes: 12,
          rating_average: 4.9,
          rating_count: 842,
          audio_url: 'https://example.com/audio/evening-sleep-drift-12min.mp3',
          published_at: '2025-11-15T21:00:00Z',
          is_guided: true,
          language: 'en'
        },
        {
          id: 'med_002',
          title: 'Soft Moonlight Sleep: 13-Minute Breath and Visualization',
          slug: 'soft-moonlight-sleep-13-minute-breath-and-visualization',
          description: 'Drift off with gentle breath cues and a calming moonlit visualization.',
          category: 'sleep',
          duration_minutes: 13,
          rating_average: 4.7,
          rating_count: 615,
          audio_url: 'https://example.com/audio/soft-moonlight-sleep-13min.mp3',
          published_at: '2025-10-02T20:30:00Z',
          is_guided: true,
          language: 'en'
        },
        {
          id: 'med_003',
          title: 'Guided Sleep Journey for Anxious Minds (15 Minutes)',
          slug: 'guided-sleep-journey-for-anxious-minds-15-minutes',
          description: 'Release the day’s worries and settle your nervous system before bed.',
          category: 'sleep',
          duration_minutes: 15,
          rating_average: 4.8,
          rating_count: 1294,
          audio_url: 'https://example.com/audio/guided-sleep-journey-15min.mp3',
          published_at: '2025-09-05T22:15:00Z',
          is_guided: true,
          language: 'en'
        }
      ],
      practices: [
        {
          id: 'pr_001',
          title: 'Gentle Evening Unwind for Beginners (20 Minutes)',
          slug: 'gentle-evening-unwind-for-beginners-20-minutes',
          description: 'A beginner-friendly evening yoga sequence to release the day’s tension and prepare for rest.',
          difficulty: 'beginner',
          intention: 'evening',
          duration_minutes: 20,
          rating_average: 4.7,
          rating_count: 412,
          steps: [
            'Begin in a comfortable seated pose, taking 5 slow breaths to arrive.',
            'Move into gentle neck rolls, synchronizing movement with breath.',
            'Transition to Cat-Cow on hands and knees to warm the spine.',
            'Flow through a few low lunges with knee down to open the hips.',
            'Come to Child’s Pose, lengthening through the arms and breathing into the back body.',
            'Lie on your back for gentle supine twists on each side.',
            'Finish in a 3–5 minute Savasana, noticing the sensations of relaxation.'
          ],
          equipment: ['yoga mat', 'blanket'],
          created_at: '2025-09-12T18:30:00Z',
          is_featured: true
        },
        {
          id: 'pr_002',
          title: 'Beginner Moon Salutations for Sleep (25 Minutes)',
          slug: 'beginner-moon-salutations-for-sleep-25-minutes',
          description: 'A calming series of Moon Salutations designed for the evening, ideal for newer practitioners.',
          difficulty: 'beginner',
          intention: 'evening',
          duration_minutes: 25,
          rating_average: 4.9,
          rating_count: 533,
          steps: [
            'Start in Mountain Pose, feeling your feet grounded on the mat.',
            'Move through a slow half Sun Salutation to warm the body.',
            'Transition into a modified Moon Salutation sequence with wide-legged side stretches.',
            'Add gentle side lunges and low squats to release the hips.',
            'Incorporate a brief standing forward fold, letting the head and neck relax.',
            'Return to the floor for seated forward folds and butterfly pose.',
            'End lying on your back with one hand on your belly and one on your heart, noticing your breath.'
          ],
          equipment: ['yoga mat'],
          created_at: '2025-10-05T20:00:00Z',
          is_featured: true
        },
        {
          id: 'pr_003',
          title: 'Soft Stretch Before Bed (30 Minutes)',
          slug: 'soft-stretch-before-bed-30-minutes',
          description: 'A slow, stretchy sequence to release tightness from the lower back, hips, and shoulders before sleep.',
          difficulty: 'beginner',
          intention: 'evening',
          duration_minutes: 30,
          rating_average: 4.6,
          rating_count: 289,
          steps: [
            'Begin in Child’s Pose, focusing on deep, even breathing.',
            'Move into Thread-the-Needle on both sides to open the shoulders.',
            'Transition to low lunge with a gentle quad stretch, using support if needed.',
            'Practice a reclining pigeon or figure-four stretch on each side.',
            'Roll onto your back for gentle hamstring stretches using a strap or towel.',
            'Take a supported bridge pose with a block or cushion under the sacrum.',
            'Close with a longer Savasana, optionally placing a blanket over the body.'
          ],
          equipment: ['yoga mat', 'blanket', 'strap or towel', 'yoga block (optional)'],
          created_at: '2025-08-20T21:10:00Z',
          is_featured: false
        }
      ],
      events: [
        {
          id: 'event_001',
          title: 'Breathwork for Anxiety',
          slug: 'breathwork-for-anxiety-online-march-10-2026',
          description: 'A gentle, beginner-friendly breathwork workshop to help you calm anxious thoughts and soften your nervous system in the evening.',
          tags: ['Breathwork for Anxiety', 'breathwork', 'anxiety relief', 'nervous system'],
          start_datetime: '2026-03-10T18:30:00Z',
          end_datetime: '2026-03-10T19:30:00Z',
          location_type: 'online',
          event_timezone: 'America/Los_Angeles',
          time_of_day_segment: 'evening',
          max_capacity: 100,
          is_recurring: false,
          created_at: '2026-02-20T10:00:00Z',
          is_featured: true,
          spots_remaining: 98.0
        },
        {
          id: 'event_002',
          title: 'Breathwork for Anxiety',
          slug: 'breathwork-for-anxiety-hybrid-march-24-2026',
          description: 'An interactive hybrid workshop combining simple breath patterns and grounding practices to ease evening anxiety.',
          tags: ['Breathwork for Anxiety', 'breathwork', 'evening practice'],
          start_datetime: '2026-03-24T20:00:00Z',
          end_datetime: '2026-03-24T21:15:00Z',
          location_type: 'hybrid',
          event_timezone: 'America/Los_Angeles',
          time_of_day_segment: 'evening',
          max_capacity: 40,
          is_recurring: false,
          created_at: '2026-02-22T11:30:00Z',
          is_featured: true,
          spots_remaining: 39.0
        },
        {
          id: 'event_003',
          title: 'Breathwork for Anxiety: Lunchtime Reset',
          slug: 'breathwork-for-anxiety-lunchtime-reset-march-5-2026',
          description: 'A short midday breathwork class to interrupt spiraling thoughts and bring you back to center.',
          tags: ['Breathwork for Anxiety', 'breathwork', 'lunchtime', 'stress relief'],
          start_datetime: '2026-03-05T12:30:00Z',
          end_datetime: '2026-03-05T13:15:00Z',
          location_type: 'online',
          event_timezone: 'America/Los_Angeles',
          time_of_day_segment: 'afternoon',
          max_capacity: 120,
          is_recurring: false,
          created_at: '2026-02-18T09:15:00Z',
          is_featured: false,
          spots_remaining: 120.0
        }
      ],
      event_registrations: [
        {
          id: 'ereg_001',
          event_id: 'event_001',
          name: 'Test User',
          email: 'testuser@example.com',
          timezone: 'America/Los_Angeles',
          registered_at: '2026-03-03T10:15:00Z',
          status: 'confirmed'
        },
        {
          id: 'ereg_002',
          event_id: 'event_001',
          name: 'Alex Rivera',
          email: 'alex.rivera@example.com',
          timezone: 'America/Chicago',
          registered_at: '2026-02-25T17:45:00Z',
          status: 'confirmed'
        },
        {
          id: 'ereg_003',
          event_id: 'event_002',
          name: 'Jamie Lee',
          email: 'jamie.lee@example.com',
          timezone: 'America/New_York',
          registered_at: '2026-02-27T09:20:00Z',
          status: 'pending'
        }
      ],
      quiz_answer_options: [
        {
          id: 'qopt_stress_01_1',
          question_id: 'quizq_stress_01',
          order_index: 1,
          text: 'Almost never',
          value: 0,
          is_default: true
        },
        {
          id: 'qopt_stress_01_2',
          question_id: 'quizq_stress_01',
          order_index: 2,
          text: 'Often or always',
          value: 2,
          is_default: false
        },
        {
          id: 'qopt_stress_02_1',
          question_id: 'quizq_stress_02',
          order_index: 1,
          text: 'I feel calm and in control most days',
          value: 0,
          is_default: true
        }
      ],
      challenge_enrollments: [
        {
          id: 'cenr_001',
          challenge_id: 'challenge_digital_detox_3day_easy',
          start_date: '2026-03-09T00:00:00Z',
          joined_at: '2026-03-03T11:00:00Z',
          status: 'not_started'
        },
        {
          id: 'cenr_002',
          challenge_id: 'challenge_digital_detox_3day_easy',
          start_date: '2026-03-02T00:00:00Z',
          joined_at: '2026-02-27T15:30:00Z',
          status: 'in_progress'
        },
        {
          id: 'cenr_003',
          challenge_id: 'challenge_morning_self_compassion_7day',
          start_date: '2026-03-01T00:00:00Z',
          joined_at: '2026-02-28T08:45:00Z',
          status: 'in_progress'
        }
      ],
      challenges: [
        {
          id: 'challenge_digital_detox_3day_easy',
          title: '3-Day Gentle Digital Detox (Easy)',
          slug: '3-day-gentle-digital-detox-easy',
          description: 'A compassionate three-day reset to help you soften screen time habits without going completely offline. Each day offers a small, doable shift and a short reflection practice.',
          tags: ['Digital Detox', 'Screen Time', 'Beginner-Friendly'],
          duration_days: 3,
          difficulty: 'easy',
          is_recommended: true,
          created_at: '2025-12-15T10:00:00Z',
          popularity_score: 2.0
        },
        {
          id: 'challenge_morning_self_compassion_7day',
          title: '7-Day Morning Self-Compassion Practice',
          slug: '7-day-morning-self-compassion-practice',
          description: 'Ease into your mornings with brief self-compassion practices, reflections, and optional affirmations to support a kinder inner voice.',
          tags: ['Self-Compassion', 'Morning Rituals', 'Mindfulness'],
          duration_days: 7,
          difficulty: 'easy',
          is_recommended: true,
          created_at: '2026-01-05T09:30:00Z',
          popularity_score: 1.0
        },
        {
          id: 'challenge_evening_sleep_reset_5day',
          title: '5-Day Evening Sleep Reset',
          slug: '5-day-evening-sleep-reset',
          description: 'A five-day sequence of short evening rituals, gentle stretches, and sleep hygiene tips to help you unwind and fall asleep more easily.',
          tags: ['Sleep', 'Evening Rituals', 'Relaxation'],
          duration_days: 5,
          difficulty: 'medium',
          is_recommended: true,
          created_at: '2025-11-20T19:15:00Z',
          popularity_score: 1.0
        }
      ],
      quiz_questions: [
        {
          id: 'quizq_stress_01',
          quiz_id: 'quiz_stress_checkin_10q',
          order_index: 1,
          text: 'How often do you feel tense, on edge, or wound up during a typical week?',
          help_text: 'Think about the last 7 days and choose the option that fits most of the time.',
          question_type: 'single_choice',
          required: true
        },
        {
          id: 'quizq_stress_02',
          quiz_id: 'quiz_stress_checkin_10q',
          order_index: 2,
          text: 'Which statement best describes how in control you feel of your daily responsibilities?',
          help_text: 'Consider work, home, and personal responsibilities together.',
          question_type: 'single_choice',
          required: true
        },
        {
          id: 'quizq_stress_03',
          quiz_id: 'quiz_stress_checkin_10q',
          order_index: 3,
          text: 'How has your sleep been affected by stress recently?',
          help_text: 'Include both how long it takes to fall asleep and how often you wake up.',
          question_type: 'single_choice',
          required: true
        }
      ],
      quizzes: [
        {
          id: 'quiz_stress_checkin_10q',
          title: 'Stress Check-in (10 questions)',
          slug: 'stress-check-in-10-questions',
          description: 'A brief 10-question check-in to help you notice how stress is affecting your body, mind, and daily life today.',
          topic: 'stress',
          estimated_duration_minutes: 5,
          created_at: '2025-11-10T09:00:00Z',
          is_active: true,
          num_questions: 10
        },
        {
          id: 'quiz_digital_detox_readiness_5q',
          title: 'Digital Detox Readiness Quiz',
          slug: 'digital-detox-readiness-quiz',
          description: 'Five quick questions to gauge your current relationship with screens and how ready you are for a gentle digital detox.',
          topic: 'digital_detox',
          estimated_duration_minutes: 3,
          created_at: '2025-10-05T15:30:00Z',
          is_active: true,
          num_questions: 4
        },
        {
          id: 'quiz_sleep_habits_8q',
          title: 'Sleep Habits Snapshot (8 questions)',
          slug: 'sleep-habits-snapshot-8-questions',
          description: 'An overview of your current sleep habits, including routines, environment, and nighttime thoughts.',
          topic: 'sleep',
          estimated_duration_minutes: 6,
          created_at: '2025-09-18T20:15:00Z',
          is_active: true,
          num_questions: 0
        }
      ]
    };

    // Persist to localStorage using storage keys from mapping
    localStorage.setItem('affirmations', JSON.stringify(generatedData.affirmations || []));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('meditation_tracks', JSON.stringify(generatedData.meditation_tracks || []));
    localStorage.setItem('practices', JSON.stringify(generatedData.practices || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations || []));
    localStorage.setItem('quiz_answer_options', JSON.stringify(generatedData.quiz_answer_options || []));
    localStorage.setItem('challenge_enrollments', JSON.stringify(generatedData.challenge_enrollments || []));
    localStorage.setItem('challenges', JSON.stringify(generatedData.challenges || []));
    localStorage.setItem('quiz_questions', JSON.stringify(generatedData.quiz_questions || []));
    localStorage.setItem('quizzes', JSON.stringify(generatedData.quizzes || []));

    // Initialize empty collections for the rest of the entities
    const emptyKeys = [
      'content_collections',
      'content_collection_items',
      'playlists',
      'playlist_items',
      'quiz_results',
      'journal_entries',
      'affirmation_sets',
      'affirmation_set_items',
      'todays_practice_plans',
      'todays_practice_items'
    ];

    emptyKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BeginnerMindfulnessReadingList();
    this.testTask2_EveningSleepMeditationPlaylist();
    this.testTask3_MoonRitualsCollectionViaSearch();
    this.testTask4_StressQuizAndJournalEntry();
    this.testTask5_RegisterForEveningBreathworkWorkshop();
    this.testTask6_MorningSelfCompassionAffirmationSet();
    this.testTask7_JoinDigitalDetoxChallengeNextMonday();
    this.testTask8_SelectHigherRatedEveningYogaToTodaysPractice();

    return this.results;
  }

  // Task 1: Create a beginner mindfulness reading list (adapted to available 3 articles)
  testTask1_BeginnerMindfulnessReadingList() {
    const testName = 'Task 1: Week 1 Mindfulness reading list flow';
    console.log('Testing:', testName);

    try {
      // Navigate to homepage (simulate via API)
      const homepage = this.logic.getHomepageOverview();
      this.assert(!!homepage, 'Homepage overview should be returned');

      // Go to Articles page & apply filters for Mindfulness Basics, 5–10 min, newest first
      const articlesResponse = this.logic.getArticlesList(
        'Mindfulness Basics', // topic
        null,                 // content_type
        null,                 // tag
        5,                    // min_reading_time
        10,                   // max_reading_time
        'newest_first',       // sort
        1,                    // page
        20                    // page_size
      );

      this.assert(Array.isArray(articlesResponse.items), 'Articles list should be an array');

      const now = new Date();
      const twelveMonthsAgo = new Date(now.getTime());
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

      const recentArticles = articlesResponse.items.filter((a) => {
        const pub = new Date(a.published_at);
        return pub >= twelveMonthsAgo;
      });

      this.assert(recentArticles.length > 0, 'Should have at least one recent mindfulness basics article');

      // We only have 3 matching articles; select up to 5 as per task
      const selectedArticles = recentArticles.slice(0, 5);
      const firstArticle = selectedArticles[0];

      // Open article detail and create new reading list with first article
      const detailBefore = this.logic.getArticleDetail(firstArticle.id);
      this.assert(detailBefore && detailBefore.article && detailBefore.article.id === firstArticle.id,
        'Article detail should match selected article');

      const createRes = this.logic.createContentCollectionAndAddItem(
        'Week 1 Mindfulness', // name
        'reading_list',       // kind
        'article',            // content_entity_type
        firstArticle.id       // content_id
      );

      this.assert(createRes.success === true, 'Should successfully create reading list and add first article');
      this.assert(createRes.collection && createRes.collection.id, 'Created collection should have an id');

      const readingListId = createRes.collection.id;

      // Add remaining selected articles to the same reading list
      for (let i = 1; i < selectedArticles.length; i++) {
        const art = selectedArticles[i];
        const addRes = this.logic.addContentToExistingCollection(
          readingListId,
          'article',
          art.id
        );
        this.assert(addRes.success === true, 'Should successfully add article ' + art.id + ' to reading list');
      }

      // Verify via collections overview
      const collections = this.logic.getContentCollectionsOverview('reading_list');
      this.assert(Array.isArray(collections), 'Collections overview should return an array');

      const createdList = collections.find((c) => c.id === readingListId);
      this.assert(!!createdList, 'Created reading list should appear in overview');
      this.assert(createdList.name === createRes.collection.name,
        'Reading list name should match created name');

      // Verify collection items in storage
      const allItems = JSON.parse(localStorage.getItem('content_collection_items') || '[]');
      const listItems = allItems.filter((item) => item.collection_id === readingListId);

      this.assert(listItems.length === selectedArticles.length,
        'Reading list should contain ' + selectedArticles.length + ' items, found ' + listItems.length);

      selectedArticles.forEach((art) => {
        const found = listItems.find((li) => li.content_id === art.id && li.content_entity_type === 'article');
        this.assert(!!found, 'Article ' + art.id + ' should be in the reading list');
      });

      // Verify article detail now reports the article as saved in this collection
      const detailAfter = this.logic.getArticleDetail(firstArticle.id);
      this.assert(detailAfter.is_saved === true, 'First article should be marked as saved');
      const inCollections = detailAfter.saved_in_collections || [];
      const savedListRef = inCollections.find((c) => c.id === readingListId);
      this.assert(!!savedListRef, 'First article detail should reference the new reading list');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Build a 3-track evening sleep meditation playlist
  testTask2_EveningSleepMeditationPlaylist() {
    const testName = 'Task 2: Evening Wind Down sleep meditation playlist flow';
    console.log('Testing:', testName);

    try {
      // Navigate to Meditations & apply filters: Sleep, 12–18 min, rating >= 4.5, shortest first
      const tracksResponse = this.logic.getMeditationTracksList(
        'sleep',             // category
        12,                  // min_duration
        18,                  // max_duration
        4.5,                 // min_rating
        'duration_shortest_first', // sort
        1,                   // page
        10                   // page_size
      );

      this.assert(Array.isArray(tracksResponse.items), 'Meditation tracks list should be an array');
      this.assert(tracksResponse.items.length >= 1, 'Should have at least one sleep meditation matching filters');

      // Choose first three shortest tracks (or fewer if less available)
      const selectedTracks = tracksResponse.items.slice(0, 3);
      this.assert(selectedTracks.length > 0, 'Should select at least one track');

      // Create playlist with first track
      const firstTrack = selectedTracks[0];
      const createRes = this.logic.createPlaylistAndAddTrack(
        'Evening Wind Down', // name
        '',                  // description
        firstTrack.id        // track_id
      );

      this.assert(createRes.success === true, 'Should successfully create playlist and add first track');
      this.assert(createRes.playlist && createRes.playlist.id, 'Playlist should have an id');

      const playlistId = createRes.playlist.id;

      // Add second and third tracks to existing playlist
      for (let i = 1; i < selectedTracks.length; i++) {
        const t = selectedTracks[i];
        const addRes = this.logic.addTrackToPlaylist(t.id, playlistId);
        this.assert(addRes.success === true, 'Should add track ' + t.id + ' to playlist');
      }

      // Open Playlists overview and then playlist detail
      const playlistsOverview = this.logic.getPlaylistsOverview();
      this.assert(Array.isArray(playlistsOverview.items), 'Playlists overview should return items array');

      const createdPlaylist = playlistsOverview.items.find((p) => p.id === playlistId);
      this.assert(!!createdPlaylist, 'Created Evening Wind Down playlist should appear in overview');

      const detail = this.logic.getPlaylistDetail(playlistId);
      this.assert(detail && detail.playlist && Array.isArray(detail.tracks),
        'Playlist detail should include playlist and tracks array');

      const tracksInPlaylist = detail.tracks;
      this.assert(tracksInPlaylist.length === selectedTracks.length,
        'Playlist should contain ' + selectedTracks.length + ' tracks, found ' + tracksInPlaylist.length);

      // Verify each selected track is present and within duration/rating constraints
      selectedTracks.forEach((t) => {
        const found = tracksInPlaylist.find((row) => row.track && row.track.id === t.id);
        this.assert(!!found, 'Track ' + t.id + ' should be in playlist');
        this.assert(found.track.duration_minutes >= 12 && found.track.duration_minutes <= 18,
          'Track ' + t.id + ' duration should be between 12 and 18 minutes');
        this.assert(found.track.rating_average >= 4.5,
          'Track ' + t.id + ' rating should be at least 4.5');
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Bookmark most recent guides into a Moon Rituals collection
  // Adaptation: use search to find recent articles (no guides in generated data),
  // filter to article results, and save top 3 into a 'Moon Rituals' collection.
  testTask3_MoonRitualsCollectionViaSearch() {
    const testName = 'Task 3: Moon Rituals collection via search flow (adapted to articles)';
    console.log('Testing:', testName);

    try {
      // Simulate search for relevant content (using a general mindfulness query due to limited data)
      const searchRes = this.logic.searchSiteContent(
        'mindfulness',       // query
        ['article'],         // content_types (stand-in for Guides only)
        'newest_first',      // sort
        1,                   // page
        10                   // page_size
      );

      this.assert(searchRes && Array.isArray(searchRes.results), 'Search results should be an array');
      this.assert(searchRes.results.length > 0, 'Search should return at least one result');

      // Filter to article results and pick up to 3 newest
      const articleResults = searchRes.results.filter((r) => r.result_type === 'article');
      const selected = articleResults.slice(0, 3);
      this.assert(selected.length > 0, 'Should select at least one article result');

      // Open first result, create Moon Rituals collection and add it
      const firstResult = selected[0];
      const createRes = this.logic.createContentCollectionAndAddItem(
        'Moon Rituals',      // name
        'collection',        // kind
        'article',           // content_entity_type
        firstResult.id       // content_id
      );

      this.assert(createRes.success === true, 'Should create Moon Rituals collection and add first item');
      this.assert(createRes.collection && createRes.collection.id, 'Created collection should have an id');

      const collectionId = createRes.collection.id;

      // Add remaining selected results directly to existing collection
      for (let i = 1; i < selected.length; i++) {
        const res = selected[i];
        const addRes = this.logic.addContentToExistingCollection(
          collectionId,
          'article',
          res.id
        );
        this.assert(addRes.success === true, 'Should add result ' + res.id + ' to Moon Rituals');
      }

      // Verify collection via overview and storage
      const collections = this.logic.getContentCollectionsOverview('collection');
      this.assert(Array.isArray(collections), 'Collections overview should be array');

      const moonCollection = collections.find((c) => c.id === collectionId);
      this.assert(!!moonCollection, 'Moon Rituals collection should appear in overview');
      this.assert(moonCollection.name === createRes.collection.name,
        'Moon Rituals collection name should match');

      const allItems = JSON.parse(localStorage.getItem('content_collection_items') || '[]');
      const colItems = allItems.filter((item) => item.collection_id === collectionId);

      this.assert(colItems.length === selected.length,
        'Moon Rituals should contain ' + selected.length + ' items, found ' + colItems.length);

      selected.forEach((res) => {
        const found = colItems.find((ci) => ci.content_id === res.id && ci.content_entity_type === 'article');
        this.assert(!!found, 'Result ' + res.id + ' should be in Moon Rituals');
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Complete stress quiz and record result in journal
  testTask4_StressQuizAndJournalEntry() {
    const testName = 'Task 4: Stress Check-in quiz and journal entry flow';
    console.log('Testing:', testName);

    try {
      // Navigate to Quizzes and locate Stress Check-in quiz
      const quizzesList = this.logic.getQuizzesList('stress');
      this.assert(quizzesList && Array.isArray(quizzesList.items), 'Quizzes list should be array');

      const stressEntry = quizzesList.items.find((item) => item.quiz && item.quiz.title.indexOf('Stress Check-in') !== -1);
      this.assert(!!stressEntry, 'Should find Stress Check-in quiz in list');

      const stressQuiz = stressEntry.quiz;

      // Get quiz detail with questions and answer options
      const quizDetail = this.logic.getQuizDetail(stressQuiz.id);
      this.assert(quizDetail && Array.isArray(quizDetail.questions), 'Quiz detail should include questions array');
      this.assert(quizDetail.questions.length > 0, 'Stress quiz should have at least one question');

      // Select first available answer for each question
      const answers = quizDetail.questions.map((row) => {
        const q = row.question;
        const opts = row.answer_options || [];
        this.assert(opts.length > 0, 'Question ' + q.id + ' should have answer options');
        const firstOption = opts.slice().sort((a, b) => a.order_index - b.order_index)[0];
        return {
          question_id: q.id,
          selected_option_ids: [firstOption.id]
        };
      });

      const submitRes = this.logic.submitQuizAnswers(stressQuiz.id, answers);
      this.assert(submitRes.success === true, 'Submitting quiz answers should succeed');
      this.assert(submitRes.quiz_result && submitRes.quiz_result.id, 'QuizResult should be returned with id');

      const quizResult = submitRes.quiz_result;
      this.assert(typeof quizResult.overall_label === 'string' && quizResult.overall_label.length > 0,
        'QuizResult should have an overall_label');

      // Create journal entry including overall stress level label and today’s date in title
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = yyyy + '-' + mm + '-' + dd;

      const title = 'Stress Check-in Result - ' + todayStr;
      const body = 'My overall stress level today is ' + quizResult.overall_label + ' based on the stress check-in quiz.';

      const createJournalRes = this.logic.createJournalEntry(
        title,
        body,
        'quiz_result',          // source_type
        quizResult.id           // source_reference_id
      );

      this.assert(createJournalRes.success === true, 'Creating journal entry should succeed');
      this.assert(createJournalRes.entry && createJournalRes.entry.id, 'Journal entry should have an id');

      const journalList = this.logic.getJournalEntriesList(1, 50);
      this.assert(journalList && Array.isArray(journalList.items), 'Journal entries list should be array');

      const createdEntry = journalList.items.find((e) => e.id === createJournalRes.entry.id);
      this.assert(!!createdEntry, 'Created journal entry should appear in list');
      this.assert(createdEntry.title === title, 'Journal entry title should match');
      this.assert(createdEntry.body === body, 'Journal entry body should match');
      this.assert(createdEntry.source_type === 'quiz_result', 'Journal entry source_type should be quiz_result');
      this.assert(createdEntry.source_reference_id === quizResult.id,
        'Journal entry should reference the quiz result id');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Register for next evening Breathwork for Anxiety workshop
  testTask5_RegisterForEveningBreathworkWorkshop() {
    const testName = 'Task 5: Register for evening Breathwork for Anxiety workshop flow';
    console.log('Testing:', testName);

    try {
      // Get default event filter options (not strictly required but simulates UI)
      const eventFilters = this.logic.getEventFilterOptions();
      this.assert(!!eventFilters, 'Event filter options should be returned');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const startDateStr = yyyy + '-' + mm + '-' + dd;

      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const yyyy2 = thirtyDaysFromNow.getFullYear();
      const mm2 = String(thirtyDaysFromNow.getMonth() + 1).padStart(2, '0');
      const dd2 = String(thirtyDaysFromNow.getDate()).padStart(2, '0');
      const endDateStr = yyyy2 + '-' + mm2 + '-' + dd2;

      // Filter events: keyword, date range, evening, soonest first
      const listRes = this.logic.getEventsList(
        'Breathwork for Anxiety', // keyword
        startDateStr,             // start_date
        endDateStr,               // end_date
        'evening',                // time_of_day_segment
        'soonest_date_first',     // sort
        1,                        // page
        10                        // page_size
      );

      this.assert(listRes && Array.isArray(listRes.items), 'Events list should be array');
      this.assert(listRes.items.length > 0, 'Should have at least one matching event in range');

      const nextWorkshop = listRes.items[0];

      // Open event detail (simulate navigation)
      const detail = this.logic.getEventDetail(nextWorkshop.id);
      this.assert(detail && detail.id === nextWorkshop.id, 'Event detail should match selected event');

      // Register for event
      const registrationRes = this.logic.registerForEvent(
        nextWorkshop.id,
        'Test User',
        'testuser@example.com',
        'America/Los_Angeles'
      );

      this.assert(registrationRes.success === true, 'Event registration should succeed');
      this.assert(registrationRes.registration && registrationRes.registration.id,
        'Registration should include an id');

      const registration = registrationRes.registration;
      this.assert(registration.event_id === nextWorkshop.id,
        'Registration should reference the correct event');
      this.assert(registration.name === 'Test User', 'Registration name should match');
      this.assert(registration.email === 'testuser@example.com', 'Registration email should match');
      this.assert(registration.timezone === 'America/Los_Angeles', 'Registration timezone should match');

      // Verify persisted registration in localStorage
      const allRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const stored = allRegs.find((r) => r.id === registration.id);
      this.assert(!!stored, 'Registration should be stored in event_registrations');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Create Morning Self-Compassion affirmation set and schedule 7:00 AM daily
  // Adaptation: only 3 Self-Compassion affirmations available; use all 3 while preserving flow.
  testTask6_MorningSelfCompassionAffirmationSet() {
    const testName = 'Task 6: Morning Self-Compassion affirmation set flow';
    console.log('Testing:', testName);

    try {
      // Fetch affirmation filter options (simulate UI tag selection)
      const affFilters = this.logic.getAffirmationFilterOptions();
      this.assert(!!affFilters, 'Affirmation filter options should be returned');

      // Filter affirmations by Self-Compassion tag
      const listRes = this.logic.getAffirmationsList('Self-Compassion', 1, 50);
      this.assert(listRes && Array.isArray(listRes.items), 'Affirmations list should be array');
      this.assert(listRes.items.length > 0, 'Should have at least one Self-Compassion affirmation');

      const selectedAffirmations = listRes.items.slice(0, 5); // we only have 3, so this will pick all
      const firstAff = selectedAffirmations[0];

      // Create new set with first affirmation
      const createSetRes = this.logic.createAffirmationSetAndAddItem(
        'Morning Self-Compassion', // name
        '',                        // description
        firstAff.id                // affirmation_id
      );

      this.assert(createSetRes.success === true, 'Affirmation set creation should succeed');
      this.assert(createSetRes.set && createSetRes.set.id, 'Created set should have an id');

      const setId = createSetRes.set.id;

      // Add remaining affirmations to existing set
      for (let i = 1; i < selectedAffirmations.length; i++) {
        const aff = selectedAffirmations[i];
        const addRes = this.logic.addAffirmationToExistingSet(setId, aff.id);
        this.assert(addRes.success === true, 'Should add affirmation ' + aff.id + ' to set');
      }

      // Verify set detail
      const setDetail = this.logic.getAffirmationSetDetail(setId);
      this.assert(setDetail && setDetail.set && Array.isArray(setDetail.items),
        'Affirmation set detail should include set and items array');

      const items = setDetail.items;
      this.assert(items.length === selectedAffirmations.length,
        'Set should contain ' + selectedAffirmations.length + ' affirmations, found ' + items.length);

      selectedAffirmations.forEach((aff) => {
        const found = items.find((row) => row.affirmation && row.affirmation.id === aff.id);
        this.assert(!!found, 'Affirmation ' + aff.id + ' should be in the set');
      });

      // Schedule the set for 7:00 AM daily
      const scheduleRes = this.logic.updateAffirmationSetSchedule(
        setId,
        true,           // reminder_enabled
        '07:00',        // schedule_time
        'daily'         // schedule_frequency
      );

      this.assert(scheduleRes.success === true, 'Updating affirmation set schedule should succeed');
      this.assert(scheduleRes.set && scheduleRes.set.id === setId,
        'Updated schedule should belong to the created set');
      this.assert(scheduleRes.set.reminder_enabled === true,
        'Reminder should be enabled for set');
      this.assert(scheduleRes.set.schedule_time === '07:00',
        'Schedule time should be 07:00');
      this.assert(scheduleRes.set.schedule_frequency === 'daily',
        'Schedule frequency should be daily');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Join an easy 3-day digital detox challenge starting next Monday
  testTask7_JoinDigitalDetoxChallengeNextMonday() {
    const testName = 'Task 7: Join 3-day Digital Detox challenge starting next Monday flow';
    console.log('Testing:', testName);

    try {
      // Fetch challenge filter options
      const challengeFilters = this.logic.getChallengeFilterOptions();
      this.assert(!!challengeFilters, 'Challenge filter options should be returned');

      // List challenges filtered by duration 3 days and difficulty easy
      const challengesRes = this.logic.getChallengesList(
        null,            // tag (we will filter by title/tags manually)
        3,               // duration_days
        'easy',          // difficulty
        'most_popular',  // sort
        1,               // page
        20               // page_size
      );

      this.assert(challengesRes && Array.isArray(challengesRes.items), 'Challenges list should be array');
      this.assert(challengesRes.items.length > 0, 'Should have at least one easy 3-day challenge');

      // Find a Digital Detox challenge among returned ones
      const digitalDetox = challengesRes.items.find((c) => {
        const titleMatch = typeof c.title === 'string' && c.title.toLowerCase().indexOf('digital detox') !== -1;
        const hasTag = Array.isArray(c.tags) && c.tags.some((t) => String(t).toLowerCase().indexOf('digital detox') !== -1);
        return titleMatch || hasTag;
      });

      this.assert(!!digitalDetox, 'Should find a Digital Detox challenge');

      // Compute upcoming Monday from today
      const today = new Date();
      const day = today.getDay(); // 0 = Sun, 1 = Mon, ...
      const daysUntilMonday = (1 - day + 7) % 7 || 7; // next Monday, not today even if Monday
      const nextMonday = new Date(today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
      const yyyy = nextMonday.getFullYear();
      const mm = String(nextMonday.getMonth() + 1).padStart(2, '0');
      const dd = String(nextMonday.getDate()).padStart(2, '0');
      const nextMondayStr = yyyy + '-' + mm + '-' + dd;

      // Enroll in challenge with chosen start date
      const enrollRes = this.logic.enrollInChallenge(digitalDetox.id, nextMondayStr);
      this.assert(enrollRes.success === true, 'Challenge enrollment should succeed');
      this.assert(enrollRes.enrollment && enrollRes.enrollment.id,
        'Enrollment should have an id');

      const enrollment = enrollRes.enrollment;
      this.assert(enrollment.challenge_id === digitalDetox.id,
        'Enrollment should reference the selected challenge');

      // Verify stored enrollment date matches chosen date (by Y-M-D component)
      const storedDate = new Date(enrollment.start_date);
      const storedY = storedDate.getFullYear();
      const storedM = String(storedDate.getMonth() + 1).padStart(2, '0');
      const storedD = String(storedDate.getDate()).padStart(2, '0');
      const storedStr = storedY + '-' + storedM + '-' + storedD;
      this.assert(storedStr === nextMondayStr,
        'Enrollment start date should match chosen upcoming Monday');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Select higher-rated beginner evening yoga sequence >= 20 min and add to Today's Practice
  testTask8_SelectHigherRatedEveningYogaToTodaysPractice() {
    const testName = 'Task 8: Select higher-rated evening yoga and add to Today’s Practice flow';
    console.log('Testing:', testName);

    try {
      // Fetch practice filter options
      const practiceFilters = this.logic.getPracticeFilterOptions();
      this.assert(!!practiceFilters, 'Practice filter options should be returned');

      // Filter practices: beginner, evening, min 20 min
      const practicesRes = this.logic.getPracticesList(
        'beginner',          // difficulty
        'evening',           // intention
        20,                  // min_duration
        null,                // max_duration
        'top_rated',         // sort
        1,                   // page
        20                   // page_size
      );

      this.assert(practicesRes && Array.isArray(practicesRes.items), 'Practices list should be array');
      this.assert(practicesRes.items.length >= 2, 'Should have at least two beginner evening practices');

      const firstTwo = practicesRes.items.slice(0, 2);
      const p1 = firstTwo[0];
      const p2 = firstTwo[1];

      // Determine which has higher rating (if equal, choose first)
      const betterPractice = (p2.rating_average > p1.rating_average) ? p2 : p1;

      // Add chosen practice to Today’s Practice (for today)
      const addRes = this.logic.addPracticeToTodaysPractice(betterPractice.id);
      this.assert(addRes.success === true, 'Adding practice to Today’s Practice should succeed');
      this.assert(addRes.plan && addRes.plan.id, 'Today’s Practice plan should have an id');
      this.assert(addRes.item && addRes.item.id, 'Today’s Practice item should have an id');

      const planId = addRes.plan.id;
      const addedItemId = addRes.item.id;

      // Fetch today’s practice summary and verify inclusion
      const summaryRes = this.logic.getTodaysPracticeSummary();
      this.assert(summaryRes && summaryRes.plan && Array.isArray(summaryRes.items),
        'Today’s Practice summary should include plan and items');

      this.assert(summaryRes.plan.id === planId,
        'Summary plan id should match plan returned by addPracticeToTodaysPractice');

      const items = summaryRes.items;
      const found = items.find((row) => row.practice_item && row.practice_item.id === addedItemId);
      this.assert(!!found, 'Newly added practice item should appear in today’s practice items');
      this.assert(found.practice && found.practice.id === betterPractice.id,
        'Practice in today’s plan should match the higher-rated selected practice');

      // Verify the plan’s total duration is at least the practice duration
      this.assert(summaryRes.total_duration_minutes >= betterPractice.duration_minutes,
        'Total duration for Today’s Practice should be at least the duration of the added practice');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // --- Helper methods ---

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
