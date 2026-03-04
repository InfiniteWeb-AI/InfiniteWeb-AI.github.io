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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'training_programs',
      'training_sessions',
      'class_registrations',
      'workshop_interests',
      'products',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'events',
      'field_trial_entries',
      'volunteer_registrations',
      'articles',
      'reading_list_items',
      'membership_plans',
      'membership_applications',
      'trainers',
      'trainer_specializations',
      'trainer_evaluation_bookings',
      'training_plans',
      'training_plan_items'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Club info as a single object
    if (!localStorage.getItem('club_info')) {
      localStorage.setItem('club_info', JSON.stringify({}));
    }

    // Simple contact form tickets storage
    if (!localStorage.getItem('contact_tickets')) {
      localStorage.setItem('contact_tickets', JSON.stringify([]));
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _parseDateRangeStart(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _parseDateRangeEnd(dateStr) {
    if (!dateStr) return null;
    // If only date is provided, treat as end of that day
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  _inDateRange(dateStr, fromStr, toStr) {
    const d = this._parseDate(dateStr);
    if (!d) return false;
    const from = this._parseDateRangeStart(fromStr);
    const to = this._parseDateRangeEnd(toStr);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  _toLabelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  _paginate(items, page, page_size) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * size;
    return items.slice(start, start + size);
  }

  // =========================
  // Cart helpers
  // =========================

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        subtotal: 0,
        item_count: 0
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart');
    const cart_items = this._getFromStorage('cart_items');
    const targetCart = carts.find((c) => c.id === cart.id);
    if (!targetCart) return;

    const itemsForCart = cart_items.filter((ci) => ci.cart_id === targetCart.id);
    let subtotal = 0;
    let itemCount = 0;
    for (const item of itemsForCart) {
      subtotal += Number(item.line_total || 0);
      itemCount += Number(item.quantity || 0);
    }
    targetCart.subtotal = subtotal;
    targetCart.item_count = itemCount;
    targetCart.updated_at = this._nowISO();

    this._saveToStorage('cart', carts);
  }

  // =========================
  // Training plan helpers
  // =========================

  _getOrCreateTrainingPlan() {
    const plans = this._getFromStorage('training_plans');
    let plan = plans[0] || null;
    if (!plan) {
      plan = {
        id: this._generateId('training_plan'),
        name: null,
        total_estimated_cost: 0,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      plans.push(plan);
      this._saveToStorage('training_plans', plans);
    }
    return plan;
  }

  _recalculateTrainingPlanTotal(plan) {
    const plans = this._getFromStorage('training_plans');
    const planItems = this._getFromStorage('training_plan_items');
    const sessions = this._getFromStorage('training_sessions');

    const targetPlan = plans.find((p) => p.id === plan.id);
    if (!targetPlan) return;

    const itemsForPlan = planItems.filter((pi) => pi.training_plan_id === targetPlan.id);
    let total = 0;
    for (const item of itemsForPlan) {
      const session = sessions.find((s) => s.id === item.session_id);
      if (session && typeof session.price === 'number') {
        total += session.price;
      }
    }
    targetPlan.total_estimated_cost = total;
    targetPlan.updated_at = this._nowISO();

    this._saveToStorage('training_plans', plans);
  }

  // =========================
  // Homepage helpers
  // =========================

  _findFeaturedBeginnerPrograms() {
    const programs = this._getFromStorage('training_programs');
    const now = new Date();
    const filtered = programs
      .filter((p) => p.is_active !== false)
      .filter((p) => p.skill_level === 'beginner_puppy')
      .filter((p) => {
        const sd = this._parseDate(p.start_date);
        return sd && sd >= now;
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return filtered.slice(0, 3);
  }

  _findUpcomingWorkshops() {
    const programs = this._getFromStorage('training_programs');
    const now = new Date();
    const filtered = programs
      .filter((p) => p.is_active !== false)
      .filter((p) => p.program_category === 'workshop')
      .filter((p) => {
        const sd = this._parseDate(p.start_date);
        return sd && sd >= now;
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return filtered.slice(0, 5);
  }

  _findNextVolunteerWorkday() {
    const events = this._getFromStorage('events');
    const now = new Date();
    const candidates = events
      .filter((e) => e.event_type === 'workday_volunteer')
      .filter((e) => {
        const sd = this._parseDate(e.start_datetime);
        return sd && sd >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    return candidates[0] || null;
  }

  _filterMembershipPlansForTwoHandlersSevenDays() {
    const plans = this._getFromStorage('membership_plans');
    return plans
      .filter((p) => p.is_active !== false)
      .filter((p) => p.max_handlers >= 2)
      .filter((p) => p.training_grounds_access_days_per_week === 7)
      .filter((p) => p.training_grounds_access_detail === 'seven_days_week');
  }

  // =========================
  // Search helper
  // =========================

  _searchAcrossEntities(query, types, limit) {
    const q = (query || '').toLowerCase();
    const allowedTypes = types && types.length ? types : [
      'training_program',
      'event',
      'product',
      'article',
      'trainer',
      'membership_plan'
    ];

    const results = [];

    const pushWithLimit = (item) => {
      if (results.length < limit) {
        results.push(item);
      }
    };

    if (allowedTypes.includes('training_program')) {
      const programs = this._getFromStorage('training_programs');
      for (const p of programs) {
        if (!q || (p.title && p.title.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'training_program',
            entity_id: p.id,
            title: p.title,
            summary: p.short_description || '',
            meta: {
              date: p.start_date || null,
              price: typeof p.price === 'number' ? p.price : null,
              location_name: p.location_name || null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    if (allowedTypes.includes('event')) {
      const events = this._getFromStorage('events');
      for (const e of events) {
        if (!q || (e.title && e.title.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'event',
            entity_id: e.id,
            title: e.title,
            summary: e.description || '',
            meta: {
              date: e.start_datetime || null,
              price: typeof e.entry_fee === 'number' ? e.entry_fee : null,
              location_name: e.location_name || null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    if (allowedTypes.includes('product')) {
      const products = this._getFromStorage('products');
      for (const p of products) {
        if (!q || (p.name && p.name.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'product',
            entity_id: p.id,
            title: p.name,
            summary: p.description || '',
            meta: {
              date: p.created_at || null,
              price: typeof p.price === 'number' ? p.price : null,
              location_name: null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    if (allowedTypes.includes('article')) {
      const articles = this._getFromStorage('articles');
      for (const a of articles) {
        if (!q || (a.title && a.title.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'article',
            entity_id: a.id,
            title: a.title,
            summary: a.summary || '',
            meta: {
              date: a.publish_date || null,
              price: null,
              location_name: null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    if (allowedTypes.includes('trainer')) {
      const trainers = this._getFromStorage('trainers');
      for (const t of trainers) {
        if (!q || (t.name && t.name.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'trainer',
            entity_id: t.id,
            title: t.name,
            summary: t.bio || '',
            meta: {
              date: t.created_at || null,
              price: typeof t.hourly_rate === 'number' ? t.hourly_rate : null,
              location_name: t.base_city || null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    if (allowedTypes.includes('membership_plan')) {
      const plans = this._getFromStorage('membership_plans');
      for (const p of plans) {
        if (!q || (p.name && p.name.toLowerCase().includes(q))) {
          pushWithLimit({
            entity_type: 'membership_plan',
            entity_id: p.id,
            title: p.name,
            summary: p.description || '',
            meta: {
              date: p.created_at || null,
              price: typeof p.annual_price === 'number' ? p.annual_price : null,
              location_name: null
            }
          });
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  // =========================
  // Trainer availability helper
  // =========================

  _computeTrainerAvailabilitySlots(trainer, start_date_from, start_date_to, time_of_day_preference, weekdays_only) {
    const slots = [];
    const start = this._parseDateRangeStart(start_date_from);
    const end = this._parseDateRangeEnd(start_date_to);
    if (!start || !end || !trainer) return { slots };

    const eveningPreferred = !time_of_day_preference || time_of_day_preference === 'evening';

    const cur = new Date(start.getTime());
    cur.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const day = cur.getDay(); // 0-6, 0 Sunday
      const isWeekday = day >= 1 && day <= 5;
      if ((!weekdays_only || isWeekday) && eveningPreferred) {
        // generate a few standard evening slots at 17:00, 18:00, 19:00
        const hours = [17, 18, 19];
        for (const h of hours) {
          const slotStart = new Date(cur.getTime());
          slotStart.setHours(h, 0, 0, 0);
          const iso = slotStart.toISOString();
          slots.push({
            start_datetime: iso,
            duration_minutes: 60,
            is_available: trainer.typical_availability_evenings !== false
          });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { slots };
  }

  // =========================
  // Core interface implementations
  // =========================

  // getHomePageOverview
  getHomePageOverview() {
    const featured_beginner_programs = this._findFeaturedBeginnerPrograms();
    const upcoming_workshops = this._findUpcomingWorkshops();
    const next_volunteer_workday = this._findNextVolunteerWorkday();
    const plans = this._filterMembershipPlansForTwoHandlersSevenDays();

    let highlight_plan_name = '';
    let highlight_plan_description = '';
    let starting_price_annual = null;
    let key_benefits = [];

    if (plans.length) {
      const cheapest = plans.slice().sort((a, b) => a.annual_price - b.annual_price)[0];
      highlight_plan_name = cheapest.name || '';
      highlight_plan_description = cheapest.description || '';
      starting_price_annual = cheapest.annual_price;
      key_benefits = cheapest.other_benefits || [];
    }

    return {
      featured_beginner_programs,
      upcoming_workshops,
      next_volunteer_workday,
      membership_teaser: {
        highlight_plan_name,
        highlight_plan_description,
        starting_price_annual,
        key_benefits
      }
    };
  }

  // searchSite
  searchSite(query, types, limit) {
    const lim = typeof limit === 'number' && limit > 0 ? limit : 20;
    return this._searchAcrossEntities(query, types, lim);
  }

  // getTrainingProgramFilterOptions
  getTrainingProgramFilterOptions(listing_category) {
    // Static options based on model enums
    const skill_levels = [
      { value: 'beginner_puppy', label: 'Beginner / Puppy' },
      { value: 'novice', label: 'Novice' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const breed_focuses = [
      { value: 'all_breeds', label: 'All Breeds' },
      { value: 'retrievers', label: 'Retrievers' },
      { value: 'pointing_breeds', label: 'Pointing Breeds' },
      { value: 'flushing_breeds', label: 'Flushing Breeds' },
      { value: 'versatile_hunting_dogs', label: 'Versatile Hunting Dogs' }
    ];

    const program_categories = [
      { value: 'class', label: 'Class' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'series', label: 'Series' }
    ];

    const formats = [
      { value: 'group', label: 'Group' },
      { value: 'private', label: 'Private' }
    ];

    const format_types = [
      { value: 'single_session_class', label: 'Single Session Class' },
      { value: 'multi_week_class', label: 'Multi-Week Class' },
      { value: 'two_day_workshop', label: '2-Day Workshop' },
      { value: 'multi_day_workshop', label: 'Multi-Day Workshop' }
    ];

    const days_of_week = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const time_of_day_labels = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'varied', label: 'Varied' }
    ];

    const programs = this._getFromStorage('training_programs');
    let minPrice = null;
    let maxPrice = null;
    let earliest = null;
    let latest = null;

    for (const p of programs) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.start_date) {
        const d = new Date(p.start_date);
        if (!earliest || d < earliest) earliest = d;
        if (!latest || d > latest) latest = d;
      }
    }

    return {
      skill_levels,
      breed_focuses,
      program_categories,
      formats,
      format_types,
      days_of_week,
      time_of_day_labels,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice
      },
      date_range: {
        earliest_start_date: earliest ? earliest.toISOString().substring(0, 10) : null,
        latest_start_date: latest ? latest.toISOString().substring(0, 10) : null
      }
    };
  }

  // searchTrainingPrograms
  searchTrainingPrograms(
    listing_category,
    skill_levels,
    breed_focuses,
    program_categories,
    formats,
    format_types,
    is_drop_in,
    days_of_week,
    time_of_day_labels,
    start_date_from,
    start_date_to,
    min_price,
    max_price,
    max_dogs_per_group,
    sort_by,
    page,
    page_size
  ) {
    let programs = this._getFromStorage('training_programs').slice();

    if (listing_category) {
      programs = programs.filter((p) => p.listing_category === listing_category);
    }

    if (skill_levels && skill_levels.length) {
      programs = programs.filter((p) => skill_levels.includes(p.skill_level));
    }

    if (breed_focuses && breed_focuses.length) {
      programs = programs.filter((p) => breed_focuses.includes(p.breed_focus));
    }

    if (program_categories && program_categories.length) {
      programs = programs.filter((p) => program_categories.includes(p.program_category));
    }

    if (formats && formats.length) {
      programs = programs.filter((p) => formats.includes(p.format));
    }

    if (format_types && format_types.length) {
      programs = programs.filter((p) => format_types.includes(p.format_type));
    }

    if (typeof is_drop_in === 'boolean') {
      programs = programs.filter((p) => (p.is_drop_in || false) === is_drop_in);
    }

    if (days_of_week && days_of_week.length) {
      programs = programs.filter((p) => {
        if (Array.isArray(p.days_of_week) && p.days_of_week.length) {
          return p.days_of_week.some((d) => days_of_week.includes(d));
        }
        if (p.day_of_week) {
          return days_of_week.includes(p.day_of_week);
        }
        return false;
      });
    }

    if (time_of_day_labels && time_of_day_labels.length) {
      programs = programs.filter((p) => {
        if (!p.time_of_day_label) return false;
        return time_of_day_labels.includes(p.time_of_day_label);
      });
    }

    if (start_date_from || start_date_to) {
      programs = programs.filter((p) => this._inDateRange(p.start_date, start_date_from, start_date_to));
    }

    if (typeof min_price === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price >= min_price);
    }

    if (typeof max_price === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price <= max_price);
    }

    if (typeof max_dogs_per_group === 'number') {
      programs = programs.filter((p) => typeof p.max_dogs === 'number' && p.max_dogs <= max_dogs_per_group);
    }

    if (sort_by === 'start_date_soonest') {
      programs.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    } else if (sort_by === 'price_low_to_high') {
      programs.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      programs.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total_count = programs.length;
    const paged = this._paginate(programs, page, page_size);
    return { total_count, programs: paged };
  }

  // getTrainingProgramDetails
  getTrainingProgramDetails(programId) {
    const programs = this._getFromStorage('training_programs');
    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        capacity_info: {
          max_dogs: null,
          current_enrolled_dogs: null,
          remaining_spots: null
        },
        display_labels: {
          skill_level_label: '',
          breed_focus_label: '',
          discipline_label: '',
          format_label: '',
          format_type_label: '',
          program_category_label: '',
          listing_category_label: '',
          time_of_day_label: ''
        }
      };
    }

    const max_dogs = typeof program.max_dogs === 'number' ? program.max_dogs : null;
    const current_enrolled_dogs = typeof program.current_enrolled_dogs === 'number' ? program.current_enrolled_dogs : 0;
    const remaining_spots = max_dogs !== null ? Math.max(max_dogs - current_enrolled_dogs, 0) : null;

    const capacity_info = {
      max_dogs,
      current_enrolled_dogs,
      remaining_spots
    };

    const display_labels = {
      skill_level_label: this._toLabelFromEnum(program.skill_level),
      breed_focus_label: this._toLabelFromEnum(program.breed_focus),
      discipline_label: this._toLabelFromEnum(program.discipline),
      format_label: this._toLabelFromEnum(program.format),
      format_type_label: this._toLabelFromEnum(program.format_type),
      program_category_label: this._toLabelFromEnum(program.program_category),
      listing_category_label: this._toLabelFromEnum(program.listing_category),
      time_of_day_label: this._toLabelFromEnum(program.time_of_day_label)
    };

    return { program, capacity_info, display_labels };
  }

  // registerForTrainingClass
  registerForTrainingClass(
    programId,
    registrant_full_name,
    registrant_email,
    registrant_phone,
    dog_name,
    dog_breed,
    dog_age_months,
    payment_option
  ) {
    const programs = this._getFromStorage('training_programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, registration: null, message: 'Program not found.' };
    }

    if (!['pay_at_first_session', 'pay_online', 'pay_in_full_at_sign_up'].includes(payment_option)) {
      return { success: false, registration: null, message: 'Invalid payment option.' };
    }

    const registrations = this._getFromStorage('class_registrations');
    const registration = {
      id: this._generateId('class_registration'),
      program_id: programId,
      registrant_full_name,
      registrant_email,
      registrant_phone,
      dog_name,
      dog_breed,
      dog_age_months: typeof dog_age_months === 'number' ? dog_age_months : null,
      payment_option,
      status: 'pending',
      created_at: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('class_registrations', registrations);

    return { success: true, registration, message: 'Registration submitted.' };
  }

  // expressWorkshopInterest
  expressWorkshopInterest(programId, full_name, email, phone, note, contact_preference) {
    const programs = this._getFromStorage('training_programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, interest: null, message: 'Program not found.' };
    }

    if (!['contact_me_by_email', 'contact_me_by_phone'].includes(contact_preference)) {
      return { success: false, interest: null, message: 'Invalid contact preference.' };
    }

    const interests = this._getFromStorage('workshop_interests');
    const interest = {
      id: this._generateId('workshop_interest'),
      program_id: programId,
      full_name,
      email,
      phone,
      note: note || '',
      contact_preference,
      created_at: this._nowISO()
    };

    interests.push(interest);
    this._saveToStorage('workshop_interests', interests);

    return { success: true, interest, message: 'Interest submitted.' };
  }

  // getScheduleFilterOptions
  getScheduleFilterOptions() {
    const session_types = [
      { value: 'drop_in_obedience', label: 'Drop-In Obedience' },
      { value: 'water_retrieve', label: 'Water Retrieve' },
      { value: 'steadiness', label: 'Steadiness' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_labels = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    return { session_types, time_of_day_labels };
  }

  // getTrainingSessions
  getTrainingSessions(start_date_from, start_date_to, session_types, time_of_day_labels, sort_by) {
    let sessions = this._getFromStorage('training_sessions').slice();

    sessions = sessions.filter((s) => this._inDateRange(s.start_datetime, start_date_from, start_date_to));

    if (session_types && session_types.length) {
      sessions = sessions.filter((s) => session_types.includes(s.session_type));
    }

    if (time_of_day_labels && time_of_day_labels.length) {
      sessions = sessions.filter((s) => s.time_of_day_label && time_of_day_labels.includes(s.time_of_day_label));
    }

    if (sort_by === 'start_datetime_soonest') {
      sessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    return sessions;
  }

  // addSessionToTrainingPlan
  addSessionToTrainingPlan(sessionId) {
    const sessions = this._getFromStorage('training_sessions');
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, training_plan: null, plan_item: null, total_estimated_cost: 0, message: 'Session not found.' };
    }

    const plan = this._getOrCreateTrainingPlan();
    const planItems = this._getFromStorage('training_plan_items');

    let existing = planItems.find((pi) => pi.training_plan_id === plan.id && pi.session_id === sessionId);
    if (!existing) {
      existing = {
        id: this._generateId('training_plan_item'),
        training_plan_id: plan.id,
        session_id: sessionId,
        added_at: this._nowISO()
      };
      planItems.push(existing);
      this._saveToStorage('training_plan_items', planItems);
    }

    this._recalculateTrainingPlanTotal(plan);
    const plans = this._getFromStorage('training_plans');
    const updatedPlan = plans.find((p) => p.id === plan.id) || plan;

    return {
      success: true,
      training_plan: updatedPlan,
      plan_item: existing,
      total_estimated_cost: updatedPlan.total_estimated_cost || 0,
      message: 'Session added to training plan.'
    };
  }

  // getCurrentTrainingPlan
  getCurrentTrainingPlan() {
    const plans = this._getFromStorage('training_plans');
    const plan = plans[0] || null;
    if (!plan) {
      return { training_plan: null, items: [], total_estimated_cost: 0 };
    }

    const planItems = this._getFromStorage('training_plan_items');
    const sessions = this._getFromStorage('training_sessions');

    const itemsForPlan = planItems
      .filter((pi) => pi.training_plan_id === plan.id)
      .map((pi) => ({
        plan_item: pi,
        session: sessions.find((s) => s.id === pi.session_id) || null
      }));

    return {
      training_plan: plan,
      items: itemsForPlan,
      total_estimated_cost: plan.total_estimated_cost || 0
    };
  }

  // removeTrainingPlanItem
  removeTrainingPlanItem(trainingPlanItemId) {
    const planItems = this._getFromStorage('training_plan_items');
    const idx = planItems.findIndex((pi) => pi.id === trainingPlanItemId);
    if (idx === -1) {
      const plans = this._getFromStorage('training_plans');
      const plan = plans[0] || null;
      return {
        success: false,
        training_plan: plan,
        total_estimated_cost: plan ? plan.total_estimated_cost || 0 : 0,
        message: 'Training plan item not found.'
      };
    }

    const planId = planItems[idx].training_plan_id;
    planItems.splice(idx, 1);
    this._saveToStorage('training_plan_items', planItems);

    const plans = this._getFromStorage('training_plans');
    const plan = plans.find((p) => p.id === planId) || plans[0] || null;
    if (plan) {
      this._recalculateTrainingPlanTotal(plan);
      const updatedPlans = this._getFromStorage('training_plans');
      const updatedPlan = updatedPlans.find((p) => p.id === plan.id) || plan;
      return {
        success: true,
        training_plan: updatedPlan,
        total_estimated_cost: updatedPlan.total_estimated_cost || 0,
        message: 'Training plan item removed.'
      };
    }

    return {
      success: true,
      training_plan: null,
      total_estimated_cost: 0,
      message: 'Training plan item removed.'
    };
  }

  // confirmTrainingPlan
  confirmTrainingPlan(name) {
    const plans = this._getFromStorage('training_plans');
    const plan = plans[0] || null;
    if (!plan) {
      return { success: false, training_plan: null, total_estimated_cost: 0, message: 'No training plan to confirm.' };
    }

    if (name) {
      plan.name = name;
    }
    plan.updated_at = this._nowISO();
    this._saveToStorage('training_plans', plans);

    return {
      success: true,
      training_plan: plan,
      total_estimated_cost: plan.total_estimated_cost || 0,
      message: 'Training plan confirmed.'
    };
  }

  // getStoreFilterOptions
  getStoreFilterOptions() {
    const categories = [
      { value: 'training_dummy', label: 'Training Dummy' },
      { value: 'bumper', label: 'Bumper' },
      { value: 'leash', label: 'Leash' },
      { value: 'collar', label: 'Collar' },
      { value: 'apparel', label: 'Apparel' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'other', label: 'Other' }
    ];

    const products = this._getFromStorage('products');
    let minPrice = null;
    let maxPrice = null;

    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const rating_options = [
      { min_value: 4, label: '4 stars and up' },
      { min_value: 3, label: '3 stars and up' },
      { min_value: 2, label: '2 stars and up' },
      { min_value: 1, label: '1 star and up' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      categories,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice
      },
      rating_options,
      sort_options
    };
  }

  // searchProducts
  searchProducts(query, categories, min_price, max_price, min_rating, sort_by, page, page_size) {
    let products = this._getFromStorage('products').slice();
    const q = (query || '').toLowerCase();

    if (q) {
      products = products.filter((p) => {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const descMatch = p.description && p.description.toLowerCase().includes(q);
        const tagsMatch = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
        return nameMatch || descMatch || tagsMatch;
      });
    }

    if (categories && categories.length) {
      products = products.filter((p) => categories.includes(p.category));
    }

    if (typeof min_price === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price >= min_price);
    }

    if (typeof max_price === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price <= max_price);
    }

    if (typeof min_rating === 'number') {
      products = products.filter((p) => typeof p.rating_average === 'number' && p.rating_average >= min_rating);
    }

    if (sort_by === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'rating_high_to_low') {
      products.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const total_count = products.length;
    const paged = this._paginate(products, page, page_size);

    return { total_count, products: paged };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    return products.find((p) => p.id === productId) || null;
  }

  // addToCart
  addToCart(productId, quantity = 1) {
    if (quantity <= 0) {
      return { success: false, cart: null, added_item: null, message: 'Quantity must be positive.' };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart: null, added_item: null, message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cart_items = this._getFromStorage('cart_items');

    let item = cart_items.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);
    if (item) {
      item.quantity += quantity;
      item.line_total = item.quantity * item.unit_price;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        product_name_snapshot: product.name,
        unit_price: product.price,
        quantity: quantity,
        line_total: product.price * quantity
      };
      cart_items.push(item);
    }

    this._saveToStorage('cart_items', cart_items);
    this._recalculateCartTotals(cart);
    const updatedCarts = this._getFromStorage('cart');
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;

    return { success: true, cart: updatedCart, added_item: item, message: 'Item added to cart.' };
  }

  // getCartSummary (resolve product)
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const items = cart_items
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        cart_item: ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart,
      items,
      subtotal: cart.subtotal || 0
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, cart, message: 'Cart item not found.' };
    }

    const item = cart_items[idx];
    if (quantity <= 0) {
      cart_items.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.line_total = quantity * item.unit_price;
    }

    this._saveToStorage('cart_items', cart_items);
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const carts = this._getFromStorage('cart');
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    return { success: true, cart: updatedCart, message: 'Cart updated.' };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, cart, message: 'Cart item not found.' };
    }

    cart_items.splice(idx, 1);
    this._saveToStorage('cart_items', cart_items);

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const carts = this._getFromStorage('cart');
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    return { success: true, cart: updatedCart, message: 'Cart item removed.' };
  }

  // getCheckoutSummary (resolve product)
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const items = cart_items
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        cart_item: ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    const items_total = cart.subtotal || 0;
    const estimated_tax = 0;
    const grand_total = items_total + estimated_tax;

    return {
      cart,
      items,
      items_total,
      estimated_tax,
      grand_total
    };
  }

  // placeOrder
  placeOrder(
    delivery_method,
    payment_method,
    contact_name,
    contact_email,
    contact_phone,
    pickup_location,
    notes
  ) {
    if (!['clubhouse_pickup', 'shipping', 'digital'].includes(delivery_method)) {
      return { success: false, order: null, message: 'Invalid delivery method.' };
    }

    if (!['pay_at_pickup', 'pay_online', 'pay_at_club_office'].includes(payment_method)) {
      return { success: false, order: null, message: 'Invalid payment method.' };
    }

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const itemsForCart = cart_items.filter((ci) => ci.cart_id === cart.id);
    if (!itemsForCart.length) {
      return { success: false, order: null, message: 'Cart is empty.' };
    }

    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');

    const items_total = cart.subtotal || 0;

    const payment_status = payment_method === 'pay_online' ? 'paid' : 'unpaid';

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + this._getNextIdCounter(),
      created_at: this._nowISO(),
      updated_at: this._nowISO(),
      items_total,
      delivery_method,
      payment_method,
      payment_status,
      status: 'placed',
      pickup_location: pickup_location || null,
      contact_name,
      contact_email,
      contact_phone,
      notes: notes || ''
    };

    orders.push(order);

    for (const ci of itemsForCart) {
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name_snapshot: ci.product_name_snapshot,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total
      };
      order_items.push(oi);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);

    // Clear cart for single-user model
    const remainingCartItems = cart_items.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].subtotal = 0;
      carts[cartIndex].item_count = 0;
      carts[cartIndex].updated_at = this._nowISO();
      this._saveToStorage('cart', carts);
    }

    return { success: true, order, message: 'Order placed.' };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const event_types = [
      { value: 'field_trial', label: 'Field Trial' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'workday_volunteer', label: 'Workday / Volunteer' },
      { value: 'social', label: 'Social' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'other', label: 'Other' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'novice', label: 'Novice' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' },
      { value: 'n_a', label: 'N/A' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const shift_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full Day' }
    ];

    const events = this._getFromStorage('events');
    let minFee = null;
    let maxFee = null;
    for (const e of events) {
      if (typeof e.entry_fee === 'number') {
        if (minFee === null || e.entry_fee < minFee) minFee = e.entry_fee;
        if (maxFee === null || e.entry_fee > maxFee) maxFee = e.entry_fee;
      }
    }

    return {
      event_types,
      levels,
      day_of_week_options,
      shift_options,
      fee_range: {
        min_fee: minFee,
        max_fee: maxFee
      }
    };
  }

  // searchEvents
  searchEvents(
    event_types,
    levels,
    distance_from_springfield_max_miles,
    start_date_from,
    start_date_to,
    day_of_week,
    shifts,
    max_entry_fee,
    is_volunteer_event,
    sort_by
  ) {
    let events = this._getFromStorage('events').slice();

    if (event_types && event_types.length) {
      events = events.filter((e) => event_types.includes(e.event_type));
    }

    if (levels && levels.length) {
      events = events.filter((e) => e.level && levels.includes(e.level));
    }

    if (typeof distance_from_springfield_max_miles === 'number') {
      events = events.filter((e) =>
        typeof e.distance_from_springfield_miles === 'number' &&
        e.distance_from_springfield_miles <= distance_from_springfield_max_miles
      );
    }

    if (start_date_from || start_date_to) {
      events = events.filter((e) => this._inDateRange(e.start_datetime, start_date_from, start_date_to));
    }

    if (day_of_week && day_of_week.length) {
      events = events.filter((e) => e.day_of_week && day_of_week.includes(e.day_of_week));
    }

    if (shifts && shifts.length) {
      events = events.filter((e) => {
        if (Array.isArray(e.shifts_available) && e.shifts_available.length) {
          return e.shifts_available.some((s) => shifts.includes(s));
        }
        return true;
      });
    }

    if (typeof max_entry_fee === 'number') {
      events = events.filter((e) => typeof e.entry_fee === 'number' && e.entry_fee <= max_entry_fee);
    }

    if (typeof is_volunteer_event === 'boolean') {
      events = events.filter((e) => (e.is_volunteer_event || false) === is_volunteer_event);
    }

    if (sort_by === 'start_date_soonest') {
      events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    return {
      total_count: events.length,
      events
    };
  }

  // getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    return events.find((e) => e.id === eventId) || null;
  }

  // registerFieldTrialEntry
  registerFieldTrialEntry(
    eventId,
    handler_name,
    handler_email,
    handler_mobile_phone,
    dog_name,
    dog_breed,
    dog_age_years,
    competition_level,
    preferred_start_time,
    payment_method
  ) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, entry: null, message: 'Event not found.' };
    }

    if (!['novice', 'open', 'amateur', 'puppy', 'other'].includes(competition_level)) {
      return { success: false, entry: null, message: 'Invalid competition level.' };
    }

    if (!['pay_at_check_in', 'pay_online', 'pay_in_advance'].includes(payment_method)) {
      return { success: false, entry: null, message: 'Invalid payment method.' };
    }

    const entries = this._getFromStorage('field_trial_entries');
    const entry = {
      id: this._generateId('field_trial_entry'),
      event_id: eventId,
      handler_name,
      handler_email,
      handler_mobile_phone,
      dog_name,
      dog_breed,
      dog_age_years: typeof dog_age_years === 'number' ? dog_age_years : null,
      competition_level,
      preferred_start_time: preferred_start_time || null,
      payment_method,
      status: 'pending',
      created_at: this._nowISO()
    };

    entries.push(entry);
    this._saveToStorage('field_trial_entries', entries);

    return { success: true, entry, message: 'Field trial entry submitted.' };
  }

  // registerVolunteerForEvent
  registerVolunteerForEvent(
    eventId,
    volunteer_name,
    volunteer_email,
    volunteer_mobile_phone,
    num_helpers,
    task_preferences,
    tshirt_size,
    preferred_contact_method,
    shift
  ) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, message: 'Event not found.' };
    }

    const validSizes = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
    const sizeValue = validSizes.includes(tshirt_size) ? tshirt_size : null;

    if (!['text_message', 'email', 'phone_call'].includes(preferred_contact_method)) {
      return { success: false, registration: null, message: 'Invalid contact method.' };
    }

    const registrations = this._getFromStorage('volunteer_registrations');
    const registration = {
      id: this._generateId('volunteer_registration'),
      event_id: eventId,
      volunteer_name,
      volunteer_email,
      volunteer_mobile_phone,
      num_helpers: typeof num_helpers === 'number' ? num_helpers : 0,
      task_preferences: Array.isArray(task_preferences) ? task_preferences : [],
      tshirt_size: sizeValue,
      preferred_contact_method,
      shift: shift || null,
      created_at: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('volunteer_registrations', registrations);

    return { success: true, registration, message: 'Volunteer registration submitted.' };
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    const content_types = [
      { value: 'article', label: 'Article' },
      { value: 'video', label: 'Video' },
      { value: 'podcast', label: 'Podcast' },
      { value: 'checklist', label: 'Checklist' },
      { value: 'faq', label: 'FAQ' }
    ];

    const experience_levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const articles = this._getFromStorage('articles');
    const topicSet = new Set();
    for (const a of articles) {
      if (Array.isArray(a.topics)) {
        for (const t of a.topics) {
          topicSet.add(t);
        }
      }
    }

    const topics = Array.from(topicSet);

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'most_read', label: 'Most Read' },
      { value: 'newest', label: 'Newest' }
    ];

    return { content_types, experience_levels, topics, sort_options };
  }

  // searchArticles
  searchArticles(query, content_types, experience_levels, topics, sort_by, page, page_size) {
    let articles = this._getFromStorage('articles').slice();
    const q = (query || '').toLowerCase();

    if (q) {
      articles = articles.filter((a) => {
        const titleMatch = a.title && a.title.toLowerCase().includes(q);
        const bodyMatch = a.body && a.body.toLowerCase().includes(q);
        const topicMatch = Array.isArray(a.topics) && a.topics.some((t) => t.toLowerCase().includes(q));
        return titleMatch || bodyMatch || topicMatch;
      });
    }

    if (content_types && content_types.length) {
      articles = articles.filter((a) => content_types.includes(a.content_type));
    }

    if (experience_levels && experience_levels.length) {
      articles = articles.filter((a) => experience_levels.includes(a.experience_level));
    }

    if (topics && topics.length) {
      articles = articles.filter((a) => {
        if (!Array.isArray(a.topics)) return false;
        return a.topics.some((t) => topics.includes(t));
      });
    }

    if (sort_by === 'most_popular') {
      articles.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort_by === 'most_read') {
      articles.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sort_by === 'newest') {
      articles.sort((a, b) => new Date(b.publish_date || b.created_at || 0) - new Date(a.publish_date || a.created_at || 0));
    }

    const total_count = articles.length;
    const paged = this._paginate(articles, page, page_size);

    return { total_count, articles: paged };
  }

  // getArticleDetails
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find((a) => a.id === articleId) || null;
  }

  // saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, reading_list_item: null, message: 'Article not found.' };
    }

    const items = this._getFromStorage('reading_list_items');
    let existing = items.find((i) => i.article_id === articleId);
    if (!existing) {
      existing = {
        id: this._generateId('reading_list_item'),
        article_id: articleId,
        saved_at: this._nowISO(),
        note: '',
        last_updated_at: this._nowISO()
      };
      items.push(existing);
      this._saveToStorage('reading_list_items', items);
    }

    return { success: true, reading_list_item: existing, message: 'Article saved to reading list.' };
  }

  // updateReadingListItemNote
  updateReadingListItemNote(readingListItemId, note) {
    const items = this._getFromStorage('reading_list_items');
    const item = items.find((i) => i.id === readingListItemId);
    if (!item) {
      return { success: false, reading_list_item: null, message: 'Reading list item not found.' };
    }

    item.note = note || '';
    item.last_updated_at = this._nowISO();
    this._saveToStorage('reading_list_items', items);

    return { success: true, reading_list_item: item, message: 'Note updated.' };
  }

  // getReadingList (resolve article)
  getReadingList() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const enriched = items.map((i) => ({
      reading_list_item: i,
      article: articles.find((a) => a.id === i.article_id) || null
    }));

    return { items: enriched };
  }

  // removeReadingListItem
  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex((i) => i.id === readingListItemId);
    if (idx === -1) {
      return { success: false, message: 'Reading list item not found.' };
    }

    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);

    return { success: true, message: 'Reading list item removed.' };
  }

  // getMembershipPlansOverview
  getMembershipPlansOverview() {
    const plans = this._getFromStorage('membership_plans');
    const activePlans = plans.filter((p) => p.is_active !== false);
    return { plans: activePlans };
  }

  // getMembershipPlanDetails
  getMembershipPlanDetails(planId) {
    const plans = this._getFromStorage('membership_plans');
    return plans.find((p) => p.id === planId) || null;
  }

  // submitMembershipApplication
  submitMembershipApplication(
    planId,
    applicant_full_name,
    applicant_email,
    applicant_phone,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    second_handler_name,
    second_handler_relationship,
    preferred_start_date,
    payment_schedule,
    payment_method,
    auto_renew
  ) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, application: null, message: 'Membership plan not found.' };
    }

    if (!['annual', 'semi_annual', 'quarterly', 'monthly'].includes(payment_schedule)) {
      return { success: false, application: null, message: 'Invalid payment schedule.' };
    }

    if (!['pay_at_club_office', 'pay_online', 'mail_check', 'cash'].includes(payment_method)) {
      return { success: false, application: null, message: 'Invalid payment method.' };
    }

    const applications = this._getFromStorage('membership_applications');
    const application = {
      id: this._generateId('membership_application'),
      plan_id: planId,
      applicant_full_name,
      applicant_email,
      applicant_phone,
      address_line1,
      address_line2: address_line2 || '',
      city,
      state,
      zip,
      second_handler_name: second_handler_name || null,
      second_handler_relationship: second_handler_relationship || null,
      preferred_start_date: preferred_start_date || null,
      payment_schedule,
      payment_method,
      auto_renew: !!auto_renew,
      status: 'pending',
      created_at: this._nowISO()
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return { success: true, application, message: 'Membership application submitted.' };
  }

  // getTrainerFilterOptions
  getTrainerFilterOptions() {
    const specializations = this._getFromStorage('trainer_specializations');
    const trainers = this._getFromStorage('trainers');

    let min_rating = null;
    let max_rating = null;
    let min_rate = null;
    let max_rate = null;

    for (const t of trainers) {
      if (typeof t.rating_average === 'number') {
        if (min_rating === null || t.rating_average < min_rating) min_rating = t.rating_average;
        if (max_rating === null || t.rating_average > max_rating) max_rating = t.rating_average;
      }
      if (typeof t.hourly_rate === 'number') {
        if (min_rate === null || t.hourly_rate < min_rate) min_rate = t.hourly_rate;
        if (max_rate === null || t.hourly_rate > max_rate) max_rate = t.hourly_rate;
      }
    }

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'hourly_rate_low_to_high', label: 'Hourly Rate: Low to High' }
    ];

    return {
      specializations,
      rating_range: { min_rating, max_rating },
      hourly_rate_range: { min_rate, max_rate },
      sort_options
    };
  }

  // searchTrainers
  searchTrainers(specializations, base_zip, distance_radius_miles, min_rating, sort_by, page, page_size) {
    let trainers = this._getFromStorage('trainers').slice();

    if (specializations && specializations.length) {
      trainers = trainers.filter((t) =>
        Array.isArray(t.specializations) &&
        t.specializations.some((s) => specializations.includes(s))
      );
    }

    if (base_zip) {
      trainers = trainers.filter((t) => !t.base_zip || t.base_zip === base_zip);
    }

    if (typeof distance_radius_miles === 'number') {
      trainers = trainers.filter((t) => !t.service_radius_miles || t.service_radius_miles >= distance_radius_miles);
    }

    if (typeof min_rating === 'number') {
      trainers = trainers.filter((t) => typeof t.rating_average === 'number' && t.rating_average >= min_rating);
    }

    if (sort_by === 'rating_high_to_low') {
      trainers.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort_by === 'hourly_rate_low_to_high') {
      trainers.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
    }

    const total_count = trainers.length;
    const paged = this._paginate(trainers, page, page_size);

    return { total_count, trainers: paged };
  }

  // getTrainerDetails
  getTrainerDetails(trainerId) {
    const trainers = this._getFromStorage('trainers');
    return trainers.find((t) => t.id === trainerId) || null;
  }

  // getTrainerAvailability
  getTrainerAvailability(trainerId, start_date_from, start_date_to, time_of_day_preference, weekdays_only) {
    const trainers = this._getFromStorage('trainers');
    const trainer = trainers.find((t) => t.id === trainerId) || null;
    return this._computeTrainerAvailabilitySlots(trainer, start_date_from, start_date_to, time_of_day_preference, weekdays_only);
  }

  // bookTrainerEvaluation
  bookTrainerEvaluation(
    trainerId,
    appointment_type,
    start_datetime,
    duration_minutes,
    client_name,
    client_email,
    client_mobile_phone,
    dog_name,
    dog_breed,
    dog_age_years,
    confirmation_method
  ) {
    const trainers = this._getFromStorage('trainers');
    const trainer = trainers.find((t) => t.id === trainerId);
    if (!trainer) {
      return { success: false, booking: null, message: 'Trainer not found.' };
    }

    if (!['evaluation_60_min', 'consultation_30_min', 'lesson_60_min', 'lesson_90_min'].includes(appointment_type)) {
      return { success: false, booking: null, message: 'Invalid appointment type.' };
    }

    if (!['phone_call', 'email', 'text_message'].includes(confirmation_method)) {
      return { success: false, booking: null, message: 'Invalid confirmation method.' };
    }

    const bookings = this._getFromStorage('trainer_evaluation_bookings');
    const booking = {
      id: this._generateId('trainer_evaluation_booking'),
      trainer_id: trainerId,
      appointment_type,
      start_datetime,
      duration_minutes: duration_minutes || (appointment_type === 'consultation_30_min' ? 30 : 60),
      client_name,
      client_email,
      client_mobile_phone,
      dog_name,
      dog_breed,
      dog_age_years: typeof dog_age_years === 'number' ? dog_age_years : null,
      confirmation_method,
      status: 'pending',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('trainer_evaluation_bookings', bookings);

    return { success: true, booking, message: 'Trainer evaluation booked.' };
  }

  // getClubInfo
  getClubInfo() {
    const raw = localStorage.getItem('club_info');
    return raw ? JSON.parse(raw) : {};
  }

  // submitContactForm
  submitContactForm(name, email, phone, message) {
    const tickets = this._getFromStorage('contact_tickets');
    const ticket_id = this._generateId('ticket');

    const ticket = {
      id: ticket_id,
      name,
      email,
      phone: phone || null,
      message,
      created_at: this._nowISO()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return { success: true, ticket_id, message: 'Contact form submitted.' };
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