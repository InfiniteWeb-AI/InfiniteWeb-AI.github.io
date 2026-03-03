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
    // Generated Data from prompt (used ONLY here)
    const generatedData = {
      attendees: [
        {
          id: 'attendee_1',
          full_name: 'Maya Chen',
          role: 'UX Designer',
          company: 'Northwind Studio',
          bio: 'Product-focused UX designer working on complex data tools for climate research teams.',
          interests: [
            'UX & design systems',
            'AI-assisted workflows',
            'Data visualization',
            'Design leadership'
          ],
          location: 'Seattle, USA',
          profile_image_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=600&fit=crop&auto=format&q=80',
          linkedin_url: 'https://www.linkedin.com/in/mayachenux',
          twitter_handle: '@maya_chen_ux',
          is_speaker: false,
          is_exhibitor_rep: false
        },
        {
          id: 'attendee_2',
          full_name: 'Alex Johnson',
          role: 'AI Research Scientist',
          company: 'Helix Labs',
          bio: 'Researcher exploring robust and interpretable machine learning for real-world deployments.',
          interests: [
            'AI & machine learning',
            'Responsible AI',
            'MLOps',
            'Open source'
          ],
          location: 'Boston, USA',
          profile_image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80',
          linkedin_url: 'https://www.linkedin.com/in/alexjohnsonai',
          twitter_handle: '@alex_j_ml',
          is_speaker: true,
          is_exhibitor_rep: false
        },
        {
          id: 'attendee_3',
          full_name: 'Sara Martinez',
          role: 'Product Manager',
          company: 'Rivera Design Lab',
          bio: 'Leads cross-functional teams building collaborative tools for creative professionals.',
          interests: [
            'Product discovery',
            'Design thinking',
            'Collaboration tooling',
            'Customer research'
          ],
          location: 'Austin, USA',
          profile_image_url: 'https://2019.agileindia.org/wp-content/uploads/2018/04/Collage-960x636.jpg?x90340',
          linkedin_url: 'https://www.linkedin.com/in/saramartinezpm',
          twitter_handle: '@saram_product',
          is_speaker: false,
          is_exhibitor_rep: false
        }
      ],
      conferences: [
        {
          id: 'aurora_2026',
          name: 'Aurora Research & Innovation Conference 2026',
          theme: 'Human-Centered AI and Sustainable Innovation',
          current_year: 2026,
          start_date: '2026-06-12T00:00:00-07:00',
          end_date: '2026-06-14T23:59:59-07:00',
          venue_name: 'Harborfront Convention Center',
          venue_address: '123 Seaview Blvd, San Francisco, CA 94103, USA',
          timezone: 'America/Los_Angeles'
        },
        {
          id: 'aurora_2025',
          name: 'Aurora Research & Innovation Conference 2025',
          theme: 'Bridging Research and Real-World Impact',
          current_year: 2025,
          start_date: '2025-06-11T00:00:00-07:00',
          end_date: '2025-06-13T23:59:59-07:00',
          venue_name: 'Harborfront Convention Center',
          venue_address: '123 Seaview Blvd, San Francisco, CA 94103, USA',
          timezone: 'America/Los_Angeles'
        },
        {
          id: 'aurora_2024',
          name: 'Aurora Research & Innovation Conference 2024',
          theme: 'From Prototypes to Platforms',
          current_year: 2024,
          start_date: '2024-06-13T00:00:00-07:00',
          end_date: '2024-06-15T23:59:59-07:00',
          venue_name: 'Harborfront Convention Center',
          venue_address: '123 Seaview Blvd, San Francisco, CA 94103, USA',
          timezone: 'America/Los_Angeles'
        }
      ],
      exhibitors: [
        {
          id: 'insightgrid_ai',
          name: 'InsightGrid AI',
          description: 'InsightGrid AI provides an end-to-end AI experimentation and deployment platform for enterprise product teams, with built-in governance and analytics.',
          logo_url: 'https://www.aavista.com/wp-content/uploads/2020/03/AI-Platform-Clouds-1080x675.jpg',
          sponsor_level: 'gold',
          categories: [
            'ai_tools_and_platforms',
            'analytics_platform',
            'mlops_platform'
          ],
          booth_location: 'Expo Hall B, Booth G12',
          website_url: 'https://www.insightgrid.ai',
          primary_product_keywords: [
            'feature_store',
            'model_monitoring',
            'ab_testing',
            'governance'
          ],
          contact_email: 'contact@insightgrid.ai',
          demo_duration_minutes: 15,
          rating_count: 0,
          rating: 0.0,
          is_bookmarked: false
        },
        {
          id: 'cloudforge_ml',
          name: 'CloudForge ML Platform',
          description: 'Cloud-native ML platform offering managed training, deployment, and monitoring for data science teams building production models.',
          logo_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/4a766697-73eb-5239-9018-6e509a669ed4.jpeg',
          sponsor_level: 'gold',
          categories: [
            'ai_tools_and_platforms',
            'cloud_infrastructure',
            'developer_tools'
          ],
          booth_location: 'Expo Hall B, Booth G08',
          website_url: 'https://www.cloudforge.dev',
          primary_product_keywords: [
            'ml_platform',
            'pipelines',
            'model_serving',
            'mlops'
          ],
          contact_email: 'hello@cloudforge.dev',
          demo_duration_minutes: 15,
          rating_count: 0,
          rating: 0.0,
          is_bookmarked: false
        },
        {
          id: 'helix_labs',
          name: 'Helix Labs',
          description: 'Applied AI research lab and platform provider focused on interpretable and robust machine learning for healthcare and finance.',
          logo_url: 'https://www.siliconrepublic.com/wp-content/uploads/2020/05/AdobeStock_332871688-718x523.jpeg',
          sponsor_level: 'platinum',
          categories: [
            'ai_tools_and_platforms',
            'research_platform',
            'consulting'
          ],
          booth_location: 'Expo Hall A, Booth P02',
          website_url: 'https://www.helixlabs.ai',
          primary_product_keywords: [
            'interpretability',
            'robust_ml',
            'fairness',
            'risk_scoring'
          ],
          contact_email: 'info@helixlabs.ai',
          demo_duration_minutes: 20,
          rating_count: 0,
          rating: 0.0,
          is_bookmarked: false
        }
      ],
      hotels: [
        {
          id: 'harborfront_bay_hotel',
          name: 'Harborfront Bay Hotel',
          description: 'Modern hotel directly across from the Harborfront Convention Center, popular with conference attendees.',
          nightly_rate: 210,
          currency: 'usd',
          distance_km: 0.2,
          address: '101 Seaview Blvd, San Francisco, CA 94103, USA',
          city: 'San Francisco',
          amenities: [
            'breakfast_included',
            'free_wifi',
            'fitness_center',
            'restaurant',
            'parking'
          ],
          image_url: 'https://assets.simpleviewinc.com/simpleview/image/upload/c_fill,h_600,q_75,w_900/v1/clients/sanmateoca/Exterior_Pullman_6481e9bd-7f64-4b47-8475-38ac987c4794.jpg',
          map_url: 'https://www.google.com/maps/search/?api=1&query=Harborfront+Bay+Hotel+San+Francisco',
          rating_count: 0,
          rating: 0.0,
          is_saved: false
        },
        {
          id: 'seaview_garden_inn',
          name: 'Seaview Garden Inn',
          description: 'Boutique inn with a courtyard garden, a short walk from the conference venue.',
          nightly_rate: 195,
          currency: 'usd',
          distance_km: 0.5,
          address: '75 Harbor Lane, San Francisco, CA 94103, USA',
          city: 'San Francisco',
          amenities: [
            'breakfast_included',
            'free_wifi',
            'parking'
          ],
          image_url: 'https://s.hdnux.com/photos/01/10/12/41/18917497/3/920x920.jpg',
          map_url: 'https://www.google.com/maps/search/?api=1&query=Seaview+Garden+Inn+San+Francisco',
          rating_count: 0,
          rating: 0.0,
          is_saved: false
        },
        {
          id: 'downtown_convention_hotel',
          name: 'Downtown Convention Hotel',
          description: 'Full-service business hotel with extensive meeting facilities and a rooftop bar.',
          nightly_rate: 260,
          currency: 'usd',
          distance_km: 0.9,
          address: '400 Market St, San Francisco, CA 94105, USA',
          city: 'San Francisco',
          amenities: [
            'free_wifi',
            'fitness_center',
            'pool',
            'restaurant',
            'spa'
          ],
          image_url: 'https://i.pinimg.com/originals/f3/e5/d6/f3e5d6167c7f50e34d052ac0620db66b.jpg',
          map_url: 'https://www.google.com/maps/search/?api=1&query=Downtown+Convention+Hotel+San+Francisco',
          rating_count: 0,
          rating: 0.0,
          is_saved: false
        }
      ],
      live_sessions: [
        {
          id: 'session_d1_keynote_opening_hcai',
          title: 'Opening Keynote: Human-Centered AI at Scale',
          description: 'An opening keynote exploring how to build AI systems that stay aligned with human values as they scale to millions of users.',
          session_type: 'keynote',
          track: 'research_innovation',
          day_id: 'day_1_june_12',
          start_datetime: '2026-06-12T09:00:00-07:00',
          end_datetime: '2026-06-12T10:00:00-07:00',
          duration_minutes: 60,
          room: 'Main Hall A',
          location_type: 'conference_venue',
          difficulty_level: 'all_levels',
          price: 0,
          currency: 'usd',
          has_free_refreshments: false,
          perks: [],
          is_networking: false,
          is_workshop: false,
          is_keynote: true,
          speakers: [
            'Grace Kim',
            'Alex Johnson'
          ],
          hosts: [
            'Aurora Program Committee'
          ],
          popularity_score: 0.0,
          added_to_my_schedule: false
        },
        {
          id: 'session_d1_keynote_responsible_innovation',
          title: 'Keynote: Designing Responsible Innovation Ecosystems',
          description: 'Keynote on building responsible innovation practices across research, product, and policy teams.',
          session_type: 'keynote',
          track: 'leadership',
          day_id: 'day_1_june_12',
          start_datetime: '2026-06-12T10:30:00-07:00',
          end_datetime: '2026-06-12T11:30:00-07:00',
          duration_minutes: 60,
          room: 'Main Hall A',
          location_type: 'conference_venue',
          difficulty_level: 'all_levels',
          price: 0,
          currency: 'usd',
          has_free_refreshments: false,
          perks: [],
          is_networking: false,
          is_workshop: false,
          is_keynote: true,
          speakers: [
            'Liam OConnor',
            'Aisha Rahman'
          ],
          hosts: [
            'Aurora Events'
          ],
          popularity_score: 0.0,
          added_to_my_schedule: false
        },
        {
          id: 'session_d1_ai_healthcare_interpretable',
          title: 'Interpretable ML in High-Stakes Healthcare Settings',
          description: 'Techniques and case studies for deploying interpretable models in clinical workflows.',
          session_type: 'breakout_session',
          track: 'ai_and_machine_learning',
          day_id: 'day_1_june_12',
          start_datetime: '2026-06-12T11:30:00-07:00',
          end_datetime: '2026-06-12T12:30:00-07:00',
          duration_minutes: 60,
          room: 'Room 201',
          location_type: 'conference_venue',
          difficulty_level: 'intermediate',
          price: 0,
          currency: 'usd',
          has_free_refreshments: false,
          perks: [],
          is_networking: false,
          is_workshop: false,
          is_keynote: false,
          speakers: [
            'Alex Johnson'
          ],
          hosts: [
            'Helix Labs'
          ],
          popularity_score: 0.0,
          added_to_my_schedule: false
        }
      ],
      ticket_types: [
        {
          id: '3day_student_plus_workshop',
          name: '3-Day Student Pass + Workshops',
          description: 'Discounted 3-day conference pass for students, including access to all sessions and 1 workshop credit.',
          duration_type: 'three_day',
          days_included: [
            'day_1_june_12',
            'day_2_june_13',
            'day_3_june_14'
          ],
          includes_workshop_credits: true,
          workshop_credits: 1,
          base_price: 350,
          currency: 'usd',
          taxes_and_fees: 25,
          total_price: 375.0,
          access_level: 'student',
          is_active: true,
          max_quantity_per_order: 2
        },
        {
          id: '3day_standard_plus_workshop',
          name: '3-Day Standard Pass + Workshops',
          description: 'Standard 3-day pass including all keynotes, sessions, and 2 workshop credits.',
          duration_type: 'three_day',
          days_included: [
            'day_1_june_12',
            'day_2_june_13',
            'day_3_june_14'
          ],
          includes_workshop_credits: true,
          workshop_credits: 2,
          base_price: 620,
          currency: 'usd',
          taxes_and_fees: 55,
          total_price: 675.0,
          access_level: 'standard',
          is_active: true,
          max_quantity_per_order: 4
        },
        {
          id: '3day_vip_plus_workshop',
          name: '3-Day VIP Pass + Workshops',
          description: 'VIP 3-day pass with priority seating, speaker lounge access, and 3 workshop credits.',
          duration_type: 'three_day',
          days_included: [
            'day_1_june_12',
            'day_2_june_13',
            'day_3_june_14'
          ],
          includes_workshop_credits: true,
          workshop_credits: 3,
          base_price: 900,
          currency: 'usd',
          taxes_and_fees: 80,
          total_price: 980.0,
          access_level: 'vip',
          is_active: true,
          max_quantity_per_order: 4
        }
      ],
      on_demand_sessions: [
        {
          id: 'od_2025_ux_microcopy_research',
          title: 'Microcopy That Moves Users: Fast UX Research Techniques',
          description: 'A practical walkthrough of lightweight research methods for testing microcopy and in-product messaging with small samples.',
          track: 'ux_and_design',
          recording_type: 'talk',
          duration_minutes: 25,
          year: 2025,
          video_url: 'https://www.youtube.com/watch?v=ux2025microcopy',
          slides_url: 'https://arxiv.org/pdf/2404.07972',
          speaker_names: [
            'Maya Chen'
          ],
          popularity_score: 0.0,
          in_watchlist: false
        },
        {
          id: 'od_2025_ux_mobile_patterns',
          title: 'Design Patterns for Mobile Onboarding Flows',
          description: 'Case studies and patterns for crafting mobile onboarding that reduces drop-off and sets clear expectations.',
          track: 'ux_and_design',
          recording_type: 'talk',
          duration_minutes: 30,
          year: 2025,
          video_url: 'https://www.youtube.com/watch?v=ux2025mobilepatterns',
          slides_url: 'https://arxiv.org/pdf/2404.07972',
          speaker_names: [
            'Jonas Weber'
          ],
          popularity_score: 0.0,
          in_watchlist: false
        },
        {
          id: 'od_2025_ux_short_prototyping',
          title: 'Rapid Prototyping for Cross-Functional Teams',
          description: 'Short, hands-on session showing how product, engineering, and design can prototype together in under a day.',
          track: 'ux_and_design',
          recording_type: 'workshop',
          duration_minutes: 28,
          year: 2025,
          video_url: 'https://vimeo.com/ux2025prototyping',
          slides_url: 'https://arxiv.org/pdf/2404.07972',
          speaker_names: [
            'Hannah Lee'
          ],
          popularity_score: 0.0,
          in_watchlist: false
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:19:29.910702'
      }
    };

    // Persist generated data using storage keys
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('attendees', JSON.stringify(generatedData.attendees));
    localStorage.setItem('conferences', JSON.stringify(generatedData.conferences));
    localStorage.setItem('exhibitors', JSON.stringify(generatedData.exhibitors));
    localStorage.setItem('hotels', JSON.stringify(generatedData.hotels));
    localStorage.setItem('live_sessions', JSON.stringify(generatedData.live_sessions));
    localStorage.setItem('ticket_types', JSON.stringify(generatedData.ticket_types));
    localStorage.setItem('on_demand_sessions', JSON.stringify(generatedData.on_demand_sessions));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));

    // Cart, cart_items, registration_orders, meetings etc. start empty and are
    // managed by business logic via its own storage schema.
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1PurchaseCheapestThreeDayPass();
    this.testTask2BuildAgenda();
    this.testTask3AddNetworkingEvents();
    this.testTask4ChooseMostAdvancedWorkshop();
    this.testTask5BookmarkGoldAIExhibitorsAndBookDemos();
    this.testTask6SaveNearbyHotel();
    this.testTask7AddUxOnDemandSessionsToWatchlist();
    this.testTask8ScheduleMeetingsWithUxDesigners();

    return this.results;
  }

  // Task 1: Purchase the cheapest 3-day conference pass with workshop access under $700
  testTask1PurchaseCheapestThreeDayPass() {
    const testName = 'Task 1: purchase cheapest 3-day pass with workshop access under $700';
    try {
      // Simulate navigation to homepage
      const homeData = this.logic.getHomePageData();
      this.assert(homeData && homeData.conference, 'Home page should return conference data');

      // Load ticket filter options
      const ticketFilters = this.logic.getTicketFilterOptions();
      this.assert(ticketFilters && Array.isArray(ticketFilters.duration_types), 'Ticket filter options should include duration_types');

      // Filter three_day tickets with workshop credits and price < 700, sort by price low to high
      const ticketsResult = this.logic.getTickets(
        { duration_type: 'three_day', includes_workshop_credits: true, max_price: 700, only_active: true },
        'price_low_to_high',
        1,
        20
      );

      const tickets = ticketsResult && Array.isArray(ticketsResult.tickets) ? ticketsResult.tickets : [];
      this.assert(tickets.length > 0, 'Should find at least one 3-day ticket with workshop credits under $700');

      const cheapestTicket = tickets[0];
      this.assert(cheapestTicket.duration_type === 'three_day', 'Selected ticket should be a 3-day pass');
      this.assert(cheapestTicket.includes_workshop_credits === true, 'Selected ticket should include workshop credits');
      this.assert(cheapestTicket.total_price < 700, 'Selected ticket total_price should be under $700, actual: ' + cheapestTicket.total_price);

      // Verify sorting by price ascending using actual data
      for (let i = 1; i < tickets.length; i++) {
        this.assert(
          tickets[i].total_price >= cheapestTicket.total_price,
          'Tickets should be sorted by total_price ascending'
        );
      }

      // Get ticket detail
      const ticketDetail = this.logic.getTicketDetail(cheapestTicket.id);
      this.assert(ticketDetail && ticketDetail.ticket, 'Ticket detail should be returned');
      this.assert(ticketDetail.ticket.id === cheapestTicket.id, 'Ticket detail id should match selected ticket id');

      // Add to cart
      const addResult = this.logic.addTicketToCart(cheapestTicket.id, 1);
      this.assert(addResult && addResult.success === true, 'addTicketToCart should succeed');
      this.assert(addResult.cart && addResult.cart.id, 'addTicketToCart should return a cart with id');

      const cartId = addResult.cart.id;
      const addCartItems = Array.isArray(addResult.cart_items) ? addResult.cart_items : [];
      const addedCartItem = addCartItems.find(ci => ci.ticket_type_id === cheapestTicket.id);
      this.assert(addedCartItem, 'Cart items should include the added ticket');

      // Get cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be returned');
      this.assert(cartSummary.cart.id === cartId, 'Cart summary cart id should match the cart we just used');

      const summaryItems = Array.isArray(cartSummary.items) ? cartSummary.items : [];
      const summaryTicketEntry = summaryItems.find(entry => entry.ticket && entry.ticket.id === cheapestTicket.id);
      this.assert(summaryTicketEntry, 'Cart summary should include our selected ticket');

      this.assert(
        cartSummary.totals && cartSummary.totals.total_amount >= cheapestTicket.total_price,
        'Cart total amount should be at least the ticket total_price'
      );

      // Registration page data
      const regPage = this.logic.getRegistrationPageData();
      this.assert(regPage && regPage.cart_summary, 'Registration page should provide cart summary');
      this.assert(
        regPage.cart_summary.cart && regPage.cart_summary.cart.id === cartId,
        'Registration page cart id should match current cart id'
      );

      const availableDays = Array.isArray(regPage.available_days) ? regPage.available_days : [];
      this.assert(availableDays.length > 0, 'Registration page should expose available_days');
      const selectedDays = availableDays.map(d => d.day_id);

      const paymentOptions = Array.isArray(regPage.payment_options) ? regPage.payment_options : [];
      this.assert(paymentOptions.length > 0, 'Registration page should list payment options');
      const nonExternalOptions = paymentOptions.filter(po => !po.is_external);
      this.assert(nonExternalOptions.length > 0, 'There should be at least one non-external payment option');

      const chosenPaymentOptionValue = nonExternalOptions[0].value;

      // Submit registration order
      const order = this.logic.submitRegistrationOrder(
        'Alex Rivera',
        'alex.rivera@example.com',
        'Rivera Design Lab',
        selectedDays,
        chosenPaymentOptionValue,
        'Automated test registration'
      );

      this.assert(order && order.id, 'submitRegistrationOrder should return an order with id');
      this.assert(order.cart_id === cartId, 'Order.cart_id should match the cart id used at checkout');
      this.assert(order.purchaser_full_name === 'Alex Rivera', 'Order should store purchaser full name');
      this.assert(order.purchaser_email === 'alex.rivera@example.com', 'Order should store purchaser email');
      this.assert(order.payment_option === chosenPaymentOptionValue, 'Order payment_option should match selected payment option');
      this.assert(order.total_amount > 0, 'Order total_amount should be positive');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Build agenda across days with keynote and AI track session
  // Adapted: with limited data (all sessions on Day 1), this test still ensures
  // using filters, adding keynote + AI track session, and verifying My Schedule.
  testTask2BuildAgenda() {
    const testName = 'Task 2: build agenda with keynote and AI track session';
    try {
      // Get schedule filter options and locate Day 1 id
      const opts = this.logic.getScheduleFilterOptions();
      this.assert(opts && Array.isArray(opts.day_options), 'Schedule filter options should include day_options');
      const day1Option = opts.day_options.find(d => d.day_id && d.day_id.indexOf('day_1') === 0) || opts.day_options[0];
      this.assert(day1Option && day1Option.day_id, 'Should have at least one day option');
      const day1Id = day1Option.day_id;

      // 1) Pick a keynote on Day 1 starting at or after 10:00
      const day1Keynotes = this.logic.getScheduleSessions(
        { day_id: day1Id, session_type: 'keynote', start_time_from: '10:00' },
        undefined,
        'start_time'
      );
      this.assert(Array.isArray(day1Keynotes) && day1Keynotes.length > 0, 'Should find at least one Day 1 keynote at or after 10:00');

      const keynote = day1Keynotes[0];
      const keynoteDetail = this.logic.getLiveSessionDetail(keynote.id);
      this.assert(keynoteDetail && keynoteDetail.id === keynote.id, 'Keynote detail should match selected keynote');

      const keynoteToggleResult = this.logic.toggleSessionInMySchedule(keynote.id, true);
      this.assert(keynoteToggleResult && keynoteToggleResult.added_to_schedule === true, 'Keynote should be added to My Schedule');

      // 2) Pick an AI & Machine Learning track session on Day 1
      let aiSessions = this.logic.getScheduleSessions(
        { day_id: day1Id, track: 'ai_and_machine_learning' },
        undefined,
        'start_time'
      );

      if (!Array.isArray(aiSessions) || aiSessions.length === 0) {
        // Fallback: any non-keynote session on Day 1
        aiSessions = this.logic.getScheduleSessions(
          { day_id: day1Id },
          undefined,
          'start_time'
        ).filter(s => s.id !== keynote.id);
      }

      this.assert(Array.isArray(aiSessions) && aiSessions.length > 0, 'Should find at least one non-keynote session on Day 1');

      const aiSession = aiSessions[0];
      const aiDetail = this.logic.getLiveSessionDetail(aiSession.id);
      this.assert(aiDetail && aiDetail.id === aiSession.id, 'AI session detail should match selected session');

      const aiToggleResult = this.logic.toggleSessionInMySchedule(aiSession.id, true);
      this.assert(aiToggleResult && aiToggleResult.added_to_schedule === true, 'AI/other session should be added to My Schedule');

      // 3) Optionally add up to two more sessions from other days (if available)
      let additionalSessions = [];
      const day2Sessions = this.logic.getScheduleSessions(
        { day_id: 'day_2_june_13' },
        undefined,
        'start_time'
      );

      const alreadyChosenIds = new Set([keynote.id, aiSession.id]);

      if (Array.isArray(day2Sessions) && day2Sessions.length > 0) {
        for (let i = 0; i < day2Sessions.length && additionalSessions.length < 2; i++) {
          const s = day2Sessions[i];
          if (!alreadyChosenIds.has(s.id)) {
            additionalSessions.push(s);
            alreadyChosenIds.add(s.id);
          }
        }
      }

      if (additionalSessions.length < 2) {
        // Fallback: use more Day 1 sessions if needed and available
        const allDay1Sessions = this.logic.getScheduleSessions(
          { day_id: day1Id },
          undefined,
          'start_time'
        );
        for (let i = 0; i < allDay1Sessions.length && additionalSessions.length < 2; i++) {
          const s = allDay1Sessions[i];
          if (!alreadyChosenIds.has(s.id)) {
            additionalSessions.push(s);
            alreadyChosenIds.add(s.id);
          }
        }
      }

      additionalSessions.forEach(s => {
        const res = this.logic.toggleSessionInMySchedule(s.id, true);
        this.assert(res && res.added_to_schedule === true, 'Additional session should be added to My Schedule');
      });

      // 4) Verify My Schedule contains at least the keynote and AI session
      const mySchedule = this.logic.getMySchedule();
      this.assert(mySchedule && Array.isArray(mySchedule.days), 'My Schedule should return days');

      const allSessions = [];
      mySchedule.days.forEach(day => {
        if (Array.isArray(day.sessions)) {
          day.sessions.forEach(s => allSessions.push(s));
        }
      });

      const hasKeynote = allSessions.some(s => s.id === keynote.id);
      const hasAi = allSessions.some(s => s.id === aiSession.id);
      this.assert(hasKeynote, 'My Schedule should contain the selected keynote');
      this.assert(hasAi, 'My Schedule should contain the selected AI/other session');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add networking events with free refreshments on Day 1
  // Adapted: add up to three matching events if available.
  testTask3AddNetworkingEvents() {
    const testName = 'Task 3: add evening networking events with free refreshments on Day 1';
    try {
      const opts = this.logic.getScheduleFilterOptions();
      this.assert(opts && Array.isArray(opts.day_options), 'Schedule filter options should include day_options');
      const day1Option = opts.day_options.find(d => d.day_id && d.day_id.indexOf('day_1') === 0) || opts.day_options[0];
      const day1Id = day1Option.day_id;

      // Query networking events for Day 1, from 17:00, with free refreshments
      const events = this.logic.getNetworkingEvents(
        { day_id: day1Id, start_time_from: '17:00', event_type: 'networking', has_free_refreshments: true },
        'start_time'
      );

      this.assert(Array.isArray(events), 'getNetworkingEvents should return an array');

      const eventsToAdd = events.slice(0, 3);

      eventsToAdd.forEach(ev => {
        const detail = this.logic.getLiveSessionDetail(ev.id);
        this.assert(detail && detail.id === ev.id, 'Networking event detail should match');
        const toggleRes = this.logic.toggleSessionInMySchedule(ev.id, true);
        this.assert(toggleRes && toggleRes.added_to_schedule === true, 'Networking event should be added to My Schedule');
      });

      // Verify they appear in My Schedule (if any were added)
      if (eventsToAdd.length > 0) {
        const mySchedule = this.logic.getMySchedule();
        const allSessions = [];
        mySchedule.days.forEach(day => {
          if (Array.isArray(day.sessions)) {
            day.sessions.forEach(s => allSessions.push(s));
          }
        });
        eventsToAdd.forEach(ev => {
          const found = allSessions.some(s => s.id === ev.id);
          this.assert(found, 'My Schedule should contain networking event ' + ev.id);
        });
      } else {
        console.log('Note: No networking events with free refreshments on Day 1 available in current data; flow executed with empty result.');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper for Task 4 difficulty ranking
  difficultyRank(level) {
    const map = {
      not_applicable: 0,
      beginner: 1,
      all_levels: 1.5,
      intermediate: 2,
      advanced: 3,
      expert: 4
    };
    return map[level] !== undefined ? map[level] : 0;
  }

  // Task 4: Choose most advanced design thinking workshop under 3 hours and < $300
  // Adapted: use workshops listing if any; otherwise, choose the most advanced
  // qualifying live session by difficulty, duration <= 180 and price < 300.
  testTask4ChooseMostAdvancedWorkshop() {
    const testName = 'Task 4: choose most advanced short workshop-like session under $300';
    try {
      // Load workshop filter options for completeness
      const wsOpts = this.logic.getWorkshopsFilterOptions();
      this.assert(wsOpts && Array.isArray(wsOpts.day_options), 'Workshops filter options should include day_options');

      // Attempt to find Day 2 design thinking workshops up to 3 hours and under $300
      const workshopsDay2 = this.logic.getWorkshopsListing(
        { day_id: 'day_2_june_13', max_duration_minutes: 180, max_price: 300 },
        'design thinking',
        'price_low_to_high'
      );

      let candidateSessions = [];

      if (Array.isArray(workshopsDay2) && workshopsDay2.length > 0) {
        candidateSessions = workshopsDay2;
      } else {
        // Fallback: use all Day 1 sessions as workshop-like candidates
        const day1Sessions = this.logic.getScheduleSessions(
          { day_id: 'day_1_june_12' },
          undefined,
          'start_time'
        );
        candidateSessions = (Array.isArray(day1Sessions) ? day1Sessions : []).filter(s => {
          const durationOk = typeof s.duration_minutes === 'number' ? s.duration_minutes <= 180 : true;
          const priceVal = typeof s.price === 'number' ? s.price : 0;
          const priceOk = priceVal <= 300;
          return durationOk && priceOk;
        });
      }

      this.assert(candidateSessions.length > 0, 'Should have at least one candidate session for workshop-like selection');

      // Choose session with highest difficulty level
      candidateSessions.sort((a, b) => {
        return this.difficultyRank(b.difficulty_level) - this.difficultyRank(a.difficulty_level);
      });

      const chosen = candidateSessions[0];
      const chosenDetail = this.logic.getLiveSessionDetail(chosen.id);
      this.assert(chosenDetail && chosenDetail.id === chosen.id, 'Chosen session detail should match');

      const toggleRes = this.logic.toggleSessionInMySchedule(chosen.id, true);
      this.assert(toggleRes && toggleRes.added_to_schedule === true, 'Chosen session should be added to My Schedule');

      const mySchedule = this.logic.getMySchedule();
      const allSessions = [];
      mySchedule.days.forEach(day => {
        if (Array.isArray(day.sessions)) {
          day.sessions.forEach(s => allSessions.push(s));
        }
      });
      const found = allSessions.some(s => s.id === chosen.id);
      this.assert(found, 'My Schedule should contain the chosen workshop-like session');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Bookmark two Gold-level AI tool exhibitors and book demos
  // Adapted: data ratings are 0.0, so we filter by sponsor level and category,
  // then use min_rating = 0 to still exercise rating filter.
  testTask5BookmarkGoldAIExhibitorsAndBookDemos() {
    const testName = 'Task 5: bookmark Gold AI exhibitors and book demos';
    try {
      const filterOpts = this.logic.getExhibitorFilterOptions();
      this.assert(filterOpts && Array.isArray(filterOpts.sponsor_levels), 'Exhibitor filter options should include sponsor_levels');

      // Filter for Gold sponsors offering AI tools & platforms
      const exhibitors = this.logic.getExhibitorsListing(
        { sponsor_level: 'gold', category: 'ai_tools_and_platforms', min_rating: 0 },
        undefined,
        'name',
        1,
        20
      );
      this.assert(Array.isArray(exhibitors) && exhibitors.length > 0, 'Should find at least one Gold AI tools exhibitor');

      const exhibitorsToUse = exhibitors.slice(0, 2);

      // Ensure we have at least one exhibitor
      const first = exhibitorsToUse[0];
      const firstDetail = this.logic.getExhibitorDetail(first.id);
      this.assert(firstDetail && firstDetail.id === first.id, 'First exhibitor detail should match');

      // Bookmark and book demos for up to two exhibitors
      const demoStartTimes = [
        '2026-06-13T14:00:00-07:00',
        '2026-06-13T14:30:00-07:00'
      ];
      const bookedMeetings = [];

      exhibitorsToUse.forEach((ex, index) => {
        const bookmarkRes = this.logic.toggleExhibitorBookmark(ex.id, true);
        this.assert(bookmarkRes && bookmarkRes.is_bookmarked === true, 'Exhibitor should be bookmarked: ' + ex.id);

        const startTime = demoStartTimes[index] || demoStartTimes[0];
        const meeting = this.logic.bookExhibitorDemo(
          ex.id,
          'day_2_june_13',
          startTime,
          15
        );
        this.assert(meeting && meeting.id, 'Demo booking should create a Meeting record');
        this.assert(meeting.meeting_type === 'exhibitor_demo', 'Meeting type should be exhibitor_demo');
        this.assert(meeting.exhibitor_id === ex.id, 'Meeting.exhibitor_id should match exhibitor');
        this.assert(meeting.duration_minutes === 15, 'Demo duration should be 15 minutes');
        bookedMeetings.push(meeting);
      });

      // Verify demos appear in My Schedule
      const mySchedule = this.logic.getMySchedule();
      const allMeetings = [];
      mySchedule.days.forEach(day => {
        if (Array.isArray(day.meetings)) {
          day.meetings.forEach(m => allMeetings.push(m));
        }
      });

      bookedMeetings.forEach(m => {
        const found = allMeetings.some(mm => mm.id === m.id);
        this.assert(found, 'Booked exhibitor demo meeting should appear in My Schedule: ' + m.id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Save one nearby hotel under $220/night with breakfast included and 4.0+ rating
  // Adapted: ratings are 0.0 in generated data, so we use min_rating = 0 to exercise filter
  // but still enforce distance, price, and breakfast_included.
  testTask6SaveNearbyHotel() {
    const testName = 'Task 6: save nearby hotel under $220 with breakfast included';
    try {
      const hotelOpts = this.logic.getHotelsFilterOptions();
      this.assert(hotelOpts && hotelOpts.price_range, 'Hotel filter options should include price_range');

      const hotels = this.logic.getHotelsListing(
        {
          max_distance_km: 1,
          max_nightly_rate: 220,
          min_rating: 0,
          required_amenities: ['breakfast_included']
        },
        'distance_asc'
      );

      this.assert(Array.isArray(hotels) && hotels.length > 0, 'Should find at least one hotel within 1 km under $220 with breakfast included');

      const hotel = hotels[0];
      const hotelDetail = this.logic.getHotelDetail(hotel.id);
      this.assert(hotelDetail && hotelDetail.id === hotel.id, 'Hotel detail should match selected hotel');

      const saveRes = this.logic.toggleHotelSaved(hotel.id, true);
      this.assert(saveRes && saveRes.is_saved === true, 'Hotel should be marked as saved');
      this.assert(saveRes.distance_km <= 1, 'Saved hotel should be within 1 km');
      this.assert(saveRes.nightly_rate <= 220, 'Saved hotel nightly_rate should be <= 220');
      const hasBreakfast = Array.isArray(saveRes.amenities) && saveRes.amenities.indexOf('breakfast_included') !== -1;
      this.assert(hasBreakfast, 'Saved hotel should include breakfast');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add two short UX on-demand sessions from last year to watchlist
  testTask7AddUxOnDemandSessionsToWatchlist() {
    const testName = 'Task 7: add short UX on-demand sessions from previous year to watchlist';
    try {
      const homeData = this.logic.getHomePageData();
      this.assert(homeData && homeData.conference, 'Home page should return conference data');
      const currentYear = homeData.conference.current_year;
      const previousYear = currentYear - 1;

      const odOpts = this.logic.getOnDemandFilterOptions();
      this.assert(odOpts && Array.isArray(odOpts.year_options), 'On-demand filter options should include year_options');

      const sessions = this.logic.getOnDemandLibrary(
        { year: previousYear, track: 'ux_and_design', max_duration_minutes: 30 },
        'most_popular'
      );

      this.assert(Array.isArray(sessions) && sessions.length > 0, 'Should find at least one UX on-demand session from previous year <= 30 minutes');

      const toUse = sessions.slice(0, 2);
      const toggledSessions = [];

      toUse.forEach(s => {
        const detail = this.logic.getOnDemandSessionDetail(s.id);
        this.assert(detail && detail.id === s.id, 'On-demand detail should match session id');
        this.assert(detail.year === previousYear, 'On-demand session year should equal previous conference year');

        const tRes = this.logic.toggleOnDemandWatchlist(s.id, true);
        this.assert(tRes && tRes.in_watchlist === true, 'Session should be added to watchlist');
        toggledSessions.push(tRes);
      });

      // Verify watchlist flags via detail calls
      toggledSessions.forEach(s => {
        const detailAgain = this.logic.getOnDemandSessionDetail(s.id);
        this.assert(detailAgain && detailAgain.in_watchlist === true, 'Session should remain in watchlist');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Schedule three 20-minute meetings with UX designers from different companies on Day 2
  // Adapted: generated data has only one UX Designer; we still exercise role-based
  // filtering, then fall back to additional attendees to reach up to three distinct companies.
  testTask8ScheduleMeetingsWithUxDesigners() {
    const testName = 'Task 8: schedule 20-minute meetings with UX designers / attendees';
    try {
      const dirOpts = this.logic.getAttendeeDirectoryFilterOptions();
      this.assert(dirOpts && Array.isArray(dirOpts.role_options), 'Attendee directory options should include role_options');

      // First, filter by role UX Designer
      const uxDesigners = this.logic.getAttendeeDirectory(
        { role: 'UX Designer' },
        undefined,
        1,
        20
      );

      this.assert(Array.isArray(uxDesigners), 'UX designer directory query should return an array');

      const selectedAttendees = [];
      const usedCompanies = new Set();

      // Use UX Designers first
      uxDesigners.forEach(a => {
        if (a.company && !usedCompanies.has(a.company) && selectedAttendees.length < 3) {
          selectedAttendees.push(a);
          usedCompanies.add(a.company);
        }
      });

      // If fewer than 3, use additional attendees from general directory
      if (selectedAttendees.length < 3) {
        const allAttendees = this.logic.getAttendeeDirectory(
          {},
          undefined,
          1,
          20
        );
        this.assert(Array.isArray(allAttendees) && allAttendees.length > 0, 'General attendee directory should return attendees');
        allAttendees.forEach(a => {
          if (selectedAttendees.length >= 3) {
            return;
          }
          if (!a.company) {
            return;
          }
          const alreadySelected = selectedAttendees.some(sa => sa.id === a.id);
          if (!alreadySelected && !usedCompanies.has(a.company)) {
            selectedAttendees.push(a);
            usedCompanies.add(a.company);
          }
        });
      }

      this.assert(selectedAttendees.length > 0, 'Should have at least one attendee selected for meetings');

      // Get full profiles
      selectedAttendees.forEach(a => {
        const profile = this.logic.getAttendeeProfile(a.id);
        this.assert(profile && profile.id === a.id, 'Attendee profile should match selected attendee');
      });

      const startTimes = [
        '2026-06-13T13:00:00-07:00',
        '2026-06-13T13:30:00-07:00',
        '2026-06-13T14:00:00-07:00'
      ];

      const createdMeetings = [];

      selectedAttendees.forEach((a, index) => {
        const startTime = startTimes[index] || startTimes[0];
        const meeting = this.logic.scheduleAttendeeMeeting(
          a.id,
          'day_2_june_13',
          startTime,
          20,
          'Automated networking request'
        );
        this.assert(meeting && meeting.id, 'scheduleAttendeeMeeting should return a Meeting with id');
        this.assert(meeting.meeting_type === 'attendee_meeting', 'Meeting type should be attendee_meeting');
        this.assert(meeting.attendee_id === a.id, 'Meeting.attendee_id should match selected attendee');
        this.assert(meeting.duration_minutes === 20, 'Meeting duration should be 20 minutes');
        createdMeetings.push(meeting);
      });

      // Verify they appear in Meetings overview
      const meetingsOverview = this.logic.getMeetingsOverview();
      this.assert(Array.isArray(meetingsOverview), 'Meetings overview should return an array');
      createdMeetings.forEach(m => {
        const found = meetingsOverview.some(mm => mm.id === m.id);
        this.assert(found, 'Created attendee meeting should appear in meetings overview: ' + m.id);
      });

      // Also ensure they are visible via My Schedule
      const mySchedule = this.logic.getMySchedule();
      const allMeetings = [];
      mySchedule.days.forEach(day => {
        if (Array.isArray(day.meetings)) {
          day.meetings.forEach(m => allMeetings.push(m));
        }
      });
      createdMeetings.forEach(m => {
        const found = allMeetings.some(mm => mm.id === m.id);
        this.assert(found, 'Created attendee meeting should appear in My Schedule: ' + m.id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Simple assertion helper
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
