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

  // =================== Storage Helpers ===================

  _initStorage() {
    // Initialize all data tables in localStorage if not exist (no mock data)
    const tables = [
      'events',
      'event_registrations',
      'event_participants',
      'event_meetings',
      'team_invitations',
      'team_members',
      'communities',
      'community_memberships',
      'mentors',
      'mentor_session_requests',
      'coworking_plans',
      'coworking_trials',
      'collaboration_requests',
      'resources',
      'saved_resources',
      'resource_folders',
      'resource_folder_items',
      'programs',
      'program_applications',
      'contact_messages'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
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

  // =================== Generic Helpers ===================

  _paginateResults(items, page, page_size) {
    let p = typeof page === 'number' && page > 0 ? page : 1;
    let ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total = items.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    return {
      results: items.slice(start, end),
      total_results: total,
      page: p,
      page_size: ps
    };
  }

  _getDateOnlyString(date) {
    if (!(date instanceof Date)) return null;
    return date.toISOString().split('T')[0];
  }

  _calculateTrialEndDate(startDate) {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + 7);
    return d;
  }

  _getCurrentUserState() {
    // Single current user; just aggregate all relevant state
    const event_registrations = this._getFromStorage('event_registrations');
    const community_memberships = this._getFromStorage('community_memberships');
    const coworking_trials = this._getFromStorage('coworking_trials');
    const mentor_session_requests = this._getFromStorage('mentor_session_requests');
    const program_applications = this._getFromStorage('program_applications');
    const collaboration_requests = this._getFromStorage('collaboration_requests');
    const saved_resources = this._getFromStorage('saved_resources');

    return {
      event_registrations,
      community_memberships,
      coworking_trials,
      mentor_session_requests,
      program_applications,
      collaboration_requests,
      saved_resources
    };
  }

  _ensureEventRegistration(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { error: 'event_not_found', registration: null };
    }

    let event_registrations = this._getFromStorage('event_registrations');
    let reg = event_registrations.find(r => r.event_id === eventId) || null;

    const nowIso = new Date().toISOString();

    if (!reg) {
      reg = {
        id: this._generateId('event_reg'),
        event_id: eventId,
        registered_at: nowIso,
        status: 'registered',
        ticket_quantity: 1,
        total_price_paid: event.is_free ? 0 : (event.price || 0),
        currency: event.currency || 'usd',
        added_to_schedule: false
      };
      event_registrations.push(reg);
      this._saveToStorage('event_registrations', event_registrations);
    }

    return { error: null, registration: reg };
  }

  _limitPinnedCommunities(communityIdToPin) {
    let memberships = this._getFromStorage('community_memberships');
    const pinned = memberships.filter(m => m.is_pinned);

    const alreadyPinned = pinned.some(m => m.community_id === communityIdToPin);
    if (alreadyPinned) {
      return; // nothing to change
    }

    if (pinned.length >= 3) {
      // Unpin the oldest pinned membership (by joined_at)
      let oldest = pinned[0];
      for (let i = 1; i < pinned.length; i++) {
        const m = pinned[i];
        if (new Date(m.joined_at).getTime() < new Date(oldest.joined_at).getTime()) {
          oldest = m;
        }
      }
      memberships = memberships.map(m => {
        if (m.id === oldest.id) {
          return Object.assign({}, m, { is_pinned: false });
        }
        return m;
      });
      this._saveToStorage('community_memberships', memberships);
    }
  }

  _validateMeetingTimeWindow(eventId, start_datetime, duration_minutes) {
    const config = this.getEventMeetingSchedulerConfig(eventId);
    if (!config.has_meeting_scheduler) {
      return { valid: false, message: 'meeting_scheduler_not_available' };
    }

    const start = new Date(start_datetime);
    if (isNaN(start.getTime())) {
      return { valid: false, message: 'invalid_start_datetime' };
    }

    const duration = typeof duration_minutes === 'number' && duration_minutes > 0 ? duration_minutes : (config.default_duration_minutes || 30);
    const end = new Date(start.getTime() + duration * 60000);

    // Check within allowed window
    const minParts = (config.min_time || '10:00').split(':');
    const maxParts = (config.max_time || '16:00').split(':');
    const minDate = new Date(start.getTime());
    minDate.setUTCHours(parseInt(minParts[0], 10), parseInt(minParts[1], 10), 0, 0);
    const maxDate = new Date(start.getTime());
    maxDate.setUTCHours(parseInt(maxParts[0], 10), parseInt(maxParts[1], 10), 0, 0);

    if (start.getTime() < minDate.getTime() || end.getTime() > maxDate.getTime()) {
      return { valid: false, message: 'outside_allowed_time_window' };
    }

    // Check overlaps with existing meetings
    const event_meetings = this._getFromStorage('event_meetings');
    const meetingsForEvent = event_meetings.filter(m => m.event_id === eventId && m.status !== 'cancelled' && m.status !== 'declined');

    for (let i = 0; i < meetingsForEvent.length; i++) {
      const m = meetingsForEvent[i];
      const es = new Date(m.start_datetime);
      const ee = new Date(m.end_datetime);
      if (start.getTime() < ee.getTime() && end.getTime() > es.getTime()) {
        return { valid: false, message: 'time_slot_overlaps_existing_meeting' };
      }
    }

    return { valid: true, message: 'ok' };
  }

  _getOrCreateResourceFolderByName(name) {
    if (!name) return null;
    const trimmed = String(name).trim();
    if (!trimmed) return null;

    let folders = this._getFromStorage('resource_folders');
    const lower = trimmed.toLowerCase();

    let folder = folders.find(f => f.name && f.name.toLowerCase() === lower) || null;
    if (folder) return folder;

    const nowIso = new Date().toISOString();
    folder = {
      id: this._generateId('folder'),
      name: trimmed,
      created_at: nowIso,
      updated_at: null
    };
    folders.push(folder);
    this._saveToStorage('resource_folders', folders);
    return folder;
  }

  // =================== Core Interface Implementations ===================

  // -------- Home Page --------

  getHomePageData() {
    const events = this._getFromStorage('events');
    const communities = this._getFromStorage('communities');
    const mentors = this._getFromStorage('mentors');
    const resources = this._getFromStorage('resources');
    const programs = this._getFromStorage('programs');

    const event_registrations = this._getFromStorage('event_registrations');
    const community_memberships = this._getFromStorage('community_memberships');
    const saved_resources = this._getFromStorage('saved_resources');
    const event_meetings = this._getFromStorage('event_meetings');
    const coworking_trials = this._getFromStorage('coworking_trials');
    const mentor_session_requests = this._getFromStorage('mentor_session_requests');
    const program_applications = this._getFromStorage('program_applications');
    const collaboration_requests = this._getFromStorage('collaboration_requests');

    // Highlighted events (by popularity or soonest date)
    const highlighted_events = events
      .slice()
      .sort((a, b) => {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        if (pb !== pa) return pb - pa;
        const da = new Date(a.start_datetime || a.start_date || 0).getTime();
        const db = new Date(b.start_datetime || b.start_date || 0).getTime();
        return da - db;
      })
      .slice(0, 5);

    // Featured communities (by activity level and member_count)
    function activityWeight(level) {
      if (level === 'most_active') return 3;
      if (level === 'high') return 2;
      if (level === 'medium') return 1;
      return 0;
    }

    const featured_communities = communities
      .slice()
      .sort((a, b) => {
        const wa = activityWeight(a.activity_level);
        const wb = activityWeight(b.activity_level);
        if (wb !== wa) return wb - wa;
        const ma = a.member_count || 0;
        const mb = b.member_count || 0;
        return mb - ma;
      })
      .slice(0, 5);

    // Featured mentors (by rating)
    const featured_mentors = mentors
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        return cb - ca;
      })
      .slice(0, 5);

    // Featured resources (by popularity)
    const featured_resources = resources
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 5);

    // Featured programs (by popularity)
    const featured_programs = programs
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 5);

    const now = new Date();

    // My shortcuts
    const my_schedule_events = event_registrations
      .filter(r => r.added_to_schedule && r.status === 'registered')
      .map(r => {
        const ev = events.find(e => e.id === r.event_id) || null;
        return { event: ev, registration: r };
      })
      .filter(x => x.event !== null);

    const pinnedMemberships = community_memberships.filter(m => m.is_pinned);
    const pinned_communities = pinnedMemberships
      .map(m => communities.find(c => c.id === m.community_id) || null)
      .filter(c => c !== null);

    const upcoming_event_meetings_count = event_meetings.filter(m => {
      const start = new Date(m.start_datetime);
      return (m.status === 'requested' || m.status === 'confirmed') && start.getTime() >= now.getTime();
    }).length;

    const active_coworking_trials_count = coworking_trials.filter(t => t.status === 'active').length;

    const upcoming_mentor_sessions_count = mentor_session_requests.filter(sr => {
      const start = new Date(sr.start_datetime);
      return (sr.status === 'pending' || sr.status === 'confirmed') && start.getTime() >= now.getTime();
    }).length;

    const recent_program_applications_count = program_applications.filter(a => a.status === 'submitted' || a.status === 'in_review').length;

    const recent_collaboration_requests_count = collaboration_requests.filter(r => r.status === 'published').length;

    return {
      highlighted_events,
      featured_communities,
      featured_mentors,
      featured_resources,
      featured_programs,
      my_shortcuts: {
        upcoming_schedule: my_schedule_events,
        pinned_communities,
        saved_resources_count: saved_resources.length,
        upcoming_event_meetings_count,
        active_coworking_trials_count,
        upcoming_mentor_sessions_count,
        recent_program_applications_count,
        recent_collaboration_requests_count
      }
    };
  }

  // -------- Events & Registrations --------

  searchEvents(query, filters, sort_by, page, page_size) {
    let events = this._getFromStorage('events');

    let q = (query || '').toString().trim().toLowerCase();
    if (q) {
      events = events.filter(e => {
        const name = (e.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.date_range_start) {
        const start = new Date(filters.date_range_start);
        events = events.filter(e => {
          const d = new Date(e.start_datetime || e.start_date);
          return !isNaN(d.getTime()) && d.getTime() >= start.getTime();
        });
      }
      if (filters.date_range_end) {
        const end = new Date(filters.date_range_end);
        events = events.filter(e => {
          const d = new Date(e.start_datetime || e.start_date);
          return !isNaN(d.getTime()) && d.getTime() <= end.getTime();
        });
      }
      if (filters.event_types && Array.isArray(filters.event_types) && filters.event_types.length > 0) {
        events = events.filter(e => filters.event_types.indexOf(e.event_type) !== -1);
      }
      if (filters.topics && Array.isArray(filters.topics) && filters.topics.length > 0) {
        events = events.filter(e => {
          const primary = e.primary_topic || '';
          const topicsArr = Array.isArray(e.topics) ? e.topics : [];
          for (let i = 0; i < filters.topics.length; i++) {
            const t = filters.topics[i];
            if (primary === t) return true;
            if (topicsArr.indexOf(t) !== -1) return true;
          }
          return false;
        });
      }
      if (typeof filters.is_free === 'boolean') {
        events = events.filter(e => !!e.is_free === filters.is_free);
      }
      if (filters.format) {
        events = events.filter(e => e.format === filters.format);
      }
      if (filters.time_of_day) {
        events = events.filter(e => e.time_of_day === filters.time_of_day);
      }
      if (filters.location_city) {
        const lc = filters.location_city.toLowerCase();
        events = events.filter(e => (e.location_city || '').toLowerCase() === lc);
      }
      if (filters.location_country) {
        const lc = filters.location_country.toLowerCase();
        events = events.filter(e => (e.location_country || '').toLowerCase() === lc);
      }
    }

    if (sort_by === 'date_soonest_first') {
      events.sort((a, b) => {
        const da = new Date(a.start_datetime || a.start_date || 0).getTime();
        const db = new Date(b.start_datetime || b.start_date || 0).getTime();
        return da - db;
      });
    } else if (sort_by === 'popularity') {
      events.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort_by === 'newly_added') {
      events.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    const paginated = this._paginateResults(events, page, page_size);
    return paginated;
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;

    const event_registrations = this._getFromStorage('event_registrations');
    const registration = event_registrations.find(r => r.event_id === eventId) || null;

    const event_meetings = this._getFromStorage('event_meetings');
    const now = new Date();
    const upcoming_meetings_count = event_meetings.filter(m => {
      return m.event_id === eventId && (m.status === 'requested' || m.status === 'confirmed') && new Date(m.start_datetime).getTime() >= now.getTime();
    }).length;

    const team_invitations = this._getFromStorage('team_invitations');
    const team_members = this._getFromStorage('team_members');

    const invitations_sent_count = team_invitations.filter(i => i.event_id === eventId).length;
    const accepted_members_count = team_members.filter(tm => tm.event_id === eventId).length;

    return {
      event,
      registration,
      has_meeting_scheduler: event ? !!event.has_meeting_scheduler : false,
      has_team_builder: event ? !!event.has_team_builder : false,
      upcoming_meetings_count,
      team_summary: {
        invitations_sent_count,
        accepted_members_count
      }
    };
  }

  registerForEvent(eventId, ticket_quantity) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null, message: 'event_not_found' };
    }

    const qty = typeof ticket_quantity === 'number' && ticket_quantity > 0 ? ticket_quantity : 1;

    let event_registrations = this._getFromStorage('event_registrations');
    let registration = event_registrations.find(r => r.event_id === eventId) || null;
    const nowIso = new Date().toISOString();

    if (!registration) {
      registration = {
        id: this._generateId('event_reg'),
        event_id: eventId,
        registered_at: nowIso,
        status: 'registered',
        ticket_quantity: qty,
        total_price_paid: event.is_free ? 0 : (event.price || 0) * qty,
        currency: event.currency || 'usd',
        added_to_schedule: false
      };
      event_registrations.push(registration);
    } else {
      registration = Object.assign({}, registration, {
        registered_at: nowIso,
        status: 'registered',
        ticket_quantity: qty,
        total_price_paid: event.is_free ? 0 : (event.price || 0) * qty,
        currency: event.currency || 'usd'
      });
      event_registrations = event_registrations.map(r => (r.id === registration.id ? registration : r));
    }

    this._saveToStorage('event_registrations', event_registrations);

    return { success: true, registration, message: 'registered' };
  }

  addEventToSchedule(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null, message: 'event_not_found' };
    }

    let event_registrations = this._getFromStorage('event_registrations');
    let registration = event_registrations.find(r => r.event_id === eventId) || null;

    const nowIso = new Date().toISOString();

    if (!registration) {
      registration = {
        id: this._generateId('event_reg'),
        event_id: eventId,
        registered_at: nowIso,
        status: 'registered',
        ticket_quantity: 1,
        total_price_paid: event.is_free ? 0 : (event.price || 0),
        currency: event.currency || 'usd',
        added_to_schedule: true
      };
      event_registrations.push(registration);
    } else {
      registration = Object.assign({}, registration, {
        added_to_schedule: true,
        status: registration.status || 'registered',
        registered_at: registration.registered_at || nowIso
      });
      event_registrations = event_registrations.map(r => (r.id === registration.id ? registration : r));
    }

    this._saveToStorage('event_registrations', event_registrations);

    return { success: true, registration, message: 'added_to_schedule' };
  }

  // -------- Event Meeting Scheduler --------

  getEventMeetingSchedulerConfig(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;

    if (!event || !event.has_meeting_scheduler) {
      return {
        has_meeting_scheduler: false,
        available_dates: [],
        participant_types: [],
        min_time: '10:00',
        max_time: '16:00',
        default_duration_minutes: 30
      };
    }

    const available_dates = [];
    let startDate = null;
    let endDate = null;
    if (event.start_date && event.end_date) {
      startDate = new Date(event.start_date);
      endDate = new Date(event.end_date);
    } else if (event.start_datetime && event.end_datetime) {
      startDate = new Date(event.start_datetime);
      endDate = new Date(event.end_datetime);
    }

    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      let cur = new Date(startDate.getTime());
      cur.setHours(0, 0, 0, 0);
      const last = new Date(endDate.getTime());
      last.setHours(0, 0, 0, 0);
      while (cur.getTime() <= last.getTime()) {
        available_dates.push(this._getDateOnlyString(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    const event_participants = this._getFromStorage('event_participants');
    const participantsForEvent = event_participants.filter(p => p.event_id === eventId);
    const participant_types_set = {};
    for (let i = 0; i < participantsForEvent.length; i++) {
      const pt = participantsForEvent[i].profile_type;
      if (pt) participant_types_set[pt] = true;
    }
    const participant_types = Object.keys(participant_types_set);

    if (participant_types.length === 0) {
      participant_types.push('mentor', 'investor', 'founder', 'startup_team', 'other');
    }

    return {
      has_meeting_scheduler: true,
      available_dates,
      participant_types,
      min_time: '10:00',
      max_time: '16:00',
      default_duration_minutes: 30
    };
  }

  getEventMeetingAvailability(eventId, date) {
    const config = this.getEventMeetingSchedulerConfig(eventId);
    if (!config.has_meeting_scheduler) {
      return {
        date,
        time_slots: []
      };
    }

    const dayStr = date;
    const minParts = (config.min_time || '10:00').split(':');
    const maxParts = (config.max_time || '16:00').split(':');
    const duration = config.default_duration_minutes || 30;

    const startDay = new Date(dayStr + 'T' + (config.min_time || '10:00') + ':00Z');
    const endDay = new Date(dayStr + 'T' + (config.max_time || '16:00') + ':00Z');

    const event_meetings = this._getFromStorage('event_meetings');
    const meetingsForEvent = event_meetings.filter(m => m.event_id === eventId && m.status !== 'cancelled' && m.status !== 'declined');

    const slots = [];
    let cursor = new Date(startDay.getTime());
    while (cursor.getTime() < endDay.getTime()) {
      const slotStart = new Date(cursor.getTime());
      const slotEnd = new Date(cursor.getTime() + duration * 60000);
      if (slotEnd.getTime() > endDay.getTime()) break;

      let is_available = true;
      for (let i = 0; i < meetingsForEvent.length; i++) {
        const m = meetingsForEvent[i];
        const ms = new Date(m.start_datetime);
        const me = new Date(m.end_datetime);
        const mDateOnly = this._getDateOnlyString(ms);
        if (mDateOnly !== dayStr) continue;
        if (slotStart.getTime() < me.getTime() && slotEnd.getTime() > ms.getTime()) {
          is_available = false;
          break;
        }
      }

      slots.push({
        start_datetime: slotStart.toISOString(),
        end_datetime: slotEnd.toISOString(),
        is_available
      });

      cursor = new Date(cursor.getTime() + duration * 60000);
    }

    return {
      date: dayStr,
      time_slots: slots
    };
  }

  listEventParticipantsForMeetings(eventId, filters, sort_by) {
    let participants = this._getFromStorage('event_participants').filter(p => p.event_id === eventId);

    if (filters && typeof filters === 'object') {
      if (filters.participant_type) {
        participants = participants.filter(p => p.profile_type === filters.participant_type);
      }
      if (filters.location_city) {
        const lc = filters.location_city.toLowerCase();
        participants = participants.filter(p => (p.location_city || '').toLowerCase() === lc);
      }
      if (typeof filters.is_available_for_meetings === 'boolean') {
        participants = participants.filter(p => !!p.is_available_for_meetings === filters.is_available_for_meetings);
      }
    }

    if (sort_by === 'name') {
      participants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort_by === 'profile_type') {
      participants.sort((a, b) => (a.profile_type || '').localeCompare(b.profile_type || ''));
    }

    return participants;
  }

  createEventMeetingRequest(eventId, participantId, participant_type, start_datetime, duration_minutes, agenda) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, meeting: null, message: 'event_not_found' };
    }

    const event_participants = this._getFromStorage('event_participants');
    const participant = event_participants.find(p => p.id === participantId && p.event_id === eventId) || null;
    if (!participant) {
      return { success: false, meeting: null, message: 'participant_not_found' };
    }

    if (participant_type && participant.profile_type && participant.profile_type !== participant_type) {
      // Allow slight mismatch, but we can still proceed; no hard fail
    }

    const agendaText = (agenda || '').toString().trim();
    if (agendaText.length < 30) {
      return { success: false, meeting: null, message: 'agenda_too_short' };
    }

    const validation = this._validateMeetingTimeWindow(eventId, start_datetime, duration_minutes || 30);
    if (!validation.valid) {
      return { success: false, meeting: null, message: validation.message };
    }

    const start = new Date(start_datetime);
    const dur = typeof duration_minutes === 'number' && duration_minutes > 0 ? duration_minutes : 30;
    const end = new Date(start.getTime() + dur * 60000);
    const meetingDate = new Date(start.getTime());
    meetingDate.setHours(0, 0, 0, 0);

    let event_meetings = this._getFromStorage('event_meetings');

    const meeting = {
      id: this._generateId('event_meeting'),
      event_id: eventId,
      participant_id: participantId,
      participant_type: participant_type || participant.profile_type || 'other',
      meeting_date: meetingDate.toISOString(),
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_minutes: dur,
      agenda: agendaText,
      status: 'requested',
      created_at: new Date().toISOString()
    };

    event_meetings.push(meeting);
    this._saveToStorage('event_meetings', event_meetings);

    // Foreign key resolution
    const enrichedMeeting = Object.assign({}, meeting, {
      event,
      participant
    });

    return { success: true, meeting: enrichedMeeting, message: 'meeting_requested' };
  }

  getEventMeetingsForCurrentUser(eventId) {
    const event_meetings = this._getFromStorage('event_meetings');
    const events = this._getFromStorage('events');
    const participants = this._getFromStorage('event_participants');

    const meetings = event_meetings.filter(m => m.event_id === eventId);

    return meetings.map(m => {
      const ev = events.find(e => e.id === m.event_id) || null;
      const participant = participants.find(p => p.id === m.participant_id) || null;
      return Object.assign({}, m, { event: ev, participant });
    });
  }

  // -------- Team Builder (Hackathons) --------

  listEventParticipantsForTeamBuilder(eventId, filters) {
    let participants = this._getFromStorage('event_participants').filter(p => p.event_id === eventId);

    if (filters && typeof filters === 'object') {
      if (filters.location_city) {
        const lc = filters.location_city.toLowerCase();
        participants = participants.filter(p => (p.location_city || '').toLowerCase() === lc);
      }
      if (filters.primary_role) {
        participants = participants.filter(p => p.primary_role === filters.primary_role);
      }
      if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
        participants = participants.filter(p => {
          const skills = Array.isArray(p.skills) ? p.skills : [];
          for (let i = 0; i < filters.skills.length; i++) {
            if (skills.indexOf(filters.skills[i]) !== -1) return true;
          }
          return false;
        });
      }
      if (typeof filters.is_available_for_teams === 'boolean') {
        participants = participants.filter(p => !!p.is_available_for_teams === filters.is_available_for_teams);
      }
    }

    return participants;
  }

  sendTeamInvitation(eventId, participantId, role, message) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, invitation: null, message: 'event_not_found' };
    }

    const participants = this._getFromStorage('event_participants');
    const participant = participants.find(p => p.id === participantId && p.event_id === eventId) || null;
    if (!participant) {
      return { success: false, invitation: null, message: 'participant_not_found' };
    }

    const validRoles = ['developer', 'designer', 'business_strategy'];
    if (validRoles.indexOf(role) === -1) {
      return { success: false, invitation: null, message: 'invalid_role' };
    }

    let team_invitations = this._getFromStorage('team_invitations');
    const nowIso = new Date().toISOString();

    const invitation = {
      id: this._generateId('team_invite'),
      event_id: eventId,
      participant_id: participantId,
      role,
      message: message || '',
      status: 'pending',
      sent_at: nowIso,
      responded_at: null
    };

    team_invitations.push(invitation);
    this._saveToStorage('team_invitations', team_invitations);

    const enrichedInvitation = Object.assign({}, invitation, { event, participant });

    return { success: true, invitation: enrichedInvitation, message: 'invitation_sent' };
  }

  getTeamInvitationsAndMembers(eventId) {
    const team_invitations = this._getFromStorage('team_invitations').filter(i => i.event_id === eventId);
    const team_members = this._getFromStorage('team_members').filter(tm => tm.event_id === eventId);
    const events = this._getFromStorage('events');
    const participants = this._getFromStorage('event_participants');

    const event = events.find(e => e.id === eventId) || null;

    const invitationsEnriched = team_invitations.map(i => {
      const participant = participants.find(p => p.id === i.participant_id) || null;
      return Object.assign({}, i, { event, participant });
    });

    const membersEnriched = team_members.map(tm => {
      const participant = participants.find(p => p.id === tm.participant_id) || null;
      return Object.assign({}, tm, { event, participant });
    });

    return {
      invitations: invitationsEnriched,
      team_members: membersEnriched
    };
  }

  // -------- Communities --------

  searchCommunities(filters, sort_by, page, page_size) {
    let communities = this._getFromStorage('communities');

    if (filters && typeof filters === 'object') {
      if (typeof filters.min_rating === 'number') {
        communities = communities.filter(c => (c.rating || 0) >= filters.min_rating);
      }
      if (typeof filters.min_member_count === 'number') {
        communities = communities.filter(c => (c.member_count || 0) >= filters.min_member_count);
      }
      if (filters.topics && Array.isArray(filters.topics) && filters.topics.length > 0) {
        communities = communities.filter(c => {
          const primary = c.primary_topic || '';
          const topicsArr = Array.isArray(c.topics) ? c.topics : [];
          const focus = Array.isArray(c.focus_areas) ? c.focus_areas : [];
          for (let i = 0; i < filters.topics.length; i++) {
            const t = filters.topics[i];
            if (primary === t) return true;
            if (topicsArr.indexOf(t) !== -1) return true;
            if (focus.indexOf(t) !== -1) return true;
          }
          return false;
        });
      }
    }

    if (sort_by === 'most_active') {
      function activityWeight(level) {
        if (level === 'most_active') return 3;
        if (level === 'high') return 2;
        if (level === 'medium') return 1;
        return 0;
      }
      communities.sort((a, b) => {
        const wa = activityWeight(a.activity_level);
        const wb = activityWeight(b.activity_level);
        if (wb !== wa) return wb - wa;
        const ma = a.member_count || 0;
        const mb = b.member_count || 0;
        return mb - ma;
      });
    } else if (sort_by === 'member_count_high_to_low') {
      communities.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else if (sort_by === 'highest_rated') {
      communities.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const paginated = this._paginateResults(communities, page, page_size);
    return paginated;
  }

  getCommunityDetail(communityId) {
    const communities = this._getFromStorage('communities');
    const community = communities.find(c => c.id === communityId) || null;

    const memberships = this._getFromStorage('community_memberships');
    const membership = memberships.find(m => m.community_id === communityId) || null;

    return {
      community,
      membership,
      is_member: !!membership
    };
  }

  joinCommunity(communityId) {
    const communities = this._getFromStorage('communities');
    const community = communities.find(c => c.id === communityId) || null;
    if (!community) {
      return { success: false, membership: null, message: 'community_not_found' };
    }

    let memberships = this._getFromStorage('community_memberships');
    let membership = memberships.find(m => m.community_id === communityId) || null;

    if (membership) {
      return { success: true, membership, message: 'already_member' };
    }

    const nowIso = new Date().toISOString();
    membership = {
      id: this._generateId('community_member'),
      community_id: communityId,
      joined_at: nowIso,
      is_pinned: false,
      notification_frequency: 'weekly'
    };

    memberships.push(membership);
    this._saveToStorage('community_memberships', memberships);

    return { success: true, membership, message: 'joined' };
  }

  leaveCommunity(communityId) {
    let memberships = this._getFromStorage('community_memberships');
    const before = memberships.length;
    memberships = memberships.filter(m => m.community_id !== communityId);
    this._saveToStorage('community_memberships', memberships);

    if (memberships.length === before) {
      return { success: false, message: 'membership_not_found' };
    }

    return { success: true, message: 'left_community' };
  }

  updateCommunityMembershipSettings(communityId, notification_frequency, is_pinned) {
    let memberships = this._getFromStorage('community_memberships');
    let membership = memberships.find(m => m.community_id === communityId) || null;
    if (!membership) {
      return { success: false, membership: null, message: 'membership_not_found' };
    }

    if (typeof is_pinned === 'boolean' && is_pinned) {
      this._limitPinnedCommunities(communityId);
    }

    const updated = Object.assign({}, membership);
    if (typeof notification_frequency === 'string') {
      updated.notification_frequency = notification_frequency;
    }
    if (typeof is_pinned === 'boolean') {
      updated.is_pinned = is_pinned;
    }

    memberships = memberships.map(m => (m.id === membership.id ? updated : m));
    this._saveToStorage('community_memberships', memberships);

    return { success: true, membership: updated, message: 'membership_updated' };
  }

  // -------- Mentors --------

  searchMentors(filters, sort_by, page, page_size) {
    let mentors = this._getFromStorage('mentors');

    if (filters && typeof filters === 'object') {
      if (filters.primary_expertise && Array.isArray(filters.primary_expertise) && filters.primary_expertise.length > 0) {
        mentors = mentors.filter(m => filters.primary_expertise.indexOf(m.primary_expertise) !== -1);
      }
      if (typeof filters.min_years_of_experience === 'number') {
        mentors = mentors.filter(m => (m.years_of_experience || 0) >= filters.min_years_of_experience);
      }
      if (typeof filters.min_rating === 'number') {
        mentors = mentors.filter(m => (m.rating || 0) >= filters.min_rating);
      }
      if (typeof filters.max_hourly_rate === 'number') {
        mentors = mentors.filter(m => (m.hourly_rate || 0) <= filters.max_hourly_rate);
      }
      if (filters.location_city) {
        const lc = filters.location_city.toLowerCase();
        mentors = mentors.filter(m => (m.location_city || '').toLowerCase() === lc);
      }
      if (filters.location_country) {
        const lc = filters.location_country.toLowerCase();
        mentors = mentors.filter(m => (m.location_country || '').toLowerCase() === lc);
      }
    }

    if (sort_by === 'rating_high_to_low') {
      mentors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'price_low_to_high') {
      mentors.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
    } else if (sort_by === 'relevance') {
      mentors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const paginated = this._paginateResults(mentors, page, page_size);
    return paginated;
  }

  getMentorDetail(mentorId) {
    const mentors = this._getFromStorage('mentors');
    return mentors.find(m => m.id === mentorId) || null;
  }

  requestMentorSession(mentorId, session_date, start_datetime, duration_minutes, goal_description) {
    const mentors = this._getFromStorage('mentors');
    const mentor = mentors.find(m => m.id === mentorId) || null;
    if (!mentor) {
      return { success: false, session_request: null, message: 'mentor_not_found' };
    }

    const goal = (goal_description || '').toString().trim();
    if (goal.length < 50) {
      return { success: false, session_request: null, message: 'goal_description_too_short' };
    }

    const sessionDateObj = new Date(session_date);
    if (isNaN(sessionDateObj.getTime())) {
      return { success: false, session_request: null, message: 'invalid_session_date' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today.getTime());
    minDate.setDate(minDate.getDate() + 3);
    if (sessionDateObj.getTime() < minDate.getTime()) {
      return { success: false, session_request: null, message: 'session_date_must_be_at_least_3_days_from_today' };
    }

    const start = new Date(start_datetime);
    if (isNaN(start.getTime())) {
      return { success: false, session_request: null, message: 'invalid_start_datetime' };
    }

    const sessionDateStr = this._getDateOnlyString(sessionDateObj);
    const startDateStr = this._getDateOnlyString(start);
    if (sessionDateStr !== startDateStr) {
      return { success: false, session_request: null, message: 'session_date_and_start_datetime_mismatch' };
    }

    const hour = start.getHours();
    const minute = start.getMinutes();
    const startMinutes = hour * 60 + minute;
    const earliest = 10 * 60;
    const latest = 16 * 60;

    const dur = typeof duration_minutes === 'number' && duration_minutes > 0 ? duration_minutes : 60;
    const endMinutes = startMinutes + dur;

    if (startMinutes < earliest || endMinutes > latest) {
      return { success: false, session_request: null, message: 'start_time_must_be_between_10_00_and_16_00' };
    }

    const end = new Date(start.getTime() + dur * 60000);

    let mentor_session_requests = this._getFromStorage('mentor_session_requests');

    const hourly = mentor.hourly_rate || 0;
    const total = (hourly * dur) / 60;

    const session_request = {
      id: this._generateId('mentor_session'),
      mentor_id: mentorId,
      requested_at: new Date().toISOString(),
      status: 'pending',
      session_date: sessionDateObj.toISOString(),
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_minutes: dur,
      hourly_rate: hourly,
      total_price: total,
      currency: mentor.currency || 'usd',
      goal_description: goal
    };

    mentor_session_requests.push(session_request);
    this._saveToStorage('mentor_session_requests', mentor_session_requests);

    const enriched = Object.assign({}, session_request, { mentor });

    return { success: true, session_request: enriched, message: 'session_requested' };
  }

  // -------- Coworking Plans --------

  searchCoworkingPlans(filters, sort_by, page, page_size) {
    let plans = this._getFromStorage('coworking_plans');

    if (filters && typeof filters === 'object') {
      if (typeof filters.max_price_per_month === 'number') {
        plans = plans.filter(p => (p.price_per_month || 0) <= filters.max_price_per_month);
      }
      if (typeof filters.has_meeting_room_access === 'boolean') {
        plans = plans.filter(p => !!p.has_meeting_room_access === filters.has_meeting_room_access);
      }
      if (typeof filters.min_meeting_room_hours_per_month === 'number') {
        plans = plans.filter(p => (p.included_meeting_room_hours_per_month || 0) >= filters.min_meeting_room_hours_per_month);
      }
      if (filters.access_hours) {
        plans = plans.filter(p => p.access_hours === filters.access_hours);
      }
      if (filters.workspace_type) {
        plans = plans.filter(p => p.workspace_type === filters.workspace_type);
      }
      if (filters.location_city) {
        const lc = filters.location_city.toLowerCase();
        plans = plans.filter(p => (p.location_city || '').toLowerCase() === lc);
      }
      if (filters.location_country) {
        const lc = filters.location_country.toLowerCase();
        plans = plans.filter(p => (p.location_country || '').toLowerCase() === lc);
      }
    }

    if (sort_by === 'price_low_to_high') {
      plans.sort((a, b) => (a.price_per_month || 0) - (b.price_per_month || 0));
    } else if (sort_by === 'meeting_room_hours_high_to_low') {
      plans.sort((a, b) => (b.included_meeting_room_hours_per_month || 0) - (a.included_meeting_room_hours_per_month || 0));
    } else if (sort_by === 'popularity') {
      plans.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const paginated = this._paginateResults(plans, page, page_size);
    return paginated;
  }

  getCoworkingPlanDetail(coworkingPlanId) {
    const plans = this._getFromStorage('coworking_plans');
    return plans.find(p => p.id === coworkingPlanId) || null;
  }

  startCoworkingTrial(coworkingPlanId, company_name, team_size, intended_start_date) {
    const plans = this._getFromStorage('coworking_plans');
    const plan = plans.find(p => p.id === coworkingPlanId) || null;
    if (!plan) {
      return { success: false, trial: null, message: 'plan_not_found' };
    }

    let coworking_trials = this._getFromStorage('coworking_trials');

    const now = new Date();
    const endDate = this._calculateTrialEndDate(now);

    const trial = {
      id: this._generateId('coworking_trial'),
      coworking_plan_id: coworkingPlanId,
      company_name: company_name || '',
      team_size: typeof team_size === 'number' ? team_size : null,
      intended_start_date: intended_start_date ? new Date(intended_start_date).toISOString() : null,
      started_at: now.toISOString(),
      ends_at: endDate.toISOString(),
      status: 'active',
      confirmed: true
    };

    coworking_trials.push(trial);
    this._saveToStorage('coworking_trials', coworking_trials);

    const enriched = Object.assign({}, trial, { plan });

    return { success: true, trial: enriched, message: 'trial_started' };
  }

  // -------- Collaboration Requests (Marketplace) --------

  searchCollaborationRequests(filters, sort_by, page, page_size) {
    let requests = this._getFromStorage('collaboration_requests');

    if (filters && typeof filters === 'object') {
      if (filters.category_or_role_type) {
        requests = requests.filter(r => r.category_or_role_type === filters.category_or_role_type);
      }
      if (filters.skills_tags && Array.isArray(filters.skills_tags) && filters.skills_tags.length > 0) {
        requests = requests.filter(r => {
          const tags = Array.isArray(r.skills_tags) ? r.skills_tags : [];
          for (let i = 0; i < filters.skills_tags.length; i++) {
            if (tags.indexOf(filters.skills_tags[i]) !== -1) return true;
          }
          return false;
        });
      }
      if (filters.industry) {
        const ind = filters.industry.toLowerCase();
        requests = requests.filter(r => (r.industry || '').toLowerCase() === ind);
      }
      if (typeof filters.min_budget === 'number') {
        requests = requests.filter(r => (r.budget_max || 0) >= filters.min_budget);
      }
      if (typeof filters.max_budget === 'number') {
        requests = requests.filter(r => (r.budget_min || 0) <= filters.max_budget);
      }
      if (filters.duration) {
        requests = requests.filter(r => r.duration === filters.duration);
      }
      if (filters.status) {
        requests = requests.filter(r => r.status === filters.status);
      }
    }

    if (sort_by === 'newest') {
      requests.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sort_by === 'budget_high_to_low') {
      requests.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0));
    } else if (sort_by === 'relevance') {
      requests.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    const paginated = this._paginateResults(requests, page, page_size);
    return paginated;
  }

  createCollaborationRequest(
    title,
    category_or_role_type,
    description,
    time_commitment_min_hours_per_week,
    time_commitment_max_hours_per_week,
    time_commitment_text,
    budget_min,
    budget_max,
    currency,
    skills_tags,
    duration,
    industry,
    project_stage
  ) {
    const titleText = (title || '').toString().trim();
    if (!titleText) {
      return { success: false, request: null, message: 'title_required' };
    }

    if (!category_or_role_type) {
      return { success: false, request: null, message: 'category_or_role_type_required' };
    }

    const desc = (description || '').toString().trim();
    if (desc.length < 100) {
      return { success: false, request: null, message: 'description_too_short' };
    }

    const lowerDesc = desc.toLowerCase();
    if (lowerDesc.indexOf('ai') === -1 || lowerDesc.indexOf('user research') === -1 || lowerDesc.indexOf('wireframing') === -1) {
      return { success: false, request: null, message: 'description_must_mention_ai_user_research_and_wireframing' };
    }

    if (typeof budget_min !== 'number' || typeof budget_max !== 'number' || budget_min > budget_max) {
      return { success: false, request: null, message: 'invalid_budget_range' };
    }

    let collaboration_requests = this._getFromStorage('collaboration_requests');
    const nowIso = new Date().toISOString();

    const request = {
      id: this._generateId('collab_req'),
      title: titleText,
      category_or_role_type,
      description: desc,
      time_commitment_min_hours_per_week: typeof time_commitment_min_hours_per_week === 'number' ? time_commitment_min_hours_per_week : null,
      time_commitment_max_hours_per_week: typeof time_commitment_max_hours_per_week === 'number' ? time_commitment_max_hours_per_week : null,
      time_commitment_text: time_commitment_text || null,
      budget_min,
      budget_max,
      currency: currency || 'usd',
      skills_tags: Array.isArray(skills_tags) ? skills_tags : [],
      duration: duration || null,
      industry: industry || null,
      project_stage: project_stage || null,
      status: 'published',
      created_at: nowIso,
      updated_at: nowIso
    };

    collaboration_requests.push(request);
    this._saveToStorage('collaboration_requests', collaboration_requests);

    return { success: true, request, message: 'collaboration_request_created' };
  }

  getMyCollaborationRequests() {
    // Single current user; return all created collaboration requests
    return this._getFromStorage('collaboration_requests');
  }

  // -------- Resources & Saved Resources --------

  searchResources(query, filters, sort_by, page, page_size) {
    let resources = this._getFromStorage('resources');

    const q = (query || '').toString().trim().toLowerCase();
    if (q) {
      resources = resources.filter(r => {
        const t = (r.title || '').toLowerCase();
        const d = (r.description || '').toLowerCase();
        return t.indexOf(q) !== -1 || d.indexOf(q) !== -1;
      });
    }

    if (filters && typeof filters === 'object') {
      if (typeof filters.min_rating === 'number') {
        resources = resources.filter(r => (r.rating || 0) >= filters.min_rating);
      }
      if (typeof filters.max_duration_minutes === 'number') {
        resources = resources.filter(r => (r.estimated_duration_minutes || 0) <= filters.max_duration_minutes);
      }
      if (filters.topic) {
        const topic = filters.topic;
        resources = resources.filter(r => {
          const primary = r.primary_topic || '';
          const topicsArr = Array.isArray(r.topics) ? r.topics : [];
          if (primary === topic) return true;
          if (topicsArr.indexOf(topic) !== -1) return true;
          return false;
        });
      }
      if (filters.content_types && Array.isArray(filters.content_types) && filters.content_types.length > 0) {
        resources = resources.filter(r => filters.content_types.indexOf(r.content_type) !== -1);
      }
    }

    if (sort_by === 'most_popular') {
      resources.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort_by === 'highest_rated') {
      resources.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'newest') {
      resources.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    const paginated = this._paginateResults(resources, page, page_size);
    return paginated;
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.id === resourceId) || null;

    const saved_resources = this._getFromStorage('saved_resources');
    const is_saved = saved_resources.some(sr => sr.resource_id === resourceId);

    const folder_items = this._getFromStorage('resource_folder_items');
    const resource_folders = this._getFromStorage('resource_folders');

    const foldersForResource = folder_items
      .filter(fi => fi.resource_id === resourceId)
      .map(fi => resource_folders.find(f => f.id === fi.folder_id) || null)
      .filter(f => f !== null);

    return {
      resource,
      is_saved,
      assigned_folders: foldersForResource
    };
  }

  saveResource(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return { success: false, saved_resource: null, message: 'resource_not_found' };
    }

    let saved_resources = this._getFromStorage('saved_resources');
    let saved = saved_resources.find(sr => sr.resource_id === resourceId) || null;
    if (saved) {
      const enriched = Object.assign({}, saved, { resource });
      return { success: true, saved_resource: enriched, message: 'already_saved' };
    }

    const saved_resource = {
      id: this._generateId('saved_resource'),
      resource_id: resourceId,
      saved_at: new Date().toISOString()
    };

    saved_resources.push(saved_resource);
    this._saveToStorage('saved_resources', saved_resources);

    const enrichedSaved = Object.assign({}, saved_resource, { resource });

    return { success: true, saved_resource: enrichedSaved, message: 'resource_saved' };
  }

  unsaveResource(resourceId) {
    let saved_resources = this._getFromStorage('saved_resources');
    const before = saved_resources.length;
    saved_resources = saved_resources.filter(sr => sr.resource_id !== resourceId);
    this._saveToStorage('saved_resources', saved_resources);

    // Also remove from any folders
    let folder_items = this._getFromStorage('resource_folder_items');
    folder_items = folder_items.filter(fi => fi.resource_id !== resourceId);
    this._saveToStorage('resource_folder_items', folder_items);

    if (before === saved_resources.length) {
      return { success: false, message: 'resource_not_saved' };
    }

    return { success: true, message: 'resource_unsaved' };
  }

  getSavedResourcesAndFolders() {
    const saved_resources_raw = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('resources');
    const folders = this._getFromStorage('resource_folders');
    const folder_items_raw = this._getFromStorage('resource_folder_items');

    const saved_resources = saved_resources_raw.map(sr => {
      const resource = resources.find(r => r.id === sr.resource_id) || null;
      return Object.assign({}, sr, { resource });
    });

    const folder_items = folder_items_raw.map(fi => {
      const resource = resources.find(r => r.id === fi.resource_id) || null;
      const folder = folders.find(f => f.id === fi.folder_id) || null;
      return Object.assign({}, fi, { resource, folder });
    });

    return {
      saved_resources,
      resources,
      folders,
      folder_items
    };
  }

  createResourceFolder(name) {
    const folder = this._getOrCreateResourceFolderByName(name);
    if (!folder) {
      return { success: false, folder: null, message: 'invalid_folder_name' };
    }
    return { success: true, folder, message: 'folder_created_or_existing' };
  }

  renameResourceFolder(folderId, new_name) {
    const newName = (new_name || '').toString().trim();
    if (!newName) {
      return { success: false, folder: null, message: 'invalid_new_name' };
    }

    let folders = this._getFromStorage('resource_folders');
    let folder = folders.find(f => f.id === folderId) || null;
    if (!folder) {
      return { success: false, folder: null, message: 'folder_not_found' };
    }

    const updated = Object.assign({}, folder, {
      name: newName,
      updated_at: new Date().toISOString()
    });

    folders = folders.map(f => (f.id === folderId ? updated : f));
    this._saveToStorage('resource_folders', folders);

    return { success: true, folder: updated, message: 'folder_renamed' };
  }

  assignResourceToFolder(resourceId, folderId) {
    const resources = this._getFromStorage('resources');
    const folders = this._getFromStorage('resource_folders');
    const resource = resources.find(r => r.id === resourceId) || null;
    const folder = folders.find(f => f.id === folderId) || null;

    if (!resource) {
      return { success: false, folder_item: null, message: 'resource_not_found' };
    }
    if (!folder) {
      return { success: false, folder_item: null, message: 'folder_not_found' };
    }

    // Ensure resource is saved
    let saved_resources = this._getFromStorage('saved_resources');
    let saved = saved_resources.find(sr => sr.resource_id === resourceId) || null;
    if (!saved) {
      saved = {
        id: this._generateId('saved_resource'),
        resource_id: resourceId,
        saved_at: new Date().toISOString()
      };
      saved_resources.push(saved);
      this._saveToStorage('saved_resources', saved_resources);
    }

    let folder_items = this._getFromStorage('resource_folder_items');
    let existing = folder_items.find(fi => fi.folder_id === folderId && fi.resource_id === resourceId) || null;

    if (existing) {
      const enrichedExisting = Object.assign({}, existing, { resource, folder });
      return { success: true, folder_item: enrichedExisting, message: 'already_assigned' };
    }

    const folder_item = {
      id: this._generateId('folder_item'),
      folder_id: folderId,
      resource_id: resourceId,
      added_at: new Date().toISOString()
    };

    folder_items.push(folder_item);
    this._saveToStorage('resource_folder_items', folder_items);

    const enriched = Object.assign({}, folder_item, { resource, folder });

    return { success: true, folder_item: enriched, message: 'resource_assigned_to_folder' };
  }

  removeResourceFromFolder(resourceId, folderId) {
    let folder_items = this._getFromStorage('resource_folder_items');
    const before = folder_items.length;
    folder_items = folder_items.filter(fi => !(fi.folder_id === folderId && fi.resource_id === resourceId));
    this._saveToStorage('resource_folder_items', folder_items);

    if (before === folder_items.length) {
      return { success: false, message: 'assignment_not_found' };
    }

    return { success: true, message: 'resource_removed_from_folder' };
  }

  // -------- Programs & Applications --------

  searchPrograms(filters, sort_by, page, page_size) {
    let programs = this._getFromStorage('programs');

    if (filters && typeof filters === 'object') {
      if (filters.region) {
        programs = programs.filter(p => p.region === filters.region);
      }
      if (filters.stage && Array.isArray(filters.stage) && filters.stage.length > 0) {
        programs = programs.filter(p => filters.stage.indexOf(p.stage) !== -1);
      }
      if (typeof filters.max_duration_months === 'number') {
        programs = programs.filter(p => (p.duration_months || 0) <= filters.max_duration_months);
      }
      if (typeof filters.max_equity_taken_percent === 'number') {
        programs = programs.filter(p => (p.equity_taken_percent || 0) <= filters.max_equity_taken_percent);
      }
    }

    if (sort_by === 'application_deadline_soonest_first') {
      programs.sort((a, b) => new Date(a.application_deadline || 0).getTime() - new Date(b.application_deadline || 0).getTime());
    } else if (sort_by === 'newest') {
      programs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sort_by === 'most_popular') {
      programs.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const paginated = this._paginateResults(programs, page, page_size);
    return paginated;
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(p => p.id === programId) || null;

    const applications = this._getFromStorage('program_applications');
    const user_application = applications.find(a => a.program_id === programId) || null;

    if (user_application) {
      user_application.program = program;
    }

    return {
      program,
      user_application
    };
  }

  submitProgramApplication(programId, startup_name, one_sentence_pitch, industry, team_size, other_answers) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return { success: false, application: null, message: 'program_not_found' };
    }

    const startupName = (startup_name || '').toString().trim();
    const pitch = (one_sentence_pitch || '').toString().trim();
    const industryText = (industry || '').toString().trim();

    if (!startupName || !pitch || !industryText || typeof team_size !== 'number' || team_size <= 0) {
      return { success: false, application: null, message: 'invalid_application_fields' };
    }

    let applications = this._getFromStorage('program_applications');
    const nowIso = new Date().toISOString();

    const application = {
      id: this._generateId('program_app'),
      program_id: programId,
      startup_name: startupName,
      one_sentence_pitch: pitch,
      industry: industryText,
      team_size,
      other_answers: other_answers || null,
      status: 'submitted',
      submitted_at: nowIso,
      last_updated_at: nowIso
    };

    applications.push(application);
    this._saveToStorage('program_applications', applications);

    const enriched = Object.assign({}, application, { program });

    return { success: true, application: enriched, message: 'application_submitted' };
  }

  getMyProgramApplications() {
    const applications = this._getFromStorage('program_applications');
    const programs = this._getFromStorage('programs');

    return applications.map(a => {
      const program = programs.find(p => p.id === a.program_id) || null;
      return Object.assign({}, a, { program });
    });
  }

  // -------- My Hub Overview & Schedule --------

  getMyHubOverview() {
    const events = this._getFromStorage('events');
    const event_registrations = this._getFromStorage('event_registrations');
    const event_meetings_raw = this._getFromStorage('event_meetings');
    const participants = this._getFromStorage('event_participants');

    const communities = this._getFromStorage('communities');
    const community_memberships = this._getFromStorage('community_memberships');

    const coworking_plans = this._getFromStorage('coworking_plans');
    const coworking_trials_raw = this._getFromStorage('coworking_trials');

    const mentors = this._getFromStorage('mentors');
    const mentor_session_requests_raw = this._getFromStorage('mentor_session_requests');

    const programs = this._getFromStorage('programs');
    const program_applications_raw = this._getFromStorage('program_applications');

    const collaboration_requests = this._getFromStorage('collaboration_requests');

    const saved_resources = this._getFromStorage('saved_resources');

    const my_schedule_events = event_registrations
      .filter(r => r.status === 'registered')
      .map(r => {
        const ev = events.find(e => e.id === r.event_id) || null;
        return { event: ev, registration: r };
      })
      .filter(x => x.event !== null);

    const now = new Date();

    const upcoming_event_meetings = event_meetings_raw
      .filter(m => (m.status === 'requested' || m.status === 'confirmed') && new Date(m.start_datetime).getTime() >= now.getTime())
      .map(m => {
        const ev = events.find(e => e.id === m.event_id) || null;
        const participant = participants.find(p => p.id === m.participant_id) || null;
        return Object.assign({}, m, { event: ev, participant });
      });

    const joined_communities = community_memberships.map(m => {
      const community = communities.find(c => c.id === m.community_id) || null;
      return { community, membership: m };
    }).filter(x => x.community !== null);

    const active_coworking_trials = coworking_trials_raw
      .filter(t => t.status === 'active')
      .map(t => {
        const plan = coworking_plans.find(p => p.id === t.coworking_plan_id) || null;
        return { plan, trial: t };
      })
      .filter(x => x.plan !== null);

    const mentor_session_requests = mentor_session_requests_raw.map(sr => {
      const mentor = mentors.find(m => m.id === sr.mentor_id) || null;
      return { mentor, session_request: sr };
    }).filter(x => x.mentor !== null);

    const program_applications = program_applications_raw.map(a => {
      const program = programs.find(p => p.id === a.program_id) || null;
      return { program, application: a };
    }).filter(x => x.program !== null);

    return {
      my_schedule_events,
      upcoming_event_meetings,
      joined_communities,
      active_coworking_trials,
      mentor_session_requests,
      program_applications,
      collaboration_requests,
      saved_resources_count: saved_resources.length
    };
  }

  getMySchedule() {
    const events = this._getFromStorage('events');
    const event_registrations = this._getFromStorage('event_registrations');

    const schedule = event_registrations.map(r => {
      const event = events.find(e => e.id === r.event_id) || null;
      return { event, registration: r };
    }).filter(x => x.event !== null);

    return schedule;
  }

  // -------- Event: Innovation Week Meeting Scheduling --------

  // (Meeting-related methods already implemented above)

  // -------- Contact Messages --------

  sendContactMessage(name, email, topic, message) {
    const msg = (message || '').toString().trim();
    if (!msg) {
      return { success: false, contact_message: null, message: 'message_required' };
    }

    let contact_messages = this._getFromStorage('contact_messages');

    const contact_message = {
      id: this._generateId('contact_msg'),
      name: name || null,
      email: email || null,
      topic: topic || null,
      message: msg,
      created_at: new Date().toISOString(),
      resolved: false,
      resolution_notes: null
    };

    contact_messages.push(contact_message);
    this._saveToStorage('contact_messages', contact_messages);

    return { success: true, contact_message, message: 'contact_message_sent' };
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
