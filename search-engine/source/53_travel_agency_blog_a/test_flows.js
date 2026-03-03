// Test runner for business logic flows for travel agency blog and services

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
    // Reinitialize storage structure in business logic
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (values preserved, formatting adapted to JS)
    const generatedData = {
      activity_templates: [
        {
          id: 'act_rome_city_walking_tour',
          cityName: 'Rome',
          country: 'Italy',
          name: 'Rome City Walking Tour',
          slug: 'rome-city-walking-tour',
          activityType: 'walking_tour',
          description: 'A relaxed small-group walking tour covering the Trevi Fountain, Spanish Steps, Pantheon, and Piazza Navona with a local guide.',
          durationHours: 3,
          pricePerPerson: 45,
          currency: 'eur'
        },
        {
          id: 'act_rome_colosseum_forum_guided',
          cityName: 'Rome',
          country: 'Italy',
          name: 'Colosseum & Roman Forum Guided Tour',
          slug: 'colosseum-roman-forum-guided-tour',
          activityType: 'guided_tour',
          description: 'Skip-the-line access to the Colosseum, Roman Forum, and Palatine Hill with an expert historian guide and headsets included.',
          durationHours: 3.5,
          pricePerPerson: 68,
          currency: 'eur'
        },
        {
          id: 'act_vatican_museums_sistine',
          cityName: 'Rome',
          country: 'Italy',
          name: 'Vatican Museums & Sistine Chapel Early Access',
          slug: 'vatican-museums-sistine-chapel-early-access',
          activityType: 'museum_visit',
          description: 'Enter the Vatican Museums before general opening hours and enjoy a guided visit including the Sistine Chapel and St. Peter’s Basilica.',
          durationHours: 4,
          pricePerPerson: 89,
          currency: 'eur'
        }
      ],
      blog_articles: [
        {
          id: 'blog_paris_museums_top10',
          title: 'Top 10 Paris Museums for First-Time Visitors',
          slug: 'top-10-paris-museums-first-time-visitors',
          excerpt: 'From the Louvre to the Musée d’Orsay, here are the must-see Paris museums to add to your first trip.',
          content: 'Planning your first trip to Paris? The city’s museums can feel overwhelming. In this guide, we narrow it down to the 10 essential Paris museums, including the Louvre, Musée d’Orsay, Centre Pompidou, and more, with tips on when to visit, how to skip the lines, and how to combine them into a perfect Paris museums weekend.',
          imageUrl: 'https://s19623.pcdn.co/wp-content/uploads/2016/10/dusk-louvre-paris.jpg',
          publishDate: '2024-01-15T09:00:00Z',
          authorName: 'Claire Dupont',
          categories: ['destination_guide'],
          tags: ['paris', 'museum', 'art', 'paris_museums'],
          destinationCity: 'Paris',
          destinationCountry: 'France',
          url: 'blog/top-10-paris-museums-first-time-visitors.html'
        },
        {
          id: 'blog_paris_museums_hidden_gems',
          title: "A Local's Guide to Hidden Paris Museums",
          slug: 'locals-guide-hidden-paris-museums',
          excerpt: 'Skip the crowds and discover the small, character-filled museums Parisians actually visit.',
          content: 'Beyond the Louvre and Musée d’Orsay lies a world of intimate Paris museums. From the Musée Rodin’s sculpture gardens to the quirky Musée de la Chasse et de la Nature, we share 8 hidden museums that are perfect for a relaxed Paris weekend.',
          imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&auto=format&q=80',
          publishDate: '2024-02-10T10:30:00Z',
          authorName: 'Claire Dupont',
          categories: ['destination_guide'],
          tags: ['paris', 'museum', 'hidden_gems', 'paris_museums'],
          destinationCity: 'Paris',
          destinationCountry: 'France',
          url: 'blog/locals-guide-hidden-paris-museums.html'
        },
        {
          id: 'blog_paris_museum_pass_weekend',
          title: 'Paris Museum Pass: Is It Worth It for a Weekend?',
          slug: 'paris-museum-pass-weekend-worth-it',
          excerpt: 'We crunch the numbers on the Paris Museum Pass for a 2–3 day trip focused on museums.',
          content: 'If you’re planning a short Paris museums itinerary, the Paris Museum Pass can save you both time and money. We break down what’s included, how much you’ll really save, and sample 2-day and 3-day Paris Weekend routes that maximize your pass.',
          imageUrl: 'https://blog.asaptickets.com/wp-content/uploads/2016/06/Paris-Museums-and-Galleries-1024x683.jpeg',
          publishDate: '2024-03-05T08:45:00Z',
          authorName: 'Marc Leroy',
          categories: ['travel_tips', 'destination_guide'],
          tags: ['paris', 'museum', 'budget_travel', 'paris_museums'],
          destinationCity: 'Paris',
          destinationCountry: 'France',
          url: 'blog/paris-museum-pass-weekend-worth-it.html'
        }
      ],
      insurance_plans: [
        {
          id: 'basic',
          name: 'Basic Plan',
          tier: 'basic',
          description: 'Essential protection for short, low-cost trips with focus on emergency medical coverage.',
          baseCoverageAmount: 25000,
          basePricePerTrip: 39,
          currency: 'usd',
          features: [
            'Emergency medical coverage up to $25,000',
            'Emergency evacuation coverage',
            '24/7 assistance hotline',
            'Lost baggage coverage up to $500'
          ],
          maxTripLengthDays: 30
        },
        {
          id: 'standard',
          name: 'Standard Plan',
          tier: 'standard',
          description: 'Balanced coverage for most vacations, including trip cancellation and interruption benefits.',
          baseCoverageAmount: 50000,
          basePricePerTrip: 79,
          currency: 'usd',
          features: [
            'Emergency medical coverage up to $50,000',
            'Trip cancellation coverage up to $3,000',
            'Trip interruption coverage up to 125%',
            'Emergency evacuation and repatriation',
            'Lost baggage and delay benefits',
            '24/7 multilingual assistance'
          ],
          maxTripLengthDays: 60
        },
        {
          id: 'premium',
          name: 'Premium Plan',
          tier: 'premium',
          description: 'Comprehensive coverage for complex or long-haul trips, with higher limits and extras.',
          baseCoverageAmount: 100000,
          basePricePerTrip: 129,
          currency: 'usd',
          features: [
            'Emergency medical coverage up to $100,000',
            'Trip cancellation coverage up to $10,000',
            'Cancel for any reason optional upgrade',
            'Higher baggage and electronics limits',
            'Rental car damage coverage',
            '24/7 concierge and assistance services'
          ],
          maxTripLengthDays: 90
        }
      ],
      packages: [
        {
          id: 'pkg_spain_barcelona_beach_6n_jul2025',
          title: 'Barcelona Beach Escape - 6 Nights (July 2025)',
          slug: 'barcelona-beach-escape-6n-july-2025',
          destinationCountry: 'Spain',
          destinationRegion: 'Catalonia',
          theme: 'beach',
          startDate: '2025-07-10T00:00:00Z',
          endDate: '2025-07-16T00:00:00Z',
          durationNights: 6,
          pricePerPerson: 1100,
          currency: 'usd',
          rating: 4.6,
          reviewCount: 238,
          inclusions: [
            '6 nights in a 4-star hotel near Barceloneta Beach',
            'Daily breakfast',
            'Round-trip airport transfers',
            'Half-day guided city tour',
            'Tapas welcome dinner'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1526481280691-3c687fd543c0?w=800&h=600&fit=crop&auto=format&q=80',
          description: 'Enjoy a week of sun, sea, and culture in Barcelona with a centrally located beach hotel and curated experiences.'
        },
        {
          id: 'pkg_spain_mallorca_beach_5n_jul2025',
          title: 'Mallorca All-Inclusive Beach Break - 5 Nights (July 2025)',
          slug: 'mallorca-all-inclusive-beach-break-5n-july-2025',
          destinationCountry: 'Spain',
          destinationRegion: 'Balearic Islands',
          theme: 'beach',
          startDate: '2025-07-18T00:00:00Z',
          endDate: '2025-07-23T00:00:00Z',
          durationNights: 5,
          pricePerPerson: 950,
          currency: 'usd',
          rating: 4.3,
          reviewCount: 189,
          inclusions: [
            '5 nights in a 4-star all-inclusive resort',
            'All meals and selected drinks',
            'Shared airport transfers',
            'One catamaran sunset cruise'
          ],
          imageUrl: 'https://www.yellothere.com/wp-content/uploads/2020/05/Es-Trenc-Mallorca-photo-Yello-There-IMG_8407.jpg',
          description: 'Relax on Mallorca’s golden beaches with an all-inclusive resort stay and a scenic sunset cruise.'
        },
        {
          id: 'pkg_spain_costa_del_sol_7n_jul2025',
          title: 'Costa del Sol Family Beach Holiday - 7 Nights (July 2025)',
          slug: 'costa-del-sol-family-beach-holiday-7n-july-2025',
          destinationCountry: 'Spain',
          destinationRegion: 'Andalusia',
          theme: 'beach',
          startDate: '2025-07-05T00:00:00Z',
          endDate: '2025-07-12T00:00:00Z',
          durationNights: 7,
          pricePerPerson: 1020,
          currency: 'usd',
          rating: 4.5,
          reviewCount: 154,
          inclusions: [
            '7 nights in a family-friendly resort with pool',
            'Daily breakfast and dinner',
            'Kids’ club access',
            'Airport transfers',
            'One full-day excursion to Granada and the Alhambra (tickets included)'
          ],
          imageUrl: 'https://benandmichelle.com/wp-content/uploads/2020/07/cakeandeatit3_Darwin.jpg',
          description: 'A relaxed, family-focused beach week on Spain’s Costa del Sol with cultural add-ons to Granada.'
        }
      ],
      tours: [
        {
          id: 'tour_japan_classic_7d',
          title: '7-Day Classic Japan Highlights (Tokyo, Kyoto & Nara)',
          slug: '7-day-classic-japan-highlights',
          destinationCountry: 'Japan',
          destinationCity: 'Tokyo',
          durationDays: 7,
          basePricePerPerson: 1850,
          currency: 'usd',
          defaultAccommodationLevel: 'standard_3_star',
          accommodationCategories: ['budget_2_star', 'standard_3_star', 'comfort_4_star'],
          rating: 4.7,
          reviewCount: 312,
          themes: ['culture', 'city', 'rail'],
          shortDescription: 'A balanced 7-day guided tour covering Tokyo, Kyoto, and a day trip to Nara by bullet train.',
          description: 'This small-group guided tour is perfect for first-time visitors to Japan. Spend three nights in Tokyo, three in Kyoto, and enjoy a guided day trip to Nara. Services include city tours, select entrance fees, and assistance using Japan’s efficient rail network. Choose from budget, standard 3-star, or 4-star hotel options.',
          imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop&auto=format&q=80',
          isGuided: true
        },
        {
          id: 'tour_japan_budget_tokyo_7d',
          title: '7-Day Budget Tokyo Stay with Day Trips',
          slug: '7-day-budget-tokyo-stay-day-trips',
          destinationCountry: 'Japan',
          destinationCity: 'Tokyo',
          durationDays: 7,
          basePricePerPerson: 1290,
          currency: 'usd',
          defaultAccommodationLevel: 'budget_2_star',
          accommodationCategories: ['budget_2_star', 'standard_3_star'],
          rating: 4.3,
          reviewCount: 141,
          themes: ['city', 'budget_travel'],
          shortDescription: 'Spend a week in Tokyo with optional guided day trips to Nikko or Kamakura.',
          description: 'Ideal for independent travelers on a budget, this 7-day package includes centrally located budget or standard 3-star accommodation in Tokyo and a welcome orientation. Add optional guided day trips and activities as you go.',
          imageUrl: 'https://inspiredbymaps.com/wp-content/uploads/2018/10/Day-Trips-From-Tokyo-1024x622.jpeg',
          isGuided: true
        },
        {
          id: 'tour_japan_cherry_blossom_5d',
          title: '5-Day Tokyo Cherry Blossom Essentials',
          slug: '5-day-tokyo-cherry-blossom-essentials',
          destinationCountry: 'Japan',
          destinationCity: 'Tokyo',
          durationDays: 5,
          basePricePerPerson: 1450,
          currency: 'usd',
          defaultAccommodationLevel: 'standard_3_star',
          accommodationCategories: ['standard_3_star', 'comfort_4_star'],
          rating: 4.8,
          reviewCount: 204,
          themes: ['culture', 'seasonal'],
          shortDescription: 'Capture Tokyo’s sakura season with guided neighborhood walks and park visits.',
          description: 'Timed for peak cherry blossom, this 5-day guided trip includes a mix of city sightseeing and flower-filled parks, plus expert photo tips from your guide.',
          imageUrl: 'https://res.klook.com/images/fl_lossy.progressive,q_65/c_fill,w_1295,h_863,f_auto/w_80,x_15,y_15,g_south_west,l_klook_water/activities/ocazk5e0ocm1trlymquy/%E6%9D%B1%E4%BA%AC%E8%B3%9E%E6%AB%BB%E4%B9%8B%E6%97%85%EF%BC%88%E5%90%AB%E8%8D%89%E8%8E%93%E6%8E%A1%E6%91%98%E5%90%83%E5%88%B0%E9%A3%BD%EF%BC%89.jpg',
          isGuided: true
        }
      ],
      tour_departures: [
        {
          id: 'dep_tour_japan_classic_2025_04_05',
          tourId: 'tour_japan_classic_7d',
          departureDate: '2025-04-05T00:00:00Z',
          durationDays: 7,
          pricePerPerson: 1820,
          availableSeats: 12
        },
        {
          id: 'dep_tour_japan_classic_2025_04_19',
          tourId: 'tour_japan_classic_7d',
          departureDate: '2025-04-19T00:00:00Z',
          durationDays: 7,
          pricePerPerson: 1890,
          availableSeats: 8
        },
        {
          id: 'dep_tour_japan_budget_2025_04_08',
          tourId: 'tour_japan_budget_tokyo_7d',
          departureDate: '2025-04-08T00:00:00Z',
          durationDays: 7,
          pricePerPerson: 1290,
          availableSeats: 16
        }
      ],
      bundles: [
        {
          id: 'bun_lax_jfk_20250910_1',
          title: 'LAX to New York Midtown 3-Star Bundle',
          originAirportCode: 'LAX',
          destinationAirportCode: 'JFK',
          departureDateTime: '2025-09-10T15:00:00Z',
          returnDateTime: '2025-09-13T20:00:00Z',
          nights: 3,
          travelerCountIncluded: 1,
          totalPrice: 935,
          currency: 'usd',
          isNonStopFlight: true,
          airlineName: 'Delta Air Lines',
          flightNumber: 'DL412',
          hotelName: 'Midtown Pod Hotel',
          hotelStarRating: 3,
          hotelGuestRating: 4.1,
          roomTypeName: 'Standard Pod Room',
          cancellationPolicy: 'Free cancellation until 48 hours before check-in.',
          imageUrl: 'https://images.unsplash.com/photo-1520256862855-398228c41684?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'bun_lax_jfk_20250910_2',
          title: 'LAX to New York Times Square 4-Star Bundle',
          originAirportCode: 'LAX',
          destinationAirportCode: 'JFK',
          departureDateTime: '2025-09-10T16:30:00Z',
          returnDateTime: '2025-09-13T21:30:00Z',
          nights: 3,
          travelerCountIncluded: 1,
          totalPrice: 1010,
          currency: 'usd',
          isNonStopFlight: true,
          airlineName: 'American Airlines',
          flightNumber: 'AA118',
          hotelName: 'Times Square Central Hotel',
          hotelStarRating: 4,
          hotelGuestRating: 4.4,
          roomTypeName: 'Queen Room, City View',
          cancellationPolicy: 'Free cancellation until 72 hours before check-in; 1 night penalty after.',
          imageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/11e1dd78-a5c9-5816-9e00-7b24e3b7b51d.jpeg'
        },
        {
          id: 'bun_lax_jfk_20250910_3',
          title: 'LAX to New York Boutique 4-Star Bundle',
          originAirportCode: 'LAX',
          destinationAirportCode: 'JFK',
          departureDateTime: '2025-09-10T18:00:00Z',
          returnDateTime: '2025-09-13T23:10:00Z',
          nights: 3,
          travelerCountIncluded: 1,
          totalPrice: 1195,
          currency: 'usd',
          isNonStopFlight: true,
          airlineName: 'JetBlue Airways',
          flightNumber: 'B6190',
          hotelName: 'Chelsea Arts Boutique Hotel',
          hotelStarRating: 4,
          hotelGuestRating: 4.7,
          roomTypeName: 'Superior Double, Breakfast Included',
          cancellationPolicy: 'Free cancellation until 24 hours before check-in; full penalty afterwards.',
          imageUrl: 'https://www.nydesignagenda.com/wp-content/uploads/2016/06/5-Stylish-Boutique-Hotels-in-New-York-Feature-944x390.jpg'
        }
      ],
      hotel_room_types: [
        {
          id: 'rt_rome_family_suites_family_suite_bf_wifi',
          hotelId: 'hotel_rome_family_suites',
          name: 'Family Suite, Free Breakfast & Wi-Fi',
          description: 'Spacious family suite with separate sleeping area for children, daily breakfast, and high-speed Wi-Fi included.',
          maxAdults: 2,
          maxChildren: 2,
          bedType: '1 queen bed + 2 twin beds',
          pricePerNight: 230,
          currency: 'usd',
          freeCancellation: true,
          cancellationPolicy: 'Free cancellation until 3 days before check-in. First night charged for late cancellations or no-shows.',
          amenities: [
            'Free Wi-Fi',
            'Free breakfast',
            'Air conditioning',
            'Flat-screen TV',
            'Mini-fridge',
            'Crib on request',
            'In-room safe'
          ]
        },
        {
          id: 'rt_rome_family_suites_junior_suite_sofa',
          hotelId: 'hotel_rome_family_suites',
          name: 'Junior Suite with Sofa Bed',
          description: 'Open-plan junior suite ideal for small families, with sofa bed and included breakfast.',
          maxAdults: 2,
          maxChildren: 2,
          bedType: '1 king bed + 1 sofa bed',
          pricePerNight: 245,
          currency: 'usd',
          freeCancellation: true,
          cancellationPolicy: 'Free cancellation until 2 days before check-in. One night penalty after.',
          amenities: [
            'Free Wi-Fi',
            'Free breakfast',
            'Air conditioning',
            'Sofa bed',
            'Coffee/tea maker',
            'Soundproofing'
          ]
        },
        {
          id: 'rt_rome_family_suites_economy_family_nrf',
          hotelId: 'hotel_rome_family_suites',
          name: 'Economy Family Room, Non-Refundable',
          description: 'Compact family room overlooking the courtyard with one double and bunk beds for kids.',
          maxAdults: 2,
          maxChildren: 2,
          bedType: '1 double bed + bunk beds',
          pricePerNight: 195,
          currency: 'usd',
          freeCancellation: false,
          cancellationPolicy: 'Non-refundable rate. No changes or refunds allowed after booking.',
          amenities: [
            'Free Wi-Fi',
            'Breakfast available (surcharge)',
            'Air conditioning',
            'Bunk beds',
            'TV'
          ]
        }
      ],
      hotels: [
        {
          id: 'hotel_rome_family_suites',
          name: 'Rome Family Suites',
          slug: 'rome-family-suites',
          city: 'Rome',
          country: 'Italy',
          starRating: 4,
          guestRating: 4.7,
          reviewCount: 812,
          currency: 'usd',
          isFamilyFriendly: true,
          amenities: [
            'free_breakfast',
            'free_wifi',
            'family_friendly',
            'parking',
            'airport_shuttle',
            'air_conditioning'
          ],
          address: 'Via dei Bambini 12, 00184 Rome, Italy',
          latitude: 41.8928,
          longitude: 12.4873,
          mainImageUrl: 'https://www.eatingeurope.com/wp-content/uploads/2018/08/131.jpg',
          description: 'Spacious suites designed for families, within walking distance of the Colosseum. All rooms include breakfast, fast Wi-Fi, and kid-friendly amenities.',
          minPricePerNight: 195
        },
        {
          id: 'hotel_rome_historic_center',
          name: 'Rome Historic Center Hotel',
          slug: 'rome-historic-center-hotel',
          city: 'Rome',
          country: 'Italy',
          starRating: 3,
          guestRating: 4.3,
          reviewCount: 534,
          currency: 'eur',
          isFamilyFriendly: true,
          amenities: [
            'free_breakfast',
            'free_wifi',
            'family_friendly',
            'air_conditioning',
            'city_center'
          ],
          address: 'Via delle Antiche Mura 5, 00186 Rome, Italy',
          latitude: 41.8976,
          longitude: 12.4768,
          mainImageUrl: 'https://www.eatingeurope.com/wp-content/uploads/2018/08/131.jpg',
          description: 'Cozy mid-range hotel in the historic center with easy access to Piazza Navona and the Pantheon, offering complimentary breakfast and Wi-Fi.',
          minPricePerNight: 150
        },
        {
          id: 'hotel_midtown_pod',
          name: 'Midtown Pod Hotel',
          slug: 'midtown-pod-hotel',
          city: 'New York',
          country: 'United States',
          starRating: 3,
          guestRating: 4.1,
          reviewCount: 1279,
          currency: 'usd',
          isFamilyFriendly: false,
          amenities: [
            'free_wifi',
            'city_center',
            'air_conditioning',
            'restaurant'
          ],
          address: '230 W 39th St, New York, NY 10018, United States',
          latitude: 40.7544,
          longitude: -73.9903,
          mainImageUrl: 'https://media.cntraveler.com/photos/53da92fa6dec627b149f406e/4:5/w_767,c_limit/london-nyc-new-york-new-york-new-york-104476-1.jpg',
          description: 'Compact, cleverly designed pod-style rooms in Midtown Manhattan, ideal for solo travelers who value location and design.',
          minPricePerNight: 175
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:39.838084'
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('activity_templates', JSON.stringify(generatedData.activity_templates));
    localStorage.setItem('blog_articles', JSON.stringify(generatedData.blog_articles));
    localStorage.setItem('insurance_plans', JSON.stringify(generatedData.insurance_plans));
    localStorage.setItem('packages', JSON.stringify(generatedData.packages));
    localStorage.setItem('tours', JSON.stringify(generatedData.tours));
    localStorage.setItem('tour_departures', JSON.stringify(generatedData.tour_departures));
    localStorage.setItem('bundles', JSON.stringify(generatedData.bundles));
    localStorage.setItem('hotel_room_types', JSON.stringify(generatedData.hotel_room_types));
    localStorage.setItem('hotels', JSON.stringify(generatedData.hotels));

    // Initialize empty collections for entities that start with no data
    localStorage.setItem('saved_articles', JSON.stringify([]));
    localStorage.setItem('reading_lists', JSON.stringify([]));
    localStorage.setItem('reading_list_articles', JSON.stringify([]));
    localStorage.setItem('wishlists', JSON.stringify([]));
    localStorage.setItem('wishlist_items', JSON.stringify([]));
    localStorage.setItem('booking_carts', JSON.stringify([]));
    localStorage.setItem('booking_cart_items', JSON.stringify([]));
    localStorage.setItem('tour_bookings', JSON.stringify([]));
    localStorage.setItem('hotel_bookings', JSON.stringify([]));
    localStorage.setItem('bundle_bookings', JSON.stringify([]));
    localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
    localStorage.setItem('custom_itineraries', JSON.stringify([]));
    localStorage.setItem('custom_itinerary_cities', JSON.stringify([]));
    localStorage.setItem('custom_itinerary_activities', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookJapanTourToCart();
    this.testTask2_CreateParisWeekendReadingList();
    this.testTask3_CompareSpainBeachPackagesAndWishlist();
    this.testTask4_SelectCheapestNonStopBundleAndStartBooking();
    this.testTask5_SubscribeBudgetTravelNewsletterWeekly();
    this.testTask6_ReserveFamilyFriendlyRomeHotelToCart();
    this.testTask7_ConfigureStandardInsurancePolicyForReview();
    this.testTask8_CreateAndSaveItalyItinerary();

    return this.results;
  }

  // Task 1: Book a 7-day guided tour to Japan in April 2025 under $2,000 per person for 2 adults with 3-star hotels
  testTask1_BookJapanTourToCart() {
    const testName = 'Task 1: Book Japan 7-day April 2025 tour under $2000 with 3-star for 2 adults and add to cart';
    console.log('Testing:', testName);

    try {
      // Optionally ensure tour filters load (UI parity)
      const filterOptions = this.logic.getTourFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.destinationCountries), 'Tour filter options should return destinationCountries');

      // Search tours matching high-level criteria
      const startDate = '2025-04-01';
      const endDate = '2025-04-30';
      const minDuration = 7;
      const maxDuration = 7;
      const maxPricePerPerson = 2000;
      const accommodationLevels = ['standard_3_star'];
      const sortBy = 'price_low_to_high';

      const searchResult = this.logic.searchTours(
        'Japan', // destinationCountry
        startDate,
        endDate,
        minDuration,
        maxDuration,
        maxPricePerPerson,
        accommodationLevels,
        sortBy,
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchTours should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one Japan tour matching filters');

      const firstTourResult = searchResult.results[0];
      const selectedTour = firstTourResult.tour;

      this.assert(selectedTour.destinationCountry === 'Japan', 'Selected tour should be in Japan');
      this.assert(firstTourResult.durationDays === 7, 'Selected tour durationDays should be 7');
      this.assert(firstTourResult.fromPricePerPerson <= maxPricePerPerson, 'fromPricePerPerson should be <= max price per person');

      const tourId = selectedTour.id;

      // Get available departures in April 2025
      const departures = this.logic.getTourAvailableDepartures(
        tourId,
        startDate,
        endDate
      );
      this.assert(Array.isArray(departures) && departures.length > 0, 'Tour should have at least one available departure in April 2025');

      const selectedDeparture = departures[0];
      this.assert(selectedDeparture.durationDays === 7, 'Selected departure should be 7 days');
      this.assert(selectedDeparture.pricePerPerson <= maxPricePerPerson, 'Departure pricePerPerson should be <= max per-person budget');

      const tourDepartureId = selectedDeparture.id;

      // Preview pricing for 2 adults, 3-star
      const pricingPreview = this.logic.getTourPricingPreview(
        tourId,
        tourDepartureId,
        2, // adults
        0, // children
        'standard_3_star'
      );
      this.assert(pricingPreview && pricingPreview.totalPrice > 0, 'Pricing preview should have positive totalPrice');
      this.assert(pricingPreview.pricePerPerson <= maxPricePerPerson, 'Preview pricePerPerson should respect max budget');
      this.assert(pricingPreview.totalPrice <= maxPricePerPerson * 2, 'Total price should not exceed 2 * maxPricePerPerson');

      // Create booking and add to cart
      const addResult = this.logic.createTourBookingAndAddToCart(
        tourId,
        tourDepartureId,
        2, // adults
        0, // children
        'standard_3_star'
      );

      this.assert(addResult && addResult.success === true, 'Tour booking should be successfully added to cart');
      this.assert(addResult.tourBooking && addResult.cartItem, 'Response should include tourBooking and cartItem');

      const cartItem = addResult.cartItem;
      const tourBooking = addResult.tourBooking;

      this.assert(cartItem.itemType === 'tour_booking', 'Cart item type should be tour_booking');
      this.assert(tourBooking.tourId === tourId, 'TourBooking should reference selected tourId');
      this.assert(tourBooking.tourDepartureId === tourDepartureId, 'TourBooking should reference selected tourDepartureId');
      this.assert(tourBooking.adults === 2, 'TourBooking adults should be 2');
      this.assert(tourBooking.accommodationLevel === 'standard_3_star', 'TourBooking accommodation level should be 3-star');

      // Verify cart summary contains this item and prices match
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should return items array');
      const foundCartItem = cartSummary.items.find(function (item) { return item.id === cartItem.id; });
      this.assert(!!foundCartItem, 'Cart summary should include the tour cart item');
      this.assert(foundCartItem.totalPrice === cartItem.totalPrice, 'Cart item totalPrice should match between responses');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a 'Paris Weekend' reading list with 3 museum-related blog posts
  testTask2_CreateParisWeekendReadingList() {
    const testName = "Task 2: Create 'Paris Weekend' reading list with 3 Paris museum posts";
    console.log('Testing:', testName);

    try {
      // Load blog home content (simulating Blog navigation)
      const blogHome = this.logic.getBlogHomeContent();
      this.assert(blogHome && Array.isArray(blogHome.recentArticles), 'Blog home content should include recentArticles');

      // Search for 'Paris museums'
      const searchResult = this.logic.searchBlogArticles('Paris museums', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBlogArticles should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one article for "Paris museums"');

      // Save up to first 3 articles from search results
      const articlesToSave = searchResult.results.slice(0, 3);
      const articleIds = articlesToSave.map(function (a) { return a.id; });
      this.assert(articleIds.length > 0, 'Should have at least one articleId to save');

      for (let i = 0; i < articleIds.length; i++) {
        const saveResult = this.logic.saveArticle(articleIds[i]);
        this.assert(saveResult && saveResult.success === true, 'saveArticle should succeed for articleId ' + articleIds[i]);
      }

      // Verify saved articles
      const savedAndLists = this.logic.getSavedArticlesAndReadingLists();
      this.assert(savedAndLists && Array.isArray(savedAndLists.savedArticles), 'getSavedArticlesAndReadingLists should return savedArticles array');

      const savedIds = savedAndLists.savedArticles.map(function (sa) { return sa.article.id; });
      articleIds.forEach(function (id) {
        const exists = savedIds.indexOf(id) !== -1;
        if (!exists) {
          throw new Error('Saved articles should include articleId ' + id);
        }
      });

      // Create 'Paris Weekend' reading list
      const listName = 'Paris Weekend';
      const createListResult = this.logic.createReadingList(listName, undefined);
      this.assert(createListResult && createListResult.success === true, 'createReadingList should succeed');
      const readingList = createListResult.readingList;
      this.assert(readingList && readingList.id, 'Created reading list should have an id');

      // Add saved articles to the reading list
      const addToListResult = this.logic.addArticlesToReadingList(readingList.id, articleIds);
      this.assert(addToListResult && addToListResult.success === true, 'addArticlesToReadingList should succeed');
      this.assert(addToListResult.addedCount === articleIds.length, 'addedCount should equal number of articleIds added');

      // Basic validation of join records
      this.assert(Array.isArray(addToListResult.readingListArticles), 'readingListArticles should be an array');
      addToListResult.readingListArticles.forEach(function (rla) {
        if (articleIds.indexOf(rla.articleId) === -1) {
          throw new Error('ReadingListArticle should reference one of the added articleIds');
        }
        if (rla.readingListId !== readingList.id) {
          throw new Error('ReadingListArticle readingListId should match created list id');
        }
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Compare two Spain beach packages in July 2025 and add higher-rated (or cheaper if tie) to wishlist
  testTask3_CompareSpainBeachPackagesAndWishlist() {
    const testName = 'Task 3: Compare two Spain beach packages in July 2025 and wishlist best one';
    console.log('Testing:', testName);

    try {
      // Optionally load package filter options
      const filterOptions = this.logic.getPackageFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.destinationCountries), 'Package filter options should return destinationCountries');

      // Search for Spain beach packages in July 2025
      const searchResult = this.logic.searchPackages(
        'Spain',     // destinationCountry
        'beach',     // theme
        '2025-07',   // travelMonth
        5,           // minDurationNights
        7,           // maxDurationNights
        4.0,         // minRating
        undefined,   // maxPricePerPerson
        'price_low_to_high',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPackages should return results array');
      this.assert(searchResult.results.length >= 2, 'There should be at least two Spain beach packages for comparison');

      const pkg1 = searchResult.results[0];
      const pkg2 = searchResult.results[1];

      // Get comparison details for the first two packages
      const comparison = this.logic.getPackageComparison([pkg1.id, pkg2.id]);
      this.assert(comparison && Array.isArray(comparison.packages), 'getPackageComparison should return packages array');
      this.assert(comparison.packages.length === 2, 'Comparison should include two packages');

      const compA = comparison.packages[0];
      const compB = comparison.packages[1];

      // Determine winner by rating, then price if rating ties
      const ratingA = compA.rating;
      const ratingB = compB.rating;
      const priceA = compA.pricePerPerson;
      const priceB = compB.pricePerPerson;

      let winner = compA;
      if (ratingB > ratingA) {
        winner = compB;
      } else if (ratingB === ratingA && priceB < priceA) {
        winner = compB;
      }

      const winnerPackageId = winner.package.id;

      // Add winning package to wishlist
      const addResult = this.logic.addItemToWishlist('package', winnerPackageId, 'Higher-rated (or cheaper) Spain beach package');
      this.assert(addResult && addResult.success === true, 'addItemToWishlist should succeed');
      const wishlistItem = addResult.wishlistItem;
      this.assert(wishlistItem && wishlistItem.itemType === 'package', 'WishlistItem should be of type package');
      this.assert(wishlistItem.itemRefId === winnerPackageId, 'WishlistItem should reference winning package id');

      // Verify wishlist contents via getWishlistItems
      const wishlistItemsDisplay = this.logic.getWishlistItems();
      this.assert(Array.isArray(wishlistItemsDisplay), 'getWishlistItems should return an array');
      const found = wishlistItemsDisplay.find(function (w) { return w.wishlistItem.id === wishlistItem.id; });
      this.assert(!!found, 'Wishlist display should include the added package item');
      this.assert(found.itemType === 'package', 'Displayed itemType should be package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Select cheapest non-stop LAX->JFK bundle under $1,200 for Sept 10–13, 2025 and start booking
  testTask4_SelectCheapestNonStopBundleAndStartBooking() {
    const testName = 'Task 4: Select cheapest non-stop LAX-JFK bundle under $1200 and add to cart';
    console.log('Testing:', testName);

    try {
      const origin = 'LAX';
      const destination = 'JFK';
      const departureDate = '2025-09-10';
      const returnDate = '2025-09-13';
      const maxTotalPrice = 1200;

      const searchResult = this.logic.searchBundles(
        origin,
        destination,
        departureDate,
        returnDate,
        1,          // adults
        true,       // nonStopOnly
        maxTotalPrice,
        'total_price_low_to_high',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBundles should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one non-stop bundle under max price');

      // Pick the first bundle whose totalPrice <= maxTotalPrice
      let selectedBundle = null;
      for (let i = 0; i < searchResult.results.length; i++) {
        const b = searchResult.results[i];
        if (b.totalPrice <= maxTotalPrice) {
          selectedBundle = b;
          break;
        }
      }
      this.assert(selectedBundle !== null, 'Should find at least one bundle with totalPrice <= maxTotalPrice');

      // Load bundle detail
      const bundleDetail = this.logic.getBundleDetail(selectedBundle.id);
      this.assert(bundleDetail && bundleDetail.bundle, 'getBundleDetail should return bundle');
      this.assert(bundleDetail.bundle.id === selectedBundle.id, 'Bundle detail id should match selected bundle id');
      this.assert(bundleDetail.flightDetails && bundleDetail.flightDetails.isNonStop === true, 'Bundle flight should be non-stop');
      this.assert(bundleDetail.totalPrice <= maxTotalPrice, 'Bundle detail totalPrice should be <= maxTotalPrice');

      // Create booking and add to cart (simulate Continue to traveler details)
      const addResult = this.logic.createBundleBookingAndAddToCart(selectedBundle.id, 1);
      this.assert(addResult && addResult.success === true, 'createBundleBookingAndAddToCart should succeed');
      this.assert(addResult.bundleBooking && addResult.cartItem, 'Response should include bundleBooking and cartItem');

      const cartItem = addResult.cartItem;
      this.assert(cartItem.itemType === 'bundle_booking', 'Cart item should be of type bundle_booking');
      this.assert(cartItem.totalPrice === addResult.bundleBooking.totalPrice, 'Cart item totalPrice should match bundleBooking totalPrice');

      // Verify presence in cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items');
      const found = cartSummary.items.find(function (ci) { return ci.id === cartItem.id; });
      this.assert(!!found, 'Cart summary should contain the bundle cart item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Sign up for weekly budget travel newsletter with test@example.com
  testTask5_SubscribeBudgetTravelNewsletterWeekly() {
    const testName = 'Task 5: Subscribe to weekly budget travel newsletter with test@example.com';
    console.log('Testing:', testName);

    try {
      // Load newsletter options
      const options = this.logic.getNewsletterOptions();
      this.assert(options && Array.isArray(options.topicOptions), 'getNewsletterOptions should return topicOptions');
      this.assert(Array.isArray(options.frequencyOptions), 'getNewsletterOptions should return frequencyOptions');

      // Choose budget travel topic (by label or code)
      let selectedTopics = [];
      for (let i = 0; i < options.topicOptions.length; i++) {
        const t = options.topicOptions[i];
        const label = (t.label || '').toLowerCase();
        const code = (t.code || '').toLowerCase();
        if (label.indexOf('budget') !== -1 || code.indexOf('budget') !== -1) {
          selectedTopics.push(t.code);
          break;
        }
      }
      this.assert(selectedTopics.length > 0, 'Should find at least one budget-related topic option');

      // Optionally also add travel tips if present
      for (let i = 0; i < options.topicOptions.length; i++) {
        const t = options.topicOptions[i];
        const label = (t.label || '').toLowerCase();
        const code = (t.code || '').toLowerCase();
        if (label.indexOf('tips') !== -1 || code.indexOf('tips') !== -1) {
          if (selectedTopics.indexOf(t.code) === -1) {
            selectedTopics.push(t.code);
          }
        }
      }

      // Choose weekly frequency
      let selectedFrequency = null;
      for (let i = 0; i < options.frequencyOptions.length; i++) {
        const f = options.frequencyOptions[i];
        const value = (f.value || '').toLowerCase();
        const label = (f.label || '').toLowerCase();
        if (value === 'weekly' || label.indexOf('week') !== -1) {
          selectedFrequency = f.value || 'weekly';
          break;
        }
      }
      this.assert(!!selectedFrequency, 'Should find a weekly frequency option');

      const name = 'Alex Traveler';
      const email = 'test@example.com';

      const subscribeResult = this.logic.createOrUpdateNewsletterSubscription(
        name,
        email,
        selectedTopics,
        selectedFrequency,
        true // agreedToPromotions
      );

      this.assert(subscribeResult && subscribeResult.success === true, 'createOrUpdateNewsletterSubscription should succeed');
      const subscription = subscribeResult.subscription;
      this.assert(subscription && subscription.email === email, 'Subscription email should match provided email');
      this.assert(subscription.frequency === selectedFrequency, 'Subscription frequency should match selected frequency');
      this.assert(Array.isArray(subscription.topics) || typeof subscription.topics === 'undefined', 'Subscription topics should be array or undefined');
      if (Array.isArray(subscription.topics)) {
        this.assert(subscription.topics.indexOf(selectedTopics[0]) !== -1, 'Subscription topics should include selected budget topic');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Reserve family-friendly Rome hotel Aug 1–5 2025 with 4.5+ rating, free breakfast & Wi-Fi under $250/night, free cancellation room added to cart
  testTask6_ReserveFamilyFriendlyRomeHotelToCart() {
    const testName = 'Task 6: Reserve family-friendly Rome hotel with filters and add free-cancel room to cart';
    console.log('Testing:', testName);

    try {
      // Optionally check hotel filter options
      const hotelFilterOptions = this.logic.getHotelFilterOptions();
      this.assert(hotelFilterOptions && hotelFilterOptions.priceRangePerNight, 'Hotel filter options should include priceRangePerNight');

      const city = 'Rome';
      const country = 'Italy';
      const checkIn = '2025-08-01';
      const checkOut = '2025-08-05';
      const adults = 2;
      const children = 2;
      const maxPricePerNight = 250;
      const minGuestRating = 4.5;
      const amenities = ['free_breakfast', 'free_wifi'];

      const searchResult = this.logic.searchHotels(
        city,
        country,
        checkIn,
        checkOut,
        adults,
        children,
        maxPricePerNight,
        minGuestRating,
        amenities,
        true, // familyFriendlyOnly
        'guest_rating_high_to_low',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchHotels should return results array');
      this.assert(searchResult.results.length > 0, 'There should be at least one family-friendly Rome hotel matching filters');

      const hotel = searchResult.results[0];
      this.assert(hotel.city === city, 'Hotel city should be Rome');
      this.assert(hotel.country === country, 'Hotel country should be Italy');
      if (typeof hotel.guestRating === 'number') {
        this.assert(hotel.guestRating >= minGuestRating, 'Hotel guestRating should be >= minimum');
      }

      // Get hotel details and room types
      const detail = this.logic.getHotelDetailAndRooms(hotel.id, checkIn, checkOut, adults, children);
      this.assert(detail && detail.hotel && Array.isArray(detail.availableRoomTypes), 'Hotel detail should include availableRoomTypes');

      // Find a free-cancellation room within price constraints
      let selectedRoom = null;
      for (let i = 0; i < detail.availableRoomTypes.length; i++) {
        const room = detail.availableRoomTypes[i];
        if (room.freeCancellation && room.pricePerNight <= maxPricePerNight) {
          selectedRoom = room;
          break;
        }
      }
      this.assert(selectedRoom !== null, 'Should find a free-cancellation room at or under max price per night');

      // Create booking and add to cart
      const addResult = this.logic.createHotelBookingAndAddToCart(
        hotel.id,
        selectedRoom.id,
        checkIn,
        checkOut,
        adults,
        children
      );

      this.assert(addResult && addResult.success === true, 'createHotelBookingAndAddToCart should succeed');
      const hotelBooking = addResult.hotelBooking;
      const cartItem = addResult.cartItem;

      this.assert(hotelBooking && cartItem, 'Response should include hotelBooking and cartItem');
      this.assert(hotelBooking.hotelId === hotel.id, 'HotelBooking hotelId should match selected hotel');
      this.assert(hotelBooking.roomTypeId === selectedRoom.id, 'HotelBooking roomTypeId should match selected room');
      this.assert(hotelBooking.freeCancellation === true, 'HotelBooking should have freeCancellation true');
      this.assert(cartItem.itemType === 'hotel_booking', 'Cart item type should be hotel_booking');

      // Verify cart
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items array');
      const found = cartSummary.items.find(function (ci) { return ci.id === cartItem.id; });
      this.assert(!!found, 'Cart summary should contain the hotel cart item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Choose mid-tier (Standard) insurance plan for $3,000, 14-day trip and go to policy review
  testTask7_ConfigureStandardInsurancePolicyForReview() {
    const testName = 'Task 7: Configure Standard travel insurance plan for $3000 14-day trip and review';
    console.log('Testing:', testName);

    try {
      // Simulate reaching insurance via blog search
      const blogSearch = this.logic.searchBlogArticles('travel insurance comparison', 1, 5);
      this.assert(blogSearch && typeof blogSearch.totalResults === 'number', 'searchBlogArticles for insurance should return a valid response');

      // Retrieve insurance plans
      const plans = this.logic.getTravelInsurancePlans();
      this.assert(Array.isArray(plans) && plans.length > 0, 'getTravelInsurancePlans should return at least one plan');

      // Select Standard (mid-tier) plan by tier
      let standardPlan = null;
      for (let i = 0; i < plans.length; i++) {
        if (plans[i].tier === 'standard') {
          standardPlan = plans[i];
          break;
        }
      }

      // Fallback: if no explicit tier, choose middle index
      if (!standardPlan) {
        const midIndex = Math.floor(plans.length / 2);
        standardPlan = plans[midIndex];
      }

      this.assert(!!standardPlan && standardPlan.id, 'Should select a Standard/mid-tier insurance plan');

      const planId = standardPlan.id;
      const tripCost = 3000;
      const tripDurationDays = 14;
      const coverageStartDate = '2025-06-01';
      const coverageEndDate = '2025-06-14';
      const addons = ['trip_cancellation_protection'];

      const policyResult = this.logic.configureInsurancePolicyForReview(
        planId,
        tripCost,
        tripDurationDays,
        coverageStartDate,
        coverageEndDate,
        addons
      );

      this.assert(policyResult && policyResult.policyConfig, 'configureInsurancePolicyForReview should return policyConfig');
      const policyConfig = policyResult.policyConfig;
      this.assert(policyConfig.planId === planId, 'PolicyConfig planId should match selected plan');
      this.assert(policyConfig.tripCost === tripCost, 'PolicyConfig tripCost should match provided trip cost');
      this.assert(policyConfig.coverageStartDate.indexOf('2025-06-01') === 0, 'Coverage start date should be June 1, 2025');
      this.assert(policyConfig.coverageEndDate.indexOf('2025-06-14') === 0, 'Coverage end date should be June 14, 2025');
      if (Array.isArray(policyConfig.addons)) {
        this.assert(policyConfig.addons.indexOf('trip_cancellation_protection') !== -1, 'PolicyConfig addons should include trip_cancellation_protection');
      }
      if (typeof policyResult.estimatedPremium === 'number') {
        this.assert(policyResult.estimatedPremium > 0, 'Estimated premium should be positive');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Build and save 6-night Italy itinerary (Rome, Florence, Venice) for May 10, 2025 with 3-star hotels and tours
  testTask8_CreateAndSaveItalyItinerary() {
    const testName = 'Task 8: Create and save 6-night Italy May 2025 itinerary with Rome, Florence, Venice and activities';
    console.log('Testing:', testName);

    try {
      // Get Trip Builder country options
      const countryOptions = this.logic.getTripBuilderCountryOptions();
      this.assert(Array.isArray(countryOptions) && countryOptions.length > 0, 'getTripBuilderCountryOptions should return some countries');

      // Find Italy option by name (fallback to first if not found)
      let countryName = 'Italy';
      let italyOption = null;
      for (let i = 0; i < countryOptions.length; i++) {
        const opt = countryOptions[i];
        if ((opt.name || '').toLowerCase() === 'italy' || (opt.code || '').toLowerCase() === 'it') {
          italyOption = opt;
          break;
        }
      }
      if (!italyOption) {
        italyOption = countryOptions[0];
        countryName = italyOption.name || italyOption.code;
      }

      // Get city suggestions (for parity; not strictly needed for createCustomItinerary)
      const cityOptions = this.logic.getTripBuilderCityOptions(countryName);
      this.assert(Array.isArray(cityOptions), 'getTripBuilderCityOptions should return an array');

      const cities = [
        { cityName: 'Rome', order: 1, nights: 2 },
        { cityName: 'Florence', order: 2, nights: 2 },
        { cityName: 'Venice', order: 3, nights: 2 }
      ];

      const totalNightsRequested = cities.reduce(function (sum, c) { return sum + c.nights; }, 0);

      const startDate = '2025-05-10';
      const itineraryName = 'Italy May 2025';
      const accommodationPreferenceLevel = 'three_star_hotels';

      // Fetch activity templates for Rome
      const romeActivities = this.logic.getActivityTemplatesForCity(countryName, 'Rome');
      this.assert(Array.isArray(romeActivities), 'getActivityTemplatesForCity should return array for Rome');
      this.assert(romeActivities.length > 0, 'There should be at least one activity template for Rome');

      // Choose a guided or walking tour for Rome, or fallback to first
      let romeActivity = romeActivities[0];
      for (let i = 0; i < romeActivities.length; i++) {
        const a = romeActivities[i];
        if (a.activityType === 'guided_tour' || a.activityType === 'walking_tour') {
          romeActivity = a;
          break;
        }
      }

      // Fetch activity templates for Venice (may or may not exist in seed data)
      const veniceActivities = this.logic.getActivityTemplatesForCity(countryName, 'Venice');
      this.assert(Array.isArray(veniceActivities), 'getActivityTemplatesForCity should return array for Venice (possibly empty)');

      // Choose a boat tour for Venice if available, otherwise any available, otherwise none
      let veniceActivity = null;
      for (let i = 0; i < veniceActivities.length; i++) {
        const a = veniceActivities[i];
        if (a.activityType === 'boat_tour') {
          veniceActivity = a;
          break;
        }
      }
      if (!veniceActivity && veniceActivities.length > 0) {
        veniceActivity = veniceActivities[0];
      }

      // Build activities array: always at least one for Rome, optionally one for Venice
      const activities = [];
      activities.push({ cityName: 'Rome', activityTemplateId: romeActivity.id, dayNumber: 1 });
      if (veniceActivity) {
        activities.push({ cityName: 'Venice', activityTemplateId: veniceActivity.id, dayNumber: totalNightsRequested });
      }

      // Create custom itinerary
      const createResult = this.logic.createCustomItinerary(
        itineraryName,
        countryName,
        startDate,
        accommodationPreferenceLevel,
        cities,
        activities
      );

      this.assert(createResult && createResult.success === true, 'createCustomItinerary should succeed');
      const itinerary = createResult.itinerary;
      this.assert(itinerary && itinerary.id, 'Itinerary should have an id');
      this.assert(itinerary.name === itineraryName, 'Itinerary name should match requested name');
      this.assert(itinerary.country === countryName, 'Itinerary country should match selected country');
      this.assert(itinerary.accommodationPreferenceLevel === accommodationPreferenceLevel, 'Itinerary accommodation preference should be 3-star level');
      this.assert(itinerary.totalNights === totalNightsRequested, 'Itinerary totalNights should equal sum of city nights');

      // Validate cities array from response
      this.assert(Array.isArray(createResult.cities), 'createCustomItinerary should return cities array');
      this.assert(createResult.cities.length === cities.length, 'Returned number of itinerary cities should match input');
      createResult.cities.forEach(function (c) {
        const match = cities.find(function (ci) { return ci.cityName === c.cityName; });
        if (!match) {
          throw new Error('Returned itinerary city ' + c.cityName + ' not found in input cities');
        }
        if (typeof c.nights === 'number') {
          if (c.nights !== match.nights) {
            throw new Error('Nights for city ' + c.cityName + ' should match input');
          }
        }
      });

      // Validate activities mapping
      this.assert(Array.isArray(createResult.activities), 'createCustomItinerary should return activities array');
      this.assert(createResult.activities.length >= 1, 'There should be at least one activity in the itinerary');
      const romeActivityRecord = createResult.activities.find(function (a) { return a.cityName === 'Rome'; });
      this.assert(!!romeActivityRecord, 'There should be at least one Rome activity in itinerary');

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
    console.log('✓', testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗', testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
