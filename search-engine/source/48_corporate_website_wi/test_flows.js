'use strict';

// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js if needed
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem(key, value) {
          this._data[key] = String(value);
        },
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._data, key)
            ? this._data[key]
            : null;
        },
        removeItem(key) {
          delete this._data[key];
        },
        clear() {
          this._data = {};
        }
      };
    }

    // BusinessLogic instance is provided by the environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Initial clean + seed
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure if helper exists
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      categories: [
        {
          id: 'furniture',
          name: 'Furniture',
          category_code: 'furniture',
          description:
            'Desks, chairs, storage, and other office furniture solutions for modern workplaces.',
          url: 'category.html?categoryId=furniture'
        },
        {
          id: 'office_chairs',
          name: 'Office Chairs',
          category_code: 'office_chairs',
          parent_category_code: 'furniture',
          description:
            'Ergonomic, task, and executive office chairs designed for comfort and productivity.',
          url: 'category.html?categoryId=office_chairs'
        },
        {
          id: 'office_supplies',
          name: 'Office Supplies',
          category_code: 'office_supplies',
          description:
            'Everyday office essentials including paper, writing instruments, filing, and desk accessories.',
          url: 'category.html?categoryId=office_supplies'
        }
      ],
      products: [
        {
          id: 'prod_ergoplus_mesh_task_chair',
          name: 'ErgoPlus Mesh Task Chair',
          sku: 'CH-ERGO-100',
          status: 'active',
          category_code: 'office_chairs',
          product_type: 'office_chair',
          description:
            'High-back ergonomic mesh task chair with adjustable lumbar support, height-adjustable arms, and breathable mesh backrest.',
          image_url:
            'https://i.pinimg.com/originals/cd/78/be/cd78be0f863004f66837d4f90c174c1b.jpg',
          base_price: 229.99,
          currency: 'usd',
          rating_average: 4.8,
          rating_count: 275,
          color_options: ['Black', 'Gray', 'Blue'],
          default_color: 'Black',
          is_eco_certified: false,
          has_free_shipping: true,
          shipping_method_codes: [
            'standard_shipping_3_5_business_days',
            'expedited_shipping_1_2_business_days'
          ],
          chair_type: 'ergonomic',
          is_ergonomic: true,
          printer_technology: null,
          is_color_printing: false,
          has_duplex_printing: false,
          has_wifi_connectivity: false,
          paper_size: null,
          screen_size_inches: null,
          resolution_width: null,
          resolution_height: null,
          compatible_models: [],
          is_software: false,
          supports_demo_request: false,
          supports_quote_request: false,
          is_comparable: true,
          search_keywords: [
            'ergonomic office chair',
            'mesh chair',
            'lumbar support',
            'adjustable arms'
          ]
        },
        {
          id: 'prod_flexsupport_ergonomic_chair',
          name: 'FlexSupport Ergonomic Office Chair',
          sku: 'CH-ERGO-210',
          status: 'active',
          category_code: 'office_chairs',
          product_type: 'office_chair',
          description:
            'Mid-back ergonomic office chair with synchro-tilt mechanism, padded seat, and adjustable armrests for all-day comfort.',
          image_url:
            'https://chairsfx.com/wp-content/uploads/2020/05/best-ergonomic-office-chairs-for-back.jpg',
          base_price: 199.99,
          currency: 'usd',
          rating_average: 4.6,
          rating_count: 142,
          color_options: ['Black', 'Charcoal'],
          default_color: 'Black',
          is_eco_certified: false,
          has_free_shipping: true,
          shipping_method_codes: ['standard_shipping_3_5_business_days'],
          chair_type: 'ergonomic',
          is_ergonomic: true,
          printer_technology: null,
          is_color_printing: false,
          has_duplex_printing: false,
          has_wifi_connectivity: false,
          paper_size: null,
          screen_size_inches: null,
          resolution_width: null,
          resolution_height: null,
          compatible_models: [],
          is_software: false,
          supports_demo_request: false,
          supports_quote_request: false,
          is_comparable: true,
          search_keywords: [
            'ergonomic office chair',
            'synchro tilt',
            'mid-back chair'
          ]
        },
        {
          id: 'prod_budget_mesh_task_chair',
          name: 'Budget Mesh Task Chair',
          sku: 'CH-TASK-050',
          status: 'active',
          category_code: 'office_chairs',
          product_type: 'office_chair',
          description:
            'Affordable task chair with breathable mesh back and pneumatic height adjustment, ideal for home offices.',
          image_url:
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80',
          base_price: 149.99,
          currency: 'usd',
          rating_average: 4.2,
          rating_count: 88,
          color_options: ['Black'],
          default_color: 'Black',
          is_eco_certified: false,
          has_free_shipping: false,
          shipping_method_codes: ['standard_shipping_3_5_business_days'],
          chair_type: 'task_chair',
          is_ergonomic: true,
          printer_technology: null,
          is_color_printing: false,
          has_duplex_printing: false,
          has_wifi_connectivity: false,
          paper_size: null,
          screen_size_inches: null,
          resolution_width: null,
          resolution_height: null,
          compatible_models: [],
          is_software: false,
          supports_demo_request: false,
          supports_quote_request: false,
          is_comparable: true,
          search_keywords: [
            'task chair',
            'mesh office chair',
            'budget chair',
            'ergonomic'
          ]
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:12:58.142620'
      }
    };

    // Helper to merge existing and generated arrays by id, preserving generated exactly
    function mergeById(existing, incoming) {
      const map = {};
      for (const item of existing) {
        if (item && item.id) {
          map[item.id] = item;
        }
      }
      for (const item of incoming) {
        if (item && item.id) {
          map[item.id] = item;
        }
      }
      return Object.values(map);
    }

    // Copy categories using storage key 'categories'
    const existingCategories = JSON.parse(localStorage.getItem('categories') || '[]');
    const mergedCategories = mergeById(existingCategories, generatedData.categories);
    localStorage.setItem('categories', JSON.stringify(mergedCategories));

    // Copy products using storage key 'products'
    const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
    const mergedProducts = mergeById(existingProducts, generatedData.products);
    localStorage.setItem('products', JSON.stringify(mergedProducts));

    // Optionally store metadata for reference (not used by flows)
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  resetEnvironment() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddHighestRatedErgoChairUnder250();
    this.testTask2_RequestQuoteForCheapestProduct();
    this.testTask3_CreateCartWithThreeDifferentProducts();
    this.testTask4_SaveProductToSavedItems();
    this.testTask5_CompareProductsAndAddBestToCart();
    this.testTask6_AddTwoFilteredProductsToCart();
    this.testTask7_QuickOrderAndProceedToOrderSummary();
    this.testTask8_ScheduleDemoRequest();

    return this.results;
  }

  // Task 1
  // Add the highest-rated ergonomic office chair under $250 to the cart
  testTask1_AddHighestRatedErgoChairUnder250() {
    const testName = 'Task 1: Add highest-rated ergonomic office chair under $250 to cart';
    this.resetEnvironment();

    try {
      // Simulate navigation via category filters
      const navFilters = this.logic.getCategoryFilterOptions('office_chairs');
      this.assert(navFilters && typeof navFilters === 'object', 'Should get category filter options');

      // Get ergonomic chairs under $250 with rating >= 4, sorted by rating high to low
      const list = this.logic.getCategoryProducts(
        'office_chairs',
        {
          max_price: 250,
          min_rating: 4,
          chair_type: 'ergonomic'
        },
        'rating_high_to_low',
        1,
        20
      );

      this.assert(list && Array.isArray(list.products), 'Category products response should contain products array');
      this.assert(list.products.length > 0, 'Should find at least one ergonomic chair under $250');

      const selectedProduct = list.products[0];
      this.assert(
        selectedProduct.base_price <= 250,
        'Selected product should be priced at or below 250'
      );
      if (typeof selectedProduct.rating_average === 'number') {
        this.assert(
          selectedProduct.rating_average >= 4,
          'Selected product should have rating >= 4'
        );
      }

      // Product detail page
      const details = this.logic.getProductDetails(selectedProduct.id);
      this.assert(details && details.product, 'Should load product details');

      // Choose Black color if available, otherwise default/first
      let selectedColor = 'Black';
      const colorOptions = details.product.color_options || [];
      if (!colorOptions.includes('Black')) {
        selectedColor = details.product.default_color || colorOptions[0] || undefined;
      }

      // Add to cart with quantity 1
      const addResult = this.logic.addProductToCart(details.product.id, 1, selectedColor);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');
      this.assert(addResult.added_item, 'addProductToCart should return added_item');
      this.assert(
        addResult.added_item.product_id === details.product.id,
        'Cart item should reference the selected product'
      );
      this.assert(
        addResult.added_item.quantity === 1,
        'Cart item quantity should be 1'
      );
      if (selectedColor) {
        this.assert(
          addResult.added_item.selected_color === selectedColor,
          'Cart item selected_color should match chosen color'
        );
      }

      // Verify cart contents via getCart
      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'Should retrieve current cart');
      this.assert(Array.isArray(cartData.items), 'Cart items should be an array');

      const foundItem = cartData.items.find(
        (entry) => entry && entry.cart_item && entry.cart_item.product_id === details.product.id
      );
      this.assert(foundItem, 'Cart should contain the added ergonomic chair');
      this.assert(
        foundItem.cart_item.quantity === 1,
        'Cart should reflect quantity 1 for the added chair'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  // Adapted: Request a quote for the cheapest matching product found by search
  testTask2_RequestQuoteForCheapestProduct() {
    const testName = 'Task 2: Request quote for cheapest search result product';
    this.resetEnvironment();

    try {
      // Search from homepage header
      const filterOptions = this.logic.getSearchFilterOptions('chair');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get search filter options');

      // Search for chairs, cap max price to 400, sort by price low to high
      const searchResult = this.logic.searchProducts(
        'chair',
        {
          max_price: 400
        },
        'price_low_to_high',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.products), 'Search should return products array');
      this.assert(searchResult.products.length > 0, 'Search should return at least one product');

      const cheapestProduct = searchResult.products[0];
      this.assert(
        cheapestProduct.base_price <= 400,
        'Cheapest product should be at or below $400'
      );

      // Product detail page + quote eligibility
      const details = this.logic.getProductDetails(cheapestProduct.id);
      this.assert(details && details.product, 'Should load product details for quote');

      const quoteContext = this.logic.getQuoteRequestContext(details.product.id);
      this.assert(quoteContext && quoteContext.product, 'Should get quote request context');
      this.assert(
        quoteContext.product.id === details.product.id,
        'Quote context product should match selected product'
      );
      this.assert(
        typeof quoteContext.can_request_quote === 'boolean',
        'Quote context should indicate whether quote can be requested'
      );

      // Submit quote request for quantity 3
      const submitResult = this.logic.submitQuoteRequest(
        details.product.id,
        'Alex Smith',
        'Acme Corp',
        'alex.smith@example.com',
        3,
        ''
      );

      this.assert(submitResult && submitResult.success === true, 'submitQuoteRequest should succeed');
      const qr = submitResult.quote_request;
      this.assert(qr, 'submitQuoteRequest should return quote_request');
      this.assert(qr.product_id === details.product.id, 'QuoteRequest should reference selected product');
      this.assert(qr.customer_name === 'Alex Smith', 'QuoteRequest customer_name should match input');
      this.assert(qr.company === 'Acme Corp', 'QuoteRequest company should match input');
      this.assert(qr.email === 'alex.smith@example.com', 'QuoteRequest email should match input');
      this.assert(qr.quantity === 3, 'QuoteRequest quantity should be 3');
      this.assert(qr.status, 'QuoteRequest should have a status value');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  // Adapted: Create a cart with exactly 3 different products, each quantity 4
  testTask3_CreateCartWithThreeDifferentProducts() {
    const testName = 'Task 3: Create cart with exactly 3 different products (qty 4 each)';
    this.resetEnvironment();

    try {
      // Navigate to office chairs category from navigation
      const list = this.logic.getCategoryProducts('office_chairs', {}, 'price_low_to_high', 1, 20);
      this.assert(list && Array.isArray(list.products), 'Should get products for office_chairs category');
      this.assert(list.products.length >= 3, 'Should have at least 3 products to add');

      const selectedProducts = list.products.slice(0, 3);

      // Add each of the first three products with quantity 4
      for (const product of selectedProducts) {
        const details = this.logic.getProductDetails(product.id);
        this.assert(details && details.product, 'Should load product details before adding to cart');

        const defaultColor = details.product.default_color ||
          (Array.isArray(details.product.color_options) && details.product.color_options[0]) ||
          undefined;

        const addResult = this.logic.addProductToCart(details.product.id, 4, defaultColor);
        this.assert(addResult && addResult.success === true, 'addProductToCart should succeed for each product');
        this.assert(
          addResult.added_item.product_id === details.product.id,
          'Cart item should reference the product just added'
        );
        this.assert(
          addResult.added_item.quantity === 4,
          'Each cart item should have quantity 4'
        );
      }

      // Open the cart page and verify exactly 3 distinct items with correct quantities
      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'Should retrieve current cart after additions');
      this.assert(Array.isArray(cartData.items), 'Cart items should be array');
      this.assert(cartData.items.length === 3, 'Cart should contain exactly 3 items');

      const productIdSet = new Set();
      for (const entry of cartData.items) {
        this.assert(entry && entry.cart_item, 'Cart entry should contain cart_item');
        productIdSet.add(entry.cart_item.product_id);
        this.assert(
          entry.cart_item.quantity === 4,
          'Each cart item quantity should be 4'
        );
      }
      this.assert(productIdSet.size === 3, 'Cart should contain 3 different products');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  // Adapted: Save a searched ergonomic chair to the saved items (wishlist)
  testTask4_SaveProductToSavedItems() {
    const testName = 'Task 4: Save a search result product to saved items';
    this.resetEnvironment();

    try {
      // Search for an ergonomic chair
      let searchResult = this.logic.searchProducts('ergonomic chair', {}, 'relevance', 1, 20);
      if (!searchResult || !Array.isArray(searchResult.products) || searchResult.products.length === 0) {
        // Fallback to office_chairs category if search yields nothing
        const list = this.logic.getCategoryProducts('office_chairs', {}, 'rating_high_to_low', 1, 20);
        this.assert(list && Array.isArray(list.products) && list.products.length > 0, 'Should have products in office_chairs category');
        searchResult = { products: list.products };
      }

      const selectedProduct = searchResult.products[0];
      const details = this.logic.getProductDetails(selectedProduct.id);
      this.assert(details && details.product, 'Should load product details before saving');

      // Choose Black color if available
      let selectedColor = 'Black';
      const colorOptions = details.product.color_options || [];
      if (!colorOptions.includes('Black')) {
        selectedColor = details.product.default_color || colorOptions[0] || undefined;
      }

      // Add to saved items / wishlist
      const saveResult = this.logic.addProductToSavedItems(details.product.id, selectedColor);
      this.assert(saveResult && saveResult.success === true, 'addProductToSavedItems should succeed');
      const savedItem = saveResult.saved_item;
      this.assert(savedItem, 'addProductToSavedItems should return saved_item');
      this.assert(savedItem.product_id === details.product.id, 'SavedItem should reference selected product');
      if (selectedColor) {
        this.assert(
          savedItem.selected_color === selectedColor,
          'SavedItem selected_color should match chosen color'
        );
      }

      // Open Saved Items page and verify
      const savedItemsResult = this.logic.getSavedItems();
      this.assert(savedItemsResult && Array.isArray(savedItemsResult.saved_items), 'getSavedItems should return array');

      const foundEntry = savedItemsResult.saved_items.find(
        (entry) => entry && entry.saved_item && entry.saved_item.id === savedItem.id
      );
      this.assert(foundEntry, 'Saved items list should include the product just saved');
      this.assert(
        foundEntry.product && foundEntry.product.id === details.product.id,
        'Saved items entry should include matching product details'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  // Adapted: Compare two products from category and add the higher-rated one (qty 2) to cart with a selected shipping method
  testTask5_CompareProductsAndAddBestToCart() {
    const testName = 'Task 5: Compare two category products and add best one (qty 2) to cart';
    this.resetEnvironment();

    try {
      // Browse office chairs category
      const list = this.logic.getCategoryProducts('office_chairs', {}, 'rating_high_to_low', 1, 20);
      this.assert(list && Array.isArray(list.products), 'Should retrieve office chairs');
      this.assert(list.products.length >= 2, 'Should have at least two products to compare');

      const productA = list.products[0];
      const productB = list.products[1];

      // Add first two products to comparison set
      const cmpResult1 = this.logic.addProductToComparison(productA.id);
      this.assert(cmpResult1 && cmpResult1.success === true, 'First product should be added to comparison');

      const cmpResult2 = this.logic.addProductToComparison(productB.id);
      this.assert(cmpResult2 && cmpResult2.success === true, 'Second product should be added to comparison');

      // Open comparison view
      const comparisonView = this.logic.getCurrentProductComparison();
      this.assert(comparisonView && comparisonView.comparison, 'Should retrieve comparison entity');
      this.assert(Array.isArray(comparisonView.products), 'Comparison products should be array');

      const cmpProductIds = new Set(comparisonView.products.map((p) => p.id));
      this.assert(cmpProductIds.has(productA.id), 'Comparison should include first product');
      this.assert(cmpProductIds.has(productB.id), 'Comparison should include second product');

      // Decide which product is "better" based on rating_average (higher wins)
      const cmpProdA = comparisonView.products.find((p) => p.id === productA.id);
      const cmpProdB = comparisonView.products.find((p) => p.id === productB.id);

      const ratingA = typeof cmpProdA.rating_average === 'number' ? cmpProdA.rating_average : 0;
      const ratingB = typeof cmpProdB.rating_average === 'number' ? cmpProdB.rating_average : 0;

      const chosenProduct = ratingA >= ratingB ? cmpProdA : cmpProdB;

      // Product detail page of chosen product
      const details = this.logic.getProductDetails(chosenProduct.id);
      this.assert(details && details.product, 'Should load details for chosen product');

      // Choose a shipping method: standard if available, otherwise first available
      let shippingMethodCode;
      if (Array.isArray(details.available_shipping_methods) && details.available_shipping_methods.length > 0) {
        const standard = details.available_shipping_methods.find((m) =>
          m && typeof m.code === 'string' && m.code.indexOf('standard_shipping_3_5_business_days') !== -1
        );
        shippingMethodCode = (standard && standard.code) || details.available_shipping_methods[0].code;
      }

      // Add 2 units of this product to cart with selected shipping (if any)
      let addResult;
      if (shippingMethodCode) {
        addResult = this.logic.addProductToCart(details.product.id, 2, undefined, shippingMethodCode);
      } else {
        addResult = this.logic.addProductToCart(details.product.id, 2);
      }

      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed for chosen product');
      this.assert(addResult.added_item, 'addProductToCart should return added_item');
      this.assert(
        addResult.added_item.product_id === details.product.id,
        'Cart item should reference chosen product'
      );
      this.assert(addResult.added_item.quantity === 2, 'Cart item quantity should be 2');
      if (shippingMethodCode) {
        this.assert(
          addResult.added_item.shipping_method_code === shippingMethodCode,
          'Cart item shipping_method_code should match selected shipping method'
        );
      }

      // Optionally update shipping method again via updateCartItemShippingMethod to cover that API
      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'Should retrieve cart after adding chosen product');
      const cartEntry = cartData.items.find(
        (entry) => entry && entry.cart_item && entry.cart_item.product_id === details.product.id
      );
      this.assert(cartEntry, 'Cart should contain chosen product entry');

      if (shippingMethodCode) {
        const updateShipResult = this.logic.updateCartItemShippingMethod(
          cartEntry.cart_item.id,
          shippingMethodCode
        );
        this.assert(
          updateShipResult && updateShipResult.success === true,
          'updateCartItemShippingMethod should succeed'
        );
        this.assert(
          updateShipResult.updated_item.shipping_method_code === shippingMethodCode,
          'Updated cart item shipping_method_code should remain correct'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  // Adapted: Add two different ergonomic office chairs with free shipping and rating >= 4 to the cart
  testTask6_AddTwoFilteredProductsToCart() {
    const testName = 'Task 6: Add two filtered products (ergonomic, free shipping, 4+ stars) to cart';
    this.resetEnvironment();

    try {
      // Filter office chairs: ergonomic, free shipping, rating >= 4
      const list = this.logic.getCategoryProducts(
        'office_chairs',
        {
          chair_type: 'ergonomic',
          has_free_shipping: true,
          min_rating: 4
        },
        'rating_high_to_low',
        1,
        20
      );

      this.assert(list && Array.isArray(list.products), 'Should retrieve filtered office chairs');
      this.assert(list.products.length >= 2, 'Should have at least two products matching filters');

      const firstProduct = list.products[0];
      const secondProduct = list.products[1];

      // First product: quantity 3
      const details1 = this.logic.getProductDetails(firstProduct.id);
      this.assert(details1 && details1.product, 'Should load details for first filtered product');
      const color1 = details1.product.default_color ||
        (Array.isArray(details1.product.color_options) && details1.product.color_options[0]) ||
        undefined;

      const addResult1 = this.logic.addProductToCart(details1.product.id, 3, color1);
      this.assert(addResult1 && addResult1.success === true, 'First addProductToCart should succeed');
      this.assert(addResult1.added_item.quantity === 3, 'First cart item quantity should be 3');

      // Second product: quantity 2
      const details2 = this.logic.getProductDetails(secondProduct.id);
      this.assert(details2 && details2.product, 'Should load details for second filtered product');
      const color2 = details2.product.default_color ||
        (Array.isArray(details2.product.color_options) && details2.product.color_options[0]) ||
        undefined;

      const addResult2 = this.logic.addProductToCart(details2.product.id, 2, color2);
      this.assert(addResult2 && addResult2.success === true, 'Second addProductToCart should succeed');
      this.assert(addResult2.added_item.quantity === 2, 'Second cart item quantity should be 2');

      // Verify both items exist in cart with correct quantities
      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'Should retrieve cart after adding two filtered products');
      this.assert(Array.isArray(cartData.items), 'Cart items should be array');

      const entry1 = cartData.items.find(
        (entry) => entry && entry.cart_item && entry.cart_item.product_id === details1.product.id
      );
      const entry2 = cartData.items.find(
        (entry) => entry && entry.cart_item && entry.cart_item.product_id === details2.product.id
      );

      this.assert(entry1, 'Cart should contain first filtered product');
      this.assert(entry2, 'Cart should contain second filtered product');
      this.assert(entry1.cart_item.quantity === 3, 'First filtered product should have quantity 3');
      this.assert(entry2.cart_item.quantity === 2, 'Second filtered product should have quantity 2');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  // Adapted: Use quick order by SKU to add 50 units of a product and proceed to order summary with invoice payment
  testTask7_QuickOrderAndProceedToOrderSummary() {
    const testName = 'Task 7: Quick order by SKU, then proceed to order summary with invoice payment';
    this.resetEnvironment();

    try {
      // Use first product in storage as quick-order target
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      this.assert(Array.isArray(products) && products.length > 0, 'Should have products in storage');

      const targetProduct = products[0];
      const targetSku = targetProduct.sku;

      // Preview quick order entry
      const entries = [
        {
          sku: targetSku,
          quantity: 50
        }
      ];

      const preview = this.logic.previewQuickOrderEntries(entries);
      this.assert(preview && Array.isArray(preview.lines), 'previewQuickOrderEntries should return lines');
      this.assert(preview.lines.length === 1, 'Preview should contain exactly one line');

      const line = preview.lines[0];
      this.assert(line.input && line.input.sku === targetSku, 'Preview line input sku should match target');
      this.assert(line.input.quantity === 50, 'Preview line input quantity should be 50');
      this.assert(line.product_found === true, 'Preview should find the product by SKU');
      this.assert(line.product && line.product.id === targetProduct.id, 'Preview product id should match target product');

      // Add quick order items to cart
      const addQuickResult = this.logic.addQuickOrderItemsToCart(entries);
      this.assert(addQuickResult && addQuickResult.success === true, 'addQuickOrderItemsToCart should succeed');
      this.assert(addQuickResult.cart, 'addQuickOrderItemsToCart should return cart');
      this.assert(Array.isArray(addQuickResult.added_items), 'added_items should be array');
      this.assert(addQuickResult.added_items.length === 1, 'Should add exactly one cart item from quick order');

      const addedItem = addQuickResult.added_items[0];
      this.assert(addedItem.product_id, 'Added cart item should have product_id');
      this.assert(addedItem.quantity === 50, 'Added cart item quantity should be 50');

      // Verify via getCart
      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'Should retrieve cart after quick order');
      this.assert(Array.isArray(cartData.items), 'Cart items should be array');

      const foundEntry = cartData.items.find(
        (entry) => entry && entry.cart_item && entry.cart_item.product_id === addedItem.product_id
      );
      this.assert(foundEntry, 'Cart should contain item added via quick order');
      this.assert(foundEntry.cart_item.quantity === 50, 'Cart quantity for quick order item should be 50');

      // Proceed to checkout
      const checkoutInit = this.logic.proceedToCheckout();
      this.assert(checkoutInit && checkoutInit.success === true, 'proceedToCheckout should succeed');
      this.assert(checkoutInit.checkout_session, 'proceedToCheckout should return checkout_session');
      this.assert(checkoutInit.cart && checkoutInit.cart.id === cartData.cart.id, 'Checkout cart should match current cart');
      this.assert(
        Array.isArray(checkoutInit.available_payment_methods),
        'Checkout should expose available payment methods'
      );

      // Select Business Invoice payment method
      const updatePayment = this.logic.updatePaymentMethod('business_invoice');
      this.assert(updatePayment && updatePayment.success === true, 'updatePaymentMethod should succeed');
      this.assert(
        updatePayment.checkout_session &&
          updatePayment.checkout_session.payment_method === 'business_invoice',
        'Payment method should be set to business_invoice'
      );

      // Continue to order summary
      const summaryResult = this.logic.continueToOrderSummary();
      this.assert(summaryResult && summaryResult.success === true, 'continueToOrderSummary should succeed');
      this.assert(summaryResult.order_summary, 'Order summary should be returned');
      this.assert(
        summaryResult.order_summary.cart &&
          summaryResult.order_summary.cart.id === cartData.cart.id,
        'Order summary cart should match original cart'
      );
      this.assert(
        typeof summaryResult.order_summary.payment_method_label === 'string',
        'Order summary should include payment_method_label'
      );
      this.assert(summaryResult.order_summary.currency, 'Order summary should include currency');

      // Retrieve order summary again via dedicated API
      const summaryView = this.logic.getOrderSummary();
      this.assert(summaryView && summaryView.order_summary, 'getOrderSummary should return order summary');
      this.assert(
        summaryView.order_summary.cart &&
          summaryView.order_summary.cart.id === cartData.cart.id,
        'getOrderSummary cart should match'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  // Adapted: Schedule a demo request for a selected category product
  testTask8_ScheduleDemoRequest() {
    const testName = 'Task 8: Schedule a demo request for a selected product';
    this.resetEnvironment();

    try {
      // Use navigation categories to locate office chairs (as stand-in for analytics software)
      const nav = this.logic.getMainNavigationCategories();
      this.assert(nav && typeof nav === 'object', 'Should retrieve main navigation categories');

      let officeChairsCategory = null;
      if (Array.isArray(nav.top_level_categories)) {
        officeChairsCategory = nav.top_level_categories.find(
          (c) => c && c.category_code === 'office_chairs'
        );
      }
      if (!officeChairsCategory && Array.isArray(nav.featured_subcategories)) {
        officeChairsCategory = nav.featured_subcategories.find(
          (c) => c && c.category_code === 'office_chairs'
        );
      }

      // Fallback: read from localStorage if not found via navigation
      if (!officeChairsCategory) {
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        officeChairsCategory = categories.find((c) => c && c.category_code === 'office_chairs');
      }
      this.assert(officeChairsCategory, 'Should resolve office_chairs category');

      // Treat first office chair as the product for which we request a demo
      const list = this.logic.getCategoryProducts('office_chairs', {}, 'relevance', 1, 20);
      this.assert(list && Array.isArray(list.products) && list.products.length > 0, 'Should load products in office_chairs');

      const demoProduct = list.products[0];
      const details = this.logic.getProductDetails(demoProduct.id);
      this.assert(details && details.product, 'Should load product details for demo request');

      // Get demo request context
      const ctx = this.logic.getDemoRequestContext(details.product.id);
      this.assert(ctx && ctx.product, 'getDemoRequestContext should return product');
      this.assert(
        ctx.product.id === details.product.id,
        'Demo request context product should match selected product'
      );
      this.assert(
        Array.isArray(ctx.available_time_slots),
        'Demo request context should expose available_time_slots'
      );

      // Use standard 10:00 AM slot if available, otherwise first available slot
      let timeSlot = '10_00_am';
      if (!ctx.available_time_slots.includes('10_00_am') && ctx.available_time_slots.length > 0) {
        timeSlot = ctx.available_time_slots[0];
      }

      // Preferred date 2026-04-15
      const submitDemo = this.logic.submitDemoRequest(
        details.product.id,
        'Jordan Lee',
        'jordan.lee@example.com',
        '2026-04-15',
        timeSlot,
        5
      );

      this.assert(submitDemo && submitDemo.success === true, 'submitDemoRequest should succeed');
      const demoReq = submitDemo.demo_request;
      this.assert(demoReq, 'submitDemoRequest should return demo_request');
      this.assert(demoReq.product_id === details.product.id, 'DemoRequest should reference selected product');
      this.assert(demoReq.full_name === 'Jordan Lee', 'DemoRequest full_name should match input');
      this.assert(
        demoReq.work_email === 'jordan.lee@example.com',
        'DemoRequest work_email should match input'
      );
      this.assert(demoReq.number_of_attendees === 5, 'DemoRequest number_of_attendees should be 5');
      this.assert(demoReq.preferred_date, 'DemoRequest should have preferred_date set');
      this.assert(demoReq.preferred_time_slot === timeSlot, 'DemoRequest preferred_time_slot should match');
      this.assert(demoReq.status, 'DemoRequest should have a status value');

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
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
