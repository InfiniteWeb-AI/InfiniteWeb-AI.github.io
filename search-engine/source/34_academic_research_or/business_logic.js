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

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keysToInitAsArray = [
      // Core domain entities
      'conferences',
      'conference_tracks',
      'conference_fees',
      'conference_sessions',
      'conference_bookmarks',
      'personal_schedule_items',
      'researchers',
      'followed_researchers',
      'journals',
      'publications',
      'reading_list_items',
      'events',
      'event_time_slots',
      'event_registrations',
      'newsletter_topics',
      'newsletter_subscriptions',
      'donation_programs',
      'donations',
      'membership_plans',
      'membership_applications',
      // Additional/supporting structures
      'contact_submissions',
      'policy_documents'
    ];

    keysToInitAsArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Structured singleton objects
    if (!localStorage.getItem('homepage_content')) {
      localStorage.setItem(
        'homepage_content',
        JSON.stringify({
          heroTitle: '',
          heroSubtitle: '',
          missionBlurb: '',
          focusAreas: [],
          keyPrograms: []
        })
      );
    }

    if (!localStorage.getItem('about_organization_content')) {
      localStorage.setItem(
        'about_organization_content',
        JSON.stringify({
          mission: '',
          history: '',
          focusAreas: [],
          programDescriptions: [],
          leadership: []
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          emails: [],
          phoneNumbers: [],
          mailingAddresses: [],
          inquiryTopics: [],
          responseTimeInfo: ''
        })
      );
    }

    if (!localStorage.getItem('user_state')) {
      const initialState = {
        bookmarks: [],
        scheduleItemIds: [],
        readingListItemIds: [],
        followedResearcherIds: [],
        newsletterEmails: [],
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('user_state', JSON.stringify(initialState));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      // If no explicit default and parsed is undefined/null, fallback to []
      if (parsed === null || parsed === undefined) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
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

  // -------------------- Generic helpers --------------------

  _parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _parseTimeToMinutes(value) {
    // Accept HH:mm or full ISO strings; fallback to 0
    if (!value) return null;
    if (typeof value === 'string') {
      const isoMatch = value.match(/T(\d{2}):(\d{2})/);
      let h, m;
      if (isoMatch) {
        h = parseInt(isoMatch[1], 10);
        m = parseInt(isoMatch[2], 10);
      } else {
        const parts = value.split(':');
        if (parts.length >= 2) {
          h = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        }
      }
      if (h != null && m != null && !isNaN(h) && !isNaN(m)) {
        return h * 60 + m;
      }
    }
    return null;
  }

  _stringIncludes(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _arrayIncludesCaseInsensitive(arr, value) {
    if (!Array.isArray(arr) || !value) return false;
    const lower = String(value).toLowerCase();
    return arr.some((v) => String(v).toLowerCase() === lower);
  }

  // -------------------- User state helpers --------------------

  _getOrCreateUserState() {
    let state = this._getFromStorage('user_state', null);
    if (!state || typeof state !== 'object') {
      state = {
        bookmarks: [],
        scheduleItemIds: [],
        readingListItemIds: [],
        followedResearcherIds: [],
        newsletterEmails: [],
        createdAt: new Date().toISOString()
      };
    }

    // Optionally sync with existing per-entity records (one-way, non-destructive)
    const bookmarks = this._getFromStorage('conference_bookmarks', []);
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);
    const readingItems = this._getFromStorage('reading_list_items', []);
    const follows = this._getFromStorage('followed_researchers', []);
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    state.bookmarks = Array.from(
      new Set([
        ...state.bookmarks,
        ...bookmarks.map((b) => b.id)
      ])
    );
    state.scheduleItemIds = Array.from(
      new Set([
        ...state.scheduleItemIds,
        ...scheduleItems.map((s) => s.id)
      ])
    );
    state.readingListItemIds = Array.from(
      new Set([
        ...state.readingListItemIds,
        ...readingItems.map((r) => r.id)
      ])
    );
    state.followedResearcherIds = Array.from(
      new Set([
        ...state.followedResearcherIds,
        ...follows.map((f) => f.researcherId)
      ])
    );
    state.newsletterEmails = Array.from(
      new Set([
        ...state.newsletterEmails,
        ...subs.map((s) => s.email)
      ])
    );

    this._saveUserState(state);
    return state;
  }

  _saveUserState(state) {
    this._saveToStorage('user_state', state || {});
  }

  // -------------------- Domain-specific helpers --------------------

  _resolveCheapestConferenceFee(conferenceId, attendeeType, currency) {
    const fees = this._getFromStorage('conference_fees', []);
    const matching = fees.filter((f) => {
      if (f.conferenceId !== conferenceId) return false;
      if (attendeeType && f.attendeeType !== attendeeType) return false;
      if (currency && f.currency !== currency) return false;
      return true;
    });
    if (matching.length === 0) return null;
    let cheapest = matching[0];
    for (let i = 1; i < matching.length; i++) {
      if (matching[i].amount < cheapest.amount) {
        cheapest = matching[i];
      }
    }
    return {
      amount: cheapest.amount,
      currency: cheapest.currency,
      isEarlyBird: !!cheapest.isEarlyBird,
      description: cheapest.description || ''
    };
  }

  _filterSessionsByCriteria(sessions, filters) {
    if (!filters) return sessions.slice();
    const {
      dayIndex,
      keyword,
      trackId,
      startTimeFrom,
      endTimeTo
    } = filters;

    const minMinutes = this._parseTimeToMinutes(startTimeFrom);
    const maxMinutes = this._parseTimeToMinutes(endTimeTo);
    const keywordLower = keyword ? String(keyword).toLowerCase() : null;

    return sessions.filter((s) => {
      const session = s; // sessions are plain ConferenceSession records here

      if (dayIndex != null && session.dayIndex != null && session.dayIndex !== dayIndex) {
        return false;
      }

      if (trackId && session.trackId && session.trackId !== trackId) {
        return false;
      }

      if (keywordLower) {
        const title = (session.title || '').toLowerCase();
        const abs = (session.abstract || '').toLowerCase();
        const kw = (Array.isArray(session.keywords) ? session.keywords : [])
          .map((k) => String(k).toLowerCase());
        if (
          !title.includes(keywordLower) &&
          !abs.includes(keywordLower) &&
          !kw.some((k) => k.includes(keywordLower))
        ) {
          return false;
        }
      }

      const start = this._parseDate(session.startDateTime);
      const end = this._parseDate(session.endDateTime);
      if ((minMinutes != null || maxMinutes != null) && start && end) {
        const startM = start.getUTCHours() * 60 + start.getUTCMinutes();
        const endM = end.getUTCHours() * 60 + end.getUTCMinutes();
        if (minMinutes != null && startM < minMinutes) return false;
        if (maxMinutes != null && endM > maxMinutes) return false;
      }

      return true;
    });
  }

  // -------------------- Interface implementations --------------------

  // getHomepageContent
  getHomepageContent() {
    const content = this._getFromStorage('homepage_content', {
      heroTitle: '',
      heroSubtitle: '',
      missionBlurb: '',
      focusAreas: [],
      keyPrograms: []
    });

    return {
      heroTitle: content.heroTitle || '',
      heroSubtitle: content.heroSubtitle || '',
      missionBlurb: content.missionBlurb || '',
      focusAreas: Array.isArray(content.focusAreas) ? content.focusAreas : [],
      keyPrograms: Array.isArray(content.keyPrograms) ? content.keyPrograms : []
    };
  }

  // getHomepageHighlights
  getHomepageHighlights() {
    const conferences = this._getFromStorage('conferences', []);
    const events = this._getFromStorage('events', []);
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);

    const now = new Date();

    const featuredConferences = conferences
      .filter((c) => c.status === 'upcoming' || c.status === 'ongoing')
      .sort((a, b) => {
        const da = this._parseDate(a.startDate) || now;
        const db = this._parseDate(b.startDate) || now;
        return da - db;
      })
      .slice(0, 5)
      .map((c) => ({
        conference: c,
        highlightText: `Upcoming conference: ${c.title}`
      }));

    const featuredEvents = events
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.startDate) || now;
        const db = this._parseDate(b.startDate) || now;
        return da - db;
      })
      .slice(0, 5)
      .map((e) => ({
        event: e,
        highlightText: `${e.eventType === 'workshop' ? 'Workshop' : 'Event'}: ${e.title}`
      }));

    const recentPublications = publications
      .slice()
      .sort((a, b) => {
        const ya = a.year || 0;
        const yb = b.year || 0;
        if (yb !== ya) return yb - ya;
        const ca = this._parseDate(a.createdAt) || new Date(0);
        const cb = this._parseDate(b.createdAt) || new Date(0);
        return cb - ca;
      })
      .slice(0, 5)
      .map((p) => ({
        publication: p,
        isOpenAccess:
          p.accessType === 'open_access' ||
          p.isOpenAccess === true ||
          (p.accessType === 'hybrid' && p.isOpenAccess === true)
      }));

    return {
      featuredConferences,
      featuredEvents,
      recentPublications
    };
  }

  // getMyAccountSummary
  getMyAccountSummary() {
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);
    const sessions = this._getFromStorage('conference_sessions', []);
    const conferences = this._getFromStorage('conferences', []);
    const bookmarks = this._getFromStorage('conference_bookmarks', []);
    const readingList = this._getFromStorage('reading_list_items', []);
    const follows = this._getFromStorage('followed_researchers', []);

    // Resolve upcoming sessions
    const now = new Date();
    const upcoming = scheduleItems
      .map((item) => {
        const session = sessions.find((s) => s.id === item.sessionId) || null;
        if (!session) return null;
        const conference = conferences.find((c) => c.id === session.conferenceId) || null;
        const start = session.startDateTime ? new Date(session.startDateTime) : null;
        return {
          scheduleItem: item,
          session,
          conference,
          start
        };
      })
      .filter((x) => x && x.start && x.start > now)
      .sort((a, b) => a.start - b.start);

    const nextUpcoming = upcoming.length > 0 ? upcoming[0] : null;

    return {
      upcomingSessionsCount: scheduleItems.length,
      bookmarkedConferencesCount: bookmarks.length,
      readingListCount: readingList.length,
      followedResearchersCount: follows.length,
      nextUpcomingSession: nextUpcoming
        ? {
            session: nextUpcoming.session,
            conference: nextUpcoming.conference
          }
        : null
    };
  }

  // getConferenceSearchOptions
  getConferenceSearchOptions() {
    const conferences = this._getFromStorage('conferences', []);
    const conferenceFees = this._getFromStorage('conference_fees', []);

    const regionCodes = [
      'africa',
      'asia',
      'europe',
      'north_america',
      'south_america',
      'oceania',
      'middle_east',
      'global'
    ];
    const attendeeTypes = [
      { code: 'student', label: 'Student' },
      { code: 'professional', label: 'Professional' },
      { code: 'member', label: 'Member' },
      { code: 'non_member', label: 'Non-member' },
      { code: 'other', label: 'Other' }
    ];

    const topicSet = new Set();
    conferences.forEach((c) => {
      if (Array.isArray(c.topics)) {
        c.topics.forEach((t) => topicSet.add(String(t)));
      }
    });

    const currencySet = new Set();
    conferences.forEach((c) => {
      if (c.defaultCurrency) {
        currencySet.add(c.defaultCurrency);
      }
    });
    conferenceFees.forEach((f) => {
      if (f.currency) currencySet.add(f.currency);
    });
    if (currencySet.size === 0) {
      ['usd', 'eur', 'gbp', 'cad', 'aud', 'other'].forEach((c) => currencySet.add(c));
    }

    const sortOptions = [
      { code: 'start_date_asc', label: 'Start Date: Soonest First' },
      { code: 'start_date_desc', label: 'Start Date: Latest First' },
      { code: 'relevance', label: 'Relevance' }
    ];

    return {
      regions: regionCodes.map((code) => ({ code, label: code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) })),
      attendeeTypes,
      topicSuggestions: Array.from(topicSet),
      supportedCurrencies: Array.from(currencySet),
      sortOptions
    };
  }

  // searchConferences(query, filters, sort, page, pageSize)
  searchConferences(query, filters, sort, page, pageSize) {
    const conferences = this._getFromStorage('conferences', []);
    const conferenceFees = this._getFromStorage('conference_fees', []);

    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};

    let results = conferences.filter((c) => {
      // Free-text query
      if (q) {
        const text = [c.title, c.subtitle, c.description]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Region
      if (f.region && c.region && c.region !== f.region) return false;

      // Date range (start date)
      const start = this._parseDate(c.startDate);
      if (f.startDateFrom) {
        const min = this._parseDate(f.startDateFrom);
        if (min && start && start < min) return false;
      }
      if (f.startDateTo) {
        const max = this._parseDate(f.startDateTo);
        if (max && start && start > max) return false;
      }

      // Topic keyword
      if (f.topicKeyword) {
        const tk = String(f.topicKeyword).toLowerCase();
        const topics = (Array.isArray(c.topics) ? c.topics : []).map((t) => String(t).toLowerCase());
        const inTopics = topics.some((t) => t.includes(tk));
        const inDesc = ((c.description || '') + ' ' + (c.title || '')).toLowerCase().includes(tk);
        if (!inTopics && !inDesc) return false;
      }

      // International flag
      if (typeof f.isInternational === 'boolean') {
        if (!!c.isInternational !== f.isInternational) return false;
      }

      // Registration fee constraints
      if (f.attendeeType && f.maxRegistrationFeeAmount != null) {
        const cheapest = this._resolveCheapestConferenceFee(
          c.id,
          f.attendeeType,
          f.maxRegistrationFeeCurrency || null
        );
        if (!cheapest) return false;
        if (cheapest.amount > f.maxRegistrationFeeAmount) return false;
      }

      return true;
    });

    // Sorting
    const sortCode = sort || 'start_date_asc';
    if (sortCode === 'start_date_asc' || sortCode === 'start_date_desc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.startDate) || new Date(0);
        const db = this._parseDate(b.startDate) || new Date(0);
        return sortCode === 'start_date_asc' ? da - db : db - da;
      });
    }

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    const mapped = paged.map((c) => {
      const primaryTopics = Array.isArray(c.topics) ? c.topics : [];
      let locationDisplay = '';
      const cityCountry = [c.city, c.country].filter(Boolean).join(', ');
      if (c.isOnline && !c.isHybrid) {
        locationDisplay = 'Online';
      } else if (c.isHybrid) {
        locationDisplay = cityCountry ? `${cityCountry} & Online` : 'Hybrid';
      } else {
        locationDisplay = cityCountry || '';
      }

      let cheapestFeeForSelectedAttendeeType = null;
      if (f.attendeeType) {
        cheapestFeeForSelectedAttendeeType = this._resolveCheapestConferenceFee(
          c.id,
          f.attendeeType,
          f.maxRegistrationFeeCurrency || null
        );
      }

      return {
        conference: c,
        primaryTopics,
        locationDisplay,
        cheapestFeeForSelectedAttendeeType
      };
    });

    return {
      results: mapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getConferenceDetail(conferenceId)
  getConferenceDetail(conferenceId) {
    const conferences = this._getFromStorage('conferences', []);
    const tracks = this._getFromStorage('conference_tracks', []);
    const fees = this._getFromStorage('conference_fees', []);
    const bookmarks = this._getFromStorage('conference_bookmarks', []);

    const conference = conferences.find((c) => c.id === conferenceId) || null;
    const conferenceTracks = tracks.filter((t) => t.conferenceId === conferenceId);
    const conferenceFees = fees.filter((f) => f.conferenceId === conferenceId);
    const isBookmarked = bookmarks.some((b) => b.conferenceId === conferenceId);

    return {
      conference,
      tracks: conferenceTracks,
      fees: conferenceFees,
      isBookmarked,
      keyDeadlines: []
    };
  }

  // getConferenceProgram(conferenceId)
  getConferenceProgram(conferenceId) {
    const conferences = this._getFromStorage('conferences', []);
    const tracks = this._getFromStorage('conference_tracks', []);

    const conference = conferences.find((c) => c.id === conferenceId) || null;

    const days = [];
    if (conference) {
      const start = this._parseDate(conference.startDate);
      const end = this._parseDate(conference.endDate);
      if (start && end) {
        let idx = 1;
        for (
          let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          d <= end;
          d.setDate(d.getDate() + 1)
        ) {
          days.push({
            dayIndex: idx,
            date: d.toISOString(),
            label: `Day ${idx}`
          });
          idx++;
        }
      }
    }

    const conferenceTracks = tracks.filter((t) => t.conferenceId === conferenceId);

    return {
      days,
      tracks: conferenceTracks,
      defaultFilters: {
        keyword: '',
        trackId: '',
        startTimeFrom: '',
        endTimeTo: ''
      }
    };
  }

  // getConferenceSessions(conferenceId, filters)
  getConferenceSessions(conferenceId, filters) {
    const sessions = this._getFromStorage('conference_sessions', []);
    const tracks = this._getFromStorage('conference_tracks', []);
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);

    const conferenceSessions = sessions.filter((s) => s.conferenceId === conferenceId);
    const filteredSessions = this._filterSessionsByCriteria(conferenceSessions, filters || {});

    const mapped = filteredSessions.map((session) => {
      const track = session.trackId
        ? tracks.find((t) => t.id === session.trackId) || null
        : null;
      const isInPersonalSchedule = scheduleItems.some((i) => i.sessionId === session.id);
      return {
        session,
        track,
        isInPersonalSchedule
      };
    });

    return {
      sessions: mapped
    };
  }

  // bookmarkConference(conferenceId, notes)
  bookmarkConference(conferenceId, notes) {
    const bookmarks = this._getFromStorage('conference_bookmarks', []);
    let bookmark = bookmarks.find((b) => b.conferenceId === conferenceId) || null;
    let message;

    if (bookmark) {
      bookmark.notes = notes || bookmark.notes || '';
      message = 'Bookmark updated.';
    } else {
      bookmark = {
        id: this._generateId('cbm'),
        conferenceId,
        addedAt: new Date().toISOString(),
        notes: notes || ''
      };
      bookmarks.push(bookmark);
      message = 'Conference bookmarked.';
    }

    this._saveToStorage('conference_bookmarks', bookmarks);
    this._getOrCreateUserState(); // keep user_state in sync (non-critical)

    return { bookmark, message };
  }

  // unbookmarkConference(conferenceId)
  unbookmarkConference(conferenceId) {
    let bookmarks = this._getFromStorage('conference_bookmarks', []);
    const initialLength = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.conferenceId !== conferenceId);
    this._saveToStorage('conference_bookmarks', bookmarks);
    this._getOrCreateUserState();

    const success = bookmarks.length !== initialLength;
    return {
      success,
      message: success ? 'Bookmark removed.' : 'Bookmark not found.'
    };
  }

  // getBookmarkedConferences()
  getBookmarkedConferences() {
    const bookmarks = this._getFromStorage('conference_bookmarks', []);
    const conferences = this._getFromStorage('conferences', []);

    const items = bookmarks.map((bookmark) => ({
      bookmark,
      conference: conferences.find((c) => c.id === bookmark.conferenceId) || null
    }));

    return { bookmarks: items };
  }

  // addSessionToPersonalSchedule(sessionId, notes)
  addSessionToPersonalSchedule(sessionId, notes) {
    const sessions = this._getFromStorage('conference_sessions', []);
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);

    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return {
        item: null,
        message: 'Session not found.'
      };
    }

    let item = scheduleItems.find((i) => i.sessionId === sessionId) || null;
    let message;
    if (item) {
      item.notes = notes || item.notes || '';
      message = 'Session already in schedule. Notes updated.';
    } else {
      item = {
        id: this._generateId('psi'),
        sessionId,
        addedAt: new Date().toISOString(),
        notes: notes || ''
      };
      scheduleItems.push(item);
      message = 'Session added to personal schedule.';
    }

    this._saveToStorage('personal_schedule_items', scheduleItems);
    this._getOrCreateUserState();

    return {
      item,
      message
    };
  }

  // removeSessionFromPersonalSchedule(sessionId)
  removeSessionFromPersonalSchedule(sessionId) {
    let scheduleItems = this._getFromStorage('personal_schedule_items', []);
    const initialLength = scheduleItems.length;
    scheduleItems = scheduleItems.filter((i) => i.sessionId !== sessionId);
    this._saveToStorage('personal_schedule_items', scheduleItems);
    this._getOrCreateUserState();

    const success = scheduleItems.length !== initialLength;
    return {
      success,
      message: success ? 'Session removed from schedule.' : 'Session not found in schedule.'
    };
  }

  // getPersonalSchedule(filters)
  getPersonalSchedule(filters) {
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);
    const sessions = this._getFromStorage('conference_sessions', []);
    const conferences = this._getFromStorage('conferences', []);
    const tracks = this._getFromStorage('conference_tracks', []);

    const f = filters || {};

    const items = scheduleItems
      .map((scheduleItem) => {
        const session = sessions.find((s) => s.id === scheduleItem.sessionId) || null;
        if (!session) return null;
        const conference = conferences.find((c) => c.id === session.conferenceId) || null;
        const track = session.trackId
          ? tracks.find((t) => t.id === session.trackId) || null
          : null;
        return {
          scheduleItem,
          session,
          conference,
          track
        };
      })
      .filter((x) => x !== null)
      .filter((x) => {
        if (f.conferenceId) {
          return x.session && x.session.conferenceId === f.conferenceId;
        }
        return true;
      });

    return { items };
  }

  // getResearcherSearchOptions()
  getResearcherSearchOptions() {
    const researchers = this._getFromStorage('researchers', []);

    const countrySet = new Set();
    const expertiseSet = new Set();
    const areaSet = new Set();
    let minH = null;
    let maxH = null;

    researchers.forEach((r) => {
      if (r.country) countrySet.add(r.country);
      if (r.affiliationCountry) countrySet.add(r.affiliationCountry);
      if (Array.isArray(r.expertiseKeywords)) {
        r.expertiseKeywords.forEach((k) => expertiseSet.add(String(k)));
      }
      if (Array.isArray(r.primaryResearchAreas)) {
        r.primaryResearchAreas.forEach((a) => areaSet.add(String(a)));
      }
      if (typeof r.hIndex === 'number') {
        if (minH === null || r.hIndex < minH) minH = r.hIndex;
        if (maxH === null || r.hIndex > maxH) maxH = r.hIndex;
      }
    });

    return {
      countries: Array.from(countrySet),
      expertiseKeywords: Array.from(expertiseSet),
      primaryResearchAreas: Array.from(areaSet),
      hIndexRange: {
        min: minH != null ? minH : 0,
        max: maxH != null ? maxH : 0
      }
    };
  }

  // searchResearchers(query, filters, sort, page, pageSize)
  searchResearchers(query, filters, sort, page, pageSize) {
    const researchers = this._getFromStorage('researchers', []);

    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};

    let results = researchers.filter((r) => {
      if (q) {
        const text = [
          r.fullName,
          r.biography,
          (Array.isArray(r.expertiseKeywords) ? r.expertiseKeywords.join(' ') : ''),
          (Array.isArray(r.primaryResearchAreas) ? r.primaryResearchAreas.join(' ') : '')
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.country) {
        const countryLower = String(f.country).toLowerCase();
        const rc = (r.country || '').toLowerCase();
        const ac = (r.affiliationCountry || '').toLowerCase();
        if (rc !== countryLower && ac !== countryLower) return false;
      }

      if (typeof f.hIndexMin === 'number') {
        if (typeof r.hIndex !== 'number' || r.hIndex < f.hIndexMin) return false;
      }
      if (typeof f.hIndexMax === 'number') {
        if (typeof r.hIndex !== 'number' || r.hIndex > f.hIndexMax) return false;
      }

      if (Array.isArray(f.expertiseKeywords) && f.expertiseKeywords.length > 0) {
        const rExp = Array.isArray(r.expertiseKeywords) ? r.expertiseKeywords.map((e) => String(e).toLowerCase()) : [];
        const hasAny = f.expertiseKeywords.some((k) => rExp.includes(String(k).toLowerCase()));
        if (!hasAny) return false;
      }

      return true;
    });

    const sortCode = sort || 'relevance';
    if (sortCode === 'h_index_desc') {
      results.sort((a, b) => {
        const ha = typeof a.hIndex === 'number' ? a.hIndex : -Infinity;
        const hb = typeof b.hIndex === 'number' ? b.hIndex : -Infinity;
        return hb - ha;
      });
    }

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    const mapped = paged.map((researcher) => {
      const highlightedExpertise = [];
      if (Array.isArray(f.expertiseKeywords) && Array.isArray(researcher.expertiseKeywords)) {
        const rExpLower = researcher.expertiseKeywords.map((e) => String(e).toLowerCase());
        f.expertiseKeywords.forEach((k) => {
          const lower = String(k).toLowerCase();
          if (rExpLower.includes(lower)) highlightedExpertise.push(k);
        });
      }
      return {
        researcher,
        highlightedExpertise
      };
    });

    return {
      results: mapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getResearcherProfile(researcherId)
  getResearcherProfile(researcherId) {
    const researchers = this._getFromStorage('researchers', []);
    const publications = this._getFromStorage('publications', []);
    const conferences = this._getFromStorage('conferences', []);
    const follows = this._getFromStorage('followed_researchers', []);

    const researcher = researchers.find((r) => r.id === researcherId) || null;

    let selectedPublications = [];
    let associatedConferences = [];

    if (researcher) {
      const name = researcher.fullName || '';
      const family = researcher.familyName || '';

      selectedPublications = publications.filter((p) => {
        if (Array.isArray(p.authors)) {
          return p.authors.some((a) => this._stringIncludes(a, name) || this._stringIncludes(a, family));
        }
        return false;
      });

      associatedConferences = conferences.filter((c) => {
        const text = [c.title, c.subtitle, c.description].filter(Boolean).join(' ');
        return this._stringIncludes(text, name) || this._stringIncludes(text, family);
      });
    }

    const isFollowed = follows.some((f) => f.researcherId === researcherId);

    return {
      researcher,
      selectedPublications,
      associatedConferences,
      isFollowed
    };
  }

  // followResearcher(researcherId, notes)
  followResearcher(researcherId, notes) {
    const researchers = this._getFromStorage('researchers', []);
    const follows = this._getFromStorage('followed_researchers', []);

    const researcher = researchers.find((r) => r.id === researcherId) || null;
    if (!researcher) {
      return {
        followed: null,
        message: 'Researcher not found.'
      };
    }

    let followed = follows.find((f) => f.researcherId === researcherId) || null;
    let message;
    if (followed) {
      followed.notes = notes || followed.notes || '';
      message = 'Researcher already followed. Notes updated.';
    } else {
      followed = {
        id: this._generateId('fr'),
        researcherId,
        followedAt: new Date().toISOString(),
        notes: notes || ''
      };
      follows.push(followed);
      message = 'Researcher followed.';
    }

    this._saveToStorage('followed_researchers', follows);
    this._getOrCreateUserState();

    return {
      followed,
      message
    };
  }

  // unfollowResearcher(researcherId)
  unfollowResearcher(researcherId) {
    let follows = this._getFromStorage('followed_researchers', []);
    const initialLength = follows.length;
    follows = follows.filter((f) => f.researcherId !== researcherId);
    this._saveToStorage('followed_researchers', follows);
    this._getOrCreateUserState();

    const success = follows.length !== initialLength;
    return {
      success,
      message: success ? 'Researcher unfollowed.' : 'Follow record not found.'
    };
  }

  // getFollowedResearchers()
  getFollowedResearchers() {
    const follows = this._getFromStorage('followed_researchers', []);
    const researchers = this._getFromStorage('researchers', []);

    const items = follows.map((follow) => ({
      follow,
      researcher: researchers.find((r) => r.id === follow.researcherId) || null
    }));

    return {
      items
    };
  }

  // getPublicationSearchOptions()
  getPublicationSearchOptions() {
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);

    let minYear = null;
    let maxYear = null;
    publications.forEach((p) => {
      if (typeof p.year === 'number') {
        if (minYear === null || p.year < minYear) minYear = p.year;
        if (maxYear === null || p.year > maxYear) maxYear = p.year;
      }
    });

    let minIF = null;
    let maxIF = null;
    publications.forEach((p) => {
      const ifv = typeof p.journalImpactFactor === 'number' ? p.journalImpactFactor : null;
      if (ifv != null) {
        if (minIF === null || ifv < minIF) minIF = ifv;
        if (maxIF === null || ifv > maxIF) maxIF = ifv;
      }
    });
    journals.forEach((j) => {
      if (typeof j.impactFactor === 'number') {
        if (minIF === null || j.impactFactor < minIF) minIF = j.impactFactor;
        if (maxIF === null || j.impactFactor > maxIF) maxIF = j.impactFactor;
      }
    });

    const accessTypes = [
      { code: 'open_access', label: 'Open Access' },
      { code: 'subscription', label: 'Subscription' },
      { code: 'hybrid', label: 'Hybrid' }
    ];

    const sortOptions = [
      { code: 'year_desc', label: 'Most Recent First' },
      { code: 'impact_factor_desc', label: 'Impact Factor: High to Low' },
      { code: 'relevance', label: 'Relevance' }
    ];

    return {
      yearRange: {
        min: minYear != null ? minYear : 0,
        max: maxYear != null ? maxYear : 0
      },
      accessTypes,
      impactFactorRange: {
        min: minIF != null ? minIF : 0,
        max: maxIF != null ? maxIF : 0
      },
      sortOptions
    };
  }

  // searchPublications(query, filters, sort, page, pageSize)
  searchPublications(query, filters, sort, page, pageSize) {
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};

    let results = publications.filter((p) => {
      if (q) {
        const text = [
          p.title,
          p.abstract,
          (Array.isArray(p.keywords) ? p.keywords.join(' ') : '')
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (typeof f.yearFrom === 'number' && typeof p.year === 'number' && p.year < f.yearFrom) {
        return false;
      }
      if (typeof f.yearTo === 'number' && typeof p.year === 'number' && p.year > f.yearTo) {
        return false;
      }

      if (f.accessType && p.accessType && p.accessType !== f.accessType) {
        return false;
      }

      if (typeof f.minJournalImpactFactor === 'number') {
        let impact = null;
        if (typeof p.journalImpactFactor === 'number') {
          impact = p.journalImpactFactor;
        } else if (p.journalId) {
          const j = journals.find((j) => j.id === p.journalId);
          if (j && typeof j.impactFactor === 'number') {
            impact = j.impactFactor;
          }
        }
        if (impact != null && impact < f.minJournalImpactFactor) {
          return false;
        }
      }

      return true;
    });

    const sortCode = sort || 'year_desc';
    if (sortCode === 'year_desc') {
      results.sort((a, b) => {
        const ya = typeof a.year === 'number' ? a.year : 0;
        const yb = typeof b.year === 'number' ? b.year : 0;
        return yb - ya;
      });
    } else if (sortCode === 'impact_factor_desc') {
      results.sort((a, b) => {
        const getIF = (p) => {
          if (typeof p.journalImpactFactor === 'number') return p.journalImpactFactor;
          if (p.journalId) {
            const j = journals.find((jj) => jj.id === p.journalId);
            if (j && typeof j.impactFactor === 'number') return j.impactFactor;
          }
          return -Infinity;
        };
        return getIF(b) - getIF(a);
      });
    }

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    const mapped = paged.map((publication) => {
      const journal = publication.journalId
        ? journals.find((j) => j.id === publication.journalId) || null
        : null;
      const isInReadingList = readingListItems.some((i) => i.publicationId === publication.id);
      return {
        publication,
        journal,
        isInReadingList
      };
    });

    return {
      results: mapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getPublicationDetail(publicationId)
  getPublicationDetail(publicationId) {
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);
    const conferences = this._getFromStorage('conferences', []);
    const researchers = this._getFromStorage('researchers', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const publication = publications.find((p) => p.id === publicationId) || null;
    const journal = publication && publication.journalId
      ? journals.find((j) => j.id === publication.journalId) || null
      : null;

    const isInReadingList = readingListItems.some((i) => i.publicationId === publicationId);

    let relatedPublications = [];
    let relatedConferences = [];
    let relatedResearchers = [];

    if (publication) {
      const keywords = Array.isArray(publication.keywords)
        ? publication.keywords.map((k) => String(k).toLowerCase())
        : [];

      relatedPublications = publications.filter((p) => {
        if (p.id === publication.id) return false;
        if (publication.journalId && p.journalId === publication.journalId) return true;
        if (keywords.length && Array.isArray(p.keywords)) {
          const pk = p.keywords.map((k) => String(k).toLowerCase());
          return keywords.some((k) => pk.includes(k));
        }
        return false;
      });

      relatedConferences = conferences.filter((c) => {
        const cTopics = Array.isArray(c.topics)
          ? c.topics.map((t) => String(t).toLowerCase())
          : [];
        if (keywords.length && cTopics.length) {
          return keywords.some((k) => cTopics.includes(k));
        }
        const text = [c.title, c.description].filter(Boolean).join(' ').toLowerCase();
        return keywords.some((k) => text.includes(k));
      });

      relatedResearchers = researchers.filter((r) => {
        const rExp = Array.isArray(r.expertiseKeywords)
          ? r.expertiseKeywords.map((e) => String(e).toLowerCase())
          : [];
        return keywords.some((k) => rExp.includes(k));
      });
    }

    return {
      publication,
      journal,
      isInReadingList,
      relatedPublications,
      relatedConferences,
      relatedResearchers
    };
  }

  // addPublicationToReadingList(publicationId, notes)
  addPublicationToReadingList(publicationId, notes) {
    const publications = this._getFromStorage('publications', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const publication = publications.find((p) => p.id === publicationId) || null;
    if (!publication) {
      return {
        item: null,
        message: 'Publication not found.'
      };
    }

    let item = readingListItems.find((i) => i.publicationId === publicationId) || null;
    let message;
    if (item) {
      item.notes = notes || item.notes || '';
      message = 'Publication already in reading list. Notes updated.';
    } else {
      item = {
        id: this._generateId('rli'),
        publicationId,
        addedAt: new Date().toISOString(),
        notes: notes || ''
      };
      readingListItems.push(item);
      message = 'Publication added to reading list.';
    }

    this._saveToStorage('reading_list_items', readingListItems);
    this._getOrCreateUserState();

    return {
      item,
      message
    };
  }

  // removePublicationFromReadingList(publicationId)
  removePublicationFromReadingList(publicationId) {
    let readingListItems = this._getFromStorage('reading_list_items', []);
    const initialLength = readingListItems.length;
    readingListItems = readingListItems.filter((i) => i.publicationId !== publicationId);
    this._saveToStorage('reading_list_items', readingListItems);
    this._getOrCreateUserState();

    const success = readingListItems.length !== initialLength;
    return {
      success,
      message: success ? 'Publication removed from reading list.' : 'Publication not found in reading list.'
    };
  }

  // getReadingList()
  getReadingList() {
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);

    const items = readingListItems.map((readingListItem) => {
      const publication = publications.find((p) => p.id === readingListItem.publicationId) || null;
      const journal = publication && publication.journalId
        ? journals.find((j) => j.id === publication.journalId) || null
        : null;
      return {
        readingListItem,
        publication,
        journal
      };
    });

    return { items };
  }

  // getEventSearchOptions()
  getEventSearchOptions() {
    const events = this._getFromStorage('events', []);

    const eventTypesEnum = [
      { code: 'workshop', label: 'Workshop' },
      { code: 'seminar', label: 'Seminar' },
      { code: 'webinar', label: 'Webinar' },
      { code: 'conference', label: 'Conference' },
      { code: 'other', label: 'Other' }
    ];

    const durationTypesEnum = [
      { code: 'half_day', label: 'Half-day' },
      { code: 'full_day', label: 'Full-day' },
      { code: 'multi_day', label: 'Multi-day' },
      { code: 'other', label: 'Other' }
    ];

    const feeCurrencies = new Set();
    events.forEach((e) => {
      if (e.baseFeeCurrency) feeCurrencies.add(e.baseFeeCurrency);
    });
    if (feeCurrencies.size === 0) {
      ['usd', 'eur', 'gbp', 'cad', 'aud', 'other'].forEach((c) => feeCurrencies.add(c));
    }

    return {
      eventTypes: eventTypesEnum,
      durationTypes: durationTypesEnum,
      feeCurrencies: Array.from(feeCurrencies)
    };
  }

  // searchEvents(query, filters, sort, page, pageSize)
  searchEvents(query, filters, sort, page, pageSize) {
    const events = this._getFromStorage('events', []);

    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};

    let results = events.filter((e) => {
      if (q) {
        const text = [e.title, e.description, (Array.isArray(e.topics) ? e.topics.join(' ') : '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.eventType && e.eventType !== f.eventType) return false;
      if (f.durationType && e.durationType && e.durationType !== f.durationType) return false;

      const start = this._parseDate(e.startDate);
      if (f.dateFrom) {
        const min = this._parseDate(f.dateFrom);
        if (min && start && start < min) return false;
      }
      if (f.dateTo) {
        const max = this._parseDate(f.dateTo);
        if (max && start && start > max) return false;
      }

      if (typeof f.maxFeeAmount === 'number') {
        const fee = typeof e.baseFeeAmount === 'number' ? e.baseFeeAmount : null;
        const currency = e.baseFeeCurrency || null;
        if (fee != null) {
          if (f.maxFeeCurrency && currency && currency !== f.maxFeeCurrency) {
            // Different currency: cannot reliably compare; exclude
            return false;
          }
          if (fee > f.maxFeeAmount) return false;
        }
      }

      return true;
    });

    const sortCode = sort || 'date_asc';
    if (sortCode === 'date_asc' || sortCode === 'date_desc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.startDate) || new Date(0);
        const db = this._parseDate(b.startDate) || new Date(0);
        return sortCode === 'date_asc' ? da - db : db - da;
      });
    } else if (sortCode === 'fee_asc') {
      results.sort((a, b) => {
        const fa = typeof a.baseFeeAmount === 'number' ? a.baseFeeAmount : Infinity;
        const fb = typeof b.baseFeeAmount === 'number' ? b.baseFeeAmount : Infinity;
        return fa - fb;
      });
    }

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    const mapped = paged.map((event) => {
      let durationLabel = '';
      if (event.durationType === 'half_day') durationLabel = 'Half-day';
      else if (event.durationType === 'full_day') durationLabel = 'Full-day';
      else if (event.durationType === 'multi_day') durationLabel = 'Multi-day';
      else durationLabel = 'Other';

      let feeDisplay = '';
      if (typeof event.baseFeeAmount === 'number' && event.baseFeeCurrency) {
        feeDisplay = `${event.baseFeeAmount} ${event.baseFeeCurrency.toUpperCase()}`;
      }

      return {
        event,
        durationLabel,
        feeDisplay
      };
    });

    return {
      results: mapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const timeSlots = this._getFromStorage('event_time_slots', []);

    const event = events.find((e) => e.id === eventId) || null;
    const eventSlots = timeSlots.filter((t) => t.eventId === eventId);

    const registrationInfo = {
      canRegisterAsGuest: true,
      availablePaymentOptions: ['pay_on_site', 'invoice_later', 'pay_online', 'free'],
      isPreRegistrationOnly: false
    };

    return {
      event,
      timeSlots: eventSlots,
      registrationInfo
    };
  }

  // submitEventRegistration(eventId, timeSlotId, registrationType, fullName, email, affiliation, paymentOption, isPreRegistration)
  submitEventRegistration(
    eventId,
    timeSlotId,
    registrationType,
    fullName,
    email,
    affiliation,
    paymentOption,
    isPreRegistration
  ) {
    const events = this._getFromStorage('events', []);
    const timeSlots = this._getFromStorage('event_time_slots', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        registration: null,
        message: 'Event not found.'
      };
    }

    let slot = null;
    if (timeSlotId) {
      slot = timeSlots.find((t) => t.id === timeSlotId) || null;
      if (!slot) {
        return {
          registration: null,
          message: 'Selected time slot not found.'
        };
      }
    }

    const registration = {
      id: this._generateId('ereg'),
      eventId,
      timeSlotId: timeSlotId || null,
      registrationType: registrationType || 'guest',
      fullName,
      email,
      affiliation: affiliation || '',
      paymentOption: paymentOption || 'pay_on_site',
      isPreRegistration: typeof isPreRegistration === 'boolean' ? isPreRegistration : true,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      registration,
      message: 'Registration submitted.'
    };
  }

  // getNewsletterTopics()
  getNewsletterTopics() {
    const topics = this._getFromStorage('newsletter_topics', []);

    const frequencyOptions = ['weekly', 'monthly', 'daily'];
    const formatOptions = ['html', 'plain_text'];

    return {
      topics,
      frequencyOptions,
      formatOptions
    };
  }

  // getNewsletterSubscriptionsForEmail(email)
  getNewsletterSubscriptionsForEmail(email) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const filtered = subscriptions.filter((s) => s.email === email);
    return {
      subscriptions: filtered
    };
  }

  // updateNewsletterSubscriptions(email, subscriptions)
  updateNewsletterSubscriptions(email, subscriptions) {
    const existing = this._getFromStorage('newsletter_subscriptions', []);
    const now = new Date().toISOString();

    if (!Array.isArray(subscriptions)) subscriptions = [];

    subscriptions.forEach((sub) => {
      const topic = sub.topic;
      if (!topic) return;
      let record = existing.find((e) => e.email === email && e.topic === topic) || null;
      if (record) {
        record.frequency = sub.frequency || record.frequency;
        record.format = sub.format || record.format;
        record.isActive = typeof sub.isActive === 'boolean' ? sub.isActive : record.isActive;
        if (!record.isActive) {
          record.unsubscribedAt = now;
        } else if (record.isActive && record.unsubscribedAt) {
          record.unsubscribedAt = null;
        }
      } else {
        const isActive = sub.isActive !== false;
        record = {
          id: this._generateId('nsub'),
          email,
          topic,
          frequency: sub.frequency || 'weekly',
          format: sub.format || 'html',
          isActive,
          createdAt: now,
          unsubscribedAt: isActive ? null : now
        };
        existing.push(record);
      }
    });

    this._saveToStorage('newsletter_subscriptions', existing);
    this._getOrCreateUserState();

    const updatedSubscriptions = existing.filter((e) => e.email === email);

    return {
      updatedSubscriptions,
      message: 'Newsletter preferences updated.'
    };
  }

  // getDonationPrograms()
  getDonationPrograms() {
    const programs = this._getFromStorage('donation_programs', []);
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'other'];

    return {
      programs,
      supportedCurrencies
    };
  }

  // createDonationDraft(donationType, amount, currency, programId, isAnonymous, communicationPreference, donorName, donorEmail, donorAddress)
  createDonationDraft(
    donationType,
    amount,
    currency,
    programId,
    isAnonymous,
    communicationPreference,
    donorName,
    donorEmail,
    donorAddress
  ) {
    const programs = this._getFromStorage('donation_programs', []);
    const donations = this._getFromStorage('donations', []);

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        donation: null,
        message: 'Donation program not found.'
      };
    }

    const donation = {
      id: this._generateId('don'),
      donationType: donationType || 'one_time',
      amount,
      currency,
      programId,
      isAnonymous: !!isAnonymous,
      communicationPreference: communicationPreference || 'email_only',
      donorName,
      donorEmail,
      donorAddress: donorAddress || '',
      createdAt: new Date().toISOString(),
      status: 'pending_payment'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      donation,
      message: 'Donation draft created.'
    };
  }

  // getMembershipPlans()
  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans', []);
    const activePlans = plans.filter((p) => p.isActive !== false);

    let currency = 'usd';
    if (activePlans.length > 0 && activePlans[0].annualPriceCurrency) {
      currency = activePlans[0].annualPriceCurrency;
    }

    return {
      plans: activePlans,
      currency
    };
  }

  // startMembershipApplication(planId, fullName, email, country, roleOrStatus)
  startMembershipApplication(planId, fullName, email, country, roleOrStatus) {
    const plans = this._getFromStorage('membership_plans', []);
    const applications = this._getFromStorage('membership_applications', []);

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        application: null,
        message: 'Membership plan not found.'
      };
    }

    const application = {
      id: this._generateId('mapp'),
      planId,
      fullName,
      email,
      country,
      roleOrStatus: roleOrStatus || '',
      createdAt: new Date().toISOString(),
      status: 'in_progress'
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      application,
      message: 'Membership application started.'
    };
  }

  // getMyAccountDetails()
  getMyAccountDetails() {
    const scheduleItems = this._getFromStorage('personal_schedule_items', []);
    const sessions = this._getFromStorage('conference_sessions', []);
    const conferences = this._getFromStorage('conferences', []);
    const tracks = this._getFromStorage('conference_tracks', []);
    const bookmarks = this._getFromStorage('conference_bookmarks', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const publications = this._getFromStorage('publications', []);
    const journals = this._getFromStorage('journals', []);
    const follows = this._getFromStorage('followed_researchers', []);
    const researchers = this._getFromStorage('researchers', []);

    const schedule = scheduleItems
      .map((scheduleItem) => {
        const session = sessions.find((s) => s.id === scheduleItem.sessionId) || null;
        if (!session) return null;
        const conference = conferences.find((c) => c.id === session.conferenceId) || null;
        const track = session.trackId ? tracks.find((t) => t.id === session.trackId) || null : null;
        return {
          scheduleItem,
          session,
          conference,
          track
        };
      })
      .filter((x) => x !== null);

    const bookmarkedConferences = bookmarks.map((bookmark) => ({
      bookmark,
      conference: conferences.find((c) => c.id === bookmark.conferenceId) || null
    }));

    const readingList = readingListItems.map((readingListItem) => {
      const publication = publications.find((p) => p.id === readingListItem.publicationId) || null;
      const journal = publication && publication.journalId
        ? journals.find((j) => j.id === publication.journalId) || null
        : null;
      return {
        readingListItem,
        publication,
        journal
      };
    });

    const followedResearchers = follows.map((follow) => ({
      follow,
      researcher: researchers.find((r) => r.id === follow.researcherId) || null
    }));

    return {
      schedule,
      bookmarkedConferences,
      readingList,
      followedResearchers
    };
  }

  // getAboutOrganizationContent()
  getAboutOrganizationContent() {
    const content = this._getFromStorage('about_organization_content', {
      mission: '',
      history: '',
      focusAreas: [],
      programDescriptions: [],
      leadership: []
    });

    return {
      mission: content.mission || '',
      history: content.history || '',
      focusAreas: Array.isArray(content.focusAreas) ? content.focusAreas : [],
      programDescriptions: Array.isArray(content.programDescriptions) ? content.programDescriptions : [],
      leadership: Array.isArray(content.leadership) ? content.leadership : []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      emails: [],
      phoneNumbers: [],
      mailingAddresses: [],
      inquiryTopics: [],
      responseTimeInfo: ''
    });

    return {
      emails: Array.isArray(info.emails) ? info.emails : [],
      phoneNumbers: Array.isArray(info.phoneNumbers) ? info.phoneNumbers : [],
      mailingAddresses: Array.isArray(info.mailingAddresses) ? info.mailingAddresses : [],
      inquiryTopics: Array.isArray(info.inquiryTopics) ? info.inquiryTopics : [],
      responseTimeInfo: info.responseTimeInfo || ''
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_submissions', []);

    const submission = {
      id: this._generateId('csub'),
      name,
      email,
      topic,
      message,
      createdAt: new Date().toISOString()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // getPolicyDocuments()
  getPolicyDocuments() {
    const documents = this._getFromStorage('policy_documents', []);
    return {
      documents
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