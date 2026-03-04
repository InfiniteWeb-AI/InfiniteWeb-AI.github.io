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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const arrayKeys = [
      'membership_plans',
      'membership_applications',
      'range_lanes',
      'ammo_products',
      'range_bookings',
      'range_booking_ammo_items',
      'courses',
      'course_registrations',
      'events',
      'event_registrations',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'shipping_methods',
      'donation_funds',
      'donations',
      'training_sessions',
      'my_schedule_items',
      'family_members',
      'member_profiles',
      'range_rules'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-object configs
    if (!localStorage.getItem('club_info')) {
      localStorage.setItem(
        'club_info',
        JSON.stringify({
          history: '',
          mission: '',
          facilities_overview: '',
          has_indoor_pistol_range: false,
          has_rifle_lanes: false,
          has_shotgun_fields: false
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          address: '',
          map_description: '',
          opening_hours: '',
          phone: '',
          email: '',
          contact_form_instructions: '',
          policy_summary: ''
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (typeof defaultValue !== 'undefined') {
        return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
      }
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

  // ------------------------
  // Generic helpers
  // ------------------------

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _safeParseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateISO(date) {
    if (!(date instanceof Date)) return null;
    return date.toISOString();
  }

  _getCurrentMemberProfile() {
    let profiles = this._getFromStorage('member_profiles', []);
    if (!profiles || profiles.length === 0) {
      const now = new Date().toISOString();
      const profile = {
        id: this._generateId('member_profile'),
        first_name: '',
        last_name: '',
        email: '',
        membership_number: '',
        personal_notes: '',
        created_at: now,
        updated_at: now
      };
      profiles.push(profile);
      this._saveToStorage('member_profiles', profiles);
      return profile;
    }
    return profiles[0];
  }

  _validateBookingWindow(dateTimeString) {
    if (!dateTimeString) return false;
    const dt = this._safeParseDate(dateTimeString.length <= 10 ? dateTimeString + 'T00:00:00' : dateTimeString);
    if (!dt) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const latest = new Date(startOfToday.getTime());
    // Allow bookings up to 60 days out
    latest.setDate(latest.getDate() + 60);
    return dt >= startOfToday && dt <= latest;
  }

  _ensureCourseHasSeats(courseId) {
    const courses = this._getFromStorage('courses', []);
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx === -1) {
      throw new Error('course_not_found');
    }
    const course = courses[idx];
    if (typeof course.remaining_seats === 'number' && course.remaining_seats <= 0) {
      throw new Error('course_full');
    }
    if (typeof course.remaining_seats === 'number') {
      course.remaining_seats = course.remaining_seats - 1;
    }
    courses[idx] = course;
    this._saveToStorage('courses', courses);
    return course;
  }

  _buildCalendarItemsFromSources(month, filters) {
    const parts = (month || '').split('-');
    if (parts.length !== 2) return [];
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (isNaN(year) || isNaN(monthIndex)) return [];

    const eventTypesFilter = filters && Array.isArray(filters.event_types) ? filters.event_types : null;
    const disciplineFilter = filters && filters.discipline ? filters.discipline : null;
    const timeOfDayFilter = filters && filters.time_of_day_slot ? filters.time_of_day_slot : null;
    const weekdaysOnly = !!(filters && filters.weekdays_only);

    const items = [];

    // Training sessions
    const trainingSessions = this._getFromStorage('training_sessions', []).filter((ts) => ts.is_active !== false);
    trainingSessions.forEach((ts) => {
      const dateObj = this._safeParseDate(ts.date || ts.start_datetime);
      if (!dateObj) return;
      if (dateObj.getFullYear() !== year || dateObj.getMonth() !== monthIndex) return;

      if (eventTypesFilter && !eventTypesFilter.includes('training_session')) return;
      if (disciplineFilter && ts.discipline && ts.discipline !== disciplineFilter) return;
      if (timeOfDayFilter && ts.time_of_day_slot && ts.time_of_day_slot !== timeOfDayFilter) return;
      if (weekdaysOnly && ts.is_weekday === false) return;

      items.push({
        item_type: 'training_session',
        id: ts.id,
        title: ts.title,
        discipline: ts.discipline,
        date: ts.date || ts.start_datetime,
        start_datetime: ts.start_datetime,
        end_datetime: ts.end_datetime,
        time_of_day_slot: ts.time_of_day_slot,
        is_weekday: ts.is_weekday,
        location: ts.location || ''
      });
    });

    // Events (competitions, courses, socials)
    const events = this._getFromStorage('events', []).filter((ev) => ev.is_active !== false);
    events.forEach((ev) => {
      const dateObj = this._safeParseDate(ev.date || ev.start_datetime);
      if (!dateObj) return;
      if (dateObj.getFullYear() !== year || dateObj.getMonth() !== monthIndex) return;

      if (eventTypesFilter && !eventTypesFilter.includes(ev.event_type)) return;
      if (disciplineFilter && ev.discipline && ev.discipline !== disciplineFilter) return;

      let timeSlot = null;
      if (ev.start_datetime) {
        const sd = this._safeParseDate(ev.start_datetime);
        if (sd) {
          const hour = sd.getHours();
          if (hour < 12) timeSlot = 'morning';
          else if (hour < 18) timeSlot = 'afternoon';
          else timeSlot = 'evening';
        }
      }
      if (timeOfDayFilter && timeSlot && timeSlot !== timeOfDayFilter) return;

      const day = dateObj.getDay();
      const isWeekday = day >= 1 && day <= 5;
      if (weekdaysOnly && !isWeekday) return;

      items.push({
        item_type: 'event',
        id: ev.id,
        title: ev.name,
        discipline: ev.discipline,
        date: ev.date,
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime,
        time_of_day_slot: timeSlot,
        is_weekday: isWeekday,
        location: ev.location || ''
      });
    });

    // Range bookings
    const rangeBookings = this._getFromStorage('range_bookings', []);
    const lanes = this._getFromStorage('range_lanes', []);
    rangeBookings.forEach((rb) => {
      const dateObj = this._safeParseDate(rb.booking_date || rb.start_datetime);
      if (!dateObj) return;
      if (dateObj.getFullYear() !== year || dateObj.getMonth() !== monthIndex) return;

      if (eventTypesFilter && !eventTypesFilter.includes('range_booking')) return;

      const lane = lanes.find((l) => l.id === rb.range_lane_id) || null;
      if (disciplineFilter && lane && lane.discipline && lane.discipline !== disciplineFilter) return;

      let timeSlot = null;
      if (rb.start_datetime) {
        const sd = this._safeParseDate(rb.start_datetime);
        if (sd) {
          const hour = sd.getHours();
          if (hour < 12) timeSlot = 'morning';
          else if (hour < 18) timeSlot = 'afternoon';
          else timeSlot = 'evening';
        }
      }
      if (timeOfDayFilter && timeSlot && timeSlot !== timeOfDayFilter) return;

      const day = dateObj.getDay();
      const isWeekday = day >= 1 && day <= 5;
      if (weekdaysOnly && !isWeekday) return;

      items.push({
        item_type: 'range_booking',
        id: rb.id,
        title: lane ? lane.name : 'Range Booking',
        discipline: lane ? lane.discipline : null,
        date: rb.booking_date || rb.start_datetime,
        start_datetime: rb.start_datetime,
        end_datetime: rb.end_datetime,
        time_of_day_slot: timeSlot,
        is_weekday: isWeekday,
        location: lane ? lane.description || '' : ''
      });
    });

    return items;
  }

  // Cart helpers

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [], // store cart_item ids
        shipping_method_id: null,
        merchandise_total: 0,
        shipping_cost: 0,
        total_amount: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart', []);
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx === -1) return cart;

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let merchandiseTotal = 0;
    itemsForCart.forEach((item) => {
      merchandiseTotal += item.total_price || 0;
    });

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = shippingMethods.find((sm) => sm.id === cart.shipping_method_id) || null;
    const shippingCost = shippingMethod ? shippingMethod.price || 0 : 0;

    cart.merchandise_total = merchandiseTotal;
    cart.shipping_cost = shippingCost;
    cart.total_amount = merchandiseTotal + shippingCost;
    cart.updated_at = new Date().toISOString();

    carts[cartIdx] = cart;
    this._saveToStorage('cart', carts);
    return cart;
  }

  _buildCartSummary(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const category = product ? categories.find((c) => c.id === product.product_category_id) || null : null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name_snapshot || (product ? product.name : ''),
        product_category: item.product_category_snapshot || (category ? category.name : ''),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
        image_url: product ? product.image_url || null : null,
        // Foreign key resolution
        product: product
      };
    });

    const shippingMethod = shippingMethods.find((sm) => sm.id === cart.shipping_method_id) || null;

    let currency = 'USD';
    if (items.length > 0) {
      const prod = products.find((p) => p.id === items[0].product_id);
      if (prod && prod.currency) currency = prod.currency;
    }

    return {
      cart_id: cart.id,
      status: cart.status,
      items: items,
      shipping_method_id: cart.shipping_method_id || null,
      shipping_method_name: shippingMethod ? shippingMethod.name : null,
      shipping_method: shippingMethod || null,
      merchandise_total: cart.merchandise_total || 0,
      shipping_cost: cart.shipping_cost || 0,
      total_amount: cart.total_amount || 0,
      currency: currency
    };
  }

  // ------------------------
  // Interfaces implementation
  // ------------------------

  // getHomeHighlights
  getHomeHighlights() {
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const courses = this._getFromStorage('courses', []);
    const events = this._getFromStorage('events', []);

    const now = new Date();

    const featuredMemberships = membershipPlans
      .filter((p) => p.is_active !== false && p.is_featured === true)
      .map((p) => ({
        id: p.id,
        name: p.name,
        billing_period: p.billing_period,
        price: p.price,
        currency: p.currency || 'USD',
        has_indoor_pistol_access: !!p.has_indoor_pistol_access,
        guest_pass_count: p.guest_pass_count || 0,
        is_featured: !!p.is_featured
      }));

    const upcomingCourses = courses
      .filter((c) => c.is_active !== false)
      .filter((c) => {
        const sd = this._safeParseDate(c.start_datetime);
        return sd ? sd >= now : false;
      })
      .sort((a, b) => {
        const ad = this._safeParseDate(a.start_datetime) || now;
        const bd = this._safeParseDate(b.start_datetime) || now;
        return ad - bd;
      })
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        title: c.title,
        course_type: c.course_type,
        level: c.level,
        start_datetime: c.start_datetime,
        duration_hours: c.duration_hours,
        price: c.price,
        currency: c.currency || 'USD'
      }));

    const upcomingCompetitions = events
      .filter((e) => e.is_active !== false && e.event_type === 'competition')
      .filter((e) => {
        const d = this._safeParseDate(e.date || e.start_datetime);
        return d ? d >= now : false;
      })
      .sort((a, b) => {
        const ad = this._safeParseDate(a.date || a.start_datetime) || now;
        const bd = this._safeParseDate(b.date || b.start_datetime) || now;
        return ad - bd;
      })
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        name: e.name,
        discipline: e.discipline,
        distance_meters: e.distance_meters,
        date: e.date,
        entry_fee: e.entry_fee,
        currency: e.currency || 'USD'
      }));

    return {
      featured_membership_plans: featuredMemberships,
      upcoming_courses: upcomingCourses,
      upcoming_competitions: upcomingCompetitions
    };
  }

  // getMembershipFilterOptions
  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans', []);

    const billingSet = new Set();
    const guestPassSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    plans.forEach((p) => {
      if (p.billing_period) billingSet.add(p.billing_period);
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.guest_pass_count === 'number') guestPassSet.add(p.guest_pass_count);
    });

    const billing_period_options = Array.from(billingSet);
    const guest_pass_thresholds = Array.from(guestPassSet).sort((a, b) => a - b);

    const facility_options = {
      supports_indoor_pistol: plans.some((p) => p.has_indoor_pistol_access),
      supports_rifle_range: plans.some((p) => p.has_rifle_range_access),
      supports_shotgun_range: plans.some((p) => p.has_shotgun_range_access)
    };

    return {
      billing_period_options,
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      facility_options,
      guest_pass_thresholds,
      sort_options: ['price_asc', 'price_desc', 'name_asc']
    };
  }

  // searchMembershipPlans(filters, sort_by)
  searchMembershipPlans(filters, sort_by) {
    const plans = this._getFromStorage('membership_plans', []);
    const f = filters || {};

    let results = plans.filter((p) => {
      if (f.billing_period && p.billing_period !== f.billing_period) return false;
      if (typeof f.min_price === 'number' && !(p.price >= f.min_price)) return false;
      if (typeof f.max_price === 'number' && !(p.price <= f.max_price)) return false;
      if (f.requires_indoor_pistol_access && !p.has_indoor_pistol_access) return false;
      if (f.requires_rifle_range_access && !p.has_rifle_range_access) return false;
      if (f.requires_shotgun_range_access && !p.has_shotgun_range_access) return false;
      if (typeof f.min_guest_passes === 'number' && !(p.guest_pass_count >= f.min_guest_passes)) return false;
      if (f.only_active && p.is_active === false) return false;
      return true;
    });

    const sortMode = sort_by || 'price_asc';
    if (sortMode === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortMode === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortMode === 'name_asc') {
      results.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    return results.map((p) => ({
      id: p.id,
      name: p.name,
      billing_period: p.billing_period,
      billing_period_label:
        p.billing_period === 'annual'
          ? 'Annual'
          : p.billing_period === 'monthly'
          ? 'Monthly'
          : p.billing_period === 'quarterly'
          ? 'Quarterly'
          : p.billing_period,
      price: p.price,
      currency: p.currency || 'USD',
      has_indoor_pistol_access: !!p.has_indoor_pistol_access,
      has_rifle_range_access: !!p.has_rifle_range_access,
      has_shotgun_range_access: !!p.has_shotgun_range_access,
      guest_pass_count: p.guest_pass_count || 0,
      guest_pass_description: p.guest_pass_description || '',
      is_active: p.is_active !== false,
      is_featured: !!p.is_featured
    }));
  }

  // getMembershipPlanDetail(membershipPlanId)
  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === membershipPlanId);
    if (!plan) return null;
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      billing_period: plan.billing_period,
      price: plan.price,
      currency: plan.currency || 'USD',
      has_indoor_pistol_access: !!plan.has_indoor_pistol_access,
      has_rifle_range_access: !!plan.has_rifle_range_access,
      has_shotgun_range_access: !!plan.has_shotgun_range_access,
      guest_pass_count: plan.guest_pass_count || 0,
      guest_pass_description: plan.guest_pass_description || '',
      rules_summary: plan.rules_summary || '',
      is_active: plan.is_active !== false
    };
  }

  // startMembershipApplication(membershipPlanId, notes)
  startMembershipApplication(membershipPlanId, notes) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === membershipPlanId);
    if (!plan) {
      throw new Error('membership_plan_not_found');
    }

    const applications = this._getFromStorage('membership_applications', []);
    const now = new Date().toISOString();
    const application = {
      id: this._generateId('membership_app'),
      membership_plan_id: membershipPlanId,
      started_at: now,
      status: 'in_progress',
      plan_name_snapshot: plan.name,
      plan_price_snapshot: plan.price,
      billing_period_snapshot: plan.billing_period,
      notes: notes || ''
    };
    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      application_id: application.id,
      status: application.status,
      membership_plan_id: application.membership_plan_id,
      plan_name_snapshot: application.plan_name_snapshot,
      plan_price_snapshot: application.plan_price_snapshot,
      billing_period_snapshot: application.billing_period_snapshot,
      started_at: application.started_at,
      message: 'membership_application_started'
    };
  }

  // getRangeBookingFilterOptions
  getRangeBookingFilterOptions() {
    const lanes = this._getFromStorage('range_lanes', []);
    const disciplineSet = new Set();
    lanes.forEach((l) => {
      if (l.discipline) disciplineSet.add(l.discipline);
    });
    const discipline_options = Array.from(disciplineSet);

    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const latest = new Date(earliest.getTime());
    latest.setDate(latest.getDate() + 60);

    return {
      discipline_options,
      time_of_day_slots: ['morning', 'afternoon', 'evening'],
      earliest_bookable_date: earliest.toISOString().slice(0, 10),
      latest_bookable_date: latest.toISOString().slice(0, 10)
    };
  }

  // searchAvailableRangeSlots(discipline, date, time_of_day_slot, is_indoor)
  searchAvailableRangeSlots(discipline, date, time_of_day_slot, is_indoor) {
    if (!discipline || !date) return [];
    if (!this._validateBookingWindow(date)) return [];

    const lanes = this._getFromStorage('range_lanes', []).filter(
      (l) => l.is_active !== false && l.discipline === discipline
    );
    const bookings = this._getFromStorage('range_bookings', []);

    const slots = [];

    lanes.forEach((lane) => {
      if (typeof is_indoor === 'boolean' && !!lane.is_indoor !== is_indoor) return;

      let startHour = 9;
      let endHour = 11;
      if (time_of_day_slot === 'afternoon') {
        startHour = 13;
        endHour = 15;
      } else if (time_of_day_slot === 'evening') {
        startHour = 18;
        endHour = 21;
      }

      const start = new Date(date + 'T' + String(startHour).padStart(2, '0') + ':00:00');
      const end = new Date(date + 'T' + String(endHour).padStart(2, '0') + ':00:00');

      const existing = bookings.find(
        (b) =>
          b.range_lane_id === lane.id &&
          b.start_datetime &&
          this._safeParseDate(b.start_datetime) &&
          this._safeParseDate(b.start_datetime).getTime() === start.getTime() &&
          b.status !== 'cancelled'
      );

      const isAvailable = !existing;
      if (!isAvailable) return; // only return available slots

      const basePrice = lane.base_price || 0;
      const currency = lane.currency || 'USD';

      slots.push({
        range_lane_id: lane.id,
        lane_name: lane.name,
        discipline: lane.discipline,
        is_indoor: !!lane.is_indoor,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        time_of_day_slot: time_of_day_slot || 'morning',
        is_available: true,
        base_price: basePrice,
        currency: currency,
        // Foreign key resolution
        range_lane: lane
      });
    });

    return slots;
  }

  // getRangeSlotDetails(rangeLaneId, startDateTime)
  getRangeSlotDetails(rangeLaneId, startDateTime) {
    const lanes = this._getFromStorage('range_lanes', []);
    const lane = lanes.find((l) => l.id === rangeLaneId);
    if (!lane) return null;

    const start = this._safeParseDate(startDateTime);
    if (!start) return null;
    const end = new Date(start.getTime());
    end.setHours(end.getHours() + 3);

    const basePrice = lane.base_price || 0;
    const currency = lane.currency || 'USD';

    return {
      range_lane_id: lane.id,
      lane_name: lane.name,
      discipline: lane.discipline,
      is_indoor: !!lane.is_indoor,
      booking_date: start.toISOString().slice(0, 10),
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      base_price: basePrice,
      currency: currency,
      safety_note_summary: '',
      // Foreign key resolution
      range_lane: lane
    };
  }

  // getAmmoFilterOptions
  getAmmoFilterOptions() {
    const ammo = this._getFromStorage('ammo_products', []);
    const map = new Map();
    ammo.forEach((a) => {
      if (!a.is_active || a.is_addon_available === false) return;
      if (!map.has(a.caliber)) {
        map.set(a.caliber, a.caliber_label || a.caliber);
      }
    });
    const caliber_options = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    return { caliber_options };
  }

  // getAmmoProductsByCaliber(caliber, max_price)
  getAmmoProductsByCaliber(caliber, max_price) {
    if (!caliber) return [];
    const ammo = this._getFromStorage('ammo_products', []);
    const results = ammo.filter((a) => {
      if (!a.is_active || a.is_addon_available === false) return false;
      if (a.caliber !== caliber) return false;
      if (typeof max_price === 'number' && !(a.price <= max_price)) return false;
      return true;
    });
    return results.map((a) => ({
      id: a.id,
      name: a.name,
      caliber: a.caliber,
      caliber_label: a.caliber_label || a.caliber,
      price: a.price,
      rounds_per_package: a.rounds_per_package,
      description: a.description || '',
      is_addon_available: a.is_addon_available !== false,
      is_active: a.is_active !== false
    }));
  }

  // createRangeBookingWithAmmo(rangeLaneId, startDateTime, shootersCount, ammoItems, notes)
  createRangeBookingWithAmmo(rangeLaneId, startDateTime, shootersCount, ammoItems, notes) {
    if (!rangeLaneId || !startDateTime) {
      throw new Error('invalid_parameters');
    }
    if (!this._validateBookingWindow(startDateTime)) {
      throw new Error('outside_booking_window');
    }
    if (!shootersCount || shootersCount <= 0) {
      throw new Error('invalid_shooters_count');
    }

    const lanes = this._getFromStorage('range_lanes', []);
    const lane = lanes.find((l) => l.id === rangeLaneId);
    if (!lane) throw new Error('range_lane_not_found');

    const bookings = this._getFromStorage('range_bookings', []);
    const start = this._safeParseDate(startDateTime);
    if (!start) throw new Error('invalid_start_datetime');
    const end = new Date(start.getTime());
    end.setHours(end.getHours() + 3);

    const existing = bookings.find((b) => {
      const bStart = this._safeParseDate(b.start_datetime);
      return (
        b.range_lane_id === rangeLaneId &&
        bStart &&
        bStart.getTime() === start.getTime() &&
        b.status !== 'cancelled'
      );
    });
    if (existing) throw new Error('slot_already_booked');

    const ammoProducts = this._getFromStorage('ammo_products', []);
    const ammoItemsInput = Array.isArray(ammoItems) ? ammoItems : [];

    const bookingId = this._generateId('range_booking');
    const booking_date = start.toISOString().slice(0, 10);

    const basePrice = lane.base_price || 0;
    const currency = lane.currency || 'USD';

    let ammoLines = [];
    let ammoTotal = 0;

    ammoItemsInput.forEach((ai) => {
      if (!ai || !ai.ammoProductId || !ai.quantity) return;
      const product = ammoProducts.find((p) => p.id === ai.ammoProductId);
      if (!product) return;
      const qty = ai.quantity;
      const unit = product.price || 0;
      const total = unit * qty;
      ammoTotal += total;
      ammoLines.push({
        id: this._generateId('range_booking_ammo'),
        range_booking_id: bookingId,
        ammo_product_id: product.id,
        quantity: qty,
        unit_price: unit,
        total_price: total
      });
    });

    const totalPrice = basePrice + ammoTotal;
    const nowIso = new Date().toISOString();

    const booking = {
      id: bookingId,
      range_lane_id: rangeLaneId,
      booking_date: booking_date,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      shooters_count: shootersCount,
      status: 'pending',
      notes: notes || '',
      total_price: totalPrice,
      created_at: nowIso
    };

    bookings.push(booking);
    this._saveToStorage('range_bookings', bookings);

    const existingAmmoItems = this._getFromStorage('range_booking_ammo_items', []);
    ammoLines.forEach((line) => existingAmmoItems.push(line));
    this._saveToStorage('range_booking_ammo_items', existingAmmoItems);

    const ammoItemsResponse = ammoLines.map((line) => {
      const product = ammoProducts.find((p) => p.id === line.ammo_product_id) || null;
      return {
        ammo_product_id: line.ammo_product_id,
        name: product ? product.name : '',
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.total_price
      };
    });

    return {
      booking_id: booking.id,
      status: booking.status,
      range_lane_id: booking.range_lane_id,
      lane_name: lane.name,
      booking_date: booking.booking_date,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      shooters_count: booking.shooters_count,
      ammo_items: ammoItemsResponse,
      total_price: booking.total_price,
      currency: currency,
      message: 'range_booking_created'
    };
  }

  // getCourseFilterOptions
  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses', []);
    const courseTypeSet = new Set();
    const levelSet = new Set();
    const timeSlotSet = new Set();
    const dayOfWeekSet = new Set();
    const durationSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    courses.forEach((c) => {
      if (c.course_type) courseTypeSet.add(c.course_type);
      if (c.level) levelSet.add(c.level);
      if (c.time_of_day_slot) timeSlotSet.add(c.time_of_day_slot);
      if (c.day_of_week) dayOfWeekSet.add(c.day_of_week);
      if (typeof c.duration_hours === 'number') durationSet.add(c.duration_hours);
      if (typeof c.price === 'number') {
        if (minPrice === null || c.price < minPrice) minPrice = c.price;
        if (maxPrice === null || c.price > maxPrice) maxPrice = c.price;
      }
    });

    return {
      course_type_options: Array.from(courseTypeSet),
      level_options: Array.from(levelSet),
      time_of_day_slots: Array.from(timeSlotSet),
      day_of_week_options: Array.from(dayOfWeekSet),
      duration_thresholds_hours: Array.from(durationSet).sort((a, b) => a - b),
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      sort_options: ['price_asc', 'price_desc', 'date_asc']
    };
  }

  // searchCourses(filters, sort_by)
  searchCourses(filters, sort_by) {
    const courses = this._getFromStorage('courses', []);
    const f = filters || {};

    let results = courses.filter((c) => {
      if (f.course_type && c.course_type !== f.course_type) return false;
      if (f.level && c.level !== f.level) return false;

      const startDate = this._safeParseDate(c.start_datetime);
      if (!startDate) return false;

      if (f.start_date_from) {
        const from = this._safeParseDate(f.start_date_from + 'T00:00:00');
        if (from && startDate < from) return false;
      }
      if (f.start_date_to) {
        const to = this._safeParseDate(f.start_date_to + 'T23:59:59');
        if (to && startDate > to) return false;
      }

      if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
        if (!f.days_of_week.includes(c.day_of_week)) return false;
      }

      if (f.time_of_day_slot && c.time_of_day_slot !== f.time_of_day_slot) return false;

      if (typeof f.min_duration_hours === 'number' && !(c.duration_hours >= f.min_duration_hours)) return false;

      if (typeof f.max_price === 'number' && !(c.price <= f.max_price)) return false;

      if (f.only_with_remaining_seats && typeof c.remaining_seats === 'number' && c.remaining_seats <= 0)
        return false;

      if (f.only_active && c.is_active === false) return false;

      return true;
    });

    const sortMode = sort_by || 'price_asc';
    if (sortMode === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortMode === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortMode === 'date_asc') {
      results.sort((a, b) => {
        const ad = this._safeParseDate(a.start_datetime) || new Date();
        const bd = this._safeParseDate(b.start_datetime) || new Date();
        return ad - bd;
      });
    }

    return results.map((c) => ({
      id: c.id,
      title: c.title,
      course_type: c.course_type,
      level: c.level,
      discipline: c.discipline,
      start_datetime: c.start_datetime,
      end_datetime: c.end_datetime,
      duration_hours: c.duration_hours,
      day_of_week: c.day_of_week,
      time_of_day_slot: c.time_of_day_slot,
      is_weekend: !!c.is_weekend,
      price: c.price,
      currency: c.currency || 'USD',
      remaining_seats: typeof c.remaining_seats === 'number' ? c.remaining_seats : null
    }));
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses', []);
    const c = courses.find((x) => x.id === courseId);
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description || '',
      course_type: c.course_type,
      level: c.level,
      discipline: c.discipline,
      start_datetime: c.start_datetime,
      end_datetime: c.end_datetime,
      duration_hours: c.duration_hours,
      day_of_week: c.day_of_week,
      time_of_day_slot: c.time_of_day_slot,
      is_weekend: !!c.is_weekend,
      price: c.price,
      currency: c.currency || 'USD',
      max_participants: c.max_participants,
      remaining_seats: c.remaining_seats,
      location: c.location || '',
      requirements: c.requirements || ''
    };
  }

  // registerForCourse(courseId, participantType, familyMemberId)
  registerForCourse(courseId, participantType, familyMemberId) {
    if (!courseId || !participantType) throw new Error('invalid_parameters');

    const course = this._ensureCourseHasSeats(courseId);

    let participantName = '';
    let participant_type = participantType;
    let family_member_id = null;

    if (participantType === 'main_member') {
      const profile = this._getCurrentMemberProfile();
      participantName = (profile.first_name || '') + (profile.last_name ? ' ' + profile.last_name : '');
      if (!participantName.trim()) participantName = 'Main Member';
    } else if (participantType === 'family_member') {
      const familyMembers = this._getFromStorage('family_members', []);
      const fm = familyMembers.find((f) => f.id === familyMemberId);
      if (!fm) throw new Error('family_member_not_found');
      participantName = fm.first_name + (fm.last_name ? ' ' + fm.last_name : '');
      family_member_id = fm.id;
    } else {
      throw new Error('invalid_participant_type');
    }

    const registrations = this._getFromStorage('course_registrations', []);
    const now = new Date().toISOString();
    const registration = {
      id: this._generateId('course_reg'),
      course_id: course.id,
      participant_type,
      participant_name: participantName,
      family_member_id,
      status: 'confirmed',
      registered_at: now,
      price_paid: course.price
    };
    registrations.push(registration);
    this._saveToStorage('course_registrations', registrations);

    return {
      registration_id: registration.id,
      course_id: registration.course_id,
      participant_type: registration.participant_type,
      participant_name: registration.participant_name,
      status: registration.status,
      registered_at: registration.registered_at,
      price_paid: registration.price_paid,
      currency: course.currency || 'USD',
      message: 'course_registration_confirmed'
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const disciplineSet = new Set();
    const eventTypeSet = new Set();
    const skillLevelSet = new Set();
    const distanceSet = new Set();
    const monthSet = new Set();
    let minFee = null;
    let maxFee = null;

    events.forEach((e) => {
      if (e.discipline) disciplineSet.add(e.discipline);
      if (e.event_type) eventTypeSet.add(e.event_type);
      if (Array.isArray(e.allowed_skill_levels)) {
        e.allowed_skill_levels.forEach((lvl) => skillLevelSet.add(lvl));
      }
      if (typeof e.distance_meters === 'number') distanceSet.add(e.distance_meters);
      if (typeof e.month_number === 'number') monthSet.add(e.month_number);
      if (typeof e.entry_fee === 'number') {
        if (minFee === null || e.entry_fee < minFee) minFee = e.entry_fee;
        if (maxFee === null || e.entry_fee > maxFee) maxFee = e.entry_fee;
      }
    });

    return {
      discipline_options: Array.from(disciplineSet),
      event_type_options: Array.from(eventTypeSet),
      skill_level_options: Array.from(skillLevelSet),
      distance_options_meters: Array.from(distanceSet).sort((a, b) => a - b),
      month_options: Array.from(monthSet).sort((a, b) => a - b),
      entry_fee_range: {
        min_fee: minFee === null ? 0 : minFee,
        max_fee: maxFee === null ? 0 : maxFee
      },
      sort_options: ['date_asc', 'price_asc', 'price_desc']
    };
  }

  // searchEvents(filters, sort_by)
  searchEvents(filters, sort_by) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};

    let results = events.filter((e) => {
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (f.discipline && e.discipline !== f.discipline) return false;
      if (typeof f.distance_meters === 'number' && e.distance_meters !== f.distance_meters) return false;
      if (typeof f.month_number === 'number' && e.month_number !== f.month_number) return false;

      if (typeof f.max_entry_fee === 'number' && typeof e.entry_fee === 'number') {
        if (!(e.entry_fee <= f.max_entry_fee)) return false;
      }

      if (f.skill_level) {
        const levels = Array.isArray(e.allowed_skill_levels) ? e.allowed_skill_levels : [];
        const defaultLevel = e.default_skill_level || null;
        if (
          levels.length > 0 &&
          !levels.includes(f.skill_level) &&
          !levels.includes('open') &&
          defaultLevel !== 'open'
        ) {
          return false;
        }
      }

      if (f.only_active && e.is_active === false) return false;
      return true;
    });

    const sortMode = sort_by || 'date_asc';
    if (sortMode === 'price_asc') {
      results.sort((a, b) => (a.entry_fee || 0) - (b.entry_fee || 0));
    } else if (sortMode === 'price_desc') {
      results.sort((a, b) => (b.entry_fee || 0) - (a.entry_fee || 0));
    } else if (sortMode === 'date_asc') {
      results.sort((a, b) => {
        const ad = this._safeParseDate(a.date || a.start_datetime) || new Date();
        const bd = this._safeParseDate(b.date || b.start_datetime) || new Date();
        return ad - bd;
      });
    }

    return results.map((e) => ({
      id: e.id,
      name: e.name,
      event_type: e.event_type,
      discipline: e.discipline,
      distance_meters: e.distance_meters,
      date: e.date,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      entry_fee: e.entry_fee,
      currency: e.currency || 'USD',
      allowed_skill_levels: Array.isArray(e.allowed_skill_levels) ? e.allowed_skill_levels : []
    }));
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const e = events.find((x) => x.id === eventId);
    if (!e) return null;
    return {
      id: e.id,
      name: e.name,
      description: e.description || '',
      event_type: e.event_type,
      discipline: e.discipline,
      distance_meters: e.distance_meters,
      date: e.date,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      location: e.location || '',
      entry_fee: e.entry_fee,
      currency: e.currency || 'USD',
      allowed_skill_levels: Array.isArray(e.allowed_skill_levels) ? e.allowed_skill_levels : [],
      default_skill_level: e.default_skill_level || 'open',
      rules_summary: e.rules_summary || ''
    };
  }

  // registerForEvent(eventId, selectedSkillLevel)
  registerForEvent(eventId, selectedSkillLevel) {
    if (!eventId || !selectedSkillLevel) throw new Error('invalid_parameters');

    const events = this._getFromStorage('events', []);
    const e = events.find((x) => x.id === eventId);
    if (!e) throw new Error('event_not_found');
    if (e.is_active === false) throw new Error('event_inactive');

    const levels = Array.isArray(e.allowed_skill_levels) ? e.allowed_skill_levels : [];
    const defaultLevel = e.default_skill_level || null;
    if (
      levels.length > 0 &&
      !levels.includes(selectedSkillLevel) &&
      !levels.includes('open') &&
      defaultLevel !== 'open'
    ) {
      throw new Error('skill_level_not_allowed');
    }

    const registrations = this._getFromStorage('event_registrations', []);
    const now = new Date().toISOString();
    const reg = {
      id: this._generateId('event_reg'),
      event_id: e.id,
      selected_skill_level: selectedSkillLevel,
      status: 'confirmed',
      registered_at: now,
      entry_fee_paid: e.entry_fee
    };
    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    return {
      registration_id: reg.id,
      event_id: reg.event_id,
      selected_skill_level: reg.selected_skill_level,
      status: reg.status,
      registered_at: reg.registered_at,
      entry_fee_paid: reg.entry_fee_paid,
      currency: e.currency || 'USD',
      message: 'event_registration_confirmed'
    };
  }

  // getShopCategories
  getShopCategories() {
    const categories = this._getFromStorage('product_categories', []);
    return categories
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || ''
      }));
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []);
    let filtered = products;
    if (categoryId) {
      filtered = filtered.filter((p) => p.product_category_id === categoryId);
    }

    let minPrice = null;
    let maxPrice = null;
    const sizes = new Set();
    const ratings = new Set();

    filtered.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.size_options)) {
        p.size_options.forEach((s) => sizes.add(s));
      }
      if (typeof p.rating === 'number') {
        ratings.add(Math.floor(p.rating));
      }
    });

    const rating_thresholds = Array.from(ratings).sort((a, b) => a - b);

    return {
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      rating_thresholds,
      available_sizes: Array.from(sizes)
    };
  }

  // searchProducts(filters, sort_by)
  searchProducts(filters, sort_by) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const f = filters || {};

    let results = products.filter((p) => {
      if (f.category_id && p.product_category_id !== f.category_id) return false;
      if (typeof f.min_price === 'number' && !(p.price >= f.min_price)) return false;
      if (typeof f.max_price === 'number' && !(p.price <= f.max_price)) return false;
      if (typeof f.min_rating === 'number' && typeof p.rating === 'number' && !(p.rating >= f.min_rating))
        return false;
      if (f.only_active && p.is_active === false) return false;
      if (typeof f.is_apparel === 'boolean' && !!p.is_apparel !== f.is_apparel) return false;
      if (typeof f.is_hat === 'boolean' && !!p.is_hat !== f.is_hat) return false;
      return true;
    });

    const sortMode = sort_by || 'price_asc';
    if (sortMode === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortMode === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortMode === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results.map((p) => {
      const category = categories.find((c) => c.id === p.product_category_id) || null;
      return {
        id: p.id,
        name: p.name,
        category_name: category ? category.name : '',
        price: p.price,
        currency: p.currency || 'USD',
        rating: p.rating,
        rating_count: p.rating_count,
        size_options: Array.isArray(p.size_options) ? p.size_options : [],
        is_apparel: !!p.is_apparel,
        is_hat: !!p.is_hat,
        image_url: p.image_url || ''
      };
    });
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const p = products.find((x) => x.id === productId);
    if (!p) return null;
    const category = categories.find((c) => c.id === p.product_category_id) || null;
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      category_name: category ? category.name : '',
      price: p.price,
      currency: p.currency || 'USD',
      rating: p.rating,
      rating_count: p.rating_count,
      size_options: Array.isArray(p.size_options) ? p.size_options : [],
      color_options: Array.isArray(p.color_options) ? p.color_options : [],
      default_size: p.default_size || null,
      default_color: p.default_color || null,
      is_apparel: !!p.is_apparel,
      is_hat: !!p.is_hat,
      image_url: p.image_url || ''
    };
  }

  // addProductToCart(productId, quantity, selectedSize, selectedColor)
  addProductToCart(productId, quantity, selectedSize, selectedColor) {
    if (!productId) throw new Error('invalid_product');
    const qty = quantity && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('product_not_found');

    const categories = this._getFromStorage('product_categories', []);
    const category = categories.find((c) => c.id === product.product_category_id) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let existingItem = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        (ci.selected_size || null) === (selectedSize || null) &&
        (ci.selected_color || null) === (selectedColor || null)
    );

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.total_price = existingItem.unit_price * existingItem.quantity;
    } else {
      existingItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price || 0,
        total_price: (product.price || 0) * qty,
        selected_size: selectedSize || null,
        selected_color: selectedColor || null,
        product_name_snapshot: product.name,
        product_category_snapshot: category ? category.name : ''
      };
      cartItems.push(existingItem);
      cart.items = cart.items || [];
      if (!cart.items.includes(existingItem.id)) {
        cart.items.push(existingItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const itemsCount = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      cart_id: updatedCart.id,
      status: updatedCart.status,
      items_count: itemsCount,
      merchandise_total: updatedCart.merchandise_total || 0,
      currency: product.currency || 'USD',
      message: 'product_added_to_cart'
    };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const normalizedCart = this._recalculateCartTotals(cart);
    return this._buildCartSummary(normalizedCart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (!cartItemId) throw new Error('invalid_cart_item');
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return this._buildCartSummary(cart);
    }

    const item = cartItems[idx];
    if (!quantity || quantity <= 0) {
      // Remove item
      const removed = cartItems.splice(idx, 1)[0];
      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('cart', []);
      const cart = carts.find((c) => c.id === removed.cart_id) || this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals(cart);
      const summary = this._buildCartSummary(updatedCart);
      return summary;
    }

    item.quantity = quantity;
    item.total_price = item.unit_price * quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(updatedCart);

    return summary;
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    if (!cartItemId) throw new Error('invalid_cart_item');
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return this._buildCartSummary(cart);
    }

    const removed = cartItems.splice(idx, 1)[0];
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === removed.cart_id) || this._getOrCreateCart();

    // Remove reference from cart.items if present
    cart.items = Array.isArray(cart.items) ? cart.items.filter((id) => id !== cartItemId) : [];

    const updatedCart = this._recalculateCartTotals(cart);
    return this._buildCartSummary(updatedCart);
  }

  // getShippingMethods
  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods
      .filter((m) => m.is_active !== false)
      .map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        description: m.description || '',
        price: m.price,
        estimated_delivery_days: m.estimated_delivery_days,
        is_default: !!m.is_default
      }));
  }

  // selectShippingMethodForCart(shippingMethodId)
  selectShippingMethodForCart(shippingMethodId) {
    if (!shippingMethodId) throw new Error('invalid_shipping_method');
    const methods = this._getFromStorage('shipping_methods', []);
    const method = methods.find((m) => m.id === shippingMethodId);
    if (!method || method.is_active === false) throw new Error('shipping_method_not_found');

    const cart = this._getOrCreateCart();
    cart.shipping_method_id = shippingMethodId;
    const updatedCart = this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary(updatedCart);
    return {
      cart_id: summary.cart_id,
      shipping_method_id: summary.shipping_method_id,
      shipping_method_name: summary.shipping_method_name,
      shipping_cost: summary.shipping_cost,
      merchandise_total: summary.merchandise_total,
      total_amount: summary.total_amount,
      currency: summary.currency,
      message: 'shipping_method_selected'
    };
  }

  // getDonationFunds
  getDonationFunds() {
    const funds = this._getFromStorage('donation_funds', []);
    return funds
      .filter((f) => f.is_active !== false)
      .map((f) => ({
        id: f.id,
        name: f.name,
        code: f.code || '',
        description: f.description || ''
      }));
  }

  // createDonation(amount, frequency, donationFundId, donorFirstName, donorLastName, donorEmail)
  createDonation(amount, frequency, donationFundId, donorFirstName, donorLastName, donorEmail) {
    if (!amount || amount <= 0) throw new Error('invalid_amount');
    if (!frequency) throw new Error('invalid_frequency');
    if (!donationFundId) throw new Error('invalid_donation_fund');

    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find((f) => f.id === donationFundId);
    if (!fund || fund.is_active === false) throw new Error('donation_fund_not_found');

    const donations = this._getFromStorage('donations', []);
    const now = new Date().toISOString();

    const donation = {
      id: this._generateId('donation'),
      amount: amount,
      currency: 'USD',
      frequency: frequency,
      donation_fund_id: donationFundId,
      fund_name_snapshot: fund.name,
      donor_first_name: donorFirstName,
      donor_last_name: donorLastName,
      donor_email: donorEmail,
      created_at: now,
      status: 'initiated'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      donation_id: donation.id,
      amount: donation.amount,
      currency: donation.currency,
      frequency: donation.frequency,
      donation_fund_name: donation.fund_name_snapshot,
      donor_first_name: donation.donor_first_name,
      donor_last_name: donation.donor_last_name,
      donor_email: donation.donor_email,
      status: donation.status,
      created_at: donation.created_at,
      summary_message: 'donation_created'
    };
  }

  // getCalendarFilterOptions
  getCalendarFilterOptions() {
    const trainingSessions = this._getFromStorage('training_sessions', []);
    const events = this._getFromStorage('events', []);

    const eventTypeSet = new Set(['training_session', 'range_booking']);
    events.forEach((e) => {
      if (e.event_type) eventTypeSet.add(e.event_type);
    });

    const disciplineSet = new Set();
    trainingSessions.forEach((t) => t.discipline && disciplineSet.add(t.discipline));
    events.forEach((e) => e.discipline && disciplineSet.add(e.discipline));

    const timeSlotSet = new Set();
    trainingSessions.forEach((t) => t.time_of_day_slot && timeSlotSet.add(t.time_of_day_slot));

    const weekdayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return {
      event_type_options: Array.from(eventTypeSet),
      discipline_options: Array.from(disciplineSet),
      time_of_day_slots: Array.from(timeSlotSet),
      weekday_options: weekdayOptions
    };
  }

  // getCalendarItems(month, filters)
  getCalendarItems(month, filters) {
    const items = this._buildCalendarItemsFromSources(month, filters || {});
    return items;
  }

  // getTrainingSessionDetail(trainingSessionId)
  getTrainingSessionDetail(trainingSessionId) {
    const sessions = this._getFromStorage('training_sessions', []);
    const ts = sessions.find((s) => s.id === trainingSessionId);
    if (!ts) return null;
    return {
      id: ts.id,
      title: ts.title,
      discipline: ts.discipline,
      description: ts.description || '',
      date: ts.date,
      start_datetime: ts.start_datetime,
      end_datetime: ts.end_datetime,
      time_of_day_slot: ts.time_of_day_slot,
      day_of_week: ts.day_of_week,
      is_weekday: ts.is_weekday,
      location: ts.location || ''
    };
  }

  // addTrainingSessionToMySchedule(trainingSessionId, notes)
  addTrainingSessionToMySchedule(trainingSessionId, notes) {
    if (!trainingSessionId) throw new Error('invalid_training_session');
    const sessions = this._getFromStorage('training_sessions', []);
    const ts = sessions.find((s) => s.id === trainingSessionId);
    if (!ts) throw new Error('training_session_not_found');

    const scheduleItems = this._getFromStorage('my_schedule_items', []);
    const now = new Date().toISOString();
    const item = {
      id: this._generateId('my_schedule'),
      training_session_id: trainingSessionId,
      added_at: now,
      notes: notes || ''
    };
    scheduleItems.push(item);
    this._saveToStorage('my_schedule_items', scheduleItems);

    return {
      my_schedule_item_id: item.id,
      training_session_id: item.training_session_id,
      added_at: item.added_at,
      message: 'training_session_added_to_schedule'
    };
  }

  // getMySchedule(month)
  getMySchedule(month) {
    const scheduleItems = this._getFromStorage('my_schedule_items', []);
    const sessions = this._getFromStorage('training_sessions', []);

    const parts = (month || '').split('-');
    const year = parts.length === 2 ? parseInt(parts[0], 10) : null;
    const monthIndex = parts.length === 2 ? parseInt(parts[1], 10) - 1 : null;

    const result = [];

    scheduleItems.forEach((item) => {
      const ts = sessions.find((s) => s.id === item.training_session_id);
      if (!ts) return;
      const dateObj = this._safeParseDate(ts.date || ts.start_datetime);
      if (!dateObj) return;
      if (year !== null && monthIndex !== null) {
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== monthIndex) return;
      }
      result.push({
        my_schedule_item_id: item.id,
        training_session_id: item.training_session_id,
        title: ts.title,
        discipline: ts.discipline,
        date: ts.date,
        start_datetime: ts.start_datetime,
        end_datetime: ts.end_datetime,
        time_of_day_slot: ts.time_of_day_slot,
        notes: item.notes || '',
        // Foreign key resolution
        training_session: ts
      });
    });

    return result;
  }

  // getMemberProfile
  getMemberProfile() {
    const profile = this._getCurrentMemberProfile();
    return {
      member_profile_id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      membership_number: profile.membership_number,
      personal_notes: profile.personal_notes,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
  }

  // updateMemberPersonalNotes(personalNotes)
  updateMemberPersonalNotes(personalNotes) {
    const profiles = this._getFromStorage('member_profiles', []);
    let profile = null;
    if (profiles.length === 0) {
      profile = this._getCurrentMemberProfile();
    } else {
      profile = profiles[0];
    }

    profile.personal_notes = personalNotes || '';
    profile.updated_at = new Date().toISOString();

    if (profiles.length === 0) {
      profiles.push(profile);
    } else {
      profiles[0] = profile;
    }

    this._saveToStorage('member_profiles', profiles);

    return {
      member_profile_id: profile.id,
      personal_notes: profile.personal_notes,
      updated_at: profile.updated_at,
      message: 'personal_notes_updated'
    };
  }

  // getFamilyMembers
  getFamilyMembers() {
    const members = this._getFromStorage('family_members', []);
    return members.map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      role: m.role,
      date_of_birth: m.date_of_birth || null,
      created_at: m.created_at || null
    }));
  }

  // addFamilyMember(firstName, lastName, role, dateOfBirth)
  addFamilyMember(firstName, lastName, role, dateOfBirth) {
    if (!firstName || !lastName || !role) throw new Error('invalid_family_member');
    const members = this._getFromStorage('family_members', []);
    const now = new Date().toISOString();
    const member = {
      id: this._generateId('family_member'),
      first_name: firstName,
      last_name: lastName,
      role: role,
      date_of_birth: dateOfBirth || null,
      created_at: now
    };
    members.push(member);
    this._saveToStorage('family_members', members);

    return {
      family_member_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      date_of_birth: member.date_of_birth,
      created_at: member.created_at,
      message: 'family_member_added'
    };
  }

  // updateFamilyMember(familyMemberId, firstName, lastName, role)
  updateFamilyMember(familyMemberId, firstName, lastName, role) {
    if (!familyMemberId) throw new Error('invalid_family_member');
    const members = this._getFromStorage('family_members', []);
    const idx = members.findIndex((m) => m.id === familyMemberId);
    if (idx === -1) throw new Error('family_member_not_found');

    const member = members[idx];
    if (typeof firstName === 'string') member.first_name = firstName;
    if (typeof lastName === 'string') member.last_name = lastName;
    if (typeof role === 'string') member.role = role;

    members[idx] = member;
    this._saveToStorage('family_members', members);

    return {
      family_member_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      message: 'family_member_updated'
    };
  }

  // removeFamilyMember(familyMemberId)
  removeFamilyMember(familyMemberId) {
    if (!familyMemberId) throw new Error('invalid_family_member');
    const members = this._getFromStorage('family_members', []);
    const idx = members.findIndex((m) => m.id === familyMemberId);
    if (idx === -1) {
      return { success: false, message: 'family_member_not_found' };
    }
    members.splice(idx, 1);
    this._saveToStorage('family_members', members);
    return { success: true, message: 'family_member_removed' };
  }

  // getRangeRules
  getRangeRules() {
    const rules = this._getFromStorage('range_rules', []);
    const sorted = rules
      .filter((r) => r.is_active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return sorted.map((r) => ({
      id: r.id,
      title: r.title,
      rule_code: r.rule_code || '',
      category: r.category,
      content: r.content,
      includes_ear_protection: !!r.includes_ear_protection,
      display_order: r.display_order
    }));
  }

  // getSafetyRelatedCourses
  getSafetyRelatedCourses() {
    const courses = this._getFromStorage('courses', []);
    const filtered = courses.filter((c) => {
      if (c.course_type === 'handgun_safety') return true;
      if (typeof c.title === 'string' && c.title.toLowerCase().indexOf('safety') !== -1) return true;
      return false;
    });
    return filtered.map((c) => ({
      course_id: c.id,
      title: c.title,
      course_type: c.course_type,
      level: c.level,
      start_datetime: c.start_datetime,
      duration_hours: c.duration_hours,
      price: c.price,
      currency: c.currency || 'USD'
    }));
  }

  // getClubInfo
  getClubInfo() {
    const info = this._getFromStorage('club_info', null);
    if (!info) {
      return {
        history: '',
        mission: '',
        facilities_overview: '',
        has_indoor_pistol_range: false,
        has_rifle_lanes: false,
        has_shotgun_fields: false
      };
    }
    return {
      history: info.history || '',
      mission: info.mission || '',
      facilities_overview: info.facilities_overview || '',
      has_indoor_pistol_range: !!info.has_indoor_pistol_range,
      has_rifle_lanes: !!info.has_rifle_lanes,
      has_shotgun_fields: !!info.has_shotgun_fields
    };
  }

  // getContactInfo
  getContactInfo() {
    const info = this._getFromStorage('contact_info', null);
    if (!info) {
      return {
        address: '',
        map_description: '',
        opening_hours: '',
        phone: '',
        email: '',
        contact_form_instructions: '',
        policy_summary: ''
      };
    }
    return {
      address: info.address || '',
      map_description: info.map_description || '',
      opening_hours: info.opening_hours || '',
      phone: info.phone || '',
      email: info.email || '',
      contact_form_instructions: info.contact_form_instructions || '',
      policy_summary: info.policy_summary || ''
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
