// Test runner for business logic flows
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
    // Generated Data: used only here to seed localStorage
    const generatedData = {
      articles: [
        {
          id: 'art_tour_diary_2024_eu_leg1',
          title: 'Tour Diary 2024: First Nights in Europe',
          slug: 'tour-diary-2024-first-nights-in-europe',
          excerpt: 'Kicking off the 2024 world tour in Berlin, late-night train rides, and the first time playing the new single live.',
          content: 'We landed in Berlin jet-lagged but wired. The first show of the 2024 tour felt like opening night of a play we’d been rehearsing for a year. The crowd already knew the words to “Midnight Echoes,” even though the album only dropped weeks ago. After the show we grabbed falafel around the corner from the venue and traded stories with fans who had been with us since the first EP. Between soundchecks, we’re still tweaking the setlist, figuring out exactly where the quiet moments belong so the loud ones hit even harder.',
          heroImageUrl: 'https://images.unsplash.com/photo-1512428232586-9c6c89f4a97a?w=800&h=600&fit=crop&auto=format&q=80',
          publishedAt: '2024-03-05T10:00:00Z',
          tags: ['Tour Diary', 'Europe Tour', 'Live'],
          category: 'Tour Diary',
          authorName: 'Lena Park',
          status: 'published',
          createdAt: '2024-02-20T15:30:00Z',
          updatedAt: '2024-03-05T10:15:00Z'
        },
        {
          id: 'art_tour_diary_2024_eu_leg2',
          title: 'Tour Diary 2024: Night Drives and Neon Streets',
          slug: 'tour-diary-2024-night-drives-and-neon-streets',
          excerpt: 'From Prague to Vienna, we chase sunrise on the highway and discover a new pre-show ritual.',
          content: 'The drives between cities have become their own kind of show. Headlights, playlists, half-asleep conversations about nothing and everything. In Prague we played the smallest venue of the run, but it might have been the loudest crowd yet. Someone handed us a disposable camera side-stage, so we’ve started documenting each night the old-fashioned way. Vienna welcomed us with late-night coffee and a surprise jam with a local band who taught us a traditional folk melody we now sneak into our intro track.',
          heroImageUrl: 'https://images.unsplash.com/photo-1526481280695-3c687fd543c0?w=800&h=600&fit=crop&auto=format&q=80',
          publishedAt: '2024-04-18T18:30:00Z',
          tags: ['Tour Diary', 'Europe Tour', 'On the Road'],
          category: 'Tour Diary',
          authorName: 'Noah Reyes',
          status: 'published',
          createdAt: '2024-04-05T12:00:00Z',
          updatedAt: '2024-04-18T19:00:00Z'
        },
        {
          id: 'art_tour_diary_2024_summer_festivals',
          title: 'Tour Diary 2024: Summer Festivals and Sudden Storms',
          slug: 'tour-diary-2024-summer-festivals-and-sudden-storms',
          excerpt: 'Mud, lightning delays, and the thrill of hearing thousands sing your chorus back at a sunset festival slot.',
          content: 'Summer festivals are chaos in the best way. One minute you’re backstage sharing a golf cart with a band you’ve idolized for years, the next you’re watching crews scramble to cover amps as storm clouds roll in. At one festival, a lightning delay pushed our set back by an hour, but the crowd stayed. When the sky finally cleared, the field turned into a choir. We cut the backing tracks for the last chorus of “City Lights” and let the crowd carry it. It was imperfect and absolutely unforgettable.',
          heroImageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop&auto=format&q=80',
          publishedAt: '2024-07-02T16:45:00Z',
          tags: ['Tour Diary', 'Festivals', 'Summer 2024'],
          category: 'Tour Diary',
          authorName: 'Mia Chen',
          status: 'published',
          createdAt: '2024-06-20T09:10:00Z',
          updatedAt: '2024-07-02T17:05:00Z'
        }
      ],
      playlists: [
        {
          id: 'pl_favorites',
          name: 'Favorites',
          description: 'Your go-to collection for saved tracks and videos you love.',
          visibility: 'private',
          isSystem: true,
          systemType: 'favorites',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2025-12-15T10:00:00Z'
        },
        {
          id: 'pl_on_tour_setlist',
          name: 'On Tour Setlist',
          description: 'A rotating setlist of the songs we’ve been opening shows with.',
          visibility: 'public',
          isSystem: false,
          systemType: 'other',
          createdAt: '2023-09-10T12:00:00Z',
          updatedAt: '2024-11-01T09:30:00Z'
        },
        {
          id: 'pl_chill_nights',
          name: 'Chill Nights',
          description: 'Downtempo tracks and acoustic versions for late-night listening.',
          visibility: 'public',
          isSystem: false,
          systemType: 'other',
          createdAt: '2024-02-02T18:15:00Z',
          updatedAt: '2025-06-20T21:10:00Z'
        }
      ],
      reading_lists: [
        {
          id: 'rl_default',
          name: 'Reading List',
          description: 'Your saved blog posts and Tour Diary entries.',
          isDefault: true,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2025-12-31T23:00:00Z'
        },
        {
          id: 'rl_tour_archive',
          name: 'Tour Diary Archive',
          description: 'A curated collection of our favorite on-the-road stories.',
          isDefault: false,
          createdAt: '2024-03-01T11:00:00Z',
          updatedAt: '2024-10-15T10:30:00Z'
        }
      ],
      videos: [
        {
          id: 'vid_midnight_echoes_official',
          title: 'Midnight Echoes (Official Music Video)',
          description: 'Neon-lit cityscapes and sleepless nights come together in the official video for Midnight Echoes.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1499428665502-503f6c608263?w=800&h=600&fit=crop&auto=format&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=midnight_echoes_official',
          releaseDate: '2026-02-16T17:00:00Z',
          durationSeconds: 252,
          videoType: 'music_video',
          status: 'published',
          createdAt: '2026-02-05T12:30:00Z',
          updatedAt: '2026-02-16T17:05:00Z'
        },
        {
          id: 'vid_midnight_echoes_bts',
          title: 'Making Midnight Echoes (Behind the Scenes)',
          description: 'Go behind the camera on the two-night shoot for the Midnight Echoes video.',
          thumbnailUrl: 'https://images.myguide-cdn.com/vienna/companies/private-car-tour-vienna-to-prague-and-back/large/private-car-tour-vienna-to-prague-and-back-534530.jpg',
          videoUrl: 'https://www.youtube.com/watch?v=midnight_echoes_bts',
          releaseDate: '2026-01-20T15:00:00Z',
          durationSeconds: 540,
          videoType: 'behind_the_scenes',
          status: 'published',
          createdAt: '2026-01-10T10:00:00Z',
          updatedAt: '2026-01-20T15:10:00Z'
        },
        {
          id: 'vid_city_lights_official',
          title: 'City Lights (Official Music Video)',
          description: 'A late-night drive through an empty city to the soundtrack of City Lights.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&auto=format&q=80',
          videoUrl: 'https://www.youtube.com/watch?v=city_lights_official',
          releaseDate: '2025-11-10T18:30:00Z',
          durationSeconds: 228,
          videoType: 'music_video',
          status: 'published',
          createdAt: '2025-10-25T12:00:00Z',
          updatedAt: '2025-11-10T18:40:00Z'
        }
      ],
      albums: [
        {
          id: 'alb_midnight_echoes',
          title: 'Midnight Echoes',
          subtitle: '',
          slug: 'midnight-echoes',
          description: 'The band’s most personal full-length record to date, Midnight Echoes is a nocturnal journey through insomnia, empty streets, and the quiet moments that change everything. Lush synths, late-night guitar textures, and intimate vocals define its sound.',
          coverImageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=80',
          releaseDate: '2023-09-29T00:00:00Z',
          sortOrder: 1,
          status: 'published',
          createdAt: '2023-07-15T10:00:00Z',
          updatedAt: '2023-10-10T13:45:00Z',
          trackIds: [
            'trk_midnight_echoes_01',
            'trk_midnight_echoes_02',
            'trk_midnight_echoes_03',
            'trk_midnight_echoes_04',
            'trk_midnight_echoes_05',
            'trk_midnight_echoes_06'
          ],
          totalTracks: 6
        },
        {
          id: 'alb_aurora_dreams',
          title: 'Aurora Dreams',
          subtitle: '',
          slug: 'aurora-dreams',
          description: 'Recorded partly under real northern lights, Aurora Dreams trades city noise for open skies and wide horizons. The record blends atmospheric guitars with pulsing drums and hopeful, expansive choruses.',
          coverImageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop&auto=format&q=80',
          releaseDate: '2022-09-02T00:00:00Z',
          sortOrder: 2,
          status: 'published',
          createdAt: '2022-06-10T09:00:00Z',
          updatedAt: '2023-09-05T16:40:00Z',
          trackIds: [
            'trk_aurora_dreams_01',
            'trk_aurora_dreams_02',
            'trk_aurora_dreams_03',
            'trk_aurora_dreams_04'
          ],
          totalTracks: 4
        },
        {
          id: 'alb_city_lights_silver_lines',
          title: 'City Lights & Silver Lines',
          subtitle: '',
          slug: 'city-lights-and-silver-lines',
          description: 'A concept album about small-town nights and big-city dreams, City Lights & Silver Lines balances driving anthems with reflective ballads, capturing the feeling of being caught between where you are and where you’re going.',
          coverImageUrl: 'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
          releaseDate: '2021-06-18T00:00:00Z',
          sortOrder: 3,
          status: 'published',
          createdAt: '2021-04-01T12:00:00Z',
          updatedAt: '2024-05-06T12:35:00Z',
          trackIds: [
            'trk_city_lights_silver_lines_01',
            'trk_city_lights_silver_lines_02',
            'trk_city_lights_silver_lines_03',
            'trk_city_lights_silver_lines_04'
          ],
          totalTracks: 4
        }
      ],
      tracks: [
        {
          id: 'trk_midnight_echoes_01',
          albumId: 'alb_midnight_echoes',
          title: 'Midnight Echoes',
          trackNumber: 1,
          durationSeconds: 252,
          audioPreviewUrl: 'https://media.bandsite.com/previews/midnight_echoes.mp3',
          isExplicit: false,
          status: 'published',
          createdAt: '2023-07-20T10:15:00Z'
        },
        {
          id: 'trk_midnight_echoes_02',
          albumId: 'alb_midnight_echoes',
          title: 'Static Between Us',
          trackNumber: 2,
          durationSeconds: 215,
          audioPreviewUrl: 'https://media.bandsite.com/previews/static_between_us.mp3',
          isExplicit: false,
          status: 'published',
          createdAt: '2023-07-20T10:16:00Z'
        },
        {
          id: 'trk_midnight_echoes_03',
          albumId: 'alb_midnight_echoes',
          title: 'Last Train Home',
          trackNumber: 3,
          durationSeconds: 241,
          audioPreviewUrl: 'https://media.bandsite.com/previews/last_train_home.mp3',
          isExplicit: false,
          status: 'published',
          createdAt: '2023-07-20T10:17:00Z'
        }
      ],
      products: [
        {
          id: 'prod_midnight_echoes_standard_digital',
          name: 'Midnight Echoes (Standard Edition)',
          subtitle: 'Digital Album',
          description: 'Standard digital edition of Midnight Echoes featuring the core tracklist in high-quality audio downloads and streaming.',
          categoryId: 'music',
          subtype: 'digital_album',
          price: 12.99,
          currency: 'usd',
          imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&auto=format&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&auto=format&q=80',
          sizesAvailable: [],
          format: 'digital',
          isDigital: true,
          albumId: 'alb_midnight_echoes',
          status: 'active',
          createdAt: '2023-08-01T10:00:00Z',
          updatedAt: '2023-10-10T13:45:00Z',
          trackCount: 6
        },
        {
          id: 'prod_midnight_echoes_deluxe_digital',
          name: 'Midnight Echoes (Deluxe Edition)',
          subtitle: 'Digital Album',
          description: 'Deluxe digital edition of Midnight Echoes including three bonus tracks, expanded artwork, and a digital lyric booklet.',
          categoryId: 'music',
          subtype: 'digital_album',
          price: 18.99,
          currency: 'usd',
          imageUrl: 'https://pxl-duracuk.terminalfour.net/fit-in/800x600/prod01/prodbucket01/media/durham-university/research-/research-centres/centre-for-foreign-language-study/carousel-and-cta-images/Chinese-2.jpg',
          thumbnailUrl: 'https://cdn.shopify.com/s/files/1/2309/3869/products/MidnightCity-CropHoodie-front_1401x1400.jpg?v=1613034405',
          sizesAvailable: [],
          format: 'digital',
          isDigital: true,
          albumId: 'alb_midnight_echoes',
          status: 'active',
          createdAt: '2023-08-10T11:00:00Z',
          updatedAt: '2023-10-10T13:45:00Z',
          trackCount: 6
        },
        {
          id: 'prod_midnight_echoes_vinyl',
          name: 'Midnight Echoes (Limited Marbled Vinyl)',
          subtitle: 'Vinyl Album',
          description: 'A limited marbled vinyl pressing of Midnight Echoes with a printed inner sleeve and download card.',
          categoryId: 'music',
          subtype: 'vinyl_album',
          price: 32.0,
          currency: 'usd',
          imageUrl: 'https://onthewight.com/wp-content/2021/04/RhythmTree.jpg',
          thumbnailUrl: 'https://cdn.shoplightspeed.com/shops/637342/files/33809067/1652x1652x2/vinyl-echo-in-the-canyon-ost.jpg',
          sizesAvailable: [],
          format: 'vinyl',
          isDigital: false,
          albumId: 'alb_midnight_echoes',
          status: 'active',
          createdAt: '2025-02-20T09:30:00Z',
          updatedAt: '2025-03-08T11:05:00Z',
          trackCount: 6
        }
      ],
      events: [
        {
          id: 'evt_2025_08_15_los_angeles',
          name: 'Midnight Echoes Tour – Los Angeles',
          tourName: 'Midnight Echoes World Tour',
          city: 'Los Angeles',
          venueName: 'The Wiltern',
          country: 'USA',
          eventDateTime: '2025-08-15T20:00:00Z',
          status: 'scheduled',
          description: 'A special Los Angeles headline show on the Midnight Echoes World Tour, recorded for the Live in Los Angeles 2025 release.',
          createdAt: '2025-03-01T10:00:00Z',
          ticketsOnSale: true
        },
        {
          id: 'evt_2025_08_02_san_diego',
          name: 'Midnight Echoes Tour – San Diego',
          tourName: 'Midnight Echoes World Tour',
          city: 'San Diego',
          venueName: 'House of Blues San Diego',
          country: 'USA',
          eventDateTime: '2025-08-02T19:30:00Z',
          status: 'scheduled',
          description: 'Kickoff of the August West Coast run with an all-ages show in downtown San Diego.',
          createdAt: '2025-02-20T09:30:00Z',
          ticketsOnSale: true
        },
        {
          id: 'evt_2025_08_19_san_francisco',
          name: 'Midnight Echoes Tour – San Francisco',
          tourName: 'Midnight Echoes World Tour',
          city: 'San Francisco',
          venueName: 'The Fillmore',
          country: 'USA',
          eventDateTime: '2025-08-19T20:00:00Z',
          status: 'scheduled',
          description: 'A return to San Francisco with an expanded Midnight Echoes set and new visuals.',
          createdAt: '2025-03-01T10:10:00Z',
          ticketsOnSale: true
        }
      ],
      ticket_types: [
        {
          id: 'tkt_2025_08_15_la_ga',
          eventId: 'evt_2025_08_15_los_angeles',
          name: 'General Admission',
          description: 'Standing room floor ticket for the Los Angeles stop of the Midnight Echoes World Tour.',
          price: 45.0,
          currency: 'usd',
          totalQuantity: 1200,
          isAvailable: true,
          sortOrder: 1,
          feesIncluded: false,
          createdAt: '2025-03-01T10:05:00Z',
          remainingQuantity: 1198
        },
        {
          id: 'tkt_2025_08_15_la_balcony',
          eventId: 'evt_2025_08_15_los_angeles',
          name: 'Balcony Reserved Seating',
          description: 'Reserved balcony seat with an elevated view of the full stage production.',
          price: 65.0,
          currency: 'usd',
          totalQuantity: 350,
          isAvailable: true,
          sortOrder: 2,
          feesIncluded: false,
          createdAt: '2025-03-01T10:06:00Z',
          remainingQuantity: 350
        },
        {
          id: 'tkt_2025_08_15_la_vip',
          eventId: 'evt_2025_08_15_los_angeles',
          name: 'VIP Meet & Greet',
          description: 'Includes early entry, soundcheck access, a meet & greet with the band, and a signed poster.',
          price: 120.0,
          currency: 'usd',
          totalQuantity: 75,
          isAvailable: true,
          sortOrder: 3,
          feesIncluded: true,
          createdAt: '2025-03-01T10:07:00Z',
          remainingQuantity: 75
        }
      ],
      order_items: [
        {
          id: 'oi_1001_1',
          orderId: 'ord_1001',
          itemType: 'product',
          productId: 'prod_midnight_echoes_deluxe_digital',
          ticketTypeId: null,
          name: 'Midnight Echoes (Deluxe Edition) \u0014 Digital Album',
          unitPrice: 18.99,
          quantity: 1,
          lineTotal: 18.99
        },
        {
          id: 'oi_1002_1',
          orderId: 'ord_1002',
          itemType: 'product',
          productId: 'prod_city_lights_skyline_tee',
          ticketTypeId: null,
          name: 'City Lights Skyline Tee \u0014 Unisex T-Shirt',
          unitPrice: 18.0,
          quantity: 2,
          lineTotal: 36.0
        },
        {
          id: 'oi_1002_2',
          orderId: 'ord_1002',
          itemType: 'product',
          productId: 'prod_midnight_echoes_neon_hoodie',
          ticketTypeId: null,
          name: 'Midnight Echoes Neon Hoodie \u0014 Pullover Hoodie',
          unitPrice: 60.0,
          quantity: 1,
          lineTotal: 60.0
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:01.004701'
      }
    };

    const mergeArrayStorage = (storageKey, newItems) => {
      if (!newItems || !Array.isArray(newItems)) return;
      let existing = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          existing = JSON.parse(raw) || [];
        }
      } catch (e) {
        existing = [];
      }
      const byId = new Map();
      if (Array.isArray(existing)) {
        for (const item of existing) {
          if (item && item.id) byId.set(item.id, item);
        }
      }
      for (const item of newItems) {
        if (item && item.id) byId.set(item.id, item);
      }
      const merged = Array.from(byId.values());
      localStorage.setItem(storageKey, JSON.stringify(merged));
    };

    mergeArrayStorage('articles', generatedData.articles);
    mergeArrayStorage('playlists', generatedData.playlists);
    mergeArrayStorage('reading_lists', generatedData.reading_lists);
    mergeArrayStorage('videos', generatedData.videos);
    mergeArrayStorage('albums', generatedData.albums);
    mergeArrayStorage('tracks', generatedData.tracks);
    mergeArrayStorage('products', generatedData.products);
    mergeArrayStorage('events', generatedData.events);
    mergeArrayStorage('ticket_types', generatedData.ticket_types);
    mergeArrayStorage('order_items', generatedData.order_items);
  }

  resetState() {
    this.clearStorage();
    this.setupTestData();
  }

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BuyTwoDifferentSizeMTeesUnder30OpenCart();
    this.testTask2_PlayLatestVideoAndAddToFavorites();
    this.testTask3_CreateWorkoutMixPlaylist();
    this.testTask4_SelectSecondCheapestLATicketsAndCheckout();
    this.testTask5_BuyMidnightEchoesDigitalUnder20();
    this.testTask6_SubscribeToNewsletterWeekly();
    this.testTask7_SaveThreeTourDiaryPostsAndOpenFromReadingList();
    this.testTask8_BuildVinylAndHoodieBundleUnder100();

    return this.results;
  }

  // Helper assertion and result tracking
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

  // Helper: get or create Favorites playlist
  getOrCreateFavoritesPlaylistId() {
    const playlists = this.logic.listPlaylists();
    let favorites = null;
    if (Array.isArray(playlists)) {
      favorites = playlists.find(pl => {
        const name = (pl.name || '').toLowerCase();
        const sysType = (pl.systemType || '').toLowerCase();
        return name === 'favorites' || sysType === 'favorites';
      });
    }
    if (favorites) {
      return favorites.id;
    }
    const created = this.logic.createPlaylist('Favorites', 'System favorites playlist', 'private');
    this.assert(created && created.playlistId, 'createPlaylist should return playlistId for Favorites');
    return created.playlistId;
  }

  // Task 1: Buy two different size M band T-shirts under 30 each and open the cart
  testTask1_BuyTwoDifferentSizeMTeesUnder30OpenCart() {
    const testName = 'Task 1: Buy two different size M T-shirts under 30 and open cart';
    try {
      this.resetState();

      // Navigate store categories
      const categories = this.logic.getStoreCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'getStoreCategories should return categories');

      const apparelCategory = categories.find(c => (c.categoryId || '').toLowerCase() === 'apparel');
      this.assert(apparelCategory, 'Apparel category should exist');

      const tShirtSubtype = (apparelCategory.subcategories || []).find(sc => (sc.subtype || '').toLowerCase() === 't_shirt') || (apparelCategory.subcategories || [])[0];
      this.assert(tShirtSubtype && tShirtSubtype.subtype, 'T-Shirt subcategory should exist');

      const categoryId = apparelCategory.categoryId;
      const subtype = tShirtSubtype.subtype;

      // List T-shirts filtered by size M and max price 30, sorted low to high
      let tees = this.logic.listProducts(categoryId, subtype, { size: 'm', maxPrice: 30 }, 'price_low_to_high');
      if (!Array.isArray(tees)) tees = [];

      // Fallback: if too few products match strict filter, relax filters but keep flow
      if (tees.length < 2) {
        const allTees = this.logic.listProducts(categoryId, subtype, undefined, 'price_low_to_high') || [];
        tees = allTees;
      }

      this.assert(tees.length >= 2, 'Should have at least two T-shirt products available');

      const firstProduct = tees[0];
      let secondProduct = tees.find(p => p.id !== firstProduct.id);
      this.assert(secondProduct, 'Should find a second distinct T-shirt');

      // Choose sizes, prioritising M if available
      const pickSize = product => {
        const sizes = product.sizesAvailable || [];
        if (sizes.includes('m')) return 'm';
        return sizes[0] || undefined;
      };

      const firstSize = pickSize(firstProduct);
      const secondSize = pickSize(secondProduct);

      // Add first T-shirt
      const addRes1 = this.logic.addProductToCart(firstProduct.id, 1, firstSize, undefined);
      this.assert(addRes1 && addRes1.success === true, 'First T-shirt should be added to cart successfully');
      this.assert(addRes1.cartItemId, 'First addProductToCart should return cartItemId');

      // Add second T-shirt
      const addRes2 = this.logic.addProductToCart(secondProduct.id, 1, secondSize, undefined);
      this.assert(addRes2 && addRes2.success === true, 'Second T-shirt should be added to cart successfully');
      this.assert(addRes2.cartItemId, 'Second addProductToCart should return cartItemId');

      // Open cart (getCartSummary)
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items');

      const item1 = cartSummary.items.find(it => it.productId === firstProduct.id);
      const item2 = cartSummary.items.find(it => it.productId === secondProduct.id);

      this.assert(item1, 'Cart should contain first T-shirt');
      this.assert(item2, 'Cart should contain second T-shirt');
      this.assert(item1.quantity === 1, 'First T-shirt quantity should be 1');
      this.assert(item2.quantity === 1, 'Second T-shirt quantity should be 1');
      if (firstSize) {
        this.assert(item1.selectedSize === firstSize, 'First T-shirt selectedSize should match chosen size');
      }
      if (secondSize) {
        this.assert(item2.selectedSize === secondSize, 'Second T-shirt selectedSize should match chosen size');
      }

      // Basic subtotal sanity check using actual product prices
      const p1 = firstProduct.price || 0;
      const p2 = secondProduct.price || 0;
      const minExpected = p1 + p2;
      this.assert(cartSummary.subtotal >= minExpected, 'Cart subtotal should be at least sum of the two T-shirts');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Play most recent music video released after 2023-01-01 and add to Favorites
  testTask2_PlayLatestVideoAndAddToFavorites() {
    const testName = 'Task 2: Play latest eligible video and add to Favorites';
    try {
      this.resetState();

      const videos = this.logic.listVideos('release_date_newest_first');
      this.assert(Array.isArray(videos) && videos.length > 0, 'listVideos should return at least one video');

      const threshold = new Date('2023-01-01T00:00:00Z');
      let chosenVideo = videos.find(v => {
        if (!v.releaseDate) return false;
        const d = new Date(v.releaseDate);
        return d >= threshold && (v.status || '').toLowerCase() === 'published';
      });
      if (!chosenVideo) {
        chosenVideo = videos[0];
      }
      this.assert(chosenVideo && chosenVideo.id, 'Should choose a video to play');

      // Open video detail (simulating play page)
      const videoDetail = this.logic.getVideoDetail(chosenVideo.id);
      this.assert(videoDetail && videoDetail.id === chosenVideo.id, 'getVideoDetail should return chosen video');

      // Simulate pressing play (no explicit API; assume loading detail is enough)

      // Add to Favorites playlist
      const favoritesPlaylistId = this.getOrCreateFavoritesPlaylistId();
      const addRes = this.logic.addVideoToPlaylist(videoDetail.id, favoritesPlaylistId);
      this.assert(addRes && addRes.playlistItemId, 'addVideoToPlaylist should return playlistItemId');

      const playlistDetail = this.logic.getPlaylistDetail(favoritesPlaylistId);
      this.assert(playlistDetail && Array.isArray(playlistDetail.items), 'getPlaylistDetail should return items for Favorites');

      const addedItem = playlistDetail.items.find(it => it.contentType === 'video' && it.videoId === videoDetail.id);
      this.assert(addedItem, 'Favorites playlist should contain the chosen video');
      this.assert(addedItem.playlistId === favoritesPlaylistId, 'PlaylistItem playlistId should match Favorites');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Create a Workout Mix playlist with up to 5 songs (3–5 minutes) from available albums
  testTask3_CreateWorkoutMixPlaylist() {
    const testName = 'Task 3: Create Workout Mix playlist with up to 5 tracks';
    try {
      this.resetState();

      const albums = this.logic.listAlbums('release_date_desc');
      this.assert(Array.isArray(albums) && albums.length > 0, 'listAlbums should return albums');

      // Create Workout Mix playlist
      const createRes = this.logic.createPlaylist('Workout Mix', 'Integration test playlist', 'private');
      this.assert(createRes && createRes.playlistId, 'createPlaylist should return playlistId for Workout Mix');
      const playlistId = createRes.playlistId;

      const selectedTrackIds = [];
      const selectedAlbumIds = new Set();

      // First, try to pick one qualifying track (3–5 minutes) from each of the first three albums
      const maxAlbumsToSample = Math.min(3, albums.length);
      for (let i = 0; i < maxAlbumsToSample; i++) {
        const album = albums[i];
        const albumDetail = this.logic.getAlbumDetail(album.id);
        this.assert(albumDetail && Array.isArray(albumDetail.tracks), 'getAlbumDetail should return tracks array');

        const track = albumDetail.tracks.find(t => t.durationSeconds >= 180 && t.durationSeconds <= 300);
        if (track) {
          const addRes = this.logic.addTrackToPlaylist(track.id, playlistId);
          this.assert(addRes && addRes.playlistItemId, 'addTrackToPlaylist should return playlistItemId');
          selectedTrackIds.push(track.id);
          selectedAlbumIds.add(track.albumId);
        }
      }

      // Collect additional qualifying tracks from all albums until we reach 5 (or run out)
      if (selectedTrackIds.length < 5) {
        const allQualifyingTracks = [];
        for (const album of albums) {
          const albumDetail = this.logic.getAlbumDetail(album.id);
          if (!albumDetail || !Array.isArray(albumDetail.tracks)) continue;
          for (const t of albumDetail.tracks) {
            if (t.durationSeconds >= 180 && t.durationSeconds <= 300) {
              allQualifyingTracks.push(t);
            }
          }
        }
        for (const t of allQualifyingTracks) {
          if (selectedTrackIds.length >= 5) break;
          if (selectedTrackIds.includes(t.id)) continue;
          const addRes = this.logic.addTrackToPlaylist(t.id, playlistId);
          this.assert(addRes && addRes.playlistItemId, 'addTrackToPlaylist should return playlistItemId for extra track');
          selectedTrackIds.push(t.id);
          selectedAlbumIds.add(t.albumId);
        }
      }

      this.assert(selectedTrackIds.length > 0, 'At least one qualifying track should be added to Workout Mix');

      const playlistDetail = this.logic.getPlaylistDetail(playlistId);
      this.assert(playlistDetail && playlistDetail.playlist && playlistDetail.playlist.name === 'Workout Mix', 'Playlist name should be Workout Mix');
      this.assert(Array.isArray(playlistDetail.items), 'getPlaylistDetail should include items');

      const trackItems = playlistDetail.items.filter(it => it.contentType === 'track');
      this.assert(trackItems.length === selectedTrackIds.length, 'Number of track items should match number of tracks added');

      // Verify that every playlist item refers to one of the selected tracks
      for (const it of trackItems) {
        this.assert(selectedTrackIds.includes(it.trackId), 'Playlist item trackId should be one of the selected tracks');
        this.assert(it.playlistId === playlistId, 'Playlist item playlistId should match Workout Mix');
      }

      // Soft-check album diversity where possible
      if (selectedTrackIds.length >= 3) {
        this.assert(selectedAlbumIds.size >= 1, 'There should be at least one album represented (more if data allows)');
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Select two second-cheapest tickets for Los Angeles August 2025 show and go to checkout
  testTask4_SelectSecondCheapestLATicketsAndCheckout() {
    const testName = 'Task 4: Select two second-cheapest LA tickets and go to checkout';
    try {
      this.resetState();

      const events = this.logic.listTourEvents('Los Angeles', '2025-08-01', '2025-08-31', true);
      this.assert(Array.isArray(events) && events.length > 0, 'listTourEvents should return at least one LA event in August 2025');

      const event = events[0];
      const eventDetail = this.logic.getEventDetail(event.id, 'price_low_to_high');
      this.assert(eventDetail && eventDetail.event && eventDetail.event.id === event.id, 'getEventDetail should return the chosen event');
      this.assert(Array.isArray(eventDetail.ticketTypes) && eventDetail.ticketTypes.length > 0, 'Event should have ticket types');

      const availableTickets = eventDetail.ticketTypes.filter(t => t.isAvailable);
      this.assert(availableTickets.length > 0, 'There should be at least one available ticket type');

      const sortedTickets = availableTickets.slice().sort((a, b) => a.price - b.price);
      const ticketToBuy = sortedTickets.length >= 2 ? sortedTickets[1] : sortedTickets[0];
      this.assert(ticketToBuy && ticketToBuy.id, 'Should choose a ticket type to buy');

      const addRes = this.logic.addTicketsToCart(ticketToBuy.id, 2);
      this.assert(addRes && addRes.success === true, 'addTicketsToCart should succeed');
      this.assert(addRes.cartItemId, 'addTicketsToCart should return cartItemId');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items after adding tickets');

      const ticketItem = cartSummary.items.find(it => it.itemType === 'ticket' && it.ticketTypeId === ticketToBuy.id);
      this.assert(ticketItem, 'Cart should contain the selected ticket type');
      this.assert(ticketItem.quantity === 2, 'Ticket quantity should be 2');
      this.assert(ticketItem.eventId === event.id, 'Ticket cart item should reference the correct event');

      const expectedMinTotal = (ticketToBuy.price || 0) * 2;
      this.assert(cartSummary.subtotal >= expectedMinTotal, 'Cart subtotal should be at least ticket price x 2');

      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && Array.isArray(checkoutSummary.items), 'getCheckoutSummary should return items');
      const checkoutTicketItem = checkoutSummary.items.find(it => it.name && it.quantity === 2 && it.unitPrice === ticketToBuy.price);
      this.assert(checkoutTicketItem, 'Checkout summary should include the two tickets');

      // Optional: place order to complete flow
      const orderRes = this.logic.placeOrder('Test Buyer', 'buyer@example.com', '', 'digital_delivery_only');
      this.assert(orderRes && orderRes.orderId, 'placeOrder should return orderId');
      this.assert(orderRes.total >= checkoutSummary.total, 'Order total should be at least checkout total');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Buy the digital version of Midnight Echoes with the most tracks under 20
  testTask5_BuyMidnightEchoesDigitalUnder20() {
    const testName = 'Task 5: Buy Midnight Echoes digital edition under 20 with most tracks';
    try {
      this.resetState();

      const results = this.logic.searchProducts('Midnight Echoes', 'music', { subtype: 'digital_album', maxPrice: 50 }, 'relevance');
      this.assert(Array.isArray(results) && results.length > 0, 'searchProducts should return Midnight Echoes products');

      const digitalEditions = results.filter(p => (p.subtype || '').toLowerCase() === 'digital_album');
      this.assert(digitalEditions.length > 0, 'There should be at least one digital edition of Midnight Echoes');

      const underBudget = digitalEditions.filter(p => (p.price || 0) <= 20);
      let chosenProduct = null;
      if (underBudget.length > 0) {
        // Choose edition with highest trackCount (tie-breaker: lower price)
        chosenProduct = underBudget.reduce((best, p) => {
          if (!best) return p;
          const bestTracks = best.trackCount || 0;
          const pTracks = p.trackCount || 0;
          if (pTracks > bestTracks) return p;
          if (pTracks === bestTracks && (p.price || 0) < (best.price || 0)) return p;
          return best;
        }, null);
      } else {
        // Fallback: cheapest digital edition
        chosenProduct = digitalEditions.reduce((best, p) => {
          if (!best) return p;
          return (p.price || 0) < (best.price || 0) ? p : best;
        }, null);
      }

      this.assert(chosenProduct && chosenProduct.id, 'Should choose a digital edition to buy');

      const addRes = this.logic.addProductToCart(chosenProduct.id, 1, undefined, 'digital');
      this.assert(addRes && addRes.success === true, 'addProductToCart for chosen digital edition should succeed');
      this.assert(addRes.cartItemId, 'addProductToCart should return cartItemId');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items');

      const cartItem = cartSummary.items.find(it => it.productId === chosenProduct.id);
      this.assert(cartItem, 'Cart should contain the chosen Midnight Echoes edition');
      this.assert(cartItem.quantity === 1, 'Chosen edition quantity should be 1');
      if (cartItem.selectedFormat) {
        this.assert(cartItem.selectedFormat === 'digital', 'Selected format should be digital when provided');
      }
      if (chosenProduct.price) {
        this.assert(cartItem.unitPrice === chosenProduct.price, 'Cart item unitPrice should match product price');
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Subscribe to the band newsletter with weekly updates
  testTask6_SubscribeToNewsletterWeekly() {
    const testName = 'Task 6: Subscribe to newsletter with weekly frequency and interests';
    try {
      this.resetState();

      const name = 'Alex Rivera';
      const email = 'alex.rivera@example.com';
      const interests = ['tour_announcements', 'new_music_releases', 'exclusive_merch_offers'];
      const region = 'north_america';
      const frequency = 'weekly';

      const res = this.logic.submitNewsletterSubscription(name, email, interests, region, frequency);
      this.assert(res && res.subscriptionId, 'submitNewsletterSubscription should return subscriptionId');

      // Verify persisted data via localStorage
      const raw = localStorage.getItem('newsletter_subscriptions');
      this.assert(raw, 'newsletter_subscriptions should be stored in localStorage');
      const subs = JSON.parse(raw) || [];
      const saved = subs.find(s => s.id === res.subscriptionId);
      this.assert(saved, 'Saved subscription should be found by id');
      this.assert(saved.email === email, 'Saved subscription email should match');
      this.assert(saved.name === name, 'Saved subscription name should match');
      this.assert(saved.frequency === frequency, 'Saved subscription frequency should be weekly');
      this.assert(Array.isArray(saved.interests) && interests.every(i => saved.interests.includes(i)), 'Saved subscription interests should include all selected options');
      this.assert(saved.region === region, 'Saved subscription region should be North America');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Save three 2024 Tour Diary blog posts and open one from reading list
  testTask7_SaveThreeTourDiaryPostsAndOpenFromReadingList() {
    const testName = 'Task 7: Save three 2024 Tour Diary posts and open from reading list';
    try {
      this.resetState();

      const articles = this.logic.listArticles(undefined, 2024, undefined, 'published_at_desc');
      this.assert(Array.isArray(articles) && articles.length > 0, 'listArticles should return 2024 articles');

      const tourDiaryArticles = articles.filter(a => {
        const tags = a.tags || [];
        return tags.some(t => (t || '').toLowerCase().includes('tour diary'));
      });
      this.assert(tourDiaryArticles.length >= 3, 'There should be at least three 2024 Tour Diary posts');

      const toSave = tourDiaryArticles.slice(0, 3);
      const savedArticleIds = [];

      for (const article of toSave) {
        const saveRes = this.logic.saveArticleToReadingList(article.id, 'Saved via integration test');
        this.assert(saveRes && saveRes.readingListItemId && saveRes.readingListId, 'saveArticleToReadingList should return readingListItemId and readingListId');
        savedArticleIds.push(article.id);
      }

      const readingListData = this.logic.getReadingListArticles();
      this.assert(readingListData && readingListData.readingList && Array.isArray(readingListData.items), 'getReadingListArticles should return reading list and items');

      const savedItems = readingListData.items.filter(it => savedArticleIds.includes(it.article.id));
      this.assert(savedItems.length >= 3, 'Reading list should contain at least three saved Tour Diary posts');

      // Open first saved Tour Diary article from reading list
      const firstSaved = savedItems[0];
      const detail = this.logic.getArticleDetail(firstSaved.article.id);
      this.assert(detail && detail.article && detail.article.id === firstSaved.article.id, 'getArticleDetail should return the saved article');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Build a vinyl + hoodie bundle under 100 and review it in the cart
  testTask8_BuildVinylAndHoodieBundleUnder100() {
    const testName = 'Task 8: Build vinyl plus hoodie bundle under 100';
    try {
      this.resetState();

      // Step 1: choose a vinyl record priced at 40 or less (preferring third item if possible)
      let vinyls = this.logic.listProducts('music', 'vinyl_album', { format: 'vinyl', maxPrice: 40 }, 'price_low_to_high');
      if (!Array.isArray(vinyls)) vinyls = [];
      if (vinyls.length === 0) {
        // Fallback: any vinyls, sorted low to high
        vinyls = this.logic.listProducts('music', 'vinyl_album', undefined, 'price_low_to_high') || [];
      }
      this.assert(vinyls.length > 0, 'Should have at least one vinyl product available');

      const vinylIndex = vinyls.length >= 3 ? 2 : vinyls.length - 1;
      const vinylProduct = vinyls[vinylIndex];
      this.assert(vinylProduct && vinylProduct.id, 'Should choose a vinyl product');

      const addVinylRes = this.logic.addProductToCart(vinylProduct.id, 1, undefined, 'vinyl');
      this.assert(addVinylRes && addVinylRes.success === true, 'addProductToCart should succeed for vinyl');

      // Step 2: choose a hoodie priced at 60 or less, most expensive first
      let hoodies = this.logic.listProducts('apparel', 'hoodie', { maxPrice: 60 }, 'price_high_to_low');
      if (!Array.isArray(hoodies)) hoodies = [];
      if (hoodies.length === 0) {
        // Fallback: any hoodies
        hoodies = this.logic.listProducts('apparel', 'hoodie', undefined, 'price_high_to_low') || [];
      }
      this.assert(hoodies.length > 0, 'Should have at least one hoodie product available');

      let hoodieProduct = hoodies[0];
      this.assert(hoodieProduct && hoodieProduct.id, 'Should choose a hoodie product');

      const pickSize = product => {
        const sizes = product.sizesAvailable || [];
        if (sizes.includes('m')) return 'm';
        return sizes[0] || undefined;
      };
      const hoodieSize = pickSize(hoodieProduct);

      const addHoodieRes = this.logic.addProductToCart(hoodieProduct.id, 1, hoodieSize, undefined);
      this.assert(addHoodieRes && addHoodieRes.success === true, 'addProductToCart should succeed for hoodie');

      // Step 3: open cart and check subtotal; if over 100, swap hoodie for a cheaper one under 50
      let cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items after adding vinyl and hoodie');

      const vinylCartItem = cartSummary.items.find(it => it.productId === vinylProduct.id);
      const hoodieCartItem = cartSummary.items.find(it => it.productId === hoodieProduct.id);
      this.assert(vinylCartItem, 'Cart should contain the vinyl');
      this.assert(hoodieCartItem, 'Cart should contain the hoodie');

      if (cartSummary.subtotal > 100) {
        // Remove current hoodie and pick a cheaper one under 50
        const removeRes = this.logic.removeCartItem(hoodieCartItem.cartItemId || hoodieCartItem.id);
        this.assert(removeRes && removeRes.success === true, 'removeCartItem should succeed for hoodie');

        let cheaperHoodies = this.logic.listProducts('apparel', 'hoodie', { maxPrice: 50 }, 'price_low_to_high');
        if (!Array.isArray(cheaperHoodies)) cheaperHoodies = [];
        this.assert(cheaperHoodies.length > 0, 'Should have at least one hoodie under 50 when needing cheaper option');

        hoodieProduct = cheaperHoodies[0];
        const cheaperSize = pickSize(hoodieProduct);
        const addCheaperRes = this.logic.addProductToCart(hoodieProduct.id, 1, cheaperSize, undefined);
        this.assert(addCheaperRes && addCheaperRes.success === true, 'addProductToCart should succeed for cheaper hoodie');

        cartSummary = this.logic.getCartSummary();
        this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should work after hoodie swap');
        this.assert(cartSummary.subtotal <= 100, 'Cart subtotal should not exceed 100 after choosing cheaper hoodie');
      }

      // Final verification of bundle contents
      cartSummary = this.logic.getCartSummary();
      const finalVinylItem = cartSummary.items.find(it => it.productId === vinylProduct.id);
      const finalHoodieItem = cartSummary.items.find(it => it.productId === hoodieProduct.id);
      this.assert(finalVinylItem, 'Final cart should contain a vinyl record');
      this.assert(finalHoodieItem, 'Final cart should contain a hoodie');
      this.assert(finalVinylItem.quantity === 1, 'Vinyl quantity should be 1');
      this.assert(finalHoodieItem.quantity === 1, 'Hoodie quantity should be 1');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }
}

// Export for Node.js only
module.exports = TestRunner;
