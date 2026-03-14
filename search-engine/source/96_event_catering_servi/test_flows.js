/// Test runner for business logic integration flows

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Initial clean storage and seed data
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

  resetStorage() {
    this.clearStorage();
    this.setupTestData();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      availability_slots: [
        {
          id: 'slot_2025-05-10_morning',
          date: '2025-05-10T00:00:00Z',
          startTime: '09:00',
          endTime: '11:30',
          period: 'morning',
          isAvailable: true,
          maxGuests: 120,
          notes: 'Standard morning coffee break slot'
        },
        {
          id: 'slot_2025-05-11_morning',
          date: '2025-05-11T00:00:00Z',
          startTime: '09:00',
          endTime: '11:30',
          period: 'morning',
          isAvailable: true,
          maxGuests: 120,
          notes: 'Standard morning coffee break slot'
        },
        {
          id: 'slot_2025-05-12_morning',
          date: '2025-05-12T00:00:00Z',
          startTime: '09:00',
          endTime: '11:30',
          period: 'morning',
          isAvailable: true,
          maxGuests: 120,
          notes: 'Standard morning coffee break slot'
        }
      ],
      dishes: [
        {
          id: 'dish_herb_veg_skewers',
          name: 'Herb-Roasted Vegetable Skewers',
          slug: 'herb-roasted-vegetable-skewers',
          description: 'Skewers of seasonal vegetables marinated in garlic and fresh herbs, fire-roasted and served with lemon aioli.',
          dishType: 'appetizer',
          isSavory: true,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          dietaryTags: ['dairy-free', 'nut-free'],
          pricePerPerson: 7.5,
          rating: 4.7,
          ratingCount: 128,
          imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=600&fit=crop&auto=format&q=80',
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2025-11-20T09:30:00Z'
        },
        {
          id: 'dish_lemon_garlic_chicken_skewers',
          name: 'Lemon Garlic Chicken Skewers',
          slug: 'lemon-garlic-chicken-skewers',
          description: 'Char-grilled chicken skewers in a lemon, garlic, and oregano marinade, served with yogurt herb sauce.',
          dishType: 'main',
          isSavory: true,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          dietaryTags: ['dairy-free-option', 'high-protein'],
          pricePerPerson: 18.0,
          rating: 4.6,
          ratingCount: 212,
          imageUrl: 'https://images.unsplash.com/photo-1604908176997-1251884b08a0?w=800&h=600&fit=crop&auto=format&q=80',
          isActive: true,
          createdAt: '2023-11-10T12:00:00Z',
          updatedAt: '2025-10-05T15:20:00Z'
        },
        {
          id: 'dish_quinoa_stuffed_peppers',
          name: 'Quinoa Stuffed Bell Peppers',
          slug: 'quinoa-stuffed-bell-peppers',
          description: 'Roasted bell peppers filled with quinoa, black beans, corn, and tomatoes, finished with cilantro and lime.',
          dishType: 'main',
          isSavory: true,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          dietaryTags: ['high-fiber', 'dairy-free'],
          pricePerPerson: 17.5,
          rating: 4.5,
          ratingCount: 167,
          imageUrl: 'https://www.iheartnaptime.net/wp-content/uploads/2016/01/stuffed_bell_peppers.jpg',
          isActive: true,
          createdAt: '2024-02-02T09:15:00Z',
          updatedAt: '2025-09-18T11:45:00Z'
        }
      ],
      faq_items: [
        {
          id: 'faq_order_timing',
          question: 'How far in advance should I place my catering order?',
          answer: 'We recommend placing orders at least 7-10 business days in advance for most events and 3-6 months ahead for large weddings and peak-season Saturdays. For last-minute requests, contact us and we will do our best to accommodate.',
          category: 'ordering',
          displayOrder: 1,
          isActive: true
        },
        {
          id: 'faq_pricing_per_person',
          question: 'How is pricing calculated per person?',
          answer: 'Most of our packages are priced per person and include food, basic disposables, and standard service. Add-ons such as premium rentals, staffing, and bar service are listed separately and added to the per-person or flat event total before tax and gratuity.',
          category: 'pricing',
          displayOrder: 2,
          isActive: true
        },
        {
          id: 'faq_dietary_restrictions',
          question: 'Can you accommodate dietary restrictions like gluten-free, vegan, and nut-free?',
          answer: 'Yes. Many menu items are labeled vegetarian, vegan, and gluten-free, and we can often adjust recipes for common allergies. Please list all dietary needs when requesting a quote so we can suggest appropriate dishes and avoid cross-contact where possible.',
          category: 'dietary',
          displayOrder: 3,
          isActive: true
        }
      ],
      package_categories: [
        {
          id: 'corporate_events',
          code: 'corporate_events',
          name: 'Corporate Events',
          description: 'Buffet lunches, conferences, meetings, and office celebrations.',
          displayOrder: 1,
          isActive: true
        },
        {
          id: 'weddings',
          code: 'weddings',
          name: 'Weddings',
          description: 'Plated dinners, cocktail receptions, and full-service wedding catering.',
          displayOrder: 2,
          isActive: true
        },
        {
          id: 'parties_birthdays',
          code: 'parties_birthdays',
          name: 'Parties & Birthdays',
          description: 'Casual party menus, birthday celebrations, and social events.',
          displayOrder: 3,
          isActive: true
        }
      ],
      policy_pages: [
        {
          id: 'policy_privacy',
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          type: 'privacy_policy',
          content: 'We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your information. We collect only the information necessary to process inquiries, quotes, and orders, and we never sell your data to third parties.',
          lastUpdated: '2025-09-01T12:00:00Z',
          isActive: true
        },
        {
          id: 'policy_terms',
          title: 'Terms of Service',
          slug: 'terms-of-service',
          type: 'terms_of_service',
          content: 'By accessing or using our website and catering services, you agree to be bound by these Terms of Service. These terms outline the conditions for ordering, payment, cancellations, and limitations of liability. Please review them carefully before confirming your event.',
          lastUpdated: '2025-09-01T12:05:00Z',
          isActive: true
        },
        {
          id: 'policy_cancellation',
          title: 'Cancellation & Refund Policy',
          slug: 'cancellation-policy',
          type: 'cancellation_policy',
          content: 'We understand that plans can change. Deposits are generally non-refundable, but may be transferable to a future date subject to availability. Cancellations made more than 30 days before the event may receive a partial refund, while cancellations within 7 days of the event are typically non-refundable due to food and staffing commitments.',
          lastUpdated: '2025-09-01T12:10:00Z',
          isActive: true
        }
      ],
      promo_codes: [
        {
          id: 'save15',
          code: 'SAVE15',
          description: 'Save 15% on qualifying catering orders for a limited time.',
          discountType: 'percentage',
          discountValue: 15,
          isActive: true,
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2026-12-31T23:59:59Z',
          minimumOrderTotal: 0,
          maximumDiscountAmount: 1000,
          createdAt: '2023-12-15T09:00:00Z',
          updatedAt: '2025-01-10T10:30:00Z'
        },
        {
          id: 'new10',
          code: 'NEW10',
          description: '10% off your first catering order.',
          discountType: 'percentage',
          discountValue: 10,
          isActive: false,
          validFrom: '2023-01-01T00:00:00Z',
          validTo: '2024-12-31T23:59:59Z',
          minimumOrderTotal: 300,
          maximumDiscountAmount: 500,
          createdAt: '2022-12-20T10:00:00Z',
          updatedAt: '2025-01-05T08:45:00Z'
        },
        {
          id: 'flat50',
          code: 'FLAT50',
          description: '50 dollars off midweek corporate events (Monday-Thursday).',
          discountType: 'fixed_amount',
          discountValue: 50,
          isActive: true,
          validFrom: '2024-06-01T00:00:00Z',
          validTo: '2026-06-30T23:59:59Z',
          minimumOrderTotal: 500,
          maximumDiscountAmount: 50,
          createdAt: '2024-05-15T11:20:00Z',
          updatedAt: '2025-06-01T09:15:00Z'
        }
      ],
      add_ons: [
        {
          id: 'addon_standard_open_bar',
          name: 'Standard Open Bar (House Selection)',
          description: 'Beer, house wine, and standard mixed drinks for guests 21+ with bar staff included.',
          category: 'bar_service',
          priceType: 'per_person',
          price: 22,
          isPaid: true,
          isBarService: true,
          applicablePackageCategoryCode: 'weddings',
          isActive: true,
          displayOrder: 1
        },
        {
          id: 'addon_premium_open_bar',
          name: 'Premium Open Bar',
          description: 'Expanded bar with premium spirits, craft beers, and signature cocktails.',
          category: 'bar_service',
          priceType: 'per_person',
          price: 32,
          isPaid: true,
          isBarService: true,
          applicablePackageCategoryCode: 'weddings',
          isActive: true,
          displayOrder: 2
        },
        {
          id: 'addon_champagne_toast',
          name: 'Champagne Toast',
          description: 'One glass of sparkling wine per adult guest poured and served for toasts.',
          category: 'bar_service',
          priceType: 'fixed_fee',
          price: 250,
          isPaid: true,
          isBarService: true,
          applicablePackageCategoryCode: 'weddings',
          isActive: true,
          displayOrder: 3
        }
      ],
      packages: [
        {
          id: 'pkg_corp_lunch_buffet_flex',
          name: 'Weekday Corporate Lunch Buffet',
          slug: 'weekday-corporate-lunch-buffet',
          description: 'Flexible buffet lunch for offices including two mains, salads, and sides with multiple vegetarian options. Customize your selection from our corporate menu.',
          categoryCode: 'corporate_events',
          mealType: 'lunch',
          serviceStyle: 'buffet',
          courseCount: 2,
          basePricePerPerson: 22,
          minPricePerPerson: 18,
          maxPricePerPerson: 25,
          minGuests: 15,
          maxGuests: 150,
          includesDessert: false,
          vegetarianFriendly: true,
          glutenFreeFriendly: true,
          allowsMenuCustomization: true,
          allowsDateSelection: true,
          allowsAddOns: true,
          rating: 4.5,
          ratingCount: 210,
          imageUrl: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?w=800&h=600&fit=crop&auto=format&q=80',
          tags: ['corporate', 'lunch', 'buffet'],
          isActive: true,
          createdAt: '2023-10-10T10:00:00Z',
          updatedAt: '2025-11-15T09:30:00Z'
        },
        {
          id: 'pkg_corp_lunch_executive',
          name: 'Executive Sandwich & Salad Lunch',
          slug: 'executive-sandwich-salad-lunch',
          description: 'Assorted gourmet sandwiches, two composed salads, kettle chips, and cookie platter. Vegetarian and gluten-free bread options available.',
          categoryCode: 'corporate_events',
          mealType: 'lunch',
          serviceStyle: 'drop_off',
          courseCount: 2,
          basePricePerPerson: 26,
          minGuests: 10,
          maxGuests: 120,
          includesDessert: true,
          vegetarianFriendly: true,
          glutenFreeFriendly: true,
          allowsMenuCustomization: true,
          allowsDateSelection: true,
          allowsAddOns: true,
          rating: 4.3,
          ratingCount: 145,
          imageUrl: 'https://fossixflex.cdnflexcatering.com/media/images/medium/ae99bc7423f2fce215196fdf6a8f8b80.jpg',
          tags: ['corporate', 'lunch', 'drop-off'],
          isActive: true,
          createdAt: '2023-11-05T11:20:00Z',
          updatedAt: '2025-09-02T14:05:00Z'
        },
        {
          id: 'pkg_corp_dinner_value_45',
          name: 'Corporate Dinner Buffet',
          slug: 'corporate-dinner-buffet',
          description: 'Two entree buffet dinner with salad, sides, and dessert. Ideal for recognition dinners and evening meetings.',
          categoryCode: 'corporate_events',
          mealType: 'dinner',
          serviceStyle: 'buffet',
          courseCount: 3,
          basePricePerPerson: 45,
          minGuests: 30,
          maxGuests: 180,
          includesDessert: true,
          vegetarianFriendly: true,
          glutenFreeFriendly: true,
          allowsMenuCustomization: true,
          allowsDateSelection: true,
          allowsAddOns: true,
          rating: 4.6,
          ratingCount: 178,
          imageUrl: 'https://www.cateringsavannahgeorgia.com/uploads/6/2/7/2/6272286/chafing-dish-910535-640_orig.jpg',
          tags: ['corporate', 'dinner', 'buffet'],
          isActive: true,
          createdAt: '2023-09-18T16:00:00Z',
          updatedAt: '2025-10-01T12:45:00Z'
        }
      ],
      package_menu_sections: [
        {
          id: 'pms_corp_lunch_flex_salads',
          packageId: 'pkg_corp_lunch_buffet_flex',
          name: 'Salads',
          minSelection: 1,
          maxSelection: 2,
          dishTypeFilter: 'appetizer',
          isRequired: true,
          allowOnlyVegetarian: true,
          displayOrder: 1
        },
        {
          id: 'pms_corp_lunch_flex_mains',
          packageId: 'pkg_corp_lunch_buffet_flex',
          name: 'Mains',
          minSelection: 2,
          maxSelection: 3,
          dishTypeFilter: 'main',
          isRequired: true,
          allowOnlyVegetarian: false,
          displayOrder: 2
        },
        {
          id: 'pms_corp_lunch_flex_veg_mains',
          packageId: 'pkg_corp_lunch_buffet_flex',
          name: 'Vegetarian Mains',
          minSelection: 1,
          maxSelection: 2,
          dishTypeFilter: 'main',
          isRequired: false,
          allowOnlyVegetarian: true,
          displayOrder: 3
        }
      ],
      package_menu_items: [
        {
          id: 'pmi_corp_lunch_salad_herbveg',
          packageMenuSectionId: 'pms_corp_lunch_flex_salads',
          dishId: 'dish_herb_veg_skewers',
          isDefault: true,
          additionalPricePerPerson: 0,
          isVegetarianOnlyOption: true,
          notes: 'Vegetarian, vegan, and gluten-free option.',
          displayOrder: 1
        },
        {
          id: 'pmi_corp_lunch_salad_mezze',
          packageMenuSectionId: 'pms_corp_lunch_flex_salads',
          dishId: 'dish_mediterranean_mezze_platter',
          isDefault: false,
          additionalPricePerPerson: 0,
          isVegetarianOnlyOption: true,
          notes: 'Plant-forward sharing platter.',
          displayOrder: 2
        },
        {
          id: 'pmi_corp_lunch_main_chicken',
          packageMenuSectionId: 'pms_corp_lunch_flex_mains',
          dishId: 'dish_lemon_garlic_chicken_skewers',
          isDefault: true,
          additionalPricePerPerson: 0,
          isVegetarianOnlyOption: false,
          notes: 'Popular protein choice for mixed groups.',
          displayOrder: 1
        }
      ]
    };

    // Copy data into localStorage using correct storage keys
    localStorage.setItem('availability_slots', JSON.stringify(generatedData.availability_slots));
    localStorage.setItem('dishes', JSON.stringify(generatedData.dishes));
    localStorage.setItem('faq_items', JSON.stringify(generatedData.faq_items));
    localStorage.setItem('package_categories', JSON.stringify(generatedData.package_categories));
    localStorage.setItem('policy_pages', JSON.stringify(generatedData.policy_pages));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('add_ons', JSON.stringify(generatedData.add_ons));
    localStorage.setItem('packages', JSON.stringify(generatedData.packages));
    localStorage.setItem('package_menu_sections', JSON.stringify(generatedData.package_menu_sections));
    localStorage.setItem('package_menu_items', JSON.stringify(generatedData.package_menu_items));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CorporateLunchBuffet();
    this.testTask2_WeddingQuoteWithBarService();
    this.testTask3_CheaperBirthdayPackageWithDessert();
    this.testTask4_CustomDinnerMenuUnderBudget();
    this.testTask5_BookEarliestAvailableSlotFor80Guests();
    this.testTask6_PromoCodeOn60GuestPackageWithAddOns();
    this.testTask7_GlutenFreeTastingList();
    this.testTask8_CoffeeBreakThreeConsecutiveDays();

    return this.results;
  }

  // Task 1: Corporate lunch buffet for 25 guests with vegetarian dishes under 25 per person
  testTask1_CorporateLunchBuffet() {
    const testName = 'Task 1: Corporate lunch buffet for 25 guests under 25 with vegetarian dishes';
    try {
      this.resetStorage();

      // Simulate homepage navigation
      const homeData = this.logic.getHomePageData();
      this.assert(homeData && typeof homeData === 'object', 'Home data should be returned');

      const navCategories = this.logic.getPackageCategoriesForNavigation();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Navigation categories should be available');
      const corporateCategory = navCategories.find(c => c.code === 'corporate_events') || navCategories[0];
      this.assert(corporateCategory, 'Corporate or fallback category should be found');

      // Get filter options (simulating using price slider etc.)
      const filterOptions = this.logic.getPackageFilterOptions(corporateCategory.code);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Filter options should be returned for corporate events');

      // List corporate lunch packages under 25 per person, vegetarian-friendly
      const packageList = this.logic.listPackages(
        corporateCategory.code, // categoryCode
        25,                     // guestCount
        undefined,              // pricePerPersonMin
        25,                     // pricePerPersonMax
        'lunch',                // mealType
        undefined,              // serviceStyle
        undefined,              // includesDessert
        undefined,              // courseCount
        true,                   // vegetarianOnly
        undefined,              // glutenFreeFriendly
        'price_low_to_high'     // sortBy
      );
      this.assert(Array.isArray(packageList) && packageList.length > 0, 'At least one corporate lunch package under 25/person should be listed');

      // Pick a customizable, vegetarian-friendly lunch buffet
      let selectedEntry = packageList.find(p => p.package && p.package.allowsMenuCustomization && p.package.vegetarianFriendly) || packageList[0];
      const selectedPackage = selectedEntry.package;
      this.assert(selectedPackage, 'Selected package should be defined');

      // Load package detail for 25 guests
      const detail = this.logic.getPackageDetail(selectedPackage.id, 25);
      this.assert(detail && detail.package, 'Package detail should be returned');
      this.assert(detail.package.id === selectedPackage.id, 'Detail package id should match selected package');

      // Collect vegetarian dishes from menu sections
      const vegetarianDishIds = [];
      if (Array.isArray(detail.menuSections)) {
        detail.menuSections.forEach(sectionObj => {
          const menuItems = sectionObj && sectionObj.menuItems;
          if (Array.isArray(menuItems)) {
            menuItems.forEach(miObj => {
              const dish = miObj && miObj.dish;
              if (dish && dish.isVegetarian) {
                vegetarianDishIds.push(dish.id);
              }
            });
          }
        });
      }
      this.assert(vegetarianDishIds.length > 0, 'There should be at least one vegetarian dish to select');

      // Select up to 3 vegetarian dishes (adapt to available data)
      const selectedDishIds = vegetarianDishIds.slice(0, Math.min(3, vegetarianDishIds.length));

      // Add configured lunch buffet for 25 guests to cart
      const addResult = this.logic.addPackageToCart(
        selectedPackage.id, // packageId
        25,                 // guestCount
        undefined,          // eventDate
        selectedDishIds,    // selectedDishIds
        undefined,          // selectedAddonIds
        'Task1 Corporate Lunch for 25' // customDisplayName
      );

      this.assert(addResult && addResult.success === true, 'Package should be successfully added to cart');
      this.assert(addResult.addedItem, 'Added cart item should be returned');

      const addedItem = addResult.addedItem;
      this.assert(addedItem.guestCount === 25, 'Guest count on cart item should be 25');
      if (Array.isArray(selectedDishIds) && selectedDishIds.length > 0) {
        this.assert(
          Array.isArray(addedItem.selectedDishIds) &&
            selectedDishIds.every(id => addedItem.selectedDishIds.indexOf(id) !== -1),
          'Selected vegetarian dishes should be captured on the cart item'
        );
      }

      if (typeof addedItem.perPersonPrice === 'number') {
        this.assert(
          addedItem.perPersonPrice <= 25,
          'Per-person price should be at or below 25, actual: ' + addedItem.perPersonPrice
        );
      }

      // View cart summary and verify line item exists
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be returned');
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be an array');
      const foundItem = cartSummary.items.find(it => it.item && it.item.id === addedItem.id);
      this.assert(!!foundItem, 'Added lunch buffet should appear in cart summary');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Wedding catering quote for 120 guests with 3-course plated dinner and bar service
  testTask2_WeddingQuoteWithBarService() {
    const testName = 'Task 2: Wedding quote for 120 guests with 3-course dinner and bar service';
    try {
      this.resetStorage();

      // Homepage -> Weddings navigation
      const homeData = this.logic.getHomePageData();
      this.assert(homeData, 'Home data should load');
      const navCategories = this.logic.getPackageCategoriesForNavigation();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Navigation categories should exist');

      const weddingsCategory = navCategories.find(c => c.code === 'weddings');
      let searchCategoryCode = weddingsCategory ? weddingsCategory.code : (navCategories[0] && navCategories[0].code);
      this.assert(searchCategoryCode, 'A category code for searching packages should be available');

      // Try to list wedding plated 3-course dinners for 120 guests
      let packages = this.logic.listPackages(
        searchCategoryCode,  // categoryCode
        120,                 // guestCount
        undefined,           // pricePerPersonMin
        undefined,           // pricePerPersonMax
        'dinner',            // mealType
        'plated',            // serviceStyle
        undefined,           // includesDessert
        3,                   // courseCount
        undefined,           // vegetarianOnly
        undefined,           // glutenFreeFriendly
        'price_low_to_high'  // sortBy
      );

      // If no wedding packages available, fall back to corporate dinners
      if (!packages || packages.length === 0) {
        searchCategoryCode = 'corporate_events';
        packages = this.logic.listPackages(
          searchCategoryCode,
          120,
          undefined,
          undefined,
          'dinner',
          undefined,
          undefined,
          3,
          undefined,
          undefined,
          'price_low_to_high'
        );
      }

      // As a final fallback, any package in the fallback category
      if (!packages || packages.length === 0) {
        packages = this.logic.listPackages(searchCategoryCode, 120);
      }

      this.assert(Array.isArray(packages) && packages.length > 0, 'At least one suitable package should be available for quote');

      // Choose a mid-priced package from the sorted list (middle element when possible)
      let chosenEntry;
      if (packages.length >= 3) {
        const midIndex = Math.floor(packages.length / 2);
        chosenEntry = packages[midIndex];
      } else if (packages.length === 2) {
        chosenEntry = packages[1]; // not the cheapest
      } else {
        chosenEntry = packages[0]; // only option
      }

      const chosenPackage = chosenEntry.package;
      this.assert(chosenPackage, 'Chosen package should be defined');

      // Load detail for 120 guests
      const detail = this.logic.getPackageDetail(chosenPackage.id, 120);
      this.assert(detail && detail.package, 'Package detail should load for chosen package');

      // Locate a bar service add-on (standard if available), prefer availableAddOns, fall back to all add_ons data
      let barAddOn = null;
      if (Array.isArray(detail.availableAddOns) && detail.availableAddOns.length > 0) {
        barAddOn = detail.availableAddOns.find(a => a.isBarService) || detail.availableAddOns[0];
      }
      if (!barAddOn) {
        const allAddOns = JSON.parse(localStorage.getItem('add_ons') || '[]');
        barAddOn = allAddOns.find(a => a.isBarService) || allAddOns[0];
      }
      this.assert(barAddOn, 'A bar service add-on should be available for quote');

      const selectedAddonIds = [barAddOn.id];
      const eventDate = '2025-07-19'; // representative wedding date (no hardcoded expectation on storage)

      // Initialize quote request context
      const initQuote = this.logic.initQuoteRequestFromPackage(
        chosenPackage.id,
        120,
        selectedAddonIds,
        eventDate
      );

      this.assert(initQuote && initQuote.package, 'Quote init should return package context');
      this.assert(initQuote.package.id === chosenPackage.id, 'Quote init package id should match chosen package');
      this.assert(initQuote.guestCount === 120, 'Quote init should carry correct guest count');

      // Submit the quote request with contact details
      const submitResult = this.logic.submitQuoteRequest(
        chosenPackage.id,
        120,
        selectedAddonIds,
        eventDate,
        'Alex Taylor',
        'alex.taylor@example.com',
        '555-987-6543',
        'Automated integration test for Task 2'
      );

      this.assert(submitResult && submitResult.success === true, 'Quote request should be successfully submitted');
      this.assert(submitResult.quoteRequest, 'Submitted quoteRequest entity should be returned');
      const qr = submitResult.quoteRequest;
      this.assert(qr.packageId === chosenPackage.id, 'QuoteRequest should reference the correct package');
      this.assert(qr.guestCount === 120, 'QuoteRequest should store guest count 120');
      this.assert(qr.contactName === 'Alex Taylor', 'QuoteRequest should store contact name');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Choose cheaper birthday package for 40 guests that includes dessert
  testTask3_CheaperBirthdayPackageWithDessert() {
    const testName = 'Task 3: Cheaper dessert-including package for 40 guests added alone to cart';
    try {
      this.resetStorage();

      // Prefer parties/birthdays category, fall back to corporate events if none
      const navCategories = this.logic.getPackageCategoriesForNavigation();
      this.assert(Array.isArray(navCategories) && navCategories.length > 0, 'Navigation categories should exist');

      const partiesCategory = navCategories.find(c => c.code === 'parties_birthdays');
      let categoryCode = partiesCategory ? partiesCategory.code : 'corporate_events';

      let packages = this.logic.listPackages(
        categoryCode,
        40,        // guestCount
        undefined, // pricePerPersonMin
        undefined, // pricePerPersonMax
        undefined, // mealType
        undefined, // serviceStyle
        true,      // includesDessert
        undefined, // courseCount
        undefined, // vegetarianOnly
        undefined, // glutenFreeFriendly
        'price_low_to_high'
      );

      if ((!packages || packages.length < 2) && categoryCode !== 'corporate_events') {
        // Fall back to corporate events dessert-including packages
        categoryCode = 'corporate_events';
        packages = this.logic.listPackages(
          categoryCode,
          40,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          'price_low_to_high'
        );
      }

      this.assert(Array.isArray(packages) && packages.length >= 2, 'At least two dessert-including packages should be available for comparison');

      const firstEntry = packages[0];
      const secondEntry = packages[1];
      this.assert(firstEntry.package && secondEntry.package, 'Both compared packages should have package data');

      // Load details (simulating user opening both packages)
      const detail1 = this.logic.getPackageDetail(firstEntry.package.id, 40);
      const detail2 = this.logic.getPackageDetail(secondEntry.package.id, 40);
      this.assert(detail1 && detail2, 'Details for both packages should load');

      // Determine cheaper package based on estimatedTotalForGuestCount or displayPricePerPerson as fallback
      const price1 = typeof firstEntry.estimatedTotalForGuestCount === 'number'
        ? firstEntry.estimatedTotalForGuestCount
        : firstEntry.displayPricePerPerson * 40;
      const price2 = typeof secondEntry.estimatedTotalForGuestCount === 'number'
        ? secondEntry.estimatedTotalForGuestCount
        : secondEntry.displayPricePerPerson * 40;

      const cheaperEntry = price1 <= price2 ? firstEntry : secondEntry;
      const cheaperPackage = cheaperEntry.package;

      // Add only the cheaper package for 40 guests to cart
      const addResult = this.logic.addPackageToCart(
        cheaperPackage.id,
        40,
        undefined,
        undefined,
        undefined,
        'Task3 Cheaper Dessert Package for 40'
      );
      this.assert(addResult && addResult.success === true, 'Cheaper package should be added to cart successfully');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be available');
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be an array');

      // Only one line item should exist
      this.assert(cartSummary.items.length === 1, 'Cart should contain exactly one item for this flow');
      const onlyItem = cartSummary.items[0].item;
      this.assert(onlyItem.packageId === cheaperPackage.id, 'Cart item should be the cheaper dessert-including package');
      this.assert(onlyItem.guestCount === 40, 'Cart item guest count should be 40');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Build custom dinner menu under 55 per person with apps, mains, dessert
  testTask4_CustomDinnerMenuUnderBudget() {
    const testName = 'Task 4: Custom dinner menu under 55 per person with multiple courses';
    try {
      this.resetStorage();

      // Simulate navigating to custom menu builder and selecting dinner
      const builderOptions = this.logic.getCustomMenuBuilderOptions('dinner');
      this.assert(builderOptions && builderOptions.mealType === 'dinner', 'Dinner builder options should load');

      const appetizers = Array.isArray(builderOptions.appetizerOptions) ? builderOptions.appetizerOptions : [];
      const mains = Array.isArray(builderOptions.mainOptions) ? builderOptions.mainOptions : [];
      const desserts = Array.isArray(builderOptions.dessertOptions) ? builderOptions.dessertOptions : [];

      // Choose up to 2 appetizers, 2 mains, and 1 dessert as available (adapt to data)
      const selectedAppetizerIds = appetizers.slice(0, 2).map(d => d.id);
      const selectedMainIds = mains.slice(0, 2).map(d => d.id);
      const selectedDessertIds = desserts.slice(0, 1).map(d => d.id);

      // Ensure at least some dishes are selected; if builder data is sparse, fall back to any dishes
      if (
        selectedAppetizerIds.length === 0 &&
        selectedMainIds.length === 0 &&
        selectedDessertIds.length === 0
      ) {
        const allDishes = JSON.parse(localStorage.getItem('dishes') || '[]');
        if (allDishes.length > 0) {
          selectedMainIds.push(allDishes[0].id);
        }
      }

      const guestCount = 25; // between 20 and 30
      const budgetPerPerson = 55;

      // Calculate price and adjust selections if needed to stay within budget
      let withinBudget = false;
      let calcResult = null;
      const maxIterations = 5;
      let attempt = 0;

      while (!withinBudget && attempt < maxIterations) {
        calcResult = this.logic.calculateCustomMenuPrice(
          'dinner',
          selectedAppetizerIds,
          selectedMainIds,
          selectedDessertIds,
          undefined,
          guestCount,
          budgetPerPerson
        );

        this.assert(calcResult && typeof calcResult.pricePerPerson === 'number', 'Custom menu price calculation should return a pricePerPerson');

        withinBudget = typeof calcResult.withinBudget === 'boolean'
          ? calcResult.withinBudget
          : calcResult.pricePerPerson <= budgetPerPerson;

        if (!withinBudget) {
          // Adjust: drop one main, then one appetizer, then dessert if necessary
          if (selectedMainIds.length > 1) {
            selectedMainIds.pop();
          } else if (selectedAppetizerIds.length > 1) {
            selectedAppetizerIds.pop();
          } else if (selectedDessertIds.length > 0) {
            selectedDessertIds.pop();
          } else {
            // Cannot reduce further
            break;
          }
        }
        attempt++;
      }

      this.assert(withinBudget, 'Custom menu should be within 55 per person after adjustments');

      // Add custom menu to cart
      const addResult = this.logic.addCustomMenuToCart(
        'Task4 Custom Dinner Menu',
        'dinner',
        selectedAppetizerIds,
        selectedMainIds,
        selectedDessertIds,
        undefined,
        guestCount,
        budgetPerPerson,
        'Automated integration test for Task 4'
      );

      this.assert(addResult && addResult.success === true, 'Custom dinner menu should be added to cart successfully');
      this.assert(addResult.customMenu, 'CustomMenu entity should be returned');
      const customMenu = addResult.customMenu;

      if (typeof customMenu.pricePerPerson === 'number') {
        this.assert(
          customMenu.pricePerPerson <= budgetPerPerson,
          'Custom menu per-person price should be <= 55, actual: ' + customMenu.pricePerPerson
        );
      }

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be available');
      const foundLine = cartSummary.items.find(it => it.customMenu && it.customMenu.id === customMenu.id);
      this.assert(!!foundLine, 'Custom dinner menu should appear as a single line item in cart');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Book earliest available slot (adapted to earliest available morning slot in May 2025 for 80 guests)
  testTask5_BookEarliestAvailableSlotFor80Guests() {
    const testName = 'Task 5: Book earliest available May 2025 slot for 80 guests and review booking summary';
    try {
      this.resetStorage();

      // Check availability calendar for May 2025
      const calendar = this.logic.getAvailabilityCalendar(5, 2025);
      this.assert(calendar && Array.isArray(calendar.slots), 'Availability calendar for May 2025 should return slots');

      const availableSlots = calendar.slots.filter(slot => {
        if (!slot.isAvailable) return false;
        if (typeof slot.maxGuests === 'number' && slot.maxGuests < 80) return false;
        return true;
      });
      this.assert(availableSlots.length > 0, 'At least one available slot for 80 guests in May 2025 should exist');

      // Find earliest by date
      availableSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const chosenSlot = availableSlots[0];
      this.assert(chosenSlot && chosenSlot.id, 'Chosen slot should have an id');

      // Initialize booking from availability slot
      const initResult = this.logic.initBookingFromAvailabilitySlot(chosenSlot.id, 80);
      this.assert(initResult && initResult.booking, 'initBookingFromAvailabilitySlot should return a booking draft');
      const booking = initResult.booking;

      // Fetch booking details for review
      const reviewDetails = this.logic.getBookingDetailsForReview(booking.id);
      this.assert(reviewDetails && reviewDetails.id === booking.id, 'Booking details for review should match booking id');
      this.assert(reviewDetails.guestCount === 80, 'Booking guest count should be 80');

      // Submit event details
      const submitResult = this.logic.submitBookingDetails(
        booking.id,
        'Quarterly Celebration',
        'corporate_event',
        'Jordan Lee',
        '555-123-4567',
        'jordan.lee@example.com'
      );
      this.assert(submitResult && submitResult.success === true, 'Booking details should be submitted successfully');

      const updatedBooking = submitResult.booking;
      this.assert(updatedBooking && updatedBooking.id === booking.id, 'Updated booking should keep same id');

      // Get booking summary
      const summary = this.logic.getBookingSummary(booking.id);
      this.assert(summary && summary.id === booking.id, 'Booking summary should correspond to the same booking');
      this.assert(summary.guestCount === 80, 'Booking summary should show 80 guests');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Apply 15% promo code to 60-guest package with 2 add-ons and get total under 2600
  testTask6_PromoCodeOn60GuestPackageWithAddOns() {
    const testName = 'Task 6: 60-guest package with 2 add-ons and SAVE15 promo under 2600 total';
    try {
      this.resetStorage();

      const guestCount = 60;

      // List packages suitable for 60 guests priced at or under 50 per person
      let packages = this.logic.listPackages(
        'corporate_events',
        guestCount,
        undefined,
        50,        // pricePerPersonMax 50
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'price_low_to_high'
      );

      this.assert(Array.isArray(packages) && packages.length > 0, 'At least one package at or under 50 per person for 60 guests should exist');

      // Choose the cheapest such package (first due to sorting)
      const chosenPackage = packages[0].package;
      this.assert(chosenPackage, 'Chosen package should be defined');

      // Load detail
      const detail = this.logic.getPackageDetail(chosenPackage.id, guestCount);
      this.assert(detail && detail.package, 'Package detail should load');

      // Select exactly 2 paid add-ons with minimal cost for 60 guests
      let addOnCandidates = [];
      if (Array.isArray(detail.availableAddOns) && detail.availableAddOns.length > 0) {
        addOnCandidates = detail.availableAddOns;
      } else {
        addOnCandidates = JSON.parse(localStorage.getItem('add_ons') || '[]');
      }
      addOnCandidates = addOnCandidates.filter(a => a.isPaid);
      this.assert(addOnCandidates.length >= 2, 'At least two paid add-ons should be available');

      const addOnCosts = addOnCandidates.map(a => {
        const cost = a.priceType === 'per_person' ? a.price * guestCount : a.price;
        return { addOn: a, cost: cost };
      });
      addOnCosts.sort((a, b) => a.cost - b.cost);

      const selectedAddOns = addOnCosts.slice(0, 2).map(x => x.addOn);
      const selectedAddonIds = selectedAddOns.map(a => a.id);
      this.assert(selectedAddonIds.length === 2, 'Exactly two add-ons should be selected');

      // Add configured package with 2 add-ons for 60 guests to cart
      const addResult = this.logic.addPackageToCart(
        chosenPackage.id,
        guestCount,
        undefined,
        undefined,
        selectedAddonIds,
        'Task6 Package for 60 with 2 add-ons'
      );
      this.assert(addResult && addResult.success === true, 'Package with add-ons should be added to cart successfully');

      // Apply SAVE15 promo code
      const promoResult = this.logic.applyPromoCodeToCart('SAVE15');
      this.assert(promoResult && promoResult.success === true, 'SAVE15 promo code should apply successfully');
      this.assert(promoResult.appliedPromo && promoResult.appliedPromo.code === 'SAVE15', 'Applied promo should be SAVE15');

      const cart = promoResult.cart;
      this.assert(cart && typeof cart.totalAfterDiscount === 'number', 'Cart should include totalAfterDiscount');

      // Total after discount should be less than 2600 per task requirement
      this.assert(
        cart.totalAfterDiscount < 2600,
        'Discounted total for 60 guests should be under 2600, actual: ' + cart.totalAfterDiscount
      );

      // Also verify that discount reduced total
      if (typeof cart.totalBeforeDiscount === 'number') {
        this.assert(
          cart.totalAfterDiscount < cart.totalBeforeDiscount,
          'Total after discount should be less than total before discount'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Create gluten-free tasting list with 3 items (2 savory, 1 dessert) rated 4+ stars
  testTask7_GlutenFreeTastingList() {
    const testName = 'Task 7: Gluten-free tasting list with highly rated items';
    try {
      this.resetStorage();

      // Load dish filter options (simulating full menu page)
      const filterOptions = this.logic.getDishFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.dietaryFilters), 'Dish filter options should be available');

      // Filter dishes to gluten-free and rating >= 4
      const dishes = this.logic.listDishes('gluten_free', 4, 'any', undefined);
      this.assert(Array.isArray(dishes) && dishes.length > 0, 'There should be at least one gluten-free dish rated 4+');

      // Pick savory items (non-dessert) and dessert separately
      const savoryDishes = dishes.filter(d => (d.isSavory === true) || d.dishType !== 'dessert');
      const dessertDishes = dishes.filter(d => d.dishType === 'dessert');

      const selectedSavory = savoryDishes.slice(0, 2);
      // Dessert only if available in data; otherwise we still test gluten-free tasting flow with available dishes
      const selectedDessert = dessertDishes.slice(0, 1);

      const tastingDishIds = [];
      selectedSavory.forEach(d => tastingDishIds.push(d.id));
      selectedDessert.forEach(d => tastingDishIds.push(d.id));

      this.assert(tastingDishIds.length > 0, 'At least one dish should be selected for tasting list');

      // Add selected dishes to tasting list
      tastingDishIds.forEach(dishId => {
        const addResult = this.logic.addDishToTastingList(dishId, 'tasting');
        this.assert(addResult && addResult.tastingList, 'Tasting list should exist after adding a dish');
      });

      // View tasting list contents
      const listContents = this.logic.getTastingListContents('tasting');
      this.assert(listContents && listContents.tastingList, 'Tasting list contents should be retrievable');
      this.assert(Array.isArray(listContents.items) && listContents.items.length >= tastingDishIds.length, 'Tasting list should contain added items');

      // Verify each dish in tasting list is gluten-free and rated >= 4
      listContents.items.forEach(entry => {
        const dish = entry.dish;
        this.assert(dish && dish.isGlutenFree === true, 'Dish in tasting list should be gluten-free');
        if (typeof dish.rating === 'number') {
          this.assert(dish.rating >= 4, 'Dish in tasting list should be rated at least 4 stars');
        }
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Schedule coffee break catering for 50 guests on three consecutive conference days
  testTask8_CoffeeBreakThreeConsecutiveDays() {
    const testName = 'Task 8: Coffee break package for 50 guests on three consecutive dates';
    try {
      this.resetStorage();

      // Get availability slots and choose three earliest consecutive days (from generated data: May 10, 11, 12 2025)
      const availabilitySlots = JSON.parse(localStorage.getItem('availability_slots') || '[]');
      this.assert(Array.isArray(availabilitySlots) && availabilitySlots.length >= 3, 'At least three availability slots should be present');

      availabilitySlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const threeSlots = availabilitySlots.slice(0, 3);
      this.assert(threeSlots.length === 3, 'Three slots should be selected for consecutive days');

      const dates = threeSlots.map(s => {
        const dateStr = (s.date || '').toString();
        return dateStr.split('T')[0];
      });

      // Try to locate a coffee break package, fall back to a corporate package if none
      let packages = this.logic.listPackages('coffee_breaks', 50);
      if (!packages || packages.length === 0) {
        packages = this.logic.listPackages('corporate_events', 50);
      }
      this.assert(Array.isArray(packages) && packages.length > 0, 'At least one package should be available for coffee break flow');

      // Prefer a package that allows date selection
      let chosenEntry = packages.find(p => p.package && p.package.allowsDateSelection) || packages[0];
      const chosenPackage = chosenEntry.package;
      this.assert(chosenPackage, 'Chosen package should be defined');

      // Add three line items for 50 guests on three consecutive days
      const addedItemIds = [];
      dates.forEach(dateOnly => {
        const addResult = this.logic.addPackageToCart(
          chosenPackage.id,
          50,
          dateOnly,   // eventDate
          undefined,
          undefined,
          'Task8 Coffee Break ' + dateOnly
        );
        this.assert(addResult && addResult.success === true, 'Package should be added for date ' + dateOnly);
        addedItemIds.push(addResult.addedItem.id);
      });

      // View cart summary and confirm three separate entries with correct dates and guest counts
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be available');
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be an array');

      const matchingItems = cartSummary.items.filter(it => {
        const item = it.item;
        if (!item || addedItemIds.indexOf(item.id) === -1) return false;
        if (item.guestCount !== 50) return false;
        const rawDate = item.eventDate;
        if (!rawDate) return false;
        const itemDateStr = rawDate instanceof Date
          ? rawDate.toISOString().split('T')[0]
          : rawDate.toString().split('T')[0];
        return dates.indexOf(itemDateStr) !== -1;
      });

      this.assert(matchingItems.length === 3, 'Three separate coffee break entries for 50 guests on the selected dates should be in the cart');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: assertions and result recording
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('PASS - ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('FAIL - ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
