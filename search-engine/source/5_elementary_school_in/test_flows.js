// Test runner for business logic
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
    // Generated Data from prompt - used ONLY here
    const generatedData = {
      after_school_programs: [
        {
          id: 'asp_4_math_puzzles',
          name: '4th Grade Math Puzzles Club',
          category: 'math_science',
          description:
            'Students tackle logic puzzles, math games, and problem-solving challenges in a fun, collaborative setting.',
          grade_levels: ['fourth_grade'],
          fee_amount: 25,
          fee_frequency: 'per_month',
          fee_notes: 'Discount available for siblings.',
          schedule_days: ['tuesday', 'thursday'],
          start_time: '3:00 PM',
          end_time: '4:15 PM',
          location: 'Room 204',
          instructor_name: 'Ms. Rivera',
          max_enrollment: 18,
          is_active: true
        },
        {
          id: 'asp_4_math_club',
          name: '4th Grade Math Club',
          category: 'math_science',
          description: 'Preparation for math contests and enrichment beyond the regular curriculum.',
          grade_levels: ['fourth_grade'],
          fee_amount: 35,
          fee_frequency: 'per_month',
          fee_notes: 'Includes materials and snacks.',
          schedule_days: ['monday', 'wednesday'],
          start_time: '3:05 PM',
          end_time: '4:15 PM',
          location: 'Room 210',
          instructor_name: 'Mr. Chen',
          max_enrollment: 20,
          is_active: true
        },
        {
          id: 'asp_4_stem_lab',
          name: '4th Grade STEM Lab',
          category: 'math_science',
          description: 'Hands-on science experiments and engineering challenges for curious minds.',
          grade_levels: ['fourth_grade', 'fifth_grade'],
          fee_amount: 30,
          fee_frequency: 'per_month',
          fee_notes: 'Ends later than most other clubs.',
          schedule_days: ['wednesday'],
          start_time: '2:50 PM',
          end_time: '4:45 PM',
          location: 'Science Lab',
          instructor_name: 'Mrs. Patel',
          max_enrollment: 16,
          is_active: true
        }
      ],
      bus_routes: [
        {
          id: 'route_oak_1',
          route_number: 'B12',
          name: 'Oak Street Early Run',
          description: 'Primary Oak Street route serving the north end of the neighborhood.',
          grade_range: 'k_5_elementary',
          arrival_time_at_school: '7:20 AM',
          school_name: 'Lincoln Elementary School',
          served_streets: ['Oak Street', 'Maple Avenue', '5th Avenue'],
          is_active: true,
          notes: 'This is typically the earliest-arriving Oak Street route.'
        },
        {
          id: 'route_oak_2',
          route_number: 'B18',
          name: 'Oak & Cedar Loop',
          description: 'Serves Oak Street south of 10th and connects to Cedar Lane.',
          grade_range: 'k_5_elementary',
          arrival_time_at_school: '7:32 AM',
          school_name: 'Lincoln Elementary School',
          served_streets: ['Oak Street', 'Cedar Lane', '10th Street'],
          is_active: true,
          notes: ''
        },
        {
          id: 'route_oak_3',
          route_number: 'B24',
          name: 'Oak Street Late Run',
          description: 'Later pickup option for families on Oak Street and Birch Road.',
          grade_range: 'k_5_elementary',
          arrival_time_at_school: '7:44 AM',
          school_name: 'Lincoln Elementary School',
          served_streets: ['Oak Street', 'Birch Road'],
          is_active: true,
          notes: ''
        }
      ],
      events: [
        {
          id: 'event_apr_1st_math_night',
          title: '1st Grade Family Math Night',
          description: 'Interactive math games and activities for 1st graders and their families.',
          location: 'Cafeteria',
          start_datetime: '2026-04-07T17:30:00Z',
          end_datetime: '2026-04-07T19:00:00Z',
          audience: 'first_grade_families',
          grade_levels: ['first_grade'],
          category: 'parent_meeting',
          is_all_day: false,
          external_link: ''
        },
        {
          id: 'event_apr_1st_bedtime_stories',
          title: '1st Grade Bedtime Stories Evening',
          description: 'Students return in pajamas for read-alouds and hot cocoa.',
          location: 'Library',
          start_datetime: '2026-04-14T18:00:00Z',
          end_datetime: '2026-04-14T19:00:00Z',
          audience: 'first_grade_families',
          grade_levels: ['first_grade'],
          category: 'school_event',
          is_all_day: false,
          external_link: ''
        },
        {
          id: 'event_apr_1st_art_share',
          title: '1st Grade Spring Art Share',
          description: "Evening gallery walk featuring 1st graders' spring art projects.",
          location: 'Gym',
          start_datetime: '2026-04-21T19:00:00Z',
          end_datetime: '2026-04-21T20:00:00Z',
          audience: 'first_grade_families',
          grade_levels: ['first_grade'],
          category: 'performance',
          is_all_day: false,
          external_link: ''
        }
      ],
      menu_items: [
        {
          id: 'menu_entree_veggie_pasta',
          name: 'Veggie Marinara Pasta',
          description: 'Whole grain pasta with tomato marinara sauce and mixed vegetables.',
          item_type: 'entree',
          is_vegetarian: true,
          is_nut_free: true,
          other_allergens: ['dairy', 'gluten'],
          calories: 420,
          image_url:
            'https://media.blueapron.com/recipes/3177/square_newsletter_images/1532547337-364-0038-3560/0827_FR05_Pipe-Rigate_13277_WEB_SQ.jpg?quality=80&width=850'
        },
        {
          id: 'menu_entree_cheese_quesadilla',
          name: 'Cheese Quesadilla',
          description: 'Grilled whole wheat tortilla filled with melted cheese, served with salsa.',
          item_type: 'entree',
          is_vegetarian: true,
          is_nut_free: true,
          other_allergens: ['dairy', 'gluten'],
          calories: 380,
          image_url:
            'https://cdn.shortpixel.ai/client/q_glossy,ret_img,w_600,h_900/https://leelalicious.com/wp-content/uploads/2018/03/How-To-Make-Whole-Wheat-Tortillas.jpg'
        },
        {
          id: 'menu_entree_hummus_pita_plate',
          name: 'Hummus & Pita Plate',
          description: 'Hummus with whole wheat pita triangles and fresh veggie sticks.',
          item_type: 'entree',
          is_vegetarian: true,
          is_nut_free: true,
          other_allergens: ['gluten', 'sesame'],
          calories: 350,
          image_url: 'https://pastrychefonline.com/wp-content/uploads/2015/11/a-Whole-Wheat-Pita-2.jpg'
        }
      ],
      menu_weeks: [
        {
          id: 'menu_week_2026_03_09',
          label: 'Week of March 9',
          start_date: '2026-03-09T00:00:00Z',
          end_date: '2026-03-13T23:59:59Z'
        },
        {
          id: 'menu_week_2026_03_02',
          label: 'Week of March 2',
          start_date: '2026-03-02T00:00:00Z',
          end_date: '2026-03-06T23:59:59Z'
        },
        {
          id: 'menu_week_2026_03_16',
          label: 'Week of March 16',
          start_date: '2026-03-16T00:00:00Z',
          end_date: '2026-03-20T23:59:59Z'
        }
      ],
      policy_sections: [
        {
          id: 'policy_2_homework_time',
          grade_level: 'second_grade',
          section_key: 'homework_time_guidelines',
          section_title: '2nd Grade Homework Time Guidelines',
          content:
            'Second graders are expected to read nightly and complete short practice assignments. Homework should typically take no more than 30 minutes per night on school days. If your child is consistently spending more than 30 minutes on homework, please contact the classroom teacher to adjust assignments.',
          nightly_homework_minutes_limit: 30,
          anchor_id: 'second-grade-homework-time-guidelines',
          last_updated: '2025-08-15T00:00:00Z'
        },
        {
          id: 'policy_2_grading_scale',
          grade_level: 'second_grade',
          section_key: 'grading_scale',
          section_title: '2nd Grade Grading Scale',
          content:
            'Second grade uses a standards-based report card. Students receive marks of 4 (Exceeds Standard), 3 (Meets Standard), 2 (Approaching Standard), or 1 (Beginning) for each learning target.',
          nightly_homework_minutes_limit: null,
          anchor_id: 'second-grade-grading-scale',
          last_updated: '2025-08-15T00:00:00Z'
        },
        {
          id: 'policy_2_late_work',
          grade_level: 'second_grade',
          section_key: 'late_work_policy',
          section_title: '2nd Grade Late Work Policy',
          content:
            'Late work is accepted within one week of the original due date. Families will be notified if late work becomes a recurring concern.',
          nightly_homework_minutes_limit: null,
          anchor_id: 'second-grade-late-work',
          last_updated: '2025-08-15T00:00:00Z'
        }
      ],
      staff_members: [
        {
          id: 'staff_linda_chang',
          first_name: 'Linda',
          last_name: 'Chang',
          full_name: 'Linda Chang',
          role_title: '3rd Grade Math Teacher',
          department: '3rd Grade',
          grade_levels: ['third_grade'],
          primary_subject: 'math',
          subjects_taught: ['Math', 'Science (Homeroom)'],
          years_of_experience: 18,
          email: 'linda.chang@lincolnelem.edu',
          phone: '555-201-3401',
          room_number: 'Room 305',
          bio:
            'Ms. Chang has taught 3rd grade math for nearly two decades and loves helping students build confidence with numbers.',
          photo_url:
            'https://metro.co.uk/wp-content/uploads/2015/10/ad_183542461.jpg?quality=90&strip=all&zoom=1&resize=644%2C429',
          is_teacher: true
        },
        {
          id: 'staff_michael_hernandez',
          first_name: 'Michael',
          last_name: 'Hernandez',
          full_name: 'Michael Hernandez',
          role_title: '3rd Grade Math Teacher',
          department: '3rd Grade',
          grade_levels: ['third_grade'],
          primary_subject: 'math',
          subjects_taught: ['Math'],
          years_of_experience: 12,
          email: 'michael.hernandez@lincolnelem.edu',
          phone: '555-201-3402',
          room_number: 'Room 306',
          bio:
            'Mr. Hernandez focuses on real-world problem solving and math games to keep students engaged.',
          photo_url:
            'https://metro.co.uk/wp-content/uploads/2015/10/ad_183542461.jpg?quality=90&strip=all&zoom=1&resize=644%2C429',
          is_teacher: true
        },
        {
          id: 'staff_sarah_kim',
          first_name: 'Sarah',
          last_name: 'Kim',
          full_name: 'Sarah Kim',
          role_title: '3rd Grade Math & Science Teacher',
          department: '3rd Grade',
          grade_levels: ['third_grade'],
          primary_subject: 'math',
          subjects_taught: ['Math', 'Science'],
          years_of_experience: 7,
          email: 'sarah.kim@lincolnelem.edu',
          phone: '555-201-3403',
          room_number: 'Room 307',
          bio:
            'Ms. Kim integrates hands-on science projects into her math instruction whenever possible.',
          photo_url:
            'https://cdn.shopify.com/s/files/1/0514/7918/3543/products/il_fullxfull.2146171090_lljh_530x@2x.jpg?v=1608812091',
          is_teacher: true
        }
      ],
      summer_camp_sessions: [
        {
          id: 'camp_july_stem_1',
          name: 'STEM Explorers Camp',
          description: 'Hands-on science, technology, engineering, and math challenges.',
          location: 'Lincoln Elementary STEM Lab',
          start_date: '2026-07-06T00:00:00Z',
          end_date: '2026-07-10T23:59:59Z',
          month: 'july',
          daily_start_time: '9:00 AM',
          daily_end_time: '3:00 PM',
          weekly_fee: 145,
          currency: 'usd',
          eligible_grades: ['second_grade', 'third_grade', 'fourth_grade'],
          activities_summary: 'Robotics, simple coding, science experiments, and math games.',
          session_label: 'Week of July 6',
          is_active: true
        },
        {
          id: 'camp_july_art_1',
          name: 'Creative Arts Camp',
          description: 'Painting, sculpture, and mixed media projects throughout the week.',
          location: 'Art Room & Courtyard',
          start_date: '2026-07-13T00:00:00Z',
          end_date: '2026-07-17T23:59:59Z',
          month: 'july',
          daily_start_time: '9:00 AM',
          daily_end_time: '3:00 PM',
          weekly_fee: 130,
          currency: 'usd',
          eligible_grades: ['first_grade', 'second_grade', 'third_grade', 'fourth_grade'],
          activities_summary: 'Daily themed art projects, group mural, and outdoor sketching.',
          session_label: 'Week of July 13',
          is_active: true
        },
        {
          id: 'camp_july_sports_1',
          name: 'All-Sports Camp',
          description: 'Multi-sport camp including soccer, basketball, and field games.',
          location: 'Gym & Fields',
          start_date: '2026-07-20T00:00:00Z',
          end_date: '2026-07-24T23:59:59Z',
          month: 'july',
          daily_start_time: '9:00 AM',
          daily_end_time: '3:00 PM',
          weekly_fee: 155,
          currency: 'usd',
          eligible_grades: ['second_grade', 'third_grade', 'fourth_grade', 'fifth_grade'],
          activities_summary: 'Skill drills, scrimmages, and team-building games.',
          session_label: 'Week of July 20',
          is_active: true
        }
      ],
      supply_items: [
        {
          id: 'supply_2_pencil_box',
          grade_level: 'second_grade',
          name: 'Plastic Pencil Box',
          description: 'Sturdy plastic box to hold pencils and crayons.',
          category: 'storage',
          quantity_recommended: 1,
          estimated_cost: 3.5,
          is_required: true,
          notes: ''
        },
        {
          id: 'supply_2_pencils_24',
          grade_level: 'second_grade',
          name: 'No. 2 Pencils (Box of 24)',
          description: 'Standard yellow wooden pencils, pre-sharpened if possible.',
          category: 'writing',
          quantity_recommended: 1,
          estimated_cost: 4.5,
          is_required: true,
          notes: ''
        },
        {
          id: 'supply_2_wide_rule_notebook',
          grade_level: 'second_grade',
          name: 'Wide-Ruled Spiral Notebook',
          description: 'Single-subject notebook for classwork.',
          category: 'paper',
          quantity_recommended: 2,
          estimated_cost: 2,
          is_required: true,
          notes: ''
        }
      ],
      bus_stops: [
        {
          id: 'stop_oak1_1',
          bus_route_id: 'route_oak_1',
          stop_order: 1,
          stop_name: 'Oak St & 1st Ave',
          street_name: 'Oak Street',
          cross_street: '1st Avenue',
          pickup_time: '7:00 AM',
          dropoff_time: '3:05 PM'
        },
        {
          id: 'stop_oak1_2',
          bus_route_id: 'route_oak_1',
          stop_order: 2,
          stop_name: 'Oak St & 3rd Ave',
          street_name: 'Oak Street',
          cross_street: '3rd Avenue',
          pickup_time: '7:07 AM',
          dropoff_time: '3:10 PM'
        },
        {
          id: 'stop_oak1_3',
          bus_route_id: 'route_oak_1',
          stop_order: 3,
          stop_name: 'Maple Ave & 5th Ave',
          street_name: 'Maple Avenue',
          cross_street: '5th Avenue',
          pickup_time: '7:15 AM',
          dropoff_time: '3:18 PM'
        }
      ],
      daily_menu_entries: [
        {
          id: 'dme_2026_03_09_lunch_veg_pasta',
          menu_week_id: 'menu_week_2026_03_09',
          date: '2026-03-09T12:00:00Z',
          day_of_week: 'monday',
          menu_item_id: 'menu_entree_veggie_pasta',
          meal_type: 'lunch',
          is_primary_entree: true
        },
        {
          id: 'dme_2026_03_09_lunch_chicken_nuggets',
          menu_week_id: 'menu_week_2026_03_09',
          date: '2026-03-09T12:00:00Z',
          day_of_week: 'monday',
          menu_item_id: 'menu_entree_chicken_nuggets',
          meal_type: 'lunch',
          is_primary_entree: false
        },
        {
          id: 'dme_2026_03_09_lunch_carrots',
          menu_week_id: 'menu_week_2026_03_09',
          date: '2026-03-09T12:00:00Z',
          day_of_week: 'monday',
          menu_item_id: 'menu_side_carrot_sticks',
          meal_type: 'lunch',
          is_primary_entree: false
        }
      ]
    };

    // Populate localStorage using storage keys
    localStorage.setItem('after_school_programs', JSON.stringify(generatedData.after_school_programs || []));
    localStorage.setItem('bus_routes', JSON.stringify(generatedData.bus_routes || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('menu_items', JSON.stringify(generatedData.menu_items || []));
    localStorage.setItem('menu_weeks', JSON.stringify(generatedData.menu_weeks || []));
    localStorage.setItem('policy_sections', JSON.stringify(generatedData.policy_sections || []));
    localStorage.setItem('staff_members', JSON.stringify(generatedData.staff_members || []));
    localStorage.setItem('summer_camp_sessions', JSON.stringify(generatedData.summer_camp_sessions || []));
    localStorage.setItem('supply_items', JSON.stringify(generatedData.supply_items || []));
    localStorage.setItem('bus_stops', JSON.stringify(generatedData.bus_stops || []));
    localStorage.setItem('daily_menu_entries', JSON.stringify(generatedData.daily_menu_entries || []));

    // Ensure collections that will be written are initialized if _initStorage did not
    const ensureArray = function (key) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };
    ensureArray('program_favorites');
    ensureArray('meal_plan_weeks');
    ensureArray('meal_plan_entries');
    ensureArray('saved_routes');
    ensureArray('saved_events');
    ensureArray('teacher_messages');
    ensureArray('bookmarks');
    ensureArray('supply_checklists');
    ensureArray('supply_checklist_items');
    ensureArray('camp_interest_submissions');
  }

  // Helper: simple time parser for 'h:mm AM/PM'
  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  // Helper: compare two time strings; returns negative if a < b
  compareTimes(a, b) {
    const ma = this.parseTimeToMinutes(a);
    const mb = this.parseTimeToMinutes(b);
    if (ma == null || mb == null) return 0;
    return ma - mb;
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveEarliestFourthGradeMathClub();
    this.testTask2_PlanVegetarianNutFreeLunchesWeekOfMarch9();
    this.testTask3_SaveEarliestBusRouteToOakStreetBefore745();
    this.testTask4_SaveTwoAprilEveningEventsForFirstGradeFamilies();
    this.testTask5_ContactMostExperiencedThirdGradeMathTeacher();
    this.testTask6_BookmarkSecondGradeHomework30MinuteLimit();
    this.testTask7_CreateSecondGradeSupplyChecklistUnderFiveDollars();
    this.testTask8_SubmitInterestForJulyCamp9To3Under150();

    return this.results;
  }

  // Task 1
  testTask1_SaveEarliestFourthGradeMathClub() {
    const testName = 'Task 1: Save earliest 4th-grade math club under $40 ending by 4:30 PM';
    console.log('Testing:', testName);

    try {
      const maxFee = 40;
      const endTimeCutoff = '4:30 PM';

      const filters = {
        grade_levels: ['fourth_grade'],
        categories: ['math_science'],
        max_fee_amount: maxFee,
        fee_frequency: 'per_month',
        end_time_before: endTimeCutoff,
        is_active_only: true
      };

      const programs = this.logic.searchAfterSchoolPrograms(filters, 'start_time_asc');

      this.assert(programs && programs.length > 0, 'Should find at least one matching after-school program');

      // Verify all results satisfy the filters using actual response data
      const cutoffMinutes = this.parseTimeToMinutes(endTimeCutoff);
      for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        this.assert(p.is_active === true, 'Program should be active');
        this.assert(
          Array.isArray(p.grade_levels) && p.grade_levels.indexOf('fourth_grade') !== -1,
          'Program should include 4th grade in grade_levels'
        );
        this.assert(p.category === 'math_science', 'Program category should be math_science');
        this.assert(p.fee_frequency === 'per_month', 'Fee frequency should be per_month');
        this.assert(p.fee_amount <= maxFee, 'Program fee should be <= max fee');
        const endMinutes = this.parseTimeToMinutes(p.end_time);
        if (cutoffMinutes != null && endMinutes != null) {
          this.assert(endMinutes <= cutoffMinutes, 'Program should end by cutoff time');
        }
      }

      // Verify sorted by earliest start time
      for (let i = 1; i < programs.length; i++) {
        const prev = programs[i - 1];
        const curr = programs[i];
        this.assert(
          this.compareTimes(prev.start_time, curr.start_time) <= 0,
          'Programs should be sorted by start time ascending'
        );
      }

      const earliestProgram = programs[0];

      // Save/favorite earliest program
      const saveResult = this.logic.saveAfterSchoolProgramFavorite(earliestProgram.id);
      this.assert(saveResult && saveResult.success === true, 'Saving program favorite should succeed');
      this.assert(!!saveResult.favorite_id, 'Favorite should return an ID');

      // Verify favorite persisted via another search call
      const programsAfterSave = this.logic.searchAfterSchoolPrograms(filters, 'start_time_asc');
      const favorited = programsAfterSave.find(function (p) {
        return p.id === earliestProgram.id;
      });
      this.assert(!!favorited, 'Earliest program should still appear in filtered results');
      this.assert(
        favorited.is_favorited === true,
        'Earliest program should be marked as favorited after saving'
      );

      // Verify localStorage relationship ProgramFavorite -> AfterSchoolProgram
      const favRaw = localStorage.getItem('program_favorites') || '[]';
      const favorites = JSON.parse(favRaw);
      const storedFav = favorites.find(function (f) {
        return f.program_id === earliestProgram.id;
      });
      this.assert(!!storedFav, 'ProgramFavorite should be stored in localStorage for the program');
      this.assert(!!storedFav.saved_at, 'ProgramFavorite should have a saved_at timestamp');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2 (adapted to available data: add up to 3 vegetarian, nut-free lunches for Week of March 9)
  testTask2_PlanVegetarianNutFreeLunchesWeekOfMarch9() {
    const testName = 'Task 2: Plan vegetarian, nut-free school lunches for Week of March 9 (up to 3 days)';
    console.log('Testing:', testName);

    try {
      const menuWeeks = this.logic.getMenuWeeks();
      this.assert(Array.isArray(menuWeeks) && menuWeeks.length > 0, 'Should return at least one menu week');

      const targetWeek = menuWeeks.find(function (w) {
        return typeof w.label === 'string' && w.label.indexOf('Week of March 9') !== -1;
      });
      this.assert(!!targetWeek, 'Should find MenuWeek labeled Week of March 9');

      const menuWeekId = targetWeek.id;

      const lunchMenu = this.logic.getLunchMenuForWeek(menuWeekId, {
        meal_type: 'lunch',
        is_vegetarian: true,
        is_nut_free: true
      });

      this.assert(lunchMenu && Array.isArray(lunchMenu.days), 'Lunch menu days should be returned');

      // Collect up to 3 different days with qualifying vegetarian, nut-free primary entrees
      const maxDaysToPlan = 3;
      const plannedMeals = [];

      // Sort days by date ascending using actual dates
      const daysSorted = lunchMenu.days.slice().sort(function (a, b) {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return da - db;
      });

      for (let i = 0; i < daysSorted.length && plannedMeals.length < maxDaysToPlan; i++) {
        const day = daysSorted[i];
        const entries = Array.isArray(day.entries) ? day.entries : [];

        // Filter entries that are primary lunch entrees and still satisfy veg/nut-free indicators
        const qualifying = entries.filter(function (e) {
          return (
            e.meal_type === 'lunch' &&
            e.item_type === 'entree' &&
            e.is_primary_entree === true &&
            e.is_vegetarian === true &&
            e.is_nut_free === true
          );
        });

        if (qualifying.length === 0) continue;

        const entree = qualifying[0];
        const dateOnly = day.date.split('T')[0];

        const addResult = this.logic.addMealToPlanner(menuWeekId, dateOnly, entree.menu_item_id);
        this.assert(addResult && addResult.success === true, 'addMealToPlanner should succeed');
        this.assert(addResult.meal_plan_week && addResult.meal_plan_week.id, 'Meal plan week should be created or returned');

        plannedMeals.push({
          date: dateOnly,
          menu_item_id: entree.menu_item_id
        });
      }

      this.assert(
        plannedMeals.length > 0,
        'Should plan at least one vegetarian, nut-free lunch for the week'
      );

      // Verify in Meal Planner
      const mealPlan = this.logic.getMealPlanForWeek(menuWeekId);
      this.assert(mealPlan && Array.isArray(mealPlan.entries_by_day), 'Meal plan entries_by_day should be returned');

      // Map for easier lookup
      const entriesByDate = {};
      for (let i = 0; i < mealPlan.entries_by_day.length; i++) {
        const day = mealPlan.entries_by_day[i];
        entriesByDate[day.date] = day.entries || [];
      }

      for (let i = 0; i < plannedMeals.length; i++) {
        const pm = plannedMeals[i];
        const entries = entriesByDate[pm.date] || [];
        const match = entries.find(function (e) {
          return e.menu_item_id === pm.menu_item_id;
        });
        this.assert(!!match, 'Planned entree should appear in meal planner for its date');
        this.assert(match.is_vegetarian === true, 'Planned entree should be vegetarian');
        this.assert(match.is_nut_free === true, 'Planned entree should be nut-free');
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3
  testTask3_SaveEarliestBusRouteToOakStreetBefore745() {
    const testName = 'Task 3: Save earliest bus route to Oak Street arriving before 7:45 AM';
    console.log('Testing:', testName);

    try {
      const options = this.logic.getBusRouteFilterOptions();
      this.assert(options && options.grade_ranges && options.arrival_time_windows, 'Bus route filter options should be available');

      // Get grade_range value for K-5 Elementary if present, otherwise default to k_5_elementary
      let gradeRangeValue = 'k_5_elementary';
      const gradeOpt = options.grade_ranges.find(function (g) {
        return (
          (typeof g.label === 'string' && g.label.toLowerCase().indexOf('k-5') !== -1) ||
          g.value === 'k_5_elementary'
        );
      });
      if (gradeOpt) gradeRangeValue = gradeOpt.value;

      // Get arrival_time_window for 'Arrives before 7:45 AM'
      let arrivalWindowValue = null;
      const arrivalOpt = options.arrival_time_windows.find(function (w) {
        return (
          (typeof w.label === 'string' && w.label.indexOf('7:45') !== -1) ||
          (typeof w.cutoff_time === 'string' && w.cutoff_time.indexOf('7:45') !== -1)
        );
      });
      if (arrivalOpt) {
        arrivalWindowValue = arrivalOpt.value;
      }

      const filters = {
        grade_range: gradeRangeValue,
        arrival_time_window: arrivalWindowValue,
        is_active_only: true
      };

      const routes = this.logic.searchBusRoutes('Oak Street', filters, 'arrival_time_asc');

      this.assert(Array.isArray(routes) && routes.length > 0, 'Should find at least one Oak Street route');

      // Verify filters
      const cutoffMinutes = this.parseTimeToMinutes('7:45 AM');
      for (let i = 0; i < routes.length; i++) {
        const r = routes[i];
        this.assert(r.is_active === true, 'Route should be active');
        this.assert(r.grade_range === gradeRangeValue, 'Route grade range should match filter');

        const servesOak = Array.isArray(r.served_streets)
          ? r.served_streets.some(function (s) {
              return typeof s === 'string' && s.toLowerCase().indexOf('oak street') !== -1;
            })
          : false;
        this.assert(servesOak, 'Route should serve Oak Street');

        const arrivalMinutes = this.parseTimeToMinutes(r.arrival_time_at_school);
        if (cutoffMinutes != null && arrivalMinutes != null) {
          this.assert(arrivalMinutes <= cutoffMinutes, 'Route should arrive before or at 7:45 AM');
        }
      }

      // Verify sorted by earliest arrival
      for (let i = 1; i < routes.length; i++) {
        const prev = routes[i - 1];
        const curr = routes[i];
        this.assert(
          this.compareTimes(prev.arrival_time_at_school, curr.arrival_time_at_school) <= 0,
          'Routes should be sorted by arrival time ascending'
        );
      }

      const earliestRoute = routes[0];

      // Load route detail
      const detail = this.logic.getBusRouteDetail(earliestRoute.id);
      this.assert(detail && detail.route && detail.route.id === earliestRoute.id, 'Route detail should match selected route');
      this.assert(Array.isArray(detail.stops), 'Route stops list should be returned');

      const servesOakDetail = Array.isArray(detail.route.served_streets)
        ? detail.route.served_streets.some(function (s) {
            return typeof s === 'string' && s.toLowerCase().indexOf('oak street') !== -1;
          })
        : false;
      this.assert(servesOakDetail, 'Route detail should show service to Oak Street');

      // Save to My Routes
      const saveResult = this.logic.saveBusRouteToMyRoutes(earliestRoute.id);
      this.assert(saveResult && saveResult.success === true, 'Saving route to My Routes should succeed');
      this.assert(!!saveResult.saved_route_id, 'Saved route should have an ID');

      // Verify via getMyRoutes
      const myRoutes = this.logic.getMyRoutes();
      this.assert(Array.isArray(myRoutes), 'My Routes should return an array');
      const saved = myRoutes.find(function (sr) {
        return sr.bus_route_id === earliestRoute.id;
      });
      this.assert(!!saved, 'Saved route should appear in My Routes');
      this.assert(!!saved.saved_at, 'Saved route should have saved_at timestamp');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4
  testTask4_SaveTwoAprilEveningEventsForFirstGradeFamilies() {
    const testName = 'Task 4: Save two April evening events for 1st-grade families between 5–8 PM';
    console.log('Testing:', testName);

    try {
      const options = this.logic.getCalendarFilterOptions();
      this.assert(options && options.audiences && options.time_of_day_ranges, 'Calendar filter options should be available');

      // Audience: 1st Grade Families
      let audienceValue = 'first_grade_families';
      const audienceOpt = options.audiences.find(function (a) {
        return (
          (typeof a.label === 'string' && a.label.toLowerCase().indexOf('1st grade') !== -1) ||
          a.value === 'first_grade_families'
        );
      });
      if (audienceOpt) audienceValue = audienceOpt.value;

      // Time of day: 5–8 PM
      let timeRangeValue = null;
      let rangeStartMinutes = null;
      let rangeEndMinutes = null;
      const self = this;
      const timeRangeOpt = options.time_of_day_ranges.find(function (r) {
        return (
          (typeof r.label === 'string' && r.label.indexOf('5:00') !== -1) ||
          (typeof r.start_time === 'string' && r.start_time.indexOf('5:00') !== -1)
        );
      });
      if (timeRangeOpt) {
        timeRangeValue = timeRangeOpt.value;
        rangeStartMinutes = self.parseTimeToMinutes(timeRangeOpt.start_time);
        rangeEndMinutes = self.parseTimeToMinutes(timeRangeOpt.end_time);
      }

      const filters = {
        audience: audienceValue,
        time_of_day_range: timeRangeValue
      };

      const year = 2026;
      const month = 4; // April
      const eventsResult = this.logic.searchCalendarEvents(month, year, filters, 'start_datetime_asc');

      this.assert(eventsResult && Array.isArray(eventsResult.events), 'Calendar events should be returned');
      this.assert(eventsResult.events.length >= 2, 'Should have at least two matching April evening events');

      const events = eventsResult.events;

      // Verify filters applied
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        this.assert(ev.audience === audienceValue, 'Event audience should match filter');

        const dt = new Date(ev.start_datetime);
        // Use UTC hours/minutes to avoid timezone ambiguity
        const minutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
        if (rangeStartMinutes != null && rangeEndMinutes != null) {
          this.assert(
            minutes >= rangeStartMinutes && minutes <= rangeEndMinutes,
            'Event start time should be within selected time-of-day range'
          );
        }
        this.assert(dt.getUTCMonth() + 1 === month, 'Event month should be April');
        this.assert(dt.getUTCFullYear() === year, 'Event year should be 2026');
      }

      // First two events by start time
      const firstEvent = events[0];
      const secondEvent = events[1];

      // Open details (simulate new tabs)
      const firstDetail = this.logic.getEventDetail(firstEvent.id);
      const secondDetail = this.logic.getEventDetail(secondEvent.id);
      this.assert(firstDetail && firstDetail.id === firstEvent.id, 'First event detail ID should match');
      this.assert(secondDetail && secondDetail.id === secondEvent.id, 'Second event detail ID should match');

      // Save both events
      const saveFirst = this.logic.saveEventToMyEvents(firstEvent.id);
      const saveSecond = this.logic.saveEventToMyEvents(secondEvent.id);
      this.assert(saveFirst && saveFirst.success === true, 'Saving first event should succeed');
      this.assert(saveSecond && saveSecond.success === true, 'Saving second event should succeed');

      // Verify via My Events
      const myEvents = this.logic.getMyEvents();
      this.assert(Array.isArray(myEvents), 'My Events should return an array');
      const savedFirst = myEvents.find(function (e) {
        return e.event_id === firstEvent.id;
      });
      const savedSecond = myEvents.find(function (e) {
        return e.event_id === secondEvent.id;
      });
      this.assert(!!savedFirst, 'First event should appear in My Events');
      this.assert(!!savedSecond, 'Second event should appear in My Events');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5
  testTask5_ContactMostExperiencedThirdGradeMathTeacher() {
    const testName = 'Task 5: Contact the most experienced 3rd-grade math teacher';
    console.log('Testing:', testName);

    try {
      // Use Staff Directory search
      const filters = {
        grade_level: 'third_grade',
        primary_subject: 'math',
        is_teacher_only: true
      };

      const teachers = this.logic.searchStaffDirectory(filters, 'experience_desc');
      this.assert(Array.isArray(teachers) && teachers.length > 0, 'Should find at least one 3rd-grade math teacher');

      // Verify sorted by experience descending
      for (let i = 1; i < teachers.length; i++) {
        this.assert(
          teachers[i - 1].years_of_experience >= teachers[i].years_of_experience,
          'Teachers should be sorted by years_of_experience descending'
        );
      }

      const mostExperienced = teachers[0];

      // Verify most experienced really has max experience among returned
      const maxExperience = teachers.reduce(function (max, t) {
        return t.years_of_experience > max ? t.years_of_experience : max;
      }, -1);
      this.assert(
        mostExperienced.years_of_experience === maxExperience,
        'First teacher should have the most years of experience in result set'
      );

      // Load profile
      const profile = this.logic.getTeacherProfile(mostExperienced.id);
      this.assert(profile && profile.id === mostExperienced.id, 'Teacher profile ID should match');
      this.assert(profile.is_teacher === true, 'Profile should be a teacher');

      // Send message
      const parentName = 'Jordan Lee';
      const studentName = 'Mia Lee';
      const email = 'parent@example.com';
      const messageBody = 'Hello, I would like to learn more about math homework expectations this year.';

      const sendResult = this.logic.sendTeacherMessage(
        mostExperienced.id,
        parentName,
        studentName,
        email,
        messageBody
      );

      this.assert(sendResult && sendResult.success === true, 'sendTeacherMessage should succeed');
      this.assert(!!sendResult.teacher_message_id, 'Teacher message should have an ID');
      this.assert(sendResult.status === 'sent', 'Message status should be sent');

      // Verify TeacherMessage stored with relationship to StaffMember
      const msgRaw = localStorage.getItem('teacher_messages') || '[]';
      const messages = JSON.parse(msgRaw);
      const storedMsg = messages.find(function (m) {
        return m.id === sendResult.teacher_message_id;
      });
      this.assert(!!storedMsg, 'TeacherMessage should be stored in localStorage');
      this.assert(
        storedMsg.staff_member_id === mostExperienced.id,
        'TeacherMessage.staff_member_id should reference the selected teacher'
      );
      this.assert(storedMsg.parent_name === parentName, 'TeacherMessage parent_name should match input');
      this.assert(storedMsg.student_name === studentName, 'TeacherMessage student_name should match input');
      this.assert(storedMsg.email === email, 'TeacherMessage email should match input');
      this.assert(
        typeof storedMsg.message_body === 'string' && storedMsg.message_body.length > 0,
        'TeacherMessage should contain a non-empty message_body'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6
  testTask6_BookmarkSecondGradeHomework30MinuteLimit() {
    const testName = 'Task 6: Bookmark 2nd-grade homework policy limiting nightly homework to 30 minutes';
    console.log('Testing:', testName);

    try {
      // Get grade levels to ensure second_grade is available
      const gradeLevels = this.logic.getPolicyGradeLevels();
      this.assert(Array.isArray(gradeLevels), 'Policy grade levels should be returned');
      const hasSecond = gradeLevels.some(function (g) {
        return g.value === 'second_grade';
      });
      this.assert(hasSecond, 'Policy grade levels should include second_grade');

      const sections = this.logic.getPolicySectionsForGrade('second_grade');
      this.assert(Array.isArray(sections) && sections.length > 0, 'Should load policy sections for 2nd grade');

      const homeworkSection = sections.find(function (s) {
        return s.section_key === 'homework_time_guidelines';
      });
      this.assert(!!homeworkSection, 'Should find Homework Time Guidelines section for 2nd grade');

      // Verify 30-minute nightly limit using actual data
      this.assert(
        typeof homeworkSection.nightly_homework_minutes_limit === 'number' &&
          homeworkSection.nightly_homework_minutes_limit === 30,
        'Homework section should specify a 30-minute nightly homework limit'
      );

      // Bookmark this section
      const bookmarkResult = this.logic.bookmarkPolicySection(homeworkSection.id);
      this.assert(bookmarkResult && bookmarkResult.success === true, 'Bookmarking policy section should succeed');
      this.assert(!!bookmarkResult.bookmark_id, 'Bookmark should have an ID');
      this.assert(bookmarkResult.bookmark, 'Bookmark payload should be returned');
      this.assert(
        bookmarkResult.bookmark.policy_section_id === homeworkSection.id,
        'Bookmark.policy_section_id should reference the homework section'
      );

      // Verify via My Bookmarks
      const myBookmarks = this.logic.getMyBookmarks();
      this.assert(Array.isArray(myBookmarks), 'My Bookmarks should return an array');
      const stored = myBookmarks.find(function (b) {
        return b.policy_section_id === homeworkSection.id;
      });
      this.assert(!!stored, 'Bookmark should appear in My Bookmarks');
      this.assert(
        typeof stored.section_title_snapshot === 'string' && stored.section_title_snapshot.length > 0,
        'Bookmark should store a section_title_snapshot'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7 (adapted: use available 2nd-grade items <= $5, even though all are required)
  testTask7_CreateSecondGradeSupplyChecklistUnderFiveDollars() {
    const testName = 'Task 7: Create 2nd-grade supply checklist with items costing $5 or less';
    console.log('Testing:', testName);

    try {
      const gradeLevels = this.logic.getSupplyGradeLevels();
      this.assert(Array.isArray(gradeLevels), 'Supply grade levels should be returned');
      const hasSecond = gradeLevels.some(function (g) {
        return g.value === 'second_grade';
      });
      this.assert(hasSecond, 'Supply grade levels should include second_grade');

      // Get supply list sorted by estimated cost (low to high)
      const list = this.logic.getSupplyListForGrade('second_grade', {
        optional_items_only: false,
        sort_by: 'estimated_cost_asc'
      });

      this.assert(list && Array.isArray(list.items), 'Supply list items should be returned');

      const maxCost = 5.0;
      const affordableItems = list.items.filter(function (item) {
        return typeof item.estimated_cost === 'number' && item.estimated_cost <= maxCost;
      });

      this.assert(affordableItems.length > 0, 'Should have at least one 2nd-grade supply item costing $5 or less');

      const maxItemsToAdd = Math.min(4, affordableItems.length);
      const addedItemIds = [];
      let checklistId = null;

      for (let i = 0; i < maxItemsToAdd; i++) {
        const item = affordableItems[i];
        const addResult = this.logic.addSupplyItemToChecklist('second_grade', item.id, item.quantity_recommended);
        this.assert(addResult && addResult.success === true, 'addSupplyItemToChecklist should succeed');
        this.assert(!!addResult.supply_checklist_id, 'Supply checklist ID should be returned');
        this.assert(addResult.added_item && addResult.added_item.checklist_item_id, 'Added item should contain checklist item ID');

        checklistId = addResult.supply_checklist_id;
        addedItemIds.push(item.id);
      }

      // Verify via My Supply Checklist
      const checklistData = this.logic.getMySupplyChecklist('second_grade');
      this.assert(checklistData && Array.isArray(checklistData.checklists), 'My Supply Checklist should return checklists');

      const checklist = checklistData.checklists.find(function (c) {
        return c.supply_checklist_id === checklistId;
      });
      this.assert(!!checklist, 'Created checklist should be present in My Supply Checklist');
      this.assert(Array.isArray(checklist.items), 'Checklist should contain items array');

      // Ensure all added items are present with cost <= $5
      for (let i = 0; i < addedItemIds.length; i++) {
        const supplyItemId = addedItemIds[i];
        const checklistItem = checklist.items.find(function (ci) {
          return ci.supply_item_id === supplyItemId;
        });
        this.assert(!!checklistItem, 'Added supply item should appear in checklist');
        this.assert(
          typeof checklistItem.estimated_cost_snapshot === 'number' &&
            checklistItem.estimated_cost_snapshot <= maxCost,
          'Checklist item cost snapshot should be <= $5'
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8
  testTask8_SubmitInterestForJulyCamp9To3Under150() {
    const testName = 'Task 8: Submit interest form for July camp 9 AM–3 PM under $150/week';
    console.log('Testing:', testName);

    try {
      const options = this.logic.getSummerCampFilterOptions();
      this.assert(
        options && options.months && options.daily_schedule_options,
        'Summer camp filter options should be available'
      );

      // Month: July
      let monthValue = 'july';
      const monthOpt = options.months.find(function (m) {
        return (typeof m.label === 'string' && m.label.toLowerCase().indexOf('july') !== -1) || m.value === 'july';
      });
      if (monthOpt) monthValue = monthOpt.value;

      // Daily schedule: 9:00 AM–3:00 PM
      let scheduleValue = null;
      const self = this;
      const scheduleOpt = options.daily_schedule_options.find(function (d) {
        return (
          (typeof d.label === 'string' && d.label.indexOf('9:00 AM') !== -1 && d.label.indexOf('3:00 PM') !== -1) ||
          (typeof d.daily_start_time === 'string' &&
            typeof d.daily_end_time === 'string' &&
            self.parseTimeToMinutes(d.daily_start_time) === self.parseTimeToMinutes('9:00 AM') &&
            self.parseTimeToMinutes(d.daily_end_time) === self.parseTimeToMinutes('3:00 PM'))
        );
      });
      if (scheduleOpt) scheduleValue = scheduleOpt.value;

      const maxWeeklyFee = 150;

      const filters = {
        month: monthValue,
        daily_schedule_value: scheduleValue,
        max_weekly_fee: maxWeeklyFee,
        is_active_only: true
      };

      const sessions = this.logic.searchSummerCampSessions(filters, 'start_date_asc');
      this.assert(Array.isArray(sessions) && sessions.length > 0, 'Should find at least one July camp session matching filters');

      // Verify filters on returned sessions
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        this.assert(s.month === monthValue, 'Session month should be July');
        this.assert(
          typeof s.weekly_fee === 'number' && s.weekly_fee <= maxWeeklyFee,
          'Session weekly fee should be <= max weekly fee filter'
        );
        this.assert(s.is_active === true, 'Session should be active');
        this.assert(
          this.parseTimeToMinutes(s.daily_start_time) === this.parseTimeToMinutes('9:00 AM'),
          'Session daily start time should be 9:00 AM'
        );
        this.assert(
          this.parseTimeToMinutes(s.daily_end_time) === this.parseTimeToMinutes('3:00 PM'),
          'Session daily end time should be 3:00 PM'
        );
      }

      // Sessions should be sorted by start_date ascending
      for (let i = 1; i < sessions.length; i++) {
        const prev = new Date(sessions[i - 1].start_date).getTime();
        const curr = new Date(sessions[i].start_date).getTime();
        this.assert(prev <= curr, 'Camp sessions should be sorted by start_date ascending');
      }

      const chosenSession = sessions[0];

      // Load session detail
      const detail = this.logic.getSummerCampSessionDetail(chosenSession.id);
      this.assert(detail && detail.id === chosenSession.id, 'Camp session detail ID should match');

      // Submit interest form
      const childName = 'Alex Rivera';
      const upcomingGrade = 'third_grade';
      const guardianName = 'Sam Rivera';
      const phoneNumber = '555-123-4567';
      const email = 'sam.rivera@example.com';
      const preferredSessionLabel = chosenSession.session_label;

      const submitResult = this.logic.submitCampInterestForm(
        chosenSession.id,
        childName,
        upcomingGrade,
        guardianName,
        phoneNumber,
        email,
        preferredSessionLabel
      );

      this.assert(submitResult && submitResult.success === true, 'Camp interest submission should succeed');
      this.assert(!!submitResult.camp_interest_submission_id, 'Camp interest submission should have an ID');
      this.assert(submitResult.status === 'submitted', 'Submission status should be submitted');

      // Verify CampInterestSubmission stored and linked to SummerCampSession
      const raw = localStorage.getItem('camp_interest_submissions') || '[]';
      const submissions = JSON.parse(raw);
      const stored = submissions.find(function (c) {
        return c.id === submitResult.camp_interest_submission_id;
      });
      this.assert(!!stored, 'CampInterestSubmission should be stored in localStorage');
      this.assert(
        stored.camp_session_id === chosenSession.id,
        'CampInterestSubmission.camp_session_id should reference chosen session'
      );
      this.assert(stored.child_name === childName, 'Child name should match input');
      this.assert(stored.upcoming_grade === upcomingGrade, 'Upcoming grade should match input');
      this.assert(stored.guardian_name === guardianName, 'Guardian name should match input');
      this.assert(stored.phone_number === phoneNumber, 'Phone number should match input');
      this.assert(
        stored.preferred_session_label === preferredSessionLabel,
        'Preferred session label should match chosen session label'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Assertions and result recording
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

// Export for Node.js ONLY
module.exports = TestRunner;
