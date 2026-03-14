// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (values preserved, formatting adapted to JS)
    const generatedData = {
      artworks: [
        {
          id: 'art_soft_morning_hills',
          title: 'Soft Morning Hills',
          category: 'landscape',
          year: 2022,
          medium: 'watercolor_on_paper',
          color_palette: 'earth_tones',
          width_cm: 42,
          height_cm: 30,
          depth_cm: 0,
          price: 220,
          is_for_sale: true,
          sale_kind: 'original',
          shop_category: 'originals',
          main_image_url:
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: [
            'https://picsum.photos/800/600?random=11',
            'https://picsum.photos/800/600?random=12'
          ],
          description:
            'Gentle rolling hills in transparent watercolor, capturing the pale light of early morning.',
          is_featured: true,
          created_at: '2023-01-15T10:00:00Z',
          updated_at: '2023-06-01T10:00:00Z'
        },
        {
          id: 'art_riverbend_dusk',
          title: 'Riverbend Dusk',
          category: 'landscape',
          year: 2023,
          medium: 'acrylic_on_canvas',
          color_palette: 'earth_tones',
          width_cm: 60,
          height_cm: 45,
          depth_cm: 3.5,
          price: 280,
          is_for_sale: true,
          sale_kind: 'original',
          shop_category: 'originals',
          main_image_url:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: ['https://picsum.photos/800/600?random=21'],
          description:
            'A bend in the river at blue hour with layered acrylic glazes and soft reflections.',
          is_featured: false,
          created_at: '2023-05-10T09:30:00Z',
          updated_at: '2023-11-02T09:30:00Z'
        },
        {
          id: 'art_after_rain_meadows',
          title: 'After Rain Meadows',
          category: 'landscape',
          year: 2024,
          medium: 'watercolor_on_paper',
          color_palette: 'pastel',
          width_cm: 50,
          height_cm: 35,
          depth_cm: 0,
          price: 180,
          is_for_sale: true,
          sale_kind: 'original',
          shop_category: 'originals',
          main_image_url:
            'https://images.unsplash.com/photo-1500534318100-bbd07b9503d2?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: ['https://picsum.photos/800/600?random=31'],
          description:
            'Soft pastel washes describe a meadow shimmering after a summer rainstorm.',
          is_featured: true,
          created_at: '2024-03-01T14:00:00Z',
          updated_at: '2024-09-10T14:00:00Z'
        }
      ],
      documents: [
        {
          id: 'doc_lookbook_2024',
          title: '2024 Portfolio Lookbook',
          document_category: 'lookbook',
          file_type: 'pdf',
          year: 2024,
          file_url:
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          description:
            'A curated selection of 2022–2024 paintings, cityscapes, and murals in a downloadable PDF lookbook.',
          status: 'active',
          created_at: '2024-01-05T09:00:00Z',
          updated_at: '2024-06-10T09:00:00Z'
        },
        {
          id: 'doc_lookbook_2023',
          title: '2023 Portfolio Lookbook',
          document_category: 'lookbook',
          file_type: 'pdf',
          year: 2023,
          file_url:
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          description:
            'Archived 2023 lookbook featuring earlier landscape and figure works.',
          status: 'archived',
          created_at: '2023-01-10T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 'doc_presskit_2025',
          title: 'Press Kit 2025',
          document_category: 'press_kit',
          file_type: 'pdf',
          year: 2025,
          file_url:
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          description:
            'Press-ready artist bio, statements, and selected images for 2025 exhibitions.',
          status: 'active',
          created_at: '2025-02-01T11:15:00Z',
          updated_at: '2025-07-20T11:15:00Z'
        }
      ],
      exhibitions: [
        {
          id: 'exh_2025_summer_light',
          title: 'Summer Light: New Landscapes',
          venue_name: 'Riverbank Contemporary',
          venue_address: '14 Spreeufer',
          venue_city: 'Berlin',
          venue_country: 'Germany',
          start_date: '2025-07-02T18:00:00Z',
          end_date: '2025-08-10T18:00:00Z',
          description_short:
            'A solo exhibition of recent landscape paintings exploring shifting summer light.',
          description_long:
            'Summer Light: New Landscapes brings together over twenty recent plein-air and studio landscapes created between 2022 and 2024. The exhibition traces subtle shifts in palette and composition as the artist follows the changing light along rivers, fields, and hillsides.',
          website_url: 'https://riverbank-contemporary.example.com/summer-light',
          status: 'past',
          is_featured: true,
          created_at: '2025-03-15T09:00:00Z',
          updated_at: '2025-09-01T09:00:00Z'
        },
        {
          id: 'exh_2025_small_works',
          title: 'Small Works Salon',
          venue_name: 'Atelier West',
          venue_address: '220 Linden Street',
          venue_city: 'Portland',
          venue_country: 'USA',
          start_date: '2025-08-20T17:00:00Z',
          end_date: '2025-09-15T17:00:00Z',
          description_short:
            'A curated group show of small-format pieces under 40 cm.',
          description_long:
            'Atelier West’s annual Small Works Salon features compact paintings, drawings, and prints by over thirty artists. The show highlights the intimacy of small-scale work, including several of the artist’s pastel studies and miniature cityscapes.',
          website_url: 'https://atelierwest.example.com/small-works-2025',
          status: 'past',
          is_featured: false,
          created_at: '2025-04-01T10:00:00Z',
          updated_at: '2025-09-20T10:00:00Z'
        },
        {
          id: 'exh_2025_autumn_city_glow',
          title: 'Autumn City Glow',
          venue_name: 'Gallery Ten',
          venue_address: '10 Orchard Lane',
          venue_city: 'London',
          venue_country: 'UK',
          start_date: '2025-10-15T18:30:00Z',
          end_date: '2025-11:30T18:30:00Z',
          description_short:
            'New cityscapes tracing the rhythms of dusk and dawn.',
          description_long:
            'Autumn City Glow presents a series of large-format cityscapes painted on the cusp of night and day. Layered reflections, wet streets, and silhouetted architecture explore how cities transform under changing light.',
          website_url: 'https://galleryten.example.com/autumn-city-glow',
          status: 'past',
          is_featured: true,
          created_at: '2025-06-05T11:30:00Z',
          updated_at: '2025-12-10T11:30:00Z'
        }
      ],
      projects: [
        {
          id: 'proj_2023_lumentech_lobby',
          title: 'LumenTech HQ Lobby Mural',
          client_name: 'LumenTech Systems',
          client_type: 'business_commercial',
          project_category: 'mural',
          year: 2023,
          completed_date: '2023-09-30T00:00:00Z',
          description_short:
            'A luminous abstract cityscape mural for a technology company lobby.',
          description_long:
            'Commissioned by LumenTech Systems for their headquarters lobby, this 6-meter mural uses layered geometry and gradients to echo circuit diagrams and city grids. The mural anchors the reception area and is visible from the street, acting as both artwork and wayfinding.',
          location: 'LumenTech HQ, Seattle, USA',
          wall_width_m: 6,
          wall_height_m: 3,
          image_url:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: [
            'https://picsum.photos/800/600?random=201',
            'https://picsum.photos/800/600?random=202'
          ],
          status: 'published',
          created_at: '2023-05-01T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'proj_2023_blossom_bakery_mural',
          title: 'Blossom Bakery Exterior Mural',
          client_name: 'Blossom Bakery',
          client_type: 'business_commercial',
          project_category: 'mural',
          year: 2023,
          completed_date: '2023-06-15T00:00:00Z',
          description_short:
            'A cheerful pastel façade mural for a neighborhood bakery.',
          description_long:
            'This street-facing mural wraps around the corner of Blossom Bakery, featuring stylized flowers, breads, and coffee motifs in a pastel palette. The design invites passersby into the space and has become a popular photo backdrop.',
          location: 'Blossom Bakery, Portland, USA',
          wall_width_m: 9,
          wall_height_m: 3,
          image_url:
            'https://images.unsplash.com/photo-1500534318100-bbd07b9503d2?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: ['https://picsum.photos/800/600?random=211'],
          status: 'published',
          created_at: '2023-02-20T11:30:00Z',
          updated_at: '2023-11-05T11:30:00Z'
        },
        {
          id: 'proj_2024_greenleaf_cafe_mural',
          title: 'Greenleaf Café Interior Mural',
          client_name: 'Greenleaf Café',
          client_type: 'business_commercial',
          project_category: 'mural',
          year: 2024,
          completed_date: '2024-08-10T00:00:00Z',
          description_short:
            'A calming botanical mural for a plant-filled café.',
          description_long:
            'Greenleaf Café commissioned an interior mural that blends abstract leaf forms with hints of city skylines. The 4.5-meter wall sits opposite the main counter, creating a lush backdrop for guests and events.',
          location: 'Greenleaf Café, Vancouver, Canada',
          wall_width_m: 4.5,
          wall_height_m: 2.7,
          image_url:
            'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: [
            'https://picsum.photos/800/600?random=221',
            'https://picsum.photos/800/600?random=222'
          ],
          status: 'published',
          created_at: '2024-04-01T09:20:00Z',
          updated_at: '2024-12-01T09:20:00Z'
        }
      ],
      products: [
        {
          id: 'prod_after_rain_meadows_orig',
          artwork_id: 'art_after_rain_meadows',
          name: 'After Rain Meadows (Original Painting)',
          shop_category: 'originals',
          category: 'landscape',
          year: 2024,
          description:
            'Original watercolor landscape on paper, framed behind glass. Soft pastel palette capturing a meadow shimmering after rainfall.',
          price: 180,
          currency: 'usd',
          sku: 'ORIG-ARM-2024',
          available: true,
          stock_quantity: 1,
          image_url:
            'https://images.unsplash.com/photo-1500534318100-bbd07b9503d2?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: ['https://picsum.photos/800/600?random=31'],
          width_cm: 50,
          height_cm: 35,
          depth_cm: 0,
          size_options: [
            {
              code: 'original_35x50',
              label: 'Original 35 x 50 cm',
              width_cm: 50,
              height_cm: 35,
              price: 180
            }
          ],
          frame_options: [
            {
              code: 'unframed',
              label: 'Unframed (matted)',
              price_delta: 0
            },
            {
              code: 'black_floater',
              label: 'Black floater frame',
              price_delta: 90
            }
          ],
          default_size_label: 'Original 35 x 50 cm',
          default_frame_label: 'Unframed (matted)',
          status: 'active',
          created_at: '2025-01-02T10:00:00Z',
          updated_at: '2025-06-10T10:00:00Z'
        },
        {
          id: 'prod_portrait_window_light_orig',
          artwork_id: 'art_portrait_window_light',
          name: 'Portrait in Window Light (Original Painting)',
          shop_category: 'originals',
          category: 'portrait',
          year: 2023,
          description:
            'Original oil portrait on canvas, depicting a figure turned toward a bright window in soft, neutral tones.',
          price: 950,
          currency: 'usd',
          sku: 'ORIG-PWL-2023',
          available: true,
          stock_quantity: 1,
          image_url:
            'https://s3.amazonaws.com/fineartimages.dailypaintworks.com/auction_8b533648-a327-4c3e-9d01-cd0535f83636.jpg?imageVersion=2',
          additional_image_urls: ['https://picsum.photos/800/600?random=131'],
          width_cm: 40,
          height_cm: 50,
          depth_cm: 3.5,
          size_options: [
            {
              code: 'original_50x40',
              label: 'Original 50 x 40 cm',
              width_cm: 40,
              height_cm: 50,
              price: 950
            }
          ],
          frame_options: [
            {
              code: 'unframed_canvas',
              label: 'Unframed (stretched canvas)',
              price_delta: 0
            },
            {
              code: 'walnut_frame',
              label: 'Walnut frame',
              price_delta: 120
            }
          ],
          default_size_label: 'Original 50 x 40 cm',
          default_frame_label: 'Unframed (stretched canvas)',
          status: 'active',
          created_at: '2024-08-10T10:00:00Z',
          updated_at: '2025-03-15T10:00:00Z'
        },
        {
          id: 'prod_soft_morning_hills_orig',
          artwork_id: 'art_soft_morning_hills',
          name: 'Soft Morning Hills (Original Painting)',
          shop_category: 'originals',
          category: 'landscape',
          year: 2022,
          description:
            'Original watercolor on paper of gentle rolling hills under pale morning light.',
          price: 220,
          currency: 'usd',
          sku: 'ORIG-SMH-2022',
          available: true,
          stock_quantity: 1,
          image_url:
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop&auto=format&q=80',
          additional_image_urls: [
            'https://picsum.photos/800/600?random=11',
            'https://picsum.photos/800/600?random=12'
          ],
          width_cm: 42,
          height_cm: 30,
          depth_cm: 0,
          size_options: [
            {
              code: 'original_30x42',
              label: 'Original 30 x 42 cm',
              width_cm: 42,
              height_cm: 30,
              price: 220
            }
          ],
          frame_options: [
            {
              code: 'unframed',
              label: 'Unframed (matted)',
              price_delta: 0
            },
            {
              code: 'light_oak',
              label: 'Light oak frame',
              price_delta: 75
            }
          ],
          default_size_label: 'Original 30 x 42 cm',
          default_frame_label: 'Unframed (matted)',
          status: 'active',
          created_at: '2023-02-01T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:14:50.991587'
      }
    };

    // Copy generated data into localStorage using correct storage keys
    localStorage.setItem('artworks', JSON.stringify(generatedData.artworks || []));
    localStorage.setItem('documents', JSON.stringify(generatedData.documents || []));
    localStorage.setItem('exhibitions', JSON.stringify(generatedData.exhibitions || []));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects || []));
    localStorage.setItem('products', JSON.stringify(generatedData.products || []));

    // Ensure collections that will be written during flows are at least initialized
    const emptyArrays = [
      'cart',
      'cart_items',
      'favorites',
      'favorite_items',
      'wishlists',
      'wishlist_items',
      'commission_requests',
      'visit_plans',
      'visit_plan_items',
      'collaboration_inquiries',
      'newsletter_subscriptions',
      'newsletter_subscription_interests'
    ];

    emptyArrays.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveLandscapeFavorites();
    this.testTask2_AddNewestOriginalToCart();
    this.testTask3_AddPastelArtworksToWishlist();
    this.testTask4_SubmitCommissionRequest();
    this.testTask5_SaveExhibitionToVisitPlan();
    this.testTask6_SubmitCollaborationInquiry();
    this.testTask7_SubscribeNewsletterAndDownloadLookbook();
    this.testTask8_AddTallerOriginalUnder1000ToCart();

    return this.results;
  }

  // Task 1: Save two landscape paintings from 2022 or later under $300 to favorites
  testTask1_SaveLandscapeFavorites() {
    const testName = 'Task 1: Save filtered landscape artworks to favorites';
    console.log('Testing:', testName);

    try {
      // Get gallery filter options (simulates opening Gallery and seeing filters)
      const filterOptions = this.logic.getGalleryFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Gallery filter options should load');

      // Apply filters: category=landscape, year >= 2022, price <= 300, sort by price low to high
      const filters = {
        category: 'landscape',
        min_year: 2022,
        max_price: 300
      };
      const sort = 'price_low_to_high';

      const galleryResult = this.logic.getGalleryArtworks(filters, sort, 1, 24);
      this.assert(galleryResult && Array.isArray(galleryResult.items), 'Gallery should return items array');
      this.assert(
        galleryResult.items.length > 0,
        'There should be at least one landscape artwork matching filters'
      );

      // Verify all returned items respect filters
      galleryResult.items.forEach((item) => {
        const art = item.artwork;
        this.assert(art.category === 'landscape', 'Artwork category should be landscape');
        this.assert(art.year >= 2022, 'Artwork year should be >= 2022');
        if (typeof art.price === 'number') {
          this.assert(art.price <= 300, 'Artwork price should be <= 300');
        }
      });

      const numToFavorite = Math.min(2, galleryResult.items.length);
      this.assert(numToFavorite > 0, 'At least one artwork must be available to favorite');

      const favoritedArtworkIds = [];

      for (let i = 0; i < numToFavorite; i++) {
        const artworkId = galleryResult.items[i].artwork.id;
        const addResult = this.logic.addArtworkToFavorites(artworkId);
        this.assert(addResult.success === true, 'addArtworkToFavorites should succeed');
        this.assert(addResult.favorites_list_id, 'favorites_list_id should be returned');
        favoritedArtworkIds.push(artworkId);
      }

      // Open Favorites page
      const favoritesList = this.logic.getFavoritesList();
      this.assert(favoritesList && typeof favoritesList === 'object', 'Favorites list should load');
      this.assert(Array.isArray(favoritesList.items), 'Favorites items should be array');

      favoritedArtworkIds.forEach((id) => {
        const match = favoritesList.items.find(
          (item) => item.artwork && item.artwork.id === id
        );
        this.assert(!!match, 'Favorites should contain artwork id: ' + id);
      });

      this.assert(
        typeof favoritesList.total_items === 'number' &&
          favoritesList.total_items >= favoritedArtworkIds.length,
        'Favorites total_items should be >= number favorited'
      );

      // Cross-check: featured artworks on home page marked as in favorites when applicable
      const homeContent = this.logic.getHomePageContent();
      if (homeContent && Array.isArray(homeContent.featured_artworks)) {
        favoritedArtworkIds.forEach((id) => {
          const fa = homeContent.featured_artworks.find(
            (f) => f.artwork && f.artwork.id === id
          );
          if (fa) {
            this.assert(
              fa.is_in_favorites === true,
              'Featured artwork ' + id + ' should be marked as in favorites'
            );
          }
        });
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add the most recent artwork as large/framed original to the cart (adapted to available data)
  testTask2_AddNewestOriginalToCart() {
    const testName = 'Task 2: Add newest original with size & frame to cart';
    console.log('Testing:', testName);

    try {
      // Simulate opening Shop Originals page and loading filter options
      const filterOptions = this.logic.getShopFilterOptions('originals');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Shop filter options should load');

      // Try to filter by a subject category (cityscape in original task). If no products, fall back to all.
      let shopResult = this.logic.getShopProducts(
        'originals',
        { subject_category: 'cityscape' },
        'newest_first',
        1,
        24
      );

      if (!shopResult || !Array.isArray(shopResult.items) || shopResult.items.length === 0) {
        // Fallback: any originals, newest first
        shopResult = this.logic.getShopProducts('originals', null, 'newest_first', 1, 24);
      }

      this.assert(shopResult && Array.isArray(shopResult.items), 'Shop products should return items');
      this.assert(shopResult.items.length > 0, 'There should be at least one original product');

      const firstItem = shopResult.items[0];
      const productId = firstItem.product.id;

      // Open product detail page
      const productDetails = this.logic.getProductDetails(productId);
      this.assert(productDetails && productDetails.product, 'Product details should load');
      this.assert(
        productDetails.product.id === productId,
        'Product details id should match selected product'
      );

      // Choose a size label (prefer something that looks like a large size), fall back to first/default
      const sizeOptions = productDetails.size_options || [];
      let selectedSizeLabel = null;
      if (sizeOptions.length > 0) {
        const preferred = sizeOptions.find((opt) => /60\s*x\s*90/i.test(opt.label));
        const large = preferred || sizeOptions.find((opt) => /large/i.test(opt.label));
        selectedSizeLabel = (large || sizeOptions[0]).label;
      } else {
        selectedSizeLabel = productDetails.product.default_size_label || null;
      }

      // Choose a frame option (prefer some "black" frame if available)
      const frameOptions = productDetails.frame_options || [];
      let selectedFrameLabel = null;
      if (frameOptions.length > 0) {
        const blackFrame = frameOptions.find((opt) => /black/i.test(opt.label));
        selectedFrameLabel = (blackFrame || frameOptions[0]).label;
      }

      const quantity = 1;

      // Add to cart
      const addResult = this.logic.addProductToCart(
        productId,
        quantity,
        selectedSizeLabel,
        selectedFrameLabel
      );

      this.assert(addResult.success === true, 'addProductToCart should succeed');
      this.assert(addResult.cart_id, 'Cart id should be returned');

      // Open cart summary and verify line item
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should return a cart');
      this.assert(Array.isArray(cartSummary.items), 'Cart summary items should be array');

      const addedItem = cartSummary.items.find(
        (item) => item.product && item.product.id === productId
      );
      this.assert(addedItem, 'Cart should contain the added product');
      this.assert(
        addedItem.cart_item.quantity === quantity,
        'Cart item quantity should equal ' + quantity
      );

      if (selectedSizeLabel) {
        this.assert(
          addedItem.selected_size_label === selectedSizeLabel,
          'Selected size label should be preserved on cart item'
        );
      }

      if (selectedFrameLabel) {
        this.assert(
          addedItem.selected_frame_label === selectedFrameLabel,
          'Selected frame label should be preserved on cart item'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add three smallest pastel artworks under $200 and max width 50 cm to the wishlist
  testTask3_AddPastelArtworksToWishlist() {
    const testName = 'Task 3: Add smallest pastel artworks to wishlist';
    console.log('Testing:', testName);

    try {
      // Simulate opening Gallery and filters sidebar
      const filterOptions = this.logic.getGalleryFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Gallery filter options should load');

      const filters = {
        color_palette: 'pastel',
        max_price: 200,
        max_width_cm: 50
      };
      const sort = 'size_small_to_large';

      const galleryResult = this.logic.getGalleryArtworks(filters, sort, 1, 24);
      this.assert(galleryResult && Array.isArray(galleryResult.items), 'Gallery items should load');
      this.assert(galleryResult.items.length > 0, 'At least one pastel artwork should be found');

      // Verify filter constraints
      galleryResult.items.forEach((item) => {
        const art = item.artwork;
        this.assert(art.color_palette === 'pastel', 'Artwork palette should be pastel');
        if (typeof art.price === 'number') {
          this.assert(art.price <= 200, 'Artwork price should be <= 200');
        }
        if (typeof art.width_cm === 'number') {
          this.assert(art.width_cm <= 50, 'Artwork width should be <= 50 cm');
        }
      });

      const numToAdd = Math.min(3, galleryResult.items.length);
      this.assert(numToAdd > 0, 'At least one pastel artwork must be available to add');

      const wishlistArtworkIds = [];

      for (let i = 0; i < numToAdd; i++) {
        const artworkId = galleryResult.items[i].artwork.id;
        const addResult = this.logic.addArtworkToWishlist(artworkId, null);
        this.assert(addResult.success === true, 'addArtworkToWishlist should succeed');
        this.assert(addResult.wishlist_id, 'wishlist_id should be returned');
        wishlistArtworkIds.push(artworkId);
      }

      // Open Wishlist page
      const wishlist = this.logic.getWishlist();
      this.assert(wishlist && typeof wishlist === 'object', 'Wishlist should load');
      this.assert(Array.isArray(wishlist.items), 'Wishlist items should be array');

      wishlistArtworkIds.forEach((id) => {
        const match = wishlist.items.find(
          (item) => item.artwork && item.artwork.id === id
        );
        this.assert(!!match, 'Wishlist should contain artwork id: ' + id);
        if (match) {
          this.assert(
            match.item_type === 'artwork' || !match.item_type,
            'Wishlist item type should be artwork or undefined'
          );
        }
      });

      this.assert(
        typeof wishlist.total_items === 'number' &&
          wishlist.total_items >= wishlistArtworkIds.length,
        'Wishlist total_items should be >= number added'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Submit a commission request for a $600 acrylic portrait due on 2025-09-30
  testTask4_SubmitCommissionRequest() {
    const testName = 'Task 4: Submit acrylic portrait commission request';
    console.log('Testing:', testName);

    try {
      // Simulate opening Commissions page
      const pageContent = this.logic.getCommissionsPageContent();
      this.assert(pageContent && typeof pageContent === 'object', 'Commissions page content should load');

      // Load form options
      const formOptions = this.logic.getCommissionFormOptions();
      this.assert(formOptions && typeof formOptions === 'object', 'Commission form options should load');

      const availableArtworkTypes = (formOptions.artwork_types || []).map((t) => t.value);
      const availableMediums = (formOptions.mediums || []).map((m) => m.value);

      let artworkType = 'portrait';
      if (!availableArtworkTypes.includes('portrait') && availableArtworkTypes.length > 0) {
        artworkType = availableArtworkTypes[0];
      }

      let medium = 'acrylic_on_canvas';
      if (!availableMediums.includes('acrylic_on_canvas') && availableMediums.length > 0) {
        medium = availableMediums[0];
      }

      const budget = 600;
      const preferredCompletionDate = '2025-09-30';
      const description =
        'Single-person bust portrait with a neutral background for a living room';
      const clientName = 'Alex Sample';
      const clientEmail = 'alex.sample@example.com';

      const submitResult = this.logic.submitCommissionRequest(
        artworkType,
        medium,
        budget,
        preferredCompletionDate,
        description,
        clientName,
        clientEmail
      );

      this.assert(submitResult.success === true, 'submitCommissionRequest should succeed');
      this.assert(submitResult.commission_request_id, 'commission_request_id should be returned');
      this.assert(submitResult.status, 'Commission status should be returned');

      const requestId = submitResult.commission_request_id;

      // Verify the commission request was persisted correctly
      const storedRequests = JSON.parse(
        localStorage.getItem('commission_requests') || '[]'
      );
      const storedRequest = storedRequests.find((r) => r.id === requestId);

      this.assert(storedRequest, 'Stored commission request should be found');
      if (storedRequest) {
        this.assert(
          storedRequest.artwork_type === artworkType,
          'Stored artwork_type should match'
        );
        this.assert(storedRequest.medium === medium, 'Stored medium should match');
        this.assert(storedRequest.budget === budget, 'Stored budget should match');
        this.assert(
          typeof storedRequest.preferred_completion_date === 'string',
          'Stored preferred_completion_date should exist'
        );
        this.assert(
          storedRequest.client_name === clientName,
          'Stored client_name should match'
        );
        this.assert(
          storedRequest.client_email === clientEmail,
          'Stored client_email should match'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save the first exhibition after 2025-07-01 to the visit plan
  testTask5_SaveExhibitionToVisitPlan() {
    const testName = 'Task 5: Save filtered exhibition to visit plan';
    console.log('Testing:', testName);

    try {
      // Simulate opening About page
      const aboutContent = this.logic.getAboutPageContent();
      this.assert(aboutContent && typeof aboutContent === 'object', 'About page content should load');

      // Filter exhibitions from 2025-07-01 onwards, sorted soonest first
      const fromDate = '2025-07-01';
      const exhibitions = this.logic.getExhibitions(fromDate, null, null, 'date_soonest_first');
      this.assert(Array.isArray(exhibitions), 'getExhibitions should return an array');
      this.assert(exhibitions.length > 0, 'At least one exhibition should match filter');

      const firstExh = exhibitions[0];
      const exhibitionId = firstExh.exhibition.id;

      // Verify details page
      const details = this.logic.getExhibitionDetails(exhibitionId);
      this.assert(details && details.exhibition, 'Exhibition details should load');
      this.assert(
        details.exhibition.id === exhibitionId,
        'Exhibition details id should match selected exhibition'
      );

      // Add to Visit Plan
      const addResult = this.logic.addExhibitionToVisitPlan(exhibitionId);
      this.assert(addResult.success === true, 'addExhibitionToVisitPlan should succeed');
      this.assert(addResult.visit_plan_id, 'visit_plan_id should be returned');
      this.assert(addResult.visit_plan_item_id, 'visit_plan_item_id should be returned');

      const visitPlanId = addResult.visit_plan_id;

      // Open Visit Plan page
      const visitPlan = this.logic.getVisitPlan();
      this.assert(visitPlan && typeof visitPlan === 'object', 'Visit plan should load');
      this.assert(visitPlan.visit_plan_id === visitPlanId, 'Visit plan id should match');
      this.assert(Array.isArray(visitPlan.items), 'Visit plan items should be array');

      const savedItem = visitPlan.items.find(
        (item) => item.exhibition && item.exhibition.id === exhibitionId
      );
      this.assert(savedItem, 'Visit plan should contain the saved exhibition');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Send a collaboration inquiry referencing a 2023 business mural project
  testTask6_SubmitCollaborationInquiry() {
    const testName = 'Task 6: Submit collaboration inquiry referencing 2023 mural project';
    console.log('Testing:', testName);

    try {
      // Filter projects: business / commercial mural in 2023, newest first
      const filters = {
        client_type: 'business_commercial',
        project_category: 'mural',
        year: 2023
      };
      const projects = this.logic.getProjects(filters, 'year_newest_first');
      this.assert(Array.isArray(projects), 'getProjects should return an array');
      this.assert(projects.length > 0, 'At least one 2023 business mural project should exist');

      const firstProj = projects[0];
      const projectId = firstProj.project.id;

      // Open project detail page
      const projDetails = this.logic.getProjectDetails(projectId);
      this.assert(projDetails && projDetails.project, 'Project details should load');
      this.assert(
        projDetails.project.id === projectId,
        'Project details id should match selected project'
      );

      const projectTitle = projDetails.project.title;

      // Submit collaboration inquiry referencing this project
      const name = 'Jordan Lee';
      const email = 'jordan.lee@example.com';
      const message =
        'Hi, I love the "' +
        projectTitle +
        '" mural. I am interested in a similar mural for a café, approximately 4m x 2.5m.';

      const inquiryResult = this.logic.submitCollaborationInquiry(
        name,
        email,
        projectId,
        projectTitle,
        message
      );

      this.assert(inquiryResult.success === true, 'submitCollaborationInquiry should succeed');
      this.assert(inquiryResult.inquiry_id, 'inquiry_id should be returned');
      this.assert(inquiryResult.status, 'Inquiry status should be returned');

      const inquiryId = inquiryResult.inquiry_id;

      // Verify inquiry persisted with correct project reference
      const storedInquiries = JSON.parse(
        localStorage.getItem('collaboration_inquiries') || '[]'
      );
      const storedInquiry = storedInquiries.find((i) => i.id === inquiryId);
      this.assert(storedInquiry, 'Stored collaboration inquiry should be found');
      if (storedInquiry) {
        this.assert(storedInquiry.name === name, 'Stored name should match');
        this.assert(storedInquiry.email === email, 'Stored email should match');
        this.assert(
          storedInquiry.project_reference_id === projectId,
          'Stored project_reference_id should match'
        );
        this.assert(
          storedInquiry.project_reference_title === projectTitle,
          'Stored project_reference_title should match'
        );
        this.assert(
          typeof storedInquiry.message === 'string' &&
            storedInquiry.message.indexOf('4m x 2.5m') !== -1,
          'Stored message should mention 4m x 2.5m wall'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Subscribe to the newsletter and download the 2024 lookbook
  testTask7_SubscribeNewsletterAndDownloadLookbook() {
    const testName = 'Task 7: Subscribe to newsletter and download 2024 lookbook';
    console.log('Testing:', testName);

    try {
      // Simulate homepage footer CTA
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && typeof homeContent === 'object', 'Home page content should load');

      // Load newsletter signup configuration
      const signupConfig = this.logic.getNewsletterSignupConfig();
      this.assert(signupConfig && typeof signupConfig === 'object', 'Newsletter signup config should load');

      const interestOptions = signupConfig.interests || [];
      const frequencyOptions = signupConfig.frequencies || [];

      const interestCodes = interestOptions.map((i) => i.value);
      this.assert(interestCodes.length > 0, 'At least one interest option should be available');

      const selectedInterests = [];
      if (interestCodes.includes('new_prints_shop_updates')) {
        selectedInterests.push('new_prints_shop_updates');
      }
      if (interestCodes.includes('exhibitions_events')) {
        selectedInterests.push('exhibitions_events');
      }

      // If one of the expected interests is missing, fall back to the first option to keep the flow going
      if (selectedInterests.length === 0 && interestCodes.length > 0) {
        selectedInterests.push(interestCodes[0]);
      }

      this.assert(selectedInterests.length > 0, 'At least one interest must be selected');

      const frequencyCodes = frequencyOptions.map((f) => f.value);
      let frequency = 'monthly_summary';
      if (!frequencyCodes.includes('monthly_summary') && frequencyCodes.length > 0) {
        frequency = frequencyCodes[0];
      }

      const email = 'visitor@example.com';

      const subscribeResult = this.logic.subscribeToNewsletter(
        email,
        selectedInterests,
        frequency,
        'footer_form'
      );

      this.assert(subscribeResult.success === true, 'subscribeToNewsletter should succeed');
      this.assert(subscribeResult.subscription_id, 'subscription_id should be returned');

      const subscriptionId = subscribeResult.subscription_id;

      // Verify subscription persisted
      const storedSubscriptions = JSON.parse(
        localStorage.getItem('newsletter_subscriptions') || '[]'
      );
      const storedSubscription = storedSubscriptions.find((s) => s.id === subscriptionId);
      this.assert(storedSubscription, 'Stored subscription should be found');
      if (storedSubscription) {
        this.assert(storedSubscription.email === email, 'Stored email should match');
        this.assert(
          storedSubscription.frequency === frequency,
          'Stored frequency should match'
        );
        this.assert(
          Array.isArray(JSON.parse(localStorage.getItem('newsletter_subscription_interests') || '[]')),
          'Newsletter_subscription_interests storage should exist'
        );
      }

      // Load thank-you page content
      const thankYouContent = this.logic.getNewsletterThankYouContent();
      this.assert(
        thankYouContent && typeof thankYouContent === 'object',
        'Newsletter thank-you content should load'
      );

      // Download 2024 lookbook if available (or attempt regardless)
      if (thankYouContent.lookbook_available !== false) {
        const downloadResult = this.logic.downloadLookbook(2024);
        this.assert(downloadResult.success === true, 'downloadLookbook should succeed');
        this.assert(downloadResult.document, 'Downloaded document should be returned');
        if (downloadResult.document) {
          this.assert(
            downloadResult.document.document_category === 'lookbook',
            'Downloaded document should be a lookbook'
          );
          this.assert(
            downloadResult.document.year === 2024,
            'Downloaded document should be for year 2024'
          );
          this.assert(
            downloadResult.document.file_type === 'pdf',
            'Downloaded document should be a PDF'
          );
        }

        // Verify the current subscription is marked as having downloaded the 2024 lookbook
        const updatedSubscriptions = JSON.parse(
          localStorage.getItem('newsletter_subscriptions') || '[]'
        );
        const updatedSubscription = updatedSubscriptions.find(
          (s) => s.id === subscriptionId
        );
        if (updatedSubscription) {
          this.assert(
            updatedSubscription.lookbook_2024_downloaded === true,
            'Subscription should be marked as having downloaded the 2024 lookbook'
          );
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Add the taller of the first two original artworks under $1000 to the cart
  testTask8_AddTallerOriginalUnder1000ToCart() {
    const testName = 'Task 8: Add taller of first two originals under $1000 to cart';
    console.log('Testing:', testName);

    try {
      // Load filter options for Shop Originals
      const filterOptions = this.logic.getShopFilterOptions('originals');
      this.assert(filterOptions && typeof filterOptions === 'object', 'Shop filter options should load');

      // Filter originals under $1000
      const filters = {
        max_price: 1000
      };
      const shopResult = this.logic.getShopProducts('originals', filters, null, 1, 24);
      this.assert(shopResult && Array.isArray(shopResult.items), 'Shop products should return items');
      this.assert(shopResult.items.length > 0, 'At least one original under $1000 should exist');

      const candidates = shopResult.items.slice(0, 2);
      this.assert(candidates.length > 0, 'At least one candidate product should be available');

      // If only one candidate, we will just add that; otherwise compare heights
      let chosenProductId = candidates[0].product.id;
      let chosenHeight = null;

      if (candidates.length === 1) {
        const details = this.logic.getProductDetails(chosenProductId);
        const product = details.product;
        chosenHeight =
          typeof product.height_cm === 'number'
            ? product.height_cm
            : (details.size_options && details.size_options[0]
                ? details.size_options[0].height_cm
                : null);
      } else {
        const firstProductId = candidates[0].product.id;
        const secondProductId = candidates[1].product.id;

        const firstDetails = this.logic.getProductDetails(firstProductId);
        const secondDetails = this.logic.getProductDetails(secondProductId);

        const firstProduct = firstDetails.product;
        const secondProduct = secondDetails.product;

        const firstHeight =
          typeof firstProduct.height_cm === 'number'
            ? firstProduct.height_cm
            : (firstDetails.size_options && firstDetails.size_options[0]
                ? firstDetails.size_options[0].height_cm
                : 0);

        const secondHeight =
          typeof secondProduct.height_cm === 'number'
            ? secondProduct.height_cm
            : (secondDetails.size_options && secondDetails.size_options[0]
                ? secondDetails.size_options[0].height_cm
                : 0);

        if (secondHeight > firstHeight) {
          chosenProductId = secondProductId;
          chosenHeight = secondHeight;
        } else {
          chosenProductId = firstProductId;
          chosenHeight = firstHeight;
        }

        this.assert(chosenHeight !== null, 'Chosen product height should be determined');
      }

      const quantity = 1;

      // Add chosen product to cart (quantity 1, default configuration)
      const addResult = this.logic.addProductToCart(
        chosenProductId,
        quantity,
        null,
        null
      );

      this.assert(addResult.success === true, 'addProductToCart should succeed');
      this.assert(addResult.cart_id, 'Cart id should be returned');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should load');
      this.assert(Array.isArray(cartSummary.items), 'Cart items should be array');

      const chosenItem = cartSummary.items.find(
        (item) => item.product && item.product.id === chosenProductId
      );
      this.assert(chosenItem, 'Cart should contain the chosen taller product');
      if (chosenItem) {
        this.assert(
          chosenItem.cart_item.quantity === quantity,
          'Chosen cart item quantity should be ' + quantity
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result logging
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
