/*
 * Test runner for business logic - flow-based integration tests
 * Covers all 8 specified user tasks, adapted to available Generated Data.
 */

class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is expected to be provided by the host app
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Initial clean environment
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
    // IMPORTANT: Use the Generated Data exactly as provided for initial population
    const generatedData = {
      "blog_posts": [
        {
          "id": "ux-telehealth-onboarding-2024",
          "title": "Designing Frictionless Onboarding for a Telehealth App",
          "slug": "telehealth-app-onboarding-ux-case-study",
          "excerpt": "How we reduced patient drop-off by 37% in the first session of a telehealth platform.",
          "content": "In this UX case study, we walk through our process for redesigning the onboarding flow of a telehealth app used by thousands of patients.\n\nWe began with remote usability testing to understand where patients were abandoning the flow. The key issues were unclear progress feedback and overwhelming consent screens.\n\nOur solution introduced chunked consent, progressive disclosure for medical forms, and a simplified identity verification step. After launch, completion rates improved by 37% and average time-to-complete dropped by 42 seconds.",
          "author_name": "Maya Ortiz",
          "published_at": "2024-06-15T10:00:00Z",
          "tags": [
            "ux",
            "user_experience",
            "case_study",
            "healthcare"
          ],
          "category": "ux_case_study"
        },
        {
          "id": "ux-fintech-saving-habits-2023",
          "title": "Nudging Better Saving Habits in a Fintech App",
          "slug": "fintech-saving-habits-ux-case-study",
          "excerpt": "Behavioral design techniques that increased weekly savings actions by 24%.",
          "content": "This UX case study explores how we used behavioral science to encourage consistent saving in a consumer fintech app.\n\nWe introduced goal-based saving jars, progress visualizations, and just-in-time prompts based on payday predictions. The design emphasized clarity and reduced cognitive load by limiting choices at each step.\n\nPost-launch analytics showed a 24% increase in weekly savings actions and a 15% reduction in users withdrawing from their savings jars prematurely.",
          "author_name": "Jared Lin",
          "published_at": "2023-11-02T14:30:00Z",
          "tags": [
            "ux",
            "user_experience",
            "case_study",
            "fintech"
          ],
          "category": "ux_case_study"
        },
        {
          "id": "ux-education-learning-paths-2024",
          "title": "Personalized Learning Paths for an EdTech Platform",
          "slug": "personalized-learning-paths-ux",
          "excerpt": "Reimagining course discovery and progress for 120K+ active students.",
          "content": "For a fast-growing EdTech platform, we redesigned the course discovery and learning path experience.\n\nThrough diary studies and analytics, we learned that learners struggled to understand which course to take next and how close they were to their goals. We introduced guided paths, clear skill outcomes, and a new progress tracker spanning multiple courses.\n\nThe redesign led to a 19% increase in course completion rates and higher satisfaction scores in quarterly NPS surveys.",
          "author_name": "Maya Ortiz",
          "published_at": "2024-03-21T09:15:00Z",
          "tags": [
            "ux",
            "user_experience",
            "case_study",
            "education"
          ],
          "category": "ux_case_study"
        }
      ],
      "case_studies": [
        {
          "id": "ember-street-bistro-branding",
          "title": "Ember Street Bistro: From Pop-Up to Cult Favorite",
          "slug": "ember-street-bistro-branding",
          "summary": "A bold, fire-inspired identity for a modern street-food bistro.",
          "content": "Ember Street Bistro needed a flexible brand system that could stretch from food truck signage to a full-service restaurant.\n\nWe crafted a logo built from modular letterforms, a charcoal-and-ember color palette, and a photography direction that highlights the drama of open-flame cooking.\n\nDeliverables included logo suite, menu system, storefront signage, social templates, and a 48-page brand guidelines document.",
          "thumbnail_image_url": "https://wallpaperstrend.com/wp-content/uploads/Photography/Photography02/Embers-into-flames-1280x720.jpg",
          "year": 2024,
          "published_at": "2024-05-06T10:00:00Z",
          "industry": "restaurant",
          "service_types": [
            "branding",
            "strategy",
            "web_design"
          ],
          "service_types_enum_helper": "branding",
          "is_featured": true
        },
        {
          "id": "harbor-ramen-branding",
          "title": "Harbor Bowl: Coastal Ramen Bar Branding",
          "slug": "harbor-bowl-ramen-branding",
          "summary": "A relaxed, coastal-inspired brand for a neighborhood ramen bar.",
          "content": "Harbor Bowl combined Japanese ramen with a coastal bar atmosphere. The visual identity needed to balance craft and approachability.\n\nWe created a hand-drawn logomark, a soft blue-and-sand color palette, and custom iconography for menu sections. A compact brand guide enabled the internal team to roll out social campaigns quickly.",
          "thumbnail_image_url": "https://pd12m.s3.us-west-2.amazonaws.com/images/8bfbbb0e-2644-5d17-8e59-34a93f26298e.jpeg",
          "year": 2023,
          "published_at": "2023-08-19T11:30:00Z",
          "industry": "food_beverage",
          "service_types": [
            "branding",
            "web_design"
          ],
          "service_types_enum_helper": "branding",
          "is_featured": false
        },
        {
          "id": "verde-plant-kitchen-branding",
          "title": "Verde Plant Kitchen: A Fresh Plant-Based Identity",
          "slug": "verde-plant-kitchen-branding",
          "summary": "Clean, flexible branding for a fast-casual plant-based restaurant.",
          "content": "Verde Plant Kitchen wanted to move beyond typical green-washing visuals.\n\nWe designed a typographic logo, a playful illustration system, and a color palette inspired by fresh produce. The brand guidelines documented logo usage, color, typography, and photography guidance for in-house marketing.",
          "thumbnail_image_url": "https://www.mariaushakova.com/wp-content/uploads/2020/08/Fresh-Vegetable-Salad.jpg",
          "year": 2022,
          "published_at": "2022-11-03T09:00:00Z",
          "industry": "restaurant",
          "service_types": [
            "branding",
            "strategy"
          ],
          "service_types_enum_helper": "branding",
          "is_featured": false
        }
      ],
      "products": [
        {
          "id": "wt-aurora-commerce",
          "name": "Aurora Commerce — Fashion Ecommerce Template",
          "slug": "aurora-commerce-ecommerce-template",
          "description": "A high-converting ecommerce website template designed for fashion and lifestyle brands. Includes product storytelling sections, lookbooks, and editorial content blocks.",
          "product_category": "website_templates",
          "product_subcategory": "ecommerce",
          "price": 59,
          "currency": "usd",
          "rating": 4.9,
          "rating_count": 182,
          "creator_name": "Lumen Studio",
          "delivery_format": "digital",
          "free_shipping": true,
          "shipping_required": false,
          "shipping_price": 0,
          "available_colors": [],
          "color_enum_helper": "other",
          "includes_desktop_layouts": true,
          "includes_mobile_layouts": true,
          "is_bundle": false,
          "image_urls": [
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "created_at": "2023-03-01T10:00:00Z",
          "status": "active"
        },
        {
          "id": "wt-neon-cart",
          "name": "NeonCart — Modern Ecommerce Template",
          "slug": "neoncart-modern-ecommerce-template",
          "description": "A bold ecommerce template with dark mode styling, ideal for streetwear and sneaker brands. Optimized for mobile checkout.",
          "product_category": "website_templates",
          "product_subcategory": "ecommerce",
          "price": 49,
          "currency": "usd",
          "rating": 4.7,
          "rating_count": 96,
          "creator_name": "Northline UX",
          "delivery_format": "digital",
          "free_shipping": true,
          "shipping_required": false,
          "shipping_price": 0,
          "available_colors": [],
          "color_enum_helper": "other",
          "includes_desktop_layouts": true,
          "includes_mobile_layouts": true,
          "is_bundle": false,
          "image_urls": [
            "https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "created_at": "2022-10-12T09:30:00Z",
          "status": "active"
        },
        {
          "id": "wt-minimal-folio",
          "name": "MinimalFolio — Clean Portfolio Template",
          "slug": "minimalfolio-portfolio-template",
          "description": "A minimal, typography-led portfolio template for studios, photographers, and freelancers. Includes case study layouts and a simple blog.",
          "product_category": "website_templates",
          "product_subcategory": "portfolio",
          "price": 52,
          "currency": "usd",
          "rating": 4.8,
          "rating_count": 143,
          "creator_name": "Studio Kilo",
          "delivery_format": "digital",
          "free_shipping": true,
          "shipping_required": false,
          "shipping_price": 0,
          "available_colors": [],
          "color_enum_helper": "other",
          "includes_desktop_layouts": true,
          "includes_mobile_layouts": true,
          "is_bundle": false,
          "image_urls": [
            "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "created_at": "2022-08-05T14:20:00Z",
          "status": "active"
        }
      ],
      "promo_codes": [
        {
          "id": "welcome10",
          "code": "WELCOME10",
          "description": "10% off your first order on any digital or physical product.",
          "discount_type": "percentage",
          "discount_value": 10,
          "active": true,
          "valid_from": "2024-01-01T00:00:00Z",
          "valid_to": "2027-12-31T23:59:59Z",
          "applies_to_category": "any",
          "min_order_amount": 0
        },
        {
          "id": "freeship35",
          "code": "FREESHIP35",
          "description": "Free expedited shipping on merchandise orders over $35.",
          "discount_type": "fixed_amount",
          "discount_value": 0,
          "active": true,
          "valid_from": "2023-05-01T00:00:00Z",
          "valid_to": "2026-05-01T23:59:59Z",
          "applies_to_category": "merchandise",
          "min_order_amount": 35
        },
        {
          "id": "uikits20",
          "code": "UIKITS20",
          "description": "20% off select UI kit bundles.",
          "discount_type": "percentage",
          "discount_value": 20,
          "active": false,
          "valid_from": "2022-01-01T00:00:00Z",
          "valid_to": "2023-12-31T23:59:59Z",
          "applies_to_category": "ui_kits",
          "min_order_amount": 40
        }
      ],
      "service_packages": [
        {
          "id": "brand-starter",
          "name": "Brand Starter",
          "description": "A focused branding package for early-stage businesses that need a solid foundation without the extras.",
          "service_type": "branding",
          "price": 3200,
          "currency": "usd",
          "includes_logo_design": true,
          "includes_brand_guidelines": true,
          "features": [
            "Discovery workshop (2 hours)",
            "Primary logo and one alternate lockup",
            "Color palette and typography",
            "Basic brand guidelines (20–25 pages)",
            "Social media avatar and cover graphics"
          ],
          "is_active": true,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/4c6a7e20-27b6-5e4d-a8af-390e743dabc4.jpeg"
        },
        {
          "id": "brand-plus",
          "name": "Brand Plus",
          "description": "An in-depth branding package with more exploration, applications, and a robust brand book.",
          "service_type": "branding",
          "price": 4800,
          "currency": "usd",
          "includes_logo_design": true,
          "includes_brand_guidelines": true,
          "features": [
            "Extended discovery & positioning workshop",
            "3 initial visual directions",
            "Logo system with multiple lockups",
            "Comprehensive brand guidelines (50+ pages)",
            "Business card and basic stationery design",
            "Launch asset kit (social templates & email header)"
          ],
          "is_active": true,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/4c6a7e20-27b6-5e4d-a8af-390e743dabc4.jpeg"
        },
        {
          "id": "brand-elite",
          "name": "Brand Elite",
          "description": "A full-scale branding engagement including research, naming support, and extensive applications.",
          "service_type": "branding",
          "price": 7200,
          "currency": "usd",
          "includes_logo_design": true,
          "includes_brand_guidelines": true,
          "features": [
            "Research & stakeholder interviews",
            "Naming exploration support",
            "Complete logo and icon system",
            "Flagship brand guidelines (80+ pages)",
            "Marketing collateral suite",
            "Launch campaign creative direction",
            "On-call brand consulting for 2 months"
          ],
          "is_active": true,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/09ec6626-d3b7-5c6f-96cb-f16d2b1184c3.jpeg"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:12:09.049201"
      }
    };

    // Populate storage using correct storage keys
    localStorage.setItem('blog_posts', JSON.stringify(generatedData.blog_posts));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('service_packages', JSON.stringify(generatedData.service_packages));

    // Ensure empty collections exist for entities created during flows
    if (!localStorage.getItem('favorites')) {
      localStorage.setItem('favorites', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart')) {
      // Business logic may manage cart structure; leave initialization minimal
      localStorage.setItem('cart', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('checkout_sessions')) {
      localStorage.setItem('checkout_sessions', JSON.stringify([]));
    }
    if (!localStorage.getItem('project_requests')) {
      localStorage.setItem('project_requests', JSON.stringify([]));
    }
    if (!localStorage.getItem('project_plans')) {
      localStorage.setItem('project_plans', JSON.stringify([]));
    }
    if (!localStorage.getItem('newsletter_subscriptions')) {
      localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
    }
  }

  // Helper to reset state before each test so flows are independent
  resetState() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveNewestRestaurantBrandingCaseStudyToFavorites();
    this.testTask2_AddEcommerceAndPortfolioTemplatesToCartAndStartCheckout();
    this.testTask3_RequestBrandingPackageUnder5000WithLogoAndGuidelines();
    this.testTask4_FillCartWithThreeItemsAndAdjustQuantity();
    this.testTask5_ExploreUXPostsAndSubscribeToNewsletter();
    this.testTask6_CreateFavoritesListOfDigitalDesignResources();
    this.testTask7_PlanMultiCaseStudyAppProject();
    this.testTask8_ApplyCouponToCheapestDesktopMobileTemplate();

    return this.results;
  }

  /*
   * Task 1
   * Save the newest restaurant/food branding case study from 2022+ to favorites.
   * Adaptation: still uses restaurant / food_beverage industries and year >= 2022.
   */
  testTask1_SaveNewestRestaurantBrandingCaseStudyToFavorites() {
    const testName = 'Task 1: Save newest restaurant/food branding case study to favorites';

    try {
      this.resetState();

      // Simulate visiting portfolio & loading filter options
      const filters = this.logic.getPortfolioFilterOptions();
      this.assert(filters && Array.isArray(filters.years), 'Portfolio filter options should be available');

      // List case studies from 2022+ with branding service (industry filtered in test)
      const caseStudies = this.logic.listCaseStudies(null, 2022, 2026, 'branding', 'newest_first');
      this.assert(Array.isArray(caseStudies) && caseStudies.length > 0, 'Should return case studies from 2022+');

      const validIndustries = ['restaurant', 'food_beverage'];
      const filtered = caseStudies.filter(cs => validIndustries.includes(cs.industry) && cs.year >= 2022);
      this.assert(filtered.length > 0, 'Should find at least one restaurant/food branding case study from 2022+');

      // Select the single most recent (by published_at)
      let newest = null;
      filtered.forEach(cs => {
        if (!newest) {
          newest = cs;
          return;
        }
        if (new Date(cs.published_at) > new Date(newest.published_at)) {
          newest = cs;
        }
      });
      this.assert(newest !== null, 'Should determine newest case study');

      // View case study details
      const details = this.logic.getCaseStudyDetails(newest.id);
      this.assert(details && details.id === newest.id, 'Case study details should match selected ID');

      // Add to favorites
      const favResult = this.logic.addFavoriteItem('case_study', newest.id);
      this.assert(favResult && favResult.success === true, 'addFavoriteItem should succeed');
      this.assert(favResult.favorite_item && favResult.favorite_item.item_id === newest.id, 'FavoriteItem should reference selected case study');

      // Open favorites list and verify
      const favoritesList = this.logic.listFavoriteItems('case_study');
      this.assert(favoritesList && Array.isArray(favoritesList.items), 'Favorites list should return items array');
      this.assert(favoritesList.items.length === 1, 'Favorites should contain exactly one case study');

      const favItem = favoritesList.items[0];
      this.assert(favItem.case_study && favItem.case_study.id === newest.id, 'Favorited case study should match selected');
      this.assert(favItem.case_study.year >= 2022, 'Favorited case study should be from 2022 or later');

      // Verify underlying FavoriteItem record in storage
      const rawFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      this.assert(rawFavorites.length === 1, 'Raw favorites storage should contain one entry');
      this.assert(rawFavorites[0].item_type === 'case_study', 'FavoriteItem.item_type should be "case_study"');
      this.assert(rawFavorites[0].item_id === newest.id, 'FavoriteItem.item_id should match selected case study');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 2
   * Add one ecommerce and one portfolio website template under $60 with 4+ stars
   * to cart and start checkout.
   */
  testTask2_AddEcommerceAndPortfolioTemplatesToCartAndStartCheckout() {
    const testName = 'Task 2: Add ecommerce and portfolio templates to cart and start checkout';

    try {
      this.resetState();

      // Simulate navigating to shop and loading category overview & filters
      const shopOverview = this.logic.getShopCategoriesOverview();
      this.assert(shopOverview && Array.isArray(shopOverview.categories), 'Shop categories overview should be available');

      const templateFilters = this.logic.getShopFilterOptions('website_templates');
      this.assert(templateFilters && Array.isArray(templateFilters.subcategories), 'Website templates filter options should be available');

      // Find ecommerce templates under $60 with rating >= 4
      const ecommerceProducts = this.logic.listProducts(
        'website_templates', // category
        'ecommerce',         // subcategory
        null,                // min_price
        60,                  // max_price
        4,                   // min_rating
        null,                // free_shipping_only
        null,                // color
        null,                // includes_desktop_layouts
        null,                // includes_mobile_layouts
        null,                // is_bundle
        'rating_high_to_low' // sort
      );
      this.assert(Array.isArray(ecommerceProducts) && ecommerceProducts.length > 0, 'Should list ecommerce templates under $60 with rating >= 4');

      const selectedEcom = ecommerceProducts[0];
      this.assert(selectedEcom.price < 60, 'Selected ecommerce template should be priced under $60');
      this.assert(selectedEcom.rating >= 4, 'Selected ecommerce template should have rating >= 4');

      // Add ecommerce template to cart
      const addEcomResult = this.logic.addToCart(selectedEcom.id, 1, null);
      this.assert(addEcomResult && addEcomResult.success === true, 'Adding ecommerce template to cart should succeed');
      this.assert(addEcomResult.cart && addEcomResult.cart.cart_id, 'Cart ID should be returned after adding ecommerce template');

      const cartIdAfterEcom = addEcomResult.cart.cart_id;

      // Find portfolio templates under $60 with rating >= 4
      const portfolioProducts = this.logic.listProducts(
        'website_templates', // category
        'portfolio',         // subcategory
        null,                // min_price
        60,                  // max_price
        4,                   // min_rating
        null,                // free_shipping_only
        null,                // color
        null,                // includes_desktop_layouts
        null,                // includes_mobile_layouts
        null,                // is_bundle
        'rating_high_to_low' // sort
      );
      this.assert(Array.isArray(portfolioProducts) && portfolioProducts.length > 0, 'Should list portfolio templates under $60 with rating >= 4');

      const selectedPortfolio = portfolioProducts[0];
      this.assert(selectedPortfolio.price < 60, 'Selected portfolio template should be priced under $60');
      this.assert(selectedPortfolio.rating >= 4, 'Selected portfolio template should have rating >= 4');

      // Add portfolio template to cart
      const addPortfolioResult = this.logic.addToCart(selectedPortfolio.id, 1, null);
      this.assert(addPortfolioResult && addPortfolioResult.success === true, 'Adding portfolio template to cart should succeed');
      this.assert(addPortfolioResult.cart && addPortfolioResult.cart.cart_id === cartIdAfterEcom, 'Both adds should operate on the same cart');

      // Verify cart contents using getCart
      const cart = this.logic.getCart();
      this.assert(cart && cart.cart_id === cartIdAfterEcom, 'getCart should return the active cart');
      this.assert(Array.isArray(cart.items) && cart.items.length === 2, 'Cart should contain exactly 2 items');

      const productIdsInCart = cart.items.map(i => i.product_id);
      this.assert(productIdsInCart.includes(selectedEcom.id), 'Cart should contain ecommerce template');
      this.assert(productIdsInCart.includes(selectedPortfolio.id), 'Cart should contain portfolio template');

      // Verify each cart item meets price and rating constraints using actual product details
      cart.items.forEach(item => {
        const productDetails = this.logic.getProductDetails(item.product_id);
        this.assert(productDetails.price < 60, 'Cart item price should be under $60');
        this.assert(productDetails.rating >= 4, 'Cart item rating should be >= 4');
      });

      // Verify one ecommerce and one portfolio template
      const ecomInCart = cart.items.filter(ci => {
        const p = this.logic.getProductDetails(ci.product_id);
        return p.product_subcategory === 'ecommerce';
      });
      const portfolioInCart = cart.items.filter(ci => {
        const p = this.logic.getProductDetails(ci.product_id);
        return p.product_subcategory === 'portfolio';
      });
      this.assert(ecomInCart.length === 1, 'Cart should contain exactly one ecommerce template');
      this.assert(portfolioInCart.length === 1, 'Cart should contain exactly one portfolio template');

      // Proceed to checkout review page
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include cart');
      this.assert(checkoutSummary.cart.items.length === 2, 'Checkout cart should still contain 2 items');
      this.assert(checkoutSummary.cart.total > 0, 'Checkout total should be positive');

      // Submit basic checkout details without completing payment
      const submitResult = this.logic.submitCheckoutDetails(
        'Sample Customer',
        'customer@example.com',
        'standard_digital'
      );
      this.assert(submitResult && submitResult.success === true, 'Submitting checkout details should succeed');
      this.assert(submitResult.checkout_session_id, 'Checkout session ID should be returned');
      this.assert(submitResult.status === 'in_review', 'Checkout session status should be in_review');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 3
   * Request a branding package under $5000 that includes both logo design and brand guidelines.
   */
  testTask3_RequestBrandingPackageUnder5000WithLogoAndGuidelines() {
    const testName = 'Task 3: Request branding package under $5000 with logo design and brand guidelines';

    try {
      this.resetState();

      // List branding service packages
      const packages = this.logic.listServicePackages('branding', false);
      this.assert(Array.isArray(packages) && packages.length > 0, 'Should list branding service packages');

      // Filter to active packages including logo design and brand guidelines under $5000
      const qualifying = packages.filter(p =>
        p.is_active === true &&
        p.includes_logo_design === true &&
        p.includes_brand_guidelines === true &&
        p.price < 5000
      );
      this.assert(qualifying.length > 0, 'Should have at least one qualifying package under $5000 with logo and guidelines');

      // Choose the cheapest qualifying package
      let selected = null;
      qualifying.forEach(p => {
        if (!selected || p.price < selected.price) {
          selected = p;
        }
      });
      this.assert(selected !== null, 'Should select cheapest qualifying package');

      // Optionally verify via getServicePackageDetails
      const selectedDetails = this.logic.getServicePackageDetails(selected.id);
      this.assert(selectedDetails && selectedDetails.id === selected.id, 'Service package details should match selected');

      // Compose project description mentioning both "logo design" and "brand guidelines"
      const projectDescription =
        'We are looking for logo design and brand guidelines for a new venture. ' +
        'The project should include comprehensive logo design exploration and clear brand guidelines for our internal team.';

      // Budget between 3000 and 4900 but still under 5000
      const rawBudget = selected.price + 500;
      const budget = Math.min(Math.max(rawBudget, 3000), 4900);

      // Submit project request
      const requestResult = this.logic.submitProjectRequest(
        selected.id,
        projectDescription,
        budget,
        'four_six_weeks',
        'Jordan Lee',
        'jordan.lee@example.com'
      );

      this.assert(requestResult && requestResult.success === true, 'Project request submission should succeed');
      this.assert(requestResult.project_request_id, 'Project request ID should be returned');

      const requestId = requestResult.project_request_id;

      // Verify stored ProjectRequest and its relationship to selected package
      const storedRequests = JSON.parse(localStorage.getItem('project_requests') || '[]');
      const storedRequest = storedRequests.find(r => r.id === requestId);
      this.assert(storedRequest, 'Stored project request should be found by returned ID');
      this.assert(storedRequest.package_id === selected.id, 'ProjectRequest.package_id should match selected package ID');
      this.assert(storedRequest.budget === budget, 'Stored budget should match submitted budget');
      this.assert(
        typeof storedRequest.project_description === 'string' &&
          storedRequest.project_description.includes('logo design') &&
          storedRequest.project_description.includes('brand guidelines'),
        'Project description should mention logo design and brand guidelines'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 4
   * Fill the cart with 3 different items under an adapted price cap with free shipping,
   * including at least one item selected in blue color, then adjust quantity of cheapest.
   *
   * Adaptation: Use existing website templates as merchandise-like products under $60.
   */
  testTask4_FillCartWithThreeItemsAndAdjustQuantity() {
    const testName = 'Task 4: Fill cart with 3 items and adjust quantity of cheapest';

    try {
      this.resetState();

      // Load filter options for website templates (used as merchandise analog)
      const templateFilters = this.logic.getShopFilterOptions('website_templates');
      this.assert(templateFilters && templateFilters.price_range, 'Shop filter options for website_templates should exist');

      // List products under $60 with free shipping
      const products = this.logic.listProducts(
        'website_templates', // category
        null,                // subcategory (all)
        null,                // min_price
        60,                  // max_price (adapted from $35 to match data)
        null,                // min_rating
        true,                // free_shipping_only
        null,                // color
        null,                // includes_desktop_layouts
        null,                // includes_mobile_layouts
        null,                // is_bundle
        'price_low_to_high'  // sort
      );
      this.assert(Array.isArray(products) && products.length >= 3, 'Should have at least 3 products under adapted price cap with free shipping');

      const firstThree = products.slice(0, 3);

      // Add first product with selected color "blue"
      const first = firstThree[0];
      const addFirst = this.logic.addToCart(first.id, 1, 'blue');
      this.assert(addFirst && addFirst.success === true, 'Adding first product to cart should succeed');
      this.assert(addFirst.cart && addFirst.cart.cart_id, 'Cart ID should be present after first add');

      const cartId = addFirst.cart.cart_id;

      // Add second and third products with default color
      const second = firstThree[1];
      const third = firstThree[2];

      const addSecond = this.logic.addToCart(second.id, 1, null);
      this.assert(addSecond && addSecond.success === true, 'Adding second product to cart should succeed');
      this.assert(addSecond.cart.cart_id === cartId, 'Second add should target same cart');

      const addThird = this.logic.addToCart(third.id, 1, null);
      this.assert(addThird && addThird.success === true, 'Adding third product to cart should succeed');
      this.assert(addThird.cart.cart_id === cartId, 'Third add should target same cart');

      // Verify cart contents
      const cart = this.logic.getCart();
      this.assert(cart && cart.cart_id === cartId, 'getCart should return current cart');
      this.assert(Array.isArray(cart.items) && cart.items.length === 3, 'Cart should contain 3 distinct items');

      // Verify free shipping and price constraints using actual product data
      cart.items.forEach(ci => {
        const product = this.logic.getProductDetails(ci.product_id);
        this.assert(product.price < 60, 'Cart item price should be under $60');
        this.assert(product.free_shipping === true, 'Cart item should have free shipping');
      });

      // At least one item should have selected_color = 'blue'
      const hasBlue = cart.items.some(ci => ci.selected_color === 'blue');
      this.assert(hasBlue, 'At least one cart item should be selected in blue color');

      // Determine cheapest item by unit_price
      let cheapestItem = null;
      cart.items.forEach(ci => {
        if (!cheapestItem || ci.unit_price < cheapestItem.unit_price) {
          cheapestItem = ci;
        }
      });
      this.assert(cheapestItem !== null, 'Should identify cheapest cart item');

      // Update quantity of cheapest item to 2
      const updateResult = this.logic.updateCartItemQuantity(cheapestItem.cart_item_id, 2);
      this.assert(updateResult && updateResult.success === true, 'Updating cart item quantity should succeed');

      const updatedCart = updateResult.cart;
      this.assert(updatedCart && updatedCart.cart_id === cartId, 'Updated cart should have same ID');

      const updatedItems = updatedCart.items;
      const updatedCheapest = updatedItems.find(ci => ci.cart_item_id === cheapestItem.cart_item_id);
      this.assert(updatedCheapest && updatedCheapest.quantity === 2, 'Cheapest item quantity should be updated to 2');

      const itemsWithQty2 = updatedItems.filter(ci => ci.quantity === 2);
      this.assert(itemsWithQty2.length === 1, 'Exactly one cart item should have quantity 2');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 5
   * Explore two recent UX case studies (posts) from 2023+ and subscribe to
   * monthly design tips newsletter including both titles in notes.
   */
  testTask5_ExploreUXPostsAndSubscribeToNewsletter() {
    const testName = 'Task 5: Explore UX posts and subscribe to monthly design tips newsletter';

    try {
      this.resetState();

      // Load blog filter options
      const blogFilters = this.logic.getBlogFilterOptions();
      this.assert(blogFilters && Array.isArray(blogFilters.tags), 'Blog filter options should include tags');

      // List UX posts from 2023 onwards
      const uxPosts = this.logic.listBlogPosts('ux', 2023, 2026, 'newest_first');
      this.assert(Array.isArray(uxPosts) && uxPosts.length >= 2, 'Should have at least 2 UX posts from 2023+');

      const firstPost = uxPosts[0];
      const secondPost = uxPosts[1];

      // Open first post and capture title
      const firstDetails = this.logic.getBlogPostDetails(firstPost.id);
      this.assert(firstDetails && firstDetails.id === firstPost.id, 'First blog post details should match');
      const firstTitle = firstDetails.title;

      // Open second post and capture title
      const secondDetails = this.logic.getBlogPostDetails(secondPost.id);
      this.assert(secondDetails && secondDetails.id === secondPost.id, 'Second blog post details should match');
      const secondTitle = secondDetails.title;

      // Compose notes mentioning both titles
      const notes =
        'I am interested in design tips related to "' +
        firstTitle +
        '" and "' +
        secondTitle +
        '".';

      // Subscribe to newsletter: monthly, interest design_tips
      const subResult = this.logic.submitNewsletterSubscription(
        'Taylor Kim',
        'taylor.kim@example.com',
        ['design_tips'],
        'monthly',
        notes
      );

      this.assert(subResult && subResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subResult.subscription_id, 'Subscription ID should be returned');

      const subscriptionId = subResult.subscription_id;

      // Verify stored subscription
      const storedSubs = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
      const stored = storedSubs.find(s => s.id === subscriptionId);
      this.assert(stored, 'Stored newsletter subscription should be found by ID');
      this.assert(stored.name === 'Taylor Kim', 'Stored subscription name should match submitted');
      this.assert(stored.email === 'taylor.kim@example.com', 'Stored subscription email should match submitted');
      this.assert(stored.frequency === 'monthly', 'Subscription frequency should be monthly');

      if (Array.isArray(stored.interests)) {
        this.assert(
          stored.interests.includes('design_tips'),
          'Stored subscription interests should include design_tips'
        );
      }

      if (typeof stored.notes === 'string') {
        this.assert(
          stored.notes.includes(firstTitle) && stored.notes.includes(secondTitle),
          'Subscription notes should include both UX post titles'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 6
   * Create a favorites list of digital design resources.
   * Adaptation: Use 3 digital website templates under $60 with rating >= 4.5
   * from at least 3 different creators (we only have 3 products total).
   */
  testTask6_CreateFavoritesListOfDigitalDesignResources() {
    const testName = 'Task 6: Create favorites list of digital design resources';

    try {
      this.resetState();

      // Use website templates category as digital downloads analog
      const products = this.logic.listProducts(
        'website_templates', // category
        null,                // subcategory
        null,                // min_price
        60,                  // max_price (adapted from 25)
        4.5,                 // min_rating
        null,                // free_shipping_only
        null,                // color
        null,                // includes_desktop_layouts
        null,                // includes_mobile_layouts
        null,                // is_bundle
        'price_low_to_high'  // sort
      );

      this.assert(Array.isArray(products) && products.length >= 3, 'Should have at least 3 digital products under $60 with rating >= 4.5');

      // Filter to digital delivery_format just to be explicit
      const digital = products.filter(p => p.delivery_format === 'digital');
      this.assert(digital.length >= 3, 'At least 3 products should be digital');

      const selectedProducts = digital.slice(0, 3);

      // Add each selected product to favorites
      selectedProducts.forEach(p => {
        const favRes = this.logic.addFavoriteItem('product', p.id);
        this.assert(favRes && favRes.success === true, 'addFavoriteItem for product should succeed');
        this.assert(favRes.favorite_item.item_id === p.id, 'FavoriteItem should reference correct product');
      });

      // List product favorites
      const favorites = this.logic.listFavoriteItems('product');
      this.assert(favorites && Array.isArray(favorites.items), 'Favorites list for products should be available');
      this.assert(favorites.items.length === selectedProducts.length, 'Favorites should contain all selected products');

      // Verify constraints: price < 60, rating >= 4.5, at least 3 different creators
      const creatorSet = new Set();
      favorites.items.forEach(fi => {
        this.assert(fi.product && fi.product.id, 'Favorite product item should include product details');
        const pd = this.logic.getProductDetails(fi.product.id);
        this.assert(pd.price < 60, 'Favorited product price should be under $60');
        this.assert(pd.rating >= 4.5, 'Favorited product rating should be >= 4.5');
        creatorSet.add(pd.creator_name);
      });
      this.assert(creatorSet.size >= 3, 'Favorites should include products from at least 3 different creators');

      // Verify raw FavoriteItem entries in storage
      const rawFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const productFavorites = rawFavorites.filter(f => f.item_type === 'product');
      this.assert(productFavorites.length === selectedProducts.length, 'Raw favorites storage should have correct number of product favorites');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 7
   * Plan a multi-industry app project using three mobile app design case studies.
   * Adaptation: Use the three available case studies (regardless of industry) and
   * reference each in the project description.
   */
  testTask7_PlanMultiCaseStudyAppProject() {
    const testName = 'Task 7: Plan app project using three case studies insights';

    try {
      this.resetState();

      // List case studies from 2021-2024
      const caseStudies = this.logic.listCaseStudies(
        null,    // industry
        2021,    // year_from
        2024,    // year_to
        null,    // service_type
        'newest_first'
      );
      this.assert(Array.isArray(caseStudies) && caseStudies.length >= 3, 'Should list at least 3 case studies from 2021-2024');

      const selected = caseStudies.slice(0, 3);

      // Capture insights from each selected case study
      const titles = [];
      const sentences = [];
      selected.forEach(cs => {
        const details = this.logic.getCaseStudyDetails(cs.id);
        this.assert(details && details.id === cs.id, 'Case study details should match list entry');
        titles.push(details.title);
        const industryLabel = details.industry_label || details.industry || 'this industry';
        const sentence = 'From "' + details.title + '", we want to incorporate learnings from the ' + industryLabel + ' project.';
        sentences.push(sentence);
      });

      const projectDescription = sentences.join(' ');

      // Submit project plan
      const planResult = this.logic.submitProjectPlan(
        'Multi-Industry Learning & Finance App',
        projectDescription,
        '2025-09-01',
        '50_000_75_000',
        'Alex Rivera',
        'alex.rivera@example.com'
      );

      this.assert(planResult && planResult.success === true, 'Project plan submission should succeed');
      this.assert(planResult.project_plan_id, 'Project plan ID should be returned');

      const planId = planResult.project_plan_id;

      // Verify stored ProjectPlan
      const storedPlans = JSON.parse(localStorage.getItem('project_plans') || '[]');
      const stored = storedPlans.find(p => p.id === planId);
      this.assert(stored, 'Stored project plan should be found by ID');
      this.assert(stored.project_name === 'Multi-Industry Learning & Finance App', 'Project name should match submitted');
      this.assert(stored.target_launch_date === '2025-09-01', 'Target launch date should match submitted');
      this.assert(stored.budget_range === '50_000_75_000', 'Budget range should match submitted');

      // Ensure description references each selected case study title
      titles.forEach(t => {
        this.assert(
          typeof stored.description === 'string' && stored.description.includes(t),
          'Project description should reference case study title: ' + t
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  /*
   * Task 8
   * Apply a 10% coupon to the cheapest UI kit bundle with both desktop and mobile layouts.
   * Adaptation: Use website templates as UI kits; select cheapest template between $40 and $120
   * that includes both desktop and mobile layouts and has rating >= 4.
   */
  testTask8_ApplyCouponToCheapestDesktopMobileTemplate() {
    const testName = 'Task 8: Apply WELCOME10 to cheapest desktop+mobile template';

    try {
      this.resetState();

      // Treat website templates as UI kit bundles for this test
      const products = this.logic.listProducts(
        'website_templates', // category
        null,                // subcategory
        40,                  // min_price
        120,                 // max_price
        4,                   // min_rating
        null,                // free_shipping_only
        null,                // color
        true,                // includes_desktop_layouts
        true,                // includes_mobile_layouts
        null,                // is_bundle
        'price_low_to_high'  // sort
      );

      this.assert(Array.isArray(products) && products.length > 0, 'Should list templates between $40 and $120 with both desktop and mobile layouts');

      const selected = products[0]; // cheapest due to price_low_to_high
      this.assert(selected.includes_desktop_layouts === true, 'Selected product should include desktop layouts');
      this.assert(selected.includes_mobile_layouts === true, 'Selected product should include mobile layouts');

      // Add selected product to cart
      const addResult = this.logic.addToCart(selected.id, 1, null);
      this.assert(addResult && addResult.success === true, 'Adding selected product to cart should succeed');
      this.assert(addResult.cart && addResult.cart.cart_id, 'Cart ID should be returned');

      // Apply promo code WELCOME10
      const promoResult = this.logic.applyPromoCode('WELCOME10');
      this.assert(promoResult && promoResult.success === true, 'Applying WELCOME10 should succeed');
      this.assert(promoResult.applied_promo && promoResult.applied_promo.code === 'WELCOME10', 'Applied promo code should be WELCOME10');

      const promoCart = promoResult.cart;
      this.assert(promoCart && promoCart.applied_promo_code && promoCart.applied_promo_code.code === 'WELCOME10', 'Cart should record applied promo code WELCOME10');

      // Validate discount math using actual discount_value
      const discountValue = promoResult.applied_promo.discount_value;
      const expectedDiscount = promoCart.subtotal * (discountValue / 100);
      const actualDiscount = promoCart.discount_total;
      const diff = Math.abs(expectedDiscount - actualDiscount);
      this.assert(diff < 0.01, 'Discount total should match expected percentage within tolerance');

      const expectedTotal = promoCart.subtotal - actualDiscount;
      const totalDiff = Math.abs(expectedTotal - promoCart.total);
      this.assert(totalDiff < 0.01, 'Cart total should equal subtotal minus discount within tolerance');

      // Cross-check underlying PromoCode in storage
      const promoCodes = JSON.parse(localStorage.getItem('promo_codes') || '[]');
      const welcome = promoCodes.find(pc => pc.code === 'WELCOME10');
      this.assert(welcome && welcome.active === true, 'WELCOME10 promo code should be active in storage');

      // Proceed to checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include cart');
      this.assert(checkoutSummary.cart.total === promoCart.total, 'Checkout cart total should match cart after promo application');

      // Submit checkout details
      const submitResult = this.logic.submitCheckoutDetails(
        'Morgan Chan',
        'morgan.chan@example.com',
        'standard_digital'
      );
      this.assert(submitResult && submitResult.success === true, 'Submitting checkout details after promo should succeed');
      this.assert(submitResult.checkout_session_id, 'Checkout session ID should be returned');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion helper
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
