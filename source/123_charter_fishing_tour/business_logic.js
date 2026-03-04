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
  }

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables based on data models
    ensure('destinations', []); // Destination
    ensure('trips', []); // Trip
    ensure('trip_start_times', []); // TripStartTime
    ensure('trip_add_ons', []); // TripAddOn
    ensure('promo_codes', []); // PromoCode
    ensure('bookings', []); // Booking
    ensure('booking_passengers', []); // BookingPassenger
    ensure('booking_add_ons', []); // BookingAddOn
    ensure('payment_infos', []); // PaymentInfo
    ensure('account_profiles', []); // AccountProfile
    ensure('saved_trips', []); // SavedTrip
    ensure('captain_messages', []); // CaptainMessage

    // Additional internal/support tables
    ensure('support_requests', []);

    // Static-like content (loaded from storage, but we do not seed real content)
    ensure('about_content', { title: '', bodySections: [] });
    ensure('help_faq_content', { sections: [] });
    ensure('contact_topics', { supportEmail: '', supportHours: '', topics: [] });
    ensure('terms_content', { title: '', sections: [] });
    ensure('privacy_content', { title: '', sections: [] });

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // ---------- Generic storage helpers ----------

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  _parseDateString(dateStr) {
    // Expecting 'YYYY-MM-DD'
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _formatDateToYMD(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _getWeekdayName(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const idx = d.getDay(); // 0 = Sunday
    const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return names[idx];
  }

  _getTripTypeLabel(tripType) {
    if (tripType === 'private_charter') return 'Private charter';
    if (tripType === 'shared_group_charter') return 'Shared / group charter';
    return tripType || '';
  }

  _getDurationLabel(durationCategory, durationHours) {
    switch (durationCategory) {
      case 'two_to_four_hours':
        return '2-4 hours';
      case 'four_hours':
        return '4 hours';
      case 'four_to_five_hours':
        return '4-5 hours';
      case 'six_hours':
        return '6 hours';
      case 'six_to_eight_hours':
        return '6-8 hours';
      case 'full_day_8_plus_hours':
        return 'Full day (8+ hours)';
      default:
        return durationHours ? (durationHours + ' hours') : '';
    }
  }

  _getTimeOfDayLabel(value) {
    switch (value) {
      case 'morning':
        return 'Morning (6am-12pm)';
      case 'afternoon':
        return 'Afternoon (12pm-5pm)';
      case 'evening':
        return 'Evening (5pm-9pm)';
      case 'full_day':
        return 'Full day';
      default:
        return value || '';
    }
  }

  _formatPriceDisplay(pricingModel, amount, currency) {
    const symbol = (currency === 'usd' || !currency) ? '$' : '';
    const rounded = (amount % 1 === 0) ? amount.toFixed(0) : amount.toFixed(2);
    if (pricingModel === 'per_trip') {
      return symbol + rounded + ' total';
    }
    if (pricingModel === 'per_person') {
      return symbol + rounded + ' per person';
    }
    return symbol + rounded;
  }

  _resolveDestinationById(destinationId) {
    if (!destinationId) return null;
    const destinations = this._getFromStorage('destinations', []);
    return destinations.find(d => d.id === destinationId) || null;
  }

  // ---------- Helper: account & booking ----------

  _getOrCreateAccountProfile() {
    const profiles = this._getFromStorage('account_profiles', []);
    if (profiles.length > 0) {
      return profiles[0];
    }
    // Do not auto-create mock profile; return null when absent
    return null;
  }

  _setAccountProfile(profile) {
    const arr = profile ? [profile] : [];
    this._saveToStorage('account_profiles', arr);
  }

  _getCurrentBookingId() {
    return localStorage.getItem('current_booking_id');
  }

  _setCurrentBookingId(bookingId) {
    if (!bookingId) {
      localStorage.removeItem('current_booking_id');
    } else {
      localStorage.setItem('current_booking_id', bookingId);
    }
  }

  _getOrCreateCurrentBooking() {
    const bookingId = this._getCurrentBookingId();
    if (!bookingId) return null;
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === bookingId) || null;
    if (!booking) {
      this._setCurrentBookingId(null);
      return null;
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      this._setCurrentBookingId(null);
      return null;
    }
    return booking;
  }

  _saveBooking(updatedBooking) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex(b => b.id === updatedBooking.id);
    if (idx >= 0) {
      bookings[idx] = updatedBooking;
    } else {
      bookings.push(updatedBooking);
    }
    this._saveToStorage('bookings', bookings);
  }

  // ---------- Helper: search & pricing ----------

  _searchTripsDataStore(destinationId, fishingDate, keyword, filters, sort) {
    let trips = this._getFromStorage('trips', []);

    // status active only
    trips = trips.filter(t => t.status === 'active');

    if (destinationId) {
      trips = trips.filter(t => t.destinationId === destinationId);
    }

    if (keyword) {
      const q = String(keyword).toLowerCase();
      trips = trips.filter(t => {
        const fields = [];
        if (t.title) fields.push(t.title);
        if (t.shortDescription) fields.push(t.shortDescription);
        if (t.fullDescription) fields.push(t.fullDescription);
        if (t.experienceType) fields.push(t.experienceType);
        if (Array.isArray(t.keywords)) fields.push(t.keywords.join(' '));
        const haystack = fields.join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    const f = filters || {};

    if (f.tripType) {
      trips = trips.filter(t => t.tripType === f.tripType);
    }

    if (Array.isArray(f.durationCategories) && f.durationCategories.length > 0) {
      const set = new Set(f.durationCategories);
      trips = trips.filter(t => set.has(t.durationCategory));
    }

    if (Array.isArray(f.timeOfDay) && f.timeOfDay.length > 0) {
      const allowed = new Set(f.timeOfDay);
      trips = trips.filter(t => Array.isArray(t.timeOfDayOptions) && t.timeOfDayOptions.some(v => allowed.has(v)));
    }

    if (typeof f.isFamilyFriendly === 'boolean') {
      trips = trips.filter(t => !!t.isFamilyFriendly === f.isFamilyFriendly);
    }

    if (typeof f.goodForKids === 'boolean') {
      trips = trips.filter(t => !!t.goodForKids === f.goodForKids);
    }

    if (typeof f.wheelchairAccessible === 'boolean') {
      trips = trips.filter(t => !!t.wheelchairAccessible === f.wheelchairAccessible);
    }

    if (typeof f.ratingMin === 'number') {
      trips = trips.filter(t => typeof t.ratingAverage === 'number' && t.ratingAverage >= f.ratingMin);
    }

    if (typeof f.minReviewCount === 'number') {
      trips = trips.filter(t => typeof t.reviewCount === 'number' && t.reviewCount >= f.minReviewCount);
    }

    if (typeof f.maxPrice === 'number' || typeof f.minPrice === 'number') {
      const mode = f.priceFilterMode || 'total';
      const minPrice = typeof f.minPrice === 'number' ? f.minPrice : null;
      const maxPrice = typeof f.maxPrice === 'number' ? f.maxPrice : null;
      trips = trips.filter(t => {
        let price = t.basePrice || 0;
        if (mode === 'per_person') {
          if (t.pricingModel !== 'per_person') return false;
        }
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    const sortOption = sort && sort.sortOption ? sort.sortOption : 'relevance';

    trips = trips.slice(); // copy

    if (sortOption === 'price_low_to_high') {
      trips.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sortOption === 'price_high_to_low') {
      trips.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortOption === 'rating_high_to_low') {
      trips.sort((a, b) => {
        const ra = a.ratingAverage || 0;
        const rb = b.ratingAverage || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.reviewCount || 0;
        const rcb = b.reviewCount || 0;
        return rcb - rca;
      });
    } else {
      // relevance: basic heuristic: rating desc, reviewCount desc, price asc
      trips.sort((a, b) => {
        const ra = a.ratingAverage || 0;
        const rb = b.ratingAverage || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.reviewCount || 0;
        const rcb = b.reviewCount || 0;
        if (rcb !== rca) return rcb - rca;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    }

    return trips;
  }

  _recalculateCurrentBookingTotals(booking) {
    if (!booking) return booking;
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === booking.tripId); // may be undefined

    if (!trip) {
      // Cannot recompute without trip; leave as-is
      return booking;
    }

    const numPax = (booking.numAdults || 0) + (booking.numChildren || 0);
    let base = 0;
    if (trip.pricingModel === 'per_trip') {
      base = typeof trip.basePrice === 'number' ? trip.basePrice : 0;
    } else if (trip.pricingModel === 'per_person') {
      base = (typeof trip.basePrice === 'number' ? trip.basePrice : 0) * numPax;
    }
    if (typeof trip.minimumTotalPrice === 'number' && trip.minimumTotalPrice > 0 && base < trip.minimumTotalPrice) {
      base = trip.minimumTotalPrice;
    }

    const bookingAddOns = this._getFromStorage('booking_add_ons', []);
    const addOnsForBooking = bookingAddOns.filter(a => a.bookingId === booking.id);
    const addOnsTotal = addOnsForBooking.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

    // Promo code discount
    const promoCodes = this._getFromStorage('promo_codes', []);
    let discount = 0;
    let totalBeforeDiscount = base + addOnsTotal;

    if (booking.promoCodeId) {
      const promo = promoCodes.find(p => p.id === booking.promoCodeId && p.isActive);
      if (promo) {
        const now = new Date();
        let withinDateRange = true;
        if (promo.validFrom) {
          const vf = new Date(promo.validFrom);
          if (!isNaN(vf.getTime()) && now < vf) withinDateRange = false;
        }
        if (promo.validTo) {
          const vt = new Date(promo.validTo);
          if (!isNaN(vt.getTime()) && now > vt) withinDateRange = false;
        }
        if (withinDateRange) {
          if (typeof promo.minBookingTotal === 'number' && totalBeforeDiscount < promo.minBookingTotal) {
            // not enough to apply; keep discount 0
          } else if (promo.discountType === 'percentage') {
            discount = (totalBeforeDiscount * (promo.discountValue || 0)) / 100;
          } else if (promo.discountType === 'fixed_amount') {
            discount = promo.discountValue || 0;
          }
        }
      }
    }

    if (discount > totalBeforeDiscount) {
      discount = totalBeforeDiscount;
    }

    booking.basePriceTotal = base;
    booking.addOnsTotal = addOnsTotal;
    booking.discountTotal = discount;
    booking.grandTotal = totalBeforeDiscount - discount;
    booking.currency = trip.currency || 'usd';
    booking.pricingModel = trip.pricingModel;
    booking.updatedAt = new Date().toISOString();

    return booking;
  }

  _findApplicablePromoCode(promoCodeText, booking) {
    if (!promoCodeText || !booking) return null;
    const codeInput = String(promoCodeText).trim().toLowerCase();
    if (!codeInput) return null;

    const promoCodes = this._getFromStorage('promo_codes', []);
    const promo = promoCodes.find(p => String(p.code).toLowerCase() === codeInput && p.isActive);
    if (!promo) return null;

    const now = new Date();
    if (promo.validFrom) {
      const vf = new Date(promo.validFrom);
      if (!isNaN(vf.getTime()) && now < vf) return null;
    }
    if (promo.validTo) {
      const vt = new Date(promo.validTo);
      if (!isNaN(vt.getTime()) && now > vt) return null;
    }

    const totalBeforeDiscount = (booking.basePriceTotal || 0) + (booking.addOnsTotal || 0);
    if (typeof promo.minBookingTotal === 'number' && totalBeforeDiscount < promo.minBookingTotal) {
      return null;
    }

    return promo;
  }

  _validatePassengerAges(trip, passengers) {
    const errors = [];
    if (!Array.isArray(passengers) || !trip) return errors;

    passengers.forEach((p, index) => {
      if (typeof p.age !== 'number' || isNaN(p.age)) {
        errors.push({ index, field: 'age', error: 'Age is required and must be a number.' });
        return;
      }
      if (p.age <= 0) {
        errors.push({ index, field: 'age', error: 'Age must be greater than 0.' });
      }
      if (typeof trip.minimumAge === 'number' && p.age < trip.minimumAge) {
        errors.push({ index, field: 'age', error: 'Passenger does not meet minimum age requirement.' });
      }
      if (p.passengerType === 'child') {
        if (typeof trip.childAgeMax === 'number' && p.age > trip.childAgeMax) {
          errors.push({ index, field: 'age', error: 'Child age exceeds allowed maximum.' });
        }
      }
    });

    return errors;
  }

  // ---------- Interface implementations ----------

  // getSiteHeaderContext
  getSiteHeaderContext() {
    const profile = this._getOrCreateAccountProfile();
    const savedTrips = this._getFromStorage('saved_trips', []);
    const bookings = this._getFromStorage('bookings', []);

    const hasInProgressBooking = bookings.some(b => b.status === 'in_progress' || b.status === 'pending_review');

    return {
      hasAccount: !!profile,
      accountName: profile ? profile.fullName : '',
      savedTripsCount: savedTrips.length,
      hasInProgressBooking: hasInProgressBooking
    };
  }

  // getHomePageContext
  getHomePageContext() {
    const profile = this._getOrCreateAccountProfile();
    let defaultDestination = null;
    if (profile && profile.defaultDestinationId) {
      const dest = this._resolveDestinationById(profile.defaultDestinationId);
      if (dest) {
        defaultDestination = { id: dest.id, displayName: dest.displayName };
      }
    }

    const today = new Date();
    const defaultDate = this._formatDateToYMD(today);

    const destinations = this._getFromStorage('destinations', []);
    const popularDestinations = destinations.filter(d => !!d.isPopular).map(d => ({
      id: d.id,
      displayName: d.displayName,
      city: d.city,
      state: d.state,
      isPopular: !!d.isPopular
    }));

    const trips = this._getFromStorage('trips', []);
    const experienceTypeSet = new Set();
    trips.forEach(t => {
      if (t.experienceType) experienceTypeSet.add(t.experienceType);
    });

    const labelMap = {
      general: 'General',
      offshore: 'Offshore',
      inshore: 'Inshore',
      nearshore: 'Nearshore',
      reef: 'Reef',
      bay: 'Bay',
      tuna: 'Tuna fishing',
      sunset: 'Sunset trip'
    };

    const popularExperienceTypes = Array.from(experienceTypeSet).map(val => ({
      value: val,
      label: labelMap[val] || (val.charAt(0).toUpperCase() + val.slice(1))
    }));

    return {
      defaultDestination,
      defaultDate,
      popularDestinations,
      popularExperienceTypes
    };
  }

  // getDestinationSuggestions(query)
  getDestinationSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    const destinations = this._getFromStorage('destinations', []);

    if (!q) {
      // No query: return popular destinations (or all if no popular)
      const popular = destinations.filter(d => !!d.isPopular);
      const list = (popular.length > 0 ? popular : destinations).slice(0, 10);
      return list.map(d => ({
        id: d.id,
        displayName: d.displayName,
        city: d.city,
        state: d.state,
        country: d.country
      }));
    }

    const results = destinations.filter(d => {
      const haystack = [d.displayName, d.city, d.state, d.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    }).slice(0, 10);

    return results.map(d => ({
      id: d.id,
      displayName: d.displayName,
      city: d.city,
      state: d.state,
      country: d.country
    }));
  }

  // getSearchFilterOptions
  getSearchFilterOptions(destinationId, fishingDate, keyword) {
    const trips = this._searchTripsDataStore(destinationId, fishingDate, keyword, {}, { sortOption: 'relevance' });

    const tripTypeSet = new Set();
    const durationSet = new Set();
    const timeOfDaySet = new Set();
    let minTotal = Number.POSITIVE_INFINITY;
    let maxTotal = 0;
    let minPerPerson = Number.POSITIVE_INFINITY;
    let maxPerPerson = 0;
    let hasPerPerson = false;
    let supportsFamily = false;
    let supportsAccessibility = false;

    trips.forEach(t => {
      if (t.tripType) tripTypeSet.add(t.tripType);
      if (t.durationCategory) durationSet.add(t.durationCategory);
      if (Array.isArray(t.timeOfDayOptions)) {
        t.timeOfDayOptions.forEach(v => timeOfDaySet.add(v));
      }
      const price = t.basePrice || 0;
      if (price < minTotal) minTotal = price;
      if (price > maxTotal) maxTotal = price;
      if (t.pricingModel === 'per_person') {
        hasPerPerson = true;
        if (price < minPerPerson) minPerPerson = price;
        if (price > maxPerPerson) maxPerPerson = price;
      }
      if (t.isFamilyFriendly || t.goodForKids) supportsFamily = true;
      if (t.wheelchairAccessible) supportsAccessibility = true;
    });

    if (!isFinite(minTotal)) {
      minTotal = 0;
      maxTotal = 0;
    }
    if (!hasPerPerson) {
      minPerPerson = 0;
      maxPerPerson = 0;
    }

    const tripTypes = Array.from(tripTypeSet).map(val => ({
      value: val,
      label: this._getTripTypeLabel(val)
    }));

    const durationCategories = Array.from(durationSet).map(val => ({
      value: val,
      label: this._getDurationLabel(val)
    }));

    const timeOfDayOptions = Array.from(timeOfDaySet).map(val => ({
      value: val,
      label: this._getTimeOfDayLabel(val)
    }));

    const ratingThresholds = [4.0, 4.5];
    const reviewCountThresholds = [10, 20, 50];

    return {
      tripTypes,
      durationCategories,
      timeOfDayOptions,
      ratingThresholds,
      reviewCountThresholds,
      priceRangeTotal: {
        min: minTotal,
        max: maxTotal,
        currency: 'usd'
      },
      priceRangePerPerson: {
        min: minPerPerson,
        max: maxPerPerson,
        currency: 'usd'
      },
      supportsFamilyFriendlyFilter: supportsFamily,
      supportsAccessibilityFilter: supportsAccessibility
    };
  }

  // searchTrips
  searchTrips(destinationId, fishingDate, keyword, filters, sort, page, pageSize) {
    const trips = this._searchTripsDataStore(destinationId, fishingDate, keyword, filters || {}, sort || {});

    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * size;
    const endIdx = startIdx + size;

    const pageTrips = trips.slice(startIdx, endIdx);

    const results = pageTrips.map(t => {
      const dest = this._resolveDestinationById(t.destinationId);
      const durationLabel = this._getDurationLabel(t.durationCategory, t.durationHours);
      const priceDisplay = this._formatPriceDisplay(t.pricingModel, t.basePrice, t.currency || 'usd');

      return {
        tripId: t.id,
        title: t.title,
        shortDescription: t.shortDescription || '',
        destinationName: dest ? dest.displayName : '',
        departureMarinaName: t.departureMarinaName || '',
        departureLatitude: t.departureLatitude,
        departureLongitude: t.departureLongitude,
        tripType: t.tripType,
        tripTypeLabel: this._getTripTypeLabel(t.tripType),
        experienceType: t.experienceType || null,
        durationHours: t.durationHours,
        durationCategory: t.durationCategory,
        durationLabel: durationLabel,
        timeOfDayOptions: Array.isArray(t.timeOfDayOptions) ? t.timeOfDayOptions : [],
        pricingModel: t.pricingModel,
        basePrice: t.basePrice,
        currency: t.currency || 'usd',
        priceDisplay: priceDisplay,
        ratingAverage: t.ratingAverage,
        reviewCount: t.reviewCount,
        isFamilyFriendly: !!t.isFamilyFriendly,
        goodForKids: !!t.goodForKids,
        wheelchairAccessible: !!t.wheelchairAccessible,
        thumbnailUrl: t.thumbnailUrl || ''
      };
    });

    return {
      totalCount: trips.length,
      page: p,
      pageSize: size,
      results
    };
  }

  // getTripDetails
  getTripDetails(tripId) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === tripId) || null;

    if (!trip) {
      return {
        trip: null,
        isSaved: false,
        initialBookingConfig: null
      };
    }

    const dest = this._resolveDestinationById(trip.destinationId);
    const savedTrips = this._getFromStorage('saved_trips', []);
    const isSaved = savedTrips.some(s => s.tripId === trip.id);

    const durationLabel = this._getDurationLabel(trip.durationCategory, trip.durationHours);
    const priceDisplay = this._formatPriceDisplay(trip.pricingModel, trip.basePrice, trip.currency || 'usd');

    const tripDetails = {
      id: trip.id,
      title: trip.title,
      shortDescription: trip.shortDescription || '',
      fullDescription: trip.fullDescription || '',
      destinationName: dest ? dest.displayName : '',
      departureMarinaName: trip.departureMarinaName || '',
      departureAddress: trip.departureAddress || '',
      departureLatitude: trip.departureLatitude,
      departureLongitude: trip.departureLongitude,
      tripType: trip.tripType,
      tripTypeLabel: this._getTripTypeLabel(trip.tripType),
      experienceType: trip.experienceType || null,
      durationHours: trip.durationHours,
      durationCategory: trip.durationCategory,
      durationLabel: durationLabel,
      timeOfDayOptions: Array.isArray(trip.timeOfDayOptions) ? trip.timeOfDayOptions : [],
      maxPassengers: trip.maxPassengers,
      maxAdults: trip.maxAdults,
      maxChildren: trip.maxChildren,
      minimumAge: trip.minimumAge,
      childAgeMax: trip.childAgeMax,
      pricingModel: trip.pricingModel,
      basePrice: trip.basePrice,
      minimumTotalPrice: trip.minimumTotalPrice,
      currency: trip.currency || 'usd',
      priceDisplay: priceDisplay,
      ratingAverage: trip.ratingAverage,
      reviewCount: trip.reviewCount,
      includedItems: Array.isArray(trip.includedItems) ? trip.includedItems : [],
      notIncludedItems: Array.isArray(trip.notIncludedItems) ? trip.notIncludedItems : [],
      imageUrls: Array.isArray(trip.imageUrls) ? trip.imageUrls : [],
      thumbnailUrl: trip.thumbnailUrl || '',
      captainName: trip.captainName || '',
      operatorName: trip.operatorName || '',
      isFamilyFriendly: !!trip.isFamilyFriendly,
      goodForKids: !!trip.goodForKids,
      wheelchairAccessible: !!trip.wheelchairAccessible,
      status: trip.status,
      // Include foreign key resolution per requirement
      destinationId: trip.destinationId,
      destination: dest
    };

    const today = new Date();
    const earliestBookableDate = this._formatDateToYMD(today);
    const defaultTimeOfDay = Array.isArray(trip.timeOfDayOptions) && trip.timeOfDayOptions.length > 0
      ? trip.timeOfDayOptions[0]
      : 'morning';

    // Determine nextStep based on whether trip has start times
    const tripStartTimes = this._getFromStorage('trip_start_times', []);
    const hasStartTimes = tripStartTimes.some(st => st.tripId === trip.id);
    const nextStep = hasStartTimes ? 'start_times' : 'checkout';

    const initialBookingConfig = {
      earliestBookableDate,
      defaultTimeOfDay,
      defaultNumAdults: 1,
      defaultNumChildren: 0,
      nextStep
    };

    return {
      trip: tripDetails,
      isSaved,
      initialBookingConfig
    };
  }

  // saveTripToFavorites
  saveTripToFavorites(tripId, note) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      return { success: false, message: 'Trip not found.', savedTrip: null, totalSavedCount: this._getFromStorage('saved_trips', []).length };
    }

    const savedTrips = this._getFromStorage('saved_trips', []);
    let existing = savedTrips.find(s => s.tripId === tripId);

    if (existing) {
      existing.note = note || existing.note || '';
      existing.savedAt = existing.savedAt || new Date().toISOString();
    } else {
      existing = {
        id: this._generateId('savedtrip'),
        tripId: tripId,
        savedAt: new Date().toISOString(),
        note: note || ''
      };
      savedTrips.push(existing);
    }

    this._saveToStorage('saved_trips', savedTrips);

    return {
      success: true,
      message: 'Trip saved to favorites.',
      savedTrip: {
        savedTripId: existing.id,
        tripId: existing.tripId,
        savedAt: existing.savedAt,
        note: existing.note
      },
      totalSavedCount: savedTrips.length
    };
  }

  // removeTripFromFavorites
  removeTripFromFavorites(tripId) {
    const savedTrips = this._getFromStorage('saved_trips', []);
    const newSaved = savedTrips.filter(s => s.tripId !== tripId);
    const removed = newSaved.length !== savedTrips.length;
    this._saveToStorage('saved_trips', newSaved);
    return {
      success: removed,
      message: removed ? 'Trip removed from favorites.' : 'Trip was not in favorites.',
      totalSavedCount: newSaved.length
    };
  }

  // getSavedTrips (with foreign key resolution)
  getSavedTrips() {
    const savedTrips = this._getFromStorage('saved_trips', []);
    const trips = this._getFromStorage('trips', []);
    const destinations = this._getFromStorage('destinations', []);

    return savedTrips.map(s => {
      const trip = trips.find(t => t.id === s.tripId) || null;
      const dest = trip ? destinations.find(d => d.id === trip.destinationId) || null : null;
      const durationLabel = trip ? this._getDurationLabel(trip.durationCategory, trip.durationHours) : '';
      const priceDisplay = trip ? this._formatPriceDisplay(trip.pricingModel, trip.basePrice, trip.currency || 'usd') : '';
      return {
        savedTripId: s.id,
        savedAt: s.savedAt,
        note: s.note || '',
        tripId: s.tripId,
        title: trip ? trip.title : '',
        destinationName: dest ? dest.displayName : '',
        departureMarinaName: trip ? (trip.departureMarinaName || '') : '',
        priceDisplay: priceDisplay,
        ratingAverage: trip ? trip.ratingAverage : 0,
        reviewCount: trip ? trip.reviewCount : 0,
        durationLabel: durationLabel,
        tripTypeLabel: trip ? this._getTripTypeLabel(trip.tripType) : '',
        thumbnailUrl: trip ? (trip.thumbnailUrl || '') : '',
        // foreign key resolution
        trip: trip
      };
    });
  }

  // startBookingForTrip
  startBookingForTrip(tripId, selectedDate, numAdults, numChildren) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === tripId);
    if (!trip || trip.status !== 'active') {
      return { success: false, message: 'Trip not found or inactive.', bookingId: null, nextStep: null, bookingSummary: null };
    }

    const date = this._parseDateString(selectedDate);
    if (!date) {
      return { success: false, message: 'Invalid selected date.', bookingId: null, nextStep: null, bookingSummary: null };
    }

    const adults = Math.max(0, parseInt(numAdults || 0, 10));
    const children = Math.max(0, parseInt(numChildren || 0, 10));
    const totalPax = adults + children;

    if (totalPax <= 0) {
      return { success: false, message: 'At least one passenger is required.', bookingId: null, nextStep: null, bookingSummary: null };
    }

    if (typeof trip.maxPassengers === 'number' && totalPax > trip.maxPassengers) {
      return { success: false, message: 'Selected party size exceeds maximum passengers for this trip.', bookingId: null, nextStep: null, bookingSummary: null };
    }

    const bookingId = this._generateId('booking');
    const nowIso = new Date().toISOString();

    const booking = {
      id: bookingId,
      tripId: tripId,
      selectedDate: this._formatDateToYMD(date),
      selectedStartTimeId: null,
      numAdults: adults,
      numChildren: children,
      status: 'in_progress',
      currentStep: 'start_times',
      pricingModel: trip.pricingModel,
      basePriceTotal: 0,
      addOnsTotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      currency: trip.currency || 'usd',
      promoCodeId: null,
      promoCode: null,
      contactFullName: null,
      contactEmail: null,
      contactPhone: null,
      billingFullName: null,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingPostalCode: null,
      billingCountry: null,
      paymentInfoId: null,
      paymentStatus: 'not_collected',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this._recalculateCurrentBookingTotals(booking);
    this._saveBooking(booking);
    this._setCurrentBookingId(booking.id);

    // Determine next step from trip details (start times assumed if any)
    const tripStartTimes = this._getFromStorage('trip_start_times', []);
    const hasStartTimes = tripStartTimes.some(st => st.tripId === trip.id);
    const nextStep = hasStartTimes ? 'start_times' : 'checkout';

    const dest = this._resolveDestinationById(trip.destinationId);

    const bookingSummary = {
      tripTitle: trip.title,
      destinationName: dest ? dest.displayName : '',
      selectedDate: booking.selectedDate,
      numAdults: booking.numAdults,
      numChildren: booking.numChildren,
      pricingModel: booking.pricingModel,
      currency: booking.currency,
      basePriceTotal: booking.basePriceTotal,
      addOnsTotal: booking.addOnsTotal,
      discountTotal: booking.discountTotal,
      grandTotal: booking.grandTotal
    };

    return {
      success: true,
      message: 'Booking started.',
      bookingId: booking.id,
      nextStep,
      bookingSummary
    };
  }

  // getCurrentBooking (with foreign key resolution)
  getCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { hasBooking: false, booking: null };
    }

    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === booking.tripId) || null;
    const dest = trip ? this._resolveDestinationById(trip.destinationId) : null;

    const startTimes = this._getFromStorage('trip_start_times', []);
    const startTime = booking.selectedStartTimeId
      ? (startTimes.find(st => st.id === booking.selectedStartTimeId) || null)
      : null;

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal || 0,
      addOnsTotal: booking.addOnsTotal || 0,
      discountTotal: booking.discountTotal || 0,
      grandTotal: booking.grandTotal || 0,
      currency: booking.currency || (trip ? trip.currency : 'usd') || 'usd'
    };

    let promoCodeObj = null;
    if (booking.promoCodeId) {
      const promoCodes = this._getFromStorage('promo_codes', []);
      const promo = promoCodes.find(p => p.id === booking.promoCodeId) || null;
      if (promo) {
        promoCodeObj = {
          code: promo.code,
          description: promo.description || ''
        };
      }
    } else if (booking.promoCode) {
      promoCodeObj = { code: booking.promoCode, description: '' };
    }

    const bookingView = {
      bookingId: booking.id,
      status: booking.status,
      currentStep: booking.currentStep,
      trip: trip
        ? {
            tripId: trip.id,
            title: trip.title,
            destinationName: dest ? dest.displayName : '',
            departureMarinaName: trip.departureMarinaName || '',
            durationLabel: this._getDurationLabel(trip.durationCategory, trip.durationHours),
            tripTypeLabel: this._getTripTypeLabel(trip.tripType),
            pricingModel: trip.pricingModel
          }
        : null,
      selectedDate: booking.selectedDate,
      selectedStartTime: startTime
        ? {
            startTimeId: startTime.id,
            label: startTime.label,
            timeOfDay: startTime.timeOfDay
          }
        : null,
      numAdults: booking.numAdults,
      numChildren: booking.numChildren,
      priceSummary,
      promoCode: promoCodeObj
    };

    // Also include foreign key resolved entities as per requirement
    if (trip) {
      bookingView.tripEntity = trip;
    }
    if (startTime) {
      bookingView.selectedStartTimeEntity = startTime;
    }

    return {
      hasBooking: true,
      booking: bookingView
    };
  }

  // getAvailableStartTimesForCurrentBooking
  getAvailableStartTimesForCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { bookingId: null, selectedDate: null, timeOptions: [] };
    }

    const startTimes = this._getFromStorage('trip_start_times', []);
    const date = this._parseDateString(booking.selectedDate);
    const weekdayName = date ? this._getWeekdayName(date) : null;

    let options = startTimes.filter(st => st.tripId === booking.tripId);

    if (weekdayName) {
      options = options.filter(st => {
        if (!Array.isArray(st.availableWeekdays) || st.availableWeekdays.length === 0) return true;
        return st.availableWeekdays.indexOf(weekdayName) !== -1;
      });
    }

    // If no explicit default, mark earliest as default
    if (!options.some(o => o.isDefault)) {
      options.sort((a, b) => {
        const sa = a.startTimeLocal || '';
        const sb = b.startTimeLocal || '';
        return sa.localeCompare(sb);
      });
      if (options[0]) {
        options[0].isDefault = true;
      }
    }

    const timeOptions = options.map(st => ({
      startTimeId: st.id,
      label: st.label,
      startTimeLocal: st.startTimeLocal,
      endTimeLocal: st.endTimeLocal || null,
      timeOfDay: st.timeOfDay,
      isDefault: !!st.isDefault,
      // foreign key style resolution: include full startTime entity
      startTime: st
    }));

    return {
      bookingId: booking.id,
      selectedDate: booking.selectedDate,
      timeOptions
    };
  }

  // setCurrentBookingStartTime
  setCurrentBookingStartTime(startTimeId) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { success: false, message: 'No current booking.', booking: null };
    }

    const startTimes = this._getFromStorage('trip_start_times', []);
    const startTime = startTimes.find(st => st.id === startTimeId && st.tripId === booking.tripId);

    if (!startTime) {
      return { success: false, message: 'Invalid start time for this trip.', booking: null };
    }

    booking.selectedStartTimeId = startTime.id;
    // Advance to next step based on add-ons availability
    const tripAddOns = this._getFromStorage('trip_add_ons', []);
    const hasAddOns = tripAddOns.some(a => a.tripId === booking.tripId);

    let nextStep = 'checkout';
    if (hasAddOns) {
      booking.currentStep = 'add_ons';
      nextStep = 'checkout';
    } else {
      booking.currentStep = 'checkout';
      nextStep = 'final_review';
    }

    this._recalculateCurrentBookingTotals(booking);
    this._saveBooking(booking);

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal,
      addOnsTotal: booking.addOnsTotal,
      discountTotal: booking.discountTotal,
      grandTotal: booking.grandTotal,
      currency: booking.currency
    };

    return {
      success: true,
      message: 'Start time selected.',
      booking: {
        bookingId: booking.id,
        currentStep: booking.currentStep,
        nextStep: nextStep,
        selectedStartTime: {
          startTimeId: startTime.id,
          label: startTime.label
        },
        priceSummary
      }
    };
  }

  // savePassengerDetailsForCurrentBooking
  savePassengerDetailsForCurrentBooking(passengers) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { success: false, message: 'No current booking.', validationErrors: [{ index: -1, field: 'booking', error: 'No active booking.' }], booking: null };
    }

    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === booking.tripId) || null;
    if (!trip) {
      return { success: false, message: 'Trip not found for booking.', validationErrors: [{ index: -1, field: 'trip', error: 'Trip not found.' }], booking: null };
    }

    const pax = Array.isArray(passengers) ? passengers : [];
    const adultsCount = pax.filter(p => p.passengerType === 'adult').length;
    const childrenCount = pax.filter(p => p.passengerType === 'child').length;

    const validationErrors = [];

    if (adultsCount !== booking.numAdults) {
      validationErrors.push({ index: -1, field: 'numAdults', error: 'Number of adult passengers does not match booking.' });
    }
    if (childrenCount !== booking.numChildren) {
      validationErrors.push({ index: -1, field: 'numChildren', error: 'Number of child passengers does not match booking.' });
    }

    const ageErrors = this._validatePassengerAges(trip, pax);
    validationErrors.push(...ageErrors);

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Passenger details validation failed.',
        validationErrors,
        booking: {
          bookingId: booking.id,
          currentStep: booking.currentStep,
          nextStep: null,
          numAdults: booking.numAdults,
          numChildren: booking.numChildren
        }
      };
    }

    // Save passenger records
    const bookingPassengers = this._getFromStorage('booking_passengers', []);
    const remaining = bookingPassengers.filter(bp => bp.bookingId !== booking.id);

    pax.forEach((p, index) => {
      remaining.push({
        id: this._generateId('passenger'),
        bookingId: booking.id,
        fullName: p.fullName,
        age: p.age,
        passengerType: p.passengerType,
        sortOrder: index
      });
    });

    this._saveToStorage('booking_passengers', remaining);

    // Determine next step (add-ons or checkout)
    const tripAddOns = this._getFromStorage('trip_add_ons', []);
    const hasAddOns = tripAddOns.some(a => a.tripId === booking.tripId);
    let nextStep = 'checkout';
    if (hasAddOns) {
      booking.currentStep = 'add_ons';
      nextStep = 'checkout';
    } else {
      booking.currentStep = 'checkout';
      nextStep = 'final_review';
    }

    this._recalculateCurrentBookingTotals(booking);
    this._saveBooking(booking);

    return {
      success: true,
      message: 'Passenger details saved.',
      validationErrors: [],
      booking: {
        bookingId: booking.id,
        currentStep: booking.currentStep,
        nextStep,
        numAdults: booking.numAdults,
        numChildren: booking.numChildren
      }
    };
  }

  // getAvailableAddOnsForCurrentBooking
  getAvailableAddOnsForCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        bookingId: null,
        addOns: [],
        priceSummary: {
          basePriceTotal: 0,
          addOnsTotal: 0,
          discountTotal: 0,
          grandTotal: 0,
          currency: 'usd'
        }
      };
    }

    const tripAddOns = this._getFromStorage('trip_add_ons', []);
    const addOnsForTrip = tripAddOns.filter(a => a.tripId === booking.tripId);

    const bookingAddOns = this._getFromStorage('booking_add_ons', []);
    const selectedForBooking = bookingAddOns.filter(a => a.bookingId === booking.id);

    const addOns = addOnsForTrip.map(a => {
      const selected = selectedForBooking.find(sa => sa.addOnId === a.id);
      const quantity = selected ? selected.quantity : 0;
      return {
        addOnId: a.id,
        name: a.name,
        description: a.description || '',
        price: a.price,
        currency: a.currency || 'usd',
        pricingModel: a.pricingModel,
        isRequired: !!a.isRequired,
        maxQuantity: a.maxQuantity,
        sortOrder: a.sortOrder,
        selectedQuantity: quantity,
        isSelected: quantity > 0,
        // foreign key resolution
        addOn: a
      };
    });

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal || 0,
      addOnsTotal: booking.addOnsTotal || 0,
      discountTotal: booking.discountTotal || 0,
      grandTotal: booking.grandTotal || 0,
      currency: booking.currency || 'usd'
    };

    return {
      bookingId: booking.id,
      addOns,
      priceSummary
    };
  }

  // setCurrentBookingAddOns
  setCurrentBookingAddOns(selections) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { success: false, message: 'No current booking.', bookingId: null, priceSummary: null };
    }

    const tripAddOns = this._getFromStorage('trip_add_ons', []);
    const addOnsForTrip = tripAddOns.filter(a => a.tripId === booking.tripId);
    const addOnMap = new Map();
    addOnsForTrip.forEach(a => addOnMap.set(a.id, a));

    const input = Array.isArray(selections) ? selections : [];

    const bookingAddOns = this._getFromStorage('booking_add_ons', []);
    const remaining = bookingAddOns.filter(a => a.bookingId !== booking.id);

    const numPax = (booking.numAdults || 0) + (booking.numChildren || 0);

    input.forEach(sel => {
      const addOn = addOnMap.get(sel.addOnId);
      if (!addOn) return;
      const qty = Math.max(0, parseInt(sel.quantity || 0, 10));
      if (qty <= 0) return;

      let totalPrice = addOn.price || 0;
      if (addOn.pricingModel === 'per_trip') {
        totalPrice = (addOn.price || 0) * qty;
      } else if (addOn.pricingModel === 'per_person') {
        totalPrice = (addOn.price || 0) * numPax * qty;
      }

      remaining.push({
        id: this._generateId('bookingaddon'),
        bookingId: booking.id,
        addOnId: addOn.id,
        quantity: qty,
        unitPrice: addOn.price || 0,
        totalPrice: totalPrice
      });
    });

    this._saveToStorage('booking_add_ons', remaining);

    this._recalculateCurrentBookingTotals(booking);
    this._saveBooking(booking);

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal,
      addOnsTotal: booking.addOnsTotal,
      discountTotal: booking.discountTotal,
      grandTotal: booking.grandTotal,
      currency: booking.currency
    };

    return {
      success: true,
      message: 'Add-ons updated.',
      bookingId: booking.id,
      priceSummary
    };
  }

  // getCheckoutSummaryForCurrentBooking
  getCheckoutSummaryForCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        bookingId: null,
        currentStep: null,
        tripSummary: null,
        dateTimeSummary: null,
        partySummary: null,
        addOnsSummary: [],
        priceSummary: null,
        promoCode: null
      };
    }

    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === booking.tripId) || null;
    const dest = trip ? this._resolveDestinationById(trip.destinationId) : null;

    const startTimes = this._getFromStorage('trip_start_times', []);
    const startTime = booking.selectedStartTimeId
      ? (startTimes.find(st => st.id === booking.selectedStartTimeId) || null)
      : null;

    const bookingAddOns = this._getFromStorage('booking_add_ons', []);
    const tripAddOns = this._getFromStorage('trip_add_ons', []);

    const addOnsForBooking = bookingAddOns.filter(a => a.bookingId === booking.id);
    const addOnsSummary = addOnsForBooking.map(a => {
      const def = tripAddOns.find(t => t.id === a.addOnId) || null;
      return {
        name: def ? def.name : '',
        quantity: a.quantity,
        totalPrice: a.totalPrice,
        currency: booking.currency || 'usd'
      };
    });

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal || 0,
      addOnsTotal: booking.addOnsTotal || 0,
      discountTotal: booking.discountTotal || 0,
      grandTotal: booking.grandTotal || 0,
      currency: booking.currency || 'usd'
    };

    let promoCodeObj = null;
    if (booking.promoCodeId) {
      const promoCodes = this._getFromStorage('promo_codes', []);
      const promo = promoCodes.find(p => p.id === booking.promoCodeId) || null;
      if (promo) {
        promoCodeObj = { code: promo.code, description: promo.description || '' };
      }
    } else if (booking.promoCode) {
      promoCodeObj = { code: booking.promoCode, description: '' };
    }

    return {
      bookingId: booking.id,
      currentStep: booking.currentStep,
      tripSummary: trip
        ? {
            tripId: trip.id,
            title: trip.title,
            destinationName: dest ? dest.displayName : '',
            departureMarinaName: trip.departureMarinaName || '',
            durationLabel: this._getDurationLabel(trip.durationCategory, trip.durationHours),
            tripTypeLabel: this._getTripTypeLabel(trip.tripType)
          }
        : null,
      dateTimeSummary: {
        selectedDate: booking.selectedDate,
        selectedStartTimeLabel: startTime ? startTime.label : '',
        timeOfDay: startTime ? startTime.timeOfDay : null
      },
      partySummary: {
        numAdults: booking.numAdults,
        numChildren: booking.numChildren
      },
      addOnsSummary,
      priceSummary,
      promoCode: promoCodeObj
    };
  }

  // applyPromoCodeToCurrentBooking
  applyPromoCodeToCurrentBooking(promoCode) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        isValid: false,
        success: false,
        message: 'No current booking.',
        appliedCode: null,
        discountDescription: '',
        priceSummary: null
      };
    }

    const promo = this._findApplicablePromoCode(promoCode, booking);
    if (!promo) {
      return {
        isValid: false,
        success: false,
        message: 'Promo code is invalid or does not meet requirements.',
        appliedCode: null,
        discountDescription: '',
        priceSummary: {
          basePriceTotal: booking.basePriceTotal || 0,
          addOnsTotal: booking.addOnsTotal || 0,
          discountTotal: booking.discountTotal || 0,
          grandTotal: booking.grandTotal || 0,
          currency: booking.currency || 'usd'
        }
      };
    }

    booking.promoCodeId = promo.id;
    booking.promoCode = promo.code;

    this._recalculateCurrentBookingTotals(booking);
    this._saveBooking(booking);

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal || 0,
      addOnsTotal: booking.addOnsTotal || 0,
      discountTotal: booking.discountTotal || 0,
      grandTotal: booking.grandTotal || 0,
      currency: booking.currency || 'usd'
    };

    const desc = promo.discountType === 'percentage'
      ? promo.discountValue + '% off'
      : ('$' + (promo.discountValue || 0) + ' off');

    return {
      isValid: true,
      success: true,
      message: 'Promo code applied.',
      appliedCode: promo.code,
      discountDescription: desc,
      priceSummary
    };
  }

  // setCheckoutContactAndBillingForCurrentBooking
  setCheckoutContactAndBillingForCurrentBooking(details) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        success: false,
        message: 'No current booking.',
        bookingId: null,
        currentStep: null
      };
    }

    const d = details || {};

    booking.contactFullName = d.contactFullName || booking.contactFullName || null;
    booking.contactEmail = d.contactEmail || booking.contactEmail || null;
    booking.contactPhone = d.contactPhone || booking.contactPhone || null;

    booking.billingFullName = d.billingFullName || booking.billingFullName || booking.contactFullName || null;
    booking.billingAddressLine1 = d.billingAddressLine1 || booking.billingAddressLine1 || null;
    booking.billingAddressLine2 = d.billingAddressLine2 || booking.billingAddressLine2 || null;
    booking.billingCity = d.billingCity || booking.billingCity || null;
    booking.billingState = d.billingState || booking.billingState || null;
    booking.billingPostalCode = d.billingPostalCode || booking.billingPostalCode || null;
    booking.billingCountry = d.billingCountry || booking.billingCountry || null;

    booking.updatedAt = new Date().toISOString();

    if (booking.currentStep !== 'final_review') {
      booking.currentStep = 'checkout';
    }

    this._saveBooking(booking);

    return {
      success: true,
      message: 'Contact and billing details saved.',
      bookingId: booking.id,
      currentStep: booking.currentStep
    };
  }

  // setPaymentInfoForCurrentBooking
  setPaymentInfoForCurrentBooking(payment) {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        success: false,
        message: 'No current booking.',
        bookingId: null,
        currentStep: null,
        nextStep: null,
        paymentInfoPreview: null
      };
    }

    const p = payment || {};
    const cardNumber = String(p.cardNumber || '');
    if (!cardNumber) {
      return {
        success: false,
        message: 'Card number is required.',
        bookingId: booking.id,
        currentStep: booking.currentStep,
        nextStep: null,
        paymentInfoPreview: null
      };
    }

    const brandFirst = cardNumber.charAt(0);
    let cardBrand = 'other';
    if (brandFirst === '4') cardBrand = 'visa';
    else if (brandFirst === '5') cardBrand = 'mastercard';
    else if (brandFirst === '3') cardBrand = 'amex';
    else if (brandFirst === '6') cardBrand = 'discover';

    const paymentInfoId = this._generateId('payment');
    const last4 = cardNumber.slice(-4);

    const paymentInfo = {
      id: paymentInfoId,
      cardholderName: p.cardholderName || booking.billingFullName || booking.contactFullName || '',
      cardBrand: cardBrand,
      cardLast4: last4,
      expiryMonth: p.expiryMonth,
      expiryYear: p.expiryYear,
      billingAddressLine1: booking.billingAddressLine1 || null,
      billingAddressLine2: booking.billingAddressLine2 || null,
      billingCity: booking.billingCity || null,
      billingState: booking.billingState || null,
      billingPostalCode: p.billingPostalCode || booking.billingPostalCode || null,
      billingCountry: booking.billingCountry || null,
      createdAt: new Date().toISOString()
    };

    const paymentInfos = this._getFromStorage('payment_infos', []);
    paymentInfos.push(paymentInfo);
    this._saveToStorage('payment_infos', paymentInfos);

    booking.paymentInfoId = paymentInfoId;
    booking.paymentStatus = 'entered';
    booking.currentStep = 'final_review';
    booking.updatedAt = new Date().toISOString();
    this._saveBooking(booking);

    return {
      success: true,
      message: 'Payment info stored for test purposes.',
      bookingId: booking.id,
      currentStep: 'final_review',
      nextStep: 'final_review',
      paymentInfoPreview: {
        cardBrand: cardBrand,
        cardLast4: last4,
        expiryMonth: paymentInfo.expiryMonth,
        expiryYear: paymentInfo.expiryYear
      }
    };
  }

  // getFinalReviewForCurrentBooking
  getFinalReviewForCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return {
        bookingId: null,
        tripSummary: null,
        dateTimeSummary: null,
        passengerList: [],
        addOnsSummary: [],
        priceSummary: null,
        promoCode: null,
        contactInfo: null,
        billingInfo: null,
        paymentInfoPreview: null
      };
    }

    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === booking.tripId) || null;
    const dest = trip ? this._resolveDestinationById(trip.destinationId) : null;

    const startTimes = this._getFromStorage('trip_start_times', []);
    const startTime = booking.selectedStartTimeId
      ? (startTimes.find(st => st.id === booking.selectedStartTimeId) || null)
      : null;

    const bookingPassengers = this._getFromStorage('booking_passengers', []);
    const passengers = bookingPassengers
      .filter(p => p.bookingId === booking.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(p => ({
        fullName: p.fullName,
        age: p.age,
        passengerType: p.passengerType
      }));

    const bookingAddOns = this._getFromStorage('booking_add_ons', []);
    const tripAddOns = this._getFromStorage('trip_add_ons', []);
    const addOnsForBooking = bookingAddOns.filter(a => a.bookingId === booking.id);

    const addOnsSummary = addOnsForBooking.map(a => {
      const def = tripAddOns.find(t => t.id === a.addOnId) || null;
      return {
        name: def ? def.name : '',
        quantity: a.quantity,
        totalPrice: a.totalPrice,
        currency: booking.currency || 'usd'
      };
    });

    const priceSummary = {
      basePriceTotal: booking.basePriceTotal || 0,
      addOnsTotal: booking.addOnsTotal || 0,
      discountTotal: booking.discountTotal || 0,
      grandTotal: booking.grandTotal || 0,
      currency: booking.currency || 'usd'
    };

    let promoCodeObj = null;
    if (booking.promoCodeId) {
      const promoCodes = this._getFromStorage('promo_codes', []);
      const promo = promoCodes.find(p => p.id === booking.promoCodeId) || null;
      if (promo) {
        promoCodeObj = { code: promo.code, description: promo.description || '' };
      }
    } else if (booking.promoCode) {
      promoCodeObj = { code: booking.promoCode, description: '' };
    }

    let paymentInfoPreview = null;
    if (booking.paymentInfoId) {
      const paymentInfos = this._getFromStorage('payment_infos', []);
      const pi = paymentInfos.find(p => p.id === booking.paymentInfoId) || null;
      if (pi) {
        paymentInfoPreview = {
          cardBrand: pi.cardBrand,
          cardLast4: pi.cardLast4,
          expiryMonth: pi.expiryMonth,
          expiryYear: pi.expiryYear
        };
      }
    }

    return {
      bookingId: booking.id,
      tripSummary: trip
        ? {
            tripId: trip.id,
            title: trip.title,
            destinationName: dest ? dest.displayName : '',
            departureMarinaName: trip.departureMarinaName || '',
            durationLabel: this._getDurationLabel(trip.durationCategory, trip.durationHours),
            tripTypeLabel: this._getTripTypeLabel(trip.tripType)
          }
        : null,
      dateTimeSummary: {
        selectedDate: booking.selectedDate,
        selectedStartTimeLabel: startTime ? startTime.label : '',
        timeOfDay: startTime ? startTime.timeOfDay : null
      },
      passengerList: passengers,
      addOnsSummary,
      priceSummary,
      promoCode: promoCodeObj,
      contactInfo: {
        contactFullName: booking.contactFullName || '',
        contactEmail: booking.contactEmail || '',
        contactPhone: booking.contactPhone || ''
      },
      billingInfo: {
        billingFullName: booking.billingFullName || '',
        billingAddressLine1: booking.billingAddressLine1 || '',
        billingAddressLine2: booking.billingAddressLine2 || '',
        billingCity: booking.billingCity || '',
        billingState: booking.billingState || '',
        billingPostalCode: booking.billingPostalCode || '',
        billingCountry: booking.billingCountry || ''
      },
      paymentInfoPreview
    };
  }

  // confirmCurrentBookingWithoutPayment
  confirmCurrentBookingWithoutPayment() {
    const booking = this._getOrCreateCurrentBooking();
    if (!booking) {
      return { success: false, message: 'No current booking.', bookingStatus: null };
    }

    booking.status = 'completed';
    booking.updatedAt = new Date().toISOString();
    this._saveBooking(booking);
    this._setCurrentBookingId(null);

    return {
      success: true,
      message: 'Booking marked as completed (simulation only, no payment processed).',
      bookingStatus: booking.status
    };
  }

  // clearCurrentBooking
  clearCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    if (booking) {
      booking.status = 'cancelled';
      booking.updatedAt = new Date().toISOString();
      this._saveBooking(booking);
    }
    this._setCurrentBookingId(null);
    return { success: true };
  }

  // getAccountProfile (with foreign key resolution)
  getAccountProfile() {
    const profile = this._getOrCreateAccountProfile();
    if (!profile) {
      return {
        hasAccount: false,
        profile: null
      };
    }

    const dest = profile.defaultDestinationId ? this._resolveDestinationById(profile.defaultDestinationId) : null;

    const resultProfile = {
      fullName: profile.fullName,
      email: profile.email,
      defaultDestinationId: profile.defaultDestinationId || null,
      defaultDestinationName: profile.defaultDestinationName || (dest ? dest.displayName : null),
      preferredExperienceType: profile.preferredExperienceType || null,
      preferredDurationCategory: profile.preferredDurationCategory || null,
      maxBudgetPerTrip: profile.maxBudgetPerTrip || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    if (dest) {
      resultProfile.defaultDestination = dest;
    }

    return {
      hasAccount: true,
      profile: resultProfile
    };
  }

  // createAccountProfile
  createAccountProfile(fullName, email, password) {
    const nowIso = new Date().toISOString();
    const profile = {
      id: this._generateId('account'),
      fullName: fullName,
      email: email,
      password: password,
      defaultDestinationId: null,
      defaultDestinationName: null,
      preferredExperienceType: null,
      preferredDurationCategory: null,
      maxBudgetPerTrip: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this._setAccountProfile(profile);

    return {
      success: true,
      message: 'Account profile created.',
      profile: {
        fullName: profile.fullName,
        email: profile.email
      }
    };
  }

  // updateAccountProfileAndPreferences
  updateAccountProfileAndPreferences(updates) {
    const existing = this._getOrCreateAccountProfile();
    if (!existing) {
      return {
        success: false,
        message: 'No account profile to update.',
        profile: null
      };
    }

    const u = updates || {};

    if (typeof u.fullName === 'string' && u.fullName) existing.fullName = u.fullName;
    if (typeof u.email === 'string' && u.email) existing.email = u.email;
    if (typeof u.password === 'string' && u.password) existing.password = u.password;

    if (typeof u.defaultDestinationId === 'string' && u.defaultDestinationId) {
      existing.defaultDestinationId = u.defaultDestinationId;
      const dest = this._resolveDestinationById(u.defaultDestinationId);
      existing.defaultDestinationName = u.defaultDestinationName || (dest ? dest.displayName : existing.defaultDestinationName);
    } else if (typeof u.defaultDestinationName === 'string' && u.defaultDestinationName) {
      existing.defaultDestinationName = u.defaultDestinationName;
    }

    if (typeof u.preferredExperienceType === 'string' && u.preferredExperienceType) {
      existing.preferredExperienceType = u.preferredExperienceType;
    }

    if (typeof u.preferredDurationCategory === 'string' && u.preferredDurationCategory) {
      existing.preferredDurationCategory = u.preferredDurationCategory;
    }

    if (typeof u.maxBudgetPerTrip === 'number') {
      existing.maxBudgetPerTrip = u.maxBudgetPerTrip;
    }

    existing.updatedAt = new Date().toISOString();

    this._setAccountProfile(existing);

    return {
      success: true,
      message: 'Account profile updated.',
      profile: {
        fullName: existing.fullName,
        email: existing.email,
        defaultDestinationName: existing.defaultDestinationName || null,
        preferredExperienceType: existing.preferredExperienceType || null,
        preferredDurationCategory: existing.preferredDurationCategory || null,
        maxBudgetPerTrip: existing.maxBudgetPerTrip || null
      }
    };
  }

  // getMessageCaptainContext
  getMessageCaptainContext(tripId) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === tripId) || null;
    if (!trip) {
      return {
        tripId: tripId,
        tripTitle: '',
        destinationName: '',
        departureMarinaName: '',
        captainName: '',
        operatorName: ''
      };
    }

    const dest = this._resolveDestinationById(trip.destinationId);

    return {
      tripId: trip.id,
      tripTitle: trip.title,
      destinationName: dest ? dest.displayName : '',
      departureMarinaName: trip.departureMarinaName || '',
      captainName: trip.captainName || '',
      operatorName: trip.operatorName || ''
    };
  }

  // sendCaptainMessage
  sendCaptainMessage(tripId, senderName, senderEmail, messageBody) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find(t => t.id === tripId) || null;
    if (!trip) {
      return {
        success: false,
        message: 'Trip not found.',
        captainMessageId: null,
        status: 'failed'
      };
    }

    const id = this._generateId('captainmsg');
    const msg = {
      id,
      tripId,
      senderName,
      senderEmail,
      messageBody,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    const messages = this._getFromStorage('captain_messages', []);
    messages.push(msg);
    this._saveToStorage('captain_messages', messages);

    return {
      success: true,
      message: 'Message sent (simulated).',
      captainMessageId: id,
      status: 'sent'
    };
  }

  // getAboutContent
  getAboutContent() {
    const about = this._getFromStorage('about_content', { title: '', bodySections: [] });
    return {
      title: about.title || '',
      bodySections: Array.isArray(about.bodySections) ? about.bodySections : []
    };
  }

  // getHelpFaqContent
  getHelpFaqContent() {
    const help = this._getFromStorage('help_faq_content', { sections: [] });
    return {
      sections: Array.isArray(help.sections) ? help.sections : []
    };
  }

  // getContactTopics
  getContactTopics() {
    const data = this._getFromStorage('contact_topics', { supportEmail: '', supportHours: '', topics: [] });
    return {
      supportEmail: data.supportEmail || '',
      supportHours: data.supportHours || '',
      topics: Array.isArray(data.topics) ? data.topics : []
    };
  }

  // sendSupportRequest
  sendSupportRequest(topicId, name, email, message) {
    const id = this._generateId('support');
    const req = {
      id,
      topicId,
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    };

    const requests = this._getFromStorage('support_requests', []);
    requests.push(req);
    this._saveToStorage('support_requests', requests);

    return {
      success: true,
      message: 'Support request submitted.',
      supportRequestId: id
    };
  }

  // getTermsContent
  getTermsContent() {
    const terms = this._getFromStorage('terms_content', { title: '', sections: [] });
    return {
      title: terms.title || '',
      sections: Array.isArray(terms.sections) ? terms.sections : []
    };
  }

  // getPrivacyContent
  getPrivacyContent() {
    const privacy = this._getFromStorage('privacy_content', { title: '', sections: [] });
    return {
      title: privacy.title || '',
      sections: Array.isArray(privacy.sections) ? privacy.sections : []
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
