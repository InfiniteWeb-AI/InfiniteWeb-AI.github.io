/* eslint-disable no-var */
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    const ensureObjectKey = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Entity tables
    ensureArrayKey('utility_accounts');
    ensureArrayKey('utility_payments');
    ensureArrayKey('recreation_classes');
    ensureArrayKey('class_registrations');
    ensureArrayKey('parks');
    ensureArrayKey('trip_plans');
    ensureArrayKey('meetings');
    ensureArrayKey('meeting_favorites');
    ensureArrayKey('news_articles');
    ensureArrayKey('reading_lists');
    ensureArrayKey('reading_list_items');
    ensureArrayKey('service_requests');
    ensureArrayKey('parking_permit_applications');
    ensureArrayKey('subscription_topics');
    ensureArrayKey('subscription_preferences');

    // Config / content tables
    ensureArrayKey('homepage_alerts');
    ensureArrayKey('homepage_top_tasks');
    ensureArrayKey('pay_apply_overview');
    ensureArrayKey('parks_rec_seasonal_messages');

    ensureObjectKey('transportation_overview', {
      highlights: [],
      permitSummary: ''
    });

    ensureObjectKey('trash_recycling_overview', {
      collectionSummary: '',
      guidelines: [],
      specialServices: []
    });

    ensureObjectKey('about_contact_info', {
      aboutText: '',
      contactChannels: [],
      accessibilitySummary: '',
      privacySummary: '',
      termsSummary: ''
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _mapEnumToDisplayLabels(enumType) {
    switch (enumType) {
      case 'utility_service_type':
        return {
          water: 'Water',
          electric: 'Electric',
          sewer: 'Sewer',
          trash: 'Trash'
        };
      case 'utility_account_status':
        return {
          active: 'Active',
          closed: 'Closed'
        };
      case 'recreation_class_status':
        return {
          open: 'Open',
          full: 'Full',
          cancelled: 'Cancelled'
        };
      case 'meeting_status':
        return {
          scheduled: 'Scheduled',
          cancelled: 'Cancelled',
          completed: 'Completed'
        };
      case 'news_category':
        return {
          road_closure: 'Road Closure',
          public_safety: 'Public Safety',
          parks: 'Parks',
          events: 'Events',
          administration: 'Administration',
          other: 'Other'
        };
      case 'service_request_priority':
        return {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          emergency: 'Emergency'
        };
      default:
        return {};
    }
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (!parts) return null;
    let hour = parseInt(parts[1], 10);
    const minute = parseInt(parts[2], 10);
    const ampm = parts[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  _formatDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _calculatePreviousCalendarMonthRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11, current month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // day 0 of current = last of previous
    return {
      startDate: this._formatDate(start),
      endDate: this._formatDate(end)
    };
  }

  _calculateEarliestBulkPickupDate() {
    const today = new Date();
    // City rule: earliest eligible bulk pickup is 7 days from today
    const earliest = new Date(today.getTime());
    earliest.setDate(earliest.getDate() + 7);
    return this._formatDate(earliest);
  }

  _getOrCreateDefaultReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let existing = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].isDefault) {
        existing = lists[i];
        break;
      }
    }
    if (existing) return existing;
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('readinglist'),
      name: 'My Saved Articles',
      description: 'Default reading list',
      isDefault: true,
      createdAt: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  _getOrCreateAnonymousUserContext() {
    const key = 'anonymous_user_context';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const context = {
      id: 'anon_' + this._getNextIdCounter(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(context));
    return context;
  }

  // =========================
  // Core interface implementations
  // =========================

  // getHomepageOverview()
  getHomepageOverview() {
    const alertsRaw = this._getFromStorage('homepage_alerts');
    const alerts = Array.isArray(alertsRaw) ? alertsRaw.filter(function (a) { return a && a.isActive; }) : [];

    const allArticles = this._getFromStorage('news_articles');
    const featuredNews = allArticles
      .filter(function (a) { return a && a.isFeatured; })
      .sort(function (a, b) {
        const da = a && a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b && b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });

    const allMeetings = this._getFromStorage('meetings');
    const now = new Date();
    const upcomingMeetings = allMeetings
      .filter(function (m) {
        if (!m || !m.startDateTime) return false;
        const dt = new Date(m.startDateTime);
        if (isNaN(dt.getTime())) return false;
        if (m.status === 'cancelled') return false;
        return dt >= now;
      })
      .sort(function (a, b) {
        const da = new Date(a.startDateTime).getTime();
        const db = new Date(b.startDateTime).getTime();
        return da - db;
      });

    const topTasks = this._getFromStorage('homepage_top_tasks');

    return {
      alerts: alerts,
      featuredNews: featuredNews,
      upcomingMeetings: upcomingMeetings,
      topTasks: topTasks
    };
  }

  // getPayApplyOverview()
  getPayApplyOverview() {
    let items = this._getFromStorage('pay_apply_overview');
    if (!Array.isArray(items)) items = [];

    // If nothing configured, provide sensible defaults based on known services
    if (items.length === 0) {
      items = [
        {
          key: 'utility_bills',
          name: 'Utility Bills',
          description: 'Pay your water, electric, sewer, and trash utility bills online.',
          isAvailable: true
        },
        {
          key: 'residential_parking_permits',
          name: 'Residential Parking Permits',
          description: 'Apply for or renew residential parking permits by zone.',
          isAvailable: true
        },
        {
          key: 'bulk_item_pickup',
          name: 'Bulk Item Pickup',
          description: 'Schedule curbside pickup for furniture and other bulk trash.',
          isAvailable: true
        }
      ];
    }

    return {
      paymentAndApplicationTypes: items
    };
  }

  // getUtilityPaymentOptions()
  getUtilityPaymentOptions() {
    const labels = this._mapEnumToDisplayLabels('utility_service_type');
    const keys = ['water', 'electric', 'sewer', 'trash'];
    const serviceTypes = keys.map(function (k) {
      return { key: k, name: labels[k] || k };
    });
    return { serviceTypes: serviceTypes };
  }

  // searchUtilityAccountsForGuest(serviceType, searchTerm)
  searchUtilityAccountsForGuest(serviceType, searchTerm) {
    const all = this._getFromStorage('utility_accounts');
    const term = (searchTerm || '').toLowerCase();

    const accounts = all.filter(function (a) {
      if (!a || a.serviceType !== serviceType) return false;
      if (!term) return true;
      const haystack = [a.accountNumber, a.customerName, a.serviceAddress]
        .filter(Boolean)
        .join(' ') 
        .toLowerCase();
      return haystack.indexOf(term) !== -1;
    });

    const serviceTypeLabels = this._mapEnumToDisplayLabels('utility_service_type');
    const statusLabels = this._mapEnumToDisplayLabels('utility_account_status');

    return {
      accounts: accounts,
      totalCount: accounts.length,
      serviceTypeLabels: serviceTypeLabels,
      statusLabels: statusLabels
    };
  }

  // getUtilityPaymentReview(accountId)
  getUtilityPaymentReview(accountId) {
    const accounts = this._getFromStorage('utility_accounts');
    const account = accounts.find(function (a) { return a.id === accountId; }) || null;

    if (!account) {
      return {
        account: null,
        suggestedAmount: 0,
        minimumAmount: 0,
        pastDueAmount: 0,
        messages: ['Account not found.']
      };
    }

    const balance = typeof account.currentBalance === 'number' ? account.currentBalance : 0;
    const minimumAmount = balance > 0 ? Math.min(5, balance) : 0;

    return {
      account: account,
      suggestedAmount: balance,
      minimumAmount: minimumAmount,
      pastDueAmount: 0,
      messages: []
    };
  }

  // submitUtilityGuestPayment(accountId, amount, paymentMethod, payerName, cardDetails)
  submitUtilityGuestPayment(accountId, amount, paymentMethod, payerName, cardDetails) {
    const accounts = this._getFromStorage('utility_accounts');
    const payments = this._getFromStorage('utility_payments');
    const account = accounts.find(function (a) { return a.id === accountId; }) || null;

    if (!account) {
      return { success: false, payment: null, message: 'Account not found.' };
    }

    if (typeof amount !== 'number' || !(amount > 0)) {
      return { success: false, payment: null, message: 'Invalid payment amount.' };
    }

    if (paymentMethod !== 'credit_debit_card' && paymentMethod !== 'bank_account' && paymentMethod !== 'cash' && paymentMethod !== 'check') {
      return { success: false, payment: null, message: 'Invalid payment method.' };
    }

    const nowIso = new Date().toISOString();

    let cardholderName = null;
    let cardLast4 = null;
    let cardBrand = null;

    if (paymentMethod === 'credit_debit_card') {
      if (!cardDetails || !cardDetails.cardNumber) {
        return { success: false, payment: null, message: 'Card details are required for credit/debit card payments.' };
      }
      const number = String(cardDetails.cardNumber).replace(/\s|-/g, '');
      cardLast4 = number.slice(-4);
      cardholderName = cardDetails.cardholderName || payerName;
      const firstDigit = number.charAt(0);
      if (firstDigit === '4') cardBrand = 'Visa';
      else if (firstDigit === '5') cardBrand = 'Mastercard';
      else if (firstDigit === '3') cardBrand = 'American Express';
      else if (firstDigit === '6') cardBrand = 'Discover';
      else cardBrand = 'Unknown';
    }

    const payment = {
      id: this._generateId('utilpay'),
      accountId: account.id,
      serviceType: account.serviceType,
      amount: amount,
      paymentMethod: paymentMethod,
      isGuest: true,
      payerName: payerName,
      cardholderName: cardholderName,
      cardLast4: cardLast4,
      cardBrand: cardBrand,
      createdAt: nowIso,
      processedAt: nowIso,
      status: 'completed',
      confirmationNumber: 'UPAY-' + this._getNextIdCounter()
    };

    payments.push(payment);

    // Update account balance
    const idx = accounts.findIndex(function (a) { return a.id === account.id; });
    if (idx !== -1) {
      const currentBalance = typeof accounts[idx].currentBalance === 'number' ? accounts[idx].currentBalance : 0;
      let newBalance = currentBalance - amount;
      if (newBalance < 0) newBalance = 0;
      accounts[idx].currentBalance = newBalance;
    }

    this._saveToStorage('utility_payments', payments);
    this._saveToStorage('utility_accounts', accounts);

    return {
      success: true,
      payment: payment,
      message: 'Payment processed successfully.'
    };
  }

  // getParksRecOverview()
  getParksRecOverview() {
    const allClasses = this._getFromStorage('recreation_classes');
    const highlightPrograms = allClasses
      .filter(function (c) { return c && c.status === 'open'; })
      .sort(function (a, b) {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return da - db;
      })
      .slice(0, 3);

    const allParks = this._getFromStorage('parks');
    const highlightParks = allParks.slice(0, 3);

    const seasonalMessages = this._getFromStorage('parks_rec_seasonal_messages');

    return {
      highlightPrograms: highlightPrograms,
      highlightParks: highlightParks,
      seasonalMessages: seasonalMessages
    };
  }

  // getRecreationFilterOptions()
  getRecreationFilterOptions() {
    const categories = [
      { key: 'aquatics', name: 'Aquatics' },
      { key: 'fitness', name: 'Fitness' },
      { key: 'arts', name: 'Arts' },
      { key: 'sports', name: 'Sports' },
      { key: 'education', name: 'Education' },
      { key: 'other', name: 'Other' }
    ];

    const ageGroups = [
      { key: 'toddler', name: 'Toddler', minAge: 0, maxAge: 4 },
      { key: 'youth', name: 'Youth', minAge: 5, maxAge: 12 },
      { key: 'teen', name: 'Teen', minAge: 13, maxAge: 17 },
      { key: 'adult', name: 'Adult', minAge: 18, maxAge: 54 },
      { key: 'senior', name: 'Senior', minAge: 55, maxAge: 120 },
      { key: 'all_ages', name: 'All Ages', minAge: 0, maxAge: 120 }
    ];

    const daysOfWeek = [
      { key: 'monday', name: 'Monday' },
      { key: 'tuesday', name: 'Tuesday' },
      { key: 'wednesday', name: 'Wednesday' },
      { key: 'thursday', name: 'Thursday' },
      { key: 'friday', name: 'Friday' },
      { key: 'saturday', name: 'Saturday' },
      { key: 'sunday', name: 'Sunday' }
    ];

    const classes = this._getFromStorage('recreation_classes');
    let min = null;
    let max = null;
    for (let i = 0; i < classes.length; i++) {
      const fee = classes[i] && typeof classes[i].totalFee === 'number' ? classes[i].totalFee : null;
      if (fee == null) continue;
      if (min == null || fee < min) min = fee;
      if (max == null || fee > max) max = fee;
    }
    if (min == null) min = 0;
    if (max == null) max = 0;

    const priceRange = {
      min: min,
      max: max,
      currency: 'USD'
    };

    return {
      categories: categories,
      ageGroups: ageGroups,
      daysOfWeek: daysOfWeek,
      priceRange: priceRange
    };
  }

  // searchRecreationClasses(filters)
  searchRecreationClasses(filters) {
    filters = filters || {};
    const classes = this._getFromStorage('recreation_classes');
    const maxStartTimeMinutes = filters.maxStartTime ? this._timeStringToMinutes(filters.maxStartTime) : null;

    const filtered = classes.filter((c) => {
      if (!c) return false;
      if (filters.categoryKey && c.category !== filters.categoryKey) return false;
      if (filters.ageGroupKey && c.ageGroup !== filters.ageGroupKey) return false;
      if (filters.dayOfWeekKey && c.dayOfWeek !== filters.dayOfWeekKey) return false;
      if (filters.onlyOpenClasses && c.status !== 'open') return false;

      if (maxStartTimeMinutes != null && c.startTime) {
        const clsMinutes = this._timeStringToMinutes(c.startTime);
        if (clsMinutes != null && clsMinutes > maxStartTimeMinutes) return false;
      }

      if (typeof filters.minPrice === 'number' && typeof c.totalFee === 'number' && c.totalFee < filters.minPrice) {
        return false;
      }
      if (typeof filters.maxPrice === 'number' && typeof c.totalFee === 'number' && c.totalFee > filters.maxPrice) {
        return false;
      }

      return true;
    });

    const statusLabels = this._mapEnumToDisplayLabels('recreation_class_status');

    return {
      classes: filtered,
      totalCount: filtered.length,
      statusLabels: statusLabels
    };
  }

  // getRecreationClassDetail(classId)
  getRecreationClassDetail(classId) {
    const classes = this._getFromStorage('recreation_classes');
    const cls = classes.find(function (c) { return c.id === classId; }) || null;
    const statusLabels = this._mapEnumToDisplayLabels('recreation_class_status');
    const statusLabel = cls && cls.status ? (statusLabels[cls.status] || cls.status) : '';
    return {
      class: cls,
      statusLabel: statusLabel
    };
  }

  // submitClassRegistration(classId, participantName, participantAge, quantity, contactEmail, contactPhone)
  submitClassRegistration(classId, participantName, participantAge, quantity, contactEmail, contactPhone) {
    const classes = this._getFromStorage('recreation_classes');
    const regs = this._getFromStorage('class_registrations');
    const clsIndex = classes.findIndex(function (c) { return c.id === classId; });
    if (clsIndex === -1) {
      return { success: false, registration: null, message: 'Class not found.' };
    }
    const cls = classes[clsIndex];
    if (cls.status !== 'open') {
      return { success: false, registration: null, message: 'Class is not open for registration.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    if (typeof cls.remainingSpots === 'number' && cls.remainingSpots < qty) {
      return { success: false, registration: null, message: 'Not enough remaining spots for this class.' };
    }

    const totalFee = typeof cls.totalFee === 'number' ? cls.totalFee * qty : 0;
    const nowIso = new Date().toISOString();

    const registration = {
      id: this._generateId('classreg'),
      classId: classId,
      participantName: participantName,
      participantAge: participantAge,
      quantity: qty,
      registrationDate: nowIso,
      status: 'confirmed',
      totalFee: totalFee,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null
    };

    regs.push(registration);

    if (typeof cls.remainingSpots === 'number') {
      cls.remainingSpots = cls.remainingSpots - qty;
      if (cls.remainingSpots <= 0) {
        cls.remainingSpots = 0;
        cls.status = 'full';
      }
      classes[clsIndex] = cls;
    }

    this._saveToStorage('class_registrations', regs);
    this._saveToStorage('recreation_classes', classes);

    return {
      success: true,
      registration: registration,
      message: 'Registration completed.'
    };
  }

  // getParkFilterOptions()
  getParkFilterOptions() {
    const amenities = [
      { key: 'playground', name: 'Playground' },
      { key: 'restrooms', name: 'Restrooms' },
      { key: 'picnic_area', name: 'Picnic Area' },
      { key: 'sports_field', name: 'Sports Field' }
    ];

    const closingTimeOptions = [
      { value: '05:00 PM', label: 'Open until at least 5:00 PM' },
      { value: '07:00 PM', label: 'Open until at least 7:00 PM' },
      { value: '09:00 PM', label: 'Open until at least 9:00 PM' }
    ];

    return {
      amenities: amenities,
      closingTimeOptions: closingTimeOptions
    };
  }

  // searchParks(filters)
  searchParks(filters) {
    filters = filters || {};
    const parks = this._getFromStorage('parks');
    const requiredAmenities = Array.isArray(filters.requiredAmenities) ? filters.requiredAmenities : [];
    const minClosingTimeMinutes = filters.minClosingTime ? this._timeStringToMinutes(filters.minClosingTime) : null;

    const filtered = parks.filter((p) => {
      if (!p) return false;
      const parkAmenities = Array.isArray(p.amenities) ? p.amenities : [];

      // All required amenities must be present
      for (let i = 0; i < requiredAmenities.length; i++) {
        if (parkAmenities.indexOf(requiredAmenities[i]) === -1) {
          return false;
        }
      }

      if (minClosingTimeMinutes != null) {
        if (!p.closingTime) return false;
        const closeMinutes = this._timeStringToMinutes(p.closingTime);
        if (closeMinutes == null || closeMinutes < minClosingTimeMinutes) return false;
      }

      return true;
    });

    return {
      parks: filtered,
      totalCount: filtered.length
    };
  }

  // getParkDetail(parkId)
  getParkDetail(parkId) {
    const parks = this._getFromStorage('parks');
    const park = parks.find(function (p) { return p.id === parkId; }) || null;
    return { park: park };
  }

  // createTripPlanForPark(parkId, visitDate, startTime, name, notes)
  createTripPlanForPark(parkId, visitDate, startTime, name, notes) {
    const parks = this._getFromStorage('parks');
    const tripPlans = this._getFromStorage('trip_plans');
    const park = parks.find(function (p) { return p.id === parkId; }) || null;

    if (!park) {
      return { success: false, tripPlan: null, message: 'Park not found.' };
    }

    if (!visitDate) {
      return { success: false, tripPlan: null, message: 'Visit date is required.' };
    }

    const visitDateTimeIso = visitDate + 'T00:00:00.000Z';
    const nowIso = new Date().toISOString();

    const tripPlan = {
      id: this._generateId('tripplan'),
      name: name || null,
      parkId: parkId,
      visitDate: visitDateTimeIso,
      startTime: startTime,
      notes: notes || null,
      status: 'planned',
      createdAt: nowIso
    };

    tripPlans.push(tripPlan);
    this._saveToStorage('trip_plans', tripPlans);

    return {
      success: true,
      tripPlan: tripPlan,
      message: 'Trip plan created.'
    };
  }

  // getMeetingFilterOptions()
  getMeetingFilterOptions() {
    const bodies = [
      { key: 'city_council', name: 'City Council' },
      { key: 'planning_commission', name: 'Planning Commission' },
      { key: 'parks_board', name: 'Parks Board' },
      { key: 'transportation_commission', name: 'Transportation Commission' },
      { key: 'other', name: 'Other' }
    ];

    const prevMonth = this._calculatePreviousCalendarMonthRange();

    const today = new Date();
    const last30Start = new Date(today.getTime());
    last30Start.setDate(last30Start.getDate() - 30);
    const last30 = {
      startDate: this._formatDate(last30Start),
      endDate: this._formatDate(today)
    };

    const dateRangePresets = [
      {
        key: 'previous_month',
        label: 'Previous Calendar Month',
        startDate: prevMonth.startDate,
        endDate: prevMonth.endDate
      },
      {
        key: 'last_30_days',
        label: 'Last 30 Days',
        startDate: last30.startDate,
        endDate: last30.endDate
      }
    ];

    return {
      bodies: bodies,
      dateRangePresets: dateRangePresets
    };
  }

  // searchMeetings(filters)
  searchMeetings(filters) {
    filters = filters || {};
    const meetings = this._getFromStorage('meetings');

    const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00.000Z') : null;
    const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59.999Z') : null;
    const keyword = (filters.keyword || '').toLowerCase();
    const sortOrder = filters.sortOrder || 'date_asc';

    const filtered = meetings.filter(function (m) {
      if (!m) return false;
      if (filters.bodyKey && m.body !== filters.bodyKey) return false;

      if (m.startDateTime) {
        const dt = new Date(m.startDateTime);
        if (startDate && dt < startDate) return false;
        if (endDate && dt > endDate) return false;
      }

      if (keyword) {
        const haystack = [m.title, m.description].filter(Boolean).join(' ').toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }

      return true;
    });

    filtered.sort(function (a, b) {
      const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      if (sortOrder === 'date_desc') return db - da;
      return da - db; // default asc
    });

    return {
      meetings: filtered,
      totalCount: filtered.length
    };
  }

  // getMeetingDetail(meetingId)
  getMeetingDetail(meetingId) {
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find(function (m) { return m.id === meetingId; }) || null;
    return { meeting: meeting };
  }

  // getMeetingAgendaInfo(meetingId)
  getMeetingAgendaInfo(meetingId) {
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find(function (m) { return m.id === meetingId; }) || null;
    const agendaUrl = meeting && meeting.agendaUrl ? meeting.agendaUrl : null;

    // Instrumentation for task completion tracking (task_4)
    try {
      if (agendaUrl) {
        localStorage.setItem('task4_agendaOpenedMeetingId', meetingId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      meetingId: meetingId,
      agendaUrl: agendaUrl,
      hasAgenda: !!agendaUrl
    };
  }

  // saveMeetingFavorite(meetingId, note)
  saveMeetingFavorite(meetingId, note) {
    const meetings = this._getFromStorage('meetings');
    const favorites = this._getFromStorage('meeting_favorites');
    const meeting = meetings.find(function (m) { return m.id === meetingId; }) || null;

    if (!meeting) {
      return { success: false, favorite: null, message: 'Meeting not found.' };
    }

    const nowIso = new Date().toISOString();
    const favRecord = {
      id: this._generateId('meetingfav'),
      meetingId: meetingId,
      note: note || null,
      createdAt: nowIso
    };

    favorites.push(favRecord);
    this._saveToStorage('meeting_favorites', favorites);

    // Expand foreign key for convenience (not stored)
    const favoriteWithMeeting = Object.assign({}, favRecord, { meeting: meeting });

    return {
      success: true,
      favorite: favoriteWithMeeting,
      message: 'Meeting saved to favorites.'
    };
  }

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const categories = [
      { key: 'road_closure', name: 'Road Closures' },
      { key: 'public_safety', name: 'Public Safety' },
      { key: 'parks', name: 'Parks & Recreation' },
      { key: 'events', name: 'Events' },
      { key: 'administration', name: 'City Administration' },
      { key: 'other', name: 'Other' }
    ];

    const sortOptions = [
      { key: 'newest_first', label: 'Newest First' },
      { key: 'oldest_first', label: 'Oldest First' },
      { key: 'relevance', label: 'Relevance' }
    ];

    const today = new Date();
    const last30Start = new Date(today.getTime());
    last30Start.setDate(last30Start.getDate() - 30);

    const dateRangePresets = [
      {
        key: 'last_7_days',
        label: 'Last 7 Days',
        startDate: this._formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
        endDate: this._formatDate(today)
      },
      {
        key: 'last_30_days',
        label: 'Last 30 Days',
        startDate: this._formatDate(last30Start),
        endDate: this._formatDate(today)
      }
    ];

    return {
      categories: categories,
      sortOptions: sortOptions,
      dateRangePresets: dateRangePresets
    };
  }

  // searchNewsArticles(filters)
  searchNewsArticles(filters) {
    filters = filters || {};
    const articles = this._getFromStorage('news_articles');

    const query = (filters.query || '').toLowerCase();
    const categoryKey = filters.categoryKey || null;
    const publishedFrom = filters.publishedFrom ? new Date(filters.publishedFrom + 'T00:00:00.000Z') : null;
    const publishedTo = filters.publishedTo ? new Date(filters.publishedTo + 'T23:59:59.999Z') : null;
    const sortOrder = filters.sortOrder || 'newest_first';

    const filtered = [];

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (!a) continue;

      if (categoryKey && a.category !== categoryKey) continue;

      if (a.publishedAt) {
        const dt = new Date(a.publishedAt);
        if (publishedFrom && dt < publishedFrom) continue;
        if (publishedTo && dt > publishedTo) continue;
      }

      if (query) {
        const tags = Array.isArray(a.tags) ? a.tags.join(' ') : '';
        const haystack = [a.title, a.summary, a.body, tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(query) === -1) continue;
      }

      filtered.push(a);
    }

    filtered.sort(function (a, b) {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (sortOrder === 'oldest_first') return da - db;
      // For 'relevance' and 'newest_first', use newest first ordering as we don't compute relevance score
      return db - da;
    });

    return {
      articles: filtered,
      totalCount: filtered.length
    };
  }

  // getNewsArticleDetail(articleId)
  getNewsArticleDetail(articleId) {
    const articles = this._getFromStorage('news_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    return { article: article };
  }

  // getReadingListsForSelection()
  getReadingListsForSelection() {
    this._getOrCreateDefaultReadingList();
    const lists = this._getFromStorage('reading_lists');
    return {
      readingLists: lists
    };
  }

  // saveArticleToReadingList(articleId, readingListId)
  saveArticleToReadingList(articleId, readingListId) {
    const articles = this._getFromStorage('news_articles');
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return { success: false, item: null, readingList: null, message: 'Article not found.' };
    }

    let readingList = lists.find(function (l) { return l.id === readingListId; }) || null;
    if (!readingList) {
      readingList = this._getOrCreateDefaultReadingList();
    }

    // Avoid duplicates
    const existing = items.find(function (it) {
      return it.articleId === articleId && it.readingListId === readingList.id;
    });
    if (existing) {
      const itemWithRefs = Object.assign({}, existing, {
        article: article,
        readingList: readingList
      });
      return {
        success: true,
        item: itemWithRefs,
        readingList: readingList,
        message: 'Article already in reading list.'
      };
    }

    const nowIso = new Date().toISOString();
    const item = {
      id: this._generateId('readinglistitem'),
      readingListId: readingList.id,
      articleId: articleId,
      addedAt: nowIso
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    const itemWithRefs = Object.assign({}, item, {
      article: article,
      readingList: readingList
    });

    return {
      success: true,
      item: itemWithRefs,
      readingList: readingList,
      message: 'Article saved to reading list.'
    };
  }

  // getTransportationOverview()
  getTransportationOverview() {
    const overview = this._getObjectFromStorage('transportation_overview', {
      highlights: [],
      permitSummary: ''
    });
    return {
      highlights: Array.isArray(overview.highlights) ? overview.highlights : [],
      permitSummary: overview.permitSummary || ''
    };
  }

  // getParkingPermitOptions()
  getParkingPermitOptions() {
    const permitTypes = [
      {
        key: 'residential_parking',
        name: 'Residential Parking Permit',
        description: 'On-street parking permit for residents.'
      },
      {
        key: 'visitor_parking',
        name: 'Visitor Parking Permit',
        description: 'Short-term visitor parking permits.'
      },
      {
        key: 'other',
        name: 'Other Permit',
        description: 'Other parking-related permits.'
      }
    ];

    const zones = [
      {
        key: 'zone_a',
        name: 'Zone A',
        description: 'Residential Zone A',
        eligiblePermitTypes: ['residential_parking', 'visitor_parking']
      },
      {
        key: 'zone_b',
        name: 'Zone B',
        description: 'Residential Zone B',
        eligiblePermitTypes: ['residential_parking', 'visitor_parking']
      },
      {
        key: 'zone_c',
        name: 'Zone C',
        description: 'Residential Zone C',
        eligiblePermitTypes: ['residential_parking', 'visitor_parking']
      },
      {
        key: 'zone_d',
        name: 'Zone D',
        description: 'Residential Zone D',
        eligiblePermitTypes: ['residential_parking', 'visitor_parking']
      }
    ];

    return {
      permitTypes: permitTypes,
      zones: zones
    };
  }

  // startParkingPermitApplication(permitTypeKey, zoneKey, startDate, applicantName, streetAddress, city, state, zip, vehicleLicensePlate)
  startParkingPermitApplication(permitTypeKey, zoneKey, startDate, applicantName, streetAddress, city, state, zip, vehicleLicensePlate) {
    const apps = this._getFromStorage('parking_permit_applications');

    if (!permitTypeKey || !zoneKey || !startDate || !applicantName || !streetAddress || !vehicleLicensePlate) {
      return { success: false, application: null, message: 'Missing required fields.' };
    }

    const startDateIso = startDate + 'T00:00:00.000Z';
    const nowIso = new Date().toISOString();

    const application = {
      id: this._generateId('parkingperm'),
      permitType: permitTypeKey,
      zone: zoneKey,
      startDate: startDateIso,
      applicantName: applicantName,
      streetAddress: streetAddress,
      city: city || null,
      state: state || null,
      zip: zip || null,
      vehicleLicensePlate: vehicleLicensePlate,
      createdAt: nowIso,
      status: 'in_progress'
    };

    apps.push(application);
    this._saveToStorage('parking_permit_applications', apps);

    return {
      success: true,
      application: application,
      message: 'Parking permit application started.'
    };
  }

  // getTrashRecyclingOverview()
  getTrashRecyclingOverview() {
    const overview = this._getObjectFromStorage('trash_recycling_overview', {
      collectionSummary: '',
      guidelines: [],
      specialServices: []
    });

    return {
      collectionSummary: overview.collectionSummary || '',
      guidelines: Array.isArray(overview.guidelines) ? overview.guidelines : [],
      specialServices: Array.isArray(overview.specialServices) ? overview.specialServices : []
    };
  }

  // getServiceRequestIssueOptions()
  getServiceRequestIssueOptions() {
    const categories = [
      {
        key: 'street_sidewalk',
        name: 'Street & Sidewalk',
        subcategories: [
          {
            key: 'pothole',
            name: 'Pothole',
            allowedLocationTypes: ['intersection', 'address']
          },
          {
            key: 'graffiti',
            name: 'Graffiti',
            allowedLocationTypes: ['address', 'other']
          },
          {
            key: 'streetlight_out',
            name: 'Streetlight Out',
            allowedLocationTypes: ['address', 'intersection']
          }
        ]
      },
      {
        key: 'traffic_signals',
        name: 'Traffic Signals',
        subcategories: [
          {
            key: 'other',
            name: 'Other Signal Issue',
            allowedLocationTypes: ['intersection', 'address']
          }
        ]
      },
      {
        key: 'parks',
        name: 'Parks',
        subcategories: [
          {
            key: 'other',
            name: 'Park Issue',
            allowedLocationTypes: ['address', 'other']
          }
        ]
      },
      {
        key: 'sanitation',
        name: 'Sanitation',
        subcategories: [
          {
            key: 'trash_missed',
            name: 'Trash Missed Pickup',
            allowedLocationTypes: ['address']
          },
          {
            key: 'other',
            name: 'Other Sanitation Issue',
            allowedLocationTypes: ['address', 'other']
          }
        ]
      },
      {
        key: 'other',
        name: 'Other',
        subcategories: [
          {
            key: 'other',
            name: 'Other Issue',
            allowedLocationTypes: ['address', 'intersection', 'coordinates', 'other']
          }
        ]
      }
    ];

    const priorityLevels = [
      {
        key: 'low',
        name: 'Low',
        description: 'Non-urgent issues that can be addressed in routine schedules.'
      },
      {
        key: 'medium',
        name: 'Medium',
        description: 'Important issues that should be addressed soon.'
      },
      {
        key: 'high',
        name: 'High',
        description: 'Significant issues needing prompt attention.'
      },
      {
        key: 'emergency',
        name: 'Emergency',
        description: 'Immediate threats to life or property (call 911 as well).'
      }
    ];

    return {
      categories: categories,
      priorityLevels: priorityLevels
    };
  }

  // getServiceRequestLocationSuggestions(query, locationType)
  getServiceRequestLocationSuggestions(query, locationType) {
    const q = (query || '').trim();
    if (!q || q.length < 3) {
      return { suggestions: [] };
    }

    const suggestions = [];
    const seen = {};

    const serviceRequests = this._getFromStorage('service_requests');
    for (let i = 0; i < serviceRequests.length; i++) {
      const r = serviceRequests[i];
      if (!r || !r.locationDescription) continue;
      if (locationType && r.locationType && r.locationType !== locationType) continue;
      if (r.locationDescription.toLowerCase().indexOf(q.toLowerCase()) === -1) continue;
      const locDesc = r.locationDescription;
      if (seen[locDesc]) continue;
      seen[locDesc] = true;
      suggestions.push({
        id: this._generateId('locsugg'),
        primaryText: locDesc,
        secondaryText: 'Recent request location',
        locationType: r.locationType || 'other',
        locationDescription: locDesc
      });
    }

    // Also infer from park addresses for address-type suggestions
    if (!locationType || locationType === 'address') {
      const parks = this._getFromStorage('parks');
      for (let j = 0; j < parks.length; j++) {
        const p = parks[j];
        if (!p || !p.address) continue;
        const addrText = p.address;
        if (addrText.toLowerCase().indexOf(q.toLowerCase()) === -1) continue;
        if (seen[addrText]) continue;
        seen[addrText] = true;
        suggestions.push({
          id: this._generateId('locsugg'),
          primaryText: addrText,
          secondaryText: p.name || 'Park address',
          locationType: 'address',
          locationDescription: addrText
        });
      }
    }

    // If no suggestions were found from existing data, fall back to using the raw query
    if (suggestions.length === 0) {
      suggestions.push({
        id: this._generateId('locsugg'),
        primaryText: q,
        secondaryText: 'Use this location',
        locationType: locationType || 'other',
        locationDescription: q
      });
    }

    return { suggestions: suggestions };
  }

  // submitIssueReport(categoryKey, subcategoryKey, locationTypeKey, locationDescription, description, priorityKey, contactName, contactEmail)
  submitIssueReport(categoryKey, subcategoryKey, locationTypeKey, locationDescription, description, priorityKey, contactName, contactEmail) {
    const serviceRequests = this._getFromStorage('service_requests');

    if (!categoryKey || !subcategoryKey || !locationTypeKey || !locationDescription || !description || !priorityKey) {
      return { success: false, serviceRequest: null, message: 'Missing required fields.' };
    }

    const nowIso = new Date().toISOString();

    const request = {
      id: this._generateId('servicereq'),
      requestType: 'issue_report',
      category: categoryKey,
      subcategory: subcategoryKey,
      locationType: locationTypeKey,
      locationDescription: locationDescription,
      address: null,
      city: null,
      state: null,
      zip: null,
      description: description,
      priority: priorityKey,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      itemType: null,
      quantity: null,
      pickupDate: null,
      notes: null,
      submittedAt: nowIso,
      status: 'submitted'
    };

    serviceRequests.push(request);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      serviceRequest: request,
      message: 'Issue report submitted.'
    };
  }

  // getBulkPickupOptions()
  getBulkPickupOptions() {
    const itemTypes = [
      {
        key: 'furniture',
        name: 'Furniture',
        description: 'Couches, tables, mattresses, and other household furniture.'
      },
      {
        key: 'appliance',
        name: 'Appliance',
        description: 'Large appliances such as refrigerators, washers, and dryers.'
      },
      {
        key: 'yard_waste',
        name: 'Yard Waste',
        description: 'Bundled branches and other large yard waste items.'
      },
      {
        key: 'other',
        name: 'Other',
        description: 'Other bulk items not listed above.'
      }
    ];

    const earliestPickupDate = this._calculateEarliestBulkPickupDate();

    const instructions = 'Place approved bulk items at the curb by 7:00 AM on your scheduled pickup day. Do not block sidewalks, driveways, or roadways.';

    return {
      itemTypes: itemTypes,
      earliestPickupDate: earliestPickupDate,
      instructions: instructions
    };
  }

  // getBulkPickupAvailableDates(minDate, preferredDayOfWeek, maxResults)
  getBulkPickupAvailableDates(minDate, preferredDayOfWeek, maxResults) {
    const dates = [];
    if (!minDate) {
      return { dates: dates };
    }

    const earliestRuleDateStr = this._calculateEarliestBulkPickupDate();
    const startStr = minDate > earliestRuleDateStr ? minDate : earliestRuleDateStr;

    let cursor = new Date(startStr + 'T00:00:00.000Z');
    if (isNaN(cursor.getTime())) {
      return { dates: [] };
    }

    const preferred = preferredDayOfWeek || null; // e.g., 'saturday'
    const max = typeof maxResults === 'number' && maxResults > 0 ? maxResults : 10;

    const dayOfWeekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Search next ~180 days for available slots
    for (let i = 0; i < 180 && dates.length < max; i++) {
      const dowKey = dayOfWeekMap[cursor.getUTCDay()];
      if (!preferred || dowKey === preferred) {
        dates.push({
          date: this._formatDate(cursor),
          isAvailable: true,
          reasonUnavailable: ''
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { dates: dates };
  }

  // submitBulkPickupRequest(itemTypeKey, quantity, pickupDate, address, city, state, zip, notes)
  submitBulkPickupRequest(itemTypeKey, quantity, pickupDate, address, city, state, zip, notes) {
    const serviceRequests = this._getFromStorage('service_requests');

    if (!itemTypeKey || !pickupDate || !address || !zip) {
      return { success: false, serviceRequest: null, message: 'Missing required fields.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const pickupDateIso = pickupDate + 'T00:00:00.000Z';
    const nowIso = new Date().toISOString();

    const request = {
      id: this._generateId('servicereq'),
      requestType: 'bulk_item_pickup',
      category: 'sanitation',
      subcategory: 'other',
      locationType: 'address',
      locationDescription: address,
      address: address,
      city: city || null,
      state: state || null,
      zip: zip,
      description: null,
      priority: 'low',
      contactName: null,
      contactEmail: null,
      itemType: itemTypeKey,
      quantity: qty,
      pickupDate: pickupDateIso,
      notes: notes || null,
      submittedAt: nowIso,
      status: 'submitted'
    };

    serviceRequests.push(request);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      serviceRequest: request,
      message: 'Bulk pickup request submitted.'
    };
  }

  // getSubscriptionTopicsAndOptions()
  getSubscriptionTopicsAndOptions() {
    const topics = this._getFromStorage('subscription_topics');

    const frequencyOptions = [
      { key: 'instant', label: 'Instant' },
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'monthly', label: 'Monthly' }
    ];

    const contactMethods = [
      { key: 'email', label: 'Email' },
      { key: 'sms', label: 'Text Message' },
      { key: 'phone', label: 'Phone Call' }
    ];

    return {
      topics: topics,
      frequencyOptions: frequencyOptions,
      contactMethods: contactMethods
    };
  }

  // getSubscriptionPreferencesForEmail(email)
  getSubscriptionPreferencesForEmail(email) {
    const topics = this._getFromStorage('subscription_topics');
    const prefs = this._getFromStorage('subscription_preferences');

    const preferences = topics.map(function (topic) {
      const existingPref = prefs.find(function (p) {
        return p.email === email && p.topicId === topic.id;
      }) || null;
      return {
        topic: topic,
        settings: {
          preference: existingPref
        }
      };
    });

    return {
      email: email,
      preferences: preferences
    };
  }

  // updateSubscriptionPreferences(email, preferences)
  updateSubscriptionPreferences(email, preferences) {
    preferences = Array.isArray(preferences) ? preferences : [];

    const topics = this._getFromStorage('subscription_topics');
    const prefs = this._getFromStorage('subscription_preferences');
    const nowIso = new Date().toISOString();

    const updatedPreferences = [];

    for (let i = 0; i < preferences.length; i++) {
      const prefInput = preferences[i];
      if (!prefInput || !prefInput.topicKey) continue;
      const topic = topics.find(function (t) { return t.key === prefInput.topicKey; }) || null;
      if (!topic) continue;

      let existingIndex = -1;
      for (let j = 0; j < prefs.length; j++) {
        if (prefs[j].email === email && prefs[j].topicId === topic.id) {
          existingIndex = j;
          break;
        }
      }

      if (existingIndex >= 0) {
        // Update existing
        const existing = prefs[existingIndex];
        existing.isSubscribed = !!prefInput.isSubscribed;
        existing.frequency = prefInput.frequencyKey || existing.frequency || null;
        existing.preferredContactMethod = prefInput.preferredContactMethodKey || existing.preferredContactMethod || 'email';
        existing.updatedAt = nowIso;
        prefs[existingIndex] = existing;
        updatedPreferences.push(existing);
      } else {
        // Create new
        const newPref = {
          id: this._generateId('subpref'),
          email: email,
          topicId: topic.id,
          isSubscribed: !!prefInput.isSubscribed,
          frequency: prefInput.frequencyKey || null,
          preferredContactMethod: prefInput.preferredContactMethodKey || 'email',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        prefs.push(newPref);
        updatedPreferences.push(newPref);
      }
    }

    this._saveToStorage('subscription_preferences', prefs);

    return {
      success: true,
      updatedPreferences: updatedPreferences,
      message: 'Subscription preferences updated.'
    };
  }

  // getAboutAndContactInfo()
  getAboutAndContactInfo() {
    const info = this._getObjectFromStorage('about_contact_info', {
      aboutText: '',
      contactChannels: [],
      accessibilitySummary: '',
      privacySummary: '',
      termsSummary: ''
    });

    return {
      aboutText: info.aboutText || '',
      contactChannels: Array.isArray(info.contactChannels) ? info.contactChannels : [],
      accessibilitySummary: info.accessibilitySummary || '',
      privacySummary: info.privacySummary || '',
      termsSummary: info.termsSummary || ''
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