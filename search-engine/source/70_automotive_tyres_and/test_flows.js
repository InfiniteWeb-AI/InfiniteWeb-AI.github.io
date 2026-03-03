// Test runner for business logic integration flows (Node.js, CommonJS)

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
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      branches: [
        {
          id: "nyc_midtown_combined",
          name: "AutoTreads Midtown NYC",
          type: "combined_center",
          address_line1: "450 W 33rd St",
          address_line2: "Suite 2",
          city: "New York",
          state: "NY",
          zip_code: "10001",
          latitude: 40.7532,
          longitude: -73.9982,
          phone: "+1-212-555-0134",
          email: "nyc-midtown@autotreads.com",
          open_on_saturday: true,
          has_wheel_alignment: true,
          has_oil_change: true,
          has_full_service: true,
          has_tyre_fitting: true,
          supports_mobile_service_area: false,
          is_active: true,
          created_at: "2024-02-10T09:30:00Z"
        },
        {
          id: "nyc_brooklyn_fitting",
          name: "AutoTreads Brooklyn Fitting Center",
          type: "fitting_center",
          address_line1: "85 Jay St",
          address_line2: "",
          city: "Brooklyn",
          state: "NY",
          zip_code: "11201",
          latitude: 40.7003,
          longitude: -73.9866,
          phone: "+1-718-555-0198",
          email: "brooklyn-fittings@autotreads.com",
          open_on_saturday: true,
          has_wheel_alignment: false,
          has_oil_change: false,
          has_full_service: false,
          has_tyre_fitting: true,
          supports_mobile_service_area: false,
          is_active: true,
          created_at: "2023-11-05T14:10:00Z"
        },
        {
          id: "sf_soma_combined",
          name: "AutoTreads SoMa SF",
          type: "combined_center",
          address_line1: "201 Mission St",
          address_line2: "Ground Floor",
          city: "San Francisco",
          state: "CA",
          zip_code: "94105",
          latitude: 37.7921,
          longitude: -122.3951,
          phone: "+1-415-555-0172",
          email: "sf-soma@autotreads.com",
          open_on_saturday: true,
          has_wheel_alignment: true,
          has_oil_change: true,
          has_full_service: true,
          has_tyre_fitting: true,
          supports_mobile_service_area: false,
          is_active: true,
          created_at: "2024-01-22T11:45:00Z"
        }
      ],
      brands: [
        {
          id: "continental",
          name: "Continental",
          tier: "premium",
          logo_url: "https://clipground.com/images/continental-logo-clipart-8.jpg",
          description:
            "Continental is a premium German tyre manufacturer known for excellent braking performance and fuel-efficient compounds.",
          is_active: true,
          created_at: "2023-06-10T09:00:00Z",
          image:
            "https://philiplochner.ghost.io/content/images/2020/05/Continental-tyres-Nielsen-Cerbolles.png"
        },
        {
          id: "michelin",
          name: "Michelin",
          tier: "premium",
          logo_url:
            "https://pd12m.s3.us-west-2.amazonaws.com/images/42c0a0c2-79cd-581d-8742-35cfa04538ff.jpeg",
          description:
            "Michelin tyres offer long tread life, strong wet grip, and advanced technologies for passenger cars and SUVs.",
          is_active: true,
          created_at: "2023-06-12T11:20:00Z",
          image:
            "https://lh4.googleusercontent.com/XTvUEatKScVLtIwon7R4Ahjb9q8wq5MRhbvPvjQqfOcGYuFJvqAlUtcEMo2-FgL8KTMDKdZiRX_KfGIfKkJqRVtJ8vgHWSx1CspLmvkBeZZSrjNGbuy0iA5-t-iunmbUWl4YR8DQ"
        },
        {
          id: "firestone",
          name: "Firestone",
          tier: "mid_range",
          logo_url:
            "https://productplacementblog.com/wp-content/uploads/2019/09/Firestone-Tyres-and-Gulf-in-Le-Mans-800x500.jpg",
          description:
            "Firestone provides dependable mid-range tyres balancing performance, comfort, and value for money.",
          is_active: true,
          created_at: "2023-07-01T08:45:00Z",
          image:
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&auto=format&q=80"
        }
      ],
      promo_codes: [
        {
          id: "SAVE20",
          code: "SAVE20",
          description: "Save 20% on eligible mobile oil change services.",
          discount_type: "percentage",
          discount_value: 20,
          applicable_scope: "mobile_service_only",
          applicable_service_ids: ["oil_change_mobile", "oil_change"],
          min_spend: 50,
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2026-12-31T23:59:59Z",
          is_active: true
        },
        {
          id: "ALIGN15",
          code: "ALIGN15",
          description: "15% off wheel alignment services when booked online.",
          discount_type: "percentage",
          discount_value: 15,
          applicable_scope: "service_booking",
          applicable_service_ids: ["wheel_alignment"],
          min_spend: 80,
          valid_from: "2024-06-01T00:00:00Z",
          valid_to: "2026-06-01T23:59:59Z",
          is_active: true
        },
        {
          id: "TYRE10",
          code: "TYRE10",
          description: "$10 off selected tyre purchases over $200.",
          discount_type: "fixed_amount",
          discount_value: 10,
          applicable_scope: "tyre_purchase",
          applicable_service_ids: [],
          min_spend: 200,
          valid_from: "2024-09-01T00:00:00Z",
          valid_to: "2026-03-31T23:59:59Z",
          is_active: true
        }
      ],
      service_categories: [
        {
          id: "standard_services",
          code: "standard_services",
          name: "Standard Services",
          description:
            "Individual services such as wheel alignment, oil changes, tyre fitting, and inspections.",
          sort_order: 1,
          is_active: true,
          image:
            "https://media.istockphoto.com/photos/at-car-service-picture-id846739112?k=6&m=846739112&s=612x612&w=0&h=ywXmhHDMVWfgndBKcC0jy62DKrFZvU6OzYK7BbqDqBE="
        },
        {
          id: "service_packages",
          code: "service_packages",
          name: "Service Packages",
          description:
            "Bundled service packages like Full Service & Inspection for comprehensive vehicle care.",
          sort_order: 2,
          is_active: true,
          image:
            "https://cdn.motor1.com/images/mgl/MQgG6/s3/mechanic-inspecting-car-in-service-garage.jpg"
        }
      ],
      services: [
        {
          id: "wheel_alignment",
          code: "wheel_alignment",
          name: "Wheel Alignment",
          description:
            "Four-wheel alignment including camber, caster, and toe checks, adjustment to manufacturer specifications, and steering wheel centering. Recommended after fitting new tyres, suspension work, or impact with potholes.",
          category_id: "standard_services",
          base_price: 110,
          currency: "usd",
          duration_minutes: 60,
          supports_in_center: true,
          supports_mobile: false,
          is_package: false,
          requires_vehicle_details: true,
          is_active: true,
          created_at: "2024-01-10T09:00:00Z",
          updated_at: "2025-06-15T12:30:00Z",
          image:
            "https://di-uploads-pod3.dealerinspire.com/romeovilletoyota/uploads/2020/12/Wheel-Alignment-Mechanic.jpg"
        },
        {
          id: "oil_change",
          code: "oil_change",
          name: "Oil Change (In-Center)",
          description:
            "Engine oil and filter change using manufacturer-appropriate oil, fluid top-up, and basic health check of belts, hoses, and visible leaks. Available at selected in-center locations.",
          category_id: "standard_services",
          base_price: 95,
          currency: "usd",
          duration_minutes: 45,
          supports_in_center: true,
          supports_mobile: false,
          is_package: false,
          requires_vehicle_details: true,
          is_active: true,
          created_at: "2024-01-12T10:15:00Z",
          updated_at: "2025-05-20T14:05:00Z",
          image:
            "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          id: "oil_change_mobile",
          code: "oil_change",
          name: "Mobile Oil Change",
          description:
            "Convenient mobile oil and filter change carried out at your home or workplace. Includes used oil disposal, fluid top-up, and a quick visual inspection of brakes and tyres.",
          category_id: "standard_services",
          base_price: 115,
          currency: "usd",
          duration_minutes: 60,
          supports_in_center: false,
          supports_mobile: true,
          is_package: false,
          requires_vehicle_details: false,
          is_active: true,
          created_at: "2024-03-05T11:00:00Z",
          updated_at: "2025-07-01T09:40:00Z",
          image:
            "https://therideshareguy.com/wp-content/uploads/2020/02/d5392ef5-a443-4028-9797-901d1b4f15e4_IMG_0468.jpeg"
        }
      ],
      tyre_products: [
        {
          id: "continental_ts860_205_55_r16",
          name: "Continental WinterContact TS 860 205/55 R16",
          brand_id: "continental",
          width: 205,
          profile: 55,
          rim_diameter: 16,
          size_label: "205/55 R16",
          season: "winter",
          performance_category: "touring",
          speed_rating: "h",
          price_per_tyre: 118,
          currency: "usd",
          brand_tier: "premium",
          has_free_fitting: false,
          noise_db: 71,
          fuel_efficiency_rating: "b",
          wet_grip_rating: "a",
          image_url:
            "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&h=600&fit=crop&auto=format&q=80",
          description:
            "Premium winter tyre optimized for cold, wet, and snowy conditions with short braking distances and precise handling for compact and mid-size cars.",
          is_available: true,
          created_at: "2024-09-01T08:00:00Z",
          updated_at: "2025-02-10T10:15:00Z",
          customer_rating_count: 0,
          customer_rating: 0.0
        },
        {
          id: "michelin_alpin6_205_55_r16",
          name: "Michelin Alpin 6 205/55 R16",
          brand_id: "michelin",
          width: 205,
          profile: 55,
          rim_diameter: 16,
          size_label: "205/55 R16",
          season: "winter",
          performance_category: "touring",
          speed_rating: "h",
          price_per_tyre: 119,
          currency: "usd",
          brand_tier: "premium",
          has_free_fitting: false,
          noise_db: 69,
          fuel_efficiency_rating: "b",
          wet_grip_rating: "a",
          image_url:
            "https://cdn.pkwteile.de/uploads/tyres/full/PKW/3528708692978_869297.jpg?ccf=94077811",
          description:
            "High-end winter tyre designed for excellent snow traction and long-lasting performance, maintaining grip even as the tread wears.",
          is_available: true,
          created_at: "2024-09-05T09:20:00Z",
          updated_at: "2025-01-25T14:45:00Z",
          customer_rating_count: 0,
          customer_rating: 0.0
        },
        {
          id: "hankook_winter_icept_rs3_205_55_r16",
          name: "Hankook Winter i*cept RS3 205/55 R16",
          brand_id: "hankook",
          width: 205,
          profile: 55,
          rim_diameter: 16,
          size_label: "205/55 R16",
          season: "winter",
          performance_category: "standard",
          speed_rating: "t",
          price_per_tyre: 95,
          currency: "usd",
          brand_tier: "mid_range",
          has_free_fitting: false,
          noise_db: 72,
          fuel_efficiency_rating: "c",
          wet_grip_rating: "b",
          image_url:
            "https://cdn.autodoc.de/uploads/tyres/full/PKW/8808563378688_1017631.jpg?ccf=94077811",
          description:
            "Reliable mid-range winter tyre offering solid grip on snow and slush with a focus on comfort and stability for everyday driving.",
          is_available: true,
          created_at: "2024-08-20T11:10:00Z",
          updated_at: "2025-01-10T11:55:00Z",
          customer_rating_count: 0,
          customer_rating: 0.0
        }
      ],
      time_slots: [
        {
          id: "ts_nyc_align_2026_04_15_1000_1200",
          branch_id: "nyc_midtown_combined",
          service_id: "wheel_alignment",
          slot_date: "2026-04-15T00:00:00Z",
          start_time: "10:00",
          end_time: "12:00",
          label: "10:0012:00",
          slot_type: "service_booking",
          created_at: "2026-02-20T09:00:00Z",
          is_available: true
        },
        {
          id: "ts_nyc_align_2026_04_15_1400_1600",
          branch_id: "nyc_midtown_combined",
          service_id: "wheel_alignment",
          slot_date: "2026-04-15T00:00:00Z",
          start_time: "14:00",
          end_time: "16:00",
          label: "14:0016:00",
          slot_type: "service_booking",
          created_at: "2026-02-20T09:05:00Z",
          is_available: true
        },
        {
          id: "ts_nyc_align_2026_04_16_0900_1100",
          branch_id: "nyc_midtown_combined",
          service_id: "wheel_alignment",
          slot_date: "2026-04-16T00:00:00Z",
          start_time: "09:00",
          end_time: "11:00",
          label: "09:0011:00",
          slot_type: "service_booking",
          created_at: "2026-02-20T09:10:00Z",
          is_available: true
        }
      ],
      _metadata: {
        baselineDate: "2026-03-03",
        generatedAt: "2026-03-03T03:16:02.917720"
      }
    };

    // Apply to localStorage using storage keys from mapping
    localStorage.setItem("branches", JSON.stringify(generatedData.branches));
    localStorage.setItem("brands", JSON.stringify(generatedData.brands));
    localStorage.setItem("promo_codes", JSON.stringify(generatedData.promo_codes));
    localStorage.setItem(
      "service_categories",
      JSON.stringify(generatedData.service_categories)
    );
    localStorage.setItem("services", JSON.stringify(generatedData.services));
    localStorage.setItem(
      "tyre_products",
      JSON.stringify(generatedData.tyre_products)
    );
    localStorage.setItem("time_slots", JSON.stringify(generatedData.time_slots));

    // Initialize empty collections for dynamic entities
    localStorage.setItem("carts", JSON.stringify([]));
    localStorage.setItem("cart_items", JSON.stringify([]));
    localStorage.setItem("service_bookings", JSON.stringify([]));
    localStorage.setItem("fitting_appointments", JSON.stringify([]));
    localStorage.setItem("vehicle_profiles", JSON.stringify([]));
    localStorage.setItem("tyre_comparison_sets", JSON.stringify([]));

    // Store metadata if business logic wants it
    localStorage.setItem("_metadata", JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log("Starting flow tests...");

    this.testTask1_AddFourHighestRatedWinterTyresToCart();
    this.testTask2_BookWheelAlignmentNextMonthMorning();
    this.testTask3_BuyTwoMidRangeTyresWithFitting();
    this.testTask4_BookInCenterServiceWithVehicleDetails();
    this.testTask5_BuyTwoCheapestHighSpeedTyres();
    this.testTask6_BookMobileOilChangeWithPromo();
    this.testTask7_CompareTyresAndAddFilteredOption();
    this.testTask8_BookSaturdayAfternoonFittingAppointment();

    console.log("Flow tests complete.");
    return this.results;
  }

  // ----------------------
  // Task 1 flow
  // ----------------------
  testTask1_AddFourHighestRatedWinterTyresToCart() {
    const testName =
      "Task 1: Add four highest-rated 205/55 R16 winter tyres under $120 to cart";
    console.log("Testing:", testName);

    try {
      // Fresh environment for this flow
      this.clearStorage();
      this.setupTestData();

      // Step: homepage size options (simulates landing on homepage and selector)
      const sizeOptions = this.logic.getTyreSizeOptions();
      this.assert(Array.isArray(sizeOptions.widths), "Size options widths array");

      // Step: search tyres by size and filters (adapted rating filter to available data)
      const width = 205;
      const profile = 55;
      const rim = 16;

      const searchResult = this.logic.searchTyresBySizeAndFilters(
        width,
        profile,
        rim,
        {
          season: "winter", // as per task
          max_price: 120,
          min_customer_rating: 0, // generated data has 0 ratings; relax filter
          only_available: true
        },
        "customer_rating_desc", // sort by rating high->low
        1,
        20
      );

      this.assert(
        searchResult && Array.isArray(searchResult.tyres),
        "searchTyresBySizeAndFilters should return tyres array"
      );
      this.assert(
        searchResult.tyres.length > 0,
        "Should find at least one winter tyre under price filter"
      );

      // From sorted list, pick first (highest-rated given sort)
      const selectedTyre = searchResult.tyres[0];
      this.assert(selectedTyre.id, "Selected tyre should have an id");
      this.assert(
        selectedTyre.price_per_tyre <= 120,
        "Selected tyre should respect price filter"
      );

      // Step: open product details
      const detail = this.logic.getTyreProductDetails(selectedTyre.id);
      this.assert(detail && detail.tyre, "Should load tyre product details");
      this.assert(
        detail.tyre.id === selectedTyre.id,
        "Product detail tyre id should match selected tyre"
      );

      // Step: add quantity 4 to cart (no fitting)
      const quantity = 4;
      const addResult = this.logic.addTyresToCart(
        selectedTyre.id,
        quantity,
        false
      );

      this.assert(addResult.success === true, "addTyresToCart should succeed");
      this.assert(addResult.cart, "addTyresToCart should return cart");
      this.assert(addResult.added_item, "addTyresToCart should return added_item");

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, "Cart summary should exist");
      this.assert(
        Array.isArray(cartSummary.items),
        "Cart summary should have items array"
      );

      const cartLine = cartSummary.items.find(
        (line) => line.tyre && line.tyre.id === selectedTyre.id
      );
      this.assert(cartLine, "Cart should contain the added tyre line");
      this.assert(
        cartLine.cart_item.quantity === quantity,
        "Cart line should have quantity 4 (actual: " +
          cartLine.cart_item.quantity +
          ")"
      );
      this.assert(
        cartLine.cart_item.include_fitting !== true,
        "Cart line should not have fitting included by default"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 2 flow
  // ----------------------
  testTask2_BookWheelAlignmentNextMonthMorning() {
    const testName =
      "Task 2: Book wheel alignment at nearest branch to ZIP 10001 in morning slot";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Step: services overview -> get detail for wheel alignment
      const serviceDetail = this.logic.getServiceDetail("wheel_alignment");
      this.assert(serviceDetail && serviceDetail.service, "Service detail exists");
      this.assert(
        serviceDetail.supported_modes.includes("in_center"),
        "Wheel alignment should support in_center mode"
      );

      // Step: search for nearest branches to ZIP 10001 (in-center)
      const branchSearch = this.logic.searchServiceBranches(
        "wheel_alignment",
        "10001",
        "in_center",
        10
      );
      this.assert(
        branchSearch && Array.isArray(branchSearch.branches),
        "searchServiceBranches should return branches"
      );
      this.assert(
        branchSearch.branches.length > 0,
        "Should find at least one branch for wheel alignment near 10001"
      );

      // Nearest branch = first result
      const nearestBranch = branchSearch.branches[0].branch;
      this.assert(nearestBranch.id, "Nearest branch should have id");
      this.assert(
        nearestBranch.has_wheel_alignment === true,
        "Nearest branch should support wheel alignment"
      );

      // Determine a date that has a 10:00-12:00 slot for this branch/service.
      // Use pre-generated time_slots from storage to find such a date dynamically
      const allSlots = JSON.parse(localStorage.getItem("time_slots") || "[]");
      const candidateSlot = allSlots.find((ts) => {
        return (
          ts.branch_id === nearestBranch.id &&
          ts.service_id === serviceDetail.service.id &&
          ts.start_time >= "10:00" &&
          ts.start_time <= "12:00" &&
          ts.is_available
        );
      });

      this.assert(
        !!candidateSlot,
        "Should have at least one pre-generated 10:00-12:00 slot for alignment"
      );

      const slotDate = new Date(candidateSlot.slot_date);
      const slotDateStr = this.formatDateToYMD(slotDate);

      // Step: get available service time slots via API for that date and window 10:00-12:00
      const slotsForDate = this.logic.getAvailableServiceTimeSlots(
        "wheel_alignment",
        "in_center",
        slotDateStr,
        nearestBranch.id,
        null,
        {
          earliest_start_time: "10:00",
          latest_start_time: "12:00"
        }
      );

      this.assert(
        Array.isArray(slotsForDate) && slotsForDate.length > 0,
        "API should return at least one slot between 10:00-12:00"
      );

      const chosenSlot = slotsForDate[0];
      this.assert(chosenSlot.id, "Chosen slot should have id");
      this.assert(
        chosenSlot.start_time >= "10:00" &&
          chosenSlot.start_time <= "12:00",
        "Chosen slot should start between 10:00 and 12:00"
      );

      // Step: create booking with contact + vehicle details
      const bookingResult = this.logic.createServiceBooking(
        "wheel_alignment", // serviceCode
        "in_center", // mode
        chosenSlot.id, // timeSlotId
        nearestBranch.id, // branchId (required for in_center)
        "10001", // zipCode
        "Alex Smith", // customerName
        "5551234567", // customerPhone
        "alex@example.com", // customerEmail
        {
          make: "Ford",
          model: "Focus",
          year: 2017,
          fuel_type: "petrol"
        }, // vehicleDetails
        null, // mobileAddress (not needed in_center)
        null, // promoCode
        true // termsAccepted
      );

      this.assert(bookingResult.success === true, "Booking should succeed");
      this.assert(bookingResult.booking, "Booking result should contain booking");

      const booking = bookingResult.booking;
      this.assert(
        booking.service_code === "wheel_alignment",
        "Booking should be for wheel_alignment"
      );
      this.assert(
        booking.branch_id === nearestBranch.id,
        "Booking branch_id should match selected branch"
      );
      this.assert(
        booking.customer_name === "Alex Smith",
        "Booking customer name should match"
      );
      this.assert(
        booking.vehicle_make === "Ford" && booking.vehicle_model === "Focus",
        "Booking should snapshot vehicle make/model"
      );
      this.assert(
        booking.terms_accepted === true,
        "Terms should be marked as accepted on booking"
      );

      // Verify persistence via storage
      const storedBookings = JSON.parse(
        localStorage.getItem("service_bookings") || "[]"
      );
      const stored = storedBookings.find((b) => b.id === booking.id);
      this.assert(stored, "Booking should be persisted in service_bookings");

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 3 flow (adapted to available tyre data)
  // ----------------------
  testTask3_BuyTwoMidRangeTyresWithFitting() {
    const testName =
      "Task 3: Buy two mid-range tyres with fitting included (adapted size/season)";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // We don't have all-season 225/45 R17 tyres with free fitting;
      // adapt to use existing 205/55 R16 mid-range tyre and include fitting in cart.

      const width = 205;
      const profile = 55;
      const rim = 16;

      const searchResult = this.logic.searchTyresBySizeAndFilters(
        width,
        profile,
        rim,
        {
          brand_tier: "mid_range", // mid-range brands
          max_price: 150,
          only_available: true
        },
        "price_asc",
        1,
        20
      );

      this.assert(
        searchResult && Array.isArray(searchResult.tyres),
        "searchTyresBySizeAndFilters should return tyres array"
      );
      this.assert(
        searchResult.tyres.length > 0,
        "Should find at least one mid-range tyre"
      );

      const selectedTyre = searchResult.tyres[0];
      this.assert(selectedTyre.id, "Selected mid-range tyre should have id");

      // Add 2 tyres to cart with fitting included
      const addResult = this.logic.addTyresToCart(
        selectedTyre.id,
        2,
        true // includeFitting
      );

      this.assert(addResult.success === true, "addTyresToCart should succeed");
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary.cart, "Cart should exist");

      const cartLine = cartSummary.items.find(
        (line) => line.tyre && line.tyre.id === selectedTyre.id
      );
      this.assert(
        cartLine && cartLine.cart_item,
        "Cart should contain the mid-range tyre line"
      );
      this.assert(
        cartLine.cart_item.quantity === 2,
        "Cart line should have quantity 2"
      );
      this.assert(
        cartLine.cart_item.include_fitting === true,
        "Cart line should have fitting included"
      );
      this.assert(
        cartLine.cart_item.fitting_status === "not_booked",
        "Fitting status should be 'not_booked' after including fitting"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 4 flow (adapted: use in-center oil change as full service analogue)
  // ----------------------
  testTask4_BookInCenterServiceWithVehicleDetails() {
    const testName =
      "Task 4: Book in-center service with vehicle details near ZIP 94105 (adapted)";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // We do not have a 'full_service' entry; adapt to use 'oil_change' in-center
      // while still testing: service detail, searchServiceBranches, earliest
      // morning slot within next 14 days, vehicle details, and booking creation.

      const serviceDetail = this.logic.getServiceDetail("oil_change");
      this.assert(serviceDetail && serviceDetail.service, "Service detail exists");
      this.assert(
        serviceDetail.supported_modes.includes("in_center"),
        "Oil change should support in_center"
      );
      this.assert(
        serviceDetail.requires_vehicle_details === true,
        "Service should require vehicle details (in-center variant)"
      );

      // Find nearest in-center branch to 94105
      const branchSearch = this.logic.searchServiceBranches(
        "oil_change",
        "94105",
        "in_center",
        5
      );
      this.assert(
        branchSearch && Array.isArray(branchSearch.branches),
        "searchServiceBranches should return branches"
      );
      this.assert(
        branchSearch.branches.length > 0,
        "Should find at least one branch near 94105"
      );

      const nearestBranch = branchSearch.branches[0].branch;
      this.assert(nearestBranch.id, "Nearest branch should have id");

      // Find earliest available morning (09:00-11:00) slot within next 14 days
      const today = new Date();
      let chosenDateStr = null;
      let chosenSlot = null;

      for (let offset = 0; offset < 14 && !chosenSlot; offset++) {
        const d = new Date(today.getTime());
        d.setDate(d.getDate() + offset);
        const ymd = this.formatDateToYMD(d);

        const slots = this.logic.getAvailableServiceTimeSlots(
          "oil_change",
          "in_center",
          ymd,
          nearestBranch.id,
          null,
          {
            earliest_start_time: "09:00",
            latest_start_time: "11:00"
          }
        );

        if (Array.isArray(slots) && slots.length > 0) {
          chosenDateStr = ymd;
          chosenSlot = slots[0];
        }
      }

      this.assert(
        !!chosenSlot,
        "Should find at least one morning slot within next 14 days"
      );
      this.assert(
        chosenSlot.start_time >= "09:00" && chosenSlot.start_time <= "11:00",
        "Chosen slot should be a morning 09:00-11:00 window"
      );

      // Create booking for 2018 Toyota Corolla petrol
      const bookingResult = this.logic.createServiceBooking(
        "oil_change",
        "in_center",
        chosenSlot.id,
        nearestBranch.id,
        "94105",
        "Jamie Lee",
        "5559876543",
        "jamie@example.com",
        {
          make: "Toyota",
          model: "Corolla",
          year: 2018,
          fuel_type: "petrol"
        },
        null,
        null,
        true
      );

      this.assert(bookingResult.success === true, "Booking should succeed");
      const booking = bookingResult.booking;
      this.assert(booking, "Booking object should be present");
      this.assert(
        booking.customer_name === "Jamie Lee",
        "Booking customer name should match"
      );
      this.assert(
        booking.vehicle_make === "Toyota" &&
          booking.vehicle_model === "Corolla" &&
          booking.vehicle_year === 2018,
        "Booking should snapshot vehicle details"
      );
      this.assert(
        booking.branch_id === nearestBranch.id,
        "Booking branch should match selected branch"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 5 flow (adapted: cheapest tyre meeting min speed rating)
  // ----------------------
  testTask5_BuyTwoCheapestHighSpeedTyres() {
    const testName =
      "Task 5: Add two cheapest tyres with minimum speed rating filter to cart";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // We do not have 195/50 R15 performance summer tyres; adapt to
      // available 205/55 R16 winter tyres and apply min_speed_rating filter.

      const width = 205;
      const profile = 55;
      const rim = 16;

      const searchResult = this.logic.searchTyresBySizeAndFilters(
        width,
        profile,
        rim,
        {
          season: "winter",
          min_speed_rating: "h", // require H or above
          max_price: 200,
          min_customer_rating: 0,
          only_available: true
        },
        "price_asc",
        1,
        20
      );

      this.assert(
        searchResult && Array.isArray(searchResult.tyres),
        "searchTyresBySizeAndFilters should return tyres array"
      );
      this.assert(
        searchResult.tyres.length > 0,
        "Should find at least one tyre with required speed rating"
      );

      // Take cheapest from sorted list
      const selectedTyre = searchResult.tyres[0];
      this.assert(selectedTyre.id, "Selected tyre should have id");

      // Verify it meets the speed rating constraint via returned data
      this.assert(
        ["h", "v", "w", "y", "zr"].includes(selectedTyre.speed_rating),
        "Selected tyre should have speed rating H or above"
      );

      const addResult = this.logic.addTyresToCart(selectedTyre.id, 2, false);
      this.assert(addResult.success === true, "addTyresToCart should succeed");

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary.cart, "Cart should exist");
      const cartLine = cartSummary.items.find(
        (line) => line.tyre && line.tyre.id === selectedTyre.id
      );
      this.assert(cartLine, "Cart should contain the selected tyre line");
      this.assert(
        cartLine.cart_item.quantity === 2,
        "Cart line should have quantity 2"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 6 flow
  // ----------------------
  testTask6_BookMobileOilChangeWithPromo() {
    const testName =
      "Task 6: Book mobile oil change for ZIP 30301 next Friday morning with SAVE20";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Service detail for oil_change (supports mobile via separate service id)
      const serviceDetail = this.logic.getServiceDetail("oil_change");
      this.assert(serviceDetail && serviceDetail.service, "Service detail exists");
      this.assert(
        serviceDetail.supported_modes.includes("mobile"),
        "Oil change should support mobile mode"
      );

      // Determine next Friday from today
      const today = new Date();
      const nextFriday = this.getNextWeekday(today, 5); // 5 = Friday
      const nextFridayStr = this.formatDateToYMD(nextFriday);

      // Get available mobile slots for next Friday morning (start before 11:00)
      const slots = this.logic.getAvailableServiceTimeSlots(
        "oil_change",
        "mobile",
        nextFridayStr,
        null,
        "30301",
        {
          earliest_start_time: "08:00",
          latest_start_time: "11:00"
        }
      );

      this.assert(
        Array.isArray(slots) && slots.length > 0,
        "Should return at least one mobile slot for next Friday morning"
      );

      const chosenSlot = slots[0];
      this.assert(chosenSlot.id, "Chosen slot should have id");
      this.assert(
        chosenSlot.start_time < "11:00",
        "Chosen slot should start before 11:00"
      );

      // Validate promo code SAVE20 for mobile oil change
      const promoPreview = this.logic.validateServicePromoCode(
        "oil_change",
        "mobile",
        "SAVE20",
        serviceDetail.service.base_price || 100
      );

      this.assert(
        promoPreview.is_valid === true,
        "Promo code SAVE20 should be valid for mobile oil change"
      );
      this.assert(promoPreview.promo, "Promo preview should include promo data");
      this.assert(
        promoPreview.discount_amount > 0,
        "Promo discount amount should be greater than 0"
      );

      // Create mobile booking with address and promo code
      const bookingResult = this.logic.createServiceBooking(
        "oil_change",
        "mobile",
        chosenSlot.id,
        null,
        "30301",
        "Taylor Morgan",
        "5552223344",
        null,
        null, // vehicleDetails optional for mobile version
        {
          addressLine1: "123 Main Street",
          addressLine2: null,
          city: "Atlanta",
          state: null,
          zipCode: "30301"
        },
        "SAVE20",
        true
      );

      this.assert(bookingResult.success === true, "Mobile booking should succeed");
      const booking = bookingResult.booking;
      this.assert(booking, "Booking object should exist");
      this.assert(
        booking.mode === "mobile",
        "Booking mode should be mobile"
      );
      this.assert(
        booking.mobile_address_line1 === "123 Main Street" &&
          booking.mobile_city === "Atlanta" &&
          booking.mobile_zip_code === "30301",
        "Booking should store mobile address details"
      );
      this.assert(
        booking.promo_code === "SAVE20",
        "Booking should store promo code SAVE20"
      );
      this.assert(
        typeof booking.promo_discount_amount === "number" &&
          booking.promo_discount_amount > 0,
        "Booking should have a positive promo discount amount"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 7 flow
  // ----------------------
  testTask7_CompareTyresAndAddFilteredOption() {
    const testName =
      "Task 7: Compare tyres and add option matching noise, fuel, and price filters";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Step: search tyres (adapted to existing 205/55 R16 winter tyres)
      const searchResult = this.logic.searchTyresBySizeAndFilters(
        205,
        55,
        16,
        {
          season: "winter",
          max_price: 140,
          only_available: true
        },
        null,
        1,
        10
      );

      this.assert(
        searchResult && Array.isArray(searchResult.tyres),
        "searchTyresBySizeAndFilters should return tyres array"
      );
      this.assert(
        searchResult.tyres.length > 0,
        "Should find at least one tyre within price filter"
      );

      // Select up to first three tyres for comparison
      const tyresToCompare = searchResult.tyres.slice(0, 3);
      const tyreIds = tyresToCompare.map((t) => t.id);
      this.assert(tyreIds.length > 0, "Should have at least one tyre to compare");

      const comparisonResult = this.logic.createTyreComparisonSet(tyreIds);
      this.assert(
        comparisonResult && comparisonResult.comparison_set,
        "Comparison set should be created"
      );
      this.assert(
        Array.isArray(comparisonResult.tyres),
        "Comparison result should include tyres array"
      );

      const comparisonSetId = comparisonResult.comparison_set.id;

      // Load comparison details
      const comparisonDetails = this.logic.getTyreComparisonDetails(
        comparisonSetId
      );
      this.assert(
        comparisonDetails && comparisonDetails.tyres,
        "Comparison details should include tyres"
      );

      // From compared tyres, find one with noise <= 70 dB, fuel rating A/B, price < 140
      const candidate = comparisonDetails.tyres.find((tyre) => {
        const noiseOk =
          typeof tyre.noise_db === "number" && tyre.noise_db <= 70;
        const fuelOk = ["a", "b"].includes(tyre.fuel_efficiency_rating);
        const priceOk = tyre.price_per_tyre < 140;
        return noiseOk && fuelOk && priceOk;
      });

      this.assert(
        !!candidate,
        "Should find at least one tyre in comparison meeting noise/fuel/price criteria"
      );

      // Add 4 of this tyre to cart
      const addResult = this.logic.addTyresToCart(candidate.id, 4, false);
      this.assert(addResult.success === true, "addTyresToCart should succeed");

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary.cart, "Cart should exist");
      const cartLine = cartSummary.items.find(
        (line) => line.tyre && line.tyre.id === candidate.id
      );
      this.assert(cartLine, "Cart should contain the chosen comparison tyre");
      this.assert(
        cartLine.cart_item.quantity === 4,
        "Cart line should have quantity 4"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Task 8 flow
  // ----------------------
  testTask8_BookSaturdayAfternoonFittingAppointment() {
    const testName =
      "Task 8: Book Saturday afternoon fitting appointment near ZIP 60601";
    console.log("Testing:", testName);

    try {
      this.clearStorage();
      this.setupTestData();

      // Precondition: cart with tyres added and fitting included
      const searchResult = this.logic.searchTyresBySizeAndFilters(
        205,
        55,
        16,
        {
          season: "winter",
          only_available: true
        },
        null,
        1,
        10
      );

      this.assert(
        searchResult && searchResult.tyres.length > 0,
        "Should find tyres to add before fitting booking"
      );

      const tyre = searchResult.tyres[0];
      const addResult = this.logic.addTyresToCart(tyre.id, 4, true);
      this.assert(addResult.success === true, "addTyresToCart should succeed");

      // Get fitting candidates from cart
      const fittingCandidates = this.logic.getCartFittingCandidates();
      this.assert(
        fittingCandidates && fittingCandidates.cart,
        "Fitting candidates should include cart"
      );
      this.assert(
        Array.isArray(fittingCandidates.candidates) &&
          fittingCandidates.candidates.length > 0,
        "There should be at least one fitting candidate"
      );

      const candidateItem = fittingCandidates.candidates[0].cart_item;
      this.assert(candidateItem.id, "Candidate cart item should have id");

      // Search fitting locations near ZIP 60601, open on Saturday and with tyre fitting
      const locationSearch = this.logic.searchFittingLocations(
        "60601",
        {
          require_open_on_saturday: true,
          require_tyre_fitting_service: true,
          max_distance_miles: 500 // generous radius for generated data
        },
        "distance_asc"
      );

      this.assert(
        locationSearch && Array.isArray(locationSearch.branches),
        "searchFittingLocations should return branches"
      );
      this.assert(
        locationSearch.branches.length > 0,
        "Should find at least one fitting location for ZIP 60601"
      );

      // Task specifies second branch; if only one exists, fall back to first
      const branchEntry =
        locationSearch.branches[1] || locationSearch.branches[0];
      const chosenBranch = branchEntry.branch;
      this.assert(chosenBranch.id, "Chosen fitting branch should have id");

      // Find next available Saturday with afternoon slot 13:00-15:00
      const today = new Date();
      const nextSaturday = this.getNextWeekday(today, 6); // 6 = Saturday

      let chosenDateStr = null;
      let chosenSlot = null;

      // Search up to 4 upcoming Saturdays (28 days)
      let currentSaturday = new Date(nextSaturday.getTime());
      for (let i = 0; i < 4 && !chosenSlot; i++) {
        const ymd = this.formatDateToYMD(currentSaturday);
        const slots = this.logic.getAvailableFittingTimeSlots(
          chosenBranch.id,
          ymd,
          {
            start_time_from: "13:00",
            start_time_to: "15:00"
          }
        );

        if (Array.isArray(slots) && slots.length > 0) {
          chosenDateStr = ymd;
          chosenSlot = slots[0];
          break;
        }

        // Move to next Saturday
        currentSaturday.setDate(currentSaturday.getDate() + 7);
      }

      this.assert(
        !!chosenSlot,
        "Should find an afternoon fitting slot on a Saturday"
      );
      this.assert(
        chosenSlot.start_time >= "13:00" && chosenSlot.start_time <= "15:00",
        "Chosen slot should start between 13:00 and 15:00"
      );

      // Create fitting appointment for the cart item
      const appointmentResult = this.logic.createFittingAppointment(
        chosenBranch.id,
        chosenSlot.id,
        [candidateItem.id],
        "Test User",
        "5550001111",
        "60601"
      );

      this.assert(
        appointmentResult.success === true,
        "Fitting appointment creation should succeed"
      );
      const appointment = appointmentResult.appointment;
      this.assert(appointment && appointment.id, "Appointment should have id");
      this.assert(
        appointment.branch_id === chosenBranch.id,
        "Appointment branch should match chosen branch"
      );
      this.assert(
        appointment.search_zip_code === "60601",
        "Appointment search_zip_code should be stored"
      );

      // Verify cart items updated with fitting_appointment_id and status
      const updatedItems = appointmentResult.updated_cart_items || [];
      this.assert(
        updatedItems.length > 0,
        "There should be updated cart items after fitting booking"
      );

      const updatedItem = updatedItems.find(
        (ci) => ci.id === candidateItem.id
      );
      this.assert(
        updatedItem && updatedItem.fitting_appointment_id === appointment.id,
        "Cart item should reference the created fitting appointment"
      );
      this.assert(
        updatedItem.fitting_status === "booked",
        "Cart item's fitting_status should be 'booked'"
      );

      // Confirm via order review summary that fitting appointment is included
      const review = this.logic.getOrderReviewSummary();
      this.assert(review.cart, "Order review should include cart");
      this.assert(
        Array.isArray(review.fitting_appointments) &&
          review.fitting_appointments.length > 0,
        "Order review should include at least one fitting appointment"
      );

      const reviewAppointment = review.fitting_appointments.find(
        (fa) => fa.id === appointment.id
      );
      this.assert(
        !!reviewAppointment,
        "Review should contain the created fitting appointment"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----------------------
  // Helper methods
  // ----------------------

  assert(condition, message) {
    if (!condition) {
      throw new Error("Assertion failed: " + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log("\u2713 " + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log("\u00d7 " + testName + ": " + error.message);
  }

  formatDateToYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Get next occurrence (including today if matches) of given weekday (0=Sun..6=Sat)
  getNextWeekday(fromDate, targetWeekday) {
    const d = new Date(fromDate.getTime());
    const currentDay = d.getDay();
    let diff = targetWeekday - currentDay;
    if (diff <= 0) {
      diff += 7;
    }
    d.setDate(d.getDate() + diff);
    return d;
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
