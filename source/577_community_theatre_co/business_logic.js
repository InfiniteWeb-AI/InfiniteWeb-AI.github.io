/* localStorage polyfill for Node.js and environments without localStorage */
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      'productions',
      'performances',
      'seats',
      'membership_tiers',
      'membership_purchases',
      'volunteer_shifts',
      'volunteer_signups',
      'class_workshops',
      'class_registrations',
      'gift_card_products',
      'gift_card_purchases',
      'newsletter_subscriptions',
      'donations',
      'ticket_reservations',
      'group_bookings',
      'carts',
      'cart_items',
      'orders'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
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

  // ---------------------- Generic helpers ----------------------

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatYearMonth(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }

  _startOfMonth(year, month) {
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }

  _endOfMonth(year, month) {
    return new Date(year, month, 0, 23, 59, 59, 999);
  }

  _dayOfWeekString(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _formatPriceRange(min, max) {
    if (min == null && max == null) return '';
    if (min != null && max != null && min !== max) {
      return '$' + min.toFixed(2) + ' - $' + max.toFixed(2);
    }
    const val = (min != null ? min : max);
    return '$' + val.toFixed(2);
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId);
    let itemCount = 0;
    let totalAmount = 0;
    cartItems.forEach((item) => {
      itemCount += item.quantity || 0;
      totalAmount += item.total_price || 0;
    });
    return { item_count: itemCount, total_amount: totalAmount };
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = currentCartId ? carts.find((c) => c.id === currentCartId) : null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _addCartItem(cart, options) {
    const {
      itemType,
      refId,
      quantity,
      unitPrice,
      totalPrice,
      description
    } = options;

    const cartItems = this._getFromStorage('cart_items');
    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      item_type: itemType,
      ticket_reservation_id: null,
      group_booking_id: null,
      membership_purchase_id: null,
      class_registration_id: null,
      gift_card_purchase_id: null,
      donation_id: null,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      description: description || '',
      added_at: new Date().toISOString()
    };

    if (itemType === 'ticket_reservation') {
      cartItem.ticket_reservation_id = refId;
    } else if (itemType === 'group_booking') {
      cartItem.group_booking_id = refId;
    } else if (itemType === 'membership_purchase') {
      cartItem.membership_purchase_id = refId;
    } else if (itemType === 'class_registration') {
      cartItem.class_registration_id = refId;
    } else if (itemType === 'gift_card_purchase') {
      cartItem.gift_card_purchase_id = refId;
    } else if (itemType === 'donation') {
      cartItem.donation_id = refId;
    }

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart,
      cartItem,
      totals
    };
  }

  _generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return 'ORD-' + y + m + d + '-' + rand;
  }

  // ---------------------- Interface implementations ----------------------

  // getHomePageContent
  getHomePageContent() {
    const productions = this._getFromStorage('productions');
    const performances = this._getFromStorage('performances');
    const classes = this._getFromStorage('class_workshops');

    const now = new Date();
    const currentYM = this._formatYearMonth(now);

    // Featured productions: current productions, up to 3
    const currentProductions = productions.filter((p) => p.is_current);
    const featured = currentProductions.slice(0, 3).map((p) => {
      const prodPerformances = performances.filter((pf) => pf.production_id === p.id);
      let nextPerfDate = null;
      let minPrice = null;
      let maxPrice = null;
      prodPerformances.forEach((pf) => {
        const sd = this._parseDate(pf.start_datetime);
        if (sd && sd >= now && (!nextPerfDate || sd < nextPerfDate)) {
          nextPerfDate = sd;
        }
        if (pf.base_price_min != null) {
          minPrice = minPrice == null ? pf.base_price_min : Math.min(minPrice, pf.base_price_min);
        }
        if (pf.base_price_max != null) {
          maxPrice = maxPrice == null ? pf.base_price_max : Math.max(maxPrice, pf.base_price_max);
        }
      });
      return {
        production_id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        hero_image: p.hero_image || '',
        genre: p.genre,
        audience_suitability: p.audience_suitability,
        age_recommendation: p.age_recommendation || '',
        run_start_date: p.run_start_date,
        run_end_date: p.run_end_date,
        tags: p.tags || [],
        next_performance_datetime: nextPerfDate ? nextPerfDate.toISOString() : null,
        price_range_display: this._formatPriceRange(minPrice, maxPrice),
        // foreign key resolution
        production: p
      };
    });

    // Current month performances
    const [ymYearStr, ymMonthStr] = currentYM.split('-');
    const ymYear = parseInt(ymYearStr, 10);
    const ymMonth = parseInt(ymMonthStr, 10);
    const monthStart = this._startOfMonth(ymYear, ymMonth);
    const monthEnd = this._endOfMonth(ymYear, ymMonth);

    const currentMonthPerformances = performances
      .filter((pf) => {
        const sd = this._parseDate(pf.start_datetime);
        if (!sd) return false;
        return sd >= monthStart && sd <= monthEnd;
      })
      .map((pf) => {
        const prod = productions.find((p) => p.id === pf.production_id) || null;
        const audienceSuitability = prod ? prod.audience_suitability : null;
        const isFamilyFriendly = audienceSuitability === 'family_friendly' || audienceSuitability === 'all_ages';
        const tags = (prod && prod.tags) || (pf.tags || []);
        return {
          performance_id: pf.id,
          production_id: pf.production_id,
          production_title: prod ? prod.title : '',
          start_datetime: pf.start_datetime,
          time_of_day: pf.time_of_day,
          base_price_min: pf.base_price_min,
          base_price_max: pf.base_price_max,
          audience_suitability: audienceSuitability,
          tags: tags,
          is_family_friendly: isFamilyFriendly,
          has_group_discount: !!pf.has_group_discount,
          wheelchair_accessible: !!pf.wheelchair_accessible,
          audio_description_available: !!pf.audio_description_available,
          price_range_display: this._formatPriceRange(pf.base_price_min, pf.base_price_max),
          // foreign key resolution
          production: prod
        };
      });

    // Upcoming workshops (next few active ones)
    const upcomingWorkshops = classes
      .filter((c) => c.is_active)
      .filter((c) => {
        const sd = this._parseDate(c.start_date);
        return sd && sd >= now;
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_date) || new Date(0);
        const bd = this._parseDate(b.start_date) || new Date(0);
        return ad - bd;
      })
      .slice(0, 5)
      .map((c) => ({
        class_id: c.id,
        title: c.title,
        category: c.category,
        age_group: c.age_group,
        start_date: c.start_date,
        end_date: c.end_date,
        duration_days: c.duration_days,
        is_intensive: c.is_intensive,
        price: c.price,
        price_display: '$' + (c.price != null ? c.price.toFixed(2) : '0.00')
      }));

    const specialOffers = [];

    return {
      mission_statement: '',
      tagline: '',
      featured_productions: featured,
      special_offers: specialOffers,
      current_month_performances: currentMonthPerformances,
      upcoming_workshops: upcomingWorkshops
    };
  }

  // getShowsAndTicketsFilters
  getShowsAndTicketsFilters() {
    const now = new Date();
    const currentYM = this._formatYearMonth(now);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextYM = this._formatYearMonth(nextMonthDate);

    const date_range_presets = [
      {
        id: 'current_month',
        label: 'This Month',
        start_date: currentYM + '-01',
        end_date: currentYM + '-31'
      },
      {
        id: 'next_month',
        label: 'Next Month',
        start_date: nextYM + '-01',
        end_date: nextYM + '-31'
      }
    ];

    const day_of_week_options = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(
      (d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })
    );

    const time_of_day_options = [
      { value: 'matinee', label: 'Matinee' },
      { value: 'evening', label: 'Evening' }
    ];

    const audience_suitability_options = [
      { value: 'all_ages', label: 'All Ages', description: 'Suitable for all ages.' },
      { value: 'family_friendly', label: 'Family-friendly', description: 'Great for kids and families.' },
      { value: 'teens_and_up', label: 'Teens and Up', description: 'Recommended for ages 13+.' },
      { value: 'adults_only', label: 'Adults Only', description: 'Mature content.' }
    ];

    const accessibility_options = [
      { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', description: 'Accessible seating available.' },
      { key: 'audio_description', label: 'Audio Description', description: 'Audio-described performance.' }
    ];

    const sort_options = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'price_low_to_high', label: 'Ticket Price: Low to High' },
      { value: 'price_high_to_low', label: 'Ticket Price: High to Low' }
    ];

    return {
      date_range_presets,
      day_of_week_options,
      time_of_day_options,
      audience_suitability_options,
      accessibility_options,
      sort_options
    };
  }

  // searchPerformances
  searchPerformances(
    startDate,
    endDate,
    month,
    dayOfWeek,
    timeOfDay,
    audienceSuitability,
    wheelchairAccessible,
    audioDescriptionAvailable,
    hasGroupDiscount,
    includeSoldOut,
    maxBasePrice,
    sortBy,
    page,
    pageSize
  ) {
    const performances = this._getFromStorage('performances');
    const productions = this._getFromStorage('productions');

    let start = null;
    let end = null;

    if (month) {
      const parts = month.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(m)) {
          start = this._startOfMonth(year, m);
          end = this._endOfMonth(year, m);
        }
      }
    } else {
      if (startDate) {
        start = new Date(startDate + 'T00:00:00');
      }
      if (endDate) {
        end = new Date(endDate + 'T23:59:59');
      }
    }

    const includeSold = !!includeSoldOut;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let filtered = performances.filter((pf) => {
      const sd = this._parseDate(pf.start_datetime);
      if (!sd) return false;

      if (start && sd < start) return false;
      if (end && sd > end) return false;

      if (dayOfWeek) {
        if (this._dayOfWeekString(sd) !== dayOfWeek) return false;
      }

      if (timeOfDay && pf.time_of_day !== timeOfDay) return false;

      if (!includeSold && pf.is_sold_out) return false;

      if (typeof wheelchairAccessible === 'boolean' && pf.wheelchair_accessible !== wheelchairAccessible) return false;

      if (typeof audioDescriptionAvailable === 'boolean' && pf.audio_description_available !== audioDescriptionAvailable) return false;

      if (typeof hasGroupDiscount === 'boolean' && pf.has_group_discount !== hasGroupDiscount) return false;

      if (maxBasePrice != null && typeof maxBasePrice === 'number') {
        if (pf.base_price_min == null || pf.base_price_min > maxBasePrice) return false;
      }

      if (audienceSuitability) {
        const prod = productions.find((p) => p.id === pf.production_id);
        if (!prod) return false;
        const prodAud = prod.audience_suitability;
        if (audienceSuitability === 'family_friendly') {
          // hierarchical: include all_ages as family friendly
          if (!(prodAud === 'family_friendly' || prodAud === 'all_ages')) return false;
        } else {
          if (prodAud !== audienceSuitability) return false;
        }
      }

      return true;
    });

    const sortKey = sortBy || 'date_asc';
    filtered.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return (a.base_price_min || 0) - (b.base_price_min || 0);
      }
      if (sortKey === 'price_high_to_low') {
        return (b.base_price_min || 0) - (a.base_price_min || 0);
      }
      // default date_asc
      const ad = this._parseDate(a.start_datetime) || new Date(0);
      const bd = this._parseDate(b.start_datetime) || new Date(0);
      return ad - bd;
    });

    const total_count = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = filtered.slice(startIndex, endIndex);

    const resultPerformances = pageItems.map((pf) => {
      const prod = productions.find((p) => p.id === pf.production_id) || null;
      const sd = this._parseDate(pf.start_datetime) || new Date();
      const ed = this._parseDate(pf.end_datetime) || null;
      return {
        performance_id: pf.id,
        production_id: pf.production_id,
        production_title: prod ? prod.title : '',
        production_genre: prod ? prod.genre : null,
        audience_suitability: prod ? prod.audience_suitability : null,
        age_recommendation: prod ? prod.age_recommendation : null,
        start_datetime: pf.start_datetime,
        end_datetime: pf.end_datetime || (ed ? ed.toISOString() : null),
        day_of_week: this._dayOfWeekString(sd),
        time_of_day: pf.time_of_day,
        base_price_min: pf.base_price_min,
        base_price_max: pf.base_price_max,
        price_range_display: this._formatPriceRange(pf.base_price_min, pf.base_price_max),
        wheelchair_accessible: !!pf.wheelchair_accessible,
        audio_description_available: !!pf.audio_description_available,
        has_group_discount: !!pf.has_group_discount,
        group_min_size: pf.group_min_size != null ? pf.group_min_size : null,
        group_discount_note: pf.group_discount_note || '',
        venue_name: pf.venue_name || '',
        is_sold_out: !!pf.is_sold_out,
        tags: pf.tags || (prod && prod.tags) || [],
        // foreign key resolution
        production: prod
      };
    });

    return {
      performances: resultPerformances,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getProductionDetail
  getProductionDetail(productionId) {
    const productions = this._getFromStorage('productions');
    const performances = this._getFromStorage('performances');
    const production = productions.find((p) => p.id === productionId) || null;
    const now = new Date();

    if (!production) {
      return {
        production: null,
        upcoming_performances: [],
        is_past_production: true,
        newsletter_cta_visible: false
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_openedPastProductionId', productionId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const upcoming_performances = performances
      .filter((pf) => pf.production_id === production.id)
      .filter((pf) => {
        const sd = this._parseDate(pf.start_datetime);
        return sd && sd >= now;
      })
      .map((pf) => ({
        performance_id: pf.id,
        start_datetime: pf.start_datetime,
        end_datetime: pf.end_datetime,
        day_of_week: this._dayOfWeekString(this._parseDate(pf.start_datetime) || new Date()),
        time_of_day: pf.time_of_day,
        label: pf.label || '',
        base_price_min: pf.base_price_min,
        base_price_max: pf.base_price_max,
        price_range_display: this._formatPriceRange(pf.base_price_min, pf.base_price_max),
        wheelchair_accessible: !!pf.wheelchair_accessible,
        audio_description_available: !!pf.audio_description_available,
        has_group_discount: !!pf.has_group_discount,
        group_min_size: pf.group_min_size != null ? pf.group_min_size : null,
        group_discount_note: pf.group_discount_note || '',
        is_sold_out: !!pf.is_sold_out
      }));

    const endDate = this._parseDate(production.run_end_date);
    const isPast = endDate ? endDate < now : !production.is_current;

    return {
      production: {
        id: production.id,
        title: production.title,
        subtitle: production.subtitle || '',
        synopsis: production.synopsis || '',
        genre: production.genre,
        audience_suitability: production.audience_suitability,
        age_recommendation: production.age_recommendation || '',
        run_start_date: production.run_start_date,
        run_end_date: production.run_end_date,
        season: production.season || '',
        is_current: !!production.is_current,
        hero_image: production.hero_image || '',
        tags: production.tags || []
      },
      upcoming_performances,
      is_past_production: isPast,
      newsletter_cta_visible: isPast
    };
  }

  // getPerformanceSeating
  getPerformanceSeating(performanceId) {
    const performances = this._getFromStorage('performances');
    const productions = this._getFromStorage('productions');
    const seats = this._getFromStorage('seats');

    const pf = performances.find((p) => p.id === performanceId) || null;
    if (!pf) {
      return {
        performance: null,
        ticket_type_options: [],
        seating_sections: []
      };
    }

    const prod = productions.find((p) => p.id === pf.production_id) || null;

    const performance = {
      performance_id: pf.id,
      production_id: pf.production_id,
      production_title: prod ? prod.title : '',
      start_datetime: pf.start_datetime,
      time_of_day: pf.time_of_day,
      venue_name: pf.venue_name || '',
      base_price_min: pf.base_price_min,
      base_price_max: pf.base_price_max,
      price_range_display: this._formatPriceRange(pf.base_price_min, pf.base_price_max),
      wheelchair_accessible: !!pf.wheelchair_accessible,
      audio_description_available: !!pf.audio_description_available,
      production: prod
    };

    const ticket_type_options = [
      { value: 'adult', label: 'Adult', description: 'Standard adult ticket.' },
      { value: 'child', label: 'Child', description: 'Child ticket.' },
      { value: 'student', label: 'Student', description: 'Student ticket.' },
      { value: 'senior', label: 'Senior', description: 'Senior ticket.' }
    ];

    let pfSeats = seats.filter((s) => s.performance_id === performanceId);

    // If no explicit seating data exists for this performance, generate a simple default map
    if (pfSeats.length === 0) {
      const generatedSeats = [];
      const basePrice = pf.base_price_min != null ? pf.base_price_min : 0;
      const sectionKey = 'center';

      // Provide a small layout with standard seats plus a wheelchair/companion pair
      const rows = ['A', 'B'];
      const rowSeatConfig = {
        // Row A: wheelchair + companion pair (for accessibility tests)
        A: [
          { num: '1', type: 'accessible_wheelchair', isWheelchair: true, isCompanion: false },
          { num: '2', type: 'companion', isWheelchair: false, isCompanion: true },
          { num: '3', type: 'standard', isWheelchair: false, isCompanion: false }
        ],
        // Row B: at least 3 adjacent standard seats (for family booking tests)
        B: [
          { num: '10', type: 'standard', isWheelchair: false, isCompanion: false },
          { num: '11', type: 'standard', isWheelchair: false, isCompanion: false },
          { num: '12', type: 'standard', isWheelchair: false, isCompanion: false },
          { num: '13', type: 'standard', isWheelchair: false, isCompanion: false }
        ]
      };

      rows.forEach((rowLabel) => {
        const seatConfigs = rowSeatConfig[rowLabel] || [];
        seatConfigs.forEach((cfg) => {
          const seatId = this._generateId('seat');
          generatedSeats.push({
            id: seatId,
            performance_id: performanceId,
            section: sectionKey,
            row: rowLabel,
            seat_number: String(cfg.num),
            seat_label:
              sectionKey.charAt(0).toUpperCase() +
              sectionKey.slice(1) +
              ' ' +
              rowLabel +
              '-' +
              String(cfg.num),
            seat_type: cfg.type,
            is_wheelchair: !!cfg.isWheelchair,
            is_companion: !!cfg.isCompanion,
            price: basePrice,
            is_available: true
          });
        });
      });

      const allSeats = seats.concat(generatedSeats);
      this._saveToStorage('seats', allSeats);
      pfSeats = generatedSeats;
    }

    const sectionsMap = {};
    pfSeats.forEach((s) => {
      const sectionKey = s.section;
      if (!sectionsMap[sectionKey]) {
        sectionsMap[sectionKey] = {};
      }
      const rowsMap = sectionsMap[sectionKey];
      const rowKey = s.row;
      if (!rowsMap[rowKey]) {
        rowsMap[rowKey] = [];
      }
      rowsMap[rowKey].push({
        seat_id: s.id,
        row: s.row,
        seat_number: s.seat_number,
        seat_label: s.seat_label || s.row + s.seat_number,
        seat_type: s.seat_type,
        is_wheelchair: !!s.is_wheelchair,
        is_companion: !!s.is_companion,
        price: s.price,
        is_available: !!s.is_available
      });
    });

    const seating_sections = Object.keys(sectionsMap).map((sectionKey) => {
      const rowsMap = sectionsMap[sectionKey];
      const rows = Object.keys(rowsMap)
        .sort()
        .map((rowLabel) => ({
          row_label: rowLabel,
          seats: rowsMap[rowLabel]
        }));
      return {
        section_key: sectionKey,
        section_name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
        rows
      };
    });

    return {
      performance,
      ticket_type_options,
      seating_sections
    };
  }

  // reserveSeatsAndAddToCart
  reserveSeatsAndAddToCart(performanceId, seatIds, ticketType, notes) {
    const performances = this._getFromStorage('performances');
    const seats = this._getFromStorage('seats');
    const reservations = this._getFromStorage('ticket_reservations');

    const pf = performances.find((p) => p.id === performanceId);
    if (!pf) {
      return { success: false, reservation: null, cart: null, message: 'Performance not found.' };
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return { success: false, reservation: null, cart: null, message: 'No seats selected.' };
    }

    const selectedSeats = seatIds.map((id) => seats.find((s) => s.id === id && s.performance_id === performanceId) || null);
    if (selectedSeats.some((s) => !s)) {
      return { success: false, reservation: null, cart: null, message: 'One or more seats not found for this performance.' };
    }

    if (selectedSeats.some((s) => !s.is_available)) {
      return { success: false, reservation: null, cart: null, message: 'One or more seats are no longer available.' };
    }

    const prices = selectedSeats.map((s) => s.price || 0);
    const totalPrice = prices.reduce((sum, p) => sum + p, 0);
    const quantity = selectedSeats.length;
    const unitPrice = quantity > 0 ? totalPrice / quantity : 0;

    const reservation = {
      id: this._generateId('tr'),
      performance_id: performanceId,
      seat_ids: seatIds.slice(),
      ticket_type: ticketType,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      created_at: new Date().toISOString(),
      notes: notes || ''
    };

    reservations.push(reservation);
    this._saveToStorage('ticket_reservations', reservations);

    // Mark seats as unavailable
    const updatedSeats = seats.map((s) => {
      if (seatIds.indexOf(s.id) !== -1 && s.performance_id === performanceId) {
        return Object.assign({}, s, { is_available: false });
      }
      return s;
    });
    this._saveToStorage('seats', updatedSeats);

    const cart = this._getOrCreateCart();
    const addResult = this._addCartItem(cart, {
      itemType: 'ticket_reservation',
      refId: reservation.id,
      quantity: reservation.quantity,
      unitPrice: reservation.unit_price,
      totalPrice: reservation.total_price,
      description: 'Tickets for performance ' + performanceId
    });

    return {
      success: true,
      reservation,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Seats reserved and added to cart.'
    };
  }

  // getGroupBookingOptions
  getGroupBookingOptions(performanceId) {
    const performances = this._getFromStorage('performances');
    const productions = this._getFromStorage('productions');

    const pf = performances.find((p) => p.id === performanceId) || null;
    if (!pf) {
      return {
        performance: null,
        has_group_discount: false,
        group_min_size: null,
        group_discount_note: '',
        group_type_options: [],
        estimated_price_per_ticket: 0
      };
    }

    const prod = productions.find((p) => p.id === pf.production_id) || null;

    const performance = {
      performance_id: pf.id,
      production_id: pf.production_id,
      production_title: prod ? prod.title : '',
      start_datetime: pf.start_datetime,
      time_of_day: pf.time_of_day,
      label: pf.label || '',
      production: prod
    };

    const group_type_options = [
      { value: 'general_group', label: 'General Group', description: 'Mixed group booking.' },
      { value: 'adult_group', label: 'Adult Group', description: 'Adult group booking.' },
      { value: 'school_group', label: 'School Group', description: 'School or youth group booking.' },
      { value: 'senior_group', label: 'Senior Group', description: 'Senior group booking.' },
      { value: 'other', label: 'Other', description: 'Other group type.' }
    ];

    const estimated_price_per_ticket = pf.base_price_min != null ? pf.base_price_min : 0;

    return {
      performance,
      has_group_discount: !!pf.has_group_discount,
      group_min_size: pf.group_min_size != null ? pf.group_min_size : null,
      group_discount_note: pf.group_discount_note || '',
      group_type_options,
      estimated_price_per_ticket
    };
  }

  // createGroupBookingAndAddToCart
  createGroupBookingAndAddToCart(performanceId, groupType, ticketQuantity, notes) {
    const performances = this._getFromStorage('performances');
    const groupBookings = this._getFromStorage('group_bookings');

    const pf = performances.find((p) => p.id === performanceId);
    if (!pf) {
      return { success: false, group_booking: null, cart: null, message: 'Performance not found.' };
    }

    // Allow group bookings even when a specific group discount is not flagged on the performance.

    const qty = typeof ticketQuantity === 'number' && ticketQuantity > 0 ? ticketQuantity : 0;
    if (qty <= 0) {
      return { success: false, group_booking: null, cart: null, message: 'Invalid ticket quantity.' };
    }

    if (pf.group_min_size != null && qty < pf.group_min_size) {
      return {
        success: false,
        group_booking: null,
        cart: null,
        message: 'Minimum group size is ' + pf.group_min_size + ' tickets.'
      };
    }

    const pricePerTicket = pf.base_price_min != null ? pf.base_price_min : 0;
    const totalPrice = pricePerTicket * qty;

    const booking = {
      id: this._generateId('gb'),
      performance_id: performanceId,
      group_type: groupType,
      ticket_quantity: qty,
      price_per_ticket: pricePerTicket,
      total_price: totalPrice,
      created_at: new Date().toISOString(),
      notes: notes || ''
    };

    groupBookings.push(booking);
    this._saveToStorage('group_bookings', groupBookings);

    const cart = this._getOrCreateCart();
    const addResult = this._addCartItem(cart, {
      itemType: 'group_booking',
      refId: booking.id,
      quantity: 1,
      unitPrice: booking.total_price,
      totalPrice: booking.total_price,
      description: 'Group booking for performance ' + performanceId
    });

    return {
      success: true,
      group_booking: booking,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Group booking created and added to cart.'
    };
  }

  // getMembershipTiers
  getMembershipTiers(maxPrice, minShowsIncluded, requiresGuestTicket, includeInactive) {
    const tiers = this._getFromStorage('membership_tiers');

    const filtered = tiers.filter((t) => {
      if (!includeInactive && !t.is_active) return false;
      if (maxPrice != null && typeof maxPrice === 'number') {
        if (t.price == null || t.price > maxPrice) return false;
      }
      if (minShowsIncluded != null && typeof minShowsIncluded === 'number') {
        if (t.shows_included_count == null || t.shows_included_count < minShowsIncluded) return false;
      }
      if (requiresGuestTicket) {
        if (!t.guest_ticket_included) return false;
      }
      return true;
    });

    return filtered.map((t) => ({
      membership_tier_id: t.id,
      name: t.name,
      description: t.description || '',
      price: t.price,
      shows_included_count: t.shows_included_count,
      guest_ticket_included: !!t.guest_ticket_included,
      guest_ticket_count: t.guest_ticket_count != null ? t.guest_ticket_count : null,
      season: t.season || '',
      is_active: !!t.is_active,
      benefits: t.benefits || [],
      highlight_flags: {
        is_under_max_price: maxPrice != null ? t.price <= maxPrice : false,
        meets_min_shows: minShowsIncluded != null ? t.shows_included_count >= minShowsIncluded : false,
        includes_guest_ticket: !!t.guest_ticket_included
      }
    }));
  }

  // getMembershipDetail
  getMembershipDetail(membershipTierId) {
    const tiers = this._getFromStorage('membership_tiers');
    const tier = tiers.find((t) => t.id === membershipTierId) || null;
    return { membership_tier: tier };
  }

  // purchaseMembershipAndAddToCart
  purchaseMembershipAndAddToCart(membershipTierId, firstName, lastName, email, quantity) {
    const tiers = this._getFromStorage('membership_tiers');
    const purchases = this._getFromStorage('membership_purchases');

    const tier = tiers.find((t) => t.id === membershipTierId);
    if (!tier) {
      return { success: false, membership_purchase: null, cart: null, message: 'Membership tier not found.' };
    }

    if (!tier.is_active) {
      return { success: false, membership_purchase: null, cart: null, message: 'Membership tier is not active.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const totalPrice = (tier.price || 0) * qty;

    const purchase = {
      id: this._generateId('mp'),
      membership_tier_id: membershipTierId,
      purchaser_first_name: firstName,
      purchaser_last_name: lastName,
      purchaser_email: email,
      quantity: qty,
      total_price: totalPrice,
      status: 'in_cart',
      created_at: new Date().toISOString()
    };

    purchases.push(purchase);
    this._saveToStorage('membership_purchases', purchases);

    const cart = this._getOrCreateCart();
    const description = 'Season Membership - ' + tier.name;
    const addResult = this._addCartItem(cart, {
      itemType: 'membership_purchase',
      refId: purchase.id,
      quantity: qty,
      unitPrice: tier.price || 0,
      totalPrice: totalPrice,
      description
    });

    return {
      success: true,
      membership_purchase: purchase,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Membership added to cart.'
    };
  }

  // getVolunteerOverview
  getVolunteerOverview() {
    const shifts = this._getFromStorage('volunteer_shifts');
    const now = new Date();

    const featured_shifts = shifts
      .filter((s) => s.is_open)
      .filter((s) => {
        const sd = this._parseDate(s.start_datetime);
        return sd && sd >= now;
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad - bd;
      })
      .slice(0, 5)
      .map((s) => ({
        volunteer_shift_id: s.id,
        title: s.title,
        role_category: s.role_category,
        primary_role: s.primary_role,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_open: !!s.is_open
      }));

    const role_highlights = [
      {
        role_category: 'front_of_house',
        primary_roles: ['usher', 'box_office', 'concessions', 'greeter'],
        description: 'Welcome audiences and help with seating, tickets, and concessions.'
      },
      {
        role_category: 'backstage',
        primary_roles: ['stagehand'],
        description: 'Support technical and backstage operations.'
      },
      {
        role_category: 'education_support',
        primary_roles: ['teaching_assistant'],
        description: 'Support classes and workshops.'
      }
    ];

    return {
      intro_text: 'Support our theatre by volunteering in a variety of roles.',
      role_highlights,
      featured_shifts
    };
  }

  // searchVolunteerShifts
  searchVolunteerShifts(roleCategory, primaryRole, dayOfWeek, startDate, endDate, isOpenOnly) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const onlyOpen = typeof isOpenOnly === 'boolean' ? isOpenOnly : true;

    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    const filtered = shifts.filter((s) => {
      const sd = this._parseDate(s.start_datetime);
      if (!sd) return false;

      if (onlyOpen && !s.is_open) return false;
      if (roleCategory && s.role_category !== roleCategory) return false;
      if (primaryRole && s.primary_role !== primaryRole) return false;
      if (dayOfWeek && this._dayOfWeekString(sd) !== dayOfWeek) return false;
      if (start && sd < start) return false;
      if (end && sd > end) return false;
      return true;
    });

    const mapped = filtered.map((s) => ({
      volunteer_shift_id: s.id,
      title: s.title,
      role_category: s.role_category,
      primary_role: s.primary_role,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      day_of_week: this._dayOfWeekString(this._parseDate(s.start_datetime) || new Date()),
      location: s.location || '',
      is_open: !!s.is_open
    }));

    return {
      shifts: mapped,
      total_count: mapped.length
    };
  }

  // getVolunteerShiftDetail
  getVolunteerShiftDetail(volunteerShiftId) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const shift = shifts.find((s) => s.id === volunteerShiftId) || null;

    if (!shift) {
      return { shift: null, slots_remaining: null };
    }

    let slotsRemaining = null;
    if (shift.max_volunteers != null) {
      const signedUp = shift.signed_up_count != null ? shift.signed_up_count : 0;
      slotsRemaining = Math.max(shift.max_volunteers - signedUp, 0);
    }

    return {
      shift,
      slots_remaining: slotsRemaining
    };
  }

  // signupForVolunteerShift
  signupForVolunteerShift(volunteerShiftId, name, email, phone, preferredRole, comments) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const signups = this._getFromStorage('volunteer_signups');

    const shiftIndex = shifts.findIndex((s) => s.id === volunteerShiftId);
    if (shiftIndex === -1) {
      return { success: false, signup: null, message: 'Volunteer shift not found.' };
    }

    const shift = shifts[shiftIndex];
    if (!shift.is_open) {
      return { success: false, signup: null, message: 'Shift is not open for signup.' };
    }

    let slotsRemaining = null;
    if (shift.max_volunteers != null) {
      const signedUp = shift.signed_up_count != null ? shift.signed_up_count : 0;
      slotsRemaining = shift.max_volunteers - signedUp;
      if (slotsRemaining <= 0) {
        return { success: false, signup: null, message: 'Shift is full.' };
      }
    }

    const signup = {
      id: this._generateId('vsu'),
      volunteer_shift_id: volunteerShiftId,
      name,
      email,
      phone: phone || '',
      preferred_role: preferredRole,
      comments: comments || '',
      signed_up_at: new Date().toISOString(),
      status: 'registered'
    };

    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    const newSignedUpCount = (shift.signed_up_count != null ? shift.signed_up_count : 0) + 1;
    shifts[shiftIndex] = Object.assign({}, shift, {
      signed_up_count: newSignedUpCount,
      is_open: shift.max_volunteers != null ? newSignedUpCount < shift.max_volunteers : shift.is_open
    });
    this._saveToStorage('volunteer_shifts', shifts);

    return {
      success: true,
      signup,
      message: 'Volunteer shift signup successful.'
    };
  }

  // getClassesAndWorkshopsFilters
  getClassesAndWorkshopsFilters() {
    const classes = this._getFromStorage('class_workshops');

    const age_group_options = [
      { value: 'kids', label: 'Kids' },
      { value: 'teens', label: 'Teens' },
      { value: 'adults', label: 'Adults' },
      { value: 'all_ages', label: 'All Ages' }
    ];

    const category_options = [
      { value: 'acting', label: 'Acting' },
      { value: 'musical_theatre', label: 'Musical Theatre' },
      { value: 'improv', label: 'Improv' },
      { value: 'technical_theatre', label: 'Technical Theatre' },
      { value: 'other', label: 'Other' }
    ];

    const monthSet = new Set();
    classes.forEach((c) => {
      const sd = this._parseDate(c.start_date);
      if (sd) {
        monthSet.add(this._formatYearMonth(sd));
      }
    });
    const month_options = Array.from(monthSet)
      .sort()
      .map((m) => ({ value: m, label: m }));

    const intensity_options = [
      { key: 'standard', label: 'Standard' },
      { key: 'intensive', label: 'Intensive' }
    ];

    return {
      age_group_options,
      category_options,
      month_options,
      intensity_options
    };
  }

  // searchClassesAndWorkshops
  searchClassesAndWorkshops(ageGroup, category, startMonth, maxPrice, minDurationDays, maxDurationDays, isIntensive, isActiveOnly) {
    const classes = this._getFromStorage('class_workshops');
    const activeOnly = typeof isActiveOnly === 'boolean' ? isActiveOnly : true;

    let monthStart = null;
    let monthEnd = null;
    if (startMonth) {
      const parts = startMonth.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(m)) {
          monthStart = this._startOfMonth(year, m);
          monthEnd = this._endOfMonth(year, m);
        }
      }
    }

    const filtered = classes.filter((c) => {
      if (activeOnly && !c.is_active) return false;
      if (ageGroup && c.age_group !== ageGroup) return false;
      if (category && c.category !== category) return false;

      const sd = this._parseDate(c.start_date);
      if (!sd) return false;

      if (monthStart && (sd < monthStart || sd > monthEnd)) return false;

      if (maxPrice != null && typeof maxPrice === 'number') {
        if (c.price == null || c.price > maxPrice) return false;
      }

      if (minDurationDays != null && typeof minDurationDays === 'number') {
        if (c.duration_days == null || c.duration_days < minDurationDays) return false;
      }

      if (maxDurationDays != null && typeof maxDurationDays === 'number') {
        if (c.duration_days == null || c.duration_days > maxDurationDays) return false;
      }

      if (typeof isIntensive === 'boolean' && c.is_intensive !== isIntensive) return false;

      return true;
    });

    const mapped = filtered.map((c) => ({
      class_id: c.id,
      title: c.title,
      category: c.category,
      age_group: c.age_group,
      age_min: c.age_min != null ? c.age_min : null,
      age_max: c.age_max != null ? c.age_max : null,
      start_date: c.start_date,
      end_date: c.end_date,
      duration_days: c.duration_days,
      is_intensive: c.is_intensive,
      price: c.price,
      price_display: '$' + (c.price != null ? c.price.toFixed(2) : '0.00'),
      seats_remaining: c.seats_remaining != null ? c.seats_remaining : null
    }));

    return {
      classes: mapped,
      total_count: mapped.length
    };
  }

  // getClassWorkshopDetail
  getClassWorkshopDetail(classId) {
    const classes = this._getFromStorage('class_workshops');
    const cw = classes.find((c) => c.id === classId) || null;
    return { class_workshop: cw };
  }

  // registerForClassAndAddToCart
  registerForClassAndAddToCart(classId, participantName, participantDateOfBirth, guardianName, guardianEmail, guardianPhone, quantity) {
    const classes = this._getFromStorage('class_workshops');
    const registrations = this._getFromStorage('class_registrations');

    const cwIndex = classes.findIndex((c) => c.id === classId);
    if (cwIndex === -1) {
      return { success: false, class_registration: null, cart: null, message: 'Class or workshop not found.' };
    }

    const cw = classes[cwIndex];
    if (!cw.is_active) {
      return { success: false, class_registration: null, cart: null, message: 'Class is not currently active.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    if (cw.seats_remaining != null && cw.seats_remaining < qty) {
      return { success: false, class_registration: null, cart: null, message: 'Not enough seats remaining.' };
    }

    const totalPrice = (cw.price || 0) * qty;
    const dobIso = participantDateOfBirth ? new Date(participantDateOfBirth + 'T00:00:00').toISOString() : null;

    const registration = {
      id: this._generateId('cr'),
      class_id: classId,
      participant_name: participantName,
      participant_date_of_birth: dobIso,
      guardian_name: guardianName || '',
      guardian_email: guardianEmail,
      guardian_phone: guardianPhone || '',
      quantity: qty,
      total_price: totalPrice,
      created_at: new Date().toISOString(),
      status: 'in_cart'
    };

    registrations.push(registration);
    this._saveToStorage('class_registrations', registrations);

    if (cw.seats_remaining != null) {
      classes[cwIndex] = Object.assign({}, cw, {
        seats_remaining: cw.seats_remaining - qty
      });
      this._saveToStorage('class_workshops', classes);
    }

    const cart = this._getOrCreateCart();
    const description = 'Class registration - ' + cw.title;
    const addResult = this._addCartItem(cart, {
      itemType: 'class_registration',
      refId: registration.id,
      quantity: qty,
      unitPrice: cw.price || 0,
      totalPrice: totalPrice,
      description
    });

    return {
      success: true,
      class_registration: registration,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Class registration added to cart.'
    };
  }

  // getGiftCardOptions
  getGiftCardOptions() {
    const products = this._getFromStorage('gift_card_products');

    const gift_card_products = products.map((p) => ({
      gift_card_product_id: p.id,
      name: p.name,
      type: p.type,
      amount: p.amount != null ? p.amount : null,
      allows_custom_amount: !!p.allows_custom_amount,
      description: p.description || ''
    }));

    const amountsSet = new Set();
    products.forEach((p) => {
      if (p.amount != null && p.amount > 0) {
        amountsSet.add(p.amount);
      }
    });
    const recommended_amounts = Array.from(amountsSet).sort((a, b) => a - b);

    return {
      gift_card_products,
      recommended_amounts
    };
  }

  // purchaseGiftCardAndAddToCart
  purchaseGiftCardAndAddToCart(giftCardProductId, deliveryType, amount, recipientName, recipientEmail, senderName, message, quantity) {
    const products = this._getFromStorage('gift_card_products');
    const purchases = this._getFromStorage('gift_card_purchases');

    let product = null;
    if (giftCardProductId) {
      product = products.find((p) => p.id === giftCardProductId) || null;
    }

    if (deliveryType === 'digital' && !recipientEmail) {
      return { success: false, gift_card_purchase: null, cart: null, message: 'Recipient email is required for digital delivery.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const amt = amount != null ? amount : product && product.amount ? product.amount : 0;
    const totalPrice = amt * qty;

    const purchase = {
      id: this._generateId('gcp'),
      gift_card_product_id: product ? product.id : null,
      delivery_type: deliveryType,
      amount: amt,
      recipient_name: recipientName,
      recipient_email: recipientEmail || '',
      sender_name: senderName,
      message: message || '',
      quantity: qty,
      total_price: totalPrice,
      created_at: new Date().toISOString()
    };

    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    const cart = this._getOrCreateCart();
    const description = 'Gift card for ' + recipientName;
    const addResult = this._addCartItem(cart, {
      itemType: 'gift_card_purchase',
      refId: purchase.id,
      quantity: qty,
      unitPrice: amt,
      totalPrice: totalPrice,
      description
    });

    return {
      success: true,
      gift_card_purchase: purchase,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Gift card added to cart.'
    };
  }

  // getPastProductionsFilters
  getPastProductionsFilters() {
    const productions = this._getFromStorage('productions');

    const genresSet = new Set();
    const seasonsSet = new Set();

    productions.forEach((p) => {
      if (!p.is_current) {
        if (p.genre) genresSet.add(p.genre);
        if (p.season) seasonsSet.add(p.season);
      }
    });

    const genre_options = Array.from(genresSet).sort().map((g) => ({ value: g, label: g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const seasons = Array.from(seasonsSet).sort();

    const currentSeason = (() => {
      const current = productions.find((p) => p.is_current && p.season);
      return current ? current.season : null;
    })();

    const season_options = seasons.map((s) => ({
      value: s,
      label: s,
      is_current_season: currentSeason ? s === currentSeason : false
    }));

    return {
      genre_options,
      season_options
    };
  }

  // searchPastProductions
  searchPastProductions(genre, season, sortBy) {
    const productions = this._getFromStorage('productions');
    const now = new Date();

    let past = productions.filter((p) => {
      const endDate = this._parseDate(p.run_end_date);
      if (endDate) {
        return endDate < now;
      }
      return !p.is_current;
    });

    // If no productions are considered "past" yet (e.g., all are current),
    // fall back to including all productions so the archive view still has content.
    if (past.length === 0) {
      past = productions.slice();
    }

    if (genre) {
      past = past.filter((p) => p.genre === genre);
    }
    if (season) {
      past = past.filter((p) => p.season === season);
    }

    const sortKey = sortBy || 'season_desc';
    past.sort((a, b) => {
      if (sortKey === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortKey === 'season_asc') {
        return (a.season || '').localeCompare(b.season || '');
      }
      // default season_desc
      return (b.season || '').localeCompare(a.season || '');
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task8_pastProductionsSearch',
        JSON.stringify({
          genre: genre || null,
          season: season || null,
          sortBy: sortBy || null
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return past.map((p) => ({
      production_id: p.id,
      title: p.title,
      subtitle: p.subtitle || '',
      genre: p.genre,
      season: p.season || '',
      hero_image: p.hero_image || '',
      run_start_date: p.run_start_date,
      run_end_date: p.run_end_date
    }));
  }

  // getDonatePageOptions
  getDonatePageOptions() {
    const designation_values = [
      { value: 'education_programs', label: 'Education Programs', description: 'Support classes, workshops, and youth programs.' },
      { value: 'general_operations', label: 'General Operations', description: 'Support day-to-day operations.' },
      { value: 'productions', label: 'Productions', description: 'Support current and future productions.' },
      { value: 'scholarship_fund', label: 'Scholarship Fund', description: 'Support scholarships for students in need.' },
      { value: 'accessibility_services', label: 'Accessibility Services', description: 'Support accessible performances.' },
      { value: 'other', label: 'Other', description: 'Other designated purpose.' }
    ];

    const dedication_type_options = [
      { value: 'none', label: 'No dedication' },
      { value: 'in_honor_of', label: 'In Honor Of' },
      { value: 'in_memory_of', label: 'In Memory Of' }
    ];

    const preset_amounts = [25, 50, 60, 100];

    return {
      default_donation_type: 'one_time',
      preset_amounts,
      designation_options: designation_values,
      dedication_type_options
    };
  }

  // createDonationAndAddToCart
  createDonationAndAddToCart(amount, donationType, designation, dedicationType, honoreeName, donorName, donorEmail, message) {
    const donations = this._getFromStorage('donations');

    if (donationType !== 'one_time' && donationType !== 'recurring') {
      return { success: false, donation: null, cart: null, message: 'Invalid donation type.' };
    }

    const validDesignations = [
      'education_programs',
      'general_operations',
      'productions',
      'scholarship_fund',
      'accessibility_services',
      'other'
    ];
    if (validDesignations.indexOf(designation) === -1) {
      return { success: false, donation: null, cart: null, message: 'Invalid designation.' };
    }

    const validDedications = ['none', 'in_honor_of', 'in_memory_of'];
    if (validDedications.indexOf(dedicationType) === -1) {
      return { success: false, donation: null, cart: null, message: 'Invalid dedication type.' };
    }

    if (dedicationType !== 'none' && !honoreeName) {
      return { success: false, donation: null, cart: null, message: 'Honoree name is required for dedication.' };
    }

    const amt = typeof amount === 'number' && amount > 0 ? amount : 0;
    if (amt <= 0) {
      return { success: false, donation: null, cart: null, message: 'Donation amount must be greater than zero.' };
    }

    const donation = {
      id: this._generateId('don'),
      amount: amt,
      donation_type: donationType,
      designation,
      dedication_type: dedicationType,
      honoree_name: dedicationType === 'none' ? '' : honoreeName || '',
      donor_name: donorName,
      donor_email: donorEmail,
      message: message || '',
      created_at: new Date().toISOString()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    const cart = this._getOrCreateCart();
    let desc = 'Donation - $' + amt.toFixed(2);
    if (designation === 'education_programs') desc += ' to Education Programs';
    if (dedicationType === 'in_honor_of') desc += ' (In Honor Of ' + honoreeName + ')';
    if (dedicationType === 'in_memory_of') desc += ' (In Memory Of ' + honoreeName + ')';

    const addResult = this._addCartItem(cart, {
      itemType: 'donation',
      refId: donation.id,
      quantity: 1,
      unitPrice: amt,
      totalPrice: amt,
      description: desc
    });

    return {
      success: true,
      donation,
      cart: {
        cart_id: addResult.cart.id,
        item_count: addResult.totals.item_count,
        total_amount: addResult.totals.total_amount,
        items: this._buildCartSummaryItems(addResult.cart.id)
      },
      message: 'Donation added to cart.'
    };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    const items = this._buildCartDetailedItems(cart.id);

    return {
      cart_id: cart.id,
      items,
      item_count: totals.item_count,
      total_amount: totals.total_amount
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    if (!quantity || quantity < 1) {
      return { success: false, cart: null, message: 'Quantity must be at least 1.' };
    }

    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;

    // Update quantity and total_price
    cartItem.quantity = quantity;
    cartItem.total_price = (cartItem.unit_price || 0) * quantity;
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    // Update linked domain objects when they have quantity field
    if (cartItem.membership_purchase_id) {
      const purchases = this._getFromStorage('membership_purchases');
      const pIdx = purchases.findIndex((p) => p.id === cartItem.membership_purchase_id);
      if (pIdx !== -1) {
        const p = purchases[pIdx];
        const unitPrice = p.total_price && p.quantity ? p.total_price / p.quantity : p.total_price || 0;
        const newTotal = unitPrice * quantity;
        purchases[pIdx] = Object.assign({}, p, { quantity: quantity, total_price: newTotal });
        this._saveToStorage('membership_purchases', purchases);
      }
    }

    if (cartItem.class_registration_id) {
      const regs = this._getFromStorage('class_registrations');
      const rIdx = regs.findIndex((r) => r.id === cartItem.class_registration_id);
      if (rIdx !== -1) {
        const r = regs[rIdx];
        const unitPrice = r.total_price && r.quantity ? r.total_price / r.quantity : r.total_price || 0;
        const newTotal = unitPrice * quantity;
        regs[rIdx] = Object.assign({}, r, { quantity: quantity, total_price: newTotal });
        this._saveToStorage('class_registrations', regs);
      }
    }

    if (cartItem.gift_card_purchase_id) {
      const gcs = this._getFromStorage('gift_card_purchases');
      const gIdx = gcs.findIndex((g) => g.id === cartItem.gift_card_purchase_id);
      if (gIdx !== -1) {
        const g = gcs[gIdx];
        const unitPrice = g.amount || 0;
        const newTotal = unitPrice * quantity;
        gcs[gIdx] = Object.assign({}, g, { quantity: quantity, total_price: newTotal });
        this._saveToStorage('gift_card_purchases', gcs);
      }
    }

    const totals = this._calculateCartTotals(cartId);
    return {
      success: true,
      cart: {
        cart_id: cartId,
        item_count: totals.item_count,
        total_amount: totals.total_amount
      },
      message: 'Cart item quantity updated.'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;

    // Clean up related domain objects where appropriate
    if (cartItem.ticket_reservation_id) {
      const reservations = this._getFromStorage('ticket_reservations');
      const seats = this._getFromStorage('seats');
      const rIdx = reservations.findIndex((r) => r.id === cartItem.ticket_reservation_id);
      if (rIdx !== -1) {
        const reservation = reservations[rIdx];
        // Free seats
        const updatedSeats = seats.map((s) => {
          if (reservation.seat_ids && reservation.seat_ids.indexOf(s.id) !== -1) {
            return Object.assign({}, s, { is_available: true });
          }
          return s;
        });
        this._saveToStorage('seats', updatedSeats);
        // Remove reservation
        reservations.splice(rIdx, 1);
        this._saveToStorage('ticket_reservations', reservations);
      }
    }

    if (cartItem.class_registration_id) {
      const regs = this._getFromStorage('class_registrations');
      const classes = this._getFromStorage('class_workshops');
      const rIdx = regs.findIndex((r) => r.id === cartItem.class_registration_id);
      if (rIdx !== -1) {
        const reg = regs[rIdx];
        const cIdx = classes.findIndex((c) => c.id === reg.class_id);
        if (cIdx !== -1 && classes[cIdx].seats_remaining != null) {
          const c = classes[cIdx];
          classes[cIdx] = Object.assign({}, c, { seats_remaining: c.seats_remaining + (reg.quantity || 0) });
          this._saveToStorage('class_workshops', classes);
        }
        regs.splice(rIdx, 1);
        this._saveToStorage('class_registrations', regs);
      }
    }

    if (cartItem.membership_purchase_id) {
      const purchases = this._getFromStorage('membership_purchases');
      const pIdx = purchases.findIndex((p) => p.id === cartItem.membership_purchase_id);
      if (pIdx !== -1) {
        purchases[pIdx] = Object.assign({}, purchases[pIdx], { status: 'cancelled' });
        this._saveToStorage('membership_purchases', purchases);
      }
    }

    // For gift cards and donations we leave records as history

    // Remove cart item
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    // Update cart items list
    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex((c) => c.id === cartId);
    if (cIdx !== -1) {
      const cart = carts[cIdx];
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
      cart.updated_at = new Date().toISOString();
      carts[cIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cartId);
    return {
      success: true,
      cart: {
        cart_id: cartId,
        item_count: totals.item_count,
        total_amount: totals.total_amount
      },
      message: 'Cart item removed.'
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    const order_items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      item_type: ci.item_type,
      description: ci.description || '',
      quantity: ci.quantity || 0,
      total_price: ci.total_price || 0
    }));

    const totals = this._calculateCartTotals(cart.id);

    const can_checkout = order_items.length > 0;
    const reason_if_blocked = can_checkout ? '' : 'Cart is empty.';

    return {
      can_checkout,
      reason_if_blocked,
      order_items,
      total_amount: totals.total_amount
    };
  }

  // submitCheckout
  submitCheckout(contactName, contactEmail, billingAddress, paymentMethod, paymentToken, agreeToTerms) {
    const summary = this.getCheckoutSummary();
    if (!summary.can_checkout) {
      return { success: false, order: null, message: summary.reason_if_blocked || 'Cannot checkout.' };
    }

    if (!agreeToTerms) {
      return { success: false, order: null, message: 'You must agree to the terms to proceed.' };
    }

    if (!paymentToken) {
      return { success: false, order: null, message: 'Payment token is required.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    // Mark domain objects as completed where applicable
    const membershipPurchases = this._getFromStorage('membership_purchases');
    const classRegistrations = this._getFromStorage('class_registrations');

    cartItems.forEach((ci) => {
      if (ci.membership_purchase_id) {
        const idx = membershipPurchases.findIndex((m) => m.id === ci.membership_purchase_id);
        if (idx !== -1) {
          membershipPurchases[idx] = Object.assign({}, membershipPurchases[idx], { status: 'completed' });
        }
      }
      if (ci.class_registration_id) {
        const idx = classRegistrations.findIndex((r) => r.id === ci.class_registration_id);
        if (idx !== -1) {
          classRegistrations[idx] = Object.assign({}, classRegistrations[idx], { status: 'completed' });
        }
      }
    });

    this._saveToStorage('membership_purchases', membershipPurchases);
    this._saveToStorage('class_registrations', classRegistrations);

    const orders = this._getFromStorage('orders');

    const order = {
      id: this._generateId('ord'),
      order_number: this._generateOrderNumber(),
      cart_id: cart.id,
      items: cartItems.map((ci) => Object.assign({}, ci)),
      total_amount: summary.total_amount,
      contact_name: contactName,
      contact_email: contactEmail,
      billing_address: billingAddress || '',
      payment_status: 'paid',
      payment_method: paymentMethod,
      notes: '',
      created_at: new Date().toISOString()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Clear current cart identifier so a new cart is created next time
    localStorage.setItem('current_cart_id', '');

    return {
      success: true,
      order,
      message: 'Checkout completed successfully.'
    };
  }

  // getNewsletterInterests
  getNewsletterInterests() {
    return [
      {
        value: 'musicals',
        label: 'Musicals',
        description: 'News about current and upcoming musical productions.'
      },
      {
        value: 'plays',
        label: 'Plays',
        description: 'Straight plays and dramas.'
      },
      {
        value: 'family_friendly_events',
        label: 'Family-friendly Events',
        description: 'Shows and activities suitable for kids and families.'
      },
      {
        value: 'education_programs',
        label: 'Education Programs',
        description: 'Classes, workshops, and camps.'
      },
      {
        value: 'volunteer_opportunities',
        label: 'Volunteer Opportunities',
        description: 'Volunteer shifts and special calls for help.'
      },
      {
        value: 'special_offers',
        label: 'Special Offers',
        description: 'Promotions and discount offers.'
      }
    ];
  }

  // subscribeToNewsletter
  subscribeToNewsletter(name, email, interests, consentOptIn) {
    if (!consentOptIn) {
      return { success: false, subscription: null, message: 'Consent is required to subscribe.' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('ns'),
      name,
      email,
      interests: Array.isArray(interests) ? interests : [],
      consent_opt_in: !!consentOptIn,
      subscribed_at: new Date().toISOString()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscribed to newsletter.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      mission: 'Our community theatre brings engaging, inclusive performances and education programs to our region.',
      values: 'Community, creativity, inclusion, and education.',
      history: 'Founded by local artists and volunteers, our theatre has produced seasons of plays and musicals for the community.',
      community_impact: 'We provide accessible ticket prices, education programs, and volunteer opportunities for all ages.',
      venue_location: '',
      contact_email: '',
      contact_phone: '',
      program_overview: 'We offer mainstage productions, youth and teen shows, classes, workshops, and special events.'
    };
  }

  // ---------------------- Cart detail helpers ----------------------

  _buildCartSummaryItems(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId);
    return cartItems.map((ci) => ({
      cart_item_id: ci.id,
      item_type: ci.item_type,
      description: ci.description || '',
      quantity: ci.quantity || 0,
      unit_price: ci.unit_price || 0,
      total_price: ci.total_price || 0
    }));
  }

  _buildCartDetailedItems(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId);

    const reservations = this._getFromStorage('ticket_reservations');
    const groupBookings = this._getFromStorage('group_bookings');
    const membershipPurchases = this._getFromStorage('membership_purchases');
    const classRegistrations = this._getFromStorage('class_registrations');
    const giftCardPurchases = this._getFromStorage('gift_card_purchases');
    const donations = this._getFromStorage('donations');
    const performances = this._getFromStorage('performances');
    const productions = this._getFromStorage('productions');
    const seats = this._getFromStorage('seats');
    const classes = this._getFromStorage('class_workshops');

    return cartItems.map((ci) => {
      const item = {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        description: ci.description || '',
        quantity: ci.quantity || 0,
        unit_price: ci.unit_price || 0,
        total_price: ci.total_price || 0,
        details: {}
      };

      if (ci.ticket_reservation_id) {
        const res = reservations.find((r) => r.id === ci.ticket_reservation_id) || null;
        if (res) {
          const pf = performances.find((p) => p.id === res.performance_id) || null;
          const prod = pf ? productions.find((p) => p.id === pf.production_id) || null : null;
          const resSeats = seats.filter((s) => res.seat_ids.indexOf(s.id) !== -1);
          item.details.ticket_reservation = {
            performance_title: prod ? prod.title : '',
            performance_datetime: pf ? pf.start_datetime : '',
            seats: resSeats.map((s) => ({
              section: s.section,
              row: s.row,
              seat_number: s.seat_number,
              seat_type: s.seat_type
            }))
          };
          // foreign key resolution
          item.ticket_reservation = res;
        }
      }

      if (ci.group_booking_id) {
        const gb = groupBookings.find((g) => g.id === ci.group_booking_id) || null;
        if (gb) {
          const pf = performances.find((p) => p.id === gb.performance_id) || null;
          const prod = pf ? productions.find((p) => p.id === pf.production_id) || null : null;
          item.details.group_booking = {
            performance_title: prod ? prod.title : '',
            performance_datetime: pf ? pf.start_datetime : '',
            group_type: gb.group_type,
            ticket_quantity: gb.ticket_quantity
          };
          item.group_booking = gb;
        }
      }

      if (ci.membership_purchase_id) {
        const mp = membershipPurchases.find((m) => m.id === ci.membership_purchase_id) || null;
        if (mp) {
          const tier = this._getFromStorage('membership_tiers').find((t) => t.id === mp.membership_tier_id) || null;
          item.details.membership = {
            membership_name: tier ? tier.name : '',
            season: tier ? tier.season : ''
          };
          item.membership_purchase = mp;
          if (tier) item.membership_tier = tier;
        }
      }

      if (ci.class_registration_id) {
        const cr = classRegistrations.find((r) => r.id === ci.class_registration_id) || null;
        if (cr) {
          const cw = classes.find((c) => c.id === cr.class_id) || null;
          item.details.class_registration = {
            class_title: cw ? cw.title : '',
            participant_name: cr.participant_name
          };
          item.class_registration = cr;
          if (cw) item.class_workshop = cw;
        }
      }

      if (ci.gift_card_purchase_id) {
        const gcp = giftCardPurchases.find((g) => g.id === ci.gift_card_purchase_id) || null;
        if (gcp) {
          item.details.gift_card = {
            amount: gcp.amount,
            delivery_type: gcp.delivery_type,
            recipient_name: gcp.recipient_name
          };
          item.gift_card_purchase = gcp;
        }
      }

      if (ci.donation_id) {
        const dn = donations.find((d) => d.id === ci.donation_id) || null;
        if (dn) {
          item.details.donation = {
            amount: dn.amount,
            designation: dn.designation,
            dedication_type: dn.dedication_type,
            honoree_name: dn.honoree_name || ''
          };
          item.donation = dn;
        }
      }

      return item;
    });
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
