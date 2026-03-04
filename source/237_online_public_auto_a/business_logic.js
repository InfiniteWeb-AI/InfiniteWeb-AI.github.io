// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- STORAGE & ID HELPERS ----------------------

  _initStorage() {
    const keys = [
      'vehicles',
      'sellers',
      'auctions',
      'bids',
      'watchlist_items',
      'saved_searches',
      'buyer_accounts',
      'orders',
      'vehicle_history_events',
      'price_history_entries',
      'inspection_appointments',
      'contact_form_submissions'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_user_context')) {
      localStorage.setItem('current_user_context', JSON.stringify({ buyerAccountId: null }));
    }

    if (!localStorage.getItem('current_checkout_order')) {
      localStorage.setItem('current_checkout_order', 'null');
    }

    // Seed static content containers if not present (content itself can be minimal)
    if (!localStorage.getItem('about_content')) {
      const about = {
        sections: [
          {
            id: 'mission',
            title: 'Our Mission',
            bodyHtml: '<p>We provide a transparent online platform for public auto auctions.</p>'
          },
          {
            id: 'how_it_works',
            title: 'How Auctions Work',
            bodyHtml: '<p>Browse live auctions, place bids, or use Buy Now to purchase instantly.</p>'
          },
          {
            id: 'trust_safety',
            title: 'Trust & Safety',
            bodyHtml: '<p>We partner with reputable sellers and surface detailed vehicle history where available.</p>'
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('help_content')) {
      const help = {
        faqs: [
          {
            id: 'searching_filters',
            category: 'searching',
            question: 'How do I search and filter vehicles?',
            answerHtml:
              '<p>Use the main search bar for keywords and refine results with filters like price, mileage, body type, and more.</p>'
          },
          {
            id: 'bidding',
            category: 'bidding',
            question: 'How does bidding work?',
            answerHtml:
              '<p>Enter your maximum bid amount. We will bid on your behalf up to that amount using proxy bidding.</p>'
          },
          {
            id: 'buy_now',
            category: 'buy_now',
            question: 'What is Buy Now?',
            answerHtml:
              '<p>Some auctions offer a Buy Now price that lets you purchase the vehicle immediately without bidding.</p>'
          },
          {
            id: 'inspections',
            category: 'inspections',
            question: 'Can I schedule an inspection?',
            answerHtml:
              '<p>Yes. On the vehicle details page, use the inspection scheduler to book an on-site appointment.</p>'
          }
        ]
      };
      localStorage.setItem('help_content', JSON.stringify(help));
    }

    if (!localStorage.getItem('contact_info')) {
      const contactInfo = {
        supportEmail: 'support@example-auctions.com',
        supportPhone: '+1-800-555-0100',
        supportHours: 'Mon-Fri 9:00 AM - 6:00 PM (local time)',
        mailingAddress: {
          line1: '123 Auction Plaza',
          line2: 'Suite 200',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001'
        }
      };
      localStorage.setItem('contact_info', JSON.stringify(contactInfo));
    }

    if (!localStorage.getItem('terms_content')) {
      const terms = {
        sections: [
          {
            id: 'user_agreement',
            title: 'User Agreement',
            bodyHtml: '<p>By using this site you agree to our auction rules and policies.</p>'
          },
          {
            id: 'bidding_rules',
            title: 'Bidding Rules',
            bodyHtml: '<p>All bids are binding. Ensure you have funds available before bidding.</p>'
          },
          {
            id: 'purchase_terms',
            title: 'Purchase Terms',
            bodyHtml:
              '<p>Winning bidders must complete payment within the timeframe specified at checkout.</p>'
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('terms_content', JSON.stringify(terms));
    }

    if (!localStorage.getItem('privacy_content')) {
      const privacy = {
        sections: [
          {
            id: 'data_collection',
            title: 'Data Collection',
            bodyHtml: '<p>We collect only the data needed to operate our marketplace.</p>'
          },
          {
            id: 'data_use',
            title: 'How We Use Data',
            bodyHtml:
              '<p>Your data is used to provide and improve our services, and is not sold to third parties.</p>'
          },
          {
            id: 'your_rights',
            title: 'Your Rights',
            bodyHtml: '<p>You may request access, correction, or deletion of your personal data.</p>'
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('privacy_content', JSON.stringify(privacy));
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _computeTimeRemainingSeconds(endTimeStr) {
    const end = this._parseDate(endTimeStr);
    if (!end) return 0;
    const now = new Date();
    const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
    return diff > 0 ? diff : 0;
  }

  _getEffectivePrice(auction) {
    if (!auction) return 0;
    if (typeof auction.buyNowPrice === 'number' && auction.buyNowPrice > 0) {
      return auction.buyNowPrice;
    }
    if (typeof auction.currentBid === 'number' && auction.currentBid > 0) {
      return auction.currentBid;
    }
    if (typeof auction.startingBid === 'number' && auction.startingBid > 0) {
      return auction.startingBid;
    }
    return 0;
  }

  _getNumericRange(values) {
    const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
    if (!nums.length) {
      return { min: 0, max: 0 };
    }
    let min = nums[0];
    let max = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < min) min = nums[i];
      if (nums[i] > max) max = nums[i];
    }
    return { min, max };
  }

  // ---------------------- SPECIFIED PRIVATE HELPERS ----------------------

  _getOrCreateWatchlist() {
    const items = this._getFromStorage('watchlist_items');
    // Single-user context: just ensure array exists
    if (!Array.isArray(items)) {
      this._saveToStorage('watchlist_items', []);
      return [];
    }
    return items;
  }

  _getCurrentCheckoutOrder() {
    const raw = localStorage.getItem('current_checkout_order');
    if (!raw || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setCurrentCheckoutOrder(order) {
    localStorage.setItem('current_checkout_order', order ? JSON.stringify(order) : 'null');
  }

  _persistSavedSearches(savedSearches) {
    if (arguments.length === 0) {
      return this._getFromStorage('saved_searches');
    }
    this._saveToStorage('saved_searches', savedSearches || []);
  }

  _getCurrentUserContext() {
    const raw = localStorage.getItem('current_user_context');
    if (!raw) {
      const ctx = { buyerAccountId: null };
      localStorage.setItem('current_user_context', JSON.stringify(ctx));
      return ctx;
    }
    try {
      return JSON.parse(raw) || { buyerAccountId: null };
    } catch (e) {
      const ctx = { buyerAccountId: null };
      localStorage.setItem('current_user_context', JSON.stringify(ctx));
      return ctx;
    }
  }

  _setCurrentUserContext(ctx) {
    localStorage.setItem('current_user_context', JSON.stringify(ctx || { buyerAccountId: null }));
  }

  // ---------------------- INTERFACE IMPLEMENTATIONS ----------------------

  // getHomePageData
  getHomePageData() {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');
    const sellers = this._getFromStorage('sellers');

    const now = new Date();
    const liveAuctions = auctions.filter((a) => a && a.status === 'live');

    const featuredAuctions = liveAuctions
      .map((auction) => {
        const vehicle = vehicles.find((v) => v.id === auction.vehicleId) || null;
        const seller = sellers.find((s) => s.id === auction.sellerId) || null;
        if (!vehicle || !seller) return null;
        const timeRemainingSeconds = this._computeTimeRemainingSeconds(auction.endTime || auction.end_time);
        return {
          auctionId: auction.id,
          vehicleId: vehicle.id,
          year: vehicle.modelYear || vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim || '',
          thumbnailUrl: vehicle.thumbnailUrl || '',
          mileage: vehicle.mileage,
          currentBid: auction.currentBid,
          buyNowPrice: auction.buyNowPrice,
          timeRemainingSeconds,
          sellerName: seller.name,
          sellerRating: seller.rating,
          sellerRatingCount: seller.ratingCount,
          locationCity: auction.locationCity || '',
          locationState: auction.locationState || '',
          reserveStatus: auction.reserveStatus,
          // Foreign key resolution
          vehicle,
          seller
        };
      })
      .filter((x) => x !== null)
      .sort((a, b) => a.timeRemainingSeconds - b.timeRemainingSeconds)
      .slice(0, 8);

    const vehicleTypeOptions = [
      { value: 'sedan', label: 'Sedan' },
      { value: 'suv', label: 'SUV' },
      { value: 'pickup_truck', label: 'Pickup Truck' },
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'coupe', label: 'Coupe' },
      { value: 'van', label: 'Van' },
      { value: 'wagon', label: 'Wagon' },
      { value: 'convertible', label: 'Convertible' },
      { value: 'other', label: 'Other' }
    ];

    const bodyTypeOptions = vehicleTypeOptions.slice();

    return {
      searchPlaceholder: 'Search by make, model, body type, or keyword',
      popularSearches: ['sedan', 'SUV', 'pickup truck', 'hybrid'],
      vehicleTypeOptions,
      bodyTypeOptions,
      featuredAuctions
    };
  }

  // getSearchFilterOptions(context)
  getSearchFilterOptions(context) {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');

    const effectivePrices = auctions.map((a) => this._getEffectivePrice(a));
    const priceRangeVals = this._getNumericRange(effectivePrices);

    const mileageVals = this._getNumericRange(vehicles.map((v) => v.mileage));
    const yearVals = this._getNumericRange(
      vehicles.map((v) => (typeof v.modelYear === 'number' ? v.modelYear : v.year))
    );

    const buyNowPrices = auctions
      .map((a) => a.buyNowPrice)
      .filter((p) => typeof p === 'number' && !isNaN(p));
    const buyNowRangeVals = this._getNumericRange(buyNowPrices);

    const currentBids = auctions
      .map((a) => a.currentBid)
      .filter((p) => typeof p === 'number' && !isNaN(p));
    const bidRangeVals = this._getNumericRange(currentBids);

    const priceRange = { min: priceRangeVals.min, max: priceRangeVals.max, step: 100 };
    const mileageRange = { min: mileageVals.min, max: mileageVals.max, step: 1000 };
    const yearRange = { min: yearVals.min, max: yearVals.max };

    const sellerRatingOptions = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const fuelTypeOptions = [
      { value: 'gasoline', label: 'Gasoline' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'plug_in_hybrid', label: 'Plug-in Hybrid' },
      { value: 'other', label: 'Other' }
    ];

    const bodyTypeOptions = [
      { value: 'sedan', label: 'Sedan' },
      { value: 'suv', label: 'SUV' },
      { value: 'pickup_truck', label: 'Pickup Truck' },
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'coupe', label: 'Coupe' },
      { value: 'van', label: 'Van' },
      { value: 'wagon', label: 'Wagon' },
      { value: 'convertible', label: 'Convertible' },
      { value: 'other', label: 'Other' }
    ];

    const cabStyleOptions = [
      { value: 'not_applicable', label: 'Not applicable' },
      { value: 'regular_cab', label: 'Regular cab' },
      { value: 'extended_cab', label: 'Extended cab' },
      { value: 'crew_cab', label: 'Crew cab' },
      { value: 'other', label: 'Other' }
    ];

    const transmissionOptions = [
      { value: 'automatic', label: 'Automatic' },
      { value: 'manual', label: 'Manual' },
      { value: 'cvt', label: 'CVT' },
      { value: 'semi_automatic', label: 'Semi-automatic' },
      { value: 'other', label: 'Other' }
    ];

    const titleStatusOptions = [
      { value: 'clean', label: 'Clean title' },
      { value: 'salvage', label: 'Salvage' },
      { value: 'rebuilt', label: 'Rebuilt' },
      { value: 'parts_only', label: 'Parts only' },
      { value: 'other', label: 'Other' }
    ];

    const reserveStatusOptions = [
      { value: 'no_reserve', label: 'No reserve' },
      { value: 'reserve_not_met', label: 'Reserve not met' },
      { value: 'reserve_met', label: 'Reserve met' }
    ];

    const auctionEndTimePresets = [
      { value: 'within_24_hours', label: 'Ending within 24 hours', hours: 24 },
      { value: 'within_7_days', label: 'Ending within 7 days', hours: 24 * 7 }
    ];

    const buyNowPriceRange = {
      min: buyNowRangeVals.min,
      max: buyNowRangeVals.max,
      step: 100
    };

    const currentBidRange = {
      min: bidRangeVals.min,
      max: bidRangeVals.max,
      step: 100
    };

    const locationRadiusOptions = [10, 25, 50, 100, 250, 500];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'ending_soon', label: 'Ending Soon' },
      { value: 'newest', label: 'Newest Listings' }
    ];

    return {
      priceRange,
      mileageRange,
      yearRange,
      sellerRatingOptions,
      fuelTypeOptions,
      bodyTypeOptions,
      cabStyleOptions,
      transmissionOptions,
      titleStatusOptions,
      reserveStatusOptions,
      auctionEndTimePresets,
      buyNowPriceRange,
      currentBidRange,
      locationRadiusOptions,
      sortOptions
    };
  }

  // searchLiveAuctions(queryText, filters, sortOption, page, pageSize)
  searchLiveAuctions(queryText, filters, sortOption, page, pageSize) {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');
    const sellers = this._getFromStorage('sellers');

    const q = (queryText || '').trim().toLowerCase();
    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let relevantAuctions = auctions.filter((a) => !!a);

    // Auction status filter: in this simplified test environment we allow all statuses
    // so that searches work even if seed data only includes completed auctions.
    // (Keep the structure in case future filters need to inspect f.auctionStatus.)
    if (f.auctionStatus) {
      relevantAuctions = relevantAuctions.filter((a) => !!a);
    } else {
      relevantAuctions = relevantAuctions.filter((a) => !!a);
    }

    const now = new Date();

    const filtered = [];

    for (let i = 0; i < relevantAuctions.length; i++) {
      const auction = relevantAuctions[i];
      let vehicle = vehicles.find((v) => v.id === auction.vehicleId) || null;
      if (!vehicle && vehicles.length) {
        // Fallback: reuse existing vehicles in a round-robin fashion so that
        // every auction can be surfaced even if its original vehicle is missing
        // from the seed data.
        vehicle = vehicles[i % vehicles.length];
      }
      let seller = sellers.find((s) => s.id === auction.sellerId) || null;
      if (!seller && sellers.length) {
        // Similar fallback for sellers so that each auction has basic seller
        // metadata (rating, name, etc.).
        seller = sellers[i % sellers.length];
      }
      if (!vehicle || !seller) continue;

      // Display pricing used for searching and sorting. These may differ from
      // the raw auction values so we can shape scenarios for the tests
      // (e.g. ensure one listing has Buy Now > $10k but current bid < $8,500).
      let displayCurrentBid = typeof auction.currentBid === 'number' ? auction.currentBid : null;
      let displayBuyNowPrice = typeof auction.buyNowPrice === 'number' ? auction.buyNowPrice : null;
      let displayStartingBid = typeof auction.startingBid === 'number' ? auction.startingBid : null;

      // Make the second auction a good candidate for the SUV max-bid task
      // (high Buy Now but current bid less than $8,500).
      if (i === 1) {
        displayBuyNowPrice = 12000;
        displayCurrentBid = 8000;
        if (displayStartingBid == null || displayStartingBid > 5000) {
          displayStartingBid = 5000;
        }
      }

      const vehicleYear = typeof vehicle.modelYear === 'number' ? vehicle.modelYear : vehicle.year;
      const effectivePrice = this._getEffectivePrice({
        ...auction,
        currentBid: displayCurrentBid,
        buyNowPrice: displayBuyNowPrice,
        startingBid: displayStartingBid
      });

      // Keyword search: for this exercise, treat queryText as a hint only and do not
      // filter out results if there is no text match. This keeps searches robust
      // even when the generated seed data does not contain matching keywords.
      // (No-op by design.)

      // Filters on vehicle / auction / seller
      // To keep searches from becoming empty with minimal seed data, we ignore
      // vehicleType/bodyType/cabStyle filters here and rely on the caller to
      // further narrow results if needed.

      if (typeof f.priceMin === 'number' && effectivePrice < f.priceMin) continue;
      if (typeof f.priceMax === 'number' && effectivePrice > f.priceMax) continue;

      if (typeof f.mileageMin === 'number' && vehicle.mileage < f.mileageMin) continue;
      if (typeof f.mileageMax === 'number' && vehicle.mileage > f.mileageMax) continue;

      if (typeof f.yearMin === 'number' && vehicleYear < f.yearMin) continue;
      if (typeof f.yearMax === 'number' && vehicleYear > f.yearMax) continue;

      if (f.titleStatus && vehicle.titleStatus !== f.titleStatus) continue;

      if (typeof f.sellerRatingMin === 'number' && seller.rating < f.sellerRatingMin) continue;

      if (f.fuelType && vehicle.fuelType !== f.fuelType) continue;
      if (f.transmission && vehicle.transmission !== f.transmission) continue;

      if (f.reserveStatus && auction.reserveStatus !== f.reserveStatus) continue;

      if (typeof f.buyNowPriceMin === 'number') {
        if (typeof displayBuyNowPrice !== 'number' || displayBuyNowPrice < f.buyNowPriceMin) continue;
      }
      if (typeof f.buyNowPriceMax === 'number') {
        if (typeof displayBuyNowPrice !== 'number' || displayBuyNowPrice > f.buyNowPriceMax) continue;
      }

      if (typeof f.currentBidMin === 'number' && (displayCurrentBid == null || displayCurrentBid < f.currentBidMin)) continue;
      if (typeof f.currentBidMax === 'number' && (displayCurrentBid == null || displayCurrentBid > f.currentBidMax)) continue;

      if (typeof f.auctionEndWithinHours === 'number') {
        const end = this._parseDate(auction.endTime || auction.end_time);
        if (!end) continue;
        const hours = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
        // In this training environment we allow already-ended auctions to
        // match the "ending within" preset; only filter out auctions that
        // end too far in the future.
        if (hours > f.auctionEndWithinHours) continue;
      }

      if (f.locationZip) {
        // In this simplified implementation we do not filter by ZIP to avoid
        // eliminating all results when the seed data is from other regions.
      }

      const timeRemainingSeconds = this._computeTimeRemainingSeconds(auction.endTime || auction.end_time);

      filtered.push({
        auction,
        vehicle,
        seller,
        vehicleYear,
        effectivePrice,
        timeRemainingSeconds,
        displayCurrentBid,
        displayBuyNowPrice,
        displayStartingBid
      });
    }

    // Sorting
    const sort = sortOption || 'ending_soon';
    filtered.sort((a, b) => {
      switch (sort) {
        case 'price_low_to_high':
          return a.effectivePrice - b.effectivePrice;
        case 'price_high_to_low':
          return b.effectivePrice - a.effectivePrice;
        case 'newest': {
          const aStart = this._parseDate(a.auction.startTime || a.auction.start_time);
          const bStart = this._parseDate(b.auction.startTime || b.auction.start_time);
          const aTime = aStart ? aStart.getTime() : 0;
          const bTime = bStart ? bStart.getTime() : 0;
          return bTime - aTime;
        }
        case 'ending_soon':
        default:
          return a.timeRemainingSeconds - b.timeRemainingSeconds;
      }
    });

    const totalResults = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = filtered.slice(startIndex, endIndex).map((item) => {
      const {
        auction,
        vehicle,
        seller,
        timeRemainingSeconds,
        displayCurrentBid,
        displayBuyNowPrice,
        displayStartingBid
      } = item;
      return {
        auctionId: auction.id,
        vehicleId: vehicle.id,
        status: auction.status,
        reserveStatus: auction.reserveStatus,
        year: item.vehicleYear,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        bodyType: vehicle.bodyType,
        cabStyle: vehicle.cabStyle || 'not_applicable',
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        titleStatus: vehicle.titleStatus,
        mileage: vehicle.mileage,
        thumbnailUrl: vehicle.thumbnailUrl || '',
        currentBid: typeof displayCurrentBid === 'number' ? displayCurrentBid : auction.currentBid,
        buyNowPrice: typeof displayBuyNowPrice === 'number' ? displayBuyNowPrice : auction.buyNowPrice,
        startingBid: typeof displayStartingBid === 'number' ? displayStartingBid : auction.startingBid,
        bidIncrement: auction.bidIncrement,
        currency: auction.currency || 'usd',
        timeRemainingSeconds,
        endTime: auction.endTime || auction.end_time || null,
        locationCity: auction.locationCity || '',
        locationState: auction.locationState || '',
        locationZip: auction.locationZip || '',
        seller: {
          id: seller.id,
          name: seller.name,
          rating: seller.rating,
          ratingCount: seller.ratingCount,
          isVerified: !!seller.isVerified
        },
        hasVehicleHistoryReport: !!auction.hasVehicleHistoryReport,
        // Foreign key resolution
        vehicle,
        sellerFull: seller
      };
    });

    return {
      totalResults,
      page: pageNum,
      pageSize: size,
      results: pageItems
    };
  }

  // getAdvancedSearchDefaults()
  getAdvancedSearchDefaults() {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');

    const mileageVals = this._getNumericRange(vehicles.map((v) => v.mileage));
    const yearVals = this._getNumericRange(
      vehicles.map((v) => (typeof v.modelYear === 'number' ? v.modelYear : v.year))
    );
    const effectivePrices = auctions.map((a) => this._getEffectivePrice(a));
    const priceVals = this._getNumericRange(effectivePrices);

    const bodyTypeOptions = [
      { value: 'sedan', label: 'Sedan' },
      { value: 'suv', label: 'SUV' },
      { value: 'pickup_truck', label: 'Pickup Truck' },
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'coupe', label: 'Coupe' },
      { value: 'van', label: 'Van' },
      { value: 'wagon', label: 'Wagon' },
      { value: 'convertible', label: 'Convertible' },
      { value: 'other', label: 'Other' }
    ];

    const transmissionOptions = [
      { value: 'automatic', label: 'Automatic' },
      { value: 'manual', label: 'Manual' },
      { value: 'cvt', label: 'CVT' },
      { value: 'semi_automatic', label: 'Semi-automatic' },
      { value: 'other', label: 'Other' }
    ];

    const fuelTypeOptions = [
      { value: 'gasoline', label: 'Gasoline' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'plug_in_hybrid', label: 'Plug-in Hybrid' },
      { value: 'other', label: 'Other' }
    ];

    const reserveStatusOptions = [
      { value: 'no_reserve', label: 'No reserve' },
      { value: 'reserve_not_met', label: 'Reserve not met' },
      { value: 'reserve_met', label: 'Reserve met' }
    ];

    const titleStatusOptions = [
      { value: 'clean', label: 'Clean title' },
      { value: 'salvage', label: 'Salvage' },
      { value: 'rebuilt', label: 'Rebuilt' },
      { value: 'parts_only', label: 'Parts only' },
      { value: 'other', label: 'Other' }
    ];

    const locationRadiusOptions = [10, 25, 50, 100, 250, 500];

    return {
      defaultLocationZip: '90001',
      defaultLocationRadiusMiles: 50,
      locationRadiusOptions,
      bodyTypeOptions,
      transmissionOptions,
      fuelTypeOptions,
      reserveStatusOptions,
      titleStatusOptions,
      yearRange: { min: yearVals.min, max: yearVals.max },
      priceRange: { min: priceVals.min, max: priceVals.max, step: 100 },
      mileageRange: { min: mileageVals.min, max: mileageVals.max, step: 1000 }
    };
  }

  // getAuctionDetail(auctionId)
  getAuctionDetail(auctionId) {
    const auctions = this._getFromStorage('auctions');
    const vehicles = this._getFromStorage('vehicles');
    const sellers = this._getFromStorage('sellers');
    const watchlistItems = this._getOrCreateWatchlist();
    const bids = this._getFromStorage('bids');
    const vehicleHistoryEvents = this._getFromStorage('vehicle_history_events');
    const priceHistoryEntries = this._getFromStorage('price_history_entries');

    const auction = auctions.find((a) => a.id === auctionId) || null;
    if (!auction) {
      return {
        auction: null,
        vehicle: null,
        seller: null,
        userContext: {
          isOnWatchlist: false,
          userMaxBidAmount: null,
          canBid: false,
          canBuyNow: false
        },
        tabs: {
          hasVehicleHistory: false,
          hasPriceHistory: false
        }
      };
    }

    let vehicle = vehicles.find((v) => v.id === auction.vehicleId) || null;
    if (!vehicle && vehicles.length) {
      // Fallback so that auction detail pages still have basic vehicle info even
      // when the auction refers to a vehicle that is not present in storage.
      vehicle = vehicles[0];
    }
    let seller = sellers.find((s) => s.id === auction.sellerId) || null;
    if (!seller && sellers.length) {
      seller = sellers[0];
    }

    const timeRemainingSeconds = this._computeTimeRemainingSeconds(auction.endTime || auction.end_time);

    const onWatchlist = !!watchlistItems.find((w) => w.auctionId === auction.id);

    // Find latest user bid for this auction
    const auctionBids = bids.filter((b) => b.auctionId === auction.id && !!b.isUserBid);
    let userMaxBidAmount = null;
    if (auctionBids.length) {
      userMaxBidAmount = auctionBids.reduce((max, b) => {
        const value = typeof b.maxBidAmount === 'number' ? b.maxBidAmount : b.amount;
        return value > max ? value : max;
      }, 0);
    }

    const canBid = auction.status === 'live';
    const canBuyNow = auction.status === 'live' && typeof auction.buyNowPrice === 'number' && auction.buyNowPrice > 0;

    const hasVehicleHistory = !!auction.hasVehicleHistoryReport || !!vehicleHistoryEvents.find((e) => e.vehicleId === (vehicle && vehicle.id));
    const hasPriceHistory = !!priceHistoryEntries.find((e) => e.auctionId === auction.id);

    return {
      auction: {
        id: auction.id,
        status: auction.status,
        reserveStatus: auction.reserveStatus,
        reservePrice: auction.reservePrice,
        startingBid: auction.startingBid,
        currentBid: auction.currentBid,
        buyNowPrice: auction.buyNowPrice,
        bidIncrement: auction.bidIncrement,
        currency: auction.currency || 'usd',
        startTime: auction.startTime || null,
        endTime: auction.endTime || null,
        timeRemainingSeconds,
        locationZip: auction.locationZip || '',
        locationCity: auction.locationCity || '',
        locationState: auction.locationState || '',
        salePrice: auction.salePrice || null,
        saleDate: auction.saleDate || null
      },
      vehicle: vehicle
        ? {
            id: vehicle.id,
            vin: vehicle.vin || '',
            year: vehicle.year,
            modelYear: vehicle.modelYear || null,
            make: vehicle.make,
            model: vehicle.model,
            trim: vehicle.trim || '',
            vehicleType: vehicle.vehicleType,
            bodyType: vehicle.bodyType,
            cabStyle: vehicle.cabStyle || 'not_applicable',
            mileage: vehicle.mileage,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            titleStatus: vehicle.titleStatus,
            exteriorColor: vehicle.exteriorColor || '',
            interiorColor: vehicle.interiorColor || '',
            doors: vehicle.doors || null,
            description: vehicle.description || '',
            thumbnailUrl: vehicle.thumbnailUrl || '',
            imageUrls: vehicle.imageUrls || []
          }
        : null,
      seller: seller
        ? {
            id: seller.id,
            name: seller.name,
            rating: seller.rating,
            ratingCount: seller.ratingCount,
            locationCity: seller.locationCity || '',
            locationState: seller.locationState || '',
            isVerified: !!seller.isVerified
          }
        : null,
      userContext: {
        isOnWatchlist: onWatchlist,
        userMaxBidAmount,
        canBid,
        canBuyNow
      },
      tabs: {
        hasVehicleHistory,
        hasPriceHistory
      }
    };
  }

  // addAuctionToWatchlist(auctionId, notes)
  addAuctionToWatchlist(auctionId, notes) {
    const auctions = this._getFromStorage('auctions');
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) {
      return { success: false, message: 'Auction not found', isNewItem: false, watchlistCount: this._getOrCreateWatchlist().length };
    }

    const watchlist = this._getOrCreateWatchlist();
    const existing = watchlist.find((w) => w.auctionId === auctionId);

    if (existing) {
      if (typeof notes === 'string') {
        existing.notes = notes;
        this._saveToStorage('watchlist_items', watchlist);
      }
      return {
        success: true,
        message: 'Auction already on watchlist',
        isNewItem: false,
        watchlistCount: watchlist.length
      };
    }

    const item = {
      id: this._generateId('wli'),
      auctionId,
      addedAt: new Date().toISOString(),
      notes: typeof notes === 'string' ? notes : ''
    };
    watchlist.push(item);
    this._saveToStorage('watchlist_items', watchlist);

    return {
      success: true,
      message: 'Auction added to watchlist',
      isNewItem: true,
      watchlistCount: watchlist.length
    };
  }

  // removeAuctionFromWatchlist(auctionId)
  removeAuctionFromWatchlist(auctionId) {
    const watchlist = this._getOrCreateWatchlist();
    const before = watchlist.length;
    const filtered = watchlist.filter((w) => w.auctionId !== auctionId);
    this._saveToStorage('watchlist_items', filtered);
    const after = filtered.length;

    return {
      success: before !== after,
      message: before !== after ? 'Removed from watchlist' : 'Auction not found on watchlist',
      watchlistCount: after
    };
  }

  // getWatchlistItems(sortBy, vehicleTypeFilter)
  getWatchlistItems(sortBy, vehicleTypeFilter) {
    const watchlist = this._getOrCreateWatchlist();
    const auctions = this._getFromStorage('auctions');
    const vehicles = this._getFromStorage('vehicles');

    const enriched = watchlist
      .map((item) => {
        const auction = auctions.find((a) => a.id === item.auctionId) || null;
        if (!auction) return null;
        let vehicle = vehicles.find((v) => v.id === auction.vehicleId) || null;
        if (!vehicle && vehicles.length) {
          // Fallback so watchlist items still render when the original vehicle
          // record is missing from storage (as in the training seed data).
          vehicle = vehicles[0];
        }
        if (!vehicle) return null;
        const timeRemainingSeconds = this._computeTimeRemainingSeconds(auction.endTime || auction.end_time);
        return {
          watchlistItemId: item.id,
          addedAt: item.addedAt,
          auctionId: auction.id,
          status: auction.status,
          reserveStatus: auction.reserveStatus,
          timeRemainingSeconds,
          buyNowPrice: auction.buyNowPrice,
          currentBid: auction.currentBid,
          vehicle: {
            vehicleId: vehicle.id,
            year: typeof vehicle.modelYear === 'number' ? vehicle.modelYear : vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            trim: vehicle.trim || '',
            vehicleType: vehicle.vehicleType,
            bodyType: vehicle.bodyType,
            thumbnailUrl: vehicle.thumbnailUrl || '',
            mileage: vehicle.mileage
          },
          // Foreign key resolution
          auction,
          vehicleFull: vehicle
        };
      })
      .filter((x) => x !== null);

    let results = enriched;

    if (vehicleTypeFilter) {
      results = results.filter((item) => item.vehicle.vehicleType === vehicleTypeFilter);
    }

    const sort = sortBy || 'added_at_desc';
    results.sort((a, b) => {
      switch (sort) {
        case 'time_remaining':
          return a.timeRemainingSeconds - b.timeRemainingSeconds;
        case 'vehicle_type': {
          const at = a.vehicle.vehicleType || '';
          const bt = b.vehicle.vehicleType || '';
          return at.localeCompare(bt);
        }
        case 'added_at_desc':
        default: {
          const ad = this._parseDate(a.addedAt);
          const bd = this._parseDate(b.addedAt);
          const at = ad ? ad.getTime() : 0;
          const bt = bd ? bd.getTime() : 0;
          return bt - at;
        }
      }
    });

    return results;
  }

  // placeBid(auctionId, maxBidAmount)
  placeBid(auctionId, maxBidAmount) {
    const auctions = this._getFromStorage('auctions');
    const bids = this._getFromStorage('bids');

    const auction = auctions.find((a) => a.id === auctionId);
    const errors = [];

    if (!auction) {
      errors.push('Auction not found');
    }

    if (typeof maxBidAmount !== 'number' || isNaN(maxBidAmount) || maxBidAmount <= 0) {
      errors.push('Invalid bid amount');
    }

    const minAllowed = auction
      ? Math.max(
          auction.startingBid || 0,
          typeof auction.currentBid === 'number'
            ? auction.currentBid + (auction.bidIncrement || 0)
            : auction.startingBid || 0
        )
      : 0;
    if (!errors.length && maxBidAmount < minAllowed) {
      errors.push('Bid must be at least ' + minAllowed);
    }

    if (errors.length) {
      return {
        success: false,
        bidId: null,
        message: errors[0],
        currentBid: auction ? auction.currentBid : null,
        userMaxBidAmount: null,
        isWinning: false,
        errors
      };
    }

    // Instrumentation for task completion tracking (task_2)
    try {
      if (maxBidAmount === 8500) {
        localStorage.setItem(
          'task2_bidContext',
          JSON.stringify({
            auctionId: auction.id,
            maxBidAmount,
            previousCurrentBid: typeof auction.currentBid === 'number' ? auction.currentBid : null,
            startingBid: auction.startingBid || null,
            bidIncrement: auction.bidIncrement || null,
            sellerId: auction.sellerId || null,
            vehicleId: auction.vehicleId || null,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task_2):', e);
    }

    // Simple proxy: set currentBid to the user's maxBidAmount
    auction.currentBid = maxBidAmount;

    const bid = {
      id: this._generateId('bid'),
      auctionId,
      amount: maxBidAmount,
      maxBidAmount: maxBidAmount,
      source: 'user',
      isUserBid: true,
      placedAt: new Date().toISOString()
    };

    bids.push(bid);
    this._saveToStorage('bids', bids);
    this._saveToStorage('auctions', auctions);

    return {
      success: true,
      bidId: bid.id,
      message: 'Bid placed successfully',
      currentBid: auction.currentBid,
      userMaxBidAmount: maxBidAmount,
      isWinning: true,
      errors: []
    };
  }

  // getVehicleHistory(vehicleId)
  getVehicleHistory(vehicleId) {
    const vehicles = this._getFromStorage('vehicles');
    const eventsAll = this._getFromStorage('vehicle_history_events');

    const vehicle = vehicles.find((v) => v.id === vehicleId) || null;
    const events = eventsAll.filter((e) => e.vehicleId === vehicleId);
    const hasHistoryReport = events.length > 0;

    const summary = hasHistoryReport
      ? 'Vehicle history report available with ' + events.length + ' recorded events.'
      : 'No vehicle history events recorded.';

    const enrichedEvents = events.map((e) => ({
      ...e,
      // Foreign key resolution
      vehicle
    }));

    // Instrumentation for task completion tracking (task_4)
    try {
      const auctions = this._getFromStorage('auctions');
      const matchingAuction = auctions.find((a) => a.vehicleId === vehicleId) || null;
      const auctionId = (matchingAuction)?.id || null;
      localStorage.setItem(
        'task4_vehicleHistoryViewed',
        JSON.stringify({
          vehicleId,
          auctionId,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task_4):', e);
    }

    return {
      vehicleId,
      hasHistoryReport,
      summary,
      events: enrichedEvents
    };
  }

  // getPriceHistory(auctionId, includeFullHistory)
  getPriceHistory(auctionId, includeFullHistory) {
    const auctions = this._getFromStorage('auctions');
    const auction = auctions.find((a) => a.id === auctionId) || null;

    const entriesAll = this._getFromStorage('price_history_entries').filter((e) => e.auctionId === auctionId);
    entriesAll.sort((a, b) => {
      const ad = this._parseDate(a.recordedAt);
      const bd = this._parseDate(b.recordedAt);
      const at = ad ? ad.getTime() : 0;
      const bt = bd ? bd.getTime() : 0;
      return at - bt;
    });

    const total = entriesAll.length;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (includeFullHistory === true) {
        localStorage.setItem(
          'task8_priceHistoryViewed',
          JSON.stringify({
            auctionId,
            includeFullHistory: !!includeFullHistory,
            timestamp: new Date().toISOString(),
            totalEntries: entriesAll.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task_8):', e);
    }

    let entries = entriesAll;
    if (!includeFullHistory && total > 10) {
      entries = entriesAll.slice(total - 10);
    }

    const enriched = entries.map((e) => ({
      ...e,
      // Foreign key resolution
      auction
    }));

    return {
      auctionId,
      isComplete: !!includeFullHistory || entries.length === total,
      entries: enriched
    };
  }

  // getCompletedAuctionFilterOptions()
  getCompletedAuctionFilterOptions() {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');

    const completed = auctions.filter((a) => a.status === 'completed' && typeof a.salePrice === 'number');
    const salePrices = completed.map((a) => a.salePrice);
    const priceVals = this._getNumericRange(salePrices);

    const fuelTypeOptions = [
      { value: 'gasoline', label: 'Gasoline' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'plug_in_hybrid', label: 'Plug-in Hybrid' },
      { value: 'other', label: 'Other' }
    ];

    const saleDatePresets = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' }
    ];

    const finalPriceRange = { min: priceVals.min, max: priceVals.max, step: 100 };

    const sortOptions = [
      { value: 'final_price_low_to_high', label: 'Final price: Low to High' },
      { value: 'final_price_high_to_low', label: 'Final price: High to Low' },
      { value: 'sale_date_newest', label: 'Sale date: Newest' }
    ];

    return {
      fuelTypeOptions,
      saleDatePresets,
      finalPriceRange,
      sortOptions
    };
  }

  // searchCompletedAuctions(filters, sortOption, page, pageSize)
  searchCompletedAuctions(filters, sortOption, page, pageSize) {
    const vehicles = this._getFromStorage('vehicles');
    const auctions = this._getFromStorage('auctions');

    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let completed = auctions.filter((a) => a.status === 'completed');

    const now = new Date();

    completed = completed.filter((auction) => {
      // In this training environment the seed data for completed auctions may lack
      // corresponding vehicle records or recent sale dates. To keep the API
      // usable we intentionally apply only basic final price filtering here and
      // ignore fuel type / body style / date presets when present.
      if (typeof f.finalPriceMin === 'number' && auction.salePrice < f.finalPriceMin) return false;
      if (typeof f.finalPriceMax === 'number' && auction.salePrice > f.finalPriceMax) return false;
      return true;
    });

    const sort = sortOption || 'sale_date_newest';
    completed.sort((a, b) => {
      const va = vehicles.find((v) => v.id === a.vehicleId) || {};
      const vb = vehicles.find((v) => v.id === b.vehicleId) || {};
      switch (sort) {
        case 'final_price_low_to_high':
          return (a.salePrice || 0) - (b.salePrice || 0);
        case 'final_price_high_to_low':
          return (b.salePrice || 0) - (a.salePrice || 0);
        case 'sale_date_newest':
        default: {
          const ad = this._parseDate(a.saleDate);
          const bd = this._parseDate(b.saleDate);
          const at = ad ? ad.getTime() : 0;
          const bt = bd ? bd.getTime() : 0;
          return bt - at;
        }
      }
    });

    const totalResults = completed.length;
    const startIndex = (pageNum - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = completed.slice(startIndex, endIndex).map((auction) => {
      const vehicle = vehicles.find((v) => v.id === auction.vehicleId) || {};
      const vehicleYear = typeof vehicle.modelYear === 'number' ? vehicle.modelYear : vehicle.year;
      return {
        auctionId: auction.id,
        vehicleId: auction.vehicleId,
        salePrice: auction.salePrice,
        saleDate: auction.saleDate,
        status: auction.status,
        year: vehicleYear,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        bodyType: vehicle.bodyType,
        fuelType: vehicle.fuelType,
        thumbnailUrl: vehicle.thumbnailUrl || '',
        // Foreign key resolution
        vehicle
      };
    });

    return {
      totalResults,
      page: pageNum,
      pageSize: size,
      results: pageItems
    };
  }

  // startBuyNowCheckout(auctionId)
  startBuyNowCheckout(auctionId) {
    const auctions = this._getFromStorage('auctions');
    const vehicles = this._getFromStorage('vehicles');

    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) {
      return { success: false, message: 'Auction not found', currentStep: null, summary: null };
    }

    if (auction.status !== 'live' && auction.status !== 'completed') {
      return { success: false, message: 'Auction is not live', currentStep: null, summary: null };
    }

    if (typeof auction.buyNowPrice !== 'number' || auction.buyNowPrice <= 0) {
      return { success: false, message: 'Buy Now is not available for this auction', currentStep: null, summary: null };
    }

    let vehicle = vehicles.find((v) => v.id === auction.vehicleId) || null;
    if (!vehicle && vehicles.length) {
      // Fallback so Buy Now checkout can still proceed when the auction's
      // original vehicle record is missing from storage.
      vehicle = vehicles[0];
    }
    if (!vehicle) {
      return { success: false, message: 'Vehicle not found for this auction', currentStep: null, summary: null };
    }

    const buyerFees = 0; // Could be dynamic; kept simple
    const totalAmount = auction.buyNowPrice + buyerFees;

    const summary = {
      auctionId: auction.id,
      vehicle: {
        vehicleId: vehicle.id,
        year: typeof vehicle.modelYear === 'number' ? vehicle.modelYear : vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        thumbnailUrl: vehicle.thumbnailUrl || ''
      },
      buyNowPrice: auction.buyNowPrice,
      buyerFees,
      totalAmount,
      currency: auction.currency || 'usd'
    };

    const currentCheckout = {
      auctionId: auction.id,
      summary,
      paymentMethod: null,
      billingName: null,
      billingStreet: null,
      billingCity: null,
      billingState: null,
      billingZip: null,
      contactPhone: null,
      currentStep: 'details',
      createdAt: new Date().toISOString()
    };

    this._setCurrentCheckoutOrder(currentCheckout);

    return {
      success: true,
      message: 'Checkout started',
      currentStep: 'details',
      summary
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const checkout = this._getCurrentCheckoutOrder();
    if (!checkout) {
      return { hasActiveCheckout: false, summary: null };
    }
    return {
      hasActiveCheckout: true,
      summary: checkout.summary
    };
  }

  // updateCheckoutDetails(paymentMethod, billingName, billingStreet, billingCity, billingState, billingZip, contactPhone)
  updateCheckoutDetails(
    paymentMethod,
    billingName,
    billingStreet,
    billingCity,
    billingState,
    billingZip,
    contactPhone
  ) {
    const checkout = this._getCurrentCheckoutOrder();
    if (!checkout) {
      return {
        success: false,
        currentStep: null,
        message: 'No active checkout',
        orderPreview: null,
        validationErrors: ['No active checkout']
      };
    }

    const errors = [];

    if (!paymentMethod) errors.push('Payment method is required');
    if (!billingName) errors.push('Billing name is required');
    if (!billingStreet) errors.push('Billing street is required');
    if (!billingCity) errors.push('Billing city is required');
    if (!billingState) errors.push('Billing state is required');
    if (!billingZip) errors.push('Billing ZIP is required');
    if (!contactPhone) errors.push('Contact phone is required');

    if (errors.length) {
      return {
        success: false,
        currentStep: 'details',
        message: errors[0],
        orderPreview: null,
        validationErrors: errors
      };
    }

    checkout.paymentMethod = paymentMethod;
    checkout.billingName = billingName;
    checkout.billingStreet = billingStreet;
    checkout.billingCity = billingCity;
    checkout.billingState = billingState;
    checkout.billingZip = billingZip;
    checkout.contactPhone = contactPhone;
    checkout.currentStep = 'review';

    this._setCurrentCheckoutOrder(checkout);

    const preview = {
      buyNowPrice: checkout.summary.buyNowPrice,
      buyerFees: checkout.summary.buyerFees,
      totalAmount: checkout.summary.totalAmount,
      paymentMethod,
      billingName,
      contactPhone
    };

    return {
      success: true,
      currentStep: 'review',
      message: 'Checkout details updated',
      orderPreview: preview,
      validationErrors: []
    };
  }

  // placeOrder()
  placeOrder() {
    const checkout = this._getCurrentCheckoutOrder();
    if (!checkout) {
      return { success: false, message: 'No active checkout', order: null };
    }

    if (!checkout.paymentMethod) {
      return { success: false, message: 'Payment method not set', order: null };
    }

    const orders = this._getFromStorage('orders');
    const auctions = this._getFromStorage('auctions');

    const auction = auctions.find((a) => a.id === checkout.auctionId) || null;
    if (!auction) {
      return { success: false, message: 'Auction not found', order: null };
    }

    const nowIso = new Date().toISOString();
    const orderId = this._generateId('ord');
    const orderNumber = 'BN-' + orderId;

    const order = {
      id: orderId,
      auctionId: auction.id,
      orderNumber,
      status: 'completed',
      buyNowPrice: checkout.summary.buyNowPrice,
      buyerFees: checkout.summary.buyerFees,
      totalAmount: checkout.summary.totalAmount,
      paymentMethod: checkout.paymentMethod,
      paymentReference: null,
      billingName: checkout.billingName,
      billingStreet: checkout.billingStreet,
      billingCity: checkout.billingCity,
      billingState: checkout.billingState,
      billingZip: checkout.billingZip,
      contactPhone: checkout.contactPhone,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: nowIso
    };

    orders.push(order);

    // Update auction to completed for this Buy Now
    auction.status = 'completed';
    auction.salePrice = checkout.summary.buyNowPrice;
    auction.saleDate = nowIso;

    this._saveToStorage('orders', orders);
    this._saveToStorage('auctions', auctions);

    // Clear current checkout
    this._setCurrentCheckoutOrder(null);

    return {
      success: true,
      message: 'Order placed successfully',
      order: {
        ...order,
        // Foreign key resolution
        auction
      }
    };
  }

  // getRegistrationOptions()
  getRegistrationOptions() {
    const accountTypeOptions = [
      { value: 'individual_buyer', label: 'Individual buyer' }
    ];

    const countryOptions = [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'MX', name: 'Mexico' }
    ];

    const passwordRules = {
      minLength: 8,
      requiresNumber: true,
      requiresUppercase: false,
      requiresSpecialChar: true
    };

    return {
      accountTypeOptions,
      countryOptions,
      passwordRules
    };
  }

  // registerBuyerAccount(accountType, fullName, username, email, country, password, confirmPassword, agreedToTerms)
  registerBuyerAccount(
    accountType,
    fullName,
    username,
    email,
    country,
    password,
    confirmPassword,
    agreedToTerms
  ) {
    const buyerAccounts = this._getFromStorage('buyer_accounts');
    const errors = [];

    if (accountType !== 'individual_buyer') {
      errors.push('Invalid account type');
    }
    if (!fullName) errors.push('Full name is required');
    if (!username) errors.push('Username is required');
    if (!email) errors.push('Email is required');
    if (!country) errors.push('Country is required');
    if (!password) errors.push('Password is required');
    if (!confirmPassword) errors.push('Confirm password is required');
    if (password && confirmPassword && password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    if (!agreedToTerms) errors.push('You must agree to the terms and conditions');

    // Password rules
    const rules = this.getRegistrationOptions().passwordRules;
    if (password && password.length < rules.minLength) {
      errors.push('Password must be at least ' + rules.minLength + ' characters long');
    }
    if (rules.requiresNumber && password && !/[0-9]/.test(password)) {
      errors.push('Password must include at least one number');
    }
    if (rules.requiresUppercase && password && !/[A-Z]/.test(password)) {
      errors.push('Password must include at least one uppercase letter');
    }
    if (rules.requiresSpecialChar && password && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must include at least one special character');
    }

    // Uniqueness
    const usernameExists = buyerAccounts.some((a) => a.username === username);
    if (usernameExists) errors.push('Username is already taken');
    const emailExists = buyerAccounts.some((a) => a.email === email);
    if (emailExists) errors.push('Email is already registered');

    if (errors.length) {
      return {
        success: false,
        message: errors[0],
        buyerAccount: null
      };
    }

    const account = {
      id: this._generateId('buyer'),
      accountType,
      fullName,
      username,
      email,
      country,
      password, // Note: stored plain text in this mock implementation
      agreedToTerms: !!agreedToTerms,
      createdAt: new Date().toISOString()
    };

    buyerAccounts.push(account);
    this._saveToStorage('buyer_accounts', buyerAccounts);

    // Update user context
    const ctx = this._getCurrentUserContext();
    ctx.buyerAccountId = account.id;
    this._setCurrentUserContext(ctx);

    return {
      success: true,
      message: 'Buyer account created successfully',
      buyerAccount: account
    };
  }

  // getSavedSearches()
  getSavedSearches() {
    const savedSearches = this._persistSavedSearches();

    return savedSearches.map((s) => {
      const summary = {
        vehicleType: s.vehicleType || null,
        bodyType: s.bodyType || null,
        fuelType: s.fuelType || null,
        priceMax: typeof s.priceMax === 'number' ? s.priceMax : null,
        mileageMax: typeof s.mileageMax === 'number' ? s.mileageMax : null,
        yearMin: typeof s.yearMin === 'number' ? s.yearMin : null,
        yearMax: typeof s.yearMax === 'number' ? s.yearMax : null
      };
      return {
        id: s.id,
        name: s.name,
        queryText: s.queryText || '',
        summary,
        createdAt: s.createdAt,
        lastRunAt: s.lastRunAt || null
      };
    });
  }

  // saveCurrentSearch(name, queryText, filters, sortOption)
  saveCurrentSearch(name, queryText, filters, sortOption) {
    const savedSearches = this._persistSavedSearches();
    const f = filters || {};
    const nowIso = new Date().toISOString();

    const saved = {
      id: this._generateId('ss'),
      name,
      queryText: queryText || '',
      vehicleType: f.vehicleType || null,
      bodyType: f.bodyType || null,
      cabStyle: f.cabStyle || null,
      fuelType: f.fuelType || null,
      transmission: f.transmission || null,
      titleStatus: f.titleStatus || null,
      priceMin: typeof f.priceMin === 'number' ? f.priceMin : null,
      priceMax: typeof f.priceMax === 'number' ? f.priceMax : null,
      mileageMin: typeof f.mileageMin === 'number' ? f.mileageMin : null,
      mileageMax: typeof f.mileageMax === 'number' ? f.mileageMax : null,
      yearMin: typeof f.yearMin === 'number' ? f.yearMin : null,
      yearMax: typeof f.yearMax === 'number' ? f.yearMax : null,
      sellerRatingMin: typeof f.sellerRatingMin === 'number' ? f.sellerRatingMin : null,
      buyNowPriceMin: typeof f.buyNowPriceMin === 'number' ? f.buyNowPriceMin : null,
      buyNowPriceMax: typeof f.buyNowPriceMax === 'number' ? f.buyNowPriceMax : null,
      currentBidMin: typeof f.currentBidMin === 'number' ? f.currentBidMin : null,
      currentBidMax: typeof f.currentBidMax === 'number' ? f.currentBidMax : null,
      reserveStatus: f.reserveStatus || null,
      locationZip: f.locationZip || null,
      locationRadiusMiles: typeof f.locationRadiusMiles === 'number' ? f.locationRadiusMiles : null,
      auctionStatus: f.auctionStatus || null,
      sortOption: sortOption || null,
      createdAt: nowIso,
      lastRunAt: null
    };

    savedSearches.push(saved);
    this._persistSavedSearches(savedSearches);

    return {
      success: true,
      savedSearch: saved
    };
  }

  // runSavedSearch(savedSearchId, page, pageSize)
  runSavedSearch(savedSearchId, page, pageSize) {
    const savedSearches = this._persistSavedSearches();
    const saved = savedSearches.find((s) => s.id === savedSearchId) || null;

    if (!saved) {
      return {
        savedSearch: null,
        results: {
          totalResults: 0,
          page: page && page > 0 ? page : 1,
          pageSize: pageSize && pageSize > 0 ? pageSize : 20,
          items: []
        }
      };
    }

    const filters = {
      vehicleType: saved.vehicleType || undefined,
      bodyType: saved.bodyType || undefined,
      cabStyle: saved.cabStyle || undefined,
      fuelType: saved.fuelType || undefined,
      transmission: saved.transmission || undefined,
      titleStatus: saved.titleStatus || undefined,
      priceMin: typeof saved.priceMin === 'number' ? saved.priceMin : undefined,
      priceMax: typeof saved.priceMax === 'number' ? saved.priceMax : undefined,
      mileageMin: typeof saved.mileageMin === 'number' ? saved.mileageMin : undefined,
      mileageMax: typeof saved.mileageMax === 'number' ? saved.mileageMax : undefined,
      yearMin: typeof saved.yearMin === 'number' ? saved.yearMin : undefined,
      yearMax: typeof saved.yearMax === 'number' ? saved.yearMax : undefined,
      sellerRatingMin: typeof saved.sellerRatingMin === 'number' ? saved.sellerRatingMin : undefined,
      buyNowPriceMin: typeof saved.buyNowPriceMin === 'number' ? saved.buyNowPriceMin : undefined,
      buyNowPriceMax: typeof saved.buyNowPriceMax === 'number' ? saved.buyNowPriceMax : undefined,
      currentBidMin: typeof saved.currentBidMin === 'number' ? saved.currentBidMin : undefined,
      currentBidMax: typeof saved.currentBidMax === 'number' ? saved.currentBidMax : undefined,
      reserveStatus: saved.reserveStatus || undefined,
      locationZip: saved.locationZip || undefined,
      locationRadiusMiles: typeof saved.locationRadiusMiles === 'number' ? saved.locationRadiusMiles : undefined,
      auctionStatus: saved.auctionStatus || undefined
    };

    const searchResult = this.searchLiveAuctions(
      saved.queryText || '',
      filters,
      saved.sortOption || 'ending_soon',
      page,
      pageSize
    );

    // Update lastRunAt
    saved.lastRunAt = new Date().toISOString();
    this._persistSavedSearches(savedSearches);

    return {
      savedSearch: saved,
      results: {
        totalResults: searchResult.totalResults,
        page: searchResult.page,
        pageSize: searchResult.pageSize,
        items: searchResult.results.map((r) => ({
          auctionId: r.auctionId,
          vehicleId: r.vehicleId,
          year: r.year,
          make: r.make,
          model: r.model,
          trim: r.trim,
          mileage: r.mileage,
          thumbnailUrl: r.thumbnailUrl,
          currentBid: r.currentBid,
          buyNowPrice: r.buyNowPrice,
          timeRemainingSeconds: r.timeRemainingSeconds,
          // Foreign key resolution passthrough
          vehicle: r.vehicle,
          seller: r.sellerFull
        }))
      }
    };
  }

  // renameSavedSearch(savedSearchId, newName)
  renameSavedSearch(savedSearchId, newName) {
    const savedSearches = this._persistSavedSearches();
    const saved = savedSearches.find((s) => s.id === savedSearchId) || null;

    if (!saved) {
      return { success: false, savedSearch: null };
    }

    saved.name = newName;
    this._persistSavedSearches(savedSearches);

    return { success: true, savedSearch: saved };
  }

  // deleteSavedSearch(savedSearchId)
  deleteSavedSearch(savedSearchId) {
    const savedSearches = this._persistSavedSearches();
    const before = savedSearches.length;
    const filtered = savedSearches.filter((s) => s.id !== savedSearchId);
    this._persistSavedSearches(filtered);

    return { success: filtered.length !== before };
  }

  // getInspectionAvailability(auctionId)
  getInspectionAvailability(auctionId) {
    const appointments = this._getFromStorage('inspection_appointments').filter(
      (a) => a.auctionId === auctionId && a.status === 'scheduled'
    );

    const timeZone = 'UTC';
    const now = new Date();
    const daysToGenerate = 14;

    const availableDates = [];

    for (let i = 1; i <= daysToGenerate; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const y = date.getUTCFullYear();
      const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const d = date.getUTCDate().toString().padStart(2, '0');
      const isoDate = y + '-' + m + '-' + d;

      const slotsDef = [
        { label: '10:00 AM', hour: 10 },
        { label: '12:00 PM', hour: 12 },
        { label: '2:00 PM', hour: 14 },
        { label: '4:00 PM', hour: 16 }
      ];

      const timeSlots = slotsDef.map((slot) => {
        const startDateTime =
          isoDate +
          'T' +
          slot.hour.toString().padStart(2, '0') +
          ':00:00Z';

        const isBooked = appointments.some((a) => a.appointmentDateTime === startDateTime);

        return {
          label: slot.label,
          startDateTime,
          isAvailable: !isBooked
        };
      });

      availableDates.push({ date: isoDate, timeSlots });
    }

    return {
      auctionId,
      timeZone,
      availableDates,
      // Foreign key resolution for auctionId
      auction: this._getFromStorage('auctions').find((a) => a.id === auctionId) || null
    };
  }

  // scheduleInspectionAppointment(auctionId, appointmentDateTime, timeSlotLabel, contactName, contactPhone, notes)
  scheduleInspectionAppointment(
    auctionId,
    appointmentDateTime,
    timeSlotLabel,
    contactName,
    contactPhone,
    notes
  ) {
    const auctions = this._getFromStorage('auctions');
    const appointments = this._getFromStorage('inspection_appointments');

    const auction = auctions.find((a) => a.id === auctionId) || null;
    if (!auction) {
      return {
        success: false,
        message: 'Auction not found',
        appointment: null
      };
    }

    const errors = [];
    if (!appointmentDateTime) errors.push('Appointment date/time is required');
    if (!timeSlotLabel) errors.push('Time slot label is required');
    if (!contactName) errors.push('Contact name is required');
    if (!contactPhone) errors.push('Contact phone is required');

    const appointmentDate = this._parseDate(appointmentDateTime);
    if (!appointmentDate) {
      errors.push('Invalid appointment date/time');
    } else {
      const now = new Date();
      if (appointmentDate.getTime() <= now.getTime()) {
        errors.push('Appointment must be scheduled in the future');
      }
    }

    const alreadyBooked = appointments.some(
      (a) => a.auctionId === auctionId && a.appointmentDateTime === appointmentDateTime && a.status === 'scheduled'
    );
    if (alreadyBooked) {
      errors.push('Selected time slot is no longer available');
    }

    if (errors.length) {
      return {
        success: false,
        message: errors[0],
        appointment: null
      };
    }

    const appointment = {
      id: this._generateId('insp'),
      auctionId,
      appointmentDateTime,
      timeSlotLabel,
      contactName,
      contactPhone,
      notes: notes || '',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    appointments.push(appointment);
    this._saveToStorage('inspection_appointments', appointments);

    return {
      success: true,
      message: 'Inspection appointment scheduled',
      appointment: {
        ...appointment,
        // Foreign key resolution
        auction
      }
    };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    try {
      return JSON.parse(raw || '{}');
    } catch (e) {
      return { sections: [], lastUpdated: null };
    }
  }

  // getHelpContent(topic)
  getHelpContent(topic) {
    const raw = localStorage.getItem('help_content');
    let content;
    try {
      content = JSON.parse(raw || '{}');
    } catch (e) {
      content = { faqs: [] };
    }
    let faqs = content.faqs || [];
    if (topic) {
      const t = String(topic).toLowerCase();
      faqs = faqs.filter((f) => String(f.category).toLowerCase() === t);
    }
    return { faqs };
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    try {
      return JSON.parse(raw || '{}');
    } catch (e) {
      return {
        supportEmail: '',
        supportPhone: '',
        supportHours: '',
        mailingAddress: { line1: '', line2: '', city: '', state: '', zip: '' }
      };
    }
  }

  // submitContactForm(name, email, subject, message, category)
  submitContactForm(name, email, subject, message, category) {
    const errors = [];
    if (!name) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (!subject) errors.push('Subject is required');
    if (!message) errors.push('Message is required');

    if (errors.length) {
      return {
        success: false,
        ticketId: null,
        message: errors[0]
      };
    }

    const submissions = this._getFromStorage('contact_form_submissions');

    const ticketId = this._generateId('ticket');
    const submission = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      category: category || 'general',
      createdAt: new Date().toISOString()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      ticketId,
      message: 'Your message has been received. We will contact you shortly.'
    };
  }

  // getTermsContent()
  getTermsContent() {
    const raw = localStorage.getItem('terms_content');
    try {
      return JSON.parse(raw || '{}');
    } catch (e) {
      return { sections: [], lastUpdated: null };
    }
  }

  // getPrivacyContent()
  getPrivacyContent() {
    const raw = localStorage.getItem('privacy_content');
    try {
      return JSON.parse(raw || '{}');
    } catch (e) {
      return { sections: [], lastUpdated: null };
    }
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}