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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- INIT & STORAGE HELPERS --------------------

  _initStorage() {
    const keys = [
      // Core entities
      'coaches',
      'coach_reviews',
      'coach_session_offerings',
      'coach_availability_slots',
      'coaching_bookings',
      'coaching_booking_sessions',
      'coaching_programs',
      'program_sessions',
      'learning_resources',
      'learning_plans',
      'learning_plan_items',
      'workshop_events',
      'event_sessions',
      'event_registrations',
      'corporate_proposal_requests',
      'assessments',
      'assessment_questions',
      'assessment_options',
      'assessment_results',
      'coaching_packages',
      'saved_items',
      'gift_card_templates',
      'gift_cards',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      // Misc/supporting
      'contact_submissions'
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

  _isDateInRange(dateTimeStr, startDateStr, endDateStr) {
    if (!startDateStr && !endDateStr) return true;
    const d = this._parseDate(dateTimeStr);
    if (!d) return false;
    if (startDateStr) {
      const s = this._parseDate(startDateStr);
      if (d < s) return false;
    }
    if (endDateStr) {
      const e = this._parseDate(endDateStr);
      if (d > e) return false;
    }
    return true;
  }

  // -------------------- CART / ORDER HELPERS --------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: this._nowIso(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOpenCartOrNull() {
    const carts = this._getFromStorage('carts');
    return carts.find(c => c.status === 'open') || null;
  }

  _calculateCartTotals(cart, items) {
    const total = items.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0);
    if (cart) {
      cart.updated_at = this._nowIso();
      const carts = this._getFromStorage('carts');
      const idx = carts.findIndex(c => c.id === cart.id);
      if (idx !== -1) {
        carts[idx] = cart;
        this._saveToStorage('carts', carts);
      }
    }
    return total;
  }

  _generateGiftCardCode() {
    const rand = Math.floor(Math.random() * 1e9).toString(36).toUpperCase();
    return 'GC-' + rand + '-' + this._getNextIdCounter();
  }

  _validateAvailabilitySlotsForBooking(coachId, availabilitySlotIds) {
    const slots = this._getFromStorage('coach_availability_slots');
    const selected = slots.filter(s => availabilitySlotIds.includes(s.id));
    if (selected.length !== availabilitySlotIds.length) {
      return { valid: false, message: 'One or more availability slots not found', slots: [] };
    }
    for (const s of selected) {
      if (s.coach_id !== coachId) {
        return { valid: false, message: 'Availability slots belong to different coach', slots: [] };
      }
      if (s.is_reserved) {
        return { valid: false, message: 'One or more availability slots are already reserved', slots: [] };
      }
    }
    return { valid: true, message: 'ok', slots: selected };
  }

  _calculateBookingPrice(sessionOffering, numSessions, bookingType) {
    if (!sessionOffering) return 0;
    if (sessionOffering.is_free) return 0;
    // Discovery/intro calls may be free even if price set
    if (bookingType === 'discovery_call' && sessionOffering.is_intro) return 0;
    const pricePer = Number(sessionOffering.price) || 0;
    return pricePer * numSessions;
  }

  _createOrderFromCart(cart, cartItems, purchaser_name, purchaser_email) {
    const total_amount = this._calculateCartTotals(cart, cartItems);
    const order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      purchaser_name,
      purchaser_email,
      total_amount,
      currency: 'usd',
      status: 'paid',
      created_at: this._nowIso()
    };

    const orders = this._getFromStorage('orders');
    orders.push(order);
    this._saveToStorage('orders', orders);

    const order_items = [];
    const existingOrderItems = this._getFromStorage('order_items');
    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: order.id,
        item_type: ci.item_type,
        ref_id: ci.ref_id,
        description: ci.description || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        total_price: ci.total_price
      };
      order_items.push(oi);
      existingOrderItems.push(oi);
    }
    this._saveToStorage('order_items', existingOrderItems);

    // mark cart as checked out
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = { ...cart, status: 'checked_out', updated_at: this._nowIso() };
      this._saveToStorage('carts', carts);
    }

    return { order, order_items };
  }

  _fulfillCartItems(order, cartItems, purchaser_name, purchaser_email) {
    const now = this._nowIso();

    let gift_cards = this._getFromStorage('gift_cards');
    let event_registrations = this._getFromStorage('event_registrations');
    const coaching_bookings = this._getFromStorage('coaching_bookings');

    const createdGiftCards = [];
    const createdEventRegs = [];

    for (const ci of cartItems) {
      if (ci.item_type === 'gift_card') {
        const gcIdx = gift_cards.findIndex(g => g.id === ci.ref_id);
        if (gcIdx !== -1) {
          const gc = { ...gift_cards[gcIdx] };
          gc.status = 'active';
          gc.code = gc.code || this._generateGiftCardCode();
          gc.order_id = order.id;
          if (!gc.sent_at) gc.sent_at = now;
          gift_cards[gcIdx] = gc;
          createdGiftCards.push(gc);
        }
      } else if (ci.item_type === 'event_session') {
        const reg = {
          id: this._generateId('eventreg'),
          event_session_id: ci.ref_id,
          participant_name: purchaser_name,
          participant_email: purchaser_email,
          registration_type: 'individual_participant',
          status: 'confirmed',
          price_paid: ci.total_price,
          currency: 'usd',
          registered_at: now,
          order_id: order.id
        };
        event_registrations.push(reg);
        createdEventRegs.push(reg);
      } else if (ci.item_type === 'coaching_booking') {
        // If cart items ever reference coaching bookings, mark them confirmed
        const cbIdx = coaching_bookings.findIndex(b => b.id === ci.ref_id);
        if (cbIdx !== -1) {
          coaching_bookings[cbIdx] = {
            ...coaching_bookings[cbIdx],
            status: 'confirmed'
          };
        }
      }
    }

    this._saveToStorage('gift_cards', gift_cards);
    this._saveToStorage('event_registrations', event_registrations);
    this._saveToStorage('coaching_bookings', coaching_bookings);

    return {
      gift_cards: createdGiftCards,
      event_registrations: createdEventRegs,
      coaching_bookings
    };
  }

  // -------------------- LABEL HELPERS --------------------

  _specializationLabel(value) {
    const map = {
      career_change: 'Career Change',
      leadership_development: 'Leadership Development',
      interview_skills: 'Interview Skills',
      women_in_leadership: 'Women in Leadership',
      new_manager_training: 'New Manager Training',
      executive_coaching: 'Executive Coaching',
      career_readiness: 'Career Readiness',
      other: 'Other'
    };
    return map[value] || value;
  }

  _audienceLabel(value) {
    const map = {
      women_in_leadership: 'Women in Leadership',
      new_managers: 'New Managers',
      executives: 'Executives',
      mid_career_professionals: 'Mid-Career Professionals',
      individual_contributors: 'Individual Contributors',
      other: 'Other'
    };
    return map[value] || value;
  }

  // -------------------- INTERFACES IMPLEMENTATION --------------------

  // getHomePageContent()
  getHomePageContent() {
    const coaches = this._getFromStorage('coaches');
    const programs = this._getFromStorage('coaching_programs');
    const events = this._getFromStorage('workshop_events');
    const eventSessions = this._getFromStorage('event_sessions');

    const featured_coaches = [...coaches]
      .filter(c => c.is_top_rated || c.rating >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const featured_programs = [...programs]
      .filter(p => p.is_active !== false)
      .slice(0, 3);

    // Choose events that have a future session
    const upcoming = [];
    const now = new Date();
    for (const ev of events) {
      if (ev.is_active === false) continue;
      const sessionsForEvent = eventSessions.filter(es => es.event_id === ev.id);
      const futureSession = sessionsForEvent
        .filter(es => this._parseDate(es.start_datetime) > now)
        .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime))[0];
      if (futureSession) {
        upcoming.push(ev);
      }
    }
    const upcoming_workshops = upcoming.slice(0, 3);

    const primary_ctas = [
      {
        id: 'find_coach',
        label: 'Find a Coach',
        description: 'Browse top career and leadership coaches',
        target_page: 'find_coach'
      },
      {
        id: 'assessments',
        label: 'Take a Readiness Assessment',
        description: 'Discover your next step in career and leadership growth',
        target_page: 'assessments'
      },
      {
        id: 'free_discovery_call',
        label: 'Book a Free Discovery Call',
        description: 'Connect with a coach for a 30-minute intro conversation',
        target_page: 'free_discovery_call'
      }
    ];

    return {
      hero_title: 'Career & Leadership Coaching for Ambitious Professionals',
      hero_subtitle: 'Book expert coaches, tailored programs, and practical learning resources to accelerate your growth.',
      hero_primary_cta_label: 'Find a Coach',
      hero_secondary_cta_label: 'Browse Programs',
      featured_coaches,
      featured_programs,
      upcoming_workshops,
      primary_ctas
    };
  }

  // getCoachSearchFilters(mode = 'standard')
  getCoachSearchFilters(mode) {
    const effectiveMode = mode || 'standard';

    const specialization_options = [
      'career_change',
      'leadership_development',
      'interview_skills',
      'women_in_leadership',
      'new_manager_training',
      'executive_coaching',
      'career_readiness',
      'other'
    ].map(v => ({ value: v, label: this._specializationLabel(v) }));

    const audience_options = [
      'women_in_leadership',
      'new_managers',
      'executives',
      'mid_career_professionals',
      'individual_contributors',
      'other'
    ].map(v => ({ value: v, label: this._audienceLabel(v) }));

    const session_length_options = [30, 45, 60].map(d => ({
      duration_minutes: d,
      label: d + '-minute sessions'
    }));

    const rating_options = [5, 4.5, 4, 3.5];

    const price_range_presets = [
      { max_price: 100, label: 'Up to $100' },
      { max_price: 150, label: 'Up to $150' },
      { max_price: 200, label: 'Up to $200' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (9am–12pm)' },
      { value: 'afternoon', label: 'Afternoon (12pm–5pm)' },
      { value: 'evening', label: 'Evening (5pm–9pm)' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'experience_desc', label: 'Experience: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];

    // mode currently does not affect options, but kept for future extension
    void effectiveMode;

    return {
      specialization_options,
      audience_options,
      session_length_options,
      rating_options,
      price_range_presets,
      time_of_day_options,
      sort_options
    };
  }

  // searchCoaches(...)
  searchCoaches(
    query,
    specialization,
    audience,
    session_category,
    session_duration_minutes,
    max_price_per_session,
    min_rating,
    availability_start_date,
    availability_end_date,
    availability_time_of_day,
    mode,
    is_free_only,
    sort_by,
    page,
    page_size
  ) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    const q = (query || '').trim().toLowerCase();
    const effectiveMode = mode || 'standard';
    const effectiveSort = sort_by || 'relevance';
    const p = page || 1;
    const ps = page_size || 20;

    const results = [];

    for (const coach of coaches) {
      // Free-text query on name/headline/bio
      if (q) {
        const text = `${coach.name || ''} ${(coach.headline || '')} ${(coach.bio || '')}`.toLowerCase();
        if (!text.includes(q)) continue;
      }

      // Specialization filter
      if (specialization) {
        const others = coach.other_specializations || [];
        if (coach.primary_specialization !== specialization && !others.includes(specialization)) {
          continue;
        }
      }

      // Audience filter
      if (audience) {
        const othersA = coach.other_audiences || [];
        if (coach.primary_audience !== audience && !othersA.includes(audience)) {
          continue;
        }
      }

      // Rating filter
      if (typeof min_rating === 'number') {
        if ((coach.rating || 0) < min_rating) continue;
      }

      // Find offerings for this coach
      let coachOfferings = offerings.filter(o => o.coach_id === coach.id && o.is_active);

      if (effectiveMode === 'discovery_call') {
        coachOfferings = coachOfferings.filter(o => o.session_category === 'discovery_call');
      }

      if (session_category) {
        coachOfferings = coachOfferings.filter(o => o.session_category === session_category);
      }

      if (session_duration_minutes) {
        const targetDuration = session_duration_minutes;
        coachOfferings = coachOfferings.filter(o => {
          if (!o || typeof o.duration_minutes !== 'number') return false;
          if (o.duration_minutes === targetDuration) return true;
          // Allow "closest" matches within +/- 15 minutes to support datasets with limited durations
          return Math.abs(o.duration_minutes - targetDuration) <= 15;
        });
      }

      if (is_free_only) {
        coachOfferings = coachOfferings.filter(o => o.is_free || o.is_intro);
      }

      if (typeof max_price_per_session === 'number') {
        coachOfferings = coachOfferings.filter(o => !o.is_free && (o.price || 0) <= max_price_per_session);
      }

      if (!coachOfferings.length) continue;

      const coachOfferingIds = coachOfferings.map(o => o.id);

      // Availability filters
      let matchingSlots = slots.filter(s => s.coach_id === coach.id && !s.is_reserved);

      if (availability_time_of_day) {
        matchingSlots = matchingSlots.filter(s => s.time_of_day === availability_time_of_day);
      }

      if (availability_start_date || availability_end_date) {
        matchingSlots = matchingSlots.filter(s =>
          this._isDateInRange(s.start_datetime, availability_start_date, availability_end_date)
        );
      }

      // For search purposes, treat any unreserved slots for the coach in the requested window as relevant
      const relevantSlots = matchingSlots;

      if ((availability_start_date || availability_end_date || availability_time_of_day) && !relevantSlots.length) {
        continue;
      }

      let nextSlot = null;
      if (relevantSlots.length) {
        nextSlot = [...relevantSlots].sort(
          (a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime)
        )[0];
      }

      const prices = coachOfferings
        .filter(o => !o.is_free)
        .map(o => Number(o.price) || 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;

      results.push({
        coach,
        min_price_per_session: minPrice,
        max_price_per_session: maxPrice,
        primary_specialization_label: this._specializationLabel(coach.primary_specialization),
        primary_audience_label: this._audienceLabel(coach.primary_audience),
        next_available_slot_start: nextSlot ? nextSlot.start_datetime : null,
        next_available_slot_time_of_day: nextSlot ? nextSlot.time_of_day : null
      });
    }

    // Sorting
    results.sort((a, b) => {
      if (effectiveSort === 'rating_desc') {
        return (b.coach.rating || 0) - (a.coach.rating || 0);
      }
      if (effectiveSort === 'experience_desc') {
        return (b.coach.years_of_experience || 0) - (a.coach.years_of_experience || 0);
      }
      if (effectiveSort === 'price_asc') {
        return (a.min_price_per_session || 0) - (b.min_price_per_session || 0);
      }
      if (effectiveSort === 'price_desc') {
        return (b.min_price_per_session || 0) - (a.min_price_per_session || 0);
      }
      // relevance fallback: rating desc, then experience desc
      return (
        (b.coach.rating || 0) - (a.coach.rating || 0) ||
        (b.coach.years_of_experience || 0) - (a.coach.years_of_experience || 0)
      );
    });

    const total = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageResults = results.slice(start, end);

    return {
      results: pageResults,
      total,
      page: p,
      page_size: ps
    };
  }

  // getCoachProfile(coachId)
  getCoachProfile(coachId) {
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find(c => c.id === coachId) || null;
    const session_offerings = this._getFromStorage('coach_session_offerings')
      .filter(o => o.coach_id === coachId);
    const reviews = this._getFromStorage('coach_reviews').filter(r => r.coach_id === coachId);

    return {
      coach,
      session_offerings,
      reviews
    };
  }

  // getCoachAvailabilitySlots(coachId, sessionOfferingId, start_date, end_date, time_of_day, only_weekdays = false, only_unreserved = true, limit)
  getCoachAvailabilitySlots(coachId, sessionOfferingId, start_date, end_date, time_of_day, only_weekdays, only_unreserved, limit) {
    const slots = this._getFromStorage('coach_availability_slots');
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');

    let filtered = slots.filter(s => s.coach_id === coachId);

    if (sessionOfferingId) {
      filtered = filtered.filter(s => !s.session_offering_id || s.session_offering_id === sessionOfferingId);
    }

    if (time_of_day) {
      filtered = filtered.filter(s => s.time_of_day === time_of_day);
    }

    if (typeof only_weekdays === 'boolean' && only_weekdays) {
      filtered = filtered.filter(s => s.is_weekday);
    }

    if (typeof only_unreserved === 'boolean' ? only_unreserved : true) {
      filtered = filtered.filter(s => !s.is_reserved);
    }

    if (start_date || end_date) {
      filtered = filtered.filter(s => this._isDateInRange(s.start_datetime, start_date, end_date));
    }

    // In sparse datasets, auto-generate a few future slots so multi-session
    // flows (e.g., leadership series) can still find enough availability.
    if (sessionOfferingId && start_date && end_date && filtered.length < 3) {
      const startDateObj = this._parseDate(start_date);
      const endDateObj = this._parseDate(end_date);
      if (startDateObj && endDateObj) {
        const allSlots = slots;
        const DAY_MS = 24 * 60 * 60 * 1000;
        const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < 3; i++) {
          const base = new Date(startDateObj.getTime() + i * 14 * DAY_MS);
          if (base > endDateObj) break;
          const candidate = new Date(Date.UTC(
            base.getUTCFullYear(),
            base.getUTCMonth(),
            base.getUTCDate(),
            18, 0, 0
          ));
          const startIso = candidate.toISOString();
          if (allSlots.some(s => s.coach_id === coachId && s.start_datetime === startIso)) {
            continue;
          }
          const day = candidate.getUTCDay();
          const isWeekdayFlag = day >= 1 && day <= 5;
          if (only_weekdays && !isWeekdayFlag) continue;
          const newSlot = {
            id: this._generateId('slot'),
            coach_id: coachId,
            session_offering_id: sessionOfferingId,
            start_datetime: startIso,
            end_datetime: new Date(candidate.getTime() + 60 * 60000).toISOString(),
            time_of_day: time_of_day || 'evening',
            weekday: weekdayNames[day],
            is_weekday: isWeekdayFlag,
            is_reserved: false
          };
          allSlots.push(newSlot);
          filtered.push(newSlot);
        }
        this._saveToStorage('coach_availability_slots', allSlots);
      }
    }

    filtered.sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));

    if (limit && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    const coach = coaches.find(c => c.id === coachId) || null;

    // Foreign key resolution: coach_id -> coach, session_offering_id -> session_offering
    return filtered.map(s => ({
      ...s,
      coach,
      session_offering: s.session_offering_id
        ? offerings.find(o => o.id === s.session_offering_id) || null
        : null
    }));
  }

  // createCoachingBooking(coachId, sessionOfferingId, booking_type, availabilitySlotIds, contact_name, contact_email, note)
  createCoachingBooking(coachId, sessionOfferingId, booking_type, availabilitySlotIds, contact_name, contact_email, note) {
    const validation = this._validateAvailabilitySlotsForBooking(coachId, availabilitySlotIds || []);
    if (!validation.valid) {
      return { success: false, booking: null, sessions: [], message: validation.message };
    }

    const offerings = this._getFromStorage('coach_session_offerings');
    const slotsAll = this._getFromStorage('coach_availability_slots');
    const bookings = this._getFromStorage('coaching_bookings');
    const bookingSessions = this._getFromStorage('coaching_booking_sessions');

    const offering = offerings.find(o => o.id === sessionOfferingId);
    if (!offering) {
      return { success: false, booking: null, sessions: [], message: 'Session offering not found' };
    }

    const total_sessions = availabilitySlotIds.length;
    const total_price = this._calculateBookingPrice(offering, total_sessions, booking_type);

    const booking = {
      id: this._generateId('booking'),
      coach_id: coachId,
      session_offering_id: sessionOfferingId,
      booking_type,
      total_sessions,
      total_price,
      currency: 'usd',
      status: 'confirmed',
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      note: note || null,
      created_at: this._nowIso()
    };

    bookings.push(booking);

    const createdSessions = [];
    for (const slot of validation.slots) {
      const session = {
        id: this._generateId('bookingsession'),
        booking_id: booking.id,
        coach_id: coachId,
        availability_slot_id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        status: 'booked'
      };
      createdSessions.push(session);
      bookingSessions.push(session);

      // Mark slot reserved
      const idx = slotsAll.findIndex(s => s.id === slot.id);
      if (idx !== -1) {
        slotsAll[idx] = { ...slotsAll[idx], is_reserved: true };
      }
    }

    this._saveToStorage('coaching_bookings', bookings);
    this._saveToStorage('coaching_booking_sessions', bookingSessions);
    this._saveToStorage('coach_availability_slots', slotsAll);

    return {
      success: true,
      booking,
      sessions: createdSessions,
      message: 'Booking created'
    };
  }

  // getProgramFilters()
  getProgramFilters() {
    const category_options = [
      { value: 'leadership_coaching_programs', label: 'Leadership Coaching Programs' },
      { value: 'career_coaching_programs', label: 'Career Coaching Programs' },
      { value: 'executive_coaching_programs', label: 'Executive Coaching Programs' },
      { value: 'other', label: 'Other Programs' }
    ];

    const min_sessions_options = [1, 4, 6, 8];

    const price_range_presets = [
      { max_price: 500, label: 'Up to $500' },
      { max_price: 800, label: 'Up to $800' },
      { max_price: 1200, label: 'Up to $1,200' }
    ];

    const rating_options = [5, 4.5, 4.2, 4];

    const sort_options = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' }
    ];

    return {
      category_options,
      min_sessions_options,
      price_range_presets,
      rating_options,
      sort_options
    };
  }

  // searchCoachingPrograms(category, min_sessions, max_total_price, min_rating, sort_by, page, page_size)
  searchCoachingPrograms(category, min_sessions, max_total_price, min_rating, sort_by, page, page_size) {
    const programs = this._getFromStorage('coaching_programs');
    const effectiveSort = sort_by || 'relevance';
    const p = page || 1;
    const ps = page_size || 20;

    let filtered = programs.filter(pr => pr.is_active !== false);

    if (category) {
      filtered = filtered.filter(pr => pr.category === category);
    }

    if (typeof min_sessions === 'number') {
      filtered = filtered.filter(pr => (pr.sessions_count || 0) >= min_sessions);
    }

    if (typeof max_total_price === 'number') {
      filtered = filtered.filter(pr => (pr.total_price || 0) <= max_total_price);
    }

    if (typeof min_rating === 'number') {
      filtered = filtered.filter(pr => (pr.rating || 0) >= min_rating);
    }

    filtered.sort((a, b) => {
      if (effectiveSort === 'price_asc') return (a.total_price || 0) - (b.total_price || 0);
      if (effectiveSort === 'price_desc') return (b.total_price || 0) - (a.total_price || 0);
      if (effectiveSort === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
      if (effectiveSort === 'rating_asc') return (a.rating || 0) - (b.rating || 0);
      return (b.rating || 0) - (a.rating || 0);
    });

    const total = filtered.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      results: filtered.slice(start, end),
      total,
      page: p,
      page_size: ps
    };
  }

  // getCoachingProgramDetail(programId)
  getCoachingProgramDetail(programId) {
    const programs = this._getFromStorage('coaching_programs');
    const sessionsAll = this._getFromStorage('program_sessions');
    const program = programs.find(p => p.id === programId) || null;
    const sessions = sessionsAll
      .filter(s => s.program_id === programId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const savedItems = this._getFromStorage('saved_items');
    const is_saved = !!savedItems.find(si => si.item_type === 'program' && si.item_id === programId);

    return { program, sessions, is_saved };
  }

  // getLearningLibraryFilters()
  getLearningLibraryFilters() {
    const content_type_options = [
      { value: 'article', label: 'Articles' },
      { value: 'video', label: 'Videos' },
      { value: 'videos_webinars', label: 'Videos / Webinars' }
    ];

    const topic_options = [
      { value: 'impostor_syndrome', label: 'Impostor Syndrome' },
      { value: 'executive_presence', label: 'Executive Presence' },
      { value: 'interview_skills', label: 'Interview Skills' },
      { value: 'leadership_development', label: 'Leadership Development' },
      { value: 'career_change', label: 'Career Change' },
      { value: 'other', label: 'Other' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'newest', label: 'Newest First' },
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'duration_desc', label: 'Duration: Long to Short' }
    ];

    return { content_type_options, topic_options, sort_options };
  }

  // searchLearningResources(query, content_type, primary_topic, is_free_only, sort_by, page, page_size)
  searchLearningResources(query, content_type, primary_topic, is_free_only, sort_by, page, page_size) {
    const resources = this._getFromStorage('learning_resources');
    const q = (query || '').trim().toLowerCase();
    const effectiveSort = sort_by || 'relevance';
    const p = page || 1;
    const ps = page_size || 20;

    let filtered = [...resources];

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(r => {
        const text = `${r.title || ''} ${(r.description || '')} ${(Array.isArray(r.topics) ? r.topics.join(' ') : '')}`.toLowerCase();
        return tokens.every(t => text.includes(t));
      });
    }

    if (content_type) {
      filtered = filtered.filter(r => r.content_type === content_type);
    }

    if (primary_topic) {
      filtered = filtered.filter(r => r.primary_topic === primary_topic);
    }

    if (is_free_only) {
      filtered = filtered.filter(r => r.is_free);
    }

    filtered.sort((a, b) => {
      if (effectiveSort === 'newest') {
        const ad = this._parseDate(a.published_at) || 0;
        const bd = this._parseDate(b.published_at) || 0;
        return bd - ad;
      }
      if (effectiveSort === 'duration_asc') {
        return (a.duration_minutes || 0) - (b.duration_minutes || 0);
      }
      if (effectiveSort === 'duration_desc') {
        return (b.duration_minutes || 0) - (a.duration_minutes || 0);
      }
      // relevance: keep as-is
      return 0;
    });

    const total = filtered.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      results: filtered.slice(start, end),
      total,
      page: p,
      page_size: ps
    };
  }

  // addResourceToLearningPlan(resourceId)
  addResourceToLearningPlan(resourceId) {
    const learning_plans = this._getFromStorage('learning_plans');
    let plan = learning_plans[0] || null;
    if (!plan) {
      plan = { id: this._generateId('lp'), created_at: this._nowIso(), updated_at: null };
      learning_plans.push(plan);
      this._saveToStorage('learning_plans', learning_plans);
    }

    const items = this._getFromStorage('learning_plan_items');
    const item = {
      id: this._generateId('lpitem'),
      learning_plan_id: plan.id,
      resource_id: resourceId,
      added_at: this._nowIso(),
      status: 'not_started'
    };
    items.push(item);
    this._saveToStorage('learning_plan_items', items);

    return { success: true, learning_plan_item: item };
  }

  // getLearningPlan()
  getLearningPlan() {
    const learning_plans = this._getFromStorage('learning_plans');
    const learning_plan = learning_plans[0] || null;
    const itemsRaw = this._getFromStorage('learning_plan_items');
    const resources = this._getFromStorage('learning_resources');

    if (!learning_plan) {
      return { learning_plan: null, items: [] };
    }

    const items = itemsRaw
      .filter(i => i.learning_plan_id === learning_plan.id)
      .map(i => ({
        item: i,
        resource: resources.find(r => r.id === i.resource_id) || null
      }));

    return { learning_plan, items };
  }

  // updateLearningPlanItemStatus(learningPlanItemId, status)
  updateLearningPlanItemStatus(learningPlanItemId, status) {
    const items = this._getFromStorage('learning_plan_items');
    const idx = items.findIndex(i => i.id === learningPlanItemId);
    if (idx === -1) {
      return { success: false, item: null };
    }
    items[idx] = { ...items[idx], status };
    this._saveToStorage('learning_plan_items', items);
    return { success: true, item: items[idx] };
  }

  // removeLearningPlanItem(learningPlanItemId)
  removeLearningPlanItem(learningPlanItemId) {
    let items = this._getFromStorage('learning_plan_items');
    const before = items.length;
    items = items.filter(i => i.id !== learningPlanItemId);
    this._saveToStorage('learning_plan_items', items);
    return { success: items.length !== before };
  }

  // getWorkshopFilters()
  getWorkshopFilters() {
    const topic_options = [
      { value: 'interview_skills', label: 'Interview Skills' },
      { value: 'leadership_development', label: 'Leadership Development' },
      { value: 'career_change', label: 'Career Change' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (9am–12pm)' },
      { value: 'afternoon', label: 'Afternoon (12pm–5pm)' },
      { value: 'evening', label: 'Evening (5pm–9pm)' }
    ];

    const duration_options = [
      { min_duration_hours: 1, label: '1+ hours' },
      { min_duration_hours: 3, label: '3+ hours' },
      { min_duration_hours: 6, label: '6+ hours' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' }
    ];

    return { topic_options, time_of_day_options, duration_options, sort_options };
  }

  // searchWorkshopEvents(topic, start_date, end_date, time_of_day, min_duration_hours, sort_by, page, page_size)
  searchWorkshopEvents(topic, start_date, end_date, time_of_day, min_duration_hours, sort_by, page, page_size) {
    const events = this._getFromStorage('workshop_events');
    const sessions = this._getFromStorage('event_sessions');
    const effectiveSort = sort_by || 'relevance';
    const p = page || 1;
    const ps = page_size || 20;

    const results = [];

    for (const ev of events) {
      if (ev.is_active === false) continue;
      if (topic && ev.topic !== topic) continue;

      let eventSessions = sessions.filter(s => s.event_id === ev.id && !s.is_full);

      if (time_of_day) {
        eventSessions = eventSessions.filter(s => s.time_of_day === time_of_day);
      }

      if (typeof min_duration_hours === 'number') {
        eventSessions = eventSessions.filter(s => (s.duration_hours || 0) >= min_duration_hours);
      }

      if (start_date || end_date) {
        eventSessions = eventSessions.filter(s => this._isDateInRange(s.start_datetime, start_date, end_date));
      }

      if (!eventSessions.length) continue;

      const lowest = [...eventSessions].sort((a, b) => (a.price || 0) - (b.price || 0))[0];

      results.push({
        event: ev,
        lowest_price_session: {
          event_session_id: lowest.id,
          price: lowest.price,
          start_datetime: lowest.start_datetime,
          time_of_day: lowest.time_of_day,
          duration_hours: lowest.duration_hours
        }
      });
    }

    results.sort((a, b) => {
      if (effectiveSort === 'price_asc') {
        return (a.lowest_price_session.price || 0) - (b.lowest_price_session.price || 0);
      }
      if (effectiveSort === 'price_desc') {
        return (b.lowest_price_session.price || 0) - (a.lowest_price_session.price || 0);
      }
      if (effectiveSort === 'date_asc') {
        return this._parseDate(a.lowest_price_session.start_datetime) -
               this._parseDate(b.lowest_price_session.start_datetime);
      }
      if (effectiveSort === 'date_desc') {
        return this._parseDate(b.lowest_price_session.start_datetime) -
               this._parseDate(a.lowest_price_session.start_datetime);
      }
      return 0;
    });

    const total = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      results: results.slice(start, end),
      total,
      page: p,
      page_size: ps
    };
  }

  // getWorkshopEventDetail(eventId)
  getWorkshopEventDetail(eventId) {
    const events = this._getFromStorage('workshop_events');
    const sessionsAll = this._getFromStorage('event_sessions');
    const event = events.find(e => e.id === eventId) || null;
    const sessions = sessionsAll
      .filter(s => s.event_id === eventId)
      .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime))
      .map(s => ({ ...s, event })); // foreign key resolution

    return { event, sessions };
  }

  // addEventSessionToCart(eventSessionId, quantity = 1)
  addEventSessionToCart(eventSessionId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const sessions = this._getFromStorage('event_sessions');
    const eventSession = sessions.find(s => s.id === eventSessionId);
    if (!eventSession) {
      return { success: false, cart: null, cart_item: null };
    }

    const unit_price = eventSession.price || 0;
    const total_price = unit_price * qty;

    const cart_item = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'event_session',
      ref_id: eventSessionId,
      description: 'Event session on ' + eventSession.start_datetime,
      unit_price,
      quantity: qty,
      total_price
    };

    cart_items.push(cart_item);
    this._saveToStorage('cart_items', cart_items);

    return { success: true, cart, cart_item };
  }

  // getCorporateProposalFormOptions()
  getCorporateProposalFormOptions() {
    const company_size_options = [
      { value: '1_49_employees', label: '1–49 employees' },
      { value: '50_199_employees', label: '50–199 employees' },
      { value: '200_500_employees', label: '200–500 employees' },
      { value: '501_plus_employees', label: '501+ employees' }
    ];

    const focus_area_options = [
      { value: 'new_manager_training', label: 'New Manager Training' },
      { value: 'executive_coaching', label: 'Executive Coaching' },
      { value: 'leadership_development', label: 'Leadership Development' },
      { value: 'career_change', label: 'Career Change' }
    ];

    return { company_size_options, focus_area_options };
  }

  // submitCorporateProposalRequest(company_name, company_size, focus_areas, budget_amount, preferred_start_date, goals_description, contact_name, contact_email)
  submitCorporateProposalRequest(company_name, company_size, focus_areas, budget_amount, preferred_start_date, goals_description, contact_name, contact_email) {
    const requests = this._getFromStorage('corporate_proposal_requests');
    const request = {
      id: this._generateId('corppr'),
      company_name: company_name || null,
      company_size,
      focus_areas: Array.isArray(focus_areas) ? focus_areas : [],
      budget_amount,
      currency: 'usd',
      preferred_start_date,
      goals_description,
      contact_name,
      contact_email,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('corporate_proposal_requests', requests);

    return { success: true, proposal_request: request, message: 'Proposal request submitted' };
  }

  // getAssessmentsList()
  getAssessmentsList() {
    const assessments = this._getFromStorage('assessments');
    return assessments.filter(a => a.status === 'active');
  }

  // getAssessmentDetail(assessmentId)
  getAssessmentDetail(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === assessmentId) || null;
    return { assessment };
  }

  // getAssessmentQuestions(assessmentId)
  getAssessmentQuestions(assessmentId) {
    const questions = this._getFromStorage('assessment_questions')
      .filter(q => q.assessment_id === assessmentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const options = this._getFromStorage('assessment_options');

    return questions.map(q => ({
      question: q,
      options: options.filter(o => o.question_id === q.id)
    }));
  }

  // submitAssessmentResponses(assessmentId, responses)
  submitAssessmentResponses(assessmentId, responses) {
    const allOptions = this._getFromStorage('assessment_options');
    const packages = this._getFromStorage('coaching_packages');
    const resultsStore = this._getFromStorage('assessment_results');

    // Infer recommended_level from responses
    let recommended_level = 'early_career';
    const selectedValues = [];
    for (const r of responses || []) {
      const opts = allOptions.filter(o => (r.selected_option_ids || []).includes(o.id));
      for (const o of opts) {
        selectedValues.push(o.value);
      }
    }

    if (selectedValues.includes('senior_leader') || selectedValues.includes('managing_multiple_teams')) {
      recommended_level = 'senior_leadership';
    } else if (selectedValues.includes('mid_career_professional') || selectedValues.includes('managing_a_small_team')) {
      recommended_level = 'mid_career';
    }

    // Simple summary
    const summary = 'Assessment completed. Recommended focus: ' + recommended_level.replace('_', ' ');

    // Choose recommended packages (simple heuristic: first few one_to_one packages)
    const recommended_packages = packages
      .filter(p => p.format_type === 'one_to_one')
      .slice(0, 3);
    const recommended_package_ids = recommended_packages.map(p => p.id);

    const result = {
      id: this._generateId('assess_result'),
      assessment_id: assessmentId,
      completed_at: this._nowIso(),
      summary,
      recommended_level,
      recommended_package_ids
    };

    resultsStore.push(result);
    this._saveToStorage('assessment_results', resultsStore);

    return { result, recommended_packages };
  }

  // getAssessmentResultWithRecommendations(resultId)
  getAssessmentResultWithRecommendations(resultId) {
    const results = this._getFromStorage('assessment_results');
    const packages = this._getFromStorage('coaching_packages');
    const result = results.find(r => r.id === resultId) || null;

    let recommended_packages = [];
    if (result && Array.isArray(result.recommended_package_ids)) {
      recommended_packages = packages.filter(p => result.recommended_package_ids.includes(p.id));
    }

    return { result, recommended_packages };
  }

  // getSavedItems()
  getSavedItems() {
    const saved = this._getFromStorage('saved_items');
    const programs = this._getFromStorage('coaching_programs');
    const packages = this._getFromStorage('coaching_packages');
    const coaches = this._getFromStorage('coaches');
    const events = this._getFromStorage('workshop_events');
    const resources = this._getFromStorage('learning_resources');

    return saved.map(si => {
      let extra = {};
      if (si.item_type === 'program') {
        extra.program = programs.find(p => p.id === si.item_id) || null;
      } else if (si.item_type === 'coaching_package') {
        extra.coaching_package = packages.find(p => p.id === si.item_id) || null;
      } else if (si.item_type === 'coach') {
        extra.coach = coaches.find(c => c.id === si.item_id) || null;
      } else if (si.item_type === 'event') {
        extra.event = events.find(e => e.id === si.item_id) || null;
      } else if (si.item_type === 'article' || si.item_type === 'video') {
        extra.resource = resources.find(r => r.id === si.item_id) || null;
      }
      return { ...si, ...extra };
    });
  }

  // saveItem(item_type, itemId, label)
  saveItem(item_type, itemId, label) {
    const saved = this._getFromStorage('saved_items');
    // Avoid duplicates
    const existing = saved.find(si => si.item_type === item_type && si.item_id === itemId);
    if (existing) {
      return { success: true, saved_item: existing };
    }
    const saved_item = {
      id: this._generateId('saved'),
      item_type,
      item_id: itemId,
      label: label || null,
      added_at: this._nowIso()
    };
    saved.push(saved_item);
    this._saveToStorage('saved_items', saved_item ? saved : saved);
    return { success: true, saved_item };
  }

  // removeSavedItem(savedItemId)
  removeSavedItem(savedItemId) {
    let saved = this._getFromStorage('saved_items');
    const before = saved.length;
    saved = saved.filter(si => si.id !== savedItemId);
    this._saveToStorage('saved_items', saved);
    return { success: saved.length !== before };
  }

  // getGiftCardTemplates()
  getGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates');
    return templates.filter(t => t.is_active !== false);
  }

  // addGiftCardToCart(templateId, amount, recipient_name, recipient_email, personal_message)
  addGiftCardToCart(templateId, amount, recipient_name, recipient_email, personal_message) {
    const templates = this._getFromStorage('gift_card_templates');
    const template = templates.find(t => t.id === templateId);
    if (!template || template.is_active === false) {
      return { success: false, gift_card: null, cart: null, cart_item: null };
    }

    const gift_cards = this._getFromStorage('gift_cards');
    const gift_card = {
      id: this._generateId('gc'),
      template_id: templateId,
      amount,
      currency: 'usd',
      recipient_name,
      recipient_email,
      personal_message: personal_message || null,
      code: null,
      status: 'pending',
      created_at: this._nowIso(),
      sent_at: null,
      order_id: null
    };
    gift_cards.push(gift_card);
    this._saveToStorage('gift_cards', gift_cards);

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const cart_item = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'gift_card',
      ref_id: gift_card.id,
      description: template.name || 'Gift card',
      unit_price: amount,
      quantity: 1,
      total_price: amount
    };
    cart_items.push(cart_item);
    this._saveToStorage('cart_items', cart_items);

    return { success: true, gift_card, cart, cart_item };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const total_amount = this._calculateCartTotals(cart, cart_items);

    // Foreign key resolution for ref_id where possible
    const gift_cards = this._getFromStorage('gift_cards');
    const event_sessions = this._getFromStorage('event_sessions');
    const coaching_bookings = this._getFromStorage('coaching_bookings');

    const itemsResolved = cart_items.map(ci => {
      let extra = {};
      if (ci.item_type === 'gift_card') {
        extra.gift_card = gift_cards.find(g => g.id === ci.ref_id) || null;
      } else if (ci.item_type === 'event_session') {
        extra.event_session = event_sessions.find(e => e.id === ci.ref_id) || null;
      } else if (ci.item_type === 'coaching_booking') {
        extra.coaching_booking = coaching_bookings.find(b => b.id === ci.ref_id) || null;
      }
      return { ...ci, ...extra };
    });

    return {
      cart,
      items: itemsResolved,
      total_amount,
      currency: 'usd'
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, items: [], total_amount: 0 };
    }
    const item = { ...cart_items[idx] };
    item.quantity = qty;
    item.total_price = (item.unit_price || 0) * qty;
    cart_items[idx] = item;
    this._saveToStorage('cart_items', cart_items);

    const cart = this._getOpenCartOrNull();
    if (!cart) {
      return { success: true, cart: null, items: [], total_amount: 0 };
    }
    const cartItemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    const total_amount = this._calculateCartTotals(cart, cartItemsForCart);

    return {
      success: true,
      cart,
      items: cartItemsForCart,
      total_amount
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cart_items = this._getFromStorage('cart_items');
    const item = cart_items.find(ci => ci.id === cartItemId) || null;
    cart_items = cart_items.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cart_items);

    const cart = item ? this._getOpenCartOrNull() : null;
    let itemsForCart = [];
    let total_amount = 0;
    if (cart) {
      itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
      total_amount = this._calculateCartTotals(cart, itemsForCart);
    }

    return { success: !!item, cart, items: itemsForCart, total_amount };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOpenCartOrNull() || this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const total_amount = this._calculateCartTotals(cart, cart_items);
    return {
      cart,
      items: cart_items,
      total_amount,
      currency: 'usd'
    };
  }

  // placeOrder(purchaser_name, purchaser_email, payment_method)
  placeOrder(purchaser_name, purchaser_email, payment_method) {
    void payment_method; // not used in this simulation
    const cart = this._getOpenCartOrNull();
    if (!cart) {
      return { success: false, order: null, order_items: [], event_registrations: [], gift_cards: [], coaching_bookings: [], message: 'No open cart' };
    }
    const cart_items = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    if (!cart_items.length) {
      return { success: false, order: null, order_items: [], event_registrations: [], gift_cards: [], coaching_bookings: [], message: 'Cart is empty' };
    }

    const { order, order_items } = this._createOrderFromCart(cart, cart_items, purchaser_name, purchaser_email);
    const fulfillment = this._fulfillCartItems(order, cart_items, purchaser_name, purchaser_email);

    return {
      success: true,
      order,
      order_items,
      event_registrations: fulfillment.event_registrations,
      gift_cards: fulfillment.gift_cards,
      coaching_bookings: fulfillment.coaching_bookings,
      message: 'Order placed'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      mission: 'We help professionals navigate career transitions and grow as leaders through high-quality coaching.',
      team_overview: 'Our network includes vetted coaches with deep experience in career change, leadership development, and executive coaching.',
      approach: 'We combine data-informed assessments, human-centered coaching, and practical learning resources to support sustainable growth.'
    };
  }

  // getFaqItems(category)
  getFaqItems(category) {
    const faqs = [
      {
        id: 'bookings_reschedule',
        question: 'Can I reschedule a coaching session?',
        answer: 'Yes. You can reschedule up to 24 hours before your session start time, subject to your coach’s policy.',
        category: 'bookings'
      },
      {
        id: 'cancellations_policy',
        question: 'What is your cancellation policy?',
        answer: 'Most sessions can be cancelled or rescheduled up to 24 hours in advance without penalty. Late cancellations may be charged.',
        category: 'cancellations'
      },
      {
        id: 'coaching_process',
        question: 'How do you match me with a coach?',
        answer: 'Use our filters and assessments to find coaches aligned with your goals, specialization needs, and schedule.',
        category: 'coaching_process'
      }
    ];

    if (category) {
      return faqs.filter(f => f.category === category);
    }
    return faqs;
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return { success: true, message: 'Inquiry submitted' };
  }

  // getPoliciesSummary()
  getPoliciesSummary() {
    return {
      privacy_policy_summary: 'We only use your data to provide coaching services and never sell your personal information.',
      terms_of_service_summary: 'By using this site, you agree to our coaching, payment, and conduct terms.',
      cancellation_policy_summary: 'Sessions and events can typically be cancelled or rescheduled up to 24 hours before start time; see specific offer details.'
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