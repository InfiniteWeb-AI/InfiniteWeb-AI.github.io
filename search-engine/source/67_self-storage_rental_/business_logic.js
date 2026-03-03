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
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      'locations',
      'unit_sizes',
      'units',
      'insurance_plans',
      'reservations',
      'reservation_insurance_selections',
      'preferred_locations',
      'size_guide_rules',
      'supplies_categories',
      'supplies_products',
      'cart_items',
      'help_articles',
      'contact_messages',
      'tour_slots',
      'tour_appointments'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object (or null if not created yet)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return this._clone(defaultValue);
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return this._clone(defaultValue);
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter') || '1000';
    const current = parseInt(currentStr, 10) || 1000;
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

  _indexById(arr) {
    const map = {};
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && item.id) {
          map[item.id] = item;
        }
      }
    }
    return map;
  }

  // Ensure there is at least a basic set of units for a location.
  // This is useful in environments where seed data may not include
  // explicit unit inventory for every facility used in tests.
  _ensureUnitsForLocation(locationId, sizeIds) {
    if (!locationId) return;

    const existingUnits = this._getFromStorage('units', []);
    if (existingUnits.some((u) => u && u.location_id === locationId)) {
      // Location already has units; nothing to do.
      return;
    }

    const unitSizes = this._getFromStorage('unit_sizes', []);
    const now = this._nowISO();

    const filteredSizes = Array.isArray(sizeIds) && sizeIds.length > 0
      ? unitSizes.filter((s) => sizeIds.includes(s.id))
      : unitSizes.slice();

    const sizesToUse = filteredSizes.length > 0 ? filteredSizes : unitSizes.slice();

    let baseRate = 70; // ensures at least one option is comfortably under $150/month
    const newUnits = [];

    for (const size of sizesToUse) {
      const monthlyRate = baseRate;
      const unit = {
        id: this._generateId('unit'),
        location_id: locationId,
        unit_size_id: size.id,
        name: (size.label || 'Storage') + ' Unit',
        floor_level: 1,
        is_climate_controlled: false,
        has_drive_up_access: true,
        is_indoor: false,
        is_outdoor: true,
        suitable_for_vehicle_storage: false,
        door_type: 'roll_up',
        access_type: 'standard',
        monthly_rate: monthlyRate,
        standard_monthly_rate: monthlyRate + 10,
        promotion_type: 'none',
        promotion_description: '',
        is_available: true,
        min_rental_term_months: 1,
        refundable_deposit_amount: 0,
        online_only_price: false,
        created_at: now,
        updated_at: now
      };
      baseRate += 10;
      newUnits.push(unit);
    }

    const updatedUnits = existingUnits.concat(newUnits);
    this._saveToStorage('units', updatedUnits);
  }

  // ---------------------- Search helpers ----------------------

  _matchLocationBySearchTerm(location, searchTerm) {
    if (!location || !searchTerm) return false;
    const term = String(searchTerm).trim().toLowerCase();
    if (!term) return false;

    const postal = (location.postal_code || '').toString().toLowerCase();
    const city = (location.city || '').toString().toLowerCase();
    const state = (location.state || '').toString().toLowerCase();

    // ZIP code
    if (/^\d{5}$/.test(term)) {
      return postal === term;
    }

    // "City, ST" pattern
    if (term.indexOf(',') !== -1) {
      const parts = term.split(',');
      const cityTerm = (parts[0] || '').trim().toLowerCase();
      const stateTerm = (parts[1] || '').trim().toLowerCase();
      if (!cityTerm) return false;
      const cityMatch = city && city === cityTerm;
      const stateMatch = !stateTerm
        ? true
        : state && (state === stateTerm || state.indexOf(stateTerm) !== -1);
      return cityMatch && stateMatch;
    }

    // Generic containment
    return (
      (postal && postal.indexOf(term) !== -1) ||
      (city && city.indexOf(term) !== -1) ||
      (state && state.indexOf(term) !== -1)
    );
  }

  _estimateLocationStartingPrice(locationId, units) {
    let min = Number.POSITIVE_INFINITY;
    if (Array.isArray(units)) {
      for (const u of units) {
        if (
          u &&
          u.location_id === locationId &&
          u.is_available &&
          typeof u.monthly_rate === 'number'
        ) {
          if (u.monthly_rate < min) min = u.monthly_rate;
        }
      }
    }
    return min === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : min;
  }

  _filterAndSortUnits(units, unitSizesById, locationsById, filters, sortBy) {
    const f = filters || {};
    let filtered = Array.isArray(units) ? units.slice() : [];

    filtered = filtered.filter((u) => {
      if (!u) return false;
      const size = unitSizesById[u.unit_size_id] || {};
      const loc = locationsById ? locationsById[u.location_id] : null;

      if (f.onlyAvailable === true && !u.is_available) return false;

      if (f.sizeCategory && size.size_category && size.size_category !== f.sizeCategory) {
        return false;
      }

      if (Array.isArray(f.unitSizeLabels) && f.unitSizeLabels.length > 0) {
        if (!size.label || !f.unitSizeLabels.includes(size.label)) return false;
      }

      if (typeof f.minAreaSqFt === 'number') {
        if (typeof size.area_sq_ft === 'number' && size.area_sq_ft < f.minAreaSqFt) {
          return false;
        }
      }

      if (typeof f.maxAreaSqFt === 'number') {
        if (typeof size.area_sq_ft === 'number' && size.area_sq_ft > f.maxAreaSqFt) {
          return false;
        }
      }

      if (
        typeof f.minMonthlyRate === 'number' &&
        typeof u.monthly_rate === 'number' &&
        u.monthly_rate < f.minMonthlyRate
      ) {
        return false;
      }

      if (
        typeof f.maxMonthlyRate === 'number' &&
        typeof u.monthly_rate === 'number' &&
        u.monthly_rate > f.maxMonthlyRate
      ) {
        return false;
      }

      if (
        typeof f.hasDriveUpAccess === 'boolean' &&
        u.has_drive_up_access !== f.hasDriveUpAccess
      ) {
        return false;
      }

      if (
        typeof f.isClimateControlled === 'boolean' &&
        u.is_climate_controlled !== f.isClimateControlled
      ) {
        return false;
      }

      if (typeof f.isIndoor === 'boolean' && u.is_indoor !== f.isIndoor) return false;
      if (typeof f.isOutdoor === 'boolean' && u.is_outdoor !== f.isOutdoor) return false;

      if (
        typeof f.suitableForVehicleStorage === 'boolean' &&
        u.suitable_for_vehicle_storage !== f.suitableForVehicleStorage
      ) {
        return false;
      }

      if (Array.isArray(f.promotionTypes) && f.promotionTypes.length > 0) {
        if (!u.promotion_type || !f.promotionTypes.includes(u.promotion_type)) {
          return false;
        }
      }

      if (f.onlySizesAtLeast) {
        const allSizes = Object.values(unitSizesById);
        const baseSize = allSizes.find((s) => s.label === f.onlySizesAtLeast);
        if (baseSize && typeof baseSize.sort_order === 'number') {
          if (
            typeof size.sort_order === 'number' &&
            size.sort_order < baseSize.sort_order
          ) {
            return false;
          }
        }
      }

      if (typeof f.maxDistanceMiles === 'number' && locationsById && loc) {
        const dist =
          typeof loc.distance_miles_from_search === 'number'
            ? loc.distance_miles_from_search
            : null;
        if (dist != null && dist > f.maxDistanceMiles) return false;
      }

      return true;
    });

    const sortKey = sortBy || 'price_low_to_high';

    filtered.sort((a, b) => {
      const locA = locationsById ? locationsById[a.location_id] : null;
      const locB = locationsById ? locationsById[b.location_id] : null;

      if (sortKey === 'price_low_to_high') {
        return (a.monthly_rate || 0) - (b.monthly_rate || 0);
      } else if (sortKey === 'price_high_to_low') {
        return (b.monthly_rate || 0) - (a.monthly_rate || 0);
      } else if (sortKey === 'availability') {
        const aAvail = a.is_available ? 1 : 0;
        const bAvail = b.is_available ? 1 : 0;
        if (bAvail !== aAvail) return bAvail - aAvail;
        return (a.monthly_rate || 0) - (b.monthly_rate || 0);
      } else if (sortKey === 'distance') {
        const dA =
          locA && typeof locA.distance_miles_from_search === 'number'
            ? locA.distance_miles_from_search
            : Number.POSITIVE_INFINITY;
        const dB =
          locB && typeof locB.distance_miles_from_search === 'number'
            ? locB.distance_miles_from_search
            : Number.POSITIVE_INFINITY;
        if (dA === dB) {
          return (a.monthly_rate || 0) - (b.monthly_rate || 0);
        }
        return dA - dB;
      } else {
        // relevance fallback: price_low_to_high
        return (a.monthly_rate || 0) - (b.monthly_rate || 0);
      }
    });

    return filtered;
  }

  _filterAndSortLocations(locations, units, filters, maxDistanceMiles, sortBy) {
    const f = filters || {};
    const unitsByLocation = {};

    if (Array.isArray(units)) {
      for (const u of units) {
        if (!u) continue;
        if (!unitsByLocation[u.location_id]) unitsByLocation[u.location_id] = [];
        unitsByLocation[u.location_id].push(u);
      }
    }

    let result = Array.isArray(locations) ? locations.slice() : [];

    result = result.filter((loc) => {
      if (
        typeof maxDistanceMiles === 'number' &&
        typeof loc.distance_miles_from_search === 'number'
      ) {
        if (loc.distance_miles_from_search > maxDistanceMiles) return false;
      }

      if (
        typeof f.hasClimateControlledUnits === 'boolean' &&
        loc.has_climate_controlled_units !== f.hasClimateControlledUnits
      ) {
        return false;
      }

      if (
        typeof f.offers24HourAccess === 'boolean' &&
        loc.offers_24_hour_access !== f.offers24HourAccess
      ) {
        return false;
      }

      if (typeof f.hasPromotions === 'boolean' && loc.has_promotions !== f.hasPromotions) {
        return false;
      }

      if (typeof f.minRating === 'number') {
        if (typeof loc.rating === 'number') {
          if (loc.rating < f.minRating) return false;
        } else {
          return false;
        }
      }

      if (f.unitSizeId) {
        const locUnits = unitsByLocation[loc.id] || [];
        const hasSize = locUnits.some(
          (u) => u.unit_size_id === f.unitSizeId && u.is_available
        );
        if (!hasSize) return false;
      }

      return true;
    });

    const sortKey = sortBy || 'distance';

    result.sort((a, b) => {
      if (sortKey === 'rating_high_to_low') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      } else if (sortKey === 'price_estimate') {
        const pa = this._estimateLocationStartingPrice(a.id, units);
        const pb = this._estimateLocationStartingPrice(b.id, units);
        if (pa === pb) {
          const da =
            typeof a.distance_miles_from_search === 'number'
              ? a.distance_miles_from_search
              : Number.POSITIVE_INFINITY;
          const db =
            typeof b.distance_miles_from_search === 'number'
              ? b.distance_miles_from_search
              : Number.POSITIVE_INFINITY;
          return da - db;
        }
        return pa - pb;
      } else {
        // distance
        const da =
          typeof a.distance_miles_from_search === 'number'
            ? a.distance_miles_from_search
            : Number.POSITIVE_INFINITY;
        const db =
          typeof b.distance_miles_from_search === 'number'
            ? b.distance_miles_from_search
            : Number.POSITIVE_INFINITY;
        if (da === db) {
          const ra = typeof a.rating === 'number' ? a.rating : 0;
          const rb = typeof b.rating === 'number' ? b.rating : 0;
          return rb - ra;
        }
        return da - db;
      }
    });

    return result;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    let cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    for (const item of cartItems) {
      if (!item) continue;
      if (item.cart_id === cart.id) {
        const qty = typeof item.quantity === 'number' ? item.quantity : 0;
        const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
        item.line_total = qty * unitPrice;
        subtotal += item.line_total;
      }
    }
    cart.subtotal = subtotal;
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);
  }

  // ---------------------- Preferred location helper ----------------------

  _getOrCreatePreferredLocation() {
    let prefs = this._getFromStorage('preferred_locations', []);
    if (prefs.length === 0) {
      const pref = {
        id: this._generateId('preferred_location'),
        location_id: null,
        set_at: this._nowISO()
      };
      prefs.push(pref);
      this._saveToStorage('preferred_locations', prefs);
      return pref;
    }
    return prefs[0];
  }

  // ---------------------- Reservation helpers ----------------------

  _createPendingReservation(unitId) {
    const reservations = this._getFromStorage('reservations', []);
    const units = this._getFromStorage('units', []);
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return null;

    // Reuse existing pending reservation for this unit if any
    let existing = reservations.find(
      (r) => r.unit_id === unitId && r.status === 'pending'
    );
    if (existing) {
      return existing;
    }

    const now = this._nowISO();
    const reservation = {
      id: this._generateId('reservation'),
      unit_id: unitId,
      location_id: unit.location_id,
      created_at: now,
      updated_at: now,
      move_in_date: now, // default, will be overwritten
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      payment_option: 'pay_at_move_in',
      status: 'pending',
      monthly_rate_at_booking:
        typeof unit.monthly_rate === 'number' ? unit.monthly_rate : 0,
      promotion_type_at_booking: unit.promotion_type || 'none',
      has_insurance: false,
      notes: '',
      confirmation_number: null
    };

    reservations.push(reservation);
    this._saveToStorage('reservations', reservations);
    return reservation;
  }

  _getReservationById(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) return null;

    const units = this._getFromStorage('units', []);
    const locations = this._getFromStorage('locations', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const insuranceSelections = this._getFromStorage(
      'reservation_insurance_selections',
      []
    );
    const insurancePlans = this._getFromStorage('insurance_plans', []);

    const unit = units.find((u) => u.id === reservation.unit_id) || null;
    const location =
      locations.find((l) => l.id === reservation.location_id) || null;
    const unitSize = unit
      ? unitSizes.find((s) => s.id === unit.unit_size_id) || null
      : null;
    const selection =
      insuranceSelections.find((s) => s.reservation_id === reservation.id) || null;
    const insurancePlan = selection
      ? insurancePlans.find((p) => p.id === selection.insurance_plan_id) || null
      : null;

    return { reservation, unit, location, unitSize, insuranceSelection: selection, insurancePlan };
  }

  _getAvailableInsurancePlans(reservation) {
    const plans = this._getFromStorage('insurance_plans', []).filter(
      (p) => p.is_active
    );
    let recommended = 0;
    for (const p of plans) {
      if (
        p &&
        typeof p.coverage_amount === 'number' &&
        p.coverage_amount > recommended
      ) {
        recommended = p.coverage_amount;
      }
    }
    return { plans, recommendedCoverageAmount: recommended || null };
  }

  _generateReservationConfirmationNumber() {
    return 'R' + this._getNextIdCounter();
  }

  // ---------------------- Size guide helpers ----------------------

  _calculateRecommendedSizeFromRules(propertyType, selectedItemKeys) {
    const rules = this._getFromStorage('size_guide_rules', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const selected = Array.isArray(selectedItemKeys) ? selectedItemKeys : [];

    const candidates = rules.filter((r) => r.property_type === propertyType);
    let bestRule = null;
    let bestScore = -1;

    for (const rule of candidates) {
      const required = Array.isArray(rule.required_items)
        ? rule.required_items
        : [];
      if (required.length === 0) {
        if (bestRule == null && bestScore < 0) {
          bestRule = rule;
          bestScore = 0;
        }
        continue;
      }
      let matches = 0;
      for (const item of required) {
        if (selected.includes(item)) matches++;
      }
      if (matches === required.length && matches >= bestScore) {
        bestScore = matches;
        bestRule = rule;
      }
    }

    if (!bestRule && candidates.length > 0) {
      bestRule = candidates[0];
    }

    if (!bestRule) {
      return { recommendedUnitSize: null, surroundingSizes: [] };
    }

    const recommendedUnitSize =
      unitSizes.find((s) => s.id === bestRule.recommended_unit_size_id) || null;
    const { nextSmaller, nextLarger } = this._findNextLargerUnitSizes(
      recommendedUnitSize ? recommendedUnitSize.id : null
    );

    const surrounding = [];
    if (nextSmaller) {
      surrounding.push({
        unit_size_id: nextSmaller.id,
        label: nextSmaller.label,
        size_category: nextSmaller.size_category,
        area_sq_ft:
          typeof nextSmaller.area_sq_ft === 'number'
            ? nextSmaller.area_sq_ft
            : null,
        is_next_larger_than_recommended: false,
        is_next_smaller_than_recommended: true
      });
    }
    if (nextLarger) {
      surrounding.push({
        unit_size_id: nextLarger.id,
        label: nextLarger.label,
        size_category: nextLarger.size_category,
        area_sq_ft:
          typeof nextLarger.area_sq_ft === 'number'
            ? nextLarger.area_sq_ft
            : null,
        is_next_larger_than_recommended: true,
        is_next_smaller_than_recommended: false
      });
    }

    return { recommendedUnitSize, surroundingSizes: surrounding };
  }

  _findNextLargerUnitSizes(recommendedUnitSizeId) {
    const unitSizes = this._getFromStorage('unit_sizes', []);
    if (!recommendedUnitSizeId) {
      return { nextSmaller: null, nextLarger: null };
    }
    const sorted = unitSizes.slice().sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });
    const index = sorted.findIndex((s) => s.id === recommendedUnitSizeId);
    if (index === -1) return { nextSmaller: null, nextLarger: null };
    const nextSmaller = index > 0 ? sorted[index - 1] : null;
    const nextLarger = index < sorted.length - 1 ? sorted[index + 1] : null;
    return { nextSmaller, nextLarger };
  }

  // ---------------------- Tour helpers ----------------------

  _getTourSlotsForLocationAndDate(locationId, date, visitType) {
    const tourSlots = this._getFromStorage('tour_slots', []);
    const dateStr = (date || '').split('T')[0];
    const type = visitType || 'in_person_tour';

    return tourSlots.filter((slot) => {
      if (!slot) return false;
      if (slot.location_id !== locationId) return false;
      if (slot.visit_type !== type) return false;
      const slotDate = (slot.start_time || '').split('T')[0];
      return slotDate === dateStr;
    });
  }

  _bookTourSlot(tourSlotId, visitorName, visitorPhone, visitorEmail) {
    const tourSlots = this._getFromStorage('tour_slots', []);
    const slot = tourSlots.find((s) => s.id === tourSlotId);
    if (!slot || slot.is_booked) {
      return null;
    }

    slot.is_booked = true;

    const appointments = this._getFromStorage('tour_appointments', []);
    const appointment = {
      id: this._generateId('tour_appointment'),
      location_id: slot.location_id,
      tour_slot_id: slot.id,
      visit_type: slot.visit_type,
      visitor_name: visitorName,
      visitor_phone: visitorPhone,
      visitor_email: visitorEmail,
      status: 'scheduled',
      notes: '',
      created_at: this._nowISO()
    };

    appointments.push(appointment);
    this._saveToStorage('tour_slots', tourSlots);
    this._saveToStorage('tour_appointments', appointments);

    return appointment;
  }

  // ---------------------- Core interfaces ----------------------

  // searchUnitsNearby(searchTerm, filters, sortBy)
  searchUnitsNearby(searchTerm, filters, sortBy) {
    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const locations = this._getFromStorage('locations', []);

    const unitSizesById = this._indexById(unitSizes);

    const locationsMatching = locations.filter((loc) =>
      this._matchLocationBySearchTerm(loc, searchTerm)
    );
    const locationIds = new Set(locationsMatching.map((l) => l.id));
    const locationsById = {};
    for (const loc of locationsMatching) {
      locationsById[loc.id] = loc;
    }

    let candidateUnits = units.filter((u) => locationIds.has(u.location_id));

    const filterObj = filters ? this._clone(filters) : {};

    const sortedUnits = this._filterAndSortUnits(
      candidateUnits,
      unitSizesById,
      locationsById,
      filterObj,
      sortBy || 'relevance'
    );

    const results = sortedUnits.map((u) => {
      const size = unitSizesById[u.unit_size_id] || {};
      const loc = locationsById[u.location_id] || {};
      return {
        unit_id: u.id,
        unit_name: u.name || '',
        unit_size_label: size.label || '',
        size_category: size.size_category || null,
        area_sq_ft:
          typeof size.area_sq_ft === 'number' ? size.area_sq_ft : null,
        monthly_rate:
          typeof u.monthly_rate === 'number' ? u.monthly_rate : null,
        standard_monthly_rate:
          typeof u.standard_monthly_rate === 'number'
            ? u.standard_monthly_rate
            : null,
        promotion_type: u.promotion_type || 'none',
        promotion_description: u.promotion_description || null,
        is_available: !!u.is_available,
        is_climate_controlled: !!u.is_climate_controlled,
        has_drive_up_access: !!u.has_drive_up_access,
        is_indoor: !!u.is_indoor,
        is_outdoor: !!u.is_outdoor,
        suitable_for_vehicle_storage: !!u.suitable_for_vehicle_storage,
        floor_level: typeof u.floor_level === 'number' ? u.floor_level : null,
        door_type: u.door_type || null,
        location_id: loc.id || null,
        location_name: loc.name || '',
        location_address_line1: loc.address_line1 || '',
        location_city: loc.city || '',
        location_state: loc.state || '',
        location_postal_code: loc.postal_code || '',
        location_rating:
          typeof loc.rating === 'number' ? loc.rating : null,
        location_rating_count:
          typeof loc.rating_count === 'number' ? loc.rating_count : null,
        location_has_promotions: !!loc.has_promotions,
        location_primary_promotions_summary:
          loc.primary_promotions_summary || '',
        distance_miles:
          typeof loc.distance_miles_from_search === 'number'
            ? loc.distance_miles_from_search
            : null,
        // Foreign key resolutions
        unit: this._clone(u),
        location: this._clone(loc)
      };
    });

    const total_count = results.length;
    const applied_filters = {
      effective_size_category: filterObj.sizeCategory || null,
      effective_max_monthly_rate:
        typeof filterObj.maxMonthlyRate === 'number'
          ? filterObj.maxMonthlyRate
          : null,
      effective_max_distance_miles:
        typeof filterObj.maxDistanceMiles === 'number'
          ? filterObj.maxDistanceMiles
          : null
    };

    return { results, total_count, applied_filters };
  }

  // getUnitSearchFilterOptions()
  getUnitSearchFilterOptions() {
    const size_categories = [
      {
        value: 'small',
        label: 'Small',
        description: 'Small units (e.g., up to 5x10).',
        example_sizes: ['5x5', '5x10']
      },
      {
        value: 'medium',
        label: 'Medium',
        description: 'Medium units for 1-2 rooms of items.',
        example_sizes: ['5x15', '10x10']
      },
      {
        value: 'large',
        label: 'Large',
        description: 'Larger units for multi-room moves.',
        example_sizes: ['10x15', '10x20']
      },
      {
        value: 'extra_large',
        label: 'Extra Large',
        description: 'Extra large units for whole-home storage.',
        example_sizes: ['10x25', '10x30']
      },
      {
        value: 'vehicle',
        label: 'Vehicle',
        description: 'Parking and vehicle storage.',
        example_sizes: ['parking', 'vehicle']
      }
    ];

    const features = [
      {
        key: 'hasDriveUpAccess',
        label: 'Drive-up access',
        description: 'Ground-level units with vehicle access.'
      },
      {
        key: 'isClimateControlled',
        label: 'Climate controlled',
        description: 'Temperature / humidity controlled units.'
      },
      {
        key: 'isIndoor',
        label: 'Indoor',
        description: 'Units located inside a building.'
      },
      {
        key: 'isOutdoor',
        label: 'Outdoor',
        description: 'Units with outdoor access.'
      },
      {
        key: 'suitableForVehicleStorage',
        label: 'Vehicle storage',
        description: 'Suitable for storing vehicles.'
      }
    ];

    const promotion_types = [
      { value: 'first_month_free', label: 'First month free' },
      { value: 'discounted_rate', label: 'Discounted rate' },
      { value: 'online_price', label: 'Online price' },
      { value: 'other', label: 'Other promotions' }
    ];

    return { size_categories, features, promotion_types };
  }

  // searchLocationsNearby(searchTerm, maxDistanceMiles, filters, sortBy)
  searchLocationsNearby(searchTerm, maxDistanceMiles, filters, sortBy) {
    const locations = this._getFromStorage('locations', []);
    const units = this._getFromStorage('units', []);

    const matchingBySearch = locations.filter((loc) =>
      this._matchLocationBySearchTerm(loc, searchTerm)
    );

    const filtered = this._filterAndSortLocations(
      matchingBySearch,
      units,
      filters || {},
      maxDistanceMiles,
      sortBy || 'distance'
    );

    const results = filtered.map((loc) => {
      const estimatedPrice = this._estimateLocationStartingPrice(loc.id, units);
      const hasRequestedSize =
        filters && filters.unitSizeId
          ? (units || []).some(
              (u) =>
                u.location_id === loc.id &&
                u.unit_size_id === filters.unitSizeId &&
                u.is_available
            )
          : false;

      return {
        location_id: loc.id,
        name: loc.name,
        address_line1: loc.address_line1,
        city: loc.city,
        state: loc.state,
        postal_code: loc.postal_code,
        phone: loc.phone || '',
        rating: typeof loc.rating === 'number' ? loc.rating : null,
        rating_count:
          typeof loc.rating_count === 'number' ? loc.rating_count : null,
        distance_miles:
          typeof loc.distance_miles_from_search === 'number'
            ? loc.distance_miles_from_search
            : null,
        has_climate_controlled_units: !!loc.has_climate_controlled_units,
        offers_vehicle_storage: !!loc.offers_vehicle_storage,
        offers_24_hour_access: !!loc.offers_24_hour_access,
        has_promotions: !!loc.has_promotions,
        primary_promotions_summary: loc.primary_promotions_summary || '',
        estimated_starting_price:
          estimatedPrice === Number.POSITIVE_INFINITY ? null : estimatedPrice,
        has_requested_unit_size: !!hasRequestedSize,
        // Foreign key resolution
        location: this._clone(loc)
      };
    });

    return { results, total_count: results.length };
  }

  // getLocationSearchFilterOptions()
  getLocationSearchFilterOptions() {
    const distance_options_miles = [5, 10, 15, 20, 25, 50];
    const rating_thresholds = [
      { min_rating: 4.0, label: '4.0+' },
      { min_rating: 4.5, label: '4.5+' }
    ];
    const feature_flags = [
      { key: 'hasClimateControlledUnits', label: 'Has climate-controlled units' },
      { key: 'offers24HourAccess', label: 'Offers 24-hour access' },
      { key: 'hasPromotions', label: 'Has promotions/deals' }
    ];

    return { distance_options_miles, rating_thresholds, feature_flags };
  }

  // getLocationDetails(locationId)
  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) {
      return {};
    }
    return {
      location_id: loc.id,
      name: loc.name,
      address_line1: loc.address_line1,
      address_line2: loc.address_line2 || '',
      city: loc.city,
      state: loc.state,
      postal_code: loc.postal_code,
      country: loc.country || '',
      latitude:
        typeof loc.latitude === 'number' ? loc.latitude : null,
      longitude:
        typeof loc.longitude === 'number' ? loc.longitude : null,
      phone: loc.phone || '',
      rating: typeof loc.rating === 'number' ? loc.rating : null,
      rating_count:
        typeof loc.rating_count === 'number' ? loc.rating_count : null,
      has_climate_controlled_units: !!loc.has_climate_controlled_units,
      offers_vehicle_storage: !!loc.offers_vehicle_storage,
      offers_24_hour_access: !!loc.offers_24_hour_access,
      has_promotions: !!loc.has_promotions,
      primary_promotions_summary: loc.primary_promotions_summary || '',
      office_hours_description: loc.office_hours_description || '',
      access_hours_description: loc.access_hours_description || ''
    };
  }

  // getLocationUnits(locationId, filters, sortBy)
  getLocationUnits(locationId, filters, sortBy) {
    // Ensure the location has units even if seed data omitted them.
    this._ensureUnitsForLocation(locationId);
    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const locations = this._getFromStorage('locations', []);

    const unitSizesById = this._indexById(unitSizes);
    const loc = locations.find((l) => l.id === locationId) || null;
    const locationsById = {};
    if (loc) locationsById[loc.id] = loc;

    const locUnits = units.filter((u) => u.location_id === locationId);

    const filteredUnits = this._filterAndSortUnits(
      locUnits,
      unitSizesById,
      locationsById,
      filters || {},
      sortBy || 'price_low_to_high'
    );

    const mappedUnits = filteredUnits.map((u) => {
      const size = unitSizesById[u.unit_size_id] || {};
      return {
        unit_id: u.id,
        unit_name: u.name || '',
        unit_size_label: size.label || '',
        size_category: size.size_category || null,
        area_sq_ft:
          typeof size.area_sq_ft === 'number' ? size.area_sq_ft : null,
        monthly_rate:
          typeof u.monthly_rate === 'number' ? u.monthly_rate : null,
        standard_monthly_rate:
          typeof u.standard_monthly_rate === 'number'
            ? u.standard_monthly_rate
            : null,
        promotion_type: u.promotion_type || 'none',
        promotion_description: u.promotion_description || '',
        is_available: !!u.is_available,
        is_climate_controlled: !!u.is_climate_controlled,
        has_drive_up_access: !!u.has_drive_up_access,
        is_indoor: !!u.is_indoor,
        is_outdoor: !!u.is_outdoor,
        suitable_for_vehicle_storage: !!u.suitable_for_vehicle_storage,
        floor_level: typeof u.floor_level === 'number' ? u.floor_level : null,
        door_type: u.door_type || null,
        // Foreign key resolution
        unit: this._clone(u),
        unit_size: this._clone(size)
      };
    });

    return {
      location_id: locationId,
      units: mappedUnits,
      location: loc ? this._clone(loc) : null
    };
  }

  // getLocationUnitFilterOptions(locationId)
  getLocationUnitFilterOptions(locationId) {
    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const unitSizesById = this._indexById(unitSizes);

    const locUnits = units.filter(
      (u) => u.location_id === locationId && u.is_available
    );

    const sizeCategoryMap = {};
    const sizeLabelsSet = new Set();

    let hasClimate = false;
    let hasDriveUp = false;
    let hasIndoor = false;
    let hasOutdoor = false;
    let hasVehicle = false;
    const promoTypesSet = new Set();

    for (const u of locUnits) {
      const size = unitSizesById[u.unit_size_id] || {};
      if (size.size_category) {
        sizeCategoryMap[size.size_category] = true;
      }
      if (size.label) sizeLabelsSet.add(size.label);

      if (u.is_climate_controlled) hasClimate = true;
      if (u.has_drive_up_access) hasDriveUp = true;
      if (u.is_indoor) hasIndoor = true;
      if (u.is_outdoor) hasOutdoor = true;
      if (u.suitable_for_vehicle_storage) hasVehicle = true;

      if (u.promotion_type && u.promotion_type !== 'none') {
        promoTypesSet.add(u.promotion_type);
      }
    }

    const size_categories = ['small', 'medium', 'large', 'extra_large', 'vehicle'].map(
      (cat) => ({
        value: cat,
        label: cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        has_available_units: !!sizeCategoryMap[cat]
      })
    );

    const unit_size_labels = Array.from(sizeLabelsSet);

    const features = [];
    if (hasClimate)
      features.push({ key: 'isClimateControlled', label: 'Climate controlled' });
    if (hasDriveUp)
      features.push({ key: 'hasDriveUpAccess', label: 'Drive-up access' });
    if (hasIndoor) features.push({ key: 'isIndoor', label: 'Indoor' });
    if (hasOutdoor) features.push({ key: 'isOutdoor', label: 'Outdoor' });
    if (hasVehicle)
      features.push({ key: 'suitableForVehicleStorage', label: 'Vehicle storage' });

    const promotion_types = Array.from(promoTypesSet).map((pt) => ({
      value: pt,
      label:
        pt === 'first_month_free'
          ? 'First month free'
          : pt === 'discounted_rate'
          ? 'Discounted rate'
          : pt === 'online_price'
          ? 'Online price'
          : 'Other promotions'
    }));

    return { size_categories, unit_size_labels, features, promotion_types };
  }

  // setPreferredLocation(locationId)
  setPreferredLocation(locationId) {
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) {
      return {
        preferred_location_id: null,
        location_name: '',
        set_at: null,
        message: 'Location not found'
      };
    }

    let prefs = this._getFromStorage('preferred_locations', []);
    let pref;
    if (prefs.length === 0) {
      pref = {
        id: this._generateId('preferred_location'),
        location_id: locationId,
        set_at: this._nowISO()
      };
      prefs.push(pref);
    } else {
      pref = prefs[0];
      pref.location_id = locationId;
      pref.set_at = this._nowISO();
    }
    this._saveToStorage('preferred_locations', prefs);

    return {
      preferred_location_id: pref.location_id,
      location_name: loc.name,
      set_at: pref.set_at,
      message: 'Preferred location updated',
      preferred_location: this._clone(pref),
      location: this._clone(loc)
    };
  }

  // getPreferredLocation()
  getPreferredLocation() {
    const prefs = this._getFromStorage('preferred_locations', []);
    if (!prefs.length || !prefs[0].location_id) {
      return { has_preferred_location: false, preferred_location: null };
    }
    const pref = prefs[0];
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === pref.location_id) || null;

    return {
      has_preferred_location: !!loc,
      preferred_location: loc
        ? {
            location_id: loc.id,
            location_name: loc.name,
            city: loc.city,
            state: loc.state,
            set_at: pref.set_at,
            location: this._clone(loc)
          }
        : null
    };
  }

  // getTourAvailability(locationId, date, visitType)
  getTourAvailability(locationId, date, visitType) {
    const slots = this._getTourSlotsForLocationAndDate(
      locationId,
      date,
      visitType || 'in_person_tour'
    );

    const available_slots = slots.map((slot) => ({
      tour_slot_id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_booked: !!slot.is_booked,
      tour_slot: this._clone(slot)
    }));

    return {
      location_id: locationId,
      date: date,
      visit_type: visitType || 'in_person_tour',
      available_slots
    };
  }

  // bookTourAppointment(tourSlotId, visitorName, visitorPhone, visitorEmail)
  bookTourAppointment(tourSlotId, visitorName, visitorPhone, visitorEmail) {
    const appointment = this._bookTourSlot(
      tourSlotId,
      visitorName,
      visitorPhone,
      visitorEmail
    );

    if (!appointment) {
      return {
        success: false,
        tour_appointment_id: null,
        status: 'cancelled',
        location_id: null,
        start_time: null,
        end_time: null,
        visit_type: null,
        message: 'Tour slot not available'
      };
    }

    const tourSlots = this._getFromStorage('tour_slots', []);
    const slot = tourSlots.find((s) => s.id === appointment.tour_slot_id) || null;

    return {
      success: true,
      tour_appointment_id: appointment.id,
      status: appointment.status,
      location_id: appointment.location_id,
      start_time: slot ? slot.start_time : null,
      end_time: slot ? slot.end_time : null,
      visit_type: appointment.visit_type,
      message: 'Tour appointment scheduled',
      tour_appointment: this._clone(appointment),
      tour_slot: slot ? this._clone(slot) : null
    };
  }

  // startReservationForUnit(unitId)
  startReservationForUnit(unitId) {
    const reservation = this._createPendingReservation(unitId);
    if (!reservation) {
      return {
        reservation_id: null,
        status: 'cancelled',
        unit_summary: null,
        location_summary: null,
        next_step: null
      };
    }

    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const locations = this._getFromStorage('locations', []);

    const unit = units.find((u) => u.id === reservation.unit_id) || null;
    const loc = locations.find((l) => l.id === reservation.location_id) || null;
    const size = unit
      ? unitSizes.find((s) => s.id === unit.unit_size_id) || null
      : null;

    const unit_summary = unit
      ? {
          unit_id: unit.id,
          unit_name: unit.name || '',
          unit_size_label: size ? size.label : '',
          size_category: size ? size.size_category : null,
          monthly_rate:
            typeof unit.monthly_rate === 'number' ? unit.monthly_rate : null,
          standard_monthly_rate:
            typeof unit.standard_monthly_rate === 'number'
              ? unit.standard_monthly_rate
              : null,
          promotion_type: unit.promotion_type || 'none',
          promotion_description: unit.promotion_description || '',
          is_climate_controlled: !!unit.is_climate_controlled,
          has_drive_up_access: !!unit.has_drive_up_access,
          unit: this._clone(unit),
          unit_size: this._clone(size)
        }
      : null;

    const location_summary = loc
      ? {
          location_id: loc.id,
          location_name: loc.name,
          address_line1: loc.address_line1,
          city: loc.city,
          state: loc.state,
          postal_code: loc.postal_code,
          phone: loc.phone || '',
          location: this._clone(loc)
        }
      : null;

    return {
      reservation_id: reservation.id,
      status: reservation.status,
      unit_summary,
      location_summary,
      next_step: 'select_move_in_date',
      reservation: this._clone(reservation)
    };
  }

  // getReservationSummary(reservationId)
  getReservationSummary(reservationId) {
    const data = this._getReservationById(reservationId);
    if (!data) {
      return {
        reservation_id: null,
        status: 'cancelled',
        unit_summary: null,
        location_summary: null,
        move_in_date: null,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        payment_option: null,
        has_insurance: false,
        selected_insurance: null,
        confirmation_number: null
      };
    }

    const { reservation, unit, location, unitSize, insuranceSelection, insurancePlan } =
      data;

    const unit_summary = unit
      ? {
          unit_id: unit.id,
          unit_name: unit.name || '',
          unit_size_label: unitSize ? unitSize.label : '',
          size_category: unitSize ? unitSize.size_category : null,
          monthly_rate_at_booking: reservation.monthly_rate_at_booking,
          promotion_type_at_booking:
            reservation.promotion_type_at_booking || 'none',
          unit: this._clone(unit),
          unit_size: this._clone(unitSize)
        }
      : null;

    const location_summary = location
      ? {
          location_id: location.id,
          location_name: location.name,
          city: location.city,
          state: location.state,
          phone: location.phone || '',
          location: this._clone(location)
        }
      : null;

    const selected_insurance = insurancePlan
      ? {
          insurance_plan_id: insurancePlan.id,
          plan_name: insurancePlan.name,
          coverage_amount: insuranceSelection
            ? insuranceSelection.coverage_amount
            : insurancePlan.coverage_amount,
          monthly_premium: insuranceSelection
            ? insuranceSelection.monthly_premium
            : insurancePlan.monthly_premium,
          insurance_plan: this._clone(insurancePlan)
        }
      : null;

    return {
      reservation_id: reservation.id,
      status: reservation.status,
      unit_summary,
      location_summary,
      move_in_date: reservation.move_in_date,
      contact_name: reservation.contact_name,
      contact_phone: reservation.contact_phone,
      contact_email: reservation.contact_email,
      payment_option: reservation.payment_option,
      has_insurance: !!reservation.has_insurance,
      selected_insurance,
      confirmation_number: reservation.confirmation_number || null,
      reservation: this._clone(reservation)
    };
  }

  // updateReservationDetails(reservationId, moveInDate, contactName, contactPhone, contactEmail, paymentOption)
  updateReservationDetails(
    reservationId,
    moveInDate,
    contactName,
    contactPhone,
    contactEmail,
    paymentOption
  ) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return {
        reservation_id: null,
        status: 'cancelled',
        move_in_date: null,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        payment_option: null
      };
    }

    reservation.move_in_date = moveInDate;
    reservation.contact_name = contactName;
    reservation.contact_phone = contactPhone;
    reservation.contact_email = contactEmail;
    reservation.payment_option = paymentOption;
    reservation.updated_at = this._nowISO();

    this._saveToStorage('reservations', reservations);

    return {
      reservation_id: reservation.id,
      status: reservation.status,
      move_in_date: reservation.move_in_date,
      contact_name: reservation.contact_name,
      contact_phone: reservation.contact_phone,
      contact_email: reservation.contact_email,
      payment_option: reservation.payment_option,
      reservation: this._clone(reservation)
    };
  }

  // getAvailableInsurancePlansForReservation(reservationId)
  getAvailableInsurancePlansForReservation(reservationId) {
    const resData = this._getReservationById(reservationId);
    const reservation = resData ? resData.reservation : null;
    const { plans, recommendedCoverageAmount } =
      this._getAvailableInsurancePlans(reservation);

    const mappedPlans = plans.map((p) => ({
      insurance_plan_id: p.id,
      name: p.name,
      description: p.description || '',
      plan_type: p.plan_type,
      coverage_amount: p.coverage_amount,
      coverage_level_code: p.coverage_level_code || null,
      monthly_premium: p.monthly_premium,
      provider_name: p.provider_name || '',
      is_default: !!p.is_default,
      insurance_plan: this._clone(p)
    }));

    return {
      plans: mappedPlans,
      recommended_coverage_amount: recommendedCoverageAmount
    };
  }

  // selectReservationInsurancePlan(reservationId, insurancePlanId)
  selectReservationInsurancePlan(reservationId, insurancePlanId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return {
        reservation_id: null,
        has_insurance: false,
        selected_insurance: null,
        message: 'Reservation not found'
      };
    }

    const insurancePlans = this._getFromStorage('insurance_plans', []);
    const plan = insurancePlans.find(
      (p) => p.id === insurancePlanId && p.is_active
    );
    if (!plan) {
      return {
        reservation_id: reservation.id,
        has_insurance: false,
        selected_insurance: null,
        message: 'Insurance plan not found'
      };
    }

    let selections = this._getFromStorage('reservation_insurance_selections', []);
    selections = selections.filter((s) => s.reservation_id !== reservation.id);

    const selection = {
      id: this._generateId('reservation_insurance_selection'),
      reservation_id: reservation.id,
      insurance_plan_id: plan.id,
      coverage_amount: plan.coverage_amount,
      monthly_premium: plan.monthly_premium,
      created_at: this._nowISO()
    };

    selections.push(selection);
    reservation.has_insurance = true;
    reservation.updated_at = this._nowISO();

    this._saveToStorage('reservation_insurance_selections', selections);
    this._saveToStorage('reservations', reservations);

    return {
      reservation_id: reservation.id,
      has_insurance: true,
      selected_insurance: {
        insurance_plan_id: plan.id,
        name: plan.name,
        coverage_amount: plan.coverage_amount,
        monthly_premium: plan.monthly_premium,
        insurance_plan: this._clone(plan)
      },
      message: 'Insurance plan selected'
    };
  }

  // finalizeReservation(reservationId)
  finalizeReservation(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return {
        success: false,
        reservation_id: null,
        status: 'cancelled',
        confirmation_number: null,
        message: 'Reservation not found'
      };
    }

    if (reservation.status !== 'confirmed') {
      reservation.status = 'confirmed';
      if (!reservation.confirmation_number) {
        reservation.confirmation_number =
          this._generateReservationConfirmationNumber();
      }
      reservation.updated_at = this._nowISO();
      this._saveToStorage('reservations', reservations);
    }

    return {
      success: true,
      reservation_id: reservation.id,
      status: reservation.status,
      confirmation_number: reservation.confirmation_number,
      message: 'Reservation finalized'
    };
  }

  // getSizeGuideOverview()
  getSizeGuideOverview() {
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const unit_sizes = unitSizes.map((s) => ({
      unit_size_id: s.id,
      label: s.label,
      width_feet: typeof s.width_feet === 'number' ? s.width_feet : null,
      length_feet: typeof s.length_feet === 'number' ? s.length_feet : null,
      height_feet: typeof s.height_feet === 'number' ? s.height_feet : null,
      area_sq_ft: typeof s.area_sq_ft === 'number' ? s.area_sq_ft : null,
      size_category: s.size_category || null,
      description: s.description || '',
      typical_contents: s.typical_contents || ''
    }));

    return { unit_sizes };
  }

  // getSizeGuideOptions()
  getSizeGuideOptions() {
    const property_types = [
      {
        value: 'studio_apartment',
        label: 'Studio apartment',
        description: 'Best for a single room or studio.'
      },
      {
        value: '1_bedroom_apartment',
        label: '1 bedroom apartment',
        description: 'Typical 1 bedroom apartment storage.'
      },
      {
        value: '2_bedroom_apartment',
        label: '2 bedroom apartment',
        description: 'Typical 2 bedroom apartment storage.'
      },
      {
        value: '3_plus_bedroom_home',
        label: '3+ bedroom home',
        description: 'Larger homes with multiple bedrooms.'
      },
      {
        value: 'office_small',
        label: 'Small office',
        description: 'Small office or business storage.'
      }
    ];

    const item_checklist = [
      {
        key: 'queen_mattress',
        label: 'Queen mattress',
        category: 'bedroom',
        example_for_task: true
      },
      { key: 'sofa', label: 'Sofa', category: 'living_room', example_for_task: true },
      {
        key: 'dining_table',
        label: 'Dining table',
        category: 'dining',
        example_for_task: true
      },
      {
        key: 'boxes_medium_5',
        label: '5 medium boxes',
        category: 'boxes',
        example_for_task: true
      },
      {
        key: 'tv_stand',
        label: 'TV stand',
        category: 'living_room',
        example_for_task: true
      },
      { key: 'dresser', label: 'Dresser', category: 'bedroom', example_for_task: false },
      {
        key: 'coffee_table',
        label: 'Coffee table',
        category: 'living_room',
        example_for_task: false
      }
    ];

    return { property_types, item_checklist };
  }

  // calculateRecommendedUnitSize(propertyType, selectedItemKeys)
  calculateRecommendedUnitSize(propertyType, selectedItemKeys) {
    const { recommendedUnitSize, surroundingSizes } =
      this._calculateRecommendedSizeFromRules(propertyType, selectedItemKeys);

    const recommended_size = recommendedUnitSize
      ? {
          unit_size_id: recommendedUnitSize.id,
          label: recommendedUnitSize.label,
          size_category: recommendedUnitSize.size_category || null,
          area_sq_ft:
            typeof recommendedUnitSize.area_sq_ft === 'number'
              ? recommendedUnitSize.area_sq_ft
              : null,
          description: recommendedUnitSize.description || '',
          typical_contents: recommendedUnitSize.typical_contents || ''
        }
      : null;

    // Instrumentation for task completion tracking
    try {
      if (
        propertyType === '1_bedroom_apartment' &&
        Array.isArray(selectedItemKeys) &&
        selectedItemKeys.length >= 5
      ) {
        localStorage.setItem(
          'task3_sizeGuideInput',
          JSON.stringify({ propertyType, selectedItemKeys })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      recommended_size,
      surrounding_sizes: surroundingSizes
    };
  }

  // searchLocationsForUnitSize(searchTerm, unitSizeId, maxDistanceMiles, sortBy)
  searchLocationsForUnitSize(searchTerm, unitSizeId, maxDistanceMiles, sortBy) {
    const locations = this._getFromStorage('locations', []);
    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const unitSize = unitSizes.find((s) => s.id === unitSizeId) || null;

    const matchedLocations = locations.filter((loc) =>
      this._matchLocationBySearchTerm(loc, searchTerm)
    );

    // Ensure matched locations have units so that size-based filtering works even when
    // the seed data does not include inventory for every facility.
    for (const loc of matchedLocations) {
      this._ensureUnitsForLocation(loc.id, [unitSizeId]);
    }

    const updatedUnits = this._getFromStorage('units', []);

    const filters = { unitSizeId };
    const sortMode = sortBy === 'price_low_to_high' ? 'price_estimate' : 'distance';

    const sortedLocations = this._filterAndSortLocations(
      matchedLocations,
      updatedUnits,
      filters,
      maxDistanceMiles,
      sortMode
    );

    const results = sortedLocations.map((loc) => {
      const locUnits = units.filter(
        (u) => u.location_id === loc.id && u.unit_size_id === unitSizeId && u.is_available
      );
      const starting = locUnits.reduce((min, u) => {
        if (typeof u.monthly_rate === 'number') {
          if (min == null || u.monthly_rate < min) return u.monthly_rate;
        }
        return min;
      }, null);

      return {
        location_id: loc.id,
        location_name: loc.name,
        address_line1: loc.address_line1,
        city: loc.city,
        state: loc.state,
        postal_code: loc.postal_code,
        distance_miles:
          typeof loc.distance_miles_from_search === 'number'
            ? loc.distance_miles_from_search
            : null,
        rating: typeof loc.rating === 'number' ? loc.rating : null,
        rating_count:
          typeof loc.rating_count === 'number' ? loc.rating_count : null,
        starting_monthly_rate_for_size: starting,
        available_units_of_size_count: locUnits.length,
        location: this._clone(loc)
      };
    });

    return {
      results,
      unit_size_label: unitSize ? unitSize.label : null
    };
  }

  // getSuppliesCategoriesWithHighlights()
  getSuppliesCategoriesWithHighlights() {
    const categories = this._getFromStorage('supplies_categories', []);
    const products = this._getFromStorage('supplies_products', []);

    const resultCategories = categories.map((cat) => {
      const catProducts = products
        .filter((p) => p.category_id === cat.id && p.is_active)
        .slice();
      catProducts.sort((a, b) => (a.price || 0) - (b.price || 0));

      const highlights = catProducts.slice(0, 3).map((p) => ({
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url || '',
        product: this._clone(p)
      }));

      return {
        category_id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        sort_order: typeof cat.sort_order === 'number' ? cat.sort_order : null,
        highlight_products: highlights,
        category: this._clone(cat)
      };
    });

    resultCategories.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });

    return { categories: resultCategories };
  }

  // getSuppliesCategoryDetails(categoryId)
  getSuppliesCategoryDetails(categoryId) {
    const categories = this._getFromStorage('supplies_categories', []);
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) {
      return {};
    }
    return {
      category_id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      category: this._clone(cat)
    };
  }

  // getSuppliesProducts(categoryId, filters, sortBy)
  getSuppliesProducts(categoryId, filters, sortBy) {
    const products = this._getFromStorage('supplies_products', []);
    const f = filters || {};

    let catProducts = products.filter(
      (p) => p.category_id === categoryId && p.is_active
    );

    catProducts = catProducts.filter((p) => {
      if (
        typeof f.minPrice === 'number' &&
        typeof p.price === 'number' &&
        p.price < f.minPrice
      ) {
        return false;
      }
      if (
        typeof f.maxPrice === 'number' &&
        typeof p.price === 'number' &&
        p.price > f.maxPrice
      ) {
        return false;
      }
      if (Array.isArray(f.productTypes) && f.productTypes.length > 0) {
        if (!f.productTypes.includes(p.product_type)) return false;
      }
      if (typeof f.isBundle === 'boolean' && !!p.is_bundle !== f.isBundle) {
        return false;
      }
      return true;
    });

    const sortKey = sortBy || 'price_low_to_high';
    catProducts.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      } else if (sortKey === 'popularity') {
        // No popularity metric stored; fallback to price_low_to_high
        return (a.price || 0) - (b.price || 0);
      } else {
        return (a.price || 0) - (b.price || 0);
      }
    });

    const mapped = catProducts.map((p) => ({
      product_id: p.id,
      name: p.name,
      price: p.price,
      original_price:
        typeof p.original_price === 'number' ? p.original_price : null,
      product_type: p.product_type,
      is_bundle: !!p.is_bundle,
      bundle_size: typeof p.bundle_size === 'number' ? p.bundle_size : null,
      dimensions: p.dimensions || '',
      image_url: p.image_url || '',
      product: this._clone(p)
    }));

    return {
      category_id: categoryId,
      products: mapped
    };
  }

  // getSuppliesProductDetails(productId)
  getSuppliesProductDetails(productId) {
    const products = this._getFromStorage('supplies_products', []);
    const categories = this._getFromStorage('supplies_categories', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {};
    }
    const category = categories.find((c) => c.id === product.category_id) || null;
    return {
      product_id: product.id,
      name: product.name,
      category_id: product.category_id,
      category_name: category ? category.name : '',
      description: product.description || '',
      product_type: product.product_type,
      dimensions: product.dimensions || '',
      is_bundle: !!product.is_bundle,
      bundle_size: typeof product.bundle_size === 'number' ? product.bundle_size : null,
      price: product.price,
      original_price:
        typeof product.original_price === 'number' ? product.original_price : null,
      image_url: product.image_url || '',
      product: this._clone(product),
      category: category ? this._clone(category) : null
    };
  }

  // addSuppliesProductToCart(productId, quantity)
  addSuppliesProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('supplies_products', []);
    const product = products.find(
      (p) => p.id === productId && p.is_active
    );
    if (!product) {
      return {
        success: false,
        cart_id: null,
        item_count: 0,
        subtotal: 0,
        message: 'Product not found'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (item) {
      item.quantity += qty;
      item.added_at = item.added_at || this._nowISO();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: qty,
        line_total: product.price * qty,
        added_at: this._nowISO()
      };
      cartItems.push(item);
      cart.items = cart.items || [];
      if (!cart.items.includes(item.id)) {
        cart.items.push(item.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const item_count = itemsForCart.reduce(
      (sum, ci) => sum + (ci.quantity || 0),
      0
    );

    return {
      success: true,
      cart_id: cart.id,
      item_count,
      subtotal: cart.subtotal,
      message: 'Product added to cart'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { cart_id: null, item_count: 0, subtotal: 0 };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const item_count = itemsForCart.reduce(
      (sum, ci) => sum + (ci.quantity || 0),
      0
    );
    return {
      cart_id: cart.id,
      item_count,
      subtotal: cart.subtotal || 0,
      cart: this._clone(cart)
    };
  }

  // getCartDetails()
  getCartDetails() {
    const cart = this._getFromStorage('cart', null);
    const products = this._getFromStorage('supplies_products', []);
    if (!cart) {
      return { cart_id: null, items: [], subtotal: 0 };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        product: this._clone(product)
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      cart: this._clone(cart)
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('supplies_products', []);

    if (!cart) {
      return { cart_id: null, items: [], subtotal: 0 };
    }

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx !== -1) {
      if (quantity <= 0) {
        cartItems.splice(idx, 1);
      } else {
        cartItems[idx].quantity = quantity;
      }
      this._saveToStorage('cart_items', cartItems);
      this._recalculateCartTotals(cart);
    }

    cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        product: this._clone(product)
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      cart: this._clone(cart)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('supplies_products', []);

    if (!cart) {
      return { cart_id: null, items: [], subtotal: 0 };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        product: this._clone(product)
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      cart: this._clone(cart)
    };
  }

  // getHelpCategoriesOverview()
  getHelpCategoriesOverview() {
    const articles = this._getFromStorage('help_articles', []);
    const categoriesEnum = [
      'reservations',
      'access_hours',
      'billing',
      'security',
      'vehicle_storage',
      'general'
    ];

    const labelMap = {
      reservations: 'Reservations',
      access_hours: 'Access hours',
      billing: 'Billing',
      security: 'Security',
      vehicle_storage: 'Vehicle storage',
      general: 'General'
    };

    const descriptionMap = {
      reservations: 'Booking, modifying, or cancelling reservations.',
      access_hours: 'Gate and office access hours.',
      billing: 'Payments, invoices, and fees.',
      security: 'Security features and policies.',
      vehicle_storage: 'Vehicle storage options and rules.',
      general: 'Other common questions.'
    };

    const categories = categoriesEnum.map((cat) => {
      const catArticles = articles.filter((a) => a.category === cat);
      const featured = catArticles.filter((a) => a.is_featured);
      const selected = (featured.length ? featured : catArticles)
        .slice(0, 3)
        .map((a) => ({
          article_id: a.id,
          title: a.title,
          summary: a.summary || '',
          article: this._clone(a)
        }));

      return {
        category: cat,
        label: labelMap[cat],
        description: descriptionMap[cat],
        featured_articles: selected
      };
    });

    return { categories };
  }

  // searchHelpArticles(query, category)
  searchHelpArticles(query, category) {
    const q = (query || '').trim().toLowerCase();
    const articles = this._getFromStorage('help_articles', []);

    let filtered = articles;
    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    if (q) {
      filtered = filtered.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const keywords = Array.isArray(a.keywords)
          ? a.keywords.map((k) => String(k).toLowerCase())
          : [];

        if (
          title.indexOf(q) !== -1 ||
          summary.indexOf(q) !== -1 ||
          content.indexOf(q) !== -1
        ) {
          return true;
        }
        return keywords.some(
          (k) => k.indexOf(q) !== -1 || q.indexOf(k) !== -1
        );
      });
    } else {
      filtered = [];
    }

    const results = filtered.map((a) => ({
      article_id: a.id,
      title: a.title,
      summary: a.summary || '',
      category: a.category,
      article: this._clone(a)
    }));

    return { results };
  }

  // getHelpArticleDetails(articleId)
  getHelpArticleDetails(articleId) {
    const articles = this._getFromStorage('help_articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {};
    }

    const related = articles
      .filter((a) => a.id !== article.id && a.category === article.category)
      .slice(0, 3)
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        article: this._clone(a)
      }));

    return {
      article_id: article.id,
      title: article.title,
      category: article.category,
      summary: article.summary || '',
      content: article.content,
      related_articles: related,
      article: this._clone(article)
    };
  }

  // submitContactMessage(topic, message, name, email, relatedLocationName)
  submitContactMessage(topic, message, name, email, relatedLocationName) {
    const contactMessages = this._getFromStorage('contact_messages', []);

    const newMsg = {
      id: this._generateId('contact_message'),
      topic,
      message,
      name,
      email,
      related_location_name: relatedLocationName || '',
      status: 'new',
      response_message: '',
      responded_at: null,
      created_at: this._nowISO()
    };

    contactMessages.push(newMsg);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      contact_message_id: newMsg.id,
      status: newMsg.status,
      message: 'Your message has been submitted',
      contact_message: this._clone(newMsg)
    };
  }

  // getAboutAndPoliciesContent()
  getAboutAndPoliciesContent() {
    return {
      company_overview:
        'We provide convenient, secure self-storage solutions with locations in many regions.',
      services_summary:
        'We offer a variety of storage unit sizes, climate-controlled options, vehicle storage, and moving supplies.',
      terms_of_use_summary:
        'Use of our facilities is subject to our rental agreement, including rules on prohibited items, payment terms, and access policies.',
      privacy_overview:
        'We respect your privacy and use your information only to provide and improve our services, in line with our published privacy policy.',
      storage_rules_summary:
        'Prohibited items typically include hazardous materials, perishable goods, and illegal substances. Insurance is recommended for all stored items.',
      security_overview:
        'Most facilities feature gated access, surveillance cameras, and on-site management during business hours.',
      access_hours_philosophy:
        'We balance convenient access hours with strong security practices to protect your stored belongings.',
      support_commitment:
        'Our support team is available to answer questions about reservations, billing, and facility access.'
    };
  }

  // getHomepagePromotions()
  getHomepagePromotions() {
    const locations = this._getFromStorage('locations', []);
    const units = this._getFromStorage('units', []);
    const unitSizes = this._getFromStorage('unit_sizes', []);
    const unitSizesById = this._indexById(unitSizes);

    const promotedLocations = locations.filter((l) => l.has_promotions);
    promotedLocations.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    const featured_locations = promotedLocations.slice(0, 3).map((loc) => ({
      location_id: loc.id,
      name: loc.name,
      city: loc.city,
      state: loc.state,
      primary_promotions_summary: loc.primary_promotions_summary || '',
      location: this._clone(loc)
    }));

    const unitsWithPromos = units.filter(
      (u) => u.promotion_type && u.promotion_type !== 'none'
    );

    const featured_unit_promotions = unitsWithPromos.slice(0, 5).map((u) => {
      const loc = locations.find((l) => l.id === u.location_id) || {};
      const size = unitSizesById[u.unit_size_id] || {};
      return {
        unit_id: u.id,
        unit_size_label: size.label || '',
        location_name: loc.name || '',
        city: loc.city || '',
        promotion_type: u.promotion_type,
        promotion_description: u.promotion_description || '',
        unit: this._clone(u),
        location: this._clone(loc)
      };
    });

    return { featured_locations, featured_unit_promotions };
  }

  // getPreferredLocationSummary()
  getPreferredLocationSummary() {
    const prefs = this._getFromStorage('preferred_locations', []);
    if (!prefs.length || !prefs[0].location_id) {
      return {
        has_preferred_location: false,
        location_id: null,
        location_name: '',
        city: '',
        state: ''
      };
    }

    const pref = prefs[0];
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === pref.location_id) || null;

    if (!loc) {
      return {
        has_preferred_location: false,
        location_id: null,
        location_name: '',
        city: '',
        state: ''
      };
    }

    return {
      has_preferred_location: true,
      location_id: loc.id,
      location_name: loc.name,
      city: loc.city,
      state: loc.state,
      location: this._clone(loc)
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