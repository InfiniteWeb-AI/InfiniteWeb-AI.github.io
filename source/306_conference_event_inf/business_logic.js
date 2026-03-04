// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'conference_days',
      'tracks',
      'sessions',
      'workshops',
      'speakers',
      'speaker_sessions',
      'schedule_items',
      'session_bookmarks',
      'reminders',
      'workshop_registrations',
      'sponsors',
      'sponsor_favorites',
      'faq_categories',
      'faq_articles',
      'support_requests',
      'newsletter_subscriptions',
      'update_type_options',
      'topic_options'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseTimeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getConferenceDayById(id) {
    if (!id) return null;
    const days = this._getFromStorage('conference_days');
    return days.find((d) => d.id === id) || null;
  }

  _getTrackById(id) {
    if (!id) return null;
    const tracks = this._getFromStorage('tracks');
    return tracks.find((t) => t.id === id) || null;
  }

  _getSessionById(id) {
    if (!id) return null;
    const sessions = this._getFromStorage('sessions');
    return sessions.find((s) => s.id === id) || null;
  }

  _getWorkshopById(id) {
    if (!id) return null;
    const workshops = this._getFromStorage('workshops');
    return workshops.find((w) => w.id === id) || null;
  }

  _getContentByType(contentType, contentId) {
    if (contentType === 'session') {
      return this._getSessionById(contentId);
    }
    if (contentType === 'workshop') {
      return this._getWorkshopById(contentId);
    }
    return null;
  }

  _timesOverlap(startA, endA, startB, endB) {
    const aStart = new Date(startA).getTime();
    const aEnd = new Date(endA).getTime();
    const bStart = new Date(startB).getTime();
    const bEnd = new Date(endB).getTime();
    return aStart < bEnd && bStart < aEnd;
  }

  // ----------------------
  // Helper functions (per spec)
  // ----------------------

  _getOrCreateUserContext() {
    // Single-user context; minimal implementation
    const key = 'user_context';
    const existing = localStorage.getItem(key);
    if (existing) {
      return JSON.parse(existing);
    }
    const ctx = {
      id: 'user_1',
      createdAt: this._nowIso()
    };
    this._saveObjectToStorage(key, ctx);
    return ctx;
  }

  _upsertScheduleItem(contentType, contentId, attendanceMode, interestLevel, reminderMinutesBefore) {
    this._getOrCreateUserContext();
    let items = this._getFromStorage('schedule_items');
    let item = items.find((i) => i.contentType === contentType && i.contentId === contentId);

    if (item) {
      // Update existing
      if (attendanceMode) item.attendanceMode = attendanceMode;
      if (interestLevel) item.interestLevel = interestLevel;
      if (typeof reminderMinutesBefore === 'number') {
        item.reminderMinutesBefore = reminderMinutesBefore;
      }
    } else {
      item = {
        id: this._generateId('scheduleitem'),
        contentType: contentType,
        contentId: contentId,
        addedAt: this._nowIso(),
        attendanceMode: attendanceMode || 'unspecified',
        interestLevel: interestLevel || 'none',
        reminderMinutesBefore: typeof reminderMinutesBefore === 'number' ? reminderMinutesBefore : null,
        notes: ''
      };
      items.push(item);
    }

    this._saveToStorage('schedule_items', items);
    return item;
  }

  _upsertReminderForContent(contentType, contentId, reminderType, minutesBefore, enabled) {
    this._getOrCreateUserContext();
    let reminders = this._getFromStorage('reminders');
    let reminder = reminders.find(
      (r) => r.contentType === contentType && r.contentId === contentId && r.reminderType === reminderType
    );

    if (reminder) {
      reminder.minutesBefore = minutesBefore;
      reminder.enabled = enabled;
    } else {
      reminder = {
        id: this._generateId('reminder'),
        contentType: contentType,
        contentId: contentId,
        reminderType: reminderType,
        minutesBefore: minutesBefore,
        enabled: enabled,
        createdAt: this._nowIso()
      };
      reminders.push(reminder);
    }

    this._saveToStorage('reminders', reminders);
    return reminder;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getConferenceOverview()
  getConferenceOverview() {
    const overview = this._getObjectFromStorage('conference_overview', null);
    if (overview) {
      return overview;
    }
    // No mocked content; return empty structure
    return {
      conferenceName: '',
      tagline: '',
      startDate: null,
      endDate: null,
      venueName: '',
      venueCity: '',
      venueAddress: '',
      audienceDescription: '',
      missionStatement: '',
      highLevelAgenda: '',
      keyHighlights: []
    };
  }

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const sessions = this._getFromStorage('sessions');
    const workshops = this._getFromStorage('workshops');
    const conferenceDays = this._getFromStorage('conference_days');
    const tracks = this._getFromStorage('tracks');
    const scheduleItems = this._getFromStorage('schedule_items');

    // Featured sessions: sessions where isFeatured === true
    const featuredSessions = sessions
      .filter((s) => s.isFeatured)
      .map((s) => {
        const day = conferenceDays.find((d) => d.id === s.conferenceDayId) || null;
        const track = tracks.find((t) => t.id === s.trackId) || null;
        const scheduleItem = scheduleItems.find(
          (si) => si.contentType === 'session' && si.contentId === s.id
        );
        return {
          sessionId: s.id,
          title: s.title,
          subtitle: s.subtitle || '',
          sessionType: s.sessionType,
          trackName: track ? track.name : '',
          trackColor: track ? track.color || '' : '',
          conferenceDayLabel: day ? day.label : '',
          startDateTime: s.startDateTime,
          endDateTime: s.endDateTime,
          location: s.location || s.room || '',
          rating: typeof s.rating === 'number' ? s.rating : null,
          liveStreamAvailable: !!s.liveStreamAvailable,
          isInMySchedule: !!scheduleItem,
          // Foreign key resolution
          session: s,
          conferenceDay: day,
          track: track
        };
      });

    // Featured workshops: simple heuristic - first few workshops
    const featuredWorkshops = workshops.slice(0, 10).map((w) => {
      const day = conferenceDays.find((d) => d.id === w.conferenceDayId) || null;
      return {
        workshopId: w.id,
        title: w.title,
        level: w.level,
        price: w.price,
        currency: w.currency,
        conferenceDayLabel: day ? day.label : '',
        startDateTime: w.startDateTime,
        endDateTime: w.endDateTime,
        location: w.location || '',
        // Foreign key resolution
        workshop: w,
        conferenceDay: day
      };
    });

    const announcements = this._getFromStorage('announcements'); // if not present, []

    return {
      featuredSessions: featuredSessions,
      featuredWorkshops: featuredWorkshops,
      announcements: announcements
    };
  }

  // getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const days = this._getFromStorage('conference_days');
    const tracks = this._getFromStorage('tracks');

    const sessionTypes = [
      { code: 'talk', label: 'Talk' },
      { code: 'keynote', label: 'Keynote' },
      { code: 'panel', label: 'Panel' },
      { code: 'networking', label: 'Networking' },
      { code: 'social_event', label: 'Social Event' },
      { code: 'tutorial', label: 'Tutorial' },
      { code: 'lightning_talk', label: 'Lightning Talk' },
      { code: 'other', label: 'Other' }
    ];

    const accessTypes = [
      { code: 'open_to_all_attendees', label: 'Open to all attendees' },
      { code: 'invite_only', label: 'Invite only' },
      { code: 'limited_capacity', label: 'Limited capacity' },
      { code: 'vip_only', label: 'VIP only' },
      { code: 'other', label: 'Other' }
    ];

    const ratingFilterSteps = [3, 3.5, 4, 4.5, 5];

    const sortOptions = [
      { code: 'start_time_asc', label: 'Start time (earliest first)' },
      { code: 'start_time_desc', label: 'Start time (latest first)' },
      { code: 'rating_desc', label: 'Rating (high to low)' },
      { code: 'rating_asc', label: 'Rating (low to high)' },
      { code: 'title_asc', label: 'Title (A–Z)' }
    ];

    const timeFilterDefaults = {
      dayStartTime: '09:00',
      dayEndTime: '18:00',
      timeIncrementMinutes: 30
    };

    return {
      days: days,
      tracks: tracks,
      sessionTypes: sessionTypes,
      accessTypes: accessTypes,
      ratingFilterSteps: ratingFilterSteps,
      sortOptions: sortOptions,
      timeFilterDefaults: timeFilterDefaults
    };
  }

  // searchSessions(conferenceDayId, minStartTime, maxStartTime, trackIds, sessionTypes, minRating, accessTypes, requireLiveStream, excludeFull, query, sortBy)
  searchSessions(
    conferenceDayId,
    minStartTime,
    maxStartTime,
    trackIds,
    sessionTypes,
    minRating,
    accessTypes,
    requireLiveStream,
    excludeFull,
    query,
    sortBy
  ) {
    const sessions = this._getFromStorage('sessions');
    const conferenceDays = this._getFromStorage('conference_days');
    const tracks = this._getFromStorage('tracks');
    const scheduleItems = this._getFromStorage('schedule_items');
    const bookmarks = this._getFromStorage('session_bookmarks');

    const minMinutes = this._parseTimeToMinutes(minStartTime);
    const maxMinutes = this._parseTimeToMinutes(maxStartTime);
    const q = query && typeof query === 'string' ? query.toLowerCase().trim() : '';

    let results = sessions.filter((s) => {
      if (conferenceDayId && s.conferenceDayId !== conferenceDayId) return false;

      if (minMinutes !== null || maxMinutes !== null) {
        const dt = new Date(s.startDateTime);
        // Use UTC-based time so filtering is consistent regardless of server timezone
        const totalMin = dt.getUTCHours() * 60 + dt.getUTCMinutes();
        if (minMinutes !== null && totalMin < minMinutes) return false;
        if (maxMinutes !== null && totalMin > maxMinutes) return false;
      }

      if (Array.isArray(trackIds) && trackIds.length > 0) {
        if (!s.trackId || !trackIds.includes(s.trackId)) return false;
      }

      if (Array.isArray(sessionTypes) && sessionTypes.length > 0) {
        if (!sessionTypes.includes(s.sessionType)) return false;
      }

      if (typeof minRating === 'number') {
        const ratingVal = typeof s.rating === 'number' ? s.rating : 0;
        if (ratingVal < minRating) return false;
      }

      if (Array.isArray(accessTypes) && accessTypes.length > 0) {
        if (!s.accessType || !accessTypes.includes(s.accessType)) return false;
      }

      if (requireLiveStream) {
        if (!s.liveStreamAvailable) return false;
      }

      if (excludeFull) {
        if (typeof s.capacityRemaining === 'number' && s.capacityRemaining <= 0) {
          return false;
        }
      }

      if (q) {
        const title = (s.title || '').toLowerCase();
        const subtitle = (s.subtitle || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
        if (
          title.indexOf(q) === -1 &&
          subtitle.indexOf(q) === -1 &&
          desc.indexOf(q) === -1 &&
          tags.indexOf(q) === -1
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    const sortCode = sortBy || 'start_time_asc';
    results.sort((a, b) => {
      if (sortCode === 'start_time_desc') {
        return new Date(b.startDateTime) - new Date(a.startDateTime);
      }
      if (sortCode === 'rating_desc') {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        return br - ar;
      }
      if (sortCode === 'rating_asc') {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        return ar - br;
      }
      if (sortCode === 'title_asc') {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      }
      // default: start_time_asc
      return new Date(a.startDateTime) - new Date(b.startDateTime);
    });

    const mapped = results.map((s) => {
      const day = conferenceDays.find((d) => d.id === s.conferenceDayId) || null;
      const track = tracks.find((t) => t.id === s.trackId) || null;
      const scheduleItem = scheduleItems.find(
        (si) => si.contentType === 'session' && si.contentId === s.id
      );
      const bookmark = bookmarks.find((b) => b.sessionId === s.id);

      return {
        sessionId: s.id,
        title: s.title,
        subtitle: s.subtitle || '',
        sessionType: s.sessionType,
        conferenceDayId: s.conferenceDayId,
        conferenceDayLabel: day ? day.label : '',
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        trackId: s.trackId,
        trackName: track ? track.name : '',
        trackColor: track ? track.color || '' : '',
        location: s.location || '',
        room: s.room || '',
        rating: typeof s.rating === 'number' ? s.rating : null,
        ratingCount: typeof s.ratingCount === 'number' ? s.ratingCount : 0,
        liveStreamAvailable: !!s.liveStreamAvailable,
        accessType: s.accessType || null,
        capacityTotal: typeof s.capacityTotal === 'number' ? s.capacityTotal : null,
        capacityRemaining: typeof s.capacityRemaining === 'number' ? s.capacityRemaining : null,
        tags: Array.isArray(s.tags) ? s.tags : [],
        isFeatured: !!s.isFeatured,
        isInMySchedule: !!scheduleItem,
        attendanceMode: scheduleItem ? scheduleItem.attendanceMode : 'unspecified',
        interestLevel: scheduleItem ? scheduleItem.interestLevel : 'none',
        isBookmarked: !!bookmark,
        // Foreign key resolution
        session: s,
        conferenceDay: day,
        track: track
      };
    });

    return mapped;
  }

  // getSessionDetail(sessionId)
  getSessionDetail(sessionId) {
    const session = this._getSessionById(sessionId);
    if (!session) {
      return {
        session: null,
        conferenceDay: null,
        track: null,
        speakers: [],
        isInMySchedule: false,
        scheduleItem: null,
        isBookmarked: false,
        reminders: []
      };
    }

    const conferenceDay = this._getConferenceDayById(session.conferenceDayId);
    const track = this._getTrackById(session.trackId);

    const speakerSessions = this._getFromStorage('speaker_sessions');
    const speakersData = this._getFromStorage('speakers');

    const relatedSpeakerSessions = speakerSessions.filter(
      (ss) => ss.contentType === 'session' && ss.contentId === sessionId
    );

    const speakers = relatedSpeakerSessions.map((ss) => {
      const sp = speakersData.find((s) => s.id === ss.speakerId) || {};
      return {
        speakerId: sp.id,
        name: sp.name,
        title: sp.title || '',
        organization: sp.organization || '',
        photoUrl: sp.photoUrl || '',
        role: ss.role || 'speaker',
        // Foreign key resolution
        speaker: sp
      };
    });

    const scheduleItems = this._getFromStorage('schedule_items');
    const scheduleItem = scheduleItems.find(
      (si) => si.contentType === 'session' && si.contentId === sessionId
    );

    const bookmarks = this._getFromStorage('session_bookmarks');
    const isBookmarked = !!bookmarks.find((b) => b.sessionId === sessionId);

    const remindersAll = this._getFromStorage('reminders');
    const reminders = remindersAll
      .filter((r) => r.contentType === 'session' && r.contentId === sessionId)
      .map((r) => ({
        reminderId: r.id,
        reminderType: r.reminderType,
        minutesBefore: r.minutesBefore,
        enabled: r.enabled
      }));

    // enrich session with foreign keys as well
    const sessionWithRelations = Object.assign({}, session, {
      conferenceDay: conferenceDay,
      track: track
    });

    return {
      session: sessionWithRelations,
      conferenceDay: conferenceDay,
      track: track,
      speakers: speakers,
      isInMySchedule: !!scheduleItem,
      scheduleItem: scheduleItem
        ? {
            scheduleItemId: scheduleItem.id,
            attendanceMode: scheduleItem.attendanceMode,
            interestLevel: scheduleItem.interestLevel,
            reminderMinutesBefore: scheduleItem.reminderMinutesBefore,
            notes: scheduleItem.notes || ''
          }
        : null,
      isBookmarked: isBookmarked,
      reminders: reminders
    };
  }

  // addItemToMySchedule(contentType, contentId, attendanceMode, interestLevel, reminderMinutesBefore)
  addItemToMySchedule(contentType, contentId, attendanceMode, interestLevel, reminderMinutesBefore) {
    if (contentType !== 'session' && contentType !== 'workshop') {
      return {
        success: false,
        message: 'Invalid contentType',
        scheduleItem: null,
        conflictingItems: []
      };
    }

    const content = this._getContentByType(contentType, contentId);
    if (!content) {
      return {
        success: false,
        message: 'Content not found',
        scheduleItem: null,
        conflictingItems: []
      };
    }

    const scheduleItems = this._getFromStorage('schedule_items');

    const newStart = content.startDateTime;
    const newEnd = content.endDateTime;
    const newDayId = content.conferenceDayId;

    const conflictingItems = scheduleItems
      .filter((si) => !(si.contentType === contentType && si.contentId === contentId))
      .map((si) => {
        const c = this._getContentByType(si.contentType, si.contentId);
        if (!c) return null;
        if (c.conferenceDayId !== newDayId) return null;
        const overlap = this._timesOverlap(newStart, newEnd, c.startDateTime, c.endDateTime);
        if (!overlap) return null;
        return {
          contentType: si.contentType,
          contentId: si.contentId,
          title: c.title,
          startDateTime: c.startDateTime,
          endDateTime: c.endDateTime
        };
      })
      .filter((x) => !!x);

    const scheduleItem = this._upsertScheduleItem(
      contentType,
      contentId,
      attendanceMode,
      interestLevel,
      reminderMinutesBefore
    );

    if (typeof reminderMinutesBefore === 'number') {
      this._upsertReminderForContent(
        contentType,
        contentId,
        'notification',
        reminderMinutesBefore,
        true
      );
    }

    return {
      success: true,
      message: 'Added to schedule',
      scheduleItem: scheduleItem,
      conflictingItems: conflictingItems
    };
  }

  // removeItemFromMySchedule(contentType, contentId)
  removeItemFromMySchedule(contentType, contentId) {
    let items = this._getFromStorage('schedule_items');
    const before = items.length;
    items = items.filter((si) => !(si.contentType === contentType && si.contentId === contentId));
    this._saveToStorage('schedule_items', items);
    const after = items.length;

    return {
      success: after < before,
      message: after < before ? 'Removed from schedule' : 'Item was not in schedule'
    };
  }

  // updateScheduleItemInterest(contentType, contentId, interestLevel)
  updateScheduleItemInterest(contentType, contentId, interestLevel) {
    let items = this._getFromStorage('schedule_items');
    const item = items.find((si) => si.contentType === contentType && si.contentId === contentId);
    if (!item) {
      return {
        success: false,
        updatedInterestLevel: null
      };
    }
    item.interestLevel = interestLevel;
    this._saveToStorage('schedule_items', items);
    return {
      success: true,
      updatedInterestLevel: interestLevel
    };
  }

  // bookmarkSession(sessionId)
  bookmarkSession(sessionId) {
    this._getOrCreateUserContext();
    let bookmarks = this._getFromStorage('session_bookmarks');
    let bm = bookmarks.find((b) => b.sessionId === sessionId);
    if (!bm) {
      bm = {
        id: this._generateId('sessionbookmark'),
        sessionId: sessionId,
        createdAt: this._nowIso()
      };
      bookmarks.push(bm);
      this._saveToStorage('session_bookmarks', bookmarks);
    }
    return {
      success: true,
      bookmarkId: bm.id,
      isBookmarked: true
    };
  }

  // unbookmarkSession(sessionId)
  unbookmarkSession(sessionId) {
    let bookmarks = this._getFromStorage('session_bookmarks');
    const before = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.sessionId !== sessionId);
    this._saveToStorage('session_bookmarks', bookmarks);
    const after = bookmarks.length;
    return {
      success: after < before,
      isBookmarked: false
    };
  }

  // setContentReminder(contentType, contentId, reminderType, minutesBefore, enabled)
  setContentReminder(contentType, contentId, reminderType, minutesBefore, enabled) {
    const reminder = this._upsertReminderForContent(
      contentType,
      contentId,
      reminderType,
      minutesBefore,
      enabled
    );
    return {
      reminder: reminder,
      success: true
    };
  }

  // getWorkshopFilterOptions()
  getWorkshopFilterOptions() {
    const days = this._getFromStorage('conference_days');
    const workshops = this._getFromStorage('workshops');

    // Compute price range from workshops
    let minPrice = null;
    let maxPrice = null;
    workshops.forEach((w) => {
      if (typeof w.price === 'number') {
        if (minPrice === null || w.price < minPrice) minPrice = w.price;
        if (maxPrice === null || w.price > maxPrice) maxPrice = w.price;
      }
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const levels = [
      { code: 'beginner', label: 'Beginner' },
      { code: 'intermediate', label: 'Intermediate' },
      { code: 'advanced', label: 'Advanced' },
      { code: 'all_levels', label: 'All levels' }
    ];

    const sortOptions = [
      { code: 'price_asc', label: 'Price (low to high)' },
      { code: 'price_desc', label: 'Price (high to low)' },
      { code: 'start_time_asc', label: 'Start time (earliest first)' },
      { code: 'start_time_desc', label: 'Start time (latest first)' },
      { code: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      days: days,
      levels: levels,
      priceRange: {
        minPrice: minPrice,
        maxPrice: maxPrice,
        currency: 'usd'
      },
      sortOptions: sortOptions
    };
  }

  // searchWorkshops(conferenceDayId, level, minPrice, maxPrice, query, sortBy)
  searchWorkshops(conferenceDayId, level, minPrice, maxPrice, query, sortBy) {
    const workshops = this._getFromStorage('workshops');
    const conferenceDays = this._getFromStorage('conference_days');

    const q = query && typeof query === 'string' ? query.toLowerCase().trim() : '';

    let results = workshops.filter((w) => {
      if (conferenceDayId && w.conferenceDayId !== conferenceDayId) return false;
      if (level && w.level !== level) return false;
      if (typeof minPrice === 'number' && typeof w.price === 'number' && w.price < minPrice) {
        return false;
      }
      if (typeof maxPrice === 'number' && typeof w.price === 'number' && w.price > maxPrice) {
        return false;
      }
      if (q) {
        const title = (w.title || '').toLowerCase();
        const subtitle = (w.subtitle || '').toLowerCase();
        const desc = (w.description || '').toLowerCase();
        const obj = (w.objectives || '').toLowerCase();
        const tags = Array.isArray(w.tags) ? w.tags.join(' ').toLowerCase() : '';
        if (
          title.indexOf(q) === -1 &&
          subtitle.indexOf(q) === -1 &&
          desc.indexOf(q) === -1 &&
          obj.indexOf(q) === -1 &&
          tags.indexOf(q) === -1
        ) {
          return false;
        }
      }
      return true;
    });

    const sortCode = sortBy || 'start_time_asc';
    results.sort((a, b) => {
      if (sortCode === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortCode === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortCode === 'start_time_desc') {
        return new Date(b.startDateTime) - new Date(a.startDateTime);
      }
      if (sortCode === 'title_asc') {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      }
      // default: start_time_asc
      return new Date(a.startDateTime) - new Date(b.startDateTime);
    });

    const mapped = results.map((w) => {
      const day = conferenceDays.find((d) => d.id === w.conferenceDayId) || null;
      const descSnippet = (w.description || '').substring(0, 200);
      return {
        workshopId: w.id,
        title: w.title,
        subtitle: w.subtitle || '',
        level: w.level,
        price: w.price,
        currency: w.currency,
        conferenceDayId: w.conferenceDayId,
        conferenceDayLabel: day ? day.label : '',
        startDateTime: w.startDateTime,
        endDateTime: w.endDateTime,
        location: w.location || '',
        descriptionSnippet: descSnippet,
        capacityTotal: typeof w.capacityTotal === 'number' ? w.capacityTotal : null,
        capacityRemaining: typeof w.capacityRemaining === 'number' ? w.capacityRemaining : null,
        liveStreamAvailable: !!w.liveStreamAvailable,
        tags: Array.isArray(w.tags) ? w.tags : [],
        // Foreign key resolution
        workshop: w,
        conferenceDay: day
      };
    });

    return mapped;
  }

  // getWorkshopDetail(workshopId)
  getWorkshopDetail(workshopId) {
    const workshop = this._getWorkshopById(workshopId);
    if (!workshop) {
      return {
        workshop: null,
        conferenceDay: null,
        instructors: [],
        isInMySchedule: false,
        existingRegistration: null
      };
    }

    const conferenceDay = this._getConferenceDayById(workshop.conferenceDayId);

    const speakerSessions = this._getFromStorage('speaker_sessions');
    const speakersData = this._getFromStorage('speakers');

    const relatedSpeakerSessions = speakerSessions.filter(
      (ss) => ss.contentType === 'workshop' && ss.contentId === workshopId
    );

    const instructors = relatedSpeakerSessions.map((ss) => {
      const sp = speakersData.find((s) => s.id === ss.speakerId) || {};
      return {
        speakerId: sp.id,
        name: sp.name,
        title: sp.title || '',
        organization: sp.organization || '',
        photoUrl: sp.photoUrl || '',
        role: ss.role || 'instructor',
        // Foreign key resolution
        speaker: sp
      };
    });

    const scheduleItems = this._getFromStorage('schedule_items');
    const isInMySchedule = !!scheduleItems.find(
      (si) => si.contentType === 'workshop' && si.contentId === workshopId
    );

    const registrations = this._getFromStorage('workshop_registrations');
    const existing = registrations.find((r) => r.workshopId === workshopId && r.status !== 'cancelled');

    const workshopWithRelations = Object.assign({}, workshop, {
      conferenceDay: conferenceDay
    });

    return {
      workshop: workshopWithRelations,
      conferenceDay: conferenceDay,
      instructors: instructors,
      isInMySchedule: isInMySchedule,
      existingRegistration: existing
        ? {
            registrationId: existing.id,
            status: existing.status
          }
        : null
    };
  }

  // submitWorkshopRegistration(workshopId, attendeeName, attendeeEmail, attendeeOrganization, attendanceType, dietaryPreference)
  submitWorkshopRegistration(
    workshopId,
    attendeeName,
    attendeeEmail,
    attendeeOrganization,
    attendanceType,
    dietaryPreference
  ) {
    const workshop = this._getWorkshopById(workshopId);
    if (!workshop) {
      return {
        registration: null,
        success: false,
        message: 'Workshop not found'
      };
    }

    let registrations = this._getFromStorage('workshop_registrations');
    const registration = {
      id: this._generateId('workshopreg'),
      workshopId: workshopId,
      workshopTitleSnapshot: workshop.title,
      registeredAt: this._nowIso(),
      attendeeName: attendeeName,
      attendeeEmail: attendeeEmail,
      attendeeOrganization: attendeeOrganization || '',
      attendanceType: attendanceType || null,
      dietaryPreference: dietaryPreference || 'none',
      status: 'pending'
    };
    registrations.push(registration);
    this._saveToStorage('workshop_registrations', registrations);

    // Optionally decrement capacityRemaining if defined
    const workshops = this._getFromStorage('workshops');
    const idx = workshops.findIndex((w) => w.id === workshopId);
    if (idx !== -1) {
      const w = workshops[idx];
      if (typeof w.capacityRemaining === 'number') {
        w.capacityRemaining = Math.max(0, w.capacityRemaining - 1);
      }
      workshops[idx] = w;
      this._saveToStorage('workshops', workshops);
    }

    return {
      registration: registration,
      success: true,
      message: 'Registration submitted'
    };
  }

  // getSponsorFilterOptions()
  getSponsorFilterOptions() {
    const sponsorshipLevels = [
      { code: 'title', label: 'Title' },
      { code: 'platinum', label: 'Platinum' },
      { code: 'gold', label: 'Gold' },
      { code: 'silver', label: 'Silver' },
      { code: 'bronze', label: 'Bronze' },
      { code: 'partner', label: 'Partner' },
      { code: 'community', label: 'Community' }
    ];

    const categories = [
      { code: 'developer_tools', label: 'Developer Tools' },
      { code: 'cloud_infrastructure', label: 'Cloud Infrastructure' },
      { code: 'design_tools', label: 'Design Tools' },
      { code: 'productivity', label: 'Productivity' },
      { code: 'consulting', label: 'Consulting' },
      { code: 'education', label: 'Education' },
      { code: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { code: 'name_asc', label: 'Name (A–Z)' },
      { code: 'name_desc', label: 'Name (Z–A)' }
    ];

    return {
      sponsorshipLevels: sponsorshipLevels,
      categories: categories,
      sortOptions: sortOptions
    };
  }

  // searchSponsors(sponsorshipLevel, category, query, sortBy)
  searchSponsors(sponsorshipLevel, category, query, sortBy) {
    const sponsors = this._getFromStorage('sponsors');
    const favorites = this._getFromStorage('sponsor_favorites');
    const q = query && typeof query === 'string' ? query.toLowerCase().trim() : '';

    let results = sponsors.filter((s) => {
      if (sponsorshipLevel && s.sponsorshipLevel !== sponsorshipLevel) return false;
      if (category && s.category !== category) return false;
      if (q) {
        const name = (s.name || '').toLowerCase();
        if (name.indexOf(q) === -1) return false;
      }
      return true;
    });

    const sortCode = sortBy || 'name_asc';
    results.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      if (sortCode === 'name_desc') {
        if (an < bn) return 1;
        if (an > bn) return -1;
        return 0;
      }
      // default name_asc
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    return results.map((s) => {
      const fav = favorites.find((f) => f.sponsorId === s.id);
      return {
        sponsorId: s.id,
        name: s.name,
        sponsorshipLevel: s.sponsorshipLevel,
        category: s.category,
        logoUrl: s.logoUrl || '',
        isFavorite: !!fav,
        // Foreign key resolution
        sponsor: s
      };
    });
  }

  // getSponsorDetail(sponsorId)
  getSponsorDetail(sponsorId) {
    const sponsor = this._getFromStorage('sponsors').find((s) => s.id === sponsorId) || null;
    const favorites = this._getFromStorage('sponsor_favorites');
    const isFavorite = !!favorites.find((f) => f.sponsorId === sponsorId);
    return {
      sponsor: sponsor,
      isFavorite: isFavorite
    };
  }

  // addSponsorToFavorites(sponsorId)
  addSponsorToFavorites(sponsorId) {
    this._getOrCreateUserContext();
    let favorites = this._getFromStorage('sponsor_favorites');
    let fav = favorites.find((f) => f.sponsorId === sponsorId);
    if (!fav) {
      fav = {
        id: this._generateId('sponsorfav'),
        sponsorId: sponsorId,
        createdAt: this._nowIso()
      };
      favorites.push(fav);
      this._saveToStorage('sponsor_favorites', favorites);
    }
    return {
      favorite: fav,
      success: true,
      isFavorite: true
    };
  }

  // removeSponsorFromFavorites(sponsorId)
  removeSponsorFromFavorites(sponsorId) {
    let favorites = this._getFromStorage('sponsor_favorites');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.sponsorId !== sponsorId);
    this._saveToStorage('sponsor_favorites', favorites);
    const after = favorites.length;
    return {
      success: after < before,
      isFavorite: false
    };
  }

  // searchSpeakers(query, sortBy)
  searchSpeakers(query, sortBy) {
    const speakers = this._getFromStorage('speakers');
    const q = query && typeof query === 'string' ? query.toLowerCase().trim() : '';

    let results = speakers.filter((s) => {
      if (!q) return true;
      const name = (s.name || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const org = (s.organization || '').toLowerCase();
      return (
        name.indexOf(q) !== -1 ||
        title.indexOf(q) !== -1 ||
        org.indexOf(q) !== -1
      );
    });

    const sortCode = sortBy || 'name_asc';
    if (sortCode === 'name_asc') {
      results.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    return results.map((s) => ({
      speakerId: s.id,
      name: s.name,
      title: s.title || '',
      organization: s.organization || '',
      bioShort: s.bioShort || '',
      photoUrl: s.photoUrl || '',
      // Foreign key resolution
      speaker: s
    }));
  }

  // getSpeakerProfile(speakerId)
  getSpeakerProfile(speakerId) {
    const speaker = this._getFromStorage('speakers').find((s) => s.id === speakerId) || null;
    const speakerSessions = this._getFromStorage('speaker_sessions');
    const sessions = this._getFromStorage('sessions');
    const workshops = this._getFromStorage('workshops');
    const conferenceDays = this._getFromStorage('conference_days');
    const tracks = this._getFromStorage('tracks');

    const related = speakerSessions.filter((ss) => ss.speakerId === speakerId);

    const sessionsWithSpeaker = related.map((ss) => {
      let content = null;
      let sessionType = null;
      let isWorkshop = false;
      if (ss.contentType === 'session') {
        content = sessions.find((s) => s.id === ss.contentId) || null;
        sessionType = content ? content.sessionType : null;
        isWorkshop = false;
      } else if (ss.contentType === 'workshop') {
        content = workshops.find((w) => w.id === ss.contentId) || null;
        // workshops do not have sessionType; mark as 'other'
        sessionType = 'other';
        isWorkshop = true;
      }
      if (!content) {
        return null;
      }
      const day = conferenceDays.find((d) => d.id === content.conferenceDayId) || null;
      const track = !isWorkshop && content.trackId
        ? tracks.find((t) => t.id === content.trackId) || null
        : null;

      return {
        contentType: ss.contentType,
        contentId: ss.contentId,
        title: content.title,
        sessionType: sessionType,
        isWorkshop: isWorkshop,
        conferenceDayLabel: day ? day.label : '',
        startDateTime: content.startDateTime,
        endDateTime: content.endDateTime,
        trackName: track ? track.name : '',
        // Foreign key resolution
        content: content,
        conferenceDay: day,
        track: track
      };
    }).filter((x) => !!x);

    const availableSessionTypesSet = {};
    sessionsWithSpeaker.forEach((sws) => {
      if (!sws.isWorkshop && sws.sessionType) {
        availableSessionTypesSet[sws.sessionType] = true;
      }
    });
    const availableSessionTypes = Object.keys(availableSessionTypesSet);

    return {
      speaker: speaker,
      sessionsWithSpeaker: sessionsWithSpeaker,
      availableSessionTypes: availableSessionTypes
    };
  }

  // getFAQCategories()
  getFAQCategories() {
    return this._getFromStorage('faq_categories');
  }

  // searchFAQArticles(query, categoryId)
  searchFAQArticles(query, categoryId) {
    const q = query && typeof query === 'string' ? query.toLowerCase().trim() : '';
    const articles = this._getFromStorage('faq_articles');
    const categories = this._getFromStorage('faq_categories');

    const results = articles.filter((a) => {
      if (!q) return !categoryId || a.categoryId === categoryId;
      const title = (a.title || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const keywords = Array.isArray(a.keywords) ? a.keywords.join(' ').toLowerCase() : '';
      const matchesQuery =
        title.indexOf(q) !== -1 ||
        content.indexOf(q) !== -1 ||
        keywords.indexOf(q) !== -1;
      if (!matchesQuery) return false;
      if (categoryId && a.categoryId !== categoryId) return false;
      return true;
    });

    return results.map((a) => {
      const category = categories.find((c) => c.id === a.categoryId) || null;
      return {
        articleId: a.id,
        title: a.title,
        excerpt: (a.content || '').substring(0, 200),
        categoryName: category ? category.name : '',
        // Foreign key resolution
        article: a,
        category: category
      };
    });
  }

  // getFAQArticle(articleId)
  getFAQArticle(articleId) {
    const articles = this._getFromStorage('faq_articles');
    const categories = this._getFromStorage('faq_categories');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        category: null,
        relatedArticles: []
      };
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      const key = 'task7_viewedFaqArticleIds';
      const existing = localStorage.getItem(key);
      let viewedIds = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            viewedIds = parsed;
          }
        } catch (e2) {
          // ignore parse errors and reset to empty array
          viewedIds = [];
        }
      }
      if (!viewedIds.includes(articleId)) {
        viewedIds.push(articleId);
        localStorage.setItem(key, JSON.stringify(viewedIds));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const category = categories.find((c) => c.id === article.categoryId) || null;

    const relatedArticles = articles
      .filter((a) => a.id !== articleId && a.categoryId === article.categoryId)
      .slice(0, 10)
      .map((a) => ({
        articleId: a.id,
        title: a.title
      }));

    const articleWithRelations = Object.assign({}, article, {
      category: category
    });

    return {
      article: articleWithRelations,
      category: category,
      relatedArticles: relatedArticles
    };
  }

  // submitSupportRequest(name, email, subject, message)
  submitSupportRequest(name, email, subject, message) {
    let requests = this._getFromStorage('support_requests');
    const supportRequest = {
      id: this._generateId('support'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      createdAt: this._nowIso(),
      status: 'new'
    };
    requests.push(supportRequest);
    this._saveToStorage('support_requests', requests);

    return {
      supportRequest: supportRequest,
      success: true,
      confirmationMessage: 'Your request has been submitted.'
    };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    const updateTypes = this._getFromStorage('update_type_options');
    const topics = this._getFromStorage('topic_options');

    const frequencyOptions = [
      {
        code: 'once_per_day',
        label: 'Once per day',
        description: 'Receive a single daily recap.'
      },
      {
        code: 'twice_per_day',
        label: 'Twice per day',
        description: 'Morning and evening updates.'
      },
      {
        code: 'weekly',
        label: 'Weekly',
        description: 'One email summary per week.'
      },
      {
        code: 'monthly',
        label: 'Monthly',
        description: 'Monthly newsletter round-up.'
      },
      {
        code: 'only_when_relevant',
        label: 'Only when relevant',
        description: 'Only critical updates and personalized highlights.'
      }
    ];

    return {
      updateTypes: updateTypes,
      topics: topics,
      frequencyOptions: frequencyOptions
    };
  }

  // subscribeToNewsletter(email, updateTypes, topics, frequency, consentGiven)
  subscribeToNewsletter(email, updateTypes, topics, frequency, consentGiven) {
    let subs = this._getFromStorage('newsletter_subscriptions');
    let sub = subs.find((s) => s.email === email);
    const now = this._nowIso();

    if (sub) {
      sub.updateTypes = Array.isArray(updateTypes) ? updateTypes : [];
      sub.topics = Array.isArray(topics) ? topics : [];
      sub.frequency = frequency;
      sub.consentGiven = !!consentGiven;
      sub.consentTimestamp = consentGiven ? now : sub.consentTimestamp || null;
      sub.active = !!consentGiven;
    } else {
      sub = {
        id: this._generateId('newsletter'),
        email: email,
        updateTypes: Array.isArray(updateTypes) ? updateTypes : [],
        topics: Array.isArray(topics) ? topics : [],
        frequency: frequency,
        consentGiven: !!consentGiven,
        consentTimestamp: consentGiven ? now : null,
        createdAt: now,
        active: !!consentGiven
      };
      subs.push(sub);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription: sub,
      success: true,
      message: 'Subscription updated.'
    };
  }

  // getMySchedule()
  getMySchedule() {
    const scheduleItems = this._getFromStorage('schedule_items');
    const sessions = this._getFromStorage('sessions');
    const workshops = this._getFromStorage('workshops');
    const conferenceDays = this._getFromStorage('conference_days');
    const tracks = this._getFromStorage('tracks');

    const items = scheduleItems.map((si) => {
      const content = this._getContentByType(si.contentType, si.contentId);
      if (!content) {
        return null;
      }
      const day = conferenceDays.find((d) => d.id === content.conferenceDayId) || null;
      const track = si.contentType === 'session' && content.trackId
        ? tracks.find((t) => t.id === content.trackId) || null
        : null;

      const isSession = si.contentType === 'session';
      const isWorkshop = si.contentType === 'workshop';

      const title = content.title;
      const sessionType = isSession ? content.sessionType : null;
      const level = isWorkshop ? content.level : null;
      const location = content.location || '';
      const liveStreamAvailable = !!content.liveStreamAvailable;

      const base = {
        scheduleItemId: si.id,
        contentType: si.contentType,
        contentId: si.contentId,
        title: title,
        sessionType: sessionType,
        level: level,
        conferenceDayLabel: day ? day.label : '',
        startDateTime: content.startDateTime,
        endDateTime: content.endDateTime,
        trackName: track ? track.name : '',
        location: location,
        attendanceMode: si.attendanceMode,
        interestLevel: si.interestLevel,
        reminderMinutesBefore: si.reminderMinutesBefore,
        liveStreamAvailable: liveStreamAvailable,
        // Foreign key resolution
        conferenceDay: day,
        track: track
      };

      if (isSession) {
        base.session = content;
      } else if (isWorkshop) {
        base.workshop = content;
      }

      return base;
    }).filter((x) => !!x);

    return {
      items: items
    };
  }

  // getAboutConferenceContent()
  getAboutConferenceContent() {
    const content = this._getObjectFromStorage('about_conference_content', null);
    if (content) {
      return content;
    }
    return {
      overview: '',
      audience: '',
      datesSummary: '',
      venueDetails: '',
      linksSummary: ''
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
