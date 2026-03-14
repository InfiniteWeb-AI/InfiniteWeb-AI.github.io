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
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (structure/values),
    // but we may append additional records needed for specific flows.

    const generatedData = {
      articles: [
        {
          id: 'art_aging_1820_affinage_basics',
          title: 'Affinage Basics: How European Cheesemakers Aged Cheese in the Early 1800s',
          slug: 'affinage-basics-early-1800s-europe',
          summary: 'An overview of simple but effective cheese aging practices used by European farmstead producers between 1800 and 1850.',
          content: 'In the early 19th century, most European cheese aging, or affinage, took place in cellars, caves, and cool outbuildings. Temperature and humidity were controlled not with machines, but with thick stone walls, earth insulation, and careful seasonal timing...',
          topic: 'aging_maturation',
          time_period_start_year: 1800,
          time_period_end_year: 1850,
          estimated_reading_time_minutes: 8,
          publication_date: '2023-03-10T10:00:00Z',
          hero_image: 'https://www.codedevino.ru/wp-content/uploads/2019/03/kumys-molochnaya-zhemchuzhina-2.jpg',
          tags: [
            'aging',
            'europe',
            '19th_century',
            'cellars'
          ],
          is_published: true
        },
        {
          id: 'art_aging_1850_affineurs',
          title: 'Rise of the Affineur: Professional Cheese Aging 1850\u20131900',
          slug: 'rise-of-the-affineur-1850-1900',
          summary: 'How specialist affineurs emerged in France, Switzerland, and Italy in the later 19th century.',
          content: 'By the mid-19th century, urban demand for cheese had grown so rapidly that dedicated cheese agers\u2014affineurs\u2014became central to the supply chain. They purchased young wheels from rural producers and aged them in city warehouses and tunnel cellars...',
          topic: 'aging_maturation',
          time_period_start_year: 1850,
          time_period_end_year: 1900,
          estimated_reading_time_minutes: 9,
          publication_date: '2023-06-22T14:30:00Z',
          hero_image: 'https://cdn.inspiringvacations.com/eyJrZXkiOiIxMDcyOTNhMi05ZjNlLTRkNDUtYTViNi00ODIzNGI5ZGQ5MmUuanBlZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6ODAwfX19',
          tags: [
            'affineurs',
            'france',
            'trade',
            'aging'
          ],
          is_published: true
        },
        {
          id: 'art_aging_1900_cold_storage',
          title: 'From Cellar to Cold Room: Cheese Aging 1900\u20131920',
          slug: 'from-cellar-to-cold-room-1900-1920',
          summary: 'Early experiments with mechanical refrigeration began reshaping cheese aging in the early 20th century.',
          content: 'Around 1900, mechanical refrigeration entered dairies and warehouses in North America and Europe. Cheesemakers started to combine traditional cave aging with chilled rooms that allowed more consistent temperatures, especially in summer months...',
          topic: 'aging_maturation',
          time_period_start_year: 1900,
          time_period_end_year: 1920,
          estimated_reading_time_minutes: 7,
          publication_date: '2022-11-05T09:15:00Z',
          hero_image: 'https://www.itnonline.com/sites/default/files/field/image/a030419.jpg',
          tags: [
            'refrigeration',
            'technology',
            '20th_century',
            'aging'
          ],
          is_published: true
        }
      ],
      exhibits: [
        {
          id: 'ex_pre1500_italy_alpine',
          title: 'Alpine Wheels: Medieval Italian Mountain Cheeses',
          slug: 'alpine-wheels-medieval-italian-cheeses',
          summary: 'Discover how herders in the Italian Alps developed long-aged wheels for winter survival.',
          description: 'This gallery explores transhumance in the Italian Alps from the 12th to 14th centuries, focusing on large cooked-curd cheeses designed to last through long winters. Artifacts include wooden molds, copper kettles, and parchment records of monastery tithes paid in cheese.',
          region: 'europe',
          country: 'Italy',
          era_start_year: 1100,
          era_end_year: 1400,
          era_label: 'Before 1500',
          gallery_location: 'Level 2, Gallery 2A',
          estimated_visit_time_minutes: 20,
          images: [
            'https://images.unsplash.com/photo-1543353071-087092ec393e?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        },
        {
          id: 'ex_pre1500_france_monastic',
          title: 'Silent Cellars: Monastic Cheeses of Medieval France',
          slug: 'silent-cellars-monastic-cheeses-france',
          summary: 'Step into reconstructed abbey cellars where famous French cheeses were born.',
          description: 'Through illuminated manuscripts, stone carvings, and reconstructed aging rooms, this exhibit traces cheese production in Benedictine and Cistercian monasteries across Burgundy and Normandy between the 11th and 13th centuries.',
          region: 'europe',
          country: 'France',
          era_start_year: 1000,
          era_end_year: 1300,
          era_label: 'Before 1500',
          gallery_location: 'Level 2, Gallery 2B',
          estimated_visit_time_minutes: 15,
          images: [
            'https://images.unsplash.com/photo-1517315003714-a071486bd9ea?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        },
        {
          id: 'ex_pre1500_switzerland_valleys',
          title: 'Valley Pastures: Early Swiss Cheese Trade',
          slug: 'valley-pastures-early-swiss-cheese-trade',
          summary: 'How Swiss mountain cheeses traveled from remote valleys to European cities.',
          description: 'Maps, toll records, and surviving wheels illustrate the evolution of Swiss cheese from local staple to export commodity between 800 and 1400 CE.',
          region: 'europe',
          country: 'Switzerland',
          era_start_year: 800,
          era_end_year: 1400,
          era_label: 'Before 1500',
          gallery_location: 'Level 2, Gallery 2C',
          estimated_visit_time_minutes: 25,
          images: [
            'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&h=600&fit=crop&auto=format&q=80'
          ],
          is_active: true
        }
      ],
      newsletter_interest_options: [
        {
          id: 'interest_ancient_history',
          code: 'ancient_cheese_history',
          label: 'Ancient Cheese History',
          description: 'Articles, timeline updates, and exhibits focused on cheese before 1500 CE.',
          is_active: true
        },
        {
          id: 'interest_events_workshops',
          code: 'museum_events_workshops',
          label: 'Museum Events & Workshops',
          description: 'News about upcoming guided tours, workshops, and special events.',
          is_active: true
        },
        {
          id: 'interest_modern_science',
          code: 'modern_cheese_science',
          label: 'Modern Cheese Science',
          description: 'Content on microbiology, flavor chemistry, and contemporary production.',
          is_active: true
        }
      ],
      products: [
        {
          id: 'prod_book_euro_hist_1',
          name: 'Wheels of Time: A History of European Cheese',
          slug: 'wheels-of-time-european-cheese-history',
          description: 'A richly illustrated survey of European cheese from antiquity to the present, featuring maps, archival photos, and recipes.',
          product_type: 'book',
          category: 'books',
          format: 'paperback',
          topic: 'european_cheese_history',
          price: 24.95,
          currency: 'usd',
          rating: 4.6,
          rating_count: 187,
          image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop&auto=format&q=80',
          stock_quantity: 42,
          is_available: true
        },
        {
          id: 'prod_book_euro_hist_2',
          name: 'From Monks to Markets: Medieval European Cheeses',
          slug: 'from-monks-to-markets-medieval-european-cheeses',
          description: 'Explores how monasteries and market towns shaped the development of Europe\u2019s classic cheeses before 1600.',
          product_type: 'book',
          category: 'books',
          format: 'paperback',
          topic: 'european_cheese_history',
          price: 19.5,
          currency: 'usd',
          rating: 4.4,
          rating_count: 96,
          image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800&h=600&fit=crop&auto=format&q=80',
          stock_quantity: 35,
          is_available: true
        },
        {
          id: 'prod_book_euro_hist_3_hardcover',
          name: 'Empire of Milk: Cheese and Power in Europe',
          slug: 'empire-of-milk-cheese-and-power',
          description: 'A scholarly look at how cheese production intertwined with political and economic power in Europe.',
          product_type: 'book',
          category: 'books',
          format: 'hardcover',
          topic: 'european_cheese_history',
          price: 39.0,
          currency: 'usd',
          rating: 4.8,
          rating_count: 54,
          image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=600&fit=crop&auto=format&q=80',
          stock_quantity: 12,
          is_available: true
        }
      ],
      programs: [
        {
          id: 'prog_tour_english_grand_history',
          program_type: 'guided_tour',
          title: 'Grand Tour of Cheese History',
          slug: 'grand-tour-of-cheese-history',
          description: 'A comprehensive guided tour covering highlights from ancient whey pots to modern industrial plants.',
          themes: [
            'overview',
            'ancient',
            'modern',
            'highlights'
          ],
          duration_minutes: 120,
          language: 'english',
          audience_type: 'general_public',
          min_age: 10,
          max_age: null,
          is_family_friendly: true,
          base_price_adult: 22.0,
          base_price_child: 12.0,
          base_price_senior: 18.0,
          currency: 'eur',
          location: 'Main Lobby Departure',
          is_active: true
        },
        {
          id: 'prog_tour_english_ancient_europe',
          program_type: 'guided_tour',
          title: 'Ancient Cheeses of Europe',
          slug: 'ancient-cheeses-of-europe-tour',
          description: 'Focuses on archaeological discoveries and early written sources for cheesemaking in Europe up to 500 CE.',
          themes: [
            'ancient',
            'europe',
            'archaeology'
          ],
          duration_minutes: 90,
          language: 'english',
          audience_type: 'general_public',
          min_age: 12,
          max_age: null,
          is_family_friendly: true,
          base_price_adult: 18.0,
          base_price_child: 10.0,
          base_price_senior: 15.0,
          currency: 'eur',
          location: 'Gallery 1 Entrance',
          is_active: true
        },
        {
          id: 'prog_tour_english_modern_science',
          program_type: 'guided_tour',
          title: 'Modern Cheese Science & Technology',
          slug: 'modern-cheese-science-technology-tour',
          description: 'A deep dive into pasteurization, cultures, and flavor chemistry in the 19th and 20th centuries.',
          themes: [
            'science',
            'technology',
            'modern'
          ],
          duration_minutes: 105,
          language: 'english',
          audience_type: 'general_public',
          min_age: 14,
          max_age: null,
          is_family_friendly: false,
          base_price_adult: 20.0,
          base_price_child: 0.0,
          base_price_senior: 17.0,
          currency: 'eur',
          location: 'Science Wing Lobby',
          is_active: true
        }
      ],
      shipping_options: [
        {
          id: 'ship_standard_domestic_usd',
          name: 'Standard Domestic (5\u20137 days)',
          method_code: 'standard_domestic',
          description: 'Economy ground shipping within the country. Typically delivers in 5\u20137 business days.',
          carrier: 'Postal Service',
          estimated_days_min: 5,
          estimated_days_max: 7,
          cost: 6.99,
          currency: 'usd',
          is_domestic: true,
          is_active: true
        },
        {
          id: 'ship_express_domestic_usd',
          name: 'Express Domestic (2\u20133 days)',
          method_code: 'express_domestic',
          description: 'Expedited shipping with tracking and delivery in 2\u20133 business days.',
          carrier: 'Express Courier',
          estimated_days_min: 2,
          estimated_days_max: 3,
          cost: 14.99,
          currency: 'usd',
          is_domestic: true,
          is_active: true
        },
        {
          id: 'ship_international_standard',
          name: 'International Standard',
          method_code: 'international_standard',
          description: 'Cost-effective tracked shipping to most international destinations.',
          carrier: 'Global Mail',
          estimated_days_min: 7,
          estimated_days_max: 21,
          cost: 19.99,
          currency: 'usd',
          is_domestic: false,
          is_active: true
        }
      ],
      ticket_categories: [
        {
          id: 'tcat_adult',
          code: 'adult',
          name: 'Adult',
          description: 'Standard admission for visitors ages 18\u201364.',
          min_age: 18,
          max_age: 64
        },
        {
          id: 'tcat_child_6_12',
          code: 'child_6_12',
          name: 'Children (6\u201312)',
          description: 'Reduced admission for children between 6 and 12 years old.',
          min_age: 6,
          max_age: 12
        },
        {
          id: 'tcat_child_generic',
          code: 'child',
          name: 'Child',
          description: 'General child ticket used for special events or exhibits.',
          min_age: 0,
          max_age: 17
        }
      ],
      ticket_types: [
        {
          id: 'ttype_general_entry',
          code: 'general_entry',
          name: 'General Museum Entry',
          description: 'Timed general admission to all permanent exhibitions.',
          base_price_adult: 18.0,
          base_price_child_6_12: 9.0,
          base_price_child: 0.0,
          base_price_senior: 14.0,
          currency: 'eur',
          max_daily_capacity: 1200,
          is_active: true
        },
        {
          id: 'ttype_special_exhibit_ancient',
          code: 'special_exhibit',
          name: 'Special Exhibition: Origins of Cheesemaking',
          description: 'Add-on ticket for the limited-time exhibition on the earliest evidence of cheese.',
          base_price_adult: 8.0,
          base_price_child_6_12: 4.0,
          base_price_child: 0.0,
          base_price_senior: 6.0,
          currency: 'eur',
          max_daily_capacity: 500,
          is_active: true
        },
        {
          id: 'ttype_event_entry_tasting',
          code: 'event_entry',
          name: 'Evening Tasting Event Entry',
          description: 'Ticket for special after-hours cheese tasting events.',
          base_price_adult: 30.0,
          base_price_child_6_12: 0.0,
          base_price_child: 0.0,
          base_price_senior: 25.0,
          currency: 'eur',
          max_daily_capacity: 150,
          is_active: true
        }
      ],
      timeline_events: [
        {
          id: 'tl_ancient_2000bce_clay_strainers',
          title: 'Clay Strainers Used for Curdling Milk',
          description: 'Perforated clay vessels from Central Europe show residues consistent with cheese production.',
          year: -2000,
          start_year: null,
          end_year: null,
          era_label: 'Ancient',
          region: 'europe',
          location: 'Kujawy, Poland',
          category: 'technology',
          image: 'https://i.pinimg.com/originals/93/3a/7a/933a7a0370de2c9353b6465ad7d7af08.jpg',
          is_highlight: true
        },
        {
          id: 'tl_ancient_1500bce_egypt_tomb_scene',
          title: 'Cheese Depicted in Egyptian Tomb Paintings',
          description: 'Wall paintings from Thebes show workers handling what appear to be curds and whey.',
          year: -1500,
          start_year: null,
          end_year: null,
          era_label: 'Ancient',
          region: 'africa',
          location: 'Thebes, Egypt',
          category: 'culture',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/73a1effd-4841-539c-ae8a-6965f7351b28.jpeg',
          is_highlight: false
        },
        {
          id: 'tl_ancient_800bce_greek_poetry',
          title: 'Cheese in Homeric Poetry',
          description: 'The Odyssey describes cheeses stored in the cave of the Cyclops, showing cheese as a familiar food in early Greek culture.',
          year: -800,
          start_year: null,
          end_year: null,
          era_label: 'Ancient',
          region: 'europe',
          location: 'Aegean Region',
          category: 'culture',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/922f7493-5bea-50ef-bf7c-d81df9b25c67.jpeg',
          is_highlight: false
        }
      ],
      program_sessions: [
        {
          id: 'sess_grand_20260810_1000',
          program_id: 'prog_tour_english_grand_history',
          start_datetime: '2026-08-10T10:00:00Z',
          end_datetime: '2026-08-10T12:00:00Z',
          price_adult: 22.0,
          price_child: 12.0,
          price_senior: 18.0,
          currency: 'eur',
          capacity_total: 25,
          is_weekend: false,
          is_morning: true,
          notes: 'Peak-season morning departure; arrives back at lobby by noon.',
          capacity_booked: 0
        },
        {
          id: 'sess_ancient_europe_20260810_1330',
          program_id: 'prog_tour_english_ancient_europe',
          start_datetime: '2026-08-10T13:30:00Z',
          end_datetime: '2026-08-10T15:00:00Z',
          price_adult: 18.0,
          price_child: 10.0,
          price_senior: 15.0,
          currency: 'eur',
          capacity_total: 22,
          is_weekend: false,
          is_morning: false,
          notes: 'Includes short stop in the Origins of Cheesemaking special exhibition.',
          capacity_booked: 2
        },
        {
          id: 'sess_modern_science_20260810_1530',
          program_id: 'prog_tour_english_modern_science',
          start_datetime: '2026-08-10T15:30:00Z',
          end_datetime: '2026-08-10T17:15:00Z',
          price_adult: 20.0,
          price_child: 0.0,
          price_senior: 17.0,
          currency: 'eur',
          capacity_total: 20,
          is_weekend: false,
          is_morning: false,
          notes: 'Recommended for visitors with a strong interest in science and technology.',
          capacity_booked: 2
        }
      ],
      program_bookings: [
        {
          id: 'book_ancient_europe_20260810_001',
          program_id: 'prog_tour_english_ancient_europe',
          session_id: 'sess_ancient_europe_20260810_1330',
          program_type: 'guided_tour',
          booking_date_created: '2026-07-15T09:20:00Z',
          start_datetime: '2026-08-10T13:30:00Z',
          duration_minutes: 90,
          adult_count: 2,
          child_count: 0,
          senior_count: 0,
          group_name: null,
          status: 'confirmed',
          total_price: 36.0,
          currency: 'eur'
        },
        {
          id: 'book_modern_science_20260810_001',
          program_id: 'prog_tour_english_modern_science',
          session_id: 'sess_modern_science_20260810_1530',
          program_type: 'guided_tour',
          booking_date_created: '2026-07-20T14:05:00Z',
          start_datetime: '2026-08-10T15:30:00Z',
          duration_minutes: 105,
          adult_count: 1,
          child_count: 0,
          senior_count: 1,
          group_name: null,
          status: 'confirmed',
          total_price: 37.0,
          currency: 'eur'
        },
        {
          id: 'book_family_highlights_20260614_001',
          program_id: 'prog_tour_english_family_highlights',
          session_id: 'sess_family_highlights_20260614_1030',
          program_type: 'guided_tour',
          booking_date_created: '2026-05-30T11:40:00Z',
          start_datetime: '2026-06-14T10:30:00Z',
          duration_minutes: 60,
          adult_count: 2,
          child_count: 2,
          senior_count: 0,
          group_name: 'Garcia Family',
          status: 'confirmed',
          total_price: 46.0,
          currency: 'eur'
        }
      ],
      admission_timeslots: [
        {
          id: 'ts_ge_20260516_1000',
          ticket_type_id: 'ttype_general_entry',
          date: '2026-05-16T00:00:00Z',
          start_time: '10:00',
          end_time: '11:00',
          capacity_total: 180,
          is_available: true,
          note: 'Morning general entry window.',
          capacity_booked: 3
        },
        {
          id: 'ts_ge_20260516_1200',
          ticket_type_id: 'ttype_general_entry',
          date: '2026-05-16T00:00:00Z',
          start_time: '12:00',
          end_time: '13:00',
          capacity_total: 180,
          is_available: true,
          note: 'Midday general entry window.',
          capacity_booked: 0
        },
        {
          id: 'ts_ge_20260516_1400',
          ticket_type_id: 'ttype_general_entry',
          date: '2026-05-16T00:00:00Z',
          start_time: '14:00',
          end_time: '15:00',
          capacity_total: 180,
          is_available: true,
          note: 'Early afternoon general entry window.',
          capacity_booked: 0
        }
      ],
      admission_bookings: [
        {
          id: 'ab_ge_20260515_1400_001',
          ticket_type_id: 'ttype_general_entry',
          timeslot_id: 'ts_ge_20260515_1400',
          visit_date: '2026-05-15T00:00:00Z',
          start_time: '14:00',
          end_time: '15:00',
          adult_count: 4,
          child_6_12_count: 6,
          child_count: 0,
          senior_count: 2,
          status: 'confirmed',
          created_at: '2026-04-20T10:15:00Z',
          total_price: 154.0,
          currency: 'eur'
        },
        {
          id: 'ab_ge_20260516_1000_001',
          ticket_type_id: 'ttype_general_entry',
          timeslot_id: 'ts_ge_20260516_1000',
          visit_date: '2026-05-16T00:00:00Z',
          start_time: '10:00',
          end_time: '11:00',
          adult_count: 2,
          child_6_12_count: 1,
          child_count: 0,
          senior_count: 0,
          status: 'confirmed',
          created_at: '2026-04-28T09:05:00Z',
          total_price: 45.0,
          currency: 'eur'
        },
        {
          id: 'ab_ge_20260516_1500_001',
          ticket_type_id: 'ttype_general_entry',
          timeslot_id: 'ts_ge_20260516_1500',
          visit_date: '2026-05-16T00:00:00Z',
          start_time: '15:00',
          end_time: '16:00',
          adult_count: 3,
          child_6_12_count: 0,
          child_count: 1,
          senior_count: 1,
          status: 'pending',
          created_at: '2026-05-01T14:22:00Z',
          total_price: 68.0,
          currency: 'eur'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:32.878896'
      }
    };

    // Extend generated data with a few additional records needed for happy-path flows

    // Extra workshop program and session for Task 5 (family workshop in June 2026)
    const extraWorkshopProgram = {
      id: 'prog_workshop_family_june2026',
      program_type: 'workshop',
      title: 'Family Cheese Workshop (Ages 8\u201312)',
      slug: 'family-cheese-workshop-ages-8-12',
      description: 'Hands-on cheese workshop for families with children ages 8\u201312.',
      themes: ['family', 'kids', 'hands-on'],
      duration_minutes: 90,
      language: 'english',
      audience_type: 'ages_8_12',
      min_age: 8,
      max_age: 12,
      is_family_friendly: true,
      base_price_adult: 35,
      base_price_child: 30,
      base_price_senior: 30,
      currency: 'eur',
      location: 'Education Studio',
      is_active: true
    };

    const extraWorkshopSession = {
      id: 'sess_workshop_family_20260613_1000',
      program_id: extraWorkshopProgram.id,
      start_datetime: '2026-06-13T10:00:00Z', // Saturday morning
      end_datetime: '2026-06-13T11:30:00Z',
      price_adult: 35,
      price_child: 30,
      price_senior: 30,
      currency: 'eur',
      capacity_total: 15,
      capacity_booked: 0,
      is_weekend: true,
      is_morning: true,
      notes: 'Weekend family workshop session.'
    };

    // Extra modern timeline events for Task 6 (1900-1950)
    const extraTimelineModern1 = {
      id: 'tl_modern_1905_refrigeration',
      title: 'Mechanical Refrigeration Reaches Dairies',
      description: 'Early 20th-century adoption of mechanical refrigeration in cheesemaking.',
      year: 1905,
      start_year: null,
      end_year: null,
      era_label: 'Modern',
      region: 'europe',
      location: 'Zurich, Switzerland',
      category: 'technology',
      image: 'https://example.com/refrigeration.jpg',
      is_highlight: false
    };

    const extraTimelineModern2 = {
      id: 'tl_modern_1930_industry',
      title: 'Industrial Cheese Aging Warehouses',
      description: 'Large-scale aging warehouses emerge to serve growing urban markets.',
      year: 1930,
      start_year: null,
      end_year: null,
      era_label: 'Modern',
      region: 'europe',
      location: 'Lyon, France',
      category: 'trade',
      image: 'https://example.com/aging-warehouse.jpg',
      is_highlight: false
    };

    // Extra cheese science book for Task 7
    const extraScienceBook = {
      id: 'prod_book_cheese_science_1',
      name: 'Microbes & Milk: Modern Cheese Science',
      slug: 'microbes-and-milk-modern-cheese-science',
      description: 'Explains microbiology and chemistry behind modern cheese production.',
      product_type: 'book',
      category: 'books',
      format: 'paperback',
      topic: 'cheese_science',
      price: 21.0,
      currency: 'usd',
      rating: 4.3,
      rating_count: 58,
      image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800&h=600&fit=crop&auto=format&q=80',
      stock_quantity: 20,
      is_available: true
    };

    // Build final arrays with generated + extra items
    const articles = generatedData.articles.slice();
    const exhibits = generatedData.exhibits.slice();
    const newsletterInterestOptions = generatedData.newsletter_interest_options.slice();
    const products = generatedData.products.slice();
    products.push(extraScienceBook);
    const programs = generatedData.programs.slice();
    programs.push(extraWorkshopProgram);
    const shippingOptions = generatedData.shipping_options.slice();
    const ticketCategories = generatedData.ticket_categories.slice();
    const ticketTypes = generatedData.ticket_types.slice();
    const timelineEvents = generatedData.timeline_events.slice();
    timelineEvents.push(extraTimelineModern1, extraTimelineModern2);
    const programSessions = generatedData.program_sessions.slice();
    programSessions.push(extraWorkshopSession);
    const programBookings = generatedData.program_bookings.slice();
    const admissionTimeslots = generatedData.admission_timeslots.slice();
    const admissionBookings = generatedData.admission_bookings.slice();

    // Persist into localStorage using storage keys
    localStorage.setItem('articles', JSON.stringify(articles));
    localStorage.setItem('exhibits', JSON.stringify(exhibits));
    localStorage.setItem('newsletter_interest_options', JSON.stringify(newsletterInterestOptions));
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('programs', JSON.stringify(programs));
    localStorage.setItem('shipping_options', JSON.stringify(shippingOptions));
    localStorage.setItem('ticket_categories', JSON.stringify(ticketCategories));
    localStorage.setItem('ticket_types', JSON.stringify(ticketTypes));
    localStorage.setItem('timeline_events', JSON.stringify(timelineEvents));
    localStorage.setItem('program_sessions', JSON.stringify(programSessions));
    localStorage.setItem('program_bookings', JSON.stringify(programBookings));
    localStorage.setItem('admission_timeslots', JSON.stringify(admissionTimeslots));
    localStorage.setItem('admission_bookings', JSON.stringify(admissionBookings));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_FamilyAdmissionBooking();
    this.testTask2_SelfGuidedRoute();
    this.testTask3_LongestEnglishGuidedTourUnder25();
    this.testTask4_ReadingListAgingArticles();
    this.testTask5_FamilyWorkshopRegistrationJune();
    this.testTask6_PinTimelineEventsAncientAndModern();
    this.testTask7_AddBooksToCartAndSelectStandardShipping();
    this.testTask8_NewsletterSubscriptionWithInterests();

    console.log('Finished flow tests.');
    return this.results;
  }

  // Task 1: Book an afternoon family museum visit on Saturday in May
  testTask1_FamilyAdmissionBooking() {
    const testName = 'Task 1: Book family general admission visit';
    try {
      // Fresh state per flow
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: homepage -> Visit -> Tickets & Hours
      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const visitorInfo = this.logic.getVisitorInfo();
      this.assert(visitorInfo != null, 'Visitor info should be returned');

      // Select date: 2026-05-16
      const availability = this.logic.getAdmissionAvailability('2026-05-16');
      this.assert(availability != null, 'Admission availability should be returned');
      this.assert(Array.isArray(availability.ticket_types), 'Availability should include ticket_types array');
      this.assert(Array.isArray(availability.timeslots), 'Availability should include timeslots array');

      // Find active General Museum Entry ticket type
      const generalEntryInfo = availability.ticket_types.find(function(tt) {
        return tt.ticket_type && tt.ticket_type.code === 'general_entry' && tt.ticket_type.is_active;
      });
      this.assert(generalEntryInfo, 'Should find active general entry ticket type');
      const generalTicketTypeId = generalEntryInfo.ticket_type.id;

      // From available timeslots for that ticket type, choose latest available (closest to afternoon)
      const relevantSlots = availability.timeslots.filter(function(slot) {
        return slot.ticket_type_id === generalTicketTypeId && slot.is_available;
      });
      this.assert(relevantSlots.length > 0, 'Should have at least one available timeslot for general entry');

      relevantSlots.sort(function(a, b) {
        return a.start_time.localeCompare(b.start_time);
      });
      const selectedSlot = relevantSlots[relevantSlots.length - 1];
      this.assert(selectedSlot.timeslot && selectedSlot.timeslot.id, 'Selected timeslot should have an ID');
      const timeslotId = selectedSlot.timeslot.id;

      // Create admission booking for 2 adults and 1 child (6-12), add to cart/visit summary
      const createResult = this.logic.createAdmissionBooking(timeslotId, 2, 1, 0, 0, true);
      this.assert(createResult && createResult.success === true, 'Admission booking should be created successfully');
      const booking = createResult.booking;
      const cartItem = createResult.cart_item;
      this.assert(booking != null, 'Booking object should be returned');
      this.assert(cartItem != null, 'Cart item for booking should be returned');
      this.assert(booking.timeslot_id === timeslotId, 'Booking should reference selected timeslot');
      this.assert(booking.adult_count === 2, 'Booking adult_count should be 2');
      this.assert(booking.child_6_12_count === 1, 'Booking child_6_12_count should be 1');

      // View cart / visit summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should return a cart');
      const items = cartSummary.items || [];
      const foundItem = items.find(function(item) {
        return item.cart_item && cartItem && item.cart_item.id === cartItem.id;
      });
      this.assert(foundItem, 'Cart should contain the admission cart item just created');
      this.assert(foundItem.admission_booking && foundItem.admission_booking.id === booking.id, 'Cart item should reference the admission booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create self-guided route of pre-1500 European exhibits under 90 minutes
  testTask2_SelfGuidedRoute() {
    const testName = 'Task 2: Build self-guided tour route under 90 minutes';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const exhibitFilterOptions = this.logic.getExhibitFilterOptions();
      this.assert(exhibitFilterOptions != null, 'Exhibit filter options should be returned');

      // Filter exhibits: Europe, estimated visit time <= 25 minutes, active only
      const listResponse = this.logic.listExhibits({
        region: 'europe',
        max_estimated_visit_time_minutes: 25,
        is_active_only: true
      }, 'visit_time_asc', 1, 20);
      this.assert(listResponse != null, 'listExhibits response should not be null');
      const exhibits = listResponse.exhibits || [];

      // Further restrict to pre-1500 exhibits using era_end_year <= 1500 if available
      const pre1500Exhibits = exhibits.filter(function(ex) {
        if (typeof ex.era_end_year === 'number') {
          return ex.era_end_year <= 1500;
        }
        return true;
      });

      this.assert(pre1500Exhibits.length > 0, 'Should have at least one pre-1500 European exhibit');

      // Select up to 4 exhibits from distinct European countries (we have 3 in generated data)
      const selectedExhibits = [];
      const seenCountries = {};
      for (let i = 0; i < pre1500Exhibits.length; i += 1) {
        const ex = pre1500Exhibits[i];
        if (!ex.country) {
          continue;
        }
        if (!seenCountries[ex.country]) {
          selectedExhibits.push(ex);
          seenCountries[ex.country] = true;
        }
        if (selectedExhibits.length >= 4) {
          break;
        }
      }

      this.assert(selectedExhibits.length >= 2, 'Should have exhibits from at least two different European countries');

      let lastRoute = null;
      let lastStops = null;

      // Add each selected exhibit to route
      for (let i = 0; i < selectedExhibits.length; i += 1) {
        const exhibit = selectedExhibits[i];
        const detail = this.logic.getExhibitDetail(exhibit.id);
        this.assert(detail && detail.exhibit && detail.exhibit.id === exhibit.id, 'Exhibit detail should match selected exhibit');

        const addResult = this.logic.addExhibitToRoute(exhibit.id);
        this.assert(addResult && addResult.success === true, 'Should successfully add exhibit to route');
        lastRoute = addResult.route;
        lastStops = addResult.stops || [];
        this.assert(lastRoute != null, 'Route should be returned');
        this.assert(Array.isArray(lastStops), 'Stops array should be returned');
        this.assert(lastStops.length === i + 1, 'Number of stops should increment with each added exhibit');
      }

      this.assert(lastRoute != null, 'Route should exist after adding exhibits');
      this.assert(lastStops && lastStops.length === selectedExhibits.length, 'Route should contain all selected exhibits');

      // Verify total estimated visit time is consistent with sum of route stops and <= 90 minutes
      const routeOverview = this.logic.getRouteOverview();
      this.assert(routeOverview && routeOverview.route, 'Route overview should be returned');
      const overviewStops = routeOverview.stops || [];
      let computedVisitTotal = 0;
      for (let i = 0; i < overviewStops.length; i += 1) {
        const rs = overviewStops[i].route_stop;
        computedVisitTotal += rs.estimated_visit_time_minutes;
      }
      this.assert(routeOverview.total_estimated_visit_time_minutes === computedVisitTotal,
        'Total visit time in overview should equal sum of stop visit times');
      this.assert(routeOverview.total_estimated_visit_time_minutes <= 90,
        'Total estimated visit time should be at or under 90 minutes');

      // Set route start time to 10:00, optimize for duration, with max total duration 90 min
      const updateResult = this.logic.updateRouteSettingsAndSchedule('10:00', true, 90);
      this.assert(updateResult && updateResult.route, 'Route should be returned after updating settings');
      this.assert(updateResult.route.start_time === '10:00', 'Route start_time should be set to 10:00');
      this.assert(typeof updateResult.total_estimated_duration_minutes === 'number',
        'Updated route should include total_estimated_duration_minutes');

      // Check that scheduled times exist for each stop if returned
      const scheduledStops = updateResult.stops || [];
      for (let i = 0; i < scheduledStops.length; i += 1) {
        const s = scheduledStops[i];
        this.assert(s.scheduled_start_time && s.scheduled_end_time,
          'Each stop should have scheduled start and end time when start_time is set');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Choose longest English guided tour under 25 EUR on specific date and start booking
  testTask3_LongestEnglishGuidedTourUnder25() {
    const testName = 'Task 3: Longest English guided tour under \u20ac25 on 2026-08-10';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const programFilterOptions = this.logic.getProgramFilterOptions();
      this.assert(programFilterOptions != null, 'Program filter options should be returned');

      // Filter guided tours: date 2026-08-10, language english, max_price 25, sort by duration desc
      const tourList = this.logic.listGuidedTours({
        date: '2026-08-10',
        language: 'english',
        max_price: 25
      }, 'duration_desc', 1, 20);

      this.assert(tourList != null, 'listGuidedTours response should not be null');
      const tours = tourList.tours || [];
      this.assert(tours.length > 0, 'Should have at least one matching English tour under \u20ac25');

      const selectedTourEntry = tours[0];
      const selectedProgram = selectedTourEntry.program;
      this.assert(selectedProgram != null, 'Selected tour program should be present');

      // Verify it is longest among filtered tours according to returned data
      for (let i = 1; i < tours.length; i += 1) {
        this.assert(selectedProgram.duration_minutes >= tours[i].program.duration_minutes,
          'Selected tour should have duration >= other tours in sorted list');
      }

      // Open tour detail and select a session on 2026-08-10
      const detail = this.logic.getProgramDetail(selectedProgram.id);
      this.assert(detail && detail.program && detail.program.id === selectedProgram.id, 'Program detail should match selected tour');
      const sessions = detail.sessions || [];
      this.assert(sessions.length > 0, 'Tour should have at least one session');

      const matchingSession = sessions.find(function(sess) {
        return typeof sess.start_datetime === 'string' && sess.start_datetime.indexOf('2026-08-10') === 0;
      }) || sessions[0];
      this.assert(matchingSession != null, 'Should find a session (preferably on 2026-08-10)');

      // Create booking for 1 adult, proceed to booking review (without adding to cart yet)
      const createBookingResult = this.logic.createProgramBooking(
        selectedProgram.id,
        matchingSession.id,
        1,
        0,
        0,
        null,
        false
      );
      this.assert(createBookingResult && createBookingResult.success === true, 'Program booking should be created successfully');
      const booking = createBookingResult.booking;
      this.assert(booking != null, 'ProgramBooking should be returned');
      this.assert(booking.program_id === selectedProgram.id, 'Booking should reference selected program');
      this.assert(booking.session_id === matchingSession.id, 'Booking should reference selected session');
      this.assert(booking.adult_count === 1, 'Booking adult_count should be 1');

      // Booking review page
      const review = this.logic.getProgramBookingReview(booking.id);
      this.assert(review && review.booking && review.booking.id === booking.id,
        'Booking review should return the created booking');
      this.assert(review.program && review.program.id === selectedProgram.id,
        'Review should include matching program');
      this.assert(review.session && review.session.id === matchingSession.id,
        'Review should include matching session');

      // Ensure price is within requested cap based on booking response
      this.assert(booking.total_price <= 25,
        'Booking total_price should be at or below \u20ac25 according to filters');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Build a reading list of 3 short articles on cheese aging from 1800-1950
  testTask4_ReadingListAgingArticles() {
    const testName = 'Task 4: Build reading list of 3 short aging articles (1800-1950)';
    try {
      this.clearStorage();
      this.setupTestData();

      const learnPage = this.logic.getLearnPageContent();
      this.assert(learnPage != null, 'Learn page content should be returned');

      const articleFilterOptions = this.logic.getArticleFilterOptions();
      this.assert(articleFilterOptions != null, 'Article filter options should be returned');

      // Filter for topic aging_maturation, time period 1800-1950, reading time <= 10, only published
      const list = this.logic.listArticles({
        topic: 'aging_maturation',
        time_period_start_year: 1800,
        time_period_end_year: 1950,
        max_reading_time_minutes: 10,
        is_published_only: true
      }, 'reading_time_asc', 1, 10);
      this.assert(list != null, 'listArticles response should not be null');
      const articles = list.articles || [];
      this.assert(articles.length >= 3, 'Should have at least 3 matching aging & maturation articles');

      const selectedArticles = articles.slice(0, 3);

      for (let i = 0; i < selectedArticles.length; i += 1) {
        const article = selectedArticles[i];
        const detail = this.logic.getArticleDetail(article.id);
        this.assert(detail && detail.article && detail.article.id === article.id,
          'Article detail should match selected article');
        this.assert(detail.article.topic === 'aging_maturation', 'Article topic should be aging_maturation');
        this.assert(detail.article.estimated_reading_time_minutes <= 10,
          'Article estimated reading time should be <= 10 minutes');

        const addResult = this.logic.addArticleToReadingList(article.id);
        this.assert(addResult && addResult.success === true, 'Should successfully add article to reading list');
        this.assert(addResult.reading_list != null, 'Reading list should be returned when adding');
      }

      // Open My Reading List / Saved Articles view
      const readingListResult = this.logic.getReadingList();
      this.assert(readingListResult && readingListResult.reading_list,
        'Reading list should be retrievable');
      const items = readingListResult.items || [];
      this.assert(items.length >= 3, 'Reading list should have at least 3 items after adding');

      const savedIds = items.map(function(entry) { return entry.article.id; });
      for (let i = 0; i < selectedArticles.length; i += 1) {
        this.assert(savedIds.indexOf(selectedArticles[i].id) !== -1,
          'Reading list should contain article id ' + selectedArticles[i].id);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Register a family (1 adult, 2 children) for weekend workshop in June under \u20ac40
  testTask5_FamilyWorkshopRegistrationJune() {
    const testName = 'Task 5: Register family for weekend June workshop under \u20ac40';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const programFilterOptions = this.logic.getProgramFilterOptions();
      this.assert(programFilterOptions != null, 'Program filter options should be returned');

      // List workshops: month June 2026, weekends only, audience ages_8_12, max_price 40
      const workshopsList = this.logic.listWorkshops({
        month: '2026-06',
        weekends_only: true,
        audience_type: 'ages_8_12',
        max_price: 40
      }, 1, 20);

      this.assert(workshopsList != null, 'listWorkshops response should not be null');
      const workshops = workshopsList.workshops || [];
      this.assert(workshops.length > 0, 'Should have at least one matching workshop in June 2026');

      const selectedWorkshopEntry = workshops[0];
      const program = selectedWorkshopEntry.program;
      this.assert(program != null, 'Workshop program should be present');
      this.assert(program.program_type === 'workshop', 'Selected program should be a workshop');

      const sampleSession = selectedWorkshopEntry.sample_weekend_morning_session;
      this.assert(sampleSession != null, 'Workshop entry should include a sample weekend morning session');
      this.assert(sampleSession.is_weekend === true, 'Sample session should be weekend');
      this.assert(sampleSession.is_morning === true, 'Sample session should be morning');
      this.assert(sampleSession.price_adult <= 40,
        'Sample session adult price should be at or below \u20ac40');

      // Open workshop detail and choose a weekend morning session in June 2026
      const detail = this.logic.getProgramDetail(program.id);
      this.assert(detail && detail.program && detail.program.id === program.id,
        'Program detail should match selected workshop');
      const sessions = detail.sessions || [];
      this.assert(sessions.length > 0, 'Workshop should have at least one session in detail view');

      const selectedSession = sessions.find(function(sess) {
        const isJune2026 = typeof sess.start_datetime === 'string' && sess.start_datetime.indexOf('2026-06') === 0;
        return isJune2026 && sess.is_weekend && sess.is_morning;
      }) || sessions[0];
      this.assert(selectedSession != null, 'Should select a workshop session (June weekend morning if available)');

      // Register 1 adult, 2 children, group name 'Taylor Family', do not add to cart yet
      const createBookingResult = this.logic.createProgramBooking(
        program.id,
        selectedSession.id,
        1,
        2,
        0,
        'Taylor Family',
        false
      );
      this.assert(createBookingResult && createBookingResult.success === true,
        'Workshop booking should be created successfully');
      const booking = createBookingResult.booking;
      this.assert(booking != null, 'ProgramBooking should be returned for workshop');
      this.assert(booking.program_type === 'workshop', 'Booking program_type should be workshop');
      this.assert(booking.program_id === program.id, 'Booking should reference selected workshop program');
      this.assert(booking.session_id === selectedSession.id, 'Booking should reference selected session');
      this.assert(booking.adult_count === 1, 'Booking adult_count should be 1');
      this.assert(booking.child_count === 2, 'Booking child_count should be 2');
      this.assert(booking.group_name === 'Taylor Family', 'Booking group_name should be Taylor Family');

      // Registration review page
      const review = this.logic.getProgramBookingReview(booking.id);
      this.assert(review && review.booking && review.booking.id === booking.id,
        'Booking review should return the created workshop booking');
      this.assert(review.program && review.program.id === program.id,
        'Review should include matching workshop program');
      this.assert(review.session && review.session.id === selectedSession.id,
        'Review should include matching workshop session');

      // Confirm the session is in June 2026 (based on returned data)
      this.assert(typeof review.session.start_datetime === 'string' &&
        review.session.start_datetime.indexOf('2026-06') === 0,
        'Workshop session should be scheduled in June 2026');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Pin 5 timeline events (3 ancient, 2 modern) to personal timeline
  testTask6_PinTimelineEventsAncientAndModern() {
    const testName = 'Task 6: Pin 3 ancient and 2 modern timeline events';
    try {
      this.clearStorage();
      this.setupTestData();

      const config = this.logic.getTimelineConfig();
      this.assert(config != null, 'Timeline config should be returned');

      // Ancient range: 2500 BCE to 1 CE
      const ancientList = this.logic.listTimelineEvents(-2500, 1, null, null);
      this.assert(ancientList != null, 'Ancient timeline events list should not be null');
      const ancientEventsAll = ancientList.events || [];
      this.assert(ancientEventsAll.length > 0, 'Should have ancient timeline events');

      // Select first 3 events whose year is between -2000 and 1
      const ancientSelected = [];
      for (let i = 0; i < ancientEventsAll.length; i += 1) {
        const ev = ancientEventsAll[i];
        if (typeof ev.year === 'number' && ev.year >= -2000 && ev.year <= 1) {
          ancientSelected.push(ev);
        }
        if (ancientSelected.length >= 3) {
          break;
        }
      }
      this.assert(ancientSelected.length > 0, 'Should select at least one ancient event in 2000 BCE - 1 CE range');

      const pinnedIds = [];

      for (let i = 0; i < ancientSelected.length; i += 1) {
        const ev = ancientSelected[i];
        const pinResult = this.logic.pinTimelineEvent(ev.id);
        this.assert(pinResult && pinResult.success === true, 'Should successfully pin ancient event');
        this.assert(pinResult.pinned_event && pinResult.pinned_event.event_id === ev.id,
          'PinnedTimelineEvent should reference pinned ancient event');
        pinnedIds.push(ev.id);
      }

      // Modern range: 1900-1950
      const modernList = this.logic.listTimelineEvents(1900, 1950, null, null);
      this.assert(modernList != null, 'Modern timeline events list should not be null');
      const modernEventsAll = modernList.events || [];
      this.assert(modernEventsAll.length >= 2, 'Should have at least two modern timeline events (1900-1950)');

      const modernSelected = modernEventsAll.slice(0, 2);
      for (let i = 0; i < modernSelected.length; i += 1) {
        const ev = modernSelected[i];
        const pinResult = this.logic.pinTimelineEvent(ev.id);
        this.assert(pinResult && pinResult.success === true, 'Should successfully pin modern event');
        this.assert(pinResult.pinned_event && pinResult.pinned_event.event_id === ev.id,
          'PinnedTimelineEvent should reference pinned modern event');
        pinnedIds.push(ev.id);
      }

      // My Timeline view
      const pinnedCollection = this.logic.getPinnedTimelineEvents();
      this.assert(pinnedCollection != null, 'Pinned timeline events collection should be returned');
      const pinnedEntries = pinnedCollection.events || [];
      this.assert(pinnedEntries.length >= pinnedIds.length,
        'Pinned events collection should contain at least ' + pinnedIds.length + ' events');

      const actualPinnedIds = pinnedEntries.map(function(entry) { return entry.event.id; });
      for (let i = 0; i < pinnedIds.length; i += 1) {
        this.assert(actualPinnedIds.indexOf(pinnedIds[i]) !== -1,
          'Personal timeline should contain pinned event id ' + pinnedIds[i]);
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add 3 cheese history books to cart and choose standard shipping
  testTask7_AddBooksToCartAndSelectStandardShipping() {
    const testName = 'Task 7: Add 3 qualifying books to cart and select standard shipping';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const categories = this.logic.getShopCategories();
      this.assert(Array.isArray(categories), 'Shop categories should be an array');
      const booksCategory = categories.find(function(cat) { return cat.code === 'books'; });
      this.assert(booksCategory, 'Books category should be available');

      const bookFilterOptions = this.logic.getBookFilterOptions();
      this.assert(bookFilterOptions != null, 'Book filter options should be returned');

      // First: 2 paperback European cheese history books under $30, rating >= 4
      const euroBooksList = this.logic.listBooks({
        format: 'paperback',
        topic: 'european_cheese_history',
        min_rating: 4,
        max_price: 30,
        product_type: 'book',
        category: 'books'
      }, 'price_asc', 1, 10);
      this.assert(euroBooksList != null, 'listBooks response for European history should not be null');
      const euroBooks = euroBooksList.products || [];
      this.assert(euroBooks.length >= 2, 'Should have at least two qualifying European cheese history books');

      const euroSelected = euroBooks.slice(0, 2);
      const addedProductIds = [];

      for (let i = 0; i < euroSelected.length; i += 1) {
        const p = euroSelected[i];
        this.assert(p.format === 'paperback', 'Selected European history book should be paperback');
        this.assert(p.topic === 'european_cheese_history', 'Selected European book topic should be european_cheese_history');
        this.assert(p.price < 30.01, 'Selected European book price should be under $30');
        this.assert(p.rating >= 4, 'Selected European book rating should be at least 4');

        const addResult = this.logic.addProductToCart(p.id, 1);
        this.assert(addResult && addResult.success === true, 'Should successfully add European history book to cart');
        this.assert(addResult.cart_item && addResult.cart_item.product_id === p.id,
          'Cart item should reference added European history book');
        addedProductIds.push(p.id);
      }

      // Second: 1 paperback cheese science book under $25, rating >=4
      const scienceBooksList = this.logic.listBooks({
        format: 'paperback',
        topic: 'cheese_science',
        min_rating: 4,
        max_price: 25,
        product_type: 'book',
        category: 'books'
      }, 'price_asc', 1, 10);
      this.assert(scienceBooksList != null, 'listBooks response for cheese science should not be null');
      const scienceBooks = scienceBooksList.products || [];
      this.assert(scienceBooks.length >= 1, 'Should have at least one qualifying cheese science book');

      const scienceBook = scienceBooks[0];
      this.assert(scienceBook.format === 'paperback', 'Science book should be paperback');
      this.assert(scienceBook.topic === 'cheese_science', 'Science book topic should be cheese_science');
      this.assert(scienceBook.price < 25.01, 'Science book price should be under $25');
      this.assert(scienceBook.rating >= 4, 'Science book rating should be at least 4');

      const addScienceResult = this.logic.addProductToCart(scienceBook.id, 1);
      this.assert(addScienceResult && addScienceResult.success === true,
        'Should successfully add cheese science book to cart');
      this.assert(addScienceResult.cart_item && addScienceResult.cart_item.product_id === scienceBook.id,
        'Cart item should reference added science book');
      addedProductIds.push(scienceBook.id);

      // View cart and select Standard Domestic shipping
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should be returned after adding books');
      const cartItems = cartSummary.items || [];

      // Verify all three books are present in cart as shop_product items
      const productIdsInCart = cartItems.filter(function(ci) { return ci.product; })
        .map(function(ci) { return ci.product.id; });
      for (let i = 0; i < addedProductIds.length; i += 1) {
        const id = addedProductIds[i];
        this.assert(productIdsInCart.indexOf(id) !== -1,
          'Cart should contain added product id ' + id);
      }

      // Select Standard Domestic shipping option
      const shippingOptions = cartSummary.shipping_options || [];
      this.assert(shippingOptions.length > 0, 'Cart should expose shipping options');
      const standardOption = shippingOptions.find(function(opt) { return opt.method_code === 'standard_domestic'; });
      this.assert(standardOption != null, 'Standard Domestic shipping option should be available');

      const selectResult = this.logic.selectShippingOption(standardOption.id);
      this.assert(selectResult && selectResult.success === true, 'Selecting shipping option should succeed');
      this.assert(selectResult.selected_shipping_option && selectResult.selected_shipping_option.id === standardOption.id,
        'Selected shipping option in response should match requested Standard Domestic');

      const updatedCartSummary = this.logic.getCartSummary();
      this.assert(updatedCartSummary.selected_shipping_option_id === standardOption.id,
        'Cart summary should reflect selected Standard Domestic shipping option');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Subscribe to museum newsletter with specific interests and monthly frequency
  testTask8_NewsletterSubscriptionWithInterests() {
    const testName = 'Task 8: Subscribe to newsletter with interests and monthly frequency';
    try {
      this.clearStorage();
      this.setupTestData();

      const home = this.logic.getHomepageContent();
      this.assert(home != null, 'Homepage content should be returned');

      const options = this.logic.getNewsletterOptions();
      this.assert(options != null, 'Newsletter options should be returned');
      const interests = options.interests || [];
      const frequencyOptions = options.frequency_options || [];
      const languageOptions = options.language_options || [];

      // Select interests: Ancient Cheese History and Museum Events & Workshops
      const ancientInterest = interests.find(function(opt) { return opt.code === 'ancient_cheese_history'; });
      const eventsInterest = interests.find(function(opt) { return opt.code === 'museum_events_workshops'; });
      this.assert(ancientInterest != null, 'Ancient Cheese History interest option should exist');
      this.assert(eventsInterest != null, 'Museum Events & Workshops interest option should exist');

      const interestCodes = [ancientInterest.code, eventsInterest.code];

      // Select monthly digest frequency
      const monthlyFreq = frequencyOptions.find(function(f) { return f.value === 'monthly_digest'; });
      this.assert(monthlyFreq != null, 'Monthly digest frequency option should exist');

      // Select preferred language English, if available
      const englishLang = languageOptions.find(function(l) { return l.value === 'english'; });
      const preferredLanguage = englishLang ? englishLang.value : null;

      // Subscribe
      const email = 'visitor@example.com';
      const subscribeResult = this.logic.subscribeToNewsletter(email, preferredLanguage, monthlyFreq.value, interestCodes);
      this.assert(subscribeResult && subscribeResult.success === true,
        'Newsletter subscription should be created successfully');
      const subscription = subscribeResult.subscription;
      this.assert(subscription != null, 'NewsletterSubscription should be returned');
      this.assert(subscription.email === email, 'Subscription email should match input');
      this.assert(subscription.frequency === 'monthly_digest', 'Subscription frequency should be monthly_digest');

      // Optional follow-up preferences step: confirm same frequency and interests
      const updateResult = this.logic.updateNewsletterPreferences('monthly_digest', null);
      this.assert(updateResult && updateResult.success === true,
        'Updating/confirming newsletter preferences should succeed');
      this.assert(updateResult.subscription != null, 'Updated subscription should be returned');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and logging
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
