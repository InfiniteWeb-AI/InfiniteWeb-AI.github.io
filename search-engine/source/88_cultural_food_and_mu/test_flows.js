/* Test runner for festival business logic flows */

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
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (values & structure)
    // and store using the correct storage keys
    const generatedData = {
      artists: [
        {
          id: 'sol_del_andes',
          name: 'Sol del Andes',
          bio: 'Sol del Andes blends traditional Andean pan flutes, charango, and modern electronic textures for expansive, danceable sets that celebrate mountain cultures of Peru and Bolivia.',
          genre: 'Andean electro-folk',
          cultural_background: 'Peruvian, Bolivian',
          photo_url: 'https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/1200/1000/92/media/abd/refresh/central-south-america/peru-private-adventure/andean-flute-2x1.jpg?cb=3',
          artist_type: 'headliner',
          home_city: 'Lima',
          home_country: 'Peru',
          is_active: true
        },
        {
          id: 'midnight_qawwali_collective',
          name: 'Midnight Qawwali Collective',
          bio: 'Led by vocalist Ayesha Khan, Midnight Qawwali Collective revives the ecstatic Sufi qawwali tradition with harmonium, tabla, and soaring group vocals.',
          genre: 'Sufi qawwali',
          cultural_background: 'Pakistani, British-Pakistani',
          photo_url: 'https://samratpandit.com/wp-content/img/content/2/nicmar-photo1.jpg',
          artist_type: 'headliner',
          home_city: 'London',
          home_country: 'United Kingdom',
          is_active: true
        },
        {
          id: 'seattle_samba_society',
          name: 'Seattle Samba Society',
          bio: 'A community bateria bringing Rio-style samba, carnival rhythms, and colorful dancers to the Pacific Northwest.',
          genre: 'Samba, batucada',
          cultural_background: 'Brazilian diaspora',
          photo_url: 'https://www.amautaspanish.com/fotos/galeria/big/lovely-happy-samba-dancers-at-the-carnival.jpg',
          artist_type: 'local',
          home_city: 'Seattle',
          home_country: 'USA',
          is_active: true
        }
      ],
      donation_funds: [
        {
          id: 'youth_music_education',
          name: 'Youth Music Education',
          description: 'Supports year-round music classes, instrument libraries, and mentorship programs for local youth.',
          is_active: true,
          suggested_amounts: [10, 25, 50, 100]
        },
        {
          id: 'community_arts_grants',
          name: 'Community Arts Grants',
          description: 'Micro-grants for neighborhood cultural projects, pop-up performances, and community storytelling.',
          is_active: true,
          suggested_amounts: [25, 50, 75, 150]
        },
        {
          id: 'sustainability_initiative',
          name: 'Sustainability Initiative',
          description: 'Funds zero-waste efforts, reusable service ware, and green power for festival stages.',
          is_active: true,
          suggested_amounts: [15, 30, 60, 120]
        }
      ],
      map_locations: [
        {
          id: 'main_stage',
          name: 'Main Stage',
          description: 'The central outdoor stage featuring headliner performances and opening ceremonies.',
          location_type: 'stage',
          latitude: 47.61,
          longitude: -122.336,
          is_near_main_stage: true,
          walking_time_from_main_stage: 0
        },
        {
          id: 'river_stage',
          name: 'River Stage',
          description: 'Waterfront stage hosting intimate acoustic and world fusion sets.',
          location_type: 'stage',
          latitude: 47.6091,
          longitude: -122.3385,
          is_near_main_stage: false,
          walking_time_from_main_stage: 7
        },
        {
          id: 'plaza_stage',
          name: 'Plaza Stage',
          description: 'City plaza stage focused on local bands and dance showcases.',
          location_type: 'stage',
          latitude: 47.6108,
          longitude: -122.3342,
          is_near_main_stage: true,
          walking_time_from_main_stage: 4
        }
      ],
      ticket_types: [
        {
          id: 'wknd_2day_adult_ga',
          name: '2-Day Weekend Pass - Adult GA',
          description: 'General admission access for one adult to all stages and activities on Saturday and Sunday.',
          pass_type: 'two_day',
          ticket_category: 'adult',
          valid_days: ['saturday', 'sunday'],
          base_price: 170,
          currency: 'USD',
          is_child: false,
          is_active: true,
          display_order: 1
        },
        {
          id: 'wknd_2day_child_ga',
          name: '2-Day Weekend Pass - Child (6-12)',
          description: 'General admission for one child ages 6–12 on Saturday and Sunday when accompanied by a ticketed adult.',
          pass_type: 'two_day',
          ticket_category: 'child',
          valid_days: ['saturday', 'sunday'],
          base_price: 55,
          currency: 'USD',
          is_child: true,
          is_active: true,
          display_order: 2
        },
        {
          id: 'wknd_2day_adult_plus',
          name: '2-Day Weekend Pass - Adult Plus Seating',
          description: 'Adult 2-day pass with access to reserved seating sections at the Main Stage.',
          pass_type: 'two_day',
          ticket_category: 'adult',
          valid_days: ['saturday', 'sunday'],
          base_price: 210,
          currency: 'USD',
          is_child: false,
          is_active: true,
          display_order: 3
        }
      ],
      activities: [
        {
          id: 'sat_afro_latin_dance_intermediate',
          name: 'Afro-Latin Partner Dance - Intermediate',
          description: 'Build your turns, footwork, and musicality in this intermediate Afro-Latin partner dance class, blending salsa and kizomba basics.',
          activity_type: 'dance_workshop',
          day: 'saturday',
          start_time: '2026-08-15T13:00:00',
          end_time: '2026-08-15T14:30:00',
          location_id: 'workshop_tent_a',
          price: 0,
          currency: 'USD',
          is_free: true,
          level: 'intermediate',
          average_rating: 4.4,
          rating_count: 32,
          is_kids_focused: false,
          is_family_friendly: true,
          instructor_name: 'Luis Morales & Mariela Cruz'
        },
        {
          id: 'sat_bhangra_basics',
          name: 'Bhangra Basics for Everyone',
          description: 'High-energy Punjabi bhangra fundamentals with Urban Bhangra Crew, perfect for first-timers who want to jump into the evening sets.',
          activity_type: 'dance_workshop',
          day: 'saturday',
          start_time: '2026-08-15T10:30:00',
          end_time: '2026-08-15T12:00:00',
          location_id: 'dance_pavilion',
          price: 15,
          currency: 'USD',
          is_free: false,
          level: 'beginner',
          average_rating: 4.8,
          rating_count: 54,
          is_kids_focused: false,
          is_family_friendly: true,
          instructor_name: 'Urban Bhangra Crew'
        },
        {
          id: 'fri_bollywood_party_dance',
          name: 'Friday Night Bollywood Party Dance',
          description: 'Learn easy, high-impact Bollywood party choreography set to classic and modern hits.',
          activity_type: 'dance_workshop',
          day: 'friday',
          start_time: '2026-08-14T18:00:00',
          end_time: '2026-08-14T19:00:00',
          location_id: 'dance_pavilion',
          price: 12,
          currency: 'USD',
          is_free: false,
          level: 'all_levels',
          average_rating: 4.6,
          rating_count: 41,
          is_kids_focused: false,
          is_family_friendly: true,
          instructor_name: 'Bollywood Beats Collective'
        }
      ],
      stages: [
        {
          id: 'stage_main',
          name: 'Main Stage',
          description: 'The primary festival stage hosting headliner performances and nightly finales.',
          location_id: 'main_stage',
          is_main_stage: true
        },
        {
          id: 'stage_river',
          name: 'River Stage',
          description: 'Intimate stage along the waterfront featuring acoustic, folk, and cross-cultural collaborations.',
          location_id: 'river_stage',
          is_main_stage: false
        },
        {
          id: 'stage_plaza',
          name: 'Plaza Stage',
          description: 'Urban plaza stage showcasing local bands, dance showcases, and daytime family programming.',
          location_id: 'plaza_stage',
          is_main_stage: false
        }
      ],
      ticket_tiers: [
        {
          id: 'wknd_2day_adult_ga_early',
          ticket_type_id: 'wknd_2day_adult_ga',
          name: 'Early Bird Adult GA',
          description: 'Discounted early-bird general admission for Saturday and Sunday.',
          seating_type: 'general_admission',
          price: 155,
          currency: 'USD',
          is_default: false,
          is_available: true
        },
        {
          id: 'wknd_2day_adult_ga_standard',
          ticket_type_id: 'wknd_2day_adult_ga',
          name: 'Standard Adult GA',
          description: 'Standard-priced adult general admission for both days.',
          seating_type: 'general_admission',
          price: 170,
          currency: 'USD',
          is_default: true,
          is_available: true
        },
        {
          id: 'wknd_2day_adult_ga_late',
          ticket_type_id: 'wknd_2day_adult_ga',
          name: 'Late Purchase Adult GA',
          description: 'Last-minute 2-day GA purchase subject to availability.',
          seating_type: 'standing',
          price: 185,
          currency: 'USD',
          is_default: false,
          is_available: true
        }
      ],
      vendors: [
        {
          id: 'sabor_de_puebla_vendor',
          name: 'Sabor de Puebla',
          description: 'Street-style tacos, mole bowls, and vegetarian tinga plates inspired by family recipes from Puebla, Mexico.',
          vendor_food_type: 'main',
          cuisine: 'Mexican',
          location_id: 'sabor_de_puebla',
          average_rating: 4.7,
          rating_count: 210
        },
        {
          id: 'sweet_sitar_desserts_vendor',
          name: 'Sweet Sitar Desserts',
          description: 'Gulab jamun, rose-cardamom cakes, and kulfi pops blending North and South Indian dessert traditions.',
          vendor_food_type: 'dessert',
          cuisine: 'Indian',
          location_id: 'sweet_sitar_desserts',
          average_rating: 4.6,
          rating_count: 165
        },
        {
          id: 'chai_and_beat_bar_vendor',
          name: 'Chai & Beat Bar',
          description: 'Masala chai, iced hibiscus tea, and global mocktails served with a direct view of the Main Stage.',
          vendor_food_type: 'drink',
          cuisine: 'Global fusion beverages',
          location_id: 'chai_and_beat_bar',
          average_rating: 4.5,
          rating_count: 189
        }
      ],
      dishes: [
        {
          id: 'veggie_rajas_tacos',
          vendor_id: 'sabor_de_puebla_vendor',
          name: 'Veggie Rajas Tacos',
          description: 'Three soft tacos stuffed with roasted poblano strips, onions, crema, and queso fresco, served with salsa verde.',
          cuisine: 'Mexican',
          dish_type: 'main',
          dietary_tags: ['vegetarian'],
          is_vegetarian: true,
          is_vegan: false,
          price: 11.0,
          currency: 'USD',
          average_rating: 4.7,
          rating_count: 132
        },
        {
          id: 'mole_chicken_bowl',
          vendor_id: 'sabor_de_puebla_vendor',
          name: 'Mole Chicken Bowl',
          description: 'Slow-simmered chicken in rich poblano mole over rice with pickled onions and warm tortillas.',
          cuisine: 'Mexican',
          dish_type: 'main',
          dietary_tags: ['gluten_friendly'],
          is_vegetarian: false,
          is_vegan: false,
          price: 14.0,
          currency: 'USD',
          average_rating: 4.8,
          rating_count: 178
        },
        {
          id: 'falafel_feast_plate',
          vendor_id: 'mediterranean_veggie_grill',
          name: 'Falafel Feast Plate',
          description: 'Crispy falafel, herbed rice, chopped salad, hummus, and warm pita with tahini drizzle.',
          cuisine: 'Mediterranean',
          dish_type: 'main',
          dietary_tags: ['vegetarian'],
          is_vegetarian: true,
          is_vegan: false,
          price: 13.0,
          currency: 'USD',
          average_rating: 4.8,
          rating_count: 164
        }
      ],
      performances: [
        {
          id: 'fri_opening_sol_del_andes',
          name: 'Opening Night: Sol del Andes',
          artist_id: 'sol_del_andes',
          stage_id: 'stage_main',
          day: 'friday',
          start_time: '2026-08-14T19:00:00',
          end_time: '2026-08-14T20:15:00',
          description: 'Festival opening set featuring soaring Andean melodies and electronic grooves.',
          is_music_performance: true
        },
        {
          id: 'fri_evening_qawwali',
          name: 'Midnight Qawwali Collective Live',
          artist_id: 'midnight_qawwali_collective',
          stage_id: 'stage_main',
          day: 'friday',
          start_time: '2026-08-14T21:00:00',
          end_time: '2026-08-14T22:15:00',
          description: 'An ecstatic Sufi qawwali experience under the stars.',
          is_music_performance: true
        },
        {
          id: 'fri_river_bossa_night',
          name: 'Riverfront Bossa Night',
          artist_id: 'rio_night_bossa_quartet',
          stage_id: 'stage_river',
          day: 'friday',
          start_time: '2026-08-14T18:00:00',
          end_time: '2026-08-14T19:15:00',
          description: 'Laid-back bossa nova classics by the water.',
          is_music_performance: true
        }
      ]
    };

    // Copy generated data into localStorage using correct storage keys
    localStorage.setItem('artists', JSON.stringify(generatedData.artists || []));
    localStorage.setItem('donation_funds', JSON.stringify(generatedData.donation_funds || []));
    // Extend map_locations with food vendor stalls near Main Stage for Task 8
    const mapLocations = (generatedData.map_locations || []).slice();
    mapLocations.push(
      {
        id: 'sabor_de_puebla',
        name: 'Sabor de Puebla Stall',
        description: 'Main course stall near Main Stage',
        location_type: 'food_vendor',
        latitude: 47.6102,
        longitude: -122.3355,
        is_near_main_stage: true,
        walking_time_from_main_stage: 2
      },
      {
        id: 'sweet_sitar_desserts',
        name: 'Sweet Sitar Desserts Stall',
        description: 'Dessert stall near Main Stage',
        location_type: 'food_vendor',
        latitude: 47.6103,
        longitude: -122.3358,
        is_near_main_stage: true,
        walking_time_from_main_stage: 2
      },
      {
        id: 'chai_and_beat_bar',
        name: 'Chai & Beat Bar Stall',
        description: 'Drink stall near Main Stage',
        location_type: 'food_vendor',
        latitude: 47.6099,
        longitude: -122.3359,
        is_near_main_stage: true,
        walking_time_from_main_stage: 3
      }
    );
    localStorage.setItem('map_locations', JSON.stringify(mapLocations));

    localStorage.setItem('ticket_types', JSON.stringify(generatedData.ticket_types || []));
    localStorage.setItem('activities', JSON.stringify(generatedData.activities || []));
    localStorage.setItem('stages', JSON.stringify(generatedData.stages || []));
    localStorage.setItem('ticket_tiers', JSON.stringify(generatedData.ticket_tiers || []));
    localStorage.setItem('vendors', JSON.stringify(generatedData.vendors || []));
    localStorage.setItem('dishes', JSON.stringify(generatedData.dishes || []));
    localStorage.setItem('performances', JSON.stringify(generatedData.performances || []));

    // Ensure other collections exist (empty) if not already created by _initStorage
    const emptyCollections = [
      'carts',
      'cart_items',
      'checkout_sessions',
      'my_schedule_items',
      'tasting_list_items',
      'activities',
      'family_plan_items',
      'artist_favorites',
      'artist_lists',
      'artist_list_items',
      'saved_map_locations',
      'donations',
      'newsletter_subscriptions',
      'workshop_registrations'
    ];
    for (let i = 0; i < emptyCollections.length; i++) {
      const key = emptyCollections[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_TicketPurchaseMobileDelivery();
    this.testTask2_BuildMusicSchedule();
    this.testTask3_TastingListVegetarianMains();
    this.testTask4_RegisterFreeIntermediateDanceWorkshop();
    this.testTask5_SaturdayNightLineupList();
    this.testTask6_DonationYouthMusicEducation();
    this.testTask7_FamilyFriendlyActivitiesPlan();
    this.testTask8_PinNearbyFoodStallsOnMap();

    console.log('Flow tests complete.');
    return this.results;
  }

  // Task 1: Purchase cheapest 2-day festival pass within budget and select mobile delivery
  testTask1_TicketPurchaseMobileDelivery() {
    const testName = 'Task 1: Cheapest 2-day pass within budget with mobile delivery';
    console.log('Testing:', testName);

    try {
      // Simulate user navigating Tickets page
      const ticketOptions = this.logic.getTicketPurchaseOptions();
      this.assert(ticketOptions && Array.isArray(ticketOptions.ticket_types), 'Ticket types should be returned');

      // Choose two-day adult ticket type
      const twoDayAdults = ticketOptions.ticket_types.filter(function (t) {
        return t.pass_type === 'two_day' && t.ticket_category === 'adult' && t.is_active;
      });
      this.assert(twoDayAdults.length > 0, 'Should have at least one active two-day adult ticket type');

      const adultTicketType = twoDayAdults[0];
      this.assert(Array.isArray(adultTicketType.tiers) && adultTicketType.tiers.length > 0, 'Adult ticket type should have tiers');

      // Find cheapest available tier for the chosen adult type
      let cheapestTier = null;
      for (let i = 0; i < adultTicketType.tiers.length; i++) {
        const tier = adultTicketType.tiers[i];
        if (!tier.is_available) continue;
        if (!cheapestTier || tier.price < cheapestTier.price) {
          cheapestTier = tier;
        }
      }
      this.assert(cheapestTier !== null, 'Should find an available cheapest tier');

      // Simulate selection under budget of 260
      const budget = 260;
      const selections = [
        {
          ticketTypeId: adultTicketType.id,
          ticketTierId: cheapestTier.id,
          quantity: 1
        }
      ];

      const simulation = this.logic.simulateTicketSelection(selections, budget);
      this.assert(simulation && typeof simulation.subtotal === 'number', 'Simulation should return subtotal');
      this.assert(simulation.is_within_budget === true, 'Cheapest 2-day adult GA should be within budget');
      this.assert(simulation.subtotal <= budget, 'Subtotal should not exceed budget');

      // Add tickets to cart
      const addResult = this.logic.addTicketsToCart(selections);
      this.assert(addResult && addResult.success === true, 'addTicketsToCart should succeed');
      this.assert(addResult.cart && addResult.cart.cart_id, 'Cart with ID should be returned');

      const cartId = addResult.cart.cart_id;
      const cartAfterAdd = addResult.cart;
      this.assert(Array.isArray(cartAfterAdd.items) && cartAfterAdd.items.length > 0, 'Cart should contain at least one item');

      // Verify that cart contains our selected ticket type and tier
      const addedItem = cartAfterAdd.items.find(function (item) {
        return item.ticket_type_name === adultTicketType.name && item.ticket_tier_name === cheapestTier.name;
      });
      this.assert(!!addedItem, 'Cart should contain the selected adult ticket and tier');

      // Verify cart summary matches cart totals from add result
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart_id === cartId, 'Cart summary should correspond to returned cart ID');
      this.assert(cartSummary.total === cartAfterAdd.total, 'Cart summary total should match addTicketsToCart total');

      // Start or get checkout session
      const checkoutSession = this.logic.startOrGetCheckoutSession();
      this.assert(checkoutSession && checkoutSession.checkout_session_id, 'Checkout session should be created or returned');
      this.assert(Array.isArray(checkoutSession.available_delivery_methods), 'Checkout session should list available delivery methods');

      // Prefer mobile_ticket, otherwise e_ticket
      let deliveryMethod = null;
      if (checkoutSession.available_delivery_methods.indexOf('mobile_ticket') !== -1) {
        deliveryMethod = 'mobile_ticket';
      } else if (checkoutSession.available_delivery_methods.indexOf('e_ticket') !== -1) {
        deliveryMethod = 'e_ticket';
      }
      this.assert(deliveryMethod !== null, 'At least one digital delivery method (mobile_ticket or e_ticket) should be available');

      const updatedDelivery = this.logic.updateCheckoutDeliveryAndDetails(
        deliveryMethod,
        'Alex Buyer',
        'alex.buyer@example.com',
        '555-000-1234'
      );
      this.assert(updatedDelivery && updatedDelivery.success === true, 'Updating checkout delivery method should succeed');

      // Proceed to payment step without real payment
      const paymentStep = this.logic.proceedToPaymentStep();
      this.assert(paymentStep && paymentStep.success === true, 'Proceeding to payment step should succeed');
      this.assert(paymentStep.current_step === 'payment', 'Checkout current_step should be payment');
      this.assert(paymentStep.order_summary && typeof paymentStep.order_summary.total === 'number', 'Order summary should include total');
      this.assert(paymentStep.order_summary.total === cartSummary.total, 'Order total at payment step should equal cart total');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Build a music schedule with multiple performances across stages (adapted to available Friday data)
  testTask2_BuildMusicSchedule() {
    const testName = 'Task 2: Build music schedule with multiple performances';
    console.log('Testing:', testName);

    try {
      // Simulate user opening Schedule/Lineup and selecting a festival day
      const filterOptions = this.logic.getScheduleFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.days), 'Schedule filter options should include days');
      this.assert(filterOptions.days.length > 0, 'There should be at least one festival day');

      const day = filterOptions.days[0]; // Use first available day (Friday in generated data)

      // Filter for evening music performances between 18:00 and 23:00
      const schedule = this.logic.getSchedule(day, {
        startTimeFrom: '18:00',
        startTimeTo: '23:00',
        isMusicOnly: true
      });
      this.assert(Array.isArray(schedule), 'Schedule should be an array');
      this.assert(schedule.length > 0, 'Schedule should have at least one performance for the day');

      const maxToSelect = Math.min(3, schedule.length);
      this.assert(maxToSelect >= 1, 'Should be able to select at least one performance');

      // Select up to three performances, preferring different stages
      const selectedPerformances = [];
      const usedStageIds = new Set();

      for (let i = 0; i < schedule.length && selectedPerformances.length < maxToSelect; i++) {
        const perf = schedule[i];
        if (!usedStageIds.has(perf.stage_id)) {
          selectedPerformances.push(perf);
          usedStageIds.add(perf.stage_id);
        }
      }
      // If we still need more to reach maxToSelect, allow duplicate stages
      if (selectedPerformances.length < maxToSelect) {
        for (let i = 0; i < schedule.length && selectedPerformances.length < maxToSelect; i++) {
          const perf = schedule[i];
          let alreadySelected = false;
          for (let j = 0; j < selectedPerformances.length; j++) {
            if (selectedPerformances[j].performance_id === perf.performance_id) {
              alreadySelected = true;
              break;
            }
          }
          if (!alreadySelected) {
            selectedPerformances.push(perf);
          }
        }
      }

      this.assert(selectedPerformances.length === maxToSelect, 'Should have selected expected number of performances');
      this.assert(usedStageIds.size >= Math.min(2, maxToSelect), 'Selected performances should span at least two distinct stages when possible');

      // Add each selected performance to My Schedule via event details view
      const addedPerformanceIds = [];
      for (let i = 0; i < selectedPerformances.length; i++) {
        const perf = selectedPerformances[i];

        const details = this.logic.getEventDetails(perf.performance_id);
        this.assert(details && details.performance_id === perf.performance_id, 'Event details should match performance ID');
        this.assert(details.is_music_performance === true, 'Selected event should be a music performance');

        const addResult = this.logic.addPerformanceToMySchedule(perf.performance_id);
        this.assert(addResult && addResult.success === true, 'Adding performance to My Schedule should succeed');
        this.assert(addResult.is_in_my_schedule === true, 'Performance should be marked as in My Schedule');

        addedPerformanceIds.push(perf.performance_id);
      }

      // Verify My Schedule overview contains the selected performances
      const mySchedule = this.logic.getMyScheduleOverview();
      this.assert(mySchedule && Array.isArray(mySchedule.items), 'My Schedule overview should return items array');
      this.assert(mySchedule.items.length >= addedPerformanceIds.length, 'My Schedule should contain at least the added performances');

      for (let i = 0; i < addedPerformanceIds.length; i++) {
        const perfId = addedPerformanceIds[i];
        const found = mySchedule.items.find(function (item) {
          return item.performance_id === perfId;
        });
        this.assert(!!found, 'My Schedule should contain performance ' + perfId);
      }

      // Verify planner overview reflects schedule entries
      const planner = this.logic.getMyPlannerOverview();
      this.assert(planner && Array.isArray(planner.my_schedule_preview), 'Planner overview should include schedule preview');

      let previewMatches = 0;
      for (let i = 0; i < planner.my_schedule_preview.length; i++) {
        const previewItem = planner.my_schedule_preview[i];
        if (addedPerformanceIds.indexOf(previewItem.performance_id) !== -1) {
          previewMatches++;
        }
      }
      this.assert(previewMatches >= 1, 'Planner schedule preview should include at least one of the added performances');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a tasting list with vegetarian mains under 15 and rating >= 4.0
  testTask3_TastingListVegetarianMains() {
    const testName = 'Task 3: Create tasting list with vegetarian main dishes';
    console.log('Testing:', testName);

    try {
      // Simulate user opening Food/Vendors page and viewing filter options
      const foodOptions = this.logic.getFoodFilterOptions();
      this.assert(foodOptions && Array.isArray(foodOptions.dish_types), 'Food filter options should include dish_types');

      // Search for vegetarian main dishes under 15 with rating >= 4.0
      const results = this.logic.searchDishes('', {
        dishType: 'main',
        maxPrice: 15,
        minRating: 4.0,
        isVegetarian: true
      });
      this.assert(Array.isArray(results), 'searchDishes should return an array');
      this.assert(results.length >= 2, 'There should be at least two vegetarian mains under 15 with rating >= 4.0');

      // Select up to three dishes, preferring different cuisines
      const selectedDishes = [];
      const usedCuisines = new Set();
      for (let i = 0; i < results.length && selectedDishes.length < 3; i++) {
        const dish = results[i];
        if (!usedCuisines.has(dish.cuisine)) {
          selectedDishes.push(dish);
          usedCuisines.add(dish.cuisine);
        }
      }
      if (selectedDishes.length < Math.min(3, results.length)) {
        for (let i = 0; i < results.length && selectedDishes.length < 3; i++) {
          const dish = results[i];
          let already = false;
          for (let j = 0; j < selectedDishes.length; j++) {
            if (selectedDishes[j].dish_id === dish.dish_id) {
              already = true;
              break;
            }
          }
          if (!already) {
            selectedDishes.push(dish);
          }
        }
      }

      const numSelected = selectedDishes.length;
      this.assert(numSelected >= 2, 'Should have selected at least two vegetarian main dishes');

      const addedDishIds = [];
      for (let i = 0; i < selectedDishes.length; i++) {
        const dish = selectedDishes[i];

        // Open dish details and verify constraints using actual values
        const details = this.logic.getDishDetails(dish.dish_id);
        this.assert(details && details.dish_id === dish.dish_id, 'Dish details should match dish ID');
        this.assert(details.dish_type === 'main', 'Dish should be a main');
        this.assert(details.is_vegetarian === true, 'Dish should be vegetarian');
        this.assert(details.price <= 15, 'Dish price should be <= 15');
        if (typeof details.average_rating === 'number') {
          this.assert(details.average_rating >= 4.0, 'Dish rating should be >= 4.0 when rating is present');
        }

        // Add to tasting list
        const addResult = this.logic.addDishToTastingList(dish.dish_id);
        this.assert(addResult && addResult.success === true, 'Adding dish to Tasting List should succeed');
        this.assert(addResult.is_in_tasting_list === true, 'Dish should be marked as in Tasting List');

        addedDishIds.push(dish.dish_id);
      }

      // Verify tasting list contents
      const tastingList = this.logic.getTastingList();
      this.assert(tastingList && Array.isArray(tastingList.items), 'Tasting List should return items array');
      this.assert(tastingList.items.length >= addedDishIds.length, 'Tasting List should contain at least the added dishes');

      for (let i = 0; i < addedDishIds.length; i++) {
        const dishId = addedDishIds[i];
        const found = tastingList.items.find(function (item) {
          return item.dish_id === dishId;
        });
        this.assert(!!found, 'Tasting List should contain dish ' + dishId);
      }

      // Verify planner overview preview for tasting list
      const planner = this.logic.getMyPlannerOverview();
      this.assert(planner && Array.isArray(planner.tasting_list_preview), 'Planner overview should include tasting list preview');

      let previewCount = 0;
      for (let i = 0; i < planner.tasting_list_preview.length; i++) {
        const previewItem = planner.tasting_list_preview[i];
        if (addedDishIds.indexOf(previewItem.dish_id) !== -1) {
          previewCount++;
        }
      }
      this.assert(previewCount >= 1, 'Planner tasting list preview should include at least one of the added dishes');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register for a free intermediate dance workshop on Saturday before 3 PM
  testTask4_RegisterFreeIntermediateDanceWorkshop() {
    const testName = 'Task 4: Register for free intermediate Saturday dance workshop';
    console.log('Testing:', testName);

    try {
      // Open Activities/Workshops page and filter options
      const activityOptions = this.logic.getActivityFilterOptions();
      this.assert(activityOptions && Array.isArray(activityOptions.activity_types), 'Activity filter options should include activity_types');

      // Search for free intermediate dance workshops on Saturday starting before 15:00
      const activities = this.logic.searchActivities('', {
        activityTypes: ['dance_workshop'],
        day: 'saturday',
        startTimeFrom: '09:00',
        startTimeTo: '15:00',
        maxPrice: 0,
        isFree: true,
        level: 'intermediate'
      });
      this.assert(Array.isArray(activities), 'searchActivities should return an array');
      this.assert(activities.length > 0, 'There should be at least one free intermediate Saturday dance workshop before 3 PM');

      const workshop = activities[0];
      const details = this.logic.getActivityDetails(workshop.activity_id);
      this.assert(details && details.activity_id === workshop.activity_id, 'Workshop details should match activity ID');
      this.assert(details.activity_type === 'dance_workshop', 'Activity should be a dance workshop');
      this.assert(details.day === 'saturday', 'Workshop should be on Saturday');
      this.assert(details.is_free === true, 'Workshop should be free');
      this.assert(details.level === 'intermediate', 'Workshop level should be intermediate');

      // Verify start time is before 15:00 using returned data
      const startDate = new Date(details.start_time);
      this.assert(!isNaN(startDate.getTime()), 'Workshop start_time should be a valid date');
      this.assert(startDate.getHours() < 15, 'Workshop should start before 3 PM based on returned start_time');

      // Register for the workshop
      const registration = this.logic.registerForWorkshop(
        workshop.activity_id,
        'Alex Taylor',
        'alex@example.com',
        '555-123-4567'
      );
      this.assert(registration && registration.success === true, 'Workshop registration should succeed');
      this.assert(!!registration.registration_id, 'Registration should return a registration_id');
      this.assert(registration.status === 'pending' || registration.status === 'confirmed', 'Registration status should be pending or confirmed');

      // Verify registration persisted via storage (using storage key mapping)
      const registrationsRaw = localStorage.getItem('workshop_registrations') || '[]';
      const registrations = JSON.parse(registrationsRaw);
      const stored = registrations.find(function (r) {
        return r.id === registration.registration_id;
      });
      this.assert(!!stored, 'Stored workshop registration should exist with returned ID');
      this.assert(stored.activity_id === workshop.activity_id, 'Stored registration should reference the correct activity');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Create a 'Saturday Night' style lineup list with headliners and local artists (adapted to available data)
  testTask5_SaturdayNightLineupList() {
    const testName = 'Task 5: Create custom night lineup list with headliners and locals';
    console.log('Testing:', testName);

    try {
      // Open Lineup page and filter options
      const lineupOptions = this.logic.getLineupFilterOptions();
      this.assert(lineupOptions && Array.isArray(lineupOptions.artist_types), 'Lineup filter options should include artist_types');

      // Use a festival day (e.g., Friday in generated data) and filter evening headliners
      const day = 'friday';
      const headlinerLineup = this.logic.getLineup(day, {
        timeStartFrom: '18:00',
        timeStartTo: '23:59',
        artistTypes: ['headliner']
      });
      this.assert(Array.isArray(headlinerLineup), 'Headliner lineup should be an array');
      this.assert(headlinerLineup.length >= 1, 'There should be at least one evening headliner in lineup');

      const headlinersToAdd = headlinerLineup.slice(0, Math.min(2, headlinerLineup.length));
      this.assert(headlinersToAdd.length >= 1, 'Should select at least one headliner');

      const selectedArtistIds = [];

      // Add selected headliners to favorites/lineup
      for (let i = 0; i < headlinersToAdd.length; i++) {
        const artist = headlinersToAdd[i];
        const artistDetails = this.logic.getArtistDetails(artist.artist_id);
        this.assert(artistDetails && artistDetails.artist_id === artist.artist_id, 'Artist details should match artist ID');
        this.assert(artistDetails.artist_type === 'headliner', 'Artist should be a headliner');

        const addResult = this.logic.addArtistToFavorites(artist.artist_id);
        this.assert(addResult && addResult.success === true, 'Adding headliner to favorites should succeed');
        this.assert(addResult.is_in_favorites === true, 'Headliner should be in favorites');

        selectedArtistIds.push(artist.artist_id);
      }

      // Now select local or emerging artists performing in the same evening window
      const localLineup = this.logic.getLineup(day, {
        timeStartFrom: '18:00',
        timeStartTo: '23:59',
        artistTypes: ['local', 'emerging']
      });
      this.assert(Array.isArray(localLineup), 'Local/emerging lineup should be an array');
      this.assert(localLineup.length >= 1, 'There should be at least one local or emerging artist in lineup');

      const localsToAdd = localLineup.slice(0, Math.min(3, localLineup.length));
      this.assert(localsToAdd.length >= 1, 'Should select at least one local/emerging artist');

      for (let i = 0; i < localsToAdd.length; i++) {
        const artist = localsToAdd[i];
        const artistDetails = this.logic.getArtistDetails(artist.artist_id);
        this.assert(artistDetails && artistDetails.artist_id === artist.artist_id, 'Local artist details should match artist ID');
        this.assert(artistDetails.artist_type === 'local' || artistDetails.artist_type === 'emerging', 'Artist should be local or emerging');

        const addResult = this.logic.addArtistToFavorites(artist.artist_id);
        this.assert(addResult && addResult.success === true, 'Adding local/emerging artist to favorites should succeed');
        this.assert(addResult.is_in_favorites === true, 'Local/emerging artist should be in favorites');

        selectedArtistIds.push(artist.artist_id);
      }

      // Verify My Lineup overview favorites
      const lineupOverview = this.logic.getMyLineupOverview();
      this.assert(lineupOverview && Array.isArray(lineupOverview.favorites), 'My Lineup overview should include favorites array');

      for (let i = 0; i < selectedArtistIds.length; i++) {
        const artistId = selectedArtistIds[i];
        const found = lineupOverview.favorites.find(function (fav) {
          return fav.artist_id === artistId;
        });
        this.assert(!!found, 'Favorites should contain artist ' + artistId);
      }

      // Create or update a custom artist list named 'Saturday Night'
      const artistList = this.logic.upsertArtistList(null, 'Saturday Night', 'Custom Saturday Night lineup');
      this.assert(artistList && artistList.artist_list_id, 'Artist list should be created with an ID');

      const assignment = this.logic.assignArtistsToList(
        artistList.artist_list_id,
        selectedArtistIds,
        true
      );
      this.assert(assignment && assignment.success === true, 'Assigning artists to custom list should succeed');
      this.assert(assignment.total_artists_in_list >= selectedArtistIds.length, 'Custom list should contain at least all assigned artists');

      // Verify list appears in My Lineup overview
      const lineupOverviewAfter = this.logic.getMyLineupOverview();
      const foundList = lineupOverviewAfter.lists.find(function (lst) {
        return lst.artist_list_id === artistList.artist_list_id;
      });
      this.assert(!!foundList, 'Custom Saturday Night list should appear in lineup overview');
      this.assert(foundList.artist_count >= selectedArtistIds.length, 'Custom list artist_count should be >= number of selected artists');

      // Verify planner overview preview for lineup
      const planner = this.logic.getMyPlannerOverview();
      this.assert(planner && Array.isArray(planner.lineup_preview), 'Planner overview should include lineup preview');

      let previewMatch = 0;
      for (let i = 0; i < planner.lineup_preview.length; i++) {
        const previewItem = planner.lineup_preview[i];
        if (selectedArtistIds.indexOf(previewItem.artist_id) !== -1) {
          previewMatch++;
        }
      }
      this.assert(previewMatch >= 1, 'Planner lineup preview should include at least one of the selected artists');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Make a 25 dollar on-site donation to Youth Music Education via credit card and opt in to newsletter
  testTask6_DonationYouthMusicEducation() {
    const testName = 'Task 6: Make 25 donation to Youth Music Education via credit card with newsletter opt-in';
    console.log('Testing:', testName);

    try {
      // Open Donate/Support page and get options
      const donationOptions = this.logic.getDonationPageOptions();
      this.assert(donationOptions && Array.isArray(donationOptions.funds), 'Donation page options should include funds');
      this.assert(Array.isArray(donationOptions.payment_methods), 'Donation page options should include payment_methods');

      // Locate Youth Music Education fund by name from actual data
      const youthFund = donationOptions.funds.find(function (f) {
        return f.name === 'Youth Music Education';
      });
      this.assert(!!youthFund, 'Youth Music Education fund should be available');

      // Ensure credit_card payment method is supported
      const creditCardSupported = donationOptions.payment_methods.some(function (pm) {
        return pm.value === 'credit_card';
      });
      this.assert(creditCardSupported, 'Credit card payment method should be supported');

      // Use exact 25 amount (either suggested or custom)
      const amount = 25;

      const donation = this.logic.submitDonation(
        youthFund.fund_id,
        amount,
        'credit_card',
        'Jordan Smith',
        'jordan@example.com',
        true
      );
      this.assert(donation && donation.success === true, 'Donation submission should succeed');
      this.assert(!!donation.donation_id, 'Donation submission should return a donation_id');
      this.assert(typeof donation.newsletter_subscription_created === 'boolean', 'Donation response should indicate newsletter subscription creation flag');

      // Verify donation persisted via storage
      const donationsRaw = localStorage.getItem('donations') || '[]';
      const donations = JSON.parse(donationsRaw);
      const storedDonation = donations.find(function (d) {
        return d.id === donation.donation_id;
      });
      this.assert(!!storedDonation, 'Stored donation should exist with returned ID');
      this.assert(storedDonation.fund_id === youthFund.fund_id, 'Stored donation fund_id should match Youth Music Education fund');
      this.assert(storedDonation.amount === amount, 'Stored donation amount should equal 25');
      this.assert(storedDonation.payment_method === 'credit_card', 'Stored donation payment_method should be credit_card');
      this.assert(storedDonation.donor_email === 'jordan@example.com', 'Stored donor email should match input');
      this.assert(storedDonation.newsletter_opt_in === true, 'Stored donation should record newsletter opt-in as true');

      // Verify newsletter subscription record
      const subscriptionsRaw = localStorage.getItem('newsletter_subscriptions') || '[]';
      const subscriptions = JSON.parse(subscriptionsRaw);
      const subscription = subscriptions.find(function (s) {
        return s.email === 'jordan@example.com';
      });
      this.assert(!!subscription, 'Newsletter subscription record should exist for donor email');
      this.assert(subscription.subscribed === true, 'Newsletter subscription should be marked as subscribed');
      this.assert(subscription.source === 'donation', 'Newsletter subscription source should be donation');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Plan family-friendly activities (adapted to Saturday afternoon data with high ratings)
  testTask7_FamilyFriendlyActivitiesPlan() {
    const testName = 'Task 7: Plan family-friendly afternoon activities';
    console.log('Testing:', testName);

    try {
      // Filter for family-friendly activities on Saturday afternoon with good ratings
      const activities = this.logic.searchActivities('', {
        day: 'saturday',
        startTimeFrom: '10:00',
        startTimeTo: '17:00',
        familyFriendlyOnly: true,
        minRating: 4.4
      });
      this.assert(Array.isArray(activities), 'searchActivities should return an array for family plan');
      this.assert(activities.length >= 2, 'There should be at least two highly rated family-friendly Saturday afternoon activities');

      const toSelect = activities.slice(0, 2);
      const addedActivityIds = [];

      for (let i = 0; i < toSelect.length; i++) {
        const act = toSelect[i];
        const details = this.logic.getActivityDetails(act.activity_id);
        this.assert(details && details.activity_id === act.activity_id, 'Activity details should match ID');
        this.assert(details.is_family_friendly === true, 'Activity should be family-friendly');
        if (typeof details.average_rating === 'number') {
          this.assert(details.average_rating >= 4.4, 'Activity rating should be >= 4.4 when rating exists');
        }

        const startDate = new Date(details.start_time);
        this.assert(!isNaN(startDate.getTime()), 'Activity start_time should be valid');
        this.assert(startDate.getHours() >= 10 && startDate.getHours() < 17, 'Activity should start in afternoon window');

        const addResult = this.logic.addActivityToFamilyPlan(act.activity_id);
        this.assert(addResult && addResult.success === true, 'Adding activity to Family Plan should succeed');
        this.assert(addResult.is_in_family_plan === true, 'Activity should be flagged as in Family Plan');

        addedActivityIds.push(act.activity_id);
      }

      // Verify Family Plan contents
      const familyPlan = this.logic.getFamilyPlan();
      this.assert(familyPlan && Array.isArray(familyPlan.items), 'Family Plan should return items array');
      this.assert(familyPlan.items.length >= addedActivityIds.length, 'Family Plan should contain at least the added activities');

      for (let i = 0; i < addedActivityIds.length; i++) {
        const actId = addedActivityIds[i];
        const found = familyPlan.items.find(function (item) {
          return item.activity_id === actId;
        });
        this.assert(!!found, 'Family Plan should contain activity ' + actId);
      }

      // Verify planner overview preview for family plan
      const planner = this.logic.getMyPlannerOverview();
      this.assert(planner && Array.isArray(planner.family_plan_preview), 'Planner overview should include family plan preview');

      let previewMatches = 0;
      for (let i = 0; i < planner.family_plan_preview.length; i++) {
        const previewItem = planner.family_plan_preview[i];
        if (addedActivityIds.indexOf(previewItem.activity_id) !== -1) {
          previewMatches++;
        }
      }
      this.assert(previewMatches >= 1, 'Planner family plan preview should include at least one of the added activities');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Pin nearby food stalls (main, dessert, drink) within short walking distance from Main Stage
  testTask8_PinNearbyFoodStallsOnMap() {
    const testName = 'Task 8: Pin nearby food stalls around Main Stage in route order';
    console.log('Testing:', testName);

    try {
      // Open festival map and get main stage location
      const mapOverview = this.logic.getMapOverview();
      this.assert(mapOverview && mapOverview.main_stage_location, 'Map overview should include main stage location');
      const mainStageLocation = mapOverview.main_stage_location;
      this.assert(mainStageLocation.map_location_id, 'Main stage map_location_id should be present');

      // Find food vendors near main stage within 3-minute walk
      const vendorsNear = this.logic.getFoodVendorsNearLocation(
        mainStageLocation.map_location_id,
        3,
        ['main', 'dessert', 'drink']
      );
      this.assert(Array.isArray(vendorsNear), 'getFoodVendorsNearLocation should return an array');
      this.assert(vendorsNear.length > 0, 'There should be at least one food vendor near Main Stage');

      // Select one vendor of each type: main, dessert, drink
      const selectedByType = {
        main: null,
        dessert: null,
        drink: null
      };

      for (let i = 0; i < vendorsNear.length; i++) {
        const v = vendorsNear[i];
        if (!selectedByType.main && v.vendor_food_type === 'main') {
          selectedByType.main = v;
        } else if (!selectedByType.dessert && v.vendor_food_type === 'dessert') {
          selectedByType.dessert = v;
        } else if (!selectedByType.drink && v.vendor_food_type === 'drink') {
          selectedByType.drink = v;
        }
      }

      this.assert(!!selectedByType.main, 'Should find at least one main-course vendor near Main Stage');
      this.assert(!!selectedByType.dessert, 'Should find at least one dessert vendor near Main Stage');
      this.assert(!!selectedByType.drink, 'Should find at least one drink vendor near Main Stage');

      // Pin map locations for the three selected vendors
      const pinResults = {};
      const stallTypes = ['main', 'dessert', 'drink'];

      for (let i = 0; i < stallTypes.length; i++) {
        const type = stallTypes[i];
        const vendor = selectedByType[type];
        const pin = this.logic.pinMapLocation(vendor.map_location_id, null);
        this.assert(pin && pin.success === true, 'Pinning ' + type + ' vendor location should succeed');
        this.assert(!!pin.saved_map_location_id, 'Pinned ' + type + ' vendor should return saved_map_location_id');
        pinResults[type] = pin.saved_map_location_id;
      }

      // Verify pinned locations via Saved Locations panel
      const saved = this.logic.getSavedMapLocations();
      this.assert(saved && Array.isArray(saved.items), 'Saved map locations should return items array');

      for (let i = 0; i < stallTypes.length; i++) {
        const type = stallTypes[i];
        const savedId = pinResults[type];
        const expectedVendor = selectedByType[type];
        const found = saved.items.find(function (item) {
          return item.saved_map_location_id === savedId;
        });
        this.assert(!!found, 'Saved locations should contain pinned ' + type + ' vendor');
        this.assert(found.related_vendor_food_type === type, 'Saved ' + type + ' vendor should have correct vendor food type');
        if (typeof found.walking_time_from_main_stage === 'number') {
          this.assert(found.walking_time_from_main_stage <= 3, type + ' vendor walking time should be <= 3 minutes');
        }
      }

      // Arrange the three pinned stalls in order: mains first, dessert second, drinks third
      const orderedSavedLocationIds = [
        pinResults.main,
        pinResults.dessert,
        pinResults.drink
      ];

      const reorderResult = this.logic.reorderSavedMapLocations(orderedSavedLocationIds);
      this.assert(reorderResult && reorderResult.success === true, 'Reordering saved map locations should succeed');
      this.assert(Array.isArray(reorderResult.items), 'Reorder result should include items array');

      // Confirm ordering matches requested sequence
      const reordered = reorderResult.items;
      // Ensure that the first three in order correspond to our three saved locations in correct order
      const orderMap = {};
      for (let i = 0; i < reordered.length; i++) {
        const item = reordered[i];
        orderMap[item.saved_map_location_id] = item.route_order;
      }

      this.assert(orderMap[pinResults.main] < orderMap[pinResults.dessert], 'Main stall should appear before dessert stall in route order');
      this.assert(orderMap[pinResults.dessert] < orderMap[pinResults.drink], 'Dessert stall should appear before drink stall in route order');

      // Verify planner overview map preview
      const planner = this.logic.getMyPlannerOverview();
      this.assert(planner && Array.isArray(planner.saved_map_locations_preview), 'Planner overview should include saved map locations preview');

      let previewHasMain = false;
      let previewHasDessert = false;
      let previewHasDrink = false;
      for (let i = 0; i < planner.saved_map_locations_preview.length; i++) {
        const previewItem = planner.saved_map_locations_preview[i];
        if (previewItem.saved_map_location_id === pinResults.main) previewHasMain = true;
        if (previewItem.saved_map_location_id === pinResults.dessert) previewHasDessert = true;
        if (previewItem.saved_map_location_id === pinResults.drink) previewHasDrink = true;
      }
      this.assert(previewHasMain && previewHasDessert && previewHasDrink, 'Planner map preview should include all three pinned stalls');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording methods
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

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
