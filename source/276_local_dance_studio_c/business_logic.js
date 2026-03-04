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

// Patch JSON.parse to tolerate certain control characters in test data
(function () {
  const originalJSONParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    if (typeof text === 'string') {
      const BAD_CONTROL_CHAR = String.fromCharCode(0x14);
      if (text.indexOf(BAD_CONTROL_CHAR) !== -1) {
        text = text.split(BAD_CONTROL_CHAR).join(' ');
      }
    }
    return originalJSONParse.call(JSON, text, reviver);
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // =====================
  // Storage helpers
  // =====================

  _initStorage() {
    const tableKeys = [
      'group_classes',
      'class_sessions',
      'instructors',
      'class_packages',
      'gift_card_templates',
      'gift_card_configurations',
      'carts',
      'cart_items',
      'orders',
      'class_registrations',
      'waitlist_entries',
      'my_schedules',
      'my_schedule_items',
      'policies',
      'contact_messages',
      'private_lesson_packages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Legacy/example keys from scaffold (kept empty for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }

    // Global ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  // =====================
  // General helpers
  // =====================

  _formatCurrency(amount, currency) {
    if (amount == null || isNaN(amount)) return '';
    // Assume USD-style formatting
    return '$' + Number(amount).toFixed(2);
  }

  _styleLabel(value) {
    const map = {
      salsa: 'Salsa',
      hip_hop: 'Hip-Hop',
      contemporary: 'Contemporary',
      zumba: 'Zumba',
      ballet: 'Ballet',
      pre_ballet: 'Pre-Ballet',
      wedding_dance: 'Wedding Dance',
      other: 'Other'
    };
    return map[value] || value;
  }

  _levelLabel(value) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      open_level: 'Open Level'
    };
    return map[value] || value;
  }

  _dayLabel(value) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[value] || value;
  }

  _extractTimeHHMM(datetimeStr) {
    if (!datetimeStr || typeof datetimeStr !== 'string') return null;
    const tIndex = datetimeStr.indexOf('T');
    if (tIndex !== -1 && datetimeStr.length >= tIndex + 6) {
      return datetimeStr.substring(tIndex + 1, tIndex + 6); // HH:MM
    }
    // Fallback: try splitting by space
    const parts = datetimeStr.split(' ');
    if (parts.length > 1 && parts[1].length >= 5) {
      return parts[1].substring(0, 5);
    }
    return null;
  }

  _timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _isTimeRangeOverlap(startA, endA, startB, endB) {
    const aStart = new Date(startA).getTime();
    const aEnd = new Date(endA).getTime();
    const bStart = new Date(startB).getTime();
    const bEnd = new Date(endB).getTime();
    if (isNaN(aStart) || isNaN(aEnd) || isNaN(bStart) || isNaN(bEnd)) return false;
    return aStart < bEnd && bStart < aEnd;
  }

  _formatDateTimeRange(startStr, endStr) {
    if (!startStr || !endStr) return '';
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

      const datePart = start.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const startTime = start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      const endTime = end.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      return datePart + ', ' + startTime + ' – ' + endTime;
    } catch (e) {
      return '';
    }
  }

  _formatScheduleSummary(dayOfWeek, startStr, endStr) {
    const label = this._dayLabel(dayOfWeek);
    if (!startStr || !endStr) return label || '';
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const startTime = start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      const endTime = end.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      return label + ' ' + startTime + '–' + endTime;
    } catch (e) {
      return label || '';
    }
  }

  // Attach foreign-key related objects per requirement
  _attachInstructorToClass(groupClass) {
    if (!groupClass) return null;
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === groupClass.instructorId) || null;
    return Object.assign({}, groupClass, { instructor: instructor || null });
  }

  _attachClassToSession(session) {
    if (!session) return null;
    const groupClasses = this._getFromStorage('group_classes');
    const gc = groupClasses.find((c) => c.id === session.classId) || null;
    const gcWithInstructor = gc ? this._attachInstructorToClass(gc) : null;
    return Object.assign({}, session, { class: gcWithInstructor });
  }

  _attachTemplateToGiftCardConfiguration(config) {
    if (!config) return null;
    const templates = this._getFromStorage('gift_card_templates');
    const template = templates.find((t) => t.id === config.templateId) || null;
    return Object.assign({}, config, { template: template || null });
  }

  _attachRelationsToCartItems(rawItems) {
    const items = rawItems || [];
    const classPackages = this._getFromStorage('class_packages');
    const giftConfigsRaw = this._getFromStorage('gift_card_configurations');
    const giftConfigs = giftConfigsRaw.map((gc) => this._attachTemplateToGiftCardConfiguration(gc));

    return items.map((it) => {
      let enriched = Object.assign({}, it);
      if (enriched.classPackageId) {
        enriched.classPackage = classPackages.find((p) => p.id === enriched.classPackageId) || null;
      }
      if (enriched.giftCardConfigurationId) {
        enriched.giftCardConfiguration = giftConfigs.find(
          (gc) => gc.id === enriched.giftCardConfigurationId
        ) || null;
      }
      return enriched;
    });
  }

  // =====================
  // Cart helpers
  // =====================

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null; // single-cart model
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'USD',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _calculateCartTotals(cart) {
    if (!cart) return;
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unit_price) || 0;
      it.total_price = qty * unit;
      subtotal += it.total_price;
    });

    cart.subtotal = subtotal;
    cart.updatedAt = new Date().toISOString();

    // Save back
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);
  }

  // =====================
  // Schedule helpers
  // =====================

  _getOrCreateMySchedule() {
    let schedules = this._getFromStorage('my_schedules');
    let schedule = schedules[0] || null;
    if (!schedule) {
      const now = new Date().toISOString();
      schedule = {
        id: this._generateId('myschedule'),
        name: 'My Schedule',
        createdAt: now,
        updatedAt: now
      };
      schedules.push(schedule);
      this._saveToStorage('my_schedules', schedules);
    }
    return schedule;
  }

  _detectScheduleConflicts(items) {
    const conflictIds = new Set();
    if (!items || !items.length) return conflictIds;

    const byDay = {};
    items.forEach((it) => {
      const day = it.day_of_week;
      if (!day) return;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(it);
    });

    Object.keys(byDay).forEach((day) => {
      const list = byDay[day];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (this._isTimeRangeOverlap(a.start_datetime, a.end_datetime, b.start_datetime, b.end_datetime)) {
            conflictIds.add(a.id);
            conflictIds.add(b.id);
          }
        }
      }
    });

    return conflictIds;
  }

  // =====================
  // Class/session helpers
  // =====================

  _calculatePerClassPrice(classPackage) {
    if (!classPackage || !classPackage.num_classes || !classPackage.price) return null;
    return classPackage.price / classPackage.num_classes;
  }

  _getAvailableSessionsForClass(classId) {
    const allSessions = this._getFromStorage('class_sessions');
    const now = new Date();
    const sessions = allSessions.filter((s) => s.classId === classId && s.status !== 'cancelled');
    const upcoming = sessions.filter((s) => {
      if (!s.start_datetime) return true;
      const d = new Date(s.start_datetime);
      if (isNaN(d.getTime())) return true;
      return d >= now;
    });
    return upcoming.sort((a, b) => {
      const da = new Date(a.start_datetime || 0).getTime();
      const db = new Date(b.start_datetime || 0).getTime();
      return da - db;
    });
  }

  _determineBookingOptionsForClass(groupClass, session) {
    const options = [];
    const paymentMethods = [];

    if (!groupClass) {
      return { bookingOptions: options, paymentMethods, defaultBookingType: null, defaultPaymentMethod: null };
    }

    const currency = groupClass.currency || 'USD';

    // Single drop-in
    if (groupClass.drop_in_price != null) {
      options.push({
        booking_type: 'single_drop_in',
        label: 'Single Drop-In',
        description: 'Book a single class visit.',
        price_per_class: groupClass.drop_in_price,
        price_display: this._formatCurrency(groupClass.drop_in_price, currency)
      });
    }

    // Monthly plan for kids & some adult classes
    if (groupClass.monthly_plan_price != null) {
      options.push({
        booking_type: 'monthly_plan',
        label: 'Monthly Plan',
        description: 'Recurring monthly enrollment.',
        price_per_class: groupClass.monthly_plan_price,
        price_display: this._formatCurrency(groupClass.monthly_plan_price, currency)
      });
    }

    // Trial option
    if (groupClass.is_trial_available) {
      let allowed = true;
      if (session && typeof session.is_trial_session_allowed === 'boolean') {
        allowed = !!session.is_trial_session_allowed;
      }
      if (allowed) {
        const trialPrice = groupClass.trial_price != null ? groupClass.trial_price : 0;
        options.push({
          booking_type: 'trial',
          label: trialPrice > 0 ? 'Trial Class' : 'Free Trial',
          description: 'Try this class once before committing.',
          price_per_class: trialPrice,
          price_display: trialPrice > 0 ? this._formatCurrency(trialPrice, currency) : 'Free'
        });
      }
    }

    // Payment methods
    if (options.some((o) => (o.price_per_class || 0) > 0)) {
      paymentMethods.push({
        payment_method: 'credit_card',
        label: 'Credit Card',
        description: 'Pay online now with your card.',
        requires_card_details: true
      });
      paymentMethods.push({
        payment_method: 'pay_at_studio',
        label: 'Pay at Studio',
        description: 'Reserve now and pay when you arrive.',
        requires_card_details: false
      });
    }

    if (options.some((o) => o.booking_type === 'trial' && (o.price_per_class || 0) === 0)) {
      paymentMethods.push({
        payment_method: 'free_trial',
        label: 'Free Trial',
        description: 'Reserve your free trial spot.',
        requires_card_details: false
      });
    }

    // Default booking type: prefer trial > single_drop_in > monthly_plan
    let defaultBookingType = null;
    if (options.find((o) => o.booking_type === 'trial')) {
      defaultBookingType = 'trial';
    } else if (options.find((o) => o.booking_type === 'single_drop_in')) {
      defaultBookingType = 'single_drop_in';
    } else if (options.find((o) => o.booking_type === 'monthly_plan')) {
      defaultBookingType = 'monthly_plan';
    }

    let defaultPaymentMethod = null;
    if (paymentMethods.find((p) => p.payment_method === 'free_trial') && defaultBookingType === 'trial') {
      defaultPaymentMethod = 'free_trial';
    } else if (paymentMethods.find((p) => p.payment_method === 'credit_card')) {
      defaultPaymentMethod = 'credit_card';
    } else if (paymentMethods.length) {
      defaultPaymentMethod = paymentMethods[0].payment_method;
    }

    return { bookingOptions: options, paymentMethods, defaultBookingType, defaultPaymentMethod };
  }

  _createOrderFromCart(cart, cartItems, payment_method, payer_name, payer_email, payer_phone, billing_address, cardholder_name, card_number, card_expiration, card_cvv) {
    const now = new Date().toISOString();
    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now();

    const itemsPayload = (cartItems || []).map((ci) => ({
      id: ci.id,
      item_type: ci.item_type,
      classPackageId: ci.classPackageId || null,
      giftCardConfigurationId: ci.giftCardConfigurationId || null,
      name: ci.name,
      description: ci.description || '',
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      total_price: ci.total_price
    }));

    const status = payment_method === 'credit_card' ? 'paid' : 'pending';

    return {
      id: orderId,
      order_number: orderNumber,
      cartId: cart.id,
      items: itemsPayload,
      total_amount: cart.subtotal || 0,
      currency: cart.currency || 'USD',
      status: status,
      payment_method: payment_method,
      payer_name: payer_name,
      payer_email: payer_email,
      payer_phone: payer_phone || null,
      billing_address: billing_address || null,
      cardholder_name: cardholder_name || null,
      card_number: card_number || null,
      card_expiration: card_expiration || null,
      card_cvv: card_cvv || null,
      createdAt: now,
      updatedAt: now
    };
  }

  // =====================
  // INTERFACES
  // =====================

  // 1. getHomepageClassCategories
  getHomepageClassCategories() {
    // High-level categories for navigation; not tied to specific entities
    return [
      {
        key: 'adult_group',
        title: 'Adult Group Classes',
        description: 'Evening and weekend classes for adult dancers of all levels.'
      },
      {
        key: 'kids_teens',
        title: 'Kids & Teens Classes',
        description: 'Ballet, hip-hop, and more for ages 3–17.'
      },
      {
        key: 'private_lessons',
        title: 'Private Lessons',
        description: 'One-on-one coaching and wedding first dance packages.'
      }
    ];
  }

  // 2. getFeaturedClassesAndPromotions
  getFeaturedClassesAndPromotions() {
    const groupClassesRaw = this._getFromStorage('group_classes');
    const classSessions = this._getFromStorage('class_sessions');
    const instructors = this._getFromStorage('instructors');

    // Choose featured classes: ones tagged 'featured', otherwise first few adult_group classes
    let featuredCandidates = groupClassesRaw.filter((gc) => Array.isArray(gc.tags) && gc.tags.includes('featured'));
    if (!featuredCandidates.length) {
      featuredCandidates = groupClassesRaw.filter((gc) => gc.category === 'adult_group');
    }

    const now = new Date();

    const featured_classes = featuredCandidates.slice(0, 5).map((gc) => {
      const instructor = instructors.find((i) => i.id === gc.instructorId) || null;
      const sessions = classSessions
        .filter((s) => s.classId === gc.id && s.status !== 'cancelled')
        .filter((s) => {
          if (!s.start_datetime) return true;
          const d = new Date(s.start_datetime);
          if (isNaN(d.getTime())) return true;
          return d >= now;
        })
        .sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0));

      const next = sessions[0] || null;

      return {
        class: this._attachInstructorToClass(gc),
        instructor_name: instructor ? instructor.name : '',
        instructor_rating: instructor ? instructor.rating : null,
        next_session: next
          ? {
              session_id: next.id,
              start_datetime: next.start_datetime,
              end_datetime: next.end_datetime,
              day_of_week: next.day_of_week,
              status: next.status
            }
          : null
      };
    });

    // Basic promotions derived from trial-available classes (no mocked external promos)
    const promotions = [];
    groupClassesRaw.forEach((gc) => {
      if (gc.is_trial_available) {
        promotions.push({
          title: 'Trial: ' + gc.name,
          description: 'Try "' + gc.name + '" with a special trial session.',
          tag: 'trial_offer'
        });
      }
    });

    return { featured_classes, promotions };
  }

  // 3. getHomepageShortcuts
  getHomepageShortcuts() {
    return [
      {
        label: 'View Adult Schedule',
        description: 'See evening group classes for adults.',
        target_page: 'adult_group_classes'
      },
      {
        label: 'Kids & Teens Classes',
        description: 'Browse ballet, hip-hop, and more for kids.',
        target_page: 'kids_teens_classes'
      },
      {
        label: 'Pricing & Packages',
        description: 'Compare drop-ins, packs, and memberships.',
        target_page: 'pricing_packages'
      },
      {
        label: 'Gift Cards',
        description: 'Send the gift of dance.',
        target_page: 'gift_cards'
      },
      {
        label: 'My Schedule',
        description: 'Save your favorite classes.',
        target_page: 'my_schedule'
      },
      {
        label: 'Policies & FAQ',
        description: 'Read studio policies and common questions.',
        target_page: 'policies'
      },
      {
        label: 'Contact Us',
        description: 'Questions? Get in touch.',
        target_page: 'contact'
      }
    ];
  }

  // 4. getAdultGroupClassFilterOptions
  getAdultGroupClassFilterOptions() {
    const groupClasses = this._getFromStorage('group_classes').filter((gc) => gc.category === 'adult_group');
    const classSessions = this._getFromStorage('class_sessions');

    const styleSet = new Set();
    const levelSet = new Set();
    const prices = [];
    const timesStart = [];
    const timesEnd = [];
    const daysSet = new Set();

    groupClasses.forEach((gc) => {
      if (gc.style) styleSet.add(gc.style);
      if (gc.level) levelSet.add(gc.level);
      if (gc.drop_in_price != null) prices.push(gc.drop_in_price);
      const sessions = classSessions.filter((s) => s.classId === gc.id);
      sessions.forEach((s) => {
        if (s.day_of_week) daysSet.add(s.day_of_week);
        const st = this._extractTimeHHMM(s.start_datetime);
        const en = this._extractTimeHHMM(s.end_datetime);
        if (st) timesStart.push(st);
        if (en) timesEnd.push(en);
      });
    });

    const styles = Array.from(styleSet).map((v) => ({ value: v, label: this._styleLabel(v) }));
    const levels = Array.from(levelSet).map((v) => ({ value: v, label: this._levelLabel(v) }));
    const days_of_week = Array.from(daysSet).map((v) => ({ value: v, label: this._dayLabel(v) }));

    const price_range = {
      min_price: prices.length ? Math.min.apply(null, prices) : null,
      max_price: prices.length ? Math.max.apply(null, prices) : null,
      currency: 'USD'
    };

    const earliest_time = timesStart.length ? timesStart.sort()[0] : null;
    const latest_time = timesEnd.length ? timesEnd.sort()[timesEnd.length - 1] : null;

    const time_range_defaults = {
      earliest_time,
      latest_time,
      evening_range: {
        start_time: '18:00',
        end_time: '22:00'
      }
    };

    const rating_options = [
      { min_value: 4.0, label: '4.0+ stars' },
      { min_value: 4.5, label: '4.5+ stars' }
    ];

    return { styles, levels, days_of_week, time_range_defaults, price_range, rating_options };
  }

  // 5. getAdultGroupClassSortOptions
  getAdultGroupClassSortOptions() {
    return [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'next_available_date', label: 'Next Available Date' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];
  }

  // 6. searchAdultGroupClasses(filters, sort_by)
  searchAdultGroupClasses(filters, sort_by) {
    const groupClassesRaw = this._getFromStorage('group_classes').filter(
      (gc) => gc.category === 'adult_group'
    );
    const instructors = this._getFromStorage('instructors');
    const sessions = this._getFromStorage('class_sessions');

    const f = filters || {};
    const stylesFilter = Array.isArray(f.styles) && f.styles.length ? f.styles : null;
    const levelsFilter = Array.isArray(f.levels) && f.levels.length ? f.levels : null;
    const daysFilter = Array.isArray(f.days_of_week) && f.days_of_week.length ? f.days_of_week : null;
    const maxPrice = typeof f.max_price_per_class === 'number' ? f.max_price_per_class : null;
    const minRating = typeof f.min_instructor_rating === 'number' ? f.min_instructor_rating : null;
    const capacityStatuses = Array.isArray(f.capacity_statuses) && f.capacity_statuses.length ? f.capacity_statuses : null;

    const timeStart = f.time_range_start || null; // 'HH:MM'
    const timeEnd = f.time_range_end || null;
    const tStartMin = this._timeToMinutes(timeStart);
    const tEndMin = this._timeToMinutes(timeEnd);

    const now = new Date();

    let results = [];

    groupClassesRaw.forEach((gc) => {
      if (stylesFilter && !stylesFilter.includes(gc.style)) return;
      if (levelsFilter && !levelsFilter.includes(gc.level)) return;
      if (capacityStatuses) {
        const status = gc.capacity_status || 'available';
        if (!capacityStatuses.includes(status)) return;
      }
      if (maxPrice != null && gc.drop_in_price != null && gc.drop_in_price > maxPrice) return;

      const instructor = instructors.find((i) => i.id === gc.instructorId) || null;
      if (minRating != null && instructor && typeof instructor.rating === 'number') {
        if (instructor.rating < minRating) return;
      }

      let sessionsForClass = sessions.filter((s) => s.classId === gc.id && s.status !== 'cancelled');
      // Only consider upcoming for filtering and summaries
      sessionsForClass = sessionsForClass.filter((s) => {
        if (!s.start_datetime) return true;
        const d = new Date(s.start_datetime);
        if (isNaN(d.getTime())) return true;
        return d >= now;
      });

      if (daysFilter) {
        sessionsForClass = sessionsForClass.filter((s) => daysFilter.includes(s.day_of_week));
      }

      if (timeStart && timeEnd) {
        sessionsForClass = sessionsForClass.filter((s) => {
          const st = this._extractTimeHHMM(s.start_datetime);
          const en = this._extractTimeHHMM(s.end_datetime);
          const stMin = this._timeToMinutes(st);
          const enMin = this._timeToMinutes(en);
          if (stMin == null || enMin == null || tStartMin == null || tEndMin == null) return true;
          return stMin >= tStartMin && enMin <= tEndMin;
        });
      }

      if (!sessionsForClass.length) return; // class has no matching sessions

      const sortedSessions = sessionsForClass.slice().sort((a, b) => {
        return new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0);
      });

      const next = sortedSessions[0];

      const primary_schedule_summary = this._formatScheduleSummary(
        next.day_of_week,
        next.start_datetime,
        next.end_datetime
      );

      const gcWithInstructor = this._attachInstructorToClass(gc);

      results.push({
        class: gcWithInstructor,
        instructor_name: instructor ? instructor.name : '',
        instructor_rating: instructor ? instructor.rating : null,
        primary_schedule_summary,
        next_available_session: {
          session_id: next.id,
          start_datetime: next.start_datetime,
          end_datetime: next.end_datetime,
          day_of_week: next.day_of_week,
          status: next.status
        },
        display_drop_in_price: gc.drop_in_price != null ? gc.drop_in_price : null,
        display_drop_in_price_formatted:
          gc.drop_in_price != null ? this._formatCurrency(gc.drop_in_price, gc.currency) : '',
        capacity_status: gc.capacity_status || 'available'
      });
    });

    // Sorting
    if (sort_by === 'price_low_to_high') {
      results.sort((a, b) => {
        const ap = a.display_drop_in_price != null ? a.display_drop_in_price : Number.MAX_SAFE_INTEGER;
        const bp = b.display_drop_in_price != null ? b.display_drop_in_price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sort_by === 'next_available_date') {
      results.sort((a, b) => {
        const ad = a.next_available_session
          ? new Date(a.next_available_session.start_datetime || 0).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bd = b.next_available_session
          ? new Date(b.next_available_session.start_datetime || 0).getTime()
          : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
    } else if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ar = a.instructor_rating != null ? a.instructor_rating : -1;
        const br = b.instructor_rating != null ? b.instructor_rating : -1;
        return br - ar;
      });
    }

    return results;
  }

  // 7. getKidsTeensClassFilterOptions
  getKidsTeensClassFilterOptions() {
    const groupClasses = this._getFromStorage('group_classes').filter((gc) => gc.is_kids_class);
    const classSessions = this._getFromStorage('class_sessions');

    const styleSet = new Set();
    const daysSet = new Set();
    const ageRangeMap = new Map();

    groupClasses.forEach((gc) => {
      if (gc.style) styleSet.add(gc.style);
      const key = (gc.min_age || '') + '-' + (gc.max_age || '');
      if (!ageRangeMap.has(key)) {
        let label;
        if (gc.display_age_range) {
          label = gc.display_age_range;
        } else if (gc.min_age != null && gc.max_age != null) {
          label = gc.min_age + '–' + gc.max_age + ' years';
        } else {
          label = '';
        }
        ageRangeMap.set(key, {
          min_age: gc.min_age != null ? gc.min_age : null,
          max_age: gc.max_age != null ? gc.max_age : null,
          label
        });
      }
      const sessions = classSessions.filter((s) => s.classId === gc.id);
      sessions.forEach((s) => {
        if (s.day_of_week) daysSet.add(s.day_of_week);
      });
    });

    const styles = Array.from(styleSet).map((v) => ({ value: v, label: this._styleLabel(v) }));
    const age_ranges = Array.from(ageRangeMap.values());
    const days_of_week = Array.from(daysSet).map((v) => ({ value: v, label: this._dayLabel(v) }));

    const time_range_defaults = {
      morning_range: {
        start_time: '09:00',
        end_time: '12:00'
      }
    };

    return { styles, age_ranges, days_of_week, time_range_defaults };
  }

  // 8. searchKidsTeensClasses(filters)
  searchKidsTeensClasses(filters) {
    const f = filters || {};
    const groupClassesRaw = this._getFromStorage('group_classes').filter((gc) => gc.is_kids_class);
    const instructors = this._getFromStorage('instructors');
    const sessions = this._getFromStorage('class_sessions');

    const stylesFilter = Array.isArray(f.styles) && f.styles.length ? f.styles : null;
    const minAge = typeof f.min_age === 'number' ? f.min_age : null;
    const maxAge = typeof f.max_age === 'number' ? f.max_age : null;
    const daysFilter = Array.isArray(f.days_of_week) && f.days_of_week.length ? f.days_of_week : null;

    const timeStart = f.time_range_start || null;
    const timeEnd = f.time_range_end || null;
    const tStartMin = this._timeToMinutes(timeStart);
    const tEndMin = this._timeToMinutes(timeEnd);

    const now = new Date();

    const results = [];

    groupClassesRaw.forEach((gc) => {
      if (stylesFilter && !stylesFilter.includes(gc.style)) return;

      // Age overlap check
      if (minAge != null && gc.max_age != null && gc.max_age < minAge) return;
      if (maxAge != null && gc.min_age != null && gc.min_age > maxAge) return;

      let sessionsForClass = sessions.filter((s) => s.classId === gc.id && s.status !== 'cancelled');
      sessionsForClass = sessionsForClass.filter((s) => {
        if (!s.start_datetime) return true;
        const d = new Date(s.start_datetime);
        if (isNaN(d.getTime())) return true;
        return d >= now;
      });

      if (daysFilter) {
        sessionsForClass = sessionsForClass.filter((s) => daysFilter.includes(s.day_of_week));
      }

      if (timeStart && timeEnd) {
        sessionsForClass = sessionsForClass.filter((s) => {
          const st = this._extractTimeHHMM(s.start_datetime);
          const en = this._extractTimeHHMM(s.end_datetime);
          const stMin = this._timeToMinutes(st);
          const enMin = this._timeToMinutes(en);
          if (stMin == null || enMin == null || tStartMin == null || tEndMin == null) return true;
          return stMin >= tStartMin && enMin <= tEndMin;
        });
      }

      if (!sessionsForClass.length) return;

      const sorted = sessionsForClass.slice().sort((a, b) => {
        return new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0);
      });
      const first = sorted[0];

      const ageRangeDisplay = gc.display_age_range
        ? gc.display_age_range
        : gc.min_age != null && gc.max_age != null
        ? gc.min_age + '–' + gc.max_age + ' years'
        : '';

      const instructor = instructors.find((i) => i.id === gc.instructorId) || null;
      const gcWithInstructor = this._attachInstructorToClass(gc);

      results.push({
        class: gcWithInstructor,
        instructor_name: instructor ? instructor.name : '',
        age_range_display: ageRangeDisplay,
        schedule_summary: this._formatScheduleSummary(first.day_of_week, first.start_datetime, first.end_datetime),
        single_class_price: gc.drop_in_price != null ? gc.drop_in_price : null,
        single_class_price_formatted:
          gc.drop_in_price != null ? this._formatCurrency(gc.drop_in_price, gc.currency) : '',
        monthly_plan_price: gc.monthly_plan_price != null ? gc.monthly_plan_price : null,
        monthly_plan_price_formatted:
          gc.monthly_plan_price != null ? this._formatCurrency(gc.monthly_plan_price, gc.currency) : ''
      });
    });

    return results;
  }

  // 9. getClassDetails(classId)
  getClassDetails(classId) {
    const groupClasses = this._getFromStorage('group_classes');
    const instructors = this._getFromStorage('instructors');
    const sessions = this._getFromStorage('class_sessions');

    const gc = groupClasses.find((c) => c.id === classId) || null;
    if (!gc) {
      return {
        class: null,
        instructor: null,
        age_range_display: '',
        pricing: {
          single_class_price: null,
          single_class_price_formatted: '',
          monthly_plan_price: null,
          monthly_plan_price_formatted: '',
          trial_price: null,
          trial_price_formatted: ''
        },
        location_display: '',
        upcoming_sessions: []
      };
    }

    const instructor = instructors.find((i) => i.id === gc.instructorId) || null;
    const ageRangeDisplay = gc.is_kids_class
      ? gc.display_age_range ||
        (gc.min_age != null && gc.max_age != null
          ? gc.min_age + '–' + gc.max_age + ' years'
          : '')
      : '';

    const currency = gc.currency || 'USD';

    const pricing = {
      single_class_price: gc.drop_in_price != null ? gc.drop_in_price : null,
      single_class_price_formatted:
        gc.drop_in_price != null ? this._formatCurrency(gc.drop_in_price, currency) : '',
      monthly_plan_price: gc.monthly_plan_price != null ? gc.monthly_plan_price : null,
      monthly_plan_price_formatted:
        gc.monthly_plan_price != null ? this._formatCurrency(gc.monthly_plan_price, currency) : '',
      trial_price: gc.trial_price != null ? gc.trial_price : null,
      trial_price_formatted:
        gc.trial_price != null
          ? gc.trial_price === 0
            ? 'Free'
            : this._formatCurrency(gc.trial_price, currency)
          : ''
    };

    const upcomingRaw = this._getAvailableSessionsForClass(classId);
    const upcoming_sessions = upcomingRaw.map((s) => ({
      session: this._attachClassToSession(s),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      day_of_week: s.day_of_week,
      status: s.status,
      is_trial_session_allowed: !!s.is_trial_session_allowed
    }));

    return {
      class: this._attachInstructorToClass(gc),
      instructor,
      age_range_display: ageRangeDisplay,
      pricing,
      location_display: gc.location_name || '',
      upcoming_sessions
    };
  }

  // 10. getClassRegistrationContext(classId, sessionId, initial_booking_type)
  getClassRegistrationContext(classId, sessionId, initial_booking_type) {
    const details = this.getClassDetails(classId);
    const gc = details.class;
    const sessions = this._getFromStorage('class_sessions');

    let session = null;
    if (sessionId) {
      session = sessions.find((s) => s.id === sessionId) || null;
    } else if (details.upcoming_sessions.length) {
      session = details.upcoming_sessions[0].session;
    }

    const { bookingOptions, paymentMethods, defaultBookingType, defaultPaymentMethod } =
      this._determineBookingOptionsForClass(gc, session);

    let chosenBookingType = defaultBookingType;
    if (initial_booking_type) {
      const exists = bookingOptions.find((b) => b.booking_type === initial_booking_type);
      if (exists) chosenBookingType = initial_booking_type;
    }

    const summary = {
      class_name: gc ? gc.name : '',
      level_label: gc ? this._levelLabel(gc.level) : '',
      instructor_name: details.instructor ? details.instructor.name : '',
      location_display: gc ? gc.location_name || '' : '',
      date_time_display: session
        ? this._formatDateTimeRange(session.start_datetime, session.end_datetime)
        : ''
    };

    // Pricing note from options
    if (bookingOptions.length) {
      const parts = bookingOptions.map((o) => o.label + ': ' + o.price_display);
      summary.pricing_note = parts.join(', ');
    } else {
      summary.pricing_note = '';
    }

    return {
      class: gc,
      session: session ? this._attachClassToSession(session) : null,
      summary,
      available_booking_types: bookingOptions,
      available_payment_methods: paymentMethods,
      default_booking_type: chosenBookingType,
      default_payment_method: defaultPaymentMethod
    };
  }

  // 11. createClassRegistration(...)
  createClassRegistration(
    classId,
    sessionId,
    booking_type,
    payment_method,
    attendee_type,
    attendee_name,
    attendee_age,
    parent_name,
    parent_phone,
    parent_email,
    contact_phone,
    contact_email,
    start_date
  ) {
    const groupClasses = this._getFromStorage('group_classes');
    const sessions = this._getFromStorage('class_sessions');
    const registrations = this._getFromStorage('class_registrations');

    const gc = groupClasses.find((c) => c.id === classId) || null;
    const session = sessionId ? sessions.find((s) => s.id === sessionId) || null : null;

    if (!gc) {
      return { success: false, registration: null, message: 'Class not found.' };
    }

    const currency = gc.currency || 'USD';
    let price = 0;

    if (booking_type === 'single_drop_in') {
      price = gc.drop_in_price != null ? gc.drop_in_price : 0;
    } else if (booking_type === 'monthly_plan') {
      price = gc.monthly_plan_price != null ? gc.monthly_plan_price : 0;
    } else if (booking_type === 'trial') {
      price = gc.trial_price != null ? gc.trial_price : 0;
    }

    if (payment_method === 'free_trial') {
      price = 0;
    }

    const regId = this._generateId('reg');
    const now = new Date().toISOString();

    const registration = {
      id: regId,
      classId,
      sessionId: sessionId || null,
      createdAt: now,
      booking_type,
      attendee_type,
      attendee_name,
      attendee_age: attendee_age != null ? attendee_age : null,
      parent_name: parent_name || null,
      parent_phone: parent_phone || null,
      parent_email: parent_email || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      payment_method,
      price_charged: price,
      currency,
      status: 'confirmed',
      start_date: start_date || (session ? session.start_datetime : null)
    };

    registrations.push(registration);
    this._saveToStorage('class_registrations', registrations);

    const enriched = Object.assign({}, registration, {
      class: this._attachInstructorToClass(gc),
      session: session ? this._attachClassToSession(session) : null
    });

    return {
      success: true,
      registration: enriched,
      message: 'Registration completed.'
    };
  }

  // 12. joinWaitlistForSession(sessionId, name, phone, notes)
  joinWaitlistForSession(sessionId, name, phone, notes) {
    const sessions = this._getFromStorage('class_sessions');
    const groupClasses = this._getFromStorage('group_classes');
    const waitlistEntries = this._getFromStorage('waitlist_entries');

    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return { success: false, waitlist_entry: null, message: 'Session not found.' };
    }

    const gc = groupClasses.find((c) => c.id === session.classId) || null;

    const entry = {
      id: this._generateId('wait'),
      classId: session.classId,
      sessionId: sessionId,
      name,
      phone,
      notes: notes || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    waitlistEntries.push(entry);
    this._saveToStorage('waitlist_entries', waitlistEntries);

    const enriched = Object.assign({}, entry, {
      class: gc ? this._attachInstructorToClass(gc) : null,
      session: this._attachClassToSession(session)
    });

    return {
      success: true,
      waitlist_entry: enriched,
      message: 'Added to waitlist.'
    };
  }

  // 13. addClassToMyScheduleFromSession(classId, sessionId, notes)
  addClassToMyScheduleFromSession(classId, sessionId, notes) {
    const schedule = this._getOrCreateMySchedule();
    const sessions = this._getFromStorage('class_sessions');
    const groupClasses = this._getFromStorage('group_classes');
    const items = this._getFromStorage('my_schedule_items');

    const session = sessions.find((s) => s.id === sessionId && s.classId === classId) || null;
    if (!session) {
      return {
        schedule,
        item: null,
        has_time_conflict: false,
        message: 'Session not found for this class.'
      };
    }

    const gc = groupClasses.find((c) => c.id === classId) || null;

    const item = {
      id: this._generateId('msi'),
      scheduleId: schedule.id,
      classId,
      sessionId,
      day_of_week: session.day_of_week,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      style: gc ? gc.style : 'other',
      notes: notes || null
    };

    items.push(item);
    this._saveToStorage('my_schedule_items', items);

    const scheduleItemsForSchedule = items.filter((i) => i.scheduleId === schedule.id);
    const conflicts = this._detectScheduleConflicts(scheduleItemsForSchedule);
    const hasConflict = conflicts.has(item.id);

    schedule.updatedAt = new Date().toISOString();
    const schedules = this._getFromStorage('my_schedules').map((s) => (s.id === schedule.id ? schedule : s));
    this._saveToStorage('my_schedules', schedules);

    return {
      schedule,
      item,
      has_time_conflict: hasConflict,
      message: hasConflict
        ? 'Class added, but it overlaps with another class in your schedule.'
        : 'Class added to your schedule.'
    };
  }

  // 14. getMySchedule()
  getMySchedule() {
    const schedule = this._getOrCreateMySchedule();
    const items = this._getFromStorage('my_schedule_items').filter((i) => i.scheduleId === schedule.id);
    const groupClasses = this._getFromStorage('group_classes');
    const instructors = this._getFromStorage('instructors');

    const conflicts = this._detectScheduleConflicts(items);

    const items_by_day = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    items.forEach((it) => {
      const day = it.day_of_week;
      if (!items_by_day[day]) return;
      const gc = groupClasses.find((c) => c.id === it.classId) || null;
      const instructor = gc ? instructors.find((ins) => ins.id === gc.instructorId) || null : null;
      const gcWithInstructor = gc ? this._attachInstructorToClass(gc) : null;
      items_by_day[day].push({
        item: it,
        class: gcWithInstructor,
        instructor_name: instructor ? instructor.name : '',
        has_time_conflict: conflicts.has(it.id)
      });
    });

    return { schedule, items_by_day };
  }

  // 15. removeMyScheduleItem(scheduleItemId)
  removeMyScheduleItem(scheduleItemId) {
    const schedule = this._getOrCreateMySchedule();
    let items = this._getFromStorage('my_schedule_items');
    const beforeCount = items.length;
    items = items.filter((i) => i.id !== scheduleItemId);
    this._saveToStorage('my_schedule_items', items);

    const remaining_items_count = items.filter((i) => i.scheduleId === schedule.id).length;

    return {
      schedule,
      remaining_items_count,
      message:
        beforeCount === items.length
          ? 'Schedule item not found.'
          : 'Schedule item removed.'
    };
  }

  // 16. updateMyScheduleOrder(orderedItemIds)
  updateMyScheduleOrder(orderedItemIds) {
    const schedule = this._getOrCreateMySchedule();
    const ordered = Array.isArray(orderedItemIds) ? orderedItemIds : [];
    let items = this._getFromStorage('my_schedule_items');

    const orderIndex = new Map();
    ordered.forEach((id, idx) => {
      orderIndex.set(id, idx);
    });

    items = items.map((it) => {
      if (orderIndex.has(it.id)) {
        return Object.assign({}, it, { display_order: orderIndex.get(it.id) });
      }
      return it;
    });

    this._saveToStorage('my_schedule_items', items);

    return {
      schedule,
      message: 'Schedule order updated.'
    };
  }

  // 17. getPricingOverview()
  getPricingOverview() {
    const groupClasses = this._getFromStorage('group_classes');

    const adult = groupClasses.filter((gc) => gc.category === 'adult_group');
    const kids = groupClasses.filter((gc) => gc.is_kids_class);

    const adultPrices = adult.map((gc) => gc.drop_in_price).filter((p) => p != null);
    const kidsSingle = kids.map((gc) => gc.drop_in_price).filter((p) => p != null);
    const kidsMonthly = kids.map((gc) => gc.monthly_plan_price).filter((p) => p != null);

    const adult_group_single_class_range = {
      min_price: adultPrices.length ? Math.min.apply(null, adultPrices) : null,
      max_price: adultPrices.length ? Math.max.apply(null, adultPrices) : null,
      currency: 'USD'
    };

    const kids_single_class_range = {
      min_price: kidsSingle.length ? Math.min.apply(null, kidsSingle) : null,
      max_price: kidsSingle.length ? Math.max.apply(null, kidsSingle) : null,
      currency: 'USD'
    };

    const kids_monthly_plan_range = {
      min_price: kidsMonthly.length ? Math.min.apply(null, kidsMonthly) : null,
      max_price: kidsMonthly.length ? Math.max.apply(null, kidsMonthly) : null,
      currency: 'USD'
    };

    return {
      adult_group_single_class_range,
      kids_single_class_range,
      kids_monthly_plan_range
    };
  }

  // 18. getClassPackages()
  getClassPackages() {
    const packages = this._getFromStorage('class_packages').filter((p) => p.is_active);
    if (!packages.length) return [];

    const withPrices = packages.map((p) => {
      const pc = this._calculatePerClassPrice(p);
      return { package: p, per_class_price: pc, per_class_price_formatted: pc != null ? this._formatCurrency(pc, p.currency) : '' };
    });

    const validPerClass = withPrices.filter((x) => x.per_class_price != null);
    let bestId = null;
    if (validPerClass.length) {
      let min = validPerClass[0].per_class_price;
      bestId = validPerClass[0].package.id;
      validPerClass.forEach((x) => {
        if (x.per_class_price < min) {
          min = x.per_class_price;
          bestId = x.package.id;
        }
      });
    }

    return withPrices.map((x) => ({
      package: x.package,
      per_class_price: x.per_class_price,
      per_class_price_formatted: x.per_class_price_formatted,
      is_best_value: bestId ? x.package.id === bestId : false
    }));
  }

  // 19. addPackageToCart(classPackageId, quantity)
  addPackageToCart(classPackageId, quantity) {
    const qty = quantity == null ? 1 : Number(quantity);
    const classPackages = this._getFromStorage('class_packages');
    const pkg = classPackages.find((p) => p.id === classPackageId) || null;
    if (!pkg) {
      return { cart: null, items: [], message: 'Package not found.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.item_type === 'class_package' && ci.classPackageId === classPackageId
    );

    if (item) {
      item.quantity = (Number(item.quantity) || 0) + qty;
    } else {
      item = {
        id: this._generateId('ci'),
        cartId: cart.id,
        item_type: 'class_package',
        classPackageId: classPackageId,
        giftCardConfigurationId: null,
        name: pkg.name,
        description: pkg.description || '',
        quantity: qty,
        unit_price: pkg.price,
        total_price: pkg.price * qty
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(cartItems);

    return {
      cart,
      items: enrichedItems,
      message: 'Package added to cart.'
    };
  }

  // 20. getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(cartItems);

    const items = enrichedItems.map((ci) => ({
      item: ci,
      display_name: ci.name,
      display_description: ci.description || '',
      unit_price_formatted: this._formatCurrency(ci.unit_price, cart.currency),
      total_price_formatted: this._formatCurrency(ci.total_price, cart.currency)
    }));

    const subtotal_formatted = this._formatCurrency(cart.subtotal || 0, cart.currency);

    return {
      cart,
      items,
      subtotal_formatted
    };
  }

  // 21. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const qty = Number(quantity);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        cart,
        items: [],
        subtotal_formatted: this._formatCurrency(cart.subtotal || 0, cart.currency),
        message: 'Cart item not found.'
      };
    }

    if (qty <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = qty;
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(updatedItems);

    return {
      cart,
      items: enrichedItems,
      subtotal_formatted: this._formatCurrency(cart.subtotal || 0, cart.currency),
      message: 'Cart updated.'
    };
  }

  // 22. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const beforeLen = cartItems.length;
    cartItems = cartItems.filter((ci) => !(ci.id === cartItemId && ci.cartId === cart.id));
    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(updatedItems);

    return {
      cart,
      items: enrichedItems,
      subtotal_formatted: this._formatCurrency(cart.subtotal || 0, cart.currency),
      message: beforeLen === cartItems.length ? 'Cart item not found.' : 'Cart item removed.'
    };
  }

  // 23. getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(cartItems);

    const items = enrichedItems.map((ci) => ({
      item: ci,
      display_name: ci.name,
      total_price_formatted: this._formatCurrency(ci.total_price, cart.currency)
    }));

    const subtotal = cart.subtotal || 0;
    const subtotal_formatted = this._formatCurrency(subtotal, cart.currency);

    const supported_payment_methods = subtotal > 0 ? ['credit_card'] : [];
    const requires_billing_info = subtotal > 0;

    return {
      items,
      subtotal,
      subtotal_formatted,
      supported_payment_methods,
      requires_billing_info
    };
  }

  // 24. submitOrder(...)
  submitOrder(
    payment_method,
    cardholder_name,
    card_number,
    card_expiration,
    card_cvv,
    payer_name,
    payer_email,
    payer_phone,
    billing_address
  ) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);

    if (!cartItems.length) {
      return { success: false, order: null, message: 'Cart is empty.' };
    }

    const orders = this._getFromStorage('orders');
    const order = this._createOrderFromCart(
      cart,
      cartItems,
      payment_method,
      payer_name,
      payer_email,
      payer_phone,
      billing_address,
      cardholder_name,
      card_number,
      card_expiration,
      card_cvv
    );

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Clear cart items after order
    let allCartItems = this._getFromStorage('cart_items');
    allCartItems = allCartItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', allCartItems);

    cart.subtotal = 0;
    cart.updatedAt = new Date().toISOString();
    const carts = this._getFromStorage('carts').map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);

    return {
      success: true,
      order,
      message: 'Order submitted.'
    };
  }

  // 25. getGiftCardOptions()
  getGiftCardOptions() {
    const templates = this._getFromStorage('gift_card_templates').filter((t) => t.is_active);

    // No hard-coded preset data from storage; presets left empty unless managed externally
    const preset_amounts = [];

    return {
      preset_amounts,
      allow_custom_amount: true,
      min_custom_amount: 0,
      max_custom_amount: 1000,
      currency: 'USD',
      templates
    };
  }

  // 26. configureGiftCardAndAddToCart(...)
  configureGiftCardAndAddToCart(
    amount,
    currency,
    templateId,
    recipient_name,
    message,
    delivery_method,
    recipient_email,
    send_email
  ) {
    const templates = this._getFromStorage('gift_card_templates');
    const template = templates.find((t) => t.id === templateId && t.is_active) || null;
    if (!template) {
      return {
        gift_card_configuration: null,
        cart: null,
        items: [],
        message: 'Gift card template not found.'
      };
    }

    const configs = this._getFromStorage('gift_card_configurations');
    const now = new Date().toISOString();
    const cfg = {
      id: this._generateId('gcfg'),
      amount: Number(amount) || 0,
      currency: currency || 'USD',
      templateId,
      recipient_name: recipient_name || null,
      message: message || null,
      delivery_method,
      recipient_email: delivery_method === 'email' ? recipient_email || null : null,
      send_email: delivery_method === 'email' ? !!send_email : false,
      createdAt: now
    };

    configs.push(cfg);
    this._saveToStorage('gift_card_configurations', configs);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const item = {
      id: this._generateId('ci'),
      cartId: cart.id,
      item_type: 'gift_card',
      classPackageId: null,
      giftCardConfigurationId: cfg.id,
      name: 'Gift Card ' + this._formatCurrency(cfg.amount, cfg.currency),
      description: template.name + (cfg.recipient_name ? ' for ' + cfg.recipient_name : ''),
      quantity: 1,
      unit_price: cfg.amount,
      total_price: cfg.amount
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const enrichedCfg = this._attachTemplateToGiftCardConfiguration(cfg);
    const updatedItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const enrichedItems = this._attachRelationsToCartItems(updatedItems);

    return {
      gift_card_configuration: enrichedCfg,
      cart,
      items: enrichedItems,
      message: 'Gift card configured and added to cart.'
    };
  }

  // 27. getPrivateLessonPackages()
  getPrivateLessonPackages() {
    const packages = this._getFromStorage('private_lesson_packages').filter((p) => p.is_active);
    return packages.map((p) => {
      const is_wedding_focus = p.category === 'wedding';
      const is_featured = is_wedding_focus || /first dance/i.test(p.name || '');
      let summary = '';
      if (p.num_lessons && p.lesson_duration_minutes) {
        summary =
          p.num_lessons + ' x ' + p.lesson_duration_minutes + '-minute lessons for your special dance.';
      } else if (p.num_lessons) {
        summary = p.num_lessons + ' private lessons.';
      } else {
        summary = p.description || '';
      }
      return {
        package: p,
        is_wedding_focus,
        is_featured,
        summary
      };
    });
  }

  // 28. getPoliciesOverview()
  getPoliciesOverview() {
    const policies = this._getFromStorage('policies').filter((p) => p.is_active);
    const labelMap = {
      cancellations: 'Cancellations',
      class_policies: 'Class Policies',
      payments: 'Payments',
      general: 'General',
      other: 'Other'
    };

    const byCat = new Map();
    policies.forEach((p) => {
      const cat = p.category || 'other';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(p);
    });

    const categories = Array.from(byCat.keys()).map((cat) => ({
      category: cat,
      label: labelMap[cat] || cat,
      policies: byCat.get(cat)
    }));

    return { categories };
  }

  // 29. searchPolicies(query, category)
  searchPolicies(query, category) {
    const q = (query || '').toLowerCase();
    const policies = this._getFromStorage('policies').filter((p) => p.is_active);
    if (!q && !category) return policies;

    return policies.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q))
      );
    });
  }

  // 30. getCancellationPolicy()
  getCancellationPolicy() {
    const policies = this._getFromStorage('policies').filter((p) => p.is_active);
    const cancellation = policies.find((p) => p.category === 'cancellations') || null;
    return cancellation;
  }

  // 31. submitContactMessage(...)
  submitContactMessage(
    subject,
    message_body,
    related_policy_id,
    related_private_lesson_package_id,
    sender_name,
    sender_email,
    sender_phone,
    preferred_start_datetime,
    source_page
  ) {
    const allowedSubjects = [
      'general_question',
      'class_policies',
      'private_lessons',
      'weddings',
      'other'
    ];
    const allowedSources = ['contact', 'private_lessons', 'policies', 'other'];

    const s = allowedSubjects.includes(subject) ? subject : 'other';
    const sp = allowedSources.includes(source_page) ? source_page : 'other';

    const messages = this._getFromStorage('contact_messages');
    const now = new Date().toISOString();

    const msg = {
      id: this._generateId('msg'),
      subject: s,
      message_body,
      related_policy_id: related_policy_id || null,
      related_private_lesson_package_id: related_private_lesson_package_id || null,
      sender_name,
      sender_email,
      sender_phone: sender_phone || null,
      preferred_start_datetime: preferred_start_datetime || null,
      source_page: sp,
      createdAt: now
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    // Attach foreign key resolutions
    const policies = this._getFromStorage('policies');
    const privatePkgs = this._getFromStorage('private_lesson_packages');
    const related_policy = related_policy_id
      ? policies.find((p) => p.id === related_policy_id) || null
      : null;
    const related_private_lesson_package = related_private_lesson_package_id
      ? privatePkgs.find((p) => p.id === related_private_lesson_package_id) || null
      : null;

    const enriched = Object.assign({}, msg, {
      related_policy,
      related_private_lesson_package
    });

    return {
      contact_message: enriched,
      success: true,
      message: 'Message submitted.'
    };
  }

  // 32. getAboutPageContent()
  getAboutPageContent() {
    // Allow external systems to override via localStorage key 'about_page_content'
    const stored = localStorage.getItem('about_page_content');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed;
      } catch (e) {
        // fall through to default
      }
    }

    // Minimal default content (no mocked entity data)
    return {
      studio_history: '',
      mission_statement: '',
      instructor_highlights: [],
      class_type_summary: [
        {
          category_key: 'adult_group',
          title: 'Adult Group Classes',
          description: ''
        },
        {
          category_key: 'kids_teens',
          title: 'Kids & Teens',
          description: ''
        },
        {
          category_key: 'private_lessons',
          title: 'Private Lessons',
          description: ''
        }
      ]
    };
  }

  // 33. getStudioContactInfo()
  getStudioContactInfo() {
    const stored = localStorage.getItem('studio_contact_info');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return {
      phone: '',
      email: '',
      address: '',
      hours: ''
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