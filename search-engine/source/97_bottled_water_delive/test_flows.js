// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data EXACTLY as provided, used ONLY here
    const generatedData = {
      "addresses": [
        {
          "id": "addr_home_main",
          "label": "Home",
          "street": "789 Pine Avenue",
          "city": "Springfield",
          "state": "CA",
          "zip_code": "90210",
          "is_default": true,
          "created_at": "2025-01-10T10:15:00Z",
          "updated_at": "2025-11-20T09:30:00Z"
        },
        {
          "id": "addr_office_downtown",
          "label": "Office",
          "street": "250 Market Street, Suite 300",
          "city": "Springfield",
          "state": "CA",
          "zip_code": "90211",
          "is_default": false,
          "created_at": "2025-03-05T14:45:00Z",
          "updated_at": "2025-09-01T16:10:00Z"
        },
        {
          "id": "addr_gym_dropoff",
          "label": "Gym Drop-off",
          "street": "55 Lakeview Blvd",
          "city": "Springfield",
          "state": "CA",
          "zip_code": "90212",
          "is_default": false,
          "created_at": "2025-06-18T08:00:00Z",
          "updated_at": "2025-06-18T08:00:00Z"
        }
      ],
      "help_articles": [
        {
          "id": "help_minimum_order_amount",
          "title": "What is the minimum order amount?",
          "slug": "minimum-order-amount",
          "body": "## Minimum Order Amount\r\n\r\nTo keep delivery efficient and eco-friendly, we require a **minimum order amount of $30.00 (USD)** for all one-time orders, subscriptions, and rental orders.\r\n\r\n### How it works\r\n- The minimum is calculated **before tax** and **after discounts**.\r\n- If your cart subtotal is **below $30**, you'll see a message asking you to add more items.\r\n- Promotions and promo codes still apply, but the **discounted total must remain at or above $30**.\r\n\r\n### Examples\r\n- 3 cases of still water at $10 each → subtotal **$30** → ✅ meets the minimum.\r\n- 2 cases of sparkling water at $11 each → subtotal **$22** → ❌ does not meet the minimum.\r\n\r\nIf you have any questions about order minimums, please contact our support team via the Help Center.",
          "category": "orders",
          "is_featured": true,
          "created_at": "2024-10-01T09:00:00Z",
          "updated_at": "2025-12-15T11:30:00Z"
        },
        {
          "id": "help_manage_subscriptions",
          "title": "How do subscriptions work?",
          "slug": "how-subscriptions-work",
          "body": "## How Subscriptions Work\r\n\r\nOur subscription service lets you schedule regular deliveries of your favorite water products.\r\n\r\n### Key features\r\n- Flexible frequencies: **every week**, **every 2 weeks**, or **every 4 weeks** (where available)\r\n- Adjustable **quantity** and **delivery day**\r\n- Skip, pause, or cancel anytime from **My Account → My Subscriptions**\r\n\r\n### Managing your subscription\r\n1. Go to **My Account → My Subscriptions**.\r\n2. Click **Manage** on any active subscription.\r\n3. Update the **frequency**, **quantity**, or **delivery day**.\r\n4. Click **Save Changes** to apply your updates.",
          "category": "subscriptions",
          "is_featured": true,
          "created_at": "2024-11-05T12:00:00Z",
          "updated_at": "2025-08-22T10:15:00Z"
        },
        {
          "id": "help_reschedule_delivery",
          "title": "How to reschedule a delivery",
          "slug": "reschedule-delivery",
          "body": "## How to Reschedule a Delivery\r\n\r\nYou can reschedule upcoming deliveries directly from your account.\r\n\r\n1. Go to **My Account → Upcoming Deliveries**.\r\n2. Find the delivery you want to change and click **Reschedule**.\r\n3. Choose a new **delivery date** (within the allowed scheduling window).\r\n4. Select a **time window** (e.g., *3:00 PM - 6:00 PM*).\r\n5. Optionally select a different **delivery address** from your saved addresses.\r\n6. Click **Confirm Delivery Schedule**.\r\n\r\nYou’ll receive an updated confirmation email once your delivery has been rescheduled.",
          "category": "delivery",
          "is_featured": false,
          "created_at": "2024-09-18T16:20:00Z",
          "updated_at": "2025-07-02T09:40:00Z"
        }
      ],
      "products": [
        {
          "id": "prod_crystal_spring_5g",
          "name": "Crystal Springs 5 Gallon Spring Water Jug",
          "description": "Fresh-tasting spring water in a reusable 5 gallon jug, ideal for home and office dispensers.",
          "category_id": "water",
          "water_type": "spring",
          "size_filter_key": "5_gallon",
          "size_label": "5 Gallon",
          "volume_liters": 18.9,
          "is_case": false,
          "case_bottle_count": 0,
          "case_bottle_volume_liters": 0,
          "packaging_category": "refillable_jugs",
          "price": 11.49,
          "currency": "USD",
          "status": "active",
          "rating": 4.7,
          "rating_count": 248,
          "is_eco_friendly": false,
          "is_bpa_free": true,
          "tags": [
            "spring water",
            "5 gallon",
            "dispenser compatible"
          ],
          "badges": [
            "bestseller"
          ],
          "is_subscription_available": true,
          "is_one_time_purchase_available": true,
          "is_rental_product": false,
          "rental_price_per_month": 0,
          "allowed_rental_durations": [],
          "allowed_subscription_frequencies": [
            "every_week",
            "every_2_weeks",
            "every_4_weeks"
          ],
          "image_url": "https://cdn.shopify.com/s/files/1/1745/8107/products/IMG_E1496_800x.JPG?v=1571480343",
          "created_at": "2024-05-10T09:00:00Z",
          "updated_at": "2025-12-01T10:20:00Z"
        },
        {
          "id": "prod_blue_mountain_5g",
          "name": "Blue Mountain 5 Gallon Spring Water Jug",
          "description": "Premium mountain spring water in a sturdy 5 gallon jug for regular dispenser use.",
          "category_id": "water",
          "water_type": "spring",
          "size_filter_key": "5_gallon",
          "size_label": "5 Gallon",
          "volume_liters": 18.9,
          "is_case": false,
          "case_bottle_count": 0,
          "case_bottle_volume_liters": 0,
          "packaging_category": "refillable_jugs",
          "price": 12.49,
          "currency": "USD",
          "status": "active",
          "rating": 4.6,
          "rating_count": 132,
          "is_eco_friendly": false,
          "is_bpa_free": true,
          "tags": [
            "spring water",
            "office favorite"
          ],
          "badges": [
            "popular_choice"
          ],
          "is_subscription_available": true,
          "is_one_time_purchase_available": true,
          "is_rental_product": false,
          "rental_price_per_month": 0,
          "allowed_rental_durations": [],
          "allowed_subscription_frequencies": [
            "every_week",
            "every_2_weeks",
            "every_4_weeks"
          ],
          "image_url": "https://i.pinimg.com/originals/6b/c9/b7/6bc9b7bd27e0f6b144fbe191bd99499b.jpg",
          "created_at": "2024-06-15T11:30:00Z",
          "updated_at": "2025-11-10T14:05:00Z"
        },
        {
          "id": "prod_everpure_5g",
          "name": "Everpure 5 Gallon Spring Water Jug",
          "description": "Crisp, clean spring water. Perfect for families and shared office kitchens.",
          "category_id": "water",
          "water_type": "spring",
          "size_filter_key": "5_gallon",
          "size_label": "5 Gallon",
          "volume_liters": 18.9,
          "is_case": false,
          "case_bottle_count": 0,
          "case_bottle_volume_liters": 0,
          "packaging_category": "refillable_jugs",
          "price": 14.99,
          "currency": "USD",
          "status": "active",
          "rating": 4.8,
          "rating_count": 301,
          "is_eco_friendly": false,
          "is_bpa_free": true,
          "tags": [
            "spring water",
            "family size"
          ],
          "badges": [
            "top_rated"
          ],
          "is_subscription_available": true,
          "is_one_time_purchase_available": true,
          "is_rental_product": false,
          "rental_price_per_month": 0,
          "allowed_rental_durations": [],
          "allowed_subscription_frequencies": [
            "every_week",
            "every_2_weeks",
            "every_4_weeks"
          ],
          "image_url": "https://i.pinimg.com/originals/03/65/a2/0365a2e54d0e19cafc4c99ebbbf27596.jpg",
          "created_at": "2024-04-20T08:45:00Z",
          "updated_at": "2025-10-22T13:00:00Z"
        }
      ],
      "promos": [
        {
          "id": "promo_water20",
          "name": "20% Off Still & Sparkling One-Time Orders",
          "code": "WATER20",
          "short_label": "20% off one-time water",
          "description": "Get 20% off eligible still and sparkling water products on one-time orders. Excludes rentals and subscriptions.",
          "discount_type": "percentage",
          "discount_value": 20,
          "applicable_order_type": "one_time_orders",
          "status": "active",
          "start_date": "2025-11-01T00:00:00Z",
          "end_date": "2026-12-31T23:59:59Z",
          "minimum_order_amount": 20,
          "max_discount_amount": 50,
          "is_stackable": false,
          "created_at": "2025-10-15T09:00:00Z",
          "updated_at": "2025-12-20T12:00:00Z"
        },
        {
          "id": "promo_water10",
          "name": "10% Off Any One-Time Water Order",
          "code": "WATER10",
          "short_label": "10% off one-time",
          "description": "Save 10% on any qualifying one-time water order. Subscriptions and rentals are excluded.",
          "discount_type": "percentage",
          "discount_value": 10,
          "applicable_order_type": "one_time_orders",
          "status": "active",
          "start_date": "2025-05-01T00:00:00Z",
          "end_date": "2026-06-30T23:59:59Z",
          "minimum_order_amount": 0,
          "max_discount_amount": 30,
          "is_stackable": false,
          "created_at": "2025-04-20T08:30:00Z",
          "updated_at": "2025-11-10T11:10:00Z"
        },
        {
          "id": "promo_sub15",
          "name": "15% Off First 3 Subscription Deliveries",
          "code": "SUBSAVE15",
          "short_label": "15% off subscriptions",
          "description": "Enjoy 15% off your first three subscription deliveries on eligible water products.",
          "discount_type": "percentage",
          "discount_value": 15,
          "applicable_order_type": "subscriptions",
          "status": "active",
          "start_date": "2025-09-01T00:00:00Z",
          "end_date": "2026-09-01T23:59:59Z",
          "minimum_order_amount": 30,
          "max_discount_amount": 40,
          "is_stackable": false,
          "created_at": "2025-08-15T10:00:00Z",
          "updated_at": "2025-10-05T09:20:00Z"
        }
      ],
      "site_settings": [
        {
          "id": "default",
          "minimum_order_amount": 30,
          "currency": "USD",
          "standard_delivery_time_windows": [
            "09_00_12_00",
            "12_00_15_00",
            "15_00_18_00",
            "18_00_21_00"
          ],
          "max_delivery_schedule_days_ahead": 30,
          "created_at": "2024-01-01T00:00:00Z",
          "updated_at": "2025-12-01T12:00:00Z"
        }
      ],
      "subscriptions": [
        {
          "id": "sub_crystal5g_home_weekly",
          "product_id": "prod_crystal_spring_5g",
          "quantity": 2,
          "subscription_frequency": "every_week",
          "delivery_day_of_week": "monday",
          "address_id": "addr_home_main",
          "next_delivery_date": "2026-03-09T10:00:00Z",
          "status": "active",
          "created_at": "2025-10-15T09:30:00Z",
          "updated_at": "2026-02-25T11:00:00Z"
        },
        {
          "id": "sub_sparklefizz500_office_biweekly",
          "product_id": "prod_sparklefizz_500ml_case",
          "quantity": 1,
          "subscription_frequency": "every_2_weeks",
          "delivery_day_of_week": "friday",
          "address_id": "addr_office_downtown",
          "next_delivery_date": "2026-03-13T15:00:00Z",
          "status": "active",
          "created_at": "2025-08-01T14:10:00Z",
          "updated_at": "2026-02-18T10:20:00Z"
        },
        {
          "id": "sub_ecoflow5g_home_biweekly_paused",
          "product_id": "prod_ecoflow_5g_still",
          "quantity": 4,
          "subscription_frequency": "every_2_weeks",
          "delivery_day_of_week": "wednesday",
          "address_id": "addr_home_main",
          "next_delivery_date": "2026-03-18T09:30:00Z",
          "status": "paused",
          "created_at": "2025-07-20T08:45:00Z",
          "updated_at": "2026-01-10T12:05:00Z"
        }
      ],
      "cart_items": [
        {
          "id": "ci_task1_sub_crystal5g",
          "cart_id": "cart_task1_weekly_spring",
          "product_id": "prod_crystal_spring_5g",
          "item_type": "subscription",
          "quantity": 2,
          "unit_price": 11.49,
          "line_subtotal": 22.98,
          "subscription_frequency": "every_week",
          "subscription_delivery_day_of_week": "monday",
          "created_at": "2026-03-03T09:15:00Z",
          "updated_at": "2026-03-03T09:15:00Z"
        },
        {
          "id": "ci_task2_sparklefizz_500_case",
          "cart_id": "cart_task2_sparkling_mix",
          "product_id": "prod_sparklefizz_500ml_case",
          "item_type": "one_time",
          "quantity": 1,
          "unit_price": 9.49,
          "line_subtotal": 9.49,
          "created_at": "2026-03-03T09:20:00Z",
          "updated_at": "2026-03-03T09:20:00Z"
        },
        {
          "id": "ci_task3_purestill_3_cases",
          "cart_id": "cart_task3_three_cases",
          "product_id": "prod_purestill_1l_case",
          "item_type": "one_time",
          "quantity": 3,
          "unit_price": 9.99,
          "line_subtotal": 29.97,
          "created_at": "2026-03-03T09:25:00Z",
          "updated_at": "2026-03-03T09:30:00Z"
        }
      ],
      "carts": [
        {
          "id": "cart_task1_weekly_spring",
          "status": "open",
          "applied_promo_id": null,
          "created_at": "2026-03-03T09:15:00Z",
          "updated_at": "2026-03-03T09:15:00Z",
          "items": [
            {
              "cart_item_id": "ci_task1_sub_crystal5g",
              "product_id": "prod_crystal_spring_5g",
              "item_type": "subscription",
              "quantity": 2,
              "unit_price": 11.49,
              "line_subtotal": 22.98
            }
          ],
          "subtotal": 22.98,
          "discount_total": 0.0,
          "total": 22.98
        },
        {
          "id": "cart_task2_sparkling_mix",
          "status": "open",
          "applied_promo_id": null,
          "created_at": "2026-03-03T09:20:00Z",
          "updated_at": "2026-03-03T09:20:00Z",
          "items": [
            {
              "cart_item_id": "ci_task2_sparklefizz_500_case",
              "product_id": "prod_sparklefizz_500ml_case",
              "item_type": "one_time",
              "quantity": 1,
              "unit_price": 9.49,
              "line_subtotal": 9.49
            }
          ],
          "subtotal": 9.49,
          "discount_total": 0.0,
          "total": 9.49
        },
        {
          "id": "cart_task3_three_cases",
          "status": "open",
          "applied_promo_id": "promo_water20",
          "created_at": "2026-03-03T09:25:00Z",
          "updated_at": "2026-03-03T09:30:00Z",
          "items": [
            {
              "cart_item_id": "ci_task3_purestill_3_cases",
              "product_id": "prod_purestill_1l_case",
              "item_type": "one_time",
              "quantity": 3,
              "unit_price": 9.99,
              "line_subtotal": 29.97
            }
          ],
          "subtotal": 29.97,
          "applied_promo_code": "WATER20",
          "discount_total": 5.994,
          "total": 23.976
        }
      ],
      "order_items": [
        {
          "id": "oi_task8_rental",
          "order_id": "order_task8_rental_plus_water",
          "product_id": "prod_coolbreeze_topload_rental",
          "item_type": "rental",
          "quantity": 1,
          "unit_price": 14.99,
          "line_subtotal": 14.99,
          "subscription_id": null,
          "rental_duration": "1_month",
          "created_at": "2026-03-03T10:00:00Z",
          "updated_at": "2026-03-03T10:00:00Z"
        },
        {
          "id": "oi_task8_water4",
          "order_id": "order_task8_rental_plus_water",
          "product_id": "prod_ecoflow_5g_still",
          "item_type": "one_time",
          "quantity": 4,
          "unit_price": 12.99,
          "line_subtotal": 51.96,
          "subscription_id": null,
          "rental_duration": null,
          "created_at": "2026-03-03T10:00:30Z",
          "updated_at": "2026-03-03T10:00:30Z"
        },
        {
          "id": "oi_task3_purestill3",
          "order_id": "order_task3_three_cases",
          "product_id": "prod_purestill_1l_case",
          "item_type": "one_time",
          "quantity": 3,
          "unit_price": 9.99,
          "line_subtotal": 29.97,
          "subscription_id": null,
          "rental_duration": null,
          "created_at": "2026-03-03T10:05:00Z",
          "updated_at": "2026-03-03T10:06:00Z"
        }
      ],
      "deliveries": [
        {
          "id": "del_order_task8_2026_03_04",
          "scheduled_date": "2026-03-04T09:00:00Z",
          "time_window": "09_00_12_00",
          "address_id": "addr_home_main",
          "source_type": "order",
          "source_id": "order_task8_rental_plus_water",
          "delivery_method": "standard",
          "status": "scheduled",
          "created_at": "2026-03-03T09:50:00Z",
          "updated_at": "2026-03-03T09:50:00Z",
          "items_summary": [
            {
              "order_item_id": "oi_task8_rental",
              "product_id": "prod_coolbreeze_topload_rental",
              "item_type": "rental",
              "quantity": 1
            },
            {
              "order_item_id": "oi_task8_water4",
              "product_id": "prod_ecoflow_5g_still",
              "item_type": "one_time",
              "quantity": 4
            }
          ]
        },
        {
          "id": "del_order_task3_2026_03_06",
          "scheduled_date": "2026-03-06T12:00:00Z",
          "time_window": "12_00_15_00",
          "address_id": "addr_home_main",
          "source_type": "order",
          "source_id": "order_task3_three_cases",
          "delivery_method": "standard",
          "status": "scheduled",
          "created_at": "2026-03-03T10:06:30Z",
          "updated_at": "2026-03-03T10:06:30Z",
          "items_summary": [
            {
              "order_item_id": "oi_task3_purestill3",
              "product_id": "prod_purestill_1l_case",
              "item_type": "one_time",
              "quantity": 3
            }
          ]
        },
        {
          "id": "del_order_task2_2026_02_20",
          "scheduled_date": "2026-02-20T15:00:00Z",
          "time_window": "15_00_18_00",
          "address_id": "addr_office_downtown",
          "source_type": "order",
          "source_id": "order_task2_sparkling_mix",
          "delivery_method": "express",
          "status": "delivered",
          "created_at": "2026-02-18T11:20:00Z",
          "updated_at": "2026-02-20T17:30:00Z",
          "items_summary": [
            {
              "order_item_id": "oi_task2_sparkle500",
              "product_id": "prod_sparklefizz_500ml_case",
              "item_type": "one_time",
              "quantity": 1
            },
            {
              "order_item_id": "oi_task2_sparkle1l",
              "product_id": "prod_sparklefizz_1l_case",
              "item_type": "one_time",
              "quantity": 1
            },
            {
              "order_item_id": "oi_task2_sparkle5l",
              "product_id": "prod_sparklefizz_5l_case",
              "item_type": "one_time",
              "quantity": 1
            }
          ]
        }
      ],
      "orders": [
        {
          "id": "order_task8_rental_plus_water",
          "order_number": "ORD-20260303-0001",
          "cart_id": "cart_task8_rental_plus_water",
          "placed_at": "2026-03-03T10:00:00Z",
          "status": "confirmed",
          "promo_id": null,
          "delivery_id": "del_order_task8_2026_03_04",
          "created_at": "2026-03-03T10:00:00Z",
          "updated_at": "2026-03-03T10:02:00Z",
          "subtotal": 66.95,
          "total_items": 5,
          "discount_total": 0.0,
          "total": 66.95,
          "contains_subscriptions": false,
          "contains_rentals": true,
          "delivery_date": "2026-03-04T09:00:00Z",
          "delivery_time_window": "09_00_12_00"
        },
        {
          "id": "order_task3_three_cases",
          "order_number": "ORD-20260303-0002",
          "cart_id": "cart_task3_three_cases",
          "placed_at": "2026-03-03T10:05:00Z",
          "status": "confirmed",
          "promo_id": "promo_water20",
          "delivery_id": "del_order_task3_2026_03_06",
          "created_at": "2026-03-03T10:05:00Z",
          "updated_at": "2026-03-03T10:06:30Z",
          "subtotal": 29.97,
          "total_items": 3,
          "promo_code": "WATER20",
          "discount_total": 5.994,
          "total": 23.976,
          "contains_subscriptions": false,
          "contains_rentals": false,
          "delivery_date": "2026-03-06T12:00:00Z",
          "delivery_time_window": "12_00_15_00"
        },
        {
          "id": "order_task2_sparkling_mix",
          "order_number": "ORD-20260218-0003",
          "cart_id": "cart_task2_sparkling_mix",
          "placed_at": "2026-02-18T11:20:00Z",
          "status": "fulfilled",
          "promo_id": null,
          "delivery_id": "del_order_task2_2026_02_20",
          "created_at": "2026-02-18T11:20:00Z",
          "updated_at": "2026-02-20T17:30:00Z",
          "subtotal": 31.47,
          "total_items": 3,
          "discount_total": 0.0,
          "total": 31.47,
          "contains_subscriptions": false,
          "contains_rentals": false,
          "delivery_date": "2026-02-20T15:00:00Z",
          "delivery_time_window": "15_00_18_00"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:17:20.637620"
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('addresses', JSON.stringify(generatedData.addresses));
    localStorage.setItem('help_articles', JSON.stringify(generatedData.help_articles));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('promos', JSON.stringify(generatedData.promos));
    localStorage.setItem('site_settings', JSON.stringify(generatedData.site_settings));
    localStorage.setItem('subscriptions', JSON.stringify(generatedData.subscriptions));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items));
    localStorage.setItem('carts', JSON.stringify(generatedData.carts));
    localStorage.setItem('order_items', JSON.stringify(generatedData.order_items));
    localStorage.setItem('deliveries', JSON.stringify(generatedData.deliveries));
    localStorage.setItem('orders', JSON.stringify(generatedData.orders));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Helper: simple ISO date (YYYY-MM-DD) from Date
  toIsoDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CreateWeeklySubscriptionCheapest5GallonSpring();
    this.testTask2_OrderThreeDifferentWaterProductsOneTime();
    this.testTask3_ApplyBestOneTimePromoToThreeCases();
    this.testTask4_ChangeExistingSubscriptionFrequency();
    this.testTask5_AddAddressAndRescheduleDelivery();
    this.testTask6_AddTwoHighRatingProductsWithinPriceRange();
    this.testTask7_HelpCenterMinimumOrderAndAdjustCart();
    this.testTask8_RentDispenserAndAddFourBottlesWithin7Days();

    return this.results;
  }

  // Task 1: Create weekly subscription for cheapest 5-gallon spring water under $15
  testTask1_CreateWeeklySubscriptionCheapest5GallonSpring() {
    const testName = 'Task 1: Weekly subscription for cheapest 5-gallon spring water under max price';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const categoryId = 'water';
      const maxPrice = 15;

      // Simulate filters: Size 5 Gallon, Type Spring, price <= maxPrice, subscription available
      const filterOptions = this.logic.getProductFilterOptions(categoryId);
      this.assert(filterOptions && Array.isArray(filterOptions.size_options), 'Size filter options should be available');

      const listResult = this.logic.listProducts(
        categoryId,
        1,
        50,
        'price',
        'asc',
        {
          waterTypes: ['spring'],
          sizeFilterKeys: ['5_gallon'],
          priceMax: maxPrice,
          isSubscriptionAvailable: true
        }
      );

      const products = listResult.products || [];
      this.assert(products.length > 0, 'There should be at least one 5-gallon spring product under max price');

      const cheapest = products[0];
      // Confirm it matches filters and is the cheapest in the returned list
      this.assert(cheapest.water_type === 'spring', 'Selected product should be spring water');
      this.assert(cheapest.size_filter_key === '5_gallon', 'Selected product should be 5 Gallon size');
      this.assert(cheapest.price <= maxPrice, 'Selected product price should be <= ' + maxPrice);

      const expectedCheapest = products.reduce(function (min, p) {
        return p.price < min.price ? p : min;
      }, products[0]);
      this.assert(cheapest.id === expectedCheapest.id, 'First product should be the cheapest by price');

      // Get product details and ensure subscription is available weekly
      const detailsResult = this.logic.getProductDetails(cheapest.id);
      const productDetails = detailsResult.product;
      const purchaseOptions = detailsResult.purchase_options;

      this.assert(purchaseOptions && purchaseOptions.can_subscription === true, 'Product should support subscriptions');
      const allowedFreqs = productDetails.allowed_subscription_frequencies || [];
      this.assert(allowedFreqs.indexOf('every_week') !== -1, 'Product should allow every_week frequency');

      // Configure subscription: every week, Monday, quantity 2
      const quantity = 2;
      const addResult = this.logic.addItemToCart(
        cheapest.id,
        'subscription',
        quantity,
        'every_week',
        'monday',
        undefined
      );

      this.assert(addResult && addResult.success === true, 'Adding subscription to cart should succeed');
      this.assert(addResult.cart && addResult.cart.id, 'Cart should be returned with an id');

      const cart = addResult.cart;
      const subItem = (cart.items || []).find(function (i) {
        return i.product_id === cheapest.id && i.item_type === 'subscription';
      });
      this.assert(!!subItem, 'Cart should contain subscription line for selected product');
      this.assert(subItem.quantity === quantity, 'Subscription quantity should be ' + quantity + ', got ' + subItem.quantity);
      this.assert(subItem.subscription_frequency === 'every_week', 'Subscription frequency should be every_week');
      this.assert(subItem.subscription_delivery_day_of_week === 'monday', 'Subscription delivery day should be monday');

      // Cross-check via cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.id === cart.id, 'Cart summary should reference same cart id');
      const summaryItem = (cartSummary.items || []).find(function (i) {
        return i.product_id === cheapest.id && i.item_type === 'subscription';
      });
      this.assert(!!summaryItem, 'Cart summary should contain the subscription item');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 2: Order 3 different water products (adapted) in a single one-time order
  testTask2_OrderThreeDifferentWaterProductsOneTime() {
    const testName = 'Task 2: One-time order with three different water products';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const categoryId = 'water';

      // Adaptation: use available spring 5-gallon products, sorted by price, as proxies for different sparkling case sizes
      const listResult = this.logic.listProducts(
        categoryId,
        1,
        50,
        'price',
        'asc',
        {
          waterTypes: ['spring']
        }
      );
      const products = listResult.products || [];
      this.assert(products.length >= 3, 'Need at least three water products for this flow');

      const selected = products.slice(0, 3);
      const selectedIds = selected.map(function (p) { return p.id; });

      let latestCart = null;
      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        const details = this.logic.getProductDetails(p.id);
        this.assert(details.purchase_options && details.purchase_options.can_one_time === true,
          'Product should be available for one-time purchase');

        const addResult = this.logic.addItemToCart(
          p.id,
          'one_time',
          1,
          undefined,
          undefined,
          undefined
        );
        this.assert(addResult && addResult.success === true, 'Adding product ' + p.id + ' as one-time should succeed');
        latestCart = addResult.cart;
      }

      this.assert(latestCart && latestCart.items, 'Cart should be returned with items');

      const cartItems = latestCart.items;
      // Verify that each selected product appears once as a one-time item
      for (let j = 0; j < selectedIds.length; j++) {
        const pid = selectedIds[j];
        const line = cartItems.find(function (ci) { return ci.product_id === pid; });
        this.assert(!!line, 'Cart should contain an item for product ' + pid);
        this.assert(line.item_type === 'one_time', 'Cart item for ' + pid + ' should be one_time');
        this.assert(line.quantity === 1, 'Cart item for ' + pid + ' should have quantity 1');
      }

      // Ensure all product ids in cart for our selection are distinct
      const distinctIds = [];
      cartItems.forEach(function (ci) {
        if (selectedIds.indexOf(ci.product_id) !== -1 && distinctIds.indexOf(ci.product_id) === -1) {
          distinctIds.push(ci.product_id);
        }
      });
      this.assert(distinctIds.length === selectedIds.length, 'Selected products in cart should be distinct');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 3: Apply the best one-time order promo code to a purchase of 3 cases (adapted)
  testTask3_ApplyBestOneTimePromoToThreeCases() {
    const testName = 'Task 3: Apply best one-time promo to 3-case purchase';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Find the highest percentage promo for one-time orders
      const promos = this.logic.listActivePromos('one_time_orders', false, 'discount_value_desc');
      this.assert(Array.isArray(promos) && promos.length > 0, 'There should be active promos for one-time orders');

      let bestPromo = null;
      for (let i = 0; i < promos.length; i++) {
        const p = promos[i];
        if (p.applicable_order_type === 'one_time_orders' && p.status === 'active' && p.discount_type === 'percentage') {
          if (!bestPromo || p.discount_value > bestPromo.discount_value) {
            bestPromo = p;
          }
        }
      }
      this.assert(bestPromo !== null, 'A best percentage promo for one-time orders should be found');

      // Open promo details (simulating clicking the promo card)
      const promoDetails = this.logic.getPromoDetails(bestPromo.id);
      this.assert(promoDetails && promoDetails.promo && promoDetails.promo.code === bestPromo.code,
        'Promo details should match selected promo code');
      const promoCode = bestPromo.code;

      // Search for a suitable product (adapted: use spring water instead of still 1L case if needed)
      const searchResult = this.logic.searchProducts('spring', 1, 20, 'relevance', 'desc', undefined);
      const searchProductsList = searchResult.products || [];
      this.assert(searchProductsList.length > 0, 'Search should return at least one product');

      const product = searchProductsList[0];
      const details = this.logic.getProductDetails(product.id);
      this.assert(details.purchase_options && details.purchase_options.can_one_time === true,
        'Chosen product should be available for one-time purchase');

      // Add quantity 3 to cart
      const quantity = 3;
      const addResult = this.logic.addItemToCart(
        product.id,
        'one_time',
        quantity,
        undefined,
        undefined,
        undefined
      );
      this.assert(addResult && addResult.success === true, 'Adding three units to cart should succeed');
      const prePromoCart = addResult.cart;
      const preTotal = prePromoCart.total;

      // Apply the best promo code
      const applyResult = this.logic.applyPromoCodeToCart(promoCode);
      this.assert(applyResult && applyResult.success === true, 'Applying promo code should succeed');
      this.assert(applyResult.applied_promo && applyResult.applied_promo.code === promoCode,
        'Applied promo code should match selected code');

      const updatedCart = applyResult.cart;
      this.assert(typeof updatedCart.subtotal === 'number', 'Updated cart should have subtotal');
      this.assert(typeof updatedCart.discount_total === 'number', 'Updated cart should have discount_total');
      this.assert(typeof updatedCart.total === 'number', 'Updated cart should have total');
      this.assert(updatedCart.total < preTotal, 'Cart total after promo should be less than before');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 4: Change an existing subscription from weekly to every 2 weeks while keeping quantity at 3
  testTask4_ChangeExistingSubscriptionFrequency() {
    const testName = 'Task 4: Update existing subscription frequency and quantity';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Get active subscriptions
      const subsList = this.logic.getMySubscriptions('active');
      this.assert(Array.isArray(subsList) && subsList.length > 0, 'There should be at least one active subscription');

      const firstSub = subsList[0];
      const subscriptionId = firstSub.subscription_id;

      // Get full subscription details
      const subDetailsResult = this.logic.getSubscriptionDetails(subscriptionId);
      const subDetails = subDetailsResult.subscription;
      this.assert(subDetails && subDetails.subscription_id === subscriptionId, 'Subscription details should be returned');

      const currentFreq = subDetails.subscription_frequency;
      const availableFreqs = subDetailsResult.available_frequencies || [];
      this.assert(availableFreqs.length > 0, 'Available subscription frequencies should be provided');

      // Choose a new frequency different from current (prefer every_2_weeks if available)
      let newFreq = null;
      for (let i = 0; i < availableFreqs.length; i++) {
        if (availableFreqs[i].value === 'every_2_weeks') {
          newFreq = availableFreqs[i].value;
          break;
        }
      }
      if (!newFreq) {
        for (let j = 0; j < availableFreqs.length; j++) {
          if (availableFreqs[j].value !== currentFreq) {
            newFreq = availableFreqs[j].value;
            break;
          }
        }
      }
      this.assert(!!newFreq, 'A new subscription frequency different from current should be available');

      // Choose Wednesday as delivery day if available, else first option
      const availableDays = subDetailsResult.available_delivery_days || [];
      this.assert(availableDays.length > 0, 'Available delivery days should be provided');
      let newDay = null;
      for (let k = 0; k < availableDays.length; k++) {
        if (availableDays[k].value === 'wednesday') {
          newDay = availableDays[k].value;
          break;
        }
      }
      if (!newDay) {
        newDay = availableDays[0].value;
      }

      // Choose an address (prefer one labeled Home if present)
      const availableAddresses = subDetailsResult.available_addresses || [];
      this.assert(availableAddresses.length > 0, 'Available addresses should be provided');
      let addressId = availableAddresses[0].id;
      for (let a = 0; a < availableAddresses.length; a++) {
        if (availableAddresses[a].label && availableAddresses[a].label.toLowerCase() === 'home') {
          addressId = availableAddresses[a].id;
          break;
        }
      }

      const newQuantity = 3;

      const updateResult = this.logic.updateSubscriptionSettings(
        subscriptionId,
        newFreq,
        newQuantity,
        newDay,
        addressId
      );

      this.assert(updateResult && updateResult.success === true, 'Updating subscription should succeed');
      const updated = updateResult.subscription;
      this.assert(updated.subscription_id === subscriptionId, 'Updated subscription id should match');
      this.assert(updated.quantity === newQuantity, 'Updated quantity should be ' + newQuantity);
      this.assert(updated.subscription_frequency === newFreq, 'Updated frequency should match requested one');
      this.assert(updated.delivery_day_of_week === newDay, 'Updated delivery day should match requested one');

      // Re-fetch details to ensure persistence
      const refreshedDetails = this.logic.getSubscriptionDetails(subscriptionId);
      this.assert(refreshedDetails.subscription.subscription_frequency === newFreq,
        'Refreshed subscription should have new frequency');
      this.assert(refreshedDetails.subscription.quantity === newQuantity,
        'Refreshed subscription should have new quantity');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 5: Add a new delivery address and reschedule the next delivery to that address on a specific date/time window
  testTask5_AddAddressAndRescheduleDelivery() {
    const testName = 'Task 5: Add address and reschedule earliest upcoming delivery';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Initial addresses
      const addrBefore = this.logic.getAddresses();
      const beforeCount = (addrBefore.addresses || []).length;

      // Create new address (Home, 123 Oak Street, Springfield, CA, 12345)
      const createResult = this.logic.createAddress(
        'Home',
        '123 Oak Street',
        'Springfield',
        'CA',
        '12345',
        false
      );

      this.assert(createResult && createResult.success === true, 'Creating new address should succeed');
      const newAddress = createResult.address;
      this.assert(newAddress && newAddress.id, 'New address should have an id');
      this.assert(newAddress.street === '123 Oak Street', 'New address street should be 123 Oak Street');

      // Verify address list increased
      const addrAfter = this.logic.getAddresses();
      const afterAddresses = addrAfter.addresses || [];
      this.assert(afterAddresses.length === beforeCount + 1, 'Address count should increase by 1');
      const foundNewAddr = afterAddresses.find(function (a) { return a.id === newAddress.id; });
      this.assert(!!foundNewAddr, 'New address should be present in address list');

      // Get upcoming deliveries and pick earliest scheduled (non-delivered)
      const upcoming = this.logic.getUpcomingDeliveries();
      this.assert(Array.isArray(upcoming) && upcoming.length > 0, 'There should be upcoming deliveries');

      const scheduledDeliveries = upcoming.filter(function (d) { return d.status !== 'delivered'; });
      this.assert(scheduledDeliveries.length > 0, 'There should be at least one non-delivered upcoming delivery');

      scheduledDeliveries.sort(function (a, b) {
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });
      const earliest = scheduledDeliveries[0];

      // Get reschedule options for earliest delivery
      const reschedOptions = this.logic.getDeliveryRescheduleOptions(earliest.delivery_id);
      this.assert(reschedOptions && reschedOptions.delivery, 'Reschedule options should include delivery info');

      const availableAddresses = reschedOptions.available_addresses || [];
      const addrOption = availableAddresses.find(function (a) { return a.id === newAddress.id; });
      this.assert(!!addrOption, 'New address should be available for rescheduling');

      const timeWindows = reschedOptions.standard_delivery_time_windows || [];
      this.assert(timeWindows.length > 0, 'Standard delivery time windows should be provided');
      let chosenWindow = null;
      for (let i = 0; i < timeWindows.length; i++) {
        if (timeWindows[i].value === '15_00_18_00') {
          chosenWindow = timeWindows[i].value;
          break;
        }
      }
      if (!chosenWindow) {
        chosenWindow = timeWindows[0].value;
      }

      // Compute target date: try 15th of next month based on earliest_available_date, but ensure within max_schedule_days_ahead
      const earliestAvailableStr = reschedOptions.earliest_available_date;
      const maxAhead = reschedOptions.max_schedule_days_ahead;
      this.assert(earliestAvailableStr, 'earliest_available_date should be provided');
      const earliestDate = new Date(earliestAvailableStr);

      const nextMonthDate = new Date(earliestDate.getTime());
      let month = nextMonthDate.getMonth();
      let year = nextMonthDate.getFullYear();
      if (month === 11) {
        month = 0;
        year += 1;
      } else {
        month = month + 1;
      }
      nextMonthDate.setFullYear(year);
      nextMonthDate.setMonth(month);
      nextMonthDate.setDate(15);

      const diffMs = nextMonthDate.getTime() - earliestDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      let chosenDate = null;
      if (diffDays <= maxAhead) {
        chosenDate = nextMonthDate;
      } else {
        const alt = new Date(earliestDate.getTime());
        const daysToAdd = Math.min(maxAhead, 7);
        alt.setDate(alt.getDate() + daysToAdd);
        chosenDate = alt;
      }

      const newDateIso = this.toIsoDate(chosenDate);

      // Reschedule the delivery
      const rescheduleResult = this.logic.rescheduleDelivery(
        earliest.delivery_id,
        newAddress.id,
        newDateIso,
        chosenWindow
      );

      this.assert(rescheduleResult && rescheduleResult.success === true, 'Rescheduling delivery should succeed');
      const updatedDelivery = rescheduleResult.delivery;
      this.assert(updatedDelivery.time_window === chosenWindow, 'Updated delivery should use chosen time window');
      this.assert(updatedDelivery.scheduled_date.indexOf(newDateIso) === 0,
        'Updated delivery date should start with ' + newDateIso);
      this.assert(updatedDelivery.address_full && updatedDelivery.address_full.indexOf('123 Oak Street') !== -1,
        'Updated delivery address should reference 123 Oak Street');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 6: Add two eco-friendly water options with high ratings within price range (adapted to available data)
  testTask6_AddTwoHighRatingProductsWithinPriceRange() {
    const testName = 'Task 6: Add two high-rating water products within price range';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      const categoryId = 'water';
      const minPrice = 5;
      const maxPrice = 25;
      const minRating = 4.5;

      // Adaptation: filter by rating >= 4.5 and price 5-25 (eco-friendly/case filters may not be available in data)
      const listResult = this.logic.listProducts(
        categoryId,
        1,
        50,
        'rating',
        'desc',
        {
          priceMin: minPrice,
          priceMax: maxPrice,
          ratingMin: minRating
        }
      );

      const products = listResult.products || [];
      this.assert(products.length >= 2, 'Need at least two products meeting rating and price criteria');

      const chosen = products.slice(0, 2);
      let cart = null;
      for (let i = 0; i < chosen.length; i++) {
        const p = chosen[i];
        this.assert(p.rating >= minRating, 'Product rating should be >= ' + minRating);
        this.assert(p.price >= minPrice && p.price <= maxPrice,
          'Product price should be within [' + minPrice + ',' + maxPrice + ']');

        const details = this.logic.getProductDetails(p.id);
        this.assert(details.purchase_options && details.purchase_options.can_one_time === true,
          'High-rating product should be available for one-time purchase');

        const addResult = this.logic.addItemToCart(
          p.id,
          'one_time',
          1,
          undefined,
          undefined,
          undefined
        );
        this.assert(addResult && addResult.success === true, 'Adding high-rating product to cart should succeed');
        cart = addResult.cart;
      }

      this.assert(cart && cart.items, 'Cart should be returned with items for Task 6');
      const ids = chosen.map(function (p) { return p.id; });
      const lines = cart.items.filter(function (ci) { return ids.indexOf(ci.product_id) !== -1; });
      this.assert(lines.length === ids.length, 'Cart should contain each chosen high-rating product exactly once');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 7: Use Help Center to find minimum order amount and adjust cart to meet minimum
  testTask7_HelpCenterMinimumOrderAndAdjustCart() {
    const testName = 'Task 7: Help Center minimum order and adjust cart subtotal';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Add one product to cart (first water product)
      const listResult = this.logic.listProducts('water', 1, 20, 'price', 'asc', undefined);
      const products = listResult.products || [];
      this.assert(products.length > 0, 'At least one product should be available to add to cart');
      const product = products[0];

      const addResult = this.logic.addItemToCart(
        product.id,
        'one_time',
        1,
        undefined,
        undefined,
        undefined
      );
      this.assert(addResult && addResult.success === true, 'Adding initial product to cart should succeed');

      // Help Center overview (simulated navigation)
      const helpOverview = this.logic.getHelpCenterOverview();
      this.assert(helpOverview && Array.isArray(helpOverview.featured_articles), 'Help center overview should load');

      // Search for "minimum order amount" article
      const helpSearchResults = this.logic.searchHelpArticles('minimum order amount');
      this.assert(Array.isArray(helpSearchResults) && helpSearchResults.length > 0,
        'Help center search for minimum order amount should return results');

      let minArticle = null;
      for (let i = 0; i < helpSearchResults.length; i++) {
        const title = (helpSearchResults[i].title || '').toLowerCase();
        if (title.indexOf('minimum order amount') !== -1) {
          minArticle = helpSearchResults[i];
          break;
        }
      }
      this.assert(!!minArticle, 'Minimum order amount article should be found in search results');

      const articleDetails = this.logic.getHelpArticleDetails(minArticle.slug);
      const article = articleDetails.article;
      this.assert(article && article.body, 'Minimum order article body should be loaded');

      // Cross-check article content against actual site minimum_order_amount from settings
      const siteSettings = this.logic.getSiteSettings();
      const minOrderAmount = siteSettings.minimum_order_amount;
      const bodyLower = article.body.toLowerCase();
      this.assert(bodyLower.indexOf('minimum order amount') !== -1,
        'Article body should mention "minimum order amount"');
      this.assert(article.body.indexOf(minOrderAmount.toString()) !== -1,
        'Article body should reference the configured minimum order amount');

      // Return to cart and adjust quantity so subtotal meets or exceeds minimum
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.items && cartSummary.items.length > 0,
        'Cart summary should include at least one item');

      const cartItem = cartSummary.items[0];
      const unitPrice = cartItem.unit_price;
      const requiredQty = Math.ceil(minOrderAmount / unitPrice);

      const updateResult = this.logic.updateCartItemQuantity(cartItem.cart_item_id, requiredQty);
      this.assert(updateResult && updateResult.success === true, 'Updating cart item quantity should succeed');

      const updatedCart = updateResult.cart;
      this.assert(updatedCart.subtotal >= minOrderAmount,
        'Updated cart subtotal ' + updatedCart.subtotal + ' should be >= minimum order amount ' + minOrderAmount);

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Task 8: Rent an affordable water dispenser and add 4 matching 5-gallon bottles for delivery within 7 days
  testTask8_RentDispenserAndAddFourBottlesWithin7Days() {
    const testName = 'Task 8: Rent dispenser and add four 5-gallon bottles, schedule within 7 days';
    console.log('Running ' + testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Goal: find a rental dispenser product costing <= $20/month
      let rentalProduct = null;

      // First, try listing dispensers with rental filter (if such products are exposed)
      try {
        const dispList = this.logic.listProducts(
          'dispensers',
          1,
          50,
          'price',
          'asc',
          {
            isRental: true,
            priceMax: 20
          }
        );
        const dispProducts = (dispList && dispList.products) || [];
        if (dispProducts.length > 0) {
          rentalProduct = dispProducts[0];
        }
      } catch (e) {
        // Ignored: category may not exist; fall back to order-based discovery
      }

      // Fallback: discover rental product from existing orders containing rentals
      if (!rentalProduct) {
        const ordersRaw = localStorage.getItem('orders') || '[]';
        const orders = JSON.parse(ordersRaw);
        const rentalOrder = orders.find(function (o) { return o.contains_rentals === true; });
        this.assert(!!rentalOrder, 'There should be an existing order containing a rental item for discovery');

        const orderDetails = this.logic.getOrderDetails(rentalOrder.id);
        const orderItems = orderDetails.items || [];
        const rentalItem = orderItems.find(function (oi) { return oi.item_type === 'rental'; });
        this.assert(!!rentalItem, 'Rental item should be present on the rental order');

        const rentalDetails = this.logic.getProductDetails(rentalItem.product_id);
        rentalProduct = rentalDetails.product;
      }

      this.assert(rentalProduct && rentalProduct.is_rental_product === true,
        'Rental product should be identified and marked as rental');

      if (typeof rentalProduct.rental_price_per_month === 'number') {
        this.assert(rentalProduct.rental_price_per_month <= 20,
          'Rental price per month should be <= $20 as per task requirement');
      } else {
        // Fallback: use price if rental_price_per_month is not present
        this.assert(rentalProduct.price <= 20,
          'Rental price should be <= $20 as per task requirement');
      }

      // Choose rental duration: prefer 1_month if available
      const rentalDetailsFull = this.logic.getProductDetails(rentalProduct.id);
      const rentalPurchaseOptions = rentalDetailsFull.purchase_options || {};
      const rentalDurationOptions = rentalPurchaseOptions.rental_duration_options || [];
      this.assert(rentalDurationOptions.length > 0, 'Rental duration options should be available');
      let rentalDuration = null;
      for (let i = 0; i < rentalDurationOptions.length; i++) {
        if (rentalDurationOptions[i].value === '1_month') {
          rentalDuration = rentalDurationOptions[i].value;
          break;
        }
      }
      if (!rentalDuration) {
        rentalDuration = rentalDurationOptions[0].value;
      }

      // Add rental dispenser to cart with quantity 1 and chosen duration
      const rentalAddResult = this.logic.addItemToCart(
        rentalProduct.id,
        'rental',
        1,
        undefined,
        undefined,
        rentalDuration
      );
      this.assert(rentalAddResult && rentalAddResult.success === true,
        'Adding rental dispenser to cart should succeed');
      let cart = rentalAddResult.cart;

      // Find a still 5-gallon water product (matching 5-gallon for dispenser). Use existing order with rental as hint.
      let waterProduct = null;
      try {
        const waterList = this.logic.listProducts(
          'water',
          1,
          50,
          'price',
          'asc',
          {
            sizeFilterKeys: ['5_gallon'],
            waterTypes: ['still']
          }
        );
        const waterProducts = (waterList && waterList.products) || [];
        if (waterProducts.length > 0) {
          waterProduct = waterProducts[0];
        }
      } catch (e2) {
        // ignore
      }

      if (!waterProduct) {
        const ordersRaw = localStorage.getItem('orders') || '[]';
        const orders = JSON.parse(ordersRaw);
        const rentalOrder = orders.find(function (o) { return o.contains_rentals === true; });
        this.assert(!!rentalOrder, 'Rental order should exist to infer matching water product');
        const orderDetails = this.logic.getOrderDetails(rentalOrder.id);
        const orderItems = orderDetails.items || [];
        const waterItem = orderItems.find(function (oi) { return oi.item_type === 'one_time'; });
        this.assert(!!waterItem, 'Rental order should include a one-time water item');
        const waterDetailsFull = this.logic.getProductDetails(waterItem.product_id);
        waterProduct = waterDetailsFull.product;
      }

      this.assert(waterProduct.size_filter_key === '5_gallon', 'Water product should be 5-gallon size');

      // Add 4 jugs of this water product as one-time purchase
      const waterQuantity = 4;
      const waterAddResult = this.logic.addItemToCart(
        waterProduct.id,
        'one_time',
        waterQuantity,
        undefined,
        undefined,
        undefined
      );
      this.assert(waterAddResult && waterAddResult.success === true,
        'Adding 4 water jugs to cart should succeed');
      cart = waterAddResult.cart;

      const rentalLine = (cart.items || []).find(function (ci) { return ci.item_type === 'rental'; });
      const waterLine = (cart.items || []).find(function (ci) { return ci.product_id === waterProduct.id; });
      this.assert(!!rentalLine, 'Cart should contain a rental line item');
      this.assert(!!waterLine, 'Cart should contain the water line item');
      this.assert(waterLine.quantity === waterQuantity, 'Water line quantity should be ' + waterQuantity);

      // Proceed to checkout and schedule earliest available standard delivery within next 7 days
      const checkoutData = this.logic.getCheckoutData();
      this.assert(checkoutData && checkoutData.cart && checkoutData.cart.items.length > 0,
        'Checkout data should include cart with items');

      const addresses = checkoutData.addresses || [];
      this.assert(addresses.length > 0, 'There should be at least one address for checkout');
      const deliveryOptions = checkoutData.delivery_options || {};
      const earliestDateStr = deliveryOptions.earliest_available_date;
      this.assert(earliestDateStr, 'Earliest available delivery date should be provided');

      const timeWindowOptions = deliveryOptions.standard_delivery_time_windows || [];
      this.assert(timeWindowOptions.length > 0, 'Standard delivery time windows should be provided at checkout');
      const deliveryMethods = deliveryOptions.delivery_method_options || [];
      this.assert(deliveryMethods.length > 0, 'Delivery method options should be provided at checkout');

      // Choose earliest date (already computed by backend)
      const earliestDate = new Date(earliestDateStr);
      const chosenDateIso = this.toIsoDate(earliestDate);

      // Choose standard delivery method if available
      let deliveryMethod = null;
      for (let i = 0; i < deliveryMethods.length; i++) {
        if (deliveryMethods[i].value === 'standard') {
          deliveryMethod = deliveryMethods[i].value;
          break;
        }
      }
      if (!deliveryMethod) {
        deliveryMethod = deliveryMethods[0].value;
      }

      // Choose first available time window (simulating earliest standard delivery window)
      const chosenTimeWindow = timeWindowOptions[0].value;

      // Choose default address if provided, else first
      let addressId = checkoutData.default_address_id;
      if (!addressId && addresses.length > 0) {
        addressId = addresses[0].id;
      }
      this.assert(addressId, 'An address id should be chosen for delivery');

      const placeOrderResult = this.logic.placeOrder(
        addressId,
        chosenDateIso,
        chosenTimeWindow,
        deliveryMethod
      );

      this.assert(placeOrderResult && placeOrderResult.success === true, 'Placing order should succeed');
      const order = placeOrderResult.order;
      this.assert(order && order.contains_rentals === true, 'Order should indicate it contains rentals');

      const orderItems = order.items || [];
      const orderRentalLine = orderItems.find(function (oi) { return oi.item_type === 'rental'; });
      const orderWaterLine = orderItems.find(function (oi) { return oi.product_id === waterProduct.id; });
      this.assert(!!orderRentalLine, 'Order items should include rental line');
      this.assert(!!orderWaterLine, 'Order items should include water line');
      this.assert(orderWaterLine.quantity === waterQuantity,
        'Order water line quantity should be ' + waterQuantity);

      const delivery = order.delivery;
      this.assert(delivery && delivery.scheduled_date.indexOf(chosenDateIso) === 0,
        'Order delivery date should match chosen date');
      this.assert(delivery.time_window === chosenTimeWindow,
        'Order delivery time window should match chosen window');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // Assertions and result helpers
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

// Export for Node.js ONLY
module.exports = TestRunner;
