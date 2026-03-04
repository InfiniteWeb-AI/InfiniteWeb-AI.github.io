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
  }

  // =============== STORAGE & ID HELPERS ===============

  _initStorage() {
    const tables = [
      'camp_sessions',
      'add_ons',
      'camp_registrations',
      'transportation_options',
      'transportation_selections',
      'products',
      'carts',
      'cart_items',
      'discount_codes',
      'articles',
      'packing_checklists',
      'checklist_items',
      'notes',
      'financial_aid_programs',
      'wishlists',
      'wishlist_items',
      'contact_inquiries'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }

    if (!localStorage.getItem('default_wishlist_id')) {
      localStorage.setItem('default_wishlist_id', '');
    }

    if (!localStorage.getItem('guardian_contact')) {
      localStorage.setItem('guardian_contact', JSON.stringify(null));
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr);
  }

  // =============== PRIVATE HELPERS (SPECIFIED) ===============

  // Internal helper to retrieve the current cart from storage or create a new open cart.
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
      if (cart && cart.status === 'submitted') {
        cart = null;
      }
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        item_ids: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_discount_code: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getCartById(cartId) {
    const carts = this._getFromStorage('carts');
    return carts.find(c => c.id === cartId) || null;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  // Internal helper to recalculate subtotal, discounts, and total for a cart whenever items change.
  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += Number(item.line_subtotal || 0);
    }
    cart.subtotal = subtotal;

    let discount_total = 0;

    if (cart.applied_discount_code) {
      const discountCodes = this._getFromStorage('discount_codes');
      const codeRecord = discountCodes.find(dc => String(dc.code).toLowerCase() === String(cart.applied_discount_code).toLowerCase() && dc.is_active !== false);
      if (codeRecord) {
        const now = new Date();
        if (codeRecord.valid_from) {
          const from = new Date(codeRecord.valid_from);
          if (now < from) {
            // not yet valid
          } else {
            // ok so far
          }
        }
        let withinValidity = true;
        if (codeRecord.valid_from) {
          const from = new Date(codeRecord.valid_from);
          if (now < from) withinValidity = false;
        }
        if (codeRecord.valid_to) {
          const to = new Date(codeRecord.valid_to);
          if (now > to) withinValidity = false;
        }

        if (withinValidity) {
          // Determine applicable subtotal by scope
          let applicableSubtotal = 0;
          if (codeRecord.applicable_scope === 'camp_sessions_only') {
            for (const item of cartItems) {
              if (item.item_type === 'camp_registration') {
                applicableSubtotal += Number(item.line_subtotal || 0);
              }
            }
          } else if (codeRecord.applicable_scope === 'merchandise_only') {
            for (const item of cartItems) {
              if (item.item_type === 'merchandise') {
                applicableSubtotal += Number(item.line_subtotal || 0);
              }
            }
          } else {
            applicableSubtotal = subtotal;
          }

          if (codeRecord.min_cart_total && applicableSubtotal < codeRecord.min_cart_total) {
            applicableSubtotal = 0;
          }

          if (applicableSubtotal > 0) {
            if (codeRecord.discount_type === 'percentage') {
              discount_total = applicableSubtotal * (Number(codeRecord.value) / 100);
            } else if (codeRecord.discount_type === 'fixed_amount') {
              discount_total = Math.min(applicableSubtotal, Number(codeRecord.value));
            }
          }
        }
      }
    }

    cart.discount_total = discount_total;
    cart.total = Math.max(0, subtotal - discount_total);
    cart.updated_at = this._now();
    this._saveCart(cart);

    return cart;
  }

  // Internal helper to load the current wishlist or create a default one.
  _findOrCreateDefaultWishlist(optionalName) {
    const wishlists = this._getFromStorage('wishlists');
    let defaultId = localStorage.getItem('default_wishlist_id') || '';
    let wishlist = null;

    if (defaultId) {
      wishlist = wishlists.find(w => w.id === defaultId) || null;
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: optionalName || 'My Wishlist',
        item_ids: [],
        created_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('default_wishlist_id', wishlist.id);
    } else if (optionalName && optionalName !== wishlist.name) {
      // Optionally rename when explicitly requested
      wishlist.name = optionalName;
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx >= 0) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    return wishlist;
  }

  // Internal helper to validate camper age against a camp session's age range and return eligibility info.
  _validateCamperAgeForSession(session, camperAge) {
    if (!session) {
      return {
        age_eligible: false,
        eligibility_message: 'Session not found.'
      };
    }

    if (camperAge < session.age_min) {
      return {
        age_eligible: false,
        eligibility_message: 'Camper is younger than the minimum age for this session.'
      };
    }

    if (camperAge > session.age_max) {
      return {
        age_eligible: false,
        eligibility_message: 'Camper is older than the maximum age for this session.'
      };
    }

    return {
      age_eligible: true,
      eligibility_message: 'Camper is eligible for this session.'
    };
  }

  // Helpers for labels
  _categoryLabel(category_id) {
    const map = {
      day_camps: 'Day Camps',
      week_long_camps: 'Week-Long Camps',
      overnight_camps: 'Overnight Camps',
      workshops: 'Workshops',
      themes: 'Camp Themes'
    };
    return map[category_id] || category_id || '';
  }

  _sessionTypeLabel(session_type) {
    const map = {
      day_camp: 'Day Camp',
      week_long_camp: 'Week-Long Camp',
      overnight_camp: 'Overnight Camp',
      workshop: 'Workshop',
      theme_only: 'Theme'
    };
    return map[session_type] || session_type || '';
  }

  _timeOfDayLabel(time_of_day) {
    const map = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      full_day: 'Full Day',
      evening: 'Evening'
    };
    return map[time_of_day] || '';
  }

  _ageRangeLabel(session) {
    if (!session) return '';
    return session.age_min + '–' + session.age_max;
  }

  _dateRangeLabel(session) {
    if (!session) return '';
    const start = this._parseDate(session.start_date);
    const end = this._parseDate(session.end_date);
    if (!start || !end) return '';
    const opts = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString(undefined, opts);
    const endStr = end.toLocaleDateString(undefined, opts);
    return startStr + ' – ' + endStr;
  }

  // =============== CORE INTERFACE IMPLEMENTATIONS ===============

  // -------- Homepage / About --------

  getHomepageOverview() {
    const sessions = this._getFromStorage('camp_sessions').filter(s => s.is_active !== false);

    // Featured camp types based on existing categories
    const byCategory = {};
    for (const s of sessions) {
      if (!byCategory[s.category_id]) {
        byCategory[s.category_id] = true;
      }
    }

    const featured_camp_types = Object.keys(byCategory).map(category_id => ({
      category_id,
      category_label: this._categoryLabel(category_id),
      headline: this._categoryLabel(category_id),
      blurb: 'Explore ' + this._categoryLabel(category_id).toLowerCase() + ' in the great outdoors.'
    }));

    const quick_links = [
      { key: 'day_camps', label: 'Day Camps', description: 'Sun-up to afternoon adventures in nature.' },
      { key: 'overnight_camps', label: 'Overnight Camps', description: 'Sleep under the stars with our trained staff.' },
      { key: 'workshops', label: 'Workshops', description: 'Half-day specialty nature programs.' },
      { key: 'store', label: 'Camp Store', description: 'Gear up with logo shirts, hats, and bottles.' },
      { key: 'resources', label: 'Parent Resources', description: 'Packing lists, policies, and more.' }
    ];

    // Seasonal promos: derive months where we have sessions
    const monthMap = {};
    for (const s of sessions) {
      const d = this._parseDate(s.start_date);
      if (!d) continue;
      const monthLabel = d.toLocaleDateString(undefined, { month: 'long' });
      if (!monthMap[monthLabel]) {
        monthMap[monthLabel] = new Set();
      }
      monthMap[monthLabel].add(s.category_id);
    }

    const seasonal_promos = [];
    for (const monthLabel of Object.keys(monthMap)) {
      const categories = Array.from(monthMap[monthLabel]);
      for (const category_id of categories) {
        seasonal_promos.push({
          promo_id: this._generateId('promo'),
          title: monthLabel + ' ' + this._categoryLabel(category_id),
          description: 'Plan ahead for ' + monthLabel + ' ' + this._categoryLabel(category_id).toLowerCase() + '.',
          highlight_month: monthLabel,
          related_category_id: category_id,
          related_category_label: this._categoryLabel(category_id)
        });
      }
    }

    return { featured_camp_types, quick_links, seasonal_promos };
  }

  getAboutOverview() {
    const mission_text = 'Our outdoor nature camp helps kids build confidence, curiosity, and a lifelong love of the natural world.';
    const outdoor_focus_text = 'Every program is primarily outdoors, with hands-on exploration in forests, fields, and along the water.';
    const staff_qualifications_summary = 'Counselors are trained in youth development, outdoor education, and first aid/CPR.';
    const safety_overview = 'We maintain low camper-to-staff ratios, follow clear safety procedures, and communicate proactively with families.';
    const health_allergy_highlights = 'We take allergies seriously, including nut-sensitive snack practices and detailed health forms for each camper.';

    const program_types_summary = [
      { category_id: 'day_camps', label: 'Day Camps', description: 'Week-based day programs with nature games, hikes, and crafts.' },
      { category_id: 'week_long_camps', label: 'Week-Long Camps', description: 'Structured week-long adventures with consistent groups and themes.' },
      { category_id: 'overnight_camps', label: 'Overnight Camps', description: 'Multi-night campouts with campfires, night hikes, and cabin time.' },
      { category_id: 'workshops', label: 'Workshops', description: 'Half-day focused intensives on topics like tracking or survival skills.' }
    ];

    const important_links = [
      { key: 'financial_aid', label: 'Financial Aid & Scholarships' },
      { key: 'packing', label: 'Packing Lists' },
      { key: 'health_allergy', label: 'Health & Allergy Policies' }
    ];

    return {
      mission_text,
      outdoor_focus_text,
      staff_qualifications_summary,
      safety_overview,
      health_allergy_highlights,
      program_types_summary,
      important_links
    };
  }

  // -------- Camp search & details --------

  getCampSearchFilterOptions() {
    // Some filter options can be static; they are configuration, not content data.
    const age_ranges = [
      { min_age: 5, max_age: 7, label: '5–7' },
      { min_age: 7, max_age: 9, label: '7–9' },
      { min_age: 8, max_age: 10, label: '8–10' },
      { min_age: 9, max_age: 12, label: '9–12' },
      { min_age: 11, max_age: 13, label: '11–13' },
      { min_age: 13, max_age: 15, label: '13–15' }
    ];

    const camp_types = [
      { category_id: 'day_camps', label: 'Day Camps' },
      { category_id: 'week_long_camps', label: 'Week-Long Camps' },
      { category_id: 'overnight_camps', label: 'Overnight Camps' },
      { category_id: 'workshops', label: 'Workshops' },
      { category_id: 'themes', label: 'Camp Themes' }
    ];

    const months = ['june', 'july', 'august'];

    const price_ranges = [
      { min_price: 0, max_price: 200, label: 'Up to $200' },
      { min_price: 0, max_price: 350, label: 'Up to $350' },
      { min_price: 0, max_price: 500, label: 'Up to $500' },
      { min_price: 0, max_price: 800, label: 'Up to $800' }
    ];

    const durations = [
      { duration_days: 1, label: 'Single Day' },
      { duration_days: 5, label: '5 Days' },
      { duration_days: 7, label: '1 Week+' }
    ];

    const rating_options = [3, 4, 4.5, 5];

    const time_of_day_options = ['morning', 'afternoon', 'full_day', 'evening'];

    const sort_options = [
      { sort_key: 'price_asc', label: 'Price: Low to High' },
      { sort_key: 'price_desc', label: 'Price: High to Low' },
      { sort_key: 'rating_desc', label: 'Rating: High to Low' },
      { sort_key: 'start_date_asc', label: 'Start Date: Soonest' }
    ];

    return {
      camp_types,
      age_ranges,
      months,
      price_ranges,
      durations,
      rating_options,
      time_of_day_options,
      sort_options
    };
  }

  searchCampSessions(
    category_id,
    age_min,
    age_max,
    month,
    start_date,
    max_price,
    min_rating,
    duration_days,
    time_of_day,
    only_half_day,
    sort_by
  ) {
    let sessions = this._getFromStorage('camp_sessions').filter(s => s.is_active !== false);

    if (category_id) {
      sessions = sessions.filter(s => s.category_id === category_id);
    }

    if (typeof age_min === 'number' && typeof age_max === 'number') {
      // Overlapping age range logic
      sessions = sessions.filter(s => s.age_min <= age_max && s.age_max >= age_min);
    }

    if (month) {
      const monthLower = String(month).toLowerCase();
      sessions = sessions.filter(s => {
        const d = this._parseDate(s.start_date);
        if (!d) return false;
        const m = d.toLocaleDateString(undefined, { month: 'long' }).toLowerCase();
        return m.indexOf(monthLower) !== -1;
      });
    }

    if (start_date) {
      const target = String(start_date).slice(0, 10);
      sessions = sessions.filter(s => String(s.start_date).slice(0, 10) === target);
    }

    if (typeof max_price === 'number') {
      sessions = sessions.filter(s => Number(s.price) <= max_price);
    }

    if (typeof min_rating === 'number') {
      sessions = sessions.filter(s => typeof s.rating_average === 'number' && s.rating_average >= min_rating);
    }

    if (typeof duration_days === 'number') {
      sessions = sessions.filter(s => Number(s.duration_days) === duration_days);
    }

    if (time_of_day) {
      sessions = sessions.filter(s => s.time_of_day === time_of_day);
    }

    if (only_half_day) {
      sessions = sessions.filter(s => s.is_half_day === true);
    }

    // Sorting
    if (sort_by === 'price_asc') {
      const coversRange = (s) => (typeof age_min === 'number' && typeof age_max === 'number'
        ? s.age_min <= age_min && s.age_max >= age_max
        : false);
      sessions.sort((a, b) => {
        const aCovers = coversRange(a);
        const bCovers = coversRange(b);
        if (aCovers && !bCovers) return -1;
        if (!aCovers && bCovers) return 1;
        return Number(a.price) - Number(b.price);
      });
    } else if (sort_by === 'price_desc') {
      sessions.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort_by === 'rating_desc') {
      sessions.sort((a, b) => (Number(b.rating_average || 0) - Number(a.rating_average || 0)));
    } else if (sort_by === 'start_date_asc') {
      sessions.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return da - db;
      });
    }

    // Map to API shape
    return sessions.map(s => {
      const capacity_remaining = typeof s.capacity_remaining === 'number' ? s.capacity_remaining : null;
      const is_sold_out = capacity_remaining !== null && capacity_remaining <= 0;
      const highlight_badges = [];
      if (s.rating_average && s.rating_average >= 4.5) highlight_badges.push('top_rated');
      if (!is_sold_out && capacity_remaining !== null && capacity_remaining <= 5) highlight_badges.push('filling_fast');

      const dStart = s.start_date ? String(s.start_date) : null;
      const dEnd = s.end_date ? String(s.end_date) : null;

      return {
        id: s.id,
        name: s.name,
        theme_name: s.theme_name || null,
        category_id: s.category_id,
        category_label: this._categoryLabel(s.category_id),
        session_type: s.session_type,
        session_type_label: this._sessionTypeLabel(s.session_type),
        age_min: s.age_min,
        age_max: s.age_max,
        age_range_label: this._ageRangeLabel(s),
        start_date: dStart,
        end_date: dEnd,
        duration_days: s.duration_days,
        is_half_day: s.is_half_day,
        time_of_day: s.time_of_day || null,
        time_of_day_label: this._timeOfDayLabel(s.time_of_day),
        daily_start_time: s.daily_start_time || null,
        daily_end_time: s.daily_end_time || null,
        location_name: s.location_name || null,
        price: s.price,
        currency: s.currency || 'USD',
        rating_average: s.rating_average || null,
        rating_count: s.rating_count || 0,
        tags: s.tags || [],
        capacity_remaining,
        is_sold_out,
        highlight_badges
      };
    });
  }

  getCampSessionDetails(camp_session_id) {
    const sessions = this._getFromStorage('camp_sessions');
    const session = sessions.find(s => s.id === camp_session_id) || null;

    if (!session) {
      return {
        session: null,
        category_label: '',
        session_type_label: '',
        age_range_label: '',
        date_range_label: '',
        daily_schedule: [],
        add_ons: [],
        transportation_available: false,
        transportation_summary: [],
        related_sessions: []
      };
    }

    const addOns = this._getFromStorage('add_ons').filter(a => a.camp_session_id === session.id && a.is_active !== false);
    const transportOptions = this._getFromStorage('transportation_options').filter(o => o.camp_session_id === session.id && o.is_active !== false);

    // Generate a simple daily schedule based on duration and daily start/end time
    const daily_schedule = [];
    const start = this._parseDate(session.start_date);
    const duration = Number(session.duration_days) || 0;
    for (let i = 0; i < duration; i++) {
      const dayDate = start ? new Date(start.getTime() + i * 24 * 60 * 60 * 1000) : null;
      const dayLabel = dayDate
        ? dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : 'Day ' + (i + 1);
      daily_schedule.push({
        day_label: dayLabel,
        start_time: session.daily_start_time || null,
        end_time: session.daily_end_time || null,
        description: 'Outdoor camp activities.'
      });
    }

    const transportation_available = transportOptions.length > 0;
    const transportation_summary = transportOptions.map(o => ({
      pickup_location_name: o.pickup_location_name,
      departure_time: o.departure_time,
      trip_type: o.trip_type,
      price: o.price
    }));

    const related_sessions = sessions.filter(s => s.id !== session.id && s.category_id === session.category_id && s.is_active !== false);

    // Instrumentation for task completion tracking
    try {
      const s = session;
      if (s && s.category_id === 'themes') {
        const ageOverlap = s.age_min <= 9 && s.age_max >= 7;
        const priceOk = Number(s.price) < 375;
        const d = this._parseDate(s.start_date);
        let inJuly = false;
        if (d) {
          const monthLabel = d.toLocaleDateString(undefined, { month: 'long' }).toLowerCase();
          inJuly = monthLabel === 'july';
        }
        if (ageOverlap && priceOk && inJuly) {
          let existing = null;
          try {
            const raw = localStorage.getItem('task2_comparedSessionIds');
            existing = raw ? JSON.parse(raw) : null;
          } catch (e) {
            existing = null;
          }
          let ids = [];
          if (existing && Array.isArray(existing.ids)) {
            ids = existing.ids;
          }
          if (ids.indexOf(s.id) === -1) {
            ids.push(s.id);
            localStorage.setItem('task2_comparedSessionIds', JSON.stringify({ ids: ids }));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      session,
      category_label: this._categoryLabel(session.category_id),
      session_type_label: this._sessionTypeLabel(session.session_type),
      age_range_label: this._ageRangeLabel(session),
      date_range_label: this._dateRangeLabel(session),
      daily_schedule,
      add_ons: addOns,
      transportation_available,
      transportation_summary,
      related_sessions
    };
  }

  // -------- Camp registration & cart integration --------

  createCampRegistrationDraft(camp_session_id, camper_name, camper_age) {
    const sessions = this._getFromStorage('camp_sessions');
    const session = sessions.find(s => s.id === camp_session_id) || null;

    const validation = this._validateCamperAgeForSession(session, camper_age);
    const base_price = session ? Number(session.price) : 0;

    const registration = {
      id: this._generateId('reg'),
      camp_session_id,
      camper_name,
      camper_age,
      base_price,
      selected_add_on_ids: [],
      transportation_selection_id: null,
      total_price: base_price,
      status: 'in_cart'
    };

    const registrations = this._getFromStorage('camp_registrations');
    registrations.push(registration);
    this._saveToStorage('camp_registrations', registrations);

    const available_add_ons = this._getFromStorage('add_ons').filter(a => a.camp_session_id === camp_session_id && a.is_active !== false);

    const price_summary = {
      base_price,
      add_ons_total: 0,
      total_price: base_price
    };

    return {
      registration,
      age_eligible: validation.age_eligible,
      eligibility_message: validation.eligibility_message,
      available_add_ons,
      price_summary
    };
  }

  updateCampRegistrationAddOns(camp_registration_id, selected_add_on_ids) {
    const registrations = this._getFromStorage('camp_registrations');
    const regIdx = registrations.findIndex(r => r.id === camp_registration_id);
    if (regIdx === -1) {
      return {
        registration: null,
        selected_add_ons: [],
        price_summary: { base_price: 0, add_ons_total: 0, total_price: 0 }
      };
    }

    const registration = registrations[regIdx];
    const addOns = this._getFromStorage('add_ons');

    const validAddOns = addOns.filter(a =>
      selected_add_on_ids.includes(a.id) &&
      a.camp_session_id === registration.camp_session_id &&
      a.is_active !== false
    );

    const addOnIds = validAddOns.map(a => a.id);
    let add_ons_total = 0;
    for (const a of validAddOns) {
      add_ons_total += Number(a.price) || 0;
    }

    registration.selected_add_on_ids = addOnIds;
    const base_price = Number(registration.base_price) || 0;
    registration.total_price = base_price + add_ons_total;

    registrations[regIdx] = registration;
    this._saveToStorage('camp_registrations', registrations);

    const price_summary = {
      base_price,
      add_ons_total,
      total_price: registration.total_price
    };

    return {
      registration,
      selected_add_ons: validAddOns,
      price_summary
    };
  }

  addCampRegistrationToCart(camp_registration_id, start_another_for_same_session) {
    const registrations = this._getFromStorage('camp_registrations');
    const registration = registrations.find(r => r.id === camp_registration_id) || null;
    if (!registration) {
      return {
        success: false,
        cart_id: null,
        cart_summary: { item_count: 0, subtotal: 0, total: 0 },
        next_step: 'error',
        message: 'Registration not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const session = this._getFromStorage('camp_sessions').find(s => s.id === registration.camp_session_id) || null;

    // Instrumentation for task completion tracking
    try {
      const s = session;
      if (s && s.category_id === 'themes') {
        const ageOverlap = s.age_min <= 9 && s.age_max >= 7;
        const priceOk = Number(s.price) < 375;
        const d = this._parseDate(s.start_date);
        let inJuly = false;
        if (d) {
          const monthLabel = d.toLocaleDateString(undefined, { month: 'long' }).toLowerCase();
          inJuly = monthLabel === 'july';
        }
        if (ageOverlap && priceOk && inJuly) {
          localStorage.setItem('task2_selectedSessionId', s.id);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const description = session ? (session.name + ' - ' + registration.camper_name) : ('Camp registration - ' + registration.camper_name);

    const unit_price = Number(registration.total_price) || 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'camp_registration',
      ref_id: registration.id,
      quantity: 1,
      unit_price,
      line_subtotal: unit_price,
      description,
      selected_options: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);

    registration.status = 'pending_checkout';
    const regIdx = registrations.findIndex(r => r.id === registration.id);
    if (regIdx >= 0) {
      registrations[regIdx] = registration;
      this._saveToStorage('camp_registrations', registrations);
    }

    this._recalculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart_id: cart.id,
      cart_summary: {
        item_count: allCartItems.length,
        subtotal: cart.subtotal,
        total: cart.total
      },
      next_step: start_another_for_same_session ? 'start_another_for_same_session' : 'view_cart',
      message: 'Camp registration added to cart.'
    };
  }

  // -------- Cart operations --------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const registrations = this._getFromStorage('camp_registrations');
    const sessions = this._getFromStorage('camp_sessions');
    const products = this._getFromStorage('products');
    const transportSelections = this._getFromStorage('transportation_selections');
    const transportOptions = this._getFromStorage('transportation_options');

    const items = cartItemsAll
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const base = {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          description: ci.description || '',
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal
        };

        let camp_registration = null;
        let product = null;
        let transportation = null;

        if (ci.item_type === 'camp_registration') {
          const reg = registrations.find(r => r.id === ci.ref_id) || null;
          const session = reg ? (sessions.find(s => s.id === reg.camp_session_id) || null) : null;
          const has_transportation = !!(reg && reg.transportation_selection_id);
          camp_registration = reg && session ? {
            registration: reg,
            session,
            session_label: session.name,
            camper_name: reg.camper_name,
            camper_age: reg.camper_age,
            has_transportation
          } : null;
        } else if (ci.item_type === 'merchandise') {
          const prod = products.find(p => p.id === ci.ref_id) || null;
          let selected_size = null;
          let selected_color = null;
          if (ci.selected_options && typeof ci.selected_options === 'object') {
            selected_size = ci.selected_options.size || null;
            selected_color = ci.selected_options.color || null;
          }
          product = prod ? {
            product: prod,
            selected_size,
            selected_color
          } : null;
        } else if (ci.item_type === 'transportation') {
          const sel = transportSelections.find(ts => ts.id === ci.ref_id) || null;
          const opt = sel ? (transportOptions.find(o => o.id === sel.transportation_option_id) || null) : null;
          transportation = sel && opt ? { selection: sel, option: opt } : null;
        }

        return Object.assign({}, base, { camp_registration, product, transportation });
      });

    // Resolve discount code foreign key-like relation (by code string)
    let summary_message = '';
    if (cart.applied_discount_code) {
      const discountCodes = this._getFromStorage('discount_codes');
      const codeRecord = discountCodes.find(dc => String(dc.code).toLowerCase() === String(cart.applied_discount_code).toLowerCase());
      if (codeRecord) {
        summary_message = 'Discount code ' + codeRecord.code + ' applied.';
      } else {
        summary_message = 'Discount code ' + cart.applied_discount_code + ' could not be found.';
      }
    }

    return {
      cart,
      items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      applied_discount_code: cart.applied_discount_code || null,
      summary_message
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        updated_item: null
      };
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.line_subtotal = Number(item.unit_price) * Number(quantity);
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getCartById(item.cart_id) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart,
      updated_item: {
        cart_item_id: item.id,
        quantity: item.quantity,
        line_subtotal: item.line_subtotal
      }
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cart_item_id) || null;
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }

    const cart = this._getCartById(item.cart_id) || this._getOrCreateCart();

    // Hierarchical cleanup
    if (item.item_type === 'camp_registration') {
      const registrations = this._getFromStorage('camp_registrations');
      const reg = registrations.find(r => r.id === item.ref_id) || null;
      if (reg && reg.transportation_selection_id) {
        const tsId = reg.transportation_selection_id;
        // Remove transportation cart item(s) referring to this selection
        cartItems = cartItems.filter(ci => !(ci.item_type === 'transportation' && ci.ref_id === tsId));
        // Remove transportation selection
        const tsList = this._getFromStorage('transportation_selections');
        const tsNew = tsList.filter(t => t.id !== tsId);
        this._saveToStorage('transportation_selections', tsNew);
        reg.transportation_selection_id = null;
        const regIdx = registrations.findIndex(r => r.id === reg.id);
        if (regIdx >= 0) {
          registrations[regIdx] = reg;
          this._saveToStorage('camp_registrations', registrations);
        }
      }
    } else if (item.item_type === 'transportation') {
      // Clear reference from registration
      const tsList = this._getFromStorage('transportation_selections');
      const sel = tsList.find(t => t.id === item.ref_id) || null;
      if (sel) {
        const registrations = this._getFromStorage('camp_registrations');
        const reg = registrations.find(r => r.id === sel.camp_registration_id) || null;
        if (reg && reg.transportation_selection_id === sel.id) {
          reg.transportation_selection_id = null;
          const regIdx = registrations.findIndex(r => r.id === reg.id);
          if (regIdx >= 0) {
            registrations[regIdx] = reg;
            this._saveToStorage('camp_registrations', registrations);
          }
        }
        const tsNew = tsList.filter(t => t.id !== sel.id);
        this._saveToStorage('transportation_selections', tsNew);
      }
    }

    // Remove the item itself
    cartItems = cartItems.filter(ci => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(id => id !== cart_item_id);
      this._saveCart(cart);
    }

    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart,
      message: 'Cart item removed.'
    };
  }

  // -------- Checkout --------

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const registrations = this._getFromStorage('camp_registrations');
    const sessions = this._getFromStorage('camp_sessions');
    const products = this._getFromStorage('products');
    const transportSelections = this._getFromStorage('transportation_selections');
    const transportOptions = this._getFromStorage('transportation_options');

    const line_items = cartItems.map(ci => {
      let summary_label = ci.description || '';
      if (!summary_label) {
        if (ci.item_type === 'camp_registration') {
          const reg = registrations.find(r => r.id === ci.ref_id) || null;
          const session = reg ? (sessions.find(s => s.id === reg.camp_session_id) || null) : null;
          if (reg && session) {
            summary_label = session.name + ' (' + reg.camper_name + ')';
          }
        } else if (ci.item_type === 'merchandise') {
          const prod = products.find(p => p.id === ci.ref_id) || null;
          if (prod) summary_label = prod.name;
        } else if (ci.item_type === 'transportation') {
          const sel = transportSelections.find(t => t.id === ci.ref_id) || null;
          const opt = sel ? transportOptions.find(o => o.id === sel.transportation_option_id) : null;
          if (opt) summary_label = 'Transportation - ' + opt.pickup_location_name + ' (' + opt.departure_time + ')';
        }
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        summary_label,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal
      };
    });

    const guardian_contact = JSON.parse(localStorage.getItem('guardian_contact') || 'null') || {
      guardian_name: '',
      email: '',
      phone: ''
    };

    // Discount description
    let discount_description = '';
    if (cart.applied_discount_code) {
      const discountCodes = this._getFromStorage('discount_codes');
      const codeRecord = discountCodes.find(dc => String(dc.code).toLowerCase() === String(cart.applied_discount_code).toLowerCase());
      if (codeRecord) {
        if (codeRecord.discount_type === 'percentage') {
          discount_description = codeRecord.value + '% off (' + codeRecord.code + ')';
        } else {
          discount_description = '$' + codeRecord.value + ' off (' + codeRecord.code + ')';
        }
      } else {
        discount_description = 'Discount code ' + cart.applied_discount_code;
      }
    }

    return {
      cart,
      line_items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      guardian_contact,
      applied_discount_code: cart.applied_discount_code || null,
      discount_description
    };
  }

  updateCheckoutContactInfo(guardian_name, email, phone) {
    const guardian_contact = { guardian_name, email, phone }; // phone may be undefined
    localStorage.setItem('guardian_contact', JSON.stringify(guardian_contact));
    return {
      success: true,
      guardian_contact
    };
  }

  applyDiscountCodeToCart(code) {
    const cart = this._getOrCreateCart();
    const trimmed = (code || '').trim();
    if (!trimmed) {
      this._recalculateCartTotals(cart);
      return {
        success: true,
        cart,
        discount_applied: false,
        discount_total: cart.discount_total || 0,
        message: 'No discount code provided.'
      };
    }

    const discountCodes = this._getFromStorage('discount_codes');
    const codeRecord = discountCodes.find(dc => String(dc.code).toLowerCase() === trimmed.toLowerCase() && dc.is_active !== false);

    if (!codeRecord) {
      cart.applied_discount_code = null;
      this._saveCart(cart);
      this._recalculateCartTotals(cart);
      return {
        success: true,
        cart,
        discount_applied: false,
        discount_total: cart.discount_total || 0,
        message: 'Invalid or inactive discount code.'
      };
    }

    cart.applied_discount_code = codeRecord.code;
    this._saveCart(cart);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart,
      discount_applied: (cart.discount_total || 0) > 0,
      discount_total: cart.discount_total || 0,
      message: 'Discount code applied.'
    };
  }

  confirmCheckoutReview() {
    const cart = this._getOrCreateCart();
    if (cart.status !== 'submitted') {
      cart.status = 'checking_out';
      cart.updated_at = this._now();
      this._saveCart(cart);
    }

    return {
      cart,
      review_complete: true,
      message: 'Checkout review marked complete (payment not processed).'
    };
  }

  // -------- Store / Merchandise --------

  getStoreFilterOptions() {
    const products = this._getFromStorage('products');

    const ageGroupSet = new Set(products.map(p => p.age_group));
    const productTypeSet = new Set(products.map(p => p.product_type));

    const age_groups = Array.from(ageGroupSet).filter(Boolean);
    const product_types = Array.from(productTypeSet).filter(Boolean);

    const price_ranges = [
      { min_price: 0, max_price: 15, label: 'Up to $15' },
      { min_price: 0, max_price: 25, label: 'Up to $25' },
      { min_price: 0, max_price: 40, label: 'Up to $40' },
      { min_price: 0, max_price: 60, label: 'Up to $60' }
    ];

    const sizeSet = new Set();
    const tagSet = new Set();
    for (const p of products) {
      if (Array.isArray(p.available_sizes)) {
        p.available_sizes.forEach(s => sizeSet.add(s));
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => tagSet.add(t));
      }
    }

    const size_options = Array.from(sizeSet);
    const attribute_tags = Array.from(tagSet);

    const sort_options = [
      { sort_key: 'price_asc', label: 'Price: Low to High' },
      { sort_key: 'price_desc', label: 'Price: High to Low' },
      { sort_key: 'name_asc', label: 'Name: A to Z' }
    ];

    return { age_groups, product_types, price_ranges, size_options, attribute_tags, sort_options };
  }

  searchProducts(age_group, product_type, max_price, has_camp_logo, size, search_term, sort_by) {
    let products = this._getFromStorage('products').filter(p => p.is_active !== false);

    if (age_group) {
      products = products.filter(p => p.age_group === age_group);
    }

    if (product_type) {
      products = products.filter(p => p.product_type === product_type);
    }

    if (typeof max_price === 'number') {
      products = products.filter(p => Number(p.price) <= max_price);
    }

    if (typeof has_camp_logo === 'boolean') {
      products = products.filter(p => !!p.has_camp_logo === has_camp_logo);
    }

    if (size) {
      products = products.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.includes(size));
    }

    if (search_term) {
      const q = search_term.toLowerCase();
      products = products.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const tagMatch = Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase().includes(q));
        return nameMatch || descMatch || tagMatch;
      });
    }

    if (sort_by === 'price_asc') {
      products.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort_by === 'price_desc') {
      products.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort_by === 'name_asc') {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return products;
  }

  getProductDetails(product_id) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === product_id) || null;
    if (!product) {
      return {
        product: null,
        available_sizes: [],
        available_colors: [],
        related_products: []
      };
    }

    const available_sizes = product.available_sizes || [];
    const available_colors = product.available_colors || [];

    const related_products = products.filter(p => p.id !== product.id && (p.product_type === product.product_type || p.age_group === product.age_group));

    return { product, available_sizes, available_colors, related_products };
  }

  addProductToCart(product_id, quantity, selected_size, selected_color) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === product_id) || null;
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_summary: { item_count: 0, subtotal: 0, total: 0 },
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unit_price = Number(product.price) || 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'merchandise',
      ref_id: product.id,
      quantity: quantity,
      unit_price,
      line_subtotal: unit_price * quantity,
      description: product.name,
      selected_options: {
        size: selected_size || null,
        color: selected_color || null
      }
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart_id: cart.id,
      cart_summary: {
        item_count: allCartItems.length,
        subtotal: cart.subtotal,
        total: cart.total
      },
      message: 'Product added to cart.'
    };
  }

  // -------- Resources & Articles --------

  getResourcesFilterOptions() {
    const articles = this._getFromStorage('articles');
    const topicSet = new Set();
    const tagSet = new Set();

    for (const a of articles) {
      if (a.topic) topicSet.add(a.topic);
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => tagSet.add(t));
      }
    }

    const topics = Array.from(topicSet);
    const tags = Array.from(tagSet);

    return { topics, tags };
  }

  searchArticles(search_term, topic, tag) {
    let articles = this._getFromStorage('articles');

    if (search_term) {
      const q = search_term.toLowerCase();
      articles = articles.filter(a => {
        const titleMatch = (a.title || '').toLowerCase().includes(q);
        const summaryMatch = (a.summary || '').toLowerCase().includes(q);
        const contentMatch = (a.content || '').toLowerCase().includes(q);
        return titleMatch || summaryMatch || contentMatch;
      });
    }

    if (topic) {
      articles = articles.filter(a => a.topic === topic);
    }

    if (tag) {
      const t = tag.toLowerCase();
      articles = articles.filter(a => Array.isArray(a.tags) && a.tags.some(x => String(x).toLowerCase() === t));
    }

    return articles;
  }

  getArticleDetail(article_id) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === article_id) || null;
    if (!article) {
      return { article: null, related_articles: [], important_sections: [] };
    }

    const related_articles = articles.filter(a => a.id !== article.id && a.topic === article.topic);

    // Simple heuristic: treat markdown-style headings '## ' as important sections
    const important_sections = [];
    if (article.content) {
      const lines = article.content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          const label = trimmed.replace(/^##\s+/, '');
          important_sections.push({
            anchor: 'section_' + index,
            label
          });
        }
      });
    }

    return { article, related_articles, important_sections };
  }

  // -------- Packing tools (checklists & notes) --------

  getPackingToolsOverview() {
    const checklists = this._getFromStorage('packing_checklists');
    const items = this._getFromStorage('checklist_items');

    const enrichedChecklists = checklists.map(c => {
      const checklistItems = items.filter(i => i.checklist_id === c.id);
      // Foreign-key resolution: include full checklist items
      return Object.assign({}, c, { items: checklistItems });
    });

    const notes = this._getFromStorage('notes');

    return { checklists: enrichedChecklists, notes };
  }

  createPackingChecklist(name) {
    const checklists = this._getFromStorage('packing_checklists');
    const checklist = {
      id: this._generateId('checklist'),
      name,
      item_ids: [],
      created_at: this._now(),
      updated_at: this._now()
    };
    checklists.push(checklist);
    this._saveToStorage('packing_checklists', checklists);
    return { checklist };
  }

  addChecklistItemToChecklist(checklist_id, text) {
    const checklists = this._getFromStorage('packing_checklists');
    const idx = checklists.findIndex(c => c.id === checklist_id);
    if (idx === -1) {
      return { item: null, checklist: null };
    }

    const checklist = checklists[idx];
    const items = this._getFromStorage('checklist_items');

    const item = {
      id: this._generateId('checkitem'),
      checklist_id,
      text,
      is_completed: false
    };

    items.push(item);
    this._saveToStorage('checklist_items', items);

    if (!Array.isArray(checklist.item_ids)) checklist.item_ids = [];
    checklist.item_ids.push(item.id);
    checklist.updated_at = this._now();
    checklists[idx] = checklist;
    this._saveToStorage('packing_checklists', checklists);

    return { item, checklist };
  }

  updateChecklistItem(checklist_item_id, text, is_completed) {
    const items = this._getFromStorage('checklist_items');
    const idx = items.findIndex(i => i.id === checklist_item_id);
    if (idx === -1) {
      return { item: null };
    }

    const item = items[idx];
    if (typeof text === 'string') {
      item.text = text;
    }
    if (typeof is_completed === 'boolean') {
      item.is_completed = is_completed;
    }

    items[idx] = item;
    this._saveToStorage('checklist_items', items);

    return { item };
  }

  deleteChecklistItem(checklist_item_id) {
    const items = this._getFromStorage('checklist_items');
    const item = items.find(i => i.id === checklist_item_id) || null;
    if (!item) {
      return { success: false };
    }

    const newItems = items.filter(i => i.id !== checklist_item_id);
    this._saveToStorage('checklist_items', newItems);

    const checklists = this._getFromStorage('packing_checklists');
    const idx = checklists.findIndex(c => c.id === item.checklist_id);
    if (idx >= 0) {
      const checklist = checklists[idx];
      if (Array.isArray(checklist.item_ids)) {
        checklist.item_ids = checklist.item_ids.filter(id => id !== checklist_item_id);
      }
      checklist.updated_at = this._now();
      checklists[idx] = checklist;
      this._saveToStorage('packing_checklists', checklists);
    }

    return { success: true };
  }

  savePackingChecklist(checklist_id) {
    const checklists = this._getFromStorage('packing_checklists');
    const idx = checklists.findIndex(c => c.id === checklist_id);
    if (idx === -1) {
      return { checklist: null, message: 'Checklist not found.' };
    }

    const checklist = checklists[idx];
    checklist.updated_at = this._now();
    checklists[idx] = checklist;
    this._saveToStorage('packing_checklists', checklists);

    return { checklist, message: 'Checklist saved.' };
  }

  getNotes() {
    return this._getFromStorage('notes');
  }

  createOrUpdateNote(note_id, title, body) {
    const notes = this._getFromStorage('notes');
    let note = null;

    if (note_id) {
      const idx = notes.findIndex(n => n.id === note_id);
      if (idx >= 0) {
        note = notes[idx];
        note.title = title;
        note.body = body;
        note.updated_at = this._now();
        notes[idx] = note;
        this._saveToStorage('notes', notes);
        return { note };
      }
    }

    // Create new note
    note = {
      id: this._generateId('note'),
      title,
      body,
      created_at: this._now(),
      updated_at: this._now()
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return { note };
  }

  // -------- Financial Aid --------

  getFinancialAidOverview() {
    const programs = this._getFromStorage('financial_aid_programs');

    const highlight_deadlines = programs.map(p => {
      const d = this._parseDate(p.application_deadline);
      const deadline_date = d ? d.toISOString() : null;
      const deadline_month_label = d ? d.toLocaleDateString(undefined, { month: 'long' }) : '';
      return {
        program_id: p.id,
        program_name: p.name,
        deadline_date,
        deadline_month_label
      };
    });

    const general_description = 'We offer limited financial aid and scholarships so that cost is not a barrier to camp participation.';
    const contact_instructions = 'Review the programs below and contact us if you have questions about eligibility or the application process.';

    return { programs, highlight_deadlines, general_description, contact_instructions };
  }

  getFinancialAidProgramDetails(financial_aid_program_id) {
    const programs = this._getFromStorage('financial_aid_programs');
    const program = programs.find(p => p.id === financial_aid_program_id) || null;
    if (!program) {
      return { program: null, deadline_label: '', eligibility_summary: '' };
    }

    const d = this._parseDate(program.application_deadline);
    const deadline_label = d ? d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const eligibility_summary = program.eligibility_criteria || '';

    return { program, deadline_label, eligibility_summary };
  }

  // -------- Contact / Inquiries --------

  getContactTopicsAndDetails() {
    const phone = '(555) 000-0000';
    const email = 'info@naturecamp.example.com';
    const location = '123 Forest Lane, Greenfield';

    const topics = [
      { topic_key: 'general', label: 'General Questions' },
      { topic_key: 'health', label: 'Health & Safety' },
      { topic_key: 'food_allergies', label: 'Food & Allergies' },
      { topic_key: 'registration', label: 'Registration & Billing' },
      { topic_key: 'financial_aid', label: 'Financial Aid & Scholarships' },
      { topic_key: 'other', label: 'Other' }
    ];

    const preferred_contact_methods = ['email', 'phone', 'either'];

    return { phone, email, location, topics, preferred_contact_methods };
  }

  submitContactInquiry(name, email, phone, topic, message, preferred_contact_method) {
    const inquiries = this._getFromStorage('contact_inquiries');

    // Validate enums for topic and preferred_contact_method
    const validTopics = ['general', 'health', 'food_allergies', 'registration', 'financial_aid', 'other'];
    const validMethods = ['email', 'phone', 'either'];

    const topicSafe = validTopics.includes(topic) ? topic : 'other';
    const methodSafe = validMethods.includes(preferred_contact_method) ? preferred_contact_method : 'either';

    const inquiry = {
      id: this._generateId('inquiry'),
      name,
      email,
      phone: phone || '',
      topic: topicSafe,
      message,
      preferred_contact_method: methodSafe,
      status: 'received',
      created_at: this._now()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      inquiry,
      success: true,
      confirmation_message: 'Your message has been received. We will follow up soon.'
    };
  }

  // -------- Wishlist / Favorites --------

  getWishlist() {
    const wishlist = this._findOrCreateDefaultWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlist_id === wishlist.id);
    const sessions = this._getFromStorage('camp_sessions');

    const items = wishlistItems.map(wi => {
      const camp_session = sessions.find(s => s.id === wi.camp_session_id) || null;
      const session_label = camp_session ? camp_session.name : '';
      const age_range_label = camp_session ? this._ageRangeLabel(camp_session) : '';
      const date_range_label = camp_session ? this._dateRangeLabel(camp_session) : '';

      return {
        wishlist_item: wi,
        camp_session,
        session_label,
        age_range_label,
        date_range_label,
        price: camp_session ? camp_session.price : null,
        rating_average: camp_session ? camp_session.rating_average : null
      };
    });

    return { wishlist, items };
  }

  addCampSessionToWishlist(camp_session_id, wishlist_name) {
    const wishlist = this._findOrCreateDefaultWishlist(wishlist_name);
    const sessions = this._getFromStorage('camp_sessions');
    const session = sessions.find(s => s.id === camp_session_id) || null;

    if (!session) {
      return {
        wishlist,
        wishlist_item: null,
        message: 'Camp session not found.'
      };
    }

    const wishlistItems = this._getFromStorage('wishlist_items');

    // Avoid duplicates
    const existing = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.camp_session_id === camp_session_id);
    if (existing) {
      return {
        wishlist,
        wishlist_item: existing,
        message: 'Session is already in wishlist.'
      };
    }

    const wishlist_item = {
      id: this._generateId('wishitem'),
      wishlist_id: wishlist.id,
      camp_session_id,
      added_at: this._now()
    };

    wishlistItems.push(wishlist_item);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (!Array.isArray(wishlist.item_ids)) wishlist.item_ids = [];
    wishlist.item_ids.push(wishlist_item.id);

    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    return {
      wishlist,
      wishlist_item,
      message: 'Session added to wishlist.'
    };
  }

  removeWishlistItem(wishlist_item_id) {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const item = wishlistItems.find(wi => wi.id === wishlist_item_id) || null;
    if (!item) {
      return { success: false, wishlist: null };
    }

    const newItems = wishlistItems.filter(wi => wi.id !== wishlist_item_id);
    this._saveToStorage('wishlist_items', newItems);

    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find(w => w.id === item.wishlist_id) || null;
    if (wishlist) {
      if (Array.isArray(wishlist.item_ids)) {
        wishlist.item_ids = wishlist.item_ids.filter(id => id !== wishlist_item_id);
      }
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx >= 0) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    return { success: true, wishlist };
  }

  renameWishlist(wishlist_id, name) {
    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist_id);
    if (idx === -1) {
      return { wishlist: null };
    }

    const wishlist = wishlists[idx];
    wishlist.name = name;
    wishlists[idx] = wishlist;
    this._saveToStorage('wishlists', wishlists);

    return { wishlist };
  }

  // -------- Transportation --------

  getTransportationOptionsForRegistration(camp_registration_id) {
    const registrations = this._getFromStorage('camp_registrations');
    const registration = registrations.find(r => r.id === camp_registration_id) || null;
    if (!registration) {
      return {
        camp_registration: null,
        camp_session: null,
        options: []
      };
    }

    const sessions = this._getFromStorage('camp_sessions');
    const camp_session = sessions.find(s => s.id === registration.camp_session_id) || null;

    const options = this._getFromStorage('transportation_options').filter(o => o.camp_session_id === registration.camp_session_id && o.is_active !== false);

    return { camp_registration: registration, camp_session, options };
  }

  selectTransportationForRegistration(camp_registration_id, transportation_option_id, quantity) {
    const registrations = this._getFromStorage('camp_registrations');
    const regIdx = registrations.findIndex(r => r.id === camp_registration_id);
    if (regIdx === -1) {
      return {
        transportation_selection: null,
        updated_registration: null,
        cart: null,
        message: 'Registration not found.'
      };
    }

    const registration = registrations[regIdx];
    const options = this._getFromStorage('transportation_options');
    const option = options.find(o => o.id === transportation_option_id && o.is_active !== false) || null;

    if (!option) {
      return {
        transportation_selection: null,
        updated_registration: registration,
        cart: null,
        message: 'Transportation option not found or inactive.'
      };
    }

    const qty = Number(quantity) || 1;

    const selections = this._getFromStorage('transportation_selections');
    const selection = {
      id: this._generateId('transport_sel'),
      transportation_option_id,
      camp_registration_id,
      quantity: qty,
      price: Number(option.price) * qty,
      created_at: this._now()
    };

    selections.push(selection);
    this._saveToStorage('transportation_selections', selections);

    // Link selection to registration (do not change registration.total_price; transportation is separate line item)
    registration.transportation_selection_id = selection.id;
    registrations[regIdx] = registration;
    this._saveToStorage('camp_registrations', registrations);

    // Add transportation as cart item
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const description = 'Transportation - ' + option.pickup_location_name + ' (' + option.departure_time + ', ' + (option.trip_type === 'round_trip' ? 'round trip' : 'one way') + ')';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'transportation',
      ref_id: selection.id,
      quantity: qty,
      unit_price: Number(option.price),
      line_subtotal: Number(option.price) * qty,
      description,
      selected_options: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return {
      transportation_selection: selection,
      updated_registration: registration,
      cart,
      message: 'Transportation added to registration and cart.'
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