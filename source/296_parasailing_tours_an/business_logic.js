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
    // keep counter in sync (constructor call will advance it once; acceptable)
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tableKeys = [
      'experiences',
      'experience_availabilities',
      'experience_addons',
      'experience_price_options',
      'carts',
      'cart_items',
      'bookings',
      'gift_card_types',
      'faq_items',
      'contact_messages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      // If corrupted, reset to empty array to avoid breaking logic
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _dateOnly(str) {
    if (!str) return null;
    // Accept either 'YYYY-MM-DD' or full ISO; always return first 10 chars
    return String(str).slice(0, 10);
  }

  _sameDate(dateStr, yyyyMmDd) {
    if (!dateStr || !yyyyMmDd) return false;
    return this._dateOnly(dateStr) === this._dateOnly(yyyyMmDd);
  }

  _timeFromDateTimeString(dateTimeStr) {
    if (!dateTimeStr) return null;
    const s = String(dateTimeStr);
    const tIndex = s.indexOf('T');
    if (tIndex !== -1 && s.length >= tIndex + 5) {
      // assume 'YYYY-MM-DDTHH:MM...'
      return s.slice(tIndex + 1, tIndex + 6);
    }
    // fallback: try splitting by space
    const parts = s.split(' ');
    if (parts.length > 1 && /^\d{2}:\d{2}/.test(parts[1])) {
      return parts[1].slice(0, 5);
    }
    return null;
  }

  _timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _compareHHMM(a, b) {
    const ma = this._timeToMinutes(a);
    const mb = this._timeToMinutes(b);
    if (ma == null && mb == null) return 0;
    if (ma == null) return 1;
    if (mb == null) return -1;
    return ma - mb;
  }

  _combineDateAndTimeToISO(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const dOnly = this._dateOnly(dateStr);
    // Build a simple combined datetime string without timezone conversion.
    // This avoids environment-dependent offsets when later parsing the value.
    return `${dOnly}T${timeStr}:00`;
  }

  _normalizeDateToISO(dateStr) {
    if (!dateStr) return null;
    const dOnly = this._dateOnly(dateStr);
    // Store as date-only ISO (midnight UTC)
    const d = new Date(`${dOnly}T00:00:00`);
    return d.toISOString();
  }

  _buildParticipantSummary(adultCount, childCount) {
    const adults = adultCount || 0;
    const children = childCount || 0;
    const parts = [];
    if (adults > 0) {
      parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
    }
    if (children > 0) {
      parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
    }
    return parts.join(', ') || 'No participants specified';
  }

  _labelFromEnumValue(value) {
    if (!value || typeof value !== 'string') return '';
    // e.g., 'boat_rentals_only' -> 'Boat rentals only'
    return value
      .split('_')
      .map((part, idx) => (idx === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join(' ');
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    if (!Array.isArray(carts)) {
      carts = [];
    }
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        taxes: 0,
        total: 0,
        currency: 'USD',
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    if (!cartId) return null;
    let carts = this._getFromStorage('carts');
    if (!Array.isArray(carts) || carts.length === 0) return null;

    const idx = carts.findIndex((c) => c.id === cartId);
    if (idx === -1) return null;

    const cart = carts[idx];
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter((it) => it.cartId === cartId);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      if (item.itemType === 'experience_booking') {
        subtotal += Number(item.priceTotal || 0);
      } else if (item.itemType === 'gift_card') {
        subtotal += Number(item.giftCardAmount || 0);
      }
    });

    const taxes = 0; // can be extended later
    cart.items = itemsForCart.map((it) => it.id);
    cart.subtotal = Number(subtotal.toFixed(2));
    cart.taxes = Number(taxes.toFixed(2));
    cart.total = Number((subtotal + taxes).toFixed(2));
    cart.currency = cart.currency || 'USD';
    cart.updatedAt = this._nowISO();

    carts[idx] = cart;
    this._saveToStorage('carts', carts);
    return cart;
  }

  // ----------------------
  // Availability helper
  // ----------------------

  /**
   * Internal helper to apply time-of-day, start time window, duration, and price
   * filters at the time-slot level.
   *
   * @param {Array} availabilityRecords - ExperienceAvailability records (for one or more dates)
   * @param {Object} filters - { timeOfDay, startTimeFrom, startTimeTo, durationHours, maxPricePerPerson, maxTotalPrice }
   * @returns {Object} { slots, minPricePerPerson, minPriceTotal, earliestStartTime }
   */
  _filterExperienceAvailabilities(availabilityRecords, filters) {
    const {
      timeOfDay,
      startTimeFrom,
      startTimeTo,
      durationHours,
      maxPricePerPerson,
      maxTotalPrice
    } = filters || {};

    const matchingSlots = [];
    let minPricePerPerson = null;
    let minPriceTotal = null;
    let earliestStartTime = null;

    if (!Array.isArray(availabilityRecords)) {
      return { slots: [], minPricePerPerson, minPriceTotal, earliestStartTime };
    }

    for (const availability of availabilityRecords) {
      const slots = Array.isArray(availability.availableTimeSlots)
        ? availability.availableTimeSlots
        : [];

      for (const slot of slots) {
        const slotTime = this._timeFromDateTimeString(slot.startTime);
        const slotMinutes = this._timeToMinutes(slotTime);

        if (timeOfDay && slot.timeOfDay && slot.timeOfDay !== timeOfDay) {
          continue;
        }

        if (startTimeFrom) {
          const fromMinutes = this._timeToMinutes(startTimeFrom);
          if (slotMinutes != null && fromMinutes != null && slotMinutes < fromMinutes) {
            continue;
          }
        }

        if (startTimeTo) {
          const toMinutes = this._timeToMinutes(startTimeTo);
          if (slotMinutes != null && toMinutes != null && slotMinutes > toMinutes) {
            continue;
          }
        }

        if (durationHours != null && slot.durationHours != null && slot.durationHours !== durationHours) {
          continue;
        }

        if (maxPricePerPerson != null && slot.pricePerPerson != null && slot.pricePerPerson > maxPricePerPerson) {
          continue;
        }

        if (maxTotalPrice != null && slot.priceTotal != null && slot.priceTotal > maxTotalPrice) {
          continue;
        }

        const enrichedSlot = Object.assign({}, slot, { timeHHMM: slotTime });
        matchingSlots.push(enrichedSlot);

        if (slot.pricePerPerson != null) {
          if (minPricePerPerson == null || slot.pricePerPerson < minPricePerPerson) {
            minPricePerPerson = slot.pricePerPerson;
          }
        }

        if (slot.priceTotal != null) {
          if (minPriceTotal == null || slot.priceTotal < minPriceTotal) {
            minPriceTotal = slot.priceTotal;
          }
        }

        if (slotTime) {
          if (!earliestStartTime || this._compareHHMM(slotTime, earliestStartTime) < 0) {
            earliestStartTime = slotTime;
          }
        }
      }
    }

    return {
      slots: matchingSlots,
      minPricePerPerson,
      minPriceTotal,
      earliestStartTime
    };
  }

  // ----------------------
  // Booking helpers
  // ----------------------

  _generateBookingCode(experienceType) {
    let prefix = 'BK';
    if (experienceType === 'parasailing') prefix = 'PS';
    else if (experienceType === 'boat_rental') prefix = 'BR';
    else if (experienceType === 'package_combo') prefix = 'PK';
    const counter = this._getNextIdCounter();
    return `${prefix}-${counter}`;
  }

  _createBookingsFromCart(cart, cartItems, contact) {
    let bookings = this._getFromStorage('bookings');
    const experiences = this._getFromStorage('experiences');

    const newBookings = [];

    const experienceItems = (cartItems || []).filter(
      (item) => item.itemType === 'experience_booking'
    );

    for (const item of experienceItems) {
      const experience = experiences.find((e) => e.id === item.experienceId) || null;
      const now = this._nowISO();
      const bookingId = this._generateId('booking');
      const bookingCode = this._generateBookingCode(
        experience ? experience.experienceType : 'general'
      );

      const booking = {
        id: bookingId,
        bookingCode: bookingCode,
        contactFirstName: contact.contactFirstName,
        contactLastName: contact.contactLastName,
        contactEmail: contact.contactEmail,
        contactPhone: contact.contactPhone || null,
        experienceId: item.experienceId,
        experienceType: experience ? experience.experienceType : null,
        experienceName: item.experienceName || (experience ? experience.name : ''),
        date: item.date,
        startTime: item.startTime,
        durationHours: item.durationHours || null,
        adultCount: item.adultCount || 0,
        childCount: item.childCount || 0,
        participantSummary:
          item.participantSummary ||
          this._buildParticipantSummary(item.adultCount, item.childCount),
        addons: item.addons || [],
        pricePerPerson: item.pricePerPerson || null,
        priceTotal: item.priceTotal || 0,
        currency: cart.currency || 'USD',
        status: 'confirmed',
        createdAt: now,
        updatedAt: now,
        lastRescheduledAt: null,
        sourceCartId: cart.id
      };

      bookings.push(booking);
      newBookings.push(booking);
    }

    this._saveToStorage('bookings', bookings);
    return newBookings;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageContent()
  getHomepageContent() {
    const experiences = this._getFromStorage('experiences');
    const active = experiences.filter((e) => e.status === 'active');

    const parasailing = active
      .filter((e) => e.experienceType === 'parasailing')
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    const boatRentals = active
      .filter((e) => e.experienceType === 'boat_rental')
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    const packages = active
      .filter((e) => e.experienceType === 'package_combo')
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    const featuredParasailing = parasailing.slice(0, 3);
    const featuredBoatRentals = boatRentals.slice(0, 3);
    const featuredPackages = packages.slice(0, 3);

    // Suggested dates based on real availability data
    const avails = this._getFromStorage('experience_availabilities');
    const uniqueDatesSet = new Set();
    for (const av of avails) {
      const d = this._dateOnly(av.date);
      if (d) uniqueDatesSet.add(d);
    }
    const suggestedSearchDates = Array.from(uniqueDatesSet).sort().slice(0, 5);

    return {
      heroTitle: 'Parasailing Tours & Boat Rentals',
      heroSubtitle: 'Book unforgettable parasailing, speedboat, and sunset cruise adventures.',
      featuredParasailing,
      featuredBoatRentals,
      featuredPackages,
      suggestedSearchDates
    };
  }

  // searchExperiencesBasic(date, experienceTypes, timeOfDay, maxPricePerPerson)
  searchExperiencesBasic(date, experienceTypes, timeOfDay, maxPricePerPerson) {
    const dateOnly = this._dateOnly(date);
    const types = Array.isArray(experienceTypes) && experienceTypes.length
      ? experienceTypes
      : ['parasailing', 'boat_rental', 'package_combo'];

    const experiences = this._getFromStorage('experiences');
    const active = experiences.filter((e) => e.status === 'active');

    const avails = this._getFromStorage('experience_availabilities').filter((av) =>
      this._sameDate(av.date, dateOnly)
    );

    const availByExp = new Map();
    for (const av of avails) {
      if (!availByExp.has(av.experienceId)) {
        availByExp.set(av.experienceId, []);
      }
      availByExp.get(av.experienceId).push(av);
    }

    const parasailing = [];
    const boatRentals = [];
    const packages = [];

    for (const exp of active) {
      if (!types.includes(exp.experienceType)) continue;
      const expAvails = availByExp.get(exp.id) || [];
      if (expAvails.length === 0) continue;

      // Time-of-day filter at slot level
      let hasMatchingSlot = false;
      for (const a of expAvails) {
        const slots = Array.isArray(a.availableTimeSlots) ? a.availableTimeSlots : [];
        for (const slot of slots) {
          if (timeOfDay && slot.timeOfDay && slot.timeOfDay !== timeOfDay) {
            continue;
          }
          if (maxPricePerPerson != null) {
            const price = slot.pricePerPerson != null
              ? slot.pricePerPerson
              : exp.pricePerPersonFrom;
            if (price != null && price > maxPricePerPerson) {
              continue;
            }
          }
          hasMatchingSlot = true;
          break;
        }
        if (hasMatchingSlot) break;
      }

      if (!hasMatchingSlot) continue;

      if (exp.experienceType === 'parasailing') parasailing.push(exp);
      else if (exp.experienceType === 'boat_rental') boatRentals.push(exp);
      else if (exp.experienceType === 'package_combo') packages.push(exp);
    }

    return {
      date: dateOnly,
      parasailing,
      boatRentals,
      packages
    };
  }

  // getParasailingFilterOptions(date)
  getParasailingFilterOptions(date) {
    const dateOnly = date ? this._dateOnly(date) : null;
    const experiences = this._getFromStorage('experiences').filter(
      (e) => e.status === 'active' && e.experienceType === 'parasailing'
    );

    let minPrice = null;
    let maxPrice = null;

    // Prefer Experience.pricePerPersonFrom; fallback to availability prices
    for (const exp of experiences) {
      if (exp.pricePerPersonFrom != null) {
        if (minPrice == null || exp.pricePerPersonFrom < minPrice) minPrice = exp.pricePerPersonFrom;
        if (maxPrice == null || exp.pricePerPersonFrom > maxPrice) maxPrice = exp.pricePerPersonFrom;
      }
    }

    if (dateOnly && (minPrice == null || maxPrice == null)) {
      const avails = this._getFromStorage('experience_availabilities').filter((av) =>
        this._sameDate(av.date, dateOnly)
      );
      for (const av of avails) {
        const slots = Array.isArray(av.availableTimeSlots) ? av.availableTimeSlots : [];
        for (const slot of slots) {
          if (slot.pricePerPerson != null) {
            if (minPrice == null || slot.pricePerPerson < minPrice) minPrice = slot.pricePerPerson;
            if (maxPrice == null || slot.pricePerPerson > maxPrice) maxPrice = slot.pricePerPerson;
          }
        }
      }
    }

    return {
      timeOfDayOptions: [
        { value: 'morning', label: 'Morning (before 12:00 PM)' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' }
      ],
      pricePerPersonRange: {
        min: minPrice != null ? minPrice : 0,
        max: maxPrice != null ? maxPrice : 0
      },
      ratingOptions: [3, 4, 4.5, 4.8, 5],
      amenityOptions: [
        { key: 'hotel_pickup_included', label: 'Hotel pickup included' },
        { key: 'photo_package_available', label: 'Photo package available' }
      ],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'start_time_early_to_late', label: 'Start time: Early to Late' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      ]
    };
  }

  // searchParasailingTours(date, timeOfDay, startTimeFrom, startTimeTo, maxPricePerPerson, minRating, hotelPickupIncluded, photoPackageAvailable, sortBy, limit)
  searchParasailingTours(
    date,
    timeOfDay,
    startTimeFrom,
    startTimeTo,
    maxPricePerPerson,
    minRating,
    hotelPickupIncluded,
    photoPackageAvailable,
    sortBy,
    limit
  ) {
    const dateOnly = this._dateOnly(date);
    if (!dateOnly) return [];

    const experiences = this._getFromStorage('experiences');
    const avails = this._getFromStorage('experience_availabilities').filter((av) =>
      this._sameDate(av.date, dateOnly)
    );

    const availByExp = new Map();
    for (const av of avails) {
      if (!availByExp.has(av.experienceId)) availByExp.set(av.experienceId, []);
      availByExp.get(av.experienceId).push(av);
    }

    const candidates = experiences.filter((exp) => {
      if (exp.status !== 'active') return false;
      if (exp.experienceType !== 'parasailing') return false;
      if (minRating != null && (exp.ratingAverage || 0) < minRating) return false;
      if (hotelPickupIncluded === true && !exp.hotelPickupIncluded) return false;
      if (photoPackageAvailable === true && !exp.photoPackageAvailable) return false;
      return true;
    });

    const enriched = [];

    for (const exp of candidates) {
      const expAvails = availByExp.get(exp.id) || [];
      if (expAvails.length === 0) continue;

      const summary = this._filterExperienceAvailabilities(expAvails, {
        timeOfDay,
        startTimeFrom,
        startTimeTo,
        durationHours: null,
        maxPricePerPerson: maxPricePerPerson != null ? maxPricePerPerson : null,
        maxTotalPrice: null
      });

      if (!summary.slots.length) continue;

      const minPricePerPerson =
        summary.minPricePerPerson != null
          ? summary.minPricePerPerson
          : exp.pricePerPersonFrom != null
          ? exp.pricePerPersonFrom
          : null;

      enriched.push({
        experience: exp,
        sortMeta: {
          minPricePerPerson,
          earliestStartTime: summary.earliestStartTime,
          rating: exp.ratingAverage || 0
        }
      });
    }

    if (sortBy) {
      if (sortBy === 'price_low_to_high') {
        enriched.sort((a, b) => {
          const pa = a.sortMeta.minPricePerPerson != null ? a.sortMeta.minPricePerPerson : Number.POSITIVE_INFINITY;
          const pb = b.sortMeta.minPricePerPerson != null ? b.sortMeta.minPricePerPerson : Number.POSITIVE_INFINITY;
          return pa - pb;
        });
      } else if (sortBy === 'price_high_to_low') {
        enriched.sort((a, b) => {
          const pa = a.sortMeta.minPricePerPerson != null ? a.sortMeta.minPricePerPerson : 0;
          const pb = b.sortMeta.minPricePerPerson != null ? b.sortMeta.minPricePerPerson : 0;
          return pb - pa;
        });
      } else if (sortBy === 'start_time_early_to_late') {
        enriched.sort((a, b) => {
          const ta = a.sortMeta.earliestStartTime || '99:99';
          const tb = b.sortMeta.earliestStartTime || '99:99';
          return this._compareHHMM(ta, tb);
        });
      } else if (sortBy === 'rating_high_to_low') {
        enriched.sort((a, b) => b.sortMeta.rating - a.sortMeta.rating);
      }
    }

    let results = enriched.map((e) => e.experience);
    if (limit != null && limit > 0) {
      results = results.slice(0, limit);
    }

    // Instrumentation for task completion tracking (task_6 - searchParasailingTours)
    try {
      if (
        dateOnly === '2026-08-10' &&
        minRating != null &&
        minRating >= 4.8 &&
        hotelPickupIncluded === true
      ) {
        localStorage.setItem(
          'task6_searchParams',
          JSON.stringify({
            date: dateOnly,
            timeOfDay,
            startTimeFrom,
            startTimeTo,
            maxPricePerPerson,
            minRating,
            hotelPickupIncluded,
            photoPackageAvailable,
            sortBy,
            resultExperienceIds: results.map((e) => e.id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task_6 searchParasailingTours):', e);
    }

    return results;
  }

  // getBoatRentalFilterOptions(date)
  getBoatRentalFilterOptions(date) {
    const dateOnly = date ? this._dateOnly(date) : null;
    const experiences = this._getFromStorage('experiences').filter(
      (e) => e.status === 'active' && e.experienceType === 'boat_rental'
    );

    const boatTypeSet = new Set();
    let minCap = null,
      maxCap = null;
    let minPrice = null,
      maxPrice = null;
    let minHP = null,
      maxHP = null;

    for (const exp of experiences) {
      if (exp.boatType) boatTypeSet.add(exp.boatType);

      const capacity = exp.maxCapacity != null ? exp.maxCapacity : exp.maxParticipants;
      if (capacity != null) {
        if (minCap == null || capacity < minCap) minCap = capacity;
        if (maxCap == null || capacity > maxCap) maxCap = capacity;
      }

      if (exp.priceTotalFrom != null) {
        if (minPrice == null || exp.priceTotalFrom < minPrice) minPrice = exp.priceTotalFrom;
        if (maxPrice == null || exp.priceTotalFrom > maxPrice) maxPrice = exp.priceTotalFrom;
      }

      if (exp.engineHorsepower != null) {
        if (minHP == null || exp.engineHorsepower < minHP) minHP = exp.engineHorsepower;
        if (maxHP == null || exp.engineHorsepower > maxHP) maxHP = exp.engineHorsepower;
      }
    }

    if (dateOnly && (minPrice == null || maxPrice == null)) {
      const avails = this._getFromStorage('experience_availabilities').filter((av) =>
        this._sameDate(av.date, dateOnly)
      );
      for (const av of avails) {
        const slots = Array.isArray(av.availableTimeSlots) ? av.availableTimeSlots : [];
        for (const slot of slots) {
          if (slot.priceTotal != null) {
            if (minPrice == null || slot.priceTotal < minPrice) minPrice = slot.priceTotal;
            if (maxPrice == null || slot.priceTotal > maxPrice) maxPrice = slot.priceTotal;
          }
        }
      }
    }

    const boatTypeOptions = Array.from(boatTypeSet).map((v) => ({
      value: v,
      label: this._labelFromEnumValue(v)
    }));

    // Duration options from availability slots
    const durationSet = new Set();
    const allAvails = this._getFromStorage('experience_availabilities');
    for (const av of allAvails) {
      if (dateOnly && !this._sameDate(av.date, dateOnly)) continue;
      const slots = Array.isArray(av.availableTimeSlots) ? av.availableTimeSlots : [];
      for (const slot of slots) {
        if (slot.durationHours != null) durationSet.add(slot.durationHours);
      }
    }
    const durationOptions = Array.from(durationSet).sort((a, b) => a - b);

    return {
      boatTypeOptions,
      capacityRange: {
        min: minCap != null ? minCap : 0,
        max: maxCap != null ? maxCap : 0
      },
      durationOptions,
      priceTotalRange: {
        min: minPrice != null ? minPrice : 0,
        max: maxPrice != null ? maxPrice : 0
      },
      amenityOptions: [
        { key: 'fuel_included', label: 'Fuel included' },
        { key: 'live_music_included', label: 'Live music included' },
        { key: 'byob_allowed', label: 'BYOB allowed' }
      ],
      engineHorsepowerRange: {
        min: minHP != null ? minHP : 0,
        max: maxHP != null ? maxHP : 0
      },
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'capacity_high_to_low', label: 'Capacity: High to Low' }
      ]
    };
  }

  // searchBoatRentals(date, startTime, startTimeFrom, startTimeTo, durationHours, boatType, minCapacity, maxTotalPrice, fuelIncluded, liveMusicIncluded, byobAllowed, minEngineHorsepower, sortBy, limit)
  searchBoatRentals(
    date,
    startTime,
    startTimeFrom,
    startTimeTo,
    durationHours,
    boatType,
    minCapacity,
    maxTotalPrice,
    fuelIncluded,
    liveMusicIncluded,
    byobAllowed,
    minEngineHorsepower,
    sortBy,
    limit
  ) {
    const dateOnly = this._dateOnly(date);
    if (!dateOnly) return [];

    // Convert exact startTime into window if provided
    let windowFrom = startTimeFrom;
    let windowTo = startTimeTo;
    if (startTime && !startTimeFrom && !startTimeTo) {
      windowFrom = startTime;
      windowTo = startTime;
    }

    const experiences = this._getFromStorage('experiences');
    const avails = this._getFromStorage('experience_availabilities').filter((av) =>
      this._sameDate(av.date, dateOnly)
    );

    const availByExp = new Map();
    for (const av of avails) {
      if (!availByExp.has(av.experienceId)) availByExp.set(av.experienceId, []);
      availByExp.get(av.experienceId).push(av);
    }

    const candidates = experiences.filter((exp) => {
      if (exp.status !== 'active') return false;
      if (exp.experienceType !== 'boat_rental') return false;
      if (boatType && exp.boatType !== boatType) return false;

      const capacity = exp.maxCapacity != null ? exp.maxCapacity : exp.maxParticipants;
      if (minCapacity != null && (capacity == null || capacity < minCapacity)) return false;

      if (fuelIncluded === true && !exp.fuelIncluded) return false;
      if (liveMusicIncluded === true && !exp.liveMusicIncluded) return false;
      if (byobAllowed === true && !exp.byobAllowed) return false;
      if (minEngineHorsepower != null && (exp.engineHorsepower == null || exp.engineHorsepower < minEngineHorsepower)) return false;

      return true;
    });

    const enriched = [];

    for (const exp of candidates) {
      const expAvails = availByExp.get(exp.id) || [];
      if (!expAvails.length) continue;

      const summary = this._filterExperienceAvailabilities(expAvails, {
        timeOfDay: null,
        startTimeFrom: windowFrom,
        startTimeTo: windowTo,
        durationHours: durationHours != null ? durationHours : null,
        maxPricePerPerson: null,
        maxTotalPrice: maxTotalPrice != null ? maxTotalPrice : null
      });

      if (!summary.slots.length) continue;

      const minPriceTotal =
        summary.minPriceTotal != null
          ? summary.minPriceTotal
          : exp.priceTotalFrom != null
          ? exp.priceTotalFrom
          : null;

      const capacity = exp.maxCapacity != null ? exp.maxCapacity : exp.maxParticipants;

      enriched.push({
        experience: exp,
        sortMeta: {
          minPriceTotal,
          capacity: capacity != null ? capacity : 0
        }
      });
    }

    if (sortBy) {
      if (sortBy === 'price_low_to_high') {
        enriched.sort((a, b) => {
          const pa = a.sortMeta.minPriceTotal != null ? a.sortMeta.minPriceTotal : Number.POSITIVE_INFINITY;
          const pb = b.sortMeta.minPriceTotal != null ? b.sortMeta.minPriceTotal : Number.POSITIVE_INFINITY;
          return pa - pb;
        });
      } else if (sortBy === 'price_high_to_low') {
        enriched.sort((a, b) => {
          const pa = a.sortMeta.minPriceTotal != null ? a.sortMeta.minPriceTotal : 0;
          const pb = b.sortMeta.minPriceTotal != null ? b.sortMeta.minPriceTotal : 0;
          return pb - pa;
        });
      } else if (sortBy === 'capacity_high_to_low') {
        enriched.sort((a, b) => b.sortMeta.capacity - a.sortMeta.capacity);
      }
    }

    let results = enriched.map((e) => e.experience);
    if (limit != null && limit > 0) {
      results = results.slice(0, limit);
    }
    return results;
  }

  // getPackageFilterOptions()
  getPackageFilterOptions() {
    const experiences = this._getFromStorage('experiences').filter(
      (e) => e.status === 'active' && e.experienceType === 'package_combo'
    );

    const categorySet = new Set();
    let minDuration = null,
      maxDuration = null;
    let minPrice = null,
      maxPrice = null;
    const ratingSet = new Set();
    const reviewCountSet = new Set();

    for (const exp of experiences) {
      if (exp.packageCategory) categorySet.add(exp.packageCategory);
      if (exp.durationHours != null) {
        if (minDuration == null || exp.durationHours < minDuration) minDuration = exp.durationHours;
        if (maxDuration == null || exp.durationHours > maxDuration) maxDuration = exp.durationHours;
      }
      if (exp.pricePerPersonFrom != null) {
        if (minPrice == null || exp.pricePerPersonFrom < minPrice) minPrice = exp.pricePerPersonFrom;
        if (maxPrice == null || exp.pricePerPersonFrom > maxPrice) maxPrice = exp.pricePerPersonFrom;
      }
      if (exp.ratingAverage != null) ratingSet.add(exp.ratingAverage);
      if (exp.reviewCount != null) reviewCountSet.add(exp.reviewCount);
    }

    const packageCategoryOptions = Array.from(categorySet).map((v) => ({
      value: v,
      label: v
    }));

    const minDurationOptions = [];
    if (minDuration != null && maxDuration != null) {
      // simple thresholds from min to max in integer hours
      for (let h = Math.floor(minDuration); h <= Math.ceil(maxDuration); h++) {
        if (!minDurationOptions.includes(h)) minDurationOptions.push(h);
      }
    }

    const ratingOptions = Array.from(ratingSet).sort((a, b) => a - b);
    const reviewCountOptions = Array.from(reviewCountSet).sort((a, b) => a - b);

    return {
      packageCategoryOptions,
      minDurationHoursOptions: minDurationOptions,
      pricePerPersonRange: {
        min: minPrice != null ? minPrice : 0,
        max: maxPrice != null ? maxPrice : 0
      },
      ratingOptions,
      reviewCountOptions,
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'duration_short_to_long', label: 'Duration: Short to Long' }
      ]
    };
  }

  // searchPackages(date, packageCategory, minDurationHours, maxPricePerPerson, minRating, minReviewCount, sortBy, limit)
  searchPackages(
    date,
    packageCategory,
    minDurationHours,
    maxPricePerPerson,
    minRating,
    minReviewCount,
    sortBy,
    limit
  ) {
    const dateOnly = this._dateOnly(date);
    if (!dateOnly) return [];

    const experiences = this._getFromStorage('experiences');
    const avails = this._getFromStorage('experience_availabilities').filter((av) =>
      this._sameDate(av.date, dateOnly)
    );

    const availByExp = new Map();
    for (const av of avails) {
      if (!availByExp.has(av.experienceId)) availByExp.set(av.experienceId, []);
      availByExp.get(av.experienceId).push(av);
    }

    const candidates = experiences.filter((exp) => {
      if (exp.status !== 'active') return false;
      if (exp.experienceType !== 'package_combo') return false;
      if (packageCategory && exp.packageCategory !== packageCategory) return false;
      if (minDurationHours != null && (exp.durationHours == null || exp.durationHours < minDurationHours)) return false;
      if (maxPricePerPerson != null && exp.pricePerPersonFrom != null && exp.pricePerPersonFrom > maxPricePerPerson) return false;
      if (minRating != null && (exp.ratingAverage == null || exp.ratingAverage < minRating)) return false;
      if (minReviewCount != null && (exp.reviewCount == null || exp.reviewCount < minReviewCount)) return false;
      return true;
    });

    const enriched = [];

    for (const exp of candidates) {
      const expAvails = availByExp.get(exp.id) || [];
      if (!expAvails.length) continue; // must be available on that date

      const summary = this._filterExperienceAvailabilities(expAvails, {
        timeOfDay: null,
        startTimeFrom: null,
        startTimeTo: null,
        durationHours: null,
        maxPricePerPerson: maxPricePerPerson != null ? maxPricePerPerson : null,
        maxTotalPrice: null
      });

      if (!summary.slots.length && maxPricePerPerson != null) {
        // no slots that satisfy price; skip
        continue;
      }

      const minPricePerPerson =
        summary.minPricePerPerson != null
          ? summary.minPricePerPerson
          : exp.pricePerPersonFrom != null
          ? exp.pricePerPersonFrom
          : null;

      enriched.push({
        experience: exp,
        sortMeta: {
          minPricePerPerson,
          rating: exp.ratingAverage || 0,
          duration: exp.durationHours != null ? exp.durationHours : 0
        }
      });
    }

    if (sortBy) {
      if (sortBy === 'price_low_to_high') {
        enriched.sort((a, b) => {
          const pa = a.sortMeta.minPricePerPerson != null ? a.sortMeta.minPricePerPerson : Number.POSITIVE_INFINITY;
          const pb = b.sortMeta.minPricePerPerson != null ? b.sortMeta.minPricePerPerson : Number.POSITIVE_INFINITY;
          return pa - pb;
        });
      } else if (sortBy === 'rating_high_to_low') {
        enriched.sort((a, b) => b.sortMeta.rating - a.sortMeta.rating);
      } else if (sortBy === 'duration_short_to_long') {
        enriched.sort((a, b) => a.sortMeta.duration - b.sortMeta.duration);
      }
    }

    let results = enriched.map((e) => e.experience);
    if (limit != null && limit > 0) {
      results = results.slice(0, limit);
    }
    return results;
  }

  // getExperienceDetails(experienceId, date)
  getExperienceDetails(experienceId, date) {
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find((e) => e.id === experienceId) || null;

    const allPriceOptions = this._getFromStorage('experience_price_options');
    const priceOptionsRaw = allPriceOptions.filter((p) => p.experienceId === experienceId);

    const allAddons = this._getFromStorage('experience_addons');
    const addonsRaw = allAddons.filter((a) => a.experienceId === experienceId);

    const avails = this._getFromStorage('experience_availabilities');
    const dateOnly = date ? this._dateOnly(date) : null;

    // Instrumentation for task completion tracking (task_6 - getExperienceDetails)
    try {
      if (
        experience &&
        experience.experienceType === 'parasailing' &&
        dateOnly === '2026-08-10'
      ) {
        let existingIds = [];
        const existingRaw = localStorage.getItem('task6_comparedExperienceIds');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (Array.isArray(parsed)) {
              existingIds = parsed;
            }
          } catch (e) {
            // ignore parse errors and reset to empty array
            existingIds = [];
          }
        }
        if (!existingIds.includes(experienceId)) {
          const updatedIds = existingIds.concat(experienceId);
          localStorage.setItem('task6_comparedExperienceIds', JSON.stringify(updatedIds));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_6 getExperienceDetails):', e);
    }

    let selectedDateAvailabilityRaw = null;
    if (dateOnly) {
      selectedDateAvailabilityRaw =
        avails.find((av) => av.experienceId === experienceId && this._sameDate(av.date, dateOnly)) || null;
    }

    const otherUpcomingAvailabilitiesRaw = [];
    if (dateOnly) {
      for (const av of avails) {
        if (av.experienceId !== experienceId) continue;
        const avDate = this._dateOnly(av.date);
        if (!avDate) continue;
        if (avDate > dateOnly) otherUpcomingAvailabilitiesRaw.push(av);
      }
      otherUpcomingAvailabilitiesRaw.sort((a, b) => {
        const da = this._dateOnly(a.date) || '';
        const db = this._dateOnly(b.date) || '';
        return da.localeCompare(db);
      });
    }

    // Foreign key resolution: attach experience to related objects
    const priceOptions = priceOptionsRaw.map((p) => Object.assign({}, p, { experience }));
    const addons = addonsRaw.map((a) => Object.assign({}, a, { experience }));
    const selectedDateAvailability = selectedDateAvailabilityRaw
      ? Object.assign({}, selectedDateAvailabilityRaw, { experience })
      : null;
    const otherUpcomingAvailabilities = otherUpcomingAvailabilitiesRaw.map((av) =>
      Object.assign({}, av, { experience })
    );

    return {
      experience,
      priceOptions,
      addons,
      selectedDateAvailability,
      otherUpcomingAvailabilities
    };
  }

  // getExperienceAvailability(experienceId, date)
  getExperienceAvailability(experienceId, date) {
    const dateOnly = this._dateOnly(date);
    const avails = this._getFromStorage('experience_availabilities');
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find((e) => e.id === experienceId) || null;

    const record =
      avails.find((av) => av.experienceId === experienceId && this._sameDate(av.date, dateOnly)) || null;

    if (!record) return null;

    // Foreign key resolution
    return Object.assign({}, record, { experience });
  }

  // addExperienceToCart(experienceId, date, startTime, durationHours, adultCount, childCount, priceOptionId, addons)
  addExperienceToCart(
    experienceId,
    date,
    startTime,
    durationHours,
    adultCount,
    childCount,
    priceOptionId,
    addons
  ) {
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find((e) => e.id === experienceId) || null;
    if (!experience) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Experience not found.'
      };
    }

    const cart = this._getOrCreateCart();

    const allAvails = this._getFromStorage('experience_availabilities');
    const dateOnly = this._dateOnly(date);
    const expAvails = allAvails.filter(
      (av) => av.experienceId === experienceId && this._sameDate(av.date, dateOnly)
    );

    let selectedSlot = null;
    if (expAvails.length) {
      for (const av of expAvails) {
        const slots = Array.isArray(av.availableTimeSlots) ? av.availableTimeSlots : [];
        for (const slot of slots) {
          const slotTime = this._timeFromDateTimeString(slot.startTime);
          if (slotTime === startTime) {
            if (durationHours == null || slot.durationHours == null || slot.durationHours === durationHours) {
              selectedSlot = slot;
              break;
            }
          }
        }
        if (selectedSlot) break;
      }
    }

    const allPriceOptions = this._getFromStorage('experience_price_options');
    const priceOption = priceOptionId
      ? allPriceOptions.find((p) => p.id === priceOptionId && p.experienceId === experienceId) || null
      : null;

    let adults = adultCount != null ? adultCount : 0;
    let children = childCount != null ? childCount : 0;
    if (adults === 0 && children === 0) {
      adults = 1; // default at least one participant when not specified
    }
    const participants = adults + children;

    let pricePerPerson = null;
    let priceTotal = 0;

    if (priceOption && priceOption.pricingModel === 'per_person') {
      const basePPP =
        priceOption.pricePerPerson != null
          ? priceOption.pricePerPerson
          : selectedSlot && selectedSlot.pricePerPerson != null
          ? selectedSlot.pricePerPerson
          : experience.pricePerPersonFrom != null
          ? experience.pricePerPersonFrom
          : 0;
      pricePerPerson = basePPP;
      priceTotal = basePPP * (participants || 1);
    } else if (priceOption && priceOption.pricingModel === 'per_group') {
      if (selectedSlot && selectedSlot.priceTotal != null) {
        priceTotal = selectedSlot.priceTotal;
      } else if (priceOption.priceTotal != null) {
        priceTotal = priceOption.priceTotal;
      } else if (experience.priceTotalFrom != null) {
        priceTotal = experience.priceTotalFrom;
      } else {
        priceTotal = 0;
      }
      pricePerPerson = participants > 0 ? priceTotal / participants : null;
    } else if (priceOption && priceOption.pricingModel === 'per_hour') {
      const hours =
        durationHours != null
          ? durationHours
          : selectedSlot && selectedSlot.durationHours != null
          ? selectedSlot.durationHours
          : experience.durationHours != null
          ? experience.durationHours
          : 1;
      const perHour = priceOption.priceTotal != null ? priceOption.priceTotal : 0;
      priceTotal = perHour * hours;
      pricePerPerson = participants > 0 ? priceTotal / participants : null;
    } else {
      // No explicit price option
      if (selectedSlot && selectedSlot.pricePerPerson != null) {
        pricePerPerson = selectedSlot.pricePerPerson;
        priceTotal = pricePerPerson * (participants || 1);
      } else if (experience.pricePerPersonFrom != null) {
        pricePerPerson = experience.pricePerPersonFrom;
        priceTotal = pricePerPerson * (participants || 1);
      } else if (selectedSlot && selectedSlot.priceTotal != null) {
        priceTotal = selectedSlot.priceTotal;
        pricePerPerson = participants > 0 ? priceTotal / participants : null;
      } else if (experience.priceTotalFrom != null) {
        priceTotal = experience.priceTotalFrom;
        pricePerPerson = participants > 0 ? priceTotal / participants : null;
      } else {
        priceTotal = 0;
      }
    }

    // Add-ons
    const allAddons = this._getFromStorage('experience_addons');
    const appliedAddons = [];
    let addonsTotal = 0;

    if (Array.isArray(addons)) {
      for (const sel of addons) {
        if (!sel || !sel.addonId) continue;
        const addon = allAddons.find(
          (a) => a.id === sel.addonId && a.experienceId === experienceId
        );
        if (!addon) continue;
        const quantity = sel.quantity != null ? sel.quantity : 1;
        const lineTotal = (addon.price || 0) * quantity;
        addonsTotal += lineTotal;
        appliedAddons.push({
          addonId: addon.id,
          name: addon.name,
          price: addon.price,
          quantity,
          addonType: addon.addonType,
          isStandardPhotoPackage: addon.isStandardPhotoPackage
        });
      }
    }

    priceTotal += addonsTotal;

    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'experience_booking',
      experienceId: experienceId,
      experienceName: experience.name,
      date: this._normalizeDateToISO(date),
      startTime: this._combineDateAndTimeToISO(date, startTime),
      durationHours:
        durationHours != null
          ? durationHours
          : selectedSlot && selectedSlot.durationHours != null
          ? selectedSlot.durationHours
          : experience.durationHours != null
          ? experience.durationHours
          : null,
      adultCount: adults,
      childCount: children,
      participantSummary: this._buildParticipantSummary(adults, children),
      pricePerPerson,
      priceTotal: Number(priceTotal.toFixed(2)),
      addons: appliedAddons,
      // gift card fields unused for this itemType
      giftCardTypeId: null,
      giftCardAmount: null,
      giftCardDeliveryMethod: null,
      giftCardRecipientName: null,
      giftCardRecipientEmail: null,
      giftCardMessage: null,
      giftCardSendOption: null,
      giftCardDeliveryDate: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      message: 'Experience added to cart.'
    };
  }

  // getGiftCardTypes()
  getGiftCardTypes() {
    const giftCardTypes = this._getFromStorage('gift_card_types');
    return giftCardTypes;
  }

  // addGiftCardToCart(giftCardTypeId, amount, recipientName, recipientEmail, message, sendOption, deliveryDate)
  addGiftCardToCart(
    giftCardTypeId,
    amount,
    recipientName,
    recipientEmail,
    message,
    sendOption,
    deliveryDate
  ) {
    const giftCardTypes = this._getFromStorage('gift_card_types');
    const type = giftCardTypes.find((t) => t.id === giftCardTypeId) || null;
    if (!type || type.status !== 'active') {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Gift card type not found or inactive.'
      };
    }

    if (amount == null || isNaN(amount) || amount <= 0) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Invalid gift card amount.'
      };
    }

    if (type.minAmount != null && amount < type.minAmount) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: `Minimum amount for this gift card is ${type.minAmount}.`
      };
    }

    if (type.maxAmount != null && amount > type.maxAmount) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: `Maximum amount for this gift card is ${type.maxAmount}.`
      };
    }

    if (sendOption !== 'send_now' && sendOption !== 'send_later') {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Invalid send option.'
      };
    }

    if (sendOption === 'send_later' && !deliveryDate) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Delivery date is required when scheduling gift card.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'gift_card',
      experienceId: null,
      experienceName: null,
      date: null,
      startTime: null,
      durationHours: null,
      adultCount: null,
      childCount: null,
      participantSummary: null,
      pricePerPerson: null,
      priceTotal: Number(Number(amount).toFixed(2)),
      addons: [],
      giftCardTypeId,
      giftCardAmount: Number(Number(amount).toFixed(2)),
      giftCardDeliveryMethod: 'digital_email',
      giftCardRecipientName: recipientName,
      giftCardRecipientEmail: recipientEmail,
      giftCardMessage: message || null,
      giftCardSendOption: sendOption,
      giftCardDeliveryDate:
        sendOption === 'send_later' && deliveryDate
          ? this._normalizeDateToISO(deliveryDate)
          : null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      message: 'Gift card added to cart.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter((it) => it.cartId === updatedCart.id);

    const experiences = this._getFromStorage('experiences');
    const giftCardTypes = this._getFromStorage('gift_card_types');

    const items = itemsForCart.map((it) => {
      const experience =
        it.itemType === 'experience_booking' && it.experienceId
          ? experiences.find((e) => e.id === it.experienceId) || null
          : null;
      const giftCardType =
        it.itemType === 'gift_card' && it.giftCardTypeId
          ? giftCardTypes.find((g) => g.id === it.giftCardTypeId) || null
          : null;
      return {
        cartItem: it,
        experience,
        giftCardType
      };
    });

    return {
      cart: updatedCart,
      items
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    if (!cartItemId) {
      return {
        success: false,
        cart: null,
        message: 'cartItemId is required.'
      };
    }

    const allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex((it) => it.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals(cart.id) || cart;
      return {
        success: false,
        cart: updatedCart,
        message: 'Cart item not found.'
      };
    }

    const item = allItems[idx];
    allItems.splice(idx, 1);
    this._saveToStorage('cart_items', allItems);

    const updatedCart = this._recalculateCartTotals(item.cartId);

    return {
      success: true,
      cart: updatedCart,
      message: 'Cart item removed.'
    };
  }

  // getCheckoutData()
  getCheckoutData() {
    const { cart, items } = this.getCart();

    const policiesSummary =
      'By completing your booking, you agree to our terms, cancellation and rescheduling policies, and privacy policy.';

    return {
      cart,
      items,
      policiesSummary
    };
  }

  // submitCheckout(contactFirstName, contactLastName, contactEmail, contactPhone, paymentMethodNonce, acceptTerms)
  submitCheckout(
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    paymentMethodNonce,
    acceptTerms
  ) {
    if (!acceptTerms) {
      return {
        success: false,
        bookings: [],
        cartCleared: false,
        message: 'You must accept the terms to complete checkout.'
      };
    }

    if (!contactFirstName || !contactLastName || !contactEmail || !paymentMethodNonce) {
      return {
        success: false,
        bookings: [],
        cartCleared: false,
        message: 'Missing required contact or payment information.'
      };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter((it) => it.cartId === cart.id);

    if (!itemsForCart.length) {
      return {
        success: false,
        bookings: [],
        cartCleared: false,
        message: 'Cart is empty.'
      };
    }

    const contact = {
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone
    };

    // Simulate payment success (no real payment processing here)
    const bookings = this._createBookingsFromCart(cart, itemsForCart, contact);

    // Clear cart items
    const remainingItems = allItems.filter((it) => it.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingItems);

    // Reset cart totals
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].items = [];
      carts[idx].subtotal = 0;
      carts[idx].taxes = 0;
      carts[idx].total = 0;
      carts[idx].updatedAt = this._nowISO();
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      bookings,
      cartCleared: true,
      message: 'Checkout completed successfully.'
    };
  }

  // lookupBookings(bookingCode, lastName)
  lookupBookings(bookingCode, lastName) {
    const bookings = this._getFromStorage('bookings');
    const experiences = this._getFromStorage('experiences');

    const lcLastName = lastName ? String(lastName).toLowerCase() : '';
    const lcCode = bookingCode ? String(bookingCode).toLowerCase() : '';

    const results = bookings.filter((b) => {
      const codeMatch = b.bookingCode && String(b.bookingCode).toLowerCase() === lcCode;
      const nameMatch =
        b.contactLastName && String(b.contactLastName).toLowerCase() === lcLastName;
      return codeMatch && nameMatch;
    });

    // Foreign key resolution: attach experience
    return results.map((b) => {
      const experience = experiences.find((e) => e.id === b.experienceId) || null;
      return Object.assign({}, b, { experience });
    });
  }

  // getBookingDetail(bookingId)
  getBookingDetail(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find((b) => b.id === bookingId) || null;
    const experiences = this._getFromStorage('experiences');
    const experience = booking
      ? experiences.find((e) => e.id === booking.experienceId) || null
      : null;

    return {
      booking,
      experience
    };
  }

  // getRescheduleOptions(bookingId, date)
  getRescheduleOptions(bookingId, date) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find((b) => b.id === bookingId) || null;
    const dateOnly = this._dateOnly(date);

    const result = {
      booking,
      date: dateOnly,
      timeSlots: []
    };

    if (!booking || !dateOnly) {
      return result;
    }

    const avails = this._getFromStorage('experience_availabilities');
    const availability =
      avails.find(
        (av) =>
          av.experienceId === booking.experienceId && this._sameDate(av.date, dateOnly)
      ) || null;

    if (!availability || !Array.isArray(availability.availableTimeSlots)) {
      return result;
    }

    const timeSlots = availability.availableTimeSlots.map((slot) => {
      const slotTime = this._timeFromDateTimeString(slot.startTime) || '00:00';
      return {
        startTime: slotTime,
        durationHours: slot.durationHours != null ? slot.durationHours : booking.durationHours,
        isAvailable: true,
        priceTotal: slot.priceTotal != null ? slot.priceTotal : booking.priceTotal
      };
    });

    result.timeSlots = timeSlots;
    return result;
  }

  // rescheduleBooking(bookingId, newDate, newStartTime)
  rescheduleBooking(bookingId, newDate, newStartTime) {
    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === bookingId);

    if (idx === -1) {
      return {
        success: false,
        booking: null,
        message: 'Booking not found.'
      };
    }

    const booking = bookings[idx];
    const newDateOnly = this._dateOnly(newDate);
    const combinedStartISO = this._combineDateAndTimeToISO(newDateOnly, newStartTime);
    const dateISO = this._normalizeDateToISO(newDateOnly);
    const now = this._nowISO();

    booking.date = dateISO;
    booking.startTime = combinedStartISO;
    booking.updatedAt = now;
    booking.lastRescheduledAt = now;
    booking.status = 'rescheduled';

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking,
      message: 'Booking rescheduled successfully.'
    };
  }

  // getFAQs(category)
  getFAQs(category) {
    const faqs = this._getFromStorage('faq_items');

    const categoriesMap = new Map();
    for (const faq of faqs) {
      if (!categoriesMap.has(faq.category)) {
        categoriesMap.set(faq.category, this._labelFromEnumValue(faq.category));
      }
    }

    const categories = Array.from(categoriesMap.entries()).map(([id, label]) => ({
      id,
      label
    }));

    const filteredFaqs = category
      ? faqs.filter((f) => f.category === category)
      : faqs;

    return {
      categories,
      faqs: filteredFaqs
    };
  }

  // submitContactMessage(subject, message, name, email, faqItemId)
  submitContactMessage(subject, message, name, email, faqItemId) {
    if (!subject || !message || !name || !email) {
      return {
        success: false,
        contactMessage: null,
        message: 'All fields except FAQ reference are required.'
      };
    }

    const contactMessages = this._getFromStorage('contact_messages');
    const faqItems = this._getFromStorage('faq_items');
    const faqItem = faqItemId
      ? faqItems.find((f) => f.id === faqItemId) || null
      : null;

    const record = {
      id: this._generateId('contact_message'),
      subject,
      message,
      name,
      email,
      faqItemId: faqItemId || null,
      status: 'received',
      createdAt: this._nowISO()
    };

    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);

    // Foreign key resolution: attach FAQ item for convenience
    const withFaq = Object.assign({}, record, { faqItem });

    return {
      success: true,
      contactMessage: withFaq,
      message: 'Your message has been received.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      companyName: 'Coastal Parasail & Boat Adventures',
      missionStatement:
        'To provide safe, memorable parasailing tours and boat rentals that showcase the best of our coastline.',
      experienceOverview:
        'Our team has operated parasailing tours, speedboat rentals, pontoon boats, and private sunset cruises for years. We focus on small-group experiences, friendly captains, and well-maintained equipment.',
      safetyPractices: [
        'US Coast Guard–inspected vessels and safety equipment',
        'Licensed and highly trained captains and crew',
        'Daily equipment inspections and maintenance logs',
        'Weather and sea-condition checks before every departure'
      ],
      certifications: [
        'USCG-licensed captains',
        'First-aid and CPR–trained crew',
        'Industry-standard parasailing equipment certifications'
      ],
      reasonsToChoose: [
        'Top-rated parasailing and boat rental experiences',
        'Flexible scheduling with morning, afternoon, and sunset options',
        'Hotel pickup available on select parasailing tours',
        'Easy online booking and instant confirmations'
      ],
      locationSummary:
        'Departures from our marina located minutes from major hotels and resorts along the coast.',
      helpAndFaqReference:
        'Have more questions about safety, age limits, or what to bring? Visit our Help & FAQ page for detailed answers.'
    };
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const faqItems = this._getFromStorage('faq_items');

    // Try to discover parasailing age limits from FAQ data
    let minAge = null;
    let maxAge = null;
    for (const faq of faqItems) {
      const isParasailingAgeFaq =
        faq.relatedActivityType === 'parasailing' &&
        faq.question &&
        faq.question.toLowerCase().indexOf('age limit') !== -1;
      if (isParasailingAgeFaq) {
        if (faq.minAge != null) minAge = faq.minAge;
        if (faq.maxAge != null) maxAge = faq.maxAge;
        break;
      }
    }

    const parasailingAgeSummary =
      minAge != null
        ? maxAge != null
          ? `Parasailing is generally available for guests aged ${minAge}–${maxAge} years. Please review the full Safety & Requirements FAQ for details.`
          : `Parasailing is generally available for guests aged ${minAge}+ years. Please review the full Safety & Requirements FAQ for details.`
        : 'Parasailing age limits are described in our Safety & Requirements FAQ. Please review those details before booking.';

    return {
      termsAndConditionsHtml:
        '<p>All bookings are subject to our general terms and conditions. Guests agree to follow crew instructions and safety guidelines at all times.</p>',
      cancellationPolicyHtml:
        '<p>Cancellations made within the allowed window may be eligible for a refund or credit. Weather-related cancellations are fully refundable or may be rescheduled.</p>',
      reschedulingPolicyHtml:
        '<p>Most bookings can be rescheduled once, subject to availability and advance notice requirements. Same-day changes may not be available.</p>',
      privacyPolicyHtml:
        '<p>We collect only the information necessary to process your booking and communicate with you. We do not sell your personal data to third parties.</p>',
      activityRequirementsSummary:
        'Age, weight, and health requirements vary between parasailing tours and boat rentals. Please review the Safety & Requirements FAQs and individual activity descriptions before booking.',
      parasailingAgeSummary,
      parasailingAgeLimits: {
        minAge: minAge != null ? minAge : null,
        maxAge: maxAge != null ? maxAge : null
      }
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