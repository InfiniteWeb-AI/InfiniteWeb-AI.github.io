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
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const keys = [
      'registrations',
      'ticket_options',
      'profiles',
      'interest_options',
      'classmates',
      'favorite_classmates',
      'volunteer_shifts',
      'volunteer_schedules',
      'volunteer_schedule_items',
      'tables',
      'seats',
      'table_reservations',
      'donation_funds',
      'donations',
      'events',
      'personal_schedules',
      'personal_schedule_items',
      'hotels',
      'trips',
      'discussion_categories',
      'topics',
      'replies',
      'contact_messages',
      'faq_items',
      'policy_documents',
      'reunion_info'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _findById(collection, id) {
    if (!collection || !id) return null;
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].id === id) return collection[i];
    }
    return null;
  }

  _wordCount(text) {
    if (!text) return 0;
    const parts = String(text).trim().split(/\s+/).filter(Boolean);
    return parts.length;
  }

  _parseTimeFromIso(isoString) {
    // returns {hours, minutes} in local time
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return { hours: d.getHours(), minutes: d.getMinutes() };
  }

  _timeToMinutes(hours, minutes) {
    return hours * 60 + minutes;
  }

  // ----------------------
  // Helper: Registration
  // ----------------------

  _getOrCreateRegistration() {
    let registrations = this._getFromStorage('registrations');
    if (registrations.length > 0) {
      return registrations[0];
    }
    const now = new Date().toISOString();
    const registration = {
      id: this._generateId('reg'),
      class_year: '2010',
      first_name: '',
      last_name: '',
      email: '',
      attendance_status: 'maybe',
      guest_count: 0,
      ticket_option_id: '',
      guest_ticket_option_id: null,
      meal_preference_self: 'none',
      meal_preference_guest: 'none',
      wants_email_updates: false,
      wants_text_updates: false,
      created_at: now,
      updated_at: now
    };
    registrations.push(registration);
    this._saveToStorage('registrations', registrations);
    return registration;
  }

  // ----------------------
  // Helper: Profile
  // ----------------------

  _getOrCreateProfile() {
    let profiles = this._getFromStorage('profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    const now = new Date().toISOString();
    const profile = {
      id: this._generateId('prof'),
      first_name: '',
      last_name: '',
      email: '',
      class_year: null,
      location: '',
      city: '',
      state: '',
      country: '',
      bio: '',
      interests: [],
      visibility: 'classmates_only',
      avatar_url: '',
      created_at: now,
      updated_at: now
    };
    profiles.push(profile);
    this._saveToStorage('profiles', profiles);
    return profile;
  }

  // ----------------------
  // Helper: Volunteer schedule
  // ----------------------

  _getOrCreateVolunteerSchedule() {
    let schedules = this._getFromStorage('volunteer_schedules');
    if (schedules.length > 0) {
      return schedules[0];
    }
    const now = new Date().toISOString();
    const schedule = {
      id: this._generateId('volsched'),
      total_duration_hours: 0,
      created_at: now,
      updated_at: now
    };
    schedules.push(schedule);
    this._saveToStorage('volunteer_schedules', schedules);
    return schedule;
  }

  _recalculateVolunteerScheduleSummary(scheduleId) {
    const schedules = this._getFromStorage('volunteer_schedules');
    const schedule = this._findById(schedules, scheduleId);
    const items = this._getFromStorage('volunteer_schedule_items');
    const shifts = this._getFromStorage('volunteer_shifts');

    const selectedItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].volunteer_schedule_id === scheduleId) {
        selectedItems.push(items[i]);
      }
    }

    const selectedShifts = [];
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const shift = this._findById(shifts, item.shift_id);
      if (shift && shift.is_active !== false) {
        selectedShifts.push(shift);
      }
    }

    let totalDuration = 0;
    for (let i = 0; i < selectedShifts.length; i++) {
      const hrs = typeof selectedShifts[i].duration_hours === 'number' ? selectedShifts[i].duration_hours : 0;
      totalDuration += hrs;
    }

    const shiftCount = selectedShifts.length;
    const recommendedMin = 2;
    const recommendedMax = 3;
    const meetsRange = totalDuration >= recommendedMin && totalDuration <= recommendedMax;

    // Check overlaps
    let overlapWarning = null;
    const sorted = selectedShifts
      .slice()
      .sort((a, b) => {
        const t1 = new Date(a.start_datetime).getTime();
        const t2 = new Date(b.start_datetime).getTime();
        return t1 - t2;
      });

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevEnd = new Date(prev.end_datetime).getTime();
      const currStart = new Date(curr.start_datetime).getTime();
      if (!isNaN(prevEnd) && !isNaN(currStart) && currStart < prevEnd) {
        overlapWarning = 'Some volunteer shifts overlap in time.';
        break;
      }
    }

    if (schedule) {
      schedule.total_duration_hours = totalDuration;
      schedule.updated_at = new Date().toISOString();
      this._saveToStorage('volunteer_schedules', schedules);
    }

    return {
      total_duration_hours: totalDuration,
      shift_count: shiftCount,
      recommended_min_hours: recommendedMin,
      recommended_max_hours: recommendedMax,
      meets_recommended_range: meetsRange,
      overlap_warning: overlapWarning
    };
  }

  // ----------------------
  // Helper: Personal schedule
  // ----------------------

  _getOrCreatePersonalSchedule() {
    let schedules = this._getFromStorage('personal_schedules');
    if (schedules.length > 0) {
      return schedules[0];
    }
    const now = new Date().toISOString();
    const schedule = {
      id: this._generateId('psched'),
      created_at: now,
      updated_at: now
    };
    schedules.push(schedule);
    this._saveToStorage('personal_schedules', schedules);
    return schedule;
  }

  // ----------------------
  // Helper: Trip
  // ----------------------

  _getOrCreateTrip() {
    let trips = this._getFromStorage('trips');
    if (trips.length > 0) {
      return trips[0];
    }
    const now = new Date().toISOString();
    const trip = {
      id: this._generateId('trip'),
      hotel_id: '',
      check_in_date: '',
      check_out_date: '',
      notes: '',
      created_at: now,
      updated_at: now
    };
    trips.push(trip);
    this._saveToStorage('trips', trips);
    return trip;
  }

  // ----------------------
  // Helper: Favorites metadata
  // ----------------------

  _updateFavoritesMetadata() {
    const favorites = this._getFromStorage('favorite_classmates');
    const classmates = this._getFromStorage('classmates');
    const seats = this._getFromStorage('seats');
    const tables = this._getFromStorage('tables');

    const favoriteIds = [];
    for (let i = 0; i < favorites.length; i++) {
      favoriteIds.push(favorites[i].classmate_id);
    }

    // Update classmates.is_favorite (derived field)
    for (let i = 0; i < classmates.length; i++) {
      const c = classmates[i];
      c.is_favorite = favoriteIds.indexOf(c.id) !== -1;
    }
    this._saveToStorage('classmates', classmates);

    // Update seats.is_favorite_classmate
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      if (s.occupant_classmate_id) {
        s.is_favorite_classmate = favoriteIds.indexOf(s.occupant_classmate_id) !== -1;
      } else {
        s.is_favorite_classmate = false;
      }
    }
    this._saveToStorage('seats', seats);

    // Update tables.has_favorite_classmate based on seats
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      let hasFav = false;
      for (let j = 0; j < seats.length; j++) {
        const s = seats[j];
        if (s.table_id === t.id && s.is_favorite_classmate) {
          hasFav = true;
          break;
        }
      }
      t.has_favorite_classmate = hasFav;
    }
    this._saveToStorage('tables', tables);
  }

  // ----------------------
  // Helper: Seating open seats
  // ----------------------

  _recalculateTableOpenSeats(tableId) {
    const tables = this._getFromStorage('tables');
    const seats = this._getFromStorage('seats');
    const table = this._findById(tables, tableId);
    if (!table) return;
    let open = 0;
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      if (s.table_id === tableId && s.status === 'available') {
        open++;
      }
    }
    table.open_seat_count = open;
    this._saveToStorage('tables', tables);
  }

  // ----------------------
  // getHomeOverview
  // ----------------------

  getHomeOverview() {
    // Registration summary
    const registrations = this._getFromStorage('registrations');
    const ticketOptions = this._getFromStorage('ticket_options');
    let registration_summary = {
      has_registration: false,
      attendance_status: 'not_set',
      guest_count: 0,
      ticket_name: null,
      ticket_day: null
    };

    if (registrations.length > 0) {
      const reg = registrations[0];
      const ticket = this._findById(ticketOptions, reg.ticket_option_id);
      registration_summary = {
        has_registration: true,
        attendance_status: reg.attendance_status || 'not_set',
        guest_count: typeof reg.guest_count === 'number' ? reg.guest_count : 0,
        ticket_name: ticket ? ticket.name : null,
        ticket_day: ticket ? ticket.day : null
      };
    }

    // Upcoming events (simple: next few in-person or any events sorted by start_datetime)
    const events = this._getFromStorage('events');
    const upcoming_events = events
      .slice()
      .sort((a, b) => {
        const t1 = new Date(a.start_datetime).getTime();
        const t2 = new Date(b.start_datetime).getTime();
        return t1 - t2;
      })
      .slice(0, 10)
      .map(e => ({
        event_id: e.id,
        name: e.name,
        day_of_week: e.day_of_week,
        start_datetime: e.start_datetime,
        location: e.location || '',
        format: e.format
      }));

    // Saved hotel
    const trips = this._getFromStorage('trips');
    const hotels = this._getFromStorage('hotels');
    let saved_hotel = null;
    if (trips.length > 0) {
      const trip = trips[0];
      const hotel = this._findById(hotels, trip.hotel_id);
      if (hotel) {
        saved_hotel = {
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          nightly_rate: hotel.nightly_rate,
          distance_miles: hotel.distance_miles,
          check_in_date: trip.check_in_date,
          check_out_date: trip.check_out_date,
          hotel: hotel // foreign key resolution
        };
      }
    }

    // Favorites summary
    const favorite_classmates = this._getFromStorage('favorite_classmates');
    const classmates = this._getFromStorage('classmates');
    let attendingFavorites = 0;
    for (let i = 0; i < favorite_classmates.length; i++) {
      const fav = favorite_classmates[i];
      const cls = this._findById(classmates, fav.classmate_id);
      if (cls && cls.is_attending_reunion) attendingFavorites++;
    }
    const favorites_summary = {
      total_favorites: favorite_classmates.length,
      attending_favorites_count: attendingFavorites
    };

    // Volunteer summary
    const volunteer_schedules = this._getFromStorage('volunteer_schedules');
    const volunteer_schedule_items = this._getFromStorage('volunteer_schedule_items');
    const volunteer_shifts = this._getFromStorage('volunteer_shifts');
    let volunteer_summary = {
      total_duration_hours: 0,
      shift_count: 0,
      meets_recommended_range: false
    };
    if (volunteer_schedules.length > 0) {
      const schedule = volunteer_schedules[0];
      const selectedItems = [];
      for (let i = 0; i < volunteer_schedule_items.length; i++) {
        if (volunteer_schedule_items[i].volunteer_schedule_id === schedule.id) {
          selectedItems.push(volunteer_schedule_items[i]);
        }
      }
      let total = 0;
      for (let i = 0; i < selectedItems.length; i++) {
        const shift = this._findById(volunteer_shifts, selectedItems[i].shift_id);
        if (shift) {
          total += typeof shift.duration_hours === 'number' ? shift.duration_hours : 0;
        }
      }
      volunteer_summary.total_duration_hours = total;
      volunteer_summary.shift_count = selectedItems.length;
      volunteer_summary.meets_recommended_range = total >= 2 && total <= 3;
    }

    // Personal schedule summary
    const personal_schedules = this._getFromStorage('personal_schedules');
    const personal_schedule_items = this._getFromStorage('personal_schedule_items');
    let personal_schedule_summary = {
      total_events: 0,
      events_by_day: {
        friday: 0,
        saturday: 0,
        sunday: 0
      }
    };
    if (personal_schedules.length > 0) {
      const psched = personal_schedules[0];
      const items = [];
      for (let i = 0; i < personal_schedule_items.length; i++) {
        if (personal_schedule_items[i].personal_schedule_id === psched.id) {
          items.push(personal_schedule_items[i]);
        }
      }
      personal_schedule_summary.total_events = items.length;
      for (let i = 0; i < items.length; i++) {
        const ev = this._findById(events, items[i].event_id);
        if (ev && personal_schedule_summary.events_by_day.hasOwnProperty(ev.day_of_week)) {
          personal_schedule_summary.events_by_day[ev.day_of_week] += 1;
        }
      }
    }

    return {
      registration_summary,
      upcoming_events,
      saved_hotel,
      favorites_summary,
      volunteer_summary,
      personal_schedule_summary
    };
  }

  // ----------------------
  // getReunionOverview
  // ----------------------

  getReunionOverview() {
    const infos = this._getFromStorage('reunion_info');
    const info = infos.length > 0 ? infos[0] : null;

    return {
      name: info ? info.name : '',
      class_year: info ? info.class_year : '',
      start_date: info ? info.start_date : '',
      end_date: info ? info.end_date : '',
      venue_name: info ? info.venue_name : '',
      venue_address: info ? info.venue_address || '' : '',
      venue_city: info ? info.venue_city || '' : '',
      venue_state: info ? info.venue_state || '' : '',
      venue_zip: info ? info.venue_zip || '' : '',
      highlights: []
    };
  }

  // ----------------------
  // getRegistrationPageContext
  // ----------------------

  getRegistrationPageContext() {
    const class_year_options = [
      { value: '2000', label: 'Class of 2000' },
      { value: '2005', label: 'Class of 2005' },
      { value: '2010', label: 'Class of 2010' },
      { value: '2015', label: 'Class of 2015' }
    ];

    const attendance_options = [
      { value: 'yes', label: 'Yes, I will attend' },
      { value: 'no', label: 'No, I cannot attend' },
      { value: 'maybe', label: 'Maybe / Not sure yet' }
    ];

    const meal_options = [
      { value: 'none', label: 'No meal' },
      { value: 'no_preference', label: 'No preference' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'other', label: 'Other' }
    ];

    const communication_options = {
      email_updates_label: 'Email updates',
      text_updates_label: 'Text message updates'
    };

    const ticket_options = this._getFromStorage('ticket_options');
    let min_price = 0;
    let max_price = 0;
    if (ticket_options.length > 0) {
      min_price = ticket_options[0].price;
      max_price = ticket_options[0].price;
      for (let i = 1; i < ticket_options.length; i++) {
        const p = ticket_options[i].price;
        if (typeof p === 'number') {
          if (p < min_price) min_price = p;
          if (p > max_price) max_price = p;
        }
      }
    }

    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' },
      { value: 'full_weekend', label: 'Full weekend' },
      { value: 'multi_day', label: 'Multiple days' }
    ];

    const registrations = this._getFromStorage('registrations');
    let existing_registration = null;
    if (registrations.length > 0) {
      const reg = registrations[0];
      const ticket = this._findById(ticket_options, reg.ticket_option_id);
      const guestTicket = this._findById(ticket_options, reg.guest_ticket_option_id);
      existing_registration = {
        id: reg.id,
        class_year: reg.class_year,
        first_name: reg.first_name,
        last_name: reg.last_name,
        email: reg.email,
        attendance_status: reg.attendance_status,
        guest_count: reg.guest_count,
        ticket_option_id: reg.ticket_option_id,
        guest_ticket_option_id: reg.guest_ticket_option_id,
        meal_preference_self: reg.meal_preference_self,
        meal_preference_guest: reg.meal_preference_guest,
        wants_email_updates: reg.wants_email_updates,
        wants_text_updates: reg.wants_text_updates,
        // foreign key resolutions
        ticket_option: ticket || null,
        guest_ticket_option: guestTicket || null
      };
    }

    return {
      class_year_options,
      attendance_options,
      meal_options,
      communication_options,
      ticket_filters_defaults: {
        min_price,
        max_price,
        day_options
      },
      existing_registration
    };
  }

  // ----------------------
  // searchTicketOptions
  // ----------------------

  searchTicketOptions(day, max_price, category, is_guest_ticket, only_active) {
    const ticket_options = this._getFromStorage('ticket_options');
    const activeOnly = only_active !== false; // default true

    const results = [];
    for (let i = 0; i < ticket_options.length; i++) {
      const t = ticket_options[i];
      if (activeOnly && t.is_active === false) continue;
      if (day && t.day !== day) continue;
      if (typeof max_price === 'number' && t.price > max_price) continue;
      if (category && t.category !== category) continue;
      if (typeof is_guest_ticket === 'boolean' && t.is_guest_ticket !== is_guest_ticket) continue;
      results.push({
        id: t.id,
        name: t.name,
        description: t.description || '',
        day: t.day,
        category: t.category,
        price: t.price,
        is_guest_ticket: !!t.is_guest_ticket
      });
    }
    return results;
  }

  // ----------------------
  // submitRegistration
  // ----------------------

  submitRegistration(
    class_year,
    first_name,
    last_name,
    email,
    attendance_status,
    guest_count,
    ticket_option_id,
    guest_ticket_option_id,
    meal_preference_self,
    meal_preference_guest,
    wants_email_updates,
    wants_text_updates
  ) {
    const ticket_options = this._getFromStorage('ticket_options');
    const primaryTicket = this._findById(ticket_options, ticket_option_id);
    if (!primaryTicket) {
      return { success: false, message: 'Invalid ticket option selected.', registration: null };
    }

    if (guest_ticket_option_id) {
      const guestTicket = this._findById(ticket_options, guest_ticket_option_id);
      if (!guestTicket) {
        return { success: false, message: 'Invalid guest ticket option selected.', registration: null };
      }
    }

    let registrations = this._getFromStorage('registrations');
    let registration = registrations.length > 0 ? registrations[0] : null;
    const now = new Date().toISOString();

    if (!registration) {
      registration = {
        id: this._generateId('reg'),
        created_at: now
      };
      registrations.push(registration);
    }

    registration.class_year = class_year;
    registration.first_name = first_name;
    registration.last_name = last_name;
    registration.email = email;
    registration.attendance_status = attendance_status;
    registration.guest_count = guest_count;
    registration.ticket_option_id = ticket_option_id;
    registration.guest_ticket_option_id = guest_ticket_option_id || null;
    registration.meal_preference_self = meal_preference_self;
    registration.meal_preference_guest = meal_preference_guest || 'none';
    registration.wants_email_updates = !!wants_email_updates;
    registration.wants_text_updates = !!wants_text_updates;
    registration.updated_at = now;

    this._saveToStorage('registrations', registrations);

    const guestTicket = this._findById(ticket_options, guest_ticket_option_id);

    return {
      success: true,
      message: 'Registration saved successfully.',
      registration: {
        id: registration.id,
        class_year: registration.class_year,
        first_name: registration.first_name,
        last_name: registration.last_name,
        email: registration.email,
        attendance_status: registration.attendance_status,
        guest_count: registration.guest_count,
        ticket_name: primaryTicket.name,
        ticket_price: primaryTicket.price,
        guest_ticket_name: guestTicket ? guestTicket.name : null,
        meal_preference_self: registration.meal_preference_self,
        meal_preference_guest: registration.meal_preference_guest,
        wants_email_updates: registration.wants_email_updates,
        wants_text_updates: registration.wants_text_updates,
        // foreign key resolution
        ticket_option: primaryTicket,
        guest_ticket_option: guestTicket || null
      }
    };
  }

  // ----------------------
  // getRegistrationSummary
  // ----------------------

  getRegistrationSummary() {
    const registrations = this._getFromStorage('registrations');
    const ticket_options = this._getFromStorage('ticket_options');

    if (registrations.length === 0) {
      return {
        has_registration: false,
        attendance_status: 'not_set',
        guest_count: 0,
        ticket_name: null,
        ticket_price: 0,
        ticket_day: null,
        meal_preference_self: 'none',
        meal_preference_guest: 'none'
      };
    }

    const reg = registrations[0];
    const ticket = this._findById(ticket_options, reg.ticket_option_id);

    return {
      has_registration: true,
      attendance_status: reg.attendance_status,
      guest_count: reg.guest_count,
      ticket_name: ticket ? ticket.name : null,
      ticket_price: ticket ? ticket.price : 0,
      ticket_day: ticket ? ticket.day : null,
      meal_preference_self: reg.meal_preference_self,
      meal_preference_guest: reg.meal_preference_guest
    };
  }

  // ----------------------
  // getMyProfileContext
  // ----------------------

  getMyProfileContext() {
    const profile = this._getOrCreateProfile();
    const interest_options = this._getFromStorage('interest_options').map(io => ({
      key: io.key,
      label: io.label,
      description: io.description || ''
    }));

    const visibility_options = [
      { value: 'public', label: 'Public' },
      { value: 'classmates_only', label: 'Classmates only' },
      { value: 'private', label: 'Private' }
    ];

    return {
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        class_year: profile.class_year,
        location: profile.location,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        bio: profile.bio,
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        visibility: profile.visibility
      },
      interest_options,
      visibility_options,
      bio_min_length: 100,
      bio_max_length: null,
      required_interest_count: 3
    };
  }

  // ----------------------
  // updateMyProfile
  // ----------------------

  updateMyProfile(location, city, state, country, bio, interests, visibility) {
    const profile = this._getOrCreateProfile();
    const interest_options = this._getFromStorage('interest_options');
    const validInterestKeys = interest_options.map(io => io.key);

    // Validation
    if (typeof bio === 'string' && bio.length > 0 && bio.length < 100) {
      return {
        success: false,
        message: 'Bio must be at least 100 characters long.',
        profile: {
          location: profile.location,
          bio: profile.bio,
          interests: profile.interests,
          visibility: profile.visibility
        }
      };
    }

    if (Array.isArray(interests)) {
      if (interests.length !== 3) {
        return {
          success: false,
          message: 'Please select exactly three interests.',
          profile: {
            location: profile.location,
            bio: profile.bio,
            interests: profile.interests,
            visibility: profile.visibility
          }
        };
      }
      // ensure all interests are valid keys if options exist
      for (let i = 0; i < interests.length; i++) {
        if (validInterestKeys.length > 0 && validInterestKeys.indexOf(interests[i]) === -1) {
          return {
            success: false,
            message: 'One or more selected interests are invalid.',
            profile: {
              location: profile.location,
              bio: profile.bio,
              interests: profile.interests,
              visibility: profile.visibility
            }
          };
        }
      }
    }

    if (typeof location === 'string') profile.location = location;
    if (typeof city === 'string') profile.city = city;
    if (typeof state === 'string') profile.state = state;
    if (typeof country === 'string') profile.country = country;
    if (typeof bio === 'string') profile.bio = bio;
    if (Array.isArray(interests)) profile.interests = interests;
    if (typeof visibility === 'string') profile.visibility = visibility;

    profile.updated_at = new Date().toISOString();

    let profiles = this._getFromStorage('profiles');
    if (profiles.length === 0) {
      profiles.push(profile);
    } else {
      profiles[0] = profile;
    }
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        location: profile.location,
        bio: profile.bio,
        interests: profile.interests,
        visibility: profile.visibility
      }
    };
  }

  // ----------------------
  // getClassmateDirectoryFilters
  // ----------------------

  getClassmateDirectoryFilters() {
    const default_zip_code = '';
    const default_radius_miles = 25;
    const radius_options = [5, 10, 25, 50, 100];

    const sort_options = [
      { value: 'last_name_asc', label: 'Last name (A–Z)' },
      { value: 'last_name_desc', label: 'Last name (Z–A)' },
      { value: 'distance_asc', label: 'Distance (nearest first)' }
    ];

    return {
      default_zip_code,
      default_radius_miles,
      radius_options,
      sort_options
    };
  }

  // ----------------------
  // searchClassmates
  // ----------------------

  searchClassmates(zip_code, radius_miles, sort_by, page, page_size) {
    const classmates = this._getFromStorage('classmates');
    const favorites = this._getFromStorage('favorite_classmates');

    const favIds = favorites.map(f => f.classmate_id);

    let results = [];
    for (let i = 0; i < classmates.length; i++) {
      const c = classmates[i];
      let include = true;
      if (zip_code === '60601' && typeof radius_miles === 'number' && radius_miles > 0) {
        const d = c.distance_from_zip_60601;
        if (typeof d === 'number') {
          if (d > radius_miles) include = false;
        }
      }
      if (!include) continue;
      results.push(c);
    }

    const sortKey = sort_by || 'last_name_asc';
    if (sortKey === 'last_name_asc' || sortKey === 'last_name_desc') {
      results.sort((a, b) => {
        const la = (a.last_name || '').toLowerCase();
        const lb = (b.last_name || '').toLowerCase();
        if (la < lb) return sortKey === 'last_name_asc' ? -1 : 1;
        if (la > lb) return sortKey === 'last_name_asc' ? 1 : -1;
        return 0;
      });
    } else if (sortKey === 'distance_asc') {
      results.sort((a, b) => {
        const da = typeof a.distance_from_zip_60601 === 'number' ? a.distance_from_zip_60601 : Number.MAX_VALUE;
        const db = typeof b.distance_from_zip_60601 === 'number' ? b.distance_from_zip_60601 : Number.MAX_VALUE;
        return da - db;
      });
    }

    const total_count = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 25;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = results.slice(start, end);

    const mapped = paged.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      maiden_name: c.maiden_name || '',
      class_year: c.class_year,
      location_display: c.location_display || '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || '',
      distance_miles: typeof c.distance_from_zip_60601 === 'number' ? c.distance_from_zip_60601 : null,
      profile_visibility: c.profile_visibility || 'public',
      is_attending_reunion: !!c.is_attending_reunion,
      is_favorite: favIds.indexOf(c.id) !== -1
    }));

    return {
      results: mapped,
      total_count
    };
  }

  // ----------------------
  // updateFavoriteClassmate
  // ----------------------

  updateFavoriteClassmate(classmate_id, action) {
    const classmates = this._getFromStorage('classmates');
    const classmate = this._findById(classmates, classmate_id);
    if (!classmate) {
      return { is_favorite: false, favorites_count: this._getFromStorage('favorite_classmates').length };
    }

    let favorites = this._getFromStorage('favorite_classmates');
    const existingIndex = favorites.findIndex(f => f.classmate_id === classmate_id);

    if (action === 'add') {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('fav'),
          classmate_id,
          favorited_at: new Date().toISOString()
        });
      }
    } else if (action === 'remove') {
      if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
      }
    }

    this._saveToStorage('favorite_classmates', favorites);
    this._updateFavoritesMetadata();

    const is_favorite = favorites.some(f => f.classmate_id === classmate_id);
    return {
      is_favorite,
      favorites_count: favorites.length
    };
  }

  // ----------------------
  // getFavoriteClassmates
  // ----------------------

  getFavoriteClassmates() {
    const favorites = this._getFromStorage('favorite_classmates');
    const classmates = this._getFromStorage('classmates');

    const results = [];
    for (let i = 0; i < favorites.length; i++) {
      const fav = favorites[i];
      const cls = this._findById(classmates, fav.classmate_id);
      if (cls) {
        results.push({
          id: cls.id,
          first_name: cls.first_name,
          last_name: cls.last_name,
          maiden_name: cls.maiden_name || '',
          class_year: cls.class_year,
          location_display: cls.location_display || '',
          is_attending_reunion: !!cls.is_attending_reunion
        });
      }
    }
    return results;
  }

  // ----------------------
  // getVolunteerPageContext
  // ----------------------

  getVolunteerPageContext() {
    const shifts = this._getFromStorage('volunteer_shifts').map(s => ({
      id: s.id,
      role_name: s.role_name,
      description: s.description || '',
      location: s.location || '',
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      duration_hours: s.duration_hours,
      spots_remaining: typeof s.spots_remaining === 'number' ? s.spots_remaining : null,
      is_active: s.is_active !== false
    }));

    const schedule = this._getOrCreateVolunteerSchedule();
    const items = this._getFromStorage('volunteer_schedule_items');

    const selected_shift_ids = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].volunteer_schedule_id === schedule.id) {
        selected_shift_ids.push(items[i].shift_id);
      }
    }

    const summary = this._recalculateVolunteerScheduleSummary(schedule.id);

    return {
      shifts,
      selected_shift_ids,
      schedule_summary: {
        total_duration_hours: summary.total_duration_hours,
        shift_count: summary.shift_count,
        recommended_min_hours: summary.recommended_min_hours,
        recommended_max_hours: summary.recommended_max_hours,
        meets_recommended_range: summary.meets_recommended_range
      }
    };
  }

  // ----------------------
  // toggleVolunteerShiftSelection
  // ----------------------

  toggleVolunteerShiftSelection(shift_id, action) {
    const schedule = this._getOrCreateVolunteerSchedule();
    let items = this._getFromStorage('volunteer_schedule_items');
    const shifts = this._getFromStorage('volunteer_shifts');
    const shift = this._findById(shifts, shift_id);
    if (!shift) {
      const summaryMissing = this._recalculateVolunteerScheduleSummary(schedule.id);
      return {
        selected_shift_ids: [],
        schedule_summary: {
          total_duration_hours: summaryMissing.total_duration_hours,
          shift_count: summaryMissing.shift_count,
          meets_recommended_range: summaryMissing.meets_recommended_range
        },
        overlap_warning: null
      };
    }

    const now = new Date().toISOString();

    if (action === 'add') {
      const exists = items.some(i => i.volunteer_schedule_id === schedule.id && i.shift_id === shift_id);
      if (!exists) {
        items.push({
          id: this._generateId('volitem'),
          volunteer_schedule_id: schedule.id,
          shift_id,
          added_at: now
        });
      }
    } else if (action === 'remove') {
      items = items.filter(i => !(i.volunteer_schedule_id === schedule.id && i.shift_id === shift_id));
    }

    this._saveToStorage('volunteer_schedule_items', items);

    const summary = this._recalculateVolunteerScheduleSummary(schedule.id);

    const selected_shift_ids = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].volunteer_schedule_id === schedule.id) {
        selected_shift_ids.push(items[i].shift_id);
      }
    }

    return {
      selected_shift_ids,
      schedule_summary: {
        total_duration_hours: summary.total_duration_hours,
        shift_count: summary.shift_count,
        meets_recommended_range: summary.meets_recommended_range
      },
      overlap_warning: summary.overlap_warning
    };
  }

  // ----------------------
  // confirmVolunteerSchedule
  // ----------------------

  confirmVolunteerSchedule() {
    const schedule = this._getOrCreateVolunteerSchedule();
    const summary = this._recalculateVolunteerScheduleSummary(schedule.id);

    if (summary.total_duration_hours < 2 || summary.total_duration_hours > 3) {
      return {
        success: false,
        message: 'Total volunteer hours must be between 2 and 3 before confirming.',
        schedule: {
          total_duration_hours: summary.total_duration_hours,
          shifts: []
        }
      };
    }

    const items = this._getFromStorage('volunteer_schedule_items');
    const shifts = this._getFromStorage('volunteer_shifts');

    const selectedItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].volunteer_schedule_id === schedule.id) {
        selectedItems.push(items[i]);
      }
    }

    const shiftDetails = [];
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const shift = this._findById(shifts, item.shift_id);
      if (shift) {
        shiftDetails.push({
          shift_id: shift.id,
          role_name: shift.role_name,
          start_datetime: shift.start_datetime,
          end_datetime: shift.end_datetime,
          duration_hours: shift.duration_hours,
          // foreign key resolution
          shift: shift
        });
      }
    }

    schedule.total_duration_hours = summary.total_duration_hours;
    schedule.updated_at = new Date().toISOString();
    const schedules = this._getFromStorage('volunteer_schedules');
    if (schedules.length === 0) {
      schedules.push(schedule);
    } else {
      schedules[0] = schedule;
    }
    this._saveToStorage('volunteer_schedules', schedules);

    return {
      success: true,
      message: 'Volunteer schedule confirmed.',
      schedule: {
        total_duration_hours: summary.total_duration_hours,
        shifts: shiftDetails
      }
    };
  }

  // ----------------------
  // getSeatingOverview
  // ----------------------

  getSeatingOverview(only_tables_with_favorites, min_open_seats) {
    const tables = this._getFromStorage('tables');
    const reservations = this._getFromStorage('table_reservations');
    const seats = this._getFromStorage('seats');

    let filteredTables = [];
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      if (t.is_active === false) continue;
      if (only_tables_with_favorites && !t.has_favorite_classmate) continue;
      if (typeof min_open_seats === 'number' && t.open_seat_count < min_open_seats) continue;
      filteredTables.push({
        id: t.id,
        name: t.name || '',
        table_number: t.table_number,
        section: t.section || '',
        capacity: t.capacity,
        open_seat_count: t.open_seat_count,
        has_favorite_classmate: !!t.has_favorite_classmate,
        is_active: t.is_active !== false
      });
    }

    let current_reservation = null;
    if (reservations.length > 0) {
      const res = reservations[0];
      const table = this._findById(tables, res.table_id);
      const selfSeat = this._findById(seats, res.self_seat_id);
      const guestSeat = this._findById(seats, res.guest_seat_id);
      current_reservation = {
        table_id: res.table_id,
        table_name: table ? table.name || '' : '',
        self_seat_id: res.self_seat_id,
        guest_seat_id: res.guest_seat_id || null,
        // foreign key resolutions
        table: table || null,
        self_seat: selfSeat || null,
        guest_seat: guestSeat || null
      };
    }

    return {
      tables: filteredTables,
      current_reservation
    };
  }

  // ----------------------
  // getTableDetail
  // ----------------------

  getTableDetail(table_id) {
    const tables = this._getFromStorage('tables');
    const seats = this._getFromStorage('seats');
    const classmates = this._getFromStorage('classmates');

    const table = this._findById(tables, table_id);
    const tableSeats = [];
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      if (s.table_id === table_id) {
        const occupantClassmate = this._findById(classmates, s.occupant_classmate_id);
        tableSeats.push({
          id: s.id,
          seat_number: s.seat_number,
          status: s.status,
          occupant_type: s.occupant_type,
          occupant_name: s.occupant_name || '',
          is_favorite_classmate: !!s.is_favorite_classmate,
          is_user_seat: !!s.is_user_seat,
          is_guest_seat: !!s.is_guest_seat,
          occupant_classmate_id: s.occupant_classmate_id || null,
          // foreign key resolution
          occupant_classmate: occupantClassmate || null
        });
      }
    }

    return {
      table: table
        ? {
            id: table.id,
            name: table.name || '',
            table_number: table.table_number,
            section: table.section || '',
            capacity: table.capacity,
            open_seat_count: table.open_seat_count,
            has_favorite_classmate: !!table.has_favorite_classmate
          }
        : null,
      seats: tableSeats
    };
  }

  // ----------------------
  // reserveTableSeats
  // ----------------------

  reserveTableSeats(table_id, self_seat_id, guest_seat_id) {
    const tables = this._getFromStorage('tables');
    const seats = this._getFromStorage('seats');
    let reservations = this._getFromStorage('table_reservations');

    const table = this._findById(tables, table_id);
    if (!table || table.is_active === false) {
      return { success: false, message: 'Invalid or inactive table.', reservation: null };
    }

    const selfSeat = this._findById(seats, self_seat_id);
    if (!selfSeat || selfSeat.table_id !== table_id || selfSeat.status !== 'available') {
      return { success: false, message: 'Selected seat for self is not available.', reservation: null };
    }

    let guestSeat = null;
    if (guest_seat_id) {
      guestSeat = this._findById(seats, guest_seat_id);
      if (!guestSeat || guestSeat.table_id !== table_id || guestSeat.status !== 'available') {
        return { success: false, message: 'Selected seat for guest is not available.', reservation: null };
      }
    }

    // Clear any previous reservation
    if (reservations.length > 0) {
      const existing = reservations[0];
      for (let i = 0; i < seats.length; i++) {
        const s = seats[i];
        if (s.id === existing.self_seat_id || s.id === existing.guest_seat_id) {
          s.status = 'available';
          s.is_user_seat = false;
          s.is_guest_seat = false;
          if (s.occupant_type === 'self' || s.occupant_type === 'guest') {
            s.occupant_type = 'none';
            s.occupant_name = '';
          }
        }
      }
      this._saveToStorage('seats', seats);
      this._recalculateTableOpenSeats(existing.table_id);
    }

    // Reserve new seats
    selfSeat.status = 'reserved';
    selfSeat.is_user_seat = true;
    selfSeat.occupant_type = 'self';

    if (guestSeat) {
      guestSeat.status = 'reserved';
      guestSeat.is_guest_seat = true;
      guestSeat.occupant_type = 'guest';
    }

    this._saveToStorage('seats', seats);
    this._recalculateTableOpenSeats(table_id);

    const now = new Date().toISOString();
    let reservation;
    if (reservations.length === 0) {
      reservation = {
        id: this._generateId('tres'),
        table_id,
        self_seat_id,
        guest_seat_id: guestSeat ? guestSeat.id : null,
        reserved_at: now
      };
      reservations.push(reservation);
    } else {
      reservation = reservations[0];
      reservation.table_id = table_id;
      reservation.self_seat_id = self_seat_id;
      reservation.guest_seat_id = guestSeat ? guestSeat.id : null;
      reservation.reserved_at = now;
      reservations[0] = reservation;
    }
    this._saveToStorage('table_reservations', reservations);

    return {
      success: true,
      message: 'Seats reserved successfully.',
      reservation: {
        table_id: table.id,
        table_name: table.name || '',
        self_seat: {
          seat_id: selfSeat.id,
          seat_number: selfSeat.seat_number
        },
        guest_seat: guestSeat
          ? {
              seat_id: guestSeat.id,
              seat_number: guestSeat.seat_number
            }
          : null,
        // foreign key resolutions
        table: table,
        self_seat_full: selfSeat,
        guest_seat_full: guestSeat || null
      }
    };
  }

  // ----------------------
  // getMyTableReservation
  // ----------------------

  getMyTableReservation() {
    const reservations = this._getFromStorage('table_reservations');
    if (reservations.length === 0) {
      return {
        has_reservation: false,
        table_id: null,
        table_name: '',
        self_seat_number: null,
        guest_seat_number: null
      };
    }
    const res = reservations[0];
    const tables = this._getFromStorage('tables');
    const seats = this._getFromStorage('seats');
    const table = this._findById(tables, res.table_id);
    const selfSeat = this._findById(seats, res.self_seat_id);
    const guestSeat = this._findById(seats, res.guest_seat_id);

    return {
      has_reservation: true,
      table_id: res.table_id,
      table_name: table ? table.name || '' : '',
      self_seat_number: selfSeat ? selfSeat.seat_number : null,
      guest_seat_number: guestSeat ? guestSeat.seat_number : null,
      // foreign key resolutions
      table: table || null,
      self_seat: selfSeat || null,
      guest_seat: guestSeat || null
    };
  }

  // ----------------------
  // getDonationPageContext
  // ----------------------

  getDonationPageContext() {
    const fundsRaw = this._getFromStorage('donation_funds');
    const funds = fundsRaw.map(f => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description || ''
    }));

    const visibility_options = [
      { value: 'public', label: 'Show name and amount', description: 'Your name and donation amount will be visible to classmates.' },
      { value: 'amount_only', label: 'Show amount only', description: 'Only your donation amount will be visible; your name will be hidden.' },
      { value: 'anonymous', label: 'Fully anonymous', description: 'Neither your name nor amount will be visible.' }
    ];

    const payment_method_options = [
      { value: 'pay_at_event', label: 'Pay at event' },
      { value: 'pay_later', label: 'Pay later / pledge' },
      { value: 'credit_card', label: 'Credit card' }
    ];

    const suggested_amount_range = { min: 30, max: 50 };

    const donations = this._getFromStorage('donations');
    let last_donation = null;
    if (donations.length > 0) {
      const sorted = donations
        .slice()
        .sort((a, b) => {
          const t1 = new Date(a.created_at).getTime();
          const t2 = new Date(b.created_at).getTime();
          return t2 - t1;
        });
      const last = sorted[0];
      const fund = this._findById(fundsRaw, last.fund_id);
      last_donation = {
        amount: last.amount,
        fund_name: fund ? fund.name : '',
        status: last.status,
        created_at: last.created_at
      };
    }

    return {
      funds,
      visibility_options,
      payment_method_options,
      suggested_amount_range,
      last_donation
    };
  }

  // ----------------------
  // submitDonation
  // ----------------------

  submitDonation(amount, fund_id, visibility, dedication, payment_method) {
    const funds = this._getFromStorage('donation_funds');
    const fund = this._findById(funds, fund_id);
    if (!fund) {
      return { success: false, message: 'Invalid donation fund selected.', donation: null };
    }

    if (typeof amount !== 'number' || !(amount > 0)) {
      return { success: false, message: 'Donation amount must be a positive number.', donation: null };
    }

    const visibilityValues = ['public', 'amount_only', 'anonymous'];
    if (visibilityValues.indexOf(visibility) === -1) {
      return { success: false, message: 'Invalid visibility option.', donation: null };
    }

    const paymentValues = ['pay_at_event', 'pay_later', 'credit_card'];
    if (paymentValues.indexOf(payment_method) === -1) {
      return { success: false, message: 'Invalid payment method.', donation: null };
    }

    let status = 'pending';
    if (payment_method === 'credit_card') {
      status = 'confirmed';
    }

    const now = new Date().toISOString();
    const donations = this._getFromStorage('donations');
    const donationRecord = {
      id: this._generateId('don'),
      amount,
      fund_id,
      visibility,
      dedication: dedication || '',
      payment_method,
      status,
      created_at: now,
      updated_at: now
    };
    donations.push(donationRecord);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      message: 'Donation submitted successfully.',
      donation: {
        id: donationRecord.id,
        amount: donationRecord.amount,
        fund_name: fund.name,
        visibility: donationRecord.visibility,
        payment_method: donationRecord.payment_method,
        status: donationRecord.status,
        // foreign key resolution
        fund: fund
      }
    };
  }

  // ----------------------
  // getScheduleFilters
  // ----------------------

  getScheduleFilters() {
    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const format_options = [
      { value: 'in_person', label: 'In-person' },
      { value: 'virtual', label: 'Virtual' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const time_filter_presets = [
      {
        key: 'after_5pm',
        label: 'After 5:00 PM',
        start_time_after: '17:00',
        start_time_before: null
      },
      {
        key: 'before_noon',
        label: 'Before 12:00 PM',
        start_time_after: null,
        start_time_before: '12:00'
      }
    ];

    return {
      day_options,
      format_options,
      time_filter_presets
    };
  }

  // ----------------------
  // getEventsForDay
  // ----------------------

  getEventsForDay(day_of_week, filters) {
    const events = this._getFromStorage('events');
    const schedule = this._getFromStorage('personal_schedules')[0] || null;
    const items = this._getFromStorage('personal_schedule_items');

    const scheduledEventIds = [];
    if (schedule) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].personal_schedule_id === schedule.id) {
          scheduledEventIds.push(items[i].event_id);
        }
      }
    }

    const formatFilter = filters && filters.format ? filters.format : null;
    const startAfter = filters && filters.start_time_after ? filters.start_time_after : null;
    const startBefore = filters && filters.start_time_before ? filters.start_time_before : null;

    const parseHHMM = function (str) {
      if (!str) return null;
      const parts = str.split(':');
      if (parts.length !== 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const afterMinutes = parseHHMM(startAfter);
    const beforeMinutes = parseHHMM(startBefore);

    const results = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.day_of_week !== day_of_week) continue;
      if (formatFilter && e.format !== formatFilter) continue;

      if (afterMinutes != null || beforeMinutes != null) {
        const t = this._parseTimeFromIso(e.start_datetime);
        if (t) {
          const mins = this._timeToMinutes(t.hours, t.minutes);
          if (afterMinutes != null && mins <= afterMinutes) continue;
          if (beforeMinutes != null && mins >= beforeMinutes) continue;
        }
      }

      results.push({
        id: e.id,
        name: e.name,
        description: e.description || '',
        day_of_week: e.day_of_week,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        location: e.location || '',
        format: e.format,
        is_in_person: e.format === 'in_person',
        is_in_my_schedule: scheduledEventIds.indexOf(e.id) !== -1
      });
    }

    return results;
  }

  // ----------------------
  // addEventToMySchedule
  // ----------------------

  addEventToMySchedule(event_id) {
    const events = this._getFromStorage('events');
    const event = this._findById(events, event_id);
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        schedule_summary: {
          total_events: 0,
          events_by_day: { friday: 0, saturday: 0, sunday: 0 }
        }
      };
    }

    const schedule = this._getOrCreatePersonalSchedule();
    let items = this._getFromStorage('personal_schedule_items');

    const exists = items.some(i => i.personal_schedule_id === schedule.id && i.event_id === event_id);
    if (!exists) {
      items.push({
        id: this._generateId('psitem'),
        personal_schedule_id: schedule.id,
        event_id,
        added_at: new Date().toISOString()
      });
      this._saveToStorage('personal_schedule_items', items);
    }

    return this._buildPersonalScheduleSummary();
  }

  // ----------------------
  // removeEventFromMySchedule
  // ----------------------

  removeEventFromMySchedule(event_id) {
    const schedule = this._getOrCreatePersonalSchedule();
    let items = this._getFromStorage('personal_schedule_items');
    items = items.filter(i => !(i.personal_schedule_id === schedule.id && i.event_id === event_id));
    this._saveToStorage('personal_schedule_items', items);

    const summary = this._buildPersonalScheduleSummary();
    return {
      success: true,
      schedule_summary: summary.schedule_summary
    };
  }

  // Helper: build personal schedule summary
  _buildPersonalScheduleSummary() {
    const events = this._getFromStorage('events');
    const schedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items');

    const relevantItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].personal_schedule_id === schedule.id) {
        relevantItems.push(items[i]);
      }
    }

    const events_by_day = { friday: 0, saturday: 0, sunday: 0 };
    for (let i = 0; i < relevantItems.length; i++) {
      const ev = this._findById(events, relevantItems[i].event_id);
      if (ev && events_by_day.hasOwnProperty(ev.day_of_week)) {
        events_by_day[ev.day_of_week] += 1;
      }
    }

    return {
      success: true,
      message: 'Schedule updated.',
      schedule_summary: {
        total_events: relevantItems.length,
        events_by_day
      }
    };
  }

  // ----------------------
  // getMySchedule
  // ----------------------

  getMySchedule() {
    const events = this._getFromStorage('events');
    const schedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items');

    const events_by_day = { friday: [], saturday: [], sunday: [] };
    let total_events = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.personal_schedule_id !== schedule.id) continue;
      const ev = this._findById(events, item.event_id);
      if (!ev) continue;
      const entry = {
        event_id: ev.id,
        name: ev.name,
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime,
        location: ev.location || ''
      };
      if (events_by_day.hasOwnProperty(ev.day_of_week)) {
        events_by_day[ev.day_of_week].push(entry);
        total_events++;
      }
    }

    return {
      events_by_day,
      total_events
    };
  }

  // ----------------------
  // getHotelFilterOptions
  // ----------------------

  getHotelFilterOptions() {
    const hotels = this._getFromStorage('hotels');
    let max_rate_default = 150;
    let max_rate_allowed = 500;
    if (hotels.length > 0) {
      max_rate_default = hotels[0].nightly_rate;
      max_rate_allowed = hotels[0].nightly_rate;
      for (let i = 1; i < hotels.length; i++) {
        const rate = hotels[i].nightly_rate;
        if (typeof rate === 'number') {
          if (rate > max_rate_allowed) max_rate_allowed = rate;
          if (rate < max_rate_default) max_rate_default = rate;
        }
      }
    }

    const distance_options = [1, 2, 5, 10, 25];

    const amenity_options = [
      { key: 'free_breakfast', label: 'Free breakfast' },
      { key: 'free_wifi', label: 'Free Wi-Fi' },
      { key: 'parking', label: 'Parking' }
    ];

    const reunion_info = this._getFromStorage('reunion_info');
    const info = reunion_info.length > 0 ? reunion_info[0] : null;

    return {
      max_rate_default,
      max_rate_allowed,
      distance_options,
      amenity_options,
      reunion_dates: {
        start_date: info ? info.start_date : '',
        end_date: info ? info.end_date : ''
      }
    };
  }

  // ----------------------
  // searchHotels
  // ----------------------

  searchHotels(filters) {
    const hotels = this._getFromStorage('hotels');
    const f = filters || {};

    const results = [];
    for (let i = 0; i < hotels.length; i++) {
      const h = hotels[i];
      if (typeof f.max_nightly_rate === 'number' && h.nightly_rate > f.max_nightly_rate) continue;
      if (f.has_free_breakfast && !h.has_free_breakfast) continue;
      if (typeof f.max_distance_miles === 'number' && h.distance_miles > f.max_distance_miles) continue;
      if (f.is_recommended_only && !h.is_recommended) continue;
      results.push({
        id: h.id,
        name: h.name,
        nightly_rate: h.nightly_rate,
        distance_miles: h.distance_miles,
        has_free_breakfast: !!h.has_free_breakfast,
        is_recommended: !!h.is_recommended,
        address: h.address || '',
        city: h.city || '',
        state: h.state || '',
        zip_code: h.zip_code || ''
      });
    }

    return {
      results,
      total_count: results.length
    };
  }

  // ----------------------
  // getHotelDetails
  // ----------------------

  getHotelDetails(hotel_id) {
    const hotels = this._getFromStorage('hotels');
    const h = this._findById(hotels, hotel_id);
    if (!h) return null;
    return {
      id: h.id,
      name: h.name,
      nightly_rate: h.nightly_rate,
      distance_miles: h.distance_miles,
      has_free_breakfast: !!h.has_free_breakfast,
      is_recommended: !!h.is_recommended,
      amenities: Array.isArray(h.amenities) ? h.amenities : [],
      address: h.address || '',
      city: h.city || '',
      state: h.state || '',
      zip_code: h.zip_code || '',
      phone: h.phone || '',
      website_url: h.website_url || '',
      description: h.description || '',
      image_url: h.image_url || ''
    };
  }

  // ----------------------
  // saveTripHotel
  // ----------------------

  saveTripHotel(hotel_id, check_in_date, check_out_date, notes) {
    const hotels = this._getFromStorage('hotels');
    const hotel = this._findById(hotels, hotel_id);
    if (!hotel) {
      return { success: false, message: 'Hotel not found.', trip: null };
    }

    if (!check_in_date || !check_out_date) {
      return { success: false, message: 'Check-in and check-out dates are required.', trip: null };
    }

    const inDate = new Date(check_in_date);
    const outDate = new Date(check_out_date);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
      return { success: false, message: 'Check-out date must be after check-in date.', trip: null };
    }

    let trips = this._getFromStorage('trips');
    let trip = trips.length > 0 ? trips[0] : null;
    const now = new Date().toISOString();

    if (!trip) {
      trip = {
        id: this._generateId('trip'),
        created_at: now
      };
      trips.push(trip);
    }

    trip.hotel_id = hotel_id;
    trip.check_in_date = check_in_date;
    trip.check_out_date = check_out_date;
    trip.notes = notes || '';
    trip.updated_at = now;

    if (trips.length === 0) {
      trips.push(trip);
    } else {
      trips[0] = trip;
    }
    this._saveToStorage('trips', trips);

    return {
      success: true,
      message: 'Trip details saved.',
      trip: {
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        nightly_rate: hotel.nightly_rate,
        distance_miles: hotel.distance_miles,
        check_in_date: trip.check_in_date,
        check_out_date: trip.check_out_date,
        notes: trip.notes,
        // foreign key resolution
        hotel: hotel
      }
    };
  }

  // ----------------------
  // getMyTrip
  // ----------------------

  getMyTrip() {
    const trips = this._getFromStorage('trips');
    if (trips.length === 0) {
      return { has_trip: false, trip: null };
    }
    const trip = trips[0];
    const hotels = this._getFromStorage('hotels');
    const hotel = this._findById(hotels, trip.hotel_id);

    return {
      has_trip: !!hotel,
      trip: hotel
        ? {
            hotel: {
              id: hotel.id,
              name: hotel.name,
              nightly_rate: hotel.nightly_rate,
              distance_miles: hotel.distance_miles,
              address: hotel.address || '',
              city: hotel.city || '',
              state: hotel.state || ''
            },
            check_in_date: trip.check_in_date,
            check_out_date: trip.check_out_date,
            notes: trip.notes || ''
          }
        : null
    };
  }

  // ----------------------
  // updateTripDates
  // ----------------------

  updateTripDates(check_in_date, check_out_date) {
    let trips = this._getFromStorage('trips');
    if (trips.length === 0) {
      return { success: false, trip: { check_in_date: '', check_out_date: '' } };
    }

    const inDate = new Date(check_in_date);
    const outDate = new Date(check_out_date);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
      return { success: false, trip: { check_in_date: trips[0].check_in_date, check_out_date: trips[0].check_out_date } };
    }

    const trip = trips[0];
    trip.check_in_date = check_in_date;
    trip.check_out_date = check_out_date;
    trip.updated_at = new Date().toISOString();
    trips[0] = trip;
    this._saveToStorage('trips', trips);

    return {
      success: true,
      trip: {
        check_in_date: trip.check_in_date,
        check_out_date: trip.check_out_date
      }
    };
  }

  // ----------------------
  // removeTripHotel
  // ----------------------

  removeTripHotel() {
    this._saveToStorage('trips', []);
    return {
      success: true,
      message: 'Trip hotel removed.'
    };
  }

  // ----------------------
  // getDiscussionCategories
  // ----------------------

  getDiscussionCategories() {
    const cats = this._getFromStorage('discussion_categories');
    return cats.map(c => ({
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description || '',
      display_order: typeof c.display_order === 'number' ? c.display_order : 0
    }));
  }

  // ----------------------
  // getTopicsForCategory
  // ----------------------

  getTopicsForCategory(category_id, search_query, page, page_size) {
    const categories = this._getFromStorage('discussion_categories');
    const category = this._findById(categories, category_id);
    const topicsAll = this._getFromStorage('topics');

    const q = search_query ? search_query.toLowerCase() : null;
    const filtered = [];
    for (let i = 0; i < topicsAll.length; i++) {
      const t = topicsAll[i];
      if (t.category_id !== category_id) continue;
      if (q && (!t.title || t.title.toLowerCase().indexOf(q) === -1)) continue;
      filtered.push(t);
    }

    filtered.sort((a, b) => {
      const t1 = new Date(a.last_activity_at || a.created_at).getTime();
      const t2 = new Date(b.last_activity_at || b.created_at).getTime();
      return t2 - t1;
    });

    const total_count = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const topics = pageItems.map(t => ({
      id: t.id,
      title: t.title,
      body_preview: typeof t.body === 'string' && t.body.length > 120 ? t.body.slice(0, 117) + '...' : t.body || '',
      reply_count: typeof t.reply_count === 'number' ? t.reply_count : 0,
      created_at: t.created_at,
      last_activity_at: t.last_activity_at || t.created_at
    }));

    return {
      category: category
        ? {
            id: category.id,
            key: category.key,
            name: category.name
          }
        : null,
      topics,
      total_count
    };
  }

  // ----------------------
  // createTopic
  // ----------------------

  createTopic(category_id, title, body) {
    const categories = this._getFromStorage('discussion_categories');
    const category = this._findById(categories, category_id);
    if (!category) {
      return { success: false, message: 'Invalid discussion category.', topic: null };
    }

    if (!title || !body) {
      return { success: false, message: 'Title and body are required.', topic: null };
    }

    const wc = this._wordCount(body);
    if (category.key === 'memories' && wc < 30) {
      return { success: false, message: 'Memory posts should be at least 30 words.', topic: null };
    }

    const now = new Date().toISOString();
    const topics = this._getFromStorage('topics');
    const topic = {
      id: this._generateId('topic'),
      category_id,
      title,
      body,
      word_count: wc,
      reply_count: 0,
      created_at: now,
      last_activity_at: now
    };
    topics.push(topic);
    this._saveToStorage('topics', topics);

    return {
      success: true,
      message: 'Topic created successfully.',
      topic: {
        id: topic.id,
        title: topic.title,
        body: topic.body,
        word_count: topic.word_count,
        created_at: topic.created_at
      }
    };
  }

  // ----------------------
  // getTopicDetail
  // ----------------------

  getTopicDetail(topic_id) {
    const topics = this._getFromStorage('topics');
    const replies = this._getFromStorage('replies');
    const topic = this._findById(topics, topic_id);

    const topicReplies = [];
    for (let i = 0; i < replies.length; i++) {
      const r = replies[i];
      if (r.topic_id === topic_id) {
        topicReplies.push({
          id: r.id,
          body: r.body,
          created_at: r.created_at
        });
      }
    }

    return {
      topic: topic
        ? {
            id: topic.id,
            title: topic.title,
            body: topic.body,
            word_count: topic.word_count || this._wordCount(topic.body),
            created_at: topic.created_at
          }
        : null,
      replies: topicReplies,
      reply_count: topicReplies.length
    };
  }

  // ----------------------
  // postReply
  // ----------------------

  postReply(topic_id, body) {
    const topics = this._getFromStorage('topics');
    const topic = this._findById(topics, topic_id);
    if (!topic) {
      return { success: false, message: 'Topic not found.', reply: null, reply_count: 0 };
    }

    if (!body || !body.trim()) {
      return { success: false, message: 'Reply body is required.', reply: null, reply_count: topic.reply_count || 0 };
    }

    const now = new Date().toISOString();
    const replies = this._getFromStorage('replies');
    const reply = {
      id: this._generateId('reply'),
      topic_id,
      body,
      created_at: now
    };
    replies.push(reply);
    this._saveToStorage('replies', replies);

    topic.reply_count = (topic.reply_count || 0) + 1;
    topic.last_activity_at = now;
    for (let i = 0; i < topics.length; i++) {
      if (topics[i].id === topic.id) {
        topics[i] = topic;
        break;
      }
    }
    this._saveToStorage('topics', topics);

    return {
      success: true,
      message: 'Reply posted.',
      reply: {
        id: reply.id,
        body: reply.body,
        created_at: reply.created_at
      },
      reply_count: topic.reply_count
    };
  }

  // ----------------------
  // getAboutReunionContent
  // ----------------------

  getAboutReunionContent() {
    const infos = this._getFromStorage('reunion_info');
    const info = infos.length > 0 ? infos[0] : null;

    return {
      headline: info ? info.name : '',
      intro_text: '',
      highlights: [],
      reunion_info: info
        ? {
            name: info.name,
            class_year: info.class_year,
            start_date: info.start_date,
            end_date: info.end_date,
            venue_name: info.venue_name,
            venue_address: info.venue_address || ''
          }
        : {
            name: '',
            class_year: '',
            start_date: '',
            end_date: '',
            venue_name: '',
            venue_address: ''
          }
    };
  }

  // ----------------------
  // getContactSupportInfo
  // ----------------------

  getContactSupportInfo() {
    const infos = this._getFromStorage('reunion_info');
    const info = infos.length > 0 ? infos[0] : null;

    const helpful_links = [
      { label: 'Register / RSVP', page_key: 'register' },
      { label: 'Event Schedule', page_key: 'schedule' },
      { label: 'FAQ & Help', page_key: 'faq' },
      { label: 'Seating & Tables', page_key: 'seating' },
      { label: 'Discussion Board', page_key: 'discussion_board' }
    ];

    return {
      main_contact_email: info ? info.main_contact_email || '' : '',
      main_contact_phone: info ? info.main_contact_phone || '' : '',
      additional_contacts: [],
      helpful_links
    };
  }

  // ----------------------
  // submitContactMessage
  // ----------------------

  submitContactMessage(subject, message, email, phone) {
    if (!subject || !message) {
      return {
        success: false,
        message_id: null,
        confirmation_text: 'Subject and message are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');
    const now = new Date().toISOString();
    messages.push({
      id,
      subject,
      message,
      email: email || '',
      phone: phone || '',
      status: 'new',
      created_at: now
    });
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: id,
      confirmation_text: 'Your message has been received.'
    };
  }

  // ----------------------
  // getFaqItems
  // ----------------------

  getFaqItems(category) {
    const items = this._getFromStorage('faq_items');
    const filtered = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (category && it.category !== category) continue;
      filtered.push(it);
    }

    filtered.sort((a, b) => {
      const da = typeof a.display_order === 'number' ? a.display_order : 0;
      const db = typeof b.display_order === 'number' ? b.display_order : 0;
      return da - db;
    });

    return filtered.map(it => ({
      id: it.id,
      question: it.question,
      answer: it.answer,
      category: it.category,
      display_order: typeof it.display_order === 'number' ? it.display_order : 0
    }));
  }

  // ----------------------
  // getPolicyDocument
  // ----------------------

  getPolicyDocument(key) {
    const docs = this._getFromStorage('policy_documents');
    const doc = docs.find(d => d.key === key) || null;
    if (!doc) {
      return {
        id: null,
        key,
        title: '',
        content: '',
        last_updated: ''
      };
    }
    return {
      id: doc.id,
      key: doc.key,
      title: doc.title,
      content: doc.content,
      last_updated: doc.last_updated || ''
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
