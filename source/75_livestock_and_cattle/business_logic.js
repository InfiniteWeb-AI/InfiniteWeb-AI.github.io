// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  let store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // =========================
  // Storage & ID helpers
  // =========================

  _initStorage() {
    // Core entity tables
    const keysWithDefaults = {
      auction_lots: [],
      categories: [],
      profile_settings: [],
      livestock_interest_selections: [],
      watchlist_items: [],
      saved_searches: [],
      bids: [],
      message_threads: [],
      messages: [],
      support_requests: [],
      auth_users: [],
      // Static / config-like tables
      static_page_about: null,
      static_page_help: null,
      static_page_terms: null,
      static_page_privacy: null,
      contact_support_info: null,
      current_profile_id: null
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        const value = keysWithDefaults[key];
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    // Seed categories if empty (reference data, not mock content)
    const categories = this._getFromStorage("categories", []);
    if (!categories || categories.length === 0) {
      const seededCategories = [
        {
          id: "feeder_cattle",
          name: "Feeder cattle",
          description: "Feeder cattle lots",
          sort_order: 1
        },
        {
          id: "bulls",
          name: "Bulls",
          description: "Bull lots",
          sort_order: 2
        },
        {
          id: "cow_calf_pairs",
          name: "Cow-calf pairs",
          description: "Cow-calf pair lots",
          sort_order: 3
        },
        {
          id: "bred_cows",
          name: "Bred cows",
          description: "Bred cow lots",
          sort_order: 4
        },
        {
          id: "bred_heifers",
          name: "Bred heifers",
          description: "Bred heifer lots",
          sort_order: 5
        },
        {
          id: "stocker_calves",
          name: "Stocker calves",
          description: "Stocker calf lots",
          sort_order: 6
        },
        {
          id: "other",
          name: "Other",
          description: "Other livestock",
          sort_order: 99
        }
      ];
      this._saveToStorage("categories", seededCategories);
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? defaultValue : parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseIso(dateString) {
    return dateString ? new Date(dateString) : null;
  }

  _combineDateTime(dateStr, timeStr) {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
    if (!dateStr || !timeStr) return null;
    // Construct in UTC so the ISO date portion always matches the provided date
    const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
    const [hour, minute] = timeStr.split(":").map((v) => parseInt(v, 10));
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }

  _getCurrentProfileSettings() {
    const profiles = this._getFromStorage("profile_settings", []);
    let currentId = this._getFromStorage("current_profile_id", null);

    let profile = null;
    if (currentId) {
      profile = profiles.find((p) => p.id === currentId) || null;
    }

    if (!profile && profiles.length > 0) {
      profile = profiles[0];
      this._saveToStorage("current_profile_id", profile.id);
    }

    if (!profile) {
      // Initialize a blank buyer profile as the single-user default
      const newProfile = {
        id: this._generateId("profile"),
        full_name: "",
        ranch_name: "",
        email: "",
        location_state: "",
        location_city: "",
        account_type: "buyer",
        preferred_contact_method: "in_site_messages_only",
        show_buying_interests_on_profile: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(newProfile);
      this._saveToStorage("profile_settings", profiles);
      this._saveToStorage("current_profile_id", newProfile.id);
      profile = newProfile;
    }

    const interests = this._getFromStorage("livestock_interest_selections", []);
    const selected = interests
      .filter((i) => i.profile_id === profile.id && i.is_selected)
      .map((i) => i.interest_type);

    return { profile, selectedLivestockInterests: selected };
  }

  _getOrCreateWatchlistStorage() {
    const items = this._getFromStorage("watchlist_items", []);
    return items;
  }

  _buildLotSummaryFromAuctionLot(lot) {
    const categories = this._getFromStorage("categories", []);
    const watchlist = this._getOrCreateWatchlistStorage();
    const category = categories.find((c) => c.id === lot.category_id) || null;
    const isWatchlisted = watchlist.some((w) => w.lot_id === lot.id);

    const currentPrice =
      typeof lot.current_price_amount === "number" && !isNaN(lot.current_price_amount)
        ? lot.current_price_amount
        : lot.starting_bid_amount;

    return {
      id: lot.id,
      title: lot.title,
      category_id: lot.category_id,
      category_name: category ? category.name : "",
      breed: lot.breed || "",
      sex: lot.sex || "",
      head_count: lot.head_count,
      average_weight_lbs: lot.average_weight_lbs || null,
      price_unit: lot.price_unit,
      starting_bid_amount: lot.starting_bid_amount,
      current_price_amount: currentPrice,
      reserve_met: !!lot.reserve_met,
      location_city: lot.location_city,
      location_state: lot.location_state,
      auction_format: lot.auction_format,
      status: lot.status,
      closing_datetime: lot.closing_datetime,
      seller_display_name: lot.seller_display_name || "",
      seller_ranch_name: lot.seller_ranch_name || "",
      is_watchlisted: isWatchlisted
    };
  }

  _applySavedSearchCriteriaToQuery(savedSearch) {
    // Map SavedSearch record fields to searchAuctionLots positional arguments
    const keyword = savedSearch.keyword || undefined;
    const categoryId = savedSearch.category_id || undefined;
    const locationState = savedSearch.location_state || undefined;
    const locationCity = savedSearch.location_city || undefined;
    const locationZip = savedSearch.location_zip || undefined;
    const radiusMiles = savedSearch.radius_miles || undefined;
    const headCountMin = savedSearch.head_count_min || undefined;
    const headCountMax = savedSearch.head_count_max || undefined;
    const weightMinLbs = savedSearch.weight_min_lbs || undefined;
    const weightMaxLbs = savedSearch.weight_max_lbs || undefined;
    const priceUnit = savedSearch.price_unit || undefined;
    const priceMin = savedSearch.price_min || undefined;
    const priceMax = savedSearch.price_max || undefined;
    const closingDateFilterType = savedSearch.closing_date_filter_type || "none";
    const closingDateDaysFromNowMin =
      typeof savedSearch.closing_date_days_from_now_min === "number"
        ? savedSearch.closing_date_days_from_now_min
        : undefined;
    const closingDateDaysFromNowMax =
      typeof savedSearch.closing_date_days_from_now_max === "number"
        ? savedSearch.closing_date_days_from_now_max
        : undefined;
    const auctionFormat = undefined; // SavedSearch doesn't store this
    const status = undefined; // SavedSearch doesn't store this explicitly
    const sortOption = savedSearch.sort_option || "relevance";
    const page = 1;
    const pageSize = 20;

    return [
      keyword,
      categoryId,
      locationState,
      locationCity,
      locationZip,
      radiusMiles,
      headCountMin,
      headCountMax,
      weightMinLbs,
      weightMaxLbs,
      priceUnit,
      priceMin,
      priceMax,
      closingDateFilterType,
      closingDateDaysFromNowMin,
      closingDateDaysFromNowMax,
      auctionFormat,
      status,
      sortOption,
      page,
      pageSize
    ];
  }

  _getUserMaxBidForLot(lotId) {
    const bids = this._getFromStorage("bids", []);
    const userBids = bids.filter((b) => b.lot_id === lotId && b.is_user_bid && b.is_maximum_bid);
    if (userBids.length === 0) return null;
    return userBids.reduce((max, b) => (b.amount > max.amount ? b : max), userBids[0]);
  }

  _getHighestBidForLot(lotId) {
    const bids = this._getFromStorage("bids", []);
    const lotBids = bids.filter((b) => b.lot_id === lotId);
    if (lotBids.length === 0) return null;
    return lotBids.reduce((max, b) => (b.amount > max.amount ? b : max), lotBids[0]);
  }

  _getLotEffectivePrice(lot) {
    if (typeof lot.current_price_amount === "number" && !isNaN(lot.current_price_amount)) {
      return lot.current_price_amount;
    }
    return lot.starting_bid_amount;
  }

  // =========================
  // Interfaces
  // =========================

  // searchAuctionLots(keyword, categoryId, locationState, locationCity, locationZip, radiusMiles,
  //                   headCountMin, headCountMax, weightMinLbs, weightMaxLbs,
  //                   priceUnit, priceMin, priceMax,
  //                   closingDateFilterType, closingDateDaysFromNowMin, closingDateDaysFromNowMax,
  //                   auctionFormat, status, sortOption, page, pageSize)
  searchAuctionLots(
    keyword,
    categoryId,
    locationState,
    locationCity,
    locationZip,
    radiusMiles,
    headCountMin,
    headCountMax,
    weightMinLbs,
    weightMaxLbs,
    priceUnit,
    priceMin,
    priceMax,
    closingDateFilterType = "none",
    closingDateDaysFromNowMin,
    closingDateDaysFromNowMax,
    auctionFormat,
    status,
    sortOption = "relevance",
    page = 1,
    pageSize = 20
  ) {
    let lots = this._getFromStorage("auction_lots", []);

    // Keyword filter (title, description, breed, tags)
    if (keyword && typeof keyword === "string" && keyword.trim() !== "") {
      const kw = keyword.toLowerCase();
      lots = lots.filter((lot) => {
        const inTitle = (lot.title || "").toLowerCase().includes(kw);
        const inDesc = (lot.description || "").toLowerCase().includes(kw);
        const inBreed = (lot.breed || "").toLowerCase().includes(kw);
        const tags = Array.isArray(lot.tags) ? lot.tags : [];
        const inTags = tags.some((t) => (t || "").toLowerCase().includes(kw));
        return inTitle || inDesc || inBreed || inTags;
      });
    }

    // Category filter
    if (categoryId) {
      lots = lots.filter((lot) => lot.category_id === categoryId);
    }

    // Location filters
    if (locationState) {
      lots = lots.filter((lot) => lot.location_state === locationState);
    }
    if (locationCity) {
      lots = lots.filter((lot) => lot.location_city === locationCity);
    }
    if (locationZip) {
      lots = lots.filter((lot) => lot.location_zip === locationZip);
    }
    // radiusMiles is ignored for now due to lack of geocoding data

    // Head count filters
    if (typeof headCountMin === "number") {
      lots = lots.filter((lot) => typeof lot.head_count === "number" && lot.head_count >= headCountMin);
    }
    if (typeof headCountMax === "number") {
      lots = lots.filter((lot) => typeof lot.head_count === "number" && lot.head_count <= headCountMax);
    }

    // Weight filters – use average_weight_lbs primarily, fallback to min/max
    if (typeof weightMinLbs === "number" || typeof weightMaxLbs === "number") {
      lots = lots.filter((lot) => {
        const avg = lot.average_weight_lbs;
        const minW = lot.weight_min_lbs;
        const maxW = lot.weight_max_lbs;

        const value = typeof avg === "number" ? avg : typeof minW === "number" ? minW : maxW;
        if (typeof value !== "number") return false;

        if (typeof weightMinLbs === "number" && value < weightMinLbs) return false;
        if (typeof weightMaxLbs === "number" && value > weightMaxLbs) return false;
        return true;
      });
    }

    // PriceUnit filter
    if (priceUnit) {
      lots = lots.filter((lot) => lot.price_unit === priceUnit);
    }

    // Price filters
    if (typeof priceMin === "number" || typeof priceMax === "number") {
      lots = lots.filter((lot) => {
        const price = this._getLotEffectivePrice(lot);
        if (typeof price !== "number" || isNaN(price)) return false;
        if (typeof priceMin === "number" && price < priceMin) return false;
        if (typeof priceMax === "number" && price > priceMax) return false;
        return true;
      });
    }

    // Closing date filters
    if (closingDateFilterType && closingDateFilterType !== "none") {
      const now = new Date();
      const minDays = typeof closingDateDaysFromNowMin === "number" ? closingDateDaysFromNowMin : 0;
      const maxDays = typeof closingDateDaysFromNowMax === "number" ? closingDateDaysFromNowMax : Infinity;

      lots = lots.filter((lot) => {
        const closing = this._parseIso(lot.closing_datetime);
        if (!closing) return false;
        const diffMs = closing.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= minDays && diffDays <= maxDays;
      });
    }

    // Auction format filter
    if (auctionFormat) {
      lots = lots.filter((lot) => lot.auction_format === auctionFormat);
    }

    // Status filter – if provided
    if (status) {
      lots = lots.filter((lot) => lot.status === status);
    }

    // Sorting
    const sortByPrice = (ascending, expectedUnit) => {
      lots.sort((a, b) => {
        // Only meaningfully compare when units match expectedUnit (if provided)
        const priceA = this._getLotEffectivePrice(a);
        const priceB = this._getLotEffectivePrice(b);
        const unitA = a.price_unit;
        const unitB = b.price_unit;

        if (expectedUnit) {
          const aOk = unitA === expectedUnit;
          const bOk = unitB === expectedUnit;
          if (aOk && !bOk) return -1;
          if (!aOk && bOk) return 1;
        }

        if (typeof priceA !== "number") return 1;
        if (typeof priceB !== "number") return -1;
        return ascending ? priceA - priceB : priceB - priceA;
      });
    };

    const sortByClosing = (ascending) => {
      lots.sort((a, b) => {
        const da = this._parseIso(a.closing_datetime) || new Date(8640000000000000); // far future
        const db = this._parseIso(b.closing_datetime) || new Date(8640000000000000);
        return ascending ? da - db : db - da;
      });
    };

    const sortByHeadCount = (ascending) => {
      lots.sort((a, b) => {
        const ha = typeof a.head_count === "number" ? a.head_count : 0;
        const hb = typeof b.head_count === "number" ? b.head_count : 0;
        return ascending ? ha - hb : hb - ha;
      });
    };

    const sortByDistance = () => {
      // Without geocoding/origin, approximate by state then city name
      lots.sort((a, b) => {
        const sa = (a.location_state || "").localeCompare(b.location_state || "");
        if (sa !== 0) return sa;
        return (a.location_city || "").localeCompare(b.location_city || "");
      });
    };

    switch (sortOption) {
      case "price_per_head_low_to_high":
        sortByPrice(true, "per_head");
        break;
      case "price_per_head_high_to_low":
        sortByPrice(false, "per_head");
        break;
      case "price_per_pound_low_to_high":
        sortByPrice(true, "per_pound");
        break;
      case "price_per_pound_high_to_low":
        sortByPrice(false, "per_pound");
        break;
      case "price_per_pair_low_to_high":
        sortByPrice(true, "per_pair");
        break;
      case "price_per_pair_high_to_low":
        sortByPrice(false, "per_pair");
        break;
      case "head_count_high_to_low":
        sortByHeadCount(false);
        break;
      case "head_count_low_to_high":
        sortByHeadCount(true);
        break;
      case "distance_nearest_first":
        sortByDistance();
        break;
      case "closing_soonest":
        sortByClosing(true);
        break;
      case "closing_latest":
        sortByClosing(false);
        break;
      case "relevance":
      default:
        // No-op relevance (already filtered)
        break;
    }

    const totalCount = lots.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageLots = lots.slice(start, end).map((lot) => this._buildLotSummaryFromAuctionLot(lot));

    return {
      results: pageLots,
      totalCount,
      page: p,
      pageSize: ps,
      sortOption,
      appliedFilters: {
        keyword,
        categoryId,
        locationState,
        locationCity,
        locationZip,
        radiusMiles,
        headCountMin,
        headCountMax,
        weightMinLbs,
        weightMaxLbs,
        priceUnit,
        priceMin,
        priceMax,
        closingDateFilterType,
        closingDateDaysFromNowMin,
        closingDateDaysFromNowMax,
        auctionFormat,
        status
      }
    };
  }

  // getAuctionFilterOptions()
  getAuctionFilterOptions() {
    const categories = this._getFromStorage("categories", []);

    const states = [
      { code: "OK", name: "Oklahoma" },
      { code: "TX", name: "Texas" },
      { code: "KS", name: "Kansas" },
      { code: "NE", name: "Nebraska" }
    ];

    const breeds = [
      { name: "Angus" },
      { name: "Hereford" },
      { name: "Brangus" },
      { name: "Charolais" },
      { name: "Other" }
    ];

    const priceUnits = [
      { id: "per_head", label: "Per head" },
      { id: "per_pound", label: "Per pound" },
      { id: "per_pair", label: "Per pair" }
    ];

    const closingDatePresets = [
      {
        id: "ending_in_next_3_days",
        label: "Ending in the next 3 days",
        closingDateFilterType: "ending_within_days",
        daysFromNowMin: 0,
        daysFromNowMax: 3
      },
      {
        id: "ending_within_7_days",
        label: "Ending within 7 days",
        closingDateFilterType: "ending_within_days",
        daysFromNowMin: 0,
        daysFromNowMax: 7
      },
      {
        id: "ending_between_14_and_21_days",
        label: "Ending in 14-21 days",
        closingDateFilterType: "date_range",
        daysFromNowMin: 14,
        daysFromNowMax: 21
      }
    ];

    const weightRangeDefaults = {
      min: 300,
      max: 1600,
      step: 50
    };

    const headCountRangeDefaults = {
      min: 1,
      max: 500,
      step: 1
    };

    return {
      categories,
      states,
      breeds,
      priceUnits,
      closingDatePresets,
      weightRangeDefaults,
      headCountRangeDefaults
    };
  }

  // getAuctionSortOptions()
  getAuctionSortOptions() {
    return [
      { id: "relevance", label: "Relevance" },
      { id: "price_per_head_low_to_high", label: "Price per head: Low to High" },
      { id: "price_per_head_high_to_low", label: "Price per head: High to Low" },
      { id: "price_per_pound_low_to_high", label: "Price per pound: Low to High" },
      { id: "price_per_pound_high_to_low", label: "Price per pound: High to Low" },
      { id: "price_per_pair_low_to_high", label: "Price per pair: Low to High" },
      { id: "price_per_pair_high_to_low", label: "Price per pair: High to Low" },
      { id: "head_count_high_to_low", label: "Head count: High to Low" },
      { id: "head_count_low_to_high", label: "Head count: Low to High" },
      { id: "distance_nearest_first", label: "Distance: Nearest first" },
      { id: "closing_soonest", label: "Closing soonest" },
      { id: "closing_latest", label: "Closing latest" }
    ];
  }

  // getAuctionCategories()
  getAuctionCategories() {
    return this._getFromStorage("categories", []);
  }

  // getLotDetails(lotId)
  getLotDetails(lotId) {
    const lots = this._getFromStorage("auction_lots", []);
    const lot = lots.find((l) => l.id === lotId) || null;
    if (!lot) {
      return {
        lot: null,
        is_watchlisted: false,
        user_max_bid_amount: null,
        user_is_high_bidder: false
      };
    }

    const categories = this._getFromStorage("categories", []);
    const category = categories.find((c) => c.id === lot.category_id) || null;

    const watchlist = this._getOrCreateWatchlistStorage();
    const isWatchlisted = watchlist.some((w) => w.lot_id === lot.id);

    const userMaxBid = this._getUserMaxBidForLot(lot.id);
    const highestBid = this._getHighestBidForLot(lot.id);

    const userIsHighBidder =
      !!userMaxBid && (!highestBid || userMaxBid.amount >= highestBid.amount);

    const fullLot = {
      id: lot.id,
      title: lot.title,
      description: lot.description || "",
      category_id: lot.category_id,
      category_name: category ? category.name : "",
      breed: lot.breed || "",
      sex: lot.sex || "",
      head_count: lot.head_count,
      weight_min_lbs: lot.weight_min_lbs || null,
      weight_max_lbs: lot.weight_max_lbs || null,
      average_weight_lbs: lot.average_weight_lbs || null,
      age_years: lot.age_years || null,
      location_state: lot.location_state,
      location_city: lot.location_city,
      location_zip: lot.location_zip || "",
      auction_format: lot.auction_format,
      status: lot.status,
      price_unit: lot.price_unit,
      starting_bid_amount: lot.starting_bid_amount,
      reserve_price_amount: lot.reserve_price_amount || null,
      current_price_amount: lot.current_price_amount || null,
      reserve_met: !!lot.reserve_met,
      opening_datetime: lot.opening_datetime || null,
      closing_datetime: lot.closing_datetime,
      created_at: lot.created_at || null,
      updated_at: lot.updated_at || null,
      seller_display_name: lot.seller_display_name || "",
      seller_ranch_name: lot.seller_ranch_name || "",
      photos: Array.isArray(lot.photos) ? lot.photos : [],
      tags: Array.isArray(lot.tags) ? lot.tags : [],
      is_own_listing: !!lot.is_own_listing
    };

    return {
      lot: fullLot,
      is_watchlisted: isWatchlisted,
      user_max_bid_amount: userMaxBid ? userMaxBid.amount : null,
      user_is_high_bidder: userIsHighBidder
    };
  }

  // addLotToWatchlist(lotId)
  addLotToWatchlist(lotId) {
    const lots = this._getFromStorage("auction_lots", []);
    const lotExists = lots.some((l) => l.id === lotId);
    if (!lotExists) {
      return { success: false, message: "Lot not found", watchlistItem: null };
    }

    let watchlist = this._getOrCreateWatchlistStorage();
    const existing = watchlist.find((w) => w.lot_id === lotId);
    if (existing) {
      return {
        success: true,
        message: "Already in watchlist",
        watchlistItem: existing
      };
    }

    const item = {
      id: this._generateId("watch"),
      lot_id: lotId,
      added_at: this._nowIso()
    };
    watchlist.push(item);
    this._saveToStorage("watchlist_items", watchlist);

    return {
      success: true,
      message: "Added to watchlist",
      watchlistItem: item
    };
  }

  // removeLotFromWatchlist(lotId)
  removeLotFromWatchlist(lotId) {
    let watchlist = this._getOrCreateWatchlistStorage();
    const before = watchlist.length;
    watchlist = watchlist.filter((w) => w.lot_id !== lotId);
    this._saveToStorage("watchlist_items", watchlist);
    const after = watchlist.length;

    if (after === before) {
      return { success: false, message: "Lot not in watchlist" };
    }
    return { success: true, message: "Removed from watchlist" };
  }

  // getWatchlistItems(sortOption, categoryId, priceMax, closingDateFilterType, closingDateDaysFromNowMin, closingDateDaysFromNowMax)
  getWatchlistItems(
    sortOption = "closing_soonest",
    categoryId,
    priceMax,
    closingDateFilterType = "none",
    closingDateDaysFromNowMin,
    closingDateDaysFromNowMax
  ) {
    let watchlist = this._getOrCreateWatchlistStorage();
    const lots = this._getFromStorage("auction_lots", []);
    const categories = this._getFromStorage("categories", []);

    let items = watchlist
      .map((w) => {
        const lot = lots.find((l) => l.id === w.lot_id) || null;
        if (!lot) return null;
        const category = categories.find((c) => c.id === lot.category_id) || null;
        return {
          watchlist_id: w.id,
          added_at: w.added_at,
          lot: {
            id: lot.id,
            title: lot.title,
            category_id: lot.category_id,
            category_name: category ? category.name : "",
            breed: lot.breed || "",
            head_count: lot.head_count,
            price_unit: lot.price_unit,
            current_price_amount: this._getLotEffectivePrice(lot),
            location_city: lot.location_city,
            location_state: lot.location_state,
            closing_datetime: lot.closing_datetime,
            auction_format: lot.auction_format,
            status: lot.status
          }
        };
      })
      .filter((i) => i !== null);

    // Category filter
    if (categoryId) {
      items = items.filter((i) => i.lot.category_id === categoryId);
    }

    // Price filter
    if (typeof priceMax === "number") {
      items = items.filter((i) => {
        const price = i.lot.current_price_amount;
        return typeof price === "number" && price <= priceMax;
      });
    }

    // Closing date filter
    if (closingDateFilterType && closingDateFilterType !== "none") {
      const now = new Date();
      const minDays = typeof closingDateDaysFromNowMin === "number" ? closingDateDaysFromNowMin : 0;
      const maxDays = typeof closingDateDaysFromNowMax === "number" ? closingDateDaysFromNowMax : Infinity;

      items = items.filter((i) => {
        const closing = this._parseIso(i.lot.closing_datetime);
        if (!closing) return false;
        const diffMs = closing.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= minDays && diffDays <= maxDays;
      });
    }

    // Sorting
    switch (sortOption) {
      case "closing_soonest":
        items.sort((a, b) => {
          const da = this._parseIso(a.lot.closing_datetime) || new Date(8640000000000000);
          const db = this._parseIso(b.lot.closing_datetime) || new Date(8640000000000000);
          return da - db;
        });
        break;
      case "closing_latest":
        items.sort((a, b) => {
          const da = this._parseIso(a.lot.closing_datetime) || new Date(0);
          const db = this._parseIso(b.lot.closing_datetime) || new Date(0);
          return db - da;
        });
        break;
      case "price_low_to_high":
        items.sort((a, b) => {
          const pa = a.lot.current_price_amount;
          const pb = b.lot.current_price_amount;
          if (typeof pa !== "number") return 1;
          if (typeof pb !== "number") return -1;
          return pa - pb;
        });
        break;
      case "price_high_to_low":
        items.sort((a, b) => {
          const pa = a.lot.current_price_amount;
          const pb = b.lot.current_price_amount;
          if (typeof pa !== "number") return 1;
          if (typeof pb !== "number") return -1;
          return pb - pa;
        });
        break;
      case "added_most_recent":
        items.sort((a, b) => {
          const da = this._parseIso(a.added_at) || new Date(0);
          const db = this._parseIso(b.added_at) || new Date(0);
          return db - da;
        });
        break;
      case "added_oldest":
        items.sort((a, b) => {
          const da = this._parseIso(a.added_at) || new Date(0);
          const db = this._parseIso(b.added_at) || new Date(0);
          return da - db;
        });
        break;
      default:
        break;
    }

    return {
      items,
      totalCount: items.length
    };
  }

  // placeMaximumBidOnLot(lotId, amount)
  placeMaximumBidOnLot(lotId, amount) {
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return { success: false, message: "Invalid bid amount", userBid: null, lot: null };
    }

    const lots = this._getFromStorage("auction_lots", []);
    const lotIndex = lots.findIndex((l) => l.id === lotId);
    if (lotIndex === -1) {
      return { success: false, message: "Lot not found", userBid: null, lot: null };
    }

    const lot = lots[lotIndex];
    let bids = this._getFromStorage("bids", []);

    // Check if user already has a maximum bid for this lot
    const existingIndex = bids.findIndex(
      (b) => b.lot_id === lotId && b.is_user_bid && b.is_maximum_bid
    );

    let userBid;
    if (existingIndex !== -1) {
      bids[existingIndex].amount = amount;
      bids[existingIndex].created_at = this._nowIso();
      userBid = bids[existingIndex];
    } else {
      userBid = {
        id: this._generateId("bid"),
        lot_id: lotId,
        amount,
        price_unit: lot.price_unit,
        is_maximum_bid: true,
        is_user_bid: true,
        source: "manual",
        created_at: this._nowIso()
      };
      bids.push(userBid);
    }

    // Update lot current price as highest bid
    const lotBids = bids.filter((b) => b.lot_id === lotId);
    if (lotBids.length > 0) {
      const highest = lotBids.reduce((max, b) => (b.amount > max.amount ? b : max), lotBids[0]);
      lot.current_price_amount = highest.amount;
    } else {
      lot.current_price_amount = lot.starting_bid_amount;
    }

    if (typeof lot.reserve_price_amount === "number") {
      lot.reserve_met = lot.current_price_amount >= lot.reserve_price_amount;
    } else {
      lot.reserve_met = true;
    }

    lots[lotIndex] = lot;
    this._saveToStorage("auction_lots", lots);
    this._saveToStorage("bids", bids);

    const responseLot = {
      id: lot.id,
      current_price_amount: lot.current_price_amount,
      reserve_met: !!lot.reserve_met,
      status: lot.status,
      closing_datetime: lot.closing_datetime
    };

    return {
      success: true,
      message: "Maximum bid placed",
      userBid,
      lot: responseLot
    };
  }

  // signIn(email, password)
  signIn(email, password) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required", profile: null };
    }

    let users = this._getFromStorage("auth_users", []);
    const profiles = this._getFromStorage("profile_settings", []);

    let user = users.find((u) => u.email === email && u.password === password) || null;
    let profile = null;

    if (!user) {
      // Fallback for environments where auth_users have not been explicitly seeded.
      // Match directly against profile_settings by email and accept the provided password.
      profile = profiles.find((p) => p.email === email) || null;
      if (!profile) {
        return { success: false, message: "Invalid email or password", profile: null };
      }
      // Create a corresponding auth_user record for future sign-ins.
      user = {
        id: this._generateId("user"),
        profile_id: profile.id,
        email,
        password
      };
      users.push(user);
      this._saveToStorage("auth_users", users);
    } else {
      profile = profiles.find((p) => p.id === user.profile_id) || null;
      if (!profile) {
        return { success: false, message: "Profile not found", profile: null };
      }
    }

    this._saveToStorage("current_profile_id", profile.id);

    return {
      success: true,
      message: "Signed in",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        ranch_name: profile.ranch_name,
        email: profile.email,
        location_state: profile.location_state,
        location_city: profile.location_city,
        account_type: profile.account_type,
        preferred_contact_method: profile.preferred_contact_method,
        show_buying_interests_on_profile: profile.show_buying_interests_on_profile
      }
    };
  }

  // registerBuyerAccount(fullName, ranchName, email, password, locationState, locationCity, primaryLivestockInterests, preferredContactMethod)
  registerBuyerAccount(
    fullName,
    ranchName,
    email,
    password,
    locationState,
    locationCity,
    primaryLivestockInterests,
    preferredContactMethod
  ) {
    if (!fullName || !ranchName || !email || !password || !locationState || !locationCity) {
      return { success: false, message: "Missing required fields", profile: null, selectedLivestockInterests: [] };
    }

    let users = this._getFromStorage("auth_users", []);
    if (users.some((u) => u.email === email)) {
      return { success: false, message: "Email already registered", profile: null, selectedLivestockInterests: [] };
    }

    let profiles = this._getFromStorage("profile_settings", []);

    const profile = {
      id: this._generateId("profile"),
      full_name: fullName,
      ranch_name: ranchName,
      email,
      location_state: locationState,
      location_city: locationCity,
      account_type: "buyer",
      preferred_contact_method: preferredContactMethod,
      show_buying_interests_on_profile: false,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    profiles.push(profile);
    this._saveToStorage("profile_settings", profiles);

    const user = {
      id: this._generateId("user"),
      profile_id: profile.id,
      email,
      password // Stored as plain text for this simplified implementation
    };
    users.push(user);
    this._saveToStorage("auth_users", users);

    // Livestock interests
    let interests = this._getFromStorage("livestock_interest_selections", []);
    const selectedSet = new Set(primaryLivestockInterests || []);
    // Remove any existing interests for this profile
    interests = interests.filter((i) => i.profile_id !== profile.id);

    selectedSet.forEach((interestType) => {
      interests.push({
        id: this._generateId("interest"),
        profile_id: profile.id,
        interest_type: interestType,
        is_selected: true
      });
    });

    this._saveToStorage("livestock_interest_selections", interests);

    this._saveToStorage("current_profile_id", profile.id);

    return {
      success: true,
      message: "Account created",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        ranch_name: profile.ranch_name,
        email: profile.email,
        location_state: profile.location_state,
        location_city: profile.location_city,
        account_type: profile.account_type,
        preferred_contact_method: profile.preferred_contact_method,
        show_buying_interests_on_profile: profile.show_buying_interests_on_profile
      },
      selectedLivestockInterests: Array.from(selectedSet)
    };
  }

  // getProfileSettings()
  getProfileSettings() {
    const { profile, selectedLivestockInterests } = this._getCurrentProfileSettings();
    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        ranch_name: profile.ranch_name,
        email: profile.email,
        location_state: profile.location_state,
        location_city: profile.location_city,
        account_type: profile.account_type,
        preferred_contact_method: profile.preferred_contact_method,
        show_buying_interests_on_profile: profile.show_buying_interests_on_profile,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      selectedLivestockInterests
    };
  }

  // updateProfileSettings(profilePartial, livestockInterests)
  updateProfileSettings(profilePartial, livestockInterests) {
    const current = this._getCurrentProfileSettings();
    let profile = current.profile;
    let profiles = this._getFromStorage("profile_settings", []);

    const updatableFields = [
      "full_name",
      "ranch_name",
      "location_state",
      "location_city",
      "preferred_contact_method",
      "show_buying_interests_on_profile"
    ];

    updatableFields.forEach((field) => {
      if (profilePartial && Object.prototype.hasOwnProperty.call(profilePartial, field)) {
        profile[field] = profilePartial[field];
      }
    });
    profile.updated_at = this._nowIso();

    profiles = profiles.map((p) => (p.id === profile.id ? profile : p));
    this._saveToStorage("profile_settings", profiles);

    let selectedLivestockInterests = current.selectedLivestockInterests;

    if (Array.isArray(livestockInterests)) {
      let interests = this._getFromStorage("livestock_interest_selections", []);
      const set = new Set(livestockInterests);
      // Remove old for this profile
      interests = interests.filter((i) => i.profile_id !== profile.id);
      // Add new selections
      set.forEach((interestType) => {
        interests.push({
          id: this._generateId("interest"),
          profile_id: profile.id,
          interest_type: interestType,
          is_selected: true
        });
      });
      this._saveToStorage("livestock_interest_selections", interests);
      selectedLivestockInterests = Array.from(set);
    }

    return {
      success: true,
      message: "Profile updated",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        ranch_name: profile.ranch_name,
        email: profile.email,
        location_state: profile.location_state,
        location_city: profile.location_city,
        account_type: profile.account_type,
        preferred_contact_method: profile.preferred_contact_method,
        show_buying_interests_on_profile: profile.show_buying_interests_on_profile,
        updated_at: profile.updated_at
      },
      selectedLivestockInterests
    };
  }

  // getLivestockInterestOptions()
  getLivestockInterestOptions() {
    return [
      { id: "feeder_cattle", label: "Feeder cattle" },
      { id: "bred_heifers", label: "Bred heifers" },
      { id: "stocker_calves", label: "Stocker calves" },
      { id: "bred_cows", label: "Bred cows" },
      { id: "cow_calf_pairs", label: "Cow-calf pairs" },
      { id: "bulls", label: "Bulls" },
      { id: "other", label: "Other" }
    ];
  }

  // getCreateListingFormOptions()
  getCreateListingFormOptions() {
    const categories = this._getFromStorage("categories", []);
    const states = [
      { code: "OK", name: "Oklahoma" },
      { code: "TX", name: "Texas" },
      { code: "KS", name: "Kansas" },
      { code: "NE", name: "Nebraska" }
    ];

    const priceUnits = [
      { id: "per_head", label: "Per head" },
      { id: "per_pound", label: "Per pound" },
      { id: "per_pair", label: "Per pair" }
    ];

    const defaultAuctionFormat = "online_timed";
    const defaultClosingTimeLocal = "17:00"; // 5:00 PM

    return {
      categories,
      states,
      priceUnits,
      defaultAuctionFormat,
      defaultClosingTimeLocal
    };
  }

  // createAuctionListing(title, categoryId, breed, headCount, locationState, locationCity, auctionFormat, priceUnit, startingBidAmount, reservePriceAmount, closingDate, closingTime, description)
  createAuctionListing(
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
  ) {
    if (!title || !categoryId || !headCount || !locationState || !locationCity || !priceUnit || !startingBidAmount || !closingDate || !closingTime) {
      return { success: false, message: "Missing required fields", lotId: null, lot: null };
    }

    const { profile } = this._getCurrentProfileSettings();

    let lots = this._getFromStorage("auction_lots", []);

    const closingDt = this._combineDateTime(closingDate, closingTime);
    const closingIso = closingDt ? closingDt.toISOString() : null;

    const lot = {
      id: this._generateId("lot"),
      title,
      description: description || "",
      category_id: categoryId,
      breed: breed || "",
      sex: null,
      head_count: headCount,
      weight_min_lbs: null,
      weight_max_lbs: null,
      average_weight_lbs: null,
      age_years: null,
      location_state: locationState,
      location_city: locationCity,
      location_zip: "",
      latitude: null,
      longitude: null,
      auction_format: auctionFormat || "online_timed",
      status: "scheduled",
      is_own_listing: true,
      price_unit: priceUnit,
      starting_bid_amount: startingBidAmount,
      reserve_price_amount: typeof reservePriceAmount === "number" ? reservePriceAmount : null,
      current_price_amount: startingBidAmount,
      reserve_met:
        typeof reservePriceAmount === "number" ? startingBidAmount >= reservePriceAmount : true,
      opening_datetime: null,
      closing_datetime: closingIso,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      seller_display_name: profile.full_name || "",
      seller_ranch_name: profile.ranch_name || "",
      photos: [],
      tags: []
    };

    lots.push(lot);
    this._saveToStorage("auction_lots", lots);

    const categories = this._getFromStorage("categories", []);
    const category = categories.find((c) => c.id === lot.category_id) || null;

    return {
      success: true,
      message: "Listing created",
      lotId: lot.id,
      lot: {
        id: lot.id,
        title: lot.title,
        category_id: lot.category_id,
        breed: lot.breed,
        head_count: lot.head_count,
        location_state: lot.location_state,
        location_city: lot.location_city,
        auction_format: lot.auction_format,
        status: lot.status,
        price_unit: lot.price_unit,
        starting_bid_amount: lot.starting_bid_amount,
        reserve_price_amount: lot.reserve_price_amount,
        closing_datetime: lot.closing_datetime,
        category_name: category ? category.name : ""
      }
    };
  }

  // getMyListings(statusFilter, sortOption)
  getMyListings(statusFilter = "all", sortOption = "closing_soonest") {
    const { profile } = this._getCurrentProfileSettings();
    const lots = this._getFromStorage("auction_lots", []);
    const categories = this._getFromStorage("categories", []);
    const bids = this._getFromStorage("bids", []);

    let ownLots = lots.filter((l) => l.is_own_listing);

    if (statusFilter && statusFilter !== "all") {
      ownLots = ownLots.filter((l) => l.status === statusFilter);
    }

    // Sorting
    switch (sortOption) {
      case "closing_soonest":
        ownLots.sort((a, b) => {
          const da = this._parseIso(a.closing_datetime) || new Date(8640000000000000);
          const db = this._parseIso(b.closing_datetime) || new Date(8640000000000000);
          return da - db;
        });
        break;
      case "closing_latest":
        ownLots.sort((a, b) => {
          const da = this._parseIso(a.closing_datetime) || new Date(0);
          const db = this._parseIso(b.closing_datetime) || new Date(0);
          return db - da;
        });
        break;
      case "created_newest":
        ownLots.sort((a, b) => {
          const da = this._parseIso(a.created_at) || new Date(0);
          const db = this._parseIso(b.created_at) || new Date(0);
          return db - da;
        });
        break;
      case "created_oldest":
        ownLots.sort((a, b) => {
          const da = this._parseIso(a.created_at) || new Date(0);
          const db = this._parseIso(b.created_at) || new Date(0);
          return da - db;
        });
        break;
      default:
        break;
    }

    const items = ownLots.map((lot) => {
      const category = categories.find((c) => c.id === lot.category_id) || null;
      const lotBids = bids.filter((b) => b.lot_id === lot.id);
      return {
        id: lot.id,
        title: lot.title,
        category_id: lot.category_id,
        category_name: category ? category.name : "",
        status: lot.status,
        head_count: lot.head_count,
        current_price_amount: this._getLotEffectivePrice(lot),
        price_unit: lot.price_unit,
        closing_datetime: lot.closing_datetime,
        bid_count: lotBids.length
      };
    });

    const totalsByStatus = {
      draft: 0,
      scheduled: 0,
      live: 0,
      closed: 0,
      canceled: 0
    };
    ownLots.forEach((lot) => {
      if (totalsByStatus.hasOwnProperty(lot.status)) {
        totalsByStatus[lot.status] += 1;
      }
    });

    return {
      items,
      totalsByStatus
    };
  }

  // getListingForEdit(lotId)
  getListingForEdit(lotId) {
    const lots = this._getFromStorage("auction_lots", []);
    const lot = lots.find((l) => l.id === lotId && l.is_own_listing) || null;

    if (!lot) {
      return {
        lot: null,
        editPermissions: {
          can_edit_title: false,
          can_edit_head_count: false,
          can_edit_pricing: false,
          can_edit_closing_datetime: false,
          can_edit_description: false
        }
      };
    }

    let canEditTitle = false;
    let canEditHeadCount = false;
    let canEditPricing = false;
    let canEditClosing = false;
    let canEditDescription = true;

    if (lot.status === "draft" || lot.status === "scheduled") {
      canEditTitle = true;
      canEditHeadCount = true;
      canEditPricing = true;
      canEditClosing = true;
    } else if (lot.status === "live") {
      // Restrict to description only
      canEditDescription = true;
    } else {
      // closed or canceled – description only, if desired
      canEditDescription = true;
    }

    const editableLot = {
      id: lot.id,
      title: lot.title,
      category_id: lot.category_id,
      breed: lot.breed,
      head_count: lot.head_count,
      location_state: lot.location_state,
      location_city: lot.location_city,
      auction_format: lot.auction_format,
      status: lot.status,
      price_unit: lot.price_unit,
      starting_bid_amount: lot.starting_bid_amount,
      reserve_price_amount: lot.reserve_price_amount,
      closing_datetime: lot.closing_datetime,
      description: lot.description || ""
    };

    return {
      lot: editableLot,
      editPermissions: {
        can_edit_title: canEditTitle,
        can_edit_head_count: canEditHeadCount,
        can_edit_pricing: canEditPricing,
        can_edit_closing_datetime: canEditClosing,
        can_edit_description: canEditDescription
      }
    };
  }

  // updateAuctionListing(lotId, updates)
  updateAuctionListing(lotId, updates) {
    let lots = this._getFromStorage("auction_lots", []);
    const index = lots.findIndex((l) => l.id === lotId && l.is_own_listing);
    if (index === -1) {
      return { success: false, message: "Listing not found", lot: null };
    }

    const lot = lots[index];

    const { editPermissions } = this.getListingForEdit(lotId);

    const applyIfAllowed = (field, permissionKey) => {
      if (
        Object.prototype.hasOwnProperty.call(updates, field) &&
        (!permissionKey || editPermissions[permissionKey])
      ) {
        lot[field === "categoryId" ? "category_id" : field] = updates[field];
      }
    };

    applyIfAllowed("title", "can_edit_title");
    applyIfAllowed("head_count", "can_edit_head_count");
    applyIfAllowed("breed", "can_edit_head_count"); // breed not restricted by head count, but okay

    if (Object.prototype.hasOwnProperty.call(updates, "categoryId") && editPermissions.can_edit_title) {
      lot.category_id = updates.categoryId;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "location_state") && editPermissions.can_edit_title) {
      lot.location_state = updates.location_state;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "location_city") && editPermissions.can_edit_title) {
      lot.location_city = updates.location_city;
    }

    if (editPermissions.can_edit_pricing) {
      if (Object.prototype.hasOwnProperty.call(updates, "price_unit")) {
        lot.price_unit = updates.price_unit;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "starting_bid_amount")) {
        lot.starting_bid_amount = updates.starting_bid_amount;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "reserve_price_amount")) {
        lot.reserve_price_amount = updates.reserve_price_amount;
      }
    }

    if (editPermissions.can_edit_closing_datetime) {
      let closingDateStr = null;
      let closingTimeStr = null;
      if (Object.prototype.hasOwnProperty.call(updates, "closing_date")) {
        closingDateStr = updates.closing_date;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "closing_time")) {
        closingTimeStr = updates.closing_time;
      }

      if (closingDateStr || closingTimeStr) {
        const currentClosing = this._parseIso(lot.closing_datetime);
        let datePart = closingDateStr;
        let timePart = closingTimeStr;
        if (!datePart && currentClosing) {
          datePart = currentClosing.toISOString().slice(0, 10);
        }
        if (!timePart && currentClosing) {
          timePart = currentClosing.toISOString().slice(11, 16);
        }
        const combined = this._combineDateTime(datePart, timePart);
        lot.closing_datetime = combined ? combined.toISOString() : lot.closing_datetime;
      }
    }

    if (editPermissions.can_edit_description) {
      if (Object.prototype.hasOwnProperty.call(updates, "description")) {
        lot.description = updates.description;
      }
    }

    lot.updated_at = this._nowIso();

    // Re-evaluate current_price_amount and reserve_met if needed
    if (editPermissions.can_edit_pricing) {
      if (typeof lot.current_price_amount !== "number" || lot.current_price_amount < lot.starting_bid_amount) {
        lot.current_price_amount = lot.starting_bid_amount;
      }
      if (typeof lot.reserve_price_amount === "number") {
        lot.reserve_met = lot.current_price_amount >= lot.reserve_price_amount;
      } else {
        lot.reserve_met = true;
      }
    }

    lots[index] = lot;
    this._saveToStorage("auction_lots", lots);

    return {
      success: true,
      message: "Listing updated",
      lot: {
        id: lot.id,
        title: lot.title,
        head_count: lot.head_count,
        price_unit: lot.price_unit,
        starting_bid_amount: lot.starting_bid_amount,
        reserve_price_amount: lot.reserve_price_amount,
        closing_datetime: lot.closing_datetime,
        description: lot.description,
        status: lot.status
      }
    };
  }

  // getSavedSearches()
  getSavedSearches() {
    const saved = this._getFromStorage("saved_searches", []);
    const categories = this._getFromStorage("categories", []);

    const items = saved.map((s) => {
      const category = categories.find((c) => c.id === s.category_id) || null;

      let summaryParts = [];
      if (s.keyword) summaryParts.push(`Keyword: ${s.keyword}`);
      if (s.location_state) summaryParts.push(`State: ${s.location_state}`);
      if (s.location_city) summaryParts.push(`City: ${s.location_city}`);
      if (s.location_zip) summaryParts.push(`ZIP: ${s.location_zip}`);
      if (typeof s.radius_miles === "number") summaryParts.push(`Radius: ${s.radius_miles} mi`);
      if (typeof s.price_max === "number") summaryParts.push(`Max price: ${s.price_max}`);
      if (s.closing_date_filter_type !== "none") {
        if (s.closing_date_filter_type === "ending_within_days") {
          summaryParts.push(`Ending within ${s.closing_date_days_from_now_max} days`);
        } else if (s.closing_date_filter_type === "date_range") {
          summaryParts.push(
            `Ending in ${s.closing_date_days_from_now_min}-${s.closing_date_days_from_now_max} days`
          );
        }
      }

      const criteria_summary = summaryParts.join(", ");

      return {
        id: s.id,
        name: s.name,
        keyword: s.keyword || "",
        category_id: s.category_id || null,
        category_name: category ? category.name : "",
        location_state: s.location_state || "",
        location_city: s.location_city || "",
        location_zip: s.location_zip || "",
        radius_miles: s.radius_miles || null,
        price_unit: s.price_unit || null,
        price_max: s.price_max || null,
        closing_date_filter_type: s.closing_date_filter_type,
        closing_date_days_from_now_min: s.closing_date_days_from_now_min,
        closing_date_days_from_now_max: s.closing_date_days_from_now_max,
        sort_option: s.sort_option,
        alerts_enabled: s.alerts_enabled,
        created_at: s.created_at,
        criteria_summary
      };
    });

    return { items };
  }

  // createSavedSearch(name, keyword, categoryId, locationState, locationCity, locationZip, radiusMiles,
  //                   headCountMin, headCountMax, weightMinLbs, weightMaxLbs,
  //                   priceUnit, priceMin, priceMax,
  //                   closingDateFilterType, closingDateDaysFromNowMin, closingDateDaysFromNowMax,
  //                   sortOption, alertsEnabled)
  createSavedSearch(
    name,
    keyword,
    categoryId,
    locationState,
    locationCity,
    locationZip,
    radiusMiles,
    headCountMin,
    headCountMax,
    weightMinLbs,
    weightMaxLbs,
    priceUnit,
    priceMin,
    priceMax,
    closingDateFilterType,
    closingDateDaysFromNowMin,
    closingDateDaysFromNowMax,
    sortOption,
    alertsEnabled
  ) {
    if (!name || !closingDateFilterType || !sortOption || typeof alertsEnabled !== "boolean") {
      return { success: false, message: "Missing required fields", savedSearch: null };
    }

    const saved = this._getFromStorage("saved_searches", []);

    const record = {
      id: this._generateId("saved_search"),
      name,
      keyword: keyword || "",
      category_id: categoryId || null,
      location_state: locationState || "",
      location_city: locationCity || "",
      location_zip: locationZip || "",
      radius_miles: typeof radiusMiles === "number" ? radiusMiles : null,
      head_count_min: typeof headCountMin === "number" ? headCountMin : null,
      head_count_max: typeof headCountMax === "number" ? headCountMax : null,
      weight_min_lbs: typeof weightMinLbs === "number" ? weightMinLbs : null,
      weight_max_lbs: typeof weightMaxLbs === "number" ? weightMaxLbs : null,
      price_unit: priceUnit || null,
      price_min: typeof priceMin === "number" ? priceMin : null,
      price_max: typeof priceMax === "number" ? priceMax : null,
      closing_date_filter_type: closingDateFilterType,
      closing_date_days_from_now_min:
        typeof closingDateDaysFromNowMin === "number" ? closingDateDaysFromNowMin : null,
      closing_date_days_from_now_max:
        typeof closingDateDaysFromNowMax === "number" ? closingDateDaysFromNowMax : null,
      sort_option: sortOption,
      alerts_enabled: alertsEnabled,
      created_at: this._nowIso()
    };

    saved.push(record);
    this._saveToStorage("saved_searches", saved);

    return {
      success: true,
      message: "Saved search created",
      savedSearch: {
        id: record.id,
        name: record.name,
        keyword: record.keyword,
        category_id: record.category_id,
        location_state: record.location_state,
        location_city: record.location_city,
        location_zip: record.location_zip,
        radius_miles: record.radius_miles,
        price_unit: record.price_unit,
        price_max: record.price_max,
        closing_date_filter_type: record.closing_date_filter_type,
        closing_date_days_from_now_min: record.closing_date_days_from_now_min,
        closing_date_days_from_now_max: record.closing_date_days_from_now_max,
        sort_option: record.sort_option,
        alerts_enabled: record.alerts_enabled,
        created_at: record.created_at
      }
    };
  }

  // renameSavedSearch(savedSearchId, newName)
  renameSavedSearch(savedSearchId, newName) {
    if (!savedSearchId || !newName) {
      return { success: false, message: "Missing parameters" };
    }

    const saved = this._getFromStorage("saved_searches", []);
    const index = saved.findIndex((s) => s.id === savedSearchId);
    if (index === -1) {
      return { success: false, message: "Saved search not found" };
    }

    saved[index].name = newName;
    this._saveToStorage("saved_searches", saved);
    return { success: true, message: "Saved search renamed" };
  }

  // updateSavedSearchAlerts(savedSearchId, alertsEnabled)
  updateSavedSearchAlerts(savedSearchId, alertsEnabled) {
    if (!savedSearchId || typeof alertsEnabled !== "boolean") {
      return { success: false, message: "Missing parameters" };
    }

    const saved = this._getFromStorage("saved_searches", []);
    const index = saved.findIndex((s) => s.id === savedSearchId);
    if (index === -1) {
      return { success: false, message: "Saved search not found" };
    }

    saved[index].alerts_enabled = alertsEnabled;
    this._saveToStorage("saved_searches", saved);
    return { success: true, message: "Alerts updated" };
  }

  // deleteSavedSearch(savedSearchId)
  deleteSavedSearch(savedSearchId) {
    if (!savedSearchId) {
      return { success: false, message: "Missing savedSearchId" };
    }

    let saved = this._getFromStorage("saved_searches", []);
    const before = saved.length;
    saved = saved.filter((s) => s.id !== savedSearchId);
    this._saveToStorage("saved_searches", saved);

    if (saved.length === before) {
      return { success: false, message: "Saved search not found" };
    }
    return { success: true, message: "Saved search deleted" };
  }

  // runSavedSearch(savedSearchId, page, pageSize)
  runSavedSearch(savedSearchId, page = 1, pageSize = 20) {
    const saved = this._getFromStorage("saved_searches", []);
    const categories = this._getFromStorage("categories", []);

    const s = saved.find((x) => x.id === savedSearchId) || null;
    if (!s) {
      return {
        savedSearch: null,
        results: [],
        totalCount: 0,
        page,
        pageSize
      };
    }

    const args = this._applySavedSearchCriteriaToQuery(s);
    // Override page and pageSize
    args[19] = page;
    args[20] = pageSize;

    const searchResult = this.searchAuctionLots.apply(this, args);

    const category = categories.find((c) => c.id === s.category_id) || null;

    const savedSearchInfo = {
      id: s.id,
      name: s.name,
      keyword: s.keyword,
      category_id: s.category_id,
      category_name: category ? category.name : "",
      location_state: s.location_state,
      location_city: s.location_city,
      location_zip: s.location_zip,
      radius_miles: s.radius_miles,
      price_unit: s.price_unit,
      price_max: s.price_max,
      closing_date_filter_type: s.closing_date_filter_type,
      closing_date_days_from_now_min: s.closing_date_days_from_now_min,
      closing_date_days_from_now_max: s.closing_date_days_from_now_max,
      sort_option: s.sort_option,
      alerts_enabled: s.alerts_enabled
    };

    return {
      savedSearch: savedSearchInfo,
      results: searchResult.results,
      totalCount: searchResult.totalCount,
      page: searchResult.page,
      pageSize: searchResult.pageSize
    };
  }

  // getMessageThreads(unreadOnly)
  getMessageThreads(unreadOnly = false) {
    const threads = this._getFromStorage("message_threads", []);
    const messages = this._getFromStorage("messages", []);
    const lots = this._getFromStorage("auction_lots", []);

    let threadList = threads.map((t) => {
      const lot = lots.find((l) => l.id === t.lot_id) || null;
      const threadMessages = messages.filter((m) => m.thread_id === t.id);
      const unreadCount = threadMessages.filter((m) => !m.is_read && m.direction === "incoming").length;
      const lastMsg = threadMessages.reduce((latest, m) => {
        if (!latest) return m;
        const lm = this._parseIso(latest.sent_at) || new Date(0);
        const cm = this._parseIso(m.sent_at) || new Date(0);
        return cm > lm ? m : latest;
      }, null);

      return {
        id: t.id,
        lot_id: t.lot_id,
        lot_title: lot ? lot.title : "",
        subject: t.subject || (lot ? lot.title : ""),
        counterpart_name: t.counterpart_name || "",
        last_message_preview: lastMsg ? lastMsg.body.slice(0, 200) : "",
        last_message_at: lastMsg ? lastMsg.sent_at : t.created_at,
        unread_count: unreadCount
      };
    });

    if (unreadOnly) {
      threadList = threadList.filter((t) => t.unread_count > 0);
    }

    threadList.sort((a, b) => {
      const da = this._parseIso(a.last_message_at) || new Date(0);
      const db = this._parseIso(b.last_message_at) || new Date(0);
      return db - da;
    });

    const totalUnreadCount = threadList.reduce((sum, t) => sum + (t.unread_count || 0), 0);

    return {
      threads: threadList,
      totalUnreadCount
    };
  }

  // getMessageThreadDetails(threadId)
  getMessageThreadDetails(threadId) {
    const threads = this._getFromStorage("message_threads", []);
    const messages = this._getFromStorage("messages", []);
    const lots = this._getFromStorage("auction_lots", []);

    const threadRecord = threads.find((t) => t.id === threadId) || null;
    if (!threadRecord) {
      return { thread: null, messages: [] };
    }

    const lot = lots.find((l) => l.id === threadRecord.lot_id) || null;

    let threadMessages = messages.filter((m) => m.thread_id === threadId);

    // Mark incoming messages as read
    threadMessages = threadMessages.map((m) => {
      if (m.direction === "incoming" && !m.is_read) {
        m.is_read = true;
      }
      return m;
    });

    // Persist updated messages
    let allMessages = this._getFromStorage("messages", []);
    allMessages = allMessages.map((m) => (m.thread_id === threadId ? threadMessages.find((tm) => tm.id === m.id) || m : m));
    this._saveToStorage("messages", allMessages);

    threadMessages.sort((a, b) => {
      const da = this._parseIso(a.sent_at) || new Date(0);
      const db = this._parseIso(b.sent_at) || new Date(0);
      return da - db;
    });

    const thread = {
      id: threadRecord.id,
      lot_id: threadRecord.lot_id,
      lot_title: lot ? lot.title : "",
      subject: threadRecord.subject || (lot ? lot.title : ""),
      counterpart_name: threadRecord.counterpart_name || "",
      created_at: threadRecord.created_at
    };

    const messagesOut = threadMessages.map((m) => ({
      id: m.id,
      body: m.body,
      sent_at: m.sent_at,
      direction: m.direction,
      is_read: m.is_read
    }));

    return {
      thread,
      messages: messagesOut
    };
  }

  // sendMessageToSeller(lotId, body)
  sendMessageToSeller(lotId, body) {
    if (!lotId || !body) {
      return { success: false, message: "Missing parameters", thread: null };
    }

    const lots = this._getFromStorage("auction_lots", []);
    const lot = lots.find((l) => l.id === lotId) || null;
    if (!lot) {
      return { success: false, message: "Lot not found", thread: null };
    }

    const threads = this._getFromStorage("message_threads", []);
    const messages = this._getFromStorage("messages", []);

    const subject = lot.title;
    const counterpartName = lot.seller_display_name || lot.seller_ranch_name || "Seller";

    const thread = {
      id: this._generateId("thread"),
      lot_id: lotId,
      subject,
      counterpart_name: counterpartName,
      created_at: this._nowIso(),
      last_message_preview: body.slice(0, 200),
      last_message_at: this._nowIso(),
      unread_count: 0
    };

    threads.push(thread);

    const message = {
      id: this._generateId("msg"),
      thread_id: thread.id,
      body,
      sent_at: this._nowIso(),
      direction: "outgoing",
      is_read: true
    };
    messages.push(message);

    this._saveToStorage("message_threads", threads);
    this._saveToStorage("messages", messages);

    return {
      success: true,
      message: "Message sent",
      thread: {
        id: thread.id,
        lot_id: thread.lot_id,
        subject: thread.subject,
        counterpart_name: thread.counterpart_name,
        created_at: thread.created_at,
        last_message_preview: thread.last_message_preview,
        last_message_at: thread.last_message_at,
        unread_count: thread.unread_count
      }
    };
  }

  // sendMessageReply(threadId, body)
  sendMessageReply(threadId, body) {
    if (!threadId || !body) {
      return { success: false, message: "Missing parameters", sentMessage: null };
    }

    let threads = this._getFromStorage("message_threads", []);
    let messages = this._getFromStorage("messages", []);

    const threadIndex = threads.findIndex((t) => t.id === threadId);
    if (threadIndex === -1) {
      return { success: false, message: "Thread not found", sentMessage: null };
    }

    const message = {
      id: this._generateId("msg"),
      thread_id: threadId,
      body,
      sent_at: this._nowIso(),
      direction: "outgoing",
      is_read: true
    };
    messages.push(message);

    threads[threadIndex].last_message_preview = body.slice(0, 200);
    threads[threadIndex].last_message_at = message.sent_at;

    this._saveToStorage("message_threads", threads);
    this._saveToStorage("messages", messages);

    return {
      success: true,
      message: "Reply sent",
      sentMessage: {
        id: message.id,
        body: message.body,
        sent_at: message.sent_at,
        direction: message.direction
      }
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    let content = this._getFromStorage("static_page_about", null);
    if (!content) {
      content = {
        title: "About Our Livestock Auction Platform",
        sections: [
          {
            heading: "Connecting buyers and sellers",
            body:
              "Our platform helps ranchers, order buyers, and sale barns list and discover quality livestock auctions across the country."
          },
          {
            heading: "Timed and live auctions",
            body:
              "Whether you prefer online timed auctions or upcoming live sales, we provide transparent pricing, watchlists, and bidding tools to keep you informed."
          }
        ],
        lastUpdated: this._nowIso()
      };
      this._saveToStorage("static_page_about", content);
    }
    return content;
  }

  // getHelpPageContent()
  getHelpPageContent() {
    let content = this._getFromStorage("static_page_help", null);
    if (!content) {
      content = {
        sections: [
          {
            id: "bidding",
            title: "How to bid",
            body:
              "Browse auctions, review lot details carefully, then place your maximum bid per head, per pound, or per pair depending on the listing."
          },
          {
            id: "selling",
            title: "How to create a listing",
            body:
              "Sellers can create listings with photos, detailed descriptions, and clear pricing and closing dates."
          }
        ],
        faqs: [
          {
            question: "Do I need an account to bid?",
            answer: "Yes, you must register and agree to our terms before placing bids."
          },
          {
            question: "Can I edit a listing after it goes live?",
            answer:
              "You can update certain fields like description; pricing and quantity changes may be restricted once bidding begins."
          }
        ],
        lastUpdated: this._nowIso()
      };
      this._saveToStorage("static_page_help", content);
    }
    return content;
  }

  // getContactSupportInfo()
  getContactSupportInfo() {
    let info = this._getFromStorage("contact_support_info", null);
    if (!info) {
      info = {
        supportEmail: "support@example.com",
        supportPhone: "+1 (800) 555-1234",
        supportHours: "Mon-Fri 8:00 AM - 5:00 PM Central",
        mailingAddress: "123 Cattle Drive, Stockyard City, USA"
      };
      this._saveToStorage("contact_support_info", info);
    }
    return info;
  }

  // submitContactSupportRequest(name, email, topic, subject, message)
  submitContactSupportRequest(name, email, topic, subject, message) {
    if (!name || !email || !topic || !subject || !message) {
      return { success: false, message: "Missing required fields", ticketId: null };
    }

    const requests = this._getFromStorage("support_requests", []);
    const ticketId = this._generateId("ticket");

    const record = {
      id: ticketId,
      name,
      email,
      topic,
      subject,
      message,
      created_at: this._nowIso()
    };

    requests.push(record);
    this._saveToStorage("support_requests", requests);

    return {
      success: true,
      message: "Support request submitted",
      ticketId
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    let content = this._getFromStorage("static_page_terms", null);
    if (!content) {
      content = {
        version: "1.0",
        lastUpdated: this._nowIso(),
        sections: [
          {
            heading: "Use of the platform",
            body:
              "By using this platform you agree to follow all applicable laws and our bidding and selling rules."
          },
          {
            heading: "Bidding obligations",
            body:
              "All bids are binding commitments to purchase if you are the high bidder and the reserve is met."
          }
        ]
      };
      this._saveToStorage("static_page_terms", content);
    }
    return content;
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    let content = this._getFromStorage("static_page_privacy", null);
    if (!content) {
      content = {
        version: "1.0",
        lastUpdated: this._nowIso(),
        sections: [
          {
            heading: "Data we collect",
            body:
              "We collect basic account information, bidding activity, and communication necessary to operate the auction platform."
          },
          {
            heading: "How we use data",
            body:
              "Data is used to facilitate auctions, improve the service, and communicate with you about your account and listings."
          }
        ]
      };
      this._saveToStorage("static_page_privacy", content);
    }
    return content;
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}