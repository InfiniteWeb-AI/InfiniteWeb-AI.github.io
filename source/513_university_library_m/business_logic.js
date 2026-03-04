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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Core entities
    this._ensureStorageKey('events', []);
    this._ensureStorageKey('event_registrations', []);
    this._ensureStorageKey('waitlist_entries', []);
    this._ensureStorageKey('group_reservations', []);
    this._ensureStorageKey('my_schedule_items', []);
    this._ensureStorageKey('watchlist_items', []);

    // Content & auxiliary data
    this._ensureStorageKey('pages', []);
    this._ensureStorageKey('faq_entries', []);
    // contact_and_hours is a single object or null
    if (localStorage.getItem('contact_and_hours') === null) {
      localStorage.setItem('contact_and_hours', JSON.stringify(null));
    }
    this._ensureStorageKey('contact_form_submissions', []);

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _ensureStorageKey(key, defaultValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parsing fails, reset to default
      const fallback = defaultValue !== undefined ? defaultValue : [];
      this._saveToStorage(key, fallback);
      return fallback;
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

  // ---------------------- Generic date/time helpers ----------------------

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _formatDate(date) {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return date.toDateString();
    }
  }

  _formatTime(date) {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (e) {
      const h = date.getHours();
      const m = date.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hh = ((h + 11) % 12) + 1;
      const mm = m.toString().padStart(2, '0');
      return hh + ':' + mm + ' ' + ampm;
    }
  }

  _formatTimeRange(start, end) {
    if (!start || !end) return '';
    const startStr = this._formatTime(start);
    const endStr = this._formatTime(end);
    return startStr + '  ' + endStr; // en dash
  }

  _getDayOfWeekSlug(date) {
    if (!date) return '';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _isFull(event) {
    if (!event) return false;
    if (typeof event.remaining_capacity !== 'number') return false;
    return event.remaining_capacity <= 0;
  }

  _getSeatsAvailableLabel(event) {
    if (!event) return '';
    if (typeof event.remaining_capacity !== 'number') {
      return 'Capacity info unavailable';
    }
    if (event.remaining_capacity <= 0) {
      return 'Full';
    }
    const n = event.remaining_capacity;
    return n + (n === 1 ? ' seat available' : ' seats available');
  }

  _getCostDisplay(event) {
    if (!event) return '';
    if (event.cost_type === 'free') {
      return 'Free';
    }
    if (typeof event.cost_amount === 'number') {
      return '$' + event.cost_amount.toFixed(2);
    }
    return 'Paid';
  }

  _getCategoryLabel(category) {
    const map = {
      workshop: 'Workshop',
      open_lab: 'Open Lab',
      equipment_training: 'Equipment Training',
      '3d_printing': '3D Printing',
      laser_cutting: 'Laser Cutting',
      laser_cutter_safety_orientation: 'Laser Cutter Safety Orientation',
      crafting: 'Crafting',
      skill_building: 'Skill-Building'
    };
    return map[category] || '';
  }

  _getLevelLabel(level) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All Levels'
    };
    return map[level] || '';
  }

  _getAudienceLabel(audience) {
    const map = {
      families_kids: 'Families / Kids',
      students: 'Students',
      faculty_staff: 'Faculty & Staff',
      general_public: 'General Public'
    };
    return map[audience] || '';
  }

  _getFormatLabel(format) {
    const map = {
      in_person: 'In Person',
      virtual: 'Virtual',
      hybrid: 'Hybrid'
    };
    return map[format] || '';
  }

  _buildEventDisplay(event) {
    const start = this._parseDate(event.start_datetime);
    const end = this._parseDate(event.end_datetime);
    const durationMinutes = start && end ? Math.max(0, Math.round((end - start) / 60000)) : 0;
    return {
      category_label: this._getCategoryLabel(event.category),
      level_label: this._getLevelLabel(event.level),
      audience_label: this._getAudienceLabel(event.audience),
      format_label: this._getFormatLabel(event.format),
      date_display: this._formatDate(start),
      time_range_display: this._formatTimeRange(start, end),
      duration_minutes: durationMinutes,
      day_of_week: this._getDayOfWeekSlug(start),
      cost_display: this._getCostDisplay(event),
      is_full: this._isFull(event),
      seats_available_label: this._getSeatsAvailableLabel(event)
    };
  }

  // ---------------------- Required helpers ----------------------

  _getOrCreateUserEventState() {
    // Single-user state is primarily stored in my_schedule_items and watchlist_items
    const my_schedule_items = this._getFromStorage('my_schedule_items', []);
    const watchlist_items = this._getFromStorage('watchlist_items', []);
    return { my_schedule_items, watchlist_items };
  }

  _validateEventRegistrationCapacity(event, attendee_count) {
    const nowIso = new Date().toISOString();
    if (!event || typeof attendee_count !== 'number' || attendee_count <= 0) {
      return { ok: false, event: event, error: 'Invalid event or attendee count.' };
    }

    // If no capacity defined, allow without limits
    if (typeof event.max_capacity !== 'number') {
      const updated = Object.assign({}, event, { updated_at: nowIso });
      return { ok: true, event: updated, error: null };
    }

    const currentRemaining = typeof event.remaining_capacity === 'number'
      ? event.remaining_capacity
      : event.max_capacity;

    if (currentRemaining < attendee_count) {
      return { ok: false, event: event, error: 'Not enough spots remaining for this event.' };
    }

    const updatedEvent = Object.assign({}, event, {
      remaining_capacity: currentRemaining - attendee_count,
      updated_at: nowIso
    });

    return { ok: true, event: updatedEvent, error: null };
  }

  _applyEventFiltersAndSorting(events, query, filters, sort_by) {
    let result = Array.isArray(events) ? events.slice() : [];
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    // Text search over title, subtitle, descriptions, tags
    if (q) {
      result = result.filter(ev => {
        const haystackParts = [
          ev.title,
          ev.subtitle,
          ev.short_description,
          ev.description
        ];
        if (Array.isArray(ev.tags)) {
          haystackParts.push(ev.tags.join(' '));
        }
        const haystack = haystackParts
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Category filter (with simple hierarchy consideration)
    if (f.category) {
      const cat = f.category;
      result = result.filter(ev => {
        if (cat === 'laser_cutting') {
          // Include child category laser_cutter_safety_orientation as part of laser_cutting
          return ev.category === 'laser_cutting' || ev.category === 'laser_cutter_safety_orientation';
        }
        return ev.category === cat;
      });
    }

    if (f.cost_type) {
      result = result.filter(ev => ev.cost_type === f.cost_type);
    }

    if (f.level) {
      result = result.filter(ev => ev.level === f.level);
    }

    if (f.audience) {
      result = result.filter(ev => ev.audience === f.audience);
    }

    if (f.format) {
      result = result.filter(ev => ev.format === f.format);
    }

    if (f.only_with_prerequisites) {
      result = result.filter(ev => ev.has_prerequisites && Array.isArray(ev.prerequisite_event_ids) && ev.prerequisite_event_ids.length > 0);
    }

    // Date range filters (inclusive)
    if (f.start_date_from) {
      const minDate = new Date(f.start_date_from + 'T00:00:00');
      result = result.filter(ev => {
        const start = this._parseDate(ev.start_datetime);
        return start && start >= minDate;
      });
    }

    if (f.start_date_to) {
      const maxDate = new Date(f.start_date_to + 'T23:59:59.999');
      result = result.filter(ev => {
        const start = this._parseDate(ev.start_datetime);
        return start && start <= maxDate;
      });
    }

    // Day-of-week filter
    if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
      const allowed = f.days_of_week.map(d => (d || '').toLowerCase());
      result = result.filter(ev => {
        const start = this._parseDate(ev.start_datetime);
        const dow = this._getDayOfWeekSlug(start);
        return allowed.includes(dow);
      });
    }

    // Time-of-day filters (start time window in minutes since midnight)
    let minMinutes = null;
    let maxMinutes = null;
    if (f.start_time_from) {
      const [h, m] = f.start_time_from.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        minMinutes = h * 60 + m;
      }
    }
    if (f.start_time_to) {
      const [h2, m2] = f.start_time_to.split(':').map(Number);
      if (!isNaN(h2) && !isNaN(m2)) {
        maxMinutes = h2 * 60 + m2;
      }
    }
    if (minMinutes !== null || maxMinutes !== null) {
      result = result.filter(ev => {
        const start = this._parseDate(ev.start_datetime);
        if (!start) return false;
        const minutes = start.getHours() * 60 + start.getMinutes();
        if (minMinutes !== null && minutes < minMinutes) return false;
        if (maxMinutes !== null && minutes > maxMinutes) return false;
        return true;
      });
    }

    // Sorting
    const sortKey = sort_by || 'start_datetime_asc';
    result.sort((a, b) => {
      const da = this._parseDate(a.start_datetime);
      const db = this._parseDate(b.start_datetime);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (sortKey === 'start_datetime_desc') {
        return tb - ta;
      }
      // default asc
      return ta - tb;
    });

    return result;
  }

  _generateICalFromEvent(event) {
    if (!event) {
      return { filename: 'makerspace-event.ics', mime_type: 'text/calendar', content: '' };
    }

    const uid = 'makerspace-' + event.id + '@university-library-makerspace';
    const now = new Date();
    const dtstamp = this._formatDateToICS(now);
    const dtstart = this._formatDateToICS(this._parseDate(event.start_datetime));
    const dtend = this._formatDateToICS(this._parseDate(event.end_datetime));

    const summary = this._escapeICalText(event.title || 'Makerspace Event');
    const description = this._escapeICalText(event.short_description || event.description || '');
    const location = this._escapeICalText(event.location_name || '');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//University Library Makerspace//EN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + dtstamp,
      'DTSTART:' + dtstart,
      'DTEND:' + dtend,
      'SUMMARY:' + summary,
      'DESCRIPTION:' + description,
      'LOCATION:' + location,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const content = lines.join('\r\n') + '\r\n';
    const filename = 'makerspace-event-' + event.id + '.ics';
    return {
      filename,
      mime_type: 'text/calendar',
      content
    };
  }

  _formatDateToICS(date) {
    if (!date) return '';
    const pad = n => String(n).padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const mm = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    return '' + y + m + d + 'T' + hh + mm + ss + 'Z';
  }

  _escapeICalText(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  // ---------------------- Interfaces ----------------------

  // 1) getHomeHighlights
  getHomeHighlights(maxFeaturedEvents = 5, maxFeaturedWorkshops = 5) {
    const events = this._getFromStorage('events', []);
    const now = new Date();

    const upcoming = events.filter(ev => {
      const start = this._parseDate(ev.start_datetime);
      return start && start >= now;
    });

    // Featured events: is_featured flag
    const featured_events_raw = upcoming
      .filter(ev => ev.is_featured)
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime).getTime();
        const db = this._parseDate(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, maxFeaturedEvents);

    const featured_events = featured_events_raw.map(ev => ({
      event: ev,
      display: {
        category_label: this._getCategoryLabel(ev.category),
        date_display: this._formatDate(this._parseDate(ev.start_datetime)),
        time_range_display: this._formatTimeRange(this._parseDate(ev.start_datetime), this._parseDate(ev.end_datetime)),
        cost_display: this._getCostDisplay(ev),
        is_full: this._isFull(ev)
      }
    }));

    // Featured workshops: upcoming workshops (by category)
    const workshopCategories = new Set(['workshop']);
    const featured_workshops_raw = upcoming
      .filter(ev => workshopCategories.has(ev.category))
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime).getTime();
        const db = this._parseDate(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, maxFeaturedWorkshops);

    const featured_workshops = featured_workshops_raw.map(ev => ({
      event: ev,
      display: {
        level_label: this._getLevelLabel(ev.level),
        date_display: this._formatDate(this._parseDate(ev.start_datetime)),
        time_range_display: this._formatTimeRange(this._parseDate(ev.start_datetime), this._parseDate(ev.end_datetime)),
        cost_display: this._getCostDisplay(ev),
        is_full: this._isFull(ev)
      }
    }));

    return { featured_events, featured_workshops };
  }

  // 2) getEventFilterOptions
  getEventFilterOptions() {
    const categories = [
      { value: 'workshop', label: 'Workshops' },
      { value: 'open_lab', label: 'Open Lab' },
      { value: 'equipment_training', label: 'Equipment Training' },
      { value: '3d_printing', label: '3D Printing' },
      { value: 'laser_cutting', label: 'Laser Cutting' },
      { value: 'laser_cutter_safety_orientation', label: 'Laser Cutter Safety Orientation' },
      { value: 'crafting', label: 'Crafting' },
      { value: 'skill_building', label: 'Skill-Building' }
    ];

    const cost_types = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const audiences = [
      { value: 'families_kids', label: 'Families / Kids' },
      { value: 'students', label: 'Students' },
      { value: 'faculty_staff', label: 'Faculty & Staff' },
      { value: 'general_public', label: 'General Public' }
    ];

    const formats = [
      { value: 'in_person', label: 'In Person' },
      { value: 'virtual', label: 'Virtual' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const days_of_week = [
      { value: 'sunday', label: 'Sunday' },
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' }
    ];

    const time_of_day_ranges = [
      { value: 'morning', label: 'Morning (8:00–12:00)', start_time: '08:00', end_time: '12:00' },
      { value: 'afternoon', label: 'Afternoon (12:00–17:00)', start_time: '12:00', end_time: '17:00' },
      { value: 'evening', label: 'Evening (17:00–21:00)', start_time: '17:00', end_time: '21:00' }
    ];

    const sort_options = [
      { value: 'start_datetime_asc', label: 'Start Date & Time (Earliest First)' },
      { value: 'start_datetime_desc', label: 'Start Date & Time (Latest First)' }
    ];

    return { categories, cost_types, levels, audiences, formats, days_of_week, time_of_day_ranges, sort_options };
  }

  // 3) getEvents
  getEvents(view_mode = 'list', query = '', filters = {}, sort_by = 'start_datetime_asc', page = 1, page_size = 20) {
    const events = this._getFromStorage('events', []);

    const filtered = this._applyEventFiltersAndSorting(events, query, filters, sort_by);

    const total_events = filtered.length;
    const size = page_size > 0 ? page_size : 20;
    const total_pages = Math.max(1, Math.ceil(total_events / size));
    const currentPage = Math.min(Math.max(parseInt(page, 10) || 1, 1), total_pages);
    const startIdx = (currentPage - 1) * size;
    const endIdx = startIdx + size;

    const pageEvents = filtered.slice(startIdx, endIdx).map(ev => ({
      event: ev,
      display: this._buildEventDisplay(ev)
    }));

    return {
      events: pageEvents,
      page: currentPage,
      page_size: size,
      total_pages,
      total_events
    };
  }

  // 4) getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { event: null, display: null };
    }

    // Instrumentation for task completion tracking (task_6: print flow return to detail)
    try {
      const flowRaw = localStorage.getItem('task6_printFlow');
      if (flowRaw) {
        const existingFlow = JSON.parse(flowRaw);
        if (
          existingFlow &&
          existingFlow.event_id === eventId &&
          existingFlow.print_opened_at &&
          !existingFlow.returned_to_detail_at
        ) {
          localStorage.setItem(
            'task6_printFlow',
            JSON.stringify({
              event_id: existingFlow.event_id,
              print_opened_at: existingFlow.print_opened_at,
              returned_to_detail_at: new Date().toISOString()
            })
          );
        }
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting functionality
    }

    const displayBase = this._buildEventDisplay(event);

    let registration_cta_label = '';
    if (event.is_registration_required) {
      const isFull = this._isFull(event);
      if (isFull) {
        registration_cta_label = event.is_waitlist_enabled ? 'Join Waitlist' : 'Registration Closed';
      } else {
        registration_cta_label = 'Register';
      }
    } else if (event.allows_group_reservations) {
      registration_cta_label = 'Reserve Group Spot';
    } else {
      registration_cta_label = 'Add to My Schedule';
    }

    const display = Object.assign({}, displayBase, {
      registration_cta_label
    });

    return { event, display };
  }

  // 5) getPrintFriendlyEventDetails
  getPrintFriendlyEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        print_layout: {
          title_line: '',
          subtitle_line: '',
          datetime_block: '',
          location_block: '',
          cost_block: '',
          description_html: '',
          footer_note: ''
        }
      };
    }

    const start = this._parseDate(event.start_datetime);
    const end = this._parseDate(event.end_datetime);

    const title_line = event.title || '';
    const subtitle_line = event.subtitle || '';
    const datetime_block = this._formatDate(start) + (start && end ? ', ' + this._formatTimeRange(start, end) : '');

    let location_block = '';
    if (event.location_name) {
      location_block = event.location_name;
    }
    if (event.location_details) {
      location_block = location_block ? location_block + ' – ' + event.location_details : event.location_details;
    }

    const cost_block = this._getCostDisplay(event);

    const description_html = event.description || event.short_description || '';

    const footer_note = 'Generated from the University Library Makerspace Event Calendar.';

    // Instrumentation for task completion tracking (task_6: print flow start)
    try {
      localStorage.setItem(
        'task6_printFlow',
        JSON.stringify({
          event_id: eventId,
          print_opened_at: new Date().toISOString(),
          returned_to_detail_at: null
        })
      );
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting functionality
    }

    return {
      event,
      print_layout: {
        title_line,
        subtitle_line,
        datetime_block,
        location_block,
        cost_block,
        description_html,
        footer_note
      }
    };
  }

  // 6) getEventPrerequisites
  getEventPrerequisites(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event || !Array.isArray(event.prerequisite_event_ids) || !event.prerequisite_event_ids.length) {
      return { prerequisite_events: [] };
    }

    const prereqEvents = event.prerequisite_event_ids
      .map(id => events.find(e => e.id === id))
      .filter(Boolean)
      .map(ev => ({
        event: ev,
        display: {
          date_display: this._formatDate(this._parseDate(ev.start_datetime)),
          time_range_display: this._formatTimeRange(this._parseDate(ev.start_datetime), this._parseDate(ev.end_datetime)),
          day_of_week: this._getDayOfWeekSlug(this._parseDate(ev.start_datetime)),
          seats_available_label: this._getSeatsAvailableLabel(ev)
        }
      }));

    return { prerequisite_events: prereqEvents };
  }

  // 7) getEventICalContent
  getEventICalContent(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    const icalContent = this._generateICalFromEvent(event);

    // Instrumentation for task completion tracking (task_8: iCal download)
    try {
      if (event) {
        localStorage.setItem('task8_icalDownloadEventId', eventId);
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting functionality
    }

    return icalContent;
  }

  // 8) submitEventRegistration
  submitEventRegistration(eventId, registrant_name, student_id = null, attendee_count = 1, comments = null) {
    let events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return {
        success: false,
        registration: null,
        message: 'Event not found.',
        updated_event: null
      };
    }

    const event = events[eventIndex];

    if (!event.is_registration_required) {
      return {
        success: false,
        registration: null,
        message: 'This event does not require registration.',
        updated_event: {
          event,
          display: {
            seats_available_label: this._getSeatsAvailableLabel(event),
            is_full: this._isFull(event)
          }
        }
      };
    }

    const capCheck = this._validateEventRegistrationCapacity(event, attendee_count || 1);
    if (!capCheck.ok) {
      return {
        success: false,
        registration: null,
        message: capCheck.error || 'Unable to register for this event.',
        updated_event: {
          event,
          display: {
            seats_available_label: this._getSeatsAvailableLabel(event),
            is_full: this._isFull(event)
          }
        }
      };
    }

    const updatedEvent = capCheck.event;
    events[eventIndex] = updatedEvent;
    this._saveToStorage('events', events);

    const nowIso = new Date().toISOString();
    const registration = {
      id: this._generateId('reg'),
      event_id: eventId,
      registrant_name,
      student_id: student_id || null,
      attendee_count: attendee_count || 1,
      comments: comments || null,
      created_at: nowIso
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const updated_event = {
      event: updatedEvent,
      display: {
        seats_available_label: this._getSeatsAvailableLabel(updatedEvent),
        is_full: this._isFull(updatedEvent)
      }
    };

    return {
      success: true,
      registration,
      message: 'Registration submitted successfully.',
      updated_event
    };
  }

  // 9) joinEventWaitlist
  joinEventWaitlist(eventId, name, student_id = null, phone = null) {
    const events = this._getFromStorage('events', []);
    const waitlist = this._getFromStorage('waitlist_entries', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, waitlist_entry: null, message: 'Event not found.' };
    }

    if (!event.is_waitlist_enabled) {
      return { success: false, waitlist_entry: null, message: 'Waitlist is not enabled for this event.' };
    }

    const nowIso = new Date().toISOString();
    const waitlist_entry = {
      id: this._generateId('wait'),
      event_id: eventId,
      name,
      student_id: student_id || null,
      phone: phone || null,
      status: 'active',
      created_at: nowIso
    };

    waitlist.push(waitlist_entry);
    this._saveToStorage('waitlist_entries', waitlist);

    return { success: true, waitlist_entry, message: 'You have been added to the waitlist.' };
  }

  // 10) submitGroupReservation
  submitGroupReservation(eventId, group_name, attendee_count, contact_name, contact_phone, notes = null) {
    let events = this._getFromStorage('events', []);
    const group_reservations = this._getFromStorage('group_reservations', []);

    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return {
        success: false,
        group_reservation: null,
        message: 'Event not found.',
        updated_event: null
      };
    }

    const event = events[eventIndex];

    if (!event.allows_group_reservations) {
      return {
        success: false,
        group_reservation: null,
        message: 'This event does not accept group reservations.',
        updated_event: {
          event,
          display: {
            seats_available_label: this._getSeatsAvailableLabel(event),
            is_full: this._isFull(event)
          }
        }
      };
    }

    const capCheck = this._validateEventRegistrationCapacity(event, attendee_count || 1);
    if (!capCheck.ok) {
      return {
        success: false,
        group_reservation: null,
        message: capCheck.error || 'Unable to submit group reservation.',
        updated_event: {
          event,
          display: {
            seats_available_label: this._getSeatsAvailableLabel(event),
            is_full: this._isFull(event)
          }
        }
      };
    }

    const updatedEvent = capCheck.event;
    events[eventIndex] = updatedEvent;
    this._saveToStorage('events', events);

    const nowIso = new Date().toISOString();
    const group_reservation = {
      id: this._generateId('grp'),
      event_id: eventId,
      group_name,
      attendee_count: attendee_count || 1,
      contact_name,
      contact_phone,
      notes: notes || null,
      created_at: nowIso
    };

    group_reservations.push(group_reservation);
    this._saveToStorage('group_reservations', group_reservations);

    const updated_event = {
      event: updatedEvent,
      display: {
        seats_available_label: this._getSeatsAvailableLabel(updatedEvent),
        is_full: this._isFull(updatedEvent)
      }
    };

    return {
      success: true,
      group_reservation,
      message: 'Group reservation submitted successfully.',
      updated_event
    };
  }

  // 11) addEventToMySchedule
  addEventToMySchedule(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, schedule_item: null, message: 'Event not found.' };
    }

    let schedule_items = this._getFromStorage('my_schedule_items', []);
    const existing = schedule_items.find(item => item.event_id === eventId);
    if (existing) {
      return { success: true, schedule_item: existing, message: 'Event is already in My Schedule.' };
    }

    const schedule_item = {
      id: this._generateId('sched'),
      event_id: eventId,
      added_at: new Date().toISOString()
    };

    schedule_items.push(schedule_item);
    this._saveToStorage('my_schedule_items', schedule_items);

    return { success: true, schedule_item, message: 'Event added to My Schedule.' };
  }

  // 12) removeEventFromMySchedule
  removeEventFromMySchedule(scheduleItemId) {
    let schedule_items = this._getFromStorage('my_schedule_items', []);
    const idx = schedule_items.findIndex(item => item.id === scheduleItemId);
    if (idx === -1) {
      return { success: false, message: 'Schedule item not found.' };
    }
    schedule_items.splice(idx, 1);
    this._saveToStorage('my_schedule_items', schedule_items);
    return { success: true, message: 'Event removed from My Schedule.' };
  }

  // 13) getMySchedule (resolve foreign key event_id -> event)
  getMySchedule() {
    const schedule_items = this._getFromStorage('my_schedule_items', []);
    const events = this._getFromStorage('events', []);

    const items = schedule_items.map(item => {
      const ev = events.find(e => e.id === item.event_id) || null;
      const start = ev ? this._parseDate(ev.start_datetime) : null;
      const end = ev ? this._parseDate(ev.end_datetime) : null;
      const display = ev
        ? {
            date_display: this._formatDate(start),
            time_range_display: this._formatTimeRange(start, end),
            category_label: this._getCategoryLabel(ev.category),
            level_label: this._getLevelLabel(ev.level)
          }
        : {
            date_display: '',
            time_range_display: '',
            category_label: '',
            level_label: ''
          };
      return {
        schedule_item: item,
        event: ev,
        display
      };
    });

    return { schedule_items: items };
  }

  // 14) addEventToWatchlist
  addEventToWatchlist(eventId, note = null) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, watchlist_item: null, message: 'Event not found.' };
    }

    let watchlist_items = this._getFromStorage('watchlist_items', []);
    const existing = watchlist_items.find(item => item.event_id === eventId);
    if (existing) {
      return { success: true, watchlist_item: existing, message: 'Event is already in your watchlist.' };
    }

    const watchlist_item = {
      id: this._generateId('wl'),
      event_id: eventId,
      added_at: new Date().toISOString(),
      note: note || null
    };

    watchlist_items.push(watchlist_item);
    this._saveToStorage('watchlist_items', watchlist_items);

    return { success: true, watchlist_item, message: 'Event added to your watchlist.' };
  }

  // 15) removeEventFromWatchlist
  removeEventFromWatchlist(watchlistItemId) {
    let watchlist_items = this._getFromStorage('watchlist_items', []);
    const idx = watchlist_items.findIndex(item => item.id === watchlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Watchlist item not found.' };
    }
    watchlist_items.splice(idx, 1);
    this._saveToStorage('watchlist_items', watchlist_items);
    return { success: true, message: 'Event removed from your watchlist.' };
  }

  // 16) getWatchlist (resolve foreign key event_id -> event)
  getWatchlist() {
    const watchlist_items = this._getFromStorage('watchlist_items', []);
    const events = this._getFromStorage('events', []);

    const items = watchlist_items.map(item => {
      const ev = events.find(e => e.id === item.event_id) || null;
      const start = ev ? this._parseDate(ev.start_datetime) : null;
      const end = ev ? this._parseDate(ev.end_datetime) : null;
      const display = ev
        ? {
            date_display: this._formatDate(start),
            time_range_display: this._formatTimeRange(start, end),
            category_label: this._getCategoryLabel(ev.category),
            level_label: this._getLevelLabel(ev.level)
          }
        : {
            date_display: '',
            time_range_display: '',
            category_label: '',
            level_label: ''
          };
      return {
        watchlist_item: item,
        event: ev,
        display
      };
    });

    return { watchlist_items: items };
  }

  // 17) getMyEventsOverview
  getMyEventsOverview() {
    const schedule_items = this._getFromStorage('my_schedule_items', []);
    const watchlist_items = this._getFromStorage('watchlist_items', []);
    return {
      scheduled_count: schedule_items.length,
      watchlist_count: watchlist_items.length
    };
  }

  // 18) getPageContent
  getPageContent(page_slug) {
    const pages = this._getFromStorage('pages', []);
    const page = pages.find(p => p.page_slug === page_slug || p.slug === page_slug) || null;
    if (!page) {
      return {
        title: '',
        last_updated: null,
        sections: []
      };
    }
    return {
      title: page.title || '',
      last_updated: page.last_updated || null,
      sections: Array.isArray(page.sections) ? page.sections : []
    };
  }

  // 19) getContactAndHours
  getContactAndHours() {
    const data = this._getFromStorage('contact_and_hours', null);
    if (!data) {
      return {
        location_name: '',
        location_address: '',
        phone: '',
        email: '',
        hours: [],
        directions_html: ''
      };
    }
    return {
      location_name: data.location_name || '',
      location_address: data.location_address || '',
      phone: data.phone || '',
      email: data.email || '',
      hours: Array.isArray(data.hours) ? data.hours : [],
      directions_html: data.directions_html || ''
    };
  }

  // 20) submitContactForm
  submitContactForm(name, email, topic = null, message = '') {
    if (!name || !email || !message) {
      return { success: false, message: 'Name, email, and message are required.' };
    }
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || null,
      message,
      created_at: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);
    return { success: true, message: 'Your message has been sent.' };
  }

  // 21) getFAQEntries
  getFAQEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return { faqs };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}