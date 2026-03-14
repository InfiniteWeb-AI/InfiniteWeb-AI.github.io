// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (embedded here),
    // then augment with additional fixtures needed to exercise all flows.

    const generatedData = {
      "chalets": [
        {
          "id": "chalet_pinecrest_lodge",
          "name": "Pinecrest Lodge",
          "short_name": "Pinecrest",
          "description": "Cozy mid-range chalet a short walk from the ski lifts, with a private hot tub and fireplace, ideal for small groups.",
          "address_line1": "214 Pinecrest Way",
          "address_line2": "",
          "city": "Alpine Ridge",
          "region": "Colorado",
          "postal_code": "80435",
          "country": "USA",
          "distance_to_ski_lifts_km": 1.2,
          "base_nightly_price": 190,
          "currency": "usd",
          "max_guests": 6,
          "max_adults": 4,
          "max_children": 2,
          "bedroom_count": 2,
          "is_pet_friendly": false,
          "amenities": [
            "hot_tub",
            "fireplace",
            "wifi",
            "parking",
            "mountain_view",
            "bbq"
          ],
          "images": [
            "https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1519817650390-64a93db511aa?w=800&h=600&fit=crop&auto=format&q=80",
            "https://picsum.photos/800/600?random=101"
          ],
          "default_check_in_time": "16:00",
          "default_check_out_time": "11:00",
          "status": "active",
          "created_at": "2024-10-01T10:00:00Z",
          "updated_at": "2025-12-15T09:30:00Z"
        },
        {
          "id": "chalet_snowberry_retreat",
          "name": "Snowberry Retreat",
          "short_name": "Snowberry",
          "description": "Spacious chalet with hot tub and sauna, perfect for families looking for comfort close to the slopes.",
          "address_line1": "88 Snowberry Lane",
          "address_line2": "",
          "city": "Alpine Ridge",
          "region": "Colorado",
          "postal_code": "80435",
          "country": "USA",
          "distance_to_ski_lifts_km": 3.5,
          "base_nightly_price": 220,
          "currency": "usd",
          "max_guests": 7,
          "max_adults": 5,
          "max_children": 3,
          "bedroom_count": 3,
          "is_pet_friendly": false,
          "amenities": [
            "hot_tub",
            "sauna",
            "fireplace",
            "wifi",
            "parking",
            "washing_machine",
            "dishwasher",
            "mountain_view"
          ],
          "images": [
            "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop&auto=format&q=80",
            "https://picsum.photos/800/600?random=102"
          ],
          "default_check_in_time": "15:00",
          "default_check_out_time": "10:00",
          "status": "active",
          "created_at": "2024-09-15T14:20:00Z",
          "updated_at": "2026-01-10T11:05:00Z"
        },
        {
          "id": "chalet_moose_trail_cabin",
          "name": "Moose Trail Cabin",
          "short_name": "Moose Trail",
          "description": "Rustic wood cabin with private hot tub and wood-burning fireplace, located on a quiet forest trail.",
          "address_line1": "17 Moose Trail",
          "address_line2": "",
          "city": "Alpine Ridge",
          "region": "Colorado",
          "postal_code": "80435",
          "country": "USA",
          "distance_to_ski_lifts_km": 4.8,
          "base_nightly_price": 245,
          "currency": "usd",
          "max_guests": 6,
          "max_adults": 4,
          "max_children": 2,
          "bedroom_count": 3,
          "is_pet_friendly": true,
          "amenities": [
            "hot_tub",
            "fireplace",
            "pet_friendly",
            "wifi",
            "parking",
            "bbq",
            "mountain_view"
          ],
          "images": [
            "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop&auto=format&q=80",
            "https://picsum.photos/800/600?random=103"
          ],
          "default_check_in_time": "16:00",
          "default_check_out_time": "11:00",
          "status": "active",
          "created_at": "2024-11-05T09:10:00Z",
          "updated_at": "2025-11-20T16:45:00Z"
        }
      ],
      "payment_methods": [
        {
          "id": "pm_credit_card",
          "method_key": "credit_card",
          "display_name": "Credit card",
          "description": "Pay securely with Visa, Mastercard, or American Express.",
          "is_enabled": true,
          "sort_order": 1
        },
        {
          "id": "pm_paypal",
          "method_key": "paypal",
          "display_name": "PayPal",
          "description": "Use your PayPal balance or linked bank account.",
          "is_enabled": true,
          "sort_order": 2
        },
        {
          "id": "pm_apple_pay",
          "method_key": "apple_pay",
          "display_name": "Apple Pay",
          "description": "Fast checkout with Apple Pay on supported devices.",
          "is_enabled": true,
          "sort_order": 3
        }
      ],
      "stay_extras": [
        {
          "id": "extra_airport_transfer_round_trip",
          "name": "Airport transfer (round trip)",
          "description": "Private round-trip transfer between the airport and your chalet for your whole group.",
          "extra_type": "airport_transfer",
          "pricing_model": "per_booking",
          "base_price": 160,
          "currency": "usd",
          "is_active": true
        },
        {
          "id": "extra_airport_transfer_one_way",
          "name": "Airport transfer (one way)",
          "description": "Private one-way transfer between the airport and your chalet.",
          "extra_type": "airport_transfer",
          "pricing_model": "per_booking",
          "base_price": 95,
          "currency": "usd",
          "is_active": true
        },
        {
          "id": "extra_daily_breakfast",
          "name": "Daily breakfast",
          "description": "Buffet-style breakfast served each morning of your stay.",
          "extra_type": "daily_breakfast",
          "pricing_model": "per_guest_per_night",
          "base_price": 18,
          "currency": "usd",
          "is_active": true
        }
      ],
      "store_categories": [
        {
          "id": "grocery_essentials",
          "name": "Groceries & Essentials",
          "description": "Fridge-stocking groceries, beverages, and everyday essentials for your stay.",
          "category_key": "grocery_essentials",
          "parent_category_id": "",
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/89372ae6-7ff0-542e-b233-92beee8e2f24.jpeg",
          "sort_order": 1
        },
        {
          "id": "breakfast",
          "name": "Breakfast",
          "description": "Cereals, eggs, pastries, and other breakfast favorites ready for your chalet fridge.",
          "category_key": "breakfast",
          "parent_category_id": "grocery_essentials",
          "image": "https://img.livestrong.com/630x/photos.demandstudios.com/getty/article/228/196/605382161_XS.jpg",
          "sort_order": 2
        },
        {
          "id": "dinner_ready_meals",
          "name": "Dinner & Ready meals",
          "description": "Hearty prepared mains and sides you can heat and serve after a day on the slopes.",
          "category_key": "dinner_ready_meals",
          "parent_category_id": "grocery_essentials",
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/9a54af38-9190-5250-a284-858ea2c3ff9c.jpeg",
          "sort_order": 3
        }
      ],
      "products": [
        {
          "id": "prod_breakfast_eggs_dozen",
          "name": "Free-range Eggs (Dozen)",
          "description": "One dozen free-range large eggs, perfect for scrambled eggs, omelets, or baking during your stay.",
          "category_id": "breakfast",
          "product_type": "breakfast_item",
          "price": 6.5,
          "currency": "usd",
          "is_free_shipping": false,
          "is_digital": false,
          "is_physical": true,
          "is_gift_card": false,
          "is_grocery_item": true,
          "can_deliver_to_chalet": true,
          "stock_quantity": 120,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/d8b83672-3389-5bb0-88b5-43bd3abbeecd.jpeg",
          "attributes": [
            "protein_rich",
            "refrigerated",
            "breakfast_basic"
          ],
          "status": "active",
          "created_at": "2024-06-01T09:00:00Z",
          "updated_at": "2025-11-10T12:15:00Z"
        },
        {
          "id": "prod_breakfast_yogurt_parfait",
          "name": "Granola & Berries Yogurt Parfait",
          "description": "Individual parfait with creamy yogurt, crunchy granola, and mixed berries. Ready to grab from the fridge.",
          "category_id": "breakfast",
          "product_type": "breakfast_item",
          "price": 5.75,
          "currency": "usd",
          "is_free_shipping": false,
          "is_digital": false,
          "is_physical": true,
          "is_gift_card": false,
          "is_grocery_item": true,
          "can_deliver_to_chalet": true,
          "stock_quantity": 80,
          "image": "https://www.thereciperebel.com/wp-content/uploads/2019/10/yogurt-parfaits-www.thereciperebel.com-600-22-of-27.jpg",
          "attributes": [
            "vegetarian",
            "refrigerated",
            "single_serve"
          ],
          "status": "active",
          "created_at": "2024-06-02T10:30:00Z",
          "updated_at": "2025-10-05T08:45:00Z"
        },
        {
          "id": "prod_breakfast_pancake_mix",
          "name": "Buttermilk Pancake Mix",
          "description": "Family-size buttermilk pancake mix, just add water or milk for an easy chalet breakfast.",
          "category_id": "breakfast",
          "product_type": "breakfast_item",
          "price": 9.5,
          "currency": "usd",
          "is_free_shipping": false,
          "is_digital": false,
          "is_physical": true,
          "is_gift_card": false,
          "is_grocery_item": true,
          "can_deliver_to_chalet": true,
          "stock_quantity": 60,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/09855db7-c8e9-5c98-84aa-0974db600caf.jpeg",
          "attributes": [
            "family_size",
            "dry_goods",
            "easy_prepare"
          ],
          "status": "active",
          "created_at": "2024-06-05T11:00:00Z",
          "updated_at": "2025-09-20T14:10:00Z"
        }
      ],
      "product_variants": [
        {
          "id": "var_gloves_blue_s",
          "product_id": "prod_gear_ski_gloves_blue",
          "sku": "GLV-ALP-PRO-BLU-S",
          "color": "blue",
          "size": "S",
          "additional_price": 0,
          "is_default": true,
          "image": "https://www.expocafeperu.com/w/2019/11/hestra-alpine-pro-water-ski-gloves-ski-gloves-amazon-ski-gloves-waterproof-1092x1092.jpg"
        },
        {
          "id": "var_gloves_black_m",
          "product_id": "prod_gear_ski_gloves_blue",
          "sku": "GLV-ALP-PRO-BLK-M",
          "color": "black",
          "size": "M",
          "additional_price": 3,
          "is_default": false,
          "image": "https://www.expocafeperu.com/w/2019/11/hestra-alpine-pro-water-ski-gloves-ski-gloves-amazon-ski-gloves-waterproof-1092x1092.jpg"
        },
        {
          "id": "var_gloves_red_l",
          "product_id": "prod_gear_ski_gloves_blue",
          "sku": "GLV-ALP-PRO-RED-L",
          "color": "red",
          "size": "L",
          "additional_price": 5,
          "is_default": false,
          "image": "https://www.expocafeperu.com/w/2019/11/hestra-alpine-pro-water-ski-gloves-ski-gloves-amazon-ski-gloves-waterproof-1092x1092.jpg"
        }
      ],
      "booking_extras": [
        {
          "id": "be_BK2026MAR001_transfer_rt",
          "booking_id": "BK2026MAR001",
          "stay_extra_id": "extra_airport_transfer_round_trip",
          "extra_type": "airport_transfer",
          "quantity": 1,
          "passengers_count": 4,
          "direction": "round_trip",
          "unit_price": 160,
          "total_price": 160,
          "currency": "usd",
          "created_at": "2026-02-15T10:00:00Z"
        },
        {
          "id": "be_BK2026MAR001_breakfast",
          "booking_id": "BK2026MAR001",
          "stay_extra_id": "extra_daily_breakfast",
          "extra_type": "daily_breakfast",
          "quantity": 16,
          "guests_count": 4,
          "date_from": "2026-03-06T00:00:00Z",
          "date_to": "2026-03-10T00:00:00Z",
          "unit_price": 18,
          "total_price": 288,
          "currency": "usd",
          "created_at": "2026-02-15T10:05:00Z"
        },
        {
          "id": "be_BK2026MAR001_late_co",
          "booking_id": "BK2026MAR001",
          "stay_extra_id": "extra_late_checkout",
          "extra_type": "late_checkout",
          "quantity": 1,
          "date": "2026-03-10T00:00:00Z",
          "unit_price": 40,
          "total_price": 40,
          "currency": "usd",
          "created_at": "2026-02-15T10:10:00Z"
        }
      ],
      "bookings": [
        {
          "id": "BK2026MAR001",
          "reference_code": "MRCH760PINE",
          "chalet_id": "chalet_pinecrest_lodge",
          "check_in": "2026-03-06T16:00:00Z",
          "check_out": "2026-03-10T11:00:00Z",
          "nights": 4,
          "adults_count": 4,
          "children_count": 0,
          "pets_count": 0,
          "lead_guest_first_name": "Emily",
          "lead_guest_last_name": "Johnson",
          "contact_email": "emily.johnson@example.com",
          "contact_phone": "+1-555-0134",
          "special_requests": "Please have the hot tub pre-heated by 7pm on arrival day.",
          "base_nightly_rate": 190,
          "room_charges_total": 760,
          "taxes": 76,
          "fees": 30,
          "currency": "usd",
          "status": "confirmed",
          "created_at": "2026-02-10T09:15:00Z",
          "updated_at": "2026-02-15T10:15:00Z",
          "chalet_name": "Pinecrest Lodge",
          "extras_total": 488.0,
          "grand_total": 1354.0
        },
        {
          "id": "BK2026APR010",
          "reference_code": "APR185FOX",
          "chalet_id": "chalet_foxfire_loft",
          "check_in": "2026-04-10T15:00:00Z",
          "check_out": "2026-04-13T10:00:00Z",
          "nights": 3,
          "adults_count": 2,
          "children_count": 0,
          "pets_count": 0,
          "lead_guest_first_name": "Liam",
          "lead_guest_last_name": "Garcia",
          "contact_email": "liam.garcia@example.com",
          "contact_phone": "+1-555-0177",
          "special_requests": "High floor if possible and a late check-in around 9pm.",
          "base_nightly_rate": 185,
          "room_charges_total": 555,
          "taxes": 55.5,
          "fees": 25,
          "currency": "usd",
          "status": "confirmed",
          "created_at": "2026-02-25T14:40:00Z",
          "updated_at": "2026-03-01T09:30:00Z",
          "chalet_name": "Foxfire Loft",
          "extras_total": 203.0,
          "grand_total": 838.5
        },
        {
          "id": "BK2026JUL00611",
          "reference_code": "JULFAM2026",
          "chalet_id": "chalet_evergreen_grande",
          "check_in": "2026-07-06T16:00:00Z",
          "check_out": "2026-07-11T11:00:00Z",
          "nights": 5,
          "adults_count": 6,
          "children_count": 2,
          "pets_count": 1,
          "lead_guest_first_name": "Olivia",
          "lead_guest_last_name": "Nguyen",
          "contact_email": "olivia.nguyen@example.com",
          "contact_phone": "+1-555-0220",
          "special_requests": "Traveling with a small dog; please provide pet bowl and crate if available.",
          "base_nightly_rate": 320,
          "room_charges_total": 1600,
          "taxes": 160,
          "fees": 50,
          "currency": "usd",
          "status": "confirmed",
          "created_at": "2026-02-18T11:05:00Z",
          "updated_at": "2026-02-20T11:05:00Z",
          "chalet_name": "Evergreen Grande Chalet",
          "extras_total": 720.0,
          "grand_total": 2530.0
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:18:37.849507"
      }
    };

    // Start from generated data arrays
    const chalets = generatedData.chalets.slice();
    const paymentMethods = generatedData.payment_methods.slice();
    const stayExtras = generatedData.stay_extras.slice();
    const storeCategories = generatedData.store_categories.slice();
    const products = generatedData.products.slice();
    const productVariants = generatedData.product_variants.slice();
    const bookingExtras = generatedData.booking_extras.slice();
    const bookings = generatedData.bookings.slice();

    // Augment data to support all flows

    // Add a late checkout stay extra referenced by booking_extras
    stayExtras.push({
      id: 'extra_late_checkout',
      name: 'Late checkout',
      description: 'Extend your checkout time to 2pm.',
      extra_type: 'late_checkout',
      pricing_model: 'per_booking',
      base_price: 40,
      currency: 'usd',
      is_active: true
    });

    // Add chalet records referenced by some bookings for consistency
    chalets.push({
      id: 'chalet_foxfire_loft',
      name: 'Foxfire Loft',
      short_name: 'Foxfire',
      description: 'Modern loft-style chalet close to the village center.',
      address_line1: '12 Foxfire Lane',
      address_line2: '',
      city: 'Alpine Ridge',
      region: 'Colorado',
      postal_code: '80435',
      country: 'USA',
      distance_to_ski_lifts_km: 2.1,
      base_nightly_price: 185,
      currency: 'usd',
      max_guests: 4,
      max_adults: 2,
      max_children: 2,
      bedroom_count: 1,
      is_pet_friendly: false,
      amenities: ['wifi', 'parking', 'mountain_view'],
      images: [],
      default_check_in_time: '15:00',
      default_check_out_time: '10:00',
      status: 'active',
      created_at: '2024-07-01T10:00:00Z',
      updated_at: '2025-12-01T10:00:00Z'
    });

    chalets.push({
      id: 'chalet_evergreen_grande',
      name: 'Evergreen Grande Chalet',
      short_name: 'Evergreen Grande',
      description: 'Large family chalet with sauna and pet-friendly policy.',
      address_line1: '300 Evergreen Way',
      address_line2: '',
      city: 'Alpine Ridge',
      region: 'Colorado',
      postal_code: '80435',
      country: 'USA',
      distance_to_ski_lifts_km: 4.0,
      base_nightly_price: 320,
      currency: 'usd',
      max_guests: 10,
      max_adults: 6,
      max_children: 4,
      bedroom_count: 4,
      is_pet_friendly: true,
      amenities: ['hot_tub', 'sauna', 'fireplace', 'pet_friendly', 'wifi', 'parking'],
      images: [],
      default_check_in_time: '16:00',
      default_check_out_time: '11:00',
      status: 'active',
      created_at: '2024-08-01T10:00:00Z',
      updated_at: '2025-12-01T10:00:00Z'
    });

    // Add additional store categories needed for all tasks
    const extraCategories = [
      {
        id: 'snacks',
        name: 'Snacks',
        description: 'Chips, nuts, and other snacks.',
        category_key: 'snacks',
        parent_category_id: 'grocery_essentials',
        image: '',
        sort_order: 4
      },
      {
        id: 'clothing_accessories',
        name: 'Clothing & Accessories',
        description: 'Winter clothing, accessories, and gear.',
        category_key: 'clothing_accessories',
        parent_category_id: '',
        image: '',
        sort_order: 10
      },
      {
        id: 'fireplace_comfort',
        name: 'Fireplace & Comfort',
        description: 'Firewood and cozy fireplace accessories.',
        category_key: 'fireplace_comfort',
        parent_category_id: '',
        image: '',
        sort_order: 11
      },
      {
        id: 'candles_ambience',
        name: 'Candles & Ambience',
        description: 'Candles and ambience accessories.',
        category_key: 'candles_ambience',
        parent_category_id: '',
        image: '',
        sort_order: 12
      },
      {
        id: 'games_entertainment',
        name: 'Games & Entertainment',
        description: 'Board games and activities for your stay.',
        category_key: 'games_entertainment',
        parent_category_id: '',
        image: '',
        sort_order: 13
      },
      {
        id: 'gift_cards',
        name: 'Gift cards & Vouchers',
        description: 'Digital chalet gift vouchers.',
        category_key: 'gift_cards',
        parent_category_id: '',
        image: '',
        sort_order: 14
      }
    ];
    // Avoid duplicate category_keys if _initStorage added them
    extraCategories.forEach(ec => {
      if (!storeCategories.find(c => c.category_key === ec.category_key)) {
        storeCategories.push(ec);
      }
    });

    // Add additional products to support winter gear, snacks, dinner mains, fireplace, games, and gift cards
    const extraProducts = [
      // Dinner mains
      {
        id: 'prod_dinner_lasagna',
        name: 'Baked Beef Lasagna (Family Tray)',
        description: 'Hearty oven-ready lasagna for 4-6 guests.',
        category_id: 'dinner_ready_meals',
        product_type: 'dinner_main',
        price: 15,
        currency: 'usd',
        rating: 4.4,
        review_count: 53,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: true,
        can_deliver_to_chalet: true,
        stock_quantity: 40,
        image: '',
        attributes: ['oven_ready'],
        status: 'active',
        created_at: '2024-06-10T10:00:00Z',
        updated_at: '2025-11-10T10:00:00Z'
      },
      {
        id: 'prod_dinner_chili',
        name: 'Slow-Cooked Beef Chili',
        description: 'Ready-to-heat chili with beans, serves 4.',
        category_id: 'dinner_ready_meals',
        product_type: 'dinner_main',
        price: 18,
        currency: 'usd',
        rating: 4.6,
        review_count: 41,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: true,
        can_deliver_to_chalet: true,
        stock_quantity: 30,
        image: '',
        attributes: ['spicy'],
        status: 'active',
        created_at: '2024-06-11T10:00:00Z',
        updated_at: '2025-11-11T10:00:00Z'
      },
      // Snacks
      {
        id: 'prod_snack_trail_mix',
        name: 'Mountain Trail Mix',
        description: 'Nut and dried fruit trail mix.',
        category_id: 'snacks',
        product_type: 'snack',
        price: 7,
        currency: 'usd',
        rating: 4.7,
        review_count: 88,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: true,
        can_deliver_to_chalet: true,
        stock_quantity: 100,
        image: '',
        attributes: ['vegetarian', 'snack'],
        status: 'active',
        created_at: '2024-06-12T10:00:00Z',
        updated_at: '2025-11-12T10:00:00Z'
      },
      // Winter gear: ski gloves, beanie, socks
      {
        id: 'prod_gear_ski_gloves_blue',
        name: 'Alpine Pro Ski Gloves',
        description: 'Insulated waterproof ski gloves.',
        category_id: 'clothing_accessories',
        product_type: 'ski_gloves',
        price: 75,
        currency: 'usd',
        rating: 4.7,
        review_count: 120,
        is_free_shipping: true,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 25,
        image: '',
        attributes: ['winter_gear'],
        status: 'active',
        created_at: '2024-09-01T10:00:00Z',
        updated_at: '2025-11-01T10:00:00Z'
      },
      {
        id: 'prod_gear_beanie_blue',
        name: 'Cozy Knit Beanie',
        description: 'Warm knit beanie with fleece lining.',
        category_id: 'clothing_accessories',
        product_type: 'beanie',
        price: 40,
        currency: 'usd',
        rating: 4.8,
        review_count: 98,
        is_free_shipping: true,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 40,
        image: '',
        attributes: ['winter_gear'],
        status: 'active',
        created_at: '2024-09-02T10:00:00Z',
        updated_at: '2025-11-02T10:00:00Z'
      },
      {
        id: 'prod_gear_thermal_socks',
        name: 'Thermal Ski Socks (Pair)',
        description: 'Thick thermal socks for long days on the slopes.',
        category_id: 'clothing_accessories',
        product_type: 'socks',
        price: 30,
        currency: 'usd',
        rating: 4.6,
        review_count: 76,
        is_free_shipping: true,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 50,
        image: '',
        attributes: ['winter_gear', 'thermal_wear'],
        status: 'active',
        created_at: '2024-09-03T10:00:00Z',
        updated_at: '2025-11-03T10:00:00Z'
      },
      // Fireplace & comfort
      {
        id: 'prod_firewood_pack',
        name: 'Firewood Pack',
        description: 'Bundle of kiln-dried firewood logs.',
        category_id: 'fireplace_comfort',
        product_type: 'firewood',
        price: 20,
        currency: 'usd',
        rating: 4.5,
        review_count: 64,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 100,
        image: '',
        attributes: ['firewood'],
        status: 'active',
        created_at: '2024-09-04T10:00:00Z',
        updated_at: '2025-11-04T10:00:00Z'
      },
      {
        id: 'prod_matches_box',
        name: 'Long-Stem Fireplace Matches',
        description: 'Box of 50 long-stem safety matches.',
        category_id: 'fireplace_comfort',
        product_type: 'matches',
        price: 5,
        currency: 'usd',
        rating: 4.3,
        review_count: 25,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 80,
        image: '',
        attributes: ['fireplace'],
        status: 'active',
        created_at: '2024-09-05T10:00:00Z',
        updated_at: '2025-11-05T10:00:00Z'
      },
      // Candles
      {
        id: 'prod_candle_votives',
        name: 'Scented Votive Candles (Pack of 3)',
        description: 'Three vanilla-scented votive candles.',
        category_id: 'candles_ambience',
        product_type: 'candle',
        price: 12,
        currency: 'usd',
        rating: 4.6,
        review_count: 39,
        is_free_shipping: false,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 60,
        image: '',
        attributes: ['candle'],
        status: 'active',
        created_at: '2024-09-06T10:00:00Z',
        updated_at: '2025-11-06T10:00:00Z'
      },
      // Board games
      {
        id: 'prod_boardgame_2_4',
        name: 'Summit Strategy (2-4 Players)',
        description: 'Tactical mountain adventure board game.',
        category_id: 'games_entertainment',
        product_type: 'board_game',
        price: 35,
        currency: 'usd',
        rating: 4.7,
        review_count: 52,
        is_free_shipping: true,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 30,
        image: '',
        attributes: ['2_4_players'],
        min_players: 2,
        max_players: 4,
        status: 'active',
        created_at: '2024-09-07T10:00:00Z',
        updated_at: '2025-11-07T10:00:00Z'
      },
      {
        id: 'prod_boardgame_4_8',
        name: 'Party Peaks (4-8 Players)',
        description: 'Fast-paced party board game for larger groups.',
        category_id: 'games_entertainment',
        product_type: 'board_game',
        price: 40,
        currency: 'usd',
        rating: 4.5,
        review_count: 37,
        is_free_shipping: true,
        is_digital: false,
        is_physical: true,
        is_gift_card: false,
        is_grocery_item: false,
        can_deliver_to_chalet: true,
        stock_quantity: 25,
        image: '',
        attributes: ['4_8_players'],
        min_players: 4,
        max_players: 8,
        status: 'active',
        created_at: '2024-09-08T10:00:00Z',
        updated_at: '2025-11-08T10:00:00Z'
      },
      // Digital gift card
      {
        id: 'prod_giftcard_chalet',
        name: 'Digital Chalet Stay Gift Card',
        description: 'Digital gift voucher redeemable for chalet stays.',
        category_id: 'gift_cards',
        product_type: 'gift_card',
        price: 1,
        currency: 'usd',
        rating: 4.9,
        review_count: 210,
        is_free_shipping: true,
        is_digital: true,
        is_physical: false,
        is_gift_card: true,
        is_grocery_item: false,
        can_deliver_to_chalet: false,
        stock_quantity: 1000,
        image: '',
        attributes: ['digital'],
        status: 'active',
        created_at: '2024-09-09T10:00:00Z',
        updated_at: '2025-11-09T10:00:00Z'
      }
    ];

    extraProducts.forEach(p => {
      if (!products.find(existing => existing.id === p.id)) {
        products.push(p);
      }
    });

    // Add variants for beanie and socks (blue color preference)
    const extraVariants = [
      {
        id: 'var_beanie_blue',
        product_id: 'prod_gear_beanie_blue',
        sku: 'BEANIE-BLU-ONE',
        color: 'blue',
        size: 'One Size',
        additional_price: 0,
        is_default: true
      },
      {
        id: 'var_socks_blue',
        product_id: 'prod_gear_thermal_socks',
        sku: 'SOCKS-THERM-BLU-L',
        color: 'blue',
        size: 'L',
        additional_price: 0,
        is_default: true
      }
    ];

    extraVariants.forEach(v => {
      if (!productVariants.find(existing => existing.id === v.id)) {
        productVariants.push(v);
      }
    });

    // Persist all prepared data to localStorage using correct storage keys
    localStorage.setItem('chalets', JSON.stringify(chalets));
    localStorage.setItem('payment_methods', JSON.stringify(paymentMethods));
    localStorage.setItem('stay_extras', JSON.stringify(stayExtras));
    localStorage.setItem('store_categories', JSON.stringify(storeCategories));
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('product_variants', JSON.stringify(productVariants));
    localStorage.setItem('booking_extras', JSON.stringify(bookingExtras));
    localStorage.setItem('bookings', JSON.stringify(bookings));
    // Leave cart, cart_items, orders, order_items, favorite_chalets for BusinessLogic to manage
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestWeekendChaletWithHotTub();
    this.testTask2_CompareChaletsAndFavoriteHigherRated();
    this.testTask3_BookPetFriendlyFamilyChaletFiveNightsUnder2000();
    this.testTask4_GroceryFridgeStockingFiveItems();
    this.testTask5_AssembleWinterGearBundleUnder180();
    this.testTask6_FireplaceAndGameNightPackage();
    this.testTask7_PurchaseTwoDigitalGiftVouchers();
    this.testTask8_AddStayExtrasWithinBudget();

    return this.results;
  }

  // ---------- Helper methods ----------

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

  formatDateISO(date) {
    // Return YYYY-MM-DD
    return date.toISOString().slice(0, 10);
  }

  getUpcomingWeekday(targetWeekday) {
    // targetWeekday: 0=Sun..6=Sat
    const today = new Date();
    const day = today.getDay();
    let diff = (targetWeekday - day + 7) % 7;
    if (diff === 0) diff = 7; // always in the future
    const result = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
    return this.formatDateISO(result);
  }

  getAnyActiveChaletFromStorage() {
    const chalets = JSON.parse(localStorage.getItem('chalets') || '[]');
    return chalets.find(c => c.status === 'active') || chalets[0];
  }

  clearCartCompletely() {
    const cartResponse = this.logic.getCart();
    if (cartResponse && cartResponse.cart && Array.isArray(cartResponse.cart.items)) {
      for (const item of cartResponse.cart.items) {
        this.logic.removeCartItem(item.id);
      }
    }
  }

  getCartTotalQuantity() {
    const cartResponse = this.logic.getCart();
    if (!cartResponse || !cartResponse.cart || !Array.isArray(cartResponse.cart.items)) {
      return 0;
    }
    return cartResponse.cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  // ---------- Task 1 ----------
  // Book the cheapest weekend chalet with a hot tub under $250/night within 5 km of the ski lifts
  testTask1_BookCheapestWeekendChaletWithHotTub() {
    const testName = 'Task 1: Book cheapest weekend chalet with hot tub under $250/night within 5 km';
    try {
      const year = new Date().getFullYear();
      const checkIn = year + '-03-06';
      const checkOut = year + '-03-08';
      const adults = 4;
      const children = 0;

      const filters = {
        maxNightlyPrice: 250,
        amenities: ['hot_tub'],
        maxDistanceToSkiLiftsKm: 5
      };

      const results = this.logic.searchAvailableChalets(
        checkIn,
        checkOut,
        adults,
        children,
        filters,
        'price_low_to_high'
      );

      this.assert(Array.isArray(results) && results.length > 0, 'Search should return at least one chalet');

      const first = results[0];
      this.assert(first.chalet_id, 'First result should include chalet_id');

      // Verify filters roughly applied based on actual response values
      if (typeof first.price_per_night_for_dates === 'number') {
        this.assert(
          first.price_per_night_for_dates <= 250,
          'Cheapest chalet nightly price should be <= 250 based on actual data'
        );
      }
      if (Array.isArray(first.amenities)) {
        this.assert(
          first.amenities.indexOf('hot_tub') !== -1,
          'Cheapest chalet should include hot_tub amenity if amenities are returned'
        );
      }
      if (typeof first.distance_to_ski_lifts_km === 'number') {
        this.assert(
          first.distance_to_ski_lifts_km <= 5,
          'Cheapest chalet should be within 5 km of ski lifts based on actual data'
        );
      }

      // Verify it is the cheapest among results (using actual data)
      const prices = results
        .map(r => r.price_per_night_for_dates)
        .filter(p => typeof p === 'number');
      if (prices.length > 0 && typeof first.price_per_night_for_dates === 'number') {
        const minPrice = Math.min.apply(null, prices);
        this.assert(
          first.price_per_night_for_dates === minPrice,
          'First result should be cheapest when sorted by price_low_to_high'
        );
      }

      // Open chalet details
      const details = this.logic.getChaletDetails(
        first.chalet_id,
        checkIn,
        checkOut,
        adults,
        children
      );
      this.assert(details && details.chalet && details.chalet.id === first.chalet_id, 'Chalet details should match selected chalet');

      // Start booking form ("Book now")
      const formData = this.logic.getChaletBookingFormData(
        first.chalet_id,
        checkIn,
        checkOut,
        adults,
        children,
        undefined
      );
      this.assert(formData && formData.chalet_summary && formData.stay_summary, 'Booking form data should be returned');
      this.assert(
        formData.stay_summary.nights === 2,
        'Stay summary should indicate 2 nights for the selected weekend'
      );
      if (typeof formData.price_breakdown.base_nightly_rate === 'number') {
        this.assert(
          formData.price_breakdown.base_nightly_rate <= 250,
          'Base nightly rate on booking form should be <= 250 for this test'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 2 ----------
  // Compare two similarly priced chalets and favorite the one with the higher rating
  testTask2_CompareChaletsAndFavoriteHigherRated() {
    const testName = 'Task 2: Compare two chalets between $180-$220 and favorite higher-rated one';
    try {
      const year = new Date().getFullYear();
      const checkIn = year + '-04-10';
      const checkOut = year + '-04-13';
      const adults = 2;
      const children = 0;

      // Initial search focusing on price range; adapt if too few results
      let results = this.logic.searchAvailableChalets(
        checkIn,
        checkOut,
        adults,
        children,
        { maxNightlyPrice: 220 },
        'price_low_to_high'
      );

      if (!Array.isArray(results) || results.length < 2) {
        // Relax filters: no max price
        results = this.logic.searchAvailableChalets(
          checkIn,
          checkOut,
          adults,
          children,
          undefined,
          'price_low_to_high'
        );
      }

      this.assert(Array.isArray(results) && results.length >= 2, 'Need at least two chalet results to compare');

      // Filter to those within 180-220/night if possible
      let inRange = results.filter(r =>
        typeof r.price_per_night_for_dates === 'number' &&
        r.price_per_night_for_dates >= 180 &&
        r.price_per_night_for_dates <= 220
      );
      if (inRange.length < 2) {
        inRange = results.slice(0, 2);
      }

      const chaletA = inRange[0];
      const chaletB = inRange[1];

      // Open details to read rating & reviews
      const detailsA = this.logic.getChaletDetails(
        chaletA.chalet_id,
        checkIn,
        checkOut,
        adults,
        children
      );
      const detailsB = this.logic.getChaletDetails(
        chaletB.chalet_id,
        checkIn,
        checkOut,
        adults,
        children
      );

      const ratingA = typeof detailsA.chalet.rating === 'number' ? detailsA.chalet.rating : 0;
      const ratingB = typeof detailsB.chalet.rating === 'number' ? detailsB.chalet.rating : 0;
      const reviewsA = typeof detailsA.chalet.review_count === 'number' ? detailsA.chalet.review_count : 0;
      const reviewsB = typeof detailsB.chalet.review_count === 'number' ? detailsB.chalet.review_count : 0;

      let favoredId = chaletA.chalet_id;
      if (ratingB > ratingA) {
        favoredId = chaletB.chalet_id;
      } else if (ratingB === ratingA && reviewsB > reviewsA) {
        favoredId = chaletB.chalet_id;
      }

      // Favorite the chosen chalet
      const toggleResult = this.logic.toggleFavoriteChalet(favoredId);
      this.assert(toggleResult && toggleResult.success === true, 'Favorite toggle should succeed');
      this.assert(toggleResult.is_favorited === true, 'Chosen chalet should now be favorited');

      // Verify via favorites list
      const favorites = this.logic.getFavoriteChalets();
      this.assert(Array.isArray(favorites), 'Favorites list should be an array');
      const found = favorites.find(f => f.chalet && f.chalet.id === favoredId);
      this.assert(!!found, 'Chosen chalet should appear in favorites list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 3 ----------
  // Book a 5-night pet-friendly family chalet with 3+ bedrooms (try with sauna, relax if needed) under $2000 total
  testTask3_BookPetFriendlyFamilyChaletFiveNightsUnder2000() {
    const testName = 'Task 3: Book 5-night pet-friendly 3+ bedroom chalet under $2000 total';
    try {
      const year = new Date().getFullYear();
      const checkIn = year + '-07-06';
      const checkOut = year + '-07-11';
      const adults = 6;
      const children = 2;
      const petsCount = 1;

      // Try strict filters first: pet-friendly, 3+ bedrooms, sauna, total < 2000
      let filters = {
        isPetFriendly: true,
        minBedrooms: 3,
        amenities: ['sauna'],
        maxTotalPrice: 2000
      };
      let results = this.logic.searchAvailableChalets(
        checkIn,
        checkOut,
        adults,
        children,
        filters,
        'price_low_to_high'
      );

      // If no sauna match, relax sauna requirement
      if (!Array.isArray(results) || results.length === 0) {
        filters = {
          isPetFriendly: true,
          minBedrooms: 3,
          maxTotalPrice: 2000
        };
        results = this.logic.searchAvailableChalets(
          checkIn,
          checkOut,
          adults,
          children,
          filters,
          'price_low_to_high'
        );
      }

      this.assert(Array.isArray(results) && results.length > 0, 'Should find at least one chalet matching relaxed criteria');
      const selected = results[0];

      // Validate some constraints against actual data when available
      if (typeof selected.total_price_for_stay === 'number') {
        this.assert(
          selected.total_price_for_stay <= 2000,
          'Total price for stay should be <= 2000 based on search results data'
        );
      }
      if (typeof selected.bedroom_count === 'number') {
        this.assert(
          selected.bedroom_count >= 3,
          'Selected chalet should have at least 3 bedrooms based on results data'
        );
      }
      if (typeof selected.is_pet_friendly === 'boolean') {
        this.assert(
          selected.is_pet_friendly === true,
          'Selected chalet should be pet friendly based on results data'
        );
      }

      // Open details and booking form
      const details = this.logic.getChaletDetails(
        selected.chalet_id,
        checkIn,
        checkOut,
        adults,
        children
      );
      this.assert(details && details.chalet && details.chalet.id === selected.chalet_id, 'Details should match selected chalet');

      const formData = this.logic.getChaletBookingFormData(
        selected.chalet_id,
        checkIn,
        checkOut,
        adults,
        children,
        petsCount
      );
      this.assert(formData && formData.stay_summary, 'Booking form data should be returned');
      this.assert(formData.stay_summary.nights === 5, 'Stay should be 5 nights');
      this.assert(formData.stay_summary.adults === adults, 'Adults count should match');
      this.assert(formData.stay_summary.children === children, 'Children count should match');
      if (typeof formData.price_breakdown.total === 'number') {
        this.assert(
          formData.price_breakdown.total <= 2000,
          'Quoted total on booking form should be <= 2000 when available'
        );
      }

      // Submit booking form to create pending booking and proceed to review
      const submitResult = this.logic.submitChaletBookingForm(
        selected.chalet_id,
        checkIn,
        checkOut,
        adults,
        children,
        petsCount,
        'Test',
        'Family',
        'test.family@example.com',
        '+1-555-0000',
        'Integration test booking'
      );

      this.assert(submitResult && submitResult.success === true, 'Booking form submission should succeed');
      this.assert(submitResult.booking && submitResult.booking.id, 'Booking object with ID should be returned');

      const bookingId = submitResult.booking.id;
      const reviewData = this.logic.getBookingReview(bookingId);
      this.assert(reviewData && reviewData.booking && reviewData.booking.id === bookingId, 'Review data should return same booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 4 ----------
  // Create a 3-day grocery delivery order with exactly 5 food items and set chalet fridge stocking delivery
  testTask4_GroceryFridgeStockingFiveItems() {
    const testName = 'Task 4: 3-day grocery order with 5 items and chalet fridge stocking delivery';
    try {
      // Ensure cart starts empty
      this.clearCartCompletely();

      // Step 1: 2 different breakfast items under $8 each
      let breakfastProducts = this.logic.listStoreProducts(
        'breakfast',
        null,
        { maxPrice: 8 },
        'price_low_to_high'
      );
      if (!Array.isArray(breakfastProducts) || breakfastProducts.length < 2) {
        breakfastProducts = this.logic.listStoreProducts('breakfast', null, undefined, 'price_low_to_high');
      }
      this.assert(
        Array.isArray(breakfastProducts) && breakfastProducts.length >= 2,
        'Need at least two breakfast products for this flow'
      );

      const breakfastA = breakfastProducts[0];
      const breakfastB = breakfastProducts[1];

      // Open and add first breakfast item
      const breakfastADetails = this.logic.getProductDetails(breakfastA.product_id);
      this.assert(breakfastADetails && breakfastADetails.product, 'Breakfast A details should load');
      let addResult = this.logic.addProductToCart(breakfastA.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding first breakfast item should succeed');

      // Open and add second breakfast item
      const breakfastBDetails = this.logic.getProductDetails(breakfastB.product_id);
      this.assert(breakfastBDetails && breakfastBDetails.product, 'Breakfast B details should load');
      addResult = this.logic.addProductToCart(breakfastB.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding second breakfast item should succeed');

      // Step 2: 2 dinner mains between $10 and $20 each (adapt if needed)
      let dinnerProducts = this.logic.listStoreProducts(
        'dinner_ready_meals',
        null,
        { minPrice: 10, maxPrice: 20, productTypes: ['dinner_main'] },
        'price_low_to_high'
      );

      if (!Array.isArray(dinnerProducts) || dinnerProducts.length < 2) {
        // Relax productTypes filter
        dinnerProducts = this.logic.listStoreProducts(
          'dinner_ready_meals',
          null,
          { minPrice: 10, maxPrice: 20 },
          'price_low_to_high'
        );
      }
      this.assert(
        Array.isArray(dinnerProducts) && dinnerProducts.length >= 2,
        'Need at least two dinner products for this flow'
      );

      const dinnerA = dinnerProducts[0];
      const dinnerB = dinnerProducts[1];

      const dinnerADetails = this.logic.getProductDetails(dinnerA.product_id);
      this.assert(dinnerADetails && dinnerADetails.product, 'Dinner A details should load');
      addResult = this.logic.addProductToCart(dinnerA.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding first dinner main should succeed');

      const dinnerBDetails = this.logic.getProductDetails(dinnerB.product_id);
      this.assert(dinnerBDetails && dinnerBDetails.product, 'Dinner B details should load');
      addResult = this.logic.addProductToCart(dinnerB.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding second dinner main should succeed');

      // Step 3: 1 snack with rating 4.5+ stars
      let snackProducts = this.logic.listStoreProducts(
        'snacks',
        null,
        { minRating: 4.5 },
        'rating_high_to_low'
      );
      if (!Array.isArray(snackProducts) || snackProducts.length === 0) {
        // Relax filters if necessary
        snackProducts = this.logic.listStoreProducts('snacks', null, undefined, 'rating_high_to_low');
      }
      this.assert(Array.isArray(snackProducts) && snackProducts.length > 0, 'Need at least one snack product');

      const snack = snackProducts[0];
      const snackDetails = this.logic.getProductDetails(snack.product_id);
      this.assert(snackDetails && snackDetails.product, 'Snack details should load');
      addResult = this.logic.addProductToCart(snack.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding snack item should succeed');

      // Verify cart has exactly 5 items in total quantity
      const totalQty = this.getCartTotalQuantity();
      this.assert(totalQty === 5, 'Cart should contain total quantity of 5 items, got ' + totalQty);

      // Set delivery: Chalet fridge stocking to some chalet on upcoming Friday
      const chalet = this.getAnyActiveChaletFromStorage();
      this.assert(chalet && chalet.id, 'Should have at least one active chalet for delivery context');
      const upcomingFriday = this.getUpcomingWeekday(5); // 5 = Friday

      const deliveryResult = this.logic.setCartDeliveryContext(
        'chalet_fridge_stocking',
        chalet.id,
        upcomingFriday
      );
      this.assert(deliveryResult && deliveryResult.success === true, 'Setting cart delivery context should succeed');
      this.assert(
        deliveryResult.cart.delivery_option === 'chalet_fridge_stocking',
        'Cart delivery option should be chalet_fridge_stocking'
      );
      this.assert(
        deliveryResult.cart.chalet_id === chalet.id,
        'Cart chalet_id should match selected chalet'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 5 ----------
  // Assemble a winter gear bundle with free shipping, 4.5+ rating, total under $180
  testTask5_AssembleWinterGearBundleUnder180() {
    const testName = 'Task 5: Winter gear bundle with free shipping, rating 4.5+, subtotal < $180';
    try {
      this.clearCartCompletely();

      // Ski gloves: rating 4.5+, free shipping, price < 80
      let glovesProducts = this.logic.listStoreProducts(
        'clothing_accessories',
        'ski_gloves',
        { minRating: 4.5, freeShippingOnly: true, maxPrice: 80 },
        'rating_high_to_low'
      );
      this.assert(Array.isArray(glovesProducts) && glovesProducts.length > 0, 'Need at least one ski gloves product');
      const gloves = glovesProducts[0];

      const glovesDetails = this.logic.getProductDetails(gloves.product_id);
      this.assert(glovesDetails && glovesDetails.product, 'Gloves details should load');

      let selectedGlovesColor;
      if (Array.isArray(glovesDetails.variants)) {
        const blueVariant = glovesDetails.variants.find(v => v.color === 'blue');
        if (blueVariant) {
          selectedGlovesColor = 'blue';
        }
      }

      let addResult = this.logic.addProductToCart(
        gloves.product_id,
        1,
        selectedGlovesColor
      );
      this.assert(addResult && addResult.success === true, 'Adding ski gloves should succeed');

      // Beanie: rating 4.5+, free shipping, price < 60
      let beanieProducts = this.logic.listStoreProducts(
        'clothing_accessories',
        'beanie',
        { minRating: 4.5, freeShippingOnly: true, maxPrice: 60 },
        'rating_high_to_low'
      );
      this.assert(Array.isArray(beanieProducts) && beanieProducts.length > 0, 'Need at least one beanie product');
      const beanie = beanieProducts[0];

      const beanieDetails = this.logic.getProductDetails(beanie.product_id);
      this.assert(beanieDetails && beanieDetails.product, 'Beanie details should load');
      let selectedBeanieColor;
      if (Array.isArray(beanieDetails.variants)) {
        const blueVariant = beanieDetails.variants.find(v => v.color === 'blue');
        if (blueVariant) {
          selectedBeanieColor = 'blue';
        }
      }
      addResult = this.logic.addProductToCart(
        beanie.product_id,
        1,
        selectedBeanieColor
      );
      this.assert(addResult && addResult.success === true, 'Adding beanie should succeed');

      // Thermal socks: rating 4.5+, free shipping, price < 40
      let socksProducts = this.logic.listStoreProducts(
        'clothing_accessories',
        'socks',
        { minRating: 4.5, freeShippingOnly: true, maxPrice: 40 },
        'rating_high_to_low'
      );
      this.assert(Array.isArray(socksProducts) && socksProducts.length > 0, 'Need at least one thermal socks product');
      const socks = socksProducts[0];

      const socksDetails = this.logic.getProductDetails(socks.product_id);
      this.assert(socksDetails && socksDetails.product, 'Socks details should load');
      let selectedSocksColor;
      if (Array.isArray(socksDetails.variants)) {
        const blueVariant = socksDetails.variants.find(v => v.color === 'blue');
        if (blueVariant) {
          selectedSocksColor = 'blue';
        }
      }
      addResult = this.logic.addProductToCart(
        socks.product_id,
        1,
        selectedSocksColor
      );
      this.assert(addResult && addResult.success === true, 'Adding thermal socks should succeed');

      // Verify combined subtotal < 180 and all items free shipping & rating >= 4.5
      const cartResponse = this.logic.getCart();
      this.assert(cartResponse && cartResponse.cart, 'Cart should be returned');
      const cart = cartResponse.cart;

      this.assert(Array.isArray(cart.items) && cart.items.length >= 3, 'Cart should have at least three items');
      if (typeof cart.subtotal === 'number') {
        this.assert(cart.subtotal < 180, 'Gear bundle subtotal should be under $180, got ' + cart.subtotal);
      }

      // Check each item corresponds to expected product types and free shipping when info is available
      for (const item of cart.items) {
        const prodDetails = this.logic.getProductDetails(item.product_id);
        if (prodDetails && prodDetails.product) {
          if (['ski_gloves', 'beanie', 'socks'].indexOf(prodDetails.product.product_type) !== -1) {
            if (typeof prodDetails.product.rating === 'number') {
              this.assert(
                prodDetails.product.rating >= 4.5,
                'Gear item rating should be >= 4.5 based on product data'
              );
            }
            if (typeof prodDetails.product.is_free_shipping === 'boolean') {
              this.assert(
                prodDetails.product.is_free_shipping === true,
                'Gear item should have free shipping based on product data'
              );
            }
          }
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 6 ----------
  // Order a fireplace and game night package for your chalet stay
  testTask6_FireplaceAndGameNightPackage() {
    const testName = 'Task 6: Fireplace and game night package with chalet delivery';
    try {
      this.clearCartCompletely();

      // 2 packs of firewood
      let firewoodProducts = this.logic.listStoreProducts(
        'fireplace_comfort',
        null,
        { productTypes: ['firewood'] },
        'price_low_to_high'
      );
      this.assert(Array.isArray(firewoodProducts) && firewoodProducts.length > 0, 'Need at least one firewood product');
      const firewood = firewoodProducts[0];
      let addResult = this.logic.addProductToCart(firewood.product_id, 2);
      this.assert(addResult && addResult.success === true, 'Adding firewood packs should succeed');

      // 1 box of matches
      let matchesProducts = this.logic.listStoreProducts(
        'fireplace_comfort',
        null,
        { productTypes: ['matches'] },
        'price_low_to_high'
      );
      this.assert(Array.isArray(matchesProducts) && matchesProducts.length > 0, 'Need at least one matches product');
      const matches = matchesProducts[0];
      addResult = this.logic.addProductToCart(matches.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding matches should succeed');

      // 3 candles
      let candleProducts = this.logic.listStoreProducts(
        'candles_ambience',
        null,
        { productTypes: ['candle'] },
        'price_low_to_high'
      );
      this.assert(Array.isArray(candleProducts) && candleProducts.length > 0, 'Need at least one candle product');
      const candle = candleProducts[0];
      addResult = this.logic.addProductToCart(candle.product_id, 3);
      this.assert(addResult && addResult.success === true, 'Adding candles should succeed');

      // Board games: one for 2-4 players, one for 4-8 players
      let games24 = this.logic.listStoreProducts(
        'games_entertainment',
        null,
        { minPlayers: 2, maxPlayers: 4 },
        'price_low_to_high'
      );
      this.assert(Array.isArray(games24) && games24.length > 0, 'Need at least one 2-4 player game');
      const game24 = games24[0];

      let games48 = this.logic.listStoreProducts(
        'games_entertainment',
        null,
        { minPlayers: 4, maxPlayers: 8 },
        'price_low_to_high'
      );
      this.assert(Array.isArray(games48) && games48.length > 0, 'Need at least one 4-8 player game');
      let game48 = games48[0];

      // Ensure the two games are different; if not, pick another if available
      if (game48.product_id === game24.product_id && games48.length > 1) {
        game48 = games48[1];
      }

      addResult = this.logic.addProductToCart(game24.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding 2-4 player game should succeed');
      addResult = this.logic.addProductToCart(game48.product_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding 4-8 player game should succeed');

      // Verify cart contents
      const cartResponse = this.logic.getCart();
      this.assert(cartResponse && cartResponse.cart, 'Cart should be available');
      const cart = cartResponse.cart;
      this.assert(Array.isArray(cart.items), 'Cart items should be an array');

      // Check quantities by product type
      let firewoodQty = 0;
      let matchesQty = 0;
      let candleQty = 0;
      let gamesCount = 0;
      for (const item of cart.items) {
        const prodDetails = this.logic.getProductDetails(item.product_id);
        if (!prodDetails || !prodDetails.product) continue;
        const type = prodDetails.product.product_type;
        if (type === 'firewood') firewoodQty += item.quantity;
        if (type === 'matches') matchesQty += item.quantity;
        if (type === 'candle') candleQty += item.quantity;
        if (type === 'board_game') gamesCount += item.quantity;
      }
      this.assert(firewoodQty >= 2, 'Cart should contain at least 2 packs of firewood');
      this.assert(matchesQty >= 1, 'Cart should contain at least 1 box of matches');
      this.assert(candleQty >= 3, 'Cart should contain at least 3 candles');
      this.assert(gamesCount >= 2, 'Cart should contain at least 2 board games');

      // Set delivery to chalet on next Saturday and proceed to checkout
      const chalet = this.getAnyActiveChaletFromStorage();
      this.assert(chalet && chalet.id, 'Need an active chalet for delivery');
      const nextSaturday = this.getUpcomingWeekday(6); // 6 = Saturday

      const deliveryResult = this.logic.setCartDeliveryContext(
        'deliver_to_chalet',
        chalet.id,
        nextSaturday
      );
      this.assert(deliveryResult && deliveryResult.success === true, 'Setting delivery to chalet should succeed');

      const orderResult = this.logic.createOrderFromCart();
      this.assert(orderResult && orderResult.success === true, 'Creating order from cart should succeed');
      this.assert(orderResult.order && orderResult.order.id, 'Order with ID should be returned');
      this.assert(
        orderResult.order.delivery_option === 'deliver_to_chalet',
        'Order delivery_option should be deliver_to_chalet'
      );
      this.assert(orderResult.order.chalet_id === chalet.id, 'Order chalet_id should match selected chalet');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 7 ----------
  // Purchase two digital chalet gift vouchers with specific values and a custom message
  testTask7_PurchaseTwoDigitalGiftVouchers() {
    const testName = 'Task 7: Purchase two digital chalet gift vouchers and reach payment page';
    try {
      this.clearCartCompletely();

      // Find digital gift card product
      let giftCardProducts = this.logic.listStoreProducts(
        'gift_cards',
        null,
        { productTypes: ['gift_card'] },
        'price_low_to_high'
      );
      if (!Array.isArray(giftCardProducts) || giftCardProducts.length === 0) {
        // Relax filters if needed
        giftCardProducts = this.logic.listStoreProducts('gift_cards', null, undefined, 'price_low_to_high');
      }
      this.assert(Array.isArray(giftCardProducts) && giftCardProducts.length > 0, 'Need at least one gift card product');
      const giftCard = giftCardProducts[0];

      const message = 'Enjoy a cozy chalet weekend on me!';

      // First card: $100 to friend1
      let addResult = this.logic.addProductToCart(
        giftCard.product_id,
        1,
        undefined,
        undefined,
        {
          amount: 100,
          recipientEmail: 'friend1@example.com',
          message: message
        }
      );
      this.assert(addResult && addResult.success === true, 'Adding $100 gift card should succeed');

      // Second card: $50 to friend2
      addResult = this.logic.addProductToCart(
        giftCard.product_id,
        1,
        undefined,
        undefined,
        {
          amount: 50,
          recipientEmail: 'friend2@example.com',
          message: message
        }
      );
      this.assert(addResult && addResult.success === true, 'Adding $50 gift card should succeed');

      // Verify both gift cards are in cart with correct amounts and message
      const cartResponse = this.logic.getCart();
      this.assert(cartResponse && cartResponse.cart, 'Cart should be available');
      const cart = cartResponse.cart;
      this.assert(Array.isArray(cart.items), 'Cart items should be an array');

      const amounts = [];
      let messagesMatch = true;
      for (const item of cart.items) {
        if (item.is_gift_card) {
          if (typeof item.gift_card_amount === 'number') {
            amounts.push(item.gift_card_amount);
          }
          if (item.gift_card_message !== message) {
            messagesMatch = false;
          }
        }
      }
      this.assert(amounts.indexOf(100) !== -1, 'Cart should contain a $100 gift card based on actual item data');
      this.assert(amounts.indexOf(50) !== -1, 'Cart should contain a $50 gift card based on actual item data');
      this.assert(messagesMatch === true, 'All gift cards should have the specified custom message');

      // Proceed to checkout: create order from cart
      const orderResult = this.logic.createOrderFromCart();
      this.assert(orderResult && orderResult.success === true, 'Creating order from cart should succeed');
      const order = orderResult.order;
      this.assert(order && order.id, 'Order with ID should be created');

      // Set delivery option to digital email
      const updatedDelivery = this.logic.updateOrderDeliveryOptions(
        order.id,
        'digital_email',
        undefined,
        undefined
      );
      this.assert(updatedDelivery && updatedDelivery.success === true, 'Updating order delivery to digital_email should succeed');
      this.assert(
        updatedDelivery.order.delivery_option === 'digital_email',
        'Order delivery_option should be digital_email'
      );

      // Fill purchaser details
      const purchaserName = 'Gift Buyer';
      const purchaserEmail = 'buyer@example.com';
      const updatedPurchaser = this.logic.updateOrderPurchaserDetails(
        order.id,
        purchaserName,
        purchaserEmail,
        {
          line1: '123 Test Street',
          line2: '',
          city: 'Testville',
          region: 'CO',
          postalCode: '12345',
          country: 'USA'
        }
      );
      this.assert(updatedPurchaser && updatedPurchaser.success === true, 'Updating purchaser details should succeed');
      this.assert(
        updatedPurchaser.order.purchaser_email === purchaserEmail,
        'Order purchaser_email should match input email'
      );

      // Reach payment method selection step
      const summary = this.logic.getCheckoutSummary(order.id);
      this.assert(summary && summary.order && summary.order.id === order.id, 'Checkout summary should return the order');

      const paymentMethods = this.logic.getPaymentMethods(order.id);
      this.assert(Array.isArray(paymentMethods) && paymentMethods.length > 0, 'At least one payment method should be available');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 8 ----------
  // Add stay extras to an existing chalet booking while keeping add-ons under $120 per adult (2 adults)
  testTask8_AddStayExtrasWithinBudget() {
    const testName = 'Task 8: Add stay extras under $120 per adult for 2 adults';
    try {
      // Pick a booking with 2 adults if available
      const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      this.assert(Array.isArray(allBookings) && allBookings.length > 0, 'There should be at least one booking in storage');
      let bookingRecord = allBookings.find(b => b.adults_count === 2) || allBookings[0];

      const referenceCode = bookingRecord.reference_code;
      const lastName = bookingRecord.lead_guest_last_name;

      const lookupResult = this.logic.lookupBookingByReference(referenceCode, lastName);
      this.assert(lookupResult && lookupResult.success === true, 'Booking lookup should succeed');
      this.assert(lookupResult.booking_found === true, 'Booking should be found for given reference and last name');

      const booking = lookupResult.booking;
      const bookingId = booking.id;
      this.assert(bookingId, 'Lookup should return a booking ID');

      // Get existing details with extras
      let detailsWithExtras = this.logic.getBookingDetailsWithExtras(bookingId);
      this.assert(detailsWithExtras && detailsWithExtras.booking, 'Booking details with extras should be returned');

      // Ensure stay extras catalog includes airport transfer, breakfast, late checkout
      const availableExtras = this.logic.getAvailableStayExtras(bookingId);
      this.assert(Array.isArray(availableExtras) && availableExtras.length > 0, 'Available stay extras should be returned');

      const hasAirport = availableExtras.some(e => e.extra_type === 'airport_transfer');
      const hasBreakfast = availableExtras.some(e => e.extra_type === 'daily_breakfast');
      const hasLateCheckout = availableExtras.some(e => e.extra_type === 'late_checkout');

      this.assert(hasAirport, 'Airport transfer extra should be available based on data');
      this.assert(hasBreakfast, 'Daily breakfast extra should be available based on data');
      this.assert(hasLateCheckout, 'Late checkout extra should be available based on data');

      // Add extras: round-trip airport transfer for 2, daily breakfast for entire stay for 2, one late checkout
      const budgetPerAdult = 120;
      const targetAdultsForBudget = 2; // per task description
      const budgetTotal = budgetPerAdult * targetAdultsForBudget; // $240

      const checkIn = booking.check_in;
      const checkOut = booking.check_out;

      let updateResult = this.logic.updateBookingExtras(
        bookingId,
        {
          enabled: true,
          direction: 'round_trip',
          passengersCount: 2
        },
        {
          enabled: true,
          guestsCount: 2,
          dateFrom: checkIn,
          dateTo: checkOut
        },
        {
          enabled: true,
          date: checkOut
        }
      );

      this.assert(updateResult && updateResult.success === true, 'Initial extras update should succeed');
      this.assert(Array.isArray(updateResult.extras), 'Extras array should be returned after update');

      // Adjust extras if they exceed budget
      let extrasTotal = updateResult.extras_total;
      // extras_per_adult uses booking.adults_count; for 2-adult booking this aligns with target
      let extrasPerAdult = updateResult.extras_per_adult;

      if (typeof extrasTotal === 'number' && extrasTotal > budgetTotal) {
        // Downgrade airport transfer to one-way
        updateResult = this.logic.updateBookingExtras(
          bookingId,
          {
            enabled: true,
            direction: 'one_way',
            passengersCount: 2
          },
          {
            enabled: true,
            guestsCount: 2,
            dateFrom: checkIn,
            dateTo: checkOut
          },
          {
            enabled: true,
            date: checkOut
          }
        );
        this.assert(updateResult && updateResult.success === true, 'Extras update with one-way transfer should succeed');
        extrasTotal = updateResult.extras_total;
        extrasPerAdult = updateResult.extras_per_adult;
      }

      if (typeof extrasTotal === 'number' && extrasTotal > budgetTotal) {
        // If still over budget, remove late checkout
        updateResult = this.logic.updateBookingExtras(
          bookingId,
          {
            enabled: true,
            direction: 'one_way',
            passengersCount: 2
          },
          {
            enabled: true,
            guestsCount: 2,
            dateFrom: checkIn,
            dateTo: checkOut
          },
          {
            enabled: false
          }
        );
        this.assert(updateResult && updateResult.success === true, 'Extras update after removing late checkout should succeed');
        extrasTotal = updateResult.extras_total;
        extrasPerAdult = updateResult.extras_per_adult;
      }

      if (typeof extrasTotal === 'number' && extrasTotal > budgetTotal) {
        // As a last resort, disable breakfast but keep airport transfer
        updateResult = this.logic.updateBookingExtras(
          bookingId,
          {
            enabled: true,
            direction: 'one_way',
            passengersCount: 2
          },
          {
            enabled: false
          },
          {
            enabled: false
          }
        );
        this.assert(updateResult && updateResult.success === true, 'Final extras update should succeed');
        extrasTotal = updateResult.extras_total;
        extrasPerAdult = updateResult.extras_per_adult;
      }

      if (typeof extrasTotal === 'number') {
        this.assert(extrasTotal <= budgetTotal, 'Extras total should be <= ' + budgetTotal + ', got ' + extrasTotal);
      }
      if (typeof extrasPerAdult === 'number' && booking.adults_count > 0) {
        this.assert(
          extrasPerAdult <= budgetPerAdult,
          'Extras per adult should be <= ' + budgetPerAdult + ', got ' + extrasPerAdult
        );
      }

      // Verify persisted booking details reflect extras
      detailsWithExtras = this.logic.getBookingDetailsWithExtras(bookingId);
      this.assert(detailsWithExtras && typeof detailsWithExtras.extras_total === 'number', 'Booking details with extras should return updated totals');
      if (typeof extrasTotal === 'number') {
        this.assert(
          Math.abs(detailsWithExtras.extras_total - extrasTotal) < 0.0001,
          'Persisted extras_total should match last update result'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
