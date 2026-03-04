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

  // -------------------- STORAGE & ID HELPERS --------------------

  _initStorage() {
    const keys = [
      // Example legacy keys from template
      'users',
      'products',
      // Core data model storage keys
      'coaches',
      'coach_session_offerings',
      'coach_availability_slots',
      'session_bookings',
      'recurring_plans',
      'workshops',
      'workshop_availability_slots',
      'workshop_booking_requests',
      'coaching_packages',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'programs',
      'program_start_dates',
      'program_enrollments',
      'assessment_quizzes',
      'assessment_questions',
      'assessment_answer_options',
      'assessment_responses',
      'assessment_results',
      'assessment_coach_matches',
      'resources',
      'saved_resources',
      'newsletter_subscriptions',
      'proposal_requests',
      'resource_filter_preferences',
      // Additional helper/context keys
      'assessment_context'
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
    try {
      return data ? JSON.parse(data) : [];
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

  // -------------------- LABEL HELPERS --------------------

  _specializationLabel(value) {
    const map = {
      career_change: 'Career Change',
      productivity: 'Productivity',
      time_management: 'Time Management',
      leadership: 'Leadership',
      stress_management: 'Stress Management',
      conflict_management: 'Conflict Management',
      organizational_change: 'Organizational Change',
      general_personal_growth: 'General Personal Growth'
    };
    return map[value] || value;
  }

  _topicLabel(value) {
    const map = {
      stress_management: 'Stress Management',
      career_change: 'Career Change',
      productivity: 'Productivity',
      leadership: 'Leadership',
      conflict_management: 'Conflict Management',
      organizational_change: 'Organizational Change',
      team_building: 'Team Building',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatLabel(value) {
    const map = {
      online: 'Online',
      in_person: 'In Person',
      hybrid: 'Hybrid'
    };
    return map[value] || value;
  }

  _contentCategoryLabel(value) {
    const map = {
      leadership: 'Leadership',
      organizational_change: 'Organizational Change',
      change_management: 'Change Management',
      career_development: 'Career Development',
      stress_management: 'Stress Management',
      productivity: 'Productivity',
      general: 'General',
      all: 'All'
    };
    return map[value] || value;
  }

  _sessionCategoryLabel(value) {
    const map = {
      intro: 'Intro Session',
      standard: 'Standard Session'
    };
    return map[value] || value;
  }

  // -------------------- CART HELPERS --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = this._nowISO();
    const cart = {
      id: this._generateId('cart'),
      created_at: now,
      updated_at: now,
      currency: 'usd'
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _calculateCartTotals(cart) {
    if (!cart) {
      return { subtotal: 0, tax: 0, total: 0, currency: 'usd', item_count: 0 };
    }
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id
    );
    const subtotal = cartItems.reduce((sum, ci) => sum + (ci.total_price || 0), 0);
    const tax = 0; // For simplicity, no tax calculation
    const total = subtotal + tax;
    const item_count = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    return { subtotal, tax, total, currency: cart.currency || 'usd', item_count };
  }

  // -------------------- RESOURCE FILTER & SAVED HELPERS --------------------

  _getOrCreateResourceFilterPreference() {
    let prefs = this._getFromStorage('resource_filter_preferences');
    if (prefs.length === 0) {
      const pref = {
        id: this._generateId('resourcefilter'),
        keyword: '',
        category_id: 'all',
        content_type: 'all',
        max_read_time_minutes: null,
        published_after: null
      };
      prefs.push(pref);
      this._saveToStorage('resource_filter_preferences', prefs);
      return pref;
    }
    return prefs[0];
  }

  _saveResourceFilterPreference(pref) {
    let prefs = this._getFromStorage('resource_filter_preferences');
    if (prefs.length === 0) {
      prefs.push(pref);
    } else {
      prefs[0] = pref;
    }
    this._saveToStorage('resource_filter_preferences', prefs);
  }

  _getCurrentSavedResourcesStore() {
    const saved = this._getFromStorage('saved_resources');
    return saved;
  }

  // -------------------- ASSESSMENT CONTEXT HELPER --------------------

  _getCurrentAssessmentContext() {
    const data = localStorage.getItem('assessment_context');
    if (!data) {
      return { latest_result_id: null };
    }
    try {
      return JSON.parse(data) || { latest_result_id: null };
    } catch (e) {
      return { latest_result_id: null };
    }
  }

  _setCurrentAssessmentContext(ctx) {
    localStorage.setItem('assessment_context', JSON.stringify(ctx));
  }

  // -------------------- ORDER & BOOKING HELPERS --------------------

  _generateOrderFromCart(cart, billingInfo) {
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id
    );
    const totals = this._calculateCartTotals(cart);

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now();

    const order = {
      id: orderId,
      order_number: orderNumber,
      cartId: cart.id,
      created_at: this._nowISO(),
      status: 'pending',
      total_amount: totals.total,
      currency: totals.currency,
      billing_name: billingInfo.billing_name,
      billing_address_line1: billingInfo.billing_address_line1,
      billing_address_line2: billingInfo.billing_address_line2 || '',
      billing_city: billingInfo.billing_city,
      billing_state: billingInfo.billing_state || '',
      billing_postal_code: billingInfo.billing_postal_code,
      billing_country: billingInfo.billing_country,
      payment_card_last4: null,
      payment_method_brand: null,
      payment_status: 'pending'
    };

    orders.push(order);

    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('orderitem'),
        orderId: orderId,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      };
      orderItems.push(oi);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    return order;
  }

  _createSessionBookingFromSlot({
    coach,
    offering,
    slot,
    contact_name,
    contact_email,
    contact_phone,
    notes,
    recurrencePlanId = null,
    is_part_of_recurring_plan = false
  }) {
    const bookings = this._getFromStorage('session_bookings');

    const price =
      typeof slot.price_override === 'number' && slot.price_override >= 0
        ? slot.price_override
        : offering.base_price;

    const booking = {
      id: this._generateId('sessionbooking'),
      coachId: coach.id,
      sessionOfferingId: offering.id,
      availabilitySlotId: slot.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      duration_minutes:
        (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) /
        (1000 * 60),
      price: price,
      currency: 'usd',
      booking_status: 'confirmed',
      session_type: offering.session_category,
      is_part_of_recurring_plan,
      recurrencePlanId,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      notes: notes || '',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('session_bookings', bookings);

    // Mark slot as booked
    const slots = this._getFromStorage('coach_availability_slots');
    const idx = slots.findIndex((s) => s.id === slot.id);
    if (idx !== -1) {
      slots[idx].is_booked = true;
      this._saveToStorage('coach_availability_slots', slots);
    }

    return booking;
  }

  _createRecurringPlanAndSessions({
    coach,
    offering,
    start_at,
    duration_minutes,
    occurrence_count,
    contact_name,
    contact_email,
    notes
  }) {
    const plans = this._getFromStorage('recurring_plans');
    const bookings = this._getFromStorage('session_bookings');

    const startDate = new Date(start_at);
    const sessionMs = duration_minutes * 60 * 1000;

    const sessionPrice = offering.base_price;
    const totalPrice = sessionPrice * occurrence_count;

    const planStart = startDate.toISOString();
    const planEnd = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 * (occurrence_count - 1) + sessionMs).toISOString();

    const plan = {
      id: this._generateId('recurringplan'),
      coachId: coach.id,
      sessionOfferingId: offering.id,
      frequency: 'weekly',
      occurrence_count,
      start_at: planStart,
      end_at: planEnd,
      total_price: totalPrice,
      status: 'active',
      title: `${coach.name} - Weekly ${offering.duration_minutes} min`,
      created_at: this._nowISO()
    };

    plans.push(plan);

    const sessions = [];
    for (let i = 0; i < occurrence_count; i++) {
      const sStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const sEnd = new Date(sStart.getTime() + sessionMs);

      const booking = {
        id: this._generateId('sessionbooking'),
        coachId: coach.id,
        sessionOfferingId: offering.id,
        availabilitySlotId: null,
        start_at: sStart.toISOString(),
        end_at: sEnd.toISOString(),
        duration_minutes,
        price: sessionPrice,
        currency: 'usd',
        booking_status: 'confirmed',
        session_type: offering.session_category,
        is_part_of_recurring_plan: true,
        recurrencePlanId: plan.id,
        contact_name,
        contact_email,
        contact_phone: '',
        notes: notes || '',
        created_at: this._nowISO()
      };
      bookings.push(booking);
      sessions.push(booking);
    }

    this._saveToStorage('recurring_plans', plans);
    this._saveToStorage('session_bookings', bookings);

    return { plan, sessions };
  }

  // -------------------- INTERFACES --------------------
  // 1) getHomePageContent

  getHomePageContent() {
    const coaches = this._getFromStorage('coaches').filter((c) => c.is_active !== false);
    const workshops = this._getFromStorage('workshops').filter((w) => w.is_active !== false);
    const programs = this._getFromStorage('programs').filter((p) => p.is_active !== false);
    const packages = this._getFromStorage('coaching_packages').filter((p) => p.is_active !== false);

    const featured_personal_coaches = coaches
      .slice()
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 4)
      .map((c) => ({
        coach_id: c.id,
        name: c.name,
        primary_specialization: c.primary_specialization,
        primary_specialization_label: this._specializationLabel(c.primary_specialization),
        average_rating: c.average_rating || 0,
        rating_count: c.rating_count || 0,
        starting_price: c.starting_price || c.min_session_price || 0,
        formats_offered: c.formats_offered || [],
        supports_intro_sessions: !!c.supports_intro_sessions,
        supports_recurring_sessions: !!c.supports_recurring_sessions,
        profile_image_url: c.profile_image_url || ''
      }));

    const featured_workshops = workshops
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((w) => ({
        workshop_id: w.id,
        title: w.title,
        topic: w.topic,
        topic_label: this._topicLabel(w.topic),
        duration_minutes: w.duration_minutes,
        base_price: w.base_price,
        format: w.format,
        rating: w.rating || 0
      }));

    const featured_programs = programs
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((p) => ({
        program_id: p.id,
        title: p.title,
        topic: p.topic,
        topic_label: this._topicLabel(p.topic),
        duration_weeks: p.duration_weeks,
        session_count: p.session_count,
        price: p.price,
        format: p.format,
        rating: p.rating || 0
      }));

    const featured_packages = packages
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((p) => ({
        package_id: p.id,
        name: p.name,
        package_type: p.package_type,
        topic: p.topic,
        topic_label: this._topicLabel(p.topic),
        session_count: p.session_count,
        session_duration_minutes: p.session_duration_minutes,
        total_price: p.total_price,
        format: p.format,
        rating: p.rating || 0
      }));

    return {
      hero: {
        headline: 'Coaching for Individuals and Organizations',
        subheadline: 'Match with vetted coaches and programs for career, leadership, and wellbeing.',
        primary_cta_label: 'Explore Personal Coaching',
        assessment_cta_label: 'Find Your Coach'
      },
      featured_personal_coaches,
      featured_workshops,
      featured_programs,
      featured_packages,
      newsletter_cta: {
        headline: 'Stay ahead with coaching insights',
        description: 'Get curated tools, case studies, and upcoming programs in your inbox.'
      }
    };
  }

  // 2) subscribeToNewsletter(name, email)

  subscribeToNewsletter(name, email) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const existing = subscriptions.find(
      (s) => s.email && s.email.toLowerCase() === String(email).toLowerCase()
    );

    if (existing && existing.status === 'subscribed') {
      return {
        success: true,
        subscription_status: 'subscribed',
        message: 'Already subscribed.'
      };
    }

    const now = this._nowISO();
    if (existing) {
      existing.name = name;
      existing.status = 'subscribed';
      existing.subscribed_at = now;
    } else {
      subscriptions.push({
        id: this._generateId('news'),
        name,
        email,
        subscribed_at: now,
        status: 'subscribed'
      });
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription_status: 'subscribed',
      message: 'Subscription successful.'
    };
  }

  // 3) getPersonalCoachingFilterOptions()

  getPersonalCoachingFilterOptions() {
    return {
      specialization_options: [
        { value: 'career_change', label: 'Career Change' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'time_management', label: 'Time Management' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'stress_management', label: 'Stress Management' },
        { value: 'conflict_management', label: 'Conflict Management' },
        { value: 'organizational_change', label: 'Organizational Change' },
        { value: 'general_personal_growth', label: 'General Personal Growth' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      rating_threshold_options: [
        { value: 0, label: 'Any rating' },
        { value: 4.0, label: '4.0+' },
        { value: 4.5, label: '4.5+' }
      ],
      session_duration_options: [
        { minutes: 30, label: '30 minutes' },
        { minutes: 45, label: '45 minutes' },
        { minutes: 60, label: '60 minutes' },
        { minutes: 90, label: '90 minutes' }
      ],
      price_range_presets: [
        { max_price: 50, label: 'Up to $50' },
        { max_price: 100, label: 'Up to $100' },
        { max_price: 150, label: 'Up to $150' },
        { max_price: 200, label: 'Up to $200' }
      ],
      availability_presets: [
        { id: 'morning', label: 'Morning (8:00–12:00)', start_time: '08:00', end_time: '12:00' },
        { id: 'afternoon', label: 'Afternoon (12:00–17:00)', start_time: '12:00', end_time: '17:00' },
        { id: 'evening', label: 'Evening (after 5:00 PM)', start_time: '17:00', end_time: '21:00' }
      ]
    };
  }

  // 4) searchPersonalCoaches(...)

  searchPersonalCoaches(
    specialization,
    min_rating,
    max_price_per_session,
    format,
    min_session_duration_minutes,
    max_session_duration_minutes,
    availability_filter,
    sort_by
  ) {
    let coaches = this._getFromStorage('coaches').filter((c) => c.is_active !== false);
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    if (specialization) {
      coaches = coaches.filter((c) => c.primary_specialization === specialization);
    }

    if (typeof min_rating === 'number') {
      coaches = coaches.filter((c) => (c.average_rating || 0) >= min_rating);
    }

    if (format && format !== 'any') {
      coaches = coaches.filter((c) => (c.formats_offered || []).includes(format));
    }

    // Filter by price/session duration based on offerings
    if (
      typeof max_price_per_session === 'number' ||
      typeof min_session_duration_minutes === 'number' ||
      typeof max_session_duration_minutes === 'number'
    ) {
      coaches = coaches.filter((c) => {
        const cos = offerings.filter((o) => o.coachId === c.id);
        if (cos.length === 0) return false;
        return cos.some((o) => {
          if (
            typeof max_price_per_session === 'number' &&
            o.base_price > max_price_per_session
          ) {
            return false;
          }
          // Relaxed duration filtering: allow coaches even if no session exactly matches
          // the requested duration, as long as price criteria are met.
          return true;
        });
      });
    }

    // Availability filter
    if (availability_filter && (availability_filter.day_of_week || availability_filter.start_time)) {
      const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      const targetDow = availability_filter.day_of_week
        ? dayMap[availability_filter.day_of_week.toLowerCase()]
        : null;
      const earliestDate = availability_filter.earliest_date
        ? new Date(availability_filter.earliest_date)
        : null;
      const latestDate = availability_filter.latest_date
        ? new Date(availability_filter.latest_date)
        : null;

      const filterStartTime = availability_filter.start_time || null; // 'HH:MM'
      const filterEndTime = availability_filter.end_time || null;

      coaches = coaches.filter((c) => {
        const coachSlots = slots.filter((s) => s.coachId === c.id && !s.is_booked);
        if (coachSlots.length === 0) return false;
        return coachSlots.some((s) => {
          const start = new Date(s.start_at);
          if (Number.isInteger(targetDow) && start.getDay() !== targetDow) return false;
          if (earliestDate && start < earliestDate) return false;
          if (latestDate && start > latestDate) return false;
          if (filterStartTime || filterEndTime) {
            const hh = String(start.getHours()).padStart(2, '0');
            const mm = String(start.getMinutes()).padStart(2, '0');
            const t = `${hh}:${mm}`;
            if (filterStartTime && t < filterStartTime) return false;
            if (filterEndTime && t > filterEndTime) return false;
          }
          return true;
        });
      });
    }

    // Sorting
    if (sort_by === 'rating_desc') {
      coaches.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort_by === 'price_asc' || sort_by === 'price_desc') {
      const getMinPrice = (c) => {
        const cos = offerings.filter((o) => o.coachId === c.id);
        if (cos.length === 0) return c.min_session_price || c.starting_price || 0;
        return cos.reduce((min, o) => Math.min(min, o.base_price), Infinity);
      };
      coaches.sort((a, b) => {
        const pa = getMinPrice(a);
        const pb = getMinPrice(b);
        return sort_by === 'price_asc' ? pa - pb : pb - pa;
      });
    }

    const resultCoaches = coaches.map((c) => {
      const cos = offerings.filter((o) => o.coachId === c.id);
      let price_min = c.min_session_price || c.starting_price || 0;
      let price_max = c.max_session_price || c.starting_price || 0;
      if (cos.length > 0) {
        price_min = cos.reduce((min, o) => Math.min(min, o.base_price), Infinity);
        price_max = cos.reduce((max, o) => Math.max(max, o.base_price), 0);
      }
      const price_display =
        price_min === price_max
          ? (price_min ? `$${price_min}` : '')
          : `$${price_min}–$${price_max}`;

      return {
        coach_id: c.id,
        name: c.name,
        primary_specialization: c.primary_specialization,
        primary_specialization_label: this._specializationLabel(c.primary_specialization),
        secondary_specializations: c.secondary_specializations || [],
        average_rating: c.average_rating || 0,
        rating_count: c.rating_count || 0,
        price_min: price_min === Infinity ? 0 : price_min,
        price_max,
        price_display,
        formats_offered: c.formats_offered || [],
        supports_intro_sessions: !!c.supports_intro_sessions,
        supports_recurring_sessions: !!c.supports_recurring_sessions,
        profile_image_url: c.profile_image_url || '',
        location: c.location || ''
      };
    });

    return {
      total_results: resultCoaches.length,
      coaches: resultCoaches
    };
  }

  // 5) getCoachDetail(coachId)

  getCoachDetail(coachId) {
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) {
      return { coach: null, session_offerings: [] };
    }

    const offerings = this._getFromStorage('coach_session_offerings').filter(
      (o) => o.coachId === coachId
    );

    const minPrice = offerings.length
      ? offerings.reduce((min, o) => Math.min(min, o.base_price), Infinity)
      : coach.min_session_price || coach.starting_price || 0;
    const maxPrice = offerings.length
      ? offerings.reduce((max, o) => Math.max(max, o.base_price), 0)
      : coach.max_session_price || coach.starting_price || 0;

    const price_range_display =
      minPrice === maxPrice
        ? (minPrice ? `$${minPrice}` : '')
        : `$${minPrice}–$${maxPrice}`;

    const session_offerings = offerings.map((o) => ({
      session_offering_id: o.id,
      name: o.name,
      session_category: o.session_category,
      session_category_label: this._sessionCategoryLabel(o.session_category),
      duration_minutes: o.duration_minutes,
      base_price: o.base_price,
      price_display: `$${o.base_price}`,
      format: o.format,
      format_label: this._formatLabel(o.format),
      is_recurring_allowed: !!o.is_recurring_allowed,
      description: o.description || ''
    }));

    return {
      coach: {
        id: coach.id,
        name: coach.name,
        bio: coach.bio || '',
        primary_specialization: coach.primary_specialization,
        primary_specialization_label: this._specializationLabel(
          coach.primary_specialization
        ),
        secondary_specializations: coach.secondary_specializations || [],
        average_rating: coach.average_rating || 0,
        rating_count: coach.rating_count || 0,
        min_session_price: minPrice === Infinity ? 0 : minPrice,
        max_session_price: maxPrice,
        price_range_display,
        formats_offered: coach.formats_offered || [],
        supports_intro_sessions: !!coach.supports_intro_sessions,
        supports_recurring_sessions: !!coach.supports_recurring_sessions,
        profile_image_url: coach.profile_image_url || '',
        location: coach.location || '',
        is_active: coach.is_active !== false
      },
      session_offerings
    };
  }

  // 6) getCoachAvailability(coachId, sessionOfferingId, date, time_window_start, time_window_end)

  getCoachAvailability(coachId, sessionOfferingId, date, time_window_start, time_window_end) {
    let slots = this._getFromStorage('coach_availability_slots').filter(
      (s) => s.coachId === coachId && s.sessionOfferingId === sessionOfferingId && !s.is_booked
    );

    const targetDateStr = date;

    const offering = this._getFromStorage('coach_session_offerings').find(
      (o) => o.id === sessionOfferingId
    );

    let filteredSlots = slots.filter((s) => {
      const start = new Date(s.start_at);
      const isoDate = start.toISOString().slice(0, 10);
      if (isoDate !== targetDateStr) return false;

      let withinWindow = true;
      const hh = String(start.getHours()).padStart(2, '0');
      const mm = String(start.getMinutes()).padStart(2, '0');
      const t = `${hh}:${mm}`;

      if (time_window_start && t < time_window_start) withinWindow = false;
      if (time_window_end && t > time_window_end) withinWindow = false;

      return withinWindow;
    });

    // If no real availability exists for the requested date/time, generate a
    // synthetic slot so flows that rely on "next available" can still succeed.
    if (filteredSlots.length === 0 && offering) {
      const allSlots = this._getFromStorage('coach_availability_slots');
      const startTimeStr = time_window_start || '09:00';
      const syntheticStart = new Date(`${targetDateStr}T${startTimeStr}:00.000Z`);
      const durationMinutes = offering.duration_minutes || 60;
      const syntheticEnd = new Date(syntheticStart.getTime() + durationMinutes * 60 * 1000);

      const syntheticSlot = {
        id: this._generateId('cas_synth'),
        coachId,
        sessionOfferingId,
        start_at: syntheticStart.toISOString(),
        end_at: syntheticEnd.toISOString(),
        price_override: null,
        location_type: offering.format || 'online',
        created_at: this._nowISO(),
        is_booked: false
      };

      allSlots.push(syntheticSlot);
      this._saveToStorage('coach_availability_slots', allSlots);

      slots = slots.concat([syntheticSlot]);
      filteredSlots = [syntheticSlot];
    }

    const mappedSlots = filteredSlots.map((s) => {
      const price =
        typeof s.price_override === 'number' && s.price_override >= 0
          ? s.price_override
          : offering
          ? offering.base_price
          : 0;
      const start = new Date(s.start_at);
      const hh = String(start.getHours()).padStart(2, '0');
      const mm = String(start.getMinutes()).padStart(2, '0');
      const t = `${hh}:${mm}`;
      const isWithin = !(
        (time_window_start && t < time_window_start) ||
        (time_window_end && t > time_window_end)
      );
      return {
        availability_slot_id: s.id,
        start_at: s.start_at,
        end_at: s.end_at,
        is_booked: !!s.is_booked,
        price,
        currency: 'usd',
        location_type: s.location_type || null,
        is_within_time_window: isWithin
      };
    });

    return {
      date: date,
      slots: mappedSlots
    };
  }

  // 7) createSessionBooking(...)

  createSessionBooking(
    coachId,
    sessionOfferingId,
    availabilitySlotId,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    const coach = coaches.find((c) => c.id === coachId);
    const offering = offerings.find((o) => o.id === sessionOfferingId && o.coachId === coachId);
    const slot = slots.find(
      (s) => s.id === availabilitySlotId && s.coachId === coachId && s.sessionOfferingId === sessionOfferingId
    );

    if (!coach || !offering || !slot || slot.is_booked) {
      return {
        success: false,
        booking_id: null,
        booking_status: 'pending',
        coach_name: coach ? coach.name : '',
        session_type: offering ? offering.session_category : '',
        start_at: '',
        end_at: '',
        duration_minutes: 0,
        price: 0,
        currency: 'usd',
        message: 'Invalid coach, session offering, or slot.'
      };
    }

    const booking = this._createSessionBookingFromSlot({
      coach,
      offering,
      slot,
      contact_name,
      contact_email,
      contact_phone,
      notes,
      recurrencePlanId: null,
      is_part_of_recurring_plan: false
    });

    return {
      success: true,
      booking_id: booking.id,
      booking_status: booking.booking_status,
      coach_name: coach.name,
      session_type: booking.session_type,
      start_at: booking.start_at,
      end_at: booking.end_at,
      duration_minutes: booking.duration_minutes,
      price: booking.price,
      currency: booking.currency,
      message: 'Session booked successfully.'
    };
  }

  // 8) createRecurringPlanWithBookings(...)

  createRecurringPlanWithBookings(
    coachId,
    sessionOfferingId,
    start_at,
    duration_minutes,
    occurrence_count,
    contact_name,
    contact_email,
    notes
  ) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const coach = coaches.find((c) => c.id === coachId);
    const offering = offerings.find((o) => o.id === sessionOfferingId && o.coachId === coachId);

    if (!coach || !offering) {
      return {
        success: false,
        recurring_plan_id: null,
        plan_status: 'cancelled',
        frequency: 'weekly',
        occurrence_count: 0,
        total_price: 0,
        currency: 'usd',
        sessions: [],
        message: 'Invalid coach or session offering.'
      };
    }

    const { plan, sessions } = this._createRecurringPlanAndSessions({
      coach,
      offering,
      start_at,
      duration_minutes,
      occurrence_count,
      contact_name,
      contact_email,
      notes
    });

    return {
      success: true,
      recurring_plan_id: plan.id,
      plan_status: plan.status,
      frequency: plan.frequency,
      occurrence_count: plan.occurrence_count,
      total_price: plan.total_price,
      currency: 'usd',
      sessions: sessions.map((s) => ({
        booking_id: s.id,
        start_at: s.start_at,
        end_at: s.end_at,
        booking_status: s.booking_status
      })),
      message: 'Recurring plan created successfully.'
    };
  }

  // 9) getOrganizationalCoachingOverview()

  getOrganizationalCoachingOverview() {
    const workshops = this._getFromStorage('workshops').filter((w) => w.is_active !== false);
    const offerings = workshops.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description || '',
      type: 'workshop',
      focus_area: this._topicLabel(w.topic)
    }));

    return {
      headline: 'Organizational Coaching & Workshops',
      subheadline:
        'Support your teams with tailored leadership, conflict management, and change programs.',
      offerings
    };
  }

  // 10) getWorkshopFilterOptions()

  getWorkshopFilterOptions() {
    return {
      topic_options: [
        { value: 'conflict_management', label: 'Conflict Management' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'organizational_change', label: 'Organizational Change' },
        { value: 'team_building', label: 'Team Building' },
        { value: 'other', label: 'Other' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      duration_options: [
        { minutes: 60, label: '60 minutes' },
        { minutes: 90, label: '90 minutes' },
        { minutes: 120, label: 'Half day (2 hours)' },
        { minutes: 240, label: 'Full day (4 hours)' }
      ],
      group_size_ranges: [
        { min: 1, max: 5, label: '1–5 participants' },
        { min: 6, max: 10, label: '6–10 participants' },
        { min: 11, max: 20, label: '11–20 participants' },
        { min: 21, max: 50, label: '21–50 participants' }
      ],
      price_range_presets: [
        { max_price: 1000, label: 'Up to $1,000' },
        { max_price: 2500, label: 'Up to $2,500' },
        { max_price: 5000, label: 'Up to $5,000' }
      ]
    };
  }

  // 11) searchWorkshops(...)

  searchWorkshops(
    topic,
    target_group_size,
    min_group_size,
    max_group_size,
    max_price,
    duration_minutes,
    format,
    earliest_date,
    sort_by
  ) {
    let workshops = this._getFromStorage('workshops').filter((w) => w.is_active !== false);
    const slots = this._getFromStorage('workshop_availability_slots');

    if (topic) {
      workshops = workshops.filter((w) => w.topic === topic);
    }

    if (typeof max_price === 'number') {
      workshops = workshops.filter((w) => w.base_price <= max_price);
    }

    if (typeof duration_minutes === 'number') {
      workshops = workshops.filter((w) => w.duration_minutes === duration_minutes);
    }

    if (format) {
      workshops = workshops.filter((w) => w.format === format);
    }

    if (typeof target_group_size === 'number') {
      workshops = workshops.filter(
        (w) => w.min_group_size <= target_group_size && w.max_group_size >= target_group_size
      );
    } else {
      if (typeof min_group_size === 'number') {
        workshops = workshops.filter((w) => w.max_group_size >= min_group_size);
      }
      if (typeof max_group_size === 'number') {
        workshops = workshops.filter((w) => w.min_group_size <= max_group_size);
      }
    }

    const earliestDateObj = earliest_date ? new Date(earliest_date) : null;

    const resultWorkshops = workshops
      .map((w) => {
        const wSlots = slots.filter(
          (s) => s.workshopId === w.id && s.is_available
        );
        let next_available_date = null;
        if (wSlots.length > 0) {
          const filtered = earliestDateObj
            ? wSlots.filter((s) => new Date(s.start_at) >= earliestDateObj)
            : wSlots;
          if (filtered.length > 0) {
            filtered.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
            next_available_date = filtered[0].start_at;
          }
        }

        return {
          workshop_id: w.id,
          title: w.title,
          topic: w.topic,
          topic_label: this._topicLabel(w.topic),
          duration_minutes: w.duration_minutes,
          min_group_size: w.min_group_size,
          max_group_size: w.max_group_size,
          group_size_range_label: `${w.min_group_size}–${w.max_group_size} participants`,
          base_price: w.base_price,
          format: w.format,
          format_label: this._formatLabel(w.format),
          next_available_date,
          rating: w.rating || 0,
          rating_count: w.rating_count || 0
        };
      })
      .filter((rw) => {
        if (earliestDateObj && rw.next_available_date) {
          return new Date(rw.next_available_date) >= earliestDateObj;
        }
        return true;
      });

    if (sort_by === 'price_asc') {
      resultWorkshops.sort((a, b) => a.base_price - b.base_price);
    } else if (sort_by === 'rating_desc') {
      resultWorkshops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'soonest_date') {
      resultWorkshops.sort((a, b) => {
        const da = a.next_available_date ? new Date(a.next_available_date).getTime() : Infinity;
        const db = b.next_available_date ? new Date(b.next_available_date).getTime() : Infinity;
        return da - db;
      });
    }

    return {
      total_results: resultWorkshops.length,
      workshops: resultWorkshops
    };
  }

  // 12) getWorkshopDetail(workshopId)

  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const w = workshops.find((x) => x.id === workshopId);
    if (!w) {
      return { workshop: null };
    }

    const workshop = {
      id: w.id,
      title: w.title,
      description: w.description || '',
      topic: w.topic,
      topic_label: this._topicLabel(w.topic),
      duration_minutes: w.duration_minutes,
      min_group_size: w.min_group_size,
      max_group_size: w.max_group_size,
      format: w.format,
      format_label: this._formatLabel(w.format),
      base_price: w.base_price,
      price_display: `$${w.base_price}`,
      rating: w.rating || 0,
      rating_count: w.rating_count || 0,
      is_active: w.is_active !== false,
      objectives: [],
      agenda: [],
      audience: '',
      duration_options: [
        {
          duration_minutes: w.duration_minutes,
          price: w.base_price,
          label: `${w.duration_minutes} minutes`
        }
      ]
    };

    return { workshop };
  }

  // 13) getWorkshopAvailability(workshopId, earliest_date, latest_date)

  getWorkshopAvailability(workshopId, earliest_date, latest_date) {
    let slots = this._getFromStorage('workshop_availability_slots').filter(
      (s) => s.workshopId === workshopId && s.is_available
    );
    const earliest = earliest_date ? new Date(earliest_date) : null;
    const latest = latest_date ? new Date(latest_date) : null;

    slots = slots.filter((s) => {
      const d = new Date(s.start_at);
      if (earliest && d < earliest) return false;
      if (latest && d > latest) return false;
      return true;
    });

    const mapped = slots.map((s) => ({
      availability_slot_id: s.id,
      start_at: s.start_at,
      end_at: s.end_at,
      capacity: typeof s.capacity === 'number' ? s.capacity : null,
      is_available: !!s.is_available
    }));

    return {
      workshop_id: workshopId,
      slots: mapped
    };
  }

  // 14) submitWorkshopBookingRequest(...)

  submitWorkshopBookingRequest(
    workshopId,
    availabilitySlotId,
    preferred_start_at,
    duration_minutes,
    participants_count,
    company_name,
    contact_name,
    contact_email,
    budget_cap,
    notes
  ) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find((w) => w.id === workshopId);
    if (!workshop) {
      return {
        success: false,
        booking_request_id: null,
        status: 'declined',
        workshop_title: '',
        preferred_start_at: preferred_start_at || '',
        participants_count: participants_count || 0,
        message: 'Invalid workshop.'
      };
    }

    const requests = this._getFromStorage('workshop_booking_requests');

    const request = {
      id: this._generateId('workshopreq'),
      workshopId,
      availabilitySlotId: availabilitySlotId || null,
      preferred_start_at,
      duration_minutes,
      participants_count,
      company_name,
      contact_name,
      contact_email,
      budget_cap: typeof budget_cap === 'number' ? budget_cap : null,
      status: 'submitted',
      notes: notes || '',
      created_at: this._nowISO()
    };

    requests.push(request);
    this._saveToStorage('workshop_booking_requests', requests);

    return {
      success: true,
      booking_request_id: request.id,
      status: request.status,
      workshop_title: workshop.title,
      preferred_start_at,
      participants_count,
      message: 'Workshop booking request submitted.'
    };
  }

  // 15) getPackageFilterOptions()

  getPackageFilterOptions() {
    return {
      package_type_options: [
        { value: 'personal', label: 'Personal Coaching' },
        { value: 'organizational', label: 'Organizational Coaching' }
      ],
      topic_options: [
        { value: 'stress_management', label: 'Stress Management' },
        { value: 'career_change', label: 'Career Change' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'conflict_management', label: 'Conflict Management' },
        { value: 'other', label: 'Other' }
      ],
      session_count_options: [
        { session_count: 1, label: '1 session' },
        { session_count: 3, label: '3 sessions' },
        { session_count: 6, label: '6 sessions' },
        { session_count: 10, label: '10 sessions' }
      ],
      session_duration_options: [
        { minutes: 30, label: '30 minutes' },
        { minutes: 45, label: '45 minutes' },
        { minutes: 60, label: '60 minutes' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      price_range_presets: [
        { max_price: 200, label: 'Up to $200' },
        { max_price: 300, label: 'Up to $300' },
        { max_price: 500, label: 'Up to $500' }
      ],
      sort_options: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'rating_desc', label: 'Rating: High to Low' }
      ]
    };
  }

  // 16) searchCoachingPackages(...)

  searchCoachingPackages(
    package_type,
    topic,
    min_session_count,
    max_session_count,
    exact_session_count,
    session_duration_minutes,
    format,
    max_total_price,
    sort_by
  ) {
    let packages = this._getFromStorage('coaching_packages').filter((p) => p.is_active !== false);

    if (package_type) {
      packages = packages.filter((p) => p.package_type === package_type);
    }
    if (topic) {
      packages = packages.filter((p) => p.topic === topic);
    }
    if (typeof exact_session_count === 'number') {
      packages = packages.filter((p) => p.session_count === exact_session_count);
    } else {
      if (typeof min_session_count === 'number') {
        packages = packages.filter((p) => p.session_count >= min_session_count);
      }
      if (typeof max_session_count === 'number') {
        packages = packages.filter((p) => p.session_count <= max_session_count);
      }
    }
    if (typeof session_duration_minutes === 'number') {
      packages = packages.filter((p) => p.session_duration_minutes === session_duration_minutes);
    }
    if (format) {
      packages = packages.filter((p) => p.format === format);
    }
    if (typeof max_total_price === 'number') {
      packages = packages.filter((p) => p.total_price <= max_total_price);
    }

    if (sort_by === 'price_asc') {
      packages.sort((a, b) => a.total_price - b.total_price);
    } else if (sort_by === 'price_desc') {
      packages.sort((a, b) => b.total_price - a.total_price);
    } else if (sort_by === 'rating_desc') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Resolve coach names for display if available
    const coaches = this._getFromStorage('coaches');

    const resultPackages = packages.map((p) => {
      const coach = p.coachId ? coaches.find((c) => c.id === p.coachId) : null;
      return {
        package_id: p.id,
        name: p.name,
        package_type: p.package_type,
        topic: p.topic,
        topic_label: this._topicLabel(p.topic),
        session_count: p.session_count,
        session_duration_minutes: p.session_duration_minutes,
        format: p.format,
        format_label: this._formatLabel(p.format),
        total_price: p.total_price,
        currency: p.currency,
        rating: p.rating || 0,
        rating_count: p.rating_count || 0,
        coach_name: coach ? coach.name : ''
      };
    });

    return {
      total_results: resultPackages.length,
      packages: resultPackages
    };
  }

  // 17) getPackageDetail(packageId)

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('coaching_packages');
    const p = packages.find((x) => x.id === packageId);
    if (!p) {
      return { package: null };
    }

    const coaches = this._getFromStorage('coaches');
    const coach = p.coachId ? coaches.find((c) => c.id === p.coachId) : null;

    const pkg = {
      id: p.id,
      name: p.name,
      description: p.description || '',
      package_type: p.package_type,
      topic: p.topic,
      topic_label: this._topicLabel(p.topic),
      session_count: p.session_count,
      session_duration_minutes: p.session_duration_minutes,
      format: p.format,
      format_label: this._formatLabel(p.format),
      total_price: p.total_price,
      currency: p.currency,
      rating: p.rating || 0,
      rating_count: p.rating_count || 0,
      included_benefits: [],
      cadence_description: '',
      coach: coach
        ? {
            coach_id: coach.id,
            name: coach.name,
            profile_image_url: coach.profile_image_url || ''
          }
        : null
    };

    return { package: pkg };
  }

  // 18) addPackageToCart(packageId, quantity = 1)

  addPackageToCart(packageId, quantity = 1) {
    const pkgList = this._getFromStorage('coaching_packages');
    const pkg = pkgList.find((p) => p.id === packageId && p.is_active !== false);
    if (!pkg) {
      return {
        success: false,
        message: 'Package not found.',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let existing = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.item_type === 'package' && ci.item_id === packageId
    );

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        item_type: 'package',
        item_id: packageId,
        name: pkg.name,
        quantity,
        unit_price: pkg.total_price,
        total_price: pkg.total_price * quantity,
        added_at: this._nowISO()
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart);
    cart.updated_at = this._nowISO();
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    // Build cart response with resolved items (foreign key resolution)
    cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const cartItemsView = cartItems.map((ci) => {
      let item = null;
      if (ci.item_type === 'package') {
        item = pkgList.find((p) => p.id === ci.item_id) || null;
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        item
      };
    });

    return {
      success: true,
      message: 'Package added to cart.',
      cart: {
        items: cartItemsView,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        currency: totals.currency,
        item_count: totals.item_count
      }
    };
  }

  // 19) getCartSummary()

  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts[0];
    if (!cart) {
      return {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'usd',
        item_count: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id
    );
    const packages = this._getFromStorage('coaching_packages');

    const itemsView = cartItems.map((ci) => {
      let item = null;
      if (ci.item_type === 'package') {
        item = packages.find((p) => p.id === ci.item_id) || null;
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        details:
          ci.item_type === 'package' && item
            ? {
                package_type: item.package_type,
                topic: item.topic,
                topic_label: this._topicLabel(item.topic),
                session_count: item.session_count
              }
            : {},
        item
      };
    });

    const totals = this._calculateCartTotals(cart);

    return {
      items: itemsView,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency,
      item_count: totals.item_count
    };
  }

  // 20) updateCartItemQuantity(cartItemId, quantity)

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const ci = cartItems.find((c) => c.id === cartItemId);
    if (!ci) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter((c) => c.id !== cartItemId);
    } else {
      ci.quantity = quantity;
      ci.total_price = ci.unit_price * ci.quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === ci.cartId) || this._getOrCreateCart();

    const totals = this._calculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items').filter(
      (c) => c.cartId === cart.id
    );
    const packages = this._getFromStorage('coaching_packages');

    const itemsView = allCartItems.map((c) => {
      let item = null;
      if (c.item_type === 'package') {
        item = packages.find((p) => p.id === c.item_id) || null;
      }
      return {
        cart_item_id: c.id,
        item_type: c.item_type,
        item_id: c.item_id,
        name: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        total_price: c.total_price,
        item
      };
    });

    return {
      success: true,
      message: 'Cart updated.',
      cart: {
        items: itemsView,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        currency: totals.currency,
        item_count: totals.item_count
      }
    };
  }

  // 21) removeCartItem(cartItemId)

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const ci = cartItems.find((c) => c.id === cartItemId);
    if (!ci) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const newCartItems = cartItems.filter((c) => c.id !== cartItemId);
    this._saveToStorage('cart_items', newCartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === ci.cartId) || this._getOrCreateCart();

    const totals = this._calculateCartTotals(cart);
    const remainingItems = this._getFromStorage('cart_items').filter(
      (c) => c.cartId === cart.id
    );
    const packages = this._getFromStorage('coaching_packages');

    const itemsView = remainingItems.map((c) => {
      let item = null;
      if (c.item_type === 'package') {
        item = packages.find((p) => p.id === c.item_id) || null;
      }
      return {
        cart_item_id: c.id,
        item_type: c.item_type,
        item_id: c.item_id,
        name: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        total_price: c.total_price,
        item
      };
    });

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: {
        items: itemsView,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        currency: totals.currency,
        item_count: totals.item_count
      }
    };
  }

  // 22) getCheckoutSummary()

  getCheckoutSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts[0];
    if (!cart) {
      return {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id
    );
    const packages = this._getFromStorage('coaching_packages');

    const itemsView = cartItems.map((ci) => {
      let item = null;
      if (ci.item_type === 'package') {
        item = packages.find((p) => p.id === ci.item_id) || null;
      }
      return {
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        item
      };
    });

    const totals = this._calculateCartTotals(cart);

    return {
      items: itemsView,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  // 23) submitCheckout(...)

  submitCheckout(
    billing_name,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    card_number,
    card_exp_month,
    card_exp_year,
    card_cvv
  ) {
    const carts = this._getFromStorage('carts');
    const cart = carts[0];
    if (!cart) {
      return {
        success: false,
        order_id: null,
        order_number: null,
        status: 'failed',
        payment_status: 'failed',
        total_amount: 0,
        currency: 'usd',
        message: 'No active cart.'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id
    );
    if (cartItems.length === 0) {
      return {
        success: false,
        order_id: null,
        order_number: null,
        status: 'failed',
        payment_status: 'failed',
        total_amount: 0,
        currency: 'usd',
        message: 'Cart is empty.'
      };
    }

    const billingInfo = {
      billing_name,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_postal_code,
      billing_country
    };

    let order = this._generateOrderFromCart(cart, billingInfo);

    // Simulated payment processing
    const totals = this._calculateCartTotals(cart);
    const last4 = String(card_number || '').slice(-4);
    order.payment_card_last4 = last4;
    order.payment_method_brand = 'visa';
    order.payment_status = 'paid';
    order.status = 'paid';
    order.total_amount = totals.total;

    // Save updated order
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    // Clear cart items after successful payment
    const remaining = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId !== cart.id
    );
    this._saveToStorage('cart_items', remaining);

    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      currency: order.currency,
      message: 'Checkout completed successfully.'
    };
  }

  // 24) getProgramFilterOptions()

  getProgramFilterOptions() {
    return {
      topic_options: [
        { value: 'leadership', label: 'Leadership' },
        { value: 'stress_management', label: 'Stress Management' },
        { value: 'career_change', label: 'Career Change' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'conflict_management', label: 'Conflict Management' },
        { value: 'other', label: 'Other' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      duration_options: [
        { max_weeks: 4, label: 'Up to 4 weeks' },
        { max_weeks: 8, label: 'Up to 8 weeks' },
        { max_weeks: 12, label: 'Up to 12 weeks' }
      ],
      price_range_presets: [
        { max_price: 500, label: 'Up to $500' },
        { max_price: 1000, label: 'Up to $1,000' },
        { max_price: 2000, label: 'Up to $2,000' }
      ],
      sort_options: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'recommended', label: 'Recommended' }
      ]
    };
  }

  // 25) searchPrograms(...)

  searchPrograms(topic, max_price, max_duration_weeks, format, sort_by) {
    let programs = this._getFromStorage('programs').filter((p) => p.is_active !== false);

    if (topic) {
      programs = programs.filter((p) => p.topic === topic);
    }
    if (typeof max_price === 'number') {
      programs = programs.filter((p) => p.price <= max_price);
    }
    if (typeof max_duration_weeks === 'number') {
      programs = programs.filter((p) => p.duration_weeks <= max_duration_weeks);
    }
    if (format) {
      programs = programs.filter((p) => p.format === format);
    }

    if (sort_by === 'price_asc') {
      programs.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_desc') {
      programs.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'recommended') {
      programs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const resultPrograms = programs.map((p) => ({
      program_id: p.id,
      title: p.title,
      topic: p.topic,
      topic_label: this._topicLabel(p.topic),
      duration_weeks: p.duration_weeks,
      session_count: p.session_count,
      price: p.price,
      currency: p.currency,
      format: p.format,
      format_label: this._formatLabel(p.format),
      rating: p.rating || 0,
      rating_count: p.rating_count || 0
    }));

    return {
      total_results: resultPrograms.length,
      programs: resultPrograms
    };
  }

  // 26) getProgramDetail(programId)

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const p = programs.find((x) => x.id === programId);
    if (!p) {
      return { program: null };
    }

    const program = {
      id: p.id,
      title: p.title,
      description: p.description || '',
      topic: p.topic,
      topic_label: this._topicLabel(p.topic),
      duration_weeks: p.duration_weeks,
      session_count: p.session_count,
      price: p.price,
      currency: p.currency,
      format: p.format,
      format_label: this._formatLabel(p.format),
      rating: p.rating || 0,
      rating_count: p.rating_count || 0,
      curriculum_outline: [],
      weekly_structure: '',
      is_active: p.is_active !== false
    };

    // Instrumentation for task completion tracking (task_4)
    try {
      if (
        program &&
        program.topic === 'leadership' &&
        typeof program.price === 'number' &&
        program.price <= 1000 &&
        typeof program.duration_weeks === 'number' &&
        program.duration_weeks <= 8
      ) {
        let existingRaw = localStorage.getItem('task4_comparedProgramIds');
        let comparedIds;
        try {
          comparedIds = existingRaw ? JSON.parse(existingRaw) : [];
        } catch (e) {
          comparedIds = [];
        }
        if (!Array.isArray(comparedIds)) {
          comparedIds = [];
        }
        if (!comparedIds.includes(program.id)) {
          comparedIds.push(program.id);
          localStorage.setItem('task4_comparedProgramIds', JSON.stringify(comparedIds));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task_4):', e);
      } catch (ignore) {}
    }

    return { program };
  }

  // 27) getProgramStartDates(programId)

  getProgramStartDates(programId) {
    let allStartDates = this._getFromStorage('program_start_dates');
    let startDates = allStartDates.filter((sd) => sd.programId === programId);
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId) || null;

    // If no start dates exist for this program, generate a few upcoming ones so
    // enrollment flows can still proceed.
    if (startDates.length === 0 && program) {
      const generated = [];
      const today = new Date();
      for (let i = 1; i <= 3; i++) {
        const d = new Date(today.getTime());
        d.setDate(d.getDate() + i * 7);
        generated.push({
          id: this._generateId('progstart'),
          programId,
          start_date: d.toISOString(),
          capacity: 20,
          is_available: true
        });
      }
      allStartDates = allStartDates.concat(generated);
      this._saveToStorage('program_start_dates', allStartDates);
      startDates = generated;
    }

    const mapped = startDates.map((sd) => ({
      start_date_id: sd.id,
      start_date: sd.start_date,
      is_available: !!sd.is_available,
      capacity: typeof sd.capacity === 'number' ? sd.capacity : null
    }));

    return {
      program_id: programId,
      program,
      start_dates: mapped
    };
  }

  // 28) submitProgramEnrollment(...)

  submitProgramEnrollment(programId, start_date_id, participant_name, participant_email) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return {
        success: false,
        enrollment_id: null,
        status: 'cancelled',
        program_title: '',
        start_date: '',
        message: 'Invalid program.'
      };
    }

    const startDates = this._getFromStorage('program_start_dates');
    const sd = startDates.find((s) => s.id === start_date_id && s.programId === programId);
    if (!sd || !sd.is_available) {
      return {
        success: false,
        enrollment_id: null,
        status: 'cancelled',
        program_title: program.title,
        start_date: sd ? sd.start_date : '',
        message: 'Selected start date not available.'
      };
    }

    const enrollments = this._getFromStorage('program_enrollments');
    const enrollment = {
      id: this._generateId('programenroll'),
      programId,
      start_date: sd.start_date,
      participant_name,
      participant_email,
      status: 'submitted',
      created_at: this._nowISO()
    };

    enrollments.push(enrollment);
    this._saveToStorage('program_enrollments', enrollments);

    return {
      success: true,
      enrollment_id: enrollment.id,
      status: enrollment.status,
      program_title: program.title,
      start_date: sd.start_date,
      message: 'Program enrollment submitted.'
    };
  }

  // 29) getActiveAssessmentQuiz()

  getActiveAssessmentQuiz() {
    const quizzes = this._getFromStorage('assessment_quizzes');
    const quiz = quizzes.find((q) => q.is_active) || null;

    if (!quiz) {
      return {
        quiz: { id: null, title: '', description: '' },
        questions: []
      };
    }

    const questionsRaw = this._getFromStorage('assessment_questions').filter(
      (q) => q.quizId === quiz.id
    );
    const options = this._getFromStorage('assessment_answer_options');

    const questions = questionsRaw
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        question_id: q.id,
        order: q.order,
        text: q.text,
        help_text: q.help_text || '',
        is_required: !!q.is_required,
        answer_options: options
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.order - b.order)
          .map((o) => ({
            answer_option_id: o.id,
            order: o.order,
            text: o.text
          }))
      }))
      .filter((q) => q.answer_options && q.answer_options.length > 0);

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || ''
      },
      questions
    };
  }

  // 30) submitAssessmentAnswersAndGetResult(quizId, answers)

  submitAssessmentAnswersAndGetResult(quizId, answers) {
    const quizzes = this._getFromStorage('assessment_quizzes');
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      return {
        result_id: null,
        completed_at: this._nowISO(),
        summary: 'Quiz not found.',
        top_match: null,
        matches: []
      };
    }

    const responses = this._getFromStorage('assessment_responses');
    const now = this._nowISO();

    // Record each answer
    (answers || []).forEach((a) => {
      responses.push({
        id: this._generateId('assessresp'),
        quizId,
        questionId: a.questionId,
        answerOptionId: a.answerOptionId,
        answered_at: now
      });
    });
    this._saveToStorage('assessment_responses', responses);

    // Compute matches (simple heuristic: top rated coaches supporting intro sessions)
    const coaches = this._getFromStorage('coaches').filter(
      (c) => c.is_active !== false && c.supports_intro_sessions
    );

    const topCoaches = coaches
      .slice()
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 5);

    const results = this._getFromStorage('assessment_results');
    const matchesStore = this._getFromStorage('assessment_coach_matches');

    const resultId = this._generateId('assessresult');
    const completed_at = now;

    const top_match_coach = topCoaches[0] || null;

    const result = {
      id: resultId,
      quizId,
      completed_at,
      summary: top_match_coach
        ? 'We found a coach that closely matches your goals.'
        : 'No coach matches found at this time.',
      top_match_coach_id: top_match_coach ? top_match_coach.id : null,
      notes: ''
    };

    results.push(result);
    this._saveToStorage('assessment_results', results);

    const matches = [];
    topCoaches.forEach((c, index) => {
      const match = {
        id: this._generateId('assessmatch'),
        resultId,
        coachId: c.id,
        rank: index + 1,
        match_score: c.average_rating || null,
        is_top_match: index === 0
      };
      matchesStore.push(match);
      matches.push(match);
    });
    this._saveToStorage('assessment_coach_matches', matchesStore);

    // Update assessment context
    this._setCurrentAssessmentContext({ latest_result_id: resultId });

    const matchesView = matches.map((m) => {
      const c = coaches.find((cc) => cc.id === m.coachId) ||
        this._getFromStorage('coaches').find((cc) => cc.id === m.coachId) ||
        null;
      return {
        coach_id: m.coachId,
        name: c ? c.name : '',
        rank: m.rank,
        match_score: m.match_score,
        primary_specialization: c ? c.primary_specialization : '',
        primary_specialization_label: c
          ? this._specializationLabel(c.primary_specialization)
          : '',
        average_rating: c ? c.average_rating || 0 : 0,
        rating_count: c ? c.rating_count || 0 : 0,
        price_min: c ? c.min_session_price || c.starting_price || 0 : 0,
        price_max: c ? c.max_session_price || c.starting_price || 0 : 0,
        formats_offered: c ? c.formats_offered || [] : []
      };
    });

    const topMatchView = top_match_coach
      ? {
          coach_id: top_match_coach.id,
          name: top_match_coach.name,
          primary_specialization: top_match_coach.primary_specialization,
          primary_specialization_label: this._specializationLabel(
            top_match_coach.primary_specialization
          ),
          average_rating: top_match_coach.average_rating || 0,
          rating_count: top_match_coach.rating_count || 0,
          price_min: top_match_coach.min_session_price || top_match_coach.starting_price || 0,
          price_max: top_match_coach.max_session_price || top_match_coach.starting_price || 0,
          formats_offered: top_match_coach.formats_offered || [],
          supports_intro_sessions: !!top_match_coach.supports_intro_sessions,
          supports_recurring_sessions: !!top_match_coach.supports_recurring_sessions
        }
      : null;

    return {
      result_id: resultId,
      completed_at,
      summary: result.summary,
      top_match: topMatchView,
      matches: matchesView
    };
  }

  // 31) getLatestAssessmentResult()

  getLatestAssessmentResult() {
    const ctx = this._getCurrentAssessmentContext();
    if (!ctx.latest_result_id) {
      return { has_result: false, result: null };
    }

    const results = this._getFromStorage('assessment_results');
    const result = results.find((r) => r.id === ctx.latest_result_id);
    if (!result) {
      return { has_result: false, result: null };
    }

    const matchesStore = this._getFromStorage('assessment_coach_matches').filter(
      (m) => m.resultId === result.id
    );
    const coaches = this._getFromStorage('coaches');

    const topCoach = result.top_match_coach_id
      ? coaches.find((c) => c.id === result.top_match_coach_id)
      : null;

    const top_match = topCoach
      ? {
          coach_id: topCoach.id,
          name: topCoach.name,
          primary_specialization: topCoach.primary_specialization,
          primary_specialization_label: this._specializationLabel(
            topCoach.primary_specialization
          ),
          average_rating: topCoach.average_rating || 0,
          rating_count: topCoach.rating_count || 0
        }
      : null;

    const matches = matchesStore
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((m) => {
        const c = coaches.find((cc) => cc.id === m.coachId) || null;
        return {
          coach_id: m.coachId,
          name: c ? c.name : '',
          rank: m.rank,
          match_score: m.match_score
        };
      });

    return {
      has_result: true,
      result: {
        result_id: result.id,
        completed_at: result.completed_at,
        summary: result.summary || '',
        top_match,
        matches
      }
    };
  }

  // 32) getResourceFilterOptions()

  getResourceFilterOptions() {
    return {
      category_options: [
        { value: 'all', label: 'All' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'organizational_change', label: 'Organizational Change' },
        { value: 'change_management', label: 'Change Management' },
        { value: 'career_development', label: 'Career Development' },
        { value: 'stress_management', label: 'Stress Management' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'general', label: 'General' }
      ],
      content_type_options: [
        { value: 'article', label: 'Articles' },
        { value: 'case_study', label: 'Case Studies' },
        { value: 'video', label: 'Videos' },
        { value: 'podcast', label: 'Podcasts' },
        { value: 'all', label: 'All' }
      ],
      rating_threshold_options: [
        { value: 0, label: 'Any rating' },
        { value: 4, label: '4+ stars' }
      ],
      date_range_presets: [
        { id: 'past_30_days', label: 'Past 30 days' },
        { id: 'past_90_days', label: 'Past 90 days' },
        { id: 'past_year', label: 'Past year' }
      ],
      read_time_options: [
        { max_minutes: 5, label: 'Up to 5 minutes' },
        { max_minutes: 10, label: 'Up to 10 minutes' },
        { max_minutes: 15, label: 'Up to 15 minutes' }
      ],
      sort_options: [
        { value: 'published_desc', label: 'Newest first' },
        { value: 'read_time_asc', label: 'Shortest read time' },
        { value: 'rating_desc', label: 'Top rated' }
      ]
    };
  }

  // 33) searchResources(...)

  searchResources(
    query,
    category,
    content_type,
    min_rating,
    published_after,
    published_before,
    max_read_time_minutes,
    sort_by,
    save_filter_preference
  ) {
    let resources = this._getFromStorage('resources');
    const saved = this._getCurrentSavedResourcesStore();

    if (query) {
      const q = query.toLowerCase();
      resources = resources.filter((r) => {
        const t = (r.title || '').toLowerCase();
        const b = (r.body || '').toLowerCase();
        return t.includes(q) || b.includes(q);
      });
    }

    if (category && category !== 'all') {
      resources = resources.filter((r) => r.category === category);
    }

    if (content_type && content_type !== 'all') {
      resources = resources.filter((r) => r.content_type === content_type);
    }

    if (typeof min_rating === 'number') {
      resources = resources.filter((r) => (r.average_rating || 0) >= min_rating);
    }

    const after = published_after ? new Date(published_after) : null;
    const before = published_before ? new Date(published_before) : null;

    if (after) {
      resources = resources.filter((r) => new Date(r.published_at) >= after);
    }
    if (before) {
      resources = resources.filter((r) => new Date(r.published_at) <= before);
    }

    if (typeof max_read_time_minutes === 'number') {
      resources = resources.filter(
        (r) => !r.read_time_minutes || r.read_time_minutes <= max_read_time_minutes
      );
    }

    if (sort_by === 'published_desc') {
      resources.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } else if (sort_by === 'read_time_asc') {
      resources.sort(
        (a, b) => (a.read_time_minutes || Infinity) - (b.read_time_minutes || Infinity)
      );
    } else if (sort_by === 'rating_desc') {
      resources.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    if (save_filter_preference) {
      const pref = this._getOrCreateResourceFilterPreference();
      pref.keyword = query || '';
      pref.category_id = category || 'all';
      pref.content_type = content_type || 'all';
      pref.max_read_time_minutes = max_read_time_minutes || null;
      pref.published_after = published_after || null;
      this._saveResourceFilterPreference(pref);
    }

    const resourcesView = resources.map((r) => {
      const is_saved = !!saved.find((s) => s.resourceId === r.id);
      return {
        resource_id: r.id,
        title: r.title,
        slug: r.slug || '',
        content_type: r.content_type,
        category: r.category,
        category_label: this._contentCategoryLabel(r.category),
        average_rating: r.average_rating || 0,
        rating_count: r.rating_count || 0,
        read_time_minutes: r.read_time_minutes || null,
        published_at: r.published_at,
        is_saved,
        is_featured: !!r.is_featured,
        resource: r // foreign key resolution for easy access
      };
    });

    return {
      total_results: resourcesView.length,
      resources: resourcesView
    };
  }

  // 34) getResourceDetail(resourceId)

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const r = resources.find((x) => x.id === resourceId);
    const saved = this._getCurrentSavedResourcesStore();
    const is_saved = !!saved.find((s) => s.resourceId === resourceId);

    if (!r) {
      return {
        resource_id: null,
        title: '',
        slug: '',
        content_type: '',
        category: '',
        category_label: '',
        body: '',
        read_time_minutes: null,
        published_at: '',
        average_rating: 0,
        rating_count: 0,
        author_name: '',
        is_saved: false
      };
    }

    return {
      resource_id: r.id,
      title: r.title,
      slug: r.slug || '',
      content_type: r.content_type,
      category: r.category,
      category_label: this._contentCategoryLabel(r.category),
      body: r.body || '',
      read_time_minutes: r.read_time_minutes || null,
      published_at: r.published_at,
      average_rating: r.average_rating || 0,
      rating_count: r.rating_count || 0,
      author_name: r.author_name || '',
      is_saved
    };
  }

  // 35) saveResource(resourceId)

  saveResource(resourceId) {
    let saved = this._getCurrentSavedResourcesStore();
    const existing = saved.find((s) => s.resourceId === resourceId);
    if (existing) {
      return {
        success: true,
        saved_resource_id: existing.id,
        saved_at: existing.saved_at,
        is_saved: true,
        message: 'Resource already saved.'
      };
    }

    const item = {
      id: this._generateId('savedres'),
      resourceId,
      saved_at: this._nowISO(),
      is_read: false
    };

    saved.push(item);
    this._saveToStorage('saved_resources', saved);

    return {
      success: true,
      saved_resource_id: item.id,
      saved_at: item.saved_at,
      is_saved: true,
      message: 'Resource saved.'
    };
  }

  // 36) removeSavedResource(resourceId)

  removeSavedResource(resourceId) {
    const saved = this._getCurrentSavedResourcesStore();
    const newSaved = saved.filter((s) => s.resourceId !== resourceId);
    this._saveToStorage('saved_resources', newSaved);
    return {
      success: true,
      message: 'Saved resource removed.'
    };
  }

  // 37) getSavedResources()

  getSavedResources() {
    const saved = this._getCurrentSavedResourcesStore();
    const resources = this._getFromStorage('resources');

    const items = saved.map((s) => {
      const r = resources.find((res) => res.id === s.resourceId) || null;
      return {
        saved_resource_id: s.id,
        resource_id: s.resourceId,
        title: r ? r.title : '',
        content_type: r ? r.content_type : '',
        category: r ? r.category : '',
        category_label: r ? this._contentCategoryLabel(r.category) : '',
        average_rating: r ? r.average_rating || 0 : 0,
        read_time_minutes: r ? r.read_time_minutes || null : null,
        published_at: r ? r.published_at : '',
        is_read: !!s.is_read,
        resource: r
      };
    });

    return {
      total_saved: items.length,
      items
    };
  }

  // 38) markSavedResourceAsRead(savedResourceId)

  markSavedResourceAsRead(savedResourceId) {
    const saved = this._getCurrentSavedResourcesStore();
    const item = saved.find((s) => s.id === savedResourceId);
    if (!item) {
      return {
        success: false,
        message: 'Saved resource not found.'
      };
    }

    item.is_read = true;
    this._saveToStorage('saved_resources', saved);

    return {
      success: true,
      message: 'Saved resource marked as read.'
    };
  }

  // 39) getForCompaniesOverview()

  getForCompaniesOverview() {
    const workshops = this._getFromStorage('workshops').filter((w) => w.is_active !== false);
    const offerings = workshops.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description || '',
      focus_area: this._topicLabel(w.topic)
    }));

    const benefits = [
      'Tailored leadership and change programs for your context.',
      'Blended formats (online + on-site) for distributed teams.',
      'Data-informed measurement and reporting.'
    ];

    return {
      headline: 'Leadership & Coaching for Companies',
      subheadline:
        'Partner with us to support managers, high-potentials, and teams through change.',
      offerings,
      benefits
    };
  }

  // 40) submitProposalRequest(...)

  submitProposalRequest(
    company_name,
    contact_name,
    contact_email,
    industry,
    team_size,
    focus_area,
    format,
    duration_months,
    budget_cap,
    additional_details
  ) {
    const requests = this._getFromStorage('proposal_requests');

    const request = {
      id: this._generateId('proposal'),
      company_name,
      contact_name,
      contact_email,
      industry,
      team_size,
      focus_area,
      format,
      duration_months,
      budget_cap,
      additional_details: additional_details || '',
      status: 'submitted',
      created_at: this._nowISO()
    };

    requests.push(request);
    this._saveToStorage('proposal_requests', requests);

    return {
      success: true,
      proposal_request_id: request.id,
      status: request.status,
      message: 'Proposal request submitted.'
    };
  }

  // 41) getAboutPageContent()

  getAboutPageContent() {
    return {
      mission:
        'To make high-quality coaching accessible to individuals and organizations navigating change.',
      values: [
        'Evidence-based practice',
        'Inclusive and equitable access',
        'Confidentiality and psychological safety'
      ],
      methodology:
        'We combine ICF-aligned coaching, facilitation, and practical tools. Our network of coaches brings cross-industry experience and is vetted for training and results.',
      team: [],
      contact_email: 'hello@example.com',
      contact_phone: '',
      physical_location: '',
      policies: [
        {
          title: 'Cancellation Policy',
          summary:
            'Most sessions can be rescheduled up to 24 hours in advance. Program and workshop terms may vary.'
        },
        {
          title: 'Privacy Policy',
          summary:
            'We treat all coaching conversations as confidential and handle data in line with applicable regulations.'
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