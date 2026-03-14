// Test runner for business logic integration flows
'use strict';

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and set up generated data once at construction
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "equipment_categories": [
        {
          "id": "all_equipment",
          "name": "All Equipment",
          "description": "Browse the full range of lifting and hoisting equipment available for short- and long-term hire.",
          "image": "https://bhwgroup.com/wp-content/uploads/2018/08/Lifting-Equipment-Hire.jpg"
        },
        {
          "id": "electric_chain_hoists",
          "name": "Electric Chain Hoists",
          "description": "Powered chain hoists for efficient lifting on industrial and construction sites, including indoor and outdoor-rated models.",
          "image": "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "manual_chain_hoists",
          "name": "Manual Chain Hoists",
          "description": "Hand chain blocks for precise lifting and positioning where power is not available or not preferred.",
          "image": "https://jirorwxhlinrlm5p.ldycdn.com/cloud/lnBqkKjnRlmSkmklikoq/Manual-Chain-Hoist3.jpg"
        }
      ],
      "resource_articles": [
        {
          "id": "ra_001",
          "title": "Electric Hoist Safety Checklist for Site Supervisors",
          "categoryId": "safety_guides",
          "resourceType": "safety_guide",
          "summary": "A practical electric hoist safety checklist covering pre-use inspection, safe operation and shutdown procedures.",
          "content": "This safety guide provides a step-by-step electric hoist safety checklist designed for site supervisors and operators. It covers verification of rated capacity, inspection of chains and hooks, testing of limit switches, checking emergency stop functionality, and verifying power supply and IP rating suitability for the environment. The guide also outlines safe lifting practices, including correct use of slings, avoiding side-loading, exclusion zones under suspended loads, and clear communication via hand signals or radios. A printable checklist is included to support daily pre-start checks and toolbox talks.",
          "slug": "electric-hoist-safety-checklist-site-supervisors",
          "tags": [
            "electric hoist safety",
            "checklist",
            "pre-use inspection",
            "site supervision"
          ],
          "createdAt": "2025-06-10T09:15:00Z"
        },
        {
          "id": "ra_002",
          "title": "Electric Hoist Safety Fundamentals: IP Ratings and Enclosures",
          "categoryId": "safety_guides",
          "resourceType": "safety_guide",
          "summary": "Understand IP ratings, weather protection and enclosure requirements when using electric hoists outdoors.",
          "content": "Selecting an electric hoist for outdoor use requires careful consideration of IP ratings and enclosure design. This guide explains the difference between IP54, IP55, IP65 and higher ratings, and how dust and water ingress protection affects long-term reliability and safety. It highlights typical hazards such as moisture in pendant controls, corrosion on terminals and condensation within motors. The guide provides recommendations for positioning control boxes, routing cables, and performing regular visual checks on seals and gaskets. It also covers the importance of RCD protection and lockable isolators when installing hoists in exposed locations.",
          "slug": "electric-hoist-safety-fundamentals-ip-ratings",
          "tags": [
            "electric hoist safety",
            "ip65",
            "outdoor rated",
            "enclosures"
          ],
          "createdAt": "2025-02-18T14:40:00Z"
        },
        {
          "id": "ra_003",
          "title": "Manual Chain Hoist Safety Basics for New Operators",
          "categoryId": "safety_guides",
          "resourceType": "safety_guide",
          "summary": "An introductory guide to safe use of manual chain blocks, including pre-use checks and operating technique.",
          "content": "Manual chain hoists, or chain blocks, are simple but powerful lifting devices. This guide covers the fundamentals of safe operation: confirming the rated capacity against the load, checking the identification plate, and ensuring the top suspension point is properly rated and secure. It details pre-use inspection steps for hand chain, load chain and hooks, explains how to avoid side loading and shock loading, and provides guidance on correct body positioning to reduce strain injuries. The guide also clarifies when to remove a hoist from service and how to report defects under local lifting regulations.",
          "slug": "manual-chain-hoist-safety-basics",
          "tags": [
            "manual chain hoist",
            "safety guide",
            "pre-use inspection",
            "lifting operations"
          ],
          "createdAt": "2024-11-05T08:20:00Z"
        }
      ],
      "products": [
        {
          "id": "ech_2t_compact_ip65",
          "name": "2t Compact Electric Chain Hoist (IP65)",
          "categoryId": "electric_chain_hoists",
          "hoistType": "electric_chain_hoist",
          "powerSource": "electric",
          "capacityTonnes": 2,
          "compatibleHoistCapacityTonnes": 0,
          "liftHeightMeters": 12,
          "standardChainLengthMeters": 6,
          "weightKg": 120,
          "environment": "indoor_outdoor",
          "ipRating": "ip65",
          "dailyRate": 95,
          "availabilityStatus": "in_stock",
          "description": "Compact 2-ton electric chain hoist with IP65 protection for indoor and outdoor use. Ideal for short-term site lifts and plant maintenance where weather exposure is possible.",
          "images": [
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=2t+Compact+Electric+Hoist",
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Side+View+2t+Hoist"
          ],
          "specsTable": "{\"capacity_tonnes\":2,\"duty_class\":\"FEM 2m\",\"voltage\":\"415V 3ph\",\"lift_height_m\":12,\"chain_diameter_mm\":8,\"ip_rating\":\"IP65\",\"suspension\":\"hook or trolley\"}",
          "ratingCount": 0,
          "ratingAverage": null
        },
        {
          "id": "ech_2t_indoor_standard",
          "name": "2t Standard Electric Chain Hoist",
          "categoryId": "electric_chain_hoists",
          "hoistType": "electric_chain_hoist",
          "powerSource": "electric",
          "capacityTonnes": 2,
          "compatibleHoistCapacityTonnes": 0,
          "liftHeightMeters": 9,
          "standardChainLengthMeters": 6,
          "weightKg": 135,
          "environment": "indoor",
          "ipRating": "ip54",
          "dailyRate": 110,
          "availabilityStatus": "limited_stock",
          "description": "Robust 2-ton electric chain hoist for workshops and factories where a reliable indoor lifting solution is required.",
          "images": [
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=2t+Standard+Electric+Hoist",
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Control+Pendant"
          ],
          "specsTable": "{\"capacity_tonnes\":2,\"duty_class\":\"FEM 1Bm\",\"voltage\":\"400-415V 3ph\",\"lift_height_m\":9,\"chain_diameter_mm\":7.1,\"ip_rating\":\"IP54\",\"speed_m_per_min\":8}",
          "ratingCount": 0,
          "ratingAverage": null
        },
        {
          "id": "ech_3t_hoist_a",
          "name": "3t Electric Chain Hoist \u2013 Workshop",
          "categoryId": "electric_chain_hoists",
          "hoistType": "electric_chain_hoist",
          "powerSource": "electric",
          "capacityTonnes": 3,
          "compatibleHoistCapacityTonnes": 0,
          "liftHeightMeters": 9,
          "standardChainLengthMeters": 6,
          "weightKg": 145,
          "environment": "indoor",
          "ipRating": "ip54",
          "dailyRate": 120,
          "availabilityStatus": "in_stock",
          "description": "3-ton electric chain hoist suited to workshop and light industrial duty cycles, supplied with pendant control and chain container.",
          "images": [
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=3t+Workshop+Hoist+A",
            "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=3t+Hoist+Pendant"
          ],
          "specsTable": "{\"capacity_tonnes\":3,\"duty_class\":\"FEM 2m\",\"voltage\":\"415V 3ph\",\"lift_height_m\":9,\"chain_diameter_mm\":10,\"ip_rating\":\"IP54\",\"suspension\":\"top hook\"}",
          "ratingCount": 0,
          "ratingAverage": null
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:12:22.336570"
      }
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('equipment_categories', JSON.stringify(generatedData.equipment_categories || []));
      localStorage.setItem('resource_articles', JSON.stringify(generatedData.resource_articles || []));
      localStorage.setItem('products', JSON.stringify(generatedData.products || []));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_HireCheapestElectricHoistDepotPickup();
    this.testTask2_HireTwoHoistsWeekendStandardDelivery();
    this.testTask3_CreateQuoteForTwoItemsFiveDays();
    this.testTask4_SaveLightestHoistToWishlistViaComparison();
    this.testTask5_ProceedToGuestCheckoutWithAddress();
    this.testTask6_RegisterAccountAndSaveSafetyGuide();
    this.testTask7_CompareHoistsAndHireLongestChain();
    this.testTask8_HireOutdoorRatedHoistWithSiteDelivery();

    console.log('Finished flow tests.');
    return this.results;
  }

  // ===== Task 1 =====
  // Adapted: Hire the cheapest 2+ tonne electric chain hoist for 3 days next week with depot pickup
  testTask1_HireCheapestElectricHoistDepotPickup() {
    const testName = 'Task 1: Hire cheapest electric hoist (3 days, depot pickup)';

    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate via homepage categories
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && Array.isArray(homepage.categories), 'Homepage should provide categories');

      const categories = homepage.categories;
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      // Get filter/sort options for the category
      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);
      this.assert(filterOptions && Array.isArray(filterOptions.sortOptions), 'Sort options should be available for category');

      // Compute next Monday-Wednesday (3-day hire)
      const today = new Date();
      const nextMonday = this.getNextWeekday(today, 1); // 1 = Monday
      const hireStart = nextMonday;
      const hireEnd = this.addDays(hireStart, 2); // Monday -> Wednesday (3 days)
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      // Choose sort option for Daily Rate: Low to High if available
      let sortBy;
      if (filterOptions.sortOptions && filterOptions.sortOptions.length > 0) {
        const sortByLabel = filterOptions.sortOptions.find(function (opt) {
          return opt.label && /daily rate/i.test(opt.label) && /low/i.test(opt.label);
        });
        const sortByValue = filterOptions.sortOptions.find(function (opt) {
          return opt.value && /daily_rate_asc/i.test(opt.value);
        });
        const chosenSort = sortByLabel || sortByValue || filterOptions.sortOptions[0];
        sortBy = chosenSort && chosenSort.value;
      }

      const filters = {
        capacityTonnesMin: 2,
        powerSource: 'electric'
      };

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        filters,
        hireStartIso,
        hireEndIso,
        sortBy
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length > 0, 'Should have at least one matching electric hoist');

      // Verify filters applied in results
      categoryProducts.products.forEach((entry) => {
        const p = entry.product;
        if (typeof p.capacityTonnes === 'number') {
          this.assert(p.capacityTonnes >= 2, 'Product capacityTonnes should be >= 2');
        }
        if (p.powerSource) {
          this.assert(p.powerSource === 'electric', 'Product powerSource should be electric');
        }
      });

      const firstEntry = categoryProducts.products[0];
      const firstProduct = firstEntry.product;

      // Verify first product is cheapest by dailyRate among results
      const minDailyRate = Math.min.apply(
        null,
        categoryProducts.products.map(function (e) { return e.product.dailyRate; })
      );
      this.assert(firstProduct.dailyRate === minDailyRate,
        'First product should have minimum dailyRate among filtered results');

      // Open product detail page (via API)
      const productId = firstProduct.id;
      const productDetails = this.logic.getProductDetails(productId, hireStartIso, hireEndIso);
      this.assert(productDetails && productDetails.product && productDetails.product.id === productId,
        'Product details should match selected product');

      // Add to cart for selected dates (quantity 1)
      const addResult = this.logic.addProductToCart(productId, 1, hireStartIso, hireEndIso);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');
      this.assert(addResult.cart && Array.isArray(addResult.cartItems), 'addProductToCart should return cart and cartItems');

      const addedCartItem = addResult.cartItems.find(function (ci) {
        return ci.productId === productId;
      });
      this.assert(addedCartItem, 'Added cart item should be present');
      this.assert(addedCartItem.quantity === 1, 'Cart item quantity should be 1');
      this.assert(addedCartItem.hireStartDate === hireStartIso, 'Cart item hireStartDate should match requested');
      this.assert(addedCartItem.hireEndDate === hireEndIso, 'Cart item hireEndDate should match requested');
      this.assert(typeof addedCartItem.hireDurationDays === 'number' && addedCartItem.hireDurationDays >= 1,
        'Cart item hireDurationDays should be positive');
      this.assert(addedCartItem.dailyRateSnapshot === firstProduct.dailyRate,
        'Cart item dailyRateSnapshot should equal product.dailyRate');

      // Set delivery method to depot pickup
      const deliveryResult = this.logic.setCartDeliveryMethod('depot_pickup');
      this.assert(deliveryResult && deliveryResult.cart, 'setCartDeliveryMethod should return cart');
      this.assert(deliveryResult.cart.deliveryMethod === 'depot_pickup', 'Cart deliveryMethod should be depot_pickup');

      // Verify cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items),
        'getCartSummary should return cart and items');
      this.assert(cartSummary.items.length === 1, 'Cart should contain exactly one item');

      const summaryItem = cartSummary.items[0];
      this.assert(summaryItem.cartItem.productId === productId, 'Cart summary item should be selected product');

      const summaryProduct = summaryItem.product;
      if (summaryProduct && typeof summaryProduct.capacityTonnes === 'number') {
        this.assert(summaryProduct.capacityTonnes >= 2, 'Summary product capacity should be >= 2');
      }
      if (summaryProduct && summaryProduct.hoistType) {
        this.assert(summaryProduct.hoistType === 'electric_chain_hoist', 'Summary product hoistType should be electric_chain_hoist');
      }
      this.assert(cartSummary.cart.deliveryMethod === 'depot_pickup', 'Cart summary deliveryMethod should be depot_pickup');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 2 =====
  // Adapted: Hire two electric chain hoists for upcoming weekend under a configurable rate with standard delivery
  testTask2_HireTwoHoistsWeekendStandardDelivery() {
    const testName = 'Task 2: Hire two hoists for weekend with standard delivery';

    try {
      this.clearStorage();
      this.setupTestData();

      // Navigate to category (adapted to electric_chain_hoists due to available products)
      const categories = this.logic.getEquipmentCategories();
      this.assert(Array.isArray(categories), 'getEquipmentCategories should return an array');

      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);
      this.assert(filterOptions && filterOptions.dailyRateRange,
        'Category filter options should include dailyRateRange');

      // Determine upcoming Saturday-Sunday
      const today = new Date();
      const weekend = this.getUpcomingWeekend(today);
      const hireStart = weekend.saturday;
      const hireEnd = weekend.sunday; // 2-day weekend hire
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      // Set price and rating filters in a way that guarantees at least one result
      const maxDailyRate = filterOptions.dailyRateRange.max || 200;
      const filters = {
        dailyRateMax: maxDailyRate,
        powerSource: 'electric'
      };

      // Select sort by daily_rate_asc if present to roughly pick cheapest
      let sortBy;
      if (filterOptions.sortOptions && filterOptions.sortOptions.length > 0) {
        const byValue = filterOptions.sortOptions.find(function (opt) {
          return opt.value && /daily_rate_asc/i.test(opt.value);
        });
        sortBy = (byValue || filterOptions.sortOptions[0]).value;
      }

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        filters,
        hireStartIso,
        hireEndIso,
        sortBy
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length > 0, 'Should have at least one hoist for weekend');

      const firstEntry = categoryProducts.products[0];
      const product = firstEntry.product;
      const productId = product.id;

      // Open product details
      const productDetails = this.logic.getProductDetails(productId, hireStartIso, hireEndIso);
      this.assert(productDetails && productDetails.product && productDetails.product.id === productId,
        'Product details should match selected product');

      // Add quantity 2 for weekend
      const addResult = this.logic.addProductToCart(productId, 2, hireStartIso, hireEndIso);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');

      const addedCartItem = addResult.cartItems.find(function (ci) {
        return ci.productId === productId;
      });
      this.assert(addedCartItem, 'Added cart item should be present');
      this.assert(addedCartItem.quantity === 2, 'Cart item quantity should be 2');
      this.assert(addedCartItem.hireStartDate === hireStartIso, 'Hire start should be Saturday');
      this.assert(addedCartItem.hireEndDate === hireEndIso, 'Hire end should be Sunday');
      this.assert(addedCartItem.dailyRateSnapshot <= maxDailyRate,
        'Daily rate snapshot should be at or below filtered maximum');

      // Set delivery method to standard_delivery
      const deliveryResult = this.logic.setCartDeliveryMethod('standard_delivery');
      this.assert(deliveryResult && deliveryResult.cart, 'setCartDeliveryMethod should return cart');
      this.assert(deliveryResult.cart.deliveryMethod === 'standard_delivery',
        'Cart deliveryMethod should be standard_delivery');

      // Verify via cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should have items');

      const summaryItem = cartSummary.items.find(function (item) {
        return item.cartItem.productId === productId;
      });
      this.assert(summaryItem, 'Cart summary should contain the hired hoist');
      this.assert(summaryItem.cartItem.quantity === 2, 'Cart summary quantity should be 2');
      this.assert(cartSummary.cart.deliveryMethod === 'standard_delivery',
        'Cart summary deliveryMethod should be standard_delivery');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 3 =====
  // Adapted: Create a hire quote for two different hoists for 5 days with postcode 10001
  testTask3_CreateQuoteForTwoItemsFiveDays() {
    const testName = 'Task 3: Create quote for two items with common 5-day hire and postcode';

    try {
      this.clearStorage();
      this.setupTestData();

      // Use electric_chain_hoists category to select two products
      const categories = this.logic.getEquipmentCategories();
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const today = new Date();
      const hireStart = this.addDays(today, 7); // a week from now
      const hireEnd = this.addDays(hireStart, 4); // 5 consecutive days
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        undefined,
        hireStartIso,
        hireEndIso,
        undefined
      );
      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length >= 2, 'Need at least two products for quote');

      const product1 = categoryProducts.products[0].product;
      const product2 = categoryProducts.products[1].product;

      // Add first product to quote
      const quoteAdd1 = this.logic.addProductToQuote(product1.id, 1);
      this.assert(quoteAdd1 && quoteAdd1.quoteBasket && Array.isArray(quoteAdd1.quoteItems),
        'addProductToQuote should return quoteBasket and items');
      const quoteBasketId = quoteAdd1.quoteBasket.id;

      // Add second product to quote
      const quoteAdd2 = this.logic.addProductToQuote(product2.id, 1);
      this.assert(quoteAdd2.quoteBasket.id === quoteBasketId,
        'Second quote addition should use same quote basket');

      // Verify both items present via getQuoteBasket
      const quoteBasketData = this.logic.getQuoteBasket();
      this.assert(quoteBasketData && quoteBasketData.quoteBasket && Array.isArray(quoteBasketData.items),
        'getQuoteBasket should return basket and items');
      this.assert(quoteBasketData.quoteBasket.id === quoteBasketId, 'Quote basket ID should match');
      this.assert(quoteBasketData.items.length === 2, 'Quote basket should contain exactly two items');

      const quoteItemProductIds = quoteBasketData.items.map(function (item) {
        return item.quoteItem.productId;
      });
      this.assert(quoteItemProductIds.indexOf(product1.id) !== -1, 'Quote should include first product');
      this.assert(quoteItemProductIds.indexOf(product2.id) !== -1, 'Quote should include second product');

      // Set common 5-day hire period for all items
      const setPeriodResult = this.logic.setQuoteCommonHirePeriod(hireStartIso, hireEndIso);
      this.assert(setPeriodResult && Array.isArray(setPeriodResult.quoteItems),
        'setQuoteCommonHirePeriod should return updated items');

      setPeriodResult.quoteItems.forEach((qi) => {
        this.assert(qi.hireStartDate === hireStartIso, 'Quote item hireStartDate should match common start');
        this.assert(qi.hireEndDate === hireEndIso, 'Quote item hireEndDate should match common end');
        this.assert(typeof qi.hireDurationDays === 'number' && qi.hireDurationDays >= 1,
          'Quote item hireDurationDays should be positive');
      });

      // Set postcode 10001
      const postcodeResult = this.logic.setQuoteSitePostcode('10001');
      this.assert(postcodeResult && postcodeResult.quoteBasket, 'setQuoteSitePostcode should return quoteBasket');
      this.assert(postcodeResult.quoteBasket.sitePostcode === '10001', 'Quote basket sitePostcode should be 10001');

      // Submit quote request
      const submitResult = this.logic.submitQuoteRequest('Jordan Lee', 'jordan.lee@example.com', 'Integration test quote request');
      this.assert(submitResult && submitResult.success === true, 'submitQuoteRequest should succeed');
      this.assert(submitResult.quoteBasket && submitResult.quoteBasket.id === quoteBasketId,
        'Submitted quoteBasket ID should match original');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 4 =====
  // Adapted: Compare three electric hoists under $150/day, pick lightest and save to wishlist
  testTask4_SaveLightestHoistToWishlistViaComparison() {
    const testName = 'Task 4: Save lightest hoist under $150/day to wishlist via comparison';

    try {
      this.clearStorage();
      this.setupTestData();

      const categories = this.logic.getEquipmentCategories();
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);
      const maxDailyRate = (filterOptions.dailyRateRange && filterOptions.dailyRateRange.max) || 150;

      const filters = {
        dailyRateMax: maxDailyRate,
        powerSource: 'electric'
      };

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        filters,
        undefined,
        undefined,
        undefined
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length >= 1, 'At least one hoist should be available under daily rate limit');

      // Select up to first three products for comparison
      const compareEntries = categoryProducts.products.slice(0, 3);
      this.assert(compareEntries.length >= 1, 'Need at least one product to compare');

      compareEntries.forEach((entry) => {
        const addComp = this.logic.addProductToComparison(entry.product.id);
        this.assert(addComp && addComp.comparisonSet && Array.isArray(addComp.comparisonSet.productIds),
          'addProductToComparison should return comparisonSet');
      });

      const comparisonDetails = this.logic.getComparisonSetDetails();
      this.assert(comparisonDetails && comparisonDetails.comparisonSet && Array.isArray(comparisonDetails.products),
        'getComparisonSetDetails should return comparison set and products');
      this.assert(comparisonDetails.products.length === compareEntries.length,
        'Comparison set should contain selected number of products');

      // Determine lightest hoist in comparison set
      let lightestProductId = null;
      let lightestWeight = null;

      comparisonDetails.products.forEach((pInfo) => {
        const p = pInfo.product;
        const specs = pInfo.specsTableParsed || {};
        const weight = typeof p.weightKg === 'number' ? p.weightKg : specs.weightKg;
        this.assert(typeof weight === 'number', 'Each compared product should have a numeric weight for comparison');

        if (lightestWeight === null || weight < lightestWeight) {
          lightestWeight = weight;
          lightestProductId = p.id;
        }
      });

      this.assert(lightestProductId, 'Should identify a lightest product from comparison set');

      // Open details of lightest product
      const productDetails = this.logic.getProductDetails(lightestProductId, undefined, undefined);
      this.assert(productDetails && productDetails.product && productDetails.product.id === lightestProductId,
        'Product details should match lightest compared product');
      this.assert(productDetails.product.dailyRate <= maxDailyRate,
        'Lightest product dailyRate should be under configured max');

      // Save to wishlist
      const wishlistAdd = this.logic.addProductToWishlist(lightestProductId);
      this.assert(wishlistAdd && wishlistAdd.wishlist && Array.isArray(wishlistAdd.wishlistItems),
        'addProductToWishlist should return wishlist and items');

      const wishlistData = this.logic.getWishlist();
      this.assert(wishlistData && wishlistData.wishlist && Array.isArray(wishlistData.items),
        'getWishlist should return wishlist and items');

      const savedItem = wishlistData.items.find(function (item) {
        return item.product.id === lightestProductId || item.wishlistItem.productId === lightestProductId;
      });
      this.assert(savedItem, 'Wishlist should contain the lightest compared product');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 5 =====
  // Adapted: Select hoist with maximum lift height for weekend-inclusive 3-day hire and proceed to checkout with address
  testTask5_ProceedToGuestCheckoutWithAddress() {
    const testName = 'Task 5: Weekend 3-day hire and proceed to checkout with contact/address';

    try {
      this.clearStorage();
      this.setupTestData();

      const categories = this.logic.getEquipmentCategories();
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);

      // Determine upcoming Saturday to Monday (3 days including weekend)
      const today = new Date();
      const weekend = this.getUpcomingWeekend(today);
      const hireStart = weekend.saturday; // Saturday
      const hireEnd = this.addDays(hireStart, 2); // Saturday-Monday (3 days)
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      // Sort by lift height high to low if available
      let sortBy;
      if (filterOptions.sortOptions && filterOptions.sortOptions.length > 0) {
        const byLabel = filterOptions.sortOptions.find(function (opt) {
          return opt.label && /lift height/i.test(opt.label) && /high to low/i.test(opt.label);
        });
        const byValue = filterOptions.sortOptions.find(function (opt) {
          return opt.value && /lift_height_desc/i.test(opt.value);
        });
        const chosenSort = byLabel || byValue || filterOptions.sortOptions[0];
        sortBy = chosenSort && chosenSort.value;
      }

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        undefined,
        hireStartIso,
        hireEndIso,
        sortBy
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length > 0, 'At least one hoist should be available');

      const firstEntry = categoryProducts.products[0];
      const productId = firstEntry.product.id;

      // Add selected product to cart for 3-day hire
      const addResult = this.logic.addProductToCart(productId, 1, hireStartIso, hireEndIso);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');

      const cartItem = addResult.cartItems.find(function (ci) {
        return ci.productId === productId;
      });
      this.assert(cartItem, 'Cart item should be present');
      this.assert(cartItem.hireStartDate === hireStartIso, 'Hire start should be Saturday');
      this.assert(cartItem.hireEndDate === hireEndIso, 'Hire end should be Monday');

      // Set any delivery method (not critical for this task)
      const deliveryResult = this.logic.setCartDeliveryMethod('standard_delivery');
      this.assert(deliveryResult && deliveryResult.cart, 'setCartDeliveryMethod should return cart');

      // Proceed to checkout: retrieve checkout data
      const checkoutDataBefore = this.logic.getCheckoutData();
      this.assert(checkoutDataBefore && checkoutDataBefore.cart && Array.isArray(checkoutDataBefore.cartItems),
        'getCheckoutData should return cart and items');
      this.assert(checkoutDataBefore.cartItems.length === 1,
        'Checkout should show exactly one cart item for this test');

      const cartId = checkoutDataBefore.cart.id;

      // Enter contact and address details (guest-style checkout)
      const updateResult = this.logic.updateCheckoutDetails(
        'Alex Smith',
        'alex.smith@example.com',
        '123 Industrial Road',
        'Riverton',
        '75001',
        'standard_delivery',
        ''
      );

      this.assert(updateResult && updateResult.hireOrder, 'updateCheckoutDetails should return hireOrder');

      const hireOrder = updateResult.hireOrder;
      this.assert(hireOrder.contactName === 'Alex Smith', 'Hire order contactName should be saved');
      this.assert(hireOrder.contactEmail === 'alex.smith@example.com', 'Hire order contactEmail should be saved');
      this.assert(hireOrder.addressStreet === '123 Industrial Road', 'Hire order addressStreet should be saved');
      this.assert(hireOrder.addressCity === 'Riverton', 'Hire order addressCity should be saved');
      this.assert(hireOrder.addressPostcode === '75001', 'Hire order addressPostcode should be saved');
      this.assert(hireOrder.deliveryMethod === 'standard_delivery', 'Hire order deliveryMethod should be standard_delivery');
      this.assert(!hireOrder.submittedAt, 'Hire order should remain in draft state (not submitted)');
      if (cartId && hireOrder.cartId) {
        this.assert(hireOrder.cartId === cartId, 'Hire order cartId should reference current cart');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 6 =====
  // Register an account and save an electric hoist safety guide to saved resources
  testTask6_RegisterAccountAndSaveSafetyGuide() {
    const testName = 'Task 6: Register account and save electric hoist safety guide';

    try {
      this.clearStorage();
      this.setupTestData();

      // Register account (non-auth simulation)
      const registerResult = this.logic.registerAccount(
        'Jordan Lee',
        'jordan.lee@example.com',
        'TestPass123!',
        'contractor'
      );

      this.assert(registerResult && registerResult.accountProfile,
        'registerAccount should return accountProfile');

      const profile = registerResult.accountProfile;
      this.assert(profile.fullName === 'Jordan Lee', 'Profile fullName should match');
      this.assert(profile.email === 'jordan.lee@example.com', 'Profile email should match');
      if (profile.userType) {
        this.assert(profile.userType === 'contractor', 'Profile userType should be contractor');
      }

      // Navigate to safety guides and search for "electric hoist safety"
      const searchQuery = 'electric hoist safety';
      const resourcesPage = this.logic.getResourceCategoryPageData(
        'safety_guides',
        searchQuery,
        'safety_guide',
        1,
        20
      );

      this.assert(resourcesPage && Array.isArray(resourcesPage.articles),
        'getResourceCategoryPageData should return articles');
      this.assert(resourcesPage.articles.length > 0,
        'Search for electric hoist safety should return at least one article');

      // Choose first article whose title includes "Electric Hoist Safety" or tag matches
      let chosenArticle = null;
      for (let i = 0; i < resourcesPage.articles.length; i++) {
        const a = resourcesPage.articles[i];
        const title = a.title || '';
        const tags = a.tags || [];
        if (/electric hoist safety/i.test(title) || tags.some(function (t) { return /electric hoist safety/i.test(t); })) {
          chosenArticle = a;
          break;
        }
      }

      if (!chosenArticle) {
        // Fallback to first article if specific match not found
        chosenArticle = resourcesPage.articles[0];
      }

      const articleId = chosenArticle.id;

      // Open article details
      const articleDetails = this.logic.getResourceArticleDetails(articleId);
      this.assert(articleDetails && articleDetails.article && articleDetails.article.id === articleId,
        'getResourceArticleDetails should return selected article');

      // Save guide to saved resources
      const saveResult = this.logic.addArticleToSavedResources(articleId);
      this.assert(saveResult && saveResult.savedResourcesList && Array.isArray(saveResult.items),
        'addArticleToSavedResources should return list and items');

      const savedListData = this.logic.getSavedResourcesList();
      this.assert(savedListData && savedListData.savedResourcesList && Array.isArray(savedListData.items),
        'getSavedResourcesList should return list and items');

      const savedItem = savedListData.items.find(function (item) {
        return item.article.id === articleId || item.savedResourceItem.articleId === articleId;
      });
      this.assert(savedItem, 'Saved resources list should contain chosen article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 7 =====
  // Adapted: Compare three hoists, choose one with longest chain length, hire for 3 days from first of next month
  testTask7_CompareHoistsAndHireLongestChain() {
    const testName = 'Task 7: Compare hoists and hire one with longest chain length';

    try {
      this.clearStorage();
      this.setupTestData();

      const categories = this.logic.getEquipmentCategories();
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);
      const maxDailyRate = (filterOptions.dailyRateRange && filterOptions.dailyRateRange.max) || 150;

      const filters = {
        dailyRateMax: maxDailyRate,
        powerSource: 'electric'
      };

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        filters,
        undefined,
        undefined,
        undefined
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length >= 1, 'At least one hoist should be available');

      // Select up to 3 hoists for comparison
      const compareEntries = categoryProducts.products.slice(0, 3);
      this.assert(compareEntries.length >= 1, 'Need at least one product to compare');

      compareEntries.forEach((entry) => {
        const addComp = this.logic.addProductToComparison(entry.product.id);
        this.assert(addComp && addComp.comparisonSet && Array.isArray(addComp.comparisonSet.productIds),
          'addProductToComparison should return comparisonSet');
      });

      const comparisonDetails = this.logic.getComparisonSetDetails();
      this.assert(comparisonDetails && comparisonDetails.comparisonSet && Array.isArray(comparisonDetails.products),
        'getComparisonSetDetails should return comparison products');

      // Determine hoist with longest chain length
      let longestProductId = null;
      let longestChain = null;

      comparisonDetails.products.forEach((pInfo) => {
        const p = pInfo.product;
        const specs = pInfo.specsTableParsed || {};
        const chainLen = typeof p.standardChainLengthMeters === 'number'
          ? p.standardChainLengthMeters
          : specs.standardChainLengthMeters;

        this.assert(typeof chainLen === 'number', 'Each compared hoist should have standard chain length');

        if (longestChain === null || chainLen > longestChain) {
          longestChain = chainLen;
          longestProductId = p.id;
        }
      });

      this.assert(longestProductId, 'Should identify hoist with longest chain');

      // Compute 3-day hire starting first day of next month
      const today = new Date();
      const firstNextMonth = this.getFirstDayOfNextMonth(today);
      const hireStart = firstNextMonth;
      const hireEnd = this.addDays(hireStart, 2); // 3-day period
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      // Add selected hoist to cart
      const addResult = this.logic.addProductToCart(longestProductId, 1, hireStartIso, hireEndIso);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');

      const cartItem = addResult.cartItems.find(function (ci) {
        return ci.productId === longestProductId;
      });
      this.assert(cartItem, 'Cart item for longest-chain hoist should be present');
      this.assert(cartItem.hireStartDate === hireStartIso, 'Hire start should be first of next month');
      this.assert(cartItem.hireEndDate === hireEndIso, 'Hire end should be three days from start');

      // Verify via cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should contain items');
      this.assert(cartSummary.items.length === 1, 'Cart should contain exactly one item for this test');

      const summaryItem = cartSummary.items[0];
      this.assert(summaryItem.cartItem.productId === longestProductId,
        'Cart summary item should be longest-chain hoist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 8 =====
  // Hire an outdoor-rated electric hoist with IP65 or higher for 10 days, site delivery to postcode 30301, rooftop note
  testTask8_HireOutdoorRatedHoistWithSiteDelivery() {
    const testName = 'Task 8: Hire outdoor-rated IP65+ hoist with site delivery and rooftop note';

    try {
      this.clearStorage();
      this.setupTestData();

      const categories = this.logic.getEquipmentCategories();
      const electricCategory = categories.find(function (c) {
        return c.id === 'electric_chain_hoists' || /electric chain hoists/i.test(c.name || '');
      });
      this.assert(electricCategory, 'Electric Chain Hoists category should exist');

      const filterOptions = this.logic.getCategoryFilterOptions(electricCategory.id);

      // Compute hire period: 10-day hire starting two weeks from today
      const today = new Date();
      const hireStart = this.addDays(today, 14);
      const hireEnd = this.addDays(hireStart, 9); // 10 consecutive days
      const hireStartIso = hireStart.toISOString();
      const hireEndIso = hireEnd.toISOString();

      // Filter for environment supporting outdoor (indoor_outdoor) and IP65+ hoists
      const filters = {
        environment: 'indoor_outdoor',
        ipRatingMin: 'ip65',
        powerSource: 'electric'
      };

      // Prefer sorting by availability in-stock-first if available
      let sortBy;
      if (filterOptions.sortOptions && filterOptions.sortOptions.length > 0) {
        const byValue = filterOptions.sortOptions.find(function (opt) {
          return opt.value && /availability_in_stock_first/i.test(opt.value);
        });
        sortBy = (byValue || filterOptions.sortOptions[0]).value;
      }

      const categoryProducts = this.logic.getCategoryProducts(
        electricCategory.id,
        filters,
        hireStartIso,
        hireEndIso,
        sortBy
      );

      this.assert(categoryProducts && Array.isArray(categoryProducts.products), 'Category products should be returned');
      this.assert(categoryProducts.products.length > 0,
        'At least one outdoor/IP65+ hoist should be available for filtered criteria');

      const firstEntry = categoryProducts.products[0];
      const product = firstEntry.product;
      const productId = product.id;

      // Validate outdoor/IP rating constraints using actual product data
      if (product.environment) {
        this.assert(product.environment === 'indoor_outdoor' || product.environment === 'outdoor',
          'Selected product should be suitable for outdoor use');
      }
      if (product.ipRating) {
        const minRank = this.ipRatingRank('ip65');
        const actualRank = this.ipRatingRank(product.ipRating);
        this.assert(actualRank >= minRank, 'Selected product IP rating should be >= IP65');
      }

      // Add to cart for 10-day hire
      const addResult = this.logic.addProductToCart(productId, 1, hireStartIso, hireEndIso);
      this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');

      const cartItem = addResult.cartItems.find(function (ci) {
        return ci.productId === productId;
      });
      this.assert(cartItem, 'Cart item for outdoor/IP65+ hoist should be present');
      this.assert(cartItem.hireStartDate === hireStartIso, 'Hire start date should match requested');
      this.assert(cartItem.hireEndDate === hireEndIso, 'Hire end date should match requested');
      this.assert(typeof cartItem.hireDurationDays === 'number' && cartItem.hireDurationDays >= 1,
        'Cart item hireDurationDays should be positive');

      // Set cart delivery method and postcode
      const deliveryResult = this.logic.setCartDeliveryMethod('site_delivery');
      this.assert(deliveryResult && deliveryResult.cart, 'setCartDeliveryMethod should return cart');
      this.assert(deliveryResult.cart.deliveryMethod === 'site_delivery', 'Cart deliveryMethod should be site_delivery');

      const postcodeResult = this.logic.setCartDeliveryPostcode('30301');
      this.assert(postcodeResult && postcodeResult.cart, 'setCartDeliveryPostcode should return cart');
      this.assert(postcodeResult.cart.deliveryPostcode === '30301', 'Cart deliveryPostcode should be 30301');

      // Proceed to checkout and add rooftop note
      const checkoutData = this.logic.getCheckoutData();
      this.assert(checkoutData && checkoutData.cart && Array.isArray(checkoutData.cartItems),
        'getCheckoutData should return cart and items');

      const draftOrderUpdate = this.logic.updateCheckoutDetails(
        'Rooftop Client',
        'rooftop.client@example.com',
        '',
        '',
        '30301',
        'site_delivery',
        'Outdoor rooftop installation'
      );

      this.assert(draftOrderUpdate && draftOrderUpdate.hireOrder,
        'updateCheckoutDetails should return hireOrder');

      const hireOrder = draftOrderUpdate.hireOrder;
      this.assert(hireOrder.deliveryMethod === 'site_delivery', 'Hire order deliveryMethod should be site_delivery');
      this.assert(hireOrder.addressPostcode === '30301', 'Hire order addressPostcode should be 30301');
      if (typeof hireOrder.deliveryNotes === 'string') {
        this.assert(/outdoor rooftop installation/i.test(hireOrder.deliveryNotes),
          'Hire order deliveryNotes should mention outdoor rooftop installation');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Helper methods =====

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

  // Return the date of the next given weekday (0=Sunday...6=Saturday) strictly after startDate
  getNextWeekday(startDate, targetWeekday) {
    const date = new Date(startDate.getTime());
    const currentDow = date.getDay();
    let diff = (targetWeekday - currentDow + 7) % 7;
    if (diff === 0) diff = 7; // ensure strictly next
    date.setDate(date.getDate() + diff);
    return date;
  }

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  getUpcomingWeekend(startDate) {
    const saturday = this.getNextWeekday(startDate, 6); // 6 = Saturday
    const sunday = this.addDays(saturday, 1);
    return { saturday: saturday, sunday: sunday };
  }

  getFirstDayOfNextMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 1);
  }

  ipRatingRank(ipRating) {
    if (!ipRating) return -1;
    const order = ['ip54', 'ip55', 'ip65', 'ip66', 'ip67'];
    const value = String(ipRating).toLowerCase();
    return order.indexOf(value);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
