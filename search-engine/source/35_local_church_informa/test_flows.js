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
    // Generated Data from prompt - used ONLY here to seed localStorage
    const generatedData = {
      pastors: [
        {
          id: 'pastor_michelle_okafor',
          firstName: 'Michelle',
          lastName: 'Okafor',
          fullName: 'Michelle Okafor',
          bio: 'Pastor Michelle serves as the Pastor of Care & Counseling, overseeing pastoral care, support groups, and one-on-one counseling. With a background in marriage and family therapy, she specializes in marriage counseling, communication, and relational healing. She also leads workshops for couples and mentors young families in the church.',
          photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80',
          email: 'michelle.okafor@gracecommunitychurch.org',
          phone: '(555) 201-4823',
          specialties: [
            'marriage_counseling',
            'marriage_and_family',
            'communication_issues',
            'conflict_resolution',
            'premarital_counseling'
          ],
          isCounselor: true,
          isActive: true
        },
        {
          id: 'pastor_david_chen',
          firstName: 'David',
          lastName: 'Chen',
          fullName: 'David Chen',
          bio: 'Pastor David is the Lead Teaching Pastor, responsible for Sunday preaching, vision, and leadership development. In addition to preaching, he offers limited counseling focused on spiritual direction and individual counseling for adults navigating transitions, doubt, and calling.',
          photoUrl: 'https://static.wixstatic.com/media/ae2e1c_0f2144e448b04e5bb83449cb2013bd40~mv2.jpg',
          email: 'david.chen@gracecommunitychurch.org',
          phone: '(555) 347-9081',
          specialties: [
            'individual_counseling',
            'spiritual_direction',
            'anxiety_and_stress',
            'life_transitions'
          ],
          isCounselor: true,
          isActive: true
        },
        {
          id: 'pastor_elena_rodriguez',
          firstName: 'Elena',
          lastName: 'Rodriguez',
          fullName: 'Elena Rodriguez',
          bio: 'Pastor Elena oversees Youth and Young Adult Ministries, equipping the next generation to follow Christ. She frequently counsels students and young adults around identity, anxiety, and family relationships, and partners with parents to support teens in crisis.',
          photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80',
          email: 'elena.rodriguez@gracecommunitychurch.org',
          phone: '(555) 773-1194',
          specialties: [
            'youth_counseling',
            'young_adult_issues',
            'anxiety_and_stress',
            'family_conflict',
            'identity_issues'
          ],
          isCounselor: true,
          isActive: true
        }
      ],
      rooms: [
        {
          id: 'room_fellowship_hall_a',
          name: 'Fellowship Hall A',
          description: 'Large multi-purpose hall suitable for classes, receptions, and church-wide gatherings. Partitionable space with flexible seating.',
          capacityMin: 30,
          capacityMax: 150,
          location: 'Main Building, Lower Level',
          amenities: [
            'projector',
            'sound_system',
            'wifi',
            'podium',
            'round_tables'
          ],
          isActive: true
        },
        {
          id: 'room_conference_101',
          name: 'Conference Room 101',
          description: 'Mid-sized conference room ideal for ministry team meetings, small trainings, and midweek Bible studies.',
          capacityMin: 8,
          capacityMax: 14,
          location: 'Education Wing, First Floor',
          amenities: [
            'tv_display',
            'whiteboard',
            'conference_phone',
            'wifi'
          ],
          isActive: true
        },
        {
          id: 'room_classroom_204',
          name: 'Classroom 204',
          description: 'Standard classroom with movable desks, commonly used for adult classes and workshops.',
          capacityMin: 10,
          capacityMax: 24,
          location: 'Education Wing, Second Floor',
          amenities: [
            'whiteboard',
            'wifi',
            'stackable_chairs'
          ],
          isActive: true
        }
      ],
      sermons: [
        {
          id: 'sermon_forgiven_and_free',
          title: 'Forgiven and Free',
          description: 'Explores how Gods forgiveness in Christ frees us from guilt, shame, and the need to prove ourselves, and how that freedom reshapes the way we forgive others.',
          date: '2026-02-28T10:30:00Z',
          speakerName: 'David Chen',
          pastorId: 'pastor_david_chen',
          topics: [
            'forgiveness',
            'grace',
            'freedom',
            'gospel',
            'identity_in_christ'
          ],
          series: 'The Way of Grace',
          scriptureReference: 'Ephesians 1:310',
          videoUrl: 'https://example.com/sermons/forgiven-and-free/video',
          audioUrl: 'https://example.com/sermons/forgiven-and-free/audio',
          durationMinutes: 38,
          isActive: true
        },
        {
          id: 'sermon_practicing_everyday_forgiveness',
          title: 'Practicing Everyday Forgiveness',
          description: 'Pastor Michelle unpacks what it looks like to practice forgiveness in daily lifeat home, at work, and in the churchespecially when the hurts are small but frequent.',
          date: '2026-02-14T16:00:00Z',
          speakerName: 'Michelle Okafor',
          pastorId: 'pastor_michelle_okafor',
          topics: [
            'forgiveness',
            'relationships',
            'marriage',
            'conflict',
            'reconciliation'
          ],
          series: 'Healthy Relationships',
          scriptureReference: 'Colossians 3:1215',
          videoUrl: 'https://example.com/sermons/practicing-everyday-forgiveness/video',
          audioUrl: 'https://example.com/sermons/practicing-everyday-forgiveness/audio',
          durationMinutes: 41,
          isActive: true
        },
        {
          id: 'sermon_when_forgiveness_feels_impossible',
          title: 'When Forgiveness Feels Impossible',
          description: 'Addresses the barriers that make forgiveness feel out of reach and how God meets us in our pain, especially in cases of deep betrayal and long-term hurt.',
          date: '2026-01-18T10:30:00Z',
          speakerName: 'Michelle Okafor',
          pastorId: 'pastor_michelle_okafor',
          topics: [
            'forgiveness',
            'trauma',
            'healing',
            'lament',
            'trust_god'
          ],
          series: 'Healing Hearts',
          scriptureReference: 'Matthew 18:2135',
          videoUrl: 'https://example.com/sermons/when-forgiveness-feels-impossible/video',
          audioUrl: 'https://example.com/sermons/when-forgiveness-feels-impossible/audio',
          durationMinutes: 44,
          isActive: true
        }
      ],
      event_registrations: [
        {
          id: 'reg_20260301_alex_taylor_financial_peace',
          eventId: 'event_financial_peace_class',
          registrantName: 'Alex Taylor',
          registrantEmail: 'alex.taylor@example.com',
          attendeeCount: 1,
          registrationDateTime: '2026-03-01T18:45:00Z',
          status: 'confirmed'
        },
        {
          id: 'reg_20260220_jordan_lee_grief_support',
          eventId: 'event_grief_support_group',
          registrantName: 'Jordan Lee',
          registrantEmail: 'jordan.lee@example.com',
          attendeeCount: 2,
          registrationDateTime: '2026-02-20T15:12:00Z',
          status: 'confirmed'
        },
        {
          id: 'reg_20260225_sam_patton_family_night',
          eventId: 'event_family_game_night',
          registrantName: 'Sam Patton',
          registrantEmail: 'sam.patton@example.com',
          attendeeCount: 4,
          registrationDateTime: '2026-02-25T02:05:00Z',
          status: 'pending'
        }
      ],
      childrens_programs: [
        {
          id: 'cp_sun_0900_nursery_0_2',
          serviceId: 'service_sun_0900_modern',
          name: 'Nursery Care (Ages 02)',
          description: 'Safe, nurturing care for infants and toddlers during the 9:00am modern worship service.',
          ageMin: 0,
          ageMax: 2,
          checkinStartTime: '08:45',
          programStartDateTime: '2026-03-08T09:00:00Z',
          programEndDateTime: '2026-03-08T10:15:00Z',
          location: 'Nursery Suite, Main Building',
          capacity: 12,
          isActive: true
        },
        {
          id: 'cp_sun_0900_preschool_3_4',
          serviceId: 'service_sun_0900_modern',
          name: 'Preschool Church (Ages 34)',
          description: 'Interactive Bible story, songs, and crafts tailored for preschoolers during the 9:00am service.',
          ageMin: 3,
          ageMax: 4,
          checkinStartTime: '08:45',
          programStartDateTime: '2026-03-08T09:00:00Z',
          programEndDateTime: '2026-03-08T10:15:00Z',
          location: 'Childrens Wing, Classroom 204',
          capacity: 18,
          isActive: true
        },
        {
          id: 'cp_sun_0900_kids_5_10',
          serviceId: 'service_sun_0900_modern',
          name: 'Kids Church (Ages 510)',
          description: 'Large-group worship and small-group discussion for elementary kids during the 9:00am modern service.',
          ageMin: 5,
          ageMax: 10,
          checkinStartTime: '08:45',
          programStartDateTime: '2026-03-08T09:00:00Z',
          programEndDateTime: '2026-03-08T10:15:00Z',
          location: 'Family Life Center, Youth Center',
          capacity: 45,
          isActive: true
        }
      ],
      worship_services: [
        {
          id: 'service_sun_0830_contemplative',
          name: '8:30am Contemplative Service',
          description: 'A quiet, reflective service featuring hymns, Scripture readings, and extended times of prayer.',
          startDateTime: '2026-03-08T08:30:00Z',
          endDateTime: '2026-03-08T09:30:00Z',
          dayOfWeek: 'sunday',
          serviceStyle: 'traditional',
          serviceLocation: 'Main Sanctuary',
          teachingPastorId: 'pastor_grace_nelson',
          isActive: true,
          image: 'https://media.istockphoto.com/photos/church-pews-picture-id182467229?k=6&m=182467229&s=612x612&w=0&h=4XSzltoGrGOV1fc18Pd-DtgBLLztWemyNdQ1oPHJ5OA=',
          hasChildrenProgram: true
        },
        {
          id: 'service_sun_0900_modern',
          name: '9:00am Contemporary Service',
          description: 'A modern worship service with full band, relevant biblical teaching, and concurrent childrens ministries.',
          startDateTime: '2026-03-08T09:00:00Z',
          endDateTime: '2026-03-08T10:15:00Z',
          dayOfWeek: 'sunday',
          serviceStyle: 'contemporary',
          serviceLocation: 'Main Sanctuary',
          teachingPastorId: 'pastor_david_chen',
          isActive: true,
          image: 'https://d113wk4ga3f0l0.cloudfront.net/c?o=eJw1jU0OgyAUhO_C2uADNUqX7QV6A0PhqRQphp-Ypundi2k7m8kk8828SPQ5KBwtPsmJiJrxYeiA9TUH1oGAngGwVtRwqB3Pl-vYN5zT-zaT6g_fsrKYCq-8o6uZlxSTV5YaJ2eMNG-rlzrSLXidVTL-UdDv4dRNUyNK3I1OCzkNAiqy4DHxCwndtsqEpbwXC04GixoYeX8A5aA61A==&s=2bad84252c191a65c3ecfa781a67d12e1f9b507e',
          hasChildrenProgram: true
        },
        {
          id: 'service_sun_1045_traditional',
          name: '10:45am Traditional Service',
          description: 'A classic service with choir, hymns, and liturgical elements, featuring expository preaching.',
          startDateTime: '2026-03-08T10:45:00Z',
          endDateTime: '2026-03-08T12:00:00Z',
          dayOfWeek: 'sunday',
          serviceStyle: 'traditional',
          serviceLocation: 'Main Sanctuary',
          teachingPastorId: 'pastor_david_chen',
          isActive: true,
          image: 'https://dxewmvd5ovjsu.cloudfront.net/media/funeral-hymns/funeral-hymn-sheet.jpg',
          hasChildrenProgram: true
        }
      ],
      counseling_availability_slots: [
        {
          id: 'slot_michelle_20260309_0930',
          pastorId: 'pastor_michelle_okafor',
          startDateTime: '2026-03-09T09:30:00Z',
          endDateTime: '2026-03-09T10:30:00Z',
          location: 'Counseling Office 1',
          isBooked: true
        },
        {
          id: 'slot_michelle_20260311_1100',
          pastorId: 'pastor_michelle_okafor',
          startDateTime: '2026-03-11T11:00:00Z',
          endDateTime: '2026-03-11T12:00:00Z',
          location: 'Counseling Office 1',
          isBooked: false
        },
        {
          id: 'slot_michelle_20260313_1500',
          pastorId: 'pastor_michelle_okafor',
          startDateTime: '2026-03-13T15:00:00Z',
          endDateTime: '2026-03-13T16:00:00Z',
          location: 'Counseling Office 1',
          isBooked: false
        }
      ],
      counseling_appointment_requests: [
        {
          id: 'car_20260301_jones_michelle_marriage',
          pastorId: 'pastor_michelle_okafor',
          availabilitySlotId: 'slot_michelle_20260309_0930',
          name: 'Eric Jones',
          email: 'eric.jones@example.com',
          reason: 'marriage_counseling',
          notes: 'Seeking help with communication and recurring conflicts in our marriage.',
          submittedAt: '2026-03-01T14:22:00Z',
          status: 'confirmed'
        },
        {
          id: 'car_20260227_smith_michelle_grief',
          pastorId: 'pastor_michelle_okafor',
          availabilitySlotId: 'slot_michelle_20260314_0900',
          name: 'Laura Smith',
          email: 'laura.smith@example.com',
          reason: 'grief',
          notes: 'Recently lost a close family member and would like support processing the loss.',
          submittedAt: '2026-02-27T19:05:00Z',
          status: 'pending'
        },
        {
          id: 'car_20260228_nguyen_david_spiritual',
          pastorId: 'pastor_david_chen',
          availabilitySlotId: 'slot_david_20260305_0900',
          name: 'Minh Nguyen',
          email: 'minh.nguyen@example.com',
          reason: 'spiritual_direction',
          notes: 'Discerning a major career transition and wanting spiritual guidance.',
          submittedAt: '2026-02-28T16:40:00Z',
          status: 'confirmed'
        }
      ],
      funds: [
        {
          id: 'general_fund',
          name: 'General Fund',
          description: 'Supports the overall ministry of the church, including staff, operations, and weekly worship services.',
          fundCode: 'GEN',
          ministryId: 'church_operations_ministry',
          isActive: true,
          isVisibleOnline: true
        },
        {
          id: 'youth_ministry_fund',
          name: 'Youth Ministry',
          description: 'Funds weekly youth gatherings, retreats, leadership development, and resources for middle and high school students.',
          fundCode: 'YTH',
          ministryId: 'youth_ministry',
          isActive: true,
          isVisibleOnline: true
        },
        {
          id: 'children_ministry_fund',
          name: 'Childrens Ministry',
          description: 'Provides curriculum, supplies, and special events for childrens programs and kids church.',
          fundCode: 'CHILD',
          ministryId: 'children_ministry',
          isActive: true,
          isVisibleOnline: true
        }
      ],
      ministries: [
        {
          id: 'church_operations_ministry',
          name: 'Church Operations',
          description: 'Oversees the day-to-day operations of the church including administration, staff support, and core weekend ministry infrastructure.',
          contactEmail: 'operations@gracecommunitychurch.org',
          contactName: 'Linda Perez',
          relatedFundId: 'general_fund',
          isActive: true
        },
        {
          id: 'youth_ministry',
          name: 'Youth Ministry',
          description: 'Serves middle and high school students through weekly gatherings, small groups, retreats, and leadership development.',
          contactEmail: 'youth@gracecommunitychurch.org',
          contactName: 'Elena Rodriguez',
          relatedFundId: 'youth_ministry_fund',
          isActive: true
        },
        {
          id: 'children_ministry',
          name: 'Childrens Ministry',
          description: 'Partners with families to disciple children from birth through 5th grade with age-appropriate teaching and care.',
          contactEmail: 'children@gracecommunitychurch.org',
          contactName: 'Michelle Okafor',
          relatedFundId: 'children_ministry_fund',
          isActive: true
        }
      ],
      events: [
        {
          id: 'event_financial_peace_class',
          title: 'Financial Peace Class',
          description: 'A 4-week class covering biblical principles for budgeting, saving, and getting out of debt. Includes teaching, discussion, and practical homework.',
          category: 'classes_workshops',
          startDateTime: '2026-03-10T18:30:00Z',
          endDateTime: '2026-03-10T20:30:00Z',
          location: 'Education Wing, Classroom 204',
          price: 0,
          isFree: true,
          capacity: 35,
          ministryId: 'groups_ministry',
          isActive: true,
          remainingCapacity: 34
        },
        {
          id: 'event_grief_support_group',
          title: 'Grief Support Group',
          description: 'A safe, confidential space to process loss with others, facilitated by trained lay leaders and a pastor.',
          category: 'classes_workshops',
          startDateTime: '2026-02-25T19:00:00Z',
          endDateTime: '2026-02-25T20:30:00Z',
          location: 'Prayer Chapel',
          price: 0,
          isFree: true,
          capacity: 20,
          ministryId: 'groups_ministry',
          isActive: true,
          remainingCapacity: 18
        },
        {
          id: 'event_family_game_night',
          title: 'Family Game Night',
          description: 'Bring your family and friends for a fun evening of board games, snacks, and connection with other families.',
          category: 'community',
          startDateTime: '2026-03-13T18:00:00Z',
          endDateTime: '2026-03-13T20:30:00Z',
          location: 'Fellowship Hall A',
          price: 0,
          isFree: true,
          capacity: 120,
          ministryId: 'local_outreach_ministry',
          isActive: true,
          remainingCapacity: 116
        }
      ],
      volunteer_roles: [
        {
          id: 'vol_atrium_greeter_saturday',
          title: 'Atrium Greeter (Saturday Service)',
          description: 'Welcome guests with a smile, help them find seating, and answer basic questions before and after the Saturday service.',
          ministryArea: 'guest_services',
          category: 'guest_services',
          daysNeeded: ['saturday'],
          timeWindowStart: '16:30',
          timeWindowEnd: '18:30',
          hoursPerWeek: 2,
          requiredSkills: 'Warm, friendly demeanor; ability to stand for 6090 minutes; comfortable initiating conversation.',
          location: 'Main Lobby / Atrium',
          contactName: 'Linda Perez',
          contactEmail: 'volunteers@gracecommunitychurch.org',
          ministryId: 'church_operations_ministry',
          isActive: true
        },
        {
          id: 'vol_parking_team_saturday',
          title: 'Parking Team (Saturday & Special Events)',
          description: 'Direct traffic, help guests find parking, and provide a safe and welcoming first impression in the parking lot.',
          ministryArea: 'guest_services',
          category: 'guest_services',
          daysNeeded: ['saturday'],
          timeWindowStart: '16:00',
          timeWindowEnd: '19:30',
          hoursPerWeek: 3.5,
          requiredSkills: 'Comfortable being outdoors in various weather; able to walk and stand; good awareness of surroundings.',
          location: 'Church Parking Lot',
          contactName: 'Mark Thompson',
          contactEmail: 'parking@gracecommunitychurch.org',
          ministryId: 'church_operations_ministry',
          isActive: true
        },
        {
          id: 'vol_cafe_team_sunday',
          title: 'Cafe Team (Sunday Mornings)',
          description: 'Prepare and serve coffee and light refreshments before and after Sunday services.',
          ministryArea: 'hospitality',
          category: 'guest_services',
          daysNeeded: ['sunday'],
          timeWindowStart: '08:00',
          timeWindowEnd: '12:30',
          hoursPerWeek: 2.5,
          requiredSkills: 'Enjoy serving others; basic food-handling hygiene; ability to lift coffee carafes and stand for periods of time.',
          location: 'Lobby Cafe',
          contactName: 'Linda Perez',
          contactEmail: 'cafe@gracecommunitychurch.org',
          ministryId: 'church_operations_ministry',
          isActive: true
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:31.398061'
      }
    };

    // Persist to localStorage using storage keys
    localStorage.setItem('pastors', JSON.stringify(generatedData.pastors));
    localStorage.setItem('rooms', JSON.stringify(generatedData.rooms));
    localStorage.setItem('sermons', JSON.stringify(generatedData.sermons));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations));
    localStorage.setItem('childrens_programs', JSON.stringify(generatedData.childrens_programs));
    localStorage.setItem('worship_services', JSON.stringify(generatedData.worship_services));
    localStorage.setItem('counseling_availability_slots', JSON.stringify(generatedData.counseling_availability_slots));
    localStorage.setItem('counseling_appointment_requests', JSON.stringify(generatedData.counseling_appointment_requests));
    localStorage.setItem('funds', JSON.stringify(generatedData.funds));
    localStorage.setItem('ministries', JSON.stringify(generatedData.ministries));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('volunteer_roles', JSON.stringify(generatedData.volunteer_roles));
    // Store metadata for date-based logic in tests
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Helper: assert
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

  // Helpers for dates/times
  getBaselineDate() {
    const metaRaw = localStorage.getItem('_metadata');
    if (!metaRaw) {
      return new Date();
    }
    const meta = JSON.parse(metaRaw);
    return new Date(meta.baselineDate);
  }

  toIsoDate(date) {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  getHourMinutesUtc(isoString) {
    const d = new Date(isoString);
    return { h: d.getUTCHours(), m: d.getUTCMinutes() };
  }

  getNextWeekBoundsFromBaseline() {
    const base = this.getBaselineDate();
    const day = base.getUTCDay(); // 0=Sun..6=Sat
    const offsetToMonday = (day + 6) % 7; // days since Monday
    const currentMonday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    currentMonday.setUTCDate(currentMonday.getUTCDate() - offsetToMonday);
    const nextMonday = new Date(currentMonday.getTime());
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
    const nextSunday = new Date(nextMonday.getTime());
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 6);
    return { start: nextMonday, end: nextSunday };
  }

  areEventsNonOverlapping(ev1, ev2) {
    const s1 = new Date(ev1.startDateTime).getTime();
    const e1 = new Date(ev1.endDateTime).getTime();
    const s2 = new Date(ev2.startDateTime).getTime();
    const e2 = new Date(ev2.endDateTime).getTime();
    return e1 <= s2 || e2 <= s1;
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1PlanSundayVisitWithChildrenProgram();
    this.testTask2RegisterForWeekdayClassAfter5pmThisMonth();
    this.testTask3RequestRoomReservationForSmallGroup();
    this.testTask4SaveForgivenessSermonsToWatchLater();
    this.testTask5SignUpForSaturdayVolunteerRoleUnder3Hours();
    this.testTask6SubmitYouthMinistryPledge();
    this.testTask7SaveTwoNonOverlappingEventsToMyEvents();
    this.testTask8RequestMorningMarriageCounselingNextWeek();

    return this.results;
  }

  // Task 1
  testTask1PlanSundayVisitWithChildrenProgram() {
    const testName = 'Task 1: Plan Sunday visit 9-11am with children program ages 5-10';
    try {
      // Get filter options (simulating opening Plan a Visit page)
      const filterOptions = this.logic.getServiceFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.dayOfWeekOptions), 'Service filter options should load');

      // Search for Sunday services 9:00-11:00 with children program ages 5-10
      const searchResult = this.logic.searchWorshipServices(
        'sunday',   // dayOfWeek
        '09:00',    // startTimeFrom
        '11:00',    // startTimeTo
        undefined,  // serviceStyle
        true,       // onlyWithChildrenProgram
        5,          // childrenAgeMin
        10,         // childrenAgeMax
        10          // limit
      );

      this.assert(searchResult && Array.isArray(searchResult.services), 'searchWorshipServices should return services');
      this.assert(searchResult.services.length > 0, 'Should find at least one matching Sunday service');

      const serviceCard = searchResult.services[0];
      const serviceId = serviceCard.serviceId;

      // Validate returned service matches criteria
      this.assert(serviceCard.dayOfWeek === 'sunday', 'Service should be on Sunday');
      const time = this.getHourMinutesUtc(serviceCard.startDateTime);
      this.assert(time.h >= 9 && time.h < 11, 'Service start time should be between 9:00 and 11:00');
      this.assert(serviceCard.hasChildrenProgram === true, 'Service should have children program');

      // Load full service details like service details page
      const details = this.logic.getServiceDetails(serviceId);
      this.assert(details && details.service && Array.isArray(details.childrensPrograms), 'getServiceDetails should return service and children programs');
      this.assert(details.service.id === serviceId, 'Service details ID should match selected service');

      // Find children program that covers ages 5-10
      const matchingProgram = details.childrensPrograms.find(cp => cp.isActive && cp.ageMin <= 5 && cp.ageMax >= 10);
      this.assert(matchingProgram, 'Should have a children program covering ages 5-10');

      // Add service to visit plan
      const addServiceResult = this.logic.addServiceToVisitPlan(serviceId);
      this.assert(addServiceResult && addServiceResult.success === true, 'addServiceToVisitPlan should succeed');
      this.assert(addServiceResult.visitPlanId, 'addServiceToVisitPlan should return visitPlanId');

      // Add children program to visit plan
      const addProgramResult = this.logic.addChildrensProgramToVisitPlan(matchingProgram.id);
      this.assert(addProgramResult && addProgramResult.success === true, 'addChildrensProgramToVisitPlan should succeed');

      // Verify current visit plan summary
      const planSummary = this.logic.getCurrentVisitPlanSummary();
      this.assert(planSummary && planSummary.hasPlan === true, 'Visit plan should exist after adding service');
      this.assert(planSummary.visitPlan && planSummary.visitPlan.service, 'Visit plan should include service');
      this.assert(planSummary.visitPlan.service.serviceId === serviceId, 'Visit plan serviceId should match selected');

      const childrenInPlan = planSummary.visitPlan.childrenPrograms || [];
      const childEntry = childrenInPlan.find(cp => cp.id === matchingProgram.id);
      this.assert(childEntry, 'Visit plan should contain the selected children program');

      // Verify relationship against raw VisitPlan and ChildrensProgram storage
      const visitPlans = JSON.parse(localStorage.getItem('visit_plans') || '[]');
      const storedPlan = visitPlans.find(vp => vp.id === planSummary.visitPlan.id);
      this.assert(storedPlan, 'Stored VisitPlan should exist');
      this.assert(storedPlan.serviceId === serviceId, 'Stored VisitPlan.serviceId should match selected service');
      this.assert(Array.isArray(storedPlan.childrenProgramIds), 'VisitPlan.childrenProgramIds should be an array');
      this.assert(storedPlan.childrenProgramIds.includes(matchingProgram.id), 'VisitPlan.childrenProgramIds should include children program');

      const childrensPrograms = JSON.parse(localStorage.getItem('childrens_programs') || '[]');
      const rawProgram = childrensPrograms.find(cp => cp.id === matchingProgram.id);
      this.assert(rawProgram && rawProgram.serviceId === serviceId, 'ChildrensProgram.serviceId should match VisitPlan.serviceId');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2RegisterForWeekdayClassAfter5pmThisMonth() {
    const testName = 'Task 2: Register for earliest free weekday class after 5pm this month';
    try {
      // Use baseline metadata to compute current month range
      const baseline = this.getBaselineDate();
      const year = baseline.getUTCFullYear();
      const month = baseline.getUTCMonth();
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0));
      const dateFrom = this.toIsoDate(monthStart);
      const dateTo = this.toIsoDate(monthEnd);

      // Load event filter options to simulate opening Events page
      const eventFilterOptions = this.logic.getEventFilterOptions();
      this.assert(eventFilterOptions && Array.isArray(eventFilterOptions.categoryOptions), 'Event filter options should load');

      // Build filters: classes & workshops, this month, Mon-Fri, start >= 17:00, free only
      const filters = {
        category: 'classes_workshops',
        dateFrom: dateFrom,
        dateTo: dateTo,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        timeFrom: '17:00',
        timeTo: undefined,
        priceFilter: 'free_only'
      };

      const searchResult = this.logic.searchEvents(
        undefined,   // query
        filters,
        'list',      // viewType
        'date_earliest', // sortBy
        1,           // page
        10           // pageSize
      );

      this.assert(searchResult && Array.isArray(searchResult.events), 'searchEvents should return events');
      this.assert(searchResult.events.length > 0, 'Should find at least one free weekday class this month after 5pm');

      const eventCard = searchResult.events[0];
      const eventId = eventCard.eventId;

      // Validate event matches filters
      this.assert(eventCard.category === 'classes_workshops', 'Event category should be classes_workshops');
      this.assert(eventCard.isFree === true && eventCard.price === 0, 'Event should be free');
      const start = new Date(eventCard.startDateTime);
      this.assert(start >= monthStart && start <= monthEnd, 'Event should fall within current month');
      const dow = start.getUTCDay(); // 1-5 weekdays
      this.assert(dow >= 1 && dow <= 5, 'Event should be on a weekday (Mon-Fri)');
      const tm = this.getHourMinutesUtc(eventCard.startDateTime);
      this.assert(tm.h > 17 || (tm.h === 17 && tm.m >= 0), 'Event should start at or after 5:00pm');

      // Get full event details
      const eventDetails = this.logic.getEventDetails(eventId);
      this.assert(eventDetails && eventDetails.event && eventDetails.event.id === eventId, 'getEventDetails should return selected event');
      this.assert(eventDetails.event.isFree === true, 'Event details should confirm event is free');

      // Register for event with 2 attendees
      const registrantName = 'Alex Taylor';
      const registrantEmail = 'alex.taylor@example.com';
      const attendeeCount = 2;
      const registerResult = this.logic.registerForEvent(eventId, registrantName, registrantEmail, attendeeCount, false);

      this.assert(registerResult && registerResult.success === true, 'registerForEvent should succeed');
      this.assert(registerResult.registrationId, 'registerForEvent should return registrationId');

      // Verify registration stored correctly in EventRegistration storage
      const registrations = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const storedReg = registrations.find(r => r.id === registerResult.registrationId);
      this.assert(storedReg, 'Stored EventRegistration should exist');
      this.assert(storedReg.eventId === eventId, 'EventRegistration.eventId should match selected event');
      this.assert(storedReg.attendeeCount === attendeeCount, 'EventRegistration.attendeeCount should match requested count');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3RequestRoomReservationForSmallGroup() {
    const testName = 'Task 3: Request room reservation for 8-12 people Wednesday 7-9pm';
    try {
      // Choose a specific upcoming Wednesday in generated data window
      const targetDate = '2026-03-11'; // ISO date for Wednesday

      // Search available rooms for 7:00-9:00pm with 10 attendees
      const searchResult = this.logic.searchAvailableRooms(targetDate, '19:00', '21:00', 10);
      this.assert(searchResult && Array.isArray(searchResult.rooms), 'searchAvailableRooms should return rooms');
      this.assert(searchResult.rooms.length > 0, 'Should find at least one available room');

      const roomCard = searchResult.rooms[0];
      const roomId = roomCard.roomId;

      // Validate capacity includes 8-12 (we requested 10, ensure 10 within capacity range)
      this.assert(roomCard.capacityMin <= 10 && roomCard.capacityMax >= 10, 'Room capacity should accommodate 10 attendees');

      // Load room details for reservation context
      const roomDetails = this.logic.getRoomDetailsForReservation(roomId, targetDate, '19:00', '21:00');
      this.assert(roomDetails && roomDetails.room && roomDetails.room.id === roomId, 'getRoomDetailsForReservation should return selected room');
      this.assert(roomDetails.reservationDefaults.date === targetDate, 'Reservation defaults date should match requested');
      this.assert(roomDetails.reservationDefaults.startTime === '19:00', 'Reservation defaults startTime should match requested');
      this.assert(roomDetails.reservationDefaults.endTime === '21:00', 'Reservation defaults endTime should match requested');

      // Submit reservation request
      const groupName = 'Midweek Bible Study';
      const contactName = 'John Rivera';
      const contactEmail = 'john.rivera@example.com';
      const expectedAttendees = 10;
      const submitResult = this.logic.submitRoomReservationRequest(
        roomId,
        groupName,
        contactName,
        contactEmail,
        targetDate,
        '19:00',
        '21:00',
        expectedAttendees,
        ''
      );

      this.assert(submitResult && submitResult.success === true, 'submitRoomReservationRequest should succeed');
      this.assert(submitResult.reservationRequestId, 'Reservation should return an ID');

      // Verify reservation stored and linked to correct room
      const reservations = JSON.parse(localStorage.getItem('room_reservation_requests') || '[]');
      const stored = reservations.find(r => r.id === submitResult.reservationRequestId);
      this.assert(stored, 'Stored RoomReservationRequest should exist');
      this.assert(stored.roomId === roomId, 'RoomReservationRequest.roomId should match selected room');
      const storedDate = this.toIsoDate(new Date(stored.date));
      this.assert(storedDate === targetDate, 'Stored reservation date should match requested date');
      this.assert(stored.expectedAttendees === expectedAttendees, 'Stored expectedAttendees should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4SaveForgivenessSermonsToWatchLater() {
    const testName = 'Task 4: Save three recent forgiveness sermons to Watch Later';
    try {
      // Load sermon filter options (simulate opening Sermons page)
      const sermonFilterOptions = this.logic.getSermonFilterOptions();
      this.assert(sermonFilterOptions && Array.isArray(sermonFilterOptions.dateRangePresets), 'Sermon filter options should load');

      // Prefer a preset for last 6 months if available
      let last6Start = null;
      let last6End = null;
      const last6Preset = sermonFilterOptions.dateRangePresets.find(p => p.key === 'last_6_months');
      if (last6Preset) {
        last6Start = last6Preset.startDate;
        last6End = last6Preset.endDate;
      } else {
        // Fallback: compute last 6 months from baseline
        const baseline = this.getBaselineDate();
        const end = new Date(Date.UTC(baseline.getUTCFullYear(), baseline.getUTCMonth(), baseline.getUTCDate()));
        const start = new Date(end.getTime());
        start.setUTCMonth(start.getUTCMonth() - 6);
        last6Start = this.toIsoDate(start);
        last6End = this.toIsoDate(end);
      }

      const filters = {
        dateFrom: last6Start,
        dateTo: last6End,
        topics: ['forgiveness'],
        speakerName: undefined,
        series: undefined
      };

      const searchResult = this.logic.searchSermons(
        'forgiveness',
        filters,
        'date_newest',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.sermons), 'searchSermons should return sermons');
      this.assert(searchResult.sermons.length >= 3, 'Should find at least three forgiveness sermons');

      // Confirm sermons are sorted newest first
      for (let i = 1; i < searchResult.sermons.length; i++) {
        const prev = new Date(searchResult.sermons[i - 1].date).getTime();
        const curr = new Date(searchResult.sermons[i].date).getTime();
        this.assert(prev >= curr, 'Sermons should be sorted by newest first');
      }

      const firstThree = searchResult.sermons.slice(0, 3);

      // Add each to Watch Later playlist
      const addedIds = [];
      for (const sermon of firstThree) {
        const addResult = this.logic.addSermonToWatchLater(sermon.sermonId);
        this.assert(addResult && addResult.success === true, 'addSermonToWatchLater should succeed for ' + sermon.sermonId);
        addedIds.push(sermon.sermonId);
      }

      // Verify Watch Later playlist contents
      const playlist = this.logic.getWatchLaterPlaylist();
      this.assert(playlist && Array.isArray(playlist.sermons), 'getWatchLaterPlaylist should return sermons');

      for (const sid of addedIds) {
        const found = playlist.sermons.find(s => s.sermonId === sid);
        this.assert(found, 'Playlist should contain sermon ' + sid);
      }

      // Also verify underlying storage
      const playlistsRaw = JSON.parse(localStorage.getItem('watch_later_playlists') || '[]');
      if (playlistsRaw.length > 0) {
        const stored = playlistsRaw[0];
        this.assert(Array.isArray(stored.sermonIds), 'Stored WatchLaterPlaylist.sermonIds should be array');
        for (const sid of addedIds) {
          this.assert(stored.sermonIds.includes(sid), 'Stored WatchLaterPlaylist should reference sermon ' + sid);
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5SignUpForSaturdayVolunteerRoleUnder3Hours() {
    const testName = 'Task 5: Sign up for Saturday volunteer role under 3 hours/week';
    try {
      // Load volunteer filter options
      const volunteerFilterOptions = this.logic.getVolunteerFilterOptions();
      this.assert(volunteerFilterOptions && Array.isArray(volunteerFilterOptions.dayOfWeekOptions), 'Volunteer filter options should load');

      const filters = {
        daysOfWeek: ['saturday'],
        maxHoursPerWeek: 3,
        category: undefined
      };

      const searchResult = this.logic.searchVolunteerRoles(
        filters,
        'name_az',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.roles), 'searchVolunteerRoles should return roles');
      this.assert(searchResult.roles.length > 0, 'Should find at least one Saturday role under 3 hours/week');

      const roleCard = searchResult.roles[0];
      const roleId = roleCard.volunteerRoleId;

      // Validate role meets filter criteria
      this.assert(Array.isArray(roleCard.daysNeeded) && roleCard.daysNeeded.includes('saturday'), 'Role should include Saturday in daysNeeded');
      this.assert(roleCard.hoursPerWeek <= 3, 'Role hoursPerWeek should be <= 3');

      // Get role details page
      const roleDetails = this.logic.getVolunteerRoleDetails(roleId);
      this.assert(roleDetails && roleDetails.role && roleDetails.role.id === roleId, 'getVolunteerRoleDetails should return selected role');
      this.assert(roleDetails.role.isActive === true, 'Volunteer role should be active');

      // Submit interest
      const name = 'Maria Lopez';
      const email = 'maria.lopez@example.com';
      const preferredDay = 'saturday';
      const interestResult = this.logic.submitVolunteerInterest(
        roleId,
        name,
        email,
        preferredDay,
        '08:00',
        '10:00',
        ''
      );

      this.assert(interestResult && interestResult.success === true, 'submitVolunteerInterest should succeed');
      this.assert(interestResult.volunteerInterestId, 'Volunteer interest should return ID');

      // Verify VolunteerInterest storage
      const interests = JSON.parse(localStorage.getItem('volunteer_interests') || '[]');
      const stored = interests.find(v => v.id === interestResult.volunteerInterestId);
      this.assert(stored, 'Stored VolunteerInterest should exist');
      this.assert(stored.volunteerRoleId === roleId, 'VolunteerInterest.volunteerRoleId should match selected role');
      this.assert(stored.preferredDay === preferredDay, 'VolunteerInterest.preferredDay should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6SubmitYouthMinistryPledge() {
    const testName = 'Task 6: Submit $25 one-time pledge to Youth Ministry fund';
    try {
      const givingOptions = this.logic.getGivingOptions();
      this.assert(givingOptions && Array.isArray(givingOptions.funds), 'Giving options should load funds');

      // Find Youth Ministry fund by name
      const youthFund = givingOptions.funds.find(f => f.name.toLowerCase().indexOf('youth') !== -1 && f.isVisibleOnline && f.isActive);
      this.assert(youthFund, 'Youth Ministry fund should be available and visible online');

      // Find pledge_only giving type
      const pledgeGivingType = givingOptions.givingTypes.find(gt => gt.value === 'pledge_only') || givingOptions.givingTypes[0];
      this.assert(pledgeGivingType, 'Should have at least one giving type');

      // Find one_time frequency
      const oneTimeFrequency = givingOptions.frequencyOptions.find(f => f.value === 'one_time') || givingOptions.frequencyOptions[0];
      this.assert(oneTimeFrequency, 'Should have at least one frequency option');

      const amount = 25;
      const donorName = 'Daniel Kim';
      const donorEmail = 'daniel.kim@example.com';

      const pledgeResult = this.logic.submitPledge(
        youthFund.fundId,
        amount,
        pledgeGivingType.value,
        oneTimeFrequency.value,
        donorName,
        donorEmail,
        undefined,
        ''
      );

      this.assert(pledgeResult && pledgeResult.success === true, 'submitPledge should succeed');
      this.assert(pledgeResult.pledgeId, 'Pledge should return ID');

      // Validate summary matches inputs
      this.assert(pledgeResult.summary, 'Pledge summary should be present');
      this.assert(pledgeResult.summary.fundName === youthFund.name, 'Pledge summary fundName should match Youth Ministry');
      this.assert(pledgeResult.summary.amount === amount, 'Pledge summary amount should match input');
      this.assert(pledgeResult.summary.givingType === pledgeGivingType.value, 'Pledge summary givingType should match input');
      this.assert(pledgeResult.summary.frequency === oneTimeFrequency.value, 'Pledge summary frequency should match input');

      // Verify Pledge storage
      const pledges = JSON.parse(localStorage.getItem('pledges') || '[]');
      const stored = pledges.find(p => p.id === pledgeResult.pledgeId);
      this.assert(stored, 'Stored Pledge should exist');
      this.assert(stored.fundId === youthFund.fundId, 'Pledge.fundId should match Youth Ministry fund');
      this.assert(stored.amount === amount, 'Stored pledge amount should match');
      this.assert(stored.donorEmail === donorEmail, 'Stored donorEmail should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7SaveTwoNonOverlappingEventsToMyEvents() {
    const testName = 'Task 7: Save two non-overlapping events in same week to My Events';
    try {
      const eventFilterOptions = this.logic.getEventFilterOptions();
      this.assert(eventFilterOptions && Array.isArray(eventFilterOptions.categoryOptions), 'Event filter options should load');

      // First, find a community event (simulating Community category filter & week view)
      const communityFilters = {
        category: 'community',
        dateFrom: undefined,
        dateTo: undefined,
        daysOfWeek: undefined,
        timeFrom: undefined,
        timeTo: undefined,
        priceFilter: 'any'
      };

      const communitySearch = this.logic.searchEvents(
        undefined,
        communityFilters,
        'week',
        'date_earliest',
        1,
        10
      );

      this.assert(communitySearch && Array.isArray(communitySearch.events), 'searchEvents for community should return events');
      this.assert(communitySearch.events.length > 0, 'Should find at least one community event');

      const firstEvent = communitySearch.events[0];
      const firstEventId = firstEvent.eventId;

      // Compute week bounds (Monday-Sunday) for first event
      const firstStart = new Date(firstEvent.startDateTime);
      const day = firstStart.getUTCDay();
      const offsetToMonday = (day + 6) % 7;
      const weekStart = new Date(Date.UTC(firstStart.getUTCFullYear(), firstStart.getUTCMonth(), firstStart.getUTCDate()));
      weekStart.setUTCDate(weekStart.getUTCDate() - offsetToMonday);
      const weekEnd = new Date(weekStart.getTime());
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const weekStartIso = this.toIsoDate(weekStart);
      const weekEndIso = this.toIsoDate(weekEnd);

      // Second search: any events in same week, earliest first
      const weekFilters = {
        category: undefined,
        dateFrom: weekStartIso,
        dateTo: weekEndIso,
        daysOfWeek: undefined,
        timeFrom: undefined,
        timeTo: undefined,
        priceFilter: 'any'
      };

      const weekSearch = this.logic.searchEvents(
        undefined,
        weekFilters,
        'week',
        'date_earliest',
        1,
        20
      );

      this.assert(weekSearch && Array.isArray(weekSearch.events), 'searchEvents for week should return events');

      // Find a second event in same week whose times do not overlap with first
      let secondEvent = null;
      for (const ev of weekSearch.events) {
        if (ev.eventId === firstEventId) continue;
        if (this.areEventsNonOverlapping(firstEvent, ev)) {
          secondEvent = ev;
          break;
        }
      }

      this.assert(secondEvent, 'Should find a second non-overlapping event in same week');
      const secondEventId = secondEvent.eventId;

      // Save both events to My Events (like clicking Add to My Events)
      const saveFirst = this.logic.saveEventToMyEvents(firstEventId);
      this.assert(saveFirst && saveFirst.success === true, 'Saving first event to My Events should succeed');

      const saveSecond = this.logic.saveEventToMyEvents(secondEventId);
      this.assert(saveSecond && saveSecond.success === true, 'Saving second event to My Events should succeed');

      // Get My Events list and verify both present
      const myEvents = this.logic.getMyEvents();
      this.assert(myEvents && Array.isArray(myEvents.events), 'getMyEvents should return events');

      const firstInList = myEvents.events.find(e => e.eventId === firstEventId);
      const secondInList = myEvents.events.find(e => e.eventId === secondEventId);
      this.assert(firstInList, 'My Events should contain first event');
      this.assert(secondInList, 'My Events should contain second event');

      // Also validate non-overlap using full details
      const firstDetails = this.logic.getEventDetails(firstEventId).event;
      const secondDetails = this.logic.getEventDetails(secondEventId).event;
      this.assert(this.areEventsNonOverlapping(firstDetails, secondDetails), 'Selected events should be non-overlapping in time');

      // Verify underlying SavedEventList storage
      const savedLists = JSON.parse(localStorage.getItem('saved_event_lists') || '[]');
      if (savedLists.length > 0) {
        const saved = savedLists[0];
        this.assert(Array.isArray(saved.eventIds), 'SavedEventList.eventIds should be array');
        this.assert(saved.eventIds.includes(firstEventId), 'SavedEventList should include first event');
        this.assert(saved.eventIds.includes(secondEventId), 'SavedEventList should include second event');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8RequestMorningMarriageCounselingNextWeek() {
    const testName = 'Task 8: Request morning pastoral counseling next week (marriage)';
    try {
      // Load Care overview and pastor filter options
      const careOverview = this.logic.getCareOverview();
      this.assert(careOverview && Array.isArray(careOverview.careAreas), 'Care overview should load');

      const pastorFilterOptions = this.logic.getPastorFilterOptions();
      this.assert(pastorFilterOptions && Array.isArray(pastorFilterOptions.specialtyOptions), 'Pastor filter options should load');

      // Search for pastors who specialize in marriage counseling and are counselors
      const pastorFilters = {
        specialties: ['marriage_counseling', 'marriage', 'marriage_and_family'],
        isCounselor: true
      };

      const pastorSearch = this.logic.searchPastors(pastorFilters, 'name_az');
      this.assert(pastorSearch && Array.isArray(pastorSearch.pastors), 'searchPastors should return pastors');
      this.assert(pastorSearch.pastors.length > 0, 'Should find at least one marriage counseling pastor');

      const pastorCard = pastorSearch.pastors[0];
      const pastorId = pastorCard.pastorId;

      // Confirm profile includes marriage-related specialty
      const pastorProfile = this.logic.getPastorProfile(pastorId);
      this.assert(pastorProfile && pastorProfile.pastor && pastorProfile.pastor.id === pastorId, 'getPastorProfile should return selected pastor');
      const specialties = pastorProfile.pastor.specialties || [];
      const hasMarriageSpecialty = specialties.some(s => s.indexOf('marriage') !== -1);
      this.assert(hasMarriageSpecialty, 'Selected pastor should specialize in marriage-related counseling');
      this.assert(pastorProfile.pastor.isCounselor === true, 'Pastor should be available for counseling');

      // Compute next calendar week bounds
      const nextWeek = this.getNextWeekBoundsFromBaseline();
      const dateFrom = this.toIsoDate(nextWeek.start);
      const dateTo = this.toIsoDate(nextWeek.end);

      // Get counseling availability for next week, mornings (9:00-12:00)
      const availability = this.logic.getCounselingAvailabilityForPastor(
        pastorId,
        dateFrom,
        dateTo,
        '09:00',
        '12:00'
      );

      this.assert(availability && Array.isArray(availability.slots), 'getCounselingAvailabilityForPastor should return slots');

      // Choose first unbooked morning slot next week
      const selectedSlot = availability.slots.find(s => s.isBooked === false);
      this.assert(selectedSlot, 'Should have at least one unbooked morning slot next week');

      const slotStart = new Date(selectedSlot.startDateTime);
      this.assert(slotStart >= nextWeek.start && slotStart <= nextWeek.end, 'Selected slot should fall within next week');
      const slotTime = this.getHourMinutesUtc(selectedSlot.startDateTime);
      this.assert(slotTime.h >= 9 && slotTime.h < 12, 'Selected slot should start between 9:00 and 12:00');

      // Submit counseling appointment request
      const name = 'Samantha Green';
      const email = 'samantha.green@example.com';
      const reason = 'marriage';

      const requestResult = this.logic.submitCounselingAppointmentRequest(
        pastorId,
        selectedSlot.availabilitySlotId,
        name,
        email,
        reason,
        ''
      );

      this.assert(requestResult && requestResult.success === true, 'submitCounselingAppointmentRequest should succeed');
      this.assert(requestResult.appointmentRequestId, 'Appointment request should return ID');
      this.assert(requestResult.slotSummary, 'Appointment response should include slot summary');

      // Verify CounselingAppointmentRequest storage
      const requests = JSON.parse(localStorage.getItem('counseling_appointment_requests') || '[]');
      const stored = requests.find(r => r.id === requestResult.appointmentRequestId);
      this.assert(stored, 'Stored CounselingAppointmentRequest should exist');
      this.assert(stored.pastorId === pastorId, 'CounselingAppointmentRequest.pastorId should match selected pastor');
      this.assert(stored.availabilitySlotId === selectedSlot.availabilitySlotId, 'CounselingAppointmentRequest.availabilitySlotId should match selected slot');
      this.assert(stored.reason === reason, 'Stored counseling reason should match input');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
