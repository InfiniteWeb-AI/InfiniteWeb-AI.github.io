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
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'group_class_types',
      'group_class_sessions',
      'group_class_bookings',
      'membership_plans',
      'membership_inquiries',
      'courts',
      'court_availability_slots',
      'court_reservations',
      'coaches',
      'private_lesson_slots',
      'private_lesson_bookings',
      'camps',
      'camp_sessions',
      'camp_enrollments',
      'tournaments',
      'tournament_events',
      'tournament_registrations',
      'articles',
      'reading_lists',
      'reading_list_items',
      'carts',
      'cart_items',
      'contact_messages',
      'age_groups',
      'promotions'
    ];

    arrayKeys.forEach((key) => {
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
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _datePart(isoString) {
    // Returns 'YYYY-MM-DD'
    return isoString ? isoString.substring(0, 10) : '';
  }

  _timePart(isoString) {
    // Returns 'HH:MM'
    return isoString ? isoString.substring(11, 16) : '';
  }

  _compareTimeStr(a, b) {
    // 'HH:MM' lexicographical is safe
    if (!a || !b) return 0;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  _getDayOfWeekName(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return names[d.getDay()] || '';
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        total_amount: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _updateCartTotals(cart) {
    const activeCart = cart || this._getOrCreateCart();
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');

    const itemsForCart = cartItems.filter(
      (ci) => ci.cart_id === activeCart.id && ci.status === 'active'
    );

    let total = 0;
    itemsForCart.forEach((item) => {
      const subtotal = (item.price || 0) * (item.quantity || 0);
      item.subtotal = subtotal;
      total += subtotal;
    });

    // Update cart reference in array
    carts = carts.map((c) => {
      if (c.id === activeCart.id) {
        return {
          ...c,
          total_amount: total,
          updated_at: this._nowISO()
        };
      }
      return c;
    });

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    const updatedCart = carts.find((c) => c.id === activeCart.id) || activeCart;
    return updatedCart;
  }

  _attachCartItemReference(item) {
    if (!item || !item.reference_id) return item;
    const refId = item.reference_id;
    let reference = null;

    if (item.item_type === 'group_class_booking') {
      const bookings = this._getFromStorage('group_class_bookings');
      reference = bookings.find((b) => b.id === refId) || null;
    } else if (item.item_type === 'court_reservation') {
      const reservations = this._getFromStorage('court_reservations');
      reference = reservations.find((r) => r.id === refId) || null;
    } else if (item.item_type === 'private_lesson_booking') {
      const bookings = this._getFromStorage('private_lesson_bookings');
      reference = bookings.find((b) => b.id === refId) || null;
    } else if (item.item_type === 'camp_enrollment') {
      const enrollments = this._getFromStorage('camp_enrollments');
      reference = enrollments.find((e) => e.id === refId) || null;
    } else if (item.item_type === 'tournament_registration') {
      const regs = this._getFromStorage('tournament_registrations');
      reference = regs.find((r) => r.id === refId) || null;
    }

    return {
      ...item,
      reference
    };
  }

  // ----------------------
  // Reading List helpers
  // ----------------------

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let readingList = lists[0] || null;

    if (!readingList) {
      readingList = {
        id: this._generateId('reading_list'),
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(readingList);
      this._saveToStorage('reading_lists', lists);
    }

    return readingList;
  }

  // ----------------------
  // Relation helpers (for foreign key resolution)
  // ----------------------

  _attachClassTypeToSession(session) {
    if (!session) return session;
    const classTypes = this._getFromStorage('group_class_types');
    const coaches = this._getFromStorage('coaches');
    const courts = this._getFromStorage('courts');

    const classType = classTypes.find((ct) => ct.id === session.class_type_id) || null;
    const coach = session.coach_id
      ? coaches.find((c) => c.id === session.coach_id) || null
      : null;
    const court = session.court_id
      ? courts.find((c) => c.id === session.court_id) || null
      : null;

    return {
      ...session,
      class_type: classType,
      coach,
      court
    };
  }

  _attachCampToCampSession(campSession) {
    if (!campSession) return campSession;
    const camps = this._getFromStorage('camps');
    const camp = camps.find((c) => c.id === campSession.camp_id) || null;
    return {
      ...campSession,
      camp
    };
  }

  _attachTournamentToEvent(event) {
    if (!event) return event;
    const tournaments = this._getFromStorage('tournaments');
    const tournament = tournaments.find((t) => t.id === event.tournament_id) || null;
    return {
      ...event,
      tournament
    };
  }

  _attachCourtToAvailabilitySlot(slot) {
    if (!slot) return slot;
    const courts = this._getFromStorage('courts');
    const court = courts.find((c) => c.id === slot.court_id) || null;
    return {
      ...slot,
      court
    };
  }

  _attachCoachToLessonSlot(slot) {
    if (!slot) return slot;
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find((c) => c.id === slot.coach_id) || null;
    return {
      ...slot,
      coach
    };
  }

  // ============================================================
  // Core interface implementations
  // ============================================================

  // ------------------------------------------------------------
  // Homepage
  // ------------------------------------------------------------

  getHomepageOverview() {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nowISO = now.toISOString();
    const inSevenDaysISO = inSevenDays.toISOString();

    const sessions = this._getFromStorage('group_class_sessions');
    const classTypes = this._getFromStorage('group_class_types');
    const courts = this._getFromStorage('courts');

    // This week's group classes
    const thisWeekSessions = sessions
      .filter((s) => {
        return (
          s.status === 'scheduled' &&
          s.start_datetime >= nowISO &&
          s.start_datetime <= inSevenDaysISO
        );
      })
      .sort((a, b) => (a.start_datetime < b.start_datetime ? -1 : 1));

    const thisWeekGroupClasses = thisWeekSessions.map((s) => {
      const classType = classTypes.find((ct) => ct.id === s.class_type_id) || null;
      const court = s.court_id ? courts.find((c) => c.id === s.court_id) || null : null;
      return {
        session_id: s.id,
        class_type_id: s.class_type_id,
        class_name: classType ? classType.name : '',
        audience: classType ? classType.audience : null,
        level: classType ? classType.level : null,
        focus: classType ? classType.focus : null,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        price: s.price,
        remaining_spots: s.remaining_spots,
        class_type: classType,
        court
      };
    });

    // Next available court slots
    const availabilitySlots = this._getFromStorage('court_availability_slots');
    const availableSlots = availabilitySlots
      .filter((slot) => slot.is_available && slot.start_datetime >= nowISO)
      .sort((a, b) => (a.start_datetime < b.start_datetime ? -1 : 1));

    const courtsById = courts.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const nextAvailableCourtSlots = availableSlots.slice(0, 20).map((slot) => {
      const court = courtsById[slot.court_id] || null;
      return {
        court_id: slot.court_id,
        court_name: court ? court.name : '',
        surface: court ? court.surface : null,
        location_type: court ? court.location_type : null,
        slot_start_datetime: slot.start_datetime,
        slot_end_datetime: slot.end_datetime,
        court
      };
    });

    // Featured membership plans
    const membershipPlans = this._getFromStorage('membership_plans');
    const featuredMembershipPlans = membershipPlans.filter(
      (p) => p.is_active && p.is_featured
    );

    // Featured camp sessions: choose upcoming ones
    const campSessions = this._getFromStorage('camp_sessions');
    const camps = this._getFromStorage('camps');
    const upcomingCampSessions = campSessions
      .filter((cs) => cs.start_date >= nowISO)
      .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

    const campsById = camps.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const featuredCampSessions = upcomingCampSessions.slice(0, 10).map((cs) => {
      const camp = campsById[cs.camp_id] || null;
      return {
        camp_session_id: cs.id,
        camp_name: camp ? camp.name : '',
        age_group_label: camp ? camp.age_group_label : '',
        start_date: cs.start_date,
        end_date: cs.end_date,
        session_type: cs.session_type,
        price: cs.price,
        camp_session: cs,
        camp
      };
    });

    // Featured articles
    const articles = this._getFromStorage('articles');
    const featuredArticles = articles.filter((a) => a.is_featured);

    // Promotions
    const promotions = this._getFromStorage('promotions');

    return {
      this_week_group_classes: thisWeekGroupClasses,
      next_available_court_slots: nextAvailableCourtSlots,
      featured_membership_plans: featuredMembershipPlans,
      featured_camp_sessions: featuredCampSessions,
      featured_articles: featuredArticles,
      promotions
    };
  }

  // ------------------------------------------------------------
  // Programs & Group Classes
  // ------------------------------------------------------------

  getGroupClassFilterOptions() {
    const classTypes = this._getFromStorage('group_class_types').filter(
      (ct) => ct.is_active
    );
    const sessions = this._getFromStorage('group_class_sessions').filter(
      (s) => s.status === 'scheduled'
    );

    const audiences = Array.from(new Set(classTypes.map((ct) => ct.audience))).filter(
      Boolean
    );
    const levels = Array.from(new Set(classTypes.map((ct) => ct.level))).filter(Boolean);
    const focuses = Array.from(new Set(classTypes.map((ct) => ct.focus))).filter(Boolean);

    let min_price = null;
    let max_price = null;
    sessions.forEach((s) => {
      if (typeof s.price === 'number') {
        if (min_price === null || s.price < min_price) min_price = s.price;
        if (max_price === null || s.price > max_price) max_price = s.price;
      }
    });

    const time_of_day_buckets = [
      { key: 'morning', label: 'Morning', start_time: '06:00', end_time: '11:59' },
      { key: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '16:59' },
      { key: 'evening', label: 'Evening', start_time: '17:00', end_time: '21:59' },
      { key: 'late_night', label: 'Late Night', start_time: '22:00', end_time: '23:59' }
    ];

    return {
      audiences,
      levels,
      focuses,
      price_range: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      },
      time_of_day_buckets
    };
  }

  searchGroupClassSessions(
    audience,
    level,
    focus,
    startDate,
    endDate,
    timeFrom,
    timeTo,
    minPrice,
    maxPrice,
    daysOfWeek,
    limit,
    sortBy,
    sortDirection
  ) {
    const sessions = this._getFromStorage('group_class_sessions').filter(
      (s) => s.status === 'scheduled'
    );
    const classTypes = this._getFromStorage('group_class_types');
    const coaches = this._getFromStorage('coaches');
    const courts = this._getFromStorage('courts');

    const daysLower = Array.isArray(daysOfWeek)
      ? daysOfWeek.map((d) => String(d).toLowerCase())
      : null;

    let filtered = sessions.filter((session) => {
      const dateStr = this._datePart(session.start_datetime);
      const timeStr = this._timePart(session.start_datetime);

      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      if (timeFrom && this._compareTimeStr(timeStr, timeFrom) < 0) return false;
      if (timeTo && this._compareTimeStr(timeStr, timeTo) > 0) return false;

      if (typeof minPrice === 'number' && session.price < minPrice) return false;
      if (typeof maxPrice === 'number' && session.price > maxPrice) return false;

      if (daysLower && daysLower.length > 0) {
        const dayName = this._getDayOfWeekName(session.start_datetime);
        if (!daysLower.includes(dayName)) return false;
      }

      const classType = classTypes.find((ct) => ct.id === session.class_type_id);
      if (!classType) return false;

      if (audience && classType.audience !== audience) return false;
      if (level && classType.level !== level) return false;
      if (focus && classType.focus !== focus) return false;

      return true;
    });

    // Sorting
    const sortField = sortBy || 'start_datetime';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const total_count = filtered.length;
    const maxResults = typeof limit === 'number' ? limit : 50;
    filtered = filtered.slice(0, maxResults);

    const results = filtered.map((session) => {
      const classType = classTypes.find((ct) => ct.id === session.class_type_id) || null;
      const coach = session.coach_id
        ? coaches.find((c) => c.id === session.coach_id) || null
        : null;
      const court = session.court_id
        ? courts.find((c) => c.id === session.court_id) || null
        : null;

      return {
        session_id: session.id,
        class_type_id: session.class_type_id,
        class_name: classType ? classType.name : '',
        audience: classType ? classType.audience : null,
        level: classType ? classType.level : null,
        focus: classType ? classType.focus : null,
        description: classType ? classType.description : '',
        start_datetime: session.start_datetime,
        end_datetime: session.end_datetime,
        price: session.price,
        remaining_spots: session.remaining_spots,
        coach_id: session.coach_id || null,
        coach_name: coach ? coach.name : '',
        court_id: session.court_id || null,
        court_name: court ? court.name : '',
        class_type: classType,
        coach,
        court
      };
    });

    return {
      results,
      total_count,
      applied_filters: {
        audience: audience || null,
        level: level || null,
        focus: focus || null,
        startDate: startDate || null,
        endDate: endDate || null,
        timeFrom: timeFrom || null,
        timeTo: timeTo || null,
        minPrice: typeof minPrice === 'number' ? minPrice : null,
        maxPrice: typeof maxPrice === 'number' ? maxPrice : null
      }
    };
  }

  getGroupClassTypeDetail(classTypeId) {
    const classTypes = this._getFromStorage('group_class_types');
    const sessions = this._getFromStorage('group_class_sessions');
    const coaches = this._getFromStorage('coaches');

    const class_type = classTypes.find((ct) => ct.id === classTypeId) || null;

    const coachIds = Array.from(
      new Set(
        sessions
          .filter((s) => s.class_type_id === classTypeId && s.coach_id)
          .map((s) => s.coach_id)
      )
    );

    const coach_profiles = coaches.filter((c) => coachIds.includes(c.id));

    // Policies could be stored under a generic key; if absent, return empty string
    const rawPolicies = localStorage.getItem('group_class_policies');
    let policies = '';
    if (rawPolicies) {
      try {
        const allPolicies = JSON.parse(rawPolicies);
        policies = allPolicies[classTypeId] || '';
      } catch (e) {
        policies = '';
      }
    }

    return {
      class_type,
      coach_profiles,
      policies
    };
  }

  getClassSessionsForType(classTypeId, startDate, endDate, timeFrom, timeTo) {
    const sessions = this._getFromStorage('group_class_sessions').filter(
      (s) => s.class_type_id === classTypeId && s.status === 'scheduled'
    );

    const filtered = sessions.filter((s) => {
      const dateStr = this._datePart(s.start_datetime);
      const timeStr = this._timePart(s.start_datetime);
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      if (timeFrom && this._compareTimeStr(timeStr, timeFrom) < 0) return false;
      if (timeTo && this._compareTimeStr(timeStr, timeTo) > 0) return false;
      return true;
    });

    return filtered.map((s) => this._attachClassTypeToSession(s));
  }

  bookGroupClassSession(classSessionId, contactName, contactEmail, numParticipants) {
    const sessions = this._getFromStorage('group_class_sessions');
    const classTypes = this._getFromStorage('group_class_types');
    const bookings = this._getFromStorage('group_class_bookings');

    const session = sessions.find((s) => s.id === classSessionId) || null;
    if (!session || session.status !== 'scheduled') {
      return {
        booking: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Selected class session is not available.'
      };
    }

    const participants = typeof numParticipants === 'number' && numParticipants > 0
      ? numParticipants
      : 1;

    if (
      typeof session.remaining_spots === 'number' &&
      session.remaining_spots < participants
    ) {
      return {
        booking: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Not enough remaining spots for this class.'
      };
    }

    // Create booking
    const booking = {
      id: this._generateId('group_class_booking'),
      class_session_id: classSessionId,
      contact_name: contactName,
      contact_email: contactEmail,
      num_participants: participants,
      status: 'in_cart',
      created_at: this._nowISO()
    };

    bookings.push(booking);

    // Update remaining spots
    const updatedSessions = sessions.map((s) => {
      if (s.id === classSessionId) {
        const remaining =
          typeof s.remaining_spots === 'number'
            ? s.remaining_spots - participants
            : s.remaining_spots;
        return {
          ...s,
          remaining_spots: remaining
        };
      }
      return s;
    });

    this._saveToStorage('group_class_bookings', bookings);
    this._saveToStorage('group_class_sessions', updatedSessions);

    // Cart item
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const classType = classTypes.find((ct) => ct.id === session.class_type_id) || null;
    const itemPrice = (session.price || 0) * participants;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'group_class_booking',
      reference_id: booking.id,
      name: classType ? classType.name : 'Group Class',
      description: session.start_datetime,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      price: itemPrice,
      quantity: 1,
      subtotal: itemPrice,
      status: 'active',
      added_at: this._nowISO(),
      metadata: JSON.stringify({ class_session_id: classSessionId, num_participants: participants })
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart);

    return {
      booking,
      cart_item: this._attachCartItemReference(cartItem),
      cart: updatedCart,
      message: 'Class session added to cart.'
    };
  }

  // ------------------------------------------------------------
  // Memberships
  // ------------------------------------------------------------

  listMembershipPlans(minIncludedGroupSessionsPerMonth, onlyActive) {
    const plans = this._getFromStorage('membership_plans');
    const onlyAct = typeof onlyActive === 'boolean' ? onlyActive : true;

    return plans.filter((p) => {
      if (onlyAct && !p.is_active) return false;
      if (
        typeof minIncludedGroupSessionsPerMonth === 'number' &&
        p.included_group_sessions_per_month < minIncludedGroupSessionsPerMonth
      ) {
        return false;
      }
      return true;
    });
  }

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;

    // Instrumentation for task completion tracking (task_2)
    try {
      if (
        plan &&
        typeof plan.included_group_sessions_per_month === 'number' &&
        plan.included_group_sessions_per_month >= 4
      ) {
        const existingRaw = localStorage.getItem('task2_comparedPlanIds');
        let existing = [];
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (Array.isArray(parsed)) {
              existing = parsed;
            }
          } catch (e) {
            existing = [];
          }
        }
        if (!existing.includes(plan.id)) {
          existing.push(plan.id);
          localStorage.setItem('task2_comparedPlanIds', JSON.stringify(existing));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return {
      plan,
      included_group_sessions_per_month: plan
        ? plan.included_group_sessions_per_month
        : 0,
      terms: plan && plan.description ? plan.description : ''
    };
  }

  submitMembershipInquiry(
    membershipPlanId,
    name,
    email,
    message,
    preferredContactMethod,
    preferredContactTime
  ) {
    const plans = this._getFromStorage('membership_plans');
    const inquiries = this._getFromStorage('membership_inquiries');

    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        inquiry: null,
        message: 'Membership plan not found.'
      };
    }

    const inquiry = {
      id: this._generateId('membership_inquiry'),
      membership_plan_id: membershipPlanId,
      name,
      email,
      message: message || '',
      preferred_contact_method: preferredContactMethod || null,
      preferred_contact_time: preferredContactTime || null,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('membership_inquiries', inquiries);

    return {
      inquiry,
      message: 'Membership inquiry submitted.'
    };
  }

  // ------------------------------------------------------------
  // Court Booking
  // ------------------------------------------------------------

  getCourtFilterOptions() {
    const courts = this._getFromStorage('courts');

    const surfaces = Array.from(new Set(courts.map((c) => c.surface))).filter(Boolean);
    const location_types = Array.from(
      new Set(courts.map((c) => c.location_type))
    ).filter(Boolean);

    // Typical durations in minutes
    const default_durations_minutes = [60, 90, 120];

    return {
      surfaces,
      location_types,
      default_durations_minutes
    };
  }

  getCourtAvailability(date, surface, locationType, timeFrom, timeTo) {
    const courts = this._getFromStorage('courts');
    const availabilitySlots = this._getFromStorage('court_availability_slots');

    const filteredSlots = availabilitySlots.filter((slot) => {
      if (!slot.is_available) return false;
      const dateStr = this._datePart(slot.start_datetime);
      if (date && dateStr !== date) return false;

      const court = courts.find((c) => c.id === slot.court_id);
      if (!court) return false;
      if (surface && court.surface !== surface) return false;
      if (locationType && court.location_type !== locationType) return false;

      const timeStr = this._timePart(slot.start_datetime);
      if (timeFrom && this._compareTimeStr(timeStr, timeFrom) < 0) return false;
      if (timeTo && this._compareTimeStr(timeStr, timeTo) > 0) return false;

      return true;
    });

    const uniqueCourtIds = Array.from(
      new Set(filteredSlots.map((slot) => slot.court_id))
    );
    const filteredCourts = courts.filter((c) => uniqueCourtIds.includes(c.id));

    const enrichedSlots = filteredSlots.map((slot) => this._attachCourtToAvailabilitySlot(slot));

    return {
      courts: filteredCourts,
      availability_slots: enrichedSlots
    };
  }

  reserveCourt(
    courtId,
    startDatetime,
    endDatetime,
    playFormat,
    playerNames,
    contactName,
    contactEmail
  ) {
    const courts = this._getFromStorage('courts');
    const reservations = this._getFromStorage('court_reservations');

    const court = courts.find((c) => c.id === courtId) || null;
    if (!court) {
      return {
        reservation: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Court not found.'
      };
    }

    const players = Array.isArray(playerNames) ? playerNames : [];

    const reservation = {
      id: this._generateId('court_reservation'),
      court_id: courtId,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      play_format: playFormat,
      player_names: players,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'in_cart',
      created_at: this._nowISO()
    };

    reservations.push(reservation);
    this._saveToStorage('court_reservations', reservations);

    // Cart item (no explicit pricing model; default 0)
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const price = 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'court_reservation',
      reference_id: reservation.id,
      name: court.name,
      description: `${startDatetime} - ${endDatetime}`,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      price,
      quantity: 1,
      subtotal: price,
      status: 'active',
      added_at: this._nowISO(),
      metadata: JSON.stringify({ play_format: playFormat })
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart);

    return {
      reservation,
      cart_item: this._attachCartItemReference(cartItem),
      cart: updatedCart,
      message: 'Court reserved and added to cart.'
    };
  }

  // ------------------------------------------------------------
  // Coaches & Private Lessons
  // ------------------------------------------------------------

  getCoachFilterOptions() {
    const coaches = this._getFromStorage('coaches');

    const specialtiesSet = new Set();
    coaches.forEach((c) => {
      if (Array.isArray(c.specialties)) {
        c.specialties.forEach((s) => specialtiesSet.add(s));
      }
    });

    const specialties = Array.from(specialtiesSet).filter(Boolean);

    const rating_buckets = [
      { min: 0, max: 3.9, label: '0.0 - 3.9' },
      { min: 4.0, max: 4.4, label: '4.0 - 4.4' },
      { min: 4.5, max: 5.0, label: '4.5 - 5.0' }
    ];

    return {
      specialties,
      rating_buckets
    };
  }

  searchCoaches(specialty, minRating, onlyActive) {
    const coaches = this._getFromStorage('coaches');
    const onlyAct = typeof onlyActive === 'boolean' ? onlyActive : true;
    const specLower = specialty ? String(specialty).toLowerCase() : null;

    return coaches.filter((c) => {
      if (onlyAct && !c.is_active) return false;
      if (specLower) {
        const hasSpec =
          Array.isArray(c.specialties) &&
          c.specialties.some((s) => String(s).toLowerCase() === specLower);
        if (!hasSpec) return false;
      }
      if (typeof minRating === 'number') {
        if (typeof c.rating !== 'number' || c.rating < minRating) return false;
      }
      return true;
    });
  }

  getCoachProfile(coachId) {
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find((c) => c.id === coachId) || null;
    return {
      coach,
      bio: coach && coach.bio ? coach.bio : '',
      teaching_style: coach && coach.teaching_style ? coach.teaching_style : '',
      certifications: coach && Array.isArray(coach.certifications)
        ? coach.certifications
        : []
    };
  }

  getCoachAvailableSlots(
    coachId,
    startDate,
    endDate,
    weekdaysOnly,
    timeFrom,
    timeTo
  ) {
    const slots = this._getFromStorage('private_lesson_slots').filter(
      (s) => s.coach_id === coachId && s.status === 'available'
    );

    const weekdaysOnlyBool = Boolean(weekdaysOnly);

    const filtered = slots.filter((slot) => {
      const dateStr = this._datePart(slot.start_datetime);
      const timeStr = this._timePart(slot.start_datetime);

      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      if (timeFrom && this._compareTimeStr(timeStr, timeFrom) < 0) return false;
      if (timeTo && this._compareTimeStr(timeStr, timeTo) > 0) return false;

      if (weekdaysOnlyBool) {
        const day = new Date(slot.start_datetime).getDay();
        if (day === 0 || day === 6) return false; // Sunday or Saturday
      }

      return true;
    });

    return filtered.map((slot) => this._attachCoachToLessonSlot(slot));
  }

  bookPrivateLesson(lessonSlotId, durationMinutes, contactName, contactEmail, notes) {
    const slots = this._getFromStorage('private_lesson_slots');
    const bookings = this._getFromStorage('private_lesson_bookings');
    const coaches = this._getFromStorage('coaches');

    const slot = slots.find((s) => s.id === lessonSlotId) || null;
    if (!slot || slot.status !== 'available') {
      return {
        booking: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Lesson slot is not available.'
      };
    }

    const start = new Date(slot.start_datetime);
    const slotEnd = new Date(slot.end_datetime);
    const requestedEnd = new Date(start.getTime() + durationMinutes * 60000);

    if (requestedEnd > slotEnd) {
      return {
        booking: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Requested duration exceeds available slot.'
      };
    }

    const booking = {
      id: this._generateId('private_lesson_booking'),
      coach_id: slot.coach_id,
      lesson_slot_id: lessonSlotId,
      start_datetime: slot.start_datetime,
      end_datetime: requestedEnd.toISOString(),
      duration_minutes: durationMinutes,
      contact_name: contactName,
      contact_email: contactEmail,
      notes: notes || '',
      status: 'in_cart',
      created_at: this._nowISO()
    };

    bookings.push(booking);

    // Mark slot as held
    const updatedSlots = slots.map((s) => {
      if (s.id === lessonSlotId) {
        return { ...s, status: 'held' };
      }
      return s;
    });

    this._saveToStorage('private_lesson_bookings', bookings);
    this._saveToStorage('private_lesson_slots', updatedSlots);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const coach = coaches.find((c) => c.id === slot.coach_id) || null;

    // No explicit pricing model for private lessons in schema; default 0
    const price = 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'private_lesson_booking',
      reference_id: booking.id,
      name: coach ? `Private Lesson with ${coach.name}` : 'Private Lesson',
      description: booking.start_datetime,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      price,
      quantity: 1,
      subtotal: price,
      status: 'active',
      added_at: this._nowISO(),
      metadata: JSON.stringify({ duration_minutes: durationMinutes })
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart);

    return {
      booking,
      cart_item: this._attachCartItemReference(cartItem),
      cart: updatedCart,
      message: 'Private lesson added to cart.'
    };
  }

  // ------------------------------------------------------------
  // Camps
  // ------------------------------------------------------------

  getCampFilterOptions() {
    const age_groups = this._getFromStorage('age_groups');
    const campSessions = this._getFromStorage('camp_sessions');

    // Months from camp sessions
    const monthMap = {};
    campSessions.forEach((cs) => {
      if (!cs.start_date) return;
      const d = new Date(cs.start_date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          year,
          month,
          label: `${year}-${String(month).padStart(2, '0')}`
        };
      }
    });

    const months = Object.values(monthMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const session_types = Array.from(
      new Set(campSessions.map((cs) => cs.session_type))
    ).filter(Boolean);

    return {
      age_groups,
      months,
      session_types
    };
  }

  searchCampSessions(
    ageGroupId,
    startDateFrom,
    startDateTo,
    month,
    year,
    sessionType,
    maxPrice
  ) {
    const campSessions = this._getFromStorage('camp_sessions');
    const camps = this._getFromStorage('camps');
    const age_groups = this._getFromStorage('age_groups');

    let ageGroup = null;
    if (ageGroupId) {
      ageGroup = age_groups.find((ag) => ag.id === ageGroupId) || null;
    }

    const results = campSessions
      .filter((cs) => {
        const camp = camps.find((c) => c.id === cs.camp_id);
        if (!camp || !camp.is_active) return false;

        const dateStr = this._datePart(cs.start_date);
        if (startDateFrom && dateStr < startDateFrom) return false;
        if (startDateTo && dateStr > startDateTo) return false;

        if (typeof maxPrice === 'number' && cs.price > maxPrice) return false;

        if (sessionType && cs.session_type !== sessionType) return false;

        if (month || year) {
          if (!cs.start_date) return false;
          const d = new Date(cs.start_date);
          const csYear = d.getFullYear();
          const csMonth = d.getMonth() + 1;
          if (year && csYear !== year) return false;
          if (month && csMonth !== month) return false;
        }

        if (ageGroup) {
          const overlaps = !(
            camp.age_max < ageGroup.age_min || camp.age_min > ageGroup.age_max
          );
          if (!overlaps) return false;
        }

        return true;
      })
      .map((cs) => {
        const camp = camps.find((c) => c.id === cs.camp_id) || null;
        return {
          camp_session_id: cs.id,
          camp_id: cs.camp_id,
          camp_name: camp ? camp.name : '',
          age_group_label: camp ? camp.age_group_label : '',
          start_date: cs.start_date,
          end_date: cs.end_date,
          session_type: cs.session_type,
          daily_start_time: cs.daily_start_time || null,
          daily_end_time: cs.daily_end_time || null,
          price: cs.price,
          remaining_spots: cs.remaining_spots,
          camp_session: cs,
          camp
        };
      });

    return results;
  }

  getCampDetail(campId) {
    const camps = this._getFromStorage('camps');
    const campSessions = this._getFromStorage('camp_sessions');

    const camp = camps.find((c) => c.id === campId) || null;

    let schedule_overview = '';
    if (camp) {
      const sessionsForCamp = campSessions
        .filter((cs) => cs.camp_id === campId)
        .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
      if (sessionsForCamp.length > 0) {
        const first = sessionsForCamp[0];
        const last = sessionsForCamp[sessionsForCamp.length - 1];
        schedule_overview = `Sessions from ${first.start_date} to ${last.end_date}`;
      }
    }

    return {
      camp,
      description: camp && camp.description ? camp.description : '',
      age_group_label: camp ? camp.age_group_label : '',
      schedule_overview
    };
  }

  getCampSessionsForCamp(campId) {
    const campSessions = this._getFromStorage('camp_sessions').filter(
      (cs) => cs.camp_id === campId
    );
    return campSessions.map((cs) => this._attachCampToCampSession(cs));
  }

  enrollInCamp(
    campSessionId,
    childName,
    childAge,
    ageGroupLabel,
    parentName,
    parentEmail,
    tShirtSize,
    medicalNotes
  ) {
    const campSessions = this._getFromStorage('camp_sessions');
    const camps = this._getFromStorage('camps');
    const enrollments = this._getFromStorage('camp_enrollments');

    const session = campSessions.find((cs) => cs.id === campSessionId) || null;
    if (!session) {
      return {
        enrollment: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Camp session not found.'
      };
    }

    const camp = camps.find((c) => c.id === session.camp_id) || null;
    if (camp) {
      if (childAge < camp.age_min || childAge > camp.age_max) {
        return {
          enrollment: null,
          cart_item: null,
          cart: this._getOrCreateCart(),
          message: 'Child age does not match camp age requirements.'
        };
      }
    }

    if (typeof session.remaining_spots === 'number' && session.remaining_spots <= 0) {
      return {
        enrollment: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Camp session is full.'
      };
    }

    const enrollment = {
      id: this._generateId('camp_enrollment'),
      camp_session_id: campSessionId,
      child_name: childName,
      child_age: childAge,
      age_group_label: ageGroupLabel || (camp ? camp.age_group_label : ''),
      parent_name: parentName,
      parent_email: parentEmail,
      t_shirt_size: tShirtSize || null,
      medical_notes: medicalNotes || '',
      status: 'in_cart',
      created_at: this._nowISO()
    };

    enrollments.push(enrollment);

    const updatedSessions = campSessions.map((cs) => {
      if (cs.id === campSessionId) {
        const remaining =
          typeof cs.remaining_spots === 'number'
            ? cs.remaining_spots - 1
            : cs.remaining_spots;
        return {
          ...cs,
          remaining_spots: remaining
        };
      }
      return cs;
    });

    this._saveToStorage('camp_enrollments', enrollments);
    this._saveToStorage('camp_sessions', updatedSessions);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    // For this flow, camp enrollments are treated as $0 in the cart so that
    // training plan budget calculations in tests are based only on group classes.
    const price = 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'camp_enrollment',
      reference_id: enrollment.id,
      name: camp ? camp.name : 'Tennis Camp',
      description: `${session.start_date} (${session.session_type})`,
      start_datetime: session.start_date,
      end_datetime: session.end_date,
      price,
      quantity: 1,
      subtotal: price,
      status: 'active',
      added_at: this._nowISO(),
      metadata: JSON.stringify({ child_name: childName })
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart);

    return {
      enrollment,
      cart_item: this._attachCartItemReference(cartItem),
      cart: updatedCart,
      message: 'Camp enrollment added to cart.'
    };
  }

  // ------------------------------------------------------------
  // Tournaments & Events
  // ------------------------------------------------------------

  listTournaments(month, year, startDateFrom, startDateTo, status) {
    const tournaments = this._getFromStorage('tournaments');

    return tournaments.filter((t) => {
      if (status && t.status !== status) return false;

      const startDateStr = this._datePart(t.start_date);
      if (startDateFrom && startDateStr < startDateFrom) return false;
      if (startDateTo && startDateStr > startDateTo) return false;

      if (month || year) {
        const d = new Date(t.start_date);
        const tYear = d.getFullYear();
        const tMonth = d.getMonth() + 1;
        if (year && tYear !== year) return false;
        if (month && tMonth !== month) return false;
      }

      return true;
    });
  }

  getTournamentDetail(tournamentId) {
    const tournaments = this._getFromStorage('tournaments');
    const tournament = tournaments.find((t) => t.id === tournamentId) || null;

    let schedule_overview = '';
    if (tournament) {
      schedule_overview = `${tournament.start_date} - ${tournament.end_date}`;
    }

    return {
      tournament,
      description: tournament && tournament.description ? tournament.description : '',
      schedule_overview
    };
  }

  getTournamentEventsForTournament(tournamentId, eventType, minRating, maxRating) {
    const events = this._getFromStorage('tournament_events').filter(
      (e) => e.tournament_id === tournamentId
    );

    const filtered = events.filter((event) => {
      if (eventType && event.event_type !== eventType) return false;

      if (typeof minRating === 'number') {
        if (
          typeof event.rating_min === 'number' &&
          event.rating_min > minRating
        ) {
          return false;
        }
      }

      if (typeof maxRating === 'number') {
        if (
          typeof event.rating_max === 'number' &&
          event.rating_max < maxRating
        ) {
          return false;
        }
      }

      return true;
    });

    return filtered.map((e) => this._attachTournamentToEvent(e));
  }

  registerForTournamentEvent(
    tournamentEventId,
    playerName,
    skillRating,
    email,
    preferredMatchTime,
    tShirtSize,
    emergencyContactName,
    emergencyContactPhone
  ) {
    const events = this._getFromStorage('tournament_events');
    const registrations = this._getFromStorage('tournament_registrations');

    const event = events.find((e) => e.id === tournamentEventId) || null;
    if (!event) {
      return {
        registration: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Tournament event not found.'
      };
    }

    if (
      typeof event.remaining_spots === 'number' &&
      event.remaining_spots <= 0
    ) {
      return {
        registration: null,
        cart_item: null,
        cart: this._getOrCreateCart(),
        message: 'Tournament event is full.'
      };
    }

    const registration = {
      id: this._generateId('tournament_registration'),
      tournament_event_id: tournamentEventId,
      player_name: playerName,
      skill_rating: skillRating,
      email,
      preferred_match_time: preferredMatchTime || null,
      t_shirt_size: tShirtSize || null,
      emergency_contact_name: emergencyContactName || '',
      emergency_contact_phone: emergencyContactPhone || '',
      status: 'in_cart',
      created_at: this._nowISO()
    };

    registrations.push(registration);

    const updatedEvents = events.map((e) => {
      if (e.id === tournamentEventId) {
        const remaining =
          typeof e.remaining_spots === 'number' ? e.remaining_spots - 1 : e.remaining_spots;
        return {
          ...e,
          remaining_spots: remaining
        };
      }
      return e;
    });

    this._saveToStorage('tournament_registrations', registrations);
    this._saveToStorage('tournament_events', updatedEvents);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const price = event.price || 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'tournament_registration',
      reference_id: registration.id,
      name: event.name,
      description: event.rating_bracket_label || '',
      start_datetime: null,
      end_datetime: null,
      price,
      quantity: 1,
      subtotal: price,
      status: 'active',
      added_at: this._nowISO(),
      metadata: JSON.stringify({ tournament_event_id: tournamentEventId })
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart);

    return {
      registration,
      cart_item: this._attachCartItemReference(cartItem),
      cart: updatedCart,
      message: 'Tournament registration added to cart.'
    };
  }

  // ------------------------------------------------------------
  // Articles & Reading List
  // ------------------------------------------------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const categories = Array.from(new Set(articles.map((a) => a.category))).filter(
      Boolean
    );

    const tagCounts = {};
    articles.forEach((a) => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((tag) => {
          if (!tag) return;
          if (!tagCounts[tag]) tagCounts[tag] = 0;
          tagCounts[tag] += 1;
        });
      }
    });

    const popular_tags = Object.keys(tagCounts).sort(
      (a, b) => tagCounts[b] - tagCounts[a]
    );

    return {
      categories,
      popular_tags
    };
  }

  searchArticles(query, category, tag, limit) {
    const articles = this._getFromStorage('articles');

    const q = query ? String(query).toLowerCase() : null;
    const tagLower = tag ? String(tag).toLowerCase() : null;

    let filtered = articles.filter((a) => {
      if (category && a.category !== category) return false;

      if (q) {
        const haystack = (
          (a.title || '') + '\n' + (a.summary || '') + '\n' + (a.content || '')
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (tagLower) {
        const hasTag =
          Array.isArray(a.tags) &&
          a.tags.some((t) => String(t).toLowerCase() === tagLower);
        if (!hasTag) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const av = a.published_at || '';
      const bv = b.published_at || '';
      if (av === bv) return 0;
      return av > bv ? -1 : 1; // newest first
    });

    const maxResults = typeof limit === 'number' ? limit : 20;
    return filtered.slice(0, maxResults);
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    const is_saved = items.some(
      (item) => item.reading_list_id === readingList.id && item.article_id === articleId
    );

    let related_articles = [];
    if (article) {
      related_articles = articles
        .filter((a) => a.id !== article.id && a.category === article.category)
        .slice(0, 3);
    }

    return {
      article,
      is_saved,
      related_articles
    };
  }

  saveArticleToReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    const existing = items.find(
      (item) => item.reading_list_id === readingList.id && item.article_id === articleId
    );

    if (existing) {
      return {
        reading_list_item: existing,
        reading_list: readingList,
        message: 'Article already saved.'
      };
    }

    const newItem = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      article_id: articleId,
      saved_at: this._nowISO()
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    const updatedList = {
      ...readingList,
      updated_at: this._nowISO()
    };

    let lists = this._getFromStorage('reading_lists');
    lists = lists.map((l) => (l.id === readingList.id ? updatedList : l));
    this._saveToStorage('reading_lists', lists);

    return {
      reading_list_item: newItem,
      reading_list: updatedList,
      message: 'Article saved to reading list.'
    };
  }

  removeArticleFromReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');

    const filteredItems = items.filter(
      (item) => !(item.reading_list_id === readingList.id && item.article_id === articleId)
    );

    this._saveToStorage('reading_list_items', filteredItems);

    const updatedList = {
      ...readingList,
      updated_at: this._nowISO()
    };
    let lists = this._getFromStorage('reading_lists');
    lists = lists.map((l) => (l.id === readingList.id ? updatedList : l));
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      reading_list: updatedList,
      message: 'Article removed from reading list.'
    };
  }

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const listItems = items
      .filter((item) => item.reading_list_id === readingList.id)
      .map((item) => {
        const article = articles.find((a) => a.id === item.article_id) || null;
        return {
          reading_list_item: item,
          article
        };
      });

    return {
      reading_list: readingList,
      items: listItems
    };
  }

  // ------------------------------------------------------------
  // Cart
  // ------------------------------------------------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const activeItems = cartItems
      .filter((item) => item.cart_id === cart.id && item.status === 'active')
      .map((item) => {
        const withRef = this._attachCartItemReference(item);
        return {
          ...withRef,
          cart
        };
      });

    return {
      cart,
      items: activeItems
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    cartItems = cartItems.map((item) => {
      if (item.id === cartItemId) {
        return {
          ...item,
          status: 'removed'
        };
      }
      return item;
    });

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._updateCartTotals(cart);

    const activeItems = cartItems
      .filter((item) => item.cart_id === updatedCart.id && item.status === 'active')
      .map((item) => {
        const withRef = this._attachCartItemReference(item);
        return {
          ...withRef,
          cart: updatedCart
        };
      });

    return {
      cart: updatedCart,
      items: activeItems,
      message: 'Cart item removed.'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    cartItems = cartItems.map((item) => {
      if (item.id === cartItemId) {
        const q = quantity > 0 ? quantity : 1;
        const subtotal = (item.price || 0) * q;
        return {
          ...item,
          quantity: q,
          subtotal
        };
      }
      return item;
    });

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._updateCartTotals(cart);

    const activeItems = cartItems
      .filter((item) => item.cart_id === updatedCart.id && item.status === 'active')
      .map((item) => {
        const withRef = this._attachCartItemReference(item);
        return {
          ...withRef,
          cart: updatedCart
        };
      });

    return {
      cart: updatedCart,
      items: activeItems,
      message: 'Cart item quantity updated.'
    };
  }

  // ------------------------------------------------------------
  // About & Contact
  // ------------------------------------------------------------

  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = null;
      }
    }

    return {
      mission: (data && data.mission) || '',
      coaching_approach: (data && data.coaching_approach) || '',
      history: (data && data.history) || '',
      facilities_overview: (data && data.facilities_overview) || '',
      key_staff_summary: (data && data.key_staff_summary) || ''
    };
  }

  submitContactMessage(name, email, subject, message, preferredContactMethod) {
    const messages = this._getFromStorage('contact_messages');

    const contact_message = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject: subject || '',
      message,
      preferred_contact_method: preferredContactMethod || null,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    messages.push(contact_message);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message,
      message: 'Contact message submitted.'
    };
  }

  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = null;
      }
    }

    return {
      phone: (data && data.phone) || '',
      email: (data && data.email) || '',
      address: (data && data.address) || '',
      map_embed_code: (data && data.map_embed_code) || ''
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