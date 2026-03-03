/* Test runner for business logic flows for local Christmas attraction site */

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
    // Generated Data from prompt (used ONLY here)
    const generatedData = {
      activities: [
        {
          id: 'act_santa_cabin_181630',
          title: 'Santa\'s Cozy Cabin Meet & Greet',
          description: 'A relaxed meet & greet with Santa in his cozy cabin, perfect for family photos and wish lists.',
          startDateTime: '2026-12-18T16:30:00',
          endDateTime: '2026-12-18T17:15:00',
          category: 'santa_experience',
          audience: 'families',
          locationName: 'Santa\'s Cabin – North Village',
          locationType: 'indoor',
          accessibilityNotes: 'Wheelchair-accessible ramp and low photo bench available; flash can be reduced on request.',
          isActive: true
        },
        {
          id: 'act_santa_storytime_181900',
          title: 'Santa Storytime by the Fire',
          description: 'Join Santa for a cozy storytime featuring classic Christmas tales by the indoor lodge fireplace.',
          startDateTime: '2026-12-18T19:00:00',
          endDateTime: '2026-12-18T19:30:00',
          category: 'santa_experience',
          audience: 'families',
          locationName: 'Lodge Fireplace Corner',
          locationType: 'indoor',
          accessibilityNotes: 'Seating reserved for wheelchair users and low-sensory seating available near exits.',
          isActive: true
        },
        {
          id: 'act_light_northern_181700',
          title: 'Northern Lights Synchronized Show',
          description: 'A choreographed light show set to orchestral holiday music in the main plaza.',
          startDateTime: '2026-12-18T17:00:00',
          endDateTime: '2026-12-18T17:20:00',
          category: 'light_show',
          audience: 'families',
          locationName: 'Main Plaza – Light Tree',
          locationType: 'outdoor',
          accessibilityNotes: 'Accessible viewing area with level ground and limited strobe effects.',
          isActive: true
        }
      ],
      entrances: [
        {
          id: 'north_gate_accessible',
          name: 'North Gate – Accessible',
          description: 'Primary accessible entrance located nearest to the parking garage and bus stop.',
          isWheelchairAccessible: true,
          isMainEntrance: true,
          mapCoordinates: '47.6101,-122.2015',
          directions: 'From the main parking garage, follow signs to the North Gate ramp entrance. Elevators are available from all parking levels.',
          notes: 'Wheelchair loans and accessibility assistance are coordinated from this gate.'
        },
        {
          id: 'south_gate_main',
          name: 'South Gate – Main Plaza',
          description: 'Entrance opening directly into the Main Plaza near the central Christmas tree.',
          isWheelchairAccessible: true,
          isMainEntrance: false,
          mapCoordinates: '47.6095,-122.2010',
          directions: 'Pedestrian access from City Center via Holiday Lane. Follow the lit archway to the South Gate turnstiles.',
          notes: 'Can be crowded during peak arrival times; consider North Gate for a quieter entrance.'
        },
        {
          id: 'east_gate_rides',
          name: 'East Gate – Rides Entrance',
          description: 'Entrance closest to the rides and mini train depot.',
          isWheelchairAccessible: false,
          isMainEntrance: false,
          mapCoordinates: '47.6103,-122.1998',
          directions: 'From the overflow parking lot, follow the fenced path along the river to the East Gate.',
          notes: 'Stairs at this entrance; guests using mobility devices should use North or South Gates instead.'
        }
      ],
      ticket_types: [
        {
          id: 'general_admission',
          name: 'General Admission',
          description: 'Standard entry to the Christmas attraction for the selected evening, including access to all open walk-through areas, most shows, and general activities.',
          whatsIncluded: 'Includes entry for one guest on a single night, access to main light displays, live music, and general activity areas. Does not include reserved seating, photo packages, or complimentary food and drink.',
          perks: [
            'Access to main light displays',
            'Access to general seating areas (first-come, first-served)',
            'Access to outdoor live music and roaming entertainment'
          ],
          includesFreeDrink: false,
          adultPrice: 45.0,
          childPrice: 29.0,
          ticketCategory: 'standard',
          status: 'active',
          imageUrl: 'https://www.thelightsofchristmas.com/wp-content/uploads/The-Lights-of-Christmas-tickets-gal-1.jpg',
          displayOrder: 1
        },
        {
          id: 'vip_holiday_package',
          name: 'VIP Holiday Package',
          description: 'Upgrade your visit with VIP perks including priority entry, reserved viewing for the finale light show, and complimentary seasonal drinks.',
          whatsIncluded: 'Includes VIP entry for one guest on a single night, priority security and entry line, reserved viewing area for the Winter Aurora Finale Light Show, one complimentary holiday cocktail or hot cocoa, and a commemorative lanyard.',
          perks: [
            'Priority entry at VIP lane',
            'Reserved finale light show viewing area',
            'One complimentary holiday drink (cocktail or hot cocoa)',
            'Commemorative VIP lanyard'
          ],
          includesFreeDrink: true,
          adultPrice: 55.0,
          childPrice: 39.0,
          ticketCategory: 'vip',
          status: 'active',
          imageUrl: 'https://www.funktionevents.co.uk/images/pictures/new/uk/activities/eden/eden-reserved-area-with-vip-drinks-(product-player).jpg',
          displayOrder: 2
        },
        {
          id: 'family_night_ticket',
          name: 'Family Night Ticket',
          description: 'Discounted admission designed for families, available on select midweek Family Night dates.',
          whatsIncluded: 'Includes admission for one person on designated Family Night evenings, access to all family zones, and participation in family-focused activities.',
          perks: [
            'Discounted pricing on select dates',
            'Access to Family Night activities and games',
            'Complimentary kids\' activity sheet'
          ],
          includesFreeDrink: false,
          adultPrice: 30.0,
          childPrice: 20.0,
          ticketCategory: 'family',
          status: 'active',
          imageUrl: 'https://totsfamily.com/wp-content/uploads/2015/05/10-Ways-to-Have-a-Fun-Summer-with-Your-Kids.jpg',
          displayOrder: 3
        }
      ],
      transit_routes: [
        {
          id: 'bus_42_holiday_loop',
          name: 'Bus 42 – Downtown Holiday Loop',
          mode: 'bus',
          walkingTimeMinutes: 6,
          serviceStartTime: '06:30',
          serviceEndTime: '23:15',
          daysOfWeek: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ],
          description: 'Frequent bus service connecting the downtown transit hub to the attraction\'s North Gate stop.',
          detailsUrl: 'https://www.citytransit.gov/routes/42',
          notes: 'North Gate stop is directly across from the accessible entrance; increased frequency on Friday and Saturday evenings.'
        },
        {
          id: 'bus_15_crosstown',
          name: 'Bus 15 – Crosstown',
          mode: 'bus',
          walkingTimeMinutes: 12,
          serviceStartTime: '05:50',
          serviceEndTime: '21:45',
          daysOfWeek: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday'
          ],
          description: 'Crosstown route with a stop near the West Parking Entrance, about a 10–12 minute walk.',
          detailsUrl: 'https://www.citytransit.gov/routes/15',
          notes: 'Last evening trips may be crowded; check live tracker for delays.'
        },
        {
          id: 'bus_7_park_ride',
          name: 'Bus 7 – Park & Ride Shuttle',
          mode: 'bus',
          walkingTimeMinutes: 9,
          serviceStartTime: '15:00',
          serviceEndTime: '21:30',
          daysOfWeek: [
            'friday',
            'saturday',
            'sunday'
          ],
          description: 'Shuttle from the regional Park & Ride lot to a stop near the East Gate.',
          detailsUrl: 'https://www.citytransit.gov/routes/7',
          notes: 'Operates only during the holiday season; not all trips are wheelchair accessible.'
        }
      ],
      accessible_viewing_areas: [
        {
          id: 'view_main_plaza_light_deck',
          name: 'Main Plaza Light Show Viewing Deck',
          description: 'Raised, gently sloped deck with level surfaces reserved for guests using wheelchairs, mobility devices, or who need step-free viewing of the plaza light shows.',
          nearestEntranceId: 'north_gate_accessible',
          isWheelchairAccessible: true,
          seatingType: 'mixed',
          mapCoordinates: '47.6100,-122.2012',
          notes: 'Best spot for the Northern Lights Synchronized Show; arrive 10–15 minutes early for guaranteed space.'
        },
        {
          id: 'view_riverfront_finale_zone',
          name: 'Riverfront Finale Accessible Zone',
          description: 'Designated accessible viewing area along the riverfront lawn with unobstructed sightlines to the Winter Aurora Finale Light Show.',
          nearestEntranceId: 'south_gate_main',
          isWheelchairAccessible: true,
          seatingType: 'mixed',
          mapCoordinates: '47.6096,-122.2007',
          notes: 'Portable chairs available on request; mild sound levels with option to borrow ear defenders from staff.'
        },
        {
          id: 'view_parade_north_curb',
          name: 'North Gate Parade Curbside Area',
          description: 'Level curbside zone along the parade route, reserved for wheelchair users and guests with limited mobility during Santa\'s Grand Arrival Parade.',
          nearestEntranceId: 'north_gate_accessible',
          isWheelchairAccessible: true,
          seatingType: 'standing',
          mapCoordinates: '47.6102,-122.2016',
          notes: 'Marked with blue pavement decals; companions should stand behind the marked line to preserve front-row access.'
        }
      ],
      cart_items: [
        {
          id: 'cartitem_general_2adults',
          cartId: 'cart_example_general',
          itemType: 'ticket_type',
          sessionId: '',
          ticketTypeId: 'general_admission',
          ticketSelections: [
            {
              category: 'adult',
              quantity: 2,
              unitPrice: 45.0
            }
          ],
          addOnIds: [],
          lineTotal: 90.0,
          description: 'General Admission – 2 Adults'
        },
        {
          id: 'cartitem_vip_2adults',
          cartId: 'cart_example_vip',
          itemType: 'ticket_type',
          sessionId: '',
          ticketTypeId: 'vip_holiday_package',
          ticketSelections: [
            {
              category: 'adult',
              quantity: 2,
              unitPrice: 55.0
            }
          ],
          addOnIds: [],
          lineTotal: 110.0,
          description: 'VIP Holiday Package – 2 Adults (includes complimentary holiday drink)'
        },
        {
          id: 'cartitem_familynight_2a2c',
          cartId: 'cart_example_familynight',
          itemType: 'ticket_type',
          sessionId: '',
          ticketTypeId: 'family_night_ticket',
          ticketSelections: [
            {
              category: 'adult',
              quantity: 2,
              unitPrice: 30.0
            },
            {
              category: 'child',
              quantity: 2,
              unitPrice: 20.0
            }
          ],
          addOnIds: [],
          lineTotal: 100.0,
          description: 'Family Night Ticket – 2 Adults, 2 Children'
        }
      ],
      sessions: [
        {
          id: 'session_family_night_2026_12_10_1700',
          name: 'Family Night – 5:00 pm',
          eventType: 'family_night',
          startDateTime: '2026-12-10T17:00:00',
          endDateTime: '2026-12-10T21:00:00',
          audience: 'families',
          isSensoryFriendly: false,
          isFamilyNight: true,
          baseAdultPrice: 28.0,
          baseChildPrice: 18.0,
          locationName: 'Main Entry – North & South Gates',
          notes: 'Standard Family Night with full sound and lighting; some shows include mild strobe effects.',
          labels: ['Family Night', 'Value Night'],
          maxCapacity: 1800,
          isActive: true,
          addOnIds: [],
          remainingCapacity: 1800
        },
        {
          id: 'session_family_night_2026_12_12_1730',
          name: 'Family Night – 5:30 pm (Best Value)',
          eventType: 'family_night',
          startDateTime: '2026-12-12T17:30:00',
          endDateTime: '2026-12-12T21:30:00',
          audience: 'families',
          isSensoryFriendly: false,
          isFamilyNight: true,
          baseAdultPrice: 26.0,
          baseChildPrice: 16.0,
          locationName: 'Main Entry – North Gate',
          notes: 'Best-value Family Night pricing; recommended for budget-conscious families.',
          labels: ['Family Night', 'Best Value'],
          maxCapacity: 1700,
          isActive: true,
          addOnIds: [],
          remainingCapacity: 1700
        },
        {
          id: 'session_family_night_2026_12_15_1800',
          name: 'Family Night – 6:00 pm',
          eventType: 'family_night',
          startDateTime: '2026-12-15T18:00:00',
          endDateTime: '2026-12-15T22:00:00',
          audience: 'families',
          isSensoryFriendly: false,
          isFamilyNight: true,
          baseAdultPrice: 29.0,
          baseChildPrice: 19.0,
          locationName: 'Main Entry – South Gate',
          notes: 'Arrive early to enjoy pre-show carolers in the Main Plaza.',
          labels: ['Family Night'],
          maxCapacity: 1800,
          isActive: true,
          addOnIds: [],
          remainingCapacity: 1800
        }
      ],
      group_session_options: [
        {
          id: 'groupopt_2026_12_11_2015_standard',
          sessionId: 'session_group_2026_12_11_2015',
          name: 'Group Evening – Fri Dec 11, 8:15 pm',
          startDateTime: '2026-12-11T20:15:00',
          endDateTime: '2026-12-11T22:30:00',
          minGroupSize: 10,
          maxGroupSize: 40,
          pricePerPerson: 30.0,
          hasGroupDiscount: true,
          badges: ['Group Discount', 'Friday Night'],
          paymentMethodsAvailable: ['credit_card', 'invoice_later'],
          isActive: true
        },
        {
          id: 'groupopt_2026_12_11_2045_bestdeal',
          sessionId: 'session_group_2026_12_11_2045',
          name: 'Group Evening – Fri Dec 11, 8:45 pm (Best Deal)',
          startDateTime: '2026-12-11T20:45:00',
          endDateTime: '2026-12-11T23:00:00',
          minGroupSize: 10,
          maxGroupSize: 60,
          pricePerPerson: 28.0,
          hasGroupDiscount: true,
          badges: ['Group Discount', 'Best Deal', 'After 8 pm'],
          paymentMethodsAvailable: ['credit_card', 'pay_on_arrival', 'invoice_later'],
          isActive: true
        },
        {
          id: 'groupopt_2026_12_18_2030_standard',
          sessionId: 'session_group_2026_12_18_2030',
          name: 'Group Evening – Fri Dec 18, 8:30 pm',
          startDateTime: '2026-12-18T20:30:00',
          endDateTime: '2026-12-18T23:00:00',
          minGroupSize: 10,
          maxGroupSize: 80,
          pricePerPerson: 32.0,
          hasGroupDiscount: true,
          badges: ['Group Discount', 'After 8 pm'],
          paymentMethodsAvailable: ['credit_card', 'pay_on_arrival'],
          isActive: true
        }
      ],
      session_addons: [
        {
          id: 'addon_family_photo_2026_12_18',
          sessionId: 'session_family_night_2026_12_18_1730',
          name: 'Family Photo with Santa',
          description: 'Reserved time slot for a professional family photo with Santa, including a digital download package.',
          price: 25.0,
          defaultSelected: false,
          isActive: true
        },
        {
          id: 'addon_cocoa_bundle_2026_12_18',
          sessionId: 'session_family_night_2026_12_18_1730',
          name: 'Cocoa & Cookie Bundle',
          description: 'Four hot cocoas and four decorated cookies, ready for pickup at the Main Plaza cocoa stand.',
          price: 18.0,
          defaultSelected: false,
          isActive: true
        },
        {
          id: 'addon_sensory_parking_2026_12_12_0900',
          sessionId: 'session_sensory_2026_12_12_0900',
          name: 'Prepaid Parking – Sensory Morning',
          description: 'Discounted prepaid parking in the North Garage for the 9:00 am sensory-friendly session.',
          price: 5.0,
          defaultSelected: true,
          isActive: true
        }
      ],
      session_ticket_prices: [
        {
          id: 'stp_family_2026_12_10_adult',
          sessionId: 'session_family_night_2026_12_10_1700',
          category: 'adult',
          price: 28.0,
          description: 'Adult ticket (ages 13+)',
          minAge: 13,
          maxAge: null,
          currency: 'USD'
        },
        {
          id: 'stp_family_2026_12_10_child',
          sessionId: 'session_family_night_2026_12_10_1700',
          category: 'child',
          price: 18.0,
          description: 'Child ticket (ages 3–12)',
          minAge: 3,
          maxAge: 12,
          currency: 'USD'
        },
        {
          id: 'stp_family_2026_12_12_1730_adult',
          sessionId: 'session_family_night_2026_12_12_1730',
          category: 'adult',
          price: 26.0,
          description: 'Adult ticket (ages 13+)',
          minAge: 13,
          maxAge: null,
          currency: 'USD'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T04:02:22.902378'
      }
    };

    // Extend data to support all tasks while preserving generated data

    // Activities: add one indoor workshop/craft on Dec 18
    const activities = (generatedData.activities || []).slice();
    activities.push({
      id: 'act_craft_cookie_181800',
      title: 'Elf Workshop: Cookie Decorating Craft',
      description: 'Hands-on indoor cookie decorating workshop perfect for families.',
      startDateTime: '2026-12-18T18:00:00',
      endDateTime: '2026-12-18T18:45:00',
      category: 'workshop_craft',
      audience: 'families',
      locationName: 'Indoor Craft Lodge',
      locationType: 'indoor',
      accessibilityNotes: 'Level entry, seated tables, low-scent materials.',
      isActive: true
    });

    // Sessions: add a sensory-friendly Saturday morning session referenced by addons
    const sessions = (generatedData.sessions || []).slice();
    sessions.push({
      id: 'session_sensory_2026_12_12_0900',
      name: 'Sensory-Friendly Morning – 9:00 am',
      eventType: 'sensory_friendly',
      startDateTime: '2026-12-12T09:00:00',
      endDateTime: '2026-12-12T12:00:00',
      audience: 'families',
      isSensoryFriendly: true,
      isFamilyNight: false,
      baseAdultPrice: 20.0,
      baseChildPrice: 15.0,
      locationName: 'North Gate – Quiet Entry',
      notes: 'Volume-limited music, no strobes, reduced capacity.',
      labels: ['Sensory-Friendly', 'Morning'],
      maxCapacity: 800,
      isActive: true,
      addOnIds: ['addon_sensory_parking_2026_12_12_0900'],
      remainingCapacity: 800
    });

    // Session ticket prices: add adult/child prices for sensory session
    const sessionTicketPrices = (generatedData.session_ticket_prices || []).slice();
    sessionTicketPrices.push(
      {
        id: 'stp_sensory_2026_12_12_0900_adult',
        sessionId: 'session_sensory_2026_12_12_0900',
        category: 'adult',
        price: 20.0,
        description: 'Adult ticket (ages 13+)',
        minAge: 13,
        maxAge: null,
        currency: 'USD'
      },
      {
        id: 'stp_sensory_2026_12_12_0900_child',
        sessionId: 'session_sensory_2026_12_12_0900',
        category: 'child',
        price: 15.0,
        description: 'Child ticket (ages 3–12)',
        minAge: 3,
        maxAge: 12,
        currency: 'USD'
      }
    );

    // Write all relevant collections to localStorage using storage keys
    localStorage.setItem('activities', JSON.stringify(activities));
    localStorage.setItem('entrances', JSON.stringify(generatedData.entrances || []));
    localStorage.setItem('ticket_types', JSON.stringify(generatedData.ticket_types || []));
    localStorage.setItem('transit_routes', JSON.stringify(generatedData.transit_routes || []));
    localStorage.setItem('accessible_viewing_areas', JSON.stringify(generatedData.accessible_viewing_areas || []));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items || []));
    localStorage.setItem('sessions', JSON.stringify(sessions));
    localStorage.setItem('group_session_options', JSON.stringify(generatedData.group_session_options || []));
    localStorage.setItem('session_addons', JSON.stringify(generatedData.session_addons || []));
    localStorage.setItem('session_ticket_prices', JSON.stringify(sessionTicketPrices));

    // Ensure other collections exist as arrays if _initStorage did not already
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };
    ensureArrayKey('itineraries');
    ensureArrayKey('itinerary_items');
    ensureArrayKey('group_bookings');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('cart');
    ensureArrayKey('contact_messages');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_FamilyNightCheapest();
    this.testTask2_FamilyItinerary();
    this.testTask3_AccessibilityAndContact();
    this.testTask4_SensoryFriendlyMorning();
    this.testTask5_GroupBookingWithDiscount();
    this.testTask6_NewsletterSubscription();
    this.testTask7_TicketTypeComparison();
    this.testTask8_TransitRouteAndContact();

    return this.results;
  }

  // Task 1: Book the cheapest Family Night visit between Dec 10–20 starting 5–7 pm for 2 adults and 2 children
  testTask1_FamilyNightCheapest() {
    const testName = 'Task 1: Cheapest Family Night session 2A2C to cart';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Tickets & Pricing
      const filterOptions = this.logic.getSessionFilterOptions();
      const sortOptions = this.logic.getSessionSortOptions();

      // Get Family Night event type id from filter options (fallback to enum if needed)
      let familyNightEventTypeId = null;
      if (filterOptions && Array.isArray(filterOptions.eventTypes)) {
        const opt = filterOptions.eventTypes.find(o =>
          o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('family night') !== -1
        );
        if (opt) {
          familyNightEventTypeId = opt.id;
        }
      }
      if (!familyNightEventTypeId) {
        familyNightEventTypeId = 'family_night';
      }

      // Get sort option for family-of-4 price ascending
      let familySortId = null;
      if (Array.isArray(sortOptions)) {
        const opt = sortOptions.find(o =>
          (o && typeof o.id === 'string' && o.id === 'family_of_4_price_asc') ||
          (o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('family') !== -1)
        );
        if (opt) {
          familySortId = opt.id;
        }
      }

      // Search Family Night sessions between Dec 10–20, start 17:00–19:00
      const sessionsResult = this.logic.searchSessions(
        '2026-12-10',
        '2026-12-20',
        [familyNightEventTypeId],
        'families',
        null,
        true,
        '17:00',
        '19:00',
        familySortId
      );

      this.assert(Array.isArray(sessionsResult) && sessionsResult.length > 0,
        'Should find at least one Family Night session in date/time range');

      const selectedEntry = sessionsResult[0];
      this.assert(selectedEntry && selectedEntry.session && selectedEntry.session.id,
        'Selected Family Night session should have an id');

      const sessionId = selectedEntry.session.id;

      // Get booking details for the chosen session
      const bookingDetails = this.logic.getSessionBookingDetails(sessionId);
      this.assert(bookingDetails && bookingDetails.session,
        'Should retrieve session booking details');

      const ticketCategories = bookingDetails.ticketCategories || [];
      const adultCat = ticketCategories.find(t => t.category === 'adult');
      const childCat = ticketCategories.find(t => t.category === 'child');

      this.assert(adultCat, 'Session should have an adult ticket category');
      this.assert(childCat, 'Session should have a child ticket category');

      const ticketSelections = [
        { category: 'adult', quantity: 2, unitPrice: adultCat.price },
        { category: 'child', quantity: 2, unitPrice: childCat.price }
      ];

      // Add to cart with no add-ons
      const addResult = this.logic.addSessionTicketsToCart(sessionId, ticketSelections, []);
      this.assert(addResult && addResult.success === true,
        'addSessionTicketsToCart should succeed for Family Night session');
      this.assert(addResult.addedItem && addResult.addedItem.cartItemId,
        'Response should include added cart item id');
      this.assert(addResult.cartSummary && addResult.cartSummary.total > 0,
        'Cart total should be positive after adding Family Night tickets');

      // Verify cart contents via API
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items),
        'getCartSummary should return items array');

      const cartItem = cartSummary.items.find(item =>
        item.itemType === 'session_ticket' &&
        Array.isArray(item.ticketSelections) &&
        item.ticketSelections.some(sel => sel.category === 'adult' && sel.quantity === 2) &&
        item.ticketSelections.some(sel => sel.category === 'child' && sel.quantity === 2)
      );

      this.assert(cartItem, 'Cart should contain a Family Night session item with 2 adults and 2 children');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a 3-activity family itinerary on Dec 18 with Santa, light show, and indoor craft
  testTask2_FamilyItinerary() {
    const testName = 'Task 2: 3-activity family itinerary on Dec 18';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Schedule & Activities
      const scheduleFilters = this.logic.getScheduleFilterOptions();

      // Use Dec 18, audience families, 16:00–20:00
      const date = '2026-12-18';
      const audience = 'families';
      const timeStart = '16:00';
      const timeEnd = '20:00';

      // 1) Santa activity
      const allActivities = this.logic.searchActivities(date, audience, timeStart, timeEnd, null, null);
      this.assert(Array.isArray(allActivities) && allActivities.length > 0,
        'Should find activities for Dec 18');

      const santaCandidates = allActivities.filter(r => {
        return r.activity && r.activity.title &&
          r.activity.title.toLowerCase().indexOf('santa') !== -1 &&
          r.canAddToItinerary;
      });
      this.assert(santaCandidates.length > 0, 'Should have at least one Santa activity');

      santaCandidates.sort((a, b) => {
        return new Date(a.activity.startDateTime) - new Date(b.activity.startDateTime);
      });
      const santaActivityId = santaCandidates[0].activity.id;

      const santaDetails = this.logic.getActivityDetails(santaActivityId);
      this.assert(santaDetails && santaDetails.activity,
        'getActivityDetails should return Santa activity');

      let addResult = this.logic.addActivityToItinerary(santaActivityId);
      this.assert(addResult && addResult.success === true,
        'Should be able to add Santa activity to itinerary');
      this.assert(addResult.itinerary && Array.isArray(addResult.itinerary.items) &&
        addResult.itinerary.items.length === 1,
        'Itinerary should contain 1 item after adding Santa');

      // 2) Light show, earliest between 16:00–20:00
      const lightShowCategory = 'light_show';
      const lightSearch = this.logic.searchActivities(date, audience, timeStart, timeEnd, lightShowCategory, null);
      this.assert(Array.isArray(lightSearch) && lightSearch.length > 0,
        'Should find at least one light show');

      lightSearch.sort((a, b) => {
        return new Date(a.activity.startDateTime) - new Date(b.activity.startDateTime);
      });
      const lightActivityId = lightSearch[0].activity.id;

      const lightDetails = this.logic.getActivityDetails(lightActivityId);
      this.assert(lightDetails && lightDetails.activity,
        'getActivityDetails should return light show activity');

      addResult = this.logic.addActivityToItinerary(lightActivityId);
      this.assert(addResult && addResult.success === true,
        'Should be able to add light show to itinerary');
      this.assert(addResult.itinerary && Array.isArray(addResult.itinerary.items) &&
        addResult.itinerary.items.length === 2,
        'Itinerary should contain 2 items after adding light show');

      // 3) Indoor workshop/craft activity
      const workshopCategory = 'workshop_craft';
      const indoorLocationType = 'indoor';
      const craftSearch = this.logic.searchActivities(date, audience, timeStart, timeEnd, workshopCategory, indoorLocationType);
      this.assert(Array.isArray(craftSearch) && craftSearch.length > 0,
        'Should find at least one indoor workshop/craft');

      const craftActivityId = craftSearch[0].activity.id;
      const craftDetails = this.logic.getActivityDetails(craftActivityId);
      this.assert(craftDetails && craftDetails.activity,
        'getActivityDetails should return craft activity');

      addResult = this.logic.addActivityToItinerary(craftActivityId);
      this.assert(addResult && addResult.success === true,
        'Should be able to add craft workshop to itinerary');
      this.assert(addResult.itinerary && Array.isArray(addResult.itinerary.items) &&
        addResult.itinerary.items.length === 3,
        'Itinerary should contain 3 items after adding craft workshop');

      // Final itinerary view
      const itineraryResult = this.logic.getItinerary(date);
      this.assert(itineraryResult && itineraryResult.itinerary,
        'getItinerary should return itinerary for Dec 18');

      const items = itineraryResult.itinerary.items || [];
      this.assert(items.length === 3,
        'Itinerary should have exactly 3 activities');

      const categories = items.map(i => i.activity && i.activity.category).filter(Boolean);
      this.assert(categories.indexOf('santa_experience') !== -1,
        'Itinerary should include a Santa activity');
      this.assert(categories.indexOf('light_show') !== -1,
        'Itinerary should include a light show');
      this.assert(categories.indexOf('workshop_craft') !== -1,
        'Itinerary should include a workshop/craft');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Find wheelchair-accessible entrance and viewing area and contact accessibility team
  testTask3_AccessibilityAndContact() {
    const testName = 'Task 3: Accessibility info and accessibility inquiry submission';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Accessibility page
      const overview = this.logic.getAccessibilityOverview();
      this.assert(overview && typeof overview.wheelchairAccessInfo === 'string',
        'Accessibility overview should include wheelchair access info');

      const entrances = this.logic.listAccessibleEntrances();
      this.assert(Array.isArray(entrances) && entrances.length > 0,
        'Should list accessible entrances');

      // Main accessible entrance: wheelchair accessible & main entrance flag
      const mainAccessibleEntrance = entrances.find(e => e.isWheelchairAccessible && e.isMainEntrance);
      this.assert(mainAccessibleEntrance,
        'Should have a main wheelchair-accessible entrance');

      const entranceDetails = this.logic.getEntranceDetails(mainAccessibleEntrance.id);
      this.assert(entranceDetails && entranceDetails.entrance && entranceDetails.entrance.id === mainAccessibleEntrance.id,
        'getEntranceDetails should return the selected entrance');

      // Accessible viewing area
      const viewingAreas = this.logic.listAccessibleViewingAreas();
      this.assert(Array.isArray(viewingAreas) && viewingAreas.length > 0,
        'Should list accessible viewing areas');

      const firstViewing = viewingAreas[0];
      const viewingDetails = this.logic.getAccessibleViewingAreaDetails(firstViewing.id);
      this.assert(viewingDetails && viewingDetails.accessibleViewingArea && viewingDetails.accessibleViewingArea.id === firstViewing.id,
        'getAccessibleViewingAreaDetails should return selected viewing area');
      this.assert(viewingDetails.nearestEntrance && viewingDetails.nearestEntrance.id,
        'Viewing area details should include nearest entrance');

      // Submit accessibility inquiry
      const visitorName = 'Jordan Lee';
      const visitorEmail = 'jordan.lee@example.com';
      const messageText = 'Hello, can wheelchairs be reserved at the ' + mainAccessibleEntrance.name + ' entrance?';

      const submitResult = this.logic.submitAccessibilityInquiry(
        'accessibility_mobility',
        visitorName,
        visitorEmail,
        messageText,
        mainAccessibleEntrance.name
      );

      this.assert(submitResult && submitResult.success === true,
        'submitAccessibilityInquiry should succeed');
      this.assert(submitResult.messageId,
        'submitAccessibilityInquiry should return a messageId');

      // Verify ContactMessage persisted with correct topic and relatedContext
      const storedRaw = localStorage.getItem('contact_messages');
      const storedMessages = JSON.parse(storedRaw || '[]');
      const created = storedMessages.find(m => m.id === submitResult.messageId);
      this.assert(created, 'A ContactMessage record should be stored for accessibility inquiry');
      this.assert(created.topic === 'accessibility_mobility',
        'ContactMessage topic should be accessibility_mobility');
      this.assert(created.name === visitorName && created.email === visitorEmail,
        'ContactMessage should store name and email from inquiry');
      this.assert(created.relatedContext === mainAccessibleEntrance.name,
        'ContactMessage.relatedContext should reference the entrance name');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Select sensory-friendly morning next Saturday with child ticket <= 15 and add 1 adult + 1 child without add-ons
  testTask4_SensoryFriendlyMorning() {
    const testName = 'Task 4: Sensory-friendly Saturday morning session 1A1C to cart without add-ons';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Tickets & Pricing, Sensory-Friendly filter
      const sessionFilters = this.logic.getSessionFilterOptions();

      // Determine sensory-friendly event type id
      let sensoryEventTypeId = null;
      if (sessionFilters && Array.isArray(sessionFilters.eventTypes)) {
        const opt = sessionFilters.eventTypes.find(o =>
          o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('sensory') !== -1
        );
        if (opt) {
          sensoryEventTypeId = opt.id;
        }
      }
      if (!sensoryEventTypeId) {
        sensoryEventTypeId = 'sensory_friendly';
      }

      // Search all sensory-friendly sessions in season
      const sensorySessions = this.logic.searchSessions(
        '2026-01-01',
        '2026-12-31',
        [sensoryEventTypeId],
        'families',
        true,
        null,
        '00:00',
        '23:59',
        null
      );

      this.assert(Array.isArray(sensorySessions) && sensorySessions.length > 0,
        'Should find at least one sensory-friendly session');

      // Filter to Saturday mornings (start before 10:00) and select one with child ticket <= 15
      const saturdayMorning = sensorySessions.filter(entry => {
        const s = entry.session;
        if (!s || !s.startDateTime) return false;
        const dt = new Date(s.startDateTime);
        const day = dt.getDay(); // 6 = Saturday
        const hour = dt.getHours();
        return day === 6 && hour < 10;
      });

      this.assert(saturdayMorning.length > 0,
        'Should have at least one Saturday morning sensory-friendly session');

      let chosenEntry = null;
      let chosenDetails = null;
      let adultCat = null;
      let childCat = null;

      for (let i = 0; i < saturdayMorning.length; i++) {
        const entry = saturdayMorning[i];
        const sessionId = entry.session.id;
        const details = this.logic.getSessionBookingDetails(sessionId);
        this.assert(details && details.session,
          'getSessionBookingDetails should return session for sensory search result');
        const categories = details.ticketCategories || [];
        const aCat = categories.find(c => c.category === 'adult');
        const cCat = categories.find(c => c.category === 'child');
        if (aCat && cCat && typeof cCat.price === 'number' && cCat.price <= 15) {
          chosenEntry = entry;
          chosenDetails = details;
          adultCat = aCat;
          childCat = cCat;
          break;
        }
      }

      this.assert(chosenEntry && chosenDetails && adultCat && childCat,
        'Should choose a Saturday morning sensory-friendly session with child price <= 15');

      const sessionId = chosenEntry.session.id;

      // Confirm there is at least one default-selected add-on for this session
      const addOns = chosenDetails.addOns || [];
      const defaultSelectedAddOns = addOns.filter(a => a.defaultSelected);
      this.assert(defaultSelectedAddOns.length > 0,
        'Sensory-friendly session should have at least one default-selected add-on');

      // Build ticket selections for 1 adult + 1 child
      const ticketSelections = [
        { category: 'adult', quantity: 1, unitPrice: adultCat.price },
        { category: 'child', quantity: 1, unitPrice: childCat.price }
      ];

      // Add to cart with NO add-ons (override defaultSelected)
      const addResult = this.logic.addSessionTicketsToCart(sessionId, ticketSelections, []);
      this.assert(addResult && addResult.success === true,
        'addSessionTicketsToCart should succeed for sensory-friendly session');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items),
        'getCartSummary should return items after adding sensory-friendly session');

      const cartItem = cartSummary.items.find(item =>
        item.itemType === 'session_ticket' &&
        Array.isArray(item.ticketSelections) &&
        item.ticketSelections.some(sel => sel.category === 'adult' && sel.quantity === 1) &&
        item.ticketSelections.some(sel => sel.category === 'child' && sel.quantity === 1)
      );

      this.assert(cartItem, 'Cart should contain sensory-friendly session item with 1 adult and 1 child');

      const addOnSummaries = cartItem.addOnSummaries || [];
      this.assert(addOnSummaries.length === 0,
        'Cart item should have no add-ons after explicitly passing empty addOnIds');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Evening group booking for 15 people on Friday after 8 pm with group discount and pay-on-arrival-type method
  testTask5_GroupBookingWithDiscount() {
    const testName = 'Task 5: Group booking for 15 with discount and pay-on-arrival-type payment';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Groups & Parties
      const groupsContent = this.logic.getGroupsOverviewContent();
      this.assert(groupsContent && typeof groupsContent.introText === 'string',
        'Groups overview content should be available');

      const groupSize = 15;

      // Search Friday options after 20:00 with group discount, sorted by price per person asc
      const groupOptions = this.logic.searchGroupSessionOptions(
        groupSize,
        null,
        '20:00',
        null,
        'friday',
        true,
        'price_per_person_asc'
      );

      this.assert(Array.isArray(groupOptions) && groupOptions.length > 0,
        'Should find at least one group session option matching filters');

      const selectedGroupOption = groupOptions[0];
      this.assert(selectedGroupOption && selectedGroupOption.id,
        'Selected group session option should have an id');
      this.assert(selectedGroupOption.hasGroupDiscount === true,
        'Selected group option should have a group discount');

      // Determine suitable payment method (prefer pay_on_arrival, then invoice_later)
      const availableMethods = selectedGroupOption.paymentMethodsAvailable || [];
      let paymentMethod = null;
      if (availableMethods.indexOf('pay_on_arrival') !== -1) {
        paymentMethod = 'pay_on_arrival';
      } else if (availableMethods.indexOf('invoice_later') !== -1) {
        paymentMethod = 'invoice_later';
      } else {
        // Fallback to pay_online if nothing else; still a valid enum
        paymentMethod = 'pay_online';
      }

      const groupDetails = this.logic.getGroupSessionDetails(selectedGroupOption.id, groupSize);
      this.assert(groupDetails && groupDetails.groupSessionOption && groupDetails.groupSessionOption.id === selectedGroupOption.id,
        'getGroupSessionDetails should return details for selected group option');
      this.assert(groupDetails.priceEstimate && groupDetails.priceEstimate.groupSize === groupSize,
        'Price estimate should be calculated for groupSize 15');

      // Create group booking (no external payment)
      const bookingResult = this.logic.createGroupBooking(
        selectedGroupOption.id,
        groupSize,
        paymentMethod,
        'Taylor Morgan',
        '555-123-4567',
        'taylor.morgan@example.com'
      );

      this.assert(bookingResult && bookingResult.success === true,
        'createGroupBooking should succeed');
      this.assert(bookingResult.groupBooking && bookingResult.groupBooking.id,
        'Group booking should include an id');
      this.assert(bookingResult.groupBooking.groupSize === groupSize,
        'Group booking should store correct group size');
      this.assert(bookingResult.groupBooking.paymentMethod === paymentMethod,
        'Group booking should store chosen payment method');

      // Verify booking exists in storage
      const bookingsRaw = localStorage.getItem('group_bookings');
      const bookings = JSON.parse(bookingsRaw || '[]');
      const stored = bookings.find(b => b.id === bookingResult.groupBooking.id);
      this.assert(stored, 'Group booking should be persisted in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Subscribe to holiday newsletter with weekly updates about family activities and special offers
  testTask6_NewsletterSubscription() {
    const testName = 'Task 6: Newsletter subscription weekly, family activities + special offers';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation from homepage newsletter promo
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && homeContent.newsletterPromo,
        'Home page should expose newsletter promo content');

      const options = this.logic.getNewsletterSignupOptions();
      this.assert(options && Array.isArray(options.interestOptions) && Array.isArray(options.frequencyOptions),
        'Newsletter signup options should include interests and frequency choices');

      // Select interest categories: Family Activities and Special Offers & Discounts
      const interestOptions = options.interestOptions;
      const familyInterest = interestOptions.find(o =>
        o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('family activities') !== -1
      );
      const offersInterest = interestOptions.find(o =>
        o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('special offers') !== -1
      );

      this.assert(familyInterest && offersInterest,
        'Should find Family Activities and Special Offers & Discounts interest options');

      // Frequency: weekly
      const freqOptions = options.frequencyOptions;
      let weeklyOption = freqOptions.find(o => o.id === 'weekly');
      if (!weeklyOption) {
        weeklyOption = freqOptions.find(o =>
          o && typeof o.label === 'string' && o.label.toLowerCase().indexOf('weekly') !== -1
        );
      }
      this.assert(weeklyOption,
        'Should have a weekly frequency option');

      const email = 'family.visitor@example.com';
      const firstName = 'Alex';
      const postalCode = '02134';

      const createResult = this.logic.createNewsletterSubscription(
        email,
        firstName,
        postalCode,
        [familyInterest.id, offersInterest.id],
        weeklyOption.id
      );

      this.assert(createResult && createResult.success === true,
        'createNewsletterSubscription should succeed');
      this.assert(createResult.subscription && createResult.subscription.email === email,
        'Subscription should store the provided email');
      this.assert(Array.isArray(createResult.subscription.interests) &&
        createResult.subscription.interests.indexOf(familyInterest.id) !== -1 &&
        createResult.subscription.interests.indexOf(offersInterest.id) !== -1,
        'Subscription should include both selected interests');
      this.assert(createResult.subscription.frequency === weeklyOption.id,
        'Subscription should store weekly frequency');

      // Verify stored in localStorage
      const subsRaw = localStorage.getItem('newsletter_subscriptions');
      const subs = JSON.parse(subsRaw || '[]');
      const stored = subs.find(s => s.id === createResult.subscription.id);
      this.assert(stored, 'Newsletter subscription should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Choose between General Admission and VIP based on free drink perk and total price for 2 adults under $120
  testTask7_TicketTypeComparison() {
    const testName = 'Task 7: Choose best ticket type (General vs VIP) for 2 adults and add to cart';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Tickets & Pricing overview
      const ticketTypes = this.logic.getTicketTypesForListing();
      this.assert(Array.isArray(ticketTypes) && ticketTypes.length > 0,
        'getTicketTypesForListing should return ticket types');

      const general = ticketTypes.find(t => t.name === 'General Admission');
      const vip = ticketTypes.find(t => t.name === 'VIP Holiday Package');

      this.assert(general && vip,
        'Should have both General Admission and VIP Holiday Package ticket types');

      const generalDetails = this.logic.getTicketTypeDetails(general.id);
      const vipDetails = this.logic.getTicketTypeDetails(vip.id);

      this.assert(generalDetails && generalDetails.ticketType,
        'Should get General Admission details');
      this.assert(vipDetails && vipDetails.ticketType,
        'Should get VIP Holiday Package details');

      const gen = generalDetails.ticketType;
      const vipT = vipDetails.ticketType;

      const genTotal = gen.adultPrice * 2;
      const vipTotal = vipT.adultPrice * 2;

      const genQualifies = !!gen.includesFreeDrink && genTotal <= 120;
      const vipQualifies = !!vipT.includesFreeDrink && vipTotal <= 120;

      let chosenTicket = null;
      let chosenTotal = null;

      if (genQualifies && vipQualifies) {
        if (genTotal <= vipTotal) {
          chosenTicket = gen;
          chosenTotal = genTotal;
        } else {
          chosenTicket = vipT;
          chosenTotal = vipTotal;
        }
      } else if (genQualifies) {
        chosenTicket = gen;
        chosenTotal = genTotal;
      } else if (vipQualifies) {
        chosenTicket = vipT;
        chosenTotal = vipTotal;
      } else {
        const candidates = [];
        if (genTotal <= 120) candidates.push({ t: gen, total: genTotal });
        if (vipTotal <= 120) candidates.push({ t: vipT, total: vipTotal });
        this.assert(candidates.length > 0,
          'At least one ticket type should have total <= 120');
        candidates.sort((a, b) => a.total - b.total);
        chosenTicket = candidates[0].t;
        chosenTotal = candidates[0].total;
      }

      this.assert(chosenTicket && typeof chosenTotal === 'number',
        'A ticket type should be chosen according to the rules');

      // Add 2 adult tickets for chosen type
      const addResult = this.logic.addTicketTypeToCart(chosenTicket.id, [
        { category: 'adult', quantity: 2 }
      ]);

      this.assert(addResult && addResult.success === true,
        'addTicketTypeToCart should succeed for chosen ticket type');
      this.assert(addResult.addedItem && addResult.addedItem.cartItemId,
        'Ticket-type cart addition should return cart item id');
      this.assert(addResult.cartSummary && addResult.cartSummary.total > 0,
        'Cart total should be positive after adding 2 adult tickets');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items),
        'getCartSummary should list cart items');

      const cartItem = cartSummary.items.find(item =>
        item.itemType === 'ticket_type' &&
        Array.isArray(item.ticketSelections) &&
        item.ticketSelections.length === 1 &&
        item.ticketSelections[0].category === 'adult' &&
        item.ticketSelections[0].quantity === 2
      );

      this.assert(cartItem,
        'Cart should contain a ticket_type item with 2 adult tickets');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Find late-night bus route and send transportation question via contact form
  testTask8_TransitRouteAndContact() {
    const testName = 'Task 8: Late-night bus route and transportation contact message';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: Getting Here / Directions & Parking
      const gettingHere = this.logic.getGettingHereContent();
      this.assert(gettingHere && typeof gettingHere.publicTransitInfo === 'string',
        'Getting Here content should include public transit info');

      // Filter bus routes within 10-minute walk and running until at least 22:00
      const routes = this.logic.searchTransitRoutes('bus', 10, '22:00', null);
      this.assert(Array.isArray(routes) && routes.length > 0,
        'Should find at least one suitable bus route');

      const selectedRoute = routes[0];
      const routeDetails = this.logic.getTransitRouteDetails(selectedRoute.id);
      this.assert(routeDetails && routeDetails.transitRoute && routeDetails.transitRoute.id === selectedRoute.id,
        'getTransitRouteDetails should return selected route');

      // Confirm service end time >= 22:00 and walking time <= 10
      const route = routeDetails.transitRoute;
      this.assert(route.walkingTimeMinutes <= 10,
        'Selected route walking time should be <= 10 minutes');
      this.assert(route.serviceEndTime >= '22:00',
        'Selected route should run until at least 22:00');

      // Navigate to Contact Us and send message
      const topics = this.logic.getContactTopics();
      this.assert(Array.isArray(topics) && topics.length > 0,
        'getContactTopics should return topics');

      const transportTopic = topics.find(t =>
        t && typeof t.label === 'string' && t.label.toLowerCase().indexOf('transportation') !== -1
      );
      this.assert(transportTopic,
        'Should find Transportation & Parking contact topic');

      const name = 'Riley Chen';
      const email = 'riley.chen@example.com';
      const message = 'Hello, could you please tell me the exact last departure time for ' + route.name + '?';

      const submitResult = this.logic.submitContactMessage(
        transportTopic.id,
        name,
        email,
        message,
        route.name
      );

      this.assert(submitResult && submitResult.success === true,
        'submitContactMessage should succeed');
      this.assert(submitResult.messageId,
        'Contact message submission should return a messageId');

      // Verify ContactMessage persisted correctly
      const storedRaw = localStorage.getItem('contact_messages');
      const stored = JSON.parse(storedRaw || '[]');
      const created = stored.find(m => m.id === submitResult.messageId);
      this.assert(created, 'ContactMessage should be stored in localStorage');
      this.assert(created.topic === 'transportation_parking',
        'ContactMessage topic should be transportation_parking');
      this.assert(created.relatedContext === route.name,
        'ContactMessage.relatedContext should mention the selected route name');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: simple assertion
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
