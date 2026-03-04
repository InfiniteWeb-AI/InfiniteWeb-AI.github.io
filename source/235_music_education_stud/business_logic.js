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

  // -------------------- Storage Initialization --------------------

  _initStorage() {
    const keys = [
      'studio_locations',
      'lesson_offerings',
      'membership_plans',
      'teachers',
      'schedule_slots',
      'events',
      'articles',
      'faq_categories',
      'faq_items',
      'faq_sections',
      'students', // StudentProfile
      'trial_lesson_requests',
      'teacher_lesson_requests',
      'group_class_reservations',
      'event_registrations',
      'booking_carts',
      'booking_items',
      'membership_enrollments',
      'reading_list_items',
      'booking_cart_details' // for contact + student details submitted
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_booking_cart_id')) {
      localStorage.setItem('current_booking_cart_id', '');
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
    // Accept both date-only (YYYY-MM-DD) and full ISO
    return dateStr ? new Date(dateStr) : null;
  }

  // -------------------- Booking Cart Helpers --------------------

  _getExistingBookingCart() {
    const currentId = localStorage.getItem('current_booking_cart_id') || '';
    if (!currentId) return null;
    const carts = this._getFromStorage('booking_carts');
    const cart = carts.find(c => c.id === currentId) || null;
    return cart || null;
  }

  _getOrCreateBookingCart() {
    let cart = this._getExistingBookingCart();
    const carts = this._getFromStorage('booking_carts');

    if (!cart || cart.step === 'complete') {
      cart = {
        id: this._generateId('cart'),
        booking_item_ids: [],
        step: 'summary',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('booking_carts', carts);
      localStorage.setItem('current_booking_cart_id', cart.id);
    }

    return cart;
  }

  _addBookingItemToCart(bookingCart, itemData) {
    let bookingItems = this._getFromStorage('booking_items');
    const newItem = {
      id: this._generateId('bitem'),
      booking_cart_id: bookingCart.id,
      item_type: itemData.item_type,
      lesson_offering_id: itemData.lesson_offering_id || null,
      schedule_slot_id: itemData.schedule_slot_id || null,
      event_id: itemData.event_id || null,
      membership_plan_id: itemData.membership_plan_id || null,
      location_id: itemData.location_id || null,
      instrument: itemData.instrument || null,
      level: itemData.level || null,
      day_of_week: itemData.day_of_week || null,
      date: itemData.date || null,
      start_time: itemData.start_time || null,
      end_time: itemData.end_time || null,
      duration_minutes: itemData.duration_minutes || null,
      quantity_students: itemData.quantity_students || null,
      student_id: itemData.student_id || null,
      student_name: itemData.student_name || null,
      notes: itemData.notes || null,
      price_per_session: itemData.price_per_session || null,
      price_unit: itemData.price_unit || null,
      total_price_estimate: itemData.total_price_estimate || null,
      status: itemData.status || 'selected'
    };

    bookingItems.push(newItem);

    // Update cart
    let carts = this._getFromStorage('booking_carts');
    const idx = carts.findIndex(c => c.id === bookingCart.id);
    if (idx !== -1) {
      const cart = carts[idx];
      if (!Array.isArray(cart.booking_item_ids)) cart.booking_item_ids = [];
      cart.booking_item_ids.push(newItem.id);
      cart.updated_at = this._nowIso();
      carts[idx] = cart;
      this._saveToStorage('booking_carts', carts);
    }

    this._saveToStorage('booking_items', bookingItems);

    return newItem;
  }

  _updateBookingCartStep(step) {
    const cart = this._getExistingBookingCart();
    if (!cart) return null;
    let carts = this._getFromStorage('booking_carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].step = step;
      carts[idx].updated_at = this._nowIso();
      this._saveToStorage('booking_carts', carts);
      return carts[idx];
    }
    return null;
  }

  // -------------------- Reading List Helpers --------------------

  _loadReadingListFromLocalStorage() {
    return this._getFromStorage('reading_list_items');
  }

  _saveReadingListToLocalStorage(list) {
    this._saveToStorage('reading_list_items', list);
  }

  // -------------------- Utility Helpers --------------------

  _unique(array) {
    return Array.from(new Set(array));
  }

  _compareTimesHHMM(a, b) {
    // Works for 'HH:MM' 24h strings
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  _formatPriceDisplay(price, unit, currency) {
    if (unit === 'free' || price === 0) return 'Free';
    const cur = currency || 'USD';
    const amount = typeof price === 'number' ? price.toFixed(2) : price;
    let unitLabel = '';
    if (unit === 'per_lesson') unitLabel = 'per lesson';
    else if (unit === 'per_class') unitLabel = 'per class';
    else if (unit === 'per_month') unitLabel = 'per month';
    else if (unit === 'flat_fee') unitLabel = 'flat fee';
    return `${cur} ${amount}${unitLabel ? ' ' + unitLabel : ''}`;
  }

  // -------------------- Interface Implementations --------------------
  // 1) getHomePageContent

  getHomePageContent() {
    const locations = this._getFromStorage('studio_locations');
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const events = this._getFromStorage('events');
    const articles = this._getFromStorage('articles');

    const instruments_offered = this._unique(
      locations.flatMap(l => l.instruments_offered || [])
    );
    const age_groups_served = this._unique(
      locations.flatMap(l => l.age_groups_served || [])
    );

    // Featured lessons: first few active
    const activeLessons = lessonOfferings.filter(lo => lo.is_active);
    const locationsById = new Map(locations.map(l => [l.id, l]));
    const featured_lessons = activeLessons.slice(0, 5).map(lo => {
      const loc = locationsById.get(lo.location_id) || null;
      return {
        lesson_offering_id: lo.id,
        title: lo.title,
        instrument: lo.instrument,
        age_group_label: lo.age_group,
        level_label: lo.level,
        duration_label: lo.duration_label || `${lo.duration_minutes} minutes`,
        location_name: loc ? loc.name : '',
        price_display: this._formatPriceDisplay(
          lo.price_per_session,
          lo.price_unit,
          lo.currency
        )
      };
    });

    // Featured events: upcoming by date
    const now = new Date();
    const upcomingEvents = events
      .map(e => ({ e, d: this._parseDate(e.start_datetime) }))
      .filter(x => x.d && x.d >= now)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map(x => {
        const ev = x.e;
        const loc = locationsById.get(ev.location_id) || null;
        return { ...ev, location: loc };
      });

    // Featured articles: most recent
    const featured_articles = [...articles]
      .sort((a, b) => this._parseDate(b.published_date) - this._parseDate(a.published_date))
      .slice(0, 5);

    return {
      studio_summary: {
        headline: 'Music Education Studio',
        tagline: 'Lessons, classes, and events for all ages.',
        instruments_offered,
        age_groups_served
      },
      featured_lessons,
      featured_events: upcomingEvents,
      featured_articles,
      about_snippet: 'Explore instruments, meet our teachers, and find the right program for you.',
      contact_snippet: 'Contact your nearest studio for scheduling and enrollment options.'
    };
  }

  // 2) searchStudioLocations(searchText, postalCode, maxDistanceMiles)

  searchStudioLocations(searchText, postalCode, maxDistanceMiles) {
    const locations = this._getFromStorage('studio_locations');
    const text = (searchText || '').toLowerCase();
    const zip = (postalCode || '').trim();

    let results = locations.filter(loc => {
      let matchesText = true;
      let matchesZip = true;

      if (text) {
        const hay = [
          loc.name,
          loc.neighborhood,
          loc.city,
          loc.state,
          loc.address_line1,
          loc.address_line2
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        matchesText = hay.includes(text);
      }

      if (zip) {
        matchesZip = (loc.postal_code || '').startsWith(zip);
      }

      return matchesText && matchesZip;
    });

    // We cannot compute real distances without geo services; approximate:
    results = results.map(loc => {
      let distance = null;
      if (zip) {
        distance = loc.postal_code === zip ? 0 : 10; // simplistic placeholder
      }
      return { loc, distance };
    });

    results.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return results.map(({ loc, distance }) => ({
      location: {
        id: loc.id,
        name: loc.name,
        neighborhood: loc.neighborhood || '',
        city: loc.city,
        state: loc.state
      },
      distance_miles: distance,
      instruments_offered: loc.instruments_offered || [],
      age_groups_served: loc.age_groups_served || [],
      is_main: !!loc.is_main
    }));
  }

  // 3) getStudioLocationDetail(locationId)

  getStudioLocationDetail(locationId) {
    const locations = this._getFromStorage('studio_locations');
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const teachers = this._getFromStorage('teachers');
    const events = this._getFromStorage('events');

    const location = locations.find(l => l.id === locationId) || null;

    const featured_lessons = lessonOfferings.filter(
      lo => lo.location_id === locationId && lo.is_active
    );

    const featured_teachers = teachers.filter(
      t => t.primary_location_id === locationId
    );

    const now = new Date();
    const upcoming_events = events
      .filter(e => e.location_id === locationId)
      .map(e => ({ e, d: this._parseDate(e.start_datetime) }))
      .filter(x => x.d && x.d >= now)
      .sort((a, b) => a.d - b.d)
      .map(x => x.e);

    return {
      location,
      featured_lessons,
      featured_teachers,
      upcoming_events
    };
  }

  // 4) getLessonFilterOptions()

  getLessonFilterOptions() {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const locations = this._getFromStorage('studio_locations');

    const instrument_options = this._unique(lessonOfferings.map(lo => lo.instrument));
    const age_group_options = this._unique(lessonOfferings.map(lo => lo.age_group));
    const level_options = this._unique(lessonOfferings.map(lo => lo.level));
    const duration_options_minutes = this._unique(lessonOfferings.map(lo => lo.duration_minutes));
    const session_format_options = this._unique(lessonOfferings.map(lo => lo.session_format));
    const delivery_mode_options = this._unique(lessonOfferings.map(lo => lo.delivery_mode));

    const prices = lessonOfferings.map(lo => lo.price_per_session).filter(p => typeof p === 'number');
    const price_range_default = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0
    };

    const day_of_week_options = this._unique(
      lessonOfferings.flatMap(lo => lo.schedule_days || [])
    );

    return {
      instrument_options,
      age_group_options,
      level_options,
      duration_options_minutes,
      session_format_options,
      delivery_mode_options,
      location_options: locations,
      day_of_week_options,
      price_range_default
    };
  }

  // 5) searchLessonOfferings(filters, sort, page, pageSize)

  searchLessonOfferings(filters, sort, page, pageSize) {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const locations = this._getFromStorage('studio_locations');
    const locationsById = new Map(locations.map(l => [l.id, l]));

    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let results = lessonOfferings.filter(lo => {
      if (!lo.is_active) return false;
      if (filters.instrument && lo.instrument !== filters.instrument) return false;
      if (filters.age_group && lo.age_group !== filters.age_group) return false;
      if (filters.level && lo.level !== filters.level) return false;
      if (
        typeof filters.duration_minutes === 'number' &&
        lo.duration_minutes !== filters.duration_minutes
      )
        return false;
      if (filters.session_format && lo.session_format !== filters.session_format)
        return false;
      if (filters.delivery_mode && lo.delivery_mode !== filters.delivery_mode)
        return false;
      if (filters.locationId && lo.location_id !== filters.locationId) return false;

      if (filters.day_of_week) {
        const days = lo.schedule_days || [];
        if (!days.includes(filters.day_of_week)) return false;
      }

      if (typeof filters.min_price === 'number' && lo.price_per_session < filters.min_price)
        return false;
      if (typeof filters.max_price === 'number' && lo.price_per_session > filters.max_price)
        return false;

      if (filters.lesson_category && lo.lesson_category !== filters.lesson_category)
        return false;

      // time_range_start/end are not strictly enforceable with current data; ignoring here

      return true;
    });

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.price_per_session || 0) - (b.price_per_session || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.price_per_session || 0) - (a.price_per_session || 0));
    }

    const total_results = results.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageSlice = results.slice(startIdx, endIdx);

    const mapped = pageSlice.map(lo => {
      const loc = locationsById.get(lo.location_id) || null;
      const price_display = this._formatPriceDisplay(
        lo.price_per_session,
        lo.price_unit,
        lo.currency
      );
      return {
        lesson_offering_id: lo.id,
        title: lo.title,
        subtitle: lo.subtitle || '',
        instrument: lo.instrument,
        age_group_label: lo.age_group,
        level_label: lo.level,
        duration_label: lo.duration_label || `${lo.duration_minutes} minutes`,
        session_format: lo.session_format,
        delivery_mode: lo.delivery_mode,
        location_name: loc ? loc.name : '',
        schedule_summary: (lo.schedule_time_ranges || []).join('; '),
        price_display,
        price_per_session: lo.price_per_session,
        price_unit: lo.price_unit,
        is_trial_available: !!lo.is_trial_available,
        thumbnail_image: lo.thumbnail_image || null,
        lesson_offering: lo
      };
    });

    return {
      results: mapped,
      total_results,
      page,
      pageSize
    };
  }

  // 6) getLessonOfferingDetail(lessonOfferingId)

  getLessonOfferingDetail(lessonOfferingId) {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const locations = this._getFromStorage('studio_locations');

    const lesson_offering = lessonOfferings.find(lo => lo.id === lessonOfferingId) || null;
    const location = lesson_offering
      ? locations.find(l => l.id === lesson_offering.location_id) || null
      : null;

    const schedule_display = lesson_offering
      ? lesson_offering.schedule_time_ranges || []
      : [];

    let estimated_monthly_cost = null;
    const price_per_session = lesson_offering ? lesson_offering.price_per_session : null;
    const price_unit = lesson_offering ? lesson_offering.price_unit : null;
    const required_lessons_per_month = lesson_offering
      ? lesson_offering.required_lessons_per_month || null
      : null;

    if (lesson_offering) {
      if (price_unit === 'per_month') {
        estimated_monthly_cost = price_per_session;
      } else if (
        (price_unit === 'per_lesson' || price_unit === 'per_class') &&
        typeof required_lessons_per_month === 'number'
      ) {
        estimated_monthly_cost = price_per_session * required_lessons_per_month;
      }
    }

    const pricing_display = {
      price_per_session,
      price_unit,
      required_lessons_per_month,
      estimated_monthly_cost,
      currency: lesson_offering ? lesson_offering.currency || 'USD' : 'USD'
    };

    const available_actions = [];
    if (lesson_offering) {
      if (lesson_offering.is_trial_available) available_actions.push('book_trial_lesson');
      if (lesson_offering.session_format === 'group' || lesson_offering.lesson_category === 'group_class') {
        available_actions.push('reserve_spot');
      }
      available_actions.push('book_lesson');
    }

    return {
      lesson_offering,
      location,
      schedule_display,
      objectives: lesson_offering ? lesson_offering.description || '' : '',
      eligibility_summary: '',
      pricing_display,
      available_actions
    };
  }

  // 7) createTrialLessonRequest(lessonOfferingId, locationId, startDatetime, student_name, student_age, contact_email, contact_phone)

  createTrialLessonRequest(
    lessonOfferingId,
    locationId,
    startDatetime,
    student_name,
    student_age,
    contact_email,
    contact_phone
  ) {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const lesson = lessonOfferings.find(lo => lo.id === lessonOfferingId) || null;

    const effectiveLocationId = locationId || (lesson ? lesson.location_id : null);

    const trialRequests = this._getFromStorage('trial_lesson_requests');
    const trial_request = {
      id: this._generateId('tlr'),
      lesson_offering_id: lessonOfferingId,
      location_id: effectiveLocationId,
      start_datetime: startDatetime,
      student_name,
      student_age,
      contact_email,
      contact_phone: contact_phone || '',
      status: 'submitted',
      created_at: this._nowIso()
    };

    trialRequests.push(trial_request);
    this._saveToStorage('trial_lesson_requests', trialRequests);

    return {
      trial_request,
      success: true,
      message: 'Trial lesson request submitted.'
    };
  }

  // 8) createGroupClassReservationAndAddToBooking(lessonOfferingId, locationId, startDate, quantity_students)

  createGroupClassReservationAndAddToBooking(
    lessonOfferingId,
    locationId,
    startDate,
    quantity_students
  ) {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const locations = this._getFromStorage('studio_locations');
    const lesson = lessonOfferings.find(lo => lo.id === lessonOfferingId) || null;

    if (!lesson) {
      return {
        group_class_reservation: null,
        booking_cart: null,
        booking_items: [],
        success: false,
        message: 'Lesson offering not found.'
      };
    }

    const effectiveLocationId = locationId || lesson.location_id || null;

    const groupReservations = this._getFromStorage('group_class_reservations');
    const group_class_reservation = {
      id: this._generateId('gcr'),
      lesson_offering_id: lessonOfferingId,
      location_id: effectiveLocationId,
      start_date: startDate,
      quantity_students: quantity_students || 1,
      student_names: [],
      status: 'submitted',
      created_at: this._nowIso()
    };

    groupReservations.push(group_class_reservation);
    this._saveToStorage('group_class_reservations', groupReservations);

    const cart = this._getOrCreateBookingCart();

    const loc = locations.find(l => l.id === effectiveLocationId) || null;

    const bookingItem = this._addBookingItemToCart(cart, {
      item_type: 'group_class',
      lesson_offering_id: lessonOfferingId,
      location_id: effectiveLocationId,
      instrument: lesson.instrument,
      level: lesson.level,
      day_of_week: (lesson.schedule_days || [])[0] || null,
      date: startDate,
      start_time: null,
      end_time: null,
      duration_minutes: lesson.duration_minutes,
      quantity_students: quantity_students || 1,
      student_id: null,
      student_name: null,
      notes: null,
      price_per_session: lesson.price_per_session,
      price_unit: lesson.price_unit,
      total_price_estimate:
        lesson.price_unit === 'per_class'
          ? (lesson.price_per_session || 0) * (quantity_students || 1)
          : null,
      status: 'selected'
    });

    const allBookingItems = this._getFromStorage('booking_items').filter(
      bi => bi.booking_cart_id === cart.id
    );

    return {
      group_class_reservation,
      booking_cart: cart,
      booking_items: allBookingItems,
      success: true,
      message: 'Group class reserved and added to booking cart.'
    };
  }

  // 9) startLessonBookingFromOffering(lessonOfferingId)

  startLessonBookingFromOffering(lessonOfferingId) {
    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const lesson = lessonOfferings.find(lo => lo.id === lessonOfferingId) || null;

    if (!lesson) {
      return {
        booking_cart: null,
        booking_item: null,
        success: false,
        message: 'Lesson offering not found.'
      };
    }

    const cart = this._getOrCreateBookingCart();

    const bookingItem = this._addBookingItemToCart(cart, {
      item_type: 'scheduled_lesson',
      lesson_offering_id: lesson.id,
      location_id: lesson.location_id || null,
      instrument: lesson.instrument,
      level: lesson.level,
      day_of_week: (lesson.schedule_days || [])[0] || null,
      date: null,
      start_time: null,
      end_time: null,
      duration_minutes: lesson.duration_minutes,
      quantity_students: 1,
      student_id: null,
      student_name: null,
      notes: null,
      price_per_session: lesson.price_per_session,
      price_unit: lesson.price_unit,
      total_price_estimate: null,
      status: 'selected'
    });

    return {
      booking_cart: cart,
      booking_item: bookingItem,
      success: true,
      message: 'Lesson offering added to booking cart.'
    };
  }

  // 10) getMembershipFilterOptions()

  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans');

    const instrument_options = this._unique(plans.map(p => p.instrument));
    const age_group_options = this._unique(plans.map(p => p.age_group));
    const session_duration_options_minutes = this._unique(
      plans.map(p => p.session_duration_minutes)
    );
    const delivery_mode_options = this._unique(plans.map(p => p.delivery_mode));

    return {
      instrument_options,
      age_group_options,
      session_duration_options_minutes,
      delivery_mode_options
    };
  }

  // 11) searchMembershipPlans(filters, sort)

  searchMembershipPlans(filters, sort) {
    filters = filters || {};
    let plans = this._getFromStorage('membership_plans');

    plans = plans.filter(p => {
      if (filters.instrument && p.instrument !== filters.instrument) return false;
      if (filters.age_group && p.age_group !== filters.age_group) return false;
      if (
        typeof filters.session_duration_minutes === 'number' &&
        p.session_duration_minutes !== filters.session_duration_minutes
      )
        return false;
      if (filters.delivery_mode && p.delivery_mode !== filters.delivery_mode) return false;
      if (
        typeof filters.max_monthly_price === 'number' &&
        p.monthly_price > filters.max_monthly_price
      )
        return false;
      return true;
    });

    if (sort === 'price_low_to_high') {
      plans.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort === 'price_high_to_low') {
      plans.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    }

    // Resolve eligible locations
    const locations = this._getFromStorage('studio_locations');
    const locationsById = new Map(locations.map(l => [l.id, l]));

    return plans.map(p => ({
      ...p,
      eligible_locations: (p.eligible_location_ids || []).map(id => locationsById.get(id)).filter(Boolean)
    }));
  }

  // 12) getMembershipComparisonView(filters)

  getMembershipComparisonView(filters) {
    const plans = this.searchMembershipPlans(filters || {}, 'price_low_to_high');

    const mapped = plans.map(p => ({
      membership_plan_id: p.id,
      name: p.name,
      instrument: p.instrument,
      age_group: p.age_group,
      session_duration_minutes: p.session_duration_minutes,
      lessons_per_week: p.lessons_per_week,
      lessons_per_month: p.lessons_per_month,
      monthly_price: p.monthly_price,
      currency: p.currency || 'USD',
      benefits: p.benefits || [],
      membership_plan: p
    }));

    return { plans: mapped };
  }

  // 13) getMembershipPlanDetail(membershipPlanId)

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const locations = this._getFromStorage('studio_locations');

    const membership_plan = plans.find(p => p.id === membershipPlanId) || null;
    const eligible_locations = membership_plan
      ? (membership_plan.eligible_location_ids || [])
          .map(id => locations.find(l => l.id === id) || null)
          .filter(Boolean)
      : [];

    return {
      membership_plan,
      eligible_locations
    };
  }

  // 14) startMembershipEnrollment(membershipPlanId)

  startMembershipEnrollment(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find(p => p.id === membershipPlanId) || null;

    if (!plan) {
      return {
        membership_enrollment: null,
        plan: null,
        success: false
      };
    }

    const enrollments = this._getFromStorage('membership_enrollments');

    const membership_enrollment = {
      id: this._generateId('menr'),
      membership_plan_id: membershipPlanId,
      plan_name_snapshot: plan.name,
      monthly_price_snapshot: plan.monthly_price,
      currency: plan.currency || 'USD',
      notes: '',
      status: 'in_progress',
      created_at: this._nowIso()
    };

    enrollments.push(membership_enrollment);
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      membership_enrollment,
      plan,
      success: true
    };
  }

  // 15) updateMembershipEnrollmentNotes(membershipEnrollmentId, notes)

  updateMembershipEnrollmentNotes(membershipEnrollmentId, notes) {
    let enrollments = this._getFromStorage('membership_enrollments');
    const idx = enrollments.findIndex(e => e.id === membershipEnrollmentId);
    if (idx === -1) {
      return {
        membership_enrollment: null,
        success: false
      };
    }

    enrollments[idx].notes = notes || '';
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      membership_enrollment: enrollments[idx],
      success: true
    };
  }

  // 16) getMembershipEnrollmentSummary(membershipEnrollmentId)

  getMembershipEnrollmentSummary(membershipEnrollmentId) {
    const enrollments = this._getFromStorage('membership_enrollments');
    const plans = this._getFromStorage('membership_plans');

    const membership_enrollment = enrollments.find(e => e.id === membershipEnrollmentId) || null;
    const plan = membership_enrollment
      ? plans.find(p => p.id === membership_enrollment.membership_plan_id) || null
      : null;

    let billing_overview = '';
    if (membership_enrollment && plan) {
      const cur = membership_enrollment.currency || plan.currency || 'USD';
      billing_overview = `${cur} ${membership_enrollment.monthly_price_snapshot.toFixed(
        2
      )} per month for ${plan.lessons_per_month} ${plan.session_duration_minutes}-minute lessons.`;
    }

    const policy_highlights = plan && plan.cancellation_policy_summary
      ? plan.cancellation_policy_summary
      : '';

    return {
      membership_enrollment,
      plan,
      billing_overview,
      policy_highlights
    };
  }

  // 17) getTeacherFilterOptions()

  getTeacherFilterOptions() {
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('studio_locations');

    const instrument_options = this._unique(
      teachers.flatMap(t => t.instruments_taught || [])
    );

    const availability_day_options = this._unique(
      teachers.flatMap(t => t.available_days || [])
    );

    const rating_threshold_options = this._unique(
      teachers.map(t => t.rating).filter(r => typeof r === 'number')
    ).sort((a, b) => a - b);

    const experience_years_options = this._unique(
      teachers.map(t => t.years_experience).filter(y => typeof y === 'number')
    ).sort((a, b) => a - b);

    return {
      instrument_options,
      location_options: locations,
      availability_day_options,
      rating_threshold_options,
      experience_years_options
    };
  }

  // 18) searchTeachers(filters, sort)

  searchTeachers(filters, sort) {
    filters = filters || {};
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('studio_locations');
    const locationsById = new Map(locations.map(l => [l.id, l]));

    let filtered = teachers.filter(t => {
      if (filters.instrument) {
        const instruments = t.instruments_taught || [];
        if (!instruments.includes(filters.instrument)) return false;
      }
      if (filters.locationId && t.primary_location_id !== filters.locationId) return false;
      if (filters.availability_day) {
        const days = t.available_days || [];
        if (!days.includes(filters.availability_day)) return false;
      }
      if (
        typeof filters.min_rating === 'number' &&
        (typeof t.rating !== 'number' || t.rating < filters.min_rating)
      )
        return false;
      if (
        typeof filters.min_years_experience === 'number' &&
        (typeof t.years_experience !== 'number' ||
          t.years_experience < filters.min_years_experience)
      )
        return false;
      return true;
    });

    if (sort === 'experience_high_to_low') {
      filtered.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
    } else if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'name_a_to_z') {
      filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }

    return filtered.map(t => {
      const loc = locationsById.get(t.primary_location_id) || null;
      return {
        teacher_id: t.id,
        full_name: t.full_name,
        primary_instruments: t.instruments_taught || [],
        rating: t.rating,
        review_count: t.review_count || 0,
        years_experience: t.years_experience,
        primary_location_name: loc ? loc.name : '',
        availability_summary: t.availability_summary || '',
        photo_url: t.photo_url || null,
        teacher: t
      };
    });
  }

  // 19) getTeacherProfile(teacherId)

  getTeacherProfile(teacherId) {
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('studio_locations');

    const teacher = teachers.find(t => t.id === teacherId) || null;
    const primary_location = teacher
      ? locations.find(l => l.id === teacher.primary_location_id) || null
      : null;
    const other_locations = teacher
      ? (teacher.other_location_ids || [])
          .map(id => locations.find(l => l.id === id) || null)
          .filter(Boolean)
      : [];

    return {
      teacher,
      primary_location,
      other_locations
    };
  }

  // 20) submitTeacherLessonRequest(teacherId, locationId, instrument, level, preferred_day_of_week, preferred_time, contact_name, contact_email, notes)

  submitTeacherLessonRequest(
    teacherId,
    locationId,
    instrument,
    level,
    preferred_day_of_week,
    preferred_time,
    contact_name,
    contact_email,
    notes
  ) {
    const teachers = this._getFromStorage('teachers');
    const teacher = teachers.find(t => t.id === teacherId) || null;

    const effectiveLocationId = locationId || (teacher ? teacher.primary_location_id : null);

    const requests = this._getFromStorage('teacher_lesson_requests');
    const teacher_lesson_request = {
      id: this._generateId('tlreq'),
      teacher_id: teacherId,
      location_id: effectiveLocationId,
      instrument,
      level,
      preferred_day_of_week: preferred_day_of_week || null,
      preferred_time: preferred_time || null,
      preferred_datetime: null,
      contact_name,
      contact_email,
      notes: notes || '',
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(teacher_lesson_request);
    this._saveToStorage('teacher_lesson_requests', requests);

    return {
      teacher_lesson_request,
      success: true,
      message: 'Teacher lesson request submitted.'
    };
  }

  // 21) getEventFilterOptions()

  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const event_type_options = this._unique(events.map(e => e.event_type));
    const instrument_options = this._unique(events.map(e => e.instrument).filter(Boolean));
    const level_options = this._unique(events.map(e => e.level).filter(Boolean));
    const age_group_options = this._unique(events.map(e => e.age_group).filter(Boolean));
    const price_filter_options = ['free_only', 'paid_only', 'all'];

    return {
      event_type_options,
      instrument_options,
      level_options,
      age_group_options,
      price_filter_options
    };
  }

  // 22) searchEvents(filters)

  searchEvents(filters) {
    filters = filters || {};
    const events = this._getFromStorage('events');
    const locations = this._getFromStorage('studio_locations');
    const locationsById = new Map(locations.map(l => [l.id, l]));

    let filtered = events.filter(e => {
      if (filters.event_type && e.event_type !== filters.event_type) return false;
      if (filters.instrument && e.instrument !== filters.instrument) return false;
      if (filters.level && e.level !== filters.level) return false;
      if (filters.age_group && e.age_group !== filters.age_group) return false;

      if (filters.free_only === true && !e.is_free) return false;

      if (filters.start_date) {
        const start = this._parseDate(filters.start_date);
        const d = this._parseDate(e.start_datetime);
        if (start && d && d < start) return false;
      }

      if (filters.end_date) {
        const end = this._parseDate(filters.end_date);
        const d = this._parseDate(e.start_datetime);
        if (end && d && d > end) return false;
      }

      return true;
    });

    // Attach location resolution
    return filtered.map(ev => ({
      ...ev,
      location: locationsById.get(ev.location_id) || null
    }));
  }

  // 23) getEventDetail(eventId)

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const locations = this._getFromStorage('studio_locations');

    const event = events.find(e => e.id === eventId) || null;
    const location = event
      ? locations.find(l => l.id === event.location_id) || null
      : null;

    return {
      event,
      location,
      eligibility_summary: event ? event.eligibility_summary || '' : ''
    };
  }

  // 24) submitEventRegistration(eventId, participant_name, participant_age, contact_email, contact_phone)

  submitEventRegistration(eventId, participant_name, participant_age, contact_email, contact_phone) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event_registration: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const registrations = this._getFromStorage('event_registrations');
    const event_registration = {
      id: this._generateId('ereg'),
      event_id: eventId,
      participant_name,
      participant_age,
      contact_email,
      contact_phone: contact_phone || '',
      registration_datetime: this._nowIso(),
      status: 'submitted'
    };

    registrations.push(event_registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      event_registration,
      success: true,
      message: 'Event registration submitted.'
    };
  }

  // 25) getScheduleFilterOptions()

  getScheduleFilterOptions() {
    const slots = this._getFromStorage('schedule_slots');
    const locations = this._getFromStorage('studio_locations');

    const instrument_options = this._unique(slots.map(s => s.instrument));
    const level_options = this._unique(slots.map(s => s.level));
    const day_of_week_options = this._unique(slots.map(s => s.day_of_week));

    return {
      location_options: locations,
      instrument_options,
      level_options,
      day_of_week_options
    };
  }

  // 26) searchScheduleSlots(filters)

  searchScheduleSlots(filters) {
    if (!filters || !filters.locationId || !filters.instrument || !filters.level || !filters.day_of_week) {
      return [];
    }

    const slots = this._getFromStorage('schedule_slots');
    const locations = this._getFromStorage('studio_locations');
    const teachers = this._getFromStorage('teachers');
    const locationsById = new Map(locations.map(l => [l.id, l]));
    const teachersById = new Map(teachers.map(t => [t.id, t]));

    let filtered = slots.filter(s => {
      if (s.location_id !== filters.locationId) return false;
      if (s.instrument !== filters.instrument) return false;
      if (s.level !== filters.level) return false;
      if (s.day_of_week !== filters.day_of_week) return false;
      if (
        filters.start_time_not_before &&
        this._compareTimesHHMM(s.start_time, filters.start_time_not_before) < 0
      )
        return false;
      if (
        typeof filters.duration_minutes === 'number' &&
        s.duration_minutes !== filters.duration_minutes
      )
        return false;
      if (s.availability_status && s.availability_status !== 'available') return false;
      return true;
    });

    // Resolve foreign keys (location, teacher)
    return filtered.map(s => ({
      ...s,
      location: locationsById.get(s.location_id) || null,
      teacher: s.teacher_id ? teachersById.get(s.teacher_id) || null : null
    }));
  }

  // 27) selectScheduleSlotForStudent(scheduleSlotId, student)

  selectScheduleSlotForStudent(scheduleSlotId, student) {
    const slots = this._getFromStorage('schedule_slots');
    const slot = slots.find(s => s.id === scheduleSlotId) || null;

    if (!slot) {
      return {
        booking_cart: null,
        booking_item: null,
        all_booking_items: [],
        success: false
      };
    }

    // Create or find student profile
    const students = this._getFromStorage('students');
    const existingStudent = students.find(
      s => s.name === student.name && s.age === student.age
    );
    let studentId;
    let updatedStudents = students;

    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      const newStudent = {
        id: this._generateId('stud'),
        name: student.name,
        age: student.age,
        preferred_instruments: student.preferred_instrument
          ? [student.preferred_instrument]
          : [],
        level: student.level || null,
        notes: student.notes || ''
      };
      updatedStudents = [...students, newStudent];
      this._saveToStorage('students', updatedStudents);
      studentId = newStudent.id;
    }

    const cart = this._getOrCreateBookingCart();

    const bookingItem = this._addBookingItemToCart(cart, {
      item_type: 'scheduled_lesson',
      schedule_slot_id: slot.id,
      location_id: slot.location_id,
      instrument: slot.instrument,
      level: slot.level,
      day_of_week: slot.day_of_week,
      date: null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      quantity_students: 1,
      student_id: studentId,
      student_name: student.name,
      notes: student.notes || '',
      price_per_session: null,
      price_unit: null,
      total_price_estimate: null,
      status: 'selected'
    });

    // Optionally mark slot as held to prevent double booking
    const slotIdx = slots.findIndex(s => s.id === slot.id);
    if (slotIdx !== -1) {
      slots[slotIdx].availability_status = 'held';
      this._saveToStorage('schedule_slots', slots);
    }

    const all_booking_items = this._getFromStorage('booking_items').filter(
      bi => bi.booking_cart_id === cart.id
    );

    return {
      booking_cart: cart,
      booking_item: bookingItem,
      all_booking_items,
      success: true
    };
  }

  // 28) getCurrentBookingSummary()

  getCurrentBookingSummary() {
    const cart = this._getExistingBookingCart();
    if (!cart) {
      return {
        booking_cart: null,
        items: []
      };
    }

    const bookingItems = this._getFromStorage('booking_items').filter(
      bi => bi.booking_cart_id === cart.id && bi.status !== 'cancelled'
    );

    const lessonOfferings = this._getFromStorage('lesson_offerings');
    const events = this._getFromStorage('events');
    const membershipPlans = this._getFromStorage('membership_plans');
    const locations = this._getFromStorage('studio_locations');

    const lessonsById = new Map(lessonOfferings.map(lo => [lo.id, lo]));
    const eventsById = new Map(events.map(e => [e.id, e]));
    const plansById = new Map(membershipPlans.map(p => [p.id, p]));
    const locationsById = new Map(locations.map(l => [l.id, l]));

    const items = bookingItems.map(bi => {
      const lesson_offering = bi.lesson_offering_id
        ? lessonsById.get(bi.lesson_offering_id) || null
        : null;
      const event = bi.event_id ? eventsById.get(bi.event_id) || null : null;
      const membership_plan = bi.membership_plan_id
        ? plansById.get(bi.membership_plan_id) || null
        : null;

      let location = null;
      if (bi.location_id) {
        location = locationsById.get(bi.location_id) || null;
      } else if (lesson_offering && lesson_offering.location_id) {
        location = locationsById.get(lesson_offering.location_id) || null;
      } else if (event && event.location_id) {
        location = locationsById.get(event.location_id) || null;
      }

      return {
        booking_item: bi,
        lesson_offering,
        event,
        membership_plan,
        location
      };
    });

    return {
      booking_cart: cart,
      items
    };
  }

  // 29) updateBookingItemDetails(bookingItemId, updates)

  updateBookingItemDetails(bookingItemId, updates) {
    updates = updates || {};
    let bookingItems = this._getFromStorage('booking_items');
    const idx = bookingItems.findIndex(bi => bi.id === bookingItemId);
    if (idx === -1) {
      return {
        booking_item: null,
        booking_cart: null,
        success: false
      };
    }

    const item = bookingItems[idx];
    if (typeof updates.date === 'string') item.date = updates.date;
    if (typeof updates.quantity_students === 'number')
      item.quantity_students = updates.quantity_students;
    if (typeof updates.notes === 'string') item.notes = updates.notes;

    bookingItems[idx] = item;
    this._saveToStorage('booking_items', bookingItems);

    const carts = this._getFromStorage('booking_carts');
    const cart = carts.find(c => c.id === item.booking_cart_id) || null;

    return {
      booking_item: item,
      booking_cart: cart,
      success: true
    };
  }

  // 30) proceedToBookingDetails()

  proceedToBookingDetails() {
    const cart = this._updateBookingCartStep('details');
    if (!cart) {
      return {
        booking_cart: null,
        items: [],
        success: false
      };
    }

    const bookingItems = this._getFromStorage('booking_items').filter(
      bi => bi.booking_cart_id === cart.id && bi.status !== 'cancelled'
    );

    return {
      booking_cart: cart,
      items: bookingItems,
      success: true
    };
  }

  // 31) getBookingDetailsContext()

  getBookingDetailsContext() {
    const cart = this._getExistingBookingCart();
    if (!cart) {
      return {
        booking_cart: null,
        items: [],
        policy_highlights: ''
      };
    }

    const bookingItems = this._getFromStorage('booking_items').filter(
      bi => bi.booking_cart_id === cart.id && bi.status !== 'cancelled'
    );

    const policy_highlights =
      'Bookings are requests only until confirmed by the studio. No payment is processed at this step.';

    return {
      booking_cart: cart,
      items: bookingItems,
      policy_highlights
    };
  }

  // 32) submitBookingDetails(primary_contact, students)

  submitBookingDetails(primary_contact, students) {
    const cart = this._getExistingBookingCart();
    if (!cart) {
      return {
        booking_cart: null,
        success: false,
        message: 'No active booking cart.'
      };
    }

    const detailsList = this._getFromStorage('booking_cart_details');
    const idx = detailsList.findIndex(d => d.booking_cart_id === cart.id);
    const record = {
      booking_cart_id: cart.id,
      primary_contact: primary_contact || null,
      students: students || [],
      submitted_at: this._nowIso()
    };

    if (idx === -1) {
      detailsList.push(record);
    } else {
      detailsList[idx] = record;
    }
    this._saveToStorage('booking_cart_details', detailsList);

    this._updateBookingCartStep('complete');

    const carts = this._getFromStorage('booking_carts');
    const updatedCart = carts.find(c => c.id === cart.id) || cart;

    return {
      booking_cart: updatedCart,
      success: true,
      message: 'Booking details submitted (no payment processed).'
    };
  }

  // 33) getArticleFilterOptions()

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const category_options = this._unique(articles.map(a => a.category));

    let start_date = null;
    let end_date = null;
    if (articles.length) {
      const dates = articles.map(a => this._parseDate(a.published_date)).filter(Boolean);
      if (dates.length) {
        const min = new Date(Math.min.apply(null, dates));
        const max = new Date(Math.max.apply(null, dates));
        start_date = min.toISOString().slice(0, 10);
        end_date = max.toISOString().slice(0, 10);
      }
    }

    const sort_options = ['shortest_reading_time_first', 'most_recent_first'];

    return {
      category_options,
      default_date_range: {
        start_date,
        end_date
      },
      sort_options
    };
  }

  // 34) searchArticles(filters, sort)

  searchArticles(filters, sort) {
    filters = filters || {};
    const articles = this._getFromStorage('articles');

    const q = (filters.query || '').toLowerCase();

    let filtered = articles.filter(a => {
      if (filters.category && a.category !== filters.category) return false;
      if (filters.instrument_keyword) {
        const keywords = a.instrument_keywords || [];
        if (!keywords.includes(filters.instrument_keyword)) return false;
      }
      if (q) {
        const hay = `${a.title || ''} ${a.summary || ''} ${a.content || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.start_date) {
        const start = this._parseDate(filters.start_date);
        const d = this._parseDate(a.published_date);
        if (start && d && d < start) return false;
      }

      if (filters.end_date) {
        const end = this._parseDate(filters.end_date);
        const d = this._parseDate(a.published_date);
        if (end && d && d > end) return false;
      }

      return true;
    });

    if (sort === 'shortest_reading_time_first') {
      filtered.sort((a, b) => (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0));
    } else if (sort === 'most_recent_first') {
      filtered.sort((a, b) => this._parseDate(b.published_date) - this._parseDate(a.published_date));
    }

    return filtered;
  }

  // 35) getArticleDetail(articleId)

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    const related_articles = article
      ? articles
          .filter(a => a.id !== article.id && a.category === article.category)
          .slice(0, 5)
      : [];

    const readingList = this._loadReadingListFromLocalStorage();
    const is_saved_to_reading_list = !!readingList.find(
      r => r.article_id === articleId
    );

    return {
      article,
      related_articles,
      is_saved_to_reading_list
    };
  }

  // 36) saveArticleToReadingList(articleId)

  saveArticleToReadingList(articleId) {
    const readingList = this._loadReadingListFromLocalStorage();
    const existing = readingList.find(r => r.article_id === articleId);

    if (existing) {
      return {
        reading_list_item: existing,
        success: true
      };
    }

    const item = {
      id: this._generateId('rli'),
      article_id: articleId,
      saved_at: this._nowIso()
    };

    readingList.push(item);
    this._saveReadingListToLocalStorage(readingList);

    return {
      reading_list_item: item,
      success: true
    };
  }

  // 37) getReadingListItems()

  getReadingListItems() {
    const readingList = this._loadReadingListFromLocalStorage();
    const articles = this._getFromStorage('articles');
    const articlesById = new Map(articles.map(a => [a.id, a]));

    return readingList.map(r => ({
      reading_list_item: r,
      article: articlesById.get(r.article_id) || null
    }));
  }

  // 38) getFaqCategories()

  getFaqCategories() {
    return this._getFromStorage('faq_categories');
  }

  // 39) searchFaqItems(query)

  searchFaqItems(query) {
    const q = (query || '').toLowerCase();
    const items = this._getFromStorage('faq_items');
    const categories = this._getFromStorage('faq_categories');
    const categoriesById = new Map(categories.map(c => [c.id, c]));

    const filtered = items.filter(item => {
      if (!q) return true;
      const hay = `${item.question || ''} ${item.answer_html || ''} ${(item.keywords || []).join(
        ' '
      )}`.toLowerCase();
      return hay.includes(q);
    });

    return filtered.map(item => ({
      ...item,
      category: categoriesById.get(item.category_id) || null
    }));
  }

  // 40) getFaqItemsByCategory(faqCategoryId)

  getFaqItemsByCategory(faqCategoryId) {
    const items = this._getFromStorage('faq_items');
    return items.filter(i => i.category_id === faqCategoryId);
  }

  // 41) getFaqItemDetail(faqItemId)

  getFaqItemDetail(faqItemId) {
    const items = this._getFromStorage('faq_items');
    const sections = this._getFromStorage('faq_sections');

    const faq_item = items.find(i => i.id === faqItemId) || null;
    const itemSections = sections
      .filter(s => s.faq_item_id === faqItemId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Instrumentation for task completion tracking (task_8)
    try {
      if (faq_item && typeof faq_item.question === 'string') {
        const questionLower = faq_item.question.toLowerCase();

        // task8_lateCancellationPolicyViewed
        if (questionLower.includes('cancellation policy')) {
          let hasLateCancellationText = false;

          // Check associated sections for late cancellation text
          if (Array.isArray(itemSections)) {
            for (const s of itemSections) {
              if (s && typeof s.content_html === 'string') {
                const sectionLower = s.content_html.toLowerCase();
                if (sectionLower.includes('late cancellations') && sectionLower.includes('24 hours')) {
                  hasLateCancellationText = true;
                  break;
                }
              } else if (s && typeof s.body_html === 'string') {
                // Fallback property name, in case content is stored differently
                const sectionLower = s.body_html.toLowerCase();
                if (sectionLower.includes('late cancellations') && sectionLower.includes('24 hours')) {
                  hasLateCancellationText = true;
                  break;
                }
              }
            }
          }

          // Also check the main answer_html field
          if (!hasLateCancellationText && typeof faq_item.answer_html === 'string') {
            const answerLower = faq_item.answer_html.toLowerCase();
            if (answerLower.includes('late cancellations') && answerLower.includes('24 hours')) {
              hasLateCancellationText = true;
            }
          }

          if (hasLateCancellationText) {
            localStorage.setItem(
              'task8_lateCancellationPolicyViewed',
              JSON.stringify({ "faqItemId": faq_item.id, "question": faq_item.question, "viewed_at": this._nowIso() })
            );
          }
        }

        // task8_makeupLessonFeeViewed
        const questionNormalized = questionLower.replace(/\s+/g, ' ');
        if (
          questionNormalized.includes('fee for make-up lessons') ||
          questionNormalized.includes('fee for makeup lessons') ||
          questionNormalized.includes('is there a fee for make-up lessons') ||
          questionNormalized.includes('is there a fee for makeup lessons')
        ) {
          localStorage.setItem(
            'task8_makeupLessonFeeViewed',
            JSON.stringify({ "faqItemId": faq_item.id, "question": faq_item.question, "viewed_at": this._nowIso() })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      faq_item,
      sections: itemSections
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
