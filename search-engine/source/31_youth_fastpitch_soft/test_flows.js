// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure if business logic provides it
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided, then extend where needed
    const generatedData = {
      divisions: [
        {
          id: 'div_8u',
          code: '8u',
          name: '8U Division',
          min_age: 7,
          max_age: 8,
          description: 'Entry-level division for players ages 7-8 focused on fundamentals, coach pitch, and fun introductions to fastpitch softball.'
        },
        {
          id: 'div_10u',
          code: '10u',
          name: '10U Division',
          min_age: 9,
          max_age: 10,
          description: 'Recreational and beginner-friendly play for ages 9-10 with live pitching introduced and continued focus on fundamentals.'
        },
        {
          id: 'div_12u',
          code: '12u',
          name: '12U Division',
          min_age: 11,
          max_age: 12,
          description: 'Competitive play for ages 11-12 with full fastpitch rules, advanced skills development, and division-specific equipment regulations.'
        }
      ],
      fields: [
        {
          id: 'field_1',
          name: 'Field 1',
          location: 'North Complex, 100 League Way, Springfield',
          has_lights: true,
          notes: 'Regulation fastpitch field with bleachers on the first-base side. Commonly used for 12U and 14U evening games.'
        },
        {
          id: 'field_2',
          name: 'Field 2',
          location: 'North Complex, 100 League Way, Springfield',
          has_lights: true,
          notes: 'Primary lighted field adjacent to the main concession stand. Preferred for night games and evening volunteer shifts.'
        },
        {
          id: 'field_3',
          name: 'Field 3',
          location: 'South Complex, 255 Softball Drive, Springfield',
          has_lights: false,
          notes: 'Daytime practice field without lights. Often used for younger divisions and clinics.'
        }
      ],
      guardian_contacts: [
        {
          id: 'gc_alex_miller',
          name: 'Alex Miller',
          phone: '555-123-4567',
          email: 'alex.miller@example.com',
          preferred_contact_method: 'email'
        },
        {
          id: 'gc_taylor_smith',
          name: 'Taylor Smith',
          phone: '555-987-6543',
          email: 'taylor.smith@example.com',
          preferred_contact_method: 'text'
        },
        {
          id: 'gc_riley_parent',
          name: 'Jordan Riley',
          phone: '555-444-8899',
          email: 'riley.parent@example.com',
          preferred_contact_method: 'email'
        }
      ],
      product_categories: [
        {
          id: 'cat_apparel',
          category_key: 'apparel',
          name: 'Apparel',
          description: 'Youth and adult shirts, jerseys, hoodies, and other league-branded clothing.',
          sort_order: 1,
          image: 'https://www.spalding.com/dw/image/v2/ABAH_PRD/on/demandware.static/-/Sites-masterCatalog_SPALDING/default/dw7f46fb95/images/hi-res/Spalding-Digital-Assets_12387.jpg?sw=555&sh=689&sm=cut&sfrm=png'
        },
        {
          id: 'cat_hats',
          category_key: 'hats',
          name: 'Hats & Caps',
          description: 'Adjustable and fitted caps for players, coaches, and fans.',
          sort_order: 2,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'cat_accessories',
          category_key: 'accessories',
          name: 'Accessories',
          description: 'Water bottles, bags, stickers, and other softball accessories.',
          sort_order: 3,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/b1533c5f-4d85-5ed9-a9ed-5711d92d2fc2.jpeg'
        }
      ],
      seasons: [
        {
          id: 'spring_2026',
          name: 'Spring 2026 Season',
          year: 2026,
          season_type: 'spring',
          start_date: '2026-03-20T00:00:00Z',
          end_date: '2026-06-15T23:59:59Z',
          is_active: true
        },
        {
          id: 'summer_2026',
          name: 'Summer 2026 Season',
          year: 2026,
          season_type: 'summer',
          start_date: '2026-06-16T00:00:00Z',
          end_date: '2026-08:31T23:59:59Z',
          is_active: true
        },
        {
          id: 'fall_2026',
          name: 'Fall 2026 Season',
          year: 2026,
          season_type: 'fall',
          start_date: '2026-09-01T00:00:00Z',
          end_date: '2026-11-15T23:59:59Z',
          is_active: false
        }
      ],
      clinics: [
        {
          id: 'clinic_july26_pitching_power_12u',
          name: 'July 2026 12U Pitching Power Clinic',
          skill_focus: 'pitching',
          division_id: 'div_12u',
          start_date: '2026-07-08T17:00:00Z',
          end_date: '2026-07-11T20:00:00Z',
          price: 115,
          total_training_hours: 10,
          location_field_id: 'field_2',
          description: 'Four-evening 12U pitching clinic focused on mechanics, accuracy, and strength. Sessions run from 5:00-7:30 PM at Field 2 under the lights.'
        },
        {
          id: 'clinic_july26_pitching_fundamentals_10u',
          name: 'July 2026 10U Pitching Fundamentals',
          skill_focus: 'pitching',
          division_id: 'div_10u',
          start_date: '2026-07-15T16:00:00Z',
          end_date: '2026-07-16T19:00:00Z',
          price: 95,
          total_training_hours: 8,
          location_field_id: 'field_1',
          description: 'Two-day fundamentals clinic for new and developing 10U pitchers. Emphasis on grip, stride, and safe workload.'
        },
        {
          id: 'clinic_july26_pitching_elite_14u',
          name: 'July 2026 14U Elite Pitching Lab',
          skill_focus: 'pitching',
          division_id: 'div_14u',
          start_date: '2026-07-22T18:00:00Z',
          end_date: '2026-07-25T20:30:00Z',
          price: 135,
          total_training_hours: 12,
          location_field_id: 'field_2',
          description: 'Advanced 14U pitching lab with video analysis and spin-rate tracking. Designed for experienced pitchers preparing for high school play.'
        }
      ],
      programs: [
        {
          id: 'prog_spring26_12u_weeknight',
          season_id: 'spring_2026',
          division_id: 'div_12u',
          name: 'Spring 2026 12U Weeknight League',
          description: 'Primary 12U league with weeknight practices and games, focusing on player development and balanced competition.',
          registration_open: true,
          base_price: 225,
          location_summary: 'Games at Fields 1 & 2, practices at Fields 1-3.'
        },
        {
          id: 'prog_spring26_12u_satellite',
          season_id: 'spring_2026',
          division_id: 'div_12u',
          name: 'Spring 2026 12U Saturday Developmental',
          description: 'Development-focused Saturday-only program for multi-sport 12U athletes seeking additional reps.',
          registration_open: true,
          base_price: 185,
          location_summary: 'Saturday sessions at Field 3.'
        },
        {
          id: 'prog_spring26_10u_rec',
          season_id: 'spring_2026',
          division_id: 'div_10u',
          name: 'Spring 2026 10U Recreational League',
          description: 'Beginner-friendly 10U league introducing players to fastpitch rules in a fun environment.',
          registration_open: true,
          base_price: 195,
          location_summary: 'Games at Field 3, occasional games at Field 1.'
        }
      ],
      players: [
        {
          id: 'player_jordan_miller',
          first_name: 'Jordan',
          last_name: 'Miller',
          date_of_birth: '2014-03-15T00:00:00Z',
          division_id: 'div_12u',
          notes: 'New to the league; prefers weekday evening practices.'
        },
        {
          id: 'player_riley_johnson',
          first_name: 'Riley',
          last_name: 'Johnson',
          date_of_birth: '2013-07-02T00:00:00Z',
          division_id: 'div_14u',
          notes: 'Primary position: pitcher; interested in advanced pitching clinics.'
        },
        {
          id: 'player_sam_torres',
          first_name: 'Sam',
          last_name: 'Torres',
          date_of_birth: '2016-09-21T00:00:00Z',
          division_id: 'div_10u',
          notes: 'Beginner-level player; recommended for recreational 10U team.'
        }
      ],
      products: [
        {
          id: 'prod_youth_tee_navy_logo',
          category_id: 'cat_apparel',
          product_type: 'youth_t_shirt',
          name: 'Youth League T-Shirt - Navy',
          description: 'Soft cotton youth T-shirt with league logo on front. Ideal for players and siblings.',
          price: 17.99,
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop&auto=format&q=80',
          is_youth: true,
          is_adult: false,
          available_sizes: ['youth_s', 'youth_m', 'youth_l'],
          available_colors: ['navy', 'gray'],
          rating: 4.5,
          rating_count: 34,
          active: true
        },
        {
          id: 'prod_youth_tee_red_alt',
          category_id: 'cat_apparel',
          product_type: 'youth_t_shirt',
          name: 'Youth Performance Tee - Red',
          description: 'Moisture-wicking youth performance T-shirt with small sleeve logo.',
          price: 21.5,
          image_url: 'https://cdn11.bigcommerce.com/s-cmcj94sbu5/product_images/uploaded_images/mens-delta-coolingbaselayer-blue-offfront.jpg',
          is_youth: true,
          is_adult: false,
          available_sizes: ['youth_m', 'youth_l', 'youth_xl'],
          available_colors: ['red'],
          rating: 4.7,
          rating_count: 19,
          active: true
        },
        {
          id: 'prod_adult_hat_classic_navy',
          category_id: 'cat_hats',
          product_type: 'hat',
          name: 'Adult Classic Cap - Navy',
          description: 'Structured adult-size cap with embroidered league logo and adjustable strap.',
          price: 22,
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop&auto=format&q=80',
          is_youth: false,
          is_adult: true,
          available_sizes: ['adult_one_size'],
          available_colors: ['navy'],
          rating: 4.3,
          rating_count: 27,
          active: true
        }
      ],
      rule_documents: [
        {
          id: 'rule_code_of_conduct',
          title: 'League Code of Conduct',
          division_code: 'all',
          category: 'code_of_conduct',
          article_id: 'code_of_conduct',
          content: 'The League Code of Conduct applies to all players, coaches, umpires, and spectators. It prohibits abusive language, harassment, and unsportsmanlike behavior. Violations may result in warnings, suspensions, or removal from the facility. Parents and guardians are responsible for the behavior of all guests they bring to league events.',
          last_updated: '2026-01-10T00:00:00Z'
        },
        {
          id: 'rule_12u_division_rules',
          title: '12U Division Playing Rules',
          division_code: '12u',
          category: 'division_rules',
          article_id: '12u_rules',
          content: 'The 12U Division uses full fastpitch rules with a 12-inch softball. Games are 6 innings or 1 hour 30 minutes, whichever comes first. Stealing is permitted once the ball leaves the pitcher\'s hand. Pitchers may throw a maximum of 4 innings per day across all competitions. Equipment must comply with 12U bat regulations and safety requirements.',
          last_updated: '2025-12-15T00:00:00Z'
        },
        {
          id: 'rule_12u_bat_rules',
          title: '12U Bat Rules',
          division_code: '12u',
          category: 'bat_regulations',
          article_id: 'bat_rules_12u',
          content: 'For the 12U Division, only fastpitch softball bats bearing the current USA Softball, USSSA, NSA, or ISA certification marks are permitted. Maximum barrel diameter is 2 1/4 inches. Bats must not be altered or damaged and may be removed from play at the discretion of the umpire or league officials. Illegal bats used in play will result in the batter being called out and potential ejection for repeated violations.',
          last_updated: '2026-02-01T00:00:00Z'
        }
      ],
      teams: [
        {
          id: 'team_14u_thunder',
          division_id: 'div_14u',
          name: '14U Thunder',
          skill_level: 'intermediate',
          home_field_id: 'field_2',
          zip_code: '12347',
          description: 'Balanced 14U team competing in the Spring 2026 14U Competitive League.',
          coach_name: 'Jamie Carter',
          coach_email: 'jamie.carter@thunder14u.org',
          coach_phone: '555-310-2244'
        },
        {
          id: 'team_14u_storm',
          division_id: 'div_14u',
          name: '14U Storm',
          skill_level: 'advanced',
          home_field_id: 'field_1',
          zip_code: '12350',
          description: 'Advanced 14U squad focused on tournament play and travel competition.',
          coach_name: 'Alex Nguyen',
          coach_email: 'alex.nguyen@storm14u.org',
          coach_phone: '555-310-8899'
        },
        {
          id: 'team_12u_lightning',
          division_id: 'div_12u',
          name: '12U Lightning',
          skill_level: 'intermediate',
          home_field_id: 'field_1',
          zip_code: '12345',
          description: 'Competitive 12U team with an emphasis on strong defense and team culture.',
          coach_name: 'Morgan Lee',
          coach_email: 'morgan.lee@lightning12u.org',
          coach_phone: '555-222-3344'
        }
      ],
      games: [
        {
          id: 'game_2026_14u_thunder_apr20',
          division_id: 'div_14u',
          home_team_id: 'team_14u_thunder',
          away_team_id: 'team_14u_storm',
          game_date: '2026-04-20T22:00:00Z',
          start_time: '6:00 PM',
          end_time: '7:30 PM',
          field_id: 'field_2',
          status: 'completed',
          description: 'Early-season matchup under the lights at Field 2.'
        },
        {
          id: 'game_2026_14u_thunder_apr27',
          division_id: 'div_14u',
          home_team_id: 'team_14u_storm',
          away_team_id: 'team_14u_thunder',
          game_date: '2026-04-27T22:30:00Z',
          start_time: '6:30 PM',
          end_time: '8:00 PM',
          field_id: 'field_1',
          status: 'completed',
          description: 'Rematch between Thunder and Storm at Field 1.'
        },
        {
          id: 'game_2026_14u_thunder_may03',
          division_id: 'div_14u',
          home_team_id: 'team_14u_thunder',
          away_team_id: 'team_14u_storm',
          game_date: '2026-05-03T22:00:00Z',
          start_time: '6:00 PM',
          end_time: '7:30 PM',
          field_id: 'field_2',
          status: 'scheduled',
          description: 'First May home game for Thunder; league schedule feature game.'
        }
      ],
      team_practices: [
        {
          id: 'prac_10u_comets_tue',
          team_id: 'team_10u_comets',
          day_of_week: 'tuesday',
          start_time: '5:00 PM',
          end_time: '6:30 PM',
          field_id: 'field_3'
        },
        {
          id: 'prac_10u_comets_thu',
          team_id: 'team_10u_comets',
          day_of_week: 'thursday',
          start_time: '5:30 PM',
          end_time: '7:00 PM',
          field_id: 'field_3'
        },
        {
          id: 'prac_10u_sparks_tue',
          team_id: 'team_10u_sparks',
          day_of_week: 'tuesday',
          start_time: '6:30 PM',
          end_time: '8:00 PM',
          field_id: 'field_1'
        }
      ],
      field_reservation_slots: [
        {
          id: 'frs_2026-05-06_f1_4pm_5pm_10u',
          field_id: 'field_1',
          division_id: 'div_10u',
          date: '2026-05-06T00:00:00Z',
          start_time: '4:00 PM',
          end_time: '5:00 PM',
          is_available: true
        },
        {
          id: 'frs_2026-05-06_f1_5pm_6pm_10u',
          field_id: 'field_1',
          division_id: 'div_10u',
          date: '2026-05-06T00:00:00Z',
          start_time: '5:00 PM',
          end_time: '6:00 PM',
          is_available: false
        },
        {
          id: 'frs_2026-05-06_f1_6pm_7pm_12u',
          field_id: 'field_1',
          division_id: 'div_12u',
          date: '2026-05-06T00:00:00Z',
          start_time: '6:00 PM',
          end_time: '7:00 PM',
          is_available: true
        }
      ],
      field_reservations: [
        {
          id: 'res_2026-05-06_f1_5pm_10u_panthers',
          reservation_slot_id: 'frs_2026-05-06_f1_5pm_6pm_10u',
          team_name: '10U Panthers',
          coach_name: 'Leslie King',
          contact_phone: '555-620-9833',
          reserved_at: '2026-03-25T14:10:00Z',
          status: 'confirmed'
        },
        {
          id: 'res_2026-05-06_f2_5pm_14u_thunder',
          reservation_slot_id: 'frs_2026-05-06_f2_5pm_6pm_14u',
          team_name: '14U Thunder',
          coach_name: 'Jamie Carter',
          contact_phone: '555-310-2244',
          reserved_at: '2026-03-26T09:45:00Z',
          status: 'confirmed'
        },
        {
          id: 'res_2026-05-13_f1_6pm_12u_lightning',
          reservation_slot_id: 'frs_2026-05-13_f1_6pm_7pm_12u',
          team_name: '12U Lightning',
          coach_name: 'Morgan Lee',
          contact_phone: '555-222-3344',
          reserved_at: '2026-03-28T16:20:00Z',
          status: 'confirmed'
        }
      ],
      program_sessions: [
        {
          id: 'sess_spring26_12u_week_mon_5pm',
          program_id: 'prog_spring26_12u_weeknight',
          name: 'Monday 5:00-6:30 PM - Field 1',
          day_of_week: 'monday',
          start_time: '17:00',
          end_time: '18:30',
          field_id: 'field_1',
          price: 225,
          capacity: 14,
          is_weekday: true,
          status: 'open',
          spots_remaining: 13
        },
        {
          id: 'sess_spring26_12u_week_tue_5pm_value',
          program_id: 'prog_spring26_12u_weeknight',
          name: 'Tuesday 5:00-6:30 PM - Value Session',
          day_of_week: 'tuesday',
          start_time: '17:00',
          end_time: '18:30',
          field_id: 'field_1',
          price: 215,
          capacity: 14,
          is_weekday: true,
          status: 'open',
          spots_remaining: 14
        },
        {
          id: 'sess_spring26_12u_week_wed_6pm',
          program_id: 'prog_spring26_12u_weeknight',
          name: 'Wednesday 6:00-7:30 PM - Field 2',
          day_of_week: 'wednesday',
          start_time: '18:00',
          end_time: '19:30',
          field_id: 'field_2',
          price: 230,
          capacity: 14,
          is_weekday: true,
          status: 'open',
          spots_remaining: 14
        }
      ],
      program_registrations: [
        {
          id: 'reg_spring26_12u_mon_casey',
          program_session_id: 'sess_spring26_12u_week_mon_5pm',
          player_id: 'player_casey_lee',
          guardian_contact_id: 'gc_default_guardian',
          registration_date: '2026-03-10T15:20:00Z',
          payment_option: 'pay_in_full',
          amount_due: 225,
          amount_paid: 225,
          status: 'confirmed'
        },
        {
          id: 'reg_spring26_10u_tue_sam',
          program_session_id: 'sess_spring26_10u_rec_tue_5pm',
          player_id: 'player_sam_torres',
          guardian_contact_id: 'gc_alex_miller',
          registration_date: '2026-03-12T18:45:00Z',
          payment_option: 'pay_in_full',
          amount_due: 195,
          amount_paid: 195,
          status: 'confirmed'
        },
        {
          id: 'reg_spring26_14u_mon_riley',
          program_session_id: 'sess_spring26_14u_comp_mon_6pm',
          player_id: 'player_riley_johnson',
          guardian_contact_id: 'gc_riley_parent',
          registration_date: '2026-03-14T14:05:00Z',
          payment_option: 'installments',
          amount_due: 240,
          amount_paid: 80,
          status: 'pending'
        }
      ],
      volunteer_shifts: [
        {
          id: 'vs_2026-06-05_f2_conc_5pm',
          role: 'concession_stand',
          field_id: 'field_2',
          date: '2026-06-05T00:00:00Z',
          start_time: '5:00 PM',
          end_time: '7:00 PM',
          capacity: 3,
          notes: 'Concession stand window and grill during early evening games at Field 2.',
          spots_remaining: 2
        },
        {
          id: 'vs_2026-06-06_f2_conc_3pm',
          role: 'concession_stand',
          field_id: 'field_2',
          date: '2026-06-06T00:00:00Z',
          start_time: '3:00 PM',
          end_time: '5:00 PM',
          capacity: 3,
          notes: 'Afternoon concession shift before evening games.',
          spots_remaining: 3
        },
        {
          id: 'vs_2026-06-10_f2_conc_6pm',
          role: 'concession_stand',
          field_id: 'field_2',
          date: '2026-06-10T00:00:00Z',
          start_time: '6:00 PM',
          end_time: '8:30 PM',
          capacity: 4,
          notes: 'Busy midweek concession shift covering prime-time 12U and 14U games.',
          spots_remaining: 3
        }
      ],
      volunteer_signups: [
        {
          id: 'vsu_2026-06-05_f2_conc_taylor',
          volunteer_shift_id: 'vs_2026-06-05_f2_conc_5pm',
          volunteer_name: 'Taylor Smith',
          phone: '555-987-6543',
          email: 'taylor.smith@example.com',
          signup_time: '2026-05-20T13:15:00Z',
          status: 'confirmed'
        },
        {
          id: 'vsu_2026-06-10_f2_conc_jordan',
          volunteer_shift_id: 'vs_2026-06-10_f2_conc_6pm',
          volunteer_name: 'Jordan Miller',
          phone: '555-123-4567',
          email: 'alex.miller@example.com',
          signup_time: '2026-05-22T18:40:00Z',
          status: 'confirmed'
        },
        {
          id: 'vsu_2026-06-12_f3_conc_alex',
          volunteer_shift_id: 'vs_2026-06-12_f3_conc_5pm',
          volunteer_name: 'Alex Miller',
          phone: '555-123-4567',
          email: 'alex.miller@example.com',
          signup_time: '2026-05-23T09:05:00Z',
          status: 'confirmed'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:26.283104'
      }
    };

    // Extend generated data for testing where necessary (without modifying existing records)

    // Add a water bottle product so Task 4 can exercise rating filters and accessory category
    generatedData.products.push({
      id: 'prod_water_bottle_blue_20oz',
      category_id: 'cat_accessories',
      product_type: 'water_bottle',
      name: 'Insulated Water Bottle - Blue',
      description: '20oz insulated bottle with league logo and flip-top lid.',
      price: 14.99,
      image_url: 'https://images.unsplash.com/photo-1526401485004-2fa806b5e00c?w=800&h=600&fit=crop&auto=format&q=80',
      is_youth: false,
      is_adult: false,
      available_sizes: ['one_size'],
      available_colors: ['blue', 'black'],
      rating: 4.6,
      rating_count: 12,
      active: true
    });

    // Add 10U teams referenced by team_practices so Task 7 can find beginner 10U teams
    generatedData.teams.push(
      {
        id: 'team_10u_comets',
        division_id: 'div_10u',
        name: '10U Comets',
        skill_level: 'beginner',
        home_field_id: 'field_3',
        zip_code: '12345',
        description: 'Beginner 10U team focused on fundamentals and a fun first league experience.',
        coach_name: 'Chris Jones',
        coach_email: 'chris.jones@10ucomets.org',
        coach_phone: '555-400-1000'
      },
      {
        id: 'team_10u_sparks',
        division_id: 'div_10u',
        name: '10U Sparks',
        skill_level: 'recreational',
        home_field_id: 'field_1',
        zip_code: '12346',
        description: 'Recreational 10U team for players with 1-2 seasons of experience.',
        coach_name: 'Taylor Brooks',
        coach_email: 'taylor.brooks@10usparks.org',
        coach_phone: '555-400-2000'
      }
    );

    // Persist generated data into localStorage using storage keys from the mapping
    const storeArray = (key) => {
      if (generatedData[key]) {
        localStorage.setItem(key, JSON.stringify(generatedData[key]));
      }
    };

    storeArray('divisions');
    storeArray('fields');
    storeArray('guardian_contacts');
    storeArray('product_categories');
    storeArray('seasons');
    storeArray('clinics');
    storeArray('programs');
    storeArray('players');
    storeArray('products');
    storeArray('rule_documents');
    storeArray('teams');
    storeArray('games');
    storeArray('team_practices');
    storeArray('field_reservation_slots');
    storeArray('field_reservations');
    storeArray('program_sessions');
    storeArray('program_registrations');
    storeArray('volunteer_shifts');
    storeArray('volunteer_signups');

    // Ensure empty arrays exist for stateful entities if not already created by BusinessLogic
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };

    ensureArray('carts');
    ensureArray('cart_items');
    ensureArray('orders');
    ensureArray('order_items');
    ensureArray('saved_games');
    ensureArray('saved_teams');
    ensureArray('saved_resources');
    ensureArray('clinic_registrations');
    ensureArray('field_reservations');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RegisterCheapest12UWeekdayEveningSpring();
    this.testTask2_SaveNextThunderGamesToMySchedule();
    this.testTask3_SignUpForTwoEveningConcessionShifts();
    this.testTask4_BuyThreeStoreItemsWithConstraints();
    this.testTask5_RegisterJulyPitchingClinicMostHoursUnder120();
    this.testTask6_ReserveWednesdayEvening12UPracticeFieldWithLights();
    this.testTask7_FindBeginner10UTeamWithin10MilesPracticingTueThu();
    this.testTask8_SaveBatRulesAndCodeOfConductToResources();

    return this.results;
  }

  // Task 1: Register a 12U player for the cheapest weekday evening spring season program
  testTask1_RegisterCheapest12UWeekdayEveningSpring() {
    const testName = 'Task 1: Register cheapest 12U weekday evening Spring 2026 session';
    console.log('Testing: ' + testName);

    try {
      const filterOptions = this.logic.getProgramFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.seasons), 'Program filter options should include seasons');
      this.assert(Array.isArray(filterOptions.divisions), 'Program filter options should include divisions');

      const springSeason = filterOptions.seasons.find(s => s.name === 'Spring 2026 Season');
      this.assert(springSeason, 'Spring 2026 Season should be available');

      const div12u = filterOptions.divisions.find(d => (d.code || '').toLowerCase() === '12u');
      this.assert(div12u, '12U division should be available');

      const filters = {
        days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        is_weekday_only: true,
        earliest_start_time: '17:00',
        status: 'open'
      };
      const sort = { sort_by: 'price', sort_direction: 'asc' };

      const searchResult = this.logic.searchProgramSessions(
        springSeason.season_id,
        div12u.division_id,
        filters,
        sort,
        1,
        25
      );

      this.assert(searchResult && Array.isArray(searchResult.sessions), 'searchProgramSessions should return a sessions array');
      this.assert(searchResult.sessions.length > 0, 'At least one 12U Spring 2026 weekday evening session should be returned');

      const cheapestSession = searchResult.sessions[0];
      this.assert(!!cheapestSession.program_session_id, 'Session should have an ID');

      const sessionDetails = this.logic.getProgramSessionDetails(cheapestSession.program_session_id);
      this.assert(sessionDetails && sessionDetails.program_session_id === cheapestSession.program_session_id, 'Session details should match selected session');
      this.assert(sessionDetails.season_name === springSeason.name, 'Session should belong to Spring 2026 Season');
      this.assert((sessionDetails.division_name || '').toLowerCase().indexOf('12') !== -1, 'Session should be for 12U division');

      // Submit registration using provided sample data
      const registrationResult = this.logic.submitProgramRegistration(
        cheapestSession.program_session_id,
        {
          first_name: 'Jordan',
          last_name: 'Miller',
          date_of_birth: '2014-03-15',
          notes: 'Automation test registration for cheapest weekday evening session.'
        },
        {
          name: 'Alex Miller',
          phone: '555-123-4567',
          email: 'alex.miller@example.com',
          preferred_contact_method: 'email'
        },
        'pay_in_full'
      );

      this.assert(registrationResult && registrationResult.success === true, 'Program registration should succeed');
      this.assert(!!registrationResult.registration_id, 'Program registration should return a registration_id');
      this.assert(registrationResult.payment_option === 'pay_in_full', 'Payment option should be pay_in_full');

      // Verify persistence and relationships via localStorage
      const registrations = JSON.parse(localStorage.getItem('program_registrations') || '[]');
      const regRecord = registrations.find(r => r.id === registrationResult.registration_id);
      this.assert(regRecord, 'New ProgramRegistration record should exist in storage');
      this.assert(regRecord.program_session_id === cheapestSession.program_session_id, 'Registration should reference the chosen program session');

      const players = JSON.parse(localStorage.getItem('players') || '[]');
      const playerRecord = players.find(p => p.id === regRecord.player_id);
      this.assert(playerRecord, 'Registration should reference a valid Player record');
      this.assert(playerRecord.first_name === 'Jordan' && playerRecord.last_name === 'Miller', 'Player name should match submitted data');

      const guardians = JSON.parse(localStorage.getItem('guardian_contacts') || '[]');
      const guardianRecord = guardians.find(g => g.id === regRecord.guardian_contact_id);
      this.assert(guardianRecord && guardianRecord.email === 'alex.miller@example.com', 'Guardian contact should match submitted data');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Save the next 3 upcoming games for the 14U Thunder team to My Schedule
  testTask2_SaveNextThunderGamesToMySchedule() {
    const testName = 'Task 2: Save upcoming 14U Thunder games to My Schedule';
    console.log('Testing: ' + testName);

    try {
      const scheduleOptions = this.logic.getScheduleFilterOptions();
      this.assert(scheduleOptions && Array.isArray(scheduleOptions.teams), 'Schedule filter options should include teams');

      const thunderTeam = scheduleOptions.teams.find(t => t.team_name === '14U Thunder');
      this.assert(thunderTeam, '14U Thunder team should be present in schedule options');

      const startDate = '2026-05-01';
      const filters = {
        divisionId: null,
        teamId: thunderTeam.team_id,
        start_date: startDate,
        end_date: null
      };
      const sort = { sort_by: 'game_date', sort_direction: 'asc' };

      const searchResult = this.logic.searchGames(filters, sort, 1, 50);
      this.assert(searchResult && Array.isArray(searchResult.games), 'searchGames should return a games array');

      const thunderGames = searchResult.games.filter(g =>
        (g.home_team_name && g.home_team_name.indexOf('Thunder') !== -1) ||
        (g.away_team_name && g.away_team_name.indexOf('Thunder') !== -1)
      );

      // Adaptation: there may be fewer than 3 upcoming games in generated data
      this.assert(thunderGames.length > 0, 'There should be at least one upcoming Thunder game on or after ' + startDate);

      const targetGames = thunderGames.slice(0, 3);
      const targetGameIds = targetGames.map(g => g.game_id);

      // Add each target game to My Schedule
      const savedGameIds = [];
      targetGames.forEach(game => {
        const addResult = this.logic.addGameToMySchedule(game.game_id);
        this.assert(addResult && addResult.success === true, 'addGameToMySchedule should succeed');
        this.assert(!!addResult.saved_game_id, 'addGameToMySchedule should return saved_game_id');
        savedGameIds.push(game.game_id);
      });

      // Verify via My Schedule API
      const mySchedule = this.logic.getMyScheduleGames();
      this.assert(mySchedule && Array.isArray(mySchedule.games), 'getMyScheduleGames should return games array');

      const mySavedGameIds = mySchedule.games.map(g => g.game_id);
      savedGameIds.forEach(id => {
        this.assert(mySavedGameIds.indexOf(id) !== -1, 'My Schedule should contain saved game ' + id);
      });

      // Ensure no duplicate saves for those game IDs
      const uniqueSaved = new Set(
        mySchedule.games
          .filter(g => savedGameIds.indexOf(g.game_id) !== -1)
          .map(g => g.game_id)
      );
      this.assert(uniqueSaved.size === savedGameIds.length, 'Each target game should be saved exactly once');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Sign up for two evening concession stand volunteer shifts in June at Field 2
  testTask3_SignUpForTwoEveningConcessionShifts() {
    const testName = 'Task 3: Sign up for two June evening concession shifts at Field 2';
    console.log('Testing: ' + testName);

    try {
      const filterOptions = this.logic.getVolunteerFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.months), 'Volunteer filter options should include months');
      this.assert(Array.isArray(filterOptions.fields), 'Volunteer filter options should include fields');
      this.assert(Array.isArray(filterOptions.roles), 'Volunteer filter options should include roles');

      let juneMonth = filterOptions.months.find(m => m.month_value === '2026-06');
      if (!juneMonth) {
        juneMonth = filterOptions.months[0];
      }
      this.assert(juneMonth, 'A month option for June 2026 (or equivalent) should be available');

      const field2 = filterOptions.fields.find(f => f.field_name === 'Field 2');
      this.assert(field2, 'Field 2 should be present in volunteer field options');

      const concRole = filterOptions.roles.find(r => r.value === 'concession_stand');
      this.assert(concRole, 'Concession Stand role should be available');

      const filters = {
        month: juneMonth.month_value,
        date_start: juneMonth.start_date,
        date_end: juneMonth.end_date,
        fieldId: field2.field_id,
        role: concRole.value,
        earliest_start_time: '17:00',
        latest_start_time: null
      };
      const sort = { sort_by: 'date_time', sort_direction: 'asc' };

      const searchResult = this.logic.searchVolunteerShifts(filters, sort, 1, 50);
      this.assert(searchResult && Array.isArray(searchResult.shifts), 'searchVolunteerShifts should return shifts array');

      const eveningShifts = searchResult.shifts;
      this.assert(eveningShifts.length >= 2, 'There should be at least two June evening concession shifts at Field 2');

      const targetShifts = eveningShifts.slice(0, 2);

      // Optionally verify details for the first shift
      const firstShiftDetails = this.logic.getVolunteerShiftDetails(targetShifts[0].shift_id);
      this.assert(firstShiftDetails && firstShiftDetails.shift_id === targetShifts[0].shift_id, 'Volunteer shift details should match selected shift');

      const newSignupIds = [];
      targetShifts.forEach(shift => {
        const signupResult = this.logic.submitVolunteerSignup(
          shift.shift_id,
          {
            name: 'Taylor Smith',
            phone: '555-987-6543',
            email: 'taylor.smith@example.com'
          }
        );
        this.assert(signupResult && signupResult.success === true, 'Volunteer signup should succeed');
        this.assert(!!signupResult.volunteer_signup_id, 'Volunteer signup should return an ID');
        newSignupIds.push(signupResult.volunteer_signup_id);
      });

      // Verify via My Volunteer Shifts API
      const myShiftsResult = this.logic.getMyVolunteerShifts();
      this.assert(myShiftsResult && Array.isArray(myShiftsResult.shifts), 'getMyVolunteerShifts should return shifts array');

      const myNewShifts = myShiftsResult.shifts.filter(s => newSignupIds.indexOf(s.volunteer_signup_id) !== -1);
      this.assert(myNewShifts.length === newSignupIds.length, 'Both new volunteer shifts should appear in My Volunteer Shifts');

      myNewShifts.forEach(s => {
        this.assert(s.role === 'concession_stand', 'Saved volunteer shift should be Concession Stand');
        this.assert(s.field_name === 'Field 2', 'Saved volunteer shift should be at Field 2');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Buy three specific items from the league store with price and rating constraints
  testTask4_BuyThreeStoreItemsWithConstraints() {
    const testName = 'Task 4: Buy youth tee, adult hat, and water bottle with constraints';
    console.log('Testing: ' + testName);

    try {
      const categoriesResult = this.logic.getStoreCategories();
      this.assert(categoriesResult && Array.isArray(categoriesResult.categories), 'getStoreCategories should return categories array');

      const apparelCategory = categoriesResult.categories.find(c => c.category_key === 'apparel');
      const hatsCategory = categoriesResult.categories.find(c => c.category_key === 'hats');
      const accessoriesCategory = categoriesResult.categories.find(c => c.category_key === 'accessories');

      this.assert(apparelCategory, 'Apparel category should exist');
      this.assert(hatsCategory, 'Hats category should exist');
      this.assert(accessoriesCategory, 'Accessories category should exist');

      // 1) Youth T-shirt, size Medium, under $20
      const youthTeeSearch = this.logic.searchProducts(
        apparelCategory.category_id,
        {
          product_type: 'youth_t_shirt',
          min_price: null,
          max_price: 20,
          min_rating: null,
          size_segment: 'youth',
          search_query: null,
          active_only: true
        },
        { sort_by: 'price', sort_direction: 'asc' },
        1,
        24
      );
      this.assert(youthTeeSearch && Array.isArray(youthTeeSearch.products), 'searchProducts for youth tees should return products array');
      this.assert(youthTeeSearch.products.length > 0, 'There should be at least one youth T-shirt under $20');

      const youthTee = youthTeeSearch.products[0];
      const youthTeeDetails = this.logic.getProductDetails(youthTee.product_id);
      this.assert(youthTeeDetails && youthTeeDetails.product_id === youthTee.product_id, 'Youth tee details should match selected product');
      this.assert(youthTeeDetails.price < 20, 'Youth T-shirt price should be under $20');
      this.assert(youthTeeDetails.is_youth === true, 'Youth T-shirt should be flagged as youth');
      this.assert(Array.isArray(youthTeeDetails.available_sizes), 'Youth tee should have available sizes');
      this.assert(youthTeeDetails.available_sizes.indexOf('youth_m') !== -1, 'Youth tee should offer Youth M size');

      const youthTeeSize = 'youth_m';
      const youthTeeColor = (youthTeeDetails.available_colors && youthTeeDetails.available_colors[0]) || null;

      const addYouthTeeResult = this.logic.addProductToCart(
        youthTeeDetails.product_id,
        1,
        youthTeeSize,
        youthTeeColor
      );
      this.assert(addYouthTeeResult && addYouthTeeResult.success === true, 'Adding youth tee to cart should succeed');

      // 2) Adult hat under $25
      const hatSearch = this.logic.searchProducts(
        hatsCategory.category_id,
        {
          product_type: 'hat',
          min_price: null,
          max_price: 25,
          min_rating: null,
          size_segment: 'adult',
          search_query: null,
          active_only: true
        },
        { sort_by: 'price', sort_direction: 'asc' },
        1,
        24
      );
      this.assert(hatSearch && Array.isArray(hatSearch.products), 'searchProducts for hats should return products array');
      this.assert(hatSearch.products.length > 0, 'There should be at least one adult hat under $25');

      const hat = hatSearch.products[0];
      const hatDetails = this.logic.getProductDetails(hat.product_id);
      this.assert(hatDetails && hatDetails.product_id === hat.product_id, 'Hat details should match selected product');
      this.assert(hatDetails.price < 25, 'Hat price should be under $25');
      this.assert(hatDetails.is_adult === true, 'Hat should be flagged as adult');

      const hatSize = (hatDetails.available_sizes && hatDetails.available_sizes[0]) || 'one_size';
      const hatColor = (hatDetails.available_colors && hatDetails.available_colors[0]) || null;

      const addHatResult = this.logic.addProductToCart(
        hatDetails.product_id,
        1,
        hatSize,
        hatColor
      );
      this.assert(addHatResult && addHatResult.success === true, 'Adding hat to cart should succeed');

      // 3) Water bottle with rating >= 4.0
      const bottleSearch = this.logic.searchProducts(
        accessoriesCategory.category_id,
        {
          product_type: 'water_bottle',
          min_price: null,
          max_price: null,
          min_rating: 4.0,
          size_segment: 'one_size',
          search_query: null,
          active_only: true
        },
        { sort_by: 'rating', sort_direction: 'desc' },
        1,
        24
      );
      this.assert(bottleSearch && Array.isArray(bottleSearch.products), 'searchProducts for water bottles should return products array');
      this.assert(bottleSearch.products.length > 0, 'There should be at least one water bottle with rating >= 4.0');

      const bottle = bottleSearch.products[0];
      const bottleDetails = this.logic.getProductDetails(bottle.product_id);
      this.assert(bottleDetails && bottleDetails.product_id === bottle.product_id, 'Water bottle details should match selected product');
      this.assert(bottleDetails.product_type === 'water_bottle', 'Selected accessory should be a water bottle');
      if (typeof bottleDetails.rating === 'number') {
        this.assert(bottleDetails.rating >= 4.0, 'Water bottle rating should be at least 4.0');
      }

      const bottleSize = (bottleDetails.available_sizes && bottleDetails.available_sizes[0]) || 'one_size';
      const bottleColor = (bottleDetails.available_colors && bottleDetails.available_colors[0]) || null;

      const addBottleResult = this.logic.addProductToCart(
        bottleDetails.product_id,
        1,
        bottleSize,
        bottleColor
      );
      this.assert(addBottleResult && addBottleResult.success === true, 'Adding water bottle to cart should succeed');

      // Verify cart contents: three different items, quantity 1 each
      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'getCart should return items array');

      const productIdsInCart = cart.items.map(i => i.product_id);
      [youthTeeDetails.product_id, hatDetails.product_id, bottleDetails.product_id].forEach(pid => {
        this.assert(productIdsInCart.indexOf(pid) !== -1, 'Cart should contain product ' + pid);
      });

      cart.items.forEach(item => {
        if ([youthTeeDetails.product_id, hatDetails.product_id, bottleDetails.product_id].indexOf(item.product_id) !== -1) {
          this.assert(item.quantity === 1, 'Cart item ' + item.product_id + ' should have quantity 1');
        }
      });

      // Checkout with Standard Shipping
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && Array.isArray(checkoutSummary.shipping_methods), 'getCheckoutSummary should return shipping methods');

      let standardShipping = checkoutSummary.shipping_methods.find(m => m.value === 'standard');
      if (!standardShipping && checkoutSummary.default_shipping_method === 'standard') {
        standardShipping = checkoutSummary.shipping_methods.find(m => m.value === checkoutSummary.default_shipping_method);
      }
      this.assert(standardShipping, 'Standard shipping method should be available at checkout');

      const orderResult = this.logic.submitOrder(
        'standard',
        {
          shipping_name: 'Store Test User',
          address_line1: '123 Main St',
          address_line2: '',
          city: 'Springfield',
          state: 'CA',
          postal_code: '90000',
          country: 'USA'
        },
        {
          email: 'store.test@example.com',
          phone: '555-000-0000'
        }
      );

      this.assert(orderResult && orderResult.success === true, 'Order submission should succeed');
      this.assert(!!orderResult.order_id, 'Order submission should return order_id');
      this.assert(orderResult.shipping_method === 'standard', 'Order should use Standard shipping');
      if (orderResult.totals && typeof orderResult.totals.total === 'number') {
        this.assert(orderResult.totals.total > 0, 'Order total should be positive');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Register for the July pitching clinic with the most hours under $120
  testTask5_RegisterJulyPitchingClinicMostHoursUnder120() {
    const testName = 'Task 5: Register July pitching clinic with most hours under $120';
    console.log('Testing: ' + testName);

    try {
      const filterOptions = this.logic.getClinicFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.months), 'Clinic filter options should include months');
      this.assert(Array.isArray(filterOptions.skill_focus_options), 'Clinic filter options should include skill focus options');

      let julyMonth = filterOptions.months.find(m => m.month_value === '2026-07');
      if (!julyMonth) {
        julyMonth = filterOptions.months[0];
      }
      this.assert(julyMonth, 'A July 2026 month option (or equivalent) should be available');

      const pitchingOption = filterOptions.skill_focus_options.find(o => o.value === 'pitching');
      this.assert(pitchingOption, 'Pitching skill focus should be available');

      const clinicSearch = this.logic.searchClinics(
        {
          month: julyMonth.month_value,
          start_date: julyMonth.start_date,
          end_date: julyMonth.end_date,
          skill_focus: pitchingOption.value,
          max_price: 120,
          min_training_hours: null
        },
        { sort_by: 'total_training_hours', sort_direction: 'desc' },
        1,
        25
      );

      this.assert(clinicSearch && Array.isArray(clinicSearch.clinics), 'searchClinics should return clinics array');
      this.assert(clinicSearch.clinics.length > 0, 'There should be at least one July pitching clinic under $120');

      // Select clinic with greatest total_training_hours, tie-breaking by lower price
      let bestClinic = null;
      clinicSearch.clinics.forEach(c => {
        if (c.price <= 120) {
          if (!bestClinic) {
            bestClinic = c;
          } else if (c.total_training_hours > bestClinic.total_training_hours) {
            bestClinic = c;
          } else if (c.total_training_hours === bestClinic.total_training_hours && c.price < bestClinic.price) {
            bestClinic = c;
          }
        }
      });

      this.assert(bestClinic, 'A best-value pitching clinic under $120 should be selected');

      const clinicDetails = this.logic.getClinicDetails(bestClinic.clinic_id);
      this.assert(clinicDetails && clinicDetails.clinic_id === bestClinic.clinic_id, 'Clinic details should match selected clinic');
      this.assert(clinicDetails.price <= 120, 'Chosen clinic price should be <= 120');
      this.assert(clinicDetails.total_training_hours === bestClinic.total_training_hours, 'Total training hours should match search result');

      // Submit clinic registration using sample data
      const registrationResult = this.logic.submitClinicRegistration(
        bestClinic.clinic_id,
        {
          first_name: 'Riley',
          last_name: 'Johnson',
          date_of_birth: '2013-07-02',
          notes: 'Automation test clinic registration for best July pitching clinic.'
        },
        {
          name: 'Riley Parent',
          email: 'riley.parent@example.com',
          phone: '555-444-8899',
          preferred_contact_method: 'email'
        }
      );

      this.assert(registrationResult && registrationResult.success === true, 'Clinic registration should succeed');
      this.assert(!!registrationResult.clinic_registration_id, 'Clinic registration should return an ID');

      // Verify via localStorage
      const clinicRegs = JSON.parse(localStorage.getItem('clinic_registrations') || '[]');
      const regRecord = clinicRegs.find(r => r.id === registrationResult.clinic_registration_id);
      this.assert(regRecord, 'New ClinicRegistration record should exist in storage');
      this.assert(regRecord.clinic_id === bestClinic.clinic_id, 'ClinicRegistration should reference the chosen clinic');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Reserve a Wednesday evening 12U practice field with lights between 6-8 PM
  testTask6_ReserveWednesdayEvening12UPracticeFieldWithLights() {
    const testName = 'Task 6: Reserve Wednesday evening 12U practice field with lights';
    console.log('Testing: ' + testName);

    try {
      const filterOptions = this.logic.getFieldReservationFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.available_dates), 'Field reservation filter options should include available dates');
      this.assert(Array.isArray(filterOptions.divisions), 'Field reservation filter options should include divisions');
      this.assert(Array.isArray(filterOptions.fields), 'Field reservation filter options should include fields');

      const wednesdayDateObj = filterOptions.available_dates.find(d => d.is_wednesday);
      this.assert(wednesdayDateObj, 'At least one Wednesday date should be available for reservations');

      const div12u = filterOptions.divisions.find(d => (d.code || '').toLowerCase() === '12u');
      this.assert(div12u, '12U division should be available for reservations');

      // Search for available 6-8 PM slots on that Wednesday, requiring lights
      const slotSearch = this.logic.searchFieldReservationSlots(
        {
          date: wednesdayDateObj.date,
          divisionId: div12u.division_id,
          fieldId: null,
          start_time: '18:00',
          end_time: '20:00',
          require_lights: true
        },
        { sort_by: 'start_time', sort_direction: 'asc' }
      );

      this.assert(slotSearch && Array.isArray(slotSearch.slots), 'searchFieldReservationSlots should return slots array');

      const availableSlots = slotSearch.slots.filter(s => s.is_available);
      this.assert(availableSlots.length > 0, 'There should be at least one available lit field slot between 6-8 PM');

      const chosenSlot = availableSlots[0];
      this.assert(chosenSlot.field_has_lights === true, 'Chosen slot field should have lights');

      const slotDetails = this.logic.getFieldReservationSlotDetails(chosenSlot.reservation_slot_id);
      this.assert(slotDetails && slotDetails.reservation_slot_id === chosenSlot.reservation_slot_id, 'Reservation slot details should match chosen slot');
      this.assert(slotDetails.field_has_lights === true, 'Slot details should confirm field has lights');

      const reservationResult = this.logic.submitFieldReservation(
        chosenSlot.reservation_slot_id,
        '12U Lightning',
        'Morgan Lee',
        '555-222-3344'
      );

      this.assert(reservationResult && reservationResult.success === true, 'Field reservation should succeed');
      this.assert(!!reservationResult.field_reservation_id, 'Field reservation should return an ID');
      this.assert(reservationResult.reserved_slot && reservationResult.reserved_slot.field_name, 'Reservation should include reserved slot details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Find a beginner 10U team within 10 miles that practices on Tuesdays or Thursdays
  testTask7_FindBeginner10UTeamWithin10MilesPracticingTueThu() {
    const testName = 'Task 7: Find beginner 10U team within 10 miles practicing Tue/Thu and save to My Teams';
    console.log('Testing: ' + testName);

    try {
      const filterOptions = this.logic.getTeamFinderFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.divisions), 'Team finder filter options should include divisions');
      this.assert(Array.isArray(filterOptions.skill_levels), 'Team finder filter options should include skill levels');
      this.assert(Array.isArray(filterOptions.practice_days), 'Team finder filter options should include practice days');

      const div10u = filterOptions.divisions.find(d => (d.code || '').toLowerCase() === '10u');
      this.assert(div10u, '10U division should be available');

      let beginnerLevel = filterOptions.skill_levels.find(s => s.value === 'beginner');
      if (!beginnerLevel) {
        beginnerLevel = filterOptions.skill_levels.find(s => s.value === 'recreational');
      }
      this.assert(beginnerLevel, 'Beginner or Recreational skill level should be available');

      const tuesdayOption = filterOptions.practice_days.find(d => d.value === 'tuesday');
      const thursdayOption = filterOptions.practice_days.find(d => d.value === 'thursday');
      this.assert(tuesdayOption && thursdayOption, 'Tuesday and Thursday practice day filters should be available');

      const teamSearch = this.logic.searchTeams(
        {
          divisionId: div10u.division_id,
          skill_level: beginnerLevel.value,
          zip_code: '12345',
          radius_miles: 10,
          practice_days: ['tuesday', 'thursday']
        },
        { sort_by: 'practice_start_time', sort_direction: 'asc' },
        1,
        25
      );

      this.assert(teamSearch && Array.isArray(teamSearch.teams), 'searchTeams should return a teams array');
      this.assert(teamSearch.teams.length > 0, 'There should be at least one beginner 10U team within 10 miles');

      // Choose the team whose practice time starts earliest on Tue/Thu
      let chosenTeamSummary = null;
      let chosenEarliestTime = null;

      teamSearch.teams.forEach(team => {
        if (!Array.isArray(team.practice_summaries)) {
          return;
        }
        team.practice_summaries.forEach(prac => {
          if (prac.day_of_week === 'tuesday' || prac.day_of_week === 'thursday') {
            const timeStr = prac.start_time || '';
            if (!chosenEarliestTime || timeStr < chosenEarliestTime) {
              chosenEarliestTime = timeStr;
              chosenTeamSummary = team;
            }
          }
        });
      });

      if (!chosenTeamSummary) {
        chosenTeamSummary = teamSearch.teams[0];
      }

      this.assert(chosenTeamSummary, 'A team should be selected based on earliest practice time');

      const teamDetails = this.logic.getTeamDetail(chosenTeamSummary.team_id);
      this.assert(teamDetails && teamDetails.team_id === chosenTeamSummary.team_id, 'Team details should match selected team');
      this.assert(Array.isArray(teamDetails.practices), 'Team details should include practices array');

      const hasTueThuPractice = teamDetails.practices.some(p => p.day_of_week === 'tuesday' || p.day_of_week === 'thursday');
      this.assert(hasTueThuPractice, 'Selected team should practice on Tuesday or Thursday');

      const note = 'Beginner 10U within 10 miles of 12345';
      const saveResult = this.logic.saveTeamToMyTeams(chosenTeamSummary.team_id, note);
      this.assert(saveResult && saveResult.success === true, 'Saving team to My Teams should succeed');
      this.assert(!!saveResult.saved_team_id, 'saveTeamToMyTeams should return saved_team_id');

      const myTeamsResult = this.logic.getMyTeams();
      this.assert(myTeamsResult && Array.isArray(myTeamsResult.teams), 'getMyTeams should return teams array');

      const savedTeam = myTeamsResult.teams.find(t => t.saved_team_id === saveResult.saved_team_id);
      this.assert(savedTeam, 'Saved team should appear in My Teams');
      this.assert(savedTeam.note === note, 'Saved team note should match the provided note');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Save 12U bat rules and the league Code of Conduct to Saved Resources
  testTask8_SaveBatRulesAndCodeOfConductToResources() {
    const testName = 'Task 8: Save 12U bat rules and Code of Conduct to My Resources';
    console.log('Testing: ' + testName);

    try {
      const ruleFilterOptions = this.logic.getRuleFilterOptions();
      this.assert(ruleFilterOptions && Array.isArray(ruleFilterOptions.divisions), 'Rule filter options should include divisions');
      this.assert(Array.isArray(ruleFilterOptions.categories), 'Rule filter options should include categories');

      // Find 12U bat rules document
      const batRulesList = this.logic.listRuleDocuments(
        {
          division_code: '12u',
          category: 'bat_regulations'
        },
        1,
        50
      );
      this.assert(batRulesList && Array.isArray(batRulesList.documents), 'listRuleDocuments should return documents array for 12U bat regulations');
      this.assert(batRulesList.documents.length > 0, 'There should be at least one 12U bat rules document');

      const batRulesDoc = batRulesList.documents[0];
      const batDetails = this.logic.getRuleDocumentDetails(batRulesDoc.rule_document_id);
      this.assert(batDetails && batDetails.rule_document_id === batRulesDoc.rule_document_id, 'Bat rules details should match selected document');
      this.assert(batDetails.division_code === '12u', 'Bat rules document should be scoped to 12U division');

      const saveBatResult = this.logic.saveRuleDocumentToMyResources(batRulesDoc.rule_document_id);
      this.assert(saveBatResult && saveBatResult.success === true, 'Saving 12U bat rules to My Resources should succeed');
      this.assert(!!saveBatResult.saved_resource_id, 'Saving 12U bat rules should return saved_resource_id');

      // Find Code of Conduct document
      const codeList = this.logic.listRuleDocuments(
        {
          division_code: 'all',
          category: 'code_of_conduct'
        },
        1,
        50
      );
      this.assert(codeList && Array.isArray(codeList.documents), 'listRuleDocuments should return documents array for Code of Conduct');
      this.assert(codeList.documents.length > 0, 'There should be at least one Code of Conduct document');

      const codeDoc = codeList.documents[0];
      const codeDetails = this.logic.getRuleDocumentDetails(codeDoc.rule_document_id);
      this.assert(codeDetails && codeDetails.rule_document_id === codeDoc.rule_document_id, 'Code of Conduct details should match selected document');
      this.assert(codeDetails.category === 'code_of_conduct', 'Code of Conduct document should have code_of_conduct category');

      const saveCodeResult = this.logic.saveRuleDocumentToMyResources(codeDoc.rule_document_id);
      this.assert(saveCodeResult && saveCodeResult.success === true, 'Saving Code of Conduct to My Resources should succeed');
      this.assert(!!saveCodeResult.saved_resource_id, 'Saving Code of Conduct should return saved_resource_id');

      // Verify both resources via My Resources API
      const myResourcesResult = this.logic.getMyResources();
      this.assert(myResourcesResult && Array.isArray(myResourcesResult.resources), 'getMyResources should return resources array');

      const batResource = myResourcesResult.resources.find(r => r.rule_document_id === batRulesDoc.rule_document_id);
      const codeResource = myResourcesResult.resources.find(r => r.rule_document_id === codeDoc.rule_document_id);

      this.assert(batResource, 'My Resources should contain 12U bat rules');
      this.assert(codeResource, 'My Resources should contain Code of Conduct');

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
