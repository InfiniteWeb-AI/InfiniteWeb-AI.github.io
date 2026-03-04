'use strict';

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

  _initStorage() {
    const tables = [
      'movepackages',
      'movetimeslots',
      'quoterequests',
      'movebookings',
      'addons',
      'promotions',
      'insuranceplans',
      'packagecomparisonlists',
      'inventoryitems',
      'moveestimates',
      'estimateitems',
      'laborserviceoptions',
      'contactinquiries'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

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

  _now() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    if (!list || !id) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  _getOrCreateCurrentBooking() {
    let currentId = localStorage.getItem('currentBookingId');
    let bookings = this._getFromStorage('movebookings');

    if (currentId) {
      const existing = this._findById(bookings, currentId);
      if (existing) return existing;
    }

    const now = this._now();
    const booking = {
      id: this._generateId('mb'),
      created_at: now,
      updated_at: now,
      booking_status: 'draft',
      source_type: 'direct',
      source_reference_id: null,
      service_type: 'standard_move',
      move_scope: 'local',
      property_type: null,
      home_size: null,
      origin_street: null,
      origin_city: null,
      origin_zip: null,
      destination_street: null,
      destination_city: null,
      destination_zip: null,
      job_location_street: null,
      job_location_city: null,
      job_location_zip: null,
      move_date: null,
      timeslot_id: null,
      crew_size: null,
      includes_truck: null,
      labor_service_option_id: null,
      add_on_ids: [],
      package_id: null,
      estimate_id: null,
      base_hourly_rate: null,
      estimated_hours: null,
      subtotal_before_discounts: 0,
      discount_amount: 0,
      promo_code: null,
      promotion_id: null,
      insurance_plan_id: null,
      insurance_premium: 0,
      insured_value: null,
      total_estimated: 0,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_applied: false,
      insurance_selected: false,
      notes: null,
      labor_subtotal: 0,
      add_ons_subtotal: 0
    };

    bookings.push(booking);
    this._saveToStorage('movebookings', bookings);
    localStorage.setItem('currentBookingId', booking.id);
    return booking;
  }

  _recalculateBookingTotals(booking) {
    const packages = this._getFromStorage('movepackages');
    const timeslots = this._getFromStorage('movetimeslots');
    const addons = this._getFromStorage('addons');
    const insurancePlans = this._getFromStorage('insuranceplans');

    let laborSubtotal = 0;
    let addOnsSubtotal = 0;
    let insurancePremium = 0;

    let baseHourlyRate = booking.base_hourly_rate || 0;
    let estimatedHours = booking.estimated_hours || 0;

    // If a timeslot is selected, prefer its pricing
    if (booking.timeslot_id) {
      const slot = this._findById(timeslots, booking.timeslot_id);
      if (slot) {
        if (typeof slot.hourly_rate === 'number') {
          baseHourlyRate = slot.hourly_rate;
        }
        // If we have an estimated_total but no hours, try to infer hours
        if (typeof slot.estimated_total === 'number') {
          if (baseHourlyRate > 0 && estimatedHours === 0) {
            estimatedHours = slot.estimated_total / baseHourlyRate;
          }
        }
      }
    }

    if (baseHourlyRate > 0 && estimatedHours > 0) {
      laborSubtotal = baseHourlyRate * estimatedHours;
    }

    // Add-ons
    if (Array.isArray(booking.add_on_ids) && booking.add_on_ids.length > 0) {
      for (let i = 0; i < booking.add_on_ids.length; i++) {
        const addOnId = booking.add_on_ids[i];
        const addOn = this._findById(addons, addOnId);
        if (!addOn || addOn.is_active === false) continue;
        const amount = Number(addOn.price_amount) || 0;
        if (addOn.price_type === 'flat_fee') {
          addOnsSubtotal += amount;
        } else if (addOn.price_type === 'per_hour') {
          addOnsSubtotal += amount * (estimatedHours || 0);
        } else if (addOn.price_type === 'percentage_of_labor') {
          addOnsSubtotal += laborSubtotal * (amount / 100);
        }
      }
    }

    // Insurance
    if (booking.insurance_plan_id) {
      const plan = this._findById(insurancePlans, booking.insurance_plan_id);
      if (plan && plan.is_active !== false) {
        let insuredValue = booking.insured_value;
        if (!insuredValue || insuredValue <= 0) {
          insuredValue = plan.coverage_limit || 0;
          booking.insured_value = insuredValue;
        }
        if (plan.price_type === 'flat_fee') {
          insurancePremium = Number(plan.price_amount) || 0;
        } else if (plan.price_type === 'percentage_of_estimate') {
          const baseForInsurance = laborSubtotal + addOnsSubtotal;
          insurancePremium = baseForInsurance * ((Number(plan.price_amount) || 0) / 100);
        }
        booking.insurance_selected = true;
      }
    }

    const subtotalBeforeDiscounts = laborSubtotal + addOnsSubtotal + insurancePremium;
    booking.labor_subtotal = laborSubtotal;
    booking.add_ons_subtotal = addOnsSubtotal;
    booking.insurance_premium = insurancePremium;
    booking.subtotal_before_discounts = subtotalBeforeDiscounts;

    const discount = Number(booking.discount_amount) || 0;
    booking.total_estimated = Math.max(subtotalBeforeDiscounts - discount, 0);

    // persist changes in storage
    let bookings = this._getFromStorage('movebookings');
    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking.id) {
        bookings[i] = booking;
        break;
      }
    }
    this._saveToStorage('movebookings', bookings);

    return {
      labor_subtotal: laborSubtotal,
      add_ons_subtotal: addOnsSubtotal,
      insurance_premium: insurancePremium,
      subtotal_before_discounts: subtotalBeforeDiscounts,
      discount_amount: discount,
      total_estimated: booking.total_estimated
    };
  }

  _getOrCreatePackageComparisonList() {
    let currentId = localStorage.getItem('currentComparisonListId');
    let lists = this._getFromStorage('packagecomparisonlists');

    if (currentId) {
      const existing = this._findById(lists, currentId);
      if (existing) return existing;
    }

    const now = this._now();
    const list = {
      id: this._generateId('pcl'),
      package_ids: [],
      created_at: now,
      updated_at: now,
      last_viewed_at: now
    };

    lists.push(list);
    this._saveToStorage('packagecomparisonlists', lists);
    localStorage.setItem('currentComparisonListId', list.id);
    return list;
  }

  _calculateEstimateTotals(estimate, itemsForEstimate) {
    let subtotal = 0;
    for (let i = 0; i < itemsForEstimate.length; i++) {
      subtotal += Number(itemsForEstimate[i].line_total) || 0;
    }
    // Simple tax logic; can be extended as needed
    const tax = 0;
    const total = subtotal + tax;
    estimate.subtotal = subtotal;
    estimate.tax = tax;
    estimate.total = total;
    return estimate;
  }

  _validateAndApplyPromotion(booking, promotion) {
    const nowIso = this._now();
    const nowMs = Date.parse(nowIso);

    if (!promotion || promotion.is_active === false) {
      return { ok: false, message: 'Promotion not found or inactive.' };
    }

    if (promotion.start_date) {
      const startMs = Date.parse(promotion.start_date);
      if (!isNaN(startMs) && nowMs < startMs) {
        return { ok: false, message: 'Promotion is not yet active.' };
      }
    }

    if (promotion.end_date) {
      const endMs = Date.parse(promotion.end_date);
      if (!isNaN(endMs) && nowMs > endMs) {
        return { ok: false, message: 'Promotion has expired.' };
      }
    }

    if (promotion.applies_to_move_scope && promotion.applies_to_move_scope !== 'any') {
      if (booking.move_scope && booking.move_scope !== promotion.applies_to_move_scope) {
        return { ok: false, message: 'Promotion does not apply to this move scope.' };
      }
    }

    if (promotion.applies_to_service_type && promotion.applies_to_service_type !== 'any') {
      if (booking.service_type && booking.service_type !== promotion.applies_to_service_type) {
        return { ok: false, message: 'Promotion does not apply to this service type.' };
      }
    }

    // Ensure booking subtotal is up to date
    this._recalculateBookingTotals(booking);

    const subtotal = Number(booking.subtotal_before_discounts) || 0;
    if (promotion.min_subtotal && subtotal < promotion.min_subtotal) {
      return { ok: false, message: 'Booking subtotal does not meet promotion minimum.' };
    }

    let discount = 0;
    const amount = Number(promotion.discount_amount) || 0;
    if (promotion.discount_type === 'fixed_amount') {
      discount = amount;
    } else if (promotion.discount_type === 'percentage') {
      discount = subtotal * (amount / 100);
    }

    booking.promotion_id = promotion.id;
    booking.promo_code = promotion.code;
    booking.promo_applied = true;
    booking.discount_amount = discount;
    booking.total_estimated = Math.max(subtotal - discount, 0);
    booking.updated_at = this._now();

    let bookings = this._getFromStorage('movebookings');
    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking.id) {
        bookings[i] = booking;
        break;
      }
    }
    this._saveToStorage('movebookings', bookings);

    return { ok: true, message: 'Promotion applied.' };
  }

  _getCurrentQuoteDraft() {
    let currentId = localStorage.getItem('currentQuoteDraftId');
    let quotes = this._getFromStorage('quoterequests');

    if (currentId) {
      const existing = this._findById(quotes, currentId);
      if (existing) return existing;
    }

    const now = this._now();
    const draft = {
      id: this._generateId('qr'),
      created_at: now,
      updated_at: now,
      origin_street: '',
      origin_city: '',
      origin_zip: '',
      destination_street: '',
      destination_city: '',
      destination_zip: '',
      home_size: 'studio',
      move_scope: 'local',
      service_type: 'standard_move',
      move_date: now,
      preferred_timeslot_id: null,
      selected_hourly_rate: null,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      status: 'draft',
      notes: null
    };

    quotes.push(draft);
    this._saveToStorage('quoterequests', quotes);
    localStorage.setItem('currentQuoteDraftId', draft.id);
    return draft;
  }

  _withResolvedTimeSlotRelations(slot) {
    if (!slot) return null;
    const packages = this._getFromStorage('movepackages');
    const enriched = Object.assign({}, slot);
    if (slot.package_id) {
      enriched.package = this._findById(packages, slot.package_id) || null;
    } else {
      enriched.package = null;
    }
    return enriched;
  }

  _withResolvedPackageRelations(pkg) {
    if (!pkg) return null;
    const addons = this._getFromStorage('addons');
    const enriched = Object.assign({}, pkg);
    if (Array.isArray(pkg.included_add_on_ids)) {
      const included = [];
      for (let i = 0; i < pkg.included_add_on_ids.length; i++) {
        const ao = this._findById(addons, pkg.included_add_on_ids[i]);
        if (ao) included.push(ao);
      }
      enriched.included_add_ons = included;
    } else {
      enriched.included_add_ons = [];
    }
    return enriched;
  }

  _withResolvedEstimateItemRelations(items) {
    const inventoryItems = this._getFromStorage('inventoryitems');
    const result = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const enriched = Object.assign({}, it);
      enriched.inventory_item = this._findById(inventoryItems, it.inventory_item_id) || null;
      result.push(enriched);
    }
    return result;
  }

  _withResolvedBookingRelations(booking) {
    const timeslots = this._getFromStorage('movetimeslots');
    const packages = this._getFromStorage('movepackages');
    const estimates = this._getFromStorage('moveestimates');
    const promotions = this._getFromStorage('promotions');
    const insurancePlans = this._getFromStorage('insuranceplans');
    const laborOptions = this._getFromStorage('laborserviceoptions');
    const addons = this._getFromStorage('addons');

    const enriched = JSON.parse(JSON.stringify(booking));

    if (booking.timeslot_id) {
      enriched.timeslot = this._findById(timeslots, booking.timeslot_id) || null;
      if (enriched.timeslot && enriched.timeslot.package_id) {
        enriched.timeslot = this._withResolvedTimeSlotRelations(enriched.timeslot);
      }
    } else {
      enriched.timeslot = null;
    }

    if (booking.package_id) {
      enriched.package = this._withResolvedPackageRelations(this._findById(packages, booking.package_id));
    } else {
      enriched.package = null;
    }

    if (booking.estimate_id) {
      enriched.estimate = this._findById(estimates, booking.estimate_id) || null;
    } else {
      enriched.estimate = null;
    }

    if (booking.promotion_id) {
      enriched.promotion = this._findById(promotions, booking.promotion_id) || null;
    } else {
      enriched.promotion = null;
    }

    if (booking.insurance_plan_id) {
      enriched.insurance_plan = this._findById(insurancePlans, booking.insurance_plan_id) || null;
    } else {
      enriched.insurance_plan = null;
    }

    if (booking.labor_service_option_id) {
      enriched.labor_service_option = this._findById(laborOptions, booking.labor_service_option_id) || null;
    } else {
      enriched.labor_service_option = null;
    }

    if (Array.isArray(booking.add_on_ids)) {
      const selectedAddOns = [];
      for (let i = 0; i < booking.add_on_ids.length; i++) {
        const ao = this._findById(addons, booking.add_on_ids[i]);
        if (ao) selectedAddOns.push(ao);
      }
      enriched.add_ons = selectedAddOns;
    } else {
      enriched.add_ons = [];
    }

    return enriched;
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomePageContent()
  getHomePageContent() {
    const promotions = this._getFromStorage('promotions');
    const nowMs = Date.now();
    const featured = [];
    for (let i = 0; i < promotions.length; i++) {
      const p = promotions[i];
      if (p.is_active === false) continue;
      let ok = true;
      if (p.start_date) {
        const s = Date.parse(p.start_date);
        if (!isNaN(s) && nowMs < s) ok = false;
      }
      if (p.end_date) {
        const e = Date.parse(p.end_date);
        if (!isNaN(e) && nowMs > e) ok = false;
      }
      if (ok) featured.push(p);
    }

    return {
      hero_title: 'Stress-free local moving in your neighborhood',
      hero_subtitle: 'Licensed and insured movers specializing in local apartment and house moves.',
      service_highlights: [
        {
          service_code: 'local_moves',
          title: 'Local moves within city limits',
          description: 'Fast, efficient moves within our local service area.'
        },
        {
          service_code: 'full_service_move',
          title: 'Full-service packing and moving',
          description: 'We pack, load, move, and unload so you can focus on settling in.'
        },
        {
          service_code: 'labor_only',
          title: 'Labor-only moving help',
          description: 'Need extra hands for loading or unloading your own truck or pod? We can help.'
        },
        {
          service_code: 'storage_add_on',
          title: 'Short-term storage add-ons',
          description: 'Flexible storage options when move-in and move-out do not line up.'
        }
      ],
      trust_signals: [
        {
          label: 'Average rating',
          value: '4.8 / 5',
          type: 'review_score'
        },
        {
          label: 'Years in business',
          value: '10+',
          type: 'years_in_business'
        },
        {
          label: 'Fully licensed & insured',
          value: 'Yes',
          type: 'licensed_insured_badge'
        }
      ],
      featured_promotions: featured,
      primary_ctas: [
        { action_code: 'get_quote', label: 'Get a quote' },
        { action_code: 'book_move', label: 'Book your move' },
        { action_code: 'cost_estimator', label: 'Estimate your move cost' },
        { action_code: 'labor_only_services', label: 'Book labor-only help' }
      ]
    };
  }

  // getQuoteRequestPageInitData()
  getQuoteRequestPageInitData() {
    return {
      default_move_scope: 'local',
      home_size_options: [
        { value: 'studio', label: 'Studio' },
        { value: '1_bedroom', label: '1 Bedroom' },
        { value: '2_bedroom_apartment', label: '2 Bedroom Apartment' },
        { value: '3_bedroom_house', label: '3 Bedroom House' }
      ],
      service_type_options: [
        {
          value: 'standard_move',
          label: 'Standard move',
          description: 'You handle packing, we handle loading, transport, and unloading.'
        },
        {
          value: 'full_service_move',
          label: 'Full-service move',
          description: 'We provide packing, moving, and basic unpacking.'
        }
      ],
      help_text: 'Tell us about your move and we will email you a detailed quote within one business day.'
    };
  }

  // getAvailableQuoteTimeSlots(move_date, move_scope, service_type, home_size, origin_zip, destination_zip, max_hourly_rate)
  getAvailableQuoteTimeSlots(move_date, move_scope, service_type, home_size, origin_zip, destination_zip, max_hourly_rate) {
    const slots = this._getFromStorage('movetimeslots');
    const filtered = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.is_available === false) continue;
      if (s.move_scope !== move_scope) continue;
      if (s.service_type !== service_type) continue;
      const dateStr = typeof s.date === 'string' ? s.date.substring(0, 10) : '';
      if (dateStr !== move_date) continue;
      if (typeof max_hourly_rate === 'number' && s.hourly_rate > max_hourly_rate) continue;
      filtered.push(this._withResolvedTimeSlotRelations(s));
    }

    // Fallback: if no stored slots match, synthesize generic slots from available packages
    if (filtered.length === 0) {
      const packages = this._getFromStorage('movepackages');
      const newSlots = [];
      for (let j = 0; j < packages.length; j++) {
        const p = packages[j];
        if (p.is_active === false) continue;
        if (move_scope && p.move_scope !== move_scope) continue;
        if (service_type && p.service_type !== service_type) continue;
        if (
          typeof max_hourly_rate === 'number' &&
          typeof p.base_hourly_rate === 'number' &&
          p.base_hourly_rate > max_hourly_rate
        ) {
          continue;
        }
        const rate = typeof p.base_hourly_rate === 'number' ? p.base_hourly_rate : 0;
        const slot = {
          id: 'slot_' + move_date + '_' + (service_type || 'service') + '_' + p.id,
          date: move_date + 'T00:00:00Z',
          start_time: '09:00',
          end_time: '12:00',
          service_type: service_type || p.service_type,
          move_scope: move_scope || p.move_scope,
          crew_size: p.crew_size,
          package_id: p.id,
          hourly_rate: rate,
          estimated_total:
            typeof p.estimated_total_4_hours === 'number' ? p.estimated_total_4_hours : rate * 4,
          includes_insurance: false,
          max_bookings: 3,
          notes: 'Auto-generated availability slot.',
          created_at: this._now(),
          updated_at: this._now(),
          is_available: true
        };
        newSlots.push(slot);
      }
      if (newSlots.length > 0) {
        const updatedSlots = slots.concat(newSlots);
        this._saveToStorage('movetimeslots', updatedSlots);
        for (let k = 0; k < newSlots.length; k++) {
          filtered.push(this._withResolvedTimeSlotRelations(newSlots[k]));
        }
      }
    }

    return filtered;
  }

  // submitQuoteRequest(...)
  submitQuoteRequest(
    origin_street,
    origin_city,
    origin_zip,
    destination_street,
    destination_city,
    destination_zip,
    home_size,
    move_scope,
    service_type,
    move_date,
    preferred_timeslot_id,
    selected_hourly_rate,
    contact_name,
    contact_phone,
    contact_email,
    notes
  ) {
    let quotes = this._getFromStorage('quoterequests');
    const now = this._now();

    // Use existing draft if present
    let draft = null;
    const currentDraftId = localStorage.getItem('currentQuoteDraftId');
    if (currentDraftId) {
      draft = this._findById(quotes, currentDraftId);
    }

    if (!draft) {
      draft = {
        id: this._generateId('qr'),
        created_at: now,
        updated_at: now,
        origin_street: '',
        origin_city: '',
        origin_zip: '',
        destination_street: '',
        destination_city: '',
        destination_zip: '',
        home_size: home_size,
        move_scope: move_scope,
        service_type: service_type,
        move_date: new Date(move_date).toISOString(),
        preferred_timeslot_id: preferred_timeslot_id || null,
        selected_hourly_rate: selected_hourly_rate || null,
        contact_name: contact_name,
        contact_phone: contact_phone,
        contact_email: contact_email,
        status: 'submitted',
        notes: notes || null
      };
      quotes.push(draft);
    } else {
      draft.origin_street = origin_street;
      draft.origin_city = origin_city || '';
      draft.origin_zip = origin_zip;
      draft.destination_street = destination_street;
      draft.destination_city = destination_city || '';
      draft.destination_zip = destination_zip;
      draft.home_size = home_size;
      draft.move_scope = move_scope;
      draft.service_type = service_type || draft.service_type;
      draft.move_date = new Date(move_date).toISOString();
      draft.preferred_timeslot_id = preferred_timeslot_id || null;
      draft.selected_hourly_rate = typeof selected_hourly_rate === 'number' ? selected_hourly_rate : null;
      draft.contact_name = contact_name;
      draft.contact_phone = contact_phone;
      draft.contact_email = contact_email;
      draft.status = 'submitted';
      draft.notes = notes || null;
      draft.updated_at = now;
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === draft.id) {
          quotes[i] = draft;
          break;
        }
      }
    }

    this._saveToStorage('quoterequests', quotes);

    return {
      success: true,
      quote_request: draft,
      message: 'Quote request submitted.'
    };
  }

  // startMoveBooking(source_type, source_reference_id)
  startMoveBooking(source_type, source_reference_id) {
    const now = this._now();
    let serviceType = 'standard_move';
    if (source_type === 'labor_only') {
      serviceType = 'labor_only';
    }

    const booking = {
      id: this._generateId('mb'),
      created_at: now,
      updated_at: now,
      booking_status: 'draft',
      source_type: source_type,
      source_reference_id: source_reference_id || null,
      service_type: serviceType,
      move_scope: 'local',
      property_type: null,
      home_size: null,
      origin_street: null,
      origin_city: null,
      origin_zip: null,
      destination_street: null,
      destination_city: null,
      destination_zip: null,
      job_location_street: null,
      job_location_city: null,
      job_location_zip: null,
      move_date: null,
      timeslot_id: null,
      crew_size: null,
      includes_truck: null,
      labor_service_option_id: null,
      add_on_ids: [],
      package_id: null,
      estimate_id: null,
      base_hourly_rate: null,
      estimated_hours: null,
      subtotal_before_discounts: 0,
      discount_amount: 0,
      promo_code: null,
      promotion_id: null,
      insurance_plan_id: null,
      insurance_premium: 0,
      insured_value: null,
      total_estimated: 0,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_applied: false,
      insurance_selected: false,
      notes: null,
      labor_subtotal: 0,
      add_ons_subtotal: 0
    };

    const bookings = this._getFromStorage('movebookings');
    bookings.push(booking);
    this._saveToStorage('movebookings', bookings);
    localStorage.setItem('currentBookingId', booking.id);

    return {
      success: true,
      booking: booking,
      message: 'Booking started.'
    };
  }

  // getMoveBookingFormOptions()
  getMoveBookingFormOptions() {
    const addons = this._getFromStorage('addons').filter(function (a) { return a.is_active !== false; });
    const insurancePlans = this._getFromStorage('insuranceplans').filter(function (p) { return p.is_active !== false; });

    return {
      service_type_options: [
        {
          value: 'standard_move',
          label: 'Standard move',
          description: 'You pack, we move.'
        },
        {
          value: 'full_service_move',
          label: 'Full-service move',
          description: 'We handle packing and moving.'
        },
        {
          value: 'labor_only',
          label: 'Labor-only help',
          description: 'Moving help without a truck.'
        }
      ],
      property_type_options: [
        { value: 'apartment_condo', label: 'Apartment / Condo' },
        { value: 'house', label: 'House' },
        { value: 'office', label: 'Office' },
        { value: 'storage_unit', label: 'Storage unit' }
      ],
      home_size_options: [
        { value: 'studio', label: 'Studio' },
        { value: '1_bedroom', label: '1 Bedroom' },
        { value: '2_bedroom_apartment', label: '2 Bedroom Apartment' },
        { value: '3_bedroom_house', label: '3 Bedroom House' }
      ],
      crew_size_options: [
        { value: 2, label: '2 movers' },
        { value: 3, label: '3 movers' },
        { value: 4, label: '4 movers' }
      ],
      add_on_options: addons,
      insurance_plan_options: insurancePlans
    };
  }

  // getAvailableMovePackages(...)
  getAvailableMovePackages(service_type, move_scope, crew_size, includes_truck, hourly_rate_min, hourly_rate_max, rating_min, min_review_count, sort_by, limit) {
    const packages = this._getFromStorage('movepackages');
    const filtered = [];

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (p.is_active === false) continue;
      if (service_type && p.service_type !== service_type) continue;
      if (move_scope && p.move_scope !== move_scope) continue;
      if (typeof crew_size === 'number' && p.crew_size !== crew_size) continue;
      if (typeof includes_truck === 'boolean') {
        if (p.includes_truck !== includes_truck) continue;
      }
      if (typeof hourly_rate_min === 'number' && p.base_hourly_rate < hourly_rate_min) continue;
      if (typeof hourly_rate_max === 'number' && p.base_hourly_rate > hourly_rate_max) continue;
      if (typeof rating_min === 'number') {
        const rating = typeof p.rating === 'number' ? p.rating : 0;
        if (rating < rating_min) continue;
      }
      if (typeof min_review_count === 'number') {
        const rc = typeof p.review_count === 'number' ? p.review_count : 0;
        if (rc < min_review_count) continue;
      }
      filtered.push(p);
    }

    const sortBy = sort_by || 'display_order';
    filtered.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      const pa = typeof a.base_hourly_rate === 'number' ? a.base_hourly_rate : 0;
      const pb = typeof b.base_hourly_rate === 'number' ? b.base_hourly_rate : 0;
      const ca = typeof a.crew_size === 'number' ? a.crew_size : 0;
      const cb = typeof b.crew_size === 'number' ? b.crew_size : 0;
      const da = typeof a.display_order === 'number' ? a.display_order : 0;
      const db = typeof b.display_order === 'number' ? b.display_order : 0;

      switch (sortBy) {
        case 'rating_desc':
          return rb - ra;
        case 'rating_asc':
          return ra - rb;
        case 'price_asc':
          return pa - pb;
        case 'price_desc':
          return pb - pa;
        case 'crew_size_asc':
          return ca - cb;
        case 'crew_size_desc':
          return cb - ca;
        case 'display_order':
        default:
          return da - db;
      }
    });

    let limited = filtered;
    if (typeof limit === 'number' && limit > 0 && filtered.length > limit) {
      limited = filtered.slice(0, limit);
    }

    const addons = this._getFromStorage('addons');
    const result = [];
    for (let i = 0; i < limited.length; i++) {
      const pkg = limited[i];
      const enriched = Object.assign({}, pkg);
      if (Array.isArray(pkg.included_add_on_ids)) {
        const included = [];
        for (let j = 0; j < pkg.included_add_on_ids.length; j++) {
          const ao = this._findById(addons, pkg.included_add_on_ids[j]);
          if (ao) included.push(ao);
        }
        enriched.included_add_ons = included;
      } else {
        enriched.included_add_ons = [];
      }
      result.push(enriched);
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      if (
        move_scope === 'local' &&
        typeof hourly_rate_max === 'number' &&
        hourly_rate_max <= 140 &&
        typeof rating_min === 'number' &&
        rating_min >= 4.0 &&
        typeof min_review_count === 'number' &&
        min_review_count >= 20 &&
        sort_by === 'rating_desc'
      ) {
        localStorage.setItem(
          'task3_filterParams',
          JSON.stringify({
            service_type,
            move_scope,
            hourly_rate_max,
            hourly_rate_min,
            rating_min,
            min_review_count,
            sort_by,
            limit,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getAvailableTimeSlotsForCurrentBooking(move_date, max_hourly_rate, max_total_estimate, sort_by)
  getAvailableTimeSlotsForCurrentBooking(move_date, max_hourly_rate, max_total_estimate, sort_by) {
    const booking = this._getOrCreateCurrentBooking();
    const slots = this._getFromStorage('movetimeslots');
    const filtered = [];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.is_available === false) continue;
      if (booking.service_type && s.service_type !== booking.service_type) continue;
      if (booking.move_scope && s.move_scope !== booking.move_scope) continue;
      const dateStr = typeof s.date === 'string' ? s.date.substring(0, 10) : '';
      if (move_date && dateStr !== move_date) continue;
      if (typeof booking.crew_size === 'number' && typeof s.crew_size === 'number' && booking.crew_size !== s.crew_size) {
        continue;
      }
      if (typeof max_hourly_rate === 'number' && s.hourly_rate > max_hourly_rate) continue;
      if (typeof max_total_estimate === 'number' && typeof s.estimated_total === 'number' && s.estimated_total > max_total_estimate) continue;
      filtered.push(s);
    }

    // Fallback: if no matching stored slots, synthesize generic slots from available packages
    if (filtered.length === 0) {
      const packages = this._getFromStorage('movepackages');
      const newSlots = [];
      for (let j = 0; j < packages.length; j++) {
        const p = packages[j];
        if (p.is_active === false) continue;
        if (booking.move_scope && p.move_scope !== booking.move_scope) continue;
        if (typeof booking.crew_size === 'number' && typeof p.crew_size === 'number' && booking.crew_size !== p.crew_size) {
          continue;
        }
        const rate = typeof p.base_hourly_rate === 'number' ? p.base_hourly_rate : 0;
        if (typeof max_hourly_rate === 'number' && rate > max_hourly_rate) continue;
        const estimatedHours =
          typeof booking.estimated_hours === 'number' && booking.estimated_hours > 0
            ? booking.estimated_hours
            : typeof p.min_hours === 'number' && p.min_hours > 0
            ? p.min_hours
            : 4;
        const estimatedTotal =
          typeof p.estimated_total_4_hours === 'number'
            ? p.estimated_total_4_hours
            : rate * estimatedHours;
        if (
          typeof max_total_estimate === 'number' &&
          typeof estimatedTotal === 'number' &&
          estimatedTotal > max_total_estimate
        ) {
          continue;
        }
        const slot = {
          id:
            'slot_' +
            (move_date || new Date().toISOString().substring(0, 10)) +
            '_' +
            (booking.service_type || p.service_type || 'service') +
            '_' +
            p.id,
          date: (move_date ? move_date : new Date().toISOString().substring(0, 10)) + 'T00:00:00Z',
          start_time: '09:00',
          end_time: '12:00',
          service_type: booking.service_type || p.service_type,
          move_scope: booking.move_scope || p.move_scope,
          crew_size: p.crew_size,
          package_id: p.id,
          hourly_rate: rate,
          estimated_total: estimatedTotal,
          includes_insurance: false,
          max_bookings: 3,
          notes: 'Auto-generated availability slot.',
          created_at: this._now(),
          updated_at: this._now(),
          is_available: true
        };
        newSlots.push(slot);
      }
      if (newSlots.length > 0) {
        const updatedSlots = slots.concat(newSlots);
        this._saveToStorage('movetimeslots', updatedSlots);
        for (let k = 0; k < newSlots.length; k++) {
          filtered.push(newSlots[k]);
        }
      }
    }

    const sortBy = sort_by || 'start_time_asc';
    filtered.sort(function (a, b) {
      const sa = a.start_time || '';
      const sb = b.start_time || '';
      const pa = typeof a.estimated_total === 'number' ? a.estimated_total : 0;
      const pb = typeof b.estimated_total === 'number' ? b.estimated_total : 0;
      switch (sortBy) {
        case 'start_time_desc':
          return sb.localeCompare(sa);
        case 'price_asc':
          return pa - pb;
        case 'price_desc':
          return pb - pa;
        case 'start_time_asc':
        default:
          return sa.localeCompare(sb);
      }
    });

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      result.push(this._withResolvedTimeSlotRelations(filtered[i]));
    }
    return result;
  }

  // updateCurrentMoveBooking(...)
  updateCurrentMoveBooking(
    service_type,
    move_scope,
    property_type,
    home_size,
    origin_street,
    origin_city,
    origin_zip,
    destination_street,
    destination_city,
    destination_zip,
    job_location_street,
    job_location_city,
    job_location_zip,
    move_date,
    timeslot_id,
    crew_size,
    includes_truck,
    labor_service_option_id,
    add_on_ids,
    package_id,
    estimate_id,
    estimated_hours,
    contact_name,
    contact_phone,
    contact_email,
    notes
  ) {
    let booking = this._getOrCreateCurrentBooking();
    const now = this._now();

    if (service_type) booking.service_type = service_type;
    if (move_scope) booking.move_scope = move_scope;
    if (property_type) booking.property_type = property_type;
    if (home_size) booking.home_size = home_size;
    if (origin_street !== undefined) booking.origin_street = origin_street;
    if (origin_city !== undefined) booking.origin_city = origin_city;
    if (origin_zip !== undefined) booking.origin_zip = origin_zip;
    if (destination_street !== undefined) booking.destination_street = destination_street;
    if (destination_city !== undefined) booking.destination_city = destination_city;
    if (destination_zip !== undefined) booking.destination_zip = destination_zip;
    if (job_location_street !== undefined) booking.job_location_street = job_location_street;
    if (job_location_city !== undefined) booking.job_location_city = job_location_city;
    if (job_location_zip !== undefined) booking.job_location_zip = job_location_zip;
    if (move_date) booking.move_date = new Date(move_date).toISOString();
    if (timeslot_id) booking.timeslot_id = timeslot_id;
    if (typeof crew_size === 'number') booking.crew_size = crew_size;
    if (typeof includes_truck === 'boolean') booking.includes_truck = includes_truck;
    if (labor_service_option_id) booking.labor_service_option_id = labor_service_option_id;
    if (Array.isArray(add_on_ids)) booking.add_on_ids = add_on_ids.slice();
    if (package_id) booking.package_id = package_id;
    if (estimate_id) booking.estimate_id = estimate_id;
    if (typeof estimated_hours === 'number') booking.estimated_hours = estimated_hours;
    if (contact_name !== undefined) booking.contact_name = contact_name;
    if (contact_phone !== undefined) booking.contact_phone = contact_phone;
    if (contact_email !== undefined) booking.contact_email = contact_email;
    if (notes !== undefined) booking.notes = notes;

    booking.updated_at = now;

    // Recalculate totals
    this._recalculateBookingTotals(booking);

    // Booking is already persisted in _recalculateBookingTotals
    return {
      success: true,
      booking: booking,
      message: 'Booking updated.'
    };
  }

  // applyPromoCodeToCurrentBooking(promo_code)
  applyPromoCodeToCurrentBooking(promo_code) {
    const promotions = this._getFromStorage('promotions');
    const codeUpper = String(promo_code || '').trim().toUpperCase();
    let promotion = null;
    for (let i = 0; i < promotions.length; i++) {
      if (String(promotions[i].code || '').trim().toUpperCase() === codeUpper) {
        promotion = promotions[i];
        break;
      }
    }

    const booking = this._getOrCreateCurrentBooking();

    if (!promotion) {
      return {
        success: false,
        booking: booking,
        applied_promotion: null,
        message: 'Invalid promo code.'
      };
    }

    const result = this._validateAndApplyPromotion(booking, promotion);
    if (!result.ok) {
      return {
        success: false,
        booking: booking,
        applied_promotion: null,
        message: result.message
      };
    }

    return {
      success: true,
      booking: booking,
      applied_promotion: promotion,
      message: 'Promo code applied.'
    };
  }

  // updateCurrentBookingInsurance(insurance_plan_id, insured_value)
  updateCurrentBookingInsurance(insurance_plan_id, insured_value) {
    const booking = this._getOrCreateCurrentBooking();
    const plans = this._getFromStorage('insuranceplans');
    const plan = this._findById(plans, insurance_plan_id);

    if (!plan || plan.is_active === false) {
      return {
        success: false,
        booking: booking,
        message: 'Insurance plan not found.'
      };
    }

    booking.insurance_plan_id = plan.id;
    booking.insurance_selected = true;
    if (typeof insured_value === 'number' && insured_value > 0) {
      booking.insured_value = insured_value;
    } else {
      booking.insured_value = plan.coverage_limit || null;
    }
    booking.updated_at = this._now();

    this._recalculateBookingTotals(booking);

    return {
      success: true,
      booking: booking,
      message: 'Insurance updated.'
    };
  }

  // getCurrentMoveBookingSummary()
  getCurrentMoveBookingSummary() {
    const booking = this._getOrCreateCurrentBooking();
    const totals = this._recalculateBookingTotals(booking);
    const enrichedBooking = this._withResolvedBookingRelations(booking);

    return {
      booking: enrichedBooking,
      cost_breakdown: {
        labor_subtotal: totals.labor_subtotal,
        add_ons_subtotal: totals.add_ons_subtotal,
        insurance_premium: totals.insurance_premium,
        discount_amount: totals.discount_amount,
        total_estimated: totals.total_estimated
      }
    };
  }

  // confirmCurrentMoveBooking(contact_name, contact_phone, contact_email, accept_terms)
  confirmCurrentMoveBooking(contact_name, contact_phone, contact_email, accept_terms) {
    if (!accept_terms) {
      return {
        success: false,
        booking: null,
        confirmation_number: null,
        message: 'You must accept the terms and conditions to confirm the booking.'
      };
    }

    const booking = this._getOrCreateCurrentBooking();
    booking.contact_name = contact_name;
    booking.contact_phone = contact_phone;
    booking.contact_email = contact_email;
    booking.booking_status = 'pending';
    booking.updated_at = this._now();

    this._recalculateBookingTotals(booking);

    let bookings = this._getFromStorage('movebookings');
    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking.id) {
        bookings[i] = booking;
        break;
      }
    }
    this._saveToStorage('movebookings', bookings);

    const confirmationNumber = 'CONF-' + booking.id;
    return {
      success: true,
      booking: booking,
      confirmation_number: confirmationNumber,
      message: 'Booking submitted. You will receive a confirmation email shortly.'
    };
  }

  // getPricingPageFilterOptions()
  getPricingPageFilterOptions() {
    const packages = this._getFromStorage('movepackages');
    let minRate = null;
    let maxRate = null;
    let minRating = 5;
    let maxRating = 0;

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (typeof p.base_hourly_rate === 'number') {
        if (minRate === null || p.base_hourly_rate < minRate) minRate = p.base_hourly_rate;
        if (maxRate === null || p.base_hourly_rate > maxRate) maxRate = p.base_hourly_rate;
      }
      if (typeof p.rating === 'number') {
        if (p.rating < minRating) minRating = p.rating;
        if (p.rating > maxRating) maxRating = p.rating;
      }
    }

    if (minRate === null) {
      minRate = 50;
      maxRate = 300;
    }
    if (maxRating === 0 && minRating === 5) {
      minRating = 0;
      maxRating = 5;
    }

    return {
      service_type_options: [
        { value: 'standard_move', label: 'Standard moves' },
        { value: 'full_service_move', label: 'Full-service moves' },
        { value: 'labor_only', label: 'Labor-only help' }
      ],
      move_scope_options: [
        { value: 'local', label: 'Local moves (within 50 miles)' },
        { value: 'long_distance', label: 'Long-distance moves' }
      ],
      hourly_rate_range: {
        min: minRate,
        max: maxRate
      },
      rating_range: {
        min: minRating,
        max: maxRating
      },
      review_count_buckets: [
        { label: 'All', min_reviews: 0 },
        { label: '10+ reviews', min_reviews: 10 },
        { label: '20+ reviews', min_reviews: 20 },
        { label: '50+ reviews', min_reviews: 50 }
      ],
      sort_options: [
        { value: 'rating_desc', label: 'Customer rating: High to Low' },
        { value: 'rating_asc', label: 'Customer rating: Low to High' },
        { value: 'price_asc', label: 'Hourly rate: Low to High' },
        { value: 'price_desc', label: 'Hourly rate: High to Low' },
        { value: 'crew_size_asc', label: 'Crew size: Small to Large' },
        { value: 'crew_size_desc', label: 'Crew size: Large to Small' },
        { value: 'display_order', label: 'Featured' }
      ]
    };
  }

  // addPackageToComparisonList(package_id)
  addPackageToComparisonList(package_id) {
    const packages = this._getFromStorage('movepackages');
    const pkg = this._findById(packages, package_id);
    if (!pkg) {
      return {
        success: false,
        comparison_list: null,
        message: 'Package not found.'
      };
    }

    const list = this._getOrCreatePackageComparisonList();
    if (list.package_ids.indexOf(package_id) === -1) {
      list.package_ids.push(package_id);
      list.updated_at = this._now();
      list.last_viewed_at = list.updated_at;
      const lists = this._getFromStorage('packagecomparisonlists');
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === list.id) {
          lists[i] = list;
          break;
        }
      }
      this._saveToStorage('packagecomparisonlists', lists);
    }

    return {
      success: true,
      comparison_list: list,
      message: 'Package added to comparison.'
    };
  }

  // getCurrentPackageComparisonSummary()
  getCurrentPackageComparisonSummary() {
    const list = this._getOrCreatePackageComparisonList();
    list.last_viewed_at = this._now();
    const lists = this._getFromStorage('packagecomparisonlists');
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === list.id) {
        lists[i] = list;
        break;
      }
    }
    this._saveToStorage('packagecomparisonlists', lists);

    return {
      comparison_list: list
    };
  }

  // getPackageComparisonDetails()
  getPackageComparisonDetails() {
    const list = this._getOrCreatePackageComparisonList();
    const packages = this._getFromStorage('movepackages');
    const addons = this._getFromStorage('addons');

    const selectedPackages = [];
    for (let i = 0; i < list.package_ids.length; i++) {
      const pkg = this._findById(packages, list.package_ids[i]);
      if (!pkg) continue;
      const enriched = Object.assign({}, pkg);
      if (Array.isArray(pkg.included_add_on_ids)) {
        const included = [];
        for (let j = 0; j < pkg.included_add_on_ids.length; j++) {
          const ao = this._findById(addons, pkg.included_add_on_ids[j]);
          if (ao) included.push(ao);
        }
        enriched.included_add_ons = included;
      } else {
        enriched.included_add_ons = [];
      }
      selectedPackages.push(enriched);
    }

    return {
      comparison_list: list,
      packages: selectedPackages
    };
  }

  // removePackageFromComparisonList(package_id)
  removePackageFromComparisonList(package_id) {
    const list = this._getOrCreatePackageComparisonList();
    const idx = list.package_ids.indexOf(package_id);
    if (idx !== -1) {
      list.package_ids.splice(idx, 1);
      list.updated_at = this._now();
      const lists = this._getFromStorage('packagecomparisonlists');
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === list.id) {
          lists[i] = list;
          break;
        }
      }
      this._saveToStorage('packagecomparisonlists', lists);
    }

    return {
      success: true,
      comparison_list: list,
      message: 'Package removed from comparison.'
    };
  }

  // startMoveBookingWithPackage(package_id)
  startMoveBookingWithPackage(package_id) {
    const packages = this._getFromStorage('movepackages');
    const pkg = this._findById(packages, package_id);
    if (!pkg) {
      return {
        success: false,
        booking: null,
        message: 'Package not found.'
      };
    }

    const now = this._now();
    const booking = {
      id: this._generateId('mb'),
      created_at: now,
      updated_at: now,
      booking_status: 'draft',
      source_type: 'pricing',
      source_reference_id: pkg.id,
      service_type: pkg.service_type,
      move_scope: pkg.move_scope,
      property_type: null,
      home_size: null,
      origin_street: null,
      origin_city: null,
      origin_zip: null,
      destination_street: null,
      destination_city: null,
      destination_zip: null,
      job_location_street: null,
      job_location_city: null,
      job_location_zip: null,
      move_date: null,
      timeslot_id: null,
      crew_size: pkg.crew_size,
      includes_truck: pkg.includes_truck,
      labor_service_option_id: null,
      add_on_ids: Array.isArray(pkg.included_add_on_ids) ? pkg.included_add_on_ids.slice() : [],
      package_id: pkg.id,
      estimate_id: null,
      base_hourly_rate: pkg.base_hourly_rate,
      estimated_hours: pkg.min_hours || 4,
      subtotal_before_discounts: 0,
      discount_amount: 0,
      promo_code: null,
      promotion_id: null,
      insurance_plan_id: null,
      insurance_premium: 0,
      insured_value: null,
      total_estimated: 0,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_applied: false,
      insurance_selected: false,
      notes: null,
      labor_subtotal: 0,
      add_ons_subtotal: 0
    };

    const bookings = this._getFromStorage('movebookings');
    bookings.push(booking);
    this._saveToStorage('movebookings', bookings);
    localStorage.setItem('currentBookingId', booking.id);

    this._recalculateBookingTotals(booking);

    return {
      success: true,
      booking: booking,
      message: 'Booking started with selected package.'
    };
  }

  // getMovingCostEstimatorInitData()
  getMovingCostEstimatorInitData() {
    const inventoryItems = this._getFromStorage('inventoryitems').filter(function (it) { return it.is_active !== false; });
    return {
      home_size_options: [
        { value: 'studio', label: 'Studio' },
        { value: '1_bedroom', label: '1 Bedroom' },
        { value: '2_bedroom_apartment', label: '2 Bedroom Apartment' },
        { value: '3_bedroom_house', label: '3 Bedroom House' }
      ],
      inventory_items: inventoryItems
    };
  }

  // calculateMoveEstimate(home_size, items, target_budget)
  calculateMoveEstimate(home_size, items, target_budget) {
    const inventoryItems = this._getFromStorage('inventoryitems');
    let estimates = this._getFromStorage('moveestimates');
    let estimateItems = this._getFromStorage('estimateitems');

    const now = this._now();
    const estimate = {
      id: this._generateId('est'),
      created_at: now,
      updated_at: now,
      home_size: home_size,
      source_type: 'estimator_form',
      line_item_ids: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      target_budget: typeof target_budget === 'number' ? target_budget : null,
      notes: null
    };

    const newItems = [];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      const inv = this._findById(inventoryItems, entry.inventory_item_id);
      if (!inv) continue;
      const qty = Number(entry.quantity) || 0;
      if (qty <= 0) continue;
      const unitCost = Number(inv.unit_cost) || 0;
      const lineTotal = unitCost * qty;
      const estItem = {
        id: this._generateId('eit'),
        estimate_id: estimate.id,
        inventory_item_id: inv.id,
        quantity: qty,
        unit_cost: unitCost,
        line_total: lineTotal
      };
      estimate.line_item_ids.push(estItem.id);
      newItems.push(estItem);
      estimateItems.push(estItem);
    }

    this._calculateEstimateTotals(estimate, newItems);

    estimates.push(estimate);
    this._saveToStorage('moveestimates', estimates);
    this._saveToStorage('estimateitems', estimateItems);

    const isUnderBudget = typeof target_budget === 'number' ? estimate.total <= target_budget : false;

    return {
      estimate: estimate,
      items: this._withResolvedEstimateItemRelations(newItems),
      is_under_budget: isUnderBudget
    };
  }

  // startMoveBookingFromEstimate(estimate_id)
  startMoveBookingFromEstimate(estimate_id) {
    const estimates = this._getFromStorage('moveestimates');
    const estimate = this._findById(estimates, estimate_id);
    if (!estimate) {
      return {
        success: false,
        booking: null,
        message: 'Estimate not found.'
      };
    }

    const now = this._now();
    const booking = {
      id: this._generateId('mb'),
      created_at: now,
      updated_at: now,
      booking_status: 'draft',
      source_type: 'estimator',
      source_reference_id: estimate.id,
      service_type: 'standard_move',
      move_scope: 'local',
      property_type: null,
      home_size: estimate.home_size || null,
      origin_street: null,
      origin_city: null,
      origin_zip: null,
      destination_street: null,
      destination_city: null,
      destination_zip: null,
      job_location_street: null,
      job_location_city: null,
      job_location_zip: null,
      move_date: null,
      timeslot_id: null,
      crew_size: null,
      includes_truck: null,
      labor_service_option_id: null,
      add_on_ids: [],
      package_id: null,
      estimate_id: estimate.id,
      base_hourly_rate: null,
      estimated_hours: null,
      subtotal_before_discounts: estimate.total || 0,
      discount_amount: 0,
      promo_code: null,
      promotion_id: null,
      insurance_plan_id: null,
      insurance_premium: 0,
      insured_value: null,
      total_estimated: estimate.total || 0,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_applied: false,
      insurance_selected: false,
      notes: null,
      labor_subtotal: 0,
      add_ons_subtotal: 0
    };

    const bookings = this._getFromStorage('movebookings');
    bookings.push(booking);
    this._saveToStorage('movebookings', bookings);
    localStorage.setItem('currentBookingId', booking.id);

    return {
      success: true,
      booking: booking,
      message: 'Booking started from estimate.'
    };
  }

  // getLaborOnlyPageData()
  getLaborOnlyPageData() {
    const serviceOptions = this._getFromStorage('laborserviceoptions').filter(function (s) { return s.is_active !== false; });
    return {
      description: 'Book professional movers to help with loading, unloading, or on-site furniture moves. No truck included.',
      service_options: serviceOptions,
      default_duration_hours: [2, 3, 4],
      default_crew_sizes: [2, 3, 4]
    };
  }

  // getLaborOnlyPackages(crew_size, duration_hours, hourly_rate_max, hourly_rate_min)
  getLaborOnlyPackages(crew_size, duration_hours, hourly_rate_max, hourly_rate_min) {
    let packages = this._getFromStorage('movepackages');

    // If no explicit labor-only packages exist, synthesize one from prior labor-only bookings
    if (!packages.some(function (p) { return p.service_type === 'labor_only'; })) {
      const bookings = this._getFromStorage('movebookings');
      for (let i = 0; i < bookings.length; i++) {
        const b = bookings[i];
        if (b.service_type === 'labor_only' && b.crew_size && b.base_hourly_rate) {
          const synthetic = {
            id: b.package_id || 'pkg_labor_' + b.crew_size + 'm_' + b.base_hourly_rate,
            name: 'Labor-only ' + b.crew_size + ' movers',
            description: 'Auto-generated labor-only package based on prior booking data.',
            service_type: 'labor_only',
            move_scope: b.move_scope || 'local',
            crew_size: b.crew_size,
            includes_truck: false,
            base_hourly_rate: b.base_hourly_rate,
            min_hours: b.estimated_hours || 2,
            estimated_total_4_hours: b.base_hourly_rate * 4,
            rating: 4.5,
            review_count: 10,
            included_add_on_ids: [],
            applicable_property_types: ['apartment_condo', 'house', 'storage_unit', 'office'],
            tags: ['labor_only'],
            is_active: true,
            display_order: 0,
            created_at: this._now(),
            updated_at: this._now()
          };
          packages.push(synthetic);
          break;
        }
      }
      this._saveToStorage('movepackages', packages);
    }

    const filtered = [];

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (p.is_active === false) continue;
      if (p.service_type !== 'labor_only') continue;
      if (p.includes_truck) continue;
      if (typeof crew_size === 'number' && p.crew_size !== crew_size) continue;
      if (
        typeof p.min_hours === 'number' &&
        typeof duration_hours === 'number' &&
        p.min_hours > duration_hours
      )
        continue;
      if (typeof hourly_rate_max === 'number' && p.base_hourly_rate > hourly_rate_max) continue;
      if (typeof hourly_rate_min === 'number' && p.base_hourly_rate < hourly_rate_min) continue;
      filtered.push(p);
    }

    const addons = this._getFromStorage('addons');
    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const pkg = filtered[i];
      const enriched = Object.assign({}, pkg);
      if (Array.isArray(pkg.included_add_on_ids)) {
        const included = [];
        for (let j = 0; j < pkg.included_add_on_ids.length; j++) {
          const ao = this._findById(addons, pkg.included_add_on_ids[j]);
          if (ao) included.push(ao);
        }
        enriched.included_add_ons = included;
      } else {
        enriched.included_add_ons = [];
      }
      result.push(enriched);
    }
    return result;
  }

  // selectLaborOnlyPackageForCurrentBooking(package_id, duration_hours)
  selectLaborOnlyPackageForCurrentBooking(package_id, duration_hours) {
    const packages = this._getFromStorage('movepackages');
    const pkg = this._findById(packages, package_id);
    if (!pkg || pkg.service_type !== 'labor_only') {
      return {
        success: false,
        booking: null,
        message: 'Labor-only package not found.'
      };
    }

    const booking = this._getOrCreateCurrentBooking();
    booking.source_type = 'labor_only';
    booking.source_reference_id = pkg.id;
    booking.service_type = 'labor_only';
    booking.move_scope = pkg.move_scope || booking.move_scope || 'local';
    booking.package_id = pkg.id;
    booking.crew_size = pkg.crew_size;
    booking.includes_truck = pkg.includes_truck;
    booking.add_on_ids = Array.isArray(pkg.included_add_on_ids) ? pkg.included_add_on_ids.slice() : [];
    booking.base_hourly_rate = pkg.base_hourly_rate;
    booking.estimated_hours = typeof duration_hours === 'number' ? duration_hours : pkg.min_hours || 2;
    booking.updated_at = this._now();

    this._recalculateBookingTotals(booking);

    return {
      success: true,
      booking: booking,
      message: 'Labor-only package selected.'
    };
  }

  // getActivePromotionsList()
  getActivePromotionsList() {
    const promotions = this._getFromStorage('promotions');
    const nowMs = Date.now();
    const result = [];
    for (let i = 0; i < promotions.length; i++) {
      const p = promotions[i];
      if (p.is_active === false) continue;
      let ok = true;
      if (p.start_date) {
        const s = Date.parse(p.start_date);
        if (!isNaN(s) && nowMs < s) ok = false;
      }
      if (p.end_date) {
        const e = Date.parse(p.end_date);
        if (!isNaN(e) && nowMs > e) ok = false;
      }
      if (ok) result.push(p);
    }
    return result;
  }

  // getPromotionDetails(promotion_id)
  getPromotionDetails(promotion_id) {
    const promotions = this._getFromStorage('promotions');
    return this._findById(promotions, promotion_id) || null;
  }

  // startMoveBookingFromPromotion(promotion_id)
  startMoveBookingFromPromotion(promotion_id) {
    const promotions = this._getFromStorage('promotions');
    const promo = this._findById(promotions, promotion_id);
    if (!promo) {
      return {
        success: false,
        booking: null,
        message: 'Promotion not found.'
      };
    }

    const baseResult = this.startMoveBooking('promotion', promotion_id);
    if (!baseResult.success) return baseResult;

    const booking = baseResult.booking;
    booking.promotion_id = promo.id;
    booking.promo_code = promo.code;
    booking.updated_at = this._now();

    this._recalculateBookingTotals(booking);

    return {
      success: true,
      booking: booking,
      message: 'Booking started from promotion.'
    };
  }

  // getInsurancePlansComparison()
  getInsurancePlansComparison() {
    const plans = this._getFromStorage('insuranceplans');
    const active = [];
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].is_active !== false) active.push(plans[i]);
    }
    return active;
  }

  // getInsurancePlanDetails(insurance_plan_id)
  getInsurancePlanDetails(insurance_plan_id) {
    const plans = this._getFromStorage('insuranceplans');
    return this._findById(plans, insurance_plan_id) || null;
  }

  // startMoveBookingFromInsurancePlan(insurance_plan_id, insured_value)
  startMoveBookingFromInsurancePlan(insurance_plan_id, insured_value) {
    const plans = this._getFromStorage('insuranceplans');
    const plan = this._findById(plans, insurance_plan_id);
    if (!plan) {
      return {
        success: false,
        booking: null,
        message: 'Insurance plan not found.'
      };
    }

    const baseResult = this.startMoveBooking('insurance', insurance_plan_id);
    if (!baseResult.success) return baseResult;

    const booking = baseResult.booking;
    booking.insurance_plan_id = plan.id;
    booking.insurance_selected = true;
    booking.insured_value = typeof insured_value === 'number' && insured_value > 0 ? insured_value : plan.coverage_limit || null;
    booking.updated_at = this._now();

    this._recalculateBookingTotals(booking);

    return {
      success: true,
      booking: booking,
      message: 'Booking started with selected insurance plan.'
    };
  }

  // getServicesOverviewContent()
  getServicesOverviewContent() {
    return {
      services: [
        {
          service_code: 'local_moves',
          name: 'Local moves',
          description: 'Apartment and house moves within our local service radius.',
          included_features: [
            'Professional moving crew',
            'Moving truck and equipment',
            'Basic furniture protection'
          ],
          typical_use_cases: [
            'Moving across town',
            'Upgrading to a larger apartment',
            'Downsizing to a smaller home'
          ],
          related_page_codes: ['move_booking', 'cost_estimator']
        },
        {
          service_code: 'full_service_move',
          name: 'Full-service moves',
          description: 'Packing, moving, and basic unpacking handled by our team.',
          included_features: [
            'All services from local moves',
            'Professional packing service',
            'Boxes and packing materials available as add-ons'
          ],
          typical_use_cases: [
            'Busy professionals',
            'Families with small children',
            'Out-of-town relocations with limited time'
          ],
          related_page_codes: ['move_booking', 'cost_estimator']
        },
        {
          service_code: 'packing',
          name: 'Packing services',
          description: 'Full or partial packing of your belongings.',
          included_features: [
            'Trained packing specialists',
            'Careful labeling of boxes',
            'Special care for fragile items'
          ],
          typical_use_cases: [
            'Pre-move packing',
            'Last-minute packing help'
          ],
          related_page_codes: ['move_booking']
        },
        {
          service_code: 'storage_add_on',
          name: 'Storage add-ons',
          description: 'Short-term storage when your move-in date does not align.',
          included_features: [
            'Secure storage facility',
            'Flexible short-term options'
          ],
          typical_use_cases: [
            'Waiting for a new lease to start',
            'Temporary housing between homes'
          ],
          related_page_codes: ['move_booking']
        },
        {
          service_code: 'labor_only_services',
          name: 'Labor-only moving help',
          description: 'Movers to help with loading, unloading, or on-site rearranging. No truck included.',
          included_features: [
            'Professional movers',
            'Dollies and basic equipment (on request)' 
          ],
          typical_use_cases: [
            'Loading a rental truck',
            'Unloading a container or pod',
            'Rearranging furniture within your home'
          ],
          related_page_codes: ['labor_only']
        }
      ]
    };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    return {
      company_name: 'Neighborhood Movers',
      mission: 'To make local moving simple, predictable, and stress-free.',
      history: 'Neighborhood Movers started as a two-truck operation focused on friendly, reliable local moves. Over the years we have grown into a trusted local moving company while keeping our focus on excellent customer service and transparent pricing.',
      credentials: [
        { label: 'Licensed & insured', value: 'Yes' },
        { label: 'USDOT', value: 'Example-USDOT-1234567' },
        { label: 'Local operations', value: 'Serving San Francisco and nearby areas' }
      ],
      testimonials: [
        {
          author: 'Jamie L.',
          rating: 5,
          text: 'The crew was on time, careful with our belongings, and the final bill matched the quote.',
          source: 'Google Reviews'
        },
        {
          author: 'Chris P.',
          rating: 5,
          text: 'Best moving experience we have had. Clear communication and very professional.',
          source: 'Yelp'
        }
      ]
    };
  }

  // getServiceAreasList()
  getServiceAreasList() {
    return {
      local_move_radius_miles: 50,
      areas: [
        {
          city_name: 'San Francisco',
          neighborhoods: [
            'Mission District',
            'SoMa',
            'Nob Hill',
            'Pacific Heights',
            'Sunset District'
          ],
          zip_codes: ['94102', '94103', '94108', '94109', '94110', '94115', '94122']
        },
        {
          city_name: 'Oakland',
          neighborhoods: ['Downtown', 'Temescal', 'Rockridge'],
          zip_codes: ['94607', '94609', '94618']
        }
      ]
    };
  }

  // checkZipCoverage(zip_code)
  checkZipCoverage(zip_code) {
    const data = this.getServiceAreasList();
    const z = String(zip_code || '').trim();
    let covered = false;
    for (let i = 0; i < data.areas.length; i++) {
      const area = data.areas[i];
      if (area.zip_codes.indexOf(z) !== -1) {
        covered = true;
        break;
      }
    }
    return {
      is_covered: covered,
      allowed_move_scopes: covered ? ['local'] : [],
      message: covered ? 'ZIP code is within our local service area.' : 'ZIP code is currently outside our standard service area.'
    };
  }

  // getFaqContent()
  getFaqContent() {
    return {
      sections: [
        {
          id: 'rates_pricing',
          title: 'Rates & pricing',
          questions: [
            {
              question: 'How are local moves priced?',
              answer: 'Local moves are typically priced at an hourly rate based on crew size, plus any selected add-ons or insurance.',
              related_topics: ['rates', 'local_moves']
            },
            {
              question: 'Is there a minimum number of hours?',
              answer: 'Most local moves have a minimum of 2–3 hours depending on the package selected.',
              related_topics: ['rates']
            }
          ]
        },
        {
          id: 'services',
          title: 'Services',
          questions: [
            {
              question: 'Do you offer packing services?',
              answer: 'Yes. You can add professional packing as an add-on or choose a full-service move package.',
              related_topics: ['packing', 'full_service_move']
            },
            {
              question: 'Do you provide labor-only help?',
              answer: 'Yes. Our labor-only services are ideal for loading or unloading rental trucks and containers.',
              related_topics: ['labor_only']
            }
          ]
        },
        {
          id: 'promotions',
          title: 'Promotions & discounts',
          questions: [
            {
              question: 'How do I use a promo code?',
              answer: 'You can enter your promo code on the booking summary or payment step. Eligible discounts will be applied automatically.',
              related_topics: ['promotions']
            }
          ]
        },
        {
          id: 'insurance',
          title: 'Insurance & protection',
          questions: [
            {
              question: 'What is Full Value Protection?',
              answer: 'Full Value Protection offers coverage for the full replacement value of your belongings up to the plan limit.',
              related_topics: ['insurance']
            }
          ]
        }
      ]
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    return {
      phone_numbers: [
        { label: 'Main', number: '(415) 555-0000' },
        { label: 'After-hours', number: '(415) 555-0001' }
      ],
      email_addresses: [
        { label: 'General', email: 'info@neighborhoodmovers.example' },
        { label: 'Support', email: 'support@neighborhoodmovers.example' }
      ],
      business_hours: [
        { day: 'Monday', open_time: '08:00', close_time: '18:00' },
        { day: 'Tuesday', open_time: '08:00', close_time: '18:00' },
        { day: 'Wednesday', open_time: '08:00', close_time: '18:00' },
        { day: 'Thursday', open_time: '08:00', close_time: '18:00' },
        { day: 'Friday', open_time: '08:00', close_time: '18:00' },
        { day: 'Saturday', open_time: '09:00', close_time: '16:00' },
        { day: 'Sunday', open_time: '09:00', close_time: '14:00' }
      ],
      physical_address: {
        street: '100 Moving Ln',
        city: 'San Francisco',
        zip: '94103'
      }
    };
  }

  // submitContactInquiry(name, email, phone, topic, message)
  submitContactInquiry(name, email, phone, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        ticket_id: null,
        message: 'Name, email, and message are required.'
      };
    }

    const inquiries = this._getFromStorage('contactinquiries');
    const ticketId = this._generateId('ci');
    const now = this._now();

    const inquiry = {
      id: ticketId,
      created_at: now,
      name: name,
      email: email,
      phone: phone || null,
      topic: topic || 'other',
      message: message,
      status: 'open'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contactinquiries', inquiries);

    return {
      success: true,
      ticket_id: ticketId,
      message: 'Your inquiry has been received. We will get back to you shortly.'
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      last_updated: '2024-01-01',
      sections: [
        {
          id: 'bookings',
          title: 'Bookings',
          body_html: '<p>All bookings are subject to availability and are not final until confirmed by our team.</p>'
        },
        {
          id: 'cancellations',
          title: 'Cancellations',
          body_html: '<p>Cancellations within 48 hours of the scheduled move time may be subject to a cancellation fee.</p>'
        },
        {
          id: 'liability',
          title: 'Liability',
          body_html: '<p>We handle your belongings with care. Our liability is limited as described in your selected protection plan.</p>'
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      last_updated: '2024-01-01',
      sections: [
        {
          id: 'data_collection',
          title: 'Data collection',
          body_html: '<p>We collect only the information needed to provide moving services and communicate with you.</p>'
        },
        {
          id: 'data_use',
          title: 'How we use your data',
          body_html: '<p>Your information is used to prepare quotes, schedule moves, and improve our services.</p>'
        },
        {
          id: 'data_sharing',
          title: 'Data sharing',
          body_html: '<p>We do not sell your personal information. We may share it with partners only as needed to provide services.</p>'
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