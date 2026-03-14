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
    // Generated Data from prompt - used ONLY for initial setup / seeding
    const generatedData = {
      articles: [
        {
          id: 'art_under_10k_2026_overview',
          title: 'How to Plan a Beautiful Wedding Under $10,000 (2026 Edition)',
          slug: 'plan-wedding-under-10000-2026',
          category_id: 'budget_money',
          summary: 'A step-by-step guide to planning a stylish wedding on a budget of $10,000 or less, including sample allocations and saving tips.',
          content: 'Planning a wedding under $10,000 is absolutely possible with clear priorities and a realistic budget. In this guide, we break down venue, food, attire, decor, photography and more, showing sample allocations for different guest counts. You\'ll also find cost-saving strategies like off-peak dates, brunch receptions, and borrowing decor.',
          published_at: '2026-02-14T09:00:00Z',
          popularity_score: 98,
          overall_budget_min: 0,
          overall_budget_max: 10000,
          overall_budget_label: 'Under $10,000',
          guest_count_min: 50,
          guest_count_max: 120,
          guest_count_label: '50–120 guests',
          venue_style_tags: [],
          budget_per_guest_min: 0,
          budget_per_guest_max: 0,
          budget_per_guest_label: '',
          is_budget_breakdown: true,
          average_catering_cost_per_guest: 45,
          has_backup_indoor_space: false,
          hero_image: 'https://tse1.mm.bing.net/th?id=OIP.87Kb540JOnrClWPU-DQq_wHaJ1&pid=Api',
          tags: ['budget', 'under_10000', 'planning_basics', 'sample_budget'],
          read_time_minutes: 11
        },
        {
          id: 'art_under_10k_brunch_cityhall',
          title: 'City Hall Ceremony & Brunch Reception: $10,000 All-In Sample Budget',
          slug: 'city-hall-brunch-10000-sample-budget',
          category_id: 'budget_money',
          summary: 'See exactly how to allocate a $10,000 budget for a city hall ceremony followed by a brunch reception for 60–80 guests.',
          content: 'This article walks through a sample $10,000 budget for a city hall ceremony and brunch reception. We cover permit fees, photography coverage, a brunch buffet, limited bar, simple florals, and a small dessert table. A detailed line-item budget shows how each dollar is allocated.',
          published_at: '2025-12-01T12:00:00Z',
          popularity_score: 92,
          overall_budget_min: 0,
          overall_budget_max: 10000,
          overall_budget_label: 'Under $10,000',
          guest_count_min: 60,
          guest_count_max: 80,
          guest_count_label: '60–80 guests',
          venue_style_tags: [],
          budget_per_guest_min: 0,
          budget_per_guest_max: 0,
          budget_per_guest_label: '',
          is_budget_breakdown: true,
          average_catering_cost_per_guest: 38,
          has_backup_indoor_space: false,
          hero_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
          tags: ['budget', 'under_10000', 'city_hall', 'brunch'],
          read_time_minutes: 9
        },
        {
          id: 'art_under_10k_backyard_80_guests',
          title: 'Backyard Wedding Budget: Under $10,000 for 80 Guests',
          slug: 'backyard-wedding-budget-under-10000-80-guests',
          category_id: 'budget_money',
          summary: 'A realistic budget breakdown for hosting 70–80 guests in a backyard wedding for less than $10,000.',
          content: 'Backyard weddings can save on venue fees but add costs for rentals, restrooms, and lighting. This article lays out a sample budget under $10,000, including tenting, basic rentals, buffet catering, and DIY decor. We also discuss where you can safely cut costs and where you shouldn’t.',
          published_at: '2025-08-10T15:30:00Z',
          popularity_score: 88,
          overall_budget_min: 0,
          overall_budget_max: 10000,
          overall_budget_label: 'Under $10,000',
          guest_count_min: 70,
          guest_count_max: 80,
          guest_count_label: '70–80 guests',
          venue_style_tags: ['backyard'],
          budget_per_guest_min: 0,
          budget_per_guest_max: 0,
          budget_per_guest_label: '',
          is_budget_breakdown: true,
          average_catering_cost_per_guest: 32,
          has_backup_indoor_space: false,
          hero_image: 'https://meganandkenneth.com/wp-content/uploads/2021/01/MollyAlex_B__3567.jpg',
          tags: ['budget', 'under_10000', 'backyard', 'sample_budget'],
          read_time_minutes: 10
        }
      ],
      budget_categories: [
        {
          id: 'bc_catering',
          name: 'Catering',
          slug: 'catering',
          sort_order: 1
        },
        {
          id: 'bc_venue',
          name: 'Venue',
          slug: 'venue',
          sort_order: 2
        },
        {
          id: 'bc_decor',
          name: 'Decor & Flowers',
          slug: 'decor',
          sort_order: 3
        }
      ],
      checklist_templates: [
        {
          id: 'chk_6mo_under15k_80_120',
          title: '6-Month Checklist: Under $15,000, 80–120 Guests',
          description: 'A condensed 6-month wedding planning checklist tailored to budgets under $15,000 and medium guest counts.',
          timeline_months: 6,
          budget_min: 0,
          budget_max: 15000,
          budget_label: 'Under $15,000',
          guest_count_min: 80,
          guest_count_max: 120,
          guest_count_label: '80–120 guests',
          created_at: '2025-11-01T10:00:00Z'
        },
        {
          id: 'chk_12mo_classic_150_200',
          title: '12-Month Checklist: Classic Wedding, 150–200 Guests',
          description: 'A traditional 12-month planning timeline for a larger classic wedding with a sit-down reception.',
          timeline_months: 12,
          budget_min: 20000,
          budget_max: 50000,
          budget_label: '$20,000–$50,000',
          guest_count_min: 150,
          guest_count_max: 200,
          guest_count_label: '150–200 guests',
          created_at: '2024-10-15T09:30:00Z'
        },
        {
          id: 'chk_9mo_destination',
          title: '9-Month Checklist: Destination Wedding',
          description: 'Planning milestones for a 9-month destination wedding timeline, including travel and group room blocks.',
          timeline_months: 9,
          budget_min: 15000,
          budget_max: 60000,
          budget_label: '$15,000–$60,000',
          guest_count_min: 30,
          guest_count_max: 100,
          guest_count_label: '30–100 guests',
          created_at: '2025-03-05T14:00:00Z'
        }
      ],
      color_palettes: [
        {
          id: 'cp_sage_gold_neutral_1',
          name: 'Soft Sage & Antique Gold Neutrals',
          slug: 'soft-sage-antique-gold-neutrals',
          preview_image: 'https://www.theweddingring.ca/wp-content/uploads/2020/02/Cameron-Shaver-Photography.jpg',
          tags: ['Sage Green', 'Gold', 'Neutrals', 'Romantic'],
          palette_type: 'includes_neutrals',
          swatches: [
            { hex: '#9CAF88', name: 'Sage Green', position: 1 },
            { hex: '#D4AF37', name: 'Antique Gold', position: 2 },
            { hex: '#F5F0E8', name: 'Warm Ivory', position: 3 },
            { hex: '#C2B8A3', name: 'Soft Taupe', position: 4 }
          ]
        },
        {
          id: 'cp_sage_gold_modern_2',
          name: 'Modern Sage, Gold & Ivory',
          slug: 'modern-sage-gold-ivory',
          preview_image: 'https://www.elizabethannedesigns.com/blog/wp-content/uploads/2020/05/Ivory-Gold-and-Sage-Green-Wedding-Tablescape.jpg',
          tags: ['Sage Green', 'Gold', 'Neutrals', 'Modern'],
          palette_type: 'includes_neutrals',
          swatches: [
            { hex: '#8FA98D', name: 'Dusty Sage', position: 1 },
            { hex: '#C9A94B', name: 'Brushed Gold', position: 2 },
            { hex: '#FFF9F2', name: 'Creamy Ivory', position: 3 },
            { hex: '#D7D2CB', name: 'Greige', position: 4 }
          ]
        },
        {
          id: 'cp_sage_gold_garden_3',
          name: 'Garden Party Sage, Gold & Taupe',
          slug: 'garden-party-sage-gold-taupe',
          preview_image: 'https://www.elegantweddinginvites.com/wedding-blog/wp-content/uploads/2021/03/sage-green-white-and-gold-neutral-garden-wedding-colors.jpg',
          tags: ['Sage Green', 'Gold', 'Neutrals', 'Garden'],
          palette_type: 'includes_neutrals',
          swatches: [
            { hex: '#A1B49A', name: 'Soft Sage', position: 1 },
            { hex: '#B08D29', name: 'Warm Gold', position: 2 },
            { hex: '#EFE7DC', name: 'Linen', position: 3 },
            { hex: '#B6A999', name: 'Mushroom Taupe', position: 4 }
          ]
        }
      ],
      diy_projects: [
        {
          id: 'diy_sage_escort_cards',
          title: 'Sage Green Escort Card Display with Gold Clips',
          slug: 'sage-green-escort-card-display-gold-clips',
          description: 'Create a simple escort card display using sage green cards, gold binder clips, and a rented frame or stand.',
          time_required_minutes: 75,
          time_required_label: 'Under 2 hours',
          cost_estimate: 45,
          cost_label: 'Under $100',
          difficulty: 'beginner',
          style_tags: ['Sage Green', 'Gold', 'Escort Cards', 'Modern'],
          image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
          steps: [
            'Trim cardstock into uniform escort cards and write or print guest names.',
            'Spray-paint binder clips gold if they are not already metallic.',
            'Attach cards to a string or grid using the clips, grouping by table.',
            'Set up the frame or stand at your venue and hang the finished display.'
          ],
          materials: [
            'Sage green cardstock',
            'Gold binder clips',
            'String or wire grid',
            'Large frame or stand',
            'Paper trimmer',
            'Gold spray paint (optional)'
          ]
        },
        {
          id: 'diy_gold_rimmed_candles',
          title: 'Gold-Rimmed Candle Holders in Under 2 Hours',
          slug: 'gold-rimmed-candle-holders-under-2-hours',
          description: 'Transform plain glass votives into chic gold-rimmed candle holders using metallic paint or leaf.',
          time_required_minutes: 60,
          time_required_label: 'Under 2 hours',
          cost_estimate: 35,
          cost_label: 'Under $100',
          difficulty: 'beginner',
          style_tags: ['Gold', 'Candles', 'Romantic'],
          image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
          steps: [
            'Clean the glass votive holders with rubbing alcohol and let dry.',
            'Apply painter’s tape to mask off the area you want to keep clear.',
            'Brush or dab on metallic gold paint or adhesive and gold leaf along the rim.',
            'Peel off tape, let dry fully, then add tealights or votive candles.'
          ],
          materials: [
            'Plain glass votive holders',
            'Metallic gold paint or gold leaf kit',
            'Painter’s tape',
            'Small paintbrush or sponge',
            'Rubbing alcohol and cloth',
            'Tealights or votive candles'
          ]
        },
        {
          id: 'diy_printable_seating_chart_greenery',
          title: 'Printable Seating Chart with Sage Greenery Frame',
          slug: 'printable-seating-chart-sage-greenery-frame',
          description: 'Design and print a seating chart with a sage green greenery border, then mount it in a frame or on foam board.',
          time_required_minutes: 90,
          time_required_label: 'Under 2 hours',
          cost_estimate: 20,
          cost_label: 'Under $100',
          difficulty: 'beginner',
          style_tags: ['Sage Green', 'Seating Chart', 'Printable'],
          image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop&auto=format&q=80',
          steps: [
            'Use a template in Canva or similar software to add guest names and table numbers.',
            'Customize fonts and colors, keeping the greenery border in sage tones.',
            'Export the file as a high-resolution PDF.',
            'Print at home or a copy shop, then mount on foam board or place in a large frame.'
          ],
          materials: [
            'Computer with design software',
            'Seating chart template file',
            'High-quality cardstock or poster paper',
            'Printer access or print shop',
            'Foam board or large frame',
            'Adhesive or mounting tape'
          ]
        }
      ],
      timeline_templates: [
        {
          id: 'tl_summer_outdoor_4pm_8h_50_150',
          title: 'Summer Outdoor 4 PM Ceremony Timeline (8 Hours, 50–150 Guests)',
          slug: 'summer-outdoor-4pm-ceremony-8-hour-timeline-50-150',
          description: 'An 8-hour sample timeline for a summer outdoor ceremony and reception with a 4:00 PM ceremony start and 50–150 guests.',
          guest_count_min: 50,
          guest_count_max: 150,
          guest_count_label: '50–150 guests',
          season: 'summer',
          location_type: 'outdoor_ceremony_reception',
          length_hours: 8,
          ceremony_time: '4:00 PM',
          popularity_score: 97,
          is_featured: true,
          schedule: [
            {
              time: '2:00 PM',
              label: 'Vendors Arrive & Setup',
              description: 'Catering, rentals, DJ, and florist arrive to finish setup before guests.'
            },
            {
              time: '3:00 PM',
              label: 'Guest Arrival & Pre-Ceremony Refreshments',
              description: 'Light beverages available as guests are seated outdoors.'
            },
            {
              time: '4:00 PM',
              label: 'Outdoor Ceremony',
              description: 'Processional, vows, and recessional (about 30 minutes).'
            },
            {
              time: '4:30 PM',
              label: 'Cocktail Hour',
              description: 'Drinks and hors d’oeuvres on the lawn while couple takes portraits.'
            },
            {
              time: '5:30 PM',
              label: 'Guests Seated for Dinner',
              description: 'Guests find their seats; couple lines up for grand entrance.'
            },
            {
              time: '5:45 PM',
              label: 'Grand Entrance & First Dance',
              description: 'Wedding party entrances followed by first dance and welcome toast.'
            },
            {
              time: '6:00 PM',
              label: 'Dinner Service',
              description: 'Plated or buffet dinner served; background music only.'
            },
            {
              time: '7:00 PM',
              label: 'Toasts & Cake Cutting',
              description: 'Speeches followed by cake cutting or dessert service.'
            },
            {
              time: '7:30 PM',
              label: 'Open Dancing',
              description: 'Dance floor opens; bouquet/garter or special dances optional.'
            },
            {
              time: '9:45 PM',
              label: 'Last Dance & Send-Off',
              description: 'Final song, sparkler exit or farewell moment.'
            },
            {
              time: '10:00 PM',
              label: 'Event End & Breakdown',
              description: 'Vendors complete breakdown and load-out.'
            }
          ]
        },
        {
          id: 'tl_summer_outdoor_3pm_6h_small',
          title: 'Summer Outdoor 3 PM Ceremony Timeline (6-Hour, 30–80 Guests)',
          slug: 'summer-outdoor-3pm-ceremony-6-hour-30-80',
          description: 'A shorter 6-hour outdoor wedding timeline with a 3:00 PM ceremony for small to medium guest counts.',
          guest_count_min: 30,
          guest_count_max: 80,
          guest_count_label: '30–80 guests',
          season: 'summer',
          location_type: 'outdoor_ceremony_reception',
          length_hours: 6,
          ceremony_time: '3:00 PM',
          popularity_score: 88,
          is_featured: false,
          schedule: [
            {
              time: '1:30 PM',
              label: 'Setup Finalized',
              description: 'Final details in place before guest arrival.'
            },
            {
              time: '2:30 PM',
              label: 'Guest Arrival',
              description: 'Guests arrive and find seats.'
            },
            {
              time: '3:00 PM',
              label: 'Ceremony',
              description: 'Outdoor ceremony (20–30 minutes).'
            },
            {
              time: '3:30 PM',
              label: 'Cocktail Hour & Photos',
              description: 'Light bites and drinks while couple takes photos.'
            },
            {
              time: '4:30 PM',
              label: 'Dinner & Toasts',
              description: 'Buffet or family-style meal followed by speeches.'
            },
            {
              time: '6:00 PM',
              label: 'Cake & Dancing',
              description: 'Dessert and open dance floor until send-off at 7:30 PM.'
            }
          ]
        },
        {
          id: 'tl_fall_indoor_5pm_8h',
          title: 'Fall Indoor 5 PM Ceremony Timeline (8 Hours)',
          slug: 'fall-indoor-5pm-ceremony-8-hours',
          description: 'An 8-hour schedule for a cozy indoor fall wedding with a 5:00 PM ceremony.',
          guest_count_min: 80,
          guest_count_max: 180,
          guest_count_label: '80–180 guests',
          season: 'fall',
          location_type: 'indoor',
          length_hours: 8,
          ceremony_time: '5:00 PM',
          popularity_score: 91,
          is_featured: true,
          schedule: [
            {
              time: '3:00 PM',
              label: 'First Look & Portraits',
              description: 'Couple and wedding party portraits before ceremony.'
            },
            {
              time: '4:30 PM',
              label: 'Guest Arrival',
              description: 'Guests arrive and enjoy pre-ceremony music.'
            },
            {
              time: '5:00 PM',
              label: 'Indoor Ceremony',
              description: 'Ceremony followed by receiving line if desired.'
            },
            {
              time: '5:30 PM',
              label: 'Cocktail Hour',
              description: 'Drinks and hors d’oeuvres while room flips for reception.'
            },
            {
              time: '6:30 PM',
              label: 'Dinner & Toasts',
              description: 'Reception begins with introductions, dinner, and speeches.'
            },
            {
              time: '8:00 PM',
              label: 'Dancing',
              description: 'Dance floor opens after formalities.'
            },
            {
              time: '11:00 PM',
              label: 'Last Call & Exit',
              description: 'Final songs and grand exit.'
            }
          ]
        }
      ],
      budget_category_allocations: [
        {
          id: 'bca_catering_under15k_2026',
          category_slug: 'catering',
          planned_amount: 6000,
          actual_amount: 6200,
          notes: 'Increased headcount from 90 to 100 guests and added one extra appetizer station.',
          updated_at: '2026-02-28T14:30:00Z',
          image: 'https://greenweddingshoes.com/wp-content/uploads/2021/03/wedding-catering-styles-2.jpg'
        },
        {
          id: 'bca_venue_under15k_2026',
          category_slug: 'venue',
          planned_amount: 4000,
          actual_amount: 3800,
          notes: 'Saved by booking a Friday date and using in-house chairs and tables.',
          updated_at: '2026-02-26T10:15:00Z',
          image: 'https://i.pinimg.com/originals/ee/2c/6c/ee2c6c4e0bb79fc2c67b3715040f4d01.jpg'
        },
        {
          id: 'bca_decor_under15k_2026',
          category_slug: 'decor',
          planned_amount: 1500,
          actual_amount: 1200,
          notes: 'DIY centerpieces and repurposed ceremony florals for reception tables.',
          updated_at: '2026-02-20T18:45:00Z',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/bf0ca7e7-2a9b-57b3-b72a-aef6c26e45eb.webp'
        }
      ],
      checklist_task_templates: [
        {
          id: 'ctt_6mo15k_1',
          checklist_template_id: 'chk_6mo_under15k_80_120',
          section_name: 'This Month',
          order: 1,
          title: 'Set overall wedding budget under $15,000',
          description: 'Discuss priorities with your partner and decide on a total budget cap; enter starting numbers in your budget planner.'
        },
        {
          id: 'ctt_6mo15k_2',
          checklist_template_id: 'chk_6mo_under15k_80_120',
          section_name: 'This Month',
          order: 2,
          title: 'Create a preliminary guest list (80–120 people)',
          description: 'List immediate family, close friends, and must-invite guests to confirm that headcount fits your budget.'
        },
        {
          id: 'ctt_6mo15k_3',
          checklist_template_id: 'chk_6mo_under15k_80_120',
          section_name: 'This Month',
          order: 3,
          title: 'Shortlist 3–5 venues within budget',
          description: 'Search venues that can host 80–120 guests and request pricing that keeps you under $15,000 total.'
        }
      ],
      planning_board_items: [
        {
          id: 'pb_tl_summer_outdoor_4pm_8h',
          item_type: 'timeline_template',
          item_id: 'tl_summer_outdoor_4pm_8h_50_150',
          added_at: '2026-02-15T10:00:00Z',
          notes: 'Primary plan for an outdoor summer wedding with a 4 PM ceremony.'
        },
        {
          id: 'pb_tl_fall_indoor_5pm_8h',
          item_type: 'timeline_template',
          item_id: 'tl_fall_indoor_5pm_8h',
          added_at: '2026-01-20T09:30:00Z',
          notes: 'Backup option in case we switch to an indoor fall date.'
        },
        {
          id: 'pb_tl_spring_garden_brunch',
          item_type: 'timeline_template',
          item_id: 'tl_spring_garden_11am_brunch',
          added_at: '2026-01-05T14:45:00Z',
          notes: 'Reference for hosting a daytime garden brunch reception.'
        }
      ],
      seating_layouts: [
        {
          id: 'layout_mixed_100_150_flagship',
          title: 'Classic Ballroom Layout for 100–150 Guests (Mixed Round and Long Tables)',
          slug: 'classic-ballroom-100-150-mixed-round-long-tables',
          description: 'A flexible ballroom floorplan for 100–150 guests that combines round tables near the dance floor with long banquet tables along the perimeter.',
          guest_count_min: 100,
          guest_count_max: 150,
          guest_count_label: '100–150 guests',
          layout_type_options: ['round_tables', 'long_tables'],
          is_mixed_tables: true,
          popularity_score: 98,
          download_count: 820,
          sample_chart_image: 'https://media-cache-ak0.pinimg.com/736x/26/ac/36/26ac36fe508acf91c6acadae3a27593f.jpg',
          table_summary: 'Classic ballroom layout with mixed round and long tables for 100–150 guests, ideal for flexible seating and a central dance floor.',
          usage_count: 0
        },
        {
          id: 'layout_mixed_100_130_family_style',
          title: 'Family-Style Reception for 100–130 Guests (Mixed Tables)',
          slug: 'family-style-reception-100-130-mixed-tables',
          description: 'Combines long family-style tables for the wedding party with surrounding rounds for remaining guests, keeping everyone close to the dance floor.',
          guest_count_min: 100,
          guest_count_max: 130,
          guest_count_label: '100–130 guests',
          layout_type_options: ['round_tables', 'long_tables'],
          is_mixed_tables: true,
          popularity_score: 91,
          download_count: 540,
          sample_chart_image: 'https://markjanzenphotography.com/wp-content/uploads/2017/11/oakland-preservation-park-wedding-66-1000x667.jpg',
          table_summary: 'Mixed round and long tables with a head table and family-style seating for 100–130 guests.',
          usage_count: 0
        },
        {
          id: 'layout_mixed_120_160_barn',
          title: 'Rustic Barn Layout for 120–160 Guests (Mixed Round and Long Tables)',
          slug: 'rustic-barn-120-160-mixed-round-long-tables',
          description: 'Designed for barn venues with long tables running the length of the space and round tables near the entrance and dance floor.',
          guest_count_min: 120,
          guest_count_max: 160,
          guest_count_label: '120–160 guests',
          layout_type_options: ['round_tables', 'long_tables'],
          is_mixed_tables: true,
          popularity_score: 88,
          download_count: 460,
          sample_chart_image: 'https://pamelladunn.files.wordpress.com/2017/03/emily-k-weddings3-photograpy-by-cream.jpg?w=740',
          table_summary: 'Rustic barn-inspired floorplan with mixed round and long tables for 120–160 guests.',
          usage_count: 0
        }
      ]
    };

    const mergeArrayIntoStorage = (storageKey, items) => {
      if (!items || !items.length) return;
      let existing = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          existing = JSON.parse(raw) || [];
        }
      } catch (e) {
        existing = [];
      }
      const seenIds = {};
      existing.forEach(it => {
        if (it && typeof it.id !== 'undefined') {
          seenIds[it.id] = true;
        }
      });
      const merged = existing.slice();
      items.forEach(it => {
        if (!it) return;
        if (typeof it.id !== 'undefined') {
          if (seenIds[it.id]) return;
          seenIds[it.id] = true;
        }
        merged.push(it);
      });
      localStorage.setItem(storageKey, JSON.stringify(merged));
    };

    mergeArrayIntoStorage('articles', generatedData.articles);
    mergeArrayIntoStorage('budget_categories', generatedData.budget_categories);
    mergeArrayIntoStorage('checklist_templates', generatedData.checklist_templates);
    mergeArrayIntoStorage('color_palettes', generatedData.color_palettes);
    mergeArrayIntoStorage('diy_projects', generatedData.diy_projects);
    mergeArrayIntoStorage('timeline_templates', generatedData.timeline_templates);
    mergeArrayIntoStorage('budget_category_allocations', generatedData.budget_category_allocations);
    mergeArrayIntoStorage('checklist_task_templates', generatedData.checklist_task_templates);
    mergeArrayIntoStorage('planning_board_items', generatedData.planning_board_items);
    mergeArrayIntoStorage('seating_layouts', generatedData.seating_layouts);
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveBudgetArticles();
    this.testTask2_SaveTimelineTemplate();
    this.testTask3_CreateSageGoldMoodboard();
    this.testTask4_SaveVenueGuideWithBackupSpace();
    this.testTask5_SaveSeatingLayoutMixedTables();
    this.testTask6_GenerateChecklistAndAddToDos();
    this.testTask7_AddCateringArticleToBudgetPlanner();
    this.testTask8_SaveDIYProjectsToProjectList();

    return this.results;
  }

  // Task 1: Save 3 budget wedding articles under $10,000 from last 12 months
  testTask1_SaveBudgetArticles() {
    const testName = 'Task 1: Save 3 budget wedding articles under $10,000 from last 12 months';
    try {
      const categoryId = 'budget_money';

      const filterOptions = this.logic.getArticleFilterOptions(categoryId);
      this.assert(filterOptions && filterOptions.category_id === categoryId, 'Should get filter options for budget_money');

      let budgetOptionKey;
      if (filterOptions.overall_budget_options && filterOptions.overall_budget_options.length) {
        const match = filterOptions.overall_budget_options.find(o => o.label === 'Under $10,000');
        budgetOptionKey = match ? match.key : filterOptions.overall_budget_options[0].key;
      }

      let dateRangeKey;
      if (filterOptions.published_date_ranges && filterOptions.published_date_ranges.length) {
        const match = filterOptions.published_date_ranges.find(o => o.label === 'Last 12 months');
        dateRangeKey = match ? match.key : filterOptions.published_date_ranges[0].key;
      }

      let sortBy = 'most_popular';
      if (filterOptions.sort_options && filterOptions.sort_options.length) {
        const match = filterOptions.sort_options.find(s => s.label === 'Most Popular' || s.value === 'most_popular');
        sortBy = match ? match.value : filterOptions.sort_options[0].value;
      }

      const filters = {
        overall_budget_option_key: budgetOptionKey,
        published_date_range_key: dateRangeKey
      };

      const listResult = this.logic.listArticles(categoryId, filters, sortBy, 1, 20);
      this.assert(listResult && Array.isArray(listResult.articles), 'listArticles should return articles array');
      this.assert(listResult.articles.length >= 3, 'Should have at least 3 budget articles under $10,000 in last 12 months');

      const articlesToSave = listResult.articles.slice(0, 3);

      const beforeReading = this.logic.getReadingList(categoryId);
      const beforeCount = beforeReading ? beforeReading.total_count || 0 : 0;

      articlesToSave.forEach(article => {
        const detail = this.logic.getArticleDetail(article.id);
        this.assert(detail && detail.article && detail.article.id === article.id, 'getArticleDetail should return correct article for task 1');
        const saveRes = this.logic.saveArticleToReadingList(article.id, 'Saved during Task 1 flow');
        this.assert(saveRes && saveRes.success === true, 'saveArticleToReadingList should succeed for task 1');
        this.assert(saveRes.saved_article && saveRes.saved_article.article_id === article.id, 'SavedArticle should reference correct article');
      });

      const afterReading = this.logic.getReadingList(categoryId);
      this.assert(afterReading && typeof afterReading.total_count === 'number', 'Reading list after saving should be valid');
      const afterCount = afterReading.total_count;
      this.assert(afterCount === beforeCount + 3, 'Reading list count for budget_money should increase by exactly 3');

      const afterArticleIds = (afterReading.items || []).map(it => it.article.id);
      articlesToSave.forEach(article => {
        this.assert(afterArticleIds.indexOf(article.id) !== -1, 'Reading list should contain saved article ' + article.id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Save an 8-hour summer outdoor wedding day timeline for 50–150 guests with a 4 PM ceremony
  testTask2_SaveTimelineTemplate() {
    const testName = 'Task 2: Save 8-hour summer outdoor 4 PM timeline to planning board';
    try {
      const filterOptions = this.logic.getTimelineTemplateFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.guest_count_ranges), 'Should get timeline filter options');

      let guestKey;
      if (filterOptions.guest_count_ranges && filterOptions.guest_count_ranges.length) {
        const match = filterOptions.guest_count_ranges.find(g => g.label === '50–150 guests');
        guestKey = match ? match.key : filterOptions.guest_count_ranges[0].key;
      }

      let season = 'summer';
      if (filterOptions.seasons && filterOptions.seasons.length) {
        const match = filterOptions.seasons.find(s => s.value === 'summer');
        season = match ? match.value : filterOptions.seasons[0].value;
      }

      let locationType = 'outdoor_ceremony_reception';
      if (filterOptions.location_types && filterOptions.location_types.length) {
        const match = filterOptions.location_types.find(l => l.value === 'outdoor_ceremony_reception');
        locationType = match ? match.value : filterOptions.location_types[0].value;
      }

      let lengthHours = 8;
      if (filterOptions.timeline_lengths_hours && filterOptions.timeline_lengths_hours.length) {
        const match = filterOptions.timeline_lengths_hours.find(t => t.hours === 8 || t.label === '8 hours');
        lengthHours = match ? match.hours : filterOptions.timeline_lengths_hours[0].hours;
      }

      let ceremonyTime = '4:00 PM';
      if (filterOptions.ceremony_times && filterOptions.ceremony_times.length) {
        const match = filterOptions.ceremony_times.find(c => c.value === '4:00 PM');
        ceremonyTime = match ? match.value : filterOptions.ceremony_times[0].value;
      }

      let sortBy = 'most_popular';
      if (filterOptions.sort_options && filterOptions.sort_options.length) {
        const match = filterOptions.sort_options.find(s => s.value === 'most_popular');
        sortBy = match ? match.value : filterOptions.sort_options[0].value;
      }

      const filters = {
        guest_count_range_key: guestKey,
        season: season,
        location_type: locationType,
        length_hours: lengthHours,
        ceremony_time: ceremonyTime
      };

      const listResult = this.logic.listTimelineTemplates(filters, sortBy, 1, 20);
      this.assert(listResult && Array.isArray(listResult.timeline_templates), 'listTimelineTemplates should return templates');
      this.assert(listResult.timeline_templates.length > 0, 'Should find at least one matching timeline template');

      let selected = listResult.timeline_templates[0];
      const candidate = listResult.timeline_templates.find(t => t.title && t.title.indexOf('Summer Outdoor') !== -1 && t.title.indexOf('4 PM Ceremony') !== -1);
      if (candidate) {
        selected = candidate;
      }

      const detail = this.logic.getTimelineTemplateDetail(selected.id);
      this.assert(detail && detail.timeline_template && detail.timeline_template.id === selected.id, 'getTimelineTemplateDetail should return selected template');

      const beforeBoard = this.logic.getPlanningBoardItems();
      const beforeItems = beforeBoard && beforeBoard.items ? beforeBoard.items : [];
      const beforeCountForTemplate = beforeItems.filter(it => it.planning_board_item && it.planning_board_item.item_type === 'timeline_template' && it.planning_board_item.item_id === selected.id).length;

      const saveRes = this.logic.saveTimelineTemplateToPlanningBoard(selected.id, 'Saved during Task 2 flow');
      this.assert(saveRes && saveRes.success === true, 'saveTimelineTemplateToPlanningBoard should succeed');
      this.assert(saveRes.planning_board_item && saveRes.planning_board_item.item_id === selected.id, 'PlanningBoardItem should reference correct timeline template');

      const afterBoard = this.logic.getPlanningBoardItems();
      this.assert(afterBoard && Array.isArray(afterBoard.items), 'getPlanningBoardItems should return items');
      const afterItems = afterBoard.items;
      const afterCountForTemplate = afterItems.filter(it => it.planning_board_item && it.planning_board_item.item_type === 'timeline_template' && it.planning_board_item.item_id === selected.id).length;
      this.assert(afterCountForTemplate === beforeCountForTemplate + 1, 'Planning board should have one additional timeline_template item for this template');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Create a moodboard with sage green and gold palettes that include neutrals
  testTask3_CreateSageGoldMoodboard() {
    const testName = 'Task 3: Create Sage & Gold moodboard and add palettes';
    try {
      const filterOptions = this.logic.getColorPaletteFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.tags), 'Should get color palette filter options');

      const includeTags = ['Sage Green', 'Gold'];
      const paletteType = 'includes_neutrals';

      const listResult = this.logic.listColorPalettes({ include_tags: includeTags, palette_type: paletteType }, 1, 30);
      this.assert(listResult && Array.isArray(listResult.palettes), 'listColorPalettes should return palettes');
      this.assert(listResult.palettes.length > 0, 'Should find at least one Sage Green + Gold palette including neutrals');

      const maxToAdd = 4;
      const countToAdd = Math.min(maxToAdd, listResult.palettes.length);
      const palettesToAdd = listResult.palettes.slice(0, countToAdd);

      const createRes = this.logic.createMoodboard('Sage & Gold');
      this.assert(createRes && createRes.moodboard && createRes.moodboard.id, 'createMoodboard should return a moodboard with id');
      const moodboardId = createRes.moodboard.id;

      palettesToAdd.forEach(p => {
        const addRes = this.logic.addPaletteToMoodboard(moodboardId, p.id);
        this.assert(addRes && addRes.success === true, 'addPaletteToMoodboard should succeed');
      });

      const listBoards = this.logic.listMoodboards();
      this.assert(listBoards && Array.isArray(listBoards.moodboards), 'listMoodboards should return moodboards');
      const foundBoard = listBoards.moodboards.find(mb => mb.id === moodboardId || mb.name === 'Sage & Gold');
      this.assert(foundBoard, 'Should find the Sage & Gold moodboard in list');
      const paletteIdsInBoard = foundBoard.palette_ids || [];
      palettesToAdd.forEach(p => {
        this.assert(paletteIdsInBoard.indexOf(p.id) !== -1, 'Moodboard should contain palette ' + p.id);
      });

      const detail = this.logic.getMoodboardDetail(moodboardId);
      this.assert(detail && detail.moodboard && detail.moodboard.id === moodboardId, 'getMoodboardDetail should return correct moodboard');
      this.assert(Array.isArray(detail.palettes), 'Moodboard detail should include palettes array');
      const detailPaletteIds = detail.palettes.map(p => p.id);
      palettesToAdd.forEach(p => {
        this.assert(detailPaletteIds.indexOf(p.id) !== -1, 'Moodboard detail should include palette ' + p.id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Save one venue guide for ~150 guests that mentions a backup indoor space
  testTask4_SaveVenueGuideWithBackupSpace() {
    const testName = 'Task 4: Save a venue guide for ~150 guests with backup indoor space';
    try {
      const categoryId = 'venues';
      const filterOptions = this.logic.getArticleFilterOptions(categoryId);
      this.assert(filterOptions && filterOptions.category_id === categoryId, 'Should get venue article filter options');

      let guestRangeKey;
      if (filterOptions.guest_count_ranges && filterOptions.guest_count_ranges.length) {
        let match = filterOptions.guest_count_ranges.find(g => g.label === 'Around 150 guests (120–180)');
        if (!match) {
          match = filterOptions.guest_count_ranges.find(g => g.min <= 150 && g.max >= 150) || filterOptions.guest_count_ranges[0];
        }
        guestRangeKey = match.key;
      }

      let barnSlug;
      let ballroomSlug;
      if (filterOptions.venue_style_options && filterOptions.venue_style_options.length) {
        const barnOpt = filterOptions.venue_style_options.find(v => v.label.indexOf('Barn') !== -1 || v.slug === 'barn');
        const ballroomOpt = filterOptions.venue_style_options.find(v => v.label.indexOf('Ballroom') !== -1 || v.slug === 'hotel_ballroom');
        barnSlug = barnOpt ? barnOpt.slug : undefined;
        ballroomSlug = ballroomOpt ? ballroomOpt.slug : undefined;
      }

      const venueStyleSlugs = [];
      if (barnSlug) venueStyleSlugs.push(barnSlug);
      if (ballroomSlug) venueStyleSlugs.push(ballroomSlug);

      const filters = {
        guest_count_range_key: guestRangeKey,
        venue_style_slugs: venueStyleSlugs,
        has_backup_indoor_space: true
      };

      const listResult = this.logic.listArticles(categoryId, filters, 'newest', 1, 20);
      this.assert(listResult && Array.isArray(listResult.articles), 'listArticles for venues should return articles');
      this.assert(listResult.articles.length > 0, 'Should find at least one venue article with backup indoor space');

      const selected = listResult.articles[0];
      const detail = this.logic.getArticleDetail(selected.id);
      this.assert(detail && detail.article && detail.article.id === selected.id, 'getArticleDetail should return selected venue article');
      this.assert(detail.article.has_backup_indoor_space === true, 'Selected article should have has_backup_indoor_space true');
      if (venueStyleSlugs.length) {
        this.assert(Array.isArray(detail.article.venue_style_tags), 'Venue article should have venue_style_tags');
        const intersects = detail.article.venue_style_tags.some(tag => venueStyleSlugs.indexOf(tag) !== -1);
        this.assert(intersects, 'Venue article should be barn or hotel ballroom style');
      }

      const beforeReading = this.logic.getReadingList(categoryId);
      const beforeCount = beforeReading ? beforeReading.total_count || 0 : 0;

      const saveRes = this.logic.saveArticleToReadingList(selected.id, 'Saved during Task 4 flow');
      this.assert(saveRes && saveRes.success === true, 'saveArticleToReadingList should succeed for venue article');

      const afterReading = this.logic.getReadingList(categoryId);
      this.assert(afterReading && typeof afterReading.total_count === 'number', 'Reading list after saving venue should be valid');
      const afterCount = afterReading.total_count;
      this.assert(afterCount === beforeCount + 1, 'Reading list count for venues should increase by 1');

      const savedIds = (afterReading.items || []).map(it => it.article.id);
      this.assert(savedIds.indexOf(selected.id) !== -1, 'Reading list should contain saved venue article');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Save a seating layout template for 100–150 guests using mixed round and long tables
  testTask5_SaveSeatingLayoutMixedTables() {
    const testName = 'Task 5: Save a mixed round and long tables seating layout to planning board';
    try {
      const filterOptions = this.logic.getSeatingLayoutFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.guest_count_ranges), 'Should get seating layout filter options');

      let guestRangeKey;
      if (filterOptions.guest_count_ranges && filterOptions.guest_count_ranges.length) {
        let match = filterOptions.guest_count_ranges.find(g => g.label === '100–150 guests');
        if (!match) {
          match = filterOptions.guest_count_ranges.find(g => g.min <= 125 && g.max >= 125) || filterOptions.guest_count_ranges[0];
        }
        guestRangeKey = match.key;
      }

      let sortBy = 'most_used';
      if (filterOptions.sort_options && filterOptions.sort_options.length) {
        const match = filterOptions.sort_options.find(s => s.value === 'most_used');
        sortBy = match ? match.value : filterOptions.sort_options[0].value;
      }

      const filters = {
        guest_count_range_key: guestRangeKey,
        include_round_tables: true,
        include_long_tables: true,
        require_mixed_tables: true
      };

      const listResult = this.logic.listSeatingLayouts(filters, sortBy, 1, 20);
      this.assert(listResult && Array.isArray(listResult.seating_layouts), 'listSeatingLayouts should return layouts');
      this.assert(listResult.seating_layouts.length > 0, 'Should find at least one mixed table layout for 100–150 guests');

      let selected = listResult.seating_layouts[0];
      const candidate = listResult.seating_layouts.find(l => l.table_summary && l.table_summary.toLowerCase().indexOf('mixed round and long tables') !== -1);
      if (candidate) {
        selected = candidate;
      }

      const detail = this.logic.getSeatingLayoutDetail(selected.id);
      this.assert(detail && detail.seating_layout && detail.seating_layout.id === selected.id, 'getSeatingLayoutDetail should return selected layout');
      this.assert(detail.seating_layout.is_mixed_tables === true, 'Selected seating layout should be mixed tables');

      const chart = this.logic.getSeatingLayoutSampleChart(selected.id);
      this.assert(chart && chart.seating_layout_id === selected.id, 'getSeatingLayoutSampleChart should reference selected layout');
      this.assert(typeof chart.sample_chart_image === 'string' && chart.sample_chart_image.length > 0, 'Sample chart image URL should be present');

      const beforeBoard = this.logic.getPlanningBoardItems();
      const beforeItems = beforeBoard && beforeBoard.items ? beforeBoard.items : [];
      const beforeCountForLayout = beforeItems.filter(it => it.planning_board_item && it.planning_board_item.item_type === 'seating_layout' && it.planning_board_item.item_id === selected.id).length;

      const saveRes = this.logic.saveSeatingLayoutToPlanningBoard(selected.id, 'Saved during Task 5 flow');
      this.assert(saveRes && saveRes.success === true, 'saveSeatingLayoutToPlanningBoard should succeed');

      const afterBoard = this.logic.getPlanningBoardItems();
      this.assert(afterBoard && Array.isArray(afterBoard.items), 'getPlanningBoardItems after saving layout should return items');
      const afterItems = afterBoard.items;
      const afterCountForLayout = afterItems.filter(it => it.planning_board_item && it.planning_board_item.item_type === 'seating_layout' && it.planning_board_item.item_id === selected.id).length;
      this.assert(afterCountForLayout === beforeCountForLayout + 1, 'Planning board should have one additional seating_layout item for this layout');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Generate a 6-month wedding checklist for under $15,000 and add tasks to to-dos
  testTask6_GenerateChecklistAndAddToDos() {
    const testName = 'Task 6: Generate 6-month checklist and add first tasks to to-dos';
    try {
      const filterOptions = this.logic.getChecklistFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.timeline_month_options), 'Should get checklist filter options');

      const timelineMonths = 6;

      let budgetKey;
      if (filterOptions.budget_options && filterOptions.budget_options.length) {
        let match = filterOptions.budget_options.find(b => b.label === 'Under $15,000');
        if (!match) {
          match = filterOptions.budget_options[0];
        }
        budgetKey = match.key;
      }

      let guestRangeKey;
      if (filterOptions.guest_count_ranges && filterOptions.guest_count_ranges.length) {
        let match = filterOptions.guest_count_ranges.find(g => g.label === '80–120 guests');
        if (!match) {
          match = filterOptions.guest_count_ranges.find(g => g.min <= 100 && g.max >= 100) || filterOptions.guest_count_ranges[0];
        }
        guestRangeKey = match.key;
      }

      const genResult = this.logic.generateChecklist(timelineMonths, budgetKey, guestRangeKey);
      this.assert(genResult && genResult.checklist_template, 'generateChecklist should return a checklist_template');
      this.assert(Array.isArray(genResult.tasks_by_section), 'generateChecklist should return tasks_by_section');

      const currentSectionName = genResult.current_section_name || 'This Month';
      const currentSection = genResult.tasks_by_section.find(s => s.section_name === currentSectionName) || genResult.tasks_by_section[0];
      this.assert(currentSection && Array.isArray(currentSection.tasks), 'Current checklist section should have tasks array');
      this.assert(currentSection.tasks.length > 0, 'Current checklist section should have at least one task');

      const maxToAdd = 5;
      const tasksToAdd = currentSection.tasks
        .slice()
        .sort((a, b) => {
          const ao = typeof a.order === 'number' ? a.order : 0;
          const bo = typeof b.order === 'number' ? b.order : 0;
          return ao - bo;
        })
        .slice(0, Math.min(maxToAdd, currentSection.tasks.length));

      const beforeTodosRes = this.logic.getToDosList();
      const beforeTodos = beforeTodosRes && beforeTodosRes.todos ? beforeTodosRes.todos : [];
      const beforeCount = beforeTodos.length;

      const taskIds = tasksToAdd.map(t => t.id);
      const addRes = this.logic.addChecklistTasksToToDos(taskIds);
      this.assert(addRes && Array.isArray(addRes.added_todos), 'addChecklistTasksToToDos should return added_todos array');
      this.assert(addRes.added_todos.length === taskIds.length, 'Number of added todos should equal number of selected tasks');

      const afterTodosRes = this.logic.getToDosList();
      this.assert(afterTodosRes && Array.isArray(afterTodosRes.todos), 'getToDosList should return todos');
      const afterTodos = afterTodosRes.todos;
      const afterCount = afterTodos.length;
      this.assert(afterCount === beforeCount + taskIds.length, 'Total to-dos count should increase by number of added tasks');

      const afterById = {};
      afterTodos.forEach(td => {
        afterById[td.id] = td;
      });

      // Verify each checklist task created a pending todo with correct linkage
      addRes.added_todos.forEach(todo => {
        this.assert(todo.status === 'pending', 'New to-do should be pending');
        this.assert(todo.source_type === 'checklist_task', 'New to-do should have source_type checklist_task');
        this.assert(taskIds.indexOf(todo.source_id) !== -1, 'To-do source_id should match one of the selected checklist tasks');
        if (currentSectionName) {
          this.assert(todo.section_name === currentSectionName, 'To-do section_name should match current section');
        }
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Add a catering budget article under $60 per guest to budget planner
  testTask7_AddCateringArticleToBudgetPlanner() {
    const testName = 'Task 7: Add catering budget article (<= $60/guest) to budget planner';
    try {
      const categoryId = 'food_drink';
      const filterOptions = this.logic.getArticleFilterOptions(categoryId);
      this.assert(filterOptions && filterOptions.category_id === categoryId, 'Should get food & drink filter options');

      let budgetRangeKey;
      if (filterOptions.budget_per_guest_ranges && filterOptions.budget_per_guest_ranges.length) {
        let match = filterOptions.budget_per_guest_ranges.find(b => b.label === '$40–$60');
        if (!match) {
          match = filterOptions.budget_per_guest_ranges[0];
        }
        budgetRangeKey = match.key;
      }

      let sortBy = 'budget_breakdowns_first';
      if (filterOptions.sort_options && filterOptions.sort_options.length) {
        const match = filterOptions.sort_options.find(s => s.value === 'budget_breakdowns_first');
        sortBy = match ? match.value : filterOptions.sort_options[0].value;
      }

      const filters = {
        budget_per_guest_range_key: budgetRangeKey
      };

      const listResult = this.logic.listArticles(categoryId, filters, sortBy, 1, 20);
      this.assert(listResult && Array.isArray(listResult.articles), 'listArticles for food_drink should return articles');
      this.assert(listResult.articles.length > 0, 'Should find at least one food & drink article in $40–$60 range');

      const budgetOverviewBefore = this.logic.getBudgetPlannerOverview();
      this.assert(budgetOverviewBefore && Array.isArray(budgetOverviewBefore.linked_articles_by_category), 'getBudgetPlannerOverview should return linked_articles_by_category');
      const cateringBeforeEntry = budgetOverviewBefore.linked_articles_by_category.find(e => e.category_slug === 'catering');
      const beforeLinks = cateringBeforeEntry ? cateringBeforeEntry.budget_article_links : [];
      const beforeCount = beforeLinks.length;

      const articles = listResult.articles;
      const addedArticleIds = [];

      for (let i = 0; i < articles.length; i++) {
        const art = articles[i];
        const detail = this.logic.getArticleDetail(art.id);
        this.assert(detail && detail.article && detail.article.id === art.id, 'getArticleDetail should return article for food_drink');
        const avgCost = detail.article.average_catering_cost_per_guest;
        const canAdd = detail.can_add_to_budget_planner === true;
        if (canAdd && typeof avgCost === 'number' && avgCost <= 60 && avgCost > 0) {
          const addRes = this.logic.addArticleToBudgetPlanner(art.id);
          this.assert(addRes && addRes.success === true, 'addArticleToBudgetPlanner should succeed');
          this.assert(addRes.budget_article_link && addRes.budget_article_link.article_id === art.id, 'BudgetArticleLink should reference correct article');
          if (addRes.budget_article_link.category_slug === 'catering') {
            addedArticleIds.push(art.id);
          }
          if (addedArticleIds.length >= 1) {
            break; // Only need at least one
          }
        }
      }

      this.assert(addedArticleIds.length >= 1, 'Should add at least one catering article with <= $60 per guest to budget planner');

      const budgetOverviewAfter = this.logic.getBudgetPlannerOverview();
      const cateringAfterEntry = budgetOverviewAfter.linked_articles_by_category.find(e => e.category_slug === 'catering');
      const afterLinks = cateringAfterEntry ? cateringAfterEntry.budget_article_links : [];
      const afterCount = afterLinks.length;
      this.assert(afterCount >= beforeCount + addedArticleIds.length, 'Catering linked articles count should increase by at least number of added articles');

      const afterArticleIds = afterLinks.map(entry => entry.article.id);
      addedArticleIds.forEach(id => {
        this.assert(afterArticleIds.indexOf(id) !== -1, 'Budget planner catering section should reference added article ' + id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Save 3 DIY decor projects under 2 hours and under $100 to project list
  testTask8_SaveDIYProjectsToProjectList() {
    const testName = 'Task 8: Save DIY decor projects under 2 hours and under $100 to project list';
    try {
      const filterOptions = this.logic.getDIYProjectFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.time_required_options), 'Should get DIY project filter options');

      let timeKey;
      if (filterOptions.time_required_options && filterOptions.time_required_options.length) {
        let match = filterOptions.time_required_options.find(t => t.label === 'Under 2 hours');
        if (!match) {
          match = filterOptions.time_required_options[0];
        }
        timeKey = match.key;
      }

      let costKey;
      if (filterOptions.cost_options && filterOptions.cost_options.length) {
        let match = filterOptions.cost_options.find(c => c.label === 'Under $100');
        if (!match) {
          match = filterOptions.cost_options[0];
        }
        costKey = match.key;
      }

      let difficulty = 'beginner';
      if (filterOptions.difficulty_options && filterOptions.difficulty_options.length) {
        const match = filterOptions.difficulty_options.find(d => d.value === 'beginner');
        difficulty = match ? match.value : filterOptions.difficulty_options[0].value;
      }

      const filters = {
        time_required_key: timeKey,
        cost_key: costKey,
        difficulty: difficulty
      };

      const listResult = this.logic.listDIYProjects(filters, 1, 20);
      this.assert(listResult && Array.isArray(listResult.projects), 'listDIYProjects should return projects');
      this.assert(listResult.projects.length > 0, 'Should find at least one DIY project under 2 hours and under $100');

      const maxToSave = 3;
      const countToSave = Math.min(maxToSave, listResult.projects.length);
      const projectsToSave = listResult.projects.slice(0, countToSave);

      const beforeProjectsRes = this.logic.getMyProjects();
      const beforeProjects = beforeProjectsRes && beforeProjectsRes.projects ? beforeProjectsRes.projects : [];
      const beforeCount = beforeProjects.length;

      projectsToSave.forEach(p => {
        const detail = this.logic.getDIYProjectDetail(p.id);
        this.assert(detail && detail.project && detail.project.id === p.id, 'getDIYProjectDetail should return selected project');
        const saveRes = this.logic.saveDIYProjectToMyProjects(p.id);
        this.assert(saveRes && saveRes.success === true, 'saveDIYProjectToMyProjects should succeed');
        this.assert(saveRes.saved_project && saveRes.saved_project.diy_project_id === p.id, 'SavedProject should reference correct DIY project');
      });

      const afterProjectsRes = this.logic.getMyProjects();
      this.assert(afterProjectsRes && Array.isArray(afterProjectsRes.projects), 'getMyProjects after saving should return projects');
      const afterProjects = afterProjectsRes.projects;
      const afterCount = afterProjects.length;
      this.assert(afterCount === beforeCount + countToSave, 'My Projects should increase by number of saved projects');

      const afterProjectIds = afterProjects.map(entry => entry.project.id);
      projectsToSave.forEach(p => {
        this.assert(afterProjectIds.indexOf(p.id) !== -1, 'My Projects should contain saved project ' + p.id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
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

module.exports = TestRunner;
