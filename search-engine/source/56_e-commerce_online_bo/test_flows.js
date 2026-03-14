// Test runner for business logic (Node.js, CommonJS)
// Focus: flow-based integration tests for e-commerce ebook bookstore

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
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
    // IMPORTANT: Use the Generated Data exactly as provided (values preserved)
    const generatedData = {
      promo_codes: [
        {
          id: 'promo_read10',
          code: 'READ10',
          description: 'Save 10% on eligible ebook orders over $30.',
          discountType: 'percentage',
          discountValue: 10,
          minOrderTotal: 30,
          isActive: true,
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2026-12-31T23:59:59Z',
          maxUses: 100000,
          createdAt: '2024-12-01T10:00:00Z',
          updatedAt: '2026-02-15T09:30:00Z'
        },
        {
          id: 'promo_welcome15',
          code: 'WELCOME15',
          description: '15% off your first ebook purchase over $20.',
          discountType: 'percentage',
          discountValue: 15,
          minOrderTotal: 20,
          isActive: true,
          validFrom: '2025-06-01T00:00:00Z',
          validTo: '2027-01-01T00:00:00Z',
          maxUses: 50000,
          createdAt: '2025-05-15T12:00:00Z',
          updatedAt: '2025-11-20T08:45:00Z'
        },
        {
          id: 'promo_spring5',
          code: 'SPRING5',
          description: '$5 off any ebook order over $25 during the spring promotion.',
          discountType: 'fixed_amount',
          discountValue: 5,
          minOrderTotal: 25,
          isActive: false,
          validFrom: '2025-03-01T00:00:00Z',
          validTo: '2025-06-01T00:00:00Z',
          maxUses: 20000,
          createdAt: '2025-02-10T09:15:00Z',
          updatedAt: '2025-06-02T10:00:00Z'
        }
      ],
      authors: [
        {
          id: 'neil_gaiman',
          name: 'Neil Gaiman',
          slug: 'neil-gaiman',
          bio: 'Neil Gaiman is a British author of fantasy, horror, and speculative fiction, known for his imaginative storytelling across novels, comics, and screen.',
          photoUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop&auto=format&q=80',
          websiteUrl: 'https://www.neilgaiman.com',
          createdAt: '2024-06-10T10:00:00Z',
          updatedAt: '2026-01-15T09:30:00Z'
        },
        {
          id: 'clara_zhang',
          name: 'Clara Zhang',
          slug: 'clara-zhang',
          bio: 'Clara Zhang is a productivity coach and consultant who writes practical guides on time management and focus for busy professionals.',
          photoUrl: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=800&h=600&fit=crop&auto=format&q=80',
          websiteUrl: 'https://clarazhang.example.com',
          createdAt: '2024-09-01T08:45:00Z',
          updatedAt: '2026-02-20T11:10:00Z'
        },
        {
          id: 'marcus_elm',
          name: 'Marcus Elm',
          slug: 'marcus-elm',
          bio: 'Marcus Elm is a business strategist and speaker focusing on leadership, high-performing teams, and organizational change.',
          photoUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=600&fit=crop&auto=format&q=80',
          websiteUrl: 'https://marcuselm.example.com',
          createdAt: '2024-05-12T14:20:00Z',
          updatedAt: '2026-01-30T16:45:00Z'
        }
      ],
      categories: [
        {
          id: 'science_fiction',
          name: 'Science Fiction',
          code: 'science_fiction',
          description: 'Explore science fiction ebooks, from space opera and cyberpunk to near-future thrillers and AI adventures.',
          parentCategoryId: '',
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2026-02-20T09:30:00Z'
        },
        {
          id: 'fantasy',
          name: 'Fantasy',
          code: 'fantasy',
          description: 'Browse epic, urban, and contemporary fantasy ebooks filled with magic, mythical creatures, and rich worldbuilding.',
          parentCategoryId: '',
          createdAt: '2024-01-10T10:05:00Z',
          updatedAt: '2026-02-20T09:32:00Z'
        },
        {
          id: 'romance',
          name: 'Romance',
          code: 'romance',
          description: 'Discover romance ebooks spanning contemporary, historical, and fantasy love stories with guaranteed happy endings.',
          parentCategoryId: '',
          createdAt: '2024-01-10T10:10:00Z',
          updatedAt: '2026-02-20T09:34:00Z'
        }
      ],
      products: [
        {
          id: 'time_guard_essentials',
          title: 'Time Guard Essentials',
          subtitle: 'A 7-Day Plan to Take Back Your Schedule',
          slug: 'time-guard-essentials',
          description: 'A concise, practical guide to time management that helps you audit your week, set boundaries, and build routines that actually stick. Designed for busy professionals who feel like their days are running them instead of the other way around.',
          format: 'ebook',
          language: 'english',
          categoryId: 'self_help',
          authorId: 'clara_zhang',
          price: 6.99,
          listPrice: 9.99,
          currency: 'usd',
          averageRating: 4.3,
          ratingCount: 214,
          pageCount: 160,
          publicationDate: '2024-03-15T00:00:00Z',
          releaseDate: '2024-03-15T00:00:00Z',
          availabilityStatus: 'available',
          isPreorderAvailable: false,
          isbn: '9780000000001',
          coverImageUrl: 'http://3.bp.blogspot.com/-XP93OdSKuh8/VbfFNMgKSNI/AAAAAAAAGKQ/udcmCYXlwmM/s640/Taking%2BControl%2Bof%2BYour%2BTime%2BWith%2Ba%2BPlanner.png',
          sampleFileUrl: 'https://arxiv.org/pdf/2404.07972',
          keywords: [
            'time management',
            'productivity',
            'focus',
            'schedule',
            'self-help',
            'work-life balance'
          ],
          createdAt: '2024-02-20T10:00:00Z',
          updatedAt: '2025-12-01T09:30:00Z',
          recommendedProductIds: [
            'prioritize_your_days',
            'python_data_workflows',
            'python_clean_code'
          ]
        },
        {
          id: 'prioritize_your_days',
          title: 'Prioritize Your Days',
          subtitle: 'Time Management for Overloaded Professionals',
          slug: 'prioritize-your-days',
          description: 'Organizational psychologist Devon Price walks you through a step-by-step framework to clarify priorities, manage interruptions, and protect deep work time in fast-paced workplaces.',
          format: 'ebook',
          language: 'english',
          categoryId: 'business_economics',
          authorId: 'devon_price',
          price: 11.99,
          listPrice: 14.99,
          currency: 'usd',
          averageRating: 4.6,
          ratingCount: 132,
          pageCount: 220,
          publicationDate: '2023-11-10T00:00:00Z',
          releaseDate: '2023-11-10T00:00:00Z',
          availabilityStatus: 'available',
          isPreorderAvailable: false,
          isbn: '9780000000002',
          coverImageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/c18c31f8-542a-54dc-b6cc-5243058c0b2d.jpeg',
          sampleFileUrl: 'https://arxiv.org/pdf/2404.07972',
          keywords: [
            'time management',
            'prioritization',
            'deep work',
            'productivity',
            'business',
            'overwhelm'
          ],
          createdAt: '2023-10-15T09:00:00Z',
          updatedAt: '2026-01-05T08:20:00Z',
          recommendedProductIds: [
            'time_guard_essentials',
            'python_data_workflows',
            'python_clean_code'
          ]
        },
        {
          id: 'python_data_workflows',
          title: 'Python Data Workflows',
          subtitle: 'Building Reliable Pipelines for Analytics and Automation',
          slug: 'python-data-workflows',
          description: 'Learn how to design, build, and maintain production-ready data workflows in Python. From ETL scripts to scheduled jobs, this book covers architecture, testing, and monitoring for robust analytics systems.',
          format: 'ebook',
          language: 'english',
          categoryId: 'all_ebooks',
          authorId: 'jordan_lee',
          price: 27.99,
          listPrice: 34.99,
          currency: 'usd',
          averageRating: 4.9,
          ratingCount: 287,
          pageCount: 620,
          publicationDate: '2024-09-01T00:00:00Z',
          releaseDate: '2024-09-01T00:00:00Z',
          availabilityStatus: 'available',
          isPreorderAvailable: false,
          isbn: '9780000000003',
          coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format&q=80',
          sampleFileUrl: 'https://arxiv.org/pdf/2404.07972',
          keywords: [
            'python programming',
            'data engineering',
            'automation',
            'pipelines',
            'analytics',
            'workflow'
          ],
          createdAt: '2024-07-10T11:15:00Z',
          updatedAt: '2026-01-12T14:40:00Z',
          recommendedProductIds: [
            'time_guard_essentials',
            'prioritize_your_days',
            'python_clean_code'
          ]
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:14:15.164566'
      }
    };

    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function') {
      // Use storage keys from Storage Key Mapping
      localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
      localStorage.setItem('authors', JSON.stringify(generatedData.authors));
      localStorage.setItem('categories', JSON.stringify(generatedData.categories));
      localStorage.setItem('products', JSON.stringify(generatedData.products));
      // Optional: persist metadata under its own key
      localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_PurchaseCheapestTimeManagementEbook();
    this.testTask2_AddRecentMidPricedEbooksToCart();
    this.testTask3_SavePremiumEbooksToWishlist();
    this.testTask4_CompareTwoTimeManagementEbooksAndAddLonger();
    this.testTask5_PurchaseEarliestReleasingEbookAndCheckout();
    this.testTask6_BuyTwoTopRatedEbooksAndApplyREAD10();
    this.testTask7_SaveCheapestSelfHelpToWishlist();
    this.testTask8_AddAuthorEbookAndRecommendationsToCart();

    return this.results;
  }

  // ----------------------
  // Helpers
  // ----------------------

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
    this.results.push({ test: testName, success: false, error: error && error.message ? error.message : String(error) });
    console.log('✗ ' + testName + ': ' + (error && error.message ? error.message : String(error)));
  }

  clearCartUsingApi() {
    if (this.logic && typeof this.logic.clearCart === 'function') {
      this.logic.clearCart();
    }
  }

  clearWishlistUsingApi() {
    if (!this.logic || typeof this.logic.getWishlistDetails !== 'function') {
      return;
    }
    const details = this.logic.getWishlistDetails();
    const items = (details && details.items) || [];
    for (const entry of items) {
      const wishlistItem = entry && entry.wishlistItem ? entry.wishlistItem : null;
      if (wishlistItem && wishlistItem.id && typeof this.logic.removeFromWishlist === 'function') {
        this.logic.removeFromWishlist(wishlistItem.id);
      }
    }
  }

  // Utility: find product in cart details by productId
  findCartItemByProductId(cartDetails, productId) {
    const items = (cartDetails && cartDetails.items) || [];
    return items.find(function (entry) {
      return entry && entry.product && entry.product.id === productId;
    });
  }

  // ----------------------
  // Task 1
  // Purchase the cheapest English time management ebook under $15 with rating 4.0+
  // Adapted to available data: search by query, filter by price, rating, language, sort by price asc,
  // add the first result to cart, verify cart contains exactly that item.
  // ----------------------
  testTask1_PurchaseCheapestTimeManagementEbook() {
    const testName = 'Task 1: Purchase cheapest English time management ebook under $15 (rating 4.0+)';
    try {
      this.clearCartUsingApi();

      // Optionally verify browse filter/sort options are available
      if (typeof this.logic.getBrowseFilterOptions === 'function') {
        const filterOptions = this.logic.getBrowseFilterOptions();
        this.assert(filterOptions && typeof filterOptions === 'object', 'Filter options should be an object');
      }
      if (typeof this.logic.getBrowseSortOptions === 'function') {
        const sortOptions = this.logic.getBrowseSortOptions();
        this.assert(Array.isArray(sortOptions), 'Sort options should be an array');
      }

      // Search for time management ebooks with filters
      const query = 'time management';
      const categoryCode = null; // not restricting by category for this test
      const filters = {
        minPrice: undefined,
        maxPrice: 15,
        minRating: 4.0,
        language: 'english',
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'price_asc';
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'There should be at least one matching time management ebook');

      const cheapestProduct = searchResult.products[0];
      this.assert(cheapestProduct.price <= 15, 'Cheapest product should be priced at or below $15');
      this.assert(cheapestProduct.averageRating >= 4.0, 'Cheapest product should have rating >= 4.0');
      this.assert(cheapestProduct.language === 'english', 'Cheapest product should be in English');

      // Add the cheapest product to cart
      const addResult = this.logic.addToCart(cheapestProduct.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed');
      this.assert(addResult.cart && addResult.cart.id, 'addToCart should return a cart object with id');
      this.assert(Array.isArray(addResult.cartItems), 'addToCart should return cartItems array');

      // Verify the item was added using returned cartItems
      const addedFromResponse = addResult.cartItems.find(function (ci) {
        return ci && ci.productId === cheapestProduct.id;
      });
      this.assert(!!addedFromResponse, 'Added product should be present in cartItems from addToCart response');

      // Verify via full cart details that there is exactly one item and it matches the selected product
      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && cartDetails.cart, 'getCartDetails should return cart and items');
      const items = cartDetails.items || [];
      this.assert(items.length === 1, 'Cart should contain exactly one item for Task 1');
      const itemEntry = items[0];
      this.assert(itemEntry.product.id === cheapestProduct.id, 'Cart item product should match selected cheapest product');
      this.assert(itemEntry.product.price <= 15, 'Cart item price should be <= 15');
      this.assert(itemEntry.product.averageRating >= 4.0, 'Cart item rating should be >= 4.0');

      // Verify cart summary matches expectations
      const summary = this.logic.getCartSummary();
      this.assert(summary.itemCount === 1, 'Cart summary itemCount should be 1');
      this.assert(summary.subtotal >= itemEntry.product.price, 'Cart subtotal should be at least the product price');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 2 (adapted)
  // Original: Add three recent sci-fi ebooks between $5–$12 with rating 4.2+.
  // Adaptation: Using available data, add up to three of the most recent ebooks
  // priced between $5 and $12 with rating >= 4.2 (any category) to the cart.
  // ----------------------
  testTask2_AddRecentMidPricedEbooksToCart() {
    const testName = 'Task 2: Add recent ebooks between $5–$12 with rating 4.2+ to cart';
    try {
      this.clearCartUsingApi();

      const query = null; // all ebooks
      const categoryCode = null; // not restricting by category due to limited data
      const filters = {
        minPrice: 5,
        maxPrice: 12,
        minRating: 4.2,
        language: undefined,
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'publication_date_desc'; // newest first
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'There should be at least one mid-priced ebook with rating >= 4.2');

      const toAdd = searchResult.products.slice(0, 3);
      const addedIds = [];
      for (const product of toAdd) {
        this.assert(product.price >= 5 && product.price <= 12, 'Product price should be between $5 and $12');
        this.assert(product.averageRating >= 4.2, 'Product rating should be >= 4.2');
        const addResult = this.logic.addToCart(product.id, 1);
        this.assert(addResult && addResult.success === true, 'addToCart should succeed for mid-priced ebook');
        addedIds.push(product.id);
      }

      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && cartDetails.cart, 'getCartDetails should return a cart');
      const items = cartDetails.items || [];
      this.assert(items.length === addedIds.length, 'Cart should contain one line item per added product');

      // Verify each added product is present and meets constraints
      for (const addedId of addedIds) {
        const entry = this.findCartItemByProductId(cartDetails, addedId);
        this.assert(!!entry, 'Cart should contain product id ' + addedId);
        this.assert(entry.product.price >= 5 && entry.product.price <= 12, 'Cart product price should be between $5 and $12');
        this.assert(entry.product.averageRating >= 4.2, 'Cart product rating should be >= 4.2');
      }

      const summary = this.logic.getCartSummary();
      this.assert(summary.itemCount === addedIds.length, 'Cart summary itemCount should match number of added products');
      this.assert(summary.subtotal > 0, 'Cart subtotal should be positive');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 3 (adapted)
  // Original: Save four premium business ebooks (>$20, 4.5+ stars) to the wishlist.
  // Adaptation: Save up to four premium ebooks (price > $20, rating >= 4.5) from all categories
  // to the wishlist and verify they are present with correct constraints.
  // ----------------------
  testTask3_SavePremiumEbooksToWishlist() {
    const testName = 'Task 3: Save premium ebooks (>$20, 4.5+ stars) to wishlist';
    try {
      this.clearWishlistUsingApi();

      const query = null;
      const categoryCode = null; // not restricting to business_economics due to limited data
      const filters = {
        minPrice: 20,
        maxPrice: undefined,
        minRating: 4.5,
        language: undefined,
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'rating_desc'; // highest rating first
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'There should be at least one premium ebook');

      const toSave = searchResult.products.slice(0, 4);
      const savedIds = [];
      for (const product of toSave) {
        this.assert(product.price > 20, 'Premium product should have price > $20');
        this.assert(product.averageRating >= 4.5, 'Premium product should have rating >= 4.5');
        const addResult = this.logic.addToWishlist(product.id);
        this.assert(addResult && addResult.success === true, 'addToWishlist should succeed for premium ebook');
        savedIds.push(product.id);
      }

      const wishlistDetails = this.logic.getWishlistDetails();
      this.assert(wishlistDetails && wishlistDetails.wishlist, 'getWishlistDetails should return wishlist object');
      const items = wishlistDetails.items || [];
      this.assert(items.length === savedIds.length, 'Wishlist should contain one item per saved product');

      for (const productId of savedIds) {
        const entry = items.find(function (e) { return e && e.product && e.product.id === productId; });
        this.assert(!!entry, 'Wishlist should contain product id ' + productId);
        this.assert(entry.product.price > 20, 'Wishlist product should have price > $20');
        this.assert(entry.product.averageRating >= 4.5, 'Wishlist product should have rating >= 4.5');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 4 (adapted)
  // Original: Compare two Python programming ebooks under $30 and add the one with more pages.
  // Adaptation: Compare the two highest-rated time management ebooks under $30 and
  // add the one with more pages to the cart so the cart contains only that ebook.
  // ----------------------
  testTask4_CompareTwoTimeManagementEbooksAndAddLonger() {
    const testName = 'Task 4: Compare two top-rated time management ebooks under $30 and add longer one';
    try {
      this.clearCartUsingApi();

      const query = 'time management';
      const categoryCode = null;
      const filters = {
        minPrice: undefined,
        maxPrice: 30,
        minRating: undefined,
        language: undefined,
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'rating_desc'; // highest rating first
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length >= 2, 'There should be at least two time management ebooks under $30');

      const first = searchResult.products[0];
      const second = searchResult.products[1];

      // Get full product details to read pageCount
      const firstDetails = this.logic.getProductDetails(first.id);
      const secondDetails = this.logic.getProductDetails(second.id);
      this.assert(typeof firstDetails.pageCount === 'number', 'First ebook should have numeric pageCount');
      this.assert(typeof secondDetails.pageCount === 'number', 'Second ebook should have numeric pageCount');

      const longer = firstDetails.pageCount >= secondDetails.pageCount ? firstDetails : secondDetails;
      const shorter = longer.id === firstDetails.id ? secondDetails : firstDetails;
      this.assert(longer.pageCount >= shorter.pageCount, 'Chosen ebook should have at least as many pages as the other');

      const addResult = this.logic.addToCart(longer.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for longer ebook');

      const cartDetails = this.logic.getCartDetails();
      const items = cartDetails.items || [];
      this.assert(items.length === 1, 'Cart should contain exactly one item after adding longer ebook');
      const entry = items[0];
      this.assert(entry.product.id === longer.id, 'Cart product should be the longer ebook selected');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 5 (adapted)
  // Original: Preorder earliest-releasing fantasy ebook after Jan 1, 2025 under $25 and checkout.
  // Adaptation (due to no upcoming/preorder data):
  //   - Find the earliest-releasing ebook under $25 (any category)
  //   - Add it to cart
  //   - Proceed through checkout (getCheckoutSummary + placeOrder)
  //   - Verify order is created and linked to the purchased ebook.
  // ----------------------
  testTask5_PurchaseEarliestReleasingEbookAndCheckout() {
    const testName = 'Task 5: Purchase earliest-releasing ebook under $25 and complete checkout';
    try {
      this.clearCartUsingApi();

      const query = null;
      const categoryCode = null;
      const filters = {
        minPrice: undefined,
        maxPrice: 25,
        minRating: undefined,
        language: undefined,
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'release_date_asc'; // soonest release date first
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'There should be at least one ebook under $25');

      const earliest = searchResult.products[0];
      this.assert(earliest.price <= 25, 'Selected earliest ebook should be priced at or below $25');

      const addResult = this.logic.addToCart(earliest.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for earliest ebook');

      // Simulate proceed to checkout by fetching checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'getCheckoutSummary should return cart');
      const checkoutItems = checkoutSummary.items || [];
      const checkoutEntry = checkoutItems.find(function (entry) {
        return entry && entry.product && entry.product.id === earliest.id;
      });
      this.assert(!!checkoutEntry, 'Checkout summary should include the earliest ebook');
      this.assert(checkoutSummary.cart.total > 0, 'Checkout cart total should be positive');

      // Place order
      const purchaserName = 'Test User';
      const purchaserEmail = 'test.user@example.com';
      const paymentMethod = 'card';
      const paymentDetails = {
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: '123',
        billingZip: '12345'
      };
      const agreeToTerms = true;

      const orderResult = this.logic.placeOrder(
        purchaserName,
        purchaserEmail,
        paymentMethod,
        paymentDetails,
        agreeToTerms
      );

      this.assert(orderResult && orderResult.success === true, 'placeOrder should succeed');
      this.assert(orderResult.order && orderResult.order.id, 'placeOrder should return an order with id');
      this.assert(Array.isArray(orderResult.items), 'placeOrder should return order items array');

      const orderItemEntry = orderResult.items.find(function (entry) {
        return entry && entry.product && entry.product.id === earliest.id;
      });
      this.assert(!!orderItemEntry, 'Order items should include the earliest ebook');
      this.assert(orderResult.order.total > 0, 'Order total should be positive');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 6 (adapted)
  // Original: Buy two top-rated romance ebooks over $15 each and apply promo code READ10.
  // Adaptation: Buy the two highest-rated ebooks overall such that combined subtotal exceeds
  // READ10.minOrderTotal, then apply READ10 and verify discount and totals update.
  // ----------------------
  testTask6_BuyTwoTopRatedEbooksAndApplyREAD10() {
    const testName = 'Task 6: Buy two top-rated ebooks and apply promo code READ10';
    try {
      this.clearCartUsingApi();

      // Get active promotions and locate READ10
      const activePromos = this.logic.getActivePromotions();
      this.assert(Array.isArray(activePromos), 'getActivePromotions should return an array');
      const read10 = activePromos.find(function (p) { return p && p.code === 'READ10'; });
      this.assert(!!read10, 'READ10 promo code should be active');
      this.assert(read10.isActive === true, 'READ10 promo should be active');

      // Get top-rated ebooks
      const query = null;
      const categoryCode = null;
      const filters = null; // no filters; we want global top-rated
      const sortBy = 'rating_desc';
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length >= 2, 'There should be at least two ebooks to purchase');

      const toBuy = searchResult.products.slice(0, 2);
      let expectedSubtotal = 0;
      for (const product of toBuy) {
        expectedSubtotal += product.price;
        const addResult = this.logic.addToCart(product.id, 1);
        this.assert(addResult && addResult.success === true, 'addToCart should succeed for top-rated ebook');
      }

      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && cartDetails.cart, 'getCartDetails should return a cart');
      const subtotalBeforePromo = cartDetails.cart.subtotal;
      this.assert(subtotalBeforePromo >= read10.minOrderTotal, 'Cart subtotal should meet READ10 minimum order total');

      // Apply promo code READ10
      const applyResult = this.logic.applyPromoCode('READ10');
      this.assert(applyResult && applyResult.success === true, 'applyPromoCode should succeed for READ10');
      this.assert(applyResult.cart && typeof applyResult.cart.discountTotal === 'number', 'applyPromoCode should return updated cart with discountTotal');

      const discountedCart = applyResult.cart;
      this.assert(discountedCart.discountTotal > 0, 'Discount total should be greater than zero after applying READ10');
      this.assert(discountedCart.total < discountedCart.subtotal, 'Cart total should be less than subtotal after discount');

      const summary = this.logic.getCartSummary();
      this.assert(summary.discountTotal === discountedCart.discountTotal, 'Cart summary discountTotal should match cart.discountTotal');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 7 (adapted)
  // Original: Save one highly rated Spanish self-help ebook under $12 to the wishlist.
  // Adaptation (no Spanish ebooks in data):
  //   - From the self-help category (via categoryCode 'self_help'),
  //   - Filter to ebooks under $12 with rating >= 4.3,
  //   - Sort by price low-to-high,
  //   - Add the cheapest matching ebook to the wishlist.
  // ----------------------
  testTask7_SaveCheapestSelfHelpToWishlist() {
    const testName = 'Task 7: Save cheapest highly rated self-help ebook under $12 to wishlist';
    try {
      this.clearWishlistUsingApi();

      const query = null;
      const categoryCode = 'self_help'; // matches Product.categoryId for time_guard_essentials
      const filters = {
        minPrice: undefined,
        maxPrice: 12,
        minRating: 4.3,
        language: undefined, // language not filtered due to lack of Spanish data
        availability: undefined,
        releaseDateFrom: undefined,
        releaseDateTo: undefined,
        onlyPreorderAvailable: undefined
      };
      const sortBy = 'price_asc';
      const page = 1;
      const pageSize = 20;

      const searchResult = this.logic.searchProducts(query, categoryCode, filters, sortBy, page, pageSize);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'There should be at least one self-help ebook under $12 with rating >= 4.3');

      const cheapest = searchResult.products[0];
      this.assert(cheapest.price <= 12, 'Cheapest self-help ebook should be priced at or below $12');
      this.assert(cheapest.averageRating >= 4.3, 'Cheapest self-help ebook should have rating >= 4.3');

      const addResult = this.logic.addToWishlist(cheapest.id);
      this.assert(addResult && addResult.success === true, 'addToWishlist should succeed for cheapest self-help ebook');

      const wishlistDetails = this.logic.getWishlistDetails();
      this.assert(wishlistDetails && wishlistDetails.wishlist, 'getWishlistDetails should return wishlist');
      const items = wishlistDetails.items || [];
      this.assert(items.length === 1, 'Wishlist should contain exactly one item for Task 7');
      const entry = items[0];
      this.assert(entry.product.id === cheapest.id, 'Wishlist product should match cheapest self-help ebook');
      this.assert(entry.product.price <= 12, 'Wishlist product price should be <= $12');
      this.assert(entry.product.averageRating >= 4.3, 'Wishlist product rating should be >= 4.3');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 8 (adapted)
  // Original: Add one ebook by "Neil Gaiman" and two related recommendations under $18 with 4+ stars to the cart.
  // Adaptation (Neil Gaiman has no ebooks in generated products):
  //   - Search for author "Clara Zhang" (who has an ebook in data).
  //   - From her author page, pick a highly rated ebook under $18.
  //   - From its recommendations, pick up to two additional ebooks under $18 with rating >= 4.0.
  //   - Add all of them to the cart.
  // ----------------------
  testTask8_AddAuthorEbookAndRecommendationsToCart() {
    const testName = 'Task 8: Add Clara Zhang ebook and recommended ebooks under $18 with 4+ stars to cart';
    try {
      this.clearCartUsingApi();

      // Search for author "Clara Zhang"
      const authorQuery = 'Clara Zhang';
      const page = 1;
      const pageSize = 20;
      const authorSearch = this.logic.searchAuthors(authorQuery, page, pageSize);
      this.assert(authorSearch && Array.isArray(authorSearch.authors), 'searchAuthors should return authors array');
      this.assert(authorSearch.authors.length > 0, 'There should be at least one author matching Clara Zhang');

      const author = authorSearch.authors[0];
      this.assert(author.id, 'Author should have an id');

      // Get author details
      const authorDetails = this.logic.getAuthorDetails(author.id);
      this.assert(authorDetails && authorDetails.id === author.id, 'getAuthorDetails should return the same author');

      // Get author products (ebooks) with price filter and rating sort
      const filters = {
        minPrice: undefined,
        maxPrice: 18,
        minRating: undefined,
        language: undefined
      };
      const sortBy = 'rating_desc';
      const authorProducts = this.logic.getAuthorProducts(author.id, filters, sortBy, 1, 20);
      this.assert(authorProducts && Array.isArray(authorProducts.products), 'getAuthorProducts should return products array');
      this.assert(authorProducts.products.length > 0, 'Author should have at least one ebook under $18');

      const baseProduct = authorProducts.products.find(function (p) { return p.price < 18; }) || authorProducts.products[0];
      this.assert(baseProduct && baseProduct.id, 'Base ebook from author should be selected');

      // Add base ebook to cart
      const addBaseResult = this.logic.addToCart(baseProduct.id, 1);
      this.assert(addBaseResult && addBaseResult.success === true, 'addToCart should succeed for author ebook');

      // Fetch recommendations for base ebook
      const recommendations = this.logic.getRecommendedProducts(baseProduct.id);
      this.assert(Array.isArray(recommendations), 'getRecommendedProducts should return array');

      const filteredRecommendations = recommendations.filter(function (p) {
        return p.price < 18 && p.averageRating >= 4.0;
      });
      const recToAdd = filteredRecommendations.slice(0, 2);
      const addedRecIds = [];
      for (const rec of recToAdd) {
        const addRecResult = this.logic.addToCart(rec.id, 1);
        this.assert(addRecResult && addRecResult.success === true, 'addToCart should succeed for recommended ebook');
        addedRecIds.push(rec.id);
      }

      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && cartDetails.cart, 'getCartDetails should return cart');
      const items = cartDetails.items || [];

      // Verify base product is in cart
      const baseEntry = this.findCartItemByProductId(cartDetails, baseProduct.id);
      this.assert(!!baseEntry, 'Cart should contain the base author ebook');
      this.assert(baseEntry.product.price < 18, 'Base author ebook price should be < $18');

      // Verify recommended products are in cart and obey constraints
      for (const recId of addedRecIds) {
        const recEntry = this.findCartItemByProductId(cartDetails, recId);
        this.assert(!!recEntry, 'Cart should contain recommended ebook id ' + recId);
        this.assert(recEntry.product.price < 18, 'Recommended ebook price should be < $18');
        this.assert(recEntry.product.averageRating >= 4.0, 'Recommended ebook rating should be >= 4.0');
      }

      // Total number of items should be 1 (base) + number of recommendations added
      const expectedCount = 1 + addedRecIds.length;
      this.assert(items.length === expectedCount, 'Cart should contain base ebook plus added recommendations');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
