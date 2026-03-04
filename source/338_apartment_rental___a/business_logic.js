// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------------------------
  // Storage helpers
  // ----------------------------------------

  _initStorage() {
    const keys = [
      'listings',
      'amenities',
      'site_pages',
      'navigation_links',
      'favorites_lists',
      'favorite_items',
      'compare_lists',
      'compare_items',
      'shortlists',
      'shortlist_items',
      'bookings',
      'saved_search_alerts',
      'inquiry_messages',
      'viewing_requests',
      'rental_applications',
      'landmarks',
      // Extra collections used by interfaces
      'help_topics',
      'contact_requests',
      'recent_searches',
      'popular_locations',
      'popular_neighborhoods'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return typeof fallback !== 'undefined' ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof fallback !== 'undefined' ? fallback : [];
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

  // ----------------------------------------
  // Small utility helpers
  // ----------------------------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _normalize(str) {
    return (str || '').toString().trim().toLowerCase();
  }

  _parseLocationText(locationText) {
    // Returns { city, neighborhood }
    if (!locationText) {
      return { city: null, neighborhood: null };
    }
    const parts = locationText.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    let city = null;
    let neighborhood = null;
    if (parts.length >= 3) {
      // e.g. 'Back Bay, Boston, MA' => neighborhood=Back Bay, city=Boston
      neighborhood = parts[0];
      city = parts[1];
    } else if (parts.length >= 1) {
      city = parts[0];
      neighborhood = null;
    }
    return { city, neighborhood };
  }

  _safeParseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const toRad = function (v) { return (v * Math.PI) / 180; };
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _matchListingLocation(listing, locationText) {
    if (!locationText) return true;
    const parsed = this._parseLocationText(locationText);
    const cityNorm = this._normalize(parsed.city);
    const neighNorm = this._normalize(parsed.neighborhood);

    const listingCity = this._normalize(listing.city);
    const listingNeigh = this._normalize(listing.neighborhood);

    if (cityNorm && listingCity && cityNorm !== listingCity) {
      return false;
    }
    if (neighNorm && (!listingNeigh || neighNorm !== listingNeigh)) {
      return false;
    }
    return true;
  }

  // ----------------------------------------
  // Helper: get or create Favorites / Compare / Shortlist
  // ----------------------------------------

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage('favorites_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('favlist'),
      name: 'My Favorites',
      createdAt: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('favorites_lists', lists);
    return list;
  }

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('comparelist'),
      name: 'Current comparison',
      createdAt: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('compare_lists', lists);
    return list;
  }

  _getOrCreateDefaultShortlist() {
    let shortlists = this._getFromStorage('shortlists');
    let existing = null;
    for (let i = 0; i < shortlists.length; i++) {
      if (this._normalize(shortlists[i].name) === 'my shortlist') {
        existing = shortlists[i];
        break;
      }
    }
    if (existing) {
      return existing;
    }
    const shortlist = {
      id: this._generateId('shortlist'),
      name: 'My Shortlist',
      description: '',
      createdAt: this._nowIso()
    };
    shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);
    return shortlist;
  }

  // ----------------------------------------
  // Helper: search filters
  // ----------------------------------------

  _applySearchFiltersToListings(listings, filters, locationText) {
    const self = this;
    if (!filters) filters = {};

    let results = listings.filter(function (listing) {
      if (!listing || listing.status !== 'active') return false;

      // Location matching (hierarchical: city + optional neighborhood)
      if (!self._matchListingLocation(listing, locationText)) return false;

      // Price monthly
      if (typeof filters.minPriceMonthly === 'number') {
        if (typeof listing.monthlyRent !== 'number' || listing.monthlyRent < filters.minPriceMonthly) {
          return false;
        }
      }
      if (typeof filters.maxPriceMonthly === 'number') {
        if (typeof listing.monthlyRent !== 'number' || listing.monthlyRent > filters.maxPriceMonthly) {
          return false;
        }
      }

      // Price nightly
      if (typeof filters.minPriceNightly === 'number') {
        if (typeof listing.nightlyPrice !== 'number' || listing.nightlyPrice < filters.minPriceNightly) {
          return false;
        }
      }
      if (typeof filters.maxPriceNightly === 'number') {
        if (typeof listing.nightlyPrice !== 'number' || listing.nightlyPrice > filters.maxPriceNightly) {
          return false;
        }
      }

      // Bedrooms
      if (typeof filters.minBedrooms === 'number') {
        if (typeof listing.bedrooms !== 'number' || listing.bedrooms < filters.minBedrooms) {
          return false;
        }
      }
      if (typeof filters.maxBedrooms === 'number') {
        if (typeof listing.bedrooms !== 'number' || listing.bedrooms > filters.maxBedrooms) {
          return false;
        }
      }

      // Property types
      if (filters.propertyTypes && filters.propertyTypes.length) {
        if (!listing.propertyType || filters.propertyTypes.indexOf(listing.propertyType) === -1) {
          return false;
        }
      }

      // Rating
      if (typeof filters.ratingMin === 'number') {
        if (typeof listing.ratingAverage !== 'number' || listing.ratingAverage < filters.ratingMin) {
          return false;
        }
      }

      // Boolean filters & amenities hierarchy
      var amenities = listing.amenities || [];
      var hasAmenity = function (code) {
        return amenities.indexOf(code) !== -1;
      };

      if (filters.petFriendly === true) {
        if (!listing.petFriendly && !hasAmenity('pet_friendly')) return false;
      }
      if (filters.hasParking === true) {
        var parkingFlag = listing.hasParking || hasAmenity('parking') || hasAmenity('on_site_parking');
        if (!parkingFlag) return false;
      }
      if (filters.hasInUnitLaundry === true) {
        var laundryFlag = listing.hasInUnitLaundry || hasAmenity('in_unit_laundry');
        if (!laundryFlag) return false;
      }
      if (filters.hasGym === true) {
        var gymFlag = listing.hasGym || hasAmenity('gym') || hasAmenity('fitness_center');
        if (!gymFlag) return false;
      }
      if (filters.hasWifi === true) {
        var wifiFlag = listing.hasWifi || hasAmenity('wifi');
        if (!wifiFlag) return false;
      }
      if (filters.freeCancellation === true) {
        var freeCancelFlag = listing.freeCancellation || hasAmenity('free_cancellation');
        if (!freeCancelFlag) return false;
      }

      // Online application
      if (filters.onlineApplicationAvailable === true) {
        if (!listing.onlineApplicationAvailable) return false;
      }

      // Move-in-by date
      if (filters.moveInByDate) {
        var moveInFilterDate = self._safeParseDate(filters.moveInByDate);
        if (moveInFilterDate) {
          var availableFrom = self._safeParseDate(listing.moveInAvailableFrom);
          if (!availableFrom || availableFrom > moveInFilterDate) {
            return false;
          }
        }
      }

      // Booking type
      if (filters.bookingType) {
        var filterType = filters.bookingType; // 'short_term_stay' | 'long_term_rental' | 'both'
        var listingType = listing.bookingType || 'both';
        if (filterType !== 'both') {
          if (!(listingType === filterType || listingType === 'both')) {
            return false;
          }
        }
      }

      return true;
    });

    // Distance filter using Landmark or reference location name
    var hasDistanceFilter = typeof filters.maxDistanceMeters === 'number' && filters.maxDistanceMeters > 0;
    var referencePoint = null;
    var referenceLandmarkObj = null;

    if (hasDistanceFilter) {
      var landmarks = this._getFromStorage('landmarks');
      if (filters.referenceLandmarkId) {
        for (var i = 0; i < landmarks.length; i++) {
          if (landmarks[i].id === filters.referenceLandmarkId) {
            referenceLandmarkObj = landmarks[i];
            break;
          }
        }
      }
      if (!referenceLandmarkObj && filters.referenceLocationName) {
        var refNameNorm = this._normalize(filters.referenceLocationName);
        for (var j = 0; j < landmarks.length; j++) {
          if (this._normalize(landmarks[j].name) === refNameNorm) {
            referenceLandmarkObj = landmarks[j];
            break;
          }
        }
      }

      if (referenceLandmarkObj) {
        referencePoint = {
          latitude: referenceLandmarkObj.latitude,
          longitude: referenceLandmarkObj.longitude
        };
      }

      if (referencePoint) {
        results = results.filter(function (listing) {
          var dist = self._calculateDistanceMeters(
            referencePoint.latitude,
            referencePoint.longitude,
            listing.latitude,
            listing.longitude
          );
          return dist <= filters.maxDistanceMeters;
        });
      }
    }

    return {
      results: results,
      referenceLandmark: referenceLandmarkObj
    };
  }

  // ----------------------------------------
  // Helper: booking totals
  // ----------------------------------------

  _calculateBookingTotals(listing, checkInDateStr, checkOutDateStr) {
    var checkIn = this._safeParseDate(checkInDateStr);
    var checkOut = this._safeParseDate(checkOutDateStr);
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return {
        nights: 0,
        nightlyPrice: listing && typeof listing.nightlyPrice === 'number' ? listing.nightlyPrice : 0,
        subtotal: 0,
        taxes: 0,
        fees: 0,
        total: 0,
        currency: listing ? listing.currency : 'usd'
      };
    }
    var msPerNight = 24 * 60 * 60 * 1000;
    var nights = Math.round((checkOut - checkIn) / msPerNight);
    if (nights < 0) nights = 0;
    var nightlyPrice = listing && typeof listing.nightlyPrice === 'number' ? listing.nightlyPrice : 0;
    var subtotal = nightlyPrice * nights;
    var taxes = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    var fees = 0;
    var total = subtotal + taxes + fees;
    return {
      nights: nights,
      nightlyPrice: nightlyPrice,
      subtotal: subtotal,
      taxes: taxes,
      fees: fees,
      total: total,
      currency: listing ? listing.currency : 'usd'
    };
  }

  // ========================================
  // Core interface implementations
  // ========================================

  // --------------------
  // Homepage data
  // --------------------

  getHomepageData() {
    var popularLocations = this._getFromStorage('popular_locations', []);
    var popularNeighborhoods = this._getFromStorage('popular_neighborhoods', []);
    var recentSearches = this._getFromStorage('recent_searches', []);

    var favoriteItems = this._getFromStorage('favorite_items', []);
    var favoritesSummary = {
      totalCount: favoriteItems.length
    };

    var shortlists = this._getFromStorage('shortlists', []);
    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var shortlistsSummary = {
      totalShortlists: shortlists.length,
      totalListings: shortlistItems.length
    };

    var savedAlerts = this._getFromStorage('saved_search_alerts', []);
    var savedAlertsSummary = {
      totalAlerts: savedAlerts.length
    };

    return {
      popularLocations: popularLocations,
      popularNeighborhoods: popularNeighborhoods,
      recentSearches: recentSearches,
      favoritesSummary: favoritesSummary,
      shortlistsSummary: shortlistsSummary,
      savedAlertsSummary: savedAlertsSummary
    };
  }

  // --------------------
  // Search filter options
  // --------------------

  getSearchFilterOptions(locationText, bookingContext) {
    var listings = this._getFromStorage('listings', []);
    var filteredByLocation = listings.filter(function (l) {
      return l && l.status === 'active';
    });

    var self = this;
    filteredByLocation = filteredByLocation.filter(function (listing) {
      return self._matchListingLocation(listing, locationText);
    });

    if (bookingContext && bookingContext !== 'both') {
      filteredByLocation = filteredByLocation.filter(function (listing) {
        var type = listing.bookingType || 'both';
        return type === bookingContext || type === 'both';
      });
    }

    var priceMonthlyValues = [];
    var priceNightlyValues = [];
    var bedroomSet = {};

    for (var i = 0; i < filteredByLocation.length; i++) {
      var l = filteredByLocation[i];
      if (typeof l.monthlyRent === 'number') priceMonthlyValues.push(l.monthlyRent);
      if (typeof l.nightlyPrice === 'number') priceNightlyValues.push(l.nightlyPrice);
      if (typeof l.bedrooms === 'number') bedroomSet[l.bedrooms] = true;
    }

    var priceMonthlyRange = { min: null, max: null };
    if (priceMonthlyValues.length) {
      priceMonthlyValues.sort(function (a, b) { return a - b; });
      priceMonthlyRange.min = priceMonthlyValues[0];
      priceMonthlyRange.max = priceMonthlyValues[priceMonthlyValues.length - 1];
    }

    var priceNightlyRange = { min: null, max: null };
    if (priceNightlyValues.length) {
      priceNightlyValues.sort(function (a, b) { return a - b; });
      priceNightlyRange.min = priceNightlyValues[0];
      priceNightlyRange.max = priceNightlyValues[priceNightlyValues.length - 1];
    }

    var bedroomOptions = Object.keys(bedroomSet).map(function (k) { return parseInt(k, 10); });
    bedroomOptions.sort(function (a, b) { return a - b; });
    bedroomOptions = bedroomOptions.map(function (value) {
      var label;
      if (value === 0) label = 'Studio';
      else if (value === 1) label = '1 bedroom';
      else label = value + ' bedrooms';
      return { value: value, label: label };
    });

    var ratingOptions = [
      { value: 0, label: 'Any rating' },
      { value: 3, label: '3.0+ stars' },
      { value: 4, label: '4.0+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    var propertyTypeOptions = [
      { value: 'studio', label: 'Studio' },
      { value: 'entire_place', label: 'Entire place' },
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'private_room', label: 'Private room' },
      { value: 'shared_room', label: 'Shared room' }
    ];

    var amenityOptions = this._getFromStorage('amenities', []);

    var distanceOptionsMeters = [
      { value: 500, label: '500 m' },
      { value: 1000, label: '1 km' },
      { value: 2000, label: '2 km' },
      { value: 5000, label: '5 km' }
    ];

    var sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      priceMonthlyRange: priceMonthlyRange,
      priceNightlyRange: priceNightlyRange,
      bedroomOptions: bedroomOptions,
      ratingOptions: ratingOptions,
      propertyTypeOptions: propertyTypeOptions,
      amenityOptions: amenityOptions,
      distanceOptionsMeters: distanceOptionsMeters,
      sortOptions: sortOptions
    };
  }

  // --------------------
  // Landmarks
  // --------------------

  getLandmarksForLocation(city) {
    // Support inputs like "Berlin" or "Berlin, Germany" by extracting the city part
    var parsed = this._parseLocationText(city);
    var cityName = parsed && parsed.city ? parsed.city : city;
    var cityNorm = this._normalize(cityName);
    var landmarks = this._getFromStorage('landmarks', []);
    return landmarks.filter(function (lm) {
      if (!cityNorm) return true;
      return (
        lm &&
        typeof lm.city === 'string' &&
        lm.city.toLowerCase() === cityNorm
      );
    });
  }

  // --------------------
  // Search listings
  // --------------------

  searchListings(locationText, dateRange, guests, filters, sort, page, pageSize) {
    if (typeof page === 'undefined' || page === null) page = 1;
    if (typeof pageSize === 'undefined' || pageSize === null) pageSize = 20;

    var listings = this._getFromStorage('listings', []);

    // First, apply filters (including location) and distance
    var filteredResult = this._applySearchFiltersToListings(listings, filters || {}, locationText);
    var results = filteredResult.results;
    var referenceLandmarkObj = filteredResult.referenceLandmark || null;

    // Date / guests constraints for short-term stays if dateRange provided
    if (dateRange && dateRange.checkInDate && dateRange.checkOutDate) {
      // In this simplified logic, we just require listing.bookingType to allow short_term_stay or both
      results = results.filter(function (listing) {
        var type = listing.bookingType || 'both';
        return type === 'short_term_stay' || type === 'both';
      });
    }

    // Sorting
    var sortBy = sort && sort.sortBy ? sort.sortBy : 'relevance';
    var sortOrder = sort && sort.sortOrder ? sort.sortOrder : 'asc';
    var priceMetric = sort && sort.priceMetric ? sort.priceMetric : 'monthly';

    if (sortBy === 'price') {
      results.sort(function (a, b) {
        var pa, pb;
        if (priceMetric === 'nightly') {
          pa = typeof a.nightlyPrice === 'number' ? a.nightlyPrice : Number.POSITIVE_INFINITY;
          pb = typeof b.nightlyPrice === 'number' ? b.nightlyPrice : Number.POSITIVE_INFINITY;
        } else {
          pa = typeof a.monthlyRent === 'number' ? a.monthlyRent : Number.POSITIVE_INFINITY;
          pb = typeof b.monthlyRent === 'number' ? b.monthlyRent : Number.POSITIVE_INFINITY;
        }
        var diff = pa - pb;
        return sortOrder === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'rating') {
      results.sort(function (a, b) {
        var ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        var rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        var diff = ra - rb;
        return sortOrder === 'asc' ? diff : -diff;
      });
    } else {
      // relevance: keep existing order (no-op)
    }

    var totalResults = results.length;
    var startIndex = (page - 1) * pageSize;
    if (startIndex < 0) startIndex = 0;
    var pagedListings = results.slice(startIndex, startIndex + pageSize);

    // Map center
    var mapCenter = null;
    if (referenceLandmarkObj) {
      mapCenter = {
        latitude: referenceLandmarkObj.latitude,
        longitude: referenceLandmarkObj.longitude
      };
    } else if (pagedListings.length > 0) {
      mapCenter = {
        latitude: pagedListings[0].latitude,
        longitude: pagedListings[0].longitude
      };
    }

    var appliedFilters = filters || {};

    var refLandmarkReturn = null;
    if (referenceLandmarkObj) {
      refLandmarkReturn = {
        id: referenceLandmarkObj.id,
        name: referenceLandmarkObj.name,
        latitude: referenceLandmarkObj.latitude,
        longitude: referenceLandmarkObj.longitude
      };
    }

    return {
      listings: pagedListings,
      totalResults: totalResults,
      page: page,
      pageSize: pageSize,
      appliedFilters: appliedFilters,
      sort: {
        sortBy: sortBy,
        sortOrder: sortOrder,
        priceMetric: priceMetric
      },
      mapCenter: mapCenter,
      referenceLandmark: refLandmarkReturn
    };
  }

  // --------------------
  // Listing detail
  // --------------------

  getListingDetail(listingId) {
    var listings = this._getFromStorage('listings', []);
    var listing = null;
    for (var i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }

    if (!listing) {
      return {
        listing: null,
        isFavorited: false,
        isInCompareList: false,
        shortlistIds: [],
        canBook: false,
        canScheduleViewing: false,
        canSendInquiry: false,
        canApplyOnline: false,
        priceSummary: {
          monthlyRent: null,
          nightlyPrice: null,
          currency: 'usd',
          priceLabel: ''
        },
        securityDeposit: null,
        rating: { average: null, count: 0 },
        amenitiesDetailed: [],
        distanceToReference: null,
        photos: []
      };
    }

    var favoriteItems = this._getFromStorage('favorite_items', []);
    var isFavorited = false;
    for (var j = 0; j < favoriteItems.length; j++) {
      if (favoriteItems[j].listingId === listingId) {
        isFavorited = true;
        break;
      }
    }

    var compareItems = this._getFromStorage('compare_items', []);
    var compareList = this._getFromStorage('compare_lists', []);
    var compareListId = compareList.length > 0 ? compareList[0].id : null;
    var isInCompareList = false;
    if (compareListId) {
      for (var k = 0; k < compareItems.length; k++) {
        if (compareItems[k].compareListId === compareListId && compareItems[k].listingId === listingId) {
          isInCompareList = true;
          break;
        }
      }
    }

    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var shortlistIdsSet = {};
    for (var s = 0; s < shortlistItems.length; s++) {
      if (shortlistItems[s].listingId === listingId) {
        shortlistIdsSet[shortlistItems[s].shortlistId] = true;
      }
    }
    var shortlistIds = Object.keys(shortlistIdsSet);

    var canBook = !!listing.supportsBooking;
    var canScheduleViewing = !!listing.supportsViewingRequests;
    var canSendInquiry = !!listing.supportsInquiries;
    var canApplyOnline = !!listing.onlineApplicationAvailable;

    var priceLabel = '';
    if (typeof listing.monthlyRent === 'number') {
      priceLabel = (listing.currency === 'eur' ? '€' : '$') + listing.monthlyRent + ' / month';
    } else if (typeof listing.nightlyPrice === 'number') {
      priceLabel = (listing.currency === 'eur' ? '€' : '$') + listing.nightlyPrice + ' / night';
    }

    var priceSummary = {
      monthlyRent: typeof listing.monthlyRent === 'number' ? listing.monthlyRent : null,
      nightlyPrice: typeof listing.nightlyPrice === 'number' ? listing.nightlyPrice : null,
      currency: listing.currency,
      priceLabel: priceLabel
    };

    var rating = {
      average: typeof listing.ratingAverage === 'number' ? listing.ratingAverage : null,
      count: typeof listing.ratingCount === 'number' ? listing.ratingCount : 0
    };

    // Resolve amenities to Amenity objects
    var allAmenities = this._getFromStorage('amenities', []);
    var listingAmenityCodes = listing.amenities || [];
    var amenitiesDetailed = [];
    for (var a = 0; a < listingAmenityCodes.length; a++) {
      var code = listingAmenityCodes[a];
      for (var b = 0; b < allAmenities.length; b++) {
        if (allAmenities[b].code === code) {
          amenitiesDetailed.push(allAmenities[b]);
        }
      }
    }

    var photos = listing.photos || [];

    return {
      listing: listing,
      isFavorited: isFavorited,
      isInCompareList: isInCompareList,
      shortlistIds: shortlistIds,
      canBook: canBook,
      canScheduleViewing: canScheduleViewing,
      canSendInquiry: canSendInquiry,
      canApplyOnline: canApplyOnline,
      priceSummary: priceSummary,
      securityDeposit: typeof listing.securityDeposit === 'number' ? listing.securityDeposit : null,
      rating: rating,
      amenitiesDetailed: amenitiesDetailed,
      distanceToReference: null,
      photos: photos
    };
  }

  // --------------------
  // Favorites
  // --------------------

  toggleFavoriteForListing(listingId, sourcePage) {
    if (!sourcePage) sourcePage = 'listing_detail';
    var allowedSources = ['search_results', 'listing_detail', 'compare', 'shortlist'];
    var sourceValue = allowedSources.indexOf(sourcePage) !== -1 ? sourcePage : 'listing_detail';

    var favoritesList = this._getOrCreateFavoritesList();
    var favoriteItems = this._getFromStorage('favorite_items', []);

    var existingIndex = -1;
    for (var i = 0; i < favoriteItems.length; i++) {
      if (favoriteItems[i].favoritesListId === favoritesList.id && favoriteItems[i].listingId === listingId) {
        existingIndex = i;
        break;
      }
    }

    var isFavorited;
    if (existingIndex !== -1) {
      // Remove
      favoriteItems.splice(existingIndex, 1);
      isFavorited = false;
    } else {
      // Add
      var item = {
        id: this._generateId('favitem'),
        favoritesListId: favoritesList.id,
        listingId: listingId,
        addedAt: this._nowIso(),
        source: sourceValue
      };
      favoriteItems.push(item);
      isFavorited = true;
    }

    this._saveToStorage('favorite_items', favoriteItems);

    return {
      success: true,
      isFavorited: isFavorited,
      favoritesCount: favoriteItems.length
    };
  }

  getFavoritesListItems(sort, filters) {
    sort = sort || {};
    filters = filters || {};

    var favoritesList = this._getOrCreateFavoritesList();
    var favoriteItems = this._getFromStorage('favorite_items', []);
    var listings = this._getFromStorage('listings', []);

    var items = [];
    for (var i = 0; i < favoriteItems.length; i++) {
      var fi = favoriteItems[i];
      if (fi.favoritesListId !== favoritesList.id) continue;
      var listing = null;
      for (var j = 0; j < listings.length; j++) {
        if (listings[j].id === fi.listingId) {
          listing = listings[j];
          break;
        }
      }
      if (!listing) continue;

      // Apply filters based on listing
      if (filters.city && this._normalize(listing.city) !== this._normalize(filters.city)) {
        continue;
      }
      if (typeof filters.minPriceMonthly === 'number') {
        if (typeof listing.monthlyRent !== 'number' || listing.monthlyRent < filters.minPriceMonthly) continue;
      }
      if (typeof filters.maxPriceMonthly === 'number') {
        if (typeof listing.monthlyRent !== 'number' || listing.monthlyRent > filters.maxPriceMonthly) continue;
      }
      if (typeof filters.minBedrooms === 'number') {
        if (typeof listing.bedrooms !== 'number' || listing.bedrooms < filters.minBedrooms) continue;
      }
      if (typeof filters.maxBedrooms === 'number') {
        if (typeof listing.bedrooms !== 'number' || listing.bedrooms > filters.maxBedrooms) continue;
      }
      if (filters.propertyTypes && filters.propertyTypes.length) {
        if (!listing.propertyType || filters.propertyTypes.indexOf(listing.propertyType) === -1) continue;
      }
      if (typeof filters.ratingMin === 'number') {
        if (typeof listing.ratingAverage !== 'number' || listing.ratingAverage < filters.ratingMin) continue;
      }

      items.push({
        favoriteItemId: fi.id,
        addedAt: fi.addedAt,
        listing: {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          state: listing.state,
          country: listing.country,
          neighborhood: listing.neighborhood,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          monthlyRent: listing.monthlyRent,
          nightlyPrice: listing.nightlyPrice,
          currency: listing.currency,
          ratingAverage: listing.ratingAverage,
          ratingCount: listing.ratingCount
        }
      });
    }

    var sortBy = sort.sortBy || 'date_added';
    var sortOrder = sort.sortOrder || 'desc';

    items.sort(function (a, b) {
      var factor = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'price') {
        var pa = typeof a.listing.monthlyRent === 'number' ? a.listing.monthlyRent : (typeof a.listing.nightlyPrice === 'number' ? a.listing.nightlyPrice : Number.POSITIVE_INFINITY);
        var pb = typeof b.listing.monthlyRent === 'number' ? b.listing.monthlyRent : (typeof b.listing.nightlyPrice === 'number' ? b.listing.nightlyPrice : Number.POSITIVE_INFINITY);
        if (pa === pb) return 0;
        return pa < pb ? -1 * factor : 1 * factor;
      } else if (sortBy === 'rating') {
        var ra = typeof a.listing.ratingAverage === 'number' ? a.listing.ratingAverage : 0;
        var rb = typeof b.listing.ratingAverage === 'number' ? b.listing.ratingAverage : 0;
        if (ra === rb) return 0;
        return ra < rb ? -1 * factor : 1 * factor;
      } else {
        // date_added
        var da = a.addedAt || '';
        var db = b.addedAt || '';
        if (da === db) return 0;
        return da < db ? -1 * factor : 1 * factor;
      }
    });

    return {
      items: items,
      totalCount: items.length
    };
  }

  removeFavoriteListing(favoriteItemId) {
    var favoriteItems = this._getFromStorage('favorite_items', []);
    var index = -1;
    for (var i = 0; i < favoriteItems.length; i++) {
      if (favoriteItems[i].id === favoriteItemId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      favoriteItems.splice(index, 1);
      this._saveToStorage('favorite_items', favoriteItems);
      return { success: true, remainingCount: favoriteItems.length };
    }
    return { success: false, remainingCount: favoriteItems.length };
  }

  moveFavoriteToShortlist(favoriteItemId, targetShortlistId, note, createNewShortlist, newShortlistName, removeFromFavorites) {
    if (typeof createNewShortlist === 'undefined' || createNewShortlist === null) createNewShortlist = false;
    if (typeof removeFromFavorites === 'undefined' || removeFromFavorites === null) removeFromFavorites = true;

    var favoriteItems = this._getFromStorage('favorite_items', []);
    var favorite = null;
    var favIndex = -1;
    for (var i = 0; i < favoriteItems.length; i++) {
      if (favoriteItems[i].id === favoriteItemId) {
        favorite = favoriteItems[i];
        favIndex = i;
        break;
      }
    }
    if (!favorite) {
      return { success: false, shortlistId: null, shortlistItemId: null, favoriteRemoved: false };
    }

    var shortlists = this._getFromStorage('shortlists', []);
    var shortlist = null;

    if (targetShortlistId) {
      for (var j = 0; j < shortlists.length; j++) {
        if (shortlists[j].id === targetShortlistId) {
          shortlist = shortlists[j];
          break;
        }
      }
    }

    if (!shortlist) {
      if (createNewShortlist) {
        shortlist = {
          id: this._generateId('shortlist'),
          name: newShortlistName || 'My Shortlist',
          description: '',
          createdAt: this._nowIso()
        };
        shortlists.push(shortlist);
        this._saveToStorage('shortlists', shortlists);
      } else {
        shortlist = this._getOrCreateDefaultShortlist();
      }
    }

    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var shortlistItem = {
      id: this._generateId('shortitem'),
      shortlistId: shortlist.id,
      listingId: favorite.listingId,
      note: note || '',
      addedAt: this._nowIso()
    };
    shortlistItems.push(shortlistItem);
    this._saveToStorage('shortlist_items', shortlistItems);

    var favoriteRemoved = false;
    if (removeFromFavorites && favIndex !== -1) {
      favoriteItems.splice(favIndex, 1);
      this._saveToStorage('favorite_items', favoriteItems);
      favoriteRemoved = true;
    }

    return {
      success: true,
      shortlistId: shortlist.id,
      shortlistItemId: shortlistItem.id,
      favoriteRemoved: favoriteRemoved
    };
  }

  // --------------------
  // Compare list
  // --------------------

  getCompareListDetails() {
    var compareList = this._getOrCreateCompareList();
    var compareItems = this._getFromStorage('compare_items', []);
    var listings = this._getFromStorage('listings', []);

    var items = [];
    for (var i = 0; i < compareItems.length; i++) {
      var ci = compareItems[i];
      if (ci.compareListId !== compareList.id) continue;
      var listing = null;
      for (var j = 0; j < listings.length; j++) {
        if (listings[j].id === ci.listingId) {
          listing = listings[j];
          break;
        }
      }
      if (!listing) continue;
      items.push({
        compareItemId: ci.id,
        addedAt: ci.addedAt,
        listing: {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          neighborhood: listing.neighborhood,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          sizeSqMeters: listing.sizeSqMeters,
          monthlyRent: listing.monthlyRent,
          nightlyPrice: listing.nightlyPrice,
          currency: listing.currency,
          securityDeposit: listing.securityDeposit,
          ratingAverage: listing.ratingAverage,
          ratingCount: listing.ratingCount,
          hasParking: listing.hasParking,
          hasInUnitLaundry: listing.hasInUnitLaundry,
          hasGym: listing.hasGym,
          petFriendly: listing.petFriendly
        }
      });
    }

    // Comparison highlights: lowest security deposit
    var minSecurityDeposit = null;
    var minSecurityDepositListingId = null;
    var securityDepositValues = [];

    for (var k = 0; k < items.length; k++) {
      var sd = items[k].listing.securityDeposit;
      if (typeof sd === 'number') {
        securityDepositValues.push({ listingId: items[k].listing.id, securityDeposit: sd });
        if (minSecurityDeposit === null || sd < minSecurityDeposit) {
          minSecurityDeposit = sd;
          minSecurityDepositListingId = items[k].listing.id;
        }
      }
    }

    return {
      compareListId: compareList.id,
      items: items,
      comparisonHighlights: {
        minSecurityDepositListingId: minSecurityDepositListingId,
        securityDepositValues: securityDepositValues
      }
    };
  }

  addListingToCompare(listingId) {
    var compareList = this._getOrCreateCompareList();
    var compareItems = this._getFromStorage('compare_items', []);

    var exists = false;
    for (var i = 0; i < compareItems.length; i++) {
      if (compareItems[i].compareListId === compareList.id && compareItems[i].listingId === listingId) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      compareItems.push({
        id: this._generateId('compareitem'),
        compareListId: compareList.id,
        listingId: listingId,
        addedAt: this._nowIso()
      });
      this._saveToStorage('compare_items', compareItems);
    }

    var count = 0;
    for (var j = 0; j < compareItems.length; j++) {
      if (compareItems[j].compareListId === compareList.id) count++;
    }

    return {
      success: true,
      compareListId: compareList.id,
      compareItemCount: count
    };
  }

  removeListingFromCompare(listingId) {
    var compareList = this._getOrCreateCompareList();
    var compareItems = this._getFromStorage('compare_items', []);
    var changed = false;

    for (var i = compareItems.length - 1; i >= 0; i--) {
      if (compareItems[i].compareListId === compareList.id && compareItems[i].listingId === listingId) {
        compareItems.splice(i, 1);
        changed = true;
      }
    }

    if (changed) {
      this._saveToStorage('compare_items', compareItems);
    }

    var count = 0;
    for (var j = 0; j < compareItems.length; j++) {
      if (compareItems[j].compareListId === compareList.id) count++;
    }

    return {
      success: true,
      compareItemCount: count
    };
  }

  clearCompareList() {
    var compareList = this._getOrCreateCompareList();
    var compareItems = this._getFromStorage('compare_items', []);
    var newItems = [];
    for (var i = 0; i < compareItems.length; i++) {
      if (compareItems[i].compareListId !== compareList.id) {
        newItems.push(compareItems[i]);
      }
    }
    this._saveToStorage('compare_items', newItems);
    return { success: true };
  }

  // --------------------
  // Shortlists
  // --------------------

  createShortlist(name, description) {
    var shortlists = this._getFromStorage('shortlists', []);
    var shortlist = {
      id: this._generateId('shortlist'),
      name: name,
      description: description || '',
      createdAt: this._nowIso()
    };
    shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);
    return { shortlist: shortlist };
  }

  getShortlists() {
    var shortlists = this._getFromStorage('shortlists', []);
    return { shortlists: shortlists };
  }

  getShortlistItems(shortlistId) {
    var shortlists = this._getFromStorage('shortlists', []);
    var shortlist = null;
    for (var i = 0; i < shortlists.length; i++) {
      if (shortlists[i].id === shortlistId) {
        shortlist = shortlists[i];
        break;
      }
    }

    if (!shortlist) {
      return {
        shortlist: null,
        items: []
      };
    }

    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var listings = this._getFromStorage('listings', []);

    var items = [];
    for (var j = 0; j < shortlistItems.length; j++) {
      var si = shortlistItems[j];
      if (si.shortlistId !== shortlistId) continue;
      var listing = null;
      for (var k = 0; k < listings.length; k++) {
        if (listings[k].id === si.listingId) {
          listing = listings[k];
          break;
        }
      }
      if (!listing) continue;
      items.push({
        shortlistItemId: si.id,
        note: si.note,
        addedAt: si.addedAt,
        listing: {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          neighborhood: listing.neighborhood,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          monthlyRent: listing.monthlyRent,
          nightlyPrice: listing.nightlyPrice,
          currency: listing.currency,
          ratingAverage: listing.ratingAverage
        }
      });
    }

    return {
      shortlist: shortlist,
      items: items
    };
  }

  addListingToShortlist(listingId, shortlistId, note, createIfNotExists, newShortlistName) {
    if (typeof createIfNotExists === 'undefined' || createIfNotExists === null) createIfNotExists = false;

    var shortlists = this._getFromStorage('shortlists', []);
    var shortlist = null;

    if (shortlistId) {
      for (var i = 0; i < shortlists.length; i++) {
        if (shortlists[i].id === shortlistId) {
          shortlist = shortlists[i];
          break;
        }
      }
    }

    if (!shortlist) {
      if (createIfNotExists) {
        shortlist = {
          id: this._generateId('shortlist'),
          name: newShortlistName || 'My Shortlist',
          description: '',
          createdAt: this._nowIso()
        };
        shortlists.push(shortlist);
        this._saveToStorage('shortlists', shortlists);
      } else {
        shortlist = this._getOrCreateDefaultShortlist();
      }
    }

    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var item = {
      id: this._generateId('shortitem'),
      shortlistId: shortlist.id,
      listingId: listingId,
      note: note || '',
      addedAt: this._nowIso()
    };
    shortlistItems.push(item);
    this._saveToStorage('shortlist_items', shortlistItems);

    return {
      success: true,
      shortlistId: shortlist.id,
      shortlistItemId: item.id
    };
  }

  updateShortlistItemNote(shortlistItemId, note) {
    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var updated = false;
    for (var i = 0; i < shortlistItems.length; i++) {
      if (shortlistItems[i].id === shortlistItemId) {
        shortlistItems[i].note = note;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._saveToStorage('shortlist_items', shortlistItems);
    }
    return { success: updated };
  }

  removeShortlistItem(shortlistItemId) {
    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var index = -1;
    for (var i = 0; i < shortlistItems.length; i++) {
      if (shortlistItems[i].id === shortlistItemId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      shortlistItems.splice(index, 1);
      this._saveToStorage('shortlist_items', shortlistItems);
      return { success: true };
    }
    return { success: false };
  }

  convertShortlistItemToFavorite(shortlistItemId, keepInShortlist) {
    if (typeof keepInShortlist === 'undefined' || keepInShortlist === null) keepInShortlist = true;

    var shortlistItems = this._getFromStorage('shortlist_items', []);
    var item = null;
    var itemIndex = -1;
    for (var i = 0; i < shortlistItems.length; i++) {
      if (shortlistItems[i].id === shortlistItemId) {
        item = shortlistItems[i];
        itemIndex = i;
        break;
      }
    }
    if (!item) {
      return { success: false, favoriteItemId: null };
    }

    var favoritesList = this._getOrCreateFavoritesList();
    var favoriteItems = this._getFromStorage('favorite_items', []);

    var existingFavorite = null;
    for (var j = 0; j < favoriteItems.length; j++) {
      if (favoriteItems[j].favoritesListId === favoritesList.id && favoriteItems[j].listingId === item.listingId) {
        existingFavorite = favoriteItems[j];
        break;
      }
    }

    var favoriteItemId;
    if (existingFavorite) {
      favoriteItemId = existingFavorite.id;
    } else {
      var fav = {
        id: this._generateId('favitem'),
        favoritesListId: favoritesList.id,
        listingId: item.listingId,
        addedAt: this._nowIso(),
        source: 'shortlist'
      };
      favoriteItems.push(fav);
      this._saveToStorage('favorite_items', favoriteItems);
      favoriteItemId = fav.id;
    }

    if (!keepInShortlist && itemIndex !== -1) {
      shortlistItems.splice(itemIndex, 1);
      this._saveToStorage('shortlist_items', shortlistItems);
    }

    return {
      success: true,
      favoriteItemId: favoriteItemId
    };
  }

  // --------------------
  // Saved search alerts
  // --------------------

  createSavedSearchAlert(name, locationText, filters, frequency, email, emailEnabled) {
    filters = filters || {};

    var alerts = this._getFromStorage('saved_search_alerts', []);
    var alert = {
      id: this._generateId('alert'),
      name: name,
      locationText: locationText,
      minPriceMonthly: filters.minPriceMonthly,
      maxPriceMonthly: filters.maxPriceMonthly,
      minPriceNightly: filters.minPriceNightly,
      maxPriceNightly: filters.maxPriceNightly,
      minBedrooms: filters.minBedrooms,
      maxBedrooms: filters.maxBedrooms,
      propertyTypes: filters.propertyTypes || [],
      amenities: filters.amenities || [],
      ratingMin: filters.ratingMin,
      petFriendly: filters.petFriendly,
      hasParking: filters.hasParking,
      hasInUnitLaundry: filters.hasInUnitLaundry,
      hasGym: filters.hasGym,
      moveInByDate: filters.moveInByDate,
      referenceLocationName: filters.referenceLocationName,
      referenceLandmarkId: filters.referenceLandmarkId,
      maxDistanceMeters: filters.maxDistanceMeters,
      bookingType: filters.bookingType,
      hasWifi: filters.hasWifi,
      frequency: frequency,
      email: email,
      emailEnabled: !!emailEnabled,
      createdAt: this._nowIso(),
      updatedAt: null
    };
    alerts.push(alert);
    this._saveToStorage('saved_search_alerts', alerts);
    return { alert: alert };
  }

  getSavedSearchAlerts() {
    var alerts = this._getFromStorage('saved_search_alerts', []);
    var landmarks = this._getFromStorage('landmarks', []);

    var resolvedAlerts = alerts.map(function (alert) {
      var refLandmark = null;
      if (alert.referenceLandmarkId) {
        for (var i = 0; i < landmarks.length; i++) {
          if (landmarks[i].id === alert.referenceLandmarkId) {
            refLandmark = landmarks[i];
            break;
          }
        }
      }
      var copy = {};
      for (var key in alert) {
        if (Object.prototype.hasOwnProperty.call(alert, key)) {
          copy[key] = alert[key];
        }
      }
      copy.referenceLandmark = refLandmark;
      return copy;
    });

    return { alerts: resolvedAlerts };
  }

  updateSavedSearchAlert(alertId, name, frequency, email, emailEnabled, filters) {
    var alerts = this._getFromStorage('saved_search_alerts', []);
    var alert = null;
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].id === alertId) {
        alert = alerts[i];
        break;
      }
    }
    if (!alert) {
      return { success: false, alert: null };
    }

    if (typeof name !== 'undefined' && name !== null) alert.name = name;
    if (typeof frequency !== 'undefined' && frequency !== null) alert.frequency = frequency;
    if (typeof email !== 'undefined' && email !== null) alert.email = email;
    if (typeof emailEnabled !== 'undefined' && emailEnabled !== null) alert.emailEnabled = emailEnabled;

    if (filters) {
      if (typeof filters.minPriceMonthly !== 'undefined') alert.minPriceMonthly = filters.minPriceMonthly;
      if (typeof filters.maxPriceMonthly !== 'undefined') alert.maxPriceMonthly = filters.maxPriceMonthly;
      if (typeof filters.minPriceNightly !== 'undefined') alert.minPriceNightly = filters.minPriceNightly;
      if (typeof filters.maxPriceNightly !== 'undefined') alert.maxPriceNightly = filters.maxPriceNightly;
      if (typeof filters.minBedrooms !== 'undefined') alert.minBedrooms = filters.minBedrooms;
      if (typeof filters.maxBedrooms !== 'undefined') alert.maxBedrooms = filters.maxBedrooms;
      if (typeof filters.propertyTypes !== 'undefined') alert.propertyTypes = filters.propertyTypes || [];
      if (typeof filters.amenities !== 'undefined') alert.amenities = filters.amenities || [];
      if (typeof filters.ratingMin !== 'undefined') alert.ratingMin = filters.ratingMin;
      if (typeof filters.petFriendly !== 'undefined') alert.petFriendly = filters.petFriendly;
      if (typeof filters.hasParking !== 'undefined') alert.hasParking = filters.hasParking;
      if (typeof filters.hasInUnitLaundry !== 'undefined') alert.hasInUnitLaundry = filters.hasInUnitLaundry;
      if (typeof filters.hasGym !== 'undefined') alert.hasGym = filters.hasGym;
      if (typeof filters.moveInByDate !== 'undefined') alert.moveInByDate = filters.moveInByDate;
      if (typeof filters.referenceLocationName !== 'undefined') alert.referenceLocationName = filters.referenceLocationName;
      if (typeof filters.referenceLandmarkId !== 'undefined') alert.referenceLandmarkId = filters.referenceLandmarkId;
      if (typeof filters.maxDistanceMeters !== 'undefined') alert.maxDistanceMeters = filters.maxDistanceMeters;
      if (typeof filters.bookingType !== 'undefined') alert.bookingType = filters.bookingType;
      if (typeof filters.hasWifi !== 'undefined') alert.hasWifi = filters.hasWifi;
    }

    alert.updatedAt = this._nowIso();
    this._saveToStorage('saved_search_alerts', alerts);

    return { success: true, alert: alert };
  }

  deleteSavedSearchAlert(alertId) {
    var alerts = this._getFromStorage('saved_search_alerts', []);
    var newAlerts = [];
    var deleted = false;
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].id === alertId) {
        deleted = true;
      } else {
        newAlerts.push(alerts[i]);
      }
    }
    if (deleted) {
      this._saveToStorage('saved_search_alerts', newAlerts);
    }
    return { success: deleted };
  }

  // --------------------
  // Inquiry messages
  // --------------------

  submitInquiryMessageForListing(listingId, messageText, contactEmail, contactPhone) {
    var inquiries = this._getFromStorage('inquiry_messages', []);
    var inquiry = {
      id: this._generateId('inquiry'),
      listingId: listingId,
      messageText: messageText,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      status: 'sent',
      createdAt: this._nowIso()
    };
    inquiries.push(inquiry);
    this._saveToStorage('inquiry_messages', inquiries);
    return { inquiry: inquiry };
  }

  // --------------------
  // Viewing requests
  // --------------------

  createViewingRequestForListing(listingId, viewingDate, viewingTimeSlot, contactName, contactPhone) {
    var viewingRequests = this._getFromStorage('viewing_requests', []);
    var request = {
      id: this._generateId('viewing'),
      listingId: listingId,
      viewingDate: viewingDate,
      viewingTimeSlot: viewingTimeSlot,
      contactName: contactName,
      contactPhone: contactPhone,
      status: 'pending',
      createdAt: this._nowIso()
    };
    viewingRequests.push(request);
    this._saveToStorage('viewing_requests', viewingRequests);
    return { viewingRequest: request };
  }

  // --------------------
  // Bookings (short-term stays)
  // --------------------

  startBookingForListing(listingId, checkInDate, checkOutDate, guests) {
    guests = guests || {};
    var listings = this._getFromStorage('listings', []);
    var listing = null;
    for (var i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      throw new Error('Listing not found');
    }

    var totals = this._calculateBookingTotals(listing, checkInDate, checkOutDate);

    var bookings = this._getFromStorage('bookings', []);
    var booking = {
      id: this._generateId('booking'),
      listingId: listingId,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      guestsAdults: typeof guests.adults === 'number' ? guests.adults : 1,
      guestsChildren: typeof guests.children === 'number' ? guests.children : 0,
      guestsInfants: typeof guests.infants === 'number' ? guests.infants : 0,
      nightlyPrice: totals.nightlyPrice,
      currency: totals.currency,
      totalPrice: totals.total,
      guestFullName: '',
      guestEmail: '',
      guestPhone: '',
      freeCancellation: !!listing.freeCancellation,
      cancellationPolicySummary: listing.freeCancellation ? 'Free cancellation available.' : '',
      status: 'pending',
      sourcePage: 'listing_detail',
      createdAt: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    var listingSummary = {
      id: listing.id,
      title: listing.title,
      city: listing.city,
      neighborhood: listing.neighborhood,
      nightlyPrice: listing.nightlyPrice,
      currency: listing.currency,
      freeCancellation: listing.freeCancellation
    };

    return {
      booking: booking,
      listing: listingSummary
    };
  }

  getBookingDetails(bookingId) {
    var bookings = this._getFromStorage('bookings', []);
    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        booking = bookings[i];
        break;
      }
    }
    if (!booking) {
      return { booking: null, listing: null };
    }

    var listings = this._getFromStorage('listings', []);
    var listing = null;
    for (var j = 0; j < listings.length; j++) {
      if (listings[j].id === booking.listingId) {
        listing = listings[j];
        break;
      }
    }

    var listingSummary = listing
      ? {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          neighborhood: listing.neighborhood,
          nightlyPrice: listing.nightlyPrice,
          currency: listing.currency
        }
      : null;

    return {
      booking: booking,
      listing: listingSummary
    };
  }

  updateBookingStayDetails(bookingId, checkInDate, checkOutDate, guests) {
    guests = guests || {};
    var bookings = this._getFromStorage('bookings', []);
    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        booking = bookings[i];
        break;
      }
    }
    if (!booking) {
      return { success: false, booking: null };
    }

    if (checkInDate) booking.checkInDate = checkInDate;
    if (checkOutDate) booking.checkOutDate = checkOutDate;

    if (guests && typeof guests === 'object') {
      if (typeof guests.adults === 'number') booking.guestsAdults = guests.adults;
      if (typeof guests.children === 'number') booking.guestsChildren = guests.children;
      if (typeof guests.infants === 'number') booking.guestsInfants = guests.infants;
    }

    var listings = this._getFromStorage('listings', []);
    var listing = null;
    for (var j = 0; j < listings.length; j++) {
      if (listings[j].id === booking.listingId) {
        listing = listings[j];
        break;
      }
    }

    if (listing) {
      var totals = this._calculateBookingTotals(listing, booking.checkInDate, booking.checkOutDate);
      booking.nightlyPrice = totals.nightlyPrice;
      booking.currency = totals.currency;
      booking.totalPrice = totals.total;
    }

    this._saveToStorage('bookings', bookings);
    return { success: true, booking: booking };
  }

  updateBookingGuestContact(bookingId, guestFullName, guestEmail, guestPhone) {
    var bookings = this._getFromStorage('bookings', []);
    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        booking = bookings[i];
        break;
      }
    }
    if (!booking) {
      return { success: false, booking: null };
    }

    booking.guestFullName = guestFullName;
    booking.guestEmail = guestEmail;
    booking.guestPhone = guestPhone;

    this._saveToStorage('bookings', bookings);
    return { success: true, booking: booking };
  }

  getBookingReviewSummary(bookingId) {
    var bookings = this._getFromStorage('bookings', []);
    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        booking = bookings[i];
        break;
      }
    }
    if (!booking) {
      return {
        booking: null,
        listing: null,
        priceBreakdown: null,
        cancellationPolicySummary: ''
      };
    }

    var listings = this._getFromStorage('listings', []);
    var listing = null;
    for (var j = 0; j < listings.length; j++) {
      if (listings[j].id === booking.listingId) {
        listing = listings[j];
        break;
      }
    }

    var totals = this._calculateBookingTotals(listing, booking.checkInDate, booking.checkOutDate);

    var listingSummary = listing
      ? {
          id: listing.id,
          title: listing.title,
          city: listing.city,
          neighborhood: listing.neighborhood,
          photos: listing.photos || []
        }
      : null;

    var priceBreakdown = {
      nightlyPrice: totals.nightlyPrice,
      nights: totals.nights,
      subtotal: totals.subtotal,
      taxes: totals.taxes,
      fees: totals.fees,
      total: totals.total,
      currency: totals.currency
    };

    var cancellationSummary = booking.cancellationPolicySummary || (listing && listing.freeCancellation ? 'Free cancellation available.' : '');

    return {
      booking: booking,
      listing: listingSummary,
      priceBreakdown: priceBreakdown,
      cancellationPolicySummary: cancellationSummary
    };
  }

  confirmBooking(bookingId) {
    var bookings = this._getFromStorage('bookings', []);
    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        booking = bookings[i];
        break;
      }
    }
    if (!booking) {
      return {
        success: false,
        booking: null,
        confirmationMessage: 'Booking not found.'
      };
    }

    booking.status = 'confirmed';
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking: booking,
      confirmationMessage: 'Your booking has been confirmed.'
    };
  }

  // --------------------
  // Rental applications
  // --------------------

  submitRentalApplicationForListing(listingId, fullName, email, phone, currentAddress, employmentStatus, annualIncome, moveInDate, leaseTerm, hasPets) {
    var applications = this._getFromStorage('rental_applications', []);
    var application = {
      id: this._generateId('rentalapp'),
      listingId: listingId,
      fullName: fullName,
      email: email,
      phone: phone,
      currentAddress: currentAddress || '',
      employmentStatus: employmentStatus, // must match enum: full_time_employed, etc.
      annualIncome: annualIncome,
      moveInDate: moveInDate,
      leaseTerm: leaseTerm, // e.g., months_12
      hasPets: !!hasPets,
      status: 'submitted',
      createdAt: this._nowIso()
    };
    applications.push(application);
    this._saveToStorage('rental_applications', applications);
    return { application: application };
  }

  // --------------------
  // Static content
  // --------------------

  getStaticPageContent(pageName) {
    var pages = this._getFromStorage('site_pages', []);
    var page = null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].name === pageName) {
        page = pages[i];
        break;
      }
    }

    if (!page) {
      return {
        pageId: null,
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }

    return {
      pageId: page.id,
      title: page.title || page.name,
      bodyHtml: page.bodyHtml || '',
      lastUpdated: page.lastUpdated || ''
    };
  }

  // --------------------
  // Help / FAQ
  // --------------------

  getHelpTopics() {
    var topics = this._getFromStorage('help_topics', []);
    return { topics: topics };
  }

  // --------------------
  // Contact requests
  // --------------------

  submitContactRequest(fullName, email, subject, messageText, topic) {
    var contactRequests = this._getFromStorage('contact_requests', []);
    var id = this._generateId('contact');
    var request = {
      id: id,
      fullName: fullName,
      email: email,
      subject: subject,
      messageText: messageText,
      topic: topic || 'general',
      createdAt: this._nowIso()
    };
    contactRequests.push(request);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      contactRequestId: id,
      message: 'Your message has been received.'
    };
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
