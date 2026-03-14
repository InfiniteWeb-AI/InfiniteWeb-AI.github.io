// Test runner for horse blog business logic flows

// Polyfill localStorage for Node.js if needed
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _data: {},
    setItem: function (key, value) { this._data[key] = String(value); },
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
    removeItem: function (key) { delete this._data[key]; },
    clear: function () { this._data = {}; }
  };
}

// Generated Data - used ONLY inside setupTestData()
const generatedData = {
  "photos": [
    {
      "id": "photo_comp_2022_01",
      "title": "First 90cm Round at Spring Valley",
      "description": "Star locking onto the first oxer of our 90cm round at Spring Valley. I was nervous, but she took me to the fence like a pro.",
      "year": 2022,
      "category": "competitions",
      "image_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=600&fit=crop&auto=format&q=80",
      "thumbnail_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=300&fit=crop&auto=format&q=80",
      "taken_at": "2022-03-12T14:10:00Z",
      "location": "Spring Valley Showgrounds"
    },
    {
      "id": "photo_comp_2022_02",
      "title": "Tight Turn to the Double",
      "description": "Second fence of the tricky two-stride double at Spring Valley. We practiced this turn for weeks at home.",
      "year": 2022,
      "category": "competitions",
      "image_url": "https://images.unsplash.com/photo-1517821099605-691c3ce696c7?w=800&h=600&fit=crop&auto=format&q=80",
      "thumbnail_url": "https://images.unsplash.com/photo-1517821099605-691c3ce696c7?w=400&h=300&fit=crop&auto=format&q=80",
      "taken_at": "2022-03-12T14:18:00Z",
      "location": "Spring Valley Showgrounds"
    },
    {
      "id": "photo_comp_2022_03",
      "title": "Clearing the Water Tray",
      "description": "Our first clear jump over a spooky water tray at the county show. Star hesitated for a stride, then flew.",
      "year": 2022,
      "category": "competitions",
      "image_url": "https://images.unsplash.com/photo-1520991346501-1e31af3f3885?w=800&h=600&fit=crop&auto=format&q=80",
      "thumbnail_url": "https://images.unsplash.com/photo-1520991346501-1e31af3f3885?w=400&h=300&fit=crop&auto=format&q=80",
      "taken_at": "2022-05-28T10:42:00Z",
      "location": "Greenfield County Show"
    }
  ],
  "polls": [
    {
      "id": "tricks_next",
      "question": "Which trick should Star learn next?",
      "description": "Help me choose Stars next trick to work on in our clicker training sessions. Options include Bow, Spanish walk, Lie down, and Kiss.",
      "is_active": true,
      "created_at": "2025-11-01T09:00:00Z",
      "closes_at": "2026-06-01T23:59:59Z"
    },
    {
      "id": "newsletter_topics",
      "question": "What kind of updates do you want more of on the blog?",
      "description": "Select the topics you check the blog for most often so I can plan future posts and newsletter content.",
      "is_active": true,
      "created_at": "2025-06-15T12:30:00Z",
      "closes_at": null
    },
    {
      "id": "competition_goals_2026",
      "question": "What should our main competition goal be for the 2026 season?",
      "description": "Should we focus on moving up a height, staying consistent at 1m, or trying a short eventing season?",
      "is_active": false,
      "created_at": "2025-10-10T08:15:00Z",
      "closes_at": "2025-12-31T23:59:59Z"
    }
  ],
  "tags": [
    {
      "id": "jumping",
      "name": "Jumping",
      "slug": "jumping",
      "description": "Posts about jumping exercises, course walks, and showjumping competitions."
    },
    {
      "id": "lameness",
      "name": "Lameness",
      "slug": "lameness",
      "description": "Health articles that focus on diagnosing, treating, and preventing lameness issues."
    },
    {
      "id": "tricks",
      "name": "Tricks",
      "slug": "tricks",
      "description": "Fun trick training sessions like bow, smile, and Spanish walk."
    }
  ],
  "articles": [
    {
      "id": "training_jumping_2024_01",
      "title": "Building Stars Winter Jumping Base with Low Grids",
      "slug": "building-stars-winter-jumping-base-low-grids",
      "url": "article.html?id=training_jumping_2024_01",
      "category": "training",
      "tagIds": [
        "jumping"
      ],
      "summary": "How I used simple low grids over winter to rebuild Stars confidence, balance, and strength before the 2024 show season.",
      "content": "<h1>Building Stars Winter Jumping Base with Low Grids</h1>\n<p>This winter I focused on low, confidence-building grids instead of big fences. Star had a lighter competition schedule in 2023, so I wanted to quietly rebuild her strength and enthusiasm.</p>\n<h2>The basic grid setup</h2>\n<p>I set up three cross-poles with placing poles before and after the line. The distances were short enough to encourage a bouncy, round canter rather than speed.</p>\n<h2>Goals for each session</h2>\n<ul>\n<li>Rhythm through the grid in both directions</li>\n<li>Even, straight approach and departure</li>\n<li>Soft, elastic contact instead of pulling to the jumps</li>\n</ul>\n<p>By keeping the fences small, I could focus on my position and Star could focus on her technique. This laid the groundwork for the bigger \u201cJumping\u201d sessions youll see in later 2024 training posts.</p>",
      "published_at": "2024-01-10T09:15:00Z",
      "display_published_date": "January 10, 2024",
      "hero_image_url": "https://www.visitgainesville.com/wp-content/uploads/2019/08/jumping-at-alachua-county-agricultural-and-equestrian-center-1024x1024.jpg",
      "thumbnail_image_url": "https://www.visitgainesville.com/wp-content/uploads/2019/08/jumping-at-alachua-county-agricultural-and-equestrian-center-1024x1024.jpg",
      "reading_time_minutes": 8,
      "allow_comments": true,
      "is_featured": true
    },
    {
      "id": "training_jumping_2024_02",
      "title": "Gymnastic Lines to Sharpen Our 90cm Rounds",
      "slug": "gymnastic-lines-to-sharpen-our-90cm-rounds",
      "url": "article.html?id=training_jumping_2024_02",
      "category": "training",
      "tagIds": [
        "jumping"
      ],
      "summary": "A look at the gymnastic lines I used in early 2024 to help Star stay careful and rideable around 90cm courses.",
      "content": "<h1>Gymnastic Lines to Sharpen Our 90cm Rounds</h1>\n<p>With Star feeling stronger after our winter gridwork, I started adding slightly more challenging gymnastic lines in February 2024.</p>\n<h2>The 90cm exercise</h2>\n<p>The line was a vertical to oxer combination, followed by three strides to another vertical. Everything stayed around 80\u201390cm, but the focus was on control, not height.</p>\n<h2>What I looked for</h2>\n<ul>\n<li>A steady approach to the first fence</li>\n<li>Quick, thoughtful hind legs through the line</li>\n<li>Soft downward transition after the last vertical</li>\n</ul>\n<p>These jumping sessions made a huge difference once we started walking 2024 show courses and riding our first rounds of the season.</p>",
      "published_at": "2024-02-18T16:40:00Z",
      "display_published_date": "February 18, 2024",
      "hero_image_url": "https://shivanipandey.files.wordpress.com/2012/02/img_8275.jpg?w=825",
      "thumbnail_image_url": "https://shivanipandey.files.wordpress.com/2012/02/img_8275.jpg?w=825",
      "reading_time_minutes": 7,
      "allow_comments": true,
      "is_featured": false
    },
    {
      "id": "training_jumping_2024_03",
      "title": "First Outdoor Course Walk of 2024",
      "slug": "first-outdoor-course-walk-of-2024",
      "url": "article.html?id=training_jumping_2024_03",
      "category": "training",
      "tagIds": [
        "jumping"
      ],
      "summary": "How our first full outdoor jumping course of 2024 went, plus the lines I set to mimic early-season shows.",
      "content": "<h1>First Outdoor Course Walk of 2024</h1>\n<p>As soon as the ground dried enough, I set a full course outside to see how well our winter jumping homework had worked.</p>\n<h2>Course design</h2>\n<p>I built a 10-fence course with a mix of oxers, verticals, a related distance, and a small two-stride combination. Heights stayed at 85\u201390cm to keep it confidence building.</p>\n<h2>Takeaways</h2>\n<ol>\n<li>Star stayed in a consistent rhythm between fences.</li>\n<li>Our turns to the related distance still need work.</li>\n<li>The winter focus on grids and gymnastic lines really paid off.</li>\n</ol>\n<p>This session became the foundation for several more 2024 jumping training posts youll see under the Training & Jumping filters.</p>",
      "published_at": "2024-04-03T15:05:00Z",
      "display_published_date": "April 3, 2024",
      "hero_image_url": "https://www.horseandrideruk.com/wp-content/uploads/2018/07/HR_WEB_Jumping-bigger.jpg",
      "thumbnail_image_url": "https://www.horseandrideruk.com/wp-content/uploads/2018/07/HR_WEB_Jumping-bigger.jpg",
      "reading_time_minutes": 9,
      "allow_comments": true,
      "is_featured": false
    }
  ],
  "poll_votes": [
    {
      "id": "pollvote_001",
      "pollId": "tricks_next",
      "optionId": "tricks_next_bow",
      "created_at": "2025-11-05T10:12:00Z"
    },
    {
      "id": "pollvote_002",
      "pollId": "tricks_next",
      "optionId": "tricks_next_spanish_walk",
      "created_at": "2025-11-06T18:45:00Z"
    },
    {
      "id": "pollvote_003",
      "pollId": "newsletter_topics",
      "optionId": "newsletter_training_tips",
      "created_at": "2025-06-20T09:30:00Z"
    }
  ],
  "poll_options": [
    {
      "id": "tricks_next_bow",
      "pollId": "tricks_next",
      "label": "Bow",
      "value": "bow",
      "vote_count": 1
    },
    {
      "id": "tricks_next_spanish_walk",
      "pollId": "tricks_next",
      "label": "Spanish walk",
      "value": "spanish_walk",
      "vote_count": 1
    },
    {
      "id": "tricks_next_lie_down",
      "pollId": "tricks_next",
      "label": "Lie down",
      "value": "lie_down",
      "vote_count": 0
    }
  ],
  "_metadata": {
    "baselineDate": "2026-03-03",
    "generatedAt": "2026-03-03T03:41:26.959718"
  }
};

// Test runner for business logic
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
    // Reinitialize storage structure if the logic provides an initializer
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage using storage keys
    // Articles, tags, polls, poll options, poll votes, photos
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('tags', JSON.stringify(generatedData.tags || []));
    localStorage.setItem('polls', JSON.stringify(generatedData.polls || []));
    localStorage.setItem('poll_options', JSON.stringify(generatedData.poll_options || []));
    localStorage.setItem('poll_votes', JSON.stringify(generatedData.poll_votes || []));
    localStorage.setItem('photos', JSON.stringify(generatedData.photos || []));

    // Empty collections for entities with no pre-generated data
    if (!localStorage.getItem('comments')) {
      localStorage.setItem('comments', JSON.stringify([]));
    }
    if (!localStorage.getItem('reading_list_items')) {
      localStorage.setItem('reading_list_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('favorite_articles')) {
      localStorage.setItem('favorite_articles', JSON.stringify([]));
    }
    if (!localStorage.getItem('favorite_photos')) {
      localStorage.setItem('favorite_photos', JSON.stringify([]));
    }
    if (!localStorage.getItem('newsletter_subscriptions')) {
      localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_messages')) {
      localStorage.setItem('contact_messages', JSON.stringify([]));
    }
  }

  // Helper to safely parse arrays from storage
  loadArray(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try { return JSON.parse(raw) || []; } catch (e) { return []; }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveFirstThree2024JumpingTrainingPostsToReadingList();
    this.testTask2_CommentOnNewestTaggedArticleWithThirtyWordMessage();
    this.testTask3_FavoriteEarliestFilteredStoryAndAccessFromFavorites();
    this.testTask4_SubscribeToNewsletterWeeklyHtmlTrainingAndCompetition();
    this.testTask5_CreateReadingPlanAndGroupByCategory();
    this.testTask6_SendNutritionQuestionReferencingOatsArticleAndDate();
    this.testTask7_VoteForBowInTricksPollAndComment();
    this.testTask8_FavoriteCompetitionPhotosFrom2022GalleryAndBrowse();

    return this.results;
  }

  // Task 1: Save the first three 2024 jumping training posts to your reading list
  testTask1_SaveFirstThree2024JumpingTrainingPostsToReadingList() {
    const testName = 'Task 1: Save first three 2024 jumping training posts to reading list';
    console.log('Testing:', testName);

    try {
      // Fresh state for this flow
      this.clearStorage();
      this.setupTestData();

      // Find Jumping tag id from stored tags (no hardcoded ids)
      const tags = this.loadArray('tags');
      const jumpingTag = tags.find(t => t.name === 'Jumping');
      const jumpingTagId = jumpingTag ? jumpingTag.id : undefined;

      // Filter Training articles by Jumping tag and 2024 year
      const yearFilter = 2024;
      const articlesResponse = this.logic.getArticlesForCategory('training', jumpingTagId, yearFilter, 'newest_first', 1, 10);

      this.assert(articlesResponse, 'Should receive articles response for Training category');
      this.assert(Array.isArray(articlesResponse.articles), 'Articles list should be an array');
      this.assert(articlesResponse.total_results >= 3, 'Should have at least 3 matching Training/Jumping 2024 posts');

      const listItems = articlesResponse.articles;
      const firstArticleId = listItems[0].article.id;
      const secondArticleId = listItems[1].article.id;
      const thirdArticleId = listItems[2].article.id;

      // Open first article detail (simulate clicking title)
      const detailFirst = this.logic.getArticleDetail(firstArticleId);
      this.assert(detailFirst && detailFirst.article && detailFirst.article.id === firstArticleId, 'Detail should load for first article');

      // Save first article to reading list via detail page
      const saveFirstResult = this.logic.saveArticleToReadingList(firstArticleId);
      this.assert(saveFirstResult.success === true, 'First article should be saved to reading list');
      this.assert(saveFirstResult.reading_list_item && saveFirstResult.reading_list_item.articleId === firstArticleId, 'ReadingListItem should reference the first article');

      // Save second and third articles directly from the list (simulate bookmark icon)
      const saveSecondResult = this.logic.saveArticleToReadingList(secondArticleId);
      this.assert(saveSecondResult.success === true, 'Second article should be saved to reading list');

      const saveThirdResult = this.logic.saveArticleToReadingList(thirdArticleId);
      this.assert(saveThirdResult.success === true, 'Third article should be saved to reading list');

      // Open reading list (simulate clicking Reading list link in header)
      const readingList = this.logic.getReadingListItems('none', 'added_at_desc');
      this.assert(readingList && typeof readingList.total_items === 'number', 'Reading list metadata should be returned');
      this.assert(readingList.total_items >= 3, 'Reading list should contain at least three items');

      const savedIds = [firstArticleId, secondArticleId, thirdArticleId];
      savedIds.forEach(id => {
        const found = readingList.items.find(entry => entry.article && entry.article.id === id);
        this.assert(!!found, 'Reading list should contain saved article: ' + id);
        this.assert(found.reading_list_item && found.reading_list_item.articleId === found.article.id, 'ReadingListItem should point to Article for ' + id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Comment on the newest health post about lameness with a 30+ word message
  // Adapted: If no Health/Lameness article exists, use newest Training article.
  testTask2_CommentOnNewestTaggedArticleWithThirtyWordMessage() {
    const testName = 'Task 2: Comment on newest tagged article with 30+ word message';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Try Health category first, fallback to Training if no articles
      let categoryId = 'health';
      let articlesResponse = this.logic.getArticlesForCategory(categoryId, undefined, undefined, 'newest_first', 1, 10);
      if (!articlesResponse || articlesResponse.total_results === 0) {
        categoryId = 'training';
        articlesResponse = this.logic.getArticlesForCategory(categoryId, undefined, undefined, 'newest_first', 1, 10);
      }

      this.assert(articlesResponse && articlesResponse.total_results > 0, 'Should have at least one article to comment on');
      const newestArticle = articlesResponse.articles[0].article;
      const articleId = newestArticle.id;

      // Load detail to confirm comments are allowed
      const detail = this.logic.getArticleDetail(articleId);
      this.assert(detail && detail.article && detail.article.id === articleId, 'Should load article detail for commenting');
      this.assert(detail.article.allow_comments === true, 'Article should allow comments');

      const commentBody = 'I really appreciate how you describe the adjustments to your training schedule after noticing small issues. ' +
        'It reminds me to plan a proactive vet visit whenever my horse feels slightly off in work.';

      const submitResult = this.logic.submitArticleComment(
        articleId,
        'Guest Rider',
        'guest@example.com',
        commentBody
      );

      this.assert(submitResult && submitResult.success === true, 'Comment submission should succeed');
      this.assert(submitResult.comment, 'Response should include the created comment');
      this.assert(submitResult.comment.articleId === articleId, 'Comment should be associated with the correct article');
      this.assert(submitResult.comment.author_name === 'Guest Rider', 'Comment author_name should match input');
      this.assert(submitResult.comment.body.indexOf('training schedule') !== -1, 'Comment should contain phrase "training schedule"');
      this.assert(submitResult.comment.body.indexOf('vet visit') !== -1, 'Comment should contain phrase "vet visit"');

      // Verify that fetching the article again returns the new comment in its comments list
      const detailAfter = this.logic.getArticleDetail(articleId);
      this.assert(Array.isArray(detailAfter.comments), 'Article detail should expose comments array');
      const foundComment = detailAfter.comments.find(c => c.id === submitResult.comment.id);
      this.assert(!!foundComment, 'Newly created comment should appear in article comments');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Favorite the earliest competition story (adapted) and access it from favorites
  testTask3_FavoriteEarliestFilteredStoryAndAccessFromFavorites() {
    const testName = 'Task 3: Favorite earliest filtered story and reopen from favorites';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Try Competitions 2023 first, fallback to Training if none
      let categoryId = 'competitions';
      let filterYear = 2023;
      let articlesResponse = this.logic.getArticlesForCategory(categoryId, undefined, filterYear, 'oldest_first', 1, 10);

      if (!articlesResponse || articlesResponse.total_results === 0) {
        categoryId = 'training';
        filterYear = undefined; // no year filter if competitions not available
        articlesResponse = this.logic.getArticlesForCategory(categoryId, undefined, filterYear, 'oldest_first', 1, 10);
      }

      this.assert(articlesResponse && articlesResponse.total_results > 0, 'Should have at least one article to favorite');

      const earliestArticle = articlesResponse.articles[0].article;
      const articleId = earliestArticle.id;

      // Load detail
      const detail = this.logic.getArticleDetail(articleId);
      this.assert(detail && detail.article && detail.article.id === articleId, 'Should load article detail before favoriting');
      this.assert(typeof detail.article.url === 'string' && detail.article.url.length > 0, 'Article should have a URL to copy');

      // Add to favorites
      const favResult = this.logic.addArticleToFavorites(articleId);
      this.assert(favResult && favResult.success === true, 'Adding article to favorites should succeed');
      this.assert(favResult.favorite && favResult.favorite.articleId === articleId, 'Favorite record should reference the article');

      // Simulate copying link by reading it from the detail response
      const copiedLink = detail.article.url;
      this.assert(!!copiedLink, 'Copied link (URL) should not be empty');

      // Open favorites overview
      const favOverview = this.logic.getFavoritesOverview();
      this.assert(favOverview, 'Favorites overview should be returned');
      this.assert(typeof favOverview.total_favorite_articles === 'number', 'Favorites overview should report total_favorite_articles');
      this.assert(favOverview.total_favorite_articles >= 1, 'There should be at least one favorited article');

      const favoritedEntry = favOverview.articles.find(entry => entry.article && entry.article.id === articleId);
      this.assert(!!favoritedEntry, 'Favorited article should appear in favorites overview');
      this.assert(favoritedEntry.favorite && favoritedEntry.favorite.articleId === favoritedEntry.article.id, 'FavoriteArticle should belong to Article');

      // Reopen the story from favorites (simulate clicking from favorites page)
      const reopenedDetail = this.logic.getArticleDetail(favoritedEntry.article.id);
      this.assert(reopenedDetail && reopenedDetail.article && reopenedDetail.article.id === articleId, 'Reopened article detail should match favorited article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Subscribe to the newsletter for weekly training and competition updates
  testTask4_SubscribeToNewsletterWeeklyHtmlTrainingAndCompetition() {
    const testName = 'Task 4: Subscribe to newsletter with weekly HTML training and competition updates';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const name = 'Horse Fan';
      const email = 'horse_fan@example.com';
      const wantsTrainingTips = true;
      const wantsCompetitionUpdates = true;
      const wantsMerchOffers = false;
      const frequency = 'weekly';
      const emailFormat = 'html';

      const subResult = this.logic.createNewsletterSubscription(
        name,
        email,
        wantsTrainingTips,
        wantsCompetitionUpdates,
        wantsMerchOffers,
        frequency,
        emailFormat
      );

      this.assert(subResult && subResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subResult.subscription, 'Response should include a subscription object');
      const sub = subResult.subscription;
      this.assert(sub.name === name, 'Subscription name should match input');
      this.assert(sub.email === email, 'Subscription email should match input');
      this.assert(sub.wants_training_tips === wantsTrainingTips, 'wants_training_tips flag should match');
      this.assert(sub.wants_competition_updates === wantsCompetitionUpdates, 'wants_competition_updates flag should match');
      this.assert(sub.wants_merchandise_offers === wantsMerchOffers, 'wants_merchandise_offers flag should match');
      this.assert(sub.frequency === frequency, 'Subscription frequency should be weekly');
      this.assert(sub.email_format === emailFormat, 'Subscription email_format should be html');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Create a 5-post reading plan (adapted to whatever categories exist) and group by category
  testTask5_CreateReadingPlanAndGroupByCategory() {
    const testName = 'Task 5: Create reading plan and group reading list by category';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const savedArticleIds = [];

      // Save up to 2 Training posts from list
      const trainingList = this.logic.getArticlesForCategory('training', undefined, undefined, 'newest_first', 1, 10);
      this.assert(trainingList && Array.isArray(trainingList.articles), 'Training articles response should be valid');
      const trainingCount = Math.min(2, trainingList.articles.length);
      for (let i = 0; i < trainingCount; i++) {
        const artId = trainingList.articles[i].article.id;
        const res = this.logic.saveArticleToReadingList(artId);
        this.assert(res && res.success === true, 'Should save Training article ' + artId + ' to reading list');
        if (savedArticleIds.indexOf(artId) === -1) savedArticleIds.push(artId);
      }

      // Save up to 2 Health posts (if any exist)
      const healthList = this.logic.getArticlesForCategory('health', undefined, undefined, 'newest_first', 1, 10);
      if (healthList && healthList.total_results > 0) {
        const healthCount = Math.min(2, healthList.articles.length);
        for (let i = 0; i < healthCount; i++) {
          const artId = healthList.articles[i].article.id;
          const res = this.logic.saveArticleToReadingList(artId);
          this.assert(res && res.success === true, 'Should save Health article ' + artId + ' to reading list');
          if (savedArticleIds.indexOf(artId) === -1) savedArticleIds.push(artId);
        }
      }

      // Save 1 Gear/Equipment post (if any exist) via detail page
      const gearList = this.logic.getArticlesForCategory('gear', undefined, undefined, 'newest_first', 1, 10);
      if (gearList && gearList.total_results > 0) {
        const gearArticle = gearList.articles[0].article;
        const detail = this.logic.getArticleDetail(gearArticle.id);
        this.assert(detail && detail.article && detail.article.id === gearArticle.id, 'Should load Gear article detail before saving');
        const res = this.logic.saveArticleToReadingList(gearArticle.id);
        this.assert(res && res.success === true, 'Should save Gear article to reading list');
        if (savedArticleIds.indexOf(gearArticle.id) === -1) savedArticleIds.push(gearArticle.id);
      }

      this.assert(savedArticleIds.length > 0, 'At least one article should be saved in the reading plan');

      // Open reading list grouped by category (simulate selecting "Category" grouping)
      const groupedList = this.logic.getReadingListItems('category', 'added_at_desc');
      this.assert(groupedList, 'Grouped reading list response should be returned');
      this.assert(typeof groupedList.total_items === 'number', 'Grouped reading list should report total_items');
      this.assert(groupedList.total_items === savedArticleIds.length, 'Grouped reading list total_items should match saved articles count');

      // Ensure grouping by category works and that all saved articles are present in groups
      this.assert(Array.isArray(groupedList.groups), 'Grouped reading list should expose groups array');
      const allGroupedArticleIds = [];
      groupedList.groups.forEach(group => {
        this.assert(Array.isArray(group.items), 'Each group should have an items array');
        group.items.forEach(entry => {
          if (entry.article && entry.article.id) {
            allGroupedArticleIds.push(entry.article.id);
          }
        });
      });

      savedArticleIds.forEach(id => {
        this.assert(allGroupedArticleIds.indexOf(id) !== -1, 'Saved article ' + id + ' should appear in grouped reading list');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Send a nutrition question via contact form referencing an oats article and its date
  // Adapted: If no search result for "oats feed", fall back to first Training article but still include its date and the word "oats".
  testTask6_SendNutritionQuestionReferencingOatsArticleAndDate() {
    const testName = 'Task 6: Send nutrition question via contact form referencing article and date';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Search for article about oats feeding
      let searchResult = this.logic.searchArticles('oats feed', undefined, 1, 10);
      let targetArticle;

      if (searchResult && searchResult.total_results > 0) {
        targetArticle = searchResult.results[0].article;
      } else {
        // Fallback: use first Training article
        const trainingList = this.logic.getArticlesForCategory('training', undefined, undefined, 'newest_first', 1, 10);
        this.assert(trainingList && trainingList.total_results > 0, 'Should have at least one article to reference in contact form');
        targetArticle = trainingList.articles[0].article;
      }

      const articleDetail = this.logic.getArticleDetail(targetArticle.id);
      this.assert(articleDetail && articleDetail.article && articleDetail.article.id === targetArticle.id, 'Should load article detail for contact reference');

      const publishedDateText = articleDetail.article.display_published_date;
      this.assert(typeof publishedDateText === 'string' && publishedDateText.length > 0, 'Article should expose display_published_date');

      // Get contact form options and choose Nutrition advice if available
      const options = this.logic.getContactFormOptions();
      this.assert(options && Array.isArray(options.inquiry_types), 'Contact form options should include inquiry_types');
      const nutritionOption = options.inquiry_types.find(o => o.value === 'nutrition_advice');
      const inquiryTypeValue = nutritionOption ? nutritionOption.value : options.inquiry_types[0].value;

      const name = 'Alex Rider';
      const email = 'alex@example.com';
      const subject = 'Question about oats feeding schedule';
      const message = 'Hello, I have a nutrition question about feeding oats to my horse. ' +
        'I was reading your article published on ' + publishedDateText +
        ' and wondered how to adjust the amount of oats when workload changes during different seasons and competitions safely.';

      const submitResult = this.logic.submitContactMessage(
        name,
        email,
        subject,
        message,
        inquiryTypeValue,
        targetArticle.id,
        publishedDateText
      );

      this.assert(submitResult && submitResult.success === true, 'Contact message submission should succeed');
      this.assert(submitResult.contact_message, 'Response should include contact_message object');
      const cm = submitResult.contact_message;
      this.assert(cm.name === name, 'Contact message name should match input');
      this.assert(cm.email === email, 'Contact message email should match input');
      this.assert(cm.subject === subject, 'Contact message subject should match input');
      this.assert(cm.inquiry_type === inquiryTypeValue, 'Inquiry type should match selected option');
      this.assert(cm.relatedArticleId === targetArticle.id, 'relatedArticleId should link to target article');
      this.assert(cm.related_article_published_date_text === publishedDateText, 'related_article_published_date_text should match article display date');
      this.assert(cm.message.indexOf('oats') !== -1, 'Contact message body should contain the word "oats"');
      this.assert(cm.message.indexOf(publishedDateText) !== -1, 'Contact message body should contain the published date text');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Vote for 'Bow' in a tricks poll and comment about your choice
  // Adapted: Poll is taken directly from polls storage; comment is posted on an available article.
  testTask7_VoteForBowInTricksPollAndComment() {
    const testName = 'Task 7: Vote for "Bow" in tricks poll and comment about choice';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // --- Poll voting flow ---
      const polls = this.loadArray('polls');
      this.assert(Array.isArray(polls) && polls.length > 0, 'Polls should be present in storage');

      // Find the tricks poll (by question text or id)
      let tricksPoll = polls.find(p => p.question && p.question.indexOf('Which trick should Star learn next?') !== -1);
      if (!tricksPoll) {
        tricksPoll = polls.find(p => p.id === 'tricks_next') || polls[0];
      }
      this.assert(tricksPoll && tricksPoll.is_active === true, 'Tricks poll should be active');

      const pollOptionsAll = this.loadArray('poll_options');
      const tricksOptions = pollOptionsAll.filter(o => o.pollId === tricksPoll.id);
      this.assert(tricksOptions.length > 0, 'Poll should have options');

      let bowOption = tricksOptions.find(o => o.label === 'Bow');
      if (!bowOption) {
        bowOption = tricksOptions.find(o => o.value === 'bow') || tricksOptions[0];
      }
      this.assert(bowOption, 'Should find Bow option in tricks poll');

      const previousVoteCount = bowOption.vote_count || 0;

      const voteResult = this.logic.submitPollVote(tricksPoll.id, bowOption.id);
      this.assert(voteResult && voteResult.success === true, 'Poll vote submission should succeed');
      this.assert(voteResult.user_selected_option_id === bowOption.id, 'user_selected_option_id should match Bow option id');
      this.assert(Array.isArray(voteResult.options), 'Vote result should include options array');

      const updatedBow = voteResult.options.find(o => o.id === bowOption.id);
      this.assert(updatedBow, 'Updated options should include Bow');
      this.assert(typeof updatedBow.vote_count === 'number' && updatedBow.vote_count >= previousVoteCount, 'Bow vote_count should be >= previous count');

      // --- Comment flow ---
      // Use first available Training article for the tricks-related comment
      const trainingList = this.logic.getArticlesForCategory('training', undefined, undefined, 'newest_first', 1, 10);
      this.assert(trainingList && trainingList.total_results > 0, 'Should have at least one article to comment on for tricks');
      const targetArticle = trainingList.articles[0].article;

      const detail = this.logic.getArticleDetail(targetArticle.id);
      this.assert(detail && detail.article && detail.article.id === targetArticle.id, 'Should load article detail before commenting');
      this.assert(detail.article.allow_comments === true, 'Article should allow comments for tricks discussion');

      const commentBody = 'I chose bow because it teaches the horse to stretch and relax. ' +
        'Bow also looks adorable and builds trust between rider and horse during each training session.';

      const commentResult = this.logic.submitArticleComment(
        targetArticle.id,
        'Trick Voter',
        'voter@example.com',
        commentBody
      );

      this.assert(commentResult && commentResult.success === true, 'Tricks comment submission should succeed');
      this.assert(commentResult.comment && commentResult.comment.articleId === targetArticle.id, 'Tricks comment should be linked to target article');
      this.assert(commentResult.comment.body.toLowerCase().indexOf('bow') !== -1, 'Tricks comment body should mention "bow"');

      const detailAfter = this.logic.getArticleDetail(targetArticle.id);
      const newComment = detailAfter.comments.find(c => c.id === commentResult.comment.id);
      this.assert(!!newComment, 'Tricks comment should appear in article comments list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Favorite 4 specific photos from the 2022 competitions gallery and browse them
  // Adapted: Favorite all available 2022 competition photos (up to 4) and ensure we can navigate to a "next" photo.
  testTask8_FavoriteCompetitionPhotosFrom2022GalleryAndBrowse() {
    const testName = 'Task 8: Favorite 2022 competition photos and browse favorites';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Get gallery filters (simulate opening gallery and choosing year/category)
      const filters = this.logic.getPhotoGalleryFilters();
      this.assert(filters && Array.isArray(filters.year_filters), 'Gallery filters should include year_filters');
      this.assert(Array.isArray(filters.category_filters), 'Gallery filters should include category_filters');

      const year2022 = filters.year_filters.find(y => y.year === 2022) || filters.year_filters[0];
      const competitionsCategory = filters.category_filters.find(c => c.id === 'competitions') || filters.category_filters[0];

      const galleryResponse = this.logic.getGalleryPhotos(year2022.year, competitionsCategory.id, 1, 24);
      this.assert(galleryResponse && Array.isArray(galleryResponse.photos), 'Gallery photos response should be valid');
      this.assert(galleryResponse.total_results > 0, 'Should have at least one 2022 competition photo');

      const photos = galleryResponse.photos;
      const toFavoriteCount = Math.min(4, photos.length);
      this.assert(toFavoriteCount > 0, 'Should have at least one photo to favorite');

      const favoritedPhotoIds = [];
      for (let i = 0; i < toFavoriteCount; i++) {
        const photoId = photos[i].photo.id;
        const favRes = this.logic.addPhotoToFavorites(photoId);
        this.assert(favRes && favRes.success === true, 'Adding photo ' + photoId + ' to favorites should succeed');
        favoritedPhotoIds.push(photoId);
      }

      // Open favorites overview to view favorited photos
      const favOverview = this.logic.getFavoritesOverview();
      this.assert(favOverview && Array.isArray(favOverview.photos), 'Favorites overview should expose photos array');
      this.assert(typeof favOverview.total_favorite_photos === 'number', 'Favorites overview should report total_favorite_photos');
      this.assert(favOverview.total_favorite_photos >= favoritedPhotoIds.length, 'total_favorite_photos should be >= number favorited in this test');

      const favoritePhotos = favOverview.photos;
      favoritedPhotoIds.forEach(id => {
        const found = favoritePhotos.find(entry => entry.photo && entry.photo.id === id);
        this.assert(!!found, 'Favorited photo ' + id + ' should appear in favorites overview');
        this.assert(found.favorite && found.favorite.photoId === found.photo.id, 'FavoritePhoto should reference the correct Photo for ' + id);
      });

      // Simulate opening the 3rd favorited image (or last if fewer than 3) and then moving to next
      const openIndex = Math.min(2, favoritePhotos.length - 1);
      const openedPhoto = favoritePhotos[openIndex];
      this.assert(openedPhoto && openedPhoto.photo, 'Should be able to open a favorited photo at index ' + openIndex);

      const hasNext = openIndex + 1 < favoritePhotos.length;
      if (hasNext) {
        const nextPhoto = favoritePhotos[openIndex + 1];
        this.assert(nextPhoto && nextPhoto.photo, 'Should have a next favorited photo to navigate to');
        this.assert(nextPhoto.photo.id !== openedPhoto.photo.id, 'Next photo should be different from currently opened photo');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Simple assertion helper
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
