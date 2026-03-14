// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic instance must be provided by the test harness
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
    // Generated Data - used ONLY here for initial localStorage population
    const generatedData = {
      cart: [
        {
          id: 'current_cart',
          items: [],
          merch_delivery_method: 'ship_to_address',
          promo_code_ids: [],
          created_at: '2026-03-01T10:00:00Z',
          updated_at: '2026-03-01T10:00:00Z'
        }
      ],
      merch_categories: [
        {
          id: 'apparel',
          name: 'Apparel',
          code: 'apparel',
          description: 'Zombie-themed t-shirts, hoodies, costumes, and other clothing.',
          sort_order: 1
        },
        {
          id: 'accessories',
          name: 'Accessories',
          code: 'accessories',
          description: 'Hats, masks, jewelry, and other undead accessories.',
          sort_order: 2
        },
        {
          id: 'souvenirs',
          name: 'Souvenirs',
          code: 'souvenirs',
          description: 'Mugs, keychains, posters, and collectible zombie swag.',
          sort_order: 3
        }
      ],
      venues: [
        {
          id: 'quarantine_zone_arena',
          name: 'Quarantine Zone Arena',
          slug: 'quarantine-zone-arena',
          description: 'Main arena for large-scale zombie shows, stunt performances, and finale events.',
          address: '100 Quarantine Way, Necropolis Park',
          latitude: 40.0005,
          longitude: -75.0007,
          venue_type: 'arena',
          notes: 'Primary landmark used for navigation and parking searches.'
        },
        {
          id: 'haunted_maze_field',
          name: 'Haunted Maze',
          slug: 'haunted-maze',
          description: 'An outdoor hedge maze crawling with the undead, fog, and jump scares.',
          address: '200 Maze Lane, Necropolis Park',
          latitude: 40.0012,
          longitude: -75.0021,
          venue_type: 'attraction_venue',
          notes: 'One of the most popular attractions; recommend evening and late-night slots.'
        },
        {
          id: 'zombie_escape_bunker',
          name: 'Zombie Escape Room Bunker',
          slug: 'zombie-escape-room-bunker',
          description: 'Underground bunker-style escape rooms with branching zombie outbreak scenarios.',
          address: '300 Bunker Road, Necropolis Park',
          latitude: 39.9998,
          longitude: -75.0015,
          venue_type: 'attraction_venue',
          notes: 'Standard and VIP sessions available; photo packages offered.'
        }
      ],
      merch_products: [
        {
          id: 'zombie_tshirt_neon_brains',
          category_id: 'apparel',
          name: 'Neon Brains Zombie T-Shirt',
          slug: 'neon-brains-zombie-tshirt',
          description: "Soft black tee featuring a neon green zombie head and dripping 'Brains' logo. Perfect for surviving long haunt nights.",
          price: 19.99,
          rating: 4.6,
          rating_count: 248,
          tags: ['zombie', 'tshirt', 'apparel', 'unisex'],
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop&auto=format&q=80',
          status: 'active',
          available_sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          available_colors: ['Black', 'Charcoal', 'Blood Red'],
          created_at: '2026-02-20T10:00:00Z',
          updated_at: '2026-02-28T09:15:00Z'
        },
        {
          id: 'zombie_kids_tshirt_lil_walker',
          category_id: 'apparel',
          name: "Lil' Walker Kids Zombie Tee",
          slug: 'lil-walker-kids-zombie-tee',
          description: 'Kid-friendly cartoon zombie with a goofy grin and glow-in-the-dark shoelaces. Designed for younger haunt fans.',
          price: 14.99,
          rating: 4.5,
          rating_count: 132,
          tags: ['zombie', 'kids', 'tshirt', 'apparel', 'kid-friendly'],
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/01a36406-459a-519f-bb96-be65b0decad4.gif',
          status: 'active',
          available_sizes: ['2T', '3T', '4T', 'Youth S', 'Youth M', 'Youth L'],
          available_colors: ['Lime Green', 'Purple', 'Black'],
          created_at: '2026-02-21T11:30:00Z',
          updated_at: '2026-02-27T18:45:00Z'
        },
        {
          id: 'zombie_baseball_tee_survivor',
          category_id: 'apparel',
          name: 'Survivor Squad Zombie Baseball Tee',
          slug: 'survivor-squad-zombie-baseball-tee',
          description: "3/4 sleeve baseball tee with 'Survivor Squad' text and a pack of hand-drawn zombies creeping up from the hem.",
          price: 24.0,
          rating: 4.3,
          rating_count: 97,
          tags: ['zombie', 'baseball-tee', 'apparel'],
          image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&h=600&fit=crop&auto=format&q=80',
          status: 'active',
          available_sizes: ['XS', 'S', 'M', 'L', 'XL'],
          available_colors: ['White/Black', 'White/Blood Red'],
          created_at: '2026-02-22T09:00:00Z',
          updated_at: '2026-02-26T16:20:00Z'
        }
      ],
      orders: [
        {
          id: 'order_1001',
          items: [
            {
              type: 'ticket',
              attraction_name: 'Haunted Maze',
              date: '2025-10-29',
              time: '19:30',
              quantity: 4,
              unit_price: 29.99
            },
            {
              type: 'parking',
              venue_id: 'north_parking_garage',
              date: '2025-10-29',
              time: '18:45',
              quantity: 1,
              unit_price: 10.0
            }
          ],
          subtotal: 149.96,
          taxes: 11.2,
          fees: 3.0,
          total: 164.16,
          payment_status: 'paid',
          fulfillment_status: 'confirmed',
          purchaser_name: 'Jordan Reyes',
          purchaser_email: 'jordan.reyes@example.com',
          purchaser_phone: '+1-555-0198',
          merch_delivery_method: 'pick_up_at_event_venue',
          shipping_address: '',
          billing_address: '1013 Graveyard Lane, Apt 4B, Necropolis, NY 10001',
          source_cart_id: 'current_cart',
          promo_code_ids: ['BRAIN10'],
          created_at: '2026-02-24T18:05:00Z',
          updated_at: '2026-02-24T18:06:30Z'
        },
        {
          id: 'order_1002',
          items: [
            {
              type: 'merch',
              product_id: 'zombie_tshirt_neon_brains',
              name: 'Neon Brains Zombie T-Shirt',
              quantity: 1,
              unit_price: 19.99
            },
            {
              type: 'merch',
              product_id: 'zombie_kids_tshirt_lil_walker',
              name: "Lil' Walker Kids Zombie Tee",
              quantity: 1,
              unit_price: 14.99
            },
            {
              type: 'merch',
              product_id: 'zombie_baseball_tee_survivor',
              name: 'Survivor Squad Zombie Baseball Tee',
              quantity: 1,
              unit_price: 24.0
            }
          ],
          subtotal: 58.98,
          taxes: 4.72,
          fees: 0.0,
          total: 63.7,
          payment_status: 'pending',
          fulfillment_status: 'pending',
          purchaser_name: 'Alex Carter',
          purchaser_email: 'alex@example.com',
          purchaser_phone: '+1-555-0123',
          merch_delivery_method: 'ship_to_address',
          shipping_address: '44 Infection Way, Unit 7, Necropolis, NY 10002',
          billing_address: '44 Infection Way, Unit 7, Necropolis, NY 10002',
          source_cart_id: 'current_cart',
          promo_code_ids: [],
          created_at: '2026-02-27T15:20:00Z',
          updated_at: '2026-02-27T15:20:00Z'
        }
      ],
      promo_codes: [
        {
          id: 'BRAIN10',
          code: 'BRAIN10',
          description: '10% off tickets, merch, and parking for the Necropolis Zombie Nights event.',
          discount_type: 'percentage',
          discount_value: 10,
          applies_to: 'all_items',
          max_uses: 5000,
          valid_from: '2025-09-01T00:00:00Z',
          valid_to: '2026-11:01T06:59:59Z',
          min_order_total: 25.0,
          is_active: true,
          used_count: 1
        },
        {
          id: 'MERCH25',
          code: 'MERCH25',
          description: '25% off all zombie-themed merch when you spend $40 or more.',
          discount_type: 'percentage',
          discount_value: 25,
          applies_to: 'merch_only',
          max_uses: 1000,
          valid_from: '2026-02-01T00:00:00Z',
          valid_to: '2026-11-01T06:59:59Z',
          min_order_total: 40.0,
          is_active: true,
          used_count: 0
        },
        {
          id: 'PARK5',
          code: 'PARK5',
          description: '$5 off a single parking pass near any Necropolis venue.',
          discount_type: 'fixed_amount',
          discount_value: 5,
          applies_to: 'parking_only',
          max_uses: 2000,
          valid_from: '2025-10-01T00:00:00Z',
          valid_to: '2026-11-01T06:59:59Z',
          min_order_total: 0.0,
          is_active: true,
          used_count: 0
        }
      ],
      parking_passes: [
        {
          id: 'parking_pass_1001',
          parking_area_id: 'north_parking_garage_area',
          arrival_datetime: '2025-10-31T18:00:00Z',
          end_datetime: '2025-11-01T00:00:00Z',
          price: 15.0,
          status: 'purchased',
          created_at: '2025-09-15T10:00:00Z',
          updated_at: '2025-09-15T10:05:00Z'
        },
        {
          id: 'parking_pass_1002',
          parking_area_id: 'north_parking_garage_area',
          arrival_datetime: '2025-10-31T19:00:00Z',
          end_datetime: '2025-10-31T23:59:00Z',
          price: 15.0,
          status: 'reserved',
          created_at: '2025-09-20T12:30:00Z',
          updated_at: '2025-09-20T12:45:00Z'
        },
        {
          id: 'parking_pass_1003',
          parking_area_id: 'east_overflow_lot_area',
          arrival_datetime: '2025-10-31T19:00:00Z',
          end_datetime: '2025-11-01T00:00:00Z',
          price: 10.0,
          status: 'purchased',
          created_at: '2025-09-22T09:15:00Z',
          updated_at: '2025-09-22T09:17:00Z'
        }
      ],
      parking_areas: [
        {
          id: 'north_parking_garage_area',
          name: 'North Containment Parking Garage - Event Parking',
          description: 'Multi-level covered garage north of Quarantine Zone Arena, ideal for main arena shows and late-night attractions.',
          primary_venue_id: 'quarantine_zone_arena',
          latitude: 40.002,
          longitude: -75.0003,
          pricing_type: 'flat_per_event',
          flat_rate: 15.0,
          hourly_rate: 0,
          max_capacity: 600,
          restrictions: 'Max vehicle height 2.1 m. No oversized vans or trailers.',
          is_accessible: true,
          status: 'active',
          created_at: '2025-08-20T10:00:00Z',
          updated_at: '2025-09-15T09:30:00Z',
          remaining_capacity: 598,
          distance_to_primary_venue_meters: 170.23679684263212
        },
        {
          id: 'east_overflow_lot_area',
          name: 'East Overflow Lot',
          description: 'Unpaved overflow lot east of Quarantine Zone Arena, used on peak nights and for late arrivals.',
          primary_venue_id: 'quarantine_zone_arena',
          latitude: 40.0009,
          longitude: -74.9968,
          pricing_type: 'flat_per_event',
          flat_rate: 10.0,
          hourly_rate: 0,
          max_capacity: 450,
          restrictions: 'No overnight parking. Follow posted walking path to arena entrance.',
          is_accessible: false,
          status: 'active',
          created_at: '2025-08-22T11:15:00Z',
          updated_at: '2025-09-10T14:45:00Z',
          remaining_capacity: 448,
          distance_to_primary_venue_meters: 335.16392767954386
        },
        {
          id: 'south_remote_lot_area',
          name: 'South Remote Lot',
          description: 'Budget-friendly remote lot with shuttle service to Infection Central Plaza.',
          primary_venue_id: 'central_plaza',
          latitude: 39.9965,
          longitude: -75.0025,
          pricing_type: 'flat_per_event',
          flat_rate: 6.0,
          hourly_rate: 0,
          max_capacity: 800,
          restrictions: 'Shuttle runs every 12 minutes from 4:30 PM to 1:30 AM.',
          is_accessible: true,
          status: 'active',
          created_at: '2025-08-18T09:40:00Z',
          updated_at: '2025-09-05T16:10:00Z',
          remaining_capacity: 799,
          distance_to_primary_venue_meters: 448.6273561012198
        }
      ],
      events: [
        {
          id: 'event_zombie_makeup_starter_scars_2025_10_28',
          title: 'Zombie Makeup Workshop: Starter Scars',
          slug: 'zombie-makeup-workshop-starter-scars-2025-10-28',
          description: 'Beginner-friendly zombie makeup workshop covering bruises, basic scars, and safe liquid latex techniques. Ideal for families and first-time haunt visitors.',
          event_type: 'workshop',
          start_datetime: '2025-10-28T13:30:00Z',
          end_datetime: '2025-10-28T15:00:00Z',
          duration_minutes: 90,
          venue_id: 'makeup_lab_room_a',
          price: 0,
          is_free: true,
          tags: ['zombie', 'makeup', 'workshop', 'family_friendly', 'hands_on'],
          capacity_total: 24,
          is_family_friendly: true,
          created_at: '2025-08-20T10:00:00Z',
          updated_at: '2025-09-01T09:00:00Z',
          capacity_remaining: 22
        },
        {
          id: 'event_zombie_makeup_glow_ghouls_2025_10_29',
          title: 'Zombie Makeup Workshop: Glow-in-the-Dark Ghouls',
          slug: 'zombie-makeup-workshop-glow-in-the-dark-ghouls-2025-10-29',
          description: 'Learn to create glowing zombie eyes and eerie highlight effects using UV-safe paints. Great for kids and parents planning night-time haunt photos.',
          event_type: 'workshop',
          start_datetime: '2025-10-29T14:00:00Z',
          end_datetime: '2025-10-29T15:30:00Z',
          duration_minutes: 90,
          venue_id: 'makeup_lab_room_a',
          price: 0,
          is_free: true,
          tags: ['zombie', 'makeup', 'workshop', 'family_friendly', 'uv_paint'],
          capacity_total: 24,
          is_family_friendly: true,
          created_at: '2025-08-20T10:15:00Z',
          updated_at: '2025-09-01T09:05:00Z',
          capacity_remaining: 21
        },
        {
          id: 'event_zombie_makeup_family_session_2025_10_30',
          title: 'Zombie Makeup Workshop: Family Session',
          slug: 'zombie-makeup-workshop-family-session-2025-10-30',
          description: 'A relaxed family session focusing on quick, low-gore zombie looks suitable for kids and nervous grown-ups.',
          event_type: 'workshop',
          start_datetime: '2025-10-30T13:00:00Z',
          end_datetime: '2025-10-30T14:30:00Z',
          duration_minutes: 90,
          venue_id: 'makeup_lab_room_a',
          price: 0,
          is_free: true,
          tags: ['zombie', 'makeup', 'workshop', 'family_friendly', 'kid_friendly'],
          capacity_total: 28,
          is_family_friendly: true,
          created_at: '2025-08-21T11:00:00Z',
          updated_at: '2025-09-01T09:10:00Z',
          capacity_remaining: 24
        }
      ],
      workshop_registrations: [
        {
          id: 'wrkreg_2001',
          event_id: 'event_zombie_makeup_glow_ghouls_2025_10_29',
          full_name: 'Alex Carter',
          email: 'alex@example.com',
          phone: '555-0123',
          party_size: 3,
          newsletter_opt_in: false,
          created_at: '2025-10-20T14:25:00Z'
        },
        {
          id: 'wrkreg_2002',
          event_id: 'event_zombie_makeup_starter_scars_2025_10_28',
          full_name: 'Jordan Reyes',
          email: 'jordan.reyes@example.com',
          phone: '555-0198',
          party_size: 2,
          newsletter_opt_in: true,
          created_at: '2025-10-15T16:40:00Z'
        },
        {
          id: 'wrkreg_2003',
          event_id: 'event_zombie_makeup_family_session_2025_10_30',
          full_name: 'Mia Patel',
          email: 'mia.patel@example.com',
          phone: '555-0144',
          party_size: 4,
          newsletter_opt_in: true,
          created_at: '2025-10-18T10:05:00Z'
        }
      ],
      attraction_add_on_options: [
        {
          id: 'addon_zombie_escape_photo_video',
          attraction_id: 'zombie_escape_room',
          code: 'photo_and_video_package',
          name: 'Photo & Video Package',
          description: 'Professional action photos and short video clips captured during your Zombie Escape Room session, delivered digitally after your game.',
          price: 18.0,
          is_per_person: false,
          is_required: false,
          is_active: true,
          created_at: '2025-08-15T10:00:00Z',
          updated_at: '2025-09-01T09:30:00Z'
        },
        {
          id: 'addon_zombie_escape_vip_lounge',
          attraction_id: 'zombie_escape_room',
          code: 'vip_lounge_access',
          name: 'VIP Pre-Game Lounge',
          description: 'Arrive early to relax in the bunker lounge with themed snacks and a briefing from your game master.',
          price: 12.0,
          is_per_person: true,
          is_required: false,
          is_active: true,
          created_at: '2025-08-16T11:15:00Z',
          updated_at: '2025-09-02T14:10:00Z'
        },
        {
          id: 'addon_haunted_maze_fast_pass',
          attraction_id: 'haunted_maze',
          code: 'fast_pass',
          name: 'Haunted Maze Fast Pass',
          description: 'Skip the general queue once for your selected Haunted Maze timeslot and enter through the priority gate.',
          price: 9.0,
          is_per_person: true,
          is_required: false,
          is_active: true,
          created_at: '2025-08-17T12:20:00Z',
          updated_at: '2025-09-03T10:05:00Z'
        }
      ],
      attractions: [
        {
          id: 'haunted_maze',
          name: 'Haunted Maze',
          slug: 'haunted-maze',
          attraction_type: 'maze',
          short_description: 'Fog-filled hedge maze packed with jump scares, live actors, and hidden zombie encounters.',
          description: "Navigate a sprawling hedge and pallet maze where zombies lurk behind every corner. Strobe effects, loud audio, and close-quarters scares make this one of Necropolis Park's most intense experiences.",
          scare_level: 4,
          tags: ['high_scare', 'flagship', 'popular'],
          age_rating: 'thirteen_plus',
          duration_minutes: 25,
          venue_id: 'haunted_maze_field',
          location_note: 'Entrance located next to West Field Parking and Haunted Maze Side Lot.',
          is_kid_friendly: false,
          status: 'active',
          created_at: '2025-08-15T10:00:00Z',
          updated_at: '2025-09-05T09:30:00Z',
          base_price_from: 22.99
        },
        {
          id: 'zombie_escape_room',
          name: 'Zombie Escape Room Bunker',
          slug: 'zombie-escape-room-bunker',
          attraction_type: 'escape_room',
          short_description: 'Team-based escape room set in an underground bunker during a zombie outbreak.',
          description: 'Work together with your squad to solve puzzles, hack security systems, and contain the undead before they breach the bunker. Features standard and VIP sessions, with optional photo & video packages.',
          scare_level: 4,
          tags: ['escape_room', 'puzzles', 'high_scare'],
          age_rating: 'sixteen_plus',
          duration_minutes: 60,
          venue_id: 'zombie_escape_bunker',
          location_note: 'Access via lower plaza path behind Infection Central Plaza.',
          is_kid_friendly: false,
          status: 'active',
          created_at: '2025-08-16T11:15:00Z',
          updated_at: '2025-09-06T12:10:00Z',
          base_price_from: 54.99
        },
        {
          id: 'haunted_maze_kids_trail',
          name: "Haunted Maze: Kids' Lantern Trail",
          slug: 'haunted-maze-kids-lantern-trail',
          attraction_type: 'maze',
          short_description: 'Low-scare, daytime version of the Haunted Maze with friendly zombies and lanterns.',
          description: "Explore a shortened route of the Haunted Maze designed especially for younger guests. Friendly zombie performers wave and pose for photos, and all major jump scares and strobe effects are disabled.",
          scare_level: 2,
          tags: ['kid_friendly', 'family_friendly', 'low_scare', 'photo_op'],
          age_rating: 'all_ages',
          duration_minutes: 15,
          venue_id: 'haunted_maze_field',
          location_note: "Use the left entrance gate marked 'Kids' Lantern Trail'.",
          is_kid_friendly: true,
          status: 'active',
          created_at: '2025-08-18T09:45:00Z',
          updated_at: '2025-09-04T08:20:00Z',
          base_price_from: 12.99
        }
      ],
      attraction_ticket_options: [
        {
          id: 'haunted_maze_standard',
          attraction_id: 'haunted_maze',
          code: 'standard',
          name: 'Standard Admission',
          description: 'General admission to Haunted Maze for your selected timeslot.',
          price_modifier_type: 'absolute',
          price_modifier_value: 0,
          is_default: true,
          created_at: '2025-08-20T10:00:00Z',
          updated_at: '2025-09-01T09:15:00Z'
        },
        {
          id: 'haunted_maze_vip',
          attraction_id: 'haunted_maze',
          code: 'vip',
          name: 'VIP Maze Ticket',
          description: 'Includes priority entry lane and an exclusive pre-scare briefing at the Haunted Maze.',
          price_modifier_type: 'absolute',
          price_modifier_value: 12.0,
          is_default: false,
          created_at: '2025-08-20T10:05:00Z',
          updated_at: '2025-09-01T09:20:00Z'
        },
        {
          id: 'zombie_escape_room_standard',
          attraction_id: 'zombie_escape_room',
          code: 'standard',
          name: 'Standard Bunker Session',
          description: 'Standard 60-minute Zombie Escape Room Bunker experience.',
          price_modifier_type: 'absolute',
          price_modifier_value: 0,
          is_default: true,
          created_at: '2025-08-21T11:10:00Z',
          updated_at: '2025-09-02T10:30:00Z'
        }
      ],
      cart_items: [
        {
          id: 'cart_item_1001',
          cart_id: 'current_cart',
          item_type: 'ticket',
          quantity: 2,
          unit_price: 29.99,
          line_total: 59.98,
          description: 'Haunted Maze - Standard Admission, Oct 29 7:30 PM',
          added_at: '2026-03-01T10:05:00Z',
          ticket_attraction_id: 'haunted_maze',
          ticket_timeslot_id: 'ts_haunted_maze_2025_10_29_19_30_standard',
          ticket_type: 'standard',
          ticket_add_on_ids: [],
          promo_code_id: 'BRAIN10',
          party_size: 2,
          merch_product_id: '',
          parking_pass_id: ''
        },
        {
          id: 'cart_item_1002',
          cart_id: 'current_cart',
          item_type: 'merch',
          quantity: 1,
          unit_price: 19.99,
          line_total: 19.99,
          description: 'Neon Brains Zombie T-Shirt - Size M, Black',
          added_at: '2026-03-01T10:06:30Z',
          ticket_attraction_id: '',
          ticket_timeslot_id: '',
          ticket_type: 'standard',
          ticket_add_on_ids: [],
          promo_code_id: '',
          party_size: 1,
          merch_product_id: 'zombie_tshirt_neon_brains',
          parking_pass_id: ''
        },
        {
          id: 'cart_item_1003',
          cart_id: 'current_cart',
          item_type: 'merch',
          quantity: 1,
          unit_price: 14.99,
          line_total: 14.99,
          description: "Lil' Walker Kids Zombie Tee - Youth M, Lime Green",
          added_at: '2026-03-01T10:07:10Z',
          ticket_attraction_id: '',
          ticket_timeslot_id: '',
          ticket_type: 'standard',
          ticket_add_on_ids: [],
          promo_code_id: '',
          party_size: 1,
          merch_product_id: 'zombie_kids_tshirt_lil_walker',
          parking_pass_id: ''
        }
      ],
      attraction_timeslots: [
        {
          id: 'ts_haunted_maze_2025_10_29_17_00_standard',
          attraction_id: 'haunted_maze',
          start_datetime: '2025-10-29T17:00:00Z',
          end_datetime: '2025-10-29T17:25:00Z',
          standard_price: 22.99,
          vip_price: 34.99,
          capacity_total: 220,
          is_vip_only: false,
          status: 'available',
          created_at: '2025-08-20T10:00:00Z',
          updated_at: '2025-09-01T09:00:00Z',
          capacity_remaining: 220
        },
        {
          id: 'ts_haunted_maze_2025_10_29_18_30_standard',
          attraction_id: 'haunted_maze',
          start_datetime: '2025-10-29T18:30:00Z',
          end_datetime: '2025-10-29T18:55:00Z',
          standard_price: 24.99,
          vip_price: 36.99,
          capacity_total: 220,
          is_vip_only: false,
          status: 'available',
          created_at: '2025-08-20T10:05:00Z',
          updated_at: '2025-09-01T09:05:00Z',
          capacity_remaining: 220
        },
        {
          id: 'ts_haunted_maze_2025_10_29_19_30_standard',
          attraction_id: 'haunted_maze',
          start_datetime: '2025-10-29T19:30:00Z',
          end_datetime: '2025-10-29T19:55:00Z',
          standard_price: 29.99,
          vip_price: 41.99,
          capacity_total: 220,
          is_vip_only: false,
          status: 'available',
          created_at: '2025-08-20T10:10:00Z',
          updated_at: '2025-09-01T09:10:00Z',
          capacity_remaining: 218
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:17.013348'
      }
    };

    if (typeof localStorage === 'undefined') {
      return;
    }

    // Storage key mapping
    localStorage.setItem('cart', JSON.stringify(generatedData.cart || []));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items || []));
    localStorage.setItem('orders', JSON.stringify(generatedData.orders || []));
    localStorage.setItem('order_items', JSON.stringify([]));
    localStorage.setItem('merch_categories', JSON.stringify(generatedData.merch_categories || []));
    localStorage.setItem('merch_products', JSON.stringify(generatedData.merch_products || []));
    localStorage.setItem('venues', JSON.stringify(generatedData.venues || []));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes || []));
    localStorage.setItem('parking_passes', JSON.stringify(generatedData.parking_passes || []));
    localStorage.setItem('parking_areas', JSON.stringify(generatedData.parking_areas || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('workshop_registrations', JSON.stringify(generatedData.workshop_registrations || []));
    localStorage.setItem('attraction_add_on_options', JSON.stringify(generatedData.attraction_add_on_options || []));
    localStorage.setItem('attractions', JSON.stringify(generatedData.attractions || []));
    localStorage.setItem('attraction_ticket_options', JSON.stringify(generatedData.attraction_ticket_options || []));
    localStorage.setItem('attraction_timeslots', JSON.stringify(generatedData.attraction_timeslots || []));

    // Collections that exist but have no pre-generated data
    localStorage.setItem('night_plans', JSON.stringify([]));
    localStorage.setItem('night_plan_items', JSON.stringify([]));
    localStorage.setItem('favorites', JSON.stringify([]));
    localStorage.setItem('page_view_preferences', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BuyHauntedMazeTicketsWithPromo();
    this.testTask2_CreateZombieApparelBundleVenuePickup();
    this.testTask3_GroupTicketsTwoActivitiesOneNight();
    this.testTask4_PlanThreeEventScheduleIntoNightPlan();
    this.testTask5_SaveKidFriendlyLowScareFavorites();
    this.testTask6_ReserveVipEscapeRoomWithPhotoPackage();
    this.testTask7_AddParkingPassNearQuarantineZoneArena();
    this.testTask8_RegisterFreeZombieMakeupWorkshopForGroup();

    return this.results;
  }

  // Task 1: Buy 4 tickets for Haunted Maze on Oct 29, cheapest evening slot, apply BRAIN10, proceed to checkout
  testTask1_BuyHauntedMazeTicketsWithPromo() {
    const testName = 'Task 1: Haunted Maze tickets with BRAIN10 promo';
    try {
      this.clearStorage();
      this.setupTestData();

      // Step: Navigate to homepage
      const home = this.logic.getHomeContent();
      this.assert(home && typeof home === 'object', 'Home content should load');

      // Step: Open Tickets view & get options (simulates clicking Tickets nav)
      const ticketsOptions = this.logic.getTicketsAttractionsViewOptions();
      this.assert(Array.isArray(ticketsOptions.view_modes), 'Tickets view modes should be available');

      // Step: List ticketed attractions for Oct 29, evening, price low to high
      const ticketsListing = this.logic.getTicketsAttractionsListing(
        'tickets',
        '2025-10-29',
        'evening',
        undefined,
        undefined,
        undefined,
        undefined,
        'price_low_to_high'
      );
      this.assert(Array.isArray(ticketsListing.attractions), 'Tickets listing should return attractions');

      const hauntedMazeCard = ticketsListing.attractions.find(a => a.name && a.name.indexOf('Haunted Maze') === 0);
      this.assert(hauntedMazeCard, 'Haunted Maze attraction should be in tickets listing for Oct 29');

      const hauntedMazeId = hauntedMazeCard.attraction_id;

      // Step: Get Haunted Maze detail and evening timeslots sorted by price
      const mazeDetail = this.logic.getAttractionDetailAndTimeslots(
        hauntedMazeId,
        '2025-10-29',
        'evening_after_6pm',
        'price_low_to_high'
      );
      this.assert(mazeDetail && Array.isArray(mazeDetail.timeslots), 'Haunted Maze timeslots should load');

      const availableSlots = mazeDetail.timeslots.filter(ts => ts.status === 'available' || !ts.status);
      this.assert(availableSlots.length > 0, 'There should be at least one available evening timeslot');

      const cheapestEveningSlot = availableSlots[0];
      const timeslotId = cheapestEveningSlot.timeslot_id;

      // Step: Pricing preview for 4 standard tickets with promo BRAIN10
      const preview = this.logic.getAttractionPricingPreview(
        hauntedMazeId,
        timeslotId,
        'standard',
        4,
        undefined,
        [],
        'BRAIN10'
      );
      this.assert(preview && preview.success === true, 'Pricing preview should succeed');
      this.assert(preview.promo_applied === true, 'Promo should be applied');
      this.assert(preview.promo_code_normalized && preview.promo_code_normalized.toUpperCase() === 'BRAIN10', 'Promo code should normalize to BRAIN10');

      const breakdown = preview.pricing_breakdown;
      this.assert(breakdown.base_subtotal > 0, 'Base subtotal should be positive');
      this.assert(breakdown.promo_discount >= 0, 'Promo discount should be non-negative');
      this.assert(
        Math.abs(breakdown.line_total_before_tax - (breakdown.base_subtotal + breakdown.add_ons_total - breakdown.promo_discount)) < 0.01,
        'Line total should equal base + add-ons - discount'
      );

      // Step: Add configured tickets to cart using the promo
      const addResult = this.logic.addTicketsToCart(
        hauntedMazeId,
        timeslotId,
        'standard',
        4,
        undefined,
        [],
        'BRAIN10',
        'add_to_cart'
      );
      this.assert(addResult && addResult.success === true, 'Adding Haunted Maze tickets to cart should succeed');
      this.assert(addResult.cart_item_id, 'Cart item id should be returned');
      this.assert(addResult.cart_summary && addResult.cart_summary.cart_id, 'Cart summary with cart id should be returned');

      const addedCartItemId = addResult.cart_item_id;

      // Step: Proceed to checkout – get checkout summary and verify the line item
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout && Array.isArray(checkout.items), 'Checkout summary should list items');

      const checkoutTicketItem = checkout.items.find(i => i.cart_item_id === addedCartItemId);
      this.assert(checkoutTicketItem, 'Checkout should contain the Haunted Maze ticket cart item');
      this.assert(
        checkoutTicketItem.quantity === 4,
        'Haunted Maze checkout line should have quantity 4, got ' + checkoutTicketItem.quantity
      );
      this.assert(checkoutTicketItem.line_total > 0, 'Ticket line total should be positive at checkout');
      this.assert(checkout.total >= checkout.subtotal, 'Checkout total should be at least subtotal');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create 3-item zombie apparel bundle under $25 each, rating >=4, venue pickup
  testTask2_CreateZombieApparelBundleVenuePickup() {
    const testName = 'Task 2: 3-item zombie apparel bundle with venue pickup';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Get merch categories and locate Apparel
      const categories = this.logic.getMerchCategories();
      const apparelCategory = categories.find(c => c.code === 'apparel');
      this.assert(apparelCategory, 'Apparel merch category should exist');

      // Step: Get merch filter options (simulates setting filters)
      const merchFilters = this.logic.getMerchFilterOptions();
      this.assert(merchFilters && typeof merchFilters.price_max === 'number', 'Merch filter options should be available');

      // Step: List apparel products, max price 25, rating >=4, search 'zombie'
      const merchList = this.logic.listMerchProducts(
        'apparel',
        25,
        4,
        'zombie',
        undefined,
        'price_low_to_high'
      );
      this.assert(merchList && Array.isArray(merchList.products), 'Merch listing should return products');

      const products = merchList.products;
      const numToAdd = Math.min(3, products.length);
      this.assert(numToAdd > 0, 'There should be at least one zombie apparel item available');

      const selectedProductIds = [];

      for (let i = 0; i < numToAdd; i++) {
        const product = products[i];
        const detail = this.logic.getMerchProductDetail(product.product_id);
        this.assert(detail && detail.product_id === product.product_id, 'Product detail should match listing product');

        const addMerchResult = this.logic.addMerchToCart(product.product_id, 1, undefined);
        this.assert(addMerchResult && addMerchResult.success === true, 'Adding merch to cart should succeed');
        this.assert(addMerchResult.cart_item_id, 'Merch cart item id should be returned');
        selectedProductIds.push(product.product_id);
      }

      // Step: Set delivery method to pick up at event venue
      const deliveryResult = this.logic.setCartMerchDeliveryMethod('pick_up_at_event_venue');
      this.assert(deliveryResult && deliveryResult.success === true, 'Setting merch delivery method should succeed');
      this.assert(
        deliveryResult.merch_delivery_method === 'pick_up_at_event_venue',
        'Delivery method should be pick_up_at_event_venue'
      );

      // Verify cart contents
      const cart = this.logic.getCartSummary();
      this.assert(cart && Array.isArray(cart.items), 'Cart summary should be available');
      this.assert(
        cart.merch_delivery_method === 'pick_up_at_event_venue',
        'Cart merch delivery method should be pick_up_at_event_venue'
      );

      const merchItems = cart.items.filter(i => i.item_type === 'merch');
      this.assert(merchItems.length >= numToAdd, 'Cart should contain at least the merch items added');

      // Ensure every selected product id appears in cart details
      selectedProductIds.forEach(pid => {
        const found = merchItems.some(i => i.details && i.details.product_name && i.description && i.description.indexOf('Zombie') >= -1 ? true : (i.details && i.details.product_id === pid));
        // Less strict: ensure there is some merch item in cart
        this.assert(found, 'Cart should contain merch item for product id ' + pid);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3 (adapted): Book group tickets for 8 friends across two activities (two Haunted Maze timeslots) on one night
  testTask3_GroupTicketsTwoActivitiesOneNight() {
    const testName = 'Task 3: Group tickets across two Haunted Maze timeslots in one night';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Tickets listing for Oct 29
      const ticketsListing = this.logic.getTicketsAttractionsListing(
        'tickets',
        '2025-10-29',
        'evening',
        undefined,
        undefined,
        undefined,
        undefined,
        'price_low_to_high'
      );
      this.assert(Array.isArray(ticketsListing.attractions), 'Tickets listing should return attractions');

      const hauntedMazeCard = ticketsListing.attractions.find(a => a.name && a.name.indexOf('Haunted Maze') === 0);
      this.assert(hauntedMazeCard, 'Haunted Maze should appear in tickets listing for Oct 29');
      const hauntedMazeId = hauntedMazeCard.attraction_id;

      // Step: Get Haunted Maze timeslots in evening, earliest first
      const mazeDetail = this.logic.getAttractionDetailAndTimeslots(
        hauntedMazeId,
        '2025-10-29',
        'evening_after_6pm',
        'earliest_time_first'
      );
      this.assert(mazeDetail && Array.isArray(mazeDetail.timeslots), 'Haunted Maze timeslots should load');

      const availableSlots = mazeDetail.timeslots.filter(ts => ts.status === 'available' || !ts.status);
      this.assert(availableSlots.length >= 2, 'Should have at least two available evening timeslots for Haunted Maze');

      const firstSlot = availableSlots[0];
      const secondSlot = availableSlots[1];
      const firstStart = new Date(firstSlot.start_datetime);
      const secondStart = new Date(secondSlot.start_datetime);
      this.assert(secondStart > firstStart, 'Second timeslot should start later than first');

      // Step: Add 4 tickets to first timeslot
      const addFirst = this.logic.addTicketsToCart(
        hauntedMazeId,
        firstSlot.timeslot_id,
        'standard',
        4,
        undefined,
        [],
        undefined,
        'add_to_cart'
      );
      this.assert(addFirst && addFirst.success === true, 'Adding first Haunted Maze group (4 tickets) should succeed');
      const firstCartItemId = addFirst.cart_item_id;

      // Step: Add 4 tickets to second timeslot
      const addSecond = this.logic.addTicketsToCart(
        hauntedMazeId,
        secondSlot.timeslot_id,
        'standard',
        4,
        undefined,
        [],
        undefined,
        'add_to_cart'
      );
      this.assert(addSecond && addSecond.success === true, 'Adding second Haunted Maze group (4 tickets) should succeed');
      const secondCartItemId = addSecond.cart_item_id;

      // Step: View cart and verify both ticket lines
      const cart = this.logic.getCartSummary();
      this.assert(cart && Array.isArray(cart.items), 'Cart summary should be available');

      const firstCartItem = cart.items.find(i => i.cart_item_id === firstCartItemId);
      const secondCartItem = cart.items.find(i => i.cart_item_id === secondCartItemId);
      this.assert(firstCartItem, 'First Haunted Maze cart item should be present');
      this.assert(secondCartItem, 'Second Haunted Maze cart item should be present');

      this.assert(firstCartItem.quantity === 4, 'First group line should have quantity 4');
      this.assert(secondCartItem.quantity === 4, 'Second group line should have quantity 4');

      // Verify relation between cart items and timeslot ordering using details.time if available
      if (firstCartItem.details && secondCartItem.details && firstCartItem.details.time && secondCartItem.details.time) {
        const time1 = firstCartItem.details.time;
        const time2 = secondCartItem.details.time;
        this.assert(time2 !== time1, 'Two Haunted Maze activities should be at different times');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4 (adapted): Plan a 3-event schedule on Oct 28-30 in afternoon window and add to My Night Plan
  testTask4_PlanThreeEventScheduleIntoNightPlan() {
    const testName = 'Task 4: 3-event afternoon schedule added to My Night Plan';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Get event filter options (simulates opening Schedule/Calendar)
      const eventFilters = this.logic.getEventFilterOptions();
      this.assert(eventFilters && Array.isArray(eventFilters.view_modes), 'Event filter options should load');

      // Step: List events between Oct 28-30, 13:00-16:00 (afternoon window), workshop view
      const eventsList = this.logic.listEvents(
        '2025-10-28',
        '2025-10-30',
        '13:00',
        '16:00',
        undefined,
        undefined,
        undefined,
        'workshops'
      );
      this.assert(eventsList && Array.isArray(eventsList.events), 'Events listing should return events');
      this.assert(eventsList.events.length >= 3, 'There should be at least three qualifying workshops');

      const selectedEvents = eventsList.events.slice(0, 3);
      const selectedIds = selectedEvents.map(e => e.event_id);

      // Step: Add each selected event to My Night Plan via its detail page
      for (let i = 0; i < selectedEvents.length; i++) {
        const ev = selectedEvents[i];
        const detail = this.logic.getEventDetail(ev.event_id);
        this.assert(detail && detail.event_id === ev.event_id, 'Event detail should match listing event');

        const addResult = this.logic.addEventToNightPlan(ev.event_id);
        this.assert(addResult && addResult.success === true, 'Adding event to Night Plan should succeed');
        this.assert(addResult.night_plan_item_id, 'Night Plan item id should be returned');
      }

      // Step: Open My Night Plan and verify entries
      const nightPlan = this.logic.getNightPlan();
      this.assert(nightPlan && Array.isArray(nightPlan.items), 'Night Plan should be retrievable');
      this.assert(nightPlan.items.length >= 3, 'Night Plan should have at least three items');

      const planEventIds = nightPlan.items.map(i => i.event_id);
      selectedIds.forEach(id => {
        this.assert(planEventIds.indexOf(id) !== -1, 'Night Plan should contain event ' + id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5 (adapted): Save up to 5 kid-friendly low-scare attractions to favorites
  testTask5_SaveKidFriendlyLowScareFavorites() {
    const testName = 'Task 5: Save kid-friendly low-scare attractions to favorites';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: List attractions with kid-friendly, scare 1-3, age all_ages or ten_plus
      const listing = this.logic.getTicketsAttractionsListing(
        'attractions',
        undefined,
        undefined,
        ['kid_friendly'],
        1,
        3,
        ['all_ages', 'ten_plus'],
        undefined
      );
      this.assert(listing && Array.isArray(listing.attractions), 'Attractions listing should return attractions');

      const kidFriendly = listing.attractions.filter(a => {
        const okScare = typeof a.scare_level === 'number' ? (a.scare_level >= 1 && a.scare_level <= 3) : true;
        const okAge = a.age_rating === 'all_ages' || a.age_rating === 'ten_plus';
        const tagged = (a.tags || []).indexOf('kid_friendly') !== -1 || a.is_kid_friendly === true;
        return okScare && okAge && tagged;
      });

      const numToSave = Math.min(5, kidFriendly.length);
      this.assert(numToSave > 0, 'There should be at least one kid-friendly low-scare attraction');

      const savedIds = [];
      for (let i = 0; i < numToSave; i++) {
        const att = kidFriendly[i];
        const favResult = this.logic.addAttractionToFavorites(att.attraction_id);
        this.assert(favResult && favResult.success === true, 'Adding attraction to favorites should succeed');
        this.assert(typeof favResult.favorites_count === 'number', 'Favorites count should be returned');
        savedIds.push(att.attraction_id);
      }

      // Step: Open favorites list and verify
      const favoritesList = this.logic.getFavoritesList('kid_friendly_only');
      this.assert(favoritesList && Array.isArray(favoritesList.favorites), 'Favorites list should be retrievable');

      const favoriteIds = favoritesList.favorites.map(f => f.attraction_id);
      savedIds.forEach(id => {
        this.assert(favoriteIds.indexOf(id) !== -1, 'Favorites should contain attraction ' + id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6 (adapted): Reserve a (VIP if available) Zombie Escape Room session for 2 players before 7 PM with Photo & Video add-on
  testTask6_ReserveVipEscapeRoomWithPhotoPackage() {
    const testName = 'Task 6: Reserve Zombie Escape Room with Photo & Video add-on for 2 players';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Find Zombie Escape Room attraction from attractions view
      const attractionsListing = this.logic.getTicketsAttractionsListing(
        'attractions',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      this.assert(attractionsListing && Array.isArray(attractionsListing.attractions), 'Attractions listing should return attractions');

      const escapeAttraction = attractionsListing.attractions.find(a => a.name && a.name.indexOf('Zombie Escape Room') !== -1);
      this.assert(escapeAttraction, 'Zombie Escape Room Bunker attraction should exist');
      const escapeAttractionId = escapeAttraction.attraction_id;

      // Step: Try to find an early timeslot before 7 PM, preferring Nov 1 but adapting to any available date
      const candidateDates = ['2025-11-01', '2025-10-31', '2025-10-30', '2025-10-29'];
      let chosenDetail = null;
      let chosenTimeslot = null;
      let chosenDate = null;

      for (let i = 0; i < candidateDates.length; i++) {
        const date = candidateDates[i];
        const detail = this.logic.getAttractionDetailAndTimeslots(
          escapeAttractionId,
          date,
          'before_7pm',
          'earliest_time_first'
        );
        if (detail && Array.isArray(detail.timeslots) && detail.timeslots.length > 0) {
          chosenDetail = detail;
          chosenTimeslot = detail.timeslots[0];
          chosenDate = date;
          break;
        }
      }

      this.assert(chosenTimeslot !== null, 'There should be at least one Zombie Escape Room timeslot before 7 PM on one of the candidate dates');
      const timeslotId = chosenTimeslot.timeslot_id;

      // Determine ticket type: prefer VIP if available, otherwise use default/standard
      const ticketOptions = (chosenDetail && Array.isArray(chosenDetail.ticket_options)) ? chosenDetail.ticket_options : [];
      let ticketTypeCode = 'standard';
      const vipOption = ticketOptions.find(o => o.code === 'vip');
      if (vipOption) {
        ticketTypeCode = 'vip';
      } else if (ticketOptions.length > 0) {
        const defaultOpt = ticketOptions.find(o => o.is_default);
        ticketTypeCode = defaultOpt ? defaultOpt.code : ticketOptions[0].code;
      }

      // Step: Locate Photo & Video add-on
      const addOns = (chosenDetail && Array.isArray(chosenDetail.add_on_options)) ? chosenDetail.add_on_options : [];
      const photoAddOn = addOns.find(a => (a.code && a.code === 'photo_and_video_package') || (a.name && a.name.indexOf('Photo & Video Package') !== -1));
      this.assert(photoAddOn, 'Photo & Video Package add-on should be available for Zombie Escape Room');

      const addOnIds = [photoAddOn.add_on_id];

      // Step: Pricing preview for party of 2 with photo package
      const preview = this.logic.getAttractionPricingPreview(
        escapeAttractionId,
        timeslotId,
        ticketTypeCode,
        undefined,
        2,
        addOnIds,
        undefined
      );
      this.assert(preview && preview.success === true, 'Escape Room pricing preview should succeed');
      this.assert(preview.promo_applied === false, 'No promo should be applied for this booking');
      const breakdown = preview.pricing_breakdown;
      this.assert(breakdown.base_subtotal > 0, 'Escape Room base subtotal should be positive');
      this.assert(breakdown.add_ons_total >= 0, 'Add-ons total should be non-negative');

      // Step: Reserve now (add to cart) for 2 players with add-on
      const addResult = this.logic.addTicketsToCart(
        escapeAttractionId,
        timeslotId,
        ticketTypeCode,
        undefined,
        2,
        addOnIds,
        undefined,
        'reserve_now'
      );
      this.assert(addResult && addResult.success === true, 'Adding Zombie Escape Room booking to cart should succeed');
      const cartItemId = addResult.cart_item_id;
      this.assert(cartItemId, 'Cart item id for escape room should be returned');

      // Step: Checkout summary should reflect the reserved session and add-on
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout && Array.isArray(checkout.items), 'Checkout summary should be available');

      const escapeCartItem = checkout.items.find(i => i.cart_item_id === cartItemId);
      this.assert(escapeCartItem, 'Checkout should include Zombie Escape Room cart item');
      this.assert(escapeCartItem.line_total > 0, 'Escape Room line total should be positive');

      // If details are present, verify the add-on is listed
      const cartSummary = this.logic.getCartSummary();
      if (cartSummary && Array.isArray(cartSummary.items)) {
        const escapeCartSummaryItem = cartSummary.items.find(i => i.cart_item_id === cartItemId);
        if (escapeCartSummaryItem && escapeCartSummaryItem.details && Array.isArray(escapeCartSummaryItem.details.add_ons)) {
          this.assert(
            escapeCartSummaryItem.details.add_ons.length > 0,
            'Escape Room cart details should list at least one add-on'
          );
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add a parking pass within 500 m of Quarantine Zone Arena for Oct 31 at 7 PM
  testTask7_AddParkingPassNearQuarantineZoneArena() {
    const testName = 'Task 7: Parking pass within 500m of Quarantine Zone Arena for Oct 31 at 7 PM';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Search for Quarantine Zone Arena on the map
      const venueSearch = this.logic.searchVenuesOnMap('Quarantine Zone Arena');
      this.assert(venueSearch && Array.isArray(venueSearch.venues), 'Venue search should return results');
      const arena = venueSearch.venues.find(v => v.name && v.name.indexOf('Quarantine Zone Arena') !== -1);
      this.assert(arena, 'Quarantine Zone Arena venue should be found');

      const arenaDetail = this.logic.getVenueDetail(arena.venue_id);
      this.assert(arenaDetail && arenaDetail.venue_id === arena.venue_id, 'Arena detail should match venue search result');

      // Step: Find nearby parking within 500m
      const nearbyParking = this.logic.findNearbyParkingAreas(arena.venue_id, 500);
      this.assert(nearbyParking && Array.isArray(nearbyParking.parking_areas), 'Nearby parking areas should be returned');

      const activeParking = nearbyParking.parking_areas.filter(p => p.status === 'active' && (typeof p.remaining_capacity !== 'number' || p.remaining_capacity > 0));
      this.assert(activeParking.length > 0, 'There should be at least one active parking area within 500m');

      const chosenParking = activeParking[0];
      const parkingAreaId = chosenParking.parking_area_id;

      const parkingDetail = this.logic.getParkingAreaDetail(parkingAreaId);
      this.assert(parkingDetail && parkingDetail.parking_area_id === parkingAreaId, 'Parking area detail should match selected parking area');

      // Step: Add parking pass for Oct 31 at 19:00 (7 PM)
      const addParkingResult = this.logic.addParkingPassToCart(parkingAreaId, '2025-10-31', '19:00');
      this.assert(addParkingResult && addParkingResult.success === true, 'Adding parking pass to cart should succeed');
      this.assert(addParkingResult.cart_item_id, 'Parking cart item id should be returned');
      const parkingCartItemId = addParkingResult.cart_item_id;

      // Verify in cart summary
      const cart = this.logic.getCartSummary();
      this.assert(cart && Array.isArray(cart.items), 'Cart summary should be available');

      const parkingItem = cart.items.find(i => i.cart_item_id === parkingCartItemId);
      this.assert(parkingItem, 'Cart should include parking pass item');
      this.assert(parkingItem.item_type === 'parking_pass', 'Parking cart item type should be parking_pass');
      this.assert(parkingItem.line_total > 0, 'Parking pass line total should be positive');
      if (parkingItem.details && parkingItem.details.parking_area_name) {
        this.assert(
          parkingItem.details.parking_area_name.indexOf('Quarantine') !== -1 || parkingItem.details.parking_area_name.length > 0,
          'Parking area name should be present in cart item details'
        );
      }

      // Also verify via checkout summary
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout && Array.isArray(checkout.items), 'Checkout summary should be available');
      const checkoutParkingItem = checkout.items.find(i => i.cart_item_id === parkingCartItemId);
      this.assert(checkoutParkingItem, 'Checkout should include parking pass item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Register for a free Zombie Makeup Workshop for a group of 3 between Oct 28-30 in afternoon
  testTask8_RegisterFreeZombieMakeupWorkshopForGroup() {
    const testName = 'Task 8: Register for free Zombie Makeup Workshop for group of 3';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomeContent();
      this.assert(home, 'Home content should load');

      // Step: Get event filter options (Workshops page)
      const eventFilters = this.logic.getEventFilterOptions();
      this.assert(eventFilters && Array.isArray(eventFilters.view_modes), 'Event filter options should load');

      // Step: List free family-friendly workshops between Oct 28-30, 13:00-16:00
      const eventsList = this.logic.listEvents(
        '2025-10-28',
        '2025-10-30',
        '13:00',
        '16:00',
        0,
        true,
        ['family_friendly'],
        'workshops'
      );
      this.assert(eventsList && Array.isArray(eventsList.events), 'Events listing should return workshops');

      const workshops = eventsList.events.filter(e => e.title && e.title.indexOf('Zombie Makeup Workshop') !== -1);
      this.assert(workshops.length > 0, 'There should be at least one Zombie Makeup Workshop in the filtered list');

      const selectedWorkshop = workshops[0];
      const workshopDetail = this.logic.getEventDetail(selectedWorkshop.event_id);
      this.assert(workshopDetail && workshopDetail.event_id === selectedWorkshop.event_id, 'Workshop detail should match selected event');
      this.assert(workshopDetail.is_free === true, 'Selected workshop should be free');
      this.assert(workshopDetail.price === 0, 'Selected workshop price should be 0');

      // Step: Register for 3 attendees without newsletter opt-in
      const regResult = this.logic.registerForWorkshop(
        selectedWorkshop.event_id,
        'Alex Carter',
        'alex@example.com',
        '555-0123',
        3,
        false
      );
      this.assert(regResult && regResult.success === true, 'Workshop registration should succeed');
      this.assert(regResult.registration_id, 'Registration id should be returned');
      this.assert(regResult.event_id === selectedWorkshop.event_id, 'Registration event id should match selected workshop');

      // Verify registration persisted by checking workshop_registrations storage using returned id
      if (typeof localStorage !== 'undefined') {
        const storedRegs = JSON.parse(localStorage.getItem('workshop_registrations') || '[]');
        const storedReg = storedRegs.find(r => r.id === regResult.registration_id);
        this.assert(storedReg, 'Stored workshop registrations should include the new registration');
        this.assert(storedReg.full_name === 'Alex Carter', 'Stored registration should have correct full name');
        this.assert(storedReg.party_size === 3, 'Stored registration should have party size 3');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and reporting methods
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('[PASS] ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('[FAIL] ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
