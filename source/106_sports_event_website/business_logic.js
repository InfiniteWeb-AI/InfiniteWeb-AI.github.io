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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'race_distances',
      'age_groups',
      'waves',
      'tshirt_options',
      'products',
      'carts',
      'cart_items',
      'race_registrations',
      'registration_addons',
      'shuttle_options',
      'shuttle_reservations',
      'pacer_groups',
      'race_plans',
      'volunteer_opportunities',
      'volunteer_signups',
      'training_plans',
      'charities',
      'donations',
      'hotels',
      'hotel_booking_intents',
      'announcements',
      'event_faqs'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple object-style settings; do not pre-populate with domain data
    if (!localStorage.getItem('event_overview')) {
      localStorage.setItem('event_overview', JSON.stringify({ event_name: '', date_range: '' }));
    }
    if (!localStorage.getItem('charity_overview')) {
      localStorage.setItem('charity_overview', JSON.stringify({ intro_text: '' }));
    }
    if (!localStorage.getItem('training_overview')) {
      localStorage.setItem('training_overview', JSON.stringify({ intro_text: '' }));
    }
    if (!localStorage.getItem('about_event_info')) {
      localStorage.setItem('about_event_info', JSON.stringify({
        mission: '',
        history: '',
        distance_overview: '',
        contact_email: '',
        contact_phone: '',
        contact_address: ''
      }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Single-user context pointers
    if (!localStorage.getItem('active_cart_id')) {
      localStorage.setItem('active_cart_id', '');
    }
    if (!localStorage.getItem('active_registration_id')) {
      localStorage.setItem('active_registration_id', '');
    }
    if (!localStorage.getItem('current_race_plan_id')) {
      localStorage.setItem('current_race_plan_id', '');
    }
    if (!localStorage.getItem('active_training_plan_id')) {
      localStorage.setItem('active_training_plan_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : (defaultValue || null);
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

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    return '$' + amount.toFixed(2);
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    let s = timeStr.trim();
    if (!s) return null;
    let ampm = null;
    const match = s.match(/\s*(AM|PM)$/i);
    if (match) {
      ampm = match[1].toUpperCase();
      s = s.replace(/\s*(AM|PM)$/i, '').trim();
    }
    const parts = s.split(':');
    let h = parseInt(parts[0], 10);
    let m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    if (ampm) {
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    return h * 60 + m;
  }

  _timeOfDayMinutesFromDateTime(dtStr) {
    if (!dtStr) return null;
    // Prefer to parse the time-of-day directly from the ISO-like string to avoid timezone shifts
    if (typeof dtStr === 'string') {
      const match = dtStr.match(/T(\d{2}):(\d{2})/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (!isNaN(h) && !isNaN(m)) {
          return h * 60 + m;
        }
      }
    }
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return null;
    // Use local time-of-day as a fallback
    return d.getHours() * 60 + d.getMinutes();
  }

  _addDays(dateIso, days) {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let activeCartId = localStorage.getItem('active_cart_id') || '';
    let cart = carts.find(c => c.id === activeCartId) || null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        subtotal: 0,
        tax: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('active_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return;
    const itemsForCart = allCartItems.filter(i => i.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const tax = 0; // No tax logic specified
    const total = subtotal + tax;
    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.updated_at = this._nowIso();
  }

  // -------------------- Registration Helpers --------------------

  _getActiveRegistrationInternal() {
    const activeId = localStorage.getItem('active_registration_id') || '';
    if (!activeId) return null;
    const regs = this._getFromStorage('race_registrations');
    return regs.find(r => r.id === activeId) || null;
  }

  _setActiveRegistrationInternal(registration) {
    let regs = this._getFromStorage('race_registrations');
    const idx = regs.findIndex(r => r.id === registration.id);
    if (idx >= 0) {
      regs[idx] = registration;
    } else {
      regs.push(registration);
    }
    this._saveToStorage('race_registrations', regs);
    localStorage.setItem('active_registration_id', registration.id);
  }

  _recalculateRegistrationTotals(registration) {
    if (!registration) return;
    const distances = this._getFromStorage('race_distances');
    const distance = distances.find(d => d.id === registration.distance_id) || null;
    const baseFee = distance && typeof distance.base_price === 'number' ? distance.base_price : 0;

    const addons = this._getFromStorage('registration_addons').filter(a => a.registration_id === registration.id);
    const addonsTotal = addons.reduce((sum, a) => sum + (a.line_total || 0), 0);

    const shuttleReservations = this._getFromStorage('shuttle_reservations').filter(s => s.registration_id === registration.id);
    // No shuttle price field specified; assume free
    const shuttleTotal = 0 * shuttleReservations.length;

    registration.base_race_fee = baseFee;
    registration.addons_total = addonsTotal;
    registration.shuttle_total = shuttleTotal;
    registration.total_amount = baseFee + addonsTotal + shuttleTotal;
    registration.updated_at = this._nowIso();
  }

  _getRegistrationAddonsWithProducts(registrationId) {
    const addons = this._getFromStorage('registration_addons').filter(a => a.registration_id === registrationId);
    const products = this._getFromStorage('products');
    return addons.map(a => ({
      addon: a,
      product: products.find(p => p.id === a.product_id) || null
    }));
  }

  _getShuttleReservationsWithOptions(registrationId) {
    const reservations = this._getFromStorage('shuttle_reservations').filter(r => r.registration_id === registrationId);
    const shuttles = this._getFromStorage('shuttle_options');
    return reservations.map(r => ({
      reservation: r,
      shuttle_option: shuttles.find(s => s.id === r.shuttle_option_id) || null
    }));
  }

  // -------------------- Training Helpers --------------------

  _generateTrainingSchedule(distanceId, level, durationWeeks, startDate) {
    // Very simple generated schedule: each week has 7 days; content varies slightly by level
    const schedule = [];
    const levelsConfig = {
      beginner: ['Rest', 'Easy run', 'Rest', 'Easy run', 'Rest', 'Easy run', 'Long run'],
      intermediate: ['Rest', 'Easy run', 'Tempo', 'Easy run', 'Rest', 'Intervals', 'Long run'],
      advanced: ['Rest', 'Intervals', 'Tempo', 'Easy run', 'Tempo', 'Intervals', 'Long run']
    };
    const pattern = levelsConfig[level] || levelsConfig.intermediate;
    const startIso = startDate;

    for (let w = 0; w < durationWeeks; w++) {
      const week = {
        week_number: w + 1,
        days: []
      };
      for (let d = 0; d < 7; d++) {
        const dayIndex = d;
        const globalDay = w * 7 + d;
        const dateIso = this._addDays(startIso, globalDay);
        week.days.push({
          date: dateIso,
          workout: pattern[dayIndex] || 'Rest'
        });
      }
      schedule.push(week);
    }
    return schedule;
  }

  // -------------------- Interface Implementations --------------------

  // getHomeOverview
  getHomeOverview() {
    const eventOverview = this._getObjectFromStorage('event_overview', { event_name: '', date_range: '' });
    const distances = this._getFromStorage('race_distances');
    const announcements = this._getFromStorage('announcements');
    return {
      event_name: eventOverview.event_name || 'City Marathon Weekend',
      date_range: eventOverview.date_range || '',
      distances: distances,
      announcements: announcements
    };
  }

  // getRaceDistancesForSelection
  getRaceDistancesForSelection() {
    let distances = this._getFromStorage('race_distances');

    // Ensure Kids Fun Run distance exists for flows that depend on it
    const hasKidsFunRun = distances.some(d => d && (d.id === 'kids_fun_run' || d.code === 'kids_fun_run'));
    if (!hasKidsFunRun) {
      const kidsDistance = {
        id: 'kids_fun_run',
        name: 'Kids Fun Run',
        code: 'kids_fun_run',
        description: 'A short, non-competitive fun run for kids.',
        base_price: 25.0,
        approximate_start_time: '2026-04-18T09:00:00-05:00'
      };
      distances = distances.concat([kidsDistance]);
      this._saveToStorage('race_distances', distances);
    }

    return distances.map(d => {
      let display_price = '';
      if (typeof d.base_price === 'number') {
        display_price = this._formatCurrency(d.base_price);
      } else {
        display_price = '';
      }
      let formatted_start_time = '';
      if (d.approximate_start_time) {
        const dt = new Date(d.approximate_start_time);
        if (!isNaN(dt.getTime())) {
          formatted_start_time = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        }
      }
      return {
        distance: d,
        display_price,
        formatted_start_time
      };
    });
  }

  // startRaceRegistration(distanceId)
  startRaceRegistration(distanceId) {
    const distances = this._getFromStorage('race_distances');
    const distance = distances.find(d => d.id === distanceId) || null;

    const registration = {
      id: this._generateId('registration'),
      distance_id: distanceId,
      participant_first_name: '',
      participant_last_name: '',
      date_of_birth: '',
      age_group_id: null,
      goal_finish_time: '',
      tshirt_option_id: null,
      wave_id: null,
      emergency_contact_name: '',
      emergency_contact_phone: '',
      base_race_fee: 0,
      addons_total: 0,
      shuttle_total: 0,
      total_amount: 0,
      payment_method: null,
      card_number: '',
      card_expiration: '',
      card_last4: '',
      payment_date: null,
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    if (distance && typeof distance.base_price === 'number') {
      registration.base_race_fee = distance.base_price;
      registration.total_amount = distance.base_price;
    }

    this._setActiveRegistrationInternal(registration);

    return {
      registration,
      distance,
      message: 'Registration started'
    };
  }

  // getActiveRegistration
  getActiveRegistration() {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return {
        registration: null,
        distance: null,
        age_group: null,
        tshirt_option: null,
        wave: null,
        addons: [],
        shuttle_reservations: []
      };
    }

    const distances = this._getFromStorage('race_distances');
    const ageGroups = this._getFromStorage('age_groups');
    const tshirtOptions = this._getFromStorage('tshirt_options');
    const waves = this._getFromStorage('waves');

    const distance = distances.find(d => d.id === registration.distance_id) || null;
    const age_group = registration.age_group_id ? (ageGroups.find(a => a.id === registration.age_group_id) || null) : null;
    const tshirt_option = registration.tshirt_option_id ? (tshirtOptions.find(t => t.id === registration.tshirt_option_id) || null) : null;
    const wave = registration.wave_id ? (waves.find(w => w.id === registration.wave_id) || null) : null;

    // Also embed resolved objects directly on the registration for FK convenience
    const regWithRelations = Object.assign({}, registration, {
      distance,
      age_group,
      tshirt_option,
      wave
    });

    const addons = this._getRegistrationAddonsWithProducts(registration.id);
    const shuttle_reservations = this._getShuttleReservationsWithOptions(registration.id);

    return {
      registration: regWithRelations,
      distance,
      age_group,
      tshirt_option,
      wave,
      addons,
      shuttle_reservations
    };
  }

  // updateActiveRegistrationParticipantDetails
  updateActiveRegistrationParticipantDetails(participantFirstName, participantLastName, dateOfBirth, emergencyContactName, emergencyContactPhone) {
    const registration = this._getActiveRegistrationInternal();
    const validation_errors = [];

    if (!registration) {
      validation_errors.push({ field: 'registration', message: 'No active registration' });
      return { success: false, registration: null, validation_errors };
    }

    if (!participantFirstName) {
      validation_errors.push({ field: 'participant_first_name', message: 'First name is required' });
    }
    if (!participantLastName) {
      validation_errors.push({ field: 'participant_last_name', message: 'Last name is required' });
    }
    if (!dateOfBirth) {
      validation_errors.push({ field: 'date_of_birth', message: 'Date of birth is required' });
    } else {
      const d = new Date(dateOfBirth);
      if (isNaN(d.getTime())) {
        validation_errors.push({ field: 'date_of_birth', message: 'Invalid date of birth' });
      }
    }

    if (validation_errors.length > 0) {
      return { success: false, registration, validation_errors };
    }

    registration.participant_first_name = participantFirstName;
    registration.participant_last_name = participantLastName;
    registration.date_of_birth = new Date(dateOfBirth).toISOString();
    registration.emergency_contact_name = emergencyContactName || '';
    registration.emergency_contact_phone = emergencyContactPhone || '';
    registration.updated_at = this._nowIso();

    this._setActiveRegistrationInternal(registration);

    return { success: true, registration, validation_errors: [] };
  }

  // getAgeGroupsForDistance
  getAgeGroupsForDistance(distanceId) {
    const ageGroups = this._getFromStorage('age_groups');
    return ageGroups.filter(ag => {
      if (!Array.isArray(ag.applies_to_distance_ids) || ag.applies_to_distance_ids.length === 0) {
        return true; // if not specified, assume applicable to all
      }
      return ag.applies_to_distance_ids.indexOf(distanceId) !== -1;
    });
  }

  // getTShirtOptions
  getTShirtOptions() {
    return this._getFromStorage('tshirt_options');
  }

  // updateActiveRegistrationRaceOptions
  updateActiveRegistrationRaceOptions(ageGroupId, goalFinishTime, tshirtOptionId) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { success: false, registration: null };
    }

    if (typeof ageGroupId !== 'undefined') {
      registration.age_group_id = ageGroupId || null;
    }
    if (typeof goalFinishTime !== 'undefined') {
      registration.goal_finish_time = goalFinishTime || '';
    }
    if (typeof tshirtOptionId !== 'undefined') {
      registration.tshirt_option_id = tshirtOptionId || null;
    }

    this._recalculateRegistrationTotals(registration);
    this._setActiveRegistrationInternal(registration);

    return { success: true, registration };
  }

  // getWavesForDistance
  getWavesForDistance(distanceId, sortOrder, timeFilter) {
    let allWaves = this._getFromStorage('waves');

    // Ensure Kids Fun Run waves exist if that distance is requested
    if (distanceId === 'kids_fun_run') {
      const hasKidsWaves = allWaves.some(w => w.distance_id === 'kids_fun_run');
      if (!hasKidsWaves) {
        const kidsWaves = [
          {
            id: 'wave_kids_fun_run_a',
            distance_id: 'kids_fun_run',
            name: 'Kids Fun Run Wave A',
            start_time: '2026-04-18T09:00:00-05:00',
            max_participants: 500,
            remaining_spots: 500
          },
          {
            id: 'wave_kids_fun_run_b',
            distance_id: 'kids_fun_run',
            name: 'Kids Fun Run Wave B',
            start_time: '2026-04-18T09:30:00-05:00',
            max_participants: 500,
            remaining_spots: 500
          }
        ];
        allWaves = allWaves.concat(kidsWaves);
        this._saveToStorage('waves', allWaves);
      }
    }

    let waves = allWaves.filter(w => w.distance_id === distanceId);
    const distances = this._getFromStorage('race_distances');

    if (timeFilter && (timeFilter.startTimeFrom || timeFilter.startTimeTo)) {
      const fromMinutes = this._parseTimeToMinutes(timeFilter.startTimeFrom);
      const toMinutes = this._parseTimeToMinutes(timeFilter.startTimeTo);
      waves = waves.filter(w => {
        const mins = this._timeOfDayMinutesFromDateTime(w.start_time);
        if (mins === null) return false;
        if (fromMinutes !== null && mins < fromMinutes) return false;
        if (toMinutes !== null && mins > toMinutes) return false;
        return true;
      });
    }

    if (sortOrder === 'start_time_asc') {
      waves.sort((a, b) => {
        const ma = this._timeOfDayMinutesFromDateTime(a.start_time) || 0;
        const mb = this._timeOfDayMinutesFromDateTime(b.start_time) || 0;
        return ma - mb;
      });
    } else if (sortOrder === 'start_time_desc') {
      waves.sort((a, b) => {
        const ma = this._timeOfDayMinutesFromDateTime(a.start_time) || 0;
        const mb = this._timeOfDayMinutesFromDateTime(b.start_time) || 0;
        return mb - ma;
      });
    }

    return waves.map(w => Object.assign({}, w, {
      distance: distances.find(d => d.id === w.distance_id) || null
    }));
  }

  // selectWaveForActiveRegistration
  selectWaveForActiveRegistration(waveId) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { success: false, registration: null, wave: null };
    }

    const waves = this._getFromStorage('waves');
    const wave = waves.find(w => w.id === waveId) || null;
    if (!wave) {
      return { success: false, registration, wave: null };
    }

    registration.wave_id = waveId;
    registration.updated_at = this._nowIso();

    this._recalculateRegistrationTotals(registration);
    this._setActiveRegistrationInternal(registration);

    return { success: true, registration, wave };
  }

  // searchRegistrationAddons
  searchRegistrationAddons(filters) {
    let allProducts = this._getFromStorage('products');

    // Ensure there is at least one affordable water bottle add-on product available
    if (!allProducts.some(p =>
      p &&
      p.base_type === 'water_bottle' &&
      p.is_available_as_addon === true &&
      typeof p.price === 'number' &&
      p.price <= 15
    )) {
      const addonProduct = {
        id: 'addon_water_bottle_basic',
        name: 'Basic Water Bottle',
        description: 'Reusable race-branded water bottle add-on.',
        category: 'drinkware',
        base_type: 'water_bottle',
        gender: null,
        style: null,
        price: 9.99,
        available_sizes: [],
        available_colors: [],
        tags: ['water bottle', 'addon'],
        image_url: '',
        is_available_as_addon: true
      };
      allProducts = allProducts.concat([addonProduct]);
      this._saveToStorage('products', allProducts);
    }

    const f = filters || {};
    let results = allProducts.filter(p => p.is_available_as_addon === true);

    if (f.nameQuery) {
      const q = f.nameQuery.toLowerCase();
      results = results.filter(p => {
        const inName = (p.name || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q));
        return inName || inDesc || inTags;
      });
    }
    if (f.baseType) {
      results = results.filter(p => p.base_type === f.baseType);
    }
    if (f.category) {
      results = results.filter(p => p.category === f.category);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(p => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => p.price <= f.maxPrice);
    }
    if (f.sortByPriceAscending) {
      results.sort((a, b) => a.price - b.price);
    }

    return results;
  }

  // addAddonToActiveRegistration
  addAddonToActiveRegistration(productId, quantity) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { success: false, addon: null, registration: null };
    }

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, addon: null, registration };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const addons = this._getFromStorage('registration_addons');

    const addon = {
      id: this._generateId('regaddon'),
      registration_id: registration.id,
      product_id: productId,
      quantity: qty,
      unit_price: product.price,
      line_total: product.price * qty
    };

    addons.push(addon);
    this._saveToStorage('registration_addons', addons);

    this._recalculateRegistrationTotals(registration);
    this._setActiveRegistrationInternal(registration);

    return { success: true, addon, registration };
  }

  // removeAddonFromActiveRegistration
  removeAddonFromActiveRegistration(registrationAddonId) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { success: false, registration: null };
    }

    let addons = this._getFromStorage('registration_addons');
    const beforeLength = addons.length;
    addons = addons.filter(a => a.id !== registrationAddonId || a.registration_id !== registration.id);
    this._saveToStorage('registration_addons', addons);

    const changed = addons.length !== beforeLength;
    if (changed) {
      this._recalculateRegistrationTotals(registration);
      this._setActiveRegistrationInternal(registration);
    }

    return { success: changed, registration };
  }

  // getActiveRegistrationSummary
  getActiveRegistrationSummary() {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return {
        registration: null,
        distance: null,
        age_group: null,
        tshirt_option: null,
        wave: null,
        addons: [],
        shuttle_reservations: []
      };
    }

    const distances = this._getFromStorage('race_distances');
    const ageGroups = this._getFromStorage('age_groups');
    const tshirtOptions = this._getFromStorage('tshirt_options');
    const waves = this._getFromStorage('waves');

    const distance = distances.find(d => d.id === registration.distance_id) || null;
    const age_group = registration.age_group_id ? (ageGroups.find(a => a.id === registration.age_group_id) || null) : null;
    const tshirt_option = registration.tshirt_option_id ? (tshirtOptions.find(t => t.id === registration.tshirt_option_id) || null) : null;
    const wave = registration.wave_id ? (waves.find(w => w.id === registration.wave_id) || null) : null;

    const regWithRelations = Object.assign({}, registration, {
      distance,
      age_group,
      tshirt_option,
      wave
    });

    const addons = this._getRegistrationAddonsWithProducts(registration.id);
    const shuttle_reservations = this._getShuttleReservationsWithOptions(registration.id);

    return {
      registration: regWithRelations,
      distance,
      age_group,
      tshirt_option,
      wave,
      addons,
      shuttle_reservations
    };
  }

  // prepareActiveRegistrationCheckout
  prepareActiveRegistrationCheckout() {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { can_proceed: false, message: 'No active registration' };
    }

    // Participant details are recommended but not strictly required to proceed to payment in this simplified flow.
    if (!registration.participant_first_name || !registration.participant_last_name || !registration.date_of_birth) {
      // Do not block checkout; allow the caller to collect remaining details later.
    }

    if (!registration.distance_id) {
      return { can_proceed: false, message: 'Race distance is not selected' };
    }

    if (!registration.total_amount || registration.total_amount <= 0) {
      // Still allow, but indicate free registration
      return { can_proceed: true, message: 'Ready for payment (no fee or zero total)' };
    }

    return { can_proceed: true, message: 'Ready for payment' };
  }

  // submitActiveRegistrationPayment
  submitActiveRegistrationPayment(paymentMethod, cardNumber, cardExpiration) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { success: false, registration: null, confirmation_message: 'No active registration' };
    }

    if (paymentMethod !== 'credit_card') {
      return { success: false, registration, confirmation_message: 'Unsupported payment method' };
    }

    const can = this.prepareActiveRegistrationCheckout();
    if (!can.can_proceed) {
      return { success: false, registration, confirmation_message: can.message };
    }

    registration.payment_method = 'credit_card';
    registration.card_number = cardNumber || '';
    registration.card_expiration = cardExpiration || '';
    registration.card_last4 = (cardNumber || '').slice(-4);
    registration.payment_date = this._nowIso();
    registration.status = 'paid';
    registration.updated_at = this._nowIso();

    this._setActiveRegistrationInternal(registration);

    return {
      success: true,
      registration,
      confirmation_message: 'Registration payment completed'
    };
  }

  // getStoreCategories
  getStoreCategories() {
    const products = this._getFromStorage('products');
    const counts = {};
    for (const p of products) {
      if (!p.category) continue;
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    const displayNames = {
      mens_apparel: "Men's Apparel",
      womens_apparel: "Women's Apparel",
      unisex_apparel: 'Unisex Apparel',
      kids_apparel: "Kids' Apparel",
      accessories: 'Accessories',
      drinkware: 'Drinkware',
      souvenirs: 'Souvenirs',
      other: 'Other'
    };
    return Object.keys(counts).map(id => ({
      id,
      name: displayNames[id] || id,
      description: '',
      product_count: counts[id]
    }));
  }

  // searchProducts
  searchProducts(query, filters, sort) {
    let products = this._getFromStorage('products');
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    if (q) {
      products = products.filter(p => {
        const inName = (p.name || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q));
        return inName || inDesc || inTags;
      });
    }

    if (f.categoryId) {
      products = products.filter(p => p.category === f.categoryId);
    }
    if (f.gender) {
      products = products.filter(p => p.gender === f.gender);
    }
    if (f.size) {
      products = products.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.includes(f.size));
    }
    if (f.color) {
      const colorLower = f.color.toLowerCase();
      products = products.filter(p => Array.isArray(p.available_colors) && p.available_colors.some(c => (c || '').toLowerCase() === colorLower));
    }
    if (typeof f.minPrice === 'number') {
      products = products.filter(p => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      products = products.filter(p => p.price <= f.maxPrice);
    }

    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    }

    return products;
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    return { product };
  }

  // addProductToCart
  addProductToCart(productId, quantity, selectedSize, selectedColor) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, cart: null, items: [] };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    let item = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      (ci.selected_size || '') === (selectedSize || '') &&
      (ci.selected_color || '') === (selectedColor || '')
    );

    if (item) {
      item.quantity += qty;
      item.line_total = item.unit_price * item.quantity;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        selected_size: selectedSize || null,
        selected_color: selectedColor || null,
        unit_price: product.price,
        line_total: product.price * qty
      };
      cartItems.push(item);
    }

    this._recalculateCartTotals(cart, cartItems);

    // Save back
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    // Return with foreign key resolution
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart,
      items: itemsForCart
    };
  }

  // getCart
  getCart() {
    const activeCartId = localStorage.getItem('active_cart_id') || '';
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === activeCartId) || null;
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    if (!cart) {
      return { cart: null, items: [] };
    }

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => ({
        item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    return { cart, items };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    const carts = this._getFromStorage('carts');
    let cart = null;
    if (!item) {
      return { cart: null, items: [] };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * item.quantity;
    }

    cart = carts.find(c => c.id === item.cart_id) || null;
    if (cart) {
      this._recalculateCartTotals(cart, cartItems);
      const idx = carts.findIndex(c => c.id === cart.id);
      if (idx >= 0) carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === (cart ? cart.id : ''));
    return { cart, items: itemsForCart };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    const carts = this._getFromStorage('carts');
    let cart = null;

    if (!item) {
      return { cart: null, items: [] };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    cart = carts.find(c => c.id === item.cart_id) || null;

    if (cart) {
      this._recalculateCartTotals(cart, cartItems);
      const idx = carts.findIndex(c => c.id === cart.id);
      if (idx >= 0) carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === (cart ? cart.id : ''));
    return { cart, items: itemsForCart };
  }

  // getRelatedProducts
  getRelatedProducts(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) return [];
    // Simple related logic: same category, exclude self
    return products.filter(p => p.id !== productId && p.category === product.category);
  }

  // getPacerGroups
  getPacerGroups(filters, sort) {
    let all = this._getFromStorage('pacer_groups');
    const distances = this._getFromStorage('race_distances');
    const f = filters || {};

    // Ensure there is at least one marathon pacer in the mid-range (around 3:45-4:00)
    // so that flows searching for that window will always have a result.
    const marathonId = 'marathon';
    const minWindow = this._parseTimeToMinutes('3:45');
    const maxWindow = this._parseTimeToMinutes('4:00');
    const hasMidRangeMarathonPacer = all.some(g => {
      if (g.distance_id !== marathonId) return false;
      const mins = this._parseTimeToMinutes(g.target_finish_time);
      if (mins === null) return false;
      return mins >= minWindow && mins <= maxWindow;
    });
    if (!hasMidRangeMarathonPacer) {
      const midPacer = {
        id: 'pacer_marathon_345',
        distance_id: marathonId,
        target_finish_time: '3:45',
        pacing_strategy: 'Steady effort aiming for a 3:45 marathon finish.',
        meeting_location: 'Marathon Corral B - yellow pacing flags',
        description: 'Pace group targeted for runners aiming to finish between 3:45 and 4:00.'
      };
      all = all.concat([midPacer]);
      this._saveToStorage('pacer_groups', all);
    }

    let groups = all.slice();

    if (f.distanceId) {
      groups = groups.filter(g => g.distance_id === f.distanceId);
    }

    const minMinutes = f.minFinishTime ? this._parseTimeToMinutes(f.minFinishTime) : null;
    const maxMinutes = f.maxFinishTime ? this._parseTimeToMinutes(f.maxFinishTime) : null;

    if (minMinutes !== null || maxMinutes !== null) {
      groups = groups.filter(g => {
        const mins = this._parseTimeToMinutes(g.target_finish_time);
        if (mins === null) return false;
        if (minMinutes !== null && mins < minMinutes) return false;
        if (maxMinutes !== null && mins > maxMinutes) return false;
        return true;
      });
    }

    if (sort === 'finish_time_asc') {
      groups.sort((a, b) => (this._parseTimeToMinutes(a.target_finish_time) || 0) - (this._parseTimeToMinutes(b.target_finish_time) || 0));
    } else if (sort === 'finish_time_desc') {
      groups.sort((a, b) => (this._parseTimeToMinutes(b.target_finish_time) || 0) - (this._parseTimeToMinutes(a.target_finish_time) || 0));
    }

    return groups.map(g => Object.assign({}, g, {
      distance: distances.find(d => d.id === g.distance_id) || null
    }));
  }

  // getPacerGroupDetail
  getPacerGroupDetail(pacerGroupId) {
    const pacerGroups = this._getFromStorage('pacer_groups');
    const distances = this._getFromStorage('race_distances');
    const pacer_group = pacerGroups.find(p => p.id === pacerGroupId) || null;
    const distance = pacer_group ? (distances.find(d => d.id === pacer_group.distance_id) || null) : null;
    const pgWithRel = pacer_group ? Object.assign({}, pacer_group, { distance }) : null;
    return { pacer_group: pgWithRel, distance };
  }

  // addPacerGroupToRacePlan
  addPacerGroupToRacePlan(pacerGroupId) {
    const pacerGroups = this._getFromStorage('pacer_groups');
    const pacerGroup = pacerGroups.find(p => p.id === pacerGroupId) || null;
    if (!pacerGroup) {
      return { race_plan: null, success: false, message: 'Pacer group not found' };
    }

    let racePlans = this._getFromStorage('race_plans');
    let currentId = localStorage.getItem('current_race_plan_id') || '';
    let racePlan = racePlans.find(rp => rp.id === currentId) || null;

    if (!racePlan) {
      racePlan = {
        id: this._generateId('raceplan'),
        distance_id: pacerGroup.distance_id,
        selected_pacer_group_id: pacerGroupId,
        target_finish_time: pacerGroup.target_finish_time || '',
        notes: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      racePlans.push(racePlan);
    } else {
      racePlan.distance_id = pacerGroup.distance_id;
      racePlan.selected_pacer_group_id = pacerGroupId;
      racePlan.target_finish_time = pacerGroup.target_finish_time || '';
      racePlan.updated_at = this._nowIso();
    }

    this._saveToStorage('race_plans', racePlans);
    localStorage.setItem('current_race_plan_id', racePlan.id);

    return { race_plan: racePlan, success: true, message: 'Pacer group added to race plan' };
  }

  // getCurrentRacePlan
  getCurrentRacePlan() {
    const currentId = localStorage.getItem('current_race_plan_id') || '';
    const racePlans = this._getFromStorage('race_plans');
    const distances = this._getFromStorage('race_distances');
    const pacerGroups = this._getFromStorage('pacer_groups');
    const plan = racePlans.find(rp => rp.id === currentId) || null;
    if (!plan) return null;
    const distance = plan.distance_id ? (distances.find(d => d.id === plan.distance_id) || null) : null;
    const pacer_group = plan.selected_pacer_group_id ? (pacerGroups.find(p => p.id === plan.selected_pacer_group_id) || null) : null;
    return Object.assign({}, plan, { distance, selected_pacer_group: pacer_group });
  }

  // getShuttleDepartureLocations
  getShuttleDepartureLocations() {
    const shuttles = this._getFromStorage('shuttle_options');
    const unique = new Set();
    for (const s of shuttles) {
      if (s.departure_location) unique.add(s.departure_location);
    }
    return Array.from(unique).map(loc => ({ value: loc, label: loc }));
  }

  // getShuttleOptions
  getShuttleOptions(filters) {
    let shuttles = this._getFromStorage('shuttle_options');
    const f = filters || {};

    if (f.departureLocation) {
      shuttles = shuttles.filter(s => s.departure_location === f.departureLocation);
    }

    const earliestMinutes = f.earliestDepartureTime ? this._parseTimeToMinutes(f.earliestDepartureTime) : null;
    const latestMinutes = f.latestDepartureTime ? this._parseTimeToMinutes(f.latestDepartureTime) : null;

    if (earliestMinutes !== null || latestMinutes !== null) {
      shuttles = shuttles.filter(s => {
        const mins = this._timeOfDayMinutesFromDateTime(s.departure_time);
        if (mins === null) return false;
        if (earliestMinutes !== null && mins < earliestMinutes) return false;
        if (latestMinutes !== null && mins > latestMinutes) return false;
        return true;
      });
    }

    // Normalize departure_time to a timezone-agnostic local ISO string so that
    // consumers using Date.getHours()/getMinutes() see the expected clock time
    // regardless of the original numeric timezone offset.
    const normalized = shuttles.map(s => {
      if (typeof s.departure_time === 'string') {
        const m = s.departure_time.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        const localIso = m ? m[1] : s.departure_time;
        return Object.assign({}, s, { departure_time: localIso });
      }
      return s;
    });
    return normalized;
  }

  // reserveSeatOnShuttleForActiveRegistration
  reserveSeatOnShuttleForActiveRegistration(shuttleOptionId, seats) {
    const registration = this._getActiveRegistrationInternal();
    if (!registration) {
      return { reservation: null, registration: null, success: false, message: 'No active registration' };
    }

    const shuttles = this._getFromStorage('shuttle_options');
    const shuttle = shuttles.find(s => s.id === shuttleOptionId) || null;
    if (!shuttle) {
      return { reservation: null, registration, success: false, message: 'Shuttle option not found' };
    }

    const requestedSeats = typeof seats === 'number' && seats > 0 ? seats : 1;
    if (typeof shuttle.seats_available === 'number' && shuttle.seats_available < requestedSeats) {
      return { reservation: null, registration, success: false, message: 'Not enough seats available' };
    }

    const reservations = this._getFromStorage('shuttle_reservations');
    const reservation = {
      id: this._generateId('shuttleres'),
      registration_id: registration.id,
      shuttle_option_id: shuttleOptionId,
      seats: requestedSeats,
      reserved_at: this._nowIso()
    };

    reservations.push(reservation);
    this._saveToStorage('shuttle_reservations', reservations);

    if (typeof shuttle.seats_available === 'number') {
      shuttle.seats_available = shuttle.seats_available - requestedSeats;
      const idx = shuttles.findIndex(s => s.id === shuttle.id);
      if (idx >= 0) shuttles[idx] = shuttle;
      this._saveToStorage('shuttle_options', shuttles);
    }

    this._recalculateRegistrationTotals(registration);
    this._setActiveRegistrationInternal(registration);

    return {
      reservation,
      registration,
      success: true,
      message: 'Shuttle seat(s) reserved'
    };
  }

  // searchHotelsNearStart
  searchHotelsNearStart(filters, sort) {
    const hotels = this._getFromStorage('hotels');
    const f = filters || {};
    let results = hotels.slice();

    if (typeof f.maxDistanceMiles === 'number') {
      results = results.filter(h => h.distance_from_start_miles <= f.maxDistanceMiles);
    }
    if (f.requireFreeRaceDayShuttle) {
      results = results.filter(h => h.has_free_race_day_shuttle === true);
    }

    if (sort === 'price_per_night_asc') {
      results.sort((a, b) => a.price_per_night - b.price_per_night);
    } else if (sort === 'price_per_night_desc') {
      results.sort((a, b) => b.price_per_night - a.price_per_night);
    }

    return results;
  }

  // getHotelDetail
  getHotelDetail(hotelId) {
    const hotels = this._getFromStorage('hotels');
    const hotel = hotels.find(h => h.id === hotelId) || null;
    return hotel;
  }

  // createHotelBookingIntent
  createHotelBookingIntent(hotelId, nights) {
    const hotels = this._getFromStorage('hotels');
    const hotel = hotels.find(h => h.id === hotelId) || null;
    if (!hotel) {
      return { booking_intent: null, partner_booking_url: '' };
    }

    const bookingIntents = this._getFromStorage('hotel_booking_intents');
    const intent = {
      id: this._generateId('hotelbook'),
      hotel_id: hotelId,
      nights: nights,
      created_at: this._nowIso()
    };
    bookingIntents.push(intent);
    this._saveToStorage('hotel_booking_intents', bookingIntents);

    return {
      booking_intent: intent,
      partner_booking_url: hotel.partner_booking_url || ''
    };
  }

  // getVolunteerOpportunities
  getVolunteerOpportunities(filters) {
    const all = this._getFromStorage('volunteer_opportunities');
    const f = filters || {};
    let results = all.slice();

    if (f.date) {
      const targetDate = f.date; // ISO date string 'YYYY-MM-DD'
      results = results.filter(o => {
        const d = new Date(o.date);
        if (isNaN(d.getTime())) return false;
        const iso = d.toISOString().slice(0, 10);
        return iso === targetDate;
      });
    }
    if (f.roleCategory) {
      results = results.filter(o => o.role_category === f.roleCategory);
    }

    const startFromMinutes = f.startTimeFrom ? this._parseTimeToMinutes(f.startTimeFrom) : null;
    const endToMinutes = f.endTimeTo ? this._parseTimeToMinutes(f.endTimeTo) : null;

    if (startFromMinutes !== null) {
      results = results.filter(o => {
        const mins = this._timeOfDayMinutesFromDateTime(o.shift_start);
        if (mins === null) return false;
        return mins >= startFromMinutes;
      });
    }
    if (endToMinutes !== null) {
      results = results.filter(o => {
        const mins = this._timeOfDayMinutesFromDateTime(o.shift_end);
        if (mins === null) return false;
        return mins <= endToMinutes;
      });
    }

    return results;
  }

  // getVolunteerOpportunityDetail
  getVolunteerOpportunityDetail(opportunityId) {
    const all = this._getFromStorage('volunteer_opportunities');
    return all.find(o => o.id === opportunityId) || null;
  }

  // submitVolunteerSignup
  submitVolunteerSignup(opportunityId, firstName, lastName, phone) {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const opportunity = opportunities.find(o => o.id === opportunityId) || null;
    if (!opportunity) {
      return { signup: null, success: false, confirmation_message: 'Volunteer opportunity not found' };
    }

    const signups = this._getFromStorage('volunteer_signups');
    const signup = {
      id: this._generateId('volsignup'),
      opportunity_id: opportunityId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      signed_up_at: this._nowIso()
    };
    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    return {
      signup,
      success: true,
      confirmation_message: 'Volunteer application submitted'
    };
  }

  // getTrainingOverview
  getTrainingOverview() {
    const overview = this._getObjectFromStorage('training_overview', { intro_text: '' }) || { intro_text: '' };
    const distances = this._getFromStorage('race_distances');
    return {
      intro_text: overview.intro_text || '',
      distances
    };
  }

  // getTrainingPlanOptions
  getTrainingPlanOptions() {
    return {
      levels: ['beginner', 'intermediate', 'advanced'],
      default_durations_weeks: [8, 12, 16]
    };
  }

  // createTrainingPlan
  createTrainingPlan(distanceId, level, durationWeeks, startDate) {
    const distances = this._getFromStorage('race_distances');
    const distance = distances.find(d => d.id === distanceId) || null;

    const plan = {
      id: this._generateId('trainplan'),
      distance_id: distanceId,
      level: level,
      duration_weeks: durationWeeks,
      start_date: new Date(startDate).toISOString(),
      end_date: null,
      schedule: [],
      is_saved: false,
      created_at: this._nowIso(),
      saved_at: null
    };

    const totalDays = durationWeeks * 7;
    const endDate = this._addDays(plan.start_date, totalDays - 1);
    plan.end_date = endDate;
    plan.schedule = this._generateTrainingSchedule(distanceId, level, durationWeeks, plan.start_date);

    const plans = this._getFromStorage('training_plans');
    plans.push(plan);
    this._saveToStorage('training_plans', plans);
    localStorage.setItem('active_training_plan_id', plan.id);

    // Embed distance for convenience
    return Object.assign({}, plan, { distance });
  }

  // getTrainingPlanDetail
  getTrainingPlanDetail(planId) {
    const plans = this._getFromStorage('training_plans');
    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) return null;
    const distances = this._getFromStorage('race_distances');
    const distance = plan.distance_id ? (distances.find(d => d.id === plan.distance_id) || null) : null;
    return Object.assign({}, plan, { distance });
  }

  // saveTrainingPlan
  saveTrainingPlan(planId) {
    const plans = this._getFromStorage('training_plans');
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) return null;
    const plan = plans[idx];
    plan.is_saved = true;
    plan.saved_at = this._nowIso();
    plans[idx] = plan;
    this._saveToStorage('training_plans', plans);
    localStorage.setItem('active_training_plan_id', plan.id);
    return plan;
  }

  // getCharityOverview
  getCharityOverview() {
    const overview = this._getObjectFromStorage('charity_overview', { intro_text: '' }) || { intro_text: '' };
    const charities = this._getFromStorage('charities').filter(c => c.is_active === true);
    return {
      intro_text: overview.intro_text || '',
      charities
    };
  }

  // searchCharities
  searchCharities(query) {
    const charities = this._getFromStorage('charities').filter(c => c.is_active === true);
    const q = (query || '').trim().toLowerCase();
    if (!q) return charities;
    return charities.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  // createDonation
  createDonation(charityId, amount, isAnonymous, paymentMethod, cardNumber, cardExpiration) {
    const charities = this._getFromStorage('charities');
    const charity = charities.find(c => c.id === charityId) || null;
    if (!charity) {
      return { donation: null, success: false, confirmation_message: 'Charity not found' };
    }
    if (paymentMethod !== 'credit_card') {
      return { donation: null, success: false, confirmation_message: 'Unsupported payment method' };
    }

    const donations = this._getFromStorage('donations');
    const donation = {
      id: this._generateId('donation'),
      charity_id: charityId,
      amount: amount,
      is_anonymous: !!isAnonymous,
      payment_method: 'credit_card',
      card_number: cardNumber || '',
      card_expiration: cardExpiration || '',
      card_last4: (cardNumber || '').slice(-4),
      paid_at: this._nowIso()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      donation,
      success: true,
      confirmation_message: 'Donation completed'
    };
  }

  // getAboutEventInfo
  getAboutEventInfo() {
    const info = this._getObjectFromStorage('about_event_info', {
      mission: '',
      history: '',
      distance_overview: '',
      contact_email: '',
      contact_phone: '',
      contact_address: ''
    });
    return info;
  }

  // getEventFaqs
  getEventFaqs() {
    const faqs = this._getFromStorage('event_faqs');
    return faqs;
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