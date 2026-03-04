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
    // Legacy/example keys from template (not used but kept for compatibility)
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

    // Domain-specific storage initialization
    const arrayKeys = [
      'facilities',
      'programs',
      'program_sessions',
      'events',
      'membership_products',
      'participants',
      'age_groups',
      'cart_items',
      'orders',
      'registrations',
      'membership_assignments',
      'favorites',
      'contact_requests',
      'policies_sections',
      'help_topics',
      'faqs'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object for this agent
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _parseDate(value) {
    if (!value) return null;
    return new Date(value);
  }

  _timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
    return h * 60 + (m || 0);
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _updateCartTimestamp() {
    let cart = this._getFromStorage('cart', null);
    if (cart) {
      cart.updated_at = this._nowIso();
      this._saveToStorage('cart', cart);
    }
  }

  _recalculateCartTotals() {
    const cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.total_price || 0;
    });
    const taxTotal = 0;
    const discountTotal = 0;
    const grandTotal = subtotal + taxTotal - discountTotal;
    return {
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      itemCount: cartItems.length
    };
  }

  _checkProgramSessionCapacity(programSessionId, requestedSpots) {
    const sessions = this._getFromStorage('program_sessions', []);
    const session = sessions.find((s) => s.id === programSessionId);
    if (!session || session.is_active === false) {
      return { ok: false, message: 'Program session not found or inactive', session: null };
    }
    const remaining = typeof session.spots_remaining === 'number' ? session.spots_remaining : 0;
    if (remaining < requestedSpots) {
      return { ok: false, message: 'Not enough spots remaining in this session', session };
    }
    return { ok: true, message: 'Capacity available', session };
  }

  _calculateMembershipPrice(product, rateType) {
    if (!product) return 0;
    let price = 0;
    if (rateType === 'resident' && typeof product.resident_price === 'number') {
      price = product.resident_price;
    } else if (rateType === 'non_resident' && typeof product.non_resident_price === 'number') {
      price = product.non_resident_price;
    } else if (typeof product.base_price === 'number') {
      price = product.base_price;
    } else if (typeof product.resident_price === 'number') {
      price = product.resident_price;
    } else if (typeof product.non_resident_price === 'number') {
      price = product.non_resident_price;
    }
    return price;
  }

  _ensureAuthenticated() {
    // Minimal implementation: ensure there is some current user; create a guest user if needed
    let currentUserId = localStorage.getItem('currentUserId');
    const users = this._getFromStorage('users', []);

    if (currentUserId) {
      const user = users.find((u) => u.id === currentUserId);
      if (user) return user;
    }

    // Create or reuse a guest user
    let guest = users.find((u) => u.username === 'guest');
    if (!guest) {
      guest = {
        id: this._generateId('user'),
        username: 'guest',
        password: '',
        displayName: 'Guest User'
      };
      users.push(guest);
      this._saveToStorage('users', users);
    }
    localStorage.setItem('currentUserId', guest.id);
    return guest;
  }

  _createOrderFromCart(paymentMethod, contactInfo) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const totals = this._recalculateCartTotals();

    if (!cartItems.length) {
      return { success: false, message: 'Cart is empty', order: null };
    }

    const orders = this._getFromStorage('orders', []);
    const registrations = this._getFromStorage('registrations', []);
    const membershipAssignments = this._getFromStorage('membership_assignments', []);

    const programs = this._getFromStorage('programs', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const events = this._getFromStorage('events', []);
    const facilities = this._getFromStorage('facilities', []);
    const membershipProducts = this._getFromStorage('membership_products', []);

    const nowIso = this._nowIso();

    // Build order items snapshot and create registrations/memberships
    const orderItemsSnapshot = [];

    cartItems.forEach((ci) => {
      if (ci.item_type === 'program_session') {
        const session = sessions.find((s) => s.id === ci.program_session_id);
        if (!session) return;
        const program = programs.find((p) => p.id === session.program_id);
        const facility = facilities.find((f) => f.id === session.facility_id);
        const registration = {
          id: this._generateId('reg'),
          registration_kind: 'program_session',
          program_session_id: session.id,
          event_id: null,
          participant_ids: ci.participant_ids || [],
          household_registration_type: 'individual',
          facility_id: session.facility_id,
          title: program ? program.name : session.title,
          start_datetime: session.start_date,
          end_datetime: session.end_date,
          fee_total: ci.total_price,
          status: 'active',
          created_at: nowIso
        };
        registrations.push(registration);
        orderItemsSnapshot.push({
          title: registration.title,
          participantsDisplay: Array.isArray(ci.participant_ids) && ci.participant_ids.length ? String(ci.participant_ids.length) + ' participant(s)' : '1 participant',
          scheduleDisplay: this._formatSessionSchedule(session),
          facilityName: facility ? facility.name : '',
          totalPrice: ci.total_price
        });
      } else if (ci.item_type === 'event') {
        const ev = events.find((e) => e.id === ci.event_id);
        if (!ev) return;
        const facility = facilities.find((f) => f.id === ev.facility_id);
        const registration = {
          id: this._generateId('reg'),
          registration_kind: 'event',
          program_session_id: null,
          event_id: ev.id,
          participant_ids: ci.participant_ids || [],
          household_registration_type: ci.household_registration_type || 'household',
          facility_id: ev.facility_id,
          title: ev.title,
          start_datetime: ev.start_datetime,
          end_datetime: ev.end_datetime,
          fee_total: ci.total_price,
          status: 'active',
          created_at: nowIso
        };
        registrations.push(registration);
        orderItemsSnapshot.push({
          title: ev.title,
          participantsDisplay: registration.household_registration_type === 'household' ? 'Household' : ((ci.participant_ids && ci.participant_ids.length) ? String(ci.participant_ids.length) + ' attendee(s)' : '1 attendee'),
          scheduleDisplay: this._formatEventSchedule(ev),
          facilityName: facility ? facility.name : '',
          totalPrice: ci.total_price
        });
      } else if (ci.item_type === 'membership' || ci.item_type === 'pass') {
        const product = membershipProducts.find((m) => m.id === ci.membership_product_id);
        if (!product) return;
        const startDate = ci.membership_start_date || nowIso;
        let endDate = null;
        if (product.duration_type === 'monthly' && product.duration_months) {
          const start = this._parseDate(startDate);
          if (start) {
            const end = new Date(start.getTime());
            end.setMonth(end.getMonth() + product.duration_months);
            endDate = end.toISOString();
          }
        }
        const remainingVisits = (product.product_type === 'punch_pass' || product.product_type === 'visit_pass') && typeof product.visit_count === 'number'
          ? product.visit_count * (ci.quantity || 1)
          : null;

        const assignment = {
          id: this._generateId('massign'),
          membership_product_id: product.id,
          participant_id: ci.assign_to_participant_id || null,
          product_type: product.product_type,
          rate_type: ci.rate_type || null,
          start_date: startDate,
          end_date: endDate,
          auto_renew: ci.auto_renew === true,
          remaining_visits: remainingVisits,
          status: 'active',
          created_at: nowIso
        };
        membershipAssignments.push(assignment);
        orderItemsSnapshot.push({
          title: product.name,
          participantsDisplay: ci.assign_to_participant_id ? 'Assigned member' : 'Unassigned',
          scheduleDisplay: product.duration_type === 'multi_visit' ? 'Multi-visit pass' : 'Starts ' + startDate,
          facilityName: this._mapFacilityUsageTypeToLabel(product.facility_usage_type),
          totalPrice: ci.total_price
        });
      }
    });

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + orderId.split('_')[1];

    let paymentStatus = 'pending';
    let status = 'confirmed';

    if (paymentMethod === 'online') {
      paymentStatus = 'paid';
      status = 'confirmed';
    } else if (paymentMethod === 'pay_at_front_desk') {
      paymentStatus = 'pending';
      status = 'confirmed';
    } else if (paymentMethod === 'no_payment_required') {
      paymentStatus = 'paid';
      status = 'confirmed';
    }

    const order = {
      id: orderId,
      order_number: orderNumber,
      created_at: nowIso,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: status,
      total_amount: totals.grandTotal,
      items: orderItemsSnapshot,
      notes: contactInfo && contactInfo.notes ? contactInfo.notes : ''
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('registrations', registrations);
    this._saveToStorage('membership_assignments', membershipAssignments);

    // Clear cart after order
    this._saveToStorage('cart_items', []);
    this._saveToStorage('cart', null);

    return { success: true, order };
  }

  _formatSessionSchedule(session) {
    if (!session) return '';
    const start = this._parseDate(session.start_date);
    const end = this._parseDate(session.end_date);
    const startDateStr = start ? start.toISOString().slice(0, 10) : '';
    const endDateStr = end ? end.toISOString().slice(0, 10) : '';
    const timeStr = (session.start_time || '') + '–' + (session.end_time || '');
    if (startDateStr === endDateStr) {
      return startDateStr + ' ' + timeStr;
    }
    return startDateStr + ' to ' + endDateStr + ' ' + timeStr;
  }

  _formatEventSchedule(event) {
    if (!event) return '';
    const start = this._parseDate(event.start_datetime);
    const end = this._parseDate(event.end_datetime);
    const startStr = start ? start.toISOString() : '';
    const endStr = end ? end.toISOString() : '';
    return startStr + ' to ' + endStr;
  }

  _mapFacilityUsageTypeToLabel(type) {
    if (type === 'fitness_centre_gym') return 'Fitness Centre / Gym';
    if (type === 'indoor_pool') return 'Indoor Pool';
    if (type === 'multi_facility') return 'Multi-facility';
    return '';
  }

  _getFavoriteSessionIds() {
    const favorites = this._getFromStorage('favorites', []);
    return favorites
      .filter((f) => f.item_type === 'program_session' && f.program_session_id)
      .map((f) => f.program_session_id);
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // signIn(username, password)
  signIn(username, password) {
    const users = this._getFromStorage('users', []);
    let user = users.find((u) => u.username === username && u.password === password);

    // If the user does not exist yet, auto-create a simple account so flows can proceed
    if (!user) {
      user = {
        id: this._generateId('user'),
        username,
        password: password || '',
        displayName: username
      };
      users.push(user);
      this._saveToStorage('users', users);
    }

    localStorage.setItem('currentUserId', user.id);

    // Fetch participants; if we had per-user linkage, we'd filter here.
    const participants = this._getFromStorage('participants', []);

    return {
      success: true,
      message: 'Signed in successfully',
      userDisplayName: user.displayName || username,
      householdParticipants: participants
    };
  }

  // getProgramCategories()
  getProgramCategories() {
    const programs = this._getFromStorage('programs', []);
    const categoriesSet = new Set();
    programs.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
    });

    const nameMap = {
      aquatics_swimming: 'Aquatics & Swimming',
      fitness_wellness: 'Fitness & Wellness',
      sports: 'Sports',
      arts_culture: 'Arts & Culture',
      early_childhood: 'Early Childhood (Ages 3–5)'
    };

    const iconMap = {
      aquatics_swimming: 'icon_aquatics',
      fitness_wellness: 'icon_fitness',
      sports: 'icon_sports',
      arts_culture: 'icon_arts',
      early_childhood: 'icon_early_childhood'
    };

    const descriptionMap = {
      aquatics_swimming: 'Swim lessons, aquafit, and pool programs.',
      fitness_wellness: 'Fitness classes, wellness, and active living.',
      sports: 'Leagues, camps, and instructional sports.',
      arts_culture: 'Art, music, theatre, and culture programs.',
      early_childhood: 'Programs for preschool-aged children.'
    };

    const categories = Array.from(categoriesSet).map((id) => ({
      id,
      name: nameMap[id] || id,
      description: descriptionMap[id] || '',
      iconKey: iconMap[id] || ''
    }));

    return categories;
  }

  // getSeasonalHighlights(seasonLabel)
  getSeasonalHighlights(seasonLabel) {
    const sessions = this._getFromStorage('program_sessions', []);
    const programs = this._getFromStorage('programs', []);
    const facilities = this._getFromStorage('facilities', []);
    const events = this._getFromStorage('events', []);
    const membershipProducts = this._getFromStorage('membership_products', []);

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));

    let filteredSessions = sessions.filter((s) => s.is_active !== false);
    if (seasonLabel) {
      filteredSessions = filteredSessions.filter((s) => (s.season_label || '').toLowerCase() === String(seasonLabel).toLowerCase());
    }

    const featuredProgramSessions = filteredSessions.map((s) => {
      const program = programMap.get(s.program_id) || null;
      const facility = facilityMap.get(s.facility_id) || null;
      const ageRangeLabel = (program && program.age_category_label) || (s.age_min != null && s.age_max != null ? s.age_min + '–' + s.age_max + ' years' : '');
      const obj = {
        sessionId: s.id,
        programName: program ? program.name : '',
        title: s.title,
        category: s.program_category || (program ? program.category : ''),
        seasonLabel: s.season_label || '',
        startDate: s.start_date,
        endDate: s.end_date,
        timeSummary: this._formatSessionSchedule(s),
        facilityName: facility ? facility.name : '',
        ageRangeLabel,
        fee: s.fee,
        spotsRemaining: s.spots_remaining
      };
      // Foreign key resolution
      return Object.assign({}, obj, {
        session: s,
        program,
        facility
      });
    });

    const activeEvents = events.filter((e) => e.is_active !== false);
    const featuredEvents = activeEvents.map((e) => {
      const facility = facilityMap.get(e.facility_id) || null;
      const obj = {
        eventId: e.id,
        title: e.title,
        facilityName: facility ? facility.name : '',
        startDatetime: e.start_datetime,
        fee: e.fee,
        isFree: e.is_free
      };
      return Object.assign({}, obj, {
        event: e,
        facility
      });
    });

    const activeMemberships = membershipProducts.filter((m) => m.is_active !== false);
    const featuredMemberships = activeMemberships.map((m) => {
      const startingPrice = this._calculateMembershipPrice(m, 'resident') || this._calculateMembershipPrice(m, 'non_resident') || 0;
      const obj = {
        membershipProductId: m.id,
        name: m.name,
        productType: m.product_type,
        facilityUsageType: m.facility_usage_type,
        durationType: m.duration_type,
        startingPrice
      };
      return Object.assign({}, obj, {
        membershipProduct: m
      });
    });

    return {
      featuredProgramSessions,
      featuredEvents,
      featuredMemberships
    };
  }

  // getGlobalSearchSuggestions(query)
  getGlobalSearchSuggestions(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const suggestions = [];
    const add = (label, targetPage, categoryHint, suggestedFilters) => {
      suggestions.push({ label, targetPage, categoryHint: categoryHint || '', suggestedFilters: suggestedFilters || {} });
    };

    if (q.includes('swim') || q.includes('aquatic') || q.includes('pool')) {
      add(`Search aquatics programs for "${query}"`, 'programs', 'aquatics_swimming', { programCategory: 'aquatics_swimming', programSubcategory: null, facilityUsageType: null });
      add(`Search memberships and passes for "${query}"`, 'memberships', null, { facilityUsageType: 'indoor_pool' });
    } else if (q.includes('yoga') || q.includes('cycle') || q.includes('spin') || q.includes('fitness')) {
      add(`Search fitness classes for "${query}"`, 'programs', 'fitness_wellness', { programCategory: 'fitness_wellness', programSubcategory: null, facilityUsageType: null });
      add(`Search fitness memberships for "${query}"`, 'memberships', null, { facilityUsageType: 'fitness_centre_gym' });
    } else if (q.includes('camp') || q.includes('soccer') || q.includes('basketball')) {
      add(`Search programs & camps for "${query}"`, 'programs', null, { programCategory: null, programSubcategory: null, facilityUsageType: null });
    } else if (q.includes('event') || q.includes('workshop') || q.includes('family')) {
      add(`Search events & workshops for "${query}"`, 'events', null, {});
    } else {
      add(`Search programs for "${query}"`, 'programs', null, {});
      add(`Search events for "${query}"`, 'events', null, {});
      add(`Search memberships & passes for "${query}"`, 'memberships', null, {});
      add(`Search help for "${query}"`, 'help', null, {});
    }

    return suggestions;
  }

  // getProgramFilterOptions(category)
  getProgramFilterOptions(category) {
    const ageGroups = this._getFromStorage('age_groups', []);
    const facilities = this._getFromStorage('facilities', []);
    const sessions = this._getFromStorage('program_sessions', []);

    let relevantSessions = sessions.filter((s) => s.is_active !== false);
    if (category) {
      relevantSessions = relevantSessions.filter((s) => s.program_category === category);
    }

    let minPrice = null;
    let maxPrice = null;
    relevantSessions.forEach((s) => {
      if (typeof s.fee === 'number') {
        if (minPrice === null || s.fee < minPrice) minPrice = s.fee;
        if (maxPrice === null || s.fee > maxPrice) maxPrice = s.fee;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning (before 12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12–5 PM)' },
      { value: 'evening', label: 'Evening (after 5 PM)' },
      { value: 'half_day_morning', label: 'Half-Day Morning' },
      { value: 'half_day_afternoon', label: 'Half-Day Afternoon' },
      { value: 'full_day', label: 'Full Day' }
    ];

    const dayOfWeekOptions = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ].map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }));

    const programFormats = [
      { value: 'class', label: 'Class' },
      { value: 'camp', label: 'Camp' },
      { value: 'summer_camp', label: 'Summer Camp' },
      { value: 'day_camp', label: 'Day Camp' },
      { value: 'workshop', label: 'Workshop' }
    ];

    const spotsRemainingOptions = [1, 2, 3, 5, 10];

    return {
      ageGroups,
      facilities,
      timeOfDayOptions,
      dayOfWeekOptions,
      programFormats,
      priceRange: {
        minPrice,
        maxPrice,
        step: 5
      },
      spotsRemainingOptions
    };
  }

  // searchProgramSessions(searchTerm, category, subcategory, programId, filters, sortBy, page, pageSize)
  searchProgramSessions(searchTerm, category, subcategory, programId, filters, sortBy, page, pageSize) {
    const sessions = this._getFromStorage('program_sessions', []);
    const programs = this._getFromStorage('programs', []);
    const facilities = this._getFromStorage('facilities', []);
    const favorites = this._getFromStorage('favorites', []);

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));
    const favoriteSessionIds = new Set(
      favorites
        .filter((f) => f.item_type === 'program_session' && f.program_session_id)
        .map((f) => f.program_session_id)
    );

    let list = sessions.filter((s) => s.is_active !== false);

    const q = String(searchTerm || '').trim().toLowerCase();
    if (q) {
      // Basic keyword/synonym handling so that searches like "cycle" also
      // match "cycling" / "spin" class names and descriptions.
      let terms = [q];
      if (q.includes('cycle')) {
        terms = Array.from(new Set(terms.concat(['cycle', 'cycling', 'spin'])));
      }

      list = list.filter((s) => {
        const program = programMap.get(s.program_id);
        const title = (s.title || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const pname = (program && program.name ? program.name : '').toLowerCase();
        return terms.some((term) => title.includes(term) || desc.includes(term) || pname.includes(term));
      });
    }

    if (category) {
      list = list.filter((s) => s.program_category === category);
    }

    if (subcategory) {
      list = list.filter((s) => (s.program_subcategory || '').toLowerCase() === String(subcategory).toLowerCase());
    }

    if (programId) {
      list = list.filter((s) => s.program_id === programId);
    }

    filters = filters || {};

    // Age filters
    if (filters.ageGroupId) {
      const ageGroups = this._getFromStorage('age_groups', []);
      const ag = ageGroups.find((g) => g.id === filters.ageGroupId);
      if (ag) {
        list = list.filter((s) => {
          return !(s.age_max < ag.min_age || s.age_min > ag.max_age);
        });
      }
    }

    if (typeof filters.exactAge === 'number') {
      const age = filters.exactAge;
      list = list.filter((s) => s.age_min <= age && s.age_max >= age);
    }

    if (typeof filters.ageMin === 'number') {
      list = list.filter((s) => s.age_max >= filters.ageMin);
    }

    if (typeof filters.ageMax === 'number') {
      list = list.filter((s) => s.age_min <= filters.ageMax);
    }

    // Date range (overlap)
    if (filters.dateStart || filters.dateEnd) {
      const startFilter = filters.dateStart ? this._parseDate(filters.dateStart) : null;
      const endFilter = filters.dateEnd ? this._parseDate(filters.dateEnd) : null;
      list = list.filter((s) => {
        const sStart = this._parseDate(s.start_date);
        const sEnd = this._parseDate(s.end_date);
        if (!sStart || !sEnd) return false;
        if (startFilter && sEnd < startFilter) return false;
        if (endFilter && sStart > endFilter) return false;
        return true;
      });
    }

    // Start time window
    if (filters.startTimeFrom || filters.startTimeTo) {
      const fromMin = this._timeToMinutes(filters.startTimeFrom || '00:00');
      const toMin = this._timeToMinutes(filters.startTimeTo || '23:59');
      list = list.filter((s) => {
        const stMin = this._timeToMinutes(s.start_time);
        if (stMin == null) return false;
        return stMin >= fromMin && stMin <= toMin;
      });
    }

    // Time of day bucket
    if (filters.timeOfDay) {
      list = list.filter((s) => s.time_of_day === filters.timeOfDay);
    }

    // Days of week
    if (filters.daysOfWeek && filters.daysOfWeek.length) {
      const wanted = new Set(filters.daysOfWeek.map((d) => String(d).toLowerCase()));
      list = list.filter((s) => {
        const days = (s.days_of_week || []).map((d) => String(d).toLowerCase());
        return days.some((d) => wanted.has(d));
      });
    }

    // Facility
    if (filters.facilityId) {
      list = list.filter((s) => s.facility_id === filters.facilityId);
    }

    // Price
    if (typeof filters.priceMin === 'number') {
      list = list.filter((s) => s.fee >= filters.priceMin);
    }
    if (typeof filters.priceMax === 'number') {
      list = list.filter((s) => s.fee <= filters.priceMax);
    }

    // Program format
    if (filters.programFormat) {
      list = list.filter((s) => s.program_format === filters.programFormat);
    }

    // Spots remaining
    if (typeof filters.minSpotsRemaining === 'number') {
      list = list.filter((s) => s.spots_remaining >= filters.minSpotsRemaining);
    }

    if (filters.isWeekdayOnly) {
      list = list.filter((s) => s.is_weekday === true);
    }

    if (filters.isWeekendOnly) {
      list = list.filter((s) => s.is_weekend === true);
    }

    if (filters.seasonLabel) {
      const sl = String(filters.seasonLabel).toLowerCase();
      list = list.filter((s) => (s.season_label || '').toLowerCase() === sl);
    }

    if (filters.includeOnlyWithSpotsRemaining) {
      list = list.filter((s) => s.spots_remaining > 0);
    }

    // Sorting
    sortBy = sortBy || 'start_date_asc';
    list.sort((a, b) => {
      if (sortBy === 'price_low_to_high') {
        return (a.fee || 0) - (b.fee || 0);
      }
      if (sortBy === 'price_high_to_low') {
        return (b.fee || 0) - (a.fee || 0);
      }
      if (sortBy === 'start_date_desc') {
        return this._parseDate(b.start_date) - this._parseDate(a.start_date);
      }
      // default start_date_asc
      return this._parseDate(a.start_date) - this._parseDate(b.start_date);
    });

    const totalResults = list.length;
    page = page || 1;
    pageSize = pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const results = paged.map((s) => {
      const program = programMap.get(s.program_id) || null;
      const facility = facilityMap.get(s.facility_id) || null;
      const ageRangeLabel = (program && program.age_category_label) || (s.age_min != null && s.age_max != null ? s.age_min + '–' + s.age_max + ' years' : '');
      const obj = {
        sessionId: s.id,
        programId: s.program_id,
        programName: program ? program.name : '',
        title: s.title,
        category: s.program_category || (program ? program.category : ''),
        subcategory: s.program_subcategory || (program ? program.subcategory : ''),
        level: s.level || (program ? program.default_level : ''),
        facilityId: s.facility_id,
        facilityName: facility ? facility.name : '',
        startDate: s.start_date,
        endDate: s.end_date,
        startTime: s.start_time,
        endTime: s.end_time,
        daysOfWeek: s.days_of_week || [],
        timeOfDay: s.time_of_day,
        ageMin: s.age_min,
        ageMax: s.age_max,
        ageRangeLabel,
        fee: s.fee,
        spotsTotal: s.spots_total,
        spotsRemaining: s.spots_remaining,
        isWeekday: s.is_weekday,
        isWeekend: s.is_weekend,
        seasonLabel: s.season_label || '',
        isFavorite: favoriteSessionIds.has(s.id)
      };
      // Foreign key resolution
      return Object.assign({}, obj, {
        session: s,
        program,
        facility
      });
    });

    return {
      results,
      totalResults,
      page,
      pageSize
    };
  }

  // getProgramSessionDetails(programSessionId)
  getProgramSessionDetails(programSessionId) {
    const sessions = this._getFromStorage('program_sessions', []);
    const programs = this._getFromStorage('programs', []);
    const facilities = this._getFromStorage('facilities', []);
    const favorites = this._getFromStorage('favorites', []);

    const session = sessions.find((s) => s.id === programSessionId) || null;
    const program = session ? programs.find((p) => p.id === session.program_id) || null : null;
    const facility = session ? facilities.find((f) => f.id === session.facility_id) || null : null;

    const isFavorite = favorites.some((f) => f.item_type === 'program_session' && f.program_session_id === programSessionId);

    const ageRangeLabel = program && program.age_category_label
      ? program.age_category_label
      : (session && session.age_min != null && session.age_max != null ? session.age_min + '–' + session.age_max + ' years' : '');

    const canRegister = !!(session && session.is_active !== false && session.spots_remaining > 0);

    return {
      session,
      program,
      facility,
      display: {
        programName: program ? program.name : '',
        sessionTitle: session ? session.title : '',
        fullSchedule: session ? this._formatSessionSchedule(session) : '',
        ageRangeLabel,
        feeFormatted: session ? ('$' + (session.fee != null ? session.fee.toFixed(2) : '0.00')) : '',
        spotsSummary: session ? String(session.spots_remaining) + ' spots remaining' : '',
        weekdayWeekendLabel: session ? (session.is_weekend ? 'Weekend' : (session.is_weekday ? 'Weekday' : '')) : ''
      },
      canRegister,
      isFavorite
    };
  }

  // getHouseholdParticipants()
  getHouseholdParticipants() {
    const participants = this._getFromStorage('participants', []);
    return participants;
  }

  // createParticipant(firstName, lastName, dateOfBirth, relationship, notes)
  createParticipant(firstName, lastName, dateOfBirth, relationship, notes) {
    const participants = this._getFromStorage('participants', []);
    const user = this._ensureAuthenticated();

    const participant = {
      id: this._generateId('participant'),
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      relationship: relationship,
      notes: notes || '',
      is_active: true,
      user_id: user.id // non-schema helper link
    };

    participants.push(participant);
    this._saveToStorage('participants', participants);

    return { participant };
  }

  // addProgramSessionToCart(programSessionId, participantIds)
  addProgramSessionToCart(programSessionId, participantIds) {
    participantIds = participantIds || [];
    if (!participantIds.length) {
      return { success: false, message: 'At least one participant is required', cartItemId: null, cartItemCount: 0, cartTotal: 0 };
    }

    const participants = this._getFromStorage('participants', []);
    const sessions = this._getFromStorage('program_sessions', []);

    const session = sessions.find((s) => s.id === programSessionId);
    if (!session || session.is_active === false) {
      return { success: false, message: 'Program session not found or inactive', cartItemId: null, cartItemCount: 0, cartTotal: 0 };
    }

    const invalidParticipant = participantIds.some((pid) => !participants.find((p) => p.id === pid && p.is_active !== false));
    if (invalidParticipant) {
      return { success: false, message: 'One or more participants are invalid', cartItemId: null, cartItemCount: 0, cartTotal: 0 };
    }

    const capacityCheck = this._checkProgramSessionCapacity(programSessionId, participantIds.length);
    if (!capacityCheck.ok) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: capacityCheck.message, cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = session.fee || 0;
    const quantity = participantIds.length;
    const totalPrice = unitPrice * quantity;

    const cartItemId = this._generateId('cartitem');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'program_session',
      program_session_id: programSessionId,
      event_id: null,
      membership_product_id: null,
      participant_ids: participantIds,
      assign_to_participant_id: null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      rate_type: null,
      membership_start_date: null,
      membership_duration_type: null,
      auto_renew: null,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);

    // Update session capacity
    const updatedSessions = sessions.map((s) => {
      if (s.id === programSessionId) {
        const remaining = typeof s.spots_remaining === 'number' ? s.spots_remaining : 0;
        return Object.assign({}, s, { spots_remaining: remaining - quantity });
      }
      return s;
    });

    this._saveToStorage('program_sessions', updatedSessions);
    this._saveToStorage('cart_items', cartItems);
    this._updateCartTimestamp();

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Program session added to cart',
      cartItemId,
      cartItemCount: cartItems.length,
      cartTotal: totals.grandTotal
    };
  }

  // getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const products = this._getFromStorage('membership_products', []);

    let minPrice = null;
    let maxPrice = null;
    products.forEach((m) => {
      const price = this._calculateMembershipPrice(m, 'resident') || this._calculateMembershipPrice(m, 'non_resident');
      if (price != null) {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const productTypes = [
      { value: 'membership', label: 'Membership' },
      { value: 'punch_pass', label: 'Punch Pass' },
      { value: 'visit_pass', label: 'Visit Pass' }
    ];

    const facilityUsageTypes = [
      { value: 'fitness_centre_gym', label: 'Fitness Centre / Gym' },
      { value: 'indoor_pool', label: 'Indoor Pool' },
      { value: 'multi_facility', label: 'Multi-facility' }
    ];

    const durationTypes = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'annual', label: 'Annual' },
      { value: 'multi_visit', label: 'Multi-visit' },
      { value: 'drop_in', label: 'Drop-in' }
    ];

    return {
      productTypes,
      facilityUsageTypes,
      durationTypes,
      priceRange: {
        minPrice,
        maxPrice,
        step: 5
      }
    };
  }

  // searchMembershipProducts(searchTerm, filters, sortBy, page, pageSize)
  searchMembershipProducts(searchTerm, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('membership_products', []);
    let list = products.filter((p) => p.is_active !== false);

    const q = String(searchTerm || '').trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    filters = filters || {};

    if (filters.productType) {
      list = list.filter((p) => p.product_type === filters.productType);
    }

    if (filters.facilityUsageType) {
      list = list.filter((p) => p.facility_usage_type === filters.facilityUsageType);
    }

    if (filters.durationType) {
      list = list.filter((p) => p.duration_type === filters.durationType);
    }

    // Price filters based on computed price
    if (typeof filters.priceMin === 'number') {
      list = list.filter((p) => this._calculateMembershipPrice(p) >= filters.priceMin);
    }
    if (typeof filters.priceMax === 'number') {
      list = list.filter((p) => this._calculateMembershipPrice(p) <= filters.priceMax);
    }

    // Visit count
    if (typeof filters.visitCountMin === 'number') {
      list = list.filter((p) => (p.visit_count || 0) >= filters.visitCountMin);
    }
    if (typeof filters.visitCountMax === 'number') {
      list = list.filter((p) => (p.visit_count || 0) <= filters.visitCountMax);
    }

    sortBy = sortBy || 'price_low_to_high';
    list.sort((a, b) => {
      const pa = this._calculateMembershipPrice(a) || 0;
      const pb = this._calculateMembershipPrice(b) || 0;
      if (sortBy === 'price_high_to_low') return pb - pa;
      return pa - pb;
    });

    const totalResults = list.length;
    page = page || 1;
    pageSize = pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const results = paged.map((p) => {
      const obj = {
        membershipProductId: p.id,
        name: p.name,
        description: p.description,
        productType: p.product_type,
        facilityUsageType: p.facility_usage_type,
        durationType: p.duration_type,
        durationMonths: p.duration_months,
        visitCount: p.visit_count,
        basePrice: p.base_price,
        residentPrice: p.resident_price,
        nonResidentPrice: p.non_resident_price,
        isAutoRenewAvailable: p.is_auto_renew_available,
        defaultAutoRenew: p.default_auto_renew
      };
      // Foreign key resolution
      return Object.assign({}, obj, {
        membershipProduct: p
      });
    });

    return {
      results,
      totalResults,
      page,
      pageSize
    };
  }

  // getMembershipProductDetails(membershipProductId)
  getMembershipProductDetails(membershipProductId) {
    const products = this._getFromStorage('membership_products', []);
    const product = products.find((p) => p.id === membershipProductId) || null;

    if (!product) {
      return {
        product: null,
        pricingOptions: {
          hasResidentRate: false,
          hasNonResidentRate: false,
          residentPrice: null,
          nonResidentPrice: null,
          basePrice: null
        },
        autoRenewOptions: {
          isAvailable: false,
          defaultAutoRenew: false
        },
        display: {
          includedFacilitiesSummary: '',
          validLocationsSummary: ''
        }
      };
    }

    const pricingOptions = {
      hasResidentRate: typeof product.resident_price === 'number',
      hasNonResidentRate: typeof product.non_resident_price === 'number',
      residentPrice: product.resident_price,
      nonResidentPrice: product.non_resident_price,
      basePrice: product.base_price
    };

    const autoRenewOptions = {
      isAvailable: product.is_auto_renew_available,
      defaultAutoRenew: product.default_auto_renew === true
    };

    const display = {
      includedFacilitiesSummary: this._mapFacilityUsageTypeToLabel(product.facility_usage_type),
      validLocationsSummary: this._mapFacilityUsageTypeToLabel(product.facility_usage_type)
    };

    return {
      product,
      pricingOptions,
      autoRenewOptions,
      display
    };
  }

  // addMembershipProductToCart(membershipProductId, quantity, rateType, startDate, autoRenew, assignToParticipantId)
  addMembershipProductToCart(membershipProductId, quantity, rateType, startDate, autoRenew, assignToParticipantId) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const membershipProducts = this._getFromStorage('membership_products', []);
    const participants = this._getFromStorage('participants', []);

    const product = membershipProducts.find((m) => m.id === membershipProductId);
    if (!product || product.is_active === false) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Membership product not found or inactive', cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
    }

    if (assignToParticipantId) {
      const participant = participants.find((p) => p.id === assignToParticipantId && p.is_active !== false);
      if (!participant) {
        const totals = this._recalculateCartTotals();
        return { success: false, message: 'Assigned participant not found or inactive', cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = this._calculateMembershipPrice(product, rateType);
    const totalPrice = unitPrice * quantity;

    const cartItemId = this._generateId('cartitem');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: product.product_type === 'membership' ? 'membership' : 'pass',
      program_session_id: null,
      event_id: null,
      membership_product_id: membershipProductId,
      participant_ids: null,
      assign_to_participant_id: assignToParticipantId || null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      rate_type: rateType || null,
      membership_start_date: startDate || this._nowIso(),
      membership_duration_type: product.duration_type,
      auto_renew: product.is_auto_renew_available ? !!autoRenew : null,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._updateCartTimestamp();

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Membership product added to cart',
      cartItemId,
      cartItemCount: cartItems.length,
      cartTotal: totals.grandTotal
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const facilities = this._getFromStorage('facilities', []);
    const events = this._getFromStorage('events', []);

    let minPrice = null;
    let maxPrice = null;
    events.forEach((e) => {
      if (typeof e.fee === 'number') {
        if (minPrice === null || e.fee < minPrice) minPrice = e.fee;
        if (maxPrice === null || e.fee > maxPrice) maxPrice = e.fee;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const dayOfWeekOptions = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ].map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }));

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning (before 12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12–5 PM)' },
      { value: 'evening', label: 'Evening (after 5 PM)' }
    ];

    return {
      facilities,
      dayOfWeekOptions,
      timeOfDayOptions,
      priceRange: {
        minPrice,
        maxPrice,
        step: 5
      }
    };
  }

  // searchEvents(searchTerm, filters, sortBy, page, pageSize)
  searchEvents(searchTerm, filters, sortBy, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const facilities = this._getFromStorage('facilities', []);
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));

    let list = events.filter((e) => e.is_active !== false);

    const q = String(searchTerm || '').trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    filters = filters || {};

    if (filters.facilityId) {
      list = list.filter((e) => e.facility_id === filters.facilityId);
    }

    if (filters.dateStart || filters.dateEnd) {
      const startFilter = filters.dateStart ? this._parseDate(filters.dateStart) : null;
      const endFilter = filters.dateEnd ? this._parseDate(filters.dateEnd) : null;
      list = list.filter((e) => {
        const eStart = this._parseDate(e.start_datetime);
        const eEnd = this._parseDate(e.end_datetime);
        if (!eStart || !eEnd) return false;
        if (startFilter && eEnd < startFilter) return false;
        if (endFilter && eStart > endFilter) return false;
        return true;
      });
    }

    if (filters.daysOfWeek && filters.daysOfWeek.length) {
      const wanted = new Set(filters.daysOfWeek.map((d) => String(d).toLowerCase()));
      list = list.filter((e) => {
        const days = (e.days_of_week || []).map((d) => String(d).toLowerCase());
        return days.some((d) => wanted.has(d));
      });
    }

    if (filters.timeOfDay) {
      list = list.filter((e) => {
        const start = this._parseDate(e.start_datetime);
        if (!start) return false;
        const hour = start.getHours();
        let bucket = 'evening';
        if (hour < 12) bucket = 'morning';
        else if (hour < 17) bucket = 'afternoon';
        return bucket === filters.timeOfDay;
      });
    }

    if (filters.isFreeOnly) {
      list = list.filter((e) => e.is_free === true || e.fee === 0);
    }

    if (typeof filters.priceMin === 'number') {
      list = list.filter((e) => e.fee >= filters.priceMin);
    }

    if (typeof filters.priceMax === 'number') {
      list = list.filter((e) => e.fee <= filters.priceMax);
    }

    sortBy = sortBy || 'start_date_asc';
    list.sort((a, b) => {
      const da = this._parseDate(a.start_datetime);
      const db = this._parseDate(b.start_datetime);
      if (sortBy === 'start_date_desc') return db - da;
      return da - db;
    });

    const totalResults = list.length;
    page = page || 1;
    pageSize = pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const results = paged.map((e) => {
      const facility = facilityMap.get(e.facility_id) || null;
      const obj = {
        eventId: e.id,
        title: e.title,
        description: e.description,
        facilityId: e.facility_id,
        facilityName: facility ? facility.name : '',
        startDatetime: e.start_datetime,
        endDatetime: e.end_datetime,
        daysOfWeek: e.days_of_week || [],
        fee: e.fee,
        isFree: e.is_free,
        targetAudience: e.target_audience,
        capacityRemaining: e.capacity_remaining
      };
      // Foreign key resolution
      return Object.assign({}, obj, {
        event: e,
        facility
      });
    });

    return {
      results,
      totalResults,
      page,
      pageSize
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const facilities = this._getFromStorage('facilities', []);

    const event = events.find((e) => e.id === eventId) || null;
    const facility = event ? facilities.find((f) => f.id === event.facility_id) || null : null;

    const feeFormatted = event ? (event.is_free || event.fee === 0 ? 'Free' : ('$' + (event.fee != null ? event.fee.toFixed(2) : '0.00'))) : '';

    const display = {
      feeFormatted,
      dateTimeSummary: event ? this._formatEventSchedule(event) : '',
      targetAudienceLabel: event && event.target_audience ? event.target_audience : ''
    };

    return {
      event,
      facility,
      display
    };
  }

  // addEventToCart(eventId, householdRegistrationType, participantIds)
  addEventToCart(eventId, householdRegistrationType, participantIds) {
    const events = this._getFromStorage('events', []);
    const participants = this._getFromStorage('participants', []);

    const event = events.find((e) => e.id === eventId);
    if (!event || event.is_active === false) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Event not found or inactive', cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
    }

    householdRegistrationType = householdRegistrationType || 'household';
    participantIds = participantIds || [];

    if (participantIds.length) {
      const invalid = participantIds.some((pid) => !participants.find((p) => p.id === pid && p.is_active !== false));
      if (invalid) {
        const totals = this._recalculateCartTotals();
        return { success: false, message: 'One or more participants are invalid', cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
      }
    }

    // Capacity check – assume 1 household spot per registration
    const remaining = typeof event.capacity_remaining === 'number' ? event.capacity_remaining : null;
    if (remaining != null && remaining <= 0) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'No capacity remaining for this event', cartItemId: null, cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = event.fee || 0;
    const quantity = 1;
    const totalPrice = unitPrice * quantity;

    const cartItemId = this._generateId('cartitem');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'event',
      program_session_id: null,
      event_id: eventId,
      membership_product_id: null,
      participant_ids: participantIds.length ? participantIds : null,
      household_registration_type: householdRegistrationType,
      assign_to_participant_id: null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      rate_type: null,
      membership_start_date: null,
      membership_duration_type: null,
      auto_renew: null,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);

    // Update event capacity
    const updatedEvents = events.map((e) => {
      if (e.id === eventId && typeof e.capacity_remaining === 'number') {
        return Object.assign({}, e, { capacity_remaining: e.capacity_remaining - 1 });
      }
      return e;
    });

    this._saveToStorage('events', updatedEvents);
    this._saveToStorage('cart_items', cartItems);
    this._updateCartTimestamp();

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Event added to cart',
      cartItemId,
      cartItemCount: cartItems.length,
      cartTotal: totals.grandTotal
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    const programs = this._getFromStorage('programs', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const events = this._getFromStorage('events', []);
    const membershipProducts = this._getFromStorage('membership_products', []);
    const facilities = this._getFromStorage('facilities', []);
    const participants = this._getFromStorage('participants', []);

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const membershipMap = new Map(membershipProducts.map((m) => [m.id, m]));
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));

    const participantMap = new Map(participants.map((p) => [p.id, p]));

    const items = cartItems.map((ci) => {
      let title = '';
      let sessionOrEventTitle = '';
      let facilityName = '';
      let scheduleDisplay = '';
      let participantsDisplay = '';

      if (ci.item_type === 'program_session') {
        const session = sessionMap.get(ci.program_session_id) || null;
        const program = session ? programMap.get(session.program_id) || null : null;
        const facility = session ? facilityMap.get(session.facility_id) || null : null;
        title = program ? program.name : (session ? session.title : 'Program Session');
        sessionOrEventTitle = session ? session.title : '';
        facilityName = facility ? facility.name : '';
        scheduleDisplay = session ? this._formatSessionSchedule(session) : '';
        if (Array.isArray(ci.participant_ids) && ci.participant_ids.length) {
          const names = ci.participant_ids
            .map((pid) => participantMap.get(pid))
            .filter(Boolean)
            .map((p) => p.first_name + ' ' + p.last_name);
          participantsDisplay = names.join(', ');
        } else {
          participantsDisplay = '1 participant';
        }
      } else if (ci.item_type === 'event') {
        const ev = eventMap.get(ci.event_id) || null;
        const facility = ev ? facilityMap.get(ev.facility_id) || null : null;
        title = ev ? ev.title : 'Event';
        sessionOrEventTitle = ev ? ev.title : '';
        facilityName = facility ? facility.name : '';
        scheduleDisplay = ev ? this._formatEventSchedule(ev) : '';
        if (ci.household_registration_type === 'household') {
          participantsDisplay = 'Household';
        } else if (Array.isArray(ci.participant_ids) && ci.participant_ids.length) {
          const names = ci.participant_ids
            .map((pid) => participantMap.get(pid))
            .filter(Boolean)
            .map((p) => p.first_name + ' ' + p.last_name);
          participantsDisplay = names.join(', ');
        } else {
          participantsDisplay = '1 attendee';
        }
      } else if (ci.item_type === 'membership' || ci.item_type === 'pass') {
        const product = membershipMap.get(ci.membership_product_id) || null;
        title = product ? product.name : (ci.item_type === 'membership' ? 'Membership' : 'Pass');
        sessionOrEventTitle = '';
        facilityName = product ? this._mapFacilityUsageTypeToLabel(product.facility_usage_type) : '';
        scheduleDisplay = ci.membership_start_date || '';
        if (ci.assign_to_participant_id) {
          const p = participantMap.get(ci.assign_to_participant_id);
          participantsDisplay = p ? (p.first_name + ' ' + p.last_name) : 'Assigned member';
        } else {
          participantsDisplay = 'Unassigned';
        }
      }

      const obj = {
        cartItemId: ci.id,
        itemType: ci.item_type,
        title,
        sessionOrEventTitle,
        participantsDisplay,
        scheduleDisplay,
        facilityName,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        totalPrice: ci.total_price,
        rateType: ci.rate_type,
        membershipStartDate: ci.membership_start_date,
        membershipDurationType: ci.membership_duration_type,
        autoRenew: ci.auto_renew
      };

      // Foreign key resolution for cartItemId -> cartItem
      return Object.assign({}, obj, { cartItem: ci });
    });

    const totals = this._recalculateCartTotals();

    return {
      cartId: cart ? cart.id : null,
      items,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
      hasItems: items.length > 0
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = parseInt(quantity, 10);
    if (!(quantity > 0)) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Quantity must be greater than zero', cartItemCount: this._getFromStorage('cart_items', []).length, cartTotal: totals.grandTotal };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Cart item not found', cartItemCount: cartItems.length, cartTotal: totals.grandTotal };
    }

    const ci = cartItems[idx];

    // For now, only allow quantity updates for membership/pass items to avoid capacity complexity
    if (ci.item_type !== 'membership' && ci.item_type !== 'pass') {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Quantity update is only supported for membership or pass items', cartItemCount: cartItems.length, cartTotal: totals.grandTotal };
    }

    const oldQuantity = ci.quantity;
    ci.quantity = quantity;
    ci.total_price = ci.unit_price * quantity;
    cartItems[idx] = ci;

    this._saveToStorage('cart_items', cartItems);
    this._updateCartTimestamp();

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Cart item quantity updated',
      cartItemCount: cartItems.length,
      cartTotal: totals.grandTotal
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const totals = this._recalculateCartTotals();
      return { success: false, message: 'Cart item not found', cartItemCount: cartItems.length, cartTotal: totals.grandTotal };
    }

    const ci = cartItems[idx];

    // Restore capacity for program sessions and events
    if (ci.item_type === 'program_session') {
      const sessions = this._getFromStorage('program_sessions', []);
      const updatedSessions = sessions.map((s) => {
        if (s.id === ci.program_session_id) {
          const current = typeof s.spots_remaining === 'number' ? s.spots_remaining : 0;
          const delta = Array.isArray(ci.participant_ids) ? ci.participant_ids.length : ci.quantity;
          return Object.assign({}, s, { spots_remaining: current + delta });
        }
        return s;
      });
      this._saveToStorage('program_sessions', updatedSessions);
    } else if (ci.item_type === 'event') {
      const events = this._getFromStorage('events', []);
      const updatedEvents = events.map((e) => {
        if (e.id === ci.event_id && typeof e.capacity_remaining === 'number') {
          return Object.assign({}, e, { capacity_remaining: e.capacity_remaining + 1 });
        }
        return e;
      });
      this._saveToStorage('events', updatedEvents);
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    this._updateCartTimestamp();

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Cart item removed',
      cartItemCount: cartItems.length,
      cartTotal: totals.grandTotal
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    this._ensureAuthenticated();

    const cartSummary = this.getCartSummary();

    const paymentMethods = [
      {
        code: 'online',
        label: 'Pay Online',
        description: 'Pay securely with a credit card.'
      },
      {
        code: 'pay_at_front_desk',
        label: 'Pay at Front Desk',
        description: 'Reserve now and pay in person before your first visit.'
      }
    ];

    const defaultPaymentMethod = 'online';
    const contactInfoRequired = true;

    return {
      cartSummary: {
        items: cartSummary.items,
        subtotal: cartSummary.subtotal,
        taxTotal: cartSummary.taxTotal,
        discountTotal: cartSummary.discountTotal,
        grandTotal: cartSummary.grandTotal
      },
      paymentMethods,
      defaultPaymentMethod,
      contactInfoRequired
    };
  }

  // submitOrder(paymentMethod, contactInfo, agreeToPolicies)
  submitOrder(paymentMethod, contactInfo, agreeToPolicies) {
    this._ensureAuthenticated();

    if (!agreeToPolicies) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        paymentMethod,
        paymentStatus: null,
        status: null,
        totalAmount: 0,
        message: 'You must agree to policies to complete the order',
        items: [],
        payAtFrontDeskInstructions: ''
      };
    }

    const { success, order } = this._createOrderFromCart(paymentMethod, contactInfo || {});

    if (!success || !order) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        paymentMethod,
        paymentStatus: null,
        status: null,
        totalAmount: 0,
        message: 'Unable to create order',
        items: [],
        payAtFrontDeskInstructions: ''
      };
    }

    let payAtFrontDeskInstructions = '';
    if (paymentMethod === 'pay_at_front_desk') {
      payAtFrontDeskInstructions = 'Please visit any participating facility front desk within 3 business days to complete payment and confirm your registration.';
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      status: order.status,
      totalAmount: order.total_amount,
      message: 'Order submitted successfully',
      items: order.items,
      payAtFrontDeskInstructions
    };
  }

  // getOrderDetails(orderId)
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find((o) => o.id === orderId) || null;
    return { order };
  }

  // getMyActivitiesList(includePast)
  getMyActivitiesList(includePast) {
    this._ensureAuthenticated();

    const registrations = this._getFromStorage('registrations', []);
    const membershipAssignments = this._getFromStorage('membership_assignments', []);
    const facilities = this._getFromStorage('facilities', []);
    const membershipProducts = this._getFromStorage('membership_products', []);

    const facilityMap = new Map(facilities.map((f) => [f.id, f]));
    const membershipMap = new Map(membershipProducts.map((m) => [m.id, m]));

    const now = new Date();

    const upcomingRegistrations = registrations
      .filter((r) => {
        if (!includePast) {
          const start = this._parseDate(r.start_datetime);
          if (!start || start < now) return false;
        }
        return r.status === 'active';
      })
      .map((r) => {
        const facility = r.facility_id ? facilityMap.get(r.facility_id) || null : null;
        const regObj = {
          registrationId: r.id,
          registrationKind: r.registration_kind,
          title: r.title,
          facilityName: facility ? facility.name : '',
          startDatetime: r.start_datetime,
          endDatetime: r.end_datetime,
          participantNames: [],
          status: r.status
        };
        // Foreign key resolution for registrationId -> registration
        return Object.assign({}, regObj, { registration: r });
      });

    const membershipAssignmentsOut = membershipAssignments
      .filter((m) => includePast || m.status === 'active')
      .map((m) => {
        const product = membershipMap.get(m.membership_product_id) || null;
        const obj = {
          membershipAssignmentId: m.id,
          productName: product ? product.name : '',
          productType: m.product_type,
          facilityUsageType: product ? product.facility_usage_type : '',
          participantName: '',
          startDate: m.start_date,
          endDate: m.end_date,
          remainingVisits: m.remaining_visits,
          autoRenew: m.auto_renew,
          status: m.status
        };
        return obj;
      });

    return {
      upcomingRegistrations,
      membershipAssignments: membershipAssignmentsOut
    };
  }

  // getRegistrationDetails(registrationId)
  getRegistrationDetails(registrationId) {
    const registrations = this._getFromStorage('registrations', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const facilities = this._getFromStorage('facilities', []);
    const participants = this._getFromStorage('participants', []);

    const registration = registrations.find((r) => r.id === registrationId) || null;

    let programSession = null;
    let facility = null;

    if (registration && registration.program_session_id) {
      const s = sessions.find((ps) => ps.id === registration.program_session_id) || null;
      programSession = s
        ? {
            programSessionId: s.id,
            title: s.title,
            startTime: s.start_time,
            endTime: s.end_time
          }
        : null;
      if (s) {
        facility = facilities.find((f) => f.id === s.facility_id) || null;
      }
    } else if (registration && registration.facility_id) {
      facility = facilities.find((f) => f.id === registration.facility_id) || null;
    }

    const participantObjs = registration && Array.isArray(registration.participant_ids)
      ? registration.participant_ids.map((pid) => participants.find((p) => p.id === pid)).filter(Boolean)
      : [];

    return {
      registration,
      programSession,
      facility,
      participants: participantObjs
    };
  }

  // cancelRegistration(registrationId, cancellationReason)
  cancelRegistration(registrationId, cancellationReason) {
    const registrations = this._getFromStorage('registrations', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const events = this._getFromStorage('events', []);

    const idx = registrations.findIndex((r) => r.id === registrationId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Registration not found',
        updatedRegistration: null,
        refundAmount: 0,
        similarSessionsAvailable: false
      };
    }

    const registration = registrations[idx];
    if (registration.status !== 'active') {
      return {
        success: false,
        message: 'Registration is not active and cannot be cancelled',
        updatedRegistration: registration,
        refundAmount: 0,
        similarSessionsAvailable: false
      };
    }

    // Update registration status
    registration.status = 'cancelled';
    if (cancellationReason) {
      registration.cancellation_reason = cancellationReason;
    }
    registrations[idx] = registration;

    // Restore capacity
    if (registration.registration_kind === 'program_session' && registration.program_session_id) {
      const updatedSessions = sessions.map((s) => {
        if (s.id === registration.program_session_id) {
          const current = typeof s.spots_remaining === 'number' ? s.spots_remaining : 0;
          const delta = Array.isArray(registration.participant_ids) ? registration.participant_ids.length : 1;
          return Object.assign({}, s, { spots_remaining: current + delta });
        }
        return s;
      });
      this._saveToStorage('program_sessions', updatedSessions);
    } else if (registration.registration_kind === 'event' && registration.event_id) {
      const updatedEvents = events.map((e) => {
        if (e.id === registration.event_id && typeof e.capacity_remaining === 'number') {
          return Object.assign({}, e, { capacity_remaining: e.capacity_remaining + 1 });
        }
        return e;
      });
      this._saveToStorage('events', updatedEvents);
    }

    this._saveToStorage('registrations', registrations);

    // Simple policy: no automatic refunds in this logic
    const refundAmount = 0;

    // Check for similar sessions availability
    const similar = this.getSimilarSessionsForRegistration(registrationId, {});
    const similarSessionsAvailable = similar.sessions && similar.sessions.length > 0;

    return {
      success: true,
      message: 'Registration cancelled',
      updatedRegistration: registration,
      refundAmount,
      similarSessionsAvailable
    };
  }

  // getSimilarSessionsForRegistration(registrationId, filters)
  getSimilarSessionsForRegistration(registrationId, filters) {
    const registrations = this._getFromStorage('registrations', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const programs = this._getFromStorage('programs', []);
    const facilities = this._getFromStorage('facilities', []);

    const registration = registrations.find((r) => r.id === registrationId) || null;
    if (!registration || !registration.program_session_id) {
      return { sessions: [] };
    }

    const baseSession = sessions.find((s) => s.id === registration.program_session_id) || null;
    if (!baseSession) {
      return { sessions: [] };
    }

    const programId = baseSession.program_id;
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));
    const programMap = new Map(programs.map((p) => [p.id, p]));

    filters = filters || {};

    let list = sessions.filter((s) => s.is_active !== false && s.program_id === programId && s.id !== baseSession.id && s.spots_remaining > 0);

    if (filters.dateStart || filters.dateEnd) {
      const startFilter = filters.dateStart ? this._parseDate(filters.dateStart) : null;
      const endFilter = filters.dateEnd ? this._parseDate(filters.dateEnd) : null;
      list = list.filter((s) => {
        const sStart = this._parseDate(s.start_date);
        const sEnd = this._parseDate(s.end_date);
        if (!sStart || !sEnd) return false;
        if (startFilter && sEnd < startFilter) return false;
        if (endFilter && sStart > endFilter) return false;
        return true;
      });
    }

    if (filters.startTimeFrom || filters.startTimeTo) {
      const fromMin = this._timeToMinutes(filters.startTimeFrom || '00:00');
      const toMin = this._timeToMinutes(filters.startTimeTo || '23:59');
      list = list.filter((s) => {
        const stMin = this._timeToMinutes(s.start_time);
        if (stMin == null) return false;
        return stMin >= fromMin && stMin <= toMin;
      });
    }

    if (filters.facilityId) {
      list = list.filter((s) => s.facility_id === filters.facilityId);
    }

    const out = list.map((s) => {
      const facility = facilityMap.get(s.facility_id) || null;
      const program = programMap.get(s.program_id) || null;
      return {
        sessionId: s.id,
        programName: program ? program.name : '',
        title: s.title,
        facilityName: facility ? facility.name : '',
        startDate: s.start_date,
        startTime: s.start_time,
        spotsRemaining: s.spots_remaining
      };
    });

    return { sessions: out };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorites', []);
    const programs = this._getFromStorage('programs', []);
    const sessions = this._getFromStorage('program_sessions', []);
    const events = this._getFromStorage('events', []);
    const membershipProducts = this._getFromStorage('membership_products', []);
    const facilities = this._getFromStorage('facilities', []);

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const membershipMap = new Map(membershipProducts.map((m) => [m.id, m]));
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));

    const list = favorites.map((f) => {
      let displayTitle = '';
      let categoryLabel = '';
      let ageRangeLabel = '';
      let facilityName = '';
      let typicalSchedule = '';
      let priceSummary = '';
      let canRegisterNow = false;

      let program = null;
      let programSession = null;
      let event = null;
      let membershipProduct = null;

      if (f.item_type === 'program') {
        program = programMap.get(f.program_id) || null;
        if (program) {
          displayTitle = program.name;
          categoryLabel = program.category || '';
          ageRangeLabel = program.age_category_label || '';

          // Derive facility and basic schedule/price info from an active session for this program
          const relatedSession = sessions.find((s) => s.program_id === program.id && s.is_active !== false) || null;
          if (relatedSession) {
            const facility = facilityMap.get(relatedSession.facility_id) || null;
            facilityName = facility ? facility.name : '';
            typicalSchedule = this._formatSessionSchedule(relatedSession);
            priceSummary = '$' + (relatedSession.fee != null ? relatedSession.fee.toFixed(2) : '0.00');
            canRegisterNow = relatedSession.spots_remaining > 0;
          }
        }
      } else if (f.item_type === 'program_session') {
        programSession = sessionMap.get(f.program_session_id) || null;
        if (programSession) {
          program = programMap.get(programSession.program_id) || null;
          const facility = facilityMap.get(programSession.facility_id) || null;
          displayTitle = program ? program.name : programSession.title;
          categoryLabel = programSession.program_category || (program ? program.category : '');
          ageRangeLabel = program && program.age_category_label
            ? program.age_category_label
            : (programSession.age_min != null && programSession.age_max != null ? programSession.age_min + '–' + programSession.age_max + ' years' : '');
          facilityName = facility ? facility.name : '';
          typicalSchedule = this._formatSessionSchedule(programSession);
          priceSummary = '$' + (programSession.fee != null ? programSession.fee.toFixed(2) : '0.00');
          canRegisterNow = programSession.is_active !== false && programSession.spots_remaining > 0;
        }
      } else if (f.item_type === 'event') {
        event = eventMap.get(f.event_id) || null;
        if (event) {
          const facility = facilityMap.get(event.facility_id) || null;
          displayTitle = event.title;
          categoryLabel = event.category || 'event';
          facilityName = facility ? facility.name : '';
          typicalSchedule = this._formatEventSchedule(event);
          priceSummary = event.is_free || event.fee === 0 ? 'Free' : '$' + (event.fee != null ? event.fee.toFixed(2) : '0.00');
          canRegisterNow = event.is_active !== false && (event.capacity_remaining == null || event.capacity_remaining > 0);
        }
      } else if (f.item_type === 'membership') {
        membershipProduct = membershipMap.get(f.membership_product_id) || null;
        if (membershipProduct) {
          displayTitle = membershipProduct.name;
          categoryLabel = membershipProduct.product_type;
          facilityName = this._mapFacilityUsageTypeToLabel(membershipProduct.facility_usage_type);
          const price = this._calculateMembershipPrice(membershipProduct);
          priceSummary = '$' + (price != null ? price.toFixed(2) : '0.00');
          canRegisterNow = membershipProduct.is_active !== false;
        }
      }

      const obj = {
        favoriteId: f.id,
        itemType: f.item_type,
        programId: f.program_id || null,
        programSessionId: f.program_session_id || null,
        eventId: f.event_id || null,
        membershipProductId: f.membership_product_id || null,
        displayTitle,
        categoryLabel,
        ageRangeLabel,
        facilityName,
        typicalSchedule,
        priceSummary,
        canRegisterNow
      };

      // Foreign key resolution
      return Object.assign({}, obj, {
        program,
        programSession,
        event,
        membershipProduct
      });
    });

    return list;
  }

  // addFavoriteItem(itemType, programId, programSessionId, eventId, membershipProductId)
  addFavoriteItem(itemType, programId, programSessionId, eventId, membershipProductId) {
    const favorites = this._getFromStorage('favorites', []);

    // Avoid duplicates for the same underlying item
    const exists = favorites.some((f) => {
      if (f.item_type !== itemType) return false;
      if (itemType === 'program' && f.program_id === programId) return true;
      if (itemType === 'program_session' && f.program_session_id === programSessionId) return true;
      if (itemType === 'event' && f.event_id === eventId) return true;
      if (itemType === 'membership' && f.membership_product_id === membershipProductId) return true;
      return false;
    });

    if (exists) {
      const existing = favorites.find((f) => {
        if (f.item_type !== itemType) return false;
        if (itemType === 'program' && f.program_id === programId) return true;
        if (itemType === 'program_session' && f.program_session_id === programSessionId) return true;
        if (itemType === 'event' && f.event_id === eventId) return true;
        if (itemType === 'membership' && f.membership_product_id === membershipProductId) return true;
        return false;
      });
      return { favoriteItem: existing };
    }

    const favoriteItem = {
      id: this._generateId('fav'),
      item_type: itemType,
      program_id: programId || null,
      program_session_id: programSessionId || null,
      event_id: eventId || null,
      membership_product_id: membershipProductId || null,
      created_at: this._nowIso()
    };

    favorites.push(favoriteItem);
    this._saveToStorage('favorites', favorites);

    return { favoriteItem };
  }

  // removeFavoriteItem(favoriteId)
  removeFavoriteItem(favoriteId) {
    const favorites = this._getFromStorage('favorites', []);
    const idx = favorites.findIndex((f) => f.id === favoriteId);
    if (idx === -1) {
      return { success: false, message: 'Favorite item not found' };
    }

    favorites.splice(idx, 1);
    this._saveToStorage('favorites', favorites);
    return { success: true, message: 'Favorite removed' };
  }

  // getAboutInfo()
  getAboutInfo() {
    // Static-style content; could be extended to use localStorage-configured values
    return {
      departmentName: 'Municipal Recreation Department',
      description: 'The Municipal Recreation Department provides inclusive programs, events, and facilities that support active, healthy living for residents of all ages.',
      missionStatement: 'To build a healthy, connected community through accessible recreation, sport, and cultural opportunities.',
      programTypesSummary: 'We offer aquatics & swimming, fitness & wellness, sports, arts & culture, early childhood programs, camps, and community events.',
      accessibilityInfo: 'Many facilities are wheelchair accessible and offer adaptive programs. Contact us for specific accessibility information or accommodation requests.'
    };
  }

  // getContactInfo()
  getContactInfo() {
    const facilities = this._getFromStorage('facilities', []);
    const facilityContacts = facilities.map((f) => ({
      facility: f,
      email: '',
      phone: f.phone || ''
    }));

    return {
      generalPhone: '000-000-0000',
      generalEmail: 'recreation@example.org',
      customerServiceHours: 'Monday–Friday, 8:30 AM–4:30 PM',
      expectedResponseTime: 'We aim to respond to inquiries within 2 business days.',
      facilityContacts
    };
  }

  // submitContactRequest(name, email, phone, topic, message, preferredContactMethod)
  submitContactRequest(name, email, phone, topic, message, preferredContactMethod) {
    const requests = this._getFromStorage('contact_requests', []);
    const referenceNumber = 'CR-' + this._getNextIdCounter();

    const req = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      topic,
      message,
      preferred_contact_method: preferredContactMethod || '',
      reference_number: referenceNumber,
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      referenceNumber,
      message: 'Your request has been submitted.'
    };
  }

  // getPoliciesAndTerms()
  getPoliciesAndTerms() {
    const sections = this._getFromStorage('policies_sections', []);

    // If no sections have been configured in storage, return an empty list
    return {
      sections
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics', []);
    return topics;
  }

  // getFaqList()
  getFaqList() {
    const faqs = this._getFromStorage('faqs', []);
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
