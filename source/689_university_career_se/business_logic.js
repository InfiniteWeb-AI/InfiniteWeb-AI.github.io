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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure('events', []); // Event
    ensure('saved_events_state', []); // SavedEvent
    ensure('scheduled_events', []); // ScheduledEvent
    ensure('event_registrations', []); // EventRegistration
    ensure('appointment_slots', []); // AppointmentSlot
    ensure('appointments', []); // Appointment
    ensure('employers', []); // Employer
    ensure('career_fair_employers', []); // CareerFairEmployer
    ensure('visit_lists', []); // VisitList
    ensure('visit_list_items', []); // VisitListItem

    // Content / config tables (no mock domain data, just empty shells)
    ensure('about_content', { headline: '', sections: [] });
    ensure('contact_info', {
      officeLocation: '',
      phoneNumbers: [],
      emailAddresses: [],
      officeHours: ''
    });
    ensure('help_articles', []);
    ensure('policies', []);
    ensure('contact_form_submissions', []);

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
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

  // ----------------------
  // Generic helpers
  // ----------------------

  _parseDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDatePart(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _getDayOfWeekString(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _eventMatchesDateFilter(event, dateFilter) {
    if (!dateFilter || !dateFilter.mode) return true;
    const start = this._parseDateTime(event.start_datetime);
    if (!start) return false;

    if (dateFilter.mode === 'specific_date') {
      if (!dateFilter.specificDate) return true;
      const eventDate = this._formatDatePart(start);
      return eventDate === dateFilter.specificDate;
    }

    if (dateFilter.mode === 'date_range') {
      if (!dateFilter.startDate && !dateFilter.endDate) return true;
      const startDate = dateFilter.startDate ? new Date(dateFilter.startDate + 'T00:00:00') : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate + 'T23:59:59.999') : null;
      if (startDate && start < startDate) return false;
      if (endDate && start > endDate) return false;
      return true;
    }

    if (dateFilter.mode === 'preset') {
      const now = new Date();
      let rangeStart = null;
      let rangeEnd = null;
      if (dateFilter.preset === 'today') {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (dateFilter.preset === 'tomorrow') {
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        rangeStart = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
        rangeEnd = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
      } else if (dateFilter.preset === 'next_week') {
        const day = now.getDay(); // 0=Sun
        let delta = (1 + 7 - day) % 7; // days until Monday
        if (delta === 0) delta = 7; // next week, not this
        const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta, 0, 0, 0, 0);
        rangeStart = nextMonday;
        rangeEnd = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 6, 23, 59, 59, 999);
      } else if (dateFilter.preset === 'this_month') {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateFilter.preset === 'next_30_days') {
        rangeStart = now;
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);
      } else if (dateFilter.preset === 'next_month') {
        const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        rangeStart = firstNextMonth;
        rangeEnd = new Date(firstNextMonth.getFullYear(), firstNextMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      }
      if (!rangeStart || !rangeEnd) return true;
      return start >= rangeStart && start <= rangeEnd;
    }

    if (dateFilter.mode === 'term') {
      if (!dateFilter.term) return true;
      return event.term === dateFilter.term;
    }

    return true;
  }

  _eventMatchesTimeOfDay(event, timeOfDayRange) {
    if (!timeOfDayRange || !timeOfDayRange.startTime) return true;
    const start = this._parseDateTime(event.start_datetime);
    if (!start) return false;
    const minutes = start.getHours() * 60 + start.getMinutes();
    const startMinutes = this._timeStringToMinutes(timeOfDayRange.startTime);
    const endMinutes = this._timeStringToMinutes(timeOfDayRange.endTime);
    if (startMinutes != null && minutes < startMinutes) return false;
    if (endMinutes != null && minutes > endMinutes) return false;
    return true;
  }

  _eventMatchesDayOfWeek(event, dayOfWeekArray) {
    if (!dayOfWeekArray || !dayOfWeekArray.length) return true;
    const start = this._parseDateTime(event.start_datetime);
    if (!start) return false;
    const day = this._getDayOfWeekString(start);
    return dayOfWeekArray.includes(day);
  }

  _eventMatchesStemFocus(event, isStemFocus) {
    if (!isStemFocus) return true;
    if (event.is_stem_focus) return true;
    const stemIndustries = ['stem', 'technology', 'engineering'];
    if (event.primary_industry && stemIndustries.includes(event.primary_industry)) return true;
    if (Array.isArray(event.industries)) {
      const lower = event.industries.map((v) => String(v).toLowerCase());
      if (lower.some((v) => stemIndustries.includes(v))) return true;
    }
    return false;
  }

  _getCurrentSemester() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    let termName;
    if (month >= 1 && month <= 5) {
      termName = 'spring';
    } else if (month >= 6 && month <= 8) {
      termName = 'summer';
    } else {
      termName = 'fall';
    }
    const supported = ['spring_2024', 'fall_2024', 'spring_2025', 'summer_2025', 'fall_2025'];
    const candidate = `${termName}_${year}`;
    if (supported.includes(candidate)) return candidate;
    // Fallback: clamp to closest supported term by year
    const filtered = supported.filter((t) => t.endsWith(`_${year}`));
    if (filtered.length) return filtered[0];
    return supported[supported.length - 1];
  }

  _filterAppointmentsByDateAndTime(slots, dateFilter, timeOfDayRange) {
    return slots.filter((slot) => {
      const start = this._parseDateTime(slot.start_datetime);
      if (!start) return false;

      // Date
      if (dateFilter && dateFilter.mode) {
        if (dateFilter.mode === 'specific_date') {
          if (dateFilter.specificDate) {
            const dateStr = this._formatDatePart(start);
            if (dateStr !== dateFilter.specificDate) return false;
          }
        } else if (dateFilter.mode === 'date_range') {
          const startDate = dateFilter.startDate ? new Date(dateFilter.startDate + 'T00:00:00') : null;
          const endDate = dateFilter.endDate ? new Date(dateFilter.endDate + 'T23:59:59.999') : null;
          if (startDate && start < startDate) return false;
          if (endDate && start > endDate) return false;
        } else if (dateFilter.mode === 'preset' && dateFilter.preset === 'next_week') {
          const now = new Date();
          const day = now.getDay();
          let delta = (1 + 7 - day) % 7;
          if (delta === 0) delta = 7;
          const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta, 0, 0, 0, 0);
          const rangeStart = nextMonday;
          const rangeEnd = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 6, 23, 59, 59, 999);
          if (start < rangeStart || start > rangeEnd) return false;
        }
      }

      // Time-of-day
      if (timeOfDayRange && timeOfDayRange.startTime) {
        const minutes = start.getHours() * 60 + start.getMinutes();
        const startMinutes = this._timeStringToMinutes(timeOfDayRange.startTime);
        const endMinutes = this._timeStringToMinutes(timeOfDayRange.endTime);
        if (startMinutes != null && minutes < startMinutes) return false;
        if (endMinutes != null && minutes > endMinutes) return false;
      }

      return true;
    });
  }

  // ----------------------
  // Internal helpers: visit lists & scheduling
  // ----------------------

  _getOrCreateVisitListForEvent(eventId) {
    let visitLists = this._getFromStorage('visit_lists', []);
    let visitList = visitLists.find((vl) => vl.event_id === eventId) || null;
    const now = new Date().toISOString();
    if (!visitList) {
      visitList = {
        id: this._generateId('visit_list'),
        event_id: eventId,
        created_at: now,
        updated_at: now
      };
      visitLists.push(visitList);
      this._saveToStorage('visit_lists', visitLists);
    }
    return visitList;
  }

  _createScheduledEventOnRegistration(eventId) {
    const now = new Date().toISOString();
    let scheduledEvents = this._getFromStorage('scheduled_events', []);
    let scheduled = scheduledEvents.find((se) => se.event_id === eventId) || null;
    if (scheduled) {
      scheduled.is_registered = true;
      scheduled.source = scheduled.source || 'registration';
    } else {
      scheduled = {
        id: this._generateId('scheduled_event'),
        event_id: eventId,
        added_at: now,
        source: 'registration',
        is_registered: true
      };
      scheduledEvents.push(scheduled);
    }
    this._saveToStorage('scheduled_events', scheduledEvents);
    return scheduled;
  }

  _updateEventSpotsLeft(eventId, delta) {
    let events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event || typeof event.spots_left !== 'number') {
      return event || null;
    }
    const now = new Date().toISOString();
    event.spots_left = Math.max(0, event.spots_left + delta);
    event.updated_at = now;
    this._saveToStorage('events', events);
    return event;
  }

  // ----------------------
  // Interface: Home & static content
  // ----------------------

  // getHomeFeaturedContent(maxEvents?)
  getHomeFeaturedContent(maxEvents) {
    const limit = typeof maxEvents === 'number' ? maxEvents : 10;
    const events = this._getFromStorage('events', []);
    const now = new Date();
    const upcoming = events
      .filter((e) => {
        const start = this._parseDateTime(e.start_datetime);
        return start && start >= now;
      })
      .sort((a, b) => {
        const da = this._parseDateTime(a.start_datetime) || new Date(0);
        const db = this._parseDateTime(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, limit);

    const highlightCategories = [
      {
        key: 'practice_interviews',
        label: 'Practice & Mock Interviews',
        description: 'Virtual and in-person practice interview events to build your confidence.',
        relatedTags: ['practice interview', 'mock interview', 'practice_interview']
      },
      {
        key: 'first_generation_programs',
        label: 'First-Generation Student Programs',
        description: 'Events designed specifically to support first-generation students.',
        relatedTags: ['first-generation', 'first_generation_students']
      },
      {
        key: 'resume_review',
        label: 'Resume & CV Support',
        description: 'Workshops and appointments focused on resumes and CVs.',
        relatedTags: ['resume', 'cv', 'resume_review']
      }
    ];

    return {
      featuredEvents: upcoming,
      highlightCategories
    };
  }

  // getAboutContent()
  getAboutContent() {
    const content = this._getFromStorage('about_content', { headline: '', sections: [] });
    return {
      headline: content.headline || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      officeLocation: '',
      phoneNumbers: [],
      emailAddresses: [],
      officeHours: ''
    });
    return {
      officeLocation: info.officeLocation || '',
      phoneNumbers: Array.isArray(info.phoneNumbers) ? info.phoneNumbers : [],
      emailAddresses: Array.isArray(info.emailAddresses) ? info.emailAddresses : [],
      officeHours: info.officeHours || ''
    };
  }

  // submitContactForm(name, email, subject, message, topic)
  submitContactForm(name, email, subject, message, topic) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const now = new Date().toISOString();
    const submission = {
      id: this._generateId('contact_submission'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      submitted_at: now
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // getHelpArticles()
  getHelpArticles() {
    const articles = this._getFromStorage('help_articles', []);
    return {
      articles: Array.isArray(articles) ? articles : []
    };
  }

  // getPolicies()
  getPolicies() {
    const sections = this._getFromStorage('policies', []);
    return {
      sections: Array.isArray(sections) ? sections : []
    };
  }

  // ----------------------
  // Interface: Event filters & listing
  // ----------------------

  // getEventFilterOptions()
  getEventFilterOptions() {
    const eventTypes = [
      { value: 'workshop', label: 'Workshop' },
      { value: 'employer_info_session', label: 'Employer Info Session' },
      { value: 'employer_event', label: "Employer Event" },
      { value: 'networking', label: 'Networking Event' },
      { value: 'practice_interview', label: 'Practice Interview' },
      { value: 'career_fair', label: 'Career Fair' },
      { value: 'student_program', label: 'Student Program' }
    ];

    const formats = [
      { value: 'virtual', label: 'Virtual / Online' },
      { value: 'in_person', label: 'In Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const audiences = [
      { value: 'all_students', label: 'All Students' },
      { value: 'undergraduate_students', label: 'Undergraduate Students' },
      { value: 'graduate_students', label: 'Graduate Students' },
      { value: 'first_generation_students', label: 'First-Generation Students' },
      { value: 'international_students', label: 'International Students' },
      { value: 'alumni', label: 'Alumni' },
      { value: 'transfer_students', label: 'Transfer Students' }
    ];

    const datePresets = [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: 'next_week', label: 'Next Week' },
      { value: 'this_month', label: 'This Month' },
      { value: 'next_30_days', label: 'Next 30 Days' }
    ];

    const terms = [
      { value: 'spring_2024', label: 'Spring 2024' },
      { value: 'fall_2024', label: 'Fall 2024' },
      { value: 'spring_2025', label: 'Spring 2025' },
      { value: 'summer_2025', label: 'Summer 2025' },
      { value: 'fall_2025', label: 'Fall 2025' }
    ];

    const ratingThresholds = [3, 3.5, 4, 4.5, 5];

    const timeOfDayRanges = [
      {
        key: '9_00_am_to_12_00_pm',
        startTime: '09:00',
        endTime: '12:00',
        label: '9:00 AM – 12:00 PM'
      },
      {
        key: '12_00_pm_and_later',
        startTime: '12:00',
        endTime: null,
        label: '12:00 PM and later'
      },
      {
        key: '5_00_pm_and_later',
        startTime: '17:00',
        endTime: null,
        label: '5:00 PM and later'
      }
    ];

    const daysOfWeek = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    return {
      eventTypes,
      formats,
      audiences,
      datePresets,
      terms,
      ratingThresholds,
      timeOfDayRanges,
      daysOfWeek
    };
  }

  // listEvents(keyword, dateFilter, eventTypes, formats, audiences, dayOfWeek, timeOfDayRange, ratingMin, reviewCountMin, isStemFocus, sortBy, sortDirection, page, pageSize)
  listEvents(keyword, dateFilter, eventTypes, formats, audiences, dayOfWeek, timeOfDayRange, ratingMin, reviewCountMin, isStemFocus, sortBy, sortDirection, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const kw = keyword ? String(keyword).toLowerCase() : null;
    const typeFilter = Array.isArray(eventTypes) && eventTypes.length ? eventTypes : null;
    const formatFilter = Array.isArray(formats) && formats.length ? formats : null;
    const audienceFilter = Array.isArray(audiences) && audiences.length ? audiences : null;
    const dayFilter = Array.isArray(dayOfWeek) && dayOfWeek.length ? dayOfWeek : null;
    const minRating = typeof ratingMin === 'number' ? ratingMin : null;
    const minReviews = typeof reviewCountMin === 'number' ? reviewCountMin : null;

    let filtered = events.filter((event) => {
      // Keyword
      if (kw) {
        // Limit keyword search to title, subtitle, and tags to avoid over-matching on long descriptions
        const haystackParts = [event.title, event.subtitle];
        if (Array.isArray(event.tags)) {
          haystackParts.push(event.tags.join(' '));
        }
        const haystack = haystackParts
          .filter((x) => x != null)
          .map((x) => String(x).toLowerCase())
          .join(' ');
        if (!haystack.includes(kw)) return false;
      }

      // Event type
      if (typeFilter && !typeFilter.includes(event.event_type)) return false;

      // Format
      if (formatFilter && !formatFilter.includes(event.format)) return false;

      // Audience
      if (audienceFilter && event.primary_audience && !audienceFilter.includes(event.primary_audience)) {
        return false;
      }

      // Date filter
      if (!this._eventMatchesDateFilter(event, dateFilter || null)) return false;

      // Day of week
      if (!this._eventMatchesDayOfWeek(event, dayFilter || null)) return false;

      // Time of day
      if (!this._eventMatchesTimeOfDay(event, timeOfDayRange || null)) return false;

      // Rating / reviews
      if (minRating != null && (typeof event.rating !== 'number' || event.rating < minRating)) {
        return false;
      }
      if (minReviews != null && (typeof event.review_count !== 'number' || event.review_count < minReviews)) {
        return false;
      }

      // STEM focus
      if (!this._eventMatchesStemFocus(event, !!isStemFocus)) return false;

      return true;
    });

    // Sorting
    const sortField = sortBy || 'start_datetime';
    const direction = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      if (sortField === 'rating') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return (ra - rb) * direction;
      }
      // 'relevance' falls back to start_datetime sorting
      const da = this._parseDateTime(a.start_datetime) || new Date(0);
      const db = this._parseDateTime(b.start_datetime) || new Date(0);
      return (da - db) * direction;
    });

    const totalCount = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * size;
    const eventsPage = filtered.slice(startIndex, startIndex + size);

    // Saved/scheduled/registered IDs
    const savedEvents = this._getFromStorage('saved_events_state', []);
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const savedEventIds = savedEvents.map((se) => se.event_id);
    const scheduledEventIds = scheduledEvents.map((se) => se.event_id);
    const registeredEventIds = registrations
      .filter((r) => r.status === 'submitted')
      .map((r) => r.event_id);

    return {
      totalCount,
      page: pg,
      pageSize: size,
      events: eventsPage,
      savedEventIds,
      scheduledEventIds,
      registeredEventIds
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;

    const savedEvents = this._getFromStorage('saved_events_state', []);
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const isSaved = !!savedEvents.find((se) => se.event_id === eventId);
    const isScheduled = !!scheduledEvents.find((se) => se.event_id === eventId);
    const activeRegs = registrations.filter((r) => r.event_id === eventId && r.status === 'submitted');

    let activeRegistration = null;
    if (activeRegs.length) {
      activeRegs.sort((a, b) => {
        const da = this._parseDateTime(a.registration_datetime) || new Date(0);
        const db = this._parseDateTime(b.registration_datetime) || new Date(0);
        return db - da;
      });
      const reg = activeRegs[0];
      activeRegistration = {
        registration: {
          ...reg,
          event: event || null
        }
      };
    }

    return {
      event,
      isSaved,
      isScheduled,
      isRegistered: !!activeRegistration,
      activeRegistration
    };
  }

  // registerForEvent(eventId, attendeeName, attendeeEmail)
  registerForEvent(eventId, attendeeName, attendeeEmail) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        registration: null,
        updatedEvent: null,
        scheduledEvent: null
      };
    }

    if (typeof event.spots_left === 'number' && event.spots_left <= 0) {
      return {
        success: false,
        message: 'This event is fully booked.',
        registration: null,
        updatedEvent: event,
        scheduledEvent: null
      };
    }

    const now = new Date().toISOString();
    let registrations = this._getFromStorage('event_registrations', []);

    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      registration_datetime: now,
      status: 'submitted',
      source_page: 'event_detail'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const updatedEvent = this._updateEventSpotsLeft(eventId, -1) || event;
    const scheduledEventRaw = this._createScheduledEventOnRegistration(eventId);

    const scheduledEvent = scheduledEventRaw
      ? { ...scheduledEventRaw, event: event }
      : null;

    const registrationWithResolved = {
      ...registration,
      event
    };

    return {
      success: true,
      message: 'Registration submitted successfully.',
      registration: registrationWithResolved,
      updatedEvent,
      scheduledEvent
    };
  }

  // addEventToSchedule(eventId, source?)
  addEventToSchedule(eventId, source) {
    const src = source || 'manual_schedule';
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        scheduledEvent: null
      };
    }

    const now = new Date().toISOString();
    let scheduledEvents = this._getFromStorage('scheduled_events', []);
    let scheduled = scheduledEvents.find((se) => se.event_id === eventId) || null;

    const registrations = this._getFromStorage('event_registrations', []);
    const isRegistered = !!registrations.find((r) => r.event_id === eventId && r.status === 'submitted');

    if (scheduled) {
      scheduled.source = scheduled.source || src;
      scheduled.is_registered = !!scheduled.is_registered || isRegistered;
    } else {
      scheduled = {
        id: this._generateId('scheduled_event'),
        event_id: eventId,
        added_at: now,
        source: src,
        is_registered: isRegistered
      };
      scheduledEvents.push(scheduled);
    }

    this._saveToStorage('scheduled_events', scheduledEvents);

    return {
      success: true,
      message: 'Event added to schedule.',
      scheduledEvent: {
        ...scheduled,
        event
      }
    };
  }

  // removeScheduledEvent(eventId)
  removeScheduledEvent(eventId) {
    let scheduledEvents = this._getFromStorage('scheduled_events', []);
    const prevLength = scheduledEvents.length;
    scheduledEvents = scheduledEvents.filter((se) => se.event_id !== eventId);
    this._saveToStorage('scheduled_events', scheduledEvents);
    const removed = prevLength !== scheduledEvents.length;
    return {
      success: removed,
      message: removed ? 'Event removed from schedule.' : 'Event was not in schedule.'
    };
  }

  // getMySchedule(dateFilter, eventTypes)
  getMySchedule(dateFilter, eventTypes) {
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const typeFilter = Array.isArray(eventTypes) && eventTypes.length ? eventTypes : null;

    const eventsMap = new Map(events.map((e) => [e.id, e]));

    let scheduledEventRecords = scheduledEvents
      .map((se) => ({ se, event: eventsMap.get(se.event_id) || null }))
      .filter((pair) => pair.event);

    if (dateFilter && dateFilter.mode) {
      scheduledEventRecords = scheduledEventRecords.filter((pair) =>
        this._eventMatchesDateFilter(pair.event, dateFilter)
      );
    }

    if (typeFilter) {
      scheduledEventRecords = scheduledEventRecords.filter((pair) =>
        typeFilter.includes(pair.event.event_type)
      );
    }

    const eventsList = scheduledEventRecords.map((pair) => pair.event);
    const scheduledEventIds = eventsList.map((e) => e.id);
    const registeredEventIds = registrations
      .filter((r) => r.status === 'submitted')
      .map((r) => r.event_id);

    return {
      events: eventsList,
      scheduledEventIds,
      registeredEventIds
    };
  }

  // saveEvent(eventId, source?)
  saveEvent(eventId, source) {
    const src = source || 'bookmark';
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        savedEvent: null
      };
    }

    let savedEvents = this._getFromStorage('saved_events_state', []);
    let saved = savedEvents.find((se) => se.event_id === eventId) || null;
    if (saved) {
      return {
        success: true,
        message: 'Event already saved.',
        savedEvent: {
          ...saved,
          event
        }
      };
    }

    const now = new Date().toISOString();
    saved = {
      id: this._generateId('saved_event'),
      event_id: eventId,
      saved_at: now,
      source: src
    };
    savedEvents.push(saved);
    this._saveToStorage('saved_events_state', savedEvents);

    return {
      success: true,
      message: 'Event saved.',
      savedEvent: {
        ...saved,
        event
      }
    };
  }

  // removeSavedEvent(eventId)
  removeSavedEvent(eventId) {
    let savedEvents = this._getFromStorage('saved_events_state', []);
    const prevLength = savedEvents.length;
    savedEvents = savedEvents.filter((se) => se.event_id !== eventId);
    this._saveToStorage('saved_events_state', savedEvents);
    const removed = prevLength !== savedEvents.length;
    return {
      success: removed,
      message: removed ? 'Event removed from Saved Events.' : 'Event was not in Saved Events.'
    };
  }

  // getSavedEvents(eventTypes, dateFilter)
  getSavedEvents(eventTypes, dateFilter) {
    const savedEvents = this._getFromStorage('saved_events_state', []);
    const events = this._getFromStorage('events', []);
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const typeFilter = Array.isArray(eventTypes) && eventTypes.length ? eventTypes : null;
    const eventsMap = new Map(events.map((e) => [e.id, e]));

    let savedEventRecords = savedEvents
      .map((se) => ({ se, event: eventsMap.get(se.event_id) || null }))
      .filter((pair) => pair.event);

    if (dateFilter && dateFilter.mode) {
      savedEventRecords = savedEventRecords.filter((pair) =>
        this._eventMatchesDateFilter(pair.event, dateFilter)
      );
    }

    if (typeFilter) {
      savedEventRecords = savedEventRecords.filter((pair) =>
        typeFilter.includes(pair.event.event_type)
      );
    }

    const eventsList = savedEventRecords.map((pair) => pair.event);
    const savedEventIds = savedEventRecords.map((pair) => pair.event.id);
    const scheduledEventIds = scheduledEvents.map((se) => se.event_id);
    const registeredEventIds = registrations
      .filter((r) => r.status === 'submitted')
      .map((r) => r.event_id);

    return {
      events: eventsList,
      savedEventIds,
      scheduledEventIds,
      registeredEventIds
    };
  }

  // exportEventToCalendar(eventId)
  exportEventToCalendar(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        fileName: 'event.ics',
        mimeType: 'text/calendar',
        fileContent: ''
      };
    }

    const dtStart = this._parseDateTime(event.start_datetime) || new Date();
    const dtEnd = this._parseDateTime(event.end_datetime) || new Date(dtStart.getTime() + 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const formatICSDate = (d) => {
      return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        'Z'
      );
    };

    const dtStartStr = formatICSDate(dtStart);
    const dtEndStr = formatICSDate(dtEnd);

    const cleanTitle = (event.title || 'event').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const fileName = `${cleanTitle || 'event'}.ics`;
    const uid = `${event.id || 'event'}@career-services`;

    let location = event.location_name || '';
    if (!location && event.virtual_meeting_link) location = event.virtual_meeting_link;
    if (!location && (event.building || event.room)) {
      location = `${event.building || ''} ${event.room || ''}`.trim();
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//University Career Services//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${dtStartStr}`,
      `DTEND:${dtEndStr}`,
      `SUMMARY:${(event.title || '').replace(/\n/g, ' ')}`,
      location ? `LOCATION:${location.replace(/\n/g, ' ')}` : '',
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, ' ')}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean);

    const fileContent = lines.join('\r\n');

    return {
      fileName,
      mimeType: 'text/calendar',
      fileContent
    };
  }

  // ----------------------
  // Career fairs & visit lists
  // ----------------------

  // getCareerFairFilterOptions()
  getCareerFairFilterOptions() {
    const datePresets = [
      { value: 'next_30_days', label: 'Next 30 Days' },
      { value: 'this_month', label: 'This Month' },
      { value: 'next_month', label: 'Next Month' }
    ];

    const terms = [
      { value: 'spring_2024', label: 'Spring 2024' },
      { value: 'fall_2024', label: 'Fall 2024' },
      { value: 'spring_2025', label: 'Spring 2025' },
      { value: 'summer_2025', label: 'Summer 2025' },
      { value: 'fall_2025', label: 'Fall 2025' }
    ];

    const formats = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In Person' }
    ];

    const industries = [
      { value: 'stem', label: 'STEM' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'technology', label: 'Technology' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'finance', label: 'Finance' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'business', label: 'Business' },
      { value: 'arts', label: 'Arts' },
      { value: 'education', label: 'Education' },
      { value: 'government', label: 'Government' },
      { value: 'other', label: 'Other' }
    ];

    return {
      datePresets,
      terms,
      formats,
      industries
    };
  }

  // listCareerFairs(dateFilter, formats, industries, isStemFocus, sortBy, sortDirection, page, pageSize)
  listCareerFairs(dateFilter, formats, industries, isStemFocus, sortBy, sortDirection, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const fairsOnly = events.filter((e) => e.event_type === 'career_fair');

    const formatFilter = Array.isArray(formats) && formats.length ? formats : null;
    const industryFilter = Array.isArray(industries) && industries.length ? industries : null;

    let filtered = fairsOnly.filter((fair) => {
      if (formatFilter && !formatFilter.includes(fair.format)) return false;

      if (industryFilter) {
        const primary = fair.primary_industry || '';
        const allIndustries = Array.isArray(fair.industries) ? fair.industries.map((v) => String(v)) : [];
        const combined = [primary, ...allIndustries];
        const lowerCombined = combined.map((v) => v.toLowerCase());
        const lowerFilter = industryFilter.map((v) => v.toLowerCase());
        const hasAny = lowerCombined.some((v) => lowerFilter.includes(v));
        if (!hasAny) return false;
      }

      if (!this._eventMatchesDateFilter(fair, dateFilter || null)) return false;
      if (!this._eventMatchesStemFocus(fair, !!isStemFocus)) return false;

      return true;
    });

    const sortField = sortBy || 'start_datetime';
    const direction = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      if (sortField === 'employer_count') {
        const ea = typeof a.employers_attending_count === 'number' ? a.employers_attending_count : 0;
        const eb = typeof b.employers_attending_count === 'number' ? b.employers_attending_count : 0;
        return (ea - eb) * direction;
      }
      const da = this._parseDateTime(a.start_datetime) || new Date(0);
      const db = this._parseDateTime(b.start_datetime) || new Date(0);
      return (da - db) * direction;
    });

    const totalCount = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * size;
    const pageFairs = filtered.slice(startIndex, startIndex + size);

    return {
      totalCount,
      page: pg,
      pageSize: size,
      fairs: pageFairs
    };
  }

  // getCareerFairDetail(eventId)
  getCareerFairDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const fair = events.find((e) => e.id === eventId && e.event_type === 'career_fair') || null;

    const savedEvents = this._getFromStorage('saved_events_state', []);
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const isSaved = !!savedEvents.find((se) => se.event_id === eventId);
    const isScheduled = !!scheduledEvents.find((se) => se.event_id === eventId);
    const isRegistered = !!registrations.find((r) => r.event_id === eventId && r.status === 'submitted');

    const visitLists = this._getFromStorage('visit_lists', []);
    const visitList = visitLists.find((vl) => vl.event_id === eventId) || null;
    const visitListItems = this._getFromStorage('visit_list_items', []);
    const visitListEmployerCount = visitList
      ? visitListItems.filter((item) => item.visit_list_id === visitList.id).length
      : 0;

    return {
      fair,
      isSaved,
      isScheduled,
      isRegistered,
      visitListEmployerCount
    };
  }

  // listCareerFairEmployers(eventId, industries, positionTypes, keyword, page, pageSize)
  listCareerFairEmployers(eventId, industries, positionTypes, keyword, page, pageSize) {
    const fairEmployers = this._getFromStorage('career_fair_employers', []);
    const employers = this._getFromStorage('employers', []);

    const fairEmployerLinks = fairEmployers.filter((cfe) => cfe.event_id === eventId);
    const employerMap = new Map(employers.map((e) => [e.id, e]));

    const industryFilter = Array.isArray(industries) && industries.length ? industries.map((v) => v.toLowerCase()) : null;
    const posFilter = Array.isArray(positionTypes) && positionTypes.length ? positionTypes.map((v) => v.toLowerCase()) : null;
    const kw = keyword ? String(keyword).toLowerCase() : null;

    let linked = fairEmployerLinks
      .map((link) => ({ link, employer: employerMap.get(link.employer_id) || null }))
      .filter((pair) => pair.employer);

    linked = linked.filter(({ link, employer }) => {
      if (industryFilter) {
        const ind = String(employer.industry || '').toLowerCase();
        if (!industryFilter.includes(ind)) return false;
      }

      if (posFilter) {
        const fairPositions = Array.isArray(link.position_types) ? link.position_types : [];
        const employerPositions = Array.isArray(employer.positions_offered) ? employer.positions_offered : [];
        const combined = [employer.primary_position_type || '', ...fairPositions, ...employerPositions];
        const lowerCombined = combined.map((v) => String(v).toLowerCase());
        const hasAny = lowerCombined.some((v) => posFilter.includes(v));
        if (!hasAny) return false;
      }

      if (kw) {
        const parts = [employer.name, employer.description];
        if (Array.isArray(employer.keywords)) parts.push(employer.keywords.join(' '));
        const haystack = parts
          .filter((x) => x != null)
          .map((x) => String(x).toLowerCase())
          .join(' ');
        if (!haystack.includes(kw)) return false;
      }

      return true;
    });

    const totalCount = linked.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const startIndex = (pg - 1) * size;
    const pageLinked = linked.slice(startIndex, startIndex + size);

    const employersPage = pageLinked.map((pair) => pair.employer);

    // visitListEmployerIds
    const visitLists = this._getFromStorage('visit_lists', []);
    const visitList = visitLists.find((vl) => vl.event_id === eventId) || null;
    const visitListItems = this._getFromStorage('visit_list_items', []);
    const visitListEmployerIds = visitList
      ? visitListItems
          .filter((item) => item.visit_list_id === visitList.id)
          .map((item) => item.employer_id)
      : [];

    return {
      totalCount,
      page: pg,
      pageSize: size,
      employers: employersPage,
      visitListEmployerIds
    };
  }

  // addEmployerToVisitList(eventId, employerId)
  addEmployerToVisitList(eventId, employerId) {
    const visitList = this._getOrCreateVisitListForEvent(eventId);
    let visitListItems = this._getFromStorage('visit_list_items', []);

    const existing = visitListItems.find(
      (item) => item.visit_list_id === visitList.id && item.employer_id === employerId
    );
    if (existing) {
      return {
        success: true,
        message: 'Employer already in visit list.',
        visitList: {
          ...visitList,
          event: this._getFromStorage('events', []).find((e) => e.id === eventId) || null
        }
      };
    }

    const now = new Date().toISOString();
    const itemsForList = visitListItems.filter((item) => item.visit_list_id === visitList.id);
    const nextOrder = itemsForList.length + 1;

    const newItem = {
      id: this._generateId('visit_list_item'),
      visit_list_id: visitList.id,
      employer_id: employerId,
      sort_order: nextOrder,
      created_at: now
    };

    visitListItems.push(newItem);
    this._saveToStorage('visit_list_items', visitListItems);

    const event = this._getFromStorage('events', []).find((e) => e.id === eventId) || null;

    return {
      success: true,
      message: 'Employer added to visit list.',
      visitList: {
        ...visitList,
        event
      }
    };
  }

  // removeEmployerFromVisitList(eventId, employerId)
  removeEmployerFromVisitList(eventId, employerId) {
    const visitLists = this._getFromStorage('visit_lists', []);
    const visitList = visitLists.find((vl) => vl.event_id === eventId) || null;
    if (!visitList) {
      return {
        success: false,
        message: 'Visit list not found for this fair.'
      };
    }

    let visitListItems = this._getFromStorage('visit_list_items', []);
    const prevLength = visitListItems.length;
    visitListItems = visitListItems.filter(
      (item) => !(item.visit_list_id === visitList.id && item.employer_id === employerId)
    );

    // Re-number sort_order for this visit list
    const listItems = visitListItems
      .filter((item) => item.visit_list_id === visitList.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    listItems.forEach((item, index) => {
      item.sort_order = index + 1;
    });

    this._saveToStorage('visit_list_items', visitListItems);

    const removed = prevLength !== visitListItems.length;

    return {
      success: removed,
      message: removed ? 'Employer removed from visit list.' : 'Employer was not in visit list.'
    };
  }

  // getVisitList(eventId)
  getVisitList(eventId) {
    const visitLists = this._getFromStorage('visit_lists', []);
    let visitList = visitLists.find((vl) => vl.event_id === eventId) || null;

    if (!visitList) {
      // It is acceptable to create an empty visit list for convenience
      visitList = this._getOrCreateVisitListForEvent(eventId);
    }

    const visitListItems = this._getFromStorage('visit_list_items', []);
    const employers = this._getFromStorage('employers', []);
    const employersMap = new Map(employers.map((e) => [e.id, e]));

    const itemsForList = visitListItems
      .filter((item) => item.visit_list_id === visitList.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const employerOrder = itemsForList.map((item) => item.employer_id);
    const employersOrdered = employerOrder.map((id) => employersMap.get(id)).filter((e) => !!e);

    const fairEvent = this._getFromStorage('events', []).find((e) => e.id === eventId) || null;

    return {
      visitList: {
        ...visitList,
        event: fairEvent
      },
      employers: employersOrdered,
      employerOrder
    };
  }

  // updateVisitListOrder(eventId, employerOrder)
  updateVisitListOrder(eventId, employerOrder) {
    const order = Array.isArray(employerOrder) ? employerOrder : [];
    const visitList = this._getOrCreateVisitListForEvent(eventId);
    let visitListItems = this._getFromStorage('visit_list_items', []);

    // Filter items for this visit list
    const otherItems = visitListItems.filter((item) => item.visit_list_id !== visitList.id);
    let listItems = visitListItems.filter((item) => item.visit_list_id === visitList.id);

    const byEmployer = new Map(listItems.map((item) => [item.employer_id, item]));

    // Apply new order
    let newOrderItems = [];
    let sortOrder = 1;
    order.forEach((empId) => {
      const item = byEmployer.get(empId);
      if (item) {
        item.sort_order = sortOrder++;
        newOrderItems.push(item);
        byEmployer.delete(empId);
      }
    });

    // Append remaining items maintaining their relative order
    const remaining = Array.from(byEmployer.values()).sort((a, b) => a.sort_order - b.sort_order);
    remaining.forEach((item) => {
      item.sort_order = sortOrder++;
      newOrderItems.push(item);
    });

    visitListItems = [...otherItems, ...newOrderItems];
    this._saveToStorage('visit_list_items', visitListItems);

    const employers = this._getFromStorage('employers', []);
    const employersMap = new Map(employers.map((e) => [e.id, e]));
    const fairEvent = this._getFromStorage('events', []).find((e) => e.id === eventId) || null;

    const visitListItemsWithResolved = newOrderItems.map((item) => ({
      ...item,
      visitList: {
        ...visitList,
        event: fairEvent
      },
      employer: employersMap.get(item.employer_id) || null
    }));

    return {
      success: true,
      message: 'Visit list order updated.',
      visitListItems: visitListItemsWithResolved
    };
  }

  // ----------------------
  // Appointments
  // ----------------------

  // getAppointmentFilterOptions()
  getAppointmentFilterOptions() {
    const serviceTypes = [
      { value: 'resume_review', label: 'Resume Review' },
      { value: 'resume_critique', label: 'Resume Critique' },
      { value: 'interview_coaching', label: 'Interview Coaching' },
      { value: 'general_career_coaching', label: 'General Career Coaching' }
    ];

    const formats = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In Person' }
    ];

    const datePresets = [
      { value: 'next_week', label: 'Next Week' }
    ];

    const timeOfDayRanges = [
      {
        key: '9_00_am_to_12_00_pm',
        startTime: '09:00',
        endTime: '12:00',
        label: '9:00 AM – 12:00 PM'
      }
    ];

    return {
      serviceTypes,
      formats,
      datePresets,
      timeOfDayRanges
    };
  }

  // listAppointmentSlots(serviceTypes, dateFilter, timeOfDayRange, formats, sortBy, sortDirection, page, pageSize)
  listAppointmentSlots(serviceTypes, dateFilter, timeOfDayRange, formats, sortBy, sortDirection, page, pageSize) {
    const allSlots = this._getFromStorage('appointment_slots', []);

    const serviceFilter = Array.isArray(serviceTypes) && serviceTypes.length ? serviceTypes : null;
    const formatFilter = Array.isArray(formats) && formats.length ? formats : null;

    let availableSlots = allSlots.filter((slot) => !slot.is_booked);

    if (serviceFilter) {
      availableSlots = availableSlots.filter((slot) => serviceFilter.includes(slot.service_type));
    }

    if (formatFilter) {
      availableSlots = availableSlots.filter((slot) => formatFilter.includes(slot.format));
    }

    availableSlots = this._filterAppointmentsByDateAndTime(availableSlots, dateFilter || null, timeOfDayRange || null);

    const sortField = sortBy || 'start_datetime';
    const direction = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    availableSlots.sort((a, b) => {
      const da = this._parseDateTime(a.start_datetime) || new Date(0);
      const db = this._parseDateTime(b.start_datetime) || new Date(0);
      return (da - db) * direction;
    });

    const totalCount = availableSlots.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * size;
    const slotsPage = availableSlots.slice(startIndex, startIndex + size);

    return {
      totalCount,
      page: pg,
      pageSize: size,
      slots: slotsPage
    };
  }

  // bookAppointment(appointmentSlotId, attendeeName, attendeeEmail, notes)
  bookAppointment(appointmentSlotId, attendeeName, attendeeEmail, notes) {
    let slots = this._getFromStorage('appointment_slots', []);
    const slot = slots.find((s) => s.id === appointmentSlotId) || null;

    if (!slot) {
      return {
        success: false,
        message: 'Appointment slot not found.',
        appointment: null,
        updatedSlot: null
      };
    }

    if (slot.is_booked) {
      return {
        success: false,
        message: 'Appointment slot is already booked.',
        appointment: null,
        updatedSlot: slot
      };
    }

    const now = new Date().toISOString();
    let appointments = this._getFromStorage('appointments', []);

    const appointment = {
      id: this._generateId('appointment'),
      appointment_slot_id: appointmentSlotId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      booked_at: now,
      status: 'booked',
      notes: notes || ''
    };

    appointments.push(appointment);

    slot.is_booked = true;
    slot.updated_at = now;
    this._saveToStorage('appointment_slots', slots);
    this._saveToStorage('appointments', appointments);

    const appointmentWithResolved = {
      ...appointment,
      appointmentSlot: slot
    };

    return {
      success: true,
      message: 'Appointment booked successfully.',
      appointment: appointmentWithResolved,
      updatedSlot: slot
    };
  }

  // getMyAppointments(statusFilter)
  getMyAppointments(statusFilter) {
    const filter = statusFilter || 'upcoming';
    const appointments = this._getFromStorage('appointments', []);
    const slots = this._getFromStorage('appointment_slots', []);
    const slotMap = new Map(slots.map((s) => [s.id, s]));

    const now = new Date();

    let resultAppointments = appointments.map((a) => ({
      ...a,
      appointmentSlot: slotMap.get(a.appointment_slot_id) || null
    }));

    if (filter === 'upcoming') {
      resultAppointments = resultAppointments.filter((a) => {
        const slot = a.appointmentSlot;
        const start = slot ? this._parseDateTime(slot.start_datetime) : null;
        return a.status === 'booked' && start && start >= now;
      });
    } else if (filter === 'past') {
      resultAppointments = resultAppointments.filter((a) => {
        const slot = a.appointmentSlot;
        const start = slot ? this._parseDateTime(slot.start_datetime) : null;
        return !start || start < now || a.status === 'completed' || a.status === 'cancelled';
      });
    }

    const appointmentSlotsUsed = resultAppointments
      .map((a) => a.appointmentSlot)
      .filter((s) => !!s);

    return {
      appointments: resultAppointments,
      appointmentSlots: appointmentSlotsUsed
    };
  }

  // cancelAppointment(appointmentId, reason)
  cancelAppointment(appointmentId, reason) {
    let appointments = this._getFromStorage('appointments', []);
    const slots = this._getFromStorage('appointment_slots', []);
    const appointment = appointments.find((a) => a.id === appointmentId) || null;

    if (!appointment) {
      return {
        success: false,
        message: 'Appointment not found.',
        appointment: null
      };
    }

    appointment.status = 'cancelled';
    if (reason) {
      appointment.notes = (appointment.notes || '') + (appointment.notes ? '\n' : '') + `Cancellation reason: ${reason}`;
    }

    const slot = slots.find((s) => s.id === appointment.appointment_slot_id) || null;
    if (slot) {
      slot.is_booked = false;
      slot.updated_at = new Date().toISOString();
      this._saveToStorage('appointment_slots', slots);
    }

    this._saveToStorage('appointments', appointments);

    const appointmentWithResolved = {
      ...appointment,
      appointmentSlot: slot || null
    };

    return {
      success: true,
      message: 'Appointment cancelled.',
      appointment: appointmentWithResolved
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