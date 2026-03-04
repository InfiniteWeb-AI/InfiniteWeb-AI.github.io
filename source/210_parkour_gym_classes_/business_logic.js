/* localStorage polyfill for Node.js and environments without localStorage */
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  _initStorage() {
    const arrayKeys = [
      'classes',
      'class_sessions',
      'instructors',
      'private_lesson_options',
      'private_lesson_slots',
      'class_passes',
      'memberships',
      'promo_codes',
      'cart_items',
      'bookings',
      'favorites',
      'orders',
      'order_items',
      'faq_entries',
      'contact_requests'
    ];

    const objectKeys = [
      'cart',
      'gym_info',
      'contact_info',
      'policies'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    objectKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  _nowISO() {
    return new Date().toISOString();
  }

  _dateOnlyISO(datetimeString) {
    if (!datetimeString) return null;
    const parts = String(datetimeString).split('T');
    return parts[0] || null;
  }

  _timeOnlyHM(datetimeString) {
    if (!datetimeString) return null;
    const parts = String(datetimeString).split('T');
    if (parts.length < 2) return null;
    return parts[1].slice(0, 5);
  }

  _compareDateOnly(a, b) {
    const da = this._dateOnlyISO(a);
    const db = this._dateOnlyISO(b);
    if (!da || !db) return 0;
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  }

  _sameDate(a, b) {
    return this._dateOnlyISO(a) === this._dateOnlyISO(b);
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const now = this._nowISO();
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        promo_code_ids: [],
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    let classPassTotal = 0;
    let membershipTotal = 0;
    let classesTotal = 0; // class sessions only

    items.forEach((item) => {
      const totalPrice = typeof item.total_price === 'number'
        ? item.total_price
        : (item.unit_price || 0) * (item.quantity || 1) * (item.participant_quantity || 1);
      subtotal += totalPrice;
      if (item.item_type === 'class_pass') {
        classPassTotal += totalPrice;
      } else if (item.item_type === 'membership') {
        membershipTotal += totalPrice;
      } else if (item.item_type === 'class_session') {
        classesTotal += totalPrice;
      }
    });

    const promoCodeIds = Array.isArray(cart.promo_code_ids) ? cart.promo_code_ids : [];
    const promoCodes = this._getFromStorage('promo_codes', []);

    let discountTotal = 0;

    promoCodeIds.forEach((promoId) => {
      const promo = promoCodes.find((p) => p.id === promoId && p.is_active);
      if (!promo) return;

      let baseAmount = 0;
      if (promo.applies_to === 'entire_cart') {
        baseAmount = subtotal;
      } else if (promo.applies_to === 'class_passes') {
        baseAmount = classPassTotal;
      } else if (promo.applies_to === 'memberships') {
        baseAmount = membershipTotal;
      } else if (promo.applies_to === 'classes') {
        baseAmount = classesTotal;
      }

      if (!baseAmount || baseAmount <= 0) return;

      if (typeof promo.min_cart_total === 'number' && baseAmount < promo.min_cart_total) {
        return;
      }

      let d = 0;
      if (promo.discount_type === 'percent') {
        d = (baseAmount * promo.discount_value) / 100;
      } else if (promo.discount_type === 'fixed_amount') {
        d = promo.discount_value;
      }
      if (!Number.isFinite(d) || d <= 0) return;

      discountTotal += d;
    });

    if (discountTotal > subtotal) {
      discountTotal = subtotal;
    }

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.tax_total = 0;
    cart.total = subtotal - discountTotal;
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart', cart);
  }

  _applyPromoToCartInternal(promoCodeValue, cart) {
    if (!promoCodeValue) {
      return { success: false, message: 'Promo code is required.' };
    }

    const codeNormalized = String(promoCodeValue).trim().toLowerCase();
    const promoCodes = this._getFromStorage('promo_codes', []);
    const now = new Date();

    const promo = promoCodes.find((p) => {
      if (!p || !p.code) return false;
      if (String(p.code).trim().toLowerCase() !== codeNormalized) return false;
      if (!p.is_active) return false;
      if (p.start_datetime) {
        const sd = this._parseDate(p.start_datetime);
        if (sd && now < sd) return false;
      }
      if (p.end_datetime) {
        const ed = this._parseDate(p.end_datetime);
        if (ed && now > ed) return false;
      }
      return true;
    });

    if (!promo) {
      return { success: false, message: 'Promo code is invalid or inactive.' };
    }

    cart.promo_code_ids = Array.isArray(cart.promo_code_ids) ? cart.promo_code_ids : [];
    if (!cart.promo_code_ids.includes(promo.id)) {
      cart.promo_code_ids.push(promo.id);
      this._saveToStorage('cart', cart);
      this._recalculateCartTotals();
    }

    return { success: true, message: 'Promo code applied.' };
  }

  _createOrderFromCart(cart, email, paymentMethod) {
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter((ci) => ci.cart_id === cart.id);

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const promoCodeIds = Array.isArray(cart.promo_code_ids) ? cart.promo_code_ids : [];

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + orderId.split('_')[1];

    const order = {
      id: orderId,
      order_number: orderNumber,
      status: 'paid',
      email: email,
      payment_method: paymentMethod,
      promo_code_ids: promoCodeIds.slice(),
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_total: cart.tax_total || 0,
      total: cart.total || 0,
      created_at: this._nowISO()
    };

    orders.push(order);

    const newOrderItems = [];

    items.forEach((ci) => {
      const oiId = this._generateId('order_item');
      const orderItem = {
        id: oiId,
        order_id: orderId,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        participant_quantity: ci.participant_quantity,
        date: ci.date,
        start_datetime: ci.start_datetime,
        end_datetime: ci.end_datetime,
        start_date: ci.start_date,
        auto_renew: ci.auto_renew,
        total_price: ci.total_price
      };
      orderItems.push(orderItem);
      newOrderItems.push(orderItem);
    });

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const remainingCartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    cart.item_ids = [];
    cart.promo_code_ids = [];
    cart.subtotal = 0;
    cart.discount_total = 0;
    cart.tax_total = 0;
    cart.total = 0;
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    return { order, orderItems: newOrderItems };
  }

  _createBookingsFromOrderItems(order, orderItems) {
    let bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const privateSlots = this._getFromStorage('private_lesson_slots', []);

    orderItems.forEach((oi) => {
      if (oi.item_type === 'class_session') {
        const session = classSessions.find((s) => s.id === oi.item_id);
        if (!session) return;
        const bookingType = session.is_open_gym ? 'open_gym' : 'class_session';
        const booking = {
          id: this._generateId('booking'),
          booking_type: bookingType,
          class_session_id: session.id,
          private_lesson_slot_id: null,
          name: oi.name,
          date: session.start_datetime,
          start_datetime: session.start_datetime,
          end_datetime: session.end_datetime,
          price: oi.total_price,
          participant_quantity: oi.participant_quantity || 1,
          status: 'booked',
          rescheduled_from_booking_id: null
        };
        bookings.push(booking);
      } else if (oi.item_type === 'private_lesson') {
        const slot = privateSlots.find((s) => s.id === oi.item_id);
        if (!slot) return;
        const booking = {
          id: this._generateId('booking'),
          booking_type: 'private_lesson',
          class_session_id: null,
          private_lesson_slot_id: slot.id,
          name: oi.name,
          date: slot.start_datetime,
          start_datetime: slot.start_datetime,
          end_datetime: slot.end_datetime,
          price: oi.total_price,
          participant_quantity: oi.participant_quantity || 1,
          status: 'booked',
          rescheduled_from_booking_id: null
        };
        bookings.push(booking);
      }
    });

    this._saveToStorage('bookings', bookings);
  }

  _getClassSessionsForDateAndFilters(date, filters = {}) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);
    const targetDateISO = this._dateOnlyISO(date);

    return classSessions.filter((session) => {
      if (targetDateISO && this._dateOnlyISO(session.start_datetime) !== targetDateISO) {
        return false;
      }

      const cls = classes.find((c) => c.id === session.class_id);
      if (!cls) return false;

      if (filters.max_price != null && typeof session.price === 'number' && session.price > filters.max_price) {
        return false;
      }

      if (filters.levels && Array.isArray(filters.levels) && filters.levels.length > 0) {
        if (!filters.levels.includes(cls.level)) return false;
      }

      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const classTags = Array.isArray(cls.tags) ? cls.tags : [];
        const sessionTags = [];
        if (session.is_open_gym) sessionTags.push('open_gym');
        if (session.is_kids_teens) sessionTags.push('kids_teens');
        const allTags = classTags.concat(sessionTags);
        const hasAny = filters.tags.some((t) => allTags.includes(t));
        if (!hasAny) return false;
      }

      if (filters.time_of_day && Array.isArray(filters.time_of_day) && filters.time_of_day.length > 0) {
        if (!filters.time_of_day.includes(session.time_of_day)) return false;
      }

      if (filters.weekday && session.weekday !== filters.weekday) {
        return false;
      }

      return true;
    });
  }

  _getAvailablePrivateSlotsForInstructor(instructorId, date, durationMinutes, startTime, endTime) {
    const privateSlots = this._getFromStorage('private_lesson_slots', []);
    const targetDateISO = this._dateOnlyISO(date);

    return privateSlots.filter((slot) => {
      if (slot.instructor_id !== instructorId) return false;
      if (slot.status !== 'available') return false;
      if (targetDateISO && this._dateOnlyISO(slot.start_datetime) !== targetDateISO) return false;
      if (durationMinutes && slot.duration_minutes !== durationMinutes) return false;

      const timeHM = this._timeOnlyHM(slot.start_datetime);
      if (startTime && timeHM && timeHM < startTime) return false;
      if (endTime && timeHM && timeHM > endTime) return false;

      return true;
    });
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomepageHighlights()
  getHomepageHighlights() {
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const classPasses = this._getFromStorage('class_passes', []);
    const memberships = this._getFromStorage('memberships', []);
    const favorites = this._getFromStorage('favorites', []);

    const favoriteClassIds = favorites.map((f) => f.class_id);

    const now = this._nowISO();

    const featuredClasses = classes
      .filter((c) => c.status === 'active' && c.featured)
      .map((c) => {
        const sessionsForClass = classSessions.filter((s) => s.class_id === c.id);
        let nextSession = null;
        sessionsForClass.forEach((s) => {
          if (!nextSession) {
            nextSession = s;
            return;
          }
          if (s.start_datetime && nextSession.start_datetime && s.start_datetime < nextSession.start_datetime) {
            nextSession = s;
          }
        });

        return {
          class_id: c.id,
          class_name: c.name,
          slug: c.slug,
          level: c.level,
          description: c.description,
          is_kids_teens: !!c.is_kids_teens,
          tags: Array.isArray(c.tags) ? c.tags : [],
          default_price: c.default_price || null,
          rating_average: c.rating_average || null,
          rating_count: c.rating_count || 0,
          image_url: c.image_url || null,
          next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
          next_session_time_of_day: nextSession ? nextSession.time_of_day : null,
          is_favorited: favoriteClassIds.includes(c.id),
          class: c
        };
      });

    const featuredKidsPrograms = classes
      .filter((c) => c.status === 'active' && c.is_kids_teens)
      .map((c) => ({
        class_id: c.id,
        class_name: c.name,
        min_age: c.min_age || null,
        max_age: c.max_age || null,
        description: c.description,
        default_price: c.default_price || null,
        rating_average: c.rating_average || null,
        image_url: c.image_url || null,
        class: c
      }));

    const featuredPasses = classPasses
      .filter((p) => p.status === 'active')
      .map((p) => ({
        class_pass_id: p.id,
        name: p.name,
        product_type: p.product_type,
        visit_count: p.visit_count,
        price: p.price,
        expiration_days: p.expiration_days,
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
        class_pass: p
      }));

    const featuredMemberships = memberships
      .filter((m) => m.status === 'active')
      .map((m) => ({
        membership_id: m.id,
        name: m.name,
        membership_type: m.membership_type,
        duration_type: m.duration_type,
        price_per_period: m.price_per_period,
        includes_open_gym: !!m.includes_open_gym,
        includes_classes: !!m.includes_classes,
        benefits: Array.isArray(m.benefits) ? m.benefits : [],
        membership: m
      }));

    return {
      featured_classes: featuredClasses,
      featured_kids_programs: featuredKidsPrograms,
      featured_passes: featuredPasses,
      featured_memberships: featuredMemberships
    };
  }

  // getClassFilterOptions()
  getClassFilterOptions() {
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);

    const levels = Array.from(new Set(classes.map((c) => c.level).filter(Boolean)));

    const tagsSet = new Set();
    classes.forEach((c) => {
      (c.tags || []).forEach((t) => tagsSet.add(t));
    });
    const tags = Array.from(tagsSet);

    const timeOfDayOptions = ['morning', 'afternoon', 'evening'];

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    let minRating = 0;
    let maxRating = 5;
    if (classes.length > 0) {
      const ratings = classes
        .map((c) => c.rating_average)
        .filter((r) => typeof r === 'number');
      if (ratings.length > 0) {
        minRating = Math.min.apply(null, ratings);
        maxRating = Math.max.apply(null, ratings);
      }
    }

    let minPrice = 0;
    let maxPrice = 0;
    if (classSessions.length > 0) {
      const prices = classSessions
        .map((s) => s.price)
        .filter((p) => typeof p === 'number');
      if (prices.length > 0) {
        minPrice = Math.min.apply(null, prices);
        maxPrice = Math.max.apply(null, prices);
      }
    }

    const ageValues = classes
      .map((c) => [c.min_age, c.max_age])
      .reduce((acc, pair) => acc.concat(pair), [])
      .filter((v) => typeof v === 'number');
    let minAge = 0;
    let maxAge = 0;
    if (ageValues.length > 0) {
      minAge = Math.min.apply(null, ageValues);
      maxAge = Math.max.apply(null, ageValues);
    }

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'time_earliest_first', label: 'Time: Earliest First' }
    ];

    return {
      levels,
      tags,
      time_of_day_options: timeOfDayOptions,
      days_of_week: daysOfWeek,
      rating_range: {
        min: minRating,
        max: maxRating,
        step: 0.1
      },
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 1
      },
      age_range: {
        min: minAge,
        max: maxAge,
        step: 1
      },
      sort_options: sortOptions
    };
  }

  // searchClasses(query, filters, sort, page, page_size)
  searchClasses(query, filters = {}, sort = null, page = 1, page_size = 20) {
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const favorites = this._getFromStorage('favorites', []);

    const favoriteClassIds = favorites.map((f) => f.class_id);

    const q = query ? String(query).trim().toLowerCase() : '';

    const normalizedFilters = filters || {};

    const filteredClasses = classes.filter((cls) => {
      if (cls.status !== 'active') return false;

      if (q) {
        const nameMatch = (cls.name || '').toLowerCase().includes(q);
        const descMatch = (cls.description || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }

      if (normalizedFilters.levels && normalizedFilters.levels.length > 0) {
        if (!normalizedFilters.levels.includes(cls.level)) return false;
      }

      if (normalizedFilters.tags && normalizedFilters.tags.length > 0) {
        const classTags = Array.isArray(cls.tags) ? cls.tags : [];
        const hasAny = normalizedFilters.tags.some((t) => classTags.includes(t));
        if (!hasAny) return false;
      }

      if (normalizedFilters.is_kids_teens_only) {
        if (!cls.is_kids_teens) return false;
      }

      if (typeof normalizedFilters.min_age === 'number') {
        if (typeof cls.min_age === 'number' && cls.min_age > normalizedFilters.min_age) return false;
        if (typeof cls.max_age === 'number' && cls.max_age < normalizedFilters.min_age) return false;
      }

      if (typeof normalizedFilters.max_age === 'number') {
        if (typeof cls.max_age === 'number' && cls.max_age < normalizedFilters.max_age) return false;
        if (typeof cls.min_age === 'number' && cls.min_age > normalizedFilters.max_age) return false;
      }

      if (typeof normalizedFilters.min_rating === 'number') {
        if (typeof cls.rating_average === 'number' && cls.rating_average < normalizedFilters.min_rating) {
          return false;
        }
      }

      return true;
    });

    const classIdToSessions = {};
    classSessions.forEach((s) => {
      if (!classIdToSessions[s.class_id]) classIdToSessions[s.class_id] = [];
      classIdToSessions[s.class_id].push(s);
    });

    const resultsWithSession = [];

    filteredClasses.forEach((cls) => {
      const sessions = classIdToSessions[cls.id] || [];

      const sessionsFiltered = sessions.filter((s) => {
        if (normalizedFilters.max_price != null && typeof s.price === 'number' && s.price > normalizedFilters.max_price) {
          return false;
        }

        if (normalizedFilters.days_of_week && normalizedFilters.days_of_week.length > 0) {
          if (!normalizedFilters.days_of_week.includes(s.weekday)) return false;
        }

        if (normalizedFilters.time_of_day && normalizedFilters.time_of_day.length > 0) {
          if (!normalizedFilters.time_of_day.includes(s.time_of_day)) return false;
        }

        if (normalizedFilters.date) {
          if (!this._sameDate(s.start_datetime, normalizedFilters.date)) return false;
        }

        return true;
      });

      if (normalizedFilters.max_price != null || (normalizedFilters.days_of_week && normalizedFilters.days_of_week.length) || (normalizedFilters.time_of_day && normalizedFilters.time_of_day.length) || normalizedFilters.date) {
        if (sessionsFiltered.length === 0) return; // must have at least one matching session
      }

      const chosenSessions = sessionsFiltered.length > 0 ? sessionsFiltered : sessions;
      if (chosenSessions.length === 0) return;

      let nextSession = null;
      chosenSessions.forEach((s) => {
        if (!nextSession) {
          nextSession = s;
          return;
        }
        if (s.start_datetime && nextSession.start_datetime && s.start_datetime < nextSession.start_datetime) {
          nextSession = s;
        }
      });

      resultsWithSession.push({ cls, nextSession });
    });

    // Sorting
    if (sort === 'price_low_to_high') {
      resultsWithSession.sort((a, b) => {
        const pa = a.nextSession ? a.nextSession.price || 0 : 0;
        const pb = b.nextSession ? b.nextSession.price || 0 : 0;
        return pa - pb;
      });
    } else if (sort === 'price_high_to_low') {
      resultsWithSession.sort((a, b) => {
        const pa = a.nextSession ? a.nextSession.price || 0 : 0;
        const pb = b.nextSession ? b.nextSession.price || 0 : 0;
        return pb - pa;
      });
    } else if (sort === 'rating_high_to_low') {
      resultsWithSession.sort((a, b) => {
        const ra = a.cls.rating_average || 0;
        const rb = b.cls.rating_average || 0;
        return rb - ra;
      });
    } else if (sort === 'time_earliest_first') {
      resultsWithSession.sort((a, b) => {
        const ta = a.nextSession ? a.nextSession.start_datetime || '' : '';
        const tb = b.nextSession ? b.nextSession.start_datetime || '' : '';
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    const totalResults = resultsWithSession.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const paged = resultsWithSession.slice(startIndex, endIndex);

    const classesOut = paged.map(({ cls, nextSession }) => ({
      class_id: cls.id,
      class_name: cls.name,
      slug: cls.slug,
      level: cls.level,
      description: cls.description,
      is_kids_teens: !!cls.is_kids_teens,
      tags: Array.isArray(cls.tags) ? cls.tags : [],
      default_price: cls.default_price || null,
      rating_average: cls.rating_average || null,
      rating_count: cls.rating_count || 0,
      image_url: cls.image_url || null,
      next_session_id: nextSession ? nextSession.id : null,
      next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
      next_session_end_datetime: nextSession ? nextSession.end_datetime : null,
      next_session_weekday: nextSession ? nextSession.weekday : null,
      next_session_time_of_day: nextSession ? nextSession.time_of_day : null,
      next_session_price: nextSession ? nextSession.price : null,
      is_favorited: favoriteClassIds.includes(cls.id)
    }));

    return {
      total_results: totalResults,
      page,
      page_size,
      classes: classesOut
    };
  }

  // getClassDetails(classId)
  getClassDetails(classId) {
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const instructors = this._getFromStorage('instructors', []);
    const favorites = this._getFromStorage('favorites', []);

    const cls = classes.find((c) => c.id === classId);
    if (!cls) {
      return null;
    }

    const instructorObjs = (cls.instructor_ids || []).map((iid) => {
      const inst = instructors.find((i) => i.id === iid);
      if (!inst) return null;
      return {
        instructor_id: inst.id,
        name: inst.name,
        photo_url: inst.photo_url || null,
        rating_average: inst.rating_average || null,
        instructor: inst
      };
    }).filter(Boolean);

    const upcomingSessions = classSessions
      .filter((s) => s.class_id === cls.id)
      .sort((a, b) => {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      })
      .map((s) => ({
        class_session_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        weekday: s.weekday,
        time_of_day: s.time_of_day,
        price: s.price,
        capacity: s.capacity || null,
        spots_remaining: s.spots_remaining || null,
        is_open_gym: !!s.is_open_gym,
        is_kids_teens: !!s.is_kids_teens,
        min_age: s.min_age || null,
        max_age: s.max_age || null,
        instructor_id: s.instructor_id || null,
        instructor: s.instructor_id ? instructors.find((i) => i.id === s.instructor_id) || null : null
      }));

    const isFavorited = favorites.some((f) => f.class_id === cls.id);

    return {
      class_id: cls.id,
      class_name: cls.name,
      slug: cls.slug,
      level: cls.level,
      description: cls.description,
      location: cls.location || null,
      is_kids_teens: !!cls.is_kids_teens,
      tags: Array.isArray(cls.tags) ? cls.tags : [],
      default_price: cls.default_price || null,
      duration_minutes: cls.duration_minutes || null,
      min_age: cls.min_age || null,
      max_age: cls.max_age || null,
      rating_average: cls.rating_average || null,
      rating_count: cls.rating_count || 0,
      image_url: cls.image_url || null,
      instructors: instructorObjs,
      upcoming_sessions: upcomingSessions,
      is_favorited: isFavorited
    };
  }

  // addClassSessionToCart(classSessionId, participantQuantity, metadataTags)
  addClassSessionToCart(classSessionId, participantQuantity = 1, metadataTags = []) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const session = classSessions.find((s) => s.id === classSessionId);
    if (!session) {
      return { success: false, cart_item_id: null, message: 'Class session not found.' };
    }

    const cls = classes.find((c) => c.id === session.class_id);
    const cart = this._getOrCreateCart();

    const unitPrice = session.price || 0;
    const qty = 1;
    const participants = participantQuantity || 1;
    const totalPrice = unitPrice * qty * participants;

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'class_session',
      item_id: session.id,
      name: cls ? cls.name : 'Class Session',
      description: cls ? cls.description || '' : '',
      unit_price: unitPrice,
      quantity: qty,
      participant_quantity: participants,
      date: session.start_datetime,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      start_date: null,
      auto_renew: false,
      total_price: totalPrice,
      metadata_tags: Array.isArray(metadataTags) ? metadataTags : []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = Array.isArray(cart.item_ids) ? cart.item_ids : [];
    cart.item_ids.push(cartItemId);
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    this._recalculateCartTotals();

    return { success: true, cart_item_id: cartItemId, message: 'Class session added to cart.' };
  }

  // createClassBooking(classSessionId, participantQuantity)
  createClassBooking(classSessionId, participantQuantity = 1) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);
    let bookings = this._getFromStorage('bookings', []);

    const session = classSessions.find((s) => s.id === classSessionId);
    if (!session) {
      return null;
    }

    const cls = classes.find((c) => c.id === session.class_id);
    const bookingType = session.is_open_gym ? 'open_gym' : 'class_session';

    const booking = {
      id: this._generateId('booking'),
      booking_type: bookingType,
      class_session_id: session.id,
      private_lesson_slot_id: null,
      name: cls ? cls.name : 'Class Session',
      date: session.start_datetime,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      price: (session.price || 0) * (participantQuantity || 1),
      participant_quantity: participantQuantity || 1,
      status: 'booked',
      rescheduled_from_booking_id: null
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      booking_id: booking.id,
      status: booking.status,
      name: booking.name,
      date: booking.date,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      price: booking.price,
      participant_quantity: booking.participant_quantity
    };
  }

  // getWeeklyScheduleFilterOptions()
  getWeeklyScheduleFilterOptions() {
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);

    const levels = Array.from(new Set(classes.map((c) => c.level).filter(Boolean)));

    const tagsSet = new Set();
    classes.forEach((c) => {
      (c.tags || []).forEach((t) => tagsSet.add(t));
    });
    const tags = Array.from(tagsSet);

    const timeOfDayOptions = ['morning', 'afternoon', 'evening'];

    let minPrice = 0;
    let maxPrice = 0;
    if (classSessions.length > 0) {
      const prices = classSessions
        .map((s) => s.price)
        .filter((p) => typeof p === 'number');
      if (prices.length > 0) {
        minPrice = Math.min.apply(null, prices);
        maxPrice = Math.max.apply(null, prices);
      }
    }

    return {
      levels,
      tags,
      time_of_day_options: timeOfDayOptions,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 1
      }
    };
  }

  // getWeeklySchedule(weekStartDate, filters)
  getWeeklySchedule(weekStartDate, filters = {}) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);

    const startDateObj = this._parseDate(weekStartDate) || new Date();
    const weekStartISO = startDateObj.toISOString();
    const weekEndDateObj = new Date(startDateObj.getTime());
    weekEndDateObj.setDate(weekEndDateObj.getDate() + 6);
    const weekEndISO = weekEndDateObj.toISOString();

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const days = daysOfWeek.map((weekday, index) => {
      const dayDateObj = new Date(startDateObj.getTime());
      dayDateObj.setDate(startDateObj.getDate() + index);
      const dayDateISO = dayDateObj.toISOString();
      const dayDateOnly = this._dateOnlyISO(dayDateISO);

      const perDay = filters.per_day_filters && filters.per_day_filters[weekday] ? filters.per_day_filters[weekday] : {};

      const sessionsForDay = classSessions.filter((s) => {
        if (s.weekday !== weekday) return false;
        if (this._dateOnlyISO(s.start_datetime) !== dayDateOnly) return false;

        if (filters.max_price != null && typeof s.price === 'number' && s.price > filters.max_price) return false;

        const cls = classes.find((c) => c.id === s.class_id);
        if (!cls) return false;

        if (filters.levels && filters.levels.length > 0 && !filters.levels.includes(cls.level)) return false;

        if (filters.tags && filters.tags.length > 0) {
          const classTags = Array.isArray(cls.tags) ? cls.tags : [];
          const sessionTags = [];
          if (s.is_open_gym) sessionTags.push('open_gym');
          if (s.is_kids_teens) sessionTags.push('kids_teens');
          const allTags = classTags.concat(sessionTags);
          const hasAny = filters.tags.some((t) => allTags.includes(t));
          if (!hasAny) return false;
        }

        if (filters.time_of_day && filters.time_of_day.length > 0 && !filters.time_of_day.includes(s.time_of_day)) {
          return false;
        }

        if (perDay.levels && perDay.levels.length > 0 && !perDay.levels.includes(cls.level)) return false;

        if (perDay.tags && perDay.tags.length > 0) {
          const classTags2 = Array.isArray(cls.tags) ? cls.tags : [];
          const sessionTags2 = [];
          if (s.is_open_gym) sessionTags2.push('open_gym');
          if (s.is_kids_teens) sessionTags2.push('kids_teens');
          const allTags2 = classTags2.concat(sessionTags2);
          const hasAny2 = perDay.tags.some((t) => allTags2.includes(t));
          if (!hasAny2) return false;
        }

        const timeHM = this._timeOnlyHM(s.start_datetime);
        if (perDay.start_time && timeHM && timeHM < perDay.start_time) return false;
        if (perDay.end_time && timeHM && timeHM > perDay.end_time) return false;

        return true;
      });

      const sessionsOut = sessionsForDay.map((s) => {
        const cls = classes.find((c) => c.id === s.class_id);
        const tags = [];
        if (cls && Array.isArray(cls.tags)) {
          tags.push.apply(tags, cls.tags);
        }
        if (s.is_open_gym && !tags.includes('open_gym')) tags.push('open_gym');
        if (s.is_kids_teens && !tags.includes('kids_teens')) tags.push('kids_teens');

        return {
          class_session_id: s.id,
          class_id: s.class_id,
          class_name: cls ? cls.name : 'Class',
          level: cls ? cls.level : null,
          tags,
          start_datetime: s.start_datetime,
          end_datetime: s.end_datetime,
          time_of_day: s.time_of_day,
          price: s.price,
          is_open_gym: !!s.is_open_gym,
          is_kids_teens: !!s.is_kids_teens,
          spots_remaining: s.spots_remaining || null
        };
      });

      return {
        weekday,
        date: dayDateISO,
        sessions: sessionsOut
      };
    });

    return {
      week_start_date: weekStartISO,
      week_end_date: weekEndISO,
      days
    };
  }

  // getPassAndMembershipFilterOptions()
  getPassAndMembershipFilterOptions() {
    const classPasses = this._getFromStorage('class_passes', []);
    const memberships = this._getFromStorage('memberships', []);

    const productTypes = Array.from(new Set(classPasses.map((p) => p.product_type).filter(Boolean)));
    const visitCounts = Array.from(new Set(classPasses.map((p) => p.visit_count).filter((v) => typeof v === 'number')));
    const membershipDurations = Array.from(new Set(memberships.map((m) => m.duration_type).filter(Boolean)));
    const membershipTypes = Array.from(new Set(memberships.map((m) => m.membership_type).filter(Boolean)));

    const benefitTagsSet = new Set();
    classPasses.forEach((p) => (p.benefits || []).forEach((b) => benefitTagsSet.add(b)));
    memberships.forEach((m) => (m.benefits || []).forEach((b) => benefitTagsSet.add(b)));
    const benefitTags = Array.from(benefitTagsSet);

    const prices = [];
    classPasses.forEach((p) => {
      if (typeof p.price === 'number') prices.push(p.price);
    });
    memberships.forEach((m) => {
      if (typeof m.price_per_period === 'number') prices.push(m.price_per_period);
    });

    let minPrice = 0;
    let maxPrice = 0;
    if (prices.length > 0) {
      minPrice = Math.min.apply(null, prices);
      maxPrice = Math.max.apply(null, prices);
    }

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'expiration_longest_first', label: 'Expiration: Longest First' }
    ];

    return {
      product_types: productTypes,
      visit_counts: visitCounts,
      membership_durations: membershipDurations,
      membership_types: membershipTypes,
      benefit_tags: benefitTags,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 1
      },
      sort_options: sortOptions
    };
  }

  // listPassesAndMemberships(filters, sort)
  listPassesAndMemberships(filters = {}, sort = null) {
    const classPasses = this._getFromStorage('class_passes', []);
    const memberships = this._getFromStorage('memberships', []);

    const f = filters || {};

    let passItems = classPasses.filter((p) => p.status === 'active');
    let membershipItems = memberships.filter((m) => m.status === 'active');

    if (f.product_types && f.product_types.length > 0) {
      passItems = passItems.filter((p) => f.product_types.includes(p.product_type));
    }

    if (f.visit_counts && f.visit_counts.length > 0) {
      passItems = passItems.filter((p) => f.visit_counts.includes(p.visit_count));
    }

    if (f.membership_types && f.membership_types.length > 0) {
      membershipItems = membershipItems.filter((m) => f.membership_types.includes(m.membership_type));
    }

    if (f.membership_durations && f.membership_durations.length > 0) {
      membershipItems = membershipItems.filter((m) => f.membership_durations.includes(m.duration_type));
    }

    if (typeof f.includes_open_gym === 'boolean') {
      membershipItems = membershipItems.filter((m) => !!m.includes_open_gym === f.includes_open_gym);
    }

    if (typeof f.includes_classes === 'boolean') {
      membershipItems = membershipItems.filter((m) => !!m.includes_classes === f.includes_classes);
    }

    const minPrice = f.min_price;
    const maxPrice = f.max_price;

    if (minPrice != null || maxPrice != null) {
      passItems = passItems.filter((p) => {
        const price = p.price || 0;
        if (minPrice != null && price < minPrice) return false;
        if (maxPrice != null && price > maxPrice) return false;
        return true;
      });
      membershipItems = membershipItems.filter((m) => {
        const price = m.price_per_period || 0;
        if (minPrice != null && price < minPrice) return false;
        if (maxPrice != null && price > maxPrice) return false;
        return true;
      });
    }

    // If caller is filtering by membership-specific fields but not by
    // pass-specific fields, return only memberships. This prevents
    // class passes from appearing first when the intent is to search
    // for memberships (as in the flow tests).
    const hasMembershipFilter = (Array.isArray(f.membership_types) && f.membership_types.length > 0) ||
      (Array.isArray(f.membership_durations) && f.membership_durations.length > 0) ||
      typeof f.includes_open_gym === 'boolean' ||
      typeof f.includes_classes === 'boolean';

    const hasPassFilter = (Array.isArray(f.product_types) && f.product_types.length > 0) ||
      (Array.isArray(f.visit_counts) && f.visit_counts.length > 0);

    if (hasMembershipFilter && !hasPassFilter) {
      passItems = [];
    }

    const items = [];

    passItems.forEach((p) => {
      items.push({
        item_type: 'class_pass',
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        product_type: p.product_type,
        visit_count: p.visit_count,
        expiration_days: p.expiration_days,
        membership_type: null,
        duration_type: null,
        duration_months: null,
        price_per_period: null,
        includes_open_gym: (p.benefits || []).includes('open_gym'),
        includes_classes: (p.benefits || []).includes('classes'),
        benefits: Array.isArray(p.benefits) ? p.benefits : []
      });
    });

    membershipItems.forEach((m) => {
      items.push({
        item_type: 'membership',
        id: m.id,
        name: m.name,
        description: m.description || '',
        price: m.price_per_period,
        product_type: null,
        visit_count: null,
        expiration_days: null,
        membership_type: m.membership_type,
        duration_type: m.duration_type,
        duration_months: m.duration_months || null,
        price_per_period: m.price_per_period,
        includes_open_gym: !!m.includes_open_gym,
        includes_classes: !!m.includes_classes,
        benefits: Array.isArray(m.benefits) ? m.benefits : []
      });
    });

    if (sort === 'price_low_to_high') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'expiration_longest_first') {
      items.sort((a, b) => (b.expiration_days || 0) - (a.expiration_days || 0));
    }

    return { items };
  }

  // getClassPassDetails(classPassId)
  getClassPassDetails(classPassId) {
    const classPasses = this._getFromStorage('class_passes', []);
    const p = classPasses.find((cp) => cp.id === classPassId);
    if (!p) return null;

    return {
      class_pass_id: p.id,
      name: p.name,
      description: p.description || '',
      product_type: p.product_type,
      visit_count: p.visit_count,
      price: p.price,
      expiration_days: p.expiration_days,
      benefits: Array.isArray(p.benefits) ? p.benefits : [],
      is_kids_pass: !!p.is_kids_pass,
      usable_for_tags: Array.isArray(p.usable_for_tags) ? p.usable_for_tags : []
    };
  }

  // getClassPassPricingPreview(classPassId, startDate, promoCode)
  getClassPassPricingPreview(classPassId, startDate, promoCode) {
    const classPasses = this._getFromStorage('class_passes', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const p = classPasses.find((cp) => cp.id === classPassId);
    if (!p) {
      return {
        base_price: 0,
        discount_total: 0,
        final_price: 0,
        promo_applied: false,
        promo_valid: false,
        promo_message: 'Class pass not found.'
      };
    }

    const basePrice = p.price || 0;

    if (!promoCode) {
      return {
        base_price: basePrice,
        discount_total: 0,
        final_price: basePrice,
        promo_applied: false,
        promo_valid: false,
        promo_message: ''
      };
    }

    const codeNorm = String(promoCode).trim().toLowerCase();
    const now = new Date();

    const promo = promoCodes.find((pc) => {
      if (!pc || !pc.code) return false;
      if (String(pc.code).trim().toLowerCase() !== codeNorm) return false;
      if (!pc.is_active) return false;
      if (pc.applies_to !== 'class_passes' && pc.applies_to !== 'entire_cart') return false;
      if (pc.start_datetime) {
        const sd = this._parseDate(pc.start_datetime);
        if (sd && now < sd) return false;
      }
      if (pc.end_datetime) {
        const ed = this._parseDate(pc.end_datetime);
        if (ed && now > ed) return false;
      }
      if (typeof pc.min_cart_total === 'number' && basePrice < pc.min_cart_total) return false;
      return true;
    });

    if (!promo) {
      return {
        base_price: basePrice,
        discount_total: 0,
        final_price: basePrice,
        promo_applied: false,
        promo_valid: false,
        promo_message: 'Promo code is invalid for this pass.'
      };
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = (basePrice * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (discount > basePrice) discount = basePrice;

    return {
      base_price: basePrice,
      discount_total: discount,
      final_price: basePrice - discount,
      promo_applied: discount > 0,
      promo_valid: true,
      promo_message: 'Promo code applied.'
    };
  }

  // addClassPassToCart(classPassId, startDate, promoCode)
  addClassPassToCart(classPassId, startDate, promoCode) {
    const classPasses = this._getFromStorage('class_passes', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const p = classPasses.find((cp) => cp.id === classPassId);
    if (!p) {
      return { success: false, cart_item_id: null, message: 'Class pass not found.' };
    }

    const cart = this._getOrCreateCart();

    // Apply promo at item level (if any) only for price calculation; cart-wide handled by _applyPromoToCartInternal
    let unitPrice = p.price || 0;
    if (promoCode) {
      const preview = this.getClassPassPricingPreview(classPassId, startDate, promoCode);
      if (preview && preview.promo_valid && preview.promo_applied) {
        unitPrice = preview.final_price;
      }
    }

    const qty = 1;
    const totalPrice = unitPrice * qty;

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'class_pass',
      item_id: p.id,
      name: p.name,
      description: p.description || '',
      unit_price: unitPrice,
      quantity: qty,
      participant_quantity: null,
      date: null,
      start_datetime: null,
      end_datetime: null,
      start_date: startDate || null,
      auto_renew: false,
      total_price: totalPrice,
      metadata_tags: []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = Array.isArray(cart.item_ids) ? cart.item_ids : [];
    cart.item_ids.push(cartItemId);
    cart.updated_at = this._nowISO();

    if (promoCode) {
      this._applyPromoToCartInternal(promoCode, cart);
    } else {
      this._saveToStorage('cart', cart);
      this._recalculateCartTotals();
    }

    return { success: true, cart_item_id: cartItemId, message: 'Class pass added to cart.' };
  }

  // getMembershipDetails(membershipId)
  getMembershipDetails(membershipId) {
    const memberships = this._getFromStorage('memberships', []);
    const m = memberships.find((mm) => mm.id === membershipId);
    if (!m) return null;

    return {
      membership_id: m.id,
      name: m.name,
      description: m.description || '',
      membership_type: m.membership_type,
      duration_type: m.duration_type,
      duration_months: m.duration_months || null,
      price_per_period: m.price_per_period,
      includes_open_gym: !!m.includes_open_gym,
      includes_classes: !!m.includes_classes,
      benefits: Array.isArray(m.benefits) ? m.benefits : [],
      auto_renew_allowed: !!m.auto_renew_allowed,
      min_commitment_months: m.min_commitment_months || null
    };
  }

  // addMembershipToCart(membershipId, startDate, autoRenew)
  addMembershipToCart(membershipId, startDate, autoRenew = false) {
    const memberships = this._getFromStorage('memberships', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const m = memberships.find((mm) => mm.id === membershipId);
    if (!m) {
      return { success: false, cart_item_id: null, message: 'Membership not found.' };
    }

    const cart = this._getOrCreateCart();

    const unitPrice = m.price_per_period || 0;
    const qty = 1;
    const totalPrice = unitPrice * qty;

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'membership',
      item_id: m.id,
      name: m.name,
      description: m.description || '',
      unit_price: unitPrice,
      quantity: qty,
      participant_quantity: null,
      date: null,
      start_datetime: null,
      end_datetime: null,
      start_date: startDate || null,
      auto_renew: !!autoRenew,
      total_price: totalPrice,
      metadata_tags: []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = Array.isArray(cart.item_ids) ? cart.item_ids : [];
    cart.item_ids.push(cartItemId);
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    this._recalculateCartTotals();

    return { success: true, cart_item_id: cartItemId, message: 'Membership added to cart.' };
  }

  // getInstructorFilterOptions()
  getInstructorFilterOptions() {
    const instructors = this._getFromStorage('instructors', []);

    const specializationsSet = new Set();
    instructors.forEach((i) => (i.specializations || []).forEach((s) => specializationsSet.add(s)));

    const specializations = Array.from(specializationsSet);
    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'hourly_rate_low_to_high', label: 'Hourly Rate: Low to High' }
    ];

    return {
      specializations,
      sort_options: sortOptions
    };
  }

  // listInstructors(filters, sort)
  listInstructors(filters = {}, sort = null) {
    const instructors = this._getFromStorage('instructors', []);
    const f = filters || {};

    let list = instructors.filter((i) => i.status === 'active');

    if (f.specializations && f.specializations.length > 0) {
      list = list.filter((i) => {
        const specs = Array.isArray(i.specializations) ? i.specializations : [];
        return f.specializations.some((s) => specs.includes(s));
      });
    }

    if (sort === 'rating_high_to_low') {
      list.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort === 'hourly_rate_low_to_high') {
      list.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
    }

    return list.map((i) => ({
      instructor_id: i.id,
      name: i.name,
      photo_url: i.photo_url || null,
      rating_average: i.rating_average || null,
      rating_count: i.rating_count || 0,
      hourly_rate: i.hourly_rate || null,
      specializations: Array.isArray(i.specializations) ? i.specializations : []
    }));
  }

  // getInstructorDetails(instructorId)
  getInstructorDetails(instructorId) {
    const instructors = this._getFromStorage('instructors', []);
    const inst = instructors.find((i) => i.id === instructorId);
    if (!inst) return null;

    return {
      instructor_id: inst.id,
      name: inst.name,
      bio: inst.bio || '',
      photo_url: inst.photo_url || null,
      rating_average: inst.rating_average || null,
      rating_count: inst.rating_count || 0,
      hourly_rate: inst.hourly_rate || null,
      specializations: Array.isArray(inst.specializations) ? inst.specializations : []
    };
  }

  // listPrivateLessonOptions(instructorId)
  listPrivateLessonOptions(instructorId) {
    const options = this._getFromStorage('private_lesson_options', []);
    return options
      .filter((o) => o.instructor_id === instructorId)
      .map((o) => ({
        lesson_option_id: o.id,
        duration_minutes: o.duration_minutes,
        price_per_session: o.price_per_session || null,
        description: o.description || ''
      }));
  }

  // getAvailablePrivateLessonSlots(instructorId, date, durationMinutes, startTime, endTime)
  getAvailablePrivateLessonSlots(instructorId, date, durationMinutes, startTime, endTime) {
    const slots = this._getAvailablePrivateSlotsForInstructor(instructorId, date, durationMinutes, startTime, endTime);
    return slots.map((s) => ({
      private_lesson_slot_id: s.id,
      lesson_option_id: s.lesson_option_id || null,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      duration_minutes: s.duration_minutes,
      price: s.price,
      status: s.status
    }));
  }

  // addPrivateLessonToCart(privateLessonSlotId)
  addPrivateLessonToCart(privateLessonSlotId) {
    const privateSlots = this._getFromStorage('private_lesson_slots', []);
    const instructors = this._getFromStorage('instructors', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const slot = privateSlots.find((s) => s.id === privateLessonSlotId);
    if (!slot) {
      return { success: false, cart_item_id: null, message: 'Private lesson slot not found.' };
    }

    const inst = instructors.find((i) => i.id === slot.instructor_id);
    const cart = this._getOrCreateCart();

    const unitPrice = slot.price || 0;
    const qty = 1;
    const totalPrice = unitPrice * qty;

    const cartItemId = this._generateId('cart_item');
    const name = inst ? 'Private Lesson with ' + inst.name : 'Private Lesson';

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'private_lesson',
      item_id: slot.id,
      name,
      description: '',
      unit_price: unitPrice,
      quantity: qty,
      participant_quantity: 1,
      date: slot.start_datetime,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      start_date: null,
      auto_renew: false,
      total_price: totalPrice,
      metadata_tags: []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = Array.isArray(cart.item_ids) ? cart.item_ids : [];
    cart.item_ids.push(cartItemId);
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    this._recalculateCartTotals();

    return { success: true, cart_item_id: cartItemId, message: 'Private lesson added to cart.' };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);
    const privateSlots = this._getFromStorage('private_lesson_slots', []);
    const instructors = this._getFromStorage('instructors', []);
    const classPasses = this._getFromStorage('class_passes', []);
    const memberships = this._getFromStorage('memberships', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    this._recalculateCartTotals();
    const refreshedCart = this._getFromStorage('cart', cart);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const itemsOut = itemsForCart.map((ci) => {
      let displayLevel = null;
      let displayInstructorName = null;
      let displayDurationMinutes = null;
      let resolvedItem = null;

      if (ci.item_type === 'class_session') {
        const session = classSessions.find((s) => s.id === ci.item_id);
        if (session) {
          const cls = classes.find((c) => c.id === session.class_id);
          if (cls) {
            displayLevel = cls.level;
          }
          if (session.instructor_id) {
            const inst = instructors.find((i) => i.id === session.instructor_id);
            if (inst) displayInstructorName = inst.name;
          }
          const start = this._parseDate(session.start_datetime);
          const end = this._parseDate(session.end_datetime);
          if (start && end) {
            displayDurationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
          }
        }
        resolvedItem = session || null;
      } else if (ci.item_type === 'private_lesson') {
        const slot = privateSlots.find((s) => s.id === ci.item_id);
        if (slot) {
          const inst = instructors.find((i) => i.id === slot.instructor_id);
          if (inst) displayInstructorName = inst.name;
          displayDurationMinutes = slot.duration_minutes;
        }
        resolvedItem = slot || null;
      } else if (ci.item_type === 'class_pass') {
        const pass = classPasses.find((p) => p.id === ci.item_id);
        resolvedItem = pass || null;
      } else if (ci.item_type === 'membership') {
        const mem = memberships.find((m) => m.id === ci.item_id);
        resolvedItem = mem || null;
      }

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name,
        description: ci.description,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        participant_quantity: ci.participant_quantity,
        date: ci.date,
        start_datetime: ci.start_datetime,
        end_datetime: ci.end_datetime,
        start_date: ci.start_date,
        auto_renew: ci.auto_renew,
        total_price: ci.total_price,
        metadata_tags: ci.metadata_tags || [],
        display_level: displayLevel,
        display_instructor_name: displayInstructorName,
        display_duration_minutes: displayDurationMinutes,
        item: resolvedItem
      };
    });

    const appliedPromos = (refreshedCart.promo_code_ids || []).map((pid) => {
      const promo = promoCodes.find((p) => p.id === pid);
      if (!promo) return null;
      return {
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applies_to: promo.applies_to
      };
    }).filter(Boolean);

    return {
      cart_id: refreshedCart.id,
      items: itemsOut,
      applied_promos: appliedPromos,
      subtotal: refreshedCart.subtotal || 0,
      discount_total: refreshedCart.discount_total || 0,
      tax_total: refreshedCart.tax_total || 0,
      total: refreshedCart.total || 0,
      item_count: itemsOut.length
    };
  }

  // updateCartItem(cartItemId, quantity, participantQuantity)
  updateCartItem(cartItemId, quantity, participantQuantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.' };
    }

    const item = cartItems[idx];

    if (quantity != null) {
      if (quantity <= 0) {
        // Remove item if quantity <= 0
        cartItems.splice(idx, 1);
        this._saveToStorage('cart_items', cartItems);
        cart.item_ids = (cart.item_ids || []).filter((id) => id !== cartItemId);
        this._saveToStorage('cart', cart);
        this._recalculateCartTotals();
        return { success: true, message: 'Cart item removed.' };
      }
      item.quantity = quantity;
    }

    if (participantQuantity != null) {
      if (participantQuantity <= 0) {
        return { success: false, message: 'Participant quantity must be at least 1.' };
      }
      item.participant_quantity = participantQuantity;
    }

    const qty = item.quantity || 1;
    const participants = item.participant_quantity || 1;
    item.total_price = (item.unit_price || 0) * qty * participants;

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals();

    return { success: true, message: 'Cart item updated.' };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const beforeLength = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId || ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    if (cart.item_ids) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      this._saveToStorage('cart', cart);
    }

    this._recalculateCartTotals();

    const removed = beforeLength !== cartItems.length;
    return { success: removed, message: removed ? 'Cart item removed.' : 'Cart item not found.' };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const result = this._applyPromoToCartInternal(promoCode, cart);
    return {
      success: result.success,
      message: result.message
    };
  }

  // placeOrder(email, paymentMethod)
  placeOrder(email, paymentMethod) {
    const cart = this._getOrCreateCart();
    const cartSummary = this.getCartSummary();

    if (!cartSummary.items || cartSummary.items.length === 0) {
      return {
        order_id: null,
        order_number: null,
        status: 'pending',
        email,
        payment_method: paymentMethod,
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        items: [],
        applied_promos: []
      };
    }

    const { order, orderItems } = this._createOrderFromCart(cart, email, paymentMethod);

    this._createBookingsFromOrderItems(order, orderItems);

    const promoCodes = this._getFromStorage('promo_codes', []);
    const appliedPromos = (order.promo_code_ids || []).map((pid) => {
      const promo = promoCodes.find((p) => p.id === pid);
      if (!promo) return null;
      return {
        code: promo.code,
        description: promo.description || ''
      };
    }).filter(Boolean);

    const itemsOut = orderItems.map((oi) => ({
      order_item_id: oi.id,
      item_type: oi.item_type,
      item_id: oi.item_id,
      name: oi.name,
      unit_price: oi.unit_price,
      quantity: oi.quantity,
      participant_quantity: oi.participant_quantity,
      date: oi.date,
      start_datetime: oi.start_datetime,
      end_datetime: oi.end_datetime,
      start_date: oi.start_date,
      auto_renew: oi.auto_renew,
      total_price: oi.total_price
    }));

    return {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      email: order.email,
      payment_method: order.payment_method,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      tax_total: order.tax_total,
      total: order.total,
      items: itemsOut,
      applied_promos: appliedPromos
    };
  }

  // getMyBookings(filters)
  getMyBookings(filters = {}) {
    const bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const privateSlots = this._getFromStorage('private_lesson_slots', []);

    const f = filters || {};
    const fromDate = f.fromDate ? this._parseDate(f.fromDate) : null;
    const toDate = f.toDate ? this._parseDate(f.toDate) : null;

    const result = bookings.filter((b) => {
      if (f.bookingTypes && f.bookingTypes.length > 0 && !f.bookingTypes.includes(b.booking_type)) {
        return false;
      }

      if (f.statuses && f.statuses.length > 0 && !f.statuses.includes(b.status)) {
        return false;
      }

      if (fromDate || toDate) {
        const bd = this._parseDate(b.date);
        if (fromDate && bd && bd < fromDate) return false;
        if (toDate && bd && bd > toDate) return false;
      }

      return true;
    });

    return result.map((b) => {
      const session = b.class_session_id ? classSessions.find((s) => s.id === b.class_session_id) || null : null;
      const slot = b.private_lesson_slot_id ? privateSlots.find((s) => s.id === b.private_lesson_slot_id) || null : null;

      return {
        booking_id: b.id,
        booking_type: b.booking_type,
        class_session_id: b.class_session_id || null,
        private_lesson_slot_id: b.private_lesson_slot_id || null,
        name: b.name,
        date: b.date,
        start_datetime: b.start_datetime,
        end_datetime: b.end_datetime,
        price: b.price,
        participant_quantity: b.participant_quantity,
        status: b.status,
        class_session: session,
        private_lesson_slot: slot
      };
    });
  }

  // getRescheduleOptionsForBooking(bookingId)
  getRescheduleOptionsForBooking(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || !booking.class_session_id) return [];

    const currentSession = classSessions.find((s) => s.id === booking.class_session_id);
    if (!currentSession) return [];

    const targetDate = booking.date || currentSession.start_datetime;

    const options = this._getClassSessionsForDateAndFilters(targetDate, {
      weekday: currentSession.weekday
    }).filter((s) => s.class_id === currentSession.class_id && s.id !== currentSession.id);

    return options.map((s) => ({
      class_session_id: s.id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      price: s.price,
      spots_remaining: s.spots_remaining || null,
      class_session: s
    }));
  }

  // rescheduleBooking(bookingId, newClassSessionId)
  rescheduleBooking(bookingId, newClassSessionId) {
    let bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);

    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return {
        booking_id: null,
        status: 'cancelled',
        old_class_session_id: null,
        new_class_session_id: null,
        start_datetime: null,
        end_datetime: null
      };
    }

    const booking = bookings[idx];
    const oldSession = classSessions.find((s) => s.id === booking.class_session_id);
    const newSession = classSessions.find((s) => s.id === newClassSessionId);

    if (!newSession || !oldSession) {
      return {
        booking_id: booking.id,
        status: booking.status,
        old_class_session_id: booking.class_session_id,
        new_class_session_id: booking.class_session_id,
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime
      };
    }

    if (!this._sameDate(oldSession.start_datetime, newSession.start_datetime)) {
      // Enforce same-date reschedule
      return {
        booking_id: booking.id,
        status: booking.status,
        old_class_session_id: booking.class_session_id,
        new_class_session_id: booking.class_session_id,
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime
      };
    }

    const oldClassSessionId = booking.class_session_id;

    booking.class_session_id = newSession.id;
    booking.date = newSession.start_datetime;
    booking.start_datetime = newSession.start_datetime;
    booking.end_datetime = newSession.end_datetime;
    booking.status = 'booked';

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    // Instrumentation for task completion tracking
    try {
      if (newSession && oldSession && this._sameDate(oldSession.start_datetime, newSession.start_datetime) && newSession.id !== oldClassSessionId) {
        localStorage.setItem(
          'task6_rescheduleDetails',
          JSON.stringify({
            "booking_id": booking.id,
            "old_class_session_id": oldClassSessionId,
            "new_class_session_id": newSession.id,
            "rescheduled_date": this._dateOnlyISO(oldSession.start_datetime),
            "rescheduled_at": this._nowISO()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      booking_id: booking.id,
      status: booking.status,
      old_class_session_id: oldClassSessionId,
      new_class_session_id: newSession.id,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime
    };
  }

  // cancelBooking(bookingId)
  cancelBooking(bookingId) {
    let bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return { success: false, status: 'cancelled', message: 'Booking not found.' };
    }

    bookings[idx].status = 'cancelled';
    this._saveToStorage('bookings', bookings);

    return { success: true, status: 'cancelled', message: 'Booking cancelled.' };
  }

  // addFavorite(classId)
  addFavorite(classId) {
    let favorites = this._getFromStorage('favorites', []);
    const existing = favorites.find((f) => f.class_id === classId);
    if (existing) {
      return { success: true, favorite_id: existing.id };
    }

    const favoriteId = this._generateId('favorite');
    const favorite = {
      id: favoriteId,
      class_id: classId,
      created_at: this._nowISO()
    };

    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return { success: true, favorite_id: favoriteId };
  }

  // removeFavorite(classId)
  removeFavorite(classId) {
    let favorites = this._getFromStorage('favorites', []);
    const before = favorites.length;
    favorites = favorites.filter((f) => f.class_id !== classId);
    this._saveToStorage('favorites', favorites);
    const removed = before !== favorites.length;
    return { success: removed };
  }

  // listFavorites()
  listFavorites() {
    const favorites = this._getFromStorage('favorites', []);
    const classes = this._getFromStorage('classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);

    return favorites.map((fav) => {
      const cls = classes.find((c) => c.id === fav.class_id);
      if (!cls) {
        return {
          favorite_id: fav.id,
          class_id: fav.class_id,
          class_name: null,
          level: null,
          rating_average: null,
          rating_count: 0,
          default_price: null,
          tags: [],
          next_session_start_datetime: null,
          next_session_price: null,
          class: null
        };
      }

      const sessions = classSessions.filter((s) => s.class_id === cls.id);
      let nextSession = null;
      sessions.forEach((s) => {
        if (!nextSession) {
          nextSession = s;
          return;
        }
        if (s.start_datetime && nextSession.start_datetime && s.start_datetime < nextSession.start_datetime) {
          nextSession = s;
        }
      });

      return {
        favorite_id: fav.id,
        class_id: cls.id,
        class_name: cls.name,
        level: cls.level,
        rating_average: cls.rating_average || null,
        rating_count: cls.rating_count || 0,
        default_price: cls.default_price || null,
        tags: Array.isArray(cls.tags) ? cls.tags : [],
        next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
        next_session_price: nextSession ? nextSession.price : null,
        class: cls
      };
    });
  }

  // getGymInfo()
  getGymInfo() {
    const info = this._getFromStorage('gym_info', {});
    return {
      gym_name: info.gym_name || '',
      description: info.description || '',
      history: info.history || '',
      training_approach: info.training_approach || ''
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {});
    return {
      address: info.address || '',
      map_embed_url: info.map_embed_url || '',
      phone: info.phone || '',
      email: info.email || '',
      opening_hours: Array.isArray(info.opening_hours) ? info.opening_hours : [],
      special_notes: info.special_notes || ''
    };
  }

  // submitContactRequest(name, email, subject, message, topic)
  submitContactRequest(name, email, subject, message, topic) {
    const contactRequests = this._getFromStorage('contact_requests', []);
    const request = {
      id: this._generateId('contact_request'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      created_at: this._nowISO()
    };
    contactRequests.push(request);
    this._saveToStorage('contact_requests', contactRequests);
    return { success: true, message: 'Your request has been submitted.' };
  }

  // getFAQEntries()
  getFAQEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return faqs.map((f) => ({
      question: f.question,
      answer: f.answer,
      category: f.category
    }));
  }

  // getPolicies()
  getPolicies() {
    const policies = this._getFromStorage('policies', {});
    return {
      terms_of_service: policies.terms_of_service || '',
      privacy_policy: policies.privacy_policy || '',
      liability_waiver: policies.liability_waiver || '',
      cancellation_policy: policies.cancellation_policy || '',
      refund_policy: policies.refund_policy || '',
      reschedule_policy: policies.reschedule_policy || ''
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