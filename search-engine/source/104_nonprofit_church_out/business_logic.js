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
  }

  // ===== Storage helpers =====

  _initStorage() {
    var keys = [
      'campuses',
      'volunteer_opportunities',
      'volunteer_shifts',
      'volunteer_shift_registrations',
      'events',
      'event_registrations',
      'outreach_plans',
      'outreach_plan_items',
      'funds',
      'donations',
      'donation_allocations',
      'food_resources',
      'food_resource_schedules',
      'prayer_requests',
      'devotional_subscriptions',
      'contact_messages'
    ];

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    var data = localStorage.getItem(key);
    if (!data) return [];
    try {
      var parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _formatDateYYYYMMDD(dateObj) {
    var year = dateObj.getFullYear();
    var month = (dateObj.getMonth() + 1).toString();
    if (month.length < 2) month = '0' + month;
    var day = dateObj.getDate().toString();
    if (day.length < 2) day = '0' + day;
    return year + '-' + month + '-' + day;
  }

  _parseDateOnly(dateStr) {
    // Expecting 'YYYY-MM-DD'; create Date at local midnight
    return new Date(dateStr + 'T00:00:00');
  }

  _humanizeEnum(enumValue) {
    if (!enumValue || typeof enumValue !== 'string') return '';
    var parts = enumValue.split('_');
    for (var i = 0; i < parts.length; i++) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }
    return parts.join(' ');
  }

  _buildCostDisplay(event) {
    if (!event) return '';
    var type = event.cost_type;
    var amount = event.cost_amount;
    if (type === 'free') return 'Free';
    if (type === 'paid') {
      if (typeof amount === 'number') {
        return '$' + amount.toFixed(2).replace(/\.00$/, '');
      }
      return 'Paid';
    }
    if (type === 'donation') {
      if (typeof amount === 'number') {
        return 'Donation (suggested $' + amount.toFixed(2).replace(/\.00$/, '') + ')';
      }
      return 'Donation';
    }
    return '';
  }

  _dayOfWeekOrder(dayKey) {
    var order = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    return Object.prototype.hasOwnProperty.call(order, dayKey) ? order[dayKey] : 99;
  }

  // ===== Required private helpers from spec =====

  // Internal helper to fetch or create the single-user OutreachPlan record for the current session.
  _getOrCreateOutreachPlan() {
    var plans = this._getFromStorage('outreach_plans');
    var currentId = localStorage.getItem('currentOutreachPlanId');
    var plan = null;

    if (currentId) {
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].id === currentId) {
          plan = plans[i];
          break;
        }
      }
    }

    if (!plan && plans.length > 0) {
      plan = plans[0];
      localStorage.setItem('currentOutreachPlanId', plan.id);
    }

    if (!plan) {
      plan = {
        id: this._generateId('outreachplan'),
        title: 'My Outreach Plan',
        notes: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      plans.push(plan);
      this._saveToStorage('outreach_plans', plans);
      localStorage.setItem('currentOutreachPlanId', plan.id);
    }

    return plan;
  }

  // Internal helper to convert a ZIP/postal code to latitude/longitude for distance and radius filtering.
  _geocodeZipToLatLng(zip) {
    if (!zip) return null;
    // Minimal hard-coded mapping for demonstration; extend as needed.
    var map = {
      '30301': { lat: 33.7529, lng: -84.3925 }, // Atlanta, GA (approx)
      '44101': { lat: 41.4993, lng: -81.6944 }  // Cleveland, OH (approx)
    };
    if (Object.prototype.hasOwnProperty.call(map, zip)) {
      return map[zip];
    }
    return null;
  }

  // Internal helper to compute distance in miles between a search coordinate and entity coordinates.
  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return null;
    }
    var R = 3958.8; // Earth radius in miles
    var toRad = function (deg) { return deg * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  }

  // Internal helper to map exact times to logical time-of-day buckets.
  _classifyTimeOfDaySlot(timeStr) {
    // timeStr: 'HH:MM' 24-hour
    if (!timeStr) return null;
    var parts = timeStr.split(':');
    if (parts.length < 2) return null;
    var hour = parseInt(parts[0], 10);
    var minute = parseInt(parts[1], 10) || 0;
    var totalMinutes = hour * 60 + minute;

    // Optional special classification for after 15:00
    if (totalMinutes >= 15 * 60 && totalMinutes < 18 * 60) {
      return 'afternoon_after_1500';
    }
    if (totalMinutes < 12 * 60) {
      return 'morning';
    }
    if (totalMinutes < 18 * 60) {
      return 'afternoon';
    }
    return 'evening';
  }

  // Internal helper to integrate with payment gateway (simulated).
  _processDonationPayment(donation) {
    // Simulate payment success based on simple rule: if card_number starts with '4', succeed; otherwise fail.
    // For non-card methods, assume success.
    var status = 'succeeded';
    if (donation.payment_method === 'credit_debit_card') {
      var cardNumber = donation.card_number || '';
      if (cardNumber.charAt(0) !== '4') {
        status = 'failed';
      }
    }
    donation.transaction_status = status;
    donation.confirmation_number = status === 'succeeded' ? ('CONF-' + this._getNextIdCounter()) : null;
    return donation;
  }

  // Internal helper to calculate the date of the next upcoming Sunday.
  _getNextUpcomingSunday() {
    var today = new Date();
    var day = today.getDay(); // 0 = Sunday
    var diff = (7 - day) % 7;
    if (diff === 0) diff = 7; // Next Sunday strictly later than today
    var next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    return this._formatDateYYYYMMDD(next);
  }

  // ===== Interface implementations =====

  // getPrimaryNavigation
  getPrimaryNavigation() {
    return [
      { id: 'serve', label: 'Serve', order: 1 },
      { id: 'events', label: 'Events', order: 2 },
      { id: 'give', label: 'Give', order: 3 },
      { id: 'get_help', label: 'Get Help', order: 4 },
      { id: 'care_prayer', label: 'Care & Prayer', order: 5 },
      { id: 'about', label: 'About', order: 6 },
      { id: 'contact', label: 'Contact', order: 7 }
    ];
  }

  // getHomepageHighlights
  getHomepageHighlights() {
    var volunteerOpportunities = this._getFromStorage('volunteer_opportunities');
    var volunteerShifts = this._getFromStorage('volunteer_shifts');
    var events = this._getFromStorage('events');
    var campuses = this._getFromStorage('campuses');
    var funds = this._getFromStorage('funds');

    var now = new Date();

    // Featured Volunteer Opportunities
    var featuredVolunteerOpportunities = [];
    for (var i = 0; i < volunteerOpportunities.length; i++) {
      var opp = volunteerOpportunities[i];
      if (!opp.is_active) continue;

      // find upcoming shift
      var bestShift = null;
      for (var j = 0; j < volunteerShifts.length; j++) {
        var shift = volunteerShifts[j];
        if (shift.volunteer_opportunity_id !== opp.id) continue;
        if (shift.is_cancelled) continue;
        var start = new Date(shift.start_datetime);
        if (isNaN(start.getTime())) continue;
        if (start <= now) continue;
        if (bestShift === null || new Date(bestShift.start_datetime) > start) {
          bestShift = shift;
        }
      }
      if (!bestShift) continue;

      var campus = null;
      for (var c = 0; c < campuses.length; c++) {
        if (campuses[c].id === opp.campus_id) {
          campus = campuses[c];
          break;
        }
      }

      var locationSummaryParts = [];
      if (campus && campus.name) locationSummaryParts.push(campus.name);
      if (opp.address_line1) locationSummaryParts.push(opp.address_line1);
      var locationSummary = locationSummaryParts.join(' – ');

      featuredVolunteerOpportunities.push({
        volunteerOpportunityId: opp.id,
        title: opp.title,
        categoryKey: opp.category,
        categoryLabel: this._humanizeEnum(opp.category),
        campusName: campus ? campus.name : '',
        locationSummary: locationSummary,
        nextShiftStart: bestShift.start_datetime,
        nextShiftTimeOfDay: bestShift.time_of_day,
        spotsRemaining: typeof bestShift.spots_remaining === 'number' ? bestShift.spots_remaining : null,
        campus: campus || null
      });
    }

    featuredVolunteerOpportunities.sort(function (a, b) {
      var da = new Date(a.nextShiftStart).getTime();
      var db = new Date(b.nextShiftStart).getTime();
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return da - db;
    });
    featuredVolunteerOpportunities = featuredVolunteerOpportunities.slice(0, 5);

    // Featured Events
    var featuredEvents = [];
    for (var k = 0; k < events.length; k++) {
      var ev = events[k];
      if (ev.status !== 'scheduled') continue;
      var evStart = new Date(ev.start_datetime);
      if (isNaN(evStart.getTime()) || evStart <= now) continue;
      var evCampus = null;
      for (var cc = 0; cc < campuses.length; cc++) {
        if (campuses[cc].id === ev.campus_id) {
          evCampus = campuses[cc];
          break;
        }
      }
      featuredEvents.push({
        eventId: ev.id,
        title: ev.title,
        categoryKey: ev.category,
        categoryLabel: this._humanizeEnum(ev.category),
        startDatetime: ev.start_datetime,
        endDatetime: ev.end_datetime,
        campusName: evCampus ? evCampus.name : '',
        timeOfDay: ev.time_of_day,
        costDisplay: this._buildCostDisplay(ev),
        isOutreachEligible: !!ev.is_outreach_eligible,
        campus: evCampus || null
      });
    }

    featuredEvents.sort(function (a, b) {
      var da = new Date(a.startDatetime).getTime();
      var db = new Date(b.startDatetime).getTime();
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return da - db;
    });
    featuredEvents = featuredEvents.slice(0, 5);

    // Featured Funds
    var activeFunds = [];
    for (var f = 0; f < funds.length; f++) {
      if (funds[f].is_active) activeFunds.push(funds[f]);
    }
    activeFunds.sort(function (a, b) {
      var ao = typeof a.display_order === 'number' ? a.display_order : 9999;
      var bo = typeof b.display_order === 'number' ? b.display_order : 9999;
      return ao - bo;
    });

    var featuredFunds = [];
    for (var af = 0; af < activeFunds.length; af++) {
      featuredFunds.push({
        fundId: activeFunds[af].id,
        fundName: activeFunds[af].name,
        description: activeFunds[af].description || '',
        suggestedAmount: null
      });
    }

    var quickActions = [
      {
        id: 'get_help',
        label: 'Get Help',
        iconKey: 'help',
        description: 'Find food, financial, and care resources.'
      },
      {
        id: 'prayer_request',
        label: 'Submit a prayer request',
        iconKey: 'prayer',
        description: 'Let our team pray with and for you.'
      },
      {
        id: 'email_devotionals',
        label: 'Email devotionals',
        iconKey: 'email',
        description: 'Receive weekly encouragement and Scripture.'
      }
    ];

    return {
      featuredVolunteerOpportunities: featuredVolunteerOpportunities,
      featuredEvents: featuredEvents,
      featuredFunds: featuredFunds,
      quickActions: quickActions
    };
  }

  // getVolunteerOpportunityFilterOptions
  getVolunteerOpportunityFilterOptions() {
    return {
      categories: [
        { key: 'food_pantry', label: 'Food pantry' },
        { key: 'neighborhood_cleanup', label: 'Neighborhood cleanup' },
        { key: 'tutoring', label: 'Tutoring' },
        { key: 'admin_support', label: 'Admin support' },
        { key: 'childcare', label: 'Childcare' },
        { key: 'other', label: 'Other' }
      ],
      timeOfDayOptions: [
        { key: 'morning', label: 'Morning' },
        { key: 'afternoon', label: 'Afternoon' },
        { key: 'evening', label: 'Evening' }
      ],
      dayOfWeekOptions: [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
      ],
      sortOptions: [
        { key: 'date_soonest', label: 'Date - Soonest first' },
        { key: 'distance', label: 'Distance' },
        { key: 'name_az', label: 'Name A-Z' }
      ]
    };
  }

  // searchVolunteerOpportunities
  searchVolunteerOpportunities(categoryKey, zip, radiusMiles, dateRangeStart, dateRangeEnd, timeOfDay, daysOfWeek, sortBy) {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var shifts = this._getFromStorage('volunteer_shifts');
    var campuses = this._getFromStorage('campuses');

    var now = new Date();
    var hasDateRange = !!(dateRangeStart || dateRangeEnd);
    var startDate = dateRangeStart ? this._parseDateOnly(dateRangeStart) : null;
    var endDate = dateRangeEnd ? this._parseDateOnly(dateRangeEnd) : null;

    var searchCoord = null;
    if (zip && typeof radiusMiles === 'number') {
      searchCoord = this._geocodeZipToLatLng(zip);
    }

    var daysSet = null;
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      daysSet = {};
      for (var d = 0; d < daysOfWeek.length; d++) {
        daysSet[daysOfWeek[d]] = true;
      }
    }

    var results = [];

    for (var i = 0; i < opportunities.length; i++) {
      var opp = opportunities[i];
      if (!opp.is_active) continue;
      if (categoryKey && opp.category !== categoryKey) continue;

      var campus = null;
      for (var c = 0; c < campuses.length; c++) {
        if (campuses[c].id === opp.campus_id) {
          campus = campuses[c];
          break;
        }
      }

      var oppLat = typeof opp.latitude === 'number' ? opp.latitude : (campus && typeof campus.latitude === 'number' ? campus.latitude : null);
      var oppLng = typeof opp.longitude === 'number' ? opp.longitude : (campus && typeof campus.longitude === 'number' ? campus.longitude : null);

      var distance = null;
      if (searchCoord && typeof radiusMiles === 'number') {
        distance = this._calculateDistanceMiles(searchCoord.lat, searchCoord.lng, oppLat, oppLng);
        if (distance === null || distance > radiusMiles) {
          continue;
        }
      }

      // find best matching upcoming shift
      var bestShift = null;
      for (var s = 0; s < shifts.length; s++) {
        var shift = shifts[s];
        if (shift.volunteer_opportunity_id !== opp.id) continue;
        if (shift.is_cancelled) continue;

        var shiftStart = new Date(shift.start_datetime);
        if (isNaN(shiftStart.getTime())) continue;
        if (shiftStart <= now) continue;

        if (timeOfDay && shift.time_of_day !== timeOfDay) continue;

        if (daysSet && !daysSet[shift.day_of_week]) continue;

        if (hasDateRange) {
          var shiftDateOnly = new Date(shiftStart.getFullYear(), shiftStart.getMonth(), shiftStart.getDate());
          if (startDate && shiftDateOnly < startDate) continue;
          if (endDate && shiftDateOnly > endDate) continue;
        }

        if (typeof shift.spots_remaining === 'number' && shift.spots_remaining <= 0) continue;

        if (!bestShift || new Date(bestShift.start_datetime) > shiftStart) {
          bestShift = shift;
        }
      }

      if (!bestShift) continue;

      results.push({
        volunteerOpportunityId: opp.id,
        title: opp.title,
        categoryKey: opp.category,
        categoryLabel: this._humanizeEnum(opp.category),
        campusName: campus ? campus.name : '',
        locationName: opp.location_name || '',
        addressLine1: opp.address_line1 || '',
        city: opp.city || '',
        state: opp.state || '',
        postalCode: opp.postal_code || '',
        distanceMiles: distance,
        nextShiftStart: bestShift.start_datetime,
        nextShiftEnd: bestShift.end_datetime,
        nextShiftDayOfWeek: bestShift.day_of_week,
        nextShiftTimeOfDay: bestShift.time_of_day,
        nextShiftSpotsRemaining: typeof bestShift.spots_remaining === 'number' ? bestShift.spots_remaining : null,
        isActive: !!opp.is_active,
        campus: campus || null
      });
    }

    var sortKey = sortBy || 'date_soonest';
    results.sort(function (a, b) {
      if (sortKey === 'name_az') {
        var ta = (a.title || '').toLowerCase();
        var tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      if (sortKey === 'distance') {
        var da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.POSITIVE_INFINITY;
        var db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      // default date_soonest
      var sa = new Date(a.nextShiftStart).getTime();
      var sb = new Date(b.nextShiftStart).getTime();
      if (isNaN(sa) && isNaN(sb)) return 0;
      if (isNaN(sa)) return 1;
      if (isNaN(sb)) return -1;
      return sa - sb;
    });

    return results;
  }

  // getVolunteerOpportunityDetail
  getVolunteerOpportunityDetail(volunteerOpportunityId) {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var campuses = this._getFromStorage('campuses');
    var shifts = this._getFromStorage('volunteer_shifts');

    var opp = null;
    for (var i = 0; i < opportunities.length; i++) {
      if (opportunities[i].id === volunteerOpportunityId) {
        opp = opportunities[i];
        break;
      }
    }

    if (!opp) {
      return null;
    }

    var campus = null;
    for (var c = 0; c < campuses.length; c++) {
      if (campuses[c].id === opp.campus_id) {
        campus = campuses[c];
        break;
      }
    }

    var now = new Date();
    var upcomingCount = 0;
    for (var s = 0; s < shifts.length; s++) {
      var shift = shifts[s];
      if (shift.volunteer_opportunity_id !== opp.id) continue;
      if (shift.is_cancelled) continue;
      var start = new Date(shift.start_datetime);
      if (isNaN(start.getTime())) continue;
      if (start > now) upcomingCount++;
    }

    return {
      volunteerOpportunityId: opp.id,
      title: opp.title,
      description: opp.description || '',
      requirements: opp.requirements || '',
      categoryKey: opp.category,
      categoryLabel: this._humanizeEnum(opp.category),
      campusName: campus ? campus.name : '',
      locationName: opp.location_name || '',
      addressLine1: opp.address_line1 || '',
      addressLine2: opp.address_line2 || '',
      city: opp.city || '',
      state: opp.state || '',
      postalCode: opp.postal_code || '',
      latitude: typeof opp.latitude === 'number' ? opp.latitude : null,
      longitude: typeof opp.longitude === 'number' ? opp.longitude : null,
      contactName: opp.contact_name || '',
      contactEmail: opp.contact_email || '',
      contactPhone: opp.contact_phone || '',
      isActive: !!opp.is_active,
      upcomingShiftsCount: upcomingCount,
      campus: campus || null
    };
  }

  // getVolunteerOpportunityShifts
  getVolunteerOpportunityShifts(volunteerOpportunityId, dateRangeStart, dateRangeEnd) {
    var shifts = this._getFromStorage('volunteer_shifts');
    var hasDateRange = !!(dateRangeStart || dateRangeEnd);
    var startDate = dateRangeStart ? this._parseDateOnly(dateRangeStart) : null;
    var endDate = dateRangeEnd ? this._parseDateOnly(dateRangeEnd) : null;

    var result = [];
    for (var i = 0; i < shifts.length; i++) {
      var shift = shifts[i];
      if (shift.volunteer_opportunity_id !== volunteerOpportunityId) continue;

      if (hasDateRange) {
        var start = new Date(shift.start_datetime);
        if (isNaN(start.getTime())) continue;
        var dateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (startDate && dateOnly < startDate) continue;
        if (endDate && dateOnly > endDate) continue;
      }

      result.push({
        volunteerShiftId: shift.id,
        startDatetime: shift.start_datetime,
        endDatetime: shift.end_datetime,
        dayOfWeek: shift.day_of_week,
        timeOfDay: shift.time_of_day,
        capacity: typeof shift.capacity === 'number' ? shift.capacity : null,
        spotsRemaining: typeof shift.spots_remaining === 'number' ? shift.spots_remaining : null,
        isCancelled: !!shift.is_cancelled
      });
    }

    result.sort(function (a, b) {
      var da = new Date(a.startDatetime).getTime();
      var db = new Date(b.startDatetime).getTime();
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return da - db;
    });

    return result;
  }

  // registerForVolunteerShift
  registerForVolunteerShift(volunteerShiftId, fullName, email, phone) {
    var shifts = this._getFromStorage('volunteer_shifts');
    var registrations = this._getFromStorage('volunteer_shift_registrations');

    var shift = null;
    for (var i = 0; i < shifts.length; i++) {
      if (shifts[i].id === volunteerShiftId) {
        shift = shifts[i];
        break;
      }
    }

    if (!shift) {
      return {
        success: false,
        message: 'Shift not found.',
        registration: null,
        spotsRemainingAfter: null
      };
    }

    if (shift.is_cancelled) {
      return {
        success: false,
        message: 'This shift has been cancelled.',
        registration: null,
        spotsRemainingAfter: typeof shift.spots_remaining === 'number' ? shift.spots_remaining : null
      };
    }

    if (typeof shift.spots_remaining === 'number' && shift.spots_remaining <= 0) {
      return {
        success: false,
        message: 'This shift is full.',
        registration: null,
        spotsRemainingAfter: shift.spots_remaining
      };
    }

    var reg = {
      id: this._generateId('vsreg'),
      volunteer_shift_id: volunteerShiftId,
      full_name: fullName,
      email: email,
      phone: phone,
      status: 'active',
      created_at: this._nowIso()
    };
    registrations.push(reg);

    if (typeof shift.spots_remaining === 'number') {
      shift.spots_remaining = Math.max(0, shift.spots_remaining - 1);
    }

    this._saveToStorage('volunteer_shift_registrations', registrations);
    this._saveToStorage('volunteer_shifts', shifts);

    return {
      success: true,
      message: 'You are registered for this volunteer shift.',
      registration: {
        registrationId: reg.id,
        volunteerShiftId: reg.volunteer_shift_id,
        fullName: reg.full_name,
        email: reg.email,
        phone: reg.phone,
        status: reg.status,
        createdAt: reg.created_at
      },
      spotsRemainingAfter: typeof shift.spots_remaining === 'number' ? shift.spots_remaining : null
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    var campuses = this._getFromStorage('campuses');
    var campusOptions = [];
    for (var i = 0; i < campuses.length; i++) {
      campusOptions.push({
        campusId: campuses[i].id,
        campusName: campuses[i].name
      });
    }

    return {
      categories: [
        { key: 'workshops_classes', label: 'Workshops & Classes' },
        { key: 'outreach_events', label: 'Outreach & Service' },
        { key: 'service_projects', label: 'Neighborhood cleanups' },
        { key: 'worship_service', label: 'Worship services' },
        { key: 'support_group', label: 'Support groups' },
        { key: 'other', label: 'Other' }
      ],
      costFilters: [
        { key: 'any', label: 'Any cost' },
        { key: 'free_only', label: 'Free only' },
        { key: 'paid_only', label: 'Paid only' },
        { key: 'donation_only', label: 'Donation only' }
      ],
      formatOptions: [
        { key: 'in_person', label: 'In-person' },
        { key: 'online', label: 'Online' },
        { key: 'hybrid', label: 'Hybrid' }
      ],
      campuses: campusOptions,
      timeOfDayOptions: [
        { key: 'morning', label: 'Morning' },
        { key: 'afternoon', label: 'Afternoon' },
        { key: 'evening', label: 'Evening' }
      ],
      dayOfWeekOptions: [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
      ],
      activityLevelOptions: [
        { key: 'light', label: 'Light activity' },
        { key: 'moderate', label: 'Moderate activity' },
        { key: 'intense', label: 'Intense activity' },
        { key: 'not_applicable', label: 'Not applicable' }
      ],
      sortOptions: [
        { key: 'date_soonest', label: 'Date - Soonest first' },
        { key: 'distance', label: 'Distance' },
        { key: 'name_az', label: 'Name A-Z' }
      ]
    };
  }

  // searchEvents
  searchEvents(categoryKey, costFilter, formatKey, campusId, zip, radiusMiles, dateRangeStart, dateRangeEnd, dayOfWeek, timeOfDay, activityLevelKey, isOutreachEligibleOnly, sortBy) {
    var events = this._getFromStorage('events');
    var campuses = this._getFromStorage('campuses');

    var hasDateRange = !!(dateRangeStart || dateRangeEnd);
    var startDate = dateRangeStart ? this._parseDateOnly(dateRangeStart) : null;
    var endDate = dateRangeEnd ? this._parseDateOnly(dateRangeEnd) : null;

    var searchCoord = null;
    if (zip && typeof radiusMiles === 'number') {
      searchCoord = this._geocodeZipToLatLng(zip);
    }

    var results = [];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      if (ev.status !== 'scheduled') continue;

      if (categoryKey && ev.category !== categoryKey) continue;

      if (costFilter && costFilter !== 'any') {
        if (costFilter === 'free_only' && ev.cost_type !== 'free') continue;
        if (costFilter === 'paid_only' && ev.cost_type !== 'paid') continue;
        if (costFilter === 'donation_only' && ev.cost_type !== 'donation') continue;
      }

      if (formatKey && ev.format !== formatKey) continue;
      if (campusId && ev.campus_id !== campusId) continue;
      if (dayOfWeek && ev.day_of_week !== dayOfWeek) continue;
      if (timeOfDay && ev.time_of_day !== timeOfDay) continue;
      if (activityLevelKey && ev.activity_level !== activityLevelKey) continue;
      if (isOutreachEligibleOnly && !ev.is_outreach_eligible) continue;

      if (hasDateRange) {
        var evStart = new Date(ev.start_datetime);
        if (isNaN(evStart.getTime())) continue;
        var dateOnly = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
        if (startDate && dateOnly < startDate) continue;
        if (endDate && dateOnly > endDate) continue;
      }

      var campus = null;
      for (var c = 0; c < campuses.length; c++) {
        if (campuses[c].id === ev.campus_id) {
          campus = campuses[c];
          break;
        }
      }

      var evLat = typeof ev.latitude === 'number' ? ev.latitude : (campus && typeof campus.latitude === 'number' ? campus.latitude : null);
      var evLng = typeof ev.longitude === 'number' ? ev.longitude : (campus && typeof campus.longitude === 'number' ? campus.longitude : null);
      var distance = null;
      if (searchCoord && typeof radiusMiles === 'number') {
        distance = this._calculateDistanceMiles(searchCoord.lat, searchCoord.lng, evLat, evLng);
        if (distance === null || distance > radiusMiles) {
          continue;
        }
      }

      results.push({
        eventId: ev.id,
        title: ev.title,
        categoryKey: ev.category,
        categoryLabel: this._humanizeEnum(ev.category),
        campusName: campus ? campus.name : '',
        campusId: ev.campus_id || null,
        locationName: ev.location_name || '',
        addressLine1: ev.address_line1 || '',
        city: ev.city || '',
        state: ev.state || '',
        postalCode: ev.postal_code || '',
        distanceMiles: distance,
        startDatetime: ev.start_datetime,
        endDatetime: ev.end_datetime,
        dayOfWeek: ev.day_of_week,
        timeOfDay: ev.time_of_day,
        costType: ev.cost_type,
        costAmount: typeof ev.cost_amount === 'number' ? ev.cost_amount : null,
        costDisplay: this._buildCostDisplay(ev),
        formatKey: ev.format,
        formatLabel: this._humanizeEnum(ev.format),
        activityLevelKey: ev.activity_level,
        activityLevelLabel: this._humanizeEnum(ev.activity_level),
        isOutreachEligible: !!ev.is_outreach_eligible,
        isRegistrationRequired: !!ev.is_registration_required,
        status: ev.status,
        campus: campus || null
      });
    }

    var sortKey = sortBy || 'date_soonest';
    results.sort(function (a, b) {
      if (sortKey === 'name_az') {
        var ta = (a.title || '').toLowerCase();
        var tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      if (sortKey === 'distance') {
        var da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.POSITIVE_INFINITY;
        var db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      var sa = new Date(a.startDatetime).getTime();
      var sb = new Date(b.startDatetime).getTime();
      if (isNaN(sa) && isNaN(sb)) return 0;
      if (isNaN(sa)) return 1;
      if (isNaN(sb)) return -1;
      return sa - sb;
    });

    return results;
  }

  // getEventDetail
  getEventDetail(eventId) {
    var events = this._getFromStorage('events');
    var campuses = this._getFromStorage('campuses');

    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) return null;

    var campus = null;
    for (var c = 0; c < campuses.length; c++) {
      if (campuses[c].id === ev.campus_id) {
        campus = campuses[c];
        break;
      }
    }

    var now = new Date();
    var evStart = new Date(ev.start_datetime);
    var canAddToOutreachPlan = !!(ev.is_outreach_eligible && ev.status === 'scheduled' && !isNaN(evStart.getTime()) && evStart > now);

    return {
      eventId: ev.id,
      title: ev.title,
      description: ev.description || '',
      categoryKey: ev.category,
      categoryLabel: this._humanizeEnum(ev.category),
      campusId: ev.campus_id || null,
      campusName: campus ? campus.name : '',
      locationName: ev.location_name || '',
      addressLine1: ev.address_line1 || '',
      addressLine2: ev.address_line2 || '',
      city: ev.city || '',
      state: ev.state || '',
      postalCode: ev.postal_code || '',
      latitude: typeof ev.latitude === 'number' ? ev.latitude : null,
      longitude: typeof ev.longitude === 'number' ? ev.longitude : null,
      startDatetime: ev.start_datetime,
      endDatetime: ev.end_datetime,
      dayOfWeek: ev.day_of_week,
      timeOfDay: ev.time_of_day,
      costType: ev.cost_type,
      costAmount: typeof ev.cost_amount === 'number' ? ev.cost_amount : null,
      costDisplay: this._buildCostDisplay(ev),
      formatKey: ev.format,
      formatLabel: this._humanizeEnum(ev.format),
      activityLevelKey: ev.activity_level,
      activityLevelLabel: this._humanizeEnum(ev.activity_level),
      isOutreachEligible: !!ev.is_outreach_eligible,
      isRegistrationRequired: !!ev.is_registration_required,
      status: ev.status,
      requirements: ev.requirements || '',
      canAddToOutreachPlan: canAddToOutreachPlan,
      campus: campus || null
    };
  }

  // registerForEvent
  registerForEvent(eventId, registrationType, firstName, lastName, fullName, email, phone, numAttendees) {
    var events = this._getFromStorage('events');
    var regs = this._getFromStorage('event_registrations');

    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return {
        success: false,
        message: 'Event not found.',
        registration: null
      };
    }
    if (ev.status !== 'scheduled') {
      return {
        success: false,
        message: 'This event is not open for registration.',
        registration: null
      };
    }

    var regType = registrationType;
    if (!regType) {
      if (ev.category === 'neighborhood_cleanups' || !ev.is_registration_required) {
        regType = 'rsvp';
      } else {
        regType = 'registration';
      }
    }

    var resolvedFullName = fullName;
    if (!resolvedFullName && firstName && lastName) {
      resolvedFullName = firstName + ' ' + lastName;
    }

    var reg = {
      id: this._generateId('evreg'),
      event_id: eventId,
      registration_type: regType,
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: resolvedFullName || null,
      email: email,
      phone: phone || null,
      num_attendees: typeof numAttendees === 'number' ? numAttendees : 1,
      created_at: this._nowIso()
    };

    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      message: 'Your response has been recorded.',
      registration: {
        registrationId: reg.id,
        eventId: reg.event_id,
        registrationType: reg.registration_type,
        firstName: reg.first_name,
        lastName: reg.last_name,
        fullName: reg.full_name,
        email: reg.email,
        phone: reg.phone,
        numAttendees: reg.num_attendees,
        createdAt: reg.created_at,
        event: ev
      }
    };
  }

  // addEventToOutreachPlan
  addEventToOutreachPlan(eventId, note) {
    var plan = this._getOrCreateOutreachPlan();
    var items = this._getFromStorage('outreach_plan_items');
    var events = this._getFromStorage('events');
    var campuses = this._getFromStorage('campuses');

    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }

    var campus = null;
    if (ev) {
      for (var c = 0; c < campuses.length; c++) {
        if (campuses[c].id === ev.campus_id) {
          campus = campuses[c];
          break;
        }
      }
    }

    var item = {
      id: this._generateId('opitem'),
      outreach_plan_id: plan.id,
      event_id: eventId,
      note: note || '',
      added_at: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('outreach_plan_items', items);

    return {
      success: true,
      message: 'Event added to your outreach plan.',
      outreachPlan: {
        outreachPlanId: plan.id,
        title: plan.title,
        notes: plan.notes
      },
      planItem: {
        outreachPlanItemId: item.id,
        eventId: item.event_id,
        eventTitle: ev ? ev.title : '',
        eventStartDatetime: ev ? ev.start_datetime : null,
        eventEndDatetime: ev ? ev.end_datetime : null,
        campusName: campus ? campus.name : '',
        note: item.note,
        addedAt: item.added_at,
        event: ev || null,
        outreachPlan: plan
      }
    };
  }

  // getMyOutreachPlan
  getMyOutreachPlan() {
    var plan = this._getOrCreateOutreachPlan();
    var items = this._getFromStorage('outreach_plan_items');
    var events = this._getFromStorage('events');
    var campuses = this._getFromStorage('campuses');

    var planItems = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.outreach_plan_id !== plan.id) continue;

      var ev = null;
      for (var e = 0; e < events.length; e++) {
        if (events[e].id === item.event_id) {
          ev = events[e];
          break;
        }
      }

      var campus = null;
      if (ev) {
        for (var c = 0; c < campuses.length; c++) {
          if (campuses[c].id === ev.campus_id) {
            campus = campuses[c];
            break;
          }
        }
      }

      planItems.push({
        outreachPlanItemId: item.id,
        eventId: item.event_id,
        eventTitle: ev ? ev.title : '',
        eventStartDatetime: ev ? ev.start_datetime : null,
        eventEndDatetime: ev ? ev.end_datetime : null,
        dayOfWeek: ev ? ev.day_of_week : null,
        timeOfDay: ev ? ev.time_of_day : null,
        campusId: ev ? ev.campus_id : null,
        campusName: campus ? campus.name : '',
        categoryKey: ev ? ev.category : null,
        categoryLabel: ev ? this._humanizeEnum(ev.category) : '',
        activityLevelLabel: ev ? this._humanizeEnum(ev.activity_level) : '',
        note: item.note,
        addedAt: item.added_at,
        event: ev || null,
        campus: campus || null
      });
    }

    planItems.sort(function (a, b) {
      var da = a.eventStartDatetime ? new Date(a.eventStartDatetime).getTime() : Number.POSITIVE_INFINITY;
      var db = b.eventStartDatetime ? new Date(b.eventStartDatetime).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_outreachPlanViewed', 'true');
    } catch (e) {}

    return {
      outreachPlan: {
        outreachPlanId: plan.id,
        title: plan.title,
        notes: plan.notes,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      },
      items: planItems
    };
  }

  // updateOutreachPlanItemNote
  updateOutreachPlanItemNote(outreachPlanItemId, note) {
    var items = this._getFromStorage('outreach_plan_items');
    var updatedItem = null;
    var updatedAt = this._nowIso();

    for (var i = 0; i < items.length; i++) {
      if (items[i].id === outreachPlanItemId) {
        items[i].note = note;
        items[i].updated_at = updatedAt;
        updatedItem = items[i];
        break;
      }
    }

    if (!updatedItem) {
      return {
        success: false,
        message: 'Outreach plan item not found.',
        planItem: null
      };
    }

    this._saveToStorage('outreach_plan_items', items);

    return {
      success: true,
      message: 'Outreach plan item updated.',
      planItem: {
        outreachPlanItemId: updatedItem.id,
        note: updatedItem.note,
        updatedAt: updatedAt
      }
    };
  }

  // removeOutreachPlanItem
  removeOutreachPlanItem(outreachPlanItemId) {
    var items = this._getFromStorage('outreach_plan_items');
    var originalLength = items.length;
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id !== outreachPlanItemId) {
        filtered.push(items[i]);
      }
    }
    this._saveToStorage('outreach_plan_items', filtered);

    if (filtered.length === originalLength) {
      return {
        success: false,
        message: 'Outreach plan item not found.'
      };
    }

    return {
      success: true,
      message: 'Outreach plan item removed.'
    };
  }

  // getGivingFormOptions
  getGivingFormOptions() {
    var funds = this._getFromStorage('funds');
    var fundOptions = [];
    for (var i = 0; i < funds.length; i++) {
      fundOptions.push({
        fundId: funds[i].id,
        name: funds[i].name,
        description: funds[i].description || '',
        isActive: !!funds[i].is_active,
        displayOrder: typeof funds[i].display_order === 'number' ? funds[i].display_order : null
      });
    }
    fundOptions.sort(function (a, b) {
      var ao = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
      var bo = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
      return ao - bo;
    });

    return {
      frequencies: [
        { key: 'one_time', label: 'One-time gift' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'quarterly', label: 'Quarterly' },
        { key: 'annually', label: 'Annually' }
      ],
      funds: fundOptions,
      allocationModes: [
        { key: 'single_fund', label: 'Single fund' },
        { key: 'custom_allocation', label: 'Custom allocation' }
      ],
      paymentMethods: [
        { key: 'credit_debit_card', label: 'Credit/Debit card' },
        { key: 'ach_bank', label: 'Bank transfer (ACH)' },
        { key: 'paypal', label: 'PayPal' }
      ],
      defaultFrequencyKey: 'one_time'
    };
  }

  // submitDonation
  submitDonation(frequency, allocations, paymentMethod, donorFirstName, donorLastName, donorEmail, donorAddressLine1, donorAddressLine2, donorCity, donorState, donorPostalCode, cardNumber, cardExpiration, cardCvv, cardPostalCode) {
    if (!frequency) {
      return { success: false, message: 'Frequency is required.', donation: null, allocationSummaries: [] };
    }
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return { success: false, message: 'At least one fund allocation is required.', donation: null, allocationSummaries: [] };
    }
    if (!paymentMethod) {
      return { success: false, message: 'Payment method is required.', donation: null, allocationSummaries: [] };
    }

    var totalAmount = 0;
    for (var i = 0; i < allocations.length; i++) {
      var amt = allocations[i].amount;
      if (typeof amt !== 'number' || amt <= 0) {
        return { success: false, message: 'Each allocation must have a positive amount.', donation: null, allocationSummaries: [] };
      }
      totalAmount += amt;
    }
    if (totalAmount <= 0) {
      return { success: false, message: 'Total amount must be greater than zero.', donation: null, allocationSummaries: [] };
    }

    var donations = this._getFromStorage('donations');
    var donationAllocations = this._getFromStorage('donation_allocations');

    var donation = {
      id: this._generateId('don'),
      frequency: frequency,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      donor_first_name: donorFirstName,
      donor_last_name: donorLastName,
      donor_email: donorEmail,
      donor_address_line1: donorAddressLine1 || null,
      donor_address_line2: donorAddressLine2 || null,
      donor_city: donorCity || null,
      donor_state: donorState || null,
      donor_postal_code: donorPostalCode || null,
      card_number: paymentMethod === 'credit_debit_card' ? (cardNumber || null) : null,
      card_expiration: paymentMethod === 'credit_debit_card' ? (cardExpiration || null) : null,
      card_cvv: paymentMethod === 'credit_debit_card' ? (cardCvv || null) : null,
      card_postal_code: paymentMethod === 'credit_debit_card' ? (cardPostalCode || null) : null,
      transaction_status: 'pending',
      confirmation_number: null,
      created_at: this._nowIso()
    };

    donation = this._processDonationPayment(donation);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    for (var j = 0; j < allocations.length; j++) {
      var alloc = allocations[j];
      donationAllocations.push({
        id: this._generateId('donalloc'),
        donation_id: donation.id,
        fund_id: alloc.fundId,
        amount: alloc.amount
      });
    }
    this._saveToStorage('donation_allocations', donationAllocations);

    var funds = this._getFromStorage('funds');
    var allocationSummaries = [];
    for (var k = 0; k < allocations.length; k++) {
      var a = allocations[k];
      var fundName = '';
      for (var f = 0; f < funds.length; f++) {
        if (funds[f].id === a.fundId) {
          fundName = funds[f].name;
          break;
        }
      }
      allocationSummaries.push({
        fundId: a.fundId,
        fundName: fundName,
        amount: a.amount
      });
    }

    var success = donation.transaction_status === 'succeeded';

    return {
      success: success,
      message: success ? 'Thank you for your generosity.' : 'We were unable to process your payment.',
      donation: {
        donationId: donation.id,
        frequency: donation.frequency,
        totalAmount: donation.total_amount,
        transactionStatus: donation.transaction_status,
        confirmationNumber: donation.confirmation_number,
        createdAt: donation.created_at
      },
      allocationSummaries: allocationSummaries
    };
  }

  // getFoodResourceFilterOptions
  getFoodResourceFilterOptions() {
    return {
      categories: [
        { key: 'food_pantry', label: 'Food pantry' },
        { key: 'meal_program', label: 'Meal program' },
        { key: 'community_fridge', label: 'Community fridge' },
        { key: 'other', label: 'Other' }
      ],
      dayOfWeekOptions: [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
      ],
      timeOfDayOptions: [
        { key: 'morning', label: 'Morning' },
        { key: 'afternoon', label: 'Afternoon' },
        { key: 'afternoon_after_1500', label: 'Afternoon (after 3:00 PM)' },
        { key: 'evening', label: 'Evening' }
      ],
      serviceTags: [
        { key: 'fresh_produce', label: 'Fresh produce' },
        { key: 'canned_goods', label: 'Canned goods' },
        { key: 'dry_goods', label: 'Dry goods' },
        { key: 'hot_meals', label: 'Hot meals' }
      ]
    };
  }

  // searchFoodResources
  searchFoodResources(categoryKey, dayOfWeek, timeOfDayKey, serviceTags) {
    var resources = this._getFromStorage('food_resources');
    var schedules = this._getFromStorage('food_resource_schedules');

    var tagSet = null;
    if (Array.isArray(serviceTags) && serviceTags.length > 0) {
      tagSet = {};
      for (var t = 0; t < serviceTags.length; t++) {
        tagSet[serviceTags[t]] = true;
      }
    }

    var results = [];

    for (var i = 0; i < resources.length; i++) {
      var res = resources[i];
      if (!res.is_active) continue;
      if (categoryKey && res.category !== categoryKey) continue;

      if (tagSet) {
        var resTags = Array.isArray(res.services_offered) ? res.services_offered : [];
        var hasAll = true;
        for (var tag in tagSet) {
          if (tagSet.hasOwnProperty(tag)) {
            if (resTags.indexOf(tag) === -1) {
              hasAll = false;
              break;
            }
          }
        }
        if (!hasAll) continue;
      }

      // Filter by day/time using schedules
      var resSchedules = [];
      for (var s = 0; s < schedules.length; s++) {
        if (schedules[s].food_resource_id === res.id) {
          resSchedules.push(schedules[s]);
        }
      }

      if (dayOfWeek || timeOfDayKey) {
        var matchesSchedule = false;
        for (var rs = 0; rs < resSchedules.length; rs++) {
          var sched = resSchedules[rs];
          if (dayOfWeek && sched.day_of_week !== dayOfWeek) continue;

          if (timeOfDayKey) {
            var open = sched.open_time;
            var close = sched.close_time;
            if (!open || !close) continue;

            if (timeOfDayKey === 'afternoon_after_1500') {
              if (!(open <= '15:00' && close >= '15:00')) continue;
            } else if (timeOfDayKey === 'morning') {
              if (!(open < '12:00')) continue;
            } else if (timeOfDayKey === 'afternoon') {
              if (!(open < '18:00' && close > '12:00')) continue;
            } else if (timeOfDayKey === 'evening') {
              if (!(close >= '18:00')) continue;
            }
          }

          matchesSchedule = true;
          break;
        }
        if (!matchesSchedule) continue;
      }

      // Build nextOpenDescription
      var chosenSched = null;
      if (dayOfWeek) {
        for (var cs = 0; cs < resSchedules.length; cs++) {
          if (resSchedules[cs].day_of_week === dayOfWeek) {
            chosenSched = resSchedules[cs];
            break;
          }
        }
      }
      if (!chosenSched && resSchedules.length > 0) {
        chosenSched = resSchedules[0];
      }

      var nextOpenDescription = '';
      if (chosenSched) {
        var label = this._humanizeEnum(chosenSched.day_of_week);
        var openTime = chosenSched.open_time || '';
        var closeTime = chosenSched.close_time || '';
        nextOpenDescription = 'Open ' + label + (openTime ? ' ' + openTime : '') + (closeTime ? ' – ' + closeTime : '');
      }

      var serviceTagLabels = [];
      var resServiceTags = Array.isArray(res.services_offered) ? res.services_offered : [];
      for (var st = 0; st < resServiceTags.length; st++) {
        serviceTagLabels.push(this._humanizeEnum(resServiceTags[st]));
      }

      results.push({
        foodResourceId: res.id,
        name: res.name,
        categoryKey: res.category,
        categoryLabel: this._humanizeEnum(res.category),
        addressLine1: res.address_line1,
        city: res.city,
        state: res.state,
        postalCode: res.postal_code,
        phone: res.phone || '',
        serviceTags: serviceTagLabels,
        nextOpenDescription: nextOpenDescription
      });
    }

    results.sort(function (a, b) {
      var na = (a.name || '').toLowerCase();
      var nb = (b.name || '').toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });

    return results;
  }

  // getFoodResourceDetail
  getFoodResourceDetail(foodResourceId) {
    var resources = this._getFromStorage('food_resources');
    var schedules = this._getFromStorage('food_resource_schedules');

    var res = null;
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].id === foodResourceId) {
        res = resources[i];
        break;
      }
    }
    if (!res) return null;

    var hoursByDay = [];
    for (var s = 0; s < schedules.length; s++) {
      if (schedules[s].food_resource_id === res.id) {
        hoursByDay.push({
          dayOfWeek: schedules[s].day_of_week,
          openTime: schedules[s].open_time || '',
          closeTime: schedules[s].close_time || ''
        });
      }
    }

    hoursByDay.sort(function (a, b) {
      return (BusinessLogic.prototype._dayOfWeekOrder.call({ _dayOfWeekOrder: BusinessLogic.prototype._dayOfWeekOrder }, a.dayOfWeek) -
        BusinessLogic.prototype._dayOfWeekOrder.call({ _dayOfWeekOrder: BusinessLogic.prototype._dayOfWeekOrder }, b.dayOfWeek));
    });

    var servicesOffered = [];
    var resServiceTags = Array.isArray(res.services_offered) ? res.services_offered : [];
    for (var st = 0; st < resServiceTags.length; st++) {
      servicesOffered.push(this._humanizeEnum(resServiceTags[st]));
    }

    return {
      foodResourceId: res.id,
      name: res.name,
      description: res.description || '',
      categoryKey: res.category,
      categoryLabel: this._humanizeEnum(res.category),
      addressLine1: res.address_line1,
      addressLine2: res.address_line2 || '',
      city: res.city,
      state: res.state,
      postalCode: res.postal_code,
      phone: res.phone || '',
      websiteUrl: res.website_url || '',
      mapUrl: res.map_url || '',
      servicesOffered: servicesOffered,
      notes: res.notes || '',
      hoursByDay: hoursByDay
    };
  }

  // getPrayerRequestFormOptions
  getPrayerRequestFormOptions() {
    return {
      categories: [
        { key: 'family_relationships', label: 'Family & Relationships' },
        { key: 'health', label: 'Health' },
        { key: 'finances', label: 'Finances' },
        { key: 'spiritual_growth', label: 'Spiritual growth' },
        { key: 'work_career', label: 'Work & Career' },
        { key: 'grief_loss', label: 'Grief & Loss' },
        { key: 'other', label: 'Other' }
      ],
      privacyOptions: [
        { key: 'public', label: 'Share publicly', description: 'Visible to the church community.' },
        { key: 'church_only', label: 'Share with church only', description: 'Visible to members only.' },
        { key: 'pastoral_team_only', label: 'Share with pastoral team only', description: 'Visible only to pastors and care staff.' }
      ],
      suggestedFocusDate: this._getNextUpcomingSunday()
    };
  }

  // submitPrayerRequest
  submitPrayerRequest(categoryKey, privacyKey, focusDate, message, name, email) {
    if (!categoryKey || !privacyKey || !focusDate || !message) {
      return {
        success: false,
        message: 'Category, privacy, focus date, and message are required.',
        prayerRequest: null
      };
    }

    var requests = this._getFromStorage('prayer_requests');
    var pr = {
      id: this._generateId('prayer'),
      category: categoryKey,
      privacy: privacyKey,
      focus_date: focusDate + 'T00:00:00',
      message: message,
      name: name || null,
      email: email || null,
      created_at: this._nowIso()
    };

    requests.push(pr);
    this._saveToStorage('prayer_requests', requests);

    return {
      success: true,
      message: 'Your prayer request has been submitted.',
      prayerRequest: {
        prayerRequestId: pr.id,
        categoryKey: pr.category,
        categoryLabel: this._humanizeEnum(pr.category),
        privacyKey: pr.privacy,
        privacyLabel: this._humanizeEnum(pr.privacy),
        focusDate: focusDate,
        createdAt: pr.created_at
      }
    };
  }

  // getContactFormOptions
  getContactFormOptions() {
    return {
      subjects: [
        { key: 'question_about_food_pantry', label: 'Question about food pantry', description: 'Questions about locations, hours, and eligibility.' },
        { key: 'general_question', label: 'General question', description: 'Anything else you would like to ask.' },
        { key: 'volunteer_opportunities', label: 'Volunteer opportunities', description: 'Serving opportunities and teams.' },
        { key: 'events', label: 'Events', description: 'Event details, registration, and schedules.' },
        { key: 'giving', label: 'Giving', description: 'Questions about donations and receipts.' },
        { key: 'prayer_request', label: 'Prayer & Care', description: 'Care, counseling, and prayer support.' },
        { key: 'technical_issue', label: 'Technical issue', description: 'Problems with the website or online forms.' },
        { key: 'other', label: 'Other', description: 'Anything not covered above.' }
      ],
      alternativeContactInfo: {
        phone: '',
        email: '',
        mailingAddress: ''
      }
    };
  }

  // submitContactMessage
  submitContactMessage(subjectKey, message, name, email) {
    if (!subjectKey || !message || !email) {
      return {
        success: false,
        message: 'Subject, message, and email are required.',
        contactMessage: null
      };
    }

    var messages = this._getFromStorage('contact_messages');
    var cm = {
      id: this._generateId('contact'),
      subject: subjectKey,
      message: message,
      name: name || null,
      email: email,
      created_at: this._nowIso()
    };

    messages.push(cm);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been sent.',
      contactMessage: {
        contactMessageId: cm.id,
        subjectKey: cm.subject,
        subjectLabel: this._humanizeEnum(cm.subject),
        createdAt: cm.created_at
      }
    };
  }

  // getDevotionalSignupOptions
  getDevotionalSignupOptions() {
    return {
      emailFrequencies: [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' }
      ],
      ageGroups: [
        { key: 'age_0_12', label: 'Ages 0–12' },
        { key: 'age_13_17', label: 'Ages 13–17' },
        { key: 'age_18_35', label: 'Ages 18–35' },
        { key: 'age_36_55', label: 'Ages 36–55' },
        { key: 'age_56_plus', label: 'Ages 56+' }
      ],
      topics: [
        { key: 'community_service', label: 'Community service', description: 'Stories and reflections on serving others.' },
        { key: 'spiritual_growth', label: 'Spiritual growth', description: 'Devotions to help you grow in faith.' },
        { key: 'scripture_reading', label: 'Scripture reading', description: 'Daily Bible readings and reflections.' },
        { key: 'worship', label: 'Worship & praise', description: 'Worship-focused devotionals.' },
        { key: 'family', label: 'Family & relationships', description: 'Encouragement for families and relationships.' }
      ],
      defaultEmailFrequencyKey: 'weekly'
    };
  }

  // submitDevotionalSubscription
  submitDevotionalSubscription(emailFrequencyKey, ageGroupKey, topicKeys, subscriberName, email, textOnly) {
    if (!emailFrequencyKey || !ageGroupKey || !Array.isArray(topicKeys) || topicKeys.length === 0 || !email) {
      return {
        success: false,
        message: 'Frequency, age group, at least one topic, and email are required.',
        subscription: null
      };
    }

    var subs = this._getFromStorage('devotional_subscriptions');
    var sub = {
      id: this._generateId('devo'),
      email_frequency: emailFrequencyKey,
      age_group: ageGroupKey,
      topics: topicKeys,
      subscriber_name: subscriberName || null,
      email: email,
      text_only: !!textOnly,
      created_at: this._nowIso()
    };

    subs.push(sub);
    this._saveToStorage('devotional_subscriptions', subs);

    return {
      success: true,
      message: 'You have been subscribed to email devotionals.',
      subscription: {
        devotionalSubscriptionId: sub.id,
        emailFrequencyKey: sub.email_frequency,
        ageGroupKey: sub.age_group,
        topicKeys: sub.topics,
        createdAt: sub.created_at
      }
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    var campusesData = this._getFromStorage('campuses');
    var campuses = [];
    for (var i = 0; i < campusesData.length; i++) {
      campuses.push({
        campusId: campusesData[i].id,
        name: campusesData[i].name,
        addressLine1: campusesData[i].address_line1 || '',
        city: campusesData[i].city || '',
        state: campusesData[i].state || '',
        postalCode: campusesData[i].postal_code || '',
        description: campusesData[i].description || ''
      });
    }

    return {
      mission: 'To share the love and hope of Jesus with our neighbors through practical service and compassionate community.',
      vision: 'Every neighborhood in our city experiencing the tangible love of Christ through the local church.',
      coreValues: [
        {
          title: 'Compassion',
          description: 'We move toward people with the heart of Jesus, especially in times of need.'
        },
        {
          title: 'Presence',
          description: 'We show up consistently in our neighborhoods, building long-term relationships.'
        },
        {
          title: 'Partnership',
          description: 'We partner with local organizations, schools, and community leaders to serve well.'
        },
        {
          title: 'Empowerment',
          description: 'We seek to restore dignity and empower individuals and families to thrive.'
        }
      ],
      keyOutreachPrograms: [
        {
          programId: 'prog_food_pantries',
          slug: 'food_pantries',
          title: 'Food Pantries & Meal Support',
          description: 'Weekly food pantries and meals providing fresh produce and groceries to neighbors.'
        },
        {
          programId: 'prog_neighborhood_cleanups',
          slug: 'neighborhood_cleanups',
          title: 'Neighborhood Cleanups',
          description: 'Monthly cleanups to bless our city streets, parks, and shared spaces.'
        },
        {
          programId: 'prog_workshops_classes',
          slug: 'workshops_classes',
          title: 'Workshops & Classes',
          description: 'Practical classes on finances, parenting, job readiness, and more.'
        }
      ],
      campuses: campuses
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