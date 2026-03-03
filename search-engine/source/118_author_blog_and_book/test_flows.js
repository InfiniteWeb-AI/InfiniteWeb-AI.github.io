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
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      blog_tags: [
        {
          id: 'fantasy',
          code: 'fantasy',
          name: 'Fantasy',
          slug: 'fantasy',
          description: 'Posts about fantasy books, magic systems, and imaginary worlds from the author\u2019s series.'
        },
        {
          id: 'science_fiction',
          code: 'science_fiction',
          name: 'Science Fiction',
          slug: 'science-fiction',
          description: 'Articles focused on science fiction stories, technology, and speculative futures.'
        },
        {
          id: 'writing_tips',
          code: 'writing_tips',
          name: 'Writing Tips',
          slug: 'writing-tips',
          description: 'Practical advice on plotting, character development, revision, and the writing life.'
        }
      ],
      events: [
        {
          id: 'worldbuilding_deep_dive_2026_02_15',
          title: 'Worldbuilding Deep Dive Workshop',
          slug: 'worldbuilding-deep-dive-workshop-2026-02-15',
          description: 'An intensive online workshop exploring advanced techniques for building rich fantasy and sci-fi worlds.',
          eventType: 'online',
          location: 'Zoom',
          startDate: '2026-02-15T18:00:00Z',
          endDate: '2026-02-15T20:00:00Z',
          timezone: 'America/New_York',
          isFree: false,
          registrationRequired: true
        },
        {
          id: 'moonlit_archive_launch_2026_03_05',
          title: 'Book Launch: The Moonlit Archive',
          slug: 'book-launch-the-moonlit-archive-2026-03-05',
          description: 'Celebrate the release of The Moonlit Archive with a reading, short Q&A, and signing session.',
          eventType: 'hybrid',
          location: 'Riverbend Bookstore, 123 Maple St, Portland, OR + YouTube Live',
          startDate: '2026-03-05T02:00:00Z',
          endDate: '2026-03-05T04:00:00Z',
          timezone: 'America/Los_Angeles',
          isFree: true,
          registrationRequired: true
        },
        {
          id: 'writing_clinic_plot_pacing_2026_03_20',
          title: 'Writing Clinic: Plot & Pacing',
          slug: 'writing-clinic-plot-and-pacing-2026-03-20',
          description: 'A small-group online clinic focused on tightening plot structure and improving scene-level pacing.',
          eventType: 'online',
          location: 'Zoom',
          startDate: '2026-03-20T19:00:00Z',
          endDate: '2026-03-20T21:00:00Z',
          timezone: 'America/New_York',
          isFree: false,
          registrationRequired: true
        }
      ],
      bundles: [
        {
          id: 'aria_starter_ebook_bundle',
          title: 'Chronicles of Aria Starter eBook Bundle',
          slug: 'chronicles-of-aria-starter-ebook-bundle',
          description: 'Start your journey into the Chronicles of Aria with the first three novels in convenient eBook format.',
          format: 'ebook',
          price: 11.99,
          currency: 'usd',
          totalBooks: 3,
          includedBookIds: [],
          isDigitalOnly: true,
          isActive: true
        },
        {
          id: 'aria_complete_digital_collection',
          title: 'Chronicles of Aria Complete Digital Collection',
          slug: 'chronicles-of-aria-complete-digital-collection',
          description: 'Every main-series Chronicles of Aria ebook in one discounted digital collection.',
          format: 'digital_only',
          price: 34.99,
          currency: 'usd',
          totalBooks: 6,
          includedBookIds: [],
          isDigitalOnly: true,
          isActive: true
        },
        {
          id: 'skyward_saga_trilogy_ebook',
          title: 'Skyward Saga Trilogy eBook Bundle',
          slug: 'skyward-saga-trilogy-ebook-bundle',
          description: 'The first three Skyward Saga novels bundled together as a trilogy in ebook format.',
          format: 'ebook',
          price: 16.99,
          currency: 'usd',
          totalBooks: 3,
          includedBookIds: [],
          isDigitalOnly: true,
          isActive: true
        }
      ],
      blog_comments: [],
      blog_posts: [
        {
          id: 'designing_magical_cities_in_aria',
          title: 'Designing Magical Cities in Aria: A Worldbuilding Case Study',
          slug: 'designing-magical-cities-in-aria-worldbuilding-case-study',
          content: 'In the Chronicles of Aria, cities are more than backdrops\u2014they are engines that drive plot, culture, and conflict. In this case study, I\u2019ll walk through how I designed three of Aria\u2019s most important magical cities from the ground up.\n\nWe\u2019ll start with purpose: why does this city exist, and what problem was it originally built to solve? From there, we layer in geography, resources, and threats. A city built around a leyline fissure will organize its politics and economy very differently from a fortress town on the edge of a dragon-haunted forest.\n\nFinally, we\u2019ll talk about how magic changes everyday life. If streetlamps are powered by captured starlight, what guild controls them\u2014and what happens when they go on strike? These questions are what turn a map into a living, breathing setting readers want to revisit.',
          excerpt: 'A deep dive into how I designed Aria\u2019s signature magical cities\u2014from purpose and geography to the politics of starlight streetlamps.',
          tags: ['worldbuilding', 'fantasy'],
          publishedAt: '2026-02-26T15:00:00Z',
          authorName: 'R. L. Maren',
          heroImageUrl: 'https://i0.hippopx.com/photos/455/401/242/night-downtown-towers-skyline-preview.jpg',
          likeCount: 87,
          readingTimeMinutes: 9,
          wordCount: 2250,
          commentCount: 0
        },
        {
          id: 'terraforming_the_moonlit_archive',
          title: 'Terraforming the Moonlit Archive: Sci-Fi Worldbuilding Notes',
          slug: 'terraforming-the-moonlit-archive-sci-fi-worldbuilding-notes',
          content: 'The Moonlit Archive is set on a tidally locked world where only a narrow twilight band is habitable. That premise drove almost every other worldbuilding decision in the book.\n\nIn this post, I break down how I approached climate modeling at a high level, then translated that research into evocative details you actually see on the page: frostglass markets, mirrored farms, and cities that crawl along the terminator line.\n\nWe\u2019ll also look at how technology and culture adapt to these constraints, and how limiting where people can live can create both narrative tension and visual wonder.',
          excerpt: 'How a tidally locked world shaped the climate, culture, and technology of The Moonlit Archive.',
          tags: ['worldbuilding', 'science_fiction'],
          publishedAt: '2026-03-01T10:30:00Z',
          authorName: 'R. L. Maren',
          heroImageUrl: 'https://c.tadst.com/gfx/750w/pretend-to-be-a-time-traveler-day-fun.jpg',
          likeCount: 112,
          readingTimeMinutes: 8,
          wordCount: 2050,
          commentCount: 0
        },
        {
          id: 'worldbuilding_with_weather',
          title: 'Worldbuilding with Weather: How Climate Shapes Magic',
          slug: 'worldbuilding-with-weather-how-climate-shapes-magic',
          content: 'Weather is one of the most powerful but underused tools in fantasy worldbuilding. In Aria, monsoon cycles, high-altitude winds, and ocean currents all influence where magic is strongest\u2014and who controls it.\n\nIn this post, I share practical prompts to connect your magic system to your world\u2019s climate: Who can predict storms? Who profits from droughts? What rituals arise around seasonal changes?\n\nBy tying your magic and cultures to the sky above them, you make your world feel less like a stage set and more like a place that exists whether or not your characters are looking.',
          excerpt: 'Make your fantasy world\u2019s climate and magic system work together instead of feeling like separate bolt-on ideas.',
          tags: ['worldbuilding', 'fantasy'],
          publishedAt: '2025-11-10T18:45:00Z',
          authorName: 'R. L. Maren',
          heroImageUrl: 'https://wordlesstech.com/wp-content/uploads/2015/11/Dramatic-shelf-storm-clouds-over-Sydney-1.jpg',
          likeCount: 134,
          readingTimeMinutes: 7,
          wordCount: 1800,
          commentCount: 0
        }
      ],
      books: [
        {
          id: 'coa_01_song_of_starlit_towers_ebook',
          title: 'Song of Starlit Towers',
          slug: 'song-of-starlit-towers-chronicles-of-aria-book-1',
          seriesId: 'chronicles_of_aria',
          seriesCode: 'chronicles_of_aria',
          seriesOrder: 1,
          description: 'The first novel in the Chronicles of Aria. When starlight-fueled towers begin to fail across the empire, a disgraced mage and a runaway courier must uncover who is stealing the sky\u2019s power before the cities go dark.',
          price: 3.99,
          currency: 'usd',
          format: 'ebook',
          primaryGenre: 'fantasy',
          additionalGenres: [],
          publicationDate: '2018-05-15T00:00:00Z',
          pageCount: 432,
          coverImageUrl: 'https://www.winslai.com/wp-content/uploads/2021/01/22-toronto-skyline-night-cn-tower-glowing-red-purple-city-lights.jpg',
          isInPrint: true,
          popularityScore: 86
        },
        {
          id: 'coa_02_storm_over_embergate_ebook',
          title: 'Storm over Embergate',
          slug: 'storm-over-embergate-chronicles-of-aria-book-2',
          seriesId: 'chronicles_of_aria',
          seriesCode: 'chronicles_of_aria',
          seriesOrder: 2,
          description: 'As rebel storms batter the coastal city of Embergate, a reluctant heir must decide whether to defend a corrupt dynasty or side with the forbidden magic surging in from the sea.',
          price: 5.49,
          currency: 'usd',
          format: 'ebook',
          primaryGenre: 'fantasy',
          additionalGenres: [],
          publicationDate: '2019-04-02T00:00:00Z',
          pageCount: 468,
          coverImageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/3a8267a5-eddd-586a-991d-eff9f84ac6b6.jpeg',
          isInPrint: true,
          popularityScore: 88
        },
        {
          id: 'coa_03_queen_of_the_fallen_sky_ebook',
          title: 'Queen of the Fallen Sky',
          slug: 'queen-of-the-fallen-sky-chronicles-of-aria-book-3',
          seriesId: 'chronicles_of_aria',
          seriesCode: 'chronicles_of_aria',
          seriesOrder: 3,
          description: 'A shattered constellation, a usurped throne, and a city built atop a slumbering leviathan force Aria\u2019s unlikely heroes to choose between personal vengeance and the survival of their world.',
          price: 6.99,
          currency: 'usd',
          format: 'ebook',
          primaryGenre: 'fantasy',
          additionalGenres: [],
          publicationDate: '2020-06-16T00:00:00Z',
          pageCount: 512,
          coverImageUrl: 'https://cdn3.eyeem.com/thumb/db45cc8d16274e60956cbeb171a6ff851b3b2c7d-1596309195534/w/700',
          isInPrint: true,
          popularityScore: 92
        }
      ],
      book_series: [
        {
          id: 'chronicles_of_aria',
          code: 'chronicles_of_aria',
          name: 'Chronicles of Aria',
          description: 'An epic fantasy series set in a starlit empire powered by enchanted towers, following unlikely heroes as they confront failing magic, rising seas, and the legacy of a fallen sky.',
          totalBooks: 4
        },
        {
          id: 'skyward_saga',
          code: 'skyward_saga',
          name: 'Skyward Saga',
          description: 'A character-driven space opera about a disgraced pilot cadet and her squad as they uncover the secrets of an ancient gate network and the powers determined to control it.',
          totalBooks: 4
        },
        {
          id: 'lunar_archive_cycle',
          code: 'other_series',
          name: 'Lunar Archive Cycle',
          description: 'Interconnected stories set on a tidally locked world where memories can be bound like books and the Archive decides which lives are remembered.',
          totalBooks: 2
        }
      ],
      quotes: [
        {
          id: 'q_moonlit_archive_memory_weight',
          bookId: 'the_moonlit_archive_ebook',
          text: 'Memories are heavier than books; at least books don\u2019t argue when you decide which shelf they belong on.',
          pageNumber: 47,
          location: 'Chapter 3: The Quiet Aisle',
          createdAt: '2026-02-10T14:30:00Z',
          likesCount: 128,
          isFavorite: true,
          shareSlug: 'the-moonlit-archive-memory-weight',
          shareUrl: 'https://author.example.com/quotes/the-moonlit-archive-memory-weight'
        },
        {
          id: 'q_moonlit_archive_librarian_vow',
          bookId: 'the_moonlit_archive_ebook',
          text: 'A librarian\u2019s first vow is simple: nothing is forgotten. Her second is harder: not even the things that hurt.',
          pageNumber: 112,
          location: 'Chapter 7: Vows in Ink',
          createdAt: '2026-02-12T09:05:00Z',
          likesCount: 96,
          isFavorite: true,
          shareSlug: 'the-moonlit-archive-librarians-vow',
          shareUrl: 'https://author.example.com/quotes/the-moonlit-archive-librarians-vow'
        },
        {
          id: 'q_moonlit_archive_twilight_band',
          bookId: 'the_moonlit_archive_ebook',
          text: 'We live in a thin ring between fire and ice, pretending the world is wide because our fear is wider.',
          pageNumber: 23,
          location: 'Chapter 1: The Ring of Light',
          createdAt: '2026-02-08T18:20:00Z',
          likesCount: 76,
          isFavorite: false,
          shareSlug: 'the-moonlit-archive-thin-ring-between-fire-and-ice',
          shareUrl: 'https://author.example.com/quotes/the-moonlit-archive-thin-ring-between-fire-and-ice'
        }
      ],
      event_sessions: [
        {
          id: 'sess_worldbuilding_deep_dive_2026_02_15_main',
          eventId: 'worldbuilding_deep_dive_2026_02_15',
          startDateTime: '2026-02-15T18:00:00Z',
          endDateTime: '2026-02-15T20:00:00Z',
          capacity: 100,
          seatsAvailable: 100
        },
        {
          id: 'sess_moonlit_archive_launch_2026_03_05_main',
          eventId: 'moonlit_archive_launch_2026_03_05',
          startDateTime: '2026-03-05T02:00:00Z',
          endDateTime: '2026-03-05T04:00:00Z',
          capacity: 500,
          seatsAvailable: 500
        },
        {
          id: 'sess_writing_clinic_plot_pacing_2026_03_20_main',
          eventId: 'writing_clinic_plot_pacing_2026_03_20',
          startDateTime: '2026-03-20T19:00:00Z',
          endDateTime: '2026-03-20T21:00:00Z',
          capacity: 40,
          seatsAvailable: 40
        }
      ],
      event_registrations: [
        {
          id: 'reg_0001',
          sessionId: 'sess_live_qa_chronicles_of_aria_2026_04_12_slot1',
          attendeeName: 'Morgan Ellis',
          attendeeEmail: 'morgan.ellis@example.com',
          registeredAt: '2026-02-28T16:45:00Z',
          status: 'confirmed'
        },
        {
          id: 'reg_0002',
          sessionId: 'sess_live_qa_chronicles_of_aria_2026_04_12_slot1',
          attendeeName: 'Priya Shah',
          attendeeEmail: 'priya.shah@example.com',
          registeredAt: '2026-03-01T09:10:00Z',
          status: 'confirmed'
        },
        {
          id: 'reg_0003',
          sessionId: 'sess_live_qa_chronicles_of_aria_2026_04_12_slot2',
          attendeeName: 'Daniel Kim',
          attendeeEmail: 'daniel.kim@example.com',
          registeredAt: '2026-03-02T12:05:00Z',
          status: 'pending'
        }
      ]
    };

    // Copy all data from Generated Data to localStorage using the correct storage keys
    localStorage.setItem('blog_tags', JSON.stringify(generatedData.blog_tags));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('bundles', JSON.stringify(generatedData.bundles));
    localStorage.setItem('blog_comments', JSON.stringify(generatedData.blog_comments));
    localStorage.setItem('blog_posts', JSON.stringify(generatedData.blog_posts));
    localStorage.setItem('books', JSON.stringify(generatedData.books));
    localStorage.setItem('book_series', JSON.stringify(generatedData.book_series));
    localStorage.setItem('quotes', JSON.stringify(generatedData.quotes));
    localStorage.setItem('event_sessions', JSON.stringify(generatedData.event_sessions));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveNewestWorldbuildingFantasyPostToReadingList();
    this.testTask2_SubscribeNewsletterFantasySciFiMonthly();
    this.testTask3_AddCheapestAriaEbookUnderSixToWishlist();
    this.testTask4_CreateSpringReadingPlanWithFirstThreeAriaBooks();
    this.testTask5_RegisterForOnlineEveningEventAndSaveToMyEvents();
    this.testTask6_CopyShareLinkForMostLikedMoonlitArchiveQuote();
    this.testTask7_AddDigitalBundleUnderTwentyFiveWithAtLeastThreeEbooksToCart();
    this.testTask8_PostCommentOnMostCommentedWorldbuildingPostForYear();

    return this.results;
  }

  // Utility: parse hour (UTC) from ISO datetime string
  parseUtcHour(isoString) {
    return new Date(isoString).getUTCHours();
  }

  // Task 1: Save the newest fantasy worldbuilding blog post to reading list
  testTask1_SaveNewestWorldbuildingFantasyPostToReadingList() {
    console.log('Testing: Task 1 - Save newest fantasy worldbuilding blog post to reading list');
    const testName = 'Task 1: Save newest fantasy worldbuilding post to saved list';

    try {
      // Fresh state for this flow
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Blog, inspect filters
      const filterOptions = this.logic.getBlogFilterOptions();
      this.assert(Array.isArray(filterOptions.tags), 'Blog filter tags should be an array');
      const fantasyTag = filterOptions.tags.find(t => t.code === 'fantasy');
      this.assert(!!fantasyTag, 'Fantasy tag should exist in filter options');

      // Simulate: search for "worldbuilding", filter Fantasy, sort newest first
      const searchResult = this.logic.searchBlogPosts(
        'worldbuilding',
        {
          tagCodes: ['fantasy'],
          sortBy: 'newest_first',
          page: 1,
          pageSize: 10
        }
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBlogPosts should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one fantasy worldbuilding post');

      const newestPost = searchResult.results[0];
      const postId = newestPost.postId;
      this.assert(!!postId, 'Newest post should have an ID');

      // Simulate: open blog post detail
      const postDetail = this.logic.getBlogPostDetail(postId);
      this.assert(postDetail && postDetail.post && postDetail.post.id === postId, 'getBlogPostDetail should return the correct post');

      // Simulate: click "Save to Reading List"
      const saveResult = this.logic.saveBlogPostToSavedList(postId);
      this.assert(saveResult && saveResult.success === true, 'saveBlogPostToSavedList should succeed');
      this.assert(saveResult.savedItem && saveResult.savedItem.postId === postId, 'Saved item should reference the correct post ID');

      // Verify via saved posts view
      const savedPosts = this.logic.getSavedBlogPosts();
      this.assert(Array.isArray(savedPosts), 'getSavedBlogPosts should return an array');
      const savedEntry = savedPosts.find(sp => sp.post && sp.post.id === postId);
      this.assert(!!savedEntry, 'Saved posts list should contain the saved blog post');

      // Verify post detail now reports isSaved = true
      const postDetailAfter = this.logic.getBlogPostDetail(postId);
      this.assert(postDetailAfter && postDetailAfter.isSaved === true, 'Post detail should indicate the post is saved');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Subscribe to the newsletter with monthly Fantasy and Sci-Fi updates
  testTask2_SubscribeNewsletterFantasySciFiMonthly() {
    console.log('Testing: Task 2 - Subscribe to newsletter with monthly Fantasy & Sci-Fi updates');
    const testName = 'Task 2: Subscribe to newsletter (monthly, fantasy + sci-fi)';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Newsletter page and load options
      const options = this.logic.getNewsletterOptions();
      this.assert(options && Array.isArray(options.availableFrequencies), 'Newsletter options should include availableFrequencies');
      this.assert(Array.isArray(options.genres), 'Newsletter options should include genres');

      const monthlyOption = options.availableFrequencies.find(f => f.value === 'monthly');
      this.assert(!!monthlyOption, 'Monthly frequency option should be available');

      const fantasyGenre = options.genres.find(g => g.code === 'fantasy');
      const sciFiGenre = options.genres.find(g => g.code === 'science_fiction');
      this.assert(!!fantasyGenre, 'Fantasy genre option should be available');
      this.assert(!!sciFiGenre, 'Science Fiction genre option should be available');

      const name = 'Alex Reader';
      const email = 'alex@example.com';
      const updateFrequency = monthlyOption.value;
      const preferredGenres = [fantasyGenre.code, sciFiGenre.code];
      const includeBlogUpdates = true; // ensure it is checked

      // Simulate: submit subscription form
      const subResult = this.logic.subscribeToNewsletter(
        name,
        email,
        updateFrequency,
        preferredGenres,
        includeBlogUpdates
      );

      this.assert(subResult && subResult.success === true, 'subscribeToNewsletter should succeed');
      this.assert(subResult.subscription, 'Subscription object should be returned');

      const subscription = subResult.subscription;
      this.assert(subscription.name === name, 'Subscription should store the provided name');
      this.assert(subscription.email === email, 'Subscription should store the provided email');
      this.assert(subscription.updateFrequency === updateFrequency, 'Subscription should store the selected frequency');
      this.assert(Array.isArray(subscription.preferredGenres), 'Subscription.preferredGenres should be an array');
      this.assert(
        preferredGenres.every(code => subscription.preferredGenres.includes(code)),
        'Subscription should include both Fantasy and Science Fiction genres'
      );
      this.assert(subscription.includeBlogUpdates === true, 'Subscription should have includeBlogUpdates set to true');
      this.assert(subscription.isActive === true, 'Subscription should be active');

      // Verify homepage teaser reflects subscription state
      const homeContent = this.logic.getHomeFeaturedContent();
      this.assert(
        homeContent.newsletterTeaser && homeContent.newsletterTeaser.isSubscribed === true,
        'Homepage newsletter teaser should indicate the user is subscribed'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add the cheapest 'Chronicles of Aria' ebook under $6 to your wishlist
  testTask3_AddCheapestAriaEbookUnderSixToWishlist() {
    console.log('Testing: Task 3 - Add cheapest Chronicles of Aria ebook under $6 to wishlist');
    const testName = 'Task 3: Add cheapest Chronicles of Aria ebook under $6 to wishlist';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Books and inspect filter options
      const bookFilters = this.logic.getBookFilterOptions();
      this.assert(bookFilters && Array.isArray(bookFilters.series), 'Book filter options should include series');

      const ariaSeries = bookFilters.series.find(s => s.code === 'chronicles_of_aria');
      this.assert(!!ariaSeries, 'Chronicles of Aria series should be available in filters');

      // Simulate: filter to Chronicles of Aria, ebook format, max price 6, sort by price low to high
      const listResult = this.logic.listBooks(
        {
          seriesCode: ariaSeries.code,
          format: 'ebook',
          maxPrice: 6
        },
        'price_low_to_high',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.results), 'listBooks should return results array');
      this.assert(listResult.results.length > 0, 'There should be at least one Aria ebook under $6');

      const cheapestBook = listResult.results[0];
      const bookId = cheapestBook.bookId;
      this.assert(!!bookId, 'Cheapest book should have an ID');
      this.assert(cheapestBook.price < 6, 'Cheapest book should cost less than $6');

      // Simulate: open book detail page
      const bookDetail = this.logic.getBookDetail(bookId);
      this.assert(bookDetail && bookDetail.book && bookDetail.book.id === bookId, 'getBookDetail should return the correct book');
      this.assert(bookDetail.book.price === cheapestBook.price, 'Book detail price should match listBooks price');

      // Simulate: click "Add to Wishlist"
      const addResult = this.logic.addBookToWishlist(bookId);
      this.assert(addResult && addResult.success === true, 'addBookToWishlist should succeed');
      this.assert(addResult.item && addResult.item.bookId === bookId, 'Wishlist item should reference the correct book ID');

      // Verify via wishlist view
      const wishlist = this.logic.getWishlist();
      this.assert(wishlist && Array.isArray(wishlist.items), 'getWishlist should return wishlist items');
      const wishlistEntry = wishlist.items.find(it => it.book && it.book.bookId === bookId);
      this.assert(!!wishlistEntry, 'Wishlist should contain the added book');

      // Verify book detail now reports it is in wishlist
      const bookDetailAfter = this.logic.getBookDetail(bookId);
      this.assert(bookDetailAfter && bookDetailAfter.isInWishlist === true, 'Book detail should indicate the book is in the wishlist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Create a 'Spring Reading Plan' list with first 3 series books in order
  // Adapted to use available data: use Chronicles of Aria series instead of Skyward Saga
  testTask4_CreateSpringReadingPlanWithFirstThreeAriaBooks() {
    console.log('Testing: Task 4 - Create Spring Reading Plan list with first 3 Aria books');
    const testName = 'Task 4: Create Spring Reading Plan with first three Aria books in order';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Reading Lists and create new list
      const initialLists = this.logic.getReadingLists();
      this.assert(Array.isArray(initialLists), 'getReadingLists should return an array');

      const createResult = this.logic.createReadingList('Spring Reading Plan');
      this.assert(createResult && createResult.success === true, 'createReadingList should succeed');
      this.assert(createResult.readingList && createResult.readingList.id, 'Created reading list should have an ID');

      const readingListId = createResult.readingList.id;

      // Simulate: go to Books, filter to Chronicles of Aria, sort by publication date oldest first
      const booksResult = this.logic.listBooks(
        {
          seriesCode: 'chronicles_of_aria'
        },
        'publication_date_oldest_first',
        1,
        20
      );

      this.assert(booksResult && Array.isArray(booksResult.results), 'listBooks for series should return results');
      this.assert(booksResult.results.length >= 3, 'There should be at least three books in Chronicles of Aria');

      const selectedBooks = booksResult.results.slice(0, 3).map(b => b.bookId);

      // Simulate: for each of the first three books, Add to List -> Spring Reading Plan
      selectedBooks.forEach((bookId, index) => {
        const addResult = this.logic.addBookToReadingList(readingListId, bookId);
        this.assert(addResult && addResult.success === true, 'addBookToReadingList should succeed for book index ' + index);
        this.assert(addResult.item && addResult.item.bookId === bookId, 'Reading list item should reference correct book for index ' + index);
        this.assert(addResult.item.readingListId === readingListId, 'Reading list item should reference the Spring Reading Plan list');
      });

      // Simulate: open the Spring Reading Plan list and verify order
      const listDetail = this.logic.getReadingListDetail(readingListId);
      this.assert(listDetail && Array.isArray(listDetail.items), 'getReadingListDetail should return items array');
      this.assert(listDetail.items.length >= 3, 'Spring Reading Plan should have at least three items');

      const firstThreeItems = listDetail.items.slice(0, 3);

      firstThreeItems.forEach((item, index) => {
        this.assert(
          item.book && item.book.bookId === selectedBooks[index],
          'Item ' + (index + 1) + ' in list should be the expected book in order'
        );
        this.assert(
          item.position === index + 1,
          'Item ' + (index + 1) + ' should have position ' + (index + 1)
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Register for an online evening event and save it to My Events
  // Adapted: choose any online event with a session starting at or after 18:00 UTC
  testTask5_RegisterForOnlineEveningEventAndSaveToMyEvents() {
    console.log('Testing: Task 5 - Register for online evening event and save to My Events');
    const testName = 'Task 5: Register for online evening event and save to My Events';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Events filter options
      const eventFilterOptions = this.logic.getEventFilterOptions();
      this.assert(eventFilterOptions && Array.isArray(eventFilterOptions.eventTypes), 'Event filter options should include eventTypes');

      const onlineType = eventFilterOptions.eventTypes.find(t => t.value === 'online');
      this.assert(!!onlineType, 'Online event type should be available');

      // Simulate: filter to online events, sort by start date ascending
      const eventsResult = this.logic.listEvents(
        {
          eventType: 'online'
        },
        'start_date_asc',
        1,
        20
      );

      this.assert(eventsResult && Array.isArray(eventsResult.results), 'listEvents should return results array');
      this.assert(eventsResult.results.length > 0, 'There should be at least one online event');

      // Find an event with a session starting at or after 18:00 UTC
      let chosenEventId = null;
      let chosenSessionId = null;

      for (const ev of eventsResult.results) {
        const eventId = ev.eventId;
        const eventDetail = this.logic.getEventDetail(eventId);
        this.assert(eventDetail && Array.isArray(eventDetail.sessions), 'Event detail should include sessions');

        const suitableSession = eventDetail.sessions.find(sess => this.parseUtcHour(sess.startDateTime) >= 18);
        if (suitableSession) {
          chosenEventId = eventId;
          chosenSessionId = suitableSession.sessionId;
          break;
        }
      }

      this.assert(!!chosenEventId && !!chosenSessionId, 'Should find at least one online event with an evening session');

      // Simulate: register for the chosen session
      const name = 'Jordan Lee';
      const email = 'jordan@example.com';

      const regResult = this.logic.registerForEventSession(
        chosenSessionId,
        name,
        email
      );

      this.assert(regResult && regResult.success === true, 'registerForEventSession should succeed');
      this.assert(regResult.registration && regResult.registration.id, 'Registration should have an ID');
      this.assert(regResult.registration.sessionId === chosenSessionId, 'Registration should reference the chosen session');
      this.assert(regResult.eventId === chosenEventId, 'Registration result should include the correct eventId');

      const registrationId = regResult.registration.id;

      // Simulate: add the event to My Events (confirmation screen action)
      const myEventsAddResult = this.logic.addEventToMyEvents(
        chosenEventId,
        chosenSessionId,
        registrationId,
        'registration'
      );

      this.assert(myEventsAddResult && myEventsAddResult.success === true, 'addEventToMyEvents should succeed');
      this.assert(myEventsAddResult.myEventItem && myEventsAddResult.myEventItem.id, 'MyEventItem should have an ID');
      this.assert(myEventsAddResult.myEventItem.eventId === chosenEventId, 'MyEventItem should reference the correct event');
      this.assert(myEventsAddResult.myEventItem.sessionId === chosenSessionId, 'MyEventItem should reference the correct session');
      this.assert(myEventsAddResult.myEventItem.registrationId === registrationId, 'MyEventItem should reference the registration');

      // Verify via My Events view
      const myEvents = this.logic.getMyEvents();
      this.assert(Array.isArray(myEvents), 'getMyEvents should return an array');

      const saved = myEvents.find(item =>
        item.event &&
        item.event.eventId === chosenEventId &&
        item.session &&
        item.session.sessionId === chosenSessionId
      );

      this.assert(!!saved, 'My Events should contain the registered event/session');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Copy a share link for the most-liked quote from 'The Moonlit Archive'
  testTask6_CopyShareLinkForMostLikedMoonlitArchiveQuote() {
    console.log('Testing: Task 6 - Copy share link for most-liked quote from The Moonlit Archive');
    const testName = 'Task 6: Copy share link for most-liked Moonlit Archive quote';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Quotes filter options
      const quoteOptions = this.logic.getQuoteFilterOptions();
      this.assert(quoteOptions && Array.isArray(quoteOptions.books), 'Quote filter options should include books');
      this.assert(Array.isArray(quoteOptions.sortOptions), 'Quote filter options should include sortOptions');

      // Find the book corresponding to The Moonlit Archive by title
      const moonlitBook = quoteOptions.books.find(b => /Moonlit Archive/i.test(b.title));
      this.assert(!!moonlitBook, 'Quotes filter options should contain The Moonlit Archive book');

      // Simulate: filter quotes by this book, sort by most liked
      const quotesResult = this.logic.listQuotes(
        {
          bookId: moonlitBook.bookId
        },
        'most_liked',
        1,
        20
      );

      this.assert(quotesResult && Array.isArray(quotesResult.results), 'listQuotes should return results array');
      this.assert(quotesResult.results.length > 0, 'There should be at least one quote for The Moonlit Archive');

      const topQuote = quotesResult.results[0];
      const quoteId = topQuote.quoteId;
      this.assert(!!quoteId, 'Top quote should have an ID');

      // Simulate: open quote detail
      const quoteDetail = this.logic.getQuoteDetail(quoteId);
      this.assert(quoteDetail && quoteDetail.quote && quoteDetail.quote.id === quoteId, 'getQuoteDetail should return the correct quote');
      this.assert(
        typeof quoteDetail.quote.likesCount === 'number',
        'Quote detail should include likesCount'
      );

      // Simulate: click Copy Share Link
      const shareResult = this.logic.getQuoteShareLink(quoteId);
      this.assert(shareResult && typeof shareResult.shareUrl === 'string', 'getQuoteShareLink should return a shareUrl');
      this.assert(shareResult.shareUrl.length > 0, 'Share URL should not be empty');

      // Verify shareSlug consistency with quote detail when available
      if (quoteDetail.quote.shareSlug) {
        this.assert(
          shareResult.shareSlug === quoteDetail.quote.shareSlug,
          'Share slug from getQuoteShareLink should match quote detail shareSlug'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add a digital bundle under $25 with at least 3 ebooks to your cart
  // Adapted: min 3 ebooks (since generated data has max 3 per bundle under $25)
  testTask7_AddDigitalBundleUnderTwentyFiveWithAtLeastThreeEbooksToCart() {
    console.log('Testing: Task 7 - Add digital bundle under $25 with at least 3 ebooks to cart');
    const testName = 'Task 7: Add digital bundle under $25 with at least three ebooks to cart';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Bundles filter options
      const bundleOptions = this.logic.getBundleFilterOptions();
      this.assert(bundleOptions && Array.isArray(bundleOptions.formats), 'Bundle filter options should include formats');

      // Simulate: filter to ebook bundles, max price 25, at least 3 books, sort by price low to high
      const bundlesResult = this.logic.listBundles(
        {
          format: 'ebook',
          maxPrice: 25,
          minTotalBooks: 3
        },
        'price_low_to_high',
        1,
        20
      );

      this.assert(bundlesResult && Array.isArray(bundlesResult.results), 'listBundles should return results array');
      this.assert(bundlesResult.results.length > 0, 'There should be at least one qualifying digital bundle');

      const candidate = bundlesResult.results.find(b => b.totalBooks >= 3 && b.price < 25 && b.isActive);
      this.assert(!!candidate, 'Should find at least one active bundle with >= 3 books and price < $25');

      const bundleId = candidate.bundleId;
      this.assert(!!bundleId, 'Bundle should have an ID');

      // Simulate: open bundle detail page
      const bundleDetail = this.logic.getBundleDetail(bundleId);
      this.assert(bundleDetail && bundleDetail.bundle && bundleDetail.bundle.id === bundleId, 'getBundleDetail should return the correct bundle');
      this.assert(bundleDetail.bundle.price === candidate.price, 'Bundle detail price should match listBundles price');

      // Simulate: ensure quantity = 1 and Add to Cart
      const addResult = this.logic.addBundleToCart(bundleId, 1);
      this.assert(addResult && addResult.success === true, 'addBundleToCart should succeed');
      this.assert(addResult.cartItem && addResult.cartItem.itemType === 'bundle', 'Cart item should be of type bundle');
      this.assert(addResult.cartItem.itemId === bundleId, 'Cart item should reference the correct bundle ID');
      this.assert(addResult.cartItem.quantity === 1, 'Cart item quantity should be 1');

      // Verify via cart view
      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return cart items');
      const cartEntry = cart.items.find(it => it.itemType === 'bundle' && it.itemId === bundleId);
      this.assert(!!cartEntry, 'Cart should contain the added bundle');
      this.assert(cartEntry.quantity === 1, 'Cart entry for bundle should have quantity 1');
      this.assert(cartEntry.display && cartEntry.display.isBundle === true, 'Cart display info should mark item as bundle');

      if (cart.totals) {
        this.assert(cart.totals.subtotal >= cartEntry.unitPrice, 'Cart subtotal should be at least the bundle unit price');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Post a comment on the most-commented 'Writing Tips' blog post from 2024
  // Adapted to available data: comment on the most-commented worldbuilding post for year 2026
  testTask8_PostCommentOnMostCommentedWorldbuildingPostForYear() {
    console.log('Testing: Task 8 - Post comment on most-commented worldbuilding blog post for selected year');
    const testName = 'Task 8: Post comment on most-commented worldbuilding post (2026)';

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate: open Blog and load filter options
      const filterOptions = this.logic.getBlogFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.tags), 'Blog filter options should include tags');
      this.assert(Array.isArray(filterOptions.years), 'Blog filter options should include years');

      const worldbuildingTag = filterOptions.tags.find(t => t.code === 'worldbuilding');
      this.assert(!!worldbuildingTag, 'Worldbuilding tag should be available');

      // Try to pick year 2026 if available, otherwise fallback to first year option
      const year2026Option = filterOptions.years.find(y => y.value === 2026);
      const targetYearOption = year2026Option || filterOptions.years[0];
      this.assert(!!targetYearOption, 'There should be at least one year option for blog filters');

      const year = targetYearOption.value;

      // Simulate: filter to worldbuilding posts for the selected year, sort by most commented
      const searchResult = this.logic.searchBlogPosts(
        '',
        {
          tagCodes: ['worldbuilding'],
          year: year,
          sortBy: 'most_commented',
          page: 1,
          pageSize: 10
        }
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBlogPosts should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one worldbuilding post for year ' + year);

      const targetPost = searchResult.results[0];
      const postId = targetPost.postId;
      this.assert(!!postId, 'Target blog post should have an ID');

      // Retrieve comment count before submitting
      const postDetailBefore = this.logic.getBlogPostDetail(postId);
      this.assert(postDetailBefore && postDetailBefore.post && postDetailBefore.post.id === postId, 'getBlogPostDetail should return the correct post');
      const beforeCount = typeof postDetailBefore.post.commentCount === 'number' ? postDetailBefore.post.commentCount : 0;

      // Simulate: fill in comment form and submit
      const name = 'Taylor';
      const email = 'taylor@example.com';
      const commentText = 'These writing tips are very helpful. I plan to use at least two of them this week.';

      const submitResult = this.logic.submitBlogComment(
        postId,
        name,
        email,
        commentText
      );

      this.assert(submitResult && submitResult.success === true, 'submitBlogComment should succeed');
      this.assert(submitResult.comment && submitResult.comment.id, 'New comment should have an ID');
      this.assert(submitResult.comment.postId === postId, 'Comment should reference the correct blog post ID');
      this.assert(submitResult.comment.authorName === name, 'Comment should store the correct author name');
      this.assert(submitResult.comment.authorEmail === email, 'Comment should store the correct author email');
      this.assert(submitResult.comment.content === commentText, 'Comment should store the correct content');

      if (typeof submitResult.updatedCommentCount === 'number') {
        this.assert(
          submitResult.updatedCommentCount >= beforeCount + 1,
          'updatedCommentCount should be at least previous count + 1'
        );
      }

      // Verify comment persisted in storage
      const allCommentsRaw = localStorage.getItem('blog_comments');
      const allComments = allCommentsRaw ? JSON.parse(allCommentsRaw) : [];
      const storedComment = allComments.find(c => c.id === submitResult.comment.id);
      this.assert(!!storedComment, 'New comment should be persisted in blog_comments storage');
      this.assert(storedComment.postId === postId, 'Stored comment should reference the correct post ID');

      // Verify post detail comment count reflects the update
      const postDetailAfter = this.logic.getBlogPostDetail(postId);
      if (typeof submitResult.updatedCommentCount === 'number') {
        this.assert(
          postDetailAfter.post.commentCount === submitResult.updatedCommentCount,
          'Post detail commentCount should match updatedCommentCount from submitBlogComment'
        );
      }

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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
