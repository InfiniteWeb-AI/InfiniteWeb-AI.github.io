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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keys = [
      'events',
      'event_registrations',
      'resources',
      'saved_resources',
      'programs',
      'learning_plans',
      'learning_plan_items',
      'discussion_groups',
      'discussion_threads',
      'group_memberships',
      'grants',
      'saved_grants',
      'mentors',
      'mentor_availability_slots',
      'mentor_sessions',
      'conference_sessions',
      'conference_agendas',
      'conference_agenda_items',
      'support_requests'
    ];

    for (let k of keys) {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify([]));
      }
    }

    // Single-object storages
    if (!localStorage.getItem('profile_settings')) {
      localStorage.setItem('profile_settings', 'null');
    }
    if (!localStorage.getItem('organization_info')) {
      localStorage.setItem('organization_info', 'null');
    }
    if (!localStorage.getItem('help_faq_sections')) {
      localStorage.setItem('help_faq_sections', JSON.stringify({ sections: [] }));
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

  // -------------------------
  // General helpers
  // -------------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _toISODateOnly(date) {
    if (!date) return null;
    const d = (date instanceof Date) ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  }

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  _startOfMonth(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return d;
  }

  _endOfMonth(date) {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return d;
  }

  _dateInRange(dateStr, fromStr, toStr) {
    if (!dateStr) return false;
    const d = this._parseDate(dateStr);
    if (!d) return false;
    let from = fromStr ? new Date(fromStr) : null;
    let to = toStr ? new Date(toStr) : null;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  _filterByGradeLevels(entityGradeLevel, filterGradeLevels) {
    if (!filterGradeLevels || !filterGradeLevels.length) return true;
    if (!entityGradeLevel) return false;
    if (entityGradeLevel === 'all_grade_levels') return true;
    if (filterGradeLevels.indexOf('all_grade_levels') !== -1) return true;
    return filterGradeLevels.indexOf(entityGradeLevel) !== -1;
  }

  _subjectMatchesFilters(entitySubject, filters) {
    if (!filters || !filters.length) return true;
    if (!entitySubject) return false;
    const set = new Set(filters);
    if (set.has(entitySubject)) return true;
    // STEM hierarchy
    const stemSubjects = ['science', 'technology', 'engineering', 'mathematics', 'stem'];
    if (entitySubject === 'stem') {
      // If filter asks for any STEM-related area
      if (filters.some(f => stemSubjects.indexOf(f) !== -1)) return true;
    }
    if (set.has('stem') && stemSubjects.indexOf(entitySubject) !== -1) return true;
    return false;
  }

  _arrayIntersects(a, b) {
    if (!a || !b || !a.length || !b.length) return false;
    const set = new Set(a);
    for (let v of b) {
      if (set.has(v)) return true;
    }
    return false;
  }

  _estimateProgramMinutes(program) {
    if (typeof program.estimated_time_minutes === 'number' && program.estimated_time_minutes > 0) {
      return program.estimated_time_minutes;
    }
    if (typeof program.duration_weeks === 'number' && program.duration_weeks > 0) {
      // simple heuristic: 60 minutes per week
      return program.duration_weeks * 60;
    }
    return 0;
  }

  _decoratedEntityLabels(type, code) {
    const gradeMap = {
      elementary_k_5: 'Elementary (K–5)',
      middle_school_6_8: 'Middle School (6–8)',
      high_school_9_12: 'High School (9–12)',
      all_grade_levels: 'All Grade Levels'
    };
    const subjectMap = {
      mathematics: 'Mathematics',
      science: 'Science',
      technology: 'Technology',
      engineering: 'Engineering',
      stem: 'STEM',
      english_language_arts: 'English Language Arts',
      classroom_management: 'Classroom Management',
      inclusive_education: 'Inclusive Education',
      assessment: 'Assessment',
      general: 'General'
    };
    if (type === 'grade_level') return gradeMap[code] || code || '';
    if (type === 'subject_area') return subjectMap[code] || code || '';
    return code || '';
  }

  // -------------------------
  // Helper: Learning Plan
  // -------------------------

  _getOrCreateLearningPlan() {
    let plans = this._getFromStorage('learning_plans');
    let plan = plans[0] || null;
    if (!plan) {
      plan = {
        id: this._generateId('plan'),
        name: 'My Learning Plan',
        description: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      plans.push(plan);
      this._saveToStorage('learning_plans', plans);
    }
    return plan;
  }

  _calculateLearningPlanTotals(planId) {
    const items = this._getFromStorage('learning_plan_items').filter(i => i.plan_id === planId);
    let total = 0;
    for (let item of items) {
      if (typeof item.estimated_minutes === 'number') {
        total += item.estimated_minutes;
      }
    }
    return total;
  }

  // -------------------------
  // Helper: Conference Agenda
  // -------------------------

  _getOrCreateConferenceAgenda(agendaDateIso) {
    const agendas = this._getFromStorage('conference_agendas');
    const dateOnly = this._toISODateOnly(agendaDateIso);
    let agenda = agendas.find(a => this._toISODateOnly(a.agenda_date) === dateOnly) || null;
    if (!agenda) {
      agenda = {
        id: this._generateId('agenda'),
        agenda_date: new Date(dateOnly).toISOString(),
        title: 'My Agenda',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      agendas.push(agenda);
      this._saveToStorage('conference_agendas', agendas);
    }
    return agenda;
  }

  _checkConferenceSessionConflicts(candidateSession, existingSessions) {
    const conflicts = [];
       const candStart = this._parseDate(candidateSession.start_datetime);
    const candEnd = this._parseDate(candidateSession.end_datetime);
    if (!candStart || !candEnd) return conflicts;
    for (let s of existingSessions) {
      const sStart = this._parseDate(s.start_datetime);
      const sEnd = this._parseDate(s.end_datetime);
      if (!sStart || !sEnd) continue;
      const overlaps = candStart < sEnd && candEnd > sStart;
      if (overlaps) {
        conflicts.push(s.id);
      }
    }
    return conflicts;
  }

  // -------------------------
  // Home / Global Search
  // -------------------------

  getHomeFeaturedContent() {
    const events = this._getFromStorage('events');
    const resources = this._getFromStorage('resources');
    const grants = this._getFromStorage('grants');
    const mentors = this._getFromStorage('mentors');

    const featured_events = events
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map(e => ({
        event: e,
        price_display: e.is_free ? 'Free' : (typeof e.price_amount === 'number' ? `${e.price_currency || 'USD'} ${e.price_amount.toFixed(2)}` : ''),
        grade_level_label: this._decoratedEntityLabels('grade_level', e.grade_level),
        subject_area_label: this._decoratedEntityLabels('subject_area', e.subject_area)
      }));

    const featured_resources = resources
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.published_at) || 0;
        const bd = this._parseDate(b.published_at) || 0;
        return bd - ad;
      })
      .slice(0, 5);

    const featured_grants = grants
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.deadline) || 0;
        const bd = this._parseDate(b.deadline) || 0;
        return ad - bd;
      })
      .slice(0, 5);

    const featured_mentors = mentors
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    return { featured_events, featured_resources, featured_grants, featured_mentors };
  }

  searchGlobalCatalog(query, filters, page = 1, page_size = 10) {
    const q = (query || '').trim().toLowerCase();
    const includeEvents = !filters || filters.include_events !== false;
    const includePrograms = !filters || filters.include_programs !== false;
    const includeResources = !filters || filters.include_resources !== false;
    const subjectFilters = (filters && filters.subject_areas) || [];
    const gradeFilters = (filters && filters.grade_levels) || [];

    const results = [];

    if (includeEvents) {
      const events = this._getFromStorage('events');
      for (let e of events) {
        if (q) {
          const text = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
          if (!text.includes(q)) continue;
        }
        if (!this._subjectMatchesFilters(e.subject_area, subjectFilters)) continue;
        if (!this._filterByGradeLevels(e.grade_level, gradeFilters)) continue;
        results.push({ result_type: 'event', event: e });
      }
    }

    if (includePrograms) {
      const programs = this._getFromStorage('programs');
      for (let p of programs) {
        if (q) {
          const text = ((p.title || '') + ' ' + (p.description || '')).toLowerCase();
          if (!text.includes(q)) continue;
        }
        if (!this._subjectMatchesFilters(p.subject_area, subjectFilters)) continue;
        if (!this._filterByGradeLevels(p.grade_level, gradeFilters)) continue;
        results.push({ result_type: 'program', program: p });
      }
    }

    if (includeResources) {
      const resources = this._getFromStorage('resources');
      for (let r of resources) {
        if (q) {
          const text = ((r.title || '') + ' ' + (r.summary || '')).toLowerCase();
          if (!text.includes(q)) continue;
        }
        // Approximate subject via topic / tags is optional; we skip strict subject filter here
        results.push({ result_type: 'resource', resource: r });
      }
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  // -------------------------
  // Events / Workshops
  // -------------------------

  getEventFilterOptions() {
    const grade_levels = [
      { code: 'elementary_k_5', label: 'Elementary (K–5)' },
      { code: 'middle_school_6_8', label: 'Middle School (6–8)' },
      { code: 'high_school_9_12', label: 'High School (9–12)' },
      { code: 'all_grade_levels', label: 'All Grade Levels' }
    ];

    const subject_areas = [
      { code: 'mathematics', label: 'Mathematics' },
      { code: 'science', label: 'Science' },
      { code: 'technology', label: 'Technology' },
      { code: 'engineering', label: 'Engineering' },
      { code: 'stem', label: 'STEM' },
      { code: 'english_language_arts', label: 'English Language Arts' },
      { code: 'classroom_management', label: 'Classroom Management' },
      { code: 'inclusive_education', label: 'Inclusive Education' },
      { code: 'assessment', label: 'Assessment' },
      { code: 'general', label: 'General' }
    ];

    const formats = [
      { code: 'online', label: 'Online' },
      { code: 'in_person', label: 'In Person' },
      { code: 'hybrid', label: 'Hybrid' }
    ];

    const price_filters = [
      { code: 'free', label: 'Free ($0)' },
      { code: 'paid', label: 'Paid' },
      { code: 'custom_range', label: 'Custom Range' }
    ];

    const sort_options = [
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'start_date_soonest', label: 'Start Date: Soonest' },
      { code: 'popularity', label: 'Most Popular' }
    ];

    return { grade_levels, subject_areas, formats, price_filters, sort_options };
  }

  searchEvents(filters, sort_by, page = 1, page_size = 10) {
    const events = this._getFromStorage('events');
    filters = filters || {};

    let results = events.filter(e => {
      if (filters.listing_category && e.listing_category !== filters.listing_category) return false;

      if (filters.event_types && filters.event_types.length && filters.event_types.indexOf(e.event_type) === -1) {
        return false;
      }

      if (filters.grade_levels && filters.grade_levels.length) {
        if (!this._filterByGradeLevels(e.grade_level, filters.grade_levels)) return false;
      }

      if (filters.subject_areas && filters.subject_areas.length) {
        if (!this._subjectMatchesFilters(e.subject_area, filters.subject_areas)) return false;
      }

      if (filters.formats && filters.formats.length && filters.formats.indexOf(e.format) === -1) {
        return false;
      }

      if (filters.date_from || filters.date_to) {
        if (!this._dateInRange(e.start_datetime, filters.date_from, filters.date_to)) return false;
      }

      if (typeof filters.price_min === 'number' && e.price_amount < filters.price_min) return false;
      if (typeof filters.price_max === 'number' && e.price_amount > filters.price_max) return false;

      if (typeof filters.is_free === 'boolean' && e.is_free !== filters.is_free) return false;

      if (filters.only_open_for_registration && e.registration_open === false) return false;

      return true;
    });

    if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'start_date_soonest') {
      results.sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || 0;
        const bd = this._parseDate(b.start_datetime) || 0;
        return ad - bd;
      });
    } else if (sort_by === 'popularity') {
      results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');
    const event = events.find(e => e.id === eventId) || null;

    let average_rating = null;
    let review_count = 0;
    if (event) {
      if (typeof event.rating === 'number') average_rating = event.rating;
      if (typeof event.review_count === 'number') review_count = event.review_count;
    }

    // Determine registration status from registrations
    const userRegs = regs.filter(r => r.event_id === eventId);
    let is_registered = false;
    const registration_status = userRegs.length ? userRegs.sort((a, b) => {
      const ad = this._parseDate(a.registered_at) || 0;
      const bd = this._parseDate(b.registered_at) || 0;
      return bd - ad;
    })[0].status : 'not_registered';
    if (userRegs.length) {
      is_registered = registration_status === 'registered';
    }

    return {
      event,
      rating_summary: { average_rating, review_count },
      is_registered,
      registration_status
    };
  }

  registerForEvent(eventId) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');
    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return { success: false, message: 'Event not found', registration: null, event: null };
    }

    if (event.registration_open === false) {
      return { success: false, message: 'Registration is closed for this event', registration: null, event };
    }

    if (typeof event.seats_remaining === 'number' && event.seats_remaining <= 0) {
      return { success: false, message: 'No seats remaining for this event', registration: null, event };
    }

    const registration = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      registered_at: this._nowIso(),
      status: 'registered',
      notes: ''
    };

    regs.push(registration);

    if (typeof event.seats_remaining === 'number') {
      event.seats_remaining = Math.max(0, event.seats_remaining - 1);
    }
    event.updated_at = this._nowIso();

    this._saveToStorage('event_registrations', regs);
    this._saveToStorage('events', events);

    return { success: true, message: 'Registered for event', registration, event };
  }

  getRelatedEvents(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return [];

    return events.filter(e => {
      if (e.id === event.id) return false;
      if (e.listing_category !== event.listing_category) return false;
      const sameSubject = e.subject_area === event.subject_area;
      const sameGrade = e.grade_level === event.grade_level;
      return sameSubject || sameGrade;
    }).slice(0, 10);
  }

  // -------------------------
  // Conference Agenda & Sessions
  // -------------------------

  getConferenceDays() {
    const sessions = this._getFromStorage('conference_sessions');
    const map = {};
    for (let s of sessions) {
      const day = this._toISODateOnly(s.day || s.start_datetime);
      if (!day) continue;
      if (!map[day]) {
        map[day] = { day, label: day };
      }
    }
    return Object.values(map).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  }

  getConferenceSessionsForDay(day, filters) {
    const sessions = this._getFromStorage('conference_sessions');
    const dateOnly = this._toISODateOnly(day);
    filters = filters || {};

    return sessions.filter(s => {
      const sDay = this._toISODateOnly(s.day || s.start_datetime);
      if (sDay !== dateOnly) return false;

      if (filters.audience_grade_levels && filters.audience_grade_levels.length) {
        const grades = s.audience_grade_levels || [];
        if (!grades.length) return false;
        if (!this._arrayIntersects(grades, filters.audience_grade_levels) && grades.indexOf('all_grade_levels') === -1) {
          return false;
        }
      }

      if (filters.tags && filters.tags.length) {
        const tags = s.tags || [];
        if (!this._arrayIntersects(tags, filters.tags)) return false;
      }

      return true;
    });
  }

  addSessionToAgenda(sessionId) {
    const sessions = this._getFromStorage('conference_sessions');
    const items = this._getFromStorage('conference_agenda_items');
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Session not found', agenda: null, agenda_items: [], conflict_session_ids: [] };
    }

    const agenda = this._getOrCreateConferenceAgenda(session.day || session.start_datetime);
    const agendaItems = items.filter(i => i.agenda_id === agenda.id);
    const existingSessions = agendaItems.map(ai => sessions.find(s => s.id === ai.session_id)).filter(Boolean);

    const conflict_session_ids = this._checkConferenceSessionConflicts(session, existingSessions);
    if (conflict_session_ids.length) {
      return {
        success: false,
        message: 'Session time conflicts with existing agenda items',
        agenda,
        agenda_items: agendaItems,
        conflict_session_ids
      };
    }

    const newItem = {
      id: this._generateId('agenda_item'),
      agenda_id: agenda.id,
      session_id: sessionId,
      order_index: agendaItems.length,
      added_at: this._nowIso()
    };

    items.push(newItem);
    agenda.updated_at = this._nowIso();

    this._saveToStorage('conference_agenda_items', items);
    const agendas = this._getFromStorage('conference_agendas');
    const idx = agendas.findIndex(a => a.id === agenda.id);
    if (idx !== -1) {
      agendas[idx] = agenda;
      this._saveToStorage('conference_agendas', agendas);
    }

    const updatedAgendaItems = items.filter(i => i.agenda_id === agenda.id);
    return {
      success: true,
      message: 'Session added to agenda',
      agenda,
      agenda_items: updatedAgendaItems,
      conflict_session_ids: []
    };
  }

  getMyConferenceAgenda(day) {
    const agendas = this._getFromStorage('conference_agendas');
    const items = this._getFromStorage('conference_agenda_items');
    const sessions = this._getFromStorage('conference_sessions');

    const dateOnly = this._toISODateOnly(day);
    const agenda = agendas.find(a => this._toISODateOnly(a.agenda_date) === dateOnly) || null;

    if (!agenda) {
      return { agenda: null, items: [] };
    }

    const agendaItems = items
      .filter(i => i.agenda_id === agenda.id)
      .sort((a, b) => a.order_index - b.order_index);

    const resultItems = agendaItems.map(ai => ({
      agenda_item: ai,
      session: sessions.find(s => s.id === ai.session_id) || null
    }));

    return { agenda, items: resultItems };
  }

  reorderConferenceAgenda(agendaId, orderedSessionIds) {
    const agendas = this._getFromStorage('conference_agendas');
    const items = this._getFromStorage('conference_agenda_items');
    const agenda = agendas.find(a => a.id === agendaId) || null;
    if (!agenda) {
      return { success: false, message: 'Agenda not found', agenda: null, items: [] };
    }

    const agendaItems = items.filter(i => i.agenda_id === agenda.id);
    const orderMap = new Map();
    (orderedSessionIds || []).forEach((sid, idx) => orderMap.set(sid, idx));

    agendaItems.sort((a, b) => {
      const oa = orderMap.has(a.session_id) ? orderMap.get(a.session_id) : Number.MAX_SAFE_INTEGER;
      const ob = orderMap.has(b.session_id) ? orderMap.get(b.session_id) : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

    agendaItems.forEach((ai, idx) => {
      ai.order_index = idx;
    });

    const newAllItems = items.map(i => {
      const updated = agendaItems.find(ai => ai.id === i.id);
      return updated || i;
    });

    this._saveToStorage('conference_agenda_items', newAllItems);

    agenda.updated_at = this._nowIso();
    const idxAgenda = agendas.findIndex(a => a.id === agenda.id);
    if (idxAgenda !== -1) {
      agendas[idxAgenda] = agenda;
      this._saveToStorage('conference_agendas', agendas);
    }

    const updatedItems = newAllItems.filter(i => i.agenda_id === agenda.id);
    return { success: true, message: 'Agenda reordered', agenda, items: updatedItems };
  }

  // -------------------------
  // Resources & Resource Library
  // -------------------------

  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources');
    const typeSet = new Set();
    const topicSet = new Set();

    for (let r of resources) {
      if (r.resource_type) typeSet.add(r.resource_type);
      if (r.topic) topicSet.add(r.topic);
      if (Array.isArray(r.topic_tags)) {
        for (let t of r.topic_tags) topicSet.add(t);
      }
    }

    const resource_types = Array.from(typeSet).map(code => ({ code, label: code.charAt(0).toUpperCase() + code.slice(1) }));

    const topics = Array.from(topicSet).map(t => ({ topic: t, label: t }));

    const reading_time_ranges = [
      { code: '0_15', label: '0–15 minutes', max_minutes: 15 },
      { code: '15_30', label: '15–30 minutes', max_minutes: 30 },
      { code: '30_60', label: '30–60 minutes', max_minutes: 60 },
      { code: '60_plus', label: '60+ minutes', max_minutes: null }
    ];

    const published_date_ranges = [
      { code: 'last_30_days', label: 'Last 30 days' },
      { code: 'last_12_months', label: 'Last 12 months' },
      { code: 'any_time', label: 'Any time' }
    ];

    const rating_options = [
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const sort_options = [
      { code: 'newest_first', label: 'Newest first' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'relevance', label: 'Relevance' }
    ];

    return { resource_types, topics, reading_time_ranges, published_date_ranges, rating_options, sort_options };
  }

  searchResources(filters, sort_by, page = 1, page_size = 10) {
    const resources = this._getFromStorage('resources');
    filters = filters || {};

    const now = new Date();
    let fromDate = null;
    if (filters.published_date_range === 'last_12_months') {
      fromDate = new Date(now.getTime());
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else if (filters.published_date_range === 'last_30_days') {
      fromDate = this._addDays(now, -30);
    }

    let results = resources.filter(r => {
      if (filters.resource_types && filters.resource_types.length && filters.resource_types.indexOf(r.resource_type) === -1) {
        return false;
      }

      if (filters.topics && filters.topics.length) {
        const topics = [];
        if (r.topic) topics.push(r.topic);
        if (Array.isArray(r.topic_tags)) topics.push.apply(topics, r.topic_tags);
        if (!this._arrayIntersects(topics, filters.topics)) return false;
      }

      if (typeof filters.max_reading_time_minutes === 'number' && r.reading_time_minutes > filters.max_reading_time_minutes) {
        return false;
      }

      if (fromDate) {
        const pub = this._parseDate(r.published_at);
        if (!pub || pub < fromDate) return false;
      }

      if (typeof filters.min_rating === 'number') {
        if (typeof r.rating !== 'number' || r.rating < filters.min_rating) return false;
      }

      return true;
    });

    if (sort_by === 'newest_first') {
      results.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || 0;
        const bd = this._parseDate(b.published_at) || 0;
        return bd - ad;
      });
    } else if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  toggleSaveResource(resourceId, save = true) {
    const resources = this._getFromStorage('resources');
    const saved = this._getFromStorage('saved_resources');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return { success: false, saved: false, message: 'Resource not found', saved_resource: null };
    }

    const existingIndex = saved.findIndex(s => s.resource_id === resourceId);
    let saved_resource = null;

    if (save) {
      if (existingIndex === -1) {
        saved_resource = {
          id: this._generateId('saved_res'),
          resource_id: resourceId,
          saved_at: this._nowIso()
        };
        saved.push(saved_resource);
      } else {
        saved_resource = saved[existingIndex];
      }
      this._saveToStorage('saved_resources', saved);
      return { success: true, saved: true, message: 'Resource saved', saved_resource: { ...saved_resource, resource } };
    } else {
      if (existingIndex !== -1) {
        saved.splice(existingIndex, 1);
        this._saveToStorage('saved_resources', saved);
      }
      return { success: true, saved: false, message: 'Resource unsaved', saved_resource: null };
    }
  }

  getSavedResources() {
    const saved = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('resources');
    const result = [];
    for (let s of saved) {
      const r = resources.find(res => res.id === s.resource_id);
      if (r) result.push(r);
    }
    return result;
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const saved = this._getFromStorage('saved_resources');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return { resource: null, is_saved: false, related_resources: [] };
    }

    const is_saved = saved.some(s => s.resource_id === resourceId);

    const related_resources = resources
      .filter(r => r.id !== resource.id && r.topic && r.topic === resource.topic)
      .slice(0, 10);

    return { resource, is_saved, related_resources };
  }

  // -------------------------
  // Programs & Courses
  // -------------------------

  getProgramFilterOptions() {
    const program_types = [
      { code: 'certification', label: 'Certification Programs' },
      { code: 'course', label: 'Courses' },
      { code: 'micro_credential', label: 'Micro-credentials' },
      { code: 'workshop', label: 'Workshops' },
      { code: 'other', label: 'Other' }
    ];

    const delivery_modes = [
      { code: 'fully_online', label: 'Fully Online' },
      { code: 'in_person', label: 'In Person' },
      { code: 'blended', label: 'Blended' }
    ];

    const duration_filters = [
      { code: '8_plus_weeks', label: '8+ weeks', min_weeks: 8 }
    ];

    const sort_options = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'duration_long_to_short', label: 'Duration: Long to Short' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { program_types, delivery_modes, duration_filters, sort_options };
  }

  searchPrograms(filters, sort_by, page = 1, page_size = 10) {
    const programs = this._getFromStorage('programs');
    filters = filters || {};

    let results = programs.filter(p => {
      if (filters.program_types && filters.program_types.length && filters.program_types.indexOf(p.program_type) === -1) {
        return false;
      }

      if (filters.delivery_modes && filters.delivery_modes.length && filters.delivery_modes.indexOf(p.delivery_mode) === -1) {
        return false;
      }

      if (typeof filters.price_min === 'number' && p.price_amount < filters.price_min) return false;
      if (typeof filters.price_max === 'number' && p.price_amount > filters.price_max) return false;

      if (typeof filters.min_duration_weeks === 'number') {
        if (typeof p.duration_weeks !== 'number' || p.duration_weeks < filters.min_duration_weeks) return false;
      }

      if (filters.grade_levels && filters.grade_levels.length) {
        if (!this._filterByGradeLevels(p.grade_level, filters.grade_levels)) return false;
      }

      if (filters.subject_areas && filters.subject_areas.length) {
        if (!this._subjectMatchesFilters(p.subject_area, filters.subject_areas)) return false;
      }

      return true;
    });

    if (sort_by === 'price_low_to_high') {
      results.sort((a, b) => a.price_amount - b.price_amount);
    } else if (sort_by === 'duration_long_to_short') {
      results.sort((a, b) => (b.duration_weeks || 0) - (a.duration_weeks || 0));
    } else if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Instrumentation for task completion tracking (task_3: searchParams and candidateProgramIds)
    try {
      const deliveryModes = filters.delivery_modes || [];
      const hasFullyOnline = Array.isArray(deliveryModes) && deliveryModes.indexOf('fully_online') !== -1;
      const hasValidPriceMax = typeof filters.price_max === 'number' && filters.price_max <= 600;
      const hasValidMinDuration = typeof filters.min_duration_weeks === 'number' && filters.min_duration_weeks >= 8;
      if (
        hasFullyOnline &&
        hasValidPriceMax &&
        hasValidMinDuration &&
        sort_by === 'price_low_to_high' &&
        results &&
        results.length >= 2
      ) {
        const searchParamsValue = {
          filtersSnapshot: {
            delivery_modes: filters.delivery_modes,
            price_max: filters.price_max,
            min_duration_weeks: filters.min_duration_weeks,
            program_types: filters.program_types || [],
            sort_by
          },
          result_count: results.length,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task3_searchParams', JSON.stringify(searchParamsValue));

        const candidateIdsValue = {
          first_program_id: results[0].id,
          second_program_id: results[1].id,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task3_candidateProgramIds', JSON.stringify(candidateIdsValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const items = this._getFromStorage('learning_plan_items');
    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return { program: null, is_in_learning_plan: false };
    }
    const is_in_learning_plan = items.some(i => i.item_kind === 'program' && i.source_id === programId);
    return { program, is_in_learning_plan };
  }

  addProgramToLearningPlan(programId) {
    const programs = this._getFromStorage('programs');
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items');
    const program = programs.find(p => p.id === programId) || null;

    if (!program) {
      return { success: false, message: 'Program not found', plan, items: items.filter(i => i.plan_id === plan.id) };
    }

    const exists = items.some(i => i.plan_id === plan.id && i.item_kind === 'program' && i.source_id === programId);
    if (!exists) {
      const newItem = {
        id: this._generateId('plan_item'),
        plan_id: plan.id,
        item_kind: 'program',
        source_id: programId,
        title_snapshot: program.title,
        estimated_minutes: this._estimateProgramMinutes(program),
        topic: program.subject_area || '',
        order_index: items.filter(i => i.plan_id === plan.id).length,
        notes: ''
      };
      items.push(newItem);
      this._saveToStorage('learning_plan_items', items);
    }

    plan.updated_at = this._nowIso();
    const plans = this._getFromStorage('learning_plans');
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = plan;
      this._saveToStorage('learning_plans', plans);
    }

    const planItems = items.filter(i => i.plan_id === plan.id);

    // Instrumentation for task completion tracking (task_3: selectedProgramId)
    try {
      const raw = localStorage.getItem('task3_candidateProgramIds');
      if (raw) {
        const candidate = JSON.parse(raw);
        if (
          candidate &&
          (candidate.first_program_id === programId || candidate.second_program_id === programId)
        ) {
          const meetsConstraints =
            program.delivery_mode === 'fully_online' &&
            typeof program.price_amount === 'number' &&
            program.price_amount < 600 &&
            typeof program.duration_weeks === 'number' &&
            program.duration_weeks >= 8 &&
            (!program.program_type || program.program_type === 'certification');

          if (meetsConstraints) {
            localStorage.setItem('task3_selectedProgramId', programId);
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { success: true, message: 'Program added to learning plan', plan, items: planItems };
  }

  // -------------------------
  // Discussion Groups & Community
  // -------------------------

  getDiscussionGroupFilterOptions() {
    const experience_levels = [
      { code: 'new_teachers_0_3_years', label: 'New Teachers (0–3 years)' },
      { code: 'all_experience_levels', label: 'All Experience Levels' },
      { code: 'mid_career', label: 'Mid-career' },
      { code: 'veteran_10_plus_years', label: 'Veteran (10+ years)' }
    ];

    const subject_areas = [
      { code: 'mathematics', label: 'Mathematics' },
      { code: 'science', label: 'Science' },
      { code: 'technology', label: 'Technology' },
      { code: 'engineering', label: 'Engineering' },
      { code: 'stem', label: 'STEM' },
      { code: 'english_language_arts', label: 'English Language Arts' },
      { code: 'classroom_management', label: 'Classroom Management' },
      { code: 'inclusive_education', label: 'Inclusive Education' },
      { code: 'assessment', label: 'Assessment' },
      { code: 'general', label: 'General' }
    ];

    const regions = [
      { code: 'midwest', label: 'Midwest' },
      { code: 'northeast', label: 'Northeast' },
      { code: 'south', label: 'South' },
      { code: 'west', label: 'West' },
      { code: 'international', label: 'International' },
      { code: 'other_region', label: 'Other' }
    ];

    const sort_options = [
      { code: 'members_high_to_low', label: 'Members: High to Low' },
      { code: 'activity_high_to_low', label: 'Activity: High to Low' }
    ];

    return { experience_levels, subject_areas, regions, sort_options };
  }

  searchDiscussionGroups(filters, sort_by, page = 1, page_size = 10) {
    const groups = this._getFromStorage('discussion_groups');
    filters = filters || {};

    let results = groups.filter(g => {
      if (filters.experience_levels && filters.experience_levels.length && filters.experience_levels.indexOf(g.experience_level) === -1) {
        return false;
      }

      if (filters.subject_areas && filters.subject_areas.length) {
        if (!this._subjectMatchesFilters(g.subject_area, filters.subject_areas)) return false;
      }

      if (filters.regions && filters.regions.length && filters.regions.indexOf(g.region) === -1) {
        return false;
      }

      return true;
    });

    if (sort_by === 'members_high_to_low') {
      results.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else if (sort_by === 'activity_high_to_low') {
      results.sort((a, b) => (b.active_threads_last_30_days || 0) - (a.active_threads_last_30_days || 0));
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  getDiscussionGroupDetail(groupId) {
    const groups = this._getFromStorage('discussion_groups');
    const threads = this._getFromStorage('discussion_threads');
    const memberships = this._getFromStorage('group_memberships');

    const group = groups.find(g => g.id === groupId) || null;
    if (!group) {
      return { group: null, active_threads_last_30_days: 0, is_member: false };
    }

    const now = new Date();
    const from = this._addDays(now, -30);

    const activeThreads = threads.filter(t => {
      if (t.group_id !== groupId) return false;
      if (!t.is_active) return false;
      if (t.status !== 'open') return false;
      const last = this._parseDate(t.last_activity_at);
      if (!last || last < from) return false;
      return true;
    });

    const active_threads_last_30_days = activeThreads.length;

    const is_member = memberships.some(m => m.group_id === groupId && m.status === 'joined');

    group.active_threads_last_30_days = active_threads_last_30_days;
    group.is_member = is_member;

    // Save updated group metrics
    const newGroups = groups.map(g => (g.id === group.id ? group : g));
    this._saveToStorage('discussion_groups', newGroups);

    return { group, active_threads_last_30_days, is_member };
  }

  getDiscussionThreads(groupId, time_range) {
    const threads = this._getFromStorage('discussion_threads');
    const now = new Date();
    let from = null;

    if (time_range === 'this_month') {
      from = this._startOfMonth(now);
    } else if (time_range === 'last_30_days') {
      from = this._addDays(now, -30);
    }

    return threads.filter(t => {
      if (t.group_id !== groupId) return false;
      if (!from) return true;
      const last = this._parseDate(t.last_activity_at);
      if (!last) return false;
      return last >= from;
    });
  }

  joinDiscussionGroup(groupId) {
    const groups = this._getFromStorage('discussion_groups');
    const memberships = this._getFromStorage('group_memberships');
    const group = groups.find(g => g.id === groupId) || null;

    if (!group) {
      return { success: false, message: 'Group not found', membership: null, group: null };
    }

    let membership = memberships.find(m => m.group_id === groupId && m.status === 'joined') || null;
    if (!membership) {
      membership = {
        id: this._generateId('membership'),
        group_id: groupId,
        joined_at: this._nowIso(),
        status: 'joined'
      };
      memberships.push(membership);
      this._saveToStorage('group_memberships', memberships);
    }

    group.is_member = true;
    const newGroups = groups.map(g => (g.id === group.id ? group : g));
    this._saveToStorage('discussion_groups', newGroups);

    return { success: true, message: 'Joined group', membership, group };
  }

  // -------------------------
  // Learning Plan (Planner)
  // -------------------------

  getLearningPlanOverview() {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items').filter(i => i.plan_id === plan.id);
    const programs = this._getFromStorage('programs');
    const resources = this._getFromStorage('resources');

    const resultItems = items
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(i => {
        let source = null;
        let source_kind = i.item_kind;
        let subject_area = '';
        if (i.item_kind === 'program') {
          source = programs.find(p => p.id === i.source_id) || null;
          subject_area = (source && source.subject_area) || '';
        } else if (i.item_kind === 'resource') {
          source = resources.find(r => r.id === i.source_id) || null;
          subject_area = (source && (source.topic || '')) || '';
        }
        return {
          plan_item: i,
          source_title: (source && source.title) || i.title_snapshot,
          source_kind,
          subject_area
        };
      });

    const total_estimated_minutes = this._calculateLearningPlanTotals(plan.id);
    return { plan, items: resultItems, total_estimated_minutes };
  }

  reorderLearningPlanItems(orderedItemIds) {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items');
    const planItems = items.filter(i => i.plan_id === plan.id);
    const orderMap = new Map();
    (orderedItemIds || []).forEach((id, idx) => orderMap.set(id, idx));

    planItems.sort((a, b) => {
      const oa = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const ob = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

    planItems.forEach((i, idx) => {
      i.order_index = idx;
    });

    const newAllItems = items.map(i => {
      const updated = planItems.find(pi => pi.id === i.id);
      return updated || i;
    });

    this._saveToStorage('learning_plan_items', newAllItems);

    plan.updated_at = this._nowIso();
    const plans = this._getFromStorage('learning_plans');
    const idxPlan = plans.findIndex(p => p.id === plan.id);
    if (idxPlan !== -1) {
      plans[idxPlan] = plan;
      this._saveToStorage('learning_plans', plans);
    }

    const updatedPlanItems = newAllItems.filter(i => i.plan_id === plan.id);
    return { success: true, message: 'Learning plan items reordered', items: updatedPlanItems };
  }

  removeLearningPlanItem(planItemId) {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items');
    let changed = false;

    const remaining = items.filter(i => {
      if (i.id === planItemId) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      // Reindex items for this plan
      const planItems = remaining.filter(i => i.plan_id === plan.id).sort((a, b) => a.order_index - b.order_index);
      planItems.forEach((i, idx) => {
        i.order_index = idx;
      });
      const finalItems = remaining.map(i => {
        const updated = planItems.find(pi => pi.id === i.id);
        return updated || i;
      });
      this._saveToStorage('learning_plan_items', finalItems);
    }

    const updatedItems = this._getFromStorage('learning_plan_items').filter(i => i.plan_id === plan.id);
    return { success: true, message: 'Item removed from learning plan', plan, items: updatedItems };
  }

  searchCatalog(query, filters, sort_by, page = 1, page_size = 10) {
    const programs = this._getFromStorage('programs');
    const resources = this._getFromStorage('resources');
    filters = filters || {};
    const q = (query || '').trim().toLowerCase();

    const includePrograms = !filters.types || filters.types.some(t => t === 'program' || t === 'course');
    const includeResources = !filters.types || filters.types.indexOf('resource') !== -1;

    const results = [];

    if (includePrograms) {
      for (let p of programs) {
        if (q) {
          const text = ((p.title || '') + ' ' + (p.description || '')).toLowerCase();
          if (!text.includes(q)) continue;
        }

        if (filters.subject_areas && filters.subject_areas.length) {
          if (!this._subjectMatchesFilters(p.subject_area, filters.subject_areas)) continue;
        }

        if (filters.grade_levels && filters.grade_levels.length) {
          if (!this._filterByGradeLevels(p.grade_level, filters.grade_levels)) continue;
        }

        const estMinutes = this._estimateProgramMinutes(p);
        if (typeof filters.min_duration_minutes === 'number' && estMinutes < filters.min_duration_minutes) continue;
        if (typeof filters.max_duration_minutes === 'number' && estMinutes > filters.max_duration_minutes) continue;

        results.push({ result_type: 'program', program: p, estimated_minutes: estMinutes });
      }
    }

    if (includeResources) {
      for (let r of resources) {
        if (q) {
          const text = ((r.title || '') + ' ' + (r.summary || '')).toLowerCase();
          if (!text.includes(q)) continue;
        }

        if (filters.topics && filters.topics.length) {
          const topics = [];
          if (r.topic) topics.push(r.topic);
          if (Array.isArray(r.topic_tags)) topics.push.apply(topics, r.topic_tags);
          if (!this._arrayIntersects(topics, filters.topics)) continue;
        }

        const estMinutes = r.reading_time_minutes;
        if (typeof filters.min_duration_minutes === 'number' && estMinutes < filters.min_duration_minutes) continue;
        if (typeof filters.max_duration_minutes === 'number' && estMinutes > filters.max_duration_minutes) continue;

        results.push({ result_type: 'resource', resource: r, estimated_minutes: estMinutes });
      }
    }

    if (sort_by === 'duration_short_to_long') {
      results.sort((a, b) => (a.estimated_minutes || 0) - (b.estimated_minutes || 0));
    } else if (sort_by === 'newest_first') {
      results.sort((a, b) => {
        const ad = this._parseDate((a.program && a.program.created_at) || (a.resource && a.resource.published_at)) || 0;
        const bd = this._parseDate((b.program && b.program.created_at) || (b.resource && b.resource.published_at)) || 0;
        return bd - ad;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  addResourceToLearningPlan(resourceId) {
    const resources = this._getFromStorage('resources');
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items');
    const resource = resources.find(r => r.id === resourceId) || null;

    if (!resource) {
      return { success: false, message: 'Resource not found', plan, items: items.filter(i => i.plan_id === plan.id) };
    }

    const exists = items.some(i => i.plan_id === plan.id && i.item_kind === 'resource' && i.source_id === resourceId);
    if (!exists) {
      const newItem = {
        id: this._generateId('plan_item'),
        plan_id: plan.id,
        item_kind: 'resource',
        source_id: resourceId,
        title_snapshot: resource.title,
        estimated_minutes: resource.reading_time_minutes,
        topic: resource.topic || '',
        order_index: items.filter(i => i.plan_id === plan.id).length,
        notes: ''
      };
      items.push(newItem);
      this._saveToStorage('learning_plan_items', items);
    }

    plan.updated_at = this._nowIso();
    const plans = this._getFromStorage('learning_plans');
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = plan;
      this._saveToStorage('learning_plans', plans);
    }

    const planItems = items.filter(i => i.plan_id === plan.id);
    return { success: true, message: 'Resource added to learning plan', plan, items: planItems };
  }

  // -------------------------
  // Grants & Funding
  // -------------------------

  getGrantFilterOptions() {
    const grants = this._getFromStorage('grants');
    const gradeSet = new Set();
    const focusSet = new Set();

    for (let g of grants) {
      if (g.grade_level) gradeSet.add(g.grade_level);
      if (Array.isArray(g.focus_areas)) {
        for (let f of g.focus_areas) focusSet.add(f);
      }
    }

    const grade_levels = Array.from(gradeSet).map(code => ({ code, label: code }));

    const focus_areas = Array.from(focusSet).map(code => ({ code, label: code }));

    const deadline_ranges = [
      { code: 'next_30_days', label: 'Next 30 days' },
      { code: 'next_60_days', label: 'Next 60 days' }
    ];

    const sort_options = [
      { code: 'deadline_soonest_first', label: 'Deadline: Soonest First' }
    ];

    return { grade_levels, focus_areas, deadline_ranges, sort_options };
  }

  searchGrants(filters, sort_by, page = 1, page_size = 10) {
    const grants = this._getFromStorage('grants');
    filters = filters || {};

    let results = grants.filter(g => {
      if (filters.grade_levels && filters.grade_levels.length) {
        if (!this._filterByGradeLevels(g.grade_level, filters.grade_levels)) return false;
      }

      if (filters.focus_areas && filters.focus_areas.length) {
        const fa = g.focus_areas || [];
        if (!this._arrayIntersects(fa, filters.focus_areas)) return false;
      }

      if (typeof filters.min_funding_amount === 'number') {
        if (g.max_funding_amount < filters.min_funding_amount) return false;
      }

      if (typeof filters.max_funding_amount === 'number') {
        if (g.min_funding_amount > filters.max_funding_amount) return false;
      }

      if (filters.deadline_from || filters.deadline_to) {
        if (!this._dateInRange(g.deadline, filters.deadline_from, filters.deadline_to)) return false;
      }

      return true;
    });

    if (sort_by === 'deadline_soonest_first') {
      results.sort((a, b) => {
        const ad = this._parseDate(a.deadline) || 0;
        const bd = this._parseDate(b.deadline) || 0;
        return ad - bd;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  toggleSaveGrant(grantId, save = true) {
    const grants = this._getFromStorage('grants');
    const saved = this._getFromStorage('saved_grants');
    const grant = grants.find(g => g.id === grantId) || null;
    if (!grant) {
      return { success: false, saved: false, message: 'Grant not found', saved_grant: null };
    }

    const existingIndex = saved.findIndex(s => s.grant_id === grantId);
    let saved_grant = null;

    if (save) {
      if (existingIndex === -1) {
        saved_grant = {
          id: this._generateId('saved_grant'),
          grant_id: grantId,
          saved_at: this._nowIso()
        };
        saved.push(saved_grant);
      } else {
        saved_grant = saved[existingIndex];
      }
      this._saveToStorage('saved_grants', saved);
      return { success: true, saved: true, message: 'Grant saved', saved_grant: { ...saved_grant, grant } };
    } else {
      if (existingIndex !== -1) {
        saved.splice(existingIndex, 1);
        this._saveToStorage('saved_grants', saved);
      }
      return { success: true, saved: false, message: 'Grant unsaved', saved_grant: null };
    }
  }

  // -------------------------
  // Mentors & Mentoring
  // -------------------------

  getMentorFilterOptions() {
    const mentors = this._getFromStorage('mentors');
    const subjectSet = new Set();
    const regionSet = new Set();

    for (let m of mentors) {
      if (Array.isArray(m.subject_areas)) {
        for (let s of m.subject_areas) subjectSet.add(s);
      }
      if (m.region) regionSet.add(m.region);
    }

    const subject_areas = Array.from(subjectSet).map(code => ({ code, label: code }));
    const regions = Array.from(regionSet).map(code => ({ code, label: code }));

    const rating_thresholds = [
      { min_rating: 4, label: '4.0 & up' },
      { min_rating: 4.5, label: '4.5 & up' }
    ];

    const sort_options = [
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'most_reviewed', label: 'Most Reviewed' }
    ];

    return { subject_areas, regions, rating_thresholds, sort_options };
  }

  searchMentors(filters, sort_by, page = 1, page_size = 10) {
    const mentors = this._getFromStorage('mentors');
    filters = filters || {};

    let results = mentors.filter(m => {
      if (filters.subject_areas && filters.subject_areas.length) {
        const sa = m.subject_areas || [];
        if (!this._arrayIntersects(sa, filters.subject_areas)) return false;
      }

      if (filters.regions && filters.regions.length && filters.regions.indexOf(m.region) === -1) {
        return false;
      }

      if (typeof filters.min_rating === 'number' && m.rating < filters.min_rating) return false;
      if (typeof filters.min_review_count === 'number' && m.review_count < filters.min_review_count) return false;

      return true;
    });

    if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'most_reviewed') {
      results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const paged = results.slice(start, start + page_size);
    return { results: paged, total_count, page, page_size };
  }

  getMentorProfile(mentorId) {
    const mentors = this._getFromStorage('mentors');
    const mentor = mentors.find(m => m.id === mentorId) || null;
    return { mentor };
  }

  getMentorAvailability(mentorId, date_from, date_to) {
    const slots = this._getFromStorage('mentor_availability_slots');
    return slots.filter(s => {
      if (s.mentor_id !== mentorId) return false;
      if (s.is_booked) return false;
      return this._dateInRange(s.start_datetime, date_from, date_to);
    });
  }

  bookMentorSessions(mentorId, slotIds) {
    const slots = this._getFromStorage('mentor_availability_slots');
    const sessions = this._getFromStorage('mentor_sessions');

    const selectedSlots = slots.filter(s => slotIds.indexOf(s.id) !== -1 && s.mentor_id === mentorId && !s.is_booked);

    if (!selectedSlots.length) {
      return { success: false, message: 'No available slots to book', sessions: [] };
    }

    const created = [];
    const nowIso = this._nowIso();

    for (let s of selectedSlots) {
      const start = this._parseDate(s.start_datetime);
      const end = this._parseDate(s.end_datetime);
      const duration = start && end ? Math.round((end - start) / 60000) : 30;
      const session = {
        id: this._generateId('mentor_session'),
        mentor_id: mentorId,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: duration,
        status: 'booked',
        booked_at: nowIso
      };
      s.is_booked = true;
      sessions.push(session);
      created.push(session);
    }

    this._saveToStorage('mentor_sessions', sessions);
    this._saveToStorage('mentor_availability_slots', slots);

    return { success: true, message: 'Mentor sessions booked', sessions: created };
  }

  // -------------------------
  // Profile Settings
  // -------------------------

  getProfileSettings() {
    const raw = localStorage.getItem('profile_settings');
    let profile = raw ? JSON.parse(raw) : null;
    if (!profile) {
      profile = {
        id: 'profile_1',
        display_name: '',
        grade_levels: [],
        subjects: [],
        preferred_language: 'english',
        email_frequency: 'weekly',
        interests: [],
        updated_at: this._nowIso()
      };
      localStorage.setItem('profile_settings', JSON.stringify(profile));
    }
    return profile;
  }

  updateProfileSettings(updates) {
    const profile = this.getProfileSettings();
    const newProfile = { ...profile, ...updates, updated_at: this._nowIso() };
    localStorage.setItem('profile_settings', JSON.stringify(newProfile));
    return { success: true, message: 'Profile updated', profile: newProfile };
  }

  // -------------------------
  // Organization Info & Help
  // -------------------------

  getOrganizationInfo() {
    const raw = localStorage.getItem('organization_info');
    let info = raw ? JSON.parse(raw) : null;
    if (!info) {
      info = {
        mission: '',
        vision: '',
        core_services: [],
        impact_stories: [],
        policy_links: []
      };
    }
    return info;
  }

  getHelpFaqSections() {
    const raw = localStorage.getItem('help_faq_sections');
    let data = raw ? JSON.parse(raw) : { sections: [] };
    if (!data.sections) data.sections = [];
    return data;
  }

  submitSupportRequest(subject, message, category, include_recent_activity = false) {
    const requests = this._getFromStorage('support_requests');
    const ticket = {
      id: this._generateId('ticket'),
      subject,
      message,
      category: category || '',
      include_recent_activity: !!include_recent_activity,
      created_at: this._nowIso(),
      status: 'open'
    };
    requests.push(ticket);
    this._saveToStorage('support_requests', requests);
    return { success: true, ticket_id: ticket.id, message: 'Support request submitted' };
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