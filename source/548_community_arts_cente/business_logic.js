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
    const arrayKeys = [
      'programs',
      'program_sessions',
      'program_categories',
      'instructors',
      'instructor_follows',
      'membership_plans',
      'membership_purchases',
      'performances',
      'venues',
      'venue_sections',
      'seats',
      'performance_seat_availabilities',
      'ticket_groups',
      'events',
      'rsvps',
      'donation_funds',
      'donations',
      'pass_purchases',
      'pass_usages',
      'enrollments',
      'cart_items',
      'orders',
      'payments',
      'wishlists',
      'wishlist_items',
      'contact_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Cart table (we store as array of carts, single-user scenario)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', JSON.stringify([]));
    }

    // Static content objects
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          mission: '',
          history: '',
          facilities: '',
          hours: '',
          policies: ''
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          address_line1: '',
          city: '',
          state: '',
          postal_code: '',
          phone: '',
          email: '',
          map_embed: ''
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _getDescendantCategoryIds(categoryId) {
    const categories = this._getFromStorage('program_categories', []);
    const result = new Set([categoryId]);
    let added = true;
    while (added) {
      added = false;
      categories.forEach((cat) => {
        if (cat.parent_category_id && result.has(cat.parent_category_id) && !result.has(cat.id)) {
          result.add(cat.id);
          added = true;
        }
      });
    }
    return Array.from(result);
  }

  // ---- Private helpers for Cart & Wishlist ----

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let cartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (cartId) {
      cart = carts.find((c) => c.id === cartId) || null;
    }

    if (!cart) {
      const newCart = {
        id: this._generateId('cart'),
        item_ids: [],
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(newCart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', newCart.id);
      cart = newCart;
    }

    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    const subtotal = cartItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    cart.subtotal = subtotal;
    cart.item_count = cartItems.length;
    cart.updated_at = this._now();
    if (!cart.currency) cart.currency = 'USD';
    this._saveCart(cart);
    return { subtotal, itemCount: cartItems.length, currency: cart.currency };
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists', []);
    let wishlistId = localStorage.getItem('current_wishlist_id');
    let wishlist = null;

    if (wishlistId) {
      wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    }

    if (!wishlist) {
      const newWishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(newWishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('current_wishlist_id', newWishlist.id);
      wishlist = newWishlist;
    }

    return wishlist;
  }

  _saveWishlist(wishlist) {
    const wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  // ---- Helper for pass usage ----

  _createOrUpdatePassUsageForEnrollment(enrollment) {
    if (!enrollment || enrollment.payment_method !== 'class_pass' || !enrollment.pass_purchase_id) {
      return;
    }

    const passPurchases = this._getFromStorage('pass_purchases', []);
    const passPurchase = passPurchases.find((p) => p.id === enrollment.pass_purchase_id);
    if (!passPurchase) return;

    const usesConsumed = enrollment.quantity || 1;
    const remaining = typeof passPurchase.remaining_uses === 'number'
      ? passPurchase.remaining_uses
      : passPurchase.total_uses;

    const newRemaining = Math.max(0, remaining - usesConsumed);
    passPurchase.remaining_uses = newRemaining;

    const passUsages = this._getFromStorage('pass_usages', []);
    const usage = {
      id: this._generateId('pass_usage'),
      pass_purchase_id: passPurchase.id,
      program_id: enrollment.program_id,
      enrollment_id: enrollment.id,
      usage_date: this._now(),
      uses_consumed: usesConsumed
    };
    passUsages.push(usage);

    // Save back
    const updatedPassPurchases = passPurchases.map((p) => (p.id === passPurchase.id ? passPurchase : p));
    this._saveToStorage('pass_purchases', updatedPassPurchases);
    this._saveToStorage('pass_usages', passUsages);
  }

  // ---- Helper for seat reservation ----

  _reserveSeatsForPerformance(performanceId, seatIds, priceTier) {
    const performances = this._getFromStorage('performances', []);
    const performance = performances.find((p) => p.id === performanceId);
    if (!performance) {
      return { success: false, message: 'Performance not found.' };
    }

    const seats = this._getFromStorage('seats', []);
    const availabilities = this._getFromStorage('performance_seat_availabilities', []);

    const selectedSeats = seatIds
      .map((id) => seats.find((s) => s.id === id))
      .filter((s) => !!s);

    if (selectedSeats.length !== seatIds.length) {
      return { success: false, message: 'One or more seats not found.' };
    }

    const selectedAvailabilities = seatIds.map((id) =>
      availabilities.find((a) => a.performance_id === performanceId && a.seat_id === id)
    );

    if (selectedAvailabilities.some((a) => !a)) {
      return { success: false, message: 'Seat availability not found for one or more seats.' };
    }

    if (selectedAvailabilities.some((a) => !a.is_available)) {
      return { success: false, message: 'One or more selected seats are no longer available.' };
    }

    const tiers = new Set(selectedAvailabilities.map((a) => a.price_tier));
    if (tiers.size > 1) {
      return { success: false, message: 'Selected seats must all be in the same price tier.' };
    }

    const actualTier = tiers.values().next().value;
    if (priceTier && priceTier !== actualTier) {
      return { success: false, message: 'Selected seats do not match required price tier.' };
    }

    // Adjacency check: same section and row, contiguous position_index
    const firstSeat = selectedSeats[0];
    const sameRowSameSection = selectedSeats.every(
      (s) => s.section_id === firstSeat.section_id && s.row_label === firstSeat.row_label
    );
    if (!sameRowSameSection) {
      return { success: false, message: 'Seats must be in the same row and section.' };
    }

    const sortedByPosition = [...selectedSeats].sort((a, b) => {
      const pa = typeof a.position_index === 'number' ? a.position_index : parseInt(a.position_index || '0', 10);
      const pb = typeof b.position_index === 'number' ? b.position_index : parseInt(b.position_index || '0', 10);
      return pa - pb;
    });

    for (let i = 1; i < sortedByPosition.length; i++) {
      const prevPos = typeof sortedByPosition[i - 1].position_index === 'number'
        ? sortedByPosition[i - 1].position_index
        : parseInt(sortedByPosition[i - 1].position_index || '0', 10);
      const currPos = typeof sortedByPosition[i].position_index === 'number'
        ? sortedByPosition[i].position_index
        : parseInt(sortedByPosition[i].position_index || '0', 10);
      if (currPos !== prevPos + 1) {
        return { success: false, message: 'Selected seats must be adjacent.' };
      }
    }

    // Mark seats as no longer available (reserved)
    const updatedAvailabilities = availabilities.map((a) => {
      if (a.performance_id === performanceId && seatIds.includes(a.seat_id)) {
        return { ...a, is_available: false };
      }
      return a;
    });

    this._saveToStorage('performance_seat_availabilities', updatedAvailabilities);

    return { success: true, message: 'Seats reserved successfully.', priceTier: actualTier };
  }

  // ---- Helper for membership benefits ----

  _applyMembershipBenefitsToOrder(cartItems) {
    // Basic implementation: no discounts applied yet; simply sum totals.
    // This can be extended to apply membership-based discounts.
    const total = cartItems.reduce((sum, ci) => sum + (ci.total_price || 0), 0);
    return { total_amount: total, discounts: [] };
  }

  // =====================================================================
  // INTERFACES IMPLEMENTATION
  // =====================================================================

  // ---------------- Homepage ----------------

  getHomepageHighlights() {
    const programs = this._getFromStorage('programs', []);
    const performances = this._getFromStorage('performances', []);
    const events = this._getFromStorage('events', []);
    const memberships = this._getFromStorage('membership_plans', []);
    const donationFunds = this._getFromStorage('donation_funds', []);

    const featured_programs = programs.slice(0, 5);
    const featured_performances = performances.slice(0, 5);
    const featured_events = events.slice(0, 5);
    const featured_memberships = memberships.slice(0, 5);
    const featured_donation_funds = donationFunds.slice(0, 5);

    const quick_actions = [
      { action_key: 'book_class', label: 'Book a Class', context: 'classes' },
      { action_key: 'workshops_events', label: 'Workshops & Events', context: 'workshops_events' },
      { action_key: 'buy_membership', label: 'Become a Member', context: 'membership' },
      { action_key: 'make_donation', label: 'Support Scholarships', context: 'donation' }
    ];

    return {
      featured_programs,
      featured_performances,
      featured_events,
      featured_memberships,
      featured_donation_funds,
      quick_actions
    };
  }

  // ---------------- Programs & Classes ----------------

  getProgramFilterOptions(programType) {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);

    const program_types = Array.from(
      new Set(programs.map((p) => p.program_type).filter((v) => !!v))
    );

    const skill_levels = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const time_of_day_options = ['morning', 'afternoon', 'evening', 'all_day'];
    const time_window_options = ['standard', 'after_school', 'evening_after_5pm'];
    const day_of_week_options = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];
    const rating_thresholds = [4.0, 4.5];
    const price_suggestions = [50, 100, 150];

    const age_ranges = [
      { label: 'Ages 5-7', min: 5, max: 7 },
      { label: 'Ages 8-10', min: 8, max: 10 },
      { label: 'Ages 11-13', min: 11, max: 13 },
      { label: 'Ages 14-17', min: 14, max: 17 }
    ];

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'start_date_soonest_first', label: 'Start Date: Soonest First' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      program_types,
      categories,
      skill_levels,
      time_of_day_options,
      time_window_options,
      day_of_week_options,
      rating_thresholds,
      price_suggestions,
      age_ranges,
      sort_options
    };
  }

  searchPrograms(filters, sortBy, page = 1, pageSize = 20) {
    const allPrograms = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);

    let programs = allPrograms.slice();
    const f = filters || {};

    if (f.programType) {
      programs = programs.filter((p) => p.program_type === f.programType);
    }

    if (f.categoryId) {
      const allowedIds = this._getDescendantCategoryIds(f.categoryId);
      programs = programs.filter((p) => !p.category_id || allowedIds.includes(p.category_id));
    }

    if (f.skillLevel) {
      programs = programs.filter((p) => p.skill_level === f.skillLevel);
    }

    if (typeof f.ageMin === 'number' || typeof f.ageMax === 'number') {
      const ageMin = typeof f.ageMin === 'number' ? f.ageMin : null;
      const ageMax = typeof f.ageMax === 'number' ? f.ageMax : null;
      programs = programs.filter((p) => {
        const pMin = typeof p.age_min === 'number' ? p.age_min : null;
        const pMax = typeof p.age_max === 'number' ? p.age_max : null;
        if (ageMin !== null && ageMax !== null && pMin !== null && pMax !== null) {
          return pMin <= ageMax && pMax >= ageMin;
        }
        if (ageMin !== null && pMax !== null) {
          return pMax >= ageMin;
        }
        if (ageMax !== null && pMin !== null) {
          return pMin <= ageMax;
        }
        return true;
      });
    }

    if (f.dateStart || f.dateEnd) {
      const start = this._parseDate(f.dateStart);
      const end = this._parseDate(f.dateEnd);
      programs = programs.filter((p) => {
        const ps = this._parseDate(p.start_date);
        if (!ps) return false;
        if (start && ps < start) return false;
        if (end && ps > end) return false;
        return true;
      });
    }

    if (f.timeOfDay) {
      programs = programs.filter((p) => !p.time_of_day || p.time_of_day === f.timeOfDay);
    }

    if (f.timeWindow) {
      programs = programs.filter((p) => !p.time_window || p.time_window === f.timeWindow);
    }

    if (f.meetingDays && Array.isArray(f.meetingDays) && f.meetingDays.length > 0) {
      programs = programs.filter((p) => {
        const days = p.meeting_days || [];
        return f.meetingDays.some((d) => days.includes(d));
      });
    }

    if (typeof f.priceMin === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price >= f.priceMin);
    }

    if (typeof f.priceMax === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price <= f.priceMax);
    }

    if (typeof f.ratingMin === 'number') {
      programs = programs.filter(
        (p) => typeof p.rating === 'number' && p.rating >= f.ratingMin
      );
    }

    if (typeof f.durationWeeksMin === 'number') {
      programs = programs.filter(
        (p) => typeof p.duration_weeks === 'number' && p.duration_weeks >= f.durationWeeksMin
      );
    }

    if (typeof f.isFree === 'boolean') {
      programs = programs.filter((p) => {
        if (f.isFree) {
          return p.is_free === true || p.price === 0;
        }
        return p.is_free === false && p.price > 0;
      });
    }

    if (sortBy) {
      if (sortBy === 'price_low_to_high') {
        programs.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'price_high_to_low') {
        programs.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'start_date_soonest_first') {
        programs.sort((a, b) => {
          const da = this._parseDate(a.start_date) || new Date(8640000000000000);
          const db = this._parseDate(b.start_date) || new Date(8640000000000000);
          return da - db;
        });
      } else if (sortBy === 'rating_high_to_low') {
        programs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    }

    const total = programs.length;
    const startIndex = (page - 1) * pageSize;
    const pagedResults = programs.slice(startIndex, startIndex + pageSize);

    return {
      results: pagedResults,
      total,
      page,
      pageSize
    };
  }

  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);
    const instructors = this._getFromStorage('instructors', []);
    const sessions = this._getFromStorage('program_sessions', []);

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        category: null,
        instructor: null,
        upcoming_sessions: [],
        is_pass_product: false,
        available_spots: 0,
        related_programs: []
      };
    }

    const category = program.category_id
      ? categories.find((c) => c.id === program.category_id) || null
      : null;
    const instructor = program.instructor_id
      ? instructors.find((i) => i.id === program.instructor_id) || null
      : null;

    const upcoming_sessions = (program.upcoming_session_ids || [])
      .map((sid) => sessions.find((s) => s.id === sid))
      .filter((s) => !!s);

    const is_pass_product = !!program.is_pass_product;
    const available_spots = typeof program.remaining_spots === 'number'
      ? program.remaining_spots
      : (typeof program.max_participants === 'number' ? program.max_participants : 0);

    const related_programs = programs.filter((p) =>
      p.id !== program.id && p.category_id && program.category_id && p.category_id === program.category_id
    );

    return {
      program,
      category,
      instructor,
      upcoming_sessions,
      is_pass_product,
      available_spots,
      related_programs
    };
  }

  getPassesEligibleForProgram(programId) {
    const programs = this._getFromStorage('programs', []);
    const passPurchases = this._getFromStorage('pass_purchases', []);

    const program = programs.find((p) => p.id === programId);
    if (!program) return [];

    const eligible = passPurchases.filter((pp) => {
      if (typeof pp.remaining_uses === 'number' && pp.remaining_uses <= 0) {
        return false;
      }
      const passProgram = programs.find((p) => p.id === pp.pass_program_id);
      // If no associated pass program is found, treat this as a generic class pass usable for any program.
      if (passProgram && !passProgram.is_pass_product) return false;

      if (passProgram && passProgram.allowed_program_type && passProgram.allowed_program_type !== program.program_type) {
        return false;
      }

      if (passProgram && Array.isArray(passProgram.allowed_category_ids) && passProgram.allowed_category_ids.length > 0) {
        const allowedCatIds = new Set(passProgram.allowed_category_ids);
        if (program.category_id && !allowedCatIds.has(program.category_id)) {
          return false;
        }
      }

      if (pp.expiry_date) {
        const exp = this._parseDate(pp.expiry_date);
        if (exp && exp < new Date()) return false;
      }

      return true;
    });

    return eligible;
  }

  addProgramEnrollmentToCart(
    programId,
    participantName,
    participantType,
    childAge,
    quantity = 1,
    programSessionId,
    selectedStartDate,
    paymentMethod,
    passPurchaseId
  ) {
    const programs = this._getFromStorage('programs', []);
    const sessions = this._getFromStorage('program_sessions', []);

    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, enrollment: null, cart: null, cart_item: null, message: 'Program not found.' };
    }

    if (participantType === 'child' && (childAge === null || childAge === undefined)) {
      return {
        success: false,
        enrollment: null,
        cart: null,
        cart_item: null,
        message: 'Child age is required for child enrollment.'
      };
    }

    if (paymentMethod === 'class_pass' && !passPurchaseId) {
      return {
        success: false,
        enrollment: null,
        cart: null,
        cart_item: null,
        message: 'Pass purchase ID is required when using class pass.'
      };
    }

    let session = null;
    if (programSessionId) {
      session = sessions.find((s) => s.id === programSessionId) || null;
    }

    let pricePerParticipant = 0;
    if (paymentMethod === 'standard_payment') {
      pricePerParticipant = typeof program.price === 'number' ? program.price : 0;
    } else if (paymentMethod === 'class_pass') {
      pricePerParticipant = 0;
    } else if (paymentMethod === 'free') {
      pricePerParticipant = 0;
    }

    const totalPrice = pricePerParticipant * quantity;

    const enrollment = {
      id: this._generateId('enrollment'),
      program_id: program.id,
      program_session_id: session ? session.id : null,
      participant_name: participantName || '',
      participant_type: participantType,
      child_age: participantType === 'child' ? childAge : null,
      quantity: quantity,
      selected_start_date: selectedStartDate || null,
      payment_method: paymentMethod,
      pass_purchase_id: paymentMethod === 'class_pass' ? passPurchaseId : null,
      price_per_participant: pricePerParticipant,
      total_price: totalPrice,
      status: 'reserved'
    };

    const enrollments = this._getFromStorage('enrollments', []);
    enrollments.push(enrollment);
    this._saveToStorage('enrollments', enrollments);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'program_enrollment',
      reference_id: enrollment.id,
      display_name: program.title || 'Program Enrollment',
      quantity: quantity,
      unit_price: pricePerParticipant,
      total_price: totalPrice,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    this._calculateCartTotals(cart);

    return { success: true, enrollment, cart, cart_item: cartItem, message: 'Enrollment added to cart.' };
  }

  addPassProgramToCart(programId, quantity = 1) {
    const programs = this._getFromStorage('programs', []);
    const passProgram = programs.find((p) => p.id === programId && p.is_pass_product);
    if (!passProgram) {
      return { success: false, pass_purchase: null, cart: null, cart_item: null, message: 'Pass program not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const passPurchases = this._getFromStorage('pass_purchases', []);

    const totalUsesPerPass = typeof passProgram.pass_total_uses === 'number'
      ? passProgram.pass_total_uses
      : 0;

    const passPurchase = {
      id: this._generateId('pass_purchase'),
      pass_program_id: passProgram.id,
      pass_name: passProgram.title || 'Class Pass',
      total_uses: totalUsesPerPass * quantity,
      remaining_uses: totalUsesPerPass * quantity,
      purchase_date: this._now(),
      expiry_date: null
    };

    passPurchases.push(passPurchase);
    this._saveToStorage('pass_purchases', passPurchases);

    const unitPrice = typeof passProgram.price === 'number' ? passProgram.price : 0;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'pass_purchase',
      reference_id: passPurchase.id,
      display_name: passProgram.title || 'Class Pass',
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    this._calculateCartTotals(cart);

    return { success: true, pass_purchase: passPurchase, cart, cart_item: cartItem, message: 'Pass added to cart.' };
  }

  addProgramToWishlist(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { wishlist: this._getOrCreateWishlist(), wishlist_item: null };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    // Prevent duplicate entries for same program
    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.item_type === 'program' && wi.reference_id === programId
    );
    if (existing) {
      return { wishlist, wishlist_item: existing };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      item_type: 'program',
      reference_id: programId,
      added_at: this._now()
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    wishlist.item_ids = wishlist.item_ids || [];
    wishlist.item_ids.push(wishlistItem.id);
    wishlist.updated_at = this._now();
    this._saveWishlist(wishlist);

    return { wishlist, wishlist_item: wishlistItem };
  }

  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const programs = this._getFromStorage('programs', []);
    const instructors = this._getFromStorage('instructors', []);

    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    const items = itemsForWishlist.map((wi) => {
      let program = null;
      let instructor = null;
      if (wi.item_type === 'program') {
        program = programs.find((p) => p.id === wi.reference_id) || null;
      } else if (wi.item_type === 'instructor') {
        instructor = instructors.find((i) => i.id === wi.reference_id) || null;
      }
      return { wishlist_item: wi, program, instructor };
    });

    return { wishlist, items };
  }

  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const exists = wishlistItems.some((wi) => wi.id === wishlistItemId);
    if (!exists) {
      return { success: false, wishlist };
    }

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    wishlist.item_ids = (wishlist.item_ids || []).filter((id) => id !== wishlistItemId);
    wishlist.updated_at = this._now();
    this._saveWishlist(wishlist);

    return { success: true, wishlist };
  }

  // ---------------- Performances & Tickets ----------------

  getPerformanceFilterOptions() {
    const performances = this._getFromStorage('performances', []);

    const categories = Array.from(
      new Set(performances.map((p) => p.category).filter((v) => !!v))
    );

    const day_of_week_options = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const monthSet = new Set();
    performances.forEach((p) => {
      const d = this._parseDate(p.start_datetime);
      if (d) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthKey);
      }
    });
    const month_options = Array.from(monthSet);

    const sort_options = [
      { key: 'date_soonest_first', label: 'Date: Soonest First' }
    ];

    return { categories, day_of_week_options, month_options, sort_options };
  }

  searchPerformances(filters, sortBy, page = 1, pageSize = 20) {
    const performances = this._getFromStorage('performances', []);
    const f = filters || {};

    let results = performances.slice();

    if (f.category) {
      results = results.filter((p) => p.category === f.category);
    }

    if (f.month) {
      results = results.filter((p) => {
        const d = this._parseDate(p.start_datetime);
        if (!d) return false;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === f.month;
      });
    }

    if (f.dateStart || f.dateEnd) {
      const start = this._parseDate(f.dateStart);
      const end = this._parseDate(f.dateEnd);
      results = results.filter((p) => {
        const d = this._parseDate(p.start_datetime);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (Array.isArray(f.dayOfWeek) && f.dayOfWeek.length > 0) {
      const daySet = new Set(f.dayOfWeek);
      results = results.filter((p) => p.day_of_week && daySet.has(p.day_of_week));
    }

    if (f.timeOfDay) {
      results = results.filter((p) => {
        const d = this._parseDate(p.start_datetime);
        if (!d) return false;
        const hour = d.getHours();
        if (f.timeOfDay === 'evening') {
          return hour >= 17;
        }
        return true;
      });
    }

    if (sortBy === 'date_soonest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const db = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return da - db;
      });
    }

    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const pagedResults = results.slice(startIndex, startIndex + pageSize);

    return { results: pagedResults, total, page, pageSize };
  }

  getPerformanceDetails(performanceId) {
    const performances = this._getFromStorage('performances', []);
    const venues = this._getFromStorage('venues', []);

    const performance = performances.find((p) => p.id === performanceId) || null;
    if (!performance) {
      return { performance: null, venue: null, price_tiers: [] };
    }

    const venue = performance.venue_id
      ? venues.find((v) => v.id === performance.venue_id) || null
      : null;

    const price_tiers = [];
    if (typeof performance.base_price_low === 'number') {
      price_tiers.push({ tier: 'low', base_price: performance.base_price_low });
    }
    if (typeof performance.base_price_middle === 'number') {
      price_tiers.push({ tier: 'middle', base_price: performance.base_price_middle });
    }
    if (typeof performance.base_price_high === 'number') {
      price_tiers.push({ tier: 'high', base_price: performance.base_price_high });
    }

    return { performance, venue, price_tiers };
  }

  getSeatMapForPerformance(performanceId) {
    const performances = this._getFromStorage('performances', []);
    const perf = performances.find((p) => p.id === performanceId) || null;
    const venues = this._getFromStorage('venues', []);
    const sectionsAll = this._getFromStorage('venue_sections', []);
    const seatsAll = this._getFromStorage('seats', []);
    const availabilities = this._getFromStorage('performance_seat_availabilities', []);

    if (!perf) {
      return { venue: null, sections: [] };
    }

    const venue = perf.venue_id
      ? venues.find((v) => v.id === perf.venue_id) || null
      : null;

    if (!venue) {
      return { venue: null, sections: [] };
    }

    const sectionsForVenue = sectionsAll.filter((s) => s.venue_id === venue.id);

    const sections = sectionsForVenue.map((section) => {
      const seatsForSection = seatsAll.filter(
        (seat) => seat.venue_id === venue.id && seat.section_id === section.id
      );
      const seats = seatsForSection.map((seat) => {
        const availability = availabilities.find(
          (a) => a.performance_id === performanceId && a.seat_id === seat.id
        ) || null;
        return { seat, availability };
      });
      return { section, seats };
    });

    return { venue, sections };
  }

  addTicketsToCart(performanceId, seatIds, priceTier) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return { success: false, ticket_group: null, cart: null, cart_item: null, message: 'No seats selected.' };
    }

    const reserveResult = this._reserveSeatsForPerformance(performanceId, seatIds, priceTier || null);
    if (!reserveResult.success) {
      return { success: false, ticket_group: null, cart: null, cart_item: null, message: reserveResult.message };
    }

    const availabilities = this._getFromStorage('performance_seat_availabilities', []);
    const selectedAvailabilities = seatIds.map((id) =>
      availabilities.find((a) => a.performance_id === performanceId && a.seat_id === id)
    );

    const pricePerTicket = selectedAvailabilities[0] ? selectedAvailabilities[0].price : 0;
    const effectivePriceTier = reserveResult.priceTier || (selectedAvailabilities[0] ? selectedAvailabilities[0].price_tier : null);
    const quantity = seatIds.length;
    const totalPrice = pricePerTicket * quantity;

    const ticketGroups = this._getFromStorage('ticket_groups', []);
    const ticketGroup = {
      id: this._generateId('ticket_group'),
      performance_id: performanceId,
      seat_ids: seatIds.slice(),
      quantity,
      price_per_ticket: pricePerTicket,
      total_price: totalPrice,
      price_tier: effectivePriceTier || null
    };
    ticketGroups.push(ticketGroup);
    this._saveToStorage('ticket_groups', ticketGroups);

    const performances = this._getFromStorage('performances', []);
    const performance = performances.find((p) => p.id === performanceId) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'ticket_group',
      reference_id: ticketGroup.id,
      display_name: performance ? performance.title || 'Performance Tickets' : 'Performance Tickets',
      quantity,
      unit_price: pricePerTicket,
      total_price: totalPrice,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    this._calculateCartTotals(cart);

    return { success: true, ticket_group: ticketGroup, cart, cart_item: cartItem, message: 'Tickets added to cart.' };
  }

  // ---------------- Events & RSVP ----------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const event_types = Array.from(
      new Set(events.map((e) => e.event_type).filter((v) => !!v))
    );

    const price_filters = ['free', 'paid'];

    const date_presets = [
      { key: 'today', label: 'Today' },
      { key: 'this_week', label: 'This Week' },
      { key: 'this_month', label: 'This Month' }
    ];

    const sort_options = [
      { key: 'date_soonest_first', label: 'Date: Soonest First' }
    ];

    return { event_types, price_filters, date_presets, sort_options };
  }

  searchEvents(filters, sortBy, page = 1, pageSize = 20) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};

    let results = events.slice();

    if (f.eventType) {
      results = results.filter((e) => e.event_type === f.eventType);
    }

    if (typeof f.isFree === 'boolean') {
      results = results.filter((e) => {
        if (f.isFree) return e.is_free === true || e.price === 0;
        return e.is_free === false && e.price > 0;
      });
    }

    if (f.dateStart || f.dateEnd) {
      const start = this._parseDate(f.dateStart);
      const end = this._parseDate(f.dateEnd);
      results = results.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (sortBy === 'date_soonest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const db = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return da - db;
      });
    }

    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const pagedResults = results.slice(startIndex, startIndex + pageSize);

    return { results: pagedResults, total, page, pageSize };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    return event;
  }

  createRsvp(eventId, attendeeName, attendeeEmail, attendeeCount) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { rsvp: null, message: 'Event not found.' };
    }

    const rsvps = this._getFromStorage('rsvps', []);
    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      event_title: event.title || '',
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      attendee_count: attendeeCount,
      created_at: this._now(),
      status: 'confirmed'
    };

    rsvps.push(rsvp);
    this._saveToStorage('rsvps', rsvps);

    return { rsvp, message: 'RSVP submitted.' };
  }

  // ---------------- Memberships ----------------

  getMembershipFilterOptions() {
    const membership_plans = this._getFromStorage('membership_plans', []);

    const membership_types = Array.from(
      new Set(membership_plans.map((m) => m.membership_type).filter((v) => !!v))
    );

    const benefit_filters = ['class_discounts'];

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return { membership_types, benefit_filters, sort_options };
  }

  searchMembershipPlans(filters, sortBy, page = 1, pageSize = 20) {
    const plans = this._getFromStorage('membership_plans', []);
    const f = filters || {};

    let results = plans.slice();

    if (f.membershipType) {
      results = results.filter((m) => m.membership_type === f.membershipType);
    }

    if (typeof f.includesClassDiscounts === 'boolean') {
      results = results.filter((m) => {
        return !!m.includes_class_discounts === f.includesClassDiscounts;
      });
    }

    if (typeof f.minClassDiscountPercent === 'number') {
      results = results.filter(
        (m) => typeof m.class_discount_percent === 'number' && m.class_discount_percent >= f.minClassDiscountPercent
      );
    }

    if (typeof f.isActive === 'boolean') {
      results = results.filter((m) => !!m.is_active === f.isActive);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => {
        const pa = typeof a.price_annual === 'number' ? a.price_annual : (a.price_monthly || 0);
        const pb = typeof b.price_annual === 'number' ? b.price_annual : (b.price_monthly || 0);
        return pa - pb;
      });
    }

    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const pagedResults = results.slice(startIndex, startIndex + pageSize);

    return { results: pagedResults, total, page, pageSize };
  }

  getMembershipDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((m) => m.id === membershipPlanId) || null;
    return plan;
  }

  addMembershipToCart(membershipPlanId, billingPeriod) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((m) => m.id === membershipPlanId);
    if (!plan) {
      return { membership_purchase: null, cart: null, cart_item: null };
    }

    const membership_purchases = this._getFromStorage('membership_purchases', []);

    let price = 0;
    if (billingPeriod === 'annual') {
      price = typeof plan.price_annual === 'number' ? plan.price_annual : 0;
    } else if (billingPeriod === 'monthly') {
      price = typeof plan.price_monthly === 'number' ? plan.price_monthly : 0;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime());
    if (billingPeriod === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const membershipPurchase = {
      id: this._generateId('membership_purchase'),
      membership_plan_id: plan.id,
      membership_name: plan.name || 'Membership',
      billing_period: billingPeriod,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      price: price,
      status: 'pending_payment'
    };

    membership_purchases.push(membershipPurchase);
    this._saveToStorage('membership_purchases', membership_purchases);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'membership',
      reference_id: membershipPurchase.id,
      display_name: plan.name || 'Membership',
      quantity: 1,
      unit_price: price,
      total_price: price,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    this._calculateCartTotals(cart);

    return { membership_purchase: membershipPurchase, cart, cart_item: cartItem };
  }

  // ---------------- Instructors ----------------

  getInstructorFilterOptions() {
    const instructors = this._getFromStorage('instructors', []);

    const disciplineSet = new Set();
    instructors.forEach((inst) => {
      if (Array.isArray(inst.disciplines)) {
        inst.disciplines.forEach((d) => d && disciplineSet.add(d));
      }
      if (inst.primary_discipline) disciplineSet.add(inst.primary_discipline);
    });

    const disciplines = Array.from(disciplineSet);
    const rating_thresholds = [4.0, 4.5];
    const sort_options = [
      { key: 'most_classes_taught', label: 'Most Classes Taught' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { disciplines, rating_thresholds, sort_options };
  }

  searchInstructors(filters, sortBy, page = 1, pageSize = 20) {
    const instructors = this._getFromStorage('instructors', []);
    const f = filters || {};

    let results = instructors.slice();

    if (f.discipline) {
      results = results.filter((i) => {
        const ds = Array.isArray(i.disciplines) ? i.disciplines : [];
        const primary = i.primary_discipline || null;
        return ds.includes(f.discipline) || primary === f.discipline;
      });
    }

    if (typeof f.ratingMin === 'number') {
      results = results.filter(
        (i) => typeof i.rating === 'number' && i.rating >= f.ratingMin
      );
    }

    if (sortBy === 'most_classes_taught') {
      results.sort((a, b) => (b.upcoming_class_count || 0) - (a.upcoming_class_count || 0));
    } else if (sortBy === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const pagedResults = results.slice(startIndex, startIndex + pageSize);

    return { results: pagedResults, total, page, pageSize };
  }

  getInstructorProfile(instructorId) {
    const instructors = this._getFromStorage('instructors', []);
    const programs = this._getFromStorage('programs', []);

    const instructor = instructors.find((i) => i.id === instructorId) || null;

    const upcoming_programs = programs.filter((p) => {
      if (p.instructor_id !== instructorId) return false;
      if (p.status && p.status !== 'scheduled') return false;
      return true;
    });

    return { instructor, upcoming_programs };
  }

  followInstructor(instructorId) {
    const instructors = this._getFromStorage('instructors', []);
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor) {
      return null;
    }

    const follows = this._getFromStorage('instructor_follows', []);

    const existing = follows.find((f) => f.instructor_id === instructorId);
    if (existing) return existing;

    const follow = {
      id: this._generateId('instructor_follow'),
      instructor_id: instructorId,
      followed_at: this._now()
    };

    follows.push(follow);
    this._saveToStorage('instructor_follows', follows);

    return follow;
  }

  // ---------------- Donations ----------------

  getDonationFunds() {
    const funds = this._getFromStorage('donation_funds', []);
    return funds;
  }

  createDonationIntentAndAddToCart(
    fundId,
    donationType,
    amount,
    dedicationEnabled,
    dedicationType,
    honoreeName,
    donorName
  ) {
    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) {
      return { donation: null, cart: null, cart_item: null };
    }

    const donations = this._getFromStorage('donations', []);

    const donation = {
      id: this._generateId('donation'),
      fund_id: fund.id,
      fund_name: fund.name || '',
      donation_type: donationType,
      amount: amount,
      dedication_enabled: !!dedicationEnabled,
      dedication_type: dedicationType || 'none',
      honoree_name: honoreeName || null,
      donor_name: donorName || null,
      created_at: this._now(),
      status: 'pending_payment'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'donation',
      reference_id: donation.id,
      display_name: `Donation to ${fund.name || ''}`.trim(),
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    this._calculateCartTotals(cart);

    return { donation, cart, cart_item: cartItem };
  }

  // ---------------- Cart & Orders ----------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const programs = this._getFromStorage('programs', []);
    const membership_purchases = this._getFromStorage('membership_purchases', []);
    const membership_plans = this._getFromStorage('membership_plans', []);
    const performances = this._getFromStorage('performances', []);
    const ticket_groups = this._getFromStorage('ticket_groups', []);
    const donations = this._getFromStorage('donations', []);
    const enrollments = this._getFromStorage('enrollments', []);
    const pass_purchases = this._getFromStorage('pass_purchases', []);

    const cartItemIds = cart.item_ids || [];
    const itemsRaw = cartItemsAll.filter((ci) => cartItemIds.includes(ci.id));

    let subtotal = 0;

    const items = itemsRaw.map((ci) => {
      let program = null;
      let membership_plan = null;
      let performance = null;
      let ticket_group = null;
      let donation = null;

      if (ci.item_type === 'program_enrollment') {
        const enrollment = enrollments.find((e) => e.id === ci.reference_id) || null;
        if (enrollment) {
          program = programs.find((p) => p.id === enrollment.program_id) || null;
        }
      } else if (ci.item_type === 'membership') {
        const mp = membership_purchases.find((m) => m.id === ci.reference_id) || null;
        if (mp) {
          membership_plan = membership_plans.find((p) => p.id === mp.membership_plan_id) || null;
        }
      } else if (ci.item_type === 'ticket_group') {
        ticket_group = ticket_groups.find((tg) => tg.id === ci.reference_id) || null;
        if (ticket_group) {
          performance = performances.find((p) => p.id === ticket_group.performance_id) || null;
        }
      } else if (ci.item_type === 'donation') {
        donation = donations.find((d) => d.id === ci.reference_id) || null;
      } else if (ci.item_type === 'pass_purchase') {
        const pp = pass_purchases.find((p) => p.id === ci.reference_id) || null;
        if (pp) {
          program = programs.find((p) => p.id === pp.pass_program_id) || null;
        }
      }

      subtotal += ci.total_price || 0;

      return {
        cart_item: ci,
        item_type: ci.item_type,
        program,
        membership_plan,
        performance,
        ticket_group,
        donation
      };
    });

    cart.subtotal = subtotal;
    cart.item_count = items.length;
    if (!cart.currency) cart.currency = 'USD';
    this._saveCart(cart);

    return {
      cart,
      items,
      subtotal,
      currency: cart.currency,
      item_count: items.length
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const enrollments = this._getFromStorage('enrollments', []);
    const ticket_groups = this._getFromStorage('ticket_groups', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { cart, cart_item: null };
    }

    const cartItem = cartItems[idx];
    cartItem.quantity = quantity;
    cartItem.total_price = (cartItem.unit_price || 0) * quantity;
    cartItems[idx] = cartItem;

    // Update linked entities where applicable
    if (cartItem.item_type === 'program_enrollment') {
      const enrollmentIdx = enrollments.findIndex((e) => e.id === cartItem.reference_id);
      if (enrollmentIdx >= 0) {
        enrollments[enrollmentIdx].quantity = quantity;
        enrollments[enrollmentIdx].total_price = cartItem.total_price;
        this._saveToStorage('enrollments', enrollments);
      }
    } else if (cartItem.item_type === 'ticket_group') {
      const tgIdx = ticket_groups.findIndex((tg) => tg.id === cartItem.reference_id);
      if (tgIdx >= 0) {
        ticket_groups[tgIdx].quantity = quantity;
        ticket_groups[tgIdx].total_price = cartItem.total_price;
        this._saveToStorage('ticket_groups', ticket_groups);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    return { cart, cart_item: cartItem };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const exists = cartItems.some((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (!exists) {
      return { cart, success: false };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = (cart.item_ids || []).filter((id) => id !== cartItemId);
    this._calculateCartTotals(cart);

    return { cart, success: true };
  }

  createOrderFromCart(contactName, contactEmail) {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const cartItemIds = cart.item_ids || [];
    const cartItems = cartItemsAll.filter((ci) => cartItemIds.includes(ci.id));

    const { total_amount } = this._applyMembershipBenefitsToOrder(cartItems);

    let order_type = 'mixed';
    const itemTypes = Array.from(new Set(cartItems.map((ci) => ci.item_type)));
    if (itemTypes.length === 1) {
      const t = itemTypes[0];
      if (t === 'program_enrollment') order_type = 'class_booking';
      else if (t === 'membership') order_type = 'membership_purchase';
      else if (t === 'ticket_group') order_type = 'ticket_purchase';
      else if (t === 'donation') order_type = 'donation';
      else order_type = 'mixed';
    }

    const orders = this._getFromStorage('orders', []);

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + Date.now(),
      cart_item_ids: cartItemIds.slice(),
      total_amount: total_amount,
      currency: cart.currency || 'USD',
      order_type,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'pending_payment',
      created_at: this._now(),
      updated_at: this._now()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    return order;
  }

  getOrderSummary(orderId) {
    const orders = this._getFromStorage('orders', []);
    const cartItemsAll = this._getFromStorage('cart_items', []);

    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return { order: null, items: [] };
    }

    const items = cartItemsAll.filter((ci) => (order.cart_item_ids || []).includes(ci.id));

    return { order, items };
  }

  submitPayment(orderId, paymentMethod, card) {
    const orders = this._getFromStorage('orders', []);
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const enrollments = this._getFromStorage('enrollments', []);
    const membership_purchases = this._getFromStorage('membership_purchases', []);
    const donations = this._getFromStorage('donations', []);

    const orderIdx = orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) {
      return { payment: null, order: null, message: 'Order not found.' };
    }

    const order = orders[orderIdx];
    const items = cartItemsAll.filter((ci) => (order.cart_item_ids || []).includes(ci.id));

    const payments = this._getFromStorage('payments', []);

    const paymentRecord = {
      id: this._generateId('payment'),
      order_id: order.id,
      amount: order.total_amount,
      payment_method: paymentMethod,
      status: 'succeeded',
      paid_at: this._now(),
      card_last4: null,
      card_brand: null
    };

    if (paymentMethod === 'credit_card' || paymentMethod === 'mixed') {
      if (card && card.cardNumber) {
        const num = card.cardNumber.replace(/\s+/g, '');
        paymentRecord.card_last4 = num.slice(-4);
      }
      paymentRecord.card_brand = (card && card.cardBrand) || null;
    }

    payments.push(paymentRecord);
    this._saveToStorage('payments', payments);

    // Update order status
    order.status = 'paid';
    order.updated_at = this._now();
    orders[orderIdx] = order;
    this._saveToStorage('orders', orders);

    // Update related entities
    items.forEach((ci) => {
      if (ci.item_type === 'program_enrollment') {
        const eIdx = enrollments.findIndex((e) => e.id === ci.reference_id);
        if (eIdx >= 0) {
          enrollments[eIdx].status = 'paid';
          this._createOrUpdatePassUsageForEnrollment(enrollments[eIdx]);
        }
      } else if (ci.item_type === 'membership') {
        const mpIdx = membership_purchases.findIndex((m) => m.id === ci.reference_id);
        if (mpIdx >= 0) {
          membership_purchases[mpIdx].status = 'active';
        }
      } else if (ci.item_type === 'donation') {
        const dIdx = donations.findIndex((d) => d.id === ci.reference_id);
        if (dIdx >= 0) {
          donations[dIdx].status = 'paid';
        }
      }
    });

    this._saveToStorage('enrollments', enrollments);
    this._saveToStorage('membership_purchases', membership_purchases);
    this._saveToStorage('donations', donations);

    // Clear cart after successful payment
    const cart = this._getOrCreateCart();
    cart.item_ids = [];
    this._calculateCartTotals(cart);

    return { payment: paymentRecord, order, message: 'Payment processed successfully.' };
  }

  // ---------------- Static content & contact ----------------

  getAboutContent() {
    const about = this._getFromStorage('about_content', {
      mission: '',
      history: '',
      facilities: '',
      hours: '',
      policies: ''
    });
    return about;
  }

  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      phone: '',
      email: '',
      map_embed: ''
    });
    return info;
  }

  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_submissions', []);
    const submission = {
      id: this._generateId('contact_submission'),
      name,
      email,
      subject,
      message,
      submitted_at: this._now()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return { success: true, message: 'Your message has been submitted.' };
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
