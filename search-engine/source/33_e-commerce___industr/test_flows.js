class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Generated Data used ONLY here
    const generatedData = {
      shipping_methods: [
        {
          id: 'standard_shipping',
          key: 'standard',
          name: 'Standard Shipping',
          description: 'Economy ground shipping for commercial and residential addresses.',
          base_cost: 12.5,
          is_free_option: true,
          estimated_days_min: 4,
          estimated_days_max: 7,
          display_order: 1
        },
        {
          id: 'express_shipping',
          key: 'express',
          name: 'Express Shipping',
          description: 'Expedited delivery by air or priority ground where available.',
          base_cost: 34.0,
          is_free_option: false,
          estimated_days_min: 1,
          estimated_days_max: 3,
          display_order: 2
        },
        {
          id: 'warehouse_pickup',
          key: 'pickup',
          name: 'Warehouse Pickup',
          description: 'Pickup from our main distribution warehouse during business hours.',
          base_cost: 0.0,
          is_free_option: true,
          estimated_days_min: 1,
          estimated_days_max: 2,
          display_order: 3
        }
      ],
      categories: [
        {
          id: 'cartridge_filters',
          key: 'cartridge_filters',
          name: 'Cartridge Filters',
          description: 'Sediment, carbon block, and specialty cartridges in 5-inch to 40-inch sizes for industrial and commercial housings.',
          display_order: 1
        },
        {
          id: 'dosing_pumps',
          key: 'dosing_pumps',
          name: 'Dosing Pumps',
          description: 'Analog and digital dosing pumps for chemical injection, disinfection, and pH control in water treatment systems.',
          display_order: 2
        },
        {
          id: 'filter_housings',
          key: 'filter_housings',
          name: 'Filter Housings',
          description: 'Plastic and stainless steel filter housings for cartridge filters, available in various pressure ratings and lengths.',
          display_order: 3
        }
      ],
      products: [
        {
          id: 'cf_sed_10_5_economy',
          name: '10 inch Sediment Cartridge 5 micron - Economy',
          category_key: 'cartridge_filters',
          sku: 'CT-SED-10-5-ECO',
          price: 13.9,
          currency: 'USD',
          status: 'active',
          rating: 4.2,
          rating_count: 87,
          free_shipping: false,
          description: 'Economy 10-inch melt-blown sediment filter cartridge with 5 micron nominal rating for pre-filtration in RO and softener systems.',
          image_url: 'https://cdn.shopify.com/s/files/1/2599/7360/products/10-inch-5-micron-sediment-water-filter-cartridge-ra-pp-10-5m-1_1024x.jpg?v=1536082858',
          tags: [
            'sediment cartridge',
            '5 micron',
            '10 inch',
            'pre-filter',
            'RO pre-treatment'
          ],
          length_inch: 10,
          micron_rating: 5,
          media_type: 'sediment',
          material: 'plastic',
          shipping_lead_time_days: 2,
          created_at: '2025-05-12T09:30:00Z',
          updated_at: '2025-11-20T14:10:00Z'
        },
        {
          id: 'cf_sed_10_5_premium',
          name: '10 inch Sediment Cartridge 5 micron - Premium High Dirt Holding',
          category_key: 'cartridge_filters',
          sku: 'CT-SED-10-5-PRE',
          price: 18.5,
          currency: 'USD',
          status: 'active',
          rating: 4.6,
          rating_count: 154,
          free_shipping: false,
          description: 'Premium 10-inch, 5 micron sediment filter cartridge with graded density for higher dirt-holding capacity and longer service life.',
          image_url: 'https://cdn.shopify.com/s/files/1/2599/7360/products/10-inch-5-micron-sediment-water-filter-cartridge-ra-pp-10-5m-1_1024x.jpg?v=1536082858',
          tags: [
            'sediment filter cartridge',
            '5 micron',
            '10 inch',
            'graded density',
            'cartridge filters'
          ],
          length_inch: 10,
          micron_rating: 5,
          media_type: 'sediment',
          material: 'plastic',
          shipping_lead_time_days: 2,
          created_at: '2025-03-05T11:00:00Z',
          updated_at: '2025-12-02T08:45:00Z'
        },
        {
          id: 'cf_cb_10_10_standard',
          name: '10 inch Carbon Block Cartridge 10 micron - Chlorine and Odor Reduction',
          category_key: 'cartridge_filters',
          sku: 'CT-CB-10-10-STD',
          price: 29.9,
          currency: 'USD',
          status: 'active',
          rating: 4.5,
          rating_count: 132,
          free_shipping: false,
          description: 'Standard 10-inch carbon block cartridge with 10 micron rating for chlorine, taste, and odor reduction in commercial water treatment.',
          image_url: 'http://s.alicdn.com/@sc01/kf/Hb52f61721eb745df92d035f25680475fS.jpg',
          tags: [
            'carbon block',
            '10 inch',
            'chlorine reduction',
            'cartridge filter',
            'activated carbon'
          ],
          length_inch: 10,
          micron_rating: 10,
          media_type: 'carbon_block',
          material: 'plastic',
          shipping_lead_time_days: 3,
          created_at: '2025-04-18T10:15:00Z',
          updated_at: '2026-01-10T16:22:00Z'
        }
      ],
      cart: [],
      cart_items: [],
      orders: [],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:11:49.463442'
      }
    };

    // Populate localStorage using storage keys
    localStorage.setItem('shipping_methods', JSON.stringify(generatedData.shipping_methods));
    localStorage.setItem('categories', JSON.stringify(generatedData.categories));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('cart', JSON.stringify(generatedData.cart));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items));
    localStorage.setItem('orders', JSON.stringify(generatedData.orders));

    // Empty collections for remaining entities
    localStorage.setItem('comparison_lists', JSON.stringify([]));
    localStorage.setItem('comparison_items', JSON.stringify([]));
    localStorage.setItem('order_items', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BuyTwoSedimentCartridges();
    this.testTask2_OrderThreeContainers();
    this.testTask3_SelectHighestFlowDigitalPump();
    this.testTask4_AssembleThreeStageFilterSet();
    this.testTask5_BuyThreeMembranesEquivalent();
    this.testTask6_CompareConductivityMetersAndAddWidest();
    this.testTask7_PrepareCartForSmallHotelEquivalent();
    this.testTask8_KeepOnlyCheapestHousingAndSetQuantity();

    return this.results;
  }

  // Task 1: Buy two 5-micron 10-inch sediment filter cartridges under $40 each
  testTask1_BuyTwoSedimentCartridges() {
    const testName = 'Task 1: Buy two 5-micron 10-inch sediment cartridges';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const query = '5 micron sediment filter cartridge';

      if (this.logic.getSearchFilterOptions) {
        const filterOptions = this.logic.getSearchFilterOptions(query);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Search filter options should be returned');
      }

      const filters = {
        price_max: 40,
        micron_ratings: [5],
        length_inches: [10]
      };

      const searchResult = this.logic.searchProducts(query, filters, 'price_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array');
      this.assert(searchResult.products.length > 0, 'Should find at least one sediment cartridge matching filters');

      const cheapestProduct = searchResult.products[0];

      const productDetails = this.logic.getProductDetails(cheapestProduct.id);
      this.assert(productDetails && productDetails.id === cheapestProduct.id, 'Product details should match selected product');

      const quantity = 2;
      const addResult = this.logic.addToCart(productDetails.id, quantity);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for sediment cartridge');
      this.assert(addResult.cart && Array.isArray(addResult.cart.items), 'addToCart result should include cart with items');

      const addedItem = addResult.cart.items.find(function (item) {
        return item.product_id === productDetails.id;
      });
      this.assert(!!addedItem, 'Cart should contain the added sediment cartridge');
      this.assert(addedItem.quantity === quantity, 'Sediment cartridge line item should have quantity ' + quantity);

      if (this.logic.getCartSummary) {
        const summary = this.logic.getCartSummary();
        this.assert(summary && typeof summary.item_count === 'number', 'Cart summary should be available');
        this.assert(summary.item_count >= quantity, 'Cart summary item_count should be at least ' + quantity);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Adapted - Order three containers (using cheapest cartridges) under $250 each
  testTask2_OrderThreeContainers() {
    const testName = 'Task 2: Order three cheapest cartridges under $250';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const query = 'cartridge';

      if (this.logic.getSearchFilterOptions) {
        const filterOptions = this.logic.getSearchFilterOptions(query);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Search filter options should be returned for task 2');
      }

      const filters = {
        price_max: 250,
        rating_min: 4.0
      };

      const searchResult = this.logic.searchProducts(query, filters, 'price_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array for task 2');
      this.assert(searchResult.products.length > 0, 'Should find at least one cartridge under price and rating filters for task 2');

      const cheapestProduct = searchResult.products[0];
      const productDetails = this.logic.getProductDetails(cheapestProduct.id);
      this.assert(productDetails && productDetails.id === cheapestProduct.id, 'Product details should match selected product for task 2');

      const quantity = 3;
      const addResult = this.logic.addToCart(productDetails.id, quantity);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for task 2');

      const addedItem = addResult.cart.items.find(function (item) {
        return item.product_id === productDetails.id;
      });
      this.assert(!!addedItem, 'Cart should contain the added product for task 2');
      this.assert(addedItem.quantity === quantity, 'Task 2 line item should have quantity ' + quantity);

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Adapted - Select highest-flow digital dosing pump under $1,200 with rating 4.5+ (using category listing)
  testTask3_SelectHighestFlowDigitalPump() {
    const testName = 'Task 3: Select highest-flow equivalent product from category listing';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const categories = this.logic.getCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getCategories should return at least one category');

      let targetCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; });
      if (!targetCategory) {
        targetCategory = categories[0];
      }

      if (this.logic.getCategoryFilterOptions) {
        const filterOptions = this.logic.getCategoryFilterOptions(targetCategory.key);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Category filter options should be available for task 3');
      }

      const filters = {
        price_max: 1200,
        rating_min: 4.5
      };

      const listResult = this.logic.getCategoryProducts(targetCategory.key, filters, 'flow_rate_desc', 1, 20);
      this.assert(listResult && Array.isArray(listResult.products), 'getCategoryProducts should return products array for task 3');
      this.assert(listResult.products.length > 0, 'Should find at least one high-rated product for task 3');

      const selectedProduct = listResult.products[0];

      const productDetails = this.logic.getProductDetails(selectedProduct.id);
      this.assert(productDetails && productDetails.id === selectedProduct.id, 'Product details should match selected product for task 3');

      const quantity = 1;
      const addResult = this.logic.addToCart(productDetails.id, quantity);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for task 3');

      const addedItem = addResult.cart.items.find(function (item) {
        return item.product_id === productDetails.id;
      });
      this.assert(!!addedItem, 'Cart should contain the selected equivalent dosing pump product');
      this.assert(addedItem.quantity === quantity, 'Task 3 item should have quantity ' + quantity);

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Assemble a 3-stage 10-inch filter set (sediment, carbon, polishing)
  testTask4_AssembleThreeStageFilterSet() {
    const testName = 'Task 4: Assemble 3-stage 10-inch filter set';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const categories = this.logic.getCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getCategories should return categories for task 4');

      let cartridgeCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; });
      if (!cartridgeCategory) {
        cartridgeCategory = categories[0];
      }

      if (this.logic.getCategoryFilterOptions) {
        const filterOptions = this.logic.getCategoryFilterOptions(cartridgeCategory.key);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Category filter options should be available for task 4');
      }

      // Stage 1: Sediment cartridge
      const sedimentFilters = {
        length_inches: [10],
        rating_min: 4.0,
        media_types: ['sediment']
      };

      const sedimentList = this.logic.getCategoryProducts(cartridgeCategory.key, sedimentFilters, 'price_asc', 1, 20);
      this.assert(sedimentList && Array.isArray(sedimentList.products), 'Sediment listing should return products');
      this.assert(sedimentList.products.length > 0, 'Should find at least one sediment cartridge for stage 1');

      const sedimentProduct = sedimentList.products[0];
      const sedimentDetails = this.logic.getProductDetails(sedimentProduct.id);
      const addSedimentResult = this.logic.addToCart(sedimentDetails.id, 1);
      this.assert(addSedimentResult && addSedimentResult.success === true, 'Should add sediment cartridge to cart');

      // Stage 2: Carbon cartridge
      const carbonFilters = {
        length_inches: [10],
        rating_min: 4.0,
        media_types: ['carbon_block']
      };

      const carbonList = this.logic.getCategoryProducts(cartridgeCategory.key, carbonFilters, 'price_asc', 1, 20);
      this.assert(carbonList && Array.isArray(carbonList.products), 'Carbon listing should return products');
      this.assert(carbonList.products.length > 0, 'Should find at least one carbon cartridge for stage 2');

      const carbonProduct = carbonList.products[0];
      const carbonDetails = this.logic.getProductDetails(carbonProduct.id);
      const addCarbonResult = this.logic.addToCart(carbonDetails.id, 1);
      this.assert(addCarbonResult && addCarbonResult.success === true, 'Should add carbon cartridge to cart');

      // Stage 3: Polishing / 1-micron equivalent cartridge
      let polishingFilters = {
        length_inches: [10],
        rating_min: 4.0,
        micron_ratings: [1]
      };

      let polishingList = this.logic.getCategoryProducts(cartridgeCategory.key, polishingFilters, 'price_asc', 1, 20);
      if (!polishingList || !Array.isArray(polishingList.products) || polishingList.products.length === 0) {
        // Fallback: any 10-inch cartridge with rating >= 4
        polishingFilters = {
          length_inches: [10],
          rating_min: 4.0
        };
        polishingList = this.logic.getCategoryProducts(cartridgeCategory.key, polishingFilters, 'price_asc', 1, 20);
      }

      this.assert(polishingList && Array.isArray(polishingList.products), 'Polishing listing should return products');
      this.assert(polishingList.products.length > 0, 'Should find at least one polishing-equivalent cartridge for stage 3');

      const polishingProduct = polishingList.products[0];
      const polishingDetails = this.logic.getProductDetails(polishingProduct.id);
      const addPolishingResult = this.logic.addToCart(polishingDetails.id, 1);
      this.assert(addPolishingResult && addPolishingResult.success === true, 'Should add polishing cartridge to cart');

      if (this.logic.getCartDetails) {
        const cart = this.logic.getCartDetails();
        this.assert(cart && Array.isArray(cart.items), 'Cart details should be available after assembling set');
        this.assert(cart.items.length >= 1, 'Cart should contain at least one line item after assembling set');
        const totalQuantity = cart.items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
        this.assert(totalQuantity >= 3, 'Cart should contain at least 3 cartridges in total for the 3-stage set');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Adapted - Buy three 4040 RO membranes equivalent (cheapest product under $350)
  testTask5_BuyThreeMembranesEquivalent() {
    const testName = 'Task 5: Buy three cheapest membrane-equivalent products under $350';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const query = 'cartridge';
      const filters = {
        price_max: 350
      };

      const searchResult = this.logic.searchProducts(query, filters, 'price_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.products), 'searchProducts should return products array for task 5');
      this.assert(searchResult.products.length > 0, 'Should find at least one product under $350 for task 5');

      const cheapestProduct = searchResult.products[0];
      const productDetails = this.logic.getProductDetails(cheapestProduct.id);

      const quantity = 3;
      const addResult = this.logic.addToCart(productDetails.id, quantity);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed for task 5');

      const addedItem = addResult.cart.items.find(function (item) {
        return item.product_id === productDetails.id;
      });
      this.assert(!!addedItem, 'Cart should contain membrane-equivalent product for task 5');
      this.assert(addedItem.quantity === quantity, 'Task 5 line item should have quantity ' + quantity);

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Compare conductivity meters and add the one with the widest measurement range (using comparison feature with available products)
  testTask6_CompareConductivityMetersAndAddWidest() {
    const testName = 'Task 6: Compare three products and add one with widest range / highest max conductivity';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      // Reset comparison state
      localStorage.setItem('comparison_lists', JSON.stringify([]));
      localStorage.setItem('comparison_items', JSON.stringify([]));

      const categories = this.logic.getCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getCategories should return categories for task 6');

      let instrumentationCategory = categories.find(function (c) { return c.key === 'instrumentation'; });
      if (!instrumentationCategory) {
        instrumentationCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; }) || categories[0];
      }

      if (this.logic.getCategoryFilterOptions) {
        const filterOptions = this.logic.getCategoryFilterOptions(instrumentationCategory.key);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Category filter options should be available for task 6');
      }

      const filters = {
        price_max: 500,
        rating_min: 4.0
      };

      const listResult = this.logic.getCategoryProducts(instrumentationCategory.key, filters, 'price_asc', 1, 20);
      this.assert(listResult && Array.isArray(listResult.products), 'getCategoryProducts should return products for task 6');
      this.assert(listResult.products.length >= 3, 'Should have at least three products to compare for task 6');

      const productsToCompare = listResult.products.slice(0, 3);

      for (let i = 0; i < productsToCompare.length; i++) {
        const p = productsToCompare[i];
        const compareResult = this.logic.addProductToComparison(p.id);
        this.assert(compareResult && compareResult.success === true, 'addProductToComparison should succeed for product ' + p.id);
      }

      const comparisonSummary = this.logic.getComparisonSummary();
      this.assert(comparisonSummary && typeof comparisonSummary.item_count === 'number', 'Comparison summary should be available');
      this.assert(comparisonSummary.item_count >= 3, 'Comparison summary should reflect at least three items');

      const comparisonDetails = this.logic.getComparisonDetails();
      this.assert(comparisonDetails && Array.isArray(comparisonDetails.products), 'Comparison details should include products');
      this.assert(comparisonDetails.products.length >= 3, 'Comparison list should contain at least three products');

      let selectedProductForCart = null;
      let bestRange = -Infinity;

      for (let i = 0; i < comparisonDetails.products.length; i++) {
        const prod = comparisonDetails.products[i];
        if (prod.is_highest_max_conductivity === true && !selectedProductForCart) {
          selectedProductForCart = prod;
        }
      }

      if (!selectedProductForCart) {
        for (let i = 0; i < comparisonDetails.products.length; i++) {
          const prod = comparisonDetails.products[i];
          let candidateMax = 0;
          if (typeof prod.max_conductivity === 'number') {
            candidateMax = prod.max_conductivity;
          } else if (typeof prod.measurement_range_max === 'number') {
            candidateMax = prod.measurement_range_max;
          }
          if (candidateMax > bestRange) {
            bestRange = candidateMax;
            selectedProductForCart = prod;
          }
        }
      }

      if (!selectedProductForCart) {
        selectedProductForCart = comparisonDetails.products[0];
      }

      const addResult = this.logic.addToCart(selectedProductForCart.product_id, 1);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed from comparison page flow');

      const addedItem = addResult.cart.items.find(function (item) {
        return item.product_id === selectedProductForCart.product_id;
      });
      this.assert(!!addedItem, 'Cart should contain product chosen from comparison list');
      this.assert(addedItem.quantity === 1, 'Comparison-selected item should have quantity 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Prepare a cart for a small hotel: softener system and three 25kg salt bags (adapted using available products)
  testTask7_PrepareCartForSmallHotelEquivalent() {
    const testName = 'Task 7: Prepare cart for small hotel equivalent (system + three salts)';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const categories = this.logic.getCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getCategories should return categories for task 7');

      let softenerCategory = categories.find(function (c) { return c.key === 'water_softeners'; });
      if (!softenerCategory) {
        softenerCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; }) || categories[0];
      }

      if (this.logic.getCategoryFilterOptions) {
        const filterOptions = this.logic.getCategoryFilterOptions(softenerCategory.key);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Category filter options should be available for task 7 (system)');
      }

      const systemFilters = {
        price_max: 2000
      };

      const systemList = this.logic.getCategoryProducts(softenerCategory.key, systemFilters, 'price_asc', 1, 20);
      this.assert(systemList && Array.isArray(systemList.products), 'System listing should return products for task 7');
      this.assert(systemList.products.length > 0, 'Should find at least one system-equivalent product for task 7');

      const systemProduct = systemList.products[0];
      const systemDetails = this.logic.getProductDetails(systemProduct.id);
      const addSystemResult = this.logic.addToCart(systemDetails.id, 1);
      this.assert(addSystemResult && addSystemResult.success === true, 'Should add system-equivalent product to cart for task 7');

      // Salt bags equivalent: cheapest products under $25
      const saltQuery = 'salt 25kg';
      const saltFilters = {
        price_max: 25
      };

      let saltSearchResult = this.logic.searchProducts(saltQuery, saltFilters, 'price_asc', 1, 20);
      if (!saltSearchResult || !Array.isArray(saltSearchResult.products) || saltSearchResult.products.length === 0) {
        // Fallback to cartridge filters under $25
        const fallbackCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; }) || softenerCategory;
        const fallbackSaltList = this.logic.getCategoryProducts(fallbackCategory.key, saltFilters, 'price_asc', 1, 20);
        saltSearchResult = {
          products: fallbackSaltList.products || []
        };
      }

      this.assert(saltSearchResult && Array.isArray(saltSearchResult.products), 'Salt-equivalent search should return products for task 7');
      this.assert(saltSearchResult.products.length > 0, 'Should find at least one salt-equivalent product for task 7');

      const saltProduct = saltSearchResult.products[0];
      const saltDetails = this.logic.getProductDetails(saltProduct.id);
      const saltQuantity = 3;
      const addSaltResult = this.logic.addToCart(saltDetails.id, saltQuantity);
      this.assert(addSaltResult && addSaltResult.success === true, 'Should add salt-equivalent product to cart for task 7');

      if (this.logic.getCartDetails) {
        const cart = this.logic.getCartDetails();
        this.assert(cart && Array.isArray(cart.items), 'Cart details should be available for task 7');
        const totalQuantity = cart.items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
        this.assert(totalQuantity >= 4, 'Cart should contain at least four items total (system + three salts) for task 7');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Keep only the cheapest 20-inch stainless filter housing and set quantity to 4 (adapted with available housings/equivalents)
  testTask8_KeepOnlyCheapestHousingAndSetQuantity() {
    const testName = 'Task 8: Keep only cheapest housing-equivalent product and set quantity to 4';
    console.log('Testing:', testName);

    try {
      if (this.logic.clearCart) {
        this.logic.clearCart();
      }

      const categories = this.logic.getCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getCategories should return categories for task 8');

      let housingCategory = categories.find(function (c) { return c.key === 'filter_housings'; });
      if (!housingCategory) {
        housingCategory = categories.find(function (c) { return c.key === 'cartridge_filters'; }) || categories[0];
      }

      if (this.logic.getCategoryFilterOptions) {
        const filterOptions = this.logic.getCategoryFilterOptions(housingCategory.key);
        this.assert(filterOptions !== null && typeof filterOptions === 'object', 'Category filter options should be available for task 8');
      }

      const filters = {
        price_max: 600
      };

      const housingList = this.logic.getCategoryProducts(housingCategory.key, filters, 'price_asc', 1, 20);
      this.assert(housingList && Array.isArray(housingList.products), 'Housing-equivalent listing should return products for task 8');
      this.assert(housingList.products.length >= 2, 'Should have at least two products for comparison in task 8');

      const firstHousing = housingList.products[0];
      const secondHousing = housingList.products[1];

      const firstDetails = this.logic.getProductDetails(firstHousing.id);
      const secondDetails = this.logic.getProductDetails(secondHousing.id);

      const addFirstResult = this.logic.addToCart(firstDetails.id, 1);
      this.assert(addFirstResult && addFirstResult.success === true, 'Should add first housing-equivalent product to cart');

      const addSecondResult = this.logic.addToCart(secondDetails.id, 1);
      this.assert(addSecondResult && addSecondResult.success === true, 'Should add second housing-equivalent product to cart');

      const cartAfterAdds = this.logic.getCartDetails();
      this.assert(cartAfterAdds && Array.isArray(cartAfterAdds.items), 'Cart details should be available after adding housings');

      const itemForFirst = cartAfterAdds.items.find(function (item) { return item.product_id === firstDetails.id; });
      const itemForSecond = cartAfterAdds.items.find(function (item) { return item.product_id === secondDetails.id; });
      this.assert(itemForFirst && itemForSecond, 'Cart should contain both housing-equivalent items');

      let cheaperItem = itemForFirst;
      let moreExpensiveItem = itemForSecond;

      if (itemForSecond.unit_price < itemForFirst.unit_price) {
        cheaperItem = itemForSecond;
        moreExpensiveItem = itemForFirst;
      }

      const removeResult = this.logic.removeCartItem(moreExpensiveItem.cart_item_id);
      this.assert(removeResult && removeResult.success === true, 'removeCartItem should succeed for more expensive housing-equivalent item');

      const updateResult = this.logic.updateCartItemQuantity(cheaperItem.cart_item_id, 4);
      this.assert(updateResult && updateResult.success === true, 'updateCartItemQuantity should succeed for cheaper housing-equivalent item');

      const updatedCart = updateResult.cart || this.logic.getCartDetails();
      this.assert(updatedCart && Array.isArray(updatedCart.items), 'Updated cart should be available for task 8');

      const remainingItem = updatedCart.items.find(function (item) {
        return item.product_id === cheaperItem.product_id;
      });
      this.assert(!!remainingItem, 'Cheaper housing-equivalent item should remain in cart');
      this.assert(remainingItem.quantity === 4, 'Cheaper item quantity should be updated to 4');

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

module.exports = TestRunner;
