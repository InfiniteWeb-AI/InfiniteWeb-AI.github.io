class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and seed test data once at construction
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
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
      categories: [
        {
          id: 'kitchen_cutting_boards',
          name: 'Kitchen & Cutting Boards',
          description: 'Engraved cutting boards, cheese boards, and kitchen prep accessories in bamboo, walnut, maple, and more.',
          is_primary_nav: true,
          sort_order: 1
        },
        {
          id: 'drinkware_tumblers',
          name: 'Drinkware & Tumblers',
          description: 'Custom laser-engraved tumblers, mugs, and drinkware for gifts, teams, and events.',
          is_primary_nav: true,
          sort_order: 2
        },
        {
          id: 'weddings',
          name: 'Weddings',
          description: 'Wedding welcome signs, gifts, and decor including rustic plaques and cake toppers.',
          is_primary_nav: true,
          sort_order: 3
        }
      ],
      store_locations: [
        {
          id: 'store_sf_market_st',
          name: 'San Francisco Market Street',
          address_line1: '865 Market St',
          address_line2: 'Suite 220',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          phone: '+1-415-555-0142',
          timezone: 'America/Los_Angeles',
          supports_store_pickup: true,
          supports_same_day_pickup: true,
          is_default: true
        },
        {
          id: 'store_sf_mission',
          name: 'San Francisco Mission District',
          address_line1: '2300 Mission St',
          address_line2: '',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94110',
          phone: '+1-415-555-0178',
          timezone: 'America/Los_Angeles',
          supports_store_pickup: true,
          supports_same_day_pickup: false,
          is_default: false
        },
        {
          id: 'store_oakland_downtown',
          name: 'Oakland Downtown',
          address_line1: '499 14th St',
          address_line2: 'Suite 150',
          city: 'Oakland',
          state: 'CA',
          postal_code: '94612',
          phone: '+1-510-555-0113',
          timezone: 'America/Los_Angeles',
          supports_store_pickup: true,
          supports_same_day_pickup: true,
          is_default: false
        }
      ],
      products: [
        {
          id: 'prod_bamboo_cutting_board_medium_family',
          name: 'Medium Bamboo Family Cutting Board',
          slug: 'medium-bamboo-family-cutting-board',
          category_id: 'kitchen_cutting_boards',
          product_type: 'cutting_board',
          material: 'bamboo',
          size_label: 'Medium (12 x 16 in)',
          width_in: 16,
          height_in: 12,
          depth_in: 0.75,
          description: 'A medium 12 x 16 in bamboo cutting board with customizable family name engraving, ideal for everyday kitchen use and gifting.',
          image_url: 'https://i.etsystatic.com/18112254/r/il/a4b0b8/2835412773/il_1140xN.2835412773_rtx7.jpg',
          base_price: 39.95,
          min_price: 39.95,
          max_price: 54.95,
          rating_average: 4.7,
          rating_count: 128,
          popularity_score: 82,
          style_theme: 'classic',
          color_options: [],
          wood_finish_options: ['natural'],
          engraving_style_options: ['minimal', 'script_2'],
          font_options: ['script_2', 'block_sans'],
          has_engraving_text: true,
          has_event_date_field: false,
          has_multiple_name_fields: false,
          supports_gift_wrap: true,
          has_free_gift_wrap: false,
          free_gift_wrap_label: '',
          is_bulk_order_available: false,
          is_store_pickup_eligible: true,
          is_same_day_pickup_eligible: false,
          occasions: ['wedding', 'anniversary', 'housewarming'],
          created_at: '2025-03-10T09:15:00Z',
          updated_at: '2025-11-01T11:30:00Z',
          shipping_option_ids: [
            'ship_cutting_board_family_standard',
            'ship_cutting_board_family_express'
          ]
        },
        {
          id: 'prod_bamboo_cutting_board_medium_gourmet',
          name: 'Personalized Bamboo Kitchen Board 12 x 16',
          slug: 'personalized-bamboo-kitchen-board-12x16',
          category_id: 'kitchen_cutting_boards',
          product_type: 'cutting_board',
          material: 'bamboo',
          size_label: 'Medium (12 x 16 in)',
          width_in: 16,
          height_in: 12,
          depth_in: 0.75,
          description: 'Medium bamboo prep board with laser-engraved personalization, juice groove, and hanging hole.',
          image_url: 'https://cdn.shopify.com/s/files/1/0065/1804/6784/products/cuttingboardwithgroove_530x@2x.jpg?v=1609525164',
          base_price: 49.95,
          min_price: 49.95,
          max_price: 64.95,
          rating_average: 4.5,
          rating_count: 76,
          popularity_score: 78,
          style_theme: 'modern',
          color_options: [],
          wood_finish_options: ['natural'],
          engraving_style_options: ['minimal', 'script_2', 'modern'],
          font_options: ['script_2', 'modern_sans'],
          has_engraving_text: true,
          has_event_date_field: false,
          has_multiple_name_fields: false,
          supports_gift_wrap: true,
          has_free_gift_wrap: false,
          free_gift_wrap_label: '',
          is_bulk_order_available: true,
          is_store_pickup_eligible: false,
          is_same_day_pickup_eligible: false,
          occasions: ['wedding', 'anniversary', 'housewarming'],
          created_at: '2025-02-18T14:00:00Z',
          updated_at: '2025-10-12T10:20:00Z',
          shipping_option_ids: []
        },
        {
          id: 'prod_walnut_cutting_board_large',
          name: 'Large Walnut Carving Board 18 x 24',
          slug: 'large-walnut-carving-board-18x24',
          category_id: 'kitchen_cutting_boards',
          product_type: 'cutting_board',
          material: 'walnut',
          size_label: 'Large (18 x 24 in)',
          width_in: 24,
          height_in: 18,
          depth_in: 1,
          description: 'Premium large walnut carving board with deep juice groove and custom monogram engraving.',
          image_url: 'https://images-na.ssl-images-amazon.com/images/I/61mMn5og5dL.jpg',
          base_price: 119.0,
          min_price: 119.0,
          max_price: 149.0,
          rating_average: 4.9,
          rating_count: 54,
          popularity_score: 88,
          style_theme: 'classic',
          color_options: [],
          wood_finish_options: ['dark_walnut'],
          engraving_style_options: ['minimal', 'classic'],
          font_options: ['serif_classic', 'block_sans'],
          has_engraving_text: true,
          has_event_date_field: false,
          has_multiple_name_fields: false,
          supports_gift_wrap: true,
          has_free_gift_wrap: false,
          free_gift_wrap_label: '',
          is_bulk_order_available: false,
          is_store_pickup_eligible: true,
          is_same_day_pickup_eligible: false,
          occasions: ['wedding', 'housewarming'],
          created_at: '2024-11-05T16:30:00Z',
          updated_at: '2025-09-20T09:45:00Z',
          shipping_option_ids: []
        }
      ],
      shipping_options: [
        {
          id: 'ship_cutting_board_family_standard',
          product_id: 'prod_bamboo_cutting_board_medium_family',
          name: 'Standard Ground Shipping',
          carrier: 'UPS',
          price: 8.95,
          delivery_min_business_days: 5,
          delivery_max_business_days: 8,
          is_default: true,
          is_pickup_option: false,
          description: 'Standard insured ground shipping for cutting boards within the continental U.S.'
        },
        {
          id: 'ship_cutting_board_family_express',
          product_id: 'prod_bamboo_cutting_board_medium_family',
          name: 'Express 2–3 Day Shipping',
          carrier: 'FedEx',
          price: 19.95,
          delivery_min_business_days: 2,
          delivery_max_business_days: 3,
          is_default: false,
          is_pickup_option: false,
          description: 'Faster delivery with priority handling for rush gifts and events.'
        },
        {
          id: 'ship_tumbler_basic_economy',
          product_id: 'prod_tumbler_team_20oz_basic',
          name: 'Economy Shipping',
          carrier: 'UPS Mail Innovations',
          price: 5.95,
          delivery_min_business_days: 8,
          delivery_max_business_days: 12,
          is_default: true,
          is_pickup_option: false,
          description: 'Most economical option with consolidated ground delivery.'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:06.974106'
      }
    };

    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('categories', JSON.stringify(generatedData.categories || []));
      localStorage.setItem('store_locations', JSON.stringify(generatedData.store_locations || []));
      localStorage.setItem('products', JSON.stringify(generatedData.products || []));
      localStorage.setItem('shipping_options', JSON.stringify(generatedData.shipping_options || []));
      // Other entity collections (carts, wishlists, etc.) are initialized by _initStorage
    }
  }

  resetEnvironment() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_OrderCheapestMediumBambooCuttingBoard();
    this.testTask2_ConfigureTumblersCheapestShippingUnder10Days();
    this.testTask3_ChooseHigherRatedWalnutOrMaplePhoneStand();
    this.testTask4_RequestBulkQuoteFor50Items();
    this.testTask5_SaveRusticWeddingWelcomeSignToWishlist();
    this.testTask6_FindAnniversaryGiftUnder40WithFreeWrap();
    this.testTask7_Order3EngravedPensForSameDayPickup();
    this.testTask8_ScheduleVideoCallConsultation();

    return this.results;
  }

  // Task 1
  testTask1_OrderCheapestMediumBambooCuttingBoard() {
    const testName = 'Task 1: Order cheapest medium bamboo cutting board under $60 with family name engraving';
    this.resetEnvironment();

    try {
      // Homepage -> primary nav
      const navCategories = this.logic.getPrimaryNavCategories();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Primary nav categories should be returned');

      const kitchenCategory = navCategories.find(c => (c.name || '').toLowerCase().indexOf('kitchen') !== -1);
      this.assert( kitchenCategory, 'Kitchen & Cutting Boards category should exist in primary nav');

      const kitchenCategoryId = kitchenCategory.id;

      // Category page filters: material bamboo, size medium 12x16, max price 60, sort price_low_to_high
      const filters = {
        material: 'bamboo',
        size_label: 'Medium (12 x 16 in)',
        max_price: 60
      };

      const categoryResult = this.logic.getCategoryProducts(
        kitchenCategoryId,
        filters,
        'price_low_to_high',
        1,
        20
      );

      this.assert(categoryResult && Array.isArray(categoryResult.products), 'Category products result should include products array');
      this.assert(categoryResult.products.length > 0, 'There should be at least one bamboo medium cutting board under $60');

      const listingProduct = categoryResult.products[0];
      const effectivePrice = typeof listingProduct.min_price === 'number' ? listingProduct.min_price : listingProduct.base_price;
      this.assert(effectivePrice <= 60, 'Selected cutting board price should be <= $60');

      // Product detail
      const productDetailsResult = this.logic.getProductDetails(listingProduct.product_id);
      const product = productDetailsResult && productDetailsResult.product;
      this.assert(product && product.id === listingProduct.product_id, 'Product details should match listing product id');
      this.assert(product.category_id === kitchenCategoryId, 'Product category should be kitchen/cutting boards');
      this.assert(product.has_engraving_text === true, 'Product should support engraving text');

      // Choose Script 2 style/font if available
      let engravingStyleSelection;
      let engravingFontSelection;
      if (Array.isArray(product.engraving_style_options) && product.engraving_style_options.indexOf('script_2') !== -1) {
        engravingStyleSelection = 'script_2';
      }
      if (!engravingStyleSelection && Array.isArray(product.font_options) && product.font_options.indexOf('script_2') !== -1) {
        engravingFontSelection = 'script_2';
      }

      const configuration = {
        engraving_text: 'The Johnson Family'
      };
      if (engravingStyleSelection) {
        configuration.engraving_style_selection = engravingStyleSelection;
      }
      if (engravingFontSelection) {
        configuration.engraving_font_selection = engravingFontSelection;
      }

      // Add to cart with quantity 1, shipping fulfillment, default shipping option
      const addResult = this.logic.addConfiguredProductToCart(
        product.id,
        1,
        'shipping',
        undefined,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Should successfully add cutting board to cart');
      this.assert(addResult.added_item_id, 'addConfiguredProductToCart should return added_item_id');

      // Validate cart contents
      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');

      const addedItem = cart.items.find(i => i.cart_item_id === addResult.added_item_id);
      this.assert(addedItem, 'Cart should contain the added cutting board item');
      this.assert(addedItem.product_id === product.id, 'Cart item product id should match product');
      this.assert(addedItem.quantity === 1, 'Cart item quantity should be 1');
      const cfg = addedItem.configuration || {};
      this.assert(cfg.engraving_text === 'The Johnson Family', 'Engraving text in cart should match input');
      if (engravingStyleSelection) {
        this.assert(cfg.engraving_style_selection === engravingStyleSelection, 'Engraving style selection should be preserved');
      }
      if (engravingFontSelection) {
        this.assert(cfg.engraving_font_selection === engravingFontSelection, 'Engraving font selection should be preserved');
      }
      this.assert(addedItem.unit_price <= 60, 'Cart item unit price should be <= $60');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_ConfigureTumblersCheapestShippingUnder10Days() {
    const testName = 'Task 2: Configure 4 stainless steel tumblers with cheapest shipping under 10 business days';
    this.resetEnvironment();

    try {
      // Homepage -> primary nav -> Drinkware & Tumblers
      const navCategories = this.logic.getPrimaryNavCategories();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Primary nav categories should be returned');

      const drinkwareCategory = navCategories.find(c => (c.name || '').toLowerCase().indexOf('drinkware') !== -1 || (c.name || '').toLowerCase().indexOf('tumblers') !== -1);
      this.assert(drinkwareCategory, 'Drinkware & Tumblers category should exist');

      const drinkwareCategoryId = drinkwareCategory.id;

      // Filter: stainless steel, 20 oz, price <= 35, rating >= 4
      const filters = {
        material: 'stainless_steel',
        capacity_oz: 20,
        max_price: 35,
        min_rating: 4.0
      };

      const categoryResult = this.logic.getCategoryProducts(
        drinkwareCategoryId,
        filters,
        'price_low_to_high',
        1,
        20
      );

      this.assert(categoryResult && Array.isArray(categoryResult.products), 'Category products result should include products array');
      this.assert(categoryResult.products.length > 0, 'There should be at least one stainless steel 20 oz tumbler under $35 with rating >= 4');

      const listingProduct = categoryResult.products[0];
      const effectivePrice = typeof listingProduct.min_price === 'number' ? listingProduct.min_price : listingProduct.base_price;
      this.assert(effectivePrice <= 35, 'Selected tumbler price should be <= $35');
      this.assert(listingProduct.rating_average === undefined || listingProduct.rating_average >= 4.0, 'Listing rating should be >= 4 if present');

      // Product detail
      const productDetailsResult = this.logic.getProductDetails(listingProduct.product_id);
      const product = productDetailsResult && productDetailsResult.product;
      this.assert(product && product.id === listingProduct.product_id, 'Product details should match listing product id');

      // Choose color 'black' if available otherwise first color or undefined
      let colorSelection;
      if (Array.isArray(product.color_options) && product.color_options.length > 0) {
        if (product.color_options.indexOf('black') !== -1) {
          colorSelection = 'black';
        } else {
          colorSelection = product.color_options[0];
        }
      }

      // Get shipping options and select cheapest shipping (non-pickup) delivering within 10 business days
      const shippingOptions = this.logic.getProductShippingOptions(product.id) || [];
      this.assert(Array.isArray(shippingOptions) && shippingOptions.length > 0, 'Tumbler should have shipping options');

      const eligibleShipping = shippingOptions.filter(opt => !opt.is_pickup_option && typeof opt.delivery_max_business_days === 'number' && opt.delivery_max_business_days <= 10);
      this.assert(eligibleShipping.length > 0, 'There should be at least one shipping option delivering within 10 business days');

      let selectedShipping = eligibleShipping[0];
      eligibleShipping.forEach(opt => {
        if (opt.price < selectedShipping.price) {
          selectedShipping = opt;
        }
      });

      const configuration = {
        engraving_text: 'Team Phoenix   2026'
      };
      if (colorSelection) {
        configuration.color_selection = colorSelection;
      }

      const addResult = this.logic.addConfiguredProductToCart(
        product.id,
        4,
        'shipping',
        selectedShipping.id,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Should successfully add tumblers to cart');
      this.assert(addResult.added_item_id, 'addConfiguredProductToCart should return added_item_id');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');

      const addedItem = cart.items.find(i => i.cart_item_id === addResult.added_item_id);
      this.assert(addedItem, 'Cart should contain the added tumbler item');
      this.assert(addedItem.product_id === product.id, 'Cart item product id should match product');
      this.assert(addedItem.quantity === 4, 'Cart item quantity should be 4');

      const cfg = addedItem.configuration || {};
      this.assert(cfg.engraving_text === 'Team Phoenix   2026', 'Engraving text in cart should match input');
      if (colorSelection) {
        this.assert(cfg.color_selection === colorSelection, 'Color selection should be preserved');
      }

      const ship = addedItem.shipping_option || {};
      this.assert(ship.id === selectedShipping.id, 'Selected shipping option should be preserved on cart item');
      this.assert(typeof ship.price === 'number', 'Shipping option should include price');
      if (selectedShipping.delivery_max_business_days !== undefined) {
        this.assert(selectedShipping.delivery_max_business_days <= 10, 'Selected shipping option should deliver within 10 business days based on API data');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_ChooseHigherRatedWalnutOrMaplePhoneStand() {
    const testName = 'Task 3: Choose higher-rated engraved phone stand in walnut or maple under $40 and add to cart';
    this.resetEnvironment();

    try {
      const query = 'engraved phone stand';

      // Search walnut phone stands under $40
      const walnutResults = this.logic.searchProducts(
        query,
        { material: 'walnut', max_price: 40 },
        'price_low_to_high',
        1,
        20
      );

      // Search maple phone stands under $40
      const mapleResults = this.logic.searchProducts(
        query,
        { material: 'maple', max_price: 40 },
        'price_low_to_high',
        1,
        20
      );

      this.assert(walnutResults && Array.isArray(walnutResults.products) && walnutResults.products.length > 0, 'Should have at least one walnut phone stand under $40');
      this.assert(mapleResults && Array.isArray(mapleResults.products) && mapleResults.products.length > 0, 'Should have at least one maple phone stand under $40');

      const walnutListing = walnutResults.products[0];
      const mapleListing = mapleResults.products[0];

      // Compare ratings via product details
      const walnutDetails = this.logic.getProductDetails(walnutListing.product_id);
      const walnutProduct = walnutDetails && walnutDetails.product;
      this.assert(walnutProduct && walnutProduct.id === walnutListing.product_id, 'Walnut product details should match listing id');

      const mapleDetails = this.logic.getProductDetails(mapleListing.product_id);
      const mapleProduct = mapleDetails && mapleDetails.product;
      this.assert(mapleProduct && mapleProduct.id === mapleListing.product_id, 'Maple product details should match listing id');

      const walnutRating = typeof walnutProduct.rating_average === 'number' ? walnutProduct.rating_average : 0;
      const mapleRating = typeof mapleProduct.rating_average === 'number' ? mapleProduct.rating_average : 0;

      const chosenProduct = walnutRating >= mapleRating ? walnutProduct : mapleProduct;

      // Choose engraving style 'minimal' if available
      const configuration = {
        engraving_text: 'Desk Buddy'
      };
      if (Array.isArray(chosenProduct.engraving_style_options) && chosenProduct.engraving_style_options.indexOf('minimal') !== -1) {
        configuration.engraving_style_selection = 'minimal';
      }

      const addResult = this.logic.addConfiguredProductToCart(
        chosenProduct.id,
        1,
        'shipping',
        undefined,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Should successfully add chosen phone stand to cart');
      this.assert(addResult.added_item_id, 'addConfiguredProductToCart should return added_item_id');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');
      const addedItem = cart.items.find(i => i.cart_item_id === addResult.added_item_id);
      this.assert(addedItem, 'Cart should contain the added phone stand item');
      this.assert(addedItem.product_id === chosenProduct.id, 'Cart item product id should match chosen product');
      this.assert(addedItem.quantity === 1, 'Cart item quantity should be 1');

      const cfg = addedItem.configuration || {};
      this.assert(cfg.engraving_text === 'Desk Buddy', 'Engraving text in cart should match input');
      if (configuration.engraving_style_selection) {
        this.assert(cfg.engraving_style_selection === 'minimal', 'Engraving style selection should be minimal');
      }

      const unitPrice = addedItem.unit_price;
      this.assert(unitPrice <= 40, 'Cart item unit price should be <= $40');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_RequestBulkQuoteFor50Items() {
    const testName = 'Task 4: Request bulk quote for 50 items with $300 budget and 30-day timeline';
    this.resetEnvironment();

    try {
      // Corporate & Bulk Orders -> categories
      const bulkCategories = this.logic.getBulkOrderCategories();
      this.assert(Array.isArray(bulkCategories) && bulkCategories.length > 0, 'Bulk order categories should be returned');

      // Prefer a category that has bulk products
      const bulkCategory = bulkCategories.find(c => c.has_bulk_products) || bulkCategories[0];
      this.assert(bulkCategory, 'Should select a bulk-orderable category');
      const bulkCategoryId = bulkCategory.category_id;

      const bulkProductsResult = this.logic.getBulkOrderProducts(bulkCategoryId);
      this.assert(bulkProductsResult && Array.isArray(bulkProductsResult.products), 'Bulk products result should include products array');
      this.assert(bulkProductsResult.products.length > 0, 'There should be at least one bulk-orderable product in chosen category');

      // Prefer a product flagged as bulk-order-available
      let selectedListing = bulkProductsResult.products.find(p => p.is_bulk_order_available);
      if (!selectedListing) {
        selectedListing = bulkProductsResult.products[0];
      }
      this.assert(selectedListing, 'Should select a product for bulk quote request');

      const productDetails = this.logic.getProductDetails(selectedListing.product_id);
      const product = productDetails && productDetails.product;
      this.assert(product && product.id === selectedListing.product_id, 'Product details should match selected bulk product');

      const quantityRequested = 50;

      // Get bulk quote context for UI
      const context = this.logic.getBulkQuoteRequestContext(product.id, quantityRequested);
      this.assert(context && context.product_summary && context.product_summary.product_id === product.id, 'Bulk quote context should reference selected product');
      this.assert(context.default_quantity === undefined || context.default_quantity === quantityRequested, 'Default quantity should match requested or be unspecified');

      const projectDetailsText = '50 aluminum keychains engraved with BRIGHTLINE on both sides for client gifts';

      const submitResult = this.logic.submitBulkQuoteRequest(
        product.id,
        quantityRequested,
        'Brightline Studios',
        300,
        'need_in_30_days',
        projectDetailsText,
        undefined,
        undefined
      );

      this.assert(submitResult && submitResult.success === true, 'Bulk quote request should be submitted successfully');
      this.assert(submitResult.quote_request_id, 'Quote request id should be returned');
      this.assert(typeof submitResult.status === 'string' && submitResult.status.length > 0, 'Quote request status should be a non-empty string');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_SaveRusticWeddingWelcomeSignToWishlist() {
    const testName = 'Task 5: Save customized rustic wedding welcome sign (12 x 18 in) to wishlist';
    this.resetEnvironment();

    try {
      // Homepage -> Occasions -> Weddings
      const navCategories = this.logic.getPrimaryNavCategories();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Primary nav categories should be returned');

      const weddingsCategory = navCategories.find(c => (c.name || '').toLowerCase().indexOf('wedding') !== -1);
      this.assert(weddingsCategory, 'Weddings category should exist');
      const weddingsCategoryId = weddingsCategory.id;

      // Filter weddings: product_type welcome_sign_plaque, size 12 x 18 in, style rustic
      const filters = {
        product_type: 'welcome_sign_plaque',
        size_label: '12 x 18 in',
        style_theme: 'rustic'
      };

      const categoryResult = this.logic.getCategoryProducts(
        weddingsCategoryId,
        filters,
        'most_popular',
        1,
        20
      );

      this.assert(categoryResult && Array.isArray(categoryResult.products), 'Wedding category products should include products array');
      this.assert(categoryResult.products.length > 0, 'There should be at least one rustic 12 x 18 in welcome sign');

      // Choose second product if available, otherwise first
      const index = categoryResult.products.length > 1 ? 1 : 0;
      const listingProduct = categoryResult.products[index];

      const productDetails = this.logic.getProductDetails(listingProduct.product_id);
      const product = productDetails && productDetails.product;
      this.assert(product && product.id === listingProduct.product_id, 'Product details should match selected wedding sign');

      const configuration = {
        engraving_text: 'Welcome to the wedding of Emma & Noah',
        event_date_text: 'June 14, 2026'
      };

      // If product tracks event_date as ISO datetime, provide it as well
      if (product.has_event_date_field) {
        configuration.event_date = '2026-06-14T00:00:00Z';
      }

      // Choose Dark Walnut finish if available
      if (Array.isArray(product.wood_finish_options) && product.wood_finish_options.length > 0) {
        if (product.wood_finish_options.indexOf('dark_walnut') !== -1) {
          configuration.wood_finish_selection = 'dark_walnut';
        } else {
          configuration.wood_finish_selection = product.wood_finish_options[0];
        }
      }

      const addResult = this.logic.addConfiguredProductToWishlist(
        product.id,
        1,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Welcome sign should be saved to wishlist successfully');
      this.assert(addResult.added_item_id, 'Wishlist add should return added_item_id');

      const wishlist = this.logic.getWishlist();
      this.assert(wishlist && Array.isArray(wishlist.items), 'getWishlist should return items array');

      const savedItem = wishlist.items.find(i => i.wishlist_item_id === addResult.added_item_id);
      this.assert(savedItem, 'Wishlist should contain the saved welcome sign item');
      this.assert(savedItem.product_id === product.id, 'Wishlist item product id should match sign');
      const cfg = savedItem.configuration || {};
      this.assert(cfg.engraving_text === 'Welcome to the wedding of Emma & Noah', 'Wishlist engraving text should match input');
      this.assert(cfg.event_date_text === 'June 14, 2026', 'Wishlist event date text should match input');
      if (configuration.wood_finish_selection) {
        this.assert(cfg.wood_finish_selection === configuration.wood_finish_selection, 'Wishlist wood finish selection should be preserved');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_FindAnniversaryGiftUnder40WithFreeWrap() {
    const testName = 'Task 6: Find anniversary gift under $40 with 4+ stars and free gift wrapping, then add to cart';
    this.resetEnvironment();

    try {
      // Gift Finder -> occasions
      const occasions = this.logic.getGiftOccasionOptions();
      this.assert(Array.isArray(occasions) && occasions.length > 0, 'Gift occasions should be returned');

      const anniversaryOccasion = occasions.find(o => (o.value || '').toLowerCase() === 'anniversary' || (o.label || '').toLowerCase().indexOf('annivers') !== -1);
      this.assert(anniversaryOccasion, 'Anniversary occasion should exist in gift finder');

      const filters = {
        max_price: 40,
        min_rating: 4.0,
        require_free_gift_wrap: true
      };

      const giftsResult = this.logic.searchGifts(
        anniversaryOccasion.value || 'anniversary',
        filters,
        'customer_rating_high_to_low',
        1,
        20
      );

      this.assert(giftsResult && Array.isArray(giftsResult.products), 'searchGifts should return products array');
      this.assert(giftsResult.products.length > 0, 'There should be at least one anniversary gift under $40 with free gift wrap');

      const listingProduct = giftsResult.products[0];
      const effectivePrice = typeof listingProduct.min_price === 'number' ? listingProduct.min_price : listingProduct.base_price;
      this.assert(effectivePrice <= 40, 'Selected gift price should be <= $40');
      this.assert(listingProduct.rating_average === undefined || listingProduct.rating_average >= 4.0, 'Listing rating should be >= 4 if present');
      this.assert(listingProduct.has_free_gift_wrap === true, 'Listing should indicate free gift wrap');

      const productDetails = this.logic.getProductDetails(listingProduct.product_id);
      const product = productDetails && productDetails.product;
      this.assert(product && product.id === listingProduct.product_id, 'Gift product details should match listing id');
      this.assert(product.supports_gift_wrap === true, 'Gift product should support gift wrap');
      this.assert(product.has_free_gift_wrap === true, 'Gift product should have free gift wrap');

      const configuration = {
        engraving_text: 'To many more adventures together',
        gift_wrap_selection: 'free_gift_wrap'
      };

      // Choose a default variant if needed
      if (Array.isArray(product.color_options) && product.color_options.length > 0) {
        configuration.color_selection = product.color_options[0];
      }
      if (Array.isArray(product.wood_finish_options) && product.wood_finish_options.length > 0) {
        configuration.wood_finish_selection = product.wood_finish_options[0];
      }

      const addResult = this.logic.addConfiguredProductToCart(
        product.id,
        1,
        'shipping',
        undefined,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Anniversary gift should be added to cart successfully');
      this.assert(addResult.added_item_id, 'addConfiguredProductToCart should return added_item_id');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');

      const addedItem = cart.items.find(i => i.cart_item_id === addResult.added_item_id);
      this.assert(addedItem, 'Cart should contain the added anniversary gift item');
      this.assert(addedItem.product_id === product.id, 'Cart item product id should match gift');
      this.assert(addedItem.quantity === 1, 'Cart item quantity should be 1');

      const cfg = addedItem.configuration || {};
      this.assert(cfg.engraving_text === 'To many more adventures together', 'Engraving text in cart should match input');
      this.assert(cfg.gift_wrap_selection === 'free_gift_wrap', 'Gift wrap selection should be free_gift_wrap');
      this.assert(addedItem.unit_price <= 40, 'Cart item unit price should be <= $40');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_Order3EngravedPensForSameDayPickup() {
    const testName = 'Task 7: Order 3 engraved pens for same-day store pickup with different names';
    this.resetEnvironment();

    try {
      const zip = '94103';

      // Store Pickup -> search locations by ZIP
      const locations = this.logic.searchStoreLocationsByZip(zip);
      this.assert(Array.isArray(locations) && locations.length > 0, 'Store locations near ZIP should be returned');

      const selectedStore = locations[0];
      const selectResult = this.logic.selectStorePickupLocation(selectedStore.id, zip);
      this.assert(selectResult && selectResult.success === true, 'Store pickup location selection should succeed');
      this.assert(selectResult.context && selectResult.context.selected_store && selectResult.context.selected_store.id === selectedStore.id, 'Selected store in context should match chosen store');

      const context = this.logic.getStorePickupContext();
      this.assert(context && context.selected_store && context.selected_store.id === selectedStore.id, 'getStorePickupContext should return selected store');

      // Get pickup filter options and choose category (prefer Pens & Office if present)
      const pickupFilterOptions = this.logic.getStorePickupFilterOptions();
      this.assert(pickupFilterOptions && Array.isArray(pickupFilterOptions.categories), 'Pickup filter options should include categories');

      const pensCategory = pickupFilterOptions.categories.find(c => (c.category_name || '').toLowerCase().indexOf('pen') !== -1 || (c.category_name || '').toLowerCase().indexOf('office') !== -1) || pickupFilterOptions.categories[0];
      this.assert(pensCategory, 'Should select a pickup category for searching pens/office items');

      const pickupProductsResult = this.logic.getStorePickupProducts(
        {
          category_id: pensCategory.category_id,
          max_price: 25,
          min_rating: 4.0,
          same_day_only: true
        },
        'price_low_to_high',
        1,
        20
      );

      this.assert(pickupProductsResult && Array.isArray(pickupProductsResult.products), 'Store pickup products should include products array');
      this.assert(pickupProductsResult.products.length > 0, 'There should be at least one same-day pickup-eligible product under $25 with rating >= 4');

      const listingProduct = pickupProductsResult.products[0];
      const effectivePrice = typeof listingProduct.min_price === 'number' ? listingProduct.min_price : listingProduct.base_price;
      this.assert(effectivePrice <= 25, 'Selected pickup product price should be <= $25');
      this.assert(listingProduct.rating_average === undefined || listingProduct.rating_average >= 4.0, 'Listing rating should be >= 4 if present');
      this.assert(listingProduct.is_same_day_pickup_eligible === true, 'Listing should be same-day pickup eligible');

      const productDetails = this.logic.getProductDetails(listingProduct.product_id);
      const product = productDetails && productDetails.product;
      this.assert(product && product.id === listingProduct.product_id, 'Product details should match pickup listing id');
      this.assert(product.is_store_pickup_eligible === true, 'Product should be store pickup eligible');

      const configuration = {
        engraving_names: ['Alex', 'Jordan', 'Casey'],
        ink_color_selection: 'black'
      };

      const addResult = this.logic.addConfiguredProductToCart(
        product.id,
        3,
        'store_pickup',
        undefined,
        configuration
      );

      this.assert(addResult && addResult.success === true, 'Pens should be added to cart for store pickup successfully');
      this.assert(addResult.added_item_id, 'addConfiguredProductToCart should return added_item_id');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');

      const addedItem = cart.items.find(i => i.cart_item_id === addResult.added_item_id);
      this.assert(addedItem, 'Cart should contain the added pickup item');
      this.assert(addedItem.product_id === product.id, 'Cart item product id should match product');
      this.assert(addedItem.quantity === 3, 'Cart item quantity should be 3');
      this.assert(addedItem.fulfillment_type === 'store_pickup', 'Cart item fulfillment type should be store_pickup');

      const storePickupInfo = addedItem.store_pickup || {};
      this.assert(storePickupInfo.store_location_id === selectedStore.id, 'Cart item store pickup location should match selected store');

      const cfg = addedItem.configuration || {};
      this.assert(Array.isArray(cfg.engraving_names) && cfg.engraving_names.length === 3, 'Engraving names array should have three entries');
      this.assert(cfg.engraving_names[0] === 'Alex' && cfg.engraving_names[1] === 'Jordan' && cfg.engraving_names[2] === 'Casey', 'Engraving names should match input order');
      this.assert(cfg.ink_color_selection === 'black', 'Ink color selection should be black');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_ScheduleVideoCallConsultation() {
    const testName = 'Task 8: Schedule video-call design consultation for large custom wall art';
    this.resetEnvironment();

    try {
      // Custom Projects -> consultation form options
      const formOptions = this.logic.getConsultationFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.project_types), 'Consultation form options should include project_types');
      this.assert(Array.isArray(formOptions.consultation_formats), 'Consultation form options should include consultation_formats');
      this.assert(Array.isArray(formOptions.preferred_contact_methods), 'Consultation form options should include preferred_contact_methods');

      const wallArtProjectType = formOptions.project_types.find(p => p.value === 'wall_art_large_signs') || formOptions.project_types[0];
      this.assert(wallArtProjectType, 'Should select a wall art/large signs project type option');

      const videoFormat = formOptions.consultation_formats.find(f => f.value === 'video_call') || formOptions.consultation_formats[0];
      this.assert(videoFormat, 'Should select a video_call consultation format');

      const emailContactMethod = formOptions.preferred_contact_methods.find(m => m.value === 'email') || formOptions.preferred_contact_methods[0];
      this.assert(emailContactMethod, 'Should select an email preferred contact method');

      const appointmentDate = '2026-04-15';
      const appointmentTime = '14:00';
      const description = 'I would like a 36 x 24 in carved wooden wall map of my city with street details, with a budget of $400.';
      const budgetAmount = 400;

      const submitResult = this.logic.submitConsultationAppointment(
        wallArtProjectType.value,
        appointmentDate,
        appointmentTime,
        videoFormat.value,
        description,
        budgetAmount,
        'Taylor Morgan',
        'taylor.morgan@example.com',
        emailContactMethod.value
      );

      this.assert(submitResult && submitResult.success === true, 'Consultation appointment request should be submitted successfully');
      this.assert(submitResult.appointment_id, 'Appointment id should be returned');
      this.assert(typeof submitResult.status === 'string' && submitResult.status.length > 0, 'Appointment status should be a non-empty string');
      if (submitResult.scheduled_start_iso) {
        this.assert(submitResult.scheduled_start_iso.indexOf('2026-04-15') !== -1, 'Scheduled start ISO should contain the requested date');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording
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
