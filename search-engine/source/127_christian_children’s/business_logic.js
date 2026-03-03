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
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage & ID Helpers --------------------

  _initStorage() {
    const tableKeys = [
      // Core data tables from data model
      'events',
      'event_sessions',
      'event_registrations',
      'registration_children',
      'donation_funds',
      'donations',
      'craft_activities',
      'saved_resources',
      'resource_collections',
      'collection_items',
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'campus_sites',
      'volunteer_opportunities',
      'volunteer_time_slots',
      'volunteer_applications',
      'lesson_plans',
      'lesson_series',
      'series_lesson_assignments',
      'newsletter_subscriptions',
      'newsletter_child_ages',
      'newsletter_topic_preferences',
      'child_profiles',
      'child_interest_tags',
      'sponsorships'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Track current cart ID for this session context
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
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

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // -------------------- Generic Helpers --------------------

  _calculateDonationProcessingFee(amount) {
    const percentage = 0.03; // 3% default
    const fee = amount * percentage;
    return Math.round(fee * 100) / 100;
  }

  _getEventEffectivePrice(event) {
    if (!event) return 0;
    // Base on event.base_price_per_child; could be extended to session overrides if needed
    return typeof event.base_price_per_child === 'number' ? event.base_price_per_child : 0;
  }

  _applyEventFilters(events, filters, sort_by) {
    let result = Array.isArray(events) ? events.slice() : [];
    const sessions = this._getFromStorage('event_sessions');
    const campuses = this._getFromStorage('campus_sites');

    filters = filters || {};

    if (filters.event_type) {
      result = result.filter(e => e.event_type === filters.event_type);
    }

    if (filters.start_date || filters.end_date) {
      const start = filters.start_date ? new Date(filters.start_date) : null;
      const end = filters.end_date ? new Date(filters.end_date) : null;
      result = result.filter(e => {
        const evStart = e.start_date ? new Date(e.start_date) : null;
        if (!evStart) return false;
        if (start && evStart < start) return false;
        if (end && evStart > end) return false;
        return true;
      });
    }

    if (typeof filters.min_age === 'number' || typeof filters.max_age === 'number') {
      const fMin = typeof filters.min_age === 'number' ? filters.min_age : 0;
      const fMax = typeof filters.max_age === 'number' ? filters.max_age : Infinity;
      result = result.filter(e => {
        const eMin = typeof e.min_age === 'number' ? e.min_age : 0;
        const eMax = typeof e.max_age === 'number' ? e.max_age : Infinity;
        return eMin <= fMax && eMax >= fMin;
      });
    }

    if (typeof filters.max_price_per_child === 'number') {
      const maxPrice = filters.max_price_per_child;
      result = result.filter(e => this._getEventEffectivePrice(e) <= maxPrice);
    }

    if (filters.location_postal_code) {
      const postal = String(filters.location_postal_code);
      result = result.filter(e => {
        const evPostal = e.address_postal_code || null;
        let campusPostal = null;
        if (e.campus_site_id) {
          const campus = campuses.find(c => c.id === e.campus_site_id);
          campusPostal = campus ? campus.postal_code : null;
        }
        return (evPostal && evPostal === postal) || (campusPostal && campusPostal === postal);
      });
      // distance_miles intentionally ignored due to lack of coordinates for search origin
    }

    if (filters.session_type) {
      const type = filters.session_type;
      result = result.filter(e => {
        const evSessions = sessions.filter(s => s.event_id === e.id);
        if (!evSessions.length) return false;
        return evSessions.some(s => s.session_type === type);
      });
    }

    // Sorting
    if (sort_by === 'price_low_to_high') {
      result.sort((a, b) => this._getEventEffectivePrice(a) - this._getEventEffectivePrice(b));
    } else if (sort_by === 'date_soonest') {
      result.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date) : new Date(0);
        const db = b.start_date ? new Date(b.start_date) : new Date(0);
        return da - db;
      });
    } else if (sort_by === 'date_latest') {
      result.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date) : new Date(0);
        const db = b.start_date ? new Date(b.start_date) : new Date(0);
        return db - da;
      });
    }

    return result;
  }

  _applyProductFilters(products, filters, sort_by) {
    let result = Array.isArray(products) ? products.slice() : [];
    filters = filters || {};

    if (filters.category_id) {
      result = result.filter(p => p.category_id === filters.category_id);
    }

    if (typeof filters.min_age === 'number' || typeof filters.max_age === 'number') {
      const fMin = typeof filters.min_age === 'number' ? filters.min_age : 0;
      const fMax = typeof filters.max_age === 'number' ? filters.max_age : Infinity;
      result = result.filter(p => {
        const pMin = typeof p.min_age === 'number' ? p.min_age : 0;
        const pMax = typeof p.max_age === 'number' ? p.max_age : Infinity;
        return pMin <= fMax && pMax >= fMin;
      });
    }

    if (typeof filters.min_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.max_price);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      result = result.filter(p => {
        if (!Array.isArray(p.tags) || !p.tags.length) return false;
        return filters.tags.some(t => p.tags.includes(t));
      });
    }

    // Sorting
    if (sort_by === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort_by === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'newest') {
      // No explicit created_at, so approximate with idCounter (lexicographic fallback)
      result.sort((a, b) => {
        const aid = parseInt(String(a.id).split('_').pop(), 10) || 0;
        const bid = parseInt(String(b.id).split('_').pop(), 10) || 0;
        return bid - aid;
      });
    }

    return result;
  }

  _applyVolunteerFilters(opportunities, filters, sort_by) {
    let result = Array.isArray(opportunities) ? opportunities.slice() : [];
    const campuses = this._getFromStorage('campus_sites');
    const timeSlots = this._getFromStorage('volunteer_time_slots');

    filters = filters || {};

    // Only open opportunities
    result = result.filter(o => o.status === 'open');

    if (filters.serve_type) {
      result = result.filter(o => o.serve_type === filters.serve_type);
    }

    if (filters.role_focus) {
      result = result.filter(o => o.role_focus === filters.role_focus);
    }

    if (filters.location_postal_code) {
      const postal = String(filters.location_postal_code);
      result = result.filter(o => {
        if (!o.campus_site_id) return false;
        const campus = campuses.find(c => c.id === o.campus_site_id);
        return campus && campus.postal_code === postal;
      });
      // Set approximate distance_miles_from_search to 0 for those that match
      result = result.map(o => ({ ...o, distance_miles_from_search: typeof o.distance_miles_from_search === 'number' ? o.distance_miles_from_search : 0 }));
    }

    if (filters.day_of_week || filters.time_block) {
      result = result.filter(o => {
        const slots = timeSlots.filter(ts => ts.volunteer_opportunity_id === o.id);
        if (!slots.length) return false;
        return slots.some(ts => {
          if (filters.day_of_week && ts.day_of_week !== filters.day_of_week) return false;
          if (filters.time_block && ts.time_block !== filters.time_block) return false;
          return true;
        });
      });
    }

    if (sort_by === 'distance') {
      result.sort((a, b) => (a.distance_miles_from_search || 0) - (b.distance_miles_from_search || 0));
    }

    return result;
  }

  _getNextDisplayOrderForSeries(lessonSeriesId) {
    const assignments = this._getFromStorage('series_lesson_assignments').filter(a => a.lesson_series_id === lessonSeriesId);
    if (!assignments.length) {
      return { next_display_order: 1, next_week_number: 1 };
    }
    const maxDisplay = assignments.reduce((max, a) => Math.max(max, a.display_order || 0), 0);
    const maxWeek = assignments.reduce((max, a) => Math.max(max, a.week_number || 0), 0);
    return { next_display_order: maxDisplay + 1, next_week_number: maxWeek + 1 };
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentId = localStorage.getItem('current_cart_id') || '';
    let cart = currentId ? carts.find(c => c.id === currentId) : null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: new Date().toISOString(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getCartItemsForCart(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter(ci => ci.cart_id === cartId);
  }

  _recalculateCartTotals(cart, cartItems) {
    let subtotal = 0;
    for (const item of cartItems) {
      const line = typeof item.line_subtotal === 'number' ? item.line_subtotal : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += line;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const estimated_tax = 0; // Could be extended
    const shipping_estimate = 0; // Digital / ministry resources often free shipping
    const total = subtotal + estimated_tax + shipping_estimate;
    return {
      subtotal,
      estimated_tax,
      shipping_estimate,
      total: Math.round(total * 100) / 100
    };
  }

  // -------------------- Interface Implementations --------------------
  // 1) getOrganizationOverview

  getOrganizationOverview() {
    return {
      mission_statement: 'To help children know and follow Jesus through Scripture, worship, and caring relationships.',
      vision_statement: 'Partnering with churches and families so every child hears and experiences the good news of Jesus.',
      beliefs_summary: 'We are a Christian ministry holding to the historic, orthodox Christian faith, centered on the gospel of Jesus Christ and the authority of the Bible.',
      focus_areas: [
        {
          title: 'Children\'s Ministry Support',
          description: 'Resources, training, and encouragement for church leaders and volunteers serving kids.'
        },
        {
          title: 'Family Discipleship',
          description: 'Tools to help parents lead meaningful Bible conversations and devotions at home.'
        },
        {
          title: 'Compassion & Sponsorship',
          description: 'Opportunities to sponsor children and support holistic, Christ-centered care.'
        }
      ],
      contact_highlight: {
        email: 'info@example-ministry.org',
        phone: '+1 (555) 123-4567',
        mailing_address: 'PO Box 123, City, ST 00000'
      }
    };
  }

  // 2) getHomepageHighlights

  getHomepageHighlights() {
    const events = this._getFromStorage('events').filter(e => e.status === 'published');
    const series = this._getFromStorage('lesson_series');
    const crafts = this._getFromStorage('craft_activities').filter(c => c.status === 'active');
    const children = this._getFromStorage('child_profiles').filter(c => c.status === 'available');
    const campuses = this._getFromStorage('campus_sites');

    // Resolve campus for events
    const eventsWithCampus = events.map(e => ({
      ...e,
      campus_site: e.campus_site_id ? (campuses.find(c => c.id === e.campus_site_id) || null) : null
    }));

    eventsWithCampus.sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date) : new Date(8640000000000000);
      const db = b.start_date ? new Date(b.start_date) : new Date(8640000000000000);
      return da - db;
    });

    const featured_events = eventsWithCampus.slice(0, 3).map(e => this._clone(e));

    const featured_lesson_series = series
      .slice()
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at) : new Date(0);
        const db = b.created_at ? new Date(b.created_at) : new Date(0);
        return db - da;
      })
      .slice(0, 2)
      .map(s => this._clone(s));

    const featured_craft_activities = crafts
      .slice()
      .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
      .slice(0, 3)
      .map(c => this._clone(c));

    const featured_child_profiles = children
      .slice()
      .sort((a, b) => {
        const da = a.date_listed ? new Date(a.date_listed) : new Date(0);
        const db = b.date_listed ? new Date(b.date_listed) : new Date(0);
        return da - db;
      })
      .slice(0, 3)
      .map(c => this._clone(c));

    return {
      highlight_message: 'Helping children know and love Jesus at church and at home.',
      featured_events,
      featured_lesson_series,
      featured_craft_activities,
      featured_child_profiles
    };
  }

  // 3) getEventFilterOptions

  getEventFilterOptions() {
    return {
      event_types: [
        { value: 'summer_bible_camp', label: 'Summer Bible Camp' },
        { value: 'family_event', label: 'Family Event' },
        { value: 'training', label: 'Training' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'other_event', label: 'Other Event' }
      ],
      age_ranges: [
        { label: '3–5 years', min_age: 3, max_age: 5 },
        { label: '6–8 years', min_age: 6, max_age: 8 },
        { label: '7–10 years', min_age: 7, max_age: 10 },
        { label: '9–11 years', min_age: 9, max_age: 11 },
        { label: 'All Children (3–12)', min_age: 3, max_age: 12 }
      ],
      price_bands: [
        { label: 'Under $50', max_price_per_child: 50 },
        { label: 'Under $100', max_price_per_child: 100 },
        { label: 'Under $200', max_price_per_child: 200 }
      ],
      session_types: [
        { value: 'morning', label: 'Morning Session' },
        { value: 'afternoon', label: 'Afternoon Session' },
        { value: 'evening', label: 'Evening Session' },
        { value: 'full_day', label: 'Full Day' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'date_soonest', label: 'Date: Soonest' },
        { value: 'date_latest', label: 'Date: Latest' }
      ]
    };
  }

  // 4) searchEvents(filters, sort_by, page, page_size)

  searchEvents(filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 20;
    const allEvents = this._getFromStorage('events');
    const filtered = this._applyEventFilters(allEvents, filters || {}, sort_by);
    const campuses = this._getFromStorage('campus_sites');

    const startIndex = (page - 1) * page_size;
    const pageItems = filtered.slice(startIndex, startIndex + page_size).map(e => ({
      ...e,
      campus_site: e.campus_site_id ? (campuses.find(c => c.id === e.campus_site_id) || null) : null
    }));

    return {
      events: this._clone(pageItems),
      total_count: filtered.length,
      page,
      page_size
    };
  }

  // 5) getEventDetails(eventId)

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');
    const campuses = this._getFromStorage('campus_sites');

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { event: null, sessions: [], campus_site: null, price_display: '' };
    }

    const eventSessions = sessions
      .filter(s => s.event_id === event.id)
      .map(s => ({ ...s, event })); // FK resolution

    const campus_site = event.campus_site_id
      ? campuses.find(c => c.id === event.campus_site_id) || null
      : null;

    const price = this._getEventEffectivePrice(event);
    const price_display = price > 0 ? `$${price.toFixed(2)} per child` : 'Free';

    return {
      event: this._clone({ ...event, campus_site }),
      sessions: this._clone(eventSessions),
      campus_site: this._clone(campus_site),
      price_display
    };
  }

  // 6) createEventRegistration(eventId, guardian_details, children, payment_method)

  createEventRegistration(eventId, guardian_details, children, payment_method) {
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');
    const registrations = this._getFromStorage('event_registrations');
    const registrationChildren = this._getFromStorage('registration_children');

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return {
        success: false,
        registration: null,
        children: [],
        total_amount_due: 0,
        message: 'Event not found.'
      };
    }

    const now = new Date().toISOString();
    const guardian = guardian_details || {};
    const childArray = Array.isArray(children) ? children : [];

    let total_amount_due = 0;

    for (const child of childArray) {
      const session = sessions.find(s => s.id === child.event_session_id);
      const base = typeof event.base_price_per_child === 'number' ? event.base_price_per_child : 0;
      const price = session && typeof session.price_per_child_override === 'number'
        ? session.price_per_child_override
        : base;
      total_amount_due += price;
    }

    total_amount_due = Math.round(total_amount_due * 100) / 100;

    const registration = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      registration_date: now,
      guardian_first_name: guardian.first_name || '',
      guardian_last_name: guardian.last_name || '',
      guardian_email: guardian.email || '',
      guardian_phone: guardian.phone || '',
      total_children: childArray.length,
      total_amount_due,
      payment_method: payment_method,
      registration_status: 'pending',
      notes: guardian.notes || ''
    };

    registrations.push(registration);

    const createdChildren = [];

    for (const child of childArray) {
      const regChild = {
        id: this._generateId('regchild'),
        event_registration_id: registration.id,
        event_session_id: child.event_session_id,
        first_name: child.first_name || '',
        last_name: child.last_name || '',
        age: child.age,
        special_needs_notes: child.special_needs_notes || ''
      };
      createdChildren.push(regChild);
      registrationChildren.push(regChild);

      // Update session capacity tracking
      const session = sessions.find(s => s.id === child.event_session_id);
      if (session) {
        session.current_registered_count = (session.current_registered_count || 0) + 1;
      }
    }

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('registration_children', registrationChildren);
    this._saveToStorage('event_sessions', sessions);

    return {
      success: true,
      registration: this._clone(registration),
      children: this._clone(createdChildren),
      total_amount_due,
      message: 'Registration created successfully.'
    };
  }

  // 7) getDonationPageConfig

  getDonationPageConfig() {
    const funds = this._getFromStorage('donation_funds').filter(f => f.status === 'active');
    return {
      funds: this._clone(funds),
      default_recurring_amounts: [25, 35, 50, 100],
      processing_fee_percentage: 0.03,
      allowed_payment_methods: ['bill_me_by_mail', 'pay_later_instructions', 'online_card']
    };
  }

  // 8) createDonation(donation_type, amount, fund_id, cover_processing_fee, dedication, donor_info, payment_method, start_date)

  createDonation(donation_type, amount, fund_id, cover_processing_fee, dedication, donor_info, payment_method, start_date) {
    const donations = this._getFromStorage('donations');
    const funds = this._getFromStorage('donation_funds');

    const fund = funds.find(f => f.id === fund_id);
    if (!fund) {
      return { success: false, donation: null, message: 'Donation fund not found.' };
    }

    const now = new Date().toISOString();
    const donor = donor_info || {};
    const ded = dedication || {};

    let processing_fee_amount = 0;
    if (cover_processing_fee) {
      processing_fee_amount = this._calculateDonationProcessingFee(amount);
    }

    let status = 'pending';
    if (donation_type === 'monthly' && payment_method !== 'online_card') {
      status = 'active';
    } else if (payment_method === 'online_card') {
      status = donation_type === 'monthly' ? 'active' : 'completed';
    }

    const donation = {
      id: this._generateId('donation'),
      donation_type,
      amount,
      fund_id,
      cover_processing_fee: !!cover_processing_fee,
      processing_fee_amount,
      donor_first_name: donor.first_name || '',
      donor_last_name: donor.last_name || '',
      donor_email: donor.email || '',
      address_line1: donor.address_line1 || '',
      address_line2: donor.address_line2 || '',
      address_city: donor.city || '',
      address_state: donor.state || '',
      address_postal_code: donor.postal_code || '',
      address_country: donor.country || '',
      dedication_enabled: !!ded.enabled,
      dedication_type: ded.enabled ? ded.dedication_type || null : null,
      honoree_name: ded.enabled ? (ded.honoree_name || '') : null,
      dedication_message: ded.enabled ? (ded.message || '') : null,
      payment_method,
      status,
      created_at: now,
      start_date: start_date || (donation_type === 'monthly' ? now : null)
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return { success: true, donation: this._clone(donation), message: 'Donation recorded successfully.' };
  }

  // 9) getCraftActivityFilterOptions

  getCraftActivityFilterOptions() {
    return {
      age_ranges: [
        { label: '3–5', min_age: 3, max_age: 5 },
        { label: '6–8', min_age: 6, max_age: 8 },
        { label: '9–11', min_age: 9, max_age: 11 }
      ],
      seasonal_topics: [
        { value: 'easter', label: 'Easter' },
        { value: 'christmas', label: 'Christmas' },
        { value: 'thanksgiving', label: 'Thanksgiving' },
        { value: 'pentecost', label: 'Pentecost' },
        { value: 'general', label: 'General' }
      ],
      duration_options: [
        { label: '15 minutes or less', max_minutes: 15 },
        { label: '30 minutes or less', max_minutes: 30 },
        { label: '60 minutes or less', max_minutes: 60 }
      ],
      difficulty_levels: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' }
      ],
      sort_options: [
        { value: 'most_downloaded', label: 'Most Downloaded' },
        { value: 'newest', label: 'Newest' },
        { value: 'shortest_duration', label: 'Shortest Duration' }
      ]
    };
  }

  // 10) searchCraftActivities(filters, sort_by, page, page_size)

  searchCraftActivities(filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 24;
    filters = filters || {};

    let activities = this._getFromStorage('craft_activities').filter(a => a.status === 'active');

    if (typeof filters.min_age === 'number' || typeof filters.max_age === 'number') {
      const fMin = typeof filters.min_age === 'number' ? filters.min_age : 0;
      const fMax = typeof filters.max_age === 'number' ? filters.max_age : Infinity;
      activities = activities.filter(a => {
        const aMin = typeof a.min_age === 'number' ? a.min_age : 0;
        const aMax = typeof a.max_age === 'number' ? a.max_age : Infinity;
        return aMin <= fMax && aMax >= fMin;
      });
    }

    if (filters.seasonal_topic) {
      activities = activities.filter(a => a.seasonal_topic === filters.seasonal_topic);
    }

    if (typeof filters.max_duration_minutes === 'number') {
      activities = activities.filter(a => (a.estimated_duration_minutes || 0) <= filters.max_duration_minutes);
    }

    if (filters.difficulty_level) {
      activities = activities.filter(a => a.difficulty_level === filters.difficulty_level);
    }

    if (filters.text_query) {
      const q = String(filters.text_query).toLowerCase();
      activities = activities.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        return title.includes(q) || summary.includes(q);
      });
    }

    if (sort_by === 'most_downloaded') {
      activities.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    } else if (sort_by === 'newest') {
      activities.sort((a, b) => {
        const aid = parseInt(String(a.id).split('_').pop(), 10) || 0;
        const bid = parseInt(String(b.id).split('_').pop(), 10) || 0;
        return bid - aid;
      });
    } else if (sort_by === 'shortest_duration') {
      activities.sort((a, b) => (a.estimated_duration_minutes || 0) - (b.estimated_duration_minutes || 0));
    }

    const total_count = activities.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = activities.slice(startIndex, startIndex + page_size);

    return {
      activities: this._clone(pageItems),
      total_count,
      page,
      page_size
    };
  }

  // 11) saveResource(resource_type, resource_id)

  saveResource(resource_type, resource_id) {
    const savedResources = this._getFromStorage('saved_resources');

    const existing = savedResources.find(
      sr => sr.resource_type === resource_type && sr.resource_id === resource_id
    );

    if (existing) {
      return {
        success: true,
        saved_resource: this._clone(existing),
        message: 'Resource already saved.'
      };
    }

    const saved_resource = {
      id: this._generateId('savedres'),
      resource_type,
      resource_id,
      saved_at: new Date().toISOString()
    };

    savedResources.push(saved_resource);
    this._saveToStorage('saved_resources', savedResources);

    return {
      success: true,
      saved_resource: this._clone(saved_resource),
      message: 'Resource saved successfully.'
    };
  }

  // 12) getSavedResourcesOverview

  getSavedResourcesOverview() {
    const savedResources = this._getFromStorage('saved_resources');
    const collections = this._getFromStorage('resource_collections');
    const crafts = this._getFromStorage('craft_activities');
    const lessons = this._getFromStorage('lesson_plans');

    const mapped = savedResources.map(sr => {
      let resource = null;
      let title = '';
      let age_range_label = '';
      let thumbnail_image_url = '';

      if (sr.resource_type === 'craft_activity') {
        resource = crafts.find(c => c.id === sr.resource_id) || null;
        if (resource) {
          title = resource.title || '';
          age_range_label = `${resource.min_age || ''}–${resource.max_age || ''}`;
          thumbnail_image_url = resource.thumbnail_image_url || '';
        }
      } else if (sr.resource_type === 'lesson_plan') {
        resource = lessons.find(l => l.id === sr.resource_id) || null;
        if (resource) {
          title = resource.title || '';
          age_range_label = `${resource.min_age || ''}–${resource.max_age || ''}`;
          thumbnail_image_url = ''; // Lesson plans may not have thumbnails
        }
      }

      return {
        saved_resource: { ...sr, resource }, // FK resolution: include referenced resource
        title,
        resource_type: sr.resource_type,
        age_range_label,
        thumbnail_image_url
      };
    });

    return {
      saved_resources: this._clone(mapped),
      collections: this._clone(collections)
    };
  }

  // 13) createResourceCollection(name, description)

  createResourceCollection(name, description) {
    const collections = this._getFromStorage('resource_collections');
    const collection = {
      id: this._generateId('collection'),
      name: name || '',
      description: description || '',
      created_at: new Date().toISOString()
    };
    collections.push(collection);
    this._saveToStorage('resource_collections', collections);
    return { success: true, collection: this._clone(collection), message: 'Collection created.' };
  }

  // 14) addSavedResourcesToCollection(collectionId, savedResourceIds)

  addSavedResourcesToCollection(collectionId, savedResourceIds) {
    const collections = this._getFromStorage('resource_collections');
    const savedResources = this._getFromStorage('saved_resources');
    const collectionItems = this._getFromStorage('collection_items');

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return {
        success: false,
        updated_collection: null,
        added_item_ids: [],
        message: 'Collection not found.'
      };
    }

    const ids = Array.isArray(savedResourceIds) ? savedResourceIds : [];

    const addedItems = [];

    for (const srId of ids) {
      const sr = savedResources.find(s => s.id === srId);
      if (!sr) continue;

      const exists = collectionItems.find(
        ci => ci.collection_id === collectionId && ci.saved_resource_id === srId
      );
      if (exists) continue;

      const item = {
        id: this._generateId('coli'),
        collection_id: collectionId,
        saved_resource_id: srId,
        added_at: new Date().toISOString()
      };
      collectionItems.push(item);
      addedItems.push(item);
    }

    this._saveToStorage('collection_items', collectionItems);

    return {
      success: true,
      updated_collection: this._clone(collection),
      added_item_ids: this._clone(addedItems),
      message: 'Resources added to collection.'
    };
  }

  // 15) getCollectionDetail(collectionId)

  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('resource_collections');
    const collectionItems = this._getFromStorage('collection_items');
    const savedResources = this._getFromStorage('saved_resources');
    const crafts = this._getFromStorage('craft_activities');
    const lessons = this._getFromStorage('lesson_plans');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, items: [] };
    }

    const itemsForCollection = collectionItems
      .filter(ci => ci.collection_id === collectionId)
      .sort((a, b) => new Date(a.added_at || 0) - new Date(b.added_at || 0));

    const items = itemsForCollection.map(ci => {
      const saved = savedResources.find(sr => sr.id === ci.saved_resource_id) || null;
      let resource = null;
      let title = '';
      let age_range_label = '';
      let thumbnail_image_url = '';
      let resource_type = saved ? saved.resource_type : '';

      if (saved && saved.resource_type === 'craft_activity') {
        resource = crafts.find(c => c.id === saved.resource_id) || null;
        if (resource) {
          title = resource.title || '';
          age_range_label = `${resource.min_age || ''}–${resource.max_age || ''}`;
          thumbnail_image_url = resource.thumbnail_image_url || '';
        }
      } else if (saved && saved.resource_type === 'lesson_plan') {
        resource = lessons.find(l => l.id === saved.resource_id) || null;
        if (resource) {
          title = resource.title || '';
          age_range_label = `${resource.min_age || ''}–${resource.max_age || ''}`;
          thumbnail_image_url = '';
        }
      }

      return {
        collection_item: this._clone(ci),
        saved_resource: saved ? { ...saved, resource } : null,
        title,
        resource_type,
        age_range_label,
        thumbnail_image_url
      };
    });

    return {
      collection: this._clone(collection),
      items: this._clone(items)
    };
  }

  // 16) renameResourceCollection(collectionId, new_name)

  renameResourceCollection(collectionId, new_name) {
    const collections = this._getFromStorage('resource_collections');
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return { success: false, collection: null, message: 'Collection not found.' };
    }
    collection.name = new_name || '';
    this._saveToStorage('resource_collections', collections);
    return { success: true, collection: this._clone(collection), message: 'Collection renamed.' };
  }

  // 17) deleteResourceCollection(collectionId)

  deleteResourceCollection(collectionId) {
    let collections = this._getFromStorage('resource_collections');
    const beforeCount = collections.length;
    collections = collections.filter(c => c.id !== collectionId);
    this._saveToStorage('resource_collections', collections);

    // Also remove related collection_items
    let collectionItems = this._getFromStorage('collection_items');
    collectionItems = collectionItems.filter(ci => ci.collection_id !== collectionId);
    this._saveToStorage('collection_items', collectionItems);

    const deleted = collections.length < beforeCount;
    return {
      success: deleted,
      message: deleted ? 'Collection deleted.' : 'Collection not found.'
    };
  }

  // 18) getLessonPlanFilterOptions

  getLessonPlanFilterOptions() {
    return {
      age_ranges: [
        { label: 'Ages 3–5', min_age: 3, max_age: 5 },
        { label: 'Ages 5–7', min_age: 5, max_age: 7 },
        { label: 'Ages 8–10', min_age: 8, max_age: 10 },
        { label: 'Ages 9–11', min_age: 9, max_age: 11 }
      ],
      topic_categories: [
        { value: 'teachings_of_jesus', label: 'Teachings of Jesus' },
        { value: 'old_testament', label: 'Old Testament' },
        { value: 'new_testament', label: 'New Testament' },
        { value: 'general_bible', label: 'General Bible' },
        { value: 'other', label: 'Other' }
      ],
      topic_subcategories: [
        { category_value: 'teachings_of_jesus', value: 'parables', label: 'Parables' },
        { category_value: 'teachings_of_jesus', value: 'miracles', label: 'Miracles' },
        { category_value: 'teachings_of_jesus', value: 'sermon_on_the_mount', label: 'Sermon on the Mount' },
        { category_value: 'new_testament', value: 'birth_of_jesus', label: 'Birth of Jesus' },
        { category_value: 'new_testament', value: 'easter', label: 'Easter' },
        { category_value: 'other', value: 'other', label: 'Other' }
      ],
      sort_options: [
        { value: 'most_downloaded', label: 'Most Downloaded' },
        { value: 'newest', label: 'Newest' }
      ]
    };
  }

  // 19) searchLessonPlans(filters, sort_by, page, page_size)

  searchLessonPlans(filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 20;
    filters = filters || {};

    let plans = this._getFromStorage('lesson_plans').filter(lp => lp.status === 'active');

    if (typeof filters.min_age === 'number' || typeof filters.max_age === 'number') {
      const fMin = typeof filters.min_age === 'number' ? filters.min_age : 0;
      const fMax = typeof filters.max_age === 'number' ? filters.max_age : Infinity;
      plans = plans.filter(lp => {
        const pMin = typeof lp.min_age === 'number' ? lp.min_age : 0;
        const pMax = typeof lp.max_age === 'number' ? lp.max_age : Infinity;
        return pMin <= fMax && pMax >= fMin;
      });
    }

    if (filters.topic_category) {
      plans = plans.filter(lp => lp.topic_category === filters.topic_category);
    }

    if (filters.topic_subcategory) {
      plans = plans.filter(lp => lp.topic_subcategory === filters.topic_subcategory);
    }

    if (filters.scripture_query) {
      const q = String(filters.scripture_query).toLowerCase();
      plans = plans.filter(lp => {
        const ref = (lp.scripture_reference || '').toLowerCase();
        const summary = (lp.summary || '').toLowerCase();
        const title = (lp.title || '').toLowerCase();
        return ref.includes(q) || summary.includes(q) || title.includes(q);
      });
    }

    if (typeof filters.max_duration_minutes === 'number') {
      plans = plans.filter(lp => (lp.estimated_duration_minutes || 0) <= filters.max_duration_minutes);
    }

    if (sort_by === 'most_downloaded') {
      plans.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    } else if (sort_by === 'newest') {
      plans.sort((a, b) => {
        const aid = parseInt(String(a.id).split('_').pop(), 10) || 0;
        const bid = parseInt(String(b.id).split('_').pop(), 10) || 0;
        return bid - aid;
      });
    }

    const total_count = plans.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = plans.slice(startIndex, startIndex + page_size);

    return {
      lesson_plans: this._clone(pageItems),
      total_count,
      page,
      page_size
    };
  }

  // 20) getLessonPlannerCalendar(month, year)

  getLessonPlannerCalendar(month, year) {
    const m = month - 1; // JS Date month 0-based
    const sundays = [];
    const date = new Date(year, m, 1);

    while (date.getMonth() === m) {
      if (date.getDay() === 0) {
        sundays.push(date.toISOString().slice(0, 10));
      }
      date.setDate(date.getDate() + 1);
    }

    return { sundays };
  }

  // 21) createLessonSeries(name, description, target_min_age, target_max_age, month, year, number_of_weeks)

  createLessonSeries(name, description, target_min_age, target_max_age, month, year, number_of_weeks) {
    const series = this._getFromStorage('lesson_series');
    const now = new Date().toISOString();

    const lesson_series = {
      id: this._generateId('series'),
      name: name || '',
      description: description || '',
      target_min_age: target_min_age,
      target_max_age: target_max_age,
      month: month,
      year: year,
      number_of_weeks: number_of_weeks || null,
      created_at: now
    };

    series.push(lesson_series);
    this._saveToStorage('lesson_series', series);

    return { success: true, lesson_series: this._clone(lesson_series), message: 'Lesson series created.' };
  }

  // 22) addLessonToSeries(lessonSeriesId, lessonPlanId, initial_week_number)

  addLessonToSeries(lessonSeriesId, lessonPlanId, initial_week_number) {
    const assignments = this._getFromStorage('series_lesson_assignments');

    const { next_display_order, next_week_number } = this._getNextDisplayOrderForSeries(lessonSeriesId);
    const week = typeof initial_week_number === 'number' && initial_week_number > 0
      ? initial_week_number
      : next_week_number;

    const series_lesson_assignment = {
      id: this._generateId('serassign'),
      lesson_series_id: lessonSeriesId,
      lesson_plan_id: lessonPlanId,
      week_number: week,
      scheduled_date: null,
      display_order: next_display_order
    };

    assignments.push(series_lesson_assignment);
    this._saveToStorage('series_lesson_assignments', assignments);

    return {
      success: true,
      series_lesson_assignment: this._clone(series_lesson_assignment),
      message: 'Lesson added to series.'
    };
  }

  // 23) getLessonSeriesList(filters)

  getLessonSeriesList(filters) {
    filters = filters || {};
    let series = this._getFromStorage('lesson_series');

    if (typeof filters.month === 'number') {
      series = series.filter(s => s.month === filters.month);
    }
    if (typeof filters.year === 'number') {
      series = series.filter(s => s.year === filters.year);
    }

    if (typeof filters.min_age === 'number' || typeof filters.max_age === 'number') {
      const fMin = typeof filters.min_age === 'number' ? filters.min_age : 0;
      const fMax = typeof filters.max_age === 'number' ? filters.max_age : Infinity;
      series = series.filter(s => {
        const sMin = typeof s.target_min_age === 'number' ? s.target_min_age : 0;
        const sMax = typeof s.target_max_age === 'number' ? s.target_max_age : Infinity;
        return sMin <= fMax && sMax >= fMin;
      });
    }

    return {
      series: this._clone(series),
      total_count: series.length
    };
  }

  // 24) getLessonSeriesDetail(lessonSeriesId)

  getLessonSeriesDetail(lessonSeriesId) {
    const series = this._getFromStorage('lesson_series');
    const assignments = this._getFromStorage('series_lesson_assignments');
    const lessons = this._getFromStorage('lesson_plans');

    const lesson_series = series.find(s => s.id === lessonSeriesId) || null;
    if (!lesson_series) {
      return { lesson_series: null, assignments: [], calendar_sundays: [] };
    }

    const assignmentsForSeries = assignments
      .filter(a => a.lesson_series_id === lessonSeriesId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const detailedAssignments = assignmentsForSeries.map(a => ({
      assignment: this._clone(a),
      lesson_plan: this._clone(lessons.find(l => l.id === a.lesson_plan_id) || null)
    }));

    const calendar = this.getLessonPlannerCalendar(lesson_series.month, lesson_series.year);

    return {
      lesson_series: this._clone(lesson_series),
      assignments: detailedAssignments,
      calendar_sundays: calendar.sundays
    };
  }

  // 25) updateSeriesLessonOrder(lessonSeriesId, assignments_order)

  updateSeriesLessonOrder(lessonSeriesId, assignments_order) {
    const allAssignments = this._getFromStorage('series_lesson_assignments');
    const updates = Array.isArray(assignments_order) ? assignments_order : [];

    for (const upd of updates) {
      const a = allAssignments.find(x => x.id === upd.assignment_id && x.lesson_series_id === lessonSeriesId);
      if (!a) continue;
      if (typeof upd.week_number === 'number') a.week_number = upd.week_number;
      if (typeof upd.display_order === 'number') a.display_order = upd.display_order;
      if (upd.scheduled_date) a.scheduled_date = upd.scheduled_date;
    }

    this._saveToStorage('series_lesson_assignments', allAssignments);

    const updatedAssignments = allAssignments.filter(a => a.lesson_series_id === lessonSeriesId);

    return {
      success: true,
      updated_assignments: this._clone(updatedAssignments),
      message: 'Series lesson order updated.'
    };
  }

  // 26) getProductCategories

  getProductCategories() {
    const categories = this._getFromStorage('product_categories');
    return this._clone(categories);
  }

  // 27) getProductFilterOptions(categoryId)

  getProductFilterOptions(categoryId) {
    let products = this._getFromStorage('products').filter(p => p.status === 'active');
    if (categoryId) {
      products = products.filter(p => p.category_id === categoryId);
    }

    const prices = products.map(p => p.price).filter(v => typeof v === 'number');
    const min_price = prices.length ? Math.min(...prices) : 0;
    const max_price = prices.length ? Math.max(...prices) : 0;

    return {
      age_ranges: [
        { label: 'Ages 3–5', min_age: 3, max_age: 5 },
        { label: 'Ages 6–8', min_age: 6, max_age: 8 },
        { label: 'Ages 9–11', min_age: 9, max_age: 11 }
      ],
      price_range: { min_price, max_price },
      sort_options: [
        { value: 'rating_high_to_low', label: 'Customer Rating: High to Low' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'newest', label: 'Newest' }
      ]
    };
  }

  // 28) searchProducts(query, filters, sort_by, page, page_size)

  searchProducts(query, filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 24;

    let products = this._getFromStorage('products').filter(p => p.status === 'active');

    if (query) {
      const q = String(query).toLowerCase();
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    products = this._applyProductFilters(products, filters || {}, sort_by);

    const total_count = products.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = products.slice(startIndex, startIndex + page_size);

    return {
      products: this._clone(pageItems),
      total_count,
      page,
      page_size
    };
  }

  // 29) getProductDetails(productId)

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        rating_summary: { rating_average: 0, rating_count: 0 },
        detailed_description: ''
      };
    }

    const category = categories.find(c => c.id === product.category_id) || null;

    const rating_summary = {
      rating_average: product.rating_average || 0,
      rating_count: product.rating_count || 0
    };

    return {
      product: this._clone(product),
      category: this._clone(category),
      rating_summary,
      detailed_description: product.description || ''
    };
  }

  // 30) addToCart(productId, quantity)

  addToCart(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, cart: null, cart_items: [], message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.line_subtotal = Math.round(cartItem.quantity * product.price * 100) / 100;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        line_subtotal: Math.round(product.price * quantity * 100) / 100
      };
      cartItems.push(cartItem);
    }

    cart.updated_at = new Date().toISOString();

    // Save
    const carts = this._getFromStorage('carts').map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart: this._clone(cart),
      cart_items: this._clone(itemsForCart),
      message: 'Item added to cart.'
    };
  }

  // 31) getCart()

  getCart() {
    const cartId = localStorage.getItem('current_cart_id') || '';
    const carts = this._getFromStorage('carts');
    const cart = cartId ? carts.find(c => c.id === cartId) : null;

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        estimated_tax: 0,
        shipping_estimate: 0,
        total: 0
      };
    }

    const cartItems = this._getCartItemsForCart(cart.id);
    const products = this._getFromStorage('products');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const ageRange = product && typeof product.min_age === 'number' && typeof product.max_age === 'number'
        ? `${product.min_age}–${product.max_age}`
        : '';
      const line_subtotal = typeof ci.line_subtotal === 'number'
        ? ci.line_subtotal
        : (ci.unit_price || 0) * (ci.quantity || 0);

      return {
        cart_item: this._clone(ci),
        product: this._clone(product),
        age_range_label: ageRange,
        line_subtotal
      };
    });

    const totals = this._recalculateCartTotals(cart, cartItems);

    return {
      cart: this._clone(cart),
      items: this._clone(items),
      subtotal: totals.subtotal,
      estimated_tax: totals.estimated_tax,
      shipping_estimate: totals.shipping_estimate,
      total: totals.total
    };
  }

  // 32) updateCartItemQuantity(cartItemId, quantity)

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity);
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, cart: null, cart_items: [], message: 'Cart item not found.' };
    }

    const product = products.find(p => p.id === cartItem.product_id) || null;
    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      cartItem.quantity = quantity;
      cartItem.line_subtotal = Math.round((product ? product.price : 0) * quantity * 100) / 100;
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart timestamp
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartItem.cart_id) || null;
    if (cart) {
      cart.updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts.map(c => (c.id === cart.id ? cart : c)));
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === (cart ? cart.id : null));

    return {
      success: true,
      cart: this._clone(cart),
      cart_items: this._clone(itemsForCart),
      message: quantity <= 0 ? 'Item removed from cart.' : 'Cart updated.'
    };
  }

  // 33) removeCartItem(cartItemId)

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, cart: null, cart_items: [], message: 'Cart item not found.' };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartItem.cart_id) || null;
    if (cart) {
      cart.updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts.map(c => (c.id === cart.id ? cart : c)));
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === (cart ? cart.id : null));

    return {
      success: true,
      cart: this._clone(cart),
      cart_items: this._clone(itemsForCart),
      message: 'Item removed from cart.'
    };
  }

  // 34) getVolunteerFilterOptions

  getVolunteerFilterOptions() {
    return {
      serve_types: [
        { value: 'in_person', label: 'In-Person' },
        { value: 'online', label: 'Online' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      role_focuses: [
        { value: 'work_directly_with_children', label: 'Work Directly with Children' },
        { value: 'admin_support', label: 'Administrative Support' },
        { value: 'events_team', label: 'Events Team' },
        { value: 'other', label: 'Other' }
      ],
      days_of_week: [
        { value: 'sunday', label: 'Sunday' },
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' }
      ],
      time_blocks: [
        { value: 'morning_8_12', label: 'Morning (8am–12pm)' },
        { value: 'afternoon_12_5', label: 'Afternoon (12pm–5pm)' },
        { value: 'evening_5_9', label: 'Evening (5pm–9pm)' },
        { value: 'other', label: 'Other' }
      ],
      sort_options: [
        { value: 'distance', label: 'Closest First' },
        { value: 'relevance', label: 'Best Match' }
      ]
    };
  }

  // 35) searchVolunteerOpportunities(filters, sort_by, page, page_size)

  searchVolunteerOpportunities(filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 20;

    const allOpps = this._getFromStorage('volunteer_opportunities');
    const campuses = this._getFromStorage('campus_sites');

    const filtered = this._applyVolunteerFilters(allOpps, filters || {}, sort_by);

    const startIndex = (page - 1) * page_size;
    const pageItems = filtered.slice(startIndex, startIndex + page_size).map(o => ({
      ...o,
      campus_site: o.campus_site_id ? (campuses.find(c => c.id === o.campus_site_id) || null) : null
    }));

    return {
      opportunities: this._clone(pageItems),
      total_count: filtered.length,
      page,
      page_size
    };
  }

  // 36) getVolunteerOpportunityDetails(volunteerOpportunityId)

  getVolunteerOpportunityDetails(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const campuses = this._getFromStorage('campus_sites');
    const timeSlots = this._getFromStorage('volunteer_time_slots');

    const opportunity = opportunities.find(o => o.id === volunteerOpportunityId) || null;
    if (!opportunity) {
      return { opportunity: null, campus_site: null, time_slots: [] };
    }

    const campus_site = opportunity.campus_site_id
      ? campuses.find(c => c.id === opportunity.campus_site_id) || null
      : null;

    const slots = timeSlots
      .filter(ts => ts.volunteer_opportunity_id === opportunity.id)
      .map(ts => ({ ...ts, opportunity })); // FK resolution

    return {
      opportunity: this._clone({ ...opportunity, campus_site }),
      campus_site: this._clone(campus_site),
      time_slots: this._clone(slots)
    };
  }

  // 37) submitVolunteerApplication(volunteerOpportunityId, campusSiteId, selectedTimeSlotId, full_name, email, phone, availability_notes)

  submitVolunteerApplication(volunteerOpportunityId, campusSiteId, selectedTimeSlotId, full_name, email, phone, availability_notes) {
    const applications = this._getFromStorage('volunteer_applications');

    const volunteer_application = {
      id: this._generateId('volapp'),
      volunteer_opportunity_id: volunteerOpportunityId,
      campus_site_id: campusSiteId || null,
      selected_time_slot_id: selectedTimeSlotId || null,
      full_name: full_name || '',
      email: email || '',
      phone: phone || '',
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      notes: availability_notes || ''
    };

    applications.push(volunteer_application);
    this._saveToStorage('volunteer_applications', applications);

    return {
      success: true,
      volunteer_application: this._clone(volunteer_application),
      message: 'Volunteer application submitted.'
    };
  }

  // 38) getChildSponsorshipFilterOptions

  getChildSponsorshipFilterOptions() {
    return {
      age_ranges: [
        { label: 'Ages 3–5', min_age: 3, max_age: 5 },
        { label: 'Ages 6–9', min_age: 6, max_age: 9 },
        { label: 'Ages 10–12', min_age: 10, max_age: 12 }
      ],
      monthly_amount_range: {
        min_amount: 20,
        max_amount: 60
      },
      interest_tags: [
        { value: 'reading_and_bible_stories', label: 'Reading & Bible Stories' },
        { value: 'sports', label: 'Sports' },
        { value: 'music', label: 'Music' },
        { value: 'art', label: 'Art' },
        { value: 'other', label: 'Other' }
      ],
      sort_options: [
        { value: 'longest_waiting', label: 'Longest Waiting' },
        { value: 'youngest_first', label: 'Youngest First' }
      ]
    };
  }

  // 39) searchChildProfiles(filters, sort_by, page, page_size)

  searchChildProfiles(filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 20;
    filters = filters || {};

    let children = this._getFromStorage('child_profiles').filter(c => c.status === 'available');
    const interestTags = this._getFromStorage('child_interest_tags');

    if (typeof filters.min_age === 'number') {
      children = children.filter(c => c.age >= filters.min_age);
    }
    if (typeof filters.max_age === 'number') {
      children = children.filter(c => c.age <= filters.max_age);
    }

    if (typeof filters.min_monthly_amount === 'number') {
      children = children.filter(c => c.default_monthly_amount >= filters.min_monthly_amount);
    }
    if (typeof filters.max_monthly_amount === 'number') {
      children = children.filter(c => c.default_monthly_amount <= filters.max_monthly_amount);
    }

    if (Array.isArray(filters.interests) && filters.interests.length) {
      children = children.filter(c => {
        const tags = interestTags.filter(t => t.child_profile_id === c.id).map(t => t.interest);
        return filters.interests.some(i => tags.includes(i));
      });
    }

    if (filters.country) {
      const country = String(filters.country).toLowerCase();
      children = children.filter(c => (c.country || '').toLowerCase() === country);
    }

    if (sort_by === 'longest_waiting') {
      children.sort((a, b) => {
        const da = a.date_listed ? new Date(a.date_listed) : new Date(0);
        const db = b.date_listed ? new Date(b.date_listed) : new Date(0);
        return da - db;
      });
    } else if (sort_by === 'youngest_first') {
      children.sort((a, b) => (a.age || 0) - (b.age || 0));
    }

    const total_count = children.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = children.slice(startIndex, startIndex + page_size);

    return {
      child_profiles: this._clone(pageItems),
      total_count,
      page,
      page_size
    };
  }

  // 40) getChildProfileDetails(childProfileId)

  getChildProfileDetails(childProfileId) {
    const children = this._getFromStorage('child_profiles');
    const interestTags = this._getFromStorage('child_interest_tags');

    const child_profile = children.find(c => c.id === childProfileId) || null;
    if (!child_profile) {
      return { child_profile: null, interests: [] };
    }

    const interests = interestTags.filter(t => t.child_profile_id === child_profile.id);

    return {
      child_profile: this._clone(child_profile),
      interests: this._clone(interests)
    };
  }

  // 41) createSponsorship(childProfileId, monthly_amount, start_date, payment_method, sponsor_full_name, sponsor_email)

  createSponsorship(childProfileId, monthly_amount, start_date, payment_method, sponsor_full_name, sponsor_email) {
    const sponsorships = this._getFromStorage('sponsorships');
    const children = this._getFromStorage('child_profiles');

    const child = children.find(c => c.id === childProfileId);
    if (!child) {
      return { success: false, sponsorship: null, message: 'Child profile not found.' };
    }

    const now = new Date().toISOString();

    const sponsorship = {
      id: this._generateId('sponsorship'),
      child_profile_id: childProfileId,
      sponsor_full_name: sponsor_full_name || '',
      sponsor_email: sponsor_email || '',
      monthly_amount,
      frequency: 'monthly',
      start_date: start_date || now,
      payment_method,
      status: payment_method === 'online_card' ? 'active' : 'pending',
      created_at: now
    };

    sponsorships.push(sponsorship);
    this._saveToStorage('sponsorships', sponsorships);

    // Optionally mark child as sponsored
    child.status = 'sponsored';
    this._saveToStorage('child_profiles', children);

    return {
      success: true,
      sponsorship: this._clone(sponsorship),
      message: 'Sponsorship created.'
    };
  }

  // 42) getNewsletterOptions

  getNewsletterOptions() {
    return {
      topics: [
        { value: 'family_devotions', label: 'Family Devotions' },
        { value: 'helping_kids_pray', label: 'Helping Kids Pray' },
        { value: 'behavior_and_discipline', label: 'Behavior & Discipline' },
        { value: 'faith_conversations', label: 'Faith Conversations' },
        { value: 'other', label: 'Other' }
      ],
      email_frequencies: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Every Other Week' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' }
      ],
      communication_preferences: [
        { value: 'email_only', label: 'Email only' },
        { value: 'email_and_sms', label: 'Email and SMS' },
        { value: 'postal_mail', label: 'Postal mail' }
      ]
    };
  }

  // 43) createNewsletterSubscription(email, child_ages, topics, email_frequency, communication_preference, send_age_specific_ideas)

  createNewsletterSubscription(email, child_ages, topics, email_frequency, communication_preference, send_age_specific_ideas) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const agesTable = this._getFromStorage('newsletter_child_ages');
    const topicPrefs = this._getFromStorage('newsletter_topic_preferences');

    const now = new Date().toISOString();

    const subscription = {
      id: this._generateId('nls'),
      email: email || '',
      email_frequency,
      communication_preference,
      send_age_specific_ideas: !!send_age_specific_ideas,
      created_at: now,
      status: 'active'
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    const child_age_records = [];
    const ages = Array.isArray(child_ages) ? child_ages : [];
    for (const age of ages) {
      const rec = {
        id: this._generateId('nlsage'),
        newsletter_subscription_id: subscription.id,
        child_age: age
      };
      agesTable.push(rec);
      child_age_records.push(rec);
    }

    const topic_preferences = [];
    const tps = Array.isArray(topics) ? topics : [];
    for (const topic of tps) {
      const tp = {
        id: this._generateId('nlstopic'),
        newsletter_subscription_id: subscription.id,
        topic
      };
      topicPrefs.push(tp);
      topic_preferences.push(tp);
    }

    this._saveToStorage('newsletter_child_ages', agesTable);
    this._saveToStorage('newsletter_topic_preferences', topicPrefs);

    return {
      success: true,
      subscription: this._clone(subscription),
      child_age_records: this._clone(child_age_records),
      topic_preferences: this._clone(topic_preferences),
      message: 'Newsletter subscription created.'
    };
  }

  // 44) submitContactForm(name, email, subject, message, contact_reason)

  submitContactForm(name, email, subject, message, contact_reason) {
    // No persistence required per spec; just simulate success.
    return {
      success: true,
      message: 'Thank you for contacting us. We\'ll respond as soon as we can.'
    };
  }

  // 45) getPolicySummaries

  getPolicySummaries() {
    return {
      policies: [
        {
          policy_key: 'privacy',
          title: 'Privacy Policy',
          summary: 'We respect your privacy and only use your information to support ministry activities and communication you request.',
          last_updated: '2024-01-01'
        },
        {
          policy_key: 'data_use',
          title: 'Data Use & Security',
          summary: 'We store personal data securely and never sell or rent your information to third parties.',
          last_updated: '2024-01-01'
        },
        {
          policy_key: 'terms_of_use',
          title: 'Terms of Use',
          summary: 'By using this site, you agree to use resources for non-commercial ministry and personal use only.',
          last_updated: '2024-01-01'
        }
      ]
    };
  }
}

// Global exports for browser and Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
