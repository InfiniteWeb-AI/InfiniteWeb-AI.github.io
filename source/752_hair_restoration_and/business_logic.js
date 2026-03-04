// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Legacy/example keys from snippet (not used in core logic but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Application data model storage keys (arrays)
    const arrayKeys = [
      'clinic_locations',
      'practitioners',
      'consultation_slots',
      'consultation_bookings',
      'treatments',
      'treatment_packages',
      'saved_treatment_plans',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'gallery_cases',
      'favorite_cases',
      'financing_plan_templates',
      'financing_calculations',
      'financing_offers',
      'saved_financing_plans',
      'contact_inquiries',
      'events',
      'event_sessions',
      'event_registrations',
      'instant_quotes',
      'saved_quotes',
      'consultation_requests'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------- Utility mappers ----------

  _mapAreaOfConcernToLabel(value) {
    const map = {
      hairline: 'Hairline',
      crown: 'Crown',
      hairline_crown: 'Hairline + Crown',
      temples: 'Temples',
      full_scalp: 'Full scalp',
      scars: 'Scars',
      other: 'Other'
    };
    return map[value] || value;
  }

  _mapConditionToLabel(value) {
    const map = {
      male_pattern_baldness: 'Male pattern baldness',
      female_pattern_thinning: 'Female pattern thinning',
      alopecia: 'Alopecia',
      scar_camouflage: 'Scar camouflage',
      other: 'Other'
    };
    return map[value] || value;
  }

  _mapSessionsRangeLabel(minSessions, maxSessions) {
    if (minSessions === maxSessions) {
      return minSessions + ' sessions';
    }
    return minSessions + '\u2013' + maxSessions + ' sessions';
  }

  _mapAgeRangeToLabel(value) {
    const map = {
      under_20: 'Under 20',
      '20_29': '2039'.replace('39', '29'), // not used but kept simple
      '30_39': '3039',
      '40_49': '4049',
      '50_59': '5059',
      '60_plus': '60+'
    };
    if (value === '20_29') return '2029';
    return map[value] || value;
  }

  _mapHairLossStageToLabel(value) {
    const map = {
      norwood_1: 'Norwood 1',
      norwood_2: 'Norwood 2',
      norwood_3: 'Norwood 3',
      norwood_3_4: 'Norwood 334',
      norwood_4: 'Norwood 4',
      norwood_5: 'Norwood 5',
      norwood_6: 'Norwood 6',
      norwood_7: 'Norwood 7',
      ludwig_1: 'Ludwig 1',
      ludwig_2: 'Ludwig 2',
      other: 'Other'
    };
    return map[value] || value;
  }

  _mapGenderLabel(value) {
    const map = {
      male: 'Male',
      female: 'Female',
      non_binary: 'Non-binary',
      unspecified: 'Unspecified'
    };
    return map[value] || value;
  }

  _getCurrency() {
    return 'USD';
  }

  _parseISODate(dateStr) {
    return new Date(dateStr);
  }

  _dateInRange(dateStr, startDateStr, endDateStr) {
    const d = new Date(dateStr);
    const start = new Date(startDateStr + 'T00:00:00.000Z');
    const end = new Date(endDateStr + 'T23:59:59.999Z');
    return d >= start && d <= end;
  }

  _timeInWindow(dateStr, timeWindowStart, timeWindowEnd) {
    if (!timeWindowStart && !timeWindowEnd) return true;
    const d = new Date(dateStr);
    const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();

    let startMinutes = 0;
    let endMinutes = 24 * 60 - 1;

    if (timeWindowStart) {
      const [sh, sm] = timeWindowStart.split(':').map((v) => parseInt(v, 10));
      startMinutes = sh * 60 + (sm || 0);
    }
    if (timeWindowEnd) {
      const [eh, em] = timeWindowEnd.split(':').map((v) => parseInt(v, 10));
      endMinutes = eh * 60 + (em || 0);
    }
    return minutes >= startMinutes && minutes <= endMinutes;
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    let changed = false;
    for (const item of cartItems) {
      if (item.cart_id === cartId) {
        const correctLineTotal = (item.unit_price || 0) * (item.quantity || 0);
        if (item.line_total !== correctLineTotal) {
          item.line_total = correctLineTotal;
          changed = true;
        }
        subtotal += correctLineTotal;
      }
    }
    if (changed) {
      this._saveToStorage('cart_items', cartItems);
    }
    return { subtotal, currency: this._getCurrency() };
  }

  // ---------- Financing helpers ----------

  _createFinancingCalculationRecord(procedureCost, termLengthMonths, downPaymentAmount, offersData) {
    const calculations = this._getFromStorage('financing_calculations', []);
    const offers = this._getFromStorage('financing_offers', []);

    const calculationId = this._generateId('fin_calc');
    const calcRecord = {
      id: calculationId,
      procedure_cost: Number(procedureCost) || 0,
      term_length_months: Number(termLengthMonths) || 0,
      down_payment_amount: Number(downPaymentAmount) || 0,
      created_at: new Date().toISOString()
    };
    calculations.push(calcRecord);

    const createdOffers = [];
    for (const od of offersData) {
      const offerId = this._generateId('fin_offer');
      const offerRecord = {
        id: offerId,
        calculation_id: calculationId,
        plan_template_id: od.planTemplateId,
        term_length_months: od.termLengthMonths,
        monthly_payment_amount: od.monthlyPaymentAmount,
        total_payment_amount: od.totalPaymentAmount,
        apr_percent: od.aprPercent,
        is_selected: false
      };
      offers.push(offerRecord);
      createdOffers.push(offerRecord);
    }

    this._saveToStorage('financing_calculations', calculations);
    this._saveToStorage('financing_offers', offers);

    return { calculation: calcRecord, offers: createdOffers };
  }

  _createInstantQuoteRecord(gender, areaToTreat, hairDensityGoal, previousProcedures) {
    const treatmentPackages = this._getFromStorage('treatment_packages', []);

    // Map InstantQuote areaToTreat to TreatmentPackage.area_of_concern
    let areaOfConcern = null;
    if (areaToTreat === 'full_scalp') areaOfConcern = 'full_scalp';
    else if (areaToTreat === 'crown_hairline') areaOfConcern = 'hairline_crown';
    else if (areaToTreat === 'hairline') areaOfConcern = 'hairline';
    else if (areaToTreat === 'crown') areaOfConcern = 'crown';
    else if (areaToTreat === 'temples') areaOfConcern = 'temples';
    else if (areaToTreat === 'scar_camouflage') areaOfConcern = 'scars';

    let relevantPackages = treatmentPackages.filter(
      (p) =>
        p.is_active &&
        p.treatment_slug === 'scalp_micropigmentation' &&
        (!areaOfConcern || p.area_of_concern === areaOfConcern)
    );

    let baseCost = 0;
    if (relevantPackages.length > 0) {
      const total = relevantPackages.reduce((sum, p) => sum + (p.price || 0), 0);
      baseCost = total / relevantPackages.length;
    } else {
      // If no relevant package data, fall back to a neutral baseline derived from all SMP packages.
      const allSmp = treatmentPackages.filter((p) => p.treatment_slug === 'scalp_micropigmentation' && p.is_active);
      if (allSmp.length > 0) {
        const total = allSmp.reduce((sum, p) => sum + (p.price || 0), 0);
        baseCost = total / allSmp.length;
      } else {
        baseCost = 0; // no data available; stay data-driven
      }
    }

    // Adjust cost by hair density goal
    let densityFactor = 1;
    if (hairDensityGoal === 'low') densityFactor = 0.9;
    else if (hairDensityGoal === 'high') densityFactor = 1.1;

    // Adjust for previous procedures
    let procedureFactor = 1;
    if (previousProcedures !== 'no_previous_procedures') {
      procedureFactor = 1.15;
    }

    let estimated = baseCost * densityFactor * procedureFactor;
    if (!estimated || estimated < 0) {
      estimated = 0;
    }

    // Round to nearest whole dollar
    estimated = Math.round(estimated);

    const quotes = this._getFromStorage('instant_quotes', []);
    const quoteId = this._generateId('quote');
    const record = {
      id: quoteId,
      gender: gender,
      area_to_treat: areaToTreat,
      hair_density_goal: hairDensityGoal,
      previous_procedures: previousProcedures,
      estimated_total_cost: estimated,
      created_at: new Date().toISOString()
    };
    quotes.push(record);
    this._saveToStorage('instant_quotes', quotes);
    return record;
  }

  _markEventSessionAsFilledIfCapacityReached(eventSessionId) {
    const sessions = this._getFromStorage('event_sessions', []);
    const registrations = this._getFromStorage('event_registrations', []);
    const session = sessions.find((s) => s.id === eventSessionId);
    if (!session) return;
    if (!session.capacity || session.capacity <= 0) return;
    const count = registrations.filter((r) => r.event_session_id === eventSessionId).length;
    if (count >= session.capacity && !session.is_full) {
      session.is_full = true;
      this._saveToStorage('event_sessions', sessions);
    }
  }

  // ---------- Core interface implementations ----------

  // getHomePageContent
  getHomePageContent() {
    const treatments = this._getFromStorage('treatments', []);
    const galleryCases = this._getFromStorage('gallery_cases', []);
    const events = this._getFromStorage('events', []);
    const products = this._getFromStorage('products', []);
    const productCategories = this._getFromStorage('product_categories', []);

    const activeTreatments = treatments.filter((t) => t.is_active);
    const smpTreatment = activeTreatments.find((t) => t.slug === 'scalp_micropigmentation');

    const hero = {
      headline: 'Restore your hairline with natural-looking scalp micropigmentation',
      subheadline: 'Specialized hair restoration and SMP clinic focused on realistic, long-lasting results.',
      primary_treatment_slug: smpTreatment ? smpTreatment.slug : activeTreatments[0]?.slug || null,
      primary_cta_label: smpTreatment ? 'Book Free SMP Consultation' : 'Book Consultation'
    };

    const treatment_highlights = activeTreatments.map((t) => {
      const sessionsLabel = this._mapSessionsRangeLabel(t.min_sessions, t.max_sessions);
      return {
        treatment_slug: t.slug,
        name: t.name,
        short_description: t.short_description || '',
        estimated_total_cost: t.estimated_total_cost || 0,
        sessions_range_label: sessionsLabel,
        primary_action_label: t.slug === 'scalp_micropigmentation' ? 'Book Free Consultation' : 'Learn more'
      };
    });

    const quick_actions = [
      {
        action_key: 'book_smp_consultation',
        label: 'Book Free SMP Consultation',
        description: 'Choose a time and practitioner for your scalp micropigmentation consultation.',
        target_page: 'smp_consultation_booking'
      },
      {
        action_key: 'compare_treatments',
        label: 'Compare SMP vs FUE',
        description: 'See costs, sessions, and pros/cons side by side.',
        target_page: 'compare_treatments'
      },
      {
        action_key: 'view_pricing',
        label: 'View Pricing & Packages',
        description: 'Explore treatment options and SMP packages.',
        target_page: 'pricing'
      },
      {
        action_key: 'instant_quote',
        label: 'Get Instant SMP Quote',
        description: 'Estimate your SMP investment in seconds.',
        target_page: 'instant_quote'
      }
    ];

    const featured_gallery_cases = galleryCases
      .filter((c) => c.is_featured)
      .sort((a, b) => new Date(b.case_date) - new Date(a.case_date))
      .slice(0, 6)
      .map((c) => ({
        case_id: c.id,
        title: c.title,
        age_range_label: this._mapAgeRangeToLabel(c.age_range),
        gender: c.gender,
        treatment_slug: c.treatment_slug,
        thumbnail_after_image_url: c.after_image_url
      }));

    const featured_events = events
      .filter((e) => e.is_active)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 5)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        start_date: e.start_date,
        format: e.format,
        topic: e.topic
      }));

    const featured_products = products
      .filter((p) => p.is_active)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6)
      .map((p) => {
        const category = productCategories.find((c) => c.id === p.category_id) || null;
        return {
          product_id: p.id,
          name: p.name,
          category_name: category ? category.name : '',
          price: p.price || 0,
          rating: p.rating || 0,
          image_url: p.image_url || ''
        };
      });

    // Simple placeholder testimonials (content only, not persisted)
    const testimonials = activeTreatments.slice(0, 3).map((t, idx) => ({
      quote:
        idx === 0
          ? 'My hairline looks natural and no one can tell I had SMP done.'
          : idx === 1
          ? 'The team made me feel comfortable and explained every step.'
          : 'I wish I had done this years ago  the confidence boost is huge.',
      name: idx === 0 ? 'M.D.' : idx === 1 ? 'R.L.' : 'K.P.',
      age_range_label: idx === 0 ? '3039' : idx === 1 ? '4049' : '2029',
      treatment_slug: t.slug
    }));

    return {
      hero,
      treatment_highlights,
      quick_actions,
      featured_gallery_cases,
      testimonials,
      featured_events,
      featured_products
    };
  }

  // getActiveClinicLocations
  getActiveClinicLocations() {
    const locations = this._getFromStorage('clinic_locations', []);
    return locations
      .filter((l) => l.is_active)
      .map((l) => ({
        location_id: l.id,
        name: l.name,
        address: l.address || '',
        city: l.city || '',
        state: l.state || '',
        postal_code: l.postal_code || '',
        phone_number: l.phone_number || '',
        timezone: l.timezone || '',
        opening_hours: l.opening_hours || ''
      }));
  }

  // getActiveTreatments
  getActiveTreatments() {
    const treatments = this._getFromStorage('treatments', []);
    return treatments
      .filter((t) => t.is_active)
      .map((t) => ({
        treatment_slug: t.slug,
        name: t.name,
        short_description: t.short_description || '',
        estimated_total_cost: t.estimated_total_cost || 0,
        sessions_range_label: this._mapSessionsRangeLabel(t.min_sessions, t.max_sessions),
        is_active: !!t.is_active
      }));
  }

  // getTreatmentDetail
  getTreatmentDetail(treatmentSlug) {
    const treatments = this._getFromStorage('treatments', []);
    const t = treatments.find((tt) => tt.slug === treatmentSlug);
    if (!t) {
      return {
        treatment_slug: treatmentSlug,
        name: '',
        short_description: '',
        full_description: '',
        indications: '',
        benefits: '',
        process_overview: '',
        sessions_range_label: '',
        expected_results: '',
        estimated_total_cost: 0,
        primary_cta_label: 'Schedule consultation',
        secondary_cta_label: 'Contact us',
        related_pricing_available: false,
        related_gallery_filters: { treatment_slug: treatmentSlug },
        faqs: []
      };
    }

    const isSmp = t.slug === 'scalp_micropigmentation';

    return {
      treatment_slug: t.slug,
      name: t.name,
      short_description: t.short_description || '',
      full_description:
        t.full_description ||
        (isSmp
          ? 'Scalp micropigmentation (SMP) uses micro-dots of pigment to recreate the look of hair follicles, restoring the appearance of density or a clean, shaved look.'
          : ''),
      indications: isSmp
        ? 'Ideal for thinning hair, receding hairlines, scars, and full scalp coverage for both men and women.'
        : '',
      benefits: isSmp
        ? 'Non-surgical, minimal downtime, predictable results, and long-lasting improvement in hair density appearance.'
        : '',
      process_overview: isSmp
        ? 'Most SMP treatments are completed in 223 sessions spaced about 12 weeks apart. A consultation is used to design your hairline and determine coverage.'
        : '',
      sessions_range_label: this._mapSessionsRangeLabel(t.min_sessions, t.max_sessions),
      expected_results: isSmp
        ? 'Immediate visual improvement after the first session, with final results after the last session and brief healing period.'
        : '',
      estimated_total_cost: t.estimated_total_cost || 0,
      primary_cta_label: isSmp ? 'Book Free Consultation' : 'Schedule consultation',
      secondary_cta_label: 'View pricing',
      related_pricing_available: true,
      related_gallery_filters: {
        treatment_slug: t.slug
      },
      faqs: isSmp
        ? [
            {
              question: 'How many SMP sessions will I need?',
              answer:
                'Most clients need 223 sessions depending on the amount of hair loss, skin type, and desired density.'
            },
            {
              question: 'How long do SMP results last?',
              answer:
                'Results can last several years. Occasional touch-ups may be recommended to keep the color fresh.'
            }
          ]
        : []
    };
  }

  // searchSmpConsultationSlots
  searchSmpConsultationSlots(locationId, startDate, endDate, timeWindowStart, timeWindowEnd, sortBy) {
    const slots = this._getFromStorage('consultation_slots', []);
    const locations = this._getFromStorage('clinic_locations', []);
    const practitioners = this._getFromStorage('practitioners', []);

    let results = slots.filter((s) => {
      if (s.location_id !== locationId) return false;
      if (s.slot_type !== 'smp_consultation') return false;
      if (s.status !== 'available') return false;
      if (!this._dateInRange(s.start_datetime, startDate, endDate)) return false;
      if (!this._timeInWindow(s.start_datetime, timeWindowStart, timeWindowEnd)) return false;
      return true;
    });

    if (sortBy === 'practitioner_rating_desc') {
      results.sort((a, b) => {
        const pa = practitioners.find((p) => p.id === a.practitioner_id);
        const pb = practitioners.find((p) => p.id === b.practitioner_id);
        const ra = pa ? pa.average_rating || 0 : 0;
        const rb = pb ? pb.average_rating || 0 : 0;
        if (rb !== ra) return rb - ra;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      });
    } else {
      // default: soonest
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    return results.map((s) => {
      const loc = locations.find((l) => l.id === s.location_id) || null;
      const prac = practitioners.find((p) => p.id === s.practitioner_id) || null;
      return {
        slot_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        location_id: s.location_id,
        location_name: loc ? loc.name : '',
        practitioner_id: s.practitioner_id,
        practitioner_name: prac ? prac.full_name : '',
        practitioner_average_rating: prac ? prac.average_rating || 0 : 0,
        practitioner_review_count: prac ? prac.review_count || 0 : 0,
        slot_type: s.slot_type,
        status: s.status,
        // Foreign key resolution
        location: loc,
        practitioner: prac
      };
    });
  }

  // bookSmpConsultationSlot
  bookSmpConsultationSlot(slotId, clientName, clientPhone, clientEmail) {
    const slots = this._getFromStorage('consultation_slots', []);
    const locations = this._getFromStorage('clinic_locations', []);
    const practitioners = this._getFromStorage('practitioners', []);
    const bookings = this._getFromStorage('consultation_bookings', []);

    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.slot_type !== 'smp_consultation' || slot.status !== 'available') {
      return {
        success: false,
        booking_id: null,
        slot_id: slotId,
        location_name: '',
        practitioner_name: '',
        treatment_slug: 'scalp_micropigmentation',
        start_datetime: slot ? slot.start_datetime : null,
        end_datetime: slot ? slot.end_datetime : null,
        status: 'pending',
        message: 'Slot not available for booking.'
      };
    }

    const bookingId = this._generateId('consultation_booking');
    const booking = {
      id: bookingId,
      slot_id: slot.id,
      location_id: slot.location_id,
      practitioner_id: slot.practitioner_id,
      treatment_slug: 'scalp_micropigmentation',
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: 'pending',
      notes: '',
      created_at: new Date().toISOString()
    };
    bookings.push(booking);

    // Update slot status to booked
    slot.status = 'booked';
    slot.updated_at = new Date().toISOString();

    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_slots', slots);

    const loc = locations.find((l) => l.id === slot.location_id) || null;
    const prac = practitioners.find((p) => p.id === slot.practitioner_id) || null;

    return {
      success: true,
      booking_id: bookingId,
      slot_id: slot.id,
      location_name: loc ? loc.name : '',
      practitioner_name: prac ? prac.full_name : '',
      treatment_slug: 'scalp_micropigmentation',
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      status: booking.status,
      message: 'Consultation booked successfully.',
      // Foreign key resolution
      slot,
      location: loc,
      practitioner: prac
    };
  }

  // getTreatmentPackageFilterOptions
  getTreatmentPackageFilterOptions() {
    const treatments = this._getFromStorage('treatments', []);
    const packages = this._getFromStorage('treatment_packages', []);

    const treatment_types = treatments
      .filter((t) => t.is_active)
      .map((t) => ({
        treatment_slug: t.slug,
        label: t.name
      }));

    const areaValues = Array.from(new Set(packages.map((p) => p.area_of_concern)));
    const areas_of_concern = areaValues.map((v) => ({
      value: v,
      label: this._mapAreaOfConcernToLabel(v)
    }));

    const conditionValues = Array.from(new Set(packages.map((p) => p.condition)));
    const conditions = conditionValues.map((v) => ({
      value: v,
      label: this._mapConditionToLabel(v)
    }));

    const sessionKey = (p) => p.min_sessions + '-' + p.max_sessions;
    const sessionMap = new Map();
    for (const p of packages) {
      const key = sessionKey(p);
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          min_sessions: p.min_sessions,
          max_sessions: p.max_sessions,
          label: this._mapSessionsRangeLabel(p.min_sessions, p.max_sessions)
        });
      }
    }
    const session_range_options = Array.from(sessionMap.values());

    let minPrice = Infinity;
    let maxPrice = 0;
    for (const p of packages) {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    }
    if (!isFinite(minPrice)) {
      minPrice = 0;
    }

    const price_range = {
      min_price: minPrice,
      max_price: maxPrice,
      currency: this._getCurrency()
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];

    return {
      treatment_types,
      areas_of_concern,
      conditions,
      session_range_options,
      price_range,
      sort_options
    };
  }

  // searchTreatmentPackages
  searchTreatmentPackages(
    treatmentSlug,
    areaOfConcern,
    condition,
    minSessions,
    maxSessions,
    maxPrice,
    sortBy
  ) {
    const packages = this._getFromStorage('treatment_packages', []);
    const treatments = this._getFromStorage('treatments', []);

    let results = packages.filter((p) => p.is_active && p.treatment_slug === treatmentSlug);

    if (areaOfConcern) {
      results = results.filter((p) => p.area_of_concern === areaOfConcern);
    }
    if (condition) {
      results = results.filter((p) => p.condition === condition);
    }
    if (typeof minSessions === 'number') {
      results = results.filter((p) => p.min_sessions >= minSessions);
    }
    if (typeof maxSessions === 'number') {
      results = results.filter((p) => p.max_sessions <= maxSessions);
    }
    if (typeof maxPrice === 'number') {
      results = results.filter((p) => (p.price || 0) <= maxPrice);
    }

    if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      // default price_asc
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    return results.map((p) => {
      const t = treatments.find((tt) => tt.slug === p.treatment_slug) || null;
      return {
        package_id: p.id,
        treatment_slug: p.treatment_slug,
        name: p.name,
        description: p.description || '',
        area_of_concern: p.area_of_concern,
        area_of_concern_label: this._mapAreaOfConcernToLabel(p.area_of_concern),
        condition: p.condition,
        condition_label: this._mapConditionToLabel(p.condition),
        sessions_range_label: this._mapSessionsRangeLabel(p.min_sessions, p.max_sessions),
        price: p.price || 0,
        currency: this._getCurrency(),
        is_active: !!p.is_active,
        // Foreign key resolution
        treatment: t
      };
    });
  }

  // saveTreatmentPlan
  saveTreatmentPlan(packageId, planName) {
    const packages = this._getFromStorage('treatment_packages', []);
    const savedPlans = this._getFromStorage('saved_treatment_plans', []);

    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return {
        success: false,
        saved_plan_id: null,
        package_id: packageId,
        plan_name: planName,
        created_at: null,
        message: 'Package not found.'
      };
    }

    const id = this._generateId('saved_plan');
    const createdAt = new Date().toISOString();
    const record = {
      id,
      package_id: packageId,
      plan_name: planName,
      created_at: createdAt
    };
    savedPlans.push(record);
    this._saveToStorage('saved_treatment_plans', savedPlans);

    return {
      success: true,
      saved_plan_id: id,
      package_id: packageId,
      plan_name: planName,
      created_at: createdAt,
      message: 'Treatment plan saved.',
      // Foreign key resolution
      package: pkg
    };
  }

  // getProductCategories
  getProductCategories() {
    const cats = this._getFromStorage('product_categories', []);
    return cats
      .filter((c) => c.is_active)
      .map((c) => ({
        category_id: c.id,
        name: c.name,
        slug: c.slug || '',
        description: c.description || ''
      }));
  }

  // getProductFilterOptions
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []);
    const filtered = products.filter((p) => p.category_id === categoryId && p.is_active);

    let minPrice = Infinity;
    let maxPrice = 0;
    for (const p of filtered) {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;

    const price_range = {
      min_price: minPrice,
      max_price: maxPrice,
      currency: this._getCurrency()
    };

    const rating_options = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' }
    ];

    const typeValues = Array.from(new Set(filtered.map((p) => p.product_type)));
    const product_types = typeValues.map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1)
    }));

    return {
      price_range,
      rating_options,
      product_types
    };
  }

  // searchProducts
  searchProducts(categoryId, maxPrice, minRating, productType, sortBy) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let results = products.filter((p) => p.is_active && p.category_id === categoryId);

    if (typeof maxPrice === 'number') {
      results = results.filter((p) => (p.price || 0) <= maxPrice);
    }
    if (typeof minRating === 'number') {
      results = results.filter((p) => (p.rating || 0) >= minRating);
    }
    if (productType) {
      results = results.filter((p) => p.product_type === productType);
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : '',
        product_type: p.product_type,
        tags: p.tags || [],
        price: p.price || 0,
        currency: this._getCurrency(),
        rating: p.rating || 0,
        review_count: p.review_count || 0,
        image_url: p.image_url || '',
        // Foreign key resolution
        category: cat
      };
    });
  }

  // getProductDetail
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const p = products.find((prod) => prod.id === productId);
    if (!p) {
      return {
        product_id: productId,
        name: '',
        description: '',
        usage_instructions: '',
        ingredients: '',
        category_name: '',
        product_type: '',
        tags: [],
        price: 0,
        currency: this._getCurrency(),
        rating: 0,
        review_count: 0,
        image_url: ''
      };
    }

    const cat = categories.find((c) => c.id === p.category_id) || null;

    return {
      product_id: p.id,
      name: p.name,
      description: p.description || '',
      usage_instructions: p.usage_instructions || '',
      ingredients: p.ingredients || '',
      category_name: cat ? cat.name : '',
      product_type: p.product_type,
      tags: p.tags || [],
      price: p.price || 0,
      currency: this._getCurrency(),
      rating: p.rating || 0,
      review_count: p.review_count || 0,
      image_url: p.image_url || ''
    };
  }

  // addToCart
  addToCart(productId, quantity = 1) {
    quantity = Number(quantity) || 1;
    if (quantity < 1) quantity = 1;

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart_id: null,
        item_id: null,
        quantity: 0,
        line_total: 0,
        currency: this._getCurrency(),
        cart_subtotal: 0,
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);
    if (item) {
      item.quantity += quantity;
      item.line_total = item.quantity * (item.unit_price || 0);
    } else {
      const itemId = this._generateId('cart_item');
      item = {
        id: itemId,
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price || 0,
        line_total: (product.price || 0) * quantity,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cart_id: cart.id,
      item_id: item.id,
      quantity: item.quantity,
      line_total: item.line_total,
      currency: this._getCurrency(),
      cart_subtotal: totals.subtotal,
      message: 'Item added to cart.'
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;

    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const lineTotal = (ci.unit_price || 0) * (ci.quantity || 0);
      subtotal += lineTotal;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : '',
        product_type: product ? product.product_type : '',
        image_url: product ? product.image_url || '' : '',
        unit_price: ci.unit_price || 0,
        quantity: ci.quantity || 0,
        line_total: lineTotal,
        currency: this._getCurrency(),
        // Foreign key resolution
        product: product
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      items,
      subtotal,
      currency: this._getCurrency()
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity) || 1;
    if (quantity < 1) quantity = 1;

    const cartItems = this._getFromStorage('cart_items', []);
    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: cartItemId,
        quantity: 0,
        line_total: 0,
        subtotal: 0,
        currency: this._getCurrency(),
        message: 'Cart item not found.'
      };
    }

    cartItem.quantity = quantity;
    cartItem.line_total = (cartItem.unit_price || 0) * quantity;
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(cartItem.cart_id);

    return {
      success: true,
      cart_id: cartItem.cart_id,
      cart_item_id: cartItem.id,
      quantity: cartItem.quantity,
      line_total: cartItem.line_total,
      subtotal: totals.subtotal,
      currency: this._getCurrency(),
      message: 'Cart item updated.'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart_id: null,
        subtotal: 0,
        currency: this._getCurrency(),
        message: 'Cart item not found.'
      };
    }
    const cartId = cartItems[index].cart_id;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart_id: cartId,
      subtotal: totals.subtotal,
      currency: this._getCurrency(),
      message: 'Cart item removed.'
    };
  }

  // getTreatmentComparison
  getTreatmentComparison(treatmentSlugA, treatmentSlugB) {
    const treatments = this._getFromStorage('treatments', []);
    const tA = treatments.find((t) => t.slug === treatmentSlugA) || null;
    const tB = treatments.find((t) => t.slug === treatmentSlugB) || null;

    const treatmentsArr = [];
    if (tA) {
      treatmentsArr.push({
        treatment_slug: tA.slug,
        name: tA.name,
        estimated_total_cost: tA.estimated_total_cost || 0,
        sessions_range_label: this._mapSessionsRangeLabel(tA.min_sessions, tA.max_sessions),
        summary: tA.short_description || '',
        primary_pros: '',
        primary_cons: ''
      });
    }
    if (tB) {
      treatmentsArr.push({
        treatment_slug: tB.slug,
        name: tB.name,
        estimated_total_cost: tB.estimated_total_cost || 0,
        sessions_range_label: this._mapSessionsRangeLabel(tB.min_sessions, tB.max_sessions),
        summary: tB.short_description || '',
        primary_pros: '',
        primary_cons: ''
      });
    }

    const rows = [];
    rows.push({
      key: 'total_estimated_cost',
      label: 'Total estimated cost',
      values: {
        treatmentSlugA: tA ? String(tA.estimated_total_cost || 0) : '',
        treatmentSlugB: tB ? String(tB.estimated_total_cost || 0) : ''
      }
    });
    rows.push({
      key: 'number_of_sessions',
      label: 'Number of sessions',
      values: {
        treatmentSlugA: tA ? this._mapSessionsRangeLabel(tA.min_sessions, tA.max_sessions) : '',
        treatmentSlugB: tB ? this._mapSessionsRangeLabel(tB.min_sessions, tB.max_sessions) : ''
      }
    });

    return {
      treatments: treatmentsArr,
      rows
    };
  }

  // submitConsultationRequest
  submitConsultationRequest(treatmentSlug, name, email, phone, preferredDate) {
    const treatments = this._getFromStorage('treatments', []);
    const treatment = treatments.find((t) => t.slug === treatmentSlug) || null;
    const requests = this._getFromStorage('consultation_requests', []);

    const id = this._generateId('consult_req');
    const record = {
      id,
      treatment_slug: treatmentSlug,
      name,
      email,
      phone,
      preferred_date: new Date(preferredDate + 'T00:00:00.000Z').toISOString(),
      status: 'new',
      created_at: new Date().toISOString()
    };
    requests.push(record);
    this._saveToStorage('consultation_requests', requests);

    return {
      success: true,
      consultation_request_id: id,
      treatment_slug: treatmentSlug,
      status: 'new',
      created_at: record.created_at,
      message: 'Consultation request submitted.',
      // Foreign key resolution
      treatment
    };
  }

  // getGalleryFilterOptions
  getGalleryFilterOptions() {
    const genders = [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const age_ranges = [
      { value: 'under_20', label: 'Under 20' },
      { value: '20_29', label: '2029' },
      { value: '30_39', label: '3039' },
      { value: '40_49', label: '4049' },
      { value: '50_59', label: '5059' },
      { value: '60_plus', label: '60+' }
    ];

    const treatments = this._getFromStorage('treatments', []);
    const treatment_types = treatments.map((t) => ({
      treatment_slug: t.slug,
      label: t.name
    }));

    const hair_loss_stages = [
      'norwood_1',
      'norwood_2',
      'norwood_3',
      'norwood_3_4',
      'norwood_4',
      'norwood_5',
      'norwood_6',
      'norwood_7',
      'ludwig_1',
      'ludwig_2',
      'other'
    ].map((v) => ({ value: v, label: this._mapHairLossStageToLabel(v) }));

    const sort_options = [
      { value: 'most_recent', label: 'Most recent' }
    ];

    return {
      genders,
      age_ranges,
      treatment_types,
      hair_loss_stages,
      sort_options
    };
  }

  // searchGalleryCases
  searchGalleryCases(gender, ageRange, treatmentSlug, hairLossStage, sortBy) {
    const cases = this._getFromStorage('gallery_cases', []);

    let results = cases.slice();

    if (gender) {
      results = results.filter((c) => c.gender === gender);
    }
    if (ageRange) {
      results = results.filter((c) => c.age_range === ageRange);
    }
    if (treatmentSlug) {
      results = results.filter((c) => c.treatment_slug === treatmentSlug);
    }
    if (hairLossStage) {
      results = results.filter((c) => c.hair_loss_stage === hairLossStage);
    }

    if (sortBy === 'most_recent') {
      results.sort((a, b) => new Date(b.case_date) - new Date(a.case_date));
    }

    return results.map((c) => ({
      case_id: c.id,
      title: c.title,
      gender: c.gender,
      age: c.age || null,
      age_range_label: this._mapAgeRangeToLabel(c.age_range),
      treatment_slug: c.treatment_slug,
      hair_loss_stage_label: this._mapHairLossStageToLabel(c.hair_loss_stage),
      case_date: c.case_date,
      thumbnail_before_image_url: c.before_image_url,
      thumbnail_after_image_url: c.after_image_url
    }));
  }

  // getGalleryCaseDetail
  getGalleryCaseDetail(caseId) {
    const cases = this._getFromStorage('gallery_cases', []);
    const favorites = this._getFromStorage('favorite_cases', []);

    const c = cases.find((cc) => cc.id === caseId);
    if (!c) {
      return {
        case_id: caseId,
        title: '',
        gender: '',
        age: null,
        age_range_label: '',
        treatment_slug: '',
        hair_loss_stage_label: '',
        case_notes: '',
        case_date: '',
        before_image_url: '',
        after_image_url: '',
        is_featured: false,
        is_favorited: false
      };
    }

    const isFavorited = favorites.some((f) => f.case_id === caseId);

    return {
      case_id: c.id,
      title: c.title,
      gender: c.gender,
      age: c.age || null,
      age_range_label: this._mapAgeRangeToLabel(c.age_range),
      treatment_slug: c.treatment_slug,
      hair_loss_stage_label: this._mapHairLossStageToLabel(c.hair_loss_stage),
      case_notes: c.case_notes || '',
      case_date: c.case_date,
      before_image_url: c.before_image_url,
      after_image_url: c.after_image_url,
      is_featured: !!c.is_featured,
      is_favorited: isFavorited
    };
  }

  // saveCaseToFavorites
  saveCaseToFavorites(caseId) {
    const cases = this._getFromStorage('gallery_cases', []);
    const favorites = this._getFromStorage('favorite_cases', []);

    const c = cases.find((cc) => cc.id === caseId);
    if (!c) {
      return {
        success: false,
        favorite_id: null,
        case_id: caseId,
        saved_at: null,
        message: 'Case not found.'
      };
    }

    const existing = favorites.find((f) => f.case_id === caseId);
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        case_id: caseId,
        saved_at: existing.saved_at,
        message: 'Case already in favorites.',
        case: c
      };
    }

    const id = this._generateId('favorite_case');
    const savedAt = new Date().toISOString();
    const record = {
      id,
      case_id: caseId,
      saved_at: savedAt
    };
    favorites.push(record);
    this._saveToStorage('favorite_cases', favorites);

    return {
      success: true,
      favorite_id: id,
      case_id: caseId,
      saved_at: savedAt,
      message: 'Case saved to favorites.',
      // Foreign key resolution
      case: c
    };
  }

  // getFinancingOverview
  getFinancingOverview() {
    return {
      intro_text:
        'We partner with multiple financing providers to help make your hair restoration treatment more affordable.',
      general_eligibility:
        'Most plans are available to clients with fair to excellent credit, subject to provider approval.',
      common_terms_summary:
        'Common terms range from 6 to 36 months with options for 0% or low-interest financing for qualified applicants.'
    };
  }

  // calculateFinancingOffers
  calculateFinancingOffers(procedureCost, termLengthMonths, downPaymentAmount) {
    procedureCost = Number(procedureCost) || 0;
    termLengthMonths = Number(termLengthMonths) || 0;
    downPaymentAmount = Number(downPaymentAmount) || 0;

    const templates = this._getFromStorage('financing_plan_templates', []);

    const applicableTemplates = templates.filter((tpl) => {
      if (!tpl.is_active) return false;
      if (!tpl.allows_zero_down && downPaymentAmount === 0) return false;
      if (tpl.term_length_months !== termLengthMonths) return false;
      if (typeof tpl.min_procedure_cost === 'number' && procedureCost < tpl.min_procedure_cost)
        return false;
      if (typeof tpl.max_procedure_cost === 'number' && procedureCost > tpl.max_procedure_cost)
        return false;
      return true;
    });

    const financedAmount = Math.max(0, procedureCost - downPaymentAmount);

    const offersData = applicableTemplates.map((tpl) => {
      const apr = Number(tpl.apr_percent) || 0;
      const monthlyRate = apr / 100 / 12;
      let monthlyPayment = 0;
      if (monthlyRate > 0 && termLengthMonths > 0) {
        monthlyPayment =
          financedAmount *
          (monthlyRate / (1 - Math.pow(1 + monthlyRate, -termLengthMonths)));
      } else if (termLengthMonths > 0) {
        monthlyPayment = financedAmount / termLengthMonths;
      }
      const totalPaymentAmount = monthlyPayment * termLengthMonths + downPaymentAmount;

      return {
        planTemplateId: tpl.id,
        termLengthMonths: tpl.term_length_months,
        monthlyPaymentAmount: Math.round(monthlyPayment * 100) / 100,
        totalPaymentAmount: Math.round(totalPaymentAmount * 100) / 100,
        aprPercent: apr
      };
    });

    const { calculation, offers } = this._createFinancingCalculationRecord(
      procedureCost,
      termLengthMonths,
      downPaymentAmount,
      offersData
    );

    const offersForReturn = offers.map((o) => {
      const tpl = templates.find((t) => t.id === o.plan_template_id) || null;
      return {
        financing_offer_id: o.id,
        plan_name: tpl ? tpl.name : '',
        provider_name: tpl ? tpl.provider_name || '' : '',
        term_length_months: o.term_length_months,
        monthly_payment_amount: o.monthly_payment_amount,
        total_payment_amount: o.total_payment_amount || o.monthly_payment_amount * o.term_length_months,
        apr_percent: o.apr_percent,
        allows_zero_down: tpl ? !!tpl.allows_zero_down : false,
        // Foreign key resolution
        plan_template: tpl
      };
    });

    return {
      calculation_id: calculation.id,
      procedure_cost: calculation.procedure_cost,
      term_length_months: calculation.term_length_months,
      down_payment_amount: calculation.down_payment_amount,
      offers: offersForReturn
    };
  }

  // saveFinancingPlan
  saveFinancingPlan(financingOfferId, name, email) {
    const offers = this._getFromStorage('financing_offers', []);
    const savedPlans = this._getFromStorage('saved_financing_plans', []);

    const offer = offers.find((o) => o.id === financingOfferId);
    if (!offer) {
      return {
        success: false,
        saved_financing_plan_id: null,
        financing_offer_id: financingOfferId,
        name,
        email,
        created_at: null,
        message: 'Financing offer not found.'
      };
    }

    const id = this._generateId('saved_fin_plan');
    const createdAt = new Date().toISOString();
    const record = {
      id,
      financing_offer_id: financingOfferId,
      name,
      email,
      created_at: createdAt
    };
    savedPlans.push(record);
    this._saveToStorage('saved_financing_plans', savedPlans);

    return {
      success: true,
      saved_financing_plan_id: id,
      financing_offer_id: financingOfferId,
      name,
      email,
      created_at: createdAt,
      message: 'Financing plan saved.',
      // Foreign key resolution
      financing_offer: offer
    };
  }

  // submitContactInquiry
  submitContactInquiry(
    reason,
    subject,
    message,
    name,
    email,
    phone,
    preferredContactMethod,
    preferredTimeOfDay
  ) {
    const inquiries = this._getFromStorage('contact_inquiries', []);

    const id = this._generateId('contact');
    const record = {
      id,
      reason,
      subject,
      message,
      name,
      email,
      phone: phone || '',
      preferred_contact_method: preferredContactMethod,
      preferred_time_of_day: preferredTimeOfDay,
      status: 'new',
      created_at: new Date().toISOString()
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      contact_inquiry_id: id,
      status: record.status,
      created_at: record.created_at,
      message: 'Inquiry submitted.'
    };
  }

  // getEvents
  getEvents(format, topic, startDateFrom) {
    const events = this._getFromStorage('events', []);

    let results = events.filter((e) => e.is_active);

    if (format) {
      results = results.filter((e) => e.format === format);
    }
    if (topic) {
      results = results.filter((e) => e.topic === topic);
    }
    if (startDateFrom) {
      const from = new Date(startDateFrom + 'T00:00:00.000Z');
      results = results.filter((e) => new Date(e.start_date) >= from);
    }

    return results.map((e) => ({
      event_id: e.id,
      title: e.title,
      description_short: e.description || '',
      format: e.format,
      topic: e.topic,
      start_date: e.start_date,
      end_date: e.end_date || '',
      is_active: !!e.is_active
    }));
  }

  // getEventDetailWithSessions
  getEventDetailWithSessions(eventId) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);

    const e = events.find((ev) => ev.id === eventId);
    if (!e) {
      return {
        event_id: eventId,
        title: '',
        description: '',
        format: '',
        topic: '',
        start_date: '',
        end_date: '',
        sessions: []
      };
    }

    const eventSessions = sessions
      .filter((s) => s.event_id === eventId)
      .map((s) => ({
        event_session_id: s.id,
        name: s.name || '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime || '',
        is_online: !!s.is_online,
        is_full: !!s.is_full
      }));

    return {
      event_id: e.id,
      title: e.title,
      description: e.description || '',
      format: e.format,
      topic: e.topic,
      start_date: e.start_date,
      end_date: e.end_date || '',
      sessions: eventSessions
    };
  }

  // registerForEventSession
  registerForEventSession(
    eventId,
    eventSessionId,
    attendeeName,
    attendeeEmail,
    interestCategory,
    emailRemindersOptIn
  ) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === eventId) || null;
    const session = sessions.find((s) => s.id === eventSessionId && s.event_id === eventId) || null;

    if (!event || !session) {
      return {
        success: false,
        event_registration_id: null,
        event_id: eventId,
        event_session_id: eventSessionId,
        created_at: null,
        message: 'Event or session not found.'
      };
    }

    if (session.is_full) {
      return {
        success: false,
        event_registration_id: null,
        event_id: eventId,
        event_session_id: eventSessionId,
        created_at: null,
        message: 'Session is full.'
      };
    }

    const id = this._generateId('event_reg');
    const createdAt = new Date().toISOString();
    const record = {
      id,
      event_id: eventId,
      event_session_id: eventSessionId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      interest_category: interestCategory,
      email_reminders_opt_in: !!emailRemindersOptIn,
      created_at: createdAt
    };
    registrations.push(record);
    this._saveToStorage('event_registrations', registrations);

    this._markEventSessionAsFilledIfCapacityReached(eventSessionId);

    return {
      success: true,
      event_registration_id: id,
      event_id: eventId,
      event_session_id: eventSessionId,
      created_at: createdAt,
      message: 'Registration completed.',
      // Foreign key resolution
      event,
      event_session: session
    };
  }

  // generateInstantQuote
  generateInstantQuote(gender, areaToTreat, hairDensityGoal, previousProcedures) {
    const record = this._createInstantQuoteRecord(
      gender,
      areaToTreat,
      hairDensityGoal,
      previousProcedures
    );

    return {
      quote_id: record.id,
      gender: record.gender,
      area_to_treat: record.area_to_treat,
      hair_density_goal: record.hair_density_goal,
      previous_procedures: record.previous_procedures,
      estimated_total_cost: record.estimated_total_cost,
      currency: this._getCurrency(),
      created_at: record.created_at
    };
  }

  // saveInstantQuote
  saveInstantQuote(quoteId, fullName, email) {
    const quotes = this._getFromStorage('instant_quotes', []);
    const savedQuotes = this._getFromStorage('saved_quotes', []);

    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return {
        success: false,
        saved_quote_id: null,
        quote_id: quoteId,
        full_name: fullName,
        email,
        created_at: null,
        message: 'Quote not found.'
      };
    }

    const id = this._generateId('saved_quote');
    const createdAt = new Date().toISOString();
    const record = {
      id,
      quote_id: quoteId,
      full_name: fullName,
      email,
      created_at: createdAt
    };
    savedQuotes.push(record);
    this._saveToStorage('saved_quotes', savedQuotes);

    return {
      success: true,
      saved_quote_id: id,
      quote_id: quoteId,
      full_name: fullName,
      email,
      created_at: createdAt,
      message: 'Quote saved.',
      // Foreign key resolution
      quote
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const practitioners = this._getFromStorage('practitioners', []);
    const locations = this._getFromStorage('clinic_locations', []);

    const practitionersSummary = practitioners
      .filter((p) => p.is_active)
      .map((p) => ({
        practitioner_id: p.id,
        full_name: p.full_name,
        photo_url: p.photo_url || '',
        specialties: p.specialties || [],
        bio_short: (p.bio || '').slice(0, 200)
      }));

    const locationsSummary = locations
      .filter((l) => l.is_active)
      .map((l) => ({
        location_id: l.id,
        name: l.name,
        address: l.address || '',
        city: l.city || '',
        state: l.state || '',
        postal_code: l.postal_code || '',
        phone_number: l.phone_number || '',
        opening_hours: l.opening_hours || ''
      }));

    return {
      mission_statement:
        'Our mission is to provide natural, confidence-restoring hair restoration and scalp micropigmentation with a focus on safety, artistry, and long-term results.',
      experience_overview:
        'Our practitioners specialize exclusively in hair restoration and SMP, with extensive training in hairline design, color matching, and scar camouflage.',
      approach_to_hair_restoration:
        'We combine medical expertise with cosmetic artistry to create treatment plans tailored to each clients hair loss pattern, goals, and lifestyle.',
      practitioners: practitionersSummary,
      locations: locationsSummary
    };
  }

  // getPoliciesContent
  getPoliciesContent() {
    return {
      privacy_policy:
        'We respect your privacy and protect your personal information in accordance with applicable data protection laws. Your details are used only to provide services, process requests, and communicate about your care.',
      terms_of_use:
        'By using this website, you agree that the content is for informational purposes only and does not constitute medical advice. Treatment recommendations are provided only after a professional consultation.',
      consultation_and_booking_policy:
        'Consultations may be rescheduled or cancelled with at least 24 hours notice. Late cancellations or no-shows may be subject to a fee. Final pricing and treatment plans are confirmed during your in-person or virtual consultation.'
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
