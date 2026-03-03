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
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (same values)
    const generatedData = {
      alumni_profiles: [
        {
          id: 'alum_001',
          first_name: 'Alex',
          last_name: 'Nguyen',
          preferred_name: 'Alex',
          email: 'alex.nguyen@example.com',
          graduation_year: 2012,
          degree: 'B.S. Computer Science',
          school: 'engineering',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          industry: 'software_engineering',
          job_title: 'Senior Software Engineer',
          employer: 'CloudBridge Labs',
          linkedin_url: 'https://www.linkedin.com/in/alexnguyen-sf',
          is_visible_in_directory: true
        },
        {
          id: 'alum_002',
          first_name: 'Bianca',
          last_name: 'Lopez',
          preferred_name: 'Bianca',
          email: 'bianca.lopez@example.com',
          graduation_year: 2015,
          degree: 'B.S. Software Engineering',
          school: 'engineering',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          industry: 'software_engineering',
          job_title: 'Staff Software Engineer',
          employer: 'Harborline Systems',
          linkedin_url: 'https://www.linkedin.com/in/bianca-lopez-dev',
          is_visible_in_directory: true
        },
        {
          id: 'alum_003',
          first_name: 'Carlos',
          last_name: 'Mendes',
          preferred_name: 'Carl',
          email: 'carlos.mendes@example.com',
          graduation_year: 2018,
          degree: 'M.S. Computer Science',
          school: 'engineering',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          industry: 'software_engineering',
          job_title: 'Software Engineer',
          employer: 'BrightStack',
          linkedin_url: 'https://www.linkedin.com/in/carlos-mendes-sf',
          is_visible_in_directory: true
        }
      ],
      benefits: [
        {
          id: 'benefit_travel_001',
          name: 'Global Hotel Partner Discount',
          headline: 'Save 25% on thousands of hotels worldwide',
          description: 'Alumni receive an exclusive 25% discount on participating hotels in major cities worldwide when booking through the alumni travel portal.',
          category: 'travel',
          partner_name: 'WorldStay Hotels',
          discount_percentage: 25,
          discount_description: '25% off best available flexible rate',
          eligibility: 'Available to all alumni and their immediate family members.',
          redemption_instructions: 'Access the alumni travel portal using your alumni ID and follow the hotel booking link. Discount is applied automatically at checkout.',
          exclusions: 'Blackout dates during major holidays and special events may apply.',
          geographic_limitations: 'Valid worldwide where WorldStay operates.',
          start_date: '2025-01-01T00:00:00Z',
          end_date: '2027-12-31T23:59:59Z',
          is_active: true,
          terms_url: 'https://arxiv.org/pdf/2404.07972'
        },
        {
          id: 'benefit_travel_002',
          name: 'Alumni Car Rental Savings',
          headline: '20% off car rentals plus free GPS',
          description: 'Enjoy 20% off base rates at participating locations, with a complimentary GPS included on rentals of 3 days or more.',
          category: 'travel_transportation',
          partner_name: 'MetroDrive Rentals',
          discount_percentage: 20,
          discount_description: '20% off base daily and weekly rental rates',
          eligibility: 'All alumni; driver must meet standard rental qualifications.',
          redemption_instructions: 'Use the alumni discount code ALUM20 when reserving online or by phone.',
          exclusions: 'Luxury and specialty vehicle classes excluded. Taxes and fees not discounted.',
          geographic_limitations: 'Valid in the United States and Canada.',
          start_date: '2024-09-01T00:00:00Z',
          end_date: '2026-09-01T23:59:59Z',
          is_active: true,
          terms_url: 'https://arxiv.org/pdf/2404.07972'
        },
        {
          id: 'benefit_travel_003',
          name: 'Boutique Hotel Alumni Rate',
          headline: '15% off independent boutique hotels',
          description: 'Discover unique stays at independent boutique hotels with a special alumni discount.',
          category: 'travel',
          partner_name: 'IndieStay Collection',
          discount_percentage: 15,
          discount_description: '15% off the nightly room rate at participating hotels.',
          eligibility: 'Alumni and spouses/partners traveling together.',
          redemption_instructions: 'Book through the IndieStay alumni booking page linked from the alumni benefits portal.',
          exclusions: 'Offer not valid on pre-paid nonrefundable rates.',
          geographic_limitations: 'North America and Europe only.',
          start_date: '2025-03-01T00:00:00Z',
          end_date: '2027-03-01T23:59:59Z',
          is_active: true,
          terms_url: 'https://arxiv.org/pdf/2404.07972'
        }
      ],
      contact_lists: [
        {
          id: 'default_contacts',
          name: 'My Alumni Contacts',
          description: 'Default list for saved alumni profiles and networking contacts.',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'sf_tech_network',
          name: 'San Francisco Tech Network',
          description: 'Contacts for San Francisco technology and software alumni.',
          created_at: '2024-06-10T15:30:00Z'
        }
      ],
      funds: [
        {
          id: 'fund_student_scholarships',
          code: 'student_scholarships',
          name: 'Student Scholarships Fund',
          description: 'Provides need-based and merit scholarships to current undergraduate and graduate students.',
          is_active: true,
          is_default: false
        },
        {
          id: 'fund_annual',
          code: 'annual_fund',
          name: 'Annual Fund',
          description: 'Flexible support for the university\'s greatest immediate needs.',
          is_active: true,
          is_default: true
        },
        {
          id: 'fund_athletics',
          code: 'athletics',
          name: 'Athletics Excellence Fund',
          description: 'Supports varsity and club sports, facilities, and student-athlete development.',
          is_active: true,
          is_default: false
        }
      ],
      mentor_expertise_topics: [
        {
          id: 'topic_technology',
          code: 'technology',
          name: 'Technology',
          description: 'Software, hardware, IT infrastructure, and emerging technologies.',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'topic_entrepreneurship',
          code: 'entrepreneurship',
          name: 'Entrepreneurship',
          description: 'Starting, funding, and scaling new ventures.',
          is_active: true,
          sort_order: 2
        },
        {
          id: 'topic_leadership',
          code: 'leadership',
          name: 'Leadership & Management',
          description: 'People management, leadership development, and organizational culture.',
          is_active: true,
          sort_order: 3
        }
      ],
      mentoring_programs: [
        {
          id: 'mentoring_current_students',
          name: 'Student-Alumni Mentoring Program',
          description: 'Pairs alumni with current undergraduate and graduate students for one-on-one career exploration, networking, and professional skill-building.',
          audience: 'current_students',
          is_active: true,
          min_time_commitment_hours_per_month: 2,
          max_time_commitment_hours_per_month: 4,
          allowed_meeting_formats: ['video_chat', 'in_person', 'phone'],
          application_open_date: '2025-01-15T00:00:00Z',
          application_close_date: '2026-12-31T23:59:59Z',
          contact_email: 'studentmentoring@alumni.university.edu'
        },
        {
          id: 'mentoring_recent_grads',
          name: 'Recent Graduates Career Launch Mentoring',
          description: 'Supports alumni within five years of graduation as they transition into the workforce.',
          audience: 'recent_graduates',
          is_active: true,
          min_time_commitment_hours_per_month: 1,
          max_time_commitment_hours_per_month: 3,
          allowed_meeting_formats: ['video_chat', 'phone'],
          application_open_date: '2024-08-01T00:00:00Z',
          application_close_date: '2026-08-01T23:59:59Z',
          contact_email: 'gradmentoring@alumni.university.edu'
        },
        {
          id: 'mentoring_mid_career',
          name: 'Mid-Career Alumni Peer Circles',
          description: 'Small peer groups facilitated by experienced alumni to discuss leadership, career change, and work-life balance.',
          audience: 'mid_career_alumni',
          is_active: true,
          min_time_commitment_hours_per_month: 2,
          max_time_commitment_hours_per_month: 2,
          allowed_meeting_formats: ['video_chat'],
          application_open_date: '2025-03-01T00:00:00Z',
          application_close_date: '2027-03-01T23:59:59Z',
          contact_email: 'peercircles@alumni.university.edu'
        }
      ],
      newsletter_topics: [
        {
          id: 'newsletter_career_services',
          code: 'career_services',
          name: 'Career Services',
          description: 'Job postings, career resources, and professional development opportunities.',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'newsletter_alumni_events',
          code: 'alumni_events',
          name: 'Alumni Events',
          description: 'Invitations to regional events, reunions, and virtual programs.',
          is_active: true,
          sort_order: 2
        },
        {
          id: 'newsletter_university_news',
          code: 'university_news',
          name: 'University News',
          description: 'Major announcements, campus updates, and leadership messages.',
          is_active: true,
          sort_order: 3
        }
      ],
      scholarships: [
        {
          id: 'scholarship_child_undergrad_001',
          name: 'Alumni Legacy Undergraduate Scholarship',
          description: 'A merit-based scholarship for children of alumni enrolled full-time in an undergraduate degree program.',
          eligibility_group: 'children_of_alumni',
          level_of_study: 'undergraduate',
          eligibility_details: 'Applicant must be a child (including adopted or stepchild) of a degreed alumnus/alumna and maintain a minimum 3.3 GPA.',
          award_amount: 15000,
          award_amount_max: 15000,
          award_currency: 'USD',
          deadline: '2025-04-15T23:59:59Z',
          application_url: 'https://arxiv.org/pdf/2404.07972',
          application_requirements: 'Online application, transcript, two recommendation letters, and personal statement.',
          is_active: true
        },
        {
          id: 'scholarship_child_undergrad_002',
          name: 'Children of Alumni Access Grant',
          description: 'Need-based grant for undergraduate children of alumni to help cover tuition and fees.',
          eligibility_group: 'children_of_alumni',
          level_of_study: 'undergraduate',
          eligibility_details: 'Open to dependent children of alumni with demonstrated financial need as determined by the financial aid office.',
          award_amount: 8000,
          award_amount_max: 12000,
          award_currency: 'USD',
          deadline: '2025-06-01T23:59:59Z',
          application_url: 'https://arxiv.org/pdf/2404.07972',
          application_requirements: 'FAFSA or international financial aid form, short essay, and confirmation of alumni relationship.',
          is_active: true
        },
        {
          id: 'scholarship_child_undergrad_003',
          name: 'Alumni Family Scholars Award',
          description: 'Recognizes academic excellence and leadership among undergraduate children of alumni.',
          eligibility_group: 'children_of_alumni',
          level_of_study: 'undergraduate',
          eligibility_details: 'Applicant must be a child of an alum and demonstrate leadership in co-curricular activities.',
          award_amount: 10000,
          award_amount_max: 10000,
          award_currency: 'USD',
          deadline: '2026-02-15T23:59:59Z',
          application_url: 'https://arxiv.org/pdf/2404.07972',
          application_requirements: 'Online application, leadership resume, one faculty recommendation.',
          is_active: true
        }
      ],
      event_ticket_types: [
        {
          id: 'ticket_chi_tech_early',
          event_id: 'event_chi_network_apr_2026_tech',
          name: 'Early Bird Alumni Admission',
          description: 'Discounted ticket for alumni who register at least two weeks in advance.',
          price: 25,
          currency: 'USD',
          is_member_only: false,
          available_quantity: 80,
          sales_start: '2026-02-15T00:00:00Z',
          sales_end: '2026-04-10T23:59:59Z'
        },
        {
          id: 'ticket_chi_tech_standard',
          event_id: 'event_chi_network_apr_2026_tech',
          name: 'Standard Alumni Admission',
          description: 'Regular admission ticket for alumni and guests.',
          price: 35,
          currency: 'USD',
          is_member_only: false,
          available_quantity: 120,
          sales_start: '2026-02-15T00:00:00Z',
          sales_end: '2026-04-17T23:59:59Z'
        },
        {
          id: 'ticket_chi_tech_premium',
          event_id: 'event_chi_network_apr_2026_tech',
          name: 'Premium Networking Pass',
          description: 'Includes access to a pre-event reception with industry leaders and reserved seating.',
          price: 39,
          currency: 'USD',
          is_member_only: true,
          available_quantity: 30,
          sales_start: '2026-02-15T00:00:00Z',
          sales_end: '2026-04-15T23:59:59Z'
        }
      ],
      events: [
        {
          id: 'event_chi_network_apr_2026_tech',
          name: 'Chicago Tech & Startups Alumni Networking Night',
          short_title: 'Chicago Tech Networking Night',
          description: 'Connect with fellow alumni working in technology and startups across the Chicago area. Enjoy light appetizers, a brief panel, and structured networking rounds focused on product, engineering, and founder stories.',
          event_type: 'networking',
          start_datetime: '2026-04-18T23:30:00Z',
          end_datetime: '2026-04-19T02:00:00Z',
          timezone: 'America/Chicago',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          venue_name: 'Lakeshore Innovation Hub',
          venue_address: '200 N Lakeshore Dr, Chicago, IL 60601',
          is_virtual: false,
          location_map_url: 'https://maps.google.com/?q=200+N+Lakeshore+Dr,+Chicago,+IL+60601',
          currency: 'USD',
          capacity: 230,
          tickets_available: 180,
          chapter_id: 'chapter_chicago',
          featured: true,
          status: 'scheduled',
          created_at: '2026-01-20T15:00:00Z',
          min_ticket_price: 25,
          max_ticket_price: 39
        },
        {
          id: 'event_chi_network_apr_2026_mixer',
          name: 'Chicago Cross-Industry Alumni Mixer',
          short_title: 'Chicago Alumni Industry Mixer',
          description: 'An informal after-work mixer bringing together alumni from technology, finance, consulting, healthcare, and more. Includes hosted appetizers and facilitated introductions by industry table.',
          event_type: 'networking',
          start_datetime: '2026-04-22T23:00:00Z',
          end_datetime: '2026-04-23T02:00:00Z',
          timezone: 'America/Chicago',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          venue_name: 'River North Social Club',
          venue_address: '415 W Huron St, Chicago, IL 60654',
          is_virtual: false,
          location_map_url: 'https://maps.google.com/?q=415+W+Huron+St,+Chicago,+IL+60654',
          currency: 'USD',
          capacity: 260,
          tickets_available: 210,
          chapter_id: 'chapter_chicago',
          featured: false,
          status: 'scheduled',
          created_at: '2026-02-10T14:30:00Z',
          min_ticket_price: 30,
          max_ticket_price: 150
        },
        {
          id: 'event_chi_lecture_apr_2026',
          name: 'Campus Lecture: The Future of Urban Innovation',
          short_title: 'Urban Innovation Lecture',
          description: 'Join faculty and alumni experts for a conversation on how data, design, and policy are reshaping cities. Reception to follow the lecture.',
          event_type: 'lecture',
          start_datetime: '2026-04-06T17:00:00Z',
          end_datetime: '2026-04-06T19:00:00Z',
          timezone: 'America/Chicago',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          venue_name: 'University Alumni Center Auditorium',
          venue_address: '50 University Way, Chicago, IL 60637',
          is_virtual: false,
          location_map_url: 'https://maps.google.com/?q=50+University+Way,+Chicago,+IL+60637',
          currency: 'USD',
          capacity: 300,
          tickets_available: 260,
          chapter_id: '',
          featured: true,
          status: 'scheduled',
          created_at: '2026-01-15T10:00:00Z',
          min_ticket_price: 10,
          max_ticket_price: 20
        }
      ],
      chapters: [
        {
          id: 'chapter_chicago',
          name: 'Chicago Alumni Chapter',
          description: 'The primary hub for alumni living and working in the greater Chicago area, hosting networking nights, lectures, and family-friendly gatherings throughout the year.',
          city: 'Chicago',
          state: 'IL',
          region: 'Midwest',
          membership_fee: 35,
          currency: 'USD',
          membership_fee_description: 'Annual dues support local events and student scholarships from the Chicago region.',
          is_active: true,
          website_url: 'https://alumni.university.edu/chapters/chicago',
          contact_email: 'chicago.chapter@alumni.university.edu',
          upcoming_events_count: 4
        },
        {
          id: 'chapter_new_york',
          name: 'New York City Alumni Chapter',
          description: 'A vibrant community of alumni across all five boroughs, with events focused on finance, media, technology, and the arts.',
          city: 'New York',
          state: 'NY',
          region: 'Northeast',
          membership_fee: 40,
          currency: 'USD',
          membership_fee_description: 'Annual membership includes priority registration for select NYC events.',
          is_active: true,
          website_url: 'https://alumni.university.edu/chapters/new-york-city',
          contact_email: 'nyc.chapter@alumni.university.edu',
          upcoming_events_count: 1
        },
        {
          id: 'chapter_san_francisco',
          name: 'San Francisco Bay Area Alumni Chapter',
          description: 'A large and active chapter serving alumni in San Francisco, Oakland, San Jose, and the broader Bay Area, with a strong focus on technology and innovation.',
          city: 'San Francisco',
          state: 'CA',
          region: 'West',
          membership_fee: 25,
          currency: 'USD',
          membership_fee_description: 'Modest annual dues that help underwrite frequent tech meetups and family events.',
          is_active: true,
          website_url: 'https://alumni.university.edu/chapters/san-francisco-bay-area',
          contact_email: 'sf.chapter@alumni.university.edu',
          upcoming_events_count: 2
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:45.891755'
      }
    };

    // Populate localStorage using storage keys from mapping
    localStorage.setItem('alumni_profiles', JSON.stringify(generatedData.alumni_profiles));
    localStorage.setItem('benefits', JSON.stringify(generatedData.benefits));
    localStorage.setItem('contact_lists', JSON.stringify(generatedData.contact_lists));
    localStorage.setItem('funds', JSON.stringify(generatedData.funds));
    localStorage.setItem('mentor_expertise_topics', JSON.stringify(generatedData.mentor_expertise_topics));
    localStorage.setItem('mentoring_programs', JSON.stringify(generatedData.mentoring_programs));
    localStorage.setItem('newsletter_topics', JSON.stringify(generatedData.newsletter_topics));
    localStorage.setItem('scholarships', JSON.stringify(generatedData.scholarships));
    localStorage.setItem('event_ticket_types', JSON.stringify(generatedData.event_ticket_types));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('chapters', JSON.stringify(generatedData.chapters));
    // Other collections (registrations, gifts, etc.) are initialized empty by _initStorage
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RegisterCheapestChicagoNetworkingEvent();
    this.testTask2_Make75PledgeStudentScholarshipsHonor();
    this.testTask3_SubscribeNewsletterCareerAndEventsMonthly();
    this.testTask4_JoinCaliforniaChapterUnder30MostEvents();
    this.testTask5_SaveTwoTravelBenefitsAtLeast10Percent();
    this.testTask6_AddThreeSanFranciscoSoftwareAlumniToContacts();
    this.testTask7_EnrollAsMentorCurrentStudents2HoursVideo();
    this.testTask8_SaveHighestValueChildUndergradScholarshipAfterMarch1();

    return this.results;
  }

  // Task 1: Register for the cheapest Chicago alumni networking event next month under $40
  testTask1_RegisterCheapestChicagoNetworkingEvent() {
    const testName = 'Task 1: Register cheapest Chicago networking event under $40';
    console.log('Testing:', testName);

    try {
      // Simulate navigation: homepage -> events
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should be returned');

      const eventFilterOptions = this.logic.getEventFilterOptions();
      this.assert(eventFilterOptions && Array.isArray(eventFilterOptions.sort_options), 'Event filter options should be available');

      // Search networking events in Chicago under $40 (no strict date filter to keep test stable)
      const filters = {
        city: 'Chicago',
        event_types: ['networking'],
        max_price: 40
      };
      const searchResult = this.logic.searchEvents(filters, 'price_low_to_high', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.events), 'searchEvents should return events array');
      this.assert(searchResult.events.length > 0, 'Should find at least one Chicago networking event under $40');

      // Pick first qualifying event from actual response
      let selectedEvent = null;
      for (let i = 0; i < searchResult.events.length; i++) {
        const ev = searchResult.events[i];
        if (ev.city === 'Chicago' && ev.event_type === 'networking' && typeof ev.min_ticket_price === 'number' && ev.min_ticket_price < 40) {
          selectedEvent = ev;
          break;
        }
      }
      if (!selectedEvent) {
        // Fallback to first event if min_ticket_price not populated but results exist
        selectedEvent = searchResult.events[0];
      }
      this.assert(selectedEvent, 'A networking event should be selected');

      // Get event detail and ticket types
      const eventDetail = this.logic.getEventDetail(selectedEvent.id);
      this.assert(eventDetail && eventDetail.event && Array.isArray(eventDetail.ticket_types), 'Event detail should include ticket types');

      const affordableTickets = eventDetail.ticket_types.filter(function (t) {
        return typeof t.price === 'number' && t.price < 40;
      });
      this.assert(affordableTickets.length > 0, 'There should be at least one ticket type priced under $40');

      // Select the cheapest qualifying ticket from actual ticket list
      affordableTickets.sort(function (a, b) { return a.price - b.price; });
      const cheapestTicket = affordableTickets[0];
      this.assert(cheapestTicket && cheapestTicket.id, 'Cheapest ticket type should be selected');

      // Register for the event
      const registrationResult = this.logic.registerForEvent(
        selectedEvent.id,
        cheapestTicket.id,
        1,
        'Test',
        'User',
        'alum.chicago@example.com',
        2015,
        'technology',
        true,
        false,
        ''
      );

      this.assert(registrationResult && registrationResult.success === true, 'Event registration should succeed');
      this.assert(registrationResult.registration, 'Registration object should be returned');

      const reg = registrationResult.registration;
      this.assert(reg.event_id === selectedEvent.id, 'Registration should reference the selected event');
      this.assert(reg.ticket_type_id === cheapestTicket.id, 'Registration should reference the selected ticket type');
      this.assert(reg.email === 'alum.chicago@example.com', 'Registration email should match input');
      this.assert(reg.graduation_year === 2015, 'Graduation year should be recorded as 2015');
      this.assert(reg.industry === 'technology', 'Industry should be recorded as technology');
      this.assert(reg.consent_terms === true, 'Terms consent must be true');

      // Verify persisted registration in localStorage
      const storedRegsRaw = localStorage.getItem('event_registrations') || '[]';
      const storedRegs = JSON.parse(storedRegsRaw);
      const storedReg = storedRegs.find(function (r) { return r.id === reg.id; });
      this.assert(!!storedReg, 'Stored registration should exist in event_registrations');
      this.assert(storedReg.event_id === selectedEvent.id, 'Stored registration event_id should match');
      this.assert(storedReg.ticket_type_id === cheapestTicket.id, 'Stored registration ticket_type_id should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Make a $75 one-time pledge to Student Scholarships fund with honor tribute and offline billing
  testTask2_Make75PledgeStudentScholarshipsHonor() {
    const testName = 'Task 2: $75 one-time pledge to Student Scholarships with honor tribute';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should be returned');

      const giftOptions = this.logic.getGiftFormOptions();
      this.assert(giftOptions && Array.isArray(giftOptions.funds), 'Gift form options should include funds');

      // Find Student Scholarships fund by code from actual options
      const studentScholarshipsFund = giftOptions.funds.find(function (f) { return f.code === 'student_scholarships'; });
      this.assert(studentScholarshipsFund && studentScholarshipsFund.id, 'Student Scholarships fund should be available');

      // Choose an offline payment method (prefer on_campus_billing if present)
      let selectedPaymentMethod = null;
      if (Array.isArray(giftOptions.payment_methods)) {
        selectedPaymentMethod = giftOptions.payment_methods.find(function (m) { return m.value === 'on_campus_billing'; }) ||
          giftOptions.payment_methods.find(function (m) { return m.is_online_payment === false; }) ||
          giftOptions.payment_methods[0];
      }
      this.assert(selectedPaymentMethod && selectedPaymentMethod.value, 'A payment method should be selected');

      const amount = 75;
      const tributeType = 'in_honor_of';
      const tributeName = 'Jordan Lee';
      const currency = giftOptions.default_currency || 'USD';

      const giftResult = this.logic.submitGiftPledge(
        'one_time_gift',
        amount,
        currency,
        studentScholarshipsFund.id,
        tributeType,
        tributeName,
        'Jordan',
        'Donor',
        'donor.example@example.com',
        '12345',
        selectedPaymentMethod.value,
        'Please use on-campus billing / bill me later.',
        true,
        true
      );

      this.assert(giftResult && giftResult.success === true, 'Gift submission should succeed');
      this.assert(giftResult.gift, 'Gift object should be returned');

      const gift = giftResult.gift;
      this.assert(gift.amount === amount, 'Gift amount should be 75');
      this.assert(gift.fund_id === studentScholarshipsFund.id, 'Gift fund_id should match Student Scholarships fund');
      this.assert(gift.tribute_type === tributeType, 'Tribute type should be in_honor_of');
      this.assert(gift.tribute_name === tributeName, 'Tribute name should be Jordan Lee');
      this.assert(gift.donor_email === 'donor.example@example.com', 'Donor email should match');
      this.assert(gift.payment_method === selectedPaymentMethod.value, 'Payment method should match selection');
      this.assert(gift.consent_terms === true, 'Consent terms must be true');

      if (typeof selectedPaymentMethod.is_online_payment === 'boolean') {
        this.assert(
          gift.is_payment_completed_online === selectedPaymentMethod.is_online_payment,
          'is_payment_completed_online should reflect payment method online/offline flag'
        );
      }

      // Verify persistence
      const storedGiftsRaw = localStorage.getItem('gifts') || '[]';
      const storedGifts = JSON.parse(storedGiftsRaw);
      const storedGift = storedGifts.find(function (g) { return g.id === gift.id; });
      this.assert(!!storedGift, 'Stored gift should exist in gifts');
      this.assert(storedGift.fund_id === studentScholarshipsFund.id, 'Stored gift fund_id should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Subscribe to alumni email newsletter with Career Services + Alumni Events, monthly digest
  testTask3_SubscribeNewsletterCareerAndEventsMonthly() {
    const testName = 'Task 3: Subscribe to newsletter (Career Services + Alumni Events, monthly digest)';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should be returned');

      const stayConnected = this.logic.getStayConnectedOverview();
      this.assert(stayConnected && Array.isArray(stayConnected.channels), 'Stay Connected overview should include channels');

      let formState = this.logic.getNewsletterSubscriptionFormState();
      this.assert(formState && Array.isArray(formState.topics), 'Newsletter form state should include topics');

      // Select Career Services and Alumni Events topics by code
      const careerTopic = formState.topics.find(function (t) { return t.code === 'career_services'; });
      const eventsTopic = formState.topics.find(function (t) { return t.code === 'alumni_events'; });
      this.assert(careerTopic && eventsTopic, 'Career Services and Alumni Events topics should be available');

      // Choose monthly digest frequency option
      let frequencyValue = 'monthly_digest';
      if (Array.isArray(formState.frequency_options)) {
        const monthlyOption = formState.frequency_options.find(function (f) { return f.value === 'monthly_digest'; });
        if (monthlyOption) {
          frequencyValue = monthlyOption.value;
        } else if (formState.frequency_options[0]) {
          frequencyValue = formState.frequency_options[0].value;
        }
      }

      const email = 'sample.alum@example.com';
      const firstName = 'Sample';
      const lastName = 'Alum';
      const gradYear = 2012;
      const school = 'engineering';
      const topicIds = [careerTopic.id, eventsTopic.id];

      const subResult = this.logic.upsertNewsletterSubscription(
        email,
        firstName,
        lastName,
        gradYear,
        school,
        frequencyValue,
        topicIds,
        true
      );

      this.assert(subResult && subResult.success === true, 'Newsletter subscription upsert should succeed');
      this.assert(subResult.subscription, 'Subscription object should be returned');

      const subscription = subResult.subscription;
      this.assert(subscription.email === email, 'Subscription email should match input');
      this.assert(subscription.frequency === frequencyValue, 'Subscription frequency should match selection');
      this.assert(subscription.graduation_year === gradYear, 'Graduation year should be recorded');

      // Reload form state and verify selected topics and consent
      formState = this.logic.getNewsletterSubscriptionFormState();
      this.assert(formState.existing_subscription && formState.existing_subscription.subscription, 'Existing subscription should now be present');

      const existingSub = formState.existing_subscription.subscription;
      const selectedTopicIds = formState.existing_subscription.selected_topic_ids || [];
      this.assert(existingSub.email === email, 'Existing subscription email should match');
      this.assert(Array.isArray(selectedTopicIds), 'Selected topic IDs should be an array');

      this.assert(selectedTopicIds.indexOf(careerTopic.id) !== -1, 'Career Services topic should be selected');
      this.assert(selectedTopicIds.indexOf(eventsTopic.id) !== -1, 'Alumni Events topic should be selected');
      this.assert(selectedTopicIds.length === 2, 'Only two topics (Career Services and Alumni Events) should be selected');
      this.assert(existingSub.consent_email_communications === true, 'Email communications consent must be true');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Join California alumni chapter with membership fee <= $30 and most events
  testTask4_JoinCaliforniaChapterUnder30MostEvents() {
    const testName = 'Task 4: Join California alumni chapter under $30 with most events';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage should load');

      const chapterFilterOptions = this.logic.getChapterFilterOptions();
      this.assert(chapterFilterOptions && Array.isArray(chapterFilterOptions.sort_options), 'Chapter filter options should be available');

      const filters = {
        state: 'CA',
        max_membership_fee: 30,
        is_active: true
      };
      const chaptersResult = this.logic.searchChapters(filters, 'events_most_to_least', 1, 20);
      this.assert(chaptersResult && Array.isArray(chaptersResult.chapters), 'searchChapters should return chapters array');
      this.assert(chaptersResult.chapters.length > 0, 'Should find at least one California chapter with fee <= $30');

      // Select chapter with highest upcoming_events_count from returned data
      let selectedChapter = chaptersResult.chapters[0];
      for (let i = 1; i < chaptersResult.chapters.length; i++) {
        const ch = chaptersResult.chapters[i];
        if (ch.upcoming_events_count > selectedChapter.upcoming_events_count) {
          selectedChapter = ch;
        }
      }
      this.assert(selectedChapter && selectedChapter.id, 'A chapter should be selected');
      this.assert(selectedChapter.state === 'CA', 'Selected chapter should be in California');
      this.assert(selectedChapter.membership_fee <= 30, 'Selected chapter membership fee should be <= $30');

      const chapterDetail = this.logic.getChapterDetail(selectedChapter.id);
      this.assert(chapterDetail && chapterDetail.chapter, 'Chapter detail should be returned');

      // Determine membership option to use
      let membershipOptionName = null;
      let membershipFeeAmount = selectedChapter.membership_fee;
      if (Array.isArray(chapterDetail.membership_options) && chapterDetail.membership_options.length > 0) {
        // Prefer option whose fee matches chapter membership_fee, otherwise first option
        const matchingOption = chapterDetail.membership_options.find(function (o) {
          return typeof o.fee_amount === 'number' && o.fee_amount === selectedChapter.membership_fee;
        }) || chapterDetail.membership_options[0];
        membershipOptionName = matchingOption.option_name || null;
        if (typeof matchingOption.fee_amount === 'number') {
          membershipFeeAmount = matchingOption.fee_amount;
        }
      }

      const joinResult = this.logic.joinChapter(
        selectedChapter.id,
        'Chapter',
        'Joiner',
        'chapter.joiner@example.com',
        'alumni',
        2010,
        membershipOptionName,
        membershipFeeAmount,
        true
      );

      this.assert(joinResult && joinResult.success === true, 'Chapter join should succeed');
      this.assert(joinResult.membership, 'ChapterMembership object should be returned');

      const membership = joinResult.membership;
      this.assert(membership.chapter_id === selectedChapter.id, 'Membership should reference selected chapter');
      this.assert(membership.email === 'chapter.joiner@example.com', 'Membership email should match input');
      this.assert(membership.role === 'alumni', 'Membership role should be alumni');
      this.assert(membership.graduation_year === 2010, 'Graduation year should be recorded as 2010');
      if (typeof membership.membership_fee_amount === 'number') {
        this.assert(membership.membership_fee_amount <= 30, 'Membership fee amount should be <= $30');
      }
      this.assert(membership.consent_terms === true, 'Membership terms consent must be true');

      // Verify persisted membership
      const storedMembershipsRaw = localStorage.getItem('chapter_memberships') || '[]';
      const storedMemberships = JSON.parse(storedMembershipsRaw);
      const storedMembership = storedMemberships.find(function (m) { return m.id === membership.id; });
      this.assert(!!storedMembership, 'Stored chapter membership should exist');
      this.assert(storedMembership.chapter_id === selectedChapter.id, 'Stored membership chapter_id should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save two alumni travel benefits offering at least 10% discounts
  testTask5_SaveTwoTravelBenefitsAtLeast10Percent() {
    const testName = 'Task 5: Save two travel benefits with >=10% discount';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage should load');

      const benefitFilterOptions = this.logic.getBenefitFilterOptions();
      this.assert(benefitFilterOptions && Array.isArray(benefitFilterOptions.sort_options), 'Benefit filter options should be available');

      // Filter travel-related benefits with min_discount_percentage >= 10
      const filters = {
        category: 'travel', // Using travel category; still tests travel filtering
        min_discount_percentage: 10,
        is_active: true
      };

      const benefitsResult = this.logic.searchBenefits(filters, 'discount_high_to_low', 1, 20);
      this.assert(benefitsResult && Array.isArray(benefitsResult.benefits), 'searchBenefits should return benefits array');
      this.assert(benefitsResult.benefits.length >= 2, 'Should have at least two travel benefits with >=10% discount');

      // Select first two qualifying benefits from actual response
      const firstBenefit = benefitsResult.benefits[0];
      const secondBenefit = benefitsResult.benefits[1];
      this.assert(firstBenefit && secondBenefit, 'Two benefits should be selected');

      // First benefit: detail + save
      const firstDetail = this.logic.getBenefitDetail(firstBenefit.id);
      this.assert(firstDetail && firstDetail.benefit, 'Benefit detail for first benefit should be returned');
      this.assert(firstDetail.benefit.discount_percentage >= 10, 'First benefit discount should be at least 10%');

      const saveFirstResult = this.logic.saveBenefit(firstBenefit.id, 'First saved travel benefit');
      this.assert(saveFirstResult && saveFirstResult.success === true, 'Saving first benefit should succeed');
      this.assert(saveFirstResult.saved_benefit, 'SavedBenefit for first benefit should be returned');
      const savedFirst = saveFirstResult.saved_benefit;
      this.assert(savedFirst.benefit_id === firstBenefit.id, 'Saved first benefit should reference correct benefit');

      // Second benefit: detail + save
      const secondDetail = this.logic.getBenefitDetail(secondBenefit.id);
      this.assert(secondDetail && secondDetail.benefit, 'Benefit detail for second benefit should be returned');
      this.assert(secondDetail.benefit.discount_percentage >= 10, 'Second benefit discount should be at least 10%');

      const saveSecondResult = this.logic.saveBenefit(secondBenefit.id, 'Second saved travel benefit');
      this.assert(saveSecondResult && saveSecondResult.success === true, 'Saving second benefit should succeed');
      this.assert(saveSecondResult.saved_benefit, 'SavedBenefit for second benefit should be returned');
      const savedSecond = saveSecondResult.saved_benefit;
      this.assert(savedSecond.benefit_id === secondBenefit.id, 'Saved second benefit should reference correct benefit');

      // Verify saved items overview includes both benefits
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.saved_benefits), 'Saved items overview should include saved_benefits');

      const savedIds = savedOverview.saved_benefits.map(function (sb) { return sb.saved_benefit.benefit_id; });
      this.assert(savedIds.indexOf(firstBenefit.id) !== -1, 'Saved overview should include first benefit');
      this.assert(savedIds.indexOf(secondBenefit.id) !== -1, 'Saved overview should include second benefit');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Add three San Francisco software engineering alumni (2010–2020) to a contact list
  testTask6_AddThreeSanFranciscoSoftwareAlumniToContacts() {
    const testName = 'Task 6: Add three San Francisco software engineering alumni (2010-2020) to contacts';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage should load');

      const dirOptions = this.logic.getDirectoryFilterOptions();
      this.assert(dirOptions && Array.isArray(dirOptions.sort_options), 'Directory filter options should be available');

      const filters = {
        city: 'San Francisco',
        state: 'CA',
        industry: 'software_engineering',
        graduation_year_min: 2010,
        graduation_year_max: 2020,
        only_visible: true
      };

      const dirResult = this.logic.searchAlumniProfiles(filters, 'last_name_a_to_z', 1, 20);
      this.assert(dirResult && Array.isArray(dirResult.profiles), 'searchAlumniProfiles should return profiles array');
      this.assert(dirResult.profiles.length >= 3, 'Should find at least three matching alumni profiles');

      const selectedProfiles = dirResult.profiles.slice(0, 3);

      const addedProfileIds = [];
      for (let i = 0; i < selectedProfiles.length; i++) {
        const profile = selectedProfiles[i];
        this.assert(profile.city === 'San Francisco', 'Profile city should be San Francisco');
        this.assert(profile.industry === 'software_engineering', 'Profile industry should be software_engineering');
        this.assert(profile.graduation_year >= 2010 && profile.graduation_year <= 2020, 'Profile graduation year should be between 2010 and 2020');

        // Load detail, then add to contact list
        const profileDetail = this.logic.getAlumniProfileDetail(profile.id);
        this.assert(profileDetail && profileDetail.profile, 'Alumni profile detail should be returned');

        const addResult = this.logic.addToContactList(profile.id, undefined, 'SF software engineering contact', ['sf', 'software_engineering']);
        this.assert(addResult && addResult.success === true, 'Adding profile to contact list should succeed');
        this.assert(addResult.contact_list_entry, 'ContactListEntry should be returned');
        this.assert(addResult.contact_list_entry.alumni_profile_id === profile.id, 'ContactListEntry should reference the correct profile');

        addedProfileIds.push(profile.id);
      }

      // Verify via Saved Items overview that three contacts exist across contact lists
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.contact_lists), 'Saved items overview should include contact_lists');

      const allEntries = [];
      for (let i = 0; i < savedOverview.contact_lists.length; i++) {
        const listInfo = savedOverview.contact_lists[i];
        if (Array.isArray(listInfo.entries)) {
          for (let j = 0; j < listInfo.entries.length; j++) {
            allEntries.push(listInfo.entries[j]);
          }
        }
      }

      const matchedEntries = allEntries.filter(function (e) {
        return addedProfileIds.indexOf(e.alumni_profile.id) !== -1;
      });
      this.assert(matchedEntries.length >= 3, 'At least three contact list entries should match the added alumni');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Enroll as a mentor for current students with 2 hours/month availability via video chat
  testTask7_EnrollAsMentorCurrentStudents2HoursVideo() {
    const testName = 'Task 7: Enroll as mentor for current students (2 hours/month, video chat)';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage should load');

      const stayConnected = this.logic.getStayConnectedOverview();
      this.assert(stayConnected && Array.isArray(stayConnected.channels), 'Stay Connected overview should load');

      const programsOverview = this.logic.getMentoringProgramsOverview();
      this.assert(programsOverview && Array.isArray(programsOverview.programs), 'Mentoring programs overview should include programs');

      // Select the program specifically for current students
      const currentStudentsProgram = programsOverview.programs.find(function (p) {
        return p.audience === 'current_students' && p.is_active;
      });
      this.assert(currentStudentsProgram && currentStudentsProgram.id, 'Current students mentoring program should be available');

      const programDetail = this.logic.getMentoringProgramDetail(currentStudentsProgram.id);
      this.assert(programDetail && programDetail.program, 'Mentoring program detail should be returned');

      // Select Technology and Entrepreneurship expertise topics
      const techTopic = (programDetail.expertise_topics || []).find(function (t) { return t.code === 'technology'; });
      const entTopic = (programDetail.expertise_topics || []).find(function (t) { return t.code === 'entrepreneurship'; });
      this.assert(techTopic && entTopic, 'Technology and Entrepreneurship expertise topics should be available');

      const expertiseTopicIds = [techTopic.id, entTopic.id];

      // Choose 2 hours per month availability
      const desiredHours = 2;
      let selectedTimeOption = null;
      if (Array.isArray(programDetail.time_commitment_options) && programDetail.time_commitment_options.length > 0) {
        selectedTimeOption = programDetail.time_commitment_options.find(function (o) { return o.hours_per_month === desiredHours; }) ||
          programDetail.time_commitment_options[0];
      }
      const availabilityHours = selectedTimeOption ? selectedTimeOption.hours_per_month : desiredHours;
      const timeLabel = selectedTimeOption ? selectedTimeOption.label : '2 hours per month';

      // Choose video chat as preferred format
      let meetingFormat = 'video_chat';
      if (Array.isArray(programDetail.meeting_format_options) && programDetail.meeting_format_options.length > 0) {
        const videoOption = programDetail.meeting_format_options.find(function (o) { return o.value === 'video_chat'; }) ||
          programDetail.meeting_format_options[0];
        meetingFormat = videoOption.value;
      }

      const enrollResult = this.logic.enrollAsMentor(
        currentStudentsProgram.id,
        'Mentor',
        'Example',
        'mentor.example@example.com',
        'alumnus_alumna',
        2008,
        availabilityHours,
        timeLabel,
        meetingFormat,
        expertiseTopicIds,
        true
      );

      this.assert(enrollResult && enrollResult.success === true, 'Mentor enrollment should succeed');
      this.assert(enrollResult.enrollment, 'MentorEnrollment object should be returned');

      const enrollment = enrollResult.enrollment;
      this.assert(enrollment.mentoring_program_id === currentStudentsProgram.id, 'Enrollment should reference the current students program');
      this.assert(enrollment.email === 'mentor.example@example.com', 'Enrollment email should match input');
      this.assert(enrollment.affiliation === 'alumnus_alumna', 'Enrollment affiliation should be alumnus_alumna');
      this.assert(enrollment.availability_hours_per_month === availabilityHours, 'Availability hours per month should match selection');
      this.assert(enrollment.preferred_meeting_format === meetingFormat, 'Preferred meeting format should match selection');
      this.assert(enrollment.consent_terms === true, 'Mentor terms consent must be true');

      // Verify expertise links persisted
      const storedExpertiseRaw = localStorage.getItem('mentor_enrollment_expertise') || '[]';
      const storedExpertise = JSON.parse(storedExpertiseRaw);
      const enrollmentExpertise = storedExpertise.filter(function (e) { return e.mentor_enrollment_id === enrollment.id; });
      this.assert(enrollmentExpertise.length >= 2, 'At least two expertise records should be linked to the enrollment');

      const linkedTopicIds = enrollmentExpertise.map(function (e) { return e.expertise_topic_id; });
      this.assert(linkedTopicIds.indexOf(techTopic.id) !== -1, 'Technology expertise should be linked');
      this.assert(linkedTopicIds.indexOf(entTopic.id) !== -1, 'Entrepreneurship expertise should be linked');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Save highest-value undergraduate scholarship for children of alumni with deadline after March 1, 2025
  testTask8_SaveHighestValueChildUndergradScholarshipAfterMarch1() {
    const testName = 'Task 8: Save highest-value child-of-alumni undergraduate scholarship after 2025-03-01';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage should load');

      const scholarshipOptions = this.logic.getScholarshipFilterOptions();
      this.assert(scholarshipOptions && Array.isArray(scholarshipOptions.sort_options), 'Scholarship filter options should be available');

      const filters = {
        eligibility_group: 'children_of_alumni',
        level_of_study: 'undergraduate',
        deadline_after: '2025-03-01',
        is_active: true
      };

      const scholarshipsResult = this.logic.searchScholarships(filters, 'award_amount_high_to_low', 1, 20);
      this.assert(scholarshipsResult && Array.isArray(scholarshipsResult.scholarships), 'searchScholarships should return scholarships array');
      this.assert(scholarshipsResult.scholarships.length > 0, 'At least one scholarship should match filters');

      const topScholarship = scholarshipsResult.scholarships[0];
      this.assert(topScholarship && topScholarship.id, 'Top scholarship should be selected');
      this.assert(topScholarship.eligibility_group === 'children_of_alumni', 'Top scholarship should be for children of alumni');
      this.assert(topScholarship.level_of_study === 'undergraduate', 'Top scholarship should be for undergraduates');

      // Verify it has the highest award among returned scholarships
      for (let i = 1; i < scholarshipsResult.scholarships.length; i++) {
        const s = scholarshipsResult.scholarships[i];
        if (typeof s.award_amount === 'number') {
          this.assert(topScholarship.award_amount >= s.award_amount, 'Top scholarship award should be >= others in list');
        }
      }

      const detail = this.logic.getScholarshipDetail(topScholarship.id);
      this.assert(detail && detail.scholarship, 'Scholarship detail should be returned');

      const note = 'Undergrad child of alum  post 3/1/2025'.replace('\u001f', '-'); // keep readable hyphen
      const saveResult = this.logic.saveScholarship(topScholarship.id, note);
      this.assert(saveResult && saveResult.success === true, 'Saving scholarship should succeed');
      this.assert(saveResult.saved_scholarship, 'SavedScholarship should be returned');

      const savedScholarship = saveResult.saved_scholarship;
      this.assert(savedScholarship.scholarship_id === topScholarship.id, 'Saved scholarship should reference selected scholarship');
      this.assert(savedScholarship.note === note, 'Saved scholarship note should match input');

      // Verify via Saved Items overview
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.saved_scholarships), 'Saved items overview should include saved_scholarships');

      const savedIds = savedOverview.saved_scholarships.map(function (ss) { return ss.saved_scholarship.scholarship_id; });
      this.assert(savedIds.indexOf(topScholarship.id) !== -1, 'Saved overview should include the selected scholarship');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper methods
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
