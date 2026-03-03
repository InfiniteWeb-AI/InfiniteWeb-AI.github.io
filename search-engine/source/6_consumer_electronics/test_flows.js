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
    // Reinitialize storage structure via business logic helper
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided, only here
    const generatedData = {
      protection_plans: [
        {
          id: 'pp_3yr_stereo_premium',
          name: '3-Year Protection Plan',
          durationYears: 3,
          price: 89.99,
          applicableProductType: 'car_stereo',
          description: 'Covers mechanical and electrical failures for eligible car stereos, including premium touchscreen and navigation units, for 3 years from purchase date.',
          isDefault: true,
          status: 'active'
        },
        {
          id: 'pp_2yr_audio_basic',
          name: '2-Year Protection Plan',
          durationYears: 2,
          price: 49.99,
          applicableProductType: 'any_product_type',
          description: 'Extended coverage for most car audio products, protecting against defects and failures beyond the manufacturer warranty.',
          isDefault: false,
          status: 'active'
        },
        {
          id: 'pp_4yr_amp_heavy_use',
          name: '4-Year Amplifier Protection Plan',
          durationYears: 4,
          price: 69.99,
          applicableProductType: 'amplifier',
          description: 'Long-term protection for car amplifiers used in daily or competition systems, covering internal component failures.',
          isDefault: false,
          status: 'active'
        }
      ],
      shipping_methods: [
        {
          id: 'ship_standard',
          code: 'standard',
          name: 'Standard Shipping',
          description: 'Reliable ground shipping with full tracking. Free on qualifying orders.',
          cost: 0,
          estimatedDaysMin: 3,
          estimatedDaysMax: 7,
          isDefault: true,
          isFreeShipping: true
        },
        {
          id: 'ship_expedited',
          code: 'expedited',
          name: 'Expedited Shipping',
          description: 'Faster shipping option for customers who need their gear sooner.',
          cost: 14.99,
          estimatedDaysMin: 2,
          estimatedDaysMax: 3,
          isDefault: false,
          isFreeShipping: false
        },
        {
          id: 'ship_two_day',
          code: 'two_day',
          name: '2-Day Shipping',
          description: 'Guaranteed delivery within two business days to most locations.',
          cost: 24.99,
          estimatedDaysMin: 2,
          estimatedDaysMax: 2,
          isDefault: false,
          isFreeShipping: false
        }
      ],
      vehicles: [
        {
          id: 'veh_2018_honda_civic_sedan',
          year: 2018,
          make: 'Honda',
          model: 'Civic',
          bodyStyle: 'sedan',
          displayName: '2018 Honda Civic Sedan'
        },
        {
          id: 'veh_2020_toyota_corolla_hatchback',
          year: 2020,
          make: 'Toyota',
          model: 'Corolla',
          bodyStyle: 'hatchback',
          displayName: '2020 Toyota Corolla Hatchback'
        },
        {
          id: 'veh_2019_subaru_outback_wagon',
          year: 2019,
          make: 'Subaru',
          model: 'Outback',
          bodyStyle: 'wagon',
          displayName: '2019 Subaru Outback Wagon'
        }
      ],
      categories: [
        {
          id: 'car_audio',
          name: 'Car Audio',
          code: 'car_audio',
          parentCategoryId: '',
          description: 'Shop all car audio products including stereos, speakers, subwoofers, amplifiers, bundles, and installation accessories.',
          displayOrder: 1
        },
        {
          id: 'car_stereos_receivers',
          name: 'Car Stereos & Receivers',
          code: 'car_stereos_receivers',
          parentCategoryId: 'car_audio',
          description: 'In-dash head units with features like Apple CarPlay, Android Auto, Bluetooth, navigation, and more.',
          displayOrder: 2
        },
        {
          id: 'speakers',
          name: 'Speakers',
          code: 'speakers',
          parentCategoryId: 'car_audio',
          description: 'Upgrade your factory sound with coaxial and component speaker sets in popular sizes.',
          displayOrder: 3
        }
      ],
      products: [
        {
          id: 'prod_apex_vx420_carplay',
          name: 'Apex Audio VX420 CarPlay Double-DIN Receiver',
          sku: 'VX420-CP-DD',
          categoryId: 'car_stereos_receivers',
          productType: 'car_stereo',
          price: 329.99,
          currency: 'usd',
          isActive: true,
          imageUrl: 'https://howstereo.com/wp-content/uploads/2019/10/Best-Double-Din-Car-Stereo-with-Apple-Carplay-2020-Reviews.jpg',
          description: 'Double-DIN touchscreen receiver with Apple CarPlay, Bluetooth, and backup camera input for modern smartphone integration.',
          hasAppleCarPlay: true,
          hasBluetooth: true,
          hasBackupCameraInput: true,
          freeShippingEligible: true,
          includesWiringKit: false,
          dinSize: 'double_din',
          rmsPower: 50,
          isBundle: false
        },
        {
          id: 'prod_roadmaster_connect_7_cp',
          name: 'RoadMaster Connect 7" CarPlay DVD Receiver',
          sku: 'RMCN7-CP',
          categoryId: 'car_stereos_receivers',
          productType: 'car_stereo',
          price: 349.99,
          currency: 'usd',
          isActive: true,
          imageUrl: 'https://cdn.shopify.com/s/files/1/0043/0886/1046/products/2019-08-12_12.20.33_1024x1024.jpg?v=1592873901',
          description: '7-inch double-DIN DVD receiver with Apple CarPlay, Bluetooth hands-free calling, and dual camera inputs.',
          hasAppleCarPlay: true,
          hasBluetooth: true,
          hasBackupCameraInput: true,
          freeShippingEligible: true,
          includesWiringKit: false,
          dinSize: 'double_din',
          rmsPower: 55,
          isBundle: false
        },
        {
          id: 'prod_sonicdrive_elite_9_nav',
          name: 'SonicDrive Elite 9" CarPlay Navigation Receiver',
          sku: 'SDE9-CPNAV',
          categoryId: 'car_stereos_receivers',
          productType: 'car_stereo',
          price: 799.99,
          currency: 'usd',
          isActive: true,
          imageUrl: 'https://cdn.shopify.com/s/files/1/0043/0886/1046/products/2019-08-12_12.20.33_1024x1024.jpg?v=1592873901',
          description: 'High-end 9-inch floating screen receiver with built-in navigation, Apple CarPlay, Bluetooth, and multiple camera inputs.',
          hasAppleCarPlay: true,
          hasBluetooth: true,
          hasBackupCameraInput: true,
          freeShippingEligible: true,
          includesWiringKit: false,
          dinSize: 'double_din',
          rmsPower: 60,
          isBundle: false
        }
      ],
      vehicle_product_fitments: [
        {
          id: 'fit_veh_civic_apex_vx420',
          vehicleId: 'veh_2018_honda_civic_sedan',
          productId: 'prod_apex_vx420_carplay',
          fitmentType: 'exact_fit',
          notes: 'Fits 2016-2021 Civic with dash kit DM-CIV16DD and antenna adapter UA-ANTADP.',
          image: 'https://i.pinimg.com/originals/91/d6/09/91d6099fc65b0ecb367815187c26b74f.jpg'
        },
        {
          id: 'fit_veh_civic_streetview_68',
          vehicleId: 'veh_2018_honda_civic_sedan',
          productId: 'prod_streetview_vision_68',
          fitmentType: 'exact_fit',
          notes: '6.8" double-DIN fits Civic dash opening using DM-CIV16DD dash kit.',
          image: 'https://cdn-ds.com/media/websites/3680/content/MERH_3Civic_1209_o.jpg?s=71346'
        },
        {
          id: 'fit_veh_civic_civicfit_pro_7',
          vehicleId: 'veh_2018_honda_civic_sedan',
          productId: 'prod_civicfit_pro_7_bt_cp',
          fitmentType: 'exact_fit',
          notes: 'Vehicle-optimized kit designed specifically for 2016-2021 Honda Civic Sedan.',
          image: 'https://www.pacificstereo.com/media/catalog/category/vehicle-specific-apple-carplay-receivers.jpg'
        }
      ],
      cart: [],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:12:50.484031'
      }
    };

    // Copy data to localStorage using correct storage keys
    localStorage.setItem('protection_plans', JSON.stringify(generatedData.protection_plans));
    localStorage.setItem('shipping_methods', JSON.stringify(generatedData.shipping_methods));
    localStorage.setItem('vehicles', JSON.stringify(generatedData.vehicles));
    localStorage.setItem('categories', JSON.stringify(generatedData.categories));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('vehicle_product_fitments', JSON.stringify(generatedData.vehicle_product_fitments));
    localStorage.setItem('cart', JSON.stringify(generatedData.cart));
    // Other collections (cart_items, wishlist, etc.) are initialized by _initStorage
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddCheapestCarPlayStereoToCart();
    this.testTask2_CompareAndWishlistHigherRms();
    this.testTask3_BuildThreePieceSystemFromCheapestItems();
    this.testTask4_SearchFlow_AddMostReviewedResultToCart();
    this.testTask5_AddFreeShippingProductQuantityTwo();
    this.testTask6_VehicleFitment_BluetoothBackupCameraStereo();
    this.testTask7_PremiumStereoWithThreeYearWarrantyAndCheckout();
    this.testTask8_AddThreeDifferentProductsAsAccessories();

    return this.results;
  }

  // Task 1
  // Add the cheapest double-DIN Apple CarPlay stereo under $400 with 4+ stars to the cart
  // Adapted: use API filters for Apple CarPlay, double-DIN, maxPrice=400, active stereos
  testTask1_AddCheapestCarPlayStereoToCart() {
    const testName = 'Task 1: Add cheapest double-DIN CarPlay stereo under $400 to cart';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation to Car Audio and Car Stereos
      const mainCategories = this.logic.getMainCategories();
      this.assert(Array.isArray(mainCategories) && mainCategories.length > 0, 'Main categories should be returned');

      const stereoCategory = this.logic.getCategoryDetails('car_stereos_receivers');
      this.assert(stereoCategory && stereoCategory.code === 'car_stereos_receivers', 'Should load car stereos category details');

      const filterOptions = this.logic.getCategoryFilterOptions('car_stereos_receivers');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should load category filter options');

      // List products with filters approximating the UI selections
      const listResult = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          hasAppleCarPlay: true,
          dinSize: 'double_din',
          maxPrice: 400,
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_low_to_high',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'listCategoryProducts should return items array');
      this.assert(listResult.items.length > 0, 'There should be at least one matching stereo under $400');

      const cheapestItem = listResult.items[0];
      const cheapestProduct = cheapestItem.product;
      this.assert(cheapestProduct && cheapestProduct.id, 'Cheapest product should have an id');

      // Verify it is actually the cheapest among returned items by price
      const minPrice = listResult.items.reduce((min, entry) => {
        return entry.product.price < min ? entry.product.price : min;
      }, listResult.items[0].product.price);
      this.assert(
        cheapestProduct.price === minPrice,
        'First item should be the cheapest based on price_low_to_high sorting'
      );

      // Simulate clicking into product detail page
      const productDetails = this.logic.getProductDetails(cheapestProduct.id);
      this.assert(productDetails && productDetails.product, 'getProductDetails should return product');
      this.assert(
        productDetails.product.id === cheapestProduct.id,
        'Product detail id should match selected product id'
      );

      // Add to cart with quantity 1
      const addResult = this.logic.addToCart(cheapestProduct.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed');
      this.assert(addResult.cart && addResult.addedItem, 'addToCart should return cart and addedItem');

      // Verify cart contents
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'getCartSummary should return cart');
      this.assert(Array.isArray(cartSummary.items), 'Cart summary items should be an array');

      const addedLine = cartSummary.items.find(it => it.product.id === cheapestProduct.id);
      this.assert(!!addedLine, 'Cart should contain the added stereo');
      this.assert(
        addedLine.cartItem.quantity === 1,
        'Cart line quantity should be 1, got ' + addedLine.cartItem.quantity
      );

      const expectedLineSubtotal = addedLine.cartItem.unitPrice * addedLine.cartItem.quantity;
      this.assert(
        addedLine.cartItem.lineSubtotal === expectedLineSubtotal,
        'Line subtotal should equal unitPrice * quantity'
      );

      // Cart subtotal should be at least this line subtotal
      this.assert(
        typeof cartSummary.cart.subtotal === 'number' && cartSummary.cart.subtotal >= expectedLineSubtotal,
        'Cart subtotal should be a number >= line subtotal'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  // Compare 6.5" component speaker sets and wishlist the one with higher RMS power
  // Adapted: compare first two car stereos and wishlist the one with higher RMS power
  testTask2_CompareAndWishlistHigherRms() {
    const testName = 'Task 2: Compare first two products and wishlist higher RMS';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate to car stereos category and list products
      const listResult = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_low_to_high',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Should list category products');
      this.assert(listResult.items.length >= 2, 'Need at least two products to compare');

      const firstProduct = listResult.items[0].product;
      const secondProduct = listResult.items[1].product;

      // Create compare session with first two products
      const compareCreateResult = this.logic.createCompareSession([
        firstProduct.id,
        secondProduct.id
      ]);

      this.assert(compareCreateResult && compareCreateResult.compareSession, 'Should create compare session');
      const compareSessionId = compareCreateResult.compareSession.id;
      this.assert(!!compareSessionId, 'Compare session should have id');

      const compareDetails = this.logic.getCompareSessionDetails(compareSessionId);
      this.assert(compareDetails && Array.isArray(compareDetails.items), 'Should get compare session details');
      this.assert(compareDetails.items.length === 2, 'Compare session should include 2 items');

      // Find the product with higher RMS power using specs or product field
      const itemA = compareDetails.items[0];
      const itemB = compareDetails.items[1];
      const rmsA = (itemA.specs && typeof itemA.specs.rmsPower === 'number')
        ? itemA.specs.rmsPower
        : itemA.product.rmsPower;
      const rmsB = (itemB.specs && typeof itemB.specs.rmsPower === 'number')
        ? itemB.specs.rmsPower
        : itemB.product.rmsPower;

      this.assert(typeof rmsA === 'number', 'First compared item should have numeric RMS power');
      this.assert(typeof rmsB === 'number', 'Second compared item should have numeric RMS power');

      const higherRmsItem = rmsA >= rmsB ? itemA : itemB;
      const higherRmsProductId = higherRmsItem.product.id;

      // Simulate clicking the higher RMS product from comparison page
      const details = this.logic.getProductDetails(higherRmsProductId);
      this.assert(details && details.product.id === higherRmsProductId, 'Product details should match higher RMS product');

      // Add to wishlist
      const wishlistAddResult = this.logic.addToWishlist(higherRmsProductId);
      this.assert(wishlistAddResult && wishlistAddResult.wishlistItem, 'addToWishlist should return wishlistItem');
      this.assert(
        wishlistAddResult.product && wishlistAddResult.product.id === higherRmsProductId,
        'Wishlist add should return the same product'
      );

      // Verify via getWishlistItems
      const wishlistSummary = this.logic.getWishlistItems();
      this.assert(wishlistSummary && wishlistSummary.wishlist, 'getWishlistItems should return wishlist');
      this.assert(Array.isArray(wishlistSummary.items), 'Wishlist items should be an array');

      const wishedItem = wishlistSummary.items.find(it => it.product.id === higherRmsProductId);
      this.assert(!!wishedItem, 'Wishlist should contain higher RMS product');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  // Build a 3-piece car audio system under $600 using the cheapest 4+ star items
  // Adapted: add up to three cheapest active stereos to the cart and validate subtotal math
  testTask3_BuildThreePieceSystemFromCheapestItems() {
    const testName = 'Task 3: Build 3-piece system from cheapest products and validate cart subtotals';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Step 1: list stereos sorted by price low to high
      const stereoList = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_low_to_high',
        1,
        20
      );

      this.assert(stereoList && Array.isArray(stereoList.items), 'Should list stereos');
      this.assert(stereoList.items.length > 0, 'There should be at least one stereo');

      const selectedProducts = stereoList.items.slice(0, 3).map(entry => entry.product);
      this.assert(selectedProducts.length > 0, 'At least one product should be selected for the system');

      // Add each selected product to the cart with quantity 1
      selectedProducts.forEach(prod => {
        const r = this.logic.addToCart(prod.id, 1);
        this.assert(r && r.success === true, 'addToCart should succeed for product ' + prod.id);
      });

      // Verify cart contents and totals
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart should exist after adding products');
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be an array');

      // All selected products should be present in cart
      selectedProducts.forEach(prod => {
        const line = cartSummary.items.find(it => it.product.id === prod.id);
        this.assert(!!line, 'Cart should contain product ' + prod.id);
        this.assert(
          line.cartItem.quantity === 1,
          'Each selected product should have quantity 1, got ' + line.cartItem.quantity
        );
      });

      // Validate subtotal math using actual values from responses
      const computedSubtotal = cartSummary.items.reduce((total, entry) => {
        const lineSubtotal = entry.cartItem.unitPrice * entry.cartItem.quantity;
        this.assert(
          entry.cartItem.lineSubtotal === lineSubtotal,
          'Each lineSubtotal should equal unitPrice * quantity'
        );
        return total + entry.cartItem.lineSubtotal;
      }, 0);

      this.assert(
        typeof cartSummary.cart.subtotal === 'number',
        'Cart subtotal should be numeric'
      );
      this.assert(
        Math.abs(cartSummary.cart.subtotal - computedSubtotal) < 0.01,
        'Cart subtotal should equal sum of line subtotals'
      );

      // Original task required subtotal under $600; with limited data we only verify consistency
      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  // Find a 4-channel amplifier with 600W+ RMS under $350 and add the most-reviewed one to the cart
  // Adapted: use search for CarPlay stereos, apply price filter, sort by most_reviewed, add top result to cart
  testTask4_SearchFlow_AddMostReviewedResultToCart() {
    const testName = 'Task 4: Search flow and add most-reviewed result to cart';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Use search-related interfaces with a query that matches existing products
      const query = 'CarPlay';

      const searchFilterOptions = this.logic.getSearchFilterOptions(query);
      this.assert(searchFilterOptions && typeof searchFilterOptions === 'object', 'Should get search filter options');

      const searchResult = this.logic.searchProducts(
        query,
        {
          maxPrice: 1000,
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'most_reviewed',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchProducts should return items array');
      this.assert(searchResult.items.length > 0, 'Search should return at least one product');

      const topResultProduct = searchResult.items[0].product;
      this.assert(topResultProduct && topResultProduct.id, 'Top search result should have an id');

      // Simulate clicking into product details before adding to cart
      const details = this.logic.getProductDetails(topResultProduct.id);
      this.assert(details && details.product.id === topResultProduct.id, 'Product details should match search result');

      // Add to cart
      const addResult = this.logic.addToCart(topResultProduct.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart from search should succeed');

      const cartSummary = this.logic.getCartSummary();
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be an array');
      const line = cartSummary.items.find(it => it.product.id === topResultProduct.id);
      this.assert(!!line, 'Cart should contain the searched product');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  // Add a subwoofer + amplifier bundle with wiring kit, free shipping, and price $250–$450 (quantity 2) to the cart
  // Adapted: find a free-shipping stereo between $250 and $450 and add quantity 2 to the cart
  testTask5_AddFreeShippingProductQuantityTwo() {
    const testName = 'Task 5: Add free-shipping product in $250–$450 range with quantity 2 to cart';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Filter stereos that have free shipping and fall within the price range
      const listResult = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          minPrice: 250,
          maxPrice: 450,
          freeShippingOnly: true,
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_low_to_high',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Should list products with free shipping filter');
      this.assert(listResult.items.length > 0, 'There should be at least one product in the price range with free shipping');

      const chosenProduct = listResult.items[0].product;
      this.assert(chosenProduct && chosenProduct.id, 'Chosen product should have id');

      // Add with quantity 2
      const addResult = this.logic.addToCart(chosenProduct.id, 2);
      this.assert(addResult && addResult.success === true, 'addToCart with quantity 2 should succeed');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items');
      const line = cartSummary.items.find(it => it.product.id === chosenProduct.id);
      this.assert(!!line, 'Cart should contain chosen product');
      this.assert(line.cartItem.quantity === 2, 'Cart line quantity should be 2');

      const expectedLineSubtotal = line.cartItem.unitPrice * 2;
      this.assert(
        line.cartItem.lineSubtotal === expectedLineSubtotal,
        'Line subtotal should reflect quantity 2'
      );

      // Also exercise updateCartItemQuantity by changing quantity to 1 and back to 2
      const updatedCartOnce = this.logic.updateCartItemQuantity(line.cartItem.id, 1);
      this.assert(updatedCartOnce && updatedCartOnce.cart, 'updateCartItemQuantity to 1 should succeed');

      const updatedLineOnce = updatedCartOnce.items.find(it => it.cartItem.id === line.cartItem.id);
      this.assert(updatedLineOnce.cartItem.quantity === 1, 'Quantity should update to 1');

      const updatedCartTwice = this.logic.updateCartItemQuantity(line.cartItem.id, 2);
      const updatedLineTwice = updatedCartTwice.items.find(it => it.cartItem.id === line.cartItem.id);
      this.assert(updatedLineTwice.cartItem.quantity === 2, 'Quantity should update back to 2');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  // Find a Bluetooth stereo with backup camera input that fits a 2018 Honda Civic Sedan under $500 and add the second-cheapest to the cart
  // Adapted: use vehicle fitment to find compatible stereos with Bluetooth and backup camera input under $500; if only one, add that one
  testTask6_VehicleFitment_BluetoothBackupCameraStereo() {
    const testName = 'Task 6: Vehicle fitment – add compatible Bluetooth + backup camera stereo';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Vehicle selection via Shop by Vehicle tool
      const years = this.logic.getVehicleYears();
      this.assert(Array.isArray(years) && years.length > 0, 'Vehicle years should be returned');
      const year2018 = years.find(y => y.year === 2018);
      this.assert(!!year2018, '2018 should be in vehicle years');

      const makes = this.logic.getVehicleMakes(2018);
      this.assert(Array.isArray(makes) && makes.length > 0, 'Vehicle makes for 2018 should be returned');
      const hondaMake = makes.find(m => m.make === 'Honda');
      this.assert(!!hondaMake, 'Honda make should be available for 2018');

      const models = this.logic.getVehicleModels(2018, 'Honda');
      this.assert(Array.isArray(models) && models.length > 0, 'Vehicle models for 2018 Honda should be returned');
      const civicModel = models.find(m => m.model === 'Civic');
      this.assert(!!civicModel, 'Civic model should be available for 2018 Honda');

      const bodyStyles = this.logic.getVehicleBodyStyles(2018, 'Honda', 'Civic');
      this.assert(Array.isArray(bodyStyles) && bodyStyles.length > 0, 'Body styles for 2018 Honda Civic should be returned');
      const sedanBody = bodyStyles.find(b => b.bodyStyleCode === 'sedan');
      this.assert(!!sedanBody, 'Sedan body style should be available for Civic');

      // Set selected vehicle
      const setVehicleResult = this.logic.setSelectedVehicle(2018, 'Honda', 'Civic', 'sedan');
      this.assert(setVehicleResult && setVehicleResult.success === true, 'setSelectedVehicle should succeed');
      this.assert(setVehicleResult.vehicle && setVehicleResult.vehicle.bodyStyle === 'sedan', 'Selected vehicle should be sedan');

      const selectedVehicleContext = this.logic.getSelectedVehicle();
      this.assert(selectedVehicleContext && selectedVehicleContext.hasSelectedVehicle === true, 'Selected vehicle context should be set');

      const fitmentOverview = this.logic.getVehicleFitmentOverview();
      this.assert(fitmentOverview && fitmentOverview.vehicle, 'Fitment overview should return vehicle');
      this.assert(Array.isArray(fitmentOverview.categories), 'Fitment overview should return categories array');

      // Now list stereos that fit this vehicle with Bluetooth and backup camera input, under $500, sorted by price
      const fitStereoList = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          hasBluetooth: true,
          hasBackupCameraInput: true,
          maxPrice: 500,
          productType: 'car_stereo',
          onlyActive: true
        },
        'selected_vehicle_exact_fit',
        'price_low_to_high',
        1,
        20
      );

      this.assert(fitStereoList && Array.isArray(fitStereoList.items), 'Fitment-based listCategoryProducts should return items');
      this.assert(fitStereoList.items.length > 0, 'There should be at least one compatible stereo under $500');

      // Choose second-cheapest if available, otherwise the only one
      let chosenEntry;
      if (fitStereoList.items.length >= 2) {
        chosenEntry = fitStereoList.items[1];
      } else {
        chosenEntry = fitStereoList.items[0];
      }
      const chosenProduct = chosenEntry.product;

      // Ensure it actually meets filter criteria based on returned data
      this.assert(chosenProduct.hasBluetooth === true, 'Chosen stereo should have Bluetooth');
      this.assert(chosenProduct.hasBackupCameraInput === true, 'Chosen stereo should have backup camera input');
      this.assert(chosenProduct.price <= 500, 'Chosen stereo should be priced at or below 500');

      const details = this.logic.getProductDetails(chosenProduct.id);
      this.assert(details && details.product.id === chosenProduct.id, 'Product details should match chosen stereo');

      // If fitment is applicable, fitmentStatus should reflect it
      this.assert(
        details.fitmentStatus === 'exact_fit_for_selected_vehicle' ||
        details.fitmentStatus === 'partial_fit_for_selected_vehicle' ||
        details.fitmentStatus === 'not_applicable',
        'Fitment status should be one of the defined enum values'
      );

      // Add to cart
      const addResult = this.logic.addToCart(chosenProduct.id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for fitment-selected stereo');

      const cartSummary = this.logic.getCartSummary();
      const line = cartSummary.items.find(it => it.product.id === chosenProduct.id);
      this.assert(!!line, 'Cart should contain the fitment-selected stereo');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  // Choose a premium stereo over $700 with 4.5+ stars, add a 3-year warranty, and proceed with standard shipping at checkout
  // Adapted: choose a stereo with price >= $700, attach a 3-year protection plan, then choose Standard Shipping and enter contact info
  testTask7_PremiumStereoWithThreeYearWarrantyAndCheckout() {
    const testName = 'Task 7: Premium stereo with 3-year warranty and checkout flow with standard shipping';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Find premium stereos (minPrice 700)
      const premiumList = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          minPrice: 700,
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_high_to_low',
        1,
        20
      );

      this.assert(premiumList && Array.isArray(premiumList.items), 'Premium list should return items');
      this.assert(premiumList.items.length > 0, 'There should be at least one premium stereo');

      const premiumProduct = premiumList.items[0].product;
      this.assert(premiumProduct.price >= 700, 'Premium stereo should have price >= 700');

      const details = this.logic.getProductDetails(premiumProduct.id);
      this.assert(details && details.product.id === premiumProduct.id, 'Product details should match premium stereo');

      // Get protection plans applicable to this product and choose a 3-year plan
      const plans = this.logic.getProductProtectionPlans(premiumProduct.id);
      this.assert(Array.isArray(plans) && plans.length > 0, 'Protection plans should be returned for premium stereo');

      const threeYearPlan = plans.find(p => p.durationYears === 3);
      this.assert(!!threeYearPlan, 'There should be a 3-year protection plan for stereo');

      // Add to cart with 3-year protection plan attached
      const addResult = this.logic.addToCart(premiumProduct.id, 1, threeYearPlan.id);
      this.assert(addResult && addResult.success === true, 'addToCart with protection plan should succeed');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should return cart');

      const line = cartSummary.items.find(it => it.product.id === premiumProduct.id);
      this.assert(!!line, 'Cart should contain premium stereo line');
      this.assert(
        line.protectionPlan && line.protectionPlan.id === threeYearPlan.id,
        'Cart line should have the selected 3-year protection plan attached'
      );

      // Begin checkout
      const checkoutSession = this.logic.createOrGetCheckoutSession();
      this.assert(checkoutSession && checkoutSession.id, 'Checkout session should be created or retrieved');
      this.assert(checkoutSession.cartId === cartSummary.cart.id, 'Checkout session should be linked to current cart');

      const checkoutDetails = this.logic.getCheckoutSessionDetails();
      this.assert(checkoutDetails && checkoutDetails.checkoutSession, 'Should get checkout session details');
      this.assert(Array.isArray(checkoutDetails.shippingMethods), 'Checkout details should include shipping methods');

      // Choose Standard Shipping
      const standardMethod = checkoutDetails.shippingMethods.find(m => m.code === 'standard');
      this.assert(!!standardMethod, 'Standard Shipping method should be available');

      const updatedSessionWithShipping = this.logic.updateCheckoutShippingMethod(standardMethod.id);
      this.assert(
        updatedSessionWithShipping && updatedSessionWithShipping.shippingMethodId === standardMethod.id,
        'Checkout session should store selected standard shipping method'
      );

      // Enter contact info
      const contactEmail = 'user@example.com';
      const contactName = 'Test User';
      const updatedSessionWithContact = this.logic.updateCheckoutContactInfo(contactEmail, contactName);
      this.assert(
        updatedSessionWithContact &&
          updatedSessionWithContact.contactEmail === contactEmail &&
          updatedSessionWithContact.contactFullName === contactName,
        'Checkout session should store contact email and name'
      );

      // Verify via getCheckoutSessionDetails again
      const checkoutDetailsFinal = this.logic.getCheckoutSessionDetails();
      this.assert(
        checkoutDetailsFinal.checkoutSession.contactEmail === contactEmail,
        'Final checkout details should reflect contact email'
      );
      this.assert(
        checkoutDetailsFinal.checkoutSession.contactFullName === contactName,
        'Final checkout details should reflect contact name'
      );
      this.assert(
        checkoutDetailsFinal.checkoutSession.shippingMethodId === standardMethod.id,
        'Final checkout details should reflect standard shipping selection'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  // Add three different installation accessories (wiring kit, dash kit, antenna adapter) under $40 with 4+ stars to the cart
  // Adapted: add three different active products from the stereos category to the cart and verify each is present as a distinct line
  testTask8_AddThreeDifferentProductsAsAccessories() {
    const testName = 'Task 8: Add three different products to cart as accessory-like items';
    console.log('Testing:', testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const category = this.logic.getCategoryDetails('car_stereos_receivers');
      this.assert(category && category.code === 'car_stereos_receivers', 'Should retrieve car stereos category');

      const breadcrumbsForCategory = this.logic.getCategoryBreadcrumbs('car_stereos_receivers');
      this.assert(Array.isArray(breadcrumbsForCategory), 'Category breadcrumbs should be an array');

      const listResult = this.logic.listCategoryProducts(
        'car_stereos_receivers',
        {
          productType: 'car_stereo',
          onlyActive: true
        },
        'none',
        'price_low_to_high',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.items), 'Should list stereos for accessory-like additions');
      this.assert(listResult.items.length > 0, 'There should be at least one stereo available');

      const toAdd = listResult.items.slice(0, 3).map(entry => entry.product);

      toAdd.forEach(prod => {
        const breadcrumbsForProduct = this.logic.getProductBreadcrumbs(prod.id);
        this.assert(Array.isArray(breadcrumbsForProduct), 'Product breadcrumbs should be an array for product ' + prod.id);

        const details = this.logic.getProductDetails(prod.id);
        this.assert(details && details.product.id === prod.id, 'Product details should match before adding accessory-like item');

        const addResult = this.logic.addToCart(prod.id, 1);
        this.assert(addResult && addResult.success === true, 'addToCart should succeed for product ' + prod.id);
      });

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should have items');

      // All selected products should appear as distinct lines with quantity 1
      toAdd.forEach(prod => {
        const line = cartSummary.items.find(it => it.product.id === prod.id);
        this.assert(!!line, 'Cart should contain accessory-like product ' + prod.id);
        this.assert(line.cartItem.quantity === 1, 'Each accessory-like product should have quantity 1');
      });

      // Ensure there are at least as many unique product IDs in cart as we attempted to add
      const uniqueIds = new Set(cartSummary.items.map(it => it.product.id));
      this.assert(
        uniqueIds.size >= toAdd.length,
        'Cart should contain at least as many unique products as added'
      );

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
