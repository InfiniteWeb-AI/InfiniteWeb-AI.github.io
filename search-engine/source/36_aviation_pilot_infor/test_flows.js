// Test runner for business logic

class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage shim for Node.js
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem(key, value) { this._data[key] = String(value); },
        getItem(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
        removeItem(key) { delete this._data[key]; },
        clear() { this._data = {}; }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided, only here
    const generatedData = {
      airports: [
        {
          id: 'KJFK',
          icaoCode: 'KJFK',
          iataCode: 'JFK',
          faaCode: 'JFK',
          name: 'John F. Kennedy International Airport',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          latitude: 40.6413,
          longitude: -73.7781,
          elevationFt: 13,
          timezone: 'America/New_York',
          longestRunwayLengthFt: 14572,
          userRating: 4.4,
          userRatingCount: 213
        },
        {
          id: 'KSFO',
          icaoCode: 'KSFO',
          iataCode: 'SFO',
          faaCode: 'SFO',
          name: 'San Francisco International Airport',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          latitude: 37.6213,
          longitude: -122.379,
          elevationFt: 13,
          timezone: 'America/Los_Angeles',
          longestRunwayLengthFt: 11870,
          userRating: 4.6,
          userRatingCount: 320
        },
        {
          id: 'KOAK',
          icaoCode: 'KOAK',
          iataCode: 'OAK',
          faaCode: 'OAK',
          name: 'Oakland International Airport',
          city: 'Oakland',
          state: 'CA',
          country: 'USA',
          latitude: 37.7213,
          longitude: -122.2207,
          elevationFt: 9,
          timezone: 'America/Los_Angeles',
          longestRunwayLengthFt: 10400,
          userRating: 4.4,
          userRatingCount: 187
        }
      ],
      articles: [
        {
          id: 'art_class_b_overview',
          title: 'Class B Airspace Basics for VFR Pilots',
          summary: 'An overview of Class B airspace structure, entry requirements, and practical tips for VFR pilots.',
          content: 'Class B airspace surrounds the busiest airports in the national airspace system and is designed to contain all published instrument procedures... ',
          publishedAt: '2024-06-15T10:00:00Z',
          readingTimeMinutes: 12,
          popularityScore: 94,
          rating: 4.8,
          topicTags: [
            'Class B airspace',
            'Airspace',
            'VFR'
          ],
          url: 'article_detail.html?articleId=art_class_b_overview'
        },
        {
          id: 'art_class_b_clearances',
          title: 'Getting and Reading a Class B Clearance',
          summary: 'Step-by-step guidance on requesting, copying, and complying with Class B clearances.',
          content: 'Before entering Class B airspace, you must hear the magic words: Cleared into the Bravo... This article walks through sample radio calls and scenarios... ',
          publishedAt: '2023-09-20T15:30:00Z',
          readingTimeMinutes: 9,
          popularityScore: 88,
          rating: 4.7,
          topicTags: [
            'Class B airspace',
            'Radio communications',
            'VFR'
          ],
          url: 'article_detail.html?articleId=art_class_b_clearances'
        },
        {
          id: 'art_class_b_traffic_patterns',
          title: 'Flying Traffic Patterns Near Class B Airports',
          summary: 'How to safely integrate with pattern traffic just outside Class B shelves.',
          content: 'Operating at satellite airports under or near Class B shelves requires heightened situational awareness... We will look at common pattern conflicts, recommended altitudes, and coordination with ATC... ',
          publishedAt: '2025-01-05T08:45:00Z',
          readingTimeMinutes: 14,
          popularityScore: 79,
          rating: 4.6,
          topicTags: [
            'Class B airspace',
            'Traffic patterns',
            'Safety'
          ],
          url: 'article_detail.html?articleId=art_class_b_traffic_patterns'
        }
      ],
      courses: [
        {
          id: 'course_ifr_ground_budget',
          title: 'IFR Ground School: Budget Essentials',
          shortDescription: 'A concise, affordable IFR ground school covering all FAA knowledge test topics.',
          fullDescription: 'This online course is designed for cost-conscious pilots pursuing an instrument rating. It covers regulations, procedures, enroute charts, approach plates, and weather with a focus on test-ready knowledge and real-world application.',
          priceUsd: 99,
          rating: 4.6,
          ratingCount: 210,
          totalDurationHours: 9,
          modality: 'online',
          level: 'beginner',
          category: 'IFR ground school',
          url: 'course_detail.html?courseId=course_ifr_ground_budget',
          createdAt: '2024-01-10T12:00:00Z'
        },
        {
          id: 'course_ifr_ground_compact',
          title: 'Compact IFR Ground School',
          shortDescription: 'Streamlined IFR ground training with animated explanations and quizzes.',
          fullDescription: 'Ideal for busy pilots, this compact course breaks IFR topics into short video modules with scenario-based quizzes. Includes coverage of instrument systems, holding, approaches, and IFR decision-making.',
          priceUsd: 129,
          rating: 4.7,
          ratingCount: 156,
          totalDurationHours: 10,
          modality: 'online',
          level: 'beginner',
          category: 'IFR ground school',
          url: 'course_detail.html?courseId=course_ifr_ground_compact',
          createdAt: '2023-10-05T09:30:00Z'
        },
        {
          id: 'course_ifr_ground_premium',
          title: 'Premium IFR Ground School + Checkride Prep',
          shortDescription: 'Comprehensive IFR ground school with live webinars and checkride preparation.',
          fullDescription: 'This premium package combines a full IFR ground curriculum with weekly live webinars, instructor Q&A, and dedicated checkride prep modules including oral exam practice.',
          priceUsd: 189,
          rating: 4.9,
          ratingCount: 342,
          totalDurationHours: 18,
          modality: 'hybrid',
          level: 'intermediate',
          category: 'IFR ground school',
          url: 'course_detail.html?courseId=course_ifr_ground_premium',
          createdAt: '2023-04-18T15:45:00Z'
        }
      ],
      events: [
        {
          id: 'event_ifrwx_oct3_2026',
          title: 'IFR Weather Strategies: Autumn Systems',
          description: 'Learn how to interpret fall frontal systems, low ceilings, and fog when planning IFR flights.',
          eventType: 'webinar',
          topic: 'ifr_weather',
          startDateTime: '2026-10-03T17:00:00Z',
          endDateTime: '2026-10-03T19:00:00Z',
          timezone: 'America/Chicago',
          location: 'Online',
          registrationUrl: 'event_registration.html?eventId=event_ifrwx_oct3_2026',
          capacity: 500
        },
        {
          id: 'event_ifrwx_oct12_2026',
          title: 'IFR Weather Case Studies: East Coast Noreasters',
          description: 'Review real IFR flights impacted by coastal storms and learn practical go/no-go decision strategies.',
          eventType: 'webinar',
          topic: 'ifr_weather',
          startDateTime: '2026-10-12T01:00:00Z',
          endDateTime: '2026-10-12T03:00:00Z',
          timezone: 'America/New_York',
          location: 'Online',
          registrationUrl: 'event_registration.html?eventId=event_ifrwx_oct12_2026',
          capacity: 400
        },
        {
          id: 'event_ifrwx_oct25_2026',
          title: 'IFR Weather Deep Dive: Turbulence and Winds Aloft',
          description: 'A technical look at turbulence forecasts, jet streams, and winds aloft for IFR route planning.',
          eventType: 'webinar',
          topic: 'ifr_weather',
          startDateTime: '2026-10-25T20:00:00Z',
          endDateTime: '2026-10-25T22:00:00Z',
          timezone: 'America/Denver',
          location: 'Online',
          registrationUrl: 'event_registration.html?eventId=event_ifrwx_oct25_2026',
          capacity: 350
        }
      ],
      forum_categories: [
        {
          id: 'landings',
          name: 'Landings',
          description: 'Discussions and questions about landing techniques, approach planning, and runway operations.',
          slug: 'landings'
        },
        {
          id: 'takeoffs',
          name: 'Takeoffs',
          description: 'Techniques, performance considerations, and questions about departures and climbout.',
          slug: 'takeoffs'
        },
        {
          id: 'ifr_procedures',
          name: 'IFR Procedures',
          description: 'Instrument procedures, approaches, holds, and IFR regulations.',
          slug: 'ifr_procedures'
        }
      ],
      medical_examiners: [
        {
          id: 'ame_atlanta_northside',
          name: 'Dr. Michael Thompson',
          clinicName: 'Northside Aviation Medical',
          addressLine1: '3450 Peachtree Rd NE Suite 1200',
          addressLine2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30326',
          latitude: 33.8493,
          longitude: -84.3624,
          distanceFromSearchZipMiles: 9.0,
          offersClass1Medicals: true,
          offersClass2Medicals: true,
          offersClass3Medicals: true,
          weekdayAvailabilityBefore6pm: true,
          nextAvailableAppointment: '2026-03-04T15:00:00-05:00',
          phone: '+1-404-555-0142',
          email: 'm.thompson@northsideaviationmed.com'
        },
        {
          id: 'ame_atlanta_midtown',
          name: 'Dr. Karen Mitchell',
          clinicName: 'Midtown Flight Medical Clinic',
          addressLine1: '800 Peachtree St NE Suite 400',
          addressLine2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30308',
          latitude: 33.7765,
          longitude: -84.3848,
          distanceFromSearchZipMiles: 2.5,
          offersClass1Medicals: true,
          offersClass2Medicals: true,
          offersClass3Medicals: true,
          weekdayAvailabilityBefore6pm: true,
          nextAvailableAppointment: '2026-03-05T14:30:00-05:00',
          phone: '+1-404-555-0198',
          email: 'k.mitchell@midtownflightmed.com'
        },
        {
          id: 'ame_atlanta_late_hours',
          name: 'Dr. Samuel Ortiz',
          clinicName: 'Downtown Aviation Medicine',
          addressLine1: '120 Edgewood Ave NE Suite 210',
          addressLine2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30303',
          latitude: 33.7537,
          longitude: -84.3897,
          distanceFromSearchZipMiles: 0.8,
          offersClass1Medicals: true,
          offersClass2Medicals: true,
          offersClass3Medicals: true,
          weekdayAvailabilityBefore6pm: false,
          nextAvailableAppointment: '2026-03-02T18:30:00-05:00',
          phone: '+1-404-555-0273',
          email: 's.ortiz@downtownaviationmed.com'
        }
      ],
      flight_schools: [
        {
          id: 'denver_air_training_kapa',
          airportId: 'KAPA',
          name: 'Denver Air Training Center',
          description: 'Full-service Part 61 and Part 141 flight school specializing in instrument and commercial training at Centennial Airport.',
          city: 'Englewood',
          state: 'CO',
          rating: 4.7,
          ratingCount: 189,
          websiteUrl: 'https://www.denverairtraining.com',
          phone: '+1-303-555-0101',
          email: 'info@denverairtraining.com'
        },
        {
          id: 'rocky_mountain_flight_school_kbjc',
          airportId: 'KBJC',
          name: 'Rocky Mountain Flight School',
          description: 'Busy Denver-area school with a diverse fleet including G1000-equipped trainers and advanced IFR aircraft.',
          city: 'Broomfield',
          state: 'CO',
          rating: 4.5,
          ratingCount: 152,
          websiteUrl: 'https://www.rockymountainflightschool.com',
          phone: '+1-720-555-0144',
          email: 'admissions@rockymountainflightschool.com'
        },
        {
          id: 'front_range_flight_academy_kftg',
          airportId: 'KFTG',
          name: 'Front Range Flight Academy',
          description: 'Training programs from zero time through CFI with an emphasis on mountain and high-density-altitude operations.',
          city: 'Watkins',
          state: 'CO',
          rating: 4.3,
          ratingCount: 88,
          websiteUrl: 'https://www.frontrangeflightacademy.com',
          phone: '+1-303-555-0177',
          email: 'info@frontrangeflightacademy.com'
        }
      ],
      weather_reports: [
        {
          id: 'metar_kjfk_20260303_1451',
          airportId: 'KJFK',
          reportType: 'metar',
          rawText: 'KJFK 031451Z 21012KT 10SM FEW040 SCT120 BKN250 08/02 A3015 RMK AO2 SLP210 T00830022 53018',
          decodedText: 'John F. Kennedy International Airport, observation at 1451 UTC: Wind 210 degrees at 12 knots, visibility 10 statute miles, few clouds at 4,000 ft, scattered clouds at 12,000 ft, broken clouds at 25,000 ft, temperature 8C, dew point 2C, altimeter 30.15 inches Hg.',
          observationTime: '2026-03-03T14:51:00Z',
          windSpeedKnots: 12,
          visibilityStatuteMiles: 10,
          temperatureC: 8,
          altimeterInHg: 30.15,
          createdAt: '2026-03-03T14:52:00Z'
        },
        {
          id: 'taf_kjfk_20260303_1130',
          airportId: 'KJFK',
          reportType: 'taf',
          rawText: 'KJFK 031130Z 0312/0418 22010KT P6SM BKN040 FM031800 23012KT P6SM SCT050 BKN100 FM040300 20008KT 5SM -RA BR BKN020 OVC040',
          decodedText: 'TAF for KJFK issued at 1130 UTC on the 3rd, valid from 1200 UTC on the 3rd to 1800 UTC on the 4th: Winds 220 at 10 knots, visibility greater than 6 SM, broken clouds at 4,000 ft. From 1800 UTC, winds 230 at 12 knots, scattered 5,000 ft, broken 10,000 ft. From 0300 UTC on the 4th, winds 200 at 8 knots, visibility 5 SM in light rain and mist, broken 2,000 ft, overcast 4,000 ft.',
          validFrom: '2026-03-03T12:00:00Z',
          validTo: '2026-03-04T18:00:00Z',
          windSpeedKnots: 10,
          visibilityStatuteMiles: 6,
          temperatureC: 7,
          altimeterInHg: 30.12,
          createdAt: '2026-03-03T11:31:00Z'
        },
        {
          id: 'metar_ksfo_20260303_1456',
          airportId: 'KSFO',
          reportType: 'metar',
          rawText: 'KSFO 031456Z 30008KT 8SM FEW015 SCT250 12/09 A3008 RMK AO2 SLP184 T01170089 53005',
          decodedText: 'San Francisco International Airport, observation at 1456 UTC: Wind 300 degrees at 8 knots, visibility 8 statute miles, few clouds at 1,500 ft, scattered clouds at 25,000 ft, temperature 12C, dew point 9C, altimeter 30.08 inches Hg.',
          observationTime: '2026-03-03T14:56:00Z',
          windSpeedKnots: 8,
          visibilityStatuteMiles: 8,
          temperatureC: 12,
          altimeterInHg: 30.08,
          createdAt: '2026-03-03T14:57:00Z'
        }
      ],
      aircraft: [
        {
          id: 'ac_kapa_c172_ifr_1',
          flightSchoolId: 'denver_air_training_kapa',
          make: 'Cessna',
          model: '172SP',
          name: 'Cessna 172SP G1000',
          tailNumber: 'N739DA',
          isIfrCapable: true,
          hourlyWetRateUsd: 165,
          equipmentNotes: 'Garmin G1000, WAAS, ADS-B In/Out, dual NAV/COM, IFR certified'
        },
        {
          id: 'ac_kapa_piper_archer_ifr_1',
          flightSchoolId: 'denver_air_training_kapa',
          make: 'Piper',
          model: 'Archer III',
          name: 'Piper Archer III',
          tailNumber: 'N824PA',
          isIfrCapable: true,
          hourlyWetRateUsd: 175,
          equipmentNotes: 'Garmin GNS 430W, Aspen PFD, IFR certified, integrated autopilot'
        },
        {
          id: 'ac_kapa_c172_vfr_1',
          flightSchoolId: 'denver_air_training_kapa',
          make: 'Cessna',
          model: '172N',
          name: 'Cessna 172N Trainer',
          tailNumber: 'N531DT',
          isIfrCapable: false,
          hourlyWetRateUsd: 155,
          equipmentNotes: 'Traditional six-pack, GPS portable only, VFR day/night'
        }
      ]
    };

    // Populate localStorage using storage keys
    localStorage.setItem('airports', JSON.stringify(generatedData.airports));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('courses', JSON.stringify(generatedData.courses));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('forum_categories', JSON.stringify(generatedData.forum_categories));
    localStorage.setItem('medical_examiners', JSON.stringify(generatedData.medical_examiners));
    localStorage.setItem('flight_schools', JSON.stringify(generatedData.flight_schools));
    localStorage.setItem('weather_reports', JSON.stringify(generatedData.weather_reports));
    localStorage.setItem('aircraft', JSON.stringify(generatedData.aircraft));

    // Ensure other collections are at least initialized to empty arrays
    const emptyKeys = [
      'briefings',
      'briefing_settings',
      'briefing_items',
      'route_lists',
      'routes',
      'training_plans',
      'training_plan_items',
      'registrations',
      'reading_lists',
      'reading_list_items',
      'preferred_trainers',
      'contact_groups',
      'contacts',
      'forum_tags',
      'forum_threads',
      'thread_tags',
      'thread_notification_settings',
      'directory_searches'
    ];
    emptyKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddKJFKWeatherToBriefing();
    this.testTask2_SaveKSFOCrossCountryRoute();
    this.testTask3_AddCheapestIFRCourseToTrainingPlan();
    this.testTask4_RegisterEarliestIFRWeatherWebinar();
    this.testTask5_SaveThreeClassBArticlesToCheckridePrep();
    this.testTask6_ChoosePreferredTrainerByHourlyRate();
    this.testTask7_SaveNearestQualifyingAMEToMedicalContacts();
    this.testTask8_PostShortFieldLandingQuestion();

    return this.results;
  }

  // Task 1: Add KJFK METAR and TAF to Today’s Briefing, set units, order METAR above TAF
  testTask1_AddKJFKWeatherToBriefing() {
    const testName = 'Task 1: KJFK METAR & TAF in Today\'s Briefing with units and ordering';
    try {
      // Get airport weather context for KJFK
      const weatherContext = this.logic.getAirportWeather('KJFK');
      this.assert(weatherContext && weatherContext.airport, 'Airport weather context should include airport');

      const metar = weatherContext.metarReport;
      const taf = weatherContext.tafReport;
      this.assert(metar, 'METAR report should be available for KJFK');
      this.assert(taf, 'TAF report should be available for KJFK');

      // Add METAR to Today\'s Briefing
      const addMetarResult = this.logic.addWeatherReportToTodayBriefing(metar.id);
      this.assert(addMetarResult && addMetarResult.success === true, 'Adding METAR to briefing should succeed');
      this.assert(addMetarResult.briefingItem, 'METAR addition should return a briefing item');
      this.assert(addMetarResult.briefingItem.weatherReportId === metar.id, 'METAR briefing item should reference METAR report ID');

      // Add TAF to Today\'s Briefing
      const addTafResult = this.logic.addWeatherReportToTodayBriefing(taf.id);
      this.assert(addTafResult && addTafResult.success === true, 'Adding TAF to briefing should succeed');
      this.assert(addTafResult.briefingItem, 'TAF addition should return a briefing item');
      this.assert(addTafResult.briefingItem.weatherReportId === taf.id, 'TAF briefing item should reference TAF report ID');

      // Load dashboard and identify both items
      const dashboardBefore = this.logic.getTodayBriefingDashboard();
      this.assert(dashboardBefore && dashboardBefore.briefing, 'Today\'s Briefing should exist after adding items');
      this.assert(Array.isArray(dashboardBefore.items), 'Briefing items should be an array');

      const metarWrapper = dashboardBefore.items.find(entry => entry.weatherReport && entry.weatherReport.id === metar.id);
      const tafWrapper = dashboardBefore.items.find(entry => entry.weatherReport && entry.weatherReport.id === taf.id);
      this.assert(metarWrapper, 'Dashboard should contain KJFK METAR item');
      this.assert(tafWrapper, 'Dashboard should contain KJFK TAF item');

      // Reorder so METAR appears above TAF
      const metarItemId = metarWrapper.briefingItem.id;
      const tafItemId = tafWrapper.briefingItem.id;

      const orderedIds = [];
      orderedIds.push(metarItemId);
      orderedIds.push(tafItemId);

      dashboardBefore.items.forEach(entry => {
        const id = entry.briefingItem.id;
        if (id !== metarItemId && id !== tafItemId) {
          orderedIds.push(id);
        }
      });

      const itemsOrder = orderedIds.map((id, index) => ({
        briefingItemId: id,
        orderIndex: index
      }));

      const reorderResult = this.logic.reorderBriefingItems(itemsOrder);
      this.assert(reorderResult && reorderResult.success === true, 'Reordering briefing items should succeed');

      const dashboardAfterOrder = this.logic.getTodayBriefingDashboard();
      const metarAfter = dashboardAfterOrder.items.find(entry => entry.weatherReport && entry.weatherReport.id === metar.id);
      const tafAfter = dashboardAfterOrder.items.find(entry => entry.weatherReport && entry.weatherReport.id === taf.id);
      this.assert(metarAfter && tafAfter, 'Both METAR and TAF should still be present after reordering');
      this.assert(
        metarAfter.briefingItem.orderIndex < tafAfter.briefingItem.orderIndex,
        'METAR should have lower orderIndex (appear above) than TAF'
      );

      // Update units to knots & statute miles
      const desiredUnits = 'knots_statute_miles';
      const settingsResult = this.logic.updateTodayBriefingSettings(desiredUnits);
      this.assert(settingsResult && settingsResult.success === true, 'Updating briefing settings should succeed');
      this.assert(settingsResult.settings, 'Settings response should include settings object');
      this.assert(settingsResult.settings.unitsPreset === desiredUnits, 'Briefing unitsPreset should match desired units');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Plan and save a VFR cross-country from KSFO within 120 NM to the highest-rated suitable airport
  testTask2_SaveKSFOCrossCountryRoute() {
    const testName = 'Task 2: Save KSFO cross-country VFR route to Practice Flights';
    try {
      // Find KSFO as departure via search API
      const airportResults = this.logic.searchAirports('KSFO', 10);
      this.assert(Array.isArray(airportResults) && airportResults.length > 0, 'Airport search for KSFO should return results');
      let departureAirport = airportResults.find(a => a.icaoCode === 'KSFO');
      if (!departureAirport) {
        departureAirport = airportResults[0];
      }
      this.assert(departureAirport && departureAirport.id, 'Departure airport should have an ID');

      const departureAirportId = departureAirport.id;

      // Find destination airports within 120 NM, runway >= 4500 ft, sorted by user rating desc
      const destinationCandidates = this.logic.findDestinationAirportsForRoute(
        departureAirportId,
        120,
        4500,
        'user_rating_desc'
      );
      this.assert(Array.isArray(destinationCandidates) && destinationCandidates.length > 0, 'Destination airport search should return at least one candidate');

      const chosenDestination = destinationCandidates[0];
      this.assert(chosenDestination.airport && chosenDestination.airport.id, 'Chosen destination should include airport with ID');
      const destinationAirportId = chosenDestination.airport.id;

      // Save the route to Practice Flights
      const routeName = 'KSFO cross-country #1';
      const routeListName = 'Practice Flights';
      const saveResult = this.logic.saveRoute(
        routeName,
        departureAirportId,
        destinationAirportId,
        'vfr',
        routeListName
      );

      this.assert(saveResult && saveResult.success === true, 'Saving route should succeed');
      this.assert(saveResult.route, 'Save route result should include Route');
      this.assert(saveResult.routeList, 'Save route result should include RouteList');

      const savedRoute = saveResult.route;
      const routeList = saveResult.routeList;

      this.assert(savedRoute.name === routeName, 'Saved route name should match requested name');
      this.assert(savedRoute.departureAirportId === departureAirportId, 'Saved route departureAirportId should match selected departure');
      this.assert(savedRoute.destinationAirportId === destinationAirportId, 'Saved route destinationAirportId should match selected destination');
      this.assert(routeList.name === routeListName, 'Route list name should match requested list name');
      this.assert(savedRoute.routeListId === routeList.id, 'Route should reference the created/used route list');

      // Verify via route lists API that Practice Flights exists
      const routeLists = this.logic.getRouteLists();
      this.assert(Array.isArray(routeLists), 'getRouteLists should return an array');
      const practiceList = routeLists.find(list => list.id === routeList.id);
      this.assert(practiceList, 'Returned route lists should include the Practice Flights list used for this route');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add most affordable qualifying IFR ground school course to training plan
  testTask3_AddCheapestIFRCourseToTrainingPlan() {
    const testName = 'Task 3: Add cheapest qualifying IFR ground school to training plan';
    try {
      // Search courses with filters: IFR ground school, price <= 150, rating >= 4.5, duration >= 8 hours
      const filters = {
        maxPriceUsd: 150,
        minRating: 4.5,
        minDurationHours: 8
      };
      const courseResults = this.logic.searchCourses('IFR ground school', filters, 'price_asc');
      this.assert(Array.isArray(courseResults) && courseResults.length > 0, 'Course search should return at least one IFR ground school');

      const cheapestCourse = courseResults[0];
      this.assert(cheapestCourse && cheapestCourse.id, 'Cheapest course should have an ID');

      // Optional: verify detail API returns same course id
      const courseDetail = this.logic.getCourseDetail(cheapestCourse.id);
      this.assert(courseDetail && courseDetail.id === cheapestCourse.id, 'Course detail should match selected course ID');

      // Add to training plan with IFR Rating goal and specific target date
      const goal = 'IFR Rating';
      const targetCompletionDate = new Date('2026-12-31T00:00:00Z').toISOString();
      const trainingPlanName = 'My Training Plan';

      const addResult = this.logic.addCourseToTrainingPlan(
        cheapestCourse.id,
        goal,
        targetCompletionDate,
        trainingPlanName
      );

      this.assert(addResult && addResult.success === true, 'Adding course to training plan should succeed');
      this.assert(addResult.trainingPlan, 'Result should include a TrainingPlan');
      this.assert(addResult.trainingPlanItem, 'Result should include a TrainingPlanItem');

      const plan = addResult.trainingPlan;
      const planItem = addResult.trainingPlanItem;

      this.assert(planItem.courseId === cheapestCourse.id, 'TrainingPlanItem courseId should match selected course');
      this.assert(planItem.goal === goal, 'TrainingPlanItem goal should match requested goal');
      this.assert(planItem.targetCompletionDate === targetCompletionDate, 'TrainingPlanItem targetCompletionDate should match requested date');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register for earliest IFR Weather webinar in October 2026 with 1-day site reminder
  testTask4_RegisterEarliestIFRWeatherWebinar() {
    const testName = 'Task 4: Register for earliest October 2026 IFR Weather webinar with 1-day site notification';
    try {
      const startDate = new Date('2026-10-01T00:00:00Z').toISOString();
      const endDate = new Date('2026-10-31T23:59:59Z').toISOString();

      const events = this.logic.searchEvents(
        'ifr_weather',
        'webinar',
        startDate,
        endDate,
        'date_asc'
      );

      this.assert(Array.isArray(events) && events.length > 0, 'IFR Weather webinar search should return at least one event');

      const earliestEvent = events[0];
      this.assert(earliestEvent && earliestEvent.id, 'Earliest event should have an ID');

      const eventDetail = this.logic.getEventDetail(earliestEvent.id);
      this.assert(eventDetail && eventDetail.id === earliestEvent.id, 'Event detail should match selected event');

      const registrantName = 'Test Pilot';
      const registrantEmail = 'pilot@example.com';
      const notificationChannel = 'site_notifications_only';
      const reminderOffsetDays = 1;
      const notes = 'Automated test registration for earliest IFR Weather webinar in October 2026.';

      const registrationResult = this.logic.registerForEvent(
        earliestEvent.id,
        registrantName,
        registrantEmail,
        notificationChannel,
        reminderOffsetDays,
        notes
      );

      this.assert(registrationResult && registrationResult.success === true, 'Event registration should succeed');
      this.assert(registrationResult.registration, 'Registration result should include a Registration entity');

      const reg = registrationResult.registration;
      this.assert(reg.eventId === earliestEvent.id, 'Registration should reference the selected event ID');
      this.assert(reg.registrantEmail === registrantEmail, 'Registration email should match input');
      this.assert(reg.notificationChannel === notificationChannel, 'Notification channel should be site_notifications_only');
      this.assert(reg.reminderOffsetDays === reminderOffsetDays, 'Reminder offset days should be 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save three recent Class B airspace articles with short reading time to Checkride Prep
  testTask5_SaveThreeClassBArticlesToCheckridePrep() {
    const testName = 'Task 5: Save three Class B airspace articles to Checkride Prep reading list';
    try {
      const publishedAfter = new Date('2022-01-01T00:00:00Z').toISOString();
      const filters = {
        publishedAfter: publishedAfter,
        maxReadingTimeMinutes: 15
      };

      const articles = this.logic.searchArticles(
        'Class B airspace',
        filters,
        'most_popular'
      );

      this.assert(Array.isArray(articles) && articles.length > 0, 'Article search should return at least one Class B article');

      const readingListName = 'Checkride Prep';
      const articleCountToSave = Math.min(3, articles.length);
      this.assert(articleCountToSave > 0, 'There should be at least one article to save');

      let createdReadingListId = null;

      for (let i = 0; i < articleCountToSave; i++) {
        const article = articles[i];
        this.assert(article && article.id, 'Article should have an ID');

        // Optional: verify detail API
        const articleDetail = this.logic.getArticleDetail(article.id);
        this.assert(articleDetail && articleDetail.id === article.id, 'Article detail should match selected article');

        const saveResult = this.logic.saveArticleToReadingList(article.id, readingListName);
        this.assert(saveResult && saveResult.success === true, 'Saving article to reading list should succeed');
        this.assert(saveResult.readingList, 'Save result should include ReadingList');
        this.assert(saveResult.readingListItem, 'Save result should include ReadingListItem');

        const list = saveResult.readingList;
        const listItem = saveResult.readingListItem;

        this.assert(list.name === readingListName, 'Reading list name should match requested name');
        this.assert(listItem.articleId === article.id, 'ReadingListItem should reference the correct article ID');

        if (createdReadingListId === null) {
          createdReadingListId = list.id;
        } else {
          this.assert(list.id === createdReadingListId, 'Subsequent articles should be saved to the same Checkride Prep list');
        }
      }

      // Verify reading lists via getReadingLists
      const readingLists = this.logic.getReadingLists();
      this.assert(Array.isArray(readingLists), 'getReadingLists should return an array');
      const checkrideList = readingLists.find(l => l.id === createdReadingListId);
      this.assert(checkrideList && checkrideList.name === readingListName, 'Checkride Prep reading list should exist with the expected ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Choose preferred trainer between Cessna 172 and Piper Archer based on hourly rate
  testTask6_ChoosePreferredTrainerByHourlyRate() {
    const testName = 'Task 6: Choose preferred trainer (C172 vs Piper Archer) by hourly wet rate';
    try {
      // Search Denver-area flight schools with min rating 4.0
      const schoolsResult = this.logic.searchFlightSchools(
        'Denver, CO',
        undefined,
        4.0,
        'rating_desc'
      );

      this.assert(Array.isArray(schoolsResult) && schoolsResult.length > 0, 'Flight school search near Denver should return results');

      const firstSchoolEntry = schoolsResult[0];
      this.assert(firstSchoolEntry.flightSchool && firstSchoolEntry.flightSchool.id, 'First flight school result should include a FlightSchool with ID');
      const flightSchoolId = firstSchoolEntry.flightSchool.id;

      // Optional: verify school detail
      const schoolDetail = this.logic.getFlightSchoolDetail(flightSchoolId);
      this.assert(schoolDetail && schoolDetail.id === flightSchoolId, 'Flight school detail should match selected school');

      // Get IFR-capable fleet at or below 180 USD/hour
      const fleet = this.logic.getFlightSchoolFleet(
        flightSchoolId,
        true,
        180
      );

      this.assert(Array.isArray(fleet) && fleet.length > 0, 'IFR-capable fleet under 180/hour should have at least one aircraft');

      const c172 = fleet.find(ac => ac.name && ac.name.indexOf('Cessna 172') !== -1);
      const archer = fleet.find(ac => ac.name && ac.name.indexOf('Piper Archer') !== -1);

      this.assert(c172, 'Cessna 172 should be present in filtered fleet');
      this.assert(archer, 'Piper Archer should be present in filtered fleet');

      // Add both to comparison
      const afterAddC172 = this.logic.addAircraftToComparison(c172.id);
      this.assert(Array.isArray(afterAddC172), 'addAircraftToComparison should return an array after adding C172');

      const afterAddArcher = this.logic.addAircraftToComparison(archer.id);
      this.assert(Array.isArray(afterAddArcher), 'addAircraftToComparison should return an array after adding Archer');

      // Get comparison set
      const comparisonSet = this.logic.getAircraftComparison();
      this.assert(Array.isArray(comparisonSet), 'getAircraftComparison should return an array');

      const compC172 = comparisonSet.find(ac => ac.id === c172.id);
      const compArcher = comparisonSet.find(ac => ac.id === archer.id);
      this.assert(compC172 && compArcher, 'Comparison set should contain both C172 and Piper Archer');

      // Determine preferred based on hourly wet rate
      let preferredAircraft = null;
      if (compC172.hourlyWetRateUsd < compArcher.hourlyWetRateUsd) {
        preferredAircraft = compC172;
      } else if (compArcher.hourlyWetRateUsd < compC172.hourlyWetRateUsd) {
        preferredAircraft = compArcher;
      } else {
        // Rates equal: choose whichever appears first in comparison set
        const indexC172 = comparisonSet.findIndex(ac => ac.id === compC172.id);
        const indexArcher = comparisonSet.findIndex(ac => ac.id === compArcher.id);
        this.assert(indexC172 !== -1 && indexArcher !== -1, 'Both aircraft should have indexes in comparison set');
        preferredAircraft = indexC172 < indexArcher ? compC172 : compArcher;
      }

      this.assert(preferredAircraft && preferredAircraft.id, 'Preferred aircraft should be determined with an ID');

      const markResult = this.logic.markPreferredTrainer(preferredAircraft.id);
      this.assert(markResult && markResult.success === true, 'Marking preferred trainer should succeed');
      this.assert(markResult.preferredTrainer, 'Result should include PreferredTrainer entity');
      this.assert(markResult.preferredTrainer.aircraftId === preferredAircraft.id, 'PreferredTrainer should reference chosen aircraft ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Save nearest qualifying AME near ZIP 30303 with early weekday availability
  testTask7_SaveNearestQualifyingAMEToMedicalContacts() {
    const testName = 'Task 7: Save earliest qualifying AME near 30303 to Medical Contacts';
    try {
      const examiners = this.logic.searchMedicalExaminers(
        '30303',
        30,
        true,
        true,
        'next_available_asc'
      );

      this.assert(Array.isArray(examiners) && examiners.length > 0, 'Medical examiner search should return at least one result');

      const earliestExaminer = examiners[0];
      this.assert(earliestExaminer && earliestExaminer.id, 'Earliest examiner should have an ID');

      const examinerDetail = this.logic.getMedicalExaminerDetail(earliestExaminer.id);
      this.assert(examinerDetail && examinerDetail.id === earliestExaminer.id, 'Examiner detail should match selected examiner');
      this.assert(examinerDetail.offersClass1Medicals === true, 'Selected examiner should offer Class 1 medicals');
      this.assert(examinerDetail.weekdayAvailabilityBefore6pm === true, 'Selected examiner should have weekday availability before 6pm');

      const contactGroupName = 'Medical Contacts';
      const note = 'Earliest weekday before 6 pm';

      const saveResult = this.logic.saveExaminerToContacts(
        earliestExaminer.id,
        contactGroupName,
        note
      );

      this.assert(saveResult && saveResult.success === true, 'Saving examiner to contacts should succeed');
      this.assert(saveResult.contactGroup, 'Save result should include a ContactGroup');
      this.assert(saveResult.contact, 'Save result should include a Contact');

      const group = saveResult.contactGroup;
      const contact = saveResult.contact;

      this.assert(group.name === contactGroupName, 'Contact group name should match requested name');
      this.assert(contact.contactType === 'medical_examiner', 'Contact type should be medical_examiner');
      this.assert(contact.medicalExaminerId === earliestExaminer.id, 'Contact should reference the selected examiner ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Post short-field landing question in Landings forum with specific tags
  testTask8_PostShortFieldLandingQuestion() {
    const testName = 'Task 8: Post short-field landing question in Landings forum with tags and site notifications';
    try {
      // Get forum categories and find Landings
      const categories = this.logic.getForumCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getForumCategories should return at least one category');

      let landingsCategory = categories.find(cat => cat.slug === 'landings');
      if (!landingsCategory) {
        landingsCategory = categories.find(cat => cat.name === 'Landings');
      }
      this.assert(landingsCategory && landingsCategory.id, 'Landings category should be available with an ID');

      const categoryId = landingsCategory.id;
      const title = 'Short-field landing tips for Cessna 172';
      const body = 'I am practicing short-field landings in a Cessna 172 on a 2000 ft runway with trees near the approach end. I would appreciate tips on configuration, aiming point, and speed control to improve safety and consistency.';
      const tags = ['short-field', 'landing', 'C172'];
      const notificationChannel = 'site_notifications_only';

      const createResult = this.logic.createForumThread(
        categoryId,
        title,
        body,
        tags,
        notificationChannel
      );

      this.assert(createResult && createResult.thread, 'createForumThread should return a ForumThread');
      this.assert(Array.isArray(createResult.tags), 'createForumThread should return an array of tags');
      this.assert(createResult.notificationSetting, 'createForumThread should return a notification setting');

      const thread = createResult.thread;
      const returnedTags = createResult.tags;
      const notifSetting = createResult.notificationSetting;

      this.assert(thread.categoryId === categoryId, 'Thread should belong to the Landings category');
      this.assert(thread.title === title, 'Thread title should match requested title');
      this.assert(typeof thread.body === 'string' && thread.body.length >= body.length, 'Thread body should contain the submitted content');

      const returnedTagNames = returnedTags.map(t => t.name).sort();
      const expectedTagNames = tags.slice().sort();
      this.assert(returnedTagNames.length === expectedTagNames.length, 'Thread should have exactly three tags');
      for (let i = 0; i < expectedTagNames.length; i++) {
        this.assert(returnedTagNames[i] === expectedTagNames[i], 'Returned tag names should match requested tags');
      }

      this.assert(notifSetting.notificationChannel === notificationChannel, 'Notification channel for thread should be site_notifications_only');

      // Verify via getThreadDetail
      const detail = this.logic.getThreadDetail(thread.id);
      this.assert(detail && detail.thread && detail.thread.id === thread.id, 'getThreadDetail should return the created thread');
      this.assert(Array.isArray(detail.tags), 'Thread detail should include tags array');
      const detailTagNames = detail.tags.map(t => t.name).sort();
      this.assert(detailTagNames.length === expectedTagNames.length, 'Thread detail should show the same number of tags');
      for (let i = 0; i < expectedTagNames.length; i++) {
        this.assert(detailTagNames[i] === expectedTagNames[i], 'Thread detail tag names should match requested tags');
      }
      this.assert(detail.notificationSetting && detail.notificationSetting.notificationChannel === notificationChannel, 'Thread detail notification setting should match requested channel');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording
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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
