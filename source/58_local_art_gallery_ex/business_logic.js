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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Legacy demo keys from skeleton
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

    // Application data tables (arrays)
    const arrayKeys = [
      'exhibitions',
      'exhibition_ticket_slots',
      'ticket_bookings',
      'visit_plans',
      'visit_plan_items',
      'events',
      'event_registrations',
      'cart_items',
      'donation_funds',
      'donations',
      'membership_plans',
      'membership_enrollments',
      'newsletter_subscriptions',
      'guided_tours',
      'tour_schedules',
      'tour_bookings',
      'checkout_orders',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Singleton / object-like keys
    if (!localStorage.getItem('cart')) {
      // Single-user cart; null until created
      localStorage.setItem('cart', JSON.stringify(null));
    }

    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          title: '',
          missionText: '',
          visionText: '',
          historyHtml: '',
          keyPrograms: []
        })
      );
    }

    if (!localStorage.getItem('visit_info')) {
      localStorage.setItem(
        'visit_info',
        JSON.stringify({
          hoursSummary: '',
          locationAddress: '',
          directionsText: '',
          mapEmbedUrl: '',
          admissionSummary: '',
          accessibilitySummary: ''
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          address: '',
          phoneNumber: '',
          emailAddresses: [],
          openingHoursSummary: '',
          mapEmbedUrl: ''
        })
      );
    }

    if (!localStorage.getItem('policies_accessibility_content')) {
      localStorage.setItem(
        'policies_accessibility_content',
        JSON.stringify({
          privacyPolicyHtml: '',
          termsOfUseHtml: '',
          accessibilityStatementHtml: '',
          visitorPoliciesHtml: ''
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    let current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    if (!Number.isFinite(current)) {
      current = 1000;
    }

    // Ensure generated ids do not collide with existing seeded data
    const keysToScan = [
      'checkout_orders',
      'ticket_bookings',
      'tour_bookings',
      'membership_enrollments',
      'cart_items',
      'visit_plans',
      'visit_plan_items',
      'donations',
      'contact_messages',
      'newsletter_subscriptions',
      'exhibitions',
      'exhibition_ticket_slots',
      'guided_tours',
      'tour_schedules',
      'events',
      'products',
      'membership_plans',
      'donation_funds'
    ];

    for (const key of keysToScan) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        for (const item of parsed) {
          if (item && typeof item.id === 'string') {
            const match = item.id.match(/_(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (Number.isFinite(num) && num > current) {
                current = num;
              }
            }
          }
        }
      } catch (e) {
        // ignore malformed data
      }
    }

    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- Generic helpers ----------------------

  _formatDateRangeLabel(start, end) {
    if (!start && !end) return '';
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if ((s && isNaN(s.getTime())) || (e && isNaN(e.getTime()))) return '';

    const format = (d) => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return (
        months[d.getMonth()] +
        ' ' +
        d.getDate() +
        ', ' +
        d.getFullYear()
      );
    };

    if (s && e) {
      const sameDay =
        s.getFullYear() === e.getFullYear() &&
        s.getMonth() === e.getMonth() &&
        s.getDate() === e.getDate();
      if (sameDay) {
        return format(s);
      }
      return format(s) + '  ' + format(e);
    }
    if (s) return format(s);
    return format(e);
  }

  _dateToYMD(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _admissionLabelFromType(type) {
    if (type === 'free') return 'Free admission';
    if (type === 'donation_suggested') return 'Donation suggested';
    if (type === 'paid') return 'Ticketed admission';
    return '';
  }

  _priceDisplay(value, suffix) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const base = '$' + value.toFixed(2);
    return suffix ? base + ' ' + suffix : base;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getObjectFromStorage('cart', null);
    const nowIso = new Date().toISOString();
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        total: 0,
        currency: 'USD',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    for (const it of itemsForCart) {
      subtotal += typeof it.lineTotal === 'number' ? it.lineTotal : 0;
    }
    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.currency = cart.currency || 'USD';
    cart.updatedAt = new Date().toISOString();
    cart.items = itemsForCart.map((it) => ({
      cartItemId: it.id,
      productId: it.productId,
      productName: it.productName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      lineTotal: it.lineTotal
    }));
    this._saveToStorage('cart', cart);
  }

  // ---------------------- Visit plan helper ----------------------

  _getOrCreateVisitPlan() {
    let plans = this._getFromStorage('visit_plans');
    if (plans.length > 0) {
      return plans[0];
    }
    const nowIso = new Date().toISOString();
    const plan = {
      id: this._generateId('visit_plan'),
      name: 'My Visit Plan',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    plans.push(plan);
    this._saveToStorage('visit_plans', plans);
    return plan;
  }

  // ---------------------- Checkout helper ----------------------

  _createCheckoutOrder(orderType, referenceId, totalAmount, currency, itemsSummary) {
    const orders = this._getFromStorage('checkout_orders');
    const nowIso = new Date().toISOString();
    const order = {
      id: this._generateId('order'),
      orderType: orderType,
      referenceId: referenceId,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'in_progress',
      billingFullName: null,
      billingEmail: null,
      paymentMethod: totalAmount && totalAmount > 0 ? 'credit_debit_card' : 'no_payment_required',
      totalAmount: totalAmount || 0,
      currency: currency || 'USD',
      itemsSummary: itemsSummary || []
    };
    orders.push(order);
    this._saveToStorage('checkout_orders', orders);
    return order;
  }

  // ---------------------- Product helper ----------------------

  _applyProductFiltersAndSorting(products, options) {
    const { maxPrice, minRating, sortBy, onlyAvailable } = options || {};
    let result = products.slice();

    if (onlyAvailable) {
      result = result.filter((p) => p.isAvailable);
    }
    if (typeof maxPrice === 'number') {
      result = result.filter((p) => typeof p.price === 'number' && p.price <= maxPrice);
    }
    if (typeof minRating === 'number') {
      result = result.filter((p) => (p.ratingAverage || 0) >= minRating);
    }

    if (sortBy === 'customer_rating_high_to_low') {
      result.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    } else if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return result;
  }

  // ---------------------- Event helper ----------------------

  _applyEventFiltersAndSorting(events, options) {
    const { sortBy } = options || {};
    let result = events.slice();

    if (sortBy === 'start_time_soonest_first') {
      result.sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.basePriceAdult || 0) - (b.basePriceAdult || 0));
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => (b.basePriceAdult || 0) - (a.basePriceAdult || 0));
    }

    return result;
  }

  // ---------------------- Interface implementations ----------------------

  // getHomepageOverview
  getHomepageOverview() {
    const exhibitions = this._getFromStorage('exhibitions').filter((e) => e.isActive);
    const events = this._getFromStorage('events').filter((ev) => ev.isRegistrationOpen);

    exhibitions.sort((a, b) => {
      const da = this._parseDate(a.startDate) || new Date(0);
      const db = this._parseDate(b.startDate) || new Date(0);
      return da - db;
    });

    events.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || new Date(0);
      const db = this._parseDate(b.startDateTime) || new Date(0);
      return da - db;
    });

    const featuredExhibitions = exhibitions.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle || '',
      dateRangeText: this._formatDateRangeLabel(e.startDate, e.endDate),
      admissionLabel: this._admissionLabelFromType(e.admissionType),
      exhibitionType: e.exhibitionType,
      imageUrl: e.imageUrl || '',
      linkTarget: '/exhibitions/' + e.id,
      exhibition: e
    }));

    const featuredEvents = events.slice(0, 5).map((ev) => ({
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      dateTimeText: this._formatDateRangeLabel(ev.startDateTime, ev.endDateTime),
      priceDisplayText: ev.isFree
        ? 'Free'
        : this._priceDisplay(ev.basePriceAdult || 0, 'per adult'),
      imageUrl: ev.imageUrl || '',
      linkTarget: '/events/' + ev.id,
      event: ev
    }));

    const specialOffers = [];

    return {
      featuredExhibitions,
      featuredEvents,
      specialOffers
    };
  }

  // getVisitInfo
  getVisitInfo() {
    return this._getObjectFromStorage('visit_info', {
      hoursSummary: '',
      locationAddress: '',
      directionsText: '',
      mapEmbedUrl: '',
      admissionSummary: '',
      accessibilitySummary: ''
    });
  }

  // getVisitGuidedTourFilterOptions
  getVisitGuidedTourFilterOptions() {
    return {
      dayTypes: [
        { value: 'weekday', label: 'Weekdays (MonFri)' },
        { value: 'weekend', label: 'Weekends (SatSun)' }
      ],
      timeOfDayOptions: [
        { value: 'morning', label: 'Morning (10:00 AM  12:00 PM)' },
        { value: 'afternoon', label: 'Afternoon (12:00 PM  5:00 PM)' },
        { value: 'evening', label: 'Evening (5:00 PM  9:00 PM)' },
        { value: 'full_day', label: 'Full day' }
      ],
      accessibilityOptions: [
        { key: 'wheelchair_accessible_route', label: 'Wheelchair accessible route' }
      ],
      languageOptions: [
        { value: 'english', label: 'English' },
        { value: 'spanish', label: 'Spanish' },
        { value: 'french', label: 'French' },
        { value: 'german', label: 'German' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // searchGuidedTourSchedules
  searchGuidedTourSchedules(
    tourId,
    startDate,
    endDate,
    dayType,
    timeOfDay,
    isWheelchairAccessibleRoute,
    language
  ) {
    const schedules = this._getFromStorage('tour_schedules');
    const tours = this._getFromStorage('guided_tours');

    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    let result = [];

    for (const sched of schedules) {
      if (tourId && sched.tourId !== tourId) continue;
      if (dayType && sched.dayType !== dayType) continue;
      if (timeOfDay && sched.timeOfDay !== timeOfDay) continue;

      const start = this._parseDate(sched.startDateTime);
      if (startDateObj && start && start < startDateObj) continue;
      if (endDateObj && start && start > endDateObj) continue;

      const tour = tours.find((t) => t.id === sched.tourId) || null;
      if (typeof isWheelchairAccessibleRoute === 'boolean') {
        if (!tour || tour.isWheelchairAccessibleRoute !== isWheelchairAccessibleRoute) {
          continue;
        }
      }

      if (language && Array.isArray(sched.languagesAvailable)) {
        if (!sched.languagesAvailable.includes(language)) continue;
      }

      const item = {
        tourScheduleId: sched.id,
        tourId: sched.tourId,
        tourTitle: tour ? tour.title : '',
        dayOfWeek: sched.dayOfWeek,
        dayType: sched.dayType,
        startDateTime: sched.startDateTime,
        endDateTime: sched.endDateTime,
        timeOfDay: sched.timeOfDay,
        languagesAvailable: sched.languagesAvailable || [],
        isWheelchairAccessibleRoute: tour ? !!tour.isWheelchairAccessibleRoute : false,
        maxVisitors: sched.maxVisitors,
        remainingSpots: sched.remainingSpots,
        dateTimeDisplayText: this._formatDateRangeLabel(
          sched.startDateTime,
          sched.endDateTime
        ),
        tour: tour,
        tourSchedule: sched
      };
      result.push(item);
    }

    // Instrumentation for task completion tracking (task_8)
    try {
      if (
        dayType === 'weekday' &&
        timeOfDay === 'morning' &&
        isWheelchairAccessibleRoute === true
      ) {
        localStorage.setItem(
          'task8_tourFilterParams',
          JSON.stringify({
            tourId,
            startDate,
            endDate,
            dayType,
            timeOfDay,
            isWheelchairAccessibleRoute,
            language,
            resultCount: result.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task8_tourFilterParams):', e);
    }

    // Default sort by startDateTime
    result.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || new Date(0);
      const db = this._parseDate(b.startDateTime) || new Date(0);
      return da - db;
    });

    return result;
  }

  // getGuidedTourDetail
  getGuidedTourDetail(tourId) {
    const tours = this._getFromStorage('guided_tours');
    const schedules = this._getFromStorage('tour_schedules');

    const tour = tours.find((t) => t.id === tourId) || null;

    const now = new Date();
    const upcomingSchedules = schedules
      .filter((s) => s.tourId === tourId && this._parseDate(s.startDateTime) >= now)
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      })
      .map((s) => ({
        tourScheduleId: s.id,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        timeOfDay: s.timeOfDay,
        languagesAvailable: s.languagesAvailable || [],
        remainingSpots: s.remainingSpots,
        dateTimeDisplayText: this._formatDateRangeLabel(
          s.startDateTime,
          s.endDateTime
        ),
        tourSchedule: s
      }));

    let defaultLanguageLabel = '';
    if (tour && tour.defaultLanguage) {
      const map = {
        english: 'English',
        spanish: 'Spanish',
        french: 'French',
        german: 'German',
        other: 'Other'
      };
      defaultLanguageLabel = map[tour.defaultLanguage] || tour.defaultLanguage;
    }

    const accessibilityDetails = tour
      ? tour.isWheelchairAccessibleRoute
        ? 'Wheelchair-accessible route available.'
        : 'Standard tour route.'
      : '';

    return {
      tour,
      accessibilityDetails,
      defaultLanguageLabel,
      upcomingSchedules
    };
  }

  // bookGuidedTourAndCreateOrder
  bookGuidedTourAndCreateOrder(tourScheduleId, numberOfVisitors, language) {
    const schedules = this._getFromStorage('tour_schedules');
    const tours = this._getFromStorage('guided_tours');
    const bookings = this._getFromStorage('tour_bookings');

    const schedule = schedules.find((s) => s.id === tourScheduleId);
    if (!schedule) {
      return {
        success: false,
        message: 'Tour schedule not found.',
        tourBooking: null,
        checkoutOrder: null
      };
    }

    const tour = tours.find((t) => t.id === schedule.tourId) || null;

    if (typeof schedule.remainingSpots === 'number' && schedule.remainingSpots <= 0) {
      return {
        success: false,
        message: 'Not enough remaining spots for this tour.',
        tourBooking: null,
        checkoutOrder: null
      };
    }

    const pricePerVisitor = tour && typeof tour.basePricePerVisitor === 'number'
      ? tour.basePricePerVisitor
      : 0;
    const totalPrice = pricePerVisitor * numberOfVisitors;

    const nowIso = new Date().toISOString();
    const booking = {
      id: this._generateId('tour_booking'),
      tourScheduleId: schedule.id,
      tourId: schedule.tourId,
      bookingCreatedAt: nowIso,
      visitDateTime: schedule.startDateTime,
      numberOfVisitors: numberOfVisitors,
      language: language || (tour ? tour.defaultLanguage || 'english' : 'english'),
      totalPrice: totalPrice,
      bookingStatus: 'in_progress',
      checkoutOrderId: null
    };

    const itemsSummary = [
      {
        description: (tour ? tour.title : 'Guided tour') + ' booking',
        quantity: numberOfVisitors,
        unitPrice: pricePerVisitor,
        lineTotal: totalPrice
      }
    ];

    const order = this._createCheckoutOrder(
      'tour_booking',
      booking.id,
      totalPrice,
      'USD',
      itemsSummary
    );

    booking.checkoutOrderId = order.id;
    bookings.push(booking);
    this._saveToStorage('tour_bookings', bookings);

    return {
      success: true,
      message: 'Tour booking created.',
      tourBooking: booking,
      checkoutOrder: order
    };
  }

  // getExhibitionsFilterOptions
  getExhibitionsFilterOptions() {
    const exhibitions = this._getFromStorage('exhibitions');
    let minDate = null;
    let maxDate = null;
    for (const e of exhibitions) {
      const s = this._parseDate(e.startDate);
      const ed = this._parseDate(e.endDate);
      if (s && (!minDate || s < minDate)) minDate = s;
      if (ed && (!maxDate || ed > maxDate)) maxDate = ed;
    }
    const today = new Date();
    const dateRangeDefaults = {
      startDate: this._dateToYMD(minDate || today),
      endDate: this._dateToYMD(maxDate || today)
    };

    const admissionTypes = [
      { value: 'free', label: 'Free admission' },
      { value: 'paid', label: 'Ticketed admission' },
      { value: 'donation_suggested', label: 'Donation suggested' }
    ];

    const audienceSuitabilityOptions = [
      { key: 'family_friendly', label: 'Family-friendly / Children welcome' }
    ];

    const sortOptions = [
      { value: 'start_date_soonest_first', label: 'Start date: Soonest first' },
      { value: 'start_date_latest_first', label: 'Start date: Latest first' },
      { value: 'title_az', label: 'Title AZ' }
    ];

    return {
      dateRangeDefaults,
      admissionTypes,
      audienceSuitabilityOptions,
      sortOptions
    };
  }

  // searchExhibitions
  searchExhibitions(startDate, endDate, admissionTypes, isFamilyFriendly, sortBy) {
    const exhibitions = this._getFromStorage('exhibitions').filter((e) => e.isActive);
    const visitPlanItems = this._getFromStorage('visit_plan_items');

    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    let result = exhibitions.filter((e) => {
      const s = this._parseDate(e.startDate);
      const ed = this._parseDate(e.endDate);

      if (startDateObj && ed && ed < startDateObj) return false;
      if (endDateObj && s && s > endDateObj) return false;

      if (Array.isArray(admissionTypes) && admissionTypes.length > 0) {
        if (!admissionTypes.includes(e.admissionType)) return false;
      }

      if (typeof isFamilyFriendly === 'boolean') {
        if (e.isFamilyFriendly !== isFamilyFriendly) return false;
      }

      return true;
    });

    if (sortBy === 'start_date_soonest_first') {
      result.sort((a, b) => {
        const da = this._parseDate(a.startDate) || new Date(0);
        const db = this._parseDate(b.startDate) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'start_date_latest_first') {
      result.sort((a, b) => {
        const da = this._parseDate(a.startDate) || new Date(0);
        const db = this._parseDate(b.startDate) || new Date(0);
        return db - da;
      });
    } else if (sortBy === 'title_az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    // Instrumentation for task completion tracking (task_2 - exhibition filters)
    try {
      if (
        isFamilyFriendly === true &&
        Array.isArray(admissionTypes) &&
        admissionTypes.includes('free') &&
        sortBy === 'start_date_soonest_first'
      ) {
        localStorage.setItem(
          'task2_exhibitionFilterParams',
          JSON.stringify({
            startDate,
            endDate,
            admissionTypes,
            isFamilyFriendly,
            sortBy,
            resultCount: result.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task2_exhibitionFilterParams):', e);
    }

    return result.map((e) => {
      const isInVisitPlan = visitPlanItems.some((item) => item.exhibitionId === e.id);
      return {
        exhibitionId: e.id,
        title: e.title,
        subtitle: e.subtitle || '',
        startDate: e.startDate,
        endDate: e.endDate,
        dateRangeText: this._formatDateRangeLabel(e.startDate, e.endDate),
        admissionType: e.admissionType,
        admissionLabel: this._admissionLabelFromType(e.admissionType),
        isFamilyFriendly: e.isFamilyFriendly,
        minTicketPrice: e.minTicketPrice,
        priceIndicatorText:
          typeof e.minTicketPrice === 'number'
            ? this._priceDisplay(e.minTicketPrice, 'and up')
            : '',
        imageUrl: e.imageUrl || '',
        isActive: e.isActive,
        isInVisitPlan,
        exhibition: e
      };
    });
  }

  // addExhibitionToVisitPlan
  addExhibitionToVisitPlan(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions');
    const exhibition = exhibitions.find((e) => e.id === exhibitionId);
    if (!exhibition) {
      return {
        success: false,
        visitPlanId: null,
        visitPlanItemId: null,
        totalItems: 0,
        message: 'Exhibition not found.'
      };
    }

    const visitPlan = this._getOrCreateVisitPlan();
    let items = this._getFromStorage('visit_plan_items');
    const existing = items.find(
      (i) => i.visitPlanId === visitPlan.id && i.exhibitionId === exhibitionId
    );

    if (existing) {
      return {
        success: true,
        visitPlanId: visitPlan.id,
        visitPlanItemId: existing.id,
        totalItems: items.filter((i) => i.visitPlanId === visitPlan.id).length,
        message: 'Exhibition already in visit plan.'
      };
    }

    const nowIso = new Date().toISOString();
    const newItem = {
      id: this._generateId('visit_plan_item'),
      visitPlanId: visitPlan.id,
      exhibitionId: exhibitionId,
      addedAt: nowIso,
      priority: null,
      notes: ''
    };

    items.push(newItem);
    this._saveToStorage('visit_plan_items', items);

    // Update visit plan timestamp
    const plans = this._getFromStorage('visit_plans');
    const idx = plans.findIndex((p) => p.id === visitPlan.id);
    if (idx >= 0) {
      plans[idx].updatedAt = nowIso;
      this._saveToStorage('visit_plans', plans);
    }

    return {
      success: true,
      visitPlanId: visitPlan.id,
      visitPlanItemId: newItem.id,
      totalItems: items.filter((i) => i.visitPlanId === visitPlan.id).length,
      message: 'Exhibition added to visit plan.'
    };
  }

  // removeExhibitionFromVisitPlan
  removeExhibitionFromVisitPlan(visitPlanItemId) {
    let items = this._getFromStorage('visit_plan_items');
    const existing = items.find((i) => i.id === visitPlanItemId);
    if (!existing) {
      return {
        success: false,
        totalItems: items.length,
        message: 'Visit plan item not found.'
      };
    }

    items = items.filter((i) => i.id !== visitPlanItemId);
    this._saveToStorage('visit_plan_items', items);

    return {
      success: true,
      totalItems: items.length,
      message: 'Removed from visit plan.'
    };
  }

  // getVisitPlan
  getVisitPlan() {
    const visitPlan = this._getOrCreateVisitPlan();
    const itemsAll = this._getFromStorage('visit_plan_items');
    const exhibitions = this._getFromStorage('exhibitions');

    const items = itemsAll
      .filter((i) => i.visitPlanId === visitPlan.id)
      .map((i) => {
        const ex = exhibitions.find((e) => e.id === i.exhibitionId) || null;
        return {
          visitPlanItemId: i.id,
          exhibitionId: i.exhibitionId,
          title: ex ? ex.title : '',
          subtitle: ex ? ex.subtitle || '' : '',
          dateRangeText: ex
            ? this._formatDateRangeLabel(ex.startDate, ex.endDate)
            : '',
          admissionLabel: ex ? this._admissionLabelFromType(ex.admissionType) : '',
          isFamilyFriendly: ex ? !!ex.isFamilyFriendly : false,
          priority: i.priority || null,
          notes: i.notes || '',
          imageUrl: ex ? ex.imageUrl || '' : '',
          exhibition: ex,
          visitPlanItem: i
        };
      });

    // Instrumentation for task completion tracking (task_2 - visit plan viewed)
    try {
      localStorage.setItem('task2_visitPlanViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error (task2_visitPlanViewed):', e);
    }

    return {
      visitPlan,
      items
    };
  }

  // getExhibitionDetail
  getExhibitionDetail(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions');
    const slots = this._getFromStorage('exhibition_ticket_slots');
    const visitPlanItems = this._getFromStorage('visit_plan_items');

    const exhibition = exhibitions.find((e) => e.id === exhibitionId) || null;
    if (!exhibition) {
      return {
        exhibition: null,
        admissionLabel: '',
        dateRangeText: '',
        isInVisitPlan: false,
        heroImageUrl: '',
        relatedTicketedSlotsCount: 0
      };
    }

    const relatedCount = slots.filter((s) => s.exhibitionId === exhibition.id).length;
    const isInVisitPlan = visitPlanItems.some((i) => i.exhibitionId === exhibition.id);

    return {
      exhibition,
      admissionLabel: this._admissionLabelFromType(exhibition.admissionType),
      dateRangeText: this._formatDateRangeLabel(exhibition.startDate, exhibition.endDate),
      isInVisitPlan,
      heroImageUrl: exhibition.imageUrl || '',
      relatedTicketedSlotsCount: relatedCount
    };
  }

  // getTicketFilterOptions
  getTicketFilterOptions() {
    const slots = this._getFromStorage('exhibition_ticket_slots');

    let minDate = null;
    let maxDate = null;
    let minPrice = null;
    let maxPrice = null;

    for (const s of slots) {
      const d = this._parseDate(s.startDateTime);
      if (d && (!minDate || d < minDate)) minDate = d;
      if (d && (!maxDate || d > maxDate)) maxDate = d;

      if (typeof s.adultPrice === 'number') {
        if (minPrice === null || s.adultPrice < minPrice) minPrice = s.adultPrice;
        if (maxPrice === null || s.adultPrice > maxPrice) maxPrice = s.adultPrice;
      }
    }

    const today = new Date();
    const dateRangeDefaults = {
      startDate: this._dateToYMD(minDate || today),
      endDate: this._dateToYMD(maxDate || today)
    };

    const exhibitionTypes = [
      { value: 'special_exhibition', label: 'Special Exhibition' },
      { value: 'permanent_collection', label: 'Permanent Collection' },
      { value: 'temporary_exhibition', label: 'Temporary Exhibition' },
      { value: 'family_program', label: 'Family Program' },
      { value: 'other', label: 'Other' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' }
    ];

    const adultPriceRange = {
      minAdultPrice: minPrice || 0,
      maxAdultPrice: maxPrice || 0
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'time_earliest_first', label: 'Time: Earliest first' }
    ];

    return {
      dateRangeDefaults,
      exhibitionTypes,
      timeOfDayOptions,
      adultPriceRange,
      sortOptions
    };
  }

  // searchExhibitionTicketSlots
  searchExhibitionTicketSlots(
    date,
    exhibitionTypes,
    timeOfDay,
    maxAdultPrice,
    sortBy,
    onlyAvailable
  ) {
    const slots = this._getFromStorage('exhibition_ticket_slots');
    const exhibitions = this._getFromStorage('exhibitions');

    const result = [];
    for (const s of slots) {
      const slotDate = s.startDateTime ? s.startDateTime.substring(0, 10) : null;
      if (date && slotDate !== date) continue;

      if (timeOfDay && s.timeOfDay !== timeOfDay) continue;

      if (typeof maxAdultPrice === 'number') {
        if (typeof s.adultPrice !== 'number' || s.adultPrice > maxAdultPrice) continue;
      }

      if (onlyAvailable) {
        if (s.slotStatus !== 'available') continue;
      }

      const ex = exhibitions.find((e) => e.id === s.exhibitionId) || null;
      if (Array.isArray(exhibitionTypes) && exhibitionTypes.length > 0) {
        if (!ex || !exhibitionTypes.includes(ex.exhibitionType)) continue;
      }

      result.push({
        _slot: s,
        _exhibition: ex
      });
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a._slot.adultPrice || 0) - (b._slot.adultPrice || 0));
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => (b._slot.adultPrice || 0) - (a._slot.adultPrice || 0));
    } else if (sortBy === 'time_earliest_first') {
      result.sort((a, b) => {
        const da = this._parseDate(a._slot.startDateTime) || new Date(0);
        const db = this._parseDate(b._slot.startDateTime) || new Date(0);
        return da - db;
      });
    }

    // Instrumentation for task completion tracking (task_1)
    try {
      if (
        timeOfDay === 'afternoon' &&
        sortBy === 'price_low_to_high' &&
        typeof maxAdultPrice === 'number' &&
        maxAdultPrice <= 20 &&
        Array.isArray(exhibitionTypes) &&
        exhibitionTypes.includes('special_exhibition')
      ) {
        localStorage.setItem(
          'task1_ticketFilterParams',
          JSON.stringify({
            date,
            exhibitionTypes,
            timeOfDay,
            maxAdultPrice,
            sortBy,
            onlyAvailable,
            resultCount: result.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task1_ticketFilterParams):', e);
    }

    return result.map(({ _slot: s, _exhibition: ex }) => ({
      ticketSlotId: s.id,
      exhibitionId: s.exhibitionId,
      exhibitionTitle: ex ? ex.title : '',
      exhibitionType: ex ? ex.exhibitionType : '',
      admissionType: ex ? ex.admissionType : '',
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
      dateTimeDisplayText: this._formatDateRangeLabel(
        s.startDateTime,
        s.endDateTime
      ),
      timeOfDay: s.timeOfDay,
      adultPrice: s.adultPrice,
      teenPrice: s.teenPrice,
      childPrice: s.childPrice,
      capacityRemaining: s.capacityRemaining,
      slotStatus: s.slotStatus,
      priceDisplayText: this._priceDisplay(s.adultPrice || 0, 'per adult'),
      exhibition: ex,
      ticketSlot: s
    }));
  }

  // createTicketBookingAndOrder
  createTicketBookingAndOrder(ticketSlotId, quantityAdult, quantityTeen, quantityChild) {
    const slots = this._getFromStorage('exhibition_ticket_slots');
    const exhibitions = this._getFromStorage('exhibitions');
    const bookings = this._getFromStorage('ticket_bookings');

    const slot = slots.find((s) => s.id === ticketSlotId);
    if (!slot) {
      return {
        success: false,
        message: 'Ticket slot not found.',
        ticketBooking: null,
        checkoutOrder: null
      };
    }

    const exhibition = exhibitions.find((e) => e.id === slot.exhibitionId) || null;

    const adults = quantityAdult || 0;
    const teens = quantityTeen || 0;
    const children = quantityChild || 0;

    const adultPrice = slot.adultPrice || 0;
    const teenPrice = slot.teenPrice || 0;
    const childPrice = slot.childPrice || 0;

    const totalPrice = adults * adultPrice + teens * teenPrice + children * childPrice;

    const nowIso = new Date().toISOString();
    const booking = {
      id: this._generateId('ticket_booking'),
      ticketSlotId: slot.id,
      exhibitionId: slot.exhibitionId,
      bookingCreatedAt: nowIso,
      visitStartDateTime: slot.startDateTime,
      visitEndDateTime: slot.endDateTime,
      quantityAdult: adults,
      quantityTeen: teens,
      quantityChild: children,
      totalPrice,
      bookingStatus: 'in_progress',
      checkoutOrderId: null
    };

    const totalTickets = adults + teens + children;
    const description = (exhibition ? exhibition.title : 'Exhibition') + ' tickets';
    const itemsSummary = [
      {
        description,
        quantity: totalTickets,
        unitPrice: totalTickets > 0 ? totalPrice / totalTickets : 0,
        lineTotal: totalPrice
      }
    ];

    const order = this._createCheckoutOrder(
      'ticket_booking',
      booking.id,
      totalPrice,
      'USD',
      itemsSummary
    );

    booking.checkoutOrderId = order.id;
    bookings.push(booking);
    this._saveToStorage('ticket_bookings', bookings);

    return {
      success: true,
      message: 'Ticket booking created.',
      ticketBooking: booking,
      checkoutOrder: order
    };
  }

  // getEventsFilterOptions
  getEventsFilterOptions() {
    const events = this._getFromStorage('events');
    let minPrice = null;
    let maxPrice = null;
    for (const ev of events) {
      if (typeof ev.basePriceAdult === 'number') {
        if (minPrice === null || ev.basePriceAdult < minPrice) minPrice = ev.basePriceAdult;
        if (maxPrice === null || ev.basePriceAdult > maxPrice) maxPrice = ev.basePriceAdult;
      }
    }

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' }
    ];

    const eventTypes = [
      { value: 'workshop', label: 'Workshop' },
      { value: 'lecture', label: 'Lecture' },
      { value: 'performance', label: 'Performance' },
      { value: 'tour', label: 'Tour' },
      { value: 'family_activity', label: 'Family activity' },
      { value: 'other', label: 'Other' }
    ];

    const priceRange = {
      minTicketPrice: minPrice || 0,
      maxTicketPrice: maxPrice || 0
    };

    const sortOptions = [
      { value: 'start_time_soonest_first', label: 'Start time: Soonest first' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      timeOfDayOptions,
      eventTypes,
      priceRange,
      sortOptions
    };
  }

  // searchEventsAndWorkshops
  searchEventsAndWorkshops(
    date,
    timeOfDay,
    maxPricePerTicket,
    eventTypes,
    sortBy
  ) {
    const events = this._getFromStorage('events');

    let filtered = events.filter((ev) => {
      const eventDate = ev.startDateTime ? ev.startDateTime.substring(0, 10) : null;
      if (date && eventDate !== date) return false;

      if (timeOfDay && ev.timeOfDay !== timeOfDay) return false;

      if (Array.isArray(eventTypes) && eventTypes.length > 0) {
        if (!eventTypes.includes(ev.eventType)) return false;
      }

      if (typeof maxPricePerTicket === 'number') {
        if (!ev.isFree && (ev.basePriceAdult || 0) > maxPricePerTicket) return false;
      }

      return true;
    });

    filtered = this._applyEventFiltersAndSorting(filtered, { sortBy });

    // Instrumentation for task completion tracking (task_3)
    try {
      if (
        timeOfDay === 'evening' &&
        typeof maxPricePerTicket === 'number' &&
        maxPricePerTicket <= 30 &&
        Array.isArray(eventTypes) &&
        eventTypes.includes('workshop')
      ) {
        localStorage.setItem(
          'task3_eventFilterParams',
          JSON.stringify({
            date,
            timeOfDay,
            maxPricePerTicket,
            eventTypes,
            sortBy,
            resultCount: filtered.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task3_eventFilterParams):', e);
    }

    return filtered.map((ev) => ({
      eventId: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      audienceSuitability: ev.audienceSuitability,
      startDateTime: ev.startDateTime,
      endDateTime: ev.endDateTime,
      timeOfDay: ev.timeOfDay,
      location: ev.location,
      isFree: ev.isFree,
      basePriceAdult: ev.basePriceAdult,
      priceDisplayText: ev.isFree
        ? 'Free'
        : this._priceDisplay(ev.basePriceAdult || 0, 'per adult'),
      remainingCapacity: ev.remainingCapacity,
      isRegistrationOpen: ev.isRegistrationOpen,
      event: ev
    }));
  }

  // getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const ev = events.find((e) => e.id === eventId) || null;
    if (!ev) {
      return {
        event: null,
        dateTimeDisplayText: '',
        priceDisplayText: '',
        capacityDisplayText: '',
        isRegistrationOpen: false
      };
    }

    const dateTimeDisplayText = this._formatDateRangeLabel(
      ev.startDateTime,
      ev.endDateTime
    );

    const priceDisplayText = ev.isFree
      ? 'Free'
      : this._priceDisplay(ev.basePriceAdult || 0, 'per adult');

    let capacityDisplayText = '';
    if (typeof ev.remainingCapacity === 'number' && typeof ev.maxCapacity === 'number') {
      capacityDisplayText = ev.remainingCapacity + ' of ' + ev.maxCapacity + ' spots remaining';
    }

    return {
      event: ev,
      dateTimeDisplayText,
      priceDisplayText,
      capacityDisplayText,
      isRegistrationOpen: ev.isRegistrationOpen
    };
  }

  // registerForEvent
  registerForEvent(
    eventId,
    adultTickets,
    teenTickets,
    childTickets,
    paymentOption,
    registrantName,
    registrantEmail
  ) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        message: 'Event not found.',
        eventRegistration: null
      };
    }

    const adults = adultTickets || 0;
    const teens = teenTickets || 0;
    const children = childTickets || 0;

    let totalPrice = 0;
    if (!ev.isFree && paymentOption !== 'free_no_payment') {
      totalPrice =
        adults * (ev.basePriceAdult || 0) +
        teens * (ev.basePriceTeen || 0) +
        children * (ev.basePriceChild || 0);
    }

    const registration = {
      id: this._generateId('event_registration'),
      eventId: eventId,
      registrationCreatedAt: new Date().toISOString(),
      adultTickets: adults,
      teenTickets: teens,
      childTickets: children,
      totalPrice,
      paymentOption,
      registrantName: registrantName || '',
      registrantEmail: registrantEmail || '',
      registrationStatus: 'confirmed'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration completed.',
      eventRegistration: registration
    };
  }

  // getShopCategories
  getShopCategories() {
    // Based on Product.category enum
    const categories = [
      {
        categoryId: 'postcards_prints',
        categoryKey: 'postcards_prints',
        name: 'Postcards & Prints',
        description: '',
        imageUrl: ''
      },
      {
        categoryId: 'books',
        categoryKey: 'books',
        name: 'Books',
        description: '',
        imageUrl: ''
      },
      {
        categoryId: 'apparel',
        categoryKey: 'apparel',
        name: 'Apparel',
        description: '',
        imageUrl: ''
      },
      {
        categoryId: 'home_decor',
        categoryKey: 'home_decor',
        name: 'Home decor',
        description: '',
        imageUrl: ''
      },
      {
        categoryId: 'other',
        categoryKey: 'other',
        name: 'Other',
        description: '',
        imageUrl: ''
      }
    ];
    return categories;
  }

  // getShopCategoryFilterOptions
  getShopCategoryFilterOptions(categoryKey) {
    const products = this._getFromStorage('products').filter(
      (p) => p.category === categoryKey
    );

    let minPrice = null;
    let maxPrice = null;
    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const priceRange = {
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 0
    };

    const ratingOptions = [
      { value: 0, label: 'All ratings' },
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const sortOptions = [
      { value: 'customer_rating_high_to_low', label: 'Customer rating: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      priceRange,
      ratingOptions,
      sortOptions
    };
  }

  // searchProducts
  searchProducts(categoryKey, maxPrice, minRating, sortBy, onlyAvailable) {
    const products = this._getFromStorage('products').filter(
      (p) => p.category === categoryKey
    );

    const filtered = this._applyProductFiltersAndSorting(products, {
      maxPrice,
      minRating,
      sortBy,
      onlyAvailable
    });

    // Instrumentation for task completion tracking (task_4 - product filters)
    try {
      if (
        categoryKey === 'postcards_prints' &&
        typeof maxPrice === 'number' &&
        maxPrice <= 5 &&
        typeof minRating === 'number' &&
        minRating >= 4 &&
        sortBy === 'customer_rating_high_to_low'
      ) {
        localStorage.setItem(
          'task4_productFilterParams',
          JSON.stringify({
            categoryKey,
            maxPrice,
            minRating,
            sortBy,
            onlyAvailable,
            resultCount: filtered.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task4_productFilterParams):', e);
    }

    const categoryNameMap = {
      postcards_prints: 'Postcards & Prints',
      books: 'Books',
      apparel: 'Apparel',
      home_decor: 'Home decor',
      other: 'Other'
    };

    return filtered.map((p) => ({
      productId: p.id,
      name: p.name,
      description: p.description || '',
      categoryKey: p.category,
      categoryName: categoryNameMap[p.category] || p.category,
      price: p.price,
      ratingAverage: p.ratingAverage,
      ratingCount: p.ratingCount,
      isAvailable: p.isAvailable,
      imageUrl: p.imageUrl || '',
      product: p
    }));
  }

  // getProductDetail
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        categoryName: '',
        priceDisplayText: '',
        ratingDisplayText: ''
      };
    }

    const categoryNameMap = {
      postcards_prints: 'Postcards & Prints',
      books: 'Books',
      apparel: 'Apparel',
      home_decor: 'Home decor',
      other: 'Other'
    };

    const categoryName = categoryNameMap[product.category] || product.category;
    const priceDisplayText = this._priceDisplay(product.price || 0, '');

    let ratingDisplayText = 'No ratings yet';
    if (typeof product.ratingAverage === 'number' && typeof product.ratingCount === 'number') {
      ratingDisplayText =
        product.ratingAverage.toFixed(1) +
        ' stars (' +
        product.ratingCount +
        ' reviews)';
    }

    return {
      product,
      categoryName,
      priceDisplayText,
      ratingDisplayText
    };
  }

  // addProductToCart
  addProductToCart(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        itemCount: 0,
        subtotal: 0,
        currency: 'USD',
        message: 'Product not found.'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.productId === productId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineTotal = cartItem.quantity * cartItem.unitPrice;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        lineTotal: product.price * qty
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    const itemCount = itemsForCart.reduce((sum, it) => sum + (it.quantity || 0), 0);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      itemCount,
      subtotal: cart.subtotal,
      currency: cart.currency,
      message: 'Added to cart.'
    };
  }

  // getCart
  getCart() {
    const cart = this._getObjectFromStorage('cart', null);
    const allItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    if (!cart || !cart.id) {
      // Instrumentation for task completion tracking (task_4 - cart viewed)
      try {
        localStorage.setItem('task4_cartViewed', 'true');
      } catch (e) {
        console.error('Instrumentation error (task4_cartViewed):', e);
      }

      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          total: 0,
          currency: 'USD'
        }
      };
    }

    const itemsRaw = allItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsRaw.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        imageUrl: product ? product.imageUrl || '' : '',
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal,
        product,
        cartItem: ci
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD'
    };

    // Instrumentation for task completion tracking (task_4 - cart viewed)
    try {
      localStorage.setItem('task4_cartViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error (task4_cartViewed):', e);
    }

    return {
      cart,
      items,
      totals
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getObjectFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          total: 0,
          currency: 'USD'
        },
        message: 'Cart not found.'
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart,
        items: [],
        totals: {
          subtotal: cart.subtotal || 0,
          total: cart.total || 0,
          currency: cart.currency || 'USD'
        },
        message: 'Cart item not found.'
      };
    }

    if (!quantity || quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = quantity;
      cartItems[idx].lineTotal = cartItems[idx].unitPrice * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    const products = this._getFromStorage('products');
    const itemsRaw = cartItems.filter((ci) => ci.cartId === cart.id);
    const items = itemsRaw.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        imageUrl: product ? product.imageUrl || '' : '',
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal,
        product,
        cartItem: ci
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD'
    };

    return {
      success: true,
      cart,
      items,
      totals,
      message: 'Cart updated.'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getObjectFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          total: 0,
          currency: 'USD'
        },
        message: 'Cart not found.'
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    const beforeLen = cartItems.length;
    cartItems = cartItems.filter((ci) => !(ci.id === cartItemId && ci.cartId === cart.id));

    if (cartItems.length === beforeLen) {
      return {
        success: false,
        cart,
        items: [],
        totals: {
          subtotal: cart.subtotal || 0,
          total: cart.total || 0,
          currency: cart.currency || 'USD'
        },
        message: 'Cart item not found.'
      };
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    const products = this._getFromStorage('products');
    const itemsRaw = cartItems.filter((ci) => ci.cartId === cart.id);
    const items = itemsRaw.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        imageUrl: product ? product.imageUrl || '' : '',
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal,
        product,
        cartItem: ci
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD'
    };

    return {
      success: true,
      cart,
      items,
      totals,
      message: 'Item removed from cart.'
    };
  }

  // createCheckoutOrderForCart
  createCheckoutOrderForCart() {
    const cart = this._getObjectFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items');
    if (!cart || !cart.id) {
      return {
        success: false,
        checkoutOrder: null,
        message: 'Cart not found.'
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    if (itemsForCart.length === 0) {
      return {
        success: false,
        checkoutOrder: null,
        message: 'Cart is empty.'
      };
    }

    const itemsSummary = itemsForCart.map((ci) => ({
      description: ci.productName,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      lineTotal: ci.lineTotal
    }));

    const order = this._createCheckoutOrder(
      'shop_cart',
      cart.id,
      cart.total || 0,
      cart.currency || 'USD',
      itemsSummary
    );

    return {
      success: true,
      checkoutOrder: order,
      message: 'Checkout order created for cart.'
    };
  }

  // getMembershipFilterOptions
  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans');
    let minAnnual = null;
    let maxAnnual = null;
    for (const p of plans) {
      const annual = p.billingFrequency === 'monthly'
        ? (p.pricePerPeriod || 0) * 12
        : p.pricePerPeriod || 0;
      if (minAnnual === null || annual < minAnnual) minAnnual = annual;
      if (maxAnnual === null || annual > maxAnnual) maxAnnual = annual;
    }

    const membershipTypes = [
      { value: 'student_youth', label: 'Student / Youth' },
      { value: 'individual', label: 'Individual' },
      { value: 'family', label: 'Family' },
      { value: 'senior', label: 'Senior' },
      { value: 'dual', label: 'Dual' },
      { value: 'other', label: 'Other' }
    ];

    const billingFrequencies = [
      { value: 'annual', label: 'Annual' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const annualPriceRange = {
      minAnnualPrice: minAnnual || 0,
      maxAnnualPrice: maxAnnual || 0
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      membershipTypes,
      billingFrequencies,
      annualPriceRange,
      sortOptions
    };
  }

  // searchMembershipPlans
  searchMembershipPlans(membershipType, maxAnnualPrice, billingFrequency, sortBy) {
    let plans = this._getFromStorage('membership_plans').filter((p) => p.isActive);

    plans = plans.filter((p) => {
      if (membershipType && p.membershipType !== membershipType) return false;
      if (billingFrequency && p.billingFrequency !== billingFrequency) return false;

      if (typeof maxAnnualPrice === 'number') {
        const annual = p.billingFrequency === 'monthly'
          ? (p.pricePerPeriod || 0) * 12
          : p.pricePerPeriod || 0;
        if (annual > maxAnnualPrice) return false;
      }

      return true;
    });

    plans.sort((a, b) => {
      const annualA = a.billingFrequency === 'monthly'
        ? (a.pricePerPeriod || 0) * 12
        : a.pricePerPeriod || 0;
      const annualB = b.billingFrequency === 'monthly'
        ? (b.pricePerPeriod || 0) * 12
        : b.pricePerPeriod || 0;
      if (sortBy === 'price_high_to_low') {
        return annualB - annualA;
      }
      // default low to high
      if (sortBy === 'price_low_to_high') {
        return annualA - annualB;
      }
      return 0;
    });

    // Instrumentation for task completion tracking (task_6)
    try {
      if (
        membershipType === 'student_youth' &&
        typeof maxAnnualPrice === 'number' &&
        maxAnnualPrice <= 60 &&
        sortBy === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task6_membershipFilterParams',
          JSON.stringify({
            membershipType,
            maxAnnualPrice,
            billingFrequency,
            sortBy,
            resultCount: plans.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task6_membershipFilterParams):', e);
    }

    return plans.map((p) => ({
      membershipPlanId: p.id,
      name: p.name,
      description: p.description || '',
      membershipType: p.membershipType,
      billingFrequency: p.billingFrequency,
      pricePerPeriod: p.pricePerPeriod,
      priceDisplayText:
        this._priceDisplay(p.pricePerPeriod || 0, p.billingFrequency === 'monthly' ? 'per month' : 'per year'),
      benefitsSummary: p.benefitsSummary || '',
      isActive: p.isActive,
      membershipPlan: p
    }));
  }

  // startMembershipEnrollmentAndOrder
  startMembershipEnrollmentAndOrder(
    membershipPlanId,
    fullName,
    email,
    startDate,
    deliveryOption
  ) {
    const plans = this._getFromStorage('membership_plans');
    const enrollments = this._getFromStorage('membership_enrollments');
    const plan = plans.find((p) => p.id === membershipPlanId);

    if (!plan) {
      return {
        success: false,
        membershipEnrollment: null,
        checkoutOrder: null,
        message: 'Membership plan not found.'
      };
    }

    const startDateIso = this._parseDate(startDate)
      ? new Date(startDate).toISOString()
      : new Date().toISOString();

    const enrollment = {
      id: this._generateId('membership_enrollment'),
      membershipPlanId,
      fullName,
      email,
      startDate: startDateIso,
      deliveryOption,
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      checkoutOrderId: null
    };

    const totalAmount = plan.pricePerPeriod || 0;
    const itemsSummary = [
      {
        description: plan.name + ' membership',
        quantity: 1,
        unitPrice: totalAmount,
        lineTotal: totalAmount
      }
    ];

    const order = this._createCheckoutOrder(
      'membership_enrollment',
      enrollment.id,
      totalAmount,
      'USD',
      itemsSummary
    );

    enrollment.checkoutOrderId = order.id;
    enrollments.push(enrollment);
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      success: true,
      membershipEnrollment: enrollment,
      checkoutOrder: order,
      message: 'Membership enrollment started.'
    };
  }

  // getDonationFunds
  getDonationFunds() {
    return this._getFromStorage('donation_funds');
  }

  // createDonation
  createDonation(
    fundId,
    amount,
    frequency,
    donorFullName,
    donorEmail,
    paymentMethod,
    cardNumber,
    cardExpiry,
    cardCvc
  ) {
    const funds = this._getFromStorage('donation_funds');
    const donations = this._getFromStorage('donations');

    const fund = funds.find((f) => f.id === fundId && f.isActive);
    if (!fund) {
      return {
        success: false,
        donation: null,
        message: 'Donation fund not found or inactive.'
      };
    }

    const nowIso = new Date().toISOString();
    let status = 'pending';

    if (paymentMethod === 'credit_debit_card') {
      if (cardNumber && cardExpiry && cardCvc) {
        status = 'completed';
      } else {
        status = 'failed';
      }
    } else if (paymentMethod === 'paypal' || paymentMethod === 'bank_transfer') {
      status = 'pending';
    }

    const donation = {
      id: this._generateId('donation'),
      fundId,
      amount,
      currency: 'USD',
      frequency,
      donorFullName,
      donorEmail,
      paymentMethod,
      cardNumber: paymentMethod === 'credit_debit_card' ? cardNumber || '' : '',
      cardExpiry: paymentMethod === 'credit_debit_card' ? cardExpiry || '' : '',
      cardCvc: paymentMethod === 'credit_debit_card' ? cardCvc || '' : '',
      createdAt: nowIso,
      status
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: status !== 'failed',
      donation,
      message:
        status === 'completed'
          ? 'Donation completed.'
          : status === 'pending'
          ? 'Donation pending.'
          : 'Donation failed.'
    };
  }

  // subscribeToNewsletter
  subscribeToNewsletter(email, topics, interests, preferredFormat) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    let subscription = subs.find((s) => s.email === email) || null;
    const nowIso = new Date().toISOString();

    if (subscription) {
      subscription.topics = Array.isArray(topics) ? topics : [];
      subscription.interests = Array.isArray(interests) ? interests : [];
      subscription.preferredFormat = preferredFormat;
      subscription.isActive = true;
    } else {
      subscription = {
        id: this._generateId('newsletter_subscription'),
        email,
        topics: Array.isArray(topics) ? topics : [],
        interests: Array.isArray(interests) ? interests : [],
        preferredFormat,
        isActive: true,
        createdAt: nowIso
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscription saved.'
    };
  }

  // getCheckoutOrder
  getCheckoutOrder(checkoutOrderId) {
    const orders = this._getFromStorage('checkout_orders');
    const order = orders.find((o) => o.id === checkoutOrderId) || null;

    if (!order) {
      return {
        checkoutOrder: null,
        itemsSummary: [],
        requiresPayment: false,
        allowedPaymentMethods: []
      };
    }

    const requiresPayment = (order.totalAmount || 0) > 0 &&
      order.paymentMethod !== 'no_payment_required';

    let allowedPaymentMethods = [];
    if (!requiresPayment) {
      allowedPaymentMethods = ['no_payment_required'];
    } else {
      if (order.orderType === 'tour_booking') {
        allowedPaymentMethods = ['credit_debit_card', 'pay_at_gallery_on_arrival'];
      } else {
        allowedPaymentMethods = ['credit_debit_card'];
      }
    }

    // Foreign key resolution for referenceId
    let reference = null;
    if (order.orderType === 'ticket_booking') {
      const bookings = this._getFromStorage('ticket_bookings');
      reference = bookings.find((b) => b.id === order.referenceId) || null;
    } else if (order.orderType === 'tour_booking') {
      const bookings = this._getFromStorage('tour_bookings');
      reference = bookings.find((b) => b.id === order.referenceId) || null;
    } else if (order.orderType === 'shop_cart') {
      reference = this._getObjectFromStorage('cart', null);
    } else if (order.orderType === 'membership_enrollment') {
      const enrollments = this._getFromStorage('membership_enrollments');
      reference = enrollments.find((e) => e.id === order.referenceId) || null;
    }

    return {
      checkoutOrder: Object.assign({}, order, { reference }),
      itemsSummary: order.itemsSummary || [],
      requiresPayment,
      allowedPaymentMethods
    };
  }

  // completeCheckoutPayment
  completeCheckoutPayment(
    checkoutOrderId,
    billingFullName,
    billingEmail,
    paymentMethod,
    cardNumber,
    cardExpiry,
    cardCvc
  ) {
    const orders = this._getFromStorage('checkout_orders');
    const idx = orders.findIndex((o) => o.id === checkoutOrderId);
    if (idx === -1) {
      return {
        success: false,
        checkoutOrder: null,
        message: 'Checkout order not found.'
      };
    }

    const order = orders[idx];
    order.billingFullName = billingFullName;
    order.billingEmail = billingEmail;
    order.paymentMethod = paymentMethod;
    order.updatedAt = new Date().toISOString();

    if (paymentMethod === 'no_payment_required') {
      order.status = 'paid';
    } else if (paymentMethod === 'pay_at_gallery_on_arrival') {
      order.status = 'pending_payment';
    } else if (paymentMethod === 'credit_debit_card') {
      if (cardNumber && cardExpiry && cardCvc) {
        order.status = 'paid';
      } else {
        order.status = 'cancelled';
      }
    }

    orders[idx] = order;
    this._saveToStorage('checkout_orders', orders);

    // Update linked entities status
    if (order.status === 'paid' || order.status === 'pending_payment') {
      if (order.orderType === 'ticket_booking') {
        const bookings = this._getFromStorage('ticket_bookings');
        const bIdx = bookings.findIndex((b) => b.id === order.referenceId);
        if (bIdx !== -1) {
          bookings[bIdx].bookingStatus = 'confirmed';
          this._saveToStorage('ticket_bookings', bookings);
        }
      } else if (order.orderType === 'tour_booking') {
        const bookings = this._getFromStorage('tour_bookings');
        const bIdx = bookings.findIndex((b) => b.id === order.referenceId);
        if (bIdx !== -1) {
          bookings[bIdx].bookingStatus = 'confirmed';
          this._saveToStorage('tour_bookings', bookings);
        }
      } else if (order.orderType === 'membership_enrollment') {
        const enrollments = this._getFromStorage('membership_enrollments');
        const eIdx = enrollments.findIndex((e) => e.id === order.referenceId);
        if (eIdx !== -1) {
          enrollments[eIdx].status = 'active';
          this._saveToStorage('membership_enrollments', enrollments);
        }
      }
    }

    return {
      success: order.status === 'paid' || order.status === 'pending_payment',
      checkoutOrder: order,
      message:
        order.status === 'paid'
          ? 'Payment completed.'
          : order.status === 'pending_payment'
          ? 'Payment will be made at gallery on arrival.'
          : 'Payment failed or cancelled.'
    };
  }

  // getAboutContent
  getAboutContent() {
    return this._getObjectFromStorage('about_content', {
      title: '',
      missionText: '',
      visionText: '',
      historyHtml: '',
      keyPrograms: []
    });
  }

  // getContactInfo
  getContactInfo() {
    return this._getObjectFromStorage('contact_info', {
      address: '',
      phoneNumber: '',
      emailAddresses: [],
      openingHoursSummary: '',
      mapEmbedUrl: ''
    });
  }

  // submitContactForm
  submitContactForm(name, email, subject, message) {
    const msgs = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString()
    };
    msgs.push(msg);
    this._saveToStorage('contact_messages', msgs);
    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // getPoliciesAndAccessibilityContent
  getPoliciesAndAccessibilityContent() {
    return this._getObjectFromStorage('policies_accessibility_content', {
      privacyPolicyHtml: '',
      termsOfUseHtml: '',
      accessibilityStatementHtml: '',
      visitorPoliciesHtml: ''
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