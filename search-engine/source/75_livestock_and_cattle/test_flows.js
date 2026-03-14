class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and init
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure via business logic
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      categories: [
        {
          id: "feeder_cattle",
          name: "Feeder cattle",
          description:
            "Weaned calves and yearlings intended for backgrounding or feedlot finishing, including feeder steers and heifers.",
          sort_order: 1,
        },
        {
          id: "bulls",
          name: "Bulls",
          description:
            "Seedstock and commercial bulls offered for breeding, including Angus, Hereford, and composite bulls.",
          sort_order: 2,
        },
        {
          id: "cow_calf_pairs",
          name: "Cow-calf pairs",
          description:
            "Cows sold with calves at side, including young pairs and 3-in-1 packages.",
          sort_order: 3,
        },
      ],
      profile_settings: [
        {
          id: "user_seller_1",
          full_name: "Sam Seller",
          ranch_name: "High Plains Cattle Co.",
          email: "seller@example.com",
          location_state: "Kansas",
          location_city: "Dodge City",
          account_type: "seller",
          preferred_contact_method: "email_and_in_site",
          show_buying_interests_on_profile: false,
          created_at: "2025-10-01T14:20:00Z",
          updated_at: "2025-12-15T09:05:00Z",
        },
        {
          id: "user_buyer_1",
          full_name: "Jordan Cattlebuyer",
          ranch_name: "Circle J Ranch",
          email: "jordan@example.com",
          location_state: "Nebraska",
          location_city: "Broken Bow",
          account_type: "buyer",
          preferred_contact_method: "in_site_messages_only",
          show_buying_interests_on_profile: true,
          created_at: "2026-02-10T16:45:00Z",
          updated_at: "2026-02-20T11:30:00Z",
        },
        {
          id: "user_seller_2",
          full_name: "Maria Stockman",
          ranch_name: "Red River Livestock",
          email: "maria@redriverlivestock.com",
          location_state: "Texas",
          location_city: "Wichita Falls",
          account_type: "buyer_and_seller",
          preferred_contact_method: "email_only",
          show_buying_interests_on_profile: true,
          created_at: "2025-08-18T08:10:00Z",
          updated_at: "2026-01-05T13:55:00Z",
        },
      ],
      livestock_interest_selections: [
        {
          id: "interest_user_buyer_1_feeder_cattle",
          profile_id: "user_buyer_1",
          interest_type: "feeder_cattle",
          is_selected: true,
        },
        {
          id: "interest_user_buyer_1_bred_heifers",
          profile_id: "user_buyer_1",
          interest_type: "bred_heifers",
          is_selected: true,
        },
        {
          id: "interest_user_buyer_1_stocker_calves",
          profile_id: "user_buyer_1",
          interest_type: "stocker_calves",
          is_selected: true,
        },
      ],
      auction_lots: [
        {
          id: "lot_15_hereford_bred_cows_ks",
          title: "15 Hereford bred cows - Kansas",
          description:
            "Group of 15 Hereford bred cows, mostly 3–5 years old, confirmed bred to a low birthweight Angus bull. Gentle disposition, home-raised, solid-mouth cattle. Vaccinated this fall and poured. Selling in one group from Dodge City, KS.",
          category_id: "bred_cows",
          breed: "Hereford",
          sex: "cow",
          head_count: 15,
          weight_min_lbs: 1150,
          weight_max_lbs: 1350,
          average_weight_lbs: 1250,
          age_years: 4,
          location_state: "Kansas",
          location_city: "Dodge City",
          location_zip: "67801",
          latitude: 37.7528,
          longitude: -100.0171,
          auction_format: "online_timed",
          status: "scheduled",
          is_own_listing: true,
          price_unit: "per_head",
          starting_bid_amount: 1200,
          reserve_price_amount: 1400,
          reserve_met: false,
          opening_datetime: "2026-03-03T18:00:00Z",
          closing_datetime: "2026-03-13T17:00:00Z",
          created_at: "2026-03-03T16:00:00Z",
          updated_at: "2026-03-03T16:00:00Z",
          seller_display_name: "Sam Seller",
          seller_ranch_name: "High Plains Cattle Co.",
          photos: [
            "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&h=600&fit=crop&auto=format&q=80",
          ],
          tags: [
            "Hereford",
            "bred cows",
            "Kansas",
            "Dodge City",
            "spring calving",
          ],
        },
        {
          id: "lot_draft_red_angus_bred_heifers_ne",
          title: "16 Red Angus bred heifers - Nebraska (draft)",
          description:
            "Nice set of 16 Red Angus bred heifers, AI bred to calving-ease Red Angus bulls. Good disposition, pelvic measured and vaccinated. Listing currently in draft status pending final photos and video.",
          category_id: "bred_heifers",
          breed: "Red Angus",
          sex: "heifer",
          head_count: 16,
          weight_min_lbs: 1000,
          weight_max_lbs: 1150,
          average_weight_lbs: 1075,
          age_years: 2,
          location_state: "Nebraska",
          location_city: "Broken Bow",
          location_zip: "68822",
          latitude: 41.4011,
          longitude: -99.6396,
          auction_format: "online_timed",
          status: "draft",
          is_own_listing: true,
          price_unit: "per_head",
          starting_bid_amount: 1100,
          reserve_price_amount: 1300,
          reserve_met: false,
          opening_datetime: "2026-03-15T19:00:00Z",
          closing_datetime: "2026-03-25T21:00:00Z",
          created_at: "2026-02-28T14:30:00Z",
          updated_at: "2026-03-01T09:15:00Z",
          seller_display_name: "Sam Seller",
          seller_ranch_name: "High Plains Cattle Co.",
          photos: [
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop&auto=format&q=80",
          ],
          tags: ["Red Angus", "bred heifers", "draft listing"],
        },
        {
          id: "lot_ok_angus_heifers_1",
          title: "8 Angus bred heifers - Stillwater, OK",
          description:
            "Eight head of black Angus bred heifers, synchronized and AI bred to calving-ease Angus bulls. Due to calve in April/May. Gentle, cake-broke, and easy to handle. Located near Stillwater, Oklahoma.",
          category_id: "bred_heifers",
          breed: "Angus",
          sex: "heifer",
          head_count: 8,
          weight_min_lbs: 1050,
          weight_max_lbs: 1200,
          average_weight_lbs: 1125,
          age_years: 2,
          location_state: "Oklahoma",
          location_city: "Stillwater",
          location_zip: "74074",
          latitude: 36.1156,
          longitude: -97.0584,
          auction_format: "online_timed",
          status: "live",
          is_own_listing: false,
          price_unit: "per_head",
          starting_bid_amount: 1350,
          reserve_price_amount: 1500,
          reserve_met: false,
          opening_datetime: "2026-03-01T14:00:00Z",
          closing_datetime: "2026-03-04T20:00:00Z",
          created_at: "2026-02-25T10:10:00Z",
          updated_at: "2026-03-02T08:45:00Z",
          seller_display_name: "Red River Livestock",
          seller_ranch_name: "Red River Livestock",
          photos: [
            "https://images.unsplash.com/photo-1517840933442-d2dfb3c8c9a0?w=800&h=600&fit=crop&auto=format&q=80",
          ],
          tags: ["Angus heifer", "bred heifers", "Oklahoma", "AI bred"],
          current_price_amount: 1400,
        },
      ],
      message_threads: [
        {
          id: "thread_tx_angus_bull_younger_inquiry",
          lot_id: "lot_tx_angus_bull_younger",
          subject: "Re: Yearling Angus bull - Texas",
          counterpart_name: "Lone Star Angus",
          created_at: "2026-03-02T20:15:00Z",
          last_message_at: "2026-03-02T21:02:00Z",
          last_message_preview:
            "Thanks for your inquiry. Bull was weighed last week at approximately 1,550 lbs and passed a full breeding soundness exam in February.",
          unread_count: 1,
        },
        {
          id: "thread_tx_bred_heifers_austin_1_inquiry",
          lot_id: "lot_tx_bred_heifers_austin_1",
          subject: "Question about 20 black baldy bred heifers - Bastrop, TX",
          counterpart_name: "Circle J Ranch",
          created_at: "2026-03-01T18:05:00Z",
          last_message_at: "2026-03-01T18:25:00Z",
          last_message_preview:
            "They are due to calve from April 10 to May 5 and yes, all heifers have been pelvic measured and passed.",
          unread_count: 0,
        },
        {
          id: "thread_feeder_steers_ks_72hd_inquiry",
          lot_id: "lot_feeder_steers_ks_72hd",
          subject: "Re: 72 black-hided feeder steers - Kansas",
          counterpart_name: "Prairie View Cattle",
          created_at: "2026-03-02T16:45:00Z",
          last_message_at: "2026-03-02T17:15:00Z",
          last_message_preview:
            "They are weaned 65 days, 2 rounds of modified-live, 7-way, and dewormed. We can provide individual treatment records on request.",
          unread_count: 1,
        },
      ],
      messages: [
        {
          id: "msg_tx_angus_bull_younger_1",
          thread_id: "thread_tx_angus_bull_younger_inquiry",
          body:
            "I'm interested in this Angus bull. Please confirm current weight and fertility testing status.",
          sent_at: "2026-03-02T20:16:00Z",
          direction: "outgoing",
          is_read: true,
        },
        {
          id: "msg_tx_angus_bull_younger_2",
          thread_id: "thread_tx_angus_bull_younger_inquiry",
          body:
            "Thanks for your inquiry. Bull was weighed last week at approximately 1,550 lbs and passed a full breeding soundness exam in February.",
          sent_at: "2026-03-02T21:02:00Z",
          direction: "incoming",
          is_read: false,
        },
        {
          id: "msg_tx_bred_heifers_austin_1_1",
          thread_id: "thread_tx_bred_heifers_austin_1_inquiry",
          body:
            "Can you confirm approximate calving window and whether these bred heifers have been pelvic measured?",
          sent_at: "2026-03-01T18:06:00Z",
          direction: "outgoing",
          is_read: true,
        },
      ],
      bids: [
        {
          id: "bid_feeder_ks_72hd_user_205",
          lot_id: "lot_feeder_steers_ks_72hd",
          amount: 2.05,
          price_unit: "per_pound",
          is_user_bid: true,
          source: "manual",
          created_at: "2026-03-03T15:00:00Z",
          is_maximum_bid: true,
        },
        {
          id: "bid_feeder_ne_55hd_other_215",
          lot_id: "lot_feeder_steers_ne_55hd",
          amount: 2.15,
          price_unit: "per_pound",
          is_user_bid: false,
          source: "manual",
          created_at: "2026-03-02T16:20:00Z",
          is_maximum_bid: true,
        },
        {
          id: "bid_feeder_ok_30hd_other_200",
          lot_id: "lot_feeder_steers_ok_30hd",
          amount: 2.0,
          price_unit: "per_pound",
          is_user_bid: false,
          source: "manual",
          created_at: "2026-03-03T12:45:00Z",
          is_maximum_bid: true,
        },
      ],
      _metadata: {
        baselineDate: "2026-03-03",
        generatedAt: "2026-03-03T03:14:35.203506",
      },
    };

    // Persist to localStorage using correct storage keys
    localStorage.setItem(
      "categories",
      JSON.stringify(generatedData.categories || [])
    );
    localStorage.setItem(
      "profile_settings",
      JSON.stringify(generatedData.profile_settings || [])
    );
    localStorage.setItem(
      "livestock_interest_selections",
      JSON.stringify(generatedData.livestock_interest_selections || [])
    );
    localStorage.setItem(
      "auction_lots",
      JSON.stringify(generatedData.auction_lots || [])
    );
    localStorage.setItem(
      "message_threads",
      JSON.stringify(generatedData.message_threads || [])
    );
    localStorage.setItem(
      "messages",
      JSON.stringify(generatedData.messages || [])
    );
    localStorage.setItem("bids", JSON.stringify(generatedData.bids || []));

    // Initialize empty collections for watchlist and saved searches
    localStorage.setItem("watchlist_items", JSON.stringify([]));
    localStorage.setItem("saved_searches", JSON.stringify([]));

    // Store metadata (not required by entities but useful)
    localStorage.setItem("_metadata", JSON.stringify(generatedData._metadata));
  }

  // ---- Helper wrappers to keep SDK calls positional ----

  searchAuctionLots(params) {
    const p = params || {};
    return this.logic.searchAuctionLots(
      p.keyword,
      p.categoryId,
      p.locationState,
      p.locationCity,
      p.locationZip,
      p.radiusMiles,
      p.headCountMin,
      p.headCountMax,
      p.weightMinLbs,
      p.weightMaxLbs,
      p.priceUnit,
      p.priceMin,
      p.priceMax,
      p.closingDateFilterType,
      p.closingDateDaysFromNowMin,
      p.closingDateDaysFromNowMax,
      p.auctionFormat,
      p.status,
      p.sortOption,
      p.page,
      p.pageSize
    );
  }

  getWatchlistItems(params) {
    const p = params || {};
    return this.logic.getWatchlistItems(
      p.sortOption,
      p.categoryId,
      p.priceMax,
      p.closingDateFilterType,
      p.closingDateDaysFromNowMin,
      p.closingDateDaysFromNowMax
    );
  }

  createSavedSearch(params) {
    const p = params || {};
    return this.logic.createSavedSearch(
      p.name,
      p.keyword,
      p.categoryId,
      p.locationState,
      p.locationCity,
      p.locationZip,
      p.radiusMiles,
      p.headCountMin,
      p.headCountMax,
      p.weightMinLbs,
      p.weightMaxLbs,
      p.priceUnit,
      p.priceMin,
      p.priceMax,
      p.closingDateFilterType,
      p.closingDateDaysFromNowMin,
      p.closingDateDaysFromNowMax,
      p.sortOption,
      p.alertsEnabled
    );
  }

  // ---- Test runner ----

  runAllTests() {
    console.log("Starting flow tests...");

    this.testTask1_AddCheapestAngusHeiferToWatchlist();
    this.testTask2_BidOnLargestLotWithFilters();
    this.testTask3_CreateHerefordBredCowsListing();
    this.testTask4_EditDraftListingQuantityPriceClosing();
    this.testTask5_CreateSavedSearchWithAlerts();
    this.testTask6_CompareTwoLotsAndMessageYoungerSeller();
    this.testTask7_BuildWatchlistFromMultipleLots();
    this.testTask8_RegisterBuyerAndConfigureProfile();

    return this.results;
  }

  // ---- Task 1 ----
  // Add the cheapest Angus heifer lot in Oklahoma under $1,800 closing within 3 days to watchlist
  testTask1_AddCheapestAngusHeiferToWatchlist() {
    const testName =
      "Task 1: Add cheapest qualifying Angus heifer lot in OK to watchlist";
    try {
      // Search for Angus heifer lots matching filters
      const searchResult = this.searchAuctionLots({
        keyword: "Angus heifer",
        categoryId: null,
        locationState: "Oklahoma",
        locationCity: null,
        locationZip: null,
        radiusMiles: null,
        headCountMin: null,
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: "per_head",
        priceMin: null,
        priceMax: 1800,
        closingDateFilterType: "ending_within_days",
        closingDateDaysFromNowMin: 0,
        closingDateDaysFromNowMax: 3,
        auctionFormat: null,
        status: "live",
        sortOption: "price_per_head_low_to_high",
        page: 1,
        pageSize: 20,
      });

      this.assert(
        searchResult && Array.isArray(searchResult.results),
        "Search should return results array"
      );
      this.assert(
        searchResult.results.length > 0,
        "Should find at least one qualifying Angus heifer lot"
      );

      // Cheapest qualifying lot is first due to sorting
      const cheapestSummary = searchResult.results[0];
      const lotId = cheapestSummary.id;
      this.assert(lotId, "Search result lot should have an id");

      // Open lot details
      const lotDetails = this.logic.getLotDetails(lotId);
      this.assert(lotDetails && lotDetails.lot, "Should load lot details");
      this.assert(
        lotDetails.lot.location_state === "Oklahoma",
        "Lot should be in Oklahoma"
      );
      this.assert(
        lotDetails.lot.price_unit === "per_head",
        "Lot price unit should be per_head"
      );

      // Add to watchlist
      const addResult = this.logic.addLotToWatchlist(lotId);
      this.assert(addResult.success === true, "Add to watchlist should succeed");
      this.assert(
        addResult.watchlistItem && addResult.watchlistItem.lot_id === lotId,
        "Watchlist item should reference the correct lot"
      );

      // Verify via watchlist retrieval
      const watchlist = this.getWatchlistItems({
        sortOption: "closing_soonest",
        categoryId: null,
        priceMax: null,
        closingDateFilterType: "none",
      });
      this.assert(watchlist && Array.isArray(watchlist.items), "Watchlist items should be array");
      const found = watchlist.items.find((i) => i.lot && i.lot.id === lotId);
      this.assert(!!found, "Added lot should appear on watchlist");

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 2 ----
  // Adapted: search for largest head-count lot under headcount/price filters and place a valid maximum bid
  testTask2_BidOnLargestLotWithFilters() {
    const testName =
      "Task 2: Bid on largest qualifying lot using filters and maximum bid";
    try {
      // Use filters similar in spirit: minimum head count and max price per head
      const searchResult = this.searchAuctionLots({
        keyword: null,
        categoryId: null,
        locationState: null,
        locationCity: null,
        locationZip: null,
        radiusMiles: null,
        headCountMin: 10, // at least 10 head
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: "per_head",
        priceMin: null,
        priceMax: 2200, // under $2,200 per head
        closingDateFilterType: "none",
        closingDateDaysFromNowMin: null,
        closingDateDaysFromNowMax: null,
        auctionFormat: null,
        status: "scheduled", // upcoming lots
        sortOption: "head_count_high_to_low",
        page: 1,
        pageSize: 20,
      });

      this.assert(
        searchResult && Array.isArray(searchResult.results),
        "Search should return results array"
      );
      this.assert(
        searchResult.results.length > 0,
        "Should find at least one qualifying lot for bidding"
      );

      const targetSummary = searchResult.results[0]; // largest head count due to sort
      const lotId = targetSummary.id;
      this.assert(lotId, "Target lot should have an id");

      // Load lot details to determine a valid bid amount
      const details = this.logic.getLotDetails(lotId);
      this.assert(details && details.lot, "Should load lot details for bidding");
      const starting = details.lot.starting_bid_amount;
      this.assert(
        typeof starting === "number" && starting > 0,
        "Lot should have positive starting bid"
      );

      const bidAmount = starting + 10; // ensure bid is above starting bid

      const bidResult = this.logic.placeMaximumBidOnLot(lotId, bidAmount);
      this.assert(bidResult.success === true, "Placing maximum bid should succeed");
      this.assert(
        bidResult.userBid && bidResult.userBid.lot_id === lotId,
        "Returned bid should reference the correct lot"
      );
      this.assert(
        bidResult.userBid.amount === bidAmount,
        "Bid amount should match the requested maximum"
      );
      this.assert(
        bidResult.userBid.is_maximum_bid === true,
        "Bid should be marked as maximum bid"
      );

      // Verify lot pricing state updated using actual response
      if (bidResult.lot && typeof bidResult.lot.current_price_amount === "number") {
        this.assert(
          bidResult.lot.current_price_amount <= bidAmount,
          "Current price should not exceed maximum bid"
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 3 ----
  // Create a new auction listing for 15 Hereford bred cows in Kansas with starting bid & reserve
  testTask3_CreateHerefordBredCowsListing() {
    const testName =
      "Task 3: Create new Hereford bred cows listing with starting bid, reserve, and closing date";
    try {
      // Sign in as seller
      const email = "seller@example.com";
      const password = "Password123!";
      const signInResult = this.logic.signIn(email, password);
      this.assert(signInResult.success === true, "Seller sign-in should succeed");
      this.assert(signInResult.profile && signInResult.profile.id, "Sign-in should return a profile");

      // Optionally load form options
      const formOptions = this.logic.getCreateListingFormOptions();
      this.assert(!!formOptions, "Create listing form options should be returned");

      const title = "15 Hereford bred cows - Kansas (test)";
      const categoryId = "bred_cows";
      const breed = "Hereford";
      const headCount = 15;
      const locationState = "Kansas";
      const locationCity = "Dodge City";
      const auctionFormat = "online_timed";
      const priceUnit = "per_head";
      const startingBidAmount = 1200;
      const reservePriceAmount = 1400;

      // Closing date exactly 10 days from today at 5:00 PM local (17:00)
      const now = new Date();
      const closingDateObj = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const closingDate = closingDateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      const closingTime = "17:00"; // 5:00 PM

      const description =
        "Group of 15 Hereford bred cows, 3–5 years old, synchronized and bred to Angus bull. Test listing creation.";

      const createResult = this.logic.createAuctionListing(
        title,
        categoryId,
        breed,
        headCount,
        locationState,
        locationCity,
        auctionFormat,
        priceUnit,
        startingBidAmount,
        reservePriceAmount,
        closingDate,
        closingTime,
        description
      );

      this.assert(createResult.success === true, "Listing creation should succeed");
      this.assert(createResult.lotId, "Created listing should return a lotId");
      this.assert(createResult.lot && createResult.lot.id, "Response should include lot object");

      const createdLotId = createResult.lotId;
      const createdDetails = this.logic.getLotDetails(createdLotId);
      this.assert(createdDetails && createdDetails.lot, "Should load created lot details");
      this.assert(
        createdDetails.lot.title === title,
        "Created lot title should match input"
      );
      this.assert(
        createdDetails.lot.head_count === headCount,
        "Created lot head_count should match input"
      );
      this.assert(
        createdDetails.lot.starting_bid_amount === startingBidAmount,
        "Created lot starting bid should match input"
      );
      this.assert(
        createdDetails.lot.reserve_price_amount === reservePriceAmount,
        "Created lot reserve price should match input"
      );

      // Verify closing date in stored datetime starts with the date we set
      if (createdDetails.lot.closing_datetime) {
        const closingStr = createdDetails.lot.closing_datetime;
        this.assert(
          closingStr.indexOf(closingDate) === 0 || closingStr.includes(closingDate),
          "Closing datetime should include the configured closing date"
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 4 ----
  // Edit an existing draft listing: change quantity, starting bid, and move closing date 3 days later
  testTask4_EditDraftListingQuantityPriceClosing() {
    const testName =
      "Task 4: Edit draft listing to change head count, starting bid, and closing date";
    try {
      // Ensure signed in as seller
      const email = "seller@example.com";
      const password = "Password123!";
      const signInResult = this.logic.signIn(email, password);
      this.assert(signInResult.success === true, "Seller sign-in should succeed for editing");

      // Load draft listings via My Listings
      const myDrafts = this.logic.getMyListings("draft", "closing_soonest");
      this.assert(
        myDrafts && Array.isArray(myDrafts.items),
        "My Listings draft items should be array"
      );
      this.assert(
        myDrafts.items.length > 0,
        "There should be at least one draft listing to edit"
      );

      const draftSummary = myDrafts.items[0];
      const lotId = draftSummary.id;
      this.assert(lotId, "Draft listing should have an id");

      // Load listing for edit
      const editData = this.logic.getListingForEdit(lotId);
      this.assert(editData && editData.lot, "Should load listing for edit");

      // Compute new closing date exactly 3 days later, keeping same time
      const currentClosing = new Date(editData.lot.closing_datetime);
      const newClosing = new Date(currentClosing.getTime() + 3 * 24 * 60 * 60 * 1000);
      const newClosingDate = newClosing.toISOString().slice(0, 10);
      const hours = currentClosing.getHours().toString().padStart(2, "0");
      const minutes = currentClosing.getMinutes().toString().padStart(2, "0");
      const closingTime = `${hours}:${minutes}`;

      const appendedSentence =
        "Updated lot size and pricing as of this week.";
      const newDescription =
        (editData.lot.description || "") + " " + appendedSentence;

      const updateResult = this.logic.updateAuctionListing(lotId, {
        head_count: 18,
        starting_bid_amount: 1300,
        closing_date: newClosingDate,
        closing_time: closingTime,
        description: newDescription,
      });

      this.assert(updateResult.success === true, "Draft listing update should succeed");
      this.assert(updateResult.lot && updateResult.lot.id === lotId, "Updated lot should have same id");
      this.assert(
        updateResult.lot.head_count === 18,
        "Updated head_count should be 18"
      );
      this.assert(
        updateResult.lot.starting_bid_amount === 1300,
        "Updated starting bid should be 1300"
      );
      this.assert(
        typeof updateResult.lot.description === "string" &&
          updateResult.lot.description.indexOf(appendedSentence) !== -1,
        "Updated description should include appended sentence"
      );

      if (updateResult.lot.closing_datetime) {
        const closingStr = updateResult.lot.closing_datetime;
        this.assert(
          closingStr.indexOf(newClosingDate) === 0 || closingStr.includes(newClosingDate),
          "Closing datetime should reflect new closing date"
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 5 ----
  // Create a saved search for bred heifers near Austin with alerts under $2,000
  testTask5_CreateSavedSearchWithAlerts() {
    const testName =
      "Task 5: Create saved search for bred heifers near Austin with alerts enabled";
    try {
      // Simulate running the search first
      const searchResult = this.searchAuctionLots({
        keyword: "bred heifers",
        categoryId: null,
        locationState: null,
        locationCity: null,
        locationZip: "78701",
        radiusMiles: 100,
        headCountMin: null,
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: "per_head",
        priceMin: null,
        priceMax: 2000,
        closingDateFilterType: "ending_within_days",
        closingDateDaysFromNowMin: 0,
        closingDateDaysFromNowMax: 7,
        auctionFormat: null,
        status: null,
        sortOption: "price_per_head_low_to_high",
        page: 1,
        pageSize: 20,
      });

      this.assert(!!searchResult, "Search for saved-search setup should return a response");

      const savedName = "TX bred heifers under 2k";

      const createResult = this.createSavedSearch({
        name: savedName,
        keyword: "bred heifers",
        categoryId: null,
        locationState: null,
        locationCity: null,
        locationZip: "78701",
        radiusMiles: 100,
        headCountMin: null,
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: "per_head",
        priceMin: null,
        priceMax: 2000,
        closingDateFilterType: "ending_within_days",
        closingDateDaysFromNowMin: 0,
        closingDateDaysFromNowMax: 7,
        sortOption: "price_per_head_low_to_high",
        alertsEnabled: true,
      });

      this.assert(createResult.success === true, "Saved search creation should succeed");
      this.assert(
        createResult.savedSearch && createResult.savedSearch.id,
        "Saved search should have an id"
      );
      this.assert(
        createResult.savedSearch.name === savedName,
        "Saved search name should match input"
      );
      this.assert(
        createResult.savedSearch.alerts_enabled === true,
        "Alerts should be enabled on created saved search"
      );

      // Verify via getSavedSearches
      const allSaved = this.logic.getSavedSearches();
      this.assert(
        allSaved && Array.isArray(allSaved.items),
        "getSavedSearches should return items array"
      );

      const created = allSaved.items.find(
        (s) => s.id === createResult.savedSearch.id
      );
      this.assert(!!created, "Created saved search should appear in list");
      this.assert(
        created.alerts_enabled === true,
        "Created saved search should have alerts enabled in list view"
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 6 ----
  // Compare two lots by age and message the seller of the younger lot
  testTask6_CompareTwoLotsAndMessageYoungerSeller() {
    const testName =
      "Task 6: Compare two lots by age and message seller of younger lot";
    try {
      // Search broadly to get at least two active lots
      const searchResult = this.searchAuctionLots({
        keyword: "Angus", // aligns with task intent but still generic
        categoryId: null,
        locationState: null,
        locationCity: null,
        locationZip: null,
        radiusMiles: null,
        headCountMin: null,
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: null,
        priceMin: null,
        priceMax: null,
        closingDateFilterType: "none",
        closingDateDaysFromNowMin: null,
        closingDateDaysFromNowMax: null,
        auctionFormat: null,
        status: null,
        sortOption: "closing_soonest",
        page: 1,
        pageSize: 10,
      });

      this.assert(
        searchResult && Array.isArray(searchResult.results),
        "Search should return results array"
      );
      this.assert(
        searchResult.results.length >= 2,
        "Should have at least two lots to compare"
      );

      const firstSummary = searchResult.results[0];
      const secondSummary = searchResult.results[1];

      const firstDetails = this.logic.getLotDetails(firstSummary.id);
      const secondDetails = this.logic.getLotDetails(secondSummary.id);

      this.assert(firstDetails && firstDetails.lot, "First lot details should load");
      this.assert(secondDetails && secondDetails.lot, "Second lot details should load");

      const age1 =
        typeof firstDetails.lot.age_years === "number"
          ? firstDetails.lot.age_years
          : Infinity;
      const age2 =
        typeof secondDetails.lot.age_years === "number"
          ? secondDetails.lot.age_years
          : Infinity;

      const youngerLotId = age2 < age1 ? secondDetails.lot.id : firstDetails.lot.id;

      const messageBody =
        "I'm interested in this Angus bull. Please confirm current weight and fertility testing status.";

      const sendResult = this.logic.sendMessageToSeller(youngerLotId, messageBody);
      this.assert(sendResult.success === true, "Sending message to seller should succeed");
      this.assert(
        sendResult.thread && sendResult.thread.id,
        "Message thread should be created/returned"
      );
      this.assert(
        sendResult.thread.lot_id === youngerLotId,
        "Message thread should be associated with the younger lot"
      );

      // Verify thread appears in message threads list
      const threadsResult = this.logic.getMessageThreads(false);
      this.assert(
        threadsResult && Array.isArray(threadsResult.threads),
        "getMessageThreads should return threads array"
      );
      const foundThread = threadsResult.threads.find(
        (t) => t.id === sendResult.thread.id
      );
      this.assert(!!foundThread, "Newly created message thread should appear in threads list");

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 7 ----
  // Build a watchlist of up to 3 affordable lots for upcoming auctions and open watchlist
  testTask7_BuildWatchlistFromMultipleLots() {
    const testName =
      "Task 7: Build watchlist of up to three affordable lots and verify watchlist";
    try {
      // Search for upcoming auctions with a broad closing window and sort by price
      const searchResult = this.searchAuctionLots({
        keyword: null,
        categoryId: null, // allow any category to adapt to available data
        locationState: null,
        locationCity: null,
        locationZip: null,
        radiusMiles: null,
        headCountMin: null,
        headCountMax: null,
        weightMinLbs: null,
        weightMaxLbs: null,
        priceUnit: null,
        priceMin: null,
        priceMax: null,
        closingDateFilterType: "ending_within_days",
        closingDateDaysFromNowMin: 0,
        closingDateDaysFromNowMax: 30, // broad window to catch available lots
        auctionFormat: null,
        status: null,
        sortOption: "price_per_head_low_to_high",
        page: 1,
        pageSize: 20,
      });

      this.assert(
        searchResult && Array.isArray(searchResult.results),
        "Search should return results array"
      );

      const affordableLots = [];
      for (const summary of searchResult.results) {
        if (affordableLots.length >= 3) break;
        const unit = summary.price_unit || "per_head";
        const price =
          typeof summary.current_price_amount === "number"
            ? summary.current_price_amount
            : summary.starting_bid_amount;
        if (typeof price === "number" && price < 2500) {
          affordableLots.push(summary);
        }
      }

      this.assert(
        affordableLots.length > 0,
        "Should find at least one affordable lot to watch"
      );

      const addedLotIds = [];
      for (const lotSummary of affordableLots) {
        const lotId = lotSummary.id;
        // Open details then add to watchlist to mirror UI flow
        const details = this.logic.getLotDetails(lotId);
        this.assert(details && details.lot, "Should load lot details before adding to watchlist");
        const addResult = this.logic.addLotToWatchlist(lotId);
        this.assert(addResult.success === true, "Add to watchlist should succeed for each lot");
        addedLotIds.push(lotId);
      }

      // Open full watchlist page
      const watchlist = this.getWatchlistItems({
        sortOption: "closing_soonest",
        categoryId: null,
        priceMax: null,
        closingDateFilterType: "none",
      });

      this.assert(
        watchlist && Array.isArray(watchlist.items),
        "Watchlist retrieval should return items array"
      );

      for (const lotId of addedLotIds) {
        const found = watchlist.items.find((i) => i.lot && i.lot.id === lotId);
        this.assert(
          !!found,
          "Each added affordable lot should be present on the watchlist"
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Task 8 ----
  // Register as a buyer and configure livestock interests and visibility settings
  testTask8_RegisterBuyerAndConfigureProfile() {
    const testName =
      "Task 8: Register buyer account, set interests, and enable visibility";
    try {
      // Use a unique email to avoid clashing with pre-generated data
      const fullName = "Jordan Cattlebuyer";
      const ranchName = "Circle J Ranch";
      const email = "jordan+test@example.com";
      const password = "SecurePass!234";
      const locationState = "Nebraska";
      const locationCity = "Broken Bow";
      const primaryInterests = [
        "feeder_cattle",
        "bred_heifers",
        "stocker_calves",
      ];
      const preferredContactMethod = "in_site_messages_only";

      const registerResult = this.logic.registerBuyerAccount(
        fullName,
        ranchName,
        email,
        password,
        locationState,
        locationCity,
        primaryInterests,
        preferredContactMethod
      );

      this.assert(registerResult.success === true, "Buyer registration should succeed");
      this.assert(
        registerResult.profile && registerResult.profile.id,
        "Registration should return a profile with id"
      );
      this.assert(
        registerResult.profile.email === email,
        "Registered profile email should match input"
      );
      this.assert(
        registerResult.profile.preferred_contact_method ===
          preferredContactMethod,
        "Preferred contact method should be set to in-site messages only"
      );

      this.assert(
        Array.isArray(registerResult.selectedLivestockInterests),
        "Registration should return selected livestock interests"
      );
      for (const interest of primaryInterests) {
        this.assert(
          registerResult.selectedLivestockInterests.indexOf(interest) !== -1,
          "Registered interests should include " + interest
        );
      }

      // After registration, account should be signed in; load profile settings
      const profileSettings = this.logic.getProfileSettings();
      this.assert(profileSettings && profileSettings.profile, "Profile settings should load");
      this.assert(
        profileSettings.profile.email === email,
        "Profile settings should correspond to the newly registered buyer"
      );

      // Enable 'show buying interests on profile'
      const updateResult = this.logic.updateProfileSettings(
        {
          full_name: fullName,
          ranch_name: ranchName,
          location_state: locationState,
          location_city: locationCity,
          preferred_contact_method: preferredContactMethod,
          show_buying_interests_on_profile: true,
        },
        primaryInterests
      );

      this.assert(updateResult.success === true, "Profile update should succeed");
      this.assert(
        updateResult.profile.show_buying_interests_on_profile === true,
        "Profile should have 'show buying interests' enabled"
      );
      this.assert(
        Array.isArray(updateResult.selectedLivestockInterests),
        "Profile update should return selected livestock interests"
      );
      for (const interest of primaryInterests) {
        this.assert(
          updateResult.selectedLivestockInterests.indexOf(interest) !== -1,
          "Updated interests should include " + interest
        );
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // ---- Assertion helpers ----

  assert(condition, message) {
    if (!condition) {
      throw new Error("Assertion failed: " + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log("✓ " + testName);
  }

  recordFailure(testName, error) {
    this.results.push({
      test: testName,
      success: false,
      error: error && error.message ? error.message : String(error),
    });
    console.log("✗ " + testName + ": " + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
