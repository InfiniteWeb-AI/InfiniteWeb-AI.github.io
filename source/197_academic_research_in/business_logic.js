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

  // ------------ Storage & ID Helpers ------------

  _initStorage() {
    const keys = [
      'events',
      'event_registrations',
      'my_events',
      'publications',
      'reading_list_items',
      'academic_programs',
      'shortlisted_programs',
      'research_labs',
      'lab_projects',
      'lab_follows',
      'news_articles',
      'news_bookmarks',
      'share_actions',
      'campus_locations',
      'visiting_hours_rules',
      'visit_plan_entries',
      'grants',
      'saved_grant_deadlines',
      'faculty_members',
      'collaboration_list_entries',
      'donation_funds',
      'donations',
      // extra internal table for contact form submissions
      'contact_inquiries'
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _getOrCreateUserState() {
    // Single-user state aggregator; does not persist anything new
    return {
      myEvents: this._getFromStorage('my_events'),
      eventRegistrations: this._getFromStorage('event_registrations'),
      readingListItems: this._getFromStorage('reading_list_items'),
      shortlistedPrograms: this._getFromStorage('shortlisted_programs'),
      labFollows: this._getFromStorage('lab_follows'),
      newsBookmarks: this._getFromStorage('news_bookmarks'),
      shareActions: this._getFromStorage('share_actions'),
      visitPlanEntries: this._getFromStorage('visit_plan_entries'),
      savedGrantDeadlines: this._getFromStorage('saved_grant_deadlines'),
      collaborationListEntries: this._getFromStorage('collaboration_list_entries'),
      donations: this._getFromStorage('donations')
    };
  }

  // ------------ Generic helpers ------------

  _normalize(str) {
    if (str == null) return '';
    return String(str).toLowerCase();
  }

  _matchesQuery(item, fields, query) {
    if (!query) return true;
    const q = this._normalize(query);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const value = item[field];
      if (Array.isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          if (this._normalize(value[j]).indexOf(q) !== -1) return true;
        }
      } else if (this._normalize(value).indexOf(q) !== -1) {
        return true;
      }
    }
    return false;
  }

  _timeStringToMinutes(t) {
    if (!t || typeof t !== 'string') return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getEventStartDate(event) {
    if (!event || !event.startDateTime) return null;
    const d = new Date(event.startDateTime);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _getDateOnlyString(date) {
    if (!(date instanceof Date)) return null;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _resolveEventLocation(event) {
    if (!event || !event.locationId) return event;
    const locations = this._getFromStorage('campus_locations');
    const location = locations.find(function (l) { return l.id === event.locationId; }) || null;
    return Object.assign({}, event, { location: location });
  }

  _resolveForeignKeyArray(entries, keyField, targetStorageKey) {
    const targets = this._getFromStorage(targetStorageKey);
    return entries.map(function (entry) {
      const id = entry[keyField];
      const baseName = keyField.replace(/Id$/, '');
      const target = targets.find(function (t) { return t.id === id; }) || null;
      const obj = Object.assign({}, entry);
      obj[baseName] = target;
      return obj;
    });
  }

  // ------------ Home Page & Global Search ------------

  getHomePageOverview() {
    const events = this._getFromStorage('events');
    const news = this._getFromStorage('news_articles');
    const publications = this._getFromStorage('publications');

    const now = new Date();

    const upcoming = events
      .filter(e => {
        const d = this._getEventStartDate(e);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._getEventStartDate(a) || 0;
        const db = this._getEventStartDate(b) || 0;
        return da - db;
      })
      .slice(0, 5)
      .map(e => this._resolveEventLocation(e));

    const featuredNews = news
      .slice()
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    const featuredPublications = publications
      .slice()
      .sort((a, b) => {
        const ya = typeof a.year === 'number' ? a.year : 0;
        const yb = typeof b.year === 'number' ? b.year : 0;
        return yb - ya;
      })
      .slice(0, 5);

    const highlightedCallsToAction = [
      { id: 'plan_visit', label: 'Plan a visit', targetPage: 'visit' },
      { id: 'make_donation', label: 'Make a donation', targetPage: 'donate' },
      { id: 'explore_study', label: 'Explore master\'s programs', targetPage: 'study' }
    ];

    return {
      featuredEvents: upcoming,
      featuredNews: featuredNews,
      featuredPublications: featuredPublications,
      highlightedCallsToAction: highlightedCallsToAction
    };
  }

  searchSiteContent(query, section) {
    const q = query && query.trim() ? query : '';
    const sec = section || 'all';

    const result = {
      events: [],
      publications: [],
      news: [],
      programs: [],
      labs: [],
      faculty: [],
      grants: [],
      locations: []
    };

    const want = s => sec === 'all' || sec === s;

    if (want('events')) {
      const events = this._getFromStorage('events');
      const filtered = events.filter(e => this._matchesQuery(e, ['title', 'subtitle', 'description', 'discipline', 'keywords'], q));
      result.events = filtered.map(e => this._resolveEventLocation(e));
    }

    if (want('publications')) {
      const pubs = this._getFromStorage('publications');
      result.publications = pubs.filter(p => this._matchesQuery(p, ['title', 'abstract', 'journalOrVenue', 'keywords'], q));
    }

    if (want('news')) {
      const news = this._getFromStorage('news_articles');
      result.news = news.filter(n => this._matchesQuery(n, ['title', 'subtitle', 'body', 'tags'], q));
    }

    if (want('programs')) {
      const programs = this._getFromStorage('academic_programs');
      result.programs = programs.filter(p => this._matchesQuery(p, ['name', 'discipline', 'overview', 'curriculumSummary'], q));
    }

    if (want('labs')) {
      const labs = this._getFromStorage('research_labs');
      result.labs = labs.filter(l => this._matchesQuery(l, ['name', 'shortDescription', 'fullDescription', 'researchArea', 'department'], q));
    }

    if (want('faculty')) {
      const faculty = this._getFromStorage('faculty_members');
      result.faculty = faculty.filter(f => this._matchesQuery(f, ['fullName', 'firstName', 'lastName', 'biography', 'researchAreas', 'department'], q));
    }

    if (want('grants')) {
      const grants = this._getFromStorage('grants');
      result.grants = grants.filter(g => this._matchesQuery(g, ['title', 'description', 'sponsorName'], q));
    }

    if (want('locations')) {
      const locations = this._getFromStorage('campus_locations');
      result.locations = locations.filter(l => this._matchesQuery(l, ['name', 'description', 'addressLine1', 'addressLine2', 'city', 'postalCode', 'country', 'buildingCode'], q));
    }

    return result;
  }

  // ------------ Events & My Events ------------

  getEventFilterOptions() {
    const eventTypeOptions = [
      { value: 'public_lecture', label: 'Public lecture' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'conference', label: 'Conference' },
      { value: 'symposium', label: 'Symposium' },
      { value: 'other', label: 'Other' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'all_day', label: 'All day' }
    ];

    const sortOptions = [
      { value: 'start_datetime_asc', label: 'Start time (Earliest first)' },
      { value: 'start_datetime_desc', label: 'Start time (Latest first)' }
    ];

    const events = this._getFromStorage('events');
    let minDate = null;
    let maxDate = null;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const d = this._getEventStartDate(e);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    const today = new Date();
    const defaultStart = minDate || today;
    const defaultEnd = maxDate || today;

    const defaultDateRange = {
      startDate: this._getDateOnlyString(defaultStart),
      endDate: this._getDateOnlyString(defaultEnd)
    };

    return {
      eventTypeOptions: eventTypeOptions,
      timeOfDayOptions: timeOfDayOptions,
      sortOptions: sortOptions,
      defaultDateRange: defaultDateRange
    };
  }

  searchEvents(query, eventType, dateRange, startTimeFrom, sortBy, limit) {
    let events = this._getFromStorage('events');

    if (query && query.trim()) {
      events = events.filter(e => this._matchesQuery(e, ['title', 'subtitle', 'description', 'discipline', 'keywords'], query));
    }

    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }

    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      const startStr = dateRange.startDate;
      const endStr = dateRange.endDate;
      events = events.filter(e => {
        const d = this._getEventStartDate(e);
        if (!d) return false;
        const dateOnly = this._getDateOnlyString(d);
        if (startStr && dateOnly < startStr) return false;
        if (endStr && dateOnly > endStr) return false;
        return true;
      });
    }

    if (startTimeFrom) {
      const minMinutes = this._timeStringToMinutes(startTimeFrom);
      if (minMinutes != null) {
        events = events.filter(e => {
          if (!e.startDateTime) return false;
          const iso = String(e.startDateTime);
          const timePart = iso.length >= 16 ? iso.slice(11, 16) : null;
          const mins = this._timeStringToMinutes(timePart);
          if (mins == null) return false;
          return mins >= minMinutes;
        });
      }
    }

    const sort = sortBy || 'start_datetime_asc';
    events = events.slice().sort((a, b) => {
      const da = this._getEventStartDate(a) || 0;
      const db = this._getEventStartDate(b) || 0;
      if (sort === 'start_datetime_desc') return db - da;
      return da - db;
    });

    if (typeof limit === 'number' && limit > 0) {
      events = events.slice(0, limit);
    }

    return events.map(e => this._resolveEventLocation(e));
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const eventRaw = events.find(e => e.id === eventId) || null;
    const event = eventRaw ? this._resolveEventLocation(eventRaw) : null;

    const myEvents = this._getFromStorage('my_events');
    const isSavedToMyEvents = !!myEvents.find(me => me.eventId === eventId);

    const registrations = this._getFromStorage('event_registrations');
    const regsForEvent = registrations.filter(r => r.eventId === eventId);
    const userRegistrationsCount = regsForEvent.length;
    let registrationStatus = 'not_registered';
    if (userRegistrationsCount > 0) {
      const hasConfirmed = regsForEvent.some(r => r.status === 'confirmed');
      registrationStatus = hasConfirmed ? 'confirmed' : 'submitted';
    }

    let isRegistrationRequired = false;
    let isRegistrationOpen = false;
    if (eventRaw) {
      isRegistrationRequired = !!eventRaw.registrationRequired;
      if (!isRegistrationRequired) {
        isRegistrationOpen = false;
      } else {
        const now = new Date();
        const start = this._getEventStartDate(eventRaw) || now;
        const seatsOk = typeof eventRaw.remainingSeats !== 'number' || eventRaw.remainingSeats > 0;
        isRegistrationOpen = start > now && seatsOk;
      }
    }

    return {
      event: event,
      isSavedToMyEvents: isSavedToMyEvents,
      registrationState: {
        isRegistrationRequired: isRegistrationRequired,
        isRegistrationOpen: isRegistrationOpen,
        registrationStatus: registrationStatus,
        userRegistrationsCount: userRegistrationsCount
      }
    };
  }

  registerForEvent(eventId, attendeeName, attendeeEmail, affiliation, numberOfAttendees) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', registration: null };
    }

    const registrations = this._getFromStorage('event_registrations');

    const registration = {
      id: this._generateId('eventreg'),
      eventId: eventId,
      attendeeName: attendeeName,
      attendeeEmail: attendeeEmail,
      affiliation: affiliation || null,
      numberOfAttendees: typeof numberOfAttendees === 'number' ? numberOfAttendees : 1,
      status: 'submitted',
      submittedAt: this._getCurrentTimestamp(),
      notes: null
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration submitted',
      registration: registration
    };
  }

  saveEventToMyEvents(eventId, notes) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', myEventEntry: null };
    }

    const myEvents = this._getFromStorage('my_events');
    let entry = myEvents.find(me => me.eventId === eventId);
    if (entry) {
      if (typeof notes === 'string') {
        entry.notes = notes;
        this._saveToStorage('my_events', myEvents);
      }
      return { success: true, message: 'Event already saved', myEventEntry: entry };
    }

    entry = {
      id: this._generateId('myevent'),
      eventId: eventId,
      savedAt: this._getCurrentTimestamp(),
      notes: notes || null
    };

    myEvents.push(entry);
    this._saveToStorage('my_events', myEvents);

    return { success: true, message: 'Event saved to My Events', myEventEntry: entry };
  }

  getMyEvents() {
    const entries = this._getFromStorage('my_events');
    const events = this._getFromStorage('events');
    const locations = this._getFromStorage('campus_locations');

    return entries.map(entry => {
      const event = events.find(e => e.id === entry.eventId) || null;
      let eventWithLocation = null;
      if (event && event.locationId) {
        const location = locations.find(l => l.id === event.locationId) || null;
        eventWithLocation = Object.assign({}, event, { location: location });
      } else {
        eventWithLocation = event;
      }
      return {
        entry: entry,
        event: eventWithLocation
      };
    });
  }

  // ------------ Publications & Reading List ------------

  getPublicationFilterOptions() {
    const publications = this._getFromStorage('publications');
    let minYear = null;
    let maxYear = null;
    for (let i = 0; i < publications.length; i++) {
      const y = publications[i].year;
      if (typeof y !== 'number') continue;
      if (minYear == null || y < minYear) minYear = y;
      if (maxYear == null || y > maxYear) maxYear = y;
    }

    const yearRangeDefaults = {
      minYear: minYear != null ? minYear : new Date().getFullYear(),
      maxYear: maxYear != null ? maxYear : new Date().getFullYear()
    };

    const sortOptions = [
      { value: 'year_desc', label: 'Year (Newest first)' },
      { value: 'year_asc', label: 'Year (Oldest first)' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      yearRangeDefaults: yearRangeDefaults,
      sortOptions: sortOptions
    };
  }

  searchPublications(query, minYear, maxYear, sortBy, limit) {
    let pubs = this._getFromStorage('publications');

    if (query && query.trim()) {
      pubs = pubs.filter(p => this._matchesQuery(p, ['title', 'abstract', 'journalOrVenue', 'keywords'], query));
    }

    if (typeof minYear === 'number') {
      pubs = pubs.filter(p => typeof p.year === 'number' && p.year >= minYear);
    }

    if (typeof maxYear === 'number') {
      pubs = pubs.filter(p => typeof p.year === 'number' && p.year <= maxYear);
    }

    const sort = sortBy || 'year_desc';
    pubs = pubs.slice().sort((a, b) => {
      const ya = typeof a.year === 'number' ? a.year : 0;
      const yb = typeof b.year === 'number' ? b.year : 0;
      if (sort === 'year_asc') return ya - yb;
      if (sort === 'title_asc') {
        return this._normalize(a.title).localeCompare(this._normalize(b.title));
      }
      return yb - ya;
    });

    if (typeof limit === 'number' && limit > 0) {
      pubs = pubs.slice(0, limit);
    }

    return pubs;
  }

  getPublicationDetail(publicationId) {
    const pubs = this._getFromStorage('publications');
    const publication = pubs.find(p => p.id === publicationId) || null;
    const readingItems = this._getFromStorage('reading_list_items');
    const inReadingList = !!readingItems.find(i => i.publicationId === publicationId);
    return {
      publication: publication,
      inReadingList: inReadingList
    };
  }

  addPublicationToReadingList(publicationId, notes) {
    const pubs = this._getFromStorage('publications');
    const publication = pubs.find(p => p.id === publicationId);
    if (!publication) {
      return { success: false, message: 'Publication not found', readingListItem: null };
    }

    const items = this._getFromStorage('reading_list_items');
    let existing = items.find(i => i.publicationId === publicationId);
    if (existing) {
      if (typeof notes === 'string') {
        existing.notes = notes;
        this._saveToStorage('reading_list_items', items);
      }
      return { success: true, message: 'Publication already in Reading List', readingListItem: existing };
    }

    const item = {
      id: this._generateId('readitem'),
      publicationId: publicationId,
      addedAt: this._getCurrentTimestamp(),
      notes: notes || null
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return { success: true, message: 'Publication added to Reading List', readingListItem: item };
  }

  removePublicationFromReadingList(publicationId) {
    const items = this._getFromStorage('reading_list_items');
    const before = items.length;
    const filtered = items.filter(i => i.publicationId !== publicationId);
    this._saveToStorage('reading_list_items', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Publication removed from Reading List' : 'Publication was not on Reading List'
    };
  }

  getReadingList() {
    const items = this._getFromStorage('reading_list_items');
    const pubs = this._getFromStorage('publications');
    return items.map(item => {
      const pub = pubs.find(p => p.id === item.publicationId) || null;
      return { item: item, publication: pub };
    });
  }

  // ------------ Academic Programs & Shortlist ------------

  getMastersProgramFilterOptions() {
    const programs = this._getFromStorage('academic_programs');

    const disciplineValues = ['data_science', 'machine_learning', 'neuroscience', 'computer_science', 'statistics', 'other'];
    const disciplineOptions = disciplineValues.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const languageValues = ['english', 'german', 'french', 'spanish', 'other'];
    const languageOptions = languageValues.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const durationSet = {};
    for (let i = 0; i < programs.length; i++) {
      const d = programs[i].durationYears;
      if (typeof d === 'number') durationSet[d] = true;
    }
    const durationYearOptions = Object.keys(durationSet).map(k => parseInt(k, 10)).sort((a, b) => a - b);

    let maxTuition = 0;
    for (let j = 0; j < programs.length; j++) {
      const t = programs[j].annualTuitionAmount;
      if (typeof t === 'number' && t > maxTuition) maxTuition = t;
    }

    const sortOptions = [
      { value: 'tuition_asc', label: 'Tuition (Low to High)' },
      { value: 'tuition_desc', label: 'Tuition (High to Low)' },
      { value: 'name_asc', label: 'Name (A–Z)' }
    ];

    return {
      disciplineOptions: disciplineOptions,
      languageOptions: languageOptions,
      durationYearOptions: durationYearOptions,
      maxTuitionDefault: maxTuition,
      sortOptions: sortOptions
    };
  }

  searchAcademicPrograms(degreeLevel, discipline, languageOfInstruction, durationYears, maxAnnualTuition, sortBy) {
    let programs = this._getFromStorage('academic_programs');

    if (degreeLevel) {
      programs = programs.filter(p => p.degreeLevel === degreeLevel);
    }
    if (discipline) {
      programs = programs.filter(p => p.discipline === discipline);
    }
    if (languageOfInstruction) {
      programs = programs.filter(p => p.languageOfInstruction === languageOfInstruction);
    }
    if (typeof durationYears === 'number') {
      programs = programs.filter(p => p.durationYears === durationYears);
    }
    if (typeof maxAnnualTuition === 'number') {
      programs = programs.filter(p => typeof p.annualTuitionAmount === 'number' && p.annualTuitionAmount <= maxAnnualTuition);
    }

    const sort = sortBy || 'name_asc';
    programs = programs.slice().sort((a, b) => {
      if (sort === 'tuition_asc') {
        return (a.annualTuitionAmount || 0) - (b.annualTuitionAmount || 0);
      }
      if (sort === 'tuition_desc') {
        return (b.annualTuitionAmount || 0) - (a.annualTuitionAmount || 0);
      }
      // name_asc
      return this._normalize(a.name).localeCompare(this._normalize(b.name));
    });

    return programs;
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('academic_programs');
    const program = programs.find(p => p.id === programId) || null;
    const shortlisted = this._getFromStorage('shortlisted_programs');
    const isShortlisted = !!shortlisted.find(s => s.programId === programId);
    return {
      program: program,
      isShortlisted: isShortlisted
    };
  }

  addProgramToShortlist(programId, priority, notes) {
    const programs = this._getFromStorage('academic_programs');
    const program = programs.find(p => p.id === programId);
    if (!program) {
      return { success: false, message: 'Program not found', shortlistedProgram: null };
    }

    const shortlist = this._getFromStorage('shortlisted_programs');
    let existing = shortlist.find(s => s.programId === programId);
    if (existing) {
      if (priority) existing.priority = priority;
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('shortlisted_programs', shortlist);
      return { success: true, message: 'Program already shortlisted', shortlistedProgram: existing };
    }

    const entry = {
      id: this._generateId('shortprog'),
      programId: programId,
      addedAt: this._getCurrentTimestamp(),
      priority: priority || null,
      notes: notes || null
    };

    shortlist.push(entry);
    this._saveToStorage('shortlisted_programs', shortlist);

    return { success: true, message: 'Program added to shortlist', shortlistedProgram: entry };
  }

  removeProgramFromShortlist(programId) {
    const shortlist = this._getFromStorage('shortlisted_programs');
    const before = shortlist.length;
    const filtered = shortlist.filter(s => s.programId !== programId);
    this._saveToStorage('shortlisted_programs', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Program removed from shortlist' : 'Program was not on shortlist'
    };
  }

  getShortlistedPrograms() {
    const shortlist = this._getFromStorage('shortlisted_programs');
    const programs = this._getFromStorage('academic_programs');
    return shortlist.map(entry => {
      const program = programs.find(p => p.id === entry.programId) || null;
      return { entry: entry, program: program };
    });
  }

  // ------------ Research Labs & Follows ------------

  getLabFilterOptions() {
    const researchAreaValues = ['neuroscience', 'machine_learning', 'data_science', 'climate_change', 'biology', 'physics', 'other'];
    const researchAreaOptions = researchAreaValues.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const sortOptions = [
      { value: 'name_asc', label: 'Name (A–Z)' },
      { value: 'name_desc', label: 'Name (Z–A)' }
    ];

    return {
      researchAreaOptions: researchAreaOptions,
      sortOptions: sortOptions
    };
  }

  searchResearchLabs(query, researchArea, sortBy) {
    let labs = this._getFromStorage('research_labs');

    if (query && query.trim()) {
      labs = labs.filter(l => this._matchesQuery(l, ['name', 'shortDescription', 'fullDescription', 'researchArea', 'department'], query));
    }

    if (researchArea) {
      labs = labs.filter(l => l.researchArea === researchArea);
    }

    const sort = sortBy || 'name_asc';
    labs = labs.slice().sort((a, b) => {
      if (sort === 'name_desc') {
        return this._normalize(b.name).localeCompare(this._normalize(a.name));
      }
      return this._normalize(a.name).localeCompare(this._normalize(b.name));
    });

    return labs;
  }

  getLabDetail(labId) {
    const labs = this._getFromStorage('research_labs');
    const lab = labs.find(l => l.id === labId) || null;
    const projects = this._getFromStorage('lab_projects');
    const activeProjectsCount = projects.filter(p => p.labId === labId && p.status === 'active').length;
    const follows = this._getFromStorage('lab_follows');
    const isFollowed = !!follows.find(f => f.labId === labId);

    return {
      lab: lab,
      activeProjectsCount: activeProjectsCount,
      isFollowed: isFollowed
    };
  }

  getLabProjects(labId, status) {
    let projects = this._getFromStorage('lab_projects');
    projects = projects.filter(p => p.labId === labId);
    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    const labs = this._getFromStorage('research_labs');
    const lab = labs.find(l => l.id === labId) || null;
    return projects.map(p => Object.assign({}, p, { lab: lab }));
  }

  followLab(labId, updateFrequency, notes) {
    const allowed = ['instant', 'daily', 'weekly', 'monthly', 'quarterly'];
    if (!allowed.includes(updateFrequency)) {
      return { success: false, message: 'Invalid update frequency', labFollow: null };
    }

    const labs = this._getFromStorage('research_labs');
    const lab = labs.find(l => l.id === labId);
    if (!lab) {
      return { success: false, message: 'Lab not found', labFollow: null };
    }

    const follows = this._getFromStorage('lab_follows');
    let existing = follows.find(f => f.labId === labId);
    if (existing) {
      existing.updateFrequency = updateFrequency;
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('lab_follows', follows);
      return { success: true, message: 'Lab follow updated', labFollow: existing };
    }

    const follow = {
      id: this._generateId('labfollow'),
      labId: labId,
      updateFrequency: updateFrequency,
      createdAt: this._getCurrentTimestamp(),
      notes: notes || null
    };

    follows.push(follow);
    this._saveToStorage('lab_follows', follows);

    return { success: true, message: 'Now following lab', labFollow: follow };
  }

  unfollowLab(labId) {
    const follows = this._getFromStorage('lab_follows');
    const before = follows.length;
    const filtered = follows.filter(f => f.labId !== labId);
    this._saveToStorage('lab_follows', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Stopped following lab' : 'Lab was not followed'
    };
  }

  getFollowedLabs() {
    const follows = this._getFromStorage('lab_follows');
    const labs = this._getFromStorage('research_labs');
    return follows.map(follow => {
      const lab = labs.find(l => l.id === follow.labId) || null;
      return { follow: follow, lab: lab };
    });
  }

  // ------------ News, Bookmarks & Shares ------------

  getNewsFilterOptions() {
    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'published_desc', label: 'Newest first' },
      { value: 'published_asc', label: 'Oldest first' }
    ];

    const articles = this._getFromStorage('news_articles');
    let minDate = null;
    let maxDate = null;
    const tagSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.publishedAt) {
        const d = new Date(a.publishedAt);
        if (!isNaN(d.getTime())) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
      if (Array.isArray(a.tags)) {
        for (let j = 0; j < a.tags.length; j++) {
          const t = String(a.tags[j]);
          tagSet[t] = true;
        }
      }
    }

    const defaultDateRange = {
      startDate: minDate ? this._getDateOnlyString(minDate) : null,
      endDate: maxDate ? this._getDateOnlyString(maxDate) : null
    };

    const tagOptions = Object.keys(tagSet);

    return {
      sortOptions: sortOptions,
      defaultDateRange: defaultDateRange,
      tagOptions: tagOptions
    };
  }

  searchNewsArticles(query, dateRange, sortBy, limit) {
    let articles = this._getFromStorage('news_articles');

    if (query && query.trim()) {
      articles = articles.filter(a => this._matchesQuery(a, ['title', 'subtitle', 'body', 'tags'], query));
    }

    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      const startStr = dateRange.startDate;
      const endStr = dateRange.endDate;
      articles = articles.filter(a => {
        if (!a.publishedAt) return false;
        const d = new Date(a.publishedAt);
        if (isNaN(d.getTime())) return false;
        const ds = this._getDateOnlyString(d);
        if (startStr && ds < startStr) return false;
        if (endStr && ds > endStr) return false;
        return true;
      });
    }

    const sort = sortBy || 'published_desc';
    articles = articles.slice().sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (sort === 'published_asc') return da - db;
      // relevance not really computed; fall back to newest first
      return db - da;
    });

    if (typeof limit === 'number' && limit > 0) {
      articles = articles.slice(0, limit);
    }

    return articles;
  }

  getNewsArticleDetail(articleId) {
    const articles = this._getFromStorage('news_articles');
    const article = articles.find(a => a.id === articleId) || null;
    const bookmarks = this._getFromStorage('news_bookmarks');
    const isBookmarked = !!bookmarks.find(b => b.articleId === articleId && !b.isArchived);
    return {
      article: article,
      isBookmarked: isBookmarked
    };
  }

  bookmarkNewsArticle(articleId) {
    const articles = this._getFromStorage('news_articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, message: 'Article not found', bookmark: null };
    }

    const bookmarks = this._getFromStorage('news_bookmarks');
    let existing = bookmarks.find(b => b.articleId === articleId && !b.isArchived);
    if (existing) {
      return { success: true, message: 'Article already bookmarked', bookmark: existing };
    }

    const bookmark = {
      id: this._generateId('newsbm'),
      articleId: articleId,
      bookmarkedAt: this._getCurrentTimestamp(),
      isArchived: false
    };

    bookmarks.push(bookmark);
    this._saveToStorage('news_bookmarks', bookmarks);

    return { success: true, message: 'Article bookmarked', bookmark: bookmark };
  }

  removeNewsBookmark(articleId) {
    const bookmarks = this._getFromStorage('news_bookmarks');
    const before = bookmarks.length;
    const filtered = bookmarks.filter(b => b.articleId !== articleId);
    this._saveToStorage('news_bookmarks', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Bookmark removed' : 'Article was not bookmarked'
    };
  }

  getNewsBookmarks() {
    const bookmarks = this._getFromStorage('news_bookmarks');
    const articles = this._getFromStorage('news_articles');
    return bookmarks.map(b => {
      const article = articles.find(a => a.id === b.articleId) || null;
      return { bookmark: b, article: article };
    });
  }

  createShareAction(contentType, contentId, method) {
    const allowedTypes = ['news_article', 'event', 'publication', 'grant', 'program', 'lab', 'faculty_profile', 'location'];
    const allowedMethods = ['copy_link', 'email', 'social_twitter', 'social_facebook', 'other'];

    if (!allowedTypes.includes(contentType)) {
      return { success: false, message: 'Invalid content type', shareAction: null, shareUrl: null };
    }
    if (!allowedMethods.includes(method)) {
      return { success: false, message: 'Invalid share method', shareAction: null, shareUrl: null };
    }

    let shareUrl = null;

    if (contentType === 'news_article') {
      const articles = this._getFromStorage('news_articles');
      const article = articles.find(a => a.id === contentId);
      if (!article) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = article.shareUrl || ('/news/' + (article.slug || article.id));
    } else if (contentType === 'event') {
      const events = this._getFromStorage('events');
      const event = events.find(e => e.id === contentId);
      if (!event) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = event.shareUrl || ('/events/' + event.id);
    } else if (contentType === 'publication') {
      const pubs = this._getFromStorage('publications');
      const pub = pubs.find(p => p.id === contentId);
      if (!pub) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = pub.url || ('/publications/' + pub.id);
    } else if (contentType === 'grant') {
      const grants = this._getFromStorage('grants');
      const grant = grants.find(g => g.id === contentId);
      if (!grant) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = grant.url || ('/funding/' + grant.id);
    } else if (contentType === 'program') {
      const programs = this._getFromStorage('academic_programs');
      const program = programs.find(p => p.id === contentId);
      if (!program) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = program.websiteUrl || ('/programs/' + program.id);
    } else if (contentType === 'lab') {
      const labs = this._getFromStorage('research_labs');
      const lab = labs.find(l => l.id === contentId);
      if (!lab) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = lab.websiteUrl || ('/labs/' + lab.id);
    } else if (contentType === 'faculty_profile') {
      const faculty = this._getFromStorage('faculty_members');
      const person = faculty.find(f => f.id === contentId);
      if (!person) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = '/faculty/' + (person.profileSlug || person.id);
    } else if (contentType === 'location') {
      const locations = this._getFromStorage('campus_locations');
      const loc = locations.find(l => l.id === contentId);
      if (!loc) return { success: false, message: 'Content not found', shareAction: null, shareUrl: null };
      shareUrl = '/visit/' + loc.id;
    }

    const actions = this._getFromStorage('share_actions');
    const action = {
      id: this._generateId('share'),
      contentType: contentType,
      contentId: contentId,
      method: method,
      createdAt: this._getCurrentTimestamp()
    };

    actions.push(action);
    this._saveToStorage('share_actions', actions);

    return {
      success: true,
      message: 'Share action recorded',
      shareAction: action,
      shareUrl: shareUrl
    };
  }

  // ------------ Campus, Visiting Hours & Visit Plan ------------

  getCampusOverview() {
    const locations = this._getFromStorage('campus_locations');
    const featuredLocations = locations.slice(0, 5);
    const generalInfoHtml = '<p>Explore our campus, including libraries, labs, and student spaces. Check opening hours and plan your visit.</p>';
    return {
      generalInfoHtml: generalInfoHtml,
      featuredLocations: featuredLocations
    };
  }

  searchCampusLocations(query, isLibrary, isOpenToPublic) {
    let locations = this._getFromStorage('campus_locations');

    if (query && query.trim()) {
      locations = locations.filter(l => this._matchesQuery(l, ['name', 'description', 'addressLine1', 'addressLine2', 'city', 'postalCode', 'country', 'buildingCode'], query));
    }

    if (typeof isLibrary === 'boolean') {
      locations = locations.filter(l => !!l.isLibrary === isLibrary);
    }

    if (typeof isOpenToPublic === 'boolean') {
      locations = locations.filter(l => !!l.isOpenToPublic === isOpenToPublic);
    }

    return locations;
  }

  getLocationDetail(locationId) {
    const locations = this._getFromStorage('campus_locations');
    const location = locations.find(l => l.id === locationId) || null;
    return {
      location: location
    };
  }

  getVisitingHoursForLocation(locationId) {
    let rules = this._getFromStorage('visiting_hours_rules');
    rules = rules.filter(r => r.locationId === locationId);
    const locations = this._getFromStorage('campus_locations');
    const location = locations.find(l => l.id === locationId) || null;
    return rules.map(r => Object.assign({}, r, { location: location }));
  }

  addVisitPlanEntry(locationId, visitDate, arrivalTime, durationHours, purpose, notes) {
    const locations = this._getFromStorage('campus_locations');
    const location = locations.find(l => l.id === locationId);
    if (!location) {
      return { success: false, message: 'Location not found', visitPlanEntry: null };
    }

    if (!visitDate) {
      return { success: false, message: 'Visit date is required', visitPlanEntry: null };
    }

    const isoDate = visitDate + 'T00:00:00.000Z';

    const entries = this._getFromStorage('visit_plan_entries');
    const entry = {
      id: this._generateId('visit'),
      locationId: locationId,
      visitDate: isoDate,
      arrivalTime: arrivalTime,
      durationHours: durationHours,
      purpose: purpose,
      createdAt: this._getCurrentTimestamp(),
      notes: notes || null
    };

    entries.push(entry);
    this._saveToStorage('visit_plan_entries', entries);

    return { success: true, message: 'Visit plan entry created', visitPlanEntry: entry };
  }

  getVisitPlanEntries() {
    const entries = this._getFromStorage('visit_plan_entries');
    const locations = this._getFromStorage('campus_locations');
    return entries.map(e => {
      const location = locations.find(l => l.id === e.locationId) || null;
      return { entry: e, location: location };
    });
  }

  // ------------ Grants & Deadlines ------------

  getGrantFilterOptions() {
    const eligibilityOptions = [
      { value: 'early_career_researchers_0_7_years_post_phd', label: 'Early-career researchers (0–7 years post-PhD)' },
      { value: 'senior_researchers', label: 'Senior researchers' },
      { value: 'phd_students', label: 'PhD students' },
      { value: 'postdocs', label: 'Postdocs' },
      { value: 'open_to_all', label: 'Open to all' },
      { value: 'other', label: 'Other' }
    ];

    const statusOptions = [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
      { value: 'upcoming', label: 'Upcoming' }
    ];

    const sortOptions = [
      { value: 'deadline_asc', label: 'Deadline (Soonest first)' },
      { value: 'deadline_desc', label: 'Deadline (Latest first)' }
    ];

    const grants = this._getFromStorage('grants');
    let minAmount = null;
    let maxAmount = null;

    for (let i = 0; i < grants.length; i++) {
      const g = grants[i];
      if (typeof g.minFundingAmount === 'number') {
        if (minAmount == null || g.minFundingAmount < minAmount) minAmount = g.minFundingAmount;
      }
      if (typeof g.maxFundingAmount === 'number') {
        if (maxAmount == null || g.maxFundingAmount > maxAmount) maxAmount = g.maxFundingAmount;
      }
    }

    const amountRangeDefaults = {
      minAmount: minAmount != null ? minAmount : 0,
      maxAmount: maxAmount != null ? maxAmount : 0
    };

    return {
      eligibilityOptions: eligibilityOptions,
      statusOptions: statusOptions,
      sortOptions: sortOptions,
      amountRangeDefaults: amountRangeDefaults
    };
  }

  searchGrants(eligibilityCategory, minFundingAmount, maxFundingAmount, status, sortBy) {
    let grants = this._getFromStorage('grants');

    if (eligibilityCategory) {
      grants = grants.filter(g => g.eligibilityCategory === eligibilityCategory);
    }
    if (typeof minFundingAmount === 'number') {
      grants = grants.filter(g => typeof g.maxFundingAmount === 'number' && g.maxFundingAmount >= minFundingAmount);
    }
    if (typeof maxFundingAmount === 'number') {
      grants = grants.filter(g => typeof g.minFundingAmount === 'number' && g.minFundingAmount <= maxFundingAmount);
    }
    if (status) {
      grants = grants.filter(g => g.status === status);
    }

    const sort = sortBy || 'deadline_asc';
    grants = grants.slice().sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : 0;
      const db = b.deadline ? new Date(b.deadline).getTime() : 0;
      if (sort === 'deadline_desc') return db - da;
      return da - db;
    });

    return grants;
  }

  getGrantDetail(grantId) {
    const grants = this._getFromStorage('grants');
    const grant = grants.find(g => g.id === grantId) || null;
    const saved = this._getFromStorage('saved_grant_deadlines');
    const isDeadlineSaved = !!saved.find(s => s.grantId === grantId);
    return {
      grant: grant,
      isDeadlineSaved: isDeadlineSaved
    };
  }

  saveGrantDeadline(grantId, reminderEnabled, reminderOffsetDays) {
    const grants = this._getFromStorage('grants');
    const grant = grants.find(g => g.id === grantId);
    if (!grant) {
      return { success: false, message: 'Grant not found', savedDeadline: null };
    }

    const saved = this._getFromStorage('saved_grant_deadlines');
    let existing = saved.find(s => s.grantId === grantId);
    if (existing) {
      if (typeof reminderEnabled === 'boolean') existing.reminderEnabled = reminderEnabled;
      if (typeof reminderOffsetDays === 'number') existing.reminderOffsetDays = reminderOffsetDays;
      this._saveToStorage('saved_grant_deadlines', saved);
      return { success: true, message: 'Deadline already saved', savedDeadline: existing };
    }

    const entry = {
      id: this._generateId('grantdl'),
      grantId: grantId,
      deadline: grant.deadline,
      savedAt: this._getCurrentTimestamp(),
      reminderEnabled: typeof reminderEnabled === 'boolean' ? reminderEnabled : false,
      reminderOffsetDays: typeof reminderOffsetDays === 'number' ? reminderOffsetDays : null
    };

    saved.push(entry);
    this._saveToStorage('saved_grant_deadlines', saved);

    return { success: true, message: 'Grant deadline saved', savedDeadline: entry };
  }

  removeSavedGrantDeadline(grantId) {
    const saved = this._getFromStorage('saved_grant_deadlines');
    const before = saved.length;
    const filtered = saved.filter(s => s.grantId !== grantId);
    this._saveToStorage('saved_grant_deadlines', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Saved deadline removed' : 'Deadline was not saved'
    };
  }

  getSavedGrantDeadlines() {
    const saved = this._getFromStorage('saved_grant_deadlines');
    const grants = this._getFromStorage('grants');
    return saved.map(s => {
      const grant = grants.find(g => g.id === s.grantId) || null;
      return { savedDeadline: s, grant: grant };
    });
  }

  // ------------ Faculty & Collaboration List ------------

  getFacultyFilterOptions() {
    const faculty = this._getFromStorage('faculty_members');
    const researchAreaSet = {};
    for (let i = 0; i < faculty.length; i++) {
      const f = faculty[i];
      if (Array.isArray(f.researchAreas)) {
        for (let j = 0; j < f.researchAreas.length; j++) {
          researchAreaSet[String(f.researchAreas[j])] = true;
        }
      }
    }
    const researchAreaOptions = Object.keys(researchAreaSet);

    const rankOptions = ['assistant_professor', 'associate_professor', 'professor', 'lecturer', 'researcher', 'other'];

    const sortOptions = [
      { value: 'last_name_asc', label: 'Last name (A–Z)' },
      { value: 'last_name_desc', label: 'Last name (Z–A)' }
    ];

    return {
      researchAreaOptions: researchAreaOptions,
      rankOptions: rankOptions,
      sortOptions: sortOptions
    };
  }

  searchFaculty(query, researchAreas, ranks, sortBy) {
    let faculty = this._getFromStorage('faculty_members');

    if (query && query.trim()) {
      faculty = faculty.filter(f => this._matchesQuery(f, ['fullName', 'firstName', 'lastName', 'biography', 'researchAreas', 'department'], query));
    }

    if (Array.isArray(researchAreas) && researchAreas.length > 0) {
      faculty = faculty.filter(f => {
        if (!Array.isArray(f.researchAreas)) return false;
        return researchAreas.some(r => f.researchAreas.indexOf(r) !== -1);
      });
    }

    if (Array.isArray(ranks) && ranks.length > 0) {
      faculty = faculty.filter(f => ranks.indexOf(f.rank) !== -1);
    }

    const sort = sortBy || 'last_name_asc';
    faculty = faculty.slice().sort((a, b) => {
      const la = this._normalize(a.lastName || a.fullName || '');
      const lb = this._normalize(b.lastName || b.fullName || '');
      if (sort === 'last_name_desc') return lb.localeCompare(la);
      return la.localeCompare(lb);
    });

    return faculty;
  }

  getFacultyProfile(facultyId) {
    const faculty = this._getFromStorage('faculty_members');
    const person = faculty.find(f => f.id === facultyId) || null;
    const collabEntries = this._getFromStorage('collaboration_list_entries');
    const entry = collabEntries.find(e => e.facultyId === facultyId);
    const collaborationStatus = entry ? (entry.status || 'interested') : 'not_added';
    return {
      faculty: person,
      collaborationStatus: collaborationStatus
    };
  }

  addFacultyToCollaborationList(facultyId, status, notes) {
    const faculty = this._getFromStorage('faculty_members');
    const person = faculty.find(f => f.id === facultyId);
    if (!person) {
      return { success: false, message: 'Faculty member not found', entry: null };
    }

    const entries = this._getFromStorage('collaboration_list_entries');
    let existing = entries.find(e => e.facultyId === facultyId);
    if (existing) {
      if (status) existing.status = status;
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('collaboration_list_entries', entries);
      return { success: true, message: 'Collaboration entry updated', entry: existing };
    }

    const entry = {
      id: this._generateId('collab'),
      facultyId: facultyId,
      addedAt: this._getCurrentTimestamp(),
      notes: notes || null,
      status: status || 'interested'
    };

    entries.push(entry);
    this._saveToStorage('collaboration_list_entries', entries);

    return { success: true, message: 'Faculty added to collaboration list', entry: entry };
  }

  updateCollaborationListEntry(entryId, status, notes) {
    const entries = this._getFromStorage('collaboration_list_entries');
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
      return { success: false, message: 'Collaboration entry not found', entry: null };
    }

    if (status) entry.status = status;
    if (typeof notes === 'string') entry.notes = notes;
    this._saveToStorage('collaboration_list_entries', entries);

    return { success: true, message: 'Collaboration entry updated', entry: entry };
  }

  removeFacultyFromCollaborationList(facultyId) {
    const entries = this._getFromStorage('collaboration_list_entries');
    const before = entries.length;
    const filtered = entries.filter(e => e.facultyId !== facultyId);
    this._saveToStorage('collaboration_list_entries', filtered);
    const removed = filtered.length < before;
    return {
      success: removed,
      message: removed ? 'Faculty removed from collaboration list' : 'Faculty was not on collaboration list'
    };
  }

  getCollaborationList() {
    const entries = this._getFromStorage('collaboration_list_entries');
    const faculty = this._getFromStorage('faculty_members');
    return entries.map(e => {
      const person = faculty.find(f => f.id === e.facultyId) || null;
      return { entry: e, faculty: person };
    });
  }

  // ------------ Donations ------------

  getDonationPageContent() {
    const funds = this._getFromStorage('donation_funds').filter(f => f.isActive !== false);
    const suggestedAmounts = [25, 50, 75, 100, 250];
    const defaultCurrency = 'usd';
    const frequencyOptions = ['one_time', 'monthly', 'annually'];
    const paymentMethodOptions = ['credit_card_test', 'mock_credit_card', 'credit_card', 'bank_transfer'];

    return {
      funds: funds,
      suggestedAmounts: suggestedAmounts,
      defaultCurrency: defaultCurrency,
      frequencyOptions: frequencyOptions,
      paymentMethodOptions: paymentMethodOptions
    };
  }

  submitDonation(amount, currency, frequency, fundId, donorFirstName, donorLastName, donorEmail, donorCountry, paymentMethod) {
    const funds = this._getFromStorage('donation_funds');
    const fund = funds.find(f => f.id === fundId && f.isActive !== false);
    if (!fund) {
      return { success: false, message: 'Donation fund not found or inactive', donation: null };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'Invalid donation amount', donation: null };
    }

    const allowedFreq = ['one_time', 'monthly', 'annually'];
    if (!allowedFreq.includes(frequency)) {
      return { success: false, message: 'Invalid donation frequency', donation: null };
    }

    const allowedMethods = ['credit_card_test', 'mock_credit_card', 'credit_card', 'bank_transfer'];
    if (!allowedMethods.includes(paymentMethod)) {
      return { success: false, message: 'Invalid payment method', donation: null };
    }

    const donations = this._getFromStorage('donations');
    const donation = {
      id: this._generateId('donation'),
      amount: amount,
      currency: currency,
      frequency: frequency,
      fundId: fundId,
      donorFirstName: donorFirstName,
      donorLastName: donorLastName,
      donorEmail: donorEmail,
      donorCountry: donorCountry,
      paymentMethod: paymentMethod,
      status: 'completed',
      createdAt: this._getCurrentTimestamp(),
      confirmationNumber: 'CNF-' + Math.random().toString(36).slice(2, 10).toUpperCase()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return { success: true, message: 'Donation submitted', donation: donation };
  }

  // ------------ Study Page Overview ------------

  getStudyPageOverview() {
    const programs = this._getFromStorage('academic_programs');
    const degreeMap = {};
    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (!p.degreeLevel) continue;
      degreeMap[p.degreeLevel] = true;
    }
    const degreeLevels = Object.keys(degreeMap);

    const degreesOffered = degreeLevels.map(dl => ({
      degreeLevel: dl,
      description: dl.charAt(0).toUpperCase() + dl.slice(1) + ' programs available at our institute.'
    }));

    const overviewHtml = '<p>Discover our range of academic programs, from bachelor\'s to PhD, designed for research-focused study.</p>';
    const keyInformation = {
      applicationInfoHtml: '<p>Applications are reviewed on a rolling basis. Check individual program pages for specific deadlines and requirements.</p>',
      scholarshipInfoHtml: '<p>We offer a variety of scholarships and funding opportunities for outstanding students.</p>'
    };

    return {
      overviewHtml: overviewHtml,
      degreesOffered: degreesOffered,
      keyInformation: keyInformation
    };
  }

  // ------------ About & Contact ------------

  getAboutPageContent() {
    const missionHtml = '<p>Our mission is to advance knowledge through rigorous academic research and to share insights with society.</p>';
    const historyHtml = '<p>The institute brings together interdisciplinary teams to address pressing global challenges.</p>';

    const leadership = [
      { name: 'Institute Director', title: 'Director', email: 'director@example.org' },
      { name: 'Head of Administration', title: 'Head of Administration', email: 'admin@example.org' }
    ];

    const contactInfo = {
      addressLines: ['123 Research Way', 'Knowledge City, 00000', 'Country'],
      phoneNumbers: [
        { label: 'Main office', number: '+1 (000) 000-0000' }
      ],
      emailAddresses: [
        { label: 'General inquiries', email: 'info@example.org' }
      ]
    };

    const policySummaries = [
      { id: 'privacy', title: 'Privacy policy', summary: 'We handle your data responsibly and in accordance with applicable regulations.' },
      { id: 'cookies', title: 'Cookie policy', summary: 'We use cookies to improve site performance and user experience.' }
    ];

    return {
      missionHtml: missionHtml,
      historyHtml: historyHtml,
      leadership: leadership,
      contactInfo: contactInfo,
      policySummaries: policySummaries
    };
  }

  submitContactInquiry(name, email, subject, message, category) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const entry = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      category: category || 'general',
      createdAt: this._getCurrentTimestamp()
    };

    inquiries.push(entry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Your inquiry has been submitted.',
      ticketId: entry.id
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
