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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    // Legacy/sample keys (unused but kept for compatibility)
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

    const tables = [
      'consultation_services',
      'consultation_time_slots',
      'programs',
      'program_tiers',
      'group_classes',
      'group_class_sessions',
      'workout_templates',
      'training_plans',
      'training_plan_items',
      'nutrition_bundles',
      'coaches',
      'membership_plans',
      'add_ons',
      'challenges',
      'challenge_registrations',
      'articles',
      'reading_list',
      'cart',
      'cart_items',
      'orders',
      'order_items',
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

  // -------------------- Generic Helpers --------------------

  _nowISO() {
    return new Date().toISOString();
  }

  _dateToISODateString(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _isSameDate(isoDateTime, dateStr) {
    if (!isoDateTime || !dateStr) return false;
    const dStr = this._dateToISODateString(isoDateTime);
    return dStr === dateStr;
  }

  _timeStrToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getTimeStringFromISO(iso) {
    const d = new Date(iso);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  _labelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx === -1) {
      carts.push(cart);
    } else {
      carts[idx] = cart;
    }
    this._saveToStorage('cart', carts);
  }

  _calculateCartTotals(cart, cartItems) {
    let subtotal_one_off = 0;
    let subtotal_recurring_monthly = 0;

    for (const item of cartItems) {
      if (!item) continue;
      const subtotal = Number(item.subtotal_price) || 0;
      if (item.is_recurring) {
        if (item.billing_period === 'monthly') {
          subtotal_recurring_monthly += subtotal;
        }
        // For simplicity, only track monthly recurring subtotal
      } else {
        subtotal_one_off += subtotal;
      }
    }

    const total_price = subtotal_one_off + subtotal_recurring_monthly;

    return {
      subtotal_one_off,
      subtotal_recurring_monthly,
      total_price
    };
  }

  _validateProgramStartDate(program, start_date_str) {
    if (!start_date_str) return false;
    const startDate = new Date(start_date_str + 'T00:00:00');
    if (isNaN(startDate.getTime())) return false;

    const today = new Date();
    const earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const latest = new Date(earliest.getTime() + 30 * 24 * 60 * 60 * 1000);

    return startDate >= earliest && startDate <= latest;
  }

  /**
   * Generic helper to find next available slots for consultations or classes.
   * entityType: 'consultation' | 'class'
   * options:
   *  - for consultation: { services, slots, filters }
   *  - for class: { sessions, filters }
   */
  _findNextAvailableSlots(entityType, options) {
    if (entityType === 'consultation') {
      const { services, slots, filters } = options;
      const serviceIds = new Set(services.map((s) => s.id));
      const byService = {};

      const dateFilter = filters && filters.date;
      const earliestStart = filters && filters.earliest_start_time
        ? this._timeStrToMinutes(filters.earliest_start_time)
        : null;
      const latestStart = filters && filters.latest_start_time
        ? this._timeStrToMinutes(filters.latest_start_time)
        : null;

      for (const slot of slots) {
        if (!slot.is_available) continue;
        if (!serviceIds.has(slot.consultation_service_id)) continue;
        if (filters && filters.duration_minutes && slot.duration_minutes !== filters.duration_minutes) continue;
        if (dateFilter && !this._isSameDate(slot.start_datetime, dateFilter)) continue;

        const slotMinutes = this._timeStrToMinutes(this._getTimeStringFromISO(slot.start_datetime));
        if (earliestStart != null && slotMinutes < earliestStart) continue;
        if (latestStart != null && slotMinutes > latestStart) continue;

        const currentBest = byService[slot.consultation_service_id];
        if (!currentBest) {
          byService[slot.consultation_service_id] = slot;
        } else {
          // Prefer lower price, then earlier date
          if (slot.price < currentBest.price) {
            byService[slot.consultation_service_id] = slot;
          } else if (slot.price === currentBest.price) {
            if (new Date(slot.start_datetime) < new Date(currentBest.start_datetime)) {
              byService[slot.consultation_service_id] = slot;
            }
          }
        }
      }
      return byService; // map serviceId -> best slot
    }

    if (entityType === 'class') {
      const { sessions, filters } = options;
      const start_from = filters && filters.start_time_from ? this._timeStrToMinutes(filters.start_time_from) : null;
      const start_to = filters && filters.start_time_to ? this._timeStrToMinutes(filters.start_time_to) : null;
      const maxDur = filters && filters.max_duration_minutes ? filters.max_duration_minutes : null;
      const intensity = filters && filters.intensity;

      const result = [];
      for (const s of sessions) {
        if (s.is_cancelled) continue;
        if (s.remaining_spots <= 0) continue;
        if (intensity && s.intensity !== intensity) continue;
        if (maxDur != null && s.duration_minutes > maxDur) continue;
        const minutes = this._timeStrToMinutes(this._getTimeStringFromISO(s.start_datetime));
        if (start_from != null && minutes < start_from) continue;
        if (start_to != null && minutes > start_to) continue;
        result.push(s);
      }
      // For classes we just return filtered sessions list
      return result;
    }

    return {};
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_list');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        article_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('reading_list', lists);
    }
    return list;
  }

  // -------------------- Home & Recommendations --------------------

  getHomeOverview() {
    const service_areas = [
      {
        key: 'consultations',
        title: '1:1 Consultations',
        description: 'Personalised running, strength, nutrition, and wellbeing coaching.'
      },
      {
        key: 'programs',
        title: 'Online Programs',
        description: 'Multi-week training and wellbeing programs you can follow from anywhere.'
      },
      {
        key: 'classes',
        title: 'Group Classes',
        description: 'Small-group strength, conditioning, mobility, and yoga sessions.'
      },
      {
        key: 'memberships',
        title: 'Memberships',
        description: 'Gym access, class packs, and flexible subscription bundles.'
      }
    ];

    const quick_actions = [
      { action_key: 'book_consultation', label: 'Book a consultation' },
      { action_key: 'browse_programs', label: 'Browse online programs' },
      { action_key: 'view_classes', label: 'View class schedule' },
      { action_key: 'open_training_planner', label: 'Open training planner' },
      { action_key: 'view_memberships', label: 'View memberships' }
    ];

    return { service_areas, quick_actions };
  }

  getFeaturedOffers() {
    const programs = this._getFromStorage('programs').filter((p) => p.is_active);
    const nutritionBundles = this._getFromStorage('nutrition_bundles').filter((b) => b.is_active);
    const challenges = this._getFromStorage('challenges').filter((c) => c.is_active);

    const featured_programs = programs
      .filter((p) => ['stress_management', 'nutrition', 'performance', 'general_wellbeing'].includes(p.category))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((p) => ({
        program_id: p.id,
        name: p.name,
        category: p.category,
        duration_weeks: p.duration_weeks,
        price: p.base_price,
        rating: p.rating,
        program: p
      }));

    const featured_nutrition_bundles = nutritionBundles
      .sort((a, b) => {
        // Prefer better cost per minute; fallback to lower price
        const cpmA = a.total_minutes ? a.price / a.total_minutes : Infinity;
        const cpmB = b.total_minutes ? b.price / b.total_minutes : Infinity;
        if (cpmA !== cpmB) return cpmA - cpmB;
        return a.price - b.price;
      })
      .slice(0, 5)
      .map((b) => ({
        bundle_id: b.id,
        name: b.name,
        total_minutes: b.total_minutes,
        price: b.price,
        bundle: b
      }));

    const featured_challenges = challenges
      .sort((a, b) => {
        // Prefer free, then shorter duration
        if (a.price_type !== b.price_type) {
          return a.price_type === 'free' ? -1 : 1;
        }
        return a.duration_days - b.duration_days;
      })
      .slice(0, 5)
      .map((c) => ({
        challenge_id: c.id,
        name: c.name,
        duration_days: c.duration_days,
        price_type: c.price_type,
        challenge: c
      }));

    return { featured_programs, featured_nutrition_bundles, featured_challenges };
  }

  getGoalRecommendations(goal) {
    const recommended_sections = [];
    const highlighted_items = [];

    const consultations = this._getFromStorage('consultation_services').filter((c) => c.is_active);
    const programs = this._getFromStorage('programs').filter((p) => p.is_active);
    const challenges = this._getFromStorage('challenges').filter((c) => c.is_active);
    const groupClasses = this._getFromStorage('group_classes').filter((g) => g.is_active);

    if (goal === 'improve_running') {
      recommended_sections.push(
        { section_key: 'consultations', label: 'Running consultations' },
        { section_key: 'programs', label: 'Running programs' },
        { section_key: 'classes', label: 'Conditioning classes' }
      );

      const runningConsult = consultations
        .filter((c) => c.service_type === 'running_technique')
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      if (runningConsult) {
        highlighted_items.push({
          item_type: 'consultation',
          reference_id: runningConsult.id,
          name: runningConsult.name,
          summary: '1:1 running technique session to refine form and efficiency.'
        });
      }

      const runningProgram = programs
        .filter((p) => ['running', 'performance'].includes(p.category))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      if (runningProgram) {
        highlighted_items.push({
          item_type: 'program',
          reference_id: runningProgram.id,
          name: runningProgram.name,
          summary: 'Structured running plan to build speed, endurance, and resilience.'
        });
      }
    } else if (goal === 'manage_stress') {
      recommended_sections.push(
        { section_key: 'programs', label: 'Stress management programs' },
        { section_key: 'challenges', label: 'Short wellbeing challenges' },
        { section_key: 'consultations', label: 'Wellbeing coaching' }
      );

      const stressProgram = programs
        .filter((p) => p.category === 'stress_management')
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      if (stressProgram) {
        highlighted_items.push({
          item_type: 'program',
          reference_id: stressProgram.id,
          name: stressProgram.name,
          summary: '4+ week stress management journey blending tools and practice.'
        });
      }

      const freeChallenge = challenges
        .filter((c) => c.price_type === 'free')
        .sort((a, b) => a.duration_days - b.duration_days)[0];
      if (freeChallenge) {
        highlighted_items.push({
          item_type: 'challenge',
          reference_id: freeChallenge.id,
          name: freeChallenge.name,
          summary: 'A short, guided wellbeing challenge delivered to your inbox.'
        });
      }
    } else if (goal === 'build_strength') {
      recommended_sections.push(
        { section_key: 'classes', label: 'Strength & conditioning classes' },
        { section_key: 'consultations', label: 'Strength coaching' },
        { section_key: 'programs', label: 'Strength programs' }
      );

      const strengthClass = groupClasses
        .filter((g) => g.focus === 'strength')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))[0];
      if (strengthClass) {
        highlighted_items.push({
          item_type: 'class',
          reference_id: strengthClass.id,
          name: strengthClass.name,
          summary: 'Coach-led strength class to build robust, resilient muscles.'
        });
      }
    } else if (goal === 'general_wellbeing') {
      recommended_sections.push(
        { section_key: 'programs', label: 'Wellbeing programs' },
        { section_key: 'challenges', label: 'Free challenges' },
        { section_key: 'resources', label: 'Articles & resources' }
      );
    }

    return { recommended_sections, highlighted_items };
  }

  // -------------------- Consultations --------------------

  getConsultationFilterOptions() {
    const services = this._getFromStorage('consultation_services').filter((s) => s.is_active);
    const typesSet = new Set();
    const durationsSet = new Set();

    for (const s of services) {
      if (s.service_type) typesSet.add(s.service_type);
      if (typeof s.duration_minutes === 'number') durationsSet.add(s.duration_minutes);
    }

    const service_types = Array.from(typesSet).map((value) => ({
      value,
      label: this._labelFromEnum(value)
    }));

    const durations_minutes = Array.from(durationsSet).sort((a, b) => a - b);

    const time_of_day_ranges = [
      { key: 'morning', label: 'Morning', start_time: '06:00', end_time: '12:00' },
      { key: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '17:00' },
      { key: 'evening', label: 'Evening', start_time: '17:00', end_time: '21:00' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'earliest_availability', label: 'Earliest Availability' }
    ];

    return { service_types, durations_minutes, time_of_day_ranges, sort_options };
  }

  searchConsultations(filters, sort, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const servicesAll = this._getFromStorage('consultation_services').filter((s) => s.is_active);
    const timeSlotsAll = this._getFromStorage('consultation_time_slots');
    const coaches = this._getFromStorage('coaches');

    let services = servicesAll;

    if (f.service_type) {
      services = services.filter((s) => s.service_type === f.service_type);
    }
    if (typeof f.duration_minutes === 'number') {
      services = services.filter((s) => s.duration_minutes === f.duration_minutes);
    }
    if (typeof f.min_rating === 'number') {
      services = services.filter((s) => (s.rating || 0) >= f.min_rating);
    }

    const slotsMap = this._findNextAvailableSlots('consultation', {
      services,
      slots: timeSlotsAll,
      filters: {
        duration_minutes: f.duration_minutes,
        date: f.date,
        earliest_start_time: f.earliest_start_time,
        latest_start_time: f.latest_start_time
      }
    });

    let results = services
      .map((s) => {
        const bestSlot = slotsMap[s.id];
        if (!bestSlot) return null;
        const coach = coaches.find((c) => c.id === s.coach_id) || null;
        return {
          consultation_service_id: s.id,
          name: s.name,
          service_type: s.service_type,
          duration_minutes: s.duration_minutes,
          base_price: s.base_price,
          rating: s.rating,
          rating_count: s.rating_count,
          coach_name: coach ? coach.name : null,
          next_available_start_datetime: bestSlot.start_datetime,
          next_available_price: bestSlot.price,
          // FK resolution
          consultation_service: s
        };
      })
      .filter(Boolean);

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.next_available_price || 0) - (b.next_available_price || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.next_available_price || 0) - (a.next_available_price || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // earliest_availability or default
      results.sort((a, b) => {
        const da = new Date(a.next_available_start_datetime || 0);
        const db = new Date(b.next_available_start_datetime || 0);
        return da - db;
      });
    }

    const total = results.length;
    const start = (pg - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      results: paged,
      total,
      page: pg,
      page_size: size
    };
  }

  getConsultationDetail(consultationServiceId, date) {
    const services = this._getFromStorage('consultation_services');
    const slotsAll = this._getFromStorage('consultation_time_slots');
    const coaches = this._getFromStorage('coaches');

    const consultation = services.find((s) => s.id === consultationServiceId) || null;
    if (!consultation) {
      return {
        consultation: null,
        coach: null,
        selected_date: date || null,
        available_slots: []
      };
    }

    const coach = coaches.find((c) => c.id === consultation.coach_id) || null;

    let available_slots = slotsAll.filter(
      (slot) =>
        slot.consultation_service_id === consultationServiceId &&
        slot.is_available
    );

    if (date) {
      available_slots = available_slots.filter((slot) => this._isSameDate(slot.start_datetime, date));
    }

    available_slots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const mappedSlots = available_slots.map((slot) => ({
      time_slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      duration_minutes: slot.duration_minutes,
      price: slot.price,
      is_available: slot.is_available,
      max_participants: slot.max_participants,
      location_type: slot.location_type,
      location_detail: slot.location_detail
    }));

    return {
      consultation: {
        id: consultation.id,
        name: consultation.name,
        service_type: consultation.service_type,
        description: consultation.description,
        duration_minutes: consultation.duration_minutes,
        base_price: consultation.base_price,
        rating: consultation.rating,
        rating_count: consultation.rating_count,
        tags: consultation.tags || []
      },
      coach: coach
        ? {
            id: coach.id,
            name: coach.name,
            role: coach.role,
            bio: coach.bio,
            rating: coach.rating,
            rating_count: coach.rating_count,
            specialties: coach.specialties || []
          }
        : null,
      selected_date: date || null,
      available_slots: mappedSlots
    };
  }

  addConsultationBookingToCart(consultationTimeSlotId, attendees, contact_name, contact_email, contact_phone) {
    const slots = this._getFromStorage('consultation_time_slots');
    const services = this._getFromStorage('consultation_services');
    const cartItems = this._getFromStorage('cart_items');

    const slot = slots.find((s) => s.id === consultationTimeSlotId);
    if (!slot || !slot.is_available) {
      return { success: false, cart_item_id: null, message: 'Selected time slot is not available.' };
    }

    if (attendees > slot.max_participants) {
      return { success: false, cart_item_id: null, message: 'Number of attendees exceeds maximum participants.' };
    }

    const service = services.find((s) => s.id === slot.consultation_service_id) || null;
    const cart = this._getOrCreateCart();

    const unit_price = slot.price;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    const name_snapshot = service ? service.name : 'Consultation';
    const details_snapshot = `Consultation on ${slot.start_datetime}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'consultation',
      reference_id: service ? service.id : slot.id,
      consultation_time_slot_id: slot.id,
      program_id: null,
      program_tier_id: null,
      program_start_date: null,
      group_class_session_id: null,
      attendees: attendees,
      bundle_id: null,
      membership_plan_id: null,
      add_on_id: null,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring: false,
      billing_period: 'once',
      start_date: slot.start_datetime,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Consultation added to cart.' };
  }

  // -------------------- Programs --------------------

  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs').filter((p) => p.is_active);
    const catSet = new Set();
    const durSet = new Set();

    for (const p of programs) {
      if (p.category) catSet.add(p.category);
      if (typeof p.duration_weeks === 'number') durSet.add(p.duration_weeks);
    }

    const categories = Array.from(catSet).map((value) => ({
      value,
      label: this._labelFromEnum(value)
    }));

    const durations_weeks = Array.from(durSet).sort((a, b) => a - b);

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return { categories, durations_weeks, rating_thresholds, sort_options };
  }

  searchPrograms(filters, sort, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const programs = this._getFromStorage('programs').filter((p) => p.is_active);

    let results = programs;
    if (f.category) {
      results = results.filter((p) => p.category === f.category);
    }
    if (typeof f.duration_weeks === 'number') {
      results = results.filter((p) => p.duration_weeks === f.duration_weeks);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter((p) => p.base_price <= f.max_price);
    }
    if (typeof f.min_rating === 'number') {
      results = results.filter((p) => (p.rating || 0) >= f.min_rating);
    }

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popularity') {
      results.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    const total = results.length;
    const start = (pg - 1) * size;
    const pageResults = results.slice(start, start + size).map((p) => ({
      program_id: p.id,
      name: p.name,
      category: p.category,
      duration_weeks: p.duration_weeks,
      delivery_format: p.delivery_format,
      base_price: p.base_price,
      rating: p.rating,
      rating_count: p.rating_count,
      program: p // FK resolution (ID -> program)
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const tiersAll = this._getFromStorage('program_tiers');

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        tiers: [],
        start_date_constraints: {
          earliest_start_date: this._dateToISODateString(new Date()),
          latest_start_date: this._dateToISODateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        }
      };
    }

    const tiers = tiersAll
      .filter((t) => t.program_id === programId)
      .map((t) => ({
        tier_id: t.id,
        name: t.name,
        tier_type: t.tier_type,
        description: t.description,
        price: t.price,
        is_default: t.is_default
      }));

    const today = new Date();
    const earliest_start_date = this._dateToISODateString(today);
    const latest_start_date = this._dateToISODateString(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));

    return {
      program: {
        id: program.id,
        name: program.name,
        category: program.category,
        description: program.description,
        duration_weeks: program.duration_weeks,
        delivery_format: program.delivery_format,
        base_price: program.base_price,
        rating: program.rating,
        rating_count: program.rating_count,
        tags: program.tags || []
      },
      tiers,
      start_date_constraints: {
        earliest_start_date,
        latest_start_date
      }
    };
  }

  addProgramEnrollmentToCart(programId, programTierId, start_date) {
    const programs = this._getFromStorage('programs');
    const tiers = this._getFromStorage('program_tiers');
    const cartItems = this._getFromStorage('cart_items');

    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, cart_item_id: null, message: 'Program not found.' };
    }

    if (!this._validateProgramStartDate(program, start_date)) {
      return { success: false, cart_item_id: null, message: 'Invalid program start date.' };
    }

    let tier = null;
    if (programTierId) {
      tier = tiers.find((t) => t.id === programTierId && t.program_id === programId) || null;
      if (!tier) {
        return { success: false, cart_item_id: null, message: 'Selected tier not found for program.' };
      }
    } else {
      tier = tiers.find((t) => t.program_id === programId && t.is_default) || null;
    }

    const cart = this._getOrCreateCart();

    const unit_price = tier ? tier.price : program.base_price;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    const name_snapshot = program.name;
    const tierName = tier ? tier.name : 'Standard';
    const details_snapshot = `Program (${tierName}) starting ${start_date}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'program_enrollment',
      reference_id: program.id,
      consultation_time_slot_id: null,
      program_id: program.id,
      program_tier_id: tier ? tier.id : null,
      program_start_date: start_date ? new Date(start_date + 'T00:00:00').toISOString() : null,
      group_class_session_id: null,
      attendees: null,
      bundle_id: null,
      membership_plan_id: null,
      add_on_id: null,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring: false,
      billing_period: 'once',
      start_date: start_date ? new Date(start_date + 'T00:00:00').toISOString() : null,
      contact_name: null,
      contact_email: null,
      contact_phone: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Program enrollment added to cart.' };
  }

  // -------------------- Group Classes --------------------

  getClassScheduleFilterOptions() {
    const sessions = this._getFromStorage('group_class_sessions');
    const maxDurationSet = new Set();

    for (const s of sessions) {
      if (typeof s.duration_minutes === 'number') maxDurationSet.add(s.duration_minutes);
    }

    const time_of_day_ranges = [
      { key: 'morning', label: 'Morning', start_time: '06:00', end_time: '12:00' },
      { key: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '17:00' },
      { key: 'evening', label: 'Evening', start_time: '17:00', end_time: '21:00' }
    ];

    const intensities = [
      { value: 'low', label: 'Low' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' }
    ];

    const max_duration_options = Array.from(maxDurationSet).sort((a, b) => a - b);

    return { time_of_day_ranges, intensities, max_duration_options };
  }

  getClassSchedule(date, filters) {
    const f = filters || {};
    const sessionsAll = this._getFromStorage('group_class_sessions');
    const classes = this._getFromStorage('group_classes');

    // Filter by date first
    let sessions = sessionsAll.filter((s) => this._isSameDate(s.start_datetime, date));

    // Apply filters using generic helper
    sessions = this._findNextAvailableSlots('class', {
      sessions,
      filters: {
        start_time_from: f.start_time_from,
        start_time_to: f.start_time_to,
        intensity: f.intensity,
        max_duration_minutes: f.max_duration_minutes
      }
    });

    sessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const results = sessions.map((s) => {
      const cls = classes.find((c) => c.id === s.group_class_id) || {};
      return {
        group_class_session_id: s.id,
        class_name: cls.name || '',
        focus: cls.focus || s.focus,
        intensity: s.intensity,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: s.duration_minutes,
        remaining_spots: s.remaining_spots,
        capacity: s.capacity,
        // FK resolution
        group_class_session: s,
        group_class: cls
      };
    });

    return {
      date,
      sessions: results
    };
  }

  getClassSessionDetail(groupClassSessionId) {
    const sessions = this._getFromStorage('group_class_sessions');
    const classes = this._getFromStorage('group_classes');
    const coaches = this._getFromStorage('coaches');

    const s = sessions.find((x) => x.id === groupClassSessionId) || null;
    if (!s) {
      return { session: null, trainer: null };
    }

    const cls = classes.find((c) => c.id === s.group_class_id) || null;
    const trainer = cls ? coaches.find((c) => c.id === cls.trainer_id) || null : null;

    const session = {
      group_class_session_id: s.id,
      class_name: cls ? cls.name : '',
      focus: cls ? cls.focus : s.focus,
      intensity: s.intensity,
      description: cls ? cls.description : '',
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      duration_minutes: s.duration_minutes,
      remaining_spots: s.remaining_spots,
      capacity: s.capacity,
      location_room: s.location_room,
      price: s.price
    };

    const trainerObj = trainer
      ? {
          trainer_id: trainer.id,
          name: trainer.name,
          bio: trainer.bio,
          rating: trainer.rating
        }
      : null;

    return { session, trainer: trainerObj };
  }

  addClassSessionBookingToCart(groupClassSessionId, attendees, contact_name, contact_email, contact_phone) {
    const sessions = this._getFromStorage('group_class_sessions');
    const classes = this._getFromStorage('group_classes');
    const cartItems = this._getFromStorage('cart_items');

    const session = sessions.find((s) => s.id === groupClassSessionId);
    if (!session || session.is_cancelled || session.remaining_spots <= 0) {
      return { success: false, cart_item_id: null, message: 'Class session is not available.' };
    }

    if (attendees > session.remaining_spots) {
      return { success: false, cart_item_id: null, message: 'Not enough remaining spots for requested attendees.' };
    }

    const cls = classes.find((c) => c.id === session.group_class_id) || null;
    const cart = this._getOrCreateCart();

    const unit_price = typeof session.price === 'number' ? session.price : 0;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    const name_snapshot = cls ? cls.name : 'Group Class';
    const details_snapshot = `Class on ${session.start_datetime}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'class_session',
      reference_id: session.group_class_id,
      consultation_time_slot_id: null,
      program_id: null,
      program_tier_id: null,
      program_start_date: null,
      group_class_session_id: session.id,
      attendees: attendees,
      bundle_id: null,
      membership_plan_id: null,
      add_on_id: null,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring: false,
      billing_period: 'once',
      start_date: session.start_datetime,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Class session added to cart.' };
  }

  // -------------------- Training Planner --------------------

  getTrainingPlannerInitialState() {
    const week_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const default_start_time = '07:00';
    return { week_days, default_start_time };
  }

  getWorkoutTemplateFilterOptions() {
    const workout_types = [
      { value: 'cardio', label: 'Cardio' },
      { value: 'strength', label: 'Strength' },
      { value: 'mobility', label: 'Mobility' },
      { value: 'stretching', label: 'Stretching' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'conditioning', label: 'Conditioning' },
      { value: 'hiit', label: 'HIIT' },
      { value: 'other_workout', label: 'Other' }
    ];

    const duration_ranges_minutes = [
      { key: 'under_30', label: 'Under 30 minutes', min: 0, max: 29 },
      { key: '30_to_45', label: '30 to 45 minutes', min: 30, max: 45 },
      { key: 'over_20', label: '20 minutes or more', min: 20, max: 999 }
    ];

    const intensities = [
      { value: 'low', label: 'Low' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' }
    ];

    return { workout_types, duration_ranges_minutes, intensities };
  }

  searchWorkoutTemplates(filters, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const templates = this._getFromStorage('workout_templates').filter((t) => t.is_active);

    let results = templates;
    if (f.workout_type) {
      results = results.filter((t) => t.workout_type === f.workout_type);
    }
    if (typeof f.min_duration_minutes === 'number') {
      results = results.filter((t) => t.duration_minutes >= f.min_duration_minutes);
    }
    if (typeof f.max_duration_minutes === 'number') {
      results = results.filter((t) => t.duration_minutes <= f.max_duration_minutes);
    }
    if (f.intensity) {
      results = results.filter((t) => t.intensity === f.intensity);
    }

    const total = results.length;
    const start = (pg - 1) * size;
    const pageResults = results.slice(start, start + size).map((t) => ({
      workout_template_id: t.id,
      name: t.name,
      workout_type: t.workout_type,
      duration_minutes: t.duration_minutes,
      intensity: t.intensity,
      equipment_needed: t.equipment_needed,
      workout_template: t
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  saveTrainingPlan(plan_name, start_date, items) {
    if (!plan_name) {
      return { success: false, training_plan_id: null, message: 'Plan name is required.' };
    }

    const trainingPlans = this._getFromStorage('training_plans');
    const trainingPlanItems = this._getFromStorage('training_plan_items');
    const templates = this._getFromStorage('workout_templates');

    const planId = this._generateId('training_plan');
    const nowISO = this._nowISO();

    const plan = {
      id: planId,
      name: plan_name,
      created_at: nowISO,
      start_date: start_date ? new Date(start_date + 'T00:00:00').toISOString() : null,
      notes: null
    };

    trainingPlans.push(plan);

    let positionCounter = 1;
    if (Array.isArray(items)) {
      for (const it of items) {
        const wt = templates.find((t) => t.id === it.workout_template_id);
        if (!wt) continue;
        const item = {
          id: this._generateId('training_plan_item'),
          training_plan_id: planId,
          workout_template_id: wt.id,
          day_of_week: it.day_of_week,
          start_time: it.start_time,
          duration_minutes: wt.duration_minutes,
          position: positionCounter++
        };
        trainingPlanItems.push(item);
      }
    }

    this._saveToStorage('training_plans', trainingPlans);
    this._saveToStorage('training_plan_items', trainingPlanItems);

    return { success: true, training_plan_id: planId, message: 'Training plan saved.' };
  }

  // -------------------- Coaching Services & Nutrition Bundles --------------------

  getCoachingServicesOverview() {
    const categories = [
      {
        key: 'nutrition_coaching',
        title: 'Nutrition Coaching',
        description: 'Bundles and single sessions focused on fuelling, recovery, and everyday nutrition.'
      },
      {
        key: 'performance_coaching',
        title: 'Performance Coaching',
        description: 'Support for race preparation, strength, and performance planning.'
      },
      {
        key: 'wellbeing_coaching',
        title: 'Wellbeing Coaching',
        description: 'Stress management, sleep, and general wellbeing consultations.'
      }
    ];
    return { categories };
  }

  getNutritionBundleFilterOptions() {
    const product_types = [
      { value: 'bundle', label: 'Bundles' },
      { value: 'single_session', label: 'Single Sessions' },
      { value: 'subscription', label: 'Subscriptions' },
      { value: 'other_product_type', label: 'Other' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'total_minutes_high_to_low', label: 'Total Minutes: High to Low' }
    ];

    return { product_types, sort_options };
  }

  searchNutritionBundles(filters, sort, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let bundles = this._getFromStorage('nutrition_bundles');

    if (f.only_active !== false) {
      bundles = bundles.filter((b) => b.is_active);
    }
    if (f.product_type) {
      bundles = bundles.filter((b) => b.product_type === f.product_type);
    }
    if (typeof f.max_price === 'number') {
      bundles = bundles.filter((b) => b.price <= f.max_price);
    }

    if (sort === 'price_low_to_high') {
      bundles.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      bundles.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'total_minutes_high_to_low') {
      bundles.sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0));
    }

    const total = bundles.length;
    const start = (pg - 1) * size;
    const pageResults = bundles.slice(start, start + size).map((b) => ({
      bundle_id: b.id,
      name: b.name,
      product_type: b.product_type,
      num_sessions: b.num_sessions,
      minutes_per_session: b.minutes_per_session,
      total_minutes: b.total_minutes,
      price: b.price,
      is_active: b.is_active,
      bundle: b
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  getNutritionBundleDetail(bundleId) {
    const bundles = this._getFromStorage('nutrition_bundles');
    const coaches = this._getFromStorage('coaches');

    const bundle = bundles.find((b) => b.id === bundleId) || null;
    if (!bundle) {
      return { bundle: null, preferred_coaches: [], value_summary: { cost_per_minute: 0 } };
    }

    const preferred_coaches = (bundle.preferred_coach_ids || [])
      .map((cid) => coaches.find((c) => c.id === cid))
      .filter(Boolean)
      .map((c) => ({
        coach_id: c.id,
        name: c.name,
        role: c.role,
        coach: c
      }));

    const cost_per_minute = bundle.total_minutes ? bundle.price / bundle.total_minutes : 0;

    return {
      bundle: {
        id: bundle.id,
        name: bundle.name,
        description: bundle.description,
        product_type: bundle.product_type,
        num_sessions: bundle.num_sessions,
        minutes_per_session: bundle.minutes_per_session,
        total_minutes: bundle.total_minutes,
        price: bundle.price,
        start_window_description: bundle.start_window_description
      },
      preferred_coaches,
      value_summary: { cost_per_minute }
    };
  }

  addNutritionBundleToCart(bundleId, preferredCoachId, start_within_days) {
    const bundles = this._getFromStorage('nutrition_bundles');
    const cartItems = this._getFromStorage('cart_items');

    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle || !bundle.is_active) {
      return { success: false, cart_item_id: null, message: 'Nutrition bundle not available.' };
    }

    const cart = this._getOrCreateCart();

    const unit_price = bundle.price;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    let startDateISO = null;
    if (typeof start_within_days === 'number') {
      const base = new Date();
      const d = new Date(base.getTime() + start_within_days * 24 * 60 * 60 * 1000);
      startDateISO = d.toISOString();
    }

    const name_snapshot = bundle.name;
    const details_snapshot = bundle.start_window_description || 'Nutrition coaching bundle';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'nutrition_bundle',
      reference_id: bundle.id,
      consultation_time_slot_id: null,
      program_id: null,
      program_tier_id: null,
      program_start_date: null,
      group_class_session_id: null,
      attendees: null,
      bundle_id: bundle.id,
      membership_plan_id: null,
      add_on_id: null,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring: false,
      billing_period: 'once',
      start_date: startDateISO,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      preferred_coach_id: preferredCoachId || null,
      start_within_days: typeof start_within_days === 'number' ? start_within_days : null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Nutrition bundle added to cart.' };
  }

  // -------------------- Challenges --------------------

  getChallengeFilterOptions() {
    const challenges = this._getFromStorage('challenges').filter((c) => c.is_active);
    const durationsSet = new Set();
    for (const c of challenges) {
      if (typeof c.duration_days === 'number') durationsSet.add(c.duration_days);
    }

    const price_types = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' }
    ];

    const durations_days = Array.from(durationsSet).sort((a, b) => a - b);

    return { price_types, durations_days };
  }

  searchChallenges(filters, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let challenges = this._getFromStorage('challenges');

    if (f.only_active !== false) {
      challenges = challenges.filter((c) => c.is_active);
    }
    if (f.price_type) {
      challenges = challenges.filter((c) => c.price_type === f.price_type);
    }
    if (typeof f.duration_days === 'number') {
      challenges = challenges.filter((c) => c.duration_days === f.duration_days);
    }

    const total = challenges.length;
    const start = (pg - 1) * size;
    const pageResults = challenges.slice(start, start + size).map((c) => ({
      challenge_id: c.id,
      name: c.name,
      duration_days: c.duration_days,
      focus: c.focus,
      price_type: c.price_type,
      price: c.price,
      challenge: c
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges');
    const c = challenges.find((x) => x.id === challengeId) || null;
    if (!c) {
      return { challenge: null, available_themes: [] };
    }

    const themes = (c.default_themes || []).map((code) => ({
      theme_code: code,
      label: this._labelFromEnum(code)
    }));

    return {
      challenge: {
        id: c.id,
        name: c.name,
        description: c.description,
        duration_days: c.duration_days,
        focus: c.focus,
        price_type: c.price_type,
        price: c.price,
        delivery_channel: c.delivery_channel
      },
      available_themes: themes
    };
  }

  registerForChallenge(challengeId, first_name, email, start_date, preferred_email_time, selected_themes) {
    const challenges = this._getFromStorage('challenges');
    const regs = this._getFromStorage('challenge_registrations');

    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge || !challenge.is_active) {
      return { success: false, registration_id: null, challenge_name: null, start_date: null, preferred_email_time: null, selected_themes: [], message: 'Challenge not available.' };
    }

    if (!first_name || !email || !start_date || !preferred_email_time) {
      return { success: false, registration_id: null, challenge_name: null, start_date: null, preferred_email_time: null, selected_themes: [], message: 'Missing required fields.' };
    }

    const regId = this._generateId('challenge_reg');
    const created_at = this._nowISO();

    const reg = {
      id: regId,
      challenge_id: challenge.id,
      first_name,
      email,
      start_date: new Date(start_date + 'T00:00:00').toISOString(),
      preferred_email_time,
      selected_themes: Array.isArray(selected_themes) ? selected_themes : [],
      created_at
    };

    regs.push(reg);
    this._saveToStorage('challenge_registrations', regs);

    return {
      success: true,
      registration_id: regId,
      challenge_name: challenge.name,
      start_date,
      preferred_email_time,
      selected_themes: reg.selected_themes,
      message: 'Challenge registration submitted.'
    };
  }

  // -------------------- Articles & Reading List --------------------

  getArticleCategoryOptions() {
    const categoriesEnum = [
      'mental_resilience',
      'mindset',
      'nutrition',
      'fueling',
      'running',
      'recovery',
      'general_wellbeing',
      'other_article_category'
    ];

    const categories = categoriesEnum.map((value) => ({
      value,
      label: this._labelFromEnum(value)
    }));

    return { categories };
  }

  searchArticles(query, filters, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let articles = this._getFromStorage('articles').filter((a) => a.is_published);

    if (f.category) {
      articles = articles.filter((a) => a.category === f.category);
    }
    if (typeof f.max_read_time_minutes === 'number') {
      articles = articles.filter((a) => (a.estimated_read_time_minutes || 0) <= f.max_read_time_minutes);
    }
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      articles = articles.filter((a) => {
        const text = `${a.title || ''} ${a.summary || ''} ${a.content || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
        return tokens.every((tok) => text.includes(tok));
      });
    }

    // Sort newest first if dates exist
    articles.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at) : new Date(0);
      const db = b.published_at ? new Date(b.published_at) : new Date(0);
      return db - da;
    });

    const total = articles.length;
    const start = (pg - 1) * size;
    const pageResults = articles.slice(start, start + size).map((a) => ({
      article_id: a.id,
      title: a.title,
      summary: a.summary,
      category: a.category,
      tags: a.tags || [],
      estimated_read_time_minutes: a.estimated_read_time_minutes,
      article: a
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const readingList = this._getOrCreateReadingList();
    const is_saved_to_reading_list = readingList.article_ids.includes(articleId);

    if (!article) {
      return { article: null, is_saved_to_reading_list: false };
    }

    return {
      article: {
        id: article.id,
        title: article.title,
        summary: article.summary,
        content: article.content,
        category: article.category,
        tags: article.tags || [],
        estimated_read_time_minutes: article.estimated_read_time_minutes,
        published_at: article.published_at,
        author_name: article.author_name
      },
      is_saved_to_reading_list
    };
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const exists = articles.some((a) => a.id === articleId);
    if (!exists) {
      return { success: false, message: 'Article not found.' };
    }

    const lists = this._getFromStorage('reading_list');
    let list = lists[0] || null;
    if (!list) {
      list = this._getOrCreateReadingList();
    }

    if (!list.article_ids.includes(articleId)) {
      list.article_ids.push(articleId);
      list.updated_at = this._nowISO();
      lists[0] = list;
      this._saveToStorage('reading_list', lists);
    }

    return { success: true, message: 'Article saved to reading list.' };
  }

  getReadingListArticles() {
    const list = this._getOrCreateReadingList();
    const articlesAll = this._getFromStorage('articles');

    const articles = list.article_ids
      .map((id) => articlesAll.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        category: a.category,
        estimated_read_time_minutes: a.estimated_read_time_minutes,
        article: a
      }));

    return { articles };
  }

  // -------------------- Memberships & Add-ons --------------------

  getMembershipFilterOptions() {
    const billing_periods = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'annual', label: 'Annual' },
      { value: 'once', label: 'One-off' }
    ];

    const benefits = [
      { code: 'gym_access', label: 'Gym access' },
      { code: 'group_classes', label: 'Group classes' },
      { code: 'yoga_classes', label: 'Yoga classes' },
      { code: 'pool_access', label: 'Pool access' },
      { code: 'sauna_access', label: 'Sauna access' },
      { code: 'online_programs_access', label: 'Online programs access' },
      { code: 'other_benefit', label: 'Other' }
    ];

    return { billing_periods, benefits };
  }

  searchMembershipPlans(filters, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let plans = this._getFromStorage('membership_plans').filter((m) => m.is_active);

    if (f.billing_period) {
      plans = plans.filter((m) => m.billing_period === f.billing_period);
    }
    if (f.requires_gym_access) {
      plans = plans.filter((m) => m.includes_gym_access);
    }
    if (typeof f.max_price === 'number') {
      plans = plans.filter((m) => m.price <= f.max_price);
    }

    const total = plans.length;
    const start = (pg - 1) * size;
    const pageResults = plans.slice(start, start + size).map((m) => ({
      membership_plan_id: m.id,
      name: m.name,
      billing_period: m.billing_period,
      price: m.price,
      includes_gym_access: m.includes_gym_access,
      max_yoga_classes_per_week: m.max_yoga_classes_per_week,
      membership_plan: m
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const m = plans.find((p) => p.id === membershipPlanId) || null;

    if (!m) {
      return { membership: null };
    }

    return {
      membership: {
        id: m.id,
        name: m.name,
        description: m.description,
        billing_period: m.billing_period,
        price: m.price,
        benefits: m.benefits || [],
        includes_gym_access: m.includes_gym_access
      }
    };
  }

  addMembershipToCart(membershipPlanId, start_date) {
    const plans = this._getFromStorage('membership_plans');
    const cartItems = this._getFromStorage('cart_items');

    const plan = plans.find((p) => p.id === membershipPlanId && p.is_active);
    if (!plan) {
      return { success: false, cart_item_id: null, message: 'Membership plan not available.' };
    }

    const cart = this._getOrCreateCart();

    const unit_price = plan.price;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    const startDateISO = start_date ? new Date(start_date + 'T00:00:00').toISOString() : null;

    const name_snapshot = plan.name;
    const details_snapshot = `Membership (${this._labelFromEnum(plan.billing_period)} billing)`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'membership',
      reference_id: plan.id,
      consultation_time_slot_id: null,
      program_id: null,
      program_tier_id: null,
      program_start_date: null,
      group_class_session_id: null,
      attendees: null,
      bundle_id: null,
      membership_plan_id: plan.id,
      add_on_id: null,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring: true,
      billing_period: plan.billing_period,
      start_date: startDateISO,
      contact_name: null,
      contact_email: null,
      contact_phone: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Membership added to cart.' };
  }

  getYogaAddOnFilterOptions() {
    const billing_periods = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'annual', label: 'Annual' },
      { value: 'once', label: 'One-off' }
    ];

    const addOns = this._getFromStorage('add_ons').filter((a) => a.is_active && a.category === 'yoga');
    const clsSet = new Set();
    for (const a of addOns) {
      if (typeof a.classes_per_week === 'number') clsSet.add(a.classes_per_week);
    }
    const min_classes_per_week_options = Array.from(clsSet).sort((a, b) => a - b);

    return { billing_periods, min_classes_per_week_options };
  }

  searchYogaAddOns(filters, page, page_size) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let addOns = this._getFromStorage('add_ons').filter((a) => a.is_active && a.category === 'yoga');

    if (f.billing_period) {
      addOns = addOns.filter((a) => a.billing_period === f.billing_period);
    }
    if (typeof f.min_classes_per_week === 'number') {
      addOns = addOns.filter((a) => (a.classes_per_week || 0) >= f.min_classes_per_week);
    }

    const total = addOns.length;
    const start = (pg - 1) * size;
    const pageResults = addOns.slice(start, start + size).map((a) => ({
      add_on_id: a.id,
      name: a.name,
      billing_period: a.billing_period,
      classes_per_week: a.classes_per_week,
      price: a.price,
      add_on: a
    }));

    return {
      results: pageResults,
      total,
      page: pg,
      page_size: size
    };
  }

  addAddOnToCart(addOnId, start_date) {
    const addOns = this._getFromStorage('add_ons');
    const cartItems = this._getFromStorage('cart_items');

    const addOn = addOns.find((a) => a.id === addOnId && a.is_active);
    if (!addOn) {
      return { success: false, cart_item_id: null, message: 'Add-on not available.' };
    }

    const cart = this._getOrCreateCart();

    const unit_price = addOn.price;
    const quantity = 1;
    const subtotal_price = unit_price * quantity;

    const startDateISO = start_date ? new Date(start_date + 'T00:00:00').toISOString() : null;

    const name_snapshot = addOn.name;
    const details_snapshot = `Add-on (${this._labelFromEnum(addOn.billing_period)} billing)`;

    const is_recurring = addOn.billing_period !== 'once';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'add_on',
      reference_id: addOn.id,
      consultation_time_slot_id: null,
      program_id: null,
      program_tier_id: null,
      program_start_date: null,
      group_class_session_id: null,
      attendees: null,
      bundle_id: null,
      membership_plan_id: null,
      add_on_id: addOn.id,
      name_snapshot,
      details_snapshot,
      unit_price,
      quantity,
      subtotal_price,
      is_recurring,
      billing_period: addOn.billing_period,
      start_date: startDateISO,
      contact_name: null,
      contact_email: null,
      contact_phone: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Add-on added to cart.' };
  }

  // -------------------- Cart & Checkout --------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const services = this._getFromStorage('consultation_services');
    const slots = this._getFromStorage('consultation_time_slots');
    const programs = this._getFromStorage('programs');
    const tiers = this._getFromStorage('program_tiers');
    const classSessions = this._getFromStorage('group_class_sessions');
    const classes = this._getFromStorage('group_classes');
    const bundles = this._getFromStorage('nutrition_bundles');
    const membershipPlans = this._getFromStorage('membership_plans');
    const addOns = this._getFromStorage('add_ons');

    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);

    const items = cartItems.map((ci) => {
      let details = ci.details_snapshot || '';
      let start_date = ci.start_date || null;

      let consultation_time_slot = null;
      let consultation_service = null;
      let group_class_session = null;
      let group_class = null;
      let program = null;
      let program_tier = null;
      let bundle = null;
      let membership_plan = null;
      let add_on = null;

      if (ci.item_type === 'consultation' && ci.consultation_time_slot_id) {
        consultation_time_slot = slots.find((s) => s.id === ci.consultation_time_slot_id) || null;
        if (consultation_time_slot) {
          consultation_service = services.find((s) => s.id === consultation_time_slot.consultation_service_id) || null;
          start_date = consultation_time_slot.start_datetime;
          if (!details) {
            details = `Consultation on ${consultation_time_slot.start_datetime}`;
          }
        }
      } else if (ci.item_type === 'class_session' && ci.group_class_session_id) {
        group_class_session = classSessions.find((s) => s.id === ci.group_class_session_id) || null;
        if (group_class_session) {
          group_class = classes.find((c) => c.id === group_class_session.group_class_id) || null;
          start_date = group_class_session.start_datetime;
          if (!details) {
            details = `Class on ${group_class_session.start_datetime}`;
          }
        }
      } else if (ci.item_type === 'program_enrollment' && ci.program_id) {
        program = programs.find((p) => p.id === ci.program_id) || null;
        if (ci.program_tier_id) {
          program_tier = tiers.find((t) => t.id === ci.program_tier_id) || null;
        }
        if (!details && program) {
          details = `Program enrollment (${program_tier ? program_tier.name : 'Standard'})`;
        }
      } else if (ci.item_type === 'nutrition_bundle' && ci.bundle_id) {
        bundle = bundles.find((b) => b.id === ci.bundle_id) || null;
        if (!details && bundle) {
          details = bundle.start_window_description || 'Nutrition bundle';
        }
      } else if (ci.item_type === 'membership' && ci.membership_plan_id) {
        membership_plan = membershipPlans.find((m) => m.id === ci.membership_plan_id) || null;
        if (!details && membership_plan) {
          details = `Membership (${this._labelFromEnum(membership_plan.billing_period)} billing)`;
        }
      } else if (ci.item_type === 'add_on' && ci.add_on_id) {
        add_on = addOns.find((a) => a.id === ci.add_on_id) || null;
        if (!details && add_on) {
          details = `Add-on (${this._labelFromEnum(add_on.billing_period)} billing)`;
        }
      }

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        name: ci.name_snapshot,
        details,
        attendees: ci.attendees || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        subtotal_price: ci.subtotal_price,
        is_recurring: ci.is_recurring,
        billing_period: ci.billing_period || null,
        start_date,
        // FK resolution
        cart_item: ci,
        consultation_time_slot,
        consultation_service,
        group_class_session,
        group_class,
        program,
        program_tier,
        bundle,
        membership_plan,
        add_on
      };
    });

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      items,
      subtotal_one_off: totals.subtotal_one_off,
      subtotal_recurring_monthly: totals.subtotal_recurring_monthly,
      total_price: totals.total_price,
      currency: 'USD'
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.' };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    cart.items = (cart.items || []).filter((id) => id !== cartItemId);
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, message: 'Cart item removed.' };
  }

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);

    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      item_type: ci.item_type,
      name: ci.name_snapshot,
      details: ci.details_snapshot || '',
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      subtotal_price: ci.subtotal_price,
      is_recurring: ci.is_recurring,
      billing_period: ci.billing_period || null,
      cart_item: ci
    }));

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      items,
      subtotal_one_off: totals.subtotal_one_off,
      subtotal_recurring_monthly: totals.subtotal_recurring_monthly,
      total_price: totals.total_price,
      currency: 'USD'
    };
  }

  placeOrder(full_name, email, phone, billing_address, payment_method, notes) {
    if (!full_name || !email) {
      return { success: false, order_id: null, status: 'pending', message: 'Name and email are required.' };
    }

    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order_id: null, status: 'pending', message: 'Cart is empty.' };
    }

    const totals = this._calculateCartTotals(cart, cartItems);

    const orderId = this._generateId('order');
    const created_at = this._nowISO();
    const updated_at = created_at;

    const orderItemIds = [];
    for (const ci of cartItems) {
      const oiId = this._generateId('order_item');
      const oi = {
        id: oiId,
        order_id: orderId,
        item_type: ci.item_type,
        reference_id: ci.reference_id,
        name_snapshot: ci.name_snapshot,
        details_snapshot: ci.details_snapshot,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        subtotal_price: ci.subtotal_price,
        is_recurring: ci.is_recurring,
        billing_period: ci.billing_period || null,
        start_date: ci.start_date || null
      };
      orderItems.push(oi);
      orderItemIds.push(oiId);
    }

    const order = {
      id: orderId,
      cart_id: cart.id,
      created_at,
      updated_at,
      status: 'pending',
      total_price: totals.total_price,
      subtotal_one_off: totals.subtotal_one_off,
      subtotal_recurring_monthly: totals.subtotal_recurring_monthly,
      items: orderItemIds,
      full_name,
      email,
      phone: phone || null,
      billing_address: billing_address || null,
      payment_method: payment_method || null,
      payment_status: 'pending',
      notes: notes || null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart after order placement
    cart.items = [];
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return { success: true, order_id: orderId, status: order.status, message: 'Order placed.' };
  }

  // -------------------- About & Contact --------------------

  getAboutPageContent() {
    const coaches = this._getFromStorage('coaches');

    const coachSummaries = coaches.map((c) => ({
      coach_id: c.id,
      name: c.name,
      role: c.role,
      bio_short: c.bio ? String(c.bio).slice(0, 160) : '' ,
      coach: c
    }));

    const mission = 'Helping athletes and everyday movers perform better and feel better through integrated coaching.';
    const philosophy = 'We combine sports science, practical coaching, and wellbeing tools to build sustainable performance.';
    const contact_email = 'info@example.com';
    const contact_phone = '+1-000-000-0000';
    const faqs_summary = 'Visit our FAQ section for details on bookings, memberships, and online programs.';

    return { mission, philosophy, coaches: coachSummaries, contact_email, contact_phone, faqs_summary };
  }

  submitContactInquiry(name, email, phone, subject, message) {
    if (!email || !message) {
      return { success: false, inquiry_id: null, message: 'Email and message are required.' };
    }

    const inquiries = this._getFromStorage('contact_inquiries');
    const id = this._generateId('contact');
    const created_at = this._nowISO();

    const inquiry = {
      id,
      name: name || null,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      created_at,
      handled: false
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return { success: true, inquiry_id: id, message: 'Inquiry submitted.' };
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
