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
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (adapted only for string quoting)
    var generatedData = {
      events: [
        {
          id: 'online_qna_march4_2025',
          title: 'Online Q&A: Worldbuilding Secrets',
          description: 'A live online Q&A session focused on worldbuilding, magic systems, and creating believable fantasy settings.',
          start_datetime: '2025-03-04T18:00:00-05:00',
          end_datetime: '2025-03-04T19:30:00-05:00',
          event_type: 'online',
          location: 'Online',
          online_access_link: 'Zoom link will be emailed to registered attendees 24 hours before the event.',
          timezone: 'America/New_York',
          createdAt: '2024-12-15T10:00:00-05:00',
          updatedAt: '2024-12-15T10:00:00-05:00'
        },
        {
          id: 'online_launch_march10_2025',
          title: 'Virtual Book Launch: Echoes of Starlight',
          description: 'Celebrate the launch of \'Echoes of Starlight\' with a live reading, behind-the-scenes stories, and audience Q&A.',
          start_datetime: '2025-03-10T20:00:00-05:00',
          end_datetime: '2025-03-10T21:30:00-05:00',
          event_type: 'online',
          location: 'Online',
          online_access_link: 'Event will be streamed via YouTube Live; link provided upon registration.',
          timezone: 'America/New_York',
          createdAt: '2025-01-05T09:30:00-05:00',
          updatedAt: '2025-01-05T09:30:00-05:00'
        },
        {
          id: 'online_workshop_march18_2025',
          title: 'Online Workshop: Plotting Multi-Book Series',
          description: 'A two-hour interactive workshop on planning and outlining long-running fantasy and sci-fi series.',
          start_datetime: '2025-03-18T19:00:00-04:00',
          end_datetime: '2025-03-18T21:00:00-04:00',
          event_type: 'online',
          location: 'Online',
          online_access_link: 'Workshop hosted on Crowdcast; access details sent after registration.',
          timezone: 'America/New_York',
          createdAt: '2025-01-20T14:15:00-05:00',
          updatedAt: '2025-01-20T14:15:00-05:00'
        }
      ],
      library_lists: [
        {
          id: 'main_reading_list',
          name: 'Main Reading List',
          list_type: 'book_reading_list',
          description: 'Your primary reading list for books you plan to read next.',
          is_default: true,
          createdAt: '2023-06-01T09:00:00Z',
          updatedAt: '2025-12-31T12:00:00Z'
        },
        {
          id: 'summer_2025',
          name: 'Summer 2025',
          list_type: 'book_wishlist',
          description: 'Wishlist of books to read during Summer 2025.',
          is_default: false,
          createdAt: '2024-12-20T14:30:00Z',
          updatedAt: '2025-01-05T10:15:00Z'
        },
        {
          id: 'favorites',
          name: 'Favorites',
          list_type: 'favorites',
          description: 'Quick access list for your favorite books.',
          is_default: true,
          createdAt: '2023-06-01T09:05:00Z',
          updatedAt: '2025-11-10T16:45:00Z'
        }
      ],
      reviews: [
        {
          id: 'rev_echoes_001',
          bookId: 'novel_echoes_of_starlight',
          rating: 4.8,
          title: 'Lush, immersive fantasy',
          body: 'The worldbuilding in this book is incredibly rich without ever feeling overwhelming. I especially loved the way the magic tied into the emotional arcs.',
          reviewer_name: 'A. Harper',
          createdAt: '2025-01-12T14:23:00Z'
        },
        {
          id: 'rev_echoes_002',
          bookId: 'novel_echoes_of_starlight',
          rating: 4.6,
          title: 'Couldn\u2019t put it down',
          body: 'Great pacing, memorable characters, and a finale that actually sticks the landing. A few slow spots in the middle, but overall a fantastic read.',
          reviewer_name: 'Bookwyrm77',
          createdAt: '2025-01-20T09:05:00Z'
        },
        {
          id: 'rev_shadows_001',
          bookId: 'novel_shadows_in_orbit',
          rating: 4.7,
          title: 'Character-driven space mystery',
          body: 'This blended sci-fi and mystery in a really satisfying way. The found-family crew dynamic made the twists hit even harder.',
          reviewer_name: 'Celeste R.',
          createdAt: '2024-11-03T18:41:00Z'
        }
      ],
      books: [
        {
          id: 'novel_echoes_of_starlight',
          title: 'Echoes of Starlight',
          subtitle: 'A Luminous YA Fantasy',
          description: 'When a comet appears over the island city of Lyria, seventeen-year-old Mara discovers she can hear the stars sing\u2014and that their song is fading. To save her world, she must unravel an ancient prophecy and confront a forgotten betrayal.',
          genre: 'young_adult',
          work_type: 'novel',
          format: 'hardcover',
          price: 21.99,
          currency: 'USD',
          page_count: 432,
          publication_date: '2020-03-10T00:00:00Z',
          is_featured: true,
          cover_image_url: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=800&h=600&fit=crop&auto=format&q=80',
          keywords: [
            'young adult',
            'fantasy',
            'magic',
            'prophecy',
            'coming of age',
            'echoes of starlight'
          ],
          createdAt: '2019-12-15T10:00:00Z',
          updatedAt: '2025-01-05T09:30:00Z',
          rating_count: 2,
          rating: 4.7
        },
        {
          id: 'novel_shadows_in_orbit',
          title: 'Shadows in Orbit',
          subtitle: 'A Starship Mystery',
          description: 'On the fringes of colonized space, the research vessel Aurora discovers a derelict ship with no life signs and a black box that has been deliberately wiped. As engineer-turned-sleuth Lyra investigates, she uncovers a conspiracy that could rewrite humanity\u2019s place among the stars.',
          genre: 'science_fiction',
          work_type: 'novel',
          format: 'ebook',
          price: 7.99,
          currency: 'USD',
          page_count: 412,
          publication_date: '2024-09-15T00:00:00Z',
          is_featured: true,
          cover_image_url: 'https://mir-s3-cdn-cf.behance.net/project_modules/disp/3c621b118598485.608c1e19061b0.jpg',
          keywords: [
            'science fiction',
            'space opera',
            'mystery',
            'starship',
            'found family',
            'shadows in orbit'
          ],
          createdAt: '2024-07-20T09:00:00Z',
          updatedAt: '2024-11-03T18:41:00Z',
          rating_count: 1,
          rating: 4.7
        },
        {
          id: 'novella_whispers_in_code',
          title: 'Whispers in Code',
          subtitle: 'A Cyberpunk Novella',
          description: 'In a neon-drenched megacity where memories can be edited like software, a data diver hears a voice in the code begging to be set free. To uncover the truth, she must break the law, hack her own past, and decide what it means to be real.',
          genre: 'science_fiction',
          work_type: 'novella',
          format: 'ebook',
          price: 3.99,
          currency: 'USD',
          page_count: 96,
          publication_date: '2024-08-01T00:00:00Z',
          is_featured: false,
          cover_image_url: 'https://t3.ftcdn.net/jpg/03/59/29/52/360_F_359295214_OZ8jMEFSIGYaAqzupw52JvqnKuHQqnl5.jpg',
          keywords: [
            'science fiction',
            'cyberpunk',
            'short read',
            'novella',
            'virtual reality',
            'memory'
          ],
          createdAt: '2024-06-10T13:20:00Z',
          updatedAt: '2024-09-15T11:12:00Z',
          rating_count: 1,
          rating: 4.9
        }
      ],
      blog_posts: [
        {
          id: 'finding_your_storys_north_star',
          title: 'Finding Your Story\u2019s North Star',
          slug: 'finding-your-storys-north-star',
          excerpt: 'How to choose a guiding question for your draft so you stop wandering in the middle and start writing with intention.',
          content: 'Every novel I write begins with a question I don\u2019t know how to answer yet. Not a plot twist, not a theme statement, but a question. For ECHOES OF STARLIGHT, it was: What would you sacrifice if you knew the world would never remember you did it?\n\nIn this post, we\u2019ll walk through a simple process for identifying your story\u2019s \u201cNorth Star\u201d question, testing whether it\u2019s specific enough to shape scenes, and using it to make decisions when you\u2019re stuck in the mushy middle.\n\n1. Start with the emotion you want the reader to feel at the end.\n2. Turn that emotion into a question your protagonist can\u2019t easily answer.\n3. Check that at least three major scenes in your outline put pressure on that question.\n4. Write the question on a sticky note and tape it to your monitor.\n\nWhenever you\u2019re unsure what happens next, ask: which choice will put more pressure on this question? That\u2019s usually the more interesting option.',
          published_at: '2024-06-05T14:00:00Z',
          tags: ['writing_process', 'craft'],
          status: 'published',
          comment_count: 4
        },
        {
          id: 'drafting_vs_revising_brain_modes',
          title: 'Drafting vs Revising: Switching Brain Modes',
          slug: 'drafting-vs-revising-switching-brain-modes',
          excerpt: 'Your drafting brain and your revising brain want completely different things. Here\u2019s how to stop making them fight.',
          content: 'Writers often describe drafting as discovery and revising as problem-solving\u2014and then try to do both at once. No wonder it feels impossible.\n\nIn this article, I break the process into two distinct brain modes:\n\n**Drafting Mode**\n- Your only job is to generate material.\n- You\u2019re allowed to be messy, repetitive, and clich\u00e9d.\n- You measure success in words written, not quality.\n\n**Revising Mode**\n- Your job is to make decisions.\n- You question every scene\u2019s purpose.\n- You measure success in clarity and impact.\n\nWe\u2019ll talk about concrete rituals you can use to cue each mode (different playlists, locations, or even fonts), and I\u2019ll share the three questions I ask before I allow myself to start revising any new project.',
          published_at: '2023-11-12T16:30:00Z',
          tags: ['writing_process', 'craft'],
          status: 'published',
          comment_count: 2
        },
        {
          id: 'daily_writing_habit_real_life',
          title: 'Building a Daily Writing Habit That Survives Real Life',
          slug: 'building-a-daily-writing-habit-that-survives-real-life',
          excerpt: 'Perfectionism destroys more writing routines than laziness ever will. Let\u2019s design a habit that bends without breaking.',
          content: 'Most writing advice assumes you have unlimited time, quiet, and energy. I don\u2019t\u2014and I\u2019m guessing you don\u2019t either.\n\nIn this post, we\u2019ll design a flexible daily habit using three pillars:\n\n1. **Minimum viable session**: the tiniest unit of progress that still counts.\n2. **Triggers and anchors**: habits that happen right before and after writing.\n3. **Failure planning**: what you\u2019ll do on the days everything falls apart.\n\nI\u2019ll share examples from my own schedule during book tours, day-job crunches, and family emergencies, plus a worksheet you can adapt to your life right now\u2014not your imaginary perfect writing life five years from now.',
          published_at: '2022-09-18T09:15:00Z',
          tags: ['writing_process', 'productivity'],
          status: 'published',
          comment_count: 0
        }
      ],
      comments: [
        {
          id: 'cmt_scenecheck_001',
          postId: 'scene_by_scene_revisions_2026',
          author_name: 'Lena M.',
          body: 'I used this checklist on a messy second draft chapter tonight and immediately spotted two scenes that weren\u2019t actually changing anything. Cut them and the pacing already feels better.',
          createdAt: '2026-02-26T12:05:00Z',
          status: 'approved'
        },
        {
          id: 'cmt_scenecheck_002',
          postId: 'scene_by_scene_revisions_2026',
          parentCommentId: 'cmt_scenecheck_001',
          author_name: 'Author',
          body: 'That\u2019s awesome to hear! The \u201cdoes this scene change something?\u201d question is usually the one that hurts the most, but it\u2019s also the most clarifying.',
          createdAt: '2026-02-26T15:42:00Z',
          status: 'approved'
        },
        {
          id: 'cmt_scenecheck_003',
          postId: 'scene_by_scene_revisions_2026',
          author_name: 'Jonas',
          body: 'Saved this and printed the worksheet. I\u2019ve always struggled with revisions feeling vague\u2014having concrete questions for each scene makes it feel doable.',
          createdAt: '2026-02-27T08:10:00Z',
          status: 'approved'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:14:08.857894'
      }
    };

    // Copy generated data to localStorage using correct storage keys
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('library_lists', JSON.stringify(generatedData.library_lists));
    localStorage.setItem('reviews', JSON.stringify(generatedData.reviews));
    localStorage.setItem('books', JSON.stringify(generatedData.books));
    localStorage.setItem('blog_posts', JSON.stringify(generatedData.blog_posts));
    localStorage.setItem('comments', JSON.stringify(generatedData.comments));
    // Other storage keys are initialized by business logic
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddNewestAffordableSciFiToMainReadingList();
    this.testTask2_FavoriteLongerOfTwoSciFiUsingCompare();
    this.testTask3_ReviewShortWorkWithFourStarRating();
    this.testTask4_RegisterForEarliestOnlineEventMarch2025();
    this.testTask5_CreateSciFiEbookBundleAndAddToCart();
    this.testTask6_SendBulkOrderContactMessage();
    this.testTask7_AddCheapestYoungAdultBooksToSummerWishlist();
    this.testTask8_SaveRecentWritingProcessPostToReadingList();

    return this.results;
  }

  // Task 1 (adapted): Add newest affordable science fiction book to Main Reading List
  testTask1_AddNewestAffordableSciFiToMainReadingList() {
    var testName = 'Task 1: Add newest affordable sci-fi book to Main Reading List (adapted)';
    console.log('Testing:', testName);

    try {
      // Simulate homepage load
      var home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page content should load');

      var maxPrice = 18;

      // Filter science fiction books under maxPrice, sorted by newest publication date
      var searchResult = this.logic.searchBooks(
        null,
        { genre: 'science_fiction', price_max: maxPrice },
        'publication_date_desc',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBooks should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one science fiction book under max price');

      var selectedBook = searchResult.results[0];
      this.assert(selectedBook.genre === 'science_fiction', 'Selected book should have science_fiction genre');
      this.assert(selectedBook.price <= maxPrice, 'Selected book price should be at or below max price');

      // Get reading lists and locate Main Reading List
      var lists = this.logic.getLibraryLists('book_reading_list');
      this.assert(Array.isArray(lists), 'getLibraryLists should return an array');

      var mainList = null;
      for (var i = 0; i < lists.length; i++) {
        var list = lists[i];
        if (list && (list.name === 'Main Reading List' || list.is_default === true)) {
          mainList = list;
          if (list.name === 'Main Reading List') {
            break;
          }
        }
      }
      this.assert(mainList && mainList.id, 'Main reading list should exist');

      // Add selected book to Main Reading List
      var addResult = this.logic.addBookToLibraryList(mainList.id, selectedBook.id);
      this.assert(addResult && addResult.success === true, 'addBookToLibraryList should succeed');

      // Verify exactly one instance of this book is in Main Reading List
      var listItemsData = this.logic.getLibraryListItems(mainList.id);
      this.assert(listItemsData && listItemsData.list && listItemsData.list.id === mainList.id, 'getLibraryListItems should return the correct list');

      var items = listItemsData.items || [];
      var foundCount = 0;
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (item && item.book && item.book.id === selectedBook.id) {
          foundCount++;
        }
      }
      this.assert(foundCount === 1, 'Exactly one instance of the selected book should be in Main Reading List, found ' + foundCount);

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Favorite the longer of two sci-fi novels under 20 using compare feature
  testTask2_FavoriteLongerOfTwoSciFiUsingCompare() {
    var testName = 'Task 2: Favorite longer of two sci-fi novels under 20 using compare (adapted)';
    console.log('Testing:', testName);

    try {
      // Simulate homepage
      var home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page content should load');

      var maxPrice = 20;

      // Search for science fiction novels under maxPrice
      var searchResult = this.logic.searchBooks(
        null,
        { genre: 'science_fiction', price_max: maxPrice },
        'relevance',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBooks should return results array');
      this.assert(searchResult.results.length >= 2, 'There should be at least two science fiction books under max price for comparison');

      var firstBook = searchResult.results[0];
      var secondBook = searchResult.results[1];

      // Add first two results to compare set
      var compareAdd1 = this.logic.addBookToCompareSet(firstBook.id);
      this.assert(compareAdd1 && compareAdd1.success === true, 'First book should be added to compare set');

      var compareAdd2 = this.logic.addBookToCompareSet(secondBook.id);
      this.assert(compareAdd2 && compareAdd2.success === true, 'Second book should be added to compare set');

      // Load compare set details
      var compareDetails = this.logic.getActiveCompareSetDetails();
      this.assert(compareDetails && compareDetails.compareSet, 'Active compare set should be returned');
      this.assert(Array.isArray(compareDetails.items), 'Compare set items should be an array');
      this.assert(compareDetails.items.length >= 2, 'Compare set should contain at least two items');

      // Determine which of the first two has more pages using actual compare data
      var itemA = null;
      var itemB = null;
      for (var i = 0; i < compareDetails.items.length; i++) {
        var ci = compareDetails.items[i];
        if (ci && ci.book) {
          if (ci.book.id === firstBook.id) {
            itemA = ci;
          } else if (ci.book.id === secondBook.id) {
            itemB = ci;
          }
        }
      }

      this.assert(itemA && itemB, 'Both compared books should be present in compare set details');

      var longerItem = itemA.book.page_count >= itemB.book.page_count ? itemA : itemB;
      var shorterItem = longerItem === itemA ? itemB : itemA;
      var longerBook = longerItem.book;
      var shorterBook = shorterItem.book;

      // Favorite the longer book using convenience method
      var favResult = this.logic.addBookToFavorites(longerBook.id);
      this.assert(favResult && favResult.success === true, 'addBookToFavorites should succeed');
      this.assert(favResult.favoritesList && favResult.favoritesList.id, 'Favorites list metadata should be returned');
      var favoritesListId = favResult.favoritesList.id;

      // Verify favorites list contains the longer book and not the shorter
      var favoritesItemsData = this.logic.getLibraryListItems(favoritesListId);
      this.assert(favoritesItemsData && favoritesItemsData.list && favoritesItemsData.list.id === favoritesListId, 'Favorites list items should load');

      var favItems = favoritesItemsData.items || [];
      var longerCount = 0;
      var shorterCount = 0;
      for (var j = 0; j < favItems.length; j++) {
        var item = favItems[j];
        if (item && item.book) {
          if (item.book.id === longerBook.id) {
            longerCount++;
          } else if (item.book.id === shorterBook.id) {
            shorterCount++;
          }
        }
      }

      this.assert(longerCount >= 1, 'Longer book should appear in favorites at least once');
      this.assert(shorterCount === 0, 'Shorter book should not appear in favorites');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Review a highly rated short work under 120 pages with a 4-star rating
  testTask3_ReviewShortWorkWithFourStarRating() {
    var testName = 'Task 3: Review highly rated short work under 120 pages with 4-star rating';
    console.log('Testing:', testName);

    try {
      // Simulate navigation to Books page by loading filter options
      var filterOptions = this.logic.getBookFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Book filter options should load');

      // Find short works (novella) with rating at least 4.5 and fewer than 120 pages
      var searchResult = this.logic.searchBooks(
        null,
        { work_type: 'novella', rating_min: 4.5, pages_max: 120 },
        'relevance',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBooks should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one qualifying short work');

      var selectedBook = searchResult.results[0];
      this.assert(selectedBook.page_count < 120, 'Selected book should have page count under 120');
      this.assert(selectedBook.rating >= 4.5, 'Selected book should have rating at least 4.5');

      // Load book detail
      var detail = this.logic.getBookDetail(selectedBook.id);
      this.assert(detail && detail.book && detail.book.id === selectedBook.id, 'Book detail should load for selected book');

      // Submit a 4-star review with text
      var reviewBody = 'I enjoyed this short work and especially liked the pacing and characters.';
      var submitResult = this.logic.submitBookReview(selectedBook.id, 4, 'Solid short read', reviewBody, 'Test Reviewer');

      this.assert(submitResult && submitResult.success === true, 'submitBookReview should succeed');
      this.assert(submitResult.review && submitResult.review.bookId === selectedBook.id, 'Created review should reference the correct book');
      this.assert(submitResult.review.rating === 4, 'Created review should have 4-star rating');

      // Verify review is retrievable via getBookReviews
      var reviewsResult = this.logic.getBookReviews(selectedBook.id, 1, 10, 'newest_first');
      this.assert(reviewsResult && Array.isArray(reviewsResult.reviews), 'getBookReviews should return reviews array');

      var hasFourStar = false;
      for (var i = 0; i < reviewsResult.reviews.length; i++) {
        var rv = reviewsResult.reviews[i];
        if (rv && rv.rating === 4 && rv.bookId === selectedBook.id) {
          hasFourStar = true;
          break;
        }
      }
      this.assert(hasFourStar, 'At least one 4-star review for the selected short work should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register for earliest online event in March 2025 and add note
  testTask4_RegisterForEarliestOnlineEventMarch2025() {
    var testName = 'Task 4: Register for earliest online event in March 2025 with note';
    console.log('Testing:', testName);

    try {
      // Simulate navigation to Events page by loading filter options
      var options = this.logic.getEventFilterOptions();
      this.assert(options && typeof options === 'object', 'Event filter options should load');

      // List online events in March 2025, earliest first
      var listResult = this.logic.listEvents(
        { event_type: 'online', month: 3, year: 2025 },
        'start_datetime_asc',
        1,
        10
      );

      this.assert(listResult && Array.isArray(listResult.results), 'listEvents should return results array');
      this.assert(listResult.results.length > 0, 'There should be at least one online event in March 2025');

      var earliestEvent = listResult.results[0];
      this.assert(earliestEvent.event_type === 'online', 'Earliest event should be online');

      // Load event detail
      var eventDetail = this.logic.getEventDetail(earliestEvent.id);
      this.assert(eventDetail && eventDetail.id === earliestEvent.id, 'Event detail should load for earliest event');

      // Register for event with required note
      var noteText = 'Ask about sequel';
      var registrationResult = this.logic.registerForEvent(
        earliestEvent.id,
        'Alex Reader',
        'alex.reader@example.com',
        noteText
      );

      this.assert(registrationResult && registrationResult.success === true, 'registerForEvent should succeed');
      this.assert(registrationResult.registration && registrationResult.registration.eventId === earliestEvent.id, 'Registration should reference correct event');
      this.assert(registrationResult.registration.notes === noteText, 'Registration should contain required note text');

      // Verify registration persisted to storage using actual returned data
      var registrationsRaw = localStorage.getItem('event_registrations');
      var registrations = registrationsRaw ? JSON.parse(registrationsRaw) : [];
      var found = false;
      for (var i = 0; i < registrations.length; i++) {
        var reg = registrations[i];
        if (reg && reg.id === registrationResult.registration.id) {
          found = true;
          break;
        }
      }
      this.assert(found, 'Registration record should be persisted in event_registrations');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5 (adapted): Create sci-fi ebook bundle (up to 3 books) under 10 each and add to cart
  testTask5_CreateSciFiEebookBundleAndAddToCartInternal(maxItems) {
    // Internal helper to allow different bundle sizes if needed
    var limit = typeof maxItems === 'number' && maxItems > 0 ? maxItems : 3;

    // Search for science fiction ebooks under price 10, highest rating first
    var searchResult = this.logic.searchBooks(
      null,
      { genre: 'science_fiction', format: 'ebook', price_max: 10 },
      'rating_desc',
      1,
      10
    );

    this.assert(searchResult && Array.isArray(searchResult.results), 'searchBooks should return results array');
    this.assert(searchResult.results.length > 0, 'There should be at least one science fiction ebook under price 10');

    var results = searchResult.results;
    var numToAdd = results.length < limit ? results.length : limit;
    this.assert(numToAdd > 0, 'At least one book should be selected for the bundle');

    var addedBookIds = [];
    var bundleId = null;

    for (var i = 0; i < numToAdd; i++) {
      var book = results[i];
      var addResult = this.logic.addBookToBundle(book.id);
      this.assert(addResult && addResult.success === true, 'addBookToBundle should succeed for item index ' + i);
      this.assert(addResult.bundleId, 'addBookToBundle should return a bundleId');
      bundleId = addResult.bundleId;
      addedBookIds.push(book.id);
    }

    this.assert(bundleId, 'Bundle id should be defined after adding items');

    // Load active bundle details
    var bundleDetails = this.logic.getActiveBundleDetails();
    this.assert(bundleDetails && bundleDetails.bundle && bundleDetails.bundle.id === bundleId, 'Active bundle details should load for bundleId');

    var items = bundleDetails.items || [];
    this.assert(items.length === addedBookIds.length, 'Bundle should contain same number of items as added books');

    // Verify each item matches expected constraints
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      this.assert(item && item.book, 'Bundle item should include book data');
      this.assert(addedBookIds.indexOf(item.book.id) !== -1, 'Bundle item book should be one of the added books');
      this.assert(item.book.genre === 'science_fiction', 'Bundle item book should be science fiction');
      this.assert(item.book.format === 'ebook', 'Bundle item book should be in ebook format');
      this.assert(item.book.price < 10, 'Bundle item book price should be under 10');

      // Ensure quantity is set to 1
      if (item.quantity !== 1) {
        var updateResult = this.logic.updateBundleItemQuantity(item.bundleItemId, 1);
        this.assert(updateResult && updateResult.success === true, 'updateBundleItemQuantity should succeed');
      }
    }

    // Add bundle to cart
    var addToCartResult = this.logic.addBundleToCart(bundleId);
    this.assert(addToCartResult && addToCartResult.success === true, 'addBundleToCart should succeed');
    this.assert(addToCartResult.cartSummary && addToCartResult.cartSummary.item_count >= 1, 'Cart summary should report at least one item');

    // Verify cart contents
    var cartDetails = this.logic.getCartDetails();
    this.assert(cartDetails && Array.isArray(cartDetails.items), 'getCartDetails should return items array');

    var hasBundleItem = false;
    for (var k = 0; k < cartDetails.items.length; k++) {
      var cartItem = cartDetails.items[k];
      if (cartItem && cartItem.item_type === 'bundle' && cartItem.bundle && cartItem.bundle.id === bundleId) {
        hasBundleItem = true;
        break;
      }
    }
    this.assert(hasBundleItem, 'Cart should contain the created bundle item');
  }

  testTask5_CreateSciFiEebookBundleAndAddToCartWrapper() {
    // Wrapper to call internal helper with default maxItems
    this.testTask5_CreateSciFiEebookBundleAndAddToCartInternal(3);
  }

  testTask5_CreateSciFiEbookBundleAndAddToCart() {
    var testName = 'Task 5: Create sci-fi ebook bundle (up to 3 books) under 10 each and add to cart (adapted)';
    console.log('Testing:', testName);

    try {
      // Delegate to internal flow that uses actual data
      this.testTask5_CreateSciFiEebookBundleAndAddToCartInternal(3);
      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Send a contact message about a bulk order of 25 paperbacks
  testTask6_SendBulkOrderContactMessage() {
    var testName = 'Task 6: Send contact message about bulk order of 25 paperbacks';
    console.log('Testing:', testName);

    try {
      // Load contact topics
      var topics = this.logic.getContactTopics();
      this.assert(Array.isArray(topics), 'getContactTopics should return an array');

      var bulkTopicValue = null;
      for (var i = 0; i < topics.length; i++) {
        var t = topics[i];
        if (t && t.value === 'bulk_orders') {
          bulkTopicValue = t.value;
          break;
        }
      }
      this.assert(bulkTopicValue === 'bulk_orders', 'bulk_orders topic should be available');

      var subject = 'Bulk order for 25 paperbacks';
      var messageBody = 'I would like to order 25 paperback copies of your latest novel for a reading group next month.';

      var submitResult = this.logic.submitContactMessage(
        bulkTopicValue,
        'Jordan Lee',
        'jordan.lee@example.com',
        subject,
        messageBody
      );

      this.assert(submitResult && submitResult.success === true, 'submitContactMessage should succeed');
      this.assert(submitResult.contactMessage && submitResult.contactMessage.topic === 'bulk_orders', 'Contact message should have bulk_orders topic');
      this.assert(submitResult.contactMessage.subject === subject, 'Contact message subject should match provided subject');
      this.assert(submitResult.contactMessage.message === messageBody, 'Contact message body should match provided message');

      // Verify persistence in contact_messages storage
      var storedRaw = localStorage.getItem('contact_messages');
      var stored = storedRaw ? JSON.parse(storedRaw) : [];
      var found = false;
      for (var j = 0; j < stored.length; j++) {
        var cm = stored[j];
        if (cm && cm.id === submitResult.contactMessage.id) {
          found = true;
          break;
        }
      }
      this.assert(found, 'Contact message should be persisted in contact_messages');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7 (adapted): Add the cheapest highly rated YA books from 2018-2020 to Summer 2025 wishlist
  testTask7_AddCheapestYoungAdultBooksToSummerWishlist() {
    var testName = 'Task 7: Add cheapest highly rated YA books 2018-2020 to Summer 2025 wishlist (adapted)';
    console.log('Testing:', testName);

    try {
      // Simulate navigation by loading book filter options
      var filterOptions = this.logic.getBookFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Book filter options should load');

      // Filter for young adult books published 2018-01-01 to 2020-12-31 with rating >= 4.0, sorted by price
      var searchResult = this.logic.searchBooks(
        null,
        {
          genre: 'young_adult',
          publication_date_from: '2018-01-01',
          publication_date_to: '2020-12-31',
          rating_min: 4.0
        },
        'price_asc',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBooks should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one qualifying young adult book');

      // Locate or create Summer 2025 wishlist
      var wishlists = this.logic.getLibraryLists('book_wishlist');
      this.assert(Array.isArray(wishlists), 'getLibraryLists should return an array for wishlists');

      var summerList = null;
      for (var i = 0; i < wishlists.length; i++) {
        var wl = wishlists[i];
        if (wl && wl.name === 'Summer 2025') {
          summerList = wl;
          break;
        }
      }

      if (!summerList) {
        summerList = this.logic.createLibraryList('Summer 2025', 'book_wishlist', 'Wishlist of books to read during Summer 2025.');
      }
      this.assert(summerList && summerList.id, 'Summer 2025 wishlist should exist or be created');

      // Add up to two cheapest qualifying books to Summer 2025 wishlist
      var results = searchResult.results;
      var numToAdd = results.length < 2 ? results.length : 2;
      this.assert(numToAdd > 0, 'At least one YA book should be added to Summer 2025 wishlist');

      var addedBookIds = [];
      for (var j = 0; j < numToAdd; j++) {
        var book = results[j];
        var addResult = this.logic.addBookToLibraryList(summerList.id, book.id);
        this.assert(addResult && addResult.success === true, 'addBookToLibraryList should succeed for YA book index ' + j);
        addedBookIds.push(book.id);
      }

      // Verify wishlist contents using getLibraryListItems
      var listItemsData = this.logic.getLibraryListItems(summerList.id);
      this.assert(listItemsData && listItemsData.list && listItemsData.list.id === summerList.id, 'Wishlist items should load for Summer 2025');

      var items = listItemsData.items || [];
      var countMatches = 0;
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        if (item && item.book && addedBookIds.indexOf(item.book.id) !== -1) {
          countMatches++;
        }
      }

      this.assert(countMatches === addedBookIds.length, 'All selected YA books should be present in Summer 2025 wishlist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Save most recent Writing Process blog post with at least 1 comment to reading list
  testTask8_SaveRecentWritingProcessPostToReadingList() {
    var testName = 'Task 8: Save most recent Writing Process post with comments to reading list (adapted)';
    console.log('Testing:', testName);

    try {
      // Simulate navigation to Blog by loading filter options
      var blogOptions = this.logic.getBlogFilterOptions();
      this.assert(blogOptions && typeof blogOptions === 'object', 'Blog filter options should load');

      // List posts tagged writing_process, newest first
      var postsResult = this.logic.listBlogPosts(
        { tag: 'writing_process' },
        'published_at_desc',
        1,
        10
      );

      this.assert(postsResult && Array.isArray(postsResult.results), 'listBlogPosts should return results array');
      this.assert(postsResult.results.length > 0, 'There should be at least one writing process blog post');

      // Find most recent post with at least 1 comment (adapted from 5+)
      var selectedPost = null;
      for (var i = 0; i < postsResult.results.length; i++) {
        var post = postsResult.results[i];
        if (post && typeof post.comment_count === 'number' && post.comment_count >= 1) {
          selectedPost = post;
          break;
        }
      }

      if (!selectedPost) {
        // If none have comments, fall back to newest post
        selectedPost = postsResult.results[0];
      }

      this.assert(selectedPost && selectedPost.id, 'A target blog post should be selected');

      // Load article detail
      var articleDetail = this.logic.getArticleDetail(selectedPost.id);
      this.assert(articleDetail && articleDetail.id === selectedPost.id, 'Article detail should load for selected post');

      // Locate or create an article reading list (Articles to Read)
      var articleLists = this.logic.getLibraryLists('article_reading_list');
      this.assert(Array.isArray(articleLists), 'getLibraryLists should return an array for article_reading_list');

      var articleList = null;
      for (var j = 0; j < articleLists.length; j++) {
        var lst = articleLists[j];
        if (lst && lst.name === 'Articles to Read') {
          articleList = lst;
          break;
        }
      }

      if (!articleList) {
        articleList = this.logic.createLibraryList('Articles to Read', 'article_reading_list', 'Reading list for saved articles');
      }
      this.assert(articleList && articleList.id, 'Article reading list should exist or be created');

      // Save article to the selected reading list
      var addResult = this.logic.addArticleToLibraryList(articleList.id, selectedPost.id);
      this.assert(addResult && addResult.success === true, 'addArticleToLibraryList should succeed');

      // Verify article appears in the reading list
      var listItemsData = this.logic.getLibraryListItems(articleList.id);
      this.assert(listItemsData && listItemsData.list && listItemsData.list.id === articleList.id, 'Article reading list items should load');

      var items = listItemsData.items || [];
      var found = false;
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        if (item && item.article && item.article.id === selectedPost.id) {
          found = true;
          break;
        }
      }

      this.assert(found, 'Selected writing process article should be present in the reading list');

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
