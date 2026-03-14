// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear and initialize storage
    this.clearStorage();
    // Load generated baseline data
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
    // IMPORTANT: Generated Data copied exactly, used ONLY here to seed storage
    const generatedData = {
      donation_funds: [
        {
          id: 'youth_scholarship_fund',
          name: 'Youth Scholarship Fund',
          slug: 'youth_scholarship_fund',
          description: 'Provides need-based tuition assistance so that no young singer is turned away due to financial hardship.',
          is_default: true,
          is_active: true
        },
        {
          id: 'general_operations_fund',
          name: 'General Operations Fund',
          slug: 'general_operations_fund',
          description: 'Supports the choir’s greatest needs, including music purchases, staff, and program development.',
          is_default: false,
          is_active: true
        },
        {
          id: 'touring_ensemble_fund',
          name: 'Touring Ensemble Fund',
          slug: 'touring_ensemble_fund',
          description: 'Helps cover travel, lodging, and outreach costs for our touring choirs.',
          is_default: false,
          is_active: true
        }
      ],
      income_range_options: [
        {
          id: 'under_20000',
          label: 'Under $20,000',
          min_value: 0,
          max_value: 19999,
          currency: 'USD',
          sort_order: 1
        },
        {
          id: '20000_39999',
          label: '$20,000–$39,999',
          min_value: 20000,
          max_value: 39999,
          currency: 'USD',
          sort_order: 2
        },
        {
          id: '40000_59999',
          label: '$40,000–$59,999',
          min_value: 40000,
          max_value: 59999,
          currency: 'USD',
          sort_order: 3
        }
      ],
      locations: [
        {
          id: 'main_campus',
          name: 'Main Campus',
          address_line1: '1500 Harmony Ave',
          address_line2: '',
          city: 'Riverton',
          state: 'CA',
          postal_code: '94010',
          notes: 'Primary rehearsal and audition location with multiple choir rooms and a small performance hall.'
        },
        {
          id: 'downtown',
          name: 'Downtown Center',
          address_line1: '225 Market Street',
          address_line2: 'Suite 300',
          city: 'Riverton',
          state: 'CA',
          postal_code: '94011',
          notes: 'Easily accessible by public transit; hosts community workshops and adult programs.'
        },
        {
          id: 'north_side',
          name: 'North Side Arts Annex',
          address_line1: '4800 Oak Park Blvd',
          address_line2: '',
          city: 'Riverton',
          state: 'CA',
          postal_code: '94012',
          notes: 'Satellite location used for select rehearsals and outreach concerts.'
        }
      ],
      newsletter_frequency_options: [
        {
          id: 'daily',
          key: 'daily',
          label: 'Daily Updates',
          description: 'Receive an email whenever there is news, usually a few times per week.',
          is_default: false
        },
        {
          id: 'weekly',
          key: 'weekly',
          label: 'Weekly Roundup',
          description: 'A summary of upcoming concerts, auditions, and news every week.',
          is_default: true
        },
        {
          id: 'monthly',
          key: 'monthly',
          label: 'Monthly Newsletter',
          description: 'Once-a-month email with highlights, stories, and key dates.',
          is_default: false
        }
      ],
      newsletter_interest_options: [
        {
          id: 'upcoming_concerts',
          key: 'upcoming_concerts',
          label: 'Upcoming Concerts',
          description: 'Performance announcements, ticket offers, and program details.',
          is_default_selected: false
        },
        {
          id: 'scholarships_financial_aid',
          key: 'scholarships_financial_aid',
          label: 'Scholarships & Financial Aid',
          description: 'Deadlines, application tips, and updates about tuition assistance.',
          is_default_selected: false
        },
        {
          id: 'volunteer_opportunities',
          key: 'volunteer_opportunities',
          label: 'Volunteer Opportunities',
          description: 'Ushering, front-of-house roles, and other ways to get involved.',
          is_default_selected: false
        }
      ],
      scholarship_types: [
        {
          id: 'need_based_tuition',
          type_code: 'need_based_tuition',
          name: 'Need-based Tuition Scholarship',
          description: 'Provides tuition assistance based on demonstrated financial need for singers enrolled in any youth ensemble.',
          is_active: true
        },
        {
          id: 'merit_based',
          type_code: 'merit_based',
          name: 'Merit-based Scholarship',
          description: 'Awards partial or full tuition based on audition results, dedication, and leadership.',
          is_active: true
        },
        {
          id: 'other_support',
          type_code: 'other',
          name: 'Other Support & Fee Waivers',
          description: 'Covers other program fees such as tour participation or uniform costs on a case-by-case basis.',
          is_active: true
        }
      ],
      seasons: [
        {
          id: '2023_2024',
          name: '2023–2024',
          start_date: '2023-09-01T00:00:00Z',
          end_date: '2024-06-15T23:59:59Z',
          is_current: false
        },
        {
          id: '2024_2025',
          name: '2024–2025',
          start_date: '2024-09-01T00:00:00Z',
          end_date: '2025-06-15T23:59:59Z',
          is_current: false
        },
        {
          id: '2025_2026',
          name: '2025–2026',
          start_date: '2025-09-01T00:00:00Z',
          end_date: '2026-06-15T23:59:59Z',
          is_current: true
        }
      ],
      ensembles: [
        {
          id: 'prelude_choir',
          name: 'Prelude Choir',
          description: 'An introductory ensemble for young singers focusing on pitch matching, basic rhythm, and the joy of group singing.',
          min_age: 7,
          max_age: 8,
          min_grade: '2',
          max_grade: '3',
          tuition_amount: 320,
          currency: 'USD',
          rehearsal_day_of_week: 'monday',
          rehearsal_start_time: '16:15',
          rehearsal_end_time: '17:15',
          rehearsalLocationId: 'main_campus',
          seasonId: '2025_2026',
          is_active: true
        },
        {
          id: 'training_chorus',
          name: 'Training Chorus',
          description: 'Builds foundational music literacy, part-singing, and healthy vocal production for developing singers.',
          min_age: 8,
          max_age: 10,
          min_grade: '3',
          max_grade: '5',
          tuition_amount: 380,
          currency: 'USD',
          rehearsal_day_of_week: 'wednesday',
          rehearsal_start_time: '16:30',
          rehearsal_end_time: '17:45',
          rehearsalLocationId: 'main_campus',
          seasonId: '2025_2026',
          is_active: true
        },
        {
          id: 'lyric_treble_choir',
          name: 'Lyric Treble Choir',
          description: 'For intermediate treble voices ready for more challenging repertoire and performances.',
          min_age: 9,
          max_age: 11,
          min_grade: '4',
          max_grade: '6',
          tuition_amount: 420,
          currency: 'USD',
          rehearsal_day_of_week: 'tuesday',
          rehearsal_start_time: '17:00',
          rehearsal_end_time: '18:30',
          rehearsalLocationId: 'main_campus',
          seasonId: '2025_2026',
          is_active: true
        }
      ],
      events: [
        {
          id: 'holiday_concert_2026',
          title: 'December Holiday Concert',
          subtitle: 'Songs of Light and Hope',
          description: 'A festive evening featuring all advanced ensembles in a program of carols and winter selections.',
          event_type: 'concert',
          locationId: 'eastside_church',
          venue_name: 'Eastside Community Church Sanctuary',
          start_datetime: '2026-12-12T19:00:00Z',
          end_datetime: '2026-12-12T21:00:00Z',
          seasonId: '2026_2027',
          status: 'scheduled',
          is_published: true,
          image_url: 'https://static.wixstatic.com/media/6a0703_ebf3847f28bd4a15ad28ca0e59520840~mv2.jpg/v1/fill/w_720,h_480,fp_0.50_0.50,q_90/6a0703_ebf3847f28bd4a15ad28ca0e59520840~mv2.jpg'
        },
        {
          id: 'family_carol_sing_2026',
          title: 'Family Carol Sing',
          subtitle: 'An Interactive Holiday Sing-Along',
          description: 'Bring the whole family to sing favorite carols with our youth choirs and band.',
          event_type: 'concert',
          locationId: 'downtown',
          venue_name: 'Downtown Center Auditorium',
          start_datetime: '2026-12-05T15:00:00Z',
          end_datetime: '2026-12-05T16:30:00Z',
          seasonId: '2026_2027',
          status: 'scheduled',
          is_published: true,
          image_url: 'https://www.recreationliveshere.com/ImageRepository/Document?documentID=187'
        },
        {
          id: 'spring_gala_concert_2026',
          title: 'Spring Gala Concert',
          subtitle: 'Voices in Bloom',
          description: 'A formal concert featuring Cantabile Middle School Choir, Concert Chorale, and Chamber Singers.',
          event_type: 'concert',
          locationId: 'eastside_church',
          venue_name: 'Eastside Community Church Sanctuary',
          start_datetime: '2026-03-19T19:30:00Z',
          end_datetime: '2026-03-19T21:30:00Z',
          seasonId: '2025_2026',
          status: 'scheduled',
          is_published: true,
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/58a6956d-16bb-5c94-b989-f3503eec78c3.jpeg'
        }
      ],
      suggested_donation_amounts: [
        {
          id: 'ysf_monthly_15',
          fundId: 'youth_scholarship_fund',
          frequency: 'monthly',
          amount: 15,
          currency: 'USD',
          sort_order: 1,
          is_default: false
        },
        {
          id: 'ysf_monthly_25',
          fundId: 'youth_scholarship_fund',
          frequency: 'monthly',
          amount: 25,
          currency: 'USD',
          sort_order: 2,
          is_default: true
        },
        {
          id: 'ysf_monthly_50',
          fundId: 'youth_scholarship_fund',
          frequency: 'monthly',
          amount: 50,
          currency: 'USD',
          sort_order: 3,
          is_default: false
        }
      ],
      ticket_price_tiers: [
        {
          id: 'holiday_2026_tier_20',
          eventId: 'holiday_concert_2026',
          name: 'Balcony',
          description: 'Balcony seating with a full view of the stage.',
          price: 20,
          currency: 'USD',
          sort_order: 1,
          is_active: true
        },
        {
          id: 'holiday_2026_tier_35',
          eventId: 'holiday_concert_2026',
          name: 'Main Floor',
          description: 'Standard main floor seating.',
          price: 35,
          currency: 'USD',
          sort_order: 2,
          is_active: true
        },
        {
          id: 'holiday_2026_tier_60',
          eventId: 'holiday_concert_2026',
          name: 'Premium Center',
          description: 'Best-available center section seats.',
          price: 60,
          currency: 'USD',
          sort_order: 3,
          is_active: true
        }
      ],
      seats: [
        {
          id: 'holiday_2026_B_1',
          eventId: 'holiday_concert_2026',
          priceTierId: 'holiday_2026_tier_20',
          section: 'Balcony',
          row: 'B',
          seat_number: '1',
          status: 'available'
        },
        {
          id: 'holiday_2026_B_2',
          eventId: 'holiday_concert_2026',
          priceTierId: 'holiday_2026_tier_20',
          section: 'Balcony',
          row: 'B',
          seat_number: '2',
          status: 'held',
          hold_expires_at: '2026-12-01T18:00:00Z'
        },
        {
          id: 'holiday_2026_B_3',
          eventId: 'holiday_concert_2026',
          priceTierId: 'holiday_2026_tier_20',
          section: 'Balcony',
          row: 'B',
          seat_number: '3',
          status: 'sold'
        }
      ],
      audition_registrations: [],
      audition_slots: [
        {
          id: 'aud_main_2026_03_14_1000_ages7_9',
          program_name: 'Youth Choir Audition – Ages 7–9',
          description: 'Placement audition for Prelude Choir and Training Chorus.',
          locationId: 'main_campus',
          min_age: 7,
          max_age: 9,
          start_datetime: '2026-03-14T10:00:00Z',
          end_datetime: '2026-03-14T10:15:00Z',
          day_of_week: 'saturday',
          time_of_day: 'morning',
          capacity: 6,
          status: 'available',
          seasonId: '2026_2027',
          reserved_count: 0
        },
        {
          id: 'aud_main_2026_03_18_1800_ages9_11',
          program_name: 'Youth Choir Audition – Ages 9–11',
          description: 'Auditions for Lyric Treble Choir and similar intermediate ensembles.',
          locationId: 'main_campus',
          min_age: 9,
          max_age: 11,
          start_datetime: '2026-03-18T18:00:00Z',
          end_datetime: '2026-03-18T18:15:00Z',
          day_of_week: 'wednesday',
          time_of_day: 'evening',
          capacity: 4,
          status: 'available',
          seasonId: '2026_2027',
          reserved_count: 0
        },
        {
          id: 'aud_downtown_2026_03_19_1830_ages12_14',
          program_name: 'Youth Choir Audition – Ages 12–14',
          description: 'Placement for Cantabile Middle School Choir and Community Teen Choir at the Downtown Center.',
          locationId: 'downtown',
          min_age: 12,
          max_age: 14,
          start_datetime: '2026-03-19T18:30:00Z',
          end_datetime: '2026-03-19T18:45:00Z',
          day_of_week: 'thursday',
          time_of_day: 'evening',
          capacity: 5,
          status: 'available',
          seasonId: '2026_2027',
          reserved_count: 0
        }
      ],
      workshop_registrations: [],
      workshops: [
        {
          id: 'adult_downtown_apr06_2026',
          title: 'Adult Community Singing Workshop: Finding Your Voice',
          description: 'A welcoming, no-experience-required workshop for adults focusing on healthy vocal production, breathing, and singing with others.',
          age_group: 'adult_18_plus',
          fee_type: 'free',
          price: 0,
          currency: 'USD',
          locationId: 'downtown',
          start_datetime: '2026-04-06T18:00:00Z',
          end_datetime: '2026-04-06T20:00:00Z',
          capacity: 30,
          status: 'scheduled',
          reserved_count: 0
        },
        {
          id: 'adult_downtown_apr20_2026',
          title: 'Adult Community Singing Workshop: Singing in Harmony',
          description: 'Explore two- and three-part harmony in an encouraging setting geared toward adult beginners and returning singers.',
          age_group: 'adult_18_plus',
          fee_type: 'free',
          price: 0,
          currency: 'USD',
          locationId: 'downtown',
          start_datetime: '2026-04-20T18:30:00Z',
          end_datetime: '2026-04-20T20:30:00Z',
          capacity: 35,
          status: 'scheduled',
          reserved_count: 0
        },
        {
          id: 'adult_downtown_may11_2026',
          title: 'Adult Vocal Skills Lab',
          description: 'A free follow-up workshop for adults focusing on range, tone, and ear training.',
          age_group: 'adult_18_plus',
          fee_type: 'free',
          price: 0,
          currency: 'USD',
          locationId: 'downtown',
          start_datetime: '2026-05-11T18:30:00Z',
          end_datetime: '2026-05-11T20:00:00Z',
          capacity: 30,
          status: 'scheduled',
          reserved_count: 0
        }
      ],
      volunteer_opportunities: [
        {
          id: 'spring_gala_usher_2026_03_21',
          title: 'Spring Gala Concert Usher',
          description: 'Assist guests with seating, hand out programs, and provide friendly front-of-house support for the Spring Gala Concert.',
          role_category: 'event_support',
          tags: ['usher', 'front_of_house', 'concert'],
          locationId: 'eastside_church',
          start_datetime: '2026-03-21T16:00:00Z',
          end_datetime: '2026-03-21T20:00:00Z',
          day_of_week: 'saturday',
          duration_hours: 4,
          capacity: 14,
          status: 'open',
          registered_count: 1
        },
        {
          id: 'youth_showcase_usher_2026_03_28',
          title: 'Youth Spring Showcase Usher',
          description: 'Support families arriving for the Youth Spring Showcase by greeting, scanning tickets, and guiding guests to seating.',
          role_category: 'event_support',
          tags: ['usher', 'front_of_house', 'family_event'],
          locationId: 'main_campus',
          start_datetime: '2026-03-28T15:30:00Z',
          end_datetime: '2026-03-28T19:00:00Z',
          day_of_week: 'saturday',
          duration_hours: 3.5,
          capacity: 10,
          status: 'open',
          registered_count: 0
        },
        {
          id: 'family_sing_foh_2026_03_14',
          title: 'Family Sing-Along Front-of-House',
          description: 'Help set up the lobby, welcome families, and assist with seating at the Family Community Sing.',
          role_category: 'event_support',
          tags: ['front_of_house', 'family', 'usher'],
          locationId: 'main_campus',
          start_datetime: '2026-03-14T16:30:00Z',
          end_datetime: '2026-03-14T18:30:00Z',
          day_of_week: 'saturday',
          duration_hours: 2,
          capacity: 8,
          status: 'full',
          registered_count: 1
        }
      ],
      volunteer_registrations: [
        {
          id: 'vr_001',
          opportunityId: 'family_sing_foh_2026_03_14',
          volunteer_first_name: 'Jordan',
          volunteer_last_name: 'Miller',
          email: 'jordan.miller@example.com',
          phone: '555-201-4488',
          receive_updates: true,
          created_at: '2026-02-20T15:32:00Z',
          status: 'submitted'
        },
        {
          id: 'vr_002',
          opportunityId: 'donor_reception_foh_2026_06_02',
          volunteer_first_name: 'Alex',
          volunteer_last_name: 'Nguyen',
          email: 'alex.nguyen@example.com',
          phone: '555-884-2201',
          receive_updates: true,
          created_at: '2026-02-28T19:05:00Z',
          status: 'submitted'
        },
        {
          id: 'vr_003',
          opportunityId: 'community_workshop_host_2026_04_06',
          volunteer_first_name: 'Taylor',
          volunteer_last_name: 'Ramirez',
          email: 'taylor.ramirez@example.com',
          phone: '555-673-9904',
          receive_updates: true,
          created_at: '2026-03-01T10:18:00Z',
          status: 'submitted'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:01.906102'
      }
    };

    // Write generated data into localStorage using correct storage keys
    localStorage.setItem('donation_funds', JSON.stringify(generatedData.donation_funds));
    localStorage.setItem('income_range_options', JSON.stringify(generatedData.income_range_options));
    localStorage.setItem('locations', JSON.stringify(generatedData.locations));
    localStorage.setItem('newsletter_frequency_options', JSON.stringify(generatedData.newsletter_frequency_options));
    localStorage.setItem('newsletter_interest_options', JSON.stringify(generatedData.newsletter_interest_options));
    localStorage.setItem('scholarship_types', JSON.stringify(generatedData.scholarship_types));
    localStorage.setItem('seasons', JSON.stringify(generatedData.seasons));
    localStorage.setItem('ensembles', JSON.stringify(generatedData.ensembles));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('suggested_donation_amounts', JSON.stringify(generatedData.suggested_donation_amounts));
    localStorage.setItem('ticket_price_tiers', JSON.stringify(generatedData.ticket_price_tiers));
    localStorage.setItem('seats', JSON.stringify(generatedData.seats));
    localStorage.setItem('audition_slots', JSON.stringify(generatedData.audition_slots));
    localStorage.setItem('audition_registrations', JSON.stringify(generatedData.audition_registrations));
    localStorage.setItem('workshops', JSON.stringify(generatedData.workshops));
    localStorage.setItem('workshop_registrations', JSON.stringify(generatedData.workshop_registrations));
    localStorage.setItem('volunteer_opportunities', JSON.stringify(generatedData.volunteer_opportunities));
    localStorage.setItem('volunteer_registrations', JSON.stringify(generatedData.volunteer_registrations));

    // Initialize empty collections for entities with no pre-generated data
    localStorage.setItem('donations', JSON.stringify([]));
    localStorage.setItem('scholarship_applications', JSON.stringify([]));
    localStorage.setItem('ticket_carts', JSON.stringify([]));
    localStorage.setItem('cart_items', JSON.stringify([]));
    localStorage.setItem('ticket_orders', JSON.stringify([]));
    localStorage.setItem('ticket_order_items', JSON.stringify([]));
    localStorage.setItem('ensemble_registrations', JSON.stringify([]));
    localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SetupMonthlyDonationYouthScholarship();
    this.testTask2_RegisterYouthAuditionMainCampusEvening();
    this.testTask3_SubmitNeedBasedTuitionScholarshipApplication();
    this.testTask4_PurchaseTicketsForDecemberHolidayConcert();
    this.testTask5_SignUpForSaturdayVolunteerUsherShift();
    this.testTask6_ChooseEnsembleAndStartRegistration();
    this.testTask7_SubscribeToNewsletterMonthlyWithInterests();
    this.testTask8_ReserveFreeAdultWorkshopDowntownNextMonth();

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

  // ---------- Task 1 ----------
  // Set up a $25+ monthly donation to the Youth Scholarship Fund starting next month
  testTask1_SetupMonthlyDonationYouthScholarship() {
    const testName = 'Task 1: Set up monthly Youth Scholarship Fund donation';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page content should be returned');

      const donationOptions = this.logic.getDonationPageOptions();
      this.assert(donationOptions && Array.isArray(donationOptions.funds), 'Donation funds should be available');

      const youthFund = donationOptions.funds.find(f => f.name === 'Youth Scholarship Fund' && f.is_active);
      this.assert(youthFund, 'Youth Scholarship Fund should exist and be active');

      const frequencyKey = 'monthly';
      const monthlyOption = (donationOptions.frequency_options || []).find(opt => opt.key === frequencyKey);
      this.assert(monthlyOption, 'Monthly frequency option should exist');

      const suggestedForFund = (donationOptions.suggested_amounts || []).filter(a =>
        a.fundId === youthFund.id && a.frequency === frequencyKey
      );
      this.assert(suggestedForFund.length > 0, 'Suggested monthly amounts should exist for youth fund');

      const atLeast25 = suggestedForFund.filter(a => a.amount >= 25);
      this.assert(atLeast25.length > 0, 'There should be a suggested amount at least $25');
      atLeast25.sort((a, b) => a.amount - b.amount);
      const chosenAmount = atLeast25[0].amount;

      // Compute first day of next calendar month (UTC)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth(); // 0-11
      const nextMonthDate = new Date(Date.UTC(month === 11 ? year + 1 : year, (month + 1) % 12, 1, 0, 0, 0));
      const startDateIso = nextMonthDate.toISOString();

      if (donationOptions.min_start_date) {
        this.assert(
          startDateIso >= donationOptions.min_start_date,
          'Start date should be on or after min_start_date'
        );
      }
      if (donationOptions.max_start_date) {
        this.assert(
          startDateIso <= donationOptions.max_start_date,
          'Start date should be on or before max_start_date'
        );
      }

      const draftResult = this.logic.createOrUpdateDonationDraft(
        youthFund.id,
        frequencyKey,
        chosenAmount,
        true,
        startDateIso,
        'Test',
        'Donor',
        'test.donor@example.com',
        '555-000-0001',
        ''
      );

      this.assert(draftResult && draftResult.success === true, 'Donation draft should be created successfully');
      this.assert(draftResult.donation, 'Donation object should be returned');

      const donation = draftResult.donation;
      this.assert(donation.fundId === youthFund.id, 'Donation fundId should match selected fund');
      this.assert(donation.frequency === frequencyKey, 'Donation frequency should be monthly');
      this.assert(donation.amount === chosenAmount, 'Donation amount should match chosen suggested amount');
      this.assert(donation.cover_processing_fees === true, 'Donation should cover processing fees');
      this.assert(donation.status === 'in_review', 'Donation status should be in_review');

      const review = this.logic.getDonationReviewSummary();
      this.assert(review && review.donation && review.fund, 'Donation review summary should include donation and fund');
      this.assert(review.donation.id === donation.id, 'Review donation should match created donation');
      this.assert(review.fund.id === youthFund.id, 'Review fund should match selected fund');

      if (donation.cover_processing_fees) {
        this.assert(
          typeof review.processing_fee_amount === 'number',
          'Processing fee amount should be a number when covering fees'
        );
        this.assert(
          review.total_charge_amount >= donation.amount,
          'Total charge should be at least donation amount'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 2 ----------
  // Register a 10-year-old for earliest weekday evening audition at Main Campus in the nearest available month
  testTask2_RegisterYouthAuditionMainCampusEvening() {
    const testName = 'Task 2: Register for Main Campus weekday evening audition';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should be available');

      const options = this.logic.getAuditionFilterOptions();
      this.assert(options && Array.isArray(options.locations), 'Audition filter options should include locations');

      const targetAge = 10; // Adapting to available Ages 9–11 data
      const mainCampus = options.locations.find(l => l.name === 'Main Campus');
      this.assert(mainCampus, 'Main Campus location should exist');

      const monthOptions = options.month_options || [];
      this.assert(monthOptions.length > 0, 'Audition month options should be available');

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1; // 1-12

      const sortedMonths = monthOptions.slice().sort((a, b) => {
        if (a.year === b.year) return a.month - b.month;
        return a.year - b.year;
      });

      let targetMonthOption = sortedMonths.find(m =>
        m.year > currentYear || (m.year === currentYear && m.month >= currentMonth)
      );
      if (!targetMonthOption) {
        targetMonthOption = sortedMonths[0];
      }

      const year = targetMonthOption.year;
      const month = targetMonthOption.month;

      const slots = this.logic.searchAuditionSlots(
        targetAge,
        mainCampus.id,
        year,
        month,
        'evening',
        true
      );

      this.assert(Array.isArray(slots) && slots.length > 0, 'At least one matching audition slot should be returned');

      // Choose earliest by start_datetime
      slots.sort((a, b) => {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
      const chosenSlot = slots[0];
      this.assert(chosenSlot, 'A chosen audition slot should be selected');

      if (typeof chosenSlot.min_age === 'number') {
        this.assert(targetAge >= chosenSlot.min_age, 'Target age should be >= slot min_age');
      }
      if (typeof chosenSlot.max_age === 'number') {
        this.assert(targetAge <= chosenSlot.max_age, 'Target age should be <= slot max_age');
      }

      const slotDetails = this.logic.getAuditionSlotDetails(chosenSlot.id);
      this.assert(slotDetails && slotDetails.slot, 'Slot details should be returned');
      this.assert(slotDetails.location && slotDetails.location.id === mainCampus.id, 'Slot location should be Main Campus');
      this.assert(slotDetails.is_weekday === true, 'Chosen audition should be on a weekday');
      this.assert(
        typeof slotDetails.remaining_capacity === 'number' && slotDetails.remaining_capacity >= 0,
        'Remaining capacity should be non-negative number'
      );

      const regResult = this.logic.registerForAuditionSlot(
        chosenSlot.id,
        'ChildFirst',
        'ChildLast',
        targetAge,
        'Parent Guardian',
        '555-000-0002',
        'parent.guardian@example.com'
      );

      this.assert(regResult && regResult.success === true, 'Audition registration should succeed');
      this.assert(regResult.registration, 'Audition registration object should be returned');

      const registration = regResult.registration;
      this.assert(
        registration.auditionSlotId === chosenSlot.id,
        'Registration should reference the chosen audition slot'
      );
      this.assert(registration.child_age === targetAge, 'Registered child age should match target age');
      this.assert(registration.status === 'submitted', 'Audition registration status should be submitted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 3 ----------
  // Submit a need-based tuition scholarship application for 2025–2026 season
  testTask3_SubmitNeedBasedTuitionScholarshipApplication() {
    const testName = 'Task 3: Submit need-based tuition scholarship application';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should load');

      const options = this.logic.getScholarshipPageOptions();
      this.assert(options && Array.isArray(options.scholarship_types), 'Scholarship types should be available');
      this.assert(Array.isArray(options.seasons), 'Scholarship seasons should be available');
      this.assert(Array.isArray(options.income_ranges), 'Income ranges should be available');

      const needBased = options.scholarship_types.find(t =>
        t.type_code === 'need_based_tuition' ||
        (t.name && t.name.toLowerCase().indexOf('need-based') !== -1)
      );
      this.assert(needBased, 'Need-based tuition scholarship type should exist');

      // Prefer explicit 2025–2026 season by name, otherwise current
      let season = options.seasons.find(s =>
        s.name && s.name.indexOf('2025') !== -1 && s.name.indexOf('2026') !== -1
      );
      if (!season) {
        season = options.seasons.find(s => s.is_current) || options.seasons[0];
      }
      this.assert(season, 'Target scholarship season should be found');

      const lowIncomeRanges = options.income_ranges.filter(r =>
        typeof r.max_value === 'number' && r.max_value < 60000
      );
      this.assert(lowIncomeRanges.length > 0, 'At least one low income range should exist');

      lowIncomeRanges.sort((a, b) => a.max_value - b.max_value);
      const chosenIncomeRange = lowIncomeRanges[lowIncomeRanges.length - 1];

      const singerDobIso = '2014-05-01T00:00:00Z';
      const explanation = 'We are applying for need-based support due to recent changes in employment. A scholarship would make it possible for our child to continue singing.';

      const submitResult = this.logic.submitScholarshipApplication(
        needBased.id,
        season.id,
        'SingerFirst',
        'SingerLast',
        singerDobIso,
        true,
        'Guardian Name',
        'guardian@example.com',
        '555-000-0003',
        chosenIncomeRange.id,
        explanation
      );

      this.assert(submitResult && submitResult.success === true, 'Scholarship application should submit successfully');
      this.assert(submitResult.application, 'Scholarship application object should be returned');

      const app = submitResult.application;
      this.assert(app.scholarshipTypeId === needBased.id, 'Application scholarshipTypeId should match selection');
      this.assert(app.seasonId === season.id, 'Application seasonId should match selection');
      this.assert(
        app.household_income_range_id === chosenIncomeRange.id,
        'Application income range should match selection'
      );
      this.assert(app.is_current_member === true, 'Application should indicate current choir member');
      this.assert(app.financial_need_explanation && app.financial_need_explanation.length > 0, 'Explanation should be non-empty');
      this.assert(app.status === 'submitted', 'Scholarship application status should be submitted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 4 ----------
  // Purchase two under-$50 tickets for the December Holiday Concert and reach order review
  testTask4_PurchaseTicketsForDecemberHolidayConcert() {
    const testName = 'Task 4: Purchase tickets for December Holiday Concert';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should be available');

      const filterOptions = this.logic.getEventFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.month_options), 'Event month options should be available');

      const now = new Date();
      const currentYear = now.getUTCFullYear();

      const decemberOption = (filterOptions.month_options || []).find(m =>
        m.year === currentYear && m.month === 12
      ) || (filterOptions.month_options || []).find(m => m.month === 12) || filterOptions.month_options[0];
      this.assert(decemberOption, 'A December month option should be available or a fallback month');

      const events = this.logic.listEvents(decemberOption.year, decemberOption.month, 'concert');
      this.assert(Array.isArray(events) && events.length > 0, 'Concert events list should not be empty');

      let holidayEvent = events.find(e => e.title && e.title.indexOf('Holiday Concert') !== -1);
      if (!holidayEvent) {
        holidayEvent = events[0];
      }
      this.assert(holidayEvent, 'Target concert event should be found');

      const eventDetails = this.logic.getEventDetails(holidayEvent.id);
      this.assert(eventDetails && eventDetails.event, 'Event details should be returned');
      this.assert(Array.isArray(eventDetails.price_tiers), 'Event price tiers should be available');

      const selectionData = this.logic.getTicketSelectionData(holidayEvent.id);
      this.assert(selectionData && selectionData.event, 'Ticket selection data should include event');
      this.assert(Array.isArray(selectionData.price_tiers), 'Ticket selection should include price tiers');
      this.assert(Array.isArray(selectionData.seats), 'Ticket selection should include seats');

      const activeUnder50 = selectionData.price_tiers.filter(t => t.is_active && t.price < 50);
      this.assert(activeUnder50.length > 0, 'There should be at least one active tier under $50');

      activeUnder50.sort((a, b) => a.price - b.price);
      let chosenTier;
      if (activeUnder50.length >= 3) {
        chosenTier = activeUnder50[1]; // mid-priced among under-$50 tiers
      } else {
        // Adaptation: if fewer than 3 under-$50 tiers, choose the cheapest available tier
        chosenTier = activeUnder50[0];
      }

      const seatsForTier = selectionData.seats.filter(s =>
        s.eventId === holidayEvent.id &&
        s.priceTierId === chosenTier.id &&
        s.status !== 'sold'
      );
      this.assert(seatsForTier.length > 0, 'At least one seat should be available for chosen tier');

      seatsForTier.sort((a, b) => {
        if (a.row === b.row) {
          return parseInt(a.seat_number, 10) - parseInt(b.seat_number, 10);
        }
        return a.row.localeCompare(b.row);
      });

      const desiredCount = Math.min(2, seatsForTier.length);
      const selectedSeatIds = seatsForTier.slice(0, desiredCount).map(s => s.id);
      this.assert(selectedSeatIds.length > 0, 'At least one seat ID should be selected');

      const addResult = this.logic.selectSeatsAndAddToCart(
        holidayEvent.id,
        chosenTier.id,
        selectedSeatIds
      );

      this.assert(addResult && addResult.success === true, 'Seats should be added to cart successfully');
      this.assert(addResult.cart && addResult.cart_item, 'Cart and cart_item should be returned');

      const cartItem = addResult.cart_item;
      this.assert(cartItem.eventId === holidayEvent.id, 'Cart item eventId should match event');
      this.assert(cartItem.priceTierId === chosenTier.id, 'Cart item priceTierId should match chosen tier');
      this.assert(
        cartItem.quantity === selectedSeatIds.length,
        'Cart item quantity should match number of selected seats'
      );

      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart, 'Checkout summary should include cart');
      this.assert(checkoutSummary.event && checkoutSummary.event.id === holidayEvent.id, 'Checkout summary event should match');
      this.assert(Array.isArray(checkoutSummary.items), 'Checkout summary should include items array');
      this.assert(typeof checkoutSummary.total_amount === 'number', 'Checkout summary total_amount should be a number');

      const summaryItem = checkoutSummary.items.find(i => i.eventId === holidayEvent.id);
      this.assert(summaryItem, 'Checkout summary should include item for the event');
      this.assert(
        summaryItem.quantity === selectedSeatIds.length,
        'Checkout summary quantity should match selected seats'
      );

      const orderResult = this.logic.updateTicketBuyerInfoAndCreateOrder(
        'Ticket',
        'Buyer',
        'ticket.buyer@example.com'
      );

      this.assert(orderResult && orderResult.success === true, 'Ticket order should be created successfully');
      this.assert(orderResult.order, 'Ticket order object should be returned');

      const order = orderResult.order;
      this.assert(order.eventId === holidayEvent.id, 'Order eventId should match event');
      this.assert(order.status === 'in_review', 'Order status should be in_review');

      const orderReview = this.logic.getTicketOrderReview(order.id);
      this.assert(orderReview && orderReview.order, 'Order review should return order');
      this.assert(orderReview.order.id === order.id, 'Order review should match created order');
      this.assert(Array.isArray(orderReview.order_items), 'Order review should include order_items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 5 ----------
  // Sign up for a Saturday volunteer usher/front-of-house shift of at least 3 hours this month
  testTask5_SignUpForSaturdayVolunteerUsherShift() {
    const testName = 'Task 5: Sign up for Saturday volunteer usher shift';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should be returned');

      const filterOptions = this.logic.getVolunteerFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.role_categories), 'Volunteer filter role_categories should exist');

      const eventSupportCategory = filterOptions.role_categories.find(c => c.key === 'event_support');
      this.assert(eventSupportCategory, 'Event support role category should exist');

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;

      const opportunities = this.logic.listVolunteerOpportunities(
        eventSupportCategory.key,
        currentYear,
        currentMonth,
        'saturday',
        null,
        false
      );

      this.assert(Array.isArray(opportunities) && opportunities.length > 0, 'Saturday event support opportunities should exist');

      const eligible = opportunities.filter(o => {
        const hasUsheryTag = Array.isArray(o.tags) && (
          o.tags.indexOf('usher') !== -1 || o.tags.indexOf('front_of_house') !== -1
        );
        const longEnough = typeof o.duration_hours === 'number' && o.duration_hours >= 3;
        return hasUsheryTag && longEnough && o.status === 'open';
      });

      this.assert(eligible.length > 0, 'At least one eligible usher/front-of-house shift should exist');

      eligible.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      const chosen = eligible[0];
      this.assert(chosen, 'Chosen volunteer opportunity should be selected');

      const oppDetails = this.logic.getVolunteerOpportunityDetails(chosen.id);
      this.assert(oppDetails && oppDetails.opportunity, 'Volunteer opportunity details should be returned');
      this.assert(oppDetails.opportunity.id === chosen.id, 'Returned opportunity should match chosen');
      this.assert(
        typeof oppDetails.remaining_capacity === 'number' && oppDetails.remaining_capacity >= 0,
        'Remaining capacity should be non-negative'
      );

      const regResult = this.logic.registerForVolunteerOpportunity(
        chosen.id,
        'Volunteer',
        'Tester',
        'volunteer.tester@example.com',
        '555-000-0004',
        true
      );

      this.assert(regResult && regResult.success === true, 'Volunteer registration should succeed');
      this.assert(regResult.registration, 'Volunteer registration object should be returned');

      const registration = regResult.registration;
      this.assert(
        registration.opportunityId === chosen.id,
        'Volunteer registration should reference chosen opportunity'
      );
      this.assert(registration.status === 'submitted', 'Volunteer registration status should be submitted');
      this.assert(registration.receive_updates === true, 'Volunteer should be opted in to updates');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 6 ----------
  // Choose an ensemble for a youth singer (adapted to age 10 with tuition < $600, rehearsals end by 19:30) and start registration
  testTask6_ChooseEnsembleAndStartRegistration() {
    const testName = 'Task 6: Choose ensemble and start registration';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should be available');

      const filterOptions = this.logic.getEnsembleFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.seasons), 'Ensemble seasons should be available');

      let season = filterOptions.seasons.find(s => s.is_current) || filterOptions.seasons[0];
      this.assert(season, 'Current or first ensemble season should exist');

      const targetAge = 10; // Adapting to available ensembles (ages up to 11)
      const maxTuition = 600;
      const latestEndTime = '19:30';
      const weekdayOnly = true;
      const includeInactive = false;

      const ensembles = this.logic.listEnsembles(
        targetAge,
        season.id,
        maxTuition,
        weekdayOnly,
        latestEndTime,
        includeInactive
      );

      this.assert(Array.isArray(ensembles) && ensembles.length > 0, 'At least one ensemble should match filters');

      // Open at least two ensemble detail pages when possible
      const detailsToOpen = Math.min(2, ensembles.length);
      for (let i = 0; i < detailsToOpen; i += 1) {
        const detail = this.logic.getEnsembleDetails(ensembles[i].id);
        this.assert(detail && detail.ensemble, 'Ensemble details should be returned');
        this.assert(detail.ensemble.id === ensembles[i].id, 'Detail ensemble should match');
        if (typeof detail.ensemble.tuition_amount === 'number') {
          this.assert(
            detail.ensemble.tuition_amount <= maxTuition,
            'Ensemble tuition should be under or equal to max tuition'
          );
        }
        this.assert(
          detail.ensemble.rehearsal_end_time <= latestEndTime,
          'Rehearsal end time should be on or before 19:30'
        );
      }

      const chosenEnsemble = ensembles[0];
      this.assert(chosenEnsemble, 'Chosen ensemble should be selected');

      const regResult = this.logic.startEnsembleRegistration(
        chosenEnsemble.id,
        season.id,
        'SingerFirst',
        'SingerLast',
        targetAge,
        'Sample School'
      );

      this.assert(regResult && regResult.success === true, 'Ensemble registration should start successfully');
      this.assert(regResult.registration, 'EnsembleRegistration object should be returned');

      const registration = regResult.registration;
      this.assert(registration.ensembleId === chosenEnsemble.id, 'Registration ensembleId should match selection');
      this.assert(registration.seasonId === season.id, 'Registration seasonId should match selection');
      this.assert(registration.status === 'started', 'Ensemble registration status should be started');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 7 ----------
  // Subscribe to the email newsletter with Upcoming Concerts + Scholarships & Financial Aid, monthly frequency
  testTask7_SubscribeToNewsletterMonthlyWithInterests() {
    const testName = 'Task 7: Subscribe to newsletter with specific interests and monthly frequency';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should load');

      const options = this.logic.getNewsletterOptions();
      this.assert(options && Array.isArray(options.interests), 'Newsletter interests should be available');
      this.assert(Array.isArray(options.frequencies), 'Newsletter frequencies should be available');

      const upcomingConcerts = options.interests.find(i => i.key === 'upcoming_concerts');
      const scholarshipsAid = options.interests.find(i => i.key === 'scholarships_financial_aid');
      this.assert(upcomingConcerts, 'Upcoming Concerts interest should exist');
      this.assert(scholarshipsAid, 'Scholarships & Financial Aid interest should exist');

      let freq = options.frequencies.find(f => f.key === 'monthly');
      if (!freq) {
        freq = options.frequencies.find(f => f.key === 'monthly_digest') || options.frequencies[0];
      }
      this.assert(freq, 'A monthly or monthly-like frequency should be selected');

      const interestKeys = [upcomingConcerts.key, scholarshipsAid.key];

      const subResult = this.logic.subscribeToNewsletter(
        'sample.user@example.com',
        'Sample',
        'User',
        interestKeys,
        freq.key,
        true
      );

      this.assert(subResult && subResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subResult.subscription, 'NewsletterSubscription object should be returned');

      const sub = subResult.subscription;
      this.assert(sub.email === 'sample.user@example.com', 'Subscription email should match input');
      this.assert(sub.frequency === freq.key, 'Subscription frequency should match selected key');
      this.assert(sub.agreed_to_terms === true, 'Subscription should record agreed_to_terms');
      this.assert(Array.isArray(sub.interests), 'Subscription interests should be an array');

      // Ensure at least the two selected interests are present
      this.assert(
        sub.interests.indexOf(upcomingConcerts.key) !== -1,
        'Subscription should include Upcoming Concerts interest'
      );
      this.assert(
        sub.interests.indexOf(scholarshipsAid.key) !== -1,
        'Subscription should include Scholarships & Financial Aid interest'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 8 ----------
  // Reserve a spot in a free adult community singing workshop downtown next month
  testTask8_ReserveFreeAdultWorkshopDowntownNextMonth() {
    const testName = 'Task 8: Reserve free adult workshop downtown next month';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should load');

      const filterOptions = this.logic.getWorkshopFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.age_groups), 'Workshop age_groups should be available');
      this.assert(Array.isArray(filterOptions.fee_types), 'Workshop fee_types should be available');
      this.assert(Array.isArray(filterOptions.locations), 'Workshop locations should be available');
      this.assert(Array.isArray(filterOptions.month_options), 'Workshop month_options should be available');

      const adultAgeGroup = filterOptions.age_groups.find(g => g.key === 'adult_18_plus') || filterOptions.age_groups[0];
      this.assert(adultAgeGroup, 'Adult age group option should exist');

      const freeFeeType = filterOptions.fee_types.find(f => f.key === 'free') || filterOptions.fee_types[0];
      this.assert(freeFeeType, 'Free fee type should exist');

      const downtown = filterOptions.locations.find(l => l.name === 'Downtown Center') || filterOptions.locations[0];
      this.assert(downtown, 'Downtown location should exist');

      const now = new Date();
      const year = now.getUTCFullYear();
      let month = now.getUTCMonth() + 1;
      let nextMonth = month + 1;
      let nextMonthYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextMonthYear += 1;
      }

      const sortedMonths = filterOptions.month_options.slice().sort((a, b) => {
        if (a.year === b.year) return a.month - b.month;
        return a.year - b.year;
      });

      let targetMonthOption = sortedMonths.find(m => m.year === nextMonthYear && m.month === nextMonth);
      if (!targetMonthOption) {
        targetMonthOption = sortedMonths.find(m =>
          m.year > year || (m.year === year && m.month >= month)
        ) || sortedMonths[0];
      }

      const workshops = this.logic.listWorkshops(
        adultAgeGroup.key,
        freeFeeType.key,
        targetMonthOption.year,
        targetMonthOption.month,
        downtown.id,
        false
      );

      this.assert(Array.isArray(workshops) && workshops.length > 0, 'Filtered workshops should not be empty');

      workshops.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      const chosen = workshops[0];
      this.assert(chosen, 'A workshop should be chosen');

      const workshopDetails = this.logic.getWorkshopDetails(chosen.id);
      this.assert(workshopDetails && workshopDetails.workshop, 'Workshop details should be returned');
      this.assert(workshopDetails.workshop.id === chosen.id, 'Workshop details should match chosen');
      this.assert(
        typeof workshopDetails.remaining_capacity === 'number' && workshopDetails.remaining_capacity >= 0,
        'Workshop remaining capacity should be non-negative'
      );

      const regResult = this.logic.registerForWorkshop(
        chosen.id,
        'Adult',
        'Participant',
        'adult.participant@example.com',
        1
      );

      this.assert(regResult && regResult.success === true, 'Workshop registration should succeed');
      this.assert(regResult.registration, 'WorkshopRegistration object should be returned');

      const registration = regResult.registration;
      this.assert(registration.workshopId === chosen.id, 'Workshop registration should reference chosen workshop');
      this.assert(registration.quantity === 1, 'Workshop registration quantity should be 1');
      this.assert(registration.status === 'submitted', 'Workshop registration status should be submitted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
