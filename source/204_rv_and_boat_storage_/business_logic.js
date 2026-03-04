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
  }

  // ------------------ Storage helpers ------------------

  _initStorage() {
    const tables = [
      'facilities',
      'storage_units',
      'billing_plans',
      'add_ons',
      'reservations',
      'reservation_units',
      'reservation_add_ons',
      'autopay_settings',
      'account_profiles',
      'faq_articles',
      'contact_messages',
      'facility_areas'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        this._saveToStorage(key, []);
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_reservation_id')) {
      localStorage.setItem('current_reservation_id', 'null');
    }

    if (!localStorage.getItem('current_account_id')) {
      localStorage.setItem('current_account_id', 'null');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _now() {
    return new Date().toISOString();
  }

  // ------------------ Private helpers (business logic) ------------------

  _getOrCreateCurrentReservation() {
    const currentIdRaw = localStorage.getItem('current_reservation_id');
    let currentId = null;
    try {
      currentId = JSON.parse(currentIdRaw);
    } catch (e) {
      currentId = null;
    }

    let reservations = this._getFromStorage('reservations', []);
    let reservation = currentId ? reservations.find(r => r.id === currentId) : null;

    if (!reservation) {
      reservation = {
        id: this._generateId('res'),
        status: 'draft',
        created_at: this._now(),
        updated_at: this._now(),
        facility_id: null,
        move_in_date: null,
        billing_plan_type: null,
        total_monthly_rent: 0,
        total_monthly_add_ons: 0,
        total_monthly_charges: 0,
        total_upfront_charges: 0,
        security_deposit_amount: 0,
        guest_first_name: null,
        guest_last_name: null,
        guest_email: null,
        guest_phone: null,
        notes: null,
        has_autopay: false,
        is_multi_unit: false,
        confirmation_number: null
      };
      reservations.push(reservation);
      this._saveToStorage('reservations', reservations);
      localStorage.setItem('current_reservation_id', JSON.stringify(reservation.id));
    }

    return reservation;
  }

  _setCurrentReservation(reservationId) {
    localStorage.setItem('current_reservation_id', JSON.stringify(reservationId));
  }

  _getCurrentReservation() {
    const raw = localStorage.getItem('current_reservation_id');
    let id = null;
    try {
      id = JSON.parse(raw);
    } catch (e) {
      id = null;
    }
    if (!id) return null;
    const reservations = this._getFromStorage('reservations', []);
    return reservations.find(r => r.id === id) || null;
  }

  _getCurrentAccount() {
    const raw = localStorage.getItem('current_account_id');
    let id = null;
    try {
      id = JSON.parse(raw);
    } catch (e) {
      id = null;
    }
    if (!id) return null;
    const accounts = this._getFromStorage('account_profiles', []);
    return accounts.find(a => a.id === id) || null;
  }

  _setCurrentAccount(accountId) {
    localStorage.setItem('current_account_id', JSON.stringify(accountId));
  }

  _recalculateReservationTotals(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservationUnits = this._getFromStorage('reservation_units', []);
    const storageUnits = this._getFromStorage('storage_units', []);
    const billingPlans = this._getFromStorage('billing_plans', []);
    const reservationAddOns = this._getFromStorage('reservation_add_ons', []);

    const reservationIndex = reservations.findIndex(r => r.id === reservationId);
    if (reservationIndex === -1) return null;

    const reservation = reservations[reservationIndex];
    const unitsForRes = reservationUnits.filter(ru => ru.reservation_id === reservation.id);

    let monthlyRentTotal = 0;

    for (let ru of unitsForRes) {
      const unit = storageUnits.find(u => u.id === ru.unit_id);
      if (!unit) continue;

      let plan = null;
      if (ru.billing_plan_id) {
        plan = billingPlans.find(bp => bp.id === ru.billing_plan_id);
      }
      if (!plan && reservation.billing_plan_type) {
        plan = billingPlans.find(bp => bp.unit_id === ru.unit_id && bp.plan_type === reservation.billing_plan_type);
      }

      let effectiveMonthly = unit.base_monthly_price || 0;
      if (plan) {
        if (plan.price_per_month != null) {
          effectiveMonthly = plan.price_per_month;
        } else if (plan.total_upfront_amount != null && plan.billing_period_months) {
          effectiveMonthly = plan.total_upfront_amount / plan.billing_period_months;
        }
        ru.billing_plan_type = plan.plan_type;
        ru.billing_plan_id = plan.id;
      }
      ru.base_monthly_rent = unit.base_monthly_price || 0;
      ru.effective_monthly_rent = effectiveMonthly;

      monthlyRentTotal += effectiveMonthly;
    }

    // Save updated reservation units
    this._saveToStorage('reservation_units', reservationUnits);

    const ruIds = unitsForRes.map(ru => ru.id);
    const addOnsForRes = reservationAddOns.filter(ra => raIdsIncludes(ra, ruIds));

    function raIdsIncludes(ra, ruIds) {
      return ruIds.indexOf(ra.reservation_unit_id) !== -1 && (ra.is_selected === undefined || ra.is_selected === true);
    }

    let monthlyAddOnsTotal = 0;
    for (let ra of addOnsForRes) {
      const qty = ra.quantity != null ? ra.quantity : 1;
      const price = ra.monthly_price != null ? ra.monthly_price : 0;
      monthlyAddOnsTotal += price * qty;
    }

    reservation.total_monthly_rent = monthlyRentTotal;
    reservation.total_monthly_add_ons = monthlyAddOnsTotal;
    reservation.total_monthly_charges = monthlyRentTotal + monthlyAddOnsTotal;

    // Security deposit from FAQ if not already set
    if (reservation.security_deposit_amount == null) {
      reservation.security_deposit_amount = this._getSecurityDepositAmountFromFAQ();
    }

    // Upfront charges: simple model: first month rent + add-ons + deposit
    reservation.total_upfront_charges = reservation.total_monthly_charges + (reservation.security_deposit_amount || 0);

    reservation.updated_at = this._now();
    reservations[reservationIndex] = reservation;
    this._saveToStorage('reservations', reservations);

    return reservation;
  }

  _getSecurityDepositAmountFromFAQ() {
    const faqs = this._getFromStorage('faq_articles', []);
    const billingFaqs = faqs.filter(f => f.category === 'billing_payments' && (f.is_active === undefined || f.is_active));
    const article = billingFaqs.find(f => /security deposit/i.test(f.question || '') || /security deposit/i.test(f.answer || ''));
    if (!article || !article.answer) return 0;
    const dollarMatch = article.answer.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
    if (!dollarMatch) return 0;
    const cleaned = dollarMatch[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  _enforceFacilityConsistencyForReservation(reservation, facilityId) {
    if (!reservation.facility_id) {
      reservation.facility_id = facilityId;
      const reservations = this._getFromStorage('reservations', []);
      const idx = reservations.findIndex(r => r.id === reservation.id);
      if (idx !== -1) {
        reservations[idx] = reservation;
        this._saveToStorage('reservations', reservations);
      }
      return true;
    }
    return reservation.facility_id === facilityId;
  }

  _filterUpgradeOptionsByPriceDelta(options, maxAdditionalMonthlyPrice) {
    return options.filter(o => o.additionalMonthlyPrice != null && o.additionalMonthlyPrice <= maxAdditionalMonthlyPrice);
  }

  _computeDistanceMilesFromZip(facility, postalCode) {
    const facZip = parseInt((facility && facility.postal_code) || '0', 10);
    const searchZip = parseInt(postalCode || '0', 10);
    if (isNaN(facZip) || isNaN(searchZip)) return Number.POSITIVE_INFINITY;
    const diff = Math.abs(facZip - searchZip);
    // Arbitrary mapping of ZIP difference to miles, purely deterministic
    return diff / 10;
  }

  _detectCardBrand(cardNumber) {
    if (!cardNumber) return 'Unknown';
    const trimmed = String(cardNumber).replace(/\s+/g, '');
    if (/^4[0-9]{6,}$/.test(trimmed)) return 'Visa';
    if (/^5[1-5][0-9]{5,}$/.test(trimmed)) return 'Mastercard';
    if (/^3[47][0-9]{5,}$/.test(trimmed)) return 'Amex';
    if (/^6(?:011|5[0-9]{2})[0-9]{3,}$/.test(trimmed)) return 'Discover';
    return 'Unknown';
  }

  _resolveStorageUnitsWithFacility(units) {
    const facilities = this._getFromStorage('facilities', []);
    return units.map(u => ({
      ...u,
      facility: facilities.find(f => f.id === u.facility_id) || null
    }));
  }

  _resolveBillingPlansWithUnit(plans) {
    const units = this._getFromStorage('storage_units', []);
    return plans.map(bp => ({
      ...bp,
      unit: units.find(u => u.id === bp.unit_id) || null
    }));
  }

  _resolveReservationUnits(reservationUnits) {
    const reservations = this._getFromStorage('reservations', []);
    const units = this._getFromStorage('storage_units', []);
    return reservationUnits.map(ru => ({
      ...ru,
      reservation: reservations.find(r => r.id === ru.reservation_id) || null,
      unit: units.find(u => u.id === ru.unit_id) || null
    }));
  }

  _resolveReservationAddOns(reservationAddOns) {
    const addOns = this._getFromStorage('add_ons', []);
    const reservationUnits = this._getFromStorage('reservation_units', []);
    return reservationAddOns.map(ra => ({
      ...ra,
      addOn: addOns.find(a => a.id === ra.add_on_id) || null,
      reservationUnit: reservationUnits.find(ru => ru.id === ra.reservation_unit_id) || null
    }));
  }

  _resolveAutopaySetting(setting) {
    if (!setting) return null;
    const reservations = this._getFromStorage('reservations', []);
    return {
      ...setting,
      reservation: reservations.find(r => r.id === setting.reservation_id) || null
    };
  }

  _resolveFacilityAreas(areas) {
    const facilities = this._getFromStorage('facilities', []);
    return areas.map(a => ({
      ...a,
      facility: facilities.find(f => f.id === a.facility_id) || null
    }));
  }

  // ------------------ Interface implementations ------------------

  // getHomepageData()
  getHomepageData() {
    const facilities = this._getFromStorage('facilities', []);
    const featuredFacilities = facilities.filter(f => f.is_featured === true);

    return {
      featuredFacilities,
      heroTitle: 'Secure RV & Boat Storage',
      heroSubtitle: 'Reserve covered RV and boat spaces online in minutes.',
      quickLinks: [
        {
          categoryId: 'rv_storage',
          label: 'Find RV Storage',
          description: 'Search covered and uncovered RV spaces.'
        },
        {
          categoryId: 'boat_storage',
          label: 'Find Boat Storage',
          description: 'Indoor and outdoor boat storage options.'
        }
      ]
    };
  }

  // getUnitsFilterOptions(categoryId)
  getUnitsFilterOptions(categoryId) {
    const units = this._getFromStorage('storage_units', []).filter(u => u.category_id === categoryId);

    const coverageTypesSet = new Set();
    const locationTypesSet = new Set();
    const lengthSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    const amenitiesSet = new Set();

    for (const u of units) {
      if (u.coverage_type) coverageTypesSet.add(u.coverage_type);
      if (u.location_type) locationTypesSet.add(u.location_type);
      if (typeof u.length_ft === 'number') lengthSet.add(u.length_ft);
      if (typeof u.base_monthly_price === 'number') {
        if (minPrice == null || u.base_monthly_price < minPrice) minPrice = u.base_monthly_price;
        if (maxPrice == null || u.base_monthly_price > maxPrice) maxPrice = u.base_monthly_price;
      }
      if (Array.isArray(u.amenities)) {
        for (const a of u.amenities) amenitiesSet.add(a);
      }
    }

    const coverageTypes = Array.from(coverageTypesSet).map(val => ({
      value: val,
      label: val === 'covered' ? 'Covered' : val === 'uncovered' ? 'Uncovered' : val
    }));

    const locationTypes = Array.from(locationTypesSet).map(val => ({
      value: val,
      label: val === 'indoor' ? 'Indoor' : val === 'outdoor' ? 'Outdoor' : val
    }));

    const lengthOptionsFt = Array.from(lengthSet).sort((a, b) => a - b);

    const amenities = Array.from(amenitiesSet).map(code => ({
      code,
      label: this._formatAmenityLabel(code)
    }));

    const sortOptions = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'price_high_to_low', label: 'Price: High to Low' },
      { id: 'size_large_to_small', label: 'Size: Large to Small' }
    ];

    return {
      coverageTypes,
      locationTypes,
      lengthOptionsFt,
      priceRange: {
        minMonthlyPrice: minPrice != null ? minPrice : 0,
        maxMonthlyPrice: maxPrice != null ? maxPrice : 0
      },
      amenities,
      sortOptions
    };
  }

  _formatAmenityLabel(code) {
    const map = {
      electrical_outlet: 'Electrical Outlet',
      battery_trickle_charger: 'Battery Trickle Charger',
      exterior_wash_area_access: 'Exterior Wash Area Access',
      gate_access_24_7: '24/7 Gate Access',
      video_surveillance: 'Video Surveillance',
      gated_access: 'Gated Access',
      on_site_staff: 'On-site Staff'
    };
    return map[code] || code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // searchStorageUnits(categoryId, filters, sortOptionId, page, pageSize)
  searchStorageUnits(categoryId, filters, sortOptionId, page, pageSize) {
    filters = filters || {};
    sortOptionId = sortOptionId || 'price_low_to_high';
    page = page || 1;
    pageSize = pageSize || 20;

    const allUnits = this._getFromStorage('storage_units', []);
    let units = allUnits.filter(u => u.category_id === categoryId && (u.is_available === undefined || u.is_available === true));

    if (filters.coverageTypes && filters.coverageTypes.length) {
      units = units.filter(u => filters.coverageTypes.indexOf(u.coverage_type) !== -1);
    }
    if (filters.locationTypes && filters.locationTypes.length) {
      units = units.filter(u => filters.locationTypes.indexOf(u.location_type) !== -1);
    }
    if (typeof filters.minLengthFt === 'number') {
      units = units.filter(u => typeof u.length_ft === 'number' && u.length_ft >= filters.minLengthFt);
    }
    if (typeof filters.maxMonthlyPrice === 'number') {
      units = units.filter(u => typeof u.base_monthly_price === 'number' && u.base_monthly_price <= filters.maxMonthlyPrice);
    }
    if (filters.amenityCodes && filters.amenityCodes.length) {
      units = units.filter(u => {
        if (!Array.isArray(u.amenities)) return false;
        return filters.amenityCodes.every(code => u.amenities.indexOf(code) !== -1);
      });
    }
    if (filters.facilityId) {
      units = units.filter(u => u.facility_id === filters.facilityId);
    }
    if (filters.nearExitGate) {
      units = units.filter(u => u.near_exit_gate === true);
    }

    if (sortOptionId === 'price_low_to_high') {
      units.sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0));
    } else if (sortOptionId === 'price_high_to_low') {
      units.sort((a, b) => (b.base_monthly_price || 0) - (a.base_monthly_price || 0));
    } else if (sortOptionId === 'size_large_to_small') {
      units.sort((a, b) => (b.length_ft || 0) - (a.length_ft || 0));
    }

    const totalCount = units.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageUnits = units.slice(start, end);

    const resolvedUnits = this._resolveStorageUnitsWithFacility(pageUnits);

    // Instrumentation for task completion tracking (Task 1 & Task 2 filters)
    try {
      // Task 1: RV storage search with specific filters
      if (
        categoryId === 'rv_storage' &&
        filters &&
        Array.isArray(filters.coverageTypes) &&
        filters.coverageTypes.indexOf('covered') !== -1 &&
        typeof filters.minLengthFt === 'number' &&
        filters.minLengthFt >= 35 &&
        typeof filters.maxMonthlyPrice === 'number' &&
        filters.maxMonthlyPrice <= 250 &&
        sortOptionId === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task1_filterParams',
          JSON.stringify({ categoryId, filters, sortOptionId, timestamp: this._now() })
        );
      }

      // Task 2: Boat storage search with min length and both indoor/outdoor
      if (
        categoryId === 'boat_storage' &&
        filters &&
        typeof filters.minLengthFt === 'number' &&
        filters.minLengthFt >= 24 &&
        Array.isArray(filters.locationTypes) &&
        filters.locationTypes.indexOf('indoor') !== -1 &&
        filters.locationTypes.indexOf('outdoor') !== -1
      ) {
        localStorage.setItem(
          'task2_filterParams',
          JSON.stringify({ categoryId, filters, sortOptionId, timestamp: this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      units: resolvedUnits,
      totalCount,
      page,
      pageSize
    };
  }

  // getUnitDetails(unitId)
  getUnitDetails(unitId) {
    const units = this._getFromStorage('storage_units', []);
    const facilities = this._getFromStorage('facilities', []);
    const billingPlans = this._getFromStorage('billing_plans', []);

    const unit = units.find(u => u.id === unitId) || null;
    if (!unit) {
      return {
        unit: null,
        facility: null,
        billingPlans: [],
        categoryDisplayName: '',
        coverageDisplayName: '',
        locationDisplayName: '',
        amenityDisplayList: []
      };
    }

    const facility = facilities.find(f => f.id === unit.facility_id) || null;
    const unitPlans = billingPlans.filter(bp => bp.unit_id === unit.id && (bp.is_active === undefined || bp.is_active === true));
    const resolvedPlans = this._resolveBillingPlansWithUnit(unitPlans);

    const categoryDisplayName = unit.category_id === 'rv_storage' ? 'RV Storage' : unit.category_id === 'boat_storage' ? 'Boat Storage' : '';
    const coverageDisplayName = unit.coverage_type === 'covered' ? 'Covered' : unit.coverage_type === 'uncovered' ? 'Uncovered' : '';
    const locationDisplayName = unit.location_type === 'indoor' ? 'Indoor' : unit.location_type === 'outdoor' ? 'Outdoor' : '';

    const amenityDisplayList = Array.isArray(unit.amenities)
      ? unit.amenities.map(code => this._formatAmenityLabel(code))
      : [];

    // Instrumentation for task completion tracking (Task 2 compared units)
    try {
      if (
        unit.category_id === 'boat_storage' &&
        typeof unit.length_ft === 'number' &&
        unit.length_ft >= 24 &&
        typeof unit.base_monthly_price === 'number' &&
        (
          (unit.location_type === 'indoor' && unit.base_monthly_price < 180) ||
          (unit.location_type === 'outdoor' && unit.base_monthly_price < 150)
        )
      ) {
        let existing = null;
        try {
          const raw = localStorage.getItem('task2_comparedUnitIds');
          if (raw) {
            existing = JSON.parse(raw);
          }
        } catch (e) {
          existing = null;
        }

        if (!existing || typeof existing !== 'object') {
          existing = { indoor: [], outdoor: [] };
        } else {
          if (!Array.isArray(existing.indoor)) existing.indoor = [];
          if (!Array.isArray(existing.outdoor)) existing.outdoor = [];
        }

        const key = unit.location_type === 'indoor' ? 'indoor' : 'outdoor';
        if (key === 'indoor' || key === 'outdoor') {
          if (existing[key].indexOf(unit.id) === -1) {
            existing[key].push(unit.id);
          }
        }

        localStorage.setItem('task2_comparedUnitIds', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      unit,
      facility,
      billingPlans: resolvedPlans,
      categoryDisplayName,
      coverageDisplayName,
      locationDisplayName,
      amenityDisplayList
    };
  }

  // startNewReservationFromUnit(unitId, moveInDate, billingPlanType)
  startNewReservationFromUnit(unitId, moveInDate, billingPlanType) {
    const units = this._getFromStorage('storage_units', []);
    const facilities = this._getFromStorage('facilities', []);
    const billingPlans = this._getFromStorage('billing_plans', []);
    let reservations = this._getFromStorage('reservations', []);
    let reservationUnits = this._getFromStorage('reservation_units', []);

    const unit = units.find(u => u.id === unitId);
    if (!unit) {
      return { success: false, reservation: null, reservationUnits: [], nextStep: null, message: 'Unit not found.' };
    }
    if (unit.is_available === false) {
      return { success: false, reservation: null, reservationUnits: [], nextStep: null, message: 'Unit is not available.' };
    }

    const facility = facilities.find(f => f.id === unit.facility_id) || null;

    let selectedPlan = null;
    const plansForUnit = billingPlans.filter(bp => bp.unit_id === unit.id && (bp.is_active === undefined || bp.is_active === true));
    if (billingPlanType) {
      selectedPlan = plansForUnit.find(bp => bp.plan_type === billingPlanType) || null;
    }
    if (!selectedPlan) {
      selectedPlan = plansForUnit.find(bp => bp.is_default === true) || plansForUnit[0] || null;
    }

    const res = {
      id: this._generateId('res'),
      status: 'draft',
      created_at: this._now(),
      updated_at: this._now(),
      facility_id: facility ? facility.id : unit.facility_id || null,
      move_in_date: moveInDate || unit.available_from_date || null,
      billing_plan_type: selectedPlan ? selectedPlan.plan_type : (billingPlanType || 'monthly'),
      total_monthly_rent: 0,
      total_monthly_add_ons: 0,
      total_monthly_charges: 0,
      total_upfront_charges: 0,
      security_deposit_amount: null,
      guest_first_name: null,
      guest_last_name: null,
      guest_email: null,
      guest_phone: null,
      notes: null,
      has_autopay: false,
      is_multi_unit: false,
      confirmation_number: null
    };
    reservations.push(res);
    this._saveToStorage('reservations', reservations);

    const ru = {
      id: this._generateId('resunit'),
      reservation_id: res.id,
      unit_id: unit.id,
      unit_category_id: unit.category_id,
      unit_space_number: unit.space_number || null,
      unit_name: unit.unit_label || null,
      length_ft: unit.length_ft || null,
      base_monthly_rent: unit.base_monthly_price || 0,
      effective_monthly_rent: unit.base_monthly_price || 0,
      billing_plan_id: selectedPlan ? selectedPlan.id : null,
      billing_plan_type: selectedPlan ? selectedPlan.plan_type : (billingPlanType || 'monthly'),
      move_in_date: res.move_in_date,
      is_primary: true
    };
    reservationUnits.push(ru);
    this._saveToStorage('reservation_units', reservationUnits);

    this._setCurrentReservation(res.id);
    const updatedRes = this._recalculateReservationTotals(res.id) || res;

    const filteredRUs = reservationUnits.filter(rux => rux.reservation_id === res.id);
    const resolvedUnits = this._resolveReservationUnits(filteredRUs);

    return {
      success: true,
      reservation: updatedRes,
      reservationUnits: resolvedUnits,
      nextStep: 'date_add_ons',
      message: ''
    };
  }

  // addUnitToCurrentReservation(unitId, isPrimary)
  addUnitToCurrentReservation(unitId, isPrimary) {
    isPrimary = !!isPrimary;

    let reservation = this._getCurrentReservation();
    if (!reservation) {
      reservation = this._getOrCreateCurrentReservation();
    }

    const units = this._getFromStorage('storage_units', []);
    const unit = units.find(u => u.id === unitId);
    if (!unit) {
      return { success: false, reservation: null, reservationUnits: [], message: 'Unit not found.' };
    }

    if (!this._enforceFacilityConsistencyForReservation(reservation, unit.facility_id)) {
      return { success: false, reservation, reservationUnits: [], message: 'All units in a reservation must be at the same facility.' };
    }

    let reservationUnits = this._getFromStorage('reservation_units', []);

    if (isPrimary) {
      for (const ru of reservationUnits) {
        if (ru.reservation_id === reservation.id) {
          ru.is_primary = false;
        }
      }
    }

    const ru = {
      id: this._generateId('resunit'),
      reservation_id: reservation.id,
      unit_id: unit.id,
      unit_category_id: unit.category_id,
      unit_space_number: unit.space_number || null,
      unit_name: unit.unit_label || null,
      length_ft: unit.length_ft || null,
      base_monthly_rent: unit.base_monthly_price || 0,
      effective_monthly_rent: unit.base_monthly_price || 0,
      billing_plan_id: null,
      billing_plan_type: reservation.billing_plan_type || 'monthly',
      move_in_date: reservation.move_in_date,
      is_primary: isPrimary
    };
    reservationUnits.push(ru);
    this._saveToStorage('reservation_units', reservationUnits);

    reservation.is_multi_unit = true;
    const reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;
    const filteredRUs = reservationUnits.filter(rux => rux.reservation_id === reservation.id);
    const resolvedUnits = this._resolveReservationUnits(filteredRUs);

    return {
      success: true,
      reservation: updatedRes,
      reservationUnits: resolvedUnits,
      message: ''
    };
  }

  // getCurrentReservationConfiguration()
  getCurrentReservationConfiguration() {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return {
        reservation: null,
        units: [],
        availableAddOns: [],
        currentStep: null
      };
    }

    const reservationUnits = this._getFromStorage('reservation_units', []).filter(ru => ru.reservation_id === reservation.id);
    const storageUnits = this._getFromStorage('storage_units', []);
    const addOns = this._getFromStorage('add_ons', []);
    const reservationAddOns = this._getFromStorage('reservation_add_ons', []);

    const units = reservationUnits.map(ru => ({
      reservationUnit: ru,
      unit: storageUnits.find(u => u.id === ru.unit_id) || null
    }));

    const availableAddOns = [];
    const selectedAddOns = reservationAddOns.filter(ra => {
      const ru = reservationUnits.find(rux => rux.id === ra.reservation_unit_id);
      return ru && (ra.is_selected === undefined || ra.is_selected === true);
    });

    for (const addOn of addOns) {
      if (addOn.is_active === false) continue;
      const appliesCategories = Array.isArray(addOn.applicable_unit_categories) ? addOn.applicable_unit_categories : [];
      for (const catId of appliesCategories) {
        const isSelected = selectedAddOns.some(sa => sa.add_on_id === addOn.id);
        availableAddOns.push({
          addOn,
          isSelected,
          appliesToCategoryId: catId
        });
      }
    }

    return {
      reservation,
      units,
      availableAddOns,
      currentStep: 'date_add_ons'
    };
  }

  // updateCurrentReservationMoveInDate(moveInDate)
  updateCurrentReservationMoveInDate(moveInDate) {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return { success: false, reservation: null, message: 'No current reservation.' };
    }

    reservation.move_in_date = moveInDate;
    reservation.updated_at = this._now();

    const reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    const reservationUnits = this._getFromStorage('reservation_units', []);
    for (const ru of reservationUnits) {
      if (ru.reservation_id === reservation.id) {
        ru.move_in_date = moveInDate;
      }
    }
    this._saveToStorage('reservation_units', reservationUnits);

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;

    return { success: true, reservation: updatedRes, message: '' };
  }

  // updateCurrentReservationAddOns(selections)
  updateCurrentReservationAddOns(selections) {
    selections = selections || [];
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return { success: false, reservation: null, selectedAddOns: [], message: 'No current reservation.' };
    }

    const reservationUnits = this._getFromStorage('reservation_units', []).filter(ru => ru.reservation_id === reservation.id);
    const addOns = this._getFromStorage('add_ons', []);
    let reservationAddOns = this._getFromStorage('reservation_add_ons', []);

    for (const sel of selections) {
      const addOn = addOns.find(a => a.id === sel.addOnId);
      if (!addOn) continue;
      const appliesCategories = Array.isArray(addOn.applicable_unit_categories) ? addOn.applicable_unit_categories : [];

      const unitsToApply = reservationUnits.filter(ru => appliesCategories.indexOf(ru.unit_category_id) !== -1);
      for (const ru of unitsToApply) {
        let ra = reservationAddOns.find(x => x.reservation_unit_id === ru.id && x.add_on_id === addOn.id);
        if (!ra && sel.isSelected) {
          ra = {
            id: this._generateId('resaddon'),
            reservation_unit_id: ru.id,
            add_on_id: addOn.id,
            name: addOn.name || null,
            monthly_price: addOn.monthly_price || 0,
            quantity: sel.quantity != null ? sel.quantity : 1,
            is_selected: true
          };
          reservationAddOns.push(ra);
        } else if (ra) {
          ra.is_selected = !!sel.isSelected;
          if (sel.quantity != null) ra.quantity = sel.quantity;
        }
      }
    }

    this._saveToStorage('reservation_add_ons', reservationAddOns);

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;

    const selectedAddOns = reservationAddOns.filter(ra => {
      const ru = reservationUnits.find(rux => rux.id === ra.reservation_unit_id);
      return ru && (ra.is_selected === undefined || ra.is_selected === true);
    });

    const resolved = this._resolveReservationAddOns(selectedAddOns);

    return {
      success: true,
      reservation: updatedRes,
      selectedAddOns: resolved,
      message: ''
    };
  }

  // getCurrentReservationSummary()
  getCurrentReservationSummary() {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return {
        reservation: null,
        unitSummaries: [],
        addOnSummaries: [],
        pricingBreakdown: {
          monthlyRentTotal: 0,
          monthlyAddOnsTotal: 0,
          totalMonthlyCharges: 0,
          totalUpfrontCharges: 0,
          securityDepositAmount: 0,
          promotions: [],
          billingPlanSummary: ''
        },
        canProceedToCheckout: false
      };
    }

    const reservationUnits = this._getFromStorage('reservation_units', []).filter(ru => ru.reservation_id === reservation.id);
    const storageUnits = this._getFromStorage('storage_units', []);
    const billingPlans = this._getFromStorage('billing_plans', []);
    const reservationAddOns = this._getFromStorage('reservation_add_ons', []);
    const addOns = this._getFromStorage('add_ons', []);

    const unitSummaries = reservationUnits.map(ru => {
      const unit = storageUnits.find(u => u.id === ru.unit_id) || null;
      let billingPlan = null;
      if (ru.billing_plan_id) {
        billingPlan = billingPlans.find(bp => bp.id === ru.billing_plan_id) || null;
      } else if (reservation.billing_plan_type) {
        billingPlan = billingPlans.find(bp => bp.unit_id === ru.unit_id && bp.plan_type === reservation.billing_plan_type) || null;
      }
      if (billingPlan) {
        billingPlan = {
          ...billingPlan,
          unit
        };
      }
      return {
        reservationUnit: {
          ...ru,
          reservation,
          unit
        },
        unit,
        billingPlan
      };
    });

    const ruIds = reservationUnits.map(ru => ru.id);
    const selectedAddOns = reservationAddOns.filter(ra => ruIds.indexOf(ra.reservation_unit_id) !== -1 && (ra.is_selected === undefined || ra.is_selected === true));
    const addOnSummaries = selectedAddOns.map(ra => {
      const addOn = addOns.find(a => a.id === ra.add_on_id) || null;
      return {
        reservationAddOn: {
          ...ra,
          addOn,
          reservationUnit: reservationUnits.find(ru => ru.id === ra.reservation_unit_id) || null
        },
        addOn
      };
    });

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;

    const pricingBreakdown = {
      monthlyRentTotal: updatedRes.total_monthly_rent || 0,
      monthlyAddOnsTotal: updatedRes.total_monthly_add_ons || 0,
      totalMonthlyCharges: updatedRes.total_monthly_charges || 0,
      totalUpfrontCharges: updatedRes.total_upfront_charges || 0,
      securityDepositAmount: updatedRes.security_deposit_amount || 0,
      promotions: [],
      billingPlanSummary: updatedRes.billing_plan_type === 'prepay_12_months'
        ? 'Prepay 12 months'
        : updatedRes.billing_plan_type === 'prepay_6_months'
          ? 'Prepay 6 months'
          : 'Monthly billing'
    };

    return {
      reservation: updatedRes,
      unitSummaries,
      addOnSummaries,
      pricingBreakdown,
      canProceedToCheckout: reservationUnits.length > 0
    };
  }

  // updateCurrentReservationGuestInfo(firstName, lastName, email, phone)
  updateCurrentReservationGuestInfo(firstName, lastName, email, phone) {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return { success: false, reservation: null, message: 'No current reservation.' };
    }

    reservation.guest_first_name = firstName;
    reservation.guest_last_name = lastName;
    reservation.guest_email = email;
    reservation.guest_phone = phone;
    reservation.updated_at = this._now();

    const reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    return { success: true, reservation, message: '' };
  }

  // submitCurrentReservationPayment(paymentMethodType, card)
  submitCurrentReservationPayment(paymentMethodType, card) {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return { success: false, requiresAction: false, message: 'No current reservation.', reservation: null };
    }

    if (paymentMethodType === 'credit_card') {
      if (!card || !card.cardNumber) {
        return { success: false, requiresAction: false, message: 'Missing card details.', reservation };
      }
      // Simulate payment success
      reservation.status = 'pending';
    } else {
      // For 'none' or other types, assume no payment required now
      reservation.status = 'pending';
    }

    reservation.updated_at = this._now();
    const reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    return { success: true, requiresAction: false, message: '', reservation };
  }

  // finalizeCurrentReservation()
  finalizeCurrentReservation() {
    const reservation = this._getCurrentReservation();
    if (!reservation) {
      return { success: false, reservation: null, reservationUnits: [], message: 'No current reservation.' };
    }

    reservation.status = reservation.status === 'draft' ? 'confirmed' : reservation.status;
    if (!reservation.confirmation_number) {
      reservation.confirmation_number = 'R' + Date.now();
    }
    reservation.updated_at = this._now();

    const reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    const reservationUnitsAll = this._getFromStorage('reservation_units', []);
    const reservationUnits = reservationUnitsAll.filter(ru => ru.reservation_id === reservation.id);
    const resolvedUnits = this._resolveReservationUnits(reservationUnits);

    return {
      success: true,
      reservation,
      reservationUnits: resolvedUnits,
      message: ''
    };
  }

  // searchFacilitiesByZip(postalCode, radiusMiles, vehicleTypes, sortOptionId)
  searchFacilitiesByZip(postalCode, radiusMiles, vehicleTypes, sortOptionId) {
    vehicleTypes = vehicleTypes || [];
    sortOptionId = sortOptionId || 'distance_nearest_first';

    const facilities = this._getFromStorage('facilities', []);

    const results = [];
    for (const facility of facilities) {
      const distanceMiles = this._computeDistanceMilesFromZip(facility, postalCode);
      if (distanceMiles > radiusMiles) continue;

      const supported = Array.isArray(facility.vehicle_types_supported) ? facility.vehicle_types_supported : [];
      const supportsRvStorage = supported.indexOf('rv_storage') !== -1;
      const supportsBoatStorage = supported.indexOf('boat_storage') !== -1;

      const hasAllRequested = vehicleTypes.length === 0 || vehicleTypes.every(vt => supported.indexOf(vt) !== -1);
      if (!hasAllRequested) continue;

      results.push({
        facility: {
          ...facility,
          last_search_distance_miles: distanceMiles
        },
        distanceMiles,
        supportsRvStorage,
        supportsBoatStorage
      });
    }

    if (sortOptionId === 'distance_nearest_first') {
      results.sort((a, b) => a.distanceMiles - b.distanceMiles);
    }

    // Instrumentation for task completion tracking (Task 3 facility search)
    try {
      if (
        postalCode === '85004' &&
        typeof radiusMiles === 'number' &&
        radiusMiles <= 15 &&
        Array.isArray(vehicleTypes) &&
        vehicleTypes.indexOf('rv_storage') !== -1 &&
        vehicleTypes.indexOf('boat_storage') !== -1 &&
        sortOptionId === 'distance_nearest_first'
      ) {
        localStorage.setItem(
          'task3_facilitySearchParams',
          JSON.stringify({ postalCode, radiusMiles, vehicleTypes, sortOptionId, timestamp: this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { facilities: results };
  }

  // getFacilitiesListingData()
  getFacilitiesListingData() {
    return this._getFromStorage('facilities', []);
  }

  // getFacilityDetails(facilityId)
  getFacilityDetails(facilityId) {
    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find(f => f.id === facilityId) || null;
    if (!facility) {
      return {
        facility: null,
        supportsRvStorage: false,
        supportsBoatStorage: false,
        areas: []
      };
    }

    const facilityAreas = this._getFromStorage('facility_areas', []).filter(a => a.facility_id === facility.id);
    const resolvedAreas = this._resolveFacilityAreas(facilityAreas);

    const supported = Array.isArray(facility.vehicle_types_supported) ? facility.vehicle_types_supported : [];
    return {
      facility,
      supportsRvStorage: supported.indexOf('rv_storage') !== -1,
      supportsBoatStorage: supported.indexOf('boat_storage') !== -1,
      areas: resolvedAreas
    };
  }

  // getFacilityUnits(facilityId, categoryId, filters, sortOptionId)
  getFacilityUnits(facilityId, categoryId, filters, sortOptionId) {
    filters = filters || {};
    sortOptionId = sortOptionId || 'price_low_to_high';

    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find(f => f.id === facilityId) || null;

    const allUnits = this._getFromStorage('storage_units', []);
    let units = allUnits.filter(u => u.facility_id === facilityId && u.category_id === categoryId && (u.is_available === undefined || u.is_available === true));

    if (typeof filters.minLengthFt === 'number') {
      units = units.filter(u => typeof u.length_ft === 'number' && u.length_ft >= filters.minLengthFt);
    }
    if (typeof filters.maxMonthlyPrice === 'number') {
      units = units.filter(u => typeof u.base_monthly_price === 'number' && u.base_monthly_price <= filters.maxMonthlyPrice);
    }

    if (sortOptionId === 'price_low_to_high') {
      units.sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0));
    } else if (sortOptionId === 'price_high_to_low') {
      units.sort((a, b) => (b.base_monthly_price || 0) - (a.base_monthly_price || 0));
    }

    const resolvedUnits = this._resolveStorageUnitsWithFacility(units);

    // Instrumentation for task completion tracking (Task 3 RV & boat filters within facility)
    try {
      // Task 3 RV filters
      if (
        categoryId === 'rv_storage' &&
        filters &&
        typeof filters.minLengthFt === 'number' &&
        filters.minLengthFt >= 30 &&
        typeof filters.maxMonthlyPrice === 'number' &&
        filters.maxMonthlyPrice <= 220 &&
        sortOptionId === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task3_rvFilterParams',
          JSON.stringify({ facilityId, categoryId, filters, sortOptionId, timestamp: this._now() })
        );
      }

      // Task 3 boat filters
      if (
        categoryId === 'boat_storage' &&
        filters &&
        typeof filters.minLengthFt === 'number' &&
        filters.minLengthFt >= 20 &&
        typeof filters.maxMonthlyPrice === 'number' &&
        filters.maxMonthlyPrice <= 150 &&
        sortOptionId === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task3_boatFilterParams',
          JSON.stringify({ facilityId, categoryId, filters, sortOptionId, timestamp: this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      facility,
      units: resolvedUnits
    };
  }

  // getFacilitySiteMap(facilityId)
  getFacilitySiteMap(facilityId) {
    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find(f => f.id === facilityId) || null;

    const areas = this._getFromStorage('facility_areas', []).filter(a => a.facility_id === facilityId);
    const resolvedAreas = this._resolveFacilityAreas(areas);

    const allUnits = this._getFromStorage('storage_units', []);
    const unitsForFacility = allUnits.filter(u => u.facility_id === facilityId);
    const resolvedUnits = this._resolveStorageUnitsWithFacility(unitsForFacility).map(u => ({ unit: u }));

    return {
      facility,
      mapImageUrl: facility ? facility.map_image_url || '' : '',
      areas: resolvedAreas,
      units: resolvedUnits
    };
  }

  // createAccountProfile(firstName, lastName, email, password, acceptTerms)
  createAccountProfile(firstName, lastName, email, password, acceptTerms) {
    let accounts = this._getFromStorage('account_profiles', []);
    if (accounts.some(a => a.email === email)) {
      return { success: false, accountProfile: null, message: 'Email already registered.' };
    }

    const account = {
      id: this._generateId('acct'),
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      created_at: this._now(),
      updated_at: this._now()
    };
    accounts.push(account);
    this._saveToStorage('account_profiles', accounts);

    this._setCurrentAccount(account.id);

    return { success: true, accountProfile: account, message: '' };
  }

  // loginAccount(email, password)
  loginAccount(email, password) {
    const accounts = this._getFromStorage('account_profiles', []);
    const account = accounts.find(a => a.email === email && a.password === password) || null;
    if (!account) {
      return { success: false, accountProfile: null, message: 'Invalid email or password.' };
    }

    this._setCurrentAccount(account.id);
    return { success: true, accountProfile: account, message: '' };
  }

  // getAccountDashboardData()
  getAccountDashboardData() {
    const accountProfile = this._getCurrentAccount();
    if (!accountProfile) {
      return { accountProfile: null, reservations: [] };
    }

    const reservations = this._getFromStorage('reservations', []).filter(r => r.guest_email === accountProfile.email);
    const reservationUnits = this._getFromStorage('reservation_units', []);
    const facilities = this._getFromStorage('facilities', []);

    const results = reservations.map(r => {
      const unitsForRes = reservationUnits.filter(ru => ru.reservation_id === r.id);
      let primaryReservationUnit = unitsForRes.find(ru => ru.is_primary) || unitsForRes[0] || null;
      if (primaryReservationUnit) {
        primaryReservationUnit = {
          ...primaryReservationUnit,
          reservation: r,
          unit: null
        };
      }
      const facility = facilities.find(f => f.id === r.facility_id) || null;
      return {
        reservation: r,
        primaryReservationUnit,
        facility
      };
    });

    return {
      accountProfile,
      reservations: results
    };
  }

  // updateAccountProfile(firstName?, lastName?, password?)
  updateAccountProfile(firstName, lastName, password) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, accountProfile: null, message: 'Not logged in.' };
    }

    if (firstName !== undefined && firstName !== null) account.first_name = firstName;
    if (lastName !== undefined && lastName !== null) account.last_name = lastName;
    if (password !== undefined && password !== null) account.password = password;
    account.updated_at = this._now();

    const accounts = this._getFromStorage('account_profiles', []);
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      accounts[idx] = account;
      this._saveToStorage('account_profiles', accounts);
    }

    return { success: true, accountProfile: account, message: '' };
  }

  // getReservationDetailsForAccount(reservationId)
  getReservationDetailsForAccount(reservationId) {
    const account = this._getCurrentAccount();
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(r => r.id === reservationId) || null;
    if (!reservation) {
      return { reservation: null, units: [], autopaySetting: null };
    }

    if (account && reservation.guest_email && reservation.guest_email !== account.email) {
      // For simplicity, still return but in real scenario we would restrict
    }

    const reservationUnits = this._getFromStorage('reservation_units', []).filter(ru => ru.reservation_id === reservation.id);
    const storageUnits = this._getFromStorage('storage_units', []);

    const units = reservationUnits.map(ru => ({
      reservationUnit: {
        ...ru,
        reservation,
        unit: storageUnits.find(u => u.id === ru.unit_id) || null
      },
      unit: storageUnits.find(u => u.id === ru.unit_id) || null
    }));

    const autopays = this._getFromStorage('autopay_settings', []);
    const autopaySettingRaw = autopays.find(a => a.reservation_id === reservation.id) || null;
    const autopaySetting = this._resolveAutopaySetting(autopaySettingRaw);

    return { reservation, units, autopaySetting };
  }

  // getReservationBillingAndAutopaySettings(reservationId)
  getReservationBillingAndAutopaySettings(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(r => r.id === reservationId) || null;
    if (!reservation) {
      return { reservation: null, autopaySetting: null };
    }
    const autopays = this._getFromStorage('autopay_settings', []);
    const autopaySettingRaw = autopays.find(a => a.reservation_id === reservation.id) || null;
    const autopaySetting = this._resolveAutopaySetting(autopaySettingRaw);
    return { reservation, autopaySetting };
  }

  // setupAutopayCreditCard(reservationId, cardholderName, cardNumber, expirationMonth, expirationYear, cvv, billingPostalCode)
  setupAutopayCreditCard(reservationId, cardholderName, cardNumber, expirationMonth, expirationYear, cvv, billingPostalCode) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(r => r.id === reservationId) || null;
    if (!reservation) {
      return { success: false, autopaySetting: null, message: 'Reservation not found.' };
    }

    let autopays = this._getFromStorage('autopay_settings', []);
    let setting = autopays.find(a => a.reservation_id === reservation.id) || null;

    const last4 = String(cardNumber).replace(/\s+/g, '').slice(-4);
    const brand = this._detectCardBrand(cardNumber);

    if (!setting) {
      setting = {
        id: this._generateId('autopay'),
        reservation_id: reservation.id,
        status: 'enabled',
        payment_method_type: 'credit_card',
        cardholder_name: cardholderName,
        card_last4: last4,
        card_brand: brand,
        card_expiration_month: expirationMonth,
        card_expiration_year: expirationYear,
        billing_postal_code: billingPostalCode,
        full_card_number: cardNumber,
        card_cvv: cvv,
        created_at: this._now(),
        updated_at: this._now()
      };
      autopays.push(setting);
    } else {
      setting.status = 'enabled';
      setting.payment_method_type = 'credit_card';
      setting.cardholder_name = cardholderName;
      setting.card_last4 = last4;
      setting.card_brand = brand;
      setting.card_expiration_month = expirationMonth;
      setting.card_expiration_year = expirationYear;
      setting.billing_postal_code = billingPostalCode;
      setting.full_card_number = cardNumber;
      setting.card_cvv = cvv;
      setting.updated_at = this._now();
    }

    this._saveToStorage('autopay_settings', autopays);

    reservation.has_autopay = true;
    reservation.updated_at = this._now();
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    const resolvedSetting = this._resolveAutopaySetting(setting);

    return { success: true, autopaySetting: resolvedSetting, message: '' };
  }

  // disableAutopay(reservationId)
  disableAutopay(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(r => r.id === reservationId) || null;
    if (!reservation) {
      return { success: false, autopaySetting: null, message: 'Reservation not found.' };
    }

    let autopays = this._getFromStorage('autopay_settings', []);
    let setting = autopays.find(a => a.reservation_id === reservation.id) || null;
    if (!setting) {
      return { success: false, autopaySetting: null, message: 'Autopay not configured.' };
    }

    setting.status = 'disabled';
    setting.updated_at = this._now();
    this._saveToStorage('autopay_settings', autopays);

    reservation.has_autopay = false;
    reservation.updated_at = this._now();
    const idx = reservations.findIndex(r => r.id === reservation.id);
    if (idx !== -1) {
      reservations[idx] = reservation;
      this._saveToStorage('reservations', reservations);
    }

    const resolvedSetting = this._resolveAutopaySetting(setting);
    return { success: true, autopaySetting: resolvedSetting, message: '' };
  }

  // getReservationEditOptions(reservationId)
  getReservationEditOptions(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(r => r.id === reservationId) || null;
    if (!reservation) {
      return { reservation: null, units: [], upgradeOptions: [] };
    }

    const reservationUnits = this._getFromStorage('reservation_units', []).filter(ru => ru.reservation_id === reservation.id);
    const storageUnits = this._getFromStorage('storage_units', []);

    const units = reservationUnits.map(ru => ({
      reservationUnit: {
        ...ru,
        reservation,
        unit: storageUnits.find(u => u.id === ru.unit_id) || null
      },
      unit: storageUnits.find(u => u.id === ru.unit_id) || null
    }));

    const allUnitsSameFacility = storageUnits.filter(u => u.facility_id === reservation.facility_id && (u.is_available === undefined || u.is_available === true));

    const upgradeOptions = [];
    for (const ru of reservationUnits) {
      const currentUnit = storageUnits.find(u => u.id === ru.unit_id);
      if (!currentUnit) continue;

      for (const candidate of allUnitsSameFacility) {
        if (candidate.category_id !== currentUnit.category_id) continue;
        if (candidate.length_ft <= currentUnit.length_ft) continue;
        const additional = (candidate.base_monthly_price || 0) - (currentUnit.base_monthly_price || 0);
        if (additional <= 0) continue;
        upgradeOptions.push({
          currentReservationUnitId: ru.id,
          newUnit: {
            ...candidate,
            facility: null
          },
          additionalMonthlyPrice: additional
        });
      }
    }

    const filteredUpgrades = this._filterUpgradeOptionsByPriceDelta(upgradeOptions, 40);

    return {
      reservation,
      units,
      upgradeOptions: filteredUpgrades
    };
  }

  // updateReservationMoveInDate(reservationId, newMoveInDate)
  updateReservationMoveInDate(reservationId, newMoveInDate) {
    let reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx === -1) {
      return { success: false, reservation: null, message: 'Reservation not found.' };
    }

    const reservation = reservations[idx];
    reservation.move_in_date = newMoveInDate;
    reservation.status = reservation.status === 'confirmed' ? 'modified' : reservation.status;
    reservation.updated_at = this._now();
    reservations[idx] = reservation;
    this._saveToStorage('reservations', reservations);

    const reservationUnits = this._getFromStorage('reservation_units', []);
    for (const ru of reservationUnits) {
      if (ru.reservation_id === reservation.id) {
        ru.move_in_date = newMoveInDate;
      }
    }
    this._saveToStorage('reservation_units', reservationUnits);

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;

    return { success: true, reservation: updatedRes, message: '' };
  }

  // updateReservationUnit(reservationId, currentReservationUnitId, newUnitId)
  updateReservationUnit(reservationId, currentReservationUnitId, newUnitId) {
    let reservations = this._getFromStorage('reservations', []);
    const reservationIdx = reservations.findIndex(r => r.id === reservationId);
    if (reservationIdx === -1) {
      return { success: false, reservation: null, updatedReservationUnit: null, message: 'Reservation not found.' };
    }
    const reservation = reservations[reservationIdx];

    const storageUnits = this._getFromStorage('storage_units', []);
    const newUnit = storageUnits.find(u => u.id === newUnitId) || null;
    if (!newUnit) {
      return { success: false, reservation, updatedReservationUnit: null, message: 'New unit not found.' };
    }

    if (!this._enforceFacilityConsistencyForReservation(reservation, newUnit.facility_id)) {
      return { success: false, reservation, updatedReservationUnit: null, message: 'Unit must be at the same facility.' };
    }

    let reservationUnits = this._getFromStorage('reservation_units', []);
    const ruIdx = reservationUnits.findIndex(ru => ru.id === currentReservationUnitId && ru.reservation_id === reservation.id);
    if (ruIdx === -1) {
      return { success: false, reservation, updatedReservationUnit: null, message: 'Reservation unit not found.' };
    }

    const ru = reservationUnits[ruIdx];

    // Instrumentation for task completion tracking (Task 6 upgrade info)
    try {
      if (
        newUnit &&
        ru &&
        typeof newUnit.length_ft === 'number' &&
        typeof ru.length_ft === 'number' &&
        newUnit.length_ft > ru.length_ft &&
        typeof newUnit.base_monthly_price === 'number'
      ) {
        const oldPrice = ru.base_monthly_rent || 0;
        const newPrice = newUnit.base_monthly_price || 0;
        const priceDelta = newPrice - oldPrice;
        localStorage.setItem(
          'task6_upgradeInfo',
          JSON.stringify({
            reservationId,
            oldReservationUnitId: currentReservationUnitId,
            newUnitId,
            oldPrice,
            newPrice,
            priceDelta,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    ru.unit_id = newUnit.id;
    ru.unit_category_id = newUnit.category_id;
    ru.unit_space_number = newUnit.space_number || null;
    ru.unit_name = newUnit.unit_label || null;
    ru.length_ft = newUnit.length_ft || null;
    ru.base_monthly_rent = newUnit.base_monthly_price || 0;
    ru.effective_monthly_rent = newUnit.base_monthly_price || 0;

    reservationUnits[ruIdx] = ru;
    this._saveToStorage('reservation_units', reservationUnits);

    reservation.status = reservation.status === 'confirmed' ? 'modified' : reservation.status;
    reservation.updated_at = this._now();
    reservations[reservationIdx] = reservation;
    this._saveToStorage('reservations', reservations);

    const updatedRes = this._recalculateReservationTotals(reservation.id) || reservation;

    const updatedRuResolved = {
      ...ru,
      reservation: updatedRes,
      unit: newUnit
    };

    return { success: true, reservation: updatedRes, updatedReservationUnit: updatedRuResolved, message: '' };
  }

  // confirmReservationChanges(reservationId)
  confirmReservationChanges(reservationId) {
    let reservations = this._getFromStorage('reservations', []);
    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx === -1) {
      return { success: false, reservation: null, message: 'Reservation not found.' };
    }

    const reservation = reservations[idx];
    reservation.status = 'modified';
    reservation.updated_at = this._now();
    reservations[idx] = reservation;
    this._saveToStorage('reservations', reservations);

    return { success: true, reservation, message: '' };
  }

  // getFAQCategories()
  getFAQCategories() {
    return [
      { id: 'billing_payments', name: 'Billing & Payments' },
      { id: 'reservations', name: 'Reservations' },
      { id: 'security', name: 'Security' },
      { id: 'access', name: 'Access' },
      { id: 'general', name: 'General' }
    ];
  }

  // getFAQsByCategory(categoryId)
  getFAQsByCategory(categoryId) {
    const faqs = this._getFromStorage('faq_articles', []);

    // Instrumentation for task completion tracking (Task 7 billing FAQ viewed)
    try {
      if (categoryId === 'billing_payments') {
        localStorage.setItem('task7_billingFaqViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return faqs.filter(f => f.category === categoryId && (f.is_active === undefined || f.is_active === true));
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const facilities = this._getFromStorage('facilities', []);
    const primary = facilities[0] || null;

    return {
      phone: primary ? primary.phone || '' : '',
      email: primary ? primary.email || '' : '',
      hours: primary ? primary.hours || '' : '',
      address: primary
        ? {
            line1: primary.address_line1 || '',
            line2: primary.address_line2 || '',
            city: primary.city || '',
            state: primary.state || '',
            postalCode: primary.postal_code || ''
          }
        : { line1: '', line2: '', city: '', state: '', postalCode: '' },
      expectedResponseTime: '1-2 business days'
    };
  }

  // submitContactMessage(subjectType, name, email, phone, message, relatedReservationId)
  submitContactMessage(subjectType, name, email, phone, message, relatedReservationId) {
    const validSubjects = ['billing_question', 'reservation_question', 'general_question', 'technical_issue'];
    if (validSubjects.indexOf(subjectType) === -1) {
      subjectType = 'general_question';
    }

    const messages = this._getFromStorage('contact_messages', []);
    const contactMessage = {
      id: this._generateId('contact'),
      subject_type: subjectType,
      name,
      email,
      phone: phone || null,
      message,
      related_reservation_id: relatedReservationId || null,
      created_at: this._now(),
      status: 'new'
    };
    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    const reservations = this._getFromStorage('reservations', []);
    const relatedReservation = relatedReservationId ? reservations.find(r => r.id === relatedReservationId) || null : null;

    return {
      success: true,
      contactMessage: {
        ...contactMessage,
        relatedReservation
      },
      message: ''
    };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    return {
      headline: 'About Our RV & Boat Storage Facilities',
      bodyHtml: '<p>We provide secure, convenient RV and boat storage with flexible online reservations.</p>',
      highlights: [
        {
          title: 'Secure Facilities',
          description: 'Gated access, video surveillance, and well-lit lots.'
        },
        {
          title: 'Flexible Options',
          description: 'Covered and uncovered RV spaces plus indoor and outdoor boat storage.'
        }
      ],
      photos: [],
      testimonials: []
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      lastUpdated: this._now().slice(0, 10),
      sections: [
        {
          heading: 'Reservations',
          bodyHtml: '<p>All reservations are subject to facility availability and policies.</p>'
        },
        {
          heading: 'Payments',
          bodyHtml: '<p>Monthly rent is due on the first day of each billing period unless otherwise stated.</p>'
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: this._now().slice(0, 10),
      sections: [
        {
          heading: 'Data Collection',
          bodyHtml: '<p>We collect only the information necessary to manage your reservations and account.</p>'
        },
        {
          heading: 'Cookies',
          bodyHtml: '<p>We may use cookies to improve site functionality and user experience.</p>'
        }
      ]
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