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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ------------------ Storage helpers ------------------
  _initStorage() {
    const keys = [
      'tours',
      'tour_departures',
      'packages',
      'hotels',
      'hotel_room_types',
      'bundles',
      'blog_articles',
      'saved_articles',
      'reading_lists',
      'reading_list_articles',
      'wishlists',
      'wishlist_items',
      'booking_carts',
      'booking_cart_items',
      'tour_bookings',
      'hotel_bookings',
      'bundle_bookings',
      'newsletter_subscriptions',
      'insurance_plans',
      'insurance_policy_configs',
      'activity_templates',
      'custom_itineraries',
      'custom_itinerary_cities',
      'custom_itinerary_activities',
      'contact_submissions'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  // ------------------ Generic helpers ------------------
  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _formatDateISO(date) {
    if (!date) return null;
    return date.toISOString();
  }

  _calculateNightsBetweenDates(startDateStr, endDateStr) {
    const start = this._parseDate(startDateStr);
    const end = this._parseDate(endDateStr);
    if (!start || !end) return 0;
    const msPerNight = 1000 * 60 * 60 * 24;
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? Math.round(diff / msPerNight) : 0;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('booking_carts');
    let cart = carts.find(c => c.status === 'open');
    const now = new Date().toISOString();

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('booking_carts', carts);
    }

    return cart;
  }

  _estimateTourPrice(tour, departure, adults, children, accommodationLevel) {
    if (!tour) {
      return { pricePerPerson: 0, totalPrice: 0, currency: 'usd' };
    }
    const travelerCount = (adults || 0) + (children || 0);
    if (travelerCount <= 0) {
      return { pricePerPerson: 0, totalPrice: 0, currency: tour.currency || 'usd' };
    }

    const base = departure && typeof departure.pricePerPerson === 'number'
      ? departure.pricePerPerson
      : (typeof tour.basePricePerPerson === 'number' ? tour.basePricePerPerson : 0);

    const level = accommodationLevel || tour.defaultAccommodationLevel || 'standard_3_star';
    let multiplier = 1;
    if (level === 'budget_2_star') multiplier = 0.9;
    else if (level === 'standard_3_star') multiplier = 1.0;
    else if (level === 'comfort_4_star') multiplier = 1.2;
    else if (level === 'luxury_5_star') multiplier = 1.5;

    const pricePerPerson = base * multiplier;
    const totalPrice = pricePerPerson * travelerCount;
    return {
      pricePerPerson,
      totalPrice,
      currency: tour.currency || 'usd'
    };
  }

  _estimateHotelRoomTotalPrice(roomType, checkInDate, checkOutDate) {
    if (!roomType) return { nights: 0, totalPrice: 0, currency: 'usd' };
    const nights = this._calculateNightsBetweenDates(checkInDate, checkOutDate);
    const pricePerNight = roomType.pricePerNight || 0;
    const totalPrice = pricePerNight * nights;
    return {
      nights,
      totalPrice,
      currency: roomType.currency || 'usd'
    };
  }

  _estimateInsurancePremium(plan, tripCost, tripDurationDays, addons) {
    if (!plan) return { estimatedPremium: 0, currency: 'usd' };
    const cost = typeof tripCost === 'number' ? tripCost : 0;
    const duration = typeof tripDurationDays === 'number' ? tripDurationDays : null;

    let base = typeof plan.basePricePerTrip === 'number' && plan.basePricePerTrip > 0
      ? plan.basePricePerTrip
      : cost * 0.05; // 5% of trip cost fallback

    if (duration !== null) {
      if (duration <= 7) base *= 0.8;
      else if (duration > 21) base *= 1.5;
      else base *= 1.0;
    }

    let addonMultiplier = 1.0;
    const addonCodes = Array.isArray(addons) ? addons : [];
    if (addonCodes.includes('trip_cancellation_protection')) {
      addonMultiplier += 0.15;
    }

    const estimatedPremium = base * addonMultiplier;
    return {
      estimatedPremium,
      currency: plan.currency || 'usd'
    };
  }

  _buildCartSummary(cart, allItems) {
    const items = allItems.filter(i => i.cartId === cart.id);
    let totalPrice = 0;
    let currency = 'usd';
    for (const item of items) {
      totalPrice += item.totalPrice || 0;
      if (!currency && item.currency) currency = item.currency;
      if (currency === 'usd' && item.currency) currency = item.currency;
    }
    return {
      itemsCount: items.length,
      totalPrice,
      currency
    };
  }

  _summarizeTravelers(adults, children) {
    const parts = [];
    if (adults) parts.push(adults + ' adult' + (adults > 1 ? 's' : ''));
    if (children) parts.push(children + ' child' + (children > 1 ? 'ren' : ''));
    return parts.join(', ');
  }

  // ------------------ Homepage ------------------
  getHomePageContent() {
    const tours = this._getFromStorage('tours');
    const tourDepartures = this._getFromStorage('tour_departures');
    const packages = this._getFromStorage('packages');
    const hotels = this._getFromStorage('hotels');
    const articles = this._getFromStorage('blog_articles');

    // Featured tours: first 5 sorted by rating desc
    const featuredTours = tours
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map(tour => {
        const departuresForTour = tourDepartures.filter(d => d.tourId === tour.id);
        let fromPricePerPerson = tour.basePricePerPerson || 0;
        if (departuresForTour.length) {
          fromPricePerPerson = departuresForTour.reduce((min, d) => {
            return typeof d.pricePerPerson === 'number' && d.pricePerPerson < min ? d.pricePerPerson : min;
          }, Number.POSITIVE_INFINITY);
          if (!isFinite(fromPricePerPerson)) fromPricePerPerson = tour.basePricePerPerson || 0;
        }
        return {
          tour,
          fromPricePerPerson,
          currency: tour.currency || 'usd',
          durationDays: tour.durationDays || (departuresForTour[0] && departuresForTour[0].durationDays) || 0,
          rating: tour.rating || 0,
          reviewCount: tour.reviewCount || 0
        };
      });

    // Featured packages: first 5
    const featuredPackages = packages.slice(0, 5).map(p => ({
      package: p,
      highlightedInclusions: Array.isArray(p.inclusions) ? p.inclusions.slice(0, 3) : []
    }));

    // Featured hotels: first 5 sorted by guestRating desc
    const featuredHotels = hotels
      .slice()
      .sort((a, b) => (b.guestRating || 0) - (a.guestRating || 0))
      .slice(0, 5)
      .map(h => ({
        hotel: h,
        fromPricePerNight: h.minPricePerNight || 0,
        currency: h.currency || 'usd',
        guestRating: h.guestRating || 0,
        reviewCount: h.reviewCount || 0
      }));

    const now = new Date();
    const DAYS_30 = 1000 * 60 * 60 * 24 * 30;

    const highlightedArticles = articles.slice(0, 10).map(a => {
      const publishDate = a.publishDate ? new Date(a.publishDate) : null;
      const isRecent = publishDate ? (now.getTime() - publishDate.getTime() <= DAYS_30) : false;
      const isPopular = Array.isArray(a.tags) && a.tags.includes('popular');
      return {
        article: a,
        isRecent,
        isPopular
      };
    });

    return {
      featuredTours,
      featuredPackages,
      featuredHotels,
      highlightedArticles
    };
  }

  // ------------------ Tours ------------------
  getTourFilterOptions() {
    const tours = this._getFromStorage('tours');

    const destinationCountriesMap = {};
    for (const t of tours) {
      if (t.destinationCountry && !destinationCountriesMap[t.destinationCountry]) {
        destinationCountriesMap[t.destinationCountry] = {
          code: t.destinationCountry,
          name: t.destinationCountry
        };
      }
    }

    const durationSet = new Set();
    for (const t of tours) {
      if (typeof t.durationDays === 'number') durationSet.add(t.durationDays);
    }

    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;
    let currency = 'usd';
    for (const t of tours) {
      if (typeof t.basePricePerPerson === 'number') {
        if (t.basePricePerPerson < minPrice) minPrice = t.basePricePerPerson;
        if (t.basePricePerPerson > maxPrice) maxPrice = t.basePricePerPerson;
        if (t.currency) currency = t.currency;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;

    const accommodationLevels = [
      { value: 'budget_2_star', label: '2-star (budget)' },
      { value: 'standard_3_star', label: '3-star (standard)' },
      { value: 'comfort_4_star', label: '4-star (comfort)' },
      { value: 'luxury_5_star', label: '5-star (luxury)' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'duration_short_to_long', label: 'Duration: Short to Long' },
      { value: 'duration_long_to_short', label: 'Duration: Long to Short' }
    ];

    return {
      destinationCountries: Object.values(destinationCountriesMap),
      durationOptionsDays: Array.from(durationSet).sort((a, b) => a - b),
      priceRangePerPerson: {
        min: minPrice,
        max: maxPrice,
        currency
      },
      accommodationLevels,
      sortOptions
    };
  }

  searchTours(destinationCountry, startDate, endDate, minDurationDays, maxDurationDays, maxPricePerPerson, accommodationLevels, sortBy, page = 1, pageSize = 20) {
    const tours = this._getFromStorage('tours');
    const tourDepartures = this._getFromStorage('tour_departures');

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const accLevels = Array.isArray(accommodationLevels) ? accommodationLevels : null;

    let filteredTours = tours.filter(tour => {
      if (destinationCountry && tour.destinationCountry !== destinationCountry) return false;

      if (accLevels && accLevels.length) {
        const availableLevels = Array.isArray(tour.accommodationCategories) && tour.accommodationCategories.length
          ? tour.accommodationCategories
          : [tour.defaultAccommodationLevel];
        const hasMatch = availableLevels.some(l => accLevels.includes(l));
        if (!hasMatch) return false;
      }

      const departuresForTour = tourDepartures.filter(d => d.tourId === tour.id);

      const matchingDepartures = departuresForTour.filter(d => {
        const depDate = new Date(d.departureDate);
        if (start && depDate < start) return false;
        if (end && depDate > end) return false;

        const duration = typeof d.durationDays === 'number' ? d.durationDays : tour.durationDays;
        if (typeof minDurationDays === 'number' && duration < minDurationDays) return false;
        if (typeof maxDurationDays === 'number' && duration > maxDurationDays) return false;

        if (typeof maxPricePerPerson === 'number' && typeof d.pricePerPerson === 'number') {
          if (d.pricePerPerson > maxPricePerPerson) return false;
        }
        return true;
      });

      if (start || end || typeof minDurationDays === 'number' || typeof maxDurationDays === 'number' || typeof maxPricePerPerson === 'number') {
        return matchingDepartures.length > 0;
      }

      return true;
    });

    const results = filteredTours.map(tour => {
      const departuresForTour = tourDepartures.filter(d => d.tourId === tour.id);
      let candidateDepartures = departuresForTour;

      if (start || end || typeof minDurationDays === 'number' || typeof maxDurationDays === 'number' || typeof maxPricePerPerson === 'number') {
        candidateDepartures = departuresForTour.filter(d => {
          const depDate = new Date(d.departureDate);
          if (start && depDate < start) return false;
          if (end && depDate > end) return false;

          const duration = typeof d.durationDays === 'number' ? d.durationDays : tour.durationDays;
          if (typeof minDurationDays === 'number' && duration < minDurationDays) return false;
          if (typeof maxDurationDays === 'number' && duration > maxDurationDays) return false;

          if (typeof maxPricePerPerson === 'number' && typeof d.pricePerPerson === 'number') {
            if (d.pricePerPerson > maxPricePerPerson) return false;
          }
          return true;
        });
      }

      let fromPricePerPerson = tour.basePricePerPerson || 0;
      let nextAvailableDeparture = null;
      let durationDays = tour.durationDays || 0;

      if (candidateDepartures.length) {
        candidateDepartures.sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));
        nextAvailableDeparture = candidateDepartures[0].departureDate;
        durationDays = candidateDepartures[0].durationDays || durationDays;
        let minPrice = candidateDepartures.reduce((min, d) => {
          return typeof d.pricePerPerson === 'number' && d.pricePerPerson < min ? d.pricePerPerson : min;
        }, Number.POSITIVE_INFINITY);
        if (!isFinite(minPrice)) minPrice = fromPricePerPerson;
        fromPricePerPerson = minPrice;
      }

      return {
        tour,
        fromPricePerPerson,
        currency: tour.currency || 'usd',
        nextAvailableDeparture,
        durationDays,
        rating: tour.rating || 0,
        reviewCount: tour.reviewCount || 0
      };
    });

    let sorted = results.slice();
    if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => (a.fromPricePerPerson || 0) - (b.fromPricePerPerson || 0));
    } else if (sortBy === 'price_high_to_low') {
      sorted.sort((a, b) => (b.fromPricePerPerson || 0) - (a.fromPricePerPerson || 0));
    } else if (sortBy === 'rating_high_to_low') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'duration_short_to_long') {
      sorted.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
    } else if (sortBy === 'duration_long_to_short') {
      sorted.sort((a, b) => (b.durationDays || 0) - (a.durationDays || 0));
    }

    const totalResults = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem('task1_tourSearchParams', JSON.stringify({
        destinationCountry,
        startDate,
        endDate,
        minDurationDays,
        maxDurationDays,
        maxPricePerPerson,
        accommodationLevels,
        sortBy,
        page,
        pageSize,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Instrumentation error (task1_tourSearchParams):', e);
    }

    return {
      results: sorted.slice(startIndex, endIndex),
      totalResults,
      page,
      pageSize
    };
  }

  getTourDetail(tourId) {
    const tours = this._getFromStorage('tours');
    const tour = tours.find(t => t.id === tourId) || null;

    if (!tour) {
      return {
        tour: null,
        itineraryHtml: '',
        inclusions: [],
        exclusions: [],
        photos: [],
        mapEmbedCode: '',
        averageRating: 0,
        reviewCount: 0,
        reviewSnippets: [],
        availableAccommodationLevels: []
      };
    }

    const availableAccommodationLevels = Array.isArray(tour.accommodationCategories) && tour.accommodationCategories.length
      ? tour.accommodationCategories
      : [tour.defaultAccommodationLevel];

    return {
      tour,
      itineraryHtml: tour.description || '',
      inclusions: [],
      exclusions: [],
      photos: tour.imageUrl ? [tour.imageUrl] : [],
      mapEmbedCode: '',
      averageRating: tour.rating || 0,
      reviewCount: tour.reviewCount || 0,
      reviewSnippets: [],
      availableAccommodationLevels
    };
  }

  getTourAvailableDepartures(tourId, startDate, endDate) {
    const tours = this._getFromStorage('tours');
    const tour = tours.find(t => t.id === tourId) || null;
    const tourDepartures = this._getFromStorage('tour_departures');

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const departures = tourDepartures.filter(d => {
      if (d.tourId !== tourId) return false;
      const depDate = new Date(d.departureDate);
      if (start && depDate < start) return false;
      if (end && depDate > end) return false;
      return true;
    }).map(d => ({
      ...d,
      tour // foreign key resolution
    }));

    return departures;
  }

  getTourPricingPreview(tourId, tourDepartureId, adults, children = 0, accommodationLevel) {
    const tours = this._getFromStorage('tours');
    const tourDepartures = this._getFromStorage('tour_departures');

    const tour = tours.find(t => t.id === tourId) || null;
    const departure = tourDepartures.find(d => d.id === tourDepartureId) || null;

    const pricing = this._estimateTourPrice(tour, departure, adults, children, accommodationLevel);
    return pricing;
  }

  createTourBookingAndAddToCart(tourId, tourDepartureId, adults, children = 0, accommodationLevel) {
    const tours = this._getFromStorage('tours');
    const tourDepartures = this._getFromStorage('tour_departures');
    const tourBookings = this._getFromStorage('tour_bookings');
    const cartItems = this._getFromStorage('booking_cart_items');

    const tour = tours.find(t => t.id === tourId) || null;
    const departure = tourDepartures.find(d => d.id === tourDepartureId) || null;

    if (!tour || !departure) {
      return {
        tourBooking: null,
        cartItem: null,
        cartSummary: { itemsCount: 0, totalPrice: 0, currency: 'usd' },
        success: false,
        message: 'Tour or departure not found.'
      };
    }

    const pricing = this._estimateTourPrice(tour, departure, adults, children, accommodationLevel);
    const startDate = departure.departureDate;
    const start = new Date(startDate);
    const duration = departure.durationDays || tour.durationDays || 0;
    const endDate = this._formatDateISO(new Date(start.getTime() + duration * 24 * 60 * 60 * 1000));

    const now = new Date().toISOString();
    const tourBooking = {
      id: this._generateId('tourbook'),
      tourId,
      tourDepartureId,
      startDate,
      endDate,
      adults,
      children,
      accommodationLevel,
      pricePerPerson: pricing.pricePerPerson,
      totalPrice: pricing.totalPrice,
      currency: pricing.currency,
      createdAt: now
    };

    tourBookings.push(tourBooking);
    this._saveToStorage('tour_bookings', tourBookings);

    const cart = this._getOrCreateCart();
    const travelersSummary = this._summarizeTravelers(adults, children);

    const cartItem = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      itemType: 'tour_booking',
      itemRefId: tourBooking.id,
      displayName: tour.title || 'Tour booking',
      startDate,
      endDate,
      travelersSummary,
      totalPrice: pricing.totalPrice,
      currency: pricing.currency,
      createdAt: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('booking_cart_items', cartItems);

    const carts = this._getFromStorage('booking_carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updatedAt = now;
      this._saveToStorage('booking_carts', carts);
    }

    const cartSummary = this._buildCartSummary(cart, cartItems);

    const enrichedCartItem = {
      ...cartItem,
      cart,
      itemRef: tourBooking
    };

    const enrichedTourBooking = {
      ...tourBooking,
      tour,
      tourDeparture: departure
    };

    return {
      tourBooking: enrichedTourBooking,
      cartItem: enrichedCartItem,
      cartSummary,
      success: true,
      message: 'Tour booking added to cart.'
    };
  }

  // ------------------ Packages ------------------
  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages');

    const destinationCountriesMap = {};
    for (const p of packages) {
      if (p.destinationCountry && !destinationCountriesMap[p.destinationCountry]) {
        destinationCountriesMap[p.destinationCountry] = {
          code: p.destinationCountry,
          name: p.destinationCountry
        };
      }
    }

    const themes = [
      { value: 'beach', label: 'Beach' },
      { value: 'city_break', label: 'City break' },
      { value: 'adventure', label: 'Adventure' },
      { value: 'cultural', label: 'Cultural' },
      { value: 'ski', label: 'Ski' }
    ];

    const monthMap = {};
    for (const p of packages) {
      if (!p.startDate) continue;
      const d = new Date(p.startDate);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = y + '-' + m;
      if (!monthMap[key]) {
        monthMap[key] = {
          year: y,
          month: m,
          label: d.toLocaleString('default', { month: 'long', year: 'numeric' })
        };
      }
    }

    let minNights = Number.POSITIVE_INFINITY;
    let maxNights = 0;
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;
    let currency = 'usd';

    for (const p of packages) {
      if (typeof p.durationNights === 'number') {
        if (p.durationNights < minNights) minNights = p.durationNights;
        if (p.durationNights > maxNights) maxNights = p.durationNights;
      }
      if (typeof p.pricePerPerson === 'number') {
        if (p.pricePerPerson < minPrice) minPrice = p.pricePerPerson;
        if (p.pricePerPerson > maxPrice) maxPrice = p.pricePerPerson;
        if (p.currency) currency = p.currency;
      }
    }

    if (!isFinite(minNights)) minNights = 0;
    if (!isFinite(minPrice)) minPrice = 0;

    const ratingOptions = [3, 3.5, 4, 4.5, 5];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      destinationCountries: Object.values(destinationCountriesMap),
      themes,
      monthOptions: Object.values(monthMap),
      durationRangeNights: {
        min: minNights,
        max: maxNights
      },
      priceRangePerPerson: {
        min: minPrice,
        max: maxPrice,
        currency
      },
      ratingOptions,
      sortOptions
    };
  }

  searchPackages(destinationCountry, theme, travelMonth, minDurationNights, maxDurationNights, minRating, maxPricePerPerson, sortBy, page = 1, pageSize = 20) {
    const packages = this._getFromStorage('packages');

    const filtered = packages.filter(p => {
      if (destinationCountry && p.destinationCountry !== destinationCountry) return false;
      if (theme && p.theme !== theme) return false;

      if (travelMonth) {
        if (!p.startDate) return false;
        const d = new Date(p.startDate);
        if (isNaN(d.getTime())) return false;
        const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (ym !== travelMonth) return false;
      }

      if (typeof minDurationNights === 'number' && typeof p.durationNights === 'number' && p.durationNights < minDurationNights) return false;
      if (typeof maxDurationNights === 'number' && typeof p.durationNights === 'number' && p.durationNights > maxDurationNights) return false;

      if (typeof minRating === 'number' && typeof p.rating === 'number' && p.rating < minRating) return false;

      if (typeof maxPricePerPerson === 'number' && typeof p.pricePerPerson === 'number' && p.pricePerPerson > maxPricePerPerson) return false;

      return true;
    });

    let sorted = filtered.slice();
    if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => (a.pricePerPerson || 0) - (b.pricePerPerson || 0));
    } else if (sortBy === 'price_high_to_low') {
      sorted.sort((a, b) => (b.pricePerPerson || 0) - (a.pricePerPerson || 0));
    } else if (sortBy === 'rating_high_to_low') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const totalResults = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Instrumentation for task completion tracking (task_3 - package search)
    try {
      localStorage.setItem('task3_packageSearchParams', JSON.stringify({
        destinationCountry,
        theme,
        travelMonth,
        minDurationNights,
        maxDurationNights,
        minRating,
        maxPricePerPerson,
        sortBy,
        page,
        pageSize,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Instrumentation error (task3_packageSearchParams):', e);
    }

    return {
      results: sorted.slice(startIndex, endIndex),
      totalResults,
      page,
      pageSize
    };
  }

  getPackageComparison(packageIds) {
    const packages = this._getFromStorage('packages');
    const ids = Array.isArray(packageIds) ? packageIds : [];

    const comps = ids.map(id => {
      const p = packages.find(pk => pk.id === id);
      if (!p) return null;
      return {
        package: p,
        nights: p.durationNights || 0,
        pricePerPerson: p.pricePerPerson || 0,
        currency: p.currency || 'usd',
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        inclusions: Array.isArray(p.inclusions) ? p.inclusions : []
      };
    }).filter(Boolean);

    // Instrumentation for task completion tracking (task_3 - package comparison)
    try {
      if (ids && ids.length > 0) {
        const recordedIds = ids.slice(0, 2);
        localStorage.setItem('task3_comparedPackageIds', JSON.stringify({
          packageIds: recordedIds,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error (task3_comparedPackageIds):', e);
    }

    return {
      packages: comps
    };
  }

  // ------------------ Wishlist ------------------
  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists');
    if (wishlists.length > 0) return wishlists[0];
    const now = new Date().toISOString();
    const wishlist = {
      id: this._generateId('wishlist'),
      createdAt: now,
      updatedAt: now
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  addItemToWishlist(itemType, itemRefId, notes) {
    const validTypes = ['tour', 'package', 'hotel', 'bundle'];
    if (!validTypes.includes(itemType)) {
      return {
        wishlistItem: null,
        success: false,
        message: 'Invalid item type.'
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const now = new Date().toISOString();

    const wishlistItem = {
      id: this._generateId('witem'),
      wishlistId: wishlist.id,
      itemType,
      itemRefId,
      addedAt: now,
      notes: notes || ''
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx].updatedAt = now;
      this._saveToStorage('wishlists', wishlists);
    }

    // foreign key resolution within wishlistItem
    const enriched = this._enrichWishlistItem(wishlistItem);

    return {
      wishlistItem: enriched,
      success: true,
      message: 'Item added to wishlist.'
    };
  }

  _enrichWishlistItem(wishlistItem) {
    if (!wishlistItem) return null;
    const wishlists = this._getFromStorage('wishlists');
    const tours = this._getFromStorage('tours');
    const packages = this._getFromStorage('packages');
    const hotels = this._getFromStorage('hotels');
    const bundles = this._getFromStorage('bundles');

    const wishlist = wishlists.find(w => w.id === wishlistItem.wishlistId) || null;
    let itemRef = null;
    if (wishlistItem.itemType === 'tour') {
      itemRef = tours.find(t => t.id === wishlistItem.itemRefId) || null;
    } else if (wishlistItem.itemType === 'package') {
      itemRef = packages.find(p => p.id === wishlistItem.itemRefId) || null;
    } else if (wishlistItem.itemType === 'hotel') {
      itemRef = hotels.find(h => h.id === wishlistItem.itemRefId) || null;
    } else if (wishlistItem.itemType === 'bundle') {
      itemRef = bundles.find(b => b.id === wishlistItem.itemRefId) || null;
    }

    return {
      ...wishlistItem,
      wishlist,
      itemRef
    };
  }

  getWishlistItems() {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const tours = this._getFromStorage('tours');
    const packages = this._getFromStorage('packages');
    const hotels = this._getFromStorage('hotels');
    const bundles = this._getFromStorage('bundles');

    return wishlistItems.map(item => {
      const enrichedItem = this._enrichWishlistItem(item);
      let ref = enrichedItem.itemRef;
      let title = '';
      let thumbnailUrl = '';
      let summary = '';
      let priceFrom = 0;
      let currency = 'usd';

      if (enrichedItem.itemType === 'tour' && ref) {
        title = ref.title || '';
        thumbnailUrl = ref.imageUrl || '';
        summary = ref.shortDescription || '';
        priceFrom = ref.basePricePerPerson || 0;
        currency = ref.currency || 'usd';
      } else if (enrichedItem.itemType === 'package' && ref) {
        title = ref.title || '';
        thumbnailUrl = ref.imageUrl || '';
        summary = ref.description || '';
        priceFrom = ref.pricePerPerson || 0;
        currency = ref.currency || 'usd';
      } else if (enrichedItem.itemType === 'hotel' && ref) {
        title = ref.name || '';
        thumbnailUrl = ref.mainImageUrl || '';
        summary = ref.description || '';
        priceFrom = ref.minPricePerNight || 0;
        currency = ref.currency || 'usd';
      } else if (enrichedItem.itemType === 'bundle' && ref) {
        title = ref.title || '';
        thumbnailUrl = ref.imageUrl || '';
        summary = ref.description || '';
        priceFrom = ref.totalPrice || 0;
        currency = ref.currency || 'usd';
      }

      return {
        wishlistItem: enrichedItem,
        title,
        itemType: enrichedItem.itemType,
        thumbnailUrl,
        summary,
        priceFrom,
        currency
      };
    });
  }

  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const before = wishlistItems.length;
    wishlistItems = wishlistItems.filter(w => w.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);
    const removed = before !== wishlistItems.length;
    return {
      success: removed,
      message: removed ? 'Wishlist item removed.' : 'Wishlist item not found.'
    };
  }

  // ------------------ Hotels ------------------
  getHotelFilterOptions() {
    const hotels = this._getFromStorage('hotels');

    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;
    let currency = 'usd';

    for (const h of hotels) {
      if (typeof h.minPricePerNight === 'number') {
        if (h.minPricePerNight < minPrice) minPrice = h.minPricePerNight;
        if (h.minPricePerNight > maxPrice) maxPrice = h.minPricePerNight;
        if (h.currency) currency = h.currency;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;

    const guestRatingOptions = [3, 3.5, 4, 4.5, 5];

    const amenityMap = {};
    for (const h of hotels) {
      if (Array.isArray(h.amenities)) {
        for (const code of h.amenities) {
          if (!amenityMap[code]) amenityMap[code] = { code, label: code.replace(/_/g, ' ') };
        }
      }
    }

    const propertyTypeOptions = [
      { code: 'hotel', label: 'Hotel' },
      { code: 'apartment', label: 'Apartment' },
      { code: 'hostel', label: 'Hostel' }
    ];

    const sortOptions = [
      { value: 'guest_rating_high_to_low', label: 'Guest rating: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return {
      priceRangePerNight: {
        min: minPrice,
        max: maxPrice,
        currency
      },
      guestRatingOptions,
      amenityOptions: Object.values(amenityMap),
      propertyTypeOptions,
      sortOptions
    };
  }

  searchHotels(city, country, checkInDate, checkOutDate, adults, children = 0, maxPricePerNight, minGuestRating, amenities, familyFriendlyOnly, sortBy, page = 1, pageSize = 20) {
    const hotels = this._getFromStorage('hotels');

    const cityLower = city ? city.toLowerCase() : null;
    const countryLower = country ? country.toLowerCase() : null;
    const amenityFilter = Array.isArray(amenities) ? amenities : [];

    const filtered = hotels.filter(h => {
      if (cityLower && h.city && h.city.toLowerCase() !== cityLower) return false;
      if (countryLower && h.country && h.country.toLowerCase() !== countryLower) return false;

      if (typeof maxPricePerNight === 'number' && typeof h.minPricePerNight === 'number' && h.minPricePerNight > maxPricePerNight) return false;
      if (typeof minGuestRating === 'number' && typeof h.guestRating === 'number' && h.guestRating < minGuestRating) return false;

      if (familyFriendlyOnly) {
        const isFamily = h.isFamilyFriendly || (Array.isArray(h.amenities) && h.amenities.includes('family_friendly'));
        if (!isFamily) return false;
      }

      if (amenityFilter.length) {
        if (!Array.isArray(h.amenities)) return false;
        const hasAll = amenityFilter.every(a => h.amenities.includes(a));
        if (!hasAll) return false;
      }

      return true;
    });

    let sorted = filtered.slice();
    if (sortBy === 'guest_rating_high_to_low') {
      sorted.sort((a, b) => (b.guestRating || 0) - (a.guestRating || 0));
    } else if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => (a.minPricePerNight || 0) - (b.minPricePerNight || 0));
    }

    const totalResults = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_hotelSearchParams', JSON.stringify({
        city,
        country,
        checkInDate,
        checkOutDate,
        adults,
        children,
        maxPricePerNight,
        minGuestRating,
        amenities,
        familyFriendlyOnly,
        sortBy,
        page,
        pageSize,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Instrumentation error (task6_hotelSearchParams):', e);
    }

    return {
      results: sorted.slice(startIndex, endIndex),
      totalResults,
      page,
      pageSize
    };
  }

  getHotelDetailAndRooms(hotelId, checkInDate, checkOutDate, adults, children = 0) {
    const hotels = this._getFromStorage('hotels');
    const roomTypes = this._getFromStorage('hotel_room_types');

    const hotel = hotels.find(h => h.id === hotelId) || null;
    const hotelRoomTypes = roomTypes.filter(rt => rt.hotelId === hotelId && rt.maxAdults >= adults && (typeof rt.maxChildren !== 'number' || rt.maxChildren >= children));

    const availableRoomTypes = hotelRoomTypes.map(rt => ({
      ...rt,
      hotel
    }));

    return {
      hotel,
      photos: hotel && hotel.mainImageUrl ? [hotel.mainImageUrl] : [],
      descriptionHtml: hotel && hotel.description ? hotel.description : '',
      address: hotel && hotel.address ? hotel.address : '',
      amenities: hotel && Array.isArray(hotel.amenities) ? hotel.amenities : [],
      guestRating: hotel && hotel.guestRating ? hotel.guestRating : 0,
      reviewCount: hotel && hotel.reviewCount ? hotel.reviewCount : 0,
      reviews: [],
      availableRoomTypes
    };
  }

  createHotelBookingAndAddToCart(hotelId, roomTypeId, checkInDate, checkOutDate, adults, children = 0) {
    const hotels = this._getFromStorage('hotels');
    const roomTypes = this._getFromStorage('hotel_room_types');
    const hotelBookings = this._getFromStorage('hotel_bookings');
    const cartItems = this._getFromStorage('booking_cart_items');

    const hotel = hotels.find(h => h.id === hotelId) || null;
    const roomType = roomTypes.find(r => r.id === roomTypeId && r.hotelId === hotelId) || null;

    if (!hotel || !roomType) {
      return {
        hotelBooking: null,
        cartItem: null,
        cartSummary: { itemsCount: 0, totalPrice: 0, currency: 'usd' },
        success: false,
        message: 'Hotel or room type not found.'
      };
    }

    const priceInfo = this._estimateHotelRoomTotalPrice(roomType, checkInDate, checkOutDate);
    const now = new Date().toISOString();

    const hotelBooking = {
      id: this._generateId('hbook'),
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      nights: priceInfo.nights,
      adults,
      children,
      pricePerNight: roomType.pricePerNight || 0,
      totalPrice: priceInfo.totalPrice,
      currency: priceInfo.currency,
      freeCancellation: !!roomType.freeCancellation,
      createdAt: now
    };

    hotelBookings.push(hotelBooking);
    this._saveToStorage('hotel_bookings', hotelBookings);

    const cart = this._getOrCreateCart();
    const travelersSummary = this._summarizeTravelers(adults, children);

    const cartItem = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      itemType: 'hotel_booking',
      itemRefId: hotelBooking.id,
      displayName: (hotel.name || 'Hotel') + ' – ' + (roomType.name || 'Room'),
      startDate: checkInDate,
      endDate: checkOutDate,
      travelersSummary,
      totalPrice: priceInfo.totalPrice,
      currency: priceInfo.currency,
      createdAt: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('booking_cart_items', cartItems);

    const carts = this._getFromStorage('booking_carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updatedAt = now;
      this._saveToStorage('booking_carts', carts);
    }

    const cartSummary = this._buildCartSummary(cart, cartItems);

    const enrichedCartItem = {
      ...cartItem,
      cart,
      itemRef: hotelBooking
    };

    const enrichedHotelBooking = {
      ...hotelBooking,
      hotel,
      roomType
    };

    return {
      hotelBooking: enrichedHotelBooking,
      cartItem: enrichedCartItem,
      cartSummary,
      success: true,
      message: 'Hotel booking added to cart.'
    };
  }

  // ------------------ Bundles (Flight + Hotel) ------------------
  searchBundles(originAirportCode, destinationAirportCode, departureDate, returnDate, adults, nonStopOnly = false, maxTotalPrice, sortBy, page = 1, pageSize = 20) {
    const bundles = this._getFromStorage('bundles');
    const hotels = this._getFromStorage('hotels');

    const filtered = bundles.filter(b => {
      if (originAirportCode && b.originAirportCode !== originAirportCode) return false;
      if (destinationAirportCode && b.destinationAirportCode !== destinationAirportCode) return false;

      const depDateStr = b.departureDateTime ? String(b.departureDateTime).substring(0, 10) : null;
      const retDateStr = b.returnDateTime ? String(b.returnDateTime).substring(0, 10) : null;
      if (departureDate && depDateStr !== departureDate) return false;
      if (returnDate && retDateStr !== returnDate) return false;

      if (typeof adults === 'number' && typeof b.travelerCountIncluded === 'number' && b.travelerCountIncluded < adults) return false;

      if (nonStopOnly && !b.isNonStopFlight) return false;

      if (typeof maxTotalPrice === 'number' && typeof b.totalPrice === 'number' && b.totalPrice > maxTotalPrice) return false;

      return true;
    });

    let sorted = filtered.slice();
    if (sortBy === 'total_price_low_to_high') {
      sorted.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
    } else if (sortBy === 'total_price_high_to_low') {
      sorted.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
    }

    const enriched = sorted.map(b => ({
      ...b,
      hotel: hotels.find(h => h.id === b.hotelId) || null
    }));

    const totalResults = enriched.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Instrumentation for task completion tracking (task_4)
    try {
      localStorage.setItem('task4_bundleSearchParams', JSON.stringify({
        originAirportCode,
        destinationAirportCode,
        departureDate,
        returnDate,
        adults,
        nonStopOnly,
        maxTotalPrice,
        sortBy,
        page,
        pageSize,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Instrumentation error (task4_bundleSearchParams):', e);
    }

    return {
      results: enriched.slice(startIndex, endIndex),
      totalResults,
      page,
      pageSize
    };
  }

  getBundleDetail(bundleId) {
    const bundles = this._getFromStorage('bundles');
    const hotels = this._getFromStorage('hotels');

    const bundle = bundles.find(b => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundle: null,
        flightDetails: null,
        hotelDetails: null,
        totalPrice: 0,
        currency: 'usd',
        cancellationPolicy: ''
      };
    }

    const hotel = hotels.find(h => h.id === bundle.hotelId) || null;

    const flightDetails = {
      airlineName: bundle.airlineName || '',
      flightNumber: bundle.flightNumber || '',
      departureDateTime: bundle.departureDateTime || null,
      returnDateTime: bundle.returnDateTime || null,
      isNonStop: !!bundle.isNonStopFlight
    };

    const hotelDetails = {
      hotel,
      roomTypeName: bundle.roomTypeName || ''
    };

    return {
      bundle,
      flightDetails,
      hotelDetails,
      totalPrice: bundle.totalPrice || 0,
      currency: bundle.currency || 'usd',
      cancellationPolicy: bundle.cancellationPolicy || ''
    };
  }

  createBundleBookingAndAddToCart(bundleId, adults) {
    const bundles = this._getFromStorage('bundles');
    const bundleBookings = this._getFromStorage('bundle_bookings');
    const cartItems = this._getFromStorage('booking_cart_items');

    const bundle = bundles.find(b => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundleBooking: null,
        cartItem: null,
        cartSummary: { itemsCount: 0, totalPrice: 0, currency: 'usd' },
        success: false,
        message: 'Bundle not found.'
      };
    }

    const now = new Date().toISOString();
    const bundleBooking = {
      id: this._generateId('bbook'),
      bundleId,
      departureDateTime: bundle.departureDateTime,
      returnDateTime: bundle.returnDateTime,
      adults,
      totalPrice: bundle.totalPrice || 0,
      currency: bundle.currency || 'usd',
      createdAt: now
    };

    bundleBookings.push(bundleBooking);
    this._saveToStorage('bundle_bookings', bundleBookings);

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      itemType: 'bundle_booking',
      itemRefId: bundleBooking.id,
      displayName: bundle.title || 'Flight + Hotel bundle',
      startDate: bundle.departureDateTime,
      endDate: bundle.returnDateTime,
      travelersSummary: this._summarizeTravelers(adults, 0),
      totalPrice: bundleBooking.totalPrice,
      currency: bundleBooking.currency,
      createdAt: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('booking_cart_items', cartItems);

    const carts = this._getFromStorage('booking_carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updatedAt = now;
      this._saveToStorage('booking_carts', carts);
    }

    const cartSummary = this._buildCartSummary(cart, cartItems);

    const enrichedCartItem = {
      ...cartItem,
      cart,
      itemRef: bundleBooking
    };

    const enrichedBundleBooking = {
      ...bundleBooking,
      bundle
    };

    return {
      bundleBooking: enrichedBundleBooking,
      cartItem: enrichedCartItem,
      cartSummary,
      success: true,
      message: 'Bundle booking added to cart.'
    };
  }

  // ------------------ Blog & Articles ------------------
  getBlogHomeContent() {
    const articles = this._getFromStorage('blog_articles');

    const sortedByDate = articles.slice().sort((a, b) => {
      const da = a.publishDate ? new Date(a.publishDate) : new Date(0);
      const db = b.publishDate ? new Date(b.publishDate) : new Date(0);
      return db - da;
    });

    const featuredArticles = sortedByDate.slice(0, 3);
    const recentArticles = sortedByDate.slice(0, 10);

    const categorySet = new Set();
    for (const a of articles) {
      if (Array.isArray(a.categories)) {
        for (const c of a.categories) categorySet.add(c);
      }
    }

    return {
      featuredArticles,
      recentArticles,
      categories: Array.from(categorySet)
    };
  }

  searchBlogArticles(query, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('blog_articles');
    const q = (query || '').trim().toLowerCase();

    const filtered = q
      ? articles.filter(a => {
          const text = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '')).toLowerCase();
          return text.includes(q);
        })
      : articles.slice();

    const totalResults = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      results: filtered.slice(startIndex, endIndex),
      totalResults,
      page,
      pageSize
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const savedArticles = this._getFromStorage('saved_articles');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        contentHtml: '',
        isSaved: false,
        relatedArticles: []
      };
    }

    const isSaved = savedArticles.some(s => s.articleId === articleId);

    const relatedArticles = articles.filter(a => {
      if (a.id === article.id) return false;
      let related = false;
      if (article.destinationCity && a.destinationCity && article.destinationCity === a.destinationCity) related = true;
      if (article.destinationCountry && a.destinationCountry && article.destinationCountry === a.destinationCountry) related = true;
      if (!related && Array.isArray(article.tags) && Array.isArray(a.tags)) {
        related = article.tags.some(t => a.tags.includes(t));
      }
      return related;
    }).slice(0, 5);

    return {
      article,
      contentHtml: article.content || '',
      isSaved,
      relatedArticles
    };
  }

  saveArticle(articleId) {
    const savedArticles = this._getFromStorage('saved_articles');
    const exists = savedArticles.some(s => s.articleId === articleId);
    if (exists) {
      const existing = savedArticles.find(s => s.articleId === articleId);
      return {
        savedArticle: existing,
        success: true,
        message: 'Article already saved.'
      };
    }

    const now = new Date().toISOString();
    const savedArticle = {
      id: this._generateId('sart'),
      articleId,
      savedAt: now
    };

    savedArticles.push(savedArticle);
    this._saveToStorage('saved_articles', savedArticles);

    return {
      savedArticle,
      success: true,
      message: 'Article saved.'
    };
  }

  unsaveArticle(articleId) {
    let savedArticles = this._getFromStorage('saved_articles');
    const before = savedArticles.length;
    savedArticles = savedArticles.filter(s => s.articleId !== articleId);
    this._saveToStorage('saved_articles', savedArticles);
    const removed = before !== savedArticles.length;
    return {
      success: removed,
      message: removed ? 'Article unsaved.' : 'Saved article not found.'
    };
  }

  getSavedArticlesAndReadingLists() {
    const savedArticlesRaw = this._getFromStorage('saved_articles');
    const readingLists = this._getFromStorage('reading_lists');
    const articles = this._getFromStorage('blog_articles');

    const savedArticles = savedArticlesRaw.map(s => {
      const article = articles.find(a => a.id === s.articleId) || null;
      const savedWithResolved = {
        ...s,
        article
      };
      return {
        saved: savedWithResolved,
        article
      };
    });

    return {
      savedArticles,
      readingLists
    };
  }

  createReadingList(name, description) {
    const readingLists = this._getFromStorage('reading_lists');
    const now = new Date().toISOString();

    const readingList = {
      id: this._generateId('rlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };

    readingLists.push(readingList);
    this._saveToStorage('reading_lists', readingLists);

    return {
      readingList,
      success: true,
      message: 'Reading list created.'
    };
  }

  addArticlesToReadingList(readingListId, articleIds) {
    const readingListArticles = this._getFromStorage('reading_list_articles');
    const readingLists = this._getFromStorage('reading_lists');
    const articles = this._getFromStorage('blog_articles');

    const list = readingLists.find(r => r.id === readingListId) || null;
    if (!list) {
      return {
        addedCount: 0,
        readingListArticles: [],
        success: false,
        message: 'Reading list not found.'
      };
    }

    const ids = Array.isArray(articleIds) ? articleIds : [];
    const newRecords = [];

    for (const articleId of ids) {
      const exists = readingListArticles.some(rla => rla.readingListId === readingListId && rla.articleId === articleId);
      if (exists) continue;
      const now = new Date().toISOString();
      const rec = {
        id: this._generateId('rla'),
        readingListId,
        articleId,
        addedAt: now
      };
      readingListArticles.push(rec);
      newRecords.push(rec);
    }

    this._saveToStorage('reading_list_articles', readingListArticles);

    const enriched = newRecords.map(rla => ({
      ...rla,
      readingList: list,
      article: articles.find(a => a.id === rla.articleId) || null
    }));

    return {
      addedCount: newRecords.length,
      readingListArticles: enriched,
      success: true,
      message: 'Articles added to reading list.'
    };
  }

  removeArticleFromReadingList(readingListId, articleId) {
    let readingListArticles = this._getFromStorage('reading_list_articles');
    const before = readingListArticles.length;
    readingListArticles = readingListArticles.filter(r => !(r.readingListId === readingListId && r.articleId === articleId));
    this._saveToStorage('reading_list_articles', readingListArticles);
    const removed = before !== readingListArticles.length;

    return {
      success: removed,
      message: removed ? 'Article removed from reading list.' : 'Article not found in reading list.'
    };
  }

  // ------------------ Cart ------------------
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsRaw = this._getFromStorage('booking_cart_items');
    const itemsForCart = cartItemsRaw.filter(ci => ci.cartId === cart.id);

    const tours = this._getFromStorage('tours');
    const tourBookings = this._getFromStorage('tour_bookings');
    const hotels = this._getFromStorage('hotels');
    const hotelBookings = this._getFromStorage('hotel_bookings');
    const bundles = this._getFromStorage('bundles');
    const bundleBookings = this._getFromStorage('bundle_bookings');

    const items = itemsForCart.map(ci => {
      let itemRef = null;
      if (ci.itemType === 'tour_booking') {
        const tb = tourBookings.find(t => t.id === ci.itemRefId) || null;
        if (tb) {
          const tour = tours.find(t => t.id === tb.tourId) || null;
          const departureList = this._getFromStorage('tour_departures');
          const departure = departureList.find(d => d.id === tb.tourDepartureId) || null;
          itemRef = { ...tb, tour, tourDeparture: departure };
        } else {
          itemRef = tb;
        }
      } else if (ci.itemType === 'hotel_booking') {
        const hb = hotelBookings.find(h => h.id === ci.itemRefId) || null;
        if (hb) {
          const hotel = hotels.find(h => h.id === hb.hotelId) || null;
          const roomTypes = this._getFromStorage('hotel_room_types');
          const roomType = roomTypes.find(r => r.id === hb.roomTypeId) || null;
          itemRef = { ...hb, hotel, roomType };
        } else {
          itemRef = hb;
        }
      } else if (ci.itemType === 'bundle_booking') {
        const bb = bundleBookings.find(b => b.id === ci.itemRefId) || null;
        if (bb) {
          const bundle = bundles.find(b => b.id === bb.bundleId) || null;
          itemRef = { ...bb, bundle };
        } else {
          itemRef = bb;
        }
      }

      return {
        ...ci,
        cart,
        itemRef
      };
    });

    const summary = this._buildCartSummary(cart, itemsForCart);

    return {
      cart,
      items,
      totalPrice: summary.totalPrice,
      currency: summary.currency
    };
  }

  updateCartItemTravelers(cartItemId, adults, children) {
    const cartItems = this._getFromStorage('booking_cart_items');
    const tours = this._getFromStorage('tours');
    const tourBookings = this._getFromStorage('tour_bookings');
    const tourDepartures = this._getFromStorage('tour_departures');
    const hotels = this._getFromStorage('hotels');
    const hotelBookings = this._getFromStorage('hotel_bookings');
    const roomTypes = this._getFromStorage('hotel_room_types');
    const bundles = this._getFromStorage('bundles');
    const bundleBookings = this._getFromStorage('bundle_bookings');

    const cartItemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (cartItemIndex === -1) {
      return {
        cartItem: null,
        cartSummary: { itemsCount: 0, totalPrice: 0, currency: 'usd' },
        success: false,
        message: 'Cart item not found.'
      };
    }

    let cartItem = cartItems[cartItemIndex];
    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();

    if (cartItem.itemType === 'tour_booking') {
      const tbIndex = tourBookings.findIndex(t => t.id === cartItem.itemRefId);
      if (tbIndex !== -1) {
        const tb = tourBookings[tbIndex];
        const newAdults = typeof adults === 'number' ? adults : tb.adults;
        const newChildren = typeof children === 'number' ? children : (tb.children || 0);
        const tour = tours.find(t => t.id === tb.tourId) || null;
        const departure = tourDepartures.find(d => d.id === tb.tourDepartureId) || null;
        const pricing = this._estimateTourPrice(tour, departure, newAdults, newChildren, tb.accommodationLevel);
        const updatedTb = {
          ...tb,
          adults: newAdults,
          children: newChildren,
          pricePerPerson: pricing.pricePerPerson,
          totalPrice: pricing.totalPrice
        };
        tourBookings[tbIndex] = updatedTb;
        this._saveToStorage('tour_bookings', tourBookings);

        const travelersSummary = this._summarizeTravelers(newAdults, newChildren);
        cartItem = {
          ...cartItem,
          travelersSummary,
          totalPrice: pricing.totalPrice,
          currency: pricing.currency
        };
      }
    } else if (cartItem.itemType === 'hotel_booking') {
      const hbIndex = hotelBookings.findIndex(h => h.id === cartItem.itemRefId);
      if (hbIndex !== -1) {
        const hb = hotelBookings[hbIndex];
        const newAdults = typeof adults === 'number' ? adults : hb.adults;
        const newChildren = typeof children === 'number' ? children : (hb.children || 0);
        const updatedHb = {
          ...hb,
          adults: newAdults,
          children: newChildren
        };
        hotelBookings[hbIndex] = updatedHb;
        this._saveToStorage('hotel_bookings', hotelBookings);

        const travelersSummary = this._summarizeTravelers(newAdults, newChildren);
        cartItem = {
          ...cartItem,
          travelersSummary
        };
      }
    } else if (cartItem.itemType === 'bundle_booking') {
      const bbIndex = bundleBookings.findIndex(b => b.id === cartItem.itemRefId);
      if (bbIndex !== -1) {
        const bb = bundleBookings[bbIndex];
        const newAdults = typeof adults === 'number' ? adults : bb.adults;
        const updatedBb = {
          ...bb,
          adults: newAdults
        };
        bundleBookings[bbIndex] = updatedBb;
        this._saveToStorage('bundle_bookings', bundleBookings);

        const travelersSummary = this._summarizeTravelers(newAdults, 0);
        cartItem = {
          ...cartItem,
          travelersSummary
        };
      }
    }

    cartItems[cartItemIndex] = cartItem;
    this._saveToStorage('booking_cart_items', cartItems);

    const carts = this._getFromStorage('booking_carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updatedAt = now;
      this._saveToStorage('booking_carts', carts);
    }

    const summary = this._buildCartSummary(cart, cartItems.filter(ci => ci.cartId === cart.id));

    let itemRef = null;
    if (cartItem.itemType === 'tour_booking') {
      const tb = tourBookings.find(t => t.id === cartItem.itemRefId) || null;
      if (tb) {
        const tour = tours.find(t => t.id === tb.tourId) || null;
        const departure = tourDepartures.find(d => d.id === tb.tourDepartureId) || null;
        itemRef = { ...tb, tour, tourDeparture: departure };
      }
    } else if (cartItem.itemType === 'hotel_booking') {
      const hb = hotelBookings.find(h => h.id === cartItem.itemRefId) || null;
      if (hb) {
        const hotel = hotels.find(h => h.id === hb.hotelId) || null;
        const roomType = roomTypes.find(r => r.id === hb.roomTypeId) || null;
        itemRef = { ...hb, hotel, roomType };
      }
    } else if (cartItem.itemType === 'bundle_booking') {
      const bb = bundleBookings.find(b => b.id === cartItem.itemRefId) || null;
      if (bb) {
        const bundle = bundles.find(b => b.id === bb.bundleId) || null;
        itemRef = { ...bb, bundle };
      }
    }

    const enrichedCartItem = {
      ...cartItem,
      cart,
      itemRef
    };

    return {
      cartItem: enrichedCartItem,
      cartSummary: summary,
      success: true,
      message: 'Cart item updated.'
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('booking_cart_items');
    const before = cartItems.length;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('booking_cart_items', cartItems);

    const carts = this._getFromStorage('booking_carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    const now = new Date().toISOString();
    if (cartIndex >= 0) {
      carts[cartIndex].updatedAt = now;
      this._saveToStorage('booking_carts', carts);
    }

    const summary = this._buildCartSummary(cart, cartItems.filter(ci => ci.cartId === cart.id));

    const removed = before !== cartItems.length;
    return {
      cartSummary: summary,
      success: removed,
      message: removed ? 'Cart item removed.' : 'Cart item not found.'
    };
  }

  submitTravelerDetails(primaryContact, travelers) {
    if (!primaryContact || !primaryContact.fullName || !primaryContact.email) {
      return {
        success: false,
        message: 'Primary contact full name and email are required.'
      };
    }
    if (!Array.isArray(travelers) || travelers.length === 0) {
      return {
        success: false,
        message: 'At least one traveler is required.'
      };
    }

    const payload = {
      primaryContact,
      travelers,
      submittedAt: new Date().toISOString()
    };

    // store single record
    localStorage.setItem('traveler_details', JSON.stringify(payload));

    return {
      success: true,
      message: 'Traveler details submitted.'
    };
  }

  // ------------------ Newsletter ------------------
  getNewsletterOptions() {
    const topicOptions = [
      { code: 'budget_travel', label: 'Budget travel' },
      { code: 'travel_tips', label: 'Travel tips' },
      { code: 'family_travel', label: 'Family travel' },
      { code: 'adventure_travel', label: 'Adventure travel' },
      { code: 'deals', label: 'Deals & promotions' }
    ];

    const frequencyOptions = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return {
      topicOptions,
      frequencyOptions
    };
  }

  createOrUpdateNewsletterSubscription(name, email, topics, frequency, agreedToPromotions) {
    if (!email || !frequency) {
      return {
        subscription: null,
        success: false,
        message: 'Email and frequency are required.'
      };
    }

    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();

    const idx = subscriptions.findIndex(s => s.email === email);
    if (idx >= 0) {
      const updated = {
        ...subscriptions[idx],
        name: name || subscriptions[idx].name || '',
        topics: Array.isArray(topics) ? topics : subscriptions[idx].topics || [],
        frequency,
        agreedToPromotions: !!agreedToPromotions
      };
      subscriptions[idx] = updated;
      this._saveToStorage('newsletter_subscriptions', subscriptions);
      return {
        subscription: updated,
        success: true,
        message: 'Subscription updated.'
      };
    }

    const subscription = {
      id: this._generateId('nsub'),
      name: name || '',
      email,
      topics: Array.isArray(topics) ? topics : [],
      frequency,
      agreedToPromotions: !!agreedToPromotions,
      createdAt: now
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      success: true,
      message: 'Subscription created.'
    };
  }

  // ------------------ Insurance ------------------
  getTravelInsurancePlans() {
    const plans = this._getFromStorage('insurance_plans');
    return plans;
  }

  configureInsurancePolicyForReview(planId, tripCost, tripDurationDays, coverageStartDate, coverageEndDate, addons) {
    const plans = this._getFromStorage('insurance_plans');
    const plan = plans.find(p => p.id === planId) || null;

    if (!plan) {
      return {
        policyConfig: null,
        plan: null,
        coverageSummaryHtml: '',
        estimatedPremium: 0,
        currency: 'usd'
      };
    }

    const est = this._estimateInsurancePremium(plan, tripCost, tripDurationDays, addons);
    const now = new Date().toISOString();

    const policyConfigs = this._getFromStorage('insurance_policy_configs');

    const policyConfig = {
      id: this._generateId('ipol'),
      planId,
      tripCost,
      tripDurationDays: typeof tripDurationDays === 'number' ? tripDurationDays : null,
      coverageStartDate,
      coverageEndDate,
      addons: Array.isArray(addons) ? addons : [],
      estimatedPremium: est.estimatedPremium,
      currency: est.currency,
      createdAt: now
    };

    policyConfigs.push(policyConfig);
    this._saveToStorage('insurance_policy_configs', policyConfigs);

    const coverageSummaryHtml = `Coverage for trip cost $${tripCost} from ${coverageStartDate} to ${coverageEndDate}. Includes plan: ${plan.name}.`;

    return {
      policyConfig,
      plan,
      coverageSummaryHtml,
      estimatedPremium: est.estimatedPremium,
      currency: est.currency
    };
  }

  // ------------------ Custom Trip Builder ------------------
  getTripBuilderCountryOptions() {
    const activityTemplates = this._getFromStorage('activity_templates');
    const countryMap = {};

    for (const a of activityTemplates) {
      if (a.country && !countryMap[a.country]) {
        countryMap[a.country] = {
          code: a.country,
          name: a.country
        };
      }
    }

    return Object.values(countryMap);
  }

  getTripBuilderCityOptions(country) {
    const activityTemplates = this._getFromStorage('activity_templates');
    const countryLower = country ? country.toLowerCase() : null;
    const cityMap = {};

    for (const a of activityTemplates) {
      if (countryLower && a.country && a.country.toLowerCase() !== countryLower) continue;
      if (a.cityName && !cityMap[a.cityName]) {
        cityMap[a.cityName] = { cityName: a.cityName };
      }
    }

    return Object.values(cityMap);
  }

  getActivityTemplatesForCity(country, cityName) {
    const activityTemplates = this._getFromStorage('activity_templates');
    const countryLower = country ? country.toLowerCase() : null;
    const cityLower = cityName ? cityName.toLowerCase() : null;

    return activityTemplates.filter(a => {
      if (countryLower && a.country && a.country.toLowerCase() !== countryLower) return false;
      if (cityLower && a.cityName && a.cityName.toLowerCase() !== cityLower) return false;
      return true;
    });
  }

  createCustomItinerary(name, country, startDate, accommodationPreferenceLevel, cities, activities) {
    const itineraries = this._getFromStorage('custom_itineraries');
    const itineraryCities = this._getFromStorage('custom_itinerary_cities');
    const itineraryActivities = this._getFromStorage('custom_itinerary_activities');

    const citySegments = Array.isArray(cities) ? cities : [];
    const activitySegments = Array.isArray(activities) ? activities : [];

    const totalNights = citySegments.reduce((sum, c) => sum + (c.nights || 0), 0);
    const now = new Date().toISOString();

    const itinerary = {
      id: this._generateId('it'),
      name,
      country,
      startDate,
      totalNights,
      accommodationPreferenceLevel,
      createdAt: now
    };

    itineraries.push(itinerary);
    this._saveToStorage('custom_itineraries', itineraries);

    // compute city dates
    const start = new Date(startDate);
    let cursor = new Date(start.getTime());

    const createdCities = citySegments.map((c, index) => {
      const nights = c.nights || 0;
      const cityStart = new Date(cursor.getTime());
      const cityEnd = new Date(cursor.getTime() + nights * 24 * 60 * 60 * 1000);
      cursor = new Date(cityEnd.getTime());

      const cityRec = {
        id: this._generateId('itcity'),
        itineraryId: itinerary.id,
        cityName: c.cityName,
        order: typeof c.order === 'number' ? c.order : index + 1,
        nights,
        startDate: this._formatDateISO(cityStart),
        endDate: this._formatDateISO(cityEnd)
      };
      itineraryCities.push(cityRec);
      return cityRec;
    });

    this._saveToStorage('custom_itinerary_cities', itineraryCities);

    const createdActivities = activitySegments.map(a => {
      const actRec = {
        id: this._generateId('itact'),
        itineraryId: itinerary.id,
        cityName: a.cityName,
        activityTemplateId: a.activityTemplateId,
        dayNumber: typeof a.dayNumber === 'number' ? a.dayNumber : null,
        addedAt: now
      };
      itineraryActivities.push(actRec);
      return actRec;
    });

    this._saveToStorage('custom_itinerary_activities', itineraryActivities);

    return {
      itinerary,
      cities: createdCities,
      activities: createdActivities,
      success: true,
      message: 'Custom itinerary created.'
    };
  }

  // ------------------ Static Content ------------------
  getAboutUsContent() {
    return {
      headline: 'About Our Travel Agency',
      missionHtml: '<p>We help independent travelers design memorable, budget-friendly trips around the world.</p>',
      backgroundHtml: '<p>Founded by passionate travelers, our agency specializes in curated tours, smart booking tools, and practical travel advice.</p>',
      specializations: [
        'Tailor-made itineraries',
        'Budget travel optimization',
        'Family-friendly city breaks',
        'Cultural and food experiences'
      ],
      credentials: [
        'IATA-accredited agency',
        'Certified travel advisors',
        'Over 10,000 trips planned'
      ],
      testimonials: [
        { author: 'Jamie & Taylor', quote: 'They turned our loose ideas into a flawless two-week Japan itinerary.' },
        { author: 'Priya', quote: 'Great value, honest advice, and super responsive support.' }
      ]
    };
  }

  getContactPageContent() {
    return {
      email: 'support@example-travel-agency.com',
      phoneNumbers: ['+1-555-0123-456', '+44-20-1234-5678'],
      officeAddress: '123 Explorer Lane, Suite 400, Travel City, World',
      inquiryTypeOptions: [
        { value: 'booking_question', label: 'Booking question' },
        { value: 'custom_itinerary_request', label: 'Custom itinerary request' },
        { value: 'support', label: 'Support' }
      ],
      expectedResponseTime: 'We typically respond within 1–2 business days.'
    };
  }

  submitContactForm(name, email, inquiryType, subject, message) {
    if (!name || !email || !inquiryType || !subject || !message) {
      return {
        success: false,
        message: 'All fields are required.'
      };
    }

    const submissions = this._getFromStorage('contact_submissions');
    const now = new Date().toISOString();

    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      inquiryType,
      subject,
      message,
      submittedAt: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been sent.'
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
