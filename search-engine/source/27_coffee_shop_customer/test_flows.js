// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided for initial population
    const generatedData = {
      "menu_categories": [
        {
          "id": "lattes",
          "name": "Lattes",
          "slug": "lattes",
          "description": "Signature and seasonal lattes made with freshly pulled espresso shots.",
          "sortOrder": 1
        },
        {
          "id": "espresso_drinks",
          "name": "Espresso Drinks",
          "slug": "espresso_drinks",
          "description": "Espresso-based classics like americanos, cappuccinos, and macchiatos.",
          "sortOrder": 2
        },
        {
          "id": "bakery",
          "name": "Bakery",
          "slug": "bakery",
          "description": "Freshly baked pastries, muffins, and breads to pair with your coffee.",
          "sortOrder": 3
        }
      ],
      "notification_preferences": [
        {
          "id": "np_default_mixed",
          "emailPromotionsEnabled": true,
          "emailOrderUpdatesEnabled": true,
          "pushPromotionsEnabled": true,
          "pushOrderUpdatesEnabled": true,
          "smsOrderUpdatesEnabled": false,
          "smsPromotionsEnabled": false,
          "updatedAt": "2026-02-15T10:30:00Z"
        },
        {
          "id": "np_email_orders_only",
          "emailPromotionsEnabled": false,
          "emailOrderUpdatesEnabled": true,
          "pushPromotionsEnabled": false,
          "pushOrderUpdatesEnabled": false,
          "smsOrderUpdatesEnabled": false,
          "smsPromotionsEnabled": false,
          "updatedAt": "2026-02-20T14:05:00Z"
        },
        {
          "id": "np_marketing_heavy",
          "emailPromotionsEnabled": true,
          "emailOrderUpdatesEnabled": true,
          "pushPromotionsEnabled": true,
          "pushOrderUpdatesEnabled": false,
          "smsOrderUpdatesEnabled": true,
          "smsPromotionsEnabled": true,
          "updatedAt": "2026-02-25T09:15:00Z"
        }
      ],
      "payment_cards": [
        {
          "id": "card_demo_visa_1111",
          "cardBrand": "visa",
          "last4": "1111",
          "expMonth": 12,
          "expYear": 2030,
          "cardholderName": "Demo User One",
          "billingZip": "94103",
          "isDefault": true,
          "isActive": true,
          "createdAt": "2025-11-10T09:00:00Z",
          "label": "Personal Visa"
        },
        {
          "id": "card_demo_mc_2222",
          "cardBrand": "mastercard",
          "last4": "2222",
          "expMonth": 5,
          "expYear": 2029,
          "cardholderName": "Demo User Two",
          "billingZip": "94110",
          "isDefault": false,
          "isActive": true,
          "createdAt": "2025-12-01T16:25:00Z",
          "label": "Work Mastercard"
        },
        {
          "id": "card_demo_amex_0005",
          "cardBrand": "amex",
          "last4": "0005",
          "expMonth": 7,
          "expYear": 2031,
          "cardholderName": "Demo User Three",
          "billingZip": "94607",
          "isDefault": false,
          "isActive": true,
          "createdAt": "2026-01-05T11:40:00Z",
          "label": "Travel Amex"
        }
      ],
      "stores": [
        {
          "id": "sf_5th_and_mission",
          "name": "Market Street Caf\u00e9 - 5th & Mission",
          "addressLine1": "899 Market St",
          "addressLine2": "Suite 100",
          "city": "San Francisco",
          "state": "CA",
          "zipCode": "94103",
          "latitude": 37.7831,
          "longitude": -122.4075,
          "distanceMiles": 0.2,
          "phoneNumber": "(415) 555-0101",
          "hoursSummary": "Mon\u2013Fri 6:00 AM\u20138:00 PM; Sat\u2013Sun 7:00 AM\u20138:00 PM",
          "isOpenNow": true,
          "amenities": [
            "wifi",
            "mobile_order_pickup",
            "indoor_seating"
          ],
          "mapImageUrl": "https://img.peerspace.com/image/upload/c_crop,g_custom/g_auto,c_fill,q_auto:eco,f_auto,fl_progressive:steep,w_1200,h_495/pco1btktizbjbwtcjert",
          "canMobileOrder": true
        },
        {
          "id": "sf_soma_harrison",
          "name": "SoMa Roastery & Caf\u00e9",
          "addressLine1": "645 Harrison St",
          "addressLine2": "",
          "city": "San Francisco",
          "state": "CA",
          "zipCode": "94107",
          "latitude": 37.7848,
          "longitude": -122.3953,
          "distanceMiles": 0.6,
          "phoneNumber": "(415) 555-0102",
          "hoursSummary": "Daily 6:00 AM\u20137:00 PM",
          "isOpenNow": true,
          "amenities": [
            "wifi",
            "outdoor_seating",
            "mobile_order_pickup"
          ],
          "mapImageUrl": "https://fastly.4sqi.net/img/general/699x268/2449497_S1ewd_k3MpLPLq0Twyo3Tu3ZUPEoYnNKybBPoNlxq0o.jpg",
          "canMobileOrder": true
        },
        {
          "id": "sf_civic_center",
          "name": "Civic Center Plaza Caf\u00e9",
          "addressLine1": "50 Grove St",
          "addressLine2": "",
          "city": "San Francisco",
          "state": "CA",
          "zipCode": "94102",
          "latitude": 37.7793,
          "longitude": -122.4167,
          "distanceMiles": 0.9,
          "phoneNumber": "(415) 555-0103",
          "hoursSummary": "Mon\u2013Fri 6:30 AM\u20136:30 PM; Sat 7:00 AM\u20135:00 PM; Sun Closed",
          "isOpenNow": true,
          "amenities": [
            "wifi",
            "indoor_seating"
          ],
          "mapImageUrl": "https://img.peerspace.com/image/upload/c_crop,g_custom/g_auto,c_fill,q_auto:eco,f_auto,fl_progressive:steep,w_1200,h_495/gb80ytm1cwkljsukpmhn",
          "canMobileOrder": true
        }
      ],
      "account_profiles": [
        {
          "id": "acct_demo_user1",
          "fullName": "Demo User One",
          "email": "demo.user1@example.com",
          "password": "CoffeeDemo!123",
          "favoriteStoreId": "sf_mission_valencia",
          "defaultPaymentCardId": "card_demo_visa_1111",
          "loyaltyPointsBalance": 220,
          "loyaltyTier": "silver",
          "phoneNumber": "+14155551001",
          "termsAccepted": true,
          "passwordLastChangedAt": "2025-10-01T09:00:00Z",
          "createdAt": "2025-09-15T12:00:00Z",
          "updatedAt": "2026-02-20T16:30:00Z"
        },
        {
          "id": "acct_demo_user2",
          "fullName": "Demo User Two",
          "email": "demo.user2@example.com",
          "password": "LatteLover!321",
          "favoriteStoreId": "sf_5th_and_mission",
          "defaultPaymentCardId": "card_demo_mc_2222",
          "loyaltyPointsBalance": 880,
          "loyaltyTier": "gold",
          "phoneNumber": "+14155551002",
          "termsAccepted": true,
          "passwordLastChangedAt": "2025-11-05T11:15:00Z",
          "createdAt": "2025-10-10T08:45:00Z",
          "updatedAt": "2026-02-25T10:20:00Z"
        },
        {
          "id": "acct_demo_user3",
          "fullName": "Demo User Three",
          "email": "demo.user3@example.com",
          "password": "HistoryFan!555",
          "favoriteStoreId": "sf_north_beach",
          "defaultPaymentCardId": "card_demo_amex_0005",
          "loyaltyPointsBalance": 160,
          "loyaltyTier": "bronze",
          "phoneNumber": "+14155551003",
          "termsAccepted": true,
          "passwordLastChangedAt": "2025-10-20T14:10:00Z",
          "createdAt": "2025-10-05T13:20:00Z",
          "updatedAt": "2026-02-18T09:40:00Z"
        }
      ],
      "products": [
        {
          "id": "latte_classic",
          "name": "Classic Latte",
          "description": "Smooth espresso combined with steamed milk and a light layer of foam.",
          "imageUrl": "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop&auto=format&q=80",
          "baseType": "drink",
          "menuCategoryId": "lattes",
          "isActive": true,
          "rating": 4.6,
          "ratingCount": 420,
          "priceSmall": 3.75,
          "priceMedium": 4.25,
          "priceLarge": 4.75,
          "defaultSize": "medium",
          "availableSizes": [
            "small",
            "medium",
            "large"
          ],
          "availableMilkOptions": [
            "whole_milk",
            "two_percent",
            "skim_milk",
            "oat_milk",
            "almond_milk"
          ],
          "isRewardEligible": true,
          "createdAt": "2025-08-15T09:00:00Z"
        },
        {
          "id": "latte_vanilla",
          "name": "Vanilla Latte",
          "description": "Espresso and steamed milk with classic vanilla syrup.",
          "imageUrl": "https://st.focusedcollection.com/9163412/i/650/focused_459094284-stock-photo-top-view-mug-cappuccino-coffee.jpg",
          "baseType": "drink",
          "menuCategoryId": "lattes",
          "isActive": true,
          "rating": 4.5,
          "ratingCount": 310,
          "priceSmall": 3.95,
          "priceMedium": 4.45,
          "priceLarge": 4.95,
          "defaultSize": "medium",
          "availableSizes": [
            "small",
            "medium",
            "large"
          ],
          "availableMilkOptions": [
            "whole_milk",
            "two_percent",
            "skim_milk",
            "oat_milk",
            "almond_milk"
          ],
          "isRewardEligible": true,
          "createdAt": "2025-08-20T09:00:00Z"
        },
        {
          "id": "latte_caramel",
          "name": "Caramel Latte",
          "description": "Rich espresso, steamed milk, and buttery caramel sauce.",
          "imageUrl": "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop&auto=format&q=80",
          "baseType": "drink",
          "menuCategoryId": "lattes",
          "isActive": true,
          "rating": 4.4,
          "ratingCount": 275,
          "priceSmall": 4.15,
          "priceMedium": 4.65,
          "priceLarge": 5.15,
          "defaultSize": "medium",
          "availableSizes": [
            "small",
            "medium",
            "large"
          ],
          "availableMilkOptions": [
            "whole_milk",
            "two_percent",
            "skim_milk",
            "oat_milk"
          ],
          "isRewardEligible": true,
          "createdAt": "2025-08-25T09:00:00Z"
        }
      ],
      "rewards": [
        {
          "id": "reward_bakery_cookie_free",
          "name": "Free Chocolate Chip Cookie",
          "description": "Redeem for one freshly baked chocolate chip cookie.",
          "category": "bakery",
          "price": 2.95,
          "rating": 4.8,
          "ratingCount": 410,
          "pointsRequired": 250,
          "isAvailable": true,
          "menuCategoryId": "bakery",
          "productId": "bakery_cookie",
          "createdAt": "2025-10-01T09:00:00Z"
        },
        {
          "id": "reward_bakery_muffin_single",
          "name": "Blueberry Muffin Reward",
          "description": "Enjoy one blueberry muffin packed with real blueberries.",
          "category": "bakery",
          "price": 4.25,
          "rating": 4.3,
          "ratingCount": 225,
          "pointsRequired": 350,
          "isAvailable": true,
          "menuCategoryId": "bakery",
          "productId": "bakery_blueberry_muffin",
          "createdAt": "2025-10-03T09:00:00Z"
        },
        {
          "id": "reward_bakery_croissant_single",
          "name": "Butter Croissant Reward",
          "description": "Redeem for one flaky, buttery croissant.",
          "category": "bakery",
          "price": 3.45,
          "rating": 4.7,
          "ratingCount": 310,
          "pointsRequired": 300,
          "isAvailable": true,
          "menuCategoryId": "bakery",
          "productId": "bakery_croissant",
          "createdAt": "2025-10-05T09:00:00Z"
        }
      ],
      "orders": [
        {
          "id": "order_u2_tomorrow_pickup",
          "status": "draft",
          "storeId": "sf_5th_and_mission",
          "createdAt": "2026-03-03T07:55:00Z",
          "updatedAt": "2026-03-03T08:05:00Z",
          "pickupDateTime": "2026-03-04T08:30:00Z",
          "paymentCardId": "card_demo_mc_2222",
          "notes": "Morning pickup around 8:30 AM.",
          "source": "web",
          "subtotalAmount": 4.25,
          "taxAmount": 0.43,
          "totalAmount": 4.68
        },
        {
          "id": "order_u3_hist_20260110",
          "status": "completed",
          "storeId": "sf_north_beach",
          "createdAt": "2026-01-10T16:00:00Z",
          "updatedAt": "2026-01-10T16:25:00Z",
          "pickupDateTime": "2026-01-10T16:30:00Z",
          "paymentCardId": "card_demo_amex_0005",
          "notes": "Afternoon coffee and snack.",
          "source": "web",
          "subtotalAmount": 6.4,
          "taxAmount": 0.64,
          "totalAmount": 7.04
        },
        {
          "id": "order_u3_hist_20260205",
          "status": "completed",
          "storeId": "sf_north_beach",
          "createdAt": "2026-02-05T08:15:00Z",
          "updatedAt": "2026-02-05T08:40:00Z",
          "pickupDateTime": "2026-02-05T08:45:00Z",
          "paymentCardId": "card_demo_amex_0005",
          "notes": "Morning large drink order.",
          "source": "web",
          "subtotalAmount": 8.4,
          "taxAmount": 0.84,
          "totalAmount": 9.24
        }
      ],
      "reward_redemptions": [
        {
          "id": "rr_u5_cookie_20260228",
          "rewardId": "reward_bakery_cookie_free",
          "redeemedAt": "2026-02-28T14:25:00Z",
          "quantity": 1,
          "orderId": "order_u5_reward_bakery_20260228",
          "status": "applied",
          "pointsSpent": 250
        },
        {
          "id": "rr_u5_muffin_20260220",
          "rewardId": "reward_bakery_muffin_single",
          "redeemedAt": "2026-02-20T09:10:00Z",
          "quantity": 1,
          "status": "applied",
          "pointsSpent": 350
        },
        {
          "id": "rr_u3_latte_20260205",
          "rewardId": "reward_drink_classic_latte",
          "redeemedAt": "2026-02-05T08:20:00Z",
          "quantity": 1,
          "orderId": "order_u3_hist_20260205",
          "status": "applied",
          "pointsSpent": 450
        }
      ],
      "order_items": [
        {
          "id": "oi_u2_latte_tomorrow_1",
          "orderId": "order_u2_tomorrow_pickup",
          "productId": "latte_classic",
          "productName": "Classic Latte",
          "size": "medium",
          "milkType": "whole_milk",
          "quantity": 1,
          "unitPrice": 4.25,
          "totalPrice": 4.25,
          "isRewardRedemption": false,
          "createdAt": "2026-03-03T08:02:00Z"
        },
        {
          "id": "oi_u3_20260110_large_drip",
          "orderId": "order_u3_hist_20260110",
          "productId": "coffee_drip",
          "productName": "Brewed Drip Coffee",
          "size": "large",
          "milkType": "no_milk",
          "quantity": 1,
          "unitPrice": 2.95,
          "totalPrice": 2.95,
          "isRewardRedemption": false,
          "createdAt": "2026-01-10T16:05:00Z"
        },
        {
          "id": "oi_u3_20260110_croissant",
          "orderId": "order_u3_hist_20260110",
          "productId": "bakery_croissant",
          "productName": "Butter Croissant",
          "size": "small",
          "milkType": "no_milk",
          "quantity": 1,
          "unitPrice": 3.45,
          "totalPrice": 3.45,
          "isRewardRedemption": false,
          "createdAt": "2026-01-10T16:06:00Z"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:50:01.939623"
      }
    };

    // Persist into localStorage using correct storage keys
    localStorage.setItem('menu_categories', JSON.stringify(generatedData.menu_categories || []));
    localStorage.setItem('notification_preferences', JSON.stringify(generatedData.notification_preferences || []));
    localStorage.setItem('payment_cards', JSON.stringify(generatedData.payment_cards || []));
    localStorage.setItem('stores', JSON.stringify(generatedData.stores || []));
    localStorage.setItem('account_profiles', JSON.stringify(generatedData.account_profiles || []));
    localStorage.setItem('products', JSON.stringify(generatedData.products || []));
    localStorage.setItem('rewards', JSON.stringify(generatedData.rewards || []));
    localStorage.setItem('orders', JSON.stringify(generatedData.orders || []));
    localStorage.setItem('reward_redemptions', JSON.stringify(generatedData.reward_redemptions || []));
    localStorage.setItem('order_items', JSON.stringify(generatedData.order_items || []));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata || {}));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SetNearestFavoriteStore();
    this.testTask2_SignupAndDashboard();
    this.testTask3_ScheduleMediumLattePickup();
    this.testTask4_ReorderCheapestLargeDrink();
    this.testTask5_AddPaymentCardAndSetDefault();
    this.testTask6_RedeemBakeryRewardUnderFive();
    this.testTask7_UpdateNotificationPreferencesSmsOnly();
    this.testTask8_ChangePasswordAndReLogin();

    return this.results;
  }

  // Task 1: Log in and set the nearest caf\u00e9 within 5 miles as favorite store
  testTask1_SetNearestFavoriteStore() {
    const testName = 'Task 1: Set nearest caf\u00e9 within 5 miles as favorite store';
    console.log('Testing:', testName);

    try {
      const email = 'demo.user1@example.com';
      const password = 'CoffeeDemo!123';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const stores = this.logic.searchStoresByZip('94103');
      this.assert(Array.isArray(stores) && stores.length > 0, 'Store search should return results');

      const candidates = stores.filter(function (s) {
        return typeof s.distanceMiles === 'number' && s.distanceMiles <= 5;
      });
      this.assert(candidates.length > 0, 'Should have at least one store within 5 miles');

      let nearestStore = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].distanceMiles < nearestStore.distanceMiles) {
          nearestStore = candidates[i];
        }
      }

      const detail = this.logic.getStoreDetail(nearestStore.id);
      this.assert(detail && detail.store && detail.store.id === nearestStore.id, 'Store detail should match selected store');

      const favResult = this.logic.setFavoriteStore(nearestStore.id);
      this.assert(favResult && favResult.success === true, 'Setting favorite store should succeed');
      this.assert(favResult.favoriteStore && favResult.favoriteStore.id === nearestStore.id,
        'Favorite store in response should be the selected store');

      const home = this.logic.getHomePageContent();
      this.assert(home && home.storeSummary, 'Home page storeSummary should exist');
      if (home.storeSummary.hasFavoriteStore) {
        this.assert(home.storeSummary.favoriteStore && home.storeSummary.favoriteStore.id === nearestStore.id,
          'Home favorite store should match selected favorite');
      }

      const accounts = JSON.parse(localStorage.getItem('account_profiles') || '[]');
      const account = accounts.find(function (a) { return a.email === email; });
      this.assert(account, 'Account profile should exist in storage');
      this.assert(account.favoriteStoreId === nearestStore.id,
        'Account favoriteStoreId should be updated to selected store');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a new customer account and access the account dashboard
  testTask2_SignupAndDashboard() {
    const testName = 'Task 2: Create new customer account and access dashboard';
    console.log('Testing:', testName);

    try {
      const fullName = 'Jordan Sample';
      const email = 'jordan.sample01@example.com';
      const password = 'StrongCoffee!789';

      const signupResult = this.logic.signupAccount(fullName, email, password, password, true);
      this.assert(signupResult && signupResult.success === true, 'Signup should succeed');
      this.assert(signupResult.accountDashboard, 'Signup should return accountDashboard');

      const dashboard = signupResult.accountDashboard;
      this.assert(dashboard.email === email, 'Dashboard email should match signup email');
      this.assert(dashboard.fullName === fullName, 'Dashboard fullName should match signup name');
      this.assert(typeof dashboard.loyaltyPointsBalance === 'number', 'Dashboard should include loyaltyPointsBalance');

      const dashSummary = this.logic.getAccountDashboardSummary();
      this.assert(dashSummary && dashSummary.email === email, 'Account dashboard summary should reflect new user');

      const accounts = JSON.parse(localStorage.getItem('account_profiles') || '[]');
      const account = accounts.find(function (a) { return a.email === email; });
      this.assert(account, 'New account should be persisted in storage');
      this.assert(account.fullName === fullName, 'Stored fullName should match');
      this.assert(account.termsAccepted === true, 'termsAccepted should be true');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Log in and schedule a medium latte pickup closest to 8:30 AM tomorrow
  testTask3_ScheduleMediumLattePickup() {
    const testName = 'Task 3: Schedule medium latte pickup closest to 8:30 AM tomorrow';
    console.log('Testing:', testName);

    try {
      const email = 'demo.user2@example.com';
      const password = 'LatteLover!321';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const storeOptions = this.logic.getPickupStoreOptions();
      this.assert(storeOptions && Array.isArray(storeOptions.stores) && storeOptions.stores.length > 0,
        'Pickup store options should include at least one store');

      const storeId = storeOptions.favoriteStoreId || storeOptions.stores[0].id;
      const pickupStoreResult = this.logic.setCurrentPickupStore(storeId);
      this.assert(pickupStoreResult && pickupStoreResult.success === true,
        'Setting current pickup store should succeed');
      this.assert(pickupStoreResult.pickupStore && pickupStoreResult.pickupStore.id === storeId,
        'Pickup store in response should match selected store');

      const menuCategories = this.logic.getMenuCategories();
      this.assert(Array.isArray(menuCategories) && menuCategories.length > 0,
        'Menu categories should be returned');

      const latteCategory = menuCategories.find(function (c) { return c.slug === 'lattes'; });
      this.assert(latteCategory, 'Lattes category should exist');

      const menu = this.logic.getMenuProductsForCategory('lattes');
      this.assert(menu && Array.isArray(menu.products) && menu.products.length > 0,
        'Latte products should be returned');

      const latteProductSummary = menu.products[0];
      const productDetails = this.logic.getProductDetails(latteProductSummary.id);
      this.assert(productDetails && productDetails.product && productDetails.product.id === latteProductSummary.id,
        'Product details should match selected latte');

      this.assert(Array.isArray(productDetails.product.availableSizes), 'Product should have availableSizes');
      this.assert(productDetails.product.availableSizes.indexOf('medium') !== -1,
        'Product should support medium size');

      // Compute tomorrow's date in YYYY-MM-DD format
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const year = tomorrow.getFullYear();
      const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
      const day = tomorrow.getDate().toString().padStart(2, '0');
      const dateStr = year + '-' + month + '-' + day;

      const slots = this.logic.getAvailablePickupTimeSlots(dateStr);
      this.assert(Array.isArray(slots) && slots.length > 0,
        'Pickup time slots should be available for tomorrow');

      function timeToMinutes(timeStr) {
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }

      const targetMinutes = 8 * 60 + 30; // 8:30 AM
      let candidateSlots = slots.filter(function (s) {
        return s.isAvailable && typeof s.startTime === 'string' && s.startTime >= '08:00' && s.startTime < '09:00';
      });

      if (candidateSlots.length === 0) {
        candidateSlots = slots.filter(function (s) { return s.isAvailable; });
      }

      this.assert(candidateSlots.length > 0, 'Should have at least one available pickup slot');

      let chosenSlot = candidateSlots[0];
      let minDiff = Math.abs(timeToMinutes(chosenSlot.startTime) - targetMinutes);
      for (let i = 1; i < candidateSlots.length; i++) {
        const diff = Math.abs(timeToMinutes(candidateSlots[i].startTime) - targetMinutes);
        if (diff < minDiff) {
          chosenSlot = candidateSlots[i];
          minDiff = diff;
        }
      }

      const pickupDateTime = dateStr + 'T' + chosenSlot.startTime + ':00Z';

      const addResult = this.logic.addProductToCurrentOrder(
        latteProductSummary.id,
        'medium',
        'whole_milk',
        1,
        pickupDateTime
      );

      this.assert(addResult && addResult.success === true, 'Adding latte to current order should succeed');
      this.assert(addResult.orderItem, 'Order item should be returned');
      this.assert(addResult.orderItem.size === 'medium', 'Order item size should be medium');
      this.assert(addResult.orderItem.quantity === 1, 'Order item quantity should be 1');

      const orderSummary = addResult.orderSummary;
      this.assert(orderSummary && orderSummary.pickupDateTime,
        'Order summary should include pickupDateTime');
      this.assert(orderSummary.pickupDateTime.indexOf(dateStr) === 0,
        'Pickup date in summary should match selected date');

      const currentOrderSummary = this.logic.getCurrentOrderSummary();
      this.assert(currentOrderSummary && currentOrderSummary.hasActiveOrder === true,
        'There should be an active order after adding latte');
      this.assert(currentOrderSummary.orderId === addResult.currentOrderId,
        'Current order ID should match ID from addProductToCurrentOrder');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Log in and reorder the cheapest large drink from past orders
  testTask4_ReorderCheapestLargeDrink() {
    const testName = 'Task 4: Reorder cheapest large drink from past orders';
    console.log('Testing:', testName);

    try {
      const email = 'demo.user3@example.com';
      const password = 'HistoryFan!555';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const historyResult = this.logic.getOrderHistoryItems('price_low_to_high');
      this.assert(historyResult && Array.isArray(historyResult.items),
        'Order history items should be returned');
      this.assert(historyResult.items.length > 0, 'Order history should contain at least one item');

      const largeItems = historyResult.items.filter(function (item) {
        return item.size === 'large';
      });
      this.assert(largeItems.length > 0, 'There should be at least one large-sized drink in history');

      let cheapestLarge = largeItems[0];
      for (let i = 1; i < largeItems.length; i++) {
        if (largeItems[i].unitPrice < cheapestLarge.unitPrice) {
          cheapestLarge = largeItems[i];
        }
      }

      const reorderResult = this.logic.reorderPastItem(cheapestLarge.orderItemId);
      this.assert(reorderResult && reorderResult.success === true, 'Reordering past item should succeed');
      this.assert(reorderResult.orderItem, 'Reorder should return an orderItem');
      this.assert(reorderResult.orderItem.size === 'large', 'Reordered item size should be large');
      this.assert(reorderResult.orderItem.quantity >= 1, 'Reordered quantity should be at least 1');

      const currentOrderSummary = this.logic.getCurrentOrderSummary();
      this.assert(currentOrderSummary && currentOrderSummary.hasActiveOrder === true,
        'There should be an active order after reordering');
      this.assert(currentOrderSummary.itemCount >= 1,
        'Current order should contain at least one item');

      const currentOrderDetails = this.logic.getCurrentOrderDetails();
      this.assert(currentOrderDetails && Array.isArray(currentOrderDetails.items),
        'Current order details should include items array');
      const addedItem = currentOrderDetails.items.find(function (i) {
        return i.id === reorderResult.orderItem.id;
      });
      this.assert(addedItem, 'Reordered item should appear in current order details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Log in, add a new payment card, and set it as the default
  testTask5_AddPaymentCardAndSetDefault() {
    const testName = 'Task 5: Add new payment card and set as default';
    console.log('Testing:', testName);

    try {
      // Adapted to use existing user1
      const email = 'demo.user1@example.com';
      const password = 'CoffeeDemo!123';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const paymentSummaryBefore = this.logic.getPaymentMethodsSummary();
      this.assert(paymentSummaryBefore && Array.isArray(paymentSummaryBefore.cards),
        'Payment methods summary should include cards array');
      const previousDefaultId = paymentSummaryBefore.defaultPaymentCardId || null;

      const cardholderName = (loginResult.account && loginResult.account.fullName) || 'Demo User One';

      const addResult = this.logic.addPaymentCard(
        '4242424242424242',
        12,
        2030,
        '123',
        cardholderName,
        '94103',
        'Test Visa 4242'
      );

      this.assert(addResult && addResult.success === true, 'Adding new payment card should succeed');
      this.assert(addResult.card && addResult.card.id, 'New card should be returned with an ID');
      const newCard = addResult.card;
      this.assert(newCard.last4 === '4242', 'New card last4 should be 4242');

      const setDefaultResult = this.logic.setDefaultPaymentCard(newCard.id);
      this.assert(setDefaultResult && setDefaultResult.success === true,
        'Setting default payment card should succeed');
      this.assert(setDefaultResult.defaultPaymentCardId === newCard.id,
        'Default payment card ID in response should match new card');

      const paymentSummaryAfter = this.logic.getPaymentMethodsSummary();
      this.assert(paymentSummaryAfter && Array.isArray(paymentSummaryAfter.cards),
        'Payment methods summary after update should include cards array');
      this.assert(paymentSummaryAfter.defaultPaymentCardId === newCard.id,
        'Default payment card ID in summary should match new card');

      const newDefaultCard = paymentSummaryAfter.cards.find(function (c) {
        return c.id === newCard.id;
      });
      this.assert(newDefaultCard && newDefaultCard.isDefault === true,
        'Newly added card should be marked as default');

      if (previousDefaultId && previousDefaultId !== newCard.id) {
        const oldDefaultCard = paymentSummaryAfter.cards.find(function (c) {
          return c.id === previousDefaultId;
        });
        if (oldDefaultCard) {
          this.assert(oldDefaultCard.isDefault === false,
            'Previous default card should no longer be default');
        }
      }

      const accounts = JSON.parse(localStorage.getItem('account_profiles') || '[]');
      const account = accounts.find(function (a) { return a.email === email; });
      this.assert(account, 'Account profile should exist');
      this.assert(account.defaultPaymentCardId === newCard.id,
        'Account defaultPaymentCardId should match new default card');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Log in and redeem loyalty points for a bakery item under $5 with 4+ stars
  testTask6_RedeemBakeryRewardUnderFive() {
    const testName = 'Task 6: Redeem bakery reward under $5 with 4+ stars';
    console.log('Testing:', testName);

    try {
      // Adapted to use existing user2 who has sufficient points
      const email = 'demo.user2@example.com';
      const password = 'LatteLover!321';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const rewardsOverview = this.logic.getRewardsOverview();
      this.assert(rewardsOverview && typeof rewardsOverview.loyaltyPointsBalance === 'number',
        'Rewards overview should include loyaltyPointsBalance');
      const initialPoints = rewardsOverview.loyaltyPointsBalance;

      // Load filter options for coverage (no strict assertions on content)
      const filterOptions = this.logic.getRewardFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories),
        'Reward filter options should include categories');

      const rewardList = this.logic.getRewardList('bakery', 4.0, 5.0, 'price_asc');
      this.assert(Array.isArray(rewardList) && rewardList.length > 0,
        'Filtered bakery rewards should return at least one reward');

      const candidates = rewardList.filter(function (r) {
        const ratingOk = typeof r.rating !== 'number' || r.rating >= 4.0;
        return r.category === 'bakery' && r.price < 5 && ratingOk;
      });
      this.assert(candidates.length > 0,
        'There should be at least one bakery reward under $5 with rating >= 4');

      let chosenReward = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].price < chosenReward.price) {
          chosenReward = candidates[i];
        }
      }

      const rewardDetail = this.logic.getRewardDetail(chosenReward.id);
      this.assert(rewardDetail && rewardDetail.reward && rewardDetail.reward.id === chosenReward.id,
        'Reward detail should match selected reward');
      this.assert(rewardDetail.canRedeem === true,
        'Selected reward should be redeemable with current points');

      const redeemResult = this.logic.redeemReward(chosenReward.id, 1);
      this.assert(redeemResult && redeemResult.success === true, 'Reward redemption should succeed');
      this.assert(redeemResult.redemption && redeemResult.redemption.id,
        'Redemption record should be returned with ID');
      this.assert(redeemResult.redemption.rewardId === chosenReward.id,
        'Redemption rewardId should match selected reward');

      const pointsAfter = redeemResult.updatedPointsBalance;
      this.assert(typeof pointsAfter === 'number', 'Updated points balance should be a number');
      this.assert(pointsAfter < initialPoints, 'Points balance should decrease after redemption');

      // Add redeemed reward to current order as a reward redemption line item
      const storeOptions = this.logic.getPickupStoreOptions();
      this.assert(storeOptions && Array.isArray(storeOptions.stores) && storeOptions.stores.length > 0,
        'Pickup store options should be available');
      const storeId = storeOptions.favoriteStoreId || storeOptions.stores[0].id;
      const pickupStoreResult = this.logic.setCurrentPickupStore(storeId);
      this.assert(pickupStoreResult && pickupStoreResult.success === true,
        'Setting pickup store before adding reward item should succeed');

      const addRewardResult = this.logic.addRewardRedemptionToCurrentOrder(
        redeemResult.redemption.id
      );
      this.assert(addRewardResult && addRewardResult.success === true,
        'Adding reward redemption to current order should succeed');
      this.assert(addRewardResult.orderItem,
        'Order item for reward redemption should be returned');
      this.assert(addRewardResult.orderItem.isRewardRedemption === true,
        'Order item should be marked as reward redemption');
      this.assert(addRewardResult.orderItem.rewardRedemptionId === redeemResult.redemption.id,
        'Order item rewardRedemptionId should match redemption ID');

      const currentOrderSummary = this.logic.getCurrentOrderSummary();
      this.assert(currentOrderSummary && currentOrderSummary.hasActiveOrder === true,
        'There should be an active order after adding reward item');
      this.assert(currentOrderSummary.itemCount >= 1,
        'Current order should contain at least one item after reward addition');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Log in and update notification preferences to only receive SMS order updates
  testTask7_UpdateNotificationPreferencesSmsOnly() {
    const testName = 'Task 7: Update notification preferences to SMS order updates only';
    console.log('Testing:', testName);

    try {
      // Adapted to use existing user2
      const email = 'demo.user2@example.com';
      const password = 'LatteLover!321';

      const loginResult = this.logic.loginWithEmailPassword(email, password);
      this.assert(loginResult && loginResult.success === true, 'Login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true');

      const prefsResult = this.logic.getNotificationPreferences();
      this.assert(prefsResult && prefsResult.preferences,
        'Notification preferences should be returned');
      const currentPrefs = prefsResult.preferences;

      const newPrefs = {
        emailPromotionsEnabled: false,
        emailOrderUpdatesEnabled: currentPrefs.emailOrderUpdatesEnabled,
        pushPromotionsEnabled: false,
        pushOrderUpdatesEnabled: false,
        smsOrderUpdatesEnabled: true,
        smsPromotionsEnabled: false
      };

      const updateResult = this.logic.updateNotificationPreferences(newPrefs);
      this.assert(updateResult && updateResult.success === true,
        'Updating notification preferences should succeed');
      this.assert(updateResult.preferences,
        'Updated preferences should be returned');

      const updated = updateResult.preferences;
      this.assert(updated.emailPromotionsEnabled === false,
        'Email promotions should be disabled');
      this.assert(updated.pushPromotionsEnabled === false,
        'Push promotions should be disabled');
      this.assert(updated.pushOrderUpdatesEnabled === false,
        'Push order updates should be disabled');
      this.assert(updated.smsOrderUpdatesEnabled === true,
        'SMS order updates should be enabled');
      this.assert(updated.smsPromotionsEnabled === false,
        'SMS promotions should be disabled');

      // Confirm persisted by re-fetching
      const prefsResultAfter = this.logic.getNotificationPreferences();
      this.assert(prefsResultAfter && prefsResultAfter.preferences,
        'Notification preferences after update should be returned');
      const persisted = prefsResultAfter.preferences;
      this.assert(persisted.smsOrderUpdatesEnabled === true,
        'Persisted preferences should have SMS order updates enabled');
      this.assert(persisted.emailPromotionsEnabled === false,
        'Persisted preferences should have email promotions disabled');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Log in and change account password using current password, then re-login
  testTask8_ChangePasswordAndReLogin() {
    const testName = 'Task 8: Change account password using current password and re-login';
    console.log('Testing:', testName);

    try {
      const email = 'demo.user1@example.com';
      const oldPassword = 'CoffeeDemo!123';
      const newPassword = 'NewEspresso!222';

      const loginResult = this.logic.loginWithEmailPassword(email, oldPassword);
      this.assert(loginResult && loginResult.success === true, 'Initial login should succeed');
      this.assert(loginResult.isLoggedIn === true, 'isLoggedIn should be true after initial login');

      const securitySummary = this.logic.getSecuritySettingsSummary();
      this.assert(securitySummary && typeof securitySummary.email === 'string',
        'Security settings summary should include email');
      const originalChangedAt = securitySummary.passwordLastChangedAt || null;

      const updateResult = this.logic.updatePassword(oldPassword, newPassword, newPassword);
      this.assert(updateResult && updateResult.success === true, 'Password update should succeed');
      this.assert(typeof updateResult.passwordLastChangedAt === 'string',
        'Password update should return passwordLastChangedAt');

      const newChangedAt = updateResult.passwordLastChangedAt;
      if (originalChangedAt) {
        this.assert(newChangedAt !== originalChangedAt,
          'passwordLastChangedAt should change after password update');
      }

      const logoutResult = this.logic.logoutCurrentAccount();
      this.assert(logoutResult && logoutResult.success === true,
        'Logout after password change should succeed');

      const reloginResult = this.logic.loginWithEmailPassword(email, newPassword);
      this.assert(reloginResult && reloginResult.success === true,
        'Login with new password should succeed');
      this.assert(reloginResult.isLoggedIn === true,
        'isLoggedIn should be true after logging in with new password');

      const accounts = JSON.parse(localStorage.getItem('account_profiles') || '[]');
      const account = accounts.find(function (a) { return a.email === email; });
      this.assert(account, 'Account profile should exist in storage');
      this.assert(account.password === newPassword,
        'Stored account password should be updated to new password');
      if (account.passwordLastChangedAt) {
        this.assert(account.passwordLastChangedAt === newChangedAt,
          'Stored passwordLastChangedAt should match value from updatePassword');
      }

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
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
