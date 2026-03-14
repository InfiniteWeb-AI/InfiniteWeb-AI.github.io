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

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    const keys = [
      'places',
      'saved_places',
      'vehicle_types',
      'promo_codes',
      'ride_searches',
      'ride_options',
      'trips',
      'wallets',
      'wallet_transactions',
      'support_tickets',
      'support_messages',
      'booking_drafts'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Seed a default wheelchair-accessible vehicle type if none exists yet
    try {
      const vtRaw = localStorage.getItem('vehicle_types');
      const vtList = vtRaw ? JSON.parse(vtRaw) : [];
      const hasWheelchairType = Array.isArray(vtList) && vtList.some((v) => v && v.wheelchairAccessible);
      if (!hasWheelchairType) {
        const accessibleType = {
          id: 'vt_accessible_standard',
          name: 'Accessible Standard',
          category: 'standard',
          description: 'Standard taxi with wheelchair accessibility.',
          maxPassengers: 4,
          wheelchairAccessible: true,
          baseFare: 4.5,
          perKmRate: 1.6,
          perMinuteRate: 0.3,
          imageUrl: null,
          averageRating: 4.8,
          ratingCount: 200,
          isActive: true
        };
        const updated = Array.isArray(vtList) ? vtList.slice() : [];
        updated.push(accessibleType);
        localStorage.setItem('vehicle_types', JSON.stringify(updated));
      }
    } catch (e) {}

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('currentRideSearchId')) {
      localStorage.setItem('currentRideSearchId', '');
    }
    if (!localStorage.getItem('currentBookingDraftId')) {
      localStorage.setItem('currentBookingDraftId', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return new Date(dateStr);
  }

  _haversineDistanceKm(a, b) {
    if (!a || !b) return null;
    if (typeof a.latitude !== 'number' || typeof a.longitude !== 'number') return null;
    if (typeof b.latitude !== 'number' || typeof b.longitude !== 'number') return null;

    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aHarv = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    return R * c;
  }

  _estimateDistanceKmForSearch(rideSearch) {
    const places = this._getFromStorage('places', []);
    const pickup = places.find((p) => p.id === rideSearch.pickupPlaceId) || null;
    const dropoff = places.find((p) => p.id === rideSearch.dropoffPlaceId) || null;
    const stops = Array.isArray(rideSearch.stopPlaceIds)
      ? rideSearch.stopPlaceIds
          .map((id) => places.find((p) => p.id === id) || null)
          .filter((p) => p)
      : [];

    const points = [pickup, ...stops, dropoff].filter((p) => p);
    if (points.length < 2) {
      return 10; // fallback distance in km
    }
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const d = this._haversineDistanceKm(points[i], points[i + 1]);
      if (d === null) {
        return 10; // fallback if any segment missing coords
      }
      total += d;
    }
    return total || 10;
  }

  _estimateDurationMinutes(distanceKm) {
    if (!distanceKm || distanceKm <= 0) return 10;
    const minutes = distanceKm * 2; // assume 30 km/h
    return minutes < 5 ? 5 : minutes;
  }

  _getOrCreateCurrentRideSearch() {
    const currentId = localStorage.getItem('currentRideSearchId') || '';
    const rideSearches = this._getFromStorage('ride_searches', []);
    if (!currentId) return null;
    const found = rideSearches.find((r) => r.id === currentId) || null;
    return found || null;
  }

  _updateRideSearch(rideSearch) {
    let rideSearches = this._getFromStorage('ride_searches', []);
    const idx = rideSearches.findIndex((r) => r.id === rideSearch.id);
    if (idx >= 0) {
      rideSearches[idx] = rideSearch;
    } else {
      rideSearches.push(rideSearch);
    }
    this._saveToStorage('ride_searches', rideSearches);
    localStorage.setItem('currentRideSearchId', rideSearch.id);
  }

  _generateRideOptionsForSearch(rideSearch) {
    const vehicleTypes = this._getFromStorage('vehicle_types', []);
    let rideOptions = this._getFromStorage('ride_options', []);

    // Remove existing options for this search
    rideOptions = rideOptions.filter((o) => o.rideSearchId !== rideSearch.id);

    const distanceKm = this._estimateDistanceKmForSearch(rideSearch);
    const durationMinutes = this._estimateDurationMinutes(distanceKm);
    const pickupTime = this._parseDate(rideSearch.pickupDatetime);
    const dropoffTime = new Date(pickupTime.getTime() + durationMinutes * 60000);

    const currency = 'USD';

    vehicleTypes
      .filter((v) => v.isActive)
      .forEach((vt) => {
        const baseFare = typeof vt.baseFare === 'number' ? vt.baseFare : 0;
        const perKmRate = typeof vt.perKmRate === 'number' ? vt.perKmRate : 0;
        const perMinuteRate = typeof vt.perMinuteRate === 'number' ? vt.perMinuteRate : 0;
        const estimate = baseFare + perKmRate * distanceKm + perMinuteRate * durationMinutes;

        const option = {
          id: this._generateId('rideopt'),
          rideSearchId: rideSearch.id,
          vehicleTypeId: vt.id,
          displayName: vt.name,
          vehicleCategory: vt.category,
          estimatedFare: Math.round(estimate * 100) / 100,
          originalEstimatedFare: Math.round(estimate * 100) / 100,
          currency,
          estimatedPickupTime: pickupTime.toISOString(),
          estimatedDropoffTime: dropoffTime.toISOString(),
          averageRating: vt.averageRating || null,
          ratingCount: vt.ratingCount || 0,
          maxPassengers: vt.maxPassengers,
          wheelchairAccessible: !!vt.wheelchairAccessible,
          isPromoApplied: false,
          promoCodeId: null,
          available: !!vt.isActive
        };

        rideOptions.push(option);
      });

    this._saveToStorage('ride_options', rideOptions);
    return rideOptions.filter((o) => o.rideSearchId === rideSearch.id);
  }

  _applyFiltersAndSortingToRideOptions(rideSearch) {
    const allOptions = this._getFromStorage('ride_options', []);
    const vehicleTypes = this._getFromStorage('vehicle_types', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const rideOptions = allOptions.filter((o) => o.rideSearchId === rideSearch.id && o.available);

    let filtered = rideOptions.slice();

    // Category filter
    if (rideSearch.rideCategoryFilter && rideSearch.rideCategoryFilter !== 'all') {
      filtered = filtered.filter(
        (o) => o.vehicleCategory === rideSearch.rideCategoryFilter
      );
    }

    // Passenger capacity filter
    if (typeof rideSearch.minPassengerCapacity === 'number') {
      filtered = filtered.filter(
        (o) => typeof o.maxPassengers === 'number' && o.maxPassengers >= rideSearch.minPassengerCapacity
      );
    }

    // Accessibility filter
    if (Array.isArray(rideSearch.accessibilityFilter) && rideSearch.accessibilityFilter.length) {
      const requiresWheelchair = rideSearch.accessibilityFilter.includes('wheelchair_accessible');
      if (requiresWheelchair) {
        filtered = filtered.filter((o) => !!o.wheelchairAccessible);
      }
    }

    // Sorting
    const sortOption = rideSearch.sortOption || 'price_low_to_high';

    const sorted = filtered.slice().sort((a, b) => {
      switch (sortOption) {
        case 'price_low_to_high':
          return (a.estimatedFare || 0) - (b.estimatedFare || 0);
        case 'price_high_to_low':
          return (b.estimatedFare || 0) - (a.estimatedFare || 0);
        case 'rating_high_to_low': {
          const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
          const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
          if (rb !== ra) return rb - ra;
          const ca = a.ratingCount || 0;
          const cb = b.ratingCount || 0;
          return cb - ca;
        }
        case 'rating_low_to_high': {
          const ra2 = typeof a.averageRating === 'number' ? a.averageRating : 0;
          const rb2 = typeof b.averageRating === 'number' ? b.averageRating : 0;
          if (ra2 !== rb2) return ra2 - rb2;
          const ca2 = a.ratingCount || 0;
          const cb2 = b.ratingCount || 0;
          return ca2 - cb2;
        }
        case 'eta_low_to_high': {
          const ta = a.estimatedPickupTime ? this._parseDate(a.estimatedPickupTime).getTime() : 0;
          const tb = b.estimatedPickupTime ? this._parseDate(b.estimatedPickupTime).getTime() : 0;
          return ta - tb;
        }
        default:
          return 0;
      }
    });

    // Foreign key resolution for ride options
    const rideSearches = this._getFromStorage('ride_searches', []);
    const resolvedRideSearch = rideSearches.find((r) => r.id === rideSearch.id) || rideSearch;

    const resolvedOptions = sorted.map((o) => {
      const vt = vehicleTypes.find((v) => v.id === o.vehicleTypeId) || null;
      const promo = o.promoCodeId
        ? promoCodes.find((p) => p.id === o.promoCodeId) || null
        : null;
      return {
        ...o,
        rideSearch: resolvedRideSearch,
        vehicleType: vt,
        promoCode: promo
      };
    });

    return resolvedOptions;
  }

  _createBookingDraftFromRideOption(rideOptionId) {
    const rideOptions = this._getFromStorage('ride_options', []);
    const rideSearches = this._getFromStorage('ride_searches', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const bookingDrafts = this._getFromStorage('booking_drafts', []);

    const option = rideOptions.find((o) => o.id === rideOptionId) || null;
    if (!option) {
      return null;
    }
    const rideSearch = rideSearches.find((r) => r.id === option.rideSearchId) || null;
    if (!rideSearch) {
      return null;
    }

    const promo = option.promoCodeId
      ? promoCodes.find((p) => p.id === option.promoCodeId) || null
      : null;

    const originalFare = typeof option.originalEstimatedFare === 'number'
      ? option.originalEstimatedFare
      : option.estimatedFare;
    const finalFare = option.estimatedFare;
    const promoDiscountAmount = originalFare - finalFare;

    const draft = {
      id: this._generateId('bookingdraft'),
      createdAt: this._nowIso(),
      updatedAt: this._nowIso(),
      rideSearchId: rideSearch.id,
      rideOptionId: option.id,
      passengerCount: rideSearch.passengerCount || 1,
      vehicleTypeId: option.vehicleTypeId,
      vehicleCategory: option.vehicleCategory,
      wheelchairAccessible: !!option.wheelchairAccessible,
      promoCodeId: option.promoCodeId || null,
      originalEstimatedFare: originalFare,
      finalEstimatedFare: finalFare,
      promoDiscountAmount: promoDiscountAmount > 0 ? promoDiscountAmount : 0,
      currency: option.currency,
      promoCodeValue: promo ? promo.discountValue : null,
      promoCodeType: promo ? promo.discountType : null,
      promoDescription: promo ? promo.description || null : null
    };

    bookingDrafts.push(draft);
    this._saveToStorage('booking_drafts', bookingDrafts);
    localStorage.setItem('currentBookingDraftId', draft.id);

    return draft;
  }

  _getCurrentBookingDraft() {
    const currentId = localStorage.getItem('currentBookingDraftId') || '';
    const bookingDrafts = this._getFromStorage('booking_drafts', []);
    if (!currentId) return null;
    return bookingDrafts.find((b) => b.id === currentId) || null;
  }

  _updateBookingDraft(draft) {
    let bookingDrafts = this._getFromStorage('booking_drafts', []);
    const idx = bookingDrafts.findIndex((b) => b.id === draft.id);
    if (idx >= 0) {
      bookingDrafts[idx] = draft;
    } else {
      bookingDrafts.push(draft);
    }
    this._saveToStorage('booking_drafts', bookingDrafts);
    localStorage.setItem('currentBookingDraftId', draft.id);
  }

  _finalizeBookingDraftToTrip(passengerName, passengerPhone, paymentMethod, cardDetails) {
    const draft = this._getCurrentBookingDraft();
    if (!draft) {
      return { success: false, message: 'No active booking draft', trip: null };
    }

    const rideSearches = this._getFromStorage('ride_searches', []);
    const rideOptions = this._getFromStorage('ride_options', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const trips = this._getFromStorage('trips', []);

    const rideSearch = rideSearches.find((r) => r.id === draft.rideSearchId) || null;
    const rideOption = rideOptions.find((o) => o.id === draft.rideOptionId) || null;

    if (!rideSearch || !rideOption) {
      return { success: false, message: 'Booking draft is invalid', trip: null };
    }

    const promo = draft.promoCodeId
      ? promoCodes.find((p) => p.id === draft.promoCodeId) || null
      : null;

    const tripType = rideSearch.pickupType === 'scheduled' ? 'scheduled' : 'immediate';

    // Payment handling
    let paymentStatus = 'pending';
    let cardBrand = null;
    let cardLast4 = null;
    let walletDebitAmount = null;

    if (paymentMethod === 'card') {
      if (!cardDetails || !cardDetails.cardNumber) {
        return { success: false, message: 'Card details required', trip: null };
      }
      const num = cardDetails.cardNumber.replace(/\s+/g, '');
      const firstDigit = num.charAt(0);
      if (firstDigit === '4') cardBrand = 'Visa';
      else if (firstDigit === '5') cardBrand = 'Mastercard';
      else cardBrand = 'Card';
      cardLast4 = num.slice(-4);
      paymentStatus = 'authorized';
    } else if (paymentMethod === 'wallet') {
      const wallet = this._getOrCreateWallet();
      const amount = draft.finalEstimatedFare || 0;
      if (wallet.balance < amount) {
        return { success: false, message: 'Insufficient wallet balance', trip: null };
      }
      // Debit wallet
      const walletTxs = this._getFromStorage('wallet_transactions', []);
      wallet.balance -= amount;
      wallet.updatedAt = this._nowIso();
      const tx = {
        id: this._generateId('wtx'),
        walletId: wallet.id,
        tripId: null,
        type: 'debit',
        amount: amount,
        currency: wallet.currency,
        source: 'ride_payment',
        description: 'Wallet payment for ride',
        createdAt: this._nowIso()
      };
      walletTxs.push(tx);

      let wallets = this._getFromStorage('wallets', []);
      const widx = wallets.findIndex((w) => w.id === wallet.id);
      if (widx >= 0) wallets[widx] = wallet;
      else wallets.push(wallet);

      this._saveToStorage('wallets', wallets);
      this._saveToStorage('wallet_transactions', walletTxs);

      walletDebitAmount = amount;
      paymentStatus = 'paid';
    } else if (paymentMethod === 'cash') {
      paymentStatus = 'pending';
    } else {
      return { success: false, message: 'Invalid payment method', trip: null };
    }

    const now = this._nowIso();

    const estimatedFare = draft.finalEstimatedFare || draft.originalEstimatedFare || 0;

    const trip = {
      id: this._generateId('trip'),
      createdAt: now,
      updatedAt: now,
      status: 'upcoming',
      tripType: tripType,
      pickupPlaceId: rideSearch.pickupPlaceId,
      dropoffPlaceId: rideSearch.dropoffPlaceId,
      stopPlaceIds: Array.isArray(rideSearch.stopPlaceIds)
        ? rideSearch.stopPlaceIds.slice()
        : [],
      pickupDatetimePlanned: rideSearch.pickupDatetime,
      pickupDatetimeActual: null,
      dropoffDatetimeActual: null,
      passengerName: passengerName,
      passengerPhone: passengerPhone || null,
      passengerCount: rideSearch.passengerCount || 1,
      vehicleTypeId: draft.vehicleTypeId,
      vehicleCategory: draft.vehicleCategory,
      wheelchairAccessible: !!draft.wheelchairAccessible,
      rideOptionId: rideOption.id,
      promoCodeId: draft.promoCodeId || null,
      promoCodeValue: promo ? promo.discountValue : null,
      promoDiscountAmount: draft.promoDiscountAmount || 0,
      promoDescription: draft.promoDescription || null,
      estimatedFare: estimatedFare,
      finalFare: null,
      currency: draft.currency,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      cardBrand: cardBrand,
      cardLast4: cardLast4,
      walletDebitAmount: walletDebitAmount,
      refundMethod: null,
      refundAmount: null,
      cancellationReason: null,
      cancellationReasonText: null,
      cancellationTime: null,
      notes: null
    };

    // Link wallet transaction tripId if wallet was used
    if (paymentMethod === 'wallet') {
      const walletTxs = this._getFromStorage('wallet_transactions', []);
      const lastTx = walletTxs[walletTxs.length - 1];
      if (lastTx && lastTx.tripId === null && lastTx.source === 'ride_payment') {
        lastTx.tripId = trip.id;
        this._saveToStorage('wallet_transactions', walletTxs);
      }
    }

    trips.push(trip);
    this._saveToStorage('trips', trips);

    // Optionally clear current draft and ride search
    localStorage.setItem('currentBookingDraftId', '');

    return { success: true, message: 'Booking confirmed', trip };
  }

  _getOrCreateWallet() {
    let wallets = this._getFromStorage('wallets', []);
    if (wallets.length > 0) {
      return wallets[0];
    }
    const wallet = {
      id: this._generateId('wallet'),
      balance: 0,
      currency: 'USD',
      updatedAt: this._nowIso()
    };
    wallets.push(wallet);
    this._saveToStorage('wallets', wallets);
    return wallet;
  }

  _createWalletTransactionForRefund(trip, amount) {
    if (!trip || !amount || amount <= 0) return null;
    const wallet = this._getOrCreateWallet();
    const walletTxs = this._getFromStorage('wallet_transactions', []);

    wallet.balance += amount;
    wallet.updatedAt = this._nowIso();

    const tx = {
      id: this._generateId('wtx'),
      walletId: wallet.id,
      tripId: trip.id,
      type: 'credit',
      amount: amount,
      currency: wallet.currency,
      source: 'ride_refund',
      description: `Refund for cancelled trip ${trip.id}`,
      createdAt: this._nowIso()
    };

    walletTxs.push(tx);

    let wallets = this._getFromStorage('wallets', []);
    const idx = wallets.findIndex((w) => w.id === wallet.id);
    if (idx >= 0) wallets[idx] = wallet;
    else wallets.push(wallet);

    this._saveToStorage('wallets', wallets);
    this._saveToStorage('wallet_transactions', walletTxs);

    return { transaction: tx, newWalletBalance: wallet.balance };
  }

  _appendSupportMessage(ticketId, message) {
    const tickets = this._getFromStorage('support_tickets', []);
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return;
    tickets[idx] = {
      ...tickets[idx],
      lastMessagePreview: message.content.slice(0, 200),
      updatedAt: this._nowIso()
    };
    this._saveToStorage('support_tickets', tickets);
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // autocompletePlace(query, limit)
  autocompletePlace(query, limit) {
    const q = (query || '').trim().toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;
    const places = this._getFromStorage('places', []);
    if (!q) return places.slice(0, max);
    const filtered = places.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const addr = (p.fullAddress || '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
    return filtered.slice(0, max);
  }

  // getImmediateBookingFormData()
  getImmediateBookingFormData() {
    const savedPlacesRaw = this._getFromStorage('saved_places', []);
    const places = this._getFromStorage('places', []);

    const savedPlaces = savedPlacesRaw.map((sp) => {
      const place = places.find((p) => p.id === sp.placeId) || null;
      return {
        savedPlaceId: sp.id,
        label: sp.label,
        isFavorite: !!sp.isFavorite,
        placeId: sp.placeId,
        placeName: place ? place.name : null,
        fullAddress: place ? place.fullAddress || null : null,
        placeType: place ? place.type || null : null,
        place: place
      };
    });

    const nowIso = this._nowIso();

    return {
      defaultPickupType: 'now',
      defaultPickupDatetime: nowIso,
      defaultPassengerCount: 1,
      maxIntermediateStops: 3,
      savedPlaces
    };
  }

  // searchImmediateRides(pickupPlaceId, dropoffPlaceId, stopPlaceIds, pickupDatetime, passengerCount)
  searchImmediateRides(pickupPlaceId, dropoffPlaceId, stopPlaceIds, pickupDatetime, passengerCount) {
    const now = this._nowIso();
    const pickupType = 'now';

    const rideSearch = {
      id: this._generateId('ridesearch'),
      createdAt: now,
      pickupPlaceId: pickupPlaceId,
      dropoffPlaceId: dropoffPlaceId,
      stopPlaceIds: Array.isArray(stopPlaceIds) ? stopPlaceIds.slice() : [],
      pickupType: pickupType,
      pickupDatetime: pickupDatetime || now,
      passengerCount: typeof passengerCount === 'number' && passengerCount > 0 ? passengerCount : 1,
      rideCategoryFilter: 'all',
      minPassengerCapacity: null,
      accessibilityFilter: [],
      sortOption: 'price_low_to_high',
      appliedPromoCodeId: null
    };

    this._updateRideSearch(rideSearch);

    // Generate ride options
    this._generateRideOptionsForSearch(rideSearch);

    // Prepare summary
    const places = this._getFromStorage('places', []);
    const pickupPlace = places.find((p) => p.id === pickupPlaceId) || null;
    const dropoffPlace = places.find((p) => p.id === dropoffPlaceId) || null;

    const rideOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      rideSearch: {
        rideSearchId: rideSearch.id,
        pickupType: rideSearch.pickupType,
        pickupDatetime: rideSearch.pickupDatetime,
        passengerCount: rideSearch.passengerCount,
        pickupSummary: pickupPlace ? pickupPlace.name : null,
        dropoffSummary: dropoffPlace ? dropoffPlace.name : null,
        hasIntermediateStops: Array.isArray(rideSearch.stopPlaceIds) && rideSearch.stopPlaceIds.length > 0
      },
      rideOptions
    };
  }

  // getScheduledRideFormData()
  getScheduledRideFormData() {
    const savedPlacesRaw = this._getFromStorage('saved_places', []);
    const places = this._getFromStorage('places', []);

    const savedPlaces = savedPlacesRaw.map((sp) => {
      const place = places.find((p) => p.id === sp.placeId) || null;
      return {
        savedPlaceId: sp.id,
        label: sp.label,
        isFavorite: !!sp.isFavorite,
        placeId: sp.placeId,
        placeName: place ? place.name : null,
        fullAddress: place ? place.fullAddress || null : null,
        placeType: place ? place.type || null : null,
        place: place
      };
    });

    const now = new Date();
    const earliest = new Date(now.getTime() + 15 * 60000);
    const latest = new Date(now.getTime() + 30 * 24 * 60 * 60000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60000);

    const pad = (n) => (n < 10 ? '0' + n : String(n));

    const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(
      tomorrow.getDate()
    )}`;
    const defaultPickupTime = '08:00';

    return {
      defaultPickupType: 'scheduled',
      earliestSchedulableDatetime: earliest.toISOString(),
      latestSchedulableDatetime: latest.toISOString(),
      defaultPickupDate: defaultDate,
      defaultPickupTime: defaultPickupTime,
      defaultPassengerCount: 1,
      savedPlaces
    };
  }

  // searchScheduledRides(pickupPlaceId, dropoffPlaceId, pickupDatetime, passengerCount)
  searchScheduledRides(pickupPlaceId, dropoffPlaceId, pickupDatetime, passengerCount) {
    const now = this._nowIso();
    const pickupType = 'scheduled';

    const rideSearch = {
      id: this._generateId('ridesearch'),
      createdAt: now,
      pickupPlaceId: pickupPlaceId,
      dropoffPlaceId: dropoffPlaceId,
      stopPlaceIds: [],
      pickupType: pickupType,
      pickupDatetime: pickupDatetime,
      passengerCount: typeof passengerCount === 'number' && passengerCount > 0 ? passengerCount : 1,
      rideCategoryFilter: 'all',
      minPassengerCapacity: null,
      accessibilityFilter: [],
      sortOption: 'price_low_to_high',
      appliedPromoCodeId: null
    };

    this._updateRideSearch(rideSearch);
    this._generateRideOptionsForSearch(rideSearch);

    const places = this._getFromStorage('places', []);
    const pickupPlace = places.find((p) => p.id === pickupPlaceId) || null;
    const dropoffPlace = places.find((p) => p.id === dropoffPlaceId) || null;

    const rideOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      rideSearch: {
        rideSearchId: rideSearch.id,
        pickupType: rideSearch.pickupType,
        pickupDatetime: rideSearch.pickupDatetime,
        passengerCount: rideSearch.passengerCount,
        pickupSummary: pickupPlace ? pickupPlace.name : null,
        dropoffSummary: dropoffPlace ? dropoffPlace.name : null
      },
      rideOptions
    };
  }

  // getRideOptionFilterOptionsForCurrentSearch()
  getRideOptionFilterOptionsForCurrentSearch() {
    const rideSearch = this._getOrCreateCurrentRideSearch();
    if (!rideSearch) {
      return {
        vehicleCategories: [],
        passengerCapacityOptions: [],
        accessibilityOptions: [],
        sortOptions: []
      };
    }

    const allOptions = this._getFromStorage('ride_options', []);
    const options = allOptions.filter((o) => o.rideSearchId === rideSearch.id && o.available);

    const catSet = new Set();
    options.forEach((o) => catSet.add(o.vehicleCategory));

    const vehicleCategories = Array.from(catSet).map((cat) => ({
      category: cat,
      displayName:
        cat === 'economy'
          ? 'Economy'
          : cat === 'standard'
          ? 'Standard'
          : cat === 'sedan'
          ? 'Sedan'
          : cat === 'minivan_xl'
          ? 'Minivan / XL'
          : cat === 'premium'
          ? 'Premium'
          : cat
    }));

    const capacitySet = new Set();
    options.forEach((o) => {
      if (typeof o.maxPassengers === 'number') capacitySet.add(o.maxPassengers);
    });
    const passengerCapacityOptions = Array.from(capacitySet).sort((a, b) => a - b);

    const hasWheelchair = options.some((o) => !!o.wheelchairAccessible);
    const accessibilityOptions = hasWheelchair
      ? [
          {
            code: 'wheelchair_accessible',
            label: 'Wheelchair accessible'
          }
        ]
      : [];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'eta_low_to_high', label: 'Pickup time: Soonest first' }
    ];

    return {
      vehicleCategories,
      passengerCapacityOptions,
      accessibilityOptions,
      sortOptions
    };
  }

  // getCurrentRideOptions()
  getCurrentRideOptions() {
    const rideSearch = this._getOrCreateCurrentRideSearch();
    if (!rideSearch) {
      return {
        rideSearch: null,
        rideOptions: []
      };
    }

    const places = this._getFromStorage('places', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const pickupPlace = places.find((p) => p.id === rideSearch.pickupPlaceId) || null;
    const dropoffPlace = places.find((p) => p.id === rideSearch.dropoffPlaceId) || null;

    const promo = rideSearch.appliedPromoCodeId
      ? promoCodes.find((p) => p.id === rideSearch.appliedPromoCodeId) || null
      : null;

    const rideOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      rideSearch: {
        rideSearchId: rideSearch.id,
        pickupType: rideSearch.pickupType,
        pickupDatetime: rideSearch.pickupDatetime,
        pickupSummary: pickupPlace ? pickupPlace.name : null,
        dropoffSummary: dropoffPlace ? dropoffPlace.name : null,
        passengerCount: rideSearch.passengerCount,
        appliedPromoCode: promo ? promo.code : null,
        rideCategoryFilter: rideSearch.rideCategoryFilter || 'all',
        minPassengerCapacity: rideSearch.minPassengerCapacity || null,
        accessibilityFilter: Array.isArray(rideSearch.accessibilityFilter)
          ? rideSearch.accessibilityFilter
          : [],
        sortOption: rideSearch.sortOption || 'price_low_to_high'
      },
      rideOptions
    };
  }

  // updateRideOptionsFilters(rideCategoryFilter, minPassengerCapacity, accessibilityFilter)
  updateRideOptionsFilters(rideCategoryFilter, minPassengerCapacity, accessibilityFilter) {
    const rideSearch = this._getOrCreateCurrentRideSearch();
    if (!rideSearch) {
      return {
        rideSearch: {
          rideCategoryFilter: 'all',
          minPassengerCapacity: null,
          accessibilityFilter: []
        },
        rideOptions: []
      };
    }

    if (rideCategoryFilter !== undefined && rideCategoryFilter !== null) {
      rideSearch.rideCategoryFilter = rideCategoryFilter;
    }
    if (minPassengerCapacity !== undefined && minPassengerCapacity !== null) {
      rideSearch.minPassengerCapacity = minPassengerCapacity;
    }
    if (accessibilityFilter !== undefined && accessibilityFilter !== null) {
      rideSearch.accessibilityFilter = Array.isArray(accessibilityFilter)
        ? accessibilityFilter.slice()
        : [];
    }

    this._updateRideSearch(rideSearch);

    const rideOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      rideSearch: {
        rideCategoryFilter: rideSearch.rideCategoryFilter || 'all',
        minPassengerCapacity: rideSearch.minPassengerCapacity || null,
        accessibilityFilter: Array.isArray(rideSearch.accessibilityFilter)
          ? rideSearch.accessibilityFilter
          : []
      },
      rideOptions
    };
  }

  // applyPromoCodeToCurrentSearch(promoCode)
  applyPromoCodeToCurrentSearch(promoCode) {
    const rideSearch = this._getOrCreateCurrentRideSearch();
    if (!rideSearch) {
      return {
        success: false,
        message: 'No active ride search',
        appliedPromo: null,
        rideSearch: null,
        rideOptions: []
      };
    }

    const promoCodes = this._getFromStorage('promo_codes', []);
    const codeTrim = (promoCode || '').trim();
    const found = promoCodes.find(
      (p) => p.code && p.code.toLowerCase() === codeTrim.toLowerCase() && p.isActive
    );

    if (!found) {
      return {
        success: false,
        message: 'Promo code not found or inactive',
        appliedPromo: null,
        rideSearch: {
          rideSearchId: rideSearch.id,
          appliedPromoCode: null
        },
        rideOptions: this._applyFiltersAndSortingToRideOptions(rideSearch)
      };
    }

    const now = new Date();
    if (found.validFrom) {
      const vf = new Date(found.validFrom);
      if (now < vf) {
        return {
          success: false,
          message: 'Promo code not yet valid',
          appliedPromo: null,
          rideSearch: {
            rideSearchId: rideSearch.id,
            appliedPromoCode: null
          },
          rideOptions: this._applyFiltersAndSortingToRideOptions(rideSearch)
        };
      }
    }
    if (found.validTo) {
      const vt = new Date(found.validTo);
      if (now > vt) {
        return {
          success: false,
          message: 'Promo code has expired',
          appliedPromo: null,
          rideSearch: {
            rideSearchId: rideSearch.id,
            appliedPromoCode: null
          },
          rideOptions: this._applyFiltersAndSortingToRideOptions(rideSearch)
        };
      }
    }

    let rideOptions = this._getFromStorage('ride_options', []);
    const applicableCategories = Array.isArray(found.applicableVehicleCategories)
      ? found.applicableVehicleCategories
      : null;

    rideOptions = rideOptions.map((o) => {
      if (o.rideSearchId !== rideSearch.id) return o;
      const base = typeof o.originalEstimatedFare === 'number'
        ? o.originalEstimatedFare
        : o.estimatedFare;

      let applicable = true;
      if (found.minTripFare && base < found.minTripFare) applicable = false;
      if (applicableCategories && !applicableCategories.includes(o.vehicleCategory)) applicable = false;

      if (!applicable) {
        return {
          ...o,
          estimatedFare: base,
          originalEstimatedFare: base,
          isPromoApplied: false,
          promoCodeId: null
        };
      }

      let discountAmount = 0;
      if (found.discountType === 'percentage') {
        discountAmount = (base * found.discountValue) / 100;
        if (found.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, found.maxDiscountAmount);
        }
      } else if (found.discountType === 'flat_amount') {
        discountAmount = found.discountValue;
      }

      if (discountAmount < 0) discountAmount = 0;
      const finalFare = Math.max(0, base - discountAmount);

      return {
        ...o,
        originalEstimatedFare: base,
        estimatedFare: Math.round(finalFare * 100) / 100,
        isPromoApplied: true,
        promoCodeId: found.id
      };
    });

    this._saveToStorage('ride_options', rideOptions);

    rideSearch.appliedPromoCodeId = found.id;
    this._updateRideSearch(rideSearch);

    const filteredOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      success: true,
      message: 'Promo code applied',
      appliedPromo: {
        promoCodeId: found.id,
        code: found.code,
        description: found.description || null,
        discountType: found.discountType,
        discountValue: found.discountValue,
        maxDiscountAmount: found.maxDiscountAmount || null
      },
      rideSearch: {
        rideSearchId: rideSearch.id,
        appliedPromoCode: found.code
      },
      rideOptions: filteredOptions
    };
  }

  // sortCurrentRideOptions(sortOption)
  sortCurrentRideOptions(sortOption) {
    const rideSearch = this._getOrCreateCurrentRideSearch();
    if (!rideSearch) {
      return {
        sortOption: sortOption,
        rideOptions: []
      };
    }

    const allowed = [
      'price_low_to_high',
      'price_high_to_low',
      'rating_high_to_low',
      'rating_low_to_high',
      'eta_low_to_high'
    ];
    if (!allowed.includes(sortOption)) {
      sortOption = 'price_low_to_high';
    }

    rideSearch.sortOption = sortOption;
    this._updateRideSearch(rideSearch);

    const rideOptions = this._applyFiltersAndSortingToRideOptions(rideSearch);

    return {
      sortOption,
      rideOptions
    };
  }

  // chooseRideOption(rideOptionId)
  chooseRideOption(rideOptionId) {
    const rideOptions = this._getFromStorage('ride_options', []);
    const option = rideOptions.find((o) => o.id === rideOptionId) || null;
    if (!option || !option.available) {
      return {
        success: false,
        message: 'Ride option not available',
        selectedRideOption: null,
        bookingDraftId: null
      };
    }

    const draft = this._createBookingDraftFromRideOption(rideOptionId);
    if (!draft) {
      return {
        success: false,
        message: 'Failed to create booking draft',
        selectedRideOption: null,
        bookingDraftId: null
      };
    }

    const selectedRideOption = {
      rideOptionId: option.id,
      displayName: option.displayName,
      vehicleCategory: option.vehicleCategory,
      estimatedFare: option.estimatedFare,
      currency: option.currency,
      averageRating: option.averageRating || null,
      maxPassengers: option.maxPassengers,
      wheelchairAccessible: !!option.wheelchairAccessible
    };

    return {
      success: true,
      message: 'Ride option selected',
      selectedRideOption,
      bookingDraftId: draft.id
    };
  }

  // getCurrentBookingSummary()
  getCurrentBookingSummary() {
    const draft = this._getCurrentBookingDraft();
    if (!draft) {
      return null;
    }

    const rideSearches = this._getFromStorage('ride_searches', []);
    const rideOptions = this._getFromStorage('ride_options', []);
    const places = this._getFromStorage('places', []);
    const vehicleTypes = this._getFromStorage('vehicle_types', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const rideSearch = rideSearches.find((r) => r.id === draft.rideSearchId) || null;
    const rideOption = rideOptions.find((o) => o.id === draft.rideOptionId) || null;

    if (!rideSearch || !rideOption) return null;

    const pickupPlace = places.find((p) => p.id === rideSearch.pickupPlaceId) || null;
    const dropoffPlace = places.find((p) => p.id === rideSearch.dropoffPlaceId) || null;
    const stopsPlaces = Array.isArray(rideSearch.stopPlaceIds)
      ? rideSearch.stopPlaceIds
          .map((id) => places.find((p) => p.id === id) || null)
          .filter((p) => p)
      : [];

    const vt = vehicleTypes.find((v) => v.id === rideOption.vehicleTypeId) || null;
    const promo = draft.promoCodeId
      ? promoCodes.find((p) => p.id === draft.promoCodeId) || null
      : null;

    const originalFare = typeof draft.originalEstimatedFare === 'number'
      ? draft.originalEstimatedFare
      : rideOption.originalEstimatedFare || rideOption.estimatedFare;
    const finalFare = typeof draft.finalEstimatedFare === 'number'
      ? draft.finalEstimatedFare
      : rideOption.estimatedFare;
    const discountAmount = originalFare - finalFare;

    return {
      tripType: rideSearch.pickupType === 'scheduled' ? 'scheduled' : 'immediate',
      pickup: {
        placeName: pickupPlace ? pickupPlace.name : null,
        fullAddress: pickupPlace ? pickupPlace.fullAddress || null : null,
        plannedPickupDatetime: rideSearch.pickupDatetime
      },
      dropoff: {
        placeName: dropoffPlace ? dropoffPlace.name : null,
        fullAddress: dropoffPlace ? dropoffPlace.fullAddress || null : null
      },
      stops: stopsPlaces.map((p) => ({
        placeName: p.name,
        fullAddress: p.fullAddress || null
      })),
      passengerCount: rideSearch.passengerCount || 1,
      vehicle: {
        vehicleTypeId: vt ? vt.id : rideOption.vehicleTypeId,
        displayName: rideOption.displayName,
        vehicleCategory: rideOption.vehicleCategory,
        maxPassengers: vt ? vt.maxPassengers : rideOption.maxPassengers,
        wheelchairAccessible: vt ? !!vt.wheelchairAccessible : !!rideOption.wheelchairAccessible
      },
      pricing: {
        originalEstimatedFare: originalFare,
        promoCode: promo ? promo.code : null,
        promoDescription: promo ? promo.description || null : null,
        promoDiscountAmount: discountAmount > 0 ? discountAmount : 0,
        finalEstimatedFare: finalFare,
        currency: draft.currency
      },
      allowedPaymentMethods: ['cash', 'card', 'wallet']
    };
  }

  // confirmCurrentBooking(passengerName, passengerPhone, paymentMethod, cardDetails)
  confirmCurrentBooking(passengerName, passengerPhone, paymentMethod, cardDetails) {
    return this._finalizeBookingDraftToTrip(
      passengerName,
      passengerPhone,
      paymentMethod,
      cardDetails
    );
  }

  // getSavedPlaces()
  getSavedPlaces() {
    const savedPlacesRaw = this._getFromStorage('saved_places', []);
    const places = this._getFromStorage('places', []);

    return savedPlacesRaw.map((sp) => {
      const place = places.find((p) => p.id === sp.placeId) || null;
      return {
        savedPlaceId: sp.id,
        label: sp.label,
        isFavorite: !!sp.isFavorite,
        placeId: sp.placeId,
        placeName: place ? place.name : null,
        fullAddress: place ? place.fullAddress || null : null,
        placeType: place ? place.type || null : null,
        place: place
      };
    });
  }

  // addSavedPlace(label, placeId, isFavorite)
  addSavedPlace(label, placeId, isFavorite) {
    const places = this._getFromStorage('places', []);
    const place = places.find((p) => p.id === placeId) || null;
    if (!place) {
      return {
        savedPlace: null,
        message: 'Place not found'
      };
    }

    const savedPlaces = this._getFromStorage('saved_places', []);
    const newSaved = {
      id: this._generateId('savedplace'),
      label: label,
      placeId: placeId,
      isFavorite: !!isFavorite
    };
    savedPlaces.push(newSaved);
    this._saveToStorage('saved_places', savedPlaces);

    return {
      savedPlace: {
        ...newSaved,
        place: place
      },
      message: 'Saved place added'
    };
  }

  // updateSavedPlace(savedPlaceId, label, placeId, isFavorite)
  updateSavedPlace(savedPlaceId, label, placeId, isFavorite) {
    const savedPlaces = this._getFromStorage('saved_places', []);
    const idx = savedPlaces.findIndex((sp) => sp.id === savedPlaceId);
    if (idx === -1) {
      return {
        savedPlace: null,
        message: 'Saved place not found'
      };
    }

    if (label !== undefined && label !== null) savedPlaces[idx].label = label;
    if (placeId !== undefined && placeId !== null) savedPlaces[idx].placeId = placeId;
    if (isFavorite !== undefined && isFavorite !== null) {
      savedPlaces[idx].isFavorite = !!isFavorite;
    }

    this._saveToStorage('saved_places', savedPlaces);

    const places = this._getFromStorage('places', []);
    const place = places.find((p) => p.id === savedPlaces[idx].placeId) || null;

    return {
      savedPlace: {
        ...savedPlaces[idx],
        place: place
      },
      message: 'Saved place updated'
    };
  }

  // deleteSavedPlace(savedPlaceId)
  deleteSavedPlace(savedPlaceId) {
    const savedPlaces = this._getFromStorage('saved_places', []);
    const idx = savedPlaces.findIndex((sp) => sp.id === savedPlaceId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Saved place not found'
      };
    }

    savedPlaces.splice(idx, 1);
    this._saveToStorage('saved_places', savedPlaces);

    return {
      success: true,
      message: 'Saved place deleted'
    };
  }

  // getTripsList(group)
  getTripsList(group) {
    const trips = this._getFromStorage('trips', []);
    const places = this._getFromStorage('places', []);

    let filtered;
    if (group === 'upcoming') {
      filtered = trips.filter((t) => t.status === 'upcoming');
    } else {
      // past: completed and cancelled
      filtered = trips.filter((t) => t.status === 'completed' || t.status === 'cancelled');
    }

    filtered.sort((a, b) => {
      const ta = a.pickupDatetimePlanned ? this._parseDate(a.pickupDatetimePlanned).getTime() : 0;
      const tb = b.pickupDatetimePlanned ? this._parseDate(b.pickupDatetimePlanned).getTime() : 0;
      return ta - tb;
    });

    return filtered.map((trip) => {
      const pickupPlace = places.find((p) => p.id === trip.pickupPlaceId) || null;
      const dropoffPlace = places.find((p) => p.id === trip.dropoffPlaceId) || null;
      return {
        tripId: trip.id,
        status: trip.status,
        tripType: trip.tripType,
        pickupDatetimePlanned: trip.pickupDatetimePlanned,
        pickupPlaceName: pickupPlace ? pickupPlace.name : null,
        dropoffPlaceName: dropoffPlace ? dropoffPlace.name : null,
        vehicleCategory: trip.vehicleCategory,
        estimatedFare: trip.estimatedFare,
        finalFare: trip.finalFare || null,
        currency: trip.currency,
        canModify: trip.status === 'upcoming',
        canCancel: trip.status === 'upcoming'
      };
    });
  }

  // getTripDetails(tripId)
  getTripDetails(tripId) {
    const trips = this._getFromStorage('trips', []);
    const places = this._getFromStorage('places', []);
    const vehicleTypes = this._getFromStorage('vehicle_types', []);

    const trip = trips.find((t) => t.id === tripId) || null;
    if (!trip) {
      return {
        trip: null,
        pickupPlace: null,
        dropoffPlace: null,
        stops: [],
        vehicleType: null,
        canModify: false,
        canCancel: false
      };
    }

    const pickupPlace = places.find((p) => p.id === trip.pickupPlaceId) || null;
    const dropoffPlace = places.find((p) => p.id === trip.dropoffPlaceId) || null;
    const stops = Array.isArray(trip.stopPlaceIds)
      ? trip.stopPlaceIds
          .map((id) => places.find((p) => p.id === id) || null)
          .filter((p) => p)
      : [];

    const vehicleType = vehicleTypes.find((v) => v.id === trip.vehicleTypeId) || null;

    // Also embed resolved objects in trip itself
    const tripWithRelations = {
      ...trip,
      pickupPlace,
      dropoffPlace,
      stops,
      vehicleType
    };

    return {
      trip: tripWithRelations,
      pickupPlace,
      dropoffPlace,
      stops,
      vehicleType,
      canModify: trip.status === 'upcoming',
      canCancel: trip.status === 'upcoming'
    };
  }

  // modifyUpcomingTrip(tripId, newPickupDatetime, newVehicleCategory)
  modifyUpcomingTrip(tripId, newPickupDatetime, newVehicleCategory) {
    const trips = this._getFromStorage('trips', []);
    const vehicleTypes = this._getFromStorage('vehicle_types', []);

    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) {
      return { success: false, message: 'Trip not found', trip: null };
    }

    const trip = { ...trips[idx] };
    if (trip.status !== 'upcoming') {
      return { success: false, message: 'Only upcoming trips can be modified', trip: null };
    }

    if (newPickupDatetime) {
      trip.pickupDatetimePlanned = newPickupDatetime;
    }

    if (newVehicleCategory) {
      const candidates = vehicleTypes.filter(
        (v) => v.category === newVehicleCategory && v.isActive
      );
      if (candidates.length === 0) {
        return {
          success: false,
          message: 'Requested vehicle category not available',
          trip: null
        };
      }
      // choose vehicle type with lowest baseFare
      candidates.sort((a, b) => (a.baseFare || 0) - (b.baseFare || 0));
      const vt = candidates[0];
      trip.vehicleCategory = vt.category;
      trip.vehicleTypeId = vt.id;
      trip.wheelchairAccessible = !!vt.wheelchairAccessible;

      // Re-estimate fare for new vehicle type
      const places = this._getFromStorage('places', []);
      const pickupPlace = places.find((p) => p.id === trip.pickupPlaceId) || null;
      const dropoffPlace = places.find((p) => p.id === trip.dropoffPlaceId) || null;
      const stops = Array.isArray(trip.stopPlaceIds)
        ? trip.stopPlaceIds
            .map((id) => places.find((p) => p.id === id) || null)
            .filter((p) => p)
        : [];
      const points = [pickupPlace, ...stops, dropoffPlace].filter((p) => p);
      let distanceKm = 10;
      if (points.length >= 2) {
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
          const d = this._haversineDistanceKm(points[i], points[i + 1]);
          if (d === null) {
            total = 10;
            break;
          }
          total += d;
        }
        distanceKm = total || 10;
      }
      const durationMinutes = this._estimateDurationMinutes(distanceKm);
      const baseFare = typeof vt.baseFare === 'number' ? vt.baseFare : 0;
      const perKmRate = typeof vt.perKmRate === 'number' ? vt.perKmRate : 0;
      const perMinuteRate = typeof vt.perMinuteRate === 'number' ? vt.perMinuteRate : 0;
      const estimate = baseFare + perKmRate * distanceKm + perMinuteRate * durationMinutes;
      trip.estimatedFare = Math.round(estimate * 100) / 100;
    }

    trip.updatedAt = this._nowIso();
    trips[idx] = trip;
    this._saveToStorage('trips', trips);

    return {
      success: true,
      message: 'Trip updated',
      trip
    };
  }

  // cancelUpcomingTrip(tripId, cancellationReason, cancellationReasonText, refundMethod)
  cancelUpcomingTrip(tripId, cancellationReason, cancellationReasonText, refundMethod) {
    const trips = this._getFromStorage('trips', []);
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Trip not found',
        trip: null,
        walletTransaction: null
      };
    }

    const trip = { ...trips[idx] };
    if (trip.status !== 'upcoming') {
      return {
        success: false,
        message: 'Only upcoming trips can be cancelled',
        trip: null,
        walletTransaction: null
      };
    }

    trip.status = 'cancelled';
    trip.cancellationReason = cancellationReason;
    trip.cancellationReasonText = cancellationReasonText || null;
    trip.cancellationTime = this._nowIso();
    trip.refundMethod = refundMethod;

    let walletTransaction = null;

    if (refundMethod === 'wallet_credit') {
      const paid =
        trip.paymentStatus === 'authorized' || trip.paymentStatus === 'paid';
      const nonCash = trip.paymentMethod === 'card' || trip.paymentMethod === 'wallet';
      if (paid && nonCash) {
        const refundAmount = trip.finalFare || trip.estimatedFare || 0;
        if (refundAmount > 0) {
          const result = this._createWalletTransactionForRefund(trip, refundAmount);
          walletTransaction = result;
          trip.refundAmount = refundAmount;
          trip.paymentStatus = 'refunded';
        }
      } else {
        trip.refundAmount = 0;
      }
    } else {
      trip.refundAmount = 0;
    }

    trip.updatedAt = this._nowIso();
    trips[idx] = trip;
    this._saveToStorage('trips', trips);

    return {
      success: true,
      message: 'Trip cancelled',
      trip,
      walletTransaction
    };
  }

  // getWalletSummary()
  getWalletSummary() {
    const wallet = this._getOrCreateWallet();
    const walletTxs = this._getFromStorage('wallet_transactions', []);
    const trips = this._getFromStorage('trips', []);

    const relatedTxs = walletTxs
      .filter((tx) => tx.walletId === wallet.id)
      .sort((a, b) => {
        const ta = a.createdAt ? this._parseDate(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? this._parseDate(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10)
      .map((tx) => {
        const trip = tx.tripId ? trips.find((t) => t.id === tx.tripId) || null : null;
        return {
          ...tx,
          wallet,
          trip
        };
      });

    return {
      wallet,
      recentTransactions: relatedTxs
    };
  }

  // getRecentTripsForSupport(limit)
  getRecentTripsForSupport(limit) {
    const trips = this._getFromStorage('trips', []);
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;

    const sorted = trips.slice().sort((a, b) => {
      const ta = a.pickupDatetimePlanned ? this._parseDate(a.pickupDatetimePlanned).getTime() : 0;
      const tb = b.pickupDatetimePlanned ? this._parseDate(b.pickupDatetimePlanned).getTime() : 0;
      return tb - ta;
    });

    const limited = sorted.slice(0, max);

    const places = this._getFromStorage('places', []);

    return limited.map((trip) => {
      const pickupPlace = places.find((p) => p.id === trip.pickupPlaceId) || null;
      const dropoffPlace = places.find((p) => p.id === trip.dropoffPlaceId) || null;
      return {
        tripId: trip.id,
        status: trip.status,
        pickupDatetimePlanned: trip.pickupDatetimePlanned,
        pickupPlaceName: pickupPlace ? pickupPlace.name : null,
        dropoffPlaceName: dropoffPlace ? dropoffPlace.name : null,
        estimatedFare: trip.estimatedFare,
        finalFare: trip.finalFare || null,
        currency: trip.currency
      };
    });
  }

  // getSupportTopicsAndIssues()
  getSupportTopicsAndIssues() {
    // Static configuration (not persisted domain data)
    const topics = [
      {
        topic: 'trip_issues',
        displayName: 'Trip issues',
        issueTypes: [
          { issueType: 'driver_issue', displayName: 'Driver issue' },
          { issueType: 'vehicle_issue', displayName: 'Vehicle issue' },
          { issueType: 'safety_issue', displayName: 'Safety issue' },
          { issueType: 'other', displayName: 'Other issue' }
        ]
      },
      {
        topic: 'billing_issues',
        displayName: 'Billing and fare issues',
        issueTypes: [
          {
            issueType: 'fare_higher_than_expected',
            displayName: 'Fare higher than expected'
          },
          {
            issueType: 'fare_lower_than_expected',
            displayName: 'Fare lower than expected'
          },
          {
            issueType: 'wrong_promo_applied',
            displayName: 'Wrong promo applied'
          },
          { issueType: 'payment_failed', displayName: 'Payment failed' },
          { issueType: 'other', displayName: 'Other billing issue' }
        ]
      },
      {
        topic: 'general_questions',
        displayName: 'General questions',
        issueTypes: [
          { issueType: 'other', displayName: 'General question' }
        ]
      },
      {
        topic: 'app_technical_issue',
        displayName: 'App technical issues',
        issueTypes: [
          { issueType: 'other', displayName: 'Technical problem' }
        ]
      }
    ];

    return { topics };
  }

  // createSupportTicketForTrip(tripId, topic, issueType, description, contactMethod)
  createSupportTicketForTrip(tripId, topic, issueType, description, contactMethod) {
    const tickets = this._getFromStorage('support_tickets', []);
    const trips = this._getFromStorage('trips', []);

    const now = this._nowIso();
    const ticket = {
      id: this._generateId('ticket'),
      tripId: tripId || null,
      createdAt: now,
      updatedAt: now,
      status: 'open',
      topic: topic,
      issueType: issueType,
      description: description,
      contactMethod: contactMethod,
      lastMessagePreview: description.slice(0, 200)
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    const trip = tripId ? trips.find((t) => t.id === tripId) || null : null;

    return {
      ticket: {
        ...ticket,
        trip
      },
      message: 'Support ticket created'
    };
  }

  // getSupportTicketDetails(ticketId)
  getSupportTicketDetails(ticketId) {
    const tickets = this._getFromStorage('support_tickets', []);
    const trips = this._getFromStorage('trips', []);
    const places = this._getFromStorage('places', []);

    const ticket = tickets.find((t) => t.id === ticketId) || null;
    if (!ticket) {
      return {
        ticket: null,
        trip: null
      };
    }

    let tripSummary = null;
    if (ticket.tripId) {
      const trip = trips.find((t) => t.id === ticket.tripId) || null;
      if (trip) {
        const pickupPlace = places.find((p) => p.id === trip.pickupPlaceId) || null;
        const dropoffPlace = places.find((p) => p.id === trip.dropoffPlaceId) || null;
        tripSummary = {
          tripId: trip.id,
          pickupDatetimePlanned: trip.pickupDatetimePlanned,
          pickupPlaceName: pickupPlace ? pickupPlace.name : null,
          dropoffPlaceName: dropoffPlace ? dropoffPlace.name : null,
          estimatedFare: trip.estimatedFare,
          finalFare: trip.finalFare || null,
          currency: trip.currency
        };
      }
    }

    return {
      ticket: {
        ...ticket,
        trip: tripSummary
      },
      trip: tripSummary
    };
  }

  // getSupportMessages(ticketId)
  getSupportMessages(ticketId) {
    const messages = this._getFromStorage('support_messages', []);
    const tickets = this._getFromStorage('support_tickets', []);
    const ticket = tickets.find((t) => t.id === ticketId) || null;

    const filtered = messages
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => {
        const ta = a.createdAt ? this._parseDate(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? this._parseDate(b.createdAt).getTime() : 0;
        return ta - tb;
      })
      .map((m) => ({
        ...m,
        ticket
      }));

    return filtered;
  }

  // sendSupportMessage(ticketId, content)
  sendSupportMessage(ticketId, content) {
    const tickets = this._getFromStorage('support_tickets', []);
    const ticket = tickets.find((t) => t.id === ticketId) || null;
    if (!ticket) {
      return {
        message: null
      };
    }

    const messages = this._getFromStorage('support_messages', []);
    const msg = {
      id: this._generateId('smsg'),
      ticketId: ticketId,
      createdAt: this._nowIso(),
      senderType: 'user',
      content: content,
      read: false
    };
    messages.push(msg);
    this._saveToStorage('support_messages', messages);

    this._appendSupportMessage(ticketId, msg);

    return {
      message: {
        ...msg,
        ticket
      }
    };
  }

  // getAboutContent()
  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    // Fallback empty structure if not configured in storage
    return {
      title: '',
      sections: [],
      serviceAreas: [],
      operatingHours: '',
      contactEmail: '',
      contactPhone: ''
    };
  }

  // getFaqContent()
  getFaqContent() {
    const stored = this._getFromStorage('faq_content', null);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
    // Fallback empty list
    return [];
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      lastUpdated: '',
      sections: []
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      lastUpdated: '',
      sections: [],
      dataRequestContactEmail: ''
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
