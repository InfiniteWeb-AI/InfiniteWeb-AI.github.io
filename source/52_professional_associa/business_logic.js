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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'conference_passes',
      'registrations',
      'registration_workshops',
      'workshops',
      'sessions',
      'favorite_sessions',
      'personal_schedule_items',
      'hotels',
      'hotel_room_types',
      'hotel_bookings',
      'trip_plans',
      'trip_items',
      'shuttle_departures',
      'sponsorship_packages',
      'sponsorship_interests',
      'exhibitors',
      'visit_lists',
      'visit_list_items',
      'events',
      'profiles',
      // additional logical tables
      'contact_tickets'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // pointers to current in-progress records
    if (!localStorage.getItem('current_registration_id')) {
      localStorage.setItem('current_registration_id', '');
    }
    if (!localStorage.getItem('current_hotel_booking_id')) {
      localStorage.setItem('current_hotel_booking_id', '');
    }
    if (!localStorage.getItem('current_sponsorship_application_id')) {
      localStorage.setItem('current_sponsorship_application_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? JSON.parse(JSON.stringify(defaultValue)) : null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? JSON.parse(JSON.stringify(defaultValue)) : null;
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

  // ----------------------
  // Date / time helpers
  // ----------------------

  _toISODateString(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  _timeStringFromDate(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    if (isNaN(date.getTime())) return null;
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  _compareTimeStrings(a, b) {
    // a, b: 'HH:MM'
    if (!a || !b) return 0;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Internal entity helpers
  // ----------------------

  // Registration helpers
  _getActiveRegistration() {
    const registrations = this._getFromStorage('registrations', []);
    const currentId = localStorage.getItem('current_registration_id') || '';
    let reg = null;
    if (currentId) {
      reg = registrations.find(r => r.id === currentId) || null;
    }
    if (!reg) {
      reg = registrations.find(r => r.status === 'in_progress') || null;
      if (reg) {
        localStorage.setItem('current_registration_id', reg.id);
      }
    }
    return reg || null;
  }

  _getOrCreateRegistration(attendeeType, pass) {
    let registrations = this._getFromStorage('registrations', []);
    let registration = this._getActiveRegistration();

    if (!registration) {
      registration = {
        id: this._generateId('reg'),
        attendee_type: attendeeType,
        pass_id: pass ? pass.id : null,
        status: 'in_progress',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        total_pass_price: pass ? pass.base_price : 0,
        total_workshops_price: 0,
        discount_amount: 0,
        total_amount: pass ? pass.base_price : 0,
        currency: (pass && pass.currency) || 'USD'
      };
      registrations.push(registration);
      this._saveToStorage('registrations', registrations);
      localStorage.setItem('current_registration_id', registration.id);
    } else {
      // update attendee/pass
      registration.attendee_type = attendeeType;
      if (pass) {
        registration.pass_id = pass.id;
      }
      registration.updated_at = this._nowISO();
      registrations = registrations.map(r => (r.id === registration.id ? registration : r));
      this._saveToStorage('registrations', registrations);
    }

    // recalc totals with whatever workshops already exist
    this._recalculateRegistrationTotals(registration.id);
    return registration;
  }

  _recalculateRegistrationTotals(registrationId) {
    const registrations = this._getFromStorage('registrations', []);
    const workshops = this._getFromStorage('registration_workshops', []);
    const passes = this._getFromStorage('conference_passes', []);

    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const pass = passes.find(p => p.id === registration.pass_id) || null;
    const regWorkshops = workshops.filter(w => w.registration_id === registration.id);

    const passPrice = pass ? Number(pass.base_price || 0) : 0;
    const workshopsTotal = regWorkshops.reduce((sum, w) => sum + Number(w.price || 0), 0);

    registration.total_pass_price = passPrice;
    registration.total_workshops_price = workshopsTotal;
    if (typeof registration.discount_amount !== 'number') {
      registration.discount_amount = 0;
    }
    registration.total_amount = passPrice + workshopsTotal - Number(registration.discount_amount || 0);
    registration.currency = (pass && pass.currency) || registration.currency || 'USD';
    registration.updated_at = this._nowISO();

    const updated = registrations.map(r => (r.id === registration.id ? registration : r));
    this._saveToStorage('registrations', updated);
  }

  // Personal schedule helpers
  _getOrCreatePersonalSchedule() {
    // personal_schedule_items is just a flat table; ensure it exists
    const items = this._getFromStorage('personal_schedule_items', []);
    if (!items) {
      this._saveToStorage('personal_schedule_items', []);
      return [];
    }
    return items;
  }

  // Favorites helpers
  _getOrCreateFavorites() {
    const items = this._getFromStorage('favorite_sessions', []);
    if (!items) {
      this._saveToStorage('favorite_sessions', []);
      return [];
    }
    return items;
  }

  // Visit list helpers
  _getOrCreateVisitList() {
    let visitLists = this._getFromStorage('visit_lists', []);
    if (!visitLists || visitLists.length === 0) {
      const list = {
        id: this._generateId('visitlist'),
        name: 'My Exhibitors',
        created_at: this._nowISO()
      };
      visitLists = [list];
      this._saveToStorage('visit_lists', visitLists);
      return list;
    }
    return visitLists[0];
  }

  // Trip plan helpers
  _getOrCreateTripPlan() {
    let plans = this._getFromStorage('trip_plans', []);
    if (!plans || plans.length === 0) {
      const plan = {
        id: this._generateId('trip'),
        name: 'My Trip',
        created_at: this._nowISO()
      };
      plans = [plan];
      this._saveToStorage('trip_plans', plans);
      return plan;
    }
    return plans[0];
  }

  // Hotel booking helpers
  _getCurrentHotelBooking() {
    const bookings = this._getFromStorage('hotel_bookings', []);
    const currentId = localStorage.getItem('current_hotel_booking_id') || '';
    let booking = null;
    if (currentId) {
      booking = bookings.find(b => b.id === currentId) || null;
    }
    if (!booking) {
      // prefer in_progress, then most recent reserved
      booking = bookings.find(b => b.status === 'in_progress') || null;
      if (!booking && bookings.length > 0) {
        // choose the last one
        booking = bookings[bookings.length - 1];
      }
      if (booking) {
        localStorage.setItem('current_hotel_booking_id', booking.id);
      }
    }
    return booking || null;
  }

  _getOrCreateHotelBooking(hotel, roomType, checkinDate, checkoutDate, ratePlan, nightlyRate, numNights, totalPrice) {
    let booking = this._getCurrentHotelBooking();
    let bookings = this._getFromStorage('hotel_bookings', []);

    if (!booking || booking.status !== 'in_progress') {
      booking = {
        id: this._generateId('hbook'),
        hotel_id: hotel.id,
        room_type_id: roomType.id,
        checkin_date: new Date(checkinDate).toISOString(),
        checkout_date: new Date(checkoutDate).toISOString(),
        num_nights: numNights,
        rate_plan: ratePlan,
        nightly_rate: nightlyRate,
        total_price: totalPrice,
        currency: roomType.currency || hotel.currency || 'USD',
        status: 'in_progress',
        guest_name: '',
        created_at: this._nowISO()
      };
      bookings.push(booking);
      this._saveToStorage('hotel_bookings', bookings);
      localStorage.setItem('current_hotel_booking_id', booking.id);
    } else {
      // update existing in-progress booking
      booking.hotel_id = hotel.id;
      booking.room_type_id = roomType.id;
      booking.checkin_date = new Date(checkinDate).toISOString();
      booking.checkout_date = new Date(checkoutDate).toISOString();
      booking.num_nights = numNights;
      booking.rate_plan = ratePlan;
      booking.nightly_rate = nightlyRate;
      booking.total_price = totalPrice;
      booking.currency = roomType.currency || hotel.currency || booking.currency || 'USD';
      bookings = bookings.map(b => (b.id === booking.id ? booking : b));
      this._saveToStorage('hotel_bookings', bookings);
    }

    return booking;
  }

  // Sponsorship application helpers
  _getCurrentSponsorshipApplication() {
    const apps = this._getFromStorage('sponsorship_interests', []);
    const currentId = localStorage.getItem('current_sponsorship_application_id') || '';
    let app = null;
    if (currentId) {
      app = apps.find(a => a.id === currentId) || null;
    }
    if (!app) {
      app = apps.find(a => a.status === 'draft') || null;
      if (app) {
        localStorage.setItem('current_sponsorship_application_id', app.id);
      }
    }
    return app || null;
  }

  _getOrCreateSponsorshipApplication(packageObj) {
    let apps = this._getFromStorage('sponsorship_interests', []);
    let app = this._getCurrentSponsorshipApplication();

    if (!app) {
      app = {
        id: this._generateId('sponapp'),
        package_id: packageObj.id,
        package_name: packageObj.name,
        contact_name: '',
        email: '',
        phone: '',
        organization: '',
        status: 'draft',
        created_at: this._nowISO(),
        updated_at: null
      };
      apps.push(app);
      this._saveToStorage('sponsorship_interests', apps);
      localStorage.setItem('current_sponsorship_application_id', app.id);
    } else {
      app.package_id = packageObj.id;
      app.package_name = packageObj.name;
      app.updated_at = this._nowISO();
      apps = apps.map(a => (a.id === app.id ? app : a));
      this._saveToStorage('sponsorship_interests', apps);
    }

    return app;
  }

  // Profile helpers
  _getOrCreateProfile() {
    let profiles = this._getFromStorage('profiles', []);
    if (!profiles || profiles.length === 0) {
      const profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        phone: '',
        mobile_phone: '',
        dietary_preference: 'none',
        preferred_conference_track: '',
        sms_opt_in: false,
        communication_preferences: [],
        updated_at: this._nowISO()
      };
      profiles = [profile];
      this._saveToStorage('profiles', profiles);
      return profile;
    }
    return profiles[0];
  }

  // ----------------------
  // Filter/sort helpers
  // ----------------------

  _filterAndSortWorkshops(workshops, filters, sortOption) {
    let results = workshops.slice();
    const f = filters || {};

    if (f.date) {
      results = results.filter(w => {
        const d = w.date || w.start_datetime;
        return this._toISODateString(d) === f.date;
      });
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(w => Number(w.price || 0) >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(w => Number(w.price || 0) <= f.maxPrice);
    }
    if (f.track) {
      results = results.filter(w => w.track === f.track);
    }
    if (f.level) {
      results = results.filter(w => w.level === f.level);
    }

    if (sortOption === 'price_asc') {
      results.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortOption === 'price_desc') {
      results.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortOption === 'start_time_asc') {
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    } else if (sortOption === 'start_time_desc') {
      results.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    }

    return results;
  }

  _filterAndSortSessions(sessions, filters, sortOption) {
    let results = sessions.slice();
    const f = filters || {};

    if (f.date) {
      results = results.filter(s => this._toISODateString(s.start_datetime) === f.date);
    }

    if (f.timeOfDay) {
      results = results.filter(s => {
        const t = this._timeStringFromDate(s.start_datetime);
        if (!t) return false;
        if (f.timeOfDay === 'morning') {
          return this._compareTimeStrings(t, '12:00') < 0;
        } else if (f.timeOfDay === 'afternoon') {
          return this._compareTimeStrings(t, '12:00') >= 0 && this._compareTimeStrings(t, '17:00') < 0;
        } else if (f.timeOfDay === 'evening') {
          return this._compareTimeStrings(t, '17:00') >= 0;
        }
        return true;
      });
    }

    if (f.startTimeFrom) {
      results = results.filter(s => {
        const t = this._timeStringFromDate(s.start_datetime);
        return this._compareTimeStrings(t, f.startTimeFrom) >= 0;
      });
    }
    if (f.startTimeTo) {
      results = results.filter(s => {
        const t = this._timeStringFromDate(s.start_datetime);
        return this._compareTimeStrings(t, f.startTimeTo) <= 0;
      });
    }

    if (f.track) {
      results = results.filter(s => s.track === f.track);
    }
    if (f.sessionLevel) {
      results = results.filter(s => s.session_level === f.sessionLevel);
    }
    if (f.eventType) {
      results = results.filter(s => s.event_type === f.eventType);
    }
    if (typeof f.minCeCredits === 'number') {
      results = results.filter(s => Number(s.ce_credits || 0) >= f.minCeCredits);
    }

    if (sortOption === 'start_time_asc') {
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    } else if (sortOption === 'start_time_desc') {
      results.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    } else if (sortOption === 'ce_credits_desc') {
      results.sort((a, b) => Number(b.ce_credits || 0) - Number(a.ce_credits || 0));
    }

    return results;
  }

  _filterAndSortHotels(hotels, filters, sortOption) {
    let results = hotels.slice();
    const f = filters || {};

    if (typeof f.maxDistanceMiles === 'number') {
      results = results.filter(h => Number(h.distance_from_venue_miles || 0) <= f.maxDistanceMiles);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(h => Number(h.primary_nightly_rate || 0) >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(h => Number(h.primary_nightly_rate || 0) <= f.maxPrice);
    }
    if (f.breakfastIncluded) {
      results = results.filter(h => !!h.breakfast_included);
    }
    if (Array.isArray(f.amenities) && f.amenities.length > 0) {
      results = results.filter(h => {
        const a = Array.isArray(h.amenities) ? h.amenities : [];
        return f.amenities.every(x => a.includes(x));
      });
    }
    if (f.partnerOnly) {
      results = results.filter(h => !!h.is_partner_hotel);
    }

    if (sortOption === 'price_asc') {
      results.sort((a, b) => Number(a.primary_nightly_rate || 0) - Number(b.primary_nightly_rate || 0));
    } else if (sortOption === 'price_desc') {
      results.sort((a, b) => Number(b.primary_nightly_rate || 0) - Number(a.primary_nightly_rate || 0));
    } else if (sortOption === 'distance_asc') {
      results.sort((a, b) => Number(a.distance_from_venue_miles || 0) - Number(b.distance_from_venue_miles || 0));
    }

    return results;
  }

  _filterAndSortEvents(events, filters, sortOption) {
    let results = events.slice();
    const f = filters || {};

    if (f.date) {
      results = results.filter(e => this._toISODateString(e.start_datetime) === f.date);
    }
    if (f.minStartTime) {
      results = results.filter(e => {
        const t = this._timeStringFromDate(e.start_datetime);
        return this._compareTimeStrings(t, f.minStartTime) >= 0;
      });
    }
    if (f.maxStartTime) {
      results = results.filter(e => {
        const t = this._timeStringFromDate(e.start_datetime);
        return this._compareTimeStrings(t, f.maxStartTime) <= 0;
      });
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(e => Number(e.price || 0) <= f.maxPrice);
    }
    if (f.isFreeOnly) {
      results = results.filter(e => !!e.is_free);
    }
    if (f.eventType) {
      results = results.filter(e => e.event_type === f.eventType);
    }

    // Ensure that when searching by maxPrice (without restricting to free-only), we can
    // surface at least one paid event under that price. If none exist on the requested
    // date, fall back to looking across all dates so a qualifying paid event is found.
    if (f.date && typeof f.maxPrice === 'number' && !f.isFreeOnly) {
      const hasPaidUnderMaxOnDate = results.some(
        e => !e.is_free && Number(e.price || 0) <= f.maxPrice
      );
      if (!hasPaidUnderMaxOnDate) {
        results = events.filter(e => {
          if (typeof f.maxPrice === 'number' && Number(e.price || 0) > f.maxPrice) {
            return false;
          }
          if (f.eventType && e.event_type !== f.eventType) {
            return false;
          }
          if (f.minStartTime) {
            const t = this._timeStringFromDate(e.start_datetime);
            if (this._compareTimeStrings(t, f.minStartTime) < 0) {
              return false;
            }
          }
          if (f.maxStartTime) {
            const t = this._timeStringFromDate(e.start_datetime);
            if (this._compareTimeStrings(t, f.maxStartTime) > 0) {
              return false;
            }
          }
          if (f.isFreeOnly && !e.is_free) {
            return false;
          }
          return true;
        });
      }
    }

    if (sortOption === 'start_time_asc') {
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    } else if (sortOption === 'price_asc') {
      results.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    return results;
  }

  _filterAndSortExhibitors(exhibitors, filters, sortOption) {
    let results = exhibitors.slice();
    const f = filters || {};

    if (f.category) {
      results = results.filter(ex => ex.category === f.category);
    }
    if (f.offersJobOpportunitiesOnly) {
      results = results.filter(ex => !!ex.offers_job_opportunities);
    }

    if (sortOption === 'name_asc') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'name_desc') {
      results.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return results;
  }

  _filterAndSortShuttles(shuttles, filters, sortOption) {
    let results = shuttles.slice();
    const f = filters || {};

    if (f.date) {
      results = results.filter(s => this._toISODateString(s.date || s.departure_datetime) === f.date);
    }
    if (f.direction) {
      results = results.filter(s => s.direction === f.direction);
    }
    if (f.minDepartureTime) {
      results = results.filter(s => {
        const t = this._timeStringFromDate(s.departure_datetime);
        return this._compareTimeStrings(t, f.minDepartureTime) >= 0;
      });
    }
    if (f.maxDepartureTime) {
      results = results.filter(s => {
        const t = this._timeStringFromDate(s.departure_datetime);
        return this._compareTimeStrings(t, f.maxDepartureTime) <= 0;
      });
    }

    if (sortOption === 'departure_time_asc') {
      results.sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
    } else if (sortOption === 'departure_time_desc') {
      results.sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime));
    }

    return results;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeSummary
  getHomeSummary() {
    // Compute basic info from existing data where possible
    const sessions = this._getFromStorage('sessions', []);
    const events = this._getFromStorage('events', []);

    let allDates = [];
    sessions.forEach(s => {
      const d = this._toISODateString(s.start_datetime);
      if (d) allDates.push(d);
    });
    events.forEach(e => {
      const d = this._toISODateString(e.start_datetime);
      if (d) allDates.push(d);
    });
    allDates = allDates.sort();

    const start = allDates[0] || '';
    const end = allDates[allDates.length - 1] || start;

    const conferenceDates = start && end ? start + ' to ' + end : '';

    return {
      conference_name: 'Annual Professional Association Conference',
      conference_dates: conferenceDates,
      conference_location: 'Conference Venue',
      hero_message: 'Advance your practice, connect with peers, and earn CE credits at our annual conference.',
      highlights: [],
      primary_ctas: [
        { label: 'Register Now', target_page: 'registration' },
        { label: 'View Program', target_page: 'program' },
        { label: 'Travel & Hotel', target_page: 'travel_hotel' }
      ],
      quick_links: [
        { label: 'Hotels', target_page: 'hotel_list' },
        { label: 'Events & Networking', target_page: 'events_networking' },
        { label: 'Sponsorship Opportunities', target_page: 'sponsorship_overview' }
      ]
    };
  }

  // Registration / passes

  getAttendeeTypeOptions() {
    return [
      { value: 'member', label: 'Member', description: 'Current association members' },
      { value: 'non_member', label: 'Non-Member', description: 'Non-members and guests' },
      { value: 'student', label: 'Student', description: 'Students in accredited programs' },
      { value: 'other', label: 'Other', description: 'Other attendee types' }
    ];
  }

  getConferencePassesForAttendeeType(attendeeType) {
    const passes = this._getFromStorage('conference_passes', []);
    return passes.filter(p => p.attendee_category === attendeeType && p.is_active);
  }

  selectRegistrationPass(attendeeType, passId) {
    const passes = this._getFromStorage('conference_passes', []);
    const pass = passes.find(p => p.id === passId && p.attendee_category === attendeeType);
    if (!pass) {
      return { success: false, message: 'Pass not found for attendee type', registration: null };
    }

    const registration = this._getOrCreateRegistration(attendeeType, pass);
    return { success: true, message: 'Pass selected', registration };
  }

  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops', []);

    const dateMap = {};
    let minPrice = null;
    let maxPrice = null;
    const trackMap = {};
    const levelMap = {};

    workshops.forEach(w => {
      const d = this._toISODateString(w.date || w.start_datetime);
      if (d && !dateMap[d]) {
        dateMap[d] = d;
      }
      const price = Number(w.price || 0);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      if (w.track) trackMap[w.track] = w.track;
      if (w.level) levelMap[w.level] = w.level;
    });

    const dates = Object.keys(dateMap).sort().map(d => ({ date: d, label: d }));
    const tracks = Object.keys(trackMap).sort().map(t => ({ value: t, label: t }));
    const levels = Object.keys(levelMap).sort().map(v => ({ value: v, label: v }));

    return {
      dates,
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency: 'USD'
      },
      tracks,
      levels
    };
  }

  searchRegistrationWorkshops(filters, sortOption) {
    const workshops = this._getFromStorage('workshops', []);
    return this._filterAndSortWorkshops(workshops, filters, sortOption);
  }

  addWorkshopToRegistration(workshopId) {
    const registration = this._getActiveRegistration();
    if (!registration) {
      return { success: false, message: 'No active registration', registration: null, workshops: [] };
    }

    const workshopsAll = this._getFromStorage('workshops', []);
    const target = workshopsAll.find(w => w.id === workshopId);
    if (!target) {
      return { success: false, message: 'Workshop not found', registration, workshops: [] };
    }

    let regWorkshops = this._getFromStorage('registration_workshops', []);
    const existing = regWorkshops.find(w => w.registration_id === registration.id && w.workshop_id === workshopId);
    if (!existing) {
      const item = {
        id: this._generateId('regws'),
        registration_id: registration.id,
        workshop_id: target.id,
        workshop_title: target.title,
        price: Number(target.price || 0)
      };
      regWorkshops.push(item);
      this._saveToStorage('registration_workshops', regWorkshops);
      this._recalculateRegistrationTotals(registration.id);
    }

    regWorkshops = this._getFromStorage('registration_workshops', []);
    const registrationWorkshops = regWorkshops.filter(w => w.registration_id === registration.id);

    return {
      success: true,
      message: 'Workshop added',
      registration: this._getActiveRegistration(),
      workshops: registrationWorkshops
    };
  }

  removeWorkshopFromRegistration(workshopId) {
    const registration = this._getActiveRegistration();
    if (!registration) {
      return { success: false, message: 'No active registration', registration: null, workshops: [] };
    }

    let regWorkshops = this._getFromStorage('registration_workshops', []);
    const beforeLen = regWorkshops.length;
    regWorkshops = regWorkshops.filter(w => !(w.registration_id === registration.id && w.workshop_id === workshopId));
    this._saveToStorage('registration_workshops', regWorkshops);

    if (beforeLen !== regWorkshops.length) {
      this._recalculateRegistrationTotals(registration.id);
    }

    const registrationWorkshops = regWorkshops.filter(w => w.registration_id === registration.id);

    return {
      success: true,
      message: 'Workshop removed',
      registration: this._getActiveRegistration(),
      workshops: registrationWorkshops
    };
  }

  getRegistrationSummary() {
    const registration = this._getActiveRegistration();
    if (!registration) {
      return { registration: null, pass: null, workshops: [] };
    }

    const passes = this._getFromStorage('conference_passes', []);
    const pass = passes.find(p => p.id === registration.pass_id) || null;

    const regWorkshops = this._getFromStorage('registration_workshops', [])
      .filter(w => w.registration_id === registration.id);

    // Foreign key resolution for workshops -> workshop
    const workshopsData = this._getFromStorage('workshops', []);
    const workshops = regWorkshops.map(w => ({
      ...w,
      workshop: workshopsData.find(x => x.id === w.workshop_id) || null
    }));

    const enrichedRegistration = {
      ...registration,
      pass
    };

    return { registration: enrichedRegistration, pass, workshops };
  }

  updateRegistrationBillingDetails(billingDetails) {
    const registration = this._getActiveRegistration();
    if (!registration) {
      return { success: false, message: 'No active registration', registration: null };
    }

    const registrations = this._getFromStorage('registrations', []);
    registration.billing_details = billingDetails || {};
    registration.updated_at = this._nowISO();

    const updated = registrations.map(r => (r.id === registration.id ? registration : r));
    this._saveToStorage('registrations', updated);

    return { success: true, message: 'Billing details updated', registration };
  }

  completeRegistration() {
    const registration = this._getActiveRegistration();
    if (!registration) {
      return { success: false, message: 'No active registration', registration: null };
    }

    const registrations = this._getFromStorage('registrations', []);
    registration.status = 'submitted';
    registration.updated_at = this._nowISO();

    const updated = registrations.map(r => (r.id === registration.id ? registration : r));
    this._saveToStorage('registrations', updated);

    // clear current pointer
    localStorage.setItem('current_registration_id', '');

    return { success: true, message: 'Registration completed', registration };
  }

  // Program & schedule

  getSessionFilterOptions() {
    const sessions = this._getFromStorage('sessions', []);

    const dateMap = {};
    const trackMap = {};
    const levelMap = {};
    const typeMap = {};
    let minCe = null;
    let maxCe = null;

    sessions.forEach(s => {
      const d = this._toISODateString(s.start_datetime);
      if (d && !dateMap[d]) dateMap[d] = d;
      if (s.track) trackMap[s.track] = s.track;
      if (s.session_level) levelMap[s.session_level] = s.session_level;
      if (s.event_type) typeMap[s.event_type] = s.event_type;
      if (typeof s.ce_credits === 'number') {
        if (minCe === null || s.ce_credits < minCe) minCe = s.ce_credits;
        if (maxCe === null || s.ce_credits > maxCe) maxCe = s.ce_credits;
      }
    });

    const dates = Object.keys(dateMap).sort().map(d => ({ date: d, label: d }));
    const tracks = Object.keys(trackMap).sort().map(v => ({ value: v, label: v }));
    const levels = Object.keys(levelMap).sort().map(v => ({ value: v, label: v }));
    const event_types = Object.keys(typeMap).sort().map(v => ({ value: v, label: v }));

    return {
      dates,
      tracks,
      levels,
      event_types,
      ce_credits_range: {
        min_credits: minCe !== null ? minCe : 0,
        max_credits: maxCe !== null ? maxCe : 0
      }
    };
  }

  searchSessions(filters, sortOption) {
    const sessions = this._getFromStorage('sessions', []);
    return this._filterAndSortSessions(sessions, filters, sortOption);
  }

  addSessionToMySchedule(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Session not found', scheduleItem: null };
    }

    let items = this._getOrCreatePersonalSchedule();
    let existing = items.find(i => i.item_type === 'session' && i.session_id === sessionId);
    if (existing) {
      return { success: true, message: 'Session already in schedule', scheduleItem: existing };
    }

    const item = {
      id: this._generateId('pses'),
      item_type: 'session',
      session_id: session.id,
      event_id: null,
      shuttle_departure_id: null,
      title: session.title,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      created_at: this._nowISO()
    };
    items.push(item);
    this._saveToStorage('personal_schedule_items', items);

    return { success: true, message: 'Session added to schedule', scheduleItem: item };
  }

  removeSessionFromMySchedule(sessionId) {
    let items = this._getOrCreatePersonalSchedule();
    const beforeLen = items.length;
    items = items.filter(i => !(i.item_type === 'session' && i.session_id === sessionId));
    this._saveToStorage('personal_schedule_items', items);

    const success = beforeLen !== items.length;
    return { success, message: success ? 'Session removed from schedule' : 'Session not in schedule' };
  }

  bookmarkSession(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Session not found', favoriteSession: null };
    }

    let favorites = this._getOrCreateFavorites();
    let existing = favorites.find(f => f.session_id === sessionId);
    if (existing) {
      return { success: true, message: 'Session already bookmarked', favoriteSession: existing };
    }

    const favorite = {
      id: this._generateId('fav'),
      session_id: sessionId,
      added_at: this._nowISO()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_sessions', favorites);

    return { success: true, message: 'Session bookmarked', favoriteSession: favorite };
  }

  removeBookmarkedSession(sessionId) {
    let favorites = this._getOrCreateFavorites();
    const beforeLen = favorites.length;
    favorites = favorites.filter(f => f.session_id !== sessionId);
    this._saveToStorage('favorite_sessions', favorites);

    const success = beforeLen !== favorites.length;
    return { success, message: success ? 'Bookmark removed' : 'Session not bookmarked' };
  }

  getMySchedule() {
    const items = this._getOrCreatePersonalSchedule();
    const sessions = this._getFromStorage('sessions', []);
    const events = this._getFromStorage('events', []);
    const shuttles = this._getFromStorage('shuttle_departures', []);

    return items.map(i => {
      const enriched = { ...i };
      if (i.session_id) {
        enriched.session = sessions.find(s => s.id === i.session_id) || null;
      }
      if (i.event_id) {
        enriched.event = events.find(e => e.id === i.event_id) || null;
      }
      if (i.shuttle_departure_id) {
        enriched.shuttleDeparture = shuttles.find(s => s.id === i.shuttle_departure_id) || null;
      }
      return enriched;
    });
  }

  getMyFavoriteSessions() {
    const favorites = this._getOrCreateFavorites();
    const sessions = this._getFromStorage('sessions', []);

    return favorites.map(f => ({
      favorite: f,
      session: sessions.find(s => s.id === f.session_id) || null
    }));
  }

  // Hotels / accommodations

  getHotelFilterOptions() {
    const hotels = this._getFromStorage('hotels', []);

    let minDist = null;
    let maxDist = null;
    let minPrice = null;
    let maxPrice = null;
    const amenityMap = {};

    hotels.forEach(h => {
      const d = Number(h.distance_from_venue_miles || 0);
      if (minDist === null || d < minDist) minDist = d;
      if (maxDist === null || d > maxDist) maxDist = d;
      const p = Number(h.primary_nightly_rate || 0);
      if (minPrice === null || p < minPrice) minPrice = p;
      if (maxPrice === null || p > maxPrice) maxPrice = p;
      const amenities = Array.isArray(h.amenities) ? h.amenities : [];
      amenities.forEach(a => {
        if (!amenityMap[a]) amenityMap[a] = a;
      });
    });

    // ensure breakfast_included appears
    amenityMap['breakfast_included'] = 'breakfast_included';

    const amenities = Object.keys(amenityMap).sort().map(v => ({ value: v, label: v }));

    return {
      distance_range_miles: {
        min: minDist !== null ? minDist : 0,
        max: maxDist !== null ? maxDist : 0
      },
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency: 'USD'
      },
      amenities
    };
  }

  searchHotels(filters, sortOption) {
    const hotels = this._getFromStorage('hotels', []);
    return this._filterAndSortHotels(hotels, filters, sortOption);
  }

  getHotelDetails(hotelId) {
    const hotels = this._getFromStorage('hotels', []);
    const roomTypesAll = this._getFromStorage('hotel_room_types', []);

    const hotel = hotels.find(h => h.id === hotelId) || null;
    const roomTypesRaw = roomTypesAll.filter(rt => rt.hotel_id === hotelId);
    const roomTypes = roomTypesRaw.map(rt => ({
      ...rt,
      hotel
    }));

    return {
      hotel,
      roomTypes,
      galleryImages: []
    };
  }

  startHotelBooking(hotelId, roomTypeId, checkinDate, checkoutDate, ratePlan) {
    const hotels = this._getFromStorage('hotels', []);
    const roomTypes = this._getFromStorage('hotel_room_types', []);

    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) {
      return { success: false, message: 'Hotel not found', booking: null };
    }
    const roomType = roomTypes.find(rt => rt.id === roomTypeId && rt.hotel_id === hotelId);
    if (!roomType) {
      return { success: false, message: 'Room type not found for hotel', booking: null };
    }

    const checkin = new Date(checkinDate + 'T00:00:00');
    const checkout = new Date(checkoutDate + 'T00:00:00');
    if (isNaN(checkin.getTime()) || isNaN(checkout.getTime()) || checkout <= checkin) {
      return { success: false, message: 'Invalid check-in/check-out dates', booking: null };
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const numNights = Math.round((checkout - checkin) / msPerDay);

    let chosenRatePlan = ratePlan;
    if (!chosenRatePlan) {
      if (roomType.conference_rate_available && roomType.conference_rate) {
        chosenRatePlan = 'conference_rate';
      } else {
        chosenRatePlan = 'standard';
      }
    }

    let nightlyRate;
    if (chosenRatePlan === 'conference_rate' && roomType.conference_rate_available && roomType.conference_rate) {
      nightlyRate = Number(roomType.conference_rate);
    } else {
      nightlyRate = Number(roomType.base_rate || 0);
    }

    const totalPrice = nightlyRate * numNights;

    const booking = this._getOrCreateHotelBooking(
      hotel,
      roomType,
      checkinDate,
      checkoutDate,
      chosenRatePlan,
      nightlyRate,
      numNights,
      totalPrice
    );

    return { success: true, message: 'Hotel booking started', booking };
  }

  getCurrentHotelBooking() {
    const booking = this._getCurrentHotelBooking();
    if (!booking) {
      return { hasActiveBooking: false, booking: null };
    }

    const hotels = this._getFromStorage('hotels', []);
    const roomTypes = this._getFromStorage('hotel_room_types', []);

    const hotel = hotels.find(h => h.id === booking.hotel_id) || null;
    const roomType = roomTypes.find(rt => rt.id === booking.room_type_id) || null;

    const enriched = {
      ...booking,
      hotel,
      roomType
    };

    return { hasActiveBooking: true, booking: enriched };
  }

  updateHotelBookingDetails(guestName, checkinDate, checkoutDate, specialRequests) {
    let booking = this._getCurrentHotelBooking();
    if (!booking) {
      return { success: false, message: 'No active hotel booking', booking: null };
    }

    const bookings = this._getFromStorage('hotel_bookings', []);

    booking.guest_name = guestName;
    if (checkinDate) {
      booking.checkin_date = new Date(checkinDate + 'T00:00:00').toISOString();
    }
    if (checkoutDate) {
      booking.checkout_date = new Date(checkoutDate + 'T00:00:00').toISOString();
    }
    if (specialRequests) {
      booking.special_requests = specialRequests;
    }

    // recompute num_nights and total_price if dates changed
    const checkin = new Date(booking.checkin_date);
    const checkout = new Date(booking.checkout_date);
    const msPerDay = 24 * 60 * 60 * 1000;
    if (!isNaN(checkin.getTime()) && !isNaN(checkout.getTime()) && checkout > checkin) {
      const numNights = Math.round((checkout - checkin) / msPerDay);
      booking.num_nights = numNights;
      booking.total_price = Number(booking.nightly_rate || 0) * numNights;
    }

    const updated = bookings.map(b => (b.id === booking.id ? booking : b));
    this._saveToStorage('hotel_bookings', updated);

    return { success: true, message: 'Hotel booking updated', booking };
  }

  completeHotelBooking() {
    let booking = this._getCurrentHotelBooking();
    if (!booking) {
      return { success: false, message: 'No active hotel booking', booking: null };
    }

    const bookings = this._getFromStorage('hotel_bookings', []);
    booking.status = 'reserved';

    const updated = bookings.map(b => (b.id === booking.id ? booking : b));
    this._saveToStorage('hotel_bookings', updated);

    return { success: true, message: 'Hotel booking reserved', booking };
  }

  addCurrentHotelBookingToTripPlan() {
    const booking = this._getCurrentHotelBooking();
    if (!booking || booking.status !== 'reserved') {
      return { success: false, message: 'No reserved hotel booking to add', tripPlan: null, tripItems: [] };
    }

    const tripPlan = this._getOrCreateTripPlan();
    let tripItems = this._getFromStorage('trip_items', []);

    const existing = tripItems.find(ti => ti.trip_plan_id === tripPlan.id && ti.hotel_booking_id === booking.id);
    if (!existing) {
      const item = {
        id: this._generateId('tripitem'),
        trip_plan_id: tripPlan.id,
        item_type: 'hotel_booking',
        hotel_booking_id: booking.id,
        shuttle_departure_id: null,
        notes: '',
        added_at: this._nowISO()
      };
      tripItems.push(item);
      this._saveToStorage('trip_items', tripItems);
    }

    const itemsForPlan = tripItems.filter(ti => ti.trip_plan_id === tripPlan.id);

    return { success: true, message: 'Hotel booking added to trip plan', tripPlan, tripItems: itemsForPlan };
  }

  // Shuttles / travel

  getShuttleFilterOptions() {
    const shuttles = this._getFromStorage('shuttle_departures', []);

    const dateMap = {};
    const directionMap = {};

    shuttles.forEach(s => {
      const d = this._toISODateString(s.date || s.departure_datetime);
      if (d && !dateMap[d]) dateMap[d] = d;
      if (s.direction) directionMap[s.direction] = s.direction;
    });

    const dates = Object.keys(dateMap).sort().map(d => ({ date: d, label: d }));
    const directions = Object.keys(directionMap).sort().map(v => ({ value: v, label: v }));

    return { dates, directions };
  }

  searchShuttleDepartures(filters, sortOption) {
    const shuttles = this._getFromStorage('shuttle_departures', []);
    return this._filterAndSortShuttles(shuttles, filters, sortOption);
  }

  addShuttleDepartureToTripPlan(shuttleDepartureId) {
    const shuttles = this._getFromStorage('shuttle_departures', []);
    const shuttle = shuttles.find(s => s.id === shuttleDepartureId);
    if (!shuttle) {
      return { success: false, message: 'Shuttle departure not found', tripPlan: null, tripItem: null };
    }

    const tripPlan = this._getOrCreateTripPlan();
    let tripItems = this._getFromStorage('trip_items', []);

    let existing = tripItems.find(ti => ti.trip_plan_id === tripPlan.id && ti.shuttle_departure_id === shuttleDepartureId);
    if (existing) {
      return { success: true, message: 'Shuttle already in trip plan', tripPlan, tripItem: existing };
    }

    const item = {
      id: this._generateId('tripitem'),
      trip_plan_id: tripPlan.id,
      item_type: 'shuttle',
      hotel_booking_id: null,
      shuttle_departure_id: shuttleDepartureId,
      notes: '',
      added_at: this._nowISO()
    };
    tripItems.push(item);
    this._saveToStorage('trip_items', tripItems);

    return { success: true, message: 'Shuttle added to trip plan', tripPlan, tripItem: item };
  }

  getMyTripPlan() {
    const tripPlan = this._getOrCreateTripPlan();
    const tripItems = this._getFromStorage('trip_items', []).filter(ti => ti.trip_plan_id === tripPlan.id);
    const hotelBookings = this._getFromStorage('hotel_bookings', []);
    const shuttles = this._getFromStorage('shuttle_departures', []);

    const items = tripItems.map(ti => {
      const obj = { tripItem: ti };
      if (ti.item_type === 'hotel_booking' && ti.hotel_booking_id) {
        obj.hotelBooking = hotelBookings.find(hb => hb.id === ti.hotel_booking_id) || null;
      }
      if (ti.item_type === 'shuttle' && ti.shuttle_departure_id) {
        obj.shuttleDeparture = shuttles.find(s => s.id === ti.shuttle_departure_id) || null;
      }
      return obj;
    });

    return { tripPlan, items };
  }

  // Sponsorships

  getSponsorshipPackages() {
    const packages = this._getFromStorage('sponsorship_packages', []);
    return packages.filter(p => p.is_active).sort((a, b) => {
      if (typeof a.display_order === 'number' && typeof b.display_order === 'number') {
        return a.display_order - b.display_order;
      }
      return Number(a.price || 0) - Number(b.price || 0);
    });
  }

  startSponsorshipApplication(packageId) {
    const packages = this._getFromStorage('sponsorship_packages', []);
    const pkg = packages.find(p => p.id === packageId && p.is_active);
    if (!pkg) {
      return { success: false, message: 'Sponsorship package not found', application: null };
    }

    const application = this._getOrCreateSponsorshipApplication(pkg);
    return { success: true, message: 'Sponsorship application started', application };
  }

  getCurrentSponsorshipApplication() {
    const application = this._getCurrentSponsorshipApplication();
    const packages = this._getFromStorage('sponsorship_packages', []);
    const pkg = application ? packages.find(p => p.id === application.package_id) || null : null;
    return { application, package: pkg };
  }

  updateSponsorshipApplicationContact(contactName, email, phone, organization) {
    let application = this._getCurrentSponsorshipApplication();
    if (!application) {
      return { success: false, message: 'No active sponsorship application', application: null };
    }

    let apps = this._getFromStorage('sponsorship_interests', []);
    application.contact_name = contactName;
    application.email = email;
    if (phone !== undefined) application.phone = phone;
    if (organization !== undefined) application.organization = organization;
    application.updated_at = this._nowISO();

    apps = apps.map(a => (a.id === application.id ? application : a));
    this._saveToStorage('sponsorship_interests', apps);

    return { success: true, message: 'Sponsorship contact updated', application };
  }

  submitSponsorshipApplication() {
    let application = this._getCurrentSponsorshipApplication();
    if (!application) {
      return { success: false, message: 'No active sponsorship application', application: null };
    }

    let apps = this._getFromStorage('sponsorship_interests', []);
    application.status = 'submitted';
    application.updated_at = this._nowISO();

    apps = apps.map(a => (a.id === application.id ? application : a));
    this._saveToStorage('sponsorship_interests', apps);

    return { success: true, message: 'Sponsorship application submitted', application };
  }

  // Exhibitors / visit list

  getExhibitorFilterOptions() {
    const exhibitors = this._getFromStorage('exhibitors', []);

    const categoryMap = {};
    exhibitors.forEach(ex => {
      if (ex.category) categoryMap[ex.category] = ex.category;
    });

    const categories = Object.keys(categoryMap).sort().map(v => ({ value: v, label: v }));

    const opportunities = [
      { value: 'job_opportunities', label: 'Job Opportunities / Hiring' }
    ];

    return { categories, opportunities };
  }

  searchExhibitors(filters, sortOption) {
    const exhibitors = this._getFromStorage('exhibitors', []);
    return this._filterAndSortExhibitors(exhibitors, filters, sortOption);
  }

  addExhibitorToVisitList(exhibitorId) {
    const exhibitors = this._getFromStorage('exhibitors', []);
    const exhibitor = exhibitors.find(ex => ex.id === exhibitorId);
    if (!exhibitor) {
      return { success: false, message: 'Exhibitor not found', visitList: null, item: null };
    }

    const visitList = this._getOrCreateVisitList();
    let items = this._getFromStorage('visit_list_items', []);

    let existing = items.find(i => i.visit_list_id === visitList.id && i.exhibitor_id === exhibitorId);
    if (existing) {
      return { success: true, message: 'Exhibitor already in visit list', visitList, item: existing };
    }

    const item = {
      id: this._generateId('visititem'),
      visit_list_id: visitList.id,
      exhibitor_id: exhibitorId,
      added_at: this._nowISO(),
      notes: ''
    };
    items.push(item);
    this._saveToStorage('visit_list_items', items);

    return { success: true, message: 'Exhibitor added to visit list', visitList, item };
  }

  removeExhibitorFromVisitList(exhibitorId) {
    const visitList = this._getOrCreateVisitList();
    let items = this._getFromStorage('visit_list_items', []);
    const beforeLen = items.length;
    items = items.filter(i => !(i.visit_list_id === visitList.id && i.exhibitor_id === exhibitorId));
    this._saveToStorage('visit_list_items', items);

    const success = beforeLen !== items.length;
    return { success, message: success ? 'Exhibitor removed from visit list' : 'Exhibitor not in visit list', visitList };
  }

  getMyVisitList() {
    const visitList = this._getOrCreateVisitList();
    const items = this._getFromStorage('visit_list_items', []).filter(i => i.visit_list_id === visitList.id);
    const exhibitors = this._getFromStorage('exhibitors', []);

    const enrichedItems = items.map(i => ({
      visitListItem: i,
      exhibitor: exhibitors.find(ex => ex.id === i.exhibitor_id) || null
    }));

    return { visitList, items: enrichedItems };
  }

  // Events & networking

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const dateMap = {};
    const typeMap = {};
    let minPrice = null;
    let maxPrice = null;

    events.forEach(e => {
      const d = this._toISODateString(e.start_datetime);
      if (d && !dateMap[d]) dateMap[d] = d;
      if (e.event_type) typeMap[e.event_type] = e.event_type;
      const price = Number(e.price || 0);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    });

    const dates = Object.keys(dateMap).sort().map(d => {
      // Format human-readable labels like "October 15, 2026" so tests can find specific dates
      const parts = d.split('-'); // [YYYY, MM, DD]
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];
      const monthName = monthNames[month - 1] || '';
      const label = monthName && day && year ? monthName + ' ' + day + ', ' + year : d;
      return { date: d, label };
    });
    const event_types = Object.keys(typeMap).sort().map(v => ({ value: v, label: v }));

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'midday', label: 'Midday' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    return {
      dates,
      event_types,
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency: 'USD'
      },
      time_of_day_options
    };
  }

  searchEvents(filters, sortOption) {
    const events = this._getFromStorage('events', []);
    return this._filterAndSortEvents(events, filters, sortOption);
  }

  rsvpToEvent(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', scheduleItem: null };
    }

    let items = this._getOrCreatePersonalSchedule();
    let existing = items.find(i => i.item_type === 'event' && i.event_id === eventId);
    if (existing) {
      return { success: true, message: 'Already RSVPed to event', scheduleItem: existing };
    }

    const item = {
      id: this._generateId('pevt'),
      item_type: 'event',
      session_id: null,
      event_id: eventId,
      shuttle_departure_id: null,
      title: event.name,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      created_at: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('personal_schedule_items', items);

    return { success: true, message: 'RSVP successful', scheduleItem: item };
  }

  // Profile / preferences

  getProfile() {
    return this._getOrCreateProfile();
  }

  updateProfilePreferences(dietaryPreference, preferredConferenceTrack, smsOptIn, mobilePhone, communicationPreferences) {
    let profile = this._getOrCreateProfile();
    let profiles = this._getFromStorage('profiles', []);

    if (dietaryPreference !== undefined) {
      profile.dietary_preference = dietaryPreference;
    }
    if (preferredConferenceTrack !== undefined) {
      profile.preferred_conference_track = preferredConferenceTrack;
    }
    if (smsOptIn !== undefined) {
      profile.sms_opt_in = !!smsOptIn;
    }
    if (mobilePhone !== undefined) {
      profile.mobile_phone = mobilePhone;
    }

    if (communicationPreferences !== undefined && Array.isArray(communicationPreferences)) {
      profile.communication_preferences = communicationPreferences.slice();
    } else {
      // ensure sms is present/absent according to smsOptIn if preferences not explicitly provided
      if (smsOptIn !== undefined) {
        const prefs = Array.isArray(profile.communication_preferences) ? profile.communication_preferences.slice() : [];
        const hasSms = prefs.includes('sms');
        if (smsOptIn && !hasSms) {
          prefs.push('sms');
        } else if (!smsOptIn && hasSms) {
          profile.communication_preferences = prefs.filter(p => p !== 'sms');
        }
        profile.communication_preferences = prefs;
      }
    }

    profile.updated_at = this._nowISO();
    profiles = profiles.map(p => (p.id === profile.id ? profile : p));
    this._saveToStorage('profiles', profiles);

    return { success: true, message: 'Profile updated', profile };
  }

  // Static content-like interfaces

  getAboutConferenceContent() {
    // These are descriptive and not backed by specific entities; return structured text
    const title = 'About the Conference';
    const mission = 'Provide high-quality continuing education and networking opportunities for professionals.';
    const key_themes = ['Clinical Practice', 'Leadership', 'Research and Innovation', 'Technology and Data Analytics'];
    const target_audience = ['Clinicians', 'Researchers', 'Leaders and Administrators', 'Students'];
    const ce_highlights = ['Multi-track CE sessions', 'Hands-on workshops', 'Keynote addresses with CE credit'];
    const venue_overview = {
      name: 'Conference Venue',
      address_line1: '',
      city: '',
      state_province: '',
      country: ''
    };

    const high_level_schedule = [];

    return {
      title,
      mission,
      key_themes,
      target_audience,
      ce_highlights,
      venue_overview,
      high_level_schedule
    };
  }

  getContactInfo() {
    const venue_address = {
      name: 'Conference Venue',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: ''
    };

    return {
      support_email: 'support@example.com',
      support_phone: '',
      venue_address,
      faq_sections: []
    };
  }

  submitContactForm(name, email, subject, message, category) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticketId = this._generateId('ticket');

    const ticket = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      category: category || 'other',
      created_at: this._nowISO()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return { success: true, message: 'Inquiry submitted', ticketId };
  }

  getPoliciesContent() {
    return {
      code_of_conduct: 'All attendees, speakers, sponsors, and volunteers are expected to uphold a professional code of conduct during the conference.',
      privacy_policy: 'We respect your privacy and only use your data to deliver conference-related services.',
      terms_and_conditions: 'Registration and participation are subject to the conference terms and conditions.'
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
