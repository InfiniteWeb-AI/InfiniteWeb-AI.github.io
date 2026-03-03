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
      reading_lists: [
        {
          id: "favorites",
          name: "Favorites",
          listType: "favorites",
          description: "Your all-time favorite book and movie reviews.",
          isDefault: true,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2025-12-01T09:30:00Z"
        },
        {
          id: "watchlist",
          name: "Watchlist",
          listType: "watchlist",
          description: "Movies you want to watch later.",
          isDefault: true,
          createdAt: "2024-01-15T10:05:00Z",
          updatedAt: "2025-11-20T14:10:00Z"
        },
        {
          id: "save_for_later",
          name: "Save for Later",
          listType: "save_for_later",
          description: "Book and movie reviews saved for later reading.",
          isDefault: true,
          createdAt: "2024-01-15T10:10:00Z",
          updatedAt: "2025-10-05T16:45:00Z"
        }
      ],
      tags: [
        {
          id: "lord_of_the_rings",
          name: "Lord of the Rings",
          slug: "lord_of_the_rings",
          description: "Posts related to J.R.R. Tolkiens The Lord of the Rings books and movie adaptations."
        },
        {
          id: "science_fiction",
          name: "Science Fiction",
          slug: "science_fiction",
          description: "Reviews of science fiction books and movies featuring futuristic or speculative concepts."
        },
        {
          id: "mystery",
          name: "Mystery",
          slug: "mystery",
          description: "Whodunits, crime stories, and twisty mystery narratives."
        }
      ],
      comments: [
        {
          id: "cmt_0001",
          reviewId: "inception_movie_review_1",
          authorName: "Alex",
          content: "Loved your breakdown of the dream layersespecially the part about how the ending is meant to stay ambiguous.",
          createdAt: "2025-11-02T14:25:00Z",
          updatedAt: "2025-11-02T14:25:00Z",
          isDeleted: false
        },
        {
          id: "cmt_0002",
          reviewId: "inception_movie_review_2",
          authorName: "Jordan",
          content: "I actually enjoyed the action scenes more than you did. I thought the hallway fight was one of the best choreographed set pieces in modern sci-fi.",
          createdAt: "2025-12-10T09:12:00Z",
          updatedAt: "2025-12-10T09:12:00Z",
          isDeleted: false
        },
        {
          id: "cmt_0003",
          reviewId: "lotr_book_fotr_review",
          authorName: "TolkienFan",
          content: "Totally agree that the pacing in the Shire is slow, but it really pays off once the Fellowship leaves Rivendell.",
          createdAt: "2024-08-18T18:40:00Z",
          updatedAt: "2024-08-18T18:40:00Z",
          isDeleted: false
        }
      ],
      review_tags: [
        {
          id: "rt_0001",
          reviewId: "lotr_book_fotr_review",
          tagId: "lord_of_the_rings"
        },
        {
          id: "rt_0002",
          reviewId: "lotr_movie_fotr_review",
          tagId: "lord_of_the_rings"
        },
        {
          id: "rt_0003",
          reviewId: "inception_movie_review_1",
          tagId: "science_fiction"
        }
      ],
      review_interactions: [
        {
          id: "ri_0001",
          reviewId: "lotr_book_fotr_review",
          isRead: false,
          isSavedForLater: false,
          isLiked: false
        },
        {
          id: "ri_0002",
          reviewId: "lotr_movie_fotr_review",
          isRead: false,
          isSavedForLater: false,
          isLiked: false
        },
        {
          id: "ri_0003",
          reviewId: "inception_movie_review_1",
          isRead: false,
          isSavedForLater: false,
          isLiked: false
        }
      ],
      reviews: [
        {
          id: "lotr_book_fotr_review",
          title: "The Lord of the Rings: The Fellowship of the Ring  Book Review",
          slug: "the-lord-of-the-rings-fellowship-of-the-ring-book-review",
          content_type: "books",
          genre: "Fantasy",
          body: "A deep dive into Tolkiens opening chapter of the Lord of the Rings trilogy, focusing on the slow-burn worldbuilding of the Shire, the mythic weight of the One Ring, and how the novel balances intimate character moments with epic stakes.",
          rating: 4.8,
          ratingCount: 152,
          publishedAt: "2024-05-10T09:00:00Z",
          createdAt: "2024-05-10T09:00:00Z",
          updatedAt: "2024-05-11T10:15:00Z",
          authorId: "author_main",
          publicationYear: 1954,
          popularityScore: 92,
          thumbnailUrl: "https://i.pinimg.com/originals/67/24/bd/6724bd7ae529aa195aa7f1b154f6f708.png",
          likeCount: 0,
          commentCount: 1,
          tagsSummary: "Lord of the Rings"
        },
        {
          id: "lotr_movie_fotr_review",
          title: "The Lord of the Rings: The Fellowship of the Ring  Movie Review",
          slug: "the-lord-of-the-rings-fellowship-of-the-ring-movie-review",
          content_type: "movies",
          genre: "Fantasy",
          body: "Peter Jacksons Fellowship of the Ring condenses and reimagines Tolkiens first volume into a sweeping fantasy film. This review examines how the extended edition restores crucial character beats, the films groundbreaking practical effects, and Howard Shores iconic score.",
          rating: 5.0,
          ratingCount: 230,
          publishedAt: "2024-06-01T12:00:00Z",
          createdAt: "2024-06-01T12:00:00Z",
          updatedAt: "2024-06-03T15:30:00Z",
          authorId: "author_film",
          releaseYear: 2001,
          runtimeMinutes: 178,
          popularityScore: 98,
          thumbnailUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&h=600&fit=crop&auto=format&q=80",
          likeCount: 0,
          commentCount: 1,
          tagsSummary: "Lord of the Rings"
        },
        {
          id: "inception_movie_review_1",
          title: "Inception (2010)  Dreams Within Dreams",
          slug: "inception-2010-dreams-within-dreams-review",
          content_type: "movies",
          genre: "Science Fiction",
          body: "This review unpacks Christopher Nolans puzzle-box thriller, exploring how its nested dream structure supports a story about guilt, grief, and the impossibility of certainty. We also look at why the hallway fight and rotating set pieces still feel revolutionary.",
          rating: 4.5,
          ratingCount: 310,
          publishedAt: "2023-03-15T20:00:00Z",
          createdAt: "2023-03-15T20:00:00Z",
          updatedAt: "2023-03-18T09:45:00Z",
          authorId: "author_film",
          releaseYear: 2010,
          runtimeMinutes: 148,
          popularityScore: 89,
          thumbnailUrl: "https://pd12m.s3.us-west-2.amazonaws.com/images/7fc97f4d-fa52-5d9f-b26d-b93230b5d198.jpeg",
          likeCount: 0,
          commentCount: 1,
          tagsSummary: "Inception, Science Fiction, Thriller"
        }
      ],
      authors: [
        {
          id: "author_main",
          name: "Riley Hart",
          bio: "Riley is a lifelong bookworm and film enthusiast who started this blog to track their own reading and viewing habits. They gravitate toward character-driven science fiction, modern fantasy, and genre-bending thrillers.",
          avatarUrl: "https://webtrainingguides.com/wp-content/uploads/2019/10/91mBWKArEL.jpg",
          followersCount: 320,
          reviewCount: 7,
          averageRating: 4.385714285714285,
          isFollowed: false
        },
        {
          id: "author_film",
          name: "Jamie Cole",
          bio: "Jamie writes in-depth movie essays with a soft spot for practical effects, ambitious blockbusters, and overlooked festival darlings. Expect detailed breakdowns of structure, cinematography, and sound design.",
          avatarUrl: "https://i.ytimg.com/vi/JIJtCHuRXHw/maxresdefault.jpg",
          followersCount: 540,
          reviewCount: 5,
          averageRating: 4.0600000000000005,
          isFollowed: false
        },
        {
          id: "author_mystery",
          name: "Morgan Blake",
          bio: "Morgan devours mysteries and crime fiction, from cozy village whodunits to gritty noir. They focus on fair-play plotting, atmosphere, and whether the ending actually earns its twist.",
          avatarUrl: "https://s2982.pcdn.co/wp-content/uploads/2019/02/great-cozy-mysteries-683x1024.png",
          followersCount: 210,
          reviewCount: 4,
          averageRating: 4.575,
          isFollowed: false
        }
      ]
    };

    // Copy all data from Generated Data to localStorage using the correct storage keys
    localStorage.setItem("reading_lists", JSON.stringify(generatedData.reading_lists || []));
    localStorage.setItem("tags", JSON.stringify(generatedData.tags || []));
    localStorage.setItem("comments", JSON.stringify(generatedData.comments || []));
    localStorage.setItem("review_tags", JSON.stringify(generatedData.review_tags || []));
    localStorage.setItem("review_interactions", JSON.stringify(generatedData.review_interactions || []));
    localStorage.setItem("reviews", JSON.stringify(generatedData.reviews || []));
    localStorage.setItem("authors", JSON.stringify(generatedData.authors || []));

    // Initialize empty collections for entities with no pre-generated data
    localStorage.setItem("reading_list_items", JSON.stringify([]));
    localStorage.setItem("newsletter_subscriptions", JSON.stringify([]));
    localStorage.setItem("contact_messages", JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log("Starting flow tests...");

    this.testTask1_SaveTopRatedSciFiBooksToFavorites();
    this.testTask2_CommentOnLowerRatedInceptionRelatedMovieReview();
    this.testTask3_CreateSummer2026ListAndAddHighRatedBooks();
    this.testTask4_AddOldestLongMoviesToWatchlist();
    this.testTask5_LikeLotrBookAndMovieAndFollowMovieAuthor();
    this.testTask6_SubscribeToNewsletterCustomFrequencies();
    this.testTask7_SendFeedbackAboutLowRatedComedyLikeReview();
    this.testTask8_MarkNewestPostsReadOrSaveForLaterPattern();

    return this.results;
  }

  // Helper: simple assertion
  assert(condition, message) {
    if (!condition) {
      throw new Error("Assertion failed: " + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log("\u2713 " + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log("\u2717 " + testName + ": " + error.message);
  }

  // Helper: find reading list by listType via API
  getReadingListByType(listType) {
    const lists = this.logic.getUserReadingLists();
    return lists.find(function (l) { return l.listType === listType; });
  }

  // TASK 1
  // Adapted: Use available book reviews, sort by rating high->low, add up to 2 to Favorites
  testTask1_SaveTopRatedSciFiBooksToFavorites() {
    const testName = "Task 1: Save top-rated book reviews to Favorites";
    console.log("Testing: " + testName);

    try {
      // Simulate loading filter options for books listing
      const filterOptions = this.logic.getReviewFilterOptions("books_listing", "books");
      this.assert(filterOptions && Array.isArray(filterOptions.genres), "Filter options should include genres array");

      // Get books listing sorted by rating high to low
      const listing = this.logic.getReviewsListing(
        "books", // contentType
        null,     // filters (no strict date/genre filters due to limited data)
        "rating_high_to_low", // sortBy
        1,        // page
        10        // pageSize
      );

      this.assert(listing && Array.isArray(listing.items), "Books listing should return items array");
      this.assert(listing.items.length > 0, "There should be at least one book review in listing");

      const itemsToAddCount = Math.min(2, listing.items.length);
      const addedReviewIds = [];

      for (let i = 0; i < itemsToAddCount; i++) {
        const review = listing.items[i];
        const addResult = this.logic.addReviewToDefaultList("favorites", review.reviewId);
        this.assert(addResult && addResult.success === true, "Should successfully add review to Favorites");
        this.assert(addResult.listType === "favorites", "addReviewToDefaultList should indicate favorites listType");
        this.assert(addResult.listId, "addReviewToDefaultList should return a listId for Favorites");
        addedReviewIds.push(review.reviewId);
      }

      // Verify using reading lists API
      const favoritesList = this.getReadingListByType("favorites");
      this.assert(favoritesList, "Favorites reading list should exist");

      const favoritesItems = this.logic.getReadingListItems(
        favoritesList.id,
        "date_added_newest_first",
        1,
        20
      );

      this.assert(favoritesItems && Array.isArray(favoritesItems.items), "Favorites items call should return items array");

      const favoritesIds = favoritesItems.items.map(function (it) { return it.reviewId; });
      for (let j = 0; j < addedReviewIds.length; j++) {
        this.assert(
          favoritesIds.indexOf(addedReviewIds[j]) !== -1,
          "Favorites list should contain added review " + addedReviewIds[j]
        );
      }

      // Also verify via review detail userInteraction for first added review
      const firstAddedId = addedReviewIds[0];
      if (firstAddedId) {
        const detail = this.logic.getReviewDetail(firstAddedId);
        this.assert(detail && detail.userInteraction, "Review detail should include userInteraction");
        this.assert(
          detail.userInteraction.isInFavorites === true,
          "userInteraction.isInFavorites should be true for a review added to Favorites"
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 2
  // Adapted: Search for "Inception", pick that movie and another movie, comment on the lower-rated one
  testTask2_CommentOnLowerRatedInceptionRelatedMovieReview() {
    const testName = "Task 2: Comment on lower-rated of two movie reviews";
    console.log("Testing: " + testName);

    try {
      // Search for "Inception" reviews
      const searchResults = this.logic.searchReviews(
        "Inception", // query
        null,         // filters
        "relevance", // sortBy
        1,            // page
        10            // pageSize
      );

      this.assert(searchResults && Array.isArray(searchResults.items), "searchReviews should return items array");
      this.assert(searchResults.items.length > 0, "searchReviews for 'Inception' should return at least one result");

      const inceptionReview = searchResults.items[0];
      const inceptionId = inceptionReview.reviewId;

      // Get movies listing to find another movie to compare ratings with
      const moviesListing = this.logic.getReviewsListing(
        "movies", // contentType
        null,      // filters
        "rating_high_to_low", // sortBy
        1,
        10
      );

      this.assert(moviesListing && Array.isArray(moviesListing.items), "Movies listing should return items array");
      this.assert(moviesListing.items.length > 1, "Movies listing should contain more than one movie for comparison");

      // Find a second movie different from the Inception review
      let secondMovie = null;
      for (let i = 0; i < moviesListing.items.length; i++) {
        if (moviesListing.items[i].reviewId !== inceptionId) {
          secondMovie = moviesListing.items[i];
          break;
        }
      }

      this.assert(secondMovie !== null, "Should find a second movie distinct from the Inception review");

      // Fetch detailed ratings
      const inceptionDetail = this.logic.getReviewDetail(inceptionId);
      const secondDetail = this.logic.getReviewDetail(secondMovie.reviewId);

      this.assert(inceptionDetail && inceptionDetail.review, "Inception detail should have review");
      this.assert(secondDetail && secondDetail.review, "Second movie detail should have review");

      const inceptionRating = inceptionDetail.review.rating;
      const secondRating = secondDetail.review.rating;

      // Determine lower-rated review
      const lowerRatedId = inceptionRating <= secondRating ? inceptionId : secondMovie.reviewId;

      // Get existing comments count for lower-rated review
      const commentsBefore = this.logic.getReviewComments(lowerRatedId, 1, 50);
      this.assert(commentsBefore && typeof commentsBefore.totalCount === "number", "getReviewComments should return totalCount");
      const beforeCount = commentsBefore.totalCount;

      const commentText = "I have a different opinion about this movie.";

      // Post a new comment
      const postResult = this.logic.postReviewComment(
        lowerRatedId,
        "Test User", // authorName
        commentText
      );

      this.assert(postResult && postResult.success === true, "postReviewComment should succeed");
      this.assert(postResult.comment && postResult.comment.reviewId === lowerRatedId, "Comment should reference the correct reviewId");
      this.assert(postResult.comment.content === commentText, "Comment content should match the submitted text");

      // Verify comments increased
      const commentsAfter = this.logic.getReviewComments(lowerRatedId, 1, 50);
      this.assert(
        typeof commentsAfter.totalCount === "number" && commentsAfter.totalCount === beforeCount + 1,
        "totalCount should increase by 1 after posting a comment"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 3
  // Adapted: Create account, create "Summer 2026" list, add up to 3 high-rated books to it
  testTask3_CreateSummer2026ListAndAddHighRatedBooks() {
    const testName = "Task 3: Create 'Summer 2026' list and add high-rated books";
    console.log("Testing: " + testName);

    try {
      // Create account
      const createAccountResult = this.logic.createAccount(
        "testreader",
        "test@example.com",
        "Password123"
      );

      this.assert(createAccountResult && createAccountResult.success === true, "createAccount should succeed");
      this.assert(createAccountResult.account && createAccountResult.account.email === "test@example.com", "Account email should match input");

      // Create custom reading list "Summer 2026"
      const createListResult = this.logic.createReadingList("Summer 2026", null);
      this.assert(createListResult && createListResult.success === true, "createReadingList should succeed");
      this.assert(createListResult.list && createListResult.list.id, "createReadingList should return a list with id");
      this.assert(createListResult.list.name === "Summer 2026", "Reading list name should be 'Summer 2026'");

      const customListId = createListResult.list.id;

      // Filter books with high rating (>= 4.5) and any publication year
      const booksListing = this.logic.getReviewsListing(
        "books", // contentType
        { minRating: 4.5 }, // filters
        "most_popular", // sortBy
        1,
        10
      );

      this.assert(booksListing && Array.isArray(booksListing.items), "Books listing for high-rated filter should return items array");
      this.assert(booksListing.items.length > 0, "There should be at least one high-rated book to add to the list");

      const toAddCount = Math.min(3, booksListing.items.length);
      const addedIds = [];

      for (let i = 0; i < toAddCount; i++) {
        const review = booksListing.items[i];
        const addResult = this.logic.addReviewToCustomList(customListId, review.reviewId);
        this.assert(addResult && addResult.success === true, "addReviewToCustomList should succeed");
        this.assert(addResult.listId === customListId, "addReviewToCustomList should echo the correct listId");
        addedIds.push(review.reviewId);
      }

      // Verify list contents
      const listItemsResult = this.logic.getReadingListItems(customListId, "date_added_newest_first", 1, 10);
      this.assert(listItemsResult && listItemsResult.list && listItemsResult.list.id === customListId, "getReadingListItems should return the correct list header");
      this.assert(Array.isArray(listItemsResult.items), "getReadingListItems should provide items array");

      const listReviewIds = listItemsResult.items.map(function (it) { return it.reviewId; });
      for (let j = 0; j < addedIds.length; j++) {
        this.assert(
          listReviewIds.indexOf(addedIds[j]) !== -1,
          "Custom list should contain added review " + addedIds[j]
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 4
  // Adapted: Filter long runtime movies and add up to 2 oldest to Watchlist
  testTask4_AddOldestLongMoviesToWatchlist() {
    const testName = "Task 4: Add oldest long-runtime movies to Watchlist";
    console.log("Testing: " + testName);

    try {
      // Filter movies with runtime >= 120 minutes and sort by release year oldest first
      const moviesListing = this.logic.getReviewsListing(
        "movies", // contentType
        { minRuntimeMinutes: 120 }, // filters (ignore genre/rating constraints due to limited data)
        "release_year_oldest_first", // sortBy
        1,
        10
      );

      this.assert(moviesListing && Array.isArray(moviesListing.items), "Movies listing for long runtime should return items array");
      this.assert(moviesListing.items.length > 0, "There should be at least one long-runtime movie");

      const toAddCount = Math.min(2, moviesListing.items.length);
      const addedIds = [];

      for (let i = 0; i < toAddCount; i++) {
        const review = moviesListing.items[i];
        const addResult = this.logic.addReviewToDefaultList("watchlist", review.reviewId);
        this.assert(addResult && addResult.success === true, "addReviewToDefaultList to Watchlist should succeed");
        this.assert(addResult.listType === "watchlist", "addReviewToDefaultList should indicate watchlist listType");
        addedIds.push(review.reviewId);
      }

      // Verify using reading lists
      const watchlist = this.getReadingListByType("watchlist");
      this.assert(watchlist, "Watchlist should exist");

      const watchlistItems = this.logic.getReadingListItems(watchlist.id, "date_added_newest_first", 1, 10);
      this.assert(watchlistItems && Array.isArray(watchlistItems.items), "getReadingListItems for Watchlist should return items array");

      const watchlistIds = watchlistItems.items.map(function (it) { return it.reviewId; });
      for (let j = 0; j < addedIds.length; j++) {
        this.assert(
          watchlistIds.indexOf(addedIds[j]) !== -1,
          "Watchlist should contain added review " + addedIds[j]
        );
      }

      // Verify userInteraction flag for one of the added movies
      const firstAddedId = addedIds[0];
      if (firstAddedId) {
        const detail = this.logic.getReviewDetail(firstAddedId);
        this.assert(detail && detail.userInteraction, "Review detail should have userInteraction");
        this.assert(
          detail.userInteraction.isInWatchlist === true,
          "userInteraction.isInWatchlist should be true for a movie added to Watchlist"
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 5
  // Like one LotR book and one LotR movie review, then follow the movie review's author
  testTask5_LikeLotrBookAndMovieAndFollowMovieAuthor() {
    const testName = "Task 5: Like LotR book & movie and follow movie author";
    console.log("Testing: " + testName);

    try {
      // Use filter options to get Lord of the Rings tag id
      const filterOptions = this.logic.getReviewFilterOptions("search_results", null);
      this.assert(filterOptions && Array.isArray(filterOptions.tags), "Filter options should include tags array");

      let lotrTag = null;
      for (let i = 0; i < filterOptions.tags.length; i++) {
        const tag = filterOptions.tags[i];
        if (tag.slug === "lord_of_the_rings" || tag.name.indexOf("Lord of the Rings") !== -1) {
          lotrTag = tag;
          break;
        }
      }

      this.assert(lotrTag !== null, "Should find 'Lord of the Rings' tag in filter options");

      // Search for content with that tag
      const searchResults = this.logic.searchReviews(
        "The Lord of the Rings", // query
        { tagIds: [lotrTag.id] }, // filters
        "relevance", // sortBy
        1,
        10
      );

      this.assert(searchResults && Array.isArray(searchResults.items), "searchReviews with tag filter should return items array");
      this.assert(searchResults.items.length >= 2, "Expected at least 2 LotR-related reviews (book and movie)");

      // Find first book and first movie in results
      let lotrBook = null;
      let lotrMovie = null;
      for (let j = 0; j < searchResults.items.length; j++) {
        const item = searchResults.items[j];
        if (!lotrBook && item.contentType === "books") {
          lotrBook = item;
        }
        if (!lotrMovie && item.contentType === "movies") {
          lotrMovie = item;
        }
        if (lotrBook && lotrMovie) {
          break;
        }
      }

      this.assert(lotrBook && lotrMovie, "Should find both a LotR book review and a LotR movie review");

      // Like the book review
      const bookDetailBefore = this.logic.getReviewDetail(lotrBook.reviewId);
      this.assert(bookDetailBefore && bookDetailBefore.review, "LotR book detail should be available");

      const likeBookResult = this.logic.likeReview(lotrBook.reviewId, true);
      this.assert(likeBookResult && likeBookResult.success === true, "Liking the book review should succeed");
      this.assert(likeBookResult.isLiked === true, "likeReview should report isLiked true for the book");
      this.assert(typeof likeBookResult.likeCount === "number", "likeReview should return numeric likeCount for book");

      // Confirm via detail that book is liked
      const bookDetailAfter = this.logic.getReviewDetail(lotrBook.reviewId);
      this.assert(bookDetailAfter && bookDetailAfter.userInteraction, "Book detail after like should include userInteraction");
      this.assert(bookDetailAfter.userInteraction.isLiked === true, "userInteraction.isLiked should be true for liked book review");

      // Like the movie review
      const movieDetailBefore = this.logic.getReviewDetail(lotrMovie.reviewId);
      this.assert(movieDetailBefore && movieDetailBefore.review, "LotR movie detail should be available");
      const movieAuthorId = movieDetailBefore.author.id;

      const likeMovieResult = this.logic.likeReview(lotrMovie.reviewId, true);
      this.assert(likeMovieResult && likeMovieResult.success === true, "Liking the movie review should succeed");
      this.assert(likeMovieResult.isLiked === true, "likeReview should report isLiked true for the movie");
      this.assert(typeof likeMovieResult.likeCount === "number", "likeReview should return numeric likeCount for movie");

      // Confirm via detail that movie is liked
      const movieDetailAfter = this.logic.getReviewDetail(lotrMovie.reviewId);
      this.assert(movieDetailAfter && movieDetailAfter.userInteraction, "Movie detail after like should include userInteraction");
      this.assert(movieDetailAfter.userInteraction.isLiked === true, "userInteraction.isLiked should be true for liked movie review");

      // Follow the movie author
      const followResult = this.logic.followAuthor(movieAuthorId, true);
      this.assert(followResult && followResult.success === true, "followAuthor should succeed");
      this.assert(followResult.isFollowed === true, "followAuthor should set isFollowed true");
      this.assert(typeof followResult.followersCount === "number", "followAuthor should return numeric followersCount");

      // Verify via author profile
      const authorProfile = this.logic.getAuthorProfile(movieAuthorId);
      this.assert(authorProfile && authorProfile.author, "getAuthorProfile should return author object");
      this.assert(authorProfile.author.isFollowed === true, "Author profile should reflect isFollowed true");

      // Check that the author's reviews list includes the movie review
      const authoredReviewIds = (authorProfile.reviews || []).map(function (r) { return r.reviewId; });
      this.assert(
        authoredReviewIds.indexOf(lotrMovie.reviewId) !== -1,
        "Author's profile reviews should include the liked movie review"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 6
  // Subscribe to newsletter with weekly book and monthly movie updates, 4+ star filter
  testTask6_SubscribeToNewsletterCustomFrequencies() {
    const testName = "Task 6: Subscribe to newsletter with custom per-category frequencies";
    console.log("Testing: " + testName);

    try {
      // Get existing subscription (if any)
      const current = this.logic.getNewsletterSubscription();
      // current.subscription may be null/undefined; we don't assert on its contents here

      const email = "reader@example.com";
      const name = "Reader";
      const mainFrequency = "custom_per_category";
      const booksFrequency = "weekly";
      const moviesFrequency = "monthly";
      const sendOnlyHighRated = true;
      const minRating = 4;

      const saveResult = this.logic.saveNewsletterSubscription(
        email,
        name,
        mainFrequency,
        booksFrequency,
        moviesFrequency,
        sendOnlyHighRated,
        minRating
      );

      this.assert(saveResult && saveResult.success === true, "saveNewsletterSubscription should succeed");
      this.assert(saveResult.subscription, "saveNewsletterSubscription should return a subscription object");

      const sub = saveResult.subscription;
      this.assert(sub.email === email, "Subscription email should match the one provided");
      this.assert(sub.mainFrequency === mainFrequency, "Subscription mainFrequency should match input");
      this.assert(sub.booksFrequency === booksFrequency, "Books frequency should be weekly");
      this.assert(sub.moviesFrequency === moviesFrequency, "Movies frequency should be monthly");
      this.assert(sub.sendOnlyHighRated === sendOnlyHighRated, "sendOnlyHighRated should be true");
      this.assert(sub.minRating === minRating, "minRating should reflect threshold 4");

      // Verify persistence via getNewsletterSubscription
      const after = this.logic.getNewsletterSubscription();
      this.assert(after && after.subscription, "getNewsletterSubscription after save should return subscription");
      this.assert(after.subscription.email === email, "Retrieved subscription should keep the saved email");
      this.assert(after.subscription.mainFrequency === mainFrequency, "Retrieved subscription mainFrequency should be custom_per_category");

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 7
  // Adapted: Find the lowest-rated movie and send a disagreement message referencing its title
  testTask7_SendFeedbackAboutLowRatedComedyLikeReview() {
    const testName = "Task 7: Send feedback about a low-rated movie review via contact form";
    console.log("Testing: " + testName);

    try {
      // Get movies sorted by rating low to high (no strict genre/year due to limited data)
      const moviesListing = this.logic.getReviewsListing(
        "movies", // contentType
        null,      // filters
        "rating_low_to_high", // sortBy
        1,
        10
      );

      this.assert(moviesListing && Array.isArray(moviesListing.items), "Movies listing for low-to-high rating should return items array");
      this.assert(moviesListing.items.length > 0, "There should be at least one movie review to send feedback about");

      const targetMovie = moviesListing.items[0];
      const targetDetail = this.logic.getReviewDetail(targetMovie.reviewId);
      this.assert(targetDetail && targetDetail.review, "getReviewDetail should return review object for feedback target");

      const reviewTitle = targetDetail.review.title;
      const messageText = "I disagree with your review of " + reviewTitle;

      const contactResult = this.logic.createContactMessage(
        "Test User",           // name
        "test@example.com",    // email
        messageText             // message
      );

      this.assert(contactResult && contactResult.success === true, "createContactMessage should succeed");
      this.assert(contactResult.contactMessage, "createContactMessage should return a contactMessage object");
      this.assert(contactResult.contactMessage.message === messageText, "Stored contact message text should match input");
      this.assert(
        typeof contactResult.contactMessage.status === "string",
        "ContactMessage status should be a string (e.g., 'new')"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // TASK 8
  // Mark newest posts as read/save-for-later in pattern: 1,3,5 read; 2,4 save-for-later
  testTask8_MarkNewestPostsReadOrSaveForLaterPattern() {
    const testName = "Task 8: Mark newest posts read/save-for-later pattern";
    console.log("Testing: " + testName);

    try {
      // Get home feed sorted by newest first
      const feed = this.logic.getHomeFeed("newest_first", 1, 5);
      this.assert(feed && Array.isArray(feed.items), "getHomeFeed should return items array");
      this.assert(feed.items.length > 0, "Home feed should contain at least one item");

      const maxItems = Math.min(5, feed.items.length);

      // Track intended actions per reviewId: 'read' or 'save'
      const actionsByReviewId = {};

      for (let i = 0; i < maxItems; i++) {
        const card = feed.items[i];
        const reviewId = card.reviewId;

        if (i % 2 === 0) {
          // 0-based indices: 0,2,4 correspond to 1st,3rd,5th -> Mark as Read
          const markResult = this.logic.markReviewAsRead(reviewId);
          this.assert(markResult && markResult.success === true, "markReviewAsRead should succeed");
          this.assert(markResult.isRead === true, "markReviewAsRead should set isRead true");
          actionsByReviewId[reviewId] = "read";
        } else {
          // 2nd,4th -> Save for Later list
          const saveResult = this.logic.addReviewToDefaultList("save_for_later", reviewId);
          this.assert(saveResult && saveResult.success === true, "addReviewToDefaultList to Save for Later should succeed");
          this.assert(saveResult.listType === "save_for_later", "List type should be save_for_later for Save for Later action");
          actionsByReviewId[reviewId] = "save";
        }
      }

      // Verify via updated home feed
      const updatedFeed = this.logic.getHomeFeed("newest_first", 1, 5);
      this.assert(updatedFeed && Array.isArray(updatedFeed.items), "Updated home feed should return items array");

      for (let j = 0; j < updatedFeed.items.length; j++) {
        const item = updatedFeed.items[j];
        const action = actionsByReviewId[item.reviewId];
        if (!action) continue;

        if (action === "read") {
          this.assert(item.isRead === true, "Feed item marked as 'read' should have isRead true");
        } else if (action === "save") {
          this.assert(item.isSavedForLater === true, "Feed item marked as 'save' should have isSavedForLater true");
        }
      }

      // Also verify Save for Later list contains reviews marked to save
      const saveList = this.getReadingListByType("save_for_later");
      this.assert(saveList, "Save for Later list should exist");
      const saveItemsResult = this.logic.getReadingListItems(saveList.id, "date_added_newest_first", 1, 20);
      this.assert(saveItemsResult && Array.isArray(saveItemsResult.items), "getReadingListItems for Save for Later should return items array");
      const savedIds = saveItemsResult.items.map(function (it) { return it.reviewId; });

      for (const reviewId in actionsByReviewId) {
        if (Object.prototype.hasOwnProperty.call(actionsByReviewId, reviewId)) {
          if (actionsByReviewId[reviewId] === "save") {
            this.assert(
              savedIds.indexOf(reviewId) !== -1,
              "Save for Later list should include review marked to save " + reviewId
            );
          }
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
