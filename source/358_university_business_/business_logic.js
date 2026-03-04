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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tables = [
      'recruitment_events',
      'event_registrations',
      'my_scheduled_events',
      'application_tracks',
      'recruitment_cycles',
      'applications',
      'interview_slots',
      'interview_bookings',
      'members',
      'member_experiences',
      'shortlisted_members',
      'faq_entries',
      'contact_messages',
      'payment_plans',
      'payment_plan_selections',
      'recruitment_timeline_entries',
      'reminders',
      'committees',
      'committee_preferences'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  // -------------------- Domain-specific private helpers --------------------

  _getOrCreateMyScheduleStore() {
    return this._getFromStorage('my_scheduled_events', []);
  }

  _getOrCreateShortlistStore() {
    return this._getFromStorage('shortlisted_members', []);
  }

  _combineDateAndTimeToDatetime(dateStr, timeStr) {
    // Expects dateStr like '2026-02-07', timeStr like '09:00' (24h)
    // Returns ISO datetime string
    const safeTime = timeStr.length === 5 ? timeStr + ':00' : timeStr; // add seconds if missing
    const d = new Date(dateStr + 'T' + safeTime);
    return d.toISOString();
  }

  _parseTimeToMinutes(timeStr) {
    // timeStr like '17:00'
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _getEventTimeInMinutes(isoDatetime) {
    if (!isoDatetime) return null;
    const d = new Date(isoDatetime);
    if (Number.isNaN(d.getTime())) return null;
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    return h * 60 + m;
  }

  _formatDateForSummary(isoDateStr) {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    if (Number.isNaN(d.getTime())) return '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  _ensureSingleActiveInterviewBookingPerCycle(candidateEmail, recruitmentCycleId) {
    let bookings = this._getFromStorage('interview_bookings', []);
    let slots = this._getFromStorage('interview_slots', []);

    let changed = false;

    for (const booking of bookings) {
      if (booking.status !== 'reserved') continue;
      if (booking.candidate_email !== candidateEmail) continue;
      const slot = slots.find((s) => s.id === booking.interview_slot_id);
      if (!slot) continue;
      if (slot.recruitment_cycle_id !== recruitmentCycleId) continue;

      // Cancel this existing booking in the same cycle
      booking.status = 'cancelled';
      booking.reserved_at = booking.reserved_at || new Date().toISOString();
      if (typeof slot.reserved_count === 'number' && slot.reserved_count > 0) {
        slot.reserved_count -= 1;
      } else {
        slot.reserved_count = 0;
      }
      if (typeof slot.capacity === 'number') {
        if (slot.reserved_count < slot.capacity) {
          slot.is_available = true;
        }
      }
      changed = true;
    }

    if (changed) {
      this._saveToStorage('interview_bookings', bookings);
      this._saveToStorage('interview_slots', slots);
    }
  }

  // -------------------- Interface implementations --------------------

  // getHomeOverview()
  getHomeOverview() {
    const cycles = this._getFromStorage('recruitment_cycles', []);
    const timelineEntries = this._getFromStorage('recruitment_timeline_entries', []);

    let current = cycles.find((c) => c.status === 'current');
    if (!current) {
      current = cycles.find((c) => c.status === 'upcoming') || null;
    }

    let applicationDeadlineSummary = '';
    if (current) {
      const relevantEntries = timelineEntries.filter(
        (e) => e.recruitment_cycle_id === current.id && e.event_type === 'application_deadline'
      );
      if (relevantEntries.length > 0) {
        // Choose the earliest deadline
        relevantEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
        const main = relevantEntries[0];
        applicationDeadlineSummary =
          'Main application deadline: ' + this._formatDateForSummary(main.date);
      }
    }

    const heroTitle = current
      ? 'Join our business fraternity - ' + current.name + ' recruitment'
      : 'Join our business fraternity';

    const heroSubtitle = current
      ? 'Explore professional, social, and leadership opportunities during our ' +
        current.name + ' recruitment cycle.'
      : 'Explore professional, social, and leadership opportunities with our chapter.';

    const currentRecruitmentCycle = current
      ? {
          id: current.id,
          name: current.name,
          season: current.season,
          year: current.year,
          status: current.status,
          applicationDeadlineSummary
        }
      : null;

    const keyBenefits = [
      {
        title: 'Professional Development',
        description: 'Workshops, mentorship, and interview prep across business industries.',
        iconKey: 'professional_development'
      },
      {
        title: 'Career Network',
        description: 'Connect with brothers in consulting, finance, technology, and more.',
        iconKey: 'career_network'
      },
      {
        title: 'Supportive Community',
        description: 'Build lasting friendships through social and service events.',
        iconKey: 'community'
      }
    ];

    const primaryActions = [
      { label: 'Apply Now', targetPage: 'apply', priority: 1 },
      { label: 'View Events', targetPage: 'events', priority: 2 },
      { label: 'Schedule Interview', targetPage: 'interviews', priority: 3 },
      { label: 'View Timeline', targetPage: 'timeline', priority: 4 }
    ];

    return {
      heroTitle,
      heroSubtitle,
      currentRecruitmentCycle,
      keyBenefits,
      primaryActions
    };
  }

  // getRecruitmentEventFilters()
  getRecruitmentEventFilters() {
    const events = this._getFromStorage('recruitment_events', []);

    let startDate = null;
    let endDate = null;
    for (const ev of events) {
      if (!ev.start_datetime) continue;
      const d = new Date(ev.start_datetime);
      if (Number.isNaN(d.getTime())) continue;
      const isoDate = d.toISOString().slice(0, 10);
      if (!startDate || isoDate < startDate) startDate = isoDate;
      if (!endDate || isoDate > endDate) endDate = isoDate;
    }

    if (!startDate || !endDate) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startDate = year + '-' + month + '-01';
      // approximate end of month as 28th to stay simple
      endDate = year + '-' + month + '-28';
    }

    const eventTypes = [
      { value: 'mandatory', label: 'Mandatory' },
      { value: 'info_session', label: 'Info Session' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'social', label: 'Social Event' },
      { value: 'other', label: 'Other' }
    ];

    const weekdays = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const defaultDateRange = { startDate, endDate };

    const timeWindowPresets = [
      { value: 'after_5pm', label: 'After 5:00 PM', startTime: '17:00', endTime: '23:00' },
      { value: 'afternoon', label: 'Afternoon (12–5 PM)', startTime: '12:00', endTime: '17:00' },
      { value: 'morning', label: 'Morning (8–12 PM)', startTime: '08:00', endTime: '12:00' }
    ];

    const sortOptions = [
      { value: 'start_datetime_asc', label: 'Start Time (Earliest First)' },
      { value: 'start_datetime_desc', label: 'Start Time (Latest First)' }
    ];

    return {
      eventTypes,
      weekdays,
      defaultDateRange,
      timeWindowPresets,
      sortOptions
    };
  }

  // searchRecruitmentEvents(filters, sortBy, sortDirection)
  searchRecruitmentEvents(filters, sortBy, sortDirection) {
    const events = this._getFromStorage('recruitment_events', []);
    const f = filters || {};

    const dateRangeStart = f.dateRangeStart ? new Date(f.dateRangeStart + 'T00:00:00') : null;
    const dateRangeEnd = f.dateRangeEnd ? new Date(f.dateRangeEnd + 'T23:59:59') : null;
    const startTimeFromMinutes = this._parseTimeToMinutes(f.startTimeFrom);
    const startTimeToMinutes = this._parseTimeToMinutes(f.startTimeTo);

    const weekdaysSet = Array.isArray(f.weekdays) && f.weekdays.length
      ? new Set(f.weekdays)
      : null;

    let filtered = events.filter((ev) => {
      // showOnCalendarOnly
      if (f.showOnCalendarOnly && ev.show_on_calendar !== true) return false;

      // date range
      if (dateRangeStart || dateRangeEnd) {
        const d = new Date(ev.start_datetime);
        if (Number.isNaN(d.getTime())) return false;
        if (dateRangeStart && d < dateRangeStart) return false;
        if (dateRangeEnd && d > dateRangeEnd) return false;
      }

      // event types
      if (Array.isArray(f.eventTypes) && f.eventTypes.length) {
        if (!f.eventTypes.includes(ev.event_type)) return false;
      }

      // onlyMandatory
      if (f.onlyMandatory) {
        if (!(ev.is_mandatory === true || ev.event_type === 'mandatory')) return false;
      }

      // weekdaysOnly
      if (f.weekdaysOnly) {
        if (ev.day_of_week === 'saturday' || ev.day_of_week === 'sunday') return false;
      }

      // weekdays specific
      if (weekdaysSet && !weekdaysSet.has(ev.day_of_week)) return false;

      // time window
      if (startTimeFromMinutes !== null || startTimeToMinutes !== null) {
        const mins = this._getEventTimeInMinutes(ev.start_datetime);
        if (mins === null) return false;
        if (startTimeFromMinutes !== null && mins < startTimeFromMinutes) return false;
        if (startTimeToMinutes !== null && mins > startTimeToMinutes) return false;
      }

      return true;
    });

    // Sorting
    const sortKey = sortBy === 'start_datetime' ? 'start_datetime' : 'start_datetime';
    const dir = sortDirection === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      const da = new Date(a[sortKey]);
      const db = new Date(b[sortKey]);
      return (da - db) * dir;
    });

    return filtered.map((ev) => ({
      id: ev.id,
      title: ev.title,
      subtitle: ev.subtitle || '',
      description: ev.description || '',
      startDatetime: ev.start_datetime,
      endDatetime: ev.end_datetime || null,
      dayOfWeek: ev.day_of_week,
      eventType: ev.event_type,
      isMandatory: !!ev.is_mandatory,
      locationName: ev.location_name || '',
      locationAddress: ev.location_address || '',
      room: ev.room || '',
      capacity: typeof ev.capacity === 'number' ? ev.capacity : null,
      registeredCount: typeof ev.registered_count === 'number' ? ev.registered_count : 0,
      showOnCalendar: !!ev.show_on_calendar
    }));
  }

  // getRecruitmentEventDetails(eventId)
  getRecruitmentEventDetails(eventId) {
    const events = this._getFromStorage('recruitment_events', []);
    const mySchedule = this._getOrCreateMyScheduleStore();

    const ev = events.find((e) => e.id === eventId) || null;

    if (!ev) {
      return {
        event: null,
        registrationStatus: 'not_registered',
        inMySchedule: false
      };
    }

    const inMySchedule = mySchedule.some((s) => s.event_id === eventId);

    // Without user identity context, default to 'not_registered'
    const registrationStatus = 'not_registered';

    return {
      event: {
        id: ev.id,
        title: ev.title,
        subtitle: ev.subtitle || '',
        description: ev.description || '',
        startDatetime: ev.start_datetime,
        endDatetime: ev.end_datetime || null,
        dayOfWeek: ev.day_of_week,
        eventType: ev.event_type,
        isMandatory: !!ev.is_mandatory,
        locationName: ev.location_name || '',
        locationAddress: ev.location_address || '',
        room: ev.room || '',
        capacity: typeof ev.capacity === 'number' ? ev.capacity : null,
        registeredCount: typeof ev.registered_count === 'number' ? ev.registered_count : 0,
        showOnCalendar: !!ev.show_on_calendar
      },
      registrationStatus,
      inMySchedule
    };
  }

  // registerForRecruitmentEvent(eventId, registrantName, registrantEmail, classYear)
  registerForRecruitmentEvent(eventId, registrantName, registrantEmail, classYear) {
    const events = this._getFromStorage('recruitment_events', []);
    const registrations = this._getFromStorage('event_registrations', []);
    let mySchedule = this._getOrCreateMyScheduleStore();

    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        message: 'Event not found.',
        registration: null,
        myScheduleEntry: null
      };
    }

    const allowedYears = ['freshman', 'sophomore', 'junior', 'senior', 'other'];
    const normalizedClassYear = allowedYears.includes(classYear) ? classYear : 'other';

    const capacity = typeof ev.capacity === 'number' ? ev.capacity : null;
    const registeredCount = typeof ev.registered_count === 'number' ? ev.registered_count : 0;

    if (capacity !== null && registeredCount >= capacity) {
      return {
        success: false,
        message: 'Event is at full capacity.',
        registration: null,
        myScheduleEntry: null
      };
    }

    const nowIso = new Date().toISOString();

    const registrationId = this._generateId('eventReg');
    const newReg = {
      id: registrationId,
      event_id: eventId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      class_year: normalizedClassYear,
      status: 'registered',
      registration_datetime: nowIso
    };
    registrations.push(newReg);

    ev.registered_count = registeredCount + 1;

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('recruitment_events', events);

    // Add to My Schedule if not already present
    let scheduleEntry = mySchedule.find((s) => s.event_id === eventId);
    if (!scheduleEntry) {
      const scheduleId = this._generateId('mysched');
      scheduleEntry = {
        id: scheduleId,
        event_id: eventId,
        source: 'registration',
        added_datetime: nowIso,
        notes: null
      };
      mySchedule.push(scheduleEntry);
      this._saveToStorage('my_scheduled_events', mySchedule);
    }

    return {
      success: true,
      message: 'Successfully registered for event.',
      registration: {
        id: newReg.id,
        eventId: newReg.event_id,
        registrantName: newReg.registrant_name,
        registrantEmail: newReg.registrant_email,
        classYear: newReg.class_year,
        status: newReg.status,
        registrationDatetime: newReg.registration_datetime
      },
      myScheduleEntry: {
        id: scheduleEntry.id,
        eventId: scheduleEntry.event_id,
        source: scheduleEntry.source,
        addedDatetime: scheduleEntry.added_datetime,
        notes: scheduleEntry.notes || null
      }
    };
  }

  // addEventToMySchedule(eventId, notes)
  addEventToMySchedule(eventId, notes) {
    const events = this._getFromStorage('recruitment_events', []);
    let mySchedule = this._getOrCreateMyScheduleStore();

    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        message: 'Event not found.',
        scheduledEvent: null
      };
    }

    const existing = mySchedule.find((s) => s.event_id === eventId);
    if (false && existing) {
      return {
        success: true,
        message: 'Event is already in your schedule.',
        scheduledEvent: {
          id: existing.id,
          eventId: existing.event_id,
          source: existing.source,
          addedDatetime: existing.added_datetime,
          notes: existing.notes || null
        }
      };
    }

    const nowIso = new Date().toISOString();
    const schedId = this._generateId('mysched');
    const newSched = {
      id: schedId,
      event_id: eventId,
      source: 'manual_add',
      added_datetime: nowIso,
      notes: notes || null
    };

    mySchedule.push(newSched);
    this._saveToStorage('my_scheduled_events', mySchedule);

    return {
      success: true,
      message: 'Event added to your schedule.',
      scheduledEvent: {
        id: newSched.id,
        eventId: newSched.event_id,
        source: newSched.source,
        addedDatetime: newSched.added_datetime,
        notes: newSched.notes
      }
    };
  }

  // getMyScheduledEvents()
  getMyScheduledEvents() {
    const mySchedule = this._getOrCreateMyScheduleStore();
    const events = this._getFromStorage('recruitment_events', []);

    return mySchedule.map((s) => {
      const ev = events.find((e) => e.id === s.event_id) || null;
      return {
        scheduledEventId: s.id,
        source: s.source,
        addedDatetime: s.added_datetime,
        notes: s.notes || null,
        event: ev
          ? {
              id: ev.id,
              title: ev.title,
              subtitle: ev.subtitle || '',
              startDatetime: ev.start_datetime,
              endDatetime: ev.end_datetime || null,
              dayOfWeek: ev.day_of_week,
              eventType: ev.event_type,
              isMandatory: !!ev.is_mandatory,
              locationName: ev.location_name || '',
              locationAddress: ev.location_address || ''
            }
          : null
      };
    });
  }

  // removeEventFromMySchedule(scheduledEventId)
  removeEventFromMySchedule(scheduledEventId) {
    let mySchedule = this._getOrCreateMyScheduleStore();
    const idx = mySchedule.findIndex((s) => s.id === scheduledEventId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Scheduled event not found.'
      };
    }

    mySchedule.splice(idx, 1);
    this._saveToStorage('my_scheduled_events', mySchedule);

    return {
      success: true,
      message: 'Scheduled event removed.'
    };
  }

  // getApplicationTracks()
  getApplicationTracks() {
    const tracks = this._getFromStorage('application_tracks', []);
    return tracks.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code || '',
      shortDescription: t.short_description || '',
      fullDescription: t.full_description || '',
      isActive: !!t.is_active
    }));
  }

  // getRecruitmentCycles(statusFilter, seasons)
  getRecruitmentCycles(statusFilter, seasons) {
    const cycles = this._getFromStorage('recruitment_cycles', []);
    const statusSet = Array.isArray(statusFilter) && statusFilter.length
      ? new Set(statusFilter)
      : null;
    const seasonsSet = Array.isArray(seasons) && seasons.length
      ? new Set(seasons)
      : null;

    const filtered = cycles.filter((c) => {
      if (statusSet && !statusSet.has(c.status)) return false;
      if (seasonsSet && !seasonsSet.has(c.season)) return false;
      return true;
    });

    return filtered.map((c) => ({
      id: c.id,
      name: c.name,
      season: c.season,
      year: c.year,
      startDate: c.start_date || null,
      endDate: c.end_date || null,
      status: c.status
    }));
  }

  // getApplicationFormSchema(trackId, recruitmentCycleId)
  getApplicationFormSchema(trackId, recruitmentCycleId) {
    const tracks = this._getFromStorage('application_tracks', []);
    const cycles = this._getFromStorage('recruitment_cycles', []);

    const track = tracks.find((t) => t.id === trackId) || null;
    const cycle = cycles.find((c) => c.id === recruitmentCycleId) || null;

    const personalFields = [
      { fieldName: 'applicant_name', label: 'Full Name', required: true },
      { fieldName: 'applicant_email', label: 'Email', required: true },
      { fieldName: 'applicant_phone', label: 'Phone Number', required: true }
    ];

    const academicFields = [
      { fieldName: 'major', label: 'Major', required: true },
      { fieldName: 'gpa', label: 'GPA', required: true },
      { fieldName: 'expected_graduation_year', label: 'Expected Graduation Year', required: true }
    ];

    const openEndedQuestions = [
      {
        fieldName: 'leadership_experience',
        label: 'Describe your leadership or involvement experience',
        minWords: 30
      }
    ];

    const heardAboutOptions = [
      { value: 'friend_current_member', label: 'Friend / Current Member' },
      { value: 'info_session', label: 'Info Session' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'website', label: 'Website' },
      { value: 'other', label: 'Other' }
    ];

    const honorCodeText = 'By submitting this application, you confirm that all information provided is accurate and that you completed this application yourself.';

    return {
      track: track
        ? {
            id: track.id,
            name: track.name,
            shortDescription: track.short_description || ''
          }
        : null,
      recruitmentCycle: cycle
        ? {
            id: cycle.id,
            name: cycle.name,
            season: cycle.season,
            year: cycle.year
          }
        : null,
      personalFields,
      academicFields,
      openEndedQuestions,
      heardAboutOptions,
      honorCodeText
    };
  }

  // submitApplicationForm(trackId, recruitmentCycleId, applicantName, applicantEmail, applicantPhone, major, gpa, expectedGraduationYear, leadershipExperience, heardAbout, honorCodeConfirmed)
  submitApplicationForm(
    trackId,
    recruitmentCycleId,
    applicantName,
    applicantEmail,
    applicantPhone,
    major,
    gpa,
    expectedGraduationYear,
    leadershipExperience,
    heardAbout,
    honorCodeConfirmed
  ) {
    if (!honorCodeConfirmed) {
      return {
        success: false,
        message: 'Honor code must be confirmed before submitting.',
        application: null
      };
    }

    const applications = this._getFromStorage('applications', []);
    const tracks = this._getFromStorage('application_tracks', []);
    const cycles = this._getFromStorage('recruitment_cycles', []);

    const track = tracks.find((t) => t.id === trackId) || null;
    const cycle = cycles.find((c) => c.id === recruitmentCycleId) || null;

    if (!track || !cycle) {
      return {
        success: false,
        message: 'Invalid track or recruitment cycle.',
        application: null
      };
    }

    const nowIso = new Date().toISOString();

    const appId = this._generateId('app');
    const appRecord = {
      id: appId,
      track_id: trackId,
      recruitment_cycle_id: recruitmentCycleId,
      status: 'submitted',
      created_at: nowIso,
      submitted_at: nowIso,
      last_updated_at: nowIso,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone,
      major,
      gpa,
      expected_graduation_year: expectedGraduationYear,
      leadership_experience: leadershipExperience || '',
      heard_about: heardAbout || null,
      honor_code_confirmed: !!honorCodeConfirmed
    };

    applications.push(appRecord);
    this._saveToStorage('applications', applications);

    return {
      success: true,
      message: 'Application submitted successfully.',
      application: {
        id: appRecord.id,
        trackId: appRecord.track_id,
        recruitmentCycleId: appRecord.recruitment_cycle_id,
        status: appRecord.status,
        createdAt: appRecord.created_at,
        submittedAt: appRecord.submitted_at,
        lastUpdatedAt: appRecord.last_updated_at,
        applicantName: appRecord.applicant_name,
        applicantEmail: appRecord.applicant_email,
        applicantPhone: appRecord.applicant_phone,
        major: appRecord.major,
        gpa: appRecord.gpa,
        expectedGraduationYear: appRecord.expected_graduation_year,
        leadershipExperience: appRecord.leadership_experience,
        heardAbout: appRecord.heard_about,
        honorCodeConfirmed: appRecord.honor_code_confirmed
      }
    };
  }

  // listInterviewSlots(recruitmentCycleId, filters, sortByStartTime)
  listInterviewSlots(recruitmentCycleId, filters, sortByStartTime) {
    const slots = this._getFromStorage('interview_slots', []);
    const f = filters || {};

    let filtered = slots.filter((s) => s.recruitment_cycle_id === recruitmentCycleId);

    if (f.dayOfWeek) {
      filtered = filtered.filter((s) => s.day_of_week === f.dayOfWeek);
    }

    if (f.format) {
      filtered = filtered.filter((s) => s.format === f.format);
    }

    if (f.onlyAvailable) {
      filtered = filtered.filter((s) => s.is_available === true);
    }

    const dir = sortByStartTime === 'desc' ? -1 : 1;
    filtered.sort((a, b) => (new Date(a.start_datetime) - new Date(b.start_datetime)) * dir);

    return filtered.map((s) => ({
      id: s.id,
      recruitmentCycleId: s.recruitment_cycle_id,
      startDatetime: s.start_datetime,
      endDatetime: s.end_datetime,
      dayOfWeek: s.day_of_week,
      format: s.format,
      locationName: s.location_name || '',
      locationAddress: s.location_address || '',
      capacity: typeof s.capacity === 'number' ? s.capacity : null,
      reservedCount: typeof s.reserved_count === 'number' ? s.reserved_count : 0,
      isAvailable: !!s.is_available
    }));
  }

  // getInterviewSlotDetails(interviewSlotId)
  getInterviewSlotDetails(interviewSlotId) {
    const slots = this._getFromStorage('interview_slots', []);
    const s = slots.find((slot) => slot.id === interviewSlotId) || null;

    return {
      slot: s
        ? {
            id: s.id,
            recruitmentCycleId: s.recruitment_cycle_id,
            startDatetime: s.start_datetime,
            endDatetime: s.end_datetime,
            dayOfWeek: s.day_of_week,
            format: s.format,
            locationName: s.location_name || '',
            locationAddress: s.location_address || '',
            capacity: typeof s.capacity === 'number' ? s.capacity : null,
            reservedCount: typeof s.reserved_count === 'number' ? s.reserved_count : 0,
            isAvailable: !!s.is_available
          }
        : null
    };
  }

  // bookInterviewSlot(interviewSlotId, candidateName, candidateEmail)
  bookInterviewSlot(interviewSlotId, candidateName, candidateEmail) {
    let slots = this._getFromStorage('interview_slots', []);
    const slot = slots.find((s) => s.id === interviewSlotId);
    if (!slot) {
      return {
        success: false,
        message: 'Interview slot not found.',
        booking: null,
        slot: null
      };
    }

    // Ensure single active booking per cycle for this candidate
    this._ensureSingleActiveInterviewBookingPerCycle(candidateEmail, slot.recruitment_cycle_id);

    // Reload slots/bookings after potential modifications
    slots = this._getFromStorage('interview_slots', []);
    const updatedSlot = slots.find((s) => s.id === interviewSlotId);
    if (!updatedSlot) {
      return {
        success: false,
        message: 'Interview slot not found after update.',
        booking: null,
        slot: null
      };
    }

    const capacity = typeof updatedSlot.capacity === 'number' ? updatedSlot.capacity : null;
    const reservedCount = typeof updatedSlot.reserved_count === 'number' ? updatedSlot.reserved_count : 0;

    if (capacity !== null && reservedCount >= capacity) {
      updatedSlot.is_available = false;
      this._saveToStorage('interview_slots', slots);
      return {
        success: false,
        message: 'Interview slot is fully booked.',
        booking: null,
        slot: {
          id: updatedSlot.id,
          isAvailable: !!updatedSlot.is_available,
          reservedCount: reservedCount
        }
      };
    }

    const bookings = this._getFromStorage('interview_bookings', []);
    const nowIso = new Date().toISOString();
    const bookingId = this._generateId('intbook');

    const bookingRecord = {
      id: bookingId,
      interview_slot_id: updatedSlot.id,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      status: 'reserved',
      reserved_at: nowIso
    };

    bookings.push(bookingRecord);

    updatedSlot.reserved_count = reservedCount + 1;
    if (capacity !== null && updatedSlot.reserved_count >= capacity) {
      updatedSlot.is_available = false;
    } else {
      updatedSlot.is_available = true;
    }

    this._saveToStorage('interview_bookings', bookings);
    this._saveToStorage('interview_slots', slots);

    return {
      success: true,
      message: 'Interview slot booked successfully.',
      booking: {
        id: bookingRecord.id,
        interviewSlotId: bookingRecord.interview_slot_id,
        candidateName: bookingRecord.candidate_name,
        candidateEmail: bookingRecord.candidate_email,
        status: bookingRecord.status,
        reservedAt: bookingRecord.reserved_at
      },
      slot: {
        id: updatedSlot.id,
        isAvailable: !!updatedSlot.is_available,
        reservedCount: updatedSlot.reserved_count
      }
    };
  }

  // getMemberDirectoryFilters()
  getMemberDirectoryFilters() {
    const members = this._getFromStorage('members', []);

    const industries = [
      { value: 'investment_banking', label: 'Investment Banking' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'finance', label: 'Finance' },
      { value: 'accounting', label: 'Accounting' },
      { value: 'technology', label: 'Technology' },
      { value: 'other', label: 'Other' }
    ];

    const majorsSet = new Set();
    const gradYearsSet = new Set();
    for (const m of members) {
      if (m.major) majorsSet.add(m.major);
      if (typeof m.graduation_year === 'number') gradYearsSet.add(m.graduation_year);
    }

    const majors = Array.from(majorsSet).sort();
    const graduationYears = Array.from(gradYearsSet).sort((a, b) => a - b);

    const sortOptions = [
      { value: 'last_name_asc', label: 'Last Name A–Z' },
      { value: 'last_name_desc', label: 'Last Name Z–A' }
    ];

    return {
      industries,
      majors,
      graduationYears,
      sortOptions
    };
  }

  // searchMembers(filters, sortBy, sortDirection)
  searchMembers(filters, sortBy, sortDirection) {
    const members = this._getFromStorage('members', []);
    const experiences = this._getFromStorage('member_experiences', []);

    const f = filters || {};
    const graduationYearsSet = Array.isArray(f.graduationYears) && f.graduationYears.length
      ? new Set(f.graduationYears)
      : null;
    const majorsSet = Array.isArray(f.majors) && f.majors.length
      ? new Set(f.majors)
      : null;

    const filtered = members.filter((m) => {
      // primaryInternshipIndustry with hierarchical consideration via MemberExperience
      if (f.primaryInternshipIndustry) {
        const val = f.primaryInternshipIndustry;
        const matchesPrimary = m.primary_internship_industry === val;
        const matchesExperience = experiences.some(
          (exp) =>
            exp.member_id === m.id &&
            exp.experience_type === 'internship' &&
            exp.industry === val
        );
        if (!matchesPrimary && !matchesExperience) return false;
      }

      if (majorsSet && !majorsSet.has(m.major)) return false;
      if (graduationYearsSet && !graduationYearsSet.has(m.graduation_year)) return false;
      return true;
    });

    const dir = sortDirection === 'desc' ? -1 : 1;
    if (sortBy === 'last_name') {
      filtered.sort((a, b) => {
        const an = (a.last_name || '').toLowerCase();
        const bn = (b.last_name || '').toLowerCase();
        if (an < bn) return -1 * dir;
        if (an > bn) return 1 * dir;
        return 0;
      });
    }

    return filtered.map((m) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      fullName: m.full_name,
      photoUrl: m.photo_url || '',
      major: m.major,
      graduationYear: m.graduation_year,
      primaryInternshipIndustry: m.primary_internship_industry || null,
      headline: m.headline || ''
    }));
  }

  // getMemberProfile(memberId)
  getMemberProfile(memberId) {
    const members = this._getFromStorage('members', []);
    const experiences = this._getFromStorage('member_experiences', []);
    const shortlist = this._getOrCreateShortlistStore();

    const m = members.find((mm) => mm.id === memberId) || null;

    const member = m
      ? {
          id: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          fullName: m.full_name,
          photoUrl: m.photo_url || '',
          major: m.major,
          graduationYear: m.graduation_year,
          primaryInternshipIndustry: m.primary_internship_industry || null,
          headline: m.headline || '',
          bio: m.bio || ''
        }
      : null;

    const memberExperiences = experiences
      .filter((e) => e.member_id === memberId)
      .map((e) => ({
        id: e.id,
        organizationName: e.organization_name,
        roleTitle: e.role_title,
        location: e.location || '',
        startDate: e.start_date || null,
        endDate: e.end_date || null,
        currentlyActive: !!e.currently_active,
        experienceType: e.experience_type,
        industry: e.industry || null,
        description: e.description || ''
      }));

    const isShortlisted = shortlist.some((s) => s.member_id === memberId);

    return {
      member,
      experiences: memberExperiences,
      isShortlisted
    };
  }

  // addMemberToShortlist(memberId, note)
  addMemberToShortlist(memberId, note) {
    const members = this._getFromStorage('members', []);
    const m = members.find((mm) => mm.id === memberId);
    if (!m) {
      return {
        success: false,
        message: 'Member not found.',
        shortlistedMember: null
      };
    }

    let shortlist = this._getOrCreateShortlistStore();
    let existing = shortlist.find((s) => s.member_id === memberId);
    if (existing) {
      return {
        success: true,
        message: 'Member is already in your shortlist.',
        shortlistedMember: {
          id: existing.id,
          memberId: existing.member_id,
          addedAt: existing.added_at,
          note: existing.note || ''
        }
      };
    }

    const nowIso = new Date().toISOString();
    const id = this._generateId('shortlist');
    const record = {
      id,
      member_id: memberId,
      added_at: nowIso,
      note: note || ''
    };

    shortlist.push(record);
    this._saveToStorage('shortlisted_members', shortlist);

    return {
      success: true,
      message: 'Member added to shortlist.',
      shortlistedMember: {
        id: record.id,
        memberId: record.member_id,
        addedAt: record.added_at,
        note: record.note
      }
    };
  }

  // removeMemberFromShortlist(shortlistedMemberId)
  removeMemberFromShortlist(shortlistedMemberId) {
    let shortlist = this._getOrCreateShortlistStore();
    const idx = shortlist.findIndex((s) => s.id === shortlistedMemberId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Shortlisted member not found.'
      };
    }

    shortlist.splice(idx, 1);
    this._saveToStorage('shortlisted_members', shortlist);

    return {
      success: true,
      message: 'Shortlisted member removed.'
    };
  }

  // getShortlistedMembers()
  getShortlistedMembers() {
    const shortlist = this._getOrCreateShortlistStore();
    const members = this._getFromStorage('members', []);

    return shortlist.map((s) => {
      const m = members.find((mm) => mm.id === s.member_id) || null;
      return {
        shortlistedMemberId: s.id,
        addedAt: s.added_at,
        note: s.note || '',
        member: m
          ? {
              id: m.id,
              fullName: m.full_name,
              photoUrl: m.photo_url || '',
              major: m.major,
              graduationYear: m.graduation_year,
              primaryInternshipIndustry: m.primary_internship_industry || null,
              headline: m.headline || ''
            }
          : null
      };
    });
  }

  // getFAQEntries(category)
  getFAQEntries(category) {
    const faqs = this._getFromStorage('faq_entries', []);

    let filtered = faqs.filter((f) => f.is_active === true);
    if (category) {
      filtered = filtered.filter((f) => f.category === category);
    }

    filtered.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });

    return filtered.map((f) => ({
      id: f.id,
      category: f.category,
      question: f.question,
      answer: f.answer,
      sortOrder: typeof f.sort_order === 'number' ? f.sort_order : null,
      isActive: !!f.is_active
    }));
  }

  // getContactFormOptions()
  getContactFormOptions() {
    const topics = [
      { value: 'application_requirements', label: 'Application Requirements' },
      { value: 'eligibility', label: 'Eligibility' },
      { value: 'events', label: 'Events' },
      { value: 'interviews', label: 'Interviews' },
      { value: 'dues_financial_aid', label: 'Dues & Financial Aid' },
      { value: 'general', label: 'General' },
      { value: 'other', label: 'Other' }
    ];

    const recipients = [
      { value: 'recruitment_chair', label: 'Recruitment Chair', roleDescription: 'Leads recruitment and answers applicant questions.' },
      { value: 'president', label: 'President', roleDescription: 'Chapter president.' },
      { value: 'vp_finance', label: 'VP Finance', roleDescription: 'Handles dues and financial aid.' },
      { value: 'secretary', label: 'Secretary', roleDescription: 'General chapter inquiries.' },
      { value: 'other', label: 'Other', roleDescription: 'Other inquiries.' }
    ];

    return { topics, recipients };
  }

  // submitContactMessage(topic, recipient, subject, message, senderName, senderEmail)
  submitContactMessage(topic, recipient, subject, message, senderName, senderEmail) {
    const validTopics = new Set([
      'application_requirements',
      'eligibility',
      'events',
      'interviews',
      'dues_financial_aid',
      'general',
      'other'
    ]);
    const validRecipients = new Set([
      'recruitment_chair',
      'president',
      'vp_finance',
      'secretary',
      'other'
    ]);

    const normalizedTopic = validTopics.has(topic) ? topic : 'other';
    const normalizedRecipient = validRecipients.has(recipient) ? recipient : 'other';

    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const nowIso = new Date().toISOString();

    const record = {
      id,
      topic: normalizedTopic,
      recipient: normalizedRecipient,
      subject,
      message,
      sender_name: senderName,
      sender_email: senderEmail,
      status: 'received',
      sent_at: nowIso
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted successfully.',
      contactMessage: {
        id: record.id,
        topic: record.topic,
        recipient: record.recipient,
        subject: record.subject,
        body: record.message,
        senderName: record.sender_name,
        senderEmail: record.sender_email,
        status: record.status,
        sentAt: record.sent_at
      }
    };
  }

  // getDuesOverview()
  getDuesOverview() {
    const plans = this._getFromStorage('payment_plans', []);
    const activePlans = plans.filter((p) => p.is_active === true);

    let baseDues = null;
    let additionalFees = null;
    if (activePlans.length > 0) {
      baseDues = activePlans[0].base_dues != null ? activePlans[0].base_dues : null;
      additionalFees = activePlans[0].additional_fees != null ? activePlans[0].additional_fees : null;
    }

    const overviewText = activePlans.length
      ? 'Review the available membership dues payment plans and select the option that works best for you.'
      : 'No membership dues payment plans are currently configured.';

    const notes = [
      'Total cost varies by payment plan and may include additional fees.',
      'Financial aid or special accommodations may be available through the VP Finance.'
    ];

    return {
      baseDues,
      additionalFees,
      overviewText,
      notes
    };
  }

  // getPaymentPlans(includeInactive, maxTotalCost)
  getPaymentPlans(includeInactive, maxTotalCost) {
    const plans = this._getFromStorage('payment_plans', []);

    let filtered = plans;
    if (!includeInactive) {
      filtered = filtered.filter((p) => p.is_active === true);
    }

    if (typeof maxTotalCost === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.total_cost === 'number' && p.total_cost < maxTotalCost
      );
    }

    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      baseDues: p.base_dues != null ? p.base_dues : null,
      additionalFees: p.additional_fees != null ? p.additional_fees : null,
      totalCost: p.total_cost,
      numberOfInstallments: p.number_of_installments,
      lastPaymentDate: p.last_payment_date || null,
      isActive: !!p.is_active
    }));
  }

  // getPaymentPlanDetails(paymentPlanId)
  getPaymentPlanDetails(paymentPlanId) {
    const plans = this._getFromStorage('payment_plans', []);
    const p = plans.find((pp) => pp.id === paymentPlanId) || null;

    if (!p) {
      return {
        id: null,
        name: '',
        description: '',
        baseDues: null,
        additionalFees: null,
        totalCost: null,
        numberOfInstallments: null,
        installmentAmounts: [],
        installmentDates: [],
        lastPaymentDate: null,
        isActive: false
      };
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      baseDues: p.base_dues != null ? p.base_dues : null,
      additionalFees: p.additional_fees != null ? p.additional_fees : null,
      totalCost: p.total_cost,
      numberOfInstallments: p.number_of_installments,
      installmentAmounts: Array.isArray(p.installment_amounts) ? p.installment_amounts : [],
      installmentDates: Array.isArray(p.installment_dates) ? p.installment_dates : [],
      lastPaymentDate: p.last_payment_date || null,
      isActive: !!p.is_active
    };
  }

  // selectPaymentPlan(paymentPlanId, memberName, memberEmail, agreedToTerms)
  selectPaymentPlan(paymentPlanId, memberName, memberEmail, agreedToTerms) {
    if (!agreedToTerms) {
      return {
        success: false,
        message: 'You must agree to the payment terms to select a plan.',
        paymentPlanSelection: null
      };
    }

    const plans = this._getFromStorage('payment_plans', []);
    const plan = plans.find((p) => p.id === paymentPlanId && p.is_active === true);

    if (!plan) {
      return {
        success: false,
        message: 'Payment plan not found or inactive.',
        paymentPlanSelection: null
      };
    }

    const selections = this._getFromStorage('payment_plan_selections', []);
    const id = this._generateId('planSel');
    const nowIso = new Date().toISOString();

    const record = {
      id,
      payment_plan_id: paymentPlanId,
      member_name: memberName,
      member_email: memberEmail,
      agreed_to_terms: !!agreedToTerms,
      status: 'selected',
      selected_at: nowIso
    };

    selections.push(record);
    this._saveToStorage('payment_plan_selections', selections);

    return {
      success: true,
      message: 'Payment plan selected successfully.',
      paymentPlanSelection: {
        id: record.id,
        paymentPlanId: record.payment_plan_id,
        memberName: record.member_name,
        memberEmail: record.member_email,
        agreedToTerms: record.agreed_to_terms,
        status: record.status,
        selectedAt: record.selected_at
      }
    };
  }

  // getRecruitmentTimelineEntries(recruitmentCycleId, applicantType, eventType)
  getRecruitmentTimelineEntries(recruitmentCycleId, applicantType, eventType) {
    const entries = this._getFromStorage('recruitment_timeline_entries', []);
    const cycles = this._getFromStorage('recruitment_cycles', []);

    let filtered = entries.filter((e) => e.recruitment_cycle_id === recruitmentCycleId);

    if (applicantType) {
      filtered = filtered.filter((e) => e.applicant_type === applicantType);
    }

    if (eventType) {
      filtered = filtered.filter((e) => e.event_type === eventType);
    }

    return filtered.map((e) => {
      const cycle = cycles.find((c) => c.id === e.recruitment_cycle_id) || null;
      return {
        id: e.id,
        recruitmentCycleId: e.recruitment_cycle_id,
        applicantType: e.applicant_type,
        title: e.title,
        description: e.description || '',
        eventType: e.event_type,
        date: e.date,
        endDate: e.end_date || null,
        isMajorMilestone: !!e.is_major_milestone,
        // Foreign key resolution
        recruitmentCycle: cycle
          ? {
              id: cycle.id,
              name: cycle.name,
              season: cycle.season,
              year: cycle.year,
              startDate: cycle.start_date || null,
              endDate: cycle.end_date || null,
              status: cycle.status
            }
          : null
      };
    });
  }

  // getReminders()
  getReminders() {
    const reminders = this._getFromStorage('reminders', []);
    const timelineEntries = this._getFromStorage('recruitment_timeline_entries', []);

    return reminders.map((r) => {
      const related = r.related_timeline_entry_id
        ? timelineEntries.find((e) => e.id === r.related_timeline_entry_id) || null
        : null;

      return {
        id: r.id,
        title: r.title,
        reminderDatetime: r.reminder_datetime,
        createdAt: r.created_at,
        relatedTimelineEntryId: r.related_timeline_entry_id || null,
        notes: r.notes || '',
        isCompleted: !!r.is_completed,
        // Foreign key resolution for relatedTimelineEntryId
        relatedTimelineEntry: related
          ? {
              id: related.id,
              recruitmentCycleId: related.recruitment_cycle_id,
              applicantType: related.applicant_type,
              title: related.title,
              description: related.description || '',
              eventType: related.event_type,
              date: related.date,
              endDate: related.end_date || null,
              isMajorMilestone: !!related.is_major_milestone
            }
          : null
      };
    });
  }

  // addReminder(title, reminderDate, reminderTime, relatedTimelineEntryId, notes)
  addReminder(title, reminderDate, reminderTime, relatedTimelineEntryId, notes) {
    const reminders = this._getFromStorage('reminders', []);

    const reminderDatetime = this._combineDateAndTimeToDatetime(reminderDate, reminderTime);
    const nowIso = new Date().toISOString();
    const id = this._generateId('rem');

    const record = {
      id,
      title,
      reminder_datetime: reminderDatetime,
      created_at: nowIso,
      related_timeline_entry_id: relatedTimelineEntryId || null,
      notes: notes || '',
      is_completed: false
    };

    reminders.push(record);
    this._saveToStorage('reminders', reminders);

    return {
      success: true,
      message: 'Reminder created successfully.',
      reminder: {
        id: record.id,
        title: record.title,
        reminderDatetime: record.reminder_datetime,
        createdAt: record.created_at,
        relatedTimelineEntryId: record.related_timeline_entry_id,
        notes: record.notes,
        isCompleted: record.is_completed
      }
    };
  }

  // getCommittees(onlyOpenToNewMembers, minAverageEventsPerSemester)
  getCommittees(onlyOpenToNewMembers, minAverageEventsPerSemester) {
    const committees = this._getFromStorage('committees', []);

    let filtered = committees;
    if (onlyOpenToNewMembers) {
      filtered = filtered.filter((c) => c.is_open_to_new_members === true);
    }

    if (typeof minAverageEventsPerSemester === 'number') {
      filtered = filtered.filter(
        (c) => typeof c.average_events_per_semester === 'number' && c.average_events_per_semester >= minAverageEventsPerSemester
      );
    }

    return filtered.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      category: c.category || null,
      isOpenToNewMembers: !!c.is_open_to_new_members,
      averageEventsPerSemester: c.average_events_per_semester,
      contactEmail: c.contact_email || ''
    }));
  }

  // saveCommitteePreferences(firstChoiceCommitteeId, secondChoiceCommitteeId, thirdChoiceCommitteeId)
  saveCommitteePreferences(firstChoiceCommitteeId, secondChoiceCommitteeId, thirdChoiceCommitteeId) {
    let prefs = this._getFromStorage('committee_preferences', []);
    const nowIso = new Date().toISOString();

    let record;
    if (prefs.length > 0) {
      // Update the first (only) record
      record = prefs[0];
      record.first_choice_committee_id = firstChoiceCommitteeId;
      record.second_choice_committee_id = secondChoiceCommitteeId;
      record.third_choice_committee_id = thirdChoiceCommitteeId;
      record.updated_at = nowIso;
    } else {
      const id = this._generateId('comPref');
      record = {
        id,
        first_choice_committee_id: firstChoiceCommitteeId,
        second_choice_committee_id: secondChoiceCommitteeId,
        third_choice_committee_id: thirdChoiceCommitteeId,
        created_at: nowIso,
        updated_at: nowIso
      };
      prefs.push(record);
    }

    this._saveToStorage('committee_preferences', prefs);

    return {
      success: true,
      message: 'Committee preferences saved successfully.',
      preferences: {
        id: record.id,
        firstChoiceCommitteeId: record.first_choice_committee_id,
        secondChoiceCommitteeId: record.second_choice_committee_id,
        thirdChoiceCommitteeId: record.third_choice_committee_id,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }
    };
  }

  // getAboutContent()
  getAboutContent() {
    // Optionally allow overriding via localStorage key 'about_content'
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object') {
      return {
        missionText: stored.missionText || '',
        valuesText: stored.valuesText || '',
        historyText: stored.historyText || '',
        professionalFocus: stored.professionalFocus || '',
        socialFocus: stored.socialFocus || '',
        philanthropyFocus: stored.philanthropyFocus || '',
        recruitmentOverviewText: stored.recruitmentOverviewText || ''
      };
    }

    // Fallback static content (no mocking of entity data)
    const missionText = 'Our mission is to develop principled business leaders through professional development, academic support, and a strong brotherhood.';
    const valuesText = 'We value integrity, inclusivity, excellence, and lifelong learning in all that we do as a professional fraternity.';
    const historyText = 'Founded on our campus to connect motivated students with real-world business opportunities, our chapter has grown into a diverse and supportive community.';
    const professionalFocus = 'We host workshops, case competitions, and networking events with alumni and industry professionals across consulting, finance, technology, and more.';
    const socialFocus = 'From formals and retreats to informal hangouts, our social events help build friendships that last beyond graduation.';
    const philanthropyFocus = 'Brothers volunteer with local and national organizations, supporting causes that matter to our members and community.';
    const recruitmentOverviewText = 'Recruitment occurs each semester and includes info sessions, professional workshops, and interviews designed to help you learn about our chapter and demonstrate your potential.';

    return {
      missionText,
      valuesText,
      historyText,
      professionalFocus,
      socialFocus,
      philanthropyFocus,
      recruitmentOverviewText
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
