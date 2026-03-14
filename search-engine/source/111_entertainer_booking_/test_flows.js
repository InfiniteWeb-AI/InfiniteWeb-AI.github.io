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
    // IMPORTANT: Use the Generated Data exactly as provided for initial storage
    const generatedData = {
      addon_options: [
        {
          id: 'addon_balloon_twisting_30',
          name: 'Balloon Twisting (30 minutes)',
          description: 'Colorful balloon animals and hats for kids right after the main magic show. Ideal for birthday parties and school events.',
          duration_minutes: 30,
          price: 60,
          event_types_applicable: [
            'kids_birthday',
            'school_show',
            'generic_event'
          ],
          can_be_repeated: true,
          is_active: true
        },
        {
          id: 'addon_magic_workshop_30',
          name: 'Magic Workshop (30 minutes)',
          description: 'Hands-on magic lesson where kids learn and keep 2\u20133 simple tricks. Best for ages 7\u201312 and small groups.',
          duration_minutes: 30,
          price: 120,
          event_types_applicable: [
            'kids_birthday',
            'school_show',
            'corporate_event'
          ],
          can_be_repeated: false,
          is_active: true
        },
        {
          id: 'addon_extra_15_minutes_show',
          name: 'Extra 15 Minutes of Magic',
          description: 'Extend your main magic show with an additional 15 minutes of tricks and audience participation.',
          duration_minutes: 15,
          price: 45,
          event_types_applicable: [
            'kids_birthday',
            'adult_birthday',
            'corporate_event',
            'school_show',
            'generic_event'
          ],
          can_be_repeated: false,
          is_active: true
        }
      ],
      base_show_options: [
        {
          id: 'base_kids_standard_45',
          name: 'Standard 45-minute magic show',
          description: 'A high-energy, family-friendly 45-minute magic show with comedy, audience participation, and a special spotlight trick for the guest of honor.',
          duration_minutes: 45,
          base_price: 260,
          event_type: 'kids_birthday',
          default_age_group: 'ages_7_10',
          is_active: true
        },
        {
          id: 'base_kids_ages5_7_35_no_animals',
          name: 'Ages 5\u20137 Interactive Magic (No Animals)',
          description: 'A 30\u201335 minute interactive magic show tailored for ages 5\u20137 with visual effects and no live animals, perfect for schools and younger birthdays.',
          duration_minutes: 35,
          base_price: 220,
          event_type: 'school_show',
          default_age_group: 'ages_5_7',
          is_active: true
        },
        {
          id: 'base_corporate_closeup_60',
          name: '1-hour Corporate Close-Up Magic',
          description: 'Strolling close-up magic for small groups, ideal for receptions, mixers, and cocktail hours at corporate events.',
          duration_minutes: 60,
          base_price: 320,
          event_type: 'corporate_event',
          default_age_group: 'adults',
          is_active: true
        }
      ],
      gift_card_options: [
        {
          id: 'gift_50',
          label: '$50',
          amount: 50,
          delivery_methods_supported: [
            'email',
            'print_at_home'
          ],
          is_default: false,
          is_active: true
        },
        {
          id: 'gift_100',
          label: '$100',
          amount: 100,
          delivery_methods_supported: [
            'email',
            'print_at_home',
            'postal_mail'
          ],
          is_default: true,
          is_active: true
        },
        {
          id: 'gift_150',
          label: '$150',
          amount: 150,
          delivery_methods_supported: [
            'email',
            'print_at_home'
          ],
          is_default: false,
          is_active: true
        }
      ],
      performers: [
        {
          id: 'perf_elias_reed_sf',
          name: 'Elias Reed - Close-Up Magic SF',
          slug: 'elias-reed-close-up-magic-sf',
          profile_description: 'Elias specializes in intimate, close-up magic with cards and everyday objects. Perfect for adult birthdays and upscale cocktail events around San Francisco.',
          profile_image_url: 'https://www.uptonbarn.com/wp-content/uploads/2018/12/Laura-and-Alex-wedding-300.jpg',
          base_location_city: 'San Francisco',
          base_location_state: 'CA',
          base_location_postal_code: '94103',
          base_location_country: 'US',
          service_radius_miles: 25,
          provides_sound_system: true,
          equipment_provided: [
            'sound_system',
            'microphone',
            'table',
            'music_player'
          ],
          performance_types: [
            'close_up_strolling'
          ],
          event_types_supported: [
            'adult_birthday',
            'corporate_event',
            'generic_event'
          ],
          min_price: 180,
          price_notes: 'Pricing starts at $180 for a 45-minute close-up set within San Francisco.',
          is_active: true,
          created_at: '2024-06-10T10:00:00Z',
          updated_at: '2026-02-15T09:30:00Z',
          rating_count: 61,
          rating_average: 4.6
        },
        {
          id: 'perf_bay_city_illusions',
          name: 'Bay City Illusions',
          slug: 'bay-city-illusions',
          profile_description: 'A full-service magic experience offering parlor, stage, and strolling performances for milestones and corporate functions across the Bay Area.',
          profile_image_url: 'https://edsumner.com/wp-content/uploads/2019/05/corporate-stage-magician-126-1024x682.jpg',
          base_location_city: 'San Francisco',
          base_location_state: 'CA',
          base_location_postal_code: '94110',
          base_location_country: 'US',
          service_radius_miles: 40,
          provides_sound_system: false,
          equipment_provided: [
            'microphone',
            'backdrop',
            'lighting',
            'table'
          ],
          performance_types: [
            'stage_show',
            'close_up_strolling'
          ],
          event_types_supported: [
            'kids_birthday',
            'adult_birthday',
            'corporate_event',
            'generic_event'
          ],
          min_price: 250,
          price_notes: 'Base package pricing for small private events starts at $250.',
          is_active: true,
          created_at: '2024-05-01T14:20:00Z',
          updated_at: '2026-01-25T11:05:00Z',
          rating_count: 48,
          rating_average: 4.3
        },
        {
          id: 'perf_seattle_stage_strolling',
          name: 'Seattle Stage & Strolling Magic',
          slug: 'seattle-stage-and-strolling-magic',
          profile_description: 'Dynamic corporate magic for conferences, offsites, and holiday parties with a mix of stage illusions and roaming close-up sets.',
          profile_image_url: 'https://www.aaroncalvert.com/wp-content/uploads/2018/04/Aaron-Calvert-hypnotises-girl-on-stage-in-mind-games.jpg',
          base_location_city: 'Seattle',
          base_location_state: 'WA',
          base_location_postal_code: '98101',
          base_location_country: 'US',
          service_radius_miles: 35,
          provides_sound_system: true,
          equipment_provided: [
            'sound_system',
            'microphone',
            'backdrop',
            'lighting'
          ],
          performance_types: [
            'stage_show',
            'close_up_strolling'
          ],
          event_types_supported: [
            'corporate_event',
            'generic_event'
          ],
          min_price: 375,
          price_notes: 'Corporate packages start at $375 for weekday events in downtown Seattle.',
          is_active: true,
          created_at: '2024-03-18T09:00:00Z',
          updated_at: '2026-02-20T08:15:00Z',
          rating_count: 56,
          rating_average: 4.4
        }
      ],
      promo_codes: [
        {
          id: 'promo_weekday20',
          code: 'WEEKDAY20',
          description: '20% off qualifying weekday (Mon\u2013Thu) corporate bookings for close-up or stage magic.',
          discount_type: 'percent',
          discount_value: 20,
          max_uses: 0,
          valid_from: '2025-01-01T00:00:00Z',
          valid_to: '2027-12-31T23:59:59Z',
          applicable_event_types: [
            'corporate_event'
          ],
          applicable_days_of_week: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday'
          ],
          min_booking_total: 0,
          is_active: true
        },
        {
          id: 'promo_kids10',
          code: 'KIDS10',
          description: 'Save $10 on kids birthday bookings on weekends.',
          discount_type: 'fixed_amount',
          discount_value: 10,
          max_uses: 0,
          valid_from: '2024-01-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          applicable_event_types: [
            'kids_birthday'
          ],
          applicable_days_of_week: [
            'friday',
            'saturday',
            'sunday'
          ],
          min_booking_total: 150,
          is_active: true
        },
        {
          id: 'promo_school15',
          code: 'SCHOOL15',
          description: '15% discount for weekday morning school shows.',
          discount_type: 'percent',
          discount_value: 15,
          max_uses: 0,
          valid_from: '2024-09-01T00:00:00Z',
          valid_to: '2027-06-30T23:59:59Z',
          applicable_event_types: [
            'school_show'
          ],
          applicable_days_of_week: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday'
          ],
          min_booking_total: 200,
          is_active: true
        }
      ],
      shows: [
        {
          id: 'show_mister_sparkle_45_kids_chi',
          performer_id: 'perf_mister_sparkle_chicago',
          title: 'Mister Sparkle 45-Minute Kids Birthday Show',
          short_description: 'High-energy, interactive 45-minute magic show for kids with music and comedy (no live animals).',
          full_description: 'Perfect for living rooms or party rooms, this 45-minute kids birthday show by Mister Sparkle is packed with colorful, interactive magic, age-appropriate comedy, and a special routine that makes the birthday child the star. The show is fully self-contained with sound system and backdrop, and it features visual, easy-to-follow magic with no live animals.\n\nIdeal for 5\u00120 children in a home or small venue setting. Mister Sparkle arrives 20\u00118 minutes early to set up and bring the party to life.',
          event_type: 'kids_birthday',
          default_search_category: 'kids_parties',
          primary_age_group: 'ages_7_10',
          age_groups: [
            'ages_5_7',
            'ages_7_10'
          ],
          includes_live_animals: false,
          is_interactive: true,
          primary_performance_type: 'stage_show',
          performance_types: [
            'stage_show'
          ],
          equipment_required: [
            '8x8 performance area',
            'access to a standard power outlet',
            'indoor or shaded performance space'
          ],
          equipment_provided: [
            'sound_system',
            'microphone',
            'backdrop',
            'table'
          ],
          rating_average: 4.8,
          rating_count: 124,
          starting_price: 195,
          duration_range_minutes_min: 45,
          duration_range_minutes_max: 45,
          suitable_for_guest_count_min: 5,
          suitable_for_guest_count_max: 30,
          images: [
            'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true,
          created_at: '2024-02-15T10:00:00Z',
          updated_at: '2026-02-22T13:10:00Z'
        },
        {
          id: 'show_windy_city_family_magic_balloons',
          performer_id: 'perf_windy_city_wonders',
          title: 'Windy City Family Magic & Balloons',
          short_description: 'Interactive family magic show with optional balloon twisting add-on for Chicago-area birthdays.',
          full_description: 'The Windy City Wonder Show brings a lively, interactive magic performance to your home or party venue. This 45\u001260 minute package combines visual magic, audience participation, and a fun finale that can feature the guest of honor.\n\nYou can optionally add balloon twisting for an extended experience. The show is designed for mixed family audiences and keeps kids engaged with interactive routines from start to finish.',
          event_type: 'kids_birthday',
          default_search_category: 'kids_parties',
          primary_age_group: 'all_ages',
          age_groups: [
            'ages_5_7',
            'ages_7_10',
            'all_ages'
          ],
          includes_live_animals: false,
          is_interactive: true,
          primary_performance_type: 'stage_show',
          performance_types: [
            'stage_show',
            'close_up_strolling'
          ],
          equipment_required: [
            '6x6 performance area',
            'access to a standard power outlet'
          ],
          equipment_provided: [
            'table',
            'music_player'
          ],
          rating_average: 4.7,
          rating_count: 89,
          starting_price: 210,
          duration_range_minutes_min: 45,
          duration_range_minutes_max: 60,
          suitable_for_guest_count_min: 5,
          suitable_for_guest_count_max: 35,
          images: [
            'https://images.unsplash.com/photo-1526421820093-2d82189fcd8e?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true,
          created_at: '2024-04-10T11:30:00Z',
          updated_at: '2026-01-30T10:20:00Z'
        },
        {
          id: 'show_chicago_deluxe_kids_magic_animals',
          performer_id: 'perf_windy_city_wonders',
          title: 'Chicago Deluxe Kids Magic with Doves',
          short_description: 'Deluxe kids magic show featuring interactive illusions and a brief live dove appearance.',
          full_description: 'This deluxe 50-minute kids magic show includes colorful stage illusions, interactive routines, and a short, carefully managed live dove segment for a big "wow" moment. Best suited for larger party rooms or small stages.\n\nBecause of the live animal component, this show is not recommended for very young or animal-sensitive audiences.',
          event_type: 'kids_birthday',
          default_search_category: 'kids_parties',
          primary_age_group: 'ages_7_10',
          age_groups: [
            'ages_5_7',
            'ages_7_10'
          ],
          includes_live_animals: true,
          is_interactive: true,
          primary_performance_type: 'stage_show',
          performance_types: [
            'stage_show'
          ],
          equipment_required: [
            '10x8 performance area',
            'nearby private space for animal crate',
            'access to a standard power outlet'
          ],
          equipment_provided: [
            'table',
            'music_player',
            'backdrop'
          ],
          rating_average: 4.2,
          rating_count: 37,
          starting_price: 255,
          duration_range_minutes_min: 50,
          duration_range_minutes_max: 50,
          suitable_for_guest_count_min: 10,
          suitable_for_guest_count_max: 40,
          images: [
            'https://images.unsplash.com/photo-1513152697235-fe74c283646a?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true,
          created_at: '2024-05-05T09:45:00Z',
          updated_at: '2026-01-05T09:10:00Z'
        }
      ],
      show_packages: [
        {
          id: 'pkg_mister_sparkle_45_standard',
          show_id: 'show_mister_sparkle_45_kids_chi',
          name: '45-minute package',
          description: 'Standard 45-minute Chicago kids birthday show including sound system and backdrop, ideal for up to 20 children.',
          duration_minutes: 45,
          base_price: 195,
          max_guests_included: 20,
          additional_guest_price: 5,
          available_days_of_week: [
            'friday',
            'saturday',
            'sunday'
          ],
          preferred_day_of_week: 'saturday',
          time_of_day_categories: [
            'afternoon',
            'morning'
          ],
          primary_time_of_day: 'afternoon',
          supports_custom_location: true,
          is_default: true,
          is_active: true,
          created_at: '2024-02-15T10:05:00Z',
          updated_at: '2026-02-22T13:10:00Z'
        },
        {
          id: 'pkg_mister_sparkle_60_deluxe',
          show_id: 'show_mister_sparkle_45_kids_chi',
          name: '60-minute deluxe package',
          description: 'Extended 60-minute show with extra routines and additional spotlight time for the birthday child.',
          duration_minutes: 60,
          base_price: 235,
          max_guests_included: 25,
          additional_guest_price: 6,
          available_days_of_week: [
            'friday',
            'saturday',
            'sunday'
          ],
          preferred_day_of_week: 'saturday',
          time_of_day_categories: [
            'afternoon',
            'evening'
          ],
          primary_time_of_day: 'evening',
          supports_custom_location: true,
          is_default: false,
          is_active: true,
          created_at: '2024-02-15T10:10:00Z',
          updated_at: '2026-02-22T13:10:00Z'
        },
        {
          id: 'pkg_windy_city_45_standard',
          show_id: 'show_windy_city_family_magic_balloons',
          name: '45-minute family show',
          description: 'Interactive 45-minute family magic show, perfect for mixed-age birthday parties and family events.',
          duration_minutes: 45,
          base_price: 210,
          max_guests_included: 25,
          additional_guest_price: 5,
          available_days_of_week: [
            'saturday',
            'sunday'
          ],
          preferred_day_of_week: 'saturday',
          time_of_day_categories: [
            'afternoon',
            'morning'
          ],
          primary_time_of_day: 'afternoon',
          supports_custom_location: true,
          is_default: true,
          is_active: true,
          created_at: '2024-04-10T11:35:00Z',
          updated_at: '2026-01-30T10:20:00Z'
        }
      ],
      bookings: [
        {
          id: 'booking_kids_chi_alex_20260411',
          booking_reference: 'KIDS-CH-AL-0411',
          show_id: 'show_mister_sparkle_45_kids_chi',
          show_package_id: 'pkg_mister_sparkle_45_standard',
          performer_id: 'perf_mister_sparkle_chicago',
          event_type: 'kids_birthday',
          booking_title: 'Kids Birthday Magic Show',
          event_start_datetime: '2026-04-11T14:00:00Z',
          event_end_datetime: '2026-04-11T14:45:00Z',
          duration_minutes: 45,
          guest_count: 15,
          location_address_line1: '123 Main St',
          location_address_line2: '',
          location_city: 'Chicago',
          location_state: 'IL',
          location_postal_code: '60601',
          location_country: 'US',
          contact_name: 'Alex Johnson',
          contact_phone: '555-123-4567',
          contact_email: 'alex@example.com',
          total_price_before_discounts: 195,
          discount_amount: 0,
          total_price_after_discounts: 195.0,
          promo_code_id: '',
          promo_code_code: '',
          status: 'in_progress',
          source: 'direct_package_booking',
          notes: 'Booking started from kids parties search for a Saturday in April; user is on payment step.',
          created_at: '2026-03-03T10:00:00Z',
          updated_at: '2026-03-03T10:05:00Z'
        },
        {
          id: 'booking_corp_lone_star_weekday20',
          booking_reference: 'CORP-AUS-LS-039',
          show_id: 'show_lone_star_1hr_closeup_weekday',
          show_package_id: 'pkg_lone_star_1hr_weekday_essentials',
          performer_id: 'perf_lone_star_corporate',
          event_type: 'corporate_event',
          booking_title: '1-Hour Weekday Corporate Close-Up',
          event_start_datetime: '2026-03-09T14:00:00Z',
          event_end_datetime: '2026-03-09T15:00:00Z',
          duration_minutes: 60,
          guest_count: 40,
          location_address_line1: '200 Congress Ave',
          location_address_line2: 'Suite 1500',
          location_city: 'Austin',
          location_state: 'TX',
          location_postal_code: '78701',
          location_country: 'US',
          contact_name: 'Pending Input',
          contact_phone: '',
          contact_email: '',
          total_price_before_discounts: 280,
          discount_amount: 56,
          total_price_after_discounts: 224.0,
          promo_code_id: 'promo_weekday20',
          promo_code_code: 'WEEKDAY20',
          status: 'in_progress',
          source: 'direct_package_booking',
          notes: 'Promo code WEEKDAY20 applied to Essentials 1-hour package after user switched from standard option.',
          created_at: '2026-03-03T11:00:00Z',
          updated_at: '2026-03-03T11:02:00Z'
        },
        {
          id: 'booking_kids_chi_pat_20260425',
          booking_reference: 'KIDS-CH-PAT-0425',
          show_id: 'show_mister_sparkle_45_kids_chi',
          show_package_id: 'pkg_mister_sparkle_45_standard',
          performer_id: 'perf_mister_sparkle_chicago',
          event_type: 'kids_birthday',
          booking_title: 'Kids Birthday Magic Show',
          event_start_datetime: '2026-04-25T16:00:00Z',
          event_end_datetime: '2026-04-25T16:45:00Z',
          duration_minutes: 45,
          guest_count: 18,
          location_address_line1: '456 Oak Ave',
          location_address_line2: '',
          location_city: 'Chicago',
          location_state: 'IL',
          location_postal_code: '60614',
          location_country: 'US',
          contact_name: 'Pat Smith',
          contact_phone: '555-222-3344',
          contact_email: 'pat@example.com',
          total_price_before_discounts: 215,
          discount_amount: 0,
          total_price_after_discounts: 215.0,
          promo_code_id: '',
          promo_code_code: '',
          status: 'confirmed',
          source: 'direct_package_booking',
          notes: 'Upcoming kids birthday magic show booked via logged-in account; eligible for one reschedule within 30 days of original date.',
          created_at: '2026-02-20T09:30:00Z',
          updated_at: '2026-02-20T09:35:00Z'
        }
      ],
      show_availabilities: [
        {
          id: 'avail_pkg_mister_45_2026_04_11',
          show_package_id: 'pkg_mister_sparkle_45_standard',
          event_date: '2026-04-11T00:00:00Z',
          available_start_times: [
            '13:00',
            '14:00',
            '15:30',
            '17:00'
          ],
          timezone: 'America/Chicago',
          created_at: '2026-02-28T09:00:00Z',
          updated_at: '2026-02-28T09:10:00Z'
        },
        {
          id: 'avail_pkg_mister_45_2026_04_25',
          show_package_id: 'pkg_mister_sparkle_45_standard',
          event_date: '2026-04-25T00:00:00Z',
          available_start_times: [
            '14:00',
            '16:00'
          ],
          timezone: 'America/Chicago',
          created_at: '2026-02-28T09:05:00Z',
          updated_at: '2026-02-28T09:10:00Z'
        },
        {
          id: 'avail_pkg_mister_45_2026_05_10',
          show_package_id: 'pkg_mister_sparkle_45_standard',
          event_date: '2026-05-10T00:00:00Z',
          available_start_times: [
            '14:00',
            '16:00'
          ],
          timezone: 'America/Chicago',
          created_at: '2026-02-28T09:15:00Z',
          updated_at: '2026-02-28T09:20:00Z'
        }
      ]
    };

    // Persist to localStorage with correct storage keys
    localStorage.setItem('addon_options', JSON.stringify(generatedData.addon_options));
    localStorage.setItem('base_show_options', JSON.stringify(generatedData.base_show_options));
    localStorage.setItem('gift_card_options', JSON.stringify(generatedData.gift_card_options));
    localStorage.setItem('performers', JSON.stringify(generatedData.performers));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('shows', JSON.stringify(generatedData.shows));
    localStorage.setItem('show_packages', JSON.stringify(generatedData.show_packages));
    localStorage.setItem('bookings', JSON.stringify(generatedData.bookings));
    localStorage.setItem('show_availabilities', JSON.stringify(generatedData.show_availabilities));

    // Ensure other collections exist as empty arrays if not already
    const emptyKeys = [
      'cart',
      'cart_items',
      'favorites',
      'favorite_items',
      'compare_lists',
      'performer_messages',
      'quote_requests',
      'custom_packages'
    ];
    emptyKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        if (key === 'cart') {
          // cart is a single object, but logic helper will likely manage it; keep null
          localStorage.setItem('cart', JSON.stringify(null));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookKidsShowUnder250();
    this.testTask2_AddBestValueCorporateShowToFavorites();
    this.testTask3_CreateCustomKidsPackageUnder400();
    this.testTask4_AddGiftCardToCart();
    this.testTask5_ContactLocalAdultBirthdayMagician();
    this.testTask6_RequestQuoteInteractiveNoAnimals();
    this.testTask7_WeekdayAfternoonCloseUpWithPromo();
    this.testTask8_RescheduleKidsBirthdayBooking();

    return this.results;
  }

  // Task 1: Book a 45-minute kids magic show in Chicago on a Saturday next month under $250
  testTask1_BookKidsShowUnder250() {
    const testName = 'Task 1: Book 45-minute kids show under $250';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home && Array.isArray(home.categories), 'Homepage content should include categories');

      const categoryKey = 'kids_parties';
      const filterOptions = this.logic.getSearchFilterOptions(categoryKey);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should load kids_parties filter options');

      // Use first available availability date for the 45-min Mister Sparkle package as the Saturday event date
      const availList = JSON.parse(localStorage.getItem('show_availabilities') || '[]');
      this.assert(Array.isArray(availList) && availList.length > 0, 'Should have show availability data');
      const anyAvailability = availList[0];
      const eventDate = anyAvailability.event_date.substring(0, 10); // YYYY-MM-DD

      const searchResult = this.logic.searchShowsAndPerformers(
        categoryKey,
        'Chicago, IL', // location_query
        null,          // postal_code
        null,          // radius_miles
        eventDate,     // event_date
        {
          max_price: 250,
          min_rating: 4.5,
          event_type: 'kids_birthday',
          guest_count: 15,
          day_of_week_value: 'saturday',
          time_of_day_value: 'afternoon'
        },
        'total_price_asc', // sort_key
        1,                 // page
        20                 // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Kids search should return results array');
      this.assert(searchResult.results.length > 0, 'Kids search should have at least one result');

      let suitableResult = searchResult.results.find((r) =>
        r.result_type === 'show' && r.show &&
        (typeof r.starting_price !== 'number' || r.starting_price <= 250) &&
        (typeof r.rating_average !== 'number' || r.rating_average >= 4.5)
      );
      if (!suitableResult) {
        suitableResult = searchResult.results.find((r) => r.result_type === 'show' && r.show);
      }
      this.assert(suitableResult && suitableResult.show, 'Should select at least one suitable kids show');

      const showId = suitableResult.show.id;
      const showDetails = this.logic.getShowDetails(showId);
      this.assert(showDetails && Array.isArray(showDetails.packages) && showDetails.packages.length > 0, 'Show details should include packages');

      const pkg45 = showDetails.packages.find((p) => p.duration_minutes >= 40 && p.duration_minutes <= 50) || showDetails.packages[0];
      this.assert(pkg45, 'Should find a 45-minute package or default package');
      const packageId = pkg45.id;

      // Use real availability for this package and date
      const pkgAvailability = this.logic.getPackageAvailability(packageId, eventDate);
      this.assert(pkgAvailability && (pkgAvailability.is_date_available !== false), 'Package availability should be retrievable');
      const times = pkgAvailability.available_start_times || [];
      this.assert(times.length > 0, 'There should be at least one available start time');

      const selectedTime = this._pickTimeBetween(times, '14:00', '17:00') || times[0];

      const bookingStart = this.logic.startPackageBooking(
        packageId,
        eventDate,
        selectedTime,
        15,
        {
          address_line1: '123 Main St',
          address_line2: '',
          city: 'Chicago',
          state: 'IL',
          postal_code: '60601',
          country: 'US'
        }
      );

      this.assert(bookingStart && bookingStart.booking, 'startPackageBooking should return a booking');
      const booking = bookingStart.booking;
      const bookingId = booking.id;
      this.assert(bookingId, 'Booking should have an id');

      const updated = this.logic.updateBookingContactAndEventDetails(
        bookingId,
        {
          name: 'Alex Johnson',
          phone: '555-123-4567',
          email: 'alex@example.com'
        },
        {
          address_line1: '123 Main St',
          address_line2: '',
          city: 'Chicago',
          state: 'IL',
          postal_code: '60601',
          country: 'US'
        },
        'Automated test booking for Task 1'
      );

      this.assert(updated && updated.booking, 'Booking should be updated with contact and location');

      const summary = this.logic.getBookingSummary(bookingId);
      this.assert(summary && summary.pricing_breakdown, 'Booking summary should include pricing breakdown');

      const totalAfter = summary.pricing_breakdown.total_after_discounts;
      this.assert(typeof totalAfter === 'number', 'Total after discounts should be a number');
      this.assert(totalAfter > 0, 'Total price should be positive');
      // Budget check based on user constraint
      this.assert(totalAfter <= 250, 'Total price should be at or under 250, actual: ' + totalAfter);

      const maxIncluded = summary.show_package && summary.show_package.max_guests_included;
      if (typeof maxIncluded === 'number' && maxIncluded >= 15) {
        this.assert(
          summary.pricing_breakdown.additional_guest_fees === 0,
          'Additional guest fees should be 0 when guest count <= max included'
        );
      }

      const paymentSession = this.logic.finalizeBookingAndCreatePaymentSession(bookingId);
      this.assert(paymentSession && typeof paymentSession.success === 'boolean', 'Payment session creation should return success flag');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add the best-value 2-hour corporate magic show under $800 to favorites
  testTask2_AddBestValueCorporateShowToFavorites() {
    const testName = 'Task 2: Add best-value 2-hour corporate show to favorites';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home && Array.isArray(home.categories), 'Homepage should load for corporate flow');

      const categoryKey = 'corporate_events';
      const filterOptions = this.logic.getSearchFilterOptions(categoryKey);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Corporate filter options should load');

      const eventDate = this._getNthWeekdayOfNextMonth(4, 3); // 3rd Thursday next month

      const searchResult = this.logic.searchShowsAndPerformers(
        categoryKey,
        'Seattle, WA',
        null,
        null,
        eventDate,
        {
          event_type: 'corporate_event',
          performance_types: ['stage_show', 'close_up_strolling'],
          min_duration_minutes: 120,
          max_duration_minutes: 120
        },
        'rating_desc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Corporate search should return results array');

      const performerResults = searchResult.results.filter((r) => r.result_type === 'performer' && r.performer);
      this.assert(performerResults.length >= 2, 'Need at least two performers to compare');

      const firstPerfId = performerResults[0].performer.id;
      const secondPerfId = performerResults[1].performer.id;

      this.logic.addPerformerToCompareList(firstPerfId);
      this.logic.addPerformerToCompareList(secondPerfId);

      const compareData = this.logic.getCompareList('performer');
      this.assert(compareData && Array.isArray(compareData.items), 'Compare list should return items');
      this.assert(compareData.items.length >= 2, 'Compare list should contain at least two performers');

      let candidates = compareData.items.filter((item) => {
        const price = item.best_two_hour_corporate_package_price;
        const rating = item.rating_average;
        return typeof price === 'number' && price > 0 && price < 800 && typeof rating === 'number' && rating >= 4.0;
      });

      if (candidates.length === 0) {
        candidates = compareData.items;
      }

      let bestItem = null;
      candidates.forEach((item) => {
        if (!bestItem) {
          bestItem = item;
          return;
        }
        const currentPrice = typeof item.best_two_hour_corporate_package_price === 'number' ? item.best_two_hour_corporate_package_price : Infinity;
        const bestPrice = typeof bestItem.best_two_hour_corporate_package_price === 'number' ? bestItem.best_two_hour_corporate_package_price : Infinity;
        if (currentPrice < bestPrice) {
          bestItem = item;
        }
      });

      this.assert(bestItem && bestItem.performer, 'Should select a best-value performer');
      const bestPerformerId = bestItem.performer.id;

      const performerDetails = this.logic.getPerformerDetails(bestPerformerId);
      this.assert(performerDetails && performerDetails.performer, 'Performer details should load');

      const favResult = this.logic.addPerformerToFavorites(bestPerformerId);
      this.assert(favResult && favResult.favorites_list && favResult.favorite_item, 'Should add performer to favorites');

      const favorites = this.logic.getFavoritesList();
      this.assert(favorites && Array.isArray(favorites.items), 'Favorites list should return items');
      const foundFavorite = favorites.items.find((entry) => entry.performer && entry.performer.id === bestPerformerId);
      this.assert(foundFavorite, 'Selected best-value performer should be in favorites list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a custom kids magic package with add-ons while keeping total <= $400
  testTask3_CreateCustomKidsPackageUnder400() {
    const testName = 'Task 3: Create custom kids package under $400';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home && Array.isArray(home.shortcuts), 'Homepage shortcuts should load for builder navigation');

      const builderData = this.logic.getPackageBuilderInitialData();
      this.assert(builderData && Array.isArray(builderData.base_show_options), 'Builder initial data should include base show options');
      this.assert(Array.isArray(builderData.add_on_options), 'Builder initial data should include add-on options');

      const baseShow = builderData.base_show_options.find((b) => b.name === 'Standard 45-minute magic show');
      this.assert(baseShow, 'Should find Standard 45-minute magic show base option');

      const balloonAddon = builderData.add_on_options.find((a) => a.name === 'Balloon Twisting (30 minutes)');
      const workshopAddon = builderData.add_on_options.find((a) => a.name === 'Magic Workshop (30 minutes)');
      this.assert(balloonAddon, 'Should find Balloon Twisting add-on');
      this.assert(workshopAddon, 'Should find Magic Workshop add-on');

      const eventDate = this._getFirstWeekdayOfNextMonth(0); // first Sunday next month

      const location = {
        city: 'Austin',
        state: 'TX',
        postal_code: '78701'
      };

      const createResult1 = this.logic.createOrUpdateCustomPackage(
        null,
        'kids_birthday',
        'ages_7_10',
        eventDate,
        location,
        baseShow.id,
        [balloonAddon.id, workshopAddon.id],
        20
      );

      this.assert(createResult1 && createResult1.custom_package, 'First custom package draft should be created');
      this.assert(createResult1.pricing_breakdown && typeof createResult1.pricing_breakdown.total_price === 'number', 'Pricing breakdown should be returned');

      let customPackage = createResult1.custom_package;
      let pricing = createResult1.pricing_breakdown;

      if (pricing.total_price > 400) {
        const createResult2 = this.logic.createOrUpdateCustomPackage(
          customPackage.id,
          'kids_birthday',
          'ages_7_10',
          eventDate,
          location,
          baseShow.id,
          [balloonAddon.id],
          20
        );
        this.assert(createResult2 && createResult2.custom_package, 'Updated custom package should be created when removing workshop');
        customPackage = createResult2.custom_package;
        pricing = createResult2.pricing_breakdown;
      }

      this.assert(pricing.total_price <= 400, 'Final custom package total should be at or under $400, actual: ' + pricing.total_price);

      const review = this.logic.getCustomPackageReview(customPackage.id);
      this.assert(review && review.custom_package && review.pricing_breakdown, 'Custom package review should load');
      this.assert(review.custom_package.id === customPackage.id, 'Review should reference the same custom package');

      const namedResult = this.logic.setCustomPackageNameAndRequest(
        customPackage.id,
        'Sophia\'s 9th Birthday Package'
      );
      this.assert(namedResult && namedResult.success === true, 'Custom package request should succeed');
      this.assert(namedResult.custom_package && namedResult.custom_package.custom_name === 'Sophia\'s 9th Birthday Package', 'Custom package should store the given name');
      this.assert(namedResult.custom_package.status === 'requested', 'Custom package status should be updated to requested');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Add a $150 email-delivered magic show gift card to the cart
  testTask4_AddGiftCardToCart() {
    const testName = 'Task 4: Add $150 email gift card to cart';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home && Array.isArray(home.categories), 'Homepage should load for gift cards');

      const giftOptionsData = this.logic.getGiftCardOptions();
      this.assert(giftOptionsData && Array.isArray(giftOptionsData.gift_card_options), 'Gift card options should load');

      const option150 = giftOptionsData.gift_card_options.find((opt) => opt.amount === 150);
      this.assert(option150, 'Should find $150 gift card option');
      this.assert(
        Array.isArray(option150.delivery_methods_supported) && option150.delivery_methods_supported.indexOf('email') !== -1,
        'Gift card option should support email delivery'
      );

      const now = new Date();
      const deliveryDateObj = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const deliveryDate = this._formatDate(deliveryDateObj);

      const configResult = this.logic.configureGiftCardAndAddToCart(
        option150.id,
        null,
        'email',
        {
          name: 'Jordan Lee',
          email: 'jordan@example.com'
        },
        {
          name: 'Taylor Smith',
          email: 'taylor@example.com'
        },
        'Happy Birthday! Enjoy a magic show on us.',
        deliveryDate
      );

      this.assert(configResult && configResult.success === true, 'configureGiftCardAndAddToCart should succeed');
      this.assert(configResult.cart && Array.isArray(configResult.cart_items), 'Cart and cart items should be returned');

      const addedItem = configResult.cart_items.find((item) => item.item_type === 'gift_card');
      this.assert(addedItem, 'There should be a gift_card item in the cart');
      this.assert(addedItem.gift_card_option_id === option150.id, 'Gift card item should reference the correct option id');
      this.assert(addedItem.gift_card_amount === option150.amount, 'Gift card amount should match option amount');
      this.assert(addedItem.gift_card_delivery_method === 'email', 'Gift card delivery method should be email');

      const cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'getCart should return a cart');
      this.assert(Array.isArray(cartData.items) && cartData.items.length > 0, 'Cart should contain items after adding gift card');

      const cartItemAgain = cartData.items.find((item) => item.id === addedItem.id);
      this.assert(cartItemAgain, 'Gift card item should be retrievable from cart by id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find a local adult birthday magician with their own sound system and send an availability message
  testTask5_ContactLocalAdultBirthdayMagician() {
    const testName = 'Task 5: Contact local adult birthday magician with sound system';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home, 'Homepage should be accessible');

      const categoryKey = 'all_performers';
      const filterOptions = this.logic.getSearchFilterOptions(categoryKey);
      this.assert(filterOptions && typeof filterOptions === 'object', 'All performers filter options should load');

      const searchResult = this.logic.searchShowsAndPerformers(
        categoryKey,
        null,
        '94103',
        10,
        null,
        {
          event_type: 'adult_birthday',
          equipment_values: ['sound_system']
        },
        'total_price_asc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Performer search should return results array');

      const cheapestPerformerResult = searchResult.results.find((r) => r.result_type === 'performer' && r.performer);
      this.assert(cheapestPerformerResult && cheapestPerformerResult.performer, 'Should find at least one performer result');

      const performerId = cheapestPerformerResult.performer.id;
      const performerDetails = this.logic.getPerformerDetails(performerId);
      this.assert(performerDetails && performerDetails.performer, 'Performer details should load');

      if (typeof performerDetails.supports_sound_system === 'boolean') {
        this.assert(performerDetails.supports_sound_system === true, 'Selected performer should provide sound system when filter applied');
      }

      const now = new Date();
      const year = now.getMonth() <= 7 ? now.getFullYear() : now.getFullYear() + 1; // August index 7
      const eventDateObj = new Date(year, 7, 20);
      const eventDate = this._formatDate(eventDateObj);

      const messageResult = this.logic.sendPerformerContactMessage(
        performerId,
        'Chris Patel',
        'chris@example.com',
        'adult_birthday',
        eventDate,
        'Hi! Are you available on this date, and can you include a short card-trick lesson during the party?'
      );

      this.assert(messageResult && messageResult.message, 'sendPerformerContactMessage should return a message record');
      const msg = messageResult.message;
      this.assert(msg.performer_id === performerId, 'Message should be linked to the correct performer');
      this.assert(msg.sender_email === 'chris@example.com', 'Message should store the sender email');
      this.assert(msg.status === 'new', 'New performer message status should be new');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Request a quote for an interactive, no-animals magic show for ages 5-7
  testTask6_RequestQuoteInteractiveNoAnimals() {
    const testName = 'Task 6: Request quote for interactive no-animals show ages 5-7';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home, 'Homepage should be accessible for browse shows');

      const categoryKey = 'browse_shows';
      const filterOptions = this.logic.getSearchFilterOptions(categoryKey);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Browse shows filter options should load');

      const now = new Date();
      const preferredDateObj = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
      const preferredDate = this._formatDate(preferredDateObj);

      const searchResult = this.logic.searchShowsAndPerformers(
        categoryKey,
        null,
        null,
        null,
        preferredDate,
        {
          age_group: 'ages_5_7',
          requires_no_live_animals: true,
          min_duration_minutes: 30,
          max_duration_minutes: 45,
          event_type: 'kids_birthday'
        },
        'rating_desc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Browse shows search should return results array');

      let interactiveResult = searchResult.results.find((r) => {
        if (r.result_type !== 'show' || !r.show) return false;
        const s = r.show;
        const noAnimalsOk = (typeof s.includes_live_animals !== 'boolean') || s.includes_live_animals === false;
        const durationOk = (
          typeof s.duration_range_minutes_min !== 'number' || s.duration_range_minutes_min <= 45
        ) && (
          typeof s.duration_range_minutes_max !== 'number' || s.duration_range_minutes_max >= 30
        );
        const interactiveFlag = s.is_interactive === true;
        const text = (s.short_description || '') + ' ' + (s.full_description || '');
        const interactiveText = /interactive/i.test(text);
        return noAnimalsOk && durationOk && (interactiveFlag || interactiveText);
      });

      if (!interactiveResult) {
        interactiveResult = searchResult.results.find((r) => r.result_type === 'show' && r.show);
      }

      this.assert(interactiveResult && interactiveResult.show, 'Should find at least one show for quote request');

      const showId = interactiveResult.show.id;
      const showDetails = this.logic.getShowDetails(showId);
      this.assert(showDetails && showDetails.show, 'Show details should load for quote');

      if (typeof showDetails.show.includes_live_animals === 'boolean') {
        this.assert(showDetails.show.includes_live_animals === false, 'Selected show should not include live animals when filtered that way');
      }
      if (typeof showDetails.show.is_interactive === 'boolean') {
        this.assert(showDetails.show.is_interactive === true, 'Selected show should be interactive when possible');
      }

      const quoteResult = this.logic.submitQuoteRequest(
        showId,
        'school_show',
        25,
        preferredDate,
        '10:00 AM',
        'Test School',
        'school@example.com',
        'Automated quote request for interactive no-animals show.'
      );

      this.assert(quoteResult && quoteResult.quote_request, 'submitQuoteRequest should return a quote_request');
      const qr = quoteResult.quote_request;
      this.assert(qr.show_id === showId, 'Quote request should reference the selected show');
      this.assert(qr.number_of_children === 25, 'Quote request should store number of children');
      this.assert(qr.preferred_start_time === '10:00 AM', 'Quote request preferred time should be 10:00 AM');
      this.assert(qr.status === 'submitted', 'New quote request status should be submitted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Start booking a 1-hour weekday afternoon close-up magic show using promo code WEEKDAY20
  testTask7_WeekdayAfternoonCloseUpWithPromo() {
    const testName = 'Task 7: Weekday afternoon 1-hour close-up with promo WEEKDAY20';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomepageContent();
      this.assert(home, 'Homepage should load for corporate weekday flow');

      const categoryKey = 'corporate_events';
      const filterOptions = this.logic.getSearchFilterOptions(categoryKey);
      this.assert(filterOptions && typeof filterOptions === 'object', 'Corporate filter options should load');

      let weekdayRangeValue = 'monday_thursday';
      if (Array.isArray(filterOptions.day_of_week_options)) {
        const option = filterOptions.day_of_week_options.find((opt) =>
          (opt.value && opt.value === 'monday_thursday') ||
          (opt.label && /mon/i.test(opt.label) && /thu/i.test(opt.label))
        );
        if (option) {
          weekdayRangeValue = option.value;
        }
      }

      let afternoonValue = 'afternoon';
      if (Array.isArray(filterOptions.time_of_day_options)) {
        const option = filterOptions.time_of_day_options.find((opt) => opt.value === 'afternoon' || (opt.label && /afternoon/i.test(opt.label)));
        if (option) {
          afternoonValue = option.value;
        }
      }

      const eventDateObj = this._getNextWeekdayDateObject([1, 2, 3, 4]); // Monday-Thursday
      const eventDate = this._formatDate(eventDateObj);

      const searchResult = this.logic.searchShowsAndPerformers(
        categoryKey,
        null,
        null,
        null,
        eventDate,
        {
          event_type: 'corporate_event',
          performance_types: ['close_up_strolling'],
          day_of_week_value: weekdayRangeValue,
          time_of_day_value: afternoonValue
        },
        'total_price_asc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Corporate weekday search should return results array');

      const showResult = searchResult.results.find((r) => r.result_type === 'show' && r.show);
      this.assert(showResult && showResult.show, 'Should find at least one show for corporate weekday booking');

      const showId = showResult.show.id;
      const showDetails = this.logic.getShowDetails(showId);
      this.assert(showDetails && Array.isArray(showDetails.packages) && showDetails.packages.length > 0, 'Corporate show details should include packages');

      const oneHourPackage = showDetails.packages.find((p) => p.duration_minutes >= 55 && p.duration_minutes <= 65) || showDetails.packages[0];
      this.assert(oneHourPackage, 'Should select a 1-hour (approx) package for booking');
      const packageId = oneHourPackage.id;

      let selectedTime = '14:00';
      const availability = this.logic.getPackageAvailability(packageId, eventDate);
      if (availability && Array.isArray(availability.available_start_times) && availability.available_start_times.length > 0) {
        selectedTime = this._pickTimeBetween(availability.available_start_times, '12:00', '17:00') || availability.available_start_times[0];
      }

      const bookingStart = this.logic.startPackageBooking(
        packageId,
        eventDate,
        selectedTime,
        40,
        null
      );

      this.assert(bookingStart && bookingStart.booking, 'startPackageBooking should create corporate weekday booking');
      const booking = bookingStart.booking;
      const bookingId = booking.id;
      this.assert(bookingId, 'Corporate booking should have an id');

      const promoResult = this.logic.applyPromoCodeToBooking(bookingId, 'WEEKDAY20');
      this.assert(promoResult && typeof promoResult.success === 'boolean', 'applyPromoCodeToBooking should return success flag');
      this.assert(promoResult.success === true, 'Promo code WEEKDAY20 should apply successfully for qualifying weekday corporate booking');

      const promoBooking = promoResult.booking;
      this.assert(promoBooking && promoBooking.promo_code_code === 'WEEKDAY20', 'Booking should store applied promo code');

      const discountAmount = promoResult.pricing_breakdown && promoResult.pricing_breakdown.discount_amount;
      this.assert(typeof discountAmount === 'number' && discountAmount > 0, 'Discount amount should be positive after applying WEEKDAY20');

      const totalAfterPromo = promoResult.pricing_breakdown.total_after_discounts;
      this.assert(typeof totalAfterPromo === 'number' && totalAfterPromo > 0, 'Total after discounts should be positive after promo');

      let cheaperSuggestion = null;
      if (Array.isArray(promoResult.suggested_packages)) {
        promoResult.suggested_packages.forEach((s) => {
          const price = s.total_price_after_discounts;
          if (typeof price !== 'number') return;
          if (price >= totalAfterPromo) return;
          if (price >= 300) return; // only suggestions under $300 after discount
          if (!cheaperSuggestion || price < cheaperSuggestion.total_price_after_discounts) {
            cheaperSuggestion = s;
          }
        });
      }

      if (cheaperSuggestion && cheaperSuggestion.show_package && cheaperSuggestion.show_package.id) {
        const switched = this.logic.switchBookingPackage(bookingId, cheaperSuggestion.show_package.id);
        this.assert(switched && switched.booking, 'switchBookingPackage should return updated booking');
        const switchedTotal = switched.pricing_breakdown && switched.pricing_breakdown.total_after_discounts;
        this.assert(
          typeof switchedTotal === 'number' && switchedTotal === cheaperSuggestion.total_price_after_discounts,
          'Switched booking total should match suggested cheaper package total'
        );
      }

      const updated = this.logic.updateBookingContactAndEventDetails(
        bookingId,
        {
          name: 'Weekday Corporate Tester',
          phone: '555-000-0000',
          email: 'weekday@example.com'
        },
        {
          address_line1: '200 Congress Ave',
          address_line2: 'Suite 1500',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701',
          country: 'US'
        },
        'Automated test - Task 7 corporate weekday booking with WEEKDAY20.'
      );

      this.assert(updated && updated.booking, 'Booking should be updated with corporate contact details');

      const paymentSession = this.logic.finalizeBookingAndCreatePaymentSession(bookingId);
      this.assert(paymentSession && typeof paymentSession.success === 'boolean', 'Payment session should be created');
      this.assert(paymentSession.success === true, 'Payment session should indicate success for proceeding to checkout');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Reschedule an existing kids birthday magic show booking to a Sunday within 30 days
  testTask8_RescheduleKidsBirthdayBooking() {
    const testName = 'Task 8: Reschedule kids birthday booking to a Sunday within 30 days';
    console.log('Testing:', testName);

    try {
      const loginResult = this.logic.loginWithEmailPassword('pat@example.com', 'Magic123!');
      this.assert(loginResult && typeof loginResult.success === 'boolean', 'loginWithEmailPassword should return success flag');
      this.assert(loginResult.success === true, 'Login should succeed for pat@example.com');

      const myBookings = this.logic.getMyBookings();
      this.assert(myBookings && Array.isArray(myBookings.upcoming_bookings), 'getMyBookings should return upcoming bookings array');

      const targetBooking = myBookings.upcoming_bookings.find((b) =>
        (b.event_type === 'kids_birthday') ||
        (typeof b.booking_title === 'string' && /kids birthday magic show/i.test(b.booking_title))
      );

      this.assert(targetBooking, 'Should find an upcoming kids birthday booking to reschedule');

      const bookingDetails = this.logic.getBookingDetails(targetBooking.id);
      this.assert(bookingDetails && bookingDetails.booking, 'getBookingDetails should return booking');
      this.assert(bookingDetails.can_reschedule === true, 'Booking should be reschedulable');

      const originalStart = new Date(bookingDetails.booking.event_start_datetime);
      const originalDateStr = this._formatDate(originalStart);

      const constraints = bookingDetails.reschedule_constraints || {};
      const allowedDays = Array.isArray(constraints.allowed_days_of_week) && constraints.allowed_days_of_week.length > 0
        ? constraints.allowed_days_of_week
        : ['sunday'];

      const minNewDate = constraints.min_new_date || originalDateStr;
      const maxNewDate = constraints.max_new_date || this._formatDate(new Date(originalStart.getTime() + 30 * 24 * 60 * 60 * 1000));

      let newDateStr = null;
      const maxDays = 30;
      for (let i = 1; i <= maxDays; i += 1) {
        const candidate = new Date(originalStart.getTime() + i * 24 * 60 * 60 * 1000);
        const candidateStr = this._formatDate(candidate);
        const dayName = this._dayOfWeekToString(candidate.getDay());
        if (candidateStr < minNewDate || candidateStr > maxNewDate) {
          continue;
        }
        if (allowedDays.indexOf(dayName) === -1) {
          continue;
        }
        if (dayName === 'sunday') {
          newDateStr = candidateStr;
          break;
        }
      }

      if (!newDateStr) {
        // Fallback: pick first allowed Sunday after original date within 30 days ignoring constraints
        for (let i = 1; i <= maxDays && !newDateStr; i += 1) {
          const candidate = new Date(originalStart.getTime() + i * 24 * 60 * 60 * 1000);
          if (candidate.getDay() === 0) {
            newDateStr = this._formatDate(candidate);
          }
        }
      }

      this.assert(newDateStr, 'Should compute a new Sunday date within 30 days');

      const rescheduleResult = this.logic.rescheduleBooking(bookingDetails.booking.id, newDateStr);
      this.assert(rescheduleResult && typeof rescheduleResult.success === 'boolean', 'rescheduleBooking should return success flag');
      this.assert(rescheduleResult.success === true, 'Reschedule operation should succeed');

      const updatedBooking = rescheduleResult.booking;
      this.assert(updatedBooking && updatedBooking.id === bookingDetails.booking.id, 'Rescheduled booking should keep same id');

      const newStart = new Date(updatedBooking.event_start_datetime);
      const newDateConfirmed = this._formatDate(newStart);
      this.assert(newDateConfirmed === newDateStr, 'Booking event date should match requested new date');

      this.assert(newStart.getHours() === originalStart.getHours() && newStart.getMinutes() === originalStart.getMinutes(), 'Rescheduled booking should keep the same start time');

      const dayNameNew = this._dayOfWeekToString(newStart.getDay());
      this.assert(dayNameNew === 'sunday', 'New booking date should fall on a Sunday');

      const diffMs = newStart.getTime() - originalStart.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      this.assert(diffDays > 0 && diffDays <= 30.5, 'New date should be within 30 days of the original date');

      const updatedDetails = this.logic.getBookingDetails(updatedBooking.id);
      this.assert(updatedDetails && updatedDetails.booking, 'Should be able to fetch updated booking details after reschedule');
      if (updatedDetails.itinerary_download_available === true) {
        // This simulates clicking View Updated Details / Download Itinerary
        this.assert(true, 'Itinerary download is available after reschedule');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: assertion
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

  // Helper: format Date -> YYYY-MM-DD
  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Helper: get first given weekday (0=Sunday) of next month
  _getFirstWeekdayOfNextMonth(weekday) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const date = new Date(year, month, 1);
    while (date.getDay() !== weekday) {
      date.setDate(date.getDate() + 1);
    }
    return this._formatDate(date);
  }

  // Helper: get Nth weekday of next month (weekday 0=Sunday)
  _getNthWeekdayOfNextMonth(weekday, n) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const date = new Date(year, month, 1);
    let count = 0;
    while (true) {
      if (date.getDay() === weekday) {
        count += 1;
        if (count === n) {
          break;
        }
      }
      date.setDate(date.getDate() + 1);
    }
    return this._formatDate(date);
  }

  // Helper: get next date object where dayOfWeek is in allowedDays (array of JS day numbers)
  _getNextWeekdayDateObject(allowedDays) {
    const now = new Date();
    for (let i = 1; i <= 30; i += 1) {
      const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      if (allowedDays.indexOf(candidate.getDay()) !== -1) {
        return candidate;
      }
    }
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  // Helper: convert time string to minutes since midnight
  _timeStringToMinutes(timeStr) {
    if (!timeStr) return null;
    const s = String(timeStr).trim();
    const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const hmMatch = s.match(/^(\d{1,2}):(\d{2})$/);
    if (hmMatch) {
      const hours = parseInt(hmMatch[1], 10);
      const minutes = parseInt(hmMatch[2], 10);
      return hours * 60 + minutes;
    }
    return null;
  }

  // Helper: pick earliest time within [start, end] (inclusive), times array of strings
  _pickTimeBetween(times, startStr, endStr) {
    const startMin = this._timeStringToMinutes(startStr);
    const endMin = this._timeStringToMinutes(endStr);
    if (startMin == null || endMin == null) return null;
    let chosen = null;
    let chosenVal = Infinity;
    times.forEach((t) => {
      const val = this._timeStringToMinutes(t);
      if (val == null) return;
      if (val >= startMin && val <= endMin && val < chosenVal) {
        chosen = t;
        chosenVal = val;
      }
    });
    return chosen;
  }

  // Helper: map JS day index to string
  _dayOfWeekToString(dayIndex) {
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex] || '';
  }
}

module.exports = TestRunner;
