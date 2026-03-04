/* eslint-disable no-var */
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

  // ----------------------
  // Storage initialization
  // ----------------------
  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArrayKey('chalets');
    ensureArrayKey('conference_rooms');
    ensureArrayKey('packages');
    ensureArrayKey('catering_options');
    ensureArrayKey('promo_codes');
    ensureArrayKey('bookings');
    ensureArrayKey('booking_items');
    ensureArrayKey('payments');
    ensureArrayKey('favorite_items');
    ensureArrayKey('wedding_quote_requests');
    ensureArrayKey('currency_rates');
    ensureArrayKey('site_preferences');

    // Content blobs for About/Policies
    if (!localStorage.getItem('about_venue_content')) {
      localStorage.setItem(
        'about_venue_content',
        JSON.stringify({
          headline: '',
          bodyHtml: '',
          highlights: [],
          address: '',
          mapEmbedInfo: ''
        })
      );
    }

    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem(
        'policies_content',
        JSON.stringify({
          bookingTermsHtml: '',
          cancellationPolicyHtml: '',
          paymentConditionsHtml: '',
          houseRulesHtml: '',
          privacyPolicyHtml: ''
        })
      );
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current booking pointer
    if (!localStorage.getItem('current_booking_id')) {
      localStorage.setItem('current_booking_id', '');
    }
  }

  // ----------------------
  // Generic storage helpers
  // ----------------------
  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _diffNights(checkinDate, checkoutDate) {
    const checkin = this._parseDate(checkinDate);
    const checkout = this._parseDate(checkoutDate);
    if (!checkin || !checkout) return 0;
    const ms = checkout.getTime() - checkin.getTime();
    if (ms <= 0) return 0;
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  // ----------------------
  // Currency helpers
  // ----------------------
  _getCurrentSitePreference() {
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) {
      prefs = [];
    }

    if (prefs.length === 0) {
      const now = this._nowIso();
      const pref = {
        id: this._generateId('sitepref'),
        selectedCurrency: 'usd',
        updatedAt: now
      };
      prefs.push(pref);
      this._saveToStorage('site_preferences', prefs);
      return { selectedCurrency: pref.selectedCurrency, updatedAt: pref.updatedAt };
    }

    const pref = prefs[0];
    if (!pref.selectedCurrency) {
      pref.selectedCurrency = 'usd';
      pref.updatedAt = this._nowIso();
      this._saveToStorage('site_preferences', prefs);
    }
    return { selectedCurrency: pref.selectedCurrency, updatedAt: pref.updatedAt };
  }

  _convertBetweenCurrencies(amount, fromCurrency, toCurrency) {
    if (amount == null || isNaN(amount)) return 0;
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return Number(amount);

    const baseCurrency = 'usd';
    const rates = this._getFromStorage('currency_rates');

    const findRateToBase = (code) => {
      if (code === baseCurrency) return 1;
      const rec = rates.find((r) => r.currencyCode === code && r.baseCurrency === baseCurrency);
      return rec ? rec.rateToBase : null;
    };

    const fromRate = findRateToBase(fromCurrency);
    const toRate = findRateToBase(toCurrency);

    // Fallback: if we don't have rates, assume 1:1
    if ((fromCurrency !== baseCurrency && !fromRate) || (toCurrency !== baseCurrency && !toRate)) {
      return Number(amount);
    }

    let amountInBase;
    if (fromCurrency === baseCurrency) {
      amountInBase = Number(amount);
    } else {
      amountInBase = Number(amount) * fromRate; // from -> base
    }

    let result;
    if (toCurrency === baseCurrency) {
      result = amountInBase;
    } else {
      result = amountInBase / toRate; // base -> to
    }

    return Number(result);
  }

  _convertToSelectedCurrency(amount, fromCurrency) {
    const pref = this._getCurrentSitePreference();
    return this._convertBetweenCurrencies(amount, fromCurrency, pref.selectedCurrency);
  }

  // ----------------------
  // Booking helpers
  // ----------------------
  _getOrCreateCurrentBooking(preferredType) {
    const bookings = this._getFromStorage('bookings');
    let currentId = localStorage.getItem('current_booking_id') || '';
    let booking = currentId ? bookings.find((b) => b.id === currentId) : null;

    const now = this._nowIso();
    const sitePref = this._getCurrentSitePreference();

    if (!booking || booking.status === 'confirmed' || booking.status === 'cancelled') {
      const bookingType = preferredType || 'mixed';
      booking = {
        id: this._generateId('booking'),
        status: 'in_progress',
        bookingType: bookingType,
        createdAt: now,
        updatedAt: now,
        startDate: null,
        endDate: null,
        eventDate: null,
        durationType: null,
        numAdults: null,
        numChildren: null,
        numAttendees: null,
        currency: sitePref.selectedCurrency || 'usd',
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        appliedPromoCode: null,
        notes: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        contactType: null,
        companyName: null,
        specialRequests: null,
        confirmationNumber: null,
        confirmedAt: null
      };
      bookings.push(booking);
      localStorage.setItem('current_booking_id', booking.id);
      this._saveToStorage('bookings', bookings);
      return booking;
    }

    // Existing booking: ensure type/currency
    if (preferredType && booking.bookingType && booking.bookingType !== preferredType) {
      booking.bookingType = 'mixed';
    } else if (!booking.bookingType) {
      booking.bookingType = preferredType || 'mixed';
    }
    if (!booking.currency) {
      booking.currency = sitePref.selectedCurrency || 'usd';
    }
    booking.updatedAt = now;
    this._saveToStorage('bookings', bookings);
    return booking;
  }

  _recalculateBookingTotals(bookingId, skipPromo) {
    const bookings = this._getFromStorage('bookings');
    const items = this._getFromStorage('booking_items');

    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return { booking: null, items: [] };
    }

    const booking = bookings[idx];
    const bookingItems = items.filter((it) => it.bookingId === booking.id);

    let subtotal = 0;
    bookingItems.forEach((it) => {
      subtotal += Number(it.totalPrice || 0);
    });

    booking.subtotalAmount = Number(subtotal.toFixed(2));

    // Update startDate/endDate/eventDate from items
    let startDate = null;
    let endDate = null;
    let eventDate = booking.eventDate || null;

    bookingItems.forEach((it) => {
      if (it.startDate) {
        if (!startDate || this._parseDate(it.startDate) < this._parseDate(startDate)) {
          startDate = it.startDate;
        }
      }
      if (it.endDate) {
        if (!endDate || this._parseDate(it.endDate) > this._parseDate(endDate)) {
          endDate = it.endDate;
        }
      }
      if (it.eventDate) {
        if (!eventDate || this._parseDate(it.eventDate) < this._parseDate(eventDate)) {
          eventDate = it.eventDate;
        }
      }
    });

    booking.startDate = startDate;
    booking.endDate = endDate;
    booking.eventDate = eventDate;

    let discount = 0;
    if (!skipPromo && booking.appliedPromoCode) {
      const promoResult = this._validateAndApplyPromoCode(booking, bookingItems, null);
      if (promoResult.valid) {
        discount = promoResult.discountAmount;
      } else {
        discount = 0;
      }
    }

    booking.discountAmount = Number(discount.toFixed(2));
    booking.totalAmount = Number((booking.subtotalAmount - booking.discountAmount).toFixed(2));
    booking.updatedAt = this._nowIso();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return { booking: booking, items: bookingItems };
  }

  _validateAndApplyPromoCode(booking, bookingItems, promoRecord) {
    const promos = this._getFromStorage('promo_codes');

    let promo = promoRecord;
    if (!promo) {
      if (!booking.appliedPromoCode) {
        return { valid: false, discountAmount: 0, message: 'No promo code applied' };
      }
      const code = String(booking.appliedPromoCode).toLowerCase();
      promo = promos.find((p) => String(p.code).toLowerCase() === code);
      if (!promo) {
        return { valid: false, discountAmount: 0, message: 'Promo code not found' };
      }
    }

    const now = new Date();
    if (promo.validFrom) {
      const from = this._parseDate(promo.validFrom);
      if (from && now < from) {
        return { valid: false, discountAmount: 0, message: 'Promo code not yet valid' };
      }
    }
    if (promo.validTo) {
      const to = this._parseDate(promo.validTo);
      if (to && now > to) {
        return { valid: false, discountAmount: 0, message: 'Promo code has expired' };
      }
    }
    if (promo.isActive === false) {
      return { valid: false, discountAmount: 0, message: 'Promo code is inactive' };
    }

    // Check booking type applicability
    const hasChalet = bookingItems.some((it) => it.itemType === 'chalet');
    const hasPackage = bookingItems.some((it) => it.itemType === 'package');
    const hasConference = bookingItems.some((it) => it.itemType === 'conference_room' || it.itemType === 'catering');

    if (promo.applicableTo === 'chalet_stay' && !hasChalet) {
      return { valid: false, discountAmount: 0, message: 'Promo code is only valid for chalet stays' };
    }
    if (promo.applicableTo === 'package_stay' && !hasPackage) {
      return { valid: false, discountAmount: 0, message: 'Promo code is only valid for packages' };
    }
    if (promo.applicableTo === 'conference_event' && !hasConference) {
      return { valid: false, discountAmount: 0, message: 'Promo code is only valid for conferences/events' };
    }

    // Nights constraint (for stays)
    if (promo.minNights) {
      let nights = 0;
      if (booking.startDate && booking.endDate) {
        nights = this._diffNights(booking.startDate, booking.endDate);
      } else {
        bookingItems.forEach((it) => {
          if (it.itemType === 'chalet' || it.itemType === 'package') {
            const q = Number(it.quantity || 0);
            if (q > nights) nights = q;
          }
        });
      }
      if (nights < promo.minNights) {
        return { valid: false, discountAmount: 0, message: 'Minimum nights requirement not met for this promo code' };
      }
    }

    const subtotal = Number(booking.subtotalAmount || 0);
    if (subtotal <= 0) {
      return { valid: false, discountAmount: 0, message: 'No eligible items for discount' };
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = (subtotal * Number(promo.discountValue || 0)) / 100;
    } else if (promo.discountType === 'fixed_amount') {
      const promoCurrency = promo.currency || booking.currency;
      const valueInBookingCurrency = this._convertBetweenCurrencies(
        Number(promo.discountValue || 0),
        promoCurrency,
        booking.currency
      );
      discountAmount = Math.min(subtotal, valueInBookingCurrency);
    }

    return {
      valid: true,
      discountAmount: Number(discountAmount.toFixed(2)),
      message: 'Promo code applied successfully'
    };
  }

  _persistFavorites(updater) {
    let favorites = this._getFromStorage('favorite_items');
    favorites = updater(Array.isArray(favorites) ? favorites : []);
    this._saveToStorage('favorite_items', favorites);
    return favorites;
  }

  _createPaymentRecord(booking, cardInfo) {
    const payments = this._getFromStorage('payments');
    const now = this._nowIso();

    const payment = {
      id: this._generateId('payment'),
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      method: 'card',
      status: 'succeeded',
      createdAt: now,
      cardLast4: cardInfo && cardInfo.cardNumber ? String(cardInfo.cardNumber).slice(-4) : null,
      transactionId: this._generateId('txn')
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);
    return payment;
  }

  _generateConfirmationNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 1e6)
      .toString(36)
      .toUpperCase();
    return 'CNF-' + ts + '-' + rand;
  }

  _enrichBookingItems(items) {
    const chalets = this._getFromStorage('chalets');
    const conferenceRooms = this._getFromStorage('conference_rooms');
    const packages = this._getFromStorage('packages');
    const cateringOptions = this._getFromStorage('catering_options');

    return items.map((item) => {
      const enriched = Object.assign({}, item);
      if (item.chaletId) {
        enriched.chalet = chalets.find((c) => c.id === item.chaletId) || null;
      }
      if (item.conferenceRoomId) {
        enriched.conferenceRoom =
          conferenceRooms.find((r) => r.id === item.conferenceRoomId) || null;
      }
      if (item.packageId) {
        enriched.package = packages.find((p) => p.id === item.packageId) || null;
      }
      if (item.cateringOptionId) {
        enriched.cateringOption =
          cateringOptions.find((c) => c.id === item.cateringOptionId) || null;
      }
      return enriched;
    });
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getSitePreferences()
  getSitePreferences() {
    return this._getCurrentSitePreference();
  }

  // setSelectedCurrency(currency)
  setSelectedCurrency(currency) {
    if (currency !== 'usd' && currency !== 'eur') {
      return {
        selectedCurrency: this._getCurrentSitePreference().selectedCurrency,
        message: 'Unsupported currency'
      };
    }

    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) prefs = [];
    const now = this._nowIso();

    if (prefs.length === 0) {
      prefs.push({
        id: this._generateId('sitepref'),
        selectedCurrency: currency,
        updatedAt: now
      });
    } else {
      prefs[0].selectedCurrency = currency;
      prefs[0].updatedAt = now;
    }
    this._saveToStorage('site_preferences', prefs);

    // Optionally adjust current in-progress booking prices to new currency
    const currentId = localStorage.getItem('current_booking_id');
    if (currentId) {
      const bookings = this._getFromStorage('bookings');
      const items = this._getFromStorage('booking_items');
      const idx = bookings.findIndex((b) => b.id === currentId);
      if (idx !== -1) {
        const booking = bookings[idx];
        const oldCurrency = booking.currency || 'usd';
        if (oldCurrency !== currency) {
          const bookingItems = items.filter((it) => it.bookingId === booking.id);
          bookingItems.forEach((it) => {
            it.unitPrice = this._convertBetweenCurrencies(it.unitPrice, oldCurrency, currency);
            it.totalPrice = this._convertBetweenCurrencies(it.totalPrice, oldCurrency, currency);
            it.currency = currency;
          });
          booking.currency = currency;
          this._saveToStorage('booking_items', items);
          this._saveToStorage('bookings', bookings);
          this._recalculateBookingTotals(booking.id, false);
        }
      }
    }

    return {
      selectedCurrency: currency,
      message: 'Selected currency updated successfully'
    };
  }

  // getHomePageContent()
  getHomePageContent() {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const chalets = this._getFromStorage('chalets');
    const conferenceRooms = this._getFromStorage('conference_rooms');
    const packages = this._getFromStorage('packages');

    const featuredChalets = chalets.filter((c) => c.isFeatured);
    const featuredConferenceRooms = conferenceRooms.filter((r) => r.isFeatured);
    const featuredPackages = packages.filter((p) => p.isFeatured);

    const today = new Date();
    const addDays = (d) => {
      const dt = new Date(today.getTime());
      dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0, 10);
    };

    return {
      selectedCurrency,
      featuredChalets,
      featuredConferenceRooms,
      featuredPackages,
      bookingWidgetDefaults: {
        stayTypeOptions: ['chalet', 'conference'],
        defaultStayType: 'chalet',
        defaultCheckinDate: addDays(7),
        defaultCheckoutDate: addDays(10),
        defaultEventDate: addDays(7),
        defaultNumAdults: 2,
        defaultNumChildren: 0
      }
    };
  }

  // getChaletSearchFilterOptions()
  getChaletSearchFilterOptions() {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const chalets = this._getFromStorage('chalets');

    let minRate = null;
    let maxRate = null;
    chalets.forEach((c) => {
      const r = this._convertToSelectedCurrency(c.baseNightlyRate || 0, c.currency || selectedCurrency);
      if (minRate === null || r < minRate) minRate = r;
      if (maxRate === null || r > maxRate) maxRate = r;
    });

    if (minRate === null) {
      minRate = 0;
      maxRate = 0;
    }

    return {
      priceRange: {
        minNightlyRate: Number(minRate.toFixed(2)),
        maxNightlyRate: Number(maxRate.toFixed(2)),
        currency: selectedCurrency
      },
      amenityOptions: {
        hasFreeBreakfast: 'Free breakfast',
        hasKitchenette: 'Kitchenette',
        hasPrivateHotTub: 'Private hot tub',
        hasOutdoorHotTub: 'Outdoor hot tub'
      },
      viewTypeOptions: [
        { value: 'lake_view', label: 'Lake view' },
        { value: 'forest_view', label: 'Forest view' },
        { value: 'garden_view', label: 'Garden view' },
        { value: 'mountain_view', label: 'Mountain view' },
        { value: 'no_specific_view', label: 'No specific view' }
      ],
      ratingFilterOptions: [3, 4, 4.5],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Guest rating: High to Low' }
      ]
    };
  }

  // searchChalets(checkinDate, checkoutDate, numAdults, numChildren, filters, sortBy)
  searchChalets(checkinDate, checkoutDate, numAdults, numChildren, filters, sortBy) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const chalets = this._getFromStorage('chalets');
    const nights = this._diffNights(checkinDate, checkoutDate);

    const totalGuests = Number(numAdults || 0) + Number(numChildren || 0);
    const appliedFilters = Object.assign({
      maxNightlyRate: undefined,
      viewType: undefined,
      minRating: undefined,
      hasFreeBreakfast: undefined,
      hasKitchenette: undefined,
      hasPrivateHotTub: undefined,
      hasOutdoorHotTub: undefined
    }, filters || {});

    let results = chalets.filter((c) => {
      if (c.maxOccupancy != null && c.maxOccupancy < totalGuests) return false;
      if (c.maxAdults != null && c.maxAdults < Number(numAdults || 0)) return false;
      if (c.maxChildren != null && c.maxChildren < Number(numChildren || 0)) return false;

      const nightlyRate = this._convertToSelectedCurrency(c.baseNightlyRate || 0, c.currency || selectedCurrency);

      if (appliedFilters.maxNightlyRate != null && nightlyRate > appliedFilters.maxNightlyRate) {
        return false;
      }
      if (appliedFilters.viewType && c.viewType && c.viewType !== appliedFilters.viewType) {
        return false;
      }
      if (appliedFilters.minRating != null) {
        const rating = c.ratingAverage != null ? c.ratingAverage : 0;
        if (rating < appliedFilters.minRating) return false;
      }
      if (appliedFilters.hasFreeBreakfast === true && c.hasFreeBreakfast !== true) return false;
      if (appliedFilters.hasKitchenette === true && c.hasKitchenette !== true) return false;
      if (appliedFilters.hasPrivateHotTub === true && c.hasPrivateHotTub !== true) return false;
      if (appliedFilters.hasOutdoorHotTub === true && c.hasOutdoorHotTub !== true) return false;

      return true;
    });

    // Attach helper rate for sorting
    const withRate = results.map((c) => {
      const nightlyRate = this._convertToSelectedCurrency(c.baseNightlyRate || 0, c.currency || selectedCurrency);
      return { chalet: c, nightlyRate };
    });

    const sortKey = sortBy || '';
    withRate.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return a.nightlyRate - b.nightlyRate;
      }
      if (sortKey === 'price_high_to_low') {
        return b.nightlyRate - a.nightlyRate;
      }
      if (sortKey === 'rating_high_to_low') {
        const ra = a.chalet.ratingAverage != null ? a.chalet.ratingAverage : 0;
        const rb = b.chalet.ratingAverage != null ? b.chalet.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        return a.nightlyRate - b.nightlyRate;
      }
      // default: price_low_to_high
      return a.nightlyRate - b.nightlyRate;
    });

    results = withRate.map((wr) => wr.chalet);

    return {
      results,
      totalCount: results.length,
      appliedFilters,
      sortBy: sortKey || 'price_low_to_high',
      currency: selectedCurrency,
      nights
    };
  }

  // getChaletDetails(chaletId, checkinDate, checkoutDate, numAdults, numChildren)
  getChaletDetails(chaletId, checkinDate, checkoutDate, numAdults, numChildren) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const chalets = this._getFromStorage('chalets');
    const chalet = chalets.find((c) => c.id === chaletId) || null;

    const nights = this._diffNights(checkinDate, checkoutDate);

    let pricing = {
      nightlyRate: 0,
      totalPrice: 0,
      currency: selectedCurrency
    };

    if (chalet) {
      const nightlyRate = this._convertToSelectedCurrency(
        chalet.baseNightlyRate || 0,
        chalet.currency || selectedCurrency
      );
      pricing.nightlyRate = Number(nightlyRate.toFixed(2));
      pricing.totalPrice = Number((nightlyRate * nights).toFixed(2));
    }

    const rating = {
      average: chalet && chalet.ratingAverage != null ? chalet.ratingAverage : 0,
      count: chalet && chalet.ratingCount != null ? chalet.ratingCount : 0
    };

    return {
      chalet,
      selectedStay: {
        checkinDate: checkinDate || null,
        checkoutDate: checkoutDate || null,
        numAdults: numAdults != null ? numAdults : null,
        numChildren: numChildren != null ? numChildren : null,
        nights
      },
      pricing,
      rating,
      policiesText: chalet ? chalet.policiesText || '' : '',
      isAvailableForSelectedStay: true
    };
  }

  // addChaletToFavorites(chaletId, checkinDate, checkoutDate)
  addChaletToFavorites(chaletId, checkinDate, checkoutDate) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const chalets = this._getFromStorage('chalets');
    const chalet = chalets.find((c) => c.id === chaletId);
    if (!chalet) {
      return {
        favoriteItem: null,
        message: 'Chalet not found'
      };
    }

    const nights = this._diffNights(checkinDate, checkoutDate);
    const nightlyRate = this._convertToSelectedCurrency(
      chalet.baseNightlyRate || 0,
      chalet.currency || selectedCurrency
    );

    const favoriteItem = {
      id: this._generateId('fav'),
      chaletId,
      checkinDate: checkinDate || null,
      checkoutDate: checkoutDate || null,
      nightlyRateSnapshot: Number(nightlyRate.toFixed(2)),
      totalPriceSnapshot: nights > 0 ? Number((nightlyRate * nights).toFixed(2)) : null,
      currencySnapshot: selectedCurrency,
      ratingSnapshot: chalet.ratingAverage != null ? chalet.ratingAverage : null,
      addedAt: this._nowIso()
    };

    this._persistFavorites((items) => {
      items.push(favoriteItem);
      return items;
    });

    return {
      favoriteItem,
      message: 'Chalet added to favorites'
    };
  }

  // getFavoriteChalets(checkinDate, checkoutDate)
  getFavoriteChalets(checkinDate, checkoutDate) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const favorites = this._getFromStorage('favorite_items');
    const chalets = this._getFromStorage('chalets');

    const hasNewDates = !!(checkinDate && checkoutDate);

    return favorites.map((fav) => {
      const chalet = chalets.find((c) => c.id === fav.chaletId) || null;

      let effCheckin = checkinDate || fav.checkinDate || null;
      let effCheckout = checkoutDate || fav.checkoutDate || null;
      let nights = this._diffNights(effCheckin, effCheckout);

      let nightlyRate;
      let totalPrice;
      let currency;

      if (chalet && nights > 0) {
        nightlyRate = this._convertToSelectedCurrency(
          chalet.baseNightlyRate || 0,
          chalet.currency || selectedCurrency
        );
        totalPrice = nightlyRate * nights;
        currency = selectedCurrency;
      } else {
        nightlyRate = fav.nightlyRateSnapshot != null ? fav.nightlyRateSnapshot : 0;
        totalPrice = fav.totalPriceSnapshot != null ? fav.totalPriceSnapshot : 0;
        currency = fav.currencySnapshot || selectedCurrency;
        // If no valid dates and no snapshot total, fall back to nightly only
        if (!totalPrice && nightlyRate && nights > 0) {
          totalPrice = nightlyRate * nights;
        }
      }

      return {
        favoriteId: fav.id,
        chalet,
        rating:
          fav.ratingSnapshot != null
            ? fav.ratingSnapshot
            : chalet && chalet.ratingAverage != null
            ? chalet.ratingAverage
            : 0,
        totalPrice: Number((totalPrice || 0).toFixed(2)),
        nightlyRate: Number((nightlyRate || 0).toFixed(2)),
        currency,
        checkinDate: effCheckin,
        checkoutDate: effCheckout
      };
    });
  }

  // removeFavoriteItem(favoriteItemId)
  removeFavoriteItem(favoriteItemId) {
    let removed = false;
    this._persistFavorites((items) => {
      const next = items.filter((it) => {
        if (it.id === favoriteItemId) {
          removed = true;
          return false;
        }
        return true;
      });
      return next;
    });

    return {
      success: removed,
      message: removed ? 'Favorite removed' : 'Favorite not found'
    };
  }

  // getConferenceRoomFilterOptions()
  getConferenceRoomFilterOptions() {
    return {
      capacityRanges: [
        { min: 0, max: 40, label: 'Up to 40' },
        { min: 50, max: 80, label: '50-80' },
        { min: 81, max: 200, label: '81-200' }
      ],
      equipmentOptions: {
        hasProjector: 'Projector',
        hasSoundSystem: 'Sound system'
      },
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // searchConferenceRooms(eventDate, durationType, numAttendees, filters, sortBy)
  searchConferenceRooms(eventDate, durationType, numAttendees, filters, sortBy) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const rooms = this._getFromStorage('conference_rooms');

    const appliedFilters = Object.assign(
      {
        capacityMin: undefined,
        capacityMax: undefined,
        hasProjector: undefined,
        hasSoundSystem: undefined,
        maxFullDayRate: undefined
      },
      filters || {}
    );

    let results = rooms.filter((r) => {
      if (r.isBookableOnline === false) return false;

      const capacityMax = r.capacityMax != null ? r.capacityMax : Number.MAX_SAFE_INTEGER;
      const capacityMin = r.capacityMin != null ? r.capacityMin : 0;
      const attendees = Number(numAttendees || 0);
      // If no explicit capacity filters are provided, allow rooms where
      // attendees do not exceed capacityMax, even if attendees < capacityMin.
      // When filters specify a capacity range, require attendees to be within
      // the room's [capacityMin, capacityMax] range.
      if (appliedFilters.capacityMin == null && appliedFilters.capacityMax == null) {
        if (attendees > capacityMax) return false;
      } else {
        if (attendees < capacityMin || attendees > capacityMax) return false;
      }

      if (appliedFilters.capacityMin != null && capacityMax < appliedFilters.capacityMin) return false;
      if (appliedFilters.capacityMax != null && capacityMin > appliedFilters.capacityMax) return false;

      if (appliedFilters.hasProjector === true && r.hasProjector !== true) return false;
      if (appliedFilters.hasSoundSystem === true && r.hasSoundSystem !== true) return false;

      // maxFullDayRate
      if (appliedFilters.maxFullDayRate != null && r.baseFullDayRate != null) {
        const fullDayRate = this._convertToSelectedCurrency(
          r.baseFullDayRate,
          r.currency || selectedCurrency
        );
        if (fullDayRate > appliedFilters.maxFullDayRate) return false;
      }

      return true;
    });

    const withRate = results.map((r) => {
      let baseRate = 0;
      if (durationType === 'half_day') {
        baseRate = r.baseHalfDayRate != null ? r.baseHalfDayRate : r.baseFullDayRate;
      } else if (durationType === 'hourly') {
        baseRate = r.baseHourlyRate != null ? r.baseHourlyRate : r.baseFullDayRate;
      } else {
        baseRate = r.baseFullDayRate != null ? r.baseFullDayRate : 0;
      }
      const selectedRate = this._convertToSelectedCurrency(baseRate || 0, r.currency || selectedCurrency);
      return { room: r, selectedRate };
    });

    const sortKey = sortBy || '';
    withRate.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return b.selectedRate - a.selectedRate;
      }
      // default and 'price_low_to_high'
      return a.selectedRate - b.selectedRate;
    });

    results = withRate.map((wr) => wr.room);

    return {
      results,
      totalCount: results.length,
      currency: selectedCurrency,
      appliedFilters: {
        capacityMin: appliedFilters.capacityMin,
        capacityMax: appliedFilters.capacityMax,
        hasProjector: appliedFilters.hasProjector,
        hasSoundSystem: appliedFilters.hasSoundSystem
      },
      sortBy: sortKey || 'price_low_to_high'
    };
  }

  // getConferenceRoomDetails(conferenceRoomId, eventDate, durationType)
  getConferenceRoomDetails(conferenceRoomId, eventDate, durationType) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const rooms = this._getFromStorage('conference_rooms');
    const room = rooms.find((r) => r.id === conferenceRoomId) || null;

    let pricing = {
      fullDayRate: null,
      halfDayRate: null,
      hourlyRate: null,
      selectedRate: null,
      currency: selectedCurrency
    };

    if (room) {
      const fullDay = room.baseFullDayRate != null ? room.baseFullDayRate : null;
      const halfDay = room.baseHalfDayRate != null ? room.baseHalfDayRate : null;
      const hourly = room.baseHourlyRate != null ? room.baseHourlyRate : null;

      pricing.fullDayRate =
        fullDay != null
          ? Number(this._convertToSelectedCurrency(fullDay, room.currency || selectedCurrency).toFixed(2))
          : null;
      pricing.halfDayRate =
        halfDay != null
          ? Number(this._convertToSelectedCurrency(halfDay, room.currency || selectedCurrency).toFixed(2))
          : null;
      pricing.hourlyRate =
        hourly != null
          ? Number(this._convertToSelectedCurrency(hourly, room.currency || selectedCurrency).toFixed(2))
          : null;

      let baseRate = null;
      if (durationType === 'half_day') baseRate = pricing.halfDayRate || pricing.fullDayRate;
      else if (durationType === 'hourly') baseRate = pricing.hourlyRate || pricing.fullDayRate;
      else baseRate = pricing.fullDayRate;

      pricing.selectedRate = baseRate != null ? Number(baseRate.toFixed(2)) : null;
    }

    return {
      conferenceRoom: room,
      selectedEvent: {
        eventDate: eventDate || null,
        durationType: durationType || null
      },
      pricing
    };
  }

  // initializeConferenceBooking(eventDate, durationType, numAttendees)
  initializeConferenceBooking(eventDate, durationType, numAttendees) {
    const booking = this._getOrCreateCurrentBooking('conference_event');

    booking.bookingType = booking.bookingType === 'mixed' ? 'mixed' : 'conference_event';
    booking.eventDate = eventDate || null;
    booking.durationType = durationType || null;
    booking.numAttendees = numAttendees != null ? Number(numAttendees) : null;
    booking.updatedAt = this._nowIso();

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems
    };
  }

  // selectConferenceMainHall(conferenceRoomId)
  selectConferenceMainHall(conferenceRoomId) {
    const booking = this._getOrCreateCurrentBooking('conference_event');
    const rooms = this._getFromStorage('conference_rooms');
    const room = rooms.find((r) => r.id === conferenceRoomId);
    if (!room) {
      return {
        booking,
        items: [],
        message: 'Conference room not found'
      };
    }

    const items = this._getFromStorage('booking_items');
    const { selectedCurrency } = this._getCurrentSitePreference();

    // Remove existing main_hall for this booking
    const filtered = items.filter(
      (it) => !(it.bookingId === booking.id && it.itemType === 'conference_room' && it.role === 'main_hall')
    );

    let baseRate;
    if (booking.durationType === 'half_day') {
      baseRate = room.baseHalfDayRate != null ? room.baseHalfDayRate : room.baseFullDayRate;
    } else if (booking.durationType === 'hourly') {
      baseRate = room.baseHourlyRate != null ? room.baseHourlyRate : room.baseFullDayRate;
    } else {
      baseRate = room.baseFullDayRate != null ? room.baseFullDayRate : 0;
    }

    const unitPrice = this._convertBetweenCurrencies(
      baseRate || 0,
      room.currency || selectedCurrency,
      booking.currency || selectedCurrency
    );

    const item = {
      id: this._generateId('bi'),
      bookingId: booking.id,
      itemType: 'conference_room',
      role: 'main_hall',
      chaletId: null,
      conferenceRoomId,
      packageId: null,
      cateringOptionId: null,
      name: room.name,
      startDate: null,
      endDate: null,
      eventDate: booking.eventDate || null,
      durationType: booking.durationType || 'full_day',
      quantity: 1,
      attendeesCount: booking.numAttendees != null ? booking.numAttendees : null,
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: Number(unitPrice.toFixed(2)),
      currency: booking.currency || selectedCurrency
    };

    filtered.push(item);
    this._saveToStorage('booking_items', filtered);

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Main hall selected'
    };
  }

  // addConferenceBreakoutRoom(conferenceRoomId)
  addConferenceBreakoutRoom(conferenceRoomId) {
    const booking = this._getOrCreateCurrentBooking('conference_event');
    const rooms = this._getFromStorage('conference_rooms');
    const room = rooms.find((r) => r.id === conferenceRoomId);
    if (!room) {
      return {
        booking,
        items: [],
        message: 'Conference room not found'
      };
    }

    const items = this._getFromStorage('booking_items');
    const { selectedCurrency } = this._getCurrentSitePreference();

    let baseRate;
    if (booking.durationType === 'half_day') {
      baseRate = room.baseHalfDayRate != null ? room.baseHalfDayRate : room.baseFullDayRate;
    } else if (booking.durationType === 'hourly') {
      baseRate = room.baseHourlyRate != null ? room.baseHourlyRate : room.baseFullDayRate;
    } else {
      baseRate = room.baseFullDayRate != null ? room.baseFullDayRate : 0;
    }

    const unitPrice = this._convertBetweenCurrencies(
      baseRate || 0,
      room.currency || selectedCurrency,
      booking.currency || selectedCurrency
    );

    const item = {
      id: this._generateId('bi'),
      bookingId: booking.id,
      itemType: 'conference_room',
      role: 'breakout_room',
      chaletId: null,
      conferenceRoomId,
      packageId: null,
      cateringOptionId: null,
      name: room.name,
      startDate: null,
      endDate: null,
      eventDate: booking.eventDate || null,
      durationType: booking.durationType || 'full_day',
      quantity: 1,
      attendeesCount: booking.numAttendees != null ? booking.numAttendees : null,
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: Number(unitPrice.toFixed(2)),
      currency: booking.currency || selectedCurrency
    };

    items.push(item);
    this._saveToStorage('booking_items', items);

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Breakout room added'
    };
  }

  // getCateringOptions(type, dietaryType)
  getCateringOptions(type, dietaryType) {
    const options = this._getFromStorage('catering_options');
    return options.filter((opt) => {
      if (type && opt.type !== type) return false;
      if (dietaryType && opt.dietaryType && opt.dietaryType !== dietaryType) return false;
      return true;
    });
  }

  // addCateringToConferenceBooking(cateringOptionId, attendeesCount)
  addCateringToConferenceBooking(cateringOptionId, attendeesCount) {
    const booking = this._getOrCreateCurrentBooking('conference_event');
    const options = this._getFromStorage('catering_options');
    const opt = options.find((o) => o.id === cateringOptionId);
    if (!opt) {
      return {
        booking,
        items: [],
        message: 'Catering option not found'
      };
    }

    const items = this._getFromStorage('booking_items');
    const { selectedCurrency } = this._getCurrentSitePreference();

    const unitPrice = this._convertBetweenCurrencies(
      opt.pricePerPerson || 0,
      opt.currency || selectedCurrency,
      booking.currency || selectedCurrency
    );

    const existingIndex = items.findIndex(
      (it) => it.bookingId === booking.id && it.itemType === 'catering' && it.cateringOptionId === cateringOptionId
    );

    const qty = Number(attendeesCount || 0);

    const baseItem = {
      bookingId: booking.id,
      itemType: 'catering',
      role: 'catering',
      chaletId: null,
      conferenceRoomId: null,
      packageId: null,
      cateringOptionId,
      name: opt.name,
      startDate: null,
      endDate: null,
      eventDate: booking.eventDate || null,
      durationType: booking.durationType || 'full_day',
      quantity: qty,
      attendeesCount: qty,
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: Number((unitPrice * qty).toFixed(2)),
      currency: booking.currency || selectedCurrency
    };

    if (existingIndex !== -1) {
      const existing = items[existingIndex];
      const merged = Object.assign({}, existing, baseItem);
      merged.id = existing.id;
      items[existingIndex] = merged;
    } else {
      baseItem.id = this._generateId('bi');
      items.push(baseItem);
    }

    this._saveToStorage('booking_items', items);

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Catering updated for booking'
    };
  }

  // addChaletToBooking(chaletId, checkinDate, checkoutDate, numAdults, numChildren, role)
  addChaletToBooking(chaletId, checkinDate, checkoutDate, numAdults, numChildren, role) {
    const booking = this._getOrCreateCurrentBooking('chalet_stay');
    const chalets = this._getFromStorage('chalets');
    const chalet = chalets.find((c) => c.id === chaletId);
    if (!chalet) {
      return {
        booking,
        items: [],
        message: 'Chalet not found'
      };
    }

    const items = this._getFromStorage('booking_items');
    const { selectedCurrency } = this._getCurrentSitePreference();

    const nights = this._diffNights(checkinDate, checkoutDate);
    const nightlyRate = this._convertBetweenCurrencies(
      chalet.baseNightlyRate || 0,
      chalet.currency || selectedCurrency,
      booking.currency || selectedCurrency
    );

    const existingChaletCount = items.filter((it) => it.bookingId === booking.id && it.itemType === 'chalet').length;
    const finalRole = role || (existingChaletCount === 0 ? 'stay_primary' : 'stay_additional');

    booking.numAdults = numAdults != null ? Number(numAdults) : booking.numAdults;
    booking.numChildren = numChildren != null ? Number(numChildren) : booking.numChildren;

    const item = {
      id: this._generateId('bi'),
      bookingId: booking.id,
      itemType: 'chalet',
      role: finalRole,
      chaletId,
      conferenceRoomId: null,
      packageId: null,
      cateringOptionId: null,
      name: chalet.name,
      startDate: checkinDate || null,
      endDate: checkoutDate || null,
      eventDate: null,
      durationType: 'multi_day',
      quantity: nights,
      attendeesCount: null,
      unitPrice: Number(nightlyRate.toFixed(2)),
      totalPrice: Number((nightlyRate * nights).toFixed(2)),
      currency: booking.currency || selectedCurrency
    };

    items.push(item);
    this._saveToStorage('booking_items', items);

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Chalet added to booking'
    };
  }

  // searchPackages(arrivalDate, departureDate, numAdults, numChildren, targetAudience, isWeekendOnly, isRomantic)
  searchPackages(arrivalDate, departureDate, numAdults, numChildren, targetAudience, isWeekendOnly, isRomantic) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const packages = this._getFromStorage('packages');

    const nights = this._diffNights(arrivalDate, departureDate);
    const totalGuests =
      (numAdults != null ? Number(numAdults) : 0) + (numChildren != null ? Number(numChildren) : 0);

    const results = packages.filter((p) => {
      if (targetAudience && p.targetAudience && p.targetAudience !== targetAudience) return false;
      if (isWeekendOnly === true && p.isWeekendOnly !== true) return false;
      if (isRomantic === true && p.isRomantic !== true) return false;

      if (numAdults != null || numChildren != null) {
        if (p.minOccupancy != null && totalGuests < p.minOccupancy) return false;
        if (p.maxOccupancy != null && totalGuests > p.maxOccupancy) return false;
      }

      if (arrivalDate && departureDate) {
        if (p.minNights != null && nights < p.minNights) return false;
        if (p.maxNights != null && nights > p.maxNights) return false;

        if (p.applicableStartDate) {
          const start = this._parseDate(p.applicableStartDate);
          const arr = this._parseDate(arrivalDate);
          if (start && arr && arr < start) return false;
        }
        if (p.applicableEndDate) {
          const end = this._parseDate(p.applicableEndDate);
          const dep = this._parseDate(departureDate);
          if (end && dep && dep > end) return false;
        }
      }

      return true;
    });

    return {
      results,
      totalCount: results.length,
      currency: selectedCurrency
    };
  }

  // getPackageDetails(packageId, arrivalDate, departureDate, numAdults, numChildren)
  getPackageDetails(packageId, arrivalDate, departureDate, numAdults, numChildren) {
    const { selectedCurrency } = this._getCurrentSitePreference();
    const packages = this._getFromStorage('packages');
    const pkg = packages.find((p) => p.id === packageId) || null;

    const nights = this._diffNights(arrivalDate, departureDate);

    let pricing = {
      basePackagePrice: 0,
      totalPrice: 0,
      currency: selectedCurrency
    };

    if (pkg) {
      const basePrice = this._convertBetweenCurrencies(
        pkg.basePackagePrice || 0,
        pkg.currency || selectedCurrency,
        selectedCurrency
      );
      pricing.basePackagePrice = Number(basePrice.toFixed(2));
      pricing.totalPrice = Number(basePrice.toFixed(2));
    }

    return {
      package: pkg,
      selectedStay: {
        arrivalDate: arrivalDate || null,
        departureDate: departureDate || null,
        numAdults: numAdults != null ? Number(numAdults) : null,
        numChildren: numChildren != null ? Number(numChildren) : null,
        nights
      },
      pricing,
      lateCheckoutTime: pkg && pkg.lateCheckoutTime ? pkg.lateCheckoutTime : null
    };
  }

  // addPackageToBooking(packageId, arrivalDate, departureDate, numAdults, numChildren)
  addPackageToBooking(packageId, arrivalDate, departureDate, numAdults, numChildren) {
    const booking = this._getOrCreateCurrentBooking('package_stay');
    const packages = this._getFromStorage('packages');
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return {
        booking,
        items: [],
        message: 'Package not found'
      };
    }

    const items = this._getFromStorage('booking_items');
    const { selectedCurrency } = this._getCurrentSitePreference();

    const basePrice = this._convertBetweenCurrencies(
      pkg.basePackagePrice || 0,
      pkg.currency || selectedCurrency,
      booking.currency || selectedCurrency
    );

    const existingPackageCount = items.filter((it) => it.bookingId === booking.id && it.itemType === 'package')
      .length;
    const role = existingPackageCount === 0 ? 'stay_primary' : 'stay_additional';

    booking.numAdults = numAdults != null ? Number(numAdults) : booking.numAdults;
    booking.numChildren = numChildren != null ? Number(numChildren) : booking.numChildren;

    const item = {
      id: this._generateId('bi'),
      bookingId: booking.id,
      itemType: 'package',
      role,
      chaletId: null,
      conferenceRoomId: null,
      packageId,
      cateringOptionId: null,
      name: pkg.name,
      startDate: arrivalDate || null,
      endDate: departureDate || null,
      eventDate: null,
      durationType: 'multi_day',
      quantity: 1,
      attendeesCount: null,
      unitPrice: Number(basePrice.toFixed(2)),
      totalPrice: Number(basePrice.toFixed(2)),
      currency: booking.currency || selectedCurrency
    };

    items.push(item);
    this._saveToStorage('booking_items', items);

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    const recalced = this._recalculateBookingTotals(booking.id, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Package added to booking'
    };
  }

  // getBookingSummary()
  getBookingSummary() {
    const currentId = localStorage.getItem('current_booking_id');
    let booking = null;
    if (currentId) {
      const bookings = this._getFromStorage('bookings');
      booking = bookings.find((b) => b.id === currentId) || null;
    }

    if (!booking) {
      return {
        booking: null,
        itemSummaries: []
      };
    }

    const recalced = this._recalculateBookingTotals(booking.id, false);
    booking = recalced.booking;
    const enrichedItems = this._enrichBookingItems(recalced.items);

    const itemSummaries = enrichedItems.map((it) => ({
      bookingItemId: it.id,
      itemType: it.itemType,
      role: it.role,
      name: it.name,
      startDate: it.startDate || null,
      endDate: it.endDate || null,
      eventDate: it.eventDate || null,
      durationType: it.durationType || null,
      quantity: it.quantity != null ? it.quantity : null,
      attendeesCount: it.attendeesCount != null ? it.attendeesCount : null,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      currency: it.currency,
      // Resolved foreign keys for convenience
      chalet: it.chalet || null,
      conferenceRoom: it.conferenceRoom || null,
      package: it.package || null,
      cateringOption: it.cateringOption || null
    }));

    return {
      booking,
      itemSummaries
    };
  }

  // removeBookingItem(bookingItemId)
  removeBookingItem(bookingItemId) {
    const items = this._getFromStorage('booking_items');
    const idx = items.findIndex((it) => it.id === bookingItemId);
    if (idx === -1) {
      return {
        booking: null,
        items: [],
        message: 'Booking item not found'
      };
    }

    const item = items[idx];
    items.splice(idx, 1);
    this._saveToStorage('booking_items', items);

    const recalced = this._recalculateBookingTotals(item.bookingId, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Booking item removed'
    };
  }

  // updateBookingItemQuantity(bookingItemId, quantity)
  updateBookingItemQuantity(bookingItemId, quantity) {
    const items = this._getFromStorage('booking_items');
    const idx = items.findIndex((it) => it.id === bookingItemId);
    if (idx === -1) {
      return {
        booking: null,
        items: [],
        message: 'Booking item not found'
      };
    }

    const item = items[idx];
    const qty = Number(quantity || 0);
    item.quantity = qty;
    item.attendeesCount = item.itemType === 'catering' ? qty : item.attendeesCount;
    item.totalPrice = Number((item.unitPrice * qty).toFixed(2));

    items[idx] = item;
    this._saveToStorage('booking_items', items);

    const recalced = this._recalculateBookingTotals(item.bookingId, false);
    const enrichedItems = this._enrichBookingItems(recalced.items);

    return {
      booking: recalced.booking,
      items: enrichedItems,
      message: 'Booking item quantity updated'
    };
  }

  // applyPromoCodeToBooking(promoCode)
  applyPromoCodeToBooking(promoCode) {
    const booking = this._getOrCreateCurrentBooking();
    const promos = this._getFromStorage('promo_codes');
    const codeStr = String(promoCode || '').toLowerCase();

    const promo = promos.find((p) => String(p.code).toLowerCase() === codeStr);
    if (!promo) {
      // Ensure booking totals are recalculated without promo
      this._recalculateBookingTotals(booking.id, true);
      return {
        success: false,
        booking: this._getFromStorage('bookings').find((b) => b.id === booking.id) || booking,
        message: 'Promo code not found'
      };
    }

    // Recalculate subtotal without applying existing promo
    const recalcedBase = this._recalculateBookingTotals(booking.id, true);
    const baseBooking = recalcedBase.booking;
    const items = recalcedBase.items;

    const validation = this._validateAndApplyPromoCode(baseBooking, items, promo);
    if (!validation.valid) {
      // Save booking without promo
      baseBooking.appliedPromoCode = null;
      baseBooking.discountAmount = 0;
      baseBooking.totalAmount = baseBooking.subtotalAmount;

      const bookings = this._getFromStorage('bookings');
      const idx = bookings.findIndex((b) => b.id === baseBooking.id);
      if (idx !== -1) {
        bookings[idx] = baseBooking;
        this._saveToStorage('bookings', bookings);
      }

      return {
        success: false,
        booking: baseBooking,
        message: validation.message
      };
    }

    baseBooking.appliedPromoCode = promo.code;
    baseBooking.discountAmount = validation.discountAmount;
    baseBooking.totalAmount = Number(
      (baseBooking.subtotalAmount - baseBooking.discountAmount).toFixed(2)
    );
    baseBooking.updatedAt = this._nowIso();

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === baseBooking.id);
    if (idx !== -1) {
      bookings[idx] = baseBooking;
      this._saveToStorage('bookings', bookings);
    }

    return {
      success: true,
      booking: baseBooking,
      message: validation.message
    };
  }

  // setBookingContactDetails(contactType, contactName, contactEmail, contactPhone, companyName, specialRequests)
  setBookingContactDetails(
    contactType,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    specialRequests
  ) {
    const booking = this._getOrCreateCurrentBooking();

    booking.contactType = contactType || booking.contactType;
    booking.contactName = contactName || booking.contactName;
    booking.contactEmail = contactEmail || booking.contactEmail;
    booking.contactPhone = contactPhone || booking.contactPhone;
    booking.companyName = companyName || booking.companyName;
    booking.specialRequests = specialRequests || booking.specialRequests;
    booking.updatedAt = this._nowIso();

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    return {
      booking,
      message: 'Contact details updated'
    };
  }

  // submitPaymentForBooking(cardNumber, expiryMonth, expiryYear, cvc, cardHolderName)
  submitPaymentForBooking(cardNumber, expiryMonth, expiryYear, cvc, cardHolderName) {
    const booking = this._getOrCreateCurrentBooking();

    if (!booking || booking.totalAmount <= 0) {
      return {
        payment: null,
        booking,
        success: false,
        message: 'No payable booking found'
      };
    }

    // In a real system we would validate card details; here we simulate success
    const payment = this._createPaymentRecord(booking, { cardNumber });

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    const now = this._nowIso();

    if (idx !== -1) {
      bookings[idx].status = 'confirmed';
      bookings[idx].confirmationNumber = bookings[idx].confirmationNumber || this._generateConfirmationNumber();
      bookings[idx].confirmedAt = now;
      bookings[idx].updatedAt = now;
      this._saveToStorage('bookings', bookings);
    }

    // Clear current booking pointer so next flow starts fresh
    localStorage.setItem('current_booking_id', '');

    const updatedBooking = bookings.find((b) => b.id === booking.id) || booking;

    return {
      payment,
      booking: updatedBooking,
      success: true,
      message: 'Payment succeeded and booking confirmed'
    };
  }

  // getBookingConfirmation(bookingId)
  getBookingConfirmation(bookingId) {
    const bookings = this._getFromStorage('bookings');
    let booking = null;

    if (bookingId) {
      booking = bookings.find((b) => b.id === bookingId) || null;
    } else {
      // Most recently confirmed booking
      const confirmed = bookings
        .filter((b) => b.status === 'confirmed')
        .sort((a, b) => {
          const ta = a.confirmedAt ? this._parseDate(a.confirmedAt).getTime() : 0;
          const tb = b.confirmedAt ? this._parseDate(b.confirmedAt).getTime() : 0;
          return tb - ta;
        });
      booking = confirmed[0] || null;
    }

    if (!booking) {
      return {
        booking: null,
        itemSummaries: []
      };
    }

    const allItems = this._getFromStorage('booking_items');
    const bookingItems = allItems.filter((it) => it.bookingId === booking.id);
    const enrichedItems = this._enrichBookingItems(bookingItems);

    const itemSummaries = enrichedItems.map((it) => ({
      bookingItemId: it.id,
      itemType: it.itemType,
      role: it.role,
      name: it.name,
      startDate: it.startDate || null,
      endDate: it.endDate || null,
      eventDate: it.eventDate || null,
      quantity: it.quantity != null ? it.quantity : null,
      totalPrice: it.totalPrice,
      currency: it.currency,
      chalet: it.chalet || null,
      conferenceRoom: it.conferenceRoom || null,
      package: it.package || null,
      cateringOption: it.cateringOption || null
    }));

    return {
      booking,
      itemSummaries
    };
  }

  // submitWeddingQuoteRequest(eventType, eventDate, eventStartTime, guestCount, budgetAmount, budgetCurrency, menuPreference, specialRequests, contactName, contactPhone, contactEmail)
  submitWeddingQuoteRequest(
    eventType,
    eventDate,
    eventStartTime,
    guestCount,
    budgetAmount,
    budgetCurrency,
    menuPreference,
    specialRequests,
    contactName,
    contactPhone,
    contactEmail
  ) {
    const requests = this._getFromStorage('wedding_quote_requests');

    const eventDateTime = (function (self) {
      if (!eventDate) return null;
      try {
        if (eventStartTime) {
          const dt = new Date(eventDate + 'T' + eventStartTime);
          return dt.toISOString();
        }
        const dt = new Date(eventDate + 'T00:00:00');
        return dt.toISOString();
      } catch (e) {
        return null;
      }
    })(this);

    const request = {
      id: this._generateId('wqr'),
      eventType: eventType || 'wedding',
      createdAt: this._nowIso(),
      eventDateTime,
      guestCount: guestCount != null ? Number(guestCount) : 0,
      budgetAmount: budgetAmount != null ? Number(budgetAmount) : 0,
      budgetCurrency: budgetCurrency || 'usd',
      menuPreference: menuPreference || null,
      specialRequests: specialRequests || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('wedding_quote_requests', requests);

    return {
      weddingQuoteRequest: request,
      success: true,
      message: 'Wedding quote request submitted'
    };
  }

  // getAboutVenueContent()
  getAboutVenueContent() {
    const data = localStorage.getItem('about_venue_content');
    return data ? JSON.parse(data) : {
      headline: '',
      bodyHtml: '',
      highlights: [],
      address: '',
      mapEmbedInfo: ''
    };
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const data = localStorage.getItem('policies_content');
    return data
      ? JSON.parse(data)
      : {
          bookingTermsHtml: '',
          cancellationPolicyHtml: '',
          paymentConditionsHtml: '',
          houseRulesHtml: '',
          privacyPolicyHtml: ''
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
