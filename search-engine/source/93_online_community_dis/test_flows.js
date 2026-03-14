// Test runner for business logic integration flows for the forum

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
    // IMPORTANT: Use the Generated Data exactly as provided (adapted into JS literals)
    const generatedData = {
      tags: [
        {
          id: 'css',
          name: 'CSS',
          description:
            'Questions and discussions about Cascading Style Sheets, layout techniques, and styling best practices for the web.',
          createdAt: '2023-01-15T10:23:00Z'
        },
        {
          id: 'responsive-design',
          name: 'Responsive Design',
          description:
            'Techniques, tools, and strategies for building layouts that adapt smoothly to different screen sizes and devices.',
          createdAt: '2023-02-10T14:45:00Z'
        },
        {
          id: 'javascript',
          name: 'JavaScript',
          description:
            'General JavaScript programming topics including syntax, patterns, browser APIs, and frameworks.',
          createdAt: '2022-11-05T09:12:00Z'
        }
      ],
      member_profiles: [
        {
          id: 'sample_user',
          displayName: 'sample_user',
          bio: 'Frontend-leaning generalist exploring UX, React, and design systems. Here to learn, share experiments, and get feedback on real-world projects.',
          avatarUrl:
            'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=600&fit=crop&auto=format&q=80',
          title: 'Product Designer & Developer',
          createdAt: '2023-02-18T09:25:00Z',
          discussionsCount: 0,
          repliesCount: 2,
          reputationScore: 4
        },
        {
          id: 'dev_dan',
          displayName: 'Dev Dan',
          bio: 'Full-stack engineer focusing on Node.js, PostgreSQL, and scalable API design. I enjoy helping newcomers understand backend fundamentals.',
          avatarUrl:
            'https://images.unsplash.com/photo-1544723795-3fb0b90c07d7?w=800&h=600&fit=crop&auto=format&q=80',
          title: 'Senior Full-Stack Engineer',
          createdAt: '2020-06-10T14:12:00Z',
          discussionsCount: 0,
          repliesCount: 2,
          reputationScore: 5
        },
        {
          id: 'js_guru',
          displayName: 'JS Guru',
          bio: 'JavaScript enthusiast, conference speaker, and maintainer of several open-source utilities. Ask me about async patterns and performance.',
          avatarUrl:
            'https://1.bp.blogspot.com/-lFNlHhOF85g/YFYUPaYfz9I/AAAAAAAAtrQ/zLG6hqJIQJIPf8LV7ZN13ofHab-nQVUQwCLcBGAsYHQ/s16000/2%2BDSC_3905c.jpg',
          title: 'JavaScript Architect',
          createdAt: '2019-11-21T08:45:00Z',
          discussionsCount: 0,
          repliesCount: 1,
          reputationScore: 2
        }
      ],
      categories: [
        {
          id: 'web-development',
          slug: 'web_development',
          name: 'Web Development',
          description:
            'Frontend and backend web development, including HTML, CSS, JavaScript, frameworks, and performance optimization.',
          createdAt: '2020-01-15T10:00:00Z',
          position: 1,
          discussionCount: 5,
          lastActivityAt: '2026-02-18T12:20:00Z'
        },
        {
          id: 'product-feedback',
          slug: 'product_feedback',
          name: 'Product Feedback',
          description:
            'Suggestions, bug reports, and feature requests for this discussion forum platform.',
          createdAt: '2020-03-10T09:30:00Z',
          position: 2,
          discussionCount: 2,
          lastActivityAt: '2025-12-18T12:10:00Z'
        },
        {
          id: 'design',
          slug: 'design',
          name: 'Design & UX',
          description:
            'User experience design, visual design, design systems, and usability discussions.',
          createdAt: '2020-05-22T14:15:00Z',
          position: 3,
          discussionCount: 2,
          lastActivityAt: '2025-07-07T11:10:00Z'
        }
      ],
      discussion_tags: [
        {
          id: 'dt_1',
          discussionId: 'disc_js_arrays_helpers',
          tagId: 'javascript-arrays',
          createdAt: '2025-12-05T10:15:00Z'
        },
        {
          id: 'dt_2',
          discussionId: 'disc_js_arrays_helpers',
          tagId: 'javascript',
          createdAt: '2025-12-05T10:16:00Z'
        },
        {
          id: 'dt_3',
          discussionId: 'disc_js_arrays_helpers',
          tagId: 'web-development',
          createdAt: '2025-12-05T10:17:00Z'
        }
      ],
      reactions: [
        {
          id: 'react_1',
          postId: 'post_disc_js_arrays_helpers_op',
          reactionType: 'upvote',
          createdAt: '2026-02-15T10:00:00Z'
        },
        {
          id: 'react_2',
          postId: 'post_trending_react_reply_1',
          reactionType: 'like',
          createdAt: '2026-02-16T09:30:00Z'
        },
        {
          id: 'react_3',
          postId: 'post_trending_react_reply_2',
          reactionType: 'like',
          createdAt: '2026-02-16T09:31:00Z'
        }
      ],
      polls: [
        {
          id: 'poll_which_feature_prioritize',
          discussionId: 'disc_which_feature_prioritize',
          question: 'What should we build next?',
          multipleChoiceAllowed: false,
          startAt: '2025-12-18T12:10:00Z',
          endAt: '2025-12-25T12:10:00Z',
          isClosed: true
        },
        {
          id: 'poll_spam_filter_satisfaction',
          discussionId: 'disc_how_to_handle_spam_bots',
          question: 'How satisfied are you with the new spam filtering system?',
          multipleChoiceAllowed: false,
          startAt: '2025-09-05T18:45:00Z',
          endAt: '2025-09-08T18:45:00Z',
          isClosed: true
        }
      ],
      discussions: [
        {
          id: 'disc_js_arrays_helpers',
          categoryId: 'web-development',
          title: 'How do you handle large JavaScript arrays efficiently?',
          body:
            'I\u2019m working with JavaScript arrays that can easily reach tens of thousands of items, and some of my current approaches feel sluggish. I\u2019m relying heavily on map, filter, and reduce, but I\u2019m not sure if I\u2019m structuring my data the best way. What patterns, libraries, or native methods do you use to keep JavaScript arrays performant and readable at scale?',
          createdAt: '2025-12-05T10:10:00Z',
          updatedAt: '2025-12-12T08:45:00Z',
          viewCount: 2450,
          score: 120,
          trendingScore: 82,
          tagIds: ['javascript-arrays', 'javascript', 'web-development'],
          replyCount: 9,
          lastReplyAt: '2025-12-05T14:20:00Z',
          hasPoll: false
        },
        {
          id: 'disc_trending_react_ux_patterns',
          categoryId: 'web-development',
          title: 'React patterns for complex UX flows (share your examples)',
          body:
            'I\u2019m collecting real-world examples of React patterns for complex UX flows: multi-step onboarding, contextual help, and permission-driven UIs. How are you structuring components, state, and routing so that UX stays smooth while the codebase remains maintainable? Screenshots, code snippets, and pattern names are all welcome.',
          createdAt: '2026-02-18T09:00:00Z',
          updatedAt: '2026-02-25T11:30:00Z',
          viewCount: 3125,
          score: 75,
          trendingScore: 98,
          tagIds: ['react', 'ux-design', 'frontend'],
          replyCount: 5,
          lastReplyAt: '2026-02-18T12:20:00Z',
          hasPoll: false
        },
        {
          id: 'disc_portfolio_review_critiques',
          categoryId: 'career',
          title:
            'Portfolio review thread: share your UX and frontend portfolios for critique',
          body:
            'This thread is for detailed portfolio reviews focused on UX and frontend case studies. If you\u2019d like feedback, share a short overview of your background and describe 1\u20113 key projects you want critique on. Reviewers, please be constructive and specific so people can turn your feedback into concrete improvements.',
          createdAt: '2025-10-10T14:20:00Z',
          updatedAt: '2025-11-02T17:10:00Z',
          viewCount: 1780,
          score: 48,
          trendingScore: 54,
          tagIds: ['portfolio-review', 'career-advice', 'ux-design'],
          replyCount: 1,
          lastReplyAt: '2025-10-11T09:35:00Z',
          hasPoll: false
        }
      ],
      posts: [
        {
          id: 'post_disc_js_arrays_helpers_op',
          discussionId: 'disc_js_arrays_helpers',
          parentPostId: null,
          isOriginalPost: true,
          authorDisplayName: 'Array Ninja',
          authorProfileId: 'array_ninja',
          body:
            'Im working with JavaScript arrays that can easily reach tens of thousands of items, and some of my current approaches feel sluggish. Im relying heavily on map, filter, and reduce, but Im not sure if Im structuring my data the best way. What patterns, libraries, or native methods do you use to keep JavaScript arrays performant and readable at scale?',
          createdAt: '2025-12-05T10:10:00Z',
          updatedAt: '2025-12-05T10:10:00Z',
          containsLink: false,
          links: [],
          upvoteCount: 1,
          likeCount: 0,
          replyCount: 9
        },
        {
          id: 'post_disc_js_arrays_helpers_reply_1',
          discussionId: 'disc_js_arrays_helpers',
          parentPostId: 'post_disc_js_arrays_helpers_op',
          isOriginalPost: false,
          authorDisplayName: 'JS Guru',
          authorProfileId: 'js_guru',
          body:
            'For really large arrays I try to avoid creating too many intermediate copies. Chaining map and filter is convenient, but sometimes I replace it with a single for-of loop that handles all conditions at once. It is less elegant, but dramatically reduces allocations in hot paths.',
          createdAt: '2025-12-05T11:00:00Z',
          updatedAt: null,
          containsLink: false,
          links: [],
          upvoteCount: 0,
          likeCount: 0,
          replyCount: 0
        },
        {
          id: 'post_disc_js_arrays_helpers_reply_2',
          discussionId: 'disc_js_arrays_helpers',
          parentPostId: 'post_disc_js_arrays_helpers_op',
          isOriginalPost: false,
          authorDisplayName: 'Dev Dan',
          authorProfileId: 'dev_dan',
          body:
            'One trick is to normalize your data up front. If you can shape the array into a predictable schema when it first arrives, later operations can stay really simple. I also batch expensive transformations so they run once on ingestion instead of on every render.',
          createdAt: '2025-12-05T11:20:00Z',
          updatedAt: null,
          containsLink: false,
          links: [],
          upvoteCount: 0,
          likeCount: 0,
          replyCount: 0
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:43.075596'
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('tags', JSON.stringify(generatedData.tags || []));
    localStorage.setItem(
      'member_profiles',
      JSON.stringify(generatedData.member_profiles || [])
    );
    localStorage.setItem(
      'categories',
      JSON.stringify(generatedData.categories || [])
    );
    localStorage.setItem(
      'discussion_tags',
      JSON.stringify(generatedData.discussion_tags || [])
    );
    localStorage.setItem(
      'reactions',
      JSON.stringify(generatedData.reactions || [])
    );
    localStorage.setItem('polls', JSON.stringify(generatedData.polls || []));
    localStorage.setItem(
      'discussions',
      JSON.stringify(generatedData.discussions || [])
    );
    localStorage.setItem('posts', JSON.stringify(generatedData.posts || []));

    // Initialize other storages to empty arrays/objects if not already set
    if (!localStorage.getItem('private_messages')) {
      localStorage.setItem('private_messages', JSON.stringify([]));
    }
    if (!localStorage.getItem('account_settings')) {
      localStorage.setItem('account_settings', JSON.stringify([]));
    }
    if (!localStorage.getItem('content_reports')) {
      localStorage.setItem('content_reports', JSON.stringify([]));
    }
    if (!localStorage.getItem('poll_options')) {
      localStorage.setItem('poll_options', JSON.stringify([]));
    }
    if (!localStorage.getItem('poll_responses')) {
      localStorage.setItem('poll_responses', JSON.stringify([]));
    }

    // Store metadata (not used by logic, but kept for completeness)
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CreateDiscussionAndSubscribe();
    this.testTask2_FindJsArraysDiscussionAndBookmark();
    this.testTask3_ReplyToTwoUsersAndLikeReplies();
    this.testTask4_FollowThreeTopics();
    this.testTask5_SendPrivateMessageForHelpfulReply();
    this.testTask6_UpdateProfileSettings();
    this.testTask7_ReportSpamReply();
    this.testTask8_CreateProductFeedbackPoll();

    return this.results;
  }

  // Task 1: Create a new discussion in Web Development with specific title and tags and subscribe to it
  testTask1_CreateDiscussionAndSubscribe() {
    const testName =
      'Task 1: Create Web Development discussion with CSS & Responsive Design tags and subscribe';
    try {
      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      const webDevCategory = categories.find(function (c) {
        return c.slug === 'web_development';
      });
      this.assert(webDevCategory, 'Web Development category should exist');

      const title = 'Best resources to learn responsive design?';
      const body =
        'I have been experimenting with responsive layouts for a few months, mostly using flexbox and simple media queries. I still struggle with building complex grids that behave well across many breakpoints. I am looking for high-quality articles, courses, or example projects that dive deep into responsive design best practices.';

      const tagNames = ['CSS', 'Responsive Design'];

      const createResult = this.logic.createDiscussion(
        'web_development',
        title,
        body,
        tagNames,
        true,
        null
      );

      this.assert(createResult && createResult.discussion, 'Discussion should be created');
      const createdDiscussion = createResult.discussion;
      this.assert(createdDiscussion.id, 'Created discussion should have an id');
      this.assert(
        createdDiscussion.categoryId === webDevCategory.id,
        'Discussion categoryId should match Web Development category'
      );

      this.assert(
        createdDiscussion.isSubscribed === true,
        'Discussion should be subscribed when subscribe=true is passed'
      );

      const returnedTags = createResult.tags || [];
      this.assert(
        returnedTags.length === 2,
        'Exactly two tags should be attached to the discussion'
      );
      const returnedTagNames = returnedTags.map(function (t) {
        return t.name;
      });
      this.assert(
        returnedTagNames.indexOf('CSS') !== -1,
        'CSS tag should be attached'
      );
      this.assert(
        returnedTagNames.indexOf('Responsive Design') !== -1,
        'Responsive Design tag should be attached'
      );

      // Verify via thread retrieval
      const thread = this.logic.getDiscussionThread(createdDiscussion.id);
      this.assert(thread && thread.discussion, 'Should retrieve created thread');
      this.assert(
        thread.discussion.id === createdDiscussion.id,
        'Thread discussion id should match created discussion id'
      );
      this.assert(
        thread.category && thread.category.slug === 'web_development',
        'Thread category slug should be web_development'
      );

      const threadTagNames = (thread.tags || []).map(function (t) {
        return t.name;
      });
      this.assert(
        threadTagNames.length === 2,
        'Thread should have exactly two tags attached'
      );
      this.assert(
        threadTagNames.indexOf('CSS') !== -1 &&
          threadTagNames.indexOf('Responsive Design') !== -1,
        'Thread tags should include CSS and Responsive Design'
      );
      this.assert(
        thread.discussion.isSubscribed === true,
        'Subscription flag should persist on discussion'
      );

      // Verify join records in discussion_tags use actual ids
      const discussionTags = JSON.parse(
        localStorage.getItem('discussion_tags') || '[]'
      );
      const joinForDiscussion = discussionTags.filter(function (dt) {
        return dt.discussionId === createdDiscussion.id;
      });
      this.assert(
        joinForDiscussion.length === 2,
        'Two DiscussionTag join records should be created for the discussion'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Find a popular recent JavaScript array discussion and bookmark it
  testTask2_FindJsArraysDiscussionAndBookmark() {
    const testName =
      'Task 2: Search JavaScript arrays discussion, upvote OP, and bookmark';
    try {
      // Adapted: require at least 1 reply instead of 10 due to limited data
      const filters = {
        dateRange: 'last_6_months',
        minReplies: 1
      };

      const searchResult = this.logic.searchDiscussions(
        'JavaScript arrays',
        filters,
        'most_upvoted',
        1,
        20
      );

      this.assert(
        searchResult && Array.isArray(searchResult.results),
        'searchDiscussions should return results array'
      );
      this.assert(
        searchResult.results.length > 0,
        'Search results for JavaScript arrays should not be empty'
      );

      const topResult = searchResult.results[0];
      const discussionFromSearch = topResult.discussion;
      this.assert(
        discussionFromSearch && discussionFromSearch.id,
        'Top search result should include a discussion with id'
      );

      // Open thread and upvote original post
      const thread = this.logic.getDiscussionThread(discussionFromSearch.id);
      this.assert(thread && thread.originalPost, 'Thread should include original post');

      const originalPost = thread.originalPost;
      const previousUpvotes = originalPost.upvoteCount || 0;

      const upvoteResult = this.logic.upvotePost(originalPost.id, true);
      this.assert(upvoteResult.success === true, 'Upvote should succeed');
      this.assert(
        upvoteResult.userHasUpvoted === true,
        'userHasUpvoted should be true after upvoting'
      );
      this.assert(
        typeof upvoteResult.newUpvoteCount === 'number',
        'newUpvoteCount should be a number'
      );
      this.assert(
        upvoteResult.newUpvoteCount === previousUpvotes + 1,
        'newUpvoteCount should increment original upvote count by 1'
      );

      // Bookmark the discussion
      const bookmarkResult = this.logic.setDiscussionBookmark(
        discussionFromSearch.id,
        true
      );
      this.assert(
        bookmarkResult && bookmarkResult.discussion,
        'Bookmark API should return updated discussion'
      );
      this.assert(
        bookmarkResult.discussion.isBookmarked === true,
        'Discussion should be marked as bookmarked'
      );

      // Verify via bookmarks list
      const bookmarkedList = this.logic.getBookmarkedDiscussions();
      this.assert(
        Array.isArray(bookmarkedList),
        'getBookmarkedDiscussions should return an array'
      );

      const bookmarkedEntry = bookmarkedList.find(function (entry) {
        return entry.discussion &&
          entry.discussion.id === discussionFromSearch.id;
      });
      this.assert(bookmarkedEntry, 'Bookmarked discussion should appear in list');
      this.assert(
        bookmarkedEntry.discussion.isBookmarked === true,
        'Bookmarked discussion entry should have isBookmarked=true'
      );

      // Reopen from bookmarks
      const reopenedThread = this.logic.getDiscussionThread(
        bookmarkedEntry.discussion.id
      );
      this.assert(
        reopenedThread && reopenedThread.discussion,
        'Should be able to reopen bookmarked discussion thread'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Reply to two different users in the same thread and like multiple replies
  testTask3_ReplyToTwoUsersAndLikeReplies() {
    const testName =
      'Task 3: Reply to two different users in a thread and like three unique replies';
    try {
      // Get current user display name from account settings (or default)
      const settingsResult = this.logic.getAccountSettings();
      const currentSettings = settingsResult && settingsResult.settings;
      const currentDisplayName =
        (currentSettings && currentSettings.displayName) || 'sample_user';

      // Call home feed (exercise getHomeFeed even if we don\'t use it for selection)
      const homeFeed = this.logic.getHomeFeed(5, 5, 10);
      this.assert(homeFeed && homeFeed.trending, 'Home feed should be returned');

      // Find a discussion that has at least two replies from different authors
      const allPosts = JSON.parse(localStorage.getItem('posts') || '[]');
      const repliesByDiscussion = {};
      for (let i = 0; i < allPosts.length; i++) {
        const p = allPosts[i];
        if (!p.isOriginalPost) {
          if (!repliesByDiscussion[p.discussionId]) {
            repliesByDiscussion[p.discussionId] = [];
          }
          repliesByDiscussion[p.discussionId].push(p);
        }
      }

      let targetDiscussionId = null;
      for (const discussionId in repliesByDiscussion) {
        const replies = repliesByDiscussion[discussionId];
        const authors = {};
        for (let j = 0; j < replies.length; j++) {
          const authorKey =
            replies[j].authorProfileId || replies[j].authorDisplayName;
          authors[authorKey] = true;
        }
        const distinctAuthorCount = Object.keys(authors).length;
        if (distinctAuthorCount >= 2) {
          targetDiscussionId = discussionId;
          break;
        }
      }

      this.assert(
        targetDiscussionId,
        'Should find a discussion with at least two replies from different authors'
      );

      const thread = this.logic.getDiscussionThread(targetDiscussionId);
      this.assert(thread && thread.replies, 'Thread should contain replies array');

      const replies = thread.replies || [];
      this.assert(replies.length >= 2, 'Thread should have at least two replies');

      const firstReply = replies[0];
      const secondReply = replies.find(function (r) {
        return (
          r.id !== firstReply.id &&
          (r.authorProfileId !== firstReply.authorProfileId ||
            r.authorDisplayName !== firstReply.authorDisplayName)
        );
      });
      this.assert(
        secondReply,
        'Should find a second reply from a different user in the same thread'
      );

      // Reply to first user (without @mention)
      const replyBody1 =
        'Thanks for sharing your approach here. Your explanation of how you optimize large arrays is very clear and actionable. I am going to adapt this idea in my own project to see how it affects performance.';
      const reply1Result = this.logic.replyToPost(firstReply.id, replyBody1);
      this.assert(
        reply1Result && reply1Result.newPost,
        'First inline reply should be created'
      );
      this.assert(
        reply1Result.newPost.discussionId === targetDiscussionId,
        'First reply should belong to the target discussion'
      );

      // Reply to second user, starting with @mention
      const mentionPrefix = '@' + secondReply.authorDisplayName;
      const replyBody2 =
        mentionPrefix +
        ' That perspective on preprocessing data is really helpful. I had not considered normalizing the data up front, and I can see how it would simplify later operations.';
      const reply2Result = this.logic.replyToPost(secondReply.id, replyBody2);
      this.assert(
        reply2Result && reply2Result.newPost,
        'Second inline reply with @mention should be created'
      );
      this.assert(
        reply2Result.newPost.discussionId === targetDiscussionId,
        'Second reply should belong to the target discussion'
      );

      // Like exactly 3 different replies from three unique users (excluding current user)
      const updatedThread = this.logic.getDiscussionThread(targetDiscussionId);
      const candidatePosts = [];
      if (updatedThread.originalPost) {
        candidatePosts.push(updatedThread.originalPost);
      }
      (updatedThread.replies || []).forEach(function (p) {
        candidatePosts.push(p);
      });

      const previousLikeCounts = {};
      const filteredCandidates = candidatePosts.filter(function (p) {
        return p.authorDisplayName !== currentDisplayName;
      });
      filteredCandidates.forEach(function (p) {
        previousLikeCounts[p.id] = p.likeCount || 0;
      });

      const chosenPosts = [];
      const seenAuthors = {};
      for (let i = 0; i < filteredCandidates.length; i++) {
        const post = filteredCandidates[i];
        const authorKey = post.authorProfileId || post.authorDisplayName;
        if (!seenAuthors[authorKey]) {
          seenAuthors[authorKey] = true;
          chosenPosts.push(post);
        }
        if (chosenPosts.length === 3) {
          break;
        }
      }

      this.assert(
        chosenPosts.length === 3,
        'Should select three posts from three unique authors to like'
      );

      for (let i = 0; i < chosenPosts.length; i++) {
        const post = chosenPosts[i];
        const likeResult = this.logic.likePost(post.id, true);
        this.assert(likeResult.success === true, 'Liking post should succeed');
        this.assert(
          likeResult.userHasLiked === true,
          'userHasLiked should be true after liking a post'
        );
        this.assert(
          likeResult.newLikeCount === previousLikeCounts[post.id] + 1,
          'newLikeCount should increment previous like count by 1 for post ' +
            post.id
        );
      }

      // Reload thread (simulating returning to top of thread)
      const finalThread = this.logic.getDiscussionThread(targetDiscussionId);
      this.assert(finalThread && finalThread.discussion, 'Final thread should load');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Follow three high-interest topics (adapted to available tags)
  testTask4_FollowThreeTopics() {
    const testName =
      'Task 4: Follow three topics via topic search and verify followed list';
    try {
      // Adapted: use available tags CSS, Responsive Design, and JavaScript
      const cssTopics = this.logic.searchTopics('CSS', 0);
      this.assert(
        Array.isArray(cssTopics) && cssTopics.length > 0,
        'Should find at least one CSS topic'
      );
      const cssTag = cssTopics[0];

      const responsiveTopics = this.logic.searchTopics('Responsive Design', 0);
      this.assert(
        Array.isArray(responsiveTopics) && responsiveTopics.length > 0,
        'Should find at least one Responsive Design topic'
      );
      const responsiveTag = responsiveTopics[0];

      const jsTopics = this.logic.searchTopics('JavaScript', 0);
      this.assert(
        Array.isArray(jsTopics) && jsTopics.length > 0,
        'Should find at least one JavaScript topic'
      );
      const jsTag = jsTopics[0];

      // Follow each of the three topics
      const followCssResult = this.logic.followTopic(cssTag.id);
      this.assert(
        followCssResult && followCssResult.tag,
        'Follow CSS topic should return tag'
      );
      this.assert(
        followCssResult.tag.isFollowed === true,
        'CSS tag should be marked as followed'
      );

      const followResponsiveResult = this.logic.followTopic(responsiveTag.id);
      this.assert(
        followResponsiveResult && followResponsiveResult.tag,
        'Follow Responsive Design topic should return tag'
      );
      this.assert(
        followResponsiveResult.tag.isFollowed === true,
        'Responsive Design tag should be marked as followed'
      );

      const followJsResult = this.logic.followTopic(jsTag.id);
      this.assert(
        followJsResult && followJsResult.tag,
        'Follow JavaScript topic should return tag'
      );
      this.assert(
        followJsResult.tag.isFollowed === true,
        'JavaScript tag should be marked as followed'
      );

      // Verify followed topics list
      const followedTopics = this.logic.getFollowedTopics();
      this.assert(
        Array.isArray(followedTopics),
        'getFollowedTopics should return an array'
      );
      this.assert(
        followedTopics.length === 3,
        'Exactly three topics should be followed in this scenario'
      );

      const followedNames = followedTopics.map(function (t) {
        return t.name;
      });
      this.assert(
        followedNames.indexOf(cssTag.name) !== -1,
        'Followed topics should include CSS'
      );
      this.assert(
        followedNames.indexOf(responsiveTag.name) !== -1,
        'Followed topics should include Responsive Design'
      );
      this.assert(
        followedNames.indexOf(jsTag.name) !== -1,
        'Followed topics should include JavaScript'
      );

      // Open topic detail for one of the followed topics
      const topicDetail = this.logic.getTopicDetail(cssTag.id, 'latest_activity');
      this.assert(topicDetail && topicDetail.tag, 'Should load topic detail');
      this.assert(
        topicDetail.tag.id === cssTag.id,
        'Topic detail tag id should match CSS tag id'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Send a private message to a user whose answer has upvotes (adapted threshold)
  testTask5_SendPrivateMessageForHelpfulReply() {
    const testName =
      'Task 5: Search portfolio discussion, pick a helpful reply author, and send private message';
    try {
      // Step 1: search for portfolio review discussions
      const searchResult = this.logic.searchDiscussions(
        'portfolio review',
        null,
        'relevance',
        1,
        20
      );
      this.assert(
        searchResult && Array.isArray(searchResult.results),
        'searchDiscussions should return results for portfolio review'
      );
      this.assert(
        searchResult.results.length > 0,
        'Portfolio-related search should return at least one discussion'
      );

      const portfolioDiscussion = searchResult.results[0].discussion;
      this.assert(
        portfolioDiscussion && portfolioDiscussion.id,
        'Portfolio discussion from search should have an id'
      );

      const portfolioThread = this.logic.getDiscussionThread(
        portfolioDiscussion.id
      );
      this.assert(
        portfolioThread && portfolioThread.discussion,
        'Should be able to open portfolio discussion thread'
      );

      // Try to find a reply in this thread from a known member profile
      const memberProfiles = JSON.parse(
        localStorage.getItem('member_profiles') || '[]'
      );
      const knownMemberIds = {};
      memberProfiles.forEach(function (m) {
        knownMemberIds[m.id] = true;
      });

      let targetReply = null;
      const portfolioReplies = portfolioThread.replies || [];
      for (let i = 0; i < portfolioReplies.length; i++) {
        const r = portfolioReplies[i];
        if (r.authorProfileId && knownMemberIds[r.authorProfileId]) {
          targetReply = r;
          break;
        }
      }

      // If portfolio thread has no suitable replies, fall back to any known reply
      if (!targetReply) {
        const allPosts = JSON.parse(localStorage.getItem('posts') || '[]');
        for (let i = 0; i < allPosts.length; i++) {
          const p = allPosts[i];
          if (
            !p.isOriginalPost &&
            p.authorProfileId &&
            knownMemberIds[p.authorProfileId]
          ) {
            targetReply = p;
            break;
          }
        }
      }

      this.assert(
        targetReply,
        'Should find at least one reply authored by a known member to contact'
      );

      // Load member profile for the reply author
      const profileResult = this.logic.getMemberProfile(
        targetReply.authorProfileId
      );
      this.assert(profileResult && profileResult.profile, 'Profile should load');
      const recipientProfile = profileResult.profile;
      this.assert(
        recipientProfile.id === targetReply.authorProfileId,
        'Recipient profile id should match reply authorProfileId'
      );

      const subject = 'Request for portfolio feedback';
      const body =
        'I recently read your reply and found your advice very insightful and practical. Your perspective on evaluating work and presenting case studies resonated with me. I am currently refining my own portfolio and would really value any feedback you can share. If you have time, could you outline a few areas you think I should focus on improving? Thank you in advance for any thoughts you are able to share.';

      const pmResult = this.logic.sendPrivateMessage(
        recipientProfile.id,
        subject,
        body
      );
      this.assert(
        pmResult && pmResult.message,
        'sendPrivateMessage should return a message object'
      );
      const sentMessage = pmResult.message;
      this.assert(sentMessage.id, 'Sent message should have an id');
      this.assert(
        sentMessage.recipientProfileId === recipientProfile.id,
        'Message recipientProfileId should match chosen profile id'
      );
      this.assert(
        sentMessage.subject === subject,
        'Message subject should match what was sent'
      );

      // Verify using getSentMessages
      const sentListResult = this.logic.getSentMessages(1, 20);
      this.assert(
        sentListResult && Array.isArray(sentListResult.messages),
        'getSentMessages should return messages array'
      );
      const found = sentListResult.messages.find(function (m) {
        return m.id === sentMessage.id;
      });
      this.assert(
        found,
        'Newly sent message should appear in sent messages list'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Update profile with new display name, bio, timezone, and daily summary
  testTask6_UpdateProfileSettings() {
    const testName =
      'Task 6: Update account settings display name, bio, timezone, and daily summary';
    try {
      // Load current settings
      const initialSettingsResult = this.logic.getAccountSettings();
      this.assert(
        initialSettingsResult && initialSettingsResult.settings,
        'getAccountSettings should return a settings object'
      );

      const newDisplayName = 'Alex UX Researcher';
      const newBio =
        'UX researcher focused on usability studies, prototype testing, and design collaboration. Interested in design systems, accessibility, and community-driven learning.';

      const updateResult = this.logic.updateAccountSettings(
        newDisplayName,
        newBio,
        'utc_plus_1',
        true
      );
      this.assert(
        updateResult && updateResult.settings,
        'updateAccountSettings should return updated settings'
      );

      const updated = updateResult.settings;
      this.assert(
        updated.displayName === newDisplayName,
        'Display name should be updated to Alex UX Researcher'
      );
      this.assert(
        updated.bio === newBio,
        'Bio should be updated to the new 20-30 word description'
      );
      this.assert(
        updated.timezone === 'utc_plus_1',
        'Timezone should be set to utc_plus_1'
      );
      this.assert(
        updated.dailySummaryEnabled === true,
        'Daily summary notifications should be enabled'
      );

      // Verify persisted in storage via getAccountSettings
      const verifyResult = this.logic.getAccountSettings();
      this.assert(
        verifyResult && verifyResult.settings,
        'getAccountSettings after update should still return settings'
      );
      const verifySettings = verifyResult.settings;
      this.assert(
        verifySettings.displayName === newDisplayName,
        'Persisted displayName should match updated value'
      );
      this.assert(
        verifySettings.dailySummaryEnabled === true,
        'Persisted dailySummaryEnabled should be true'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Report a spam reply in a discussion with 'spam' in the title
  testTask7_ReportSpamReply() {
    const testName =
      "Task 7: Create and search spam-titled discussion, then report a spam reply";
    try {
      // Setup: create a discussion that includes 'spam' in the title so search will find it
      const spamTitle = 'How to spot spam links in community replies?';
      const spamBody =
        'I am seeing more and more suspicious links in some replies. I would like to understand how to identify spam content and handle it properly as a community member.';

      const spamDiscussionResult = this.logic.createDiscussion(
        'web_development',
        spamTitle,
        spamBody,
        null,
        false,
        null
      );
      this.assert(
        spamDiscussionResult && spamDiscussionResult.discussion,
        'Spam discussion should be created for reporting test'
      );
      const spamDiscussion = spamDiscussionResult.discussion;

      // Search for discussions with 'spam' in the title/body
      const searchResult = this.logic.searchDiscussions(
        'spam',
        null,
        'relevance',
        1,
        20
      );
      this.assert(
        searchResult && Array.isArray(searchResult.results),
        'searchDiscussions for spam should return results array'
      );
      this.assert(
        searchResult.results.length > 0,
        'Spam search should return at least one discussion'
      );

      // Find the discussion we just created in search results
      const spamSearchEntry = searchResult.results.find(function (r) {
        return r.discussion && r.discussion.id === spamDiscussion.id;
      });
      this.assert(
        spamSearchEntry,
        'Spam discussion created for test should appear in search results'
      );

      const spamThread = this.logic.getDiscussionThread(spamDiscussion.id);
      this.assert(
        spamThread && spamThread.discussion,
        'Should be able to open spam discussion thread'
      );

      // Create a reply that contains a hyperlink and has 0 upvotes
      const spamReplyBody =
        'This looks like a great opportunity, check out http://spam.example.com for unbelievable deals.';
      const spamReplyResult = this.logic.replyToDiscussion(
        spamDiscussion.id,
        spamReplyBody
      );
      this.assert(
        spamReplyResult && spamReplyResult.newPost,
        'Spam reply post should be created'
      );
      const spamReplyPost = spamReplyResult.newPost;
      this.assert(
        spamReplyPost.upvoteCount === 0 ||
          typeof spamReplyPost.upvoteCount === 'undefined',
        'New spam reply should start with 0 upvotes'
      );

      // Reload thread and locate the reply we just added
      const spamThreadAfter = this.logic.getDiscussionThread(spamDiscussion.id);
      const threadReplies = spamThreadAfter.replies || [];
      const locatedSpamReply = threadReplies.find(function (p) {
        return p.id === spamReplyPost.id;
      });
      this.assert(
        locatedSpamReply,
        'Spam reply should be present in thread replies after reload'
      );

      // Report the spam reply
      const reportNote = 'Contains unsolicited promotional link';
      const reportResult = this.logic.reportPost(
        locatedSpamReply.id,
        'spam',
        reportNote
      );
      this.assert(
        reportResult && reportResult.report,
        'reportPost should return a ContentReport object'
      );
      const report = reportResult.report;
      this.assert(report.id, 'ContentReport should have an id');
      this.assert(
        report.postId === locatedSpamReply.id,
        'Reported postId should match the spam reply id'
      );
      this.assert(report.reason === 'spam', 'Report reason should be spam');
      this.assert(
        report.status === 'submitted',
        'New report status should be submitted'
      );

      // Verify persisted in content_reports storage
      const storedReports = JSON.parse(
        localStorage.getItem('content_reports') || '[]'
      );
      const storedReport = storedReports.find(function (cr) {
        return cr.id === report.id;
      });
      this.assert(
        storedReport,
        'Reported content should be stored in content_reports'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Create a product feedback thread with a 3-option poll lasting 7 days, single-choice
  testTask8_CreateProductFeedbackPoll() {
    const testName =
      'Task 8: Create Product Feedback discussion with 3-option single-choice poll and vote in it';
    try {
      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      const productFeedbackCategory = categories.find(function (c) {
        return c.slug === 'product_feedback';
      });
      this.assert(
        productFeedbackCategory,
        'Product Feedback category should exist'
      );

      const title = 'Which feature should we prioritize next?';
      const body =
        'We are planning the next major iteration of this community platform and would like your input on what to prioritize. Below are three candidate features; please vote for the one that would deliver the most value to you.';

      const pollConfig = {
        question: 'What should we build next?',
        options: ['Dark mode', 'Mobile app improvements', 'Advanced search filters'],
        durationDays: 7,
        multipleChoiceAllowed: false
      };

      const createResult = this.logic.createDiscussion(
        'product_feedback',
        title,
        body,
        null,
        false,
        pollConfig
      );
      this.assert(
        createResult && createResult.discussion,
        'Product feedback discussion with poll should be created'
      );
      const discussion = createResult.discussion;

      this.assert(discussion.id, 'Created feedback discussion should have id');
      this.assert(
        discussion.categoryId === productFeedbackCategory.id,
        'Feedback discussion should belong to Product Feedback category'
      );
      this.assert(
        discussion.hasPoll === true,
        'hasPoll flag on discussion should be true when poll is attached'
      );

      const pollWrapper = createResult.poll;
      this.assert(
        pollWrapper && pollWrapper.poll && pollWrapper.options,
        'Poll object and options should be returned from createDiscussion'
      );
      const poll = pollWrapper.poll;
      const options = pollWrapper.options;

      this.assert(poll.id, 'Poll should have an id');
      this.assert(
        poll.discussionId === discussion.id,
        'Poll discussionId should reference created discussion'
      );
      this.assert(
        poll.question === pollConfig.question,
        'Poll question should match configured question'
      );
      this.assert(
        poll.multipleChoiceAllowed === false,
        'Poll should have multipleChoiceAllowed=false for single-choice voting'
      );
      this.assert(
        Array.isArray(options) && options.length === 3,
        'Poll should have exactly three options'
      );

      const optionTexts = options.map(function (o) {
        return o.optionText;
      });
      this.assert(
        optionTexts.indexOf('Dark mode') !== -1,
        'Poll options should include Dark mode'
      );
      this.assert(
        optionTexts.indexOf('Mobile app improvements') !== -1,
        'Poll options should include Mobile app improvements'
      );
      this.assert(
        optionTexts.indexOf('Advanced search filters') !== -1,
        'Poll options should include Advanced search filters'
      );

      // Verify via getDiscussionThread
      const thread = this.logic.getDiscussionThread(discussion.id);
      this.assert(thread && thread.poll, 'Thread should expose poll');
      this.assert(
        Array.isArray(thread.pollOptions) &&
          thread.pollOptions.length === 3,
        'Thread pollOptions should have three options'
      );

      // Record previous vote counts
      const prevCounts = {};
      thread.pollOptions.forEach(function (opt) {
        prevCounts[opt.id] = opt.voteCount || 0;
      });

      // Vote in the poll for the first option
      const chosenOption = thread.pollOptions[0];
      const voteResult = this.logic.voteInPoll(thread.poll.id, chosenOption.id);
      this.assert(
        voteResult && voteResult.pollResponse,
        'voteInPoll should return a PollResponse'
      );
      const pollResponse = voteResult.pollResponse;
      this.assert(pollResponse.id, 'PollResponse should have an id');
      this.assert(
        pollResponse.pollId === thread.poll.id,
        'PollResponse pollId should match poll id'
      );
      this.assert(
        pollResponse.optionId === chosenOption.id,
        'PollResponse optionId should match chosen option id'
      );

      const updatedOptions = voteResult.options || [];
      const updatedChosen = updatedOptions.find(function (o) {
        return o.id === chosenOption.id;
      });
      this.assert(
        updatedChosen,
        'Updated options should include the chosen option'
      );
      this.assert(
        updatedChosen.voteCount === prevCounts[chosenOption.id] + 1,
        'Chosen option voteCount should increment by 1 after voting'
      );

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
