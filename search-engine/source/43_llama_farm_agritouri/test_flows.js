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
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      addons: [
        {
          id: 'picnic_basket_classic',
          name: 'Classic Picnic Basket',
          description: 'Shared picnic basket with local cheese, fruit, and lemonade for up to 4 guests.',
          price: 15,
          category: 'food',
          is_active: true
        },
        {
          id: 'picnic_basket_deluxe',
          name: 'Deluxe Picnic Basket',
          description: 'Upgraded picnic with gourmet sandwiches, snacks, and sparkling cider for up to 4 guests.',
          price: 24,
          category: 'food',
          is_active: true
        },
        {
          id: 'birthday_cupcake_upgrade',
          name: 'Birthday Cupcake Upgrade',
          description: 'Assorted llama-themed cupcakes for your party guests, includes simple candle display.',
          price: 35,
          category: 'dessert',
          is_active: true
        }
      ],
      gift_card_designs: [
        {
          id: 'llama_confetti',
          name: 'Llama Confetti Celebration',
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/67f74ce7-ff64-5a2e-8ad6-bb38cd76fa22.jpeg',
          theme_tags: ['llama', 'birthday', 'colorful', 'celebration'],
          is_llama_themed: true
        },
        {
          id: 'pasture_sunrise',
          name: 'Pasture Sunrise',
          image_url: 'https://heremag-prod-app-deps-s3heremagassets-bfie27mzpk03.s3.amazonaws.com/wp-content/uploads/2020/07/29164047/2P2A3687.jpg',
          theme_tags: ['farm', 'sunrise', 'relaxing'],
          is_llama_themed: false
        },
        {
          id: 'llama_minimalist',
          name: 'Minimalist Llama Sketch',
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/6494ea2a-79c4-5223-98de-8882951806c2.jpeg',
          theme_tags: ['llama', 'simple', 'modern'],
          is_llama_themed: true
        }
      ],
      gift_card_products: [
        {
          id: 'digital_gift_card',
          name: 'Digital Llama Farm Gift Card',
          type: 'digital',
          description: 'Email-delivered gift card redeemable for tours, workshops, lodging, and the farm shop.',
          min_amount: 25,
          max_amount: 300,
          fixed_amounts: [25, 50, 75, 100, 150, 200],
          currency: 'usd',
          status: 'active',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/b896ea2b-a1ca-5035-a3ef-aa63414f263f.png'
        },
        {
          id: 'physical_gift_card',
          name: 'Physical Llama Farm Gift Card',
          type: 'physical',
          description: 'Printed gift card mailed in a llama-themed envelope, redeemable on-site at the farm.',
          min_amount: 25,
          max_amount: 200,
          fixed_amounts: [25, 50, 75, 100],
          currency: 'usd',
          status: 'active',
          image: 'https://i.ebayimg.com/00/s/MTAwMFg4MTY=/z/Z9IAAOSw-0xYNh6h/$_3.JPG'
        },
        {
          id: 'workshop_only_gift_card',
          name: 'Fiber Workshop Gift Card',
          type: 'digital',
          description: 'Digital gift card intended for use on fiber and spinning workshops.',
          min_amount: 40,
          max_amount: 150,
          fixed_amounts: [50, 75, 100],
          currency: 'usd',
          status: 'active',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/db71791e-8ada-5f02-979b-4a937901e645.jpeg'
        }
      ],
      lodging_properties: [
        {
          id: 'llama_view_cabin',
          name: 'Llama View Cabin',
          slug: 'llama-view-cabin',
          description: 'Cozy one-bedroom cabin overlooking the main llama pasture, perfect for a quiet farm retreat.',
          max_occupancy_adults: 2,
          max_occupancy_children: 2,
          base_nightly_rate: 120,
          default_min_nights: 2,
          default_max_nights: 7,
          has_breakfast_option: true,
          amenities: [
            'pasture_view',
            'queen_bed',
            'private_bathroom',
            'mini_kitchen',
            'fire_pit',
            'wifi'
          ],
          photos: [
            'https://images.unsplash.com/photo-1523419409543-3e4f83b9b4c9?w=800&h=600&fit=crop&auto=format&q=80',
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active'
        },
        {
          id: 'pasture_side_yurt',
          name: 'Pasture-Side Yurt',
          slug: 'pasture-side-yurt',
          description: 'Glamping yurt tucked beside the lower pasture, with easy access to morning llama feedings.',
          max_occupancy_adults: 3,
          max_occupancy_children: 2,
          base_nightly_rate: 95,
          default_min_nights: 1,
          default_max_nights: 5,
          has_breakfast_option: true,
          amenities: [
            'king_bed',
            'sofa_bed',
            'wood_stove',
            'shared_bathhouse',
            'outdoor_seating'
          ],
          photos: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active'
        },
        {
          id: 'farmhouse_suite',
          name: 'Farmhouse Suite',
          slug: 'farmhouse-suite',
          description: 'Upstairs suite in the historic farmhouse with private entrance and porch.',
          max_occupancy_adults: 2,
          max_occupancy_children: 1,
          base_nightly_rate: 135,
          default_min_nights: 1,
          default_max_nights: 10,
          has_breakfast_option: true,
          amenities: ['queen_bed', 'private_bathroom', 'porch', 'wifi', 'coffee_maker'],
          photos: [
            'https://images.unsplash.com/photo-1502674923612-aaa5a3a65c42?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          status: 'active'
        }
      ],
      party_packages: [
        {
          id: 'llama_birthday_party',
          name: 'Llama Birthday Party',
          slug: 'llama-birthday-party',
          type: 'birthday',
          nav_section: 'parties',
          description: 'A 2-hour birthday celebration with a private llama meet-and-greet, photo time, and party space.',
          base_price: 275,
          base_included_children: 10,
          base_included_adults: 4,
          price_per_additional_child: 15,
          price_per_additional_adult: 10,
          duration_minutes: 120,
          supports_indoor_option: true,
          supports_cupcake_upgrade: true,
          supports_educational_focus: false,
          status: 'active'
        },
        {
          id: 'school_field_trip',
          name: 'School Field Trip',
          slug: 'school-field-trip',
          type: 'school_field_trip',
          nav_section: 'schools',
          description: 'Curriculum-aligned field trip with hands-on llama activities and age-appropriate lessons.',
          base_price: 350,
          base_included_children: 25,
          base_included_adults: 4,
          price_per_additional_child: 10,
          price_per_additional_adult: 12,
          duration_minutes: 120,
          supports_indoor_option: true,
          supports_cupcake_upgrade: false,
          supports_educational_focus: true,
          status: 'active'
        },
        {
          id: 'private_pasture_party',
          name: 'Private Pasture Party',
          slug: 'private-pasture-party',
          type: 'private_event',
          nav_section: 'parties',
          description: 'Customizable private event in the upper pasture with flexible layout and add-ons.',
          base_price: 400,
          base_included_children: 0,
          base_included_adults: 15,
          price_per_additional_child: 8,
          price_per_additional_adult: 15,
          duration_minutes: 180,
          supports_indoor_option: false,
          supports_cupcake_upgrade: false,
          supports_educational_focus: false,
          status: 'active'
        }
      ],
      product_categories: [
        {
          id: 'all_products',
          name: 'All Products',
          slug: 'all_products',
          parent_category_id: null,
          display_order: 1,
          is_active: true,
          image: 'https://visitskane.com/sites/default/files/styles/header_top_xx_large/public/media/images/2019-11/Tomatens%20hus-191001_0900_%C2%A9%20Apeloga.jpg?itok=ytaRnJkS'
        },
        {
          id: 'clothing_accessories',
          name: 'Clothing & Accessories',
          slug: 'clothing_accessories',
          parent_category_id: 'all_products',
          display_order: 2,
          is_active: true,
          image: 'https://www.econoco.com/media/catalog/category/GARMENT_RACKS_ACCESSORIES.jpg'
        },
        {
          id: 'socks',
          name: 'Llama Wool Socks',
          slug: 'socks',
          parent_category_id: 'clothing_accessories',
          display_order: 3,
          is_active: true,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/6e727ce5-7913-580b-9a2c-7be84b93d1c7.jpeg'
        }
      ],
      promo_codes: [
        {
          id: 'LLAMA10_workshops',
          code: 'LLAMA10',
          description: '10% off eligible llama fiber and farm workshops.',
          discount_type: 'percent',
          discount_value: 10,
          applicable_entity_type: 'workshop',
          min_cart_total: 0,
          max_uses: 500,
          expires_at: '2026-12-31T23:59:59Z',
          status: 'active'
        },
        {
          id: 'STAY15',
          code: 'STAY15',
          description: '15% off select midweek farm stays.',
          discount_type: 'percent',
          discount_value: 15,
          applicable_entity_type: 'lodging',
          min_cart_total: 200,
          max_uses: 200,
          expires_at: '2026-09-30T23:59:59Z',
          status: 'active'
        },
        {
          id: 'FIBER5',
          code: 'FIBER5',
          description: '$5 off fiber products in the farm shop.',
          discount_type: 'fixed_amount',
          discount_value: 5,
          applicable_entity_type: 'product',
          min_cart_total: 25,
          max_uses: 100,
          expires_at: '2025-12-31T23:59:59Z',
          status: 'inactive'
        }
      ],
      tour_activities: [
        {
          id: 'family_llama_farm_tour',
          name: 'Family Llama Farm Tour',
          slug: 'family-llama-farm-tour',
          description: 'Guided family-friendly tour of the llama barns and pastures, with hands-on feeding time.',
          activity_type: 'tour',
          audience: 'family_friendly',
          duration_minutes: 75,
          base_price_adult: 30,
          base_price_child: 20,
          min_participants: 2,
          max_participants: 12,
          is_featured: true,
          status: 'active'
        },
        {
          id: 'morning_llama_farm_tour',
          name: 'Morning Llama Farm Tour',
          slug: 'morning-llama-farm-tour',
          description: 'Small-group morning tour focused on daily farm chores and llama care.',
          activity_type: 'tour',
          audience: 'all_ages',
          duration_minutes: 60,
          base_price_adult: 28,
          base_price_child: 18,
          min_participants: 1,
          max_participants: 10,
          is_featured: false,
          status: 'active'
        },
        {
          id: 'llama_pasture_walk',
          name: 'Guided Llama Walk',
          slug: 'guided-llama-walk',
          description: 'Leisurely walk through the upper pasture with halter-trained llamas, guided by a handler.',
          activity_type: 'walk',
          audience: 'all_ages',
          duration_minutes: 60,
          base_price_adult: 35,
          base_price_child: 25,
          min_participants: 1,
          max_participants: 8,
          is_featured: true,
          status: 'active'
        }
      ],
      workshops: [
        {
          id: 'beginner_spinning_llama_fiber',
          name: 'Beginner Spinning with Llama Fiber',
          slug: 'beginner-spinning-llama-fiber',
          description: 'Learn the basics of spinning soft llama fiber into yarn using a drop spindle.',
          topic: 'fiber',
          skill_level: 'beginner',
          duration_minutes: 150,
          base_price: 65,
          max_attendees: 8,
          status: 'active'
        },
        {
          id: 'intro_to_llama_fiber',
          name: 'Intro to Llama Fiber',
          slug: 'intro-to-llama-fiber',
          description: 'Overview of llama fiber types, preparation, and simple hands-on carding.',
          topic: 'fiber',
          skill_level: 'beginner',
          duration_minutes: 120,
          base_price: 48,
          max_attendees: 10,
          status: 'active'
        },
        {
          id: 'fiber_art_weekend',
          name: 'Llama Fiber Art Weekend',
          slug: 'llama-fiber-art-weekend',
          description: 'Two-session workshop covering spinning, dyeing, and simple weaving with llama fiber.',
          topic: 'fiber',
          skill_level: 'intermediate',
          duration_minutes: 240,
          base_price: 110,
          max_attendees: 10,
          status: 'active'
        }
      ],
      gift_card_purchases: [
        {
          id: 'gcp_1_jamie_75',
          giftCardProductId: 'digital_gift_card',
          designId: 'llama_confetti',
          amount: 75,
          currency: 'usd',
          recipient_name: 'Jamie Lee',
          recipient_email: 'jamie.lee@example.com',
          sender_name: 'Alex Rivera',
          message: 'Happy birthday! Enjoy a day with llamas on me.',
          delivery_date: '2026-03-15T09:00:00Z',
          created_at: '2026-03-03T10:00:00Z',
          email_sent: false,
          status: 'scheduled'
        },
        {
          id: 'gcp_2_taylor_50',
          giftCardProductId: 'digital_gift_card',
          designId: 'llama_minimalist',
          amount: 50,
          currency: 'usd',
          recipient_name: 'Taylor Morgan',
          recipient_email: 'taylor.morgan@example.com',
          sender_name: 'Jordan Blake',
          message: 'Surprise farm day on me hope you love the llamas!',
          delivery_date: '2026-03-18T12:00:00Z',
          created_at: '2026-03-02T15:30:00Z',
          email_sent: false,
          status: 'scheduled'
        },
        {
          id: 'gcp_3_physical_100',
          giftCardProductId: 'physical_gift_card',
          designId: 'pasture_sunrise',
          amount: 100,
          currency: 'usd',
          recipient_name: 'Sam Patel',
          recipient_email: 'sam.patel@example.com',
          sender_name: 'Casey Nguyen',
          message: 'For your next weekend escape to the llama farm.',
          delivery_date: '2026-03-20T17:00:00Z',
          created_at: '2026-02-28T09:45:00Z',
          email_sent: false,
          status: 'scheduled'
        }
      ],
      group_package_inquiries: [
        {
          id: 'gpi_llama_bday_alex_rivera',
          packageId: 'llama_birthday_party',
          requested_date: '2026-06-13T00:00:00Z',
          visit_start_datetime: '2026-06-13T14:00:00Z',
          visit_end_datetime: '2026-06-13T16:00:00Z',
          num_children: 10,
          num_adults: 2,
          num_students: null,
          num_chaperones: null,
          educational_focus: 'general',
          location_type: 'indoor_friendly',
          include_cupcake_upgrade: true,
          bus_parking_needed: false,
          contact_name: 'Alex Rivera',
          contact_email: 'alex.rivera@example.com',
          contact_phone: '555-123-9876',
          school_name: null,
          message: 'Requesting a llama birthday party for 10 children on Saturday, June 13 with an indoor-friendly option and cupcake upgrade.',
          created_at: '2026-03-02T16:20:00Z',
          status: 'submitted'
        },
        {
          id: 'gpi_school_ft_oak_ridge',
          packageId: 'school_field_trip',
          requested_date: '2026-10-07T00:00:00Z',
          visit_start_datetime: '2026-10-07T09:30:00Z',
          visit_end_datetime: '2026-10-07T11:30:00Z',
          num_children: null,
          num_adults: null,
          num_students: 25,
          num_chaperones: 3,
          educational_focus: 'animal_care',
          location_type: 'indoor_friendly',
          include_cupcake_upgrade: false,
          bus_parking_needed: true,
          contact_name: 'Morgan Davis',
          contact_email: 'm.davis@oakridge.edu',
          contact_phone: '555-789-4321',
          school_name: 'Oak Ridge Elementary',
          message: 'Requesting a 2-hour llama farm field trip focused on animal care for 25 students with 3 chaperones and bus parking.',
          created_at: '2026-02-25T13:05:00Z',
          status: 'submitted'
        },
        {
          id: 'gpi_private_pasture_corporate',
          packageId: 'private_pasture_party',
          requested_date: '2026-05-21T00:00:00Z',
          visit_start_datetime: '2026-05-21T15:00:00Z',
          visit_end_datetime: '2026-05-21T18:00:00Z',
          num_children: 0,
          num_adults: 20,
          num_students: null,
          num_chaperones: null,
          educational_focus: 'farm_life',
          location_type: 'outdoor',
          include_cupcake_upgrade: false,
          bus_parking_needed: false,
          contact_name: 'Dana Cole',
          contact_email: 'dana.cole@example.com',
          contact_phone: '555-456-3322',
          school_name: null,
          message: 'Inquiry for a private pasture party for approximately 20 adults as a team retreat, flexible on activities.',
          created_at: '2026-02-15T10:40:00Z',
          status: 'reviewed'
        }
      ],
      party_package_addons: [
        {
          id: 'ppa_llama_bday_cupcakes',
          partyPackageId: 'llama_birthday_party',
          addonId: 'birthday_cupcake_upgrade',
          is_required: false,
          display_order: 1
        },
        {
          id: 'ppa_llama_bday_indoor_space',
          partyPackageId: 'llama_birthday_party',
          addonId: 'indoor_party_space',
          is_required: false,
          display_order: 2
        },
        {
          id: 'ppa_school_ft_bus_parking',
          partyPackageId: 'school_field_trip',
          addonId: 'bus_parking',
          is_required: false,
          display_order: 1
        }
      ],
      products: [
        {
          id: 'andes_llama_wool_socks_natural',
          categoryId: 'socks',
          name: 'Andes Llama Wool Socks - Natural',
          slug: 'andes-llama-wool-socks-natural',
          description: 'Midweight crew socks knit from natural undyed llama wool for everyday comfort.',
          price: 22,
          currency: 'usd',
          image_urls: [
            'https://images.unsplash.com/photo-1585386959984-a4155223f3f8?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          tags: ['socks', 'llama_wool', 'size_medium', 'size_small', 'size_large', 'natural'],
          status: 'active',
          rating_count: 0,
          average_rating: null
        },
        {
          id: 'trail_trek_llama_socks_gray',
          categoryId: 'socks',
          name: 'Trail Trek Llama Hiking Socks - Gray',
          slug: 'trail-trek-llama-hiking-socks-gray',
          description: 'Cushioned hiking socks with reinforced heel and toe, blended llama wool for moisture control.',
          price: 24,
          currency: 'usd',
          image_urls: [
            'https://images.unsplash.com/photo-1584367369853-8b966cf2237e?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          tags: ['socks', 'llama_wool', 'outdoor', 'size_medium', 'size_large'],
          status: 'active',
          rating_count: 0,
          average_rating: null
        },
        {
          id: 'barn_chill_llama_socks_cream',
          categoryId: 'socks',
          name: 'Barn Chill Llama Lounge Socks - Cream',
          slug: 'barn-chill-llama-lounge-socks-cream',
          description: 'Soft lounge socks with a brushed llama wool interior, ideal for cabin evenings.',
          price: 19,
          currency: 'usd',
          image_urls: [
            'https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          tags: ['socks', 'llama_wool', 'cozy', 'size_medium'],
          status: 'active',
          rating_count: 0,
          average_rating: null
        }
      ],
      rate_plans: [
        {
          id: 'llama_view_cabin_standard',
          lodgingId: 'llama_view_cabin',
          name: 'Standard Cabin Rate',
          code: 'LVC_STD',
          description: 'Room-only rate for the Llama View Cabin.',
          includes_breakfast: false,
          refundable: true,
          pricing_type: 'flat_per_night',
          base_nightly_rate: 120,
          min_nights: 2,
          max_nights: 7,
          status: 'active'
        },
        {
          id: 'llama_view_cabin_bnb',
          lodgingId: 'llama_view_cabin',
          name: 'Cabin + Breakfast',
          code: 'LVC_BB',
          description: 'Includes daily farm-fresh breakfast basket for two delivered to the cabin.',
          includes_breakfast: true,
          refundable: true,
          pricing_type: 'flat_per_night',
          base_nightly_rate: 130,
          min_nights: 2,
          max_nights: 7,
          status: 'active'
        },
        {
          id: 'pasture_yurt_standard',
          lodgingId: 'pasture_side_yurt',
          name: 'Yurt Standard Rate',
          code: 'YURT_STD',
          description: 'Standard glamping rate for the pasture-side yurt.',
          includes_breakfast: false,
          refundable: true,
          pricing_type: 'flat_per_night',
          base_nightly_rate: 95,
          min_nights: 1,
          max_nights: 5,
          status: 'active'
        }
      ],
      tour_activity_addons: [
        {
          id: 'taa_family_tour_picnic_classic',
          tourActivityId: 'family_llama_farm_tour',
          addonId: 'picnic_basket_classic',
          is_required: false,
          display_order: 1
        },
        {
          id: 'taa_family_tour_picnic_deluxe',
          tourActivityId: 'family_llama_farm_tour',
          addonId: 'picnic_basket_deluxe',
          is_required: false,
          display_order: 2
        },
        {
          id: 'taa_morning_tour_picnic_classic',
          tourActivityId: 'morning_llama_farm_tour',
          addonId: 'picnic_basket_classic',
          is_required: false,
          display_order: 1
        }
      ],
      product_variants: [
        {
          id: 'var_andes_s',
          productId: 'andes_llama_wool_socks_natural',
          name: 'Small',
          sku: 'ANDES-NAT-S',
          size: 'small',
          color: 'natural',
          stock_quantity: 18,
          is_default: false,
          image: 'https://images.unsplash.com/photo-1585386959984-a4155223f3f8?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'var_andes_m',
          productId: 'andes_llama_wool_socks_natural',
          name: 'Medium',
          sku: 'ANDES-NAT-M',
          size: 'medium',
          color: 'natural',
          stock_quantity: 32,
          is_default: true,
          image: 'https://images.unsplash.com/photo-1585386959984-a4155223f3f8?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'var_andes_l',
          productId: 'andes_llama_wool_socks_natural',
          name: 'Large',
          sku: 'ANDES-NAT-L',
          size: 'large',
          color: 'natural',
          stock_quantity: 21,
          is_default: false,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/8b5c5419-ce32-573e-aff3-d1ccf23180ed.jpeg'
        }
      ],
      rate_plan_calendar: [
        {
          id: 'rpc_lvc_bb_2026_08_09',
          ratePlanId: 'llama_view_cabin_bnb',
          date: '2026-08-09T00:00:00Z',
          nightly_rate: 130,
          is_available: true
        },
        {
          id: 'rpc_lvc_bb_2026_08_10',
          ratePlanId: 'llama_view_cabin_bnb',
          date: '2026-08-10T00:00:00Z',
          nightly_rate: 130,
          is_available: true
        },
        {
          id: 'rpc_lvc_bb_2026_08_11',
          ratePlanId: 'llama_view_cabin_bnb',
          date: '2026-08-11T00:00:00Z',
          nightly_rate: 130,
          is_available: true
        }
      ],
      workshop_sessions: [
        {
          id: 'wsess_begspin_2026_03_21_am',
          workshopId: 'beginner_spinning_llama_fiber',
          date: '2026-03-21T00:00:00Z',
          start_datetime: '2026-03-21T09:30:00Z',
          end_datetime: '2026-03-21T12:00:00Z',
          capacity_total: 8,
          price: 65,
          status: 'available',
          capacity_remaining: 8.0
        },
        {
          id: 'wsess_begspin_2026_04_18_am',
          workshopId: 'beginner_spinning_llama_fiber',
          date: '2026-04-18T00:00:00Z',
          start_datetime: '2026-04-18T10:00:00Z',
          end_datetime: '2026-04-18T12:30:00Z',
          capacity_total: 8,
          price: 65,
          status: 'available',
          capacity_remaining: 8.0
        },
        {
          id: 'wsess_begspin_2026_05_16_pm',
          workshopId: 'beginner_spinning_llama_fiber',
          date: '2026-05-16T00:00:00Z',
          start_datetime: '2026-05-16T13:30:00Z',
          end_datetime: '2026-05-16T16:00:00Z',
          capacity_total: 8,
          price: 65,
          status: 'sold_out',
          capacity_remaining: 8.0
        }
      ],
      carts: [
        {
          id: 'cart_active_agent',
          created_at: '2026-03-03T10:15:00Z',
          updated_at: '2026-03-03T10:20:00Z',
          currency: 'usd',
          promo_code: 'LLAMA10',
          subtotal: 123.0,
          discount_total: 4.800000000000001,
          total: 118.2
        },
        {
          id: 'cart_previous_stay',
          created_at: '2026-02-10T14:05:00Z',
          updated_at: '2026-02-10T14:45:00Z',
          currency: 'usd',
          promo_code: 'STAY15',
          subtotal: 260.0,
          discount_total: 39.0,
          total: 221.0
        },
        {
          id: 'cart_shop_only',
          created_at: '2026-01-28T09:30:00Z',
          updated_at: '2026-01-28T09:50:00Z',
          currency: 'usd',
          promo_code: null,
          subtotal: 250.0,
          discount_total: 0.0,
          total: 250.0
        }
      ],
      activity_sessions: [
        {
          id: 'asess_family_2026_07_15_0900',
          activityId: 'family_llama_farm_tour',
          date: '2026-07-15T00:00:00Z',
          start_datetime: '2026-07-15T09:00:00Z',
          end_datetime: '2026-07-15T10:15:00Z',
          time_of_day: 'morning',
          capacity_total: 12,
          price_adult: 30,
          price_child: 20,
          is_weekend: true,
          status: 'available',
          capacity_remaining: 12.0
        },
        {
          id: 'asess_family_2026_07_15_1030',
          activityId: 'family_llama_farm_tour',
          date: '2026-07-15T00:00:00Z',
          start_datetime: '2026-07-15T10:30:00Z',
          end_datetime: '2026-07-15T11:45:00Z',
          time_of_day: 'morning',
          capacity_total: 12,
          price_adult: 30,
          price_child: 20,
          is_weekend: true,
          status: 'available',
          capacity_remaining: 12.0
        },
        {
          id: 'asess_family_2026_07_15_1330',
          activityId: 'family_llama_farm_tour',
          date: '2026-07-15T00:00:00Z',
          start_datetime: '2026-07-15T13:30:00Z',
          end_datetime: '2026-07-15T14:45:00Z',
          time_of_day: 'afternoon',
          capacity_total: 12,
          price_adult: 30,
          price_child: 20,
          is_weekend: true,
          status: 'available',
          capacity_remaining: 12.0
        }
      ],
      itineraries: [
        {
          id: 'itinerary_weekend_may_6_7',
          name: '2-Day Llama Weekend (Tours + Fiber)',
          start_date: '2026-05-06T00:00:00Z',
          end_date: '2026-05-07T00:00:00Z',
          status: 'draft',
          created_at: '2026-03-03T10:30:00Z',
          updated_at: '2026-03-03T10:35:00Z',
          total_price: 204.0
        },
        {
          id: 'itinerary_family_july',
          name: 'Family Llama Day Trip',
          start_date: '2026-07-15T00:00:00Z',
          end_date: '2026-07-15T00:00:00Z',
          status: 'saved',
          created_at: '2026-02-20T09:10:00Z',
          updated_at: '2026-02-20T09:25:00Z',
          total_price: 100.0
        },
        {
          id: 'itinerary_school_group_october',
          name: 'October School Visit Plan',
          start_date: '2026-10-07T00:00:00Z',
          end_date: '2026-10-07T00:00:00Z',
          status: 'saved',
          created_at: '2026-02-25T13:10:00Z',
          updated_at: '2026-02-25T13:20:00Z',
          total_price: 0.0
        }
      ],
      cart_items: [
        {
          id: 'ci_cart_active_giftcard_jamie75',
          cartId: 'cart_active_agent',
          item_type: 'gift_card',
          productId: null,
          activitySessionId: null,
          workshopSessionId: null,
          lodgingId: null,
          ratePlanId: null,
          giftCardPurchaseId: 'gcp_1_jamie_75',
          groupPackageInquiryId: null,
          itineraryId: null,
          name: 'Digital Llama Farm Gift Card - $75 for Jamie Lee',
          quantity: 1,
          unit_price: 75,
          total_price: 75,
          participants_adults: null,
          participants_children: null,
          guests_adults: null,
          guests_children: null,
          check_in_date: null,
          check_out_date: null,
          start_datetime: null,
          end_datetime: null,
          promo_code: null,
          discount_amount: 0.0
        },
        {
          id: 'ci_cart_active_intro_fiber_llama10',
          cartId: 'cart_active_agent',
          item_type: 'workshop_session',
          productId: null,
          activitySessionId: null,
          workshopSessionId: 'wsess_intro_2026_03_28_am',
          lodgingId: null,
          ratePlanId: null,
          giftCardPurchaseId: null,
          groupPackageInquiryId: null,
          itineraryId: null,
          name: 'Intro to Llama Fiber - March 28, 2026 9:00 AM',
          quantity: 1,
          unit_price: 48,
          total_price: 48,
          participants_adults: 1,
          participants_children: 0,
          guests_adults: null,
          guests_children: null,
          check_in_date: null,
          check_out_date: null,
          start_datetime: '2026-03-28T09:00:00Z',
          end_datetime: '2026-03-28T11:00:00Z',
          promo_code: 'LLAMA10',
          discount_amount: 4.800000000000001
        },
        {
          id: 'ci_cart_prev_llama_view_cabin_bnb',
          cartId: 'cart_previous_stay',
          item_type: 'lodging_stay',
          productId: null,
          activitySessionId: null,
          workshopSessionId: null,
          lodgingId: 'llama_view_cabin',
          ratePlanId: 'llama_view_cabin_bnb',
          giftCardPurchaseId: null,
          groupPackageInquiryId: null,
          itineraryId: null,
          name: 'Llama View Cabin - Cabin + Breakfast (2 nights)',
          quantity: 1,
          unit_price: 260,
          total_price: 260,
          participants_adults: null,
          participants_children: null,
          guests_adults: 2,
          guests_children: 0,
          check_in_date: '2026-08-10T00:00:00Z',
          check_out_date: '2026-08-12T00:00:00Z',
          start_datetime: null,
          end_datetime: null,
          promo_code: 'STAY15',
          discount_amount: 39.0
        }
      ],
      itinerary_items: [
        {
          id: 'iit_weekend_may_day1_tour',
          itineraryId: 'itinerary_weekend_may_6_7',
          item_type: 'tour_activity_session',
          activitySessionId: 'asess_general_tour_2026_05_06_0900',
          workshopSessionId: null,
          date: '2026-05-06T00:00:00Z',
          start_datetime: '2026-05-06T09:00:00Z',
          end_datetime: '2026-05-06T10:00:00Z',
          participants: 2,
          price_per_person: 27,
          total_price: 54,
          display_order: 1
        },
        {
          id: 'iit_weekend_may_day1_walk',
          itineraryId: 'itinerary_weekend_may_6_7',
          item_type: 'tour_activity_session',
          activitySessionId: 'asess_walk_2026_05_06_1130',
          workshopSessionId: null,
          date: '2026-05-06T00:00:00Z',
          start_datetime: '2026-05-06T11:30:00Z',
          end_datetime: '2026-05-06T12:30:00Z',
          participants: 2,
          price_per_person: 35,
          total_price: 70,
          display_order: 2
        },
        {
          id: 'iit_weekend_may_day2_fiber',
          itineraryId: 'itinerary_weekend_may_6_7',
          item_type: 'workshop_session',
          activitySessionId: null,
          workshopSessionId: 'wsess_sampler_2026_05_07_am',
          date: '2026-05-07T00:00:00Z',
          start_datetime: '2026-05-07T10:30:00Z',
          end_datetime: '2026-05-07T12:00:00Z',
          participants: 2,
          price_per_person: 40,
          total_price: 80,
          display_order: 3
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T04:02:31.880002'
      }
    };

    // Persist to localStorage using storage keys
    function set(key, value) {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }

    set('addons', generatedData.addons);
    set('gift_card_designs', generatedData.gift_card_designs);
    set('gift_card_products', generatedData.gift_card_products);
    set('lodging_properties', generatedData.lodging_properties);
    set('party_packages', generatedData.party_packages);
    set('product_categories', generatedData.product_categories);
    set('promo_codes', generatedData.promo_codes);
    set('tour_activities', generatedData.tour_activities);
    set('workshops', generatedData.workshops);
    set('gift_card_purchases', generatedData.gift_card_purchases);
    set('group_package_inquiries', generatedData.group_package_inquiries);
    set('party_package_addons', generatedData.party_package_addons);
    set('products', generatedData.products);
    set('rate_plans', generatedData.rate_plans);
    set('tour_activity_addons', generatedData.tour_activity_addons);
    set('product_variants', generatedData.product_variants);
    set('rate_plan_calendar', generatedData.rate_plan_calendar);
    set('workshop_sessions', generatedData.workshop_sessions);
    set('carts', generatedData.carts);
    set('activity_sessions', generatedData.activity_sessions);
    set('itineraries', generatedData.itineraries);
    set('cart_items', generatedData.cart_items);
    set('itinerary_items', generatedData.itinerary_items);
    set('_metadata', generatedData._metadata);
  }

  // ------------ Utility helpers ------------

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

  formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Extract 'YYYY-MM-DD' from ISO string like '2026-07-15T00:00:00Z'
  isoDateOnly(isoString) {
    if (!isoString) return null;
    return isoString.substring(0, 10);
  }

  // Get first weekday (Mon-Fri) in a given year/month (month 0-based)
  getFirstWeekdayOfMonth(year, monthIndex) {
    let d = new Date(year, monthIndex, 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // Compute a Saturday in June (2nd Saturday of upcoming or current year)
  getSecondSaturdayOfJune() {
    const now = new Date();
    let year = now.getFullYear();
    // If June this year already passed, use next year
    if (now.getMonth() > 5) {
      year += 1;
    }
    const juneFirst = new Date(year, 5, 1);
    let d = juneFirst;
    // find first Saturday
    while (d.getDay() !== 6) {
      d.setDate(d.getDate() + 1);
    }
    // second Saturday
    d.setDate(d.getDate() + 7);
    return d;
  }

  // ------------ Runner ------------

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_FamilyTourBooking();
    this.testTask2_AddSocksToCart();
    this.testTask3_LlamaBirthdayPartyInquiry();
    this.testTask4_WeekendItineraryToCart();
    this.testTask5_DigitalGiftCardPurchase();
    this.testTask6_WorkshopRegistrationWithPromo();
    this.testTask7_LlamaViewCabinStayUnder300();
    this.testTask8_SchoolFieldTripRequest();

    return this.results;
  }

  // ------------ Task 1 ------------
  // Book a morning family llama farm tour with picnic, total <= $100, at least 3 participants
  testTask1_FamilyTourBooking() {
    const testName = 'Task 1: Book morning Family Llama Farm Tour under $100 with picnic';
    try {
      // 1) Find Family Llama Farm Tour via tours list
      const tours = this.logic.getTourActivitiesList({ activity_types: ['tour'] });
      this.assert(Array.isArray(tours) && tours.length > 0, 'Tours list should not be empty');

      const familyTour = tours.find(function (t) {
        return t.name && t.name.indexOf('Family Llama Farm Tour') !== -1;
      });
      this.assert(familyTour, 'Should find Family Llama Farm Tour in list');

      // 2) Get detail to see add-ons
      const tourDetail = this.logic.getTourActivityDetail(familyTour.activity_id);
      this.assert(tourDetail && tourDetail.activity_id === familyTour.activity_id, 'Tour detail should match selected activity');

      const addons = tourDetail.available_addons || [];
      const picnicAddons = addons.filter(function (a) {
        return a && a.category === 'food';
      });
      this.assert(picnicAddons.length > 0, 'Family tour should have at least one picnic add-on');

      // Choose picnic option with price closest to 15
      let chosenPicnic = picnicAddons[0];
      let targetPrice = 15;
      for (let i = 1; i < picnicAddons.length; i++) {
        const current = picnicAddons[i];
        if (Math.abs(current.price - targetPrice) < Math.abs(chosenPicnic.price - targetPrice)) {
          chosenPicnic = current;
        }
      }
      const picnicAddonId = chosenPicnic.addon_id;
      this.assert(!!picnicAddonId, 'Chosen picnic add-on should have an ID');

      // 3) Find a morning session on a 15th (if available), else any morning
      const rawSessions = JSON.parse(localStorage.getItem('activity_sessions') || '[]');
      const familySessions = rawSessions.filter(function (s) {
        return s.activityId === tourDetail.activity_id && s.status === 'available' && s.time_of_day === 'morning';
      });
      this.assert(familySessions.length > 0, 'There should be at least one available morning session for family tour');

      const sessionsOn15th = familySessions.filter(function (s) {
        // day of month from start_datetime
        const day = parseInt(s.start_datetime.substring(8, 10), 10);
        return day === 15;
      });
      const candidates = sessionsOn15th.length > 0 ? sessionsOn15th : familySessions;

      candidates.sort(function (a, b) {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      });
      const chosenSessionMeta = candidates[0];
      const sessionDateStr = this.isoDateOnly(chosenSessionMeta.date);

      const sessionsForDate = this.logic.getActivitySessionsForDate(tourDetail.activity_id, sessionDateStr);
      this.assert(Array.isArray(sessionsForDate) && sessionsForDate.length > 0, 'API should return sessions for selected date');

      // choose earliest morning session between 09:00 and 11:00 if possible
      const morningSessions = sessionsForDate.filter(function (s) {
        if (s.time_of_day && s.time_of_day !== 'morning') return false;
        const hour = parseInt(s.start_datetime.substring(11, 13), 10);
        return hour >= 9 && hour <= 11;
      });
      this.assert(morningSessions.length > 0, 'There should be at least one morning session between 9:00 and 11:00');

      morningSessions.sort(function (a, b) {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      });
      const chosenSession = morningSessions[0];
      const activitySessionId = chosenSession.activity_session_id;
      this.assert(activitySessionId, 'Chosen session should have an ID');

      // 4) Price with 2 adults + 2 children + picnic; if >100, reduce children by 1 until <=100 with >=3 total participants
      let adults = 2;
      let children = 2;
      let pricing = this.logic.getActivityPricingPreview(activitySessionId, adults, children, [picnicAddonId]);
      this.assert(pricing && typeof pricing.total_price === 'number', 'Pricing preview should return total_price');

      let total = pricing.total_price;
      while (total > 100 && (adults + children) > 3 && children > 0) {
        children -= 1;
        pricing = this.logic.getActivityPricingPreview(activitySessionId, adults, children, [picnicAddonId]);
        total = pricing.total_price;
      }

      // Ensure requirements: total <=100 and at least 3 participants
      this.assert(total <= 100, 'Total price with picnic should be <= 100, got ' + total);
      this.assert(adults + children >= 3, 'Total participants should be at least 3');

      // 5) Add to cart
      const addResult = this.logic.addActivitySessionToCart(activitySessionId, adults, children, [picnicAddonId]);
      this.assert(addResult && addResult.success === true, 'Adding tour session to cart should succeed');
      this.assert(addResult.cart_id, 'addActivitySessionToCart should return cart_id');
      this.assert(addResult.cart_item_id, 'addActivitySessionToCart should return cart_item_id');

      // Check that item total matches last pricing preview
      this.assert(typeof addResult.item_total === 'number', 'Item total should be a number');
      this.assert(addResult.item_total === pricing.total_price, 'Item total should match pricing preview');

      // Verify cart summary uses that cart and includes our booking
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart_id === addResult.cart_id, 'Cart summary should reference the active cart');

      // Verify underlying cart item relationship
      const storedCartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const addedItem = storedCartItems.find(function (ci) {
        return ci.id === addResult.cart_item_id;
      });
      this.assert(addedItem, 'Underlying cart_items should contain the added tour item');
      this.assert(addedItem.activitySessionId === activitySessionId, 'Cart item should reference correct activitySessionId');
      this.assert(addedItem.participants_adults === adults, 'Cart item adult count should match');
      this.assert(addedItem.participants_children === children, 'Cart item child count should match');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 2 ------------
  // Add 3 distinct pairs of llama wool socks (medium, under $25) to the cart
  testTask2_AddSocksToCart() {
    const testName = 'Task 2: Add 3 medium llama wool socks under $25 to cart';
    try {
      // 1) Get socks category via categories API
      const categories = this.logic.getProductCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Product categories should not be empty');
      const socksCategory = categories.find(function (c) {
        return c.slug === 'socks';
      });
      this.assert(socksCategory, 'Should find socks category');

      // 2) Get filter options for socks (we will use price and size; rating data is not populated in generated data)
      const filterOptions = this.logic.getProductFilterOptions('socks');
      this.assert(filterOptions && filterOptions.price_range, 'Should get product filter options');

      // 3) Search products in socks: price <=25, size medium
      const searchFilters = {
        max_price: 25,
        sizes: ['medium']
        // Not applying rating filter because generated products have no ratings yet
      };
      const products = this.logic.searchProducts('socks', null, searchFilters);
      this.assert(Array.isArray(products) && products.length >= 3, 'Should find at least 3 medium socks under $25');

      // 4) For first 3 products, get details, pick medium variant if present, and add quantity 1
      const addedProductIds = [];
      const addedCartItemIds = [];

      for (let i = 0; i < 3; i++) {
        const p = products[i];
        const details = this.logic.getProductDetails(p.product_id);
        this.assert(details && details.product_id === p.product_id, 'Product detail should match search result');

        // Ensure base price <=25
        this.assert(details.price <= 25, 'Product price should be <= 25');

        // Find medium variant if any
        let mediumVariantId = null;
        const variants = details.variants || [];
        for (let j = 0; j < variants.length; j++) {
          if (variants[j].size === 'medium') {
            mediumVariantId = variants[j].variant_id;
            break;
          }
        }

        const addResult = this.logic.addProductToCart(details.product_id, mediumVariantId, 1);
        this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');
        this.assert(addResult.cart_id, 'addProductToCart should return cart_id');
        this.assert(addResult.cart_item_id, 'addProductToCart should return cart_item_id');

        addedProductIds.push(details.product_id);
        addedCartItemIds.push(addResult.cart_item_id);
      }

      // 5) Verify via cart summary and underlying cart_items
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary items should be present');

      const storedCartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const matchedItems = storedCartItems.filter(function (ci) {
        return addedCartItemIds.indexOf(ci.id) !== -1;
      });
      this.assert(matchedItems.length === 3, 'Should have 3 new sock cart items');

      // Ensure distinct products and quantity 1 each
      const uniqueProductIds = {};
      matchedItems.forEach(function (ci) {
        uniqueProductIds[ci.productId] = true;
        if (typeof ci.quantity !== 'undefined') {
          // quantity is stored on CartItem, but even if missing, logic should treat as 1
        }
      });
      const uniqueCount = Object.keys(uniqueProductIds).length;
      this.assert(uniqueCount === 3, 'Three distinct sock products should be added');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 3 ------------
  // Request a llama birthday party package for 10 children on a June Saturday, indoor-friendly with cupcake upgrade
  testTask3_LlamaBirthdayPartyInquiry() {
    const testName = 'Task 3: Llama birthday party inquiry for 10 kids in June';
    try {
      // 1) Get parties overview and select Llama Birthday Party
      const parties = this.logic.getPartyPackagesOverview('parties');
      this.assert(Array.isArray(parties) && parties.length > 0, 'Parties overview should not be empty');

      const birthdayPackage = parties.find(function (p) {
        return p.name && p.name.indexOf('Llama Birthday Party') !== -1;
      });
      this.assert(birthdayPackage, 'Should find Llama Birthday Party package');

      const packageDetail = this.logic.getPartyPackageDetail(birthdayPackage.package_id);
      this.assert(packageDetail && packageDetail.package_id === birthdayPackage.package_id, 'Party package detail should match');
      this.assert(packageDetail.supports_indoor_option === true, 'Birthday package should support indoor option');
      this.assert(packageDetail.supports_cupcake_upgrade === true, 'Birthday package should support cupcake upgrade');

      // 2) Choose a Saturday in June (second Saturday of upcoming June)
      const juneSaturday = this.getSecondSaturdayOfJune();
      const requestedDate = this.formatDate(juneSaturday); // 'YYYY-MM-DD'

      // 3) Submit inquiry
      const contactName = 'Alex Rivera';
      const contactEmail = 'alex.rivera@example.com';
      const contactPhone = '555-123-9876';
      const message = 'Requesting a llama birthday party for 10 children on a June Saturday with indoor-friendly option and cupcake upgrade.';

      const submitResult = this.logic.submitGroupPackageInquiry(
        packageDetail.package_id,
        requestedDate,
        '14:00', // visit_start_time
        '16:00', // visit_end_time
        10, // num_children
        2, // num_adults
        null, // num_students
        null, // num_chaperones
        'general', // educational_focus
        'indoor_friendly', // location_type
        true, // include_cupcake_upgrade
        false, // bus_parking_needed
        null, // school_name
        contactName,
        contactEmail,
        contactPhone,
        message
      );

      this.assert(submitResult && submitResult.success === true, 'submitGroupPackageInquiry should succeed for birthday party');
      this.assert(submitResult.group_package_inquiry_id, 'Inquiry should have an ID');

      // Verify inquiry stored correctly
      const allInquiries = JSON.parse(localStorage.getItem('group_package_inquiries') || '[]');
      const storedInquiry = allInquiries.find(function (g) {
        return g.id === submitResult.group_package_inquiry_id;
      });
      this.assert(storedInquiry, 'Stored group package inquiry should be found');
      this.assert(storedInquiry.packageId === packageDetail.package_id, 'Inquiry should reference birthday package');
      this.assert(storedInquiry.num_children === 10, 'Inquiry should have 10 children');
      this.assert(storedInquiry.num_adults === 2, 'Inquiry should have 2 adults');
      this.assert(storedInquiry.location_type === 'indoor_friendly', 'Inquiry should be indoor-friendly');
      this.assert(storedInquiry.include_cupcake_upgrade === true, 'Inquiry should include cupcake upgrade');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 4 ------------
  // Build a 2-day weekend itinerary with farm tour, llama walk, and fiber workshop, then add itinerary to cart
  // Adapted: use pre-generated weekend itinerary that already includes tour, walk, and fiber workshop
  testTask4_WeekendItineraryToCart() {
    const testName = 'Task 4: Use weekend itinerary (tour + walk + fiber) and add to cart';
    try {
      // 1) Load existing itineraries from storage and pick the 2-day llama weekend
      const itineraries = JSON.parse(localStorage.getItem('itineraries') || '[]');
      this.assert(Array.isArray(itineraries) && itineraries.length > 0, 'There should be some itineraries in storage');

      const weekendItinerary = itineraries.find(function (it) {
        return it.name && it.name.indexOf('2-Day Llama Weekend') !== -1;
      });
      this.assert(weekendItinerary, 'Should find pre-configured 2-Day Llama Weekend itinerary');

      // 2) Get itinerary summary via API
      const summary = this.logic.getItinerarySummary(weekendItinerary.id);
      this.assert(summary && summary.itinerary_id === weekendItinerary.id, 'Itinerary summary should match selected itinerary');
      this.assert(Array.isArray(summary.items) && summary.items.length >= 3, 'Weekend itinerary should have at least 3 items');

      // Ensure it has at least one tour and one workshop and all start before 13:00
      const hasTour = summary.items.some(function (item) {
        return item.item_type === 'tour_activity_session';
      });
      const hasWorkshop = summary.items.some(function (item) {
        return item.item_type === 'workshop_session';
      });
      this.assert(hasTour, 'Itinerary should include at least one tour');
      this.assert(hasWorkshop, 'Itinerary should include at least one workshop');

      summary.items.forEach(function (item) {
        const hour = parseInt(item.start_datetime.substring(11, 13), 10);
        if (!isNaN(hour)) {
          if (hour >= 13) {
            throw new Error('Found itinerary item starting at or after 13:00: ' + item.start_datetime);
          }
        }
      });

      // 3) Add full itinerary to cart
      const addResult = this.logic.addItineraryToCart(summary.itinerary_id);
      this.assert(addResult && addResult.success === true, 'addItineraryToCart should succeed');
      this.assert(addResult.cart_id, 'addItineraryToCart should return cart_id');
      this.assert(addResult.cart_item_id, 'addItineraryToCart should return cart_item_id');

      // Verify itinerary cart item in underlying storage
      const cartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const itineraryCartItem = cartItems.find(function (ci) {
        return ci.id === addResult.cart_item_id;
      });
      this.assert(itineraryCartItem, 'Cart items should include itinerary item');
      this.assert(itineraryCartItem.itineraryId === summary.itinerary_id, 'Cart itineraryId should match summary');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 5 ------------
  // Purchase a $75 digital gift card with llama-themed design and scheduled delivery
  testTask5_DigitalGiftCardPurchase() {
    const testName = 'Task 5: Purchase $75 llama-themed digital gift card with scheduled delivery';
    try {
      // 1) List digital gift card products
      const gcProducts = this.logic.getGiftCardProducts('digital');
      this.assert(Array.isArray(gcProducts) && gcProducts.length > 0, 'Should list digital gift card products');

      // Choose a product that allows $75
      let chosenProduct = null;
      for (let i = 0; i < gcProducts.length; i++) {
        const p = gcProducts[i];
        const withinRange = (!p.min_amount || p.min_amount <= 75) && (!p.max_amount || p.max_amount >= 75);
        const fixedOk = Array.isArray(p.fixed_amounts) ? p.fixed_amounts.indexOf(75) !== -1 : true;
        if (withinRange && fixedOk) {
          chosenProduct = p;
          break;
        }
      }
      this.assert(chosenProduct, 'Should find a digital gift card product that supports $75');

      // 2) Get llama-themed designs
      const llamaDesigns = this.logic.getGiftCardDesigns(true);
      this.assert(Array.isArray(llamaDesigns) && llamaDesigns.length > 0, 'Should list llama-themed gift card designs');
      const chosenDesign = llamaDesigns[0];

      // 3) Delivery date at least 7 days in future
      const now = new Date();
      const deliveryDateObj = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
      const deliveryDateStr = this.formatDate(deliveryDateObj);

      const recipientName = 'Jamie Lee';
      const recipientEmail = 'jamie.lee@example.com';
      const senderName = 'Alex Rivera';
      const message = 'Happy birthday! Enjoy a day with llamas on me.';

      const createResult = this.logic.createGiftCardPurchaseAndAddToCart(
        chosenProduct.id,
        chosenDesign.id,
        75,
        recipientName,
        recipientEmail,
        senderName,
        message,
        deliveryDateStr
      );

      this.assert(createResult && createResult.success === true, 'Gift card purchase should succeed');
      this.assert(createResult.gift_card_purchase_id, 'Should return gift_card_purchase_id');
      this.assert(createResult.cart_id, 'Should return cart_id');

      // Verify stored GiftCardPurchase
      const allPurchases = JSON.parse(localStorage.getItem('gift_card_purchases') || '[]');
      const storedPurchase = allPurchases.find(function (g) {
        return g.id === createResult.gift_card_purchase_id;
      });
      this.assert(storedPurchase, 'Stored gift card purchase should be found');
      this.assert(storedPurchase.amount === 75, 'Gift card amount should be 75');
      this.assert(storedPurchase.recipient_email === recipientEmail, 'Recipient email should match');
      this.assert(this.isoDateOnly(storedPurchase.delivery_date) === deliveryDateStr, 'Delivery date should match requested');

      // Verify cart item links to this gift card purchase
      const cartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const gcCartItem = cartItems.find(function (ci) {
        return ci.giftCardPurchaseId === storedPurchase.id;
      });
      this.assert(gcCartItem, 'Cart should contain an item for the new gift card purchase');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 6 ------------
  // Register one person for a llama fiber workshop under $60 using promo code LLAMA10
  testTask6_WorkshopRegistrationWithPromo() {
    const testName = 'Task 6: Register 1 attendee for fiber workshop under $60 with LLAMA10';
    try {
      // 1) List beginner fiber workshops
      const workshops = this.logic.getWorkshopsList({
        topics: ['fiber'],
        skill_levels: ['beginner'],
        beginner_only: true
      });
      this.assert(Array.isArray(workshops) && workshops.length > 0, 'Should list beginner fiber workshops');

      // 2) For each workshop, get sessions and find earliest available where promo brings total <60
      let chosenWorkshop = null;
      let chosenSession = null;
      let chosenPricing = null;

      for (let i = 0; i < workshops.length; i++) {
        const w = workshops[i];
        const sessions = this.logic.getWorkshopSessions(w.workshop_id);
        const availableSessions = (sessions || []).filter(function (s) {
          return s.status === 'available';
        });
        if (availableSessions.length === 0) continue;

        // sort by date/time
        availableSessions.sort(function (a, b) {
          if (a.start_datetime < b.start_datetime) return -1;
          if (a.start_datetime > b.start_datetime) return 1;
          return 0;
        });

        for (let j = 0; j < availableSessions.length; j++) {
          const session = availableSessions[j];
          const pricing = this.logic.getWorkshopPricingPreview(session.workshop_session_id, 1, 'LLAMA10');
          this.assert(pricing && typeof pricing.total_after_discount === 'number', 'Workshop pricing preview should include total_after_discount');
          if (pricing.promo_valid && pricing.total_after_discount < 60) {
            chosenWorkshop = w;
            chosenSession = session;
            chosenPricing = pricing;
            break;
          }
        }
        if (chosenWorkshop) break;
      }

      this.assert(chosenWorkshop && chosenSession && chosenPricing, 'Should find at least one workshop session < $60 after LLAMA10');

      // 3) Add that workshop session to cart with promo code
      const addResult = this.logic.addWorkshopSessionToCart(chosenSession.workshop_session_id, 1, 'LLAMA10');
      this.assert(addResult && addResult.success === true, 'addWorkshopSessionToCart should succeed');
      this.assert(addResult.cart_id, 'Cart ID should be returned');
      this.assert(addResult.cart_item_id, 'Cart item ID should be returned');
      this.assert(addResult.item_total_after_discount === chosenPricing.total_after_discount, 'Cart item discounted total should match pricing preview');

      // Confirm discount applied and <60
      this.assert(addResult.item_total_after_discount < 60, 'Discounted workshop total should be < $60');
      this.assert(addResult.item_discount_amount > 0, 'Discount amount should be positive');

      // Verify underlying cart item references this workshop session and promo code
      const cartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const workshopCartItem = cartItems.find(function (ci) {
        return ci.id === addResult.cart_item_id;
      });
      this.assert(workshopCartItem, 'Workshop cart item should be stored');
      this.assert(workshopCartItem.workshopSessionId === chosenSession.workshop_session_id, 'Cart item should reference chosen workshop session');
      this.assert(workshopCartItem.promo_code === 'LLAMA10', 'Cart item should record promo code LLAMA10');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 7 ------------
  // Book a 2-night stay in Llama View Cabin with breakfast under $300 before taxes
  testTask7_LlamaViewCabinStayUnder300() {
    const testName = 'Task 7: Book 2-night Llama View Cabin + breakfast under $300';
    try {
      // 1) Find Llama View Cabin via lodging list
      const lodgingList = this.logic.getLodgingList({ requires_breakfast: true, num_adults: 2, num_children: 0 });
      this.assert(Array.isArray(lodgingList) && lodgingList.length > 0, 'Lodging list should not be empty');

      const llamaCabin = lodgingList.find(function (l) {
        return l.name && l.name.indexOf('Llama View Cabin') !== -1;
      });
      this.assert(llamaCabin, 'Should find Llama View Cabin in lodging list');

      const lodgingId = llamaCabin.lodging_id;

      // 2) Use rate plan calendar data to find a 2-night window with breakfast plan and total <=300
      const ratePlans = JSON.parse(localStorage.getItem('rate_plans') || '[]');
      const calendar = JSON.parse(localStorage.getItem('rate_plan_calendar') || '[]');

      const breakfastPlan = ratePlans.find(function (rp) {
        return rp.lodgingId === lodgingId && rp.includes_breakfast === true && rp.status === 'active';
      });
      this.assert(breakfastPlan, 'Should have a breakfast-inclusive rate plan for Llama View Cabin');

      const rpCalendar = calendar.filter(function (c) {
        return c.ratePlanId === breakfastPlan.id && c.is_available;
      });
      this.assert(rpCalendar.length >= 2, 'Rate plan calendar should have at least 2 available nights for breakfast plan');

      // sort by date
      rpCalendar.sort(function (a, b) {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });

      let chosenCheckIn = null;
      let chosenCheckOut = null;

      for (let i = 0; i < rpCalendar.length - 1; i++) {
        const night1 = rpCalendar[i];
        const night2 = rpCalendar[i + 1];
        const date1 = new Date(night1.date);
        const date2 = new Date(night2.date);
        const diffDays = (date2 - date1) / (24 * 60 * 60 * 1000);
        if (diffDays === 1) {
          const totalForTwoNights = night1.nightly_rate + night2.nightly_rate;
          if (totalForTwoNights <= 300) {
            chosenCheckIn = this.isoDateOnly(night1.date);
            // check-out is the day after the second night
            const co = new Date(date2.getTime() + 24 * 60 * 60 * 1000);
            chosenCheckOut = this.formatDate(co);
            break;
          }
        }
      }

      this.assert(chosenCheckIn && chosenCheckOut, 'Should find 2 consecutive available nights with total <= $300');

      // 3) Get rate plans for this stay window via API and pick breakfast-inclusive under $300
      const stayPlans = this.logic.getRatePlansForStay(lodgingId, chosenCheckIn, chosenCheckOut, 2, 0);
      this.assert(Array.isArray(stayPlans) && stayPlans.length > 0, 'getRatePlansForStay should return plans');

      const validBreakfastPlans = stayPlans.filter(function (rp) {
        return rp.includes_breakfast && rp.is_available && rp.total_price_for_stay <= 300;
      });
      this.assert(validBreakfastPlans.length > 0, 'Should have at least one breakfast-inclusive plan under $300');

      // choose cheapest breakfast plan
      validBreakfastPlans.sort(function (a, b) {
        return a.total_price_for_stay - b.total_price_for_stay;
      });
      const chosenPlan = validBreakfastPlans[0];

      // 4) Add stay to cart
      const addResult = this.logic.addLodgingStayToCart(lodgingId, chosenPlan.rate_plan_id, chosenCheckIn, chosenCheckOut, 2, 0);
      this.assert(addResult && addResult.success === true, 'addLodgingStayToCart should succeed');
      this.assert(addResult.cart_id, 'Cart ID should be returned');
      this.assert(addResult.cart_item_id, 'Cart item ID should be returned');
      this.assert(addResult.item_total === chosenPlan.total_price_for_stay, 'Item total should match rate plan total');

      // Verify underlying cart item
      const cartItems = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const stayItem = cartItems.find(function (ci) {
        return ci.id === addResult.cart_item_id;
      });
      this.assert(stayItem, 'Cart items should include new lodging stay');
      this.assert(stayItem.lodgingId === lodgingId, 'Cart item lodgingId should match Llama View Cabin');
      this.assert(this.isoDateOnly(stayItem.check_in_date) === chosenCheckIn, 'Cart item check-in date should match');
      this.assert(this.isoDateOnly(stayItem.check_out_date) === chosenCheckOut, 'Cart item check-out date should match');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }

  // ------------ Task 8 ------------
  // Submit a school field trip request for 25 students on an October weekday with animal care focus and bus parking
  testTask8_SchoolFieldTripRequest() {
    const testName = 'Task 8: School field trip request for 25 students in October weekday';
    try {
      // 1) Get school packages overview and select School Field Trip
      const schoolPackages = this.logic.getPartyPackagesOverview('schools');
      this.assert(Array.isArray(schoolPackages) && schoolPackages.length > 0, 'School packages overview should not be empty');

      const fieldTripPackage = schoolPackages.find(function (p) {
        return p.name && p.name.indexOf('School Field Trip') !== -1;
      });
      this.assert(fieldTripPackage, 'Should find School Field Trip package');

      const packageDetail = this.logic.getPartyPackageDetail(fieldTripPackage.package_id);
      this.assert(packageDetail && packageDetail.package_id === fieldTripPackage.package_id, 'Field trip package detail should match');
      this.assert(packageDetail.supports_educational_focus === true, 'Field trip package should support educational focus');

      // 2) Choose a weekday in October (first weekday)
      const now = new Date();
      let year = now.getFullYear();
      // If October already passed this year, use next year
      if (now.getMonth() > 9) {
        year += 1;
      }
      const octoberWeekday = this.getFirstWeekdayOfMonth(year, 9); // October is month index 9
      const requestedDate = this.formatDate(octoberWeekday);

      const schoolName = 'Oak Ridge Elementary';
      const contactName = 'Morgan Davis';
      const contactEmail = 'm.davis@oakridge.edu';
      const contactPhone = '555-789-4321';
      const message = 'Requesting a 2-hour llama farm field trip focused on animal care for 25 students with 3 chaperones and bus parking.';

      const submitResult = this.logic.submitGroupPackageInquiry(
        packageDetail.package_id,
        requestedDate,
        '09:30', // start
        '11:30', // end
        null, // num_children
        null, // num_adults
        25, // num_students
        3, // num_chaperones
        'animal_care', // educational_focus
        'indoor_friendly', // location_type
        false, // include_cupcake_upgrade
        true, // bus_parking_needed
        schoolName,
        contactName,
        contactEmail,
        contactPhone,
        message
      );

      this.assert(submitResult && submitResult.success === true, 'School field trip inquiry should succeed');
      this.assert(submitResult.group_package_inquiry_id, 'Inquiry ID should be returned');

      // Verify stored inquiry
      const allInquiries = JSON.parse(localStorage.getItem('group_package_inquiries') || '[]');
      const storedInquiry = allInquiries.find(function (g) {
        return g.id === submitResult.group_package_inquiry_id;
      });
      this.assert(storedInquiry, 'Stored school field trip inquiry should be found');
      this.assert(storedInquiry.num_students === 25, 'Inquiry should have 25 students');
      this.assert(storedInquiry.num_chaperones === 3, 'Inquiry should have 3 chaperones');
      this.assert(storedInquiry.educational_focus === 'animal_care', 'Educational focus should be animal_care');
      this.assert(storedInquiry.bus_parking_needed === true, 'Bus parking should be needed');
      this.assert(storedInquiry.school_name === schoolName, 'School name should match');

      this.recordSuccess(testName);
    } catch (e) {
      this.recordFailure(testName, e);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
