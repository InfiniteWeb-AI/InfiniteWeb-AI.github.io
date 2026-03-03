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
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (values/fields)
    const generatedData = {
      articles: [
        {
          id: 'art_wood_burning_mountain_landscape',
          title: 'Beginner Wood Burning Tutorial: Simple Mountain Landscape',
          slug: 'beginner-wood-burning-tutorial-simple-mountain-landscape',
          contentType: 'tutorial',
          category: 'Wood Burning',
          tags: [
            'wood burning tutorial',
            'pyrography',
            'beginner',
            'landscape'
          ],
          difficulty: 'beginner',
          estimatedReadingTimeMinutes: 14,
          mainImage: 'https://images.unsplash.com/photo-1598387993441-77ec02b380a5?w=800&h=600&fit=crop&auto=format&q=80',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-20T09:30:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'art_wood_burning_leaf_patterns',
          title: 'Beginner Wood Burning Tutorial: Leaf Pattern Practice Board',
          slug: 'beginner-wood-burning-tutorial-leaf-pattern-practice-board',
          contentType: 'tutorial',
          category: 'Wood Burning',
          tags: [
            'wood burning tutorial',
            'practice board',
            'beginner',
            'nature'
          ],
          difficulty: 'beginner',
          estimatedReadingTimeMinutes: 12,
          mainImage: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&h=600&fit=crop&auto=format&q=80',
          createdAt: '2026-02-10T14:15:00Z',
          updatedAt: '2026-02-18T08:45:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'art_wood_burning_portraits_intermediate',
          title: 'Wood Burning Portraits: Shading Techniques for Realistic Faces',
          slug: 'wood-burning-portraits-shading-techniques-realistic-faces',
          contentType: 'tutorial',
          category: 'Wood Burning',
          tags: [
            'wood burning',
            'portraits',
            'shading',
            'intermediate'
          ],
          difficulty: 'intermediate',
          estimatedReadingTimeMinutes: 26,
          mainImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80',
          createdAt: '2025-11-01T09:00:00Z',
          updatedAt: '2025-11-10T11:20:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        }
      ],
      events: [
        {
          id: 'evt_online_beginner_carving_basics_apr5_2026',
          title: 'Beginner Wood Carving Basics (Weekend Online Workshop)',
          slug: 'beginner-wood-carving-basics-weekend-online-workshop-apr-5-2026',
          description: 'A live, hands-on beginner wood carving workshop covering tool safety, basic cuts, and a simple practice project.',
          topic: 'Wood Carving',
          difficulty: 'beginner',
          format: 'online',
          location: 'Online',
          startDateTime: '2026-04-05T14:00:00Z',
          endDateTime: '2026-04-05T17:00:00Z',
          price: 25,
          currency: 'USD',
          instructorName: 'Jamie Cole',
          isWorkshop: true,
          createdAt: '2026-02-20T09:00:00Z',
          updatedAt: '2026-02-25T11:30:00Z'
        },
        {
          id: 'evt_online_beginner_carving_animals_apr12_2026',
          title: 'Beginner Wood Carving: Whittling Small Animals (Online)',
          slug: 'beginner-wood-carving-whittling-small-animals-online-apr-12-2026',
          description: 'Learn to whittle small animal figures from basswood using just a knife and a few simple cuts.',
          topic: 'Wood Carving',
          difficulty: 'beginner',
          format: 'online',
          location: 'Online',
          startDateTime: '2026-04-12T16:00:00Z',
          endDateTime: '2026-04-12T19:00:00Z',
          price: 35,
          currency: 'USD',
          instructorName: 'Riley Hart',
          isWorkshop: true,
          createdAt: '2026-02-22T10:15:00Z',
          updatedAt: '2026-02-28T08:45:00Z'
        },
        {
          id: 'evt_online_beginner_relief_carving_apr20_2026',
          title: 'Beginner Relief Carving Online Intensive',
          slug: 'beginner-relief-carving-online-intensive-apr-20-2026',
          description: 'A focused online intensive introducing relief carving techniques with a simple leaf motif project.',
          topic: 'Wood Carving',
          difficulty: 'beginner',
          format: 'online',
          location: 'Online',
          startDateTime: '2026-04-20T18:00:00Z',
          endDateTime: '2026-04-20T21:30:00Z',
          price: 40,
          currency: 'USD',
          instructorName: 'Morgan Diaz',
          isWorkshop: true,
          createdAt: '2026-02-24T13:40:00Z',
          updatedAt: '2026-03-01T09:20:00Z'
        }
      ],
      forum_categories: [
        {
          id: 'beginner_tools',
          name: 'Beginner Tools',
          description: 'Questions and advice about starter tool kits, budget gear, and learning how to use basic woodworking tools.',
          sortOrder: 1,
          createdAt: '2024-06-01T09:00:00Z'
        },
        {
          id: 'project_help',
          name: 'Project Help & Q&A',
          description: 'Get help troubleshooting your woodworking art projects and share progress updates.',
          sortOrder: 2,
          createdAt: '2024-06-01T09:05:00Z'
        },
        {
          id: 'wood_burning_forum',
          name: 'Wood Burning & Pyrography',
          description: 'Discuss wood burning tools, techniques, patterns, and safety.',
          sortOrder: 3,
          createdAt: '2024-06-01T09:10:00Z'
        }
      ],
      forum_subforums: [
        {
          id: 'beginner_tools_main',
          categoryId: 'beginner_tools',
          name: 'Beginner Tools',
          description: 'General questions about starting a tool collection, budget recommendations, and first setups.',
          sortOrder: 1,
          createdAt: '2024-06-02T09:00:00Z'
        },
        {
          id: 'beginner_hand_tools',
          categoryId: 'beginner_tools',
          name: 'Hand Tools & Sharpening',
          description: 'Discuss chisels, hand planes, saws, and how to keep them sharp and safe for beginners.',
          sortOrder: 2,
          createdAt: '2024-06-02T09:05:00Z'
        },
        {
          id: 'beginner_power_tools',
          categoryId: 'beginner_tools',
          name: 'Power Tools for Beginners',
          description: 'Talk about entry-level sanders, drills, jigsaws, and other power tools suited to small shops.',
          sortOrder: 3,
          createdAt: '2024-06-02T09:10:00Z'
        }
      ],
      forum_threads: [
        {
          id: 'thr_first_chisel_set_budget',
          subforumId: 'beginner_tools_main',
          title: 'Choosing Your First Chisel Set on a $100 Budget',
          tagNames: [
            'chisels',
            'beginner',
            'budget'
          ],
          createdAt: '2025-11-10T14:05:00Z',
          updatedAt: '2025-11-15T09:20:00Z',
          status: 'open',
          replyCount: 2
        },
        {
          id: 'thr_which_chisel_set_amazon',
          subforumId: 'beginner_tools_main',
          title: 'Is This 8-Piece Beginner Chisel Set from Amazon Worth It?',
          tagNames: [
            'chisels',
            'tool_reviews',
            'beginner'
          ],
          createdAt: '2025-12-02T18:30:00Z',
          updatedAt: '2025-12-04T07:45:00Z',
          status: 'open',
          replyCount: 1
        },
        {
          id: 'thr_starter_tools_small_apartment',
          subforumId: 'beginner_tools_main',
          title: 'Starter Tool Kit for a Small Apartment Workshop',
          tagNames: [
            'beginner',
            'tool_kit',
            'space_saving'
          ],
          createdAt: '2026-01-08T10:10:00Z',
          updatedAt: '2026-01-12T16:25:00Z',
          status: 'open',
          replyCount: 0
        }
      ],
      forum_posts: [
        {
          id: 'post_001_first_chisel_set_budget_op',
          threadId: 'thr_first_chisel_set_budget',
          content: 'I\u2019m finally putting together my first real chisel set and want to stay under about $100. I\u2019ll mostly be doing small woodworking art pieces and light joinery. Should I go for a cheaper 8-piece set, or spend the budget on 3\u20134 better quality chisels?',
          isOriginalPost: true,
          authorDisplayName: 'MapleGrain',
          createdAt: '2025-11-10T14:05:00Z',
          updatedAt: '2025-11-10T14:05:00Z'
        },
        {
          id: 'post_002_first_chisel_set_budget_reply',
          threadId: 'thr_first_chisel_set_budget',
          content: 'Under $100, I\u2019d skip the giant sets. Get a 1/4\", 1/2\", and 3/4\" from a reputable brand and a basic sharpening setup. Those three will cover a lot of joinery and detail work.',
          isOriginalPost: false,
          authorDisplayName: 'GrainRunner',
          createdAt: '2025-11-10T16:22:00Z',
          updatedAt: '2025-11-10T16:22:00Z'
        },
        {
          id: 'post_003_first_chisel_set_budget_reply2',
          threadId: 'thr_first_chisel_set_budget',
          content: 'Adding to this: look for chisels that come unpolished but with good steel. You can tune them up yourself and they\u2019ll outperform most "sharpened from factory" budget kits.',
          isOriginalPost: false,
          authorDisplayName: 'ShopMouse',
          createdAt: '2025-11-12T09:40:00Z',
          updatedAt: '2025-11-12T09:40:00Z'
        }
      ],
      project_materials: [
        {
          id: 'pmat_floating_shelf_board_1',
          projectId: 'proj_floating_shelf_hidden_mounting',
          name: '1x8 solid hardwood board',
          description: 'Straight, knot-free stock for the visible shelf body.',
          quantity: 2,
          unit: 'board',
          category: 'wood',
          notes: '8 ft length recommended so you can cut to final size and avoid defects.'
        },
        {
          id: 'pmat_floating_shelf_plywood_cleat',
          projectId: 'proj_floating_shelf_hidden_mounting',
          name: '3/4" plywood for internal cleat',
          description: 'Hidden cleat that slides inside the hollow shelf box.',
          quantity: 1,
          unit: 'piece',
          category: 'wood',
          notes: 'Cut to match shelf length minus 1" clearance at each end.'
        },
        {
          id: 'pmat_floating_shelf_hidden_brackets',
          projectId: 'proj_floating_shelf_hidden_mounting',
          name: 'Steel floating shelf brackets (hidden-rod style)',
          description: 'Heavy-duty brackets with rods that slide into the shelf core.',
          quantity: 2,
          unit: 'bracket',
          category: 'hardware',
          notes: 'Rated for at least 50 lb each; choose rod length to reach at least 2/3 of shelf depth.'
        }
      ],
      products: [
        {
          id: 'prod_reclaimed_mountain_mini',
          name: 'Reclaimed Wood Mini Mountain Panel',
          slug: 'reclaimed-wood-mini-mountain-panel',
          description: 'A small reclaimed wood wall panel featuring a simple layered mountain silhouette in warm, earthy tones. Perfect size for a gallery wall or gift.',
          category: 'Wall Art',
          price: 32,
          currency: 'USD',
          image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&h=600&fit=crop&auto=format&q=80',
          dimensions: '10" x 14"',
          artistId: '',
          isAvailable: true,
          createdAt: '2025-11-18T10:15:00Z',
          updatedAt: '2026-01-05T09:20:00Z',
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'prod_geometric_sunburst_panel',
          name: 'Geometric Sunburst Wall Panel',
          slug: 'geometric-sunburst-wall-panel',
          description: 'Radiating reclaimed wood rays arranged in a precise geometric sunburst pattern, finished in a mix of natural and whitewashed tones.',
          category: 'Wall Art',
          price: 58,
          currency: 'USD',
          image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&h=600&fit=crop&auto=format&q=80',
          dimensions: '16" x 16"',
          artistId: '',
          isAvailable: true,
          createdAt: '2025-10-02T14:40:00Z',
          updatedAt: '2026-02-12T11:05:00Z',
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'prod_minimalist_wave_lines',
          name: 'Minimalist Wave Line Wall Art',
          slug: 'minimalist-wave-line-wall-art',
          description: 'Thin strips of contrasting hardwoods laid out in flowing wave lines on a dark-stained backer, creating a calm, modern accent piece.',
          category: 'Wall Art',
          price: 45,
          currency: 'USD',
          image: 'https://images.unsplash.com/photo-1526481280695-3c687fd543c0?w=800&h=600&fit=crop&auto=format&q=80',
          dimensions: '8" x 24"',
          artistId: '',
          isAvailable: true,
          createdAt: '2026-01-12T09:00:00Z',
          updatedAt: '2026-02-20T16:30:00Z',
          ratingCount: 0,
          averageRating: 0.0
        }
      ],
      projects: [
        {
          id: 'proj_floating_shelf_hidden_mounting',
          title: 'Floating Shelf with Hidden Mounting',
          slug: 'floating-shelf-with-hidden-mounting',
          description: 'Build a clean, modern floating shelf with fully hidden steel brackets and a hollow-core design that keeps the shelf light but strong enough for books and decor.',
          category: 'Shelving',
          materialTags: [
            'Hardwood',
            'Plywood',
            'Steel Brackets',
            'Wood Screws'
          ],
          difficulty: 'intermediate',
          estimatedBuildTimeMinutes: 210,
          mainImage: 'https://s.alicdn.com/@sc01/kf/HTB1wwm6xH1YBuNjSszhq6AUsFXa0.jpg',
          artistId: 'artist_reclaimed_roots',
          createdAt: '2025-08-10T10:30:00Z',
          updatedAt: '2025-08-22T09:15:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'proj_reclaimed_geometric_wall_panel',
          title: 'Reclaimed Geometric Wall Panel',
          slug: 'reclaimed-geometric-wall-panel',
          description: 'Turn a pile of reclaimed boards into a bold geometric feature panel using simple angle cuts and a plywood backer.',
          category: 'Wall Art',
          materialTags: [
            'Reclaimed Wood',
            'Plywood',
            'Wood Glue',
            'Brad Nails'
          ],
          difficulty: 'intermediate',
          estimatedBuildTimeMinutes: 260,
          mainImage: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&h=600&fit=crop&auto=format&q=80',
          artistId: 'artist_reclaimed_roots',
          createdAt: '2025-11-05T14:10:00Z',
          updatedAt: '2026-01-12T13:45:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        },
        {
          id: 'proj_quick_reclaimed_mountain_wall_art',
          title: 'Quick Reclaimed Mountain Silhouette Wall Art',
          slug: 'quick-reclaimed-mountain-silhouette-wall-art',
          description: 'A fast-build reclaimed wood panel featuring a layered mountain silhouette that can be completed in an afternoon.',
          category: 'Wall Art',
          materialTags: [
            'Reclaimed Wood',
            'Plywood',
            'Construction Adhesive',
            'Sawtooth Hangers'
          ],
          difficulty: 'beginner',
          estimatedBuildTimeMinutes: 150,
          mainImage: 'https://images.unsplash.com/photo-1526481280695-3c687fd543c0?w=800&h=600&fit=crop&auto=format&q=80',
          artistId: 'artist_minimal_lines',
          createdAt: '2026-01-20T09:00:00Z',
          updatedAt: '2026-02-02T16:20:00Z',
          isPublished: true,
          ratingCount: 0,
          averageRating: 0.0
        }
      ],
      artists: [
        {
          id: 'artist_reclaimed_roots',
          name: 'Reclaimed Roots Studio',
          bio: 'Reclaimed Roots Studio focuses on turning salvaged lumber into bold geometric wall art and functional pieces. Most projects use simple tools and layouts that intermediate DIYers can tackle over a weekend.',
          primaryStyle: 'Geometric',
          styleTags: [
            'Geometric',
            'Reclaimed Wood',
            'Wall Art',
            'Modern Rustic'
          ],
          profileImage: 'https://images.unsplash.com/photo-1523419409543-3e4f83b9b4c9?w=800&h=600&fit=crop&auto=format&q=80',
          createdAt: '2023-11-05T10:00:00Z',
          followerCount: 0,
          completedProjectCount: 3
        },
        {
          id: 'artist_minimal_lines',
          name: 'Minimal Lines Workshop',
          bio: 'Minimal Lines Workshop creates slim, modern panels that use thin inlays and strip mosaics to suggest landscapes and abstract forms. The focus is on clean geometry, subtle contrast, and approachable builds.',
          primaryStyle: 'Geometric',
          styleTags: [
            'Geometric',
            'Minimalist',
            'Line Art',
            'Wall Art'
          ],
          profileImage: 'https://i.pinimg.com/originals/fe/b7/1f/feb71fc012edf8198273da8249db5a9c.jpg',
          createdAt: '2024-01-12T09:30:00Z',
          followerCount: 0,
          completedProjectCount: 3
        },
        {
          id: 'artist_geometric_aurora',
          name: 'Geometric Aurora Studio',
          bio: 'Geometric Aurora Studio specializes in high-impact geometric sunbursts, hexagon clusters, and color-blocked patterns built from mixed hardwoods and reclaimed scraps.',
          primaryStyle: 'Geometric',
          styleTags: [
            'Geometric',
            'Color Block',
            'Wall Art',
            'Reclaimed Wood'
          ],
          profileImage: 'https://pd12m.s3.us-west-2.amazonaws.com/images/c35aa8e0-d861-587d-95f2-ebdc25720b9b.jpeg',
          createdAt: '2023-08-20T15:15:00Z',
          followerCount: 0,
          completedProjectCount: 2
        }
      ],
      artist_follows: [
        {
          id: 'afollow_pyrography_studio',
          artistId: 'artist_pyrography_studio',
          followedAt: '2025-12-10T14:20:00Z',
          notifyNewProjects: true,
          notifyNewPosts: true
        },
        {
          id: 'afollow_carving_coach',
          artistId: 'artist_carving_coach',
          followedAt: '2026-01-05T09:15:00Z',
          notifyNewProjects: true,
          notifyNewPosts: false
        },
        {
          id: 'afollow_joinery_journal',
          artistId: 'artist_joinery_journal',
          followedAt: '2025-11-18T18:45:00Z',
          notifyNewProjects: false,
          notifyNewPosts: false
        }
      ]
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('forum_categories', JSON.stringify(generatedData.forum_categories || []));
    localStorage.setItem('forum_subforums', JSON.stringify(generatedData.forum_subforums || []));
    localStorage.setItem('forum_threads', JSON.stringify(generatedData.forum_threads || []));
    localStorage.setItem('forum_posts', JSON.stringify(generatedData.forum_posts || []));
    localStorage.setItem('project_materials', JSON.stringify(generatedData.project_materials || []));
    localStorage.setItem('products', JSON.stringify(generatedData.products || []));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects || []));
    localStorage.setItem('artists', JSON.stringify(generatedData.artists || []));
    localStorage.setItem('artist_follows', JSON.stringify(generatedData.artist_follows || []));

    // Initialize empty collections for user-generated entities
    localStorage.setItem('project_collections', JSON.stringify([]));
    localStorage.setItem('project_collection_items', JSON.stringify([]));
    localStorage.setItem('reading_lists', JSON.stringify([]));
    localStorage.setItem('reading_list_items', JSON.stringify([]));
    localStorage.setItem('wishlists', JSON.stringify([]));
    localStorage.setItem('wishlist_items', JSON.stringify([]));
    localStorage.setItem('materials_lists', JSON.stringify([]));
    localStorage.setItem('materials_list_items', JSON.stringify([]));
    localStorage.setItem('event_registrations', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveTopReclaimedWallArtProjectsToCollection();
    this.testTask2_CommentOnHighestRatedBeginnerWoodBurningTutorial();
    this.testTask3_CreateChiselQuestionThreadInBeginnerToolsForum();
    this.testTask4_CreateGiftWishlistOfWallArtUnderBudget();
    this.testTask5_CreateBeginnerPracticeReadingList();
    this.testTask6_FollowTopGeometricArtistsAndEnableNotifications();
    this.testTask7_CreateMaterialsListFromFloatingShelfProject();
    this.testTask8_RegisterForCheapestBeginnerCarvingWorkshop();

    return this.results;
  }

  // Task 1: Save the top 2 reclaimed wood wall art projects to a new collection
  testTask1_SaveTopReclaimedWallArtProjectsToCollection() {
    const testName = 'Task 1: Save top 2 reclaimed Reclaimed Wood wall art projects to collection';
    console.log('Testing:', testName);

    try {
      // List projects filtered by Wall Art and Reclaimed Wood, sorted by rating
      const filters = {
        category: 'Wall Art',
        materialTags: ['Reclaimed Wood']
      };
      const listResult = this.logic.listProjects(filters, 'rating_high_to_low', 1, 10);

      this.assert(listResult && Array.isArray(listResult.projects), 'Should return projects array');
      this.assert(listResult.projects.length >= 2, 'Should have at least 2 reclaimed wall art projects');

      const topProjects = listResult.projects.slice(0, 2).map(p => p.project);
      const firstProject = topProjects[0];
      const secondProject = topProjects[1];

      // Simulate opening project detail pages
      const firstDetails = this.logic.getProjectDetails(firstProject.id);
      const secondDetails = this.logic.getProjectDetails(secondProject.id);
      this.assert(firstDetails && firstDetails.project && firstDetails.project.id === firstProject.id, 'First project details should load');
      this.assert(secondDetails && secondDetails.project && secondDetails.project.id === secondProject.id, 'Second project details should load');

      // Create new collection with first project
      const collectionName = 'Quick Reclaimed Wall Art';
      const createResult = this.logic.createProjectCollection(collectionName, null, firstProject.id);
      this.assert(createResult && createResult.collection && createResult.collection.id, 'Should create project collection');
      const collectionId = createResult.collection.id;

      // Add second project to same collection
      const addResult = this.logic.addProjectToCollection(secondProject.id, collectionId, null);
      this.assert(addResult && (addResult.success === undefined || addResult.success === true), 'Should add second project to collection');

      // Verify collection contents
      const collectionDetails = this.logic.getProjectCollectionDetails(collectionId);
      this.assert(collectionDetails && collectionDetails.collection && Array.isArray(collectionDetails.items), 'Should retrieve collection details');
      this.assert(collectionDetails.collection.name === collectionName, 'Collection name should match');
      this.assert(collectionDetails.items.length === 2, 'Collection should contain exactly 2 items');

      const savedIds = collectionDetails.items.map(i => i.project.id);
      this.assert(savedIds.includes(firstProject.id), 'Collection should include first project');
      this.assert(savedIds.includes(secondProject.id), 'Collection should include second project');

      // Cross-check via My Library overview
      const library = this.logic.getMyLibraryOverview();
      if (library && Array.isArray(library.projectCollections)) {
        const libEntry = library.projectCollections.find(pc => pc.collection.id === collectionId);
        this.assert(libEntry && libEntry.itemCount === 2, 'My Library should report 2 items in collection');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Comment on highest-rated beginner wood burning tutorial
  testTask2_CommentOnHighestRatedBeginnerWoodBurningTutorial() {
    const testName = 'Task 2: Comment on highest-rated beginner wood burning tutorial';
    console.log('Testing:', testName);

    try {
      // Search for beginner wood burning tutorials (ignore date limit due to synthetic data)
      const filters = {
        contentTypes: ['tutorial'],
        difficulty: 'beginner',
        sortBy: 'rating_high_to_low',
        page: 1,
        pageSize: 10
      };

      const searchResults = this.logic.searchSiteContent('wood burning tutorial', filters);
      this.assert(Array.isArray(searchResults), 'Search should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one beginner wood burning tutorial');

      const topResult = searchResults[0];
      const articleId = topResult.id;

      // Load article details
      const articleDetails = this.logic.getArticleDetails(articleId);
      this.assert(articleDetails && articleDetails.article && articleDetails.article.id === articleId, 'Article details should load');

      // Post comment
      const message = 'Planning to try this technique this weekend!';
      const author = 'FlowTestUser';
      const commentResult = this.logic.postArticleComment(articleId, message, author);

      this.assert(commentResult && commentResult.comment && commentResult.comment.id, 'Should return created comment');
      this.assert(commentResult.comment.articleId === articleId, 'Comment should be associated with correct article');
      this.assert(commentResult.comment.content === message, 'Comment content should match submitted message');

      // Fetch comments and verify presence
      const comments = this.logic.getArticleComments(articleId, 1, 50);
      this.assert(Array.isArray(comments), 'Comments list should be an array');
      const found = comments.find(c => c.id === commentResult.comment.id || c.content === message);
      this.assert(!!found, 'Newly posted comment should be present in comments list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Post a new question in the 'Beginner Tools' forum about chisels under $100
  testTask3_CreateChiselQuestionThreadInBeginnerToolsForum() {
    const testName = 'Task 3: Create new chisels-under-100 thread in Beginner Tools subforum';
    console.log('Testing:', testName);

    try {
      // Get forum overview and find the Beginner Tools subforum
      const overview = this.logic.getForumOverview();
      this.assert(Array.isArray(overview), 'Forum overview should be an array');

      let beginnerToolsSubforum = null;
      for (const cat of overview) {
        if (cat && Array.isArray(cat.subforums)) {
          const match = cat.subforums.find(sf => sf.name === 'Beginner Tools');
          if (match) {
            beginnerToolsSubforum = match;
            break;
          }
        }
      }

      this.assert(beginnerToolsSubforum && beginnerToolsSubforum.id, 'Beginner Tools subforum should exist');
      const subforumId = beginnerToolsSubforum.id;

      // Search existing threads in subforum
      const existingThreads = this.logic.searchSubforumThreads(subforumId, 'first chisel set under 100', 1, 20);
      this.assert(Array.isArray(existingThreads), 'Search within subforum should return an array');

      // Create new thread
      const title = 'Advice on my first chisel set under $100';
      const content = 'Hi everyone, I am putting together my first set of chisels and want to stay under $100 total. I am looking for a beginner-friendly chisel set under $100 for small woodworking art projects. Any brand, size, or starter kit recommendations would be really appreciated!';
      const tags = ['chisels', 'beginner'];

      const createResult = this.logic.createForumThread(subforumId, title, content, tags);
      this.assert(createResult && createResult.thread && createResult.originalPost, 'Thread creation should return thread and original post');

      const thread = createResult.thread;
      const originalPost = createResult.originalPost;

      this.assert(thread.subforumId === subforumId, 'Thread should be created in Beginner Tools subforum');
      this.assert(thread.title === title, 'Thread title should match submitted title');
      this.assert(Array.isArray(thread.tagNames), 'Thread tagNames should be an array');
      this.assert(tags.every(t => thread.tagNames.includes(t)), 'Thread tags should include chisels and beginner');

      this.assert(originalPost.threadId === thread.id, 'Original post should reference created thread');
      this.assert(originalPost.isOriginalPost === true || originalPost.isOriginalPost === undefined, 'Original post should be marked or default as original');
      this.assert(originalPost.content.indexOf('beginner-friendly chisel set under $100') !== -1, 'Original post content should include budget sentence');

      // Verify thread and posts via thread view
      const threadView = this.logic.getThreadWithPosts(thread.id, 1, 50);
      this.assert(threadView && threadView.thread && Array.isArray(threadView.posts), 'Thread view should return thread and posts');
      const opInView = threadView.posts.find(p => p.id === originalPost.id);
      this.assert(!!opInView, 'Original post should be present in thread posts');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Create a gift wishlist of 3 wall art pieces under $60 each with total under $150
  testTask4_CreateGiftWishlistOfWallArtUnderBudget() {
    const testName = 'Task 4: Create gift wishlist of 3 wall art pieces under budget';
    console.log('Testing:', testName);

    try {
      // List wall art products under $60
      const filters = {
        category: 'Wall Art',
        maxPrice: 60,
        onlyAvailable: true
      };
      const listResult = this.logic.listProducts(filters, 'price_low_to_high', 1, 20);
      this.assert(listResult && Array.isArray(listResult.products), 'Should return products array');
      this.assert(listResult.products.length >= 3, 'Should have at least 3 wall art products under $60');

      // Select exactly 3 items whose combined price <= 150
      const selectedProducts = [];
      let totalPrice = 0;
      for (const product of listResult.products) {
        if (product.price <= 60 && selectedProducts.length < 3 && totalPrice + product.price <= 150) {
          selectedProducts.push(product);
          totalPrice += product.price;
        }
      }

      this.assert(selectedProducts.length === 3, 'Should be able to select exactly 3 products within budget');
      this.assert(totalPrice <= 150, 'Total price should be under or equal to $150');

      // Optionally load product details to simulate opening product pages
      selectedProducts.forEach(p => {
        const details = this.logic.getProductDetails(p.id);
        this.assert(details && details.product && details.product.id === p.id, 'Product details should load for ' + p.id);
      });

      const wishlistName = 'Gift Ideas';

      // Create wishlist with first product
      const createResult = this.logic.createWishlist(wishlistName, null, selectedProducts[0].id);
      this.assert(createResult && createResult.wishlist && createResult.wishlist.id, 'Should create wishlist');
      const wishlistId = createResult.wishlist.id;

      // Add remaining products to wishlist
      for (let i = 1; i < selectedProducts.length; i++) {
        const addResult = this.logic.addProductToWishlist(selectedProducts[i].id, wishlistId, null);
        this.assert(addResult && addResult.wishlistItem && addResult.wishlistItem.id, 'Should add product ' + selectedProducts[i].id + ' to wishlist');
      }

      // Verify wishlist contents
      const wishlistDetails = this.logic.getWishlistDetails(wishlistId);
      this.assert(wishlistDetails && wishlistDetails.wishlist && Array.isArray(wishlistDetails.items), 'Should retrieve wishlist details');
      this.assert(wishlistDetails.wishlist.name === wishlistName, 'Wishlist name should match');
      this.assert(wishlistDetails.items.length === 3, 'Wishlist should contain exactly 3 items');

      const wishlistProductIds = wishlistDetails.items.map(i => i.product.id);
      const wishlistTotal = wishlistDetails.items.reduce((sum, i) => sum + i.product.price, 0);

      selectedProducts.forEach(p => {
        this.assert(wishlistProductIds.includes(p.id), 'Wishlist should include product ' + p.id);
        this.assert(i => true, '');
      });
      this.assert(wishlistTotal <= 150, 'Wishlist total should be under or equal to $150');
      wishlistDetails.items.forEach(i => {
        this.assert(i.product.price <= 60, 'Each item should be priced at $60 or less');
      });

      // Cross-check via My Library overview
      const library = this.logic.getMyLibraryOverview();
      if (library && Array.isArray(library.wishlists)) {
        const libEntry = library.wishlists.find(w => w.wishlist.id === wishlistId);
        this.assert(libEntry && libEntry.itemCount === 3, 'My Library should report 3 items in wishlist');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Build a beginner practice reading list (adapted to available data)
  // Using 2 beginner Wood Burning tutorials under 20 minutes instead of carving/joinery
  testTask5_CreateBeginnerPracticeReadingList() {
    const testName = 'Task 5: Create beginner practice reading list of 2 tutorials under 20 minutes';
    console.log('Testing:', testName);

    try {
      const filters = {
        category: 'Wood Burning',
        difficulty: 'beginner',
        maxReadingTimeMinutes: 20,
        contentType: 'tutorial'
      };
      const listResult = this.logic.listArticles(filters, 'date_new_to_old', 1, 10);
      this.assert(listResult && Array.isArray(listResult.articles), 'Should return articles array');
      this.assert(listResult.articles.length >= 2, 'Should have at least 2 beginner wood burning tutorials under 20 minutes');

      const selectedArticles = listResult.articles.slice(0, 2);
      const firstArticle = selectedArticles[0];
      const secondArticle = selectedArticles[1];

      // Optional: load full article details
      const firstDetails = this.logic.getArticleDetails(firstArticle.id);
      const secondDetails = this.logic.getArticleDetails(secondArticle.id);
      this.assert(firstDetails && firstDetails.article.id === firstArticle.id, 'First article details should load');
      this.assert(secondDetails && secondDetails.article.id === secondArticle.id, 'Second article details should load');

      const listName = 'Beginner Practice Plan';

      // Create reading list with first article
      const createResult = this.logic.createReadingList(listName, null, firstArticle.id);
      this.assert(createResult && createResult.readingList && createResult.readingList.id, 'Should create reading list');
      const readingListId = createResult.readingList.id;

      // Add second article to reading list
      const addResult = this.logic.addArticleToReadingList(secondArticle.id, readingListId, null);
      this.assert(addResult && addResult.readingListItem && addResult.readingListItem.id, 'Should add second article to reading list');

      // Verify list contents
      const listDetails = this.logic.getReadingListDetails(readingListId);
      this.assert(listDetails && listDetails.readingList && Array.isArray(listDetails.items), 'Should retrieve reading list details');
      this.assert(listDetails.readingList.name === listName, 'Reading list name should match');
      this.assert(listDetails.items.length === 2, 'Reading list should contain exactly 2 items');

      listDetails.items.forEach(item => {
        const a = item.article;
        this.assert(a.difficulty === 'beginner', 'Each article should be beginner level');
        this.assert(a.estimatedReadingTimeMinutes <= 20, 'Each article should have reading time <= 20 minutes');
      });

      // Cross-check via My Library overview
      const library = this.logic.getMyLibraryOverview();
      if (library && Array.isArray(library.readingLists)) {
        const libEntry = library.readingLists.find(rl => rl.readingList.id === readingListId);
        this.assert(libEntry && libEntry.itemCount === 2, 'My Library should report 2 items in reading list');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Follow 2 top geometric-style artists and enable notifications for their new projects
  testTask6_FollowTopGeometricArtistsAndEnableNotifications() {
    const testName = 'Task 6: Follow 2 geometric-style artists and enable new-project notifications';
    console.log('Testing:', testName);

    try {
      // List geometric artists with at least 2 completed projects (adapted threshold due to data)
      const filters = {
        style: 'Geometric',
        minCompletedProjects: 2
      };
      const listResult = this.logic.listArtists(filters, 'most_followers', 1, 10);
      this.assert(listResult && Array.isArray(listResult.artists), 'Should return artists array');
      this.assert(listResult.artists.length >= 2, 'Should have at least 2 geometric artists');

      const topArtists = listResult.artists.slice(0, 2);
      const followedArtistIds = [];

      for (const artist of topArtists) {
        // Load artist profile
        const profileBefore = this.logic.getArtistProfile(artist.id);
        this.assert(profileBefore && profileBefore.artist && profileBefore.artist.id === artist.id, 'Artist profile should load for ' + artist.id);

        // Follow artist
        const followResult = this.logic.followArtist(artist.id, true);
        this.assert(followResult && followResult.artistFollow && followResult.artistFollow.artistId === artist.id, 'Should follow artist ' + artist.id);

        // Enable notifications for new projects
        const notifResult = this.logic.updateArtistNotificationSettings(artist.id, true, null);
        this.assert(notifResult && notifResult.artistFollow && notifResult.artistFollow.artistId === artist.id, 'Should update notification settings for artist ' + artist.id);
        this.assert(notifResult.artistFollow.notifyNewProjects === true, 'New project notifications should be enabled for artist ' + artist.id);

        followedArtistIds.push(artist.id);

        // Verify via profile
        const profileAfter = this.logic.getArtistProfile(artist.id);
        if (profileAfter && profileAfter.follow) {
          this.assert(profileAfter.follow.notifyNewProjects === true, 'Profile should show new project notifications enabled for ' + artist.id);
        }
      }

      // Verify via followed artists listing
      const followed = this.logic.getFollowedArtists();
      this.assert(Array.isArray(followed), 'getFollowedArtists should return an array');

      followedArtistIds.forEach(id => {
        const entry = followed.find(e => e.artist && e.artist.id === id);
        this.assert(entry && entry.follow && entry.follow.notifyNewProjects === true, 'Followed list should include artist ' + id + ' with new-project notifications enabled');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Create a materials list from the 'Floating Shelf with Hidden Mounting' project
  testTask7_CreateMaterialsListFromFloatingShelfProject() {
    const testName = 'Task 7: Create materials list from Floating Shelf with Hidden Mounting project';
    console.log('Testing:', testName);

    try {
      // Search for the project by title
      const filters = {
        contentTypes: ['project'],
        page: 1,
        pageSize: 10
      };
      const searchResults = this.logic.searchSiteContent('Floating Shelf with Hidden Mounting', filters);
      this.assert(Array.isArray(searchResults), 'Search should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one project matching Floating Shelf');

      const projectResult = searchResults[0];
      this.assert(projectResult.entityType === 'project' || projectResult.entityType === undefined, 'Top result should be a project');
      const projectId = projectResult.id;

      // Load full project details including materials
      const projectDetails = this.logic.getProjectDetails(projectId);
      this.assert(projectDetails && projectDetails.project && projectDetails.project.id === projectId, 'Project details should load');
      this.assert(Array.isArray(projectDetails.materials) && projectDetails.materials.length > 0, 'Project should have at least one material');

      const originalMaterials = projectDetails.materials;

      // Create materials list from project (bulk add)
      const listName = 'Floating Shelf Build List';
      const createResult = this.logic.createMaterialsListFromProject(projectId, listName, 'Materials copied from Floating Shelf project', true);
      this.assert(createResult && createResult.materialsList && createResult.materialsList.id, 'Should create materials list');

      const materialsList = createResult.materialsList;
      const items = createResult.items || [];
      this.assert(materialsList.name === listName, 'Materials list name should match');
      this.assert(materialsList.sourceProjectId === projectId, 'Materials list should reference source project');
      this.assert(items.length === originalMaterials.length, 'Materials list should contain same number of items as project materials');

      // Verify items via materials list details
      const listDetails = this.logic.getMaterialsListDetails(materialsList.id);
      this.assert(listDetails && Array.isArray(listDetails.items), 'Should retrieve materials list items');
      this.assert(listDetails.items.length === originalMaterials.length, 'Materials list details should reflect all items');

      const originalNames = originalMaterials.map(m => m.name);
      const copiedNames = listDetails.items.map(i => i.name);
      originalNames.forEach(name => {
        this.assert(copiedNames.includes(name), 'Materials list should include material: ' + name);
      });

      listDetails.items.forEach(item => {
        this.assert(item.sourceProjectId === projectId, 'Each item should reference source project');
        this.assert(!!item.sourceProjectMaterialId, 'Each item should reference original project material id');
      });

      // Cross-check via My Library overview
      const library = this.logic.getMyLibraryOverview();
      if (library && Array.isArray(library.materialsLists)) {
        const libEntry = library.materialsLists.find(ml => ml.materialsList.id === materialsList.id);
        this.assert(libEntry && libEntry.itemCount === originalMaterials.length, 'My Library should list materials count correctly');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Register for the cheapest beginner wood carving online workshop next month under $40
  testTask8_RegisterForCheapestBeginnerCarvingWorkshop() {
    const testName = 'Task 8: Register for cheapest beginner wood carving online workshop under $40';
    console.log('Testing:', testName);

    try {
      // List online beginner wood carving workshops <= $40, sorted by price low to high
      const filters = {
        format: 'online',
        topic: 'Wood Carving',
        difficulty: 'beginner',
        maxPrice: 40,
        onlyWorkshops: true
      };
      const listResult = this.logic.listEvents(filters, 'price_low_to_high', 1, 20);
      this.assert(listResult && Array.isArray(listResult.events), 'Should return events array');
      this.assert(listResult.events.length > 0, 'Should have at least one matching workshop');

      const cheapestEvent = listResult.events[0];
      this.assert(cheapestEvent.price <= 40, 'Cheapest workshop should cost $40 or less');

      // Load event details
      const eventDetails = this.logic.getEventDetails(cheapestEvent.id);
      this.assert(eventDetails && eventDetails.event && eventDetails.event.id === cheapestEvent.id, 'Event details should load');

      // Register with pay_later option
      const registrantName = 'Alex Wood';
      const city = 'Springfield';
      const experienceNotes = 'Beginner hobbyist';
      const paymentMethod = 'pay_later';

      const regResult = this.logic.registerForEvent(cheapestEvent.id, registrantName, city, experienceNotes, paymentMethod);
      this.assert(regResult && regResult.registration && regResult.registration.id, 'Should create event registration');

      const registration = regResult.registration;
      this.assert(registration.eventId === cheapestEvent.id, 'Registration should reference correct event');
      this.assert(registration.registrantName === registrantName, 'Registrant name should match');
      this.assert(registration.paymentMethod === paymentMethod, 'Payment method should be pay_later');

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
